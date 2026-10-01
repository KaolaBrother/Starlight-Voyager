// ───────────────────────────── enemies ─────────────────────────────
const ETYPES = {
  drone: { name: 'Ravager Drone', model: 'drone', hp: 34, spd: 100, turn: 3.2, r: 2.6, dmg: 5, rof: 1.5, range: 420, pspd: 300, pcol: [2.4, 0.35, 0.2], xp: 10, cr: 4, beh: 'orbit', exp: 'fire', glow: [2.4, 0.4, 0.2], aggro: 760 },
  raider: { name: 'Ravager Raider', model: 'raider', hp: 72, spd: 128, turn: 2.2, r: 4, dmg: 6, rof: 0.14, burst: 3, burstCd: 1.9, range: 560, pspd: 380, pcol: [2.4, 0.8, 0.2], xp: 18, cr: 7, beh: 'strafe', exp: 'fire', glow: [2.4, 0.9, 0.2], aggro: 900 },
  gunship: { name: 'Ravager Gunship', model: 'gunship', hp: 300, spd: 52, turn: 1.1, r: 7, dmg: 10, rof: 2.4, range: 700, pspd: 230, psize: 2.2, pwid: 1.7, pcol: [1.8, 0.5, 2.4], xp: 45, cr: 18, beh: 'hover', exp: 'void', glow: [1.8, 0.5, 2.4], aggro: 950 },
  spiker: { name: 'Spiker Mine', model: 'spiker', hp: 40, spd: 150, turn: 2.6, r: 3, dmg: 18, xp: 12, cr: 5, beh: 'kamikaze', exp: 'gold', glow: [2.4, 1.6, 0.3], aggro: 700 },
  turret: { name: 'Defense Turret', model: 'turret', hp: 200, spd: 0, turn: 1.2, r: 4.5, dmg: 7, rof: 1.2, range: 680, pspd: 340, pcol: [2.4, 0.35, 0.2], xp: 25, cr: 10, beh: 'turret', exp: 'fire', glow: [2.4, 0.3, 0.2], aggro: 720 },
  lancer: { name: 'Lancer', model: 'lancer', hp: 120, spd: 90, turn: 1.6, r: 3.5, dmg: 15, range: 900, pspd: 950, pwid: 1.1, plen: 14, pcol: [0.5, 1.4, 2.6], xp: 30, cr: 12, beh: 'sniper', exp: 'ice', glow: [0.5, 1.4, 2.6], aggro: 1000 },
  jelly: { name: 'Void Jelly', model: 'jelly', hp: 110, spd: 24, turn: 0.8, r: 4.5, dmg: 9, xp: 20, cr: 8, beh: 'jelly', exp: 'void', glow: [2.4, 0.6, 1.8], aggro: 520 },
  wasp: { name: 'Hive Wasp', model: 'wasp', hp: 22, spd: 175, turn: 4.0, r: 2.2, dmg: 4, rof: 0.9, range: 260, pspd: 330, pcol: [0.8, 2.4, 0.35], xp: 7, cr: 3, beh: 'swarm', exp: 'hive', glow: [0.8, 2.4, 0.35], aggro: 800 },
  carrier: { name: 'Ravager Carrier', model: 'carrier', hp: 1100, spd: 30, turn: 0.5, r: 16, dmg: 8, rof: 3.4, range: 820, pspd: 250, psize: 1.8, pwid: 1.4, pcol: [2.4, 0.6, 0.25], xp: 120, cr: 60, beh: 'carrier', exp: 'fire', glow: [2.4, 0.5, 0.2], aggro: 1100 },
  node: { name: 'Shield Node', model: 'spiker', hp: 240, spd: 0, turn: 2, r: 3.4, dmg: 6, rof: 1.6, range: 700, pspd: 280, pcol: [1.6, 0.6, 2.6], xp: 15, cr: 6, beh: 'node', exp: 'void', glow: [1.4, 0.6, 2.6], aggro: 2000 },
};
const SYS_POOLS = [
  ['drone', 'drone', 'raider'],
  ['raider', 'spiker', 'drone', 'gunship'],
  ['lancer', 'drone', 'raider', 'turret'],
  ['wasp', 'jelly', 'drone', 'raider'],
  ['jelly', 'lancer', 'gunship', 'drone'],
  ['raider', 'gunship', 'turret', 'carrier', 'drone'],
  ['jelly', 'lancer', 'raider', 'wasp'],
  ['gunship', 'turret', 'carrier', 'raider', 'drone'],
  ['lancer', 'gunship', 'jelly', 'spiker', 'carrier'],
];

class Enemy {
  constructor(type, lvl, pos, opt = {}) {
    const T = ETYPES[type];
    this.type = type; this.T = T; this.lvl = lvl;
    this.elite = !!opt.elite;
    this.name = (this.elite ? 'Elite ' : '') + T.name;
    this.pos = pos.clone(); this.vel = new V3(); this.q = new Quat(); this.fwd = new V3().randomUnit();
    const hm = 1 + 0.42 * (lvl - 1), dm = 1 + 0.16 * (lvl - 1);
    this.maxHp = this.hp = T.hp * hm * (this.elite ? 2.6 : 1);
    this.dmg = T.dmg * dm * (this.elite ? 1.3 : 1) * (opt.dmgMul || 1);
    this.scale = this.elite ? 1.25 : 1;
    this.r = T.r * this.scale;
    this.zone = opt.zone || null; this.group = opt.group || 0; this.owner = opt.owner || null;
    this.engaged = !!opt.engaged; this.alive = true;
    this.t = rand(0, 10); this.cd = rand(0.6, 2.2); this.flash = 0; this.lastHit = -99;
    this.orbitA = rand(0, TAU); this.orbitR = rand(65, 115); this.orbitY = rand(-35, 35);
    this.state = 'move'; this.st = rand(0, 2); this.burst = 0;
    this.patrolR = opt.patrolR || rand(300, 800); this.patrolY = rand(-200, 200); this.patrolW = rand(0.02, 0.05) * (Math.random() < 0.5 ? -1 : 1);
    this.anchor = opt.anchor || null; this.home = opt.home || null;
    this.parts = [{ pos: this.pos, r: this.r }];
    this.bound = this.r;
    this.q.lookRotation(this.fwd, AXIS_Y);
    this.trail = [];
  }
  center() { return this.zone ? this.zone.body.pos : this.home || this.pos; }
}

