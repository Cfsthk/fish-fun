import test from 'node:test';
import assert from 'node:assert/strict';
import { freshStore, newClass, validateStore, addReport, classLabel, activeDiscoveries } from '../store.mjs';
import { ReefSession } from '../engine.mjs';
import { BY_ID } from '../species.mjs';
import { SPECIES } from '../species.mjs';

test('a new classroom defaults to Traditional Chinese and 24 P.1–6 FHLW classes',()=>{
 const data=freshStore();assert.equal(data.lang,'zh');assert.equal(data.classes.length,24);assert.equal(data.activeId,'p1-f');
 assert.equal(classLabel(data.classes[0],'zh'),'P.1 信');assert.equal(classLabel(data.classes[0],'en'),'P.1 F');assert.equal(classLabel(data.classes.at(-1),'en'),'P.6 W');
});
test('V1 progress migrates without deleting retired creature visits',()=>{
 const old={version:1,lang:'en',activeId:'old-a',settings:{minutes:30},classes:[{id:'old-a',name:'Class A',unlocked:['clownfish','starfish'],sessions:[],calibration:{baseline:45,threshold:53}}]};
 const data=validateStore(old),c=data.classes.find(c=>c.id==='p1-f');assert.equal(data.version,2);assert.equal(data.lang,'zh');assert.equal(data.activeId,'p1-f');assert.ok(c.unlocked.includes('starfish'));assert.deepEqual(activeDiscoveries(c),['clownfish']);assert.equal(c.calibration.threshold,53);
});
test('all fifty species can be restored from a session report',()=>{
 const data=freshStore(),s=new ReefSession({capacity:40});for(const species of SPECIES)s.admit(species);s.end();addReport(data,data.activeId,s.report());
 const restored=validateStore(JSON.parse(JSON.stringify(data)));assert.equal(activeDiscoveries(restored.classes[0]).length,50);assert.equal(restored.classes[0].sessions[0].visits.length,50);
});
test('an explicit English choice persists in V2',()=>{const data=freshStore();data.lang='en';assert.equal(validateStore(data).lang,'en');});
test('arrival frequency defaults to 1× for new stores and old saved settings',()=>{
 const data=freshStore();assert.equal(data.settings.arrivalRate,1);delete data.settings.arrivalRate;
 assert.equal(validateStore(data).settings.arrivalRate,1);
});
test('fractional arrival frequency persists through a store round trip',()=>{
 const data=freshStore();data.settings.arrivalRate=2.5;
 const restored=validateStore(JSON.parse(JSON.stringify(data)));assert.equal(restored.settings.arrivalRate,2.5);
 assert.equal(new ReefSession({arrivalRate:restored.settings.arrivalRate}).arrivalRate,2.5);
});
test('restored arrival frequency stays finite, within range and at a supported slider step',()=>{
 for(const [value,expected] of [[0,1],[4,3],[2.36,2.4],[Infinity,1],[NaN,1],['3',1],[null,1]]){
  const data=freshStore();data.settings.arrivalRate=value;assert.equal(validateStore(data).settings.arrivalRate,expected);
 }
});
test('partial session snapshots update the same report rather than duplicating it',()=>{
 const data=freshStore(),s=new ReefSession({rng:()=>0});addReport(data,data.activeId,s.report());s.admit(BY_ID.clownfish);addReport(data,data.activeId,s.report());assert.equal(data.classes[0].sessions.length,1);assert.equal(data.classes[0].sessions[0].visits[0].count,2);
});

test('class discoveries and history stay independent and survive a backup round trip', () => {
  const data = freshStore(), first = data.classes[0], other = newClass('Class B'); data.classes.push(other);
  const s = new ReefSession({rng:()=>0}); s.tick(3, 10); s.end(); addReport(data, first.id, s.report());
  assert.equal(first.sessions.length, 1); assert.deepEqual(first.unlocked, ['clownfish']); assert.equal(other.unlocked.length, 0);
  const restored = validateStore(JSON.parse(JSON.stringify(data))); assert.equal(restored.classes[0].sessions[0].visits[0].count, 1); assert.equal(restored.classes.find(c=>c.id===other.id).unlocked.length, 0);
});
test('demo sessions cannot change permanent class progress', () => {
  const data = freshStore(), s = new ReefSession({ demo: true }); s.admit(BY_ID['whale-shark']); s.end(); addReport(data, data.activeId, s.report());
  assert.deepEqual(data.classes[0].unlocked, []); assert.deepEqual(data.classes[0].sessions, []);
});
test('backup import rejects invalid species, duplicate class IDs and malformed counts', () => {
  const invalidSpecies = freshStore(); invalidSpecies.classes[0].unlocked = ['constructor']; assert.throws(() => validateStore(invalidSpecies));
  const duplicated = freshStore(); duplicated.classes.push(duplicated.classes[0]); assert.throws(() => validateStore(duplicated));
  const data = freshStore(), s = new ReefSession({rng:()=>0}); s.admit(BY_ID.clownfish); s.end(); const r = s.report(); r.visits[0].count = Infinity; data.classes[0].sessions.push(r); assert.throws(() => validateStore(data));
});
test('stored visitor reports restore any corresponding missing discovery', () => {
  const data = freshStore(), s = new ReefSession({rng:()=>0}); s.admit(BY_ID.clownfish); s.end(); data.classes[0].sessions.push(s.report());
  const restored = validateStore(data); assert.deepEqual(restored.classes[0].unlocked, ['clownfish']);
});


test('old duration settings are ignored and manually ended sessions can exceed one day',()=>{
 const data=freshStore();data.settings.minutes=5;
 const s=new ReefSession({rng:()=>0});s.tick(90001,100);s.admit(BY_ID['sea-turtle']);s.end();addReport(data,data.activeId,s.report());
 const restored=validateStore(JSON.parse(JSON.stringify(data))),report=restored.classes[0].sessions[0];
 assert.equal(Object.hasOwn(restored.settings,'minutes'),false);assert.equal(report.duration,90001);
 assert.ok(report.visits.find(v=>v.speciesId==='sea-turtle').firstAt>86400);
 assert.equal(report.coins,150);
});

test('session tokens persist per class and old reports restore with zero tokens',()=>{
 const data=freshStore(),s=new ReefSession({rng:()=>0});s.tick(600,20);s.end();addReport(data,data.activeId,s.report());
 const restored=validateStore(JSON.parse(JSON.stringify(data)));
 assert.ok(restored.classes[0].sessions[0].coins>0);assert.equal(restored.classes[0].sessions[0].coins,s.report().coins);
 assert.equal(restored.classes[1].sessions.length,0);
 delete data.classes[0].sessions[0].coins;assert.equal(validateStore(data).classes[0].sessions[0].coins,0);
});
test('invalid or over-budget stored token amounts are rejected',()=>{
 const data=freshStore(),s=new ReefSession({rng:()=>0});addReport(data,data.activeId,s.report());
 for(const coins of [-1,150.01,Infinity,NaN,'100']){data.classes[0].sessions[0].coins=coins;assert.throws(()=>validateStore(data));}
});
