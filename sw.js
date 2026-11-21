importScripts('./install-identity.js?v=2');
const CACHE_NAME = 'wow-furniture-v200-smart-label-rolls';
const urlsToCache = [
  './operations-workspace.js?v=2',
  './operations-workspace.css?v=2',
  './package-label-core.js?v=2',
  './package-labels.js?v=2',
  './package-labels.css?v=1',
  './product-cost-core.js?v=1',
  './product-costs.js?v=1',
  './product-costs.css?v=1',
  './invoice-archive-core.js?v=1',
  './invoice-archive.js?v=1',
  './invoice-archive.css?v=1',
  './workspace-surfaces.css?v=37',
  './context-nav.js?v=10',
  './context-nav.css?v=5',
  './settings-actions.js?v=1',
  './product-workspace.js?v=3',
  './vendor/JsBarcode.code128.min.js?v=3.11.5',
  './product-label-core.js?v=2',
  './product-labels.js?v=3',
  './product-labels.css?v=3',
  './business-workspace.js?v=1',
  './internal-workspace.css?v=2',
  './notifications-workspace.js?v=2',
  './notifications-workspace.css?v=1',
  './unified-workspaces.css?v=1',
  './product-workspace.css?v=3',
  './business-workspace.css?v=1',
  './home-layout.js?v=2',
  './home-layout.css?v=2',
  './home-dock.js?v=2',
  './home-customizer.js?v=4',
  './home-customizer.css?v=5',
  './invoice-workspace.js?v=1',
  './invoice-workspace.css?v=1',
  './barcode-workspace.js?v=1',
  './barcode-workspace.css?v=1',
  './touch-keyboard.js?v=2',
  './touch-keyboard.css?v=1',
  './settings-actions.css?v=1',
  './',
  './bottomnav-fit.css?v=1',
  './bottomnav-fit.js?v=1',
  './index.html',
  './developer-portrait.jpg',
  './business-ui.css?v=1',
  './settings-responsive.css?v=6',
  './smart-card-settings.js?v=2',
  './smart-card-settings.css?v=1',
  './settings-navigation.js?v=19',
  './dashboard-visuals.css?v=36',
  './rate-refresh.js?v=8',
  './cashboxes.mjs?v=1',
  './section-headings.css?v=7',
  './topbar-dock.css?v=7',
  './topbar-dock.js?v=6',
  './robot-face.js?v=13',
  './robot-face.css?v=9',
  './dialog-surfaces.css?v=2',
  './product-categories.js?v=4',
  './product-categories.css?v=1',
  './branding-settings.js?v=4',
  './branding-settings.css?v=1',
  './company-identity.js?v=5',
  './company-identity.css?v=5',
  './color-picker.js?v=1',
  './color-picker.css?v=1',
  './cart-page.js?v=1',
  './cart-page.css?v=1',
  './currency-bank-catalog.js?v=1',
  './currency-sources.js?v=3',
  './currency-sources.css?v=3',
  './business-overview.js?v=3',
  './business-overview.css?v=3',
  './greeting-carousel.js?v=19',
  './currency-calculator.css?v=11',
  './currency-calculator.js?v=8',
  './ui-i18n.js?v=27',
  './modern-ui.css?v=47',
  './ui-identity.css?v=34',
  './ui-navigation.js?v=31',
  './ui-logo.js?v=3',
  './ui-settings.js?v=2',
  './ui-icons.js?v=49',
  './vendor/zxing-browser.min.js?v=26',
  './google-drive-config.js',
  './manifest.json',
  './manifest.json?v=5',
  './install-identity.js?v=2',
  './app-identity.js?v=3',
  './app-identity.css?v=2',
  './settings-unified.css?v=3',
  './ui-motion.css?v=1',
  './annual-sales.js?v=2',
  './annual-sales.css?v=1',
  './voice-loudness.js?v=1',
  './offline-voice.js?v=10',
  './offline-voice-worker.js?v=5',
  './reference-voice-assets.js?v=1',
  './reference-voice.js?v=1',
  './reference-voice.js?v=2',
  './reference-voice.js?v=4',
  './reference-voice.js?v=5',
  './reference-voice-engine.js?v=3',
  './reference-voice-host.js?v=6',
  './arabic-report-speech.js?v=3',
  './turkish-report-speech.js?v=1',
  './program-speech.js?v=5',
  './screen-awake.js?v=2',
  './speech-media.js?v=2',
  './speech-controls.js?v=4',
  './speech-controls.css?v=3',
  './program-speech.css?v=5',
  './nabra-report-worker.js?v=3',
  './nabra-phonemizer.js?v=1',
  './robot-settings.js?v=11',
  './robot-settings.css?v=5',
  './robot-report.js?v=9',
  './robot-report.css?v=6',
  './developer-profile.js?v=2',
  './developer-profile.css?v=2',
  './app-updates.js?v=2',
  './app-updates.css?v=1',
  './assets/robot-identity/ar.mp3?v=3',
  './assets/robot-identity/ar-EG.mp3?v=1',
  './assets/robot-identity/tr.mp3?v=2',
  './assets/robot-identity/en.mp3?v=2',
  './assets/robot-identity/fr.mp3?v=2',
  './assets/robot-identity/ru.mp3?v=2',
  './assets/wow-furniture-logo.svg',
  './assets/wow-furniture-logo.png',
  './app-icon-maskable-512.png?v=198',
  './apple-touch-icon.png?v=198',
  './favicon-32.png?v=198',
  './app-icon-192.png?v=198',
  './app-icon-512.png?v=198',
  './app-icon-192.png',
  './app-icon-512.png',
  './account-statement-core.js?v=25',
  './account-statement.js?v=26',
  './account-statement.css?v=25',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://h.top4top.io/p_3861refg81.png'
];
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(async cache => {
    // One unavailable asset must never block the entire new version from activating.
    await Promise.allSettled(
      urlsToCache.filter(u=>u.startsWith('./'))
        .map(url=>cache.add(new Request(url,{cache:'reload'})))
    );
    // Third-party assets are cached on first use without delaying activation.
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
  const identityResponse = self.wfInstallIdentityWorker?.respond(event.request);
  if (identityResponse) { event.respondWith(identityResponse); return; }
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
  // The reference installer is the only network path for its runtime modules.
  // Worker imports then stay offline too; a missing module is a failed pack,
  // never a reason to fetch a different engine or silently change the voice.
  const referenceRuntime = sameOrigin &&
    url.pathname.includes('/vendor/zonos3/') && /\.(?:m?js|json|bin|gguf)$/.test(url.pathname);
  if (referenceRuntime && request.mode !== 'navigate') {
    event.respondWith(request.cache === 'no-store' ? fetch(request) :
      caches.open('infinity-offline-voice-v1').then(cache => cache.match(request)).then(response => response || Response.error()));
    return;
  }
  // The explicit voice installer verifies and owns these downloads in its own cache.
  // Avoid a duplicate runtime or a large source archive in the application cache.
  if (sameOrigin && url.pathname.includes('/vendor/nabra/')) { event.respondWith(fetch(request)); return; }
  const safeExternal = url.hostname === 'cdnjs.cloudflare.com' || url.hostname === 'h.top4top.io';
  if (!sameOrigin && !safeExternal) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    fetch(request, sameOrigin && (request.mode === 'navigate' || /\.(?:m?js|css)$/.test(url.pathname)) ? {cache:'no-cache'} : {})
      .then(response => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone)).catch(() => {});
        }
        return response;
      })
      .catch(async () => (sameOrigin ? await (await caches.open(CACHE_NAME)).match(request) : undefined) ||
        (await caches.match(request)) ||
        (sameOrigin && request.mode === 'navigate' ? await caches.match('./index.html') : undefined) || Response.error())
  );
});
