import { withWidgetStyleSurface } from '@/lib/style-engine/WidgetStyleSurface'
import type { UniversalStyle } from '@/lib/style-engine/types'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { animationAttributes } from '@/lib/style-engine/animation-presets'
import React from 'react'
import type { ThemeDataContext } from '@/lib/theme-engine/types'

export type ColumnsDistribution = '1' | 'equal-2' | '2:1' | '1:2' | '1:1:1' | '1:1:1:1'

export type ColumnsProps = {
  style?: UniversalStyle
  id?: string
  distribution?: ColumnsDistribution
  gap?: string
  column1?: React.ReactNode
  column2?: React.ReactNode
  column3?: React.ReactNode
  column4?: React.ReactNode
  dataContext?: ThemeDataContext
}

const GRID_TEMPLATES: Record<ColumnsDistribution, string> = {
  '1': '1fr',
  'equal-2': '1fr 1fr',
  '2:1': '2fr 1fr',
  '1:2': '1fr 2fr',
  '1:1:1': 'repeat(3, 1fr)',
  '1:1:1:1': 'repeat(4, 1fr)',
}

export function ColumnsFrontend({
  id: surfaceId,
  style: semanticStyle,
  distribution = 'equal-2',
  gap = '24px',
  column1,
  column2,
  column3,
  column4,
}: ColumnsProps) {
  const template = GRID_TEMPLATES[distribution] || GRID_TEMPLATES['equal-2']
  const hasCol2 = ['equal-2', '2:1', '1:2', '1:1:1', '1:1:1:1'].includes(distribution)
  const hasCol3 = ['1:1:1', '1:1:1:1'].includes(distribution)
  const hasCol4 = distribution === '1:1:1:1'

  return withWidgetStyleSurface(
    <div
      className="zyvavu-widget-columns"
      {...animationAttributes(semanticStyle?.animation)}
      style={{
        display: 'grid',
        gridTemplateColumns: template,
        gap,
        width: '100%',
        margin: '24px 0',
        boxSizing: 'border-box',
        ...resolveWidgetStyles(semanticStyle),
      }}
    >
      <div className="zyvavu-widget-columns__col" style={{ minWidth: 0 }}>
        {column1}
      </div>
      {hasCol2 && (
        <div className="zyvavu-widget-columns__col" style={{ minWidth: 0 }}>
          {column2}
        </div>
      )}
      {hasCol3 && (
        <div className="zyvavu-widget-columns__col" style={{ minWidth: 0 }}>
          {column3}
        </div>
      )}
      {hasCol4 && (
        <div className="zyvavu-widget-columns__col" style={{ minWidth: 0 }}>
          {column4}
        </div>
      )}
    </div>,
    semanticStyle,
    surfaceId,
  )
}
