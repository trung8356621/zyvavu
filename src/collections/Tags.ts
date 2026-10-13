import type { CollectionConfig } from 'payload'

import { siteStaffAccess } from '@/access/roles'
import { slugField } from '@/fields/slug'

export const Tags: CollectionConfig = {
  slug: 'tags',
  admin: { group: 'Content', useAsTitle: 'title' },
  access: {
    create: siteStaffAccess,
    read: () => true,
    update: siteStaffAccess,
    delete: siteStaffAccess,
  },
  fields: [{ name: 'title', type: 'text', required: true }, slugField],
}
