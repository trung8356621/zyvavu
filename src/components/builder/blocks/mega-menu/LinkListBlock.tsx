'use client'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'

export type LinkListItem = {
  label: string
  type: 'page' | 'post' | 'custom'
  url: string
  newTab?: boolean
}

export type LinkListProps = {
  heading: string
  items: LinkListItem[]
}

export const LinkListBlock: ComponentConfig<LinkListProps> = {
  label: 'Link List',
  fields: {
    heading: {
      type: 'text',
      label: 'Section Heading',
    },
    items: {
      type: 'array',
      label: 'Links',
      arrayFields: {
        label: { type: 'text', label: 'Link Label' },
        type: {
          type: 'select',
          label: 'Target Type',
          options: [
            { label: 'Page', value: 'page' },
            { label: 'Post', value: 'post' },
            { label: 'Custom URL', value: 'custom' },
          ],
        },
        url: { type: 'text', label: 'Target URL / Path' },
        newTab: {
          type: 'radio',
          label: 'Open in new tab',
          options: [
            { label: 'No', value: false },
            { label: 'Yes', value: true },
          ],
        },
      },
      getItemSummary: (item: LinkListItem) => item.label || 'Untitled Link',
    },
  },
  defaultProps: {
    heading: 'Featured Links',
    items: [
      { label: 'Home Page', type: 'page', url: '/', newTab: false },
      { label: 'About Us', type: 'page', url: '/about', newTab: false },
      { label: 'Latest News', type: 'post', url: '/blog', newTab: false },
    ],
  },
  render: ({ heading, items = [] }) => {
    return (
      <div
        className="zyvavu-mega-linklist"
        style={{
          padding: '12px 16px',
          borderRadius: '8px',
          backgroundColor: 'var(--zyvavu-surface, #ffffff)',
          border: '1px solid var(--zyvavu-border, #dfe5e2)',
          minWidth: '180px',
        }}
      >
        {heading && (
          <h4
            style={{
              margin: '0 0 12px 0',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--zyvavu-text, #17201f)',
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
              borderBottom: '2px solid var(--zyvavu-primary, #0e6b66)',
              paddingBottom: '6px',
            }}
          >
            {heading}
          </h4>
        )}
        {items.length === 0 ? (
          <p style={{ margin: 0, fontSize: '13px', color: '#888888', fontStyle: 'italic' }}>
            No links added yet. Add links in the right properties panel.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {items.map((item, idx) => (
              <li key={idx} style={{ marginBottom: '8px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '14px',
                    color: 'var(--zyvavu-text, #17201f)',
                    textDecoration: 'none',
                    fontWeight: 400,
                    cursor: 'default',
                  }}
                >
                  {item.label || 'Untitled'}
                  {item.newTab && (
                    <span style={{ fontSize: '10px', color: '#999', marginLeft: '2px' }} title="Opens in new tab">
                      ↗
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  },
}
