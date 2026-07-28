import { useMemo } from 'react'
import { cn } from '@/utils/helpers'

/**
 * Renders a GitHub release body inside the update prompts.
 *
 * The body is remote content controlled by whoever can publish a release, so it
 * is deliberately rendered as React text children only — never through
 * dangerouslySetInnerHTML and never through a markdown-to-HTML library. We
 * support the small subset of markdown that release notes actually use
 * (headings, bullets, inline emphasis) by *stripping* the syntax rather than
 * translating it into markup, which keeps the injection surface at zero.
 */

type Line =
    | { kind: 'heading'; text: string }
    | { kind: 'bullet'; text: string }
    | { kind: 'text'; text: string }

/** Strip inline markdown to its visible text. Purely lexical — emits no markup. */
function stripInline(raw: string): string {
    return raw
        // [label](url) → label. Links aren't clickable here by design: a release
        // body must not be able to hand the user an arbitrary target to click.
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        // **bold**, __bold__, *em*, _em_, `code`
        .replace(/(\*\*|__)(.*?)\1/g, '$2')
        .replace(/(^|\W)[*_]([^*_]+)[*_](?=\W|$)/g, '$1$2')
        .replace(/`([^`]*)`/g, '$1')
        .trim()
}

function parse(notes: string): Line[] {
    const lines: Line[] = []
    for (const raw of notes.split('\n')) {
        const line = raw.trim()
        if (!line) continue
        // A bare '---' is a separator, not content.
        if (/^([-*_])\1{2,}$/.test(line)) continue

        const heading = line.match(/^#{1,6}\s+(.*)$/)
        if (heading) {
            const text = stripInline(heading[1])
            if (text) lines.push({ kind: 'heading', text })
            continue
        }

        // '- item', '* item', '1. item'
        const bullet = line.match(/^(?:[-*+]|\d+\.)\s+(.*)$/)
        if (bullet) {
            const text = stripInline(bullet[1])
            if (text) lines.push({ kind: 'bullet', text })
            continue
        }

        const text = stripInline(line)
        if (text) lines.push({ kind: 'text', text })
    }
    return lines
}

export function ReleaseNotes({ notes, className }: { notes: string; className?: string }) {
    const lines = useMemo(() => parse(notes), [notes])

    if (lines.length === 0) return null

    return (
        <div
            className={cn(
                'max-h-40 overflow-y-auto pr-1 rounded-[var(--radius-card)] bg-[var(--bg-secondary)] border border-[var(--border-default)] px-3 py-2.5',
                className
            )}
        >
            <ul className="space-y-1">
                {lines.map((line, i) => {
                    if (line.kind === 'heading') {
                        return (
                            <li
                                key={i}
                                className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] pt-1.5 first:pt-0"
                            >
                                {line.text}
                            </li>
                        )
                    }
                    if (line.kind === 'bullet') {
                        return (
                            <li key={i} className="flex gap-1.5 text-xs text-[var(--text-tertiary)] leading-relaxed">
                                <span aria-hidden className="text-[var(--text-muted)] select-none">•</span>
                                <span className="min-w-0 break-words">{line.text}</span>
                            </li>
                        )
                    }
                    return (
                        <li key={i} className="text-xs text-[var(--text-tertiary)] leading-relaxed break-words">
                            {line.text}
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
