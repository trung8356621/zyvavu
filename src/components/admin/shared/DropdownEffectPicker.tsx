'use client'

import React, { useState } from 'react'
import {
  ActionIcon,
  Badge,
  Box,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core'
import { Check, Play, Sparkles } from 'lucide-react'

import {
  DROPDOWN_EFFECTS,
  type DropdownEffectId,
  type ItemDropdownEffectId,
  resolveDropdownEffect,
} from './dropdownEffects'

export type DropdownEffectPickerProps = {
  value?: ItemDropdownEffectId
  onChange: (value: ItemDropdownEffectId) => void
  allowInherit?: boolean
  menuDefault?: DropdownEffectId
  disabled?: boolean
}

export function DropdownEffectPicker({
  value = 'inherit',
  onChange,
  allowInherit = false,
  menuDefault = 'fade',
  disabled = false,
}: DropdownEffectPickerProps) {
  // Key state to replay CSS animations on demand
  const [animationTick, setAnimationTick] = useState<number>(0)
  const [previewingId, setPreviewingId] = useState<DropdownEffectId | null>(null)

  const effectiveActiveEffect = allowInherit
    ? resolveDropdownEffect(value, menuDefault)
    : (value as DropdownEffectId) || 'fade'

  const activeForPreview = previewingId || effectiveActiveEffect

  const handleCardClick = (targetVal: ItemDropdownEffectId) => {
    if (disabled) return
    onChange(targetVal)
    const resolved = allowInherit ? resolveDropdownEffect(targetVal, menuDefault) : (targetVal as DropdownEffectId)
    setPreviewingId(resolved)
    setAnimationTick((prev) => prev + 1)
  }

  const handleReplay = (e: React.MouseEvent, effectId: DropdownEffectId) => {
    e.stopPropagation()
    setPreviewingId(effectId)
    setAnimationTick((prev) => prev + 1)
  }

  return (
    <Stack gap="xs" className="zyvavu-dropdown-effect-picker">
      <style jsx global>{`
        @keyframes zyvavuEffectFade {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
        @keyframes zyvavuEffectSlideDown {
          0% {
            opacity: 0;
            transform: translateY(-8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .zyvavu-preview-box {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      <SimpleGrid cols={{ base: 1, sm: allowInherit ? 4 : 3 }} spacing="xs">
        {allowInherit && (
          <Card
            key="inherit"
            withBorder
            p="xs"
            radius="sm"
            onClick={() => handleCardClick('inherit')}
            style={{
              cursor: disabled ? 'not-allowed' : 'pointer',
              borderColor:
                value === 'inherit' ? 'var(--mantine-color-teal-6, #0e6b66)' : undefined,
              backgroundColor:
                value === 'inherit' ? 'var(--mantine-color-teal-0, #f0fdf9)' : undefined,
              transition: 'all 150ms ease',
            }}
          >
            <Stack gap={4}>
              <Group justify="space-between" wrap="nowrap">
                <Text size="xs" fw={600} c={value === 'inherit' ? '#0e6b66' : undefined}>
                  Inherit Default
                </Text>
                {value === 'inherit' && (
                  <Badge size="xs" color="#0e6b66" variant="filled" p={4} circle>
                    <Check size={10} />
                  </Badge>
                )}
              </Group>
              <Text size="11px" c="dimmed">
                Uses menu default (<strong>{DROPDOWN_EFFECTS[menuDefault]?.name || menuDefault}</strong>)
              </Text>
            </Stack>
          </Card>
        )}

        {(['none', 'fade', 'slide-down'] as DropdownEffectId[]).map((effectId) => {
          const isSelected = value === effectId
          const isCurrentPreview = activeForPreview === effectId
          const def = DROPDOWN_EFFECTS[effectId]

          let animStyle: React.CSSProperties = {}
          if (effectId === 'fade') {
            animStyle = {
              animation: `zyvavuEffectFade 250ms ease forwards`,
            }
          } else if (effectId === 'slide-down') {
            animStyle = {
              animation: `zyvavuEffectSlideDown 250ms cubic-bezier(0.16, 1, 0.3, 1) forwards`,
            }
          }

          return (
            <Card
              key={effectId}
              withBorder
              p="xs"
              radius="sm"
              onClick={() => handleCardClick(effectId)}
              style={{
                cursor: disabled ? 'not-allowed' : 'pointer',
                borderColor: isSelected
                  ? 'var(--mantine-color-teal-6, #0e6b66)'
                  : undefined,
                backgroundColor: isSelected
                  ? 'var(--mantine-color-teal-0, #f0fdf9)'
                  : undefined,
                transition: 'all 150ms ease',
              }}
            >
              <Stack gap={6}>
                <Group justify="space-between" wrap="nowrap">
                  <Group gap={6}>
                    <Text size="xs" fw={600} c={isSelected ? '#0e6b66' : undefined}>
                      {def.name}
                    </Text>
                    {menuDefault === effectId && !allowInherit && (
                      <Badge size="xs" color="gray" variant="light">
                        Default
                      </Badge>
                    )}
                  </Group>

                  <Group gap={4}>
                    <Tooltip label="Replay animation" position="top" withArrow>
                      <ActionIcon
                        size="xs"
                        variant="subtle"
                        color="gray"
                        onClick={(e) => handleReplay(e, effectId)}
                        aria-label={`Preview ${def.name} animation`}
                      >
                        <Play size={10} />
                      </ActionIcon>
                    </Tooltip>
                    {isSelected && (
                      <Badge size="xs" color="#0e6b66" variant="filled" p={4} circle>
                        <Check size={10} />
                      </Badge>
                    )}
                  </Group>
                </Group>

                {/* Animated Mini Preview Canvas */}
                <Box
                  p={6}
                  style={{
                    backgroundColor: 'var(--zyvavu-surface-subtle, #f8f9fa)',
                    borderRadius: 4,
                    border: '1px dashed var(--mantine-color-gray-3, #dee2e6)',
                    height: 48,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    key={`${effectId}-${animationTick}`}
                    className="zyvavu-preview-box"
                    style={{
                      width: '80%',
                      padding: '4px 8px',
                      backgroundColor: '#ffffff',
                      borderRadius: 4,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                      border: '1px solid #e9ecef',
                      textAlign: 'center',
                      fontSize: '10px',
                      color: '#495057',
                      ...animStyle,
                    }}
                  >
                    <Group gap={4} justify="center">
                      <Sparkles size={9} color="#0e6b66" />
                      <span>{def.name}</span>
                    </Group>
                  </Box>
                </Box>

                <Text size="11px" c="dimmed" lineClamp={2}>
                  {def.description}
                </Text>
              </Stack>
            </Card>
          )
        })}
      </SimpleGrid>
    </Stack>
  )
}
