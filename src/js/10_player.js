// ───────────────────────────── input ─────────────────────────────
const Input = {
  keys: Object.create(null),
  mouse: { x: 0, y: 0, nx: 0, ny: 0, down: false, inside: false, used: false },
  stick: { id: -1, ox: 0, oy: 0, x: 0, y: 0 },
  t: { fire: false, boost: false, brake: false },
  pad: { on: false, sx: 0, sy: 0, fire: false, boost: false, prev: [] },
  touchMode: false, wheelAcc: 0,
  init() {
    const K = this.keys;
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!K[e.code]) Game.onKey(e.code);
      K[e.code] = true;
    });
    window.addEventListener('keyup', (e) => { K[e.code] = false; });
    window.addEventListener('blur', () => { for (const k in K) K[k] = false; this.mouse.down = false; this.t.fire = this.t.boost = this.t.brake = false; });
    window.addEventListener('mousemove', (e) => {
      const m = this.mouse; m.x = e.clientX; m.y = e.clientY; m.inside = true;
      const rr = Math.min(innerWidth, innerHeight) * 0.42;
      m.nx = clamp((e.clientX - innerWidth / 2) / rr, -1, 1);
      m.ny = clamp(-(e.clientY - innerHeight / 2) / rr, -1, 1);
      if (!this.touchMode) m.used = true;
    });
    document.addEventListener('mouseleave', () => { this.mouse.inside = false; });
    canvas.addEventListener('mousedown', (e) => {
      if (this.touchMode) return;
      Sound.resume();
      if (e.button === 0) this.mouse.down = true;
      if (e.button === 2 && Game.state === 'play') Player.fireMissiles();
    });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) this.mouse.down = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('wheel', (e) => {
      if (Game.state !== 'play') return;
      this.wheelAcc += e.deltaY;
      if (Math.abs(this.wheelAcc) > 60) { Player.cycleWeapon(this.wheelAcc > 0 ? 1 : -1); this.wheelAcc = 0; }
    }, { passive: true });
    window.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch' && !this.touchMode) this.setTouch(true); }, true);
    window.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' && this.touchMode && Math.abs(e.movementX) + Math.abs(e.movementY) > 8) { this.setTouch(false); this.mouse.used = true; } });
    // touch stick
    const zone = document.getElementById('stickzone'), stick = document.getElementById('stick'), knob = document.getElementById('knob');
    const S = this.stick;
    zone.addEventListener('pointerdown', (e) => {
      if (S.id !== -1) return;
      S.id = e.pointerId; S.ox = e.clientX; S.oy = e.clientY; S.x = S.y = 0;
      stick.style.left = S.ox + 'px'; stick.style.top = S.oy + 'px'; stick.hidden = false;
      knob.style.transform = 'translate(0px, 0px)';
      document.getElementById('stickhint').hidden = true;
      try { zone.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      e.preventDefault();
    });
    const move = (e) => {
      if (e.pointerId !== S.id) return;
      let dx = e.clientX - S.ox, dy = e.clientY - S.oy;
      const R0 = 58, l = Math.hypot(dx, dy);
      if (l > R0) { // drag the base along so the stick never "sticks"
        S.ox += dx - dx / l * R0; S.oy += dy - dy / l * R0; dx = dx / l * R0; dy = dy / l * R0;
        stick.style.left = S.ox + 'px'; stick.style.top = S.oy + 'px';
      }
      S.x = dx / R0; S.y = -dy / R0;
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    const up = (e) => { if (e.pointerId !== S.id) return; S.id = -1; S.x = S.y = 0; stick.hidden = true; };
    zone.addEventListener('pointermove', move); zone.addEventListener('pointerup', up); zone.addEventListener('pointercancel', up);
    const hold = (id, key) => {
      const el = document.getElementById(id);
      const on = (e) => { this.t[key] = true; el.classList.add('on'); try { el.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ } e.preventDefault(); Sound.resume(); };
      const off = () => { this.t[key] = false; el.classList.remove('on'); };
      el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('lostpointercapture', off);
    };
    hold('t-fire', 'fire'); hold('t-boost', 'boost'); hold('t-brake', 'brake');
    const tap = (id, fn) => { const el = document.getElementById(id); el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.classList.add('on'); fn(); setTimeout(() => el.classList.remove('on'), 140); }); };
    tap('t-msl', () => Player.fireMissiles());
    tap('t-swap', () => Player.cycleWeapon(1));
    tap('t-nova', () => Player.useNova());
    window.addEventListener('gamepadconnected', () => { this.pad.on = true; });
    // iPad/iPhone: stop double-tap-to-zoom and pinch-zoom from resizing the page mid-game.
    // Menu buttons, links and form controls keep their normal taps; menus still scroll.
    const keepTap = (t) => t && t.closest && t.closest('a, input, select, label, textarea, button:not(.tb)');
    document.addEventListener('touchend', (e) => { if (!keepTap(e.target)) e.preventDefault(); }, { passive: false });
    document.addEventListener('touchstart', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
    // No text selection, long-press menus or drags. The error screen's detail line stays copyable.
    const canSelect = (t) => t && t.closest && t.closest('input, textarea, .fatal .detail');
    document.addEventListener('selectstart', (e) => { if (!canSelect(e.target)) e.preventDefault(); });
    document.addEventListener('contextmenu', (e) => { if (!canSelect(e.target)) e.preventDefault(); });
    document.addEventListener('dragstart', (e) => e.preventDefault());
    document.addEventListener('selectionchange', () => {
      const sel = window.getSelection && window.getSelection();
      if (!sel || sel.isCollapsed || !sel.anchorNode) return;
      const n = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement;
      if (!canSelect(n)) sel.removeAllRanges();
    });
    // Android: a held finger on the game view or touch controls must not start Chrome's
    // long-press text selection. Controls use pointer events, so cancelling the touch is safe.
    if (/Android/i.test(navigator.userAgent)) {
      document.addEventListener('touchstart', (e) => {
        const t = e.target;
        if (t && t.closest && t.closest('#game, #touch, #hud, #mapc') && !keepTap(t)) e.preventDefault();
      }, { passive: false });
    }
    document.addEventListener('touchmove', (e) => { if (e.touches.length > 1 || (typeof e.scale === 'number' && e.scale !== 1)) e.preventDefault(); }, { passive: false });
    for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
    document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
    if (window.matchMedia && matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches) this.setTouch(true);
  },
  setTouch(v) {
    this.touchMode = v;
    if (v && Game.settings.autofire === undefined) Game.settings.autofire = true;
    UI.applyTouchMode && UI.applyTouchMode();
  },
  pollPad() {
    const P = this.pad;
    if (!P.on || !navigator.getGamepads) return;
    const g = Array.from(navigator.getGamepads()).find((x) => x);
    if (!g) return;
    const dz = (v) => (Math.abs(v) < 0.15 ? 0 : (v - Math.sign(v) * 0.15) / 0.85);
    P.sx = dz(g.axes[0] || 0); P.sy = -dz(g.axes[1] || 0);
    const b = (i) => !!(g.buttons[i] && g.buttons[i].pressed);
    P.fire = b(7) || b(0); P.boost = b(5) || b(10);
    const now = g.buttons.map((x) => x.pressed);
    const edge = (i) => now[i] && !P.prev[i];
    if (edge(6) || edge(2)) Player.fireMissiles();
    if (edge(4)) Player.cycleWeapon(-1);
    if (edge(1)) Player.cycleWeapon(1);
    if (edge(3)) Player.useNova();
    if (edge(9)) Game.onKey('Escape');
    if (edge(8)) Game.onKey('KeyM');
    P.prev = now;
  },
  steer() {
    let sx = 0, sy = 0;
    const K = this.keys, S = this.stick, sens = Game.settings.sens || 1;
    if (S.id !== -1) { sx = S.x; sy = S.y; sx = Math.sign(sx) * Math.pow(Math.abs(sx), 1.25); sy = Math.sign(sy) * Math.pow(Math.abs(sy), 1.25); }
    else if (this.pad.on && (this.pad.sx || this.pad.sy)) { sx = this.pad.sx; sy = this.pad.sy; }
    else if (!this.touchMode && this.mouse.used && this.mouse.inside) {
      const f = (v) => { const a = Math.max(0, (Math.abs(v) - 0.05) / 0.95); return Math.sign(v) * Math.pow(a, 1.3); };
      sx = f(this.mouse.nx); sy = f(this.mouse.ny);
    }
    if (K.ArrowLeft) sx -= 1; if (K.ArrowRight) sx += 1; if (K.ArrowUp) sy += 1; if (K.ArrowDown) sy -= 1;
    if (Game.settings.invert) sy = -sy;
    return { sx: clamp(sx * sens, -1.2, 1.2), sy: clamp(sy * sens, -1.2, 1.2) };
  },
  wantFire() { return this.mouse.down || this.keys.Space || this.t.fire || this.pad.fire; },
  wantBoost() { return this.keys.ShiftLeft || this.keys.ShiftRight || this.t.boost || this.pad.boost; },
};

