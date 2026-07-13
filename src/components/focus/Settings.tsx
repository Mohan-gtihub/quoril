import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    ArrowLeft, Play, Check, Palette, Timer, Target,
    Maximize2, Bell, Send, ShieldCheck, CheckCircle2, Plus, Minus,
    RefreshCw, Download, RotateCw, User as UserIcon, Mail, Lock,
    LogOut, Flame, Crown, Sparkles
} from 'lucide-react'
import { useAppUpdate } from '@/hooks/useAppUpdate'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useSettingsStore } from '@/store/settingsStore'
import { useFocusStore } from '@/store/focusStore'
import { useAuthStore } from '@/store/authStore'
import { useProfileStore } from '@/store/profileStore'
import type { SubscriptionTier, AppRole } from '@/utils/permissions'
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
    { id: 'account', label: 'Account', icon: UserIcon, desc: 'Your profile, plan, and sign-in security.' },
    { id: 'appearance', label: 'Appearance', icon: Palette, desc: 'Theme and how much detail shows on task cards.' },
    { id: 'focus', label: 'Focus & Breaks', icon: Timer, desc: 'Tune the length of your focus sprints and breaks.' },
    { id: 'goals', label: 'Daily Goal', icon: Target, desc: 'Set your daily focus target and how it’s celebrated.' },
    { id: 'reminders', label: 'Reminders', icon: Bell, desc: 'Gentle cues to keep your attention from drifting.' },
    { id: 'notifications', label: 'Notifications', icon: Send, desc: 'System notifications and sounds for timers and tasks.' },
    { id: 'superfocus', label: 'Super Focus', icon: Maximize2, desc: 'Collapse the app to a minimal floating pill.' },
    { id: 'about', label: 'App Tracking', icon: ShieldCheck, desc: 'How Quoril records the apps you use.' },
    { id: 'updates', label: 'Updates', icon: RefreshCw, desc: 'How Quoril keeps itself up to date.' },
] as const

type SectionId = typeof SECTIONS[number]['id']

// ── Account section ──────────────────────────────────────────

const TIER_META: Record<SubscriptionTier, { label: string; icon: any; className: string }> = {
    free: { label: 'Free', icon: Sparkles, className: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]' },
    monthly: { label: 'Pro · Monthly', icon: Crown, className: 'bg-[var(--accent-primary)] text-[var(--accent-contrast)]' },
    annual: { label: 'Pro · Annual', icon: Crown, className: 'bg-[var(--accent-primary)] text-[var(--accent-contrast)]' },
    lifetime: { label: 'Lifetime', icon: Crown, className: 'bg-[var(--accent-primary)] text-[var(--accent-contrast)]' },
}

const ROLE_LABEL: Partial<Record<AppRole, string>> = {
    admin: 'Admin',
    alpha_tester: 'Alpha Tester',
    beta_tester: 'Beta Tester',
    blog_publisher: 'Blog Publisher',
}

function initialsFrom(name: string, email: string) {
    const src = name.trim() || email.split('@')[0] || '?'
    const parts = src.split(/[\s._-]+/).filter(Boolean)
    const chars = parts.length >= 2 ? parts[0][0] + parts[1][0] : src.slice(0, 2)
    return chars.toUpperCase()
}

