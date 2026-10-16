import type { TemplateContext, ThemeComponentData, ThemeTemplateDocument, ValidationResult } from './types'
import { getTemplatePolicy } from './policy'
import { getWidgetManifest } from './widget-registry-manifests'

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

  // Policy validation
  try {
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
          errors.push(`Template "${context}" requires a widget providing capability "${reqCap}" (e.g. PostContent)`)
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
          errors.push(`Only one widget with capability "${uniqCap}" is allowed in template "${context}"`)
        }
      }
    }

    // 6. Widget Instance Locks (enforced against previousDoc)
    if (previousDoc) {
      const prevWidgets = new Map<string, ThemeComponentData>()
      for (const w of previousDoc.content || []) prevWidgets.set(w.props.id, w)
      if (previousDoc.zones) {
        for (const zoneItems of Object.values(previousDoc.zones)) {
          for (const w of zoneItems || []) prevWidgets.set(w.props.id, w)
        }
      }

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
  } catch (err: any) {
    errors.push(err.message)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
