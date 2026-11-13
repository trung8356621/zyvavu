import type { ThemeTokens } from '@/lib/theme-engine/types'
import { THEME_STYLE_DRAFT_KEY, THEME_STYLE_PUBLISHED_KEY } from '@/lib/theme-engine/styles'
import { ToolError } from './tool-contract'

export type ThemeStyleChannel = 'draft' | 'published'

export type ThemeStyleRecord = {
  themeId: string
  channel: ThemeStyleChannel
  tokens: Partial<ThemeTokens>
  slots?: Record<string, Record<string, string>>
  revision: number
  updatedAt: string
  displayName?: string
}

export type ThemeCustomizeStore = {
  kind: 'memory' | 'payload'
  read(themeId: string, channel: ThemeStyleChannel): Promise<ThemeStyleRecord | null>
  write(
    themeId: string,
    channel: ThemeStyleChannel,
    input: {
      tokens: Partial<ThemeTokens>
      slots?: Record<string, Record<string, string>>
      displayName?: string
      expectedRevision?: number
      idempotencyKey?: string
    },
  ): Promise<ThemeStyleRecord>
  listIds(): Promise<string[]>
}

function scopedKey(themeId: string, channel: ThemeStyleChannel) {
  return `theme_style_${themeId}_${channel}`
}

function samePayload(a: ThemeStyleRecord, b: {
  tokens: Partial<ThemeTokens>
  slots?: Record<string, Record<string, string>>
  displayName?: string
}) {
  return JSON.stringify({
    tokens: a.tokens,
    slots: a.slots ?? null,
    displayName: a.displayName ?? null,
  }) === JSON.stringify({
    tokens: b.tokens,
    slots: b.slots ?? null,
    displayName: b.displayName ?? null,
  })
}

/** Disposable in-memory store for QA — never touches Settings / URL Registry / live themes. */
export function createMemoryThemeCustomizeStore(seed: ThemeStyleRecord[] = []): ThemeCustomizeStore {
  const records = new Map<string, ThemeStyleRecord>()
  const idempotency = new Map<string, string>()
  for (const record of seed) records.set(scopedKey(record.themeId, record.channel), structuredClone(record))

  return {
    kind: 'memory',
    async listIds() {
      return [...new Set([...records.values()].map((record) => record.themeId))]
    },
    async read(themeId, channel) {
      return structuredClone(records.get(scopedKey(themeId, channel)) ?? null)
    },
    async write(themeId, channel, input) {
      const key = scopedKey(themeId, channel)
      if (input.idempotencyKey) {
        const priorKey = idempotency.get(input.idempotencyKey)
        if (priorKey && priorKey !== key) {
          throw new ToolError('INVALID_ARGUMENTS', 'idempotencyKey is already bound to another theme/channel.')
        }
        const existing = records.get(key)
        if (priorKey === key && existing && samePayload(existing, input)) {
          return structuredClone(existing)
        }
      }
      const current = records.get(key)
      if (input.expectedRevision !== undefined) {
        const actual = current?.revision ?? 0
        if (actual !== input.expectedRevision) {
          throw new ToolError(
            'CONFLICT',
            `Revision conflict for ${themeId}/${channel}: expected ${input.expectedRevision}, found ${actual}.`,
          )
        }
      }
      if (current && samePayload(current, input) && input.expectedRevision === current.revision) {
        return structuredClone(current)
      }
      const next: ThemeStyleRecord = {
        themeId,
        channel,
        tokens: structuredClone(input.tokens),
        ...(input.slots ? { slots: structuredClone(input.slots) } : {}),
        ...(input.displayName ? { displayName: input.displayName } : {}),
        revision: (current?.revision ?? 0) + 1,
        updatedAt: new Date().toISOString(),
      }
      records.set(key, next)
      if (channel === 'published') {
        records.set(scopedKey(themeId, 'draft'), { ...structuredClone(next), channel: 'draft' })
      }
      if (input.idempotencyKey) idempotency.set(input.idempotencyKey, key)
      return structuredClone(next)
    },
  }
}

/**
 * Payload-backed store wrapping Settings.themeStyles.
 * Only used when explicitly selected — never the default for automated tests.
 */
