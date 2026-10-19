import { collectTemplateWidgets, widgetRole } from './widget-contracts'
import { atomEditors } from '@/widgets/atoms/editor'
import React from 'react'
import type { ComponentConfig, Config } from '@puckeditor/core'
import type { PageSettings, TemplateContext, ThemeConfig } from './types'
import { getTemplatePolicy } from './policy'
import { resolvePageSettingsStyles, resolveEffectivePageLayout } from './page-settings'
import { PageLayoutProvider } from './page-layout-context'
import { isPageContentContext } from './normalization'
import { useWidgetPreviewStyle } from '@/lib/style-engine/preview-store'

function wrapWithStylePreview(config: any) {
  if (!config || !config.render) return config
  return {
    ...config,
    render: function WidgetPreviewRenderer(props: any) {
      const preview = useWidgetPreviewStyle(props.id, props.puck?.id, props.puck?.componentId)
      const effectiveProps = preview ? { ...props, style: preview } : props
      return React.createElement(config.render, effectiveProps)
    },
  }
}

// Import manifests
import { postTitleManifest } from '@/widgets/PostTitle/manifest'
import { postTitleEditor } from '@/widgets/PostTitle/editor'

import { postContentManifest } from '@/widgets/PostContent/manifest'
import { postContentEditor } from '@/widgets/PostContent/editor'

import { postMetaManifest } from '@/widgets/PostMeta/manifest'
import { postMetaEditor } from '@/widgets/PostMeta/editor'

import { featuredMediaManifest } from '@/widgets/FeaturedMedia/manifest'
import { featuredMediaEditor } from '@/widgets/FeaturedMedia/editor'

import { columnsManifest } from '@/widgets/Columns/manifest'
import { columnsEditor } from '@/widgets/Columns/editor'

import { textBlockManifest } from '@/widgets/TextBlock/manifest'
import { textBlockEditor } from '@/widgets/TextBlock/editor'

import { recentPostsManifest } from '@/widgets/RecentPosts/manifest'
import { recentPostsEditor } from '@/widgets/RecentPosts/editor'

import { categoryHeaderManifest } from '@/widgets/CategoryHeader/manifest'
import { categoryHeaderEditor } from '@/widgets/CategoryHeader/editor'

import { productHeaderManifest } from '@/widgets/ProductHeader/manifest'
import { productHeaderEditor } from '@/widgets/ProductHeader/editor'

import { headerManifest } from '@/widgets/Header/manifest'
import { headerEditor } from '@/widgets/Header/editor'

import { headerBrandManifest } from '@/widgets/HeaderBrand/manifest'
import { headerBrandEditor } from '@/widgets/HeaderBrand/editor'

import { headerNavManifest } from '@/widgets/HeaderNav/manifest'
import { headerNavEditor } from '@/widgets/HeaderNav/editor'

import { headerActionManifest } from '@/widgets/HeaderAction/manifest'
import { headerActionEditor } from '@/widgets/HeaderAction/editor'

import { headerTopBarTextManifest } from '@/widgets/HeaderTopBarText/manifest'
import { headerTopBarTextEditor } from '@/widgets/HeaderTopBarText/editor'

import { footerManifest } from '@/widgets/Footer/manifest'
import { footerEditor } from '@/widgets/Footer/editor'

import { collectionLoopManifest } from '@/widgets/CollectionLoop/manifest'
import { collectionLoopEditor } from '@/widgets/CollectionLoop/editor'

import { itemTitleManifest } from '@/widgets/ItemTitle/manifest'
import { itemTitleEditor } from '@/widgets/ItemTitle/editor'

import { itemImageManifest } from '@/widgets/ItemImage/manifest'
import { itemImageEditor } from '@/widgets/ItemImage/editor'

import { itemExcerptManifest } from '@/widgets/ItemExcerpt/manifest'
import { itemExcerptEditor } from '@/widgets/ItemExcerpt/editor'

import { itemLinkManifest } from '@/widgets/ItemLink/manifest'
import { itemLinkEditor } from '@/widgets/ItemLink/editor'

import { sectionManifest } from '@/widgets/Section/manifest'
import { sectionEditor } from '@/widgets/Section/editor'

export type EditorWidgetEntry = {
  manifest: any
  config: any
}

const defaultEditorRegistry: Record<string, EditorWidgetEntry> = {
  ...atomEditors,
  Section: { manifest: sectionManifest, config: sectionEditor },
  PostTitle: { manifest: postTitleManifest, config: postTitleEditor },
  PostContent: { manifest: postContentManifest, config: postContentEditor },
  PostMeta: { manifest: postMetaManifest, config: postMetaEditor },
  FeaturedMedia: { manifest: featuredMediaManifest, config: featuredMediaEditor },
  Columns: { manifest: columnsManifest, config: columnsEditor },
  TextBlock: { manifest: textBlockManifest, config: textBlockEditor },
  RecentPosts: { manifest: recentPostsManifest, config: recentPostsEditor },
  CategoryHeader: { manifest: categoryHeaderManifest, config: categoryHeaderEditor },
  ProductHeader: { manifest: productHeaderManifest, config: productHeaderEditor },
  Header: { manifest: headerManifest, config: headerEditor },
  HeaderBrand: { manifest: headerBrandManifest, config: headerBrandEditor },
  HeaderNav: { manifest: headerNavManifest, config: headerNavEditor },
  HeaderAction: { manifest: headerActionManifest, config: headerActionEditor },
  HeaderTopBarText: { manifest: headerTopBarTextManifest, config: headerTopBarTextEditor },
  Footer: { manifest: footerManifest, config: footerEditor },
  CollectionLoop: { manifest: collectionLoopManifest, config: collectionLoopEditor },
  ItemTitle: { manifest: itemTitleManifest, config: itemTitleEditor },
  ItemImage: { manifest: itemImageManifest, config: itemImageEditor },
  ItemExcerpt: { manifest: itemExcerptManifest, config: itemExcerptEditor },
  ItemLink: { manifest: itemLinkManifest, config: itemLinkEditor },
}

