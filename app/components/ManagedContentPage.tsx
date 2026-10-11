"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ManagedPage, ManagedPageSlug } from "../../lib/homepage-content";

type PublicContentPageProps = { slug: ManagedPageSlug };

export default function PublicContentPage({ slug }: PublicContentPageProps) {
  const [page, setPage] = useState<ManagedPage | null>(null);
  const [status, setStatus] = useState("Loading page…");

  useEffect(() => {
    let active = true;
    fetch("/api/public/homepage")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.content?.pages?.[slug]) throw new Error("This page is not available yet.");
        if (active) {
          setPage(result.content.pages[slug] as ManagedPage);
          setStatus("");
        }
      })
      .catch((error: unknown) => {
        if (active) setStatus(error instanceof Error ? error.message : "Unable to load this page.");
      });
    return () => { active = false; };
  }, [slug]);

  return <main className="public-content-page">
    <article className="public-content-shell">
      <Link className="public-content-back" href="/">← Back to Mini Game Hub</Link>
      {page ? <>
        <p className="public-content-brand">Mini Game Hub</p>
        <h1>{page.title}</h1>
        {page.body ? <div className="public-content-copy">{page.body}</div> : <p className="public-content-empty">This page is being prepared.</p>}
      </> : <p className="public-content-empty" role="status">{status}</p>}
    </article>
  </main>;
}
