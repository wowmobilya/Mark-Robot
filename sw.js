const CACHE_NAME = 'wow-furniture-v106-adaptive-spacing';
const urlsToCache = [
  './workspace-surfaces.css?v=1',
  './context-nav.js?v=1',
  './context-nav.css?v=1',
  './',
  './bottomnav-fit.css?v=1',
  './bottomnav-fit.js?v=1',
  './index.html',
  './business-ui.css?v=1',
  './settings-responsive.css?v=5',
  './settings-navigation.js?v=4',
  './dashboard-visuals.css?v=6',
  './rate-refresh.js?v=2',
  './section-headings.css?v=6',
  './topbar-dock.css?v=6',
  './topbar-dock.js?v=4',
  './currency-calculator.css?v=8',
  './currency-calculator.js?v=5',
  './ui-i18n.js?v=26',
  './modern-ui.css?v=46',
  './ui-identity.css?v=31',
  './ui-navigation.js?v=12',
  './ui-logo.js?v=2',
  './ui-settings.js?v=1',
  './ui-icons.js?v=45',
  './vendor/zxing-browser.min.js?v=26',
  './google-drive-config.js',
  './manifest.json',
  './app-icon-192.png',
  './app-icon-512.png',
  './account-statement-core.js?v=25',
  './account-statement.js?v=25',
  './account-statement.css?v=25',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://h.top4top.io/p_3861refg81.png'
];
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(async cache => {
    await cache.addAll(urlsToCache.filter(u=>u.startsWith('./')));
    await Promise.all(urlsToCache.filter(u=>!u.startsWith('./')).map(u=>cache.add(u).catch(()=>{})));
  }));
});
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.map(name => name === CACHE_NAME || !name.startsWith('wow-furniture-') ? null : caches.delete(name))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  const privateGoogle = url.hostname === 'accounts.google.com' ||
    url.hostname === 'oauth2.googleapis.com' ||
    url.hostname === 'www.googleapis.com' ||
    url.hostname.endsWith('.googleapis.com') ||
    url.hostname === 'wow-background-backup-iay1ii.v2.appdeploy.ai' ||
    url.hostname === 'api-v2.appdeploy.ai';

  if (request.method !== 'GET' || privateGoogle) {
    event.respondWith(fetch(request));
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  const safeExternal = url.hostname === 'cdnjs.cloudflare.com' || url.hostname === 'h.top4top.io';
  if (!sameOrigin && !safeExternal) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
