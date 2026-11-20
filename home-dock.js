/* The original dashboard edge tab, with viewport-safe placement and one owner
   for its open/close lifecycle. Section preferences belong to WFHomeLayout. */
(function (root) {
  'use strict';
  const positionKey = 'wf.dashboard.dockPosition';
  const clamp = (value, min, max) => Math.max(min, Math.min(Math.max(min, max), value));
  function normalizePosition(value, direction) {
    return {
      x: Number.isFinite(value?.x) ? (value.x < .5 ? 0 : 1) : direction === 'rtl' ? 0 : 1,
      y: Number.isFinite(value?.y) ? clamp(value.y, 0, 1) : .48
    };
  }
  function create({panel, onOpen, onClose}) {
    const doc = panel?.ownerDocument || root.document, win = doc?.defaultView || root;
    const dashboard = doc?.getElementById('page-dashboard');
    if (!panel || !dashboard) return null;
    const html = doc.documentElement, viewport = win.visualViewport;
    const topbar = doc.querySelector('.navbar'), bottomNav = doc.getElementById('bottomNav');
    const bottomCircle = doc.getElementById('bnavCircle');
    const menu = doc.createElement('details'), trigger = doc.createElement('summary');
    menu.className = 'dash-visibility'; menu.id = 'wfHomeDock'; trigger.id = 'wfHomeEdit';
    panel.classList.add('dash-dock-panel');
    if (!panel.id) panel.id = 'dashboard-customization-panel';
    trigger.setAttribute('aria-controls', panel.id); trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = '<svg class="wf-dock-shape" viewBox="0 0 14 86" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M.75 .75H5.25A8 8 0 0 1 13.25 8.75V77.25A8 8 0 0 1 5.25 85.25H.75Z" stroke-width="1.5" stroke-linejoin="round"/></svg><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M4 7h7m5 0h4M4 17h2m5 0h9"/><circle cx="13.5" cy="7" r="2.5"/><circle cx="8.5" cy="17" r="2.5"/></svg>';
    menu.append(trigger, panel);
    const backdrop = doc.createElement('div'); backdrop.id = 'wfHomeDockBackdrop'; backdrop.className = 'wf-dashboard-dock-backdrop'; backdrop.hidden = true;
    doc.body.append(backdrop, menu);
    const design = panel.querySelector('.dash-dock-layout') || panel;
    let saved, storage;
    try { storage = win.localStorage; saved = JSON.parse(storage?.getItem(positionKey) || 'null'); } catch (_) {}
    let position = normalizePosition(saved, html.dir), drag = null, opened = false, suppressClick = false, placeFrame = 0;
    for (const side of ['top', 'right', 'bottom', 'left']) menu.style.setProperty('--wf-dock-safe-' + side, 'env(safe-area-inset-' + side + ',0px)');
    function active() {
      return dashboard.classList.contains('active') && !html.classList.contains('wf-mobile-menu-open') &&
        !html.classList.contains('wf-booting') && !html.classList.contains('wf-section-mode');
    }
    function pixels(element, property, value, priority = '') {
      const next = Math.round(value * 100) / 100 + 'px';
      if (element.style.getPropertyValue(property) !== next || element.style.getPropertyPriority(property) !== priority) element.style.setProperty(property, next, priority);
    }
    function visibleRect(element, view) {
      if (!element || !element.getClientRects().length) return null;
      const style = win.getComputedStyle(element), rect = element.getBoundingClientRect();
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0 || rect.width <= 0 || rect.height <= 0 ||
          rect.bottom <= view.top || rect.top >= view.bottom || rect.right <= view.left || rect.left >= view.right) return null;
      return rect;
    }
    function bounds() {
      const left = viewport?.offsetLeft || 0, top = viewport?.offsetTop || 0;
      const view = {left, top, right: left + (viewport?.width || html.clientWidth || win.innerWidth), bottom: top + (viewport?.height || win.innerHeight)};
      const style = win.getComputedStyle(menu), safe = side => parseFloat(style.getPropertyValue('--wf-dock-safe-' + side)) || 0;
      const area = {edgeLeft: view.left, edgeRight: view.right, left: view.left + safe('left'), right: view.right - safe('right'),
        top: view.top + safe('top') + 8, bottom: view.bottom - safe('bottom') - 8};
      const header = visibleRect(topbar, view), nav = visibleRect(bottomNav, view);
      if (header) area.top = Math.max(area.top, header.bottom + 8);
      if (nav) { const circle = visibleRect(bottomCircle, view); area.bottom = Math.min(area.bottom, Math.min(nav.top, circle?.top ?? nav.top) - 8); }
      if (area.bottom - area.top < (trigger.offsetHeight || 86)) {
        area.top = view.top + safe('top') + 8; area.bottom = Math.max(area.top, view.bottom - safe('bottom') - 8);
      }
      return area;
    }
    function scrollHints() {
      const above = opened && design.scrollTop > 1, below = opened && design.scrollHeight - design.clientHeight - design.scrollTop > 1;
      for (const element of [panel, design]) {
        if (element.dataset.scrollTop !== String(above)) element.dataset.scrollTop = String(above);
        if (element.dataset.scrollBottom !== String(below)) element.dataset.scrollBottom = String(below);
      }
    }
    function open() {
      if (!active()) return false;
      if (opened) return true;
      opened = true; menu.hidden = false; menu.open = true; backdrop.hidden = false; trigger.setAttribute('aria-expanded', 'true');
      onOpen?.(); place(); return true;
    }
    function close(returnFocus = false) {
      if (!opened) return false;
      opened = false; menu.open = false; backdrop.hidden = true; trigger.setAttribute('aria-expanded', 'false');
      scrollHints(); onClose?.({returnFocus: !!returnFocus});
      if (returnFocus && active()) trigger.focus({preventScroll: true});
      return true;
    }
    function place() {
      if (!active()) { menu.hidden = true; close(false); return; }
      menu.hidden = false;
      const area = bounds(), gripWidth = trigger.offsetWidth || 14, gripHeight = trigger.offsetHeight || 86;
      const x = clamp(position.x, 0, 1), y = clamp(position.y, 0, 1), side = x < .5 ? 'left' : 'right';
      const left = area.edgeLeft + x * Math.max(0, area.edgeRight - area.edgeLeft - gripWidth);
      const top = area.top + y * Math.max(0, area.bottom - area.top - gripHeight);
      pixels(menu, '--wf-dock-left', left); pixels(menu, 'left', left); pixels(menu, 'top', top);
      menu.style.right = 'auto'; menu.style.bottom = 'auto';
      if (menu.dataset.side !== side) menu.dataset.side = side;
      if (!opened) { scrollHints(); return; }
      const panelSpace = Math.max(0, side === 'left' ? area.right - left - gripWidth - 16 : left - area.left - 16);
      pixels(panel, 'max-width', panelSpace, 'important'); pixels(panel, 'max-height', Math.max(0, area.bottom - area.top));
      const panelWidth = panel.offsetWidth, panelHeight = panel.offsetHeight;
      const inward = side === 'left' ? left + gripWidth + 8 : left - 8 - panelWidth;
      const panelLeft = clamp(inward, area.left + 8, area.right - 8 - panelWidth);
      const panelTop = clamp(top + (gripHeight - panelHeight) / 2, area.top, area.bottom - panelHeight);
      pixels(panel, 'left', panelLeft - left); pixels(panel, 'top', panelTop - top);
      panel.style.right = 'auto'; panel.style.bottom = 'auto'; scrollHints();
    }
    function reposition() { if (!placeFrame) placeFrame = win.requestAnimationFrame(() => { placeFrame = 0; place(); }); }
    function persist() { try { storage?.setItem(positionKey, JSON.stringify(position)); } catch (_) {} }
    function finishDrag(commit) {
      if (!drag) return;
      const current = drag; drag = null;
      if (current.moved) {
        if (commit) { position.x = position.x < .5 ? 0 : 1; persist(); } else position = current.position;
        suppressClick = true;
      }
      delete menu.dataset.dragging;
      try { trigger.releasePointerCapture(current.id); } catch (_) {}
      reposition();
    }
    function swapSide() {
      if (!active()) return false;
      finishDrag(false); position = {x: position.x < .5 ? 1 : 0, y: clamp(position.y, 0, 1)};
      persist(); reposition(); return true;
    }
    trigger.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.isPrimary === false) return;
      suppressClick = false;
      const rect = trigger.getBoundingClientRect();
      drag = {id: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, position: {...position}, moved: false};
      try { trigger.setPointerCapture(event.pointerId); } catch (_) {}
    });
    trigger.addEventListener('pointermove', event => {
      if (!drag || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 5) return;
      event.preventDefault(); drag.moved = true; suppressClick = true; menu.dataset.dragging = 'true'; close(false);
      const area = bounds(), fraction = (value, maximum) => clamp(value / Math.max(1, maximum), 0, 1);
      position = {x: fraction(drag.left + dx - area.edgeLeft, area.edgeRight - area.edgeLeft - trigger.offsetWidth),
        y: fraction(drag.top + dy - area.top, area.bottom - area.top - trigger.offsetHeight)};
      reposition();
    }, {passive: false});
    const pointerEnd = event => { if (drag?.id === event.pointerId) finishDrag(event.type === 'pointerup'); };
    trigger.addEventListener('pointerup', pointerEnd); trigger.addEventListener('pointercancel', pointerEnd);
    trigger.addEventListener('lostpointercapture', () => finishDrag(false));
    win.addEventListener('blur', () => finishDrag(false));
    trigger.addEventListener('click', event => {
      event.preventDefault();
      const ignore = suppressClick && event.detail !== 0; suppressClick = false;
      if (!ignore) opened ? close(true) : open();
    });
    // Keep the same callback contract if assistive technology changes <details>.
    menu.addEventListener('toggle', () => { if (menu.open && !opened) open(); else if (!menu.open && opened) close(false); });
    backdrop.addEventListener('pointerdown', () => close(false));
    doc.addEventListener('pointerdown', event => { if (opened && !menu.contains(event.target)) close(false); });
    doc.addEventListener('keydown', event => {
      if (event.key === 'Escape' && opened) { event.preventDefault(); event.stopPropagation(); close(true); }
    });
    design.addEventListener('scroll', scrollHints, {passive: true});
    win.addEventListener('resize', reposition, {passive: true});
    viewport?.addEventListener('resize', reposition, {passive: true}); viewport?.addEventListener('scroll', reposition, {passive: true});
    doc.addEventListener('scroll', event => { if (!menu.contains(event.target)) reposition(); }, {capture: true, passive: true});
    topbar?.addEventListener('transitionend', reposition);
    if (win.ResizeObserver) {
      const observer = new win.ResizeObserver(reposition);
      for (const element of [trigger, panel, topbar, bottomNav, bottomCircle]) if (element) observer.observe(element);
    }
    if (win.MutationObserver) {
      new win.MutationObserver(reposition).observe(dashboard, {attributes: true, attributeFilter: ['class']});
      new win.MutationObserver(reposition).observe(html, {attributes: true, attributeFilter: ['class', 'dir']});
    }
    reposition();
    return {menu, trigger, open, close, isOpen: () => opened, swapSide, reposition};
  }
  const api = {create, normalizePosition};
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (!root.WFHomeDock) root.WFHomeDock = api;
})(typeof window === 'undefined' ? globalThis : window);
