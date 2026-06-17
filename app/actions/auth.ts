"use server";

import { redirect } from "next/navigation";
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

  const { role, name, email, mobile, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "An account with this email already exists.", fieldErrors: { email: "Email already registered" } };
  }

  const user = await prisma.user.create({
    data: {
      role,
      name,
      email,
      mobile,
      passwordHash: await hashPassword(password),
    },
  });

  await audit(user.id, "REGISTER", `role=${role}`);
  await createSession({ uid: user.id, role: role as "COMPANY" | "CONTRACTOR", name });
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

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { ok: false, error: "Invalid email or password." };
  }
  if (user.status === "SUSPENDED") {
    return { ok: false, error: "This account has been suspended. Contact support." };
  }

  await createSession({ uid: user.id, role: user.role as "COMPANY" | "CONTRACTOR" | "ADMIN", name: user.name });
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  destroySession();
  redirect("/login");
}
