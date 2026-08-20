import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Reading the audit trail.
 *
 * Every privileged action already writes here via `audit()` in lib/notify.ts;
 * this is the read side. The AuditLog indexes — (createdAt), (actorId,
 * createdAt) and (action, createdAt) — were laid out for exactly these queries,
 * so filtering by actor or action stays an index scan rather than a table scan.
 */

export const AUDIT_PAGE_SIZE = 50;

/**
 * Every action `audit()` can record, grouped for the filter menu. Kept in sync
 * by hand — a missing entry only costs a filter option, never a lost log row,
 * because the query never restricts to this list.
 */
export const AUDIT_ACTION_GROUPS: { label: string; actions: string[] }[] = [
  {
    label: "Verification decisions",
    actions: [
      "CONTRACTOR_STATUS",
      "CONTRACTOR_VERIFY",
      "COMPANY_STATUS",
      "COMPANY_VERIFY",
      "DOC_REVIEW",
      "CLIENT_VERIFY",
      "USER_SUSPEND",
      "SETTINGS_UPDATE",
    ],
  },
  {
    label: "Personal data access",
    actions: ["ADMIN_VIEW_USER", "ADMIN_DOC_VIEW", "ADMIN_EXPORT"],
  },
  {
    label: "Admin access & accounts",
    actions: [
      "ADMIN_LOGIN",
      "ADMIN_LOGOUT",
      "ADMIN_LOGIN_FAILED",
      "ADMIN_LOGIN_BLOCKED",
      "ADMIN_LOGIN_THROTTLED",
      "ADMIN_CREATE",
      "ADMIN_REVOKE",
      "ADMIN_RESTORE",
      "ADMIN_ROLE_CHANGE",
      "ADMIN_DELETE",
      "ADMIN_PASSWORD_CHANGE",
      "ADMIN_PASSWORD_CHANGE_FAILED",
      "ADMIN_PASSWORD_RESET",
      "ADMIN_SESSION_REVOKE",
    ],
  },
  {
    label: "Requirements",
    actions: [
      "REQUIREMENT_CREATE",
      "REQUIREMENT_CLOSE",
      "REQUIREMENT_REOPEN",
      "REQUIREMENT_DELETE",
      "INVITE_SEND",
    ],
  },
  {
    label: "Proposals & engagements",
    actions: [
      "PROPOSAL_SUBMIT",
      "PROPOSAL_ACCEPT",
      "PROPOSAL_WITHDRAW",
      "ENGAGEMENT_COMPLETE",
      "ENGAGEMENT_CANCEL",
      "ENGAGEMENT_HEADCOUNT",
      "CONTRACTOR_REVIEW",
      "RATE_COMPANY",
    ],
  },
  {
    label: "Accounts & profile data",
    actions: [
      "REGISTER",
      "DOCUMENT_UPLOAD",
      "VERIFICATION_ANSWER",
      "CLIENT_ADD",
      "CLIENT_UPDATE",
      "ACCOUNT_UPDATE",
      "EMAIL_VERIFIED",
      "PASSWORD_CHANGE",
      "PASSWORD_RESET",
      "PASSWORD_RESET_REQUEST",
      "SESSIONS_REVOKED",
    ],
  },
];

export const ALL_AUDIT_ACTIONS = AUDIT_ACTION_GROUPS.flatMap((g) => g.actions);

/** Actions that represent an admin reading someone's personal data. */
export const PRIVACY_SENSITIVE_ACTIONS = ["ADMIN_VIEW_USER", "ADMIN_DOC_VIEW", "ADMIN_EXPORT"];

/** Actions worth noticing on a security review: refused or blocked access. */
export const SECURITY_ACTIONS = [
  "ADMIN_LOGIN_FAILED",
  "ADMIN_LOGIN_BLOCKED",
  "ADMIN_LOGIN_THROTTLED",
  "ADMIN_PASSWORD_CHANGE_FAILED",
];

export type AuditQuery = {
  action?: string;
  actorId?: string;
  adminId?: string;
  /** COMPANY | CONTRACTOR for marketplace actors, or ADMIN / SYSTEM. */
  role?: string;
  q?: string;
  from?: string;
  to?: string;
  page: number;
};

export function parseAuditQuery(params: Record<string, string | string[] | undefined>): AuditQuery {
  const one = (key: string): string | undefined => {
    const v = params[key];
    const s = Array.isArray(v) ? v[0] : v;
    return s && s.trim() ? s.trim() : undefined;
  };
  const page = Number(one("page") ?? 1);
  return {
    action: one("action"),
    actorId: one("actorId"),
    adminId: one("adminId"),
    role: one("role"),
    q: one("q"),
    from: one("from"),
    to: one("to"),
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
  };
}

