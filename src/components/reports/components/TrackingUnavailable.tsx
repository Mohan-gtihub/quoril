import { Monitor } from 'lucide-react'

interface TrackingUnavailableProps {
  /** Optional extra class names on the wrapper */
  className?: string
  title?: string
  description?: string
}

/**
 * Shown on web wherever app-/website-tracking data is required but unavailable.
 * Tracking is a desktop-only capability; this component surfaces a friendly CTA.
 */
export function TrackingUnavailable({
  className = '',
  title = 'Desktop-Only Feature',
  description = 'App & website tracking is desktop-only. Install the Quoril desktop app to see where your time goes.',
}: TrackingUnavailableProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-6 text-center rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] ${className}`}
    >
      <div className="mb-4 w-14 h-14 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-default)] flex items-center justify-center">
        <Monitor className="w-7 h-7 text-[var(--text-muted)]" />
      </div>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
        {title}
      </h3>
      <p className="text-xs text-[var(--text-tertiary)] leading-relaxed max-w-xs">
        {description}
      </p>
    </div>
  )
}
