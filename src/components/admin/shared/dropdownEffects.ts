import { ANIMATION_PRESETS, type AnimationConfig } from '@/lib/style-engine/animation-presets'

export type DropdownEffectId = 'none' | 'fade' | 'slide-down'
export type ItemDropdownEffectId = 'inherit' | DropdownEffectId

export type DropdownEffectDefinition = {
  id: DropdownEffectId
  name: string
  description: string
  cssAnimation: string
  previewClass: string
}

// Compatibility view of the global registry, retaining the public legacy shape.
export const DROPDOWN_EFFECTS = Object.fromEntries(
  ANIMATION_PRESETS.filter((preset) => 'dropdownTransition' in preset).map((preset) => [
    preset.id,
    {
      id: preset.id,
      name: preset.name,
      description: preset.name,
      cssAnimation: 'dropdownTransition' in preset ? preset.dropdownTransition : 'none',
      previewClass: `effect-${preset.id}`,
    },
  ]),
) as Record<DropdownEffectId, DropdownEffectDefinition>

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

export function dropdownToAnimation(value: DropdownEffectId): AnimationConfig | undefined {
  const preset = ANIMATION_PRESETS.find(
    (p) => p.id === value && (p.targets as readonly string[]).includes('dropdown'),
  )
  return preset && preset.id !== 'none'
    ? { preset: preset.id, trigger: preset.trigger, target: 'dropdown' }
    : undefined
}

export function animationToDropdown(value?: AnimationConfig): DropdownEffectId {
  return value?.target === 'dropdown' && (value.preset === 'fade' || value.preset === 'slide-down')
    ? value.preset
    : 'none'
}
