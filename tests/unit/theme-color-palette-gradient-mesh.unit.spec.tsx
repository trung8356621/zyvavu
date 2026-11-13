import React from 'react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { ThemeColorPaletteModal } from '@/components/admin/shared/ThemeColorPaletteModal'
import type { GradientDef, MeshDef } from '@/lib/style-engine/types'
import type { ThemeTokens } from '@/lib/theme-engine/types'

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

afterEach(() => {
  cleanup()
})

const cyberTokens = {
  colors: {
    background: '#080D19',
    surface: '#10182A',
    text: '#E8F1FF',
    primary: '#62EEFF',
    accent: '#D83EAF',
    primaryHover: '#4BC8D9',
    shadowSoft: '#121A2B',
    shadowMedium: '#1A2438',
    shadowStrong: '#05080F',
  },
} as ThemeTokens

const cyberGradient: GradientDef = {
  type: 'linear',
  angle: 120,
  stops: [
    { token: 'background', position: 0 },
    { token: 'primary', position: 25 },
    { token: 'accent', position: 50 },
    { token: 'primaryHover', position: 75 },
    { token: 'text', position: 100 },
  ],
}

const cyberMesh: MeshDef = {
  points: [
    { id: 'a', token: 'primary', x: 20, y: 25, radius: 40 },
    { id: 'b', token: 'accent', x: 70, y: 35, radius: 55 },
    { id: 'c', token: 'background', x: 45, y: 75, radius: 60 },
  ],
}

function renderModal(props: Partial<React.ComponentProps<typeof ThemeColorPaletteModal>> = {}) {
  return render(
    <MantineProvider>
      <ThemeColorPaletteModal
        opened
        onClose={vi.fn()}
        tokens={cyberTokens}
        includeBackgroundTokens
        supportedModes={['solid', 'gradient', 'mesh']}
        {...props}
      />
    </MantineProvider>,
  )
}

describe('ThemeColorPaletteModal — draft cyber tokens', () => {
  it('exposes cyber palette hex values in solid swatches', () => {
    renderModal({ initialMode: 'solid', value: 'background' })
    expect(screen.getByLabelText(/Select Background: #080D19/i)).toBeTruthy()
    expect(screen.getByLabelText(/Select Accent Highlight: #D83EAF/i)).toBeTruthy()
    expect(screen.getByLabelText(/Select Primary Brand: #62EEFF/i)).toBeTruthy()
  })
})

describe('ThemeColorPaletteModal — Gradient stop identity', () => {
  it('opens on gradient, keeps 5 stops, and edits only the selected stop token', () => {
    const onChangeGradient = vi.fn()
    renderModal({
      gradientValue: cyberGradient,
      onChangeGradient,
      onCancel: vi.fn(),
    })

    expect(screen.getByTestId('gradient-editor')).toBeTruthy()
    expect(screen.getByTestId('gradient-stop-handle-0')).toBeTruthy()
    expect(screen.getByTestId('gradient-stop-handle-4')).toBeTruthy()

    fireEvent.click(screen.getByTestId('gradient-stop-handle-2'))
    fireEvent.click(screen.getByTestId('gradient-stop-color-button'))
    const pick = screen.getByTestId('token-pick-subview')
    expect(pick).toBeTruthy()

    fireEvent.click(within(pick).getByLabelText(/Select Primary Brand: #62EEFF/i))

    expect(screen.queryByTestId('token-pick-subview')).toBeNull()
    expect(screen.getByTestId('gradient-editor')).toBeTruthy()
    expect(onChangeGradient).toHaveBeenCalled()
    const last = onChangeGradient.mock.calls.at(-1)?.[0] as GradientDef
    expect(last.stops).toHaveLength(5)
    expect(last.stops[2].token).toBe('primary')
    expect(last.stops[0].token).toBe('background')
    expect(last.stops[1].token).toBe('primary')
    expect(last.angle).toBe(120)
  })

  it('adds a stop via Thêm điểm màu and refuses delete below two stops', () => {
    const onChangeGradient = vi.fn()
    renderModal({
      gradientValue: {
        type: 'linear',
        angle: 90,
        stops: [
          { token: 'primary', position: 0 },
          { token: 'accent', position: 100 },
        ],
      },
      onChangeGradient,
    })

    fireEvent.click(screen.getByTestId('gradient-add-stop'))
    const added = onChangeGradient.mock.calls.at(-1)?.[0] as GradientDef
    expect(added.stops).toHaveLength(3)

    // reset to 2 then attempt delete
    onChangeGradient.mockClear()
    fireEvent.click(screen.getByRole('button', { name: /^Reset$/i }))
    const reset = onChangeGradient.mock.calls.at(-1)?.[0] as GradientDef
    expect(reset.stops).toHaveLength(2)

    const remove = screen.getByTestId('gradient-remove-stop') as HTMLButtonElement
    expect(remove.disabled).toBe(true)
  })

  it('nudges selected stop with keyboard arrows without losing selection identity', () => {
    const onChangeGradient = vi.fn()
    renderModal({ gradientValue: cyberGradient, onChangeGradient })

    const handle = screen.getByTestId('gradient-stop-handle-2')
    fireEvent.click(handle)
    fireEvent.keyDown(handle, { key: 'ArrowRight' })

    const next = onChangeGradient.mock.calls.at(-1)?.[0] as GradientDef
    expect(next.stops[2].token).toBe('accent')
    expect(next.stops[2].position).toBe(51)
  })
})

describe('ThemeColorPaletteModal — Mesh point selection', () => {
  it('selects a point, changes radius, and nested token pick keeps other points', () => {
    const onChangeMesh = vi.fn()
    renderModal({
      meshValue: cyberMesh,
      onChangeMesh,
      onCancel: vi.fn(),
    })

    expect(screen.getByTestId('mesh-editor')).toBeTruthy()
    fireEvent.click(screen.getByTestId('mesh-point-handle-b'))

    const selected = screen.getByTestId('mesh-selected-point')
    const radiusInput = within(selected).getByRole('textbox', { name: /Radius/i })
    fireEvent.change(radiusInput, { target: { value: '80' } })
    fireEvent.blur(radiusInput)

    fireEvent.click(screen.getByTestId('mesh-point-color-button'))
    const pick = screen.getByTestId('token-pick-subview')
    fireEvent.click(within(pick).getByLabelText(/Select Primary Brand: #62EEFF/i))

    const last = onChangeMesh.mock.calls.at(-1)?.[0] as MeshDef
    expect(last.points).toHaveLength(3)
    const pointB = last.points.find((p) => p.id === 'b')
    expect(pointB?.token).toBe('primary')
    expect(last.points.find((p) => p.id === 'a')?.token).toBe('primary')
    expect(last.points.find((p) => p.id === 'c')?.token).toBe('background')
  })
})

describe('ThemeBuilderView draft resolver wiring', () => {
  it('loads draft theme config for Builder edit sessions', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const file = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/admin/theme-builder/ThemeBuilderView.tsx'),
      'utf8',
    )
    expect(file).toContain('resolveDraftThemeConfig')
    expect(file).not.toMatch(/resolveActiveThemeConfig\(\s*payload,\s*targetThemeId/)
  })
})
