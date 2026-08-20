"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  createSession,
  destroySession,
  hashPassword,
  requireUser,
  verifyPassword,
} from "@/lib/auth";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  accountSchema,
} from "@/lib/validation";
import { fieldErrors, type ActionState } from "@/lib/utils";
import { audit } from "@/lib/notify";
import { sendLinkEmail } from "@/lib/email";
import { TOKEN_PURPOSE, consumeToken, issueToken } from "@/lib/tokens";
import { RATE_LIMITS, clientIp, rateLimit, retryMessage } from "@/lib/ratelimit";

/**
 * A real bcrypt hash of a value nobody can supply. Compared against when the
 * email doesn't exist so that a miss costs the same time as a hit — otherwise
 * response latency reveals which addresses are registered.
 */
const DUMMY_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    role: formData.get("role"),
    name: formData.get("name"),
    email: formData.get("email"),
    mobile: formData.get("mobile"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, error: "Please fix the errors below.", fieldErrors: fieldErrors(parsed.error) };
  }

  const limit = await rateLimit(`register:ip:${clientIp()}`, RATE_LIMITS.register);
  if (!limit.ok) {
    return {
      ok: false,
      error: `Too many accounts created from this network. ${retryMessage(limit.retryAfter)}`,
    };
  }

  const { role, name, email, mobile, password } = parsed.data;

  let user;
  try {
    user = await prisma.user.create({
      data: {
        role,
        name,
        email,
        mobile,
        passwordHash: await hashPassword(password),
      },
    });
  } catch (err) {
    // The unique index is the source of truth. Checking first and creating
    // second would let two concurrent signups race past the check.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return {
        ok: false,
        error: "An account with this email already exists.",
        fieldErrors: { email: "Email already registered" },
      };
    }
    throw err;
  }

  await audit(user.id, "REGISTER", `role=${role}`);
  await sendVerificationLink(user.id, user.email, user.name);
  await createSession({
    uid: user.id,
    role: role as "COMPANY" | "CONTRACTOR",
    name,
    tv: user.tokenVersion,
  });
  redirect("/dashboard");
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Please fix the errors below.", fieldErrors: fieldErrors(parsed.error) };
  }
  const { email, password } = parsed.data;

  // Two buckets: one stops a single source guessing many accounts, the other
  // stops many sources guessing one account.
  const [byIp, byEmail] = await Promise.all([
    rateLimit(`login:ip:${clientIp()}`, RATE_LIMITS.loginByIp),
    rateLimit(`login:email:${email}`, RATE_LIMITS.loginByEmail),
  ]);
  if (!byIp.ok || !byEmail.ok) {
    const retryAfter = Math.max(byIp.retryAfter, byEmail.retryAfter);
    return {
      ok: false,
      error: `Too many failed login attempts. ${retryMessage(retryAfter)}`,
    };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // A Google-only account has no hash. Comparing against the dummy keeps the
  // timing identical to a wrong password, so this form still cannot be used to
  // discover which accounts exist or how they sign in.
  const passwordOk = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !user.passwordHash || !passwordOk) {
    return { ok: false, error: "Invalid email or password." };
  }
  if (user.status === "SUSPENDED") {
    return { ok: false, error: "This account has been suspended. Contact support." };
  }
  // Administrators sign in at /admin/login against a separate identity store.
  // This form issues marketplace sessions only, and will not issue one for an
  // account whose role it does not recognise.
  if (user.role !== "COMPANY" && user.role !== "CONTRACTOR") {
    return { ok: false, error: "This account cannot sign in here." };
  }

  // The tiles above the form choose which kind of account Google should create;
  // they are not a gate on signing in. Refusing correct credentials because
  // someone clicked the wrong picture is a support call, not a security
  // control — the session's role comes from the account record either way, and
  // /dashboard sends each role to its own home.
  await createSession({
    uid: user.id,
    role: user.role,
    name: user.name,
    tv: user.tokenVersion,
  });
  redirect(safeNext(formData.get("next")));
}

export async function logoutAction(): Promise<void> {
  destroySession();
  redirect("/login");
}

/**
 * Where to land after signing in.
 *
 * The middleware puts the page the user actually asked for in `next`, and
 * losing it means every deep link — an emailed requirement, a bookmarked
 * engagement — dumps them on the dashboard to navigate again. Only a
 * single-slash relative path is accepted, so this can never be turned into an
 * open redirect to another origin ("//evil.com" is a protocol-relative URL).
 */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  if (!next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}

// ---------------------------------------------------------------------------
// Password reset
//
// The whole flow is deliberately blind: every request reports the same thing
// whether or not the address is registered. A form that says "no such account"
// is a free membership oracle, and this one is reachable without signing in.
// ---------------------------------------------------------------------------

export async function requestPasswordReset(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid email address.", fieldErrors: fieldErrors(parsed.error) };
  }
  const { email } = parsed.data;

  const sent: ActionState = {
    ok: true,
    message: "If that address has an account, a reset link is on its way. It expires in an hour.",
  };

  const [byIp, byEmail] = await Promise.all([
    rateLimit(`reset:ip:${clientIp()}`, RATE_LIMITS.resetByIp),
    rateLimit(`reset:email:${email}`, RATE_LIMITS.resetByEmail),
  ]);
  // Silently identical to success: telling a script it hit a limit for this
  // address confirms the address, which is the one thing to avoid here.
  if (!byIp.ok || !byEmail.ok) return sent;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, status: true, role: true },
  });

  if (user && user.status === "ACTIVE" && (user.role === "COMPANY" || user.role === "CONTRACTOR")) {
    const token = await issueToken(user.id, TOKEN_PURPOSE.RESET);
    await sendLinkEmail({
      to: user.email,
      subject: "Reset your WorkForge password",
      body: `Hello ${user.name}, use the button below to choose a new password. The link works once and expires in an hour. If you didn't ask for this, ignore this email — your current password still works.`,
      path: `/reset-password?token=${token}`,
      cta: "Choose a new password",
    });
    await audit(user.id, "PASSWORD_RESET_REQUEST");
  }

  return sent;
}

