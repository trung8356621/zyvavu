'use client'

import { withWidgetStyleSurface } from '@/lib/style-engine/WidgetStyleSurface'
import type { UniversalStyle } from '@/lib/style-engine/types'

import React, { useState } from 'react'
import Link from 'next/link'
import type { NavLink, ResolvedMenuItem } from '@/lib/url/menu-links'
import type { ThemeDataContext } from '@/lib/theme-engine/types'
import { MegaMenuRenderer } from '@/components/frontend/MegaMenuRenderer'

export type HeaderNavProps = {
  style?: UniversalStyle

  id?: string
  dropdownEffect?: 'none' | 'fade' | 'slide-down'
  items?: NavLink[]
  menuTree?: ResolvedMenuItem[]
  dataContext?: ThemeDataContext
}

export function HeaderNavFrontend({
  style: surfaceStyle,
  id: surfaceId,
  dropdownEffect = 'fade',
  items: customItems,
  menuTree: customTree,
  dataContext,
}: HeaderNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [mobileExpanded, setMobileExpanded] = useState<Record<string, boolean>>({})

  const tree: ResolvedMenuItem[] =
    customTree ||
    dataContext?.site?.menuTree ||
    (customItems || dataContext?.site?.menuItems || []).map((item: any) => ({
      id: item.id || item.href,
      label: item.label,
      href: item.href,
      newTab: Boolean(item.newTab),
      hasSubmenu: Boolean(item.hasSubmenu),
      submenuType: item.submenuType || 'classic',
      dropdownEffect: item.dropdownEffect || dropdownEffect,
      triggerOnly: Boolean(item.triggerOnly),
      children: item.children || [],
      megaLayout: item.megaLayout,
    }))

  if (!tree.length) {
    return withWidgetStyleSurface(
      <nav className="site-nav" style={{ display: 'flex', gap: '20px' }}>
        <Link
          href="/"
          style={{
            color: 'var(--zyvavu-theme-header-text, var(--zyvavu-theme-text, #17201f))',
            textDecoration: 'none',
            fontSize: '15px',
            fontWeight: 500,
          }}
        >
          Trang chủ
        </Link>
      </nav>,
      surfaceStyle,
      surfaceId,
    )
  }

  const toggleMobileSubmenu = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setMobileExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return withWidgetStyleSurface(
    <>
      {/* DESKTOP NAVIGATION */}
      <nav
        className="zyvavu-nav-desktop site-nav"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          position: 'relative',
        }}
      >
        {tree.map((item) => {
          const hasChildren = Array.isArray(item.children) && item.children.length > 0
          const isMega = item.hasSubmenu && item.submenuType === 'mega' && Boolean(item.megaLayout)
          const isClassic = item.hasSubmenu && hasChildren
          const hasDropdown = isMega || isClassic
          const effect = item.dropdownEffect || dropdownEffect
          const isOpen = activeDropdown === item.id

          return (
            <div
              key={item.id}
              className={`zyvavu-nav-item ${hasDropdown ? 'has-dropdown' : ''} ${isOpen ? 'is-open' : ''}`}
              onMouseEnter={() => hasDropdown && setActiveDropdown(item.id)}
              onMouseLeave={() => hasDropdown && setActiveDropdown(null)}
              style={{
                position: isMega ? 'static' : 'relative',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              {item.triggerOnly ? (
                <button
                  type="button"
                  onClick={() => setActiveDropdown(isOpen ? null : item.id)}
                  aria-expanded={isOpen}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '8px 0',
                    cursor: 'pointer',
                    color: 'var(--zyvavu-theme-header-text, var(--zyvavu-theme-text, #17201f))',
                    fontSize: '15px',
                    fontWeight: 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'color 0.2s ease',
                  }}
                >
                  {item.label}
                  {hasDropdown && <span style={{ fontSize: '10px', opacity: 0.7 }}>▾</span>}
                </button>
              ) : (
                <Link
                  href={item.href}
                  target={item.newTab ? '_blank' : undefined}
                  style={{
                    color: 'var(--zyvavu-theme-header-text, var(--zyvavu-theme-text, #17201f))',
                    textDecoration: 'none',
                    fontSize: '15px',
                    fontWeight: 500,
                    padding: '8px 0',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'color 0.2s ease',
                  }}
                >
                  {item.label}
                  {hasDropdown && <span style={{ fontSize: '10px', opacity: 0.7 }}>▾</span>}
                </Link>
              )}

              {/* CLASSIC DROPDOWN */}
              {isClassic && (
                <div
                  className={`zyvavu-nav-dropdown zyvavu-nav-dropdown--effect-${effect}`}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    minWidth: '200px',
                    backgroundColor: 'var(--zyvavu-theme-surface, #ffffff)',
                    border: '1px solid var(--zyvavu-theme-border, #dfe5e2)',
                    borderRadius: '6px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                    padding: '8px 0',
                    zIndex: 200,
                    display: isOpen ? 'block' : 'none',
                  }}
                >
                  {item.children.map((child) => (
                    <Link
                      key={child.id}
                      href={child.href}
                      target={child.newTab ? '_blank' : undefined}
                      style={{
                        display: 'block',
                        padding: '8px 16px',
                        fontSize: '14px',
                        color: 'var(--zyvavu-theme-text, #17201f)',
                        textDecoration: 'none',
                        transition: 'background-color 0.15s ease, color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          'var(--zyvavu-theme-surface, #f5f7f6)'
                        e.currentTarget.style.color = 'var(--zyvavu-theme-primary, #0e6b66)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = 'var(--zyvavu-theme-text, #17201f)'
                      }}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}

              {/* MEGA MENU DROPDOWN PANEL */}
              {isMega && (
                <div
                  className={`zyvavu-nav-mega-dropdown zyvavu-nav-dropdown--effect-${effect}`}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    width: '100%',
                    zIndex: 250,
                    paddingTop: '8px',
                    display: isOpen ? 'block' : 'none',
                  }}
                >
                  <MegaMenuRenderer document={item.megaLayout} />
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* MOBILE HAMBURGER BUTTON */}
      <button
        type="button"
        aria-label="Toggle Navigation Menu"
        className="zyvavu-mobile-nav-toggle"
        onClick={() => setMobileOpen((prev) => !prev)}
        style={{
          display: 'none',
          background: 'none',
          border: 'none',
          padding: '8px',
          cursor: 'pointer',
          color: 'var(--zyvavu-theme-header-text, var(--zyvavu-theme-text, #17201f))',
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          {mobileOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
        </svg>
      </button>

      {/* MOBILE DRAWER OVERLAY */}
      {mobileOpen && (
        <div
          className="zyvavu-mobile-nav-drawer"
          style={{
            position: 'fixed',
            inset: 0,
            top: '60px',
            backgroundColor: 'var(--zyvavu-theme-surface, #ffffff)',
            zIndex: 999,
            padding: '20px',
            overflowY: 'auto',
            borderTop: '1px solid var(--zyvavu-theme-border, #dfe5e2)',
          }}
        >
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {tree.map((item) => {
              const hasChildren = Array.isArray(item.children) && item.children.length > 0
              const isMega =
                item.hasSubmenu && item.submenuType === 'mega' && Boolean(item.megaLayout)
              const isClassic = hasChildren && !isMega
              const hasDropdown = hasChildren || isMega
              const isExpanded = Boolean(mobileExpanded[item.id])

              return (
                <li
                  key={item.id}
                  style={{
                    borderBottom: '1px solid var(--zyvavu-theme-border, #dfe5e2)',
                    padding: '12px 0',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        color: 'var(--zyvavu-theme-text, #17201f)',
                        textDecoration: 'none',
                      }}
                    >
                      {item.label}
                    </Link>
                    {hasDropdown && (
                      <button
                        type="button"
                        onClick={(e) => toggleMobileSubmenu(item.id, e)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '4px 8px',
                          fontSize: '14px',
                          color: 'var(--zyvavu-theme-text-muted, #5f7370)',
                          cursor: 'pointer',
                        }}
                      >
                        {isExpanded ? '▲' : '▼'}
                      </button>
                    )}
                  </div>

                  {/* Submenu Accordion */}
                  {hasDropdown && isExpanded && (
                    <div style={{ paddingLeft: '16px', marginTop: '8px' }}>
                      {isClassic && (
                        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                          {item.children.map((child) => (
                            <li key={child.id} style={{ margin: '8px 0' }}>
                              <Link
                                href={child.href}
                                onClick={() => setMobileOpen(false)}
                                style={{
                                  fontSize: '14px',
                                  color: 'var(--zyvavu-theme-text-muted, #5f7370)',
                                  textDecoration: 'none',
                                }}
                              >
                                {child.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                      {isMega && (
                        <div style={{ marginTop: '8px' }}>
                          <MegaMenuRenderer document={item.megaLayout} />
                        </div>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </>,
    surfaceStyle,
    surfaceId,
  )
}
