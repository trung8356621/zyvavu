import type { RedirectHop } from './types'

// Support local development self-signed certs (e.g. https://zyvavu.test)
if (typeof process !== 'undefined' && process.env) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

export interface HttpResponseData {
  url: string
  finalUrl: string
  statusCode: number
  statusText: string
  headers: Headers
  redirectHops: RedirectHop[]
  isRedirectLoop: boolean
  bodyText: string
  timedOut: boolean
  error?: string
}

export async function fetchWithRedirectTrace(
  initialUrl: string,
  options: {
    timeoutMs?: number
    maxRedirects?: number
    customHeaders?: Record<string, string>
  } = {}
): Promise<HttpResponseData> {
  const timeoutMs = options.timeoutMs ?? 8000
  const maxRedirects = options.maxRedirects ?? 5
  const customHeaders = options.customHeaders ?? {}

  const hops: RedirectHop[] = []
  const visitedUrls = new Set<string>()
  let currentUrl = initialUrl
  let hopCount = 0

  while (hopCount <= maxRedirects) {
    if (visitedUrls.has(currentUrl)) {
      return {
        url: initialUrl,
        finalUrl: currentUrl,
        statusCode: hops[hops.length - 1]?.statusCode ?? 308,
        statusText: 'Redirect Loop Detected',
        headers: new Headers(),
        redirectHops: hops,
        isRedirectLoop: true,
        bodyText: '',
        timedOut: false,
        error: `Redirect loop detected at: ${currentUrl}`,
      }
    }
    visitedUrls.add(currentUrl)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(currentUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Zyvavu-SEO-Auditor/1.0 (+https://zyvavu.test)',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          ...customHeaders,
        },
        redirect: 'manual',
        signal: controller.signal,
      })
      clearTimeout(timer)

      const status = response.status

      if ([301, 302, 303, 307, 308].includes(status)) {
        const location = response.headers.get('location')
        if (!location) {
          return {
            url: initialUrl,
            finalUrl: currentUrl,
            statusCode: status,
            statusText: response.statusText,
            headers: response.headers,
            redirectHops: hops,
            isRedirectLoop: false,
            bodyText: '',
            timedOut: false,
            error: 'Redirect status received without Location header',
          }
        }

        const nextUrl = new URL(location, currentUrl).href
        hops.push({ statusCode: status, location: nextUrl })
        currentUrl = nextUrl
        hopCount++
        continue
      }

      // Final response reached
      const bodyText = await response.text()
      return {
        url: initialUrl,
        finalUrl: currentUrl,
        statusCode: status,
        statusText: response.statusText,
        headers: response.headers,
        redirectHops: hops,
        isRedirectLoop: false,
        bodyText,
        timedOut: false,
      }
    } catch (err: unknown) {
      clearTimeout(timer)
      const isAbort = (err as Error)?.name === 'AbortError'
      return {
        url: initialUrl,
        finalUrl: currentUrl,
        statusCode: isAbort ? 408 : 0,
        statusText: isAbort ? 'Request Timeout' : 'Network Error',
        headers: new Headers(),
        redirectHops: hops,
        isRedirectLoop: false,
        bodyText: '',
        timedOut: isAbort,
        error: (err as Error)?.message ?? String(err),
      }
    }
  }

  return {
    url: initialUrl,
    finalUrl: currentUrl,
    statusCode: hops[hops.length - 1]?.statusCode ?? 301,
    statusText: 'Too Many Redirects',
    headers: new Headers(),
    redirectHops: hops,
    isRedirectLoop: false,
    bodyText: '',
    timedOut: false,
    error: `Exceeded max redirects limit of ${maxRedirects}`,
  }
}
