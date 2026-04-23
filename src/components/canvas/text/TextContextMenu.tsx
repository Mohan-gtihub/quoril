import * as ContextMenu from '@radix-ui/react-context-menu'
import type { Editor } from '@tiptap/react'
import { ChevronRight } from 'lucide-react'
import { FONT_FAMILIES, FONT_SIZES, TEXT_COLORS, HIGHLIGHT_COLORS } from './extensions'

const itemCls = 'text-xs px-2 py-1.5 rounded-sm outline-none cursor-default flex items-center justify-between gap-2 text-[var(--text-primary)] data-[highlighted]:bg-[var(--accent-primary)] data-[highlighted]:text-white'
const subCls = 'text-xs px-2 py-1.5 rounded-sm outline-none cursor-default flex items-center justify-between gap-2 text-[var(--text-primary)] data-[highlighted]:bg-[var(--accent-primary)] data-[highlighted]:text-white'
const contentCls = 'min-w-[200px] bg-[var(--bg-card)] border border-[var(--border-default)] rounded-md shadow-xl p-1 z-[9999]'
const sepCls = 'h-px bg-[var(--border-default)] my-1'

function hint(text: string) {
    return <span className="text-[10px] text-[var(--text-muted)] ml-4">{text}</span>
}

export function TextContextMenu({ editor, children }: { editor: Editor | null; children: React.ReactNode }) {
    if (!editor) return <>{children}</>

    const run = (fn: () => void) => () => { editor.chain().focus(); fn() }

    const promptLink = () => {
        const prev = editor.getAttributes('link').href as string | undefined
        const url = window.prompt('URL', prev ?? 'https://')
        if (url === null) return
        if (url === '') editor.chain().focus().unsetLink().run()
        else editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }

    return (
        <ContextMenu.Root>
            <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
            <ContextMenu.Portal>
                <ContextMenu.Content className={contentCls}>
                    <ContextMenu.Item className={itemCls} onSelect={() => document.execCommand('cut')}>
                        <span>Cut</span>{hint('⌘X')}
                    </ContextMenu.Item>
                    <ContextMenu.Item className={itemCls} onSelect={() => document.execCommand('copy')}>
                        <span>Copy</span>{hint('⌘C')}
                    </ContextMenu.Item>
                    <ContextMenu.Item className={itemCls} onSelect={() => navigator.clipboard.readText().then((t) => editor.chain().focus().insertContent(t).run()).catch(() => {})}>
                        <span>Paste</span>{hint('⌘V')}
                    </ContextMenu.Item>
                    <ContextMenu.Item className={itemCls} onSelect={() => navigator.clipboard.readText().then((t) => editor.chain().focus().insertContent({ type: 'text', text: t }).run()).catch(() => {})}>
                        <span>Paste as plain text</span>{hint('⌘⇧V')}
                    </ContextMenu.Item>

                    <ContextMenu.Separator className={sepCls} />

                    <ContextMenu.Item className={itemCls} onSelect={run(() => editor.chain().toggleBold().run())}>
                        <span>Bold</span>{hint('⌘B')}
                    </ContextMenu.Item>
                    <ContextMenu.Item className={itemCls} onSelect={run(() => editor.chain().toggleItalic().run())}>
                        <span>Italic</span>{hint('⌘I')}
                    </ContextMenu.Item>
                    <ContextMenu.Item className={itemCls} onSelect={run(() => editor.chain().toggleUnderline().run())}>
                        <span>Underline</span>{hint('⌘U')}
                    </ContextMenu.Item>
                    <ContextMenu.Item className={itemCls} onSelect={run(() => editor.chain().toggleStrike().run())}>Strikethrough</ContextMenu.Item>

                    <ContextMenu.Sub>
                        <ContextMenu.SubTrigger className={subCls}><span>Font</span><ChevronRight className="w-3 h-3" /></ContextMenu.SubTrigger>
                        <ContextMenu.Portal>
                            <ContextMenu.SubContent className={contentCls}>
                                {FONT_FAMILIES.map((f) => (
                                    <ContextMenu.Item key={f.label} className={itemCls} style={{ fontFamily: f.value || undefined }}
                                        onSelect={run(() => f.value ? editor.chain().setFontFamily(f.value).run() : editor.chain().unsetFontFamily().run())}>
                                        {f.label}
                                    </ContextMenu.Item>
                                ))}
                            </ContextMenu.SubContent>
                        </ContextMenu.Portal>
                    </ContextMenu.Sub>

                    <ContextMenu.Sub>
                        <ContextMenu.SubTrigger className={subCls}><span>Size</span><ChevronRight className="w-3 h-3" /></ContextMenu.SubTrigger>
                        <ContextMenu.Portal>
                            <ContextMenu.SubContent className={contentCls}>
                                {FONT_SIZES.map((s) => (
                                    <ContextMenu.Item key={s} className={itemCls} onSelect={run(() => editor.chain().setFontSize(s).run())}>{s}</ContextMenu.Item>
                                ))}
                                <ContextMenu.Item className={itemCls} onSelect={run(() => editor.chain().unsetFontSize().run())}>Reset</ContextMenu.Item>
                            </ContextMenu.SubContent>
                        </ContextMenu.Portal>
                    </ContextMenu.Sub>

                    <ContextMenu.Sub>
                        <ContextMenu.SubTrigger className={subCls}><span>Color</span><ChevronRight className="w-3 h-3" /></ContextMenu.SubTrigger>
                        <ContextMenu.Portal>
                            <ContextMenu.SubContent className={contentCls}>
                                <div className="grid grid-cols-5 gap-1 p-1">
                                    {TEXT_COLORS.map((c) => (
                                        <button key={c} className="w-5 h-5 rounded border border-black/10" style={{ background: c }} onClick={run(() => editor.chain().setColor(c).run())} />
                                    ))}
                                </div>
                                <ContextMenu.Item className={itemCls} onSelect={run(() => editor.chain().unsetColor().run())}>Reset color</ContextMenu.Item>
                            </ContextMenu.SubContent>
                        </ContextMenu.Portal>
                    </ContextMenu.Sub>

                    <ContextMenu.Sub>
                        <ContextMenu.SubTrigger className={subCls}><span>Highlight</span><ChevronRight className="w-3 h-3" /></ContextMenu.SubTrigger>
                        <ContextMenu.Portal>
                            <ContextMenu.SubContent className={contentCls}>
                                <div className="grid grid-cols-5 gap-1 p-1">
                                    {HIGHLIGHT_COLORS.map((c) => (
                                        <button key={c} className="w-5 h-5 rounded border border-black/10" style={{ background: c }} onClick={run(() => editor.chain().toggleHighlight({ color: c }).run())} />
                                    ))}
                                </div>
                                <ContextMenu.Item className={itemCls} onSelect={run(() => editor.chain().unsetHighlight().run())}>Clear</ContextMenu.Item>
                            </ContextMenu.SubContent>
                        </ContextMenu.Portal>
                    </ContextMenu.Sub>

                    <ContextMenu.Separator className={sepCls} />

                    <ContextMenu.Sub>
                        <ContextMenu.SubTrigger className={subCls}><span>Paragraph</span><ChevronRight className="w-3 h-3" /></ContextMenu.SubTrigger>
                        <ContextMenu.Portal>
                            <ContextMenu.SubContent className={contentCls}>
                                <ContextMenu.Item className={itemCls} onSelect={run(() => editor.chain().setParagraph().run())}>Paragraph</ContextMenu.Item>
                                {[1, 2, 3, 4].map((lvl) => (
                                    <ContextMenu.Item key={lvl} className={itemCls} onSelect={run(() => editor.chain().toggleHeading({ level: lvl as 1 | 2 | 3 | 4 }).run())}>Heading {lvl}</ContextMenu.Item>
                                ))}
                                <ContextMenu.Separator className={sepCls} />
                                <ContextMenu.Item className={itemCls} onSelect={run(() => editor.chain().toggleBlockquote().run())}>Blockquote</ContextMenu.Item>
                                <ContextMenu.Item className={itemCls} onSelect={run(() => editor.chain().toggleCodeBlock().run())}>Code block</ContextMenu.Item>
                                <ContextMenu.Item className={itemCls} onSelect={run(() => editor.chain().setHorizontalRule().run())}>Horizontal rule</ContextMenu.Item>
                            </ContextMenu.SubContent>
                        </ContextMenu.Portal>
                    </ContextMenu.Sub>

                    <ContextMenu.Sub>
                        <ContextMenu.SubTrigger className={subCls}><span>List</span><ChevronRight className="w-3 h-3" /></ContextMenu.SubTrigger>
                        <ContextMenu.Portal>
                            <ContextMenu.SubContent className={contentCls}>
                                <ContextMenu.Item className={itemCls} onSelect={run(() => editor.chain().toggleBulletList().run())}>Bulleted</ContextMenu.Item>
                                <ContextMenu.Item className={itemCls} onSelect={run(() => editor.chain().toggleOrderedList().run())}>Numbered</ContextMenu.Item>
                                <ContextMenu.Item className={itemCls} onSelect={run(() => editor.chain().toggleTaskList().run())}>Task list</ContextMenu.Item>
                            </ContextMenu.SubContent>
                        </ContextMenu.Portal>
                    </ContextMenu.Sub>

                    <ContextMenu.Sub>
                        <ContextMenu.SubTrigger className={subCls}><span>Align</span><ChevronRight className="w-3 h-3" /></ContextMenu.SubTrigger>
                        <ContextMenu.Portal>
                            <ContextMenu.SubContent className={contentCls}>
                                {(['left', 'center', 'right', 'justify'] as const).map((a) => (
                                    <ContextMenu.Item key={a} className={itemCls} onSelect={run(() => editor.chain().setTextAlign(a).run())}>{a[0].toUpperCase() + a.slice(1)}</ContextMenu.Item>
                                ))}
                            </ContextMenu.SubContent>
                        </ContextMenu.Portal>
                    </ContextMenu.Sub>

                    <ContextMenu.Separator className={sepCls} />

                    <ContextMenu.Item className={itemCls} onSelect={promptLink}>
                        <span>{editor.isActive('link') ? 'Edit link…' : 'Insert link…'}</span>{hint('⌘K')}
                    </ContextMenu.Item>
                    <ContextMenu.Item className={itemCls} onSelect={run(() => editor.chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}>Insert table</ContextMenu.Item>
                    <ContextMenu.Item className={itemCls} onSelect={run(() => editor.chain().toggleSuperscript().run())}>Superscript</ContextMenu.Item>
                    <ContextMenu.Item className={itemCls} onSelect={run(() => editor.chain().toggleSubscript().run())}>Subscript</ContextMenu.Item>

                    <ContextMenu.Separator className={sepCls} />

                    <ContextMenu.Item className={itemCls} onSelect={run(() => editor.chain().unsetAllMarks().clearNodes().run())}>Clear formatting</ContextMenu.Item>
                    <ContextMenu.Item className={itemCls} onSelect={run(() => editor.chain().selectAll().run())}>
                        <span>Select all</span>{hint('⌘A')}
                    </ContextMenu.Item>

                    <ContextMenu.Separator className={sepCls} />

                    <ContextMenu.Item className={itemCls} onSelect={() => editor.chain().focus().undo().run()}>
                        <span>Undo</span>{hint('⌘Z')}
                    </ContextMenu.Item>
                    <ContextMenu.Item className={itemCls} onSelect={() => editor.chain().focus().redo().run()}>
                        <span>Redo</span>{hint('⌘⇧Z')}
                    </ContextMenu.Item>
                </ContextMenu.Content>
            </ContextMenu.Portal>
        </ContextMenu.Root>
    )
}
