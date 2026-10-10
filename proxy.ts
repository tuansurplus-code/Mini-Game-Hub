import { createServerClient } from "@supabase/ssr";
import { CUSTOMER_SESSION_KEY, PLATFORM_SESSION_KEY } from "./lib/auth-session";
import { NextResponse } from "next/server";
import { builderGame, withGame } from "./lib/game-builder";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const platform = pathname === "/saas-login" || pathname === "/saas-password" || pathname === "/saas-admin" || pathname.startsWith("/saas-admin/") || pathname.startsWith("/api/saas-admin/");
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: { name: platform ? PLATFORM_SESSION_KEY : CUSTOMER_SESSION_KEY },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
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

  if (platform) {
    if (!user && pathname !== "/saas-login" && !pathname.startsWith("/api/")) {
      return redirectWithCookies("/saas-login");
    }
    if (user && pathname === "/saas-login") {
      const { data } = await supabase.from("platform_admins").select("role,active").eq("user_id", user.id).maybeSingle();
      if (data?.active && ["owner", "admin", "support"].includes(data.role)) return redirectWithCookies(user.app_metadata?.must_change_password === true ? "/saas-password" : "/saas-admin");
    }
    return response;
  }

  if ((isAdminRoute || isOnboardingRoute) && !user) {
    return redirectWithCookies(withGame("/login", game));
  }

  if ((isLoginRoute || isOnboardingRoute) && user) {
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
    "/saas-admin/:path*",
    "/api/saas-admin/:path*",
    "/saas-login",
    "/saas-password",
    "/login",
    "/onboarding",
  ],
};