function AccountSection() {
    const { user, roles, tier, signOut, updatePassword } = useAuthStore()
    const { fullName, streak, updateProfile } = useProfileStore()

    const email = user?.email ?? ''
    const provider = (user?.app_metadata as any)?.provider as string | undefined
    const isPasswordAccount = !provider || provider === 'email'

    const [name, setName] = useState(fullName)
    const [savingName, setSavingName] = useState(false)
    const [pw, setPw] = useState('')
    const [pw2, setPw2] = useState('')
    const [savingPw, setSavingPw] = useState(false)
    const [signingOut, setSigningOut] = useState(false)

    // Keep the local field in sync when the profile finishes loading.
    useEffect(() => { setName(fullName) }, [fullName])

    const nameDirty = name.trim() !== (fullName || '').trim()

    const saveName = async () => {
        if (!nameDirty) return
        setSavingName(true)
        const res = await updateProfile({ fullName: name })
        setSavingName(false)
        if (res.success) toast.success('Name updated')
        else toast.error(res.error || 'Could not save name')
    }

    const savePassword = async () => {
        if (pw.length < 8) { toast.error('Use at least 8 characters'); return }
        if (pw !== pw2) { toast.error('Passwords do not match'); return }
        setSavingPw(true)
        const res = await updatePassword(pw)
        setSavingPw(false)
        if (res.success) { toast.success('Password changed'); setPw(''); setPw2('') }
        else toast.error(res.error || 'Could not change password')
    }

    const handleSignOut = async () => {
        setSigningOut(true)
        try { await signOut() } catch { setSigningOut(false) }
    }

    const tierMeta = TIER_META[tier]
    const namedRoles = roles.filter(r => r !== 'end_user' && ROLE_LABEL[r])

    return (
        <>
            {/* Identity card */}
            <Group title="Profile">
                <div className="flex items-center gap-4 py-5 border-b border-[var(--border-default)]">
                    <div className="w-16 h-16 rounded-full bg-[var(--accent-primary)] text-[var(--accent-contrast)] flex items-center justify-center text-xl font-semibold shrink-0 select-none">
                        {initialsFrom(fullName, email)}
                    </div>
                    <div className="min-w-0">
                        <p className="text-base font-semibold text-[var(--text-primary)] truncate">
                            {fullName.trim() || email.split('@')[0] || 'Your account'}
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)] truncate mt-0.5">{email}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold', tierMeta.className)}>
                                <tierMeta.icon className="w-3 h-3" />
                                {tierMeta.label}
                            </span>
                            {namedRoles.map(r => (
                                <span key={r} className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                                    {ROLE_LABEL[r]}
                                </span>
                            ))}
                            {streak > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                                    <Flame className="w-3 h-3 text-[var(--accent-primary)]" />
                                    {streak} day streak
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <Field label="Display name" description="Shown to teammates on shared workspaces.">
                    <div className="flex gap-2">
                        <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-[var(--radius-card)] bg-[var(--bg-secondary)] border border-[var(--border-default)] focus-within:border-[var(--border-hover)] transition-colors">
                            <UserIcon className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') saveName() }}
                                placeholder="Add your name"
                                maxLength={60}
                                className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                            />
                        </div>
                        <button
                            onClick={saveName}
                            disabled={!nameDirty || savingName}
                            className="px-4 rounded-[var(--radius-card)] text-sm font-semibold bg-[var(--accent-primary)] text-[var(--accent-contrast)] hover:brightness-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            {savingName ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                </Field>

                <Field label="Email" description="Your sign-in address.">
                    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-[var(--radius-card)] bg-[var(--bg-tertiary)] border border-[var(--border-default)]">
                        <Mail className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                        <span className="flex-1 text-sm text-[var(--text-secondary)] truncate">{email}</span>
                        {provider === 'google' && (
                            <span className="text-[11px] font-semibold text-[var(--text-muted)]">via Google</span>
                        )}
                    </div>
                </Field>
            </Group>

            {/* Security */}
            <Group title="Security">
                {isPasswordAccount ? (
                    <Field label="Change password" description="Use at least 8 characters. You’ll stay signed in on this device.">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-[var(--radius-card)] bg-[var(--bg-secondary)] border border-[var(--border-default)] focus-within:border-[var(--border-hover)] transition-colors">
                                <Lock className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                                <input
                                    type="password"
                                    value={pw}
                                    onChange={(e) => setPw(e.target.value)}
                                    placeholder="New password"
                                    className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                                />
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-[var(--radius-card)] bg-[var(--bg-secondary)] border border-[var(--border-default)] focus-within:border-[var(--border-hover)] transition-colors">
                                    <Lock className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                                    <input
                                        type="password"
                                        value={pw2}
                                        onChange={(e) => setPw2(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') savePassword() }}
                                        placeholder="Confirm new password"
                                        className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                                    />
                                </div>
                                <button
                                    onClick={savePassword}
                                    disabled={!pw || !pw2 || savingPw}
                                    className="px-4 rounded-[var(--radius-card)] text-sm font-semibold bg-[var(--accent-primary)] text-[var(--accent-contrast)] hover:brightness-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    {savingPw ? 'Updating…' : 'Update'}
                                </button>
                            </div>
                        </div>
                    </Field>
                ) : (
                    <Field label="Sign-in method" description="You signed in with a connected account, so there’s no password to manage.">
                        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-[var(--radius-card)] bg-[var(--bg-tertiary)] border border-[var(--border-default)]">
                            <ShieldCheck className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                            <span className="text-sm text-[var(--text-secondary)] capitalize">{provider ?? 'Connected account'}</span>
                        </div>
                    </Field>
                )}
            </Group>

            {/* Sign out */}
            <Group title="Session">
                <div className="flex items-center justify-between gap-6 py-5">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">Sign out</p>
                        <p className="text-xs text-[var(--text-tertiary)] mt-0.5 leading-relaxed max-w-md">
                            Sign out of Quoril on this device. Your data stays safe in the cloud.
                        </p>
                    </div>
                    <button
                        onClick={handleSignOut}
                        disabled={signingOut}
                        className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-card)] text-sm font-semibold text-[var(--error)] bg-[var(--error)]/10 hover:bg-[var(--error)]/15 active:scale-95 disabled:opacity-50 transition-all"
                    >
                        <LogOut className="w-4 h-4" />
                        {signingOut ? 'Signing out…' : 'Sign out'}
                    </button>
                </div>
            </Group>
        </>
    )
}

