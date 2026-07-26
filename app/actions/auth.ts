"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  createSession,
  destroySession,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { registerSchema, loginSchema } from "@/lib/validation";
import { fieldErrors, type ActionState } from "@/lib/utils";
import { audit } from "@/lib/notify";
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
  const passwordOk = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !passwordOk) {
    return { ok: false, error: "Invalid email or password." };
  }
  if (user.status === "SUSPENDED") {
    return { ok: false, error: "This account has been suspended. Contact support." };
  }

  await createSession({
    uid: user.id,
    role: user.role as "COMPANY" | "CONTRACTOR" | "ADMIN",
    name: user.name,
    tv: user.tokenVersion,
  });
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  destroySession();
  redirect("/login");
}
