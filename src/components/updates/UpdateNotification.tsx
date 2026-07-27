import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, RotateCw, X } from 'lucide-react'
import { useAppUpdate } from '@/hooks/useAppUpdate'

/**
 * Non-intrusive bottom-corner update surface. Two states:
 *   • downloading → "Downloading update… 42%" with a thin progress bar.
 *   • downloaded  → "Update ready" with Restart Now / Later.
 * Everything else renders nothing. Mounted once at the app root.
 */
export function UpdateNotification() {
    const { status, restart, download } = useAppUpdate()
    // "Later" dismisses the prompt for this session. A downloaded update still
    // installs on next quit (autoInstallOnAppQuit); an offered one is simply
    // re-offered on the next check.
    const [dismissed, setDismissed] = useState(false)

    // Each new stage re-shows the card even after a prior dismiss.
    useEffect(() => {
        if (status.state === 'available' || status.state === 'downloaded') setDismissed(false)
    }, [status.state])

    const show =
        !dismissed &&
        (status.state === 'available' ||
            status.state === 'downloading' ||
            status.state === 'downloaded')

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, y: 16, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 16, scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    className="fixed bottom-5 right-5 z-[9999] w-[320px] rounded-[var(--radius-tile)] border border-[var(--border-default)] bg-[var(--bg-card)] shadow-[0_16px_40px_rgba(0,0,0,0.32)] overflow-hidden"
                >
                    {status.state === 'available' ? (
                        <div className="p-4">
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                                        Update available
                                    </p>
                                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5 leading-relaxed">
                                        Version {status.version} is ready to download.
                                        Download it now?
                                    </p>
                                </div>
                                <button
                                    onClick={() => setDismissed(true)}
                                    className="shrink-0 w-6 h-6 -mt-0.5 -mr-1 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                                    aria-label="Dismiss"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => download()}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-[var(--radius-card)] text-xs font-semibold bg-[var(--accent-primary)] text-[var(--accent-contrast)] hover:opacity-90 transition-opacity"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Download
                                </button>
                                <button
                                    onClick={() => setDismissed(true)}
                                    className="px-3 py-2 rounded-[var(--radius-card)] text-xs font-semibold text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--border-default)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors"
                                >
                                    Not now
                                </button>
                            </div>
                        </div>
                    ) : status.state === 'downloading' ? (
                        <div className="p-4">
                            <div className="flex items-center gap-2.5 mb-3">
                                <Download className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                                <p className="text-sm font-semibold text-[var(--text-primary)]">
                                    Downloading update… {status.percent}%
                                </p>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-[var(--accent-primary)] transition-[width] duration-300 ease-out"
                                    style={{ width: `${status.percent}%` }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="p-4">
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                                        Update ready to install
                                    </p>
                                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5 leading-relaxed">
                                        {status.state === 'downloaded' && status.version
                                            ? `Version ${status.version} is ready to install.`
                                            : 'A new version is ready to install.'}{' '}
                                        Restart now or later?
                                    </p>
                                </div>
                                <button
                                    onClick={() => setDismissed(true)}
                                    className="shrink-0 w-6 h-6 -mt-0.5 -mr-1 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                                    aria-label="Dismiss"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => restart()}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-[var(--radius-card)] text-xs font-semibold bg-[var(--accent-primary)] text-[var(--accent-contrast)] hover:opacity-90 transition-opacity"
                                >
                                    <RotateCw className="w-3.5 h-3.5" />
                                    Restart Now
                                </button>
                                <button
                                    onClick={() => setDismissed(true)}
                                    className="px-3 py-2 rounded-[var(--radius-card)] text-xs font-semibold text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--border-default)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors"
                                >
                                    Later
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    )
}
