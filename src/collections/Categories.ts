import type { CollectionConfig } from 'payload'

import { siteStaffAccess } from '@/access/roles'
import { slugField } from '@/fields/slug'
import { attachCanonicalPathHook, removeResourceRoutes, syncResourceRoute } from '@/lib/url/registry'

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    group: 'Content',
    useAsTitle: 'title',
    components: {
      views: {
        list: {
          Component: '@/components/admin/categories/CategoriesListView#CategoriesListView',
        },
      },
    },
  },
  access: {
    create: siteStaffAccess,
    read: () => true,
    update: siteStaffAccess,
    delete: siteStaffAccess,
  },
  hooks: {
    afterRead: [attachCanonicalPathHook('category')],
    afterChange: [
      async ({ doc, req, previousDoc }) => {
        await syncResourceRoute(req, 'category', doc, previousDoc)
        return doc
      },
    ],
    beforeDelete: [
      async ({ id, req }) => {
        if (typeof id === 'number') await removeResourceRoutes(req, 'category', id)
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
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'categories',
      admin: {
        position: 'sidebar',
        description: 'Optional parent category for hierarchical navigation lists.',
      },
      filterOptions: ({ id }) => (id ? { id: { not_equals: id } } : true),
    },
    {
      name: 'thumbnail',
      type: 'upload',
      relationTo: 'media',
      required: false,
      filterOptions: {
        mimeType: {
          contains: 'image',
        },
      },
      admin: {
        description: 'Optional category thumbnail from the Media Library.',
        components: {
          Field: '@/components/admin/settings/MediaPickerField#MediaPickerField',
        },
      },
    },
  ],
}
