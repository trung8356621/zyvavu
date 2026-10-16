import React from 'react'
import type { ThemeDataContext, ThemeTemplateDocument } from './types'
import { getFrontendWidget } from './widget-registry-frontend'
import { resolvePageSettingsStyles } from './page-settings'

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

  const renderItem = (
    item: any,
    index: number,
    currentContext: ThemeDataContext | undefined = dataContext,
    keyOverride?: string,
  ) => {
    if (!item || typeof item !== 'object') return null
    const entry = getFrontendWidget(item.type)
    if (!entry) {
      // In development or if unknown widget, omit or comment
      return null
    }

    const Component = entry.component
    const id = item.props?.id || `widget-${index}`

    const isRepeatingLoop = item.type === 'CollectionLoop'

    // Dynamic slot renderer for repeating server widgets like CollectionLoop
    const renderSlot = isRepeatingLoop
      ? (
          slotName: string,
          customContext?: ThemeDataContext,
          keyPrefix?: string,
        ) => {
          const zoneKey = `${id}:${slotName}`
          const zoneItems = zones[zoneKey]
          if (!Array.isArray(zoneItems) || zoneItems.length === 0) return null

          const effectiveContext = customContext || currentContext

          return (
            <React.Fragment key={keyPrefix || zoneKey}>
              {zoneItems.map((child, childIdx) =>
                renderItem(
                  child,
                  childIdx,
                  effectiveContext,
                  keyPrefix ? `${keyPrefix}-${childIdx}` : undefined,
                ),
              )}
            </React.Fragment>
          )
        }
      : undefined

    // Default pre-rendered slots for standard widgets (e.g. Columns, Header, Footer)
    const slotProps: Record<string, React.ReactNode> = {}

    if (!isRepeatingLoop) {
      for (const [zoneKey, zoneItems] of Object.entries(zones)) {
        if (zoneKey.startsWith(`${id}:`)) {
          const slotName = zoneKey.slice(id.length + 1)
          if (Array.isArray(zoneItems) && zoneItems.length > 0) {
            slotProps[slotName] = (
              <React.Fragment key={zoneKey}>
                {zoneItems.map((child, childIdx) =>
                  renderItem(child, childIdx, currentContext),
                )}
              </React.Fragment>
            )
          }
        }
      }
    }

    return (
      <Component
        key={keyOverride || id}
        {...item.props}
        {...slotProps}
        {...(renderSlot ? { renderSlot } : {})}
        dataContext={currentContext}
      />
    )
  }

  const isDocumentMode = document.template === 'single' || document.template === 'page'
  const containerClass = isDocumentMode
    ? 'zyvavu-theme-container zyvavu-theme-container--narrow site-section'
    : document.template === 'header' || document.template === 'footer'
      ? 'zyvavu-theme-part'
      : 'zyvavu-theme-container site-section'

  const pageSettings = document.root?.props?.pageSettings
  const resolved = resolvePageSettingsStyles(pageSettings, undefined, document.template)

  if (isNested) {
    return <>{document.content.map((item, idx) => renderItem(item, idx))}</>
  }

  return (
    <div className={`zyvavu-theme-root ${containerClass} ${resolved.className} ${className}`.trim()} style={resolved.style}>
      {resolved.scopedCss && (
        <style dangerouslySetInnerHTML={{ __html: resolved.scopedCss }} />
      )}
      {document.content.map((item, idx) => renderItem(item, idx))}
    </div>
  )
}
