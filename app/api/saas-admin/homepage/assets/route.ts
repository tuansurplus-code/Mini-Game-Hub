import { NextResponse } from "next/server";
import { getPlatformAdmin } from "../../../../../lib/platform-auth";
import { createSupabaseAdminClient } from "../../../../../lib/supabase-admin";

export const runtime = "nodejs";
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/avif"]);

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return reply({ error: "Invalid request origin." }, 403);
  const actor = await getPlatformAdmin();
  if (!actor || !["owner", "admin"].includes(actor.role)) return reply({ error: "Only Super Admins and Admins can upload homepage images." }, 403);
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || !allowedTypes.has(file.type) || file.size === 0 || file.size > 3 * 1024 * 1024) return reply({ error: "Upload a PNG, JPG, WEBP or AVIF image up to 3 MB." }, 400);
  const extension = ({ "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/avif": "avif" } as Record<string, string>)[file.type];
  const path = `${crypto.randomUUID()}.${extension}`;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage.from("homepage-assets").upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, cacheControl: "31536000", upsert: false });
  if (error) {
    console.error("Homepage image upload failed", error);
    return reply({ error: "Unable to upload the image. Ensure the homepage-assets migration has been applied." }, 500);
  }
  return reply({ url: supabase.storage.from("homepage-assets").getPublicUrl(path).data.publicUrl });
}
