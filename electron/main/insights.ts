// AI Insights — runs ONLY in the main process so GROQ_API_KEY never reaches the
// renderer. Renderer sends an already-aggregated, privacy-safe summary; we ask a
// cheap Groq model to turn it into a short productivity-coach readout.
//
// Groq exposes an OpenAI-compatible REST endpoint, so we use raw fetch (Node 18+
// has global fetch) — no SDK dependency, matching the app's raw-REST convention.

import dotenv from 'dotenv'
import path from 'path'
import { app } from 'electron'

// GROQ_API_KEY has no VITE_ prefix, so it's only readable here (never bundled into
// the renderer). Load .env lazily & once — index.ts doesn't call dotenv itself.
let envLoaded = false
function ensureEnv() {
    if (envLoaded) return
    try { dotenv.config({ path: path.join(app.getAppPath(), '.env') }) } catch { /* ignore */ }
    envLoaded = true
}

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
// Free-tier-eligible on Groq's dev tier; kept as a single swappable constant.
const MODEL = 'openai/gpt-oss-20b'

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
}`

type InsightsResponse =
    | { ok: true; result: unknown; model: string }
    | { ok: false; error: string }

export async function generateInsights(summary: unknown): Promise<InsightsResponse> {
    ensureEnv()
    const key = process.env.GROQ_API_KEY
    if (!key) {
        return { ok: false, error: 'AI insights are not configured (missing GROQ_API_KEY).' }
    }

    let res: Response
    try {
        res = await fetch(GROQ_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify({
                model: MODEL,
                temperature: 0.4,
                max_tokens: 1200,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: `Here is my report data as JSON:\n${JSON.stringify(summary)}` },
                ],
            }),
        })
    } catch (e: any) {
        return { ok: false, error: `Could not reach the insights service. Check your connection.` }
    }

    if (res.status === 429) {
        return { ok: false, error: 'Rate limit reached. Try again in a minute.' }
    }
    if (!res.ok) {
        return { ok: false, error: `Insights service error (${res.status}). Try again shortly.` }
    }

    let json: any
    try {
        json = await res.json()
    } catch {
        return { ok: false, error: 'Got an unreadable response from the insights service.' }
    }

    const content: string | undefined = json?.choices?.[0]?.message?.content
    if (!content) {
        return { ok: false, error: 'The insights service returned an empty response.' }
    }

    let result: any
    try {
        result = JSON.parse(content)
    } catch {
        return { ok: false, error: 'Could not parse the insights. Try regenerating.' }
    }

    if (!result || typeof result.summary !== 'string' || !Array.isArray(result.insights)) {
        return { ok: false, error: 'The insights came back in an unexpected format. Try regenerating.' }
    }

    return { ok: true, result, model: MODEL }
}
