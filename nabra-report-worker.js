/* Arabic report speech, exclusively local. This is a module worker.
   Runtime, phonemizer, model and voice bytes are read from CacheStorage and
   SHA-256 checked before execution. There is no network inference or fallback. */
import './offline-voice.js?v=5';
import { prepareArabicPhonemes, validateArabicWaveform } from './nabra-phonemizer.js?v=1';

const core = self.WFOfflineVoiceCore;
let runtimeReady = null, sessionReady = null, session = null, ort = null, phonemizer = null, styles = null, working = false;
const objectURLs = new Set();

// The bundled runtimes receive their binaries directly. Unexpected fetches,
// including a missing asset's fallback request, cannot send report content.
self.fetch = () => Promise.reject(core.error('offline-only'));

async function bytesFor(asset) {
  if (!asset || typeof asset.url !== 'string') throw core.error('model-unsupported');
  const cache = await caches.open(core.CACHE), response = await cache.match(asset.url);
  if (!response || !response.ok) throw core.error('pack-not-installed');
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength !== asset.bytes || core.hex(await crypto.subtle.digest('SHA-256', bytes)) !== asset.sha256) {
    throw core.error('integrity-failed');
  }
  return bytes;
}

function moduleURL(bytes) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'text/javascript' }));
  objectURLs.add(url);
  return url;
}

async function loadRuntime(voice) {
  if (runtimeReady) return runtimeReady;
  runtimeReady = (async () => {
    const assets = Object.fromEntries((voice.runtime || []).map(asset => [asset.id, asset]));
    const [runtimeCode, runtimeBinary, phonemizerCode] = await Promise.all([
      bytesFor(assets['nabra-ort-js']), bytesFor(assets['nabra-ort-wasm']), bytesFor(assets['nabra-g2p'])
    ]);
    // This ORT bundle embeds its WASM factory. Supplying wasmBinary avoids a
    // further .mjs/.wasm load and works without cross-origin isolation.
    ort = await import(moduleURL(runtimeCode));
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;
    ort.env.wasm.wasmBinary = new Uint8Array(runtimeBinary);
    ort.env.logLevel = 'error';
    phonemizer = await import(moduleURL(phonemizerCode));
    await phonemizer.initEspeak();
  })();
  try { await runtimeReady; }
  catch (problem) { runtimeReady = null; throw problem; }
}

async function loadVoice() {
  if (sessionReady) return sessionReady;
  sessionReady = (async () => {
    const voice = core.catalog.find(item => item.locale === 'ar' && item.engine === 'nabra');
    if (!voice) throw core.error('locale-unsupported');
    await loadRuntime(voice);
    const files = Object.fromEntries(voice.files.map(asset => [asset.id, asset]));
    const [model, voiceBytes] = await Promise.all([bytesFor(files.model), bytesFor(files.voice)]);
    if (voiceBytes.byteLength !== 510 * 256 * 4) throw core.error('model-unsupported');
    styles = new Float32Array(voiceBytes);
    if (!styles.every(Number.isFinite)) throw core.error('model-unsupported');
    session = await ort.InferenceSession.create(model, {
      executionProviders: ['wasm'], graphOptimizationLevel: 'all', logSeverityLevel: 3
    });
    if (!['input_ids', 'style', 'speed'].every(name => session.inputNames.includes(name)) ||
        !session.outputNames.includes('waveform')) throw core.error('model-unsupported');
  })();
  try { await sessionReady; }
  catch (problem) {
    sessionReady = null;
    if (session) { try { await session.release(); } catch (_) {} session = null; }
    styles = null;
    throw problem;
  }
}

self.onmessage = async event => {
  const { id, locale, text } = event.data || {};
  if (working) { self.postMessage({ id, error: 'speech-busy' }); return; }
  if (locale !== 'ar') { self.postMessage({ id, error: 'locale-unsupported' }); return; }
  if (typeof text !== 'string' || !text.trim() || text.length > 800) { self.postMessage({ id, error: 'text-length' }); return; }
  working = true;
  let feeds = null, result = null;
  try {
    await loadVoice();
    const { ids, styleIndex } = await prepareArabicPhonemes(text, phonemizer.phonemize, phonemizer.tokenize);
    feeds = {
      input_ids: new ort.Tensor('int64', BigInt64Array.from(ids, BigInt), [1, ids.length]),
      style: new ort.Tensor('float32', styles.slice(styleIndex * 256, (styleIndex + 1) * 256), [1, 256]),
      speed: new ort.Tensor('float32', Float32Array.of(0.94), [1])
    };
    result = await session.run(feeds);
    const samples = validateArabicWaveform(result.waveform?.data);
    self.postMessage({ id, blob: new Blob([core.pcmToWav(samples, 24000)], { type: 'audio/wav' }) });
  } catch (problem) {
    const allowed = ['pack-not-installed', 'integrity-failed', 'locale-unsupported', 'text-length', 'phonemizer-failed', 'model-unsupported', 'offline-only'];
    self.postMessage({ id, error: allowed.includes(problem?.code) ? problem.code : 'engine-failed' });
  } finally {
    for (const tensor of Object.values(feeds || {})) tensor.dispose();
    for (const tensor of Object.values(result || {})) tensor.dispose();
    working = false;
  }
};
