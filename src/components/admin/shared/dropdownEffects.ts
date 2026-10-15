export type DropdownEffectId = 'none' | 'fade' | 'slide-down'
export type ItemDropdownEffectId = 'inherit' | DropdownEffectId

export type DropdownEffectDefinition = {
  id: DropdownEffectId
  name: string
  description: string
  cssAnimation: string
  previewClass: string
}

export const DROPDOWN_EFFECTS: Record<DropdownEffectId, DropdownEffectDefinition> = {
  none: {
    id: 'none',
    name: 'None',
    description: 'Instant display without transition animation.',
    cssAnimation: 'none',
    previewClass: 'effect-none',
  },
  fade: {
    id: 'fade',
    name: 'Fade',
    description: 'Smooth opacity transition (200ms ease).',
    cssAnimation: 'opacity 200ms ease',
    previewClass: 'effect-fade',
  },
  'slide-down': {
    id: 'slide-down',
    name: 'Slide Down',
    description: 'Subtle vertical slide with fading entrance (250ms cubic-bezier).',
    cssAnimation: 'transform 250ms ease, opacity 250ms ease',
    previewClass: 'effect-slide-down',
  },
}

/**
 * Resolves the effective dropdown animation effect for an item.
 * If item specifies 'inherit' or no override, falls back to the menu default.
 */
export function resolveDropdownEffect(
  itemEffect?: ItemDropdownEffectId | null,
  menuDefault: DropdownEffectId = 'fade',
): DropdownEffectId {
  if (!itemEffect || itemEffect === 'inherit') {
    return menuDefault || 'fade'
  }
  return itemEffect
}
