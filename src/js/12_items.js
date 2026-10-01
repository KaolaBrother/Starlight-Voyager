// ───────────────────────────── pickups & loot ─────────────────────────────
const PICK = {
  crystal: { mesh: 'crystal', r: 2.6, col: [0.4, 1.4, 2.4], glow: 5, s: 1.2 },
  repair: { mesh: 'repair', r: 3.6, col: [0.4, 2.4, 0.7], glow: 10, s: 1.4, label: 'Hull repair' },
  shield: { mesh: 'shield', r: 3.6, col: [0.5, 1.3, 2.6], glow: 10, s: 1.4, label: 'Shield cell' },
  energy: { mesh: 'energy', r: 3.4, col: [1.7, 0.8, 2.6], glow: 9, s: 1.4, label: 'Energy orb' },
  missiles: { mesh: 'missiles', r: 3.6, col: [2.6, 1.3, 0.4], glow: 9, s: 1.5, label: 'Missile pack' },
  weapon: { mesh: 'weapon', r: 5, col: [2, 2, 2], glow: 16, s: 1.9, special: true },
  core: { mesh: 'weapon', r: 4.6, col: [2.6, 2.1, 1.0], glow: 13, s: 1.6, special: true, label: 'Weapon core' },
  module: { mesh: 'module', r: 5, col: [2.6, 1.8, 0.6], glow: 14, s: 1.8, special: true, label: 'Ship module' },
  relic: { mesh: 'relic', r: 7, col: [2.8, 2.3, 1.2], glow: 26, s: 2.6, special: true, label: 'Star Key' },
  power: { mesh: 'power', r: 4.4, col: [2, 2, 2], glow: 12, s: 1.6, label: 'Power-up' },
  crate: { mesh: 'crate', r: 4.6, col: [2.2, 1.5, 0.5], glow: 5, s: 1.7, label: 'Supply crate' },
};

class Pickup {
  constructor(kind, pos, o = {}) {
    this.kind = kind; this.D = PICK[kind];
    this.pos = pos.clone(); this.vel = o.vel ? o.vel.clone() : new V3();
    this.sub = o.sub || null; this.value = o.value || 0; this.uid = o.uid || null; this.zone = o.zone || null;
    this.orbit = o.orbit || null; this.t = rand(0, 10); this.alive = true; this.life = o.life || 0;
    this.spin = rand(0.6, 1.4); this.magnet = false; this.hp = kind === 'crate' ? 30 : 0; this.q = new Quat();
    this.scale = this.D.s * (o.scale || 1);
    this.col = this.D.col;
    if (kind === 'weapon') this.col = WEAPONS[this.sub].col;
    if (kind === 'power') this.col = BUFFS[this.sub].col;
    this.beacon = !!this.D.special;
  }
}

