import { withWidgetStyleSurface } from '@/lib/style-engine/WidgetStyleSurface'
import type { UniversalStyle } from '@/lib/style-engine/types'
import React from 'react'
import Link from 'next/link'
import type { ThemeDataContext } from '@/lib/theme-engine/types'

export type HeaderBrandProps = {
  style?: UniversalStyle

  id?: string
  showTagline?: boolean
  siteName?: string
  logoUrl?: string
  logoAlt?: string
  tagline?: string
  dataContext?: ThemeDataContext
}

export function HeaderBrandFrontend({
  style: surfaceStyle,
  id: surfaceId,
  showTagline = true,
  siteName: customName,
  logoUrl: customLogo,
  logoAlt: customAlt,
  tagline: customTagline,
  dataContext,
}: HeaderBrandProps) {
  const siteName = customName || dataContext?.site?.siteName || 'Zyvavu'
  const logoUrl = customLogo || dataContext?.site?.logoUrl
  const logoAlt = customAlt || dataContext?.site?.logoAlt || siteName
  const tagline = customTagline || dataContext?.site?.tagline

  return withWidgetStyleSurface(
    <div
      className="zyvavu-widget-header-brand"
      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
    >
      <Link
        href="/"
        className="site-brand-link"
        style={{ textDecoration: 'none', color: 'inherit', fontWeight: 700, fontSize: '1.25rem' }}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={logoAlt}
            className="site-logo"
            style={{ maxHeight: '36px', width: 'auto', display: 'block' }}
          />
        ) : (
          siteName
        )}
      </Link>
      {showTagline && tagline ? (
        <span
          className="site-tagline"
          style={{
            fontSize: '12px',
            color: 'var(--zyvavu-theme-text-muted, #5f7370)',
            borderLeft: '1px solid #ddd',
            paddingLeft: '8px',
          }}
        >
          {tagline}
        </span>
      ) : null}
    </div>,
    surfaceStyle,
    surfaceId,
  )
}
