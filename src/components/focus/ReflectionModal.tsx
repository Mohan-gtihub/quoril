
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-[#232936] rounded-2xl shadow-2xl border border-gray-700 p-6 transform scale-100 transition-all">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Session Reflection</h2>
                    <button onClick={onSkip} className="text-gray-500 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-8">
                    {/* Focus Score */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">Focus Quality</label>
                        <div className="flex justify-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => setFocusScore(star)}
                                    className={`p-2 rounded-lg transition-all transform hover:scale-110 ${focusScore >= star ? 'text-yellow-400 scale-110' : 'text-gray-600 hover:text-yellow-400'
                                        }`}
                                >
                                    <Star className="w-8 h-8 fill-current" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Energy Level */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">Energy Left</label>
                        <div className="flex justify-center gap-4">
                            {[
                                { val: 1, label: 'Low', color: 'bg-red-500' },
                                { val: 3, label: 'Med', color: 'bg-yellow-500' },
                                { val: 5, label: 'High', color: 'bg-green-500' }
                            ].map((level) => (
                                <button
                                    key={level.val}
                                    onClick={() => setEnergyLevel(level.val)}
                                    className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all border-2 ${energyLevel === level.val
                                        ? 'border-blue-500 bg-blue-500/10'
                                        : 'border-transparent hover:bg-gray-800'
                                        }`}
                                >
                                    <div className={`w-3 h-8 rounded-full ${level.color} ${energyLevel === level.val ? 'shadow-[0_0_10px_currentColor]' : 'opacity-40'}`}></div>
                                    <span className={`text-xs font-bold ${energyLevel === level.val ? 'text-white' : 'text-gray-500'}`}>{level.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">Notes (Optional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="What blocked you? What went well?"
                            className="w-full h-24 bg-[#1a1f2e] border border-gray-700 rounded-lg p-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                        />
                    </div>
                </div>

                <div className="mt-8 flex gap-3">
                    <button
                        onClick={handleSubmit}
                        disabled={focusScore === 0 || energyLevel === 0}
                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-colors shadow-lg shadow-blue-900/20"
                    >
                        Save & Continue
                    </button>
                </div>
            </div>
        </div>
    )
}
