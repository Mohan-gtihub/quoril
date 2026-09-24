import { useState, useMemo } from 'react'
import { ArrowLeft, RefreshCw, AlertCircle, Lock, Target, CornerDownRight, TrendingUp, TrendingDown } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
    ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
    ReferenceLine, ResponsiveContainer, Cell, Tooltip,
} from 'recharts'
import { useCalibrationData } from './useCalibrationData'
import { useCalibration, MIN_PATTERN_SAMPLES, type CalibrationSample } from './useCalibration'

/* ─── Semantic colours (mirrors Reports) ────────────────────── */
// Swift maps: under → focus (blue), close → wellbeing (teal), over → break (amber).
const C = {
    under: 'var(--focus)',
    close: 'var(--wellbeing)',
    over: 'var(--break)',
    ink: 'var(--text-tertiary)',
}

const BUCKET_COLOR: Record<CalibrationSample['bucket'], string> = {
    under: C.under,
    close: C.close,
    over: C.over,
}

/* ─── Primitives ────────────────────────────────────────────── */

function Eyebrow({ children }: { children: React.ReactNode }) {
    return <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">{children}</p>
}

function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className={`rounded-[var(--radius-tile)] bg-[var(--bg-card)] border border-[var(--border-default)] shadow-[var(--shadow-soft)] p-6 ${className}`}
        >
            {children}
        </motion.section>
    )
}

function Skeleton({ h = 'h-40' }: { h?: string }) {
    return <div className={`animate-pulse bg-[var(--bg-hover)] rounded-[var(--radius-tile)] ${h}`} />
}