const customEditorOverrides: Record<string, any> = {}

export function registerEditorWidget(id: string, config: any) {
  customEditorOverrides[id] = config
}

/**
 * Builds a scoped Puck Config for a specific Template Context based on its TemplatePolicy.
 * Only allowed widgets for that template are exposed to the user in the editor sidebar!
 */
export function getEditorConfigForContext(
  context: TemplateContext,
  themeConfig?: ThemeConfig,
): Config {
  const policy = getTemplatePolicy(context)
  const allowedComponents: Record<string, any> = {}

  // If header context, also include Header wrapper
  const allowedSet = new Set(policy.allowedWidgets)
  if (context === 'header') {
    allowedSet.add('Header')
  }
  if (context === 'footer') {
    allowedSet.add('Footer')
  }

  for (const widgetId of allowedSet) {
    const custom = customEditorOverrides[widgetId]
    const base = defaultEditorRegistry[widgetId]
    if (custom) {
      allowedComponents[widgetId] = wrapWithStylePreview(custom)
    } else if (base) {
      allowedComponents[widgetId] = wrapWithStylePreview(base.config)
    }
  }

  for (const [type, component] of Object.entries(allowedComponents)) {
    const role = widgetRole({ type, props: { id: '' } })
    if (
      !role ||
      !['document.title', 'document.content', 'archive.title', 'archive.content'].includes(role)
    )
      continue
    if (!(['single', 'page'].includes(context) ? role.startsWith('document.') : context === 'category' && role.startsWith('archive.'))) continue
    const original = component.resolvePermissions
    component.resolvePermissions = async (
      item: { props: { id?: string } },
      params: { appState: { data: any }; permissions: Record<string, boolean> },
    ) => {
      const base = original ? await original(item, params) : params.permissions
      const occupied = collectTemplateWidgets(params.appState.data).some(
        (node) => widgetRole(node) === role,
      )
      return { ...base, ...(occupied ? { insert: false, duplicate: false } : {}) }
    }
  }

  // Group into categories
  const categories: Record<string, { title: string; components: string[] }> = {}

  for (const [id] of Object.entries(allowedComponents)) {
    const entry = defaultEditorRegistry[id]
    const catKey = entry?.manifest?.category || 'general'
    const catTitle =
      catKey === 'document'
        ? 'Document Elements'
        : catKey === 'layout'
          ? 'Layout & Grid'
          : catKey === 'header'
            ? 'Header Elements'
            : catKey === 'navigation'
              ? 'Navigation'
              : catKey === 'archive'
                ? 'Archive & Lists'
                : catKey === 'commerce'
                  ? 'Commerce (Contract)'
                  : 'General'

    if (!categories[catKey]) {
      categories[catKey] = { title: catTitle, components: [] }
    }
    categories[catKey].components.push(id)
  }

  const isPageContent = isPageContentContext(context)
  const isDocumentMode = context === 'single' || context === 'page'
  const defaultContainerClass = isPageContent
    ? ''
    : isDocumentMode
      ? 'zyvavu-theme-container zyvavu-theme-container--narrow site-section'
      : context === 'header' || context === 'footer'
        ? 'zyvavu-theme-part'
        : 'zyvavu-theme-container site-section'

  return {
    root: {
      render: ({
        children,
        puck,
        pageSettings,
      }: {
        children?: React.ReactNode
        puck?: any
        pageSettings?: PageSettings
      }) => {
        const effectiveLayout = resolveEffectivePageLayout(pageSettings, themeConfig?.tokens)
        const resolved = resolvePageSettingsStyles(
          pageSettings,
          themeConfig?.tokens,
          context,
          isPageContent,
        )
        const styleTag = resolved.scopedCss
          ? React.createElement('style', {
              dangerouslySetInnerHTML: { __html: resolved.scopedCss },
            })
          : null

        const contentNode =
          isPageContent && puck?.renderDropZone
            ? puck.renderDropZone({ zone: 'default-zone', allow: ['Section'] })
            : children

        const innerRoot = React.createElement(
          'div',
          {
            className: `${defaultContainerClass} ${resolved.className}`.trim(),
            style: resolved.style,
          },
          styleTag,
          contentNode,
        )

        return React.createElement(
          PageLayoutProvider,
          {
            value: {
              pageSettings,
              themeTokens: themeConfig?.tokens,
              effectiveContainerWidth: effectiveLayout.containerWidth,
              effectiveAlignment: effectiveLayout.alignment,
              effectiveSpacing: effectiveLayout.spacing,
            },
          },
          innerRoot,
        )
      },
    },
    components: allowedComponents,
    categories,
  }
}
