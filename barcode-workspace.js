/* The reader, price choice and result share one page and the original dock. */
(() => {
  'use strict';
  function stageOf(tier, result) {
    if (tier?.style.opacity === '1' && tier.style.pointerEvents !== 'none') return 'tier';
    if (result?.style.opacity === '1' && !['0', '0px'].includes(result.style.maxHeight)) return 'result';
    return 'scan';
  }
  function restoreReader(phase) {
    if (!phase) return;
    phase.style.maxHeight = '';
    phase.style.overflow = '';
    phase.style.transform = '';
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {stageOf, restoreReader};
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const page = document.getElementById('page-quick-barcode');
  const scan = document.getElementById('qblPhase1');
  const tier = document.getElementById('qblPhase2');
  const result = document.getElementById('qblPhase3');
  if (!page || !scan || !tier || !result || page.dataset.wfBarcodeWorkspace) return;
  page.dataset.wfBarcodeWorkspace = 'true';
  const heading = scan.querySelector('.sct-sticky-header');
  if (heading) page.prepend(heading);
  const pending = new Set();
  let generation = 0;
  const state = () => typeof QBL === 'object' ? QBL : null;
  const active = () => page.classList.contains('active');
  function cancelPending() {
    generation++;
    for (const timer of pending) window.clearTimeout(timer);
    pending.clear();
  }
  function later(delay, callback) {
    const owner = generation;
    const timer = window.setTimeout(() => {
      pending.delete(timer);
      if (owner !== generation || !active()) return;
      callback();
      sync();
    }, delay);
    pending.add(timer);
  }
  function sync() {
    const stage = stageOf(tier, result);
    if (page.dataset.barcodeStage !== stage) page.dataset.barcodeStage = stage;
    for (const [element, ownStage] of [[scan, 'scan'], [tier, 'tier'], [result, 'result']]) {
      const inactive = ownStage !== stage;
      if (element.inert !== inactive) element.inert = inactive;
      const value = String(inactive);
      if (element.getAttribute('aria-hidden') !== value) element.setAttribute('aria-hidden', value);
    }
  }
  // Legacy phase animations scheduled independent callbacks. An old callback
  // could reopen a cancelled result or collapse a newly initialized scanner.
  // Own only that scheduling; the original renderers and camera methods still
  // own product values, pricing, streams and device cleanup.
  const enterTier = window.qblTransitionToTierSelect;
  if (typeof enterTier === 'function') window.qblTransitionToTierSelect = function (...args) {
    cancelPending();
    const value = enterTier.apply(this, args);
    const card = document.getElementById('qblTierCard');
    if (card) card.style.transform = '';
    window.qblStopCamera();
    sync();
    return value;
  };
  if (typeof window.qblSelectTierAndTransition === 'function') window.qblSelectTierAndTransition = function (choice) {
    if (!active() || state()?.phase !== 2 || !state().currentProduct || !['A', 'B', 'C'].includes(choice)) return;
    cancelPending();
    const product = state().currentProduct;
    const button = document.querySelector('#qblTierBtns [data-tier="' + choice + '"]');
    if (button) { button.style.transform = 'scale(.9)'; button.style.opacity = '.7'; }
    later(200, () => {
      if (state()?.phase === 2 && state().currentProduct === product) window.qblTransitionToResult(choice);
    });
  };
  if (typeof window.qblTransitionToResult === 'function') window.qblTransitionToResult = function (choice) {
    const current = state();
    if (!active() || current?.phase !== 2 || !current.currentProduct || !['A', 'B', 'C'].includes(choice)) return;
    cancelPending();
    const product = current.currentProduct;
    current.phase = 3;
    current.selectedTier = choice;
    window.qblHidePhase2(true);
    later(150, () => {
      scan.style.transition = 'opacity .4s ease, max-height .5s ease';
      scan.style.opacity = '0'; scan.style.maxHeight = '0';
      scan.style.overflow = 'hidden'; scan.style.pointerEvents = 'none';
      window.qblStopCamera();
    });
    later(400, () => {
      if (current.phase !== 3 || current.currentProduct !== product) return;
      window.qblBuildResult(product, choice);
      window.qblShowPhase3();
    });
    sync();
  };
  if (typeof window.qblCancelTierSelect === 'function') window.qblCancelTierSelect = function () {
    if (!active() || !state()) return;
    cancelPending();
    state().phase = 1;
    window.qblHidePhase2(true);
    restoreReader(scan);
    later(300, () => {
      scan.style.transition = 'opacity .4s ease, transform .4s cubic-bezier(.34,1.56,.64,1)';
      scan.style.opacity = '1'; scan.style.transform = ''; scan.style.pointerEvents = 'all';
      if (!document.hidden) window.qblStartCamera();
    });
    sync();
  };
  if (typeof window.qblChangeTier === 'function') window.qblChangeTier = function () {
    const current = state();
    if (!active() || current?.phase !== 3 || !current.currentProduct) return;
    cancelPending();
    current.phase = 2;
    window.qblHidePhase3();
    window.qblBuildTierButtons(current.currentProduct);
    later(100, () => {
      tier.style.opacity = '1'; tier.style.pointerEvents = 'all'; tier.style.background = 'rgba(0,0,0,.75)';
      const blur = document.getElementById('qblPhase2Blur'), card = document.getElementById('qblTierCard');
      if (blur) blur.style.backdropFilter = 'blur(16px)';
      if (card) card.style.transform = '';
    });
    sync();
  };
  // Returning from a result or re-entering the page restores its natural size.
  for (const name of ['initQblPage', 'qblShowPhase1', 'qblResetToScan']) {
    const original = window[name];
    if (typeof original !== 'function') continue;
    window[name] = function (...args) {
      cancelPending();
      restoreReader(scan);
      const value = original.apply(this, args);
      sync();
      return value;
    };
  }
  const notFound = window.qblShowNotFound;
  if (typeof notFound === 'function') window.qblShowNotFound = function (...args) {
    cancelPending();
    const current = state();
    if (current) {
      // The empty result uses phase 3 as well. Leaving phase 1 here would let
      // the existing visibility handler restart a camera behind this result.
      current.phase = 3; current.currentProduct = null; current.selectedTier = null;
    }
    const value = notFound.apply(this, args);
    sync();
    return value;
  };
  const observer = new MutationObserver(records => {
    if (records.some(record => record.target === page &&
      (!active() || !String(record.oldValue || '').split(/\s+/).includes('active')))) cancelPending();
    sync();
  });
  for (const element of [scan, tier, result]) observer.observe(element, {attributes: true, attributeFilter: ['style']});
  observer.observe(page, {attributes: true, attributeFilter: ['class'], attributeOldValue: true});
  sync();
})();
