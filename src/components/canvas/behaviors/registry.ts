import type { ComponentType } from 'react'
import type { Block, BlockKind } from '@/types/canvas'

export interface BlockRenderProps {
    block: Block
    selected: boolean
    zoom: number
}

export interface BlockBehavior {
    render: ComponentType<BlockRenderProps>
}

import { IdeaBehavior } from './idea'
import { TextBehavior } from './text'
import { ImageBehavior } from './image'
import { LinkBehavior } from './link'
import { ChecklistBehavior } from './checklist'
import { VideoBehavior } from './video'
import { TaskRefBehavior } from './taskRef'

export const behaviors: Record<BlockKind, BlockBehavior> = {
    idea: IdeaBehavior,
    text: TextBehavior,
    image: ImageBehavior,
    video: VideoBehavior,
    link: LinkBehavior,
    checklist: ChecklistBehavior,
    task_ref: TaskRefBehavior,
}
