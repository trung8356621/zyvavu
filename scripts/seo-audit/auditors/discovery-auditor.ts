import type { AuditFinding, DiscoveryAuditResult } from '../types'
import { fetchWithRedirectTrace } from '../http-client'

export async function auditDiscovery(
  baseUrl: string,
  rssDiscoveryLink: string | null
): Promise<{ result: DiscoveryAuditResult; findings: AuditFinding[] }> {
  const findings: AuditFinding[] = []

  // Normalize base URL
  const base = baseUrl.replace(/\/+$/, '')

  // 1. RSS Discovery Link finding
  if (rssDiscoveryLink) {
    findings.push({
      id: 'DISCOVERY_RSS_LINK_FOUND',
      category: 'discovery',
      severity: 'info',
      status: 'pass',
      title: 'RSS feed auto-discovery link present in head',
      description: `Discovered <link rel="alternate" type="application/rss+xml" href="${rssDiscoveryLink}">.`,
      affectedUrls: [baseUrl],
    })
  } else {
    findings.push({
      id: 'DISCOVERY_RSS_LINK_MISSING',
      category: 'discovery',
      severity: 'low',
      status: 'warning',
      title: 'RSS feed auto-discovery link missing in head',
      description: 'Homepage does not expose a <link rel="alternate" type="application/rss+xml"> tag.',
      affectedUrls: [baseUrl],
      recommendation: 'Add RSS auto-discovery link tag in root layout metadata.',
    })
  }

  // 2. Audit RSS Endpoint (/feed)
  const feedUrl = `${base}/feed`
  const feedRes = await fetchWithRedirectTrace(feedUrl, { timeoutMs: 5000 })
  let rssEndpointData: DiscoveryAuditResult['rssEndpoint'] = null

  if (feedRes.statusCode === 200) {
    const contentType = feedRes.headers.get('content-type') || ''
    const body = feedRes.bodyText
    const isXmlContentType = contentType.includes('xml') || contentType.includes('rss')
    const hasRssTag = body.includes('<rss') || body.includes('<feed')
    const hasChannel = body.includes('<channel>') || body.includes('<feed')

    // Count items
    const itemMatches = body.match(/<item>|<entry>/g)
    const itemCount = itemMatches ? itemMatches.length : 0

    rssEndpointData = {
      url: feedUrl,
      statusCode: feedRes.statusCode,
      contentType,
      isValidXml: isXmlContentType && hasRssTag && hasChannel,
      itemCount,
    }

    if (rssEndpointData.isValidXml) {
      findings.push({
        id: 'DISCOVERY_RSS_FEED_VALID',
        category: 'discovery',
        severity: 'info',
        status: 'pass',
        title: 'Valid RSS feed active at /feed',
        description: `RSS feed returns 200 OK with ${itemCount} items and valid XML structure.`,
        affectedUrls: [feedUrl],
        evidence: `Content-Type: ${contentType}, Items: ${itemCount}`,
      })
    } else {
      findings.push({
        id: 'DISCOVERY_RSS_FEED_INVALID',
        category: 'discovery',
        severity: 'medium',
        status: 'warning',
        title: 'RSS feed output has incorrect XML structure or content-type',
        description: 'The /feed endpoint responded with 200 but did not provide standard RSS/Atom XML.',
        affectedUrls: [feedUrl],
        evidence: `Content-Type: ${contentType}`,
        recommendation: 'Ensure RSS handler returns application/rss+xml with valid <rss><channel> structure.',
      })
    }
  } else {
    rssEndpointData = {
      url: feedUrl,
      statusCode: feedRes.statusCode,
      contentType: feedRes.headers.get('content-type'),
      isValidXml: false,
      itemCount: 0,
      error: feedRes.error || `HTTP ${feedRes.statusCode}`,
    }
    findings.push({
      id: 'DISCOVERY_RSS_FEED_MISSING',
      category: 'discovery',
      severity: 'medium',
      status: 'warning',
      title: 'RSS feed not found at /feed',
      description: `Request to ${feedUrl} returned HTTP ${feedRes.statusCode}.`,
      affectedUrls: [feedUrl],
      recommendation: 'Implement an RSS 2.0 feed route at /feed.',
    })
  }

  // 3. Audit robots.txt
  const robotsUrl = `${base}/robots.txt`
  const robotsRes = await fetchWithRedirectTrace(robotsUrl, { timeoutMs: 5000 })
  let robotsData: DiscoveryAuditResult['robotsTxt'] = null

  if (robotsRes.statusCode === 200) {
    const contentType = robotsRes.headers.get('content-type') || ''
    const content = robotsRes.bodyText
    const hasUserAgent = /user-agent:/i.test(content)
    const hasSitemapDirective = /sitemap:/i.test(content)

    let sitemapUrl: string | undefined
    const smMatch = content.match(/sitemap:\s*([^\r\n]+)/i)
    if (smMatch) {
      sitemapUrl = smMatch[1].trim()
    }

    robotsData = {
      url: robotsUrl,
      statusCode: robotsRes.statusCode,
      contentType,
      hasUserAgent,
      hasSitemapDirective,
      sitemapUrl,
      content: content.slice(0, 500),
    }

    if (hasUserAgent) {
      findings.push({
        id: 'DISCOVERY_ROBOTS_TXT_VALID',
        category: 'discovery',
        severity: 'info',
        status: 'pass',
        title: 'robots.txt found with valid User-agent directive',
        description: 'robots.txt responds with 200 OK and contains crawl directives.',
        affectedUrls: [robotsUrl],
      })
    } else {
      findings.push({
        id: 'DISCOVERY_ROBOTS_TXT_EMPTY',
        category: 'discovery',
        severity: 'medium',
        status: 'warning',
        title: 'robots.txt exists but lacks User-agent directives',
        description: 'robots.txt returned 200 but has no User-agent declaration.',
        affectedUrls: [robotsUrl],
        recommendation: 'Add standard User-agent: * and crawl rules to robots.txt.',
      })
    }

    if (!hasSitemapDirective) {
      findings.push({
        id: 'DISCOVERY_ROBOTS_NO_SITEMAP',
        category: 'discovery',
        severity: 'low',
        status: 'warning',
        title: 'robots.txt does not declare a Sitemap directive',
        description: 'Search engines benefit from a Sitemap: URL declaration in robots.txt.',
        affectedUrls: [robotsUrl],
        recommendation: 'Add Sitemap: https://yourdomain.com/sitemap.xml to robots.txt.',
      })
    }
  } else {
    robotsData = {
      url: robotsUrl,
      statusCode: robotsRes.statusCode,
      contentType: robotsRes.headers.get('content-type'),
      hasUserAgent: false,
      hasSitemapDirective: false,
      error: `HTTP ${robotsRes.statusCode}`,
    }
    findings.push({
      id: 'DISCOVERY_ROBOTS_TXT_MISSING',
      category: 'discovery',
      severity: 'medium',
      status: 'warning',
      title: 'robots.txt is missing (404)',
      description: `Request to ${robotsUrl} returned HTTP ${robotsRes.statusCode}. Crawlers expect a standard robots.txt.`,
      affectedUrls: [robotsUrl],
      recommendation: 'Add a static or dynamic robots.txt route in Next.js (e.g. app/robots.ts).',
    })
  }

  // 4. Audit sitemap.xml
  const sitemapUrl = `${base}/sitemap.xml`
  const sitemapRes = await fetchWithRedirectTrace(sitemapUrl, { timeoutMs: 5000 })
  let sitemapData: DiscoveryAuditResult['sitemap'] = null

  if (sitemapRes.statusCode === 200) {
    sitemapData = {
      url: sitemapUrl,
      statusCode: sitemapRes.statusCode,
      exists: true,
      note: 'XML sitemap found at /sitemap.xml',
    }
    findings.push({
      id: 'DISCOVERY_SITEMAP_EXISTS',
      category: 'discovery',
      severity: 'info',
      status: 'pass',
      title: 'XML Sitemap found at /sitemap.xml',
      description: 'Sitemap endpoint is reachable with HTTP 200.',
      affectedUrls: [sitemapUrl],
    })
  } else {
    sitemapData = {
      url: sitemapUrl,
      statusCode: sitemapRes.statusCode,
      exists: false,
      note: `Sitemap endpoint not implemented (HTTP ${sitemapRes.statusCode})`,
    }
    findings.push({
      id: 'DISCOVERY_SITEMAP_MISSING',
      category: 'discovery',
      severity: 'medium',
      status: 'warning',
      title: 'XML Sitemap missing (not yet implemented)',
      description: `Request to ${sitemapUrl} returned HTTP ${sitemapRes.statusCode}. Zyvavu does not currently expose /sitemap.xml.`,
      affectedUrls: [sitemapUrl],
      recommendation: 'Implement dynamic sitemap.xml generation for published posts, pages, categories, and tags.',
    })
  }

  return {
    result: {
      rssDiscoveryLink,
      rssEndpoint: rssEndpointData,
      robotsTxt: robotsData,
      sitemap: sitemapData,
    },
    findings,
  }
}
