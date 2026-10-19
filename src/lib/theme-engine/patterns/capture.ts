import { chromium } from '@playwright/test'
import sharp from 'sharp'
import type { PayloadRequest } from 'payload'
import { canonicalPublicOrigin } from '@/lib/site/origin'
import { resolveActiveThemeId } from '../resolver'
import { signCaptureTicket, type CaptureTicket } from './server'
let captureActive = false
export async function capturePatternWebP(
  ticket: CaptureTicket,
  origin = canonicalPublicOrigin(),
  secret = process.env.PAYLOAD_SECRET || '',
): Promise<Buffer> {
  if (captureActive) throw new Error('A thumbnail capture is already running')
  captureActive = true
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: process.env.PATTERN_CHROMIUM_EXECUTABLE_PATH || undefined,
    })
    const context = await browser.newContext({
      viewport: { width: 1200, height: 800 },
      deviceScaleFactor: 2,
      reducedMotion: 'reduce',
      serviceWorkers: 'block',
    })
    const url = new URL(
      `/pattern-preview/${encodeURIComponent(ticket.key)}?theme=${encodeURIComponent(ticket.themeId)}`,
      origin,
    )
    const signed = signCaptureTicket(ticket, secret)
    await context.route('**/*', async (route) => {
      const request = route.request()
      const target = new URL(request.url())
      if (request.method() !== 'GET' || target.origin !== url.origin) return route.abort()
      if (target.pathname === url.pathname)
        return route.continue({ headers: { ...request.headers(), 'x-pattern-capture': signed } })
      if (/^\/(?:_next\/static\/|pattern-library\/|api\/media\/file\/)/.test(target.pathname))
        return route.continue()
      return route.abort()
    })
    const page = await context.newPage()
    const response = await page.goto(url.href, { waitUntil: 'networkidle', timeout: 30000 })
    if (!response?.ok()) throw new Error('Protected pattern preview was unavailable')
    await page.locator('[data-pattern-capture="ready"]').waitFor({ timeout: 15000 })
    await page.evaluate(async () => {
      await document.fonts.ready
      await Promise.all([...document.images].map((image) => image.decode().catch(() => {})))
    })
    const screenshot = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: 1200, height: 800 },
      animations: 'disabled',
      timeout: 15000,
    })
    return sharp(screenshot).resize(1200, 800).webp({ quality: 90 }).toBuffer()
  } finally {
    await browser?.close()
    captureActive = false
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
