'use client'

import React, { useState } from 'react'
import { Accordion, Button, Group, SegmentedControl, Select, Stack, Text } from '@mantine/core'
import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react'
import type { StyleDomainGroup } from '@/lib/style-engine/domains'
import type { DimensionsConfig, SpacingConfig, TextAlign } from '@/lib/style-engine/types'
import {
  CONTAINER_WIDTH_LABELS,
  MIN_HEIGHT_LABELS,
  SPACING_TOKEN_LABELS,
} from '@/lib/style-engine/semantic-preset-labels'

export interface SpacingDimensionsControlProps {
  spacing?: SpacingConfig
  dimensions?: DimensionsConfig
  showDimensions?: boolean
  onChangeSpacing: (spacing: SpacingConfig) => void
  onChangeDimensions: (dimensions: DimensionsConfig) => void
  onResetGroup?: (group: StyleDomainGroup) => void
}

function GroupReset({
  label,
  onReset,
}: {
  label: string
  onReset?: () => void
}) {
  if (!onReset) return null
  return (
    <Group justify="flex-end" mb={4}>
      <Button variant="subtle" size="compact-xs" onClick={onReset} aria-label={`Reset ${label}`}>
        Reset group
      </Button>
    </Group>
  )
}

export function SpacingDimensionsControl({
  spacing = {},
  dimensions = {},
  showDimensions = true,
  onChangeSpacing,
  onChangeDimensions,
  onResetGroup,
}: SpacingDimensionsControlProps) {
  const [opened, setOpened] = useState<string[]>(['spacing', 'dimensions', 'alignment'])

  const updateSpacing = (partial: Partial<SpacingConfig>) => {
    onChangeSpacing({
      ...spacing,
      ...partial,
    })
  }

  const updateDimensions = (partial: Partial<DimensionsConfig>) => {
    onChangeDimensions({
      ...dimensions,
      ...partial,
    })
  }

  return (
    <Accordion
      multiple
      value={opened}
      onChange={setOpened}
      variant="separated"
      chevronPosition="left"
    >
      <Accordion.Item value="spacing">
        <Accordion.Control>
          <Text size="sm" fw={600}>
            Spacing
          </Text>
        </Accordion.Control>
        <Accordion.Panel>
          <GroupReset label="Spacing" onReset={onResetGroup ? () => onResetGroup('spacing') : undefined} />
          <Group grow gap="xs">
            <Select
              size="sm"
              label="Padding"
              placeholder="Inherit"
              clearable
              value={spacing.padding?.token || null}
              onChange={(val) =>
                updateSpacing({
                  padding: { ...spacing.padding, token: val || undefined },
                })
              }
              data={['none', 'xs', 'sm', 'md', 'lg', 'xl'].map((value) => ({
                value,
                label: SPACING_TOKEN_LABELS[value],
              }))}
            />
            <Select
              size="sm"
              label="Margin"
              placeholder="Inherit"
              clearable
              value={spacing.margin?.token || null}
              onChange={(val) =>
                updateSpacing({
                  margin: { ...spacing.margin, token: val || undefined },
                })
              }
              data={['none', 'xs', 'sm', 'md', 'lg'].map((value) => ({
                value,
                label: SPACING_TOKEN_LABELS[value],
              }))}
            />
          </Group>
        </Accordion.Panel>
      </Accordion.Item>

      {showDimensions && (
        <Accordion.Item value="dimensions">
          <Accordion.Control>
            <Text size="sm" fw={600}>
              Dimensions
            </Text>
          </Accordion.Control>
          <Accordion.Panel>
            <GroupReset
              label="Dimensions"
              onReset={onResetGroup ? () => onResetGroup('dimensions') : undefined}
            />
            <Group grow gap="xs">
              <Select
                size="sm"
                label="Container Width"
                placeholder="Inherit"
                clearable
                value={dimensions.containerWidth || null}
                onChange={(val) => updateDimensions({ containerWidth: val || undefined })}
                data={['containerWidth', 'narrowWidth', 'wideWidth', 'full'].map((value) => ({
                  value,
                  label: CONTAINER_WIDTH_LABELS[value],
                }))}
              />
              <Select
                size="sm"
                label="Minimum Height"
                placeholder="Inherit"
                clearable
                value={dimensions.minHeight || null}
                onChange={(val) => updateDimensions({ minHeight: val || undefined })}
                data={['auto', 'sm', 'md', 'lg', 'screen'].map((value) => ({
                  value,
                  label: MIN_HEIGHT_LABELS[value],
                }))}
              />
            </Group>
          </Accordion.Panel>
        </Accordion.Item>
      )}

      {showDimensions && (
        <Accordion.Item value="alignment">
          <Accordion.Control>
            <Text size="sm" fw={600}>
              Alignment
            </Text>
          </Accordion.Control>
          <Accordion.Panel>
            <GroupReset
              label="Alignment"
              onReset={onResetGroup ? () => onResetGroup('alignment') : undefined}
            />
            <SegmentedControl
              size="sm"
              fullWidth
              value={dimensions.align || 'left'}
              onChange={(val) => updateDimensions({ align: val as TextAlign })}
              data={[
                { label: <AlignLeft size={15} />, value: 'left' },
                { label: <AlignCenter size={15} />, value: 'center' },
                { label: <AlignRight size={15} />, value: 'right' },
              ]}
            />
          </Accordion.Panel>
        </Accordion.Item>
      )}
    </Accordion>
  )
}
