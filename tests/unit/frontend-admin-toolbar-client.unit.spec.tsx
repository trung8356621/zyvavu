import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FrontendAdminToolbar } from '@/components/frontend/admin-toolbar/FrontendAdminToolbar'
import Toolbar from '@/components/frontend/admin-toolbar/Toolbar'
import type { ToolbarData } from '@/lib/frontend-toolbar/model'

const navigation = vi.hoisted(() => ({ path: '/article', search: '' }))
vi.mock('next/navigation', () => ({
  usePathname: () => navigation.path,
  useSearchParams: () => new URLSearchParams(navigation.search),
}))
vi.mock('next/dynamic', () => ({ default: () => ({ data }: { data: ToolbarData }) => (
  <nav aria-label="Authorized toolbar">{data.edit && <a href={data.edit.href}>Edit Content</a>}</nav>
) }))
const data: ToolbarData = {
  path: '/article', displayName: 'Site admin', dashboard: '/admin', profile: '/admin/account',
  logout: '/api/users/logout', edit: { label: 'Edit Content', href: '/admin/collections/posts/42' },
  design: { label: 'Edit Design', href: '/admin/theme-builder?template=single' },
  create: [{ label: 'Post', href: '/admin/collections/posts/create' }],
}
beforeEach(() => {
  navigation.path = '/article'
  navigation.search = ''
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })))
  // JSDOM has no layout. Floating UI otherwise marks the zero-size menu reference
  // detached and hides the dropdown after its asynchronous positioning pass.
  vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(1024)
  vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(768)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 8, y: 0, top: 0, left: 8, right: 168, bottom: 36, width: 160, height: 36,
    toJSON: () => ({}),
  })
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('client island', () => {
  it('serializes no private toolbar HTML and remains absent for anonymous visitors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ toolbar: null }) })))
    expect(renderToString(<FrontendAdminToolbar />)).toBe('')
    render(<FrontendAdminToolbar />)
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(screen.queryByRole('navigation')).toBeNull()
  })
  it('renders only after endpoint authorization and removes stale actions on navigation', async () => {
    const fetch = vi.fn(async () => ({ ok: true, json: async () => ({ toolbar: data }) }))
    vi.stubGlobal('fetch', fetch)
    const view = render(<FrontendAdminToolbar />)
    expect((await screen.findByRole('link', { name: 'Edit Content' })).getAttribute('href')).toBe('/admin/collections/posts/42')
    expect(fetch).toHaveBeenCalledWith('/api/frontend-admin-toolbar?path=%2Farticle', expect.objectContaining({ cache: 'no-store', credentials: 'same-origin' }))
    navigation.path = '/different-page'
    view.rerender(<FrontendAdminToolbar />)
    expect(screen.queryByRole('link', { name: 'Edit Content' })).toBeNull()
  })
  it('fails closed on network errors and suppresses previews without an auth request', async () => {
    const fetch = vi.fn().mockRejectedValue(new Error('offline'))
    vi.stubGlobal('fetch', fetch)
    const view = render(<FrontendAdminToolbar />)
    await act(async () => {})
    expect(screen.queryByRole('navigation')).toBeNull()
    view.unmount()
    fetch.mockClear()
    navigation.search = 'preview_theme=corporate'
    render(<FrontendAdminToolbar />)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('refreshes session permissions on focus and removes a revoked toolbar', async () => {
    const fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ toolbar: data }) })
      .mockResolvedValue({ ok: true, json: async () => ({ toolbar: null }) })
    vi.stubGlobal('fetch', fetch)
    render(<FrontendAdminToolbar />)
    await screen.findByRole('navigation')
    fireEvent.focus(window)
    await waitFor(() => expect(screen.queryByRole('navigation')).toBeNull())
  })
})

describe('Mantine toolbar controls', () => {
  it('provides native edit links and a keyboard-operated account menu', async () => {
    render(<Toolbar data={data} onLogout={vi.fn()} />)
    expect(screen.getByRole('link', { name: 'Edit Content' }).getAttribute('href')).toBe(data.edit?.href)
    const account = screen.getByRole('button', { name: 'Account: Site admin' })
    account.focus()
    // Native Enter/Space activates a button by click; fireEvent.keyDown alone does not simulate that.
    fireEvent.click(account)
    const profile = await screen.findByRole('menuitem', { name: 'Profile' })
    expect(profile.getAttribute('href')).toBe('/admin/account')
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' })
    expect(document.activeElement).toBe(profile)
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
    await waitFor(() => expect(account.getAttribute('aria-expanded')).toBe('false'))
  })
  it('keeps logout errors visible instead of reporting a cosmetic logout', async () => {
    const onLogout = vi.fn()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })))
    render(<Toolbar data={data} onLogout={onLogout} />)
    fireEvent.click(screen.getByRole('button', { name: 'Account: Site admin' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Log out' }))
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/users/logout', expect.objectContaining({ method: 'POST' })))
    expect((await screen.findByRole('alert')).textContent).toContain('Could not log out')
    expect(onLogout).not.toHaveBeenCalled()
  })
})
