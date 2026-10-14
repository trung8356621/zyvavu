'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useField } from '@payloadcms/ui'
import {
  Alert,
  Badge,
  Button,
  Code,
  Group,
  Paper,
  Radio,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { AlertCircle, CheckCircle2, Globe, Sparkles } from 'lucide-react'

import {
  DEFAULT_POST_PERMALINK_STRUCTURE,
  normalizePermalinkPattern,
  PERMALINK_PRESETS,
  resolvePostPath,
  SUPPORTED_TOKENS,
  validatePermalinkPattern,
} from '@/lib/permalinks'

export function PermalinksField({ path = 'postPermalinkStructure' }: { path?: string }) {
  const { value, setValue, errorMessage, showError } = useField<string>({ path })
  const customInputRef = useRef<HTMLInputElement>(null)

  const currentPattern = typeof value === 'string' && value.trim() ? value : DEFAULT_POST_PERMALINK_STRUCTURE

  // Determine selected preset
  const activePresetKey = useMemo<'posts' | 'postname' | 'postname-html' | 'custom'>(() => {
    const normalized = normalizePermalinkPattern(currentPattern)
    if (normalized === '/posts/%postname%') return 'posts'
    if (normalized === '/%postname%') return 'postname'
    if (normalized === '/%postname%.html') return 'postname-html'
    return 'custom'
  }, [currentPattern])

  const [selectedRadio, setSelectedRadio] = useState<string>(activePresetKey)
  const [customInputValue, setCustomInputValue] = useState<string>(
    activePresetKey === 'custom' ? currentPattern : DEFAULT_POST_PERMALINK_STRUCTURE,
  )

  useEffect(() => {
    setSelectedRadio(activePresetKey)
    if (activePresetKey === 'custom') {
      setCustomInputValue(currentPattern)
    }
  }, [activePresetKey, currentPattern])

  const validationError = useMemo(() => {
    return validatePermalinkPattern(currentPattern)
  }, [currentPattern])

  const liveResolvedPreview = useMemo(() => {
    try {
      if (validationError) return null
      return resolvePostPath(currentPattern, 'sample-post')
    } catch {
      return null
    }
  }, [currentPattern, validationError])

  const handleRadioChange = (newVal: string) => {
    setSelectedRadio(newVal)
    if (newVal === 'posts') {
      setValue('/posts/%postname%')
    } else if (newVal === 'postname') {
      setValue('/%postname%')
    } else if (newVal === 'postname-html') {
      setValue('/%postname%.html')
    } else if (newVal === 'custom') {
      const patternToSet = customInputValue.trim() || DEFAULT_POST_PERMALINK_STRUCTURE
      setValue(patternToSet)
      setTimeout(() => customInputRef.current?.focus(), 50)
    }
  }

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value
    setCustomInputValue(rawVal)
    setSelectedRadio('custom')
    setValue(rawVal)
  }

  const handleInsertToken = (token: string) => {
    const input = customInputRef.current
    if (!input) {
      const nextVal = (customInputValue || '') + token
      setCustomInputValue(nextVal)
      setSelectedRadio('custom')
      setValue(nextVal)
      return
    }

    const start = input.selectionStart ?? input.value.length
    const end = input.selectionEnd ?? input.value.length
    const current = input.value
    const nextVal = current.substring(0, start) + token + current.substring(end)

    setCustomInputValue(nextVal)
    setSelectedRadio('custom')
    setValue(nextVal)

    setTimeout(() => {
      input.focus()
      const newPos = start + token.length
      input.setSelectionRange(newPos, newPos)
    }, 0)
  }

  return (
    <Stack gap="md" style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
      <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff' }}>
        <Stack gap="lg">
          <div>
            <Text size="sm" fw={600} mb={4}>
              Post URL Structure
            </Text>
            <Text size="xs" c="dimmed">
              Choose the URL format for newly published posts. Existing published posts retain their canonical URLs and redirect histories.
            </Text>
          </div>

          <Radio.Group value={selectedRadio} onChange={handleRadioChange}>
            <Stack gap="md">
              {PERMALINK_PRESETS.map((preset) => {
                if (preset.key === 'custom') {
                  return (
                    <div key={preset.key}>
                      <Radio
                        value="custom"
                        label={
                          <Text size="sm" fw={600}>
                            Custom Structure
                          </Text>
                        }
                      />
                      <Stack gap="xs" mt="xs" ml={28}>
                        <TextInput
                          ref={customInputRef}
                          size="sm"
                          value={customInputValue}
                          onChange={handleCustomInputChange}
                          onFocus={() => {
                            if (selectedRadio !== 'custom') {
                              setSelectedRadio('custom')
                              setValue(customInputValue)
                            }
                          }}
                          placeholder="/%postname%.html or /tin-tuc/%postname%.html"
                          style={{ fontFamily: 'monospace', maxWidth: 480 }}
                          error={selectedRadio === 'custom' ? validationError : undefined}
                        />

                        <Group gap="xs" align="center">
                          <Text size="xs" c="dimmed">
                            Available tokens:
                          </Text>
                          {SUPPORTED_TOKENS.map((token) => (
                            <Button
                              key={token}
                              size="xs"
                              variant="light"
                              color="teal"
                              onClick={() => handleInsertToken(token)}
                              leftSection={<Sparkles size={12} />}
                              style={{ fontFamily: 'monospace', height: 24, padding: '0 8px' }}
                            >
                              {token}
                            </Button>
                          ))}
                        </Group>

                        <Text size="xs" c="dimmed">
                          Examples: <Code>/%postname%.html</Code>, <Code>/posts/%postname%</Code>, <Code>/tin-tuc/%postname%.html</Code>
                        </Text>
                      </Stack>
                    </div>
                  )
                }

                return (
                  <div key={preset.key}>
                    <Radio
                      value={preset.key}
                      label={
                        <div>
                          <Text size="sm" fw={600}>
                            {preset.label}
                          </Text>
                          <Group gap="xs" mt={2} align="center">
                            <Globe size={13} color="#868e96" />
                            <Code style={{ fontSize: '0.8rem' }}>{preset.example}</Code>
                          </Group>
                        </div>
                      }
                    />
                  </div>
                )
              })}
            </Stack>
          </Radio.Group>

          {/* Live Resolved URL Preview Box */}
          <Paper p="sm" radius="sm" withBorder style={{ backgroundColor: '#f8faf9' }}>
            <Stack gap="xs">
              <Group justify="space-between" align="center">
                <Group gap="xs">
                  <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                    Live Resolved URL Preview
                  </Text>
                  {validationError ? (
                    <Badge color="red" size="xs" variant="light" leftSection={<AlertCircle size={10} />}>
                      Invalid Pattern
                    </Badge>
                  ) : (
                    <Badge color="teal" size="xs" variant="light" leftSection={<CheckCircle2 size={10} />}>
                      Valid Contract
                    </Badge>
                  )}
                </Group>
                <Badge size="xs" variant="outline" color="gray">
                  sample-post
                </Badge>
              </Group>

              {validationError ? (
                <Alert color="red" variant="light" p="xs" icon={<AlertCircle size={16} />}>
                  <Text size="xs">{validationError}</Text>
                </Alert>
              ) : (
                <Text size="sm" fw={600} style={{ fontFamily: 'monospace', color: '#12b886' }}>
                  https://zyvavu.test{liveResolvedPreview}
                </Text>
              )}

              <Text size="xs" c="dimmed">
                New posts will be published at this path. Pages remain extensionless (<Code>/%slug%</Code>) and Homepage stays at <Code>/</Code>.
              </Text>
            </Stack>
          </Paper>

          {showError && errorMessage && (
            <Text size="xs" c="red">
              {errorMessage}
            </Text>
          )}
        </Stack>
      </Paper>
    </Stack>
  )
}
