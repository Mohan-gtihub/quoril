import { useState } from 'react'
import { X, UserPlus } from 'lucide-react'
import { useWorkspaceAssignees } from '@/hooks/useWorkspaceAssignees'
import { NicknameRow } from './NicknameRow'

interface NicknameNudgeProps {
    workspaceId: string
}

/**
 * Slides up from the bottom when a workspace has people without nicknames yet,
 * prompting the user to name them. Dismissible (per session) via the X.
 */
export function NicknameNudge({ workspaceId }: NicknameNudgeProps) {
    const { missing, nicknames, currentEmail, setNickname } = useWorkspaceAssignees(workspaceId)
    const [dismissed, setDismissed] = useState(
        () => sessionStorage.getItem(`nickname-nudge-dismissed:${workspaceId}`) === '1'
    )

    if (dismissed || missing.length === 0) return null

    const dismiss = () => {
        sessionStorage.setItem(`nickname-nudge-dismissed:${workspaceId}`, '1')
        setDismissed(true)
    }

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] w-[min(420px,calc(100vw-2rem))] animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="rounded-[var(--radius-card)] bg-[var(--bg-elevated)] border border-[var(--border-default)] shadow-xl overflow-hidden">
                <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-2">
                    <div className="flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-[var(--accent-primary)]" />
                        <div>
                            <div className="text-sm font-semibold text-[var(--text-primary)]">Add nicknames</div>
                            <div className="text-[11px] text-[var(--text-muted)]">
                                {missing.length} teammate{missing.length > 1 ? 's' : ''} need a friendly name.
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={dismiss}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                        aria-label="Dismiss"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="px-5 py-3 space-y-3 max-h-[40vh] overflow-y-auto custom-scrollbar">
                    {missing.map((email, i) => (
                        <NicknameRow
                            key={email}
                            email={email}
                            nickname={nicknames[email] || ''}
                            isYou={!!currentEmail && email === currentEmail.toLowerCase()}
                            onSave={(value) => setNickname(email, value)}
                            autoFocus={i === 0}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}
