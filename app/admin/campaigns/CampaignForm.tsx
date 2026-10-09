import Link from "next/link";

export default function CampaignForm() {
  return <Link href="/admin/campaigns/new" className="primary-btn">+ New Campaign</Link>;
}
