importScripts('./install-identity.js?v=2');
const CACHE_NAME = 'wow-furniture-v210-owner-sessions';
const urlsToCache = [
  './invoice-preview.js?v=1',
  './invoice-preview.css?v=1',
  './label-reprint-history-core.js?v=1',
  './label-reprint-history.js?v=2',
  './label-reprint-history.css?v=1',
  './daily-tasks-core.js?v=1',
  './daily-tasks.js?v=2',
  './daily-tasks.css?v=1',
  './purchase-planner-core.js?v=2',
  './purchase-planner.js?v=3',
  './procurement-followup-core.js?v=1',
  './procurement-followup.js?v=2',
  './procurement-followup.css?v=1',
  './purchase-planner.css?v=1',
  './review-center.js?v=2',
  './review-center.css?v=1',
  './global-search.js?v=2',
  './global-search.css?v=1',
  './operations-workspace.js?v=7',
  './operations-workspace.css?v=3',
  './package-label-core.js?v=6',
  './package-labels.js?v=8',
  './package-labels.css?v=5',
  './product-cost-core.js?v=2',
  './product-costs.js?v=3',
  './product-costs.css?v=3',
  './material-library-core.js?v=2',
  './material-library.js?v=3',
  './material-library.css?v=2',
  './manufacturing-core.js?v=1',
  './manufacturing.js?v=2',
  './manufacturing.css?v=2',
  './cost-analysis-core.js?v=1',
  './cost-analysis.js?v=2',
  './cost-analysis.css?v=2',
  './invoice-archive-core.js?v=1',
  './invoice-archive.js?v=2',
  './invoice-archive.css?v=2',
  './workspace-surfaces.css?v=37',
  './context-nav.js?v=14',
  './context-nav.css?v=6',
  './settings-actions.js?v=2',
  './product-workspace.js?v=3',
  './vendor/JsBarcode.code128.min.js?v=3.11.5',
  './product-label-core.js?v=2',
  './product-labels.js?v=4',
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
  './bottomnav-fit.js?v=2',
  './index.html',
  './accounts-policy.js?v=1',
  './accounts-data-policy.js?v=1',
  './accounts-core.js?v=2',
  './accounts-local-provider.js?v=1',
  './accounts-access.js?v=2',
  './accounts-settings.js?v=2',
  './accounts-access.css?v=1',
  './accounts-settings.css?v=1',

  './developer-portrait.jpg',
  './business-ui.css?v=1',
  './settings-responsive.css?v=6',
  './smart-card-settings.js?v=2',
  './smart-card-settings.css?v=1',
  './settings-navigation.js?v=21',
  './dashboard-visuals.css?v=36',
  './rate-refresh.js?v=9',
  './cashboxes.mjs?v=2',
  './section-headings.css?v=7',
  './topbar-dock.css?v=7',
  './topbar-dock.js?v=6',
  './robot-face.js?v=14',
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
  './ui-navigation.js?v=33',
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
  './ui-motion.css?v=2',
  './annual-sales.js?v=2',
  './annual-sales.css?v=1',
  './voice-loudness.js?v=1',
  './offline-voice.js?v=11',
  './offline-voice-worker.js?v=5',
  './reference-voice-assets.js?v=1',
  // Older installed speech workers still import these compatibility URLs.
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
  './speech-controls.js?v=5',
  './speech-controls.css?v=3',
  './program-speech.css?v=5',
  './nabra-report-worker.js?v=3',
  './nabra-phonemizer.js?v=1',
  './robot-settings.js?v=12',
  './robot-settings.css?v=5',
  './robot-report.js?v=10',
  './robot-report.css?v=6',
  './developer-profile.js?v=2',
  './developer-profile.css?v=2',
  './app-updates.js?v=3',
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
  './account-statement.js?v=27',
  './account-statement.css?v=25',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://h.top4top.io/p_3861refg81.png'
];
async function wfPrecacheShell() {
  const cache = await caches.open(CACHE_NAME);
  const priorNames = (await caches.keys()).filter(name => name !== CACHE_NAME && name.startsWith('wow-furniture-'));
  const prior = await Promise.all(priorNames.map(name => caches.open(name)));
  // An unchanged versioned URL has unchanged content. Reuse its existing bytes;
  // always fetch HTML and unversioned configuration so updates cannot go stale.
  const assets = [...new Set(urlsToCache.filter(url => url.startsWith('./') && url !== './'))];
  let next = 0, requiredFailure = null;
  async function copy(url) {
    const request = new Request(url, {cache:'reload'});
    try {
      let cached;
      if (/[?&]v=/.test(url)) {
        for (const previous of prior) {
          cached = await previous.match(request);
          if (cached?.ok) break;
        }
      }
      if (cached?.ok) await cache.put(request, cached);
      else await cache.add(request);
    } catch (error) {
      // Never activate a partial application shell. Optional images/audio can
      // retry on use without preventing a complete code update from installing.
      if (url === './index.html' || /\.(?:m?js|css)(?:\?|$)/.test(url)) requiredFailure ||= error;
    }
  }
  async function worker() {
    while (next < assets.length) await copy(assets[next++]);
  }
  // Bound startup network and parsing pressure on mobile connections.
  await Promise.all(Array.from({length:Math.min(6, assets.length)}, worker));
  if (requiredFailure) throw requiredFailure;
  const index = await cache.match('./index.html');
  if (!index?.ok) throw new Error('OFFLINE_SHELL_INCOMPLETE');
  await cache.put('./', index);
}
self.addEventListener('install', event => {
  event.waitUntil(wfPrecacheShell().then(() => self.skipWaiting()));
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
