/**
 * Robust JSON extraction from an LLM response.
 *
 * Models — even when instructed to return "only JSON" — frequently wrap output
 * in markdown fences or add a sentence of preamble. These helpers recover the
 * JSON object without trusting the model to be perfectly disciplined.
 */

/**
 * Extract the first balanced top-level JSON object from arbitrary text.
 * Returns the raw JSON substring, or `null` if none is found.
 */
export function extractJsonObject(text: string): string | null {
    if (!text) return null

    // Strip a leading ```json / ``` fence if present.
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
    const haystack = fenced ? fenced[1] : text

    const start = haystack.indexOf('{')
    if (start === -1) return null

    // Walk the string tracking brace depth, ignoring braces inside strings.
    let depth = 0
    let inString = false
    let escaped = false

    for (let i = start; i < haystack.length; i++) {
        const ch = haystack[i]

        if (escaped) {
            escaped = false
            continue
        }

        if (ch === '\\') {
            escaped = true
            continue
        }

        if (ch === '"') {
            inString = !inString
            continue
        }

        if (inString) continue

        if (ch === '{') depth++
        else if (ch === '}') {
            depth--
            if (depth === 0) {
                return haystack.slice(start, i + 1)
            }
        }
    }

    return null
}

/**
 * Parse the first JSON object found in `text`.
 * Returns the parsed value, or `null` if extraction/parsing fails.
 */
export function safeParseJsonObject(text: string): unknown | null {
    const json = extractJsonObject(text)
    if (json === null) return null
    try {
        return JSON.parse(json)
    } catch {
        return null
    }
}
