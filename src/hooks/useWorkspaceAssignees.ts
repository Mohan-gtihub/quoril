import { useMemo, useEffect } from 'react'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useAuthStore } from '@/store/authStore'
import { resolveAssigneeLabel } from '@/utils/assignee'

/**
 * Everyone who can be assigned tasks in a workspace (invited members + yourself),
 * along with their per-workspace nicknames and a setter. Used by the nickname
 * manager and the bottom nudge.
 */
export function useWorkspaceAssignees(workspaceId: string | null) {
    const membersByWorkspace = useWorkspaceStore(s => s.membersByWorkspace)
    const nicknamesByWorkspace = useWorkspaceStore(s => s.nicknamesByWorkspace)
    const loadWorkspaceMembers = useWorkspaceStore(s => s.loadWorkspaceMembers)
    const loadWorkspaceNicknames = useWorkspaceStore(s => s.loadWorkspaceNicknames)
    const setWorkspaceNickname = useWorkspaceStore(s => s.setWorkspaceNickname)
    const currentEmail = useAuthStore(s => s.user?.email ?? null)

    useEffect(() => {
        if (workspaceId) {
            loadWorkspaceMembers(workspaceId)
            loadWorkspaceNicknames(workspaceId)
        }
    }, [workspaceId, loadWorkspaceMembers, loadWorkspaceNicknames])

    const nicknames = workspaceId ? (nicknamesByWorkspace[workspaceId] || {}) : {}

    const emails = useMemo(() => {
        if (!workspaceId) return [] as string[]
        const set = new Set(
            (membersByWorkspace[workspaceId] || [])
                .filter(m => !m.deleted_at)
                .map(m => m.email.toLowerCase())
        )
        if (currentEmail) set.add(currentEmail.toLowerCase())
        return [...set].sort()
    }, [workspaceId, membersByWorkspace, currentEmail])

    const missing = emails.filter(e => !nicknames[e])

    const setNickname = (email: string, nickname: string) => {
        if (workspaceId) setWorkspaceNickname(workspaceId, email, nickname)
    }

    return {
        emails,
        nicknames,
        missing,
        currentEmail,
        setNickname,
        resolveLabel: (email: string) => resolveAssigneeLabel(email, nicknames),
    }
}
