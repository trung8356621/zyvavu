import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { SetupWizard } from '@/components/setup/SetupWizard'

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn().mockImplementation(query => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })) })
  HTMLElement.prototype.scrollIntoView = vi.fn()
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); document.cookie = 'zyvavu-setup-language=; Max-Age=0; Path=/' })
const mount = (language: 'vi' | 'en' = 'vi', initialDatabase?: { host?: string; port?: string; ssl?: string }) => render(<MantineProvider env="test"><SetupWizard initialLanguage={language} initialDatabase={initialDatabase} /></MantineProvider>)
const fillDatabase = () => {
  for (const [label, value] of [['PostgreSQL host', 'db.example.com'], ['Database name', 'unit'], ['Username', 'unit']]) fireEvent.change(screen.getByLabelText(new RegExp(`^${label}`)), { target: { value } })
}
it('opens directly on PostgreSQL and switches Vietnamese to English', async () => {
  mount()
  expect(screen.getByLabelText(/^Máy chủ PostgreSQL/)).toBeTruthy()
  fireEvent.click(screen.getByRole('combobox', { name: 'Ngôn ngữ giao diện' }))
  fireEvent.click(await screen.findByRole('option', { name: 'English' }))
  expect(screen.getByRole('heading', { name: 'Set up Zyvavu' })).toBeTruthy()
  expect(screen.getByLabelText(/^PostgreSQL host/)).toBeTruthy()
  expect(document.cookie).toContain('zyvavu-setup-language=en')
})
it('prevents duplicate database submissions and disables fields while testing', async () => {
  let finish: (value: unknown) => void = () => {}
  const fetchMock = vi.fn(() => new Promise(resolve => { finish = resolve }))
  vi.stubGlobal('fetch', fetchMock)
  const { container } = mount('en')
  fillDatabase()
  fireEvent.submit(container.querySelector('form')!)
  fireEvent.submit(container.querySelector('form')!)
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect((screen.getByLabelText(/^PostgreSQL host/).closest('fieldset') as HTMLFieldSetElement).disabled).toBe(true)
  expect(screen.getByText('Testing the PostgreSQL connection…')).toBeTruthy()
  await act(async () => { finish({ ok: true, json: async () => ({ verified: true }) }) })
})
it('validates administrator inputs in the selected language without sending their password', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ verified: true }) })
  vi.stubGlobal('fetch', fetchMock)
  const { container } = mount('en')
  fillDatabase()
  await act(async () => { fireEvent.submit(container.querySelector('form')!) })
  fireEvent.submit(container.querySelector('form')!)
  expect(screen.getByText('Enter a valid email and a password containing 12–128 characters.')).toBeTruthy()
  expect(fetchMock).toHaveBeenCalledTimes(1)
})
it('displays localized connection failures while staying on the database step', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'connection' }) }))
  const { container } = mount('en')
  fillDatabase()
  await act(async () => { fireEvent.submit(container.querySelector('form')!) })
  expect(screen.getByText('Cannot connect to PostgreSQL. Check host, port, SSL, firewall, and service availability.')).toBeTruthy()
  expect(screen.getByLabelText(/^PostgreSQL host/)).toBeTruthy()
})
it('uses local PostgreSQL defaults only when initial values are absent', () => {
  mount('en')
  expect((screen.getByLabelText(/^PostgreSQL host/) as HTMLInputElement).value).toBe('127.0.0.1')
  expect((screen.getByLabelText(/^Port/) as HTMLInputElement).value).toBe('5432')
})
it('preserves supplied host and port configuration instead of replacing it with defaults', () => {
  mount('en', { host: 'saved.example.com', port: '6432' })
  expect((screen.getByLabelText(/^PostgreSQL host/) as HTMLInputElement).value).toBe('saved.example.com')
  expect((screen.getByLabelText(/^Port/) as HTMLInputElement).value).toBe('6432')
})
it('keeps edited connection values on Back and retains horizontal progress states', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ verified: true }) }))
  const { container } = mount('en')
  fillDatabase()
  fireEvent.change(screen.getByLabelText(/^Port/), { target: { value: '6432' } })
  const progress = screen.getByRole('group', { name: 'Installation progress' })
  expect(progress.querySelector('[data-orientation="horizontal"]')).toBeTruthy()
  expect(progress.querySelector('[data-wrap]')).toBeNull()
  expect(progress.tabIndex).toBe(0)
  expect(screen.getByRole('button', { name: 'Database' }).getAttribute('aria-current')).toBe('step')
  await act(async () => { fireEvent.submit(container.querySelector('form')!) })
  expect(screen.getByRole('button', { name: 'Database' }).hasAttribute('data-completed')).toBe(true)
  expect(screen.getByRole('button', { name: 'System administrator' }).getAttribute('aria-current')).toBe('step')
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  expect((screen.getByLabelText(/^PostgreSQL host/) as HTMLInputElement).value).toBe('db.example.com')
  expect((screen.getByLabelText(/^Port/) as HTMLInputElement).value).toBe('6432')
  expect((screen.getByRole('combobox', { name: 'SSL connection' }) as HTMLInputElement).value).toBe('SSL — verify certificate and hostname')
})
it('defaults loopback to local SSL and upgrades untouched defaults for remote hosts', () => {
  mount('en')
  const ssl = screen.getByRole('combobox', { name: 'SSL connection' }) as HTMLInputElement
  expect(ssl.value).toBe('Disabled (trusted network)')
  fireEvent.change(screen.getByLabelText(/^PostgreSQL host/), { target: { value: 'db.example.com' } })
  expect(ssl.value).toBe('SSL — verify certificate and hostname')
  fireEvent.change(screen.getByLabelText(/^PostgreSQL host/), { target: { value: 'localhost' } })
  expect(ssl.value).toBe('Disabled (trusted network)')
})
it('never overwrites an explicitly selected SSL mode when editing the host', async () => {
  mount('en')
  const ssl = screen.getByRole('combobox', { name: 'SSL connection' }) as HTMLInputElement
  fireEvent.click(ssl)
  fireEvent.click(await screen.findByRole('option', { name: 'SSL — verify certificate and hostname' }))
  fireEvent.change(screen.getByLabelText(/^PostgreSQL host/), { target: { value: 'localhost' } })
  expect(ssl.value).toBe('SSL — verify certificate and hostname')
})
it('preserves saved SSL verification even for a loopback host', () => {
  mount('en', { host: '127.0.0.1', ssl: 'verify-full' })
  fireEvent.change(screen.getByLabelText(/^PostgreSQL host/), { target: { value: 'localhost' } })
  expect((screen.getByRole('combobox', { name: 'SSL connection' }) as HTMLInputElement).value).toBe('SSL — verify certificate and hostname')
})
