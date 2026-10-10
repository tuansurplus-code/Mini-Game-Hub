import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/admin-auth";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";
import { createSupabaseAdminClient } from "../../../../lib/supabase-admin";

function error(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }
function validOrigin(request: Request) { return request.headers.get("origin") === new URL(request.url).origin; }

export async function GET() {
  const { workspaceId } = await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const [{ data: subscription, error: subError }, { data: plans, error: planError }, { data: requests, error: requestsError }] = await Promise.all([
    supabase.from("workspace_subscriptions").select("status,period_start,period_end,subscription_plans(id,slug,name,monthly_price_lkr,max_active_campaigns,max_monthly_participants,max_team_members,feature_flags)").eq("workspace_id", workspaceId).maybeSingle(),
    supabase.from("subscription_plans").select("id,slug,name,description,monthly_price_lkr,max_active_campaigns,max_monthly_participants,max_team_members,feature_flags").eq("active", true).order("sort_order"),
    supabase.from("subscription_requests").select("id,requested_plan_id,amount_lkr,payment_reference,status,review_notes,created_at,subscription_plans(name,slug)").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(20),
  ]);
  if (subError || planError || requestsError) return error("Unable to load billing details.", 500);
  return NextResponse.json({ subscription, plans: plans ?? [], requests: requests ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!validOrigin(request)) return error("Invalid request origin.", 403);
  const { user, workspaceId, role } = await requireAdmin();
  if (role !== "owner") return error("Only the workspace owner can request a plan upgrade.", 403);
  const form = await request.formData();
  const planId = String(form.get("planId") ?? "");
  const paymentReference = String(form.get("paymentReference") ?? "").trim().slice(0, 120);
  const receipt = form.get("receipt");
  if (!/^[0-9a-f-]{36}$/i.test(planId) || !paymentReference) return error("Choose a plan and enter the payment reference.");
  if (!(receipt instanceof File) || receipt.size < 1 || receipt.size > 4 * 1024 * 1024) return error("Upload a PDF, PNG or JPG receipt up to 4 MB.");
  const mime = receipt.type.toLowerCase();
  if (!["application/pdf", "image/png", "image/jpeg"].includes(mime)) return error("Only PDF, PNG and JPG receipts are accepted.");
  const bytes = new Uint8Array(await receipt.arrayBuffer());
  const signatureOK = mime === "application/pdf"
    ? new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-"
    : mime === "image/png"
      ? bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
      : bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (!signatureOK) return error("The uploaded file does not match its file type.");

  const supabase = await createSupabaseServerClient();
  const [{ data: plan }, { data: pending }] = await Promise.all([
    supabase.from("subscription_plans").select("id,name,monthly_price_lkr,active,slug").eq("id", planId).maybeSingle(),
    supabase.from("subscription_requests").select("id").eq("workspace_id", workspaceId).eq("status", "pending").maybeSingle(),
  ]);
  if (!plan?.active || plan.slug === "free" || plan.monthly_price_lkr === null || Number(plan.monthly_price_lkr) <= 0) return error("This plan is not currently available for paid subscription.", 409);
  if (pending) return error("You already have a subscription request awaiting review.", 409);

  const admin = createSupabaseAdminClient();
  const path = `${workspaceId}/${crypto.randomUUID()}-${receipt.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100)}`;
  const { error: uploadError } = await admin.storage.from("subscription-receipts").upload(path, bytes, { contentType: mime, upsert: false });
  if (uploadError) return error("Unable to securely upload the receipt.", 500);
  const { data, error: insertError } = await supabase.from("subscription_requests").insert({
    workspace_id: workspaceId, requested_plan_id: planId, requested_by: user.id,
    amount_lkr: plan.monthly_price_lkr, billing_period_months: 1,
    payment_reference: paymentReference, receipt_path: path, status: "pending",
  }).select("id").single();
  if (insertError) {
    await admin.storage.from("subscription-receipts").remove([path]);
    return error(insertError.code === "23505" ? "You already have a request awaiting review." : "Unable to submit the subscription request.", insertError.code === "23505" ? 409 : 400);
  }
  return NextResponse.json({ submitted: true, requestId: data.id }, { status: 201 });
}
