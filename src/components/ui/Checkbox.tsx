import { Check } from 'lucide-react'

interface CheckboxProps {
    checked: boolean
    onChange: () => void
    size?: 'xs' | 'sm' | 'md' | 'lg'
    className?: string
}

export function Checkbox({ checked, onChange, size = 'md', className = '' }: CheckboxProps) {
    const sizeClasses = {
        xs: 'w-3.5 h-3.5',
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6'
    }

    const iconSizes = {
        xs: 'w-2 h-2',
        sm: 'w-2.5 h-2.5',
        md: 'w-3 h-3',
        lg: 'w-4 h-4'
    }

    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            onClick={(e) => {
                e.stopPropagation()
                onChange()
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className={`${sizeClasses[size]} rounded border-2 flex items-center justify-center transition-all duration-200 cursor-pointer group ${className}`}
            style={{
                borderColor: checked ? 'var(--accent-green-500)' : 'var(--text-muted)',
                backgroundColor: checked ? 'var(--accent-green-500)' : 'transparent',
                boxShadow: checked ? '0 0 0 3px rgba(16, 185, 129, 0.1)' : 'none'
            }}
        >
            {checked && (
                <Check
                    className={`${iconSizes[size]} transition-all duration-200 animate-in zoom-in-50`}
                    style={{ color: 'white', strokeWidth: 3 }}
                />
            )}
        </button>
    )
}
