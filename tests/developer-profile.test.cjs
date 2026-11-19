const test = require('node:test');
const assert = require('node:assert/strict');
const { identity, copy } = require('../developer-profile.js');

test('developer profile follows committed app identity instead of company invoice identity', () => {
  const logo = 'data:image/png;base64,iVBORw0KGgo=';
  const settings = { companyName: 'Invoice Company', logo: 'invoice-logo', appIdentity: { name: 'My INFINITY', logo } };
  const before = structuredClone(settings);
  assert.deepEqual(identity(null, settings), { name: 'My INFINITY', logo });
  assert.deepEqual(identity({ current: () => ({ name: 'Active app', logo }) }, settings), { name: 'Active app', logo });
  assert.deepEqual(settings, before);
});

test('malformed restored identity cannot introduce unsafe image sources or remove defaults', () => {
  assert.deepEqual(identity(null, { appIdentity: { name: '', logo: 'javascript:alert(1)' } }), { name: 'INFINITY', logo: './assets/infinity-logo.svg' });
  assert.equal(identity({ current() { throw new Error('Unavailable'); } }, { appIdentity: { name: 'Saved app' } }).name, 'Saved app');
  assert.equal(identity(null, { appIdentity: { name: 'x'.repeat(61), logo: 'data:image/svg+xml,<svg/>' } }).name, 'INFINITY');
  assert.equal(identity(null, { appIdentity: { name: 'INFINITY\u202e' } }).name, 'INFINITY');
});

test('profile copy covers all five languages and the requested name and development focus', () => {
  for (const language of ['ar', 'en', 'tr', 'fr', 'ru']) {
    assert.deepEqual(Object.keys(copy[language]).sort(), Object.keys(copy.en).sort());
    assert(Object.values(copy[language]).every(value => typeof value === 'string' && value.trim()));
  }
  assert.equal(copy.ar.name, 'المهندس معتز بالله حاج شعبان');
  assert.equal(copy.ar.robotics, 'الروبوتات والأتمتة');
  assert.equal(copy.ar.ai, 'الذكاء الاصطناعي');
});
