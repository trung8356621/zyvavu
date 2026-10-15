'use client'

import type { CollectionSlug, GlobalSlug } from 'payload'
import type { ReactNode, SVGProps } from 'react'

import { Link, Logout, useAuth, useConfig, useEntityVisibility, useNav } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { isSiteStaff, isSystemAdmin } from '@/access/roles'

import './zyvavu-nav.scss'

type IconProps = SVGProps<SVGSVGElement>
type NavItem = {
  href: string
  icon: (props: IconProps) => ReactNode
  label: string
  visible: boolean
}

const iconProps = {
  'aria-hidden': true,
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  strokeWidth: 1.8,
  viewBox: '0 0 24 24',
}

const PostIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 12h7M9 16h7" /></svg>
)
const PagesIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}><path d="M8 3h9l4 4v14H8z" /><path d="M3 7v14h11M16 3v5h5" /></svg>
)
const MediaIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}><rect height="16" rx="2" width="18" x="3" y="4" /><circle cx="9" cy="10" r="2" /><path d="m4 18 5-5 3 3 2-2 6 5" /></svg>
)
const TagIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}><path d="M3 12V4h8l10 10-7 7z" /><circle cx="8" cy="8" r="1.3" /></svg>
)
const MenuIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
)
const SettingsIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></svg>
)
const SeoIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3M11 8v6M8 11h6" /></svg>
)
const UsersIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}><circle cx="12" cy="8" r="4" /><path d="M4 21c1-5 4-7 8-7s7 2 8 7" /></svg>
)
const SystemIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}><path d="M4 5h16M4 12h16M4 19h16" /><circle cx="9" cy="5" r="2" fill="currentColor" /><circle cx="15" cy="12" r="2" fill="currentColor" /><circle cx="8" cy="19" r="2" fill="currentColor" /></svg>
)
const CloseIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}><path d="m6 6 12 12M18 6 6 18" /></svg>
)
const PaletteIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}><circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /><circle cx="17.5" cy="10.5" r=".5" fill="currentColor" /><circle cx="8.5" cy="7.5" r=".5" fill="currentColor" /><circle cx="6.5" cy="12.5" r=".5" fill="currentColor" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C21.438 6.5 17.5 2 12 2z" /></svg>
)

function NavLink({ href, icon: Icon, label, pathname, onNavigate }: NavItem & { pathname: string; onNavigate: () => void }) {
  const active = pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      aria-current={active ? 'page' : undefined}
      className={`zyvavu-nav__link${active ? ' is-active' : ''}`}
      href={href}
      onClick={onNavigate}
      prefetch={false}
    >
      <Icon className="zyvavu-nav__icon" />
      <span>{label}</span>
    </Link>
  )
}

function NavSection({ children, label }: { children: ReactNode; label: string }) {
  return (
    <section className="zyvavu-nav__section">
      <h2>{label}</h2>
      <div className="zyvavu-nav__links">{children}</div>
    </section>
  )
}