const Enemies = {
  list: [], boss: null,
  spawn(type, lvl, pos, opt) { const e = new Enemy(type, lvl, pos, opt); this.list.push(e); return e; },
  clear() { this.list.length = 0; this.boss = null; },
  count() { let n = 0; for (const e of this.list) if (e.alive) n++; return n; },
  engagedNear(p, r) { for (const e of this.list) if (e.alive && e.engaged && e.pos.distSq(p) < r * r) return true; return false; },
  alert(e) {
    e.engaged = true;
    for (const o of this.list) if (o.alive && !o.engaged && o.group === e.group && o.pos.distSq(e.pos) < 1500 * 1500) o.engaged = true;
  },

  update(dt) {
    const P = Player;
    for (const e of this.list) {
      if (!e.alive) continue;
      e.t += dt; e.flash = Math.max(0, e.flash - dt * 5);
      if (e.boss) { e.update(dt); continue; }
      const d2p = e.pos.dist(P.pos);
      if (!e.engaged && P.alive && !Game.warping && Game.state === 'play' && d2p < e.T.aggro * (e.elite ? 1.2 : 1)) this.alert(e);
      if (e.engaged && (!P.alive || Game.warping)) e.engaged = false;
      if (e.engaged && e.zone && e.pos.dist(e.zone.body.pos) > e.zone.body.zoneR + 3200) e.engaged = false;
      if (!e.zone && !e.owner && !e.anchor && d2p > 4500) { e.alive = false; continue; }
      AI[e.T.beh](e, dt, d2p);
    }
    // separation + body avoidance
    const L = this.list;
    for (let i = 0; i < L.length; i++) {
      const a = L[i]; if (!a.alive || a.boss || a.anchor) continue;
      for (let j = i + 1; j < L.length; j++) {
        const b = L[j]; if (!b.alive || b.boss || b.anchor) continue;
        const dx = a.pos.x - b.pos.x, dy = a.pos.y - b.pos.y, dz = a.pos.z - b.pos.z;
        const min = a.r + b.r + 10, dd = dx * dx + dy * dy + dz * dz;
        if (dd < min * min && dd > 1e-6) {
          const d = Math.sqrt(dd), push = (min - d) / d * 0.5;
          a.pos.x += dx * push; a.pos.y += dy * push; a.pos.z += dz * push;
          b.pos.x -= dx * push; b.pos.y -= dy * push; b.pos.z -= dz * push;
        }
      }
      World.collideBodies(a.pos, a.r, (b2, d, min) => {
        if (b2.station) return;
        _v1.subVectors(a.pos, b2.pos).normalize(); a.pos.copy(b2.pos).addScaled(_v1, min);
        const vn = a.vel.dot(_v1); if (vn < 0) a.vel.addScaled(_v1, -vn);
      });
    }
    this.list = this.list.filter((e) => e.alive);
    if (this.boss && !this.boss.alive) this.boss = null;
  },

  // movement helpers
  steerFly(e, target, spd, dt, turnMul = 1) {
    _v1.subVectors(target, e.pos); const d = _v1.len(); if (d < 0.01) return;
    _v1.scale(1 / d);
    rotateToward(e.fwd, e.fwd, _v1, e.T.turn * turnMul * dt);
    _v2.copy(e.fwd).scale(spd);
    e.vel.lerp(_v2, 1 - Math.exp(-3 * dt));
    e.pos.addScaled(e.vel, dt);
    _v3.set(0, 1, 0);
    e.q.lookRotation(e.fwd, _v3);
  },
  hoverTo(e, target, spd, dt, faceP) {
    _v1.subVectors(target, e.pos); const d = _v1.len();
    const s = Math.min(spd, d * 1.5);
    if (d > 0.01) _v1.scale(s / d); else _v1.set(0, 0, 0);
    e.vel.lerp(_v1, 1 - Math.exp(-2.2 * dt));
    e.pos.addScaled(e.vel, dt);
    if (faceP) _v2.subVectors(Player.pos, e.pos).normalize(); else if (e.vel.lenSq() > 1) _v2.copy(e.vel).normalize(); else _v2.copy(e.fwd);
    rotateToward(e.fwd, e.fwd, _v2, e.T.turn * 1.5 * dt);
    e.q.lookRotation(e.fwd, AXIS_Y);
  },
  patrolPoint(e, out) {
    const c = e.zone ? e.zone.body.pos : (e.home || e.pos);
    const R0 = e.zone ? e.zone.body.r + e.patrolR : e.patrolR;
    e.orbitA += e.patrolW * (e.zone ? 0.3 : 1) * 0.016;
    return out.set(c.x + Math.cos(e.orbitA) * R0, c.y + e.patrolY, c.z + Math.sin(e.orbitA) * R0);
  },
  fire(e, opt = {}) {
    const T = e.T, P = Player;
    const m = _v1.copy(e.fwd).scale(e.r * 1.1).add(e.pos);
    const sp = (T.pspd || 300) * (opt.spdMul || 1);
    const d = m.dist(P.pos), t = d / sp;
    _v2.copy(P.pos).addScaled(P.vel, t * rand(0.45, 1.0)).sub(m).normalize();
    if (opt.dir) _v2.copy(opt.dir);
    _v3.randomUnit().scale(Game.diff.inacc * (opt.spread || 1)); _v2.add(_v3).normalize();
    Projs.spawn({ owner: 1, pos: m, vel: _v2.scale(sp), life: (T.range || 500) * 1.5 / sp + 0.6, dmg: e.dmg * (opt.mul || 1), r: T.psize || 1.2, len: T.plen || 3.5, wid: T.pwid || 0.75, col: T.pcol || [2.4, 0.4, 0.2] });
  },
  facing(e, maxAng) { _v1.subVectors(Player.pos, e.pos).normalize(); return e.fwd.dot(_v1) > Math.cos(maxAng); },

  // ─── combat interactions ───
  damage(e, amount, at, crit, silent) {
    if (!e.alive || e.dying) return;
    if (e.untargetable) return;
    if (e.shielded) { amount *= 0.08; if (at && !silent && Math.random() < 0.3) DmgNums.show(at, 'Shielded', ''); }
    if (crit) amount *= 2;
    e.hp -= amount; e.flash = 1; e.lastHit = Game.time;
    if (!e.engaged) this.alert(e);
    if (!silent && at) DmgNums.show(at, amount, crit ? 'crit' : '');
    if (!silent) Sound.play('hit');
    Player.addNova(amount * (e.boss ? 0.004 : 0.01));
    if (e.hp <= 0) this.kill(e);
  },
  kill(e) {
    if (e.boss) { e.startDeath(); return; }
    e.alive = false;
    explode(e.pos, e.r * 0.9 + 1.2, e.T.exp, e.r > 10 ? 1.8 : 1);
    Sound.play('explode', e.r / 3);
    const xm = (1 + 0.3 * (e.lvl - 1)) * (e.elite ? 3 : 1);
    Player.addXp(Math.round(e.T.xp * xm));
    Player.addNova(3 + e.T.xp * 0.06);
    Player.stats.kills++;
    Items.dropLoot(e);
    if (e.zone) e.zone.lastKill = Game.time;
  },
  projHit(p) {
    for (const e of this.list) {
      if (!e.alive || e.untargetable) continue;
      const br = e.bound + p.r + 60;
      if (p.pos.distSq(e.pos) > br * br && p.prev.distSq(e.pos) > br * br) continue;
      if (p.hitList.length && p.hitList.includes(e)) continue;
      for (const s of e.parts) {
        const rr = s.r + p.r;
        if (segPointDistSq(p.prev.x, p.prev.y, p.prev.z, p.pos.x, p.pos.y, p.pos.z, s.pos.x, s.pos.y, s.pos.z) < rr * rr) {
          this.damage(e, p.dmg, p.pos, Math.random() < Player.crit);
          sparks(p.pos, null, 5, p.col, 55);
          if (p.splash) { Projs.burst(p); p.on = false; return true; }
          if (p.pierce > 0) { p.pierce--; p.hitList.push(e); break; }
          p.on = false; return true;
        }
      }
    }
    if (Items.projHit(p)) return true;
    for (const q of Projs.active) {
      if (!q.on || q.owner !== 1 || q.hp <= 0) continue;
      const rr = q.r + p.r + 1.5;
      if (segPointDistSq(p.prev.x, p.prev.y, p.prev.z, p.pos.x, p.pos.y, p.pos.z, q.pos.x, q.pos.y, q.pos.z) < rr * rr) {
        q.hp -= p.dmg;
        if (q.hp <= 0) { q.on = false; explode(q.pos, 1.5, 'void', 0.5); }
        p.on = false; return true;
      }
    }
    return false;
  },
  rayHit(from, dir, len, rad, maxHits, cb) {
    const hits = [];
    for (const e of this.list) {
      if (!e.alive || e.untargetable) continue;
      let best = -1;
      for (const s of e.parts) {
        const t = raySphere(from.x, from.y, from.z, dir.x, dir.y, dir.z, s.pos.x, s.pos.y, s.pos.z, s.r + rad);
        if (t >= 0 && t <= len && (best < 0 || t < best)) best = t;
      }
      if (best >= 0) hits.push([e, best]);
    }
    hits.sort((a, b) => a[1] - b[1]);
    for (let i = 0; i < hits.length && i < maxHits; i++) cb(hits[i][0], hits[i][1]);
  },
  splash(c, R0, dmg, p) {
    for (const e of this.list) {
      if (!e.alive || e.untargetable) continue;
      const d = e.pos.dist(c);
      if (d < R0 + e.r && (!p || !p.hitList.includes(e))) this.damage(e, dmg * (1 - 0.5 * Math.min(1, d / R0)), e.pos, false);
    }
    Items.splash(c, R0, dmg);
  },

  // ─── drawing ───
  draw() {
    for (const e of this.list) {
      if (!e.alive) continue;
      if (e.boss) { e.draw(); continue; }
      if (!R.visible(e.pos, e.r * 2)) continue;
      R.drawHull(MODELS[e.T.model], e.pos, e.q, e.scale, e.flash * 0.9, e.elite ? [1.5, 1.2, 0.55] : (e.type === 'node' ? [0.8, 0.6, 1.6] : null));
    }
  },
  drawFx(fx) {
    for (const e of this.list) {
      if (!e.alive) continue;
      if (e.boss) { e.drawFx(fx); continue; }
      const g = e.T.glow;
      const d = e.pos.dist(R.cam);
      if (d > 4000) continue;
      const bx = e.pos.x - e.fwd.x * e.r * 0.95, by = e.pos.y - e.fwd.y * e.r * 0.95, bz = e.pos.z - e.fwd.z * e.r * 0.95;
      if (e.type !== 'turret' && e.type !== 'node') fx.add(bx, by, bz, -e.fwd.x, -e.fwd.y, -e.fwd.z, e.vel.len() * 0.03, e.r * 0.45, g[0], g[1], g[2], 0.8, 0);
      if (e.elite) fx.add(e.pos.x, e.pos.y, e.pos.z, 0, 0, 0, 0, e.r * 3.2, 1.6, 1.2, 0.4, 0.25, 1);
      if (e.engaged && d > 60 && d < 2200 && e !== Player.lock) {
        const sz = Math.max(e.r * 1.8, d * 0.011);
        fx.add(e.pos.x, e.pos.y, e.pos.z, 0, 0, 0, 0, sz, e.elite ? 1.6 : 1.8, e.elite ? 1.2 : 0.25, e.elite ? 0.3 : 0.2, 0.55, 2, 0.09);
      }
      if (e.type === 'spiker') { const k = 0.5 + 0.5 * Math.sin(e.t * (e.engaged ? 14 : 4)); fx.add(e.pos.x, e.pos.y, e.pos.z, 0, 0, 0, 0, e.r * 2.6, 2.4, 1.6, 0.3, 0.3 + 0.4 * k, 1); }
      if (e.type === 'jelly') fx.add(e.pos.x, e.pos.y, e.pos.z, 0, 0, 0, 0, e.r * 3.5, 1.6, 0.4, 1.2, 0.35, 1);
      if (e.type === 'node') fx.add(e.pos.x, e.pos.y, e.pos.z, 0, 0, 0, 0, e.r * 3, 1.4, 0.6, 2.6, 0.5, 1);
      if (e.state === 'charge' && e.tele) { /* drawn by Lines */ }
      // health bar
      if (e.hp < e.maxHp && (Game.time - e.lastHit < 4 || e === Player.lock) && d < 1800) {
        const f = clamp(e.hp / e.maxHp, 0, 1);
        const w = d * 0.04 + 4, h = d * 0.0032 + 0.25;
        const up = _v1.set(0, 1, 0).applyQuat(Cam.q);
        const c = f > 0.5 ? [0.4, 2.2, 0.8] : f > 0.25 ? [2.2, 1.8, 0.3] : [2.4, 0.3, 0.25];
        fx.add(e.pos.x + up.x * (e.r + d * 0.012 + 2), e.pos.y + up.y * (e.r + d * 0.012 + 2), e.pos.z + up.z * (e.r + d * 0.012 + 2), 1, 0, 0, w, h, c[0], c[1], c[2], 0.95, 4, f);
      }
    }
  },
};

