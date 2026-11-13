import React from 'react'
import { MantineProvider } from '@mantine/core'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { CreateThemeWizard } from '@/components/admin/themes/CreateThemeWizard'
import type { CustomizeDraftPreview } from '@/lib/theme-engine/wizard-customize-completion'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  sessionStorage.clear()
})

it('renders the selected persisted draft after reopening and after replacing it', async () => {
  const preview: CustomizeDraftPreview = {
    revision: 3,
    updatedAt: null,
    colors: [
      { token: 'primary', value: '#123456' },
      { token: 'accent', value: '#654321' },
      { token: 'background', value: '#ffffff' },
      { token: 'surface', value: '#eeeeee' },
      { token: 'text', value: '#111111' },
      { token: 'border', value: '#cccccc' },
      { token: 'headerText', value: '#999999' },
    ],
    typography: {
      headingFont: 'Georgia, serif',
      bodyFont: 'Arial, sans-serif',
      baseFontSize: '18px',
      samples: [{ token: 'h1', summary: '32px / 700' }],
    },
    spacing: [{ token: 'md', value: '24px' }, { token: 'xs', value: '6px' }, { token: 'xl', value: '60px' }],
    layout: [{ token: 'containerWidth', value: '1120px' }, { token: 'wideWidth', value: '1400px' }],
    radius: [{ token: 'md', value: '10px' }, { token: 'pill', value: '999px' }],
  }
  const fetchDraft = vi.fn(async (url: string) => {
    const query = new URL(url, 'https://zyvavu.test').searchParams
    const action = query.get('action')
    if (action === 'preview') {
      return Response.json({
        success: true,
        revision: 'preview-revision',
        changes: [{ field: 'colors.primary', before: '#123456', after: '#246810' }],
      })
    }
    if (action === 'save') {
      expect(query.get('revision')).toBe('preview-revision')
      preview.revision = 4
      preview.colors[0].value = '#246810'
      return Response.json({ success: true })
    }
    return Response.json({
      success: true,
      preview: query.get('themeId') === 'other-theme'
        ? { ...preview, colors: [{ token: 'primary', value: '#abcdef' }] }
        : preview,
    })
  })
  vi.stubGlobal('fetch', fetchDraft)
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })))
  const openTheme = (id: string) => render(
    <MantineProvider env="test">
      <CreateThemeWizard opened onClose={() => {}} onCreated={() => {}}
        existingTheme={{ id, label: id === 'selected-theme' ? 'Selected Theme' : 'Other Theme' }} />
    </MantineProvider>,
  )

  openTheme('other-theme')
  await screen.findByRole('img', { name: 'Primary #abcdef' })
  cleanup()

  const { container } = openTheme('selected-theme')
  const summary = within(await screen.findByTestId('customize-saved-preview'))
  expect(summary.getAllByRole('img')).toHaveLength(6)
  expect(summary.getByRole('img', { name: 'Primary #123456' })).toBeTruthy()
  expect(summary.queryByRole('img', { name: /#abcdef|headerText/ })).toBeNull()
  expect(summary.getByRole('heading', { name: 'The quick brown fox' }).style.fontFamily).toBe('Georgia, serif')
  expect(summary.getByText('Jumps over the lazy dog.').style.fontFamily).toBe('Arial, sans-serif')
  for (const value of ['Base size: 18px', '6–60px', '1120px container', '10px default']) {
    expect(summary.getByText(value)).toBeTruthy()
  }
  expect(summary.queryByText(/32px \/ 700|1400px|999px/)).toBeNull()
  expect(screen.getByTestId('customize-draft-revision').textContent).toBe('Draft r3')
  expect(screen.getByTestId('open-theme-customizer').getAttribute('href')).toContain('selected-theme')
  fireEvent.click(screen.getByText('Theme Builder', { exact: true }))
  expect(screen.queryByTestId('create-theme-step-builder')).toBeNull()

  const fileInput = container.ownerDocument.querySelector('input[type="file"]')!
  fireEvent.change(fileInput, { target: { files: [new File(['{}'], 'theme.json')] } })
  const save = await screen.findByRole('button', { name: 'Confirm and save draft' })
  expect(screen.getByTestId<HTMLButtonElement>('goto-builder-step').disabled).toBe(true)
  fireEvent.click(save)
  await screen.findByText('Draft r4')
  expect(summary.getByRole('img', { name: 'Primary #246810' })).toBeTruthy()
  expect(screen.queryByTestId('create-theme-step-builder')).toBeNull()

  cleanup()
  openTheme('selected-theme')
  await screen.findByRole('img', { name: 'Primary #246810' })
  expect(screen.getByTestId('customize-draft-revision').textContent).toBe('Draft r4')
  fireEvent.click(screen.getByTestId('goto-builder-step'))
  expect(screen.getByTestId('create-theme-step-builder')).toBeTruthy()
})
