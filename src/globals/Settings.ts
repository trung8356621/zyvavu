import type { GlobalConfig } from 'payload'

import { siteStaffAccess } from '@/access/roles'
import { canonicalPublicOrigin, normalizeSiteUrl } from '@/lib/site/origin'
import { isLanguageCode } from '@/lib/site/setup'

const wholeNumber = (min: number, max: number) => (value: unknown) => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    return `Enter a whole number from ${min} to ${max}.`
  }
  return true
}

export const Settings: GlobalConfig = {
  slug: 'settings',
  label: 'Site settings',
  admin: {
    group: 'Settings',
  },
  access: {
    read: () => true,
    update: siteStaffAccess,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'General',
          fields: [
            { name: 'siteName', type: 'text', required: true, defaultValue: 'zyvavu' },
            { name: 'tagline', type: 'text', defaultValue: '' },
            {
              name: 'siteUrl',
              type: 'text',
              required: true,
              defaultValue: canonicalPublicOrigin(),
              admin: { description: 'Public origin. The local site stays on https://zyvavu.test.' },
              hooks: {
                beforeValidate: [({ value }) => normalizeSiteUrl(value) ?? value],
              },
              validate: (value: unknown) =>
                normalizeSiteUrl(value) ? true : 'Enter an absolute http or https origin, without a path or query.',
            },
            {
              name: 'language',
              type: 'text',
              required: true,
              defaultValue: 'vi',
              admin: { description: 'BCP 47 language used by the public site, such as vi.' },
              validate: (value: unknown) => (isLanguageCode(value) ? true : 'Enter a language code such as vi.'),
            },
          ],
        },
        {
          label: 'Reading',
          fields: [
            {
              name: 'postsPerPage',
              type: 'number',
              required: true,
              defaultValue: 10,
              min: 1,
              max: 100,
              admin: { description: 'Saved for a future posts listing. It does not change the site yet.' },
              validate: wholeNumber(1, 100),
            },
          ],
        },
        {
          label: 'PWA',
          fields: [
            {
              name: 'pwaEnabled',
              type: 'checkbox',
              defaultValue: true,
              admin: { description: 'Registers the service worker and offline cache for eligible pages.' },
            },
            {
              name: 'offlinePageLimit',
              type: 'number',
              required: true,
              defaultValue: 20,
              min: 1,
              max: 100,
              admin: { description: 'Maximum number of eligible pages kept in the offline cache.' },
              validate: wholeNumber(1, 100),
            },
          ],
        },
      ],
    },
    {
      name: 'setupComplete',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        hidden: true,
        description: 'Reserved for the initial setup wizard. The wizard is not available yet.',
      },
    },
  ],
}
