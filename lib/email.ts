import "server-only";
import { siteUrl } from "@/lib/site";

/**
 * Transactional email.
 *
 * Talks to the Resend REST API over plain fetch rather than pulling in an SDK —
 * one endpoint, one POST, nothing to keep up to date. The whole module is inert
 * until RESEND_API_KEY and EMAIL_FROM are both set, so development, CI and the
 * smoke suite never send anything and never need credentials.
 */

const ENDPOINT = "https://api.resend.com/emails";

export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/** Notification types that are worth an email. Chat messages deliberately are not. */
const EMAILABLE = new Set([
  "PROPOSAL_RECEIVED",
  "PROPOSAL_ACCEPTED",
  "PROPOSAL_SHORTLISTED",
  "PROPOSAL_REJECTED",
  "INVITE_RECEIVED",
  "REQUIREMENT_MATCHED",
  "VERIFIED",
  "MODERATION",
  "ENGAGEMENT_COMPLETED",
  "ENGAGEMENT_CANCELLED",
  "REVIEW_RECEIVED",
]);

const SUBJECTS: Record<string, string> = {
  PROPOSAL_RECEIVED: "You have a new proposal",
  PROPOSAL_ACCEPTED: "Your proposal was accepted",
  PROPOSAL_SHORTLISTED: "Your proposal was shortlisted",
  PROPOSAL_REJECTED: "Update on your proposal",
  INVITE_RECEIVED: "You have been invited to quote",
  REQUIREMENT_MATCHED: "A new requirement matches your firm",
  VERIFIED: "Your verification is complete",
  MODERATION: "An update on your account",
  ENGAGEMENT_COMPLETED: "An engagement was marked complete",
  ENGAGEMENT_CANCELLED: "An engagement was cancelled",
  REVIEW_RECEIVED: "You received a rating",
};

export function shouldEmail(type: string): boolean {
  return emailEnabled() && EMAILABLE.has(type);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Plain, single-column HTML — renders predictably and never trips spam filters. */
function template(body: string, link?: string, cta = "View on WorkForge"): string {
  const url = link ? `${siteUrl()}${link}` : siteUrl();
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f8fafc;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#1e293b">
  <table role="presentation" style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px">
    <tr><td style="padding:24px">
      <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:#20487b">WorkForge</p>
      <p style="margin:0 0 20px;font-size:12px;color:#64748b">India's contract manpower marketplace</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6">${escapeHtml(body)}</p>
      <a href="${url}" style="display:inline-block;background:#20487b;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600">${escapeHtml(cta)}</a>
    </td></tr>
  </table>
  <p style="max-width:520px;margin:16px auto 0;font-size:11px;color:#94a3b8;text-align:center">
    You are receiving this because you have a WorkForge account.
  </p>
</body></html>`;
}

/**
 * Sends one email. Never throws: delivery failure must not roll back the action
 * that triggered it, and the in-app notification is already the durable record.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
  link?: string;
  /** Button label. Defaults to the generic "View on WorkForge". */
  cta?: string;
}): Promise<boolean> {
  if (!emailEnabled()) return false;

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [params.to],
        subject: params.subject,
        html: template(params.body, params.link, params.cta),
        text: `${params.body}\n\n${params.link ? siteUrl() + params.link : siteUrl()}`,
      }),
      // A slow provider must not hold a server action open.
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.error("[email] provider rejected:", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] send failed:", err);
    return false;
  }
}

export function subjectFor(type: string): string {
  return SUBJECTS[type] ?? "An update from WorkForge";
}

/**
 * Account-lifecycle mail: reset links and verification links.
 *
 * These are the two messages a user cannot proceed without, so when no provider
 * is configured — local development, CI — the link is written to the server log
 * instead of being silently dropped. It is the only place a raw token is ever
 * printed, and it happens only where there is no email to send it to.
 */
export async function sendLinkEmail(params: {
  to: string;
  subject: string;
  body: string;
  path: string;
  cta: string;
}): Promise<void> {
  if (!emailEnabled()) {
    console.warn(`[email] not configured — ${params.subject}: ${siteUrl()}${params.path}`);
    return;
  }
  const { path, ...rest } = params;
  await sendEmail({ ...rest, link: path });
}
