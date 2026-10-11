import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "../../../../lib/supabase-admin";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
type ContactField = { id: string; label: string; type: string; enabled: boolean; required: boolean };

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "Invalid request origin." }, 403);
  let body: { fields?: unknown };
  try { body = await request.json(); } catch { return json({ error: "Invalid form submission." }, 400); }
  const { data: page, error: pageError } = await createSupabaseAdminClient().from("content_pages").select("published").eq("slug", "contact").maybeSingle();
  if (pageError || !page) return json({ error: "The contact form is unavailable." }, 503);
  const config = page.published as { fields?: ContactField[] };
  const fields = Array.isArray(config.fields) ? config.fields.filter((field) => field.enabled).slice(0, 20) : [];
  const input = body.fields && typeof body.fields === "object" && !Array.isArray(body.fields) ? body.fields as Record<string, unknown> : {};
  const formData: Record<string, string> = {};
  const standard: Record<string, string | null> = { name: null, phone_number: null, email: null, details: null };
  const responses: { id: string; label: string; value: string }[] = [];
  for (const field of fields) {
    const max = field.id === "name" ? 120 : field.id === "phone" ? 30 : field.id === "email" ? 254 : field.id === "details" ? 5000 : 2000;
    const value = typeof input[field.id] === "string" ? (input[field.id] as string).trim().slice(0, max) : "";
    if (field.required && !value) return json({ error: `${field.label} is required.` }, 400);
    if (field.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return json({ error: "Enter a valid email address." }, 400);
    formData[field.label] = value;
    responses.push({ id: field.id, label: field.label, value });
    if (field.id === "name") standard.name = value || null;
    if (field.id === "phone") standard.phone_number = value || null;
    if (field.id === "email") standard.email = value || null;
    if (field.id === "details") standard.details = value || null;
  }
  if (!Object.keys(formData).length) return json({ error: "The contact form has no enabled fields." }, 400);
  const { error } = await createSupabaseAdminClient().from("contact_submissions").insert({ ...standard, responses });
  if (error) { console.error("Unable to store contact submission", error); return json({ error: "Unable to submit your message right now." }, 500); }
  return json({ submitted: true, message: "Thank you. Your message has been received." }, 201);
}