export function ZyvavuNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { config } = useConfig()
  const { isEntityVisible } = useEntityVisibility()
  const { hydrated, navOpen, navRef, setNavOpen, shouldAnimate } = useNav()
  const [isMobile, setIsMobile] = useState(false)
  const adminRoute = config.routes.admin
  const collectionURL = (slug: string) => `${adminRoute}/collections/${slug}`
  const globalURL = (slug: string) => `${adminRoute}/globals/${slug}`
  const closeMobileNav = () => {
    if (window.innerWidth <= 1024) setNavOpen(false)
  }
  const collectionVisible = (slug: CollectionSlug) => isEntityVisible({ collectionSlug: slug })
  const globalVisible = (slug: GlobalSlug) => isEntityVisible({ globalSlug: slug })
  const contentItems: NavItem[] = [
    { href: collectionURL('posts'), icon: PostIcon, label: 'Posts', visible: collectionVisible('posts') },
    { href: collectionURL('pages'), icon: PagesIcon, label: 'Pages', visible: collectionVisible('pages') },
    { href: collectionURL('media'), icon: MediaIcon, label: 'Media', visible: collectionVisible('media') },
    { href: collectionURL('categories'), icon: TagIcon, label: 'Categories', visible: collectionVisible('categories') },
    { href: collectionURL('tags'), icon: TagIcon, label: 'Tags', visible: collectionVisible('tags') },
  ]
  const appearanceItems: NavItem[] = [
    { href: `${adminRoute}/themes`, icon: PaletteIcon, label: 'Themes', visible: isSiteStaff(user) },
    { href: collectionURL('menus'), icon: MenuIcon, label: 'Menus', visible: collectionVisible('menus') },
    { href: `${adminRoute}/theme-builder`, icon: PagesIcon, label: 'Theme Builder', visible: isSiteStaff(user) },
    { href: `${adminRoute}/theme-customizer`, icon: PaletteIcon, label: 'Theme Customizer', visible: isSiteStaff(user) },
  ]
  const settingsItems: NavItem[] = [
    { href: globalURL('settings'), icon: SettingsIcon, label: 'Site settings', visible: globalVisible('settings') },
    { href: `${adminRoute}/seo-settings`, icon: SeoIcon, label: 'SEO settings', visible: isSiteStaff(user) },
  ]
  const systemItems: NavItem[] = [
    { href: collectionURL('users'), icon: UsersIcon, label: 'Users', visible: collectionVisible('users') },
    { href: globalURL('system-settings'), icon: SettingsIcon, label: 'System settings', visible: globalVisible('system-settings') },
    { href: `${adminRoute}/system`, icon: SystemIcon, label: 'System', visible: isSystemAdmin(user) },
  ]
  const email = typeof user?.email === 'string' ? user.email : 'Account'
  const initials = email.slice(0, 2).toUpperCase()
  const role = isSystemAdmin(user) ? 'System admin' : 'Site admin'

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1024px)')
    const syncViewport = () => setIsMobile(media.matches)
    syncViewport()
    media.addEventListener('change', syncViewport)
    return () => media.removeEventListener('change', syncViewport)
  }, [])

  if (
    pathname?.includes('/menu-builder') ||
    pathname?.includes('/theme-builder') ||
    pathname?.includes('/theme-customizer')
  ) {
    return null
  }

  const classes = [
    'nav',
    'zyvavu-nav',
    navOpen && 'nav--nav-open',
    shouldAnimate && 'nav--nav-animate',
    hydrated && 'nav--nav-hydrated',
  ].filter(Boolean).join(' ')

  const renderItems = (items: NavItem[]) => items
    .filter((item) => item.visible)
    .map((item) => <NavLink {...item} key={item.href} onNavigate={closeMobileNav} pathname={pathname} />)

  return (
    <aside className={classes} inert={isMobile && !navOpen ? true : undefined} ref={navRef}>
      <div className="zyvavu-nav__mobile-head">
        <span>Navigation</span>
        <button aria-label="Close navigation" onClick={() => setNavOpen(false)} type="button">
          <CloseIcon />
        </button>
      </div>

      <Link className="zyvavu-nav__brand" href={adminRoute} onClick={closeMobileNav} prefetch={false}>
        <span aria-hidden="true" className="zyvavu-nav__mark">Z</span>
        <span className="zyvavu-nav__brand-name">Zyvavu</span>
      </Link>

      <nav aria-label="Admin navigation" className="zyvavu-nav__body">
        <NavSection label="Content">{renderItems(contentItems)}</NavSection>
        <NavSection label="Appearance">{renderItems(appearanceItems)}</NavSection>
        <NavSection label="Settings">{renderItems(settingsItems)}</NavSection>
        <NavSection label="System">{renderItems(systemItems)}</NavSection>
      </nav>

      <div className="zyvavu-nav__account">
        <Link className="zyvavu-nav__account-link" href={`${adminRoute}/account`} onClick={closeMobileNav} prefetch={false}>
          <span aria-hidden="true" className="zyvavu-nav__avatar">{initials}</span>
          <span className="zyvavu-nav__account-copy">
            <strong>{email}</strong>
            <small>{role}</small>
          </span>
        </Link>
        <Logout />
      </div>
    </aside>
  )
}
