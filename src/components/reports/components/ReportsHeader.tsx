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
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/')}
                    className="w-9 h-9 rounded-full hover:bg-[var(--bg-hover)] flex items-center justify-center transition-colors group"
                >
                    <ChevronLeft size={20} className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]" />
                </button>
                <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)] mb-1">Performance report</p>
                    <h1 className="text-[30px] leading-none font-semibold text-[var(--text-primary)] tracking-tight">Analytics</h1>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <DateRangePicker
                    value={dateRange}
                    onChange={setDateRange}
                />

                <button
                    onClick={handleClearHistory}
                    className="h-9 px-3.5 rounded-full border border-[var(--border-default)] flex items-center gap-2 hover:bg-[var(--bg-hover)] hover:border-[var(--border-hover)] transition-colors group"
                >
                    <Trash2 size={15} className="text-[var(--text-tertiary)] group-hover:text-[var(--error)] transition-colors" />
                    <span className="text-xs font-medium text-[var(--text-tertiary)] group-hover:text-[var(--error)]">Clear Data</span>
                </button>
            </div>
        </header>
    )
}
