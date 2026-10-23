import sharp from 'sharp'
import type { Endpoint, PayloadRequest } from 'payload'
import { isSiteStaff } from '@/access/roles'
import { DEMO_MEDIA, demoFilename, type DemoAsset } from './demo-catalog'

const MAX_BYTES = 8 * 1024 * 1024
const inFlight = new WeakMap<PayloadRequest['payload'], Map<string, Promise<unknown>>>()

async function download(asset: DemoAsset) {
  // Source comes exclusively from the reviewed manifest, never from client URLs.
  const response = await fetch(asset.sourceURL, {
    redirect: 'error',
    signal: AbortSignal.timeout(20000),
    headers: { 'User-Agent': 'ZyvavuDemoMedia/1.0 (on-demand theme asset import)' },
  })
  if (!response.ok || !response.headers.get('content-type')?.startsWith(`${asset.kind}/`))
    throw new Error('Demo source unavailable.')
  if (Number(response.headers.get('content-length')) > MAX_BYTES || !response.body)
    throw new Error('Demo source exceeds download limit.')
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > MAX_BYTES) throw new Error('Demo source exceeds download limit.')
      chunks.push(value)
    }
  } finally {
    await reader.cancel()
  }
  return Buffer.concat(chunks)
}

async function importAsset(
  req: PayloadRequest,
  asset: DemoAsset,
): Promise<{
  id: number | string
  url?: string | null
  mimeType?: string | null
  posterUrl?: string | null
  posterMediaId?: number | string
}> {
  const name = demoFilename(asset)
  const existing = await req.payload.find({
    collection: 'media',
    where: { filename: { equals: name } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    req,
  })
  const found = existing.docs[0]
  const mimetype = asset.kind === 'video' ? 'video/mp4' : 'image/webp'
  if (found?.url && found.mimeType === mimetype) return withPoster(req, asset, found)
  const source = await download(asset)
  if (asset.kind === 'video' && source.toString('ascii', 4, 8) !== 'ftyp')
    throw new Error('Invalid demo video.')
  const data =
    asset.kind === 'video'
      ? source
      : await sharp(source, { limitInputPixels: 16000000 })
          .rotate()
          .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 78 })
          .toBuffer()
  // Payload owns storage, validation and access checks. No direct DB/filesystem writes.
  const doc = await req.payload.create({
    collection: 'media',
    overrideAccess: false,
    req,
    data: { alt: `${asset.label} — ${asset.credit}` },
    file: { data, name, mimetype, size: data.length },
  })
  return withPoster(req, asset, doc)
}

async function withPoster(
  req: PayloadRequest,
  asset: DemoAsset,
  doc: { id: number | string; url?: string | null; mimeType?: string | null },
) {
  if (!asset.posterAssetId) return doc
  const posterAsset = DEMO_MEDIA.find(
    (entry) => entry.id === asset.posterAssetId && entry.kind === 'image',
  )
  if (!posterAsset) throw new Error('Missing demo poster.')
  const poster = await importAsset(req, posterAsset)
  if (!poster.url) throw new Error('Poster import failed.')
  return { ...doc, posterUrl: poster.url, posterMediaId: poster.id }
}

export const importDemoEndpoint: Endpoint = {
  path: '/demo-import',
  method: 'post',
  handler: async (req) => {
    if (!isSiteStaff(req.user)) return Response.json({ error: 'Forbidden' }, { status: 403 })
    let id: unknown
    try {
      id = (await req.json?.())?.id
    } catch {
      return Response.json({ error: 'Invalid request.' }, { status: 400 })
    }
    const asset = DEMO_MEDIA.find((entry) => entry.id === id)
    if (!asset) return Response.json({ error: 'Unknown demo asset.' }, { status: 400 })
    let pending = inFlight.get(req.payload)
    if (!pending) {
      pending = new Map()
      inFlight.set(req.payload, pending)
    }
    const active = pending.get(asset.id)
    if (active) {
      try {
        return Response.json({ doc: await active })
      } catch {
        return Response.json({ error: 'Import failed. Please retry.' }, { status: 502 })
      }
    }
    const operation = importAsset(req, asset)
    pending.set(asset.id, operation)
    try {
      return Response.json({ doc: await operation })
    } catch {
      return Response.json(
        { error: 'Import failed. Your current media has not changed.' },
        { status: 502 },
      )
    } finally {
      pending.delete(asset.id)
    }
  },
}
