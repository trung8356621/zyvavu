import StarterKit from '@tiptap/starter-kit'
import type { Extensions } from '@tiptap/react'
import { sanitizeHref } from './content-model'

const linkOptions = {
  openOnClick: false,
  autolink: true,
  linkOnPaste: true,
  HTMLAttributes: {},
  validate: (href: string) => Boolean(sanitizeHref(href)),
}

/**
 * Editor schema for the canvas only (not published HTML).
 * H1–H6: single paragraph block (Enter commits in the keymap).
 * P / legacy Text: multi-paragraph.
 * Never wrap this document inside a real <h1>–<h6> in the editor tree.
 */
export function inlineContentExtensions(opts?: { multiline?: boolean }): Extensions {
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
      strike: false,
      dropcursor: false,
      gapcursor: false,
      hardBreak: opts?.multiline !== false,
      underline: true,
      link: linkOptions,
    }),
  ]
}
