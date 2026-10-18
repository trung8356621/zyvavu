'use client'
import React, { useMemo, useState } from 'react'
import { Alert, Badge, Button, Group, Paper, Select, Stack, Text, TextInput } from '@mantine/core'
import { createUsePuck } from '@puckeditor/core'
import { Columns3, Image, LayoutGrid, MousePointer2, Type, Layers } from 'lucide-react'
import type { TemplateContext, ThemeConfig } from '@/lib/theme-engine/types'
import { getWidgetManifest } from '@/lib/theme-engine/widget-registry-manifests'
import { WidgetStyleSurface } from '@/lib/style-engine/WidgetStyleSurface'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import {
  getWidgetDesignPatterns,
  instantiatePattern,
  insertWidgetPattern,
  applyWidgetPattern,
  validatePatternOperation,
  walkPatternDocument,
  type WidgetDesignPattern,
} from '@/lib/theme-engine/widget-patterns'
import styles from './WidgetPatternLibrary.module.css'
const usePuck = createUsePuck()
function categoryFor(type: string) {
  if (type === 'Section') return 'sections'
  if (
    [
      'PostTitle',
      'PostContent',
      'PostMeta',
      'TextBlock',
      'ItemTitle',
      'ItemExcerpt',
      'HeaderTopBarText',
    ].includes(type)
  )
    return 'text'
  if (['FeaturedMedia', 'ItemImage'].includes(type)) return 'images'
  if (['HeaderAction', 'ItemLink'].includes(type)) return 'buttons'
  return getWidgetManifest(type)?.category || 'general'
}
const ICONS: Record<string, React.ElementType> = {
  sections: Layers,
  text: Type,
  images: Image,
  buttons: MousePointer2,
  layout: Columns3,
}
function PatternPreview({ pattern }: { pattern: WidgetDesignPattern }) {
  const textStyle = resolveWidgetStyles({ typography: pattern.props.style?.typography })
  return (
    <div className={styles.preview} aria-hidden="true">
      <WidgetStyleSurface style={pattern.props.style}>
        {pattern.preview.kind === 'columns' ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: pattern.props.distribution === '2:1' ? '2fr 1fr' : '1fr 1fr',
              gap: 'var(--mantine-spacing-xs)',
            }}
          >
            {['Feature', 'Aside'].map((text) => (
              <div
                key={text}
                style={{
                  background: 'var(--zyvavu-theme-surface, white)',
                  border: '1px solid var(--zyvavu-theme-border, #ddd)',
                  padding: 'var(--mantine-spacing-sm)',
                }}
              >
                {text}
              </div>
            ))}
          </div>
        ) : (
          <div>
            <div
              style={{
                ...textStyle,
                fontSize: pattern.preview.kind === 'text' ? '1.1rem' : '0.9rem',
              }}
            >
              {pattern.preview.label}
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
              Content follows your published theme.
            </div>
          </div>
        )}
      </WidgetStyleSurface>
    </div>
  )
}
export function WidgetPatternLibrary({
  context,
  themeConfig,
  beforeOperation,
}: {
  context?: string
  themeConfig?: ThemeConfig
  beforeOperation: () => boolean
}) {
  const config = usePuck((state) => state.config)
  const data = usePuck((state) => state.appState.data)
  const selected = usePuck((state) => state.selectedItem)
  const dispatch = usePuck((state) => state.dispatch)
  const getPermissions = usePuck((state) => state.getPermissions)
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [destination, setDestination] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const types = Object.keys(config.components)
  const categories: string[] = [...new Set(types.map(categoryFor))]
  const active = categories.includes(category) ? category : categories[0]
  const matches = (text: string) => text.toLowerCase().includes(search.toLowerCase())
  const patterns = getWidgetDesignPatterns().filter(
    (pattern) =>
      pattern.category === active && types.includes(pattern.widgetType) && matches(pattern.name),
  )
  const slots = selected
    ? Object.entries(config.components[selected.type]?.fields || {})
        .filter(([, field]) => field.type === 'slot')
        .map(([slot]) => slot)
    : []
  const effectiveDestination = slots.includes(destination || '') ? destination : slots[0] || null
  const tokenStyle = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(themeConfig?.tokens.colors || {})
          .filter(([, value]) => typeof value === 'string')
          .map(([key, value]) => [`--zyvavu-theme-${key}`, value]),
      ) as React.CSSProperties,
    [themeConfig],
  )
  const run = (pattern: WidgetDesignPattern, apply = false) => {
    setMessage(null)
    setSuccess(null)
    if (!context) {
      setMessage('Pattern insertion is available in Theme Builder templates.')
      return
    }
    if (!beforeOperation()) {
      setMessage('Apply or cancel the active style draft first.')
      return
    }
    try {
      if (apply && (!selected || !getPermissions({ item: selected }).edit))
        throw new Error('The selected widget cannot be edited')
      if (!apply && !getPermissions({ type: pattern.widgetType }).insert)
        throw new Error('This widget cannot be inserted')
      if (
        !apply &&
        selected &&
        effectiveDestination &&
        (!getPermissions({ item: selected }).edit || selected.props.lock?.canEditProps === false)
      )
        throw new Error('The selected container is locked')
      const newId = () => crypto.randomUUID()
      const item = apply ? undefined : instantiatePattern(pattern, config, newId)
      if (item) {
        walkPatternDocument({ root: data.root, content: [item] }, config, (node) => {
          if (!getPermissions({ type: node.type }).insert)
            throw new Error('A nested widget cannot be inserted')
        })
        if (
          !effectiveDestination &&
          item.type !== 'Section' &&
          config.components.Section &&
          !getPermissions({ type: 'Section' }).insert
        )
          throw new Error('Section insertion is not permitted')
      }
      const next = apply
        ? applyWidgetPattern(data, pattern, selected!.props.id, config)
        : insertWidgetPattern(
            data,
            item,
            context as TemplateContext,
            config,
            selected && effectiveDestination && item.type !== 'Section'
              ? { ownerId: selected.props.id, slot: effectiveDestination }
              : undefined,
            newId,
          )
      validatePatternOperation(next, data, context as TemplateContext, config)
      dispatch({ type: 'setData', data: next })
      setSuccess(
        apply
          ? 'Pattern applied. Undo restores the previous design.'
          : 'Widget inserted. Undo removes this insertion.',
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Pattern could not be applied')
    }
  }
  const defaultPattern = (type: string): WidgetDesignPattern => ({
    id: `default:${type}`,
    version: 1,
    compatibility: { builderVersion: 1, widgetTypes: [type] },
    widgetType: type,
    name: config.components[type].label || type,
    category: 'text',
    preview: { kind: 'text', label: type },
    props: {},
    tokenReferences: [],
  })
  return (
    <div className={styles.library} style={tokenStyle} data-widget-pattern-library>
      <TextInput
        aria-label="Search widgets and patterns"
        placeholder="Search widgets and patterns"
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
      />
      {message && (
        <Alert color="red" role="alert">
          {message}
        </Alert>
      )}
      {success && <Alert role="status">{success}</Alert>}
      {slots.length > 0 && (
        <Select
          label="Insert into selected container"
          value={effectiveDestination}
          data={slots}
          onChange={setDestination}
        />
      )}
      <div className={styles.columns}>
        <nav className={styles.categories} aria-label="Widget categories">
          {categories.map((name) => {
            const Icon = ICONS[name] || LayoutGrid
            return (
              <Button
                key={name}
                fullWidth
                variant={active === name ? 'light' : 'subtle'}
                aria-pressed={active === name}
                mb="xs"
                h="auto"
                py="sm"
                onClick={() => setCategory(name)}
              >
                <span className={styles.categoryContent}>
                  <Icon size={20} />
                  <span>{name}</span>
                </span>
              </Button>
            )
          })}
        </nav>
        <div className={styles.results}>
          <Stack gap="sm">
            {patterns.length > 0 && <Text fw={600}>Design patterns</Text>}
            {patterns.map((pattern) => (
              <Paper key={pattern.id} withBorder p="sm">
                <Stack gap="xs">
                  <PatternPreview pattern={pattern} />
                  <Text fw={600} size="sm">
                    {pattern.name}
                  </Text>
                  <Badge variant="light">{pattern.widgetType}</Badge>
                  <Group gap="xs">
                    <Button size="sm" onClick={() => run(pattern)}>
                      Insert
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      disabled={
                        !selected ||
                        !pattern.compatibility.widgetTypes.includes(selected.type) ||
                        selected.props.lock?.canEditProps === false
                      }
                      onClick={() => run(pattern, true)}
                    >
                      Apply to selected
                    </Button>
                  </Group>
                </Stack>
              </Paper>
            ))}
            <Text fw={600}>Widgets</Text>
            {types
              .filter(
                (type) =>
                  categoryFor(type) === active && matches(config.components[type].label || type),
              )
              .map((type) => (
                <Button
                  key={type}
                  variant="default"
                  fullWidth
                  onClick={() => run(defaultPattern(type))}
                >
                  Add {config.components[type].label || type}
                </Button>
              ))}
            {!patterns.length &&
              !types.some(
                (type) =>
                  categoryFor(type) === active && matches(config.components[type].label || type),
              ) && <Text c="dimmed">No matching widgets or patterns.</Text>}
            <Text size="xs" c="dimmed">
              Click to insert. Select a container to choose its slot; otherwise a page widget is
              added inside a new Section.
            </Text>
          </Stack>
        </div>
      </div>
    </div>
  )
}
