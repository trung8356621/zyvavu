'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  Box,
  Button,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  UnstyledButton,
} from '@mantine/core'
import { SharedDraggableModal } from './SharedDraggableModal'
import { ADMIN_OVERLAY_LAYERS } from '@/theme/layers'
import {
  compatibleAnimations,
  getAnimationPreset,
  resolveAnimationOptions,
  type AnimationConfig,
  type AnimationControlKey,
  type AnimationDirection,
  type AnimationDurationToken,
  type AnimationOptions,
  type AnimationTarget,
  type AnimationTrigger,
} from '@/lib/style-engine/animation-presets'
import { AnimationPresetThumbnail } from '@/lib/style-engine/animation-thumbnails'
import { replayAnimation } from '@/lib/style-engine/animation-replay'

type PresetRow = ReturnType<typeof compatibleAnimations>[number]
type AnimationPage = 'library' | 'settings'

const CATEGORY_LABELS: Record<AnimationTrigger, string> = {
  entrance: 'Entrance',
  loop: 'Loop',
  hover: 'Hover',
  scroll: 'Scroll',
}

function buildConfig(
  preset: PresetRow,
  target: AnimationTarget,
  previous?: AnimationOptions,
): AnimationConfig {
  const defaults = ('defaults' in preset ? preset.defaults : undefined) || {}
  const nextOptions: AnimationOptions = { ...defaults }
  for (const key of preset.controls as readonly AnimationControlKey[]) {
    const value = previous?.[key as keyof AnimationOptions]
    if (value !== undefined) (nextOptions as Record<string, unknown>)[key] = value
  }
  return {
    preset: preset.id,
    trigger: preset.trigger,
    target,
    options: Object.keys(nextOptions).length ? nextOptions : undefined,
  }
}

function EffectControls({
  value,
  onChange,
}: {
  value: AnimationConfig
  onChange: (value: AnimationConfig) => void
}) {
  const preset = getAnimationPreset(value.preset)
  if (!preset || !preset.controls.length) return null
  const opts = resolveAnimationOptions(value)
  const patch = (partial: AnimationOptions) =>
    onChange({ ...value, options: { ...opts, ...partial } })

  return (
    <Stack gap="sm" data-testid="animation-effect-controls">
      {preset.controls.includes('direction') && (
        <Select
          label="Direction"
          value={opts.direction || 'vertical'}
          data={
            value.trigger === 'loop'
              ? [
                  { value: 'vertical', label: 'Vertical' },
                  { value: 'horizontal', label: 'Horizontal' },
                ]
              : [
                  { value: 'down', label: 'Down' },
                  { value: 'up', label: 'Up' },
                  { value: 'left', label: 'Left' },
                  { value: 'right', label: 'Right' },
                ]
          }
          onChange={(direction) =>
            direction && patch({ direction: direction as AnimationDirection })
          }
        />
      )}
      {preset.controls.includes('distancePx') && (
        <NumberInput
          label="Distance (px)"
          min={1}
          max={200}
          value={opts.distancePx ?? 25}
          onChange={(distancePx) => typeof distancePx === 'number' && patch({ distancePx })}
        />
      )}
      {preset.controls.includes('durationSec') && (
        <NumberInput
          label="Duration (sec)"
          min={0.1}
          max={10}
          step={0.1}
          decimalScale={1}
          value={opts.durationSec ?? (value.trigger === 'loop' ? 1.5 : 0.8)}
          onChange={(durationSec) => typeof durationSec === 'number' && patch({ durationSec })}
        />
      )}
      {preset.controls.includes('delaySec') && (
        <NumberInput
          label="Delay (sec)"
          min={0}
          max={10}
          step={0.1}
          decimalScale={1}
          value={opts.delaySec ?? 0}
          onChange={(delaySec) => typeof delaySec === 'number' && patch({ delaySec })}
        />
      )}
      {preset.controls.includes('loopDelaySec') && (
        <NumberInput
          label="Delay between loops (sec)"
          min={0}
          max={10}
          step={0.1}
          decimalScale={1}
          value={opts.loopDelaySec ?? 0}
          onChange={(loopDelaySec) =>
            typeof loopDelaySec === 'number' && patch({ loopDelaySec })
          }
        />
      )}
      {preset.controls.includes('duration') && (
        <Select
          label="Duration"
          value={opts.duration || 'normal'}
          data={['fast', 'normal', 'slow']}
          onChange={(duration) =>
            duration && patch({ duration: duration as AnimationDurationToken })
          }
        />
      )}
    </Stack>
  )
}

