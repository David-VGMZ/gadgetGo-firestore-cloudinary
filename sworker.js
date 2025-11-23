const CACHE_NAME = 'proyectos-pwa-v9';
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-app-192.png',
  './icons/icon-app-512.png',
];

// Instalar SW
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
});

// Activar SW (limpiar versiones viejas)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k)))
    )
  );
});

// Interceptar fetch
self.addEventListener('fetch', (event) => {

  const url = event.request.url;

  // EXCEPCIÓN: SI es Firestore o Cloudinary → red directa SIEMPRE
  if (
    url.includes('firestore.googleapis.com') ||
    url.includes('firebaseio.com') ||
    url.includes('googleapis.com') ||
    url.includes('gstatic.com') ||
    url.includes('cloudinary.com') ||
    url.includes('res.cloudinary.com')
  ) {
    event.respondWith(fetch(event.request)); // <- ESTA ES LA SOLUCIÓN REAL
    return;
  }

  // MANEJO NORMAL PARA ARCHIVOS LOCALES
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(resp => {
        // Cachear solo GETs
        if (event.request.method === 'GET') {
          const responseClone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return resp;
      }).catch(() => {
        // Fallback para HTML
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
