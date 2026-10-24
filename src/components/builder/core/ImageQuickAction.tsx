'use client'

import React from 'react'
import { createUsePuck } from '@puckeditor/core'
import { MediaSourcePicker } from '@/components/admin/media/MediaSourcePicker'

const usePuck = createUsePuck()

/** Updates the original image by ID, even if its index changes while the picker is open. */
export function ImageQuickAction({ id, beforeOperation }: { id: string; beforeOperation: () => boolean }) {
  const getItemById = usePuck((s) => s.getItemById)
  const getSelectorForId = usePuck((s) => s.getSelectorForId)
  const getPermissions = usePuck((s) => s.getPermissions)
  const dispatch = usePuck((s) => s.dispatch)
  const item = getItemById(id)
  if (item?.type !== 'Image') return null

  return (
    <MediaSourcePicker
      kind="image"
      triggerLabel="Change Image"
      disabled={!getPermissions({ item }).edit}
      onSelect={(media) => {
        const current = getItemById(id)
        const selector = getSelectorForId(id)
        if (!media.url || current?.type !== 'Image' || !selector ||
          !getPermissions({ item: current }).edit || !beforeOperation()) return
        dispatch({
          type: 'replace',
          destinationIndex: selector.index,
          destinationZone: selector.zone,
          data: { ...current, props: { ...current.props, src: media.url } },
        })
      }}
    />
  )
}
