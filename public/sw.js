const CACHE_NAME = 'family-budget-v1'
const STATIC_CACHE = 'family-budget-static-v1'

// Assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/logo.svg',
]

// Install — pre-cache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== STATIC_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// Fetch strategy:
//  - API routes (/api/*) → network-first, fallback to cache
//  - Supabase storage (attachments) → cache-first
//  - Everything else → stale-while-revalidate
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Skip non-GET and chrome-extension requests
  if (event.request.method !== 'GET') return
  if (url.protocol === 'chrome-extension:') return

  // API: network-first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone))
          }
          return res
        })
        .catch(() => caches.match(event.request))
    )
    return
  }

  // Supabase storage: cache-first (attachments don't change)
  if (url.hostname.includes('supabase') && url.pathname.includes('/storage/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone))
          }
          return res
        })
      })
    )
    return
  }

  // Stale-while-revalidate for everything else (JS/CSS/fonts/pages)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((res) => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone))
        }
        return res
      })
      return cached || networkFetch
    })
  )
})
