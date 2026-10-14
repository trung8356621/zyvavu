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
  SegmentedControl,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { AlertCircle, CheckCircle2, Clock, Globe, Sparkles } from 'lucide-react'

import {
  DEFAULT_CATEGORY_PERMALINK_STRUCTURE,
  DEFAULT_PAGE_PERMALINK_STRUCTURE,
  DEFAULT_POST_PERMALINK_STRUCTURE,
  DEFAULT_TAG_PERMALINK_STRUCTURE,
  insertTokenAtCursor,
  normalizePermalinkPattern,
  PermalinkResourceType,
  RESOURCE_CONFIGS,
  ResourcePermalinkConfig,
  resolveResourcePath,
  validatePermalinkPattern,
} from '@/lib/permalinks'

interface SingleResourceEditorProps {
  config: ResourcePermalinkConfig
  value?: string
  onChange: (val: string) => void
  errorMessage?: string
  showError?: boolean
}

function SingleResourceEditor({
  config,
  value,
  onChange,
  errorMessage,
  showError,
}: SingleResourceEditorProps) {
  const customInputRef = useRef<HTMLInputElement>(null)

  const currentPattern = typeof value === 'string' && value.trim() ? value : config.defaultStructure

  // Determine active preset key
  const activePresetKey = useMemo<string>(() => {
    const normalized = normalizePermalinkPattern(currentPattern, config.resource)
    const match = config.presets.find(
      (p) => p.key !== 'custom' && p.pattern === normalized,
    )
    return match ? match.key : 'custom'
  }, [currentPattern, config])

  const [selectedRadio, setSelectedRadio] = useState<string>(activePresetKey)
  const [customInputValue, setCustomInputValue] = useState<string>(
    activePresetKey === 'custom' ? currentPattern : config.defaultStructure,
  )

  useEffect(() => {
    setSelectedRadio(activePresetKey)
    if (activePresetKey === 'custom') {
      setCustomInputValue(currentPattern)
    }
  }, [activePresetKey, currentPattern])

  const validationError = useMemo(() => {
    return validatePermalinkPattern(currentPattern, config.resource)
  }, [currentPattern, config.resource])

  const liveResolvedPreview = useMemo(() => {
    try {
      if (validationError) return null
      return resolveResourcePath(currentPattern, config.sampleSlug, config.resource)
    } catch {
      return null
    }
  }, [currentPattern, validationError, config])

  const handleRadioChange = (newVal: string) => {
    setSelectedRadio(newVal)
    if (newVal === 'custom') {
      const patternToSet = customInputValue.trim() || config.defaultStructure
      onChange(patternToSet)
      setTimeout(() => customInputRef.current?.focus(), 50)
    } else {
      const preset = config.presets.find((p) => p.key === newVal)
      if (preset) {
        onChange(preset.pattern)
      }
    }
  }

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value
    setCustomInputValue(rawVal)
    setSelectedRadio('custom')
    onChange(rawVal)
  }

  const handleInsertToken = (token: string) => {
    const input = customInputRef.current
    const res = insertTokenAtCursor(
      customInputValue || '',
      token,
      input?.selectionStart,
      input?.selectionEnd,
    )
    setCustomInputValue(res.newText)
    setSelectedRadio('custom')
    onChange(res.newText)

    if (input) {
      setTimeout(() => {
        input.focus()
        input.setSelectionRange(res.newCursorPos, res.newCursorPos)
      }, 0)
    }
  }

  return (
    <Stack gap="lg">
      <div>
        <Group justify="space-between" align="center" mb={4}>
          <Text size="sm" fw={600}>
            {config.label} URL Structure
          </Text>
          {config.isFunctional ? (
            <Badge size="xs" variant="light" color="teal">
              Active Routing
            </Badge>
          ) : (
            <Badge size="xs" variant="light" color="yellow" leftSection={<Clock size={10} />}>
              Routing Pending
            </Badge>
          )}
        </Group>
        <Text size="xs" c="dimmed">
          {config.description}
        </Text>
      </div>

      {!config.isFunctional && config.statusNote && (
        <Alert color="yellow" variant="light" p="xs" icon={<Clock size={16} />}>
          <Text size="xs">{config.statusNote}</Text>
        </Alert>
      )}

      <Radio.Group value={selectedRadio} onChange={handleRadioChange}>
        <Stack gap="md">
          {config.presets.map((preset) => {
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
                          onChange(customInputValue)
                        }
                      }}
                      placeholder={`/${config.token} or /prefix/${config.token}`}
                      style={{ fontFamily: 'monospace', maxWidth: 480 }}
                      error={selectedRadio === 'custom' ? validationError : undefined}
                    />

                    <Group gap="xs" align="center">
                      <Text size="xs" c="dimmed">
                        Available tokens:
                      </Text>
                      {config.supportedTokens.map((token) => (
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
                      Insert token: {config.supportedTokens.map((t) => <Code key={t}>{t}</Code>)}
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
              ) : config.isFunctional ? (
                <Badge color="teal" size="xs" variant="light" leftSection={<CheckCircle2 size={10} />}>
                  Valid Contract
                </Badge>
              ) : (
                <Badge color="yellow" size="xs" variant="light" leftSection={<Clock size={10} />}>
                  Pending Archive Routing
                </Badge>
              )}
            </Group>
            <Badge size="xs" variant="outline" color="gray">
              {config.sampleSlug}
            </Badge>
          </Group>

          {validationError ? (
            <Alert color="red" variant="light" p="xs" icon={<AlertCircle size={16} />}>
              <Text size="xs">{validationError}</Text>
            </Alert>
          ) : (
            <Text
              size="sm"
              fw={600}
              style={{
                fontFamily: 'monospace',
                color: config.isFunctional ? '#12b886' : '#f59f00',
              }}
            >
              https://zyvavu.test{liveResolvedPreview}
            </Text>
          )}

          <Text size="xs" c="dimmed">
            {config.resource === 'posts' && (
              <>New posts will be published at this path. Existing published posts retain their canonical URLs.</>
            )}
            {config.resource === 'pages' && (
              <>New pages will be published at this path. Homepage stays at <Code>/</Code>.</>
            )}
            {config.resource === 'categories' && (
              <>Category archive routes will use this pattern once taxonomy routing is enabled.</>
            )}
            {config.resource === 'tags' && (
              <>Tag archive routes will use this pattern once taxonomy routing is enabled.</>
            )}
          </Text>
        </Stack>
      </Paper>

      {showError && errorMessage && (
        <Text size="xs" c="red">
          {errorMessage}
        </Text>
      )}
    </Stack>
  )
}

