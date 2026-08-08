const CACHE_NAME = "expicheck-final-rule-v3-editqty-scanner-v3-jadwal-adminfix-v2";
const APP_SHELL = [
  "./",
  "./login.html",
  "./index.html",
  "./input.html",
  "./jadwal.html",
  "./admin.html",
  "./login.js",
  "./dashboard.js",
  "./app.js",
  "./jadwal.js",
  "./admin.js",
  "./manifest.json",
  "./style.css",
  "./ui-dialog.js",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Firebase/API harus selalu mencoba jaringan agar data tetap realtime.
  if (url.hostname.includes("googleapis.com") || url.hostname.includes("firebase")) return;

  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(res => {
        if (res && (res.status === 200 || res.type === "opaque")) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
