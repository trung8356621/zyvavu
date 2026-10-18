'use client'

import { withWidgetStyleSurface } from '@/lib/style-engine/WidgetStyleSurface'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import type { HeaderProps } from './frontend'

export const headerEditor: ComponentConfig<HeaderProps> = {
  label: 'Structured Header (Flatsome-like)',
  fields: {
    showTopBar: {
      type: 'radio',
      label: 'Enable Top Bar',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    showBottomBar: {
      type: 'radio',
      label: 'Enable Bottom Bar',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    sticky: {
      type: 'radio',
      label: 'Sticky on Scroll',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    topBarLeft: { type: 'slot' },
    topBarCenter: { type: 'slot' },
    topBarRight: { type: 'slot' },
    mainHeaderLeft: { type: 'slot' },
    mainHeaderCenter: { type: 'slot' },
    mainHeaderRight: { type: 'slot' },
    bottomBarLeft: { type: 'slot' },
    bottomBarCenter: { type: 'slot' },
    bottomBarRight: { type: 'slot' },
  },
  defaultProps: {
    showTopBar: true,
    showBottomBar: false,
    sticky: true,
  },
  render: ({
    style: surfaceStyle,
    id: surfaceId,
    showTopBar = true,
    showBottomBar = false,
    topBarLeft: TBLeft,
    topBarCenter: TBCenter,
    topBarRight: TBRight,
    mainHeaderLeft: MHLeft,
    mainHeaderCenter: MHCenter,
    mainHeaderRight: MHRight,
    bottomBarLeft: BBLeft,
    bottomBarCenter: BBCenter,
    bottomBarRight: BBRight,
  }: any) => {
    return withWidgetStyleSurface(
      <div
        className="zyvavu-widget-header"
        style={{
          border: '1px solid #ced4da',
          borderRadius: '8px',
          background: '#ffffff',
          overflow: 'hidden',
          margin: '16px 0',
        }}
      >
        <div
          style={{
            background: '#0e6b66',
            color: '#fff',
            padding: '6px 12px',
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
          }}
        >
          Flatsome-Style Structured Header Builder
        </div>

        {/* TOP BAR */}
        {showTopBar && (
          <div
            style={{
              borderBottom: '1px solid #e9ecef',
              background: '#f8f9fa',
              padding: '6px 12px',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                color: '#999',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              Top Bar (Left / Center / Right)
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '8px',
                minHeight: '32px',
              }}
            >
              <div style={{ border: '1px dashed #ced4da', borderRadius: '4px', padding: '4px' }}>
                {TBLeft && <TBLeft />}
              </div>
              <div style={{ border: '1px dashed #ced4da', borderRadius: '4px', padding: '4px' }}>
                {TBCenter && <TBCenter />}
              </div>
              <div style={{ border: '1px dashed #ced4da', borderRadius: '4px', padding: '4px' }}>
                {TBRight && <TBRight />}
              </div>
            </div>
          </div>
        )}

        {/* MAIN HEADER */}
        <div style={{ padding: '12px' }}>
          <div
            style={{
              fontSize: '10px',
              color: '#999',
              textTransform: 'uppercase',
              marginBottom: '4px',
            }}
          >
            Main Header (Brand Left / Nav Center / Action Right)
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 2fr 1fr',
              gap: '8px',
              minHeight: '44px',
            }}
          >
            <div style={{ border: '1px dashed #ced4da', borderRadius: '4px', padding: '6px' }}>
              {MHLeft && <MHLeft />}
            </div>
            <div style={{ border: '1px dashed #ced4da', borderRadius: '4px', padding: '6px' }}>
              {MHCenter && <MHCenter />}
            </div>
            <div style={{ border: '1px dashed #ced4da', borderRadius: '4px', padding: '6px' }}>
              {MHRight && <MHRight />}
            </div>
          </div>
        </div>

        {/* BOTTOM BAR */}
        {showBottomBar && (
          <div
            style={{ borderTop: '1px solid #e9ecef', background: '#f8f9fa', padding: '6px 12px' }}
          >
            <div
              style={{
                fontSize: '10px',
                color: '#999',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              Bottom Bar (Left / Center / Right)
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '8px',
                minHeight: '32px',
              }}
            >
              <div style={{ border: '1px dashed #ced4da', borderRadius: '4px', padding: '4px' }}>
                {BBLeft && <BBLeft />}
              </div>
              <div style={{ border: '1px dashed #ced4da', borderRadius: '4px', padding: '4px' }}>
                {BBCenter && <BBCenter />}
              </div>
              <div style={{ border: '1px dashed #ced4da', borderRadius: '4px', padding: '4px' }}>
                {BBRight && <BBRight />}
              </div>
            </div>
          </div>
        )}
      </div>,
      surfaceStyle,
      surfaceId,
    )
  },
}
