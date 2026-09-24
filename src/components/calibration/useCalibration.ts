import { useMemo } from 'react'
import { learnedAdjustment } from '@/services/planning/dayFitAnalyzer'
import type { TaskRow } from '@/components/reports/hooks/useTaskReport'

/* ─── Types ─────────────────────────────────────────────────── */

/** One finished, timed, estimated task — a single calibration sample. */
export interface CalibrationSample {
    id: string
    title: string
    estimatedMin: number
    actualMin: number
    /** actual / estimate. 1.0 = perfect. >1 took longer than planned. */
    ratio: number
    /** signed % off from the estimate: +40 = 40% over, -25 = finished 25% early. */
    variancePct: number
    bucket: 'under' | 'close' | 'over'
}

export interface CalibrationVerdict {
    /** null when there isn't enough signal to speak to a pattern. */
    text: string | null
    detail: string
}

export interface Calibration {
    /** finished + estimated + timed tasks — the sample size. */
    sampleSize: number
    /** whether we have the handful of samples needed to call it a pattern. */
    hasPattern: boolean
    samples: CalibrationSample[]
    /** count in each accuracy band. */
    underrun: number
    onTarget: number
    overrun: number
    /** median signed variance across samples (+ = over, − = under), 0 when empty. */
    medianVariancePct: number
    /** learned actual/estimate ratio, clamped 0.75–2.0 (from dayFitAnalyzer). */
    adjustmentFactor: number
    /** the five most under-estimated (took longest vs plan). */
    mostUnderestimated: CalibrationSample[]
    /** the five most over-estimated (finished earliest vs plan). */
    mostOverestimated: CalibrationSample[]
    verdict: CalibrationVerdict
    /** a single, concrete suggestion for the next plan. */
    nextPlan: string
}

/* ─── Constants ─────────────────────────────────────────────── */

/** Quoril waits for this many finished, timed tasks before trusting the pattern. */
export const MIN_PATTERN_SAMPLES = 5

/** "Close" band: within ±this % of the estimate counts as on-target. */
const ON_TARGET_TOLERANCE = 20

/* ─── Helpers ───────────────────────────────────────────────── */

function median(values: number[]): number {
    if (values.length === 0) return 0
    const sorted = [...values].sort((a, b) => a - b)
    return sorted[Math.floor(sorted.length / 2)]
}

/* ─── Hook ──────────────────────────────────────────────────── */

/**
 * Turns finished, estimated, timed tasks into a picture of how well the user's
 * intended time matched reality — the calibration story. A faithful port of the
 * Swift CalibrationView's estimate-accuracy verdict, keyed off the same data
 * (estimated_minutes / actual_seconds) the Reports dashboard already surfaces.
 */
export function useCalibration(tasks: TaskRow[]): Calibration {
    return useMemo(() => {
        const samples: CalibrationSample[] = tasks
            .filter(t =>
                t.status === 'done' &&
                (t.estimated_minutes ?? 0) >= 5 &&
                (t.actual_seconds ?? 0) >= 60,
            )
            .map(t => {
                const estimatedMin = t.estimated_minutes!
                const actualMin = t.actual_seconds! / 60
                const ratio = actualMin / estimatedMin
                const variancePct = (ratio - 1) * 100
                const bucket: CalibrationSample['bucket'] =
                    variancePct > ON_TARGET_TOLERANCE ? 'over'
                        : variancePct < -ON_TARGET_TOLERANCE ? 'under'
                            : 'close'
                return {
                    id: t.id,
                    title: t.title,
                    estimatedMin: Math.round(estimatedMin),
                    actualMin: Math.round(actualMin),
                    ratio,
                    variancePct,
                    bucket,
                }
            })

        const sampleSize = samples.length
        const hasPattern = sampleSize >= MIN_PATTERN_SAMPLES

        const underrun = samples.filter(s => s.bucket === 'under').length
        const onTarget = samples.filter(s => s.bucket === 'close').length
        const overrun = samples.filter(s => s.bucket === 'over').length

        const medianVariancePct = Math.round(median(samples.map(s => s.variancePct)))

        // Reuse the shared planning learner. It expects estimate_m / spent_s.
        const adjustmentFactor = learnedAdjustment(
            tasks.map(t => ({
                status: t.status,
                estimate_m: t.estimated_minutes ?? 0,
                spent_s: t.actual_seconds ?? 0,
            })) as any,
        )

        // Over = took longest vs plan (biggest positive variance) → underestimated.
        const mostUnderestimated = [...samples]
            .filter(s => s.variancePct > 0)
            .sort((a, b) => b.variancePct - a.variancePct)
            .slice(0, 5)
        const mostOverestimated = [...samples]
            .filter(s => s.variancePct < 0)
            .sort((a, b) => a.variancePct - b.variancePct)
            .slice(0, 5)

        const verdict = buildVerdict(sampleSize, hasPattern, medianVariancePct)
        const nextPlan = buildNextPlan(hasPattern, medianVariancePct, adjustmentFactor)

        return {
            sampleSize,
            hasPattern,
            samples,
            underrun,
            onTarget,
            overrun,
            medianVariancePct,
            adjustmentFactor,
            mostUnderestimated,
            mostOverestimated,
            verdict,
            nextPlan,
        }
    }, [tasks])
}

/* ─── Copy ──────────────────────────────────────────────────── */

function buildVerdict(sampleSize: number, hasPattern: boolean, medianVariancePct: number): CalibrationVerdict {
    if (sampleSize === 0) {
        return {
            text: 'Start with one honest estimate.',
            detail: 'Finish a few estimated, timed tasks and Quoril will show how your plans compare with reality.',
        }
    }
    if (!hasPattern) {
        const remaining = Math.max(MIN_PATTERN_SAMPLES - sampleSize, 0)
        return {
            text: 'A pattern is beginning to form.',
            detail: `Quoril waits for ${MIN_PATTERN_SAMPLES} finished, timed tasks before calling this a pattern. ${remaining} more will make the guidance trustworthy.`,
        }
    }
    const detail = 'The band below compares planned time with tracked time. Within 20% counts as close — planning is a tool, not a precision test.'
    if (medianVariancePct > 15) {
        return { text: `You take about ${medianVariancePct}% longer than you plan.`, detail }
    }
    if (medianVariancePct < -15) {
        return { text: `You usually finish about ${Math.abs(medianVariancePct)}% early.`, detail }
    }
    return { text: 'Your estimates hold up well.', detail }
}

function buildNextPlan(hasPattern: boolean, medianVariancePct: number, adjustmentFactor: number): string {
    if (!hasPattern) {
        return 'Give the next task an honest estimate and time it. The picture sharpens with every finished block.'
    }
    if (medianVariancePct > 15) {
        const pct = Math.round((adjustmentFactor - 1) * 100)
        return `Budget about ${pct > 0 ? pct : medianVariancePct}% more than feels right — a 30-minute task tends to become ${Math.round(30 * adjustmentFactor)}.`
    }
    if (medianVariancePct < -15) {
        return 'Keep estimates lean; your actuals usually land earlier. Protect the freed-up time for a second block.'
    }
    return 'Your estimates hold. Keep planning the same way and place the hardest block when your energy feels cleanest.'
}
