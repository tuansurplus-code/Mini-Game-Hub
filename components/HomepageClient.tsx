"use client";
import { useEffect, useState, type ReactNode } from "react";
import HomepageView from "./HomepageView";
import { CUSTOMER_SESSION_KEY } from "../lib/auth-session";
import type { HomepageContent, HomepagePlan, HomepageSiteTheme } from "../lib/homepage-content";

type Props = { content: HomepageContent; pageKind: string; plans: HomepagePlan[]; siteTheme?: HomepageSiteTheme; children?: ReactNode };
export default function HomepageClient({ content, pageKind, plans, siteTheme, children }: Props) {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    const update = () => document.documentElement.toggleAttribute("data-page-hidden", document.hidden);
    update(); document.addEventListener("visibilitychange", update);
    return () => { document.removeEventListener("visibilitychange", update); document.documentElement.removeAttribute("data-page-hidden"); };
  }, []);
  useEffect(() => {
    // Anonymous visitors don't need to download the authentication SDK.
    if (!document.cookie.split(";").some(cookie => cookie.trim().startsWith(CUSTOMER_SESSION_KEY))) return;
    let active = true;
    let unsubscribe: (() => void) | undefined;
    import("../lib/supabase").then(({ supabase }) => {
      if (!active) return;
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (active) setSignedIn(Boolean(session?.user));
      });
      unsubscribe = () => subscription.unsubscribe();
    }).catch(() => undefined);
    return () => { active = false; unsubscribe?.(); };
  }, []);
  return <><HomepageView content={content} kind={pageKind} signedIn={signedIn} plans={plans} siteTheme={siteTheme}/>{children}</>;
}
