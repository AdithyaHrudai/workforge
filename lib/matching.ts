import { prisma } from "@/lib/db";
import { parseTrades } from "@/lib/utils";

export type MatchScore = {
  score: number;
  reasons: string[];
};

/**
 * Rules-based match score between a contractor and a job.
 * Considers trade overlap, location, willingness to travel, and capacity.
 */
export function scoreContractorForJob(
  contractor: {
    trades: string;
    state: string;
    city: string;
    serviceAreas: string | null;
    willingOutstation: boolean;
    available: number;
    verified: boolean;
    rating: number;
  },
  job: {
    state: string;
    city: string;
    lines: { trade: string; headcount: number }[];
  },
): MatchScore {
  const reasons: string[] = [];
  let score = 0;

  const contractorTrades = new Set(parseTrades(contractor.trades));
  const jobTrades = job.lines.map((l) => l.trade);
  const matchedTrades = jobTrades.filter((t) => contractorTrades.has(t));
  if (matchedTrades.length > 0) {
    const ratio = matchedTrades.length / jobTrades.length;
    score += Math.round(ratio * 50);
    reasons.push(
      `Supplies ${matchedTrades.length}/${jobTrades.length} required trade(s)`,
    );
  }

  // Location
  const sameState = contractor.state.toLowerCase() === job.state.toLowerCase();
  const sameCity = contractor.city.toLowerCase() === job.city.toLowerCase();
  const serviceAreas = (contractor.serviceAreas ?? "").toLowerCase();
  const servesCity =
    serviceAreas.includes(job.city.toLowerCase()) ||
    serviceAreas.includes(job.state.toLowerCase());

  if (sameCity) {
    score += 25;
    reasons.push("Based in the same city");
  } else if (sameState || servesCity) {
    score += 18;
    reasons.push(sameState ? "Operates in the same state" : "Lists this area as serviced");
  } else if (contractor.willingOutstation) {
    score += 8;
    reasons.push("Willing to mobilise outstation");
  }

  // Capacity
  const totalNeeded = job.lines.reduce((s, l) => s + l.headcount, 0);
  if (contractor.available >= totalNeeded && totalNeeded > 0) {
    score += 12;
    reasons.push("Has enough workers available");
  } else if (contractor.available > 0) {
    score += 6;
    reasons.push(`${contractor.available} workers available`);
  }

  if (contractor.verified) {
    score += 8;
    reasons.push("Verified contractor");
  }
  if (contractor.rating > 0) {
    score += Math.min(Math.round(contractor.rating), 5);
  }

  return { score, reasons };
}

/** Open jobs that match a contractor's trades & region, ranked by score. */
export async function jobsForContractor(contractorId: string) {
  const contractor = await prisma.contractorProfile.findUnique({
    where: { id: contractorId },
  });
  if (!contractor) return [];

  const trades = parseTrades(contractor.trades);
  const jobs = await prisma.job.findMany({
    where: { status: "OPEN" },
    include: {
      lines: true,
      company: { select: { companyName: true, city: true, state: true, verified: true } },
      bids: { where: { contractorId }, select: { id: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return jobs
    .map((job) => {
      const match = scoreContractorForJob(contractor, job);
      const tradeHit = job.lines.some((l) => trades.includes(l.trade));
      return { job, match, tradeHit, alreadyBid: job.bids[0] ?? null };
    })
    .filter((x) => x.tradeHit) // only surface jobs in the contractor's trades
    .sort((a, b) => b.match.score - a.match.score);
}

/** Contractors ranked for a given job (used in company view & matching). */
export async function contractorsForJob(jobId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { lines: true },
  });
  if (!job) return [];

  const contractors = await prisma.contractorProfile.findMany({
    where: { status: "APPROVED" },
  });

  return contractors
    .map((contractor) => ({
      contractor,
      match: scoreContractorForJob(contractor, job),
    }))
    .filter((x) => x.match.score > 0)
    .sort((a, b) => b.match.score - a.match.score);
}
