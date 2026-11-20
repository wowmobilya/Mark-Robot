/* Local, bounded loudness matching for generated mono PCM16 speech.
   Original identity recordings are never rewritten. Measurement follows the
   K-weighting and gating approach of ITU-R BS.1770; the short-phrase fallback
   and finite 4x peak interpolation are approximate, not a certified EBU meter.
   Standard: https://www.itu.int/rec/R-REC-BS.1770/en
   Filter parameterization: https://github.com/jiixyj/libebur128
   No network, model, AudioContext, or native executable is required. */
(function (root) {
  'use strict';

  // Measured from the saved, unmodified identity MP3s with FFmpeg ebur128.
  const TARGETS = Object.freeze({ ar: -16.3, tr: -16.2, en: -16.6, fr: -15.4, ru: -16.1 });
  const MAX_GAIN_DB = 12, MIN_GAIN_DB = -24, MIN_LOUDNESS = -50;
  const PEAK_CEILING_DB = -1.2, CEILING = 10 ** (PEAK_CEILING_DB / 20);
  const MAX_PCM_BYTES = 16 * 1024 * 1024, MAX_SECONDS = 150;
  const BATCH = 16384, RADIUS = 6;
  const normalized = new WeakMap();
  const fail = code => Object.assign(new Error(code), { code });
  const checkAbort = signal => {
    if (signal?.aborted) throw Object.assign(fail('cancelled'), { name: 'AbortError' });
  };
  const toDb = value => value > 0 ? 20 * Math.log10(value) : -Infinity;
  const localeKey = locale => String(locale || 'ar').toLowerCase().split(/[-_]/)[0];
  async function yieldToUI(signal) {
    checkAbort(signal);
    if (typeof root.scheduler?.yield === 'function') await root.scheduler.yield();
    else await new Promise(resolve => setTimeout(resolve, 0));
    checkAbort(signal);
  }

  async function readWav(blob, signal) {
    checkAbort(signal);
    if (!blob || !Number.isSafeInteger(blob.size) || blob.size < 46 ||
        typeof blob.slice !== 'function' || typeof blob.arrayBuffer !== 'function') throw fail('invalid-audio');
    const pcmBytes = blob.size - 44;
    if (pcmBytes > MAX_PCM_BYTES) throw fail('speech-too-long');
    const header = new Uint8Array(await blob.slice(0, 44).arrayBuffer());
    checkAbort(signal);
    if (header.byteLength !== 44) throw fail('invalid-audio');
    const h = new DataView(header.buffer, header.byteOffset, header.byteLength);
    const label = (offset, text) => [...text].every((letter, index) => header[offset + index] === letter.charCodeAt(0));
    const sampleRate = h.getUint32(24, true);
    if (!label(0, 'RIFF') || !label(8, 'WAVE') || !label(12, 'fmt ') || !label(36, 'data') ||
        h.getUint32(4, true) !== blob.size - 8 || h.getUint32(16, true) !== 16 ||
        h.getUint16(20, true) !== 1 || h.getUint16(22, true) !== 1 ||
        h.getUint16(32, true) !== 2 || h.getUint16(34, true) !== 16 ||
        h.getUint32(40, true) !== pcmBytes || pcmBytes % 2 || sampleRate < 8000 || sampleRate > 96000 ||
        h.getUint32(28, true) !== sampleRate * 2) throw fail('invalid-audio');
    const length = pcmBytes / 2;
    if (length / sampleRate > MAX_SECONDS) throw fail('speech-too-long');
    const buffer = await blob.arrayBuffer();
    checkAbort(signal);
    if (buffer.byteLength !== blob.size) throw fail('invalid-audio');
    const view = new DataView(buffer), samples = new Float32Array(length);
    for (let start = 0; start < length; start += BATCH) {
      const end = Math.min(length, start + BATCH);
      for (let i = start; i < end; i++) samples[i] = view.getInt16(44 + i * 2, true) / 32768;
      await yieldToUI(signal);
    }
    return { buffer, view, samples, sampleRate };
  }

  function kWeighting(sampleRate) {
    // Bilinear high shelf followed by the RLB high-pass section. These design
    // frequencies/Q values retain the weighting at each supported sample rate.
    const shelfK = Math.tan(Math.PI * 1681.974450955533 / sampleRate);
    const shelfQ = 0.7071752369554196;
    const high = 10 ** (3.999843853973347 / 20), middle = high ** 0.4996667741545416;
    const shelfDen = 1 + shelfK / shelfQ + shelfK * shelfK;
    const b0 = (high + middle * shelfK / shelfQ + shelfK * shelfK) / shelfDen;
    const b1 = 2 * (shelfK * shelfK - high) / shelfDen;
    const b2 = (high - middle * shelfK / shelfQ + shelfK * shelfK) / shelfDen;
    const a1 = 2 * (shelfK * shelfK - 1) / shelfDen;
    const a2 = (1 - shelfK / shelfQ + shelfK * shelfK) / shelfDen;
    const highPassK = Math.tan(Math.PI * 38.13547087602444 / sampleRate);
    const highPassDen = 1 + highPassK / 0.5003270373238773 + highPassK * highPassK;
    const c1 = 2 * (highPassK * highPassK - 1) / highPassDen;
    const c2 = (1 - highPassK / 0.5003270373238773 + highPassK * highPassK) / highPassDen;
    let s1 = 0, s2 = 0, p1 = 0, p2 = 0;
    return input => {
      const shelf = b0 * input + s1;
      s1 = b1 * input - a1 * shelf + s2;
      s2 = b2 * input - a2 * shelf;
      const weighted = shelf + p1;
      p1 = -2 * shelf - c1 * weighted + p2;
      p2 = shelf - c2 * weighted;
      return weighted;
    };
  }

  async function loudness(samples, sampleRate, signal) {
    const window = Math.min(samples.length, Math.max(1, Math.round(sampleRate * 0.4)));
    const hop = Math.max(1, Math.round(sampleRate * 0.1));
    const energyRing = new Float64Array(window), blocks = [], filter = kWeighting(sampleRate);
    let energy = 0, samplePeak = 0;
    for (let start = 0; start < samples.length; start += BATCH) {
      const end = Math.min(samples.length, start + BATCH);
      for (let i = start; i < end; i++) {
        samplePeak = Math.max(samplePeak, Math.abs(samples[i]));
        const filtered = filter(samples[i]), square = filtered * filtered, slot = i % window;
        energy += square - energyRing[slot]; energyRing[slot] = square;
        if (i + 1 >= window && (i + 1 - window) % hop === 0) blocks.push(Math.max(0, energy / window));
      }
      await yieldToUI(signal);
    }
    const absoluteGate = 10 ** ((-70 + 0.691) / 10);
    let sum = 0, count = 0;
    for (const block of blocks) if (block >= absoluteGate) { sum += block; count++; }
    if (!count) return { lufs: -Infinity, samplePeak };
    const gate = Math.max(absoluteGate, sum / count * 0.1);
    sum = 0; count = 0;
    for (const block of blocks) if (block >= gate) { sum += block; count++; }
    return { lufs: count && sum > 0 ? -0.691 + 10 * Math.log10(sum / count) : -Infinity, samplePeak };
  }

  const sinc = value => Math.abs(value) < 1e-12 ? 1 : Math.sin(Math.PI * value) / (Math.PI * value);
  const peakFilters = [0.25, 0.5, 0.75].map(phase => {
    const coefficients = [];
    for (let offset = 1 - RADIUS; offset <= RADIUS; offset++) {
      const distance = phase - offset;
      coefficients.push(Math.abs(distance) < RADIUS ? sinc(distance) * sinc(distance / RADIUS) : 0);
    }
    const sum = coefficients.reduce((total, value) => total + value, 0);
    return coefficients.map(value => value / sum);
  });

  function interpolatedPeak(samples, index) {
    let peak = Math.abs(samples[index] || 0);
    for (const coefficients of peakFilters) {
      let value = 0;
      for (let tap = 0; tap < coefficients.length; tap++) {
        const at = index + tap + 1 - RADIUS;
        if (at >= 0 && at < samples.length) value += samples[at] * coefficients[tap];
      }
      peak = Math.max(peak, Math.abs(value));
    }
    return peak;
  }

  async function peakLevel(samples, signal) {
    let peak = 0;
    // Include zero-padded edge reconstruction, not only the stored samples.
    for (let start = -RADIUS; start < samples.length + RADIUS; start += BATCH) {
      const end = Math.min(samples.length + RADIUS, start + BATCH);
      for (let i = start; i < end; i++) peak = Math.max(peak, interpolatedPeak(samples, i));
      await yieldToUI(signal);
    }
    return peak;
  }

  async function limit(samples, sampleRate, gain, signal) {
    const ahead = Math.max(RADIUS * 2, Math.round(sampleRate * 0.005));
    const capacity = ahead + 2, positions = new Int32Array(capacity), peaks = new Float64Array(capacity);
    const attack = Math.exp(-1 / (sampleRate * 0.0005)), release = Math.exp(-1 / (sampleRate * 0.075));
    let head = 0, tail = 0, size = 0, next = 0, envelope = 1, minimum = 1;
    for (let start = 0; start < samples.length; start += BATCH) {
      const end = Math.min(samples.length, start + BATCH);
      for (let i = start; i < end; i++) {
        while (size && positions[head] < i) { head = (head + 1) % capacity; size--; }
        while (next < samples.length && next <= i + ahead) {
          // Future interpolation reads only untouched input: the lookahead is
          // longer than the FIR radius, so this pass can safely work in place.
          const peak = interpolatedPeak(samples, next) * gain;
          while (size && peaks[(tail + capacity - 1) % capacity] <= peak) { tail = (tail + capacity - 1) % capacity; size--; }
          positions[tail] = next++; peaks[tail] = peak; tail = (tail + 1) % capacity; size++;
        }
        const required = size && peaks[head] > CEILING ? CEILING / peaks[head] : 1;
        if (i === 0) envelope = required;
        else envelope = required + (envelope - required) * (required < envelope ? attack : release);
        minimum = Math.min(minimum, envelope);
        samples[i] *= gain * envelope;
      }
      await yieldToUI(signal);
    }
    return minimum;
  }

  async function scale(samples, gain, signal) {
    for (let start = 0; start < samples.length; start += BATCH) {
      const end = Math.min(samples.length, start + BATCH);
      for (let i = start; i < end; i++) samples[i] *= gain;
      await yieldToUI(signal);
    }
  }

  async function normalize(blob, options = {}) {
    const signal = options.signal, target = TARGETS[localeKey(options.locale)] ?? TARGETS.ar;
    checkAbort(signal);
    const cached = blob && normalized.get(blob);
    if (cached?.target === target) return cached.blob;
    const wav = await readWav(blob, signal), { samples, sampleRate } = wav;
    const measured = await loudness(samples, sampleRate, signal);
    if (!Number.isFinite(measured.lufs) || measured.lufs < MIN_LOUDNESS || measured.samplePeak < 10 ** (-48 / 20)) {
      checkAbort(signal); normalized.set(blob, { target, blob }); return blob;
    }
    let gainDb = Math.max(MIN_GAIN_DB, Math.min(MAX_GAIN_DB, target - measured.lufs));
    const reduction = await limit(samples, sampleRate, 10 ** (gainDb / 20), signal);
    // One bounded correction compensates for loudness lost to transient peak
    // limiting. Highly dynamic material may remain below target rather than clip.
    if (reduction < 0.98 && gainDb < MAX_GAIN_DB) {
      const limited = await loudness(samples, sampleRate, signal);
      const correction = Math.min(3, MAX_GAIN_DB - gainDb, target - limited.lufs);
      if (Number.isFinite(correction) && correction > 0.4) {
        await limit(samples, sampleRate, 10 ** (correction / 20), signal);
        gainDb += correction;
      }
    }
    const peak = await peakLevel(samples, signal);
    if (peak > CEILING) await scale(samples, CEILING / peak, signal);
    for (let start = 0; start < samples.length; start += BATCH) {
      const end = Math.min(samples.length, start + BATCH);
      for (let i = start; i < end; i++) {
        // This is quantization, not intentional clipping. The limiter and final
        // reconstructed-peak check already leave more than a dB of headroom.
        const sample = Math.round(samples[i] * 32768);
        wav.view.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, sample)), true);
      }
      await yieldToUI(signal);
    }
    checkAbort(signal);
    const result = new Blob([wav.buffer], { type: 'audio/wav' });
    normalized.set(blob, { target, blob: result });
    return result;
  }

  async function measure(blob, options = {}) {
    const { samples, sampleRate } = await readWav(blob, options.signal);
    const value = await loudness(samples, sampleRate, options.signal);
    const peak = await peakLevel(samples, options.signal);
    checkAbort(options.signal);
    return { lufs: value.lufs, samplePeakDbFS: toDb(value.samplePeak), estimatedTruePeakDbFS: toDb(peak),
      sampleRate, samples: samples.length, durationSeconds: samples.length / sampleRate };
  }

  const api = Object.freeze({ normalize, measure, TARGETS, MAX_GAIN_DB, PEAK_CEILING_DB, MAX_PCM_BYTES, MAX_SECONDS });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WFVoiceLoudness = api;
})(typeof window === 'object' ? window : globalThis);
