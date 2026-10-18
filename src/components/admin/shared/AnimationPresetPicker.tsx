'use client'

import React, { useState } from 'react'
import { Button, Group, Select, SimpleGrid, Stack, Text } from '@mantine/core'
import { SharedDraggableModal } from './SharedDraggableModal'
import { ADMIN_OVERLAY_LAYERS } from '@/theme/layers'
import {
  ANIMATION_CSS,
  animationAttributes,
  compatibleAnimations,
  type AnimationConfig,
  type AnimationTarget,
} from '@/lib/style-engine/animation-presets'

export function AnimationPresetPicker({
  value,
  target,
  onChange,
  onOpenChange,
  disabled = false,
}: {
  value?: AnimationConfig
  target: AnimationTarget
  onChange: (value: AnimationConfig | undefined) => void
  onOpenChange?: (opened: boolean) => void
  disabled?: boolean
}) {
  const [opened, setOpened] = useState(false)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [draft, setDraft] = useState<AnimationConfig | undefined>(value)
  const close = () => {
    setOpened(false)
    onOpenChange?.(false)
  }
  return (
    <>
      <Button
        variant="default"
        disabled={disabled}
        onClick={(event) => {
          setDraft(value)
          setAnchor(event.currentTarget)
          setOpened(true)
          onOpenChange?.(true)
        }}
      >
        Animation: {value?.preset || 'none'}
      </Button>
      <SharedDraggableModal
        opened={opened}
        onClose={close}
        title="Animation presets"
        width={420}
        anchorEl={anchor}
        zIndex={ADMIN_OVERLAY_LAYERS.PALETTE_MODAL}
        footer={
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>
              Cancel animation
            </Button>
            <Button
              onClick={() => {
                onChange(draft)
                close()
              }}
            >
              Use animation
            </Button>
          </Group>
        }
      >
        <style>{ANIMATION_CSS}</style>
        <Stack>
          <SimpleGrid cols={2}>
            {compatibleAnimations(target).map((preset) => (
              <Button
                key={preset.id}
                variant={(draft?.preset || 'none') === preset.id ? 'light' : 'default'}
                aria-pressed={(draft?.preset || 'none') === preset.id}
                disabled={!preset.implemented}
                onClick={() =>
                  setDraft(
                    preset.id === 'none'
                      ? undefined
                      : {
                          preset: preset.id,
                          trigger: preset.trigger,
                          target,
                          options: draft?.options,
                        },
                  )
                }
              >
                <span
                  {...animationAttributes({ preset: preset.id, trigger: preset.trigger, target })}
                >
                  {preset.name}
                </span>
              </Button>
            ))}
          </SimpleGrid>
          <Text size="sm" c="dimmed">
            Entrance · Loop · Hover. Scroll presets are shell-only and cannot be saved.
          </Text>
          {draft && target !== 'dropdown' && (
            <Select
              label="Duration"
              value={draft.options?.duration || 'normal'}
              data={['fast', 'normal', 'slow']}
              comboboxProps={{ zIndex: ADMIN_OVERLAY_LAYERS.ACTIVE_DROPDOWN }}
              onChange={(duration) =>
                setDraft({
                  ...draft,
                  options: { duration: duration as 'fast' | 'normal' | 'slow' },
                })
              }
            />
          )}
        </Stack>
      </SharedDraggableModal>
    </>
  )
}
