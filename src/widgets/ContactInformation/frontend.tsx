import { withWidgetStyleSurface } from '@/lib/style-engine/WidgetStyleSurface'
import { animationAttributes } from '@/lib/style-engine/animation-presets'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import type { UniversalStyle } from '@/lib/style-engine/types'
import {
  resolveContactHref,
  selectContactEntries,
  type ContactDisplayPreset,
  type ContactEntry,
} from '@/lib/site/contact'
import type { ThemeDataContext } from '@/lib/theme-engine/types'
import { Globe, Mail, MapPin, Phone } from 'lucide-react'
import { IconRendererStatic } from '@/lib/icons/IconRendererStatic'
import React from 'react'

export type ContactInformationProps = {
  id?: string
  /** Ordered stable entry IDs — values live in Site Settings, not the Puck doc. */
  entryIds?: string[]
  showLabels?: boolean
  showIcons?: boolean
  preset?: ContactDisplayPreset
  style?: UniversalStyle
  dataContext?: ThemeDataContext
  /** Editor/preview-only contact source when site settings are not in dataContext. */
  previewEntries?: ContactEntry[]
}

function contactIcon(entry: ContactEntry, key: string) {
  if (entry.semantics === 'phone') return Phone
  if (entry.semantics === 'email') return Mail
  if (['phone', 'hotline', 'telephone', 'điện thoại'].includes(key)) return Phone
  if (['email', 'e-mail'].includes(key)) return Mail
  if (['address', 'địa chỉ'].includes(key)) return MapPin
  if (entry.link) return Globe
  return MapPin
}

function ContactIcon({ entry, size = 16 }: { entry: ContactEntry; size?: number }) {
  const key = entry.key.trim().toLowerCase()
  const brand = key === 'facebook' || key === 'zalo' ? key : null
  const icon = entry.icon || (!entry.semantics && brand ? { source: 'custom' as const, name: brand } : null)
  if (icon) return <IconRendererStatic icon={icon} size={size} style={{ objectFit: 'contain' }} />
  return React.createElement(contactIcon(entry, key), {
    size,
    'aria-hidden': 'true',
    focusable: 'false',
  })
}

function ContactValue({ entry }: { entry: ContactEntry }) {
  const href = resolveContactHref(entry)
  if (!href) {
    return <span className="zyvavu-widget-contact__value">{entry.value}</span>
  }
  const external = /^https?:/i.test(href)
  const label = entry.key ? `${entry.key}: ${entry.value}` : entry.value
  return (
    <a
      className="zyvavu-widget-contact__value zyvavu-widget-contact__link"
      href={href}
      aria-label={label}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      style={{
        color: 'var(--zyvavu-theme-primary, #0e6b66)',
        textDecoration: 'none',
      }}
    >
      {entry.value}
    </a>
  )
}

function ContactItem({
  entry,
  showLabels,
  showIcons,
  preset,
}: {
  entry: ContactEntry
  showLabels: boolean
  showIcons: boolean
  preset: ContactDisplayPreset
}) {
  const isCard = preset === 'cards'
  return (
    <li
      className={`zyvavu-widget-contact__item zyvavu-widget-contact__item--${preset}`}
      style={{
        display: 'flex',
        alignItems: isCard ? 'flex-start' : 'center',
        gap: '10px',
        listStyle: 'none',
        margin: 0,
        padding: isCard ? '14px 16px' : 0,
        background: isCard ? 'var(--zyvavu-theme-surface, #f8faf9)' : undefined,
        border: isCard ? '1px solid var(--zyvavu-theme-border, #dfe5e2)' : undefined,
        borderRadius: isCard ? 'var(--zyvavu-theme-radius-md, 8px)' : undefined,
        boxSizing: 'border-box',
        minWidth: isCard ? '180px' : undefined,
      }}
    >
      {showIcons ? (
        <span
          className="zyvavu-widget-contact__icon"
          style={{
            display: 'inline-flex',
            color: 'var(--zyvavu-theme-primary, #0e6b66)',
            flexShrink: 0,
            marginTop: isCard ? 2 : 0,
          }}
        >
          <ContactIcon entry={entry} />
        </span>
      ) : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
        {showLabels ? (
          <span
            className="zyvavu-widget-contact__label"
            style={{
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
              color: 'var(--zyvavu-theme-text-muted, #5f7370)',
            }}
          >
            {entry.key}
          </span>
        ) : null}
        <div
          style={{
            color: 'var(--zyvavu-inherited-foreground, var(--zyvavu-theme-text, inherit))',
            fontSize: '0.95rem',
            lineHeight: 1.5,
            wordBreak: 'break-word',
          }}
        >
          <ContactValue entry={entry} />
        </div>
      </div>
    </li>
  )
}

export function ContactInformationFrontend({
  id: surfaceId,
  entryIds = [],
  showLabels = true,
  showIcons = true,
  preset = 'vertical',
  style: semanticStyle,
  dataContext,
  previewEntries,
}: ContactInformationProps) {
  const siteEntries = dataContext?.site?.contactEntries || previewEntries || []
  const entries = selectContactEntries(siteEntries, entryIds)
  const resolved = resolveWidgetStyles(semanticStyle)

  const listStyle: React.CSSProperties =
    preset === 'inline'
      ? {
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px 24px',
          margin: 0,
          padding: 0,
          listStyle: 'none',
        }
      : preset === 'cards'
        ? {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            margin: 0,
            padding: 0,
            listStyle: 'none',
          }
        : {
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            margin: 0,
            padding: 0,
            listStyle: 'none',
          }

  return withWidgetStyleSurface(
    <div
      className={`zyvavu-widget-contact zyvavu-widget-contact--${preset}`}
      {...animationAttributes(semanticStyle?.animation)}
      style={{
        padding: resolved.padding || '16px 0',
        borderRadius: resolved.borderRadius,
        backgroundColor: resolved.backgroundColor,
        backgroundImage: resolved.backgroundImage,
        backgroundPosition: resolved.backgroundPosition,
        backgroundSize: resolved.backgroundSize,
        backgroundRepeat: resolved.backgroundRepeat,
        border: resolved.border,
        boxShadow: resolved.boxShadow,
        opacity: resolved.opacity,
        backdropFilter: resolved.backdropFilter,
        boxSizing: 'border-box',
        color: 'var(--zyvavu-inherited-foreground, var(--zyvavu-theme-text, inherit))',
        ...resolved,
      }}
    >
      {entries.length === 0 ? (
        <p
          className="zyvavu-widget-contact__empty"
          style={{ margin: 0, color: 'var(--zyvavu-theme-text-muted, #5f7370)', fontSize: '0.9rem' }}
        >
          No contact entries selected.
        </p>
      ) : (
        <ul className="zyvavu-widget-contact__list" style={listStyle}>
          {entries.map((entry) => (
            <ContactItem
              key={entry.entryId}
              entry={entry}
              showLabels={showLabels}
              showIcons={showIcons}
              preset={preset}
            />
          ))}
        </ul>
      )}
    </div>,
    semanticStyle,
    surfaceId,
  )
}
