import type { ThemeDataContext } from '@/lib/theme-engine/types'
import type { PublicSiteSettings } from './settings'

/** Site slice for ThemeDataContext — includes contact entries for widgets. */
export function toThemeSiteContext(
  settings: PublicSiteSettings,
  extras?: Partial<NonNullable<ThemeDataContext['site']>>,
): NonNullable<ThemeDataContext['site']> {
  return {
    siteName: settings.siteName,
    tagline: settings.tagline,
    logoUrl: settings.logoUrl,
    logoAlt: settings.logoAlt,
    contactEntries: settings.contactEntries,
    ...extras,
  }
}