const Items = {
  list: [], minerals: [],
  clear() { this.list.length = 0; this.minerals.length = 0; },
  spawn(kind, pos, o) { const p = new Pickup(kind, pos, o); this.list.push(p); return p; },
  burst(kind, pos, n, value, spd = 60) {
    for (let i = 0; i < n; i++) this.spawn(kind, pos, { vel: _v1.randomUnit().scale(rand(0.4, 1) * spd), value, life: 45 });
  },
  dropLoot(e) {
    const T = e.T, lm = 1 + 0.3 * (e.lvl - 1);
    const total = Math.round(T.cr * lm * (e.elite ? 3 : 1) * rand(0.8, 1.25));
    const n = clamp(Math.round(total / 6), 1, 9);
    this.burst('crystal', e.pos, n, Math.max(1, Math.round(total / n)), 50);
    const v = _v2.randomUnit().scale(30);
    if (e.elite) {
      const r = Math.random();
      if (r < 0.45) this.spawn('module', e.pos, { vel: v, life: 90 });
      else if (r < 0.75) this.spawn('power', e.pos, { vel: v, sub: pick(Object.keys(BUFFS)), life: 60 });
      else this.spawn('core', e.pos, { vel: v, life: 90 });
    } else if (Math.random() < 0.2 + (Player.hp < Player.maxHp * 0.4 ? 0.15 : 0)) {
      const r = Math.random();
      const kind = Player.hp < Player.maxHp * 0.5 && r < 0.5 ? 'repair' : r < 0.35 ? 'repair' : r < 0.65 ? 'shield' : r < 0.82 ? 'energy' : 'missiles';
      this.spawn(kind, e.pos, { vel: v, life: 45 });
    } else if (Math.random() < 0.03) this.spawn('power', e.pos, { vel: v, sub: pick(Object.keys(BUFFS)), life: 60 });
  },

  update(dt) {
    const P = Player;
    for (const p of this.list) {
      if (!p.alive) continue;
      p.t += dt;
      if (p.orbit && !p.magnet) {
        const o = p.orbit, b = o.body;
        o.a += o.w * dt;
        p.pos.set(b.pos.x + Math.cos(o.a) * o.r, b.pos.y + o.y + Math.sin(p.t * 0.8) * 2, b.pos.z + Math.sin(o.a) * o.r);
      } else {
        p.pos.addScaled(p.vel, dt); p.vel.scale(Math.exp(-1.6 * dt));
      }
      if (p.life) { p.life -= dt; if (p.life <= 0) { p.alive = false; continue; } }
      if (!P.alive || p.kind === 'crate' || Game.state !== 'play') continue;
      const d = p.pos.dist(P.pos);
      const mr = (p.kind === 'crystal' ? P.magnet : P.magnet * 0.55) * (P.buffs.magnet > 0 ? 3 : 1);
      if (d < mr) p.magnet = true;
      if (p.magnet) {
        _v1.subVectors(P.pos, p.pos).scale(1 / Math.max(d, 0.001));
        const sp = 80 + Math.max(0, mr - d) * 3 + P.vel.len() * 1.1;
        p.pos.addScaled(_v1, Math.min(d, sp * dt));
      }
      if (p.pos.dist(P.pos) < P.r + p.D.r + 1.5) this.collect(p);
    }
    // crates: touch to open
    for (const p of this.list) if (p.alive && p.kind === 'crate' && P.alive && p.pos.dist(P.pos) < P.r + p.D.r + 2) this.breakCrate(p);
    for (const m of this.minerals) { if (m.alive) { m.flash = Math.max(0, m.flash - dt * 5); } }
    this.list = this.list.filter((p) => p.alive);
    this.minerals = this.minerals.filter((m) => m.alive);
  },

  collect(p) {
    const P = Player;
    p.alive = false;
    if (p.uid) Game.markUnique(p.uid);
    switch (p.kind) {
      case 'crystal':
        P.credits += p.value; P.stats.crystals += p.value; Sound.play('credit');
        Parts.spawn(p.pos.x, p.pos.y, p.pos.z, 0, 0, 0, 0.25, 3, 0.5, [0.6, 1.6, 2.4], [0.1, 0.3, 0.5], 1, 0, 0, 1);
        UI.creditPulse(p.value);
        return;
      case 'repair': P.heal(0.4); UI.toast('<b>Hull repaired</b> +40%'); DmgNums.show(P.pos, '+Hull', 'heal'); break;
      case 'shield': P.shield = Math.min(P.maxShield * 1.25, P.shield + P.maxShield * 0.6); P.shieldFlash = 1; UI.toast('<b>Shields charged</b> +60%'); break;
      case 'energy': P.energy = P.maxEnergy; P.addNova(20); UI.toast('<b>Energy restored</b> · Nova +20%'); break;
      case 'missiles': P.missiles = Math.min(P.maxMissiles, P.missiles + 10); UI.toast('<b>Missiles</b> +10'); break;
      case 'weapon': {
        const id = p.sub, W = WEAPONS[id];
        if (!P.weapons[id]) {
          P.weapons[id] = 1; P.cur = id;
          UI.banner('New weapon: ' + W.name, W.desc);
          UI.toast(`Equipped <b>${W.name}</b>. Switch weapons with 1–6, the mouse wheel or <b>Swap</b>.`);
        } else if (P.weapons[id] < 5) { P.weapons[id]++; UI.banner(W.name + ' upgraded', 'Level ' + P.weapons[id]); }
        else { P.credits += 300; UI.toast(`${W.name} is already at maximum. Converted to <b>300 credits</b>.`); }
        UI.weaponsDirty = true; Sound.play('weapon'); Game.save();
        explode(p.pos, 3, 'gold', 0.6);
        return;
      }
      case 'core': {
        const owned = WORDER.filter((w) => P.weapons[w] && P.weapons[w] < 5);
        const id = P.weapons[P.cur] < 5 ? P.cur : owned[0];
        if (id) { P.weapons[id]++; UI.banner(WEAPONS[id].name + ' upgraded', 'Level ' + P.weapons[id]); }
        else { P.credits += 400; UI.toast('All weapons at maximum. Converted to <b>400 credits</b>.'); }
        UI.weaponsDirty = true; Sound.play('weapon'); Game.save();
        return;
      }
      case 'module': {
        const keys = Object.keys(UPGRADES).filter((k) => P.upg[k] < UPGRADES[k].max);
        if (keys.length) {
          const k = pick(keys); P.upg[k]++; P.computeStats();
          if (k === 'hull') P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.2);
          UI.banner('Module installed', `${UPGRADES[k].name} Mk ${P.upg[k]} · ${UPGRADES[k].desc}`);
        } else { P.credits += 500; UI.toast('Ship fully upgraded. Module sold for <b>500 credits</b>.'); }
        Sound.play('weapon'); Game.save();
        return;
      }
      case 'relic': {
        if (!P.keys.includes(p.sub)) P.keys.push(p.sub);
        P.computeStats(); P.hp = P.maxHp; P.shield = P.maxShield;
        UI.banner(`Star Key ${P.keys.length} of 8`, P.keys.length >= 8 ? 'The seal on the Maw is broken. The Void Sovereign awaits.' : 'Hull +8% and damage +6% for every key you hold');
        Sound.play('levelup'); Game.save();
        explode(p.pos, 5, 'gold', 1);
        return;
      }
      case 'power': {
        const B = BUFFS[p.sub];
        P.buffs[p.sub] = B.dur;
        UI.banner(B.name, B.desc + ' for ' + B.dur + ' seconds');
        Sound.play('weapon');
        return;
      }
    }
    Sound.play('pickup');
    Parts.spawn(p.pos.x, p.pos.y, p.pos.z, 0, 0, 0, 0.35, 4, 10, p.col, [0.1, 0.1, 0.1], 2, 0, 0, 1, 0.12);
  },
  breakCrate(p) {
    p.alive = false;
    if (p.uid) Game.markUnique(p.uid);
    explode(p.pos, 3, 'gold', 0.6); Sound.play('explode', 0.8);
    const lv = World.cur ? World.cur.def.danger : 1;
    this.burst('crystal', p.pos, 6, 6 + lv * 3, 45);
    const r = Math.random();
    const v = _v2.randomUnit().scale(20);
    if (r < 0.3) this.spawn(pick(['repair', 'shield', 'energy', 'missiles']), p.pos, { vel: v, life: 60 });
    else if (r < 0.48) this.spawn('power', p.pos, { vel: v, sub: pick(Object.keys(BUFFS)), life: 60 });
    else if (r < 0.58) this.spawn('core', p.pos, { vel: v, life: 90 });
    else if (r < 0.68) this.spawn('module', p.pos, { vel: v, life: 90 });
    else this.spawn('missiles', p.pos, { vel: v, life: 60 });
  },
  // minerals (shootable asteroids)
  addMineral(pos, r, m) { const o = { pos: pos.clone(), r, m, hp: 60 + r * 9, maxHp: 60 + r * 9, q: new Quat().setEuler(rand(0, 6), rand(0, 6), rand(0, 6)), ax: new V3().randomUnit(), w: rand(-0.3, 0.3), alive: true, flash: 0 }; this.minerals.push(o); return o; },
  hitMineral(m, dmg, at) {
    m.hp -= dmg; m.flash = 1;
    if (at) sparks(at, null, 4, [2, 1.6, 1.2], 40);
    if (m.hp <= 0) {
      m.alive = false;
      explode(m.pos, m.r * 0.5, m.m === 0 ? 'ice' : 'void', 0.8); Sound.play('explode', 1.5);
      for (let i = 0; i < 14; i++) { _v1.randomUnit().scale(rand(10, 40)); Parts.spawn(m.pos.x, m.pos.y, m.pos.z, _v1.x, _v1.y, _v1.z, rand(1, 2), rand(1, 2.5), 0.4, [0.25, 0.22, 0.2], [0.05, 0.05, 0.05], 6, 0.8, 0, 0.8); }
      const lv = World.cur ? World.cur.def.danger : 1;
      this.burst('crystal', m.pos, 7, 5 + lv * 2, 40);
      if (Math.random() < 0.35) this.spawn(pick(['repair', 'shield', 'energy', 'missiles', 'power']), m.pos, { vel: _v2.randomUnit().scale(20), sub: pick(Object.keys(BUFFS)), life: 60 });
    }
  },
  projHit(p) {
    for (const m of this.minerals) {
      if (!m.alive) continue;
      const rr = m.r + p.r;
      if (segPointDistSq(p.prev.x, p.prev.y, p.prev.z, p.pos.x, p.pos.y, p.pos.z, m.pos.x, m.pos.y, m.pos.z) < rr * rr) {
        this.hitMineral(m, p.dmg, p.pos); if (p.splash) Projs.burst(p); p.on = false; return true;
      }
    }
    for (const c of this.list) {
      if (!c.alive || c.kind !== 'crate') continue;
      const rr = c.D.r + p.r;
      if (segPointDistSq(p.prev.x, p.prev.y, p.prev.z, p.pos.x, p.pos.y, p.pos.z, c.pos.x, c.pos.y, c.pos.z) < rr * rr) {
        c.hp -= p.dmg; if (c.hp <= 0) this.breakCrate(c); else sparks(p.pos, null, 4, [2, 1.5, 0.6], 40);
        p.on = false; return true;
      }
    }
    return false;
  },
  rayDamage(from, dir, len, dmg) {
    for (const m of this.minerals) {
      if (!m.alive) continue;
      const t = raySphere(from.x, from.y, from.z, dir.x, dir.y, dir.z, m.pos.x, m.pos.y, m.pos.z, m.r);
      if (t >= 0 && t <= len) this.hitMineral(m, dmg, null);
    }
    for (const c of this.list) {
      if (!c.alive || c.kind !== 'crate') continue;
      const t = raySphere(from.x, from.y, from.z, dir.x, dir.y, dir.z, c.pos.x, c.pos.y, c.pos.z, c.D.r);
      if (t >= 0 && t <= len) { c.hp -= dmg; if (c.hp <= 0) this.breakCrate(c); }
    }
  },
  splash(c, R0, dmg) {
    for (const m of this.minerals) if (m.alive && m.pos.dist(c) < R0 + m.r) this.hitMineral(m, dmg, null);
    for (const k of this.list) if (k.alive && k.kind === 'crate' && k.pos.dist(c) < R0 + k.D.r) { k.hp -= dmg; if (k.hp <= 0) this.breakCrate(k); }
  },

  // ─── drawing (instanced) ───
  draw() {
    const P = useProg(R.P.hullI);
    if (R._hullIFrame !== R.frameId) { R.hullSetup(P); R._hullIFrame = R.frameId; }
    U.v3(P, 'u_origin', 0, 0, 0);
    setBlend(0); setDepth(true, true); setCull(1);
    const M = MODELS.pick, cnt = {};
    for (const k in M) cnt[k] = 0;
    const t = Game.time;
    for (const p of this.list) {
      if (!p.alive) continue;
      const dx = p.pos.x - R.cam.x, dy = p.pos.y - R.cam.y, dz = p.pos.z - R.cam.z;
      if (dx * dx + dy * dy + dz * dz > 6000 * 6000) continue;
      if (!R.frustum.sphere(dx, dy, dz, p.scale * 3)) continue;
      const mk = p.D.mesh, mesh = M[mk], I = mesh.inst, k = cnt[mk];
      if (k >= I.max) continue;
      if (p.kind === 'crate') p.q.setEuler(p.t * 0.2, p.t * 0.3, 0);
      else p.q.setEuler(Math.sin(p.t * 0.7) * 0.4, p.t * p.spin, 0);
      const pulse = 1 + 0.25 * Math.sin(t * 4 + p.t);
      const fade = p.life && p.life < 5 ? (Math.floor(t * 8) % 2 ? 0.3 : 1) : 1;
      const o = k * 12, D = I.data;
      D[o] = dx; D[o + 1] = dy; D[o + 2] = dz; D[o + 3] = p.scale;
      D[o + 4] = p.q.x; D[o + 5] = p.q.y; D[o + 6] = p.q.z; D[o + 7] = p.q.w;
      const tint = p.kind === 'weapon' || p.kind === 'power' ? [p.col[0] / 2.4, p.col[1] / 2.4, p.col[2] / 2.4] : [1, 1, 1];
      D[o + 8] = tint[0]; D[o + 9] = tint[1]; D[o + 10] = tint[2]; D[o + 11] = pulse * fade;
      cnt[mk] = k + 1;
    }
    for (const k in M) if (cnt[k]) { uploadInstances(M[k], cnt[k]); drawInst(M[k], cnt[k]); }
    // minerals
    const mc = [0, 0];
    for (const m of this.minerals) {
      if (!m.alive) continue;
      const dx = m.pos.x - R.cam.x, dy = m.pos.y - R.cam.y, dz = m.pos.z - R.cam.z;
      if (dx * dx + dy * dy + dz * dz > 9000 * 9000 || !R.frustum.sphere(dx, dy, dz, m.r * 1.6)) continue;
      const mesh = MODELS.mineral[m.m], I = mesh.inst, k = mc[m.m];
      _q1.setAxisAngle(m.ax, t * m.w); _q2.multiplyQuats(m.q, _q1);
      const o = k * 12, D = I.data, f = 1 + m.flash * 1.5;
      D[o] = dx; D[o + 1] = dy; D[o + 2] = dz; D[o + 3] = m.r;
      D[o + 4] = _q2.x; D[o + 5] = _q2.y; D[o + 6] = _q2.z; D[o + 7] = _q2.w;
      D[o + 8] = f; D[o + 9] = f; D[o + 10] = f; D[o + 11] = 1;
      mc[m.m] = k + 1;
    }
    for (let i = 0; i < 2; i++) if (mc[i]) { uploadInstances(MODELS.mineral[i], mc[i]); drawInst(MODELS.mineral[i], mc[i]); }
  },
  drawFx(fx) {
    const t = Game.time;
    for (const p of this.list) {
      if (!p.alive) continue;
      const d = p.pos.dist(R.cam);
      if (d > 7000) continue;
      const c = p.col, k = 0.75 + 0.25 * Math.sin(t * 3 + p.t);
      fx.add(p.pos.x, p.pos.y, p.pos.z, 0, 0, 0, 0, p.D.glow * k, c[0] * 0.5, c[1] * 0.5, c[2] * 0.5, 0.5, 1);
      if (p.beacon || p.D.special) {
        fx.add(p.pos.x, p.pos.y + 130, p.pos.z, 0, 1, 0, 260, 2.2 + d * 0.002, c[0] * 0.6, c[1] * 0.6, c[2] * 0.6, 0.35, 0);
        fx.add(p.pos.x, p.pos.y, p.pos.z, 0, 0, 0, 0, p.D.glow * 2.5, c[0] * 0.5, c[1] * 0.5, c[2] * 0.5, 0.5 * k, 3, 0.6, 0, t * 0.5);
      }
    }
    for (const m of this.minerals) {
      if (!m.alive || m.pos.dist(R.cam) > 5000) continue;
      const c = m.m === 0 ? [0.3, 1.0, 1.6] : [1.4, 0.4, 1.4];
      fx.add(m.pos.x, m.pos.y, m.pos.z, 0, 0, 0, 0, m.r * 2.6, c[0] * 0.3, c[1] * 0.3, c[2] * 0.3, 0.4, 1);
    }
  },
};
