'use client'

import React, { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { withWidgetStyleSurface } from '@/lib/style-engine/WidgetStyleSurface'
import { animationAttributes } from '@/lib/style-engine/animation-presets'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import {
  mergeItemStateStyles,
  resolveChevronStyles,
  resolveListContainerStyles,
  resolveListItemStyles,
  resolveMarkerBoxStyles,
  type ListPresentationConfig,
} from '@/lib/style-engine/list-presentation'
import type { UniversalStyle } from '@/lib/style-engine/types'
import { IconRendererStatic } from '@/lib/icons'
import { collectExpandedIds, type CategoryNode } from '@/lib/taxonomy/category-tree'

function itemStyleFor(
  presentation: ListPresentationConfig,
  opts: { active: boolean; depth: number },
): UniversalStyle | undefined {
  let base = mergeItemStateStyles(presentation.item, undefined)
  if (opts.depth === 0) base = mergeItemStateStyles(base, presentation.itemParent)
  else base = mergeItemStateStyles(base, presentation.itemChild)
  if (opts.active) base = mergeItemStateStyles(base, presentation.itemActive)
  return base
}

function Marker({
  presentation,
  index,
}: {
  presentation: ListPresentationConfig
  index: number
}) {
  const marker = presentation.marker
  if (!marker || marker.mode === 'none') return null
  const box = resolveMarkerBoxStyles(marker)
  if (marker.mode === 'number') {
    return (
      <span className="zyvavu-widget-category-list__marker" style={box} aria-hidden>
        {index + 1}
      </span>
    )
  }
  if (marker.mode === 'icon' && marker.icon) {
    return (
      <span className="zyvavu-widget-category-list__marker" style={box} aria-hidden>
        <IconRendererStatic icon={marker.icon} size={14} decorative />
      </span>
    )
  }
  return null
}

export function CategoryListView({
  roots,
  presentation,
  currentId,
  showCounts,
  autoExpandActive,
  initialExpanded = 'none',
  style,
  surfaceId,
}: {
  roots: CategoryNode[]
  presentation: ListPresentationConfig
  currentId?: number | null
  showCounts?: boolean
  autoExpandActive?: boolean
  initialExpanded?: 'none' | 'roots' | 'all'
  style?: UniversalStyle
  surfaceId?: string
}) {
  const [expanded, setExpanded] = useState<Set<number>>(() => {
    const next = collectExpandedIds(roots, currentId, autoExpandActive !== false)
    if (initialExpanded === 'roots') {
      roots.forEach((n) => {
        if (n.children.length) next.add(n.id)
      })
    } else if (initialExpanded === 'all') {
      const walk = (nodes: CategoryNode[]) => {
        nodes.forEach((n) => {
          if (n.children.length) next.add(n.id)
          walk(n.children)
        })
      }
      walk(roots)
    }
    return next
  })

  useEffect(() => {
    if (autoExpandActive === false) return
    setExpanded((prev) => {
      const extra = collectExpandedIds(roots, currentId, true)
      if (!extra.size) return prev
      const next = new Set(prev)
      extra.forEach((id) => next.add(id))
      return next
    })
  }, [autoExpandActive, currentId, roots])

  const toggle = (id: number, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const renderNodes = (nodes: CategoryNode[], depth: number): React.ReactNode =>
    nodes.map((node, index) => {
      const hasChildren = node.children.length > 0
      const isOpen = expanded.has(node.id)
      const active = currentId != null && node.id === currentId
      const itemStyle = itemStyleFor(presentation, { active, depth })
      const itemCss = resolveListItemStyles(itemStyle, { depth })

      return (
        <li
          key={node.id}
          className={[
            'zyvavu-widget-category-list__item',
            active ? 'is-current' : '',
            hasChildren && isOpen ? 'is-expanded' : '',
            depth === 0 ? 'is-parent' : 'is-child',
          ]
            .filter(Boolean)
            .join(' ')}
          style={itemCss}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              minWidth: 0,
            }}
          >
            <Marker presentation={presentation} index={index} />
            <a
              href={node.url || '#'}
              className="zyvavu-widget-category-list__link"
              style={{
                flex: '1 1 auto',
                minWidth: 0,
                color: 'inherit',
                textDecoration: 'none',
                ...resolveWidgetStyles({
                  typography: itemStyle?.typography,
                  colorToken: itemStyle?.colorToken,
                }),
              }}
            >
              <span>{node.title}</span>
              {showCounts && typeof node.postCount === 'number' ? (
                <span style={{ marginInlineStart: 6, opacity: 0.65, fontSize: '0.85em' }}>
                  ({node.postCount})
                </span>
              ) : null}
            </a>
            {hasChildren ? (
              <button
                type="button"
                className="zyvavu-widget-category-list__chevron"
                aria-expanded={isOpen}
                aria-label={isOpen ? `Collapse ${node.title}` : `Expand ${node.title}`}
                onClick={(e) => toggle(node.id, e)}
                style={resolveChevronStyles(presentation.chevron)}
              >
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            ) : null}
          </div>
          {hasChildren && isOpen ? (
            <ul
              className="zyvavu-widget-category-list__children"
              style={{ listStyle: 'none', margin: 0, padding: 0, width: '100%' }}
            >
              {renderNodes(node.children, depth + 1)}
            </ul>
          ) : null}
        </li>
      )
    })

  const rootStyle: React.CSSProperties = {
    ...resolveListContainerStyles(presentation.container),
    ...resolveWidgetStyles(style),
    ...(typeof presentation.indentPx === 'number'
      ? ({ ['--zyvavu-list-indent']: `${presentation.indentPx}px` } as React.CSSProperties)
      : {}),
  }

  const hoverCss = presentation.itemHover
    ? (() => {
        const hover = resolveWidgetStyles(presentation.itemHover)
        const decls = [
          hover.color ? `color:${hover.color}` : '',
          hover.backgroundColor ? `background-color:${hover.backgroundColor}` : '',
        ]
          .filter(Boolean)
          .join(';')
        return decls
          ? `.zyvavu-widget-category-list__item:hover{${decls}} .zyvavu-widget-category-list__item:hover .zyvavu-widget-category-list__link{color:inherit}`
          : ''
      })()
    : ''

  const separatorCss =
    presentation.item?.border?.side === 'bottom'
      ? '.zyvavu-widget-category-list__item:last-child{border-bottom:none!important}'
      : ''

  const injectedCss = [hoverCss, separatorCss].filter(Boolean).join(' ')

  return withWidgetStyleSurface(
    <nav
      className="zyvavu-widget-category-list"
      aria-label="Categories"
      {...animationAttributes(style?.animation)}
      style={rootStyle}
    >
      {injectedCss ? <style dangerouslySetInnerHTML={{ __html: injectedCss }} /> : null}
      {roots.length === 0 ? (
        <p style={{ margin: 0, opacity: 0.7 }}>No categories to display.</p>
      ) : (
        <ul
          className="zyvavu-widget-category-list__root"
          style={{ listStyle: 'none', margin: 0, padding: 0 }}
        >
          {renderNodes(roots, 0)}
        </ul>
      )}
    </nav>,
    style,
    surfaceId,
  )
}
