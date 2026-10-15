import test from 'node:test';
import assert from 'node:assert/strict';
import { ReefSession, capacityVictim, pickSpecies } from '../engine.mjs';
import { BY_ID, SPECIES } from '../species.mjs';

const seeded = (seed = 7) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const session = options => new ReefSession({ threshold:60, rng: () => 0, ...options });
const stock = (s, count = 12) => { for (let i = s.residents.length; i < count; i++) s.admit(BY_ID.clownfish); s.drain(); };
test('arrivals earn 45–60 seconds of settled reading and duplicate visitors coexist', () => {
  const s = session(); s.drain(); assert.equal(s.interval, 45);
  assert.equal(s.tick(44.9, 20).filter(e => e.type === 'arrival').length, 0);
  assert.equal(s.tick(.1, 20).filter(e => e.type === 'arrival').length, 1);
  s.tick(45, 20); assert.equal(s.residents.length, 3); assert.equal(s.visits.get('clownfish').count, 3);
  assert.notEqual(s.residents[0].id, s.residents[1].id); assert.deepEqual(s.discoveries, ['clownfish']);
});
test('brief loudness warns without losses and requires ten calm seconds', () => {
  const s = session(); stock(s); s.tick(20, 20);
  s.tick(.9, 90); assert.equal(s.water, 'warning'); assert.equal(s.residents.length, 12);
  const credit = s.quietProgress; s.tick(9.9, 20); assert.equal(s.water, 'settling'); assert.equal(s.quietProgress, credit);
  s.tick(.1, 20); assert.equal(s.water, 'calm'); assert.equal(s.quietProgress, credit);
  s.tick(1, 20); assert.ok(Math.abs(s.quietProgress - credit - 1) < 1e-6);
});
test('sustained noise causes capped groups after one second, then every second', () => {
  const s = session(); stock(s); s.tick(.9, 100); assert.equal(s.residents.length, 12);
  const first = s.tick(.1, 100); assert.equal(s.water, 'rough'); assert.equal(first.filter(e => e.type === 'exit').length, 3); assert.equal(s.residents.length, 9);
  s.tick(.9, 100); assert.equal(s.residents.length, 9); s.tick(.1, 100); assert.equal(s.residents.length, 6);
});
test('lowering the volume stops losses immediately; renewed noise restarts recovery', () => {
  const s = session(); stock(s); s.tick(1, 90); const residents = s.residents.length;
  s.tick(8, 20); assert.equal(s.residents.length, residents); assert.equal(s.water, 'settling');
  s.tick(1, 90); assert.equal(s.calmFor, 0); s.tick(9.9, 20); assert.equal(s.water, 'settling'); s.tick(.1, 20); assert.equal(s.water, 'calm');
});
test('teacher pause freezes the session clock, warning, recovery and arrival credit', () => {
  const s = session(); s.tick(10, 20); s.tick(.4, 90); s.pause();
  const before = [s.elapsed, s.overFor, s.calmFor, s.quietProgress, s.residents.length]; s.tick(100, 100);
  assert.deepEqual([s.elapsed, s.overFor, s.calmFor, s.quietProgress, s.residents.length], before);
  s.resume(); s.tick(.3, 90); assert.ok(Math.abs(s.overFor - .7) < 1e-6);
});
test('capacity order is rarity, species abundance, then oldest individual', () => {
  const residents = [
    { id: 'old-solo', speciesId: 'blue-tang', order: 1 },
    { id: 'uncommon', speciesId: 'seahorse', order: 0 },
    { id: 'old-duplicate', speciesId: 'clownfish', order: 2 },
    { id: 'new-duplicate', speciesId: 'clownfish', order: 3 }
  ];
  assert.equal(capacityVictim(residents, BY_ID['sea-turtle']).id, 'old-duplicate');
  assert.equal(capacityVictim(residents.slice(0, 2), BY_ID['sea-turtle']).id, 'old-solo');
});
test('a lower-rarity passing visitor is logged and discovered without evicting rarer residents', () => {
  const s = session({ capacity: 2 }); s.admit(BY_ID['sea-turtle']); s.admit(BY_ID['whale-shark']); s.drain();
  s.admit(BY_ID.clownfish); const arrival = s.drain().find(e => e.type === 'arrival');
  assert.equal(arrival.passing, true); assert.equal(s.residents.length, 2); assert.equal(s.visits.get('clownfish').count, 2); assert.ok(s.known.has('clownfish'));
});
test('eligible new residents replace an occupant without exceeding capacity', () => {
  const s = session({ capacity: 2 }); s.admit(BY_ID.clownfish); const oldId = s.residents[0].id; s.drain();
  s.admit(BY_ID['sea-turtle']); const events = s.drain();
  assert.equal(s.residents.length, 2); assert.equal(events.find(e => e.type === 'exit').creature.id, oldId); assert.equal(events.find(e => e.type === 'exit').reason, 'space');
});
test('higher loudness increases group size without clearing the tank in one incident', () => {
  const low = session(), high = session(); stock(low); stock(high); low.tick(1, 65); high.tick(1, 100);
  assert.equal(low.residents.length, 11); assert.equal(high.residents.length, 9);
});
test('rarer creatures are statistically more vulnerable under the same sound', () => {
  const rng = seeded(); let legendary = 0;
  for (let i = 0; i < 4000; i++) { const s = session({ rng }); s.admit(BY_ID.clownfish); s.admit(BY_ID['whale-shark']); s.drain(); s.scare(65); if (!s.residents.some(r => r.speciesId === 'whale-shark')) legendary++; }
  assert.ok(legendary / 4000 > .83 && legendary / 4000 < .92);
});
test('tier odds follow the configured distribution', () => {
  const rng = seeded(9), counts = [0,0,0,0,0];
  for (let i = 0; i < 20000; i++) counts[pickSpecies(rng).tier]++;
  assert.ok(counts[0] / 20000 > .51 && counts[0] / 20000 < .57);
  assert.ok(counts[4] / 20000 > .006 && counts[4] / 20000 < .014);
});
test('sessions keep running beyond the old time limit and end only on request', () => {
  const s = session(); s.admit(BY_ID['whale-shark']); s.drain();
  const events = s.tick(7200, 100); assert.equal(s.status, 'running'); assert.ok(Math.abs(s.elapsed - 7200) < 1e-6);
  assert.equal(events.filter(e => e.type === 'end').length, 0);s.end();s.end();
  assert.equal(s.drain().filter(e => e.type === 'end').length, 1);
  const report = s.report(); assert.equal(report.visits.length, 2); assert.equal(report.visits.find(v => v.speciesId === 'whale-shark').scared, 1); assert.equal(report.residents, 1);
  assert.equal(s.tick(10, 0).length, 0);
});
test('previous discoveries do not count as new discoveries in a later session', () => {
  const s = session({ known: ['clownfish'] }); s.admit(BY_ID.clownfish); assert.equal(s.discoveries.length, 0); assert.equal(s.drain()[0].discovered, false);
});


