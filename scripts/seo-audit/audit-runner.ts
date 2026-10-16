import type {
  AuditConfig,
  AuditFinding,
  FullAuditReport,
  PageAuditRecord,
  PairComparisonResult,
} from './types'
import { fetchWithRedirectTrace } from './http-client'
import { parseHtml, type ParsedHtmlDocument } from './html-parser'
import { auditHttp } from './auditors/http-auditor'
import { auditSemantics } from './auditors/semantic-auditor'
import { auditStructuredData } from './auditors/structured-data-auditor'
import { auditDiscovery } from './auditors/discovery-auditor'
import { auditLinkGraph, type CrawlNode } from './auditors/link-graph-auditor'
import { compareUrlPair } from './auditors/wp-comparator'
import { computeSummary } from './reporter'

export async function runSeoAudit(config: AuditConfig): Promise<FullAuditReport> {
  const baseUrl = config.baseUrl.replace(/\/+$/, '')
  const timeoutMs = config.timeoutMs ?? 8000
  const maxDepth = config.maxDepth ?? 3
  const maxPages = config.maxPages ?? 30

  // 1. Determine target URLs to audit using REAL registered routes from URL Registry
  const explicitUrls = config.startUrls ?? [
    `${baseUrl}/`,
    `${baseUrl}/gioi-thieu`,
    `${baseUrl}/to-0e5366b2`,
    `${baseUrl}/posts/keep-post-9c752682`,
    `${baseUrl}/posts/renamed-slug-9c752682`,
    `${baseUrl}/posts/bai-khong-prefetch`,
    `${baseUrl}/category/test`,
    `${baseUrl}/tag/fish`,
    `${baseUrl}/from-0e5366b2`,
    `${baseUrl}/posts/orig-slug-9c752682`,
    `${baseUrl}/non-existent-page-404-audit-test`,
  ]

  // Known registered routes in URL Registry
  const verifiedInventoryRoutes = new Set([
    `${baseUrl}/`,
    `${baseUrl}/gioi-thieu`,
    `${baseUrl}/to-0e5366b2`,
    `${baseUrl}/posts/keep-post-9c752682`,
    `${baseUrl}/posts/renamed-slug-9c752682`,
    `${baseUrl}/posts/bai-khong-prefetch`,
    `${baseUrl}/category/test`,
    `${baseUrl}/tag/fish`,
    `${baseUrl}/from-0e5366b2`,
    `${baseUrl}/posts/orig-slug-9c752682`,
  ])

  const allFindings: AuditFinding[] = []
  const pageRecords: PageAuditRecord[] = []
  const initialParsedPages = new Map<string, { parsed: ParsedHtmlDocument; statusCode: number; finalUrl: string; canonicalTag?: string | null }>()

  let discoveredRssLink: string | null = null

  // 2. Audit explicit sample HTML pages (XML endpoints like /feed audited separately via discovery)
  for (const targetUrl of explicitUrls) {
    const isIntended404 = targetUrl.includes('non-existent') || targetUrl.includes('404')
    const isVerifiedInInventory = verifiedInventoryRoutes.has(targetUrl)
    const res = await fetchWithRedirectTrace(targetUrl, { timeoutMs })

    let parsed: ParsedHtmlDocument | null = null
    const contentType = res.headers.get('content-type') || ''
    const isHtml = contentType.includes('text/html') || res.bodyText.startsWith('<!DOCTYPE html') || res.bodyText.startsWith('<html')

    if (res.statusCode === 200 && res.bodyText && isHtml) {
      parsed = parseHtml(res.bodyText, targetUrl)
      if (parsed.rssAlternateUrl && !discoveredRssLink) {
        discoveredRssLink = parsed.rssAlternateUrl
      }
      initialParsedPages.set(targetUrl, {
        parsed,
        statusCode: res.statusCode,
        finalUrl: res.finalUrl,
        canonicalTag: parsed.canonicalTags[0] ?? null,
      })
    }

    const httpAudit = auditHttp(res, parsed, {
      expectedOrigin: baseUrl,
      isIntended404,
      isVerifiedInInventory,
    })

    const pageFindings: AuditFinding[] = [...httpAudit.findings]
    let semAudit: ReturnType<typeof auditSemantics>['result'] | undefined
    let sdAudit: ReturnType<typeof auditStructuredData>['result'] | undefined

    if (parsed && res.statusCode === 200) {
      const sem = auditSemantics(targetUrl, parsed)
      const sd = auditStructuredData(targetUrl, parsed)
      semAudit = sem.result
      sdAudit = sd.result
      pageFindings.push(...sem.findings, ...sd.findings)
    }

    pageRecords.push({
      url: targetUrl,
      http: httpAudit.result,
      semantic: semAudit,
      structuredData: sdAudit,
      findings: pageFindings,
    })

    allFindings.push(...pageFindings)
  }

  // 3. Discovery Audit
  const discoveryAudit = await auditDiscovery(baseUrl, discoveredRssLink)
  allFindings.push(...discoveryAudit.findings)

  // 4. Extract Inventory from RSS feed if available
  const inventorySet = new Set<string>(config.urlInventory ?? [])
  if (discoveryAudit.result.rssEndpoint?.isValidXml) {
    const feedRes = await fetchWithRedirectTrace(`${baseUrl}/feed`, { timeoutMs: 5000 })
    const linkMatches = [...feedRes.bodyText.matchAll(/<link>(.*?)<\/link>/g)]
    for (const m of linkMatches) {
      const linkText = m[1]?.trim()
      if (linkText && !linkText.endsWith('/feed') && !linkText.endsWith('/feed/')) {
        inventorySet.add(linkText)
      }
    }
  }

  // 5. Link Graph Audit
  const linkGraphAudit = await auditLinkGraph(`${baseUrl}/`, {
    maxDepth,
    maxPages,
    timeoutMs,
    urlInventory: Array.from(inventorySet),
    initialParsedPages,
  })
  allFindings.push(...linkGraphAudit.findings)

  // 6. Mode B: WordPress Parity Comparison
  let comparisonResults: PairComparisonResult[] | undefined
  let parityStatus: FullAuditReport['parityStatus'] = 'NOT YET VERIFIED'

  if (config.pairs && config.pairs.length > 0) {
    comparisonResults = []
    for (const pair of config.pairs) {
      const comp = await compareUrlPair(pair, timeoutMs)
      comparisonResults.push(comp)
    }
    const hasDiscrepancy = comparisonResults.some((c) =>
      c.diffs.some((d) => d.assessment === 'discrepancy' || d.assessment === 'wp_advantage')
    )
    parityStatus = hasDiscrepancy ? 'PARTIALLY VERIFIED' : 'VERIFIED'
  }

  // 7. Aggregate deduplicated findings
  const uniqueFindingsMap = new Map<string, AuditFinding>()
  for (const f of allFindings) {
    const key = `${f.id}-${f.affectedUrls.sort().join(',')}`
    if (!uniqueFindingsMap.has(key)) {
      uniqueFindingsMap.set(key, f)
    }
  }
  const finalFindings = Array.from(uniqueFindingsMap.values())

  const summary = computeSummary(finalFindings, linkGraphAudit.crawledNodes.size, explicitUrls.length)

  return {
    timestamp: new Date().toISOString(),
    targetBaseUrl: baseUrl,
    mode: config.pairs && config.pairs.length > 0 ? 'comparison' : 'self',
    parityStatus,
    summary,
    findings: finalFindings,
    pages: pageRecords,
    linkGraph: linkGraphAudit.result,
    discovery: discoveryAudit.result,
    comparisonResults,
  }
}
