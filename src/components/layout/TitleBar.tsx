import { Minus, Square, Copy, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSyncStore } from '@/store/syncStore'
import { platform } from '@/services/platform'

export function TitleBar() {
    const { syncing, pendingCount, lastSync, error } = useSyncStore()
    const [isMaximized, setIsMaximized] = useState(false)

    useEffect(() => {
        let cancelled = false
        const poll = async () => {
            try {
                const val = await (window as any).electronAPI?.window?.isMaximized?.()
                if (!cancelled && typeof val === 'boolean') setIsMaximized(val)
            } catch { /* noop */ }
        }
        poll()
        const onResize = () => poll()
        window.addEventListener('resize', onResize)
        return () => {
            cancelled = true
            window.removeEventListener('resize', onResize)
        }
    }, [])

    const handleMinimize = () => {
        platform.windowControls.minimize()
    }

    const handleMaximize = () => {
        platform.windowControls.maximize()
        setIsMaximized(v => !v)
    }

    const handleClose = () => {
        platform.windowControls.close()
    }

    return (
        <div
            className="h-8 bg-[var(--bg-secondary)] flex items-center justify-between px-3 select-none z-50 border-b border-[var(--border-default)]"
            style={{ WebkitAppRegion: 'drag' } as any}
            onDoubleClick={handleMaximize}
        >
            <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-secondary)] font-semibold tracking-tight">Quoril</span>

                {/* Sync status indicator */}
                {error ? (
                    <span className="text-xs text-[var(--error)] font-mono" title={error}>sync error</span>
                ) : syncing ? (
                    <span className="text-xs text-[var(--accent-primary)] font-mono animate-pulse">syncing…</span>
                ) : pendingCount > 0 ? (
                    <span className="text-xs text-[var(--text-tertiary)] font-mono">{pendingCount} pending</span>
                ) : lastSync ? (
                    <span className="text-xs text-[var(--text-muted)] font-mono">synced</span>
                ) : null}
            </div>

            <div
                className="flex items-center gap-1"
                style={{ WebkitAppRegion: 'no-drag' } as any}
            >
                <button
                    onClick={handleMinimize}
                    className="p-1.5 hover:bg-[var(--bg-hover)] rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                    <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={handleMaximize}
                    className="p-1.5 hover:bg-[var(--bg-hover)] rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    title={isMaximized ? 'Restore' : 'Maximize'}
                >
                    {isMaximized
                        ? <Copy className="w-3 h-3" />
                        : <Square className="w-3 h-3" />}
                </button>
                <button
                    onClick={handleClose}
                    className="p-1.5 hover:bg-[var(--error)] rounded-md text-[var(--text-muted)] hover:text-white transition-colors"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    )
}
