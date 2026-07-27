/* ---------------- DETAILED TRACKING PREFERENCES ----------------
 * Two independent opt-ins that control how much the collector may see:
 *
 *   urls   → website addresses in browsers   (macOS: Accessibility permission)
 *   titles → window titles                   (macOS: Screen Recording permission)
 *
 * Both default OFF. With neither, the collector keeps its permission-free
 * behaviour and records app names only.
 *
 * THE CENTRAL INVARIANT: the stored flag is the *user's intent*, and it is not
 * the same thing as the OS grant. active-win triggers the macOS permission
 * prompt as a side effect of being asked for a title/url, so passing `true`
 * speculatively would fire a system dialog at an arbitrary moment during a
 * background pulse. The collector may therefore only enable a capability when
 * the user opted in AND the grant is already in place — see resolveDetail().
 *
 * Stored in db_meta (main-process owned, readable at boot, before any renderer
 * window exists). Renderer settings live in localStorage and are unavailable
 * to the tracking engine when it starts.
 */

import { systemPreferences } from 'electron'
import { dbOps } from '../db'

export type DetailCapability = 'titles' | 'urls'

export interface CapabilityState {
    /** The user turned this on. */
    enabled: boolean
    /** The OS has actually granted the underlying permission. */
    granted: boolean
}

export type TrackingDetail = Record<DetailCapability, CapabilityState>

const KEYS: Record<DetailCapability, string> = {
    titles: 'tracking.detail.titles',
    urls: 'tracking.detail.urls',
}

/* ---------------- PREFERENCE STORAGE ---------------- */

function readFlag(capability: DetailCapability): boolean {
    try {
        const rows = dbOps.exec('SELECT value FROM db_meta WHERE key=?', [KEYS[capability]]) as
            | { value: string }[]
            | undefined
        return rows?.[0]?.value === '1'
    } catch {
        // A read failure must never enable a capability — fail closed.
        return false
    }
}

export function setFlag(capability: DetailCapability, enabled: boolean) {
    dbOps.exec('INSERT OR REPLACE INTO db_meta (key,value) VALUES (?,?)', [
        KEYS[capability],
        enabled ? '1' : '0',
    ])
}

/* ---------------- OS GRANTS ---------------- */

/**
 * Is the underlying OS permission in place?
 *
 * Only macOS gates these. Windows and Linux hand active-win titles and URLs
 * with no permission model, so they report granted and the capability is
 * governed by the user's flag alone.
 *
 * The Accessibility check passes prompt=false deliberately: this runs on every
 * status read, including at boot, and must never surface a dialog. Prompting is
 * an explicit, user-initiated action (see requestAccessibility).
 */
export function isGranted(capability: DetailCapability): boolean {
    if (process.platform !== 'darwin') return true

    try {
        if (capability === 'urls') {
            return systemPreferences.isTrustedAccessibilityClient(false)
        }
        // Screen Recording. Electron exposes no request API for it; the user has
        // to grant it in System Settings and relaunch.
        return systemPreferences.getMediaAccessStatus('screen') === 'granted'
    } catch {
        return false
    }
}

/**
 * Show the macOS Accessibility prompt. This is the only call in the codebase
 * allowed to surface it, and only from an explicit user action.
 */
export function requestAccessibility(): boolean {
    if (process.platform !== 'darwin') return true
    try {
        return systemPreferences.isTrustedAccessibilityClient(true)
    } catch {
        return false
    }
}

/* ---------------- QUERIES ---------------- */

export function getTrackingDetail(): TrackingDetail {
    return {
        titles: { enabled: readFlag('titles'), granted: isGranted('titles') },
        urls: { enabled: readFlag('urls'), granted: isGranted('urls') },
    }
}

/**
 * What the collector is actually allowed to ask for right now.
 *
 * A capability is live only when the user opted in AND the OS granted it.
 * If the user revokes the permission in System Settings, the flag stays on but
 * this returns false, so we silently degrade instead of re-prompting.
 */
export function resolveDetail(): Record<DetailCapability, boolean> {
    const detail = getTrackingDetail()
    return {
        titles: detail.titles.enabled && detail.titles.granted,
        urls: detail.urls.enabled && detail.urls.granted,
    }
}
