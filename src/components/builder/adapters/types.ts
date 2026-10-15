import type { PostItemData, ProductItemData } from '../templates/registry'

export type SortOrderOption =
  | 'publishedAt:desc'
  | 'publishedAt:asc'
  | 'title:asc'
  | 'title:desc'
  | 'updatedAt:desc'

export type CategoryQueryOptions = {
  categoryId: string | number
  limit: number
  sortBy?: SortOrderOption
}

export interface PostDataSourceAdapter {
  fetchPostsByCategory(options: CategoryQueryOptions): Promise<PostItemData[]>
}

export interface ProductDataSourceAdapter {
  fetchProductsByCategory(options: CategoryQueryOptions): Promise<ProductItemData[]>
}
