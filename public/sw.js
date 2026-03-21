// MedFlow Service Worker — Cache-first for static, network-first for API
const CACHE_NAME = 'medflow-v1'

const PRECACHE_URLS = [
  '/',
  '/login',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// Install — precache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // Non-critical: some URLs may not exist during dev
      })
    })
  )
  self.skipWaiting()
})

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  )
  self.clients.claim()
})

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and cross-origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // API calls: network-first with no cache
  if (url.pathname.startsWith('/api/')) return

  // Static assets (/_next/static): cache-first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // Pages & other assets: network-first with offline fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          if (cached) return cached
          // Offline fallback for navigation requests
          if (request.mode === 'navigate') {
            return new Response(
              `<!DOCTYPE html>
              <html lang="pt-BR">
              <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
              <title>MedFlow — Offline</title>
              <style>
                body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
                background:#0f1117;color:#e4e4e7;font-family:system-ui,sans-serif;text-align:center}
                .box{padding:40px}
                .icon{font-size:48px;margin-bottom:16px}
                h1{font-size:20px;font-weight:600;margin:0 0 8px}
                p{color:#71717a;font-size:14px;margin:0 0 24px}
                button{padding:10px 24px;background:#3b82f6;color:#fff;border:none;border-radius:8px;
                font-size:14px;font-weight:600;cursor:pointer}
              </style></head>
              <body><div class="box">
                <div class="icon">📡</div>
                <h1>Sem conexão</h1>
                <p>Verifique sua internet e tente novamente.</p>
                <button onclick="location.reload()">Tentar novamente</button>
              </div></body></html>`,
              { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            )
          }
          return new Response('', { status: 408 })
        })
      })
  )
})
