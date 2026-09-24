// Settings → Integrations. Ports Quoril-Swift's IntegrationsSettings view: a
// Slack status card, connect/refresh/disconnect actions, and the "Send to
// Quoril" / "@Quoril" usage hints when connected.
//
// Auto-refreshes status on mount, when the window regains focus, and when a
// `quoril://slack/connected` deep link fires (via SLACK_CHANGED_EVENT). Uses
// this app's design tokens so it matches the rest of the Settings screen.

import { useCallback, useEffect, useState } from 'react'
import { Hash, Link2, MousePointerClick, AtSign, RefreshCw, Unplug } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/utils/helpers'
import { getStatus, startConnect, disconnect, type SlackStatus } from '@/services/slack'
import { SLACK_CHANGED_EVENT } from '@/hooks/useSlackDeepLink'

const EMPTY: SlackStatus = { connected: false, team_name: null, installed_at: null }

export function IntegrationsSettings() {
  const [status, setStatus] = useState<SlackStatus>(EMPTY)
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const loadStatus = useCallback(async (resetMessage = true) => {
    setWorking(true)
    try {
      const next = await getStatus()
      setStatus(next)
      if (resetMessage) setMessage(null)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not check Slack.')
    } finally {
      setWorking(false)
    }
  }, [])

  // On mount + whenever the window regains focus (mirrors the Swift scenePhase
  // refresh) + whenever a Slack deep link lands.
  useEffect(() => {
    loadStatus()
    const onFocus = () => loadStatus(false)
    const onSlackChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail as { message?: string } | undefined
      if (detail?.message) setMessage(detail.message)
      loadStatus(false)
    }
    window.addEventListener('focus', onFocus)
    window.addEventListener(SLACK_CHANGED_EVENT, onSlackChanged as EventListener)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener(SLACK_CHANGED_EVENT, onSlackChanged as EventListener)
    }
  }, [loadStatus])

  const connect = async () => {
    setWorking(true)
    setMessage(null)
    try {
      const { electron } = await startConnect()
      setMessage(
        electron
          ? 'Finish connecting in your browser. Quoril will update automatically.'
          : 'Opening Slack…',
      )
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not start Slack connection.')
    } finally {
      setWorking(false)
    }
  }

  const handleDisconnect = async () => {
    setWorking(true)
    try {
      await disconnect()
      setStatus(EMPTY)
      setMessage('Slack disconnected.')
      toast.success('Slack disconnected')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not disconnect Slack.')
    } finally {
      setWorking(false)
    }
  }

  const connected = status.connected

  return (
    <div className="flex flex-col gap-4">
      {/* Status card */}
      <div className="rounded-[var(--radius-tile)] bg-[var(--bg-card)] border border-[var(--border-default)] shadow-[var(--shadow-soft)] p-5 flex flex-col gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={cn(
              'w-[42px] h-[42px] rounded-[var(--radius-card)] flex items-center justify-center shrink-0',
              connected
                ? 'bg-[var(--accent-primary)]/12 text-[var(--accent-primary)]'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]',
            )}
          >
            <Hash className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Slack</p>
            <p className="text-xs text-[var(--text-tertiary)] truncate mt-0.5">
              {connected ? status.team_name ?? 'Connected workspace' : 'Not connected'}
            </p>
          </div>
          <span
            className={cn(
              'w-[7px] h-[7px] rounded-full shrink-0',
              connected ? 'bg-[var(--success)]' : 'bg-[var(--text-muted)]',
            )}
            aria-label={connected ? 'Connected' : 'Not connected'}
          />
        </div>

        {connected ? (
          <>
            <div className="flex flex-col gap-2 text-xs text-[var(--text-secondary)]">
              <div className="flex items-start gap-2">
                <MousePointerClick className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[var(--text-muted)]" />
                <span>Use <strong className="font-semibold text-[var(--text-primary)]">More actions → Send to Quoril</strong> on any Slack message.</span>
              </div>
              <div className="flex items-start gap-2">
                <AtSign className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[var(--text-muted)]" />
                <span>Or mention <strong className="font-semibold text-[var(--text-primary)]">@Quoril</strong> followed by <em>task</em> and the work to capture.</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => loadStatus()}
                disabled={working}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-card)] text-xs font-semibold text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--border-default)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', working && 'animate-spin')} />
                Refresh
              </button>
              <button
                onClick={handleDisconnect}
                disabled={working}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-card)] text-xs font-semibold text-[var(--error)] bg-[var(--error)]/10 hover:bg-[var(--error)]/15 active:scale-95 disabled:opacity-50 transition-all"
              >
                <Unplug className="w-3.5 h-3.5" />
                Disconnect Slack
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={connect}
            disabled={working}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--radius-card)] text-sm font-semibold bg-[var(--accent-primary)] text-[var(--accent-contrast)] hover:brightness-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Link2 className="w-4 h-4" />
            {working ? 'Connecting…' : 'Connect Slack workspace'}
          </button>
        )}

        {message && (
          <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">{message}</p>
        )}
      </div>

      <p className="text-xs text-[var(--text-muted)] leading-relaxed px-1">
        Quoril receives only messages you explicitly send to it or messages that
        mention the Quoril bot. Slack credentials remain on the server and are
        never stored on this device.
      </p>
    </div>
  )
}
