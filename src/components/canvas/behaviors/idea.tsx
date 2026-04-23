import { useEditor, EditorContent } from '@tiptap/react'
import { useEffect, useRef, useState } from 'react'
import { useBlocksStore } from '@/store/canvas/blocksStore'
import { ideaTextExtensions } from '../text/extensions'
import { RichTextToolbar } from '../text/RichTextToolbar'
import { TextContextMenu } from '../text/TextContextMenu'
import type { BlockBehavior, BlockRenderProps } from './registry'

const IDEA_COLORS = [
    '#fef3c7', '#fde68a', '#fecaca', '#bbf7d0',
    '#bae6fd', '#ddd6fe', '#fbcfe8', '#e5e7eb',
]

type IdeaData = { text?: string; doc?: any; color?: string; icon?: string }

function Render({ block, selected }: BlockRenderProps) {
    const data = (block.content.kind === 'idea' ? block.content.data : {}) as IdeaData
    const patch = useBlocksStore((s) => s.patch)
    const saveRef = useRef<number | null>(null)
    const [showPalette, setShowPalette] = useState(false)

    // Legacy idea blocks stored plain text; promote to ProseMirror doc on first mount.
    const initial = data.doc ?? (data.text ? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: data.text }] }] } : '')

    const editor = useEditor({
        extensions: ideaTextExtensions('Idea…'),
        content: initial,
        editorProps: {
            attributes: {
                class: 'tiptap outline-none w-full h-full p-3 text-neutral-900 text-sm leading-snug',
            },
        },
        onUpdate: ({ editor }) => {
            if (saveRef.current) window.clearTimeout(saveRef.current)
            saveRef.current = window.setTimeout(() => {
                patch(block.id, { content: { kind: 'idea', data: { ...data, doc: editor.getJSON(), text: editor.getText() } } }, true)
            }, 400)
        },
    })

    useEffect(() => () => { if (saveRef.current) window.clearTimeout(saveRef.current) }, [])
    useEffect(() => { if (selected && editor && !editor.isFocused && editor.isEmpty) editor.commands.focus('end') }, [selected, editor])

    const bg = data.color ?? IDEA_COLORS[0]

    return (
        <TextContextMenu editor={editor}>
            <div
                className="w-full h-full relative rounded-md shadow-md overflow-hidden"
                style={{ background: bg, transform: 'rotate(-0.3deg)' }}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="w-full h-full" style={{ fontFamily: 'ui-rounded, system-ui, sans-serif' }}>
                    <EditorContent editor={editor} className="w-full h-full" />
                </div>
                <RichTextToolbar editor={editor} />
                {selected && (
                    <button
                        type="button"
                        onMouseDown={(e) => { e.stopPropagation(); setShowPalette((v) => !v) }}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full border border-black/20 bg-white/60 hover:bg-white/90"
                        title="Color"
                    />
                )}
                {selected && showPalette && (
                    <div
                        className="absolute top-8 right-1 bg-white rounded-md shadow-lg p-1 grid grid-cols-4 gap-1 z-10"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        {IDEA_COLORS.map((c) => (
                            <button
                                type="button"
                                key={c}
                                className="w-5 h-5 rounded border border-black/10"
                                style={{ background: c }}
                                onClick={() => {
                                    patch(block.id, { content: { kind: 'idea', data: { ...data, color: c } } }, true)
                                    setShowPalette(false)
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </TextContextMenu>
    )
}

export const IdeaBehavior: BlockBehavior = { render: Render }
