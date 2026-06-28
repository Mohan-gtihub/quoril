import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useSettingsStore } from '@/store/settingsStore'
import { useFocusStore } from '@/store/focusStore'
import { soundService } from '@/services/soundService'
import { cn } from '@/utils/helpers'

// ── Shared UI Components ─────────────────────────────────────

function SettingCard({ title, description, children }: any) {
    return (
        <section className="rounded-[var(--radius-tile)] bg-[var(--bg-card)] border border-[var(--border-default)] p-6 md:p-7">
            <div className="mb-5">
                <h2 className="text-[15px] font-semibold text-[var(--text-primary)] tracking-tight">{title}</h2>
                {description && <p className="text-xs text-[var(--text-tertiary)] leading-relaxed max-w-lg mt-1">{description}</p>}
            </div>
            <div className="space-y-4">
                {children}
            </div>
        </section>
    )
}

function ToggleRow({ label, description, value, onChange }: any) {
    return (
        <label className="flex items-center justify-between group cursor-pointer px-4 py-3.5 rounded-[var(--radius-card)] bg-[var(--bg-hover)] hover:bg-[var(--border-hover)] transition-colors">
            <div className="pr-6">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
                {description && <p className="text-[11px] text-[var(--text-tertiary)] mt-1">{description}</p>}
            </div>
            <input
                type="checkbox"
                checked={!!value}
                onChange={(e) => onChange?.(e.target.checked)}
                className="sr-only"
            />
            <div className={cn(
                "relative w-12 h-6 rounded-full transition-colors duration-300 ease-in-out shrink-0",
                value ? "bg-[var(--accent-primary)]" : "bg-[var(--border-hover)]"
            )}>
                <div className={cn(
                    "absolute top-[2px] w-[20px] h-[20px] bg-[var(--bg-primary)] rounded-full transition-transform duration-300 ease-in-out shadow-sm",
                    value ? "left-[calc(100%-22px)]" : "left-[2px]"
                )} />
            </div>
        </label>
    )
}

