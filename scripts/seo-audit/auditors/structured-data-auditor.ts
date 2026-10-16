import type { AuditFinding, StructuredDataAuditResult, StructuredDataNode } from '../types'
import type { ParsedHtmlDocument } from '../html-parser'

export function auditStructuredData(
  url: string,
  parsed: ParsedHtmlDocument
): { result: StructuredDataAuditResult; findings: AuditFinding[] } {
  const findings: AuditFinding[] = []
  const scriptCount = parsed.jsonLdRawScripts.length
  const syntaxErrors: string[] = []
  const graphNodes: StructuredDataNode[] = []
  let validJsonCount = 0

  for (let i = 0; i < scriptCount; i++) {
    const raw = parsed.jsonLdRawScripts[i]
    try {
      const data = JSON.parse(raw)
      validJsonCount++

      // Support array or graph
      if (Array.isArray(data)) {
        for (const item of data) {
          if (typeof item === 'object' && item !== null) graphNodes.push(item)
        }
      } else if (typeof data === 'object' && data !== null) {
        if (Array.isArray(data['@graph'])) {
          for (const item of data['@graph']) {
            if (typeof item === 'object' && item !== null) graphNodes.push(item)
          }
        } else {
          graphNodes.push(data)
        }
      }
    } catch (err: unknown) {
      syntaxErrors.push(`Script #${i + 1} JSON parse error: ${(err as Error)?.message}`)
    }
  }

  if (syntaxErrors.length > 0) {
    findings.push({
      id: 'SCHEMA_SYNTAX_ERROR',
      category: 'structured-data',
      severity: 'high',
      status: 'fail',
      title: 'Invalid JSON in application/ld+json script',
      description: 'One or more structured data blocks contain invalid JSON syntax.',
      affectedUrls: [url],
      evidence: syntaxErrors.join('; '),
      recommendation: 'Fix JSON serialization so search crawlers can parse the structured data.',
    })
  }

  // Check duplicate @ids
  const idCounts = new Map<string, number>()
  const knownIds = new Set<string>()
  const duplicateIds: string[] = []

  for (const node of graphNodes) {
    const id = node['@id']
    if (typeof id === 'string' && id) {
      idCounts.set(id, (idCounts.get(id) || 0) + 1)
      knownIds.add(id)
    }
  }

  for (const [id, count] of idCounts.entries()) {
    if (count > 1) duplicateIds.push(id)
  }

  if (duplicateIds.length > 0) {
    findings.push({
      id: 'SCHEMA_DUPLICATE_ID',
      category: 'structured-data',
      severity: 'high',
      status: 'fail',
      title: 'Duplicate @id values in schema graph',
      description: `Found ${duplicateIds.length} duplicate @id reference(s) which breaks node resolution.`,
      affectedUrls: [url],
      evidence: duplicateIds.join(', '),
      recommendation: 'Ensure each entity node has a globally unique @id within the schema graph.',
    })
  }

  // Check node types
  let orgNode: StructuredDataNode | undefined
  let webSiteNode: StructuredDataNode | undefined
  let webPageNode: StructuredDataNode | undefined
  let articleNode: StructuredDataNode | undefined
  let breadcrumbNode: StructuredDataNode | undefined

  for (const node of graphNodes) {
    const type = node['@type']
    const typeStr = Array.isArray(type) ? type.join(',') : String(type || '')

    if (typeStr.includes('Organization')) orgNode = node
    if (typeStr.includes('WebSite')) webSiteNode = node
    if (typeStr.includes('WebPage')) webPageNode = node
    if (typeStr.includes('Article') || typeStr.includes('BlogPosting') || typeStr.includes('NewsArticle')) articleNode = node
    if (typeStr.includes('BreadcrumbList')) breadcrumbNode = node
  }

  const hasOrganization = Boolean(orgNode)
  const hasWebSite = Boolean(webSiteNode)
  const hasWebPage = Boolean(webPageNode)
  const hasArticle = Boolean(articleNode)
  const hasBreadcrumbList = Boolean(breadcrumbNode)

  const organizationId = orgNode?.['@id'] as string | undefined
  const webSiteId = webSiteNode?.['@id'] as string | undefined
  const webPageId = webPageNode?.['@id'] as string | undefined
  const articleId = articleNode?.['@id'] as string | undefined
  const breadcrumbListId = breadcrumbNode?.['@id'] as string | undefined

  const relationshipErrors: string[] = []

  // Check WebPage -> isPartOf -> WebSite
  if (webPageNode) {
    const isPartOf = webPageNode.isPartOf as { '@id'?: string } | undefined
    if (webSiteId) {
      if (!isPartOf || isPartOf['@id'] !== webSiteId) {
        relationshipErrors.push(
          `WebPage.isPartOf ("${isPartOf?.['@id']}") does not match WebSite.@id ("${webSiteId}")`
        )
      }
    }

    const breadcrumb = webPageNode.breadcrumb as { '@id'?: string } | undefined
    if (breadcrumbListId) {
      if (!breadcrumb || breadcrumb['@id'] !== breadcrumbListId) {
        relationshipErrors.push(
          `WebPage.breadcrumb ("${breadcrumb?.['@id']}") does not match BreadcrumbList.@id ("${breadcrumbListId}")`
        )
      }
    }
  }

  // Check WebSite -> publisher -> Organization
  if (webSiteNode && organizationId) {
    const publisher = webSiteNode.publisher as { '@id'?: string } | undefined
    if (!publisher || publisher['@id'] !== organizationId) {
      relationshipErrors.push(
        `WebSite.publisher ("${publisher?.['@id']}") does not match Organization.@id ("${organizationId}")`
      )
    }
  }

  // Check Article -> mainEntityOfPage & publisher
  if (articleNode) {
    if (webPageId) {
      const mainEntity = articleNode.mainEntityOfPage as { '@id'?: string } | undefined
      if (!mainEntity || mainEntity['@id'] !== webPageId) {
        relationshipErrors.push(
          `Article.mainEntityOfPage ("${mainEntity?.['@id']}") does not match WebPage.@id ("${webPageId}")`
        )
      }
    }
    if (organizationId) {
      const pub = articleNode.publisher as { '@id'?: string } | undefined
      if (!pub || pub['@id'] !== organizationId) {
        relationshipErrors.push(
          `Article.publisher ("${pub?.['@id']}") does not match Organization.@id ("${organizationId}")`
        )
      }
    }
  }

  if (relationshipErrors.length > 0) {
    findings.push({
      id: 'SCHEMA_RELATIONSHIP_BROKEN',
      category: 'structured-data',
      severity: 'medium',
      status: 'fail',
      title: 'Mismatched or broken entity graph relationships',
      description: 'One or more schema @id reference relationships do not connect correctly.',
      affectedUrls: [url],
      evidence: relationshipErrors.join('; '),
      recommendation: 'Ensure parent/child entity relationships align with deterministic @id anchors.',
    })
  }

  // Date validation
  const dateValidationErrors: string[] = []
  if (articleNode) {
    const pubDateStr = articleNode.datePublished as string | undefined
    const modDateStr = articleNode.dateModified as string | undefined

    if (pubDateStr) {
      const dPub = new Date(pubDateStr)
      if (isNaN(dPub.getTime())) {
        dateValidationErrors.push(`Article datePublished "${pubDateStr}" is not a valid ISO 8601 date`)
      }
    }

    if (modDateStr) {
      const dMod = new Date(modDateStr)
      if (isNaN(dMod.getTime())) {
        dateValidationErrors.push(`Article dateModified "${modDateStr}" is not a valid ISO 8601 date`)
      }
    }

    if (pubDateStr && modDateStr) {
      const dPub = new Date(pubDateStr)
      const dMod = new Date(modDateStr)
      if (!isNaN(dPub.getTime()) && !isNaN(dMod.getTime()) && dMod < dPub) {
        dateValidationErrors.push(
          `dateModified (${modDateStr}) is earlier than datePublished (${pubDateStr})`
        )
      }
    }
  }

  if (dateValidationErrors.length > 0) {
    findings.push({
      id: 'SCHEMA_DATE_INVALID',
      category: 'structured-data',
      severity: 'medium',
      status: 'warning',
      title: 'Invalid or inconsistent Article publication dates',
      description: 'Article schema has invalid or chronologically inconsistent dates.',
      affectedUrls: [url],
      evidence: dateValidationErrors.join('; '),
      recommendation: 'Ensure dates are valid ISO 8601 strings and dateModified >= datePublished.',
    })
  }

  // Summary pass
  if (scriptCount > 0 && syntaxErrors.length === 0 && relationshipErrors.length === 0) {
    findings.push({
      id: 'SCHEMA_GRAPH_VALID',
      category: 'structured-data',
      severity: 'info',
      status: 'pass',
      title: 'Schema @graph entities and relationships valid',
      description: `Parsed ${graphNodes.length} entity node(s) successfully with consistent relationships.`,
      affectedUrls: [url],
    })
  }

  const result: StructuredDataAuditResult = {
    url,
    scriptCount,
    validJsonCount,
    syntaxErrors,
    graphNodes,
    duplicateIds,
    hasOrganization,
    hasWebSite,
    hasWebPage,
    hasArticle,
    hasBreadcrumbList,
    organizationId,
    webSiteId,
    webPageId,
    articleId,
    breadcrumbListId,
    relationshipErrors,
    dateValidationErrors,
  }

  return { result, findings }
}
