import React from 'react'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { loadCategoryNodes } from '@/lib/taxonomy/categories'
import { CategoryListView } from './CategoryListView'
import { CategoryListPatternPreview } from './pattern-preview'
import {
  resolveCategoryListPresentation,
  type CategoryListProps,
} from './shared'

export type { CategoryListProps } from './shared'
export { resolveCategoryListPresentation } from './shared'

export function CategoryListFrontend(
  props: CategoryListProps,
): React.ReactNode | Promise<React.ReactNode> {
  if (props.dataContext?.patternPreview) return <CategoryListPatternPreview {...props} />
  const presentation = resolveCategoryListPresentation(props)
  const currentId =
    props.dataContext?.type === 'category' && props.dataContext.document?.id != null
      ? Number(props.dataContext.document.id)
      : null

  return (async () => {
    try {
      const payload = await getPayload({ config })
      const roots = await loadCategoryNodes(payload, {
        selectedIds: props.selectedCategoryIds,
        includeDescendants: props.includeDescendants,
        hideEmpty: props.hideEmpty,
        showCounts: props.showCounts,
        currentCategoryId: currentId,
      })
      return (
        <CategoryListView
          roots={roots}
          presentation={presentation}
          currentId={currentId}
          showCounts={props.showCounts}
          autoExpandActive={props.autoExpandActive}
          initialExpanded={props.initialExpanded}
          style={props.style}
          surfaceId={props.id}
        />
      )
    } catch (err) {
      console.error('[CategoryList] failed to load categories', err)
      return (
        <CategoryListView
          roots={[]}
          presentation={presentation}
          style={props.style}
          surfaceId={props.id}
        />
      )
    }
  })()
}
