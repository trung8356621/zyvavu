export type RecordValue = Record<string, unknown>
export function object(value: unknown): value is RecordValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export type Shape = {
  type?: 'object' | 'array' | 'string' | 'number' | 'boolean'
  properties?: Record<string, Shape>
  required?: readonly string[]
  additionalProperties?: false
  items?: Shape
  enum?: readonly unknown[]
}

export const string: Shape = { type: 'string' }
export const number: Shape = { type: 'number' }
export const boolean: Shape = { type: 'boolean' }
export const list = (items: Shape): Shape => ({ type: 'array', items })
export const options = (...values: readonly unknown[]): Shape => ({ enum: values })
export const fields = (properties: Record<string, Shape>, required: readonly string[] = []): Shape =>
  ({ type: 'object', properties, additionalProperties: false, required })

export type Issue = { path: string; code: string; message: string }

export function checkShape(value: unknown, shape: Shape, path: string, issues: Issue[]) {
  const add = (code: string, message: string) => issues.push({ path, code, message })
  if (shape.enum && !shape.enum.includes(value)) {
    add('INVALID_ENUM', 'Value is outside the supported choices.')
    return
  }
  if (shape.type && (
    shape.type === 'object' ? !object(value)
      : shape.type === 'array' ? !Array.isArray(value)
        : typeof value !== shape.type || (shape.type === 'number' && !Number.isFinite(value))
  )) {
    add('INVALID_TYPE', `Expected ${shape.type}.`)
    return
  }
  if (object(value)) {
    for (const key of shape.required ?? []) {
      if (!Object.hasOwn(value, key))
        issues.push({ path: `${path}.${key}`, code: 'REQUIRED', message: 'Required field.' })
    }
    for (const [key, child] of Object.entries(value)) {
      const childPath = `${path}.${key}`
      if (shape.properties && Object.hasOwn(shape.properties, key))
        checkShape(child, shape.properties[key], childPath, issues)
      else if (shape.additionalProperties === false)
        issues.push({ path: childPath, code: 'UNSUPPORTED_PROPERTY', message: 'Property is outside the verified contract.' })
    }
  }
  if (Array.isArray(value) && shape.items)
    value.forEach((entry, index) => checkShape(entry, shape.items!, `${path}[${index}]`, issues))
}
