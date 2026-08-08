const CACHE_NAME = "expicheck-fcm-bell-fix-v1";
const APP_SHELL = [
  "./", "./login.html", "./index.html", "./input.html", "./jadwal.html", "./admin.html",
  "./login.js", "./dashboard.js", "./app.js", "./jadwal.js", "./admin.js",
  "./push-notifications.js", "./push-config.js",
  "./manifest.json", "./style.css", "./ui-dialog.js", "./icon-192.png", "./icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.includes("googleapis.com") || url.hostname.includes("firebase")) return;
  event.respondWith(caches.match(req).then(cached => {
    const network = fetch(req).then(res => {
      if (res && (res.status === 200 || res.type === "opaque")) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
      }
      return res;
    }).catch(() => cached);
    return cached || network;
  }));
});

// Firebase Messaging compat dipakai di service worker agar background push tetap aktif.
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyD_I1HSrulXlPCj9_U_FhSfsYQhz-DxbMk",
  authDomain: "dbplu-62d92.firebaseapp.com",
  projectId: "dbplu-62d92",
  storageBucket: "dbplu-62d92.firebasestorage.app",
  messagingSenderId: "623211397382",
  appId: "1:623211397382:web:db9a7bd4abcc7f44261e87"
});

const messaging = firebase.messaging();
messaging.onBackgroundMessage(payload => {
  const data = payload.data || {};
  const title = data.title || "ExpiCheck";
  const options = {
    body: data.body || "Ada informasi ExpiCheck terbaru.",
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    tag: data.tag || "expicheck-push",
    renotify: false,
    data: { url: data.url || "./index.html" }
  };
  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "./index.html";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(windows => {
    for (const w of windows) {
      if ("focus" in w) {
        w.navigate(url);
        return w.focus();
      }
    }
    return clients.openWindow ? clients.openWindow(url) : null;
  }));
});
