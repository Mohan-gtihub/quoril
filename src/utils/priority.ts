import type { Task } from '@/types/database'

export type Priority = Task['priority'] // 'low' | 'medium' | 'high' | 'critical'

interface PriorityMeta {
    label: string
    /** Theme token resolving to the priority's semantic colour. */
    color: string
}

/**
 * Single source of truth for task-priority labels and colours.
 * Colours come from the `--priority-*` CSS tokens (see index.css) so they stay
 * consistent across every theme and everywhere a priority is rendered.
 */
export const PRIORITY_META: Record<Priority, PriorityMeta> = {
    critical: { label: 'Critical', color: 'var(--priority-critical)' },
    high: { label: 'High', color: 'var(--priority-high)' },
    medium: { label: 'Medium', color: 'var(--priority-medium)' },
    low: { label: 'Low', color: 'var(--priority-low)' },
}

export function getPriorityMeta(priority: Priority | null | undefined): PriorityMeta | null {
    if (!priority) return null
    return PRIORITY_META[priority] ?? null
}

/** A translucent tint of the priority colour, for chip/badge backgrounds. */
export function priorityTint(color: string, pct = 12): string {
    return `color-mix(in srgb, ${color} ${pct}%, transparent)`
}

/** High and critical are the only tiers that warrant an explicit, worded callout. */
export function isUrgentPriority(priority: Priority | null | undefined): boolean {
    return priority === 'high' || priority === 'critical'
}
