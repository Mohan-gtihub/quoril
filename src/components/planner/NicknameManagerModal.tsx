import { X } from 'lucide-react'
import { useWorkspaceAssignees } from '@/hooks/useWorkspaceAssignees'
import { NicknameRow } from './NicknameRow'

interface NicknameManagerModalProps {
    workspaceId: string
    onClose: () => void
}

/** Manage nicknames for everyone in a workspace. Opened from the planner header. */
export function NicknameManagerModal({ workspaceId, onClose }: NicknameManagerModalProps) {
    const { emails, nicknames, currentEmail, setNickname } = useWorkspaceAssignees(workspaceId)

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-[var(--radius-card)] bg-[var(--bg-elevated)] border border-[var(--border-default)] shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
                    <div>
                        <h2 className="text-base font-semibold text-[var(--text-primary)]">Workspace nicknames</h2>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">Friendly names shown on assigned tasks.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {emails.length === 0 ? (
                        <p className="text-sm text-[var(--text-muted)] text-center py-6">
                            Invite teammates to this workspace to nickname them.
                        </p>
                    ) : (
                        emails.map(email => (
                            <NicknameRow
                                key={email}
                                email={email}
                                nickname={nicknames[email] || ''}
                                isYou={!!currentEmail && email === currentEmail.toLowerCase()}
                                onSave={(value) => setNickname(email, value)}
                            />
                        ))
                    )}
                </div>

                <div className="px-6 py-4 border-t border-[var(--border-default)] flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold rounded-full bg-[var(--accent-primary)] text-[var(--accent-contrast)] hover:brightness-105 active:scale-95 transition-all"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    )
}
