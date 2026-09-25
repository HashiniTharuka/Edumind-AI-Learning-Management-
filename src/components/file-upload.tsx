"use client";

import { useId, useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { getUploadSignature, type UploadKind } from "@/app/actions/upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";

const ACCEPT: Record<UploadKind, string> = {
  image: "image/png,image/jpeg,image/webp",
  video: "video/mp4,video/webm",
  pdf: "application/pdf",
};

const MAX_MB: Record<UploadKind, number> = { image: 5, video: 100, pdf: 10 };

type Props = {
  name: string;
  kind: UploadKind;
  defaultValue?: string;
  placeholder?: string;
  invalid?: boolean;
  onChange?: (url: string) => void;
};

/**
 * A URL field with an "Upload" button. Files go straight from the browser to Cloudinary
 * using a short-lived signature from the server; only the resulting URL is saved in MongoDB.
 */
export function FileUpload({ name, kind, defaultValue = "", placeholder, invalid, onChange }: Props) {
  const [url, setUrl] = useState(defaultValue);
  const [progress, setProgress] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const id = useId();

  function update(value: string) {
    setUrl(value);
    onChange?.(value);
  }

  async function upload(file: File) {
    if (file.size > MAX_MB[kind] * 1024 * 1024) {
      toast.error(`File is too large (max ${MAX_MB[kind]} MB)`);
      return;
    }
    const res = await getUploadSignature(kind);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    const { cloudName, ...params } = res.params;
    const body = new FormData();
    body.append("file", file);
    Object.entries(params).forEach(([k, v]) => body.append(k, String(v)));

    // XHR instead of fetch so we can show upload progress for large videos.
    setProgress(0);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`);
    xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      setProgress(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        update(JSON.parse(xhr.responseText).secure_url);
        toast.success("Uploaded");
      } else {
        toast.error("Upload failed");
      }
    };
    xhr.onerror = () => {
      setProgress(null);
      toast.error("Upload failed");
    };
    xhr.send(body);
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          id={name}
          name={name}
          value={url}
          onChange={(e) => update(e.target.value)}
          placeholder={placeholder ?? "https://…"}
          aria-invalid={invalid || undefined}
        />
        <Button type="button" variant="outline" disabled={progress !== null} onClick={() => fileInput.current?.click()}>
          {progress !== null ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {progress !== null ? `${progress}%` : "Upload"}
        </Button>
        <input
          id={id}
          ref={fileInput}
          type="file"
          accept={ACCEPT[kind]}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
            e.target.value = "";
          }}
        />
      </div>
      {kind === "image" && url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Preview" className="aspect-video w-full max-w-sm rounded-lg border object-cover" />
      )}
    </div>
  );
}
