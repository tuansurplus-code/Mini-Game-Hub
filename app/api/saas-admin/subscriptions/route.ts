import { NextResponse } from "next/server";
import { getPlatformAdmin } from "../../../../lib/platform-auth";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";
import { createSupabaseAdminClient } from "../../../../lib/supabase-admin";

function error(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }

export async function GET() {
  const adminUser = await getPlatformAdmin();
  if (!adminUser) return error("Platform admin access required.", 403);
  const supabase = createSupabaseAdminClient();
  const { data: requests, error: queryError } = await supabase.from("subscription_requests")
    .select("id,workspace_id,requested_plan_id,requested_by,amount_lkr,payment_reference,receipt_path,status,review_notes,reviewed_by,reviewed_at,created_at,workspaces(name),subscription_plans(name,slug)")
    .order("created_at", { ascending: false }).limit(200);
  if (queryError) return error("Unable to load subscription requests.", 500);
  const rows = await Promise.all((requests ?? []).map(async (row: any) => {
    const { data } = await supabase.storage.from("subscription-receipts").createSignedUrl(row.receipt_path, 300);
    const workspace = Array.isArray(row.workspaces) ? row.workspaces[0] : row.workspaces;
    const plan = Array.isArray(row.subscription_plans) ? row.subscription_plans[0] : row.subscription_plans;
    return { ...row, receipt_path: undefined, receipt_url: data?.signedUrl ?? null, workspace_name: workspace?.name ?? "Workspace", plan_name: plan?.name ?? "Plan", plan_slug: plan?.slug ?? "" };
  }));
  return NextResponse.json({ requests: rows }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return error("Invalid request origin.", 403);
  const platformAdmin = await getPlatformAdmin();
  if (!platformAdmin) return error("Platform admin access required.", 403);
  let body: { id?: unknown; decision?: unknown; notes?: unknown };
  try { body = await request.json(); } catch { return error("Invalid request."); }
  if (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id) || !["approve", "reject"].includes(String(body.decision))) return error("Choose a request and approve or reject it.");
  const supabase = await createSupabaseServerClient("platform");
  const { data, error: reviewError } = await supabase.rpc("review_subscription_request", {
    p_request_id: body.id, p_decision: body.decision, p_review_notes: typeof body.notes === "string" ? body.notes.slice(0, 1000) : null,
  });
  if (reviewError) return error(reviewError.message.includes("already been reviewed") ? reviewError.message : "Unable to review this subscription request.", reviewError.message.includes("already been reviewed") ? 409 : 400);
  return NextResponse.json({ result: data });
}
