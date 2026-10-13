"use client";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import HomepageView from "../components/HomepageView";
import ChristmasSleigh from "../components/ChristmasSleigh";
import { supabase } from "../lib/supabase";
import { DEFAULT_HOMEPAGE_CONTENT, getTemplateArtworkStyle, type HomepageContent, type HomepageTypography, type HomepagePlan, type HomepageSiteTheme } from "../lib/homepage-content";
export default function Home() {
  const [plans, setPlans] = useState<HomepagePlan[]>([]);
  const [siteTheme, setSiteTheme] = useState<HomepageSiteTheme | undefined>();
  const [signedIn, setSignedIn] = useState(false);
  const [content, setContent] = useState<HomepageContent>(() => ({ ...DEFAULT_HOMEPAGE_CONTENT, games: { ...DEFAULT_HOMEPAGE_CONTENT.games, cards: [] } }));
  const [pageKind, setPageKind] = useState("custom");
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session?.user)));
    fetch("/api/public/homepage").then((r) => r.json()).then((result) => {
      if (result.content) setContent(result.content as HomepageContent);
      setPlans(result.plans ?? []); setSiteTheme(result.siteTheme);
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
  return <><HomepageView content={content} kind={pageKind} signedIn={signedIn} plans={plans} siteTheme={siteTheme}/><div className={`home-public home-template-${pageKind} mgh-effects`}>
    {pageKind === "new-year" && <div className="home-seasonal-decoration new-year-ribbons" aria-hidden="true">{Array.from({ length: 26 }, (_, index) => {
      // Stable varied values avoid hydration mismatches and spread ribbons across the viewport.
      const seed = ((index + 1) * 2654435761) >>> 0;
      const color = ["#ee4d9a", "#16bde7", "#ffbb24", "#8150ee", "#52c736", "#ef6842"][seed % 6];
      return <span key={index} className="seasonal-ribbon" style={{ left: `${seed % 100}%`, width: `${12 + seed % 15}px`, height: `${30 + seed % 35}px`, animationDuration: `${10 + seed % 13}s`, animationDelay: `${-(seed % 230) / 10}s`, "--ribbon-drift": `${(seed % 121) - 60}px`, "--ribbon-turn": `${seed % 360}deg` } as CSSProperties}><svg viewBox="0 0 32 72" fill="none"><path d="M9 2C36 12 0 22 18 34S36 49 10 68" stroke={color} strokeWidth="6" strokeLinecap="butt"/><path d="M9 2C36 12 0 22 18 34S36 49 10 68" stroke="#fff" strokeOpacity=".25" strokeWidth="2"/></svg></span>;
    })}</div>}

    {pageKind !== "custom" && <div className={`home-seasonal-decoration ${pageKind}`} aria-hidden="true"><span className="seasonal-spark one"/><span className="seasonal-spark two"/><span className="seasonal-motif">{pageKind === "christmas" ? "❄" : pageKind === "ramadan" ? "☾" : pageKind === "wesak" ? "🏮" : "✦"}</span>{pageKind === "christmas" && <ChristmasSleigh/>}{pageKind === "christmas" && ["pine-left","pine-right"].map((crop) => <span key={crop} className={`seasonal-pine ${crop}`} style={getTemplateArtworkStyle(`/template-previews/christmas.svg?crop=${crop}`) ?? undefined} />)}{pageKind === "christmas" && Array.from({length:22},(_,index) => { const flakePositions=[3,13,25,34,46,57,68,79,91,7,19,29,41,53,64,74,85,97,11,37,61,88]; const left=flakePositions[index]; const duration=9+(index*7%13); const delay=-(index*11%19); const size=13+(index*9%16); return <span key={index} className="seasonal-flake" style={{left:`${left}%`,animationDuration:`${duration}s`,animationDelay:`${delay}s`,width:`${size}px`,height:`${size}px`,color:"#78c4dc",opacity:.52+(index%4)*.1}}><svg viewBox="0 0 100 100" aria-hidden="true"><g><path d="M50 50V8 M50 8 44 17 M50 8 56 17 M50 20 39 31 M50 20 61 31 M50 34 43 32 M50 34 57 32"/><path d="M50 50V8 M50 8 44 17 M50 8 56 17 M50 20 39 31 M50 20 61 31 M50 34 43 32 M50 34 57 32" transform="rotate(60 50 50)"/><path d="M50 50V8 M50 8 44 17 M50 8 56 17 M50 20 39 31 M50 20 61 31 M50 34 43 32 M50 34 57 32" transform="rotate(120 50 50)"/><path d="M50 50V8 M50 8 44 17 M50 8 56 17 M50 20 39 31 M50 20 61 31 M50 34 43 32 M50 34 57 32" transform="rotate(180 50 50)"/><path d="M50 50V8 M50 8 44 17 M50 8 56 17 M50 20 39 31 M50 20 61 31 M50 34 43 32 M50 34 57 32" transform="rotate(240 50 50)"/><path d="M50 50V8 M50 8 44 17 M50 8 56 17 M50 20 39 31 M50 20 61 31 M50 34 43 32 M50 34 57 32" transform="rotate(300 50 50)"/></g><circle cx="50" cy="50" r="5" fill="#fff"/></svg></span>})}</div>}
</div></>;
}
