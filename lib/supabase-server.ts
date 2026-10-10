import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { CUSTOMER_SESSION_KEY, PLATFORM_SESSION_KEY } from "./auth-session";

export async function createSupabaseServerClient(area: "customer" | "platform" = "customer") {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: { name: area === "platform" ? PLATFORM_SESSION_KEY : CUSTOMER_SESSION_KEY },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Cookie updates may be ignored when called
            // from a Server Component.
          }
        },
      },
    }
  );
}
