"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";
import { User } from "@/models/User";

export type AuthFormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: Record<string, string>;
};

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.email("Enter a valid email").trim().toLowerCase(),
  password: z
    .string()
    .min(8, "At least 8 characters")
    .regex(/[a-zA-Z]/, "Must contain a letter")
    .regex(/[0-9]/, "Must contain a number"),
  // Admins are never self-registered; they are promoted via the seed script / admin panel.
  role: z.enum(["student", "instructor"]),
});

const loginSchema = z.object({
  email: z.email("Enter a valid email").trim().toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export async function register(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = registerSchema.safeParse(raw);
  const values = { name: raw.name ?? "", email: raw.email ?? "", role: raw.role ?? "student" };

  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  const { name, email, password, role } = parsed.data;

  try {
    await connectDB();
    if (await User.exists({ email })) {
      return { fieldErrors: { email: ["An account with this email already exists"] }, values };
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, role });
    await createSession({ userId: user._id.toString(), name: user.name, role: user.role });
  } catch (err) {
    console.error("register failed", err);
    return { error: "Something went wrong. Please try again.", values };
  }

  redirect("/dashboard");
}

export async function login(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = loginSchema.safeParse(raw);
  const values = { email: raw.email ?? "" };

  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  const { email, password } = parsed.data;
  const next = typeof raw.next === "string" && raw.next.startsWith("/") && !raw.next.startsWith("//") ? raw.next : "/dashboard";

  try {
    await connectDB();
    const user = await User.findOne({ email }).select("+passwordHash");
    const valid = user && (await bcrypt.compare(password, user.passwordHash));
    if (!user || !valid) {
      return { error: "Invalid email or password.", values };
    }
    await createSession({ userId: user._id.toString(), name: user.name, role: user.role });
  } catch (err) {
    console.error("login failed", err);
    return { error: "Something went wrong. Please try again.", values };
  }

  redirect(next);
}

export async function logout() {
  await deleteSession();
  redirect("/");
}
