const test = require('node:test');
const assert = require('node:assert/strict');
const { identity, copy } = require('../developer-profile.js');

test('developer profile follows committed app identity instead of company invoice identity', () => {
  const logo = 'data:image/png;base64,iVBORw0KGgo=';
  const settings = { companyName: 'Invoice Company', logo: 'invoice-logo', appIdentity: { name: 'My workspace', logo } };
  const before = structuredClone(settings);
  assert.deepEqual(identity(null, settings), { name: 'My workspace', logo });
  assert.deepEqual(identity({ current: () => ({ name: 'Active app', logo }) }, settings), { name: 'Active app', logo });
  assert.deepEqual(settings, before);
});

test('malformed restored identity cannot introduce unsafe image sources or remove defaults', () => {
  assert.deepEqual(identity(null, { appIdentity: { name: '', logo: 'javascript:alert(1)' } }), { name: 'WOW FURNITURE', logo: './assets/wow-furniture-logo.svg' });
  assert.equal(identity({ current() { throw new Error('Unavailable'); } }, { appIdentity: { name: 'Saved app' } }).name, 'Saved app');
  assert.equal(identity(null, { appIdentity: { name: 'x'.repeat(61), logo: 'data:image/svg+xml,<svg/>' } }).name, 'WOW FURNITURE');
  assert.equal(identity(null, { appIdentity: { name: 'WOW FURNITURE\u202e' } }).name, 'WOW FURNITURE');
});

test('legacy app branding resolves to WOW even when the identity manager is unavailable', () => {
  const logo = 'data:image/png;base64,iVBORw0KGgo=';
  for (const name of ['INFINITY', 'infinity', 'إنفنتي', 'انفنتي', ' INFINITY\u202e ']) {
    const settings = {appIdentity:{name, logo}};
    const before = structuredClone(settings);
    assert.deepEqual(identity(null, settings), {name:'WOW FURNITURE', logo:'./assets/wow-furniture-logo.svg'});
    assert.deepEqual(identity({current() { throw new Error('Unavailable'); }}, settings), {name:'WOW FURNITURE', logo:'./assets/wow-furniture-logo.svg'});
    assert.deepEqual(settings, before, 'rendering does not mutate stored preferences');
  }
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
