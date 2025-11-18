const CACHE_NAME = 'proyectos-pwa-v6';
const PRECACHE_URLS = [
  './',
  './index.html?homescreen=v2',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
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

  //EXCEPCIÓN: NO interceptar Firebase
  if (
    url.includes('firestore.googleapis.com') ||
    url.includes('firebaseio.com') ||
    url.includes('googleapis.com') ||
    url.includes('gstatic.com') ||
    url.includes('cloudinary.com') ||
    url.includes('res.cloudinary.com')
  ) {
    return; // Permite que pase directo a la red
  }

  // Manejo normal de cache
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(cached => 
      cached ||
      fetch(event.request).then(resp => {
        try {
          if (event.request.method === 'GET') {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
        } catch (e) {}

        return resp;
      }).catch(() => {
        if (event.request.destination === 'document') return caches.match('./index.html');
        return new Response('', { status: 503, statusText: 'Offline' });
      })
    )
  );
});
