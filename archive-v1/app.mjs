import { SPECIES, BY_ID, TIERS } from './species.mjs';
import { ReefSession } from './engine.mjs';
import { ReefScene } from './scene.mjs';
import { ClassroomMicrophone } from './microphone.mjs';
import { readStore, writeStore, validateStore, newClass, addReport } from './store.mjs';
import { COPY } from './i18n.mjs';

const $ = id => document.getElementById(id);
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const text = (id, value) => { const el = $(id); if (el && el.textContent !== String(value)) el.textContent = String(value); };
const button = (action, label, kind = 'secondary', attrs = '') => `<button type="button" class="${kind}-button" data-action="${action}" ${attrs}>${esc(label)}</button>`;
const read = readStore(); let data = read.data;
const t = key => COPY[data.lang][key] || key;
const currentClass = () => data.classes.find(c => c.id === data.activeId) || data.classes[0];
const speciesName = s => data.lang === 'zh' ? s.zh : s.en;
const tierName = tier => TIERS[tier][data.lang];
const time = seconds => { const n = Math.max(0, Math.ceil(seconds)); return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`; };
const date = (value, options = {}) => new Intl.DateTimeFormat(data.lang === 'zh' ? 'zh-HK' : 'en-HK', { timeZone: 'Asia/Hong_Kong', month: 'short', day: 'numeric', ...options }).format(new Date(value));
const dateStamp = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Hong_Kong', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const scene = new ReefScene($('reefCanvas')); const mic = new ClassroomMicrophone();
let session = null, sessionClassId = null, view = 'aquarium', guideFilter = 'all', modalType = null;
let calibration = null, pendingImport = null, lastReport = null, completedId = null, level = 0;
let toastTimeout = 0, visitorTimeout = 0, controlKey = '', lastHud = 0;
const isActive = () => session && session.status !== 'ended';
const isFocused = () => !!document.fullscreenElement || document.body.classList.contains('focus-mode');

function save() {
  try { writeStore(data); $('storageWarning').hidden = true; }
  catch { text('storageWarning', t('storageError')); $('storageWarning').hidden = false; }
}
function notify(message, duration = 4200) { clearTimeout(toastTimeout); text('toast', message); $('toast').hidden = false; toastTimeout = setTimeout(() => { $('toast').hidden = true; }, duration); }
function download(name, contents, type) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement('a'); link.href = url; link.download = name; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 15000);
}
function pauseForControls(message = t('pausedControls')) {
  if (session?.status === 'running') { session.pause(); if (!session.demo) mic.pause(); if (message) notify(message); updateHUD(); }
}
function navigate(next) {
  if (next !== 'aquarium') pauseForControls();
  view = next; $('aquariumView').hidden = view !== 'aquarium'; $('guideView').hidden = view !== 'guide'; $('historyView').hidden = view !== 'history'; $('readingDock').hidden = view !== 'aquarium';
  for (const el of document.querySelectorAll('[data-view]')) { el.classList.toggle('active', el.dataset.view === view); if (el.tagName === 'BUTTON') el.setAttribute('aria-current', el.dataset.view === view ? 'page' : 'false'); }
  if (view === 'guide') renderGuide(); if (view === 'history') renderHistory();
  if (view === 'aquarium') scene.resize();
}
function renderCopy() {
  document.documentElement.lang = data.lang === 'zh' ? 'zh-Hant-HK' : 'en';
  const labels = { brandName: 'brand', brandSub: 'subtitle', navAquarium: 'aquarium', navHistory: 'history', languageButton: 'language', timerLabel: 'timerLabel', previewText: 'preview', previewDescription: 'previewSub', volumeLabel: 'volume', guideTitle: 'guideTitle', guideSub: 'guideSub', guideHint: 'guideHint', collectionLabel: 'discovered', historyTitle: 'historyTitle', historySub: 'historySub', pausedTitle: 'paused', pausedSub: 'pausedSub', demoLabel: 'demoLabel', demoVolumeLabel: 'demoVolume', demoHint: 'demoHint', quietLabel: 'quiet', loudLabel: 'loud', loading: 'loading' };
  for (const [id, key] of Object.entries(labels)) text(id, t(key));
  $('navGuide').innerHTML = `${esc(t('guide'))} <span id="guideCount">${currentClass().unlocked.length} / ${SPECIES.length}</span>`;
  $('languageButton').setAttribute('aria-label', t('languageLabel')); $('settingsButton').setAttribute('aria-label', t('settings')); $('fullButton').setAttribute('aria-label', t(document.fullscreenElement ? 'exitFull' : 'full'));
  $('classButton').innerHTML = `${esc(currentClass().name)} <span aria-hidden="true">⌄</span>`;
  $('classButton').setAttribute('aria-label', `${t('classes')}: ${currentClass().name}`);
  text('sessionClass', currentClass().name); text('guideEyebrow', currentClass().name); text('historyEyebrow', currentClass().name);
  $('arrivalProgress').setAttribute('aria-label', t('progress'));
  controlKey = ''; updateHUD();
  scene.reducedMotion = data.settings.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (view === 'guide') renderGuide(); if (view === 'history') renderHistory();
}
function renderControls() {
  const key = `${data.lang}:${session?.status}:${session?.demo}:${mic.lost}:${isFocused()}`;
  if (key === controlKey) return; controlKey = key;
  const focus = isFocused() ? button('fullscreen', '↙', 'quiet', `aria-label="${esc(t('exitFull'))}"`) : '';
  if (!session || session.status === 'ended') $('sessionActions').innerHTML = `${button('demo', t('demo'), 'quiet')}${button('begin', t('begin'), 'primary')}${focus}`;
  else $('sessionActions').innerHTML = `${button('end', t('end'), 'quiet')}${button(session.status === 'paused' ? 'resume' : 'pause', t(session.status === 'paused' ? mic.lost && !session.demo ? 'reconnect' : 'resume' : 'pause'), 'primary')}${focus}`;
  text('overlayResume', t(mic.lost && !session?.demo ? 'reconnect' : 'resume'));
}
function updateHUD() {
  renderControls();
  const active = isActive(), paused = session?.status === 'paused', water = active ? session.water : 'calm';
  document.body.dataset.water = paused ? 'paused' : water;
  const key = active ? paused ? 'paused' : water : 'ready';
  text('sceneEyebrow', active ? session.demo ? t('demoLabel') : `${currentClass().name} · ${t('timerLabel')}` : t('readyLabel'));
  text('sceneTitle', t(key)); text('sceneSub', t(`${key}Sub`));
  text('timer', active || session?.status === 'ended' ? time(session.duration - session.elapsed) : time(data.settings.minutes * 60));
  $('previewNote').hidden = !!session; $('residentCount').hidden = !session;
  if (session) { const visits = [...session.visits.values()].reduce((n, v) => n + v.count, 0); $('residentCount').innerHTML = `<b>${session.residents.length}</b> / ${session.capacity} ${esc(t('inReef'))}<span>·</span><b>${visits}</b> ${esc(t('visitors'))}`; }
  $('pauseOverlay').hidden = !paused; $('demoPanel').hidden = !active || !session.demo;
  $('volumeFill').style.width = `${active && !paused ? level : 0}%`;
  text('volumeNumber', active && !paused ? `${Math.round(level)} / 100` : '—');
  $('thresholdMarker').hidden = !active; $('thresholdMarker').style.left = `${session?.threshold || 60}%`;
  $('connectionDot').className = `connection-dot${active && !paused ? session.demo ? ' demo' : ' connected' : ''}`;
  text('micStatus', active ? paused ? t('paused') : session.demo ? t('demoVolume') : `${t('threshold')} ${Math.round(session.threshold)}` : t('micOff'));
  const progress = session ? Math.max(0, Math.min(100, session.quietProgress / session.interval * 100)) : 0;
  $('arrivalFill').style.width = `${progress}%`; $('arrivalProgress').setAttribute('aria-valuenow', String(Math.round(progress)));
  text('arrivalLabel', t('next'));
  text('arrivalTime', active ? paused ? t('pausedProgress') : water === 'calm' ? `${Math.ceil(session.interval - session.quietProgress)} ${t('seconds')}` : '—' : '45–60 ' + t('seconds'));
  text('arrivalDetail', active ? paused ? t('pausedSub') : water === 'calm' ? t('calmSub') : water === 'settling' ? `${t('calmIn')} ${Math.max(0, Math.ceil(10 - session.calmFor))} ${t('seconds')}` : t('waiting') : t('how1'));
  const notice = active && !paused && water !== 'calm'; $('waterNotice').hidden = !notice;
  if (notice) {
    text('waterNoticeLabel', t(water === 'warning' ? 'leaveIn' : water === 'settling' ? 'calmIn' : 'rough'));
    text('waterNoticeCount', water === 'warning' ? `${Math.max(0, Math.ceil(5 - session.overFor))}s` : water === 'settling' ? `${Math.max(0, Math.ceil(10 - session.calmFor))}s` : '≈');
  }
  scene.state(session, level);
}
function renderGuide() {
  const known = new Set(currentClass().unlocked);
  $('collectionTotal').innerHTML = `${known.size}<span> / ${SPECIES.length}</span>`;
  $('guideFilters').innerHTML = `<button type="button" data-filter="all" class="${guideFilter === 'all' ? 'active' : ''}">${esc(t('all'))}</button>` + TIERS.map((tier, i) => `<button type="button" data-filter="${i}" class="${guideFilter === String(i) ? 'active' : ''}" style="--tier-color:${tier.color}">${esc(tierName(i))}</button>`).join('');
  const list = SPECIES.filter(s => guideFilter === 'all' || s.tier === Number(guideFilter));
  $('speciesGrid').innerHTML = list.map(s => `<button type="button" class="specimen${known.has(s.id) ? '' : ' locked'}" data-species="${s.id}" aria-label="${esc(known.has(s.id) ? speciesName(s) : t('unknown'))}"><canvas id="specimen-${s.id}" width="200" height="200" aria-hidden="true"></canvas><strong>${esc(known.has(s.id) ? speciesName(s) : t('unknown'))}</strong><small style="--tier-color:${TIERS[s.tier].color}"><i class="rarity-dot"></i>${esc(tierName(s.tier))}</small></button>`).join('');
  for (const s of list) scene.icon($(`specimen-${s.id}`), s, { silhouette: !known.has(s.id) });
}
function renderHistory() {
  const list = currentClass().sessions;
  if (!list.length) {
    $('sessionList').innerHTML = `<div class="empty-state"><canvas id="emptyFish" aria-hidden="true"></canvas><h2>${esc(t('noSessions'))}</h2><p>${esc(t('noSessionsSub'))}</p>${button('newReading', t('newReading'), 'primary')}</div>`;
    scene.icon($('emptyFish'), SPECIES[0]); return;
  }
  $('sessionList').innerHTML = list.map((r, i) => `<div class="session-row"><div class="session-date">${esc(date(r.startedAt, { year: 'numeric' }))}<small>${esc(date(r.startedAt, { hour: '2-digit', minute: '2-digit' }))} · ${time(r.duration)} ${esc(t('timerLabel').toLowerCase())}</small></div><div class="session-numbers"><div><strong>${r.visits.reduce((n, v) => n + v.count, 0)}</strong><small>${esc(t('totalVisits'))}</small></div><div><strong>${r.visits.length}</strong><small>${esc(t('species'))}</small></div><div><strong>${r.discoveries.length}</strong><small>${esc(t('discoveries'))}</small></div></div>${button('historyReport', t('viewReport') + ' ↗', 'quiet', `data-index="${i}"`)}</div>`).join('');
}
function setModal(title, content, type, wide = false) {
  modalType = type; $('modal').classList.toggle('wide', wide);
  $('modalContent').innerHTML = `<div class="modal-head"><h2 id="modalTitle">${esc(title)}</h2><button type="button" class="modal-close" data-action="close" aria-label="${esc(t('close'))}">×</button></div><div class="modal-body">${content}</div>`;
  $('modal').setAttribute('aria-labelledby', 'modalTitle'); if (!$('modal').open) $('modal').showModal();
}
function closeModal(keepMicrophone = false) {
  if (modalType === 'calibration') { calibration = null; if (!keepMicrophone) mic.stop(); }
  pendingImport = null; modalType = null; $('modal').close();
  if (session?.status === 'ended') resetReef();
}
function privacyNote() { return `<div class="privacy-note"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true"><path d="m10 2 6 3v5c0 4-6 7-6 7s-6-3-6-7V5z"/><path d="m7 9 2 2 4-4"/></svg><span>${esc(t('micPrivacy'))}</span></div>`; }
function openCalibration(resuming = false) {
  if (!scene.ready) return notify(t('loading'));
  pauseForControls(); navigate('aquarium');
  calibration = { stage: 'intro', resuming, elapsed: 0, samples: [], baseline: 0, threshold: 60 };
  renderCalibration();
}
function renderCalibration() {
  const c = calibration; if (!c) return;
  let body = `<p>${esc(t('calibrationSub'))}</p><div class="calibration-art"><canvas id="calibrationFish" aria-hidden="true"></canvas></div>`;
  if (c.stage === 'error') body += `<p class="error-title">${esc(t('micError'))}</p><p class="error-message">${esc(c.error)}</p>`;
  else if (c.stage === 'intro') body += `<p class="calibration-copy">${esc(t('calibrationNote'))}</p>`;
  else {
    body += `<p class="calibration-state" id="calibrationState">${esc(t(c.stage === 'ready' ? 'calibrationReady' : 'listening'))}</p><div class="calibration-meter"><div><span>${esc(t('volume'))}</span><span id="calibrationNumber">0 / 100</span></div><div class="calibration-track"><div id="calibrationFill"></div><i id="calibrationMarker" ${c.stage === 'ready' ? `style="left:${c.threshold}%"` : 'hidden'}></i></div></div>`;
    if (c.stage !== 'ready') body += `<div class="listen-progress"><div id="listenFill"></div></div><p class="field-help" style="text-align:center">${esc(t('listenRemain'))} · <span id="listenSeconds">12</span> ${esc(t('seconds'))}</p>`;
    else body += `<p class="field-help">${esc(t('calibrationReadySub'))}</p><label class="field-label" for="calibrationThreshold">${esc(t('tolerance'))}<output id="thresholdValue">${Math.round(c.threshold)}</output></label><input type="range" id="calibrationThreshold" min="5" max="98" step="1" value="${Math.round(c.threshold)}" style="width:100%"><p class="field-help">${esc(t('volumeNote'))}</p>`;
  }
  body += `<div class="modal-actions">${button('close', t('cancel'), 'quiet')}${c.stage === 'ready' ? button('startSession', t(c.resuming ? 'resumeSession' : 'startSession'), 'primary') : button('calibrate', t(c.stage === 'error' ? 'retry' : 'calibrate'), 'primary', c.stage === 'connecting' || c.stage === 'sampling' ? 'disabled' : '')}</div>${privacyNote()}`;
  setModal(t('calibration'), body, 'calibration'); scene.icon($('calibrationFish'), SPECIES[0]);
}
async function calibrate() {
  if (!calibration || ['connecting', 'sampling'].includes(calibration.stage)) return;
  const c = calibration; c.stage = 'connecting'; renderCalibration();
  try { await mic.connect(); if (calibration !== c) { mic.stop(); return; } c.stage = 'sampling'; c.elapsed = 0; c.samples = []; renderCalibration(); }
  catch (error) {
    if (calibration !== c || error.name === 'AbortError') return;
    c.stage = 'error'; c.error = t(error.name === 'NotAllowedError' || error.name === 'SecurityError' ? 'micDenied' : error.name === 'NotFoundError' ? 'micMissing' : error.name === 'NotReadableError' ? 'micBusy' : 'micUnsupported'); renderCalibration();
  }
}
function startFromCalibration() {
  if (!calibration || calibration.stage !== 'ready') return;
  const c = calibration; currentClass().calibration = { baseline: c.baseline, threshold: c.threshold }; save();
  if (c.resuming && session) { session.threshold = c.threshold; session.resume(); }
  else { scene.clear(); completedId = null; sessionClassId = currentClass().id; session = new ReefSession({ duration: data.settings.minutes * 60, capacity: data.settings.capacity, threshold: c.threshold, known: currentClass().unlocked }); }
  closeModal(true); $('visitorNotice').hidden = true; controlKey = ''; updateHUD();
}
function startDemo() {
  if (!scene.ready) return notify(t('loading')); if (isActive()) return;
  mic.stop(); scene.clear(); completedId = null; sessionClassId = null;
  session = new ReefSession({ duration: 180, capacity: data.settings.capacity, threshold: 60, demo: true });
  [0, 1, 3, 6, 9, 10, 11, 12, 15, 23].forEach(i => session.admit(SPECIES[i]));
  handleEvents(session.drain(), true); $('demoVolume').value = '35'; level = 35; navigate('aquarium'); updateHUD(); notify(t('demoStart'));
}
function handleEvents(events, initial = false) {
  let discovered = false;
  for (const event of events) {
    if (event.type === 'arrival') {
      scene.add(event.creature, { initial, passing: event.passing });
      if (!session.demo) {
        const c = data.classes.find(c => c.id === sessionClassId);
        if (c && !c.unlocked.includes(event.creature.speciesId)) { c.unlocked.push(event.creature.speciesId); discovered = true; }
      }
      if (!initial) showVisitor(event);
    } else if (event.type === 'exit') scene.exit(event.creature.id, event.reason);
    else if (event.type === 'end') completeSession(event.report);
  }
  if (discovered) { save(); text('guideCount', `${currentClass().unlocked.length} / ${SPECIES.length}`); }
}
function showVisitor(event) {
  const s = BY_ID[event.creature.speciesId]; clearTimeout(visitorTimeout);
  $('visitorNotice').hidden = true;
  scene.icon($('visitorIcon'), s, { size: 56 });
  text('visitorType', t(event.discovered ? 'newDiscovery' : event.passing ? 'passing' : 'newVisitor'));
  text('visitorName', speciesName(s)); text('visitorTier', tierName(s.tier)); $('visitorTier').style.color = TIERS[s.tier].color;
  requestAnimationFrame(() => { $('visitorNotice').hidden = false; });
  visitorTimeout = setTimeout(() => { $('visitorNotice').hidden = true; }, 5500);
}
function completeSession(report) {
  if (completedId === report.id) return; completedId = report.id;
  mic.stop(); if (!report.demo) { addReport(data, sessionClassId, report); save(); }
  $('visitorNotice').hidden = true; updateHUD(); openReport(report);
}
function resetReef() { session = null; completedId = null; sessionClassId = null; level = 0; scene.preview(); $('visitorNotice').hidden = true; controlKey = ''; updateHUD(); }
function openReport(report) {
  pauseForControls(); lastReport = report;
  const count = report.visits.reduce((n, v) => n + v.count, 0);
  let body = `<p>${esc(t(report.demo ? 'reportDemo' : 'reportSub'))}</p><div class="report-summary"><div><strong>${count}</strong><small>${esc(t('totalVisits'))}</small></div><div><strong>${report.visits.length}</strong><small>${esc(t('species'))}</small></div><div><strong>${report.discoveries.length}</strong><small>${esc(t('discoveries'))}</small></div><div><strong>${time(report.quietSeconds)}</strong><small>${esc(t('gentleTime'))}</small></div></div>`;
  body += report.visits.length ? `<div class="report-visitors">${report.visits.map(v => { const s = BY_ID[v.speciesId]; return `<div class="report-visitor"><canvas id="report-${s.id}" aria-hidden="true"></canvas><div><strong>${esc(speciesName(s))}</strong><small>${esc(tierName(s.tier))} · ×${v.count}</small>${report.discoveries.includes(s.id) ? `<span class="new-tag">${esc(t('firstVisit'))}</span>` : ''}</div></div>`; }).join('')}</div>` : `<p class="calibration-copy" style="margin-top:28px">${esc(t('reportEmpty'))}</p>`;
  body += `<div class="modal-actions spread">${button('downloadReport', t('saveReport'), 'quiet')}${button('backReef', t('backReef'), 'primary')}</div>`;
  setModal(t('reportTitle'), body, 'report', true);
  for (const v of report.visits) scene.icon($(`report-${v.speciesId}`), BY_ID[v.speciesId], { size: 58 });
}
function openSpecies(id) {
  const s = BY_ID[id]; if (!s) return;
  const unlocked = currentClass().unlocked.includes(id);
  const body = `<div class="detail-art"><canvas id="detailCreature" aria-hidden="true"></canvas></div><div class="detail-tier" style="color:${TIERS[s.tier].color}"><i class="rarity-dot" style="--tier-color:${TIERS[s.tier].color}"></i>${esc(tierName(s.tier))}</div><p class="detail-fact">${esc(unlocked ? data.lang === 'zh' ? s.factZh : s.factEn : t('unknownSub'))}</p><div class="modal-actions">${button('close', t('close'), 'secondary')}</div>`;
  setModal(unlocked ? speciesName(s) : t('unknown'), body, 'species'); scene.icon($('detailCreature'), s, { silhouette: !unlocked, size: 185 });
}
function openSettings() {
  pauseForControls();
  const s = data.settings;
  const body = `<p>${esc(t('settingsSub'))}</p><form id="settingsForm"><div class="settings-fields"><div><label class="field-label" for="settingMinutes">${esc(t('duration'))}</label><select class="form-input" id="settingMinutes">${[...new Set([5,10,15,20,25,30,40,45,60,s.minutes])].sort((a,b) => a-b).map(n => `<option value="${n}" ${s.minutes === n ? 'selected' : ''}>${n} ${esc(t('minutes'))}</option>`).join('')}</select></div><div><label class="field-label" for="settingCapacity">${esc(t('capacity'))}</label><input type="number" class="form-input" id="settingCapacity" min="10" max="40" step="1" required value="${s.capacity}"></div></div><label class="field-label" for="settingMargin">${esc(t('margin'))}<output id="marginOutput">${s.margin}</output></label><input type="range" id="settingMargin" min="2" max="20" step="1" value="${s.margin}" style="width:100%"><p class="field-help">${esc(t('marginHelp'))}</p>${isActive() && !session.demo ? `<label class="field-label" for="liveThreshold">${esc(t('threshold'))}<output id="liveThresholdOutput">${Math.round(session.threshold)}</output></label><input type="range" id="liveThreshold" min="5" max="98" value="${Math.round(session.threshold)}" style="width:100%"><p class="field-help">${esc(t('volumeNote'))}</p>` : ''}<label class="checkbox-field"><input type="checkbox" id="settingMotion" ${s.reducedMotion ? 'checked' : ''}><span>${esc(t('reducedMotion'))}<small>${esc(t('reducedHelp'))}</small></span></label><div class="modal-actions"><button class="primary-button" type="submit">${esc(t('apply'))}</button></div></form><hr class="section-line"><h3 class="settings-section-title">${esc(t('backups'))}</h3><p class="field-help">${esc(t('backupsSub'))}</p><div class="backup-actions">${button('export', t('export'))}${button('import', t('import'), 'secondary', isActive() ? 'disabled' : '')}</div><hr class="section-line"><h3 class="settings-section-title">${esc(t('helpTitle'))}</h3><ol class="help-list">${['how1','how2','how3','how4'].map(k => `<li>${esc(t(k))}</li>`).join('')}</ol>${privacyNote()}<div class="art-credit">${esc(t('assetsBy'))}</div>`;
  setModal(t('settingsTitle'), body, 'settings');
}
function openClasses() {
  pauseForControls();
  const body = `<p>${esc(t('classSub'))}</p>${data.classes.map(c => `<div class="class-row"><div><strong>${esc(c.name)}</strong><small>${c.unlocked.length} / ${SPECIES.length} ${esc(t('discovered'))}</small></div>${button('renameClass', t('rename'), 'quiet', `data-id="${esc(c.id)}" ${isActive() ? 'disabled' : ''}`)}${button('selectClass', t(c.id === data.activeId ? 'current' : 'choose'), c.id === data.activeId ? 'quiet' : 'secondary', `data-id="${esc(c.id)}" ${c.id === data.activeId || isActive() ? 'disabled' : ''}`)}</div>`).join('')}<form class="class-add" id="addClassForm"><div><label for="newClassName">${esc(t('className'))}</label><input id="newClassName" class="form-input" maxlength="32" required autocomplete="off" placeholder="${data.lang === 'zh' ? '例如：三年甲班' : 'e.g. Class 3A'}" ${isActive() ? 'disabled' : ''}></div><button type="submit" class="primary-button" ${isActive() ? 'disabled' : ''}>${esc(t('addClass'))}</button></form><p class="form-error" id="classError" role="alert" hidden></p>${isActive() ? `<p class="field-help">${esc(t('sessionActive'))}</p>` : ''}`;
  setModal(t('classTitle'), body, 'classes');
}
function openEnd() {
  if (!isActive()) return; pauseForControls('');
  setModal(t('endTitle'), `<p>${esc(t('endSub'))}</p><div class="modal-actions">${button('keepReading', t('keepReading'), 'quiet')}${button('finish', t('finish'), 'primary')}</div>`, 'end');
}
async function resumeReading() {
  if (session?.status !== 'paused') return;
  if (session.demo) { session.resume(); updateHUD(); return; }
  if (mic.lost || !mic.stream) { openCalibration(true); return; }
  try { await mic.resume(); session.resume(); updateHUD(); }
  catch { openCalibration(true); }
}
async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.body.classList.contains('focus-mode')) document.body.classList.remove('focus-mode');
    else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    else document.body.classList.add('focus-mode');
  } catch { document.body.classList.toggle('focus-mode'); }
  scene.resize(); controlKey = ''; updateHUD();
}
function downloadReport() {
  if (!lastReport) return;
  const csv = value => { let s = String(value); if (/^[=+@-]/.test(s)) s = "'" + s; return '"' + s.replaceAll('"', '""') + '"'; };
  const rows = [[t('reportDate'), date(lastReport.startedAt, { year: 'numeric', hour: '2-digit', minute: '2-digit' })], [t('activeClass'), currentClass().name], [t('timerLabel'), time(lastReport.duration)], [t('gentleTime'), time(lastReport.quietSeconds)], [t('notSaved'), lastReport.demo ? 'Yes' : 'No'], [], [t('species'), t('rarity'), t('visited'), t('firstVisit')], ...lastReport.visits.map(v => { const s = BY_ID[v.speciesId]; return [speciesName(s), tierName(s.tier), v.count, lastReport.discoveries.includes(s.id) ? '✓' : '']; })];
  download(`${t('reportName')}-${dateStamp()}.csv`, '\ufeff' + rows.map(r => r.map(csv).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
}

document.addEventListener('click', async event => {
  const nav = event.target.closest('[data-view]'); if (nav) { event.preventDefault(); navigate(nav.dataset.view); return; }
  const filter = event.target.closest('[data-filter]'); if (filter) { guideFilter = filter.dataset.filter; renderGuide(); return; }
  const specimen = event.target.closest('[data-species]'); if (specimen) { openSpecies(specimen.dataset.species); return; }
  const target = event.target.closest('[data-action]'); if (!target || target.disabled) return;
  switch (target.dataset.action) {
    case 'language': data.lang = data.lang === 'en' ? 'zh' : 'en'; save(); renderCopy(); break;
    case 'fullscreen': await toggleFullscreen(); break;
    case 'settings': openSettings(); break;
    case 'classes': openClasses(); break;
    case 'begin': openCalibration(); break;
    case 'calibrate': await calibrate(); break;
    case 'startSession': startFromCalibration(); break;
    case 'demo': startDemo(); break;
    case 'pause': pauseForControls(t('paused')); break;
    case 'resume': await resumeReading(); break;
    case 'end': openEnd(); break;
    case 'keepReading': closeModal(); await resumeReading(); break;
    case 'finish': session.end(); handleEvents(session.drain()); break;
    case 'close': closeModal(); break;
    case 'backReef': closeModal(); navigate('aquarium'); break;
    case 'newReading': navigate('aquarium'); if (!isActive()) openCalibration(); break;
    case 'historyReport': openReport(currentClass().sessions[Number(target.dataset.index)]); break;
    case 'downloadReport': downloadReport(); break;
    case 'selectClass':
      if (isActive()) { notify(t('sessionActive')); break; }
      if (data.classes.some(c => c.id === target.dataset.id)) { data.activeId = target.dataset.id; guideFilter = 'all'; save(); closeModal(); renderCopy(); }
      break;
    case 'renameClass': {
      if (isActive()) break; const c = data.classes.find(c => c.id === target.dataset.id); if (!c) break;
      setModal(t('rename'), `<form id="renameClassForm" data-id="${esc(c.id)}"><label class="field-label" for="renameInput">${esc(t('className'))}</label><input class="form-input" id="renameInput" value="${esc(c.name)}" required maxlength="32" autofocus><p class="form-error" id="classError" hidden></p><div class="modal-actions">${button('classes', t('cancel'), 'quiet')}<button type="submit" class="primary-button">${esc(t('apply'))}</button></div></form>`, 'rename'); break;
    }
    case 'export': download(`${t('exportName')}-${dateStamp()}.json`, JSON.stringify(data, null, 2), 'application/json'); notify(t('backupReady')); break;
    case 'import': if (!isActive()) { $('backupFile').value = ''; $('backupFile').click(); } break;
    case 'replaceImport': if (pendingImport && !isActive()) { data = pendingImport; closeModal(); save(); guideFilter = 'all'; renderCopy(); notify(t('backupImported')); } break;
  }
});
document.addEventListener('submit', event => {
  if (!event.target.closest('#modal')) return; event.preventDefault();
  const form = event.target;
  if (form.id === 'settingsForm') {
    if (!form.reportValidity()) return;
    data.settings.minutes = Number($('settingMinutes').value); data.settings.capacity = Number($('settingCapacity').value); data.settings.margin = Number($('settingMargin').value); data.settings.reducedMotion = $('settingMotion').checked;
    if ($('liveThreshold') && session) { session.threshold = Number($('liveThreshold').value); if (currentClass().calibration) currentClass().calibration.threshold = session.threshold; }
    save(); closeModal(); renderCopy(); notify(t('saved'));
  } else if (form.id === 'addClassForm' || form.id === 'renameClassForm') {
    if (isActive()) return;
    const name = $(form.id === 'addClassForm' ? 'newClassName' : 'renameInput').value.trim();
    const error = !name || name.length > 32 ? 'nameRequired' : data.classes.some(c => c.name.toLocaleLowerCase() === name.toLocaleLowerCase() && c.id !== form.dataset.id) ? 'nameDuplicate' : form.id === 'addClassForm' && data.classes.length >= 50 ? 'classLimit' : null;
    if (error) { text('classError', t(error)); $('classError').hidden = false; return; }
    if (form.id === 'addClassForm') { const c = newClass(name); data.classes.push(c); data.activeId = c.id; }
    else { const c = data.classes.find(c => c.id === form.dataset.id); if (c) c.name = name; }
    save(); renderCopy(); openClasses();
  }
});
document.addEventListener('input', event => {
  const el = event.target;
  if (el.id === 'calibrationThreshold' && calibration) { calibration.threshold = Number(el.value); text('thresholdValue', el.value); $('calibrationMarker').style.left = el.value + '%'; }
  if (el.id === 'settingMargin') text('marginOutput', el.value);
  if (el.id === 'liveThreshold') text('liveThresholdOutput', el.value);
});
$('modal').addEventListener('cancel', event => { event.preventDefault(); closeModal(); });
$('modal').addEventListener('click', event => { if (event.target === $('modal')) { const r = $('modal').getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeModal(); } });
$('backupFile').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  if (file.size > 10 * 1024 * 1024) return notify(t('backupLarge'));
  try {
    const imported = validateStore(JSON.parse(await file.text())); pendingImport = imported;
    setModal(t('importTitle'), `<p>${esc(t('importSub'))}</p><p class="field-help">${imported.classes.length} ${esc(t('classTitle'))} · ${imported.classes.reduce((n, c) => n + c.sessions.length, 0)} ${esc(t('history'))}</p><div class="modal-actions">${button('close', t('cancel'), 'quiet')}${button('replaceImport', t('replace'), 'primary')}</div>`, 'import');
  } catch { notify(t('backupInvalid')); }
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return;
  if (calibration) { closeModal(); notify(t('pausedForTab')); }
  pauseForControls(t('pausedForTab'));
});
document.addEventListener('fullscreenchange', () => { document.body.classList.toggle('focus-mode', !!document.fullscreenElement); scene.resize(); controlKey = ''; updateHUD(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !document.fullscreenElement && document.body.classList.contains('focus-mode')) { document.body.classList.remove('focus-mode'); scene.resize(); controlKey = ''; updateHUD(); } });
window.addEventListener('offline', () => notify(t('offline')));
window.addEventListener('pagehide', () => { mic.stop(); });

