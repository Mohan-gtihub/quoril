import { memo } from 'react'
import {
    BaseEdge, EdgeLabelRenderer, getBezierPath, getSmoothStepPath,
    type EdgeProps, MarkerType,
} from '@xyflow/react'
import {
    Check, Play, Hourglass, ListChecks, Percent, GitMerge, Dot, HelpCircle,
    type LucideIcon,
} from 'lucide-react'
import type { ConnectionKind, EdgeCondition } from '@/types/canvas'

const COLORS: Record<ConnectionKind, string> = {
    reference: '#6366f1',
    flow: '#8b5cf6',
    dependency: '#ef4444',
}

const TRIGGER_ICON: Record<string, LucideIcon> = {
    task_completed: Check,
    task_started: Play,
    focus_session_ended: Hourglass,
    checklist_complete: ListChecks,
    checklist_threshold: Percent,
    all_upstream_met: GitMerge,
    manual: Dot,
}

type Data = {
    kind: ConnectionKind
    label?: string
    condition?: EdgeCondition
    userStyle?: { color?: string; dashed?: boolean; width?: number }
    pending?: boolean
}

function EdgeImpl(props: EdgeProps & { data?: Data }) {
    const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, selected, data, markerEnd } = props
    const kind = data?.kind ?? 'reference'
    const color = data?.userStyle?.color ?? COLORS[kind]
    const width = data?.userStyle?.width ?? (kind === 'dependency' ? 3 : 1.5)
    const dashed = data?.userStyle?.dashed ?? (kind === 'flow')

    const [path, labelX, labelY] = kind === 'reference'
        ? getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
        : getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 16 })

    const strokeDasharray = dashed
        ? (data?.pending ? '4 3' : '6 4')
        : undefined

    const hasCondition = !!data?.condition
    const BadgeIcon = hasCondition ? (TRIGGER_ICON[data!.condition!.trigger] ?? HelpCircle) : null

    return (
        <>
            <BaseEdge
                id={id}
                path={path}
                markerEnd={markerEnd}
                style={{
                    stroke: color,
                    strokeWidth: selected ? width + 1 : width,
                    strokeDasharray,
                    opacity: props.style?.opacity as number | undefined,
                    filter: selected ? `drop-shadow(0 0 4px ${color})` : undefined,
                }}
            />
            {(data?.label || BadgeIcon) && (
                <EdgeLabelRenderer>
                    <div
                        className="absolute pointer-events-auto flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-[var(--bg-card)] border shadow-sm"
                        style={{
                            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                            borderColor: color,
                            color,
                        }}
                    >
                        {BadgeIcon && <span title={data?.condition?.trigger} className="flex items-center"><BadgeIcon size={11} /></span>}
                        {data?.label && <span className="text-[var(--text-primary)]">{data.label}</span>}
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    )
}

export const ReferenceEdge = memo(EdgeImpl)
export const FlowEdge = memo(EdgeImpl)
export const DependencyEdge = memo(EdgeImpl)

export const EDGE_COLORS = COLORS
export const EDGE_MARKER = (kind: ConnectionKind) => ({ type: MarkerType.ArrowClosed, color: COLORS[kind] })
