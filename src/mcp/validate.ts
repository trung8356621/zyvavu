import { sanitizeHref } from '@/components/builder/inline-edit/content-model'
import { isEmailSyntacticallyValid, isPhoneSyntacticallyValid } from '@/components/builder/inline-edit/link-editor-model'
import { validateUniversalStyle } from '@/lib/style-engine/validation'
import { isLegacyItemWidget } from '@/lib/theme-engine/legacy-item-widgets'
import { assertJSON, collectPatternTokens, PATTERN_SLOTS } from '@/lib/theme-engine/patterns/json'
import type { TemplateContext, ThemeConfig } from '@/lib/theme-engine/types'
import { validateThemeTemplateDocument } from '@/lib/theme-engine/validation'
import { validateFixedBinding } from '@/lib/theme-engine/widget-contracts'
import { contexts, getDomains, layoutPolicy, widgetContract } from './catalog'
import { boolean, checkShape, fields, list, number, object, options, string, type Issue, type RecordValue } from './shape'
import { styleShapes } from './style'

export const documentShape = fields({
  version: options(1), template: options(...contexts),
  root: fields({ props: fields({
    title: string,
    pageSettings: fields({
      background: fields({
        type: options('theme', 'palette', 'image'), token: string, imageUrl: string,
        imagePosition: options('center', 'top', 'bottom', 'left', 'right'),
        imageSize: options('cover', 'contain', 'auto'),
        imageRepeat: options('no-repeat', 'repeat', 'repeat-x', 'repeat-y'),
      }),
      text: fields({ typography: string, colorToken: string }),
      layout: fields({
        inheritTheme: boolean, containerWidth: options('inherit', 'containerWidth', 'narrowWidth', 'wideWidth', 'full'),
        spacing: options('inherit', 'none', 'xs', 'sm', 'md', 'lg', 'xl'),
        alignment: options('inherit', 'left', 'center', 'right'), isOverride: boolean,
      }),
    }),
  }) }),
  content: list({ type: 'object' }), zones: { type: 'object' },
  metadata: fields({ roleContract: options(1) }), updatedAt: string,
}, ['version', 'template', 'root', 'content'])

const nodeShape = fields({ type: string, props: { type: 'object' } }, ['type', 'props'])
const lock = fields({ canDelete: boolean, canEditProps: boolean, canMove: boolean })
const idPattern = /^[a-z0-9][a-z0-9_.-]{0,127}$/i
const shapesByType = { string, number, boolean }
const columns = { '1': 1, 'equal-2': 2, '2:1': 2, '1:2': 2, '1:1:1': 3, '1:1:1:1': 4 }

function safeUrl(value: string, media: boolean) {
  if (value === '') return true
  if (value !== value.trim() || /[\u0000-\u0020\u007f\\]/.test(value) || !sanitizeHref(value)) return false
  if (!media && /^mailto:/i.test(value)) return isEmailSyntacticallyValid(value.slice(7).split('?')[0])
  if (!media && /^tel:/i.test(value)) return isPhoneSyntacticallyValid(value.slice(4))
  if (value.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(value)) {
    try {
      const url = new URL(value.startsWith('//') ? `https:${value}` : value)
      return ['https:', 'http:'].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password
    } catch {
      return false
    }
  }
  return !media || (!value.startsWith('#') && !value.startsWith('?'))
}

type LocatedNode = { type: string; props: RecordValue; path: string; parent?: string; slot?: string }

