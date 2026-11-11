import React from 'react'
import { buildCategoryTree } from '@/lib/taxonomy/category-tree'
import { CategoryListView } from './CategoryListView'
import { resolveCategoryListPresentation, type CategoryListProps } from './shared'

const roots = buildCategoryTree([
  { id: 1, title: 'Home & Living', slug: 'home', parentId: null },
  { id: 2, title: 'Furniture and lighting', slug: 'furniture', parentId: 1 },
  { id: 3, title: 'Kitchen essentials', slug: 'kitchen', parentId: 1 },
  { id: 4, title: 'Outdoor & Garden', slug: 'outdoor', parentId: null },
  { id: 5, title: 'Plants and planters', slug: 'plants', parentId: 4 },
  { id: 6, title: 'Gift ideas', slug: 'gifts', parentId: null },
].map((category) => ({ ...category, url: '#', children: [] })))

export function CategoryListPatternPreview(props: CategoryListProps) {
  return (
    <CategoryListView
      roots={roots}
      presentation={resolveCategoryListPresentation(props)}
      currentId={2}
      initialExpanded="none"
      style={props.style}
      surfaceId={props.id}
    />
  )
}
