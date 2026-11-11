import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import type { PayloadRequest } from 'payload'
import { canonicalPublicOrigin } from '@/lib/site/origin'
import { resolveActiveThemeId } from '../resolver'
import type { CaptureTicket } from './server'

const execFileAsync = promisify(execFile)
const workerPath = path.resolve(process.cwd(), 'scripts/pattern-capture-worker.mts')

let captureQueue: Promise<void> = Promise.resolve()

/** Spawns an out-of-process worker so Playwright never enters the Next/Turbopack graph. */
export async function capturePatternWebP(
  ticket: CaptureTicket,
  origin = canonicalPublicOrigin(),
  secret = process.env.PAYLOAD_SECRET || '',
): Promise<Buffer> {
  const previous = captureQueue
  let release!: () => void
  captureQueue = new Promise<void>((resolve) => {
    release = resolve
  })
  await previous
  const workDir = await mkdtemp(path.join(tmpdir(), 'zyvavu-pattern-cap-'))
  const outFile = path.join(workDir, 'out.webp')
  try {
    const payload = {
      ticket: { ...ticket, expires: Date.now() + 90000 },
      origin,
      secret,
      outFile,
    }
    await execFileAsync(
      process.execPath,
      ['--import', 'tsx', workerPath, JSON.stringify(payload)],
      {
        timeout: 120_000,
        maxBuffer: 2 * 1024 * 1024,
        env: process.env,
        windowsHide: true,
      },
    )
    return await readFile(outFile)
  } finally {
    release()
    await rm(workDir, { recursive: true, force: true }).catch(() => {})
  }
}

export async function generateUserPatternThumbnail(req: PayloadRequest): Promise<Response> {
  const id = String(req.routeParams?.id || '')
  let doc
  try {
    doc = await req.payload.findByID({
      collection: 'widget-patterns',
      id,
      overrideAccess: false,
      req,
      depth: 0,
    })
  } catch {
    return Response.json({ message: 'Pattern unavailable' }, { status: 404 })
  }
  const hash = doc.contentHash
  try {
    const buffer = await capturePatternWebP({
      key: `user-${id}`,
      hash,
      owner: String(req.user!.id),
      themeId: await resolveActiveThemeId(req.payload),
      expires: Date.now() + 90000,
    })
    const updated = await req.payload.update({
      collection: 'widget-patterns',
      id,
      overrideAccess: false,
      req,
      context: { patternThumbnail: true, expectedPatternHash: hash },
      data: { thumbnailStatus: 'ready', thumbnailHash: hash },
      file: {
        data: buffer,
        mimetype: 'image/webp',
        name: `pattern-${id}-${hash.slice(0, 16)}.webp`,
        size: buffer.length,
      },
    })
    return Response.json({ doc: updated })
  } catch (error) {
    req.payload.logger.warn({
      msg: 'Pattern thumbnail unavailable; canonical JSON was preserved',
      err: error,
    })
    try {
      await req.payload.update({
        collection: 'widget-patterns',
        id,
        overrideAccess: false,
        req,
        context: { patternThumbnail: true, expectedPatternHash: hash },
        data: { thumbnailStatus: 'failed' },
      })
    } catch {
      /* A newer edit or deletion must not be overwritten. */
    }
    return Response.json(
      {
        message: 'Thumbnail unavailable. Pattern JSON is saved; retry later.',
        thumbnailStatus: 'failed',
      },
      { status: 503 },
    )
  }
}
