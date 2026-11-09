/**
 * Global Theme Builder UX — semantic labels for named presets/tokens.
 * Storage values stay token ids; only user-facing Select labels use these names.
 * Do not invent names for arbitrary/custom CSS values — show the raw value instead.
 */

export function typographyPresetLabel(key: string): string {
  const k = key.trim().toLowerCase()
  const heading = /^h([1-6])$/.exec(k)
  if (heading) return `Heading ${heading[1]}`
  const paragraph = /^p([1-9]\d*)$/.exec(k)
  if (paragraph) return `Paragraph ${paragraph[1]}`
  return key.toUpperCase()
}

export function themeSourceLabel(presetKey: string | null | undefined): string {
  if (!presetKey) return 'Theme'
  return `Theme ${typographyPresetLabel(presetKey)}`
}

export const FONT_FAMILY_ROLE_LABELS: Record<string, string> = {
  theme: 'Body',
  heading: 'Heading',
}

export const FONT_WEIGHT_LABELS: Record<string, string> = {
  '300': 'Light',
  '400': 'Regular',
  '500': 'Medium',
  '600': 'Semi Bold',
  '700': 'Bold',
  '800': 'Extra Bold',
  normal: 'Regular',
  bold: 'Bold',
}

export const LINE_HEIGHT_LABELS: Record<string, string> = {
  compact: 'Compact',
  normal: 'Normal',
  relaxed: 'Relaxed',
  loose: 'Loose',
}

export const LETTER_SPACING_LABELS: Record<string, string> = {
  tighter: 'Tighter',
  tight: 'Tight',
  normal: 'Normal',
  wide: 'Wide',
  wider: 'Wider',
}

export const SPACING_TOKEN_LABELS: Record<string, string> = {
  none: 'None',
  xs: 'Extra Small',
  sm: 'Small',
  md: 'Medium',
  lg: 'Large',
  xl: 'Extra Large',
  xxl: '2X Large',
}

export const BORDER_WIDTH_LABELS: Record<string, string> = {
  none: 'None',
  thin: 'Thin',
  medium: 'Medium',
  thick: 'Thick',
}

export const RADIUS_SCALE_LABELS: Record<string, string> = {
  none: 'None',
  sm: 'Small',
  md: 'Medium',
  lg: 'Large',
  pill: 'Pill',
}

export const BLUR_SCALE_LABELS: Record<string, string> = {
  sm: 'Small',
  md: 'Medium',
  lg: 'Large',
}

export const MIN_HEIGHT_LABELS: Record<string, string> = {
  auto: 'Auto',
  sm: 'Small',
  md: 'Medium',
  lg: 'Large',
  screen: 'Full Viewport',
}

export const CONTAINER_WIDTH_LABELS: Record<string, string> = {
  inherit: 'Inherit Theme',
  containerWidth: 'Standard',
  narrowWidth: 'Narrow',
  wideWidth: 'Wide',
  full: 'Full Width',
}

export const PATTERN_SCALE_LABELS: Record<string, string> = {
  sm: 'Small',
  md: 'Medium',
  lg: 'Large',
}

/** Theme color tokens — user-facing names only (never expose CSS vars / internal ids alone). */
export const COLOR_TOKEN_LABELS: Record<string, string> = {
  background: 'Background',
  surface: 'Surface Card',
  text: 'Main Text',
  primary: 'Primary Brand',
  accent: 'Accent Highlight',
  primaryHover: 'Primary Hover',
  shadowSoft: 'Shadow Soft',
  shadowMedium: 'Shadow Medium',
  shadowStrong: 'Shadow Strong',
  white: 'White',
  black: 'Black',
}

export function colorTokenLabel(token: string | null | undefined): string {
  if (!token) return 'Unset'
  return COLOR_TOKEN_LABELS[token] || token
}

/** Map known preset → label; unknown values return null (caller shows raw custom). */
export function semanticLabel(
  map: Record<string, string>,
  token: string | null | undefined,
): string | null {
  if (!token) return null
  return map[token] ?? null
}

export function selectOptionsFromMap(map: Record<string, string>): { value: string; label: string }[] {
  return Object.entries(map).map(([value, label]) => ({ value, label }))
}
