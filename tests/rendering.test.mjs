import test from 'node:test';
import assert from 'node:assert/strict';
import {ReefScene} from '../scene.mjs';
import {BY_ID} from '../species.mjs';

function sample(id,time,facing=1,animate=true,panic=0){
 const species=BY_ID[id],scene=Object.create(ReefScene.prototype),strips=[],flips=[];
 scene.time=time;scene.panic=panic;
 scene.sprites=new Map([[id,{image:{},x:0,y:0,w:240,h:120}]]);
 const context={save(){},restore(){},translate(){},scale(...xy){flips.push(xy);},drawImage(...args){strips.push({x:args[1],y:args[6]});}};
 scene.side(context,species,0,0,species.size,0,facing,animate);
 return {species,strips,flips};
}

test('whale, orca and dolphin tails flex visibly up and down while the head stays steady',()=>{
 for(const id of ['humpback-whale','orca','dolphin'])for(const facing of [-1,1]){
  const samples=Array.from({length:32},(_,i)=>sample(id,i*Math.PI*2/2.3/32,facing));
  const ys=samples.map(s=>s.strips[1].y),head=samples.map(s=>s.strips.at(-2).y),size=BY_ID[id].size;
  assert.ok(Math.max(...ys)-Math.min(...ys)>size*.09);
  assert.ok(Math.max(...head)-Math.min(...head)<1e-9);
  assert.ok(samples.every(s=>s.flips[0][0]===facing&&s.flips[0][1]===1));
 }
});

test('static icons do not flap and panic tail poses remain bounded',()=>{
 for(const id of ['humpback-whale','orca','dolphin']){
  assert.deepEqual(sample(id,0,1,false).strips,sample(id,4,1,false).strips);
  const species=BY_ID[id],baseline=-species.size/4;
  for(let i=0;i<32;i++)for(const strip of sample(id,i*.1,1,true,1).strips)assert.ok(Math.abs(strip.y-baseline)<=species.size*.1);
 }
});
