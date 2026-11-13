import { slugify } from '@/lib/slug'
import {
  getAllInstalledThemes,
  getRuntimeCustomThemes,
  INSTALLED_THEMES,
  listBundledThemeIds,
} from '@/lib/theme-engine/themes'
import { ToolError } from './tool-contract'

/**
 * Theme ID is a normalized, lowercase, accent-free URL slug of Theme Name.
 * Immutable after creation; uniqueness is enforced without numeric suffixes.
 */
export function themeIdFromName(name: unknown): string {
  if (typeof name !== 'string' || !name.trim()) {
    throw new ToolError('INVALID_ARGUMENTS', 'Theme Name is required.')
  }
  const id = slugify(name)
  if (!id) {
    throw new ToolError('INVALID_ARGUMENTS', 'Theme Name does not produce a valid Theme ID slug.')
  }
  return id
}

export function listKnownThemeIds(extra: string[] = []): string[] {
  return [
    ...new Set([
      ...listBundledThemeIds(),
      ...getRuntimeCustomThemes().map((theme) => theme.id),
      ...extra,
    ]),
  ]
}

export function assertThemeIdAvailable(themeId: string, occupied: string[] = listKnownThemeIds()) {
  if (occupied.includes(themeId)) {
    throw new ToolError(
      'INVALID_ARGUMENTS',
      `Theme ID "${themeId}" is already taken. Choose a different Theme Name; numeric suffixes are not appended automatically.`,
    )
  }
}

/** Strict installed theme reference — never silently falls back to corporate. */
export function requireInstalledThemeId(themeId: unknown): string {
  if (typeof themeId !== 'string' || !themeId.trim()) {
    throw new ToolError('INVALID_ARGUMENTS', 'themeId is required and must be a stable Theme ID.')
  }
  const id = themeId.trim().toLowerCase()
  if (id === 'default') {
    throw new ToolError('INVALID_ARGUMENTS', 'Use explicit Theme ID "corporate" instead of "default".')
  }
  const known = listKnownThemeIds()
  if (!known.includes(id) && !Object.hasOwn(INSTALLED_THEMES, id)) {
    throw new ToolError('NOT_FOUND', `Theme ID "${id}" is not an installed theme.`)
  }
  return id
}

export function describeInstalledThemes() {
  return getAllInstalledThemes().map(({ id, name, label, description, version }) => ({
    id,
    name,
    label,
    description,
    version,
    source: 'installed' as const,
    themeIdImmutable: true,
  }))
}
