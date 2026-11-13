import type { CapabilitySnapshot } from './snapshot'
import type { CapabilityStatus } from './types'

export type IntentRule = {
  intent: string
  description: string
  classify: (snapshot: CapabilitySnapshot) => {
    status: CapabilityStatus
    existingCapabilities: string[]
    proposedSolution: string
    missingDependencies: string[]
    reason: string
    evidence: 'verified' | 'inferred'
  }
}

function hasWidget(snapshot: CapabilitySnapshot, type: string) {
  return snapshot.widgets.some((widget) => widget.type === type)
}

function hasContext(snapshot: CapabilitySnapshot, context: string) {
  return snapshot.contexts.some((entry) => entry.context === context)
}

function atomSet(snapshot: CapabilitySnapshot) {
  return snapshot.atoms
}

/** Deterministic intent catalog. NL interpretation stays in the MCP client. */
export const INTENT_RULES: IntentRule[] = [
  {
    intent: 'site.home',
    description: 'Home page template',
    classify: (snapshot) => ({
      status: hasContext(snapshot, 'home') && hasWidget(snapshot, 'Section') ? 'SUPPORTED' : 'MISSING',
      existingCapabilities: ['context:home', 'widget:Section'],
      proposedSolution: 'Use the home template context with Section-rooted layout.',
      missingDependencies: [],
      reason: 'Home context and Section container are registered.',
      evidence: 'verified',
    }),
  },
  {
    intent: 'site.page',
    description: 'Static content page (About, Services, etc.)',
    classify: (snapshot) => ({
      status: hasContext(snapshot, 'page') && hasWidget(snapshot, 'Section') ? 'SUPPORTED' : 'MISSING',
      existingCapabilities: ['context:page', 'widget:Section', ...atomSet(snapshot).map((atom) => `atom:${atom}`)],
      proposedSolution: 'Author a page template with Section and shared Atoms/TextBlock.',
      missingDependencies: [],
      reason: 'Page context supports Section and content atoms.',
      evidence: 'verified',
    }),
  },
  {
    intent: 'site.about',
    description: 'About page',
    classify: (snapshot) => INTENT_RULES.find((rule) => rule.intent === 'site.page')!.classify(snapshot),
  },
  {
    intent: 'site.services',
    description: 'Services page',
    classify: (snapshot) => INTENT_RULES.find((rule) => rule.intent === 'site.page')!.classify(snapshot),
  },
  {
    intent: 'site.contact',
    description: 'Contact page content',
    classify: (snapshot) => {
      const contactInfo = hasWidget(snapshot, 'ContactInformation')
      return {
        status: hasContext(snapshot, 'page') && contactInfo ? 'COMPOSABLE' : 'MISSING',
        existingCapabilities: [
          'context:page',
          ...(contactInfo ? ['widget:ContactInformation'] : []),
          ...atomSet(snapshot).map((atom) => `atom:${atom}`),
        ],
        proposedSolution: 'Compose a contact page from Section, ContactInformation, and Atoms. Interactive form is a separate intent.',
        missingDependencies: snapshot.knownGaps.contactFormWidget ? ['widget:ContactForm'] : [],
        reason: 'Contact page layout is composable; ContactInformation displays site contact entries.',
        evidence: 'verified',
      }
    },
  },
  {
    intent: 'chrome.header',
    description: 'Site header',
    classify: (snapshot) => ({
      status: snapshot.chrome.header ? 'SUPPORTED' : 'MISSING',
      existingCapabilities: ['context:header', 'widget:HeaderBrand', 'widget:HeaderNav'],
      proposedSolution: 'Use the header template context and header widgets.',
      missingDependencies: [],
      reason: 'Structured header template policy is registered.',
      evidence: 'verified',
    }),
  },
  {
    intent: 'chrome.footer',
    description: 'Site footer',
    classify: (snapshot) => ({
      status: snapshot.chrome.footer ? 'SUPPORTED' : 'MISSING',
      existingCapabilities: ['context:footer', 'widget:Columns', 'widget:TextBlock', 'widget:ContactInformation'],
      proposedSolution: 'Use the footer template context with Columns and content widgets.',
      missingDependencies: [],
      reason: 'Footer template policy is registered.',
      evidence: 'verified',
    }),
  },
  {
    intent: 'content.blog',
    description: 'Blog listing and posts',
    classify: (snapshot) => {
      const loop = hasWidget(snapshot, 'CollectionLoop') || hasWidget(snapshot, 'PostCollection')
      return {
        status: hasContext(snapshot, 'single') && loop && snapshot.dataSources.posts.status === 'SUPPORTED'
          ? 'SUPPORTED'
          : 'MISSING',
        existingCapabilities: [
          'context:single',
          'context:category',
          'data:posts',
          ...(hasWidget(snapshot, 'CollectionLoop') ? ['widget:CollectionLoop'] : []),
          ...(hasWidget(snapshot, 'PostCollection') ? ['widget:PostCollection'] : []),
          ...(hasWidget(snapshot, 'FeaturedPost') ? ['widget:FeaturedPost'] : []),
        ],
        proposedSolution: 'Use single/category templates with CollectionLoop or PostCollection against posts.',
        missingDependencies: [],
        reason: 'Post data source and archive/list widgets are registered.',
        evidence: 'verified',
      }
    },
  },
  {
    intent: 'layout.responsive',
    description: 'Responsive layout',
    classify: (snapshot) => ({
      status: 'SUPPORTED',
      existingCapabilities: [
        `breakpoint:tabletMax=${snapshot.responsive.breakpoints.tabletMax}`,
        `breakpoint:mobileMax=${snapshot.responsive.breakpoints.mobileMax}`,
        'style:responsive',
      ],
      proposedSolution: 'Use Style Engine responsive overrides for tablet/mobile.',
      missingDependencies: [],
      reason: 'Responsive breakpoints and style overrides exist in the Style Engine.',
      evidence: 'verified',
    }),
  },
  {
    intent: 'form.contact',
    description: 'Interactive contact form',
    classify: (snapshot) => ({
      status: snapshot.knownGaps.contactFormWidget ? 'MISSING' : 'SUPPORTED',
      existingCapabilities: hasWidget(snapshot, 'ContactInformation') ? ['widget:ContactInformation'] : [],
      proposedSolution: snapshot.knownGaps.contactFormWidget
        ? 'No ContactForm widget is registered. ContactInformation only displays Site Settings entries. BUILD would require a separate coding task for a form widget + submission backend.'
        : 'Use the registered ContactForm widget.',
      missingDependencies: snapshot.knownGaps.contactFormWidget
        ? ['widget:ContactForm', 'backend:form-submission']
        : [],
      reason: snapshot.knownGaps.contactFormWidget
        ? 'Verified gap: ContactForm is absent from the widget manifest registry.'
        : 'ContactForm widget is registered.',
      evidence: 'verified',
    }),
  },
  {
    intent: 'ui.product-card',
    description: 'Product card visual composition',
    classify: (snapshot) => ({
      status: 'COMPOSABLE',
      existingCapabilities: atomSet(snapshot).map((atom) => `atom:${atom}`),
      proposedSolution: 'Compose Heading, Image, Text, and Button Atoms inside a Section/Columns or Loop Item Template.',
      missingDependencies: snapshot.dataSources.products.status === 'UNSUPPORTED' ? ['data:products'] : [],
      reason: 'Visual card UI can reuse shared Atoms. Live product data is a separate backend dependency.',
      evidence: 'verified',
    }),
  },
  {
    intent: 'data.products',
    description: 'Live Products collection / catalog',
    classify: (snapshot) => ({
      status: snapshot.dataSources.products.status,
      existingCapabilities: snapshot.dataSources.products.status === 'SUPPORTED' ? ['data:products'] : [],
      proposedSolution: snapshot.dataSources.products.status === 'SUPPORTED'
        ? 'Use CollectionLoop with source=products.'
        : 'Do not claim live Products. Products schema is absent; DEFER commerce requirements or approve a separate backend BUILD task.',
      missingDependencies: snapshot.dataSources.products.status === 'UNSUPPORTED' ? ['collection:products'] : [],
      reason: snapshot.dataSources.products.reason,
      evidence: 'verified',
    }),
  },
  {
    intent: 'binding.item',
    description: 'Dynamic item context bindings',
    classify: (snapshot) => ({
      status: snapshot.bindings.itemContext ? 'SUPPORTED' : 'MISSING',
      existingCapabilities: [
        'binding:textBinding',
        'binding:srcBinding',
        'binding:hrefBinding',
        'context:item',
      ],
      proposedSolution: 'Bind shared Atoms with textBinding/srcBinding/hrefBinding inside CollectionLoop or loopItem templates.',
      missingDependencies: [],
      reason: 'Item context bindings are implemented on shared Atoms; missing values resolve to null.',
      evidence: 'verified',
    }),
  },
  {
    intent: 'template.loop-item',
    description: 'Loop Item Template policy',
    classify: (snapshot) => ({
      status: hasContext(snapshot, 'loopItem') ? 'SUPPORTED' : 'MISSING',
      existingCapabilities: [
        'context:loopItem',
        ...atomSet(snapshot).map((atom) => `atom:${atom}`),
        'widget:CollectionLoop',
      ],
      proposedSolution: 'Author one loopItem template with shared Atoms (optional Containers) and reference it from CollectionLoop by stable ID.',
      missingDependencies: [],
      reason: 'loopItem template policy allows root-level Atoms without a mandatory Section.',
      evidence: 'verified',
    }),
  },
  {
    intent: 'data.posts',
    description: 'Posts data source',
    classify: (snapshot) => ({
      status: snapshot.dataSources.posts.status,
      existingCapabilities: ['data:posts'],
      proposedSolution: 'Query posts through CollectionLoop / PostCollection / FeaturedPost.',
      missingDependencies: [],
      reason: 'Posts data source is supported.',
      evidence: 'verified',
    }),
  },
  {
    intent: 'data.categories',
    description: 'Categories data source',
    classify: (snapshot) => ({
      status: snapshot.dataSources.categories.status,
      existingCapabilities: ['data:categories', ...(hasWidget(snapshot, 'CategoryList') ? ['widget:CategoryList'] : [])],
      proposedSolution: 'Use CategoryList or CollectionLoop source=categories.',
      missingDependencies: [],
      reason: 'Categories data source is supported.',
      evidence: 'verified',
    }),
  },
  {
    intent: 'ui.promotional-banner',
    description: 'Static promotional banner / CTA block',
    classify: (snapshot) => ({
      status: 'COMPOSABLE',
      existingCapabilities: [
        'widget:Section',
        'widget:Columns',
        ...['Heading', 'Text', 'Button', 'Image']
          .filter((type) => hasWidget(snapshot, type))
          .map((type) => `widget:${type}`),
      ],
      proposedSolution:
        'Compose Section/Columns with Image, Heading, Text and Button. Do not add a dedicated Promotional Banner widget.',
      missingDependencies: [],
      reason: 'Static promo banners are covered by existing containers and atoms (CB-001 COMPOSABLE/REUSE).',
      evidence: 'verified',
    }),
  },
  {
    intent: 'ui.banner-slider',
    description: 'Multi-slide banner carousel',
    classify: (snapshot) => {
      const slider = hasWidget(snapshot, 'BannerSlider')
      const slide = hasWidget(snapshot, 'SlideItem')
      return {
        status: slider && slide ? 'SUPPORTED' : 'MISSING',
        existingCapabilities: [
          ...(slider ? ['widget:BannerSlider'] : []),
          ...(slide ? ['widget:SlideItem'] : []),
          'widget:Section',
          'listGroup:bannerSlider',
        ],
        proposedSolution:
          'Compose Section → BannerSlider → SlideItem → nested widgets. Insert BannerSlider (or its presets) from the Library; SlideItem is slot-only. Persist Banner Item style on each SlideItem; arrows/pagination on controlsStyle. Use slidesPerView (1–6, default 1).',
        missingDependencies: [
          ...(!slider ? ['widget:BannerSlider'] : []),
          ...(!slide ? ['widget:SlideItem'] : []),
        ],
        reason: slider && slide
          ? 'BannerSlider and SlideItem are registered with Embla runtime, slidesPerView, Style ownership contract, and Pattern presets.'
          : 'Banner slider widgets are not present in the verified registry.',
        evidence: 'verified',
      }
    },
  },
  {
    intent: 'ui.animated-counter',
    description: 'Count-up statistic on viewport entry (not countdown)',
    classify: (snapshot) => {
      const counter = hasWidget(snapshot, 'AnimatedCounter')
      return {
        status: counter ? 'SUPPORTED' : 'MISSING',
        existingCapabilities: counter
          ? ['widget:AnimatedCounter', 'listGroup:animatedCounter', 'capability:count-up']
          : [],
        proposedSolution:
          'Use AnimatedCounter for count-up only; compose multi-stat rows with Columns. Place Counter in Section/Columns/SlideItem.content — never in BannerSlider.slides. Respect reduced-motion and triggerOnce. For countdown needs use intent ui.countdown-timer.',
        missingDependencies: counter ? [] : ['widget:AnimatedCounter'],
        reason: counter
          ? 'AnimatedCounter is registered for viewport count-up (CB-002). It does not satisfy countdown-timer requirements.'
          : 'No count-up widget is registered.',
        evidence: 'verified',
      }
    },
  },
  {
    intent: 'ui.countdown-timer',
    description: 'Countdown / timer-to-zero widget',
    classify: () => ({
      status: 'MISSING',
      existingCapabilities: [],
      proposedSolution:
        'No countdown timer widget is registered. Do not substitute AnimatedCounter (count-up only). Owner may BUILD a dedicated Countdown Timer later or DEFER the need.',
      missingDependencies: ['widget:CountdownTimer'],
      reason:
        'Countdown Timer is absent from the Widget Registry. AnimatedCounter must not be listed as fulfilling this intent.',
      evidence: 'verified',
    }),
  },
]

export function listKnownIntents() {
  return INTENT_RULES.map(({ intent, description }) => ({ intent, description }))
}

export function classifyByIntent(intent: string, snapshot: CapabilitySnapshot) {
  const rule = INTENT_RULES.find((entry) => entry.intent === intent)
  if (!rule) return null
  return rule.classify(snapshot)
}
