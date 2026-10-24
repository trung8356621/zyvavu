import React from 'react'
import { ThemeRenderer } from '../renderer'
import type { ThemeConfig, ThemeDataContext } from '../types'
import { generateThemeCss } from '../styles'
import { PATTERN_SLOTS, validatePatternJSON, type PatternJSON } from './json'
export function PatternDocumentPreview({
  pattern,
  themeConfig,
}: {
  pattern: PatternJSON
  themeConfig?: ThemeConfig
}) {
  validatePatternJSON(pattern)
  const payload = JSON.parse(JSON.stringify(pattern.payload)) as PatternJSON['payload']
  const prepare = (nodes: PatternJSON['payload']['content']) => {
    for (const node of nodes) {
      if (node.type === 'CollectionLoop') {
        node.props.mode = 'manual'
        node.props.manualItems = [
          {
            id: 'preview-item',
            title: 'Nội dung minh họa',
            excerpt: 'Dữ liệu mẫu dùng riêng cho preview.',
            url: '#',
          },
        ]
      }
      if (node.type === 'FeaturedMedia' && !node.props.src) {
        node.props.src = '/pattern-library/media-sample.svg'
        node.props.alt = 'Pattern preview sample'
      }
      delete node.props.style?.animation
      for (const slot of PATTERN_SLOTS[node.type]) prepare(node.props[slot] || [])
    }
  }
  prepare(payload.content)
  const dataContext: ThemeDataContext = {
    type: 'home',
    document: { title: 'Tiêu đề minh họa' },
    item: { title: 'Nội dung minh họa', url: '#', excerpt: 'Mẫu nội dung chỉ dùng cho preview.' },
    site: { siteName: 'Zyvavu', tagline: 'Pattern preview', menuItems: [] },
  }
  return (
    <div
      data-pattern-capture="ready"
      style={{
        width: '100%',
        display: 'flow-root',
        boxSizing: 'border-box',
        padding: 'var(--zyvavu-theme-spacing-md,24px)',
      }}
    >
      <style>{generateThemeCss(themeConfig)}</style>
      <ThemeRenderer
        document={{ version: 1, template: 'footer', root: { props: {} }, ...payload }}
        dataContext={dataContext}
        isNested
      />
    </div>
  )
}