function EffectCard({
  preset,
  selected,
  onSelect,
  onHoverPlay,
  onHoverStop,
  sampleRef,
}: {
  preset: PresetRow
  selected: boolean
  onSelect: () => void
  onHoverPlay: () => void
  onHoverStop: () => void
  sampleRef: (node: HTMLElement | null) => void
}) {
  const [hovered, setHovered] = useState(false)
  const background = selected
    ? hovered
      ? 'var(--mantine-color-blue-2)'
      : 'var(--mantine-color-blue-1)'
    : hovered
      ? 'var(--mantine-color-gray-0)'
      : 'transparent'
  return (
    <UnstyledButton
      onClick={onSelect}
      disabled={!preset.implemented}
      onMouseEnter={() => {
        setHovered(true)
        onHoverPlay()
      }}
      onFocus={() => {
        setHovered(true)
        onHoverPlay()
      }}
      onMouseLeave={() => {
        setHovered(false)
        onHoverStop()
      }}
      onBlur={() => {
        setHovered(false)
        onHoverStop()
      }}
      aria-pressed={selected}
      data-selected={selected || undefined}
      data-testid={`animation-card-${preset.id}`}
      style={{
        display: 'block',
        width: '100%',
        boxSizing: 'border-box',
        borderRadius: 8,
        border: selected
          ? '2px solid var(--mantine-color-blue-filled)'
          : `1px solid ${hovered ? 'var(--mantine-color-gray-4)' : 'var(--mantine-color-default-border)'}`,
        background,
        padding: '6px 4px 8px',
        opacity: preset.implemented ? 1 : 0.5,
        cursor: preset.implemented ? 'pointer' : 'not-allowed',
        transition: 'background-color 120ms ease, border-color 120ms ease',
      }}
    >
      <Box
        ref={sampleRef}
        data-testid={`animation-preview-${preset.id}`}
        data-animation-thumb={preset.id}
        style={{
          width: 48,
          height: 48,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible',
          color: 'var(--mantine-color-text)',
          flexShrink: 0,
        }}
      >
        <AnimationPresetThumbnail preset={preset.id} size={48} />
      </Box>
      <Text
        size="xs"
        ta="center"
        mt={4}
        lineClamp={2}
        fw={selected ? 700 : 500}
        c={selected ? 'blue.8' : undefined}
      >
        {preset.name}
        {!preset.implemented ? ' (shell)' : ''}
      </Text>
    </UnstyledButton>
  )
}