export function createPayloadThemeCustomizeStore(payload: {
  findGlobal: (args: unknown) => Promise<unknown>
  updateGlobal: (args: unknown) => Promise<unknown>
}): ThemeCustomizeStore {
  async function loadStyles(): Promise<Record<string, unknown>> {
    const settings = await payload.findGlobal({ slug: 'settings', overrideAccess: true }).catch(() => null) as
      | { themeStyles?: Record<string, unknown> }
      | null
    return (settings?.themeStyles && typeof settings.themeStyles === 'object')
      ? { ...settings.themeStyles }
      : {}
  }

  function parseRecord(themeId: string, channel: ThemeStyleChannel, raw: unknown): ThemeStyleRecord | null {
    if (!raw || typeof raw !== 'object') return null
    const value = raw as { tokens?: Partial<ThemeTokens>; slots?: ThemeStyleRecord['slots']; revision?: number; updatedAt?: string; displayName?: string }
    if (!value.tokens || typeof value.tokens !== 'object') return null
    return {
      themeId,
      channel,
      tokens: value.tokens,
      ...(value.slots ? { slots: value.slots } : {}),
      ...(value.displayName ? { displayName: value.displayName } : {}),
      revision: typeof value.revision === 'number' ? value.revision : 0,
      updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : '',
    }
  }

  const idempotency = new Map<string, string>()

  return {
    kind: 'payload',
    async listIds() {
      const styles = await loadStyles()
      const ids = new Set<string>()
      for (const key of Object.keys(styles)) {
        const match = /^theme_style_([a-z0-9-]+)_(draft|published)$/.exec(key)
        if (match) ids.add(match[1])
      }
      return [...ids]
    },
    async read(themeId, channel) {
      const styles = await loadStyles()
      return parseRecord(themeId, channel, styles[scopedKey(themeId, channel)])
    },
    async write(themeId, channel, input) {
      // Live payload writes require explicit store selection + live bridge auth gates upstream.
      const styles = await loadStyles()
      const key = scopedKey(themeId, channel)
      const current = parseRecord(themeId, channel, styles[key])
      if (input.idempotencyKey) {
        const priorKey = idempotency.get(input.idempotencyKey)
        if (priorKey && priorKey !== key) {
          throw new ToolError('INVALID_ARGUMENTS', 'idempotencyKey is already bound to another theme/channel.')
        }
        if (priorKey === key && current && samePayload(current, input)) {
          return current
        }
      }
      if (input.expectedRevision !== undefined) {
        const actual = current?.revision ?? 0
        if (actual !== input.expectedRevision) {
          throw new ToolError(
            'CONFLICT',
            `Revision conflict for ${themeId}/${channel}: expected ${input.expectedRevision}, found ${actual}.`,
          )
        }
      }
      if (current && samePayload(current, input) && input.expectedRevision === current.revision) {
        return current
      }
      const next: ThemeStyleRecord = {
        themeId,
        channel,
        tokens: structuredClone(input.tokens),
        ...(input.slots ? { slots: structuredClone(input.slots) } : {}),
        ...(input.displayName ? { displayName: input.displayName } : {}),
        revision: (current?.revision ?? 0) + 1,
        updatedAt: new Date().toISOString(),
      }
      const overrideData = {
        tokens: next.tokens,
        ...(next.slots ? { slots: next.slots } : {}),
        ...(next.displayName ? { displayName: next.displayName } : {}),
        revision: next.revision,
        updatedAt: next.updatedAt,
      }
      // Spread preserves theme_custom_registry and unrelated Settings.themeStyles keys.
      const updated: Record<string, unknown> = {
        ...styles,
        [key]: overrideData,
      }
      if (channel === 'published') {
        updated[scopedKey(themeId, 'draft')] = overrideData
      }
      // Mirror legacy corporate keys used by saveThemeStyleOverride.
      if (themeId === 'corporate') {
        updated[channel === 'published' ? THEME_STYLE_PUBLISHED_KEY : THEME_STYLE_DRAFT_KEY] = overrideData
        if (channel === 'published') updated[THEME_STYLE_DRAFT_KEY] = overrideData
      }
      await payload.updateGlobal({
        slug: 'settings',
        data: { themeStyles: updated },
        overrideAccess: true,
      })
      if (input.idempotencyKey) idempotency.set(input.idempotencyKey, key)
      return next
    },
  }
}

let activeStore: ThemeCustomizeStore = createMemoryThemeCustomizeStore()

export function getThemeCustomizeStore() {
  return activeStore
}

export function setThemeCustomizeStore(store: ThemeCustomizeStore) {
  activeStore = store
}

export function resetThemeCustomizeStoreForTests(seed?: ThemeStyleRecord[]) {
  activeStore = createMemoryThemeCustomizeStore(seed)
  return activeStore
}
