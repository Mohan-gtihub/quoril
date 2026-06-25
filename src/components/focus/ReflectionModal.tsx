
import { useState } from 'react'
import { Star, X } from 'lucide-react'

interface ReflectionModalProps {
    isOpen: boolean
    onSubmit: (data: { focusScore: number; energyLevel: number; notes: string }) => void
    onSkip: () => void
}

export function ReflectionModal({ isOpen, onSubmit, onSkip }: ReflectionModalProps) {
    const [focusScore, setFocusScore] = useState<number>(0)
    const [energyLevel, setEnergyLevel] = useState<number>(0)
    const [notes, setNotes] = useState('')

    if (!isOpen) return null

    const handleSubmit = () => {
        onSubmit({ focusScore, energyLevel, notes })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-primary)]/90 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md glass-thick rounded-2xl shadow-2xl p-6 transform scale-100 transition-all">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">Session Reflection</h2>
                    <button onClick={onSkip} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-8">
                    {/* Focus Score */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">Focus Quality</label>
                        <div className="flex justify-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => setFocusScore(star)}
                                    className={`p-2 rounded-lg transition-all transform hover:scale-110 ${focusScore >= star ? 'text-[var(--accent-primary)] scale-110' : 'text-[var(--text-tertiary)] hover:text-[var(--accent-primary)]'
                                        }`}
                                >
                                    <Star className="w-8 h-8 fill-current" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Energy Level */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">Energy Left</label>
                        <div className="flex justify-center gap-4">
                            {[
                                { val: 1, label: 'Low', color: 'bg-[var(--error)]' },
                                { val: 3, label: 'Med', color: 'bg-[var(--warning)]' },
                                { val: 5, label: 'High', color: 'bg-[var(--success)]' }
                            ].map((level) => (
                                <button
                                    key={level.val}
                                    onClick={() => setEnergyLevel(level.val)}
                                    className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all border-2 ${energyLevel === level.val
                                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                                        : 'border-transparent hover:bg-[var(--bg-hover)]'
                                        }`}
                                >
                                    <div className={`w-3 h-8 rounded-full ${level.color} ${energyLevel === level.val ? '' : 'opacity-40'}`}></div>
                                    <span className={`text-xs font-bold ${energyLevel === level.val ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}>{level.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">Notes (Optional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="What blocked you? What went well?"
                            className="w-full h-24 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg p-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors resize-none"
                        />
                    </div>
                </div>

                <div className="mt-8 flex gap-3">
                    <button
                        onClick={handleSubmit}
                        disabled={focusScore === 0 || energyLevel === 0}
                        className="flex-1 py-3 bg-[var(--accent-primary)] text-[var(--accent-contrast)] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold transition-all"
                    >
                        Save & Continue
                    </button>
                </div>
            </div>
        </div>
    )
}
