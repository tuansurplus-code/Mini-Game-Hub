"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export default function CampaignBuilderNav({ campaignId, gameId }: { campaignId: string; gameId?: string }) {
  const pathname = usePathname();
  const query = useSearchParams();
  const configuration = pathname.startsWith("/admin/campaign-games/");
  const current = query.get("step") || (configuration ? "appearance" : "general");
  const campaign = `/admin/campaigns/${campaignId}`;
  const game = gameId ? `/admin/campaign-games/${gameId}` : null;
  const steps = [
    { id: "general", label: "Details & Game", href: `${campaign}?step=general` },
    { id: "appearance", label: "Configuration", href: game && `${game}?step=appearance` },
    { id: "prizes", label: "Prizes", href: game && `${game}?step=prizes` },
    { id: "rules", label: "Gameplay Rules", href: game && `${game}?step=rules` },
    { id: "coupons", label: "Coupon Settings", href: game && `${game}?step=coupons` },
    { id: "landing", label: "Landing Page", href: `${campaign}?step=landing` },
    { id: "preview", label: "Preview", href: `${campaign}?step=preview` },
    { id: "review", label: "Final Review & Publish", href: `${campaign}?step=review` },
    { id: "public", label: "Customer URL", href: `${campaign}?step=public` },
  ];
  const index = steps.findIndex(step => step.id === current);
  const previous = steps[index - 1];
  const next = steps[index + 1];
  return <aside style={{ padding: 18, margin: "18px 0", border: "1px solid #e2e8f0", borderRadius: 12, background: "#f8fafc" }}>
    <strong>Campaign Builder</strong>
    <nav aria-label="Campaign builder steps" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
      {steps.map((step, number) => step.href ? <Link key={step.id} href={step.href} aria-current={current === step.id ? "step" : undefined} style={{ padding: "8px 10px", borderRadius: 8, fontSize: 12, textDecoration: "none", background: current === step.id ? "#111827" : "#fff", color: current === step.id ? "#fff" : "#475569", border: "1px solid #e2e8f0" }}>{number + 1}. {step.label}</Link> : <span key={step.id} style={{ padding: "8px 10px", fontSize: 12, color: "#94a3b8" }}>{number + 1}. {step.label}</span>)}
    </nav>
    <p style={{ fontSize: 12, color: "#64748b" }}>Save each section before continuing. Navigation does not save changes or publish your campaign.</p>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
      {previous?.href ? <Link className="secondary-btn" href={previous.href}>← {previous.label}</Link> : <Link className="secondary-btn" href="/admin/campaigns">Campaigns</Link>}
      {next?.href && <Link className="primary-btn" href={next.href}>Continue to {next.label} →</Link>}
    </div>
  </aside>;
}
