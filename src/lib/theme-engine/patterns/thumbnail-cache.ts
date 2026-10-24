import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import type { PatternJSON } from './json'
import type { ThemeConfig } from '../types'
import { PATTERN_CAPTURE_VERSION, PATTERN_CAPTURE_WIDTH } from './capture-bounds'

// Include renderer/style sources as well as JSON and resolved tokens. No DB writes.
export async function visualDependencyHash() {
  const hash = createHash('sha256')
  async function visit(directory: string) {
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const file = path.join(directory, entry.name)
      if (entry.isDirectory()) await visit(file)
      else if (/\.(tsx?|css|json)$/.test(entry.name)) {
        hash.update(file).update(await readFile(file))
      }
    }
  }
  for (const directory of [
    'src/widgets',
    'src/lib/style-engine',
    'src/lib/theme-engine',
    'src/app/(pattern-preview)',
  ])
    await visit(directory)
  return hash.digest('hex')
}

export function thumbnailCacheKey(record: PatternJSON, theme: ThemeConfig, dependencies: string) {
  return createHash('sha256')
    .update(
      JSON.stringify({
        payload: record.payload,
        theme,
        dependencies,
        captureVersion: PATTERN_CAPTURE_VERSION,
        width: PATTERN_CAPTURE_WIDTH,
        height: 'content',
      }),
    )
    .digest('hex')
}
