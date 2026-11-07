import StarterKit from '@tiptap/starter-kit'
import type { Extensions } from '@tiptap/react'
import { sanitizeHref } from './content-model'

/** Shared inline schema for Heading H1–H6/P and legacy Text (StarterKit owns link/underline). */
export function inlineContentExtensions(): Extensions {
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
      underline: true,
      link: {
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
        },
        validate: (href: string) => Boolean(sanitizeHref(href)),
      },
    }),
  ]
}
