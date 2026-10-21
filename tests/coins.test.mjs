import test from 'node:test';
import assert from 'node:assert/strict';
import { ReefSession, COIN_CAP, coinRate } from '../engine.mjs';
import { BY_ID, SPECIES } from '../species.mjs';

const resident = speciesId => ({ speciesId });
const seeded = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

test('each resident helps, including duplicates, and higher rarity earns faster', () => {
  assert.equal(coinRate([]), 0);
  let previous = 0;
  for (let tier = 0; tier < 5; tier++) {
    const fish = resident(SPECIES.find(s => s.tier === tier).id), one = coinRate([fish]);
    assert.ok(one > previous); assert.ok(coinRate([fish, fish]) > one);
    // A crowded tank has diminishing returns, rather than multiplying rewards without limit.
    assert.ok(coinRate([fish, fish]) < 2 * one); previous = one;
  }
});

test('coins start at zero, preserve fractional progress and freeze on pause and end', () => {
  const s = new ReefSession({ rng: () => 0 }); assert.equal(s.coins, 0);
  s.tick(20, 20); assert.ok(s.coins > 0 && s.coins < 1); assert.equal(s.report().coins, 0);
  const before = s.coins; s.pause(); s.tick(1000, 20); assert.equal(s.coins, before);
  s.resume(); s.tick(120, 20); assert.ok(s.report().coins >= 1);
  s.end(); const earned = s.coins; s.resume(); s.tick(1000, 20); assert.equal(s.coins, earned);
  assert.equal(s.report().coins, Math.floor(earned)); assert.equal(new ReefSession().coins, 0);
});

test('departing residents reduce future earnings without taking away earned coins', () => {
  const s = new ReefSession({ rng: () => 0 });
  for (let i = 0; i < 10; i++) s.admit(BY_ID['whale-shark']);
  const fullRate = coinRate(s.residents); s.tick(20, 20); const earned = s.coins;
  s.tick(20, 100);
  assert.equal(s.residents.length, 1); assert.ok(coinRate(s.residents) < fullRate); assert.ok(s.coins > earned);
});

test('passing visitors count in the report but do not increase the resident earning rate', () => {
  const s = new ReefSession({ capacity: 2, rng: () => 0 });
  s.admit(BY_ID['sea-turtle']); s.admit(BY_ID['whale-shark']); s.drain();
  const rate = coinRate(s.residents); s.admit(BY_ID.clownfish);
  assert.equal(s.drain().at(-1).passing, true); assert.equal(coinRate(s.residents), rate);
  assert.equal(s.report().visits.find(v => v.speciesId === 'clownfish').count, 2);
});

test('integration does not change earnings when the same interval is split into frames', () => {
  const a = new ReefSession({ rng: () => 0 }), b = new ReefSession({ rng: () => 0 });
  a.tick(20, 20); for (let i = 0; i < 200; i++) b.tick(.1, 20);
  assert.ok(Math.abs(a.coins - b.coins) < 1e-10);
  for (const invalid of [0, -1, NaN, Infinity]) a.tick(invalid, 20);
  assert.ok(Math.abs(a.coins - b.coins) < 1e-10);
});

test('a long session with forty legendary residents reaches 150 and never exceeds it or auto-ends', () => {
  const s = new ReefSession({ capacity: 40, arrivalRate: 3, rng: () => 0 });
  for (let i = 0; i < 40; i++) s.admit(BY_ID['whale-shark']);
  s.tick(7200, 20); assert.equal(s.coins, COIN_CAP); assert.equal(s.report().coins, 150);
  assert.equal(s.status, 'running'); s.tick(60, 100); assert.equal(s.coins, 150);
  s.pause(); s.tick(60, 20); s.end(); assert.equal(s.report().coins, 150);
});

test('30-minute quiet and occasional-noise sessions average 70–100 tokens at 1×, 2× and 3×', () => {
 for (const arrivalRate of [1, 2, 3]) {
  for (const occasionalNoise of [false, true]) {
    let total = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const s = new ReefSession({ arrivalRate, rng: seeded(seed) });
      for (let second = 0; second < 1800; second++) s.tick(1, occasionalNoise && second % 300 >= 297 ? 75 : 20);
      const earned = s.report().coins; assert.ok(earned >= 0 && earned <= 150); total += earned;
      assert.equal(s.status, 'running');
    }
    const mean = total / 200; assert.ok(mean >= 70 && mean <= 100, `mean ${mean}, frequency ${arrivalRate}, occasional noise: ${occasionalNoise}`);
  }
 }
});
