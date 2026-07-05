// AI Insights — the desktop app no longer holds any API key. It POSTs an
// already-aggregated, privacy-safe report summary to the Quoril backend, which
// keeps GROQ_API_KEY server-side and returns the structured coach readout.
//
// Only aggregated metrics leave the device (see buildSummary.ts) — never window
// titles, URLs, document names, or raw history.

import dotenv from 'dotenv'
import path from 'path'
import { app } from 'electron'

// Allow pointing at a local landing dev server via QUORIL_INSIGHTS_URL during
// development. Loaded lazily & once — index.ts doesn't call dotenv itself.
let envLoaded = false
function ensureEnv() {
    if (envLoaded) return
    try { dotenv.config({ path: path.join(app.getAppPath(), '.env') }) } catch { /* ignore */ }
    envLoaded = true
}

// Use the canonical www host directly — quoril.in issues a 308 redirect to
// www.quoril.in, which a POST fetch does not reliably re-issue, surfacing as
// "Could not reach the insights service" in the app.
const DEFAULT_INSIGHTS_URL = 'https://www.quoril.in/api/insights'

type InsightsResponse =
    | { ok: true; result: unknown; model: string }
    | { ok: false; error: string }

export async function generateInsights(summary: unknown): Promise<InsightsResponse> {
    ensureEnv()
    const url = process.env.QUORIL_INSIGHTS_URL || DEFAULT_INSIGHTS_URL

    let res: Response
    try {
        res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(summary),
        })
    } catch {
        return { ok: false, error: 'Could not reach the insights service. Check your connection.' }
    }

    let json: any
    try {
        json = await res.json()
    } catch {
        // Non-JSON error (e.g. a proxy/HTML error page).
        if (res.status === 429) return { ok: false, error: 'Rate limit reached. Try again in a minute.' }
        return { ok: false, error: `Insights service error (${res.status}). Try again shortly.` }
    }

    // The backend returns the same discriminated shape we expose to the renderer.
    if (json && json.ok === true && json.result && typeof json.model === 'string') {
        return { ok: true, result: json.result, model: json.model }
    }
    if (json && json.ok === false && typeof json.error === 'string') {
        return { ok: false, error: json.error }
    }

    return { ok: false, error: `Insights service error (${res.status}). Try again shortly.` }
}