// ─── per-behaviour AI ───
const _ai = new V3(), _ai2 = new V3();
const AI = {
  orbit(e, dt, d) {
    if (!e.engaged) { Enemies.steerFly(e, Enemies.patrolPoint(e, _ai), e.T.spd * 0.45, dt); return; }
    const P = Player;
    e.orbitA += dt * 0.9;
    _ai.set(Math.cos(e.orbitA) * e.orbitR, e.orbitY + Math.sin(e.orbitA * 0.7) * 25, Math.sin(e.orbitA) * e.orbitR).add(P.pos);
    Enemies.hoverTo(e, _ai, e.T.spd, dt, true);
    e.cd -= dt;
    if (e.cd <= 0 && d < e.T.range && Enemies.facing(e, 0.5)) { e.cd = e.T.rof * rand(0.8, 1.25); Enemies.fire(e); }
  },
  strafe(e, dt, d) {
    if (!e.engaged) { Enemies.steerFly(e, Enemies.patrolPoint(e, _ai), e.T.spd * 0.45, dt); return; }
    const P = Player;
    e.st -= dt;
    if (e.state === 'move') {
      _ai.copy(P.pos).addScaled(P.vel, 0.6);
      Enemies.steerFly(e, _ai, e.T.spd, dt);
      if (d < 70) { e.state = 'break'; e.st = rand(1.2, 1.8); _ai2.randomPerp(e.fwd); e.breakDir = _ai2.clone().addScaled(e.fwd, 0.6).normalize(); }
    } else {
      _ai.copy(e.pos).addScaled(e.breakDir, 200);
      Enemies.steerFly(e, _ai, e.T.spd * 1.1, dt, 1.4);
      if (e.st <= 0) e.state = 'move';
    }
    e.cd -= dt;
    if (e.burst > 0) { if (e.cd <= 0) { e.cd = e.T.rof; e.burst--; Enemies.fire(e); } }
    else if (e.cd <= 0 && d < e.T.range && Enemies.facing(e, 0.35)) { e.burst = e.T.burst; e.cd = 0; }
    else if (e.cd <= 0 && e.burst === 0) e.cd = e.T.burstCd * rand(0.8, 1.2);
  },
  hover(e, dt, d) {
    if (!e.engaged) { Enemies.hoverTo(e, Enemies.patrolPoint(e, _ai), e.T.spd * 0.5, dt, false); return; }
    const P = Player;
    _ai.subVectors(e.pos, P.pos).normalize();
    _ai2.randomPerp(_ai);
    const want = 290;
    _ai.scale(want).add(P.pos);
    _ai2.crossVectors(_v4.subVectors(e.pos, P.pos).normalize(), AXIS_Y).normalize();
    _ai.addScaled(_ai2, Math.sin(e.t * 0.5) * 90);
    Enemies.hoverTo(e, _ai, e.T.spd, dt, true);
    e.cd -= dt;
    if (e.cd <= 0 && d < e.T.range) {
      e.cd = e.T.rof * rand(0.85, 1.2);
      for (let i = -1; i <= 1; i++) { Enemies.fire(e, { spread: 1.5 + Math.abs(i) * 2.5 }); }
    }
  },
  kamikaze(e, dt, d) {
    if (!e.engaged) { Enemies.hoverTo(e, Enemies.patrolPoint(e, _ai), e.T.spd * 0.3, dt, false); return; }
    const P = Player;
    _ai.copy(P.pos).addScaled(P.vel, clamp(d / 300, 0, 0.8));
    const spd = e.T.spd * (d < 200 ? 1.45 : 1);
    Enemies.steerFly(e, _ai, spd, dt, 1.2);
    _q1.setAxisAngle(e.fwd, e.t * 6); e.q.premultiply(_q1);
    if (d < e.r + P.r + 3 && P.alive) {
      P.damage(e.dmg, e.pos);
      e.hp = 0; e.alive = false;
      explode(e.pos, 4, 'gold', 1.1); Sound.play('explode', 1.4);
    }
  },
  turret(e, dt, d) {
    if (e.anchor) {
      const A = e.anchor; A.a += A.w * dt;
      e.pos.set(A.body.pos.x + Math.cos(A.a) * A.r, A.body.pos.y + A.y, A.body.pos.z + Math.sin(A.a) * A.r);
    }
    if (!e.engaged) { _ai.set(0, 0, -1); e.q.lookRotation(e.fwd, AXIS_Y); return; }
    _ai.subVectors(Player.pos, e.pos).normalize();
    rotateToward(e.fwd, e.fwd, _ai, e.T.turn * dt);
    e.q.lookRotation(e.fwd, AXIS_Y);
    e.cd -= dt;
    if (e.cd <= 0 && d < e.T.range && Enemies.facing(e, 0.25)) { e.cd = e.T.rof * rand(0.8, 1.2); Enemies.fire(e); Enemies.fire(e, { spread: 1.6 }); }
  },
  node(e, dt, d) {
    const b = e.owner;
    if (!b || !b.alive) { e.alive = false; explode(e.pos, 2, 'void', 0.6); return; }
    e.orbitA += dt * 0.6;
    const R0 = b.r * 2.2 + 25;
    _ai.set(Math.cos(e.orbitA) * R0, Math.sin(e.orbitA * 1.3) * R0 * 0.4, Math.sin(e.orbitA) * R0).add(b.pos);
    e.pos.lerp(_ai, 1 - Math.exp(-4 * dt));
    _ai.subVectors(Player.pos, e.pos).normalize(); e.fwd.copy(_ai); e.q.lookRotation(e.fwd, AXIS_Y);
    e.cd -= dt;
    if (e.cd <= 0 && d < e.T.range) { e.cd = e.T.rof * rand(0.8, 1.3); Enemies.fire(e); }
  },
  sniper(e, dt, d) {
    if (!e.engaged) { Enemies.steerFly(e, Enemies.patrolPoint(e, _ai), e.T.spd * 0.4, dt); return; }
    const P = Player;
    e.st -= dt;
    if (e.state === 'move' || e.state === 'break') {
      _ai.subVectors(e.pos, P.pos).normalize().scale(520).add(P.pos);
      _ai2.crossVectors(_v4.subVectors(e.pos, P.pos).normalize(), AXIS_Y).normalize();
      _ai.addScaled(_ai2, Math.sin(e.t * 0.4) * 160);
      Enemies.hoverTo(e, _ai, e.T.spd, dt, true);
      if (e.st <= 0 && d < e.T.range) {
        e.state = 'charge'; e.st = 1.25;
        e.aim = new V3().copy(P.pos).addScaled(P.vel, 0.5).sub(e.pos).normalize();
        e.tele = Lines.add({ type: 'tele', a: e.pos.clone(), dir: e.aim.clone(), len: 900, wid: 0.22, col: [0.5, 1.4, 2.6], life: 1.25, max: 1.25 });
        Sound.play('charge');
      }
    } else if (e.state === 'charge') {
      e.vel.scale(Math.exp(-3 * dt)); e.pos.addScaled(e.vel, dt);
      _ai.subVectors(P.pos, e.pos).normalize();
      rotateToward(e.aim, e.aim, _ai, 0.35 * dt);
      e.fwd.copy(e.aim); e.q.lookRotation(e.fwd, AXIS_Y);
      if (e.tele) { e.tele.a.copy(e.pos); e.tele.dir.copy(e.aim); }
      if (e.st <= 0) {
        e.state = 'move'; e.st = rand(2.2, 3.4); e.tele = null;
        Enemies.fire(e, { dir: e.aim, spread: 0.2 });
      }
    }
  },
  jelly(e, dt, d) {
    const c = e.zone ? e.zone.body.pos : e.pos;
    if (!e.engaged) { Enemies.hoverTo(e, Enemies.patrolPoint(e, _ai), e.T.spd, dt, false); }
    else {
      _ai.subVectors(Player.pos, e.pos).normalize().scale(Math.max(0, d - 140)).add(e.pos);
      Enemies.hoverTo(e, _ai, e.T.spd * 1.6, dt, false);
      e.cd -= dt;
      if (e.cd <= 0 && d < 330) { e.cd = rand(2.8, 3.6); Waves.add({ owner: 1, c: e.pos.clone(), r: e.r, speed: 95, max: 300, dmg: e.dmg, col: [2.0, 0.5, 1.6], th: 0.05 }); }
    }
    e.q.lookRotation(_ai2.set(Math.sin(e.t * 0.2), 0, Math.cos(e.t * 0.2)), AXIS_Y);
    void c;
  },
  swarm(e, dt, d) {
    if (!e.engaged) { Enemies.steerFly(e, Enemies.patrolPoint(e, _ai), e.T.spd * 0.4, dt); return; }
    const P = Player;
    _ai2.crossVectors(_v4.subVectors(P.pos, e.pos).normalize(), AXIS_Y).normalize();
    _ai.copy(P.pos).addScaled(_ai2, Math.sin(e.t * 4 + e.orbitA) * 40).addScaled(AXIS_Y, Math.cos(e.t * 3 + e.orbitA) * 25);
    if (d < 60) _ai.addScaled(_v4, -120);
    Enemies.steerFly(e, _ai, e.T.spd, dt, 1);
    e.cd -= dt;
    if (e.cd <= 0 && d < e.T.range && Enemies.facing(e, 0.5)) { e.cd = e.T.rof * rand(0.8, 1.3); Enemies.fire(e); }
  },
  carrier(e, dt, d) {
    if (!e.engaged) { Enemies.steerFly(e, Enemies.patrolPoint(e, _ai), e.T.spd * 0.6, dt); return; }
    const P = Player;
    _ai.subVectors(e.pos, P.pos).normalize().scale(480).add(P.pos);
    Enemies.steerFly(e, _ai, d > 520 ? e.T.spd : e.T.spd * 0.3, dt, 1);
    e.cd -= dt;
    if (e.cd <= 0 && d < e.T.range) {
      e.cd = e.T.rof;
      for (let i = 0; i < 5; i++) Enemies.fire(e, { spread: 2 + i });
    }
    e.st -= dt;
    if (e.st <= 0) {
      e.st = 7;
      let mine = 0; for (const o of Enemies.list) if (o.alive && o.owner === e) mine++;
      for (let i = mine; i < 4; i++) {
        const p = e.pos.clone().addScaled(_ai.randomUnit(), e.r + 8);
        Enemies.spawn('drone', e.lvl, p, { zone: e.zone, group: e.group, owner: e, engaged: true });
      }
    }
  },
};

