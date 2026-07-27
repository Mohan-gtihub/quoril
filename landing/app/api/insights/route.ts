import { NextResponse } from "next/server";

// AI Insights proxy — the GROQ_API_KEY lives ONLY here (server-side, set in the
// landing project's environment), so it never ships inside the desktop app.
// The Quoril app POSTs an already-aggregated, privacy-safe report summary; we
// ask a cheap Groq model to turn it into a short productivity-coach readout.
//
// Groq exposes an OpenAI-compatible REST endpoint, so we use raw fetch — no SDK
// dependency, matching the app's raw-REST convention.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// Free-tier-eligible on Groq's dev tier; kept as a single swappable constant.
const MODEL = "openai/gpt-oss-20b";

const SYSTEM_PROMPT = `You are Quoril, a sharp personal-productivity coach embedded in a focus app.
You are given ONE day/period of a single user's own aggregated work metrics (no raw history).
Interpret the numbers and give specific, actionable guidance — never generic filler like
"stay focused" or "take breaks".

Rules:
- Ground every insight in the actual numbers provided (cite the metric).
- Cover, when the data supports it: what went well, what hurt productivity, attention leaks,
  task/time mismatch, and a concrete plan for tomorrow.
- Be concise and human. Second person ("you"). No markdown, no emojis.
- If a metric is 0 or missing, don't invent it.

Return STRICT JSON only, matching exactly this shape:
{
  "summary": string,                        // one or two sentences
  "insights": [                             // 2 to 4 items
    { "title": string, "detail": string, "suggestion": string }
  ],
  "tomorrow_plan": [ string, string, string ]  // 2 to 4 short actions
}`;

export async function POST(req: Request) {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return NextResponse.json(
      { ok: false, error: "AI insights are not configured on the server." },
      { status: 503 },
    );
  }

  let summary: unknown;
  try {
    summary = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  let res: Response;
  try {
    res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Here is my report data as JSON:\n${JSON.stringify(summary)}`,
          },
        ],
      }),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not reach the insights service. Try again shortly." },
      { status: 502 },
    );
  }

  if (res.status === 429) {
    return NextResponse.json(
      { ok: false, error: "Rate limit reached. Try again in a minute." },
      { status: 429 },
    );
  }
  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: `Insights service error (${res.status}). Try again shortly.` },
      { status: 502 },
    );
  }

  let json: any;
  try {
    json = await res.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Got an unreadable response from the insights service." },
      { status: 502 },
    );
  }

  const content: string | undefined = json?.choices?.[0]?.message?.content;
  if (!content) {
    return NextResponse.json(
      { ok: false, error: "The insights service returned an empty response." },
      { status: 502 },
    );
  }

  let result: any;
  try {
    result = JSON.parse(content);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not parse the insights. Try regenerating." },
      { status: 502 },
    );
  }

  if (!result || typeof result.summary !== "string" || !Array.isArray(result.insights)) {
    return NextResponse.json(
      { ok: false, error: "The insights came back in an unexpected format. Try regenerating." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, result, model: MODEL });
}
