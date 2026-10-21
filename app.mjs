import { SPECIES, BY_ID, TIERS } from './species.mjs';
import { ReefSession, normalizeArrivalRate } from './engine.mjs';
import { ReefScene } from './scene.mjs';
import { ClassroomMicrophone } from './microphone.mjs';
import { readStore, writeStore, addReport, classLabel, HOUSES, activeDiscoveries } from './store.mjs';
import { COPY } from './i18n.mjs';
const $=id=>document.getElementById(id);
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=readStore();let data=read.data;
const t=key=>COPY[data.lang][key]||key;
const currentClass=()=>data.classes.find(c=>c.id===data.activeId)||data.classes[0];
const name=s=>s[data.lang];
const label=c=>classLabel(c,data.lang);
const tier=i=>TIERS[i][data.lang];
const arrivalHelp=rate=>t('arrivalHelp').replace('{min}',Math.round(45/rate*10)/10).replace('{max}',Math.round(60/rate*10)/10);
const text=(id,value)=>{const el=$(id);if(el&&el.textContent!==String(value))el.textContent=String(value);};
const btn=(action,key,kind='secondary',attrs='')=>`<button type="button" class="${kind}" data-action="${action}" ${attrs}>${esc(t(key))}</button>`;
const scene=new ReefScene($('reefCanvas')),mic=new ClassroomMicrophone();
let session=null,sessionClassId=null,wantsRunning=false,resumeAfterSettings=true,level=0;
let page=null,guideOrigin='settings',guideFilter='all',selectedReport=null,selectedGrade=null;
let micIssue='',storageIssue=!!read.error,connectionPromise=null,calibration=null,firstMicIssueShown=false,hiddenWasRunning=false;

