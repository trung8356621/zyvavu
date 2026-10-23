'use client'

import NextImage from 'next/image'
import { Checkbox, Text, Tooltip } from '@mantine/core'
import { File, FileText, Film, ImageOff } from 'lucide-react'
import { Link } from '@payloadcms/ui'
import React, { useState } from 'react'

import {
  mediaDimensionsLabel,
  mediaFileKind,
  mediaPreviewSrc,
  prefersTransparencyBackdrop,
  type MediaListDoc,
} from './mediaThumbnail'

type MediaGridCardProps = {
  doc: MediaListDoc
  href: string
  onToggleSelect: (id: number | string) => void
  selected: boolean
}

function FallbackIcon({ kind }: { kind: ReturnType<typeof mediaFileKind> }) {
  if (kind === 'pdf') return <FileText aria-hidden="true" size={28} />
  if (kind === 'video') return <Film aria-hidden="true" size={28} />
  if (kind === 'image') return <ImageOff aria-hidden="true" size={28} />
  return <File aria-hidden="true" size={28} />
}

export function MediaGridCard({ doc, href, onToggleSelect, selected }: MediaGridCardProps) {
  const [broken, setBroken] = useState(false)
  const filename = doc.filename?.trim() || 'Untitled file'
  const kind = mediaFileKind(doc.mimeType)
  const candidate = mediaPreviewSrc(doc)
  const src = broken
    ? null
    : doc.thumbnailURL || (candidate?.startsWith('/api/media/file/') ? candidate : null)
  const dimensions = mediaDimensionsLabel(doc.width, doc.height)
  const checkerboard = prefersTransparencyBackdrop(doc.mimeType)

  return (
    <article
      className={selected ? 'zyvavu-media-card zyvavu-media-card--selected' : 'zyvavu-media-card'}
      data-media-kind={kind}
    >
      <div className="zyvavu-media-card__select">
        <Checkbox
          aria-label={`Select ${filename}`}
          checked={selected}
          color="brand"
          onChange={() => onToggleSelect(doc.id)}
          onClick={(event) => event.stopPropagation()}
          size="sm"
        />
      </div>
      <Link className="zyvavu-media-card__link" href={href} prefetch={false}>
        <div
          className={
            checkerboard
              ? 'zyvavu-media-card__frame zyvavu-media-card__frame--checker'
              : 'zyvavu-media-card__frame'
          }
        >
          {src ? (
            src.startsWith('/api/media/file/') ? (
              <NextImage
                width={240}
                height={160}
                sizes="(max-width: 48em) 45vw, 180px"
                alt={doc.alt?.trim() || filename}
                className="zyvavu-media-card__image"
                loading="lazy"
                onError={() => setBroken(true)}
                src={src}
              />
            ) : (
              <img
                alt={doc.alt?.trim() || filename}
                className="zyvavu-media-card__image"
                decoding="async"
                loading="lazy"
                onError={() => setBroken(true)}
                src={src}
              />
            )
          ) : (
            <span className="zyvavu-media-card__fallback">
              <FallbackIcon kind={kind} />
            </span>
          )}
        </div>
        <div className="zyvavu-media-card__meta">
          <Tooltip label={filename} maw={320} multiline openDelay={300}>
            <Text component="p" size="sm" title={filename} truncate="end">
              {filename}
            </Text>
          </Tooltip>
          {dimensions ? (
            <Text c="dimmed" component="p" size="xs">
              {dimensions}
            </Text>
          ) : null}
        </div>
      </Link>
    </article>
  )
}
