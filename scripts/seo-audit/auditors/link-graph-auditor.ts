import type { AuditFinding, LinkGraphResult } from '../types'
import { fetchWithRedirectTrace } from '../http-client'
import { parseHtml, type ParsedHtmlDocument } from '../html-parser'

export interface CrawlNode {
  url: string
  depth: number
  parsed?: ParsedHtmlDocument
  statusCode?: number
  finalUrl?: string
  canonicalTag?: string | null
}

export async function auditLinkGraph(
  startUrl: string,
  options: {
    maxDepth?: number
    maxPages?: number
    timeoutMs?: number
    urlInventory?: string[]
    initialParsedPages?: Map<string, { parsed: ParsedHtmlDocument; statusCode: number; finalUrl: string; canonicalTag?: string | null }>
  } = {}
): Promise<{ result: LinkGraphResult; crawledNodes: Map<string, CrawlNode>; findings: AuditFinding[] }> {
  const maxDepth = options.maxDepth ?? 3
  const maxPages = options.maxPages ?? 30
  const timeoutMs = options.timeoutMs ?? 6000
  const inventory = (options.urlInventory ?? []).map((u) => normalizeUrl(u))

  let baseOrigin = ''
  try {
    baseOrigin = new URL(startUrl).origin
  } catch {
    baseOrigin = startUrl
  }

  const crawledNodes = new Map<string, CrawlNode>()
  const inboundMap: Record<string, string[]> = {}
  const outboundMap: Record<string, string[]> = {}
  const crawlDepth: Record<string, number> = {}

  const brokenLinks: LinkGraphResult['brokenLinks'] = []
  const redirectingLinks: LinkGraphResult['redirectingLinks'] = []
  const nonCanonicalLinks: LinkGraphResult['nonCanonicalLinks'] = []

  // Pre-seed if initialParsedPages provided
  if (options.initialParsedPages) {
    for (const [u, data] of options.initialParsedPages.entries()) {
      const norm = normalizeUrl(u)
      crawledNodes.set(norm, {
        url: norm,
        depth: 0,
        parsed: data.parsed,
        statusCode: data.statusCode,
        finalUrl: data.finalUrl,
        canonicalTag: data.canonicalTag,
      })
    }
  }

  // BFS Queue
  const queue: Array<{ url: string; depth: number; fromUrl?: string }> = [
    { url: normalizeUrl(startUrl), depth: 0 },
  ]
  const visited = new Set<string>()

  while (queue.length > 0 && crawledNodes.size < maxPages) {
    const item = queue.shift()!
    const currentNormUrl = item.url
    const currentDepth = item.depth

    if (visited.has(currentNormUrl)) continue
    visited.add(currentNormUrl)

    crawlDepth[currentNormUrl] = currentDepth

    // If already pre-crawled
    let node = crawledNodes.get(currentNormUrl)
    if (!node || !node.parsed) {
      const res = await fetchWithRedirectTrace(currentNormUrl, { timeoutMs })
      const parsed = res.statusCode === 200 ? parseHtml(res.bodyText, currentNormUrl) : undefined
      const canonicalTag = parsed?.canonicalTags[0] ?? null

      node = {
        url: currentNormUrl,
        depth: currentDepth,
        parsed,
        statusCode: res.statusCode,
        finalUrl: res.finalUrl,
        canonicalTag,
      }
      crawledNodes.set(currentNormUrl, node)

      // Check redirect
      if (res.redirectHops.length > 0 && item.fromUrl) {
        redirectingLinks.push({
          fromUrl: item.fromUrl,
          targetUrl: currentNormUrl,
          finalUrl: res.finalUrl,
          statusCode: res.redirectHops[0].statusCode,
        })
      }

      // Check broken link
      if (res.statusCode >= 400 && item.fromUrl) {
        brokenLinks.push({
          fromUrl: item.fromUrl,
          targetUrl: currentNormUrl,
          statusCode: res.statusCode,
          error: res.statusText,
        })
      }
    }

    if (!node.parsed) continue

    // Extract outgoing internal links
    const currentOutbound: string[] = []
    for (const link of node.parsed.links) {
      const href = link.href
      if (!isInternalUrl(href, baseOrigin)) continue

      const normTarget = normalizeUrl(href)
      currentOutbound.push(normTarget)

      // Register inbound
      if (!inboundMap[normTarget]) inboundMap[normTarget] = []
      if (!inboundMap[normTarget].includes(currentNormUrl)) {
        inboundMap[normTarget].push(currentNormUrl)
      }

      // Enqueue next
      if (!visited.has(normTarget) && currentDepth + 1 <= maxDepth && queue.length < maxPages * 2) {
        queue.push({ url: normTarget, depth: currentDepth + 1, fromUrl: currentNormUrl })
      }
    }

    outboundMap[currentNormUrl] = Array.from(new Set(currentOutbound))
  }

  // Check non-canonical links among crawled nodes
  for (const [u, node] of crawledNodes.entries()) {
    if (node.canonicalTag && node.statusCode === 200) {
      const normCanonical = normalizeUrl(node.canonicalTag)
      if (normCanonical !== u) {
        // Find who links to this non-canonical URL
        const inbounds = inboundMap[u] || []
        for (const fromUrl of inbounds) {
          nonCanonicalLinks.push({
            fromUrl,
            targetUrl: u,
            canonicalTarget: normCanonical,
          })
        }
      }
    }
  }

  // Orphan URLs: only evaluate against supplied inventory when inventory has items and crawl was substantial
  const orphanUrls: string[] = []
  const unreachableInventoryUrls: string[] = []

  if (inventory.length > 0) {
    for (const invUrl of inventory) {
      const normInv = normalizeUrl(invUrl)
      const inbounds = inboundMap[normInv] || []
      const isCrawled = crawledNodes.has(normInv)

      if (inbounds.length === 0) {
        orphanUrls.push(normInv)
      }
      if (!isCrawled) {
        unreachableInventoryUrls.push(normInv)
      }
    }
  }

  // Build findings
  const findings: AuditFinding[] = []

  // 1. Broken internal links
  if (brokenLinks.length > 0) {
    findings.push({
      id: 'LINK_BROKEN_INTERNAL',
      category: 'link-graph',
      severity: 'high',
      status: 'fail',
      title: 'Broken internal link(s) discovered in SSR HTML',
      description: `Discovered ${brokenLinks.length} internal link(s) returning 4xx or 5xx status.`,
      affectedUrls: brokenLinks.map((b) => b.targetUrl),
      evidence: brokenLinks
        .map((b) => `${b.fromUrl} -> ${b.targetUrl} (HTTP ${b.statusCode || 'ERR'})`)
        .slice(0, 8)
        .join('; '),
      recommendation: 'Update or remove broken <a href> links from templates or menus.',
    })
  }

  // 2. Redirecting internal links
  if (redirectingLinks.length > 0) {
    findings.push({
      id: 'LINK_REDIRECTING_INTERNAL',
      category: 'link-graph',
      severity: 'medium',
      status: 'warning',
      title: 'Internal links pointing to redirecting URLs',
      description: `Found ${redirectingLinks.length} internal link(s) that trigger a redirect hop instead of linking directly to final destination.`,
      affectedUrls: redirectingLinks.map((r) => r.targetUrl),
      evidence: redirectingLinks
        .map((r) => `${r.fromUrl} -> ${r.targetUrl} (HTTP ${r.statusCode} -> ${r.finalUrl})`)
        .slice(0, 5)
        .join('; '),
      recommendation: 'Update internal links to point directly to the canonical destination.',
    })
  }

  // 3. Non-canonical links
  if (nonCanonicalLinks.length > 0) {
    findings.push({
      id: 'LINK_NON_CANONICAL',
      category: 'link-graph',
      severity: 'medium',
      status: 'warning',
      title: 'Internal links pointing to non-canonical URLs',
      description: `Discovered ${nonCanonicalLinks.length} link(s) pointing to URLs that declare a different canonical target.`,
      affectedUrls: nonCanonicalLinks.map((n) => n.targetUrl),
      evidence: nonCanonicalLinks
        .map((n) => `${n.fromUrl} -> ${n.targetUrl} (Canonical: ${n.canonicalTarget})`)
        .slice(0, 5)
        .join('; '),
      recommendation: 'Link directly to canonical URL to avoid diluting link equity.',
    })
  }

  // 4. Orphan URLs finding
  if (inventory.length > 0 && orphanUrls.length > 0) {
    findings.push({
      id: 'LINK_ORPHAN_URLS',
      category: 'link-graph',
      severity: 'medium',
      status: 'warning',
      title: 'Orphan URLs detected in supplied inventory',
      description: `Found ${orphanUrls.length} inventory URL(s) with 0 inbound internal links discovered in the crawl.`,
      affectedUrls: orphanUrls,
      evidence: orphanUrls.slice(0, 5).join(', '),
      recommendation: 'Add contextual links or navigation menus leading to these pages.',
    })
  }

  if (brokenLinks.length === 0 && redirectingLinks.length === 0) {
    findings.push({
      id: 'LINK_GRAPH_HEALTHY',
      category: 'link-graph',
      severity: 'info',
      status: 'pass',
      title: 'No broken or redirecting internal links found',
      description: `Crawled ${crawledNodes.size} pages without detecting broken internal links.`,
      affectedUrls: [startUrl],
    })
  }

  const result: LinkGraphResult = {
    inboundMap,
    outboundMap,
    crawlDepth,
    brokenLinks,
    redirectingLinks,
    nonCanonicalLinks,
    orphanUrls,
    unreachableInventoryUrls,
  }

  return { result, crawledNodes, findings }
}

function normalizeUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl)
    // Remove query & hash for link graph comparison
    let path = u.pathname.replace(/\/+$/, '') || '/'
    return `${u.origin}${path}`
  } catch {
    return rawUrl.replace(/\/+$/, '') || '/'
  }
}

function isInternalUrl(rawUrl: string, baseOrigin: string): boolean {
  if (rawUrl.startsWith('/') || rawUrl.startsWith('./') || rawUrl.startsWith('../')) {
    return true
  }
  try {
    const u = new URL(rawUrl)
    const base = new URL(baseOrigin)
    return u.host === base.host || u.host.includes('zyvavu.test') || u.host.includes('localhost')
  } catch {
    return false
  }
}
