/** Explicit release task. Captures only the system IDs supplied on the command line. */
import { config as loadEnv } from 'dotenv'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { SYSTEM_PATTERNS } from '../src/lib/theme-engine/patterns/catalog'
import { isComplexPattern } from '../src/lib/theme-engine/patterns/json'
import { patternContentHash } from '../src/lib/theme-engine/patterns/server'
import { capturePatternWebP } from '../src/lib/theme-engine/patterns/capture'
loadEnv({ path: '.env.local' })
loadEnv()
const ids = process.argv.slice(2)
if (!ids.length)
  throw new Error(
    'Supply explicit system pattern IDs. No automatic catalog-wide capture is performed.',
  )
const output = path.resolve('public/pattern-library')
await mkdir(output, { recursive: true })
for (const id of ids) {
  const pattern = SYSTEM_PATTERNS.find((record) => record.id === id)
  if (!pattern || !isComplexPattern(pattern))
    throw new Error(`Unsupported complex system pattern: ${id}`)
  const buffer = await capturePatternWebP({
    key: id,
    hash: patternContentHash(pattern),
    themeId: process.env.PATTERN_CAPTURE_THEME_ID || 'corporate',
    expires: Date.now() + 90000,
  })
  await writeFile(path.join(output, `${id}-v${pattern.version}.webp`), buffer)
  process.stdout.write(`Prepared ${id} v${pattern.version}\n`)
}
