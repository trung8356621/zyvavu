import type { CollectionConfig } from 'payload'

import { siteStaffAccess } from '@/access/roles'
import { slugField } from '@/fields/slug'
import { attachCanonicalPathHook, removeResourceRoutes, syncResourceRoute } from '@/lib/url/registry'

export const Tags: CollectionConfig = {
  slug: 'tags',
  admin: {
    group: 'Content',
    useAsTitle: 'title',
    components: {
      views: {
        list: {
          Component: '@/components/admin/tags/TagsListView#TagsListView',
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
    afterRead: [attachCanonicalPathHook('tag')],
    afterChange: [
      async ({ doc, req, previousDoc }) => {
        await syncResourceRoute(req, 'tag', doc, previousDoc)
        return doc
      },
    ],
    beforeDelete: [
      async ({ id, req }) => {
        if (typeof id === 'number') await removeResourceRoutes(req, 'tag', id)
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
  ],
}
