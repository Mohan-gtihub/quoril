import { useEffect, useState } from 'react'
import { platform } from '@/services/platform'
import type { UpdateStatus } from '@/services/platform/types'

/**
 * Subscribes to the silent auto-update lifecycle. Returns the current status
 * plus a `restart()` action. On web (or any non-electron target) this stays
 * `not-available` and does nothing.
 */
export function useAppUpdate() {
    const [status, setStatus] = useState<UpdateStatus>({ state: 'idle' })

    useEffect(() => {
        let mounted = true

        // Pull the current status on mount so we render correctly even if the
        // updater already progressed before this component subscribed.
        platform.updates.getStatus().then((s) => { if (mounted) setStatus(s) }).catch(() => {})

        const off = platform.updates.onStatus((s) => { if (mounted) setStatus(s) })

        return () => {
            mounted = false
            if (typeof off === 'function') off()
        }
    }, [])

    const restart = () => platform.updates.restartAndInstall().catch(() => false)
    const check = () => platform.updates.check().catch(() => {})

    return { status, restart, check }
}
