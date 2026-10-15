import React from 'react'
import type { ThemeDataContext, ThemeTemplateDocument } from './types'
import { getFrontendWidget } from './widget-registry-frontend'

export type ThemeRendererProps = {
  document: ThemeTemplateDocument
  dataContext?: ThemeDataContext
  className?: string
  isNested?: boolean
}

/**
 * Pure Next.js SSR React renderer for Zyvavu Theme Engine V1.
 * Resolves widgets from the Frontend Widget Registry.
 * NO Puck editor runtime dependencies are bundled into public pages.
 */
export function ThemeRenderer({
  document,
  dataContext,
  className = '',
  isNested = false,
}: ThemeRendererProps) {
  if (!document || !Array.isArray(document.content)) {
    return null
  }

  const zones = document.zones || {}

  const renderItem = (item: any, index: number) => {
    if (!item || typeof item !== 'object') return null
    const entry = getFrontendWidget(item.type)
    if (!entry) {
      // In development or if unknown widget, omit or comment
      return null
    }

    const Component = entry.component
    const id = item.props?.id || `widget-${index}`

    // Resolve slot children from zones for this component instance
    // e.g. for Columns: 'id:column1', 'id:column2', etc.
    // e.g. for Header: 'id:mainHeaderLeft', 'id:topBarLeft', etc.
    // e.g. for Footer: 'id:footerContent'
    const slotProps: Record<string, React.ReactNode> = {}

    for (const [zoneKey, zoneItems] of Object.entries(zones)) {
      if (zoneKey.startsWith(`${id}:`)) {
        const slotName = zoneKey.slice(id.length + 1)
        if (Array.isArray(zoneItems) && zoneItems.length > 0) {
          slotProps[slotName] = (
            <React.Fragment key={zoneKey}>
              {zoneItems.map((child, childIdx) => renderItem(child, childIdx))}
            </React.Fragment>
          )
        }
      }
    }

    return (
      <Component
        key={id}
        {...item.props}
        {...slotProps}
        dataContext={dataContext}
      />
    )
  }

  const isDocumentMode = document.template === 'single' || document.template === 'page'
  const containerClass = isDocumentMode
    ? 'zyvavu-theme-container zyvavu-theme-container--narrow site-section'
    : document.template === 'header' || document.template === 'footer'
      ? 'zyvavu-theme-part'
      : 'zyvavu-theme-container site-section'

  if (isNested) {
    return <>{document.content.map((item, idx) => renderItem(item, idx))}</>
  }

  return (
    <div className={`zyvavu-theme-root ${containerClass} ${className}`.trim()}>
      {document.content.map((item, idx) => renderItem(item, idx))}
    </div>
  )
}
