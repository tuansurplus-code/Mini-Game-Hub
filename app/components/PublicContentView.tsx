import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { getPublicContent, type ContactField } from "../../lib/public-content";
import ContactForm from "../../components/ContactForm";
export default async function PublicContentView({ slug }: { slug: string }) {
  const result = await getPublicContent(slug);
  if (!result) notFound();
  const { page, theme } = result;
  return <main className="public-content-page" style={{ background: theme.colors.pageBackground, fontFamily: theme.fonts.body }}>
    <header><Link href="/" className="brand">MINI GAME HUB</Link><Link href="/">Home</Link></header>
    <article style={{ "--content-primary": theme.colors.primary, "--content-hero": "#142044" } as CSSProperties}>
      <div className="eyebrow">MINI GAME HUB</div><h1>{page.title}</h1>
      <div className="public-content-body" dangerouslySetInnerHTML={{ __html: page.published.body }}/>
      {slug === "contact" && <ContactForm fields={(page.published.fields ?? []) as ContactField[]}/>}
    </article><footer style={{ background: theme.colors.footerBackground }}>© 2026 Mini Game Hub</footer>
  </main>;
}
