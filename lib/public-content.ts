import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { createSupabaseAdminClient } from "./supabase-admin";
import { normalizeHomepageManager } from "./homepage-content";
import { sanitizeRichText } from "./rich-text";
export type ContactField = { id: string; label: string; type: "text" | "tel" | "email" | "textarea"; enabled: boolean; required: boolean };
export const getPublicContent = cache(async (slug: string) => {
  if (!["terms", "privacy", "about", "contact"].includes(slug)) return null;
  await connection();
  const db = createSupabaseAdminClient();
  const [{ data: page, error }, { data: home }] = await Promise.all([
    db.from("content_pages").select("slug,title,published,published_at").eq("slug", slug).maybeSingle(),
    db.from("homepage_content").select("published_manager").eq("id", true).maybeSingle(),
  ]);
  if (error || !page) return null;
  return {
    page: { ...page, published: { ...page.published, body: sanitizeRichText(page.published?.body ?? "") } },
    theme: normalizeHomepageManager(home?.published_manager).siteTheme,
  };
});
