import { useEditor, EditorContent } from '@tiptap/react'
import { useEffect, useRef } from 'react'
import { useBlocksStore } from '@/store/canvas/blocksStore'
import { richTextExtensions } from '../text/extensions'
import { RichTextToolbar } from '../text/RichTextToolbar'
import { TextContextMenu } from '../text/TextContextMenu'
import type { BlockBehavior, BlockRenderProps } from './registry'

function Render({ block, selected }: BlockRenderProps) {
    const data = (block.content.kind === 'text' ? block.content.data : { doc: null }) as { doc: any }
    const patch = useBlocksStore((s) => s.patch)
    const saveRef = useRef<number | null>(null)

    const editor = useEditor({
        extensions: richTextExtensions('Write something…'),
        content: data.doc ?? '',
        editorProps: {
            attributes: {
                class: 'tiptap prose prose-sm max-w-none outline-none w-full h-full p-3 text-[var(--text-primary)]',
            },
        },
        onUpdate: ({ editor }) => {
            if (saveRef.current) window.clearTimeout(saveRef.current)
            saveRef.current = window.setTimeout(() => {
                patch(block.id, { content: { kind: 'text', data: { doc: editor.getJSON() } } }, true)
            }, 400)
        },
    })

    useEffect(() => () => { if (saveRef.current) window.clearTimeout(saveRef.current) }, [])
    useEffect(() => { if (selected && editor && !editor.isFocused) editor.commands.focus('end') }, [selected, editor])

    return (
        <TextContextMenu editor={editor}>
            <div
                className="w-full h-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] overflow-auto"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <EditorContent editor={editor} className="w-full h-full" />
                <RichTextToolbar editor={editor} />
            </div>
        </TextContextMenu>
    )
}

export const TextBehavior: BlockBehavior = { render: Render }
