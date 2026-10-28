const test = require('node:test');
const assert = require('node:assert');
const load = require('./load');

const app = load();
const req = (o) => Object.assign({ service: 'Electrician', skills: [], area: 'Market Road', slot: 'td-e' }, o);
const names = (list) => list.map(m => m.w.name);

test('default search ranks the closest, most experienced available electrician first', () => {
  app.setD(app.seed());
  const list = app.matches(req());
  assert.deepStrictEqual(names(list), ['Ravi Kumar', 'Imran Sheikh', 'Karthik S', 'Prakash N']);
});

test('scores are between 0 and 100 and sorted high to low', () => {
  const list = app.matches(req());
  for (const m of list) assert.ok(m.score >= 0 && m.score <= 100);
  for (let i = 1; i < list.length; i++) assert.ok(list[i - 1].score >= list[i].score);
});

test('workers outside their service radius are filtered out', () => {
  const list = app.matches(req({ service: 'Plumber', area: 'Lakeview Colony', slot: 'td-m' }));
  assert.ok(!names(list).includes('Joseph M'), 'Joseph serves Riverside within 5 km, Lakeview is about 5.1 km away');
  assert.ok(names(list).includes('Anil Das'));
});

test('a worker free at another time the same day is kept and flagged', () => {
  const list = app.matches(req({ service: 'Plumber', area: 'Lakeview Colony', slot: 'td-m' }));
  const anil = list.find(m => m.w.name === 'Anil Das');
  assert.strictEqual(anil.free, false);
  assert.ok(anil.alt, 'alternative slot expected');
  assert.strictEqual(anil.c.avail, 0.5);
});

test('workers with no free slot that day are filtered out', () => {
  const list = app.matches(req({ service: 'Gardener', area: 'Riverside', slot: 'td-e' }));
  assert.strictEqual(list.length, 0);
});

test('rating is ignored until a worker has 5 or more reviews', () => {
  const list = app.matches(req());
  const prakash = list.find(m => m.w.name === 'Prakash N');
  const ravi = list.find(m => m.w.name === 'Ravi Kumar');
  assert.strictEqual(prakash.c.rate, null);
  assert.ok(ravi.c.rate > 0);
});

test('pending (unapproved) workers never appear in search', () => {
  const list = app.matches(req({ service: 'Electrician', area: 'Riverside', slot: 'td-a' }));
  assert.ok(!names(list).includes('Vikram T'));
});

test('approving a pending worker makes them searchable', () => {
  const d = app.getD();
  const v = d.workers.find(w => w.name === 'Vikram T');
  v.status = 'approved';
  const list = app.matches(req({ service: 'Electrician', area: 'Riverside', slot: 'td-a' }));
  assert.ok(names(list).includes('Vikram T'));
  v.status = 'pending';
});

test('skill tags raise the score of workers who have them', () => {
  const withTag = app.matches(req({ skills: ['Inverter & UPS'] }));
  const imran = withTag.find(m => m.w.name === 'Imran Sheikh');
  const ravi = withTag.find(m => m.w.name === 'Ravi Kumar');
  assert.ok(imran.c.skill > ravi.c.skill);
});

test('reliability is completed jobs divided by accepted jobs', () => {
  const ravi = app.getD().workers.find(w => w.name === 'Ravi Kumar');
  assert.ok(Math.abs(app.reliability(ravi) - 46 / 48) < 1e-9);
});
