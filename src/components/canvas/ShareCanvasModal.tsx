import { useEffect, useState } from 'react'
import { X, Trash2, UserPlus } from 'lucide-react'
import { useCanvasStore } from '@/store/canvas/canvasStore'

/**
 * Share a single whiteboard with another user by email. Mirrors the workspace
 * invite flow but scoped to one canvas (canvas_members). Owner-only.
 */
export function ShareCanvasModal({
    canvasId,
    canvasTitle,
    onClose,
}: {
    canvasId: string
    canvasTitle: string
    onClose: () => void
}) {
    const members = useCanvasStore((s) => s.membersByCanvas[canvasId] || [])
    const loadCanvasMembers = useCanvasStore((s) => s.loadCanvasMembers)
    const inviteToCanvas = useCanvasStore((s) => s.inviteToCanvas)
    const revokeCanvasMember = useCanvasStore((s) => s.revokeCanvasMember)

    const [email, setEmail] = useState('')
    const [sending, setSending] = useState(false)

    useEffect(() => {
        loadCanvasMembers(canvasId)
    }, [canvasId, loadCanvasMembers])

    const submit = async () => {
        if (!email.trim() || sending) return
        setSending(true)
        const ok = await inviteToCanvas(canvasId, email)
        setSending(false)
        if (ok) setEmail('')
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-default)]">
                    <div>
                        <h2 className="text-base font-semibold text-[var(--text-primary)]">Share whiteboard</h2>
                        <p className="text-xs text-[var(--text-muted)] truncate max-w-[20rem]">{canvasTitle}</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Invite by email */}
                    <div className="flex items-center gap-2">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
                            placeholder="teammate@email.com"
                            className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
                        />
                        <button
                            type="button"
                            onClick={submit}
                            disabled={sending || !email.trim()}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--accent-primary)] text-white text-sm font-medium disabled:opacity-50 hover:opacity-90"
                        >
                            <UserPlus size={15} /> Share
                        </button>
                    </div>

                    {/* Current members */}
                    <div>
                        <div className="text-xs font-medium text-[var(--text-muted)] mb-2">People with access</div>
                        {members.length === 0 ? (
                            <div className="text-sm text-[var(--text-muted)]">Not shared with anyone yet.</div>
                        ) : (
                            <ul className="space-y-1">
                                {members.map((m) => (
                                    <li key={m.id} className="flex items-center justify-between rounded-lg px-3 py-2 bg-[var(--bg-tertiary)]">
                                        <span className="text-sm text-[var(--text-primary)] truncate">{m.email}</span>
                                        <button
                                            type="button"
                                            onClick={() => revokeCanvasMember(canvasId, m.id)}
                                            title="Revoke access"
                                            className="p-1 rounded hover:bg-[var(--bg-hover)] text-red-500"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
