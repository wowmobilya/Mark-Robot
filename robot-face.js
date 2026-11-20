/* Infinity Robot's optional local speech and read-only daily report. No microphone access. */
(() => {
  'use strict';

  const track = document.querySelector('.wf-greeting-faces');
  if (!track || document.getElementById('wfGreetingRobot')) return;

  const messages = {
    ar: {
      title: 'مارك روبوت', ready: 'صوت وتعبيرات بلمسة منك', speaking: 'أتحدث إليك…',
      preparing: 'جارٍ تشغيل الصوت…', stopped: 'تم إيقاف الصوت',
      unsupported: 'الصوت غير مدعوم في هذا المتصفح', unavailable: 'لا يتوفر صوت عربي دون اتصال على جهازك',
      failed: 'تعذّر تشغيل الصوت، حاول مجددًا', busy: 'الصوت مشغول الآن، حاول بعد قليل',
      speak: 'هوية الروبوت', stop: 'إيقاف',
      report: 'اسمع التقرير اليومي', reportUnavailable: 'التقرير يحتاج صوتًا عربيًا مثبتًا يعمل دون اتصال',
      reportEmpty: 'بيانات التقرير اليومي غير متاحة الآن',
      audioURL: "assets/robot-identity/ar.mp3?v=3",
      greeting: "أهلين أستاذ حَسَن الحِلو. أنا مساعدك الذكي في واو فِرْنِتْشَر. هون لَساعدك بتنظيم الشغل وقراءة التقارير بوضوح. صمّمني وبرمجني المهندس مُعتَز بالله حاج شعبان. أنا جاهز، خلّينا نبلّش.",
    },
    tr: {
      title: 'Mark Robot', ready: 'Bir dokunuşla ses ve ifade', speaking: 'Konuşuyorum…',
      preparing: 'Ses başlatılıyor…', stopped: 'Ses durduruldu',
      unsupported: 'Bu tarayıcı sesi desteklemiyor', unavailable: 'Cihazınızda çevrimdışı Türkçe ses yok',
      failed: 'Ses başlatılamadı, tekrar deneyin', busy: 'Ses meşgul, biraz sonra deneyin',
      speak: 'Robot kimliği', stop: 'Durdur',
      report: 'Günlük raporu dinle', reportUnavailable: 'Rapor için cihazda çevrimdışı Türkçe ses gerekir',
      reportEmpty: 'Günlük rapor verileri şu anda kullanılamıyor',
      audioURL: "assets/robot-identity/tr.mp3?v=2",
      greeting: "Merhaba Hasan El Helo Bey. Ben WOW Furniture’daki akıllı asistanınızım. İşlerinizi düzenlemek ve raporlarınızı açıkça okumak için buradayım. Beni mühendis Moataz Bellah Haj Shaaban tasarladı ve programladı. Hazırım, başlayalım.",
    },
    en: {
      title: 'Mark Robot', ready: 'A voice and a smile, on tap', speaking: 'Speaking…',
      preparing: 'Starting voice…', stopped: 'Voice stopped',
      unsupported: 'Voice is unsupported in this browser', unavailable: 'No offline English voice on this device',
      failed: 'Voice could not start. Please retry', busy: 'Voice is busy. Please try shortly',
      speak: 'Robot identity', stop: 'Stop',
      report: 'Daily report', reportUnavailable: 'The report needs an installed offline English voice',
      reportEmpty: 'Daily report data is unavailable right now',
      audioURL: "assets/robot-identity/en.mp3?v=2",
      greeting: "Hello, Mr. Hassan Al-Hilou. I am your smart assistant at WOW Furniture. I'm here to help organize your work and read your reports clearly. I was designed and programmed by engineer Moataz Bellah Haj Shaaban. I'm ready, let's begin.",
    },
    fr: {
      title: 'Robot Mark', ready: 'Une voix et un sourire au toucher', speaking: 'Je parle…',
      preparing: 'Démarrage de la voix…', stopped: 'Voix arrêtée',
      unsupported: 'Ce navigateur ne prend pas la voix en charge', unavailable: 'Aucune voix française hors ligne disponible',
      failed: 'La voix ne démarre pas. Réessayez', busy: 'La voix est occupée. Réessayez bientôt',
      speak: 'Identité du robot', stop: 'Arrêter',
      report: 'Rapport du jour', reportUnavailable: 'Le rapport nécessite une voix française hors ligne installée',
      reportEmpty: 'Le rapport du jour est indisponible pour le moment',
      audioURL: "assets/robot-identity/fr.mp3?v=2",
      greeting: "Bonjour, Monsieur Hassan Al-Hilou. Je suis votre assistant intelligent de WOW Furniture. Je suis là pour organiser votre travail et lire clairement vos rapports. J’ai été conçu et programmé par l’ingénieur Moataz Bellah Haj Shaaban. Je suis prêt, commençons.",
    },
    ru: {
      title: 'Робот Марк', ready: 'Голос и улыбка по касанию', speaking: 'Говорю…',
      preparing: 'Запускаю голос…', stopped: 'Голос остановлен',
      unsupported: 'Этот браузер не поддерживает голос', unavailable: 'Нет русского голоса для работы без сети',
      failed: 'Не удалось включить голос. Повторите', busy: 'Голос занят. Повторите чуть позже',
      speak: 'О роботе', stop: 'Стоп',
      report: 'Отчёт за день', reportUnavailable: 'Для отчёта нужен установленный русский голос без сети',
      reportEmpty: 'Данные дневного отчёта сейчас недоступны',
      audioURL: "assets/robot-identity/ru.mp3?v=2",
      greeting: "Здравствуйте, господин Хасан Аль-Хилу. Я ваш умный помощник в WOW Furniture. Я помогу организовать работу и ясно прочитать ваши отчёты. Меня создал и запрограммировал инженер Моатаз Беллах Хадж Шаабан. Я готов, давайте начнём.",
    },
  };
  const identityRecordings = new Set(Object.values(messages).map(copy => copy.audioURL));
  const speechLanguages = ['ar', 'en', 'tr', 'fr', 'ru'];
  const speechCopy = {
    openReport: ['فتح التقرير', 'Open report', 'Raporu aç', 'Ouvrir le rapport', 'Открыть отчёт'],
    paused: ['القراءة متوقفة مؤقتًا', 'Reading paused', 'Okuma duraklatıldı', 'Lecture en pause', 'Чтение приостановлено'],
    background: ['أوقف المتصفح الصوت مؤقتًا؛ اضغط استئناف للمتابعة', 'The browser paused audio. Resume to continue', 'Tarayıcı sesi duraklattı. Sürdürerek devam edin', 'Le navigateur a suspendu le son. Reprenez la lecture', 'Браузер приостановил звук. Нажмите «Продолжить»'],
    loading: ['جارٍ تحميل حزمة مارك المحفوظة إلى الذاكرة…', 'Loading the saved Mark pack into memory…', 'Kayıtlı Mark paketi belleğe yükleniyor…', 'Chargement du pack Mark enregistré en mémoire…', 'Загрузка сохранённого пакета голоса «Марк» в память…'],
    initializing: ['جارٍ تهيئة محرك مارك على جهازك…', 'Starting the Mark engine on this device…', 'Mark motoru bu cihazda başlatılıyor…', 'Démarrage du moteur Mark sur cet appareil…', 'Запуск движка голоса «Марк» на устройстве…'],
    generating: ['مارك يجهّز أول مقطع للقراءة…', 'Mark is preparing the next spoken passage…', 'Mark sıradaki sesli bölümü hazırlıyor…', 'Mark prépare le prochain passage audio…', 'Марк готовит следующий фрагмент речи…'],
    streaming: ['وصل الصوت؛ جارٍ بدء القراءة…', 'Audio received. Starting playback…', 'Ses alındı. Oynatma başlatılıyor…', 'Audio reçu. Démarrage de la lecture…', 'Звук получен. Начинается воспроизведение…'],
    unlocking: ['جارٍ تفعيل مخرج الصوت…', 'Activating audio output…', 'Ses çıkışı etkinleştiriliyor…', 'Activation de la sortie audio…', 'Включение аудиовыхода…'],
    blocked: ['المتصفح لم يفعّل الصوت. اضغط زر القراءة مجددًا لتشغيله.', 'The browser did not activate audio. Press Read again.', 'Tarayıcı sesi etkinleştirmedi. Oku düğmesine yeniden basın.', 'Le navigateur n’a pas activé le son. Appuyez de nouveau sur Lire.', 'Браузер не включил звук. Нажмите чтение ещё раз.'],
    interrupted: ['تعذّر استئناف مخرج الصوت. اضغط القراءة مجددًا.', 'Audio output could not resume. Press Read again.', 'Ses çıkışı sürdürülemedi. Oku düğmesine yeniden basın.', 'La sortie audio n’a pas repris. Appuyez de nouveau sur Lire.', 'Не удалось возобновить звук. Нажмите чтение ещё раз.'],
    workerFailed: ['تعذّر بدء مكوّن صوت مارك. الحزمة محفوظة؛ أعد تهيئة الصوت من إعدادات الروبوت.', 'A Mark audio component could not start. The pack is saved; prepare Mark again in Robot settings.', 'Mark ses bileşeni başlatılamadı. Paket kayıtlı; Robot ayarlarından Mark’ı yeniden hazırlayın.', 'Un composant Mark n’a pas démarré. Le pack est enregistré ; relancez Mark dans les réglages du robot.', 'Компонент голоса «Марк» не запустился. Пакет сохранён; повторите подготовку в настройках робота.'],
    timeout: ['لم يستجب محرك مارك في الوقت المحدد. الحزمة محفوظة؛ أعد تهيئته من الإعدادات.', 'Mark did not respond in time. The pack is saved; prepare it again in Settings.', 'Mark zamanında yanıt vermedi. Paket kayıtlı; Ayarlardan yeniden hazırlayın.', 'Mark n’a pas répondu à temps. Le pack est enregistré ; relancez sa préparation.', 'Марк не ответил вовремя. Пакет сохранён; повторите подготовку в настройках.'],
    deviceLost: ['توقّف محرك الرسوم الذي يشغّل مارك. أعد تهيئة الصوت من إعدادات الروبوت.', 'The graphics engine running Mark stopped. Prepare the voice again in Robot settings.', 'Mark’ın grafik motoru durdu. Robot ayarlarından sesi yeniden hazırlayın.', 'Le moteur graphique de Mark s’est arrêté. Relancez la préparation dans les réglages.', 'Графический движок голоса «Марк» остановился. Повторите подготовку в настройках робота.'],
    packMissing: ['حزمة مارك غير مكتملة على هذا الجهاز. راجع حالتها في إعدادات الروبوت.', 'The Mark pack is incomplete on this device. Check Robot settings.', 'Mark paketi bu cihazda eksik. Robot ayarlarını kontrol edin.', 'Le pack Mark est incomplet sur cet appareil. Consultez les réglages du robot.', 'Пакет голоса «Марк» на устройстве неполон. Проверьте настройки робота.'],
    engineFailed: ['تعذّر توليد الصوت بمارك. الحزمة محفوظة؛ جرّب تهيئة مارك من إعدادات الروبوت.', 'Mark could not generate audio. The pack is saved; try preparing Mark in Robot settings.', 'Mark ses üretemedi. Paket kayıtlı; Robot ayarlarından Mark’ı hazırlamayı deneyin.', 'Mark n’a pas pu générer le son. Le pack est enregistré ; préparez Mark dans les réglages.', 'Марк не смог создать звук. Пакет сохранён; попробуйте подготовить голос «Марк» в настройках.'],
  };
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
    let sessionPage = null;
    let startTimer = null;
    let beatTimer = null;
    let expressionTimer = null;
    let expressionStep = 0;
    let voices = [];
    let disposed = false;
    let preferences = {autoExpressions: true, idleMotion: true, speechEnabled: true, speechRate: 1, speechVolume: 1, arabicDialect: 'sy', speechBackend: 'reference', continuousSpeech: false};
    let speakerName = '';
    let lastMotion = {active: false, x: 0, y: 0};
    let referenceWarmRequested = false;
    let paused = false, pauseReason = '', phase = '', failureReason = '';
    let retainedReport = null;

    function language() {
      const lang = (root.lang || 'ar').toLowerCase().split(/[-_]/)[0];
      return Object.prototype.hasOwnProperty.call(messages, lang) ? lang : 'en';
    }

    function currentVoice() { return null; }

    function recordingURL() {
      // Only recordings bundled with this application are allowed for offline playback.
      const value = greeting().audioURL;
      return typeof window.Audio === 'function' && typeof value === 'string' &&
        identityRecordings.has(value) ? value : '';
    }

    function greeting() { return messages[locale]; }

    function voiceManager() { return window.WFReferenceVoice; }

    function offlineReady() {
      try { const manager = voiceManager(); return preferences.speechBackend !== 'device' && typeof manager?.speak === 'function' && manager.getStatus(locale).ready === true; }
      catch (_) { return false; }
    }

    function voicePackState() {
      const missing = {state: 'unsupported', reason: preferences.speechBackend === 'reference' ? 'reference-unavailable' : 'browser-unsupported'};
      try { return voiceManager()?.getStatus(locale) || missing; }
      catch (_) { return missing; }
    }

    function reportVoice(state, pack = voicePackState()) {
      reportEvent('wf-robot-report-voice', {state, locale, progress: pack.progress || 0,
        loaded: pack.loaded || 0, total: pack.total || 0, reason: pack.reason || '', voiceName: pack.name || speakerName});
    }

    function active() { return !!utterance || !!recording || !!offlineRequest || !!reportRequest; }

    function robotVisible() {
      return !disposed && !document.hidden && face.isConnected &&
        face.getAttribute('aria-hidden') === 'false' && !!dashboard?.classList.contains('active');
    }

    // Playback belongs to the application, not to the currently visible card.
    function visible() { return !disposed; }

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
      const previous = preferences;
      const bounded = (value, min, max, fallback) => typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
      preferences = {autoExpressions: stored.autoExpressions !== false, idleMotion: stored.idleMotion !== false,
        speechEnabled: stored.speechEnabled !== false, speechRate: bounded(stored.speechRate, .75, 1.25, 1), speechVolume: bounded(stored.speechVolume, 0, 1, 1),
        arabicDialect: 'sy', speechBackend: 'reference', continuousSpeech: false};
      if (active() && ['speechEnabled', 'speechVolume', 'arabicDialect', 'speechBackend', 'continuousSpeech'].some(key => previous[key] !== preferences[key])) finish('stopped', true);
      if (active() && previous.speechRate !== preferences.speechRate) {
        const nextRate = preferences.speechRate;
        preferences = {...preferences, speechRate: previous.speechRate};
        setSpeechRate(nextRate);
      }
      face.dataset.idleMotion = String(preferences.idleMotion);
      if (!preferences.autoExpressions) {
        clearTimeout(expressionTimer);
        expressionTimer = null;
        setExpression('calm');
      }
      render();
      warmReferenceVoice();
    }

    function warmReferenceVoice() {
      const manager = window.WFReferenceVoice;
      const selected = !disposed && preferences.speechBackend === 'reference' &&
        preferences.speechEnabled && preferences.speechVolume > 0;
      if (!selected) {
        if (active()) return;
        referenceWarmRequested = false;
        try { manager?.release?.(); } catch (_) {}
        return;
      }
      if (document.hidden) return;
      if (referenceWarmRequested || typeof manager?.prepare !== 'function' || !manager.getStatus(locale).ready) return;
      referenceWarmRequested = true;
      // Preparation reads the already installed pack only. It never speaks or downloads.
      try { Promise.resolve(manager.prepare(locale)).catch(() => {}); } catch (_) {}
    }

    function applyMotion(event) {
      if (event?.detail) lastMotion = event.detail;
      const tracking = lastMotion.active === true && robotVisible();
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
      status.textContent = speechMessage(statusKey);
      status.title = status.textContent;
      const introActive = active() && sessionKind === 'intro';
      const reportActive = active() && sessionKind === 'report';
      speakButton.querySelector('span').textContent = copy[introActive ? 'stop' : 'speak'];
      speakButton.setAttribute('aria-label', copy[introActive ? 'stop' : 'speak']);
      speakButton.title = copy[introActive ? 'stop' : 'speak'];
      speakButton.setAttribute('aria-pressed', String(introActive));
      speakButton.disabled = (!active() && !speechAllowed()) || (!recordingURL() && !offlineReady()) || reportActive;
      if (reportButton) {
        const reportLabel = window.WFRobotReport?.isMinimized?.() ? speechCopy.openReport[Math.max(0, speechLanguages.indexOf(locale))] : copy[reportActive ? 'stop' : 'report'];
        reportButton.querySelector('span').textContent = reportLabel;
        reportButton.setAttribute('aria-label', reportLabel);
        reportButton.setAttribute('aria-pressed', String(reportActive));
        reportButton.title = reportLabel;
        reportButton.disabled = introActive || (!active() && !speechAllowed());
      }
      const display = face.querySelector('.wf-robot-display');
      display?.setAttribute('aria-label', speechCopy.openReport[Math.max(0, speechLanguages.indexOf(locale))]);
      face.dataset.voiceActive = String(active());
      face.dataset.voiceKind = sessionKind;
      window.dispatchEvent(new CustomEvent('wf-program-speech-state', {detail: speechState()}));
    }

    function speechAllowed() { return preferences.speechEnabled && preferences.speechVolume > 0; }
    function speechMessage(statusKey) {
      let key;
      if (statusKey === 'paused') key = pauseReason === 'background' ? 'background' : 'paused';
      else if (statusKey === 'preparing') key = ({'audio-unlock': 'unlocking', 'audio-resume': 'unlocking', loading: 'loading', initializing: 'initializing', ready: 'generating', generating: 'generating', streaming: 'streaming'})[phase] || 'generating';
      else if (statusKey === 'failed') key = failureReason === 'playback-blocked' ? 'blocked' : failureReason === 'playback-interrupted' ? 'interrupted' : /worker-startup|engine-load/.test(failureReason) ? 'workerFailed' : /timeout/.test(failureReason) ? 'timeout' : /gpu-device-lost|gpu-operation-failed|webgpu/.test(failureReason) ? 'deviceLost' : /pack-not-installed|integrity-failed/.test(failureReason) ? 'packMissing' : 'engineFailed';
      return key ? speechCopy[key][Math.max(0, speechLanguages.indexOf(locale))] : messages[locale][statusKey] || messages[locale].ready;
    }
    function speechState() { return {state: !preferences.speechEnabled ? 'disabled' : preferences.speechVolume === 0 ? 'muted' : state, active: active(), paused, canPause: !!recording || typeof offlineRequest?.handle?.pause === 'function', rate: preferences.speechRate, kind: sessionKind, phase, reason: paused ? pauseReason : failureReason, message: speechMessage(state), locale, voiceName: speakerName}; }

    function setSpeechRate(value) {
      if (typeof value !== 'number' || !Number.isFinite(value) || disposed) return false;
      const next = Math.max(.75, Math.min(1.25, value));
      try {
        if (recording) { recording.preservesPitch = true; recording.playbackRate = next; }
        else if (offlineRequest?.handle) {
          if (typeof offlineRequest.handle.setRate !== 'function' || offlineRequest.handle.setRate(next) === false) return false;
        }
      } catch (_) { return false; }
      preferences = {...preferences, speechRate: next};
      render(); return true;
    }

    function markPaused(reason = 'user') {
      if (!active()) return;
      paused = true; pauseReason = reason; state = 'paused'; phase = '';
      clearTimeout(startTimer); startTimer = null;
      clearTimeout(expressionTimer); expressionTimer = null;
      face.dataset.speaking = 'false'; face.dataset.speechBeat = 'false';
      automaticExpression('calm'); render(); reportPlayback('paused', speechMessage('paused'));
    }

    function pauseSpeech() {
      if (!active() || paused) return false;
      const target = recording || offlineRequest?.handle;
      if (typeof target?.pause !== 'function') return false;
      markPaused('user');
      try { target.pause(); return true; }
      catch (problem) { finish('failed', true, problem); return false; }
    }

    function resumeSpeech() {
      if (!active() || !paused) return Promise.resolve(false);
      const request = recording, handle = offlineRequest?.handle;
      paused = false; pauseReason = ''; state = 'preparing'; phase = 'audio-resume';
      render(); reportPlayback('preparing', speechMessage('preparing'));
      let result;
      try {
        // Keep resume/play in this gesture, including a lock-screen media action.
        if (request) {
          result = request.play();
          clearTimeout(startTimer);
          startTimer = setTimeout(() => { if (recording === request && state === 'preparing' && !paused) finish('failed', true, {code: 'playback-blocked'}); }, 8000);
        } else if (typeof handle?.resume === 'function') result = handle.resume();
        else { markPaused('user'); return Promise.resolve(false); }
      } catch (problem) { finish('failed', true, problem); return Promise.resolve(false); }
      return Promise.resolve(result).then(() => true, problem => {
        if ((request && recording === request) || (handle && offlineRequest?.handle === handle)) finish('failed', true, problem);
        return false;
      });
    }

    function announceActivity(active) {
      face.dispatchEvent(new CustomEvent('wf-robot-speaking', {bubbles: true, detail: {active}}));
    }

    function releaseRecording(request) {
      request.onplaying = request.onwaiting = request.onpause = request.onended = request.onerror = null;
      try { request.pause(); request.removeAttribute('src'); request.load(); }
      catch (_) { /* Its callbacks are already detached and the session invalidated. */ }
    }

    function finish(nextState = 'ready', cancel = false, problem) {
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
      paused = false; pauseReason = ''; phase = '';
      failureReason = nextState === 'failed' ? String(problem?.code || problem?.message || 'engine-failed') : '';
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
        reportPlayback(playbackState, ['unavailable', 'failed'].includes(playbackState) ? speechMessage(nextState) : '');
      }
    }

    function refreshVoices() {
      if (disposed) return;
      try { voices = supported ? synth.getVoices() : []; } catch (_) { voices = []; }
      const available = currentVoice() || offlineReady() || ((sessionKind === 'intro' || sessionKind === 'preview') && recordingURL());
      if (!active() && available && ['unavailable', 'reportUnavailable'].includes(state)) state = 'ready';
      render();
    }

    function refreshOfflineStatus(event) {
      const selectedEvent = preferences.speechBackend === 'reference' ? 'wf-reference-voice-change' : 'wf-offline-voice-change';
      if (event?.type && event.type !== selectedEvent) return;
      refreshVoices();
      warmReferenceVoice();
      if (sessionKind !== 'report' || (preferences.speechBackend !== 'reference' && event?.detail?.locale !== locale)) return;
      const pack = voicePackState();
      const state = pack.ready || currentVoice() ? 'ready' : pack.state === 'downloading' ? 'downloading' :
        pack.state === 'error' ? 'error' : pack.state === 'unsupported' ? 'unsupported' : 'missing';
      reportVoice(state, pack);
    }

    function beginTalking() {
      if (paused || disposed) return;
      phase = ''; failureReason = '';
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
      if (active() && !paused && state === 'speaking') reportPlayback('speaking');
    }

    function playRecording(url) {
      let request;
      try { request = new window.Audio(url); }
      catch (_) {
        if (!speakIdentityFallback()) { state = 'failed'; render(); }
        return;
      }
      let started = false;
      request.volume = preferences.speechVolume;
      request.playbackRate = preferences.speechRate;
      request.preservesPitch = true;
      speakerName = 'Mark · Natural Conversations';
      recording = request;
      state = 'preparing'; paused = false; pauseReason = ''; phase = ''; failureReason = '';
      automaticExpression('thinking');
      render();
      if (recording !== request) return;
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
        if (recording !== request || paused) return;
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
        if (paused) { try { request.pause(); } catch (_) {} return; }
        if (!visible()) { finish('ready', true); return; }
        started = true;
        beginTalking();
      };
      request.onwaiting = waiting;
      request.onpause = () => { if (recording === request && !paused) markPaused('background'); };
      request.onended = () => { if (recording === request) finish(); };
      request.onerror = failed;
      waiting();
      try {
        const playing = request.play();
        playing?.catch(failed);
      } catch (_) { failed(); }
    }

    function speakIdentityFallback(alreadyActive = false) {
      if (offlineReady()) { speakOffline(greeting().greeting, alreadyActive); return true; }
      return false;
    }

    function toggleSpeech(event) {
      event.stopPropagation();
      if (!event.isTrusted) return;
      if (active()) { finish('stopped', true); return; }
      if (!speechAllowed()) return;
      // A new dashboard action must not inherit a finished Settings session.
      if ((!supported && !recordingURL() && !offlineReady()) || !robotVisible()) return;
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
      const manager = voiceManager();
      speakerName = voicePackState().name || manager?.list?.().find(item => item.locale === locale || item.locales?.includes(locale))?.name ||
        (preferences.speechBackend === 'reference' ? 'Mark · local reference' : 'Local · ' + locale);
      offlineRequest = request;
      state = 'preparing'; paused = false; pauseReason = ''; phase = ''; failureReason = '';
      automaticExpression('thinking');
      render();
      if (offlineRequest !== request) return;
      if (!alreadyActive) announceActivity(true);
      const resetPreparationTimer = () => {
        clearTimeout(startTimer);
        startTimer = setTimeout(() => {
          if (offlineRequest === request && state === 'preparing' && !paused) finish('failed', true, {code: 'speech-timeout'});
        }, 95000);
      };
      resetPreparationTimer();
      if (sessionKind === 'report') reportVoice('ready');
      try {
        request.handle = manager.speak({text, locale, chunks, playback,
          rate: preferences.speechRate, volume: preferences.speechVolume,
          continuous: false, dialect: 'sy',
          onProgress(progress) {
            if (offlineRequest !== request || paused) return;
            if (progress.phase) phase = progress.phase;
            if (!request.started || state === 'preparing') { resetPreparationTimer(); render(); reportPlayback('preparing', speechMessage('preparing')); }
            if (sessionKind === 'report') reportEvent('wf-robot-report-preparation', {completed: progress.completed, total: progress.total});
          },
          onStart() {
            if (offlineRequest !== request || paused) return;
            if (!visible()) { finish('ready', true); return; }
            request.started = true;
            beginTalking();
          },
          onPause(detail) { if (offlineRequest === request) markPaused(detail?.reason || 'user'); },
          onResume() { if (offlineRequest === request) { paused = false; pauseReason = ''; state = 'preparing'; phase = 'audio-resume'; resetPreparationTimer(); render(); reportPlayback('preparing', speechMessage('preparing')); } },
          onWaiting() {
            if (offlineRequest !== request || paused) return;
            face.dataset.speaking = 'false';
            state = 'preparing';
            clearTimeout(expressionTimer); expressionTimer = null;
            resetPreparationTimer();
            automaticExpression('thinking'); render(); reportPlayback('preparing');
          },
          onBoundary(boundary) {
            if (offlineRequest !== request || sessionKind !== 'report' || paused) return;
            const charIndex = Math.max(0, Math.min(text.length, Number(boundary?.charIndex) || 0));
            const charLength = Math.max(0, Math.min(text.length - charIndex, Number(boundary?.charLength) || 0));
            reportEvent('wf-robot-report-boundary', {charIndex, charLength});
          },
          onEnd() { if (offlineRequest === request) finish(); },
          onError(problem) {
            if (offlineRequest === request) finish('failed', true, problem);
          },
        });
        if (offlineRequest !== request) request.handle?.cancel();
        else { request.handle?.setRate?.(preferences.speechRate); render(); }
      } catch (problem) {
        if (offlineRequest === request) finish('failed', true, problem);
      }
    }

    async function toggleReport(event) {
      event.stopPropagation();
      if (event.isTrusted !== true && event.control !== true) return;
      if (event.isTrusted === true && window.WFRobotReport?.isMinimized?.() && window.WFRobotReport.show()) return;
      if (active()) { if (sessionKind === 'report') finish('stopped', true); return; }
      if (!speechAllowed()) return;
      if (!robotVisible() && event.control !== true) return;
      refreshVoices();
      const token = {controller: null, playback: null};
      // Prime audio in the click itself, before reading records or downloading a pack.
      try { token.playback = voiceManager()?.preparePlayback?.(); } catch (_) {}
      reportRequest = token;
      sessionKind = 'report';
      speakerName = '';
      state = 'preparing'; paused = false; pauseReason = ''; phase = ''; failureReason = '';
      automaticExpression('thinking');
      render();
      if (reportRequest !== token) return;
      announceActivity(true);
      reportPlayback('preparing');
      startTimer = setTimeout(() => {
        if (reportRequest === token) finish('reportEmpty');
      }, 8000);
      let snapshot;
      try { snapshot = await window.wfBusinessOverviewSnapshot?.({locale}); } catch (_) { /* A failed report never starts speech. */ }
      if (reportRequest !== token) return;
      if (!visible()) { finish('ready', true); return; }
      retainedReport = {snapshot: snapshot || {narration: '', unavailableReason: messages[locale].reportEmpty}, locale};
      reportEvent('wf-robot-report-open', retainedReport);
      if (reportRequest !== token) return;
      const narration = typeof snapshot?.narration === 'string' ? snapshot.narration.trim() : '';
      if (!narration) { finish('reportEmpty'); return; }
      const voice = currentVoice();
      if (!voice && !offlineReady()) {
        clearTimeout(startTimer); startTimer = null;
        const pack = voicePackState();
        if (preferences.speechBackend === 'device') { reportVoice('unsupported', {...pack, reason: 'device-voice-unavailable'}); finish('reportUnavailable'); return; }
        if (pack.state === 'unsupported' || typeof voiceManager()?.download !== 'function') {
          reportVoice('unsupported', pack); finish('reportUnavailable'); return;
        }
        if (!event.install) { reportVoice(pack.state === 'downloading' ? 'downloading' : 'missing', pack); finish('reportUnavailable'); return; }
        token.controller = new AbortController();
        reportVoice('downloading', pack);
        try {
          await voiceManager().download(locale, {signal: token.controller.signal,
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
      if (locale === 'ar' || locale === 'tr') {
        try {
          const adapter = locale === 'ar' ? window.WFArabicReportSpeech : window.WFTurkishReportSpeech;
          chunks = adapter.prepare(snapshot, locale === 'ar' ? {dialect: 'sy'} : undefined);
          if (!Array.isArray(chunks) || !chunks.length) throw new Error('unsupported-report');
        }
        catch (_) {
          // Unknown or incomplete report text must never be guessed by a speech template.
          reportVoice('unsupported', {...voicePackState(), reason: 'report-text-unsupported'}); finish('reportEmpty'); return;
        }
      }
      clearTimeout(startTimer);
      startTimer = null;
      reportRequest = null;
      reportVoice('ready');
      if (offlineReady()) speakOffline(narration, true, chunks, token.playback);
      else { token.playback?.dispose(); reportVoice('unsupported', voicePackState()); finish('reportUnavailable'); }
    }

    function reportControl(event) {
      if (event.detail?.action === 'stop' || event.detail?.action === 'cancel-download') {
        if (active() && sessionKind === 'report') finish('stopped', true);
        if (event.detail?.action === 'cancel-download') { voiceManager()?.cancelDownload?.(locale); reportVoice('missing'); }
      } else if (event.detail?.action === 'replay' || event.detail?.action === 'install') {
        if (active()) finish('stopped', true);
        toggleReport({stopPropagation() {}, control: true, install: event.detail.action === 'install'});
      }
    }

    // All user-requested text shares this owner, so recordings, reports and text
    // selection cannot overlap. No microphone or network synthesis is involved.
    function speakProgram({text, event, locale: requestedLocale, kind, rate} = {}) {
      if (event?.isTrusted !== true || disposed || document.hidden || !speechAllowed()) return false;
      if (typeof text !== 'string' || !text.trim() || text.length > 16000) return false;
      if (requestedLocale && String(requestedLocale).toLowerCase().split(/[-_]/)[0] !== locale) return false;
      if (active()) finish('stopped', true);
      sessionKind = kind === 'preview' ? 'preview' : 'program';
      if (typeof rate === 'number') setSpeechRate(rate);
      sessionPage = document.querySelector('.page.active');
      refreshVoices();
      if (synth?.speaking || synth?.pending || synth?.paused) { state = 'busy'; render(); return false; }
      text = text.trim();
      if (offlineReady()) {
        let playback;
        try { playback = voiceManager()?.preparePlayback?.(); } catch (_) {}
        speakOffline(text, false, undefined, playback); return true;
      }
      speakerName = ''; state = 'unavailable'; render(); return false;
    }

    function previewGreeting({event, rate} = {}) {
      if (event?.isTrusted !== true || disposed || document.hidden || !speechAllowed()) return false;
      if (active()) finish('stopped', true);
      sessionKind = 'preview';
      if (typeof rate === 'number') setSpeechRate(rate);
      sessionPage = document.querySelector('.page.active');
      refreshVoices();
      if (synth?.speaking || synth?.pending || synth?.paused) { state = 'busy'; render(); return false; }
      const url = recordingURL();
      if (url) { playRecording(url); return true; }
      if (speakIdentityFallback()) return true;
      state = 'unavailable'; render(); return false;
    }

    const programSpeech = Object.freeze({speak: speakProgram, preview: previewGreeting, pause: pauseSpeech, resume: resumeSpeech, setRate: setSpeechRate,
      stop() { if (active()) finish('stopped', true); }, getState: speechState});
    window.WFProgramSpeech = programSpeech;
    const display = face.querySelector('.wf-robot-display');
    if (display) {
      display.setAttribute('aria-hidden', 'false');
      display.setAttribute('role', 'button');
      display.setAttribute('tabindex', '0');
      display.setAttribute('aria-haspopup', 'dialog');
      display.setAttribute('aria-controls', 'wfRobotReportSheet');
    }
    function displayKey(event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault(); toggleReport(event);
    }
    function changedRoute() { applyMotion(); }

    function checkVisibility() {
      applyMotion();
      warmReferenceVoice();
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
      warmReferenceVoice();
      visibilityObserver.disconnect();
      pageObserver.disconnect();
      languageObserver.disconnect();
      speakButton.removeEventListener('click', toggleSpeech);
      reportButton?.removeEventListener('click', toggleReport);
      display?.removeEventListener('click', toggleReport);
      display?.removeEventListener('keydown', displayKey);
      document.removeEventListener('visibilitychange', checkVisibility);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('hashchange', changedRoute);
      window.removeEventListener('wf-robot-preferences', applyPreferences);
      window.removeEventListener('wf-robot-motion', applyMotion);
      window.removeEventListener('wf-robot-report-control', reportControl);
      window.removeEventListener('wf-robot-report-visibility', render);
      window.removeEventListener('wf-offline-voice-change', refreshOfflineStatus);
      window.removeEventListener('wf-reference-voice-change', refreshOfflineStatus);
      synth?.removeEventListener?.('voiceschanged', refreshVoices);
      if (window.WFProgramSpeech === programSpeech) delete window.WFProgramSpeech;
    }

    const visibilityObserver = new MutationObserver(checkVisibility);
    visibilityObserver.observe(face, {attributes: true, attributeFilter: ['aria-hidden']});
    if (dashboard) visibilityObserver.observe(dashboard, {attributes: true, attributeFilter: ['class']});
    // showPage uses history.pushState, which does not dispatch hashchange.
    // Observe actual page activation without altering the existing router.
    const pageObserver = new MutationObserver(checkVisibility);
    pageObserver.observe(document.getElementById('mainContent') || root, {attributes: true, subtree: true, attributeFilter: ['class']});
    const languageObserver = new MutationObserver(syncLanguage);
    languageObserver.observe(root, {attributes: true, attributeFilter: ['lang']});
    speakButton.addEventListener('click', toggleSpeech);
    reportButton?.addEventListener('click', toggleReport);
    display?.addEventListener('click', toggleReport);
    display?.addEventListener('keydown', displayKey);
    document.addEventListener('visibilitychange', checkVisibility);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('hashchange', changedRoute);
    window.addEventListener('wf-robot-preferences', applyPreferences);
    window.addEventListener('wf-robot-motion', applyMotion);
    window.addEventListener('wf-robot-report-control', reportControl);
    window.addEventListener('wf-robot-report-visibility', render);
    window.addEventListener('wf-offline-voice-change', refreshOfflineStatus);
    window.addEventListener('wf-reference-voice-change', refreshOfflineStatus);
    synth?.addEventListener?.('voiceschanged', refreshVoices);
    applyPreferences();
    refreshVoices();
    window.dispatchEvent(new CustomEvent('wf-robot-ready'));
    return {element: face, destroy};
  }

  // Runs synchronously in this deferred script so the carousel discovers all five faces.
  mountRobotFace(track);
})();
