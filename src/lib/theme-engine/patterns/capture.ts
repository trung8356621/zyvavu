import { chromium } from '@playwright/test'
import sharp from 'sharp'
import type { PayloadRequest } from 'payload'
import { canonicalPublicOrigin } from '@/lib/site/origin'
import { resolveActiveThemeId } from '../resolver'
import { signCaptureTicket, type CaptureTicket } from './server'
import { measurePatternCapture, PATTERN_CAPTURE_WIDTH } from './capture-bounds'
let captureQueue: Promise<void> = Promise.resolve()
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
  ticket = { ...ticket, expires: Date.now() + 90000 }
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: process.env.PATTERN_CHROMIUM_EXECUTABLE_PATH || undefined,
    })
    const context = await browser.newContext({
      viewport: { width: PATTERN_CAPTURE_WIDTH, height: 800 },
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
      for (const image of document.images) image.loading = 'eager'
      await Promise.all([...document.images].map((image) => image.decode().catch(() => {})))
      const root = document.querySelector<HTMLElement>('[data-pattern-capture="ready"]')!
      let previous = ''
      let stable = 0
      for (let frame = 0; frame < 60; frame++) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
        const layout = [root, ...root.querySelectorAll('*')].map((element) => {
          const rect = element.getBoundingClientRect()
          return [rect.x, rect.y, rect.width, rect.height]
        })
        const current = JSON.stringify(layout)
        stable = current === previous ? stable + 1 : 0
        if (stable >= 3) return
        previous = current
      }
      throw new Error('Pattern layout did not stabilize before capture')
    })
    const clip = await page
      .locator('[data-pattern-capture="ready"]')
      .evaluate(measurePatternCapture)
    await page.evaluate(({ width, height }) => {
      // Shadows do not contribute to scrollHeight. Extend the document without
      // changing the viewport or the pattern's layout before the full-page clip.
      const extent = document.createElement('div')
      extent.setAttribute('aria-hidden', 'true')
      Object.assign(extent.style, {
        position: 'absolute',
        left: `${width - 1}px`,
        top: `${height - 1}px`,
        width: '1px',
        height: '1px',
        pointerEvents: 'none',
      })
      document.body.append(extent)
    }, clip)
    const screenshot = await page.screenshot({
      type: 'png',
      clip,
      fullPage: true,
      animations: 'disabled',
      timeout: 15000,
    })
    return sharp(screenshot).resize({ width: clip.width }).webp({ quality: 90 }).toBuffer()
  } finally {
    try {
      await browser?.close()
    } finally {
      release()
    }
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
