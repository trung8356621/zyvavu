import type { BuilderComponentData, BuilderDocument, BuilderValidationResult } from './types'

export const CURRENT_BUILDER_VERSION = 1

export function createEmptyBuilderDocument<T = Record<string, any>>(metadata?: T): BuilderDocument<T> {
  return {
    version: CURRENT_BUILDER_VERSION,
    root: { props: {} },
    content: [],
    zones: {},
    metadata,
  }
}

export function validateBuilderDocument(doc: unknown): BuilderValidationResult {
  const errors: string[] = []

  if (!doc || typeof doc !== 'object') {
    return { valid: false, errors: ['Document must be an object'] }
  }

  const candidate = doc as Record<string, any>

  if (typeof candidate.version !== 'number' || candidate.version <= 0) {
    errors.push('Document version must be a positive number')
  }

  if (!candidate.root || typeof candidate.root !== 'object') {
    errors.push('Document root must be an object')
  }

  if (!Array.isArray(candidate.content)) {
    errors.push('Document content must be an array')
  } else {
    for (let i = 0; i < candidate.content.length; i++) {
      const item = candidate.content[i]
      if (!item || typeof item !== 'object') {
        errors.push(`Content item at index ${i} must be an object`)
        continue
      }
      if (typeof item.type !== 'string' || !item.type.trim()) {
        errors.push(`Content item at index ${i} must have a valid string type`)
      }
      if (!item.props || typeof item.props !== 'object') {
        errors.push(`Content item at index ${i} must have a props object`)
      } else if (typeof item.props.id !== 'string' || !item.props.id.trim()) {
        errors.push(`Content item at index ${i} must have a valid props.id`)
      }
    }
  }

  if (candidate.zones !== undefined && (typeof candidate.zones !== 'object' || candidate.zones === null || Array.isArray(candidate.zones))) {
    errors.push('Document zones must be an object map if defined')
  } else if (candidate.zones) {
    for (const [zoneKey, zoneItems] of Object.entries(candidate.zones)) {
      if (!Array.isArray(zoneItems)) {
        errors.push(`Zone "${zoneKey}" must be an array`)
        continue
      }
      for (let j = 0; j < (zoneItems as any[]).length; j++) {
        const item = (zoneItems as any[])[j]
        if (!item || typeof item !== 'object') {
          errors.push(`Zone "${zoneKey}" item at index ${j} must be an object`)
          continue
        }
        if (typeof item.type !== 'string' || !item.type.trim()) {
          errors.push(`Zone "${zoneKey}" item at index ${j} must have a valid string type`)
        }
        if (!item.props || typeof item.props !== 'object') {
          errors.push(`Zone "${zoneKey}" item at index ${j} must have a props object`)
        } else if (typeof item.props.id !== 'string' || !item.props.id.trim()) {
          errors.push(`Zone "${zoneKey}" item at index ${j} must have a valid props.id`)
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export function serializeBuilderDocument(doc: BuilderDocument): string {
  const validation = validateBuilderDocument(doc)
  if (!validation.valid) {
    throw new Error(`Cannot serialize invalid builder document: ${validation.errors.join(', ')}`)
  }
  return JSON.stringify(doc)
}

export function deserializeBuilderDocument(input: unknown): BuilderDocument {
  if (input === null || input === undefined || input === '') {
    return createEmptyBuilderDocument()
  }

  let parsed: unknown = input
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input)
    } catch {
      throw new Error('Invalid JSON string for builder document')
    }
  }

  // Handle case where document is older Puck format without version wrapper
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, any>
    if (!('version' in obj) && (Array.isArray(obj.content) || obj.root)) {
      const migrated: BuilderDocument = {
        version: CURRENT_BUILDER_VERSION,
        root: obj.root || { props: {} },
        content: Array.isArray(obj.content) ? obj.content : [],
        zones: obj.zones || {},
      }
      const val = validateBuilderDocument(migrated)
      if (val.valid) return migrated
    }
  }

  const validation = validateBuilderDocument(parsed)
  if (!validation.valid) {
    throw new Error(`Invalid builder document: ${validation.errors.join(', ')}`)
  }

  return parsed as BuilderDocument
}
