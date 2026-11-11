import type { WidgetManifest } from '@/lib/theme-engine/types'
import { getCategoryListPreset } from './presets'

const classic = getCategoryListPreset('classic-tree')

export const categoryListManifest: WidgetManifest = {
  id: 'CategoryList',
  version: 1,
  label: 'Category List',
  category: 'navigation',
  capabilities: ['archive.list', 'site.navigation'],
  supportedContexts: ['*', 'home', 'page', 'category', 'single', 'footer'],
  requiredData: ['taxonomy.categories'],
  defaultProps: {
    preset: 'classic-tree',
    selectedCategoryIds: [],
    includeDescendants: true,
    hideEmpty: false,
    showCounts: false,
    autoExpandActive: true,
    initialExpanded: 'roots',
    listPresentation: classic.listPresentation,
    style: {
      spacing: { padding: { token: 'sm' } },
    },
  },
  styleSlots: ['container', 'parentItem', 'childItem', 'marker', 'chevron'],
}
