// Final acceptance fallback: every sitemap request receives unstyled XML.
export function sitemapHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'private, no-store, max-age=0',
    'CDN-Cache-Control': 'no-store',
  }
}
