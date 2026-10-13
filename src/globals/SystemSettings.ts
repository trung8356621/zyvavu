import type { GlobalConfig } from 'payload'

import { systemAdminAccess } from '@/access/roles'

export const SystemSettings: GlobalConfig = {
  slug: 'system-settings',
  label: 'System settings',
  admin: {
    hidden: ({ user }) => user?.role !== 'system-admin',
  },
  access: {
    read: systemAdminAccess,
    update: systemAdminAccess,
  },
  fields: [
    {
      name: 'maintenanceNote',
      type: 'textarea',
      admin: { description: 'Visible only to system-admin.' },
    },
  ],
}
