import { getPayload } from 'payload'
import config from '@/payload.config'
import { isSiteStaff } from '@/access/roles'
import { SYSTEM_PATTERNS } from '@/lib/theme-engine/patterns/catalog'
import { capturePatternWebP } from '@/lib/theme-engine/patterns/capture'
import { patternContentHash } from '@/lib/theme-engine/patterns/server'
import {
  thumbnailCacheKey,
  visualDependencyHash,
} from '@/lib/theme-engine/patterns/thumbnail-cache'
import { resolveActiveThemeConfig } from '@/lib/theme-engine/styles'
import { resolveActiveThemeId } from '@/lib/theme-engine/resolver'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const pending = new Map<string, Promise<Buffer>>()
export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  if (!isSiteStaff(user)) return new Response(null, { status: 403 })
  const { key } = await params
  const record = SYSTEM_PATTERNS.find((pattern) => pattern.id === key)
  if (!record) return new Response(null, { status: 404 })
  const themeId = await resolveActiveThemeId(payload)
  const theme = await resolveActiveThemeConfig(payload, themeId)
  const hash = thumbnailCacheKey(record, theme, await visualDependencyHash())
  const directory = path.resolve('private/system-pattern-thumbnails')
  const file = path.join(directory, `${hash}.webp`)
  const responseHeaders = {
    'content-type': 'image/webp',
    'cache-control': 'private, no-cache',
    etag: `"${hash}"`,
  }
  if (request.headers.get('if-none-match') === `"${hash}"`)
    return new Response(null, { status: 304, headers: responseHeaders })
  try {
    let buffer: Buffer
    try {
      buffer = await readFile(file)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      let job = pending.get(hash)
      if (!job) {
        job = (async () => {
          const image = await capturePatternWebP({
            key,
            hash: patternContentHash(record),
            themeId,
            expires: Date.now() + 90000,
          })
          await mkdir(directory, { recursive: true })
          await writeFile(file, image)
          return image
        })().finally(() => pending.delete(hash))
        pending.set(hash, job)
      }
      buffer = await job
    }
    return new Response(new Uint8Array(buffer), { headers: responseHeaders })
  } catch (error) {
    payload.logger.warn({ msg: 'System pattern thumbnail capture failed', err: error })
    return Response.json(
      { message: 'Thumbnail unavailable; retry to capture again.' },
      { status: 503, headers: { 'cache-control': 'no-store' } },
    )
  }
}
