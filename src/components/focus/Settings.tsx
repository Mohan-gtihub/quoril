import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    ArrowLeft, Play, Check, Palette, Timer, Target,
    Maximize2, Bell, Send, Eye, ShieldCheck, CheckCircle2
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useSettingsStore } from '@/store/settingsStore'
import { useFocusStore } from '@/store/focusStore'
import { soundService } from '@/services/soundService'
import { cn } from '@/utils/helpers'

// ── Shared UI Components ─────────────────────────────────────

function SettingCard({ title, description, icon: Icon, children }: any) {
    return (
        <section className="rounded-[var(--radius-tile)] bg-[var(--bg-card)] border border-[var(--border-default)] shadow-[var(--shadow-soft)] p-6 md:p-7">
            <div className="flex items-start gap-3.5 mb-6">
                {Icon && (
                    <div className="w-9 h-9 rounded-[var(--radius-card)] bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0 text-[var(--text-secondary)]">
                        <Icon className="w-[18px] h-[18px]" />
                    </div>
                )}
                <div className="min-w-0">
                    <h2 className="text-[15px] font-semibold text-[var(--text-primary)] tracking-tight">{title}</h2>
                    {description && <p className="text-xs text-[var(--text-tertiary)] leading-relaxed max-w-lg mt-1">{description}</p>}
                </div>
            </div>
            <div className="space-y-3">
                {children}
            </div>
        </section>
    )
}

