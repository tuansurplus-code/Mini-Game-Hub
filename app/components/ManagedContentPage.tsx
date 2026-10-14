import PublicContentView from "./PublicContentView";
type LegacySlug = "terms-and-conditions" | "privacy-policy" | "about-us" | "contact-us";
const slugs: Record<LegacySlug, string> = { "terms-and-conditions": "terms", "privacy-policy": "privacy", "about-us": "about", "contact-us": "contact" };
export default function ManagedContentPage({ slug }: { slug: LegacySlug }) { return <PublicContentView slug={slugs[slug]}/>; }
