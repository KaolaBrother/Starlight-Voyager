// ───────────────────────────── weapons & projectiles ─────────────────────────────
const WEAPONS = {
  pulse: { name: 'Pulse Laser', short: 'PULSE', col: [0.35, 1.0, 2.2], css: '#7fe9ff', desc: 'Rapid twin lasers. Reliable at any range.' },
  scatter: { name: 'Scatter Blaster', short: 'SCATR', col: [2.2, 0.9, 0.25], css: '#ffb15c', desc: 'A wide burst of pellets. Devastating up close.' },
  plasma: { name: 'Plasma Cannon', short: 'PLSMA', col: [0.55, 2.2, 0.45], css: '#8dff7a', desc: 'Heavy orbs that burst and damage everything nearby.' },
  beam: { name: 'Ion Beam', short: 'BEAM', col: [2.2, 0.35, 1.6], css: '#ff7ad8', desc: 'A continuous beam that melts armour while you hold fire.' },
  arc: { name: 'Arc Lightning', short: 'ARC', col: [0.8, 1.0, 2.6], css: '#a9c4ff', desc: 'Lightning that locks on and jumps between enemies.' },
  rail: { name: 'Rail Lance', short: 'RAIL', col: [2.4, 1.9, 0.9], css: '#ffe09a', desc: 'A piercing shot that hits everything in a line.' },
};
const WORDER = ['pulse', 'scatter', 'plasma', 'beam', 'arc', 'rail'];
function wstat(id, lv) {
  switch (id) {
    case 'pulse': return { cd: 0.118 - lv * 0.009, dmg: 8 + lv * 3, spd: 980, streams: lv >= 5 ? 4 : lv >= 3 ? 3 : 2, life: 1.2 };
    case 'scatter': return { cd: 0.46 - lv * 0.03, dmg: 7 + lv * 1.6, spd: 780, n: 7 + lv * 2, cone: 7.5, life: 0.75 };
    case 'plasma': return { cd: 0.62 - lv * 0.05, dmg: 42 + lv * 16, spd: 520, splash: 24 + lv * 5, life: 2.4 };
    case 'beam': return { dps: 70 + lv * 30, range: 470 + lv * 45, pierce: lv >= 4 ? 2 : 1 };
    case 'arc': return { cd: 0.36 - lv * 0.025, dmg: 26 + lv * 9, chains: 1 + lv, range: 390 + lv * 20, jump: 170 };
    case 'rail': return { cd: 0.95 - lv * 0.08, dmg: 110 + lv * 45, range: 1500 };
  }
  return null;
}

