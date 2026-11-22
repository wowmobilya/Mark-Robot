/* Visual acceptance fixtures for imported WOW sections.
   Synthetic local markup only; does not request accounts, customer data or live services. */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const css=['operations-workspace.css','unified-workspaces.css','modules/gallery/styles.css','modules/platform/styles.css']
  .map(name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8')).join('\n');
const html=[
'<!doctype html><html lang="ar" dir="rtl" class="wf-section-mode"><head><meta name="viewport" content="width=device-width,initial-scale=1">',
'<style>:root{--card:#fff;--bg1:#edf5f6;--bg2:#fff;--input:#f2f5f6;--text:#203746;--text2:#546674;--border:#dce4e8;--bdr:#dce4e8;--brand-primary:#3f7c94;--on-primary:#fff;--business-soft:#edf5f8;--ops-line:#dce4e8;--ops-panel:#fff;--ops-gap:12px;--workspace-inset:12px;--gold:#3f7c94}*{box-sizing:border-box}</style>',
'<style id="fixture-styles"></style></head><body style="margin:0;background:var(--bg1);font-family:Arial,sans-serif">',
'<main id="mainContent"><section class="page wf-ops-page wf-module-page active" style="display:block">',
'<header class="sct-sticky-header wf-heading-row" style="display:grid;grid-template-columns:48px minmax(0,1fr) 48px;align-items:center;gap:8px">',
'<button class="sct-back-btn" aria-label="رجوع">←</button><div class="wf-centered-heading"><h1>طلباتي ومخزوني</h1></div><button class="wf-section-menu" aria-label="القائمة">☰</button></header>',
'<div class="wf-module-statusbar"><button class="wf-module-sync-trigger">المزامنة · متصل</button></div>',
'<div class="wf-ops-body"><div class="wfg-workspace wfg-route-my-orders"><div class="wfg-body">',
'<div class="wfg-tabs" role="group"><button class="btn wfg-button">طلباتي</button><button class="btn wfg-button wfg-active">مخزوني</button></div>',
'<section class="wfg-personal-intro"><h2>مخزوني</h2><p>هذا الرصيد مبني على طلباتك ومبيعاتك.</p></section>',
'<div class="wfg-actions wfg-personal-actions"><button class="btn wfg-button">إعدادات الطباعة</button><button class="btn wfg-button">معاينة</button></div>',
'<div class="wfg-filters"><input type="search" placeholder="بحث" aria-label="بحث"><select aria-label="حالة الطلب"><option>الكل</option></select>',
'<label class="wfg-check"><input type="checkbox">عرض العناصر المخفية</label></div>',
'<div class="wfg-order-grid"><section class="wfg-personal-empty"><h3>لا يوجد مخزون شخصي مسجل بعد</h3>',
'<p>سيظهر الرصيد عندما تُسجّل طلبات مرتبطة بهذا الحساب.</p></section></div>',
'</div></div></div></section></main></body></html>'
].join('');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 try{
  for(const width of [360,390,680,1000]){
   const page=await browser.newPage({viewport:{width,height:800},deviceScaleFactor:1,hasTouch:width<700});
   await page.setContent(html);
   await page.locator('#fixture-styles').evaluate((node,value)=>{node.textContent=value;},css);
   const result=await page.evaluate(()=>{
    const rect=s=>document.querySelector(s).getBoundingClientRect();
    const sync=rect('.wf-module-sync-trigger'),tabs=rect('.wfg-tabs'),search=rect('.wfg-filters input[type="search"]');
    const filter=rect('.wfg-filters');
    return {viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,
      syncWidth:sync.width,syncHeight:sync.height,syncBottom:sync.bottom,tabsTop:tabs.top,
      tabsWidth:tabs.width,searchWidth:search.width,searchHeight:search.height,filterWidth:filter.width,
      searchRight:search.right,filterRight:filter.right};
   });
   assert.ok(result.scroll<=result.viewport+3, 'Horizontal overflow: '+width+' '+JSON.stringify(result));
   assert.ok(result.syncWidth>80 && result.syncWidth<width-12, 'Sync button takes the full viewport: '+width);
   assert.ok(result.syncHeight>=35 && result.tabsTop>result.syncBottom-2, 'Status overlaps tab controls: '+width);
   assert.ok(result.tabsWidth>200 && result.searchWidth>70 && result.searchHeight>=44, 'Filters not usable: '+width);
   assert.ok(result.searchRight<=result.filterRight+2,'Search field overflows its card: '+width);
   await page.close();
  }
  console.log('Integrated WOW mobile RTL fixture: 4 responsive viewports passed.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
