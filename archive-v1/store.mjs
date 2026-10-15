import { BY_ID } from './species.mjs';
const KEY = 'morning-reef-v1';
export const DEFAULT_SETTINGS = { minutes: 30, capacity: 20, margin: 8, reducedMotion: false };
export const newClass = (name = 'Class A') => ({ id: crypto.randomUUID(), name, unlocked: [], sessions: [], calibration: null });
export function freshStore() { const c = newClass(); return { version: 1, lang: 'en', classes: [c], activeId: c.id, settings: { ...DEFAULT_SETTINGS } }; }
const finite = (n, low, high) => typeof n === 'number' && Number.isFinite(n) && n >= low && n <= high;
function cleanReport(r) {
  if (!r || typeof r.id !== 'string' || r.id.length > 100 || !Number.isFinite(Date.parse(r.startedAt)) || !finite(r.duration, 0, 86400) || !finite(r.quietSeconds, 0, r.duration + 1) || !Array.isArray(r.visits) || r.visits.length > 24 || !Array.isArray(r.discoveries)) throw new Error('Invalid session');
  const seen = new Set();
  const visits = r.visits.map(v => {
    if (!v || !Object.hasOwn(BY_ID, v.speciesId) || seen.has(v.speciesId) || !finite(v.count, 1, 10000) || !finite(v.scared ?? 0, 0, v.count) || !finite(v.firstAt ?? 0, 0, 86400)) throw new Error('Invalid visitor');
    seen.add(v.speciesId); return { speciesId: v.speciesId, count: Math.floor(v.count), scared: Math.floor(v.scared ?? 0), firstAt: v.firstAt ?? 0 };
  });
  if (r.discoveries.length > 24 || r.discoveries.some(id => !Object.hasOwn(BY_ID, id) || !seen.has(id))) throw new Error('Invalid discovery');
  return { id: r.id, startedAt: new Date(r.startedAt).toISOString(), duration: Math.round(r.duration), quietSeconds: Math.min(Math.round(r.quietSeconds), Math.round(r.duration)), visits, discoveries: [...new Set(r.discoveries)], residents: finite(r.residents, 0, 40) ? Math.floor(r.residents) : 0, demo: false };
}
export function validateStore(input) {
  if (!input || input.version !== 1 || !Array.isArray(input.classes) || input.classes.length < 1 || input.classes.length > 50) throw new Error('Invalid backup');
  const ids = new Set();
  const classes = input.classes.map(c => {
    if (!c || typeof c.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(c.id) || ids.has(c.id) || typeof c.name !== 'string' || !c.name.trim() || c.name.length > 32 || !Array.isArray(c.unlocked) || c.unlocked.length > 24 || c.unlocked.some(id => !Object.hasOwn(BY_ID, id)) || !Array.isArray(c.sessions) || c.sessions.length > 100) throw new Error('Invalid class');
    ids.add(c.id);
    const calibration = c.calibration && finite(c.calibration.baseline, 0, 100) && finite(c.calibration.threshold, 5, 98) ? { baseline: c.calibration.baseline, threshold: c.calibration.threshold } : null;
    const sessions = c.sessions.map(cleanReport);
    const unlocked = [...new Set([...c.unlocked, ...sessions.flatMap(s => s.visits.map(v => v.speciesId))])];
    return { id: c.id, name: c.name.trim(), unlocked, calibration, sessions };
  });
  const s = input.settings || {};
  return { version: 1, lang: input.lang === 'zh' ? 'zh' : 'en', classes, activeId: ids.has(input.activeId) ? input.activeId : classes[0].id,
    settings: { minutes: finite(s.minutes, 5, 60) ? Math.round(s.minutes) : 30, capacity: finite(s.capacity, 10, 40) ? Math.round(s.capacity) : 20, margin: finite(s.margin, 2, 20) ? Math.round(s.margin) : 8, reducedMotion: s.reducedMotion === true } };
}
export function readStore() {
  try { const raw = localStorage.getItem(KEY); return { data: raw ? validateStore(JSON.parse(raw)) : freshStore(), error: null }; }
  catch (error) { return { data: freshStore(), error }; }
}
export function writeStore(data) { localStorage.setItem(KEY, JSON.stringify(data)); }
export function addReport(data, classId, report) {
  if (report.demo) return;
  const c = data.classes.find(c => c.id === classId); if (!c) return;
  c.unlocked = [...new Set([...c.unlocked, ...report.visits.map(v => v.speciesId)])];
  if (!c.sessions.some(s => s.id === report.id)) c.sessions.unshift(report);
  c.sessions = c.sessions.slice(0, 100);
}
