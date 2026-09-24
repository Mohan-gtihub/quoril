// Handles the `quoril://slack/connected` and `quoril://slack/error` deep links
// that the Slack OAuth callback redirects to once the server has recorded (or
// failed to record) the installation.
//
// Mirrors Quoril-Swift's SlackDeepLink: returning from the browser is a real
// handoff back into the app rather than a static HTML page. On a Slack deep
// link we show the same message the browser would have shown and broadcast a
// `quoril:slack-changed` event so any mounted IntegrationsSettings re-fetches
// its status. Mount this once high in the tree (e.g. Layout).
//
// NOTE (Electron main): the main process only forwards deep links whose host is
// in its allowlist. `slack` must be added there or these links never arrive.
// See the integration notes returned with this task — do not edit main here.

import { useEffect } from 'react'
import toast from 'react-hot-toast'
import { platform } from '@/services/platform'

/** Event other components (IntegrationsSettings) listen for to refresh status. */
export const SLACK_CHANGED_EVENT = 'quoril:slack-changed'

export interface SlackDeepLinkResult {
  success: boolean
  message: string
  team: string | null
}

/** Parse a raw URL. Returns null if it isn't a Slack connection deep link. */
export function parseSlackDeepLink(raw: string): SlackDeepLinkResult | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol.toLowerCase() !== 'quoril:') return null
  if (url.hostname.toLowerCase() !== 'slack') return null

  // pathname is "/connected" or "/error" (host is "slack").
  const path = url.pathname.replace(/^\/+/, '').toLowerCase()
  if (path !== 'connected' && path !== 'error') return null

  const success = path === 'connected'
  const message =
    url.searchParams.get('message') ||
    (success ? 'Slack is connected.' : 'Slack connection failed.')
  const team = url.searchParams.get('team')
  return { success, message, team }
}

function broadcast(result: SlackDeepLinkResult) {
  if (result.success) toast.success(result.message)
  else toast.error(result.message)
  window.dispatchEvent(new CustomEvent(SLACK_CHANGED_EVENT, { detail: result }))
}

/**
 * Subscribe to Slack connection deep links. Handles both the live stream and
 * any link buffered by the main process before the listener attached (cold
 * start on Windows). Auth deep links are handled elsewhere (App.tsx); this hook
 * only reacts to `quoril://slack/*` and ignores everything else.
 */
export function useSlackDeepLink() {
  useEffect(() => {
    const handle = (rawUrl: string) => {
      const result = parseSlackDeepLink(rawUrl)
      if (result) broadcast(result)
    }

    const sub = platform.auth.onDeepLink(handle)

    // Drain a link that arrived before this listener was ready.
    platform.auth
      .getPendingDeepLink()
      .then((url) => { if (url) handle(url) })
      .catch(() => {})

    return () => {
      if (sub && typeof sub === 'function') sub()
    }
  }, [])
}
