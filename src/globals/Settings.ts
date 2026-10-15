import type { GlobalConfig } from 'payload'

import { siteStaffAccess } from '@/access/roles'
import {
  DATE_FORMAT_OPTIONS,
  DEFAULT_DATE_FORMAT,
  DEFAULT_TIME_FORMAT,
  DEFAULT_TIMEZONE,
  DEFAULT_WEEK_STARTS_ON,
  TIME_FORMAT_OPTIONS,
  TIMEZONE_OPTIONS,
  WEEK_STARTS_ON_OPTIONS,
} from '@/lib/dateTime'
import { canonicalPublicOrigin, normalizeSiteUrl } from '@/lib/site/origin'
import { isLanguageCode } from '@/lib/site/setup'
import {
  DEFAULT_CATEGORY_PERMALINK_STRUCTURE,
  DEFAULT_PAGE_PERMALINK_STRUCTURE,
  DEFAULT_POST_PERMALINK_STRUCTURE,
  DEFAULT_TAG_PERMALINK_STRUCTURE,
  validatePermalinkPattern,
} from '@/lib/permalinks'
import { isValidThemeId } from '@/lib/theme-engine/themes'

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
      admin: {
        className: 'zyvavu-settings-tabs',
      },
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
              name: 'logo',
              type: 'upload',
              relationTo: 'media',
              label: 'Site Logo',
              filterOptions: {
                mimeType: {
                  contains: 'image',
                },
              },
              admin: {
                description: 'Primary site brand logo. Select from Media Library or upload a new asset.',
                components: {
                  Field: '@/components/admin/settings/MediaPickerField#MediaPickerField',
                },
              },
            },
            {
              name: 'favicon',
              type: 'upload',
              relationTo: 'media',
              label: 'Site Favicon',
              filterOptions: {
                mimeType: {
                  in: [
                    'image/png',
                    'image/svg+xml',
                    'image/x-icon',
                    'image/vnd.microsoft.icon',
                    'image/webp',
                    'image/jpeg',
                  ],
                },
              },
              admin: {
                description: 'Browser icon (PNG, SVG, or ICO asset). Used in public HTML head and metadata.',
                components: {
                  Field: '@/components/admin/settings/MediaPickerField#MediaPickerField',
                },
              },
            },
          ],
        },
        {
          label: 'Date & Time',
          fields: [
            {
              name: 'timezone',
              type: 'select',
              required: true,
              defaultValue: DEFAULT_TIMEZONE,
              label: 'Timezone',
              options: TIMEZONE_OPTIONS,
              admin: {
                description: 'Select your local timezone (IANA identifier).',
              },
            },
            {
              name: 'dateFormat',
              type: 'select',
              required: true,
              defaultValue: DEFAULT_DATE_FORMAT,
              label: 'Date Format',
              options: DATE_FORMAT_OPTIONS,
              admin: {
                description: 'Format used for date display.',
              },
            },
            {
              name: 'timeFormat',
              type: 'select',
              required: true,
              defaultValue: DEFAULT_TIME_FORMAT,
              label: 'Time Format',
              options: TIME_FORMAT_OPTIONS,
              admin: {
                description: 'Format used for time display.',
              },
            },
            {
              name: 'weekStartsOn',
              type: 'select',
              required: true,
              defaultValue: DEFAULT_WEEK_STARTS_ON,
              label: 'Week Starts On',
              options: WEEK_STARTS_ON_OPTIONS,
              admin: {
                description: 'First day of the week for calendars and scheduling.',
              },
            },
            {
              name: 'dateTimePreview',
              type: 'ui',
              admin: {
                components: {
                  Field: '@/components/admin/settings/DateTimePreview#DateTimePreview',
                },
              },
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
              admin: { description: 'Saved for posts listing pagination. It does not change the site yet.' },
              validate: wholeNumber(1, 100),
            },
          ],
        },
        {
          label: 'Permalinks',
          fields: [
            {
              name: 'postPermalinkStructure',
              type: 'text',
              required: true,
              defaultValue: DEFAULT_POST_PERMALINK_STRUCTURE,
              label: 'Post URL Structure',
              validate: (value: unknown) => {
                const err = validatePermalinkPattern(value, 'posts')
                return err ? err : true
              },
              admin: {
                description: 'Default structure preset for post public URLs. Changing presets does not rewrite existing URL Registry records.',
                components: {
                  Field: '@/components/admin/settings/PermalinksField#PermalinksField',
                },
              },
            },
            {
              name: 'pagePermalinkStructure',
              type: 'text',
              required: true,
              defaultValue: DEFAULT_PAGE_PERMALINK_STRUCTURE,
              label: 'Page URL Structure',
              validate: (value: unknown) => {
                const err = validatePermalinkPattern(value, 'pages')
                return err ? err : true
              },
              admin: {
                hidden: true,
              },
            },
            {
              name: 'categoryPermalinkStructure',
              type: 'text',
              required: true,
              defaultValue: DEFAULT_CATEGORY_PERMALINK_STRUCTURE,
              label: 'Category URL Structure',
              validate: (value: unknown) => {
                const err = validatePermalinkPattern(value, 'categories')
                return err ? err : true
              },
              admin: {
                hidden: true,
              },
            },
            {
              name: 'tagPermalinkStructure',
              type: 'text',
              required: true,
              defaultValue: DEFAULT_TAG_PERMALINK_STRUCTURE,
              label: 'Tag URL Structure',
              validate: (value: unknown) => {
                const err = validatePermalinkPattern(value, 'tags')
                return err ? err : true
              },
              admin: {
                hidden: true,
              },
            },
          ],
        },
        {
          label: 'Languages',
          fields: [
            {
              name: 'language',
              type: 'text',
              required: true,
              defaultValue: 'vi',
              label: 'Default Language',
              admin: { description: 'BCP 47 language code used by the default public site (e.g. vi).' },
              validate: (value: unknown) => (isLanguageCode(value) ? true : 'Enter a language code such as vi.'),
            },
            {
              name: 'secondaryLanguage',
              type: 'select',
              defaultValue: 'en',
              label: 'Additional Language',
              options: [
                { label: 'None', value: 'none' },
                { label: 'English (en) — Secondary locale foundation', value: 'en' },
              ],
              admin: {
                description: 'Initial secondary locale foundation per DEC-LANG-001.',
              },
            },
            {
              name: 'languagesInfo',
              type: 'ui',
              admin: {
                components: {
                  Field: '@/components/admin/settings/LanguagesInfo#LanguagesInfo',
                },
              },
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
        {
          label: 'Mega Menu',
          fields: [
            {
              name: 'enableMegaMenu',
              type: 'checkbox',
              defaultValue: false,
              label: 'Enable Mega Menu',
              admin: {
                description: 'Enables the desktop Mega Menu visual builder and structured mobile menu navigation.',
              },
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
    {
      name: 'activeThemeId',
      type: 'text',
      defaultValue: 'corporate',
      admin: {
        hidden: true,
        description: 'Authoritative site-wide active theme ID.',
      },
      validate: (value: unknown) => {
        if (!value) return true
        if (typeof value !== 'string' || !isValidThemeId(value)) {
          return `Invalid theme ID "${value}". Must be one of installed themes.`
        }
        return true
      },
    },
    {
      name: 'themeTemplates',
      type: 'json',
      admin: {
        hidden: true,
        description: 'Site-wide theme template overrides scoped by theme ID and context.',
      },
    },
    {
      name: 'themeStyles',
      type: 'json',
      admin: {
        hidden: true,
        description: 'Site-wide draft and published theme styles scoped by theme ID.',
      },
    },
    {
      name: 'themeCustomPresets',
      type: 'json',
      admin: {
        hidden: true,
        description: 'Site-wide custom color and typography presets.',
      },
    },
  ],
}
