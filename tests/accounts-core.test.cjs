const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {webcrypto} = require('node:crypto');
const file = path.join(__dirname, '../accounts-core.js');
const core = fs.existsSync(file) ? require(file) : {};
const PASSWORD = 'Correct horse-2026';
const START = Date.parse('2026-11-21T10:00:00.000Z');
const credential = {
  algorithm: 'PBKDF2-HMAC-SHA256', iterations: 600000,
  salt: '00112233445566778899aabbccddeeff',
  hash: '14b26192bfcf425ce5fde54aec7d04e6e48b850adeddb8433742f0e1b389016e'
};
const clone = value => structuredClone(value);
const known = ['dashboard.view', 'products.view', 'products.edit', 'accounts.manage'];
const policy = {
  presets: role => role === 'owner' ? known.slice() : ['dashboard.view', 'products.view'],
  normalizePermissions: (role, values) => role === 'owner' ? known.slice() : [...new Set(values || [])].filter(key => known.includes(key) && key !== 'accounts.manage'),
  can: (account, key) => known.includes(key) && account.status === 'active' && (account.role === 'owner' || account.permissions.includes(key))
};
function account(id = 'owner-1', patch = {}) {
  return {id, name: 'Owner', username: id === 'owner-1' ? 'owner' : id, role: 'owner',
    permissions: known.slice(), department: '', note: '', status: 'active',
    createdAt: new Date(START).toISOString(), updatedAt: new Date(START).toISOString(),
    lastLoginAt: null, expiresAt: null, deletedAt: null, sessionVersion: 1,
    failedAttempts: 0, lockedUntil: null, credential: clone(credential), ...patch};
}
function seed(rows = [account()]) {return {schemaVersion: 1, revision: 1, accounts: rows, audit: []};}
function harness(initial = seed()) {
  let saved = clone(initial), instant = START, failure = null;
  const read = async () => clone(saved);
  const commit = async (expected, next) => {
    if (failure) {const error = failure; failure = null; throw error;}
    if ((saved?.revision || 0) !== expected) throw Object.assign(new Error('CONFLICT'), {code: 'CONFLICT'});
    assert.equal(next.revision, expected + 1);
    saved = clone(next);
  };
  return {read, commit, now: () => instant, crypto: webcrypto, policy,
    stored: () => clone(saved), advance: ms => {instant += ms;}, fail: error => {failure = error;},
    service: () => {assert.equal(typeof core.createService, 'function', 'identity service must exist'); return core.createService({read, commit, now: () => instant, crypto: webcrypto, policy});}};
}
async function owner(h) {const service = h.service(); await service.signIn({username: 'owner', password: PASSWORD}); return service;}
const rejects = (promise, code) => assert.rejects(promise, error => error.code === code && error.message === code);
function noCredentials(value) {
  const text = JSON.stringify(value);
  for (const forbidden of [PASSWORD, credential.hash, credential.salt, '"credential"', '"failedAttempts"']) assert(!text.includes(forbidden), 'public output leaked credential material');
}

test('first owner setup hashes the password with actual WebCrypto and never exposes credentials', async () => {
  const h = harness(null), service = h.service();
  assert.equal((await service.refresh()).configured, false);
  const result = await service.bootstrapOwner({name: '  Workshop Owner  ', username: '  OWNER  ', password: PASSWORD});
  assert.equal(result.currentAccount.username, 'owner'); assert.equal(result.currentAccount.role, 'owner');
  assert.equal(result.accounts.length, 1); assert.equal(result.accounts[0].name, 'Workshop Owner');
  const stored = h.stored(); assert.equal(stored.accounts[0].credential.iterations, 600000);
  assert.equal(stored.accounts[0].credential.salt.length, 32); assert.equal(stored.accounts[0].credential.hash.length, 64);
  assert(!JSON.stringify(stored).includes(PASSWORD)); noCredentials(result);
  await rejects(service.bootstrapOwner({name: 'Other', username: 'other', password: PASSWORD}), 'ALREADY_CONFIGURED');
  await service.signOut(); assert.equal(service.getSnapshot().currentAccount, null);
  assert.deepEqual(service.getSnapshot().accounts, []);
  await service.signIn({username: 'OWNER', password: PASSWORD});
  assert.equal(await service.assertPermission('accounts.manage'), true);
});

