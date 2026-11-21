'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const {chromium} = require('playwright');

// Exercise real Chromium workers, notifications and IndexedDB locally. DevTools supplies the provider event.
// No VAPID key, hosted workspace, owner session or physical device is used by this test.
async function main() {
  const dir = path.join(__dirname, '..'), files = new Set(['modules/platform/push/wow-push-sw.js','modules/platform/push/wow-push-device.js','modules/platform/push/wow-push-client.js','modules/platform/push/wow-push-settings.js','modules/platform/push/wow-push-settings.css','app-icon-192.png']);
  const server = http.createServer(async (req, res) => {
    const name = new URL(req.url, 'http://localhost').pathname.slice(1);
    if (!name) { res.setHeader('content-type','text/html'); res.end('<!doctype html><html lang="ar" dir="rtl"><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/modules/platform/push/wow-push-settings.css"></head><body><main id="page-notifications"><div class="wf-notifications-body"><section class="wf-notifications-empty"></section></div></main><section id="stab-cloud"></section><script src="/modules/platform/push/wow-push-device.js"></script><script src="/modules/platform/push/wow-push-client.js"></script><script src="/modules/platform/push/wow-push-settings.js"></script></body></html>'); return; }
    if (name === 'sw.js') { res.setHeader('content-type','application/javascript'); res.end("importScripts('./modules/platform/push/wow-push-sw.js?v=2'); self.addEventListener('activate', e => e.waitUntil(clients.claim()));"); return; }
    if (!files.has(name)) { res.writeHead(404).end(); return; }
    res.setHeader('content-type', name.endsWith('.js') ? 'application/javascript' : name.endsWith('.css') ? 'text/css' : 'image/png');
    res.end(await fs.readFile(path.join(dir, name)));
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const origin = 'http://127.0.0.1:' + server.address().port, publicKey = Buffer.from([4,...Array(64).fill(2)]).toString('base64url');
  let browser;
  try {
    browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium', args:['--no-sandbox']});
    const context = await browser.newContext({viewport:{width:390,height:820},permissions:['notifications']});
    await context.addInitScript(({publicKey}) => {
      window.WFCloud = {ready:Promise.resolve(), getSnapshot:() => ({authenticated:true,role:'owner',workspaceId:'workspace',userId:'owner',sessionVersion:1,mode:'remote',
        currentAccount:{role:'owner',id:'owner',status:'active',sessionVersion:1,permissions:[]}}),subscribe(){},
        async request(action) { (window.pushRequests ||= []).push(action); return {ok:true,publicKey}; }};
      window.WFCloudSettings = {open(){}};
    }, {publicKey});
    const page = await context.newPage();
    const control = await context.newPage(), cdp = await context.newCDPSession(control), observing = await context.newCDPSession(page);
    const registered = new Promise(resolve => observing.on('ServiceWorker.workerRegistrationUpdated', ({registrations}) => {
      const item = registrations.find(x => x.scopeURL === origin + '/' && !x.isDeleted); if (item) resolve(item.registrationId);
    }));
    await Promise.all([observing.send('ServiceWorker.enable'),cdp.send('ServiceWorker.enable')]);
    await page.goto(origin); await page.evaluate(() => navigator.serviceWorker.register('/sw.js').then(() => navigator.serviceWorker.ready));
    await page.waitForFunction(() => WFPush.getSnapshot().canEnable);
    assert.equal(await page.getByText('تفعيل إشعارات هذا الجهاز', {exact:true}).count(), 2);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    for (const lang of ['tr','fr','ru','en','ar']) { await page.evaluate(value => { document.documentElement.lang = value; }, lang); await page.locator('#wfPushPhoneTitle').waitFor(); }
    const binding = {workspaceId:'workspace',userId:'owner',deviceId:'desktop',bindingId:'451f2d36-b2e1-49e3-aa11-92278c1b60a2',financial:true,sessionVersion:1,mode:'remote',language:'ar',active:true};
    await page.evaluate(b => WFPushDevice.create(indexedDB).replace(null,b), binding);
    const registrationId = await registered;
    await page.close();
    assert.equal(context.pages().some(p => p.url().startsWith(origin)), false);
    await cdp.send('ServiceWorker.stopAllWorkers');
    const details = {...binding,validUntil:new Date(Date.now()+60000).toISOString(),kind:'payment',eventId:'payment-1-created',title:'دفعة فاتورة',body:'الفاتورة 5001\nالمبلغ ١٢٠ دولارًا',timestamp:Date.now()};
    await cdp.send('ServiceWorker.deliverPushMessage',{origin,registrationId,data:JSON.stringify(details)});
    // The worker's own transaction and system notification finish before any owner app window is created again.
    const deadline = Date.now() + 10000;
    let outstanding = [];
    while (Date.now() < deadline) {
      const worker = context.serviceWorkers().find(w => w.url() === origin + '/sw.js');
      if (worker) try { outstanding = await worker.evaluate(async () => (await registration.getNotifications()).map(n => ({title:n.title,body:n.body,tag:n.tag}))); } catch (_) {}
      if (outstanding.length) break;
      await new Promise(resolve => setTimeout(resolve,50));
    }
    assert.equal(outstanding.length,1,'native notification must be posted while the app is closed'); assert.equal(outstanding[0].body, details.body);
    const reopened = await context.newPage(); await reopened.goto(origin);
    await reopened.getByText(details.body,{exact:true}).waitFor();
    assert.equal(await reopened.locator('.wf-push-inbox li').count(),1); assert.equal(await reopened.getByText(details.title,{exact:true}).count(),1);
    console.log('PASS: native Chromium notification after closing all WOW windows and stopping its worker; Arabic inbox and both mobile controls verified. Provider transport was simulated.');
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
