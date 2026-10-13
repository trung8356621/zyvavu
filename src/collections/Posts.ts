import type { CollectionConfig } from 'payload'

import { lexicalEditor } from '@payloadcms/richtext-lexical'

import { publishedRead, siteStaffAccess } from '@/access/roles'
import { slugField } from '@/fields/slug'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', '_status', 'updatedAt'],
  },
  versions: {
    drafts: true,
  },
  access: {
    create: siteStaffAccess,
    read: publishedRead,
    update: siteStaffAccess,
    delete: siteStaffAccess,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    slugField,
    { name: 'excerpt', type: 'textarea' },
    {
      name: 'content',
      type: 'richText',
      editor: lexicalEditor(),
    },
    { name: 'categories', type: 'relationship', relationTo: 'categories', hasMany: true },
    { name: 'tags', type: 'relationship', relationTo: 'tags', hasMany: true },
  ],
}
