import { NextResponse } from "next/server";
import { getPlatformAdmin } from "../../../../lib/platform-auth";
import { createSupabaseAdminClient } from "../../../../lib/supabase-admin";

const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET() {
  const actor = await getPlatformAdmin();
  if (!actor) return reply({ error: "Platform access required." }, 403);
  const { data, error } = await createSupabaseAdminClient().from("contact_submissions")
    .select("id,name,phone_number,email,details,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error("Unable to load contact enquiries", error);
    return reply({ error: "Unable to load contact enquiries." }, 500);
  }
  return reply({ submissions: data ?? [] });
}
