"use client";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { DEFAULT_HOMEPAGE_CONTENT, getTemplateArtworkStyle, type HomepageContent, type HomepageTypography } from "../lib/homepage-content";
const gameMeta = {
  spin: { type: "SPIN & WIN", route: "spin" },
  scratch: { type: "SCRATCH & WIN", route: "scratch" },
  "pick-card": { type: "PICK A CARD", route: "pick-card" },
} as const;
function textStyle(t: HomepageTypography, heading = false): CSSProperties {
  return { fontFamily: t.fontFamily, fontSize: `${heading ? t.headlineSize : t.fontSize}px`, fontWeight: t.bold ? 800 : undefined, fontStyle: t.italic ? "italic" : undefined, textDecoration: t.underline ? "underline" : undefined, textAlign: t.alignment };
}
export default function Home() {
  const [signedIn, setSignedIn] = useState(false);
  const [content, setContent] = useState<HomepageContent>(DEFAULT_HOMEPAGE_CONTENT);
  const [pageKind, setPageKind] = useState("custom");
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session?.user)));
    fetch("/api/public/homepage").then((r) => r.json()).then((result) => {
      if (result.content) setContent(result.content as HomepageContent);
      if (result.pageKind) setPageKind(result.pageKind);
      const containerId = result.analytics?.gtmEnabled === true && typeof result.analytics.gtmContainerId === "string" ? result.analytics.gtmContainerId : "";
      if (!/^GTM-[A-Z0-9]+$/.test(containerId) || document.querySelector(`script[data-mini-game-hub-gtm="${containerId}"]`)) return;
      const dataLayerWindow = window as Window & { dataLayer?: Array<Record<string, unknown>> };
      dataLayerWindow.dataLayer = dataLayerWindow.dataLayer ?? [];
      dataLayerWindow.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
      const script = document.createElement("script");
      script.async = true;
      script.dataset.miniGameHubGtm = containerId;
      script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(containerId)}`;
      document.head.appendChild(script);
    }).catch(() => undefined);
    return () => subscription.unsubscribe();
  }, []);
  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => {
    const error = params.get("error"); const errorCode = params.get("error_code"); const errorDescription = params.get("error_description");
    if (error || errorCode) { const query = new URLSearchParams(); if (error) query.set("error", error); if (errorCode) query.set("error_code", errorCode); if (errorDescription) query.set("error_description", errorDescription); router.replace(`/auth-error?${query.toString()}`); }
  }, [params, router]);
  const colors = content.theme;
  const homeStyle = { "--home-primary": colors.primary, "--home-accent": colors.accent, "--home-hero": colors.heroBackground, "--home-bg": colors.pageBackground } as CSSProperties;
  const headerStyle = textStyle(content.typography.header);
  return <main className={`home-public home-template-${pageKind}`} style={homeStyle}>
    <header className="topbar" style={headerStyle}>
      <Link href="/" className="brand" aria-label="Mini Game Hub home">{content.header.showLogo && (content.header.logoUrl ? <img className="home-logo" src={content.header.logoUrl} alt="" /> : <span className="brandmark">M</span>)}{content.header.showBrand && <span>{content.header.brand}</span>}</Link>
      <nav aria-label="Main navigation">{signedIn ? <><Link className="nav" href="/admin">Dashboard</Link><Link className="nav" href="/admin/campaigns">Campaigns</Link><Link className="nav" href="/admin/games">Games</Link><Link className="nav" href="/admin/reports">Reports</Link><Link className="primary small" href="/admin/settings">Account</Link></> : <>{content.header.showHome && <Link className="nav active" href="/" aria-current="page">{content.header.navHome}</Link>}{content.header.showGames && <a className="nav" href="#games">{content.header.navGames}</a>}{content.header.showHow && <a className="nav" href="#how">{content.header.navHow}</a>}{content.header.showSignIn && <Link className="nav" href="/login">{content.header.navSignIn}</Link>}{content.header.showGetStarted && <Link className="primary small" href="/signup">{content.header.navGetStarted}</Link>}</>}</nav>
      {content.header.showAnnouncement && <div className="home-announcement">{content.header.announcement}</div>}
    </header>
    <div className="home-template-backdrop">
    {content.sections.showHero && <section className="hero" style={{ fontFamily: content.typography.hero.fontFamily, textAlign: content.typography.hero.alignment }}><div><div className="eyebrow">{content.hero.eyebrow}</div><h1 style={textStyle(content.typography.hero, true)}>{content.hero.title}<br /><span>{content.hero.highlight}</span></h1><p style={textStyle(content.typography.hero)}>{content.hero.description}</p><div className="hero-actions"><button className="primary" onClick={() => document.getElementById("games")?.scrollIntoView({ behavior: "smooth" })}>{content.hero.primaryCta} <b>→</b></button><button className="ghost" onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}>{content.hero.secondaryCta}</button></div></div><div className={`hero-art ${content.hero.backgroundImageUrl ? "has-template-art" : ""}`}>{content.hero.backgroundImageUrl ? (getTemplateArtworkStyle(content.hero.backgroundImageUrl) ? <div className="hero-art-template" style={getTemplateArtworkStyle(content.hero.backgroundImageUrl)!} aria-hidden="true" /> : <img className="hero-art-image" src={content.hero.backgroundImageUrl} alt="" />) : <><div className="orbit one" /><div className="orbit two" /><div className="trophy">★</div><div className="floating f1">WIN</div><div className="floating f2">🎁</div></>}</div></section>}
    {content.sections.showGames && <section id="games" className="games" style={{ fontFamily: content.typography.games.fontFamily, textAlign: content.typography.games.alignment }}><div className="section-head"><div><div className="eyebrow">{content.games.eyebrow}</div><h2 style={textStyle(content.typography.games, true)}>{content.games.title}</h2></div><span className="game-count">{content.games.description}</span></div><div className="grid" style={{ "--game-columns": content.games.columns } as CSSProperties}>{content.games.cards.map((card) => {
  const meta = gameMeta[card.id];
  const artwork = getTemplateArtworkStyle(card.imageUrl);
  const containedTemplateArtwork = (pageKind === "wesak" || pageKind === "ramadan") && Boolean(artwork);
  const cropSize = artwork?.aspectRatio?.split("/").map(Number);
  const cropWidth = cropSize?.[0] && cropSize?.[1] ? 205 * cropSize[0] / cropSize[1] : undefined;
  return <article className="card home-game-card" key={card.id} style={{ minHeight: card.height, width: `${card.width}%`, borderRadius: card.cornerRadius, marginInline: "auto", background: card.color, color: card.textColor, textAlign: card.textAlignment, fontFamily: content.typography.games.fontFamily }}><div className={`game-visual${containedTemplateArtwork ? " game-visual-contained" : ""}`} style={{ height: artwork ? "auto" : Math.max(110, Math.min(220, card.imageUrl.startsWith("/template-previews/") ? card.height * 0.8 : card.height * 0.55)), background: card.imageUrl && !artwork ? `linear-gradient(#0002,#0002), url("${card.imageUrl}") center/cover` : card.color, ...(containedTemplateArtwork ? {} : (artwork ?? {})), borderRadius: `${card.cornerRadius}px ${card.cornerRadius}px 0 0` }}>{containedTemplateArtwork && cropWidth ? <div className="game-visual-art" style={{ ...artwork, width: `${cropWidth}px`, height: "100%" }} aria-hidden="true" /> : null}{!card.imageUrl && <span>{card.icon}</span>}<small>{meta.type}</small></div><div className="card-body"><h3 style={{ ...textStyle(content.typography.games, true), fontSize: Math.min(content.typography.games.headlineSize, 28), color: card.textColor }}>{card.title}</h3><p style={{ ...textStyle(content.typography.games), fontSize: content.typography.games.fontSize, color: card.textColor }}>{card.description}</p><button className="play" style={{ background: colors.primary, color: "#fff" }} onClick={() => router.push(`/login?game=${meta.route}`)}>{card.action}<span>→</span></button></div></article>; })}</div></section>}
    {content.sections.showHow && <section id="how" className="how" style={{ fontFamily: content.typography.how.fontFamily, textAlign: content.typography.how.alignment }}><div><div className="eyebrow">{content.how.eyebrow}</div><h2 style={textStyle(content.typography.how, true)}>{content.how.title}</h2></div><div className="steps">{content.how.steps.map((step, index) => <div className="step" key={index}><b>{String(index + 1).padStart(2, "0")}</b><h3>{step.title}</h3><p>{step.description}</p></div>)}</div></section>}
    {content.sections.showFooter && <footer style={{ ...textStyle(content.typography.footer), textAlign: content.footer.alignment }}><span>{content.footer.copyright}</span>{content.footer.pages.filter(page => page.enabled).map(page => <Link key={page.slug} href={`/content/${page.slug}`}>{page.label}</Link>)}</footer>}
    {pageKind !== "custom" && <div className={`home-seasonal-decoration ${pageKind}`} aria-hidden="true"><span className="seasonal-spark one"/><span className="seasonal-spark two"/><span className="seasonal-motif">{pageKind === "christmas" ? "❄" : pageKind === "ramadan" ? "☾" : pageKind === "wesak" ? "🏮" : "✦"}</span>{pageKind === "christmas" && <span className="seasonal-santa"><img src="/template-previews/christmas-sleigh.png" alt="" /></span>}{pageKind === "christmas" && ["pine-left","pine-right"].map((crop) => <span key={crop} className={`seasonal-pine ${crop}`} style={getTemplateArtworkStyle(`/template-previews/christmas.svg?crop=${crop}`) ?? undefined} />)}{pageKind === "christmas" && Array.from({length:22},(_,index) => { const flakePositions=[3,13,25,34,46,57,68,79,91,7,19,29,41,53,64,74,85,97,11,37,61,88]; const left=flakePositions[index]; const duration=9+(index*7%13); const delay=-(index*11%19); const size=13+(index*9%16); return <span key={index} className="seasonal-flake" style={{left:`${left}%`,animationDuration:`${duration}s`,animationDelay:`${delay}s`,width:`${size}px`,height:`${size}px`,color:"#78c4dc",opacity:.52+(index%4)*.1}}><svg viewBox="0 0 100 100" aria-hidden="true"><g><path d="M50 50V8 M50 8 44 17 M50 8 56 17 M50 20 39 31 M50 20 61 31 M50 34 43 32 M50 34 57 32"/><path d="M50 50V8 M50 8 44 17 M50 8 56 17 M50 20 39 31 M50 20 61 31 M50 34 43 32 M50 34 57 32" transform="rotate(60 50 50)"/><path d="M50 50V8 M50 8 44 17 M50 8 56 17 M50 20 39 31 M50 20 61 31 M50 34 43 32 M50 34 57 32" transform="rotate(120 50 50)"/><path d="M50 50V8 M50 8 44 17 M50 8 56 17 M50 20 39 31 M50 20 61 31 M50 34 43 32 M50 34 57 32" transform="rotate(180 50 50)"/><path d="M50 50V8 M50 8 44 17 M50 8 56 17 M50 20 39 31 M50 20 61 31 M50 34 43 32 M50 34 57 32" transform="rotate(240 50 50)"/><path d="M50 50V8 M50 8 44 17 M50 8 56 17 M50 20 39 31 M50 20 61 31 M50 34 43 32 M50 34 57 32" transform="rotate(300 50 50)"/></g><circle cx="50" cy="50" r="5" fill="#fff"/></svg></span>})}</div>}
    </div>
  </main>;
}
