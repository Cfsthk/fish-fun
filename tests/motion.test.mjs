import test from 'node:test';
import assert from 'node:assert/strict';
import {createSwimmer,advanceSwimmer,beginTurn} from '../motion.mjs';
import {SPECIES} from '../species.mjs';
const seeded=(seed=29)=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
test('all fifty collectible species use swimming movement and side-view atlases',()=>{
 assert.equal(SPECIES.length,50);assert.equal(new Set(SPECIES.map(s=>s.id)).size,50);
 assert.ok(SPECIES.every(s=>['fish','eel','tentacle','turtle','ray','dolphin'].includes(s.motion)));
 assert.ok(SPECIES.every(s=>['a','b','large','legendary'].includes(s.atlas)&&s.cell>=0&&s.cell<s.cols*s.rows));
 assert.equal(new Set(SPECIES.map(s=>s.atlas+':'+s.cell)).size,50);
 assert.ok(!SPECIES.some(s=>['starfish','hermit-crab','seahorse','jellyfish'].includes(s.id)));
});
test('every calm species patrols the tank horizontally with limited vertical drift',()=>{
 const rng=seeded(),swimmers=SPECIES.map((s,i)=>createSwimmer(s,i,rng,true));
 const samples=swimmers.map(c=>({horizontal:0,vertical:0,min:c.x,max:c.x,minY:c.y,maxY:c.y}));
 for(let i=0;i<3600;i++)swimmers.forEach((c,j)=>{
  const x=c.x,y=c.y;advanceSwimmer(c,.05,{rng});const sample=samples[j];
  sample.horizontal+=Math.abs(c.x-x)*960;sample.vertical+=Math.abs(c.y-y)*540;
  sample.min=Math.min(sample.min,c.x);sample.max=Math.max(sample.max,c.x);sample.minY=Math.min(sample.minY,c.y);sample.maxY=Math.max(sample.maxY,c.y);
  assert.ok(c.x>=.025&&c.x<=.975);assert.ok(c.y>=.08&&c.y<=.88);
 });
 assert.ok(samples.every(s=>s.horizontal>5*s.vertical));
 assert.ok(samples.every(s=>s.max-s.min>.4));
 assert.ok(samples.filter(s=>s.max-s.min>.55).length>=45);
 assert.ok(samples.every(s=>s.maxY-s.minY<.3));
});
test('every resident accelerates and changes heading during collective panic',()=>{
 const rng=seeded(),swimmers=SPECIES.slice(0,20).map((s,i)=>createSwimmer(s,i,rng,true));
 const samples=swimmers.map(()=>({max:0,directions:new Set()}));
 for(let i=0;i<180;i++)swimmers.forEach((c,j)=>{advanceSwimmer(c,1/30,{rng,panic:1});samples[j].max=Math.max(samples[j].max,Math.hypot(c.vx,c.vy));samples[j].directions.add((c.vx>0?'R':'L')+(c.vy>0?'D':'U'));});
 assert.ok(samples.every(s=>s.max>55));assert.ok(samples.every(s=>s.directions.size>=3));
});
test('left and right turns brake, switch side once at low speed, then accelerate',()=>{
 for(const direction of [1,-1]){
  const c=createSwimmer(SPECIES[0],0,seeded(),true);c.x=.5;c.y=.5;c.facing=direction;c.vx=direction*12;c.cruiseDir=-direction;c.wanderIn=100;
  assert.equal(beginTurn(c,-direction),true);let switches=0,oldFacing=c.facing,maxSpeedAtSwitch=0;
  for(let i=0;i<40;i++){
   advanceSwimmer(c,.02);
   if(c.facing!==oldFacing){switches++;maxSpeedAtSwitch=Math.max(maxSpeedAtSwitch,Math.abs(c.vx));oldFacing=c.facing;}
   assert.ok(c.facing===1||c.facing===-1);
  }
  assert.equal(switches,1);assert.ok(maxSpeedAtSwitch<.2);assert.equal(c.facing,-direction);assert.ok(c.vx*-direction>8);assert.equal(c.turn,null);
 }
});
test('cruisers turn inward before reaching an aquarium wall',()=>{
 for(const direction of [1,-1]){
  const c=createSwimmer(SPECIES[47],0,seeded(),true);c.x=direction>0?.9:.1;c.facing=direction;c.vx=direction*14;c.cruiseDir=direction;
  for(let i=0;i<60;i++)advanceSwimmer(c,.025);
  assert.equal(c.facing,-direction);assert.ok(c.vx*-direction>0);assert.ok(c.x>.025&&c.x<.975);
 }
});