function SegmentedControl({ label, options, value, onChange }: any) {
    return (
        <div className="space-y-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">{label}</p>
            <div className="flex flex-wrap gap-1 p-1 bg-[var(--bg-hover)] rounded-[var(--radius-card)]">
                {options.map((opt: any) => {
                    const active = value === opt.value
                    return (
                        <button
                            key={opt.value}
                            onClick={() => onChange(opt.value)}
                            className={cn(
                                "flex-1 min-w-[80px] px-3 py-2 rounded-[var(--radius-tile)] text-xs font-semibold transition-all whitespace-nowrap",
                                active
                                    ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)]"
                                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-hover)]"
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
                                "flex items-center justify-between px-4 py-3 rounded-[var(--radius-card)] text-xs font-semibold transition-all group",
                                active
                                    ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)]"
                                    : "bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--border-hover)] hover:text-[var(--text-primary)]"
                            )}
                        >
                            <span className="truncate">{opt.label}</span>
                            {active ? (
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
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
        <div className="space-y-3 px-4 py-3.5 rounded-[var(--radius-card)] bg-[var(--bg-hover)]">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
                    {description && <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{description}</p>}
                </div>
                <span className="text-sm font-semibold text-[var(--accent-primary)] tabular-nums">{display}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-[var(--border-hover)] accent-[var(--accent-primary)]"
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
                        title="Aesthetics & Interface"
                        description="Tailor the visual envelope of your terminal. Themes dynamically adjust the entire OS environment."
                    >
                        <SegmentedControl
                            label="Color Environment"
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
                        title="Focus Intelligence"
                        description="Configure how the terminal manages your deep work sessions and recovery phases."
                    >
                        <ToggleRow
                            label="Pomodoro Protocol"
                            description="Automatically suggest recovery breaks after intense focus blocks."
                            value={settings.pomodorosEnabled}
                            onChange={(v: boolean) => settings.updateSettings({ pomodorosEnabled: v })}
                        />

                        {settings.pomodorosEnabled && (
                            <div className="grid md:grid-cols-2 gap-6 pt-2 animate-in fade-in slide-in-from-top-2">
                                <SegmentedControl
                                    label="Sprint Duration"
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
                                    label="Recovery Length"
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
                        title="Mission Goals"
                        description="Set your daily focus target and control how victory is celebrated when you hit it."
                    >
                        <SliderRow
                            label="Daily Focus Goal"
                            description="Minimum focused time to consider the day a success."
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
                            label="Victory Screen"
                            description="Display the completion celebration when a focus session ends."
                            value={settings.showSuccessScreen}
                            onChange={(v: boolean) => settings.updateSettings({ showSuccessScreen: v })}
                        />
                        {settings.showSuccessScreen && (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <ToggleRow
                                    label="Animated GIF Reward"
                                    description="Show a celebration GIF on the victory screen."
                                    value={settings.funGifEnabled}
                                    onChange={(v: boolean) => settings.updateSettings({ funGifEnabled: v })}
                                />
                            </div>
                        )}
                    </SettingCard>

                    {/* ══ Super Focus Mode ══ */}
                    <SettingCard
                        title="Super Focus Mode"
                        description="Locks the interface to a minimal pill overlay. Maximises screen space for deep work."
                    >
                        <ToggleRow
                            label="Super Focus Mode"
                            description="Collapses the UI to a floating pill. Press Escape or click the pill to exit."
                            value={settings.superFocusMode}
                            onChange={(v: boolean) => settings.updateSettings({ superFocusMode: v })}
                        />
                    </SettingCard>

                    {/* ══ Alert Systems ══ */}
                    <SettingCard
                        title="Alert Systems"
                        description="Periodic tactical pulses and visual cues keep your attention anchored during deep work."
                    >
                        <ToggleRow
                            label="Timed Pulses"
                            description="Play a subtle audio cue at set intervals to prevent mind-wandering."
                            value={settings.timedAlertsEnabled}
                            onChange={(v: boolean) => settings.updateSettings({ timedAlertsEnabled: v })}
                        />

                        {settings.timedAlertsEnabled && (
                            <div className="space-y-6 pt-2 pb-2 animate-in fade-in slide-in-from-top-2">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <SegmentedControl
                                        label="Pulse Frequency"
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
                                            label="Animated Screen Flash"
                                            description="Edge-screen flash effect when pulse triggers."
                                            value={settings.animatedFlash}
                                            onChange={(v: boolean) => settings.updateSettings({ animatedFlash: v })}
                                        />
                                    </div>
                                </div>

                                <OptionGrid
                                    label="Tactical Pulse Sound"
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
                        title="External Comms"
                        description="System-level notifications and auditory rewards for mission completion."
                    >
                        <ToggleRow
                            label="Push Notifications"
                            description="Send OS-level alerts when timers finish."
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
                            label="Success Checksum Reward"
                            description="Play a celebratory chime when marking tasks complete."
                            value={settings.successSoundEnabled}
                            onChange={(v: boolean) => settings.updateSettings({ successSoundEnabled: v })}
                        />

                        {settings.successSoundEnabled && (
                            <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                                <OptionGrid
                                    label="Success Signature"
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

                    {/* ══ macOS Permissions (only shown on macOS) ══ */}
                    <AccessibilityPermissionCard />

                </motion.div>
            </div>
        </div>
    )
}

function AccessibilityPermissionCard() {
    const [platform, setPlatform] = useState<string>('')
    const [hasAccess, setHasAccess] = useState<boolean | null>(null)

    useEffect(() => {
        const api = window.electronAPI
        if (!api?.permissions) return
        api.app.getPlatform().then(setPlatform)
        api.permissions.checkAccessibility().then(setHasAccess)
    }, [])

    // Only show on macOS
    if (platform !== 'darwin') return null
    // Still loading
    if (hasAccess === null) return null

    const handleRequest = async () => {
        const api = window.electronAPI
        if (!api?.permissions) return
        
        // Triggers the OS prompt (should only happen once per app run or until decided)
        api.permissions.requestAccessibility()
        
        // Passive polling: Check every 5 seconds for 5 minutes, much more relaxed
        const poll = setInterval(async () => {
            const granted = await api.permissions.checkAccessibility()
            if (granted) {
                clearInterval(poll)
                setHasAccess(true)
                // Now it's safe to start because we have confirmed access
                await api.permissions.startTracking()
            }
        }, 5000)
        
        // Stop polling after 5 minutes
        setTimeout(() => clearInterval(poll), 300000)
    }

    return (
        <SettingCard
            title="App Tracking Permission"
            description="Quoril tracks which apps you use during focus sessions to give you productivity insights. This requires macOS Accessibility permission."
        >
            {hasAccess ? (
                <div className="flex items-center gap-3 px-4 py-3.5 bg-[var(--bg-hover)] rounded-[var(--radius-card)]">
                    <CheckCircle2 className="w-5 h-5 text-[var(--accent-primary)] shrink-0" />
                    <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">Permission Granted</p>
                        <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">App tracking is active. Your usage data stays local on this device.</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="px-4 py-3.5 bg-[var(--bg-hover)] rounded-[var(--radius-card)]">
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                            To track which apps you use during focus sessions, Quoril needs Accessibility access.
                            Your data never leaves this device.
                        </p>
                    </div>
                    <button
                        onClick={handleRequest}
                        className="w-full py-3 px-5 bg-[var(--accent-primary)] hover:brightness-105 active:scale-95 text-[var(--accent-contrast)] text-sm font-semibold rounded-full transition-all shadow-sm"
                    >
                        Grant Accessibility Access
                    </button>
                </div>
            )}
        </SettingCard>
    )
}
