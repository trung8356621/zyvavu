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
import {
  ensureContactEntryId,
  normalizeContactIcon,
  SAMPLE_CONTACT_ENTRIES,
  validateContactEntryFields,
  validateContactLink,
} from '@/lib/site/contact'

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
        {
          label: 'Contact Information',
          fields: [
            {
              name: 'contactEntries',
              type: 'array',
              labels: {
                singular: 'Contact Entry',
                plural: 'Contact Entries',
              },
              admin: {
                description:
                  'Ordered site contact entries. Widgets reference stable Entry IDs — renaming the Key does not break widgets. Phone/Email auto-links use Special link, not the Key label.',
                initCollapsed: false,
                components: {
                  RowLabel: '@/components/admin/settings/ContactEntryRowLabel#ContactEntryRowLabel',
                },
              },
              defaultValue: SAMPLE_CONTACT_ENTRIES.map((entry, index) => ({
                ...entry,
                order: index,
              })),
              validate: (value: unknown) => {
                if (value == null) return true
                if (!Array.isArray(value)) return 'Contact entries must be a list.'
                for (const row of value) {
                  if (!row || typeof row !== 'object') return 'Each contact entry must be an object.'
                  const record = row as Record<string, unknown>
                  const result = validateContactEntryFields({
                    key: record.key,
                    value: record.value,
                    link: record.link,
                    semantics: record.semantics,
                  })
                  if (result !== true) return result
                }
                return true
              },
              fields: [
                {
                  name: 'entryId',
                  type: 'text',
                  required: true,
                  label: 'Entry ID',
                  admin: {
                    readOnly: true,
                    description: 'Stable internal ID used by Contact Information widgets.',
                  },
                  hooks: {
                    beforeValidate: [
                      ({ value }) => ensureContactEntryId(value),
                    ],
                  },
                },
                {
                  name: 'key',
                  type: 'text',
                  required: true,
                  label: 'Key (label)',
                  admin: {
                    description: 'Editable display label. Renaming does not change Entry ID or auto-links.',
                  },
                },
                {
                  name: 'value',
                  type: 'textarea',
                  required: true,
                  label: 'Value',
                },
                {
                  name: 'link',
                  type: 'text',
                  label: 'Link (optional)',
                  admin: {
                    description:
                      'Optional URL. When set and Special link is empty, the value renders as a clickable link. Unsafe schemes are rejected.',
                  },
                  validate: (value: unknown) => validateContactLink(value),
                },
                {
                  name: 'semantics',
                  type: 'select',
                  label: 'Special link',
                  options: [
                    { label: 'Phone (tel: from value)', value: 'phone' },
                    { label: 'Email (mailto: from value)', value: 'email' },
                  ],
                  admin: {
                    description:
                      'Optional. Stable auto-link for phone/email — independent of the editable Key. Leave empty for plain text or optional Link. Not a general contact type.',
                    isClearable: true,
                  },
                },
                {
                  name: 'icon',
                  type: 'json',
                  label: 'Icon (optional)',
                  admin: {
                    components: {
                      Field: '@/components/admin/settings/ContactEntryIconField#ContactEntryIconField',
                    },
                  },
                  validate: async (value, { req }) => {
                    if (value == null) return true
                    const icon = normalizeContactIcon(value)
                    if (!icon) return 'Choose a valid icon from the Media Library.'
                    if (icon.source !== 'media') return true
                    try {
                      const media = await req.payload.findByID({
                        collection: 'media',
                        id: icon.mediaId!,
                        depth: 0,
                        req,
                        overrideAccess: false,
                      })
                      if (media.mimeType?.startsWith('image/') && media.url === icon.mediaUrl) return true
                    } catch {
                      // The reference may be missing or inaccessible.
                    }
                    return 'Choose an available image from the Media Library.'
                  },
                  hooks: {
                    beforeChange: [({ value }) => normalizeContactIcon(value)],
                  },
                },
                {
                  name: 'order',
                  type: 'number',
                  label: 'Display order',
                  admin: {
                    description: 'Lower numbers appear first. Drag-reorder the array to change sequence.',
                    step: 1,
                  },
                  defaultValue: 0,
                },
              ],
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
