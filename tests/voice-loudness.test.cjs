'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pcmToWav } = require('../offline-voice.js');
const { normalize, measure, TARGETS, MAX_GAIN_DB, PEAK_CEILING_DB, MAX_PCM_BYTES, MAX_SECONDS } = require('../voice-loudness.js');

const wav = (samples, rate = 48000) => new Blob([pcmToWav(samples, rate)], { type: 'audio/wav' });
function tone({ rate = 48000, seconds = 1.2, amplitude = 0.1, frequency = 1000, phase = 0, pad = 0 } = {}) {
  const samples = new Float32Array(Math.round((seconds + pad * 2) * rate)), offset = Math.round(pad * rate);
  for (let i = 0; i < Math.round(seconds * rate); i++) samples[offset + i] = amplitude * Math.sin(2 * Math.PI * frequency * i / rate + phase);
  return wav(samples, rate);
}
const pcm = async blob => new Int16Array(await blob.arrayBuffer(), 44);
const near = (actual, expected, tolerance, message = '') => assert(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} versus ${expected}`);

test('K weighting reads a known mono 1 kHz tone consistently across speech sample rates', async () => {
  for (const rate of [24000, 44100, 48000]) {
    const result = await measure(tone({ rate }));
    near(result.lufs, -23.05, 0.15, String(rate));
    near(result.samplePeakDbFS, -20, 0.03);
    assert.equal(result.sampleRate, rate);
  }
});

test('relative gating does not dilute spoken level with leading and trailing silence', async () => {
  const clean = await measure(tone({ seconds: 2 }));
  const padded = await measure(tone({ seconds: 2, pad: 1.5 }));
  // The 23 retained overlapping windows contain 20 full-window equivalents:
  // 17 whole windows plus six edge windows at 1/4, 1/2 and 3/4 power.
  // Fully silent windows are rejected instead of diluting by the five seconds.
  near(padded.lufs, clean.lufs + 10 * Math.log10(20 / 23), 0.03);
  assert.equal(padded.durationSeconds, 5);
});

test('loudness matching keeps sample timing and zeros while matching the selected identity level', async () => {
  const input = tone({ pad: 0.2 }), original = Buffer.from(await input.arrayBuffer());
  const result = await normalize(input, { locale: 'ar' }), measured = await measure(result);
  near(measured.lufs, TARGETS.ar, 0.15);
  assert.equal(result.size, input.size);
  const output = Buffer.from(await result.arrayBuffer());
  assert.deepEqual(output.subarray(0, 44), original.subarray(0, 44));
  assert.deepEqual(Buffer.from(await input.arrayBuffer()), original, 'the source Blob stays untouched');
  const before = new Int16Array(original.buffer, original.byteOffset + 44, (original.byteLength - 44) / 2), after = await pcm(result);
  let crossingsBefore = 0, crossingsAfter = 0;
  for (let i = 0; i < before.length; i++) {
    if (before[i] === 0) assert.equal(after[i], 0, 'silent sample stays silent');
    if (i && before[i - 1] <= 0 && before[i] > 0) crossingsBefore++;
    if (i && after[i - 1] <= 0 && after[i] > 0) crossingsAfter++;
  }
  assert.equal(crossingsAfter, crossingsBefore, 'gain processing does not resample or change pitch');
  assert.equal(await normalize(input, { locale: 'AR-sy' }), result, 'a repeated Blob and target reuses the completed result');
  const french = await normalize(input, { locale: 'fr' });
  assert.notEqual(french, result);
  near((await measure(french)).lufs, TARGETS.fr, 0.15, 'locale-specific target');
});

test('silent and very low-level audio are unchanged and quiet speech gain is capped', async () => {
  const silence = wav(new Float32Array(24000));
  assert.equal(await normalize(silence), silence);
  const noise = new Float32Array(24000);
  let state = 1;
  for (let i = 0; i < noise.length; i++) { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; noise[i] = (state / 0xffffffff - 0.5) * 0.0005; }
  const quietNoise = wav(noise);
  assert.equal(await normalize(quietNoise), quietNoise);
  const quietSpeech = tone({ amplitude: 0.01 }), before = await measure(quietSpeech);
  const after = await measure(await normalize(quietSpeech));
  near(after.lufs - before.lufs, MAX_GAIN_DB, 0.03);
  assert(after.lufs < TARGETS.ar - 10, 'an unreachable target cannot override the gain bound');
});

test('peak estimation sees intersample peaks and the limiter keeps isolated transients below its ceiling', async () => {
  const intersample = await measure(tone({ amplitude: 0.99, frequency: 12000, phase: Math.PI / 4 }));
  assert(intersample.estimatedTruePeakDbFS > intersample.samplePeakDbFS + 2.5);
  const samples = new Float32Array(48000);
  for (let i = 4800; i < samples.length - 4800; i++) samples[i] = 0.1 * Math.sin(2 * Math.PI * 220 * i / 48000);
  samples[14400] = 0.96; samples[28800] = -0.96;
  const input = wav(samples), output = await normalize(input);
  const measured = await measure(output);
  assert(measured.estimatedTruePeakDbFS <= PEAK_CEILING_DB + 0.01);
  assert.equal(output.size, input.size);
  for (const sample of await pcm(output)) assert(Math.abs(sample) < 32767, 'no sample is hard-clipped');
});

test('canonical PCM validation and memory limits reject unsupported audio before DSP', async () => {
  await assert.rejects(normalize(new Blob(['not a wave'])), { code: 'invalid-audio' });
  for (const [offset, value] of [[20, 3], [22, 2], [32, 4], [34, 32]]) {
    const bytes = pcmToWav(new Float32Array(32), 48000); new DataView(bytes).setUint16(offset, value, true);
    await assert.rejects(normalize(new Blob([bytes])), { code: 'invalid-audio' });
  }
  await assert.rejects(normalize({ size: MAX_PCM_BYTES + 46, slice() { throw new Error('must not read oversized data'); }, arrayBuffer() {} }), { code: 'speech-too-long' });
  const header = pcmToWav(new Float32Array(1), 8000), size = 44 + (MAX_SECONDS + 1) * 8000 * 2, view = new DataView(header);
  view.setUint32(4, size - 8, true); view.setUint32(40, size - 44, true);
  await assert.rejects(normalize({ size, slice: () => new Blob([header.slice(0, 44)]), arrayBuffer() { throw new Error('must reject long data before decoding'); } }), { code: 'speech-too-long' });
});

test('browser DSP yields between bounded batches, cancellation discards partial work, and cached output still honors abort', async () => {
  const controller = new AbortController(); let yields = 0;
  const window = { scheduler: { async yield() { if (++yields === 3) controller.abort(); } } };
  const context = { window, Blob, setTimeout };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../voice-loudness.js'), 'utf8'), context);
  assert.equal(typeof window.WFVoiceLoudness.normalize, 'function');
  const input = tone();
  await assert.rejects(window.WFVoiceLoudness.normalize(input, { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(yields, 3, 'aborts during the batched decode instead of blocking until all DSP completes');
  window.scheduler.yield = async () => { yields++; };
  const output = await window.WFVoiceLoudness.normalize(input);
  assert(output instanceof Blob);
  assert(yields > 8, 'measurement, limiting and encoding also yield');
  await assert.rejects(window.WFVoiceLoudness.normalize(input, { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(await window.WFVoiceLoudness.normalize(input), output);
  assert.deepEqual(Object.keys(window).sort(), ['WFVoiceLoudness', 'scheduler']);
});

test('the stored Arabic generated sample matches the identity loudness without changing its duration', async () => {
  const original = fs.readFileSync(path.join(__dirname, '../assets/reference-voice/samples/ar.wav'));
  const input = new Blob([original], { type: 'audio/wav' }), output = await normalize(input, { locale: 'ar' });
  const before = await measure(input), after = await measure(output);
  near(before.lufs, -23.9, 0.1, 'independently measured source');
  near(after.lufs, TARGETS.ar, 1, 'saved identity loudness');
  assert(after.estimatedTruePeakDbFS <= PEAK_CEILING_DB + 0.01);
  assert.equal(after.samples, before.samples);
  assert.equal(after.sampleRate, before.sampleRate);
  assert.equal(after.durationSeconds, before.durationSeconds);
  assert.deepEqual(Buffer.from(await input.arrayBuffer()), original);
});
