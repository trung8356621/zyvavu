'use client'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'

export type ContactCardProps = {
  heading: string
  contactText: string
  actionLabel?: string
  actionUrl?: string
  actionNewTab?: boolean
}

export const ContactCardBlock: ComponentConfig<ContactCardProps> = {
  label: 'Contact Card',
  fields: {
    heading: {
      type: 'text',
      label: 'Card Heading',
    },
    contactText: {
      type: 'textarea',
      label: 'Contact Details',
    },
    actionLabel: {
      type: 'text',
      label: 'Action Link Label',
    },
    actionUrl: {
      type: 'text',
      label: 'Action Target URL',
    },
    actionNewTab: {
      type: 'radio',
      label: 'Open in new tab',
      options: [
        { label: 'No', value: false },
        { label: 'Yes', value: true },
      ],
    },
  },
  defaultProps: {
    heading: 'Customer Support',
    contactText: 'Hotline: 1900-8888\nEmail: contact@zyvavu.com\nWorking hours: Mon-Fri 8am - 6pm',
    actionLabel: 'Contact Page',
    actionUrl: '/contact',
    actionNewTab: false,
  },
  render: ({ heading, contactText, actionLabel, actionNewTab }) => {
    return (
      <div
        className="zyvavu-mega-contactcard"
        style={{
          padding: '16px',
          borderRadius: '8px',
          backgroundColor: 'var(--zyvavu-background, #f5f6f4)',
          border: '1px solid var(--zyvavu-border, #dfe5e2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <h4
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--zyvavu-text, #17201f)',
          }}
        >
          {heading}
        </h4>
        <div
          style={{
            fontSize: '13px',
            lineHeight: 1.5,
            color: '#444444',
            whiteSpace: 'pre-line',
          }}
        >
          {contactText}
        </div>
        {actionLabel && (
          <div style={{ marginTop: '4px' }}>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--zyvavu-primary, #0e6b66)',
                textDecoration: 'underline',
                cursor: 'default',
              }}
            >
              {actionLabel}
              {actionNewTab && <span style={{ marginLeft: '2px' }}>↗</span>}
            </span>
          </div>
        )}
      </div>
    )
  },
}
