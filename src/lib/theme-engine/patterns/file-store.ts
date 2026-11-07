import { randomUUID } from 'node:crypto'
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { patternContentHash } from './server'
import { validatePatternJSON, type PatternJSON } from './json'

/** Durable install-scoped directory (alongside pattern thumbnails). Not under .next or src. */
export const USER_PATTERNS_ROOT = path.resolve(
  process.env.ZYVAVU_USER_PATTERNS_ROOT || path.join(process.cwd(), 'private', 'user-patterns'),
)

const OWNER_RE = /^[a-zA-Z0-9_-]{1,64}$/
const PATTERN_FILE_RE = /^[a-z0-9][a-z0-9-]{0,99}\.json$/i
const MAX_BYTES = 262144

export type UserPatternDocument = {
  id: string
  name: string
  description?: string
  category: string
  record: PatternJSON
  contentHash: string
  thumbnailHash?: string | null
  thumbnailStatus?: string
  url?: string | null
  updatedAt: string
  createdAt: string
}

function assertOwnerId(ownerId: string) {
  if (!OWNER_RE.test(ownerId)) throw new Error('Invalid owner')
}

function ownerDir(ownerId: string) {
  assertOwnerId(ownerId)
  const dir = path.resolve(USER_PATTERNS_ROOT, ownerId)
  if (!dir.startsWith(USER_PATTERNS_ROOT + path.sep) && dir !== USER_PATTERNS_ROOT)
    throw new Error('Invalid owner path')
  return dir
}

function patternPath(ownerId: string, patternId: string) {
  if (!PATTERN_FILE_RE.test(`${patternId}.json`)) throw new Error('Invalid pattern id')
  const file = path.resolve(ownerDir(ownerId), `${patternId}.json`)
  if (!file.startsWith(ownerDir(ownerId) + path.sep)) throw new Error('Path traversal denied')
  return file
}

function toDocument(record: PatternJSON, meta: { createdAt: string; updatedAt: string }): UserPatternDocument {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    category: record.category,
    record,
    contentHash: patternContentHash(record),
    thumbnailStatus: record.thumbnail?.status || 'pending',
    thumbnailHash: record.thumbnail?.hash || null,
    url: null,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
  }
}

type StoredFile = {
  schemaVersion: 1
  createdAt: string
  updatedAt: string
  record: PatternJSON
}

async function readStored(ownerId: string, patternId: string): Promise<StoredFile> {
  const raw = await readFile(patternPath(ownerId, patternId), 'utf8')
  if (Buffer.byteLength(raw, 'utf8') > MAX_BYTES) throw new Error('Pattern exceeds 256 KB')
  const parsed = JSON.parse(raw) as StoredFile
  if (!parsed || parsed.schemaVersion !== 1 || !parsed.record) throw new Error('Invalid pattern file')
  validatePatternJSON(parsed.record)
  if (parsed.record.source !== 'user') throw new Error('Only user patterns are stored here')
  if (parsed.record.id !== patternId) throw new Error('Pattern id mismatch')
  return parsed
}

async function writeAtomic(file: string, body: StoredFile) {
  const json = `${JSON.stringify(body, null, 2)}\n`
  if (Buffer.byteLength(json, 'utf8') > MAX_BYTES) throw new Error('Pattern exceeds 256 KB')
  await mkdir(path.dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`
  await writeFile(tmp, json, 'utf8')
  try {
    await rename(tmp, file)
  } catch (error) {
    // Windows cannot rename onto an existing path; replace then rename.
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST' && (error as NodeJS.ErrnoException).code !== 'EPERM')
      throw error
    const backup = `${file}.bak`
    await rename(file, backup)
    try {
      await rename(tmp, file)
      await rm(backup, { force: true })
    } catch (replaceError) {
      await rename(backup, file).catch(() => undefined)
      await rm(tmp, { force: true }).catch(() => undefined)
      throw replaceError
    }
  }
}

export async function listUserPatterns(
  ownerId: string,
  options?: { search?: string },
): Promise<UserPatternDocument[]> {
  const dir = ownerDir(ownerId)
  let names: string[]
  try {
    names = await readdir(dir)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
  const docs: UserPatternDocument[] = []
  for (const name of names) {
    if (!PATTERN_FILE_RE.test(name)) continue
    const id = name.replace(/\.json$/i, '')
    try {
      const stored = await readStored(ownerId, id)
      docs.push(toDocument(stored.record, { createdAt: stored.createdAt, updatedAt: stored.updatedAt }))
    } catch {
      /* skip corrupt/incompatible files */
    }
  }
  const q = (options?.search || '').trim().toLocaleLowerCase()
  const filtered = q
    ? docs.filter((doc) =>
        `${doc.name} ${doc.description || ''} ${doc.category} ${doc.record.widgetType}`
          .toLocaleLowerCase()
          .includes(q),
      )
    : docs
  return filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getUserPattern(ownerId: string, patternId: string): Promise<UserPatternDocument> {
  const stored = await readStored(ownerId, patternId)
  return toDocument(stored.record, { createdAt: stored.createdAt, updatedAt: stored.updatedAt })
}

export async function saveUserPattern(
  ownerId: string,
  input: PatternJSON,
  options?: { id?: string },
): Promise<UserPatternDocument> {
  validatePatternJSON(input)
  if (input.source !== 'user') throw new Error('Only user patterns can be saved')
  const now = new Date().toISOString()
  const id = options?.id || input.id || `user-${randomUUID()}`
  if (!/^[a-z0-9][a-z0-9-]{0,99}$/i.test(id)) throw new Error('Invalid pattern id')

  let createdAt = now
  let previousHash: string | undefined
  let previousVersion = 1
  if (options?.id) {
    try {
      const existing = await readStored(ownerId, options.id)
      createdAt = existing.createdAt
      previousHash = patternContentHash(existing.record)
      previousVersion = existing.record.version || 1
      if (existing.record.id !== options.id) throw new Error('Pattern id mismatch')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new Error('Pattern not found')
      throw error
    }
  } else {
    try {
      await readFile(patternPath(ownerId, id), 'utf8')
      throw new Error('Pattern id already exists')
    } catch (error) {
      if ((error as Error).message === 'Pattern id already exists') throw error
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }

  const next: PatternJSON = {
    ...input,
    id,
    source: 'user',
    version: 1,
  }
  delete next.thumbnail
  validatePatternJSON(next)
  const hash = patternContentHash(next)
  next.version = options?.id
    ? previousHash && hash !== previousHash
      ? previousVersion + 1
      : previousVersion
    : 1

  await writeAtomic(patternPath(ownerId, id), {
    schemaVersion: 1,
    createdAt,
    updatedAt: now,
    record: next,
  })
  return toDocument(next, { createdAt, updatedAt: now })
}

export async function renameUserPattern(
  ownerId: string,
  patternId: string,
  metadata: { name?: string; description?: string; category?: string },
): Promise<UserPatternDocument> {
  const stored = await readStored(ownerId, patternId)
  const record: PatternJSON = {
    ...stored.record,
    name: metadata.name ?? stored.record.name,
    description: metadata.description ?? stored.record.description,
    category: metadata.category ?? stored.record.category,
  }
  validatePatternJSON(record)
  const now = new Date().toISOString()
  await writeAtomic(patternPath(ownerId, patternId), {
    schemaVersion: 1,
    createdAt: stored.createdAt,
    updatedAt: now,
    record,
  })
  return toDocument(record, { createdAt: stored.createdAt, updatedAt: now })
}

export async function deleteUserPattern(ownerId: string, patternId: string): Promise<void> {
  await rm(patternPath(ownerId, patternId), { force: false })
}
