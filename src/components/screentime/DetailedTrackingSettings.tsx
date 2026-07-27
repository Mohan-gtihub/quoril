import { useState } from 'react'
import { Globe, AppWindow, ExternalLink, RotateCw } from 'lucide-react'
import { useTrackingDetail, type EnableOutcome } from '@/hooks/useTrackingDetail'
import type { DetailCapability } from '@/services/platform/types'
import { cn } from '@/utils/helpers'

/**
 * The two detailed-tracking opt-ins.
 *
 * They are presented separately on purpose. Website addresses cost an
 * Accessibility grant, which macOS can prompt for inline. Window titles cost a
 * Screen Recording grant, which has no prompt API, reads alarmingly in System
 * Settings, and needs a relaunch. Bundling them behind one switch would make
 * the cheap, high-value option carry the expensive one's cost.
 */

const COPY: Record<
    DetailCapability,
    { icon: typeof Globe; title: string; body: string; permission: string }
> = {
    urls: {
        icon: Globe,
        title: 'Website addresses',
        body:
            'Splits browser time into the sites you actually visited, instead of one undifferentiated block per browser.',
        permission: 'Accessibility',
    },
    titles: {
        icon: AppWindow,
        title: 'Window titles',
        body:
            'Records the title of the active window — the file in your editor, the document you’re writing. Quoril must be restarted after granting this.',
        permission: 'Screen Recording',
    },
}

export function DetailedTrackingSettings() {
    const { detail, busy, setEnabled, relaunch } = useTrackingDetail()
    const [notice, setNotice] = useState<EnableOutcome | null>(null)

    // Null means the platform has no concept of this (web).
    if (!detail) return null

    const onToggle = async (capability: DetailCapability, next: boolean) => {
        setNotice(await setEnabled(capability, next))
    }

    return (
        <div className="space-y-1">
            <p className="text-xs text-[var(--text-tertiary)] leading-relaxed pb-2">
                App names are always recorded, with no permission needed. These two add
                more detail and are off until you turn them on. Everything below stays in
                the local database on this device and is never uploaded.
            </p>

            {(['urls', 'titles'] as DetailCapability[]).map((capability) => {
                const copy = COPY[capability]
                const Icon = copy.icon
                const state = detail[capability]
                const live = state.enabled && state.granted

                return (
                    <div
                        key={capability}
                        className="py-4 border-b border-[var(--border-default)] last:border-0"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 min-w-0">
                                <Icon
                                    className={cn(
                                        'w-4 h-4 mt-0.5 shrink-0',
                                        live ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]',
                                    )}
                                />
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                                        {copy.title}
                                    </p>
                                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5 leading-relaxed max-w-md">
                                        {copy.body}
                                    </p>

                                    {/* Opted in but the OS hasn't granted it: the toggle
                                        reads "on" while nothing is being collected, so
                                        say so rather than letting it look like it works. */}
                                    {state.enabled && !state.granted && (
                                        <div className="mt-2 flex flex-col items-start gap-1.5">
                                            <button
                                                onClick={() => onToggle(capability, true)}
                                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-primary)] hover:underline underline-offset-2"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                Waiting on {copy.permission} permission — open System Settings
                                            </button>
                                            {/* macOS caches a process's Accessibility trust, so a grant made
                                                while Quoril is running is sometimes invisible until it
                                                restarts. Screen Recording always needs one. Rather than
                                                leave someone staring at "waiting" after they have already
                                                granted it, offer the restart directly. */}
                                            <button
                                                onClick={() => relaunch()}
                                                className="inline-flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                                            >
                                                <RotateCw className="w-3 h-3" />
                                                Already granted it? Restart Quoril to pick it up
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                role="switch"
                                aria-checked={state.enabled}
                                aria-label={copy.title}
                                disabled={busy}
                                onClick={() => onToggle(capability, !state.enabled)}
                                className={cn(
                                    'shrink-0 w-10 h-6 rounded-full p-0.5 transition-colors disabled:opacity-40',
                                    state.enabled
                                        ? 'bg-[var(--accent-primary)]'
                                        : 'bg-[var(--bg-tertiary)] border border-[var(--border-default)]',
                                )}
                            >
                                <span
                                    className={cn(
                                        'block w-5 h-5 rounded-full bg-white shadow-sm transition-transform',
                                        state.enabled && 'translate-x-4',
                                    )}
                                />
                            </button>
                        </div>
                    </div>
                )
            })}

            {notice?.status === 'needs-relaunch' && (
                <div className="flex items-center justify-between gap-3 mt-3 px-3.5 py-2.5 rounded-[var(--radius-card)] bg-[var(--bg-secondary)] border border-[var(--border-default)]">
                    <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
                        Screen Recording only takes effect after a restart.
                    </p>
                    <button
                        onClick={() => relaunch()}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-card)] text-xs font-semibold bg-[var(--accent-primary)] text-[var(--accent-contrast)] hover:opacity-90 transition-opacity"
                    >
                        <RotateCw className="w-3 h-3" />
                        Restart now
                    </button>
                </div>
            )}

            {notice?.status === 'needs-permission' && (
                <p className="text-xs text-[var(--text-tertiary)] leading-relaxed mt-3 px-3.5 py-2.5 rounded-[var(--radius-card)] bg-[var(--bg-secondary)] border border-[var(--border-default)]">
                    Grant {COPY[notice.capability].permission} to Quoril in System Settings.
                    This turns on by itself once you come back.
                </p>
            )}
        </div>
    )
}
