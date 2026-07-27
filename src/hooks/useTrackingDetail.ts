import { useCallback, useEffect, useState } from 'react'
import { platform } from '@/services/platform'
import { logger } from '@/services/logger'
import type { DetailCapability, TrackingDetail } from '@/services/platform/types'

/**
 * Drives the two detailed-tracking opt-ins.
 *
 * The flow deliberately never lets the collector be the thing that prompts:
 * we check the OS grant first, ask for it explicitly if missing, and only then
 * persist the opt-in. See electron/main/core/trackingDetail.ts.
 *
 * The two capabilities differ in how the grant is obtained:
 *   urls   → Accessibility, which macOS can prompt for in-app.
 *   titles → Screen Recording, which has no prompt API. The user must grant it
 *            in System Settings and relaunch, so enabling it can end in a
 *            'needs-relaunch' outcome the caller has to surface.
 */

export type EnableOutcome =
    | { status: 'enabled' }
    | { status: 'disabled' }
    /** Permission missing; System Settings opened. Grant is picked up on refocus. */
    | { status: 'needs-permission'; capability: DetailCapability }
    /** Granted, but macOS won't apply it until the app restarts. */
    | { status: 'needs-relaunch' }
    | { status: 'unavailable' }

export function useTrackingDetail() {
    const [detail, setDetail] = useState<TrackingDetail | null>(null)
    const [busy, setBusy] = useState(false)

    const refresh = useCallback(async () => {
        const next = await platform.screenTime.getTrackingDetail?.()
        setDetail(next ?? null)
        return next ?? null
    }, [])

    useEffect(() => { void refresh() }, [refresh])

    // A grant made in System Settings produces no event in our process, so
    // re-check whenever the user comes back to the window.
    useEffect(() => {
        const onFocus = () => { void refresh() }
        window.addEventListener('focus', onFocus)
        return () => window.removeEventListener('focus', onFocus)
    }, [refresh])

    const setEnabled = useCallback(
        async (capability: DetailCapability, enabled: boolean): Promise<EnableOutcome> => {
            setBusy(true)
            try {
                if (!enabled) {
                    // Turning off never touches the OS — the grant can stay, we
                    // simply stop asking for the data.
                    const next = await platform.screenTime.setTrackingDetail?.(capability, false)
                    setDetail(next ?? null)
                    logger.info('tracking.detail_disabled', { capability })
                    return { status: 'disabled' }
                }

                const current = await refresh()
                if (!current) return { status: 'unavailable' }

                // Persist the opt-in BEFORE asking for the permission. The flag is
                // the user's intent, and it's inert on its own — resolveDetail()
                // AND-s it with the live grant, so nothing is collected until the
                // OS agrees. Recording it now is what lets the grant take effect
                // by itself when the user returns from System Settings, and what
                // drives the "waiting on permission" state in the UI.
                const next = await platform.screenTime.setTrackingDetail?.(capability, true)
                setDetail(next ?? null)

                if (!current[capability].granted) {
                    if (capability === 'urls') {
                        // Accessibility is the only one macOS lets us prompt for.
                        const result = await platform.screenTime.requestAccessibility?.()
                        if (result?.granted) {
                            setDetail(result.detail)
                            logger.info('tracking.detail_enabled', { capability })
                            return { status: 'enabled' }
                        }
                    }
                    // Screen Recording has no prompt API, and a declined
                    // Accessibility prompt also lands here. Send them to the pane.
                    await platform.screenTime.openPrivacySettings?.(capability)
                    logger.info('tracking.detail_permission_requested', { capability })
                    return { status: 'needs-permission', capability }
                }

                logger.info('tracking.detail_enabled', { capability })

                // Screen Recording is only actually applied to a running process
                // after a restart, even once granted.
                if (capability === 'titles') return { status: 'needs-relaunch' }
                return { status: 'enabled' }
            } finally {
                setBusy(false)
            }
        },
        [refresh],
    )

    const relaunch = useCallback(() => platform.screenTime.relaunch?.(), [])

    return { detail, busy, setEnabled, refresh, relaunch }
}
