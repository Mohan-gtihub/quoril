import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell, Zap, Palette, Sparkles, Play, CheckCircle2, Target, Eye, Cpu, Shield } from 'lucide-react'
import { useSettingsStore } from '@/store/settingsStore'
import { useFocusStore } from '@/store/focusStore'
import { soundService } from '@/services/soundService'
import { cn } from '@/utils/helpers'

// ── Shared UI Components ─────────────────────────────────────

function SettingCard({ icon: Icon, title, description, children, accent = "text-blue-400 bg-blue-500/10" }: any) {
    return (
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 transition-all duration-300 hover:bg-white/[0.03]">
            <div className="flex items-start gap-5 mb-8">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border border-white/5", accent)}>
                    <Icon className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-white tracking-tight mb-1">{title}</h2>
                    <p className="text-xs text-white/40 leading-relaxed max-w-lg">{description}</p>
                </div>
            </div>
            <div className="space-y-6">
                {children}
            </div>
        </div>
    )
}

function ToggleRow({ label, description, value, onChange }: any) {
    return (
        <label className="flex items-center justify-between group cursor-pointer p-4 -mx-4 rounded-2xl hover:bg-white/[0.02] transition-colors">
            <div className="pr-6">
                <p className="text-sm font-bold text-white/90 group-hover:text-white transition-colors">{label}</p>
                {description && <p className="text-[11px] text-white/40 mt-1">{description}</p>}
            </div>
            <input
                type="checkbox"
                checked={!!value}
                onChange={(e) => onChange?.(e.target.checked)}
                className="sr-only"
            />
            <div className={cn(
                "relative w-12 h-6 rounded-full transition-colors duration-300 ease-in-out shrink-0 border border-white/5",
                value ? "bg-[var(--accent-primary)] shadow-[0_0_15px_rgba(139,92,246,0.3)]" : "bg-white/10"
            )}>
                <div className={cn(
                    "absolute top-[1px] w-[20px] h-[20px] bg-white rounded-full transition-transform duration-300 ease-in-out shadow-sm",
                    value ? "left-[calc(100%-22px)]" : "left-[2px]"
                )} />
            </div>
        </label>
    )
}

