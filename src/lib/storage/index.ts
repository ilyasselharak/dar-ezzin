import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

/**
 * Storage abstraction.
 *  - "r2": Cloudflare R2 via the S3 API. Browsers upload directly with presigned PUT URLs;
 *          secrets never leave the server.
 *  - "local": development fallback writing to /public/uploads, with HMAC-signed upload URLs
 *             that mimic presigned URLs so the client code path is identical.
 */
export interface UploadTarget {
  url: string;
  method: "PUT";
  headers: Record<string, string>;
}

export interface StorageDriver {
  createUploadUrl(key: string, contentType: string, size: number): Promise<UploadTarget>;
  head(key: string): Promise<{ size: number; contentType?: string } | null>;
  get(key: string): Promise<Buffer>;
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  delete(keys: string[]): Promise<void>;
}

const UPLOAD_TTL_SECONDS = 5 * 60;

// ── R2 ──────────────────────────────────────────────────────

function r2Driver(): StorageDriver {
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID!, secretAccessKey: env.R2_SECRET_ACCESS_KEY! },
  });
  const Bucket = env.R2_BUCKET!;

  return {
    async createUploadUrl(key, contentType, size) {
      const command = new PutObjectCommand({
        Bucket,
        Key: key,
        ContentType: contentType,
        ContentLength: size,
        CacheControl: "public, max-age=31536000, immutable",
      });
      const url = await getSignedUrl(client, command, { expiresIn: UPLOAD_TTL_SECONDS });
      return {
        url,
        method: "PUT",
        headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable" },
      };
    },
    async head(key) {
      try {
        const res = await client.send(new HeadObjectCommand({ Bucket, Key: key }));
        return { size: res.ContentLength ?? 0, contentType: res.ContentType };
      } catch {
        return null;
      }
    },
    async get(key) {
      const res = await client.send(new GetObjectCommand({ Bucket, Key: key }));
      const bytes = await res.Body!.transformToByteArray();
      return Buffer.from(bytes);
    },
    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );
    },
    async delete(keys) {
      if (!keys.length) return;
      for (let i = 0; i < keys.length; i += 1000) {
        await client.send(
          new DeleteObjectsCommand({
            Bucket,
            Delete: { Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true },
          }),
        );
      }
    },
  };
}

// ── Local (development) ─────────────────────────────────────

const LOCAL_ROOT = path.join(process.cwd(), "public", "uploads");

function localPath(key: string) {
  const resolved = path.resolve(LOCAL_ROOT, key);
  if (!resolved.startsWith(LOCAL_ROOT + path.sep)) throw new Error("Invalid key");
  return resolved;
}

function sign(payload: string) {
  return createHmac("sha256", env.BETTER_AUTH_SECRET).update(payload).digest("hex");
}

export function verifyLocalUploadToken(key: string, contentType: string, size: number, expires: number, token: string) {
  if (Date.now() / 1000 > expires) return false;
  const expected = Buffer.from(sign(`${key}|${contentType}|${size}|${expires}`));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

function localDriver(): StorageDriver {
  return {
    async createUploadUrl(key, contentType, size) {
      const expires = Math.floor(Date.now() / 1000) + UPLOAD_TTL_SECONDS;
      const token = sign(`${key}|${contentType}|${size}|${expires}`);
      const qs = new URLSearchParams({ key, ct: contentType, size: String(size), expires: String(expires), token });
      return { url: `/api/uploads/local?${qs}`, method: "PUT", headers: { "Content-Type": contentType } };
    },
    async head(key) {
      try {
        const s = await stat(localPath(key));
        return { size: s.size };
      } catch {
        return null;
      }
    },
    get: (key) => readFile(localPath(key)),
    async put(key, body) {
      const p = localPath(key);
      await mkdir(path.dirname(p), { recursive: true });
      await writeFile(p, body);
    },
    async delete(keys) {
      await Promise.all(keys.map((k) => rm(localPath(k), { force: true })));
    },
  };
}

export const storage: StorageDriver = env.STORAGE_DRIVER === "r2" ? r2Driver() : localDriver();
export const storageDriverName = env.STORAGE_DRIVER;