test('username normalization rejects duplicates and invalid account input without creating an account', async () => {
  const h = harness(seed([account(), account('employee', {username: 'josé', role: 'sales', permissions: ['products.view']})]));
  const service = await owner(h);
  await rejects(service.createAccount({name: 'Duplicate', username: ' JOSE\u0301 ', password: PASSWORD, role: 'sales'}), 'USERNAME_EXISTS');
  for (const [patch, code] of [
    [{username: 'ab'}, 'INVALID_USERNAME'], [{username: 'two words'}, 'INVALID_USERNAME'],
    [{name: ' '}, 'INVALID_NAME'], [{password: 'short'}, 'INVALID_PASSWORD'],
    [{password: 'x'.repeat(129)}, 'INVALID_PASSWORD'], [{role: 'superadmin'}, 'INVALID_ROLE'],
    [{expiresAt: 'not-a-date'}, 'INVALID_EXPIRY']
  ]) await rejects(service.createAccount({name: 'Valid', username: 'worker', password: PASSWORD, role: 'sales', ...patch}), code);
  assert.equal(h.stored().accounts.length, 2);
});

test('wrong, unknown, inactive and locked logins share one failure and lock state survives reopening', async () => {
  const h = harness(), service = h.service();
  await rejects(service.signIn({username: 'unknown', password: PASSWORD}), 'LOGIN_FAILED');
  for (let i = 0; i < 5; i++) await rejects(service.signIn({username: 'owner', password: 'Wrong password-2026'}), 'LOGIN_FAILED');
  assert.equal(h.stored().accounts[0].failedAttempts, 5);
  assert.equal(Date.parse(h.stored().accounts[0].lockedUntil), START + 15 * 60 * 1000);
  const reopened = h.service();
  await rejects(reopened.signIn({username: 'owner', password: PASSWORD}), 'LOGIN_FAILED');
  h.advance(15 * 60 * 1000 + 1);
  assert.equal((await reopened.signIn({username: 'owner', password: PASSWORD})).currentAccount.id, 'owner-1');
  assert.equal(h.stored().accounts[0].failedAttempts, 0); assert.equal(h.stored().accounts[0].lockedUntil, null);
  assert.deepEqual(service.getSnapshot().accounts, []); assert.equal(service.getSnapshot().currentAccount, null);
  noCredentials(reopened.getSnapshot());
});

test('owner creates staff with presets while staff cannot list others or manage accounts', async () => {
  const h = harness(), admin = await owner(h);
  const result = await admin.createAccount({name: 'Carpenter', username: 'نجار.١', password: PASSWORD, role: 'carpentry', department: 'Workshop'});
  const employee = result.accounts.find(row => row.username === 'نجار.١');
  assert(employee); assert.deepEqual(employee.permissions, ['dashboard.view', 'products.view']);
  const staff = h.service(); await staff.signIn({username: 'نجار.١', password: PASSWORD});
  assert.deepEqual(staff.getSnapshot().accounts.map(row => row.id), [employee.id]);
  assert(staff.getSnapshot().audit.every(event => event.actorId === employee.id || event.targetId === employee.id));
  await rejects(staff.createAccount({name: 'Intruder', username: 'intruder', password: PASSWORD, role: 'owner'}), 'PERMISSION_DENIED');
  await rejects(staff.updateAccount(employee.id, {role: 'owner'}), 'PERMISSION_DENIED');
  await rejects(staff.assertPermission('products.edit'), 'PERMISSION_DENIED');
  assert.equal(await staff.assertPermission('products.view'), true);
  noCredentials(staff.getSnapshot());
});

