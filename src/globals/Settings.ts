import type { GlobalConfig } from 'payload'

import { siteStaffAccess } from '@/access/roles'

export const Settings: GlobalConfig = {
  slug: 'settings',
  label: 'Settings',
  access: {
    read: () => true,
    update: siteStaffAccess,
  },
  fields: [
    { name: 'siteName', type: 'text', required: true, defaultValue: 'zyvavu' },
    { name: 'tagline', type: 'text', defaultValue: '' },
    {
      name: 'siteUrl',
      type: 'text',
      required: true,
      defaultValue: 'http://zyvavu.test',
    },
    { name: 'language', type: 'text', required: true, defaultValue: 'vi' },
    { name: 'postsPerPage', type: 'number', required: true, defaultValue: 10, min: 1, max: 100 },
    {
      name: 'pwaEnabled',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Core offline cache for eligible pages.' },
    },
    {
      name: 'offlinePageLimit',
      type: 'number',
      required: true,
      defaultValue: 20,
      min: 1,
      max: 100,
      admin: { description: 'Maximum number of eligible pages kept in the offline cache.' },
    },
  ],
}
