import type { ListPresentationConfig } from '@/lib/style-engine/list-presentation'
import type { UniversalStyle } from '@/lib/style-engine/types'
import type { ThemeDataContext } from '@/lib/theme-engine/types'
import { getCategoryListPreset, type CategoryListPresetId } from './presets'

export type CategoryListProps = {
  id?: string
  preset?: CategoryListPresetId
  selectedCategoryIds?: Array<string | number>
  includeDescendants?: boolean
  hideEmpty?: boolean
  showCounts?: boolean
  autoExpandActive?: boolean
  initialExpanded?: 'none' | 'roots' | 'all'
  listPresentation?: ListPresentationConfig
  style?: UniversalStyle
  dataContext?: ThemeDataContext
}

/**
 * Pattern/preset seeds `listPresentation` at insert time.
 * Runtime resolution must NOT re-merge preset CSS over user edits.
 */
export function resolveCategoryListPresentation(
  props: Pick<CategoryListProps, 'preset' | 'listPresentation'>,
): ListPresentationConfig {
  if (props.listPresentation && Object.keys(props.listPresentation).length > 0) {
    return props.listPresentation
  }
  return getCategoryListPreset(props.preset).listPresentation
}
