// ───────────────────────────── game director ─────────────────────────────
const SAVE_KEY = 'starlight-voyager-save-v1', SET_KEY = 'starlight-voyager-settings-v1';
const Game = {
  state: 'loading', time: 0, started: false,
  settings: { quality: 'auto', autofire: undefined, invert: false, sens: 1, sfx: 0.8, music: 0.6, shake: true, sound: true },
  diff: { taken: 0.8, inacc: 0.05 },
  hints: {}, uniques: {}, bossesDown: {}, discovered: {}, discoveredSys: {}, home: 'st0',
  zones: new Map(), warping: false, warp: null, autopilot: false, wp: null, bossActive: false,
  patrolT: 45, saveT: 30, dockCd: 0, deadT: 0, prevScreen: null, perf: { acc: 0, n: 0, t: 0, cool: 3 }, titleT: 0, objTarget: null,

  // ─── persistence ───
  loadSettings() {
    try { const s = JSON.parse(localStorage.getItem(SET_KEY) || 'null'); if (s) Object.assign(this.settings, s); } catch (e) { /* storage unavailable */ }
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches && this.settings.shake === true && !this.settings._shakeSet) this.settings.shake = false;
  },
  saveSettings() { try { localStorage.setItem(SET_KEY, JSON.stringify(this.settings)); } catch (e) { /* ignore */ } },
  readSave() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { d = null; }
    if (!d && this._lastSave) d = this._lastSave;
    if (!d && this._hotSave) d = this._hotSave;
    return d;
  },
  saveData() {
    const P = Player;
    return {
      v: 1, level: P.level, xp: P.xp, credits: P.credits, weapons: P.weapons, cur: P.cur, missiles: P.missiles, nova: P.nova, upg: P.upg,
      keys: P.keys, stats: P.stats, uniques: this.uniques, bosses: this.bossesDown, disc: Object.keys(this.discovered), sysd: Object.keys(this.discoveredSys),
      home: this.home, hints: this.hints, t: Date.now(),
    };
  },
  save() {
    if (!this.started) return;
    const d = this.saveData();
    this._lastSave = d;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(d)); } catch (e) { /* storage unavailable: progress lives for this session */ }
  },
  applySave(d) {
    const P = Player;
    P.reset();
    P.level = d.level || 1; P.xp = d.xp || 0; P.credits = d.credits || 0;
    Object.assign(P.weapons, d.weapons || {}); P.cur = d.cur && P.weapons[d.cur] ? d.cur : 'pulse';
    Object.assign(P.upg, d.upg || {}); P.keys = d.keys || []; Object.assign(P.stats, d.stats || {});
    P.missiles = d.missiles ?? 16; P.nova = d.nova || 0;
    this.uniques = d.uniques || {}; this.bossesDown = d.bosses || {}; this.home = d.home || 'st0'; this.hints = d.hints || {};
    this.discovered = {}; for (const id of d.disc || []) this.discovered[id] = 1;
    this.discoveredSys = {}; for (const id of d.sysd || []) this.discoveredSys[id] = 1;
    for (const s of World.systems) { s.discovered = !!this.discoveredSys[s.id]; for (const b of s.bodies) b.discovered = !!this.discovered[b.id]; }
    P.computeStats(); P.hp = P.maxHp; P.shield = P.maxShield; P.energy = P.maxEnergy;
  },
  markUnique(uid) { this.uniques[uid] = 1; },
  chartedCount() { return Object.keys(this.discovered).length; },
  upgPrice(k) { return Math.round(140 * Math.pow(1.48, Player.upg[k])); },
  tunePrice(id) { return 380 * (Player.weapons[id] || 1); },
  buyUpgrade(k) {
    const P = Player, price = this.upgPrice(k);
    if (P.credits < price || P.upg[k] >= UPGRADES[k].max) { Sound.play('deny'); return; }
    P.credits -= price; P.upg[k]++; P.computeStats(); P.hp = P.maxHp; P.shield = P.maxShield; P.energy = P.maxEnergy;
    if (k === 'rack') P.missiles = P.maxMissiles;
    Sound.play('pickup'); UI.renderShop(); this.save();
  },
  buyTune(id) {
    const P = Player, price = this.tunePrice(id);
    if (P.credits < price || P.weapons[id] >= 5) { Sound.play('deny'); return; }
    P.credits -= price; P.weapons[id]++; UI.weaponsDirty = true;
    Sound.play('weapon'); UI.renderShop(); this.save();
  },

  // ─── flow ───
  newGame() {
    this.uniques = {}; this.bossesDown = {}; this.discovered = {}; this.discoveredSys = {}; this.home = 'st0'; this.hints = {};
    for (const s of World.systems) { s.discovered = false; for (const b of s.bodies) b.discovered = false; }
    Player.reset();
    this.beginPlay(true);
  },
  continueGame() {
    const d = this.readSave();
    if (!d) { this.newGame(); return; }
    this.applySave(d);
    this.beginPlay(false);
  },
  beginPlay(fresh) {
    Sound.init(); Sound.resume(); Sound.setOn(this.settings.sound); Sound.setVol(this.settings.sfx, this.settings.music);
    Enemies.clear(); Projs.clear(); Items.clear(); Parts.clear(); Lines.list.length = 0; Waves.list.length = 0;
    for (const z of this.zones.values()) { z.active = false; z.spawnT = -999; z.pickT = -999; }
    this.started = true; this.bossActive = false; this.autopilot = false; this.wp = null; this.warping = false;
    const st = this.station(this.home) || World.systems[0].stations[0];
    World.load(st.sys, true);
    for (const s of World.systems) if (s !== st.sys && s.loaded && s.pos.dist(st.pos) > 44000) World.unload(s);
    Player.alive = true; Player.invuln = 3;
    Player.placeAt(_v1.copy(st.gate).addScaled(st.gateDir, 90), st.gateDir);
    Player.speed = 60; Player.vel.copy(st.gateDir).scale(60);
    this.onSystemLoad(st.sys);
    this.state = 'play';
    UI.show(null); $('hud').hidden = false; UI.applyTouchMode(); UI.weaponsDirty = true;
    UI.syncSettings();
    this.dockCd = 3; this.patrolT = 40;
    const s = st.sys;
    setTimeout(() => UI.banner(s.name, `${s.def.star.cls} · danger ${s.def.danger}`), 400);
    if (fresh) {
      setTimeout(() => UI.hint('start'), 2500);
      setTimeout(() => UI.hint('pickups'), 9000);
      setTimeout(() => UI.hint('cruiseHow'), 17000);
      setTimeout(() => UI.hint('map'), 26000);
    } else UI.toast(`Welcome back, pilot. Level <b>${Player.level}</b> · ${Player.keys.length} / 8 Star Keys`);
    this.save();
  },
  quitToTitle() {
    this.save();
    Player.stopBeam();
    this.state = 'title'; this.started = false;
    $('hud').hidden = true; $('touch').hidden = true;
    UI.show('scr-title'); this.refreshTitle();
    Enemies.clear(); Projs.clear(); Items.clear();
    Sound.setEngine(0, 0, false);
  },
  refreshTitle() { $('btn-continue').hidden = !this.readSave(); $('btn-new').textContent = this.readSave() ? 'New voyage' : 'Launch'; },
  pause() {
    if (this.state !== 'play') return;
    this.state = 'paused'; Player.stopBeam(); this.save();
    UI.show('scr-pause'); UI.pauseTab('ship'); $('touch').hidden = true;
    Sound.setEngine(0, 0, false);
  },
  resume() { if (this.state !== 'paused') return; this.state = 'play'; UI.show(null); UI.applyTouchMode(); },
  openMap() {
    if (this.state !== 'play') return;
    this.state = 'map'; Player.stopBeam();
    UI.mapMode = World.cur && World.curDist < 22000 ? 'sys' : 'gal'; UI.mapSel = null;
    UI.show('scr-map'); $('touch').hidden = true; $('hud').hidden = true;
    UI.renderMap();
    Sound.setEngine(0, 0, false);
  },
  closeMap() { if (this.state !== 'map') return; this.state = 'play'; UI.show(null); $('hud').hidden = false; UI.applyTouchMode(); },
  confirm(title, text, yes, fn) {
    $('cf-title').textContent = title; $('cf-text').textContent = text; $('cf-yes').textContent = yes;
    this.prevScreen = 'scr-title';
    UI.show('scr-confirm');
    $('cf-yes').onclick = () => { UI.show(null); fn(); };
    $('cf-no').onclick = () => UI.show('scr-title');
  },
  setQuality(name) {
    this.settings.quality = name; this.saveSettings();
    const q = name === 'auto' ? this.autoQuality() : name;
    R.setQuality(q);
    R.buildStars(R.q.stars);
    for (const s of World.systems) if (s.loaded) { World.unload(s); World.load(s, false); }
    UI.syncSettings();
  },
  autoQuality() {
    if (Input.touchMode || (window.matchMedia && matchMedia('(pointer: coarse)').matches)) return 'medium';
    let ren = '';
    try { const ext = gl.getExtension('WEBGL_debug_renderer_info'); ren = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : ''; } catch (e) { ren = ''; }
    if (/swiftshader|llvmpipe|software|mali|adreno|powervr/i.test(ren)) return 'low';
    if (/intel|mesa/i.test(ren) && !/arc/i.test(ren)) return 'medium';
    return 'high';
  },

  // ─── stations ───
  station(id) { for (const s of World.systems) for (const st of s.stations) if (st.id === id) return st; return null; },
  dock(st) {
    const P = Player;
    this.state = 'station'; this.home = st.id; this.autopilot = false;
    P.cruise = false; P.stopBeam();
    P.hp = P.maxHp; P.shield = P.maxShield; P.energy = P.maxEnergy; P.missiles = P.maxMissiles;
    Projs.clear(1);
    for (const e of Enemies.list) if (e.pos.dist(st.pos) < 2500 && !e.boss) e.engaged = false;
    $('st-name').textContent = st.name;
    UI.show('scr-station'); UI.renderShop(); $('touch').hidden = true;
    Sound.play('dock'); Sound.setEngine(0, 0, false);
    this.save();
  },
  undock() {
    const st = this.station(this.home);
    this.state = 'play'; UI.show(null); UI.applyTouchMode();
    if (st) { Player.placeAt(_v1.copy(st.gate).addScaled(st.gateDir, 80), st.gateDir); Player.speed = 70; Player.vel.copy(st.gateDir).scale(70); }
    this.dockCd = 3;
  },
  checkDock(dt) {
    this.dockCd -= dt;
    const s = World.cur, P = Player;
    if (!s || !P.alive) { UI.prompt(null); return; }
    let near = null, nd = Infinity;
    for (const st of s.stations) { const d = P.pos.dist(st.gate); if (d < nd) { nd = d; near = st; } }
    if (near && nd < 450 && !this.bossActive) {
      UI.prompt(nd < 260 ? 'Fly through the glowing gate to dock' : null);
      if (nd < 34 && this.dockCd <= 0) this.dock(near);
      if (nd < 1200) UI.hint('station');
    } else UI.prompt(null);
  },

  // ─── zones: enemies & pickups around each world ───
  zone(b) { let z = this.zones.get(b.id); if (!z) { z = { body: b, active: false, spawnT: -999, pickT: -999, lastKill: 0 }; this.zones.set(b.id, z); } return z; },
  onSystemLoad(sys) {
    Items.minerals = Items.minerals.filter((m) => m.sys !== sys);
    const r = new RNG(hashStr(sys.name + 'min') + Math.floor(Math.random() * 1000));
    const add = (pos, rad) => { const m = Items.addMineral(pos, rad, r.int(0, 1)); m.sys = sys; };
    if (sys.def.belt) {
      for (let i = 0; i < 18; i++) { const a = r.range(0, TAU), rr = sys.def.belt.r + r.range(-300, 300); add(new V3(sys.pos.x + Math.cos(a) * rr, sys.pos.y + r.range(-80, 80), sys.pos.z + Math.sin(a) * rr), r.range(14, 26)); }
    }
    for (const b of sys.planets) if (r.chance(0.5)) for (let i = 0; i < 3; i++) add(b.pos.clone().addScaled(_v1.randomUnit(() => r.next()), b.r + r.range(500, 1300)), r.range(12, 22));
  },
  updateZones() {
    const P = Player;
    for (const s of World.systems) {
      if (!s.loaded) continue;
      for (const b of s.bodies) {
        const z = this.zone(b), d = P.pos.dist(b.pos);
        if (!z.active && d < b.zoneR + 900 && P.alive && !this.warping) this.activate(z);
        else if (z.active && d > b.zoneR + 3400) this.deactivate(z);
      }
    }
  },
  activate(z) {
    z.active = true;
    const b = z.body, s = b.sys, D = s.def.danger;
    // enemies (respawn after 90 s)
    if (this.time - z.spawnT > 90 && Enemies.count() < 38) {
      z.spawnT = this.time;
      const pool = SYS_POOLS[s.id];
      const safeHome = b.station && s.id === 0;
      let squads = safeHome ? 1 : 1 + (D >= 3 ? 1 : 0) + (Math.random() < 0.5 ? 1 : 0) - (b.parent ? 1 : 0);
      squads = Math.max(1, squads);
      for (let k = 0; k < squads; k++) {
        const type = safeHome ? 'drone' : pick(pool);
        const big = type === 'carrier' || type === 'gunship';
        const n = big ? 1 + (Math.random() < 0.3 ? 1 : 0) : type === 'lancer' || type === 'jelly' || type === 'turret' ? randi(2, 3) : randi(3, 5);
        const group = Math.random();
        const c = b.pos.clone().addScaled(_v1.randomUnit(), b.r + rand(450, 1100));
        for (let i = 0; i < n; i++) {
          const p = c.clone().addScaled(_v2.randomUnit(), 25 + i * 8);
          if (type === 'turret') {
            const a = rand(0, TAU), rr = b.r + rand(160, 420);
            Enemies.spawn('turret', D, b.pos, { zone: z, group, anchor: { body: b, a, r: rr, y: rand(-120, 120), w: rand(0.02, 0.05) } });
          } else Enemies.spawn(type, D + (Math.random() < 0.25 ? 1 : 0), p, { zone: z, group, elite: !safeHome && Math.random() < 0.08, patrolR: c.dist(b.pos) - b.r + rand(-100, 100) });
        }
      }
    }
    // pickups (consumables respawn after 120 s; uniques until collected)
    const respawnOk = this.time - z.pickT > 120;
    if (respawnOk) {
      z.pickT = this.time;
      const nC = b.parent ? 6 : randi(12, 20);
      for (let i = 0; i < nC; i++) Items.spawn('crystal', b.pos, { zone: z, value: 6 + D * 3 + randi(0, 6), orbit: { body: b, r: b.r + rand(150, 750), a: rand(0, TAU), w: rand(0.015, 0.04) * (Math.random() < 0.5 ? -1 : 1), y: rand(-160, 160) } });
      const nI = randi(2, 4);
      for (let i = 0; i < nI; i++) Items.spawn(pick(['repair', 'shield', 'energy', 'missiles', 'repair']), b.pos, { zone: z, orbit: { body: b, r: b.r + rand(200, 600), a: rand(0, TAU), w: rand(0.01, 0.03), y: rand(-120, 120) } });
      const nK = Math.random() < 0.7 ? randi(1, 2) : 0;
      for (let i = 0; i < nK; i++) Items.spawn('crate', b.pos, { zone: z, orbit: { body: b, r: b.r + rand(300, 900), a: rand(0, TAU), w: rand(0.005, 0.015), y: rand(-200, 200) } });
      if (Math.random() < 0.25) Items.spawn('power', b.pos, { zone: z, sub: pick(Object.keys(BUFFS)), orbit: { body: b, r: b.r + rand(250, 600), a: rand(0, TAU), w: 0.02, y: rand(-100, 100) } });
    }
    const uniq = (kind, uid, sub) => {
      if (this.uniques[uid]) return;
      if (Items.list.some((p) => p.uid === uid && p.alive)) return;
      const r = new RNG(hashStr(uid));
      Items.spawn(kind, b.pos, { zone: z, uid, sub, orbit: { body: b, r: b.r + 70 + r.range(0, 60), a: r.range(0, TAU), w: 0.012, y: r.range(-30, 30) } });
    };
    if (b.def.weapon) uniq('weapon', b.id + '/weapon', b.def.weapon);
    if (b.def.module) uniq('module', b.id + '/module');
    const h = hashStr(b.id) % 7;
    uniq(h < 3 ? 'module' : h < 6 ? 'core' : 'power', b.id + '/bonus', h >= 6 ? pick(Object.keys(BUFFS)) : null);
  },
  deactivate(z) {
    z.active = false;
    for (const e of Enemies.list) if (e.zone === z && !e.boss && !(e.engaged && e.pos.dist(Player.pos) < 2500)) e.alive = false;
    for (const p of Items.list) if (p.zone === z && !p.magnet) p.alive = false;
  },
  updatePatrols(dt) {
    const s = World.cur, P = Player;
    if (!s || World.curDist > 18000 || this.warping || P.cruise || !P.alive || this.bossActive) return;
    this.patrolT -= dt;
    if (this.patrolT > 0) return;
    this.patrolT = rand(55, 90);
    for (const st of s.stations) if (st.pos.dist(P.pos) < 2500) return;
    if (Enemies.count() > 18) return;
    const pool = SYS_POOLS[s.id], type = pick(pool.filter((t) => t !== 'turret'));
    const n = type === 'carrier' ? 1 : type === 'gunship' ? 2 : randi(3, 5);
    const c = P.pos.clone().addScaled(P.fwd, rand(800, 1100)).addScaled(_v1.randomUnit(), 250);
    const group = Math.random();
    for (let i = 0; i < n; i++) Enemies.spawn(type, s.def.danger, c.clone().addScaled(_v2.randomUnit(), 30), { group, home: c.clone() });
    UI.toast(`${ETYPES[type].name} patrol on your scanner`);
  },
  // drifting caches and roaming patrols between the stars
  deepT: 12,
  updateDeepSpace(dt) {
    this.deepT -= dt;
    if (this.deepT > 0) return;
    this.deepT = rand(16, 28);
    const P = Player, near = World.cur, D = near ? near.def.danger : 1;
    const c = P.pos.clone().addScaled(P.fwd, P.cruise ? rand(5000, 7000) : rand(1200, 1800)).addScaled(_v1.randomUnit(), 300);
    const crate = Items.spawn('crate', c, { life: 150 }); crate.beacon = true;
    for (let i = 0; i < 8; i++) Items.spawn('crystal', c.clone().addScaled(_v1.randomUnit(), rand(20, 90)), { value: 8 + D * 3, life: 150 });
    if (Math.random() < 0.5) Items.spawn(pick(['repair', 'shield', 'energy', 'missiles', 'power']), c.clone().addScaled(_v1.randomUnit(), 60), { life: 150, sub: pick(Object.keys(BUFFS)) });
    if (Math.random() < 0.35 && Enemies.count() < 14) {
      const type = pick(['drone', 'raider', 'spiker', 'wasp']), group = Math.random();
      for (let i = 0; i < randi(3, 4); i++) Enemies.spawn(type, Math.max(1, D - 1), c.clone().addScaled(_v1.randomUnit(), rand(80, 160)), { group, home: c.clone() });
    }
    UI.toast('Drifting supply cache detected ahead');
  },
  // ─── bosses ───
  updateBoss() {
    const P = Player, s = World.cur;
    if (Enemies.boss && Enemies.boss.alive) {
      this.bossActive = true;
      const B = Enemies.boss;
      if (!P.alive || B.pos.dist(P.pos) > 4200 && !B.dying) {
        if (P.alive) UI.toast(`${B.name} lost track of you`);
        B.alive = false; Enemies.boss = null; this.bossActive = false; Sound.bossMode = false;
        for (const e of Enemies.list) if (e.owner === B) e.alive = false;
      }
      return;
    }
    this.bossActive = false; Sound.bossMode = false;
    if (!s || !P.alive || this.warping) return;
    const bd = s.def.boss;
    if (this.bossesDown[bd.key]) return;
    let arena = null;
    if (bd.planet) { const b = s.bodies.find((x) => x.name === bd.planet); if (b && P.pos.dist(b.pos) < b.zoneR) arena = { pos: b.pos, zone: this.zone(b), body: b }; }
    else if (s.bh && P.pos.dist(s.pos) < 7000) {
      if (P.keys.length < 8) { if (!this._sealT || this.time - this._sealT > 20) { this._sealT = this.time; UI.banner('The seal holds', `Defeat the eight guardians first (${P.keys.length} / 8 Star Keys)`, true); } return; }
      arena = { pos: s.pos, zone: null };
    }
    if (!arena) return;
    _v1.subVectors(P.pos, arena.pos).normalize();
    const pos = arena.body ? arena.pos.clone().addScaled(_v1, arena.body.r + 650).add(new V3(0, 120, 0)) : P.pos.clone().addScaled(P.fwd, 700);
    const B = new Boss(bd.key, arena, pos);
    Enemies.list.push(B); Enemies.boss = B; this.bossActive = true;
    UI.banner('Guardian detected', B.name, true);
    Sound.play('boss'); Sound.bossMode = true; Sound.chordI = 0;
    this.autopilot = false; P.cruise = false;
    UI.hint('boss');
  },
  onBossDefeated(B) {
    const P = Player;
    this.bossesDown[B.key] = 1; P.stats.bosses++;
    Enemies.boss = null; this.bossActive = false; Sound.bossMode = false;
    UI.banner('Guardian defeated', B.name + ' has fallen');
    P.addXp(900 * B.lvl);
    Items.spawn('relic', B.pos, { sub: B.key, uid: 'key/' + B.key, vel: new V3(0, 10, 0) });
    Items.spawn('core', B.pos, { vel: _v1.randomUnit().scale(40), life: 300 });
    Items.spawn('module', B.pos, { vel: _v1.randomUnit().scale(40), life: 300 });
    Items.burst('crystal', B.pos, 30, 10 + B.lvl * 8, 90);
    this.save();
    if (B.key === 'sovereign') setTimeout(() => this.victory(), 5000);
  },
  victory() {
    const P = Player;
    this.state = 'win'; $('touch').hidden = true;
    $('win-stats').innerHTML = [['Pilot level', P.level], ['Enemies destroyed', fmt(P.stats.kills)], ['Worlds charted', this.chartedCount()], ['Minutes flown', Math.floor(P.stats.time / 60)]]
      .map(([k, v]) => `<div class="stat"><span class="v">${v}</span><span class="k">${k}</span></div>`).join('');
    UI.show('scr-win');
  },
  // ─── discovery & objectives ───
  checkDiscovery() {
    const s = World.cur, P = Player;
    if (!s || !P.alive) return;
    if (!s.discovered && World.curDist < 20000) {
      s.discovered = true; this.discoveredSys[s.id] = 1;
      if (this.time > 3) UI.banner(s.name, `${s.def.star.cls} · danger ${s.def.danger}`);
      P.addXp(80 * s.def.danger); this.save();
    }
    for (const b of s.bodies) {
      if (b.discovered) continue;
      if (P.pos.dist(b.pos) < b.r + 1500) {
        b.discovered = true; this.discovered[b.id] = 1;
        UI.discover(b); Sound.play('discover');
        P.addXp(50 + 35 * s.def.danger);
        if (this.wp && this.wp.ref === b && !this.autopilot) this.wp = null;
        this.saveT = Math.min(this.saveT, 5);
      }
    }
  },
  objective() {
    const P = Player, s = World.cur;
    this.objTarget = null;
    if (Enemies.boss && Enemies.boss.alive) return { html: `Defeat <b>${Enemies.boss.name}</b>` };
    if (P.keys.length >= 8 && !this.bossesDown.sovereign) { const maw = World.systems[8]; this.objTarget = maw; return { html: 'All eight Star Keys found. Enter <b>The Maw</b> and face the Void Sovereign' }; }
    if (!s || World.curDist > 22000) { const n = this.nextSystem(); this.objTarget = n; return { html: `Head for <b>${n ? n.name : 'a star'}</b> or open the map to warp` }; }
    const D = s.def, down = this.bossesDown[D.boss.key];
    const unch = s.bodies.filter((b) => !b.discovered);
    const wsig = s.bodies.find((b) => b.def.weapon && !this.uniques[b.id + '/weapon']);
    if (wsig) { this.objTarget = wsig; return { html: `Weapon signal near <b>${wsig.name}</b>` }; }
    const bp = D.boss.planet ? s.bodies.find((b) => b.name === D.boss.planet) : null;
    if (!down && bp && (s.bodies.length - unch.length >= 3 || P.level >= 3 + D.danger * 2)) { this.objTarget = bp; return { html: `Defeat the guardian <b>${D.boss.name}</b> at ${bp.name}` }; }
    if (unch.length) {
      let n = unch[0], nd = Infinity; for (const b of unch) { const d = b.pos.dist(P.pos); if (d < nd) { nd = d; n = b; } }
      this.objTarget = n;
      return { html: `Chart ${s.name}: <b>${s.bodies.length - unch.length} / ${s.bodies.length}</b> worlds · next <b>${n.name}</b>` };
    }
    if (!down && bp) { this.objTarget = bp; return { html: `Defeat the guardian <b>${D.boss.name}</b> at ${bp.name}` }; }
    const n = this.nextSystem();
    if (n) { this.objTarget = n; return { html: `${s.name} is liberated. Open the <b>map</b> and warp to <b>${n.name}</b>` }; }
    return { html: 'The galaxy is yours to wander' };
  },
  nextSystem() {
    const left = World.systems.filter((x) => !this.bossesDown[x.def.boss.key] && x.def.danger < 9);
    left.sort((a, b) => a.def.danger - b.def.danger);
    return left[0] || null;
  },
  setWaypoint(t) { this.wp = t ? { ref: t } : null; },
  waypoint() {
    let t = this.wp ? this.wp.ref : this.objTarget;
    if (!t) return null;
    if (t instanceof SystemRT) { if (World.cur === t && World.curDist < 20000 && !this.wp) return null; return { key: 'sys' + t.id, pos: t.pos, name: t.name, r: 6000 }; }
    if (t instanceof PlanetRT) return { key: t.id, pos: t.pos, name: t.name, r: t.r };
    return null;
  },
  autopilotSteer() {
    const w = this.waypoint(), P = Player;
    if (!w) { this.autopilot = false; return null; }
    const d = w.pos.dist(P.pos);
    if (d < w.r + 1400) { this.autopilot = false; UI.toast(`Arrived at <b>${w.name}</b>`); if (this.wp) this.wp = null; return null; }
    if (Enemies.engagedNear(P.pos, 1300)) { this.autopilot = false; UI.toast('Autopilot off: hostiles engaging'); return null; }
    _v3.subVectors(w.pos, P.pos).normalize();
    _q1.copy(P.q).conjugate(); _v3.applyQuat(_q1);
    return { sx: clamp(Math.atan2(_v3.x, -_v3.z) * 2.2, -1, 1), sy: clamp(Math.atan2(_v3.y, Math.hypot(_v3.x, _v3.z)) * 2.2, -1, 1) };
  },

  // ─── warp travel ───
  canWarp() { return Player.alive && !this.warping && !this.bossActive && !Enemies.engagedNear(Player.pos, 1500); },
  startWarp(sys) {
    if (!this.canWarp()) { Sound.play('deny'); return; }
    this.closeMap();
    this.warping = true; this.autopilot = false; this.wp = null;
    this.warp = { sys, t: 0, phase: 'spool' };
    Player.cruise = false; Player.stopBeam();
    Sound.play('warp');
    UI.banner('Warp drive engaged', 'Destination: ' + sys.name);
  },
  updateWarp(dt) {
    const W = this.warp, P = Player;
    W.t += dt;
    const dir = _v3.subVectors(W.sys.pos, P.pos).normalize();
    if (W.phase === 'spool') {
      _q1.lookRotation(dir, AXIS_Y);
      P.q.slerp(_q1, 1 - Math.exp(-2.6 * dt)); P.updateAxes(); P.visQ.copy(P.q);
      P.vel.lerp(_v1.copy(P.fwd).scale(140), 1 - Math.exp(-2 * dt));
      P.pos.addScaled(P.vel, dt);
      Cam.extraFov = -8 * Math.min(1, W.t / 1.6);
      if (W.t > 1.8) { W.phase = 'jump'; W.t = 0; }
    } else if (W.phase === 'jump') {
      const v = 2500 + W.t * W.t * 40000;
      P.vel.copy(P.fwd).scale(v); P.pos.addScaled(P.vel, dt);
      Cam.extraFov = 45 * Math.min(1, W.t / 1.0);
      R.post.flash = smooth(0.8, 1.35, W.t) * 0.95; R.post.ab = 0.025 * Math.min(1, W.t);
      if (W.t > 1.4) {
        const s = W.sys, st = s.stations[0];
        World.load(s, true);
        const out = _v2.subVectors(st.pos, s.bh ? s.pos : s.starPos).normalize();
        const arr = st.pos.clone().addScaled(out, 1700).add(new V3(0, 220, 0));
        _v4.subVectors(st.pos, arr).normalize();
        Player.placeAt(arr, _v4);
        World.update(0.001, Player.pos);
        Enemies.list = Enemies.list.filter((e) => e.pos.dist(arr) < 5000);
        Items.list = Items.list.filter((p) => p.pos.dist(arr) < 8000);
        for (const z of this.zones.values()) if (z.active && z.body.sys !== s) z.active = false;
        W.phase = 'arrive'; W.t = 0;
        Sound.play('warpout');
        Game.onSystemLoad(s);
      }
    } else {
      R.post.flash = Math.max(0, 0.95 - W.t * 1.1); R.post.ab = Math.max(0, 0.025 - W.t * 0.02);
      Cam.extraFov = 45 * Math.max(0, 1 - W.t / 1.3);
      P.speed = lerp(2600, 90, smooth(0, 1.6, W.t));
      P.vel.copy(P.fwd).scale(P.speed); P.pos.addScaled(P.vel, dt);
      if (W.t > 1.7) {
        this.warping = false; this.warp = null; R.post.ab = 0; Cam.extraFov = 0;
        const s = W.sys;
        UI.banner(s.name, `${s.def.star.cls} · danger ${s.def.danger}`);
        if (s.def.danger > Player.level / 2 + 2) UI.toast(`Careful: ${s.name} is rated danger ${s.def.danger}. Upgrade at stations if fights get rough.`, 6000);
      }
    }
    P.updateTrails();
  },

  // ─── death ───
  onPlayerDeath() {
    this.deadT = 0; this.autopilot = false;
    Player.stopBeam();
  },
  respawn() {
    if (Player.alive) return;
    const st = this.station(this.home) || World.systems[0].stations[0];
    const P = Player;
    World.load(st.sys, true);
    P.alive = true; P.hp = P.maxHp; P.shield = P.maxShield; P.energy = P.maxEnergy; P.missiles = Math.max(P.missiles, Math.round(P.maxMissiles / 2));
    P.invuln = 4;
    P.placeAt(_v1.copy(st.gate).addScaled(st.gateDir, 90), st.gateDir);
    World.update(0.001, P.pos);
    Projs.clear(1);
    for (const e of Enemies.list) { if (e.pos.dist(P.pos) < 3000) e.engaged = false; }
    if (Enemies.boss) { Enemies.boss.alive = false; Enemies.boss = null; this.bossActive = false; Sound.bossMode = false; }
    Enemies.list = Enemies.list.filter((e) => e.alive && e.pos.dist(P.pos) < 6000);
    this.onSystemLoad(st.sys);
    this.state = 'play'; UI.show(null); UI.applyTouchMode();
    UI.toast(`Ship rebuilt at <b>${st.name}</b>. Every weapon and upgrade is intact.`);
    this.dockCd = 3;
  },

  // ─── input ───
  onKey(code) {
    const st = this.state;
    if (st === 'play') {
      if (code === 'Escape' || code === 'KeyP') this.pause();
      else if (code === 'KeyM' || code === 'Tab') this.openMap();
      else if (code.startsWith('Digit')) { const i = +code.slice(5) - 1; if (WORDER[i]) Player.selectWeapon(WORDER[i]); }
      else if (code === 'KeyR') Player.cycleWeapon(1);
      else if (code === 'KeyX') Player.useNova();
      else if (code === 'KeyF') Player.fireMissiles();
    } else if (st === 'paused') { if (code === 'Escape' || code === 'KeyP') this.resume(); }
    else if (st === 'map') { if (code === 'Escape' || code === 'KeyM' || code === 'Tab') this.closeMap(); }
    else if (st === 'station') { if (code === 'Escape' || code === 'Enter') this.undock(); }
    else if (st === 'dead') { if (code === 'Enter' || code === 'Space') this.respawn(); }
  },
  shake(a) { if (this.settings.shake) Cam.shake = Math.min(1.6, Cam.shake + a); },

  // ─── main update ───
  update(dt) {
    const P = Player;
    this.time += dt;
    if (this.warping) this.updateWarp(dt);
    else if (P.alive) P.update(dt);
    World.update(dt, P.pos);
    if (!this.warping) {
      this.updateZones(); this.checkDiscovery(); this.updateBoss(); this.updatePatrols(dt); this.checkDock(dt);
    }
    if (!this.warping && P.alive && World.curDist > 22000) this.updateDeepSpace(dt);
    Enemies.update(dt); Projs.update(dt); Items.update(dt); Lines.update(dt); Waves.update(dt); Parts.update(dt);
    Cam.update(dt);
    if (!P.alive) {
      this.deadT += dt;
      if (this.deadT > 2.4 && this.state === 'play') {
        const cs = World.cur && World.curDist < 25000 && World.cur.stations[0];
        if (cs) this.home = cs.id;
        this.state = 'dead'; $('dead-where').textContent = (this.station(this.home) || World.systems[0].stations[0]).name; UI.show('scr-dead'); $('touch').hidden = true;
        this.autoRespawnT = 8;
      }
    }
    if (this.state === 'dead') { this.autoRespawnT -= dt; if (this.autoRespawnT <= 0) this.respawn(); }
    this.saveT -= dt;
    if (this.saveT <= 0) { this.saveT = 40; this.save(); }
    const engaged = Enemies.engagedNear(P.pos, 1600) || this.bossActive;
    Sound.combat = damp(Sound.combat, engaged ? 1 : 0, engaged ? 2 : 0.4, dt);
    Sound.setEngine(clamp(P.vel.len() / 400, 0, 1), P.boosting || P.cruise ? 1 : 0, P.alive && this.state === 'play');
  },
  updatePost(dt) {
    const pp = R.post;
    pp.hit[3] = Math.max(0, pp.hit[3] - dt * 1.4);
    if (!this.warping) { pp.flash = Math.max(0, pp.flash - dt * 1.6); pp.ab = Player.cruise ? damp(pp.ab, 0.006, 2, dt) : Math.max(0, pp.ab - dt * 0.02); }
    if (!this.settings.shake) { pp.flash = Math.min(pp.flash, 0.25); }
  },

  // ─── rendering ───
  render() {
    R.resize(false);
    let cpos = Cam.pos, cq = Cam.rq, fov = Cam.fov;
    if (this.state === 'title' || this.state === 'loading') { cpos = this.titleCam.pos; cq = this.titleCam.q; fov = 62 * DEG; }
    R.setCamera(cpos, cq, fov);
    R.fx.begin(); R.fxTop.begin();
    World.addFx();
    const warpK = this.warping && this.warp.phase === 'jump' ? Math.min(1, this.warp.t / 0.8) : this.warping && this.warp.phase === 'arrive' ? Math.max(0, 1 - this.warp.t / 1.4) : 0;
    Dust.draw(R.fx, this.state === 'title' ? this.titleCam.vel : Player.vel, warpK);
    Parts.draw(R.fx); Projs.draw(R.fx); Lines.draw(R.fx); Waves.draw(R.fx);
    Enemies.drawFx(R.fx); Items.drawFx(R.fx);
    if (this.state !== 'title') Player.drawFx(R.fx);
    else this.titleShipFx(R.fx);
    R.render({
      opaque: () => {
        World.drawOpaque(); Items.draw(); Enemies.draw();
        if (this.state === 'title') R.drawHull(MODELS.player, this.titleCam.ship, this.titleCam.shipQ, 1);
        else Player.draw();
      },
      transparent: () => World.drawTransparent(),
    });
  },
  // title screen: slow orbit around the home world with the ship gliding past
  titleCam: { pos: new V3(), q: new Quat(), vel: new V3(), ship: new V3(), shipQ: new Quat(), a: 0 },
  updateTitle(dt) {
    this.titleT += dt; R.time += dt; this.time += dt;
    const home = World.systems[0].bodies.find((b) => b.name === 'Verdigris');
    World.update(dt, home.pos);
    const T = this.titleCam;
    T.a += dt * 0.012;
    const toStar = _v1.subVectors(World.systems[0].starPos, home.pos).normalize();
    const side = _v2.crossVectors(toStar, AXIS_Y).normalize();
    const ang = 0.9 + Math.sin(T.a) * 0.35;
    const dir = _v3.copy(toStar).scale(Math.cos(ang)).addScaled(side, Math.sin(ang)).normalize();
    dir.y = 0.16; dir.normalize();
    const prev = T.pos.clone();
    T.pos.copy(home.pos).addScaled(dir, home.r * 2.25);
    T.vel.subVectors(T.pos, prev).scale(1 / Math.max(dt, 0.001));
    if (T.vel.len() > 5000) T.vel.set(0, 0, 0);
    const look = _v4.copy(home.pos).addScaled(side, home.r * 0.55);
    T.q.lookRotation(_v5.subVectors(look, T.pos).normalize(), AXIS_Y);
    const f = _v5.set(0, 0, -1).applyQuat(T.q), r = _v6.set(1, 0, 0).applyQuat(T.q);
    const wide = R.cssW / R.cssH;
    T.ship.copy(T.pos).addScaled(f, 34).addScaled(r, (wide > 1.2 ? 3.5 : 0) + Math.sin(this.titleT * 0.3) * 1.2).add(_v1.set(0, -7.5 + Math.sin(this.titleT * 0.5) * 0.8, 0));
    _q1.lookRotation(_v2.copy(r).scale(-0.35).add(f).normalize(), AXIS_Y);
    _q2.setAxisAngle(AXIS_Z, 0.18 + Math.sin(this.titleT * 0.4) * 0.08);
    T.shipQ.copy(_q1).multiply(_q2);
    Parts.update(dt);
  },
  titleShipFx(fx) {
    const T = this.titleCam;
    for (const n of NOZZLES) {
      const p = _v1.copy(n).applyQuat(T.shipQ).add(T.ship);
      fx.add(p.x, p.y, p.z, 0, 0, 0, 0, 1.3, 2.6, 1.7, 0.7, 0.9, 1);
      _v2.set(0, 0, 1).applyQuat(T.shipQ);
      fx.add(p.x + _v2.x * 3, p.y + _v2.y * 3, p.z + _v2.z * 3, _v2.x, _v2.y, _v2.z, 6, 0.35, 2.6, 1.7, 0.7, 0.6, 0);
    }
  },

  frame(now) {
    requestAnimationFrame((t) => this.frame(t));
    let dt = (now - (this._last || now)) / 1000; this._last = now;
    if (!(dt > 0)) dt = 0.016;
    // dynamic resolution
    const pf = this.perf; pf.acc += dt; pf.n++; pf.t += dt; pf.cool -= dt;
    if (pf.t > 1.5) {
      const avg = pf.acc / pf.n; pf.acc = 0; pf.n = 0; pf.t = 0;
      if (pf.cool <= 0 && this.state === 'play') {
        if (avg > 0.026 && R.dynScale > 0.55) { R.dynScale = Math.max(0.55, R.dynScale - 0.1); R.resize(true); pf.cool = 3; pf.slow = 0; }
        else if (avg > 0.03 && R.dynScale <= 0.55 && R.qName !== 'low' && this.settings.quality === 'auto') {
          pf.slow = (pf.slow || 0) + 1;
          if (pf.slow >= 3) { pf.slow = 0; this.setQuality('auto'); R.setQuality(R.qName === 'high' ? 'medium' : 'low'); R.buildStars(R.q.stars); UI.toast(`Graphics set to <b>${R.q.label}</b> for smoother flying. Change it any time in Settings.`); pf.cool = 6; }
        }
        else if (avg < 0.0145 && R.dynScale < 1) { R.dynScale = Math.min(1, R.dynScale + 0.05); R.resize(true); pf.cool = 4; }
      }
    }
    dt = Math.min(dt, 0.05);
    Input.pollPad();
    try {
      if (this.state === 'play' || this.state === 'dead') this.update(dt);
      else if (this.state === 'title') this.updateTitle(dt);
      else { World.update(0, Player.pos); Cam.update(0); }
      this.updatePost(dt);
      if (this.state === 'play' || this.state === 'dead') UI.update(dt);
      this.render();
    } catch (err) {
      console.error(err);
      if (!this._errShown) { this._errShown = true; UI.toast && UI.toast('Something went wrong in this frame. The game will keep trying.'); }
    }
  },
};

