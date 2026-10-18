'use client'

import React, { useState } from 'react'
import { Alert, Button, Group, SegmentedControl, Select, Stack, Tabs, Text } from '@mantine/core'
import { resolveColorToken, resolveShadowToken } from '@/lib/style-engine/token-resolver'
import type { ThemeConfig } from '@/lib/theme-engine/types'

export const BUTTON_STYLE_GROUPS = [
  'Background',
  'Text',
  'Border',
  'Radius',
  'Shadow',
  'Layout',
  'Icon',
] as const

/** Design contract preview only. No unsupported field is sent to the document. */
export function ButtonStyleControl({
  themeConfig,
  typography,
}: {
  themeConfig?: ThemeConfig
  typography?: React.ReactNode
}) {
  const [state, setState] = useState<'normal' | 'hover'>('normal')
  const [draft, setDraft] = useState<
    Record<
      string,
      {
        preset?: string
        background?: { colorToken?: string }
        colorToken?: string
        borderColorToken?: string
        shadowToken?: string
        opacity?: string
        transform?: string
      }
    >
  >({})
  const [group, setGroup] = useState<string>('Background')
  const update = (partial: Partial<(typeof draft)[string]>) =>
    setDraft((prev) => ({ ...prev, [state]: { ...prev[state], ...partial } }))
  return (
    <Stack>
      <Alert title="Button design — shell only">
        Shell samples are local and are not saved. Normal Text uses the working Typography Control
        and is saved with Apply. Other advanced groups remain disabled.
      </Alert>
      <Group>
        <Select
          label="Theme Button Presets (sample)"
          data={['theme', 'outline']}
          value={draft[state]?.preset || null}
          onChange={(preset) => update({ preset: preset as 'theme' | 'outline' })}
        />
        <Button variant="default" disabled>
          Text + Icon Presets — shell
        </Button>
        <Button variant="light" onClick={() => setGroup('Background')}>
          Customize Design
        </Button>
      </Group>
      <Button
        component="div"
        variant="default"
        style={{
          pointerEvents: 'none',
          background: resolveColorToken(draft[state]?.background?.colorToken || 'surface'),
          color: resolveColorToken(draft[state]?.colorToken || 'text'),
          border: draft[state]?.borderColorToken
            ? `1px solid ${resolveColorToken(draft[state].borderColorToken)}`
            : undefined,
          boxShadow: resolveShadowToken(draft[state]?.shadowToken),
          opacity: Number(draft[state]?.opacity || 1),
          transform:
            draft[state]?.transform === 'lift'
              ? 'translateY(-3px)'
              : draft[state]?.transform === 'grow'
                ? 'scale(1.015)'
                : undefined,
        }}
      >
        Button sample
      </Button>
      <SegmentedControl
        value={state}
        onChange={(value) => {
          setState(value as 'normal' | 'hover')
          setGroup('Background')
        }}
        data={[
          { value: 'normal', label: 'Normal' },
          { value: 'hover', label: 'Hover' },
        ]}
      />
      <Tabs
        orientation="vertical"
        value={group}
        onChange={(value) => setGroup(value || 'Background')}
      >
        <Tabs.List>
          {BUTTON_STYLE_GROUPS.filter(
            (name) => state === 'normal' || !['Radius', 'Icon'].includes(name),
          ).map((name) => (
            <Tabs.Tab key={name} value={name}>
              {name}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        <Tabs.Panel value={group} pl="sm">
          <Stack>
            <Text fw={600}>
              {group} · {state}
            </Text>
            <Text size="sm">
              Shell only — advanced {group.toLowerCase()} controls are not connected to rendering or
              persistence.
            </Text>
            {group === 'Background' && (
              <Select
                label="Theme color (local sample)"
                value={draft[state]?.background?.colorToken || null}
                data={Object.keys(themeConfig?.tokens.colors || {})}
                onChange={(token) => update({ background: { colorToken: token || undefined } })}
              />
            )}
            {group === 'Text' && state === 'normal' && typography}
            {group === 'Text' && state === 'hover' && (
              <Select
                label="Hover text color (local sample)"
                data={Object.keys(themeConfig?.tokens.colors || {})}
                value={draft.hover?.colorToken || null}
                onChange={(token) => update({ colorToken: token || undefined })}
              />
            )}
            {group === 'Layout' && state === 'hover' && (
              <>
                <Select
                  label="Hover opacity (local sample)"
                  data={['1', '0.8', '0.6']}
                  value={draft.hover?.opacity || '1'}
                  onChange={(opacity) => update({ opacity: opacity || '1' })}
                />
                <Select
                  label="Hover transform (local sample)"
                  data={['none', 'lift', 'grow']}
                  value={draft.hover?.transform || 'none'}
                  onChange={(transform) => update({ transform: transform || 'none' })}
                />
              </>
            )}
            {state === 'hover' && group === 'Border' && (
              <Select
                label="Hover border color (local sample)"
                data={Object.keys(themeConfig?.tokens.colors || {})}
                value={draft.hover?.borderColorToken || null}
                onChange={(token) => update({ borderColorToken: token || undefined })}
              />
            )}
            {state === 'hover' && group === 'Shadow' && (
              <Select
                label="Hover shadow (local sample)"
                data={['none', 'shadowSoft', 'shadowMedium', 'shadowStrong']}
                value={draft.hover?.shadowToken || 'none'}
                onChange={(token) => update({ shadowToken: token || undefined })}
              />
            )}
            {!['Background', 'Text'].includes(group) &&
              !(['Layout', 'Border', 'Shadow'].includes(group) && state === 'hover') && (
                <Button variant="default" disabled>
                  {group} configuration — coming later
                </Button>
              )}
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}
