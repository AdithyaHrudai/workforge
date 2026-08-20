import "server-only";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { maskEmail, maskMobile } from "@/lib/utils";

/**
 * Contact visibility.
 *
 * Today the platform is deliberately open: any approved company sees a
 * contractor's phone and email straight away, because the client wants adoption
 * and word-of-mouth growth before monetisation. But every reveal is still
 * recorded in ContactUnlock, so when a paid tier arrives the quota logic below
 * can simply be switched on — there is no schema change and no backfill, and
 * there is already a usage history to price against.
 *
 * The masking decision lives here, on the server, and the masked strings are
 * what get sent to the browser. A gated contact is never serialised into the
 * page and hidden with CSS.
 */

export type ContactView = {
  /** True when the viewer may see the real values. */
  revealed: boolean;
  name: string;
  mobile: string;
  email: string;
  /** Why access was refused, for the upgrade prompt. Null when revealed. */
  reason: "QUOTA_EXHAUSTED" | "NOT_A_COMPANY" | null;
  /** Reveals left this month; null when unlimited. */
  remaining: number | null;
};

type ContactSource = { name: string; mobile: string | null; email: string };

function masked(
  contact: ContactSource,
  reason: ContactView["reason"],
  remaining: number | null,
): ContactView {
  return {
    revealed: false,
    name: contact.name,
    mobile: maskMobile(contact.mobile),
    email: maskEmail(contact.email),
    reason,
    remaining,
  };
}

function revealed(contact: ContactSource, remaining: number | null): ContactView {
  return {
    revealed: true,
    name: contact.name,
    mobile: contact.mobile ?? "—",
    email: contact.email,
    reason: null,
    remaining,
  };
}

/** Reveals used by a company since the start of the current calendar month. */
async function revealsThisMonth(companyId: string): Promise<number> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return prisma.contactUnlock.count({
    where: { companyId, createdAt: { gte: monthStart } },
  });
}

/**
 * Resolves whether `companyId` may see `contractorId`'s contact details, and
 * records the reveal when it may.
 *
 * `alreadyEntitled` short-circuits the quota entirely — once the two sides are
 * in an engagement, or the contractor has proposed on the company's own
 * requirement, contact details are theirs by right and must never be metered.
 */
export async function resolveContractorContact(params: {
  companyId: string | null;
  contractorId: string;
  contact: ContactSource;
  source?: "SEARCH" | "PROPOSAL" | "INVITE";
  alreadyEntitled?: boolean;
  /** Set false on list pages, where recording a reveal per row would be wrong. */
  record?: boolean;
}): Promise<ContactView> {
  const { companyId, contractorId, contact, alreadyEntitled = false } = params;
  const settings = await getSettings();

  if (!companyId) {
    return masked(contact, "NOT_A_COMPANY", null);
  }

  // Entitled parties are never recorded: they aren't discovery-driven reveals,
  // and metering them would burn quota that belongs to other contractors.
  if (alreadyEntitled) {
    return revealed(contact, null);
  }

  // Masking off — the launch posture. The contact is shown, but the reveal is
  // still recorded, so that when a paid tier arrives there is already a usage
  // history to price against and no backfill is needed.
  if (!settings.contactMaskingEnabled) {
    if (params.record !== false) await recordUnlock(companyId, contractorId, params.source);
    return revealed(contact, null);
  }

  const existing = await prisma.contactUnlock.findUnique({
    where: { companyId_contractorId: { companyId, contractorId } },
  });

  const quota = settings.freeContactRevealsPerMonth;
  const used = await revealsThisMonth(companyId);

  // An earlier reveal stays revealed — a company shouldn't pay twice for the
  // same contractor, and re-metering it would make the quota meaningless.
  if (existing) {
    return revealed(contact, Math.max(0, quota - used));
  }

  if (quota > 0 && used >= quota) {
    return masked(contact, "QUOTA_EXHAUSTED", 0);
  }

  if (params.record !== false) {
    await recordUnlock(companyId, contractorId, params.source);
    return revealed(contact, Math.max(0, quota - used - 1));
  }

  return masked(contact, "QUOTA_EXHAUSTED", Math.max(0, quota - used));
}

/**
 * Writes the reveal record. Best-effort: a failure here must never stop a
 * profile page rendering, because the record is billing history rather than an
 * access-control decision.
 *
 * Concurrent views of the same contractor race on the unique constraint, which
 * makes the loser a no-op rather than a double charge.
 */
async function recordUnlock(
  companyId: string,
  contractorId: string,
  source: "SEARCH" | "PROPOSAL" | "INVITE" = "SEARCH",
): Promise<void> {
  try {
    await prisma.contactUnlock.upsert({
      where: { companyId_contractorId: { companyId, contractorId } },
      update: {},
      create: { companyId, contractorId, source },
    });
  } catch (err) {
    console.error("[contacts] failed to record unlock:", err);
  }
}

/**
 * Cheap check for list pages: are contacts open at all right now? Lets a search
 * results page mask every row without running quota logic per result.
 */
export async function contactMaskingActive(): Promise<boolean> {
  const settings = await getSettings();
  return settings.contactMaskingEnabled;
}

/**
 * True when the company already has a relationship with the contractor that
 * entitles it to contact details regardless of quota.
 */
export async function hasContactEntitlement(
  companyId: string,
  contractorId: string,
): Promise<boolean> {
  const [engagement, proposal] = await Promise.all([
    prisma.engagement.findFirst({
      where: { companyId, contractorId },
      select: { id: true },
    }),
    prisma.proposal.findFirst({
      where: { contractorId, requirement: { companyId } },
      select: { id: true },
    }),
  ]);
  return Boolean(engagement || proposal);
}
