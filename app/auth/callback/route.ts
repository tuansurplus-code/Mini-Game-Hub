import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import { builderGame, withGame } from "../../../lib/game-builder";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  let requested = new URL("/onboarding", url.origin);
  try { requested = new URL(url.searchParams.get("next") || "/onboarding", url.origin); } catch { /* Keep the safe default for malformed URLs. */ }
  const inviteId = requested.pathname.match(/^\/invite\/([0-9a-f-]{36})$/i)?.[1];
  const inviteToken = requested.searchParams.get("token") || "";
  const safeInvite = requested.origin === url.origin && !!inviteId && /^[A-Za-z0-9_-]{40,50}$/.test(inviteToken);
  const next = requested.origin === url.origin && requested.pathname === "/reset-password"
    ? "/reset-password"
    : safeInvite
      ? `/invite/${inviteId}?token=${encodeURIComponent(inviteToken)}`
      : withGame("/onboarding", requested.origin === url.origin ? builderGame(requested.searchParams.get("game")) : null);
  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL("/auth-error", url.origin));
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
