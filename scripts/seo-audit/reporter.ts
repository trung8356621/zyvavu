import type {
  AuditFinding,
  AuditSummary,
  DiscoveryAuditResult,
  FullAuditReport,
  LinkGraphResult,
  PageAuditRecord,
  PairComparisonResult,
} from './types'

export function computeSummary(
  findings: AuditFinding[],
  crawledPagesCount: number,
  totalAuditedUrls: number
): AuditSummary {
  let passCount = 0
  let failCount = 0
  let warningCount = 0
  let notTestedCount = 0
  let highCount = 0
  let mediumCount = 0
  let lowCount = 0

  for (const f of findings) {
    if (f.status === 'pass') passCount++
    if (f.status === 'fail') failCount++
    if (f.status === 'warning') warningCount++
    if (f.status === 'not_tested') notTestedCount++

    if (f.severity === 'high') highCount++
    if (f.severity === 'medium') mediumCount++
    if (f.severity === 'low') lowCount++
  }

  return {
    totalAuditedUrls,
    crawledPages: crawledPagesCount,
    passCount,
    failCount,
    warningCount,
    notTestedCount,
    highCount,
    mediumCount,
    lowCount,
  }
}

export function formatMarkdownReport(report: FullAuditReport): string {
  const { summary, findings, pages, linkGraph, discovery, comparisonResults, parityStatus } = report

  const lines: string[] = []

  lines.push(`# ZYVAVU CMS — SEO OUTPUT PARITY AUDIT REPORT`)
  lines.push(``)
  lines.push(`- **Audit Timestamp**: ${report.timestamp}`)
  lines.push(`- **Target Base URL**: \`${report.targetBaseUrl}\``)
  lines.push(`- **Audit Mode**: \`${report.mode.toUpperCase()}\``)
  lines.push(`- **WordPress Parity Status**: **${parityStatus}**`)
  lines.push(``)

  lines.push(`## 1. EXECUTIVE SUMMARY`)
  lines.push(``)
  lines.push(`| Metric | Value |`)
  lines.push(`| :--- | :--- |`)
  lines.push(`| Total Pages Audited | **${summary.totalAuditedUrls}** |`)
  lines.push(`| Total URLs Crawled | **${summary.crawledPages}** |`)
  lines.push(`| PASS Findings | **${summary.passCount}** |`)
  lines.push(`| FAIL Findings (Action Required) | **${summary.failCount}** |`)
  lines.push(`| WARNING Findings (Review Advised) | **${summary.warningCount}** |`)
  lines.push(`| HIGH Severity Findings | **${summary.highCount}** |`)
  lines.push(`| MEDIUM Severity Findings | **${summary.mediumCount}** |`)
  lines.push(`| LOW Severity Findings | **${summary.lowCount}** |`)
  lines.push(``)

  // Findings Breakdown Table
  lines.push(`## 2. AUDIT FINDINGS REGISTER`)
  lines.push(``)
  if (findings.length === 0) {
    lines.push(`_No findings recorded._`)
  } else {
    lines.push(`| Severity | Status | Category | Finding ID | Title | Affected URLs |`)
    lines.push(`| :--- | :--- | :--- | :--- | :--- | :--- |`)
    for (const f of findings) {
      const sevBadge = f.severity.toUpperCase()
      const statBadge = f.status.toUpperCase()
      const urlSnippet = f.affectedUrls.length > 1
        ? `${f.affectedUrls[0]} (+${f.affectedUrls.length - 1} more)`
        : f.affectedUrls[0] || 'N/A'
      lines.push(`| \`${sevBadge}\` | \`${statBadge}\` | \`${f.category}\` | \`${f.id}\` | ${f.title} | \`${urlSnippet}\` |`)
    }
    lines.push(``)

    // Detailed Findings
    lines.push(`### Detailed Findings & Evidence`)
    lines.push(``)
    for (const f of findings) {
      if (f.status === 'pass' && f.severity === 'info') continue
      lines.push(`#### [${f.severity.toUpperCase()}] ${f.title} (\`${f.id}\`)`)
      lines.push(`- **Status**: \`${f.status.toUpperCase()}\``)
      lines.push(`- **Category**: \`${f.category}\``)
      lines.push(`- **Description**: ${f.description}`)
      if (f.evidence) lines.push(`- **Evidence**: \`${f.evidence}\``)
      if (f.recommendation) lines.push(`- **Recommendation**: ${f.recommendation}`)
      lines.push(`- **Affected URLs**:`)
      for (const u of f.affectedUrls) {
        lines.push(`  - \`${u}\``)
      }
      lines.push(``)
    }
  }

  // Section 3: HTTP & Canonical Audit
  lines.push(`## 3. SEO HTTP & CANONICAL AUDIT`)
  lines.push(``)
  lines.push(`| URL | Status | Canonical Tag | Indexable? | Soft 404? | Redirects |`)
  lines.push(`| :--- | :--- | :--- | :--- | :--- | :--- |`)
  for (const p of pages) {
    const h = p.http
    const can = h.canonicalTag ? `\`${h.canonicalTag}\`` : '_None_'
    const idx = h.isIndexable ? '✅ Yes' : '❌ No'
    const soft404 = h.isSoft404 ? '⚠️ Yes' : 'No'
    const hops = h.redirectHops.length > 0 ? `${h.redirectHops.length} hop(s)` : 'Direct'
    lines.push(`| \`${p.url}\` | \`${h.statusCode}\` | ${can} | ${idx} | ${soft404} | ${hops} |`)
  }
  lines.push(``)

  // Section 4: Semantic HTML Audit
  lines.push(`## 4. SEMANTIC HTML & SSR CONTENT AUDIT`)
  lines.push(``)
  lines.push(`| URL | Title (Length) | Description | H1 Count | Images (No Alt) | Word Count | Landmarks |`)
  lines.push(`| :--- | :--- | :--- | :--- | :--- | :--- | :--- |`)
  for (const p of pages) {
    if (!p.semantic) continue
    const s = p.semantic
    const titleSnippet = s.title ? `"${s.title.slice(0, 25)}..." (${s.titleLength})` : '_None_'
    const descSnippet = s.metaDescription ? `Present (${s.descriptionLength})` : '_Missing_'
    const h1Str = s.h1List.length === 1 ? '1 H1' : `${s.h1List.length} H1s`
    const altStr = s.missingAltCount > 0 ? `⚠️ ${s.missingAltCount} missing` : 'All Alt OK'
    const landmarks = [
      s.hasMainTag ? 'main' : null,
      s.hasArticleTag ? 'article' : null,
      s.hasNavTag ? 'nav' : null,
      s.hasHeaderTag ? 'header' : null,
      s.hasFooterTag ? 'footer' : null,
    ].filter(Boolean).join(', ') || '_None_'
    lines.push(`| \`${p.url}\` | ${titleSnippet} | ${descSnippet} | ${h1Str} | ${altStr} | ${s.approximateWordCount} | ${landmarks} |`)
  }
  lines.push(``)

  // Section 5: Structured Data Audit
  lines.push(`## 5. STRUCTURED DATA & ENTITY GRAPH AUDIT`)
  lines.push(``)
  lines.push(`| URL | JSON-LD Scripts | Entities Found | WebSite | Org | WebPage | Article | Breadcrumbs | Relationship Status |`)
  lines.push(`| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |`)
  for (const p of pages) {
    if (!p.structuredData) continue
    const sd = p.structuredData
    const scripts = `${sd.scriptCount} (${sd.validJsonCount} valid)`
    const org = sd.hasOrganization ? '✅' : '❌'
    const ws = sd.hasWebSite ? '✅' : '❌'
    const wp = sd.hasWebPage ? '✅' : '❌'
    const art = sd.hasArticle ? '✅' : '-'
    const bc = sd.hasBreadcrumbList ? '✅' : '-'
    const relStatus = sd.relationshipErrors.length === 0 ? '✅ Valid' : `❌ ${sd.relationshipErrors.length} errors`
    lines.push(`| \`${p.url}\` | ${scripts} | ${sd.graphNodes.length} | ${ws} | ${org} | ${wp} | ${art} | ${bc} | ${relStatus} |`)
  }
  lines.push(``)

  // Section 6: Internal Link Graph Audit
  lines.push(`## 6. INTERNAL LINK GRAPH & CRAWL TOPOLOGY`)
  lines.push(``)
  lines.push(`- **Crawled Pages Depth Distribution**:`)
  for (const [u, d] of Object.entries(linkGraph.crawlDepth)) {
    lines.push(`  - \`${u}\`: Depth ${d} (Inbound: ${(linkGraph.inboundMap[u] || []).length}, Outbound: ${(linkGraph.outboundMap[u] || []).length})`)
  }
  lines.push(``)
  lines.push(`- **Broken Internal Links Found**: ${linkGraph.brokenLinks.length}`)
  for (const bl of linkGraph.brokenLinks) {
    lines.push(`  - ❌ \`${bl.fromUrl}\` -> \`${bl.targetUrl}\` (HTTP ${bl.statusCode || 'ERR'}: ${bl.error})`)
  }
  lines.push(``)
  lines.push(`- **Redirecting Internal Links Found**: ${linkGraph.redirectingLinks.length}`)
  for (const rl of linkGraph.redirectingLinks) {
    lines.push(`  - ⚠️ \`${rl.fromUrl}\` -> \`${rl.targetUrl}\` (HTTP ${rl.statusCode} -> \`${rl.finalUrl}\`)`)
  }
  lines.push(``)
  lines.push(`- **Orphan URLs in Inventory**: ${linkGraph.orphanUrls.length}`)
  for (const ou of linkGraph.orphanUrls) {
    lines.push(`  - ⚠️ \`${ou}\` (0 inbound links found from crawl)`)
  }
  lines.push(``)

  // Section 7: Discovery (RSS, Robots, Sitemap)
  lines.push(`## 7. DISCOVERY CAPABILITIES (FEED, ROBOTS, SITEMAP)`)
  lines.push(``)
  lines.push(`| Capability | Endpoint / Feature | Status | Details |`)
  lines.push(`| :--- | :--- | :--- | :--- |`)
  lines.push(`| RSS Discovery Link | HTML \`<head>\` | ${discovery.rssDiscoveryLink ? '✅ PASS' : '⚠️ WARNING'} | ${discovery.rssDiscoveryLink || 'Missing alternate tag'} |`)
  lines.push(`| RSS XML Endpoint | \`/feed\` | ${discovery.rssEndpoint?.isValidXml ? '✅ PASS' : '⚠️ WARNING'} | HTTP ${discovery.rssEndpoint?.statusCode || 0}, ${discovery.rssEndpoint?.itemCount || 0} items |`)
  lines.push(`| Crawl Policy | \`/robots.txt\` | ${discovery.robotsTxt?.hasUserAgent ? '✅ PASS' : '⚠️ WARNING'} | HTTP ${discovery.robotsTxt?.statusCode || 404} ${discovery.robotsTxt?.hasUserAgent ? '(Valid)' : '(Missing/Invalid)'} |`)
  lines.push(`| XML Sitemap | \`/sitemap.xml\` | ${discovery.sitemap?.exists ? '✅ PASS' : '⚠️ WARNING'} | ${discovery.sitemap?.note || 'Not found'} |`)
  lines.push(``)

  // Section 8: WordPress Parity Comparison
  lines.push(`## 8. WORDPRESS PARITY EVALUATION`)
  lines.push(``)
  if (comparisonResults && comparisonResults.length > 0) {
    for (const comp of comparisonResults) {
      lines.push(`### Comparison: ${comp.label}`)
      lines.push(`- **Zyvavu URL**: \`${comp.zyvavuUrl}\``)
      lines.push(`- **WordPress URL**: \`${comp.wordpressUrl}\``)
      lines.push(``)
      lines.push(`| Field | Zyvavu Value | WordPress Value | Assessment | Notes |`)
      lines.push(`| :--- | :--- | :--- | :--- | :--- |`)
      for (const d of comp.diffs) {
        lines.push(`| \`${d.field}\` | \`${String(d.zyvavuValue)}\` | \`${String(d.wpValue)}\` | \`${d.assessment.toUpperCase()}\` | ${d.explanation} |`)
      }
      lines.push(``)
    }
  } else {
    lines.push(`> [!NOTE]`)
    lines.push(`> Cross-platform WordPress parity is **NOT YET VERIFIED** because no explicit WordPress target URL pairs were provided.`)
    lines.push(`> Self-audit was completed across local Zyvavu SSR outputs. To run comparison mode, provide \`--pairs=<file.json>\`.`)
    lines.push(``)
  }

  // Section 9: Next Step Ranked Recommendations
  lines.push(`## 9. RANKED RECOMMENDATIONS FOR NEXT SEO TASK`)
  lines.push(``)
  lines.push(`1. **[HIGH] Fix Broken Internal Links in Themes/Menus**:`)
  lines.push(`   Ensure template links such as \`/about\` are either backed by a published page or updated to existing published routes.`)
  lines.push(`2. **[MEDIUM] Provide Static or Dynamic \`/robots.txt\` Route**:`)
  lines.push(`   Expose Next.js \`app/robots.ts\` returning valid \`User-agent: *\` and \`Sitemap: <siteUrl>/sitemap.xml\` directives.`)
  lines.push(`3. **[MEDIUM] Implement Dynamic XML Sitemap Engine**:`)
  lines.push(`   Create \`/sitemap.xml\` (or sitemap index) dynamically indexing all published posts, pages, categories, and tags from URL Registry.`)
  lines.push(`4. **[MEDIUM] Consolidate Canonical Origin**:`)
  lines.push(`   Ensure \`siteUrl\` in site-settings strictly aligns with public host (\`https://zyvavu.test\` vs localhost port) so canonical and JSON-LD URLs remain consistent across reverse-proxy environments.`)
  lines.push(`5. **[LOW] Add Heading Hierarchy Validation to Editor**:`)
  lines.push(`   Prevent content editors from skipping heading levels (e.g. H1 directly to H3).`)
  lines.push(``)

  return lines.join('\n')
}
