import React from 'react'

// Fail closed on uncertain request headers; XML can also be forced operationally.
export function wantsSitemapHtml(request: Request): boolean {
  if (process.env.SITEMAP_HTML_NEGOTIATION === 'xml-only') return false
  if (request.method !== 'GET') return false
  const url = new URL(request.url)
  if (url.searchParams.has('raw') || url.searchParams.has('format')) return false
  for (const name of request.headers.keys()) {
    if (name.startsWith('if-') || name === 'range') return false
  }
  if (request.headers.get('sec-fetch-mode') !== 'navigate' ||
    request.headers.get('sec-fetch-dest') !== 'document') return false

  const html = (request.headers.get('accept') || '').split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.split(';')[0].trim() === 'text/html')
  // Duplicate or malformed HTML ranges are ambiguous: use XML.
  if (html.length !== 1) return false
  const match = /^text\/html(?:\s*;\s*q=(0(?:\.\d{0,3})?|1(?:\.0{0,3})?))?$/.exec(html[0])
  if (!match) return false
  const htmlQuality = match[1] === undefined ? 1 : Number(match[1])
  if (htmlQuality <= 0) return false
  // Prefer an explicit XML range when it is at least as preferred as HTML.
  for (const range of (request.headers.get('accept') || '').toLowerCase().split(',')) {
    if (!/^\s*(application\/xml|text\/xml)\s*(;|$)/.test(range)) continue
    const xml = /^\s*(?:application\/xml|text\/xml)(?:\s*;\s*q=(0(?:\.\d{0,3})?|1(?:\.0{0,3})?))?\s*$/.exec(range)
    if (!xml || (xml[1] === undefined ? 1 : Number(xml[1])) >= htmlQuality) return false
  }
  return true
}

export function sitemapHeaders(html = false): HeadersInit {
  return {
    'Content-Type': `${html ? 'text/html' : 'application/xml'}; charset=utf-8`,
    'Cache-Control': 'private, no-store, max-age=0',
    'CDN-Cache-Control': 'no-store',
    'Vary': 'Accept, Sec-Fetch-Mode, Sec-Fetch-Dest',
    ...(html ? { 'X-Robots-Tag': 'noindex, nofollow' } : {}),
  }
}

export async function sitemapHtmlResponse(content: React.ReactNode): Promise<Response> {
  const { renderToReadableStream } = await import('react-dom/server.edge')
  // This is a complete Route Handler document, outside Next's page/head pipeline.
  /* eslint-disable @next/next/no-head-element, @next/next/no-css-tags */
  const stream = await renderToReadableStream(
    <html lang="vi">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex,nofollow" />
        <title>Sơ đồ trang web XML</title>
        <link rel="stylesheet" href="/sitemap-view.css" />
      </head>
      <body style={{ margin: 0 }}>{content}</body>
    </html>,
  )
  /* eslint-enable @next/next/no-head-element, @next/next/no-css-tags */
  await stream.allReady
  const html = await new Response(stream).text()
  return new Response(html, { headers: sitemapHeaders(true) })
}
