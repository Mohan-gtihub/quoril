// Persistent cache for AI report insights, keyed per report range.
// Survives app restarts (localStorage) so a generated result shows continuously
// without re-calling the model, and backs the per-range 6h regenerate cooldown.
import type { InsightsResult } from './types'

export const REGEN_COOLDOWN_MS = 6 * 60 * 60 * 1000 // 6 hours

export interface CachedInsights {
    result: InsightsResult
    model: string
    generatedAt: number // epoch ms
}

const keyFor = (cacheKey: string) => `quoril.insights.${cacheKey}`

export function loadInsights(cacheKey: string): CachedInsights | null {
    try {
        const raw = localStorage.getItem(keyFor(cacheKey))
        if (!raw) return null
        const parsed = JSON.parse(raw) as Partial<CachedInsights>
        if (!parsed || typeof parsed.generatedAt !== 'number' || !parsed.result) return null
        return parsed as CachedInsights
    } catch {
        return null
    }
}

export function saveInsights(cacheKey: string, entry: CachedInsights): void {
    try {
        localStorage.setItem(keyFor(cacheKey), JSON.stringify(entry))
    } catch {
        /* quota / unavailable — cache is best-effort */
    }
}

/** ms remaining until regeneration is allowed again; 0 if eligible now. */
export function msUntilRegenEligible(generatedAt: number | null, now = Date.now()): number {
    if (generatedAt == null) return 0
    return Math.max(0, generatedAt + REGEN_COOLDOWN_MS - now)
}

export function isRegenEligible(generatedAt: number | null, now = Date.now()): boolean {
    return msUntilRegenEligible(generatedAt, now) === 0
}

/** Compact human label for a remaining duration, e.g. "3h 21m" or "4m". */
export function formatCooldown(ms: number): string {
    const totalMin = Math.ceil(ms / 60000)
    const h = Math.floor(totalMin / 60)
    const m = totalMin % 60
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
}