let lastFrame = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const raw = (now - lastFrame) / 1000; if (raw < 1 / 32) return;
  const dt = Math.min(.25, raw); lastFrame = now;
  if (mic.active) level = mic.sample(dt);
  if (calibration && ['sampling', 'ready'].includes(calibration.stage)) {
    text('calibrationNumber', `${Math.round(level)} / 100`); if ($('calibrationFill')) $('calibrationFill').style.width = level + '%';
    if (calibration.stage === 'sampling') {
      const c = calibration; c.elapsed += dt; c.samples.push(level);
      if ($('listenFill')) $('listenFill').style.width = Math.min(100, c.elapsed / 12 * 100) + '%'; text('listenSeconds', Math.max(0, Math.ceil(12 - c.elapsed)));
      if (c.elapsed >= 12) {
        const sorted = c.samples.slice(10).sort((a, b) => a - b);
        if (!sorted.length || sorted.at(-1) < 1) { c.stage = 'error'; c.error = t('micSilent'); mic.stop(); }
        else { c.baseline = sorted[Math.floor(sorted.length * .8)]; c.threshold = Math.round(Math.min(98, Math.max(5, c.baseline + data.settings.margin))); c.stage = 'ready'; }
        renderCalibration();
      }
    }
  }
  if (session?.status === 'running') {
    if (session.demo) level = Number($('demoVolume').value);
    else if (mic.lost || !mic.active || mic.context?.state !== 'running') { session.pause(); mic.pause(); notify(t('micLost')); updateHUD(); }
    if (session.status === 'running') handleEvents(session.tick(dt, level));
  }
  if (now - lastHud > 100) { updateHUD(); lastHud = now; }
  if (view === 'aquarium') scene.draw(dt);
}
renderCopy(); navigate('aquarium'); requestAnimationFrame(frame);
try { await scene.load(); scene.preview(); scene.icon($('brandFish'), SPECIES[0], { size: 36 }); $('loading').hidden = true; if (view === 'guide') renderGuide(); }
catch { text('loading', t('artError')); }
if (read.error) { text('storageWarning', t('storageError')); $('storageWarning').hidden = false; }
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
