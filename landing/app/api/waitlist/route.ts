import { NextResponse } from "next/server";
import { addSignup, countSignups, EMAIL_RE } from "@/lib/waitlist";

// File I/O — must run on Node, not the edge runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const count = await countSignups();
  return NextResponse.json({ count });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { email, role, platform } =
    (body as { email?: string; role?: string; platform?: string }) ?? {};

  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 422 },
    );
  }

  try {
    const result = await addSignup({
      email,
      role: typeof role === "string" ? role.slice(0, 60) : undefined,
      platform: typeof platform === "string" ? platform.slice(0, 30) : undefined,
      referrer: req.headers.get("referer") ?? undefined,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      duplicate: result.duplicate ?? false,
      count: result.count,
    });
  } catch (err) {
    console.error("waitlist write failed", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