// ───────────────────────────── bosses ─────────────────────────────
const BOSSES = {
  warden: { name: 'Warden Prime', arch: 'battleship', model: 'battleshipRed', hp: 4200, r: 26, dmg: 9, col: [2.4, 0.45, 0.2], pal: 'fire', minion: 'drone', lvl: 1, pats: ['fan', 'summon', 'ring', 'spiral'] },
  colossus: { name: 'Magma Colossus', arch: 'colossus', model: 'colossus', hp: 6500, r: 20, dmg: 11, col: [2.6, 1.0, 0.25], pal: 'fire', minion: 'spiker', lvl: 2, pats: ['ring', 'homing', 'charge', 'sphere'] },
  leviathan: { name: 'Crystal Leviathan', arch: 'serpent', head: 'serpentHeadIce', seg: 'serpentSegIce', segs: 16, hp: 8200, r: 7, dmg: 12, col: [0.6, 1.6, 2.6], pal: 'ice', minion: 'lancer', lvl: 3, pats: ['fan', 'spiral', 'charge', 'sphere'] },
  hive: { name: 'Hive Queen', arch: 'hive', model: 'hive', hp: 9800, r: 15, dmg: 13, col: [0.8, 2.5, 0.4], pal: 'hive', minion: 'wasp', lvl: 4, pats: ['summon', 'fan', 'homing', 'ring'] },
  eye: { name: 'The Void Eye', arch: 'eye', model: 'eyePurple', ring: 'spikeRingPurple', hp: 11500, r: 13, dmg: 14, col: [1.8, 0.6, 2.6], pal: 'void', minion: 'jelly', lvl: 5, pats: ['beam', 'ring', 'shield', 'spiral', 'sphere'] },
  dreadnought: { name: 'Sun Dreadnought', arch: 'battleship', model: 'battleshipGold', scale: 1.25, hp: 14000, r: 30, dmg: 15, col: [2.6, 1.8, 0.4], pal: 'gold', minion: 'raider', lvl: 6, pats: ['fan', 'spiral', 'summon', 'homing', 'ring'] },
  wyrm: { name: 'Storm Wyrm', arch: 'serpent', head: 'serpentHeadStorm', seg: 'serpentSegStorm', segs: 22, hp: 16500, r: 8, dmg: 16, col: [1.5, 1.0, 2.8], pal: 'void', minion: 'wasp', lvl: 7, pats: ['beam', 'fan', 'charge', 'sphere', 'spiral'] },
  mothership: { name: 'Iron Mothership', arch: 'battleship', model: 'battleshipCyan', scale: 1.5, hp: 19500, r: 36, dmg: 17, col: [0.6, 1.7, 2.6], pal: 'ice', minion: 'gunship', lvl: 8, pats: ['summon', 'fan', 'ring', 'homing', 'spiral'] },
  sovereign: { name: 'The Void Sovereign', arch: 'eye', model: 'eyeRed', ring: 'spikeRingRed', scale: 2.2, hp: 34000, r: 26, dmg: 20, col: [2.6, 0.45, 0.3], pal: 'fire', minion: 'lancer', lvl: 9, pats: ['beam', 'sphere', 'shield', 'spiral', 'homing', 'summon', 'fan', 'ring'] },
};

