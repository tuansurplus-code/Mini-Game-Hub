import { contentSecurityPolicy } from "./lib/content-security-policy";
import { createServerClient } from "@supabase/ssr";
import { CUSTOMER_SESSION_KEY, PLATFORM_SESSION_KEY } from "./lib/auth-session";
import { NextResponse } from "next/server";
import { builderGame, withGame } from "./lib/game-builder";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const platform = pathname === "/saas-mfa" || pathname === "/saas-login" || pathname === "/saas-password" || pathname === "/saas-admin" || pathname.startsWith("/saas-admin/") || pathname.startsWith("/api/saas-admin/");
  const nonce=btoa(crypto.randomUUID());
  const csp=contentSecurityPolicy(nonce,process.env.NODE_ENV==="development");
  const requestHeaders=new Headers(request.headers);
  requestHeaders.set("x-nonce",nonce);
  requestHeaders.set("Content-Security-Policy",csp);
  const pass=()=>{const result=NextResponse.next({request:{headers:requestHeaders}});result.headers.set("Content-Security-Policy",csp);return result;};
  let response=pass();
  const sessionRoute=platform||pathname.startsWith("/admin")||["/login","/onboarding","/change-password"].includes(pathname);
  if(!sessionRoute)return response;

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
          requestHeaders.set("cookie",request.headers.get("cookie")||"");
          response = pass();
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
    redirect.headers.set("Content-Security-Policy",csp);
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
    if(user && (pathname.startsWith("/saas-admin") || pathname.startsWith("/api/saas-admin/"))) {
      const target=user.app_metadata?.must_change_password===true?"/saas-password":"/saas-mfa";
      const assurance=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if(target==="/saas-password"||assurance.error||assurance.data.currentLevel!=="aal2") {
        if(pathname.startsWith("/api/")) return NextResponse.json({error:"Complete administrator authentication first."},{status:403});
        return redirectWithCookies(target);
      }
    }
    return response;
  }

  if (user?.app_metadata?.must_change_password === true && (isAdminRoute || isOnboardingRoute || isLoginRoute)) {
    return redirectWithCookies("/change-password");
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|homepage/|template-previews/|template-artwork/|template-thumbnails/).*)"],
};
