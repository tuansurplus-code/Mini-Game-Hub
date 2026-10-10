import { NextResponse } from "next/server";
import { normalizeHomepageContent } from "../../../../lib/homepage-content";
import { createSupabaseAdminClient } from "../../../../lib/supabase-admin";

export const revalidate = 60;

export async function GET() {
  try {
    const { data, error } = await createSupabaseAdminClient().from("homepage_content")
      .select("published").eq("id", true).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ content: normalizeHomepageContent(data?.published) }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("Unable to load published homepage content", error);
    return NextResponse.json({ content: null }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
}
