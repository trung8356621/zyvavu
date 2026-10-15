import type { CollectionConfig } from 'payload'

import { siteStaffAccess } from '@/access/roles'

export const Menus: CollectionConfig = {
  slug: 'menus',
  admin: {
    group: 'Appearance',
    useAsTitle: 'name',
    components: {
      views: {
        list: {
          Component: '@/components/admin/menus/MenusListView#MenusListView',
        },
        edit: {
          root: {
            Component: '@/components/admin/menus/MenuEditView#MenuEditView',
          },
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
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'location',
      type: 'select',
      required: true,
      defaultValue: 'header',
      options: [
        { label: 'Header', value: 'header' },
        { label: 'Footer', value: 'footer' },
      ],
    },
    {
      name: 'items',
      type: 'array',
      fields: [
        { name: 'label', type: 'text', required: true },
        {
          name: 'link',
          type: 'group',
          fields: [
            {
              name: 'type',
              type: 'select',
              required: true,
              defaultValue: 'page',
              options: [
                { label: 'Page', value: 'page' },
                { label: 'Post', value: 'post' },
                { label: 'Custom path', value: 'custom' },
              ],
            },
            {
              name: 'page',
              type: 'relationship',
              relationTo: 'pages',
              admin: { condition: (_, siblingData) => siblingData?.type === 'page' },
            },
            {
              name: 'post',
              type: 'relationship',
              relationTo: 'posts',
              admin: { condition: (_, siblingData) => siblingData?.type === 'post' },
            },
            {
              name: 'url',
              type: 'text',
              admin: { condition: (_, siblingData) => siblingData?.type === 'custom' },
            },
            { name: 'newTab', type: 'checkbox', defaultValue: false },
          ],
        },
      ],
    },
    {
      name: 'mode',
      type: 'select',
      defaultValue: 'classic',
      options: [
        { label: 'Classic', value: 'classic' },
        { label: 'Mega Menu', value: 'mega' },
      ],
      admin: {
        description: 'Menu rendering mode: Classic simple link tree or Desktop Mega Layout.',
      },
    },
    {
      name: 'megaLayout',
      type: 'json',
      admin: {
        description: 'Versioned Puck layout document for Desktop Mega Menu.',
      },
    },
    {
      name: 'mobileMenu',
      type: 'json',
      admin: {
        description: 'Mobile navigation tree data foundation.',
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req }) => {
        if (data?.mode === 'mega') {
          const settings = await req.payload
            .findGlobal({
              slug: 'settings',
              depth: 0,
              overrideAccess: true,
            })
            .catch(() => null)
          if (!settings?.enableMegaMenu) {
            throw new Error('Mega Menu is disabled in Site Settings. Enable it before saving Mega menus.')
          }
        }
        return data
      },
    ],
  },
}
