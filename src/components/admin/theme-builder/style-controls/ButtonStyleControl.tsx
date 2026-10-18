'use client'

import React, { useState } from 'react'
import { Alert, Button, Group, SegmentedControl, Select, Stack, Tabs, Text } from '@mantine/core'
import type { ButtonStyleShell, ButtonShellState } from '@/lib/style-engine/types'
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
export function ButtonStyleControl({ themeConfig }: { themeConfig?: ThemeConfig }) {
  const [state, setState] = useState<'normal' | 'hover'>('normal')
  const [draft, setDraft] = useState<ButtonStyleShell>({ version: 1 })
  const [group, setGroup] = useState<string>('Background')
  const update = (partial: Partial<ButtonShellState>) =>
    setDraft((prev) => ({ ...prev, [state]: { ...prev[state], ...partial } }))
  return (
    <Stack>
      <Alert title="Button design — shell only">
        Local design samples only. Apply does not save these unsupported button fields. Use the
        working widget style tabs for current appearance.
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
      <SegmentedControl
        value={state}
        onChange={(value) => setState(value as 'normal' | 'hover')}
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
          {BUTTON_STYLE_GROUPS.map((name) => (
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
                onChange={(token) =>
                  update({ background: { mode: 'color', colorToken: token || undefined } })
                }
              />
            )}
            {group !== 'Background' && (
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