function save(){try{writeStore(data);storageIssue=false;}catch{storageIssue=true;}updateStatus();}
function announce(value){text('accessibleStatus',value);}
function updateStatus(){
 document.documentElement.lang=data.lang==='zh'?'zh-Hant-HK':'en';document.title='魚樂無窮';
 $('reefCanvas').setAttribute('aria-label',t('aquarium'));
 for(const [id,key] of [['settingsButton','settings'],['pauseButton','pause']]){$(id).setAttribute('aria-label',t(key));$(id).title=t(key);}
 const coins=Math.floor(session?.coins??0),coinLabel=t('coins')+(data.lang==='zh'?'：':': ')+coins;text('coinCount',coins);$('coinCounter').setAttribute('aria-label',coinLabel);$('coinCounter').title=coinLabel;
 $('settingsButton').dataset.attention=String(!!micIssue||storageIssue||!!connectionPromise);
 document.body.dataset.session=session?.status==='ended'?'ended':session?.status==='running'?'running':wantsRunning&&!page?'waiting':'paused';
 document.body.dataset.page=page||'aquarium';
 document.body.dataset.water=session?.water||'calm';document.body.dataset.panic=String(session?.status==='running'&&level>session.threshold);
 if($('microphoneState'))text('microphoneState',connectionPromise?t('connecting'):micIssue||mic.stream&&!mic.lost?t(micIssue?'soundIssue':'connected'):t('waiting'));
 if($('microphoneDetail')){text('microphoneDetail',micIssue||'');$('microphoneDetail').hidden=!micIssue;}
 if($('settingsStorage')){$('settingsStorage').hidden=!storageIssue;text('settingsStorage',t('storageError'));}
 scene.reducedMotion=data.settings.reducedMotion||matchMedia('(prefers-reduced-motion: reduce)').matches;
 scene.state(session,level);
}
function makeSession(){sessionClassId=currentClass().id;session=new ReefSession({capacity:data.settings.capacity,threshold:currentClass().calibration?.threshold??data.settings.threshold,arrivalRate:data.settings.arrivalRate,known:currentClass().unlocked});session.pause();scene.clear();events(session.drain());scene.draw(0,true);updateStatus();}
function freeze(){session?.pause();mic.pause();scene.freeze(true);level=0;updateStatus();}
async function connect(){
 if(mic.stream&&!mic.lost)return;
 if(connectionPromise)return connectionPromise;
 connectionPromise=(async()=>{try{await mic.connect();micIssue='';}catch(error){micIssue=t(error.name==='NotAllowedError'||error.name==='SecurityError'?'micDenied':error.name==='NotFoundError'?'micMissing':error.name==='UnsupportedError'?'micUnsupported':'micError');throw error;}finally{connectionPromise=null;updateStatus();}})();
 updateStatus();return connectionPromise;
}
async function resumeSession(){
 if(!session||session.status==='ended')return;
 wantsRunning=true;
 try{
  await connect();
  if(!wantsRunning||$('modal').open){if(!calibration)mic.pause();return;}
  await mic.resume();
  if(!wantsRunning||$('modal').open){mic.pause();return;}
  level=0;session.resume();scene.freeze(false);announce(t('running'));updateStatus();
 }catch{
  session.pause();scene.freeze(!!page||!wantsRunning);updateStatus();
  if(!firstMicIssueShown&&!$('modal').open){firstMicIssueShown=true;openSettings();}
 }
}
function setModal(title,body,next,{wide=false,closable=true}={}){
 page=next;$('modal').className=(wide?'wide ':'')+(next==='pause'?'pause-window':next==='classes'?'class-picker':'');
 $('modalContent').innerHTML=`<div class="modal-head"><h1 id="modalTitle">${esc(title)}</h1>${closable?`<button type="button" class="modal-close" data-action="close" aria-label="${esc(t('close'))}">×</button>`:''}</div><div class="modal-body">${body}</div>`;
 $('modal').setAttribute('aria-labelledby','modalTitle');if(!$('modal').open)$('modal').showModal();
}
function closeRaw(){page=null;$('modal').close();}
function showClassPicker(){
 wantsRunning=false;freeze();
 const choice=c=>`<button type="button" class="class-choice" data-action="chooseClass" data-class-id="${esc(c.id)}" aria-label="${esc(label(c))}" ${scene.ready?'':'disabled'}>${c.grade&&c.house?`<strong>${esc(HOUSES.find(h=>h.key===c.house)[data.lang])}</strong>`:esc(label(c))}</button>`;
 const presets=data.classes.filter(c=>c.grade===selectedGrade&&c.house),others=data.classes.filter(c=>!c.grade||!c.house);
 let body=`<div class="grade-choices" role="group" aria-label="${esc(t('grade'))}">${Array.from({length:6},(_,i)=>`<button type="button" class="grade-choice" data-action="chooseGrade" data-grade="${i+1}" aria-label="P.${i+1}" aria-pressed="${selectedGrade===i+1}">${i+1}</button>`).join('')}</div>`;
 if(selectedGrade)body+=`<div class="class-choices house-choices" role="group" aria-label="${esc(t('class'))}">${presets.map(choice).join('')}</div>`;
 if(others.length)body+=`<div class="other-classes"><h2>${esc(t('otherClasses'))}</h2><div class="class-choices">${others.map(choice).join('')}</div></div>`;
 setModal(selectedGrade?'P.'+selectedGrade+' · '+t('chooseClass'):t('chooseGrade'),body,'classes',{closable:false});updateStatus();
 const focus=selectedGrade?$('modalContent').querySelector(`[data-class-id="${data.activeId}"]`)||$('modalContent').querySelector('.house-choices button:not(:disabled)'):$('modalContent').querySelector(`[data-grade="${currentClass().grade||1}"]`);
 focus?.focus({preventScroll:true});
}
async function chooseClass(id){
 if(page!=='classes'||!scene.ready||!data.classes.some(c=>c.id===id))return;
 data.activeId=id;closeRaw();save();makeSession();scene.freeze(false);await resumeSession();
}
function openSettings(){resumeAfterSettings=wantsRunning&&session?.status!=='ended';wantsRunning=false;freeze();renderSettings();}
function classOptions(){
 let html='';for(let grade=1;grade<=6;grade++){html+=`<optgroup label="P.${grade}">`+HOUSES.map(h=>{const c=data.classes.find(c=>c.grade===grade&&c.house===h.key);return c?`<option value="${esc(c.id)}" ${c.id===data.activeId?'selected':''}>${esc(label(c))}</option>`:'';}).join('')+'</optgroup>';}
 const other=data.classes.filter(c=>!c.grade||!c.house);if(other.length)html+=`<optgroup label="${esc(t('otherClasses'))}">`+other.map(c=>`<option value="${esc(c.id)}" ${c.id===data.activeId?'selected':''}>${esc(label(c))}</option>`).join('')+'</optgroup>';return html;
}
function renderSettings(message=''){
 const s=data.settings,threshold=currentClass().calibration?.threshold??s.threshold;
 const body=`<div class="settings-grid"><div class="field"><label for="classSelect">${esc(t('class'))}</label><select id="classSelect">${classOptions()}</select></div><div class="field"><label for="languageSelect">${esc(t('language'))}</label><select id="languageSelect"><option value="zh" ${data.lang==='zh'?'selected':''}>繁體中文</option><option value="en" ${data.lang==='en'?'selected':''}>English</option></select></div></div>
 <div class="settings-block"><div class="setting-row"><span>${esc(t('microphone'))}</span><span class="connection ${micIssue?'error':''}"><i></i><span id="microphoneState"></span></span></div><p class="status-line error" id="microphoneDetail" hidden></p>
 <label class="field-label" for="thresholdInput">${esc(t('threshold'))}</label><input id="thresholdInput" type="range" min="5" max="98" step="1" value="${threshold}"><div class="range-ends"><span>${esc(t('stricter'))}</span><span>${esc(t('looser'))}</span></div>
 <div class="button-row">${btn('calibrate','calibrate','secondary',calibration?'disabled':'')}${btn('retry','retry','quiet')}</div><p class="help">${esc(t('calibrationHelp'))}</p><div class="calibration-progress" id="calibrationProgress" ${calibration?'':'hidden'}><div id="calibrationFill"></div></div><p id="calibrationStatus" class="status-line ${message?'success':''}">${esc(message)}</p></div>
 <div class="settings-block"><label class="field-label frequency-label" for="arrivalRateInput">${esc(t('arrivalRate'))}<output id="arrivalRateValue" for="arrivalRateInput">${s.arrivalRate}×</output></label><input id="arrivalRateInput" type="range" min="1" max="3" step="0.1" value="${s.arrivalRate}" aria-valuetext="${s.arrivalRate}×" aria-describedby="arrivalRateHelp"><div class="range-ends"><span>1×</span><span>3×</span></div><p class="help" id="arrivalRateHelp">${esc(arrivalHelp(s.arrivalRate))}</p></div>
 <div class="settings-block"><div class="field"><label for="capacityInput">${esc(t('capacity'))}</label><input type="number" id="capacityInput" min="10" max="40" step="1" value="${s.capacity}"></div></div><p class="help">${esc(t('nextSession'))}</p>
 <label class="check"><input type="checkbox" id="motionInput" ${s.reducedMotion?'checked':''}><span>${esc(t('motion'))}</span></label><div class="button-row">${btn('fullscreen',document.fullscreenElement||document.body.classList.contains('focus-mode')?'exitFull':'full','quiet')}</div>
 <div class="settings-links">${btn('guideSettings','guide')}</div><p class="status-line error" id="settingsStorage" hidden></p><p class="privacy">${esc(t('privacy'))}</p>`;
 setModal(t('settings'),body,'settings');updateStatus();
}
function showPause(){
 if(session?.status==='ended'){showReport(selectedReport||session.report());return;}
 wantsRunning=false;cancelCalibration();freeze();setModal(t('paused'),`<div class="pause-buttons">${btn('resume','resume','primary')}${btn('restart','restart','secondary')}${btn('end','end','quiet')}</div>`,'pause',{closable:false});announce(t('paused'));
}
function archive({always=false}={}){
 if(!session)return null;session.end();session.drain();const report=session.report();
 if(always||report.duration>0||report.visits.length){addReport(data,sessionClassId,report);save();}
 return report;
}
async function restart(){
 cancelCalibration();archive();closeRaw();makeSession();scene.freeze(false);await resumeSession();
}
function finish(){
 cancelCalibration();wantsRunning=false;const r=archive({always:true});if(!r)return;
 mic.pause();scene.freeze(true);selectedReport=r;showReport(r);announce(t('endStatus'));updateStatus();
}
function showReport(report){
 selectedReport=report;const total=report.visits.reduce((n,v)=>n+v.count,0);
 let body=`<div class="report-summary"><div><strong>${total}</strong><small>${esc(t('totalVisits'))}</small></div><div><strong>${report.visits.length}</strong><small>${esc(t('species'))}</small></div><div><strong>${report.discoveries.length}</strong><small>${esc(t('new'))}</small></div><div class="report-coins"><strong>${report.coins??0}</strong><small>${esc(t('coins'))}</small></div></div>`;
 body+=report.visits.length?`<div class="visitors-grid">${report.visits.map(v=>{const s=BY_ID[v.speciesId];return `<div class="visitor"><canvas id="visitor-${s.id}" aria-hidden="true"></canvas><div><strong>${esc(name(s))}</strong><small style="color:${TIERS[s.tier].color}">${esc(tier(s.tier))} · ×${v.count}</small>${report.discoveries.includes(s.id)?`<em>${esc(t('newTag'))}</em>`:''}</div></div>`;}).join('')}</div>`:`<p class="empty">${esc(t('noVisitors'))}</p>`;
 body+=`<div class="modal-footer">${btn('guideReport','guide')}${btn('restart','restart','primary')}</div>`;
 setModal(t('visitors'),body,'report',{wide:true});for(const v of report.visits)scene.icon($('visitor-'+v.speciesId),BY_ID[v.speciesId],{size:66});
}
function showGuide(origin=guideOrigin){
 guideOrigin=origin;const known=new Set(activeDiscoveries(currentClass())),list=SPECIES.filter(s=>guideFilter==='all'||s.tier===Number(guideFilter));
 const body=`<div class="guide-top"><p>${esc(label(currentClass()))}</p><strong>${known.size}<small> / ${SPECIES.length} ${esc(t('discovered'))}</small></strong></div><div class="filters"><button type="button" data-filter="all" aria-pressed="${guideFilter==='all'}">${esc(t('all'))}</button>${TIERS.map((r,i)=>`<button type="button" data-filter="${i}" aria-pressed="${guideFilter===String(i)}">${esc(tier(i))}</button>`).join('')}</div><div class="specimens">${list.map(s=>`<figure class="specimen ${known.has(s.id)?'':'locked'}"><canvas id="specimen-${s.id}" aria-hidden="true"></canvas><figcaption>${esc(known.has(s.id)?name(s):t('unknown'))}</figcaption><small style="color:${TIERS[s.tier].color}">${esc(tier(s.tier))}</small></figure>`).join('')}</div><div class="modal-footer">${btn('close',guideOrigin==='report'?'backToVisitors':'backToSettings')}</div>`;
 setModal(t('guide'),body,'guide',{wide:true});for(const s of list)scene.icon($('specimen-'+s.id),s,{silhouette:!known.has(s.id)});
}
function closeCurrent(){
 if(page==='classes')return;
 if(page==='guide'){if(guideOrigin==='report')showReport(selectedReport);else renderSettings();return;}
 if(page==='report'){closeRaw();return;}
 const old=page;cancelCalibration();closeRaw();
 if(old==='pause'){resumeSession();return;}
 if(old==='settings'&&resumeAfterSettings&&session?.status!=='ended'){resumeSession();return;}
 updateStatus();
}
function cancelCalibration(){if(calibration){calibration=null;mic.pause();}}
async function startCalibration(){
 if(calibration)return;const c={stage:'connecting',elapsed:0,samples:[],classId:data.activeId};calibration=c;
 if($('calibrationProgress'))$('calibrationProgress').hidden=false;const button=document.querySelector('[data-action="calibrate"]');if(button)button.disabled=true;text('calibrationStatus',t('connecting'));
 try{
  await connect();
  if(calibration!==c){if(!calibration&&(!wantsRunning||$('modal').open))mic.pause();return;}
  await mic.resume();
  if(calibration!==c){if(!calibration&&(!wantsRunning||$('modal').open))mic.pause();return;}
  c.stage='sampling';text('calibrationStatus',t('calibrating'));
 }catch{if(calibration===c){calibration=null;renderSettings();}}
}
async function fullscreen(){
 try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.body.classList.contains('focus-mode'))document.body.classList.remove('focus-mode');else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else document.body.classList.add('focus-mode');}catch{document.body.classList.toggle('focus-mode');}
 scene.resize();if(page==='settings')renderSettings();
}
function events(list){
 let changed=false;
 for(const event of list){
  if(event.type==='arrival'){scene.add(event.creature,{initial:event.initial,passing:event.passing});const c=data.classes.find(c=>c.id===sessionClassId);if(c&&!c.unlocked.includes(event.creature.speciesId)){c.unlocked.push(event.creature.speciesId);changed=true;}}
  else if(event.type==='exit')scene.exit(event.creature.id,event.reason);
 }
 if(changed)save();
}
document.addEventListener('click',async event=>{
 const filter=event.target.closest('[data-filter]');if(filter){guideFilter=filter.dataset.filter;showGuide();return;}
 const target=event.target.closest('[data-action]');if(!target||target.disabled)return;
 switch(target.dataset.action){
  case 'chooseGrade':if(page==='classes'){selectedGrade=Number(target.dataset.grade);showClassPicker();}break;
  case 'chooseClass':await chooseClass(target.dataset.classId);break;
  case 'settings':openSettings();break;
  case 'pause':showPause();break;
  case 'resume':closeRaw();await resumeSession();break;
  case 'restart':await restart();break;
  case 'end':finish();break;
  case 'close':closeCurrent();break;
  case 'calibrate':await startCalibration();break;
  case 'retry':try{await connect();mic.pause();micIssue='';}catch{}updateStatus();break;
  case 'fullscreen':await fullscreen();break;
  case 'guideSettings':cancelCalibration();guideFilter='all';showGuide('settings');break;
  case 'guideReport':guideFilter='all';showGuide('report');break;
 }
});
document.addEventListener('change',event=>{
 const el=event.target;
 if(el.id==='languageSelect'){data.lang=el.value==='en'?'en':'zh';save();renderSettings();}
 if(el.id==='classSelect'&&data.classes.some(c=>c.id===el.value)&&el.value!==data.activeId){cancelCalibration();archive();data.activeId=el.value;save();makeSession();wantsRunning=false;resumeAfterSettings=true;scene.freeze(true);renderSettings();}
 if(el.id==='capacityInput'){data.settings.capacity=Math.max(10,Math.min(40,Math.round(Number(el.value)||10)));el.value=data.settings.capacity;save();}
 if(el.id==='motionInput'){data.settings.reducedMotion=el.checked;save();}
});
document.addEventListener('input',event=>{
 if(event.target.id==='arrivalRateInput'){const el=event.target,rate=normalizeArrivalRate(Number(el.value));data.settings.arrivalRate=rate;if(session)session.arrivalRate=rate;el.value=rate;el.setAttribute('aria-valuetext',rate+'×');text('arrivalRateValue',rate+'×');text('arrivalRateHelp',arrivalHelp(rate));save();}
 if(event.target.id==='thresholdInput'){const threshold=Number(event.target.value);currentClass().calibration={threshold,baseline:currentClass().calibration?.baseline??null};if(session)session.threshold=threshold;save();}
});
$('modal').addEventListener('cancel',event=>{event.preventDefault();closeCurrent();});
$('modal').addEventListener('click',event=>{if(event.target!==$('modal')||page==='pause'||page==='classes')return;const r=$('modal').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeCurrent();});
document.addEventListener('pointerdown',()=>{if(wantsRunning&&mic.context?.state==='suspended')mic.context.resume().catch(()=>{});},{capture:true});
document.addEventListener('keydown',event=>{if(event.code==='Space'&&!$('modal').open){event.preventDefault();showPause();}});
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){hiddenWasRunning=wantsRunning&&session?.status==='running';if(hiddenWasRunning){wantsRunning=false;freeze();}cancelCalibration();}
 else if(hiddenWasRunning){hiddenWasRunning=false;if(!$('modal').open&&session?.status!=='ended')showPause();}
});
window.addEventListener('pagehide',()=>{cancelCalibration();if(session?.status!=='ended')archive();mic.stop();});
window.addEventListener('pageshow',event=>{if(event.persisted){session=null;sessionClassId=null;selectedGrade=null;scene.clear();showClassPicker();}});
let lastFrame=performance.now(),lastStatus=0;
function frame(now){
 requestAnimationFrame(frame);const raw=(now-lastFrame)/1000;if(raw<1/32)return;const dt=Math.min(.25,raw);lastFrame=now;
 if(mic.active)level=mic.sample(dt);
 if(calibration?.stage==='sampling'){
  const c=calibration;c.elapsed+=dt;c.samples.push(level);if($('calibrationFill'))$('calibrationFill').style.width=Math.min(100,c.elapsed/12*100)+'%';text('calibrationStatus',t('calibrating')+' · '+Math.max(0,Math.ceil(12-c.elapsed)));
  if(c.elapsed>=12){
   const sorted=c.samples.slice(10).sort((a,b)=>a-b);calibration=null;mic.pause();
   if(!sorted.length||sorted.at(-1)<1)renderSettings(t('noAudio'));
   else{const baseline=sorted[Math.floor(sorted.length*.8)],threshold=Math.round(Math.min(98,Math.max(5,baseline+data.settings.margin)));const target=data.classes.find(c2=>c2.id===c.classId);if(target){target.calibration={baseline,threshold};if(sessionClassId===target.id)session.threshold=threshold;}save();renderSettings(t('calibrated'));}
  }
 }
 if(session?.status==='running'){
  if(mic.lost||!mic.active||mic.context?.state!=='running'){micIssue=t('micError');wantsRunning=false;freeze();if(!$('modal').open){resumeAfterSettings=true;renderSettings();}}
  else events(session.tick(dt,level));
 }
 if(now-lastStatus>100){updateStatus();lastStatus=now;}
 scene.draw(dt);
}
if(!read.error)save();showClassPicker();requestAnimationFrame(frame);
try{await scene.load();scene.draw(0,true);if(page==='classes')showClassPicker();}
catch{micIssue=t('micError');updateStatus();}
if(typeof EMBEDDED_REEF_ART==='undefined'&&'serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
