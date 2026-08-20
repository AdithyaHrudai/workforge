import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ZONES } from "@/lib/constants";
import type { ContractorSearchInput } from "@/lib/validation";

/**
 * The company-side contractor search — the equivalent of a resume database,
 * but for firms rather than individuals.
 *
 * Every filter here answers a question the client actually posed on the call:
 * how many people can they field, where are they already present, which
 * industries have they worked in, and where do their workers come from.
 */

export const PAGE_SIZE = 12;

export type ContractorSearchResult = Awaited<ReturnType<typeof searchContractors>>;

export type ContractorCard = Prisma.ContractorProfileGetPayload<{
  include: {
    clients: true;
    capacities: true;
    user: { select: { name: true; email: true; mobile: true } };
    _count: { select: { clients: true; engagements: true; reviews: true } };
  };
}>;

function buildWhere(input: ContractorSearchInput): Prisma.ContractorProfileWhereInput {
  const and: Prisma.ContractorProfileWhereInput[] = [
    // Only vetted firms are discoverable. An unapproved firm appearing in
    // search would undercut the entire verification promise.
    { status: "APPROVED" },
    { user: { status: "ACTIVE" } },
  ];

  if (input.q) {
    const q = input.q;
    and.push({
      OR: [
        { firmName: { contains: q, mode: "insensitive" } },
        { ownerName: { contains: q, mode: "insensitive" } },
        { about: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
        // Searching a client's name is a real workflow: "who supplies Yokohama?"
        { clients: { some: { clientName: { contains: q, mode: "insensitive" } } } },
      ],
    });
  }

  if (input.categories.length > 0) {
    and.push({ categories: { hasSome: input.categories } });
  }
  if (input.industries.length > 0) {
    and.push({ industries: { hasSome: input.industries } });
  }
  if (input.roles.length > 0) {
    and.push({ roles: { hasSome: input.roles } });
  }
  if (input.workerSourceStates.length > 0) {
    and.push({ workerSourceStates: { hasSome: input.workerSourceStates } });
  }

  // A zone widens the state filter rather than replacing it, so "South India"
  // and "plus Odisha" compose the way a user expects.
  const states = [...input.states];
  if (input.zone && ZONES[input.zone]) {
    states.push(...ZONES[input.zone]);
  }
  if (states.length > 0) {
    const unique = Array.from(new Set(states));
    and.push({
      OR: [
        { presenceStates: { hasSome: unique } },
        { state: { in: unique } },
        { clients: { some: { siteState: { in: unique } } } },
      ],
    });
  }

  // Demonstrated presence, as opposed to a self-declared service area: only
  // firms with an actual client site in that state.
  if (input.hasClientsInState) {
    and.push({ clients: { some: { siteState: input.hasClientsInState } } });
  }

  if (input.minWorkforce != null && input.minWorkforce > 0) {
    and.push({ totalWorkforce: { gte: input.minWorkforce } });
  }
  if (input.minRating != null && input.minRating > 0) {
    and.push({ rating: { gte: input.minRating } });
  }
  if (input.verifiedOnly) {
    and.push({ verified: true });
  }

  return { AND: and };
}

function buildOrderBy(
  sort: ContractorSearchInput["sort"],
): Prisma.ContractorProfileOrderByWithRelationInput[] {
  switch (sort) {
    case "rating":
      return [{ rating: "desc" }, { ratingCount: "desc" }, { totalWorkforce: "desc" }];
    case "workforce":
      return [{ totalWorkforce: "desc" }, { rating: "desc" }];
    case "recent":
      return [{ createdAt: "desc" }];
    case "relevance":
    default:
      // No free-text ranking to lean on, so "relevance" means the firms a buyer
      // would want to see first: verified, well-rated, with real capacity.
      return [
        { verified: "desc" },
        { rating: "desc" },
        { ratingCount: "desc" },
        { totalWorkforce: "desc" },
      ];
  }
}

export async function searchContractors(input: ContractorSearchInput) {
  const where = buildWhere(input);
  const skip = (input.page - 1) * PAGE_SIZE;

  const [total, contractors] = await Promise.all([
    prisma.contractorProfile.count({ where }),
    prisma.contractorProfile.findMany({
      where,
      include: {
        // Bounded: the card shows the three largest deployments, not the whole
        // client list, so an established firm with 200 clients doesn't drag the
        // whole results page down with it.
        clients: {
          orderBy: [{ ongoing: "desc" }, { headcount: "desc" }],
          take: 3,
        },
        capacities: true,
        user: { select: { name: true, email: true, mobile: true } },
        _count: { select: { clients: true, engagements: true, reviews: true } },
      },
      orderBy: buildOrderBy(input.sort),
      skip,
      take: PAGE_SIZE,
    }),
  ]);

  return {
    contractors,
    total,
    page: input.page,
    pageSize: PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

/** Full public profile of one contractor, as a company sees it. */
export async function getContractorPublicProfile(id: string) {
  return prisma.contractorProfile.findFirst({
    where: { id, status: "APPROVED" },
    include: {
      user: { select: { name: true, email: true, mobile: true } },
      clients: { orderBy: [{ ongoing: "desc" }, { headcount: "desc" }, { startedYear: "desc" }] },
      capacities: true,
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { company: { select: { companyName: true, industries: true } } },
      },
      documents: {
        where: { status: "APPROVED" },
        select: { id: true, type: true, status: true },
      },
      _count: { select: { clients: true, engagements: true, reviews: true } },
    },
  });
}

/**
 * Parses raw search params into the validated shape the search expects.
 * Repeated params (`?industries=tyre&industries=steel`) become arrays.
 */
export function parseSearchParams(
  params: Record<string, string | string[] | undefined>,
): Record<string, unknown> {
  const list = (key: string): string[] => {
    const v = params[key];
    if (v == null) return [];
    return Array.isArray(v) ? v : [v];
  };

  return {
    q: params.q ?? "",
    categories: list("categories"),
    industries: list("industries"),
    states: list("states"),
    zone: params.zone ?? "",
    workerSourceStates: list("workerSourceStates"),
    roles: list("roles"),
    minWorkforce: params.minWorkforce ?? "",
    minRating: params.minRating ?? "",
    verifiedOnly: params.verifiedOnly === "on" ? "on" : "",
    hasClientsInState: params.hasClientsInState ?? "",
    sort: typeof params.sort === "string" ? params.sort : "relevance",
    page: params.page ?? 1,
  };
}
