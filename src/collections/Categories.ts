import type { CollectionConfig } from 'payload'

import { siteStaffAccess } from '@/access/roles'
import { slugField } from '@/fields/slug'

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: { useAsTitle: 'title' },
  access: {
    create: siteStaffAccess,
    read: () => true,
    update: siteStaffAccess,
    delete: siteStaffAccess,
  },
  fields: [{ name: 'title', type: 'text', required: true }, slugField],
}
