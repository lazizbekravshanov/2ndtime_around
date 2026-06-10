import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Upload service interface — pages depend on this abstraction, not on the
 * storage detail. The dev implementation writes to /public/uploads; swap in
 * an S3/Blob implementation for production without touching callers.
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

class LocalUploadService implements UploadService {
  async save(file: File): Promise<string> {
    if (!ALLOWED_TYPES.has(file.type)) {
      throw new Error("Only JPEG, PNG, WebP, or GIF images are allowed.");
    }
    if (file.size > MAX_BYTES) {
      throw new Error("Each photo must be under 5 MB.");
    }
    const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const name = `${crypto.randomBytes(12).toString("hex")}.${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, name),
      Buffer.from(await file.arrayBuffer())
    );
    return `/uploads/${name}`;
  }
}

export const uploadService: UploadService = new LocalUploadService();
