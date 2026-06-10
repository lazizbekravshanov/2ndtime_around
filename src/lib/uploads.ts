import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Upload service interface — pages depend on this abstraction, not on the
 * storage detail. Local disk in dev, Vercel Blob in production; callers
 * never know the difference.
 */
export interface UploadService {
  /** Stores the file and returns its public URL. */
  save(file: File): Promise<string>;
}

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB per photo

function validateAndName(file: File): string {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Only JPEG, PNG, WebP, or GIF images are allowed.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Each photo must be under 5 MB.");
  }
  const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  return `${crypto.randomBytes(12).toString("hex")}.${ext}`;
}

/** Dev storage: writes into /public/uploads, served by Next statically. */
class LocalUploadService implements UploadService {
  async save(file: File): Promise<string> {
    const name = validateAndName(file);
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, name),
      Buffer.from(await file.arrayBuffer())
    );
    return `/uploads/${name}`;
  }
}

/** Production storage: Vercel Blob (the filesystem there is read-only). */
class BlobUploadService implements UploadService {
  async save(file: File): Promise<string> {
    const name = validateAndName(file);
    const { put } = await import("@vercel/blob");
    const blob = await put(`uploads/${name}`, file, { access: "public" });
    return blob.url;
  }
}

export const uploadService: UploadService = process.env.BLOB_READ_WRITE_TOKEN
  ? new BlobUploadService()
  : new LocalUploadService();