// ───────────────────────────── player ─────────────────────────────
const UPGRADES = {
  hull: { name: 'Hull Plating', max: 10, desc: '+18% maximum hull' },
  shield: { name: 'Shield Matrix', max: 10, desc: '+18% shield capacity, faster recharge' },
  damage: { name: 'Weapon Amplifier', max: 10, desc: '+12% damage for every weapon' },
  rate: { name: 'Cyclic Loader', max: 8, desc: '+8% fire rate' },
  engine: { name: 'Ion Engines', max: 6, desc: '+7% speed, +12% boost energy' },
  magnet: { name: 'Tractor Field', max: 5, desc: '+35% pickup pull range' },
  rack: { name: 'Missile Rack', max: 6, desc: '+6 missile capacity' },
};
const BUFFS = {
  overdrive: { name: 'Overdrive', css: '#ff6a5a', col: [2.4, 0.5, 0.35], dur: 25, desc: 'Double damage' },
  rapid: { name: 'Rapid Fire', css: '#ffd24a', col: [2.4, 1.9, 0.35], dur: 25, desc: 'Much faster firing' },
  aegis: { name: 'Aegis', css: '#ffffff', col: [2.2, 2.2, 2.6], dur: 12, desc: 'Invulnerable' },
  magnet: { name: 'Magnet Surge', css: '#7fe6ff', col: [0.5, 1.8, 2.4], dur: 30, desc: 'Pulls in everything nearby' },
};
const MUZZLES = { L: new V3(-1.25, -0.24, -1.1), R: new V3(1.25, -0.24, -1.1), N: new V3(0, -0.12, -3.7), WL: new V3(-3.42, -0.42, -0.2), WR: new V3(3.42, -0.42, -0.2) };
const NOZZLES = [new V3(-0.8, -0.1, 2.75), new V3(0.8, -0.1, 2.75)];

