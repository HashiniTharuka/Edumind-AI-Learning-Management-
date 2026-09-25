"use server";

import { isCloudinaryConfigured, signUploadParams } from "@/lib/cloudinary";
import { assertUser } from "@/lib/dal";
import { toActionError } from "@/lib/action-state";

export type UploadKind = "image" | "video" | "pdf";

type SignatureResult = { error: string } | { params: ReturnType<typeof signUploadParams> };

export async function getUploadSignature(kind: UploadKind): Promise<SignatureResult> {
  try {
    await assertUser(["instructor", "admin"]);
    // Server actions are public endpoints — don't trust the argument's type.
    if (!["image", "video", "pdf"].includes(kind)) return { error: "Unsupported file type" };
    if (!isCloudinaryConfigured()) {
      return { error: "File uploads aren't configured. Add your Cloudinary keys to .env.local, or paste a URL." };
    }
    const params = signUploadParams({ folder: `edumind/${kind}s`, timestamp: Math.round(Date.now() / 1000) });
    return { params };
  } catch (err) {
    return { error: toActionError(err).error ?? "Upload failed" };
  }
}
