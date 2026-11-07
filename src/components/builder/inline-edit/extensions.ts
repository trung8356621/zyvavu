import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import type { Extensions } from '@tiptap/react'

/** Minimal Heading schema: single block, no marks that emit HTML into storage. */
export function headingExtensions(): Extensions {
  return [
    StarterKit.configure({
      heading: false,
      blockquote: false,
      codeBlock: false,
      code: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      horizontalRule: false,
      hardBreak: false,
      strike: false,
      bold: false,
      italic: false,
      dropcursor: false,
      gapcursor: false,
    }),
  ]
}

/** Text: paragraphs + hard breaks + basic marks. */
export function textExtensions(): Extensions {
  return [
    StarterKit.configure({
      heading: false,
      blockquote: false,
      codeBlock: false,
      code: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      horizontalRule: false,
      dropcursor: false,
      gapcursor: false,
    }),
    Underline,
  ]
}
