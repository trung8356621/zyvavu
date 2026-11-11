'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  fetchCategoriesForEditor,
  filterCategoryTree,
  type CategoryNode,
} from '@/lib/taxonomy/category-tree'
import { CategoryListView } from './CategoryListView'
import { resolveCategoryListPresentation, type CategoryListProps } from './shared'

export function CategoryListEditorPreview(props: CategoryListProps) {
  const [tree, setTree] = useState<CategoryNode[] | null>(null)
  const presentation = useMemo(
    () => resolveCategoryListPresentation(props),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.preset, props.listPresentation],
  )

  useEffect(() => {
    let cancelled = false
    fetchCategoriesForEditor()
      .then((roots) => {
        const selected = new Set(
          (props.selectedCategoryIds || []).map(Number).filter(Number.isFinite),
        )
        const filtered =
          selected.size > 0
            ? filterCategoryTree(roots, selected, Boolean(props.includeDescendants))
            : roots
        if (!cancelled) setTree(filtered)
      })
      .catch(() => {
        if (!cancelled) setTree([])
      })
    return () => {
      cancelled = true
    }
  }, [props.selectedCategoryIds, props.includeDescendants])

  if (!tree) {
    return (
      <div style={{ padding: 12, opacity: 0.7 }} className="zyvavu-widget-category-list">
        Loading categories…
      </div>
    )
  }

  return (
    <CategoryListView
      roots={tree}
      presentation={presentation}
      showCounts={props.showCounts}
      autoExpandActive={props.autoExpandActive}
      initialExpanded={props.initialExpanded || 'roots'}
      style={props.style}
      surfaceId={props.id}
    />
  )
}
