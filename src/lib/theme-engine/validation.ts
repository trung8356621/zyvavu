import { collectTemplateWidgets, validateRoleContract } from './widget-contracts'
import type {
  TemplateContext,
  ThemeComponentData,
  ThemeTemplateDocument,
  ValidationResult,
} from './types'
import { getTemplatePolicy } from './policy'
import { getWidgetManifest } from './widget-registry-manifests'
import { validateUniversalStyle } from '@/lib/style-engine/validation'
import { isPageContentContext } from './normalization'

export function validateThemeTemplateDocument(
  doc: unknown,
  context: TemplateContext,
  previousDoc?: ThemeTemplateDocument | null,
): ValidationResult {
  const errors: string[] = []

  if (!doc || typeof doc !== 'object') {
    return { valid: false, errors: ['Template document must be a valid JSON object'] }
  }

  const candidate = doc as Partial<ThemeTemplateDocument>

  if (typeof candidate.version !== 'number' || candidate.version <= 0) {
    errors.push('Template version must be a positive number')
  }

  if (candidate.template && candidate.template !== context) {
    errors.push(`Template context mismatch: expected "${context}", found "${candidate.template}"`)
  }

  if (!candidate.root || typeof candidate.root !== 'object') {
    errors.push('Template root must be an object')
  }

  if (!Array.isArray(candidate.content)) {
    errors.push('Template content must be an array')
    return { valid: false, errors }
  }

  // Collect all placed widgets across content and zones
  const placedWidgets: ThemeComponentData[] = []

  for (let i = 0; i < candidate.content.length; i++) {
    const item = candidate.content[i]
    if (!item || typeof item !== 'object') {
      errors.push(`Content item at index ${i} must be an object`)
      continue
    }
    if (typeof item.type !== 'string' || !item.type.trim()) {
      errors.push(`Content item at index ${i} must have a valid string type`)
      continue
    }
    if (!item.props || typeof item.props !== 'object') {
      errors.push(`Content item at index ${i} must have a props object`)
      continue
    }
    if (typeof item.props.id !== 'string' || !item.props.id.trim()) {
      errors.push(`Content item at index ${i} must have a unique props.id`)
      continue
    }
    placedWidgets.push(item)
  }

  if (candidate.zones && typeof candidate.zones === 'object' && !Array.isArray(candidate.zones)) {
    for (const [zoneKey, zoneItems] of Object.entries(candidate.zones)) {
      if (!Array.isArray(zoneItems)) {
        errors.push(`Zone "${zoneKey}" must be an array`)
        continue
      }
      for (let j = 0; j < zoneItems.length; j++) {
        const item = zoneItems[j]
        if (!item || typeof item !== 'object') {
          errors.push(`Zone "${zoneKey}" item at index ${j} must be an object`)
          continue
        }
        if (typeof item.type !== 'string' || !item.type.trim()) {
          errors.push(`Zone "${zoneKey}" item at index ${j} must have a valid string type`)
          continue
        }
        if (!item.props || typeof item.props !== 'object') {
          errors.push(`Zone "${zoneKey}" item at index ${j} must have a props object`)
          continue
        }
        if (typeof item.props.id !== 'string' || !item.props.id.trim()) {
          errors.push(`Zone "${zoneKey}" item at index ${j} must have a unique props.id`)
          continue
        }
        placedWidgets.push(item)
      }
    }
  }

  const allWidgets = collectTemplateWidgets(candidate as ThemeTemplateDocument)
  placedWidgets.splice(0, placedWidgets.length, ...allWidgets)
  errors.push(
    ...validateRoleContract(
      { ...candidate, template: context } as ThemeTemplateDocument,
      previousDoc,
    ),
  )

  // Policy validation
  try {
    // 0. Mandatory Section Architecture check for page-content templates
    if (isPageContentContext(context)) {
      for (let i = 0; i < candidate.content.length; i++) {
        const item = candidate.content[i]
        if (item && item.type !== 'Section') {
          errors.push(
            `Template "${context}" requires all root-level content to be Section containers. Found root widget "${item.type}" (${item.props?.id || i}).`,
          )
        }
      }
    }

    // Disallow nested Sections inside zones (e.g. inside Section or Columns)
    if (candidate.zones && typeof candidate.zones === 'object') {
      for (const [zoneKey, zoneItems] of Object.entries(candidate.zones)) {
        if (Array.isArray(zoneItems)) {
          for (const item of zoneItems) {
            if (item && item.type === 'Section') {
              errors.push(
                `Section widget "${item.props?.id || 'unknown'}" cannot be nested inside zone "${zoneKey}". Section-inside-Section is not permitted.`,
              )
            }
          }
        }
      }
    }

    const ids = new Set<string>()
    for (const node of placedWidgets) {
      if (
        !node.props ||
        typeof node.props.id !== 'string' ||
        !node.props.id ||
        ids.has(node.props.id)
      )
        errors.push('Invalid or duplicate nested widget ID')
      ids.add(node.props?.id)
      if (node.type === 'Section' && !candidate.content.includes(node))
        errors.push('Section cannot be nested')
    }
    const policy = getTemplatePolicy(context)
    const allowedSet = new Set(policy.allowedWidgets)
    if (context === 'header') allowedSet.add('Header')
    if (context === 'footer') allowedSet.add('Footer')

    const widgetCounts = new Map<string, number>()
    const capabilityCounts = new Map<string, number>()

    for (const widget of placedWidgets) {
      // 1. Allowed widgets
      if (!allowedSet.has(widget.type)) {
        errors.push(`Widget "${widget.type}" is not permitted in template "${context}"`)
      }

      // Track counts
      widgetCounts.set(widget.type, (widgetCounts.get(widget.type) || 0) + 1)

      // Capabilities
      const manifest = getWidgetManifest(widget.type)
      if (manifest?.capabilities) {
        for (const cap of manifest.capabilities) {
          capabilityCounts.set(cap, (capabilityCounts.get(cap) || 0) + 1)
        }
      }
    }

    // 2. Required widgets
    if (policy.requiredWidgets) {
      for (const reqWidget of policy.requiredWidgets) {
        if (!widgetCounts.has(reqWidget) || (widgetCounts.get(reqWidget) || 0) === 0) {
          errors.push(`Template "${context}" requires widget "${reqWidget}"`)
        }
      }
    }

    // 3. Required capabilities
    if (policy.requiredCapabilities) {
      for (const reqCap of policy.requiredCapabilities) {
        if (!capabilityCounts.has(reqCap) || (capabilityCounts.get(reqCap) || 0) === 0) {
          errors.push(
            `Template "${context}" requires a widget providing capability "${reqCap}" (e.g. PostContent)`,
          )
        }
      }
    }

    // 4. Unique widgets
    if (policy.uniqueWidgets) {
      for (const uniqWidget of policy.uniqueWidgets) {
        if ((widgetCounts.get(uniqWidget) || 0) > 1) {
          errors.push(`Widget "${uniqWidget}" can only appear once in template "${context}"`)
        }
      }
    }

    // 5. Unique capabilities
    if (policy.uniqueCapabilities) {
      for (const uniqCap of policy.uniqueCapabilities) {
        if ((capabilityCounts.get(uniqCap) || 0) > 1) {
          errors.push(
            `Only one widget with capability "${uniqCap}" is allowed in template "${context}"`,
          )
        }
      }
    }

    // 6. Widget Instance Locks (enforced against previousDoc)
    if (previousDoc) {
      const prevWidgets = new Map<string, ThemeComponentData>()
      for (const w of collectTemplateWidgets(previousDoc)) prevWidgets.set(w.props.id, w)

      const currWidgetIds = new Set(placedWidgets.map((w) => w.props.id))

      for (const [id, prev] of prevWidgets.entries()) {
        const lock = prev.props.lock
        if (!lock) continue

        // canDelete lock
        if (lock.canDelete === false && !currWidgetIds.has(id)) {
          errors.push(`Widget instance "${id}" (${prev.type}) is locked against deletion`)
        }

        // canEditProps lock
        if (lock.canEditProps === false && currWidgetIds.has(id)) {
          const curr = placedWidgets.find((w) => w.props.id === id)
          if (curr) {
            const { lock: _l1, id: _i1, ...prevProps } = prev.props
            const { lock: _l2, id: _i2, ...currProps } = curr.props
            if (JSON.stringify(prevProps) !== JSON.stringify(currProps)) {
              errors.push(`Widget instance "${id}" (${prev.type}) is locked against prop edits`)
            }
          }
        }
      }
    }

    // 7. Page Settings & Atomic Design System Validation
    const pageSettings = candidate.root?.props?.pageSettings
    if (pageSettings !== undefined) {
      if (typeof pageSettings !== 'object' || pageSettings === null) {
        errors.push('Template pageSettings must be an object if defined')
      } else {
        // Validate background
        if (pageSettings.background) {
          const bg = pageSettings.background
          if (bg.type && !['theme', 'palette', 'image'].includes(bg.type)) {
            errors.push(
              `Invalid background type "${bg.type}". Must be "theme", "palette", or "image"`,
            )
          }
          if (bg.type === 'palette') {
            if (!bg.token || typeof bg.token !== 'string' || !bg.token.trim()) {
              errors.push('Background palette mode requires a valid token ID')
            } else if (bg.token.startsWith('#') || bg.token.startsWith('rgb')) {
              errors.push(
                `Direct color value "${bg.token}" is not permitted for background.token. Must be a semantic token ID.`,
              )
            }
          }
        }

        // Validate text
        if (pageSettings.text) {
          const txt = pageSettings.text
          if (txt.typography && typeof txt.typography === 'string') {
            if (txt.typography.includes('px') || txt.typography.includes('rem')) {
              errors.push(
                `Direct font size "${txt.typography}" is not permitted in text.typography. Must be a semantic preset ID.`,
              )
            }
          }
          if (txt.colorToken && typeof txt.colorToken === 'string') {
            if (txt.colorToken.startsWith('#') || txt.colorToken.startsWith('rgb')) {
              errors.push(
                `Direct color value "${txt.colorToken}" is not permitted for text.colorToken. Must be a semantic token ID.`,
              )
            }
          }
        }

        // Validate layout
        if (pageSettings.layout) {
          const layout = pageSettings.layout
          if (layout.containerWidth && typeof layout.containerWidth === 'string') {
            if (layout.containerWidth.includes('px') || layout.containerWidth.includes('%')) {
              errors.push(
                `Direct dimension "${layout.containerWidth}" is not permitted for layout.containerWidth. Use semantic token (e.g. "containerWidth", "narrowWidth", "full").`,
              )
            }
          }
          if (layout.spacing && typeof layout.spacing === 'string') {
            if (layout.spacing.includes('px') || layout.spacing.includes('rem')) {
              errors.push(
                `Direct dimension "${layout.spacing}" is not permitted for layout.spacing. Use semantic token (e.g. "xs", "sm", "md", "lg", "xl").`,
              )
            }
          }
        }

        // Validate custom CSS / JS
        if (pageSettings.customCSS && typeof pageSettings.customCSS === 'string') {
          if (/<script\b/i.test(pageSettings.customCSS)) {
            errors.push('Custom CSS cannot contain script tags')
          }
        }
        if (pageSettings.customJS && typeof pageSettings.customJS === 'string') {
          if (
            /\beval\s*\(/.test(pageSettings.customJS) ||
            /\bFunction\s*\(/.test(pageSettings.customJS)
          ) {
            errors.push('Unsafe eval or Function constructor is strictly prohibited in customJS')
          }
        }
      }
    }

    // 8. Atomic Design System Enforcement for placed widget styles
    for (const widget of placedWidgets) {
      const style = widget.props?.style
      if (style && typeof style === 'object') {
        const styleValidation = validateUniversalStyle(style)
        if (!styleValidation.valid) {
          for (const err of styleValidation.errors) {
            errors.push(`Widget "${widget.type}" (${widget.props.id}): ${err}`)
          }
        }

        if (style.fontSize || style.fontFamily) {
          errors.push(
            `Widget "${widget.type}" (${widget.props.id}) cannot define arbitrary fontSize or fontFamily. Use semantic typography presets.`,
          )
        }
        if (style.color && (style.color.startsWith('#') || style.color.startsWith('rgb'))) {
          errors.push(
            `Widget "${widget.type}" (${widget.props.id}) cannot define arbitrary color "${style.color}". Use semantic colorToken reference.`,
          )
        }
        if (style.colorToken && typeof style.colorToken === 'string') {
          if (style.colorToken.startsWith('#') || style.colorToken.startsWith('rgb')) {
            errors.push(
              `Widget "${widget.type}" (${widget.props.id}) colorToken cannot be a raw color value "${style.colorToken}". Must be a semantic token ID.`,
            )
          }
        }
        if (style.typography && typeof style.typography === 'string') {
          if (style.typography.includes('px') || style.typography.includes('rem')) {
            errors.push(
              `Widget "${widget.type}" (${widget.props.id}) typography cannot be a raw font size. Must be a semantic preset ID.`,
            )
          }
        }
      }
    }
  } catch (err: any) {
    errors.push(err.message)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
