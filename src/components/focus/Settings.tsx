import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    ArrowLeft, Play, Check, Palette, Timer, Target,
    Maximize2, Bell, Send, ShieldCheck, CheckCircle2, Plus, Minus
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSettingsStore } from '@/store/settingsStore'
import { useFocusStore } from '@/store/focusStore'
import { soundService } from '@/services/soundService'
import { cn } from '@/utils/helpers'

// ── Shared UI primitives ─────────────────────────────────────

function Field({ label, description, children, htmlFor }: any) {
    return (
        <div className="flex flex-col gap-3 py-5 border-b border-[var(--border-default)] last:border-0">
            <div className="min-w-0">
                <label htmlFor={htmlFor} className="text-sm font-semibold text-[var(--text-primary)]">{label}</label>
                {description && <p className="text-xs text-[var(--text-tertiary)] leading-relaxed mt-0.5 max-w-md">{description}</p>}
            </div>
            {children}
        </div>
    )
}

function ToggleRow({ label, description, value, onChange }: any) {
    return (
        <label className="flex items-center justify-between gap-6 cursor-pointer group py-5 border-b border-[var(--border-default)] last:border-0">
            <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
                {description && <p className="text-xs text-[var(--text-tertiary)] mt-0.5 leading-relaxed max-w-md">{description}</p>}
            </div>
            <input
                type="checkbox"
                checked={!!value}
                onChange={(e) => onChange?.(e.target.checked)}
                className="sr-only"
            />
            <div className={cn(
                "relative w-[44px] h-6 rounded-full transition-colors duration-300 ease-in-out shrink-0",
                value ? "bg-[var(--accent-primary)]" : "bg-[var(--bg-tertiary)] group-hover:bg-[var(--bg-hover-strong)]"
            )}>
                <div className={cn(
                    "absolute top-[3px] w-[18px] h-[18px] bg-white rounded-full transition-transform duration-300 ease-in-out shadow-sm",
                    value ? "left-[23px]" : "left-[3px]"
                )} />
            </div>
        </label>
    )
}

function SegmentedControl({ options, value, onChange }: any) {
    return (
        <div className="flex flex-wrap gap-1.5 p-1.5 bg-[var(--bg-tertiary)] rounded-[var(--radius-card)]">
            {options.map((opt: any) => {
                const active = value === opt.value
                return (
                    <button
                        key={opt.value}
                        onClick={() => onChange(opt.value)}
                        className={cn(
                            "flex-1 min-w-[64px] px-3 py-2 rounded-[calc(var(--radius-card)-4px)] text-xs font-semibold transition-all whitespace-nowrap",
                            active
                                ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-[var(--shadow-soft)]"
                                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                        )}
                    >
                        {opt.label}
                    </button>
                )
            })}
        </div>
    )
}

function OptionGrid({ options, value, onChange, onPreview }: any) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {options.map((opt: any) => {
                const active = value === opt.value
                return (
                    <button
                        key={opt.value}
                        onClick={() => {
                            onChange(opt.value)
                            if (onPreview) onPreview(opt.value)
                        }}
                        className={cn(
                            "flex items-center justify-between px-4 py-3 rounded-[var(--radius-card)] text-xs font-semibold transition-all group border",
                            active
                                ? "bg-[var(--accent-primary)] border-[var(--accent-primary)] text-[var(--accent-contrast)]"
                                : "bg-[var(--bg-secondary)] border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
                        )}
                    >
                        <span className="truncate">{opt.label}</span>
                        {active ? (
                            <Check className="w-4 h-4 shrink-0" />
                        ) : (
                            onPreview && <Play className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        )}
                    </button>
                )
            })}
        </div>
    )
}

function fmtMinutes(v: number) {
    const h = Math.floor(v / 60)
    const m = v % 60
    if (h > 0 && m > 0) return `${h}h ${m}m`
    if (h > 0) return `${h}h`
    return `${m}m`
}

