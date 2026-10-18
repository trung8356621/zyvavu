'use client'

import React, { useState } from 'react'
import {
  Button,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  ThemeIcon,
} from '@mantine/core'
import { Sparkles } from 'lucide-react'
import { SharedDraggableModal } from './SharedDraggableModal'
import { ADMIN_OVERLAY_LAYERS } from '@/theme/layers'
import {
  ANIMATION_CSS,
  animationAttributes,
  compatibleAnimations,
  type AnimationConfig,
  type AnimationTarget,
  type AnimationTrigger,
} from '@/lib/style-engine/animation-presets'

const CATEGORIES: { value: AnimationTrigger; label: string }[] = [
  { value: 'entrance', label: 'Entrance' },
  { value: 'loop', label: 'Loop' },
  { value: 'scroll', label: 'Scroll' },
  { value: 'hover', label: 'Hover' },
]

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
  const [category, setCategory] = useState<AnimationTrigger>('entrance')
  const [replays, setReplays] = useState<Record<string, number>>({})
  const close = () => {
    setOpened(false)
    onOpenChange?.(false)
  }
  const presets = compatibleAnimations(target).filter(
    (preset) => preset.id !== 'none' && preset.trigger === category,
  )
  const replay = (id: string) =>
    setReplays((previous) => ({ ...previous, [id]: (previous[id] || 0) + 1 }))

  return (
    <>
      <Button
        variant="default"
        disabled={disabled}
        onClick={(event) => {
          setDraft(value)
          setCategory(value?.trigger || 'entrance')
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
        width={440}
        anchorEl={anchor}
        zIndex={ADMIN_OVERLAY_LAYERS.PALETTE_MODAL}
        subHeader={
          <Stack gap="xs">
            <Group justify="space-between">
              <Button
                variant={!draft ? 'light' : 'default'}
                aria-pressed={!draft}
                onClick={() => setDraft(undefined)}
              >
                None
              </Button>
              <Text size="sm">Selected: {draft?.preset || 'none'}</Text>
            </Group>
            <Tabs value={category} onChange={(next) => setCategory(next as AnimationTrigger)}>
              <Tabs.List grow style={{ flexWrap: 'nowrap' }}>
                {CATEGORIES.map((item) => (
                  <Tabs.Tab
                    key={item.value}
                    value={item.value}
                    disabled={target === 'dropdown' && item.value !== 'entrance'}
                  >
                    {item.label}
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs>
          </Stack>
        }
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
          {category === 'scroll' && (
            <Text role="status">
              Scroll Animation is unavailable / shell-only until its runtime is implemented.
            </Text>
          )}
          <SimpleGrid cols={2}>
            {presets.map((preset) => (
              <Paper key={preset.id} withBorder p="sm" radius="md">
                <Stack align="center" gap="sm">
                  <ThemeIcon
                    key={replays[preset.id] || 0}
                    size="xl"
                    variant="light"
                    aria-hidden="true"
                    data-testid={`animation-preview-${preset.id}`}
                    data-zyvavu-motion-preview="true"
                    {...animationAttributes({
                      preset: preset.id,
                      trigger: preset.trigger,
                      target,
                      options: draft?.preset === preset.id ? draft.options : undefined,
                    })}
                  >
                    <Sparkles />
                  </ThemeIcon>
                  <Button
                    fullWidth
                    aria-label={preset.name}
                    aria-pressed={draft?.preset === preset.id}
                    disabled={!preset.implemented}
                    variant={draft?.preset === preset.id ? 'light' : 'default'}
                    onMouseEnter={() => replay(preset.id)}
                    onFocus={() => replay(preset.id)}
                    onClick={() => {
                      replay(preset.id)
                      setDraft({
                        preset: preset.id,
                        trigger: preset.trigger,
                        target,
                        options: draft?.options,
                      })
                    }}
                  >
                    {preset.name}
                  </Button>
                  {preset.implemented && (
                    <Text size="xs" c="dimmed">
                      Hover or focus to replay the sample
                    </Text>
                  )}
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>
          {draft && draft.trigger === category && target !== 'dropdown' && (
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
