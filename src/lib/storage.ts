import { randomUUID } from "crypto";
import { mkdir, writeFile, unlink } from "fs/promises";
import { join, extname } from "path";

type StorageBackend = "vercel" | "s3" | "local";

function detectBackend(): StorageBackend {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "vercel";
  if (process.env.S3_BUCKET) return "s3";
  return "local";
}

export async function uploadImage(file: File): Promise<string> {
  const backend = detectBackend();

  if (backend === "vercel") {
    const { put } = await import("@vercel/blob");
    const blob = await put(file.name, file, {
      access: "public",
      addRandomSuffix: true,
    });
    return blob.url;
  }

  if (backend === "s3") {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: process.env.S3_REGION ?? "us-east-1",
      ...(process.env.S3_ENDPOINT && { endpoint: process.env.S3_ENDPOINT }),
      ...(process.env.S3_ACCESS_KEY_ID && {
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
        },
      }),
    });
    const ext = extname(file.name) || ".png";
    const key = `uploads/${randomUUID()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      }),
    );
    const endpoint = process.env.S3_ENDPOINT?.replace(/\/$/, "");
    if (endpoint) {
      return `${endpoint}/${process.env.S3_BUCKET}/${key}`;
    }
    return `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION ?? "us-east-1"}.amazonaws.com/${key}`;
  }

  // Local filesystem
  const uploadsDir = join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  const ext = extname(file.name) || ".png";
  const filename = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(join(uploadsDir, filename), buffer);
  return `/uploads/${filename}`;
}

export async function deleteImage(url: string): Promise<void> {
  const backend = detectBackend();

  if (backend === "vercel") {
    const { del } = await import("@vercel/blob");
    await del(url);
    return;
  }

  if (backend === "s3") {
    const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: process.env.S3_REGION ?? "us-east-1",
      ...(process.env.S3_ENDPOINT && { endpoint: process.env.S3_ENDPOINT }),
      ...(process.env.S3_ACCESS_KEY_ID && {
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
        },
      }),
    });
    const key = new URL(url).pathname.replace(/^\//, "");
    await client.send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
      }),
    );
    return;
  }

  // Local filesystem
  if (url.startsWith("/uploads/")) {
    const filepath = join(process.cwd(), "public", url);
    await unlink(filepath).catch(() => {});
  }
}