test('suspension and permission changes invalidate existing sessions across service instances', async () => {
  const row = account('staff', {role: 'sales', name: 'Staff', permissions: ['products.view', 'products.edit']});
  const h = harness(seed([account(), row])), admin = await owner(h), staff = h.service();
  await staff.signIn({username: 'staff', password: PASSWORD});
  await admin.updateAccount('staff', {permissions: ['products.view']});
  await rejects(staff.assertPermission('products.edit'), 'AUTH_REQUIRED');
  await staff.signIn({username: 'staff', password: PASSWORD});
  await rejects(staff.assertPermission('products.edit'), 'PERMISSION_DENIED');
  await admin.setStatus('staff', 'suspended', 'Season paused');
  assert.equal((await staff.refresh()).currentAccount, null);
  await rejects(staff.signIn({username: 'staff', password: PASSWORD}), 'LOGIN_FAILED');
  await admin.setStatus('staff', 'active');
  assert.equal((await staff.signIn({username: 'staff', password: PASSWORD})).currentAccount.status, 'active');
});

test('revocation, deletion and restore require a new login and preserve identity attribution', async () => {
  const h = harness(seed([account(), account('staff', {role: 'assembly', permissions: ['products.view']})]));
  const admin = await owner(h), staff = h.service(); await staff.signIn({username: 'staff', password: PASSWORD});
  await admin.revokeSessions('staff'); await rejects(staff.assertPermission('products.view'), 'AUTH_REQUIRED');
  await staff.signIn({username: 'staff', password: PASSWORD});
  await admin.setStatus('staff', 'revoked'); await rejects(staff.assertPermission('products.view'), 'AUTH_REQUIRED');
  await admin.setStatus('staff', 'deleted', 'Account closed');
  const before = h.stored().accounts.find(row => row.id === 'staff'); assert(before.deletedAt);
  await rejects(admin.setStatus('staff', 'active'), 'INVALID_STATUS');
  const restored = await admin.restoreAccount('staff');
  assert.equal(restored.accounts.find(row => row.id === 'staff').status, 'suspended');
  await rejects(staff.signIn({username: 'staff', password: PASSWORD}), 'LOGIN_FAILED');
  await admin.setStatus('staff', 'active');
  await staff.signIn({username: 'staff', password: PASSWORD});
  assert.equal(staff.getSnapshot().currentAccount.id, 'staff');
  assert(h.stored().audit.some(event => event.action === 'account_deleted' && event.targetId === 'staff'));
});

test('owner cannot suspend, delete, demote or add an expiry to their own owner account', async () => {
  const h = harness(), admin = await owner(h);
  for (const status of ['suspended', 'revoked', 'deleted']) await rejects(admin.setStatus('owner-1', status), 'SELF_PROTECTION');
  await rejects(admin.updateAccount('owner-1', {role: 'sales'}), 'SELF_PROTECTION');
  await rejects(admin.updateAccount('owner-1', {expiresAt: new Date(START + 10000).toISOString()}), 'SELF_PROTECTION');
  assert.equal(h.stored().accounts[0].role, 'owner'); assert.equal(h.stored().accounts[0].status, 'active');
  assert.equal(h.stored().accounts[0].expiresAt, null);
});

test('account expiry, thirty minute inactivity and eight hour maximum end sessions without automatic renewal', async () => {
  const h = harness(seed([account(), account('staff', {role: 'sales', permissions: ['products.view'], expiresAt: new Date(START + 60000).toISOString()})]));
  const staff = h.service(); await staff.signIn({username: 'staff', password: PASSWORD});
  h.advance(60000); await rejects(staff.assertPermission('products.view'), 'AUTH_REQUIRED');
  await rejects(staff.signIn({username: 'staff', password: PASSWORD}), 'LOGIN_FAILED');
  const idle = h.service(); await idle.signIn({username: 'owner', password: PASSWORD});
  h.advance(30 * 60 * 1000); assert.equal(idle.getSnapshot().currentAccount, null);
  assert.equal(idle.touch(), false); await rejects(idle.assertPermission('products.view'), 'AUTH_REQUIRED');
  const active = h.service(); await active.signIn({username: 'owner', password: PASSWORD});
  for (let step = 0; step < 23; step++) {h.advance(20 * 60 * 1000); assert.equal(active.touch(), true);}
  h.advance(20 * 60 * 1000); await rejects(active.assertPermission('products.view'), 'AUTH_REQUIRED');
});

