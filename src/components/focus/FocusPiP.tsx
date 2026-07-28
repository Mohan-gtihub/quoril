import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useFocusStore } from '@/store/focusStore'
import { useTaskStore } from '@/store/taskStore'
import { useTimerDisplay } from '@/hooks/useTimerDisplay'

export function canUsePiP(): boolean {
  return typeof window !== 'undefined' && 'documentPictureInPicture' in window
}

function formatTime(sec: number): string {
  const s = Math.abs(Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`
  }
  return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`
}

/** Compact timer content shown inside the PiP or pinned panel */
function FocusPiPContent() {
  const { taskId } = useFocusStore()
  const { tasks } = useTaskStore()
  const { displayTime, isOvertime, isBreak, isPaused } = useTimerDisplay()

  const activeTask = tasks.find(t => t.id === taskId)
  const title = activeTask?.title ?? (isBreak ? 'Break' : 'No active task')

  const timeValue = isBreak ? displayTime : (isOvertime ? -displayTime : displayTime)
  const label = isBreak ? 'Break' : isPaused ? 'Paused' : isOvertime ? 'Overtime' : 'Focusing'

  return (
    <div className="focus-pip-content">
      <div className="focus-pip-label">{label}</div>
      <div className="focus-pip-time">{formatTime(timeValue)}</div>
      <div className="focus-pip-task" title={title}>{title}</div>
    </div>
  )
}

interface FocusPiPProps {
  children?: React.ReactNode
}

export function FocusPiP({ children }: FocusPiPProps) {
  const [pipBody, setPipBody] = useState<HTMLElement | null>(null)
  const [pipError, setPipError] = useState(false)
  const pipRef = useRef<any>(null)

  async function open() {
    if (!canUsePiP()) {
      setPipError(true)
      return
    }
    try {
      const pip = await (window as any).documentPictureInPicture.requestWindow({
        width: 320,
        height: 160,
      })
      // Copy styles so the timer is themed
      document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
        pip.document.head.appendChild(node.cloneNode(true))
      })
      pip.addEventListener('pagehide', () => {
        setPipBody(null)
        pipRef.current = null
      })
      pipRef.current = pip
      setPipBody(pip.document.body)
      setPipError(false)
    } catch {
      // API rejected (no user gesture context, unsupported, etc.) — fall back to pinned panel
      setPipError(true)
    }
  }

  function close() {
    try {
      pipRef.current?.close?.()
    } catch {
      // ignore
    }
    pipRef.current = null
    setPipBody(null)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      close()
    }
  }, [])

  const isPopped = pipBody !== null

  return (
    <>
      {canUsePiP() && !pipError && (
        <button
          onClick={isPopped ? close : open}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors px-2 py-1 rounded border border-[var(--border-default)] hover:border-[var(--border-hover)] bg-[var(--bg-tertiary)]"
        >
          {isPopped ? 'Dock timer' : 'Pop out timer'}
        </button>
      )}
      {isPopped
        ? createPortal(children ?? <FocusPiPContent />, pipBody!)
        : (
          <div className="focus-pinned-panel">
            {children ?? <FocusPiPContent />}
          </div>
        )}
    </>
  )
}
