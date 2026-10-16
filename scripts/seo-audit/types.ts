export type FindingSeverity = 'high' | 'medium' | 'low' | 'info'
export type FindingStatus = 'pass' | 'fail' | 'warning' | 'not_tested'

export interface AuditFinding {
  id: string
  category: 'http' | 'semantic' | 'structured-data' | 'link-graph' | 'discovery' | 'wp-parity'
  severity: FindingSeverity
  status: FindingStatus
  title: string
  description: string
  affectedUrls: string[]
  evidence?: string
  recommendation?: string
}

export interface AuditSummary {
  totalAuditedUrls: number
  crawledPages: number
  passCount: number
  failCount: number
  warningCount: number
  notTestedCount: number
  highCount: number
  mediumCount: number
  lowCount: number
}

export interface RedirectHop {
  statusCode: number
  location: string
}

export interface HttpAuditResult {
  url: string
  statusCode: number
  statusText: string
  finalUrl: string
  redirectHops: RedirectHop[]
  isRedirectLoop: boolean
  contentType: string | null
  canonicalTag: string | null
  canonicalTagsCount: number
  isCanonicalMatching: boolean
  robotsMeta: string | null
  xRobotsTag: string | null
  isIndexable: boolean
  isSoft404: boolean
  originMatch: boolean
  etag: string | null
  cacheControl: string | null
}

export interface HeadingItem {
  tag: string
  text: string
  level: number
}

export interface SemanticAuditResult {
  url: string
  title: string | null
  titleLength: number
  metaDescription: string | null
  descriptionLength: number
  hasMainTag: boolean
  hasArticleTag: boolean
  hasNavTag: boolean
  hasHeaderTag: boolean
  hasFooterTag: boolean
  h1List: string[]
  headings: HeadingItem[]
  headingHierarchyErrors: string[]
  internalLinks: Array<{ href: string; text: string; rel?: string }>
  externalLinks: Array<{ href: string; text: string; rel?: string }>
  images: Array<{ src: string; alt: string | null; hasAlt: boolean }>
  missingAltCount: number
  pagination: {
    hasPagination: boolean
    prevHref?: string
    nextHref?: string
  }
  approximateWordCount: number
}

export interface StructuredDataNode {
  '@type'?: string | string[]
  '@id'?: string
  [key: string]: unknown
}

export interface StructuredDataAuditResult {
  url: string
  scriptCount: number
  validJsonCount: number
  syntaxErrors: string[]
  graphNodes: StructuredDataNode[]
  duplicateIds: string[]
  hasOrganization: boolean
  hasWebSite: boolean
  hasWebPage: boolean
  hasArticle: boolean
  hasBreadcrumbList: boolean
  organizationId?: string
  webSiteId?: string
  webPageId?: string
  articleId?: string
  breadcrumbListId?: string
  relationshipErrors: string[]
  dateValidationErrors: string[]
}

export interface PageAuditRecord {
  url: string
  http: HttpAuditResult
  semantic?: SemanticAuditResult
  structuredData?: StructuredDataAuditResult
  findings: AuditFinding[]
}

export interface LinkGraphResult {
  inboundMap: Record<string, string[]>
  outboundMap: Record<string, string[]>
  crawlDepth: Record<string, number>
  brokenLinks: Array<{ fromUrl: string; targetUrl: string; statusCode?: number; error?: string }>
  redirectingLinks: Array<{ fromUrl: string; targetUrl: string; finalUrl: string; statusCode: number }>
  nonCanonicalLinks: Array<{ fromUrl: string; targetUrl: string; canonicalTarget: string }>
  orphanUrls: string[]
  unreachableInventoryUrls: string[]
}

export interface DiscoveryAuditResult {
  rssDiscoveryLink: string | null
  rssEndpoint: {
    url: string
    statusCode: number
    contentType: string | null
    isValidXml: boolean
    itemCount: number
    error?: string
  } | null
  robotsTxt: {
    url: string
    statusCode: number
    contentType: string | null
    hasUserAgent: boolean
    hasSitemapDirective: boolean
    sitemapUrl?: string
    content?: string
    error?: string
  } | null
  sitemap: {
    url: string
    statusCode: number
    exists: boolean
    note: string
  } | null
}

export interface ComparisonPair {
  label?: string
  zyvavuUrl: string
  wordpressUrl: string
}

export interface PairComparisonDiff {
  field: string
  zyvavuValue: unknown
  wpValue: unknown
  assessment: 'parity' | 'discrepancy' | 'zyvavu_advantage' | 'wp_advantage'
  explanation: string
}

export interface PairComparisonResult {
  label: string
  zyvavuUrl: string
  wordpressUrl: string
  zyvavuSummary: {
    statusCode: number
    isIndexable: boolean
    canonical: string | null
    title: string | null
    h1: string[]
    schemaTypes: string[]
    internalLinksCount: number
    wordCount: number
  }
  wpSummary: {
    statusCode: number
    isIndexable: boolean
    canonical: string | null
    title: string | null
    h1: string[]
    schemaTypes: string[]
    internalLinksCount: number
    wordCount: number
  }
  diffs: PairComparisonDiff[]
}

export interface AuditConfig {
  baseUrl: string
  startUrls?: string[]
  urlInventory?: string[]
  pairs?: ComparisonPair[]
  maxDepth?: number
  maxPages?: number
  timeoutMs?: number
  outputDir?: string
  format?: 'markdown' | 'json' | 'all'
  originWhitelist?: string[]
}

export interface FullAuditReport {
  timestamp: string
  targetBaseUrl: string
  mode: 'self' | 'comparison'
  parityStatus: 'VERIFIED' | 'NOT YET VERIFIED' | 'PARTIALLY VERIFIED'
  summary: AuditSummary
  findings: AuditFinding[]
  pages: PageAuditRecord[]
  linkGraph: LinkGraphResult
  discovery: DiscoveryAuditResult
  comparisonResults?: PairComparisonResult[]
}
