import theme from './theme.json'

type ThemeArea = keyof typeof theme

export function themeVariables(area: ThemeArea): Record<`--zyvavu-${string}`, string> {
  return Object.fromEntries(
    Object.entries(theme[area]).map(([name, value]) => [`--zyvavu-${name}`, value]),
  ) as Record<`--zyvavu-${string}`, string>
}
