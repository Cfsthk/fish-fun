import { BY_ID, SPECIES } from './species.mjs';
import { COIN_CAP } from './engine.mjs';
const KEY = 'morning-reef-v2';
const OLD_KEY = 'morning-reef-v1';
export const HOUSES = [{key:'f',zh:'信',en:'F'},{key:'h',zh:'望',en:'H'},{key:'l',zh:'愛',en:'L'},{key:'w',zh:'智',en:'W'}];
export const DEFAULT_SETTINGS = {capacity:20,margin:8,threshold:65,reducedMotion:false};
export const newClass = (name='Class A') => ({id:crypto.randomUUID(),name,unlocked:[],sessions:[],calibration:null});
export function presetClasses() {
  return Array.from({length:6},(_,i)=>HOUSES.map(h=>({id:'p'+(i+1)+'-'+h.key,name:'P.'+(i+1)+' '+h.zh,grade:i+1,house:h.key,unlocked:[],sessions:[],calibration:null}))).flat();
}
export function classLabel(c,lang='zh') {
  const h=HOUSES.find(h=>h.key===c.house);
  return c.grade&&h?'P.'+c.grade+' '+h[lang]:c.name;
}
export function freshStore() {return {version:2,lang:'zh',classes:presetClasses(),activeId:'p1-f',settings:{...DEFAULT_SETTINGS}};}
export function activeDiscoveries(c) {return c.unlocked.filter(id=>SPECIES.some(s=>s.id===id));}
const finite=(n,a,b)=>typeof n==='number'&&Number.isFinite(n)&&n>=a&&n<=b;
const knownCount=Object.keys(BY_ID).length;
function cleanReport(r) {
  if(!r||typeof r.id!=='string'||r.id.length>100||!Number.isFinite(Date.parse(r.startedAt))||!finite(r.duration,0,Number.MAX_SAFE_INTEGER)||!finite(r.quietSeconds,0,r.duration+1)||!Array.isArray(r.visits)||r.visits.length>knownCount||!Array.isArray(r.discoveries))throw new Error('Invalid session');
  const coins=r.coins??0;if(!finite(coins,0,COIN_CAP))throw new Error('Invalid coins');
  const seen=new Set();
  const visits=r.visits.map(v=>{
    if(!v||!Object.hasOwn(BY_ID,v.speciesId)||seen.has(v.speciesId)||!finite(v.count,1,Number.MAX_SAFE_INTEGER)||!finite(v.scared??0,0,v.count)||!finite(v.firstAt??0,0,r.duration+1))throw new Error('Invalid visitor');
    seen.add(v.speciesId);return {speciesId:v.speciesId,count:Math.floor(v.count),scared:Math.floor(v.scared??0),firstAt:v.firstAt??0};
  });
  if(r.discoveries.length>knownCount||r.discoveries.some(id=>!seen.has(id)))throw new Error('Invalid discovery');
  return {id:r.id,startedAt:new Date(r.startedAt).toISOString(),duration:Math.round(r.duration),quietSeconds:Math.min(Math.round(r.quietSeconds),Math.round(r.duration)),coins:Math.floor(coins),visits,discoveries:[...new Set(r.discoveries)],residents:finite(r.residents,0,40)?Math.floor(r.residents):0,demo:false};
}
function presetId(c) {
  if(/^p[1-6]-[fhlw]$/.test(c.id))return c.id;
  if(Number.isInteger(c.grade)&&c.grade>=1&&c.grade<=6&&HOUSES.some(h=>h.key===c.house))return 'p'+c.grade+'-'+c.house;
  const match=c.name.match(/^P\.?\s*([1-6])\s*([FHLW信望愛智])$/i);
  if(match){const h=HOUSES.find(h=>h.en===match[2].toUpperCase()||h.zh===match[2]);return 'p'+match[1]+'-'+h.key;}
  if(c.name==='Class A')return 'p1-f';
  return null;
}
export function validateStore(input) {
  if(!input||![1,2].includes(input.version)||!Array.isArray(input.classes)||input.classes.length<1||input.classes.length>100)throw new Error('Invalid backup');
  const ids=new Set();
  const cleaned=input.classes.map(c=>{
    if(!c||typeof c.id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(c.id)||ids.has(c.id)||typeof c.name!=='string'||!c.name.trim()||c.name.length>32||!Array.isArray(c.unlocked)||c.unlocked.length>knownCount||c.unlocked.some(id=>!Object.hasOwn(BY_ID,id))||!Array.isArray(c.sessions)||c.sessions.length>100)throw new Error('Invalid class');
    ids.add(c.id);const sessions=c.sessions.map(cleanReport);
    const calibration=c.calibration&&finite(c.calibration.threshold,5,98)?{threshold:c.calibration.threshold,baseline:finite(c.calibration.baseline,0,100)?c.calibration.baseline:null}:null;
    return {id:c.id,name:c.name.trim(),grade:c.grade,house:c.house,unlocked:[...new Set([...c.unlocked,...sessions.flatMap(r=>r.visits.map(v=>v.speciesId))])],sessions,calibration};
  });
  const classes=presetClasses();let activeId='p1-f';
  for(const c of cleaned){
    const match=presetId(c);
    if(match){
      const target=classes.find(p=>p.id===match);target.unlocked=[...new Set([...target.unlocked,...c.unlocked])];
      target.sessions=[...new Map([...target.sessions,...c.sessions].map(r=>[r.id,r])).values()].sort((a,b)=>Date.parse(b.startedAt)-Date.parse(a.startedAt)).slice(0,100);
      if(c.calibration)target.calibration=c.calibration;
      if(c.id===input.activeId)activeId=match;
    }else{classes.push(c);if(c.id===input.activeId)activeId=c.id;}
  }
  const s=input.settings||{};
  return {version:2,lang:input.version===1?'zh':input.lang==='en'?'en':'zh',classes,activeId,settings:{capacity:finite(s.capacity,10,40)?Math.round(s.capacity):20,margin:finite(s.margin,2,20)?Math.round(s.margin):8,threshold:finite(s.threshold,5,98)?Math.round(s.threshold):65,reducedMotion:s.reducedMotion===true}};
}
export function readStore() {
  try{const raw=localStorage.getItem(KEY)??localStorage.getItem(OLD_KEY);return {data:raw?validateStore(JSON.parse(raw)):freshStore(),error:null};}
  catch(error){
    try{const raw=localStorage.getItem(KEY);if(raw&&!localStorage.getItem(KEY+'-recovery'))localStorage.setItem(KEY+'-recovery',raw);}catch{}
    return {data:freshStore(),error};
  }
}
export function writeStore(data){localStorage.setItem(KEY,JSON.stringify(data));}
export function addReport(data,classId,report){
  if(report.demo)return;const c=data.classes.find(c=>c.id===classId);if(!c)return;
  c.unlocked=[...new Set([...c.unlocked,...report.visits.map(v=>v.speciesId)])];
  const index=c.sessions.findIndex(r=>r.id===report.id);if(index>=0)c.sessions[index]=report;else c.sessions.unshift(report);
  c.sessions=c.sessions.slice(0,100);
}
