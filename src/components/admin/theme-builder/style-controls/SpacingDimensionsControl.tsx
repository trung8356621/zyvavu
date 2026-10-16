'use client'

import React from 'react'
import {
  Box,
  Divider,
  Group,
  SegmentedControl,
  Select,
  Stack,
  Text,
} from '@mantine/core'
import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react'
import type {
  DimensionsConfig,
  SpacingConfig,
  TextAlign,
} from '@/lib/style-engine/types'

export interface SpacingDimensionsControlProps {
  spacing?: SpacingConfig
  dimensions?: DimensionsConfig
  showDimensions?: boolean
  onChangeSpacing: (spacing: SpacingConfig) => void
  onChangeDimensions: (dimensions: DimensionsConfig) => void
}

export function SpacingDimensionsControl({
  spacing = {},
  dimensions = {},
  showDimensions = true,
  onChangeSpacing,
  onChangeDimensions,
}: SpacingDimensionsControlProps) {
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
    <Stack gap="xs">
      <Text size="xs" fw={700} c="dimmed" style={{ fontSize: 11 }}>
        Spacing & Layout Geometry
      </Text>

      <Group grow gap="xs">
        <Select
          size="xs"
          label="Padding"
          placeholder="Select spacing"
          value={spacing.padding?.token || 'md'}
          onChange={(val) =>
            updateSpacing({
              padding: { ...spacing.padding, token: val || 'md' },
            })
          }
          data={[
            { value: 'none', label: 'None (0px)' },
            { value: 'xs', label: 'Extra Small (xs)' },
            { value: 'sm', label: 'Small (sm)' },
            { value: 'md', label: 'Medium (md)' },
            { value: 'lg', label: 'Large (lg)' },
            { value: 'xl', label: 'Extra Large (xl)' },
          ]}
        />

        <Select
          size="xs"
          label="Margin"
          placeholder="Select margin"
          value={spacing.margin?.token || 'none'}
          onChange={(val) =>
            updateSpacing({
              margin: { ...spacing.margin, token: val || 'none' },
            })
          }
          data={[
            { value: 'none', label: 'None (0px)' },
            { value: 'xs', label: 'Extra Small (xs)' },
            { value: 'sm', label: 'Small (sm)' },
            { value: 'md', label: 'Medium (md)' },
            { value: 'lg', label: 'Large (lg)' },
          ]}
        />
      </Group>

      {showDimensions && (
        <>
          <Divider my={2} />

          <Group grow gap="xs">
            <Select
              size="xs"
              label="Container Width"
              value={dimensions.containerWidth || 'containerWidth'}
              onChange={(val) => updateDimensions({ containerWidth: val || 'containerWidth' })}
              data={[
                { value: 'containerWidth', label: 'Standard Container' },
                { value: 'narrowWidth', label: 'Narrow Container' },
                { value: 'wideWidth', label: 'Wide Container' },
                { value: 'full', label: 'Full Width' },
              ]}
            />

            <Select
              size="xs"
              label="Minimum Height"
              value={dimensions.minHeight || 'auto'}
              onChange={(val) => updateDimensions({ minHeight: val || 'auto' })}
              data={[
                { value: 'auto', label: 'Auto (Content Fit)' },
                { value: 'sm', label: 'Small (200px)' },
                { value: 'md', label: 'Medium (400px)' },
                { value: 'lg', label: 'Large (600px)' },
                { value: 'screen', label: 'Full Viewport (100vh)' },
              ]}
            />
          </Group>

          <Box>
            <Text size="xs" fw={500} mb={4} style={{ fontSize: 11 }}>
              Content Alignment
            </Text>
            <SegmentedControl
              size="xs"
              fullWidth
              value={dimensions.align || 'left'}
              onChange={(val) => updateDimensions({ align: val as TextAlign })}
              data={[
                { label: <AlignLeft size={13} />, value: 'left' },
                { label: <AlignCenter size={13} />, value: 'center' },
                { label: <AlignRight size={13} />, value: 'right' },
              ]}
            />
          </Box>
        </>
      )}
    </Stack>
  )
}
