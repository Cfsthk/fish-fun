import { SPECIES, BY_ID } from './species.mjs';

const loadImage = src => new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src; });
export class ReefScene {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false });
    this.creatures = new Map(); this.sprites = new Map(); this.time = 0; this.rough = .04; this.targetRough = .04;
    this.paused = false; this.reducedMotion = false; this.ready = false;
    this.bubbles = Array.from({ length: 26 }, (_, i) => ({ x: (i * .381966) % 1, y: (i * .618034) % 1, speed: 5 + i % 5, size: i % 3 ? 2 : 3, phase: i * 2.1 }));
    this.resize(); this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(canvas);
  }
  resize() { const r = this.canvas.getBoundingClientRect(); this.w = r.width < 760 ? 600 : 960; this.h = Math.max(250, Math.min(1800, Math.round(this.w * r.height / Math.max(r.width, 1)))); this.canvas.width = this.w; this.canvas.height = this.h; this.ctx.imageSmoothingEnabled = false; }
  async load() {
    [this.background, this.atlas] = await Promise.all([loadImage('./assets/reef.png'), loadImage('./assets/creatures-clean.png')]);
    const source = document.createElement('canvas'); source.width = this.atlas.width; source.height = this.atlas.height;
    const sourceCtx = source.getContext('2d', { willReadFrequently: true }); sourceCtx.drawImage(this.atlas, 0, 0);
    const cw = this.atlas.width / 4, ch = this.atlas.height / 6;
    for (const s of SPECIES) {
      const left = Math.round(s.index % 4 * cw), top = Math.round(Math.floor(s.index / 4) * ch);
      const data = sourceCtx.getImageData(left, top, cw, ch).data;
      let x1 = cw, y1 = ch, x2 = 0, y2 = 0;
      for (let y = 3; y < ch - 3; y++) for (let x = 3; x < cw - 3; x++) {
        if (data[(y * cw + x) * 4 + 3] > 220) { x1 = Math.min(x1, x); x2 = Math.max(x2, x); y1 = Math.min(y1, y); y2 = Math.max(y2, y); }
      }
      if (x2 <= x1) { x1 = 8; y1 = 8; x2 = cw - 8; y2 = ch - 8; }
      this.sprites.set(s.id, { x: left + Math.max(0, x1 - 3), y: top + Math.max(0, y1 - 3), w: Math.min(cw, x2 - x1 + 7), h: Math.min(ch, y2 - y1 + 7) });
    }
    this.ready = true;
  }
  preview() {
    this.creatures.clear();
    [0, 1, 3, 6, 9, 10, 11, 12, 15, 23].forEach((index, i) => this.add({ id: `preview-${i}`, speciesId: SPECIES[index].id }, { initial: true }));
    this.targetRough = .04; this.paused = false;
  }
  clear() { this.creatures.clear(); }
  add(creature, { initial = false, passing = false } = {}) {
    const species = BY_ID[creature.speciesId]; if (!species) return;
    const n = this.creatures.size, dir = n % 2 ? -1 : 1;
    const bottom = species.motion === 'bottom' || species.id === 'octopus';
    const placements = [[.24,.32],[.59,.48],[.81,.34],[.57,.89],[.78,.65],[.39,.49],[.17,.60],[.83,.88],[.53,.23],[.4,.73]];
    const y = initial && n < placements.length ? placements[n][1] : bottom ? .84 + (n % 3) * .025 : .22 + ((n * .317 + .11) % .50);
    this.creatures.set(creature.id, { ...creature, species, x: initial && n < placements.length ? placements[n][0] : initial ? .13 + (n * .193) % .74 : dir > 0 ? -species.size * .55 / this.w : 1 + species.size * .55 / this.w, y, dir, phase: n * 2.399 + Math.random(), age: initial ? 5 : 0, entered: initial, entryTarget: bottom ? .22 + (n * .193) % .55 : dir > 0 ? .11 : .89, speed: bottom ? 1.4 : species.motion === 'jelly' || species.motion === 'vertical' ? 4 : 8 + (n % 5) * 1.4, passing, leaving: false, bottom });
  }
  exit(id, reason) { const c = this.creatures.get(id); if (c) { c.leaving = true; c.scared = reason === 'noise'; c.dir = c.x < .5 ? -1 : 1; } }
  state(session, level) {
    this.paused = session?.status === 'paused';
    if (!session || session.status === 'ended' || this.paused) this.targetRough = .04;
    else if (session.water === 'warning') this.targetRough = .22 + Math.min(1, session.overFor / 5) * .42;
    else if (session.water === 'rough') this.targetRough = Math.min(1, .68 + Math.max(0, level - session.threshold) / 100);
    else if (session.water === 'settling') this.targetRough = .6 * Math.max(0, 1 - session.calmFor / 10);
    else this.targetRough = .04;
  }
  drawSprite(ctx, species, x, y, size, phase = 0, direction = 1, animate = true) {
    const r = this.sprites.get(species.id); if (!r) return;
    const scale = size / Math.max(r.w, r.h), w = r.w * scale, h = r.h * scale;
    const t = animate ? this.time : 0;
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(direction, 1);
    if (species.motion === 'bottom') ctx.rotate(Math.sin(t * .5 + phase) * .025);
    if (species.motion === 'jelly' || species.motion === 'tentacle' || species.motion === 'vertical') {
      if (species.motion === 'jelly') ctx.scale(1 + Math.sin(t * 2 + phase) * .045, 1 - Math.sin(t * 2 + phase) * .04);
      const step = 4;
      for (let row = 0; row < r.h; row += step) {
        const sh = Math.min(step, r.h - row), p = row / r.h;
        const bend = Math.sin(t * 2.5 + phase + p * 5) * Math.pow(p, 2) * (animate ? 2.4 : 0);
        ctx.drawImage(this.atlas, r.x, r.y + row, r.w, sh, -w / 2 + bend, -h / 2 + row * scale, w, sh * scale + .35);
      }
    } else {
      const amplitude = species.motion === 'bottom' ? .25 : species.motion === 'ray' ? 3 : 1.8;
      const step = 4;
      for (let col = 0; col < r.w; col += step) {
        const sw = Math.min(step, r.w - col), p = col / r.w;
        const bend = Math.sin(t * (species.motion === 'dolphin' ? 2 : 4) + phase + p * 4) * Math.pow(1 - p, 1.5) * amplitude * (animate ? 1 : 0);
        ctx.drawImage(this.atlas, r.x + col, r.y, sw, r.h, -w / 2 + col * scale, -h / 2 + bend, sw * scale + .3, h);
      }
    }
    ctx.restore();
  }
  icon(canvas, species, { silhouette = false, size = 100 } = {}) {
    if (!this.ready) return;
    canvas.width = size * 2; canvas.height = size * 2;
    const c = canvas.getContext('2d'); c.imageSmoothingEnabled = false;
    this.drawSprite(c, species, size, size, size * 1.65, 0, 1, false);
    if (silhouette) { c.globalCompositeOperation = 'source-in'; c.fillStyle = '#304e60'; c.fillRect(0, 0, canvas.width, canvas.height); c.globalCompositeOperation = 'source-over'; }
  }
  light(ctx, t, intensity) {
    const { w, h } = this;
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 6; i++) {
      const x = w * (.08 + i * .175) + Math.round(Math.sin(t * .08 + i) * 24);
      ctx.fillStyle = `rgba(181,245,232,${(.035 + Math.sin(t * .16 + i) * .012) * intensity})`;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 22, 0); ctx.lineTo(x + w * .1 + 75, h); ctx.lineTo(x - 15, h); ctx.closePath(); ctx.fill();
      ctx.fillStyle = `rgba(206,255,245,${.018 * intensity})`; ctx.fillRect(Math.round(x + Math.sin(t * .1) * 5), 0, 4, h);
    }
    // Moving pixel caustics on the seabed, independent of the painted environment.
    for (let i = 0; i < 42; i++) {
      const x = ((i * 83 + Math.sin(t * .25 + i) * 25) % w + w) % w;
      const y = h * .82 + ((i * 17) % (h * .17)) + Math.sin(t * .4 + i * 2) * 4;
      const a = (.05 + Math.sin(t * .7 + i) * .035) * intensity;
      ctx.fillStyle = `rgba(218,255,235,${a})`;
      ctx.fillRect(Math.round(x), Math.round(y), 15 + i % 19, 2); ctx.fillRect(Math.round(x) + 9, Math.round(y) + 2, 3, 4);
    }
    ctx.restore();
  }
  plant(ctx, x, y, height, t, phase, color) {
    for (let branch = 0; branch < 3; branch++) {
      const base = x + branch * 7, len = height * (1 - branch * .14);
      for (let v = 0; v < len; v += 4) {
        const p = v / len, sway = Math.sin(t * .6 + phase + p * 2) * p * (5 + this.rough * 8);
        const px = Math.round(base + sway + Math.sin(p * 4 + phase) * p * 5), py = Math.round(y - v);
        ctx.fillStyle = color; ctx.fillRect(px, py, 3, 5);
        if (v % 12 === 0 && v > 8) { ctx.fillRect(px - 6, py - 1, 6, 3); ctx.fillRect(px + 3, py - 4, 6, 3); }
      }
    }
  }
  draw(dt) {
    const ctx = this.ctx, w = this.w, h = this.h;
    this.time += dt; const t = this.time;
    this.rough += (this.targetRough - this.rough) * Math.min(1, dt * 2);
    ctx.imageSmoothingEnabled = false;
    if (!this.ready) { ctx.fillStyle = '#064c68'; ctx.fillRect(0, 0, w, h); return; }
    const scale = Math.max(w / this.background.width, h / this.background.height);
    const bw = this.background.width * scale, bh = this.background.height * scale;
    ctx.drawImage(this.background, Math.round((w - bw) / 2), Math.round((h - bh) / 2), Math.ceil(bw), Math.ceil(bh));
    const motion = this.reducedMotion ? .25 : 1;
    if (this.rough > .12) {
      for (let y = 0; y < h; y += 8) {
        const shift = Math.round(Math.sin(y * .025 + t * 2) * this.rough * 5 * motion * (1 - y / h * .6));
        if (shift) ctx.drawImage(this.canvas, 0, y, w, Math.min(8, h - y), shift, y, w, Math.min(8, h - y));
      }
    }
    this.light(ctx, t * motion, .85 - this.rough * .4);
    for (const b of this.bubbles) {
      const x = Math.round(b.x * w + Math.sin(t * .45 + b.phase) * 5 * motion);
      const y = Math.round(h - ((b.y * h + t * b.speed * motion) % (h + 15)));
      ctx.fillStyle = `rgba(202,248,244,${.16 + Math.sin(t + b.phase) * .05})`;
      ctx.fillRect(x, y, b.size + 1, 1); ctx.fillRect(x - 1, y + 1, 1, b.size); ctx.fillRect(x + b.size + 1, y + 1, 1, b.size); ctx.fillRect(x, y + b.size + 1, b.size + 1, 1);
    }
    if (!this.paused) {
      const swimmers = [...this.creatures.values()].filter(c => !c.bottom && !c.leaving && !c.passing);
      for (let i = 0; i < swimmers.length; i++) for (let j = i + 1; j < swimmers.length; j++) {
        const a = swimmers[i], b = swimmers[j], dx = Math.abs(a.x - b.x) * w, dy = Math.abs(a.y - b.y) * h;
        const reach = (a.species.size + b.species.size) * .42;
        if (dx < reach && dy < reach * .55) {
          const direction = a.y <= b.y ? -1 : 1;
          const push = dt * .014 * (1 - dx / reach);
          a.y = Math.max(.19, Math.min(.77, a.y + direction * push));
          b.y = Math.max(.19, Math.min(.77, b.y - direction * push));
        }
      }
    }
    for (const [id, c] of this.creatures) {
      const step = this.paused ? 0 : dt;
      c.age += step;
      const speed = c.leaving ? c.scared ? 140 : 70 : c.passing ? 52 : !c.entered ? 42 : c.speed;
      c.x += c.dir * speed / w * step;
      if (!c.entered && (c.dir > 0 ? c.x >= c.entryTarget : c.x <= c.entryTarget)) c.entered = true;
      if (c.entered && !c.leaving && !c.passing) {
        if (c.x > .94) c.dir = -1; if (c.x < .06) c.dir = 1;
      }
      if ((c.leaving || c.passing) && (c.x < -.25 || c.x > 1.25)) { this.creatures.delete(id); continue; }
      const bob = Math.sin(t * (c.bottom ? .35 : .7) + c.phase) * (c.bottom ? 1 : c.species.motion === 'jelly' ? 7 : 4);
      const y = c.y * h + bob, size = c.species.size * (c.bottom ? 1 : 1.18);
      ctx.save(); ctx.globalAlpha = Math.min(1, c.age * .9 + .1);
      this.drawSprite(ctx, c.species, c.x * w, y, size, c.phase, c.dir);
      ctx.restore();
    }
    this.plant(ctx, w * .035, h * .96, 72, t * motion, .5, '#276e64');
    this.plant(ctx, w * .93, h * .97, 82, t * motion, 2, '#398571');
    ctx.fillStyle = `rgba(3,30,55,${this.rough * .12})`; ctx.fillRect(0, 0, w, h);
    for (let layer = 0; layer < 3; layer++) {
      const amp = (1.5 + this.rough * 12) * motion;
      ctx.fillStyle = `rgba(196,255,249,${(.12 + this.rough * .16) / (layer + 1)})`;
      for (let x = 0; x < w; x += 4) {
        const wave = Math.sin(x * .018 + t * (1 + this.rough * 3) + layer * 2) + Math.sin(x * .043 - t * 1.2 + layer);
        ctx.fillRect(x, Math.round(8 + layer * 7 + wave * amp), 4, 2 + this.rough * 2);
      }
    }
  }
}
