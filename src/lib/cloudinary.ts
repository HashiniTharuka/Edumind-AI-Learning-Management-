import "server-only";
import { createHash } from "node:crypto";

export function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
  );
}

/**
 * Signs upload params so the browser can upload straight to Cloudinary
 * without the file passing through our server (keeps us within Vercel's body limits).
 * https://cloudinary.com/documentation/authentication_signatures
 */
export function signUploadParams(params: Record<string, string | number>) {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  const signature = createHash("sha1")
    .update(toSign + process.env.CLOUDINARY_API_SECRET)
    .digest("hex");

  return {
    ...params,
    signature,
    api_key: process.env.CLOUDINARY_API_KEY!,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
  };
}
