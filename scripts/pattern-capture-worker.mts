/**
 * Out-of-process pattern thumbnail capture.
 * Kept outside the Next/Turbopack module graph so Playwright/sharp never reach the browser bundle.
 */
import { writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'
import sharp from 'sharp'
import {
  signCaptureTicket,
  type CaptureTicket,
} from '../src/lib/theme-engine/patterns/server.ts'
import {
  measurePatternCapture,
  PATTERN_CAPTURE_WIDTH,
} from '../src/lib/theme-engine/patterns/capture-bounds.ts'

type WorkerInput = {
  ticket: CaptureTicket
  origin: string
  secret: string
  outFile: string
}

const input = JSON.parse(process.argv[2] || '') as WorkerInput
if (!input?.ticket || !input.origin || !input.outFile) {
  throw new Error('pattern-capture-worker: missing ticket/origin/outFile')
}

const ticket = { ...input.ticket, expires: Date.now() + 90000 }
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
    input.origin,
  )
  const signed = signCaptureTicket(ticket, input.secret)
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
  const clip = await page.locator('[data-pattern-capture="ready"]').evaluate(measurePatternCapture)
  await page.evaluate(({ width, height }) => {
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
  const buffer = await sharp(screenshot).resize({ width: clip.width }).webp({ quality: 90 }).toBuffer()
  writeFileSync(input.outFile, buffer)
} finally {
  await browser?.close()
}
