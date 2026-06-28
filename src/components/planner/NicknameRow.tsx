import { useEffect, useState } from 'react'
import { assigneeInitial } from '@/utils/assignee'

interface NicknameRowProps {
    email: string
    nickname: string
    isYou?: boolean
    onSave: (value: string) => void
    autoFocus?: boolean
}

/** One editable nickname row: avatar + email + a nickname input saved on blur/Enter. */
export function NicknameRow({ email, nickname, isYou, onSave, autoFocus }: NicknameRowProps) {
    const [value, setValue] = useState(nickname)

    // Keep in sync if the stored nickname changes elsewhere.
    useEffect(() => { setValue(nickname) }, [nickname])

    const commit = () => {
        const trimmed = value.trim()
        if (trimmed !== nickname) onSave(trimmed)
    }

    return (
        <div className="flex items-center gap-3">
            <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] text-xs font-semibold uppercase">
                {assigneeInitial(nickname || email)}
            </span>
            <div className="flex-1 min-w-0">
                <div className="text-xs text-[var(--text-muted)] truncate">
                    {email}{isYou ? ' (you)' : ''}
                </div>
            </div>
            <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                placeholder="Nickname"
                autoFocus={autoFocus}
                className="w-36 bg-[var(--bg-hover)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]/40"
            />
        </div>
    )
}
