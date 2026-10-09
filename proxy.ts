import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { builderGame, withGame } from "./lib/game-builder";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const game = builderGame(request.nextUrl.searchParams.get("game"));
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isLoginRoute = request.nextUrl.pathname === "/login";
  const isOnboardingRoute = request.nextUrl.pathname === "/onboarding";

  function redirectWithCookies(path: string) {
    const redirect = NextResponse.redirect(new URL(path, request.url));
    response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
    return redirect;
  }

  if ((isAdminRoute || isOnboardingRoute) && !user) {
    return redirectWithCookies(withGame("/login", game));
  }

  if ((isLoginRoute || isOnboardingRoute) && user) {
    const { data: platformAdmin, error: platformError } = await supabase
      .from("platform_admins")
      .select("role,active")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!game && !platformError && platformAdmin?.active &&
        ["owner", "admin", "support"].includes(platformAdmin.role)) {
      return redirectWithCookies("/saas-admin");
    }

    const { data: memberships, error: workspaceError } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1);

    if (!workspaceError && memberships?.length) {
      return redirectWithCookies(game ? withGame("/admin/campaigns/new", game) : "/admin");
    }

    // Onboarding performs its own account checks and displays setup.
    if (isLoginRoute) return redirectWithCookies(withGame("/onboarding", game));
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/login",
    "/onboarding",
  ],
};
