'use client'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'

export type PromoBannerProps = {
  imageUrl?: string
  imageAlt?: string
  title: string
  description?: string
  ctaLabel?: string
  ctaUrl?: string
  ctaNewTab?: boolean
}

export const PromoBannerBlock: ComponentConfig<PromoBannerProps> = {
  label: 'Promo Banner',
  fields: {
    imageUrl: {
      type: 'text',
      label: 'Image URL',
    },
    imageAlt: {
      type: 'text',
      label: 'Image Alt Text',
    },
    title: {
      type: 'text',
      label: 'Banner Title',
    },
    description: {
      type: 'textarea',
      label: 'Description',
    },
    ctaLabel: {
      type: 'text',
      label: 'CTA Button Label',
    },
    ctaUrl: {
      type: 'text',
      label: 'CTA Target URL',
    },
    ctaNewTab: {
      type: 'radio',
      label: 'Open CTA in new tab',
      options: [
        { label: 'No', value: false },
        { label: 'Yes', value: true },
      ],
    },
  },
  defaultProps: {
    imageUrl: '',
    imageAlt: 'Special Promotion',
    title: 'New Season Collection',
    description: 'Explore the latest arrivals and exclusive seasonal offers.',
    ctaLabel: 'Shop Now',
    ctaUrl: '/shop',
    ctaNewTab: false,
  },
  render: ({ imageUrl, imageAlt, title, description, ctaLabel, ctaNewTab }) => {
    return (
      <div
        className="zyvavu-mega-promobanner"
        style={{
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: 'var(--zyvavu-surface, #ffffff)',
          border: '1px solid var(--zyvavu-border, #dfe5e2)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        {imageUrl ? (
          <div
            style={{
              width: '100%',
              height: '140px',
              backgroundColor: '#f0f2f1',
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
            role="img"
            aria-label={imageAlt || title}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '110px',
              backgroundColor: 'var(--zyvavu-background, #f5f6f4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#888888',
              fontSize: '13px',
              borderBottom: '1px dashed var(--zyvavu-border, #dfe5e2)',
            }}
          >
            <span>No Image Selected</span>
          </div>
        )}
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h4
            style={{
              margin: 0,
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--zyvavu-text, #17201f)',
            }}
          >
            {title}
          </h4>
          {description && (
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                lineHeight: 1.4,
                color: '#555555',
              }}
            >
              {description}
            </p>
          )}
          {ctaLabel && (
            <div style={{ marginTop: '4px' }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--zyvavu-primary, #0e6b66)',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 500,
                  textDecoration: 'none',
                  cursor: 'default',
                }}
              >
                {ctaLabel}
                {ctaNewTab && <span style={{ marginLeft: '4px' }}>↗</span>}
              </span>
            </div>
          )}
        </div>
      </div>
    )
  },
}
