import type { CollectionConfig } from 'payload'

import { lexicalEditor } from '@payloadcms/richtext-lexical'

import { publishedRead, siteStaffAccess } from '@/access/roles'
import { publicPathField } from '@/fields/publicPath'
import { slugField } from '@/fields/slug'
import { capturePublishWrite, preservePublishedPartialUpdate } from '@/lib/publish/write-contract'
import { removeResourceRoutes, syncResourceRoute } from '@/lib/url/registry'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    group: 'Content',
    useAsTitle: 'title',
    defaultColumns: ['title', 'categories', '_status', 'updatedAt'],
    components: {
      views: {
        list: {
          Component: '@/components/admin/posts/PostsListView#PostsListView',
        },
      },
    },
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
    beforeOperation: [capturePublishWrite],
    beforeChange: [preservePublishedPartialUpdate],
    afterChange: [
      async ({ doc, req, previousDoc }) => {
        await syncResourceRoute(req, 'post', doc, previousDoc)
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
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        components: {
          Cell: '@/components/admin/collections/CollectionTitleCell#CollectionTitleCell',
        },
      },
    },
    slugField,
    publicPathField,
    { name: 'excerpt', type: 'textarea' },
    {
      name: 'content',
      type: 'richText',
      editor: lexicalEditor(),
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'tags',
      type: 'relationship',
      relationTo: 'tags',
      hasMany: true,
      admin: { position: 'sidebar' },
    },
  ],
}
