import type { Field } from '@puckeditor/core'
import { puckTypographyStyleField } from '@/components/builder/fields/PuckTypographyStyleField'

/** Free Heading HTML Tag — H1–H6 + P (unified text widget). */
export const headingTagField: Field = {
  type: 'select',
  label: 'HTML Tag',
  options: [
    { label: 'H1', value: 'h1' },
    { label: 'H2', value: 'h2' },
    { label: 'H3', value: 'h3' },
    { label: 'H4', value: 'h4' },
    { label: 'H5', value: 'h5' },
    { label: 'H6', value: 'h6' },
    { label: 'P', value: 'p' },
  ],
}

/** Bound Document/Category/Post titles — headings only, never P. */
export const boundHeadingTagField: Field = {
  type: 'select',
  label: 'HTML Tag',
  options: [
    { label: 'H1', value: 'h1' },
    { label: 'H2', value: 'h2' },
    { label: 'H3', value: 'h3' },
    { label: 'H4', value: 'h4' },
    { label: 'H5', value: 'h5' },
    { label: 'H6', value: 'h6' },
  ],
}

/** Heading-like Fields for document-bound titles: no Content / no inline edit / no P. */
export const documentBoundHeadingFields = {
  tag: boundHeadingTagField,
  style: puckTypographyStyleField,
} as const
