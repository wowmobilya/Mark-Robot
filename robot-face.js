/* Infinity Robot's optional local speech and read-only daily report. No microphone access. */
(() => {
  'use strict';

  const track = document.querySelector('.wf-greeting-faces');
  if (!track || document.getElementById('wfGreetingRobot')) return;

  const messages = {
    ar: {
      title: 'إنفنتي روبوت', ready: 'صوت وتعبيرات بلمسة منك', speaking: 'أتحدث إليك…',
      preparing: 'جارٍ تشغيل الصوت…', stopped: 'تم إيقاف الصوت',
      unsupported: 'الصوت غير مدعوم في هذا المتصفح', unavailable: 'لا يتوفر صوت عربي دون اتصال على جهازك',
      failed: 'تعذّر تشغيل الصوت، حاول مجددًا', busy: 'الصوت مشغول الآن، حاول بعد قليل',
      speak: 'هوية الروبوت', stop: 'إيقاف',
      report: 'اسمع التقرير اليومي', reportUnavailable: 'التقرير يحتاج صوتًا عربيًا مثبتًا يعمل دون اتصال',
      reportEmpty: 'بيانات التقرير اليومي غير متاحة الآن',
      audioURL: 'assets/robot-identity/ar.mp3?v=2',
      greeting: 'مرحبًا سيد أحمد. أنا مساعدك الذكي إنفنتي روبوت، وأنا هنا من أجل تنظيم سير العمل. وأنا من تصميم المهندس معتز بالله حاج شعبان، مطوّري ومبرمجي. وشكرًا لك.',
    },
    tr: {
      title: 'Infinity Robot', ready: 'Bir dokunuşla ses ve ifade', speaking: 'Konuşuyorum…',
      preparing: 'Ses başlatılıyor…', stopped: 'Ses durduruldu',
      unsupported: 'Bu tarayıcı sesi desteklemiyor', unavailable: 'Cihazınızda çevrimdışı Türkçe ses yok',
      failed: 'Ses başlatılamadı, tekrar deneyin', busy: 'Ses meşgul, biraz sonra deneyin',
      speak: 'Robot kimliği', stop: 'Durdur',
      report: 'Günlük raporu dinle', reportUnavailable: 'Rapor için cihazda çevrimdışı Türkçe ses gerekir',
      reportEmpty: 'Günlük rapor verileri şu anda kullanılamıyor',
      audioURL: 'assets/robot-identity/tr.mp3?v=1',
      greeting: 'Merhaba Ahmet Bey. Ben akıllı asistanınız Infinity Robot. İş akışını düzenlemek için buradayım. Beni geliştiren ve programlayan mühendis Moataz Bellah Haj Shaaban tarafından tasarlandım. Teşekkür ederim.',
    },
    en: {
      title: 'Infinity Robot', ready: 'A voice and a smile, on tap', speaking: 'Speaking…',
      preparing: 'Starting voice…', stopped: 'Voice stopped',
      unsupported: 'Voice is unsupported in this browser', unavailable: 'No offline English voice on this device',
      failed: 'Voice could not start. Please retry', busy: 'Voice is busy. Please try shortly',
      speak: 'Robot identity', stop: 'Stop',
      report: 'Daily report', reportUnavailable: 'The report needs an installed offline English voice',
      reportEmpty: 'Daily report data is unavailable right now',
      audioURL: 'assets/robot-identity/en.mp3?v=1',
      greeting: 'Hello, Mr. Ahmed. I am your smart assistant, Infinity Robot, and I am here to organize the workflow. I was designed by engineer Moataz Bellah Haj Shaaban, my developer and programmer. Thank you.',
    },
    fr: {
      title: 'Infinity Robot', ready: 'Une voix et un sourire au toucher', speaking: 'Je parle…',
      preparing: 'Démarrage de la voix…', stopped: 'Voix arrêtée',
      unsupported: 'Ce navigateur ne prend pas la voix en charge', unavailable: 'Aucune voix française hors ligne disponible',
      failed: 'La voix ne démarre pas. Réessayez', busy: 'La voix est occupée. Réessayez bientôt',
      speak: 'Identité du robot', stop: 'Arrêter',
      report: 'Rapport du jour', reportUnavailable: 'Le rapport nécessite une voix française hors ligne installée',
      reportEmpty: 'Le rapport du jour est indisponible pour le moment',
      audioURL: 'assets/robot-identity/fr.mp3?v=1',
      greeting: 'Bonjour, Monsieur Ahmed. Je suis votre assistant intelligent, Infinity Robot, et je suis ici pour organiser le déroulement du travail. J’ai été conçu par l’ingénieur Moataz Bellah Haj Shaaban, mon développeur et programmeur. Merci à vous.',
    },
    ru: {
      title: 'Робот Infinity', ready: 'Голос и улыбка по касанию', speaking: 'Говорю…',
      preparing: 'Запускаю голос…', stopped: 'Голос остановлен',
      unsupported: 'Этот браузер не поддерживает голос', unavailable: 'Нет русского голоса для работы без сети',
      failed: 'Не удалось включить голос. Повторите', busy: 'Голос занят. Повторите чуть позже',
      speak: 'О роботе', stop: 'Стоп',
      report: 'Отчёт за день', reportUnavailable: 'Для отчёта нужен установленный русский голос без сети',
      reportEmpty: 'Данные дневного отчёта сейчас недоступны',
      audioURL: 'assets/robot-identity/ru.mp3?v=1',
      greeting: 'Здравствуйте, господин Ахмед. Я ваш умный помощник, робот Infinity, и я здесь, чтобы организовать рабочий процесс. Меня создал инженер Моатаз Беллах Хадж Шаабан, мой разработчик и программист. Спасибо вам.',
    },
  };
  const identityRecordings = new Set(Object.values(messages).map(copy => copy.audioURL));
  // Original WOW ROBOT face proportions, with the dark-on-white identity from the user’s reference photo.
  const mouthShapes = {
    calm: 'M 274 252.72 Q 300 273.72 326 252.72',
    happy: 'M 264 252.72 Q 300 284.72 336 252.72',
    thinking: 'M 274 252.72 Q 300 273.72 326 252.72',
    surprised: 'M 274 252.72 Q 300 273.72 326 252.72',
  };

  function mountRobotFace(container) {
    const root = document.documentElement;
    const dashboard = container.closest('.page');
    const face = document.createElement('div');
    face.id = 'wfGreetingRobot';
    face.className = 'wf-greeting-extra wf-robot-card';
    face.setAttribute('aria-hidden', 'true');
    face.setAttribute('aria-labelledby', 'wfRobotTitle');
    face.setAttribute('role', 'group');
    face.inert = true;
    face.dataset.expression = 'calm';
    face.dataset.speaking = 'false';
    face.innerHTML = `
      <div class="wf-robot-heading">
        <strong id="wfRobotTitle"><i class="wf-robot-signal" aria-hidden="true"></i><span></span></strong>
        <span id="wfRobotStatus" class="wf-robot-status" role="status" aria-live="polite" aria-atomic="true"></span>
      </div>
      <div class="wf-robot-display" aria-hidden="true">
        <svg class="wf-robot-face" viewBox="0 0 600 336" focusable="false">
          <g class="wf-robot-gaze">
            <g class="wf-robot-eye wf-robot-eye-left" transform="translate(174 147.84)">
              <path class="wf-robot-brow" d="M -29 -70 Q 0 -80 29 -70"/>
              <g class="wf-robot-blink">
                <ellipse class="wf-robot-eye-open" rx="34" ry="50" fill="#171923"/>
                <ellipse class="wf-robot-glint" cx="-10" cy="-18" rx="10" ry="13"/>
                <circle class="wf-robot-glint-small" cx="13" cy="19" r="4"/>
              </g>
              <path class="wf-robot-eye-closed" d="M -29 3 Q 0 -15 29 3"/>
            </g>
            <g class="wf-robot-eye wf-robot-eye-right" transform="translate(426 147.84)">
              <path class="wf-robot-brow" d="M -29 -70 Q 0 -80 29 -70"/>
              <g class="wf-robot-blink">
                <ellipse class="wf-robot-eye-open" rx="34" ry="50" fill="#171923"/>
                <ellipse class="wf-robot-glint" cx="-10" cy="-18" rx="10" ry="13"/>
                <circle class="wf-robot-glint-small" cx="13" cy="19" r="4"/>
              </g>
              <path class="wf-robot-eye-closed" d="M -29 3 Q 0 -15 29 3"/>
            </g>
          </g>
          <path class="wf-robot-mouth" d="${mouthShapes.calm}"/>
          <g class="wf-robot-mouth-open">
            <ellipse class="wf-robot-mouth-cavity" cx="300" cy="258.72" rx="38" ry="39"/>
            <ellipse class="wf-robot-mouth-light" cx="300" cy="270.72" rx="14" ry="14"/>
          </g>
          <g class="wf-robot-thinking">
            <circle cx="283" cy="43.68" r="4"/><circle cx="300" cy="43.68" r="4"/><circle cx="317" cy="43.68" r="4"/>
          </g>
        </svg>
      </div>
      <div class="wf-robot-actions">
        <button type="button" class="wf-robot-button wf-robot-report" aria-describedby="wfRobotStatus" aria-pressed="false">
          <svg class="wf-robot-report-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M 7 3 H 15 L 19 7 V 21 H 5 V 3 Z M 14 3 V 8 H 19 M 9 12 H 15 M 9 16 H 15"/></svg>
          <svg class="wf-robot-stop-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="6" y="6" width="12" height="12" rx="3"/></svg>
          <span></span>
        </button>
        <button type="button" class="wf-robot-button wf-robot-speak" aria-describedby="wfRobotStatus" aria-pressed="false">
          <svg class="wf-robot-speak-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M 11 5 6 9 H 3 V 15 H 6 L 11 19 Z M 15 8 A 6 6 0 0 1 15 16 M 18 5 A 10 10 0 0 1 18 19"/></svg>
          <svg class="wf-robot-stop-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="6" y="6" width="12" height="12" rx="3"/></svg>
          <span></span>
        </button>

      </div>`;
    container.append(face);

    const title = face.querySelector('#wfRobotTitle span');
    const status = face.querySelector('.wf-robot-status');
    const speakButton = face.querySelector('.wf-robot-speak');
    const reportButton = face.querySelector('.wf-robot-report');
    const mouth = face.querySelector('.wf-robot-mouth');
    const synth = window.speechSynthesis;
    const supported = !!synth && typeof synth.speak === 'function' && typeof synth.cancel === 'function' &&
      typeof synth.getVoices === 'function' && typeof window.SpeechSynthesisUtterance === 'function';
    let locale = language();
    let state = 'ready';
    let utterance = null;
    let recording = null;
    let offlineRequest = null;
    let reportRequest = null;
    let sessionKind = 'intro';
    let startTimer = null;
    let beatTimer = null;
    let expressionTimer = null;
    let expressionStep = 0;
    let voices = [];
    let disposed = false;
    let preferences = {autoExpressions: true, idleMotion: true};
    let lastMotion = {active: false, x: 0, y: 0};

    function language() {
      const lang = (root.lang || 'ar').toLowerCase().split(/[-_]/)[0];
      return Object.prototype.hasOwnProperty.call(messages, lang) ? lang : 'en';
    }

    function currentVoice() {
      // The user requested offline speech: never select a network-backed system voice.
      const local = voices.filter(voice => voice.localService === true &&
        String(voice.lang || '').toLowerCase().split(/[-_]/)[0] === locale);
      return local.find(voice => voice.default) || local[0] || null;
    }

    function recordingURL() {
      // Only recordings bundled with this application are allowed for offline playback.
      const value = messages[locale].audioURL;
      return typeof window.Audio === 'function' && typeof value === 'string' &&
        identityRecordings.has(value) ? value : '';
    }

    function offlineReady() {
      try { return typeof window.WFOfflineVoice?.speak === 'function' && window.WFOfflineVoice.getStatus(locale).ready === true; }
      catch (_) { return false; }
    }

    function voicePackState() {
      try { return window.WFOfflineVoice?.getStatus(locale) || {state: 'unsupported'}; }
      catch (_) { return {state: 'unsupported'}; }
    }

    function reportVoice(state, pack = voicePackState()) {
      reportEvent('wf-robot-report-voice', {state, locale, progress: pack.progress || 0,
        loaded: pack.loaded || 0, total: pack.total || 0, reason: pack.reason || ''});
    }

    function active() { return !!utterance || !!recording || !!offlineRequest || !!reportRequest; }

    function visible() {
      return !disposed && face.isConnected && !document.hidden &&
        face.getAttribute('aria-hidden') === 'false' && !!dashboard?.classList.contains('active');
    }

    function setExpression(expression) {
      face.dataset.expression = expression;
      mouth.setAttribute('d', mouthShapes[expression]);
    }

    function automaticExpression(expression) {
      setExpression(preferences.autoExpressions ? expression : 'calm');
    }

    function applyPreferences() {
      const stored = window.WFRobotSettings?.getPreferences?.() ||
        (typeof S === 'object' ? S.settings?.robot : null) || {};
      preferences = {autoExpressions: stored.autoExpressions !== false, idleMotion: stored.idleMotion !== false};
      face.dataset.idleMotion = String(preferences.idleMotion);
      if (!preferences.autoExpressions) {
        clearTimeout(expressionTimer);
        expressionTimer = null;
        setExpression('calm');
      }
    }

    function applyMotion(event) {
      if (event?.detail) lastMotion = event.detail;
      const tracking = lastMotion.active === true && visible();
      face.dataset.tracking = String(tracking);
      const bound = value => Math.max(-1, Math.min(1, Number(value) || 0));
      face.style?.setProperty('--wf-robot-look-x', `${tracking ? bound(lastMotion.x) * 22 : 0}px`);
      face.style?.setProperty('--wf-robot-look-y', `${tracking ? bound(lastMotion.y) * 12 : 0}px`);
    }

    function reportEvent(type, detail) {
      window.dispatchEvent(new CustomEvent(type, {detail}));
    }

    function reportPlayback(playbackState, reason) {
      if (sessionKind === 'report') reportEvent('wf-robot-report-playback', {state: playbackState, ...(reason ? {reason} : {})});
    }

    function render() {
      const copy = messages[locale];
      title.textContent = copy.title;
      const statusKey = state === 'ready' && !supported && !recordingURL() && !offlineReady() ? 'unsupported' :
        state === 'ready' && !currentVoice() && !recordingURL() && !offlineReady() ? 'unavailable' : state;
      status.textContent = copy[statusKey];
      status.title = copy[statusKey];
      const introActive = active() && sessionKind === 'intro';
      const reportActive = active() && sessionKind === 'report';
      speakButton.querySelector('span').textContent = copy[introActive ? 'stop' : 'speak'];
      speakButton.setAttribute('aria-label', copy[introActive ? 'stop' : 'speak']);
      speakButton.title = copy[introActive ? 'stop' : 'speak'];
      speakButton.setAttribute('aria-pressed', String(introActive));
      speakButton.disabled = (!supported && !recordingURL() && !offlineReady()) || reportActive;
      if (reportButton) {
        reportButton.querySelector('span').textContent = copy[reportActive ? 'stop' : 'report'];
        reportButton.setAttribute('aria-label', copy[reportActive ? 'stop' : 'report']);
        reportButton.setAttribute('aria-pressed', String(reportActive));
        reportButton.title = copy[reportActive ? 'stop' : 'report'];
        reportButton.disabled = introActive;
      }
      face.dataset.voiceActive = String(active());
      face.dataset.voiceKind = sessionKind;
    }

    function announceActivity(active) {
      face.dispatchEvent(new CustomEvent('wf-robot-speaking', {bubbles: true, detail: {active}}));
    }

    function releaseRecording(request) {
      request.onplaying = request.onwaiting = request.onpause = request.onended = request.onerror = null;
      try { request.pause(); request.removeAttribute('src'); request.load(); }
      catch (_) { /* Its callbacks are already detached and the session invalidated. */ }
    }

    function finish(nextState = 'ready', cancel = false) {
      const wasActive = active();
      const ownedSpeech = !!utterance;
      const oldRecording = recording;
      const oldOffline = offlineRequest;
      const oldReport = reportRequest;
      // Invalidate callbacks before cancel() because some engines dispatch synchronously.
      utterance = null;
      recording = null;
      offlineRequest = null;
      reportRequest = null;
      clearTimeout(startTimer);
      startTimer = null;
      clearTimeout(beatTimer);
      beatTimer = null;
      clearTimeout(expressionTimer);
      expressionTimer = null;
      face.dataset.speaking = 'false';
      face.dataset.speechBeat = 'false';
      state = nextState;
      setExpression('calm');
      if (oldRecording) releaseRecording(oldRecording);
      oldOffline?.handle?.cancel();
      oldReport?.controller?.abort();
      oldReport?.playback?.dispose();
      if (cancel && ownedSpeech) {
        try { synth.cancel(); } catch (_) { /* The visible state still returns to idle. */ }
      }
      render();
      if (wasActive) announceActivity(false);
      if (wasActive) {
        const playbackState = nextState === 'failed' ? 'failed' :
          ['reportUnavailable', 'reportEmpty'].includes(nextState) ? 'unavailable' :
          cancel || nextState === 'stopped' ? 'stopped' : 'finished';
        reportPlayback(playbackState, ['unavailable', 'failed'].includes(playbackState) ? messages[locale][nextState] : '');
      }
    }

    function refreshVoices() {
      if (disposed) return;
      try { voices = supported ? synth.getVoices() : []; } catch (_) { voices = []; }
      if (!active() && (currentVoice() || recordingURL() || offlineReady()) && ['unavailable', 'reportUnavailable'].includes(state)) state = 'ready';
      render();
    }

    function refreshOfflineStatus(event) {
      refreshVoices();
      const pack = event?.detail;
      if (sessionKind !== 'report' || pack?.locale !== locale) return;
      const state = pack.ready || currentVoice() ? 'ready' : pack.state === 'downloading' ? 'downloading' :
        pack.state === 'error' ? 'error' : pack.state === 'unsupported' ? 'unsupported' : 'missing';
      reportVoice(state, pack);
    }

    function beginTalking() {
      clearTimeout(startTimer);
      startTimer = null;
      state = 'speaking';
      face.dataset.speaking = 'true';
      expressionStep = 0;
      automaticExpression('happy');
      clearTimeout(expressionTimer);
      const sequence = ['happy', 'calm', 'thinking', 'happy'];
      const nextExpression = () => {
        if (!active() || state !== 'speaking') return;
        if (!preferences.autoExpressions || root.dataset.wfMotion === 'reduced' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
        automaticExpression(sequence[++expressionStep % sequence.length]);
        expressionTimer = setTimeout(nextExpression, 3200);
      };
      expressionTimer = setTimeout(nextExpression, 3200);
      render();
      reportPlayback('speaking');
    }

    function playRecording(url) {
      let request;
      try { request = new window.Audio(url); }
      catch (_) {
        if (!speakIdentityFallback()) { state = 'failed'; render(); }
        return;
      }
      let started = false;
      recording = request;
      state = 'preparing';
      automaticExpression('thinking');
      render();
      announceActivity(true);
      const failed = () => {
        if (recording !== request) return;
        // Recover only before audible playback. Never replay a partially spoken identity.
        const canFallback = !started && visible() && (offlineReady() || currentVoice()) &&
          !(synth?.speaking || synth?.pending || synth?.paused);
        if (canFallback) {
          recording = null;
          clearTimeout(startTimer); startTimer = null;
          releaseRecording(request);
          speakIdentityFallback(true);
        } else finish('failed', true);
      };
      const waiting = () => {
        if (recording !== request) return;
        face.dataset.speaking = 'false';
        state = 'preparing';
        clearTimeout(expressionTimer); expressionTimer = null;
        automaticExpression('thinking');
        render();
        clearTimeout(startTimer);
        startTimer = setTimeout(() => {
          if (recording === request && state === 'preparing') failed();
        }, 8000);
      };
      request.onplaying = () => {
        if (recording !== request) return;
        if (!visible()) { finish('ready', true); return; }
        started = true;
        beginTalking();
      };
      request.onwaiting = waiting;
      request.onpause = waiting;
      request.onended = () => { if (recording === request) finish(); };
      request.onerror = failed;
      waiting();
      try {
        const playing = request.play();
        playing?.catch(failed);
      } catch (_) { failed(); }
    }

    function speakIdentityFallback(alreadyActive = false) {
      if (offlineReady()) { speakOffline(messages[locale].greeting, alreadyActive); return true; }
      const voice = currentVoice();
      if (voice) { speakText(messages[locale].greeting, voice, alreadyActive); return true; }
      return false;
    }

    function toggleSpeech(event) {
      event.stopPropagation();
      if (!event.isTrusted) return;
      if (active()) { finish('stopped', true); return; }
      if ((!supported && !recordingURL() && !offlineReady()) || !visible()) return;
      refreshVoices();
      // Do not interrupt speech owned by another part of the page.
      if (synth?.speaking || synth?.pending || synth?.paused) { state = 'busy'; render(); return; }
      sessionKind = 'intro';
      // Invoke play synchronously in the trusted click; downloaded packs are for dynamic text.
      const url = recordingURL();
      if (url) { playRecording(url); return; }
      if (!speakIdentityFallback()) { state = 'unavailable'; render(); }
    }

    function speakOffline(text, alreadyActive = false, chunks, playback) {
      const request = {handle: null, started: false};
      offlineRequest = request;
      state = 'preparing';
      automaticExpression('thinking');
      render();
      if (!alreadyActive) announceActivity(true);
      startTimer = setTimeout(() => {
        if (offlineRequest === request && state === 'preparing') finish('failed', true);
      }, 45000);
      try {
        request.handle = window.WFOfflineVoice.speak({text, locale, chunks, playback,
          rate: sessionKind === 'report' && locale === 'ar' ? 1.12 : 1,
          onStart() {
            if (offlineRequest !== request) return;
            if (!visible()) { finish('ready', true); return; }
            request.started = true;
            beginTalking();
          },
          onWaiting() {
            if (offlineRequest !== request) return;
            face.dataset.speaking = 'false';
            state = 'preparing';
            clearTimeout(expressionTimer); expressionTimer = null;
            clearTimeout(startTimer);
            startTimer = setTimeout(() => {
              if (offlineRequest === request && state === 'preparing') finish('failed', true);
            }, 45000);
            automaticExpression('thinking'); render(); reportPlayback('preparing');
          },
          onBoundary(boundary) {
            if (offlineRequest !== request || sessionKind !== 'report') return;
            const charIndex = Math.max(0, Math.min(text.length, Number(boundary?.charIndex) || 0));
            const charLength = Math.max(0, Math.min(text.length - charIndex, Number(boundary?.charLength) || 0));
            reportEvent('wf-robot-report-boundary', {charIndex, charLength});
          },
          onEnd() { if (offlineRequest === request) finish(); },
          onError() {
            if (offlineRequest !== request) return;
            // A ready local system voice can recover a pack failure before audio starts.
            const fallback = currentVoice();
            if (!request.started && state === 'preparing' && fallback) {
              offlineRequest = null; clearTimeout(startTimer); startTimer = null;
              request.handle?.cancel(); speakText(text, fallback, true);
            } else finish('failed', true);
          },
        });
        if (offlineRequest !== request) request.handle?.cancel();
      } catch (_) {
        if (offlineRequest !== request) return;
        const fallback = currentVoice();
        if (!request.started && state === 'preparing' && fallback) {
          offlineRequest = null; clearTimeout(startTimer); startTimer = null;
          request.handle?.cancel(); speakText(text, fallback, true);
        } else finish('failed', true);
      }
    }

    function speakText(text, voice, alreadyActive = false) {
      const request = new window.SpeechSynthesisUtterance(text);
      request.voice = voice;
      request.lang = voice.lang;
      request.rate = locale === 'ar' ? (sessionKind === 'report' ? 1.05 : 0.94) : 1;
      request.pitch = 1.02;
      request.volume = 1;
      utterance = request;
      state = 'preparing';
      automaticExpression('thinking');
      render();
      // Pause the carousel while queued; mouth animation begins only when audio starts.
      if (!alreadyActive) announceActivity(true);
      request.onstart = () => {
        if (utterance !== request) return;
        if (!visible()) { finish('ready', true); return; }
        beginTalking();
      };
      request.onend = () => { if (utterance === request) finish(); };
      request.onboundary = event => {
        if (utterance === request && sessionKind === 'report') {
          reportEvent('wf-robot-report-boundary', {
            charIndex: Number.isFinite(event.charIndex) ? event.charIndex : 0,
            charLength: Number.isFinite(event.charLength) ? event.charLength : 0,
          });
        }
        if (utterance !== request || state !== 'speaking' || event.name === 'sentence') return;
        face.dataset.speechBeat = 'true';
        clearTimeout(beatTimer);
        beatTimer = setTimeout(() => {
          if (utterance === request) face.dataset.speechBeat = 'false';
        }, 180);
      };
      request.onerror = event => {
        if (utterance !== request) return;
        finish(event.error === 'canceled' || event.error === 'interrupted' ? 'stopped' : 'failed');
      };
      startTimer = setTimeout(() => {
        if (utterance === request && state === 'preparing') finish('failed', true);
      }, 8000);
      try { synth.speak(request); } catch (_) { finish('failed', true); }
    }

    async function toggleReport(event) {
      event.stopPropagation();
      if (active()) { if (sessionKind === 'report') finish('stopped', true); return; }
      if (!visible()) return;
      refreshVoices();
      const token = {controller: null, playback: null};
      // Prime audio in the click itself, before reading records or downloading a pack.
      try { token.playback = window.WFOfflineVoice?.preparePlayback?.(); } catch (_) {}
      reportRequest = token;
      sessionKind = 'report';
      state = 'preparing';
      automaticExpression('thinking');
      render();
      announceActivity(true);
      reportPlayback('preparing');
      startTimer = setTimeout(() => {
        if (reportRequest === token) finish('reportEmpty');
      }, 8000);
      let snapshot;
      try { snapshot = await window.wfBusinessOverviewSnapshot?.({locale}); } catch (_) { /* A failed report never starts speech. */ }
      if (reportRequest !== token) return;
      if (!visible()) { finish('ready', true); return; }
      reportEvent('wf-robot-report-open', {snapshot: snapshot || {narration: '', unavailableReason: messages[locale].reportEmpty}, locale});
      if (reportRequest !== token) return;
      const narration = typeof snapshot?.narration === 'string' ? snapshot.narration.trim() : '';
      if (!narration) { finish('reportEmpty'); return; }
      const voice = currentVoice();
      if (!voice && !offlineReady()) {
        clearTimeout(startTimer); startTimer = null;
        const pack = voicePackState();
        if (pack.state === 'unsupported' || typeof window.WFOfflineVoice?.download !== 'function') {
          reportVoice('unsupported', pack); finish('reportUnavailable'); return;
        }
        if (!event.install) { reportVoice(pack.state === 'downloading' ? 'downloading' : 'missing', pack); finish('reportUnavailable'); return; }
        token.controller = new AbortController();
        reportVoice('downloading', pack);
        try {
          await window.WFOfflineVoice.download(locale, {signal: token.controller.signal,
            onProgress(value) { if (reportRequest === token) reportVoice('downloading', value); }});
        } catch (problem) {
          if (reportRequest !== token) return;
          reportVoice(problem?.name === 'AbortError' ? 'missing' : 'error', voicePackState());
          finish('reportUnavailable'); return;
        }
        if (reportRequest !== token) return;
        if (!visible()) { finish('ready', true); return; }
      }
      if (synth?.speaking || synth?.pending || synth?.paused) { finish('failed'); return; }
      let chunks;
      const pack = window.WFOfflineVoice?.list?.().find(item => item.locale === locale);
      if (offlineReady() && pack?.engine === 'nabra') {
        try { chunks = window.WFArabicReportSpeech.prepare(snapshot); }
        catch (_) {
          // Unknown or incomplete report text must never be guessed by a speech template.
          if (!voice) { reportVoice('unsupported', {...voicePackState(), reason: 'report-text-unsupported'}); finish('reportEmpty'); return; }
        }
      }
      clearTimeout(startTimer);
      startTimer = null;
      reportRequest = null;
      reportVoice('ready');
      if (offlineReady() && (pack?.engine !== 'nabra' || chunks)) speakOffline(narration, true, chunks, token.playback);
      else { token.playback?.dispose(); speakText(narration, voice, true); }
    }

    function reportControl(event) {
      if (event.detail?.action === 'stop' || event.detail?.action === 'cancel-download') {
        if (active() && sessionKind === 'report') finish('stopped', true);
        if (event.detail?.action === 'cancel-download') { window.WFOfflineVoice?.cancelDownload?.(locale); reportVoice('missing'); }
      } else if (event.detail?.action === 'replay' || event.detail?.action === 'install') {
        if (active()) finish('stopped', true);
        toggleReport({stopPropagation() {}, install: event.detail.action === 'install'});
      }
    }

    function checkVisibility() {
      if (active() && !visible()) finish('ready', true);
      applyMotion();
    }

    function syncLanguage() {
      const next = language();
      if (next === locale) return;
      if (active()) finish('ready', true);
      locale = next;
      state = 'ready';
      refreshVoices();
    }

    function handlePageHide(event) {
      if (active()) finish('ready', true);
      if (!event.persisted) destroy();
    }

    function destroy() {
      if (disposed) return;
      if (active()) finish('ready', true);
      disposed = true;
      visibilityObserver.disconnect();
      languageObserver.disconnect();
      speakButton.removeEventListener('click', toggleSpeech);
      reportButton?.removeEventListener('click', toggleReport);
      document.removeEventListener('visibilitychange', checkVisibility);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('wf-robot-preferences', applyPreferences);
      window.removeEventListener('wf-robot-motion', applyMotion);
      window.removeEventListener('wf-robot-report-control', reportControl);
      window.removeEventListener('wf-offline-voice-change', refreshOfflineStatus);
      synth?.removeEventListener?.('voiceschanged', refreshVoices);
    }

    const visibilityObserver = new MutationObserver(checkVisibility);
    visibilityObserver.observe(face, {attributes: true, attributeFilter: ['aria-hidden']});
    if (dashboard) visibilityObserver.observe(dashboard, {attributes: true, attributeFilter: ['class']});
    const languageObserver = new MutationObserver(syncLanguage);
    languageObserver.observe(root, {attributes: true, attributeFilter: ['lang']});
    speakButton.addEventListener('click', toggleSpeech);
    reportButton?.addEventListener('click', toggleReport);
    document.addEventListener('visibilitychange', checkVisibility);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('wf-robot-preferences', applyPreferences);
    window.addEventListener('wf-robot-motion', applyMotion);
    window.addEventListener('wf-robot-report-control', reportControl);
    window.addEventListener('wf-offline-voice-change', refreshOfflineStatus);
    synth?.addEventListener?.('voiceschanged', refreshVoices);
    applyPreferences();
    refreshVoices();
    window.dispatchEvent(new CustomEvent('wf-robot-ready'));
    return {element: face, destroy};
  }

  // Runs synchronously in this deferred script so the carousel discovers all five faces.
  mountRobotFace(track);
})();
