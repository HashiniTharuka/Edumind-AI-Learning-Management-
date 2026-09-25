import { z } from "zod";
import { AuthError } from "@/lib/dal";

export type ActionState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export function validationError(error: z.ZodError): ActionState {
  return { error: "Please fix the highlighted fields.", fieldErrors: z.flattenError(error).fieldErrors };
}

/** Maps thrown errors to a safe message; unexpected errors are logged, not leaked. */
export function toActionError(err: unknown): ActionState {
  if (err instanceof AuthError) return { error: err.message };
  console.error(err);
  return { error: "Something went wrong. Please try again." };
}

/** "" or missing -> undefined, so optional form fields validate cleanly. */
export const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || undefined)
  .pipe(z.url("Enter a valid URL").optional());
