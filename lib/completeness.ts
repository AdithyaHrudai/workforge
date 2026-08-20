import "server-only";
import { prisma } from "@/lib/db";

/**
 * Contractor profile completeness.
 *
 * The directory is only worth searching if the firms in it have filled in the
 * fields the search actually filters on, so the checklist is weighted by what
 * makes a firm findable rather than by how many boxes exist. Presence states
 * and the client list carry the most weight because they are what a buyer
 * filters and judges on; a website is worth nothing and is not asked for.
 */

export type CompletenessItem = {
  key: string;
  label: string;
  hint: string;
  href: string;
  weight: number;
  done: boolean;
};

export type Completeness = {
  percent: number;
  items: CompletenessItem[];
  /** The highest-weight incomplete items, best first. */
  next: CompletenessItem[];
};

type ProfileInput = {
  categories: string[];
  industries: string[];
  presenceStates: string[];
  workerSourceStates: string[];
  roles: string[];
  totalWorkforce: number;
  about: string | null;
  labourLicenceNo: string | null;
  gstin: string | null;
  clientCount: number;
  approvedDocumentCount: number;
};

export function scoreProfile(p: ProfileInput): Completeness {
  const items: CompletenessItem[] = [
    {
      key: "categories",
      label: "Contract types you take on",
      hint: "Which of the four categories you supply. Without this you match nothing.",
      href: "/contractor/profile",
      weight: 15,
      done: p.categories.length > 0,
    },
    {
      key: "presence",
      label: "States you operate in",
      hint: "The single most-used search filter — buyers look for firms already on the ground.",
      href: "/contractor/profile",
      weight: 15,
      done: p.presenceStates.length > 0,
    },
    {
      key: "clients",
      label: "Publish at least three clients",
      hint: "Your track record is what companies actually compare. Three is the point it starts to persuade.",
      href: "/contractor/clients",
      weight: 20,
      done: p.clientCount >= 3,
    },
    {
      key: "industries",
      label: "Sector experience",
      hint: "Tyre, steel, cement, warehousing — buyers filter hard on sector.",
      href: "/contractor/profile",
      weight: 10,
      done: p.industries.length > 0,
    },
    {
      key: "workforce",
      label: "Workforce strength",
      hint: "Your declared headcount, used by the capacity filter.",
      href: "/contractor/profile",
      weight: 10,
      done: p.totalWorkforce > 0,
    },
    {
      key: "roles",
      label: "Roles and scopes supplied",
      hint: "Fitters, riggers, mould change, shutdown maintenance.",
      href: "/contractor/profile",
      weight: 5,
      done: p.roles.length > 0,
    },
    {
      key: "sources",
      label: "Where your workers come from",
      hint: "Companies routinely ask for manpower sourced from particular states.",
      href: "/contractor/profile",
      weight: 5,
      done: p.workerSourceStates.length > 0,
    },
    {
      key: "about",
      label: "A short description of the firm",
      hint: "Two or three lines on what you do best.",
      href: "/contractor/profile",
      weight: 5,
      done: Boolean(p.about && p.about.trim().length >= 40),
    },
    {
      key: "statutory",
      label: "CLRA licence and GSTIN",
      hint: "Shown as held-on-record. Firms without them are filtered out by most buyers.",
      href: "/contractor/profile",
      weight: 5,
      done: Boolean(p.labourLicenceNo && p.gstin),
    },
    {
      key: "documents",
      label: "Answer the verification questions",
      hint: "GST and PAN, each with its number and certificate. An approved certificate earns the verified badge, which ranks you higher.",
      href: "/contractor/documents",
      weight: 10,
      done: p.approvedDocumentCount > 0,
    },
  ];

  const earned = items.filter((i) => i.done).reduce((sum, i) => sum + i.weight, 0);
  const total = items.reduce((sum, i) => sum + i.weight, 0);

  return {
    percent: Math.round((earned / total) * 100),
    items,
    next: items
      .filter((i) => !i.done)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3),
  };
}

/** Loads the counts `scoreProfile` needs and scores the profile in one call. */
export async function getContractorCompleteness(contractorId: string): Promise<Completeness | null> {
  const profile = await prisma.contractorProfile.findUnique({
    where: { id: contractorId },
    select: {
      categories: true,
      industries: true,
      presenceStates: true,
      workerSourceStates: true,
      roles: true,
      totalWorkforce: true,
      about: true,
      labourLicenceNo: true,
      gstin: true,
      _count: { select: { clients: true } },
      documents: { where: { status: "APPROVED" }, select: { id: true } },
    },
  });
  if (!profile) return null;

  return scoreProfile({
    ...profile,
    clientCount: profile._count.clients,
    approvedDocumentCount: profile.documents.length,
  });
}
