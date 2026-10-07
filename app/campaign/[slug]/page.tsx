import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "../../../lib/supabase-server";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type Campaign = {
  id: string;
  name: string;
  slug: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
};

export default async function PublicCampaignPage({ params }: PageProps) {
  const { slug } = await params;

  if (!slug) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("id,name,slug,status,starts_at,ends_at")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !campaign) {
    if (error) {
      console.error("Load public campaign error:", error);
    }
    notFound();
  }

  const typedCampaign = campaign as Campaign;
  const now = new Date();
  const startsAt = typedCampaign.starts_at
    ? new Date(typedCampaign.starts_at)
    : null;
  const endsAt = typedCampaign.ends_at
    ? new Date(typedCampaign.ends_at)
    : null;

  const isAvailable =
    typedCampaign.status === "active" &&
    (!startsAt || startsAt <= now) &&
    (!endsAt || endsAt >= now);

  if (!isAvailable) {
    notFound();
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: "48px 20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 960,
          margin: "0 auto",
        }}
      >
        <section
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 18,
            padding: "32px 28px",
            boxShadow: "0 12px 32px rgba(15, 23, 42, 0.06)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.12em",
              color: "#e31b23",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Singhagiri Mini Game Hub
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "clamp(30px, 6vw, 48px)",
              lineHeight: 1.08,
              color: "#111827",
            }}
          >
            {typedCampaign.name}
          </h1>

          <p
            style={{
              margin: "14px 0 0",
              maxWidth: 620,
              color: "#6b7280",
              fontSize: 16,
              lineHeight: 1.6,
            }}
          >
            Choose a game and play for your chance to win exciting rewards.
          </p>

          <div
            style={{
              marginTop: 28,
              padding: 20,
              borderRadius: 12,
              background: "#f9fafb",
              border: "1px dashed #d1d5db",
              color: "#6b7280",
              fontSize: 14,
            }}
          >
            Game selection will be added in Step 9.2.2.
          </div>
        </section>
      </div>
    </main>
  );
}
