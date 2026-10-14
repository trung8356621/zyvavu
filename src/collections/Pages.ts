import type { CollectionConfig } from 'payload'

import { publicOrStaffRead, siteStaffAccess } from '@/access/roles'
import { contentBlocks } from '@/blocks/contentBlocks'
import { publicPathField } from '@/fields/publicPath'
import { slugField } from '@/fields/slug'
import { capturePublishWrite, preservePublishedPartialUpdate } from '@/lib/publish/write-contract'
import { removeResourceRoutes, syncResourceRoute } from '@/lib/url/registry'

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    group: 'Content',
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'visibility', '_status', 'updatedAt'],
    components: {
      views: {
        list: {
          Component: '@/components/admin/pages/PagesListView#PagesListView',
        },
      },
    },
  },
  versions: {
    drafts: true,
  },
  access: {
    create: siteStaffAccess,
    read: publicOrStaffRead,
    update: siteStaffAccess,
    delete: siteStaffAccess,
  },
  hooks: {
    beforeOperation: [capturePublishWrite],
    beforeChange: [preservePublishedPartialUpdate],
    afterChange: [
      async ({ doc, req }) => {
        await syncResourceRoute(req, 'page', doc)
        return doc
      },
    ],
    beforeDelete: [
      async ({ id, req }) => {
        if (typeof id === 'number') await removeResourceRoutes(req, 'page', id)
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    slugField,
    publicPathField,
    { name: 'excerpt', type: 'textarea' },
    {
      name: 'visibility',
      type: 'select',
      required: true,
      defaultValue: 'public',
      options: [
        { label: 'Public', value: 'public' },
        { label: 'Private', value: 'private' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'presentation',
      type: 'select',
      required: true,
      defaultValue: 'shared',
      options: [
        { label: 'Shared', value: 'shared' },
        { label: 'Traditional', value: 'traditional' },
        { label: 'Modern', value: 'modern' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Presentation hint only. Page content stays shared between themes.',
      },
    },
    {
      name: 'layout',
      type: 'blocks',
      blocks: contentBlocks,
    },
  ],
}
