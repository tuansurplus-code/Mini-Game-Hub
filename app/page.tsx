"use client";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { DEFAULT_HOMEPAGE_CONTENT, resolveActiveTheme, type HomepageContent } from "../lib/homepage-content";

const games = [
  { id: "spin", type: "SPIN & WIN", title: "Spin the Wheel", desc: "Spin the wheel and discover your reward.", accent: "red", icon: "↻", action: "Spin Now" },
  { id: "scratch", type: "SCRATCH & WIN", title: "Scratch & Reveal", desc: "Scratch your card to reveal a surprise.", accent: "purple", icon: "✦", action: "Play Now" },
  { id: "pick-card", type: "PICK A CARD", title: "Pick Your Reward", desc: "Choose one card. One reward is waiting.", accent: "teal", icon: "◆", action: "Pick Now" },
];

export default function Home() {
  const [signedIn, setSignedIn] = useState(false);
  const [content, setContent] = useState<HomepageContent>(DEFAULT_HOMEPAGE_CONTENT);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session?.user)));
    fetch("/api/public/homepage").then((response) => response.json()).then((result) => {
      if (result.content) setContent(result.content as HomepageContent);
    }).catch(() => undefined);
    setNow(new Date());
    return () => subscription.unsubscribe();
  }, []);
  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => {
    const error = params.get("error");
    const errorCode = params.get("error_code");
    const errorDescription = params.get("error_description");
    if (error || errorCode) {
      const query = new URLSearchParams();
      if (error) query.set("error", error);
      if (errorCode) query.set("error_code", errorCode);
      if (errorDescription) query.set("error_description", errorDescription);
      router.replace(`/auth-error?${query.toString()}`);
    }
  }, [params, router]);

  const activeTheme = now ? resolveActiveTheme(content, now) : null;
  const colors = activeTheme ?? content.theme;
  const announcement = activeTheme?.announcement || content.header.announcement;
  const showAnnouncement = Boolean(activeTheme?.announcement) || content.header.showAnnouncement;
  const homeStyle = {
    "--home-primary": colors.primary,
    "--home-accent": colors.accent,
    "--home-hero": colors.heroBackground,
    "--home-bg": colors.pageBackground,
  } as CSSProperties;

  return <main className="home-public" style={homeStyle}>
    <header className="topbar">
      <Link href="/" className="brand" aria-label="Mini Game Hub home"><span className="brandmark">M</span><span>{content.header.brand}</span></Link>
      <nav aria-label="Main navigation">{signedIn ? <><Link className="nav" href="/admin">Dashboard</Link><Link className="nav" href="/admin/campaigns">Campaigns</Link><Link className="nav" href="/admin/games">Games</Link><Link className="nav" href="/admin/reports">Reports</Link><Link className="primary small" href="/admin/settings">Account</Link></> : <><Link className="nav active" href="/" aria-current="page">Home</Link><a className="nav" href="#games">Games</a><a className="nav" href="#how">How It Works</a><Link className="nav" href="/login">Sign In</Link><Link className="primary small" href="/signup">Get Started</Link></>}</nav>
      {showAnnouncement && <div className="home-announcement">{announcement}</div>}
    </header>
    <section className="hero"><div><div className="eyebrow">{content.hero.eyebrow}</div><h1>{content.hero.title}<br /><span>{content.hero.highlight}</span></h1><p>{content.hero.description}</p><div className="hero-actions"><button className="primary" onClick={() => document.getElementById("games")?.scrollIntoView({ behavior: "smooth" })}>{content.hero.primaryCta} <b>→</b></button><button className="ghost" onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}>{content.hero.secondaryCta}</button></div></div><div className="hero-art"><div className="orbit one" /><div className="orbit two" /><div className="trophy">★</div><div className="floating f1">WIN</div><div className="floating f2">🎁</div></div></section>
    <section id="games" className="games"><div className="section-head"><div><div className="eyebrow">{content.games.eyebrow}</div><h2>{content.games.title}</h2></div><span className="game-count">{content.games.description}</span></div><div className="grid">{games.map((game, index) => { const card = content.games.cards[index]; return <article className="card" key={game.type}><div className={"game-visual " + game.accent}><span>{game.icon}</span><small>{game.type}</small></div><div className="card-body"><h3>{card.title}</h3><p>{card.description}</p><button className={"play " + game.accent} onClick={() => router.push(`/login?game=${game.id}`)}>{card.action}<span>→</span></button></div></article>; })}</div></section>
    <section id="how" className="how"><div><div className="eyebrow">{content.how.eyebrow}</div><h2>{content.how.title}</h2></div><div className="steps">{content.how.steps.map((step, index) => <div className="step" key={index}><b>{String(index + 1).padStart(2, "0")}</b><h3>{step.title}</h3><p>{step.description}</p></div>)}</div></section>
    <footer><span>{content.footer.copyright}</span><span>{content.footer.termsLabel}</span><span>{content.footer.privacyLabel}</span></footer>
  </main>;
}
