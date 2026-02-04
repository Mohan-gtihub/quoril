import { Minus, Square, X } from 'lucide-react'

export function TitleBar() {
    const handleMinimize = () => {
        window.electronAPI?.window.minimize()
    }

    const handleMaximize = () => {
        window.electronAPI?.window.maximize()
    }

    const handleClose = () => {
        window.electronAPI?.window.close()
    }

    return (
        <div
            className="h-8 bg-[#151921] flex items-center justify-between px-3 select-none z-50 border-b border-gray-800"
            style={{ WebkitAppRegion: 'drag' } as any}
        >
            <div className="flex items-center gap-2">
                <img src="/icon.png" alt="" className="w-4 h-4 opacity-70" onError={(e) => e.currentTarget.style.display = 'none'} />
                <span className="text-xs text-gray-400 font-medium">Quoril</span>
            </div>

            <div
                className="flex items-center gap-1"
                style={{ WebkitAppRegion: 'no-drag' } as any}
            >
                <button
                    onClick={handleMinimize}
                    className="p-1.5 hover:bg-gray-700 rounded-md text-gray-400 hover:text-white transition-colors"
                >
                    <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={handleMaximize}
                    className="p-1.5 hover:bg-gray-700 rounded-md text-gray-400 hover:text-white transition-colors"
                >
                    <Square className="w-3 h-3" />
                </button>
                <button
                    onClick={handleClose}
                    className="p-1.5 hover:bg-red-600 rounded-md text-gray-400 hover:text-white transition-colors group"
                >
                    <X className="w-3.5 h-3.5 group-hover:text-white" />
                </button>
            </div>
        </div>
    )
}
