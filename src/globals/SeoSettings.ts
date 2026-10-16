import { APIError, type GlobalConfig } from 'payload'

import { isSiteStaff, siteStaffAccess } from '@/access/roles'
import {
  HOME_DESCRIPTION_MAX,
  HOME_TITLE_MAX,
  PUBLISHER_NAME_MAX,
  SAME_AS_MAX,
  normalizePublicSeoSettings,
  validatePublicHttpUrl,
} from '@/lib/seo/settings'

const bounded =
  (max: number) =>
  (value: unknown): true | string => {
    if (value == null || value === '') return true
    if (typeof value !== 'string') return 'Enter text.'
    if (value.trim().length > max) return `Use at most ${max} characters.`
    return true
  }

export const SeoSettings: GlobalConfig = {
  slug: 'seo-settings',
  label: 'SEO settings',
  admin: {
    hidden: true,
  },
  access: {
    read: () => true,
    update: siteStaffAccess,
  },
  hooks: {
    beforeOperation: [
      ({ operation, overrideAccess, req }) => {
        if (operation === 'update' && !overrideAccess && !isSiteStaff(req.user)) {
          throw new APIError('You do not have permission to save SEO settings.', 403)
        }
      },
    ],
    beforeChange: [
      ({ data }) => {
        const next = { ...data }
        if ('homeTitle' in data) next.homeTitle = normalizePublicSeoSettings(data).homeTitle
        if ('homeDescription' in data) next.homeDescription = normalizePublicSeoSettings(data).homeDescription
        if ('publisherType' in data) next.publisherType = normalizePublicSeoSettings(data).publisherType
        if ('publisherName' in data) next.publisherName = normalizePublicSeoSettings(data).publisherName
        if ('sameAs' in data) {
          next.sameAs = normalizePublicSeoSettings(data).sameAs.map((url) => ({ url }))
        }
        return next
      },
    ],
  },
  fields: [
    {
      name: 'homeTitle',
      type: 'text',
      label: 'Homepage SEO title',
      validate: bounded(HOME_TITLE_MAX),
    },
    {
      name: 'homeDescription',
      type: 'textarea',
      label: 'Homepage SEO description',
      validate: bounded(HOME_DESCRIPTION_MAX),
    },
    {
      name: 'publisherType',
      type: 'select',
      required: true,
      defaultValue: 'Organization',
      options: [
        { label: 'Organization', value: 'Organization' },
        { label: 'Person', value: 'Person' },
      ],
    },
    {
      name: 'publisherName',
      type: 'text',
      label: 'Publisher name',
      validate: bounded(PUBLISHER_NAME_MAX),
    },
    {
      name: 'sameAs',
      type: 'array',
      maxRows: SAME_AS_MAX,
      labels: { singular: 'Profile URL', plural: 'Profile URLs' },
      fields: [
        {
          name: 'url',
          type: 'text',
          required: true,
          validate: validatePublicHttpUrl,
        },
      ],
    },
  ],
}
