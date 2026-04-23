import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { TextStyle } from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Superscript from '@tiptap/extension-superscript'
import Subscript from '@tiptap/extension-subscript'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import Image from '@tiptap/extension-image'
import Typography from '@tiptap/extension-typography'
import { Extension } from '@tiptap/core'

// Minimal font-size mark riding on TextStyle (TipTap 3 compatible).
// Command signature mirrors the community extension so callers are drop-in.
declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        fontSize: {
            setFontSize: (size: string) => ReturnType
            unsetFontSize: () => ReturnType
        }
    }
}

export const FontSize = Extension.create({
    name: 'fontSize',
    addOptions() { return { types: ['textStyle'] as string[] } },
    addGlobalAttributes() {
        return [{
            types: this.options.types,
            attributes: {
                fontSize: {
                    default: null,
                    parseHTML: (el) => (el as HTMLElement).style.fontSize || null,
                    renderHTML: (attrs) => attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
                },
            },
        }]
    },
    addCommands() {
        return {
            setFontSize: (size: string) => ({ chain }) =>
                chain().setMark('textStyle', { fontSize: size }).run(),
            unsetFontSize: () => ({ chain }) =>
                chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
        }
    },
})

export const FONT_FAMILIES = [
    { label: 'Default', value: '' },
    { label: 'Inter', value: 'Inter, ui-sans-serif, system-ui, sans-serif' },
    { label: 'Serif', value: 'Georgia, Cambria, "Times New Roman", Times, serif' },
    { label: 'Mono', value: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Times', value: '"Times New Roman", Times, serif' },
    { label: 'Courier', value: '"Courier New", Courier, monospace' },
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
    { label: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
    { label: 'Comic Sans', value: '"Comic Sans MS", cursive' },
]

export const FONT_SIZES = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px', '64px', '72px']

export const TEXT_COLORS = [
    '#0f172a', '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280',
]

export const HIGHLIGHT_COLORS = [
    '#fef08a', '#fecaca', '#bbf7d0', '#bae6fd', '#ddd6fe',
    '#fbcfe8', '#fed7aa', '#e5e7eb', '#fde68a', '#a7f3d0',
]

/** Extensions for full-blown TextBlock (Word-like). */
export function richTextExtensions(placeholder = 'Write something…') {
    return [
        StarterKit.configure({ horizontalRule: false }),
        Placeholder.configure({ placeholder }),
        TaskList,
        TaskItem.configure({ nested: true }),
        TextStyle,
        FontFamily.configure({ types: ['textStyle'] }),
        FontSize,
        Color.configure({ types: ['textStyle'] }),
        Highlight.configure({ multicolor: true }),
        Underline,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
        Table.configure({ resizable: true }),
        TableRow, TableCell, TableHeader,
        Superscript, Subscript,
        HorizontalRule,
        Image,
        Typography,
    ]
}

/** Lighter stack for Idea stickies — no tables, no images, no headings-heavy chrome. */
export function ideaTextExtensions(placeholder = 'Idea…') {
    return [
        StarterKit.configure({ horizontalRule: false, heading: false, codeBlock: false, blockquote: false }),
        Placeholder.configure({ placeholder }),
        TextStyle,
        FontFamily.configure({ types: ['textStyle'] }),
        FontSize,
        Color.configure({ types: ['textStyle'] }),
        Highlight.configure({ multicolor: true }),
        Underline,
        TextAlign.configure({ types: ['paragraph'] }),
        Link.configure({ openOnClick: false, autolink: true }),
    ]
}