test('password resets revoke staff sessions while own password change requires the old password', async () => {
  const h = harness(seed([account(), account('staff', {role: 'sales', permissions: ['products.view']})]));
  const admin = await owner(h), staff = h.service(); await staff.signIn({username: 'staff', password: PASSWORD});
  const reset = 'Fresh password-2026'; await admin.setPassword('staff', reset);
  await rejects(staff.assertPermission('products.view'), 'AUTH_REQUIRED');
  await rejects(staff.signIn({username: 'staff', password: PASSWORD}), 'LOGIN_FAILED');
  await staff.signIn({username: 'staff', password: reset});
  await rejects(admin.setPassword('owner-1', reset), 'CURRENT_PASSWORD_REQUIRED');
  await rejects(admin.changePassword('Incorrect password', reset), 'LOGIN_FAILED');
  const secondOwnerSession = h.service(); await secondOwnerSession.signIn({username: 'owner', password: PASSWORD});
  await admin.changePassword(PASSWORD, reset);
  assert.equal(admin.getSnapshot().currentAccount.id, 'owner-1');
  await rejects(secondOwnerSession.assertPermission('accounts.manage'), 'AUTH_REQUIRED');
  assert(!JSON.stringify(h.stored()).includes(reset)); noCredentials(admin.getSnapshot());
});

test('CAS conflicts and failed storage commits never publish a privileged change or keep an unchecked session', async () => {
  const h = harness(seed([account(), account('staff', {role: 'sales', permissions: ['products.view']})]));
  const admin = await owner(h), before = h.stored();
  h.fail(Object.assign(new Error('CONFLICT'), {code: 'CONFLICT'}));
  await rejects(admin.updateAccount('staff', {role: 'owner'}), 'CONFLICT');
  assert.deepEqual(h.stored(), before); assert.equal(admin.getSnapshot().currentAccount, null);
  await admin.signIn({username: 'owner', password: PASSWORD});
  const signed = h.stored(); h.fail(new Error('disk unavailable'));
  await rejects(admin.setStatus('staff', 'deleted'), 'STORAGE_ERROR');
  assert.deepEqual(h.stored(), signed); assert.equal(admin.getSnapshot().currentAccount, null);
});

test('simultaneous first-owner attempts cannot overwrite the winning identity database', async () => {
  const h = harness(null), first = h.service(), second = h.service();
  const results = await Promise.allSettled([
    first.bootstrapOwner({name: 'First', username: 'first', password: PASSWORD}),
    second.bootstrapOwner({name: 'Second', username: 'second', password: PASSWORD})
  ]);
  assert.equal(results.filter(value => value.status === 'fulfilled').length, 1);
  const failure = results.find(value => value.status === 'rejected'); assert.equal(failure.reason.code, 'CONFLICT');
  assert.equal(h.stored().accounts.length, 1); assert.equal(h.stored().revision, 1);
  const losingService = results[0].status === 'rejected' ? first : second;
  assert.equal(losingService.getSnapshot().configured, true, 'a lost first-owner claim cannot fall back to legacy unrestricted mode');
  assert.equal(losingService.getSnapshot().currentAccount, null);
});

