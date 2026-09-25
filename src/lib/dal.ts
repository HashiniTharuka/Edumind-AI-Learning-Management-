import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { readSession } from "@/lib/session";
import { User, type Role } from "@/models/User";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
};

/**
 * Data Access Layer: the single place that turns a session cookie into a trusted user.
 * The proxy only does optimistic redirects; every page and action re-checks here.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSession();
  if (!session?.userId) return null;

  await connectDB();
  const user = await User.findById(session.userId).lean();
  if (!user) return null;

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role as Role,
    avatarUrl: user.avatarUrl ?? undefined,
  };
});

/** Use in pages: redirects when not signed in or when the role isn't allowed. */
export async function requireUser(roles?: Role[]) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect("/dashboard");
  return user;
}

export class AuthError extends Error {}

/** Use in server actions / route handlers: throws instead of redirecting. */
export async function assertUser(roles?: Role[]) {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("You must be signed in.");
  if (roles && !roles.includes(user.role)) throw new AuthError("You don't have permission to do that.");
  return user;
}
