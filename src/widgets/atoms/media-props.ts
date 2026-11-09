/** Shared media presentation props for Image / Video atoms. */

export const ASPECT_RATIO_OPTIONS = [
  { label: 'Auto', value: 'auto' },
  { label: 'Landscape 16:9', value: '16:9' },
  { label: 'Standard 4:3', value: '4:3' },
  { label: 'Square', value: '1:1' },
  { label: 'Portrait', value: '3:4' },
  { label: 'Wide banner', value: '21:9' },
] as const

export type AspectRatioValue = (typeof ASPECT_RATIO_OPTIONS)[number]['value']

export const OBJECT_FIT_OPTIONS = [
  { label: 'Cover', value: 'cover' },
  { label: 'Contain', value: 'contain' },
  { label: 'Fill', value: 'fill' },
  { label: 'None', value: 'none' },
] as const

export type ObjectFitValue = (typeof OBJECT_FIT_OPTIONS)[number]['value']

export const OBJECT_POSITION_OPTIONS = [
  { label: 'Center', value: 'center' },
  { label: 'Top', value: 'top' },
  { label: 'Bottom', value: 'bottom' },
  { label: 'Left', value: 'left' },
  { label: 'Right', value: 'right' },
] as const

export type ObjectPositionValue = (typeof OBJECT_POSITION_OPTIONS)[number]['value']

export function isSafeMediaHref(href: string | undefined | null): boolean {
  if (!href || !href.trim()) return false
  return !/^(?:javascript|data|vbscript):/i.test(href.trim())
}