test('public snapshots are detached and logout takes effect even if its activity write fails', async () => {
  const h = harness(), admin = await owner(h), snapshots = [];
  const unsubscribe = admin.subscribe(value => snapshots.push(value));
  const snapshot = admin.getSnapshot(); noCredentials(snapshot);
  try {snapshot.currentAccount.role = 'custom'; snapshot.accounts.splice(0);} catch (_) {}
  assert.equal(await admin.assertPermission('accounts.manage'), true);
  h.fail(new Error('offline storage'));
  await rejects(admin.signOut(), 'STORAGE_ERROR');
  assert.equal(admin.getSnapshot().currentAccount, null); assert.deepEqual(admin.getSnapshot().accounts, []);
  assert(snapshots.some(value => value.currentAccount === null)); unsubscribe();
});

test('bounded local audit retains recent actor attribution and corrupt identities fail closed', async () => {
  const initial = seed();
  initial.audit = Array.from({length: 500}, (_, index) => ({id: 'old-' + index, at: new Date(START).toISOString(), actorId: 'owner-1', actorName: 'Owner', targetId: 'owner-1', targetName: 'Owner', action: 'login_success', outcome: 'success', reason: ''}));
  const h = harness(initial), admin = await owner(h);
  assert.equal(admin.getSnapshot().audit.length, 500); assert.equal(admin.getSnapshot().audit[0].id, 'old-1');
  assert.equal(admin.getSnapshot().audit.at(-1).action, 'login_success');
  const bad = harness({...seed(), schemaVersion: 999}), broken = bad.service();
  await rejects(broken.refresh(), 'IDENTITY_STATE_INVALID');
  await rejects(broken.bootstrapOwner({name: 'Overwrite', username: 'overwrite', password: PASSWORD}), 'IDENTITY_STATE_INVALID');
  assert.equal(broken.getSnapshot().currentAccount, null); assert.equal(bad.stored().schemaVersion, 999);
});

test('business activity requires a current authorized actor and stores only bounded record metadata', async () => {
  const h = harness(seed([account(), account('staff', {role: 'sales', permissions: ['products.view']})]));
  const admin = await owner(h);
  assert.equal(typeof admin.recordActivity, 'function');
  await admin.recordActivity({action: 'products.edit', targetType: 'products', targetId: 'product-42', details: {store: 'products', id: 'product-42', count: 2}});
  const event = admin.getSnapshot().audit.at(-1);
  assert.equal(event.actorId, 'owner-1'); assert.equal(event.action, 'products.edit');
  assert.equal(event.targetType, 'products'); assert.equal(event.targetId, 'product-42');
  assert.equal(event.details, 'store=products; id=product-42; count=2');
  await rejects(admin.recordActivity({action: 'not-a-permission', targetType: 'products', targetId: 'x'}), 'PERMISSION_DENIED');
  await rejects(admin.recordActivity({action: 'products.edit', targetType: 'products', targetId: 'x', details: {body: 'Private invoice content'}}), 'INVALID_ACTIVITY');
  const staff = h.service(); await staff.signIn({username: 'staff', password: PASSWORD});
  await rejects(staff.recordActivity({action: 'products.edit', targetType: 'products', targetId: 'x'}), 'PERMISSION_DENIED');
  // A business-record ID that happens to equal an account ID does not make it that employee's event.
  await admin.recordActivity({action: 'products.edit', targetType: 'products', targetId: 'staff', details: {count: 1}});
  const snapshot = await staff.refresh(); assert(!snapshot.audit.some(row => row.action === 'products.edit'));
  noCredentials(admin.getSnapshot());
});

test('signing out during an in-flight login cannot restore the cancelled session', async () => {
  const h = harness(), service = h.service();
  const pending = service.signIn({username: 'owner', password: PASSWORD});
  const logout = service.signOut();
  await rejects(pending, 'AUTH_REQUIRED'); await logout;
  assert.equal(service.getSnapshot().currentAccount, null);
  assert(!h.stored().audit.some(event => event.action === 'login_success'));
});

