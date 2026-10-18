import { withWidgetStyleSurface } from '@/lib/style-engine/WidgetStyleSurface'
import type { UniversalStyle } from '@/lib/style-engine/types'
import React from 'react'
import type { ThemeDataContext } from '@/lib/theme-engine/types'

export type HeaderProps = {
  style?: UniversalStyle

  id?: string
  showTopBar?: boolean
  showBottomBar?: boolean
  sticky?: boolean
  topBarLeft?: React.ReactNode
  topBarCenter?: React.ReactNode
  topBarRight?: React.ReactNode
  mainHeaderLeft?: React.ReactNode
  mainHeaderCenter?: React.ReactNode
  mainHeaderRight?: React.ReactNode
  bottomBarLeft?: React.ReactNode
  bottomBarCenter?: React.ReactNode
  bottomBarRight?: React.ReactNode
  dataContext?: ThemeDataContext
}

export function HeaderFrontend({
  style: surfaceStyle,
  id: surfaceId,
  showTopBar = true,
  showBottomBar = false,
  sticky = true,
  topBarLeft,
  topBarCenter,
  topBarRight,
  mainHeaderLeft,
  mainHeaderCenter,
  mainHeaderRight,
  bottomBarLeft,
  bottomBarCenter,
  bottomBarRight,
}: HeaderProps) {
  const hasTopBar = showTopBar && (topBarLeft || topBarCenter || topBarRight)
  const hasBottomBar = showBottomBar && (bottomBarLeft || bottomBarCenter || bottomBarRight)

  return withWidgetStyleSurface(
    <header
      className={`zyvavu-widget-header root ${sticky ? 'zyvavu-widget-header--sticky' : ''}`}
      style={{
        width: '100%',
        backgroundColor:
          'var(--zyvavu-theme-header-background, var(--zyvavu-theme-background, #ffffff))',
        borderBottom:
          '1px solid var(--zyvavu-theme-header-border, var(--zyvavu-theme-border, #dfe5e2))',
        color: 'var(--zyvavu-theme-header-text, var(--zyvavu-theme-text, #17201f))',
        position: sticky ? 'sticky' : 'relative',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* 1. TOP BAR */}
      {hasTopBar && (
        <div
          className="zyvavu-header-tier zyvavu-header-tier--top topBar zyvavu-widget-header__topBar"
          style={{
            backgroundColor: 'var(--zyvavu-theme-surface, #f8faf9)',
            borderBottom: '1px solid var(--zyvavu-theme-border, #dfe5e2)',
            color: 'var(--zyvavu-theme-text-muted, #5f7370)',
            padding: '6px 24px',
            fontSize: '13px',
          }}
        >
          <div
            style={{
              maxWidth: 'var(--zyvavu-theme-container, 1200px)',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div className="zyvavu-header-slot zyvavu-header-slot--top-left">{topBarLeft}</div>
            <div className="zyvavu-header-slot zyvavu-header-slot--top-center">{topBarCenter}</div>
            <div className="zyvavu-header-slot zyvavu-header-slot--top-right">{topBarRight}</div>
          </div>
        </div>
      )}

      {/* 2. MAIN HEADER */}
      <div
        className="zyvavu-header-tier zyvavu-header-tier--main mainHeader zyvavu-widget-header__mainHeader"
        style={{
          padding: '16px 24px',
          backgroundColor: 'inherit',
          color: 'inherit',
        }}
      >
        <div
          style={{
            maxWidth: 'var(--zyvavu-theme-container, 1200px)',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '24px',
          }}
        >
          <div
            className="zyvavu-header-slot zyvavu-header-slot--main-left"
            style={{ display: 'flex', alignItems: 'center' }}
          >
            {mainHeaderLeft}
          </div>
          <div
            className="zyvavu-header-slot zyvavu-header-slot--main-center"
            style={{ display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'center' }}
          >
            {mainHeaderCenter}
          </div>
          <div
            className="zyvavu-header-slot zyvavu-header-slot--main-right"
            style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
          >
            {mainHeaderRight}
          </div>
        </div>
      </div>

      {/* 3. BOTTOM BAR */}
      {hasBottomBar && (
        <div
          className="zyvavu-header-tier zyvavu-header-tier--bottom bottomBar zyvavu-widget-header__bottomBar"
          style={{
            backgroundColor: 'var(--zyvavu-theme-surface, #f8faf9)',
            borderTop: '1px solid var(--zyvavu-theme-border, #dfe5e2)',
            padding: '8px 24px',
            color: 'var(--zyvavu-theme-text, #17201f)',
          }}
        >
          <div
            style={{
              maxWidth: 'var(--zyvavu-theme-container, 1200px)',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div className="zyvavu-header-slot zyvavu-header-slot--bottom-left">
              {bottomBarLeft}
            </div>
            <div className="zyvavu-header-slot zyvavu-header-slot--bottom-center">
              {bottomBarCenter}
            </div>
            <div className="zyvavu-header-slot zyvavu-header-slot--bottom-right">
              {bottomBarRight}
            </div>
          </div>
        </div>
      )}
    </header>,
    surfaceStyle,
    surfaceId,
  )
}