// ───────────────────────────── boot ─────────────────────────────
function fatal(msg) {
  $('loading').hidden = true;
  if (msg) $('fatal-text').textContent = msg;
  $('fatal').hidden = false;
}
function boot(hotData) {
  if (hotData && hotData.save) Game._hotSave = hotData.save;
  if (!glInit()) { fatal(); return; }
  Game.loadSettings();
  const testMode = location.hash.includes('test');
  if (testMode) { for (const k in QUALITY) { QUALITY[k].planetTex = 512; QUALITY[k].sky = 256; QUALITY[k].msaa = 0; } }
  const steps = [
    ['Calibrating instruments', () => { UI.init(); Input.init(); Projs.init(); Dust.init(); DmgNums.init(); }],
    ['Building the fleet', () => { const q = Game.settings.quality === 'auto' || !QUALITY[Game.settings.quality] ? Game.autoQuality() : Game.settings.quality; R.init(q); buildModels(); R.resize(true); }],
    ['Painting the nebulae', () => { const home = new V3(...GALAXY[0].pos); R.bakeSky(R.q.sky, home.negate().normalize(), [3.1, 7.7, 1.3]); }],
    ['Charting the galaxy', () => { World.build(); World.onLoad = (s) => Game.onSystemLoad(s); document.querySelector('.title-wrap .eyebrow').textContent = `${World.systems.length} star systems · ${World.allBodies().length} worlds`; }],
    ['Forming planets', () => { World.load(World.systems[0], true); World.update(0.001, World.systems[0].stations[0].pos); }],
  ];
  let i = 0;
  const bar = $('ld-bar'), txt = $('ld-text');
  const next = () => {
    if (i >= steps.length) return done();
    const [label, fn] = steps[i];
    txt.textContent = label;
    bar.style.width = Math.round(i / steps.length * 100) + '%';
    setTimeout(() => {
      try { fn(); } catch (e) { console.error(e); fatal('The game failed to start: ' + (e && e.message ? e.message : e)); return; }
      i++; next();
    }, 30);
  };
  const done = () => {
    bar.style.width = '100%';
    if (Input.touchMode && Game.settings.autofire === undefined) Game.settings.autofire = true;
    if (Game.settings.autofire === undefined) Game.settings.autofire = false;
    $('opt-q-title').value = Game.settings.quality;
    UI.syncSettings();
    Game.state = 'title';
    $('loading').hidden = true;
    UI.show('scr-title'); Game.refreshTitle();
    $('rotate-hint').hidden = !(Input.touchMode && innerHeight > innerWidth);
    Game._last = performance.now();
    requestAnimationFrame((t) => Game.frame(t));
    window.__ready = true;
    if (testMode) {
      Game.perf.cool = 1e9;
      window.__G = { Game, Player, World, Enemies, Items, Projs, R, UI, Input, Parts, Cam, V3, Quat, Sound, BOSSES, WEAPONS, ETYPES, Boss,
        sim(sec, dt = 1 / 30) { for (let t = 0; t < sec; t += dt) { if (Game.state === 'play' || Game.state === 'dead') Game.update(dt); Game.updatePost(dt); } if (Game.state === 'play' || Game.state === 'dead') UI.update(dt); return Game.state; } };
    }
  };
  // title screen buttons
  $('btn-new').addEventListener('click', () => {
    Sound.init(); Sound.resume();
    if (Game.readSave()) Game.confirm('Start a new voyage?', 'This replaces your saved progress: level, weapons, upgrades and Star Keys.', 'Start over', () => Game.newGame());
    else Game.newGame();
  });
  $('btn-continue').addEventListener('click', () => { Sound.init(); Sound.resume(); Game.continueGame(); });
  $('btn-howto').addEventListener('click', () => { Sound.init(); Sound.play('ui'); Game.prevScreen = 'scr-title'; UI.show('scr-howto'); });
  $('opt-q-title').addEventListener('change', (e) => Game.setQuality(e.target.value));
  $('btn-snd-title').addEventListener('click', () => { Game.settings.sound = !Game.settings.sound; Sound.init(); Sound.setOn(Game.settings.sound); Game.saveSettings(); UI.syncSettings(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (Game.state === 'play') Game.pause(); Game.save(); } });
  window.addEventListener('pagehide', () => Game.save());
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); fatal('The graphics context was lost. Reload the page to continue; your progress was saved.'); Game.save(); });
  if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => ({ save: Game.started ? Game.saveData() : Game.readSave() }));
  next();
}
if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(boot); else boot();
