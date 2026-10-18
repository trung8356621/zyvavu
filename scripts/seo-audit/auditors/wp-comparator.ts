import type { ComparisonPair, PairComparisonDiff, PairComparisonResult } from '../types'
import { fetchWithRedirectTrace } from '../http-client'
import { parseHtml } from '../html-parser'
import { auditStructuredData } from './structured-data-auditor'

export async function compareUrlPair(
  pair: ComparisonPair,
  timeoutMs = 8000
): Promise<PairComparisonResult> {
  const [zyvavuRes, wpRes] = await Promise.all([
    fetchWithRedirectTrace(pair.zyvavuUrl, { timeoutMs }),
    fetchWithRedirectTrace(pair.wordpressUrl, { timeoutMs }),
  ])

  const zyvavuParsed = zyvavuRes.statusCode === 200 ? parseHtml(zyvavuRes.bodyText, pair.zyvavuUrl) : null
  const wpParsed = wpRes.statusCode === 200 ? parseHtml(wpRes.bodyText, pair.wordpressUrl) : null

  const zyvavuSchema = zyvavuParsed ? auditStructuredData(pair.zyvavuUrl, zyvavuParsed).result : null
  const wpSchema = wpParsed ? auditStructuredData(pair.wordpressUrl, wpParsed).result : null

  const zyvavuTypes = (zyvavuSchema?.graphNodes || []).map((n) => String(n['@type'] || ''))
  const wpTypes = (wpSchema?.graphNodes || []).map((n) => String(n['@type'] || ''))

  const diffs: PairComparisonDiff[] = []

  // 1. HTTP Status Code
  if (zyvavuRes.statusCode === wpRes.statusCode) {
    diffs.push({
      field: 'http_status',
      zyvavuValue: zyvavuRes.statusCode,
      wpValue: wpRes.statusCode,
      assessment: 'parity',
      explanation: `Both platforms returned identical HTTP status ${zyvavuRes.statusCode}.`,
    })
  } else {
    diffs.push({
      field: 'http_status',
      zyvavuValue: zyvavuRes.statusCode,
      wpValue: wpRes.statusCode,
      assessment: 'discrepancy',
      explanation: `HTTP status mismatch: Zyvavu returned ${zyvavuRes.statusCode}, WordPress returned ${wpRes.statusCode}.`,
    })
  }

  // 2. Canonical tag presence & pattern
  const zyvavuCanonical = zyvavuParsed?.canonicalTags[0] ?? null
  const wpCanonical = wpParsed?.canonicalTags[0] ?? null
  if (Boolean(zyvavuCanonical) === Boolean(wpCanonical)) {
    diffs.push({
      field: 'canonical_presence',
      zyvavuValue: zyvavuCanonical,
      wpValue: wpCanonical,
      assessment: 'parity',
      explanation: `Both systems emit canonical tag (${Boolean(zyvavuCanonical) ? 'present' : 'absent'}).`,
    })
  } else {
    diffs.push({
      field: 'canonical_presence',
      zyvavuValue: zyvavuCanonical,
      wpValue: wpCanonical,
      assessment: zyvavuCanonical ? 'zyvavu_advantage' : 'wp_advantage',
      explanation: zyvavuCanonical ? 'Zyvavu emits canonical tag where WordPress omitted it.' : 'WordPress emits canonical tag where Zyvavu omitted it.',
    })
  }

  // 3. Meta robots
  const zyvavuRobots = zyvavuParsed?.metaRobots ?? 'none'
  const wpRobots = wpParsed?.metaRobots ?? 'none'
  const zyvavuIndexable = zyvavuRes.statusCode === 200 && !/noindex/i.test(zyvavuRobots)
  const wpIndexable = wpRes.statusCode === 200 && !/noindex/i.test(wpRobots)

  if (zyvavuIndexable === wpIndexable) {
    diffs.push({
      field: 'indexability',
      zyvavuValue: zyvavuIndexable ? 'indexable' : 'noindex',
      wpValue: wpIndexable ? 'indexable' : 'noindex',
      assessment: 'parity',
      explanation: `Indexability aligned: both platforms treat page as ${zyvavuIndexable ? 'indexable' : 'noindex'}.`,
    })
  } else {
    diffs.push({
      field: 'indexability',
      zyvavuValue: zyvavuIndexable,
      wpValue: wpIndexable,
      assessment: 'discrepancy',
      explanation: `Indexability mismatch: Zyvavu is ${zyvavuIndexable ? 'indexable' : 'noindex'}, WordPress is ${wpIndexable ? 'indexable' : 'noindex'}.`,
    })
  }

  // 4. H1 Heading
  const zyvavuH1Count = zyvavuParsed?.h1List.length ?? 0
  const wpH1Count = wpParsed?.h1List.length ?? 0
  if (zyvavuH1Count === 1 && wpH1Count === 1) {
    diffs.push({
      field: 'h1_structure',
      zyvavuValue: zyvavuParsed?.h1List[0],
      wpValue: wpParsed?.h1List[0],
      assessment: 'parity',
      explanation: 'Both platforms render exactly one primary <h1> heading.',
    })
  } else if (zyvavuH1Count === 1 && wpH1Count > 1) {
    diffs.push({
      field: 'h1_structure',
      zyvavuValue: `${zyvavuH1Count} H1`,
      wpValue: `${wpH1Count} H1s`,
      assessment: 'zyvavu_advantage',
      explanation: `Zyvavu has clean single H1 architecture while WordPress has ${wpH1Count} H1 tags.`,
    })
  } else {
    diffs.push({
      field: 'h1_structure',
      zyvavuValue: `${zyvavuH1Count} H1`,
      wpValue: `${wpH1Count} H1`,
      assessment: 'discrepancy',
      explanation: `H1 count mismatch: Zyvavu (${zyvavuH1Count}) vs WordPress (${wpH1Count}).`,
    })
  }

  // 5. Structured Data Schema Types
  const commonTypes = zyvavuTypes.filter((t) => wpTypes.some((wt) => wt.includes(t)))
  const missingInZyvavu = wpTypes.filter((wt) => !zyvavuTypes.some((zt) => zt.includes(wt)))
  if (missingInZyvavu.length === 0) {
    diffs.push({
      field: 'schema_entities',
      zyvavuValue: zyvavuTypes,
      wpValue: wpTypes,
      assessment: 'parity',
      explanation: `Zyvavu covers all schema types present in WordPress (${commonTypes.join(', ')}).`,
    })
  } else {
    diffs.push({
      field: 'schema_entities',
      zyvavuValue: zyvavuTypes,
      wpValue: wpTypes,
      assessment: 'wp_advantage',
      explanation: `WordPress includes schema types not yet emitted by Zyvavu: ${missingInZyvavu.join(', ')}.`,
    })
  }

  // 6. Internal links count
  const zyvavuLinksCount = zyvavuParsed?.links.length ?? 0
  const wpLinksCount = wpParsed?.links.length ?? 0
  diffs.push({
    field: 'crawlable_links',
    zyvavuValue: zyvavuLinksCount,
    wpValue: wpLinksCount,
    assessment: Math.abs(zyvavuLinksCount - wpLinksCount) < 15 ? 'parity' : 'discrepancy',
    explanation: `Crawlable links in SSR HTML: Zyvavu (${zyvavuLinksCount}) vs WordPress (${wpLinksCount}).`,
  })

  return {
    label: pair.label || `${pair.zyvavuUrl} vs ${pair.wordpressUrl}`,
    zyvavuUrl: pair.zyvavuUrl,
    wordpressUrl: pair.wordpressUrl,
    zyvavuSummary: {
      statusCode: zyvavuRes.statusCode,
      isIndexable: zyvavuIndexable,
      canonical: zyvavuCanonical,
      title: zyvavuParsed?.title ?? null,
      h1: zyvavuParsed?.h1List ?? [],
      schemaTypes: zyvavuTypes,
      internalLinksCount: zyvavuParsed?.links.length ?? 0,
      wordCount: zyvavuParsed?.approximateWordCount ?? 0,
    },
    wpSummary: {
      statusCode: wpRes.statusCode,
      isIndexable: wpIndexable,
      canonical: wpCanonical,
      title: wpParsed?.title ?? null,
      h1: wpParsed?.h1List ?? [],
      schemaTypes: wpTypes,
      internalLinksCount: wpParsed?.links.length ?? 0,
      wordCount: wpParsed?.approximateWordCount ?? 0,
    },
    diffs,
  }
}
