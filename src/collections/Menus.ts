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
      name: 'defaultDropdownEffect',
      type: 'select',
      defaultValue: 'fade',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Fade', value: 'fade' },
        { label: 'Slide Down', value: 'slide-down' },
      ],
      admin: {
        description: 'Default dropdown animation transition for this menu.',
      },
    },
    {
      name: 'items',
      type: 'array',
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'parentId', type: 'text', admin: { hidden: true } },
        { name: 'hasSubmenu', type: 'checkbox', defaultValue: false },
        {
          name: 'submenuType',
          type: 'select',
          defaultValue: 'classic',
          options: [
            { label: 'Classic', value: 'classic' },
            { label: 'Mega Menu', value: 'mega' },
          ],
        },
        {
          name: 'dropdownEffect',
          type: 'select',
          defaultValue: 'inherit',
          options: [
            { label: 'Inherit Default', value: 'inherit' },
            { label: 'None', value: 'none' },
            { label: 'Fade', value: 'fade' },
            { label: 'Slide Down', value: 'slide-down' },
          ],
        },
        { name: 'triggerOnly', type: 'checkbox', defaultValue: false },
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
      name: 'megaLayouts',
      type: 'json',
      admin: {
        description: 'Map of item IDs to versioned Puck layout documents for Mega Menus.',
      },
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
        description: 'Legacy menu rendering mode (maintained for backwards compatibility).',
      },
    },
    {
      name: 'megaLayout',
      type: 'json',
      admin: {
        description: 'Legacy whole-menu Puck layout document (maintained for backwards compatibility).',
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
        const hasMegaSubmenu =
          Array.isArray(data?.items) &&
          data.items.some((i: any) => i?.hasSubmenu && i?.submenuType === 'mega')

        if (data?.mode === 'mega' || hasMegaSubmenu) {
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
