import theme from './theme.json'

type ThemeArea = keyof typeof theme

export function themeVariables(area: ThemeArea): Record<`--zyvavu-${string}`, string> {
  const result: Record<`--zyvavu-${string}`, string> = {}
  const source = theme[area] as Record<string, unknown>

  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'string') {
      result[`--zyvavu-${key}`] = value
    } else if (value && typeof value === 'object') {
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        if (typeof nestedValue === 'string') {
          result[`--zyvavu-${key}-${nestedKey}`] = nestedValue
        }
      }
    }
  }

  return result
}