const Player = {
  isPlayer: true, alive: true, r: 3,
  pos: new V3(), vel: new V3(), q: new Quat(), visQ: new Quat(),
  fwd: new V3(0, 0, -1), right: new V3(1, 0, 0), up: new V3(0, 1, 0),
  yawR: 0, pitchR: 0, rollR: 0, bank: 0, speed: 0, boosting: false, boostHold: 0, cruise: false, cruiseV: 0, strafe: 0,
  hp: 200, maxHp: 200, shield: 100, maxShield: 100, energy: 100, maxEnergy: 100, shieldDelay: 0, regen: 36, lastDmg: -99, invuln: 0, lastStandCd: 0, shieldFlash: 0,
  level: 1, xp: 0, credits: 0, weapons: {}, cur: 'pulse', missiles: 12, maxMissiles: 24, nova: 0,
  upg: {}, keys: [], buffs: {}, dmgMul: 1, rateMul: 1, speedMul: 1, magnet: 150, crit: 0.12,
  fireCd: 0, mslCd: 0, muzzleI: 0, firing: false, beamOn: false, beamEnd: new V3(), beamHitT: 0, beamAcc: new Map(), muzzleFlash: 0,
  lock: null, lockAng: 9, trails: [[], []], deadT: 0, stats: {},

  reset() {
    this.level = 1; this.xp = 0; this.credits = 0;
    this.weapons = { pulse: 1, scatter: 0, plasma: 0, beam: 0, arc: 0, rail: 0 }; this.cur = 'pulse';
    this.upg = { hull: 0, shield: 0, damage: 0, rate: 0, engine: 0, magnet: 0, rack: 0 };
    this.keys = []; this.buffs = { overdrive: 0, rapid: 0, aegis: 0, magnet: 0 };
    this.missiles = 16; this.nova = 40;
    this.stats = { kills: 0, crystals: 0, deaths: 0, time: 0, bosses: 0, shots: 0 };
    this.computeStats(); this.hp = this.maxHp; this.shield = this.maxShield; this.energy = this.maxEnergy;
  },
  computeStats() {
    const u = this.upg, L = this.level - 1, K = this.keys.length;
    this.maxHp = Math.round((230 + L * 16) * (1 + 0.18 * u.hull) * (1 + 0.08 * K));
    this.maxShield = Math.round((150 + L * 11) * (1 + 0.18 * u.shield));
    this.regen = 38 * (1 + 0.15 * u.shield);
    this.maxEnergy = Math.round(100 * (1 + 0.12 * u.engine));
    this.speedMul = 1 + 0.07 * u.engine;
    this.baseDmg = (1 + 0.12 * u.damage) * (1 + 0.035 * L) * (1 + 0.06 * K);
    this.baseRate = 1 + 0.08 * u.rate;
    this.magnet = 150 * (1 + 0.35 * u.magnet);
    this.maxMissiles = 24 + 6 * u.rack;
    this.missiles = Math.min(this.missiles, this.maxMissiles);
  },
  xpNext() { return Math.round(110 * Math.pow(this.level, 1.5)); },
  addXp(n) {
    this.xp += n;
    while (this.xp >= this.xpNext()) {
      this.xp -= this.xpNext(); this.level++;
      this.computeStats(); this.hp = this.maxHp; this.shield = this.maxShield;
      UI.banner('Level ' + this.level, 'Hull, shields and weapons strengthened');
      UI.toast(`Reached pilot level <b>${this.level}</b>. Ship fully repaired.`);
      Sound.play('levelup');
      Game.save();
    }
  },
  placeAt(pos, dir) {
    this.pos.copy(pos); this.vel.set(0, 0, 0); this.speed = 0; this.cruise = false;
    this.q.lookRotation(dir, AXIS_Y); this.visQ.copy(this.q);
    this.yawR = this.pitchR = this.rollR = 0;
    this.trails = [[], []];
    Cam.snap();
  },

  update(dt) {
    if (!this.alive) { this.deadT += dt; return; }
    const K = Input.keys;
    this.updateAxes();
    // ── steering ──
    let st = Input.steer();
    if (Game.autopilot) {
      const m = Input.mouse, S = Input.stick;
      const moved = Game.apMouse && Math.hypot(m.x - Game.apMouse.x, m.y - Game.apMouse.y) > 70;
      const manual = moved || S.id !== -1 || K.KeyS || Input.t.brake || K.ArrowLeft || K.ArrowRight || K.ArrowUp || K.ArrowDown || (Input.pad.on && (Math.abs(Input.pad.sx) > 0.3 || Math.abs(Input.pad.sy) > 0.3));
      if (manual) { Game.autopilot = false; UI.toast('Autopilot off. You have the controls.'); }
      else { const ap = Game.autopilotSteer(); if (ap) st = ap; }
    }
    const turnMul = this.cruise ? 0.42 : this.boosting ? 0.8 : 1;
    this.yawR = damp(this.yawR, -st.sx * 1.75 * turnMul, 7, dt);
    this.pitchR = damp(this.pitchR, st.sy * 1.65 * turnMul, 7, dt);
    const rollIn = (K.KeyE ? 1 : 0) - (K.KeyQ ? 1 : 0);
    let rollT = -rollIn * 2.6;
    if (!rollIn && Math.abs(this.fwd.y) < 0.9) rollT = -Math.atan2(this.right.y, this.up.y) * 1.8;
    this.rollR = damp(this.rollR, rollT, 6, dt);
    _q1.setAxisAngle(AXIS_Y, this.yawR * dt); _q2.setAxisAngle(AXIS_X, this.pitchR * dt); _q3.setAxisAngle(AXIS_Z, this.rollR * dt);
    this.q.multiply(_q1).multiply(_q2).multiply(_q3).normalize();
    this.updateAxes();
    // ── throttle / boost / cruise ──
    const wantBoost = (Input.wantBoost() || Game.autopilot) && Game.state === 'play';
    const brake = K.KeyS || Input.t.brake;
    const accel = K.KeyW;
    const sm = this.speedMul;
    let target = brake ? 6 : accel ? 170 * sm : 92 * sm;
    this.boosting = false;
    if (wantBoost && !brake && this.energy > 0.5) {
      this.boosting = true; target = 345 * sm;
      if (!this.cruise) this.energy = Math.max(0, this.energy - 20 * dt);
      this.boostHold += dt;
    } else { this.boostHold = 0; }
    if (!this.boosting || this.cruise) this.energy = Math.min(this.maxEnergy, this.energy + (this.cruise ? 30 : 18) * dt);
    const danger = Enemies.engagedNear(this.pos, 1300) || Game.bossActive;
    if (!this.cruise && this.boostHold > 1.0 && !danger) {
      this.cruise = true; this.cruiseV = Math.max(this.speed, 300);
      Sound.play('charge');
      UI.hint('cruise');
    }
    if (this.cruise) {
      if (!wantBoost || brake || danger) { this.cruise = false; if (danger) UI.toast('Cruise drive dropped: hostiles nearby'); }
      else {
        const maxC = 3400 * sm;
        this.cruiseV = Math.min(maxC, this.cruiseV + dt * (500 + this.cruiseV * 0.9));
        let lim = maxC;
        const s = World.cur;
        if (s) {
          for (const b of s.bodies) { const d = this.pos.dist(b.pos) - b.r; lim = Math.min(lim, Math.max(260, (d - 60) * 1.25)); }
          for (const stn of s.stars) { const d = this.pos.dist(stn.pos) - stn.r * 1.5; lim = Math.min(lim, Math.max(300, (d - 100) * 1.25)); }
          for (const stn of s.stations) { const d = this.pos.dist(stn.pos) - 200; lim = Math.min(lim, Math.max(260, d * 1.3)); }
        }
        this.cruiseV = Math.min(this.cruiseV, lim);
        target = this.cruiseV;
      }
    }
    this.speed = damp(this.speed, target, this.cruise ? 2.5 : this.boosting ? 2.6 : brake ? 2.4 : 1.8, dt);
    this.strafe = damp(this.strafe, ((K.KeyD ? 1 : 0) - (K.KeyA ? 1 : 0)) * 70, 5, dt);
    _v1.copy(this.fwd).scale(this.speed).addScaled(this.right, this.strafe);
    const k = 1 - Math.exp(-(this.cruise ? 5 : 3.2) * dt);
    this.vel.lerp(_v1, k);
    // black hole gravity
    const sys = World.cur;
    if (sys && sys.bh) {
      _v2.subVectors(sys.pos, this.pos); const d = _v2.len();
      if (d < 9000) this.vel.addScaled(_v2.normalize(), 1.8e7 / Math.max(d * d, 1e5) * dt);
    }
    this.pos.addScaled(this.vel, dt);
    // ── collisions ──
    World.collideBodies(this.pos, this.r, (b, d, min) => {
      _v2.subVectors(this.pos, b.pos).normalize();
      if (b.bh) {
        this.pos.copy(b.pos).addScaled(_v2, b.r * 6); this.vel.copy(_v2).scale(400);
        UI.toast('The Maw flung you back out. Keep your distance from the event horizon.'); Game.shake(1); return;
      }
      this.pos.copy(b.pos).addScaled(_v2, min);
      const vn = this.vel.dot(_v2); if (vn < 0) this.vel.addScaled(_v2, -vn * 1.4);
      if (this.cruise) this.cruise = false;
      if (b.star && Game.time - (this._hotT || 0) > 3) { this._hotT = Game.time; UI.toast('Too close to the star. Pull away!'); }
      Game.shake(0.15);
    });
    beltCollide(this.pos, this.r, (r, d, min) => {
      _v2.set(this.pos.x - r.x, this.pos.y - r.y, this.pos.z - r.z).normalize();
      this.pos.set(r.x, r.y, r.z).addScaled(_v2, min);
      const vn = this.vel.dot(_v2); if (vn < 0) this.vel.addScaled(_v2, -vn * 1.3);
      if (this.cruise) this.cruise = false;
      if (-vn > 40) { sparks(this.pos, _v2, 10, [2, 1.6, 1.1], 40); Game.shake(0.3); }
    });
    // ── visual banking ──
    this.bank = damp(this.bank, -this.yawR * 0.32 - this.strafe * 0.004, 5, dt);
    _q1.setAxisAngle(AXIS_Z, -this.bank);
    this.visQ.copy(this.q).multiply(_q1);
    // ── shields / regen / timers ──
    this.shieldDelay -= dt;
    if (this.shieldDelay <= 0 && this.shield < this.maxShield) this.shield = Math.min(this.maxShield, this.shield + this.regen * dt);
    if (Game.time - this.lastDmg > 6 && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + (3 + this.maxHp * 0.01) * dt);
    if (this.shield > this.maxShield) this.shield = Math.max(this.maxShield, this.shield - 4 * dt);
    this.invuln -= dt; this.lastStandCd -= dt; this.shieldFlash = Math.max(0, this.shieldFlash - dt * 2.5); this.muzzleFlash -= dt;
    for (const b in this.buffs) if (this.buffs[b] > 0) { this.buffs[b] -= dt; if (this.buffs[b] <= 0) { this.buffs[b] = 0; UI.toast(`${BUFFS[b].name} has worn off`); } }
    this.dmgMul = this.baseDmg * (this.buffs.overdrive > 0 ? 2 : 1);
    this.rateMul = this.baseRate * (this.buffs.rapid > 0 ? 1.8 : 1);
    if (this.hp < this.maxHp * 0.25) Sound.play('alarm');
    // ── weapons ──
    this.updateLock();
    let wantFire = Input.wantFire();
    if (Game.settings.autofire && Input.touchMode && this.lock && this.lockAng < 0.24 && this.lock.pos.dist(this.pos) < 950) wantFire = true;
    this.firing = wantFire && Game.state === 'play' && !this.cruise;
    this.fireWeapons(dt);
    if (Input.keys.KeyF && this.mslCd <= 0) this.fireMissiles();
    // ── trails ──
    this.updateTrails();
    this.stats.time += dt;
  },
  updateAxes() {
    this.fwd.set(0, 0, -1).applyQuat(this.q); this.right.set(1, 0, 0).applyQuat(this.q); this.up.set(0, 1, 0).applyQuat(this.q);
  },
  updateTrails() {
    const now = Game.time;
    for (let i = 0; i < 2; i++) {
      const t = this.trails[i];
      const p = _v1.copy(NOZZLES[i]).applyQuat(this.visQ).add(this.pos);
      t.unshift({ x: p.x, y: p.y, z: p.z, t: now });
      while (t.length > 30 || (t.length && now - t[t.length - 1].t > 0.45)) t.pop();
    }
  },
  updateLock() {
    let best = null, bs = Infinity, ba = 9;
    for (const e of Enemies.list) {
      if (!e.alive || e.untargetable) continue;
      _v1.subVectors(e.pos, this.pos); const d = _v1.len();
      if (d > 1700 || d < 0.5) continue;
      const ang = Math.acos(clamp(_v1.dot(this.fwd) / d, -1, 1));
      if (ang > 0.42) continue;
      const s = ang + d * 0.00022;
      if (s < bs) { bs = s; best = e; ba = ang; }
    }
    this.lock = best; this.lockAng = ba;
  },
  muzzle(local, out) { return out.copy(local).applyQuat(this.q).add(this.pos); },
  aimDir(from, spd, out) {
    out.copy(this.fwd);
    const T = this.lock;
    if (!T) return out;
    const assist = Input.touchMode ? 0.3 : 0.17;
    if (this.lockAng > assist) return out;
    _v2.subVectors(T.pos, from); const d = _v2.len();
    const t = spd > 0 ? d / spd : 0;
    _v2.copy(T.pos).addScaled(T.vel, t * 0.95).sub(from).normalize();
    return out.copy(_v2);
  },
  shoot(from, dir, spd, o) {
    o.owner = 0; o.pos = from;
    o.vel = _v4.copy(dir).scale(spd).addScaled(this.fwd, Math.max(0, this.vel.dot(this.fwd)) * 0.9);
    return Projs.spawn(o);
  },
  fireWeapons(dt) {
    this.fireCd -= dt; this.mslCd -= dt;
    const id = this.cur, lv = this.weapons[id] || 1, st = wstat(id, lv), W = WEAPONS[id];
    if (!this.firing || id !== 'beam') { if (this.beamOn) this.stopBeam(); }
    if (!this.firing) return;
    const from = _v5, dir = _v6;
    if (id === 'beam') { this.updateBeam(dt, st, W); return; }
    if (this.fireCd > 0) return;
    this.stats.shots++;
    switch (id) {
      case 'pulse': {
        this.fireCd = st.cd / this.rateMul;
        const list = st.streams === 2 ? [this.muzzleI++ % 2 ? MUZZLES.L : MUZZLES.R] : st.streams === 3 ? [MUZZLES.L, MUZZLES.R, MUZZLES.N] : [MUZZLES.L, MUZZLES.R, MUZZLES.WL, MUZZLES.WR];
        if (st.streams >= 3) this.fireCd *= 1.35;
        for (const m of list) {
          this.muzzle(m, from); this.aimDir(from, st.spd, dir);
          this.shoot(from, dir, st.spd, { kind: 'bolt', life: st.life, dmg: st.dmg * this.dmgMul, r: 1.2, len: 9, wid: 0.42, col: W.col });
        }
        this.muzzleFlash = 0.05; Sound.play('pulse');
        break;
      }
      case 'scatter': {
        this.fireCd = st.cd / this.rateMul;
        this.muzzle(MUZZLES.N, from); this.aimDir(from, st.spd, dir);
        const tc = Math.tan(st.cone * DEG);
        for (let i = 0; i < st.n; i++) {
          _v3.randomUnit().scale(tc * Math.sqrt(Math.random())); _v3.add(dir).normalize();
          this.shoot(from, _v3, st.spd * rand(0.9, 1.1), { kind: 'pellet', life: st.life * rand(0.85, 1.1), dmg: st.dmg * this.dmgMul, r: 1.4, len: 5, wid: 0.45, col: W.col });
        }
        this.muzzleFlash = 0.08; Sound.play('scatter'); Game.shake(0.05);
        break;
      }
      case 'plasma': {
        this.fireCd = st.cd / this.rateMul;
        this.muzzle(MUZZLES.N, from); this.aimDir(from, st.spd, dir);
        this.shoot(from, dir, st.spd, { kind: 'plasma', life: st.life, dmg: st.dmg * this.dmgMul, r: 2.6, len: 2, wid: 2.4, glow: 9, col: W.col, splash: st.splash, trail: 1, pal: 'plasma' });
        this.muzzleFlash = 0.1; Sound.play('plasma'); Game.shake(0.08);
        break;
      }
      case 'arc': {
        this.fireCd = st.cd / this.rateMul;
        this.muzzle(MUZZLES.N, from);
        const hit = new Set(), pts = [from.clone()];
        let cur = null;
        let best = null, bs = Infinity;
        for (const e of Enemies.list) {
          if (!e.alive || e.untargetable) continue;
          _v1.subVectors(e.pos, this.pos); const d = _v1.len(); if (d > st.range) continue;
          const ang = Math.acos(clamp(_v1.dot(this.fwd) / d, -1, 1)); if (ang > 0.85) continue;
          const s = d * (1 + ang * 2); if (s < bs) { bs = s; best = e; }
        }
        cur = best;
        let n = 0;
        while (cur && n <= st.chains) {
          hit.add(cur); pts.push(cur.pos.clone());
          Enemies.damage(cur, st.dmg * this.dmgMul * (n === 0 ? 1 : 0.85), cur.pos, Math.random() < this.crit);
          sparks(cur.pos, null, 6, W.col, 60);
          n++;
          let nx = null, nd = st.jump;
          for (const e of Enemies.list) { if (!e.alive || hit.has(e) || e.untargetable) continue; const d = e.pos.dist(cur.pos); if (d < nd) { nd = d; nx = e; } }
          cur = nx;
        }
        if (pts.length === 1) pts.push(from.clone().addScaled(this.fwd, 60).addScaled(_v3.randomUnit(), 10));
        Lines.add({ type: 'arc', pts, life: 0.16, max: 0.16, col: W.col });
        this.muzzleFlash = 0.06; Sound.play('arc');
        break;
      }
      case 'rail': {
        this.fireCd = st.cd / this.rateMul;
        this.muzzle(MUZZLES.N, from); this.aimDir(from, 0, dir);
        let len = st.range;
        const s = World.cur;
        if (s) for (const b of s.bodies) { const t = raySphere(from.x, from.y, from.z, dir.x, dir.y, dir.z, b.pos.x, b.pos.y, b.pos.z, b.r); if (t >= 0 && t < len) len = t; }
        Enemies.rayHit(from, dir, len, 2.5, 99, (e, t, part) => {
          _v1.copy(from).addScaled(dir, t);
          Enemies.damage(e, st.dmg * this.dmgMul, _v1, Math.random() < this.crit * 1.5);
          sparks(_v1, dir, 10, W.col, 90);
        });
        Items.rayDamage(from, dir, len, st.dmg * this.dmgMul);
        const end = from.clone().addScaled(dir, len);
        Lines.add({ type: 'rail', a: from.clone(), b: end, life: 0.4, max: 0.4, col: W.col });
        for (let i = 0; i < 18; i++) {
          const t = Math.random() * len; _v1.copy(from).addScaled(dir, t); _v2.randomUnit().scale(rand(4, 12));
          Parts.spawn(_v1.x, _v1.y, _v1.z, _v2.x, _v2.y, _v2.z, rand(0.3, 0.6), 0.5, 0.1, W.col, [0.4, 0.3, 0.1], 1, 1.5, 0, 0.7);
        }
        this.muzzleFlash = 0.12; Sound.play('rail'); Game.shake(0.18);
        break;
      }
    }
  },
  updateBeam(dt, st, W) {
    const from = this.muzzle(MUZZLES.N, _v5), dir = this.aimDir(from, 0, _v6);
    if (!this.beamOn) { this.beamOn = true; Sound.beamOn(true); }
    let len = st.range;
    const s = World.cur;
    if (s) for (const b of s.bodies) { const t = raySphere(from.x, from.y, from.z, dir.x, dir.y, dir.z, b.pos.x, b.pos.y, b.pos.z, b.r); if (t >= 0 && t < len) len = t; }
    let hits = 0, endT = len;
    const tick = st.dps * this.dmgMul * dt;
    Items.rayDamage(from, dir, len, tick);
    Enemies.rayHit(from, dir, len, 2.2, st.pierce, (e, t) => {
      hits++; endT = t;
      Enemies.damage(e, tick, null, false, true);
      const acc = (this.beamAcc.get(e) || 0) + tick; this.beamAcc.set(e, acc);
    });
    this.beamEnd.copy(from).addScaled(dir, hits >= st.pierce ? endT : len);
    this.beamHit = hits > 0;
    this.beamHitT -= dt;
    if (this.beamHitT <= 0) {
      this.beamHitT = 0.22;
      for (const [e, a] of this.beamAcc) if (a > 0.5 && e.alive) DmgNums.show(e.pos, a);
      this.beamAcc.clear();
    }
    if (this.beamHit && Math.random() < 0.7) sparks(this.beamEnd, _v3.copy(dir).negate(), 2, W.col, 70);
    this._beamFrom = from.clone();
    this.muzzleFlash = 0.03;
  },
  stopBeam() { this.beamOn = false; Sound.beamOn(false); this.beamAcc.clear(); },
  fireMissiles() {
    if (!this.alive || Game.state !== 'play' || this.mslCd > 0) return;
    if (this.missiles <= 0) { if (this.mslCd > -1) UI.toast('Out of missiles. Dock at a station or find a missile pack.'); this.mslCd = 1; Sound.play('deny'); return; }
    const n = Math.min(2, this.missiles); this.missiles -= n; this.mslCd = 0.45;
    let tgt = this.lock;
    if (!tgt) { let bd = 1400; for (const e of Enemies.list) { if (!e.alive || e.untargetable) continue; _v1.subVectors(e.pos, this.pos); const d = _v1.len(); if (d < bd && _v1.dot(this.fwd) > 0) { bd = d; tgt = e; } } }
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1;
      const p = _v5.copy(this.pos).addScaled(this.right, side * 1.9).addScaled(this.up, -0.6);
      const v = _v6.copy(this.vel).addScaled(this.right, side * 45).addScaled(this.fwd, 140).addScaled(this.up, rand(-15, 15));
      Projs.spawn({ owner: 0, kind: 'missile', pos: p, vel: v, life: 4.5, dmg: 95 * this.dmgMul, r: 2, len: 3, wid: 0.7, col: [2.4, 1.4, 0.5], splash: 32, target: tgt, turn: 4.2, accel: 800, maxSpd: 760, trail: 1, pal: 'fire' });
    }
    Sound.play('missile');
  },
  useNova() {
    if (!this.alive || Game.state !== 'play') return;
    if (this.nova < 100) { Sound.play('deny'); UI.toast(`Nova bomb charging: ${Math.floor(this.nova)}%`); return; }
    this.nova = 0;
    Waves.add({ owner: 0, c: this.pos.clone(), r: 6, speed: 950, max: 620, dmg: 480 * this.dmgMul, col: [2.2, 1.7, 0.8], th: 0.05 });
    Waves.add({ owner: 0, c: this.pos.clone(), r: 2, speed: 700, max: 480, dmg: 0, col: [0.9, 0.9, 2.4], th: 0.12 });
    explode(this.pos, 10, 'gold', 1.4);
    R.post.flash = Game.settings.shake ? 0.55 : 0.2;
    Sound.play('nova'); Game.shake(1.4);
  },
  addNova(n) { const was = this.nova >= 100; this.nova = Math.min(100, this.nova + n); if (!was && this.nova >= 100) UI.toast('Nova bomb ready. Press <b>X</b> or tap <b>Nova</b>.'); },
  selectWeapon(id) {
    if (!this.weapons[id]) { Sound.play('deny'); UI.toast(`${WEAPONS[id].name} not found yet. Explore planets to find it.`); return; }
    if (this.cur === id) return;
    this.cur = id; this.fireCd = Math.min(this.fireCd, 0.1);
    Sound.play('ui'); UI.weaponsDirty = true;
  },
  cycleWeapon(d) {
    const owned = WORDER.filter((w) => this.weapons[w]);
    if (owned.length < 2) { UI.toast('Find more weapons on planets to swap between them.'); return; }
    let i = owned.indexOf(this.cur);
    i = (i + d + owned.length) % owned.length;
    this.selectWeapon(owned[i]);
    UI.toast(`<b>${WEAPONS[owned[i]].name}</b> Lv ${this.weapons[owned[i]]}`);
  },
  damage(amount, from) {
    if (!this.alive || this.invuln > 0 || this.buffs.aegis > 0 || Game.warping || Game.state !== 'play') return;
    amount *= Game.diff.taken;
    this.lastDmg = Game.time; this.shieldDelay = 2.4;
    let toHull = amount;
    if (this.shield > 0) {
      const a = Math.min(this.shield, amount); this.shield -= a; toHull -= a;
      this.shieldFlash = 1; R.post.hit[0] = 0.25; R.post.hit[1] = 0.55; R.post.hit[2] = 1.0; R.post.hit[3] = Math.max(R.post.hit[3], 0.18);
      Sound.play('phit');
    }
    if (toHull > 0) {
      this.hp -= toHull;
      R.post.hit[0] = 1.0; R.post.hit[1] = 0.12; R.post.hit[2] = 0.1; R.post.hit[3] = Math.max(R.post.hit[3], 0.32);
      Sound.play('hhit'); Game.shake(0.28);
    }
    if (from) UI.hitFrom(from);
    if (this.cruise) this.cruise = false;
    if (this.hp <= 0) {
      if (this.lastStandCd <= 0) {
        this.hp = this.maxHp * 0.45; this.shield = this.maxShield * 0.6; this.invuln = 3.5; this.lastStandCd = 80;
        Waves.add({ owner: 0, c: this.pos.clone(), r: 5, speed: 650, max: 300, dmg: 150 * this.dmgMul, col: [0.8, 1.2, 2.6], th: 0.08 });
        UI.banner('Last stand', 'Emergency shields saved your ship');
        Sound.play('shieldup'); Game.shake(0.8);
      } else this.die();
    }
  },
  die() {
    this.alive = false; this.deadT = 0; this.hp = 0;
    this.stopBeam(); this.cruise = false;
    explode(this.pos, 7, 'fire', 2.2); explode(this.pos, 4, 'gold', 1);
    Sound.play('explode', 4);
    this.stats.deaths++;
    Game.onPlayerDeath();
  },
  heal(frac) { this.hp = Math.min(this.maxHp, this.hp + this.maxHp * frac); },

  draw() {
    if (!this.alive) return;
    R.drawHull(MODELS.player, this.pos, this.visQ, 1, 0, this.buffs.overdrive > 0 ? [1.25, 0.85, 0.8] : null);
  },
  drawFx(fx) {
    if (!this.alive) return;
    const t = Game.time;
    const boost = this.boosting ? 1 : 0, cr = this.cruise ? 1 : 0;
    const col = cr ? [0.9, 1.6, 2.6] : [2.6, 1.7, 0.7];
    for (let i = 0; i < 2; i++) {
      const tr = this.trails[i];
      const n = tr.length;
      for (let j = 0; j < n - 1; j++) {
        const a = tr[j], b = tr[j + 1];
        const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, l = Math.hypot(dx, dy, dz);
        if (l < 0.01) continue;
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, mz = (a.z + b.z) / 2;
        const cd = Math.hypot(mx - R.cam.x, my - R.cam.y, mz - R.cam.z);
        const k = (1 - j / n) * smooth(5, 16, cd);
        if (k < 0.02) continue;
        fx.add(mx, my, mz, dx / l, dy / l, dz / l, l, (0.22 + boost * 0.18 + cr * 0.3) * k + 0.04, col[0], col[1], col[2], 0.65 * k, 0);
      }
      const p = _v1.copy(NOZZLES[i]).applyQuat(this.visQ).add(this.pos);
      const fl = 0.9 + 0.1 * Math.sin(t * 50 + i);
      fx.add(p.x, p.y, p.z, 0, 0, 0, 0, (0.75 + boost * 0.7 + cr * 1.0) * fl, col[0], col[1], col[2], 0.8, 1);
      if (boost || cr) fx.add(p.x, p.y, p.z, 0, 0, 0, 0, 3.2 + cr * 2, col[0] * 0.6, col[1] * 0.6, col[2] * 0.6, 0.55, 3, 0.2, 0, 0);
    }
    if (this.muzzleFlash > 0) {
      const W = WEAPONS[this.cur];
      for (const m of this.cur === 'pulse' ? [MUZZLES.L, MUZZLES.R] : [MUZZLES.N]) {
        const p = this.muzzle(m, _v1);
        fx.add(p.x, p.y, p.z, 0, 0, 0, 0, 1.8, W.col[0], W.col[1], W.col[2], 0.9, 1);
      }
    }
    if (this.beamOn && this._beamFrom) {
      const W = WEAPONS.beam, a = this._beamFrom, b = this.beamEnd;
      _v1.subVectors(b, a); const len = _v1.len(); _v1.scale(1 / Math.max(len, 0.001));
      const fl = 0.85 + 0.15 * Math.sin(t * 60);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, mz = (a.z + b.z) / 2;
      fx.add(mx, my, mz, _v1.x, _v1.y, _v1.z, len, 1.1 * fl, W.col[0], W.col[1], W.col[2], 1, 0);
      fx.add(mx, my, mz, _v1.x, _v1.y, _v1.z, len, 3.2 * fl, W.col[0] * 0.35, W.col[1] * 0.35, W.col[2] * 0.35, 0.6, 1);
      fx.add(b.x, b.y, b.z, 0, 0, 0, 0, this.beamHit ? 7 : 3, W.col[0], W.col[1], W.col[2], 0.8, 3, 0.4, 0, t * 3);
    }
    const sh = Math.max(this.shieldFlash * 0.6, this.buffs.aegis > 0 ? 0.35 : 0, this.invuln > 0 ? 0.12 + 0.08 * Math.sin(t * 10) : 0);
    if (sh > 0.01) {
      const c = this.buffs.aegis > 0 ? [1.6, 1.6, 2.0] : [0.4, 0.9, 2.2];
      fx.add(this.pos.x, this.pos.y, this.pos.z, 0, 0, 0, 0, 5.2, c[0], c[1], c[2], sh * 0.55, 2, 0.04);
      fx.add(this.pos.x, this.pos.y, this.pos.z, 0, 0, 0, 0, 5.2, c[0] * 0.25, c[1] * 0.25, c[2] * 0.25, sh * 0.35, 1);
    }
  },
};

