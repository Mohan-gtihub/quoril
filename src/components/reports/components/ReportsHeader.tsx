import { ChevronLeft, Zap } from 'lucide-react'
import { DateRangePicker } from './DateRangePicker'
import type { DateRange } from './DateRangePicker'

interface ReportsHeaderProps {
    navigate: (path: string) => void
    dateRange: DateRange
    setDateRange: (range: DateRange) => void
}

export function ReportsHeader({ navigate, dateRange, setDateRange }: ReportsHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/')}
                    className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors group"
                >
                    <ChevronLeft size={20} className="text-white/60 group-hover:text-white" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Analytics</h1>
                    <p className="text-xs text-white/40 font-mono mt-0.5">Track your focus & consistency</p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <DateRangePicker
                    value={dateRange}
                    onChange={setDateRange}
                />

                <button className="h-10 px-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center gap-2 hover:border-amber-500/50 transition-colors group">
                    <Zap size={16} className="text-amber-400 group-hover:text-amber-300 transition-colors" />
                    <span className="text-xs font-bold text-amber-200 group-hover:text-amber-100 uppercase tracking-wider">Upgrade</span>
                </button>
            </div>
        </div>
    )
}
