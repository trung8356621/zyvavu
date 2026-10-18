import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Checkbox,
  createTheme,
  type MantineColorsTuple,
  type MantineSize,
  Paper,
  PasswordInput,
  SegmentedControl,
  Select,
  Tabs,
  TextInput,
} from '@mantine/core'

import rawTheme from './theme.json'

export type AdminThemeConfig = {
  primary: string
  sidebar: string
  background: string
  surface: string
  text: string
  border: string
  ui: {
    defaultSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    defaultRadius: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    density: 'comfortable' | 'compact'
  }
}

export const themeConfig = rawTheme.admin as AdminThemeConfig

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const num = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('')}`
}

function mixRgb(c1: [number, number, number], c2: [number, number, number], weight: number): [number, number, number] {
  return [
    c1[0] * weight + c2[0] * (1 - weight),
    c1[1] * weight + c2[1] * (1 - weight),
    c1[2] * weight + c2[2] * (1 - weight),
  ]
}

export function generateColorPalette(hex: string): MantineColorsTuple {
  const rgb = hexToRgb(hex)
  const white: [number, number, number] = [255, 255, 255]
  const black: [number, number, number] = [0, 0, 0]

  return [
    rgbToHex(...mixRgb(white, rgb, 0.9)),
    rgbToHex(...mixRgb(white, rgb, 0.8)),
    rgbToHex(...mixRgb(white, rgb, 0.65)),
    rgbToHex(...mixRgb(white, rgb, 0.45)),
    rgbToHex(...mixRgb(white, rgb, 0.25)),
    rgbToHex(...mixRgb(white, rgb, 0.1)),
    hex,
    rgbToHex(...mixRgb(black, rgb, 0.15)),
    rgbToHex(...mixRgb(black, rgb, 0.3)),
    rgbToHex(...mixRgb(black, rgb, 0.45)),
  ] as MantineColorsTuple
}

const defaultSize: MantineSize = themeConfig.ui?.defaultSize ?? 'md'
const defaultRadius: MantineSize = themeConfig.ui?.defaultRadius ?? 'md'
const density = themeConfig.ui?.density ?? 'comfortable'

const spacing =
  density === 'compact'
    ? {
        xs: '0.375rem',
        sm: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.25rem',
      }
    : {
        xs: '0.625rem',
        sm: '0.875rem',
        md: '1.25rem',
        lg: '1.75rem',
        xl: '2.25rem',
      }

export const adminMantineTheme = createTheme({
  primaryColor: 'brand',
  defaultRadius,
  colors: {
    brand: generateColorPalette(themeConfig.primary),
  },
  spacing,
  components: {
    Checkbox: Checkbox.extend({ defaultProps: { size: defaultSize, radius: defaultRadius } }),
    PasswordInput: PasswordInput.extend({ defaultProps: { size: defaultSize, radius: defaultRadius } }),
    Button: Button.extend({
      defaultProps: {
        size: defaultSize,
        radius: defaultRadius,
      },
    }),
    Badge: Badge.extend({
      defaultProps: {
        size: defaultSize,
        radius: defaultRadius,
      },
    }),
    SegmentedControl: SegmentedControl.extend({
      defaultProps: {
        size: defaultSize,
        radius: defaultRadius,
      },
    }),
    Tabs: Tabs.extend({
      defaultProps: {
        color: 'brand',
        radius: defaultRadius,
      },
    }),
    TextInput: TextInput.extend({
      defaultProps: {
        size: defaultSize,
        radius: defaultRadius,
      },
    }),
    Select: Select.extend({
      defaultProps: {
        size: defaultSize,
        radius: defaultRadius,
      },
    }),
    ActionIcon: ActionIcon.extend({
      defaultProps: {
        size: defaultSize,
        radius: defaultRadius,
      },
    }),
    Card: Card.extend({
      defaultProps: {
        radius: defaultRadius,
      },
    }),
    Paper: Paper.extend({
      defaultProps: {
        radius: defaultRadius,
      },
    }),
  },
})

export function getAdminDensity(): 'comfortable' | 'compact' {
  return density
}

export function getAdminThemeConfig(): AdminThemeConfig {
  return themeConfig
}
