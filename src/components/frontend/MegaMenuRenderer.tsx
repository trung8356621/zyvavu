import React from 'react'
import Link from 'next/link'

export type MegaMenuRendererProps = {
  document?: any
  className?: string
}

const GRID_TEMPLATES: Record<string, string> = {
  '1': '1fr',
  'equal-2': '1fr 1fr',
  '2:1': '2fr 1fr',
  '1:2': '1fr 2fr',
  '1:1:1': 'repeat(3, 1fr)',
  '1:1:1:1': 'repeat(4, 1fr)',
}

export function MegaMenuRenderer({ document, className = '' }: MegaMenuRendererProps) {
  if (!document || !Array.isArray(document.content)) return null

  const zones = document.zones || {}

  const renderComponent = (comp: any, idx: number): React.ReactNode => {
    if (!comp || !comp.type) return null
    const { type, props = {} } = comp
    const id = props.id || `comp-${idx}`

    switch (type) {
      case 'Columns': {
        const distribution = props.distribution || 'equal-2'
        const template = GRID_TEMPLATES[distribution] || '1fr 1fr'
        const hasCol2 = ['equal-2', '2:1', '1:2', '1:1:1', '1:1:1:1'].includes(distribution)
        const hasCol3 = ['1:1:1', '1:1:1:1'].includes(distribution)
        const hasCol4 = distribution === '1:1:1:1'

        const col1Items = zones[`${id}:column1`] || []
        const col2Items = zones[`${id}:column2`] || []
        const col3Items = zones[`${id}:column3`] || []
        const col4Items = zones[`${id}:column4`] || []

        return (
          <div
            key={id}
            className="zyvavu-mega-columns"
            style={{
              display: 'grid',
              gridTemplateColumns: template,
              gap: '24px',
              width: '100%',
              padding: '8px 0',
            }}
          >
            <div className="zyvavu-mega-col" style={{ minWidth: 0 }}>
              {col1Items.map((c: any, i: number) => renderComponent(c, i))}
            </div>
            {hasCol2 && (
              <div className="zyvavu-mega-col" style={{ minWidth: 0 }}>
                {col2Items.map((c: any, i: number) => renderComponent(c, i))}
              </div>
            )}
            {hasCol3 && (
              <div className="zyvavu-mega-col" style={{ minWidth: 0 }}>
                {col3Items.map((c: any, i: number) => renderComponent(c, i))}
              </div>
            )}
            {hasCol4 && (
              <div className="zyvavu-mega-col" style={{ minWidth: 0 }}>
                {col4Items.map((c: any, i: number) => renderComponent(c, i))}
              </div>
            )}
          </div>
        )
      }

      case 'LinkList': {
        const items = Array.isArray(props.items) ? props.items : []
        return (
          <div
            key={id}
            className="zyvavu-mega-linklist"
            style={{
              padding: '12px 16px',
              borderRadius: '6px',
              backgroundColor: 'var(--zyvavu-theme-surface, #ffffff)',
              border: '1px solid var(--zyvavu-theme-border, #dfe5e2)',
            }}
          >
            {props.heading && (
              <h4
                style={{
                  margin: '0 0 10px 0',
                  fontSize: '13px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--zyvavu-theme-text, #17201f)',
                  borderBottom: '2px solid var(--zyvavu-theme-primary, #0e6b66)',
                  paddingBottom: '6px',
                }}
              >
                {props.heading}
              </h4>
            )}
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {items.map((item: any, i: number) => (
                <li key={i} style={{ marginBottom: '6px' }}>
                  <Link
                    href={item.url || '#'}
                    target={item.newTab ? '_blank' : undefined}
                    style={{
                      fontSize: '14px',
                      color: 'var(--zyvavu-theme-text, #17201f)',
                      textDecoration: 'none',
                      transition: 'color 0.15s ease',
                    }}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )
      }

      case 'PromoBanner': {
        return (
          <div
            key={id}
            className="zyvavu-mega-promo"
            style={{
              padding: '16px',
              borderRadius: '8px',
              backgroundColor: 'var(--zyvavu-theme-surface, #f8faf9)',
              border: '1px solid var(--zyvavu-theme-border, #dfe5e2)',
            }}
          >
            {props.imageUrl && (
              <img
                src={props.imageUrl}
                alt={props.title || 'Banner'}
                style={{
                  width: '100%',
                  height: '120px',
                  objectFit: 'cover',
                  borderRadius: '4px',
                  marginBottom: '10px',
                }}
              />
            )}
            {props.title && (
              <h4
                style={{
                  margin: '0 0 6px 0',
                  fontSize: '15px',
                  fontWeight: 700,
                  color: 'var(--zyvavu-theme-text, #17201f)',
                }}
              >
                {props.title}
              </h4>
            )}
            {props.description && (
              <p
                style={{
                  margin: '0 0 12px 0',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  color: 'var(--zyvavu-theme-text-muted, #5f7370)',
                }}
              >
                {props.description}
              </p>
            )}
            {props.ctaLabel && props.ctaUrl && (
              <Link
                href={props.ctaUrl}
                target={props.ctaNewTab ? '_blank' : undefined}
                style={{
                  display: 'inline-block',
                  padding: '6px 14px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: 'var(--zyvavu-theme-primary, #0e6b66)',
                  color: '#ffffff',
                  textDecoration: 'none',
                }}
              >
                {props.ctaLabel}
              </Link>
            )}
          </div>
        )
      }

      case 'ContactCard': {
        return (
          <div
            key={id}
            className="zyvavu-mega-contact"
            style={{
              padding: '16px',
              borderRadius: '8px',
              backgroundColor: 'var(--zyvavu-theme-surface, #f8faf9)',
              border: '1px solid var(--zyvavu-theme-border, #dfe5e2)',
              fontSize: '13px',
            }}
          >
            {props.title && (
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 700, color: 'var(--zyvavu-theme-text, #17201f)' }}>
                {props.title}
              </h4>
            )}
            {props.address && <p style={{ margin: '0 0 4px 0', color: 'var(--zyvavu-theme-text-muted, #5f7370)' }}>📍 {props.address}</p>}
            {props.phone && <p style={{ margin: '0 0 4px 0', color: 'var(--zyvavu-theme-text-muted, #5f7370)' }}>📞 {props.phone}</p>}
            {props.email && <p style={{ margin: '0 0 10px 0', color: 'var(--zyvavu-theme-text-muted, #5f7370)' }}>✉️ {props.email}</p>}
            {props.actionLabel && props.actionUrl && (
              <Link
                href={props.actionUrl}
                target={props.actionNewTab ? '_blank' : undefined}
                style={{
                  display: 'inline-block',
                  color: 'var(--zyvavu-theme-primary, #0e6b66)',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                {props.actionLabel} →
              </Link>
            )}
          </div>
        )
      }

      default:
        return null
    }
  }

  return (
    <div
      className={`zyvavu-mega-dropdown-canvas ${className}`.trim()}
      style={{
        width: '100%',
        maxWidth: '1140px',
        margin: '0 auto',
        padding: '20px 24px',
        backgroundColor: 'var(--zyvavu-theme-surface, #ffffff)',
        borderRadius: '8px',
        border: '1px solid var(--zyvavu-theme-border, #dfe5e2)',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
        boxSizing: 'border-box',
      }}
    >
      {document.content.map((comp: any, idx: number) => renderComponent(comp, idx))}
    </div>
  )
}
