// Bounded AI explanation for a day-fit plan. The remote model receives ONLY five
// aggregate integers — never task titles, notes, or calendar content — and its
// reply is validated to contain no numbers outside that payload. Any failure
// falls back to a deterministic, hand-written explanation, so the strip is never
// blank and can never surface an invented figure. Mirrors Swift's
// PlanningExplanationService.

import type { DayFitAnalysis } from './dayFitAnalyzer'
import { platform } from '@/services/platform'

export interface PlanningExplanationInput {
    plannedMinutes: number
    capacityMinutes: number
    openWindowCount: number
    proposedBlockCount: number
    adjustmentPercent: number
}

const MAX_LENGTH = 240

export function toExplanationInput(analysis: DayFitAnalysis): PlanningExplanationInput {
    return {
        plannedMinutes: analysis.plannedMinutes,
        capacityMinutes: analysis.capacityMinutes,
        openWindowCount: analysis.freeWindows.length,
        proposedBlockCount: analysis.proposals.length,
        adjustmentPercent: Math.round(analysis.adjustmentFactor * 100),
    }
}

/** Deterministic, always-safe explanation. Never contains an unknown number. */
export function localExplanation(input: PlanningExplanationInput): string {
    const difference = input.capacityMinutes - input.plannedMinutes
    if (difference < 0) {
        return `Your commitments need more time than today has open. Quoril found ${input.proposedBlockCount} blocks that fit; move or shrink the rest before starting.`
    }
    if (input.proposedBlockCount === 0) {
        return 'The day is clear enough without forcing a schedule. Pick one task when you are ready.'
    }
    return 'Your plan fits the available day. Start with the first proposed block and ignore the rest until it is finished.'
}

function allowedNumbers(input: PlanningExplanationInput): Set<number> {
    return new Set([
        input.plannedMinutes,
        input.capacityMinutes,
        input.openWindowCount,
        input.proposedBlockCount,
        input.adjustmentPercent,
    ])
}

/** Reject empties, over-long text, or any number the payload didn't contain. */
export function validateExplanation(text: string, input: PlanningExplanationInput): string {
    const trimmed = text.trim()
    if (!trimmed || trimmed.length > MAX_LENGTH) throw new Error('invalid shape')
    const allowed = allowedNumbers(input)
    const numbers = (trimmed.match(/\d+/g) ?? []).map((n) => Number(n))
    if (!numbers.every((n) => allowed.has(n))) throw new Error('invented number')
    return trimmed
}

const cache = new Map<string, string>()

function cacheKey(input: PlanningExplanationInput): string {
    return `${input.plannedMinutes}-${input.capacityMinutes}-${input.openWindowCount}-${input.proposedBlockCount}-${input.adjustmentPercent}`
}

/**
 * Explain a plan. Deterministic-first: returns the local explanation immediately
 * unless `allowRemote` is set and the platform exposes an insights backend, in
 * which case a validated remote line is preferred (and cached). Remote failures
 * silently degrade to the local text.
 */
export async function explainPlan(
    analysis: DayFitAnalysis,
    allowRemote: boolean,
): Promise<string> {
    const input = toExplanationInput(analysis)
    const key = cacheKey(input)
    const cached = cache.get(key)
    if (cached) return cached

    const fallback = localExplanation(input)
    if (!allowRemote || !platform.capabilities.aiInsights) {
        cache.set(key, fallback)
        return fallback
    }

    try {
        const res = await platform.insights.generate({ kind: 'planning', ...input })
        if (res.ok && typeof res.result === 'string') {
            const validated = validateExplanation(res.result, input)
            cache.set(key, validated)
            return validated
        }
    } catch {
        // fall through to deterministic text
    }
    cache.set(key, fallback)
    return fallback
}
