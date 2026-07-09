// Minimalni service worker samo za instalabilnost "Moje vozilo" stranice
// kao PWA prečaca (bez offline predmemoriranja — samo passthrough fetch).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => event.respondWith(fetch(event.request)));
