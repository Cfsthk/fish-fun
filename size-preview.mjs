import {ReefScene} from './scene.mjs';

// A comparison scene uses the production renderer without a microphone or class storage.
const scene=new ReefScene(document.getElementById('reefCanvas'));
await scene.load();
const residents=[
 ['blue-tang',.15,.16,1],['hammerhead',.39,.28,-1],['reef-shark',.77,.28,1],
 ['clownfish',.13,.41,1],['yellow-tang',.59,.43,-1],['damselfish',.88,.47,-1],
 ['humpback-whale',.29,.65,1],['orca',.75,.68,-1],['fusilier',.52,.84,-1]
];
residents.forEach(([speciesId,x,y,facing],i)=>{
 const id='preview-'+i;scene.add({id,speciesId},{initial:true});
 Object.assign(scene.creatures.get(id),{x,y,targetY:y,facing,cruiseDir:facing,vx:10*facing,vy:0,phase:i*1.4});
});
scene.time=3;scene.draw(0,true);scene.freeze();
const button=document.getElementById('previewPlay');button.disabled=false;
button.addEventListener('click',()=>{
 scene.freeze(!scene.frozen);button.setAttribute('aria-label',scene.frozen?'播放':'暫停');button.title=scene.frozen?'播放':'暫停';
 button.innerHTML=scene.frozen?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>';
});
let previous=performance.now();
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-previous)/1000);previous=now;scene.draw(dt);}
requestAnimationFrame(frame);
