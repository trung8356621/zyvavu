import type { CollectionConfig } from 'payload'

import { publicOrStaffRead, siteStaffAccess } from '@/access/roles'
import { contentBlocks } from '@/blocks/contentBlocks'
import { slugField } from '@/fields/slug'

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'visibility', '_status', 'updatedAt'],
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
  fields: [
    { name: 'title', type: 'text', required: true },
    slugField,
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
