import { useEffect, useRef, useState } from 'react'
import { platform } from '@/services/platform'

export interface SessionDistraction {
    distractionSeconds: number
    byCategory: { category: string; seconds: number }[]
}

const EMPTY: SessionDistraction = { distractionSeconds: 0, byCategory: [] }
const POLL_MS = 25_000

/**
 * Live distraction for the current focus sitting — distracting app/website time
 * overlapping [sessionStartedAt, now]. Polls the main process on an interval while
 * a session is active. Returns zeros on web / when app-tracking is unavailable.
 */
export function useSessionDistraction(sessionStartedAt: number | null, active: boolean): SessionDistraction {
    const [data, setData] = useState<SessionDistraction>(EMPTY)
    const timer = useRef<ReturnType<typeof setInterval> | null>(null)

    useEffect(() => {
        const api = window.electronAPI?.reports?.getSessionDistraction
        if (!active || !sessionStartedAt || !platform.capabilities.appTracking || !api) {
            setData(EMPTY)
            return
        }

        let cancelled = false
        const startISO = new Date(sessionStartedAt).toISOString()
        const poll = async () => {
            try {
                const res = await api({ startISO, endISO: new Date().toISOString() })
                if (!cancelled && res) setData(res)
            } catch { /* transient IPC error — keep last value */ }
        }

        poll()
        timer.current = setInterval(poll, POLL_MS)
        return () => {
            cancelled = true
            if (timer.current) clearInterval(timer.current)
        }
    }, [sessionStartedAt, active])

    return data
}