// The under / close / over distribution — a single capsule split by proportion,
// a direct port of Swift's AccuracyBand.
function AccuracyBand({ under, close, over }: { under: number; close: number; over: number }) {
    const total = Math.max(under + close + over, 1)
    const segs = [
        { value: under, color: C.under },
        { value: close, color: C.close },
        { value: over, color: C.over },
    ]
    const empty = under + close + over === 0
    return (
        <div className="flex gap-[3px] h-[18px] rounded-full overflow-hidden bg-[var(--track)]" style={{ opacity: empty ? 0.24 : 1 }}>
            {segs.map((s, i) => s.value > 0 && (
                <motion.div
                    key={i}
                    className="h-full rounded-[5px]"
                    style={{ background: s.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(s.value / total) * 100}%` }}
                    transition={{ duration: 0.58, ease: 'easeOut', delay: i * 0.05 }}
                />
            ))}
        </div>
    )
}

function BandKey({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="flex items-center gap-1.5 flex-1">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: color }} />
            <span className="text-[12px] font-medium text-[var(--text-secondary)]">{label}</span>
            <span className="text-[12px] tabular-nums text-[var(--text-muted)]">{value}</span>
        </div>
    )
}

/* ─── Scatter: estimated vs actual ──────────────────────────── */

function CalibrationTooltip({ active, payload }: any) {
    if (!active || !payload?.length) return null
    const s: CalibrationSample = payload[0].payload
    const sign = s.variancePct >= 0 ? '+' : ''
    return (
        <div className="rounded-[var(--radius-card)] bg-[var(--bg-card)] border border-[var(--border-default)] shadow-[var(--shadow-soft)] px-3 py-2 max-w-[220px]">
            <p className="text-[12px] font-semibold text-[var(--text-primary)] truncate">{s.title}</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-1 tabular-nums">
                Planned {s.estimatedMin}m · took {s.actualMin}m
            </p>
            <p className="text-[11px] font-semibold tabular-nums mt-0.5" style={{ color: BUCKET_COLOR[s.bucket] }}>
                {sign}{Math.round(s.variancePct)}% vs plan
            </p>
        </div>
    )
}

function EstimateScatter({ samples }: { samples: CalibrationSample[] }) {
    // Square-ish domain so the y = x "perfect estimate" diagonal reads true.
    const maxVal = Math.max(10, ...samples.map(s => Math.max(s.estimatedMin, s.actualMin)))
    const domainMax = Math.ceil((maxVal * 1.1) / 5) * 5
    return (
        <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 10, right: 16, bottom: 24, left: 4 }}>
                <CartesianGrid stroke="var(--border-default)" strokeOpacity={0.5} />
                <XAxis
                    type="number" dataKey="estimatedMin" name="Estimated"
                    domain={[0, domainMax]} tickCount={6}
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                    stroke="var(--border-default)"
                    label={{ value: 'Planned (min)', position: 'insideBottom', offset: -14, fontSize: 11, fill: 'var(--text-muted)' }}
                />
                <YAxis
                    type="number" dataKey="actualMin" name="Actual"
                    domain={[0, domainMax]} tickCount={6}
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                    stroke="var(--border-default)"
                    label={{ value: 'Actual (min)', angle: -90, position: 'insideLeft', offset: 12, fontSize: 11, fill: 'var(--text-muted)' }}
                />
                <ZAxis range={[70, 70]} />
                {/* y = x: on this line, estimate == reality. */}
                <ReferenceLine
                    segment={[{ x: 0, y: 0 }, { x: domainMax, y: domainMax }]}
                    stroke="var(--text-muted)" strokeDasharray="4 4" strokeOpacity={0.6}
                />
                <Tooltip cursor={{ strokeDasharray: '3 3', stroke: 'var(--border-default)' }} content={<CalibrationTooltip />} />
                <Scatter data={samples} fillOpacity={0.85}>
                    {samples.map(s => <Cell key={s.id} fill={BUCKET_COLOR[s.bucket]} />)}
                </Scatter>
            </ScatterChart>
        </ResponsiveContainer>
    )
}

/* ─── Task variance list ────────────────────────────────────── */

function VarianceList({ title, icon: Icon, samples, accent, empty }: {
    title: string; icon: any; samples: CalibrationSample[]; accent: string; empty: string
}) {
    return (
        <div>
            <div className="flex items-center gap-1.5 mb-2.5">
                <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
                <Eyebrow>{title}</Eyebrow>
            </div>
            {samples.length === 0 ? (
                <p className="text-[11px] text-[var(--text-muted)] py-1.5">{empty}</p>
            ) : samples.map(s => {
                const sign = s.variancePct >= 0 ? '+' : ''
                return (
                    <div key={s.id} className="flex justify-between gap-2 text-[12px] py-1.5 border-b border-[var(--border-default)] last:border-0">
                        <span className="text-[var(--text-secondary)] truncate">{s.title}</span>
                        <span className="tabular-nums shrink-0 font-medium flex items-center gap-2" style={{ color: accent }}>
                            <span className="text-[var(--text-muted)] font-normal">{s.estimatedMin}m → {s.actualMin}m</span>
                            {sign}{Math.round(s.variancePct)}%
                        </span>
                    </div>
                )
            })}
        </div>
    )
}

/* ════════════════════════════════════════════════════════════════
   MAIN
════════════════════════════════════════════════════════════════ */

export function CalibrationScreen() {
    const navigate = useNavigate()
    const [retryKey, setRetryKey] = useState(0)
    const { tasks, loading, error, available } = useCalibrationData(retryKey)
    const cal = useCalibration(tasks)

    const factorLabel = useMemo(() => {
        const f = cal.adjustmentFactor
        if (f > 1.02) return `${Math.round((f - 1) * 100)}% longer`
        if (f < 0.98) return `${Math.round((1 - f) * 100)}% shorter`
        return 'on the mark'
    }, [cal.adjustmentFactor])

    return (
        <div className="flex-1 overflow-y-auto w-full h-full custom-scrollbar select-none pb-24">
            <div className="max-w-[1120px] mx-auto px-6 md:px-10 py-10 space-y-6">

                {/* ── Header ── */}
                <header className="flex flex-wrap items-end justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)}
                            className="w-9 h-9 rounded-full hover:bg-[var(--bg-hover)] flex items-center justify-center transition-colors">
                            <ArrowLeft className="w-4 h-4 text-[var(--text-secondary)]" />
                        </button>
                        <div>
                            <Eyebrow>Planning</Eyebrow>
                            <h1 className="text-[32px] leading-none font-semibold tracking-tight text-[var(--text-primary)] mt-1.5">Calibration</h1>
                            <p className="text-[12.5px] text-[var(--text-muted)] mt-2">How closely your time estimates match reality.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[var(--text-tertiary)]">
                        <Lock className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.08em]">Local analysis</span>
                    </div>
                </header>

                {/* Error banner */}
                {error && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-tile)] bg-[var(--bg-card)] border border-[var(--border-default)] shadow-[var(--shadow-soft)]">
                        <AlertCircle className="w-4 h-4 text-[var(--error)] flex-shrink-0" />
                        <p className="text-xs text-[var(--text-secondary)] flex-1">{error}</p>
                        <button onClick={() => setRetryKey(k => k + 1)} className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors">
                            <RefreshCw className="w-3 h-3" /> Retry
                        </button>
                    </div>
                )}

                {loading ? (
                    <div className="space-y-6">
                        <Skeleton h="h-52" />
                        <Skeleton h="h-80" />
                    </div>
                ) : !available ? (
                    <Card className="text-center py-14">
                        <Target className="w-7 h-7 mx-auto text-[var(--text-muted)]" />
                        <p className="text-base font-semibold text-[var(--text-primary)] mt-4">Calibration lives on the desktop app</p>
                        <p className="text-[12.5px] text-[var(--text-muted)] mt-2 max-w-[360px] mx-auto leading-relaxed">
                            Estimate-versus-reality analysis runs entirely on-device from your local task history.
                        </p>
                    </Card>
                ) : (
                    <>
                        {/* ══ VERDICT ═══════════════════════════════════════════ */}
                        <Card>
                            <div className="flex items-start justify-between gap-8">
                                <div className="min-w-0">
                                    <Eyebrow>Intent → Reality</Eyebrow>
                                    <h2 className="text-[27px] leading-tight font-semibold tracking-tight text-[var(--text-primary)] mt-2">
                                        {cal.verdict.text}
                                    </h2>
                                    <p className="text-[13px] text-[var(--text-secondary)] mt-2 max-w-[560px] leading-relaxed">
                                        {cal.verdict.detail}
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-[34px] font-semibold tabular-nums leading-none text-[var(--text-primary)]">{cal.sampleSize}</p>
                                    <p className="text-[11px] text-[var(--text-tertiary)] mt-1.5">finished estimates</p>
                                </div>
                            </div>

                            <div className="mt-6">
                                <AccuracyBand under={cal.underrun} close={cal.onTarget} over={cal.overrun} />
                                <div className="flex mt-3">
                                    <BandKey label="Under" value={cal.underrun} color={C.under} />
                                    <BandKey label="Close" value={cal.onTarget} color={C.close} />
                                    <BandKey label="Over" value={cal.overrun} color={C.over} />
                                </div>
                            </div>

                            {/* Learned calibration factor — the headline stat from dayFitAnalyzer. */}
                            <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 pt-5 border-t border-[var(--border-default)]">
                                <div>
                                    <Eyebrow>Calibration factor</Eyebrow>
                                    <p className="text-[15px] font-semibold text-[var(--text-primary)] mt-1.5">
                                        Tasks run <span style={{ color: cal.adjustmentFactor > 1 ? C.over : C.close }}>{factorLabel}</span> than planned
                                        <span className="text-[var(--text-muted)] font-normal tabular-nums"> · ×{cal.adjustmentFactor.toFixed(2)}</span>
                                    </p>
                                </div>
                                <div>
                                    <Eyebrow>Median variance</Eyebrow>
                                    <p className="text-[15px] font-semibold tabular-nums text-[var(--text-primary)] mt-1.5">
                                        {cal.medianVariancePct >= 0 ? '+' : ''}{cal.medianVariancePct}%
                                    </p>
                                </div>
                            </div>
                        </Card>

                        {/* ══ SCATTER + LISTS ═══════════════════════════════════ */}
                        {cal.sampleSize === 0 ? (
                            <Card className="text-center py-14">
                                <Target className="w-7 h-7 mx-auto text-[var(--text-muted)]" />
                                <p className="text-base font-semibold text-[var(--text-primary)] mt-4">No estimates to calibrate yet</p>
                                <p className="text-[12.5px] text-[var(--text-muted)] mt-2 max-w-[380px] mx-auto leading-relaxed">
                                    Give a task a time estimate, run a focus session on it, and finish it.
                                    After {MIN_PATTERN_SAMPLES} the pattern becomes trustworthy.
                                </p>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-4 items-start">
                                <Card>
                                    <div className="flex items-baseline justify-between mb-4">
                                        <div>
                                            <h3 className="text-[14px] font-semibold tracking-tight text-[var(--text-primary)]">Estimate vs reality</h3>
                                            <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">Each dot is a finished task. The dashed line is a perfect estimate.</p>
                                        </div>
                                    </div>
                                    <EstimateScatter samples={cal.samples} />
                                </Card>

                                <Card className="space-y-6">
                                    <VarianceList
                                        title="Most underestimated"
                                        icon={TrendingUp}
                                        accent={C.over}
                                        samples={cal.mostUnderestimated}
                                        empty="Nothing ran long — nice."
                                    />
                                    <VarianceList
                                        title="Most overestimated"
                                        icon={TrendingDown}
                                        accent={C.under}
                                        samples={cal.mostOverestimated}
                                        empty="Nothing finished early yet."
                                    />
                                </Card>
                            </div>
                        )}

                        {/* ══ NEXT PLAN ═════════════════════════════════════════ */}
                        <Card>
                            <div className="flex items-center gap-4">
                                <span className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                                    style={{ background: 'var(--focus)', color: '#fff' }}>
                                    <CornerDownRight className="w-4 h-4" />
                                </span>
                                <div className="min-w-0">
                                    <Eyebrow>Try this in your next plan</Eyebrow>
                                    <p className="text-[16px] font-semibold text-[var(--text-primary)] mt-1.5 leading-snug">{cal.nextPlan}</p>
                                </div>
                            </div>
                        </Card>
                    </>
                )}
            </div>
        </div>
    )
}

export default CalibrationScreen
