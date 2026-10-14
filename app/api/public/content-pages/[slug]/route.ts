import { NextResponse } from "next/server";
import { getPublicContent } from "../../../../../lib/public-content";
export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const result = await getPublicContent(slug);
  if (!result) return NextResponse.json({ error: "Page not found." }, { status: 404 });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
