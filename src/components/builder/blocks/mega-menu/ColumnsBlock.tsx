'use client'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'

export type ColumnsDistribution = '1' | 'equal-2' | '2:1' | '1:2' | '1:1:1' | '1:1:1:1'

export type ColumnsProps = {
  distribution: ColumnsDistribution
  column1?: any
  column2?: any
  column3?: any
  column4?: any
}

const GRID_TEMPLATES: Record<ColumnsDistribution, string> = {
  '1': '1fr',
  'equal-2': '1fr 1fr',
  '2:1': '2fr 1fr',
  '1:2': '1fr 2fr',
  '1:1:1': 'repeat(3, 1fr)',
  '1:1:1:1': 'repeat(4, 1fr)',
}

export const ColumnsBlock: ComponentConfig<ColumnsProps> = {
  label: 'Columns Layout',
  fields: {
    distribution: {
      type: 'select',
      label: 'Column Preset',
      options: [
        { label: '1 Column (Full Width)', value: '1' },
        { label: '2 Columns (Equal 1:1)', value: 'equal-2' },
        { label: '2 Columns (Wide Left 2:1)', value: '2:1' },
        { label: '2 Columns (Wide Right 1:2)', value: '1:2' },
        { label: '3 Columns (Equal 1:1:1)', value: '1:1:1' },
        { label: '4 Columns (Equal 1:1:1:1)', value: '1:1:1:1' },
      ],
    },
    column1: { type: 'slot' },
    column2: { type: 'slot' },
    column3: { type: 'slot' },
    column4: { type: 'slot' },
  },
  defaultProps: {
    distribution: 'equal-2',
  },
  render: ({ distribution = 'equal-2', column1: Col1, column2: Col2, column3: Col3, column4: Col4 }) => {
    const template = GRID_TEMPLATES[distribution] || GRID_TEMPLATES['equal-2']
    const hasCol2 = ['equal-2', '2:1', '1:2', '1:1:1', '1:1:1:1'].includes(distribution)
    const hasCol3 = ['1:1:1', '1:1:1:1'].includes(distribution)
    const hasCol4 = distribution === '1:1:1:1'

    return (
      <div
        className="zyvavu-mega-columns"
        style={{
          display: 'grid',
          gridTemplateColumns: template,
          gap: '24px',
          width: '100%',
          padding: '12px 0',
          boxSizing: 'border-box',
        }}
      >
        <div className="zyvavu-mega-col" style={{ minWidth: 0 }}>
          {Col1 && <Col1 />}
        </div>
        {hasCol2 && (
          <div className="zyvavu-mega-col" style={{ minWidth: 0 }}>
            {Col2 && <Col2 />}
          </div>
        )}
        {hasCol3 && (
          <div className="zyvavu-mega-col" style={{ minWidth: 0 }}>
            {Col3 && <Col3 />}
          </div>
        )}
        {hasCol4 && (
          <div className="zyvavu-mega-col" style={{ minWidth: 0 }}>
            {Col4 && <Col4 />}
          </div>
        )}
      </div>
    )
  },
}
