import path from 'node:path'
import type { CollectionConfig } from 'payload'
import { isSiteStaff, siteStaffAccess } from '@/access/roles'
import { guardPatternWrite, ownedPatternAccess } from '@/lib/theme-engine/patterns/server'
export const WidgetPatterns: CollectionConfig = {
  slug: 'widget-patterns',
  admin: { group: 'Appearance', useAsTitle: 'name', hidden: true },
  access: {
    create: siteStaffAccess,
    read: ownedPatternAccess,
    update: ownedPatternAccess,
    delete: ownedPatternAccess,
  },
  upload: {
    staticDir: path.resolve(process.cwd(), 'private/pattern-thumbnails'),
    filesRequiredOnCreate: false,
    mimeTypes: ['image/webp'],
    adminThumbnail: 'url',
    modifyResponseHeaders: ({ headers }) => {
      headers.set('cache-control', 'private, no-store')
      headers.set('x-content-type-options', 'nosniff')
      return headers
    },
  },
  hooks: {
    beforeValidate: [guardPatternWrite],
    afterRead: [
      ({ doc }) => {
        if (doc.thumbnailHash !== doc.contentHash || doc.thumbnailStatus !== 'ready') doc.url = null
        return doc
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true, maxLength: 120 },
    { name: 'description', type: 'textarea', maxLength: 1000 },
    { name: 'category', type: 'text', required: true, maxLength: 80 },
    {
      name: 'source',
      type: 'text',
      required: true,
      defaultValue: 'user',
      admin: { readOnly: true },
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      admin: { readOnly: true },
    },
    { name: 'record', type: 'json', required: true },
    { name: 'contentHash', type: 'text', required: true, admin: { readOnly: true } },
    {
      name: 'thumbnailHash',
      type: 'text',
      access: { create: () => false, update: ({ req }) => req.context.patternThumbnail === true },
    },
    {
      name: 'thumbnailStatus',
      type: 'text',
      defaultValue: 'pending',
      access: { create: () => false, update: ({ req }) => req.context.patternThumbnail === true },
    },
  ],
  endpoints: [
    {
      path: '/:id/thumbnail',
      method: 'post',
      handler: async (req) => {
        if (!isSiteStaff(req.user)) return Response.json({ message: 'Forbidden' }, { status: 403 })
        const { generateUserPatternThumbnail } = await import('@/lib/theme-engine/patterns/capture')
        return generateUserPatternThumbnail(req)
      },
    },
  ],
}
