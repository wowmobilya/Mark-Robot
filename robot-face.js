/* WOW's compact, optional speaking face. No microphone or application data is used. */
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
      speak: 'اسمعني', stop: 'إيقاف', expression: 'تغيير تعبير الوجه',
      report: 'اسمع التقرير اليومي', reportUnavailable: 'التقرير يحتاج صوتًا عربيًا مثبتًا يعمل دون اتصال',
      reportEmpty: 'بيانات التقرير اليومي غير متاحة الآن',
      calm: 'هادئ', happy: 'سعيد', thinking: 'يفكّر', surprised: 'متفاجئ',
      audioURL: '', // Optional bundled recording; never use a remote speech service.
      greeting: 'مرحبًا سيد أحمد. أنا مساعدك الذكي إنفنتي روبوت، وأنا هنا من أجل تنظيم سير العمل. وأنا من تصميم المهندس معتز بالله حاج شعبان، مطوّري ومبرمجي. وشكرًا لك.',
    },
    tr: {
      title: 'Infinity Robot', ready: 'Bir dokunuşla ses ve ifade', speaking: 'Konuşuyorum…',
      preparing: 'Ses başlatılıyor…', stopped: 'Ses durduruldu',
      unsupported: 'Bu tarayıcı sesi desteklemiyor', unavailable: 'Cihazınızda çevrimdışı Türkçe ses yok',
      failed: 'Ses başlatılamadı, tekrar deneyin', busy: 'Ses meşgul, biraz sonra deneyin',
      speak: 'Dinle', stop: 'Durdur', expression: 'Yüz ifadesini değiştir',
      report: 'Günlük raporu dinle', reportUnavailable: 'Rapor için cihazda çevrimdışı Türkçe ses gerekir',
      reportEmpty: 'Günlük rapor verileri şu anda kullanılamıyor',
      calm: 'Sakin', happy: 'Mutlu', thinking: 'Düşünceli', surprised: 'Şaşkın',
      audioURL: '', // Optional bundled recording; never use a remote speech service.
      greeting: 'Merhaba Ahmet Bey. Ben akıllı asistanınız Infinity Robot. İş akışını düzenlemek için buradayım. Beni geliştiren ve programlayan mühendis Moataz Bellah Haj Shaaban tarafından tasarlandım. Teşekkür ederim.',
    },
    en: {
      title: 'Infinity Robot', ready: 'A voice and a smile, on tap', speaking: 'Speaking…',
      preparing: 'Starting voice…', stopped: 'Voice stopped',
      unsupported: 'Voice is unsupported in this browser', unavailable: 'No offline English voice on this device',
      failed: 'Voice could not start. Please retry', busy: 'Voice is busy. Please try shortly',
      speak: 'Listen', stop: 'Stop', expression: 'Change facial expression',
      report: 'Daily report', reportUnavailable: 'The report needs an installed offline English voice',
      reportEmpty: 'Daily report data is unavailable right now',
      calm: 'Calm', happy: 'Happy', thinking: 'Thinking', surprised: 'Surprised',
      audioURL: '', // Optional bundled recording; never use a remote speech service.
      greeting: 'Hello, Mr. Ahmed. I am your smart assistant, Infinity Robot, and I am here to organize the workflow. I was designed by engineer Moataz Bellah Haj Shaaban, my developer and programmer. Thank you.',
    },
    fr: {
      title: 'Infinity Robot', ready: 'Une voix et un sourire au toucher', speaking: 'Je parle…',
      preparing: 'Démarrage de la voix…', stopped: 'Voix arrêtée',
      unsupported: 'Ce navigateur ne prend pas la voix en charge', unavailable: 'Aucune voix française hors ligne disponible',
      failed: 'La voix ne démarre pas. Réessayez', busy: 'La voix est occupée. Réessayez bientôt',
      speak: 'Écouter', stop: 'Arrêter', expression: 'Changer l’expression du visage',
      report: 'Rapport du jour', reportUnavailable: 'Le rapport nécessite une voix française hors ligne installée',
      reportEmpty: 'Le rapport du jour est indisponible pour le moment',
      calm: 'Calme', happy: 'Heureux', thinking: 'Pensif', surprised: 'Surpris',
      audioURL: '', // Optional bundled recording; never use a remote speech service.
      greeting: 'Bonjour, Monsieur Ahmed. Je suis votre assistant intelligent, Infinity Robot, et je suis ici pour organiser le déroulement du travail. J’ai été conçu par l’ingénieur Moataz Bellah Haj Shaaban, mon développeur et programmeur. Merci à vous.',
    },
    ru: {
      title: 'Робот Infinity', ready: 'Голос и улыбка по касанию', speaking: 'Говорю…',
      preparing: 'Запускаю голос…', stopped: 'Голос остановлен',
      unsupported: 'Этот браузер не поддерживает голос', unavailable: 'Нет русского голоса для работы без сети',
      failed: 'Не удалось включить голос. Повторите', busy: 'Голос занят. Повторите чуть позже',
      speak: 'Слушать', stop: 'Стоп', expression: 'Изменить выражение лица',
      report: 'Отчёт за день', reportUnavailable: 'Для отчёта нужен установленный русский голос без сети',
      reportEmpty: 'Данные дневного отчёта сейчас недоступны',
      calm: 'Спокойно', happy: 'Радостно', thinking: 'Думаю', surprised: 'Удивлён',
      audioURL: '', // Optional bundled recording; never use a remote speech service.
      greeting: 'Здравствуйте, господин Ахмед. Я ваш умный помощник, робот Infinity, и я здесь, чтобы организовать рабочий процесс. Меня создал инженер Моатаз Беллах Хадж Шаабан, мой разработчик и программист. Спасибо вам.',
    },
  };
  const expressions = ['calm', 'happy', 'thinking', 'surprised'];
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
        <button type="button" class="wf-robot-button wf-robot-expression">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="4" width="18" height="16" rx="6"/><path d="M 8 9 V 11 M 16 9 V 11 M 8 15 Q 12 18 16 15"/></svg>
          <span></span>
        </button>
      </div>`;
    container.append(face);

    const title = face.querySelector('#wfRobotTitle span');
    const status = face.querySelector('.wf-robot-status');
    const speakButton = face.querySelector('.wf-robot-speak');
    const reportButton = face.querySelector('.wf-robot-report');
    const expressionButton = face.querySelector('.wf-robot-expression');
    const mouth = face.querySelector('.wf-robot-mouth');
    const synth = window.speechSynthesis;
    const supported = !!synth && typeof synth.speak === 'function' && typeof synth.cancel === 'function' &&
      typeof synth.getVoices === 'function' && typeof window.SpeechSynthesisUtterance === 'function';
    let locale = language();
    let selectedExpression = 'calm';
    let state = 'ready';
    let utterance = null;
    let recording = null;
    let reportRequest = null;
    let sessionKind = 'intro';
    let startTimer = null;
    let beatTimer = null;
    let expressionTimer = null;
    let expressionStep = 0;
    let voices = [];
    let disposed = false;

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
        /^\.?\/?audio\/[a-zA-Z0-9_./-]+$/.test(value) && !value.includes('..') ? value : '';
    }

    function active() { return !!utterance || !!recording || !!reportRequest; }

    function visible() {
      return !disposed && face.isConnected && !document.hidden &&
        face.getAttribute('aria-hidden') === 'false' && !!dashboard?.classList.contains('active');
    }

    function setExpression(expression) {
      face.dataset.expression = expression;
      mouth.setAttribute('d', mouthShapes[expression]);
    }

    function render() {
      const copy = messages[locale];
      title.textContent = copy.title;
      const statusKey = state === 'ready' && !supported && !recordingURL() ? 'unsupported' :
        state === 'ready' && !currentVoice() && !recordingURL() ? 'unavailable' : state;
      status.textContent = copy[statusKey];
      status.title = copy[statusKey];
      const introActive = active() && sessionKind === 'intro';
      const reportActive = active() && sessionKind === 'report';
      speakButton.querySelector('span').textContent = copy[introActive ? 'stop' : 'speak'];
      speakButton.setAttribute('aria-label', copy[introActive ? 'stop' : 'speak']);
      speakButton.setAttribute('aria-pressed', String(introActive));
      speakButton.disabled = (!supported && !recordingURL()) || reportActive;
      if (reportButton) {
        reportButton.querySelector('span').textContent = copy[reportActive ? 'stop' : 'report'];
        reportButton.setAttribute('aria-label', copy[reportActive ? 'stop' : 'report']);
        reportButton.setAttribute('aria-pressed', String(reportActive));
        reportButton.title = copy[reportActive ? 'stop' : 'report'];
        reportButton.disabled = introActive;
      }
      face.dataset.voiceActive = String(active());
      face.dataset.voiceKind = sessionKind;
      expressionButton.querySelector('span').textContent = copy[selectedExpression];
      expressionButton.setAttribute('aria-label', `${copy.expression}: ${copy[selectedExpression]}`);
      expressionButton.title = copy.expression;
    }

    function announceActivity(active) {
      face.dispatchEvent(new CustomEvent('wf-robot-speaking', {bubbles: true, detail: {active}}));
    }

    function finish(nextState = 'ready', cancel = false) {
      const wasActive = active();
      const ownedSpeech = !!utterance;
      const oldRecording = recording;
      // Invalidate callbacks before cancel() because some engines dispatch synchronously.
      utterance = null;
      recording = null;
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
      setExpression(selectedExpression);
      if (oldRecording) {
        oldRecording.onplaying = oldRecording.onwaiting = oldRecording.onended = oldRecording.onerror = null;
        oldRecording.pause();
        oldRecording.removeAttribute('src');
        oldRecording.load();
      }
      if (cancel && ownedSpeech) {
        try { synth.cancel(); } catch (_) { /* The visible state still returns to idle. */ }
      }
      render();
      if (wasActive) announceActivity(false);
    }

    function refreshVoices() {
      if (disposed) return;
      try { voices = supported ? synth.getVoices() : []; } catch (_) { voices = []; }
      if (!active() && (currentVoice() || recordingURL()) && state === 'unavailable') state = 'ready';
      render();
    }

    function beginTalking() {
      clearTimeout(startTimer);
      startTimer = null;
      state = 'speaking';
      face.dataset.speaking = 'true';
      expressionStep = 0;
      setExpression('happy');
      clearTimeout(expressionTimer);
      const sequence = ['happy', 'calm', 'thinking', 'happy'];
      const nextExpression = () => {
        if (!active() || state !== 'speaking') return;
        if (root.dataset.wfMotion === 'reduced' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
        setExpression(sequence[++expressionStep % sequence.length]);
        expressionTimer = setTimeout(nextExpression, 3200);
      };
      expressionTimer = setTimeout(nextExpression, 3200);
      render();
    }

    function playRecording(url) {
      const request = new window.Audio(url);
      recording = request;
      state = 'preparing';
      setExpression('thinking');
      render();
      announceActivity(true);
      const waiting = () => {
        if (recording !== request) return;
        face.dataset.speaking = 'false';
        state = 'preparing';
        render();
        clearTimeout(startTimer);
        startTimer = setTimeout(() => {
          if (recording === request && state === 'preparing') finish('failed', true);
        }, 8000);
      };
      request.onplaying = () => {
        if (recording !== request) return;
        if (!visible()) { finish('ready', true); return; }
        beginTalking();
      };
      request.onwaiting = waiting;
      request.onended = () => { if (recording === request) finish(); };
      request.onerror = () => { if (recording === request) finish('failed', true); };
      waiting();
      try {
        const playing = request.play();
        playing?.catch(() => { if (recording === request) finish('failed', true); });
      } catch (_) { finish('failed', true); }
    }

    function toggleSpeech(event) {
      event.stopPropagation();
      if (active()) { finish('stopped', true); return; }
      if ((!supported && !recordingURL()) || !visible()) return;
      refreshVoices();
      const voice = currentVoice();
      // Do not interrupt speech owned by another part of the page.
      if (synth?.speaking || synth?.pending || synth?.paused) { state = 'busy'; render(); return; }
      if (!voice) {
        const url = recordingURL();
        if (url) { sessionKind = 'intro'; playRecording(url); return; }
        state = 'unavailable'; render(); return;
      }

      sessionKind = 'intro';
      speakText(messages[locale].greeting, voice);
    }

    function speakText(text, voice, alreadyActive = false) {
      const request = new window.SpeechSynthesisUtterance(text);
      request.voice = voice;
      request.lang = voice.lang;
      request.rate = locale === 'ar' ? 0.94 : 1;
      request.pitch = 1.02;
      request.volume = 1;
      utterance = request;
      state = 'preparing';
      setExpression('thinking');
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
      const voice = currentVoice();
      if (!voice) { state = 'reportUnavailable'; render(); return; }
      if (synth?.speaking || synth?.pending || synth?.paused) { state = 'busy'; render(); return; }
      const token = {};
      reportRequest = token;
      sessionKind = 'report';
      state = 'preparing';
      setExpression('thinking');
      render();
      announceActivity(true);
      startTimer = setTimeout(() => {
        if (reportRequest === token) finish('reportEmpty');
      }, 8000);
      let snapshot;
      try { snapshot = await window.wfBusinessOverviewSnapshot?.({locale}); } catch (_) { /* A failed report never starts speech. */ }
      if (reportRequest !== token) return;
      if (!visible()) { finish('ready', true); return; }
      const narration = typeof snapshot?.narration === 'string' ? snapshot.narration.trim() : '';
      if (!narration) { finish('reportEmpty'); return; }
      clearTimeout(startTimer);
      startTimer = null;
      reportRequest = null;
      speakText(narration, voice, true);
    }

    function changeExpression(event) {
      event.stopPropagation();
      selectedExpression = expressions[(expressions.indexOf(selectedExpression) + 1) % expressions.length];
      setExpression(selectedExpression);
      render();
    }

    function checkVisibility() {
      if (active() && !visible()) finish('ready', true);
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
      expressionButton.removeEventListener('click', changeExpression);
      document.removeEventListener('visibilitychange', checkVisibility);
      window.removeEventListener('pagehide', handlePageHide);
      synth?.removeEventListener?.('voiceschanged', refreshVoices);
    }

    const visibilityObserver = new MutationObserver(checkVisibility);
    visibilityObserver.observe(face, {attributes: true, attributeFilter: ['aria-hidden']});
    if (dashboard) visibilityObserver.observe(dashboard, {attributes: true, attributeFilter: ['class']});
    const languageObserver = new MutationObserver(syncLanguage);
    languageObserver.observe(root, {attributes: true, attributeFilter: ['lang']});
    speakButton.addEventListener('click', toggleSpeech);
    reportButton?.addEventListener('click', toggleReport);
    expressionButton.addEventListener('click', changeExpression);
    document.addEventListener('visibilitychange', checkVisibility);
    window.addEventListener('pagehide', handlePageHide);
    synth?.addEventListener?.('voiceschanged', refreshVoices);
    refreshVoices();
    return {element: face, destroy};
  }

  // Runs synchronously in this deferred script so the carousel discovers all five faces.
  mountRobotFace(track);
})();
