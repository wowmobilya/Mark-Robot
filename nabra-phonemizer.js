/* Strict adapter for the Nabra Arabic phonemizer. No words or phonemes are cut. */
export async function prepareArabicPhonemes(text, phonemize, tokenize) {
  const fail = code => Object.assign(new Error(code), { code });
  if (typeof text !== 'string' || !text.trim() || text.length > 800) throw fail('text-length');
  // Preserve words and tashkeel. These punctuation substitutions are the only
  // text transformation; the phonemizer's model vocabulary uses ASCII marks.
  const input = text.replaceAll('،', ',').replaceAll('؛', ';').replaceAll('؟', '?');
  const phonemes = await phonemize(input);
  const count = Array.from(phonemes).length;
  if (!count) throw fail('phonemizer-failed');
  if (count > 510) throw fail('text-length');
  const ids = tokenize(phonemes);
  if (ids.length !== count + 2 || ids[0] !== 0 || ids[ids.length - 1] !== 0 ||
      ids.some(value => !Number.isInteger(value) || value < 0 || value > 177)) {
    throw fail('phonemizer-failed');
  }
  return { ids, count, styleIndex: count - 1 };
}

export function validateArabicWaveform(samples) {
  const fail = () => Object.assign(new Error('engine-failed'), { code: 'engine-failed' });
  if (!(samples instanceof Float32Array) || samples.length < 240 || samples.length > 24000 * 180) throw fail();
  let peak = 0;
  for (const value of samples) {
    if (!Number.isFinite(value)) throw fail();
    peak = Math.max(peak, Math.abs(value));
  }
  if (peak < 0.0001) throw fail();
  // Uniform attenuation only, so an occasional loud sample cannot clip in WAV.
  const gain = Math.min(1, 0.94 / peak);
  if (gain < 1) for (let index = 0; index < samples.length; index++) samples[index] *= gain;
  return samples;
}
