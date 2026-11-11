'use client'

import React from 'react'
import { createUsePuck } from '@puckeditor/core'
import { MediaSourcePicker } from '@/components/admin/media/MediaSourcePicker'

const usePuck = createUsePuck()

type MediaAtomType = 'Image' | 'Video'

/**
 * ActionBar media replace for Image / Video atoms.
 * Updates the original node by ID even if its index changes while the picker is open.
 * Wix E275/E287: draft selection does not apply until confirm; Cancel/X leaves source unchanged
 * (enforced by MediaSourcePicker — this host only commits onSelect).
 */
export function ImageQuickAction({
  id,
  beforeOperation,
  kind = 'Image',
  disabled: disabledProp = false,
  renderTrigger,
}: {
  id: string
  beforeOperation: () => boolean
  kind?: MediaAtomType
  /** When media source is dynamically bound, block manual replace. */
  disabled?: boolean
  renderTrigger?: React.ComponentProps<typeof MediaSourcePicker>['renderTrigger']
}) {
  const getItemById = usePuck((s) => s.getItemById)
  const getSelectorForId = usePuck((s) => s.getSelectorForId)
  const getPermissions = usePuck((s) => s.getPermissions)
  const dispatch = usePuck((s) => s.dispatch)
  const item = getItemById(id)
  if (item?.type !== kind) return null

  const mediaKind = kind === 'Video' ? 'video' : 'image'
  const triggerLabel = kind === 'Video' ? 'Change Video' : 'Change Image'
  const sourceBound =
    typeof item.props?.srcBinding === 'string' && item.props.srcBinding.trim().length > 0

  return (
    <MediaSourcePicker
      kind={mediaKind}
      triggerLabel={triggerLabel}
      renderTrigger={renderTrigger}
      disabled={disabledProp || sourceBound || !getPermissions({ item }).edit}
      onSelect={(media) => {
        const current = getItemById(id)
        const selector = getSelectorForId(id)
        if (
          !media.url ||
          current?.type !== kind ||
          !selector ||
          !getPermissions({ item: current }).edit ||
          !beforeOperation()
        ) {
          return
        }
        const nextProps: { id: string; [key: string]: unknown } = {
          ...current.props,
          src: media.url,
          mediaId: media.id,
        }
        if (kind === 'Video' && media.posterUrl) {
          nextProps.posterUrl = media.posterUrl
          if (media.posterMediaId != null) nextProps.posterMediaId = media.posterMediaId
        }
        dispatch({
          type: 'replace',
          destinationIndex: selector.index,
          destinationZone: selector.zone,
          data: {
            ...current,
            props: nextProps,
          },
        })
      }}
    />
  )
}
