// Assembles and submits an alpha/beta feedback report: the tester's message +
// auto-captured context (route, version, platform, recent console errors) and
// an optional screenshot uploaded to Supabase Storage.
//
// Writes go straight through the authenticated Supabase client; RLS
// (supabase/alpha_feedback.sql) enforces that only tester-role users can
// insert, and only their own rows.

import { supabase } from '@/services/supabase'
import { platform } from '@/services/platform'
import { getConsoleBuffer } from '@/services/consoleBuffer'
import { useSettingsStore } from '@/store/settingsStore'
import { useFocusStore } from '@/store/focusStore'

declare const __APP_VERSION__: string

export type FeedbackType = 'bug' | 'idea' | 'confusing'

export interface SubmitFeedbackInput {
    type: FeedbackType
    message: string
    includeScreenshot: boolean
}

function appVersion(): string {
    try { return __APP_VERSION__ } catch { return '0.0.0' }
}

function currentRoute(): string {
    // HashRouter → the route lives after '#'.
    const h = window.location.hash || ''
    return h.replace(/^#/, '') || '/'
}

function platformName(): string {
    return platform.capabilities.nativeOverlay ? 'electron' : 'web'
}

/** A small, non-sensitive snapshot of app mode state — the bug-prone bits. */
function appStateSnapshot(): Record<string, unknown> {
    try {
        const s = useSettingsStore.getState()
        const f = useFocusStore.getState()
        return {
            theme: s.theme,
            superFocusMode: s.superFocusMode,
            focus: { isActive: f.isActive, isPaused: f.isPaused, isBreak: f.isBreak },
            viewport: { w: window.innerWidth, h: window.innerHeight },
            userAgent: navigator.userAgent,
        }
    } catch {
        return {}
    }
}

async function uploadScreenshot(userId: string): Promise<string | null> {
    const shot = await platform.feedback.captureScreen()
    if (typeof shot !== 'string') return null // Unavailable (web) or capture failed

    // shot is a data URL: "data:image/png;base64,...."
    const comma = shot.indexOf(',')
    if (comma === -1) return null
    const bytes = Uint8Array.from(atob(shot.slice(comma + 1)), (c) => c.charCodeAt(0))

    const path = `${userId}/${crypto.randomUUID()}.png`
    const { error } = await supabase.storage
        .from('feedback-screenshots')
        .upload(path, bytes, { contentType: 'image/png', upsert: false })
    if (error) {
        console.error('[feedback] screenshot upload failed', error.message)
        return null
    }
    return path
}

export async function submitFeedback(input: SubmitFeedbackInput): Promise<void> {
    const message = input.message.trim()
    if (!message) throw new Error('Please describe what happened.')

    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    if (!user) throw new Error('You must be signed in to send feedback.')

    let screenshotPath: string | null = null
    if (input.includeScreenshot) {
        try {
            screenshotPath = await uploadScreenshot(user.id)
        } catch (err) {
            // A screenshot failure must never block the report itself.
            console.error('[feedback] screenshot step failed', err)
        }
    }

    // Cast matches the codebase convention for inserts (see localStorage.ts):
    // the generated Database generic doesn't line up with supabase-js v2's
    // insert overloads, so feature code inserts through `as any`.
    const { error } = await (supabase.from('feedback') as any).insert({
        user_id: user.id,
        user_email: user.email ?? null,
        type: input.type,
        message,
        route: currentRoute(),
        app_version: appVersion(),
        platform: platformName(),
        os_version: navigator.platform || null,
        app_state: appStateSnapshot(),
        console_logs: getConsoleBuffer(),
        screenshot_path: screenshotPath,
    })

    if (error) throw new Error(error.message)
}
