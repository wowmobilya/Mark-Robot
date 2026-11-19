import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const source = await fs.readFile(new URL('../nabra-phonemizer.js', import.meta.url), 'utf8');
const { prepareArabicPhonemes, validateArabicWaveform } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const tokens = text => [0, ...Array.from(text, () => 43), 0];

test('keeps marked Arabic words and converts only punctuation', async () => {
  let seen;
  const prepared = await prepareArabicPhonemes('أَلْفٌ، وَنِصْفٌ؛ صَحِيحٌ؟', async text => { seen = text; return 'abc'; }, tokens);
  assert.equal(seen, 'أَلْفٌ, وَنِصْفٌ; صَحِيحٌ?');
  assert.deepEqual(prepared, { ids: [0, 43, 43, 43, 0], count: 3, styleIndex: 2 });
});

test('accepts all510 phonemes but rejects511 without truncating', async () => {
  assert.equal((await prepareArabicPhonemes('نَصٌّ', async () => 'a'.repeat(510), tokens)).ids.length, 512);
  await assert.rejects(prepareArabicPhonemes('نَصٌّ', async () => 'a'.repeat(511), tokens), { code: 'text-length' });
});

test('rejects unknown dropped phonemes and invalid token IDs', async () => {
  await assert.rejects(prepareArabicPhonemes('نَصٌّ', async () => 'abc', () => [0, 43, 43, 0]), { code: 'phonemizer-failed' });
  await assert.rejects(prepareArabicPhonemes('نَصٌّ', async () => 'a', () => [0, 178, 0]), { code: 'phonemizer-failed' });
});

test('rejects missing, silent and nonfinite audio instead of claiming speech', () => {
  for (const wave of [undefined, new Float32Array(240), new Float32Array(240).fill(NaN), new Float32Array(240).fill(Infinity)]) {
    assert.throws(() => validateArabicWaveform(wave), { code: 'engine-failed' });
  }
  const wave = Float32Array.from({ length: 240 }, (_, index) => index % 2 ? 1.2 : -0.6);
  assert.equal(validateArabicWaveform(wave), wave);
  assert.ok(Math.abs(wave[1] - 0.94) < 1e-6);
  assert.ok(Math.abs(wave[0] + 0.47) < 1e-6);
});