test('every session starts with one random common visitor, logged and discovered at time zero', () => {
  const rng=seeded(81), seen=new Set();
  for(let i=0;i<400;i++){
    const s=session({rng}),resident=s.residents[0],events=s.drain();
    assert.equal(s.residents.length,1);assert.equal(BY_ID[resident.speciesId].tier,0);seen.add(resident.speciesId);
    assert.equal(events.length,1);assert.equal(events[0].type,'arrival');assert.equal(events[0].initial,true);
    assert.equal(s.report().visits[0].count,1);assert.equal(s.report().visits[0].firstAt,0);
    assert.deepEqual(s.discoveries,[resident.speciesId]);
  }
  assert.equal(seen.size,SPECIES.filter(s=>s.tier===0).length);
});
test('sustained loudness keeps the newest common resident, and never removes a lone fish', () => {
  const s=session(),starter=s.residents[0];s.drain();
  assert.equal(s.tick(60,100).filter(e=>e.type==='exit').length,0);assert.deepEqual(s.residents,[starter]);
  let newestCommon;
  for(const id of ['blue-tang','clownfish','sea-turtle','dolphin','whale-shark']){
    const fish=s.admit(BY_ID[id]);if(BY_ID[id].tier===0)newestCommon=fish;
  }
  s.drain();const exits=s.tick(120,100).filter(e=>e.type==='exit');
  assert.equal(exits.length,5);assert.deepEqual(s.residents,[newestCommon]);
  assert.ok(exits.some(e=>e.creature.id===starter.id));assert.ok(exits.every(e=>e.creature.id!==newestCommon.id));
});
test('noise survivor prioritises lowest rarity, then newest arrival within that rarity', () => {
  const s=session({capacity:2});s.admit(BY_ID['sea-turtle']);s.admit(BY_ID['whale-shark']);
  assert.ok(s.residents.every(r=>BY_ID[r.speciesId].tier>0));
  s.capacity=5;s.admit(BY_ID['blue-tang']);const latestCommon=s.admit(BY_ID.clownfish);s.admit(BY_ID.dolphin);s.drain();
  s.tick(90,100);assert.deepEqual(s.residents,[latestCommon]);
});
