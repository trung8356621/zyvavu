import type { ListPresentationConfig } from '@/lib/style-engine/list-presentation'

export type CategoryListPresetId = 'classic-tree' | 'compact-tree' | 'boxed-tree'

export type CategoryListPreset = {
  id: CategoryListPresetId
  label: string
  description: string
  listPresentation: ListPresentationConfig
}

/** Classic B2B sidebar category navigation. */
export const CATEGORY_LIST_PRESETS: CategoryListPreset[] = [
  {
    id: 'classic-tree',
    label: 'Classic Tree',
    description: 'Traditional B2B sidebar with separators and clear hierarchy.',
    listPresentation: {
      indentPx: 20,
      container: {
        spacing: { padding: { token: 'sm' }, gapToken: 'none' },
        background: { mode: 'color', colorToken: 'surface' },
        border: { style: 'solid', widthToken: 'thin', colorToken: 'border' },
        radius: { radiusToken: 'md' },
      },
      item: {
        typography: { typography: 'p2', colorToken: 'text' },
        spacing: { padding: { topToken: 'sm', bottomToken: 'sm', leftToken: 'sm', rightToken: 'sm' } },
        border: { style: 'solid', widthToken: 'thin', colorToken: 'border', side: 'bottom' },
      },
      itemHover: {
        background: { mode: 'color', colorToken: 'background' },
        typography: { colorToken: 'primary' },
      },
      itemActive: {
        typography: { colorToken: 'primary', fontWeight: '700' },
        background: { mode: 'color', colorToken: 'background' },
      },
      itemParent: {
        typography: { typography: 'p1', fontWeight: '700', colorToken: 'text' },
      },
      itemChild: {
        typography: { typography: 'p2', colorToken: 'textMuted' },
      },
      marker: {
        mode: 'none',
      },
      chevron: {
        colorToken: 'textMuted',
        sizeToken: 18,
      },
    },
  },
  {
    id: 'compact-tree',
    label: 'Compact Tree',
    description: 'Dense sidebar/footer navigation with minimal chrome.',
    listPresentation: {
      indentPx: 12,
      container: {
        spacing: { gapToken: 'none', padding: { token: 'none' } },
      },
      item: {
        typography: { typography: 'p3', colorToken: 'text' },
        spacing: {
          padding: { topToken: 'none', bottomToken: 'none', leftToken: 'xs', rightToken: 'none' },
        },
      },
      itemHover: {
        typography: { colorToken: 'primary' },
      },
      itemActive: {
        typography: { colorToken: 'primary', fontWeight: '600' },
      },
      itemParent: {
        typography: { fontWeight: '600' },
      },
      itemChild: {
        typography: { typography: 'p3', colorToken: 'textMuted' },
      },
      marker: { mode: 'none' },
      chevron: { colorToken: 'textMuted', sizeToken: 14 },
    },
  },
  {
    id: 'boxed-tree',
    label: 'Boxed Tree',
    description: 'Each item in a bordered box with icon markers.',
    listPresentation: {
      indentPx: 16,
      container: {
        spacing: { gapToken: 'sm', padding: { token: 'sm' } },
      },
      item: {
        typography: { typography: 'p2', colorToken: 'text' },
        spacing: { padding: { token: 'sm' } },
        background: { mode: 'color', colorToken: 'surface' },
        border: { style: 'solid', widthToken: 'thin', colorToken: 'border' },
        radius: { radiusToken: 'md' },
      },
      itemHover: {
        border: { style: 'solid', widthToken: 'thin', colorToken: 'primary' },
      },
      itemActive: {
        typography: { colorToken: 'primary', fontWeight: '600' },
        border: { style: 'solid', widthToken: 'medium', colorToken: 'primary' },
      },
      marker: {
        mode: 'icon',
        icon: { source: 'lucide', name: 'folder', recolorable: true },
        colorToken: 'primary',
        sizeToken: 16,
        gapToken: 'sm',
      },
      chevron: {
        colorToken: 'primary',
        sizeToken: 16,
      },
    },
  },
]

export function getCategoryListPreset(id?: string): CategoryListPreset {
  return (
    CATEGORY_LIST_PRESETS.find((p) => p.id === id) || CATEGORY_LIST_PRESETS[0]
  )
}
