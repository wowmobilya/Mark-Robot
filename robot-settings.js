/* Infinity Robot preferences and optional local camera movement tracking.
   Camera pixels stay in a small canvas in this page. No recording or upload. */
(() => {
  'use strict';
  const defaults = {autoExpressions: true, idleMotion: true, trackingSensitivity: 'normal',
    speechEnabled: true, speechRate: 1, speechVolume: 1, arabicDialect: 'sy', speechBackend: 'reference', continuousSpeech: false};
  const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const bounded = (value, min, max, fallback) => typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
  function normalize(value) {
    const input = object(value);
    return {
      autoExpressions: input.autoExpressions !== false,
      idleMotion: input.idleMotion !== false,
      trackingSensitivity: ['low', 'normal', 'high'].includes(input.trackingSensitivity) ? input.trackingSensitivity : 'normal',
      speechEnabled: input.speechEnabled !== false,
      speechRate: bounded(input.speechRate, .75, 1.25, 1),
      speechVolume: bounded(input.speechVolume, 0, 1, 1),
      arabicDialect: 'sy',
      speechBackend: 'reference',
      continuousSpeech: false,
    };
  }
  function mergeSettings(stored, memory, preferences) {
    const previous = object(stored), current = object(memory);
    const robot = {...object(current.robot), ...object(previous.robot), ...object(preferences)};
    return {...current, ...previous, id: 'main', robot: {
      ...robot, ...normalize(robot),
    }};
  }
  function packActionDisabled(status, anyDownloading, ownsDownload) {
    return status.state === 'checking' || status.state === 'unsupported' ||
      (anyDownloading && status.state !== 'downloading') ||
      (status.state === 'downloading' && !ownsDownload);
  }
  function voiceStatusKey(status) {
    const reasons = {
      'integrity-failed': 'voiceIntegrity', 'download-failed': 'voiceDownloadFailed',
      'storage-full': 'voiceStorageFull', 'storage-unavailable': 'voiceStorageUnavailable',
      'browser-unsupported': 'voiceUnsupported', 'locale-unsupported': 'voiceLocaleUnavailable',
      'webgpu-unavailable': 'voiceWebGPU', 'reference-unavailable': 'voiceReferenceUnavailable',
      'download-busy': 'voiceDownloadBusy', 'pack-not-installed': 'voiceMissing', cancelled: 'voiceCancelled',
    };
    if (['error', 'unsupported'].includes(status.state) || status.reason === 'cancelled') {
      return reasons[status.reason] || (status.state === 'unsupported' ? 'voiceUnsupported' : 'voiceError');
    }
    return {checking: 'voiceChecking', ready: 'voiceReady', downloading: 'voiceDownloading'}[status.state] || 'voiceMissing';
  }
  function voicePhaseKey(status) {
    const stages = {
      'open-cache': 'voicePhaseStorage', 'check-cache': 'voicePhaseStorage', 'check-storage': 'voicePhaseStorage',
      fetch: 'voicePhaseDownload', stream: 'voicePhaseDownload', verify: 'voicePhaseVerify',
      store: 'voicePhaseStore', 'final-check': 'voicePhaseVerify', marker: 'voicePhaseStore',
    };
    return stages[status.stage] || {download: 'voicePhaseDownload', verify: 'voicePhaseVerify', store: 'voicePhaseStore'}[status.phase] || '';
  }
  function voicePackEntries(_localApi, referenceApi, locale = 'ar') {
    const supported = ['ar', 'en', 'tr', 'fr', 'ru'];
    locale = supported.includes(locale) ? locale : 'ar';
    const list = api => { try { return typeof api?.list === 'function' ? api.list() : []; } catch (_) { return []; } };
    const status = (api, key, backend) => {
      try { if (typeof api?.getStatus === 'function') { const value = api.getStatus(key); if (value && typeof value === 'object') return value; } } catch (_) {}
      return {state: 'unsupported', ready: false, reason: backend === 'reference' ? 'reference-unavailable' : 'browser-unsupported'};
    };
    const shared = list(referenceApi);
    const pack = shared.find(item => item.locale === locale || item.locales?.includes(locale)) || shared[0] ||
      {name: 'Mark · local reference', bytes: 922000000, approximate: true};
    return [{key: 'reference', backend: 'reference', locale, api: referenceApi, pack, status: status(referenceApi, locale, 'reference')}];
  }
  function createPreferenceStore({getState, connect}) {
    let busy = false;
    return {
      get busy() { return busy; },
      async save(preferences) {
        if (busy) throw new Error('busy');
        busy = true;
        try {
          const connection = await connect();
          const committed = await new Promise((resolve, reject) => {
            // One transaction reads the latest record and merges only this section.
            const transaction = connection.transaction('settings', 'readwrite');
            const store = transaction.objectStore('settings');
            let result;
            const request = store.get('main');
            request.onsuccess = () => {
              result = mergeSettings(request.result, getState()?.settings, preferences);
              try { store.put(result); } catch (error) { transaction.abort(); reject(error); }
            };
            transaction.oncomplete = () => resolve(result);
            transaction.onabort = transaction.onerror = () => reject(transaction.error || new Error('saveFailed'));
          });
          const state = getState();
          if (state) state.settings = {...object(state.settings), robot: committed.robot};
          return normalize(committed.robot);
        } finally { busy = false; }
      },
    };
  }

  // Detect the centre of changed pixels, not a person's identity or facial features.
  function movement(previous, rgba, width, height, sensitivity = 'normal') {
    const size = width * height;
    const gray = new Uint8Array(size);
    const threshold = {low: 26, normal: 18, high: 12}[sensitivity] || 18;
    let weight = 0, sumX = 0, sumY = 0, changed = 0;
    for (let index = 0; index < size; index++) {
      const offset = index * 4;
      gray[index] = (rgba[offset] * 3 + rgba[offset + 1] * 6 + rgba[offset + 2]) / 10;
      if (!previous || previous.length !== size) continue;
      const difference = Math.abs(gray[index] - previous[index]);
      if (difference <= threshold) continue;
      const contribution = Math.min(64, difference - threshold);
      weight += contribution;
      sumX += (index % width) * contribution;
      sumY += Math.floor(index / width) * contribution;
      changed++;
    }
    // Ignore tiny sensor noise and a frame-wide lighting/exposure change.
    const detected = changed >= Math.max(8, size * .004) && changed < size * .65 && weight > 0;
    return {gray, detected, x: detected ? 1 - 2 * sumX / weight / (width - 1) : 0,
      y: detected ? 2 * sumY / weight / (height - 1) - 1 : 0};
  }

  function createMotionTracker({mediaDevices, video, canvas, isVisible, onUpdate, getSensitivity,
    secure = true, schedule = setTimeout, cancel = clearTimeout, now = () => Date.now()}) {
    let generation = 0, stream = null, timer = null, previous = null, state = 'off';
    let x = 0, y = 0, targetX = 0, targetY = 0, lastMovement = 0, disposed = false;
    let trackListeners = [];
    const announce = () => onUpdate({active: !!stream && state === 'tracking', state, x, y});
    function stop(nextState = 'off') {
      generation++;
      cancel(timer); timer = null;
      for (const [track, listener] of trackListeners) track.removeEventListener?.('ended', listener);
      trackListeners = [];
      const current = stream;
      stream = null;
      for (const track of current?.getTracks?.() || []) track.stop();
      video.pause?.(); video.srcObject = null;
      previous = null; x = y = targetX = targetY = 0;
      state = nextState;
      announce();
    }
    async function start({userInitiated = false} = {}) {
      if (!userInitiated || disposed) return false;
      if (!secure || typeof mediaDevices?.getUserMedia !== 'function') { stop('unsupported'); return false; }
      if (!isVisible()) { stop('hidden'); return false; }
      stop('off');
      const token = ++generation;
      state = 'requesting'; announce();
      let requested;
      try {
        requested = await mediaDevices.getUserMedia({audio: false, video: {
          facingMode: {ideal: 'user'}, width: {ideal: 320}, height: {ideal: 240}, frameRate: {ideal: 12, max: 15},
        }});
        if (generation !== token || disposed || !isVisible()) {
          for (const track of requested.getTracks()) track.stop();
          if (generation === token) stop('hidden');
          return false;
        }
        stream = requested;
        video.srcObject = stream;
        for (const track of stream.getVideoTracks?.() || stream.getTracks()) {
          const listener = () => { if (stream === requested) stop('ended'); };
          track.addEventListener?.('ended', listener);
          trackListeners.push([track, listener]);
        }
        await video.play();
        if (generation !== token || !isVisible()) { if (stream === requested) stop('hidden'); return false; }
        const context = canvas.getContext('2d', {willReadFrequently: true});
        if (!context) throw new Error('canvasUnavailable');
        canvas.width = 64; canvas.height = 48;
        state = 'tracking'; lastMovement = now(); announce();
        const frame = () => {
          if (generation !== token || !stream) return;
          if (!isVisible()) { stop('hidden'); return; }
          try {
            if (video.readyState >= 2) {
              context.drawImage(video, 0, 0, 64, 48);
              const result = movement(previous, context.getImageData(0, 0, 64, 48).data, 64, 48, getSensitivity());
              previous = result.gray;
              if (result.detected) { targetX = result.x; targetY = result.y; lastMovement = now(); }
              else if (now() - lastMovement > 900) targetX = targetY = 0;
              x += (targetX - x) * .35; y += (targetY - y) * .35;
              if (Math.abs(x) < .005) x = 0;
              if (Math.abs(y) < .005) y = 0;
              announce();
            }
          } catch (_) { stop('failed'); return; }
          timer = schedule(frame, 125);
        };
        timer = schedule(frame, 125);
        return true;
      } catch (error) {
        if (generation !== token) return false;
        const next = ['NotAllowedError', 'SecurityError'].includes(error?.name) ? 'denied' :
          ['NotFoundError', 'OverconstrainedError'].includes(error?.name) ? 'missing' :
          ['NotReadableError', 'AbortError'].includes(error?.name) ? 'busy' : 'failed';
        stop(next);
        return false;
      }
    }
    return {start, stop, get state() { return state; }, get active() { return !!stream; },
      checkVisibility() { if ((stream || state === 'requesting') && !isVisible()) stop('hidden'); },
      destroy() { disposed = true; stop('off'); },
    };
  }

  const core = {defaults, normalize, mergeSettings, packActionDisabled, voiceStatusKey, voicePhaseKey, voicePackEntries, createPreferenceStore, movement, createMotionTracker};
  if (typeof module === 'object' && module.exports) module.exports = core;
  if (typeof document === 'undefined' || window.WFRobotSettings) return;
  const root = document.documentElement;
  const state = () => typeof S === 'object' ? S : null;
  const workspace = document.querySelector('#page-settings .wf-settings-workspace');
  const tabs = workspace?.querySelector('.tabs'), content = workspace?.querySelector('.wf-settings-content');
  if (!tabs || !content) return;
  const locales = ['ar', 'en', 'tr', 'fr', 'ru'];
  const language = () => {
    const value = (root.lang || state()?.lang || 'ar').toLowerCase().split('-')[0];
    return locales.includes(value) ? value : 'en';
  };
  const copy = {
    previewFailed: ["تعذّر بدء العينة. أوقف أي قراءة جارية ثم حاول مجددًا.", "The sample could not start. Stop any current reading and try again.", "Örnek başlatılamadı. Devam eden okumayı durdurup yeniden deneyin.", "Impossible de lancer l’extrait. Arrêtez la lecture en cours et réessayez.", "Не удалось запустить пример. Остановите текущее чтение и повторите."],
    referenceInstalledHint: ["حزمة Mark محفوظة على هذا الجهاز، بحجم يقارب {size} MB.", "The Mark pack is stored on this device, about {size} MB.", "Mark paketi bu cihazda kayıtlı, yaklaşık {size} MB.", "Le pack Mark est conservé sur cet appareil, environ {size} Mo.", "Пакет Mark сохранён на этом устройстве, около {size} МБ."],
    movementTitle: ["تعبيرات الروبوت وحركته", "Robot expressions and movement", "Robot ifadeleri ve hareketi", "Expressions et mouvements du robot", "Выражения и движения робота"],
    markPack: ["Mark على هذا الجهاز", "Mark on this device", "Bu cihazdaki Mark", "Mark sur cet appareil", "Mark на этом устройстве"],
    voiceInstalled: ["مثبّت على هذا الجهاز", "Installed on this device", "Bu cihazda yüklü", "Installé sur cet appareil", "Установлен на этом устройстве"],
    voiceEngineCold: ["التشغيل لم يُجهّز بعد. جهّز Mark الآن أو ابدأ القراءة.", "Not prepared yet. Prepare Mark now or start reading.", "Henüz hazırlanmadı. Mark sesini şimdi hazırlayın veya okumayı başlatın.", "Pas encore préparé. Préparez Mark maintenant ou lancez la lecture.", "Ещё не подготовлен. Подготовьте Mark сейчас или начните чтение."],
    voiceEnginePreparing: ["جارٍ تجهيز Mark…", "Preparing Mark…", "Mark hazırlanıyor…", "Préparation de Mark…", "Подготовка Mark…"],
    voiceEngineReady: ["Mark جاهز لبدء القراءة.", "Mark is ready to start reading.", "Mark okumaya hazır.", "Mark est prêt pour la lecture.", "Mark готов к чтению."],
    voiceEngineFailed: ["تعذّر تجهيز Mark. الحزمة ما زالت محفوظة؛ حاول التجهيز مجددًا.", "Mark could not prepare. The pack is still saved; try preparing again.", "Mark hazırlanamadı. Paket hâlâ kayıtlı; hazırlamayı yeniden deneyin.", "Impossible de préparer Mark. Le pack est conservé ; réessayez la préparation.", "Не удалось подготовить Mark. Пакет сохранён; повторите подготовку."],
    voicePrepare: ["تجهيز Mark الآن", "Prepare Mark now", "Mark sesini hazırla", "Préparer Mark", "Подготовить Mark"],
    speechTitle: ["صوت Mark", "Mark voice", "Mark sesi", "Voix Mark", "Голос Mark"],
    speechEnabled: ['تشغيل الصوت في البرنامج', 'Enable program speech', 'Program sesini aç', 'Activer la lecture vocale', 'Включить речь в программе'],
    speechRate: ['سرعة القراءة', 'Reading speed', 'Okuma hızı', 'Vitesse de lecture', 'Скорость чтения'],
    speechVolume: ['مستوى الصوت', 'Volume', 'Ses düzeyi', 'Volume', 'Громкость'],
    reference: ["العربية باللهجة السورية", "Arabic in the Syrian dialect", "Suriye lehçesinde Arapça", "Arabe en dialecte syrien", "Арабский на сирийском диалекте"],
    markScope: ["عينة القراءة يولّدها جهازك من مرجع Mark وقد تختلف عن التسجيل المحفوظ.", "Reading samples are generated on your device from the Mark reference and may sound different from the saved recording.", "Okuma örnekleri cihazınızda Mark referansından üretilir ve kayıtlı sesten farklı duyulabilir.", "Les extraits de lecture sont générés sur votre appareil à partir de la référence Mark et peuvent différer de l’enregistrement.", "Примеры чтения создаются на устройстве по образцу Mark и могут отличаться от сохранённой записи."],
    speechPreview: ['سماع تسجيل Mark المحفوظ', 'Play the saved Mark recording', 'Kayıtlı Mark sesini dinle', 'Écouter l’enregistrement Mark', 'Прослушать сохранённую запись Mark'],
    speechReadingPreview: ["تجربة قراءة Mark", "Try Mark reading", "Mark okumasını dene", "Tester la lecture Mark", "Проверить чтение Mark"],
    previewSaveFirst: ["احفظ تعديلات الصوت أولًا لتجربة القراءة بها.", "Save your sound settings first to try them.", "Denemeden önce ses ayarlarını kaydedin.", "Enregistrez les réglages audio avant de les tester.", "Сохраните настройки звука перед проверкой."],
    previewPreparing: ["جارٍ تجهيز عينة Mark…", "Preparing the Mark sample…", "Mark örneği hazırlanıyor…", "Préparation de l’extrait Mark…", "Подготовка примера Mark…"],
    previewPaused: ['عينة القراءة متوقفة مؤقتًا.', 'Reading sample paused.', 'Okuma örneği duraklatıldı.', 'Extrait en pause.', 'Пример чтения приостановлен.'],
    previewSpeaking: ['تعمل عينة القراءة الآن', 'The reading sample is playing', 'Okuma örneği çalıyor', 'Lecture de l’extrait', 'Пример чтения воспроизводится'],
    previewFinished: ['انتهت عينة القراءة.', 'Reading sample finished.', 'Okuma örneği tamamlandı.', 'Extrait terminé.', 'Пример чтения завершён.'],
    previewStopped: ['أُوقفت عينة القراءة.', 'Reading sample stopped.', 'Okuma örneği durduruldu.', 'Extrait arrêté.', 'Пример чтения остановлен.'],
    previewInstall: ["نزّل حزمة Mark من البطاقة أعلاه، ثم جرّب القراءة.", "Download the Mark pack above, then try reading.", "Önce yukarıdaki Mark paketini indirin, ardından okumayı deneyin.", "Téléchargez le pack Mark ci-dessus, puis testez la lecture.", "Загрузите пакет Mark выше, затем проверьте чтение."],
    previewDisabled: ['فعّل الصوت وارفع مستوى الصوت قبل التجربة.', 'Enable speech and increase the volume before trying.', 'Denemeden önce sesi açın ve ses düzeyini artırın.', 'Activez la voix et augmentez le volume avant le test.', 'Включите речь и увеличьте громкость перед проверкой.'],
    referenceHint: ["تنزيل واحد يقارب {size} MB. بعد التثبيت تُولّد القراءة على جهازك دون إنترنت.", "One download of about {size} MB. Once installed, speech is generated offline on this device.", "Yaklaşık {size} MB tek indirme. Kurulumdan sonra konuşma bu cihazda çevrimdışı üretilir.", "Un téléchargement d’environ {size} Mo. Après installation, la parole est générée hors ligne sur cet appareil.", "Однократная загрузка около {size} МБ. После установки речь создаётся на устройстве без интернета."],
    speechStop: ['إيقاف القراءة', 'Stop reading', 'Okumayı durdur', 'Arrêter la lecture', 'Остановить чтение'],
    speechHint: ["تبدأ القراءة مع جهوزية الصوت، وقد يحتاج التشغيل الأول وقتًا للتجهيز. تستمر القراءة في الخلفية عندما يسمح المتصفح.", "Reading starts as audio becomes available; the first start may take time. Reading continues in the background when the browser allows it.", "Ses hazır oldukça okuma başlar; ilk başlatma zaman alabilir. Tarayıcı izin verdiğinde okuma arka planda sürer.", "La lecture commence dès que le son est disponible ; le premier démarrage peut prendre du temps. Elle continue en arrière-plan si le navigateur le permet.", "Чтение начинается по мере готовности звука; первый запуск может занять время. Чтение продолжается в фоне, если браузер это позволяет."],
    title: ['الروبوت', 'Robot', 'Robot', 'Robot', 'Робот'],
    hint: ["إعدادات Mark والقراءة وحركة الروبوت.", "Mark, reading and robot movement settings.", "Mark, okuma ve robot hareketi ayarları.", "Réglages de Mark, de la lecture et des mouvements du robot.", "Настройки Mark, чтения и движений робота."],
    expressions: ['تعبيرات تلقائية أثناء الكلام', 'Automatic expressions while speaking', 'Konuşurken otomatik ifadeler', 'Expressions automatiques pendant la parole', 'Автоматические выражения во время речи'],
    idle: ['رمش وحركة هادئة للعينين', 'Gentle blinking and idle eye movement', 'Hafif göz kırpma ve göz hareketi', 'Clignements et mouvements discrets des yeux', 'Мягкое моргание и движения глаз'],
    sensitivity: ['حساسية تتبّع الحركة', 'Movement sensitivity', 'Hareket hassasiyeti', 'Sensibilité au mouvement', 'Чувствительность к движению'],
    low: ['هادئة', 'Low', 'Düşük', 'Faible', 'Низкая'],
    normal: ['متوازنة', 'Balanced', 'Dengeli', 'Équilibrée', 'Средняя'],
    high: ['حساسة', 'High', 'Yüksek', 'Élevée', 'Высокая'],
    camera: ['تتبّع الحركة بالكاميرا الأمامية', 'Follow movement with the front camera', 'Ön kamerayla hareketi takip et', 'Suivre les mouvements avec la caméra avant', 'Следить за движением фронтальной камерой'],
    privacy: ['معالجة محلية على جهازك، بلا تسجيل أو إرسال للصور. يتتبّع الحركة في الصورة، ولا يتعرّف على الأشخاص. يتوقف عند إخفاء الروبوت أو التطبيق، ويحتاج تشغيلًا منك كل مرة.', 'Processed on your device, with no recording or image upload. It follows movement in the picture, not a person’s identity. It stops when the robot or app is hidden and needs a new action to start.', 'Cihazınızda işlenir; kayıt veya görüntü yükleme yapılmaz. Kişileri tanımaz, görüntüdeki hareketi takip eder. Robot veya uygulama gizlenince durur; yeniden başlatmak için dokunmanız gerekir.', 'Traitement sur votre appareil, sans enregistrement ni envoi d’images. Il suit les mouvements sans identifier les personnes. Il s’arrête lorsque le robot ou l’application est masqué et doit être relancé manuellement.', 'Обработка на устройстве, без записи и отправки изображений. Отслеживается движение, без распознавания личности. При скрытии робота или приложения камера выключается; повторный запуск выполняется вручную.'],
    enable: ['تشغيل الكاميرا لهذه الجلسة', 'Enable camera for this session', 'Bu oturum için kamerayı aç', 'Activer la caméra pour cette session', 'Включить камеру на этот сеанс'],
    disable: ['إيقاف الكاميرا', 'Stop camera', 'Kamerayı durdur', 'Arrêter la caméra', 'Выключить камеру'],
    preview: ['معاينة الكاميرا المحلية', 'Local camera preview', 'Yerel kamera önizlemesi', 'Aperçu local de la caméra', 'Локальный предпросмотр камеры'],
    off: ['الكاميرا متوقفة.', 'Camera is off.', 'Kamera kapalı.', 'La caméra est désactivée.', 'Камера выключена.'],
    requesting: ['بانتظار إذن الكاميرا… يمكنك الإيقاف لإلغاء الطلب.', 'Waiting for camera permission… Stop cancels this request.', 'Kamera izni bekleniyor… Durdur ile isteği iptal edebilirsiniz.', 'En attente de l’autorisation… Arrêter annule cette demande.', 'Ожидание разрешения камеры… Нажмите «Выключить», чтобы отменить запрос.'],
    tracking: ['الكاميرا تعمل؛ حرّك يدك أو رأسك ليتبع الروبوت الحركة.', 'Camera is on. Move your hand or head for the robot to follow the movement.', 'Kamera açık. Robotun takip etmesi için elinizi veya başınızı hareket ettirin.', 'La caméra est active. Bougez la main ou la tête pour que le robot suive le mouvement.', 'Камера включена. Двигайте рукой или головой, чтобы робот следил за движением.'],
    hidden: ['أُوقفت الكاميرا لأن الروبوت أو التطبيق أصبح مخفيًا. شغّلها مجددًا من هنا.', 'Camera stopped because the robot or app was hidden. Enable it here again.', 'Robot veya uygulama gizlendiği için kamera durdu. Buradan yeniden açın.', 'Caméra arrêtée car le robot ou l’application a été masqué. Réactivez-la ici.', 'Камера выключена после скрытия робота или приложения. Включите её здесь снова.'],
    ended: ['توقف اتصال الكاميرا. أعد تشغيلها من هنا.', 'Camera connection ended. Enable it here again.', 'Kamera bağlantısı sona erdi. Buradan yeniden açın.', 'La caméra s’est déconnectée. Réactivez-la ici.', 'Соединение с камерой прервано. Включите её здесь снова.'],
    denied: ['إذن الكاميرا مرفوض. اسمح بالكاميرا من إعدادات الموقع في المتصفح، ثم حاول مجددًا.', 'Camera permission was denied. Allow camera access in your browser’s site settings, then retry.', 'Kamera izni reddedildi. Tarayıcının site ayarlarından izin verip yeniden deneyin.', 'Accès à la caméra refusé. Autorisez-le dans les paramètres du site, puis réessayez.', 'Доступ к камере запрещён. Разрешите его в настройках сайта браузера и повторите.'],
    unsupported: ['الكاميرا غير متاحة هنا. افتح البرنامج عبر HTTPS في متصفح يدعم الكاميرا.', 'Camera access is unavailable here. Open the app over HTTPS in a camera-capable browser.', 'Kameraya burada erişilemiyor. Uygulamayı HTTPS üzerinden kamera destekleyen bir tarayıcıda açın.', 'Caméra indisponible ici. Ouvrez l’application en HTTPS dans un navigateur compatible.', 'Камера здесь недоступна. Откройте приложение по HTTPS в браузере с поддержкой камеры.'],
    missing: ['لم يتم العثور على كاميرا متاحة على الجهاز.', 'No available camera was found on this device.', 'Bu cihazda kullanılabilir kamera bulunamadı.', 'Aucune caméra disponible sur cet appareil.', 'На устройстве не найдена доступная камера.'],
    busy: ['الكاميرا مشغولة. أغلق التطبيق الآخر الذي يستخدمها، ثم حاول مجددًا.', 'Camera is busy. Close the other app using it, then retry.', 'Kamera meşgul. Kamerayı kullanan diğer uygulamayı kapatıp yeniden deneyin.', 'Caméra occupée. Fermez l’autre application qui l’utilise, puis réessayez.', 'Камера занята. Закройте другое приложение, использующее её, и повторите.'],
    failed: ['تعذّر تشغيل التتبّع. أوقفت الكاميرا؛ حاول مجددًا.', 'Movement tracking failed. Camera stopped; please retry.', 'Hareket takibi başlatılamadı. Kamera durdu; yeniden deneyin.', 'Le suivi a échoué. Caméra arrêtée ; réessayez.', 'Ошибка отслеживания. Камера выключена; повторите попытку.'],
    save: ['حفظ إعدادات الروبوت', 'Save robot settings', 'Robot ayarlarını kaydet', 'Enregistrer les réglages', 'Сохранить настройки робота'],
    saving: ['جارٍ الحفظ…', 'Saving…', 'Kaydediliyor…', 'Enregistrement…', 'Сохранение…'],
    saved: ['تم حفظ إعدادات الروبوت.', 'Robot settings saved.', 'Robot ayarları kaydedildi.', 'Réglages du robot enregistrés.', 'Настройки робота сохранены.'],
    changed: ['لديك تغييرات غير محفوظة.', 'You have unsaved changes.', 'Kaydedilmemiş değişiklikler var.', 'Des modifications ne sont pas enregistrées.', 'Есть несохранённые изменения.'],
    saveFailed: ['تعذّر الحفظ. بقيت الإعدادات السابقة كما هي؛ حاول مجددًا.', 'Could not save. Previous settings are unchanged; please retry.', 'Kaydedilemedi. Önceki ayarlar korundu; yeniden deneyin.', 'Enregistrement impossible. Les anciens réglages sont conservés ; réessayez.', 'Не удалось сохранить. Прежние настройки сохранены; повторите.'],
    voiceInstall: ["تنزيل Mark", "Download Mark", "Mark paketini indir", "Télécharger Mark", "Скачать Mark"],
    voiceCancel: ['إلغاء التنزيل', 'Cancel download', 'İndirmeyi iptal et', 'Annuler', 'Отменить'],
    voiceChecking: ['جارٍ فحص الحزمة على الجهاز…', 'Checking this device…', 'Cihazdaki paket kontrol ediliyor…', 'Vérification sur cet appareil…', 'Проверка пакета на устройстве…'],
    voiceReady: ['جاهز للعمل دون اتصال', 'Ready offline', 'Çevrimdışı kullanıma hazır', 'Prête hors ligne', 'Готов к работе без сети'],
    voiceMissing: ['غير مثبت', 'Not installed', 'Yüklü değil', 'Non installée', 'Не установлен'],
    voiceWebGPU: ["هذا الجهاز أو المتصفح لا يدعم تشغيل Mark المحلي. جرّب متصفحًا محدثًا على جهاز متوافق.", "This browser or device cannot run Mark locally. Try an updated browser on a compatible device.", "Bu tarayıcı veya cihaz Mark sesini yerel olarak çalıştıramıyor. Uyumlu bir cihazda güncel tarayıcı deneyin.", "Ce navigateur ou cet appareil ne peut pas exécuter Mark localement. Essayez un navigateur à jour sur un appareil compatible.", "Браузер или устройство не поддерживает локальный Mark. Попробуйте обновлённый браузер на совместимом устройстве."],
    voiceReferenceUnavailable: ["تشغيل Mark غير متاح الآن. أعد تحميل البرنامج ثم حاول مجددًا.", "Mark is unavailable right now. Reload the app and try again.", "Mark şu anda kullanılamıyor. Uygulamayı yeniden yükleyip tekrar deneyin.", "Mark est indisponible pour le moment. Rechargez l’application et réessayez.", "Mark сейчас недоступен. Перезагрузите приложение и повторите попытку."],
    voiceDownloading: ['جارٍ التنزيل…', 'Downloading…', 'İndiriliyor…', 'Téléchargement…', 'Загрузка…'],
    voiceError: ['تعذّر إكمال الحزمة. حاول مجددًا.', 'Could not complete the pack. Please retry.', 'Paket tamamlanamadı. Yeniden deneyin.', 'Impossible de terminer le téléchargement du pack. Réessayez.', 'Не удалось завершить загрузку пакета. Повторите попытку.'],
    voiceIntegrity: ['لم يطابق أحد ملفات الحزمة النسخة المطلوبة. أعد التنزيل.', 'A pack file did not match the required version. Download again.', 'Bir paket dosyası gereken sürümle eşleşmedi. Yeniden indirin.', 'Un fichier ne correspond pas à la version attendue. Relancez le téléchargement.', 'Файл пакета не соответствует требуемой версии. Загрузите снова.'],
    voiceDownloadFailed: ['تعذّر تنزيل أحد ملفات الحزمة. حاول مجددًا.', 'A pack file could not be downloaded. Please retry.', 'Paket dosyası indirilemedi. Yeniden deneyin.', 'Impossible de télécharger un fichier du pack. Réessayez.', 'Не удалось скачать файл пакета. Повторите попытку.'],
    voiceStorageFull: ["المساحة المتاحة لا تكفي لحفظ حزمة Mark. وفّر مساحة على الجهاز ثم حاول مجددًا.", "There is not enough storage for Mark. Free space on this device and try again.", "Mark için yeterli depolama alanı yok. Cihazda yer açıp yeniden deneyin.", "Espace insuffisant pour Mark. Libérez de l’espace sur cet appareil et réessayez.", "Недостаточно места для Mark. Освободите место на устройстве и повторите."],
    voiceStorageUnavailable: ['تعذّر الوصول إلى التخزين المحلي للصوت في هذا المتصفح.', 'Local voice storage is unavailable in this browser.', 'Bu tarayıcıda yerel ses depolamasına erişilemiyor.', 'Le stockage local des voix est indisponible dans ce navigateur.', 'Локальное хранилище голосов недоступно в этом браузере.'],
    voiceLocaleUnavailable: ['لا توجد حزمة متاحة لهذه اللغة.', 'No pack is available for this language.', 'Bu dil için paket yok.', 'Aucun pack disponible pour cette langue.', 'Для этого языка нет доступного пакета.'],
    voiceDownloadBusy: ['انتظر اكتمال التنزيل الجاري أو ألغِه أولًا.', 'Wait for the current download or cancel it first.', 'Mevcut indirmeyi bekleyin veya önce iptal edin.', 'Attendez la fin du téléchargement ou annulez-le d’abord.', 'Дождитесь текущей загрузки или сначала отмените её.'],
    voiceCancelled: ['أُلغي التنزيل. يمكنك المحاولة مجددًا.', 'Download cancelled. You can retry.', 'İndirme iptal edildi. Yeniden deneyebilirsiniz.', 'Téléchargement annulé. Vous pouvez réessayer.', 'Загрузка отменена. Можно повторить попытку.'],
    voicePhaseDownload: ['المرحلة: التنزيل', 'Stage: downloading', 'Aşama: indirme', 'Étape : téléchargement', 'Этап: загрузка'],
    voicePhaseVerify: ['المرحلة: التحقق من الملف', 'Stage: file verification', 'Aşama: dosya doğrulaması', 'Étape : vérification du fichier', 'Этап: проверка файла'],
    voicePhaseStore: ['المرحلة: الحفظ على الجهاز', 'Stage: saving on this device', 'Aşama: cihaza kaydetme', 'Étape : stockage sur l’appareil', 'Этап: сохранение на устройстве'],
    voicePhaseStorage: ['المرحلة: فحص التخزين على الجهاز', 'Stage: checking device storage', 'Aşama: cihaz depolamasını kontrol etme', 'Étape : vérification du stockage sur l’appareil', 'Этап: проверка хранилища устройства'],
    voiceUnsupported: ["هذا المتصفح لا يدعم تشغيل Mark المحلي. افتح البرنامج في متصفح متوافق.", "This browser cannot run Mark locally. Open the app in a compatible browser.", "Bu tarayıcı Mark sesini yerel olarak çalıştıramıyor. Uygulamayı uyumlu bir tarayıcıda açın.", "Ce navigateur ne peut pas exécuter Mark localement. Ouvrez l’application dans un navigateur compatible.", "Этот браузер не поддерживает локальный Mark. Откройте приложение в совместимом браузере."],
    voiceSource: ['المصدر', 'Source', 'Kaynak', 'Source', 'Источник'],
    voiceLicense: ['الترخيص', 'License', 'Lisans', 'Licence', 'Лицензия'],
  };
  const t = key => copy[key]?.[locales.indexOf(language())] || copy[key]?.[1] || key;
  const create = (tag, className) => { const node = document.createElement(tag); if (className) node.className = className; return node; };
  const textNodes = [];
  const text = (tag, key, className) => { const node = create(tag, className); textNodes.push([node, key]); return node; };
  const page = document.getElementById('page-settings');
  const tab = create('button', 'tab-btn'); tab.id = 'wf-settings-tab-robot'; tab.type = 'button';
  tab.setAttribute('onclick', "switchTab('robot')"); tab.setAttribute('aria-controls', 'stab-robot');
  const icon = create('span', 'wf-robot-settings-icon'); icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="3" y="6" width="18" height="15" rx="6"/><path d="M12 3v3M8 11v2m8-2v2m-8 4q4 3 8 0"/></svg>';
  tab.append(icon, text('span', 'title')); tabs.append(tab);
  const panel = create('section', 'wf-robot-settings'); panel.id = 'stab-robot'; panel.style.display = 'none';
  panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', tab.id);
  content.append(panel);
  panel.append(text('p', 'hint', 'wf-robot-settings-hint'));
  const preview = create('div', 'wf-robot-settings-preview'); preview.id = 'wfRobotSettingsPreview';
  preview.setAttribute('aria-hidden', 'true'); preview.dataset.expression = 'calm'; panel.append(preview);
  const form = create('form', 'wf-robot-settings-form'); panel.append(form);
  const preferencesFieldset = create('fieldset', 'wf-robot-preferences'); form.append(preferencesFieldset);
  const fields = {};
  const speechControls = create('section', 'wf-robot-speech-controls');
  speechControls.append(text('h3', 'speechTitle'));
  const selectedVoice = create('strong', 'wf-robot-selected-voice');
  speechControls.append(selectedVoice);
  const voiceSection = create('section', 'wf-robot-voice-settings');
  const voiceList = create('div', 'wf-robot-voice-list'); voiceSection.append(voiceList); speechControls.append(voiceSection);
  for (const key of ['speechEnabled']) {
    const row = create('label', 'wf-robot-preference'), input = create('input'); input.type = 'checkbox'; input.name = key;
    input.addEventListener('change', changed); row.append(input, text('span', key)); speechControls.append(row); fields[key] = input;
  }
  const rangeOutputs = {};
  for (const [key, min, max, step] of [['speechRate', .75, 1.25, .05], ['speechVolume', 0, 1, .05]]) {
    const row = create('label', 'wf-robot-speech-range'), input = create('input'), output = create('output');
    input.type = 'range'; input.name = key; input.min = min; input.max = max; input.step = step;
    input.addEventListener('input', () => { output.textContent = Math.round(Number(input.value) * 100) + '%'; changed(); });
    row.append(text('span', key), output, input); speechControls.append(row); fields[key] = input; rangeOutputs[key] = output;
  }
  speechControls.append(text('p', 'speechHint', 'wf-robot-camera-hint'));
  const speechActions = create('div', 'wf-robot-speech-actions'), previewSpeech = text('button', 'speechPreview'), previewReading = text('button', 'speechReadingPreview'), stopSpeech = text('button', 'speechStop');
  previewSpeech.type = previewReading.type = stopSpeech.type = 'button';
  previewReading.dataset.wfReadingPreview = 'true';
  previewSpeech.addEventListener('click', event => window.WFProgramSpeech?.preview?.({event}));
  previewReading.addEventListener('click', previewReadingClick);
  stopSpeech.addEventListener('click', event => { if (event.isTrusted) window.WFProgramSpeech?.stop?.(); });
  const readingStatus = create('p', 'wf-robot-reading-preview-status'); readingStatus.setAttribute('role', 'status');
  speechActions.append(previewReading, previewSpeech, stopSpeech); speechControls.append(speechActions, readingStatus, text('p', 'markScope', 'wf-robot-recording-hint')); preferencesFieldset.append(speechControls);
  const movementSection = create('details', 'wf-robot-movement-settings');
  movementSection.append(text('summary', 'movementTitle')); preferencesFieldset.append(movementSection);
  for (const [key, label] of [['autoExpressions', 'expressions'], ['idleMotion', 'idle']]) {
    const row = create('label', 'wf-robot-preference'); const input = create('input'); input.type = 'checkbox'; input.name = key;
    input.addEventListener('change', changed); row.append(input, text('span', label)); movementSection.append(row); fields[key] = input;
  }
  const sensitivityLabel = create('label', 'wf-robot-sensitivity');
  const sensitivity = create('select'); sensitivity.name = 'trackingSensitivity';
  for (const value of ['low', 'normal', 'high']) { const option = text('option', value); option.value = value; sensitivity.append(option); }
  sensitivity.addEventListener('change', changed); sensitivityLabel.append(text('span', 'sensitivity'), sensitivity);
  movementSection.append(sensitivityLabel); fields.trackingSensitivity = sensitivity;
  const saveRow = create('div', 'wf-robot-settings-save');
  const save = text('button', 'save', 'wf-robot-settings-save-button'); save.type = 'submit';
  const saveStatus = create('p', 'wf-robot-settings-feedback'); saveStatus.setAttribute('role', 'status'); saveStatus.setAttribute('aria-live', 'polite');
  saveRow.append(save, saveStatus); form.append(saveRow);
  const cameraSection = create('details', 'wf-robot-camera-settings'); cameraSection.append(text('summary', 'camera'), text('p', 'privacy', 'wf-robot-camera-hint'));
  const video = create('video', 'wf-robot-camera-preview'); video.muted = true; video.playsInline = true; video.autoplay = false; video.hidden = true;
  video.setAttribute('playsinline', ''); video.setAttribute('muted', ''); video.setAttribute('aria-label', t('preview'));
  const cameraButton = create('button', 'wf-robot-camera-toggle'); cameraButton.type = 'button'; cameraButton.setAttribute('role', 'switch');
  const cameraStatus = create('p', 'wf-robot-camera-status'); cameraStatus.id = 'wfRobotCameraStatus'; cameraStatus.setAttribute('role', 'status'); cameraStatus.setAttribute('aria-live', 'polite');
  cameraButton.setAttribute('aria-describedby', cameraStatus.id);
  cameraSection.append(video, cameraButton, cameraStatus); panel.append(cameraSection);
  const voiceRows = new Map(), downloads = new Map(), preparations = new Set(), preparationErrors = new Set();
  let dirty = false, saveState = '', latestMotion = {active: false, state: 'off', x: 0, y: 0}, disposed = false;
  let readingRequested = false, readingStarted = false, readingStatusKey = '', readingVoiceName = '', readingMessage = '';
  const getPreferences = () => normalize(state()?.settings?.robot);
  function setReadingStatus(key, voiceName = '', message = '') {
    readingStatusKey = key; readingVoiceName = voiceName; readingMessage = typeof message === 'string' ? message.trim().slice(0,500) : '';
    readingStatus.textContent = (readingMessage || t(key)) + (voiceName ? ' · ' + voiceName : '');
  }
  function previewReadingClick(event) {
    if (event.isTrusted !== true || disposed) return;
    if (dirty) { setReadingStatus('previewSaveFirst'); return; }
    const preferences = getPreferences();
    if (!preferences.speechEnabled || preferences.speechVolume === 0) { setReadingStatus('previewDisabled'); return; }
    const entry = voicePackEntries(null, window.WFReferenceVoice, language())[0];
    if (!entry.status.ready) {
      setReadingStatus(entry.status.state === 'unsupported' ? voiceStatusKey(entry.status) : 'previewInstall');
      renderVoicePacks(); return;
    }
    const samples = {
      ar: 'أهلين، أنا مارك. هاي تجربة للقراءة باللهجة السورية. المبلغ التجريبي مليون دولار أمريكي وخمسة سنتات. هيك خلصت التجربة.',
      en: 'This is a reading voice sample. The example amount is one million US dollars and five cents. The sample is complete.',
      tr: 'Bu bir okuma sesi örneğidir. Örnek tutar bir milyon Amerikan doları ve beş senttir. Ses örneği tamamlandı.',
      fr: 'Ceci est un exemple de voix de lecture. Le montant d’exemple est un million de dollars américains et cinq cents. L’extrait est terminé.',
      ru: 'Это пример голоса чтения. Пример суммы: один миллион долларов США и пять центов. Пример завершён.'
    };
    const sample = samples[language()];
    readingRequested = true; readingStarted = false;
    let accepted = false;
    try { accepted = window.WFProgramSpeech?.speak?.({text: sample, event, locale: language()}) === true; } catch (_) {}
    if (accepted) {
      if (!readingStarted) setReadingStatus('previewPreparing');
    } else {
      readingRequested = false;
      setReadingStatus('previewFailed'); renderVoicePacks();
    }
  }
  function readingStateChanged(event) {
    if (!readingRequested) return;
    const current = event.detail || {};
    if (current.active) {
      readingStarted = true;
      const key = current.state === 'paused' || current.paused ? 'previewPaused' : current.state === 'speaking' ? 'previewSpeaking' : 'previewPreparing';
      setReadingStatus(key, current.voiceName || '', key === 'previewPreparing' ? current.message : '');
    } else if (readingStarted) {
      const key = current.state === 'ready' ? 'previewFinished' : current.state === 'stopped' ? 'previewStopped' : 'previewFailed';
      setReadingStatus(key, '', key === 'previewFailed' ? current.message : '');
      readingRequested = readingStarted = false;
    }
  }
  const store = createPreferenceStore({getState: state, connect: () => initDB()});
  function isVisible() {
    if (disposed || document.hidden) return false;
    const dialog = document.getElementById('wfSettingsDialog');
    const settingsVisible = page?.classList.contains('active') && panel.style.display !== 'none' && (!dialog || dialog.open);
    const face = document.getElementById('wfGreetingRobot');
    const faceVisible = face?.getAttribute('aria-hidden') === 'false' && document.getElementById('page-dashboard')?.classList.contains('active');
    return !!(settingsVisible || faceVisible);
  }
  function updatePreview() {
    const visible = page?.classList.contains('active') && panel.style.display !== 'none';
    preview.setAttribute('aria-hidden', String(!visible));
    preview.dataset.idleMotion = String(getPreferences().idleMotion);
    preview.dataset.tracking = String(latestMotion.active && visible);
    preview.style.setProperty('--wf-robot-look-x', `${latestMotion.active ? latestMotion.x * 22 : 0}px`);
    preview.style.setProperty('--wf-robot-look-y', `${latestMotion.active ? latestMotion.y * 12 : 0}px`);
  }
  function cameraUI() {
    const running = latestMotion.active || latestMotion.state === 'requesting';
    cameraButton.textContent = t(running ? 'disable' : 'enable'); cameraButton.setAttribute('aria-checked', String(running));
    cameraStatus.textContent = t(latestMotion.state); video.hidden = !latestMotion.active;
    video.setAttribute('aria-label', t('preview'));
  }
  const tracker = createMotionTracker({mediaDevices: navigator.mediaDevices, secure: window.isSecureContext !== false, video, canvas: create('canvas'),
    isVisible, getSensitivity: () => getPreferences().trackingSensitivity,
    onUpdate: motion => { const previousState = latestMotion.state; latestMotion = motion; updatePreview();
      if (previousState !== motion.state) cameraUI();
      window.dispatchEvent(new CustomEvent('wf-robot-motion', {detail: motion}));
    },
  });
  cameraButton.addEventListener('click', event => {
    if (tracker.active || tracker.state === 'requesting') tracker.stop('off');
    else tracker.start({userInitiated: event.isTrusted === true});
  });
  function changed() { dirty = true; saveState = 'changed'; saveStatus.textContent = t(saveState); }
  function syncFields() {
    const preferences = getPreferences();
    fields.autoExpressions.checked = preferences.autoExpressions;
    fields.idleMotion.checked = preferences.idleMotion;
    fields.trackingSensitivity.value = preferences.trackingSensitivity;
    fields.speechEnabled.checked = preferences.speechEnabled;
    for (const key of ['speechRate', 'speechVolume']) fields[key].value = preferences[key];
    for (const key of ['speechRate', 'speechVolume']) rangeOutputs[key].textContent = Math.round(preferences[key] * 100) + '%';
  }
  function publishPreferences() {
    window.dispatchEvent(new CustomEvent('wf-robot-preferences', {detail: {preferences: getPreferences()}}));
    updatePreview();
  }
  function translate() {
    for (const [node, key] of textNodes) node.textContent = t(key);
    selectedVoice.textContent = t('reference');
    if (readingStatusKey) setReadingStatus(readingStatusKey, readingVoiceName, readingMessage);
    if (store.busy) save.textContent = t('saving');
    saveStatus.textContent = saveState ? t(saveState) : '';
    cameraUI(); updatePreview(); renderVoicePacks();
  }
  function renderVoicePacks() {
    const entries = voicePackEntries(null, window.WFReferenceVoice, language());
    voiceSection.hidden = false;
    const anyDownloading = entries.some(entry => entry.status.state === 'downloading');
    for (const entry of entries) {
      const {pack, key, backend} = entry;
      let row = voiceRows.get(key);
      if (!row) {
        const card = create('div', 'wf-robot-voice-row'), heading = create('strong'), action = create('button', 'wf-robot-voice-action');
        const note = create('p', 'wf-robot-reference-hint'), status = create('small', 'wf-robot-voice-status'), engine = create('p', 'wf-robot-engine-status'), progress = create('progress'), links = create('div', 'wf-robot-voice-links');
        card.dataset.backend = backend;
        status.setAttribute('role', 'status'); engine.setAttribute('role', 'status');
        action.type = 'button'; progress.max = 1;
        card.append(heading, action, status, engine, note, progress, links); voiceList.append(card);
        row = {card, heading, action, note, status, engine, progress, links, entry}; voiceRows.set(key, row);
        action.addEventListener('click', async event => {
          if (!event.isTrusted || disposed) return;
          const {api, locale, key} = row.entry;
          if (typeof api?.getStatus !== 'function' || preparations.has(key)) return;
          const current = api.getStatus(locale);
          if (current.state === 'downloading') { downloads.get(key)?.abort(); return; }
          if (current.state === 'unsupported' || current.state === 'checking' || current.engineReady) return;
          action.disabled = true;
          try {
            if (current.ready) {
              preparations.add(key); preparationErrors.delete(key); renderVoicePacks();
              if (typeof api.prepare !== 'function') throw new Error('engine-unavailable');
              await api.prepare(locale);
              if (!api.getStatus(locale).engineReady) throw new Error('engine-unavailable');
            }
            else {
              const controller = new AbortController(); downloads.set(key, controller);
              await api.download(locale, {signal: controller.signal, onProgress: renderVoicePacks});
            }
          } catch (_) { if (preparations.has(key)) preparationErrors.add(key); }
          finally { preparations.delete(key); downloads.delete(key); action.disabled = false; if (!disposed) renderVoicePacks(); }
        });
      }
      row.entry = entry;
      row.heading.textContent = t('markPack');
      const current = entry.status;
      const installed = current.installed === true || current.ready === true;
      const statusKey = voiceStatusKey(current);
      const mb = Math.ceil((Number(current.total || 0) || Number(pack.bytes || 0) + Number(pack.sharedBytes || 0)) / 1000000);
      row.note.textContent = t(installed ? 'referenceInstalledHint' : 'referenceHint').replace('{size}', new Intl.NumberFormat(language()).format(mb || 922));
      const phaseKey = voicePhaseKey(current);
      row.status.textContent = t(installed ? 'voiceInstalled' : statusKey) + (current.state === 'error' && phaseKey ? ` ${t(phaseKey)}.` : '') +
        (!current.ready && current.state !== 'error' && current.state !== 'unsupported' && mb ? ` · ${mb} MB` : '');
      if (current.engineReady) preparationErrors.delete(key);
      const engineState = current.state === 'unsupported' ? 'unsupported' : preparations.has(key) ? 'preparing' :
        current.engineReady ? 'ready' : current.engineError || preparationErrors.has(key) ? 'error' :
        ['loading', 'initializing'].includes(current.engineState) ? 'preparing' : 'cold';
      row.engine.hidden = !installed;
      row.engine.dataset.state = engineState;
      row.engine.dataset.reason = String(current.engineError || (preparationErrors.has(key) ? 'engine-failed' : ''));
      row.engine.textContent = t(engineState === 'unsupported' ? statusKey : {cold:'voiceEngineCold', preparing:'voiceEnginePreparing', ready:'voiceEngineReady', error:'voiceEngineFailed'}[engineState]);
      const file = current.fileId || current.assetId || current.asset?.id || current.file?.id || (typeof current.file === 'string' ? current.file : '');
      for (const element of [row.status, row.progress]) {
        element.dataset.state = String(current.state || '');
        element.dataset.reason = String(current.reason || '');
        element.dataset.loaded = String(Number.isFinite(current.loaded) ? current.loaded : 0);
        element.dataset.total = String(Number.isFinite(current.total) ? current.total : 0);
        element.dataset.phase = String(current.phase || '');
        element.dataset.stage = String(current.stage || '');
        element.dataset.errorName = String(current.errorName || '');
        element.dataset.file = String(file || '');
      }
      row.action.textContent = t(current.state === 'downloading' ? 'voiceCancel' : preparations.has(key) ? 'voiceEnginePreparing' : current.ready ? 'voicePrepare' : 'voiceInstall');
      row.action.setAttribute('aria-label', `${row.action.textContent}: ${row.heading.textContent}`);
      row.action.hidden = installed && (current.engineReady || current.state === 'unsupported') && !preparations.has(key);
      row.action.disabled = preparations.has(key) || packActionDisabled(current, anyDownloading, downloads.has(key));
      row.progress.hidden = current.state !== 'downloading';
      row.progress.setAttribute('aria-label', `${t('voiceDownloading')} ${row.heading.textContent}`);
      if (current.total > 0) row.progress.value = Math.min(1, Math.max(0, current.loaded / current.total));
      else row.progress.removeAttribute('value');
      if (row.translatedLocale !== language()) {
        row.translatedLocale = language(); row.links.replaceChildren();
        for (const [key, href] of [['voiceSource', pack.sourceURL], ['voiceLicense', pack.licenseURL]]) {
          if (typeof href !== 'string' || !href.startsWith('https://')) continue;
          const link = create('a'); link.href = href; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = t(key); row.links.append(link);
        }
      }
    }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (store.busy) return;
    preferencesFieldset.disabled = true; save.disabled = true; save.textContent = t('saving'); saveState = 'saving'; saveStatus.textContent = t(saveState);
    try {
      await store.save({autoExpressions: fields.autoExpressions.checked, idleMotion: fields.idleMotion.checked, trackingSensitivity: fields.trackingSensitivity.value,
        speechEnabled: fields.speechEnabled.checked, continuousSpeech: false,
        speechRate: Number(fields.speechRate.value), speechVolume: Number(fields.speechVolume.value),
        arabicDialect: 'sy', speechBackend: 'reference'});
      dirty = false; saveState = 'saved'; publishPreferences();
    } catch (_) { saveState = 'saveFailed'; }
    finally { preferencesFieldset.disabled = false; save.disabled = false; translate(); }
  });
  function populatePreview() {
    const display = document.querySelector('#wfGreetingRobot .wf-robot-display');
    if (display && !preview.firstChild) preview.append(display.cloneNode(true));
  }
  function checkVisibility() { tracker.checkVisibility(); updatePreview(); }
  function hook(name, callback) {
    const original = window[name];
    if (typeof original !== 'function') return;
    window[name] = function(...args) { const result = original.apply(this, args); callback(...args); return result; };
  }
  hook('switchTab', key => {
    panel.style.display = key === 'robot' ? 'block' : 'none'; tab.classList.toggle('active', key === 'robot');
    if (key === 'robot') { if (!dirty) syncFields(); translate(); populatePreview(); }
    checkVisibility();
  });
  hook('loadSettingsToForm', () => { if (!dirty) syncFields(); translate(); publishPreferences(); });
  hook('applyTr', translate);
  const observer = new MutationObserver(checkVisibility);
  observer.observe(page, {attributes: true, attributeFilter: ['class']});
  const dashboard = document.getElementById('page-dashboard');
  if (dashboard) observer.observe(dashboard, {attributes: true, childList: true, subtree: true, attributeFilter: ['class', 'aria-hidden']});
  observer.observe(panel, {attributes: true, attributeFilter: ['style']});
  // The dialog is created after this module by settings-navigation.js.
  const dialogObserver = new MutationObserver(() => {
    const dialog = document.getElementById('wfSettingsDialog');
    if (!dialog || dialog.dataset.wfRobotObserved) return;
    dialog.dataset.wfRobotObserved = 'true';
    observer.observe(dialog, {attributes: true, attributeFilter: ['open']});
    dialog.addEventListener('close', checkVisibility); dialogObserver.disconnect();
  });
  dialogObserver.observe(workspace, {childList: true});
  const languageObserver = new MutationObserver(() => { tracker.stop('off'); translate(); });
  languageObserver.observe(root, {attributes: true, attributeFilter: ['lang']});
  document.addEventListener('visibilitychange', checkVisibility);
  window.addEventListener('wf-robot-ready', populatePreview);
  window.addEventListener('wf-reference-voice-change', renderVoicePacks);
  window.addEventListener('wf-reference-voice-progress', renderVoicePacks);
  window.addEventListener('wf-reference-voice-loading', renderVoicePacks);
  window.addEventListener('wf-program-speech-state', readingStateChanged);
  window.addEventListener('pagehide', event => {
    tracker.stop('hidden');
    if (!event.persisted) { disposed = true; tracker.destroy(); observer.disconnect(); dialogObserver.disconnect(); languageObserver.disconnect();
      for (const controller of downloads.values()) controller.abort(); downloads.clear();
      document.removeEventListener('visibilitychange', checkVisibility); window.removeEventListener('wf-robot-ready', populatePreview);
      window.removeEventListener('wf-reference-voice-change', renderVoicePacks); window.removeEventListener('wf-reference-voice-progress', renderVoicePacks);
      window.removeEventListener('wf-reference-voice-loading', renderVoicePacks);
      window.removeEventListener('wf-program-speech-state', readingStateChanged); }
  });
  window.WFRobotSettings = {getPreferences, stopTracking: () => tracker.stop('off'), checkVisibility};
  syncFields(); translate(); populatePreview(); publishPreferences();
})();
