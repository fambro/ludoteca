const CACHE_NAME = 'ludoteca-1a2aab37fdd889cf';
const PRECACHE_URLS = [
  "./",
  "script.js?v=ad5009569c0c97f5c583a64a25d9584f093babc16e11e7db657594a8a6d485e1",
  "styles.css?v=fde210f9ac3363cf3301b35d343e250cdb82575ffaf83297b43aadf6a9adaf8a",
  "data/ludoteca.json?v=c5f6c5a0b2f25679253de89d8a03e697f40061fd8d9ba922f70c3d5f2d915cf2",
  "manifest.webmanifest",
  "assets/icons/icon-180.png",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/covers/architetti.webp",
  "assets/covers/arkham-3.webp",
  "assets/covers/arkham-lcg-2.webp",
  "assets/covers/arkham-lcg.webp",
  "assets/covers/arkham-noir.webp",
  "assets/covers/arkham-rpg.webp",
  "assets/covers/azul.webp",
  "assets/covers/bang-bullet.webp",
  "assets/covers/betrayal.webp",
  "assets/covers/bloodborne.webp",
  "assets/covers/carcassonne.webp",
  "assets/covers/cera-nuova.webp",
  "assets/covers/cera-vecchia.webp",
  "assets/covers/chronicles.webp",
  "assets/covers/codex.webp",
  "assets/covers/colt.webp",
  "assets/covers/dead-winter.webp",
  "assets/covers/dixit.webp",
  "assets/covers/dnd-essentials.webp",
  "assets/covers/dune.webp",
  "assets/covers/elder-sign.webp",
  "assets/covers/expeditions.webp",
  "assets/covers/fate-fellowship.webp",
  "assets/covers/final-hour.webp",
  "assets/covers/great-wall.webp",
  "assets/covers/incipit.webp",
  "assets/covers/mansions.webp",
  "assets/covers/mythos.webp",
  "assets/covers/one-small-step.webp",
  "assets/covers/root.webp",
  "assets/covers/scholars.webp",
  "assets/covers/scythe.webp",
  "assets/covers/sea-stars.webp",
  "assets/covers/set-watch.webp",
  "assets/covers/sherlock-carlton.webp",
  "assets/covers/sherlock-jack.webp",
  "assets/covers/sherlock-thames.webp",
  "assets/covers/ticket-europa-15.webp",
  "assets/covers/ticket-europa.webp",
  "assets/covers/time-stories.webp",
  "assets/covers/white-castle.webp",
  "assets/covers/whitehall.webp",
  "assets/covers/wistar.webp"
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) =>
    cache.addAll(PRECACHE_URLS.map((url) => new Request(new URL(url, self.registration.scope), { cache: 'reload' })))
  ));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith('ludoteca-') && name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request, { cache: 'no-cache' }).catch(() => caches.match(new URL('./', scope))));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
