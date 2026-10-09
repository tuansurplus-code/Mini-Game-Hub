import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import { builderGame, withGame } from "../../../lib/game-builder";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  let requested = new URL("/onboarding", url.origin);
  try { requested = new URL(url.searchParams.get("next") || "/onboarding", url.origin); } catch { /* Keep the safe default for malformed URLs. */ }
  const next = requested.origin === url.origin && requested.pathname === "/reset-password"
    ? "/reset-password"
    : withGame("/onboarding", requested.origin === url.origin ? builderGame(requested.searchParams.get("game")) : null);
  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL("/auth-error", url.origin));
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
