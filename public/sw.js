const STATIC_CACHE = 'zyvavu-static-v1'
const STATIC_ASSETS = ['/offline.html', '/icons/icon-192.png', '/icons/icon-512.png', '/manifest.webmanifest']

function isSensitive(url) {
  const path = url.pathname
  if (path.startsWith('/admin')) return true
  if (path.startsWith('/api')) return true
  if (path.startsWith('/_next')) return true
  if (path.includes('preview')) return true
  if (url.searchParams.has('draft') || url.searchParams.has('preview')) return true
  return false
}

async function readManifest() {
  const response = await fetch('/api/offline-manifest', { cache: 'no-store' })
  if (!response.ok) throw new Error('manifest failed')
  return response.json()
}

async function trimCache(cache, limit) {
  const keys = await cache.keys()
  if (keys.length <= limit) return
  await Promise.all(keys.slice(0, keys.length - limit).map((request) => cache.delete(request)))
}

async function syncEligiblePages() {
  const manifest = await readManifest()
  const cacheName = `zyvavu-pages-${manifest.version}`
  const names = await caches.keys()
  await Promise.all(
    names
      .filter((name) => name.startsWith('zyvavu-pages-') && name !== cacheName)
      .map((name) => caches.delete(name)),
  )
  if (!manifest.enabled) return cacheName

  const cache = await caches.open(cacheName)
  const allowed = new Set(manifest.pages.map((page) => page.path))
  const cached = await cache.keys()
  await Promise.all(
    cached.map((request) => {
      const path = new URL(request.url).pathname
      return allowed.has(path) ? Promise.resolve() : cache.delete(request)
    }),
  )

  for (const page of manifest.pages) {
    try {
      const response = await fetch(page.path, { cache: 'no-store', credentials: 'same-origin' })
      if (canStore(response)) await cache.put(page.path, response.clone())
    } catch {
      // Leave the previous entry in place when refresh fails offline.
    }
  }
  await trimCache(cache, manifest.limit || 20)
  return cacheName
}

function canStore(response) {
  if (!response || response.type === 'opaqueredirect' || response.redirected) return false
  if (response.status !== 200) return false
  const type = response.headers.get('content-type') || ''
  if (!type.includes('text/html')) return false
  if (response.headers.get('set-cookie')) return false
  return true
}

async function networkFirstNavigation(request) {
  const path = new URL(request.url).pathname
  try {
    const response = await fetch(request)
    if (canStore(response)) {
      const manifest = await readManifest()
      const allowed = new Set((manifest.pages || []).map((page) => page.path))
      if (manifest.enabled && allowed.has(path)) {
        const cache = await caches.open(`zyvavu-pages-${manifest.version}`)
        await cache.put(request, response.clone())
        await trimCache(cache, manifest.limit || 20)
      }
    }
    return response
  } catch {
    const names = await caches.keys()
    const pageCaches = names.filter((name) => name.startsWith('zyvavu-pages-'))
    for (const name of pageCaches) {
      const cache = await caches.open(name)
      const hit = await cache.match(request)
      if (hit) return hit
    }
    const offline = await caches.match('/offline.html')
    return offline || new Response('Offline', { status: 503, headers: { 'content-type': 'text/plain' } })
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE)
      await Promise.all(
        STATIC_ASSETS.map(async (asset) => {
          try {
            await cache.add(asset)
          } catch {
            // A missing icon must not block the worker from installing.
          }
        }),
      )
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    syncEligiblePages()
      .catch(() => undefined)
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  if (event.request.method !== 'GET') return
  if (isSensitive(url)) return
  if (event.request.mode !== 'navigate') return
  event.respondWith(networkFirstNavigation(event.request))
})
