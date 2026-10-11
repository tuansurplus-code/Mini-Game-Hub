import { NextResponse } from "next/server";
import { normalizeHomepageContent } from "../../../../lib/homepage-content";
import { createSupabaseAdminClient } from "../../../../lib/supabase-admin";

const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return reply({ error: "Invalid request origin." }, 403);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return reply({ error: "Please complete the form and try again." }, 400); }
  if (typeof body.website === "string" && body.website.trim()) return reply({ sent: true });
  if (!body.fields || typeof body.fields !== "object" || Array.isArray(body.fields)) return reply({ error: "Please complete the form and try again." }, 400);

  const supabase = createSupabaseAdminClient();
  const { data: homepage, error: homepageError } = await supabase.from("homepage_content").select("published").eq("id", true).maybeSingle();
  if (homepageError) {
    console.error("Unable to load contact form configuration", homepageError);
    return reply({ error: "We could not send your message. Please try again shortly." }, 500);
  }
  const config = normalizeHomepageContent(homepage?.published).contactForm;
  const submitted = body.fields as Record<string, unknown>;
  const values: Record<string, string> = {};
  const errors: string[] = [];
  for (const field of config.fields.filter((item) => item.enabled)) {
    const raw = submitted[field.id];
    const value = typeof raw === "string" ? raw.trim().slice(0, field.type === "textarea" ? 5000 : 500) : "";
    values[field.id] = value;
    if (field.required && !value) { errors.push(field.label); continue; }
    if (!value) continue;
    if (field.type === "email" && (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) errors.push(field.label);
    if (field.type === "phone") {
      const digits = (value.match(/\d/g) ?? []).length;
      if (!/^[+0-9()\s.-]{7,30}$/.test(value) || digits < 7 || digits > 15) errors.push(field.label);
    }
    if (field.type === "select" && !field.options.includes(value)) errors.push(field.label);
  }
  if (errors.length) return reply({ error: `Please check: ${errors.join(", ")}.` }, 400);

  const responses = config.fields.filter((field) => field.enabled).map((field) => ({ label: field.label, value: values[field.id] ?? "" }));
  const configuredById = new Map(config.fields.map((field) => [field.id, field]));
  const { error } = await supabase.from("contact_submissions").insert({
    name: values.name?.slice(0, 120) || null,
    phone_number: configuredById.get("phone")?.type === "phone" ? values.phone || null : null,
    email: configuredById.get("email")?.type === "email" ? values.email?.toLowerCase() || null : null,
    details: values.details?.slice(0, 5000) || null,
    responses,
  });
  if (error) {
    console.error("Unable to save public contact enquiry", error);
    return reply({ error: "We could not send your message. Please try again shortly." }, 500);
  }
  return reply({ sent: true });
}
