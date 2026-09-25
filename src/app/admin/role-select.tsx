"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setUserRole } from "@/app/actions/admin";
import { Select } from "@/components/ui/form";
import { ROLES } from "@/lib/constants";

export function RoleSelect({ userId, role, disabled }: { userId: string; role: string; disabled?: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      defaultValue={role}
      disabled={disabled || pending}
      aria-label="Role"
      className="h-8 w-32 capitalize"
      onChange={(e) => {
        const next = e.target.value;
        const select = e.target;
        startTransition(async () => {
          const res = await setUserRole(userId, next);
          if (res.error) {
            toast.error(res.error);
            select.value = role;
          } else if (res.message) toast.success(res.message);
        });
      }}
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {r}
        </option>
      ))}
    </Select>
  );
}
