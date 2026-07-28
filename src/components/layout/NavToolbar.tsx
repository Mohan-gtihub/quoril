import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavHistory } from '@/hooks/useNavHistory'

/**
 * Slim persistent toolbar across the top of the content area, holding the
 * browser-style back/forward controls for the workspace drill-down. Always
 * visible above every page.
 */
export function NavToolbar() {
    const { back, forward, canBack, canForward } = useNavHistory()

    return (
        <div className="shrink-0 h-10 flex items-center gap-1 px-3 border-b border-[var(--border-default)] bg-[var(--bg-primary)]">
            <button
                onClick={back}
                disabled={!canBack}
                title="Back"
                aria-label="Back"
                className="p-1.5 rounded-md text-[var(--text-muted)] enabled:hover:bg-[var(--bg-hover)] enabled:hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-default transition-colors"
            >
                <ChevronLeft size={18} />
            </button>
            <button
                onClick={forward}
                disabled={!canForward}
                title="Forward"
                aria-label="Forward"
                className="p-1.5 rounded-md text-[var(--text-muted)] enabled:hover:bg-[var(--bg-hover)] enabled:hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-default transition-colors"
            >
                <ChevronRight size={18} />
            </button>
        </div>
    )
}
