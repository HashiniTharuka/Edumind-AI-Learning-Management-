"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { toActionError, type ActionState } from "@/lib/action-state";
import { ROLES } from "@/lib/constants";
import { isValidId } from "@/lib/courses";
import { assertUser } from "@/lib/dal";
import { User } from "@/models/User";

const roleSchema = z.enum(ROLES);

export async function setUserRole(userId: string, role: string): Promise<ActionState> {
  try {
    const admin = await assertUser(["admin"]);
    const parsed = roleSchema.safeParse(role);
    if (!parsed.success || !isValidId(userId)) return { error: "Invalid request" };
    if (userId === admin.id) return { error: "You can't change your own role." };

    const user = await User.findByIdAndUpdate(userId, { $set: { role: parsed.data } });
    if (!user) return { error: "User not found" };
    revalidatePath("/admin");
    return { ok: true, message: `${user.name} is now ${/^[aeiou]/.test(parsed.data) ? "an" : "a"} ${parsed.data}` };
  } catch (err) {
    return toActionError(err);
  }
}
