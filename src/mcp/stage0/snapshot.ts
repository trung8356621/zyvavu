import { createHash } from 'node:crypto'
import { RESPONSIVE_BREAKPOINTS } from '@/lib/style-engine/responsive-style'
import {
  MEDIA_BINDING_OPTIONS,
  TEXT_BINDING_OPTIONS,
  URL_BINDING_OPTIONS,
} from '@/lib/theme-engine/item-binding'
import { LEGACY_ITEM_WIDGET_TYPES } from '@/lib/theme-engine/legacy-item-widgets'
import { isProductSchemaSupported } from '@/lib/theme-engine/normalized-item'
import { PATTERN_SLOTS } from '@/lib/theme-engine/patterns/json'
import { TEMPLATE_POLICIES, getTemplatePolicy } from '@/lib/theme-engine/policy'
import { getAllInstalledThemes } from '@/lib/theme-engine/themes'
import { ATOM_TYPES } from '@/lib/theme-engine/widget-contracts'
import { getAllWidgetManifests } from '@/lib/theme-engine/widget-registry-manifests'
import { LIBRARY_LIST_WIDGET_GROUPS } from '@/lib/theme-engine/library-list-widgets'
import { ASSESSMENT_SCHEMA_VERSION } from './types'

export function buildCapabilitySnapshot() {
  const manifests = getAllWidgetManifests()
  const widgets = Object.values(manifests).map((manifest) => ({
    type: manifest.id,
    label: manifest.label,
    category: manifest.category,
    capabilities: manifest.capabilities,
    verified: true as const,
  }))
  const contexts = Object.keys(TEMPLATE_POLICIES).map((context) => {
    const policy = getTemplatePolicy(context as keyof typeof TEMPLATE_POLICIES)
    return {
      context: policy.context,
      mode: policy.mode,
      allowedWidgets: policy.allowedWidgets,
      verified: true as const,
    }
  })
  const productsSupported = isProductSchemaSupported()
  const snapshot = {
    schemaVersion: ASSESSMENT_SCHEMA_VERSION,
    generatedAt: null as string | null,
    readOnly: true,
    composition: {
      pageContent: 'Section → nested widgets/containers; Sections cannot nest.',
      loopItem: 'Root-level shared Atoms allowed; optional Containers; nested CollectionLoop disallowed.',
      styleEngine: 'Universal Style overrides via Theme tokens; verified Style Engine domains.',
      verified: true as const,
    },
    atoms: [...ATOM_TYPES],
    legacyItemWidgets: [...LEGACY_ITEM_WIDGET_TYPES],
    widgets,
    listWidgetGroups: LIBRARY_LIST_WIDGET_GROUPS.map((group) => ({
      id: group.id,
      label: group.label,
      intent: group.intent,
      widgetTypes: [...group.widgetTypes],
      patternIds: [...group.patternIds],
      verified: true as const,
    })),
    contexts,
    slots: PATTERN_SLOTS,
    bindings: {
      text: TEXT_BINDING_OPTIONS.map(({ value, label }) => ({ value, label })),
      href: URL_BINDING_OPTIONS.map(({ value, label }) => ({ value, label })),
      src: MEDIA_BINDING_OPTIONS.map(({ value, label }) => ({ value, label })),
      documentContext: true,
      itemContext: true,
      missingResolvesTo: null,
      verified: true as const,
    },
    dataSources: {
      posts: { status: 'SUPPORTED' as const, verified: true as const },
      categories: { status: 'SUPPORTED' as const, verified: true as const },
      products: {
        status: productsSupported ? 'SUPPORTED' as const : 'UNSUPPORTED' as const,
        verified: true as const,
        reason: productsSupported
          ? 'Products schema is available.'
          : 'Products collection/schema is absent (isProductSchemaSupported() === false).',
      },
    },
    chrome: {
      header: contexts.some((entry) => entry.context === 'header'),
      footer: contexts.some((entry) => entry.context === 'footer'),
      verified: true as const,
    },
    responsive: {
      breakpoints: RESPONSIVE_BREAKPOINTS,
      verified: true as const,
    },
    themes: getAllInstalledThemes().map(({ id, themeConfig }) => ({
      id,
      label: themeConfig.name,
      verified: true as const,
    })),
    knownGaps: {
      contactFormWidget: !Object.hasOwn(manifests, 'ContactForm'),
      productsCollection: !productsSupported,
      countdownTimerWidget: !Object.hasOwn(manifests, 'CountdownTimer'),
      verified: true as const,
    },
  }
  const capabilitySnapshotId = createHash('sha256')
    .update(JSON.stringify({
      widgets: snapshot.widgets.map(({ type, capabilities }) => ({ type, capabilities })),
      listWidgetGroups: snapshot.listWidgetGroups.map(({ id, widgetTypes, patternIds }) => ({
        id,
        widgetTypes,
        patternIds,
      })),
      contexts: snapshot.contexts.map(({ context, allowedWidgets }) => ({ context, allowedWidgets })),
      dataSources: snapshot.dataSources,
      atoms: snapshot.atoms,
      bindings: {
        text: snapshot.bindings.text.map(({ value }) => value),
        href: snapshot.bindings.href.map(({ value }) => value),
        src: snapshot.bindings.src.map(({ value }) => value),
      },
      knownGaps: snapshot.knownGaps,
    }))
    .digest('hex')
    .slice(0, 16)
  return { ...snapshot, capabilitySnapshotId }
}

export type CapabilitySnapshot = ReturnType<typeof buildCapabilitySnapshot>