// ───────────────────────────── camera ─────────────────────────────
const Cam = {
  pos: new V3(), q: new Quat(), fov: 68 * DEG, shake: 0, rq: new Quat(), extraFov: 0,
  // Chase framing: the ship sits just above the lower third with the aim point clear in the centre,
  // ~14% of the screen width on a 16:9 display. The camera pulls back further when boosting/cruising.
  DIST: 20, HEIGHT: 5.0, AIM_AHEAD: 60, AIM_UP: 1.5, BASE_FOV: 68,
  // narrow (portrait) screens: widen the view and back off so the ship doesn't fill the width
  aspectK() { const a = R.cssW / Math.max(1, R.cssH); return a >= 1.2 ? 0 : clamp((1.2 - a) / 0.75, 0, 1); },
  offset(out, back) {
    const k = this.aspectK();
    return out.set(0, this.HEIGHT * (1 + 0.25 * k), back * (1 + 0.3 * k));
  },
  aimPoint(out) { return out.set(0, this.AIM_UP, -this.AIM_AHEAD).applyQuat(Player.q).add(Player.pos); },
  snap() {
    const P = Player;
    this.offset(this.pos, this.DIST).applyQuat(P.q).add(P.pos);
    this.aimPoint(_v2);
    this.q.lookRotation(_v2.sub(this.pos).normalize(), _v3.set(0, 1, 0).applyQuat(P.q));
  },
  update(dt) {
    const P = Player;
    const back = this.DIST + (P.boosting ? 3.5 : 0) + (P.cruise ? 6 : 0);
    this.offset(_v1, back).applyQuat(P.q).add(P.pos);
    this.pos.addScaled(P.vel, dt);
    this.pos.lerp(_v1, 1 - Math.exp(-6.5 * dt));
    this.aimPoint(_v2).sub(this.pos).normalize();
    _v3.set(0, 1, 0).applyQuat(P.q);
    _q1.lookRotation(_v2, _v3);
    this.q.slerp(_q1, 1 - Math.exp(-10 * dt));
    const targetFov = this.BASE_FOV + 14 * this.aspectK() + (P.boosting ? 7 : 0) + (P.cruise ? 14 : 0) + this.extraFov;
    this.fov = damp(this.fov, targetFov * DEG, 3, dt);
    this.shake = Math.max(0, this.shake - dt * 2.2);
    this.rq.copy(this.q);
    if (this.shake > 0 && Game.settings.shake) {
      const s = this.shake * this.shake * 0.035;
      _q1.setEuler(rand(-s, s), rand(-s, s), rand(-s, s) * 0.6);
      this.rq.multiply(_q1);
    }
  },
};

