import { withWidgetStyleSurface } from '@/lib/style-engine/WidgetStyleSurface'
import type { UniversalStyle } from '@/lib/style-engine/types'
import React from 'react'
import Link from 'next/link'
import type { ThemeDataContext } from '@/lib/theme-engine/types'

export type FooterProps = {
  style?: UniversalStyle

  id?: string
  copyright?: string
  showBrand?: boolean
  siteName?: string
  footerContent?: React.ReactNode
  dataContext?: ThemeDataContext
}

export function FooterFrontend({
  style: surfaceStyle,
  id: surfaceId,
  copyright = '© 2026 Zyvavu. All rights reserved.',
  showBrand = true,
  siteName: customName,
  footerContent,
  dataContext,
}: FooterProps) {
  const siteName = customName || dataContext?.site?.siteName || 'Zyvavu'

  return withWidgetStyleSurface(
    <footer
      className="zyvavu-widget-footer"
      style={{
        width: '100%',
        backgroundColor: 'var(--zyvavu-theme-surface, #f8faf9)',
        borderTop: '1px solid var(--zyvavu-theme-border, #dfe5e2)',
        padding: '48px 24px 24px',
        color: 'var(--zyvavu-theme-text, inherit)',
        marginTop: 'auto',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--zyvavu-theme-container, 1200px)',
          margin: '0 auto',
        }}
      >
        {footerContent}

        <div
          className="zyvavu-widget-footer__bottom"
          style={{
            marginTop: '32px',
            paddingTop: '20px',
            borderTop: '1px solid var(--zyvavu-theme-border, #dfe5e2)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            fontSize: '13px',
            color: 'var(--zyvavu-theme-text-muted, #5f7370)',
          }}
        >
          {showBrand && (
            <div style={{ fontWeight: 600 }}>
              <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
                {siteName}
              </Link>
            </div>
          )}
          <div>{copyright}</div>
        </div>
      </div>
    </footer>,
    surfaceStyle,
    surfaceId,
  )
}
