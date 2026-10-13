import type { CollectionConfig } from 'payload'

import { lexicalEditor } from '@payloadcms/richtext-lexical'

import { publishedRead, siteStaffAccess } from '@/access/roles'
import { publicPathField } from '@/fields/publicPath'
import { slugField } from '@/fields/slug'
import { removeResourceRoutes, syncResourceRoute } from '@/lib/url/registry'

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
  hooks: {
    afterChange: [
      async ({ doc, req }) => {
        await syncResourceRoute(req, 'post', doc)
        return doc
      },
    ],
    beforeDelete: [
      async ({ id, req }) => {
        if (typeof id === 'number') await removeResourceRoutes(req, 'post', id)
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    slugField,
    publicPathField,
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
