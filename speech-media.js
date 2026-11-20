/* Share the existing speech owner with headset, lock-screen and OS controls. */
(() => {
  'use strict';
  const root = typeof window === 'object' ? window : null;
  let media;
  try { media = root?.navigator?.mediaSession; } catch (_) { return; }
  if (!media || typeof media.setActionHandler !== 'function') return;
  const labels = {
    ar: {report: 'تقرير اليوم · مارك', program: 'قراءة النص · مارك', intro: 'مساعد واو · مارك'},
    en: {report: 'Daily report · Mark', program: 'Text reading · Mark', intro: 'WOW assistant · Mark'},
    tr: {report: 'Günlük rapor · Mark', program: 'Metin okuma · Mark', intro: 'WOW asistanı · Mark'},
    fr: {report: 'Rapport du jour · Mark', program: 'Lecture du texte · Mark', intro: 'Assistant WOW · Mark'},
    ru: {report: 'Отчёт за день · Mark', program: 'Чтение текста · Mark', intro: 'Помощник WOW · Mark'},
  };
  let owned = false, identity = '', heard = false;
  function state() { try { return root.WFProgramSpeech?.getState?.() || {}; } catch (_) { return {}; } }
  function act(name) {
    if (!owned || !state().active) return;
    try { return Promise.resolve(root.WFProgramSpeech?.[name]?.()).catch(() => {}); }
    catch (_) { /* The owner publishes any playback failure in its visible state. */ }
  }
  function handler(name, fn) { try { media.setActionHandler(name, fn); } catch (_) {} }
  function clear() {
    if (!owned) return;
    owned = false; identity = ''; heard = false;
    for (const action of ['play', 'pause', 'stop']) handler(action, null);
    try { media.playbackState = 'none'; media.metadata = null; } catch (_) {}
  }
  function sync(value) {
    if (!value?.active) { clear(); return; }
    if (!owned) {
      owned = true;
      handler('play', () => act('resume'));
      handler('pause', () => act('pause'));
      handler('stop', () => act('stop'));
    }
    const language = labels[value.locale] ? value.locale : 'en';
    const kind = value.kind === 'report' ? 'report' : value.kind === 'program' ? 'program' : 'intro';
    const next = language + ':' + kind;
    if (identity !== next) {
      identity = next;
      // Notification metadata is generic, never customer names or financial text.
      if (typeof root.MediaMetadata === 'function') try {
        media.metadata = new root.MediaMetadata({title: labels[language][kind], artist: 'WOW FURNITURE',
          artwork: [{src: 'app-icon-512.png', sizes: '512x512', type: 'image/png'}]});
      } catch (_) {}
    }
    if (value.state === 'speaking' && !value.paused) heard = true;
    try { media.playbackState = heard && !value.paused && value.state !== 'paused' ? 'playing' : 'paused'; } catch (_) {}
  }
  root.addEventListener('wf-program-speech-state', event => sync(event.detail));
  root.addEventListener('wf-robot-ready', () => sync(state()));
  root.addEventListener('pagehide', clear);
  sync(state());
})();
