/* WOW's compact, optional speaking face. No microphone or application data is used. */
(() => {
  'use strict';

  const track = document.querySelector('.wf-greeting-faces');
  if (!track || document.getElementById('wfGreetingRobot')) return;

  const messages = {
    ar: {
      title: 'مساعد WOW', ready: 'صوت وتعبيرات بلمسة منك', speaking: 'أتحدث إليك…',
      preparing: 'جارٍ تشغيل الصوت…', stopped: 'تم إيقاف الصوت',
      unsupported: 'الصوت غير مدعوم في هذا المتصفح', unavailable: 'لا يتوفر صوت عربي على جهازك',
      failed: 'تعذّر تشغيل الصوت، حاول مجددًا', busy: 'الصوت مشغول الآن، حاول بعد قليل',
      speak: 'اسمعني', stop: 'إيقاف', expression: 'تغيير تعبير الوجه',
      calm: 'هادئ', happy: 'سعيد', thinking: 'يفكّر', surprised: 'متفاجئ',
      greeting: 'مرحبًا بك في واو موبيليا. أنا وجه واو التفاعلي. من هنا يمكنك متابعة عملك، والانتقال إلى العملاء والمنتجات والفواتير. أتمنى لك يومًا جميلًا.',
    },
    tr: {
      title: 'WOW Asistanı', ready: 'Bir dokunuşla ses ve ifade', speaking: 'Konuşuyorum…',
      preparing: 'Ses başlatılıyor…', stopped: 'Ses durduruldu',
      unsupported: 'Bu tarayıcı sesi desteklemiyor', unavailable: 'Cihazınızda Türkçe ses yok',
      failed: 'Ses başlatılamadı, tekrar deneyin', busy: 'Ses meşgul, biraz sonra deneyin',
      speak: 'Dinle', stop: 'Durdur', expression: 'Yüz ifadesini değiştir',
      calm: 'Sakin', happy: 'Mutlu', thinking: 'Düşünceli', surprised: 'Şaşkın',
      greeting: 'WOW Mobilya’ya hoş geldiniz. Ben WOW’un etkileşimli yüzüyüm. Buradan işlerinizi takip edebilir, müşterilere, ürünlere ve faturalara geçebilirsiniz. Size güzel bir gün dilerim.',
    },
    en: {
      title: 'WOW Assistant', ready: 'A voice and a smile, on tap', speaking: 'Speaking…',
      preparing: 'Starting voice…', stopped: 'Voice stopped',
      unsupported: 'Voice is unsupported in this browser', unavailable: 'No English voice on this device',
      failed: 'Voice could not start. Please retry', busy: 'Voice is busy. Please try shortly',
      speak: 'Listen', stop: 'Stop', expression: 'Change facial expression',
      calm: 'Calm', happy: 'Happy', thinking: 'Thinking', surprised: 'Surprised',
      greeting: 'Welcome to WOW Furniture. I am WOW’s interactive face. From here you can follow your work and open customers, products and invoices. Have a lovely day.',
    },
    fr: {
      title: 'Assistant WOW', ready: 'Une voix et un sourire au toucher', speaking: 'Je parle…',
      preparing: 'Démarrage de la voix…', stopped: 'Voix arrêtée',
      unsupported: 'Ce navigateur ne prend pas la voix en charge', unavailable: 'Aucune voix française sur cet appareil',
      failed: 'La voix ne démarre pas. Réessayez', busy: 'La voix est occupée. Réessayez bientôt',
      speak: 'Écouter', stop: 'Arrêter', expression: 'Changer l’expression du visage',
      calm: 'Calme', happy: 'Heureux', thinking: 'Pensif', surprised: 'Surpris',
      greeting: 'Bienvenue chez WOW Furniture. Je suis le visage interactif de WOW. Ici, vous pouvez suivre votre activité et accéder aux clients, aux produits et aux factures. Je vous souhaite une belle journée.',
    },
    ru: {
      title: 'Помощник WOW', ready: 'Голос и улыбка по касанию', speaking: 'Говорю…',
      preparing: 'Запускаю голос…', stopped: 'Голос остановлен',
      unsupported: 'Этот браузер не поддерживает голос', unavailable: 'На устройстве нет русского голоса',
      failed: 'Не удалось включить голос. Повторите', busy: 'Голос занят. Повторите чуть позже',
      speak: 'Слушать', stop: 'Стоп', expression: 'Изменить выражение лица',
      calm: 'Спокойно', happy: 'Радостно', thinking: 'Думаю', surprised: 'Удивлён',
      greeting: 'Добро пожаловать в WOW Furniture. Я интерактивное лицо WOW. Здесь можно следить за работой и открывать разделы клиентов, товаров и счетов. Желаю вам хорошего дня.',
    },
  };
  const expressions = ['calm', 'happy', 'thinking', 'surprised'];
  const mouthShapes = {
    calm: 'M 110 65 Q 120 69 130 65',
    happy: 'M 108 62 Q 120 77 132 62',
    thinking: 'M 113 67 Q 121 63 129 65',
    surprised: 'M 125 66 A 5 6 0 1 1 115 66 A 5 6 0 1 1 125 66',
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
        <svg class="wf-robot-face" viewBox="0 0 240 86" focusable="false">
          <g class="wf-robot-gaze">
            <g class="wf-robot-eye wf-robot-eye-left" transform="translate(69 35)">
              <g class="wf-robot-blink">
                <rect class="wf-robot-eye-open" x="-22" y="-17" width="44" height="34" rx="14"/>
                <path class="wf-robot-eye-happy" d="M -19 5 Q 0 -17 19 5"/>
                <path class="wf-robot-glint" d="M -11 -8 H -5"/>
              </g>
            </g>
            <g class="wf-robot-eye wf-robot-eye-right" transform="translate(171 35)">
              <g class="wf-robot-blink">
                <rect class="wf-robot-eye-open" x="-22" y="-17" width="44" height="34" rx="14"/>
                <path class="wf-robot-eye-happy" d="M -19 5 Q 0 -17 19 5"/>
                <path class="wf-robot-glint" d="M -11 -8 H -5"/>
              </g>
            </g>
            <path class="wf-robot-mouth" d="${mouthShapes.calm}"/>
            <g class="wf-robot-voice-bars">
              <rect x="105" y="61" width="4" height="10" rx="2"/>
              <rect x="112" y="59" width="4" height="14" rx="2"/>
              <rect x="119" y="57" width="4" height="18" rx="2"/>
              <rect x="126" y="60" width="4" height="12" rx="2"/>
              <rect x="133" y="62" width="4" height="8" rx="2"/>
            </g>
          </g>
        </svg>
      </div>
      <div class="wf-robot-actions">
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
    const expressionButton = face.querySelector('.wf-robot-expression');
    const mouth = face.querySelector('.wf-robot-mouth');
    const synth = window.speechSynthesis;
    const supported = !!synth && typeof synth.speak === 'function' && typeof synth.cancel === 'function' &&
      typeof synth.getVoices === 'function' && typeof window.SpeechSynthesisUtterance === 'function';
    let locale = language();
    let selectedExpression = 'calm';
    let state = 'ready';
    let utterance = null;
    let startTimer = null;
    let voices = [];
    let disposed = false;

    function language() {
      const lang = (root.lang || 'ar').toLowerCase().split(/[-_]/)[0];
      return Object.prototype.hasOwnProperty.call(messages, lang) ? lang : 'en';
    }

    function currentVoice() {
      // Use the browser's matching-language voice, preferring installed voices when available.
      const matching = voices.filter(voice => String(voice.lang || '').toLowerCase().split(/[-_]/)[0] === locale);
      const local = matching.filter(voice => voice.localService);
      return local.find(voice => voice.default) || local[0] || matching.find(voice => voice.default) || matching[0] || null;
    }

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
      const statusKey = !supported ? 'unsupported' : state === 'ready' && !currentVoice() ? 'unavailable' : state;
      status.textContent = copy[statusKey];
      status.title = copy[statusKey];
      speakButton.querySelector('span').textContent = copy[utterance ? 'stop' : 'speak'];
      speakButton.setAttribute('aria-label', copy[utterance ? 'stop' : 'speak']);
      speakButton.setAttribute('aria-pressed', String(!!utterance));
      speakButton.disabled = !supported;
      face.dataset.voiceActive = String(!!utterance);
      expressionButton.querySelector('span').textContent = copy[selectedExpression];
      expressionButton.setAttribute('aria-label', `${copy.expression}: ${copy[selectedExpression]}`);
      expressionButton.title = copy.expression;
    }

    function announceActivity(active) {
      face.dispatchEvent(new CustomEvent('wf-robot-speaking', {bubbles: true, detail: {active}}));
    }

    function finish(nextState = 'ready', cancel = false) {
      const wasActive = !!utterance;
      // Invalidate callbacks before cancel() because some engines dispatch synchronously.
      utterance = null;
      clearTimeout(startTimer);
      startTimer = null;
      face.dataset.speaking = 'false';
      state = nextState;
      setExpression(selectedExpression);
      if (cancel && wasActive) {
        try { synth.cancel(); } catch (_) { /* The visible state still returns to idle. */ }
      }
      render();
      if (wasActive) announceActivity(false);
    }

    function refreshVoices() {
      if (disposed) return;
      try { voices = supported ? synth.getVoices() : []; } catch (_) { voices = []; }
      if (!utterance && currentVoice() && state === 'unavailable') state = 'ready';
      render();
    }

    function toggleSpeech(event) {
      event.stopPropagation();
      if (utterance) { finish('stopped', true); return; }
      if (!supported || !visible()) return;
      refreshVoices();
      const voice = currentVoice();
      if (!voice) { state = 'unavailable'; render(); return; }
      // Do not interrupt speech owned by another part of the page.
      if (synth.speaking || synth.pending || synth.paused) { state = 'busy'; render(); return; }

      const request = new window.SpeechSynthesisUtterance(messages[locale].greeting);
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
      announceActivity(true);
      request.onstart = () => {
        if (utterance !== request) return;
        if (!visible()) { finish('ready', true); return; }
        clearTimeout(startTimer);
        startTimer = null;
        state = 'speaking';
        face.dataset.speaking = 'true';
        setExpression('happy');
        render();
      };
      request.onend = () => { if (utterance === request) finish(); };
      request.onerror = event => {
        if (utterance !== request) return;
        finish(event.error === 'canceled' || event.error === 'interrupted' ? 'stopped' : 'failed');
      };
      startTimer = setTimeout(() => {
        if (utterance === request && state === 'preparing') finish('failed', true);
      }, 8000);
      try { synth.speak(request); } catch (_) { finish('failed', true); }
    }

    function changeExpression(event) {
      event.stopPropagation();
      selectedExpression = expressions[(expressions.indexOf(selectedExpression) + 1) % expressions.length];
      setExpression(selectedExpression);
      render();
    }

    function checkVisibility() {
      if (utterance && !visible()) finish('ready', true);
    }

    function syncLanguage() {
      const next = language();
      if (next === locale) return;
      if (utterance) finish('ready', true);
      locale = next;
      state = 'ready';
      refreshVoices();
    }

    function handlePageHide(event) {
      if (utterance) finish('ready', true);
      if (!event.persisted) destroy();
    }

    function destroy() {
      if (disposed) return;
      if (utterance) finish('ready', true);
      disposed = true;
      visibilityObserver.disconnect();
      languageObserver.disconnect();
      speakButton.removeEventListener('click', toggleSpeech);
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
