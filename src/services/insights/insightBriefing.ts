// The response model + strict validation for AI Insights - a TypeScript port of
// Swift's InsightBriefing. Validation fails closed: a briefing that does not
// conform is discarded whole, never partially rendered. The user keeps the last
// good briefing, because a stale insight is honest and a malformed one is not.

import { digitRuns } from './insightPayload'

export interface BriefingInsight {
    title: string
    body: string
    /** The number this insight rests on, restated so the user can check it. */
    evidence: string
}

export interface BriefingExperiment {
    suggestion: string
    why: string
}

export interface InsightBriefing {
    headline: string
    insights: BriefingInsight[]
    /** Optional - some models omit it; a briefing is still useful without one. */
    experiment?: BriefingExperiment
    /** Set by us on receipt - the model has no clock and isn't trusted with one. */
    generatedAt: string
}

// Field length caps. These bound what can be rendered as much as what can be
// said: the card layout has finite room. Measured against the model, not guessed.
const LIMIT = {
    headline: 110,
    title: 60,
    body: 220,
    evidence: 90,
    suggestion: 160,
    why: 160,
    insightsMin: 2,
    insightsMax: 3,
} as const

const DISALLOWED = ['http://', 'https://', 'www.', '](', '<script', 'data:']

export class BriefingValidationError extends Error {
    constructor(public reason: string) {
        super(reason)
        this.name = 'BriefingValidationError'
    }
}

function checkField(value: unknown, field: string, limit: number): string {
    if (typeof value !== 'string') throw new BriefingValidationError(`${field} missing or not a string`)
    const trimmed = value.trim()
    if (!trimmed) throw new BriefingValidationError(`${field} is empty`)
    if (trimmed.length > limit) throw new BriefingValidationError(`${field} exceeds ${limit} chars`)
    // Control characters corrupt the render; links/markup are how model output
    // turns clickable, and nothing here should ever be clickable.
    // eslint-disable-next-line no-control-regex
    if (/[\x00-\x1F\x7F]/.test(trimmed)) {
        throw new BriefingValidationError(`${field} contains a control character`)
    }
    const lowered = trimmed.toLowerCase()
    for (const marker of DISALLOWED) {
        if (lowered.includes(marker)) throw new BriefingValidationError(`${field} contains disallowed "${marker}"`)
    }
    return trimmed
}

// Models wrap JSON in ```json fences roughly half the time regardless of
// instruction. Tolerating that is not laxity - the alternative is throwing away
// otherwise valid briefings over punctuation.
function stripFence(text: string): string {
    let trimmed = text.trim()
    if (!trimmed.startsWith('```')) return trimmed
    const firstNewline = trimmed.indexOf('\n')
    if (firstNewline !== -1) trimmed = trimmed.slice(firstNewline + 1)
    const lastFence = trimmed.lastIndexOf('```')
    if (lastFence !== -1) trimmed = trimmed.slice(0, lastFence)
    return trimmed.trim()
}

/**
 * Parse and check a model response.
 * @param allowedNumbers every digit run present in the payload we sent. Any
 *   figure in `evidence` outside this set was invented - the one failure mode
 *   that would make the feature actively harmful.
 */
export function validateBriefing(text: string, allowedNumbers: Set<string>): InsightBriefing {
    let parsed: any
    try {
        parsed = JSON.parse(stripFence(text))
    } catch {
        throw new BriefingValidationError('response was not valid JSON')
    }

    if (!parsed || typeof parsed !== 'object') throw new BriefingValidationError('response was not an object')
    if (!Array.isArray(parsed.insights)) throw new BriefingValidationError('insights missing')
    // Too few is a real failure (nothing to say). Too many is harmless - the
    // model occasionally returns four; keep the first three rather than throw
    // away an otherwise good, checkable briefing over one extra card.
    if (parsed.insights.length < LIMIT.insightsMin) {
        throw new BriefingValidationError(`insight count ${parsed.insights.length} out of range`)
    }

    const headline = checkField(parsed.headline, 'headline', LIMIT.headline)

    const insights: BriefingInsight[] = parsed.insights.slice(0, LIMIT.insightsMax).map((ins: any, i: number) => ({
        title: checkField(ins?.title, `insights[${i}].title`, LIMIT.title),
        body: checkField(ins?.body, `insights[${i}].body`, LIMIT.body),
        evidence: checkField(ins?.evidence, `insights[${i}].evidence`, LIMIT.evidence),
    }))

    // The experiment is optional: some models omit it, and a headline plus
    // checkable findings is still a useful briefing. Validate it only if present;
    // a malformed experiment is dropped rather than sinking the whole response.
    let experiment: BriefingExperiment | undefined
    if (parsed.experiment && typeof parsed.experiment === 'object') {
        try {
            experiment = {
                suggestion: checkField(parsed.experiment.suggestion, 'suggestion', LIMIT.suggestion),
                why: checkField(parsed.experiment.why, 'why', LIMIT.why),
            }
        } catch {
            experiment = undefined
        }
    }

    // Numbers are checked only in evidence - prose legitimately contains ordinals
    // and figures of speech, while evidence exists precisely to restate a
    // measurement, so an unrecognised number there is unambiguously wrong.
    for (const ins of insights) {
        for (const n of digitRuns(ins.evidence)) {
            if (!allowedNumbers.has(n)) throw new BriefingValidationError(`invented number "${n}" in evidence`)
        }
    }

    return { headline, insights, experiment, generatedAt: new Date().toISOString() }
}
