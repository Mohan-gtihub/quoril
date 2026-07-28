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
    if (capability === 'urls') recordUrlOutcome(succeeded)
}

/** Forget observations — used when an opt-in is toggled, so stale evidence
 *  from a previous state does not linger. */
export function clearObservations() {
    observed.titles = null
    observed.urls = null
    // Restore the prompt budget too: this is called when the user toggles an
    // opt-in or explicitly asks for the permission, which is exactly the moment
    // a fresh attempt is warranted — and the only moment a prompt is expected.
    resetPromptBudget()
}

function isCapabilityLive(capability: DetailCapability): boolean {
    return observed[capability] ?? isGranted(capability)
}

/* ---------------- PROMPT BUDGET ---------------- */

/**
 * active-win's helper calls AXIsProcessTrustedWithOptions with the *prompting*
 * option set (verified: the binary imports _AXIsProcessTrustedWithOptions and
 * carries the AXTrustedCheckOptionPrompt key). It is a fresh short-lived
 * process on every pulse, and the tracking loop pulses every 5 seconds — so
 * anything that lets a pulse ask for a url while the grant is not effective
 * produces a system modal every 5 seconds, forever.
 *
 * The grant can be ineffective even with Quoril switched on in System Settings:
 * the TCC record is matched against the binary's signature, so a rebuilt or
 * re-signed app can leave a row that is toggled on but no longer matches, and
 * the helper keeps being told "not trusted".
 *
 * THIS APPLIES TO urls ONLY, and the asymmetry is deliberate:
 *
 *   urls   — the Accessibility check re-prompts on every helper invocation, and
 *            an empty url is only ever recorded when a url-capable browser was
 *            frontmost, so the evidence is meaningful.
 *
 *   titles — an empty title is what the helper returns BOTH when Screen
 *            Recording is denied and when the frontmost app simply has no
 *            window (verified: Finder with no window, menu-bar-only apps).
 *            The two are indistinguishable, so treating an empty title as
 *            proof of a missing permission would silently switch off a feature
 *            the user turned on, on the strength of them looking at the
 *            desktop. Screen Recording also does not re-prompt per call the
 *            way the Accessibility check does, so there is no storm to stop.
 */
const PROBE_BUDGET = 2
const FAILURE_STREAK_LIMIT = 3
let urlProbesUsed = 0
let urlFailureStreak = 0

/** Count consecutive url failures; any success resets. Only urls suppress. */
function recordUrlOutcome(succeeded: boolean) {
    urlFailureStreak = succeeded ? 0 : urlFailureStreak + 1
}

function resetPromptBudget() {
    urlProbesUsed = 0
    urlFailureStreak = 0
}

function mayAsk(capability: DetailCapability): boolean {
    if (process.platform !== 'darwin') return true
    // Titles are governed by the opt-in alone — see the asymmetry above.
    if (capability === 'titles') return true

    // Proven to work — no prompt can result.
    if (observed.urls === true) return true

    // Repeatedly asked in a browser and got nothing back. Asking again cannot
    // produce data; it can only re-fire the dialog. This has to outrank
    // isGranted(), because the case that hurts is precisely the one where the
    // OS claims the grant exists and the helper is still refused. A streak
    // rather than a single failure, so one odd pulse (a blank tab, a browser
    // mid-launch) cannot switch the feature off.
    if (urlFailureStreak >= FAILURE_STREAK_LIMIT) return false

    // A reported grant is good enough to try without burning budget; otherwise
    // allow a couple of probes so a wrong "false" reading cannot permanently
    // disable the capability. That was the self-fulfilling failure this file
    // warns about: never asking means never finding out.
    if (isGranted('urls')) return true
    return urlProbesUsed++ < PROBE_BUDGET
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
 * The user's opt-in, narrowed by mayAsk(). It is deliberately NOT a plain AND
 * with the permission check: gating purely on the permission API made the
 * failure self-fulfilling — a false reading meant active-win was never called,
 * so the permission was never exercised, so nothing could ever change the
 * reading. mayAsk() keeps that escape hatch (a bounded number of probes) while
 * refusing to ask forever, because "ask anyway" is not free on macOS: each ask
 * with an ineffective grant is another system modal, five seconds apart.
 */
export function resolveDetail(): Record<DetailCapability, boolean> {
    return {
        titles: readFlag('titles') && mayAsk('titles'),
        urls: readFlag('urls') && mayAsk('urls'),
    }
}
