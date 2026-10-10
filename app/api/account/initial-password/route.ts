import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return jsonError("Invalid request origin.", 403);
  }

  let body: { password?: unknown; area?: unknown };
  try { body = await request.json(); } catch { return jsonError("Invalid request.", 400); }
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 12 || password.length > 128) {
    return jsonError("Choose a password with at least 12 characters.", 400);
  }

  const supabase = await createSupabaseServerClient(body.area === "platform" ? "platform" : "customer");
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return jsonError("Sign in to change your password.", 401);
  if (user.app_metadata?.must_change_password !== true) {
    return jsonError("A password change is not required for this account.", 403);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !secretKey) {
    return jsonError("Password setup is not configured. Contact the workspace owner.", 503);
  }
  const admin = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const { error: passwordError } = await supabase.auth.updateUser({ password });
  if (passwordError) return jsonError(passwordError.message, 400);

  const { error: metadataError } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...user.app_metadata, must_change_password: false },
  });
  if (metadataError) {
    return jsonError("Your password was changed, but setup could not be completed. Submit a new password again or contact the owner.", 500);
  }
  return NextResponse.json({ updated: true });
}
