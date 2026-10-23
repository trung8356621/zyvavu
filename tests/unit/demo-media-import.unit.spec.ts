// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'
import type { PayloadRequest } from 'payload'
import { importDemoEndpoint } from '@/lib/media/import-demo'
import { DEMO_MEDIA, demoFilename } from '@/lib/media/demo-catalog'

function request(options: { existing?: boolean; role?: string; id?: string } = {}) {
  const doc = { id: 42, url: '/api/media/file/demo.webp', mimeType: 'image/webp' }
  const payload = {
    find: vi.fn().mockResolvedValue({ docs: options.existing ? [doc] : [] }),
    create: vi.fn().mockResolvedValue(doc),
  }
  const req = {
    user: { role: options.role || 'site-admin' },
    payload,
    json: async () => ({ id: options.id || DEMO_MEDIA[0].id }),
  } as unknown as PayloadRequest
  return { req, payload, doc }
}
afterEach(() => vi.unstubAllGlobals())

describe('reviewed demo media import', () => {
  it('rejects unauthorized callers and unknown IDs without downloading or writing', async () => {
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    const denied = request({ role: 'reader' })
    expect((await importDemoEndpoint.handler(denied.req)).status).toBe(403)
    const unknown = request({ id: 'https://untrusted.test/file' })
    expect((await importDemoEndpoint.handler(unknown.req)).status).toBe(400)
    expect(fetcher).not.toHaveBeenCalled()
    expect(denied.payload.create).not.toHaveBeenCalled()
    expect(unknown.payload.create).not.toHaveBeenCalled()
  })
  it('returns existing Media ID without another download or upload', async () => {
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    const { req, payload } = request({ existing: true })
    const response = await importDemoEndpoint.handler(req)
    expect((await response.json()).doc.id).toBe(42)
    expect(payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        overrideAccess: false,
        where: { filename: { equals: demoFilename(DEMO_MEDIA[0]) } },
      }),
    )
    expect(fetcher).not.toHaveBeenCalled()
    expect(payload.create).not.toHaveBeenCalled()
  })
  it('imports optimized WebP through Payload and coalesces concurrent selection', async () => {
    const image = await sharp({
      create: { width: 12, height: 8, channels: 3, background: '#123456' },
    })
      .jpeg()
      .toBuffer()
    const fetcher = vi
      .fn()
      .mockImplementation(
        async () => new Response(image, { headers: { 'content-type': 'image/jpeg' } }),
      )
    vi.stubGlobal('fetch', fetcher)
    const { req, payload } = request()
    const responses = await Promise.all([
      importDemoEndpoint.handler(req),
      importDemoEndpoint.handler(req),
    ])
    expect(responses.every((response) => response.status === 200)).toBe(true)
    expect(payload.create).toHaveBeenCalledTimes(1)
    const upload = payload.create.mock.calls[0][0]
    expect(upload.overrideAccess).toBe(false)
    expect(upload.file.name).toBe(demoFilename(DEMO_MEDIA[0]))
    expect((await sharp(upload.file.data).metadata()).format).toBe('webp')
    expect(fetcher).toHaveBeenCalledWith(
      DEMO_MEDIA[0].sourceURL,
      expect.objectContaining({ redirect: 'error' }),
    )
  })
  it('does not create a broken reference when download or optimization fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response('invalid image', { headers: { 'content-type': 'image/jpeg' } }),
        ),
    )
    const { req, payload } = request()
    expect((await importDemoEndpoint.handler(req)).status).toBe(502)
    expect(payload.create).not.toHaveBeenCalled()
  })
  it('refuses oversized downloads before creating media', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('x', {
          headers: { 'content-type': 'image/jpeg', 'content-length': '9000000' },
        }),
      ),
    )
    const { req, payload } = request()
    expect((await importDemoEndpoint.handler(req)).status).toBe(502)
    expect(payload.create).not.toHaveBeenCalled()
  })
  it('imports a bounded MP4 and local poster; reuses both on subsequent selection', async () => {
    const video = DEMO_MEDIA.find((asset) => asset.kind === 'video')!
    const poster = await sharp({
      create: { width: 12, height: 8, channels: 3, background: '#123456' },
    })
      .jpeg()
      .toBuffer()
    const mp4 = Buffer.from([0, 0, 0, 24, ...Buffer.from('ftypisom'), 0, 0, 0, 0])
    const fetcher = vi
      .fn()
      .mockImplementation(async (url: string) =>
        url === video.sourceURL
          ? new Response(mp4, { headers: { 'content-type': 'video/mp4' } })
          : new Response(poster, { headers: { 'content-type': 'image/jpeg' } }),
      )
    vi.stubGlobal('fetch', fetcher)
    const { req, payload } = request({ id: video.id })
    const saved = new Map()
    payload.find.mockImplementation(async (args) => ({
      docs: saved.has(args.where.filename.equals) ? [saved.get(args.where.filename.equals)] : [],
    }))
    payload.create.mockImplementation(async (args) => {
      const doc = {
        id: saved.size + 1,
        url: `/media/${args.file.name}`,
        mimeType: args.file.mimetype,
      }
      saved.set(args.file.name, doc)
      return doc
    })
    const first = await (await importDemoEndpoint.handler(req)).json()
    expect(first.doc.mimeType).toBe('video/mp4')
    expect(first.doc.posterUrl).toMatch(/^\/media\/.*\.webp$/)
    expect(first.doc.posterMediaId).toBe(2)
    await importDemoEndpoint.handler(req)
    expect(payload.create).toHaveBeenCalledTimes(2)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