class Boss {
  constructor(key, arena, pos) {
    const D = BOSSES[key];
    this.D = D; this.key = key; this.boss = true; this.name = D.name; this.lvl = D.lvl;
    this.T = { xp: 0, exp: D.pal, glow: D.col };
    this.pos = pos.clone(); this.vel = new V3(); this.q = new Quat(); this.fwd = new V3(0, 0, -1);
    this.scale = D.scale || 1;
    this.maxHp = this.hp = D.hp; this.r = D.r * this.scale; this.dmg = D.dmg;
    this.alive = true; this.engaged = true; this.flash = 0; this.lastHit = -99; this.t = 0;
    this.arena = arena; this.zone = arena.zone || null;
    this.parts = [{ pos: this.pos, r: this.r }];
    this.bound = this.r;
    this.phase = 1; this.pat = null; this.patT = 0; this.gap = 3; this.patI = 0; this.ps = {};
    this.dying = 0; this.shielded = false; this.orbitA = rand(0, TAU);
    _v1.subVectors(Player.pos, this.pos).normalize(); this.fwd.copy(_v1); this.q.lookRotation(this.fwd, AXIS_Y);
    if (D.arch === 'serpent') {
      this.segs = []; this.path = [];
      for (let i = 0; i < D.segs; i++) { const s = { pos: this.pos.clone().addScaled(this.fwd, -(i + 1) * 9), r: 7.5, q: new Quat() }; this.segs.push(s); this.parts.push(s); }
      this.parts[0].r = 7;
      this.bound = 9 * D.segs + 10;
    }
    if (D.arch === 'battleship') {
      this.parts = [{ pos: this.pos, r: 14 * this.scale }];
      for (const z of [-30, -15, 15, 30]) this.parts.push({ pos: new V3(), r: 11 * this.scale, off: new V3(0, 0, z * this.scale) });
      this.bound = 50 * this.scale;
    }
    if (D.arch === 'colossus') this.chunks = Array.from({ length: 9 }, (_, i) => ({ a: i / 9 * TAU, r: rand(34, 48), y: rand(-14, 14), s: rand(2.5, 5), m: i % 3, sp: rand(0.4, 0.8) }));
    this.ringRot = 0;
  }
  get ratio() { return this.hp / this.maxHp; }
  update(dt) {
    this.t += dt;
    const P = Player, D = this.D;
    if (this.dying > 0) {
      this.dying -= dt;
      if (Math.random() < dt * 9) { _v1.randomUnit().scale(this.r * rand(0.3, 1.2)).add(this.pos); explode(_v1, rand(3, 7), D.pal, 0.7); Sound.play('explode', 2); }
      if (this.segs) for (const s of this.segs) if (Math.random() < dt * 2) explode(s.pos, 4, D.pal, 0.5);
      if (this.dying <= 0) this.finalDeath();
      return;
    }
    this.phase = this.ratio < 0.33 ? 3 : this.ratio < 0.66 ? 2 : 1;
    // movement by archetype
    const arch = D.arch;
    _v1.subVectors(P.pos, this.pos); const d = _v1.len(); _v1.scale(1 / Math.max(d, 0.001));
    if (this.pat === 'charge' && this.ps.dash) {
      this.pos.addScaled(this.ps.dir, 640 * dt);
      if (arch !== 'serpent') { this.fwd.copy(this.ps.dir); }
    } else if (arch === 'serpent') {
      this.orbitA += dt * (0.55 + this.phase * 0.12);
      _v2.set(Math.cos(this.orbitA) * 190, Math.sin(this.orbitA * 1.7) * 70, Math.sin(this.orbitA) * 190).add(P.pos);
      _v3.subVectors(_v2, this.pos).normalize();
      rotateToward(this.fwd, this.fwd, _v3, 1.8 * dt);
      this.pos.addScaled(this.fwd, (130 + this.phase * 22) * dt);
    } else {
      const want = arch === 'battleship' ? 360 * this.scale : arch === 'eye' ? 330 * this.scale : 270;
      this.orbitA += dt * (arch === 'battleship' ? 0.12 : 0.2);
      _v2.set(Math.cos(this.orbitA), 0.25 * Math.sin(this.orbitA * 0.7), Math.sin(this.orbitA)).normalize().scale(want).add(P.pos);
      _v3.subVectors(_v2, this.pos);
      const dd = _v3.len(); _v3.scale(Math.min(arch === 'battleship' ? 55 : 70, dd) / Math.max(dd, 0.001));
      this.vel.lerp(_v3, 1 - Math.exp(-1.2 * dt));
      this.pos.addScaled(this.vel, dt);
      if (arch === 'battleship') {
        // keep broadside-ish: face perpendicular to the player direction, slowly
        _v3.crossVectors(_v1, AXIS_Y).normalize().addScaled(_v1, 0.45).normalize();
        rotateToward(this.fwd, this.fwd, _v3, 0.25 * dt);
      } else rotateToward(this.fwd, this.fwd, _v1, 1.6 * dt);
    }
    // stay out of planets
    World.collideBodies(this.pos, this.r, (b, dd, min) => { if (b.station) return; _v2.subVectors(this.pos, b.pos).normalize(); this.pos.copy(b.pos).addScaled(_v2, min); });
    this.q.lookRotation(this.fwd, AXIS_Y);
    this.ringRot += dt * (0.5 + this.phase * 0.2);
    // body parts
    if (this.segs) this.updateSegments();
    if (arch === 'battleship') for (let i = 1; i < this.parts.length; i++) this.parts[i].pos.copy(this.parts[i].off).applyQuat(this.q).add(this.pos);
    // shields from nodes
    if (this.shielded) {
      let n = 0; for (const e of Enemies.list) if (e.alive && e.type === 'node' && e.owner === this) n++;
      if (n === 0) { this.shielded = false; UI.banner('Shield down', 'Strike now!'); Sound.play('shieldup'); }
    }
    // contact damage
    for (const s of this.parts) if (P.alive && s.pos.dist(P.pos) < s.r + P.r + 1) {
      P.damage(this.dmg * 6 * dt, s.pos);
      _v2.subVectors(P.pos, s.pos).normalize(); P.pos.copy(s.pos).addScaled(_v2, s.r + P.r + 1.2);
      const vn = P.vel.dot(_v2); if (vn < 0) P.vel.addScaled(_v2, -vn * 1.5);
    }
    // attack patterns
    if (!this.pat) {
      this.gap -= dt;
      if (this.gap <= 0) {
        const list = D.pats;
        let p = list[this.patI++ % list.length];
        if (p === 'shield' && (this.shielded || this.phase === 1)) p = list[this.patI++ % list.length];
        this.pat = p; this.patT = 0; this.ps = {};
        BPAT[p].start(this);
      }
    } else {
      this.patT += dt;
      if (BPAT[this.pat].update(this, dt)) { this.pat = null; this.gap = 2.2 - this.phase * 0.45; }
    }
  }
  updateSegments() {
    const path = this.path;
    path.unshift(this.pos.clone());
    const spacing = 9.5, need = spacing * (this.segs.length + 2);
    let acc = 0;
    for (let i = 1; i < path.length; i++) { acc += path[i].dist(path[i - 1]); if (acc > need) { path.length = i + 1; break; } }
    let si = 0, dist = 0, target = spacing;
    for (let i = 1; i < path.length && si < this.segs.length; i++) {
      const a = path[i - 1], b = path[i], l = a.dist(b);
      while (si < this.segs.length && dist + l >= target) {
        const t = (target - dist) / Math.max(l, 1e-6);
        const s = this.segs[si];
        s.pos.set(lerp(a.x, b.x, t), lerp(a.y, b.y, t), lerp(a.z, b.z, t));
        _v4.subVectors(a, b); if (_v4.lenSq() > 1e-6) s.q.lookRotation(_v4.normalize(), AXIS_Y);
        si++; target += spacing;
      }
      dist += l;
    }
  }
  muzzle(out) { return out.copy(this.fwd).scale(this.r * 0.9).add(this.pos); }
  shot(from, dir, spd, o = {}) {
    return Projs.spawn({ owner: 1, pos: from, vel: _v6.copy(dir).scale(spd), life: o.life || 6, dmg: this.dmg * (o.mul || 1), r: o.r || 2.4, len: o.len || 0.5, wid: o.wid || 1.9, col: o.col || this.D.col, hp: o.hp || 0, target: o.homing ? Player : null, turn: o.turn || 0 });
  }
  startDeath() {
    if (this.dying > 0) return;
    this.dying = 3.0; this.hp = 0; this.pat = null;
    Projs.clear(1);
    for (const e of Enemies.list) if (e.owner === this || e.type === 'node') { e.alive = false; explode(e.pos, e.r, e.T.exp, 0.7); }
    UI.banner(this.name + ' is breaking apart', '');
  }
  finalDeath() {
    this.alive = false;
    explode(this.pos, this.r * 1.2, this.D.pal, 3); explode(this.pos, this.r * 0.6, 'gold', 2);
    Waves.add({ owner: 0, c: this.pos.clone(), r: 10, speed: 500, max: 700, dmg: 0, col: this.D.col, th: 0.06 });
    R.post.flash = Game.settings.shake ? 0.6 : 0.25;
    Sound.play('explode', 4); Sound.play('nova');
    Game.onBossDefeated(this);
  }
  draw() {
    const D = this.D, fl = this.flash * 0.7;
    if (D.arch === 'serpent') {
      if (R.visible(this.pos, 20)) R.drawHull(MODELS[D.head], this.pos, this.q, 1.6, fl);
      for (const s of this.segs) if (R.visible(s.pos, 12)) R.drawHull(MODELS[D.seg], s.pos, s.q, 1.25, fl);
      return;
    }
    if (!R.visible(this.pos, this.bound * 1.5)) return;
    if (D.arch === 'colossus') {
      R.drawHull(MODELS.colossus, this.pos, this.q, 1, fl);
      for (const c of this.chunks) {
        const a = c.a + this.t * c.sp;
        _v1.set(Math.cos(a) * c.r, c.y + Math.sin(this.t + c.a) * 4, Math.sin(a) * c.r).add(this.pos);
        _q1.setEuler(this.t * c.sp, a, 0);
        R.drawHull(MODELS.chunks[c.m], _v1, _q1, c.s, fl);
      }
      return;
    }
    R.drawHull(MODELS[D.model], this.pos, this.q, this.scale, fl);
    if (D.arch === 'eye') {
      _q1.setAxisAngle(AXIS_Z, this.ringRot); _q2.multiplyQuats(this.q, _q1);
      R.drawHull(MODELS[D.ring], this.pos, _q2, this.scale, fl);
    }
  }
  drawFx(fx) {
    const D = this.D, c = D.col;
    const p = this.pos;
    fx.add(p.x, p.y, p.z, 0, 0, 0, 0, this.r * 2.6, c[0] * 0.5, c[1] * 0.5, c[2] * 0.5, 0.2, 1);
    if (D.arch === 'eye') { this.muzzle(_v1); fx.add(_v1.x, _v1.y, _v1.z, 0, 0, 0, 0, this.r * 1.2, c[0], c[1], c[2], 0.5 + 0.3 * Math.sin(this.t * 6), 1); }
    if (D.arch === 'serpent') for (const s of this.segs) fx.add(s.pos.x, s.pos.y, s.pos.z, 0, 0, 0, 0, 10, c[0] * 0.4, c[1] * 0.4, c[2] * 0.4, 0.3, 1);
    if (this.shielded) {
      const k = 0.6 + 0.4 * Math.sin(this.t * 5);
      fx.add(p.x, p.y, p.z, 0, 0, 0, 0, this.r * 2.4, 1.0, 0.6, 2.4, 0.8 * k, 2, 0.06);
      fx.add(p.x, p.y, p.z, 0, 0, 0, 0, this.r * 2.4, 0.3, 0.2, 0.8, 0.4 * k, 1);
    }
    if (this.pat === 'charge' && !this.ps.dash) fx.add(p.x, p.y, p.z, 0, 0, 0, 0, this.r * 3, c[0], c[1], c[2], 0.5 + 0.5 * Math.sin(this.t * 30), 1);
  }
}

