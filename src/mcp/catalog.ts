import { getComponentStyleCapabilities } from '@/lib/style-engine/capabilities'
import { getStyleModalDomains } from '@/lib/style-engine/domains'
import { RESPONSIVE_BREAKPOINTS } from '@/lib/style-engine/responsive-style'
import {
  MEDIA_BINDING_OPTIONS,
  TEXT_BINDING_OPTIONS,
  URL_BINDING_OPTIONS,
} from '@/lib/theme-engine/item-binding'
import { isLegacyItemWidget } from '@/lib/theme-engine/legacy-item-widgets'
import { isPageContentContext } from '@/lib/theme-engine/normalization'
import { PATTERN_SLOTS } from '@/lib/theme-engine/patterns/json'
import { getTemplatePolicy, TEMPLATE_POLICIES } from '@/lib/theme-engine/policy'
import { getAllInstalledThemes } from '@/lib/theme-engine/themes'
import type { TemplateContext } from '@/lib/theme-engine/types'
import { getAllWidgetManifests } from '@/lib/theme-engine/widget-registry-manifests'
import { systemDescriptor } from '@/lib/theme-engine/widget-contracts'
import { LINK_DESTINATION_SUPPORT } from '@/components/builder/inline-edit/link-editor-model'
import { ASPECT_RATIO_OPTIONS, OBJECT_FIT_OPTIONS, OBJECT_POSITION_OPTIONS } from '@/widgets/atoms/media-props'
import {
  isLibrarySlotOnlyWidget,
  LIBRARY_LIST_WIDGET_GROUPS,
  libraryListGroupForWidgetType,
} from '@/lib/theme-engine/library-list-widgets'

export const schemaVersion = 1
export const manifests = getAllWidgetManifests()
export const contexts = Object.keys(TEMPLATE_POLICIES) as TemplateContext[]
export const themes = getAllInstalledThemes()
export const responsive = {
  breakpoints: RESPONSIVE_BREAKPOINTS,
  overrideKeys: ['typography', 'spacing', 'align'],
  typographyKeys: ['fontSize', 'lineHeight', 'align'],
}
const mediaOptions = {
  aspectRatio: ASPECT_RATIO_OPTIONS.map(({ value }) => value),
  objectFit: OBJECT_FIT_OPTIONS.map(({ value }) => value),
  objectPosition: OBJECT_POSITION_OPTIONS.map(({ value }) => value),
}
const textBindings = TEXT_BINDING_OPTIONS.map(({ value }) => value)
const urlBindings = URL_BINDING_OPTIONS.map(({ value }) => value)
const mediaBindings = MEDIA_BINDING_OPTIONS.map(({ value }) => value)