export async function resetPassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Please fix the errors below.", fieldErrors: fieldErrors(parsed.error) };
  }

  const user = await consumeToken(parsed.data.token, TOKEN_PURPOSE.RESET);
  if (!user || user.status !== "ACTIVE") {
    return {
      ok: false,
      error: "That reset link has expired or has already been used. Request a new one.",
    };
  }

  // Bumping tokenVersion is the point of the exercise: whoever prompted the
  // reset — usually someone who fears their password is known — is signed out
  // of every device, including the attacker's.
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.password), tokenVersion: { increment: 1 } },
  });
  destroySession();
  await audit(user.id, "PASSWORD_RESET");

  redirect("/login?reset=1");
}

// ---------------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------------

async function sendVerificationLink(userId: string, email: string, name: string): Promise<void> {
  const token = await issueToken(userId, TOKEN_PURPOSE.VERIFY);
  await sendLinkEmail({
    to: email,
    subject: "Confirm your email address",
    body: `Hello ${name}, confirm this address so companies and contractors you deal with know it reaches you. The link expires in three days.`,
    path: `/verify-email?token=${token}`,
    cta: "Confirm my email",
  });
}

export async function resendVerification(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (user.emailVerified) return { ok: true, message: "Your email is already confirmed." };

  const limit = await rateLimit(`verify:user:${user.id}`, RATE_LIMITS.emailVerify);
  if (!limit.ok) {
    return { ok: false, error: `Too many requests. ${retryMessage(limit.retryAfter)}` };
  }

  await sendVerificationLink(user.id, user.email, user.name);
  return { ok: true, message: "Confirmation email sent." };
}

/**
 * Redeems a verification link.
 *
 * Driven by a button on /verify-email rather than by the link itself, because
 * mail scanners and link previewers follow URLs in email: a GET that consumed
 * the token would routinely be spent before its owner ever clicked.
 */
export async function confirmEmail(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await consumeToken(String(formData.get("token") ?? ""), TOKEN_PURPOSE.VERIFY);
  if (!user) {
    return { ok: false, error: "That confirmation link has expired or has already been used." };
  }

  await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
  await audit(user.id, "EMAIL_VERIFIED");
  revalidatePath("/account");
  // Redirect rather than render a message in place: the token has just been
  // spent, so re-rendering this page would re-check it and report the link as
  // used — telling someone their confirmation failed the instant it worked.
  redirect("/verify-email?done=1");
}

// ---------------------------------------------------------------------------
// Account settings
// ---------------------------------------------------------------------------

export async function updateAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const parsed = accountSchema.safeParse({
    name: formData.get("name"),
    mobile: formData.get("mobile"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Please fix the errors below.", fieldErrors: fieldErrors(parsed.error) };
  }

  const limit = await rateLimit(`account:user:${user.id}`, RATE_LIMITS.accountUpdate);
  if (!limit.ok) return { ok: false, error: `Too many changes. ${retryMessage(limit.retryAfter)}` };

  const { name, mobile } = parsed.data;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      name,
      mobile,
      // A new number has not been proven to belong to anyone yet.
      mobileVerified: mobile === user.mobile ? user.mobileVerified : false,
    },
  });

  // The session carries the display name for the header; leaving it stale would
  // show the old name until the cookie expired.
  await createSession({ uid: user.id, role: user.role as "COMPANY" | "CONTRACTOR", name, tv: user.tokenVersion });
  await audit(user.id, "ACCOUNT_UPDATE");
  revalidatePath("/account");
  return { ok: true, message: "Account details saved." };
}

export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const parsed = changePasswordSchema.safeParse({
    current: formData.get("current") ?? "",
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Please fix the errors below.", fieldErrors: fieldErrors(parsed.error) };
  }

  const limit = await rateLimit(`pwchange:user:${user.id}`, RATE_LIMITS.accountUpdate);
  if (!limit.ok) return { ok: false, error: `Too many attempts. ${retryMessage(limit.retryAfter)}` };

  // An account created through Google has no password yet and is setting its
  // first, so there is nothing to prove. Everyone else proves the old one:
  // without that, a borrowed unlocked laptop is a permanent account takeover.
  if (user.passwordHash) {
    const ok = await verifyPassword(parsed.data.current, user.passwordHash);
    if (!ok) {
      return {
        ok: false,
        error: "That is not your current password.",
        fieldErrors: { current: "Incorrect password" },
      };
    }
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.password), tokenVersion: { increment: 1 } },
  });
  // Other devices are logged out; this one is re-issued so the person who just
  // changed their password is not thrown back to the sign-in page.
  await createSession({
    uid: user.id,
    role: user.role as "COMPANY" | "CONTRACTOR",
    name: user.name,
    tv: updated.tokenVersion,
  });
  await audit(user.id, "PASSWORD_CHANGE");
  return { ok: true, message: "Password updated. Other devices have been signed out." };
}

/** Revokes every session, including this one — the "lost my phone" button. */
export async function signOutEverywhere(): Promise<void> {
  const user = await requireUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { tokenVersion: { increment: 1 } },
  });
  await audit(user.id, "SESSIONS_REVOKED");
  destroySession();
  redirect("/login");
}
