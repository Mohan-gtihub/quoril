import { ChevronLeft, Trash2 } from 'lucide-react'
import { DateRangePicker } from './DateRangePicker'
import type { DateRange } from './DateRangePicker'
import { useFocusStore } from '@/store/focusStore'
import toast from 'react-hot-toast'
import { confirm } from '@/components/ui/ConfirmDialog'

interface ReportsHeaderProps {
    navigate: (path: string) => void
    dateRange: DateRange
    setDateRange: (range: DateRange) => void
}

export function ReportsHeader({ navigate, dateRange, setDateRange }: ReportsHeaderProps) {
    const { clearHistory } = useFocusStore()

    const handleClearHistory = async () => {
        if (await confirm({ message: 'Clear all session history? This cannot be undone.', variant: 'danger', confirmLabel: 'Clear History' })) {
            await clearHistory()
            toast.success('History cleared')
        }
    }

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/')}
                    className="w-10 h-10 rounded-full bg-[var(--bg-hover)] hover:bg-[var(--bg-tertiary)] flex items-center justify-center transition-colors group border border-[var(--border-default)]"
                >
                    <ChevronLeft size={20} className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Analytics</h1>
                    <p className="text-xs text-[var(--text-tertiary)] font-medium mt-0.5">Performance & History</p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <DateRangePicker
                    value={dateRange}
                    onChange={setDateRange}
                />

                <button
                    onClick={handleClearHistory}
                    className="h-10 px-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 hover:bg-red-500/20 hover:border-red-500/30 transition-colors group"
                >
                    <Trash2 size={16} className="text-red-400/70 group-hover:text-red-400 transition-colors" />
                    <span className="text-xs font-medium text-red-400/70 group-hover:text-red-400">Clear Data</span>
                </button>
            </div>
        </div>
    )
}
