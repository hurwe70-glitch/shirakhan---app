// ═══════════════════════════════════════════════
//  firebase-messaging-sw.js — شريخان لايف
//  Service Worker للإشعارات في الخلفية
// ═══════════════════════════════════════════════

importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAYKEfXkFeJcFxmT2Xm6UUbMLkJ3inXN9A",
  authDomain: "shirakhan-live.firebaseapp.com",
  projectId: "shirakhan-live",
  storageBucket: "shirakhan-live.firebasestorage.app",
  messagingSenderId: "274466793707",
  appId: "1:274466793707:web:170d6abdbe70a6916b36ae"
});

const messaging = firebase.messaging();

// ── الإشعارات في الخلفية (عندما يكون المتصفح مغلق) ──
messaging.onBackgroundMessage((payload) => {
  console.log('📬 Background push received:', payload);

  const title = payload.notification?.title || 'شريخان لايف 🏡';
  const body  = payload.notification?.body  || '';
  const icon  = payload.notification?.icon  ||
    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%231B5FAA"/><text y=".9em" font-size="90" x="5">🏡</text></svg>';

  self.registration.showNotification(title, {
    body,
    icon,
    badge: icon,
    dir: 'rtl',
    lang: 'ar',
    vibrate: [200, 100, 200, 100, 200],
    tag: 'shirakhan-' + Date.now(),
    data: { url: self.location.origin + '/index.html' }
  });
});

// ── فتح الموقع عند الضغط على الإشعار ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || self.location.origin + '/index.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ── Offline Cache (نفس المنطق السابق) ──
const CACHE_NAME = 'shirakhan-v2';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.add('/index.html').catch(() => {})
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(resp => {
        if (resp && resp.status === 200 && resp.type !== 'opaque') {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return resp;
      })
      .catch(() =>
        caches.match(e.request).then(r => r || caches.match('/index.html'))
      )
  );
});
