import { Minus, Square, X } from 'lucide-react'
import { useSyncStore } from '@/store/syncStore'

export function TitleBar() {
    const { syncing, pendingCount, lastSync, error } = useSyncStore()
    const handleMinimize = () => {
        window.electronAPI?.window.minimize()
    }

    const handleMaximize = () => {
        window.electronAPI?.window.maximize()
    }

    const handleClose = () => {
        window.electronAPI?.window.close()
    }

    return (
        <div
            className="h-8 glass-thick flex items-center justify-between px-3 select-none z-50 border-b border-gray-800"
            style={{ WebkitAppRegion: 'drag' } as any}
        >
            <div className="flex items-center gap-2">
                {/* Inline SVG logo — works in both Electron dev and production (no file:// path issues) */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="opacity-80">
                    <circle cx="12" cy="12" r="10" stroke="#6366f1" strokeWidth="2.5" />
                    <path d="M12 7v5l3 3" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span className="text-xs text-gray-400 font-medium">Quoril</span>

                {/* Sync status indicator */}
                {error ? (
                    <span className="text-xs text-red-400 font-mono" title={error}>⚠ sync error</span>
                ) : syncing ? (
                    <span className="text-xs text-indigo-400 font-mono animate-pulse">syncing…</span>
                ) : pendingCount > 0 ? (
                    <span className="text-xs text-yellow-400 font-mono">{pendingCount} pending</span>
                ) : lastSync ? (
                    <span className="text-xs text-gray-600 font-mono">synced</span>
                ) : null}
            </div>

            <div
                className="flex items-center gap-1"
                style={{ WebkitAppRegion: 'no-drag' } as any}
            >
                <button
                    onClick={handleMinimize}
                    className="p-1.5 hover:bg-gray-700 rounded-md text-gray-400 hover:text-white transition-colors"
                >
                    <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={handleMaximize}
                    className="p-1.5 hover:bg-gray-700 rounded-md text-gray-400 hover:text-white transition-colors"
                >
                    <Square className="w-3 h-3" />
                </button>
                <button
                    onClick={handleClose}
                    className="p-1.5 hover:bg-red-600 rounded-md text-gray-400 hover:text-white transition-colors group"
                >
                    <X className="w-3.5 h-3.5 group-hover:text-white" />
                </button>
            </div>
        </div>
    )
}
