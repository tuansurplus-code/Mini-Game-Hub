import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "../../../../lib/supabase-admin";

const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return reply({ error: "Invalid request origin." }, 403);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return reply({ error: "Please complete the form and try again." }, 400); }

  // Quietly accept automated submissions caught by the honeypot.
  if (typeof body.website === "string" && body.website.trim()) return reply({ sent: true });

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phoneNumber = typeof body.phoneNumber === "string" ? body.phoneNumber.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const details = typeof body.details === "string" ? body.details.trim() : "";
  const digitCount = (phoneNumber.match(/\d/g) ?? []).length;
  if (name.length < 1 || name.length > 120) return reply({ error: "Enter your name (up to 120 characters)." }, 400);
  if (!/^[+0-9()\s.-]{7,30}$/.test(phoneNumber) || digitCount < 7 || digitCount > 15) return reply({ error: "Enter a valid phone number." }, 400);
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply({ error: "Enter a valid email address." }, 400);
  if (details.length < 1 || details.length > 5000) return reply({ error: "Add details (up to 5,000 characters)." }, 400);

  const { error } = await createSupabaseAdminClient().from("contact_submissions").insert({
    name, phone_number: phoneNumber, email, details,
  });
  if (error) {
    console.error("Unable to save public contact enquiry", error);
    return reply({ error: "We could not send your message. Please try again shortly." }, 500);
  }
  return reply({ sent: true });
}
