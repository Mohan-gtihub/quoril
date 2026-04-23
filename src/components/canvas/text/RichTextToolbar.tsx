import { BubbleMenu } from '@tiptap/react/menus'
import type { Editor } from '@tiptap/react'
import {
    Bold, Italic, Underline as UL, Strikethrough, Code,
    Heading1, Heading2, Heading3,
    List, ListOrdered, ListChecks,
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Link as LinkIcon, Highlighter, Palette, Type, ChevronDown,
} from 'lucide-react'
import { useState } from 'react'
import { FONT_FAMILIES, FONT_SIZES, TEXT_COLORS, HIGHLIGHT_COLORS } from './extensions'

function Btn({ active, onClick, title, children }: { active?: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onClick() }}
            title={title}
            className={`h-7 min-w-7 px-1 rounded text-xs flex items-center justify-center ${active ? 'bg-[var(--accent-primary)] text-white' : 'hover:bg-[var(--bg-hover)] text-[var(--text-primary)]'}`}
        >
            {children}
        </button>
    )
}

function Sep() { return <div className="w-px h-4 bg-[var(--border-default)] mx-0.5" /> }

function Dropdown({ label, children, width = 160 }: { label: React.ReactNode; children: React.ReactNode; width?: number }) {
    const [open, setOpen] = useState(false)
    return (
        <div className="relative">
            <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); setOpen((o) => !o) }}
                className="h-7 px-1.5 text-xs rounded hover:bg-[var(--bg-hover)] flex items-center gap-1 text-[var(--text-primary)]"
            >
                {label}
                <ChevronDown className="w-3 h-3" />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onMouseDown={() => setOpen(false)} />
                    <div
                        className="absolute top-8 left-0 z-50 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-md shadow-lg py-1"
                        style={{ width }}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setOpen(false)}
                    >
                        {children}
                    </div>
                </>
            )}
        </div>
    )
}

function Swatch({ color, onClick, title }: { color: string; onClick: () => void; title: string }) {
    return (
        <button type="button" title={title} onClick={onClick} className="w-5 h-5 rounded border border-black/10" style={{ background: color }} />
    )
}

export function RichTextToolbar({ editor }: { editor: Editor | null }) {
    if (!editor) return null

    const promptLink = () => {
        const prev = editor.getAttributes('link').href as string | undefined
        const url = window.prompt('URL', prev ?? 'https://')
        if (url === null) return
        if (url === '') { editor.chain().focus().unsetLink().run(); return }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }

    return (
        <BubbleMenu
            editor={editor}
            options={{ placement: 'top' }}
            className="flex items-center gap-0.5 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg shadow-xl px-1 py-1 flex-wrap max-w-[640px]"
        >
            {/* Font family */}
            <Dropdown label={<><Type className="w-3.5 h-3.5" /><span className="hidden md:inline">Font</span></>} width={180}>
                {FONT_FAMILIES.map((f) => (
                    <button
                        key={f.label}
                        className="w-full text-left px-2 py-1 text-xs hover:bg-[var(--bg-hover)] text-[var(--text-primary)]"
                        style={{ fontFamily: f.value || undefined }}
                        onClick={() => f.value ? editor.chain().focus().setFontFamily(f.value).run() : editor.chain().focus().unsetFontFamily().run()}
                    >
                        {f.label}
                    </button>
                ))}
            </Dropdown>

            {/* Font size */}
            <Dropdown label={<span className="text-[11px] font-mono">Size</span>} width={90}>
                {FONT_SIZES.map((s) => (
                    <button key={s} className="w-full text-left px-2 py-1 text-xs hover:bg-[var(--bg-hover)] text-[var(--text-primary)]" onClick={() => editor.chain().focus().setFontSize(s).run()}>
                        {s}
                    </button>
                ))}
                <button className="w-full text-left px-2 py-1 text-xs hover:bg-[var(--bg-hover)] text-[var(--text-muted)] border-t border-[var(--border-default)]" onClick={() => editor.chain().focus().unsetFontSize().run()}>Reset</button>
            </Dropdown>

            <Sep />

            <Btn title="Bold (⌘B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="w-3.5 h-3.5" /></Btn>
            <Btn title="Italic (⌘I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="w-3.5 h-3.5" /></Btn>
            <Btn title="Underline (⌘U)" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><UL className="w-3.5 h-3.5" /></Btn>
            <Btn title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="w-3.5 h-3.5" /></Btn>
            <Btn title="Code" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}><Code className="w-3.5 h-3.5" /></Btn>

            <Sep />

            {/* Color */}
            <Dropdown label={<Palette className="w-3.5 h-3.5" />} width={140}>
                <div className="grid grid-cols-5 gap-1 p-2">
                    {TEXT_COLORS.map((c) => (
                        <Swatch key={c} color={c} title={c} onClick={() => editor.chain().focus().setColor(c).run()} />
                    ))}
                </div>
                <button className="w-full text-left px-2 py-1 text-xs hover:bg-[var(--bg-hover)] text-[var(--text-muted)] border-t border-[var(--border-default)]" onClick={() => editor.chain().focus().unsetColor().run()}>Reset color</button>
            </Dropdown>

            {/* Highlight */}
            <Dropdown label={<Highlighter className="w-3.5 h-3.5" />} width={140}>
                <div className="grid grid-cols-5 gap-1 p-2">
                    {HIGHLIGHT_COLORS.map((c) => (
                        <Swatch key={c} color={c} title={c} onClick={() => editor.chain().focus().toggleHighlight({ color: c }).run()} />
                    ))}
                </div>
                <button className="w-full text-left px-2 py-1 text-xs hover:bg-[var(--bg-hover)] text-[var(--text-muted)] border-t border-[var(--border-default)]" onClick={() => editor.chain().focus().unsetHighlight().run()}>Clear highlight</button>
            </Dropdown>

            <Sep />

            {/* Heading levels */}
            <Btn title="H1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="w-3.5 h-3.5" /></Btn>
            <Btn title="H2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="w-3.5 h-3.5" /></Btn>
            <Btn title="H3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="w-3.5 h-3.5" /></Btn>

            <Sep />

            <Btn title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="w-3.5 h-3.5" /></Btn>
            <Btn title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="w-3.5 h-3.5" /></Btn>
            <Btn title="Task list" active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()}><ListChecks className="w-3.5 h-3.5" /></Btn>

            <Sep />

            <Btn title="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft className="w-3.5 h-3.5" /></Btn>
            <Btn title="Align center" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter className="w-3.5 h-3.5" /></Btn>
            <Btn title="Align right" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight className="w-3.5 h-3.5" /></Btn>
            <Btn title="Justify" active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()}><AlignJustify className="w-3.5 h-3.5" /></Btn>

            <Sep />

            <Btn title="Link (⌘K)" active={editor.isActive('link')} onClick={promptLink}><LinkIcon className="w-3.5 h-3.5" /></Btn>
        </BubbleMenu>
    )
}