// ── Main Page ────────────────────────────────────────────────

export function Settings() {
    const navigate = useNavigate()
    const settings = useSettingsStore()
    const [active, setActive] = useState<SectionId>('appearance')
    const [platform, setPlatform] = useState<string>('')
    const { status: updateStatus, check: checkForUpdate, restart: restartToUpdate } = useAppUpdate()
    // Only electron ships an auto-updater; the web build exposes 'not-available'.
    const isDesktop = !!window.electronAPI

    useEffect(() => {
        window.electronAPI?.app?.getPlatform?.().then(setPlatform)
    }, [])

    // Load the profile (name/avatar/streak) so the Account section is populated.
    const userId = useAuthStore(s => s.user?.id)
    useEffect(() => {
        if (userId) useProfileStore.getState().fetchProfile(userId)
    }, [userId])

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

    // macOS-only section is hidden elsewhere; Updates is desktop-only.
    const sections = SECTIONS.filter(s => {
        if (s.id === 'about') return platform === 'darwin'
        if (s.id === 'updates') return isDesktop
        return true
    })
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
                                {activeSection.id === 'account' && <AccountSection />}

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
                                        <Group title="AI">
                                            <ToggleRow
                                                label="Generate Insights"
                                                description="Show the Generate Insights button on Reports. Sends only summarized report metrics — never your raw screen history."
                                                value={settings.aiInsightsEnabled}
                                                onChange={(v: boolean) => settings.updateSettings({ aiInsightsEnabled: v })}
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

                                {activeSection.id === 'updates' && (
                                    <Group title="Automatic updates">
                                        <div className="py-5 border-b border-[var(--border-default)] last:border-0">
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                                                        {(() => {
                                                            switch (updateStatus.state) {
                                                                case 'checking': return 'Checking for updates…'
                                                                case 'available': return 'Update found — preparing download…'
                                                                case 'downloading': return `Downloading update… ${updateStatus.percent}%`
                                                                case 'downloaded': return 'Update ready to install'
                                                                case 'error': return 'Could not check for updates'
                                                                default: return 'Quoril is up to date'
                                                            }
                                                        })()}
                                                    </p>
                                                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5 leading-relaxed max-w-md">
                                                        Quoril checks for updates automatically and downloads them in the
                                                        background. You’ll be asked to restart once an update is ready.
                                                    </p>
                                                </div>
                                                {updateStatus.state === 'downloaded' ? (
                                                    <button
                                                        onClick={() => restartToUpdate()}
                                                        className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-card)] text-xs font-semibold bg-[var(--accent-primary)] text-[var(--accent-contrast)] hover:opacity-90 transition-opacity"
                                                    >
                                                        <RotateCw className="w-3.5 h-3.5" />
                                                        Restart Now
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => checkForUpdate()}
                                                        disabled={updateStatus.state === 'checking' || updateStatus.state === 'downloading'}
                                                        className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-card)] text-xs font-semibold text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--border-default)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        {updateStatus.state === 'downloading'
                                                            ? <Download className="w-3.5 h-3.5" />
                                                            : <RefreshCw className={cn('w-3.5 h-3.5', updateStatus.state === 'checking' && 'animate-spin')} />}
                                                        Check for updates
                                                    </button>
                                                )}
                                            </div>
                                            {(updateStatus.state === 'downloading' || updateStatus.state === 'downloaded') && (
                                                <div className="h-1.5 w-full rounded-full bg-[var(--bg-tertiary)] overflow-hidden mt-4">
                                                    <div
                                                        className="h-full rounded-full bg-[var(--accent-primary)] transition-[width] duration-300 ease-out"
                                                        style={{ width: `${updateStatus.state === 'downloading' ? updateStatus.percent : 100}%` }}
                                                    />
                                                </div>
                                            )}
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
