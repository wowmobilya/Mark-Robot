/* Persistent controls for the existing reader. Displaying or reopening this
   surface never starts, restarts, or replaces a speech session. */
(() => {
  'use strict';
  const root = typeof window === 'object' ? window : null, document = root?.document;
  if (!document?.body || document.getElementById('wfSpeechControls')) return;
  const copy = {
    ar: {label:'التحكم بالقراءة',voice:'مارك · سوري',pause:'إيقاف مؤقت للقراءة',resume:'متابعة القراءة',stop:'إيقاف القراءة',report:'إظهار التقرير',preparing:'جارٍ تجهيز الصوت',speaking:'القراءة مستمرة',paused:'القراءة متوقفة مؤقتًا'},
    en: {label:'Reading controls',voice:'Mark · Syrian',pause:'Pause reading',resume:'Resume reading',stop:'Stop reading',report:'Show report',preparing:'Preparing audio',speaking:'Reading in progress',paused:'Reading paused'},
    tr: {label:'Okuma kontrolleri',voice:'Mark · Suriye Arapçası',pause:'Okumayı duraklat',resume:'Okumaya devam et',stop:'Okumayı durdur',report:'Raporu göster',preparing:'Ses hazırlanıyor',speaking:'Okuma sürüyor',paused:'Okuma duraklatıldı'},
    fr: {label:'Commandes de lecture',voice:'Mark · syrien',pause:'Mettre en pause',resume:'Reprendre la lecture',stop:'Arrêter la lecture',report:'Afficher le rapport',preparing:'Préparation audio',speaking:'Lecture en cours',paused:'Lecture en pause'},
    ru: {label:'Управление чтением',voice:'Марк · сирийский',pause:'Приостановить чтение',resume:'Продолжить чтение',stop:'Остановить чтение',report:'Показать отчёт',preparing:'Подготовка звука',speaking:'Чтение продолжается',paused:'Чтение приостановлено'},
  };
  const paths = {
    pause:'<path d="M8 6v12M16 6v12" stroke-width="3"/>',
    resume:'<path d="m9 5 10 7-10 7Z" fill="currentColor" stroke-width="1.5"/>',
    stop:'<rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" stroke="none"/>',
    report:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  };
  const node = (tag, id, className) => {
    const element = document.createElement(tag);
    if (id) element.id = id;
    if (className) element.className = className;
    return element;
  };
  const icon = name => '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + paths[name] + '</svg>';
  const dock = node('aside', 'wfSpeechControls', 'wf-speech-controls');
  dock.hidden = true; dock.setAttribute('role', 'region');
  const indicator = node('span', '', 'wf-speech-controls-indicator');
  indicator.setAttribute('aria-hidden', 'true');
  for (let index = 0; index < 4; index++) indicator.append(node('span'));
  const content = node('div', '', 'wf-speech-controls-content');
  const voice = node('strong', 'wfSpeechControlsVoice'), status = node('p', 'wfSpeechControlsStatus');
  status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); status.setAttribute('aria-atomic', 'true');
  content.append(voice, status);
  const actions = node('div', '', 'wf-speech-controls-actions');
  const report = node('button', 'wfSpeechControlsReport'), toggle = node('button', 'wfSpeechControlsToggle'), stop = node('button', 'wfSpeechControlsStop');
  for (const button of [report, toggle, stop]) button.type = 'button';
  report.innerHTML = icon('report'); stop.innerHTML = icon('stop');
  actions.append(report, toggle, stop); dock.append(indicator, content, actions); document.body.append(dock);
  let reportOpen = document.documentElement.classList.contains('wf-robot-report-open');
  function state() {
    try { return root.WFProgramSpeech?.getState?.() || {}; } catch (_) { return {}; }
  }
  function available(name) { return typeof root.WFProgramSpeech?.[name] === 'function'; }
  function label(button, value) { button.setAttribute('aria-label', value); button.title = value; }
  function render(value = state()) {
    value = value || {};
    const key = String(value.locale || document.documentElement.lang || 'en').toLowerCase().split(/[-_]/)[0];
    const L = copy[key] || copy.en, action = value.paused ? 'resume' : 'pause';
    dock.hidden = !value.active || reportOpen;
    dock.setAttribute('dir', key === 'ar' ? 'rtl' : 'ltr'); dock.setAttribute('aria-label', L.label);
    dock.dataset.state = value.paused ? 'paused' : value.state === 'speaking' ? 'speaking' : 'preparing';
    voice.textContent = L.voice;
    status.textContent = typeof value.message === 'string' && value.message.trim() ? value.message : L[dock.dataset.state];
    status.title = status.textContent;
    toggle.innerHTML = icon(action); label(toggle, L[action]);
    toggle.disabled = !value.active || value.canPause !== true || !available(action);
    stop.disabled = !value.active || !available('stop'); label(stop, L.stop);
    report.hidden = value.kind !== 'report'; report.disabled = !value.active || typeof root.WFRobotReport?.show !== 'function'; label(report, L.report);
  }
  function act(event, name) {
    if (event?.isTrusted !== true) return;
    const current = state(); if (!current.active) return;
    event.preventDefault?.(); event.stopPropagation?.();
    try {
      let result;
      if (name === 'report') {
        if (current.kind !== 'report' || typeof root.WFRobotReport?.show !== 'function') return;
        result = root.WFRobotReport.show();
      } else {
        const action = name === 'toggle' ? current.paused ? 'resume' : 'pause' : 'stop';
        if ((name === 'toggle' && current.canPause !== true) || !available(action)) return;
        result = root.WFProgramSpeech[action]();
      }
      Promise.resolve(result).catch(() => {});
    } catch (_) { /* Playback owns and publishes any failure state. */ }
  }
  toggle.addEventListener('click', event => act(event, 'toggle'));
  stop.addEventListener('click', event => act(event, 'stop'));
  report.addEventListener('click', event => act(event, 'report'));
  root.addEventListener('wf-program-speech-state', event => render(event.detail));
  root.addEventListener('wf-robot-ready', () => render());
  root.addEventListener('wf-robot-report-visibility', event => { reportOpen = event.detail?.open === true; render(); });
  render();
})();
