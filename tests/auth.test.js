const test = require('node:test');
const assert = require('node:assert');
const load = require('./load');

const app = load();

test('wrong main password is rejected and the right one unlocks', async () => {
  const salt = require('crypto').randomBytes(16);
  const b64 = salt.toString('base64');
  app.MASTER.s = b64; app.MASTER.n = 1000;
  app.MASTER.h = await app.derive('correct-horse-battery', new Uint8Array(salt), 1000);
  assert.match(await app.doUnlock('wrong-guess-123'), /not correct/);
  assert.strictEqual(await app.doUnlock('correct-horse-battery'), '');
  assert.strictEqual(app.auth.master, true);
});

test('sign-up validates name, password length and confirmation', async () => {
  assert.match(await app.doSignup('A', 'secret1', 'secret1'), /name/i);
  assert.match(await app.doSignup('Asha', '123', '123'), /at least 6/);
  assert.match(await app.doSignup('Asha', 'secret1', 'different'), /do not match/);
});

test('sign-up works, stores no plain-text password, and blocks duplicate names', async () => {
  assert.strictEqual(await app.doSignup('Asha', 'secret1', 'secret1'), '');
  assert.strictEqual(app.userName(), 'Asha');
  assert.ok(!JSON.stringify(app.usersLoad()).includes('secret1'));
  assert.match(await app.doSignup('asha', 'other99', 'other99'), /already taken/);
});

test('login accepts the right password and rejects wrong ones', async () => {
  app.auth.user = null;
  assert.match(await app.doLogin('Asha', 'wrong-pass'), /incorrect/);
  assert.match(await app.doLogin('Nobody', 'whatever'), /incorrect/);
  assert.strictEqual(await app.doLogin('ASHA', 'secret1'), '');
  assert.strictEqual(app.userName(), 'Asha');
});

test('each user keeps their own bookings', async () => {
  const d = app.getD();
  d.bookings.push({ id: 99, mine: true, workerId: 1, service: 'Electrician', skills: [], area: 'Market Road', slot: 'td-e',
                    address: 'x', note: '', status: 'requested', rating: null, complaint: null });
  app.saveData();
  assert.strictEqual(await app.doSignup('Ravi T', 'another1', 'another1'), '');
  assert.ok(!app.getD().bookings.some(b => b.id === 99), 'second user must not see the first user\'s booking');
  app.auth.user = null;
  assert.strictEqual(await app.doLogin('Asha', 'secret1'), '');
  assert.ok(app.getD().bookings.some(b => b.id === 99), 'first user\'s booking is kept after logging back in');
});
