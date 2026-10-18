'use client'

import React, { useEffect, useRef, useState } from 'react'
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
  compatibleAnimations,
  type AnimationConfig,
  type AnimationTarget,
  type AnimationTrigger,
} from '@/lib/style-engine/animation-presets'
import { replayAnimation } from '@/lib/style-engine/animation-replay'

export function AnimationPresetControls({
  value,
  target,
  onChange,
}: {
  value?: AnimationConfig
  target: AnimationTarget
  onChange: (value: AnimationConfig | undefined) => void
}) {
  const [category, setCategory] = useState<AnimationTrigger>(value?.trigger || 'entrance')
  const samples = useRef(new Map<string, HTMLElement>())
  const cancels = useRef(new Map<string, () => void>())
  useEffect(
    () => () => {
      cancels.current.forEach((cancel) => cancel())
    },
    [],
  )
  const play = (preset: ReturnType<typeof compatibleAnimations>[number]) => {
    cancels.current.get(preset.id)?.()
    const sample = samples.current.get(preset.id)
    if (sample)
      cancels.current.set(
        preset.id,
        replayAnimation(sample, {
          preset: preset.id,
          trigger: preset.trigger,
          target,
          options: value?.options,
        }),
      )
  }
  return (
    <Stack>
      <Button variant={!value ? 'light' : 'default'} onClick={() => onChange(undefined)}>
        None
      </Button>
      <Tabs value={category} onChange={(next) => setCategory(next as AnimationTrigger)}>
        <Tabs.List grow>
          {(['entrance', 'loop', 'hover', 'scroll'] as const).map((item) => (
            <Tabs.Tab
              key={item}
              value={item}
              disabled={item === 'scroll' || (target === 'dropdown' && item !== 'entrance')}
            >
              {item === 'scroll' ? 'Scroll (shell)' : item}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>
      <SimpleGrid cols={2}>
        {compatibleAnimations(target)
          .filter((preset) => preset.id !== 'none' && preset.trigger === category)
          .map((preset) => (
            <Paper
              key={preset.id}
              withBorder
              p="sm"
              onMouseEnter={() => play(preset)}
              onFocus={() => play(preset)}
              onMouseLeave={() => cancels.current.get(preset.id)?.()}
              onBlur={() => cancels.current.get(preset.id)?.()}
            >
              <Stack align="center" gap="sm">
                <ThemeIcon
                  ref={(node) => {
                    if (node) samples.current.set(preset.id, node)
                    else samples.current.delete(preset.id)
                  }}
                  size="xl"
                  variant="light"
                  aria-hidden="true"
                  data-testid={`animation-preview-${preset.id}`}
                >
                  <Sparkles />
                </ThemeIcon>
                <Button
                  fullWidth
                  aria-pressed={value?.preset === preset.id}
                  disabled={!preset.implemented}
                  variant={value?.preset === preset.id ? 'light' : 'default'}
                  onClick={() => {
                    onChange({
                      preset: preset.id,
                      trigger: preset.trigger,
                      target,
                      options: value?.options,
                    })
                    play(preset)
                  }}
                >
                  {preset.name}
                </Button>
                <Text size="xs" c="dimmed">
                  Hover or focus to replay the sample
                </Text>
              </Stack>
            </Paper>
          ))}
      </SimpleGrid>
      {value && target !== 'dropdown' && (
        <Select
          label="Duration"
          value={value.options?.duration || 'normal'}
          data={['fast', 'normal', 'slow']}
          onChange={(duration) =>
            onChange({ ...value, options: { duration: duration as 'fast' | 'normal' | 'slow' } })
          }
        />
      )}
    </Stack>
  )
}

export function AnimationPresetPicker({
  value,
  target,
  onChange,
  onOpenChange,
  disabled = false,
  inline = false,
}: {
  value?: AnimationConfig
  target: AnimationTarget
  onChange: (value: AnimationConfig | undefined) => void
  onOpenChange?: (opened: boolean) => void
  disabled?: boolean
  inline?: boolean
}) {
  const [opened, setOpened] = useState(false)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [draft, setDraft] = useState<AnimationConfig | undefined>(value)
  const close = () => {
    setOpened(false)
    onOpenChange?.(false)
  }
  if (inline) return <AnimationPresetControls value={value} target={target} onChange={onChange} />
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
        width={440}
        anchorEl={anchor}
        zIndex={ADMIN_OVERLAY_LAYERS.PALETTE_MODAL}
        footer={
          <Group justify="flex-end">
            <Button variant="default" aria-label="Cancel animation" onClick={close}>
              Cancel
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
        <AnimationPresetControls value={draft} target={target} onChange={setDraft} />
      </SharedDraggableModal>
    </>
  )
}
