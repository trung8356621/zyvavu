import type { GlobalConfig } from 'payload'

import { systemAdminAccess } from '@/access/roles'

export const SystemSettings: GlobalConfig = {
  slug: 'system-settings',
  label: 'System settings',
  admin: {
    group: 'Settings',
    hidden: ({ user }) => user?.role !== 'system-admin',
  },
  access: {
    read: systemAdminAccess,
    update: systemAdminAccess,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'System',
          admin: {
            description: 'Operator notes for system-admin. Hosting and storage credentials stay outside the CMS.',
          },
          fields: [
            {
              name: 'maintenanceNote',
              type: 'textarea',
              admin: { description: 'Visible only to system-admin. Do not store hosting or storage credentials.' },
            },
          ],
        },
      ],
    },
  ],
}