class Proj {
  constructor() { this.on = false; this.pos = new V3(); this.prev = new V3(); this.vel = new V3(); this.col = [1, 1, 1]; this.hitList = []; }
}
const Projs = {
  pool: [], free: [], active: [],
  init(n = 1000) { for (let i = 0; i < n; i++) { const p = new Proj(); this.pool.push(p); this.free.push(p); } },
  spawn(o) {
    const p = this.free.pop(); if (!p) return null;
    p.on = true; p.owner = o.owner; p.kind = o.kind || 'bolt';
    p.pos.copy(o.pos); p.prev.copy(o.pos); p.vel.copy(o.vel);
    p.life = o.life || 1; p.dmg = o.dmg || 1; p.r = o.r || 1; p.len = o.len || 0; p.wid = o.wid || 1;
    p.col = o.col || [1, 1, 1]; p.shape = o.shape || 0; p.splash = o.splash || 0; p.pierce = o.pierce || 0;
    p.target = o.target || null; p.turn = o.turn || 0; p.accel = o.accel || 0; p.maxSpd = o.maxSpd || 0;
    p.hp = o.hp || 0; p.trail = o.trail || 0; p.t = 0; p.hitList.length = 0; p.pal = o.pal || 'fire'; p.glow = o.glow || 0;
    this.active.push(p);
    return p;
  },
  clear(owner) {
    for (const p of this.active) if (owner === undefined || p.owner === owner) p.on = false;
    this.compact();
  },
  compact() {
    let j = 0;
    for (let i = 0; i < this.active.length; i++) { const p = this.active[i]; if (p.on) this.active[j++] = p; else this.free.push(p); }
    this.active.length = j;
  },
  update(dt) {
    const pl = Player, bodies = World.cur ? World.cur.bodies : [];
    for (const p of this.active) {
      if (!p.on) continue;
      p.t += dt; p.life -= dt;
      p.prev.copy(p.pos);
      if (p.target) {
        if (p.target.alive === false || (p.target.hp !== undefined && p.target.hp <= 0 && !p.target.isPlayer)) p.target = null;
        else {
          const tp = p.target.pos;
          _v1.subVectors(tp, p.pos).normalize();
          const sp = p.vel.len() || 1;
          _v2.copy(p.vel).scale(1 / sp);
          rotateToward(_v2, _v2, _v1, p.turn * dt);
          p.vel.copy(_v2).scale(sp);
        }
      }
      if (p.accel) { const sp = p.vel.len(); if (sp < p.maxSpd) p.vel.scale(Math.min(p.maxSpd, sp + p.accel * dt) / (sp || 1)); }
      p.pos.addScaled(p.vel, dt);
      if (p.trail && R.q.fx > 0.5) {
        if (p.kind === 'missile') {
          Parts.spawn(p.pos.x, p.pos.y, p.pos.z, rand(-3, 3), rand(-3, 3), rand(-3, 3), 0.5, 0.8, 2.6, [0.35, 0.33, 0.32], [0.05, 0.05, 0.05], 6, 1, 0, 0.6);
          Parts.spawn(p.pos.x, p.pos.y, p.pos.z, 0, 0, 0, 0.12, 1.2, 0.4, [2.4, 1.3, 0.4], [1, 0.3, 0.05], 1, 0, 0, 1);
        } else if (Math.random() < 0.6) {
          Parts.spawn(p.pos.x, p.pos.y, p.pos.z, rand(-6, 6), rand(-6, 6), rand(-6, 6), 0.35, p.wid * 0.6, 0.2, p.col, [p.col[0] * 0.2, p.col[1] * 0.2, p.col[2] * 0.2], 1, 1, 0, 0.7);
        }
      }
      if (p.owner === 0) {
        if (Enemies.projHit(p)) continue;
      } else {
        if (pl.alive && !Game.warping) {
          const rr = 3.0 + p.r;
          if (segPointDistSq(p.prev.x, p.prev.y, p.prev.z, p.pos.x, p.pos.y, p.pos.z, pl.pos.x, pl.pos.y, pl.pos.z) < rr * rr) {
            pl.damage(p.dmg, p.prev);
            sparks(p.pos, null, 6, p.col, 50);
            p.on = false; continue;
          }
        }
      }
      for (const b of bodies) {
        if (p.pos.distSq(b.pos) < b.r * b.r) { p.on = false; if (p.owner === 0 && p.splash) this.burst(p); break; }
      }
      if (p.life <= 0 && p.on) { p.on = false; if (p.owner === 0 && (p.kind === 'missile' || p.kind === 'plasma')) this.burst(p); }
    }
    this.compact();
  },
  burst(p) {
    if (p.splash) Enemies.splash(p.pos, p.splash, p.dmg * 0.6, p);
    explode(p.pos, p.kind === 'missile' ? 3 : 2.6, p.pal, 0.8);
    Sound.play('explode', 0.6);
  },
  draw(fx) {
    for (const p of this.active) {
      if (!p.on) continue;
      const sp = p.vel.len() || 1, dx = p.vel.x / sp, dy = p.vel.y / sp, dz = p.vel.z / sp;
      const fade = Math.min(1, p.life * 6);
      if (p.owner === 1) {
        const pulse = 0.85 + 0.15 * Math.sin(p.t * 20);
        fx.add(p.pos.x, p.pos.y, p.pos.z, dx, dy, dz, p.len, p.wid * 2.2 * pulse, p.col[0] * 0.6, p.col[1] * 0.6, p.col[2] * 0.6, 0.6 * fade, 1);
        fx.add(p.pos.x, p.pos.y, p.pos.z, dx, dy, dz, p.len, p.wid, p.col[0], p.col[1], p.col[2], fade, 0);
      } else if (p.kind === 'missile') {
        fx.add(p.pos.x, p.pos.y, p.pos.z, dx, dy, dz, 2.6, 0.5, 2.0, 2.0, 2.0, 1, 0);
        fx.add(p.pos.x - dx * 1.6, p.pos.y - dy * 1.6, p.pos.z - dz * 1.6, 0, 0, 0, 0, 2.4, 2.4, 1.2, 0.35, 0.9, 1);
      } else {
        fx.add(p.pos.x - dx * p.len * 0.5, p.pos.y - dy * p.len * 0.5, p.pos.z - dz * p.len * 0.5, dx, dy, dz, p.len, p.wid, p.col[0], p.col[1], p.col[2], fade, 0);
        if (p.glow) fx.add(p.pos.x, p.pos.y, p.pos.z, 0, 0, 0, 0, p.glow, p.col[0] * 0.5, p.col[1] * 0.5, p.col[2] * 0.5, 0.6 * fade, 1);
      }
    }
  },
};