test('simultaneous activity appends retry against the fresh ledger without losing events or valid sessions', async () => {
  const h = harness(seed([account(), account('staff-a', {role:'sales',permissions:['products.view','products.edit']}), account('staff-b', {role:'sales',permissions:['products.view','products.edit']})]));
  const first=h.service(),second=h.service();
  await first.signIn({username:'staff-a',password:PASSWORD});await second.signIn({username:'staff-b',password:PASSWORD});
  await Promise.all([
    first.recordActivity({action:'products.edit',targetType:'products',targetId:'p-a',details:{count:1}}),
    second.recordActivity({action:'products.edit',targetType:'products',targetId:'p-b',details:{count:1}})
  ]);
  const events=h.stored().audit.filter(event=>event.action==='products.edit');
  assert.deepEqual(events.map(event=>event.targetId).sort(),['p-a','p-b']);
  assert.equal(first.getSnapshot().currentAccount.id,'staff-a');assert.equal(second.getSnapshot().currentAccount.id,'staff-b');
});

test('an audit retry rechecks revocation and never appends an event under a stale session epoch', async () => {
  const h=harness(seed([account(),account('staff',{role:'sales',permissions:['products.view','products.edit']})]));
  let interrupted=false;
  const service=core.createService({...h,commit:async(expected,next)=>{
    if(!interrupted&&next.audit.at(-1).action==='products.edit'){
      interrupted=true;const revoked=await h.read();const target=revoked.accounts.find(row=>row.id==='staff');
      target.status='suspended';target.sessionVersion++;revoked.revision=expected+1;await h.commit(expected,revoked);
      throw Object.assign(Error('CONFLICT'),{code:'CONFLICT'});
    }
    return h.commit(expected,next);
  }});
  await service.signIn({username:'staff',password:PASSWORD});
  await rejects(service.recordActivity({action:'products.edit',targetType:'products',targetId:'p'}),'AUTH_REQUIRED');
  assert.equal(service.getSnapshot().currentAccount,null);assert(!h.stored().audit.some(event=>event.action==='products.edit'));
});

test('audit-only contention retries are bounded and do not mask a failure or revoke a still-valid account', async () => {
  const h=harness();let attempts=0;
  const service=core.createService({...h,commit:async(expected,next)=>{
    if(next.audit.at(-1).action==='products.edit'){attempts++;throw Object.assign(Error('CONFLICT'),{code:'CONFLICT'});}
    return h.commit(expected,next);
  }});
  await service.signIn({username:'owner',password:PASSWORD});
  await rejects(service.recordActivity({action:'products.edit',targetType:'products',targetId:'p'}),'CONFLICT');
  assert.equal(attempts,3);assert.equal(service.getSnapshot().currentAccount.id,'owner-1');
  assert(!h.stored().audit.some(event=>event.action==='products.edit'));
});

test('an empty identity read after configuration or a lost owner claim never reopens unrestricted mode', async () => {
  const h=harness();let missing=false;
  const signed=core.createService({...h,read:async()=>missing?null:h.read()});
  await signed.signIn({username:'owner',password:PASSWORD});missing=true;
  await rejects(signed.refresh(),'IDENTITY_STATE_INVALID');
  assert.equal(signed.getSnapshot().configured,true);assert.equal(signed.getSnapshot().currentAccount,null);
  await rejects(signed.bootstrapOwner({name:'Overwrite',username:'overwrite',password:PASSWORD}),'IDENTITY_STATE_INVALID');
  const lost=core.createService({read:async()=>null,commit:async()=>{throw Object.assign(Error('CONFLICT'),{code:'CONFLICT'});},crypto:webcrypto,policy});
  await rejects(lost.bootstrapOwner({name:'Owner',username:'owner',password:PASSWORD}),'CONFLICT');
  await rejects(lost.refresh(),'IDENTITY_STATE_INVALID');
  assert.equal(lost.getSnapshot().configured,true);assert.equal(lost.getSnapshot().currentAccount,null);
});
