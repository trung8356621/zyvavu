import type { ThemeTemplateDocument } from './types'
import type { LoopItemTemplateMeta } from './loop-item-templates-types'

export type { LoopItemTemplateMeta } from './loop-item-templates-types'

/**
 * Default structure for NEW Loop Item templates only.
 * Does not mutate persisted documents.
 *
 * Root atoms + optional Info Section container (user-editable Style Engine).
 * No automatic full-item Section wrapper requirement.
 */
export function createEmptyLoopItemDocument(
  name: string,
  loopItemId: string,
): ThemeTemplateDocument {
  const imageId = `loop-item-image-${loopItemId}`
  const infoId = `loop-item-info-${loopItemId}`
  const headingId = `loop-item-heading-${loopItemId}`
  const excerptId = `loop-item-excerpt-${loopItemId}`
  const buttonId = `loop-item-button-${loopItemId}`

  return {
    version: 1,
    template: 'loopItem',
    root: { props: {} },
    content: [
      {
        type: 'Image',
        props: {
          id: imageId,
          src: '',
          alt: '',
          srcBinding: 'thumbnail',
          aspectRatio: '16:9',
          objectFit: 'cover',
          objectPosition: 'center',
        },
      },
      {
        type: 'Section',
        props: {
          id: infoId,
          containerWidth: 'inherit',
          verticalPadding: 'none',
          minHeight: 'auto',
          content: [
            {
              type: 'Heading',
              props: {
                id: headingId,
                text: '',
                tag: 'h3',
                textBinding: 'title',
              },
            },
            {
              type: 'Text',
              props: {
                id: excerptId,
                text: '',
                textBinding: 'excerpt',
              },
            },
            {
              type: 'Button',
              props: {
                id: buttonId,
                text: 'Xem chi tiết',
                href: '',
                hrefBinding: 'url',
                newTab: false,
              },
            },
          ],
        },
      },
    ],
    metadata: {
      name,
      loopItemId,
    },
    updatedAt: new Date().toISOString(),
  }
}

export function slugifyLoopItemName(name: string): string {
  const base = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return base || 'loop-item'
}

export function allocateLoopItemId(name: string, existing: LoopItemTemplateMeta[]): string {
  const base = slugifyLoopItemName(name)
  const taken = new Set(existing.map((item) => item.id))
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

/** Theme Builder URL for a Loop Item Template — identity by ID, not display name. */
export function buildLoopItemEditorUrl(themeId: string, loopItemId: string): string {
  const params = new URLSearchParams({
    theme: themeId,
    template: 'loopItem',
    loopItem: loopItemId,
  })
  return `/admin/theme-builder?${params.toString()}`
}
