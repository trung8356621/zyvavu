import { withWidgetStyleSurface } from '@/lib/style-engine/WidgetStyleSurface'
import type { UniversalStyle } from '@/lib/style-engine/types'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { animationAttributes } from '@/lib/style-engine/animation-presets'
import React from 'react'
import type { ThemeDataContext } from '@/lib/theme-engine/types'
import { formatPostDate } from '@/lib/theme-engine/post-records'

export type ItemDateProps = {
  id?: string
  style?: UniversalStyle
  prefix?: string
  className?: string
  dataContext?: ThemeDataContext
}

export function ItemDateFrontend({
  id: surfaceId,
  style: semanticStyle,
  prefix = '',
  className = '',
  dataContext,
}: ItemDateProps) {
  const raw = dataContext?.item?.date
  const formatted = formatPostDate(raw) || '15 Thg 10, 2026'
  const label = prefix ? `${prefix}${formatted}` : formatted

  return withWidgetStyleSurface(
    <time
      className={`zyvavu-item-date ${className}`.trim()}
      dateTime={typeof raw === 'string' ? raw : undefined}
      {...animationAttributes(semanticStyle?.animation)}
      style={{
        display: 'block',
        margin: '0 0 8px 0',
        fontSize: '0.8rem',
        fontWeight: 500,
        color: 'var(--zyvavu-inherited-foreground, var(--zyvavu-theme-text-muted, #64748b))',
        ...resolveWidgetStyles(semanticStyle),
      }}
    >
      {label}
    </time>,
    semanticStyle,
    surfaceId,
  )
}