// Professional goal control: a big readout with −/+ steppers and quick presets.
function GoalStepper({ label, description, value, onChange, min, max, step, presets }: any) {
    const set = (v: number) => onChange(Math.max(min, Math.min(max, v)))
    return (
        <div className="flex flex-col gap-4 py-5 border-b border-[var(--border-default)] last:border-0">
            <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
                    {description && <p className="text-xs text-[var(--text-tertiary)] mt-0.5 leading-relaxed max-w-md">{description}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => set(value - step)}
                        disabled={value <= min}
                        className="w-9 h-9 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        aria-label="Decrease"
                    >
                        <Minus className="w-4 h-4" />
                    </button>
                    <div className="min-w-[88px] text-center px-3 py-2 rounded-[var(--radius-card)] bg-[var(--bg-tertiary)]">
                        <span className="text-base font-semibold text-[var(--text-primary)] tabular-nums">{fmtMinutes(value)}</span>
                    </div>
                    <button
                        onClick={() => set(value + step)}
                        disabled={value >= max}
                        className="w-9 h-9 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        aria-label="Increase"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
                {presets.map((p: number) => {
                    const active = value === p
                    return (
                        <button
                            key={p}
                            onClick={() => set(p)}
                            className={cn(
                                "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border",
                                active
                                    ? "bg-[var(--accent-primary)] border-[var(--accent-primary)] text-[var(--accent-contrast)]"
                                    : "bg-[var(--bg-secondary)] border-[var(--border-default)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]"
                            )}
                        >
                            {fmtMinutes(p)}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

// A titled block within a section panel.
function Group({ title, children, className }: any) {
    return (
        <div className={className}>
            {title && <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">{title}</p>}
            <div className="px-6 py-1.5 rounded-[var(--radius-tile)] bg-[var(--bg-card)] border border-[var(--border-default)] shadow-[var(--shadow-soft)]">
                {children}
            </div>
        </div>
    )
}

// ── Section navigation config ────────────────────────────────

const SECTIONS = [
    { id: 'appearance', label: 'Appearance', icon: Palette, desc: 'Theme and how much detail shows on task cards.' },
    { id: 'focus', label: 'Focus & Breaks', icon: Timer, desc: 'Tune the length of your focus sprints and breaks.' },
    { id: 'goals', label: 'Daily Goal', icon: Target, desc: 'Set your daily focus target and how it’s celebrated.' },
    { id: 'reminders', label: 'Reminders', icon: Bell, desc: 'Gentle cues to keep your attention from drifting.' },
    { id: 'notifications', label: 'Notifications', icon: Send, desc: 'System notifications and sounds for timers and tasks.' },
    { id: 'superfocus', label: 'Super Focus', icon: Maximize2, desc: 'Collapse the app to a minimal floating pill.' },
    { id: 'about', label: 'App Tracking', icon: ShieldCheck, desc: 'How Quoril records the apps you use.' },
] as const

type SectionId = typeof SECTIONS[number]['id']

// ── Main Page ────────────────────────────────────────────────

export function Settings() {
    const navigate = useNavigate()
    const settings = useSettingsStore()
    const [active, setActive] = useState<SectionId>('appearance')
    const [platform, setPlatform] = useState<string>('')

    useEffect(() => {
        window.electronAPI?.app?.getPlatform?.().then(setPlatform)
    }, [])

    const handlePomodoroLengthChange = (valStr: string) => {
        const newLength = parseInt(valStr)
        settings.updateSettings({ pomodoroLength: newLength })

        const focus = useFocusStore.getState()
        if (!focus.isActive || focus.isPaused) {
            const newSeconds = newLength * 60
            useFocusStore.setState({
                pomodoroTotal: newSeconds,
                pomodoroRemaining: newSeconds,
                pomodoroRemainingAtStart: newSeconds
            })
        }
    }

    // macOS-only section is hidden elsewhere; drop it from the rail on other OSes.
    const sections = SECTIONS.filter(s => s.id !== 'about' || platform === 'darwin')
    const activeSection = sections.find(s => s.id === active) ?? sections[0]

    return (
        <div className="flex-1 overflow-hidden w-full h-full flex flex-col">
            {/* Header */}
            <header className="shrink-0 px-6 md:px-10 pt-8 pb-5 flex items-center gap-4 border-b border-[var(--border-default)]">
                <button
                    onClick={() => navigate(-1)}
                    className="w-9 h-9 rounded-full bg-[var(--bg-card)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)] flex items-center justify-center transition-all hover:-translate-x-0.5"
                >
                    <ArrowLeft className="w-[18px] h-[18px] text-[var(--text-secondary)]" />
                </button>
                <h1 className="text-[24px] md:text-[28px] leading-none font-semibold tracking-tight text-[var(--text-primary)]">Settings</h1>
            </header>

            {/* Body: nav rail + content */}
            <div className="flex-1 min-h-0 flex">
                {/* Left rail */}
                <nav className="shrink-0 w-[210px] md:w-[248px] border-r border-[var(--border-default)] px-3 py-4 overflow-y-auto custom-scrollbar">
                    <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Categories</p>
                    {sections.map(({ id, label, icon: Icon }) => {
                        const isActive = id === activeSection.id
                        return (
                            <button
                                key={id}
                                onClick={() => setActive(id)}
                                className={cn(
                                    "relative w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-card)] text-sm font-semibold transition-colors mb-0.5 text-left",
                                    isActive
                                        ? "text-[var(--text-primary)]"
                                        : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                                )}
                            >
                                {isActive && (
                                    <motion.span
                                        layoutId="settings-rail-active"
                                        className="absolute inset-0 rounded-[var(--radius-card)] bg-[var(--bg-tertiary)]"
                                        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                                    />
                                )}
                                <Icon className={cn("relative w-[18px] h-[18px] shrink-0", isActive ? "text-[var(--accent-primary)]" : "")} />
                                <span className="relative truncate">{label}</span>
                            </button>
                        )
                    })}
                </nav>

                {/* Content */}
                <div className="flex-1 min-w-0 overflow-y-auto custom-scrollbar">
                    <div className="w-full max-w-3xl px-6 md:px-10 lg:px-12 py-8 pb-24">
                        <div className="flex items-start gap-3.5 mb-7">
                            <div className="w-10 h-10 rounded-[var(--radius-card)] bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0 text-[var(--accent-primary)]">
                                <activeSection.icon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 pt-0.5">
                                <h2 className="text-lg font-semibold text-[var(--text-primary)] tracking-tight leading-none">{activeSection.label}</h2>
                                <p className="text-xs text-[var(--text-tertiary)] mt-1.5 leading-relaxed">{activeSection.desc}</p>
                            </div>
                        </div>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeSection.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.2, ease: 'easeOut' }}
                                className="flex flex-col gap-7"
                            >
                                {activeSection.id === 'appearance' && (
                                    <>
                                        <Group title="Theme">
                                            <Field label="Color theme" description="Sets the overall look of the app.">
                                                <SegmentedControl
                                                    value={settings.theme}
                                                    onChange={(v: string) => settings.updateSettings({ theme: v as any })}
                                                    options={[
                                                        { label: 'Daylight', value: 'daylight' },
                                                        { label: 'Onyx Dark', value: 'dark' },
                                                        { label: 'Arcade Blue', value: 'blue' },
                                                        { label: 'Sunset Red', value: 'red' },
                                                        { label: 'Cosmic Nebula', value: 'nebula' }
                                                    ]}
                                                />
                                            </Field>
                                        </Group>
                                        <Group title="Task cards">
                                            <ToggleRow
                                                label="Minimal task cards"
                                                description="Hide estimated and completed times on task cards to reduce visual noise."
                                                value={settings.hideEstDoneTimes}
                                                onChange={(v: boolean) => settings.updateSettings({ hideEstDoneTimes: v })}
                                            />
                                            <ToggleRow
                                                label="Scrolling titles"
                                                description="Slide long mission names smoothly in the status bar instead of truncating."
                                                value={settings.scrollingTitle}
                                                onChange={(v: boolean) => settings.updateSettings({ scrollingTitle: v })}
                                            />
                                        </Group>
                                    </>
                                )}

                                {activeSection.id === 'focus' && (
                                    <Group title="Pomodoro">
                                        <ToggleRow
                                            label="Pomodoro timer"
                                            description="Suggest a break automatically after each focus sprint."
                                            value={settings.pomodorosEnabled}
                                            onChange={(v: boolean) => settings.updateSettings({ pomodorosEnabled: v })}
                                        />
                                        {settings.pomodorosEnabled && (
                                            <>
                                                <Field label="Focus length" description="How long each focus sprint runs.">
                                                    <SegmentedControl
                                                        value={(settings.pomodoroLength || 25).toString()}
                                                        onChange={handlePomodoroLengthChange}
                                                        options={[
                                                            { label: '15m', value: '15' },
                                                            { label: '25m', value: '25' },
                                                            { label: '45m', value: '45' },
                                                            { label: '60m', value: '60' }
                                                        ]}
                                                    />
                                                </Field>
                                                <Field label="Break length" description="How long each suggested break lasts.">
                                                    <SegmentedControl
                                                        value={settings.defaultBreakLength.toString()}
                                                        onChange={(v: string) => settings.updateSettings({ defaultBreakLength: parseInt(v) })}
                                                        options={[
                                                            { label: '5m', value: '5' },
                                                            { label: '10m', value: '10' },
                                                            { label: '15m', value: '15' },
                                                            { label: '25m', value: '25' }
                                                        ]}
                                                    />
                                                </Field>
                                            </>
                                        )}
                                    </Group>
                                )}

                                {activeSection.id === 'goals' && (
                                    <Group title="Daily goal">
                                        <GoalStepper
                                            label="Daily focus goal"
                                            description="Minimum focused time to count the day as a success."
                                            value={settings.dailyFocusGoalMinutes}
                                            onChange={(v: number) => settings.updateSettings({ dailyFocusGoalMinutes: v })}
                                            min={30}
                                            max={480}
                                            step={15}
                                            presets={[60, 120, 180, 240, 360, 480]}
                                        />
                                        <ToggleRow
                                            label="Celebration screen"
                                            description="Show a celebration when a focus session ends."
                                            value={settings.showSuccessScreen}
                                            onChange={(v: boolean) => settings.updateSettings({ showSuccessScreen: v })}
                                        />
                                        {settings.showSuccessScreen && (
                                            <ToggleRow
                                                label="Celebration GIF"
                                                description="Show a fun GIF on the celebration screen."
                                                value={settings.funGifEnabled}
                                                onChange={(v: boolean) => settings.updateSettings({ funGifEnabled: v })}
                                            />
                                        )}
                                    </Group>
                                )}

                                {activeSection.id === 'reminders' && (
                                    <Group title="Timed reminders">
                                        <ToggleRow
                                            label="Timed reminders"
                                            description="Play a subtle cue at a set interval during focus sessions."
                                            value={settings.timedAlertsEnabled}
                                            onChange={(v: boolean) => settings.updateSettings({ timedAlertsEnabled: v })}
                                        />
                                        {settings.timedAlertsEnabled && (
                                            <>
                                                <Field label="Reminder interval" description="How often a reminder cue plays.">
                                                    <SegmentedControl
                                                        value={settings.alertInterval.toString()}
                                                        onChange={(v: string) => settings.updateSettings({ alertInterval: parseInt(v) })}
                                                        options={[
                                                            { label: '5m', value: '5' },
                                                            { label: '10m', value: '10' },
                                                            { label: '15m', value: '15' },
                                                            { label: '20m', value: '20' }
                                                        ]}
                                                    />
                                                </Field>
                                                <ToggleRow
                                                    label="Screen flash"
                                                    description="Flash the screen edges when a reminder triggers."
                                                    value={settings.animatedFlash}
                                                    onChange={(v: boolean) => settings.updateSettings({ animatedFlash: v })}
                                                />
                                                <Field label="Reminder sound" description="Tap to preview each sound.">
                                                    <OptionGrid
                                                        value={settings.alertSound}
                                                        onChange={(v: string) => settings.updateSettings({ alertSound: v })}
                                                        onPreview={(v: string) => soundService.playAlert(v)}
                                                        options={[
                                                            { label: 'Ping', value: 'ping' },
                                                            { label: 'Sonar', value: 'sonar' },
                                                            { label: 'Radar', value: 'radar' },
                                                            { label: 'Minimal', value: 'minimal' },
                                                            { label: 'Crystal', value: 'crystal' },
                                                            { label: 'Beep', value: 'beep' }
                                                        ]}
                                                    />
                                                </Field>
                                            </>
                                        )}
                                    </Group>
                                )}

                                {activeSection.id === 'notifications' && (
                                    <>
                                        <Group title="System">
                                            <ToggleRow
                                                label="Push notifications"
                                                description="Send a system notification when a timer finishes."
                                                value={settings.notificationAlertsEnabled}
                                                onChange={(v: boolean) => {
                                                    if (v && Notification.permission !== 'granted') {
                                                        Notification.requestPermission()
                                                    }
                                                    settings.updateSettings({ notificationAlertsEnabled: v })
                                                }}
                                            />
                                        </Group>
                                        <Group title="Completion sound">
                                            <ToggleRow
                                                label="Completion sound"
                                                description="Play a chime when you mark a task complete."
                                                value={settings.successSoundEnabled}
                                                onChange={(v: boolean) => settings.updateSettings({ successSoundEnabled: v })}
                                            />
                                            {settings.successSoundEnabled && (
                                                <Field label="Sound" description="Tap to preview each sound.">
                                                    <OptionGrid
                                                        value={settings.successSound}
                                                        onChange={(v: string) => settings.updateSettings({ successSound: v })}
                                                        onPreview={(v: string) => soundService.playSuccess(v)}
                                                        options={[
                                                            { label: 'Victory Bell', value: 'Victory Bell' },
                                                            { label: 'Level Up', value: 'Level Up' },
                                                            { label: 'Achievement', value: 'Achievement' },
                                                            { label: 'Data Uplink', value: 'Data Uplink' },
                                                            { label: 'Magic Reveal', value: 'Magic Reveal' }
                                                        ]}
                                                    />
                                                </Field>
                                            )}
                                        </Group>
                                    </>
                                )}

                                {activeSection.id === 'superfocus' && (
                                    <Group title="Super Focus">
                                        <ToggleRow
                                            label="Super Focus mode"
                                            description="Collapses the UI to a floating pill for distraction-free work. Press Escape or click it to exit."
                                            value={settings.superFocusMode}
                                            onChange={(v: boolean) => settings.updateSettings({ superFocusMode: v })}
                                        />
                                    </Group>
                                )}

                                {activeSection.id === 'about' && (
                                    <Group title="App tracking">
                                        <div className="flex items-center gap-3 py-4">
                                            <CheckCircle2 className="w-5 h-5 text-[var(--accent-primary)] shrink-0" />
                                            <div>
                                                <p className="text-sm font-semibold text-[var(--text-primary)]">App tracking active</p>
                                                <p className="text-xs text-[var(--text-tertiary)] mt-0.5 leading-relaxed">
                                                    App usage is captured automatically and stays local on this device — no permission needed.
                                                    Window titles and website detection aren’t available on macOS.
                                                </p>
                                            </div>
                                        </div>
                                    </Group>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    )
}
