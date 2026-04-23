import type { BlockBehavior, BlockRenderProps } from './registry'

function Render({ block }: BlockRenderProps) {
    return (
        <div className="w-full h-full flex items-center justify-center rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--bg-card)] text-xs text-[var(--text-muted)]">
            {block.kind} (not implemented)
        </div>
    )
}

export const PlaceholderBehavior: BlockBehavior = { render: Render }
