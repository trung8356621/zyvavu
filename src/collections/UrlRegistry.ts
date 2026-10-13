import type { CollectionConfig } from 'payload'

import { systemAdminAccess } from '@/access/roles'

export const UrlRegistry: CollectionConfig = {
  slug: 'url-registry',
  admin: {
    hidden: true,
    useAsTitle: 'path',
  },
  access: {
    create: () => false,
    delete: () => false,
    read: systemAdminAccess,
    update: () => false,
  },
  fields: [
    { name: 'path', type: 'text', required: true, unique: true, index: true },
    {
      name: 'recordRole',
      type: 'select',
      required: true,
      options: [
        { label: 'Canonical', value: 'canonical' },
        { label: 'Redirect', value: 'redirect' },
      ],
    },
    {
      name: 'resourceType',
      type: 'select',
      required: true,
      options: [
        { label: 'Page', value: 'page' },
        { label: 'Post', value: 'post' },
      ],
    },
    { name: 'page', type: 'relationship', relationTo: 'pages' },
    { name: 'post', type: 'relationship', relationTo: 'posts' },
    { name: 'targetPath', type: 'text' },
    {
      name: 'locale',
      type: 'text',
      admin: { description: 'Reserved. Locale uniqueness is not decided.' },
    },
    {
      name: 'siteKey',
      type: 'text',
      admin: { description: 'Reserved. Multi-tenant routing is not decided.' },
    },
  ],
}
