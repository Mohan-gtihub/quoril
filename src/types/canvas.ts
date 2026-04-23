export type BlockKind =
    | 'text' | 'image' | 'video' | 'link'
    | 'checklist' | 'idea' | 'task_ref'

export interface TextContent { doc: unknown /* ProseMirror JSON */ }
export interface ImageContent { src: string; alt?: string; natW?: number; natH?: number; freeResize?: boolean }
export interface VideoContent { provider: 'youtube'; videoId: string; start?: number }
export interface LinkContent {
    url: string
    title?: string
    description?: string
    image?: string
    siteName?: string
    fetchedAt?: number
}
export interface ChecklistItem { id: string; text: string; done: boolean }
export interface ChecklistContent { items: ChecklistItem[] }
export interface IdeaContent { text?: string; doc?: unknown; color?: string; icon?: string }
export interface TaskRefContent { taskId: string }

export type BlockContent =
    | { kind: 'text'; data: TextContent }
    | { kind: 'image'; data: ImageContent }
    | { kind: 'video'; data: VideoContent }
    | { kind: 'link'; data: LinkContent }
    | { kind: 'checklist'; data: ChecklistContent }
    | { kind: 'idea'; data: IdeaContent }
    | { kind: 'task_ref'; data: TaskRefContent }

export interface BlockStyle { bg?: string; border?: string; opacity?: number }

export interface Block {
    id: string
    canvasId: string
    userId: string
    kind: BlockKind
    x: number; y: number; w: number; h: number; z: number
    rotation?: number
    content: BlockContent
    style?: BlockStyle
    tags?: string[]
    linkedTaskId?: string | null
    isLandmark?: boolean
    lastTouchedAt?: string
    createdAt: string
    updatedAt: string
    deletedAt?: string | null
}

export type ConnectionKind = 'reference' | 'flow' | 'dependency'
export type Anchor = 'auto' | 'n' | 's' | 'e' | 'w'

export type ConditionTrigger =
    | 'task_completed'
    | 'task_started'
    | 'focus_session_ended'
    | 'checklist_complete'
    | 'checklist_threshold'
    | 'all_upstream_met'
    | 'manual'

export type DownstreamAction =
    | 'unlock'
    | 'auto_start_focus'
    | 'mark_ready'
    | 'promote_idea_to_task'

export interface EdgeCondition {
    trigger: ConditionTrigger
    params?: { minMinutes?: number; thresholdPct?: number }
    action: DownstreamAction
    lastFiredAt?: string
}

export interface Connection {
    id: string
    canvasId: string
    userId: string
    fromBlockId: string
    toBlockId: string
    fromAnchor?: Anchor
    toAnchor?: Anchor
    kind: ConnectionKind
    label?: string
    style?: { color?: string; dashed?: boolean; width?: number }
    condition?: EdgeCondition
    createdAt: string
    updatedAt: string
    deletedAt?: string | null
}

export type ZonePattern = 'none' | 'dots' | 'grid' | 'noise'

export interface Zone {
    id: string
    canvasId: string
    userId: string
    name: string
    color?: string
    icon?: string
    pattern?: ZonePattern
    bounds: { x: number; y: number; w: number; h: number }
    createdAt: string
    updatedAt: string
    deletedAt?: string | null
}

export interface Viewport { x: number; y: number; zoom: number }

export interface CanvasSettings {
    grid: boolean
    snap: boolean
    autoZoneHints: boolean
    theme?: string
}

export interface Canvas {
    id: string
    userId: string
    workspaceId?: string | null
    title: string
    icon?: string
    color?: string
    viewport: Viewport
    homeViewport?: Viewport
    settings: CanvasSettings
    schemaVersion: number
    createdAt: string
    updatedAt: string
    deletedAt?: string | null
}