export const choices: Record<string, Record<string, readonly (string | number)[]>> = {
  Image: { ...mediaOptions, srcBinding: mediaBindings, hrefBinding: urlBindings },
  Video: { ...mediaOptions, srcBinding: mediaBindings },
  Heading: { tag: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'], textBinding: textBindings, hrefBinding: urlBindings },
  Text: { textBinding: textBindings, hrefBinding: urlBindings },
  Button: { textBinding: textBindings, hrefBinding: urlBindings },
  PostTitle: { tag: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'] },
  DocumentTitle: { tag: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'] },
  CategoryTitle: { tag: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'] },
  HeaderAction: { variant: ['solid', 'outline'] },
  TextBlock: { align: ['left', 'center', 'right'] },
  Gallery: { aspectRatio: mediaOptions.aspectRatio, objectFit: mediaOptions.objectFit, columns: [2, 3, 4], gapToken: ['sm', 'md', 'lg'] },
  CollectionLoop: { mode: ['dynamic', 'manual'], source: ['posts'], columns: [1, 2, 3, 4], sort: ['newest', 'oldest'] },
  Columns: { distribution: ['1', 'equal-2', '2:1', '1:2', '1:1:1', '1:1:1:1'] },
  Section: {
    containerWidth: ['inherit', 'containerWidth', 'narrowWidth', 'wideWidth', 'full'],
    verticalPadding: ['none', 'xs', 'sm', 'md', 'lg', 'xl'],
    minHeight: ['auto', 'screen', 'sm', 'md', 'lg'],
  },
  BannerSlider: {
    autoplay: [true, false],
    loop: [true, false],
    showArrows: [true, false],
    showPagination: [true, false],
    paginationMode: ['dots', 'numbers'],
    // App field name is slidesPerView (not itemsPerView). Missing → runtime default 1.
    slidesPerView: [1, 2, 3, 4, 5, 6],
  },
  AnimatedCounter: {
    useGrouping: [true, false],
    triggerOnce: [true, false],
    decimals: [0, 1, 2, 3, 4],
  },
}

/** Document-level Style ownership for Banner Slider (editor dropdowns are not proposal props). */
const BANNER_SLIDER_STYLE_OWNERSHIP = {
  section: 'Outer Section owns chrome (background, spacing, dimensions).',
  BannerSlider:
    'Behavior props only on the slider node; root Style panel is closed. Persist arrows/pagination under controlsStyle.',
  SlideItem:
    'Banner Item visual style lives on each SlideItem.style (margin forbidden). Editor “Banner Item” / active-slide UI selects a real SlideItem id — do not invent editor-state props.',
  controlsStyleTargets: ['arrows', 'pagination'] as const,
}

export function layoutPolicy(context: TemplateContext) {
  const policy = getTemplatePolicy(context)
  return {
    ...policy,
    allowedWidgets: [...policy.allowedWidgets, ...(
      context === 'header' ? ['Header'] : context === 'footer' ? ['Footer'] : []
    )].filter((type) => Object.hasOwn(manifests, type)),
    rootTypes: isPageContentContext(context) ? ['Section'] : context === 'header' ? ['Header'] : null,
    availability: context === 'product' ? 'PARTIAL' : 'SUPPORTED',
  }
}

export function getDomains(type: string, variant?: string) {
  return getComponentStyleCapabilities(type, manifests[type], { variant })
}

export function widgetContract(type: string) {
  const manifest = Object.hasOwn(manifests, type) ? manifests[type] : undefined
  if (!manifest) return undefined
  const defaults = Object.fromEntries(
    Object.entries(manifest.defaultProps).filter(([key]) => key !== 'style'),
  )
  const fixed = systemDescriptor(type)
  const slots = PATTERN_SLOTS[type] ?? []
  const media = type === 'Image' || type === 'Video'
  const linkFields = ['href', 'url', 'ctaUrl'].filter((field) => Object.hasOwn(defaults, field))
  const widgetContexts = contexts.filter((context) =>
    layoutPolicy(context).allowedWidgets.includes(type) ||
    (isLegacyItemWidget(type) && layoutPolicy(context).allowedWidgets.includes('CollectionLoop')),
  )
  const required = ['id', ...(fixed ? ['binding', 'role'] : [])]
  return {
    type,
    displayName: manifest.label,
    description: manifest.capabilities.join(', '),
    category: manifest.category,
    libraryGroup: libraryListGroupForWidgetType(type),
    librarySlotOnly: isLibrarySlotOnlyWidget(type),
    capabilities: manifest.capabilities,
    contexts: widgetContexts,
    availability: 'PARTIAL',
    limitation: isLegacyItemWidget(type)
      ? 'Legacy Item* widgets remain valid inside CollectionLoop item templates; new Loop Item authoring uses shared Atoms.'
      : 'Content schema is based on manifest defaults and verified fields.',
    required,
    optional: [...new Set([
      ...Object.keys(defaults).filter((key) => !required.includes(key)),
      ...Object.keys(choices[type] ?? {}),
      ...slots, 'style', 'lock',
      ...(media ? ['mediaId', ...(type === 'Video' ? ['posterMediaId'] : [])] : []),
    ])],
    defaults,
    enums: choices[type] ?? {},
    slots,
    nesting: {
      rootContexts: widgetContexts.filter((context) => {
        const roots = layoutPolicy(context).rootTypes
        return roots === null || roots.includes(type)
      }),
      // SlideItem is slot-only under BannerSlider.slides. BannerSlider.slides never accepts other types.
      parentSlots: type === 'Section' || type === 'Header' || type === 'Footer'
        ? {}
        : type === 'SlideItem'
          ? { BannerSlider: ['slides'] }
          : Object.fromEntries(Object.entries(PATTERN_SLOTS).filter(([parent, keys]) =>
              keys.length &&
              parent !== 'BannerSlider' &&
              !(type === 'CollectionLoop' && parent === type) &&
              (isLegacyItemWidget(type)
                ? parent === 'CollectionLoop' && keys.includes('itemTemplate')
                : widgetContexts.some((context) => layoutPolicy(context).allowedWidgets.includes(parent))),
            )),
      composition: type === 'BannerSlider' || type === 'SlideItem'
        ? 'Section → BannerSlider → SlideItem → nested widgets (Atoms / Columns / AnimatedCounter, etc.)'
        : undefined,
    },
    requiresCollectionLoopAncestor: isLegacyItemWidget(type) || type.startsWith('Item'),
    styleDomains: getDomains(type),
    styleControls: getStyleModalDomains(type),
    styleTargets:
      type === 'BannerSlider'
        ? [
            {
              // Editor dropdown label only — persist on the concrete SlideItem node, never as BannerSlider props.
              id: 'bannerItem',
              label: 'Banner Item',
              path: 'SlideItem.props.style',
              persistOn: 'SlideItem',
              editorSelectionOnly: true,
              domains: ['background', 'spacing', 'borders', 'shadow', 'effects', 'animation'],
              forbidden: ['margin'],
            },
            {
              id: 'arrows',
              label: 'Arrows',
              path: 'controlsStyle.arrows',
              domains: ['background', 'spacing', 'borders', 'typography'],
            },
            {
              id: 'pagination',
              label: 'Pagination',
              path: 'controlsStyle.pagination',
              domains: ['typography', 'spacing', 'background'],
            },
          ]
        : type === 'SlideItem'
          ? [{ id: 'root', label: 'Banner Item', path: 'style', domains: getStyleModalDomains(type), forbidden: ['margin'] }]
          : [],
    styleOwnership: type === 'BannerSlider' || type === 'SlideItem' ? BANNER_SLIDER_STYLE_OWNERSHIP : undefined,
    restrictions:
      type === 'SlideItem'
        ? {
            librarySlotOnly: true,
            forbiddenStyle: ['spacing.margin', 'responsive.*.spacing.margin'],
            reason: 'SlideItem is not a Library Basic; margin locked to protect BannerSlider track alignment.',
          }
        : type === 'BannerSlider'
          ? {
              rootStylePanel: false,
              childSlot: { slides: ['SlideItem'] },
              slidesPerView: {
                field: 'slidesPerView',
                type: 'integer',
                min: 1,
                max: 6,
                default: 1,
                missingMeans: 1,
                note: 'Items visible at once. Carousel step size is separate Embla behavior, not this field.',
              },
              reason: 'Section owns outer chrome; only SlideItem may occupy slides; Banner Item style is on SlideItem nodes.',
            }
          : type === 'AnimatedCounter'
            ? {
                capability: 'count-up',
                notCountdown: true,
                reason: 'AnimatedCounter is viewport count-up only. Countdown Timer is a separate missing capability.',
              }
            : undefined,
    responsive: {
      ...responsive,
      typographyKeys: getDomains(type).includes('typography') ? responsive.typographyKeys : [],
    },
    links: { fields: linkFields, destinations: linkFields.length ? LINK_DESTINATION_SUPPORT : {} },
    media: media ? { url: 'src', id: 'mediaId', optionalForDrafts: true }
      : type === 'Gallery' ? { url: 'items[].src', id: 'items[].mediaId' } : null,
    requiredContextData: manifest.requiredData ?? [],
  }
}

export function getLayoutRules() {
  return {
    layout: 'CSS flow, flex and grid',
    policies: contexts.map(layoutPolicy),
    slots: PATTERN_SLOTS,
    inlineSlotExample: 'Section.props.content',
    legacyZoneKey: '<parent-id>:<slot>',
    nestedSections: false,
    listWidgetGroups: listWidgetGroups(),
    bannerSlider: {
      tree: 'Section → BannerSlider → SlideItem → nested widgets',
      slidesSlot: ['SlideItem'],
      librarySlotOnly: ['SlideItem'],
      styleOwnership: BANNER_SLIDER_STYLE_OWNERSHIP,
      slidesPerView: {
        field: 'slidesPerView',
        type: 'integer',
        min: 1,
        max: 6,
        default: 1,
        missingMeans: 1,
      },
    },
    animatedCounter: {
      capability: 'count-up',
      notCountdown: true,
      validParents: 'Section.content, Columns columns, SlideItem.content, and other non-slider slots that allow general widgets',
    },
  }
}

/** User-facing Widget Library List Widget groups (organizational; not a second registry). */
export function listWidgetGroups() {
  return LIBRARY_LIST_WIDGET_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    intent: group.intent,
    widgetTypes: [...group.widgetTypes],
    patternIds: [...group.patternIds],
    verified: true as const,
  }))
}
