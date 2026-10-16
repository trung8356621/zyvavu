import type { CollectionConfig } from 'payload'

import { systemAdminAccess } from '@/access/roles'

export const UrlRegistry: CollectionConfig = {
  slug: 'url-registry',
  admin: {
    hidden: true,
    useAsTitle: 'path',
    components: {
      views: {
        list: {
          Component: '@/components/admin/url-registry/UrlRegistryListView#UrlRegistryListView',
        },
      },
    },
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
        { label: 'Category', value: 'category' },
        { label: 'Tag', value: 'tag' },
      ],
    },
    { name: 'page', type: 'relationship', relationTo: 'pages' },
    { name: 'post', type: 'relationship', relationTo: 'posts' },
    { name: 'category', type: 'relationship', relationTo: 'categories' },
    { name: 'tag', type: 'relationship', relationTo: 'tags' },
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
