import "server-only";
import { prisma } from "@/lib/db";
import { CATEGORY, isHeadcountCategory, zoneOf } from "@/lib/constants";

/**
 * Rules-based matching between contractors and requirements.
 *
 * The weightings come straight from how the client described the buying
 * decision. Regional presence dominates, and *demonstrated* presence — a client
 * list entry at a site in that state — counts for more than a contractor simply
 * ticking the state on their profile, because it is corroborated by work they
 * have actually done. Industry experience matters next: a tyre plant wants
 * somebody who has run mould change before, not a general labour supplier.
 */

export type MatchScore = {
  score: number;
  reasons: string[];
};

export type ScorableContractor = {
  state: string;
  city: string;
  presenceStates: string[];
  workerSourceStates: string[];
  categories: string[];
  industries: string[];
  roles: string[];
  willingOutstation: boolean;
  availableNow: number;
  totalWorkforce: number;
  mobilizationDays: number;
  verified: boolean;
  rating: number;
  ratingDeployment: number;
  ratingCompliance: number;
  clients?: { siteState: string; industry: string | null; headcount: number }[];
};

export type ScorableRequirement = {
  category: string;
  industry: string | null;
  state: string;
  city: string;
  urgency: string;
  scopeKey: string | null;
  roles: { role: string; headcount: number }[];
};

const MAX_SCORE = 100;

/**
 * Industries and roles are catalogue codes most of the time, but both sides can
 * type their own ("Rubber Reclaim", "Bandomatic Operator"). Two people typing
 * the same thing rarely agree on capitalisation, so every comparison here is
 * case-insensitive — the codes themselves are lowercase, so nothing else moves.
 */
const norm = (value: string) => value.trim().toLowerCase();

export function scoreContractorForRequirement(
  contractor: ScorableContractor,
  requirement: ScorableRequirement,
): MatchScore {
  const reasons: string[] = [];
  let score = 0;

  // --- Contract category (0–20) --------------------------------------------
  // A firm that doesn't take on this kind of contract is not a match at all,
  // whatever else lines up.
  if (!contractor.categories.includes(requirement.category)) {
    return { score: 0, reasons: [] };
  }
  score += 20;

  // --- Regional presence (0–30) --------------------------------------------
  const reqState = requirement.state;
  const clientsInState = (contractor.clients ?? []).filter(
    (c) => c.siteState === reqState,
  );
  const deployedInState = clientsInState.reduce((sum, c) => sum + c.headcount, 0);

  if (clientsInState.length > 0) {
    // Demonstrated presence: they are already running sites in this state.
    score += 30;
    reasons.push(
      deployedInState > 0
        ? `Already running ${deployedInState} manpower across ${clientsInState.length} site(s) in ${reqState}`
        : `Has existing clients in ${reqState}`,
    );
  } else if (contractor.state === reqState) {
    score += 22;
    reasons.push(`Head office in ${reqState}`);
  } else if (contractor.presenceStates.includes(reqState)) {
    score += 20;
    reasons.push(`Operates in ${reqState}`);
  } else {
    const reqZone = zoneOf(reqState);
    const sharesZone =
      reqZone !== null &&
      contractor.presenceStates.some((s) => zoneOf(s) === reqZone);
    if (sharesZone) {
      score += 10;
      reasons.push(`Present elsewhere in ${reqZone} India`);
    } else if (contractor.willingOutstation) {
      score += 4;
      reasons.push("Willing to mobilise outstation");
    }
  }

  if (contractor.city.toLowerCase() === requirement.city.toLowerCase()) {
    score += 4;
    reasons.push(`Based in ${requirement.city}`);
  }

  // --- Industry experience (0–15) ------------------------------------------
  if (requirement.industry) {
    const wantedIndustry = norm(requirement.industry);
    if (contractor.industries.some((i) => norm(i) === wantedIndustry)) {
      score += 12;
      reasons.push("Has worked in this industry");
      const sameIndustryClients = (contractor.clients ?? []).filter(
        (c) => c.industry && norm(c.industry) === wantedIndustry,
      ).length;
      if (sameIndustryClients > 0) {
        score += 3;
        reasons.push(`${sameIndustryClients} client(s) in this sector`);
      }
    }
  } else if (contractor.industries.length > 0) {
    score += 3;
  }

  // --- Role / scope coverage (0–15) ----------------------------------------
  const supplied = new Set(contractor.roles.map(norm));
  if (requirement.category === CATEGORY.JOB_CONTRACT) {
    if (requirement.scopeKey && supplied.has(norm(requirement.scopeKey))) {
      score += 15;
      reasons.push("Lists this scope of work");
    }
  } else if (requirement.roles.length > 0) {
    const wanted = requirement.roles.map((r) => r.role);
    const covered = wanted.filter((r) => supplied.has(norm(r)));
    if (covered.length > 0) {
      score += Math.round((covered.length / wanted.length) * 15);
      reasons.push(`Supplies ${covered.length} of ${wanted.length} required role(s)`);
    }
  }

  // --- Capacity (0–10) ------------------------------------------------------
  if (isHeadcountCategory(requirement.category)) {
    const needed = requirement.roles.reduce((sum, r) => sum + r.headcount, 0);
    if (needed > 0) {
      if (contractor.availableNow >= needed) {
        score += 10;
        reasons.push(`${contractor.availableNow} manpower available now`);
      } else if (contractor.availableNow > 0) {
        score += Math.round((contractor.availableNow / needed) * 8);
        reasons.push(`${contractor.availableNow} of ${needed} available immediately`);
      }
    }
  } else if (contractor.totalWorkforce > 0) {
    // A job contract is judged on overall strength, not a bench count, since
    // the contractor decides deployment.
    score += contractor.totalWorkforce >= 100 ? 10 : 6;
    reasons.push(`Workforce strength ${contractor.totalWorkforce}`);
  }

  // --- Mobilisation speed vs urgency (0–5) ---------------------------------
  if (requirement.urgency === "URGENT") {
    if (contractor.mobilizationDays <= 7) {
      score += 5;
      reasons.push(`Can mobilise in ${contractor.mobilizationDays} days`);
    }
  } else if (contractor.mobilizationDays <= 15) {
    score += 2;
  }

  // --- Track record (0–5) ---------------------------------------------------
  if (contractor.verified) {
    score += 2;
    reasons.push("Documents verified");
  }
  return { score: Math.min(score, MAX_SCORE), reasons };
}

