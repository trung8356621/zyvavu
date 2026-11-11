'use client'

import React from 'react'
import { NavLink, Stack, Text } from '@mantine/core'
import type { LibraryView } from './mediaLibraryQuery'

export function MediaLibraryNavigation({
  value,
  onChange,
  allowedKind,
  onOpenBuiltInIcons,
}: {
  value: LibraryView | 'builtin-icons'
  onChange: (kind: LibraryView) => void
  allowedKind?: 'image' | 'video'
  onOpenBuiltInIcons?: () => void
}) {
  return (
    <Stack gap="xs" component="nav" aria-label="Media library categories">
      <Text size="xs" fw={600} c="dimmed">
        MY LIBRARY
      </Text>
      {!allowedKind && (
        <NavLink label="All Media" active={value === 'all'} onClick={() => onChange('all')} />
      )}
      {(!allowedKind || allowedKind === 'image') && (
        <NavLink label="Images" active={value === 'image'} onClick={() => onChange('image')} />
      )}
      {(!allowedKind || allowedKind === 'video') && (
        <NavLink label="Videos" active={value === 'video'} onClick={() => onChange('video')} />
      )}
      {onOpenBuiltInIcons && (
        <NavLink
          component="button"
          type="button"
          label="Built-in icons"
          active={value === 'builtin-icons'}
          onClick={onOpenBuiltInIcons}
        />
      )}
      <Text size="xs" fw={600} c="dimmed" mt="md">
        DEMO ASSETS
      </Text>
      {(!allowedKind || allowedKind === 'image') && (
        <NavLink
          label="Demo Images"
          active={value === 'demo-image'}
          onClick={() => onChange('demo-image')}
        />
      )}
      {(!allowedKind || allowedKind === 'video') && (
        <NavLink
          label="Demo Videos"
          active={value === 'demo-video'}
          onClick={() => onChange('demo-video')}
        />
      )}
    </Stack>
  )
}