function ToggleRow({ label, description, value, onChange }: any) {
    return (
        <label className="flex items-center justify-between group cursor-pointer px-4 py-3.5 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-secondary)] hover:border-[var(--border-hover)] transition-colors">
            <div className="pr-6">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
                {description && <p className="text-[11px] text-[var(--text-tertiary)] mt-1 leading-relaxed">{description}</p>}
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

function SegmentedControl({ label, options, value, onChange }: any) {
    return (
        <div className="space-y-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">{label}</p>
            <div className="flex flex-wrap gap-1.5 p-1.5 bg-[var(--bg-tertiary)] rounded-[var(--radius-card)]">
                {options.map((opt: any) => {
                    const active = value === opt.value
                    return (
                        <button
                            key={opt.value}
                            onClick={() => onChange(opt.value)}
                            className={cn(
                                "flex-1 min-w-[72px] px-3 py-2 rounded-[calc(var(--radius-card)-4px)] text-xs font-semibold transition-all whitespace-nowrap",
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
        </div>
    )
}

function OptionGrid({ label, options, value, onChange, onPreview }: any) {
    return (
        <div className="space-y-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">{label}</p>
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
        </div>
    )
}

function SliderRow({ label, description, value, onChange, min, max, step = 1, format }: any) {
    const display = format ? format(value) : value
    return (
        <div className="space-y-3 px-4 py-3.5 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-secondary)]">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
                    {description && <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 leading-relaxed">{description}</p>}
                </div>
                <span className="text-sm font-semibold text-[var(--text-primary)] tabular-nums px-2.5 py-1 rounded-md bg-[var(--bg-tertiary)] shrink-0">{display}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-[var(--bg-tertiary)] accent-[var(--accent-primary)]"
            />
            <div className="flex justify-between text-[11px] text-[var(--text-muted)] font-medium tabular-nums">
                <span>{format ? format(min) : min}</span>
                <span>{format ? format(max) : max}</span>
            </div>
        </div>
    )
}

// ── Main Page ────────────────────────────────────────────────

export function Settings() {
    const navigate = useNavigate()
    const settings = useSettingsStore()

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

    return (
        <div className="flex-1 overflow-y-auto w-full h-full custom-scrollbar pb-24">
            <div className="max-w-4xl mx-auto px-6 md:px-10 py-10">
                <motion.header
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="mb-8 flex items-center gap-4"
                >
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 rounded-full bg-[var(--bg-card)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)] flex items-center justify-center transition-all hover:-translate-x-0.5"
                    >
                        <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
                    </button>
                    <h1 className="text-[28px] md:text-[34px] leading-none font-semibold tracking-tight text-[var(--text-primary)]">Settings</h1>
                </motion.header>

                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.05, ease: 'easeOut' }}
                    className="space-y-4"
                >

                    {/* ══ Aesthetics & Interface ══ */}
                    <SettingCard
                        icon={Palette}
                        title="Appearance"
                        description="Choose your theme and fine-tune how much detail shows in the interface."
                    >
                        <SegmentedControl
                            label="Theme"
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
                        <div className="pt-2">
                            <ToggleRow
                                label="Hide Task Times"
                                description="Hide estimated and completed times in task cards to reduce visual noise."
                                value={settings.hideEstDoneTimes}
                                onChange={(v: boolean) => settings.updateSettings({ hideEstDoneTimes: v })}
                            />
                            <ToggleRow
                                label="Scrolling Titles"
                                description="Slide long mission names smoothly in the status bar instead of truncating."
                                value={settings.scrollingTitle}
                                onChange={(v: boolean) => settings.updateSettings({ scrollingTitle: v })}
                            />
                        </div>
                    </SettingCard>

                    {/* ══ Focus Intelligence ══ */}
                    <SettingCard
                        icon={Timer}
                        title="Focus & Breaks"
                        description="Set how long your focus sprints and breaks last."
                    >
                        <ToggleRow
                            label="Pomodoro timer"
                            description="Suggest a break automatically after each focus sprint."
                            value={settings.pomodorosEnabled}
                            onChange={(v: boolean) => settings.updateSettings({ pomodorosEnabled: v })}
                        />

                        {settings.pomodorosEnabled && (
                            <div className="grid md:grid-cols-2 gap-6 pt-2 animate-in fade-in slide-in-from-top-2">
                                <SegmentedControl
                                    label="Focus length"
                                    value={(settings.pomodoroLength || 25).toString()}
                                    onChange={handlePomodoroLengthChange}
                                    options={[
                                        { label: '15m', value: '15' },
                                        { label: '25m', value: '25' },
                                        { label: '45m', value: '45' },
                                        { label: '60m', value: '60' }
                                    ]}
                                />
                                <SegmentedControl
                                    label="Break length"
                                    value={settings.defaultBreakLength.toString()}
                                    onChange={(v: string) => settings.updateSettings({ defaultBreakLength: parseInt(v) })}
                                    options={[
                                        { label: '5m', value: '5' },
                                        { label: '10m', value: '10' },
                                        { label: '15m', value: '15' },
                                        { label: '25m', value: '25' }
                                    ]}
                                />
                            </div>
                        )}
                    </SettingCard>

                    {/* ══ Mission Goals ══ */}
                    <SettingCard
                        icon={Target}
                        title="Daily goal"
                        description="Set your daily focus target and how it's celebrated when you hit it."
                    >
                        <SliderRow
                            label="Daily focus goal"
                            description="Minimum focused time to count the day as a success."
                            value={settings.dailyFocusGoalMinutes}
                            onChange={(v: number) => settings.updateSettings({ dailyFocusGoalMinutes: v })}
                            min={30}
                            max={480}
                            step={15}
                            format={(v: number) => {
                                const h = Math.floor(v / 60)
                                const m = v % 60
                                return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ''}`.trim() : `${m}m`
                            }}
                        />
                        <ToggleRow
                            label="Celebration screen"
                            description="Show a celebration when a focus session ends."
                            value={settings.showSuccessScreen}
                            onChange={(v: boolean) => settings.updateSettings({ showSuccessScreen: v })}
                        />
                        {settings.showSuccessScreen && (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <ToggleRow
                                    label="Celebration GIF"
                                    description="Show a fun GIF on the celebration screen."
                                    value={settings.funGifEnabled}
                                    onChange={(v: boolean) => settings.updateSettings({ funGifEnabled: v })}
                                />
                            </div>
                        )}
                    </SettingCard>

                    {/* ══ Super Focus Mode ══ */}
                    <SettingCard
                        icon={Maximize2}
                        title="Super Focus"
                        description="Collapse the app to a minimal floating pill for distraction-free work."
                    >
                        <ToggleRow
                            label="Super Focus mode"
                            description="Collapses the UI to a floating pill. Press Escape or click it to exit."
                            value={settings.superFocusMode}
                            onChange={(v: boolean) => settings.updateSettings({ superFocusMode: v })}
                        />
                    </SettingCard>

                    {/* ══ Alert Systems ══ */}
                    <SettingCard
                        icon={Bell}
                        title="Focus reminders"
                        description="Gentle audio and visual cues to keep your attention from drifting."
                    >
                        <ToggleRow
                            label="Timed reminders"
                            description="Play a subtle cue at a set interval during focus sessions."
                            value={settings.timedAlertsEnabled}
                            onChange={(v: boolean) => settings.updateSettings({ timedAlertsEnabled: v })}
                        />

                        {settings.timedAlertsEnabled && (
                            <div className="space-y-6 pt-2 pb-2 animate-in fade-in slide-in-from-top-2">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <SegmentedControl
                                        label="Reminder interval"
                                        value={settings.alertInterval.toString()}
                                        onChange={(v: string) => settings.updateSettings({ alertInterval: parseInt(v) })}
                                        options={[
                                            { label: '5m', value: '5' },
                                            { label: '10m', value: '10' },
                                            { label: '15m', value: '15' },
                                            { label: '20m', value: '20' }
                                        ]}
                                    />
                                    <div className="space-y-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] hidden md:block">&nbsp;</p>
                                        <ToggleRow
                                            label="Screen flash"
                                            description="Flash the screen edges when a reminder triggers."
                                            value={settings.animatedFlash}
                                            onChange={(v: boolean) => settings.updateSettings({ animatedFlash: v })}
                                        />
                                    </div>
                                </div>

                                <OptionGrid
                                    label="Reminder sound"
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
                            </div>
                        )}
                    </SettingCard>

                    {/* ══ External Comms ══ */}
                    <SettingCard
                        icon={Send}
                        title="Notifications & sounds"
                        description="System notifications and sounds when timers finish or tasks complete."
                    >
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
                        <div className="border-t border-[var(--border-default)] my-2" />
                        <ToggleRow
                            label="Completion sound"
                            description="Play a chime when you mark a task complete."
                            value={settings.successSoundEnabled}
                            onChange={(v: boolean) => settings.updateSettings({ successSoundEnabled: v })}
                        />

                        {settings.successSoundEnabled && (
                            <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                                <OptionGrid
                                    label="Completion sound"
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
                            </div>
                        )}
                    </SettingCard>

                    {/* ══ Visibility ══ */}
                    <SettingCard
                        icon={Eye}
                        title="Display"
                        description="Control what extra detail shows on your task cards."
                    >
                        <ToggleRow
                            label="Minimal task cards"
                            description="Hide estimated and completed times on task cards during focus sessions."
                            value={settings.hideEstDoneTimes}
                            onChange={(v: boolean) => settings.updateSettings({ hideEstDoneTimes: v })}
                        />
                    </SettingCard>

                    {/* ══ macOS Permissions (only shown on macOS) ══ */}
                    <AccessibilityPermissionCard />

                </motion.div>
            </div>
        </div>
    )
}

function AccessibilityPermissionCard() {
    const [platform, setPlatform] = useState<string>('')

    useEffect(() => {
        const api = window.electronAPI
        if (!api?.app) return
        api.app.getPlatform().then(setPlatform)
    }, [])

    // Only show on macOS — Windows/Linux track apps and titles without any prompt.
    if (platform !== 'darwin') return null

    // macOS tracks apps permission-free via lsappinfo. We intentionally do not
    // request Accessibility (the prompt can't persist on unsigned builds), so this
    // is purely informational: app usage works, website/title detail does not.
    return (
        <SettingCard
            icon={ShieldCheck}
            title="App tracking"
            description="Quoril records which apps you use automatically — no permission needed."
        >
            <div className="flex items-center gap-3 px-4 py-3.5 bg-[var(--bg-hover)] rounded-[var(--radius-card)]">
                <CheckCircle2 className="w-5 h-5 text-[var(--accent-primary)] shrink-0" />
                <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">App tracking active</p>
                    <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">App usage is captured automatically and stays local on this device. Window titles and website detection aren’t available on macOS.</p>
                </div>
            </div>
        </SettingCard>
    )
}