/**
 * Adds the reputation component to a base score.
 *
 * Kept separate from the scoring function so that ranking a contractor who has
 * never been rated doesn't have to pretend to a rating of zero — an unrated
 * firm should sit level with the pack, not below it.
 */
export function withReputation(
  base: MatchScore,
  contractor: { rating: number; ratingCount: number; ratingDeployment: number },
): MatchScore {
  if (base.score === 0) return base;
  if (contractor.ratingCount === 0) return base;

  const reasons = [...base.reasons];
  // Up to 5 points, weighted towards timely deployment — the parameter the
  // client named first when describing how companies judge a contractor.
  const blended = contractor.rating * 0.6 + contractor.ratingDeployment * 0.4;
  const bonus = Math.round((blended / 5) * 5);
  reasons.push(`Rated ${contractor.rating.toFixed(1)}/5 by ${contractor.ratingCount} client(s)`);
  return { score: Math.min(base.score + bonus, MAX_SCORE), reasons };
}

// ---------------------------------------------------------------------------
// Feed queries
// ---------------------------------------------------------------------------

/** How many candidate rows to score in memory before ranking. */
const CANDIDATE_LIMIT = 300;

/**
 * Open requirements relevant to a contractor, ranked.
 *
 * The category filter runs in SQL because it eliminates most rows; the finer
 * scoring happens in memory over a bounded candidate set.
 */
export async function requirementsForContractor(contractorId: string, take = 50) {
  const contractor = await prisma.contractorProfile.findUnique({
    where: { id: contractorId },
    include: {
      clients: { select: { siteState: true, industry: true, headcount: true } },
    },
  });
  if (!contractor) return [];

  const requirements = await prisma.requirement.findMany({
    where: {
      status: "OPEN",
      // Expired postings stay in the database for the company's records but
      // must not appear in a contractor's feed.
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      category: contractor.categories.length > 0 ? { in: contractor.categories } : undefined,
    },
    include: {
      roles: true,
      company: {
        select: { id: true, companyName: true, city: true, state: true, verified: true, industries: true },
      },
      proposals: {
        where: { contractorId },
        select: { id: true, status: true },
      },
      _count: { select: { proposals: true } },
    },
    orderBy: { createdAt: "desc" },
    take: CANDIDATE_LIMIT,
  });

  return requirements
    .map((requirement) => {
      const match = withReputation(
        scoreContractorForRequirement(contractor, requirement),
        contractor,
      );
      return {
        requirement,
        match,
        alreadyProposed: requirement.proposals[0] ?? null,
      };
    })
    .filter((x) => x.match.score > 0)
    .sort((a, b) => b.match.score - a.match.score || +b.requirement.createdAt - +a.requirement.createdAt)
    .slice(0, take);
}

/** Contractors ranked against a specific requirement, for the company view. */
export async function contractorsForRequirement(requirementId: string, take = 25) {
  const requirement = await prisma.requirement.findUnique({
    where: { id: requirementId },
    include: { roles: true },
  });
  if (!requirement) return [];

  const contractors = await prisma.contractorProfile.findMany({
    where: {
      status: "APPROVED",
      categories: { has: requirement.category },
    },
    include: {
      // Full rows rather than the three scoring fields: the same objects feed
      // the contractor card, which shows the client list.
      clients: { orderBy: [{ ongoing: "desc" }, { headcount: "desc" }] },
      _count: { select: { clients: true, engagements: true } },
    },
    orderBy: { rating: "desc" },
    take: CANDIDATE_LIMIT,
  });

  return contractors
    .map((contractor) => ({
      contractor,
      match: withReputation(
        scoreContractorForRequirement(contractor, requirement),
        contractor,
      ),
    }))
    .filter((x) => x.match.score > 0)
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, take);
}
