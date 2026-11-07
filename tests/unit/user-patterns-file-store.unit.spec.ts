import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { PatternJSON } from '@/lib/theme-engine/patterns/json'

const sample = (id: string, name = 'Heading pattern'): PatternJSON => ({
  schemaVersion: 1,
  id,
  name,
  description: '',
  category: 'Text',
  widgetType: 'Heading',
  source: 'user',
  version: 1,
  payload: {
    content: [{ type: 'Heading', props: { id: 'root', content: 'Hello', level: 'h2' } }],
    zones: {},
  },
  theme: { tokens: [] },
})

describe('user pattern file store', () => {
  let root: string

  async function loadStore() {
    vi.resetModules()
    return import('@/lib/theme-engine/patterns/file-store')
  }

  beforeEach(async () => {
    root = await mkTemp()
    process.env.ZYVAVU_USER_PATTERNS_ROOT = root
  })

  afterEach(async () => {
    delete process.env.ZYVAVU_USER_PATTERNS_ROOT
    await rm(root, { recursive: true, force: true })
  })

  it('saves, lists, renames with stable id, and deletes', async () => {
    const {
      saveUserPattern,
      listUserPatterns,
      renameUserPattern,
      deleteUserPattern,
      getUserPattern,
    } = await loadStore()

    const created = await saveUserPattern('owner-1', sample('user-abc'))
    expect(created.id).toBe('user-abc')
    expect(await listUserPatterns('owner-1')).toHaveLength(1)
    const renamed = await renameUserPattern('owner-1', 'user-abc', { name: 'Renamed' })
    expect(renamed.id).toBe('user-abc')
    expect(renamed.name).toBe('Renamed')
    expect((await getUserPattern('owner-1', 'user-abc')).name).toBe('Renamed')
    await deleteUserPattern('owner-1', 'user-abc')
    expect(await listUserPatterns('owner-1')).toHaveLength(0)
  })

  it('rejects path traversal and cross-owner access by scoping owner folders', async () => {
    const { saveUserPattern, getUserPattern } = await loadStore()
    await saveUserPattern('owner-a', sample('user-a1'))
    await expect(getUserPattern('owner-b', 'user-a1')).rejects.toThrow()
    await expect(saveUserPattern('../evil', sample('user-x'))).rejects.toThrow(/Invalid owner/)
  })

  it('fails safely on invalid pattern JSON files', async () => {
    const { listUserPatterns, USER_PATTERNS_ROOT } = await loadStore()
    const dir = path.join(USER_PATTERNS_ROOT, 'owner-1')
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, 'user-bad.json'), '{not-json', 'utf8')
    expect(await listUserPatterns('owner-1')).toEqual([])
  })

  it('does not overwrite another pattern on create collision', async () => {
    const { saveUserPattern, USER_PATTERNS_ROOT } = await loadStore()
    await saveUserPattern('owner-1', sample('user-dup', 'First'))
    await expect(saveUserPattern('owner-1', sample('user-dup', 'Second'))).rejects.toThrow(
      /already exists/,
    )
    const raw = await readFile(path.join(USER_PATTERNS_ROOT, 'owner-1', 'user-dup.json'), 'utf8')
    expect(raw).toContain('First')
    expect(raw).not.toContain('Second')
  })
})

async function mkTemp() {
  const { mkdtemp } = await import('node:fs/promises')
  return mkdtemp(path.join(os.tmpdir(), 'zyvavu-user-patterns-'))
}
