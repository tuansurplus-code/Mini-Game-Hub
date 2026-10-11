"use client";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { DEFAULT_HOMEPAGE_CONTENT, resolveActiveTheme, type HomepageContent, type HomepageTypography, type ManagedPageSlug, type SeasonalTheme } from "../lib/homepage-content";

const FOOTER_PAGES: ManagedPageSlug[] = ["terms-and-conditions", "privacy-policy", "about-us", "contact-us"];
const gameMeta = {
  spin: { type: "SPIN & WIN", route: "spin" },
  scratch: { type: "SCRATCH & WIN", route: "scratch" },
  "pick-card": { type: "PICK A CARD", route: "pick-card" },
} as const;
function textStyle(t: HomepageTypography, heading = false): CSSProperties {
  return { fontFamily: t.fontFamily, fontSize: `${heading ? t.headlineSize : t.fontSize}px`, fontWeight: t.bold ? 800 : undefined, fontStyle: t.italic ? "italic" : undefined, textDecoration: t.underline ? "underline" : undefined, textAlign: t.alignment };
}
function SeasonalEffects({ preset }: { preset: SeasonalTheme["preset"] | undefined }) {
  if (!preset || preset === "custom") return null;
  return <div className={`seasonal-effects seasonal-effects-${preset}`} aria-hidden="true">
    {preset === "christmas" && <>
      <span className="seasonal-snow snow-one">❄</span><span className="seasonal-snow snow-two">❄</span><span className="seasonal-snow snow-three">❄</span><span className="seasonal-snow snow-four">❄</span><span className="seasonal-sleigh">🎅🛷</span>
    </>}
    {preset === "new-year" && <>
      <span className="seasonal-firework firework-one">✳</span><span className="seasonal-firework firework-two">✳</span><span className="seasonal-ribbon ribbon-one">〰</span><span className="seasonal-ribbon ribbon-two">〰</span><span className="seasonal-ribbon ribbon-three">〰</span>
    </>}
    {preset === "ramadan" && <>
      <span className="seasonal-moon">☾</span><span className="seasonal-star star-one">✦</span><span className="seasonal-star star-two">✦</span><span className="seasonal-lantern lantern-one">🏮</span><span className="seasonal-lantern lantern-two">🏮</span>
    </>}
    {preset === "wesak" && <>
      <span className="seasonal-wesak-lantern">🏮</span><span className="seasonal-lotus">🪷</span><span className="seasonal-temple">🛕</span><span className="seasonal-lamp">🪔</span>
    </>}
  </div>;
}
export default function Home() {
  const [signedIn, setSignedIn] = useState(false);
  const [content, setContent] = useState<HomepageContent>(DEFAULT_HOMEPAGE_CONTENT);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session?.user)));
    fetch("/api/public/homepage").then((r) => r.json()).then((result) => { if (result.content) setContent(result.content as HomepageContent); }).catch(() => undefined);
    setNow(new Date());
    return () => subscription.unsubscribe();
  }, []);
  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => {
    const error = params.get("error"); const errorCode = params.get("error_code"); const errorDescription = params.get("error_description");
    if (error || errorCode) { const query = new URLSearchParams(); if (error) query.set("error", error); if (errorCode) query.set("error_code", errorCode); if (errorDescription) query.set("error_description", errorDescription); router.replace(`/auth-error?${query.toString()}`); }
  }, [params, router]);
  const activeTheme = now ? resolveActiveTheme(content, now) : null;
  const colors = activeTheme ?? content.theme;
  const homeStyle = { "--home-primary": colors.primary, "--home-accent": colors.accent, "--home-hero": colors.heroBackground, "--home-bg": colors.pageBackground } as CSSProperties;
  const headerStyle = textStyle(content.typography.header);
  return <main className="home-public" data-season={activeTheme?.preset} style={homeStyle}><SeasonalEffects preset={activeTheme?.preset} />
    <header className="topbar" style={headerStyle}>
      <Link href="/" className="brand" aria-label="Mini Game Hub home">{content.header.showLogo && (content.header.logoUrl ? <img className="home-logo" src={content.header.logoUrl} alt="" /> : <span className="brandmark">M</span>)}{content.header.showBrand && <span>{content.header.brand}</span>}</Link>
      <nav aria-label="Main navigation">{signedIn ? <><Link className="nav" href="/admin">Dashboard</Link><Link className="nav" href="/admin/campaigns">Campaigns</Link><Link className="nav" href="/admin/games">Games</Link><Link className="nav" href="/admin/reports">Reports</Link><Link className="primary small" href="/admin/settings">Account</Link></> : <>{content.header.showHome && <Link className="nav active" href="/" aria-current="page">{content.header.navHome}</Link>}{content.header.showGames && <a className="nav" href="#games">{content.header.navGames}</a>}{content.header.showHow && <a className="nav" href="#how">{content.header.navHow}</a>}{content.header.showSignIn && <Link className="nav" href="/login">{content.header.navSignIn}</Link>}{content.header.showGetStarted && <Link className="primary small" href="/signup">{content.header.navGetStarted}</Link>}</>}</nav>
      {content.header.showAnnouncement && <div className="home-announcement">{activeTheme?.announcement || content.header.announcement}</div>}
    </header>
    {content.sections.showHero && <section className="hero" style={{ fontFamily: content.typography.hero.fontFamily, textAlign: content.typography.hero.alignment }}><div><div className="eyebrow">{content.hero.eyebrow}</div><h1 style={textStyle(content.typography.hero, true)}>{content.hero.title}<br /><span>{content.hero.highlight}</span></h1><p style={textStyle(content.typography.hero)}>{content.hero.description}</p><div className="hero-actions"><button className="primary" onClick={() => document.getElementById("games")?.scrollIntoView({ behavior: "smooth" })}>{content.hero.primaryCta} <b>→</b></button><button className="ghost" onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}>{content.hero.secondaryCta}</button></div></div><div className="hero-art"><div className="orbit one" /><div className="orbit two" /><div className="trophy">★</div><div className="floating f1">WIN</div><div className="floating f2">🎁</div></div></section>}
    {content.sections.showGames && <section id="games" className="games" style={{ fontFamily: content.typography.games.fontFamily, textAlign: content.typography.games.alignment }}><div className="section-head"><div><div className="eyebrow">{content.games.eyebrow}</div><h2 style={textStyle(content.typography.games, true)}>{content.games.title}</h2></div><span className="game-count">{content.games.description}</span></div><div className="grid" style={{ "--game-columns": content.games.columns } as CSSProperties}>{content.games.cards.map((card) => { const meta = gameMeta[card.id]; const seasonal = Boolean(activeTheme && activeTheme.preset !== "custom"); const cardText = seasonal ? "#26342d" : card.textColor; const cardArt = card.imageUrl ? `linear-gradient(#0002,#0002), url("${card.imageUrl}") center/cover` : seasonal ? `linear-gradient(135deg,color-mix(in srgb,var(--home-primary) 16%,#fff),color-mix(in srgb,var(--home-accent) 13%,#fff))` : card.color; return <article className="card home-game-card" key={card.id} style={{ minHeight: card.height, width: `${card.width}%`, borderRadius: card.cornerRadius, marginInline: "auto", background: seasonal ? "rgba(255,255,255,.94)" : card.color, color: cardText, border: seasonal ? "1px solid color-mix(in srgb,var(--home-primary) 20%,white)" : undefined, textAlign: card.textAlignment, fontFamily: content.typography.games.fontFamily }}><div className="game-visual" style={{ height: Math.max(110, Math.min(180, card.height * 0.55)), background: cardArt, color: seasonal && !card.imageUrl ? colors.primary : cardText, borderRadius: `${card.cornerRadius}px ${card.cornerRadius}px 0 0` }}>{!card.imageUrl && <span>{card.icon}</span>}<small>{meta.type}</small></div><div className="card-body"><h3 style={{ ...textStyle(content.typography.games, true), fontSize: Math.min(content.typography.games.headlineSize, 28), color: cardText }}>{card.title}</h3><p style={{ ...textStyle(content.typography.games), fontSize: content.typography.games.fontSize, color: seasonal ? "#58665d" : cardText }}>{card.description}</p><button className="play" style={{ background: colors.primary, color: "#fff" }} onClick={() => router.push(`/login?game=${meta.route}`)}>{card.action}<span>→</span></button></div></article>; })}</div></section>}
    {content.sections.showHow && <section id="how" className="how" style={{ fontFamily: content.typography.how.fontFamily, textAlign: content.typography.how.alignment }}><div><div className="eyebrow">{content.how.eyebrow}</div><h2 style={textStyle(content.typography.how, true)}>{content.how.title}</h2></div><div className="steps">{content.how.steps.map((step, index) => <div className="step" key={index}><b>{String(index + 1).padStart(2, "0")}</b><h3>{step.title}</h3><p>{step.description}</p></div>)}</div></section>}
    {content.sections.showFooter && <footer className="home-site-footer" style={textStyle(content.typography.footer)}><span>{content.footer.copyright}</span><nav className="home-footer-page-links" aria-label="Footer pages" style={{ justifyContent: content.footer.pageLinksAlignment }}>{FOOTER_PAGES.filter((slug) => content.pages[slug].showInFooter).map((slug) => <Link key={slug} href={`/${slug}`}>{content.pages[slug].title}</Link>)}</nav></footer>}
  </main>;
}
