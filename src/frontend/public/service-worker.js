const CACHE_NAME = 'socionet-v1';
const RUNTIME_CACHE = 'socionet-runtime-v1';

// Essential assets to cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/generated/socionet-logo-transparent.dim_200x200.png',
  '/assets/generated/socionet-pwa-icon-192.dim_192x192.png',
  '/assets/generated/socionet-pwa-icon-512.dim_512x512.png'
];

// Install event
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== location.origin) return;
  if (url.pathname.includes('/api/') || url.pathname.includes('?canisterId=')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/')))
    );
    return;
  }

  if (
    request.destination === 'image' ||
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, responseClone));
          }
          return response;
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, responseClone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// Background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') event.waitUntil(Promise.resolve());
  if (event.tag === 'sync-notifications') event.waitUntil(Promise.resolve());
});

// ── Active call notification tag tracker ────────────────────────────────────
let activeCallTag = null;

// ── Push event ───────────────────────────────────────────────────────────────
//
// IMPORTANT: AudioContext is NOT available in service worker scope on Android.
// We achieve WhatsApp-style ringing by:
//   1. A long rhythmic vibrate pattern (mimics a phone ringtone).
//   2. requireInteraction: true so it stays on screen until user responds.
//   3. Posting INCOMING_CALL to all open windows so they play audio via
//      AudioContext in the main thread (which DOES work when app is open).
//
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received');

  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = {
      type: 'new-message',
      senderName: 'SOCIONET',
      messagePreview: event.data ? event.data.text() : '',
    };
  }

  const {
    type,
    callerPrincipal = '',
    callerName = 'Someone',
    callSessionId = '',
    senderName = 'SOCIONET',
    messagePreview = 'You have a new message',
    senderPrincipal = '',
  } = payload;

  if (type === 'incoming-call') {
    const tag = `incoming-call-${callSessionId}`;
    activeCallTag = tag;

    const title = '\ud83d\udcde Incoming Video Call';
    const options = {
      body: `${callerName} is calling\u2026 Tap Accept to answer`,
      icon: '/assets/generated/socionet-pwa-icon-192.dim_192x192.png',
      badge: '/assets/generated/socionet-pwa-icon-192.dim_192x192.png',
      tag,
      renotify: true,
      requireInteraction: true,
      silent: false,
      // Long rhythmic vibration pattern that mimics a ringtone.
      // 500ms on / 200ms off repeated many times keeps vibrating like a real call.
      vibrate: [
        500, 200, 500, 200, 500, 200,
        500, 200, 500, 200, 500, 200,
        500, 200, 500, 200, 500, 200,
        500, 200, 500, 200, 500, 200,
        500, 200, 500, 200, 500, 200,
        500, 200, 500, 200, 500, 200,
        500, 200, 500, 200, 500, 200,
        500, 200, 500,
      ],
      data: {
        type: 'incoming-call',
        callerPrincipal,
        callerName,
        callSessionId,
        url: `/messages?acceptCall=${encodeURIComponent(callSessionId)}&caller=${encodeURIComponent(callerPrincipal)}`,
      },
      actions: [
        { action: 'accept', title: '\u2705 Accept' },
        { action: 'decline', title: '\u274c Decline' },
      ],
    };

    event.waitUntil(
      self.registration.showNotification(title, options).then(() => {
        // Relay to any open app windows so they can play audio in the main thread
        return self.clients
          .matchAll({ type: 'window', includeUncontrolled: true })
          .then((clients) => {
            for (const client of clients) {
              client.postMessage({
                type: 'INCOMING_CALL',
                callSessionId,
                callerName,
                callerPrincipal,
              });
            }
          });
      })
    );
  } else {
    // Regular message / general notification
    const options = {
      body: messagePreview,
      icon: '/assets/generated/socionet-pwa-icon-192.dim_192x192.png',
      badge: '/assets/generated/socionet-pwa-icon-192.dim_192x192.png',
      tag: `message-${senderPrincipal}`,
      vibrate: [200, 100, 200],
      data: {
        type: 'new-message',
        senderPrincipal,
        url: `/messages${senderPrincipal ? `?from=${encodeURIComponent(senderPrincipal)}` : ''}`,
      },
    };
    event.waitUntil(self.registration.showNotification(senderName, options));
  }
});

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked, action:', event.action);
  event.notification.close();
  activeCallTag = null;

  const data = event.notification.data || {};

  // Decline action — stop ringing in open windows and exit without opening app
  if (event.action === 'decline') {
    event.waitUntil(
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((clients) => {
          for (const client of clients) {
            client.postMessage({ type: 'STOP_RINGTONE' });
          }
        })
    );
    return;
  }

  // Accept or generic tap — open / focus the app at the call URL
  const targetUrl = data.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Stop ringtone in all open windows
        for (const client of clientList) {
          client.postMessage({ type: 'STOP_RINGTONE' });
        }

        // Focus an already-open window if possible
        for (const client of clientList) {
          try {
            const clientUrl = new URL(client.url);
            if (
              clientUrl.pathname === new URL(targetUrl, self.location.origin).pathname ||
              clientUrl.pathname === '/'
            ) {
              client.focus();
              client.navigate(targetUrl);
              return;
            }
          } catch (_) {}
        }

        // No existing window — open a new one
        return self.clients.openWindow(targetUrl);
      })
  );
});

// ── Message handler (from main thread → service worker) ────────────────────────
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(RUNTIME_CACHE).then((cache) => cache.addAll(event.data.urls))
    );
    return;
  }

  // App answered or declined a call — close the lock-screen notification
  if (
    event.data.type === 'CANCEL_CALL_NOTIFICATION' ||
    event.data.type === 'STOP_RINGTONE'
  ) {
    const tag = event.data.callSessionId
      ? `incoming-call-${event.data.callSessionId}`
      : activeCallTag;

    if (tag) {
      self.registration.getNotifications({ tag }).then((notifications) => {
        for (const n of notifications) n.close();
      });
      activeCallTag = null;
    }

    // Broadcast STOP_RINGTONE to all windows so they halt in-app audio
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          client.postMessage({ type: 'STOP_RINGTONE' });
        }
      });
  }
});
