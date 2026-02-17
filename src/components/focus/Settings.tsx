import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell, Zap, ShieldCheck, Palette, Sparkles } from 'lucide-react'
import { useSettingsStore } from '@/store/settingsStore'
import { useFocusStore } from '@/store/focusStore'
import { soundService } from '@/services/soundService'
import { cn } from '@/utils/helpers'

export function Settings() {
    const navigate = useNavigate()
    const settings = useSettingsStore()

    const handleBack = () => {
        navigate('/planner')
    }

    const SectionHeader = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
        <div className="flex items-start gap-4 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)]">
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">{title}</h3>
                <p className="text-sm text-[var(--text-tertiary)]">{description}</p>
            </div>
        </div>
    )

    const Toggle = ({ value, onChange, label, description }: { value: boolean, onChange: (v: boolean) => void, label: string, description?: string }) => (
        <div
            onClick={(e) => {
                e.preventDefault()
                onChange(!value)
            }}
            className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-hover)]/30 border border-[var(--border-default)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer group"
        >
            <div className="flex-1">
                <div className="text-sm font-bold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">{label}</div>
                {description && <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{description}</div>}
            </div>
            <div
                className={cn(
                    "w-12 h-6 rounded-full relative transition-all duration-300 pointer-events-none",
                    value ? "bg-[var(--accent-primary)] shadow-[0_0_15px_var(--accent-glow)]" : "bg-[var(--bg-tertiary)]"
                )}
            >
                <div className={cn(
                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-sm",
                    value ? "left-7" : "left-1"
                )} />
            </div>
        </div>
    )

    const Select = ({ value, onChange, options, label }: { value: string, onChange: (v: string) => void, options: { label: string, value: string }[], label: string }) => (
        <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-hover)]/30 border border-[var(--border-default)] hover:bg-[var(--bg-hover)] transition-all">
            <span className="text-sm font-bold text-[var(--text-secondary)]">{label}</span>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] text-xs rounded-lg px-3 py-2 cursor-pointer outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20 transition-all hover:border-[var(--accent-primary)]/50"
                style={{
                    colorScheme: 'dark',
                    appearance: 'auto'
                }}
            >
                {options.map(opt => (
                    <option
                        key={opt.value}
                        value={opt.value}
                        className="bg-[var(--bg-secondary)] text-[var(--text-primary)] py-2"
                    >
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    )

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col font-sans select-none transition-colors duration-500">
            <header className="h-16 flex items-center justify-between px-8 border-b border-[var(--border-default)] bg-[var(--bg-secondary)] sticky top-0 z-50 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleBack}
                        className="p-2 rounded-xl bg-[var(--bg-hover)] hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-sm font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">Configuration</h1>
                        <h2 className="text-lg font-bold text-[var(--text-primary)]">System Settings</h2>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 px-3 py-1 rounded-full uppercase tracking-widest border border-[var(--accent-primary)]/20">V1.0.4 rdy</span>
                </div>
            </header>

            <main className="flex-1 max-w-4xl w-full mx-auto p-8 pb-24 space-y-16">
                {/* General */}
                <section>
                    <SectionHeader
                        icon={Palette}
                        title="Aesthetics & Interface"
                        description="Tailor the visual experience of your terminal."
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Toggle
                            label="Hide Estimates"
                            description="Streamline the UI by removing estimated times."
                            value={settings.hideEstDoneTimes}
                            onChange={(v) => settings.updateSettings({ hideEstDoneTimes: v })}
                        />
                        <Select
                            label="Color Theme"
                            value={settings.theme}
                            onChange={(v) => settings.updateSettings({ theme: v as any })}
                            options={[
                                { label: 'Onyx Black', value: 'dark' },
                                { label: 'Lunar Light', value: 'light' },
                                { label: 'Arcade Blue', value: 'blue' },
                                { label: 'Sunset Red', value: 'red' }
                            ]}
                        />
                    </div>
                </section>

                {/* Focus Settings */}
                <section>
                    <SectionHeader
                        icon={Sparkles}
                        title="Focus Intelligence"
                        description="Configure how the terminal manages your deep work sessions."
                    />
                    <div className="space-y-4">
                        <Toggle
                            label="Pomodoro Protocol"
                            description="Automatically schedule breaks after intense focus blocks."
                            value={settings.pomodorosEnabled}
                            onChange={(v) => settings.updateSettings({ pomodorosEnabled: v })}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Select
                                label="Focus Duration"
                                value={(settings.pomodoroLength || 25).toString()}
                                onChange={(v) => {
                                    const newLength = parseInt(v)
                                    settings.updateSettings({ pomodoroLength: newLength })

                                    // Aggressively update current focus store if not actively counting
                                    // so the UI reflects the change immediately
                                    const focus = useFocusStore.getState()
                                    if (!focus.isActive || focus.isPaused) {
                                        const newSeconds = newLength * 60
                                        useFocusStore.setState({
                                            pomodoroTotal: newSeconds,
                                            pomodoroRemaining: newSeconds,
                                            pomodoroRemainingAtStart: newSeconds
                                        })
                                    }
                                }}
                                options={[
                                    { label: '5 Minutes', value: '5' },
                                    { label: '15 Minutes', value: '15' },
                                    { label: '25 Minutes', value: '25' },
                                    { label: '30 Minutes', value: '30' },
                                    { label: '45 Minutes', value: '45' },
                                    { label: '50 Minutes', value: '50' },
                                    { label: '60 Minutes', value: '60' }
                                ]}
                            />
                            <Select
                                label="Default Break Length"
                                value={settings.defaultBreakLength.toString()}
                                onChange={(v) => settings.updateSettings({ defaultBreakLength: parseInt(v) })}
                                options={[
                                    { label: '5 Minutes', value: '5' },
                                    { label: '10 Minutes', value: '10' },
                                    { label: '15 Minutes', value: '15' },
                                    { label: '25 Minutes', value: '25' }
                                ]}
                            />
                            <Toggle
                                label="Scrolling Titles"
                                description="Scroll long mission names in the status bar."
                                value={settings.scrollingTitle}
                                onChange={(v) => settings.updateSettings({ scrollingTitle: v })}
                            />
                        </div>
                    </div>
                </section>

                {/* Alerts */}
                <section>
                    <SectionHeader
                        icon={Zap}
                        title="Alert Systems"
                        description="Stay on track with tactical pulses and visual cues."
                    />
                    <div className="space-y-4">
                        <Toggle
                            label="Timed Pulses"
                            description="Periodic alerts to keep your focus from drifting."
                            value={settings.timedAlertsEnabled}
                            onChange={(v) => settings.updateSettings({ timedAlertsEnabled: v })}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Select
                                label="Pulse Interval"
                                value={settings.alertInterval.toString()}
                                onChange={(v) => settings.updateSettings({ alertInterval: parseInt(v) })}
                                options={[
                                    { label: 'Every 5m', value: '5' },
                                    { label: 'Every 10m', value: '10' },
                                    { label: 'Every 15m', value: '15' },
                                    { label: 'Every 20m', value: '20' }
                                ]}
                            />
                            <Toggle
                                label="Animated Flash"
                                description="Bright flash on the screen when an alert triggers."
                                value={settings.animatedFlash}
                                onChange={(v) => settings.updateSettings({ animatedFlash: v })}
                            />
                        </div>
                        <div className="space-y-4">
                            <Select
                                label="Alert Signal"
                                value={settings.alertSound}
                                onChange={(v) => {
                                    settings.updateSettings({ alertSound: v });
                                    soundService.playAlert(v);
                                }}
                                options={[
                                    { label: 'Tactical Ping', value: 'ping' },
                                    { label: 'Sonar Pulse', value: 'sonar' },
                                    { label: 'Radar Sweep', value: 'radar' },
                                    { label: 'Digital Blip', value: 'digital' },
                                    { label: 'Crystal Chime', value: 'crystal' },
                                    { label: 'Minimal Tick', value: 'minimal' },
                                    { label: 'Classic Beep', value: 'beep' }
                                ]}
                            />
                            <button
                                onClick={() => soundService.playAlert(settings.alertSound)}
                                className="w-full py-3 rounded-xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] text-xs font-bold hover:bg-[var(--accent-primary)]/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Zap className="w-3.5 h-3.5" />
                                Test Alert Signal
                            </button>
                        </div>
                    </div>
                </section>

                {/* Notifications */}
                <section>
                    <SectionHeader
                        icon={Bell}
                        title="External Comms"
                        description="System-level notifications for session events."
                    />
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Toggle
                                label="Push Alerts"
                                value={settings.notificationAlertsEnabled}
                                onChange={(v) => {
                                    if (v && Notification.permission !== 'granted') {
                                        Notification.requestPermission()
                                    }
                                    settings.updateSettings({ notificationAlertsEnabled: v })
                                }}
                            />
                            <Toggle
                                label="Success Chime"
                                value={settings.successSoundEnabled}
                                onChange={(v) => settings.updateSettings({ successSoundEnabled: v })}
                            />
                        </div>

                        <Select
                            label="Success Signal"
                            value={settings.successSound}
                            onChange={(v) => {
                                settings.updateSettings({ successSound: v });
                                soundService.playSuccess(v);
                            }}
                            options={[
                                { label: 'Victory Bell', value: 'Victory Bell' },
                                { label: 'Futuristic', value: 'Futuristic' },
                                { label: 'Mission Achievement', value: 'Achievement' },
                                { label: 'Magic Reveal', value: 'Magic Reveal' },
                                { label: 'Data Uplink', value: 'Data Uplink' },
                                { label: 'Level Up', value: 'Level Up' }
                            ]}
                        />
                    </div>
                </section>

                {/* Completion */}
                <section>
                    <SectionHeader
                        icon={ShieldCheck}
                        title="Success Protocol"
                        description="What happens after a mission is successfully completed."
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Toggle
                            label="Celebration Screen"
                            value={settings.showSuccessScreen}
                            onChange={(v) => settings.updateSettings({ showSuccessScreen: v })}
                        />
                        <Toggle
                            label="Fun Rewards (GIFs)"
                            value={settings.funGifEnabled}
                            onChange={(v) => settings.updateSettings({ funGifEnabled: v })}
                        />
                    </div>
                </section>
            </main>

            {/* Sticky Save / Factory Reset Bar */}
            <div className="fixed bottom-0 left-0 right-0 h-20 bg-[var(--bg-secondary)]/80 backdrop-blur-xl border-t border-[var(--border-default)] flex items-center justify-center px-8">
                <div className="max-w-4xl w-full flex items-center justify-between">
                    <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase">All changes are synchronized across your neural link.</p>
                    <div className="flex gap-4">
                        <button className="px-6 py-2 rounded-xl bg-[var(--bg-hover)] hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs font-bold transition-all border border-[var(--border-default)]">Factory Reset</button>
                        <button
                            onClick={handleBack}
                            className="px-8 py-2 rounded-xl bg-[var(--accent-primary)] hover:opacity-90 text-white text-xs font-bold transition-all shadow-[0_0_20px_var(--accent-glow)]"
                        >Save & Synchronize</button>
                    </div>
                </div>
            </div>
        </div>
    )
}
