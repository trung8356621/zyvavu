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
    { name: 'path', type: 'text', required: true, index: true },
    {
      name: 'kind',
      type: 'select',
      required: true,
      options: ['page', 'post', 'custom'],
    },
    { name: 'page', type: 'relationship', relationTo: 'pages' },
    { name: 'post', type: 'relationship', relationTo: 'posts' },
    { name: 'menu', type: 'relationship', relationTo: 'menus', required: true },
    { name: 'menuItemId', type: 'text' },
    { name: 'label', type: 'text' },
  ],
}
