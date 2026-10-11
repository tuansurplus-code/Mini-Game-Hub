import { NextResponse } from "next/server";
import { POST as submitContact } from "../contact-submissions/route";

export async function POST(request: Request) {
  let body: { website?: unknown };
  try { body = await request.clone().json(); } catch { return NextResponse.json({ error: "Invalid form submission." }, { status: 400 }); }
  if (typeof body.website === "string" && body.website.trim()) return NextResponse.json({ sent: true });
  return submitContact(request);
}