export function PermalinksField({ path = 'postPermalinkStructure' }: { path?: string }) {
  // Bind all 4 fields to form state unconditionally at top-level
  const postField = useField<string>({ path: 'postPermalinkStructure' })
  const pageField = useField<string>({ path: 'pagePermalinkStructure' })
  const categoryField = useField<string>({ path: 'categoryPermalinkStructure' })
  const tagField = useField<string>({ path: 'tagPermalinkStructure' })

  const [selectedResource, setSelectedResource] = useState<PermalinkResourceType>('posts')

  // Prime default values if fields are uninitialized in form state
  useEffect(() => {
    if (pageField.value === undefined || pageField.value === null) {
      pageField.setValue(DEFAULT_PAGE_PERMALINK_STRUCTURE)
    }
    if (categoryField.value === undefined || categoryField.value === null) {
      categoryField.setValue(DEFAULT_CATEGORY_PERMALINK_STRUCTURE)
    }
    if (tagField.value === undefined || tagField.value === null) {
      tagField.setValue(DEFAULT_TAG_PERMALINK_STRUCTURE)
    }
  }, [])

  const currentField = useMemo(() => {
    switch (selectedResource) {
      case 'pages':
        return pageField
      case 'categories':
        return categoryField
      case 'tags':
        return tagField
      case 'posts':
      default:
        return postField
    }
  }, [selectedResource, postField, pageField, categoryField, tagField])

  const resourceConfig = RESOURCE_CONFIGS[selectedResource]

  return (
    <Stack gap="md" style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
      <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff' }}>
        <Stack gap="lg">
          <div>
            <Text size="sm" fw={600} mb="xs">
              Configure URL structure for:
            </Text>
            <SegmentedControl
              value={selectedResource}
              onChange={(val) => setSelectedResource(val as PermalinkResourceType)}
              data={[
                { label: 'Posts', value: 'posts' },
                { label: 'Pages', value: 'pages' },
                { label: 'Categories', value: 'categories' },
                { label: 'Tags', value: 'tags' },
              ]}
              size="sm"
              color="teal"
            />
          </div>

          <SingleResourceEditor
            key={selectedResource}
            config={resourceConfig}
            value={currentField.value}
            onChange={currentField.setValue}
            errorMessage={currentField.errorMessage}
            showError={currentField.showError}
          />
        </Stack>
      </Paper>
    </Stack>
  )
}
