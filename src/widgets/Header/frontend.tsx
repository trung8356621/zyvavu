import React from 'react'
import type { ThemeDataContext } from '@/lib/theme-engine/types'

export type HeaderProps = {
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

  return (
    <header
      className={`zyvavu-widget-header ${sticky ? 'zyvavu-widget-header--sticky' : ''}`}
      style={{
        width: '100%',
        backgroundColor: 'var(--zyvavu-theme-background, #ffffff)',
        borderBottom: '1px solid var(--zyvavu-theme-border, #dfe5e2)',
        position: sticky ? 'sticky' : 'relative',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* 1. TOP BAR */}
      {hasTopBar && (
        <div
          className="zyvavu-header-tier zyvavu-header-tier--top"
          style={{
            backgroundColor: 'var(--zyvavu-theme-surface, #f8faf9)',
            borderBottom: '1px solid var(--zyvavu-theme-border, #dfe5e2)',
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
        className="zyvavu-header-tier zyvavu-header-tier--main"
        style={{
          padding: '16px 24px',
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
          <div className="zyvavu-header-slot zyvavu-header-slot--main-left" style={{ display: 'flex', alignItems: 'center' }}>
            {mainHeaderLeft}
          </div>
          <div className="zyvavu-header-slot zyvavu-header-slot--main-center" style={{ display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
            {mainHeaderCenter}
          </div>
          <div className="zyvavu-header-slot zyvavu-header-slot--main-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {mainHeaderRight}
          </div>
        </div>
      </div>

      {/* 3. BOTTOM BAR */}
      {hasBottomBar && (
        <div
          className="zyvavu-header-tier zyvavu-header-tier--bottom"
          style={{
            backgroundColor: 'var(--zyvavu-theme-surface, #f8faf9)',
            borderTop: '1px solid var(--zyvavu-theme-border, #dfe5e2)',
            padding: '8px 24px',
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
            <div className="zyvavu-header-slot zyvavu-header-slot--bottom-left">{bottomBarLeft}</div>
            <div className="zyvavu-header-slot zyvavu-header-slot--bottom-center">{bottomBarCenter}</div>
            <div className="zyvavu-header-slot zyvavu-header-slot--bottom-right">{bottomBarRight}</div>
          </div>
        </div>
      )}
    </header>
  )
}
