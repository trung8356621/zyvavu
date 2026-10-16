export type MediaFileKind = 'image' | 'video' | 'pdf' | 'file'

export type MediaListDoc = {
  alt?: string | null
  filename?: string | null
  height?: number | null
  id: number | string
  mimeType?: string | null
  thumbnailURL?: string | null
  url?: string | null
  width?: number | null
}

export function mediaFileKind(mimeType?: string | null): MediaFileKind {
  if (!mimeType) return 'file'
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('image/')) return 'image'
  return 'file'
}

export function mediaPreviewSrc(
  doc: Pick<MediaListDoc, 'mimeType' | 'thumbnailURL' | 'url'>,
): string | null {
  const kind = mediaFileKind(doc.mimeType)
  const thumbnail = doc.thumbnailURL?.trim() || null
  const original = doc.url?.trim() || null

  if (kind === 'image') return thumbnail || original
  if (thumbnail && (kind === 'video' || kind === 'pdf')) return thumbnail
  return null
}

export function prefersTransparencyBackdrop(mimeType?: string | null): boolean {
  if (!mimeType?.startsWith('image/')) return false
  return mimeType !== 'image/jpeg' && mimeType !== 'image/jpg'
}

export function mediaDimensionsLabel(width?: number | null, height?: number | null): string | null {
  if (typeof width !== 'number' || typeof height !== 'number' || width <= 0 || height <= 0) return null
  return `${width} × ${height}`
}
