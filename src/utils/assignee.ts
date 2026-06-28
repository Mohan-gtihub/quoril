/**
 * Resolve the display label for an assignee email within a workspace.
 * Prefers the workspace nickname, then falls back to the email's local part.
 */
export function resolveAssigneeLabel(
    email: string | null | undefined,
    nicknames?: Record<string, string>
): string {
    if (!email) return ''
    const nick = nicknames?.[email.toLowerCase()]
    if (nick) return nick
    return email.split('@')[0]
}

/** Single uppercase initial for an avatar chip. */
export function assigneeInitial(label: string): string {
    return (label.trim().charAt(0) || '?').toUpperCase()
}

/** True if the current user may edit time fields on a task (assignee, or unassigned). */
export function canEditTaskTime(
    assignedTo: string | null | undefined,
    currentEmail: string | null | undefined
): boolean {
    if (!assignedTo) return true
    if (!currentEmail) return false
    return assignedTo.toLowerCase() === currentEmail.toLowerCase()
}