function buildWhere(query: AuditQuery): Prisma.AuditLogWhereInput {
  const and: Prisma.AuditLogWhereInput[] = [];

  if (query.action) and.push({ action: query.action });
  if (query.actorId) and.push({ actorId: query.actorId });
  if (query.adminId) and.push({ adminId: query.adminId });

  // "Role" spans two different things now: an administrator or an unattributed
  // system event are actor *types*, while COMPANY and CONTRACTOR are roles on
  // the marketplace user. One filter, because to somebody reading the log they
  // are all just "who".
  if (query.role === "ADMIN" || query.role === "SYSTEM") {
    and.push({ actorType: query.role });
  } else if (query.role) {
    and.push({ actor: { role: query.role } });
  }

  // Free text spans the detail payload and who did it, because an investigation
  // usually starts from one of the two: an entity id, or a person.
  if (query.q) {
    and.push({
      OR: [
        { detail: { contains: query.q, mode: "insensitive" } },
        { action: { contains: query.q, mode: "insensitive" } },
        { actorLabel: { contains: query.q, mode: "insensitive" } },
        { ip: { contains: query.q } },
        { actor: { name: { contains: query.q, mode: "insensitive" } } },
        { actor: { email: { contains: query.q, mode: "insensitive" } } },
        { admin: { name: { contains: query.q, mode: "insensitive" } } },
        { admin: { username: { contains: query.q, mode: "insensitive" } } },
        { admin: { adminCode: { contains: query.q, mode: "insensitive" } } },
      ],
    });
  }

  // Dates arrive as yyyy-mm-dd. `to` covers the whole day, which is what a
  // person means when they type it.
  const createdAt: Prisma.DateTimeFilter = {};
  if (query.from) {
    const from = new Date(`${query.from}T00:00:00`);
    if (!Number.isNaN(from.valueOf())) createdAt.gte = from;
  }
  if (query.to) {
    const to = new Date(`${query.to}T23:59:59.999`);
    if (!Number.isNaN(to.valueOf())) createdAt.lte = to;
  }
  if (createdAt.gte || createdAt.lte) and.push({ createdAt });

  return and.length > 0 ? { AND: and } : {};
}

export async function searchAuditLog(query: AuditQuery) {
  const where = buildWhere(query);
  const skip = (query.page - 1) * AUDIT_PAGE_SIZE;

  const [total, entries] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: {
        actor: { select: { id: true, name: true, email: true, role: true } },
        admin: { select: { id: true, name: true, username: true, adminCode: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: AUDIT_PAGE_SIZE,
    }),
  ]);

  return {
    entries,
    total,
    page: query.page,
    pageCount: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)),
  };
}

/**
 * Renders "who" for one entry.
 *
 * An entry may point at a marketplace user, at an administrator, at neither
 * (a failed sign-in has no session by definition), or at an actor who has since
 * been deleted — which is exactly why `actorLabel` is frozen at write time.
 * This function is the one place that has to know all four cases.
 */
export function describeAuditActor(entry: {
  actorType: string;
  actorLabel: string | null;
  actor: { id: string; name: string; email: string; role: string } | null;
  admin: { id: string; name: string; username: string; adminCode: string } | null;
}): { name: string; detail: string; filterHref: string | null } {
  if (entry.admin) {
    return {
      name: entry.admin.name,
      detail: `admin · ${entry.admin.adminCode} · ${entry.admin.username}`,
      filterHref: `/admin/audit?adminId=${entry.admin.id}`,
    };
  }
  if (entry.actor) {
    return {
      name: entry.actor.name,
      detail: `${entry.actor.role.toLowerCase()} · ${entry.actor.email}`,
      filterHref: `/admin/audit?actorId=${entry.actor.id}`,
    };
  }
  if (entry.actorType === "SYSTEM") {
    return {
      name: entry.actorLabel ?? "Unauthenticated",
      detail: "no signed-in actor",
      filterHref: null,
    };
  }
  return {
    name: entry.actorLabel ?? "Deleted account",
    detail: entry.actorType.toLowerCase(),
    filterHref: null,
  };
}

/** Counts per action over a window, for the overview strip. */
export async function auditActivitySummary(days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await prisma.auditLog.groupBy({
    by: ["action"],
    where: { createdAt: { gte: since } },
    _count: { action: true },
    orderBy: { _count: { action: "desc" } },
    take: 8,
  });
  return rows.map((r) => ({ action: r.action, count: r._count.action }));
}