function SegmentedControl({ label, options, value, onChange }: any) {
    return (
        <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">{label}</p>
            <div className="flex flex-wrap gap-2 p-1.5 bg-white/[0.03] rounded-2xl border border-white/[0.05]">
                {options.map((opt: any) => {
                    const active = value === opt.value
                    return (
                        <button
                            key={opt.value}
                            onClick={() => onChange(opt.value)}
                            className={cn(
                                "flex-1 min-w-[80px] px-3 py-2 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap",
                                active
                                    ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] shadow-sm border border-[var(--accent-primary)]/30"
                                    : "text-white/40 hover:text-white/80 hover:bg-white/[0.05] border border-transparent"
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
        <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">{label}</p>
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
                                "flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-bold transition-all group",
                                active
                                    ? "bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/50 text-[var(--accent-primary)] shadow-[0_0_20px_rgba(139,92,246,0.1)]"
                                    : "bg-white/[0.02] border-white/[0.05] text-white/40 hover:bg-white/[0.05] hover:text-white hover:border-white/20"
                            )}
                        >
                            <span className="truncate">{opt.label}</span>
                            {active ? (
                                <CheckCircle2 className="w-4 h-4 shrink-0 shadow-[0_0_10px_var(--accent-primary)] rounded-full" />
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
        <div className="space-y-3 p-4 -mx-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-bold text-white/90">{label}</p>
                    {description && <p className="text-[11px] text-white/40 mt-0.5">{description}</p>}
                </div>
                <span className="text-sm font-black text-[var(--accent-primary)] tabular-nums">{display}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10 accent-[var(--accent-primary)]"
            />
            <div className="flex justify-between text-[10px] text-white/20 font-bold">
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
        <div className="h-full flex flex-col bg-transparent overflow-hidden">
            <header className="flex-shrink-0 flex items-center gap-4 px-6 md:px-10 py-6 border-b border-white/[0.05] sticky top-0 bg-[#050510]/80 backdrop-blur-xl z-20">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-all hover:-translate-x-1"
                >
                    <ArrowLeft className="w-5 h-5 text-white/60" />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight">System Config</h1>
                    <p className="text-[10px] text-[var(--accent-primary)] uppercase tracking-[0.2em] font-bold">Preferences & Operations</p>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto custom-scrollbar px-6 md:px-10 py-8 pb-32">
                <div className="max-w-4xl mx-auto space-y-8">

                    {/* ══ Aesthetics & Interface ══ */}
                    <SettingCard
                        icon={Palette}
                        title="Aesthetics & Interface"
                        description="Tailor the visual envelope of your terminal. Themes dynamically adjust the entire OS environment."
                        accent="text-emerald-400 bg-emerald-500/10"
                    >
                        <SegmentedControl
                            label="Color Environment"
                            value={settings.theme}
                            onChange={(v: string) => settings.updateSettings({ theme: v as any })}
                            options={[
                                { label: 'Onyx Dark', value: 'dark' },
                                { label: 'Arcade Blue', value: 'blue' },
                                { label: 'Sunset Red', value: 'red' },
                                { label: 'Cosmic Nebula', value: 'nebula' }
                            ]}
                        />
                        <div className="pt-2">
                            <ToggleRow
                                label="Minimal Interface"
                                description="Hide estimated and completed times in task cards to reduce visual noise."
                                value={settings.hideEstDoneTimes}
                                onChange={(v: boolean) => settings.updateSettings({ hideEstDoneTimes: v })}
                            />
                            <div className="border-t border-white/[0.05] my-2" />
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
                        icon={Sparkles}
                        title="Focus Intelligence"
                        description="Configure how the terminal manages your deep work sessions and recovery phases."
                        accent="text-blue-400 bg-blue-500/10"
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
                        icon={Target}
                        title="Mission Goals"
                        description="Set your daily focus target and control how victory is celebrated when you hit it."
                        accent="text-cyan-400 bg-cyan-500/10"
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
                        <div className="border-t border-white/[0.05]" />
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
                        icon={Cpu}
                        title="Super Focus Mode"
                        description="Locks the interface to a minimal pill overlay. Maximises screen space for deep work."
                        accent="text-rose-400 bg-rose-500/10"
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
                        icon={Zap}
                        title="Alert Systems"
                        description="Periodic tactical pulses and visual cues keep your attention anchored during deep work."
                        accent="text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.05)]"
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
                                        <p className="text-[10px] font-black uppercase tracking-widest text-white/30 hidden md:block">&nbsp;</p>
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
                        icon={Bell}
                        title="External Comms"
                        description="System-level notifications and auditory rewards for mission completion."
                        accent="text-violet-400 bg-violet-500/10"
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
                        <div className="border-t border-white/[0.05] my-2" />
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

                    {/* ══ Visibility ══ */}
                    <SettingCard
                        icon={Eye}
                        title="Data Visibility"
                        description="Control what information is surfaced during active sessions and in your reports."
                        accent="text-pink-400 bg-pink-500/10"
                    >
                        <ToggleRow
                            label="Minimal Interface"
                            description="Hide estimated and completed times in task cards during focus sessions."
                            value={settings.hideEstDoneTimes}
                            onChange={(v: boolean) => settings.updateSettings({ hideEstDoneTimes: v })}
                        />
                    </SettingCard>

                    {/* ══ macOS Permissions (only shown on macOS) ══ */}
                    <AccessibilityPermissionCard />

                </div>
            </main>
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
            icon={Shield}
            title="App Tracking Permission"
            description="Quoril tracks which apps you use during focus sessions to give you productivity insights. This requires macOS Accessibility permission."
            accent={hasAccess ? "text-green-400 bg-green-500/10" : "text-amber-400 bg-amber-500/10"}
        >
            {hasAccess ? (
                <div className="flex items-center gap-3 p-4 bg-green-500/5 border border-green-500/10 rounded-2xl">
                    <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-green-400">Permission Granted</p>
                        <p className="text-[11px] text-white/40 mt-0.5">App tracking is active. Your usage data stays local on this device.</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                        <p className="text-sm text-white/70 leading-relaxed">
                            To track which apps you use during focus sessions, Quoril needs Accessibility access.
                            Your data never leaves this device.
                        </p>
                    </div>
                    <button
                        onClick={handleRequest}
                        className="w-full py-3 px-4 bg-[var(--accent-primary)] hover:brightness-110 text-white text-sm font-bold rounded-2xl transition-all"
                    >
                        Grant Accessibility Access
                    </button>
                </div>
            )}
        </SettingCard>
    )
}
