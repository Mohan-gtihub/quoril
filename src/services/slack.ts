// Slack integration client helper.
//
// Talks to the `slack-integration` Supabase Edge Function, which is the same
// function the Quoril-Swift app uses (both projects share one Supabase project).
// The function authenticates the caller with their Supabase access token and
// accepts a JSON body of { action: "status" | "start" | "disconnect" }.
//
// On "start" it returns a Slack OAuth URL. We open that URL in the user's real
// browser (Electron: platform.links.openExternal; web: full-page navigation).
// After the user approves in Slack, the function's OAuth callback redirects to
// `quoril://slack/connected?message=...&team=...`, which the desktop app picks
// up as a deep link (see src/hooks/useSlackDeepLink.ts).

import { supabase } from '@/services/supabase'
import { platform } from '@/services/platform'

export interface SlackStatus {
  connected: boolean
  team_name: string | null
  installed_at: string | null
}

const FUNCTION = 'slack-integration'

/** Whether we're running inside the Electron shell (deep-link OAuth return works). */
const isElectron = () =>
  typeof window !== 'undefined' && !!(window as any).electronAPI

/**
 * Invoke the edge function with the current user's auth token. supabase-js's
 * functions.invoke attaches the session token automatically, but we surface a
 * clear error when there's no session rather than letting the function 401.
 */
async function invoke<T>(action: 'status' | 'start' | 'disconnect'): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData.session) throw new Error('Sign in to Quoril first.')

  const { data, error } = await supabase.functions.invoke(FUNCTION, {
    body: { action },
  })

  if (error) {
    // FunctionsHttpError carries the JSON body ({ error: string }) on .context.
    const ctx = (error as any).context
    if (ctx && typeof ctx.json === 'function') {
      try {
        const body = await ctx.json()
        if (body?.error) throw new Error(body.error)
      } catch (e) {
        if (e instanceof Error && e.message) throw e
      }
    }
    throw new Error(error.message || 'Could not reach Slack.')
  }

  if (data && typeof data === 'object' && 'error' in (data as any)) {
    throw new Error((data as any).error)
  }
  return data as T
}

export async function getStatus(): Promise<SlackStatus> {
  return invoke<SlackStatus>('status')
}

export async function disconnect(): Promise<void> {
  await invoke<{ connected: boolean }>('disconnect')
}

/**
 * Begin the Slack OAuth flow. Returns the outcome so the caller can show the
 * right copy:
 *  - electron: the browser has been opened; completion arrives via deep link.
 *  - web: we navigate the current tab to Slack; this promise won't resolve
 *    normally because the page unloads.
 */
export async function startConnect(): Promise<{ opened: boolean; electron: boolean }> {
  const { url } = await invoke<{ url: string }>('start')
  if (!url) throw new Error('Slack is not configured on the server.')

  if (isElectron()) {
    const result = platform.links.openExternal(url)
    // openExternal returns Unavailable ({ available: false }) if the shell can't
    // open a browser — fall back to a normal navigation so the user isn't stuck.
    if (result && (result as any).available === false) {
      window.location.assign(url)
      return { opened: true, electron: false }
    }
    return { opened: true, electron: true }
  }

  // Web: send the whole tab to Slack. The OAuth callback returns to the
  // function, which 303-redirects to the quoril:// deep link. On web there's no
  // deep-link handler, so the user re-opens the app and hits Refresh — the
  // status then reflects the new installation.
  window.location.assign(url)
  return { opened: true, electron: false }
}
