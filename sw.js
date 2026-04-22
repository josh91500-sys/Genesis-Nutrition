// ══════════════════════════════════════════════════════════════════════
// Genesis Nutrition — Service Worker
//
// IMPORTANT: Bump APP_VERSION every time you deploy a meaningful change
// to index.html. This forces old caches to be wiped and fresh code to
// be served.
//
// Strategy:
//   • Network-first for index.html (so new code is picked up on every load
//     when online, with offline fallback to cached copy)
//   • Cache-first for static assets (icons, manifest, etc.)
//   • Skip-waiting + clients.claim() so updates activate immediately
// ══════════════════════════════════════════════════════════════════════

var APP_VERSION = 'genesis-2026-04-22-v8';
var CACHE_NAME = 'genesis-' + APP_VERSION;

// Minimal files the app needs offline. Index is cached dynamically on first load.
var PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// ── Install: precache essentials ────────────────────────────────────
self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(PRECACHE_URLS).catch(function(e){
        console.log('[SW] Precache error (non-fatal):', e);
      });
    })
  );
  // Don't wait for other tabs — activate immediately
  self.skipWaiting();
});

// ── Activate: clean up old versioned caches ─────────────────────────
self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(
        names.map(function(n){
          // Delete any cache whose name doesn't match the current version
          if(n !== CACHE_NAME){
            console.log('[SW] Deleting old cache:', n);
            return caches.delete(n);
          }
        })
      );
    }).then(function(){
      // Take control of all open pages immediately
      return self.clients.claim();
    })
  );
});

// ── Fetch: network-first for HTML, cache-first for everything else ──
self.addEventListener('fetch', function(event){
  var req = event.request;

  // Only handle GET requests
  if(req.method !== 'GET') return;

  // Skip non-http(s) requests (chrome-extension:, data:, etc.)
  if(!req.url.startsWith('http')) return;

  // Skip cross-origin (APIs like Firebase, Anthropic, Health Canada)
  // These should go straight to network without caching
  var url = new URL(req.url);
  if(url.origin !== self.location.origin) return;

  // HTML pages: network-first with cache fallback
  // This ensures users get fresh app code whenever they're online
  if(req.destination === 'document' ||
     req.headers.get('accept') && req.headers.get('accept').indexOf('text/html') !== -1){
    event.respondWith(
      fetch(req).then(function(resp){
        // Cache the fresh copy for offline use
        var respClone = resp.clone();
        caches.open(CACHE_NAME).then(function(cache){
          cache.put(req, respClone).catch(function(){});
        });
        return resp;
      }).catch(function(){
        // Offline — serve from cache
        return caches.match(req).then(function(cached){
          return cached || caches.match('/index.html');
        });
      })
    );
    return;
  }

  // Other assets: cache-first with network fallback
  event.respondWith(
    caches.match(req).then(function(cached){
      if(cached) return cached;
      return fetch(req).then(function(resp){
        // Only cache successful same-origin responses
        if(resp.ok && resp.type === 'basic'){
          var respClone = resp.clone();
          caches.open(CACHE_NAME).then(function(cache){
            cache.put(req, respClone).catch(function(){});
          });
        }
        return resp;
      });
    })
  );
});

// ── Message handler: allow page to tell us to skip waiting ──────────
self.addEventListener('message', function(event){
  if(event.data && event.data.type === 'SKIP_WAITING'){
    self.skipWaiting();
  }
});