const _bp = new V3(), _bu = new V3(), _bv = new V3();
function basisFrom(dir) {
  _bu.crossVectors(dir, AXIS_Y); if (_bu.lenSq() < 1e-4) _bu.set(1, 0, 0); _bu.normalize();
  _bv.crossVectors(_bu, dir).normalize();
}
const BPAT = {
  fan: {
    start(b) { b.ps = { n: 0, t: 0.2 }; },
    update(b, dt) {
      b.ps.t -= dt;
      if (b.ps.t <= 0 && b.ps.n < 2 + b.phase) {
        b.ps.t = 0.55; b.ps.n++;
        const from = b.muzzle(_bp);
        const dir = _v5.subVectors(Player.pos, from).normalize();
        basisFrom(dir);
        const N = 7 + b.phase * 3, spread = 0.9;
        for (let row = 0; row < (b.phase >= 2 ? 2 : 1); row++) {
          const vy = b.phase >= 2 ? (row - 0.5) * 0.12 : 0;
          for (let i = 0; i < N; i++) {
            const a = (i / (N - 1) - 0.5) * spread + (b.ps.n % 2) * spread / (N - 1) * 0.5;
            _v4.copy(dir).scale(Math.cos(a)).addScaled(_bu, Math.sin(a)).addScaled(_bv, vy).normalize();
            b.shot(from, _v4, 210 + b.phase * 25);
          }
        }
        Sound.play('plasma');
      }
      return b.ps.n >= 2 + b.phase && b.ps.t <= 0;
    },
  },
  ring: {
    start(b) { b.ps = { n: 0, t: 0 }; },
    update(b, dt) {
      b.ps.t -= dt;
      if (b.ps.t <= 0 && b.ps.n < 2 + (b.phase >> 1)) {
        b.ps.t = 0.8; b.ps.n++;
        const from = b.muzzle(_bp), dir = _v5.subVectors(Player.pos, from).normalize();
        basisFrom(dir);
        const N = 18 + b.phase * 6, cone = 0.3 + 0.08 * b.ps.n, off = Math.random() * TAU;
        for (let i = 0; i < N; i++) {
          const a = off + i / N * TAU;
          _v4.copy(dir).scale(Math.cos(cone)).addScaled(_bu, Math.cos(a) * Math.sin(cone)).addScaled(_bv, Math.sin(a) * Math.sin(cone)).normalize();
          b.shot(from, _v4, 200 + b.phase * 20);
        }
        Sound.play('scatter');
      }
      return b.ps.n >= 2 + (b.phase >> 1) && b.ps.t <= 0;
    },
  },
  sphere: {
    start(b) { b.ps = { n: 0, t: 0.3 }; },
    update(b, dt) {
      b.ps.t -= dt;
      if (b.ps.t <= 0 && b.ps.n < b.phase) {
        b.ps.t = 1.0; b.ps.n++;
        const N = 46 + b.phase * 12, ga = PI * (3 - Math.sqrt(5)), rot = Math.random() * TAU;
        for (let i = 0; i < N; i++) {
          const y = 1 - (i + 0.5) / N * 2, rr = Math.sqrt(1 - y * y), th = ga * i + rot;
          _v4.set(Math.cos(th) * rr, y, Math.sin(th) * rr);
          _v5.copy(_v4).scale(b.r * 0.8).add(b.pos);
          b.shot(_v5, _v4, 140 + b.phase * 15, { life: 7 });
        }
        Sound.play('explode', 1);
      }
      return b.ps.n >= b.phase && b.ps.t <= 0;
    },
  },
  spiral: {
    start(b) { b.ps = { a: Math.random() * TAU, t: 0 }; },
    update(b, dt) {
      b.ps.t -= dt;
      const from = b.muzzle(_bp), dir = _v5.subVectors(Player.pos, from).normalize();
      basisFrom(dir);
      while (b.ps.t <= 0) {
        b.ps.t += 0.075 - b.phase * 0.01;
        b.ps.a += 0.42;
        for (let k = 0; k < (b.phase >= 3 ? 3 : 2); k++) {
          const a = b.ps.a + k * TAU / (b.phase >= 3 ? 3 : 2), cone = 0.42;
          _v4.copy(dir).scale(Math.cos(cone)).addScaled(_bu, Math.cos(a) * Math.sin(cone)).addScaled(_bv, Math.sin(a) * Math.sin(cone)).normalize();
          b.shot(from, _v4, 190, { r: 2, wid: 1.6 });
        }
      }
      return b.patT > 2.4 + b.phase * 0.4;
    },
  },
  homing: {
    start(b) {
      const n = 3 + b.phase * 2;
      for (let i = 0; i < n; i++) {
        _v4.randomUnit(); _v5.copy(_v4).scale(b.r + 4).add(b.pos);
        b.shot(_v5, _v4, 90, { homing: true, turn: 1.1, life: 8, hp: 40, r: 3, wid: 2.8, mul: 1.6 });
      }
      Sound.play('charge');
    },
    update(b) { return b.patT > 1.5; },
  },
  summon: {
    start(b) {
      let mine = 0; for (const e of Enemies.list) if (e.alive && e.owner === b) mine++;
      const n = Math.min(3 + b.phase, 8 - mine);
      for (let i = 0; i < n; i++) {
        _v4.randomUnit().scale(b.r + 20).add(b.pos);
        const e = Enemies.spawn(b.D.minion, b.lvl, _v4, { owner: b, engaged: true, zone: b.zone });
        explode(_v4, 2, b.D.pal, 0.4);
        void e;
      }
      UI.toast(`${b.name} calls for reinforcements`);
    },
    update(b) { return b.patT > 1.2; },
  },
  beam: {
    start(b) {
      b.ps = { aim: _v5.subVectors(Player.pos, b.pos).normalize().clone(), on: false };
      b.ps.tele = Lines.add({ type: 'tele', a: b.pos.clone(), dir: b.ps.aim.clone(), len: 1600, wid: 0.5, col: b.D.col, life: 1.3, max: 1.3 });
      Sound.play('charge');
    },
    update(b, dt) {
      const ps = b.ps;
      _v4.subVectors(Player.pos, b.pos).normalize();
      if (!ps.on) {
        rotateToward(ps.aim, ps.aim, _v4, 0.6 * dt);
        ps.tele.a.copy(b.pos); ps.tele.dir.copy(ps.aim);
        if (b.patT > 1.3) { ps.on = true; Sound.play('rail'); }
        return false;
      }
      rotateToward(ps.aim, ps.aim, _v4, (0.2 + b.phase * 0.07) * dt);
      const from = b.muzzle(_bp);
      const len = 1600;
      const P = Player;
      if (P.alive) {
        const dd = segPointDistSq(from.x, from.y, from.z, from.x + ps.aim.x * len, from.y + ps.aim.y * len, from.z + ps.aim.z * len, P.pos.x, P.pos.y, P.pos.z);
        if (dd < 9 * 9) P.damage(b.dmg * 3.2 * dt, from);
      }
      ps.beamFrom = from.clone();
      Lines.add({ type: 'rail', a: from.clone(), b: from.clone().addScaled(ps.aim, len), life: 0.05, max: 0.05, col: b.D.col });
      return b.patT > 1.3 + 1.6 + b.phase * 0.3;
    },
  },
  charge: {
    start(b) {
      b.ps = { dash: false, dir: _v5.subVectors(Player.pos, b.pos).normalize().clone() };
      b.ps.tele = Lines.add({ type: 'tele', a: b.pos.clone(), dir: b.ps.dir.clone(), len: 700, wid: b.r * 0.25, col: b.D.col, life: 0.9, max: 0.9 });
      Sound.play('charge');
    },
    update(b, dt) {
      if (!b.ps.dash) {
        _v4.subVectors(Player.pos, b.pos).normalize(); rotateToward(b.ps.dir, b.ps.dir, _v4, 0.8 * dt);
        b.ps.tele.a.copy(b.pos); b.ps.tele.dir.copy(b.ps.dir);
        if (b.patT > 0.9) { b.ps.dash = true; Sound.play('missile'); }
        return false;
      }
      if (Math.random() < 0.5) Parts.spawn(b.pos.x, b.pos.y, b.pos.z, 0, 0, 0, 0.5, b.r * 0.8, b.r * 1.6, b.D.col, [0.2, 0.05, 0.02], 1, 0, 0, 0.5);
      return b.patT > 2.1;
    },
  },
  shield: {
    start(b) {
      b.shielded = true;
      for (let i = 0; i < 4; i++) {
        _v4.randomUnit().scale(b.r * 2 + 25).add(b.pos);
        const e = Enemies.spawn('node', b.lvl, _v4, { owner: b, engaged: true, zone: b.zone });
        e.orbitA = i / 4 * TAU;
      }
      UI.banner('Shield nodes deployed', 'Destroy the nodes to break the shield');
      Sound.play('shieldup');
    },
    update(b) { return b.patT > 1.5; },
  },
};
