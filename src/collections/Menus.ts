import type { CollectionAfterChangeHook, CollectionConfig } from 'payload'

import { siteStaffAccess } from '@/access/roles'
import { syncMenuRegistry } from '@/lib/menu-registry'

const refreshRegistry: CollectionAfterChangeHook = async ({ doc, req }) => {
  await syncMenuRegistry(req.payload, doc, req)
  return doc
}

export const Menus: CollectionConfig = {
  slug: 'menus',
  admin: { useAsTitle: 'name' },
  access: {
    create: siteStaffAccess,
    read: () => true,
    update: siteStaffAccess,
    delete: siteStaffAccess,
  },
  hooks: {
    afterChange: [refreshRegistry],
    beforeDelete: [
      async ({ id, req }) => {
        await req.payload.delete({
          collection: 'url-registry',
          where: { menu: { equals: id } },
          overrideAccess: true,
          req,
        })
      },
    ],
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
  ],
}