export function validateTemplate(document: unknown, context: TemplateContext, theme: ThemeConfig, includeSections = false) {
  const errors: Issue[] = []
  const warnings: Issue[] = []
  const add = (path: string, code: string, message: string) => errors.push({ path, code, message })
  const result = (sections?: unknown[]) => ({
    valid: errors.length === 0,
    errors,
    warnings,
    ...(sections ? { sections } : {}),
    unsupportedCapabilities: [...new Set(errors.filter((issue) => issue.code.startsWith('UNSUPPORTED')).map(({ path }) => path))],
  })
  try {
    assertJSON(document)
  } catch {
    add('$', 'UNSAFE_DOCUMENT', 'Use plain JSON within the nesting limit and omit runtime fields or unsafe URLs.')
    return result()
  }
  checkShape(document, documentShape, '$', errors)
  if (!object(document) || !Array.isArray(document.content)) return result()
  if (document.template !== context) add('$.template', 'CONTEXT_MISMATCH', 'Document and requested context must agree.')

  const policy = layoutPolicy(context)
  if (policy.availability === 'PARTIAL')
    warnings.push({ path: '$.template', code: 'CONTRACT_ONLY', message: 'Product rendering availability is outside this contract.' })

  function checkReferences(value: unknown, path: string, parentKey?: string) {
    if (Array.isArray(value)) {
      value.forEach((item, index) => checkReferences(item, `${path}[${index}]`, parentKey))
      return
    }
    if (!object(value)) return
    for (const [key, child] of Object.entries(value)) {
      const childPath = `${path}.${key}`
      if (typeof child === 'string') {
        if ((key === 'colorToken' || key === 'fallbackColorToken' ||
          (key === 'token' && ['stops', 'points', 'background'].includes(parentKey ?? ''))) &&
          !Object.hasOwn(theme.tokens.colors, child))
          add(childPath, 'UNKNOWN_COLOR_TOKEN', 'Select a color token from the chosen bundled theme.')
        if ((key === 'fontSize' || key === 'typography') &&
          (!Object.hasOwn(theme.tokens.typography, child) || !object(theme.tokens.typography[child])))
          add(childPath, 'UNKNOWN_TYPOGRAPHY_TOKEN', 'Select a typography preset from the chosen bundled theme.')
        if (/^(href|url|ctaUrl|src|posterUrl|fallbackImageUrl|imageUrl)$/i.test(key) &&
          !safeUrl(child, !['href', 'ctaUrl'].includes(key) && (key !== 'url' || ['image', 'video'].includes(parentKey ?? ''))))
          add(childPath, 'INVALID_DESTINATION', 'Use a valid URL or a supported link destination.')
      }
      if (/^(mediaId|posterMediaId)$/.test(key)) {
        const valid = typeof child === 'number' ? Number.isSafeInteger(child) && child > 0
          : typeof child === 'string' && idPattern.test(child)
        if (!valid) add(childPath, 'INVALID_MEDIA_ID', 'Use a positive integer or a non-empty identifier.')
      }
      checkReferences(child, childPath, key)
    }
  }

  function checkStyle(
    style: unknown,
    path: string,
    node: LocatedNode,
    domainsOverride?: ReturnType<typeof getDomains>,
  ) {
    const before = errors.length
    checkShape(style, fields(styleShapes), path, errors)
    if (!object(style)) return
    const domains =
      domainsOverride ||
      getDomains(node.type, typeof node.props.variant === 'string' ? node.props.variant : undefined)
    for (const [key, value] of Object.entries(style)) {
      if (key === 'responsive' && object(value)) {
        for (const [breakpoint, override] of Object.entries(value)) {
          if (object(override) && !domains.includes('typography')) {
            for (const field of ['typography', 'align'].filter((name) => Object.hasOwn(override, name)))
              add(`${path}.responsive.${breakpoint}.${field}`, 'UNSUPPORTED_DOMAIN', 'Widget has no typography capability.')
          }
          if (node.type === 'SlideItem' && object(override) && object(override.spacing) && object(override.spacing.margin)) {
            add(
              `${path}.responsive.${breakpoint}.spacing.margin`,
              'FORBIDDEN_MARGIN',
              'SlideItem margin is locked to protect BannerSlider track alignment.',
            )
          }
        }
      } else if (Object.hasOwn(styleShapes, key) && !domains.includes(key === 'radius' ? 'border' : key as typeof domains[number])) {
        add(`${path}.${key}`, 'UNSUPPORTED_DOMAIN', 'Style domain is unavailable for this widget.')
      }
    }
    if (node.type === 'SlideItem' && object(style.spacing) && object(style.spacing.margin)) {
      add(`${path}.spacing.margin`, 'FORBIDDEN_MARGIN', 'SlideItem margin is locked to protect BannerSlider track alignment.')
    }
    if (object(style.background)) {
      const { mode, gradient, mesh } = style.background
      if ((gradient && mesh) || ((gradient || mesh) && mode !== undefined && mode !== 'color'))
        add(`${path}.background`, 'INVALID_BACKGROUND', 'Choose one background color treatment.')
    }
    if (errors.length === before) {
      for (const message of validateUniversalStyle(style).errors)
        add(path, 'STYLE_POLICY', message)
    }
  }

  const byId = new Map<string, LocatedNode>()
  const nodes: LocatedNode[] = []
  function walk(value: unknown, path: string, parent?: string, slot?: string) {
    if (!Array.isArray(value)) {
      add(path, 'INVALID_SLOT', 'Expected a Puck widget array.')
      return
    }
    value.forEach((entry, index) => {
      const nodePath = `${path}[${index}]`
      checkShape(entry, nodeShape, nodePath, errors)
      if (!object(entry) || typeof entry.type !== 'string' || !object(entry.props)) return
      const { type, props } = entry
      const node = { type, props, path: nodePath, parent, slot }
      nodes.push(node)
      const { id } = props
      if (typeof id !== 'string' || !idPattern.test(id))
        add(`${nodePath}.props.id`, 'INVALID_ID', 'Use an identifier without spaces or colons.')
      else if (byId.has(id)) add(`${nodePath}.props.id`, 'DUPLICATE_ID', 'Widget IDs must be unique.')
      else byId.set(id, node)

      const contract = widgetContract(type)
      if (!contract) {
        add(`${nodePath}.type`, 'UNSUPPORTED_WIDGET', 'Widget type is absent from the application registry.')
        return
      }
      // Match application validation: legacy Item* remain valid inside saved CollectionLoop templates.
      if (!policy.allowedWidgets.includes(type) && !isLegacyItemWidget(type))
        add(`${nodePath}.type`, 'UNSUPPORTED_CONTEXT', 'Widget is unavailable in this context.')
      if (parent === undefined && policy.rootTypes && !policy.rootTypes.includes(type))
        add(`${nodePath}.type`, 'INVALID_ROOT', 'Widget cannot be at the root of this context.')
      if (parent !== undefined && ['Section', 'Header', 'Footer'].includes(type))
        add(`${nodePath}.type`, 'INVALID_NESTING', 'This widget is root-only.')

      for (const key of contract.required.filter((key) => key !== 'id')) {
        if (!Object.hasOwn(props, key)) add(`${nodePath}.props.${key}`, 'REQUIRED', 'Required field.')
      }
      for (const [key, child] of Object.entries(props)) {
        const propPath = `${nodePath}.props.${key}`
        if (key === 'id') continue
        if (contract.slots.includes(key)) {
          walk(child, propPath, typeof id === 'string' ? id : '', key)
          continue
        }
        if (!contract.optional.includes(key) && !contract.required.includes(key)) {
          add(propPath, 'UNSUPPORTED_PROPERTY', 'Property is outside the verified widget contract.')
          continue
        }
        if (key === 'style') checkStyle(child, propPath, node)
        else if (key === 'controlsStyle' && type === 'BannerSlider') {
          if (!object(child)) {
            add(propPath, 'INVALID_CONTROLS_STYLE', 'BannerSlider controlsStyle must be an object.')
            continue
          }
          for (const [target, styleValue] of Object.entries(child)) {
            if (target !== 'arrows' && target !== 'pagination') {
              add(`${propPath}.${target}`, 'UNSUPPORTED_STYLE_TARGET', 'BannerSlider style targets are arrows and pagination only.')
              continue
            }
            const targetDomains =
              target === 'arrows'
                ? (['background', 'spacing', 'border', 'typography'] as ReturnType<typeof getDomains>)
                : (['typography', 'spacing', 'background'] as ReturnType<typeof getDomains>)
            checkStyle(styleValue, `${propPath}.${target}`, node, targetDomains)
          }
        }
        else if (key === 'lock') checkShape(child, lock, propPath, errors)
        else if (Object.hasOwn(contract.enums, key)) checkShape(child, options(...contract.enums[key]), propPath, errors)
        else if (type === 'Gallery' && key === 'items') checkShape(child, list(fields({
          id: string, src: string, alt: string, caption: string, href: string, mediaId: {},
        }, ['src'])), propPath, errors)
        else {
          const defaultType = typeof contract.defaults[key]
          if (defaultType === 'string' || defaultType === 'number' || defaultType === 'boolean')
            checkShape(child, shapesByType[defaultType], propPath, errors)
          else if (Object.hasOwn(contract.defaults, key))
            add(propPath, 'UNSUPPORTED_PROPERTY', 'This field has no verified input shape.')
        }
      }
      if (typeof id === 'string') {
        for (const message of validateFixedBinding({ type, props: { ...props, id } }))
          add(`${nodePath}.props`, 'FIXED_BINDING', message)
      }
      if (['Image', 'Video'].includes(type) && !props.src)
        warnings.push({ path: `${nodePath}.props.src`, code: 'MEDIA_PLACEHOLDER', message: 'Widget has no media URL.' })
    })
  }

  walk(document.content, '$.content')
  if (object(document.zones)) {
    for (const [key, children] of Object.entries(document.zones)) {
      const [parent, slot, extra] = key.split(':')
      const path = `$.zones[${JSON.stringify(key)}]`
      if (!parent || !slot || extra !== undefined) add(path, 'INVALID_ZONE_KEY', 'Expected <parent-id>:<slot>.')
      else walk(children, path, parent, slot)
    }
    for (const [key] of Object.entries(document.zones)) {
      const [parent, slot] = key.split(':')
      const owner = byId.get(parent)
      const path = `$.zones[${JSON.stringify(key)}]`
      if (!owner || !Object.hasOwn(PATTERN_SLOTS, owner.type) || !PATTERN_SLOTS[owner.type].includes(slot))
        add(path, 'INVALID_PARENT_SLOT', 'Zone owner or slot is unavailable.')
      else if (Object.hasOwn(owner.props, slot))
        add(path, 'AMBIGUOUS_SLOT', 'Use either an inline slot or its legacy zone.')
    }
  }

  for (const node of nodes) {
    if (node.parent === undefined) continue
    const owner = byId.get(node.parent)
    if (!owner || !Object.hasOwn(PATTERN_SLOTS, owner.type) || !PATTERN_SLOTS[owner.type].includes(node.slot!)) {
      add(node.path, 'INVALID_PARENT_SLOT', 'Parent widget or slot is unavailable.')
      continue
    }
    if (owner.type === 'Columns') {
      const distribution = owner.props.distribution ?? 'equal-2'
      const count = columns[distribution as keyof typeof columns]
      if (count && Number(node.slot!.slice(-1)) > count)
        add(node.path, 'INACTIVE_COLUMN', 'The selected distribution does not render this column.')
    }
    if (owner.type === 'Header' && (node.type === 'Header' || !policy.allowedWidgets.includes(node.type)))
      add(node.path, 'INVALID_HEADER_CHILD', 'Only context-approved header widgets can occupy header slots.')
    if (owner.type === 'BannerSlider' && node.slot === 'slides' && node.type !== 'SlideItem')
      add(node.path, 'INVALID_SLIDER_CHILD', 'BannerSlider.slides may only contain SlideItem widgets.')
    if (node.type === 'SlideItem' && (owner.type !== 'BannerSlider' || node.slot !== 'slides'))
      add(node.path, 'INVALID_SLIDE_PARENT', 'SlideItem must live in BannerSlider.slides.')
    const seen = new Set<LocatedNode>([node])
    let ancestor: LocatedNode | undefined = owner
    let inLoop = false
    while (ancestor) {
      if (seen.has(ancestor)) {
        add(node.path, 'NESTING_CYCLE', 'Widget tree contains a cycle.')
        break
      }
      seen.add(ancestor)
      inLoop ||= ancestor.type === 'CollectionLoop'
      ancestor = ancestor.parent === undefined ? undefined : byId.get(ancestor.parent)
    }
    if (node.type.startsWith('Item') && !inLoop)
      add(node.path, 'MISSING_ITEM_CONTEXT', 'Item widgets require a CollectionLoop ancestor.')
    if (node.type === 'CollectionLoop' && inLoop)
      add(node.path, 'INVALID_NESTING', 'Nested collection queries are outside the Phase 1 contract.')
  }
  checkReferences(document, '$')
  if (nodes.length > 250) add('$.content', 'DOCUMENT_LIMIT', 'A proposal can contain at most 250 widgets.')
  if (!errors.length) {
    const validation = validateThemeTemplateDocument(document, context)
    for (const message of validation.errors) add('$', 'TEMPLATE_POLICY', message)
  }
  if (errors.length || !includeSections) return result()

  // The validated parent index covers both inline slots and legacy zones.
  const groups = new Map<LocatedNode, LocatedNode[]>()
  for (const node of nodes) {
    let root = node
    while (root.parent !== undefined) root = byId.get(root.parent)!
    const group = groups.get(root) ?? []
    group.push(node)
    groups.set(root, group)
  }
  return result([...groups].map(([root, members]) => {
    const widgets = members.map(({ type, props }) => ({
      id: props.id, type, slots: PATTERN_SLOTS[type] ?? [],
      media: widgetContract(type)?.media ?? null,
      responsiveOverrides: object(props.style) ? Object.keys(object(props.style.responsive) ? props.style.responsive : {}) : [],
    }))
    const colorTokens = [...new Set(members.flatMap(({ props }) => collectPatternTokens(props.style)))]
      .filter((token) => Object.hasOwn(theme.tokens.colors, token))
    return { id: root.props.id, type: root.type, valid: true, widgets, colorTokens }
  }))
}