// short-lived line effects: rail shots, lightning arcs, beams, telegraphs
const Lines = {
  list: [],
  add(o) { this.list.push(o); return o; },
  update(dt) { for (const l of this.list) l.life -= dt; this.list = this.list.filter((l) => l.life > 0); },
  draw(fx) {
    for (const l of this.list) {
      const k = clamp(l.life / l.max, 0, 1);
      if (l.type === 'rail') {
        const a = l.a, b = l.b;
        _v1.subVectors(b, a); const len = _v1.len(); _v1.scale(1 / len);
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, mz = (a.z + b.z) / 2;
        fx.add(mx, my, mz, _v1.x, _v1.y, _v1.z, len, 2.6 * k, l.col[0], l.col[1], l.col[2], k, 0);
        fx.add(mx, my, mz, _v1.x, _v1.y, _v1.z, len, 6 * k, l.col[0] * 0.3, l.col[1] * 0.3, l.col[2] * 0.3, k * 0.5, 1);
      } else if (l.type === 'arc') {
        for (let i = 0; i < l.pts.length - 1; i++) drawZap(fx, l.pts[i], l.pts[i + 1], l.col, k);
      } else if (l.type === 'tele') {
        const a = l.a; const d = l.dir;
        const fl = 0.5 + 0.5 * Math.sin(l.life * 40);
        fx.add(a.x + d.x * l.len / 2, a.y + d.y * l.len / 2, a.z + d.z * l.len / 2, d.x, d.y, d.z, l.len, l.wid, l.col[0], l.col[1], l.col[2], 0.35 + 0.4 * fl, 0);
      }
    }
  },
};
function drawZap(fx, a, b, col, k) {
  const segs = 6;
  _v3.subVectors(b, a); const len = _v3.len();
  _v4.copy(_v3).normalize();
  let px = a.x, py = a.y, pz = a.z;
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    let nx = a.x + _v3.x * t, ny = a.y + _v3.y * t, nz = a.z + _v3.z * t;
    if (i < segs) { const j = len * 0.09; nx += rand(-j, j); ny += rand(-j, j); nz += rand(-j, j); }
    const dx = nx - px, dy = ny - py, dz = nz - pz, l = Math.hypot(dx, dy, dz) || 1;
    fx.add((px + nx) / 2, (py + ny) / 2, (pz + nz) / 2, dx / l, dy / l, dz / l, l, 0.55, col[0], col[1], col[2], k, 0);
    px = nx; py = ny; pz = nz;
  }
  fx.add(b.x, b.y, b.z, 0, 0, 0, 0, 6, col[0], col[1], col[2], 0.5 * k, 1);
}

// nova shockwaves (player special) and jelly pulse rings (enemy)
const Waves = {
  list: [],
  add(o) { o.hit = new Set(); this.list.push(o); return o; },
  update(dt) {
    for (const w of this.list) {
      w.r += w.speed * dt;
      if (w.owner === 0) {
        for (const e of Enemies.list) {
          if (!e.alive || w.hit.has(e)) continue;
          if (e.pos.dist(w.c) < w.r + e.r) {
            w.hit.add(e);
            Enemies.damage(e, w.dmg, e.pos, false);
            if (!e.boss) { _v1.subVectors(e.pos, w.c).normalize(); e.vel.addScaled(_v1, 160); }
          }
        }
        for (const p of Projs.active) if (p.on && p.owner === 1 && p.pos.dist(w.c) < w.r) { p.on = false; sparks(p.pos, null, 3, p.col, 30); }
      } else if (Player.alive && !w.hit.has(Player)) {
        const d = Player.pos.dist(w.c);
        if (Math.abs(d - w.r) < 7) { w.hit.add(Player); Player.damage(w.dmg, w.c); }
      }
    }
    this.list = this.list.filter((w) => w.r < w.max);
  },
  draw(fx) {
    for (const w of this.list) {
      const k = 1 - w.r / w.max;
      fx.add(w.c.x, w.c.y, w.c.z, 0, 0, 0, 0, w.r, w.col[0], w.col[1], w.col[2], k, 2, w.th || 0.05);
      if (w.owner === 0) fx.add(w.c.x, w.c.y, w.c.z, 0, 0, 0, 0, w.r * 0.97, w.col[0] * 0.4, w.col[1] * 0.4, w.col[2] * 0.4, k * 0.5, 2, 0.25);
    }
  },
};