export function AnimationPresetControls({
  value,
  target,
  onChange,
  onTestAnimation,
}: {
  value?: AnimationConfig
  target: AnimationTarget
  onChange: (value: AnimationConfig | undefined) => void
  /** Canvas replay for Settings page. Must not write history. */
  onTestAnimation?: (config: AnimationConfig) => string | void
}) {
  const [page, setPage] = useState<AnimationPage>('library')
  const [category, setCategory] = useState<AnimationTrigger>(value?.trigger || 'entrance')
  const [editing, setEditing] = useState<AnimationConfig | null>(
    value && value.preset !== 'none' ? value : null,
  )
  const [testNotice, setTestNotice] = useState<string | null>(null)
  const samples = useRef(new Map<string, HTMLElement>())
  const cancels = useRef(new Map<string, () => void>())

  useEffect(
    () => () => {
      cancels.current.forEach((cancel) => cancel())
    },
    [],
  )

  // Keep editing draft in sync when host commits options (Direct Commit) while on settings.
  useEffect(() => {
    if (page !== 'settings' || !editing) return
    if (value?.preset === editing.preset) setEditing(value)
  }, [value, page, editing?.preset])

  // External clear / undo to none → leave settings.
  useEffect(() => {
    if (!value || value.preset === 'none') {
      if (page === 'settings') {
        setPage('library')
        setEditing(null)
      }
    }
  }, [value, page])

  const stopSample = (id: string) => {
    cancels.current.get(id)?.()
    cancels.current.delete(id)
  }

  const playSample = (preset: PresetRow, options?: AnimationOptions) => {
    stopSample(preset.id)
    const sample = samples.current.get(preset.id)
    if (!sample || !preset.implemented) return
    cancels.current.set(
      preset.id,
      replayAnimation(
        sample,
        {
          preset: preset.id,
          trigger: preset.trigger,
          target,
          options: options || ('defaults' in preset ? preset.defaults : undefined),
        },
        { force: true },
      ),
    )
  }

  const openSettings = (preset: PresetRow) => {
    if (!preset.implemented) return
    const next = buildConfig(
      preset,
      target,
      value?.preset === preset.id ? value.options : undefined,
    )
    onChange(next)
    setEditing(next)
    setCategory(preset.trigger)
    setPage('settings')
    setTestNotice(null)
  }

  const backToLibrary = () => {
    cancels.current.forEach((cancel) => cancel())
    cancels.current.clear()
    setPage('library')
    setEditing(null)
    setTestNotice(null)
    if (value?.trigger) setCategory(value.trigger)
  }

  if (page === 'settings' && editing && editing.preset !== 'none') {
    const preset = getAnimationPreset(editing.preset)
    return (
      <Stack gap="md" data-testid="animation-settings-page">
        <Group justify="space-between" gap="xs" wrap="nowrap">
          <Button
            variant="light"
            size="compact-sm"
            onClick={backToLibrary}
            aria-label="Back to animation library"
          >
            ← Back
          </Button>
          <Button
            variant="default"
            size="compact-sm"
            aria-label="Clear animation"
            onClick={() => {
              onChange(undefined)
              setEditing(null)
              setPage('library')
            }}
          >
            None
          </Button>
        </Group>
        <Text size="md" fw={700} lh={1.3}>
          {preset?.name || editing.preset}
        </Text>
        {target !== 'dropdown' && (
          <EffectControls
            value={editing}
            onChange={(next) => {
              setEditing(next)
              onChange(next)
            }}
          />
        )}
        {onTestAnimation && (
          <Button
            fullWidth
            onClick={() => {
              const message = onTestAnimation(editing)
              setTestNotice(typeof message === 'string' ? message : null)
            }}
          >
            Test Animation
          </Button>
        )}
        {testNotice && (
          <Text size="xs" c="dimmed" role="status">
            {testNotice}
          </Text>
        )}
      </Stack>
    )
  }

  return (
    <Stack gap="sm" data-testid="animation-library-page">
      <Group justify="space-between" gap="xs">
        <Text size="sm" fw={600}>
          Effect library
        </Text>
        <Button
          variant={!value || value.preset === 'none' ? 'light' : 'default'}
          size="compact-sm"
          aria-label="Clear animation"
          onClick={() => onChange(undefined)}
        >
          None
        </Button>
      </Group>
      <Tabs
        value={category}
        onChange={(next) => {
          if (!next) return
          setCategory(next as AnimationTrigger)
          setPage('library')
          setEditing(null)
        }}
      >
        <Tabs.List
          style={{
            flexWrap: 'nowrap',
            overflowX: 'auto',
            scrollbarWidth: 'thin',
          }}
        >
          {(['entrance', 'loop', 'hover', 'scroll'] as const).map((item) => (
            <Tabs.Tab
              key={item}
              value={item}
              disabled={target === 'dropdown' && item !== 'entrance'}
              style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
            >
              {CATEGORY_LABELS[item]}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>
      {category === 'scroll' && (
        <Text size="xs" c="dimmed" data-testid="animation-scroll-shell-note">
          Scroll effects are shell-only — not selectable for runtime yet.
        </Text>
      )}
      <SimpleGrid cols={2} spacing="xs">
        {compatibleAnimations(target)
          .filter((preset) => preset.id !== 'none' && preset.trigger === category)
          .map((preset) => (
            <EffectCard
              key={preset.id}
              preset={preset}
              selected={value?.preset === preset.id}
              onSelect={() => openSettings(preset)}
              onHoverPlay={() => playSample(preset)}
              onHoverStop={() => stopSample(preset.id)}
              sampleRef={(node) => {
                if (node) samples.current.set(preset.id, node)
                else samples.current.delete(preset.id)
              }}
            />
          ))}
      </SimpleGrid>
      <Text size="xs" c="dimmed">
        Hover a thumbnail to preview. Selecting an effect opens its settings.
      </Text>
    </Stack>
  )
}

export function AnimationPresetPicker({
  value,
  target,
  onChange,
  onOpenChange,
  onTestAnimation,
  disabled = false,
  inline = false,
}: {
  value?: AnimationConfig
  target: AnimationTarget
  onChange: (value: AnimationConfig | undefined) => void
  onOpenChange?: (opened: boolean) => void
  onTestAnimation?: (config: AnimationConfig) => string | void
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
  if (inline)
    return (
      <AnimationPresetControls
        value={value}
        target={target}
        onChange={onChange}
        onTestAnimation={onTestAnimation}
      />
    )
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
