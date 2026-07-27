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

/* ---------------- OBSERVED CAPABILITY ---------------- */

/**
 * Whether we have actually seen this capability produce data.
 *
 * systemPreferences answers a question about *this* process, but the process
 * that needs the permission is active-win's helper binary — a separate
 * executable with its own code signature, spawned per pulse. The two answers
 * can disagree, and when they do the permission API is the one that's wrong:
 * the helper has been observed returning window titles while
 * isTrustedAccessibilityClient() reported false for the main process.
 *
 * So the collector reports what it actually got, and that observation wins.
 * null means "no evidence yet" — we fall back to the permission API, which is
 * still the best guess before the first pulse.
 */
const observed: Record<DetailCapability, boolean | null> = { titles: null, urls: null }

export function recordObservation(capability: DetailCapability, succeeded: boolean) {
    observed[capability] = succeeded
}

/** Forget observations — used when an opt-in is toggled, so stale evidence
 *  from a previous state does not linger. */
export function clearObservations() {
    observed.titles = null
    observed.urls = null
}

function isCapabilityLive(capability: DetailCapability): boolean {
    return observed[capability] ?? isGranted(capability)
}

/* ---------------- QUERIES ---------------- */

export function getTrackingDetail(): TrackingDetail {
    return {
        titles: { enabled: readFlag('titles'), granted: isCapabilityLive('titles') },
        urls: { enabled: readFlag('urls'), granted: isCapabilityLive('urls') },
    }
}

/**
 * What the collector should ask active-win for.
 *
 * This is the user's opt-in ALONE — deliberately not AND-ed with the permission
 * check. Gating the request on the permission API made the failure
 * self-fulfilling: a false reading meant active-win was never called, so the
 * permission was never exercised, so nothing could ever change the reading.
 *
 * Asking is also what lets macOS prompt in the first place, and asking without
 * permission is harmless — the field simply comes back empty, which is exactly
 * the signal recordObservation() needs.
 */
export function resolveDetail(): Record<DetailCapability, boolean> {
    return {
        titles: readFlag('titles'),
        urls: readFlag('urls'),
    }
}
