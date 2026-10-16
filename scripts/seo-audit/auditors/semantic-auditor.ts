import type { AuditFinding, SemanticAuditResult } from '../types'
import type { ParsedHtmlDocument } from '../html-parser'

export function auditSemantics(
  url: string,
  parsed: ParsedHtmlDocument
): { result: SemanticAuditResult; findings: AuditFinding[] } {
  const findings: AuditFinding[] = []

  const title = parsed.title
  const titleLength = title?.length ?? 0
  const metaDescription = parsed.metaDescription
  const descriptionLength = metaDescription?.length ?? 0
  const h1List = parsed.h1List
  const headings = parsed.headings
  const headingHierarchyErrors = parsed.headingHierarchyErrors

  const missingAltImages = parsed.images.filter((img) => !img.hasAlt)
  const missingAltCount = missingAltImages.length

  // Internal vs External links
  let host = ''
  try {
    host = new URL(url).host
  } catch {
    // ignore
  }

  const internalLinks: Array<{ href: string; text: string; rel?: string }> = []
  const externalLinks: Array<{ href: string; text: string; rel?: string }> = []
  const emptyAnchorLinks: string[] = []

  for (const l of parsed.links) {
    let isInternal = false
    try {
      const linkUrl = new URL(l.href)
      isInternal = linkUrl.host === host || linkUrl.host.includes('zyvavu.test') || linkUrl.host.includes('localhost')
    } catch {
      isInternal = l.href.startsWith('/')
    }

    if (isInternal) {
      internalLinks.push(l)
    } else {
      externalLinks.push(l)
    }

    if (!l.text && !l.href.includes('/api/media')) {
      emptyAnchorLinks.push(l.href)
    }
  }

  // --- Check findings ---

  // 1. Title
  if (!title) {
    findings.push({
      id: 'SEMANTIC_TITLE_MISSING',
      category: 'semantic',
      severity: 'high',
      status: 'fail',
      title: 'Missing document <title> tag',
      description: 'Document has no title tag in raw SSR HTML.',
      affectedUrls: [url],
      recommendation: 'Provide title via Next.js metadata API.',
    })
  } else {
    if (titleLength < 10) {
      findings.push({
        id: 'SEMANTIC_TITLE_SHORT',
        category: 'semantic',
        severity: 'low',
        status: 'warning',
        title: 'Title tag is very short (< 10 chars)',
        description: `Title "${title}" is only ${titleLength} characters long.`,
        affectedUrls: [url],
        evidence: `"${title}" (${titleLength} chars)`,
      })
    } else if (titleLength > 70) {
      findings.push({
        id: 'SEMANTIC_TITLE_LONG',
        category: 'semantic',
        severity: 'low',
        status: 'warning',
        title: 'Title tag may truncate in SERPs (> 70 chars)',
        description: `Title is ${titleLength} characters long and may be truncated.`,
        affectedUrls: [url],
        evidence: `"${title}" (${titleLength} chars)`,
      })
    }
  }

  // 2. Meta description
  if (!metaDescription) {
    findings.push({
      id: 'SEMANTIC_DESC_MISSING',
      category: 'semantic',
      severity: 'medium',
      status: 'warning',
      title: 'Missing meta description',
      description: 'No <meta name="description"> found in SSR HTML.',
      affectedUrls: [url],
      recommendation: 'Provide descriptive meta description from excerpt or content snippet.',
    })
  } else {
    if (descriptionLength < 30) {
      findings.push({
        id: 'SEMANTIC_DESC_SHORT',
        category: 'semantic',
        severity: 'low',
        status: 'warning',
        title: 'Meta description is short (< 30 chars)',
        description: `Meta description is only ${descriptionLength} characters long.`,
        affectedUrls: [url],
        evidence: `"${metaDescription}"`,
      })
    } else if (descriptionLength > 165) {
      findings.push({
        id: 'SEMANTIC_DESC_LONG',
        category: 'semantic',
        severity: 'low',
        status: 'warning',
        title: 'Meta description exceeds recommended length (> 165 chars)',
        description: `Meta description is ${descriptionLength} characters long.`,
        affectedUrls: [url],
        evidence: `${descriptionLength} chars`,
      })
    }
  }

  // 3. H1 headings
  if (h1List.length === 0) {
    findings.push({
      id: 'SEMANTIC_H1_MISSING',
      category: 'semantic',
      severity: 'high',
      status: 'fail',
      title: 'Missing primary <h1> heading',
      description: 'The page has no <h1> heading rendered in SSR HTML.',
      affectedUrls: [url],
      recommendation: 'Render the page or article title within a single semantic <h1>.',
    })
  } else if (h1List.length > 1) {
    findings.push({
      id: 'SEMANTIC_H1_MULTIPLE',
      category: 'semantic',
      severity: 'medium',
      status: 'warning',
      title: 'Multiple <h1> headings found',
      description: `Page has ${h1List.length} separate <h1> tags. Best practice is a single <h1>.`,
      affectedUrls: [url],
      evidence: h1List.map((h) => `"${h}"`).join('; '),
      recommendation: 'Demote secondary section headings to <h2>.',
    })
  }

  // 4. Heading hierarchy
  if (headingHierarchyErrors.length > 0) {
    findings.push({
      id: 'SEMANTIC_HEADING_HIERARCHY',
      category: 'semantic',
      severity: 'medium',
      status: 'warning',
      title: 'Skipped heading hierarchy levels',
      description: 'Heading tags do not step down sequentially (e.g. h1 -> h3).',
      affectedUrls: [url],
      evidence: headingHierarchyErrors.join('; '),
      recommendation: 'Organize headings in logical hierarchy without skipping levels.',
    })
  }

  // 5. Image Alt attributes
  if (missingAltCount > 0) {
    findings.push({
      id: 'SEMANTIC_IMG_ALT_MISSING',
      category: 'semantic',
      severity: 'medium',
      status: 'warning',
      title: 'Images missing alt attribute',
      description: `Found ${missingAltCount} image(s) lacking alt attribute entirely.`,
      affectedUrls: [url],
      evidence: missingAltImages.map((i) => i.src).slice(0, 5).join(', '),
      recommendation: 'Add descriptive alt text or alt="" for decorative images.',
    })
  }

  // 6. Empty anchor text
  if (emptyAnchorLinks.length > 3) {
    findings.push({
      id: 'SEMANTIC_EMPTY_ANCHORS',
      category: 'semantic',
      severity: 'low',
      status: 'warning',
      title: 'Multiple crawlable links lack anchor text',
      description: `Found ${emptyAnchorLinks.length} links with empty inner text.`,
      affectedUrls: [url],
      evidence: emptyAnchorLinks.slice(0, 5).join(', '),
      recommendation: 'Ensure links have readable anchor text or aria-label.',
    })
  }

  // 7. Landmark elements
  if (!parsed.hasMainTag) {
    findings.push({
      id: 'SEMANTIC_MAIN_MISSING',
      category: 'semantic',
      severity: 'low',
      status: 'warning',
      title: 'Missing semantic <main> landmark',
      description: 'Page structure does not contain a semantic <main> element.',
      affectedUrls: [url],
      recommendation: 'Wrap the primary content area in <main>.',
    })
  }

  const result: SemanticAuditResult = {
    url,
    title,
    titleLength,
    metaDescription,
    descriptionLength,
    hasMainTag: parsed.hasMainTag,
    hasArticleTag: parsed.hasArticleTag,
    hasNavTag: parsed.hasNavTag,
    hasHeaderTag: parsed.hasHeaderTag,
    hasFooterTag: parsed.hasFooterTag,
    h1List,
    headings,
    headingHierarchyErrors,
    internalLinks,
    externalLinks,
    images: parsed.images,
    missingAltCount,
    pagination: parsed.pagination,
    approximateWordCount: parsed.approximateWordCount,
  }

  return { result, findings }
}
