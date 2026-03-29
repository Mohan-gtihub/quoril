import { create } from 'zustand'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Trash2, X } from 'lucide-react'
import { useEffect, useCallback } from 'react'

/* ─── Store ──────────────────────────────────────────────── */

interface ConfirmState {
    open: boolean
    title: string
    message: string
    confirmLabel: string
    cancelLabel: string
    variant: 'danger' | 'warning' | 'default'
    resolve: ((value: boolean) => void) | null
}

const useConfirmStore = create<ConfirmState>(() => ({
    open: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    variant: 'default',
    resolve: null,
}))

/* ─── Public API ─────────────────────────────────────────── */

export interface ConfirmOptions {
    title?: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'danger' | 'warning' | 'default'
}

export function confirm(opts: ConfirmOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        useConfirmStore.setState({
            open: true,
            title: opts.title ?? 'Are you sure?',
            message: opts.message,
            confirmLabel: opts.confirmLabel ?? 'Confirm',
            cancelLabel: opts.cancelLabel ?? 'Cancel',
            variant: opts.variant ?? 'default',
            resolve,
        })
    })
}

/* ─── Component ──────────────────────────────────────────── */

export function ConfirmDialog() {
    const { open, title, message, confirmLabel, cancelLabel, variant, resolve } = useConfirmStore()

    const close = useCallback((value: boolean) => {
        resolve?.(value)
        useConfirmStore.setState({ open: false, resolve: null })
    }, [resolve])

    // Escape key closes
    useEffect(() => {
        if (!open) return
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') close(false)
            if (e.key === 'Enter') close(true)
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [open, close])

    const iconColor = variant === 'danger' ? 'text-red-400 bg-red-500/10' : variant === 'warning' ? 'text-amber-400 bg-amber-500/10' : 'text-blue-400 bg-blue-500/10'
    const btnColor = variant === 'danger' ? 'bg-red-500 hover:bg-red-600' : variant === 'warning' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-[var(--accent-primary)] hover:brightness-110'
    const Icon = variant === 'danger' ? Trash2 : AlertTriangle

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[9999] flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                >
                    {/* Backdrop */}
                    <motion.div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => close(false)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />

                    {/* Dialog */}
                    <motion.div
                        className="relative w-full max-w-[360px] mx-4 bg-[#0c0e14] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden"
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.15 }}
                    >
                        {/* Close button */}
                        <button
                            onClick={() => close(false)}
                            className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-colors"
                        >
                            <X className="w-3.5 h-3.5 text-white/30" />
                        </button>

                        {/* Content */}
                        <div className="p-6 pt-5">
                            <div className="flex items-start gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0 pt-0.5">
                                    <h3 className="text-sm font-black text-white mb-1">{title}</h3>
                                    <p className="text-[12px] text-white/40 leading-relaxed">{message}</p>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2.5 px-6 pb-5">
                            <button
                                onClick={() => close(false)}
                                className="flex-1 py-2.5 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-[12px] font-bold text-white/50 transition-colors"
                            >
                                {cancelLabel}
                            </button>
                            <button
                                onClick={() => close(true)}
                                autoFocus
                                className={`flex-1 py-2.5 px-4 rounded-xl text-[12px] font-bold text-white transition-all ${btnColor}`}
                            >
                                {confirmLabel}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
