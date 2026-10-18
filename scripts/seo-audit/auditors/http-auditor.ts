import type { AuditFinding, HttpAuditResult } from '../types'
import type { HttpResponseData } from '../http-client'
import type { ParsedHtmlDocument } from '../html-parser'

export function auditHttp(
  res: HttpResponseData,
  parsed: ParsedHtmlDocument | null,
  options: { expectedOrigin?: string; isIntended404?: boolean; isVerifiedInInventory?: boolean } = {}
): { result: HttpAuditResult; findings: AuditFinding[] } {
  const findings: AuditFinding[] = []
  const url = res.url
  const finalUrl = res.finalUrl
  const statusCode = res.statusCode

  const xRobotsTag = res.headers.get('x-robots-tag')?.trim() || null
  const contentType = res.headers.get('content-type')?.trim() || null
  const etag = res.headers.get('etag')?.trim() || null
  const cacheControl = res.headers.get('cache-control')?.trim() || null

  const canonicalTags = parsed?.canonicalTags ?? []
  const canonicalTag = canonicalTags[0] ?? null
  const canonicalTagsCount = canonicalTags.length

  const robotsMeta = parsed?.metaRobots ?? null

  // Soft-404 checks
  const is200 = statusCode === 200
  let isSoft404 = false
  if (is200 && parsed) {
    const titleLower = (parsed.title || '').toLowerCase()
    const bodySnippet = parsed.bodyPlainText.slice(0, 1000).toLowerCase()
    const soft404Keywords = [
      '404 not found',
      'page not found',
      'trang không tìm thấy',
      'không tìm thấy trang',
      'nội dung không tồn tại',
      'trang không tồn tại',
    ]
    if (soft404Keywords.some((kw) => titleLower.includes(kw) || bodySnippet.includes(kw))) {
      isSoft404 = true
    }
    if (parsed.approximateWordCount < 5 && !parsed.hasMainTag) {
      isSoft404 = true
    }
  }

  // Indexability
  const hasNoindexMeta = robotsMeta ? /noindex/i.test(robotsMeta) : false
  const hasNoindexHeader = xRobotsTag ? /noindex/i.test(xRobotsTag) : false
  const isNoindex = hasNoindexMeta || hasNoindexHeader
  const isIndexable = is200 && !isNoindex && !isSoft404

  // Canonical matching
  let isCanonicalMatching = true
  if (canonicalTag) {
    try {
      const parsedCanonical = new URL(canonicalTag)
      const parsedFinal = new URL(finalUrl)
      // Ignore trailing slash difference when comparing path
      const cPath = parsedCanonical.pathname.replace(/\/+$/, '') || '/'
      const fPath = parsedFinal.pathname.replace(/\/+$/, '') || '/'
      isCanonicalMatching = cPath === fPath
    } catch {
      isCanonicalMatching = false
    }
  }

  // Origin match
  let originMatch = true
  if (options.expectedOrigin && canonicalTag) {
    try {
      const cOrigin = new URL(canonicalTag).origin
      const expOrigin = new URL(options.expectedOrigin).origin
      originMatch = cOrigin === expOrigin
    } catch {
      originMatch = false
    }
  }

  // --- Findings evaluation ---

  // FIX 2: Inconclusive timeout handling
  if (res.isInconclusiveTimeout || statusCode === 408) {
    findings.push({
      id: 'HTTP_TIMEOUT_INCONCLUSIVE',
      category: 'http',
      severity: 'medium',
      status: 'warning',
      title: 'Request timed out during compilation/cold SSR (Inconclusive)',
      description: 'Request reached timeout threshold after 1 bounded retry. Classified as inconclusive rather than a confirmed broken link.',
      affectedUrls: [url],
      evidence: `Status 408 / Timeout after ${res.retriesPerformed || 1} retry`,
      recommendation: 'Re-test on warm server or verify server log for prolonged compile time.',
    })
  }

  // 1. Redirect loops
  if (res.isRedirectLoop) {
    findings.push({
      id: 'HTTP_REDIRECT_LOOP',
      category: 'http',
      severity: 'high',
      status: 'fail',
      title: 'Redirect loop detected',
      description: `The URL is caught in an infinite redirect loop.`,
      affectedUrls: [url],
      evidence: res.error,
      recommendation: 'Fix URL Registry or server route redirects to point directly to the destination.',
    })
  }

  // 2. Redirect chain (>2 hops)
  if (res.redirectHops.length > 2) {
    findings.push({
      id: 'HTTP_REDIRECT_CHAIN',
      category: 'http',
      severity: 'medium',
      status: 'warning',
      title: 'Redirect chain with multiple hops',
      description: `URL triggered ${res.redirectHops.length} redirect hops before terminating.`,
      affectedUrls: [url],
      evidence: res.redirectHops.map((h) => `${h.statusCode} -> ${h.location}`).join('; '),
      recommendation: 'Collapse redirect chains to a single 301/308 direct jump.',
    })
  }

  // 3. Status code findings
  if (options.isIntended404) {
    if (statusCode === 404) {
      findings.push({
        id: 'HTTP_404_VERIFIED',
        category: 'http',
        severity: 'info',
        status: 'pass',
        title: 'Nonexistent URL returns clean 404 status',
        description: 'The requested nonexistent URL properly returned HTTP 404 Not Found without leaking soft-404.',
        affectedUrls: [url],
      })
    } else {
      findings.push({
        id: 'HTTP_404_LEAK',
        category: 'http',
        severity: 'high',
        status: 'fail',
        title: 'Nonexistent URL did not return 404',
        description: `Expected 404 for nonexistent route, but received HTTP ${statusCode}.`,
        affectedUrls: [url],
        evidence: `HTTP ${statusCode}`,
        recommendation: 'Ensure missing content triggers notFound() and returns HTTP 404 status.',
      })
    }
  } else if (!res.isInconclusiveTimeout && statusCode !== 408) {
    if (statusCode >= 500) {
      findings.push({
        id: 'HTTP_SERVER_ERROR',
        category: 'http',
        severity: 'high',
        status: 'fail',
        title: `HTTP 5xx Server Error (${statusCode})`,
        description: `Server failed to render or respond to request.`,
        affectedUrls: [url],
        evidence: `HTTP ${statusCode} ${res.statusText}`,
        recommendation: 'Check server logs for unhandled runtime exceptions or database connectivity.',
      })
    } else if (statusCode === 404) {
      if (options.isVerifiedInInventory) {
        // Confirmed failure: Route exists in inventory/URL Registry but returned 404
        findings.push({
          id: 'HTTP_NOT_FOUND',
          category: 'http',
          severity: 'high',
          status: 'fail',
          title: 'HTTP 404 Not Found for verified registered route',
          description: `Registered canonical or redirect URL returned HTTP 404.`,
          affectedUrls: [url],
          evidence: `HTTP 404 at ${url} (Verified in URL Registry)`,
          recommendation: 'Verify route handler mapping for this registered resource in URL Registry.',
        })
      } else {
        // Route was assumed, not confirmed in inventory
        findings.push({
          id: 'HTTP_UNVERIFIED_NOT_FOUND',
          category: 'http',
          severity: 'low',
          status: 'warning',
          title: 'HTTP 404 for unverified route',
          description: `Requested path returned 404; route was not verified in the URL Registry inventory.`,
          affectedUrls: [url],
          evidence: `HTTP 404 at ${url} (Unverified path)`,
        })
      }
    } else if (isSoft404) {
      findings.push({
        id: 'HTTP_SOFT_404',
        category: 'http',
        severity: 'high',
        status: 'fail',
        title: 'Soft-404 detected on HTTP 200 response',
        description: 'Page returned HTTP 200 OK but page content displays 404 / Not Found message or lacks substantive content.',
        affectedUrls: [url],
        evidence: `Title: "${parsed?.title}", words: ${parsed?.approximateWordCount}`,
        recommendation: 'Return a real HTTP 404 status code instead of an empty or error template.',
      })
    }
  }

  // 4. Canonical tags
  if (is200 && !options.isIntended404) {
    if (canonicalTagsCount === 0) {
      findings.push({
        id: 'CANONICAL_MISSING',
        category: 'http',
        severity: 'high',
        status: 'fail',
        title: 'Missing canonical URL link tag',
        description: 'Published page does not declare a <link rel="canonical"> element.',
        affectedUrls: [url],
        recommendation: 'Emit <link rel="canonical"> in server metadata.',
      })
    } else if (canonicalTagsCount > 1) {
      findings.push({
        id: 'CANONICAL_DUPLICATE',
        category: 'http',
        severity: 'high',
        status: 'fail',
        title: 'Multiple conflicting canonical tags',
        description: `Page declares ${canonicalTagsCount} conflicting <link rel="canonical"> tags.`,
        affectedUrls: [url],
        evidence: canonicalTags.join(', '),
        recommendation: 'Ensure only one canonical link tag is rendered per page.',
      })
    } else {
      if (!isCanonicalMatching) {
        findings.push({
          id: 'CANONICAL_MISMATCH',
          category: 'http',
          severity: 'medium',
          status: 'warning',
          title: 'Canonical URL points to different destination',
          description: `Page requested at ${finalUrl} has canonical pointing to ${canonicalTag}.`,
          affectedUrls: [url],
          evidence: `Requested: ${finalUrl} vs Canonical: ${canonicalTag}`,
          recommendation: 'Verify whether this is an intentional consolidation or a permalink discrepancy.',
        })
      } else {
        findings.push({
          id: 'CANONICAL_VALID',
          category: 'http',
          severity: 'info',
          status: 'pass',
          title: 'Canonical URL is valid and self-referential',
          description: `Canonical tag correctly points to ${canonicalTag}.`,
          affectedUrls: [url],
        })
      }
    }

    if (canonicalTag && !originMatch) {
      findings.push({
        id: 'CANONICAL_ORIGIN_MISMATCH',
        category: 'http',
        severity: 'medium',
        status: 'warning',
        title: 'Canonical URL origin differs from expected base origin',
        description: `Canonical URL ${canonicalTag} has different origin than expected ${options.expectedOrigin}.`,
        affectedUrls: [url],
        evidence: `Expected: ${options.expectedOrigin}, Found: ${canonicalTag}`,
        recommendation: 'Ensure siteUrl setting matches current hosting domain / proxy origin.',
      })
    }

    // 5. Indexability
    if (isNoindex) {
      findings.push({
        id: 'ROBOTS_NOINDEX',
        category: 'http',
        severity: 'medium',
        status: 'warning',
        title: 'Page declares noindex directive',
        description: `Page is marked noindex via meta tag (${robotsMeta}) or X-Robots-Tag (${xRobotsTag}).`,
        affectedUrls: [url],
        evidence: `robotsMeta: ${robotsMeta}, xRobotsTag: ${xRobotsTag}`,
      })
    }
  }

  const result: HttpAuditResult = {
    url,
    statusCode,
    statusText: res.statusText,
    finalUrl,
    redirectHops: res.redirectHops,
    isRedirectLoop: res.isRedirectLoop,
    contentType,
    canonicalTag,
    canonicalTagsCount,
    isCanonicalMatching,
    robotsMeta,
    xRobotsTag,
    isIndexable,
    isSoft404,
    originMatch,
    etag,
    cacheControl,
  }

  return { result, findings }
}
