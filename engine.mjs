import { SPECIES, BY_ID, TIERS } from './species.mjs';

export const COIN_CAP = 150;
const COIN_WEIGHTS = [1, 1.4, 2, 3, 4];
// Coins per second: more residents and rarer species help, with diminishing returns.
// Balanced for a 30-minute session; the teacher still decides when to end.
export function coinRate(residents) {
  const power = residents.reduce((sum, r) => sum + COIN_WEIGHTS[BY_ID[r.speciesId].tier], 0);
  return 3.6 * (1 - Math.exp(-power / 5)) / 60;
}

export function pickSpecies(rng = Math.random) {
  const roll = rng(); let total = 0; let tier = 4;
  for (let i = 0; i < TIERS.length; i++) { total += TIERS[i].weight; if (roll < total) { tier = i; break; } }
  const pool = SPECIES.filter(s => s.tier === tier);
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}

export function capacityVictim(residents, incoming) {
  const eligible = residents.filter(r => BY_ID[r.speciesId].tier <= incoming.tier);
  if (!eligible.length) return null;
  const counts = new Map();
  for (const r of residents) counts.set(r.speciesId, (counts.get(r.speciesId) || 0) + 1);
  return [...eligible].sort((a, b) => BY_ID[a.speciesId].tier - BY_ID[b.speciesId].tier || counts.get(b.speciesId) - counts.get(a.speciesId) || a.order - b.order)[0];
}

export class ReefSession {
  constructor({ capacity = 20, threshold = 65, known = [], demo = false, rng = Math.random } = {}) {
    this.capacity = capacity; this.threshold = threshold; this.demo = demo; this.rng = rng;
    this.status = 'running'; this.water = 'calm'; this.elapsed = 0; this.quietSeconds = 0; this.coins = 0;
    this.quietProgress = 0; this.interval = this.nextInterval(); this.overFor = 0; this.calmFor = 0;
    this.lossIn = 0; this.incidents = 0; this.residents = []; this.visits = new Map(); this.known = new Set(known);
    this.discoveries = []; this.serial = 0; this.startedAt = new Date().toISOString(); this.id = crypto.randomUUID(); this.events = [];
    const common = SPECIES.filter(s => s.tier === 0);
    this.admit(common[Math.min(common.length - 1, Math.floor(this.rng() * common.length))], { initial: true });
  }
  nextInterval() { return this.demo ? 6 + this.rng() * 2 : 45 + this.rng() * 15; }
  emit(type, extra = {}) { this.events.push({ type, ...extra }); }
  drain() { return this.events.splice(0); }
  admit(species, { initial = false } = {}) {
    const record = this.visits.get(species.id) || { speciesId: species.id, count: 0, scared: 0, firstAt: this.elapsed };
    record.count++; this.visits.set(species.id, record);
    const discovered = !this.known.has(species.id);
    if (discovered) { this.known.add(species.id); this.discoveries.push(species.id); }
    const creature = { id: `visitor-${++this.serial}`, speciesId: species.id, order: this.serial, arrivedAt: this.elapsed };
    let passing = false;
    if (this.residents.length >= this.capacity) {
      const victim = capacityVictim(this.residents, species);
      if (victim) { this.residents = this.residents.filter(r => r.id !== victim.id); this.emit('exit', { creature: victim, reason: 'space' }); }
      else passing = true;
    }
    if (!passing) this.residents.push(creature);
    this.emit('arrival', { creature, discovered, passing, initial });
    return creature;
  }
  scare(volume) {
    if (this.residents.length <= 1) return;
    const survivor = this.residents.reduce((newest, r) => {
      const tier = BY_ID[r.speciesId].tier, lowest = BY_ID[newest.speciesId].tier;
      return tier < lowest || tier === lowest && r.order > newest.order ? r : newest;
    });
    const candidates = this.residents.filter(r => r.id !== survivor.id);
    const excess = volume - this.threshold;
    const severity = excess > 20 ? 3 : excess > 8 ? 2 : 1;
    const count = Math.min(severity, Math.max(1, Math.ceil(this.residents.length / 4)), candidates.length);
    for (let i = 0; i < count; i++) {
      const weights = candidates.map(r => [1, 1.7, 2.8, 4.5, 7][BY_ID[r.speciesId].tier]);
      let roll = this.rng() * weights.reduce((a, b) => a + b, 0); let selected = weights.length - 1;
      for (let j = 0; j < weights.length; j++) { roll -= weights[j]; if (roll <= 0) { selected = j; break; } }
      const [creature] = candidates.splice(selected, 1);
      this.residents = this.residents.filter(r => r.id !== creature.id);
      const record = this.visits.get(creature.speciesId); if (record) record.scared++;
      this.emit('exit', { creature, reason: 'noise' });
    }
  }
  tick(seconds, volume) {
    if (this.status !== 'running' || !Number.isFinite(seconds) || seconds <= 0) return this.drain();
    const level = Math.max(0, Math.min(100, Number.isFinite(volume) ? volume : 100));
    // Small integration steps make the same rules hold at low frame rates and in deterministic tests.
    let remaining = seconds;
    while (remaining > 1e-8 && this.status === 'running') {
      const dt = Math.min(remaining, .1); remaining -= dt; this.elapsed += dt;
      this.coins = Math.min(COIN_CAP, this.coins + coinRate(this.residents) * dt);
      if (level > this.threshold) {
        this.calmFor = 0;
        if (this.water !== 'warning' && this.water !== 'rough') { this.water = 'warning'; this.overFor = 0; this.emit('water', { state: 'warning' }); }
        this.overFor += dt;
        if (this.water === 'warning' && this.overFor >= 1 - 1e-7) {
          this.water = 'rough'; this.incidents++; this.scare(level); this.lossIn = 1; this.emit('water', { state: 'rough' });
        } else if (this.water === 'rough') {
          this.lossIn -= dt;
          if (this.lossIn <= 1e-7) { this.scare(level); this.lossIn += 1; }
        }
      } else {
        this.overFor = 0;
        if (this.water === 'rough' || this.water === 'warning') { this.water = 'settling'; this.calmFor = 0; this.emit('water', { state: 'settling' }); }
        if (this.water === 'settling') {
          this.calmFor += dt;
          if (this.calmFor >= 10 - 1e-7) { this.calmFor = 10; this.water = 'calm'; this.emit('water', { state: 'calm' }); }
        } else if (this.water === 'calm') {
          this.quietSeconds += dt; this.quietProgress += dt;
          if (this.quietProgress >= this.interval - 1e-7) { this.quietProgress -= this.interval; this.admit(pickSpecies(this.rng)); this.interval = this.nextInterval(); }
        }
      }
    }
    return this.drain();
  }
  pause() { if (this.status === 'running') this.status = 'paused'; }
  resume() { if (this.status === 'paused') this.status = 'running'; }
  end() { if (this.status !== 'ended') { this.status = 'ended'; this.emit('end', { report: this.report() }); } }
  report() {
    return { id: this.id, startedAt: this.startedAt, duration: Math.round(this.elapsed), quietSeconds: Math.round(this.quietSeconds), coins: Math.floor(this.coins), demo: this.demo, discoveries: [...this.discoveries], visits: [...this.visits.values()].map(r => ({ ...r })), residents: this.residents.length };
  }
}
