import { NextResponse } from "next/server";
import { getPublicHomepage } from "../../../../lib/public-homepage";

export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json(await getPublicHomepage(), { headers: { "Cache-Control": "no-store, max-age=0" } });
}
