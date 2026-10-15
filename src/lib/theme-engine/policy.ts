import type { TemplateContext, TemplatePolicy, WidgetCapability } from './types'

export const TEMPLATE_POLICIES: Record<TemplateContext, TemplatePolicy> = {
  single: {
    context: 'single',
    mode: 'document',
    description: 'Renders single blog posts with dynamic article content and metadata.',
    allowedWidgets: ['PostTitle', 'PostContent', 'PostMeta', 'FeaturedMedia', 'Columns', 'TextBlock'],
    requiredCapabilities: ['document.content'],
    uniqueCapabilities: ['document.content', 'document.title'],
  },
  page: {
    context: 'page',
    mode: 'document',
    description: 'Renders static and custom pages with content blocks or rich text.',
    allowedWidgets: ['PostTitle', 'PostContent', 'FeaturedMedia', 'Columns', 'TextBlock'],
    requiredCapabilities: ['document.content'],
    uniqueCapabilities: ['document.content', 'document.title'],
  },
  home: {
    context: 'home',
    mode: 'free',
    description: 'Free layout builder for the site homepage.',
    allowedWidgets: ['TextBlock', 'Columns', 'RecentPosts', 'FeaturedMedia', 'PromoBanner', 'ContactCard', 'LinkList'],
  },
  category: {
    context: 'category',
    mode: 'document',
    description: 'Archive template for category listings and paginated post grids.',
    allowedWidgets: ['CategoryHeader', 'RecentPosts', 'TextBlock', 'Columns'],
    requiredWidgets: ['CategoryHeader', 'RecentPosts'],
    uniqueWidgets: ['CategoryHeader'],
  },
  product: {
    context: 'product',
    mode: 'document',
    description: 'Contract-only product template policy. Pending real Products collection.',
    allowedWidgets: ['ProductHeader', 'TextBlock', 'Columns'],
    requiredWidgets: ['ProductHeader'],
    uniqueWidgets: ['ProductHeader'],
  },
  header: {
    context: 'header',
    mode: 'structured-header',
    description: 'Flatsome-like structured header builder with Top Bar, Main Header, and Bottom Bar.',
    allowedRegions: [
      'topBar:left',
      'topBar:center',
      'topBar:right',
      'mainHeader:left',
      'mainHeader:center',
      'mainHeader:right',
      'bottomBar:left',
      'bottomBar:center',
      'bottomBar:right',
    ],
    allowedWidgets: ['HeaderBrand', 'HeaderNav', 'HeaderSearch', 'HeaderAction', 'HeaderTopBarText', 'HeaderSocial'],
    requiredWidgets: ['HeaderBrand', 'HeaderNav'],
    uniqueWidgets: ['HeaderBrand', 'HeaderNav'],
  },
  footer: {
    context: 'footer',
    mode: 'free',
    description: 'Free layout builder for the site footer.',
    allowedWidgets: ['Columns', 'TextBlock', 'LinkList', 'ContactCard', 'HeaderBrand'],
  },
}

export function getTemplatePolicy(context: TemplateContext): TemplatePolicy {
  const policy = TEMPLATE_POLICIES[context]
  if (!policy) {
    throw new Error(`No template policy registered for context "${context}"`)
  }
  return policy
}
