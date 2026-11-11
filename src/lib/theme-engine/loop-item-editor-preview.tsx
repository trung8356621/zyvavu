'use client'

import React from 'react'
import type { ThemeComponentData, ThemeDataContext, ThemeTemplateDocument } from './types'
import { ItemTitleFrontend } from '@/widgets/ItemTitle/frontend'
import { ItemImageFrontend } from '@/widgets/ItemImage/frontend'
import { ItemExcerptFrontend } from '@/widgets/ItemExcerpt/frontend'
import { ItemLinkFrontend } from '@/widgets/ItemLink/frontend'
import { ItemDateFrontend } from '@/widgets/ItemDate/frontend'
import { TextBlockFrontend } from '@/widgets/TextBlock/frontend'
import { createAtomRenderer } from '@/widgets/atoms/frontend'

const PREVIEW: Record<string, React.ComponentType<any>> = {
  ItemTitle: ItemTitleFrontend,
  ItemImage: ItemImageFrontend,
  ItemExcerpt: ItemExcerptFrontend,
  ItemLink: ItemLinkFrontend,
  ItemDate: ItemDateFrontend,
  TextBlock: TextBlockFrontend,
  Heading: createAtomRenderer('Heading'),
  Text: createAtomRenderer('Text'),
  Button: createAtomRenderer('Button'),
  Image: createAtomRenderer('Image'),
  Video: createAtomRenderer('Video'),
}

function walkNodes(
  nodes: ThemeComponentData[] | undefined,
  dataContext: ThemeDataContext,
  keyPrefix: string,
): React.ReactNode[] {
  if (!Array.isArray(nodes) || nodes.length === 0) return []
  const out: React.ReactNode[] = []
  nodes.forEach((node, idx) => {
    if (!node || typeof node !== 'object') return
    // Nested Collection Loops are out of scope — skip rather than recurse.
    if (
      node.type === 'CollectionLoop' ||
      node.type === 'PostCollection' ||
      node.type === 'FeaturedPost' ||
      node.type === 'RecentPosts'
    ) {
      return
    }
    const Component = PREVIEW[node.type]
    const nestedSlots: React.ReactNode[] = []
    for (const [propKey, value] of Object.entries(node.props || {})) {
      if (
        Array.isArray(value) &&
        value.some((v) => v && typeof v === 'object' && 'type' in v && 'props' in v)
      ) {
        nestedSlots.push(
          ...walkNodes(value as ThemeComponentData[], dataContext, `${keyPrefix}-${propKey}`),
        )
      }
    }
    if (Component) {
      out.push(
        <Component
          key={`${keyPrefix}-${node.props?.id || idx}`}
          {...node.props}
          dataContext={dataContext}
        />,
      )
    }
    out.push(...nestedSlots)
  })
  return out
}

/** Client-safe Loop Item Template preview (no Payload / ThemeRenderer). */
export function LoopItemEditorPreview({
  document,
  dataContext,
}: {
  document: ThemeTemplateDocument
  dataContext: ThemeDataContext
}) {
  const fromContent = walkNodes(document.content, dataContext, 'c')
  const fromZones: React.ReactNode[] = []
  if (document.zones) {
    for (const [zoneKey, items] of Object.entries(document.zones)) {
      fromZones.push(...walkNodes(items, dataContext, `z-${zoneKey}`))
    }
  }
  const nodes = [...fromContent, ...fromZones]
  if (nodes.length === 0) {
    return (
      <div style={{ color: '#94a3b8', fontSize: 13 }}>Empty Loop Item Template</div>
    )
  }
  return <>{nodes}</>
}
