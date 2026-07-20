import { useAuthStore } from '@/store/authStore'
import { useProfileStore } from '@/store/profileStore'

/**
 * Resolves the name shown for the signed-in user.
 *
 * Single source of truth so editing the display name in Settings updates the
 * greeting, sidebar, and every other surface at once. Components that derived
 * the name from the email local-part alone never reflected profile edits.
 *
 * Precedence: profile full_name -> auth metadata -> email local-part -> fallback.
 */
export function useDisplayName(fallback = 'there'): string {
    const user = useAuthStore((s) => s.user)
    const fullName = useProfileStore((s) => s.fullName)

    return (
        fullName.trim()
        || String(user?.user_metadata?.full_name || user?.user_metadata?.name || '').trim()
        || user?.email?.split('@')[0]
        || fallback
    )
}
