import type { Field } from 'payload'

import { slugify } from '@/lib/slug'

export const slugField: Field = {
  name: 'slug',
  type: 'text',
  required: true,
  unique: true,
  index: true,
  admin: {
    position: 'sidebar',
  },
  hooks: {
    beforeValidate: [
      ({ value, siblingData }) => {
        const source = typeof value === 'string' && value.trim() ? value : siblingData?.title
        if (typeof source !== 'string') return value
        return slugify(source)
      },
    ],
  },
}
