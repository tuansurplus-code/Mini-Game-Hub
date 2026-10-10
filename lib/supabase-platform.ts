import { createBrowserClient } from "@supabase/ssr";
import { PLATFORM_SESSION_KEY } from "./auth-session";

export const platformSupabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  { cookieOptions: { name: PLATFORM_SESSION_KEY }, isSingleton: false }
);
