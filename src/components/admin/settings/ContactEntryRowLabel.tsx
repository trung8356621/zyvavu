'use client'

import React from 'react'

type RowLabelProps = {
  data?: {
    key?: string | null
    value?: string | null
    entryId?: string | null
  }
  rowNumber?: number
}

export function ContactEntryRowLabel({ data, rowNumber }: RowLabelProps) {
  const key = data?.key?.trim()
  const value = data?.value?.trim()
  if (key && value) return <span>{`${key}: ${value}`}</span>
  if (key) return <span>{key}</span>
  if (data?.entryId) return <span>{data.entryId}</span>
  return <span>{`Contact entry ${typeof rowNumber === 'number' ? rowNumber + 1 : ''}`}</span>
}
