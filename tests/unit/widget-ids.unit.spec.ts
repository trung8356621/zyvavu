import { describe, expect, it } from 'vitest'
import {
  createWidgetId,
  duplicateTreeWithNewIds,
  findWidgetPath,
  formatWidgetPath,
  ensureWidgetIdsInTree,
} from '@/lib/theme-engine/widget-ids'
import type { ThemeTemplateDocument } from '@/lib/theme-engine/types'

describe('shared widget ids', () => {
  it('allocates unique ids and remaps duplicate trees', () => {
    const a = createWidgetId('section')
    const b = createWidgetId('section')
    expect(a).not.toBe(b)
    const tree = {
      type: 'Section',
      props: {
        id: 'root',
        content: [{ type: 'Heading', props: { id: 'h1', text: 'Hi' } }],
      },
    }
    const copy = duplicateTreeWithNewIds(tree as any, new Set(['root', 'h1']))
    expect(copy.props.id).not.toBe('root')
    expect(copy.props.content[0].props.id).not.toBe('h1')
  })

  it('rejects duplicate ids and builds breadcrumb paths', () => {
    const dup = ensureWidgetIdsInTree([
      { type: 'Heading', props: { id: 'same', text: 'A' } },
      { type: 'Heading', props: { id: 'same', text: 'B' } },
    ] as any)
    expect(dup.errors[0]).toMatch(/Duplicate widget id/)

    const doc: ThemeTemplateDocument = {
      version: 1,
      template: 'home',
      root: { props: {} },
      content: [{
        type: 'BannerSlider',
        props: {
          id: 'slider',
          slides: [{
            type: 'SlideItem',
            props: {
              id: 'slide',
              content: [{ type: 'Image', props: { id: 'img', src: '' } }],
            },
          }],
        },
      }],
    }
    const path = findWidgetPath(doc, 'img')
    expect(path?.map((s) => s.type)).toEqual(['BannerSlider', 'SlideItem', 'Image'])
    expect(formatWidgetPath({
      themeId: 'mcp-blog-test-2',
      template: 'home',
      versionId: 'v2',
      path: path!,
    })).toContain('mcp-blog-test-2/home/v2')
  })
})