test('large bodies have room at every wall during calm swimming and panic',()=>{
 for(const [width,height] of [[960,540],[600,900]])for(const panic of [0,1]){
  const rng=seeded(17),c=createSwimmer(SPECIES[48],0,rng,true),halfWidth=226,halfHeight=170;
  c.x=.5;c.y=.5;c.targetY=.5;let left=c.x,right=c.x;
  for(let i=0;i<3600;i++){
   advanceSwimmer(c,.05,{width,height,panic,rng,halfWidth,halfHeight});
   assert.ok(c.x*width>=halfWidth-1e-8&&(1-c.x)*width>=halfWidth-1e-8);
   assert.ok(c.y*height>=halfHeight-1e-8&&(1-c.y)*height>=halfHeight-1e-8);
   left=Math.min(left,c.x);right=Math.max(right,c.x);
  }
  assert.ok(right-left>(1-2*halfWidth/width)*.7);
 }
});

test('a large arrival swims fully inside its safe boundary before becoming a resident',()=>{
 for(const direction of [-1,1]){
  const c=createSwimmer(SPECIES[48],0,seeded()),halfWidth=226,halfHeight=170;
  c.facing=direction;c.cruiseDir=direction;c.vx=direction*c.cruiseSpeed;c.x=direction>0?-.07:1.07;c.y=.5;c.targetY=.5;
  let entered=false;
  for(let i=0;i<1200&&!entered;i++){
   const before=c.x;advanceSwimmer(c,.05,{halfWidth,halfHeight});
   assert.ok(Math.abs(c.x-before)<.003);
   if(c.entered){entered=true;assert.ok(c.x*960>=halfWidth&&(1-c.x)*960>=halfWidth);}
  }
  assert.equal(entered,true);
 }
});


test('same-species individuals have different preferences and smoothly varying bounded speeds',()=>{
 const rng=seeded(95);
 for(const species of SPECIES){
  const [lo,hi]=species.swimRange;
  assert.ok(Number.isFinite(lo)&&lo>0&&Number.isFinite(hi)&&hi>lo);
  const fish=Array.from({length:10},(_,i)=>createSwimmer(species,i,rng,true));
  assert.ok(new Set(fish.map(c=>c.preferredSpeed.toFixed(3))).size>5);
  const ranges=fish.map(c=>({min:c.cruiseSpeed,max:c.cruiseSpeed}));
  for(let step=0;step<1800;step++)fish.forEach((c,i)=>{
   const before=c.cruiseSpeed;advanceSwimmer(c,.05,{rng});
   assert.ok(c.cruiseSpeed>=lo&&c.cruiseSpeed<=hi);
   assert.ok(Math.abs(c.cruiseSpeed-before)<(hi-lo)*.025);
   if(!c.turn){const speed=Math.hypot(c.vx,c.vy);assert.ok(speed>=lo-1e-8&&speed<=hi+1e-8);}
   ranges[i].min=Math.min(ranges[i].min,c.cruiseSpeed);ranges[i].max=Math.max(ranges[i].max,c.cruiseSpeed);
  });
  assert.ok(ranges.every(r=>r.max-r.min>(hi-lo)*.15));
 }
});
