import type { CollectionConfig } from 'payload'

import { siteStaffAccess } from '@/access/roles'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    group: 'Content',
    listSearchableFields: ['filename'],
    components: {
      views: {
        list: {
          Component: '@/components/admin/media/MediaListView#MediaListView',
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
  upload: {
    mimeTypes: ['image/*', 'video/*', 'application/pdf'],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
}
