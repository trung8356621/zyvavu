'use client'

import { SegmentedControl } from '@mantine/core'
import { LayoutGrid, Table2 } from 'lucide-react'
import React from 'react'

import type { MediaLibraryView } from './mediaLibraryPreference'

type MediaLibraryViewSwitcherProps = {
  onChange: (view: MediaLibraryView) => void
  value: MediaLibraryView
}

export function MediaLibraryViewSwitcher({ onChange, value }: MediaLibraryViewSwitcherProps) {
  return (
    <SegmentedControl
      aria-label="Media library view"
      className="zyvavu-media-view-switcher"
      color="brand"
      data={[
        {
          label: (
            <span className="zyvavu-media-view-switcher__option">
              <LayoutGrid aria-hidden="true" size={16} />
              <span>Grid</span>
            </span>
          ),
          value: 'grid',
        },
        {
          label: (
            <span className="zyvavu-media-view-switcher__option">
              <Table2 aria-hidden="true" size={16} />
              <span>Table</span>
            </span>
          ),
          value: 'table',
        },
      ]}
      onChange={(next) => onChange(next as MediaLibraryView)}
      size="sm"
      value={value}
    />
  )
}
