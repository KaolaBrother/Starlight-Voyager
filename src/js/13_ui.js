// ───────────────────────────── user interface ─────────────────────────────
const $ = (id) => document.getElementById(id);
const UI = {
  weaponsDirty: true, labels: [], arrows: [], hits: [], hintsShown: {}, discoverT: 0, bannerT: 0, radarT: 0, objT: 0,
  mapMode: 'gal', mapSel: null, mapLayout: null,

  init() {
    this.e = {
      hud: $('hud'), lvl: $('h-lvl'), xp: $('h-xp'), cr: $('h-cr'), hull: $('h-hull'), hullN: $('h-hull-n'), gHull: $('g-hull'),
      shield: $('h-shield'), shieldN: $('h-shield-n'), energy: $('h-energy'), energyN: $('h-energy-n'), buffs: $('h-buffs'),
      sys: $('h-sys'), danger: $('h-danger'), obj: $('h-obj'), boss: $('h-boss'), bossName: $('h-boss-name'), bossBar: $('h-boss-bar'),
      weapons: $('h-weapons'), msl: $('h-msl'), nova: $('h-nova'), xhair: $('xhair'), aim: $('aim'), lock: $('lock'), lockName: $('lock-name'),
      spd: $('spd-n'), spdMode: $('spd-mode'), labels: $('labels'), toasts: $('toasts'), banner: $('banner'), ban1: $('ban-1'), ban2: $('ban-2'),
      prompt: $('prompt'), discover: $('discover'), radar: $('radar'), tnova: $('t-nova'),
    };
    this.rctx = this.e.radar.getContext('2d');
    for (let i = 0; i < 18; i++) {
      const el = document.createElement('div'); el.className = 'plabel'; el.style.display = 'none';
      el.innerHTML = '<i class="dia"></i><span class="tx"><span class="nm"></span><span class="ds"></span></span>';
      this.e.labels.appendChild(el);
      this.labels.push({ el, nm: el.querySelector('.nm'), ds: el.querySelector('.ds'), key: '' });
    }
    for (let i = 0; i < 4; i++) { const a = document.createElement('div'); a.className = 'arrow'; a.style.display = 'none'; this.e.labels.appendChild(a); this.arrows.push(a); }
    $('b-map').addEventListener('click', () => { Sound.play('ui'); Game.openMap(); });
    $('b-pause').addEventListener('click', () => { Sound.play('ui'); Game.pause(); });
    // pause tabs
    document.querySelectorAll('#scr-pause .tab').forEach((t) => t.addEventListener('click', () => this.pauseTab(t.dataset.tab)));
    $('btn-resume').addEventListener('click', () => Game.resume());
    $('btn-pmap').addEventListener('click', () => { Game.resume(); Game.openMap(); });
    $('btn-quit').addEventListener('click', () => Game.quitToTitle());
    // settings
    $('opt-q').addEventListener('change', (e) => Game.setQuality(e.target.value));
    $('opt-autofire').addEventListener('click', () => { Game.settings.autofire = !Game.settings.autofire; this.syncSettings(); Game.saveSettings(); });
    $('opt-invert').addEventListener('click', () => { Game.settings.invert = !Game.settings.invert; this.syncSettings(); Game.saveSettings(); });
    $('opt-shake').addEventListener('click', () => { Game.settings.shake = !Game.settings.shake; this.syncSettings(); Game.saveSettings(); });
    $('opt-sens').addEventListener('input', (e) => { Game.settings.sens = +e.target.value; Game.saveSettings(); });
    $('opt-vol').addEventListener('input', (e) => { Game.settings.sfx = +e.target.value; Sound.setVol(Game.settings.sfx, Game.settings.music); Game.saveSettings(); });
    $('opt-mus').addEventListener('input', (e) => { Game.settings.music = +e.target.value; Sound.setVol(Game.settings.sfx, Game.settings.music); Game.saveSettings(); });
    // map
    $('map-close').addEventListener('click', () => Game.closeMap());
    $('map-gal').addEventListener('click', () => { this.mapMode = 'gal'; this.mapSel = null; this.renderMap(); });
    $('map-sys').addEventListener('click', () => { this.mapMode = 'sys'; this.mapSel = null; this.renderMap(); });
    $('mapc').addEventListener('pointerdown', (e) => this.mapClick(e));
    // station
    $('btn-undock').addEventListener('click', () => Game.undock());
    // misc screens
    $('btn-respawn').addEventListener('click', () => Game.respawn());
    $('btn-win').addEventListener('click', () => { this.show(null); Game.state = 'play'; });
    $('howto-close').addEventListener('click', () => { Sound.play('ui'); this.show(Game.prevScreen || 'scr-title'); });
    $('tab-controls').innerHTML = document.querySelector('#scr-howto .howto').outerHTML;
    window.addEventListener('resize', () => { if (Game.state === 'map') this.renderMap(); });
  },
  applyTouchMode() {
    const t = Input.touchMode;
    $('touch').hidden = !(t && Game.state === 'play');
    this.e.aim.hidden = true;
    const af = Game.settings.autofire;
    $('opt-autofire').textContent = af ? 'On' : 'Off';
  },
  show(id) {
    for (const s of document.querySelectorAll('.screen')) s.hidden = s.id !== id;
    if (id && this.e) { this.e.banner.classList.remove('show'); this.bannerT = 0; }
  },
  syncSettings() {
    const S = Game.settings;
    $('opt-q').value = R.qName;
    $('opt-autofire').textContent = S.autofire ? 'On' : 'Off'; $('opt-autofire').classList.toggle('on', !!S.autofire);
    $('opt-invert').textContent = S.invert ? 'On' : 'Off'; $('opt-invert').classList.toggle('on', !!S.invert);
    $('opt-shake').textContent = S.shake ? 'On' : 'Off'; $('opt-shake').classList.toggle('on', !!S.shake);
    $('opt-sens').value = S.sens; $('opt-vol').value = S.sfx; $('opt-mus').value = S.music;
    $('btn-snd-title').textContent = 'Sound: ' + (S.sound ? 'on' : 'off');
  },

  // ─── messages ───
  toast(html, ms = 3600) {
    const el = document.createElement('div'); el.className = 'toast'; el.innerHTML = html;
    const box = this.e.toasts;
    box.appendChild(el);
    while (box.children.length > 4) box.removeChild(box.firstChild);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 420); }, ms);
  },
  banner(a, b, red) {
    this.e.ban1.textContent = a; this.e.ban2.textContent = b || '';
    this.e.banner.classList.add('show'); this.e.banner.classList.toggle('red', !!red);
    this.bannerT = 3.4;
  },
  hint(key) {
    if (this.hintsShown[key] || Game.hints[key]) return;
    this.hintsShown[key] = true; Game.hints[key] = true;
    const touch = Input.touchMode;
    const H = {
      start: touch ? 'Drag on the left side to steer. Your guns fire on their own when an enemy is in your sights.' : 'Steer with the mouse. Click or hold <b>Space</b> to fire.',
      pickups: 'Fly into glowing pickups to collect them. Crystals are credits for station upgrades.',
      cruise: 'Cruise drive engaged. Keep holding <b>boost</b> to cross the system fast.',
      cruiseHow: touch ? 'Hold <b>Boost</b> for a second to engage cruise drive and cross space quickly.' : 'Hold <b>Shift</b> for a second to engage cruise drive and cross space quickly.',
      map: touch ? 'Tap <b>Map</b> to see the galaxy, set waypoints and warp to other stars.' : 'Press <b>M</b> for the galaxy map: set waypoints and warp to other stars.',
      station: 'Fly through a station’s glowing gate to repair, restock, save and buy upgrades.',
      boss: 'Guardians drop a Star Key. Collect all eight to open the Maw.',
    };
    if (H[key]) this.toast(H[key], 6500);
  },
  creditPulse() { this.e.cr.parentElement.style.transform = 'scale(1.15)'; clearTimeout(this._cp); this._cp = setTimeout(() => { this.e.cr.parentElement.style.transform = ''; }, 120); },
  hitFrom(pos) { this.hits.push({ pos: pos.clone(), t: 1.0 }); if (this.hits.length > 4) this.hits.shift(); },
  discover(b) {
    const i = b.info;
    $('dc-name').textContent = b.name;
    $('dc-cls').textContent = i.cls + (b.parent ? ' · moon of ' + b.parent.name : '');
    $('dc-rad').textContent = fmt(i.radiusKm) + ' km';
    $('dc-g').textContent = i.grav.toFixed(2) + ' g';
    $('dc-t').textContent = fmt(i.temp) + ' K';
    $('dc-au').textContent = i.au.toFixed(2) + ' AU';
    $('dc-day').textContent = i.day + ' h';
    $('dc-desc').textContent = b.T.desc;
    this.e.discover.hidden = false;
    this.e.discover.style.animation = 'none'; void this.e.discover.offsetWidth; this.e.discover.style.animation = '';
    this.discoverT = 7;
  },
  prompt(html) {
    if (html) { if (this.e.prompt._h !== html) { this.e.prompt.innerHTML = html; this.e.prompt._h = html; } this.e.prompt.hidden = false; }
    else this.e.prompt.hidden = true;
  },

  // ─── per-frame HUD ───
  setT(el, v) { if (el._v !== v) { el._v = v; el.textContent = v; } },
  setW(el, f) { const v = Math.round(clamp(f, 0, 1) * 1000) / 10; if (el._w !== v) { el._w = v; el.style.width = v + '%'; } },
  buildWeapons() {
    const P = Player, box = this.e.weapons;
    box.innerHTML = '';
    WORDER.forEach((id, i) => {
      const W = WEAPONS[id], lv = P.weapons[id] || 0;
      const b = document.createElement('button');
      b.className = 'wslot' + (lv ? '' : ' locked') + (P.cur === id ? ' on' : '');
      b.style.color = W.css;
      b.setAttribute('aria-label', W.name);
      b.innerHTML = `<span class="wk">${i + 1}</span><span class="wn">${W.short}</span><span class="pips">${[1, 2, 3, 4, 5].map((k) => `<i class="${k <= lv ? 'on' : ''}"></i>`).join('')}</span>`;
      b.addEventListener('click', () => Player.selectWeapon(id));
      box.appendChild(b);
    });
    this.weaponsDirty = false;
  },
  update(dt) {
    const P = Player, e = this.e;
    if (this.weaponsDirty) this.buildWeapons();
    this.setT(e.lvl, String(P.level)); this.setW(e.xp, P.xp / P.xpNext());
    this.setT(e.cr, fmt(P.credits));
    this.setW(e.hull, P.hp / P.maxHp); this.setT(e.hullN, String(Math.ceil(Math.max(0, P.hp))));
    e.gHull.classList.toggle('low', P.hp < P.maxHp * 0.25);
    this.setW(e.shield, P.shield / P.maxShield); this.setT(e.shieldN, String(Math.ceil(P.shield)));
    this.setW(e.energy, P.energy / P.maxEnergy); this.setT(e.energyN, String(Math.round(P.energy)));
    this.setT(e.msl, `MSL ${P.missiles}/${P.maxMissiles}`);
    const nr = P.nova >= 100;
    this.setT(e.nova, nr ? 'NOVA READY' : `NOVA ${Math.floor(P.nova)}%`);
    e.nova.classList.toggle('ready', nr); e.tnova.classList.toggle('ready', nr);
    // buffs
    let bh = '';
    for (const k in P.buffs) if (P.buffs[k] > 0) bh += `<span class="buff" style="color:${BUFFS[k].css}">${BUFFS[k].name} ${Math.ceil(P.buffs[k])}s</span>`;
    if (e.buffs._h !== bh) { e.buffs._h = bh; e.buffs.innerHTML = bh; }
    // location / objective
    const s = World.cur;
    const inSys = s && World.curDist < 22000;
    this.setT(e.sys, inSys ? s.name : 'Deep space');
    const dk = inSys ? s.def.danger : 0;
    if (e.danger._d !== dk) { e.danger._d = dk; e.danger.innerHTML = dk ? Array.from({ length: 9 }, (_, i) => `<i class="${i < dk ? 'on' : ''}"></i>`).join('') : ''; e.danger.setAttribute('aria-label', `Danger ${dk} of 9`); }
    this.objT -= dt;
    if (this.objT <= 0) { this.objT = 0.5; const o = Game.objective(); if (e.obj._h !== o.html) { e.obj._h = o.html; e.obj.innerHTML = o.html; } }
    // boss bar
    const B = Enemies.boss;
    if (B && B.alive) { e.boss.hidden = false; this.setT(e.bossName, B.name + (B.shielded ? ' · shielded' : '')); this.setW(e.bossBar, B.hp / B.maxHp); } else e.boss.hidden = true;
    // speed
    this.setT(e.spd, fmt(P.vel.len()));
    this.setT(e.spdMode, Game.autopilot ? 'AUTOPILOT' : P.cruise ? 'CRUISE' : P.boosting ? 'BOOST' : '');
    // crosshair at aim point
    const ap = _v1.copy(P.fwd).scale(400).add(P.pos);
    const pr = R.project(ap.x, ap.y, ap.z, _proj);
    if (!pr.behind) { e.xhair.style.left = pr.x + 'px'; e.xhair.style.top = pr.y + 'px'; }
    // mouse reticle
    if (!Input.touchMode && Input.mouse.used && Game.state === 'play') { e.aim.hidden = false; e.aim.style.left = Input.mouse.x + 'px'; e.aim.style.top = Input.mouse.y + 'px'; } else e.aim.hidden = true;
    // lock box
    const L = P.lock;
    if (L && L.alive && P.alive) {
      const lp = R.project(L.pos.x, L.pos.y, L.pos.z, _proj);
      if (!lp.behind) {
        e.lock.hidden = false;
        const sr = clamp(World.screenR(L.pos, L.r) * 2.6, 34, 160);
        e.lock.style.left = lp.x + 'px'; e.lock.style.top = lp.y + 'px'; e.lock.style.width = sr + 'px'; e.lock.style.height = sr + 'px';
        e.lock.style.margin = `${-sr / 2}px 0 0 ${-sr / 2}px`;
        this.setT(e.lockName, `${L.name} · ${fmt(L.pos.dist(P.pos))}`);
      } else e.lock.hidden = true;
    } else e.lock.hidden = true;
    // banner / discovery timers
    if (this.bannerT > 0) { this.bannerT -= dt; if (this.bannerT <= 0) e.banner.classList.remove('show'); }
    if (this.discoverT > 0) { this.discoverT -= dt; if (this.discoverT <= 0) e.discover.hidden = true; }
    // hit direction arrows
    for (let i = 0; i < this.arrows.length; i++) {
      const a = this.arrows[i], h = this.hits[i];
      if (!h || h.t <= 0) { a.style.display = 'none'; continue; }
      h.t -= dt;
      const hp = R.project(h.pos.x, h.pos.y, h.pos.z, _proj);
      let dx = hp.nx, dy = -hp.ny; if (hp.behind) { dx = -dx; dy = -dy; }
      const ang = Math.atan2(dy, dx);
      const rad = Math.min(R.cssW, R.cssH) * 0.22;
      a.style.display = 'block'; a.style.opacity = clamp(h.t * 1.5, 0, 1);
      a.style.transform = `translate(${R.cssW / 2 + Math.cos(ang) * rad - 7}px, ${R.cssH / 2 + Math.sin(ang) * rad - 6}px) rotate(${ang + PI / 2}rad)`;
    }
    this.hits = this.hits.filter((h) => h.t > 0);
    this.updateLabels();
    this.radarT -= dt;
    if (this.radarT <= 0) { this.radarT = 1 / 30; this.drawRadar(); }
  },

  updateLabels() {
    const P = Player, cand = [];
    const s = World.cur;
    const wp = Game.waypoint();
    if (s) {
      for (const b of s.bodies) {
        const d = b.pos.dist(P.pos);
        if (d > 45000) continue;
        cand.push({ key: b.id, pos: b.pos, nm: b.name, d, cls: 'pl' + (b.discovered ? '' : ' new'), off: b.r * 1.15, edge: false, prio: 1 });
      }
      for (const st of s.stations) cand.push({ key: st.id, pos: st.pos, nm: st.name, d: st.pos.dist(P.pos), cls: 'st', off: 180, edge: false, prio: 2 });
    }
    const deep = !s || World.curDist > 22000;
    for (const o of World.systems) {
      if (!deep && !(Game.wp && Game.wp.ref === o)) continue;
      if (o === s && World.curDist < 22000) continue;
      cand.push({ key: 'sys' + o.id, pos: o.pos, nm: o.name, d: o.pos.dist(P.pos), cls: 'pl', off: 0, edge: false, prio: 0 });
    }
    const B = Enemies.boss;
    if (B && B.alive) cand.push({ key: 'boss' + B.key, pos: B.pos, nm: B.name, d: B.pos.dist(P.pos), cls: 'boss', off: B.r * 1.5, edge: true, prio: 5 });
    for (const p of Items.list) if (p.alive && (p.D.special || p.beacon)) { const d = p.pos.dist(P.pos); if (d < (p.beacon && !p.D.special ? 6000 : 3000)) cand.push({ key: 'it' + p.uid, pos: p.pos, nm: this.itemName(p), d, cls: 'wp', off: 8, edge: false, prio: 3 }); }
    if (wp) {
      const ex = cand.find((c) => c.key === wp.key);
      if (ex) { ex.cls += ' wp'; ex.edge = true; ex.prio = 6; }
      else cand.push({ key: wp.key, pos: wp.pos, nm: wp.name, d: wp.pos.dist(P.pos), cls: 'wp', off: 0, edge: true, prio: 6 });
    }
    cand.sort((a, b) => b.prio - a.prio || a.d - b.d);
    let li = 0, nPl = 0;
    const W = R.cssW, H = R.cssH, m = 46, maxPl = W < 700 ? 3 : 5;
    for (const c of cand) {
      if (li >= this.labels.length) break;
      if (c.prio === 1) { if (nPl >= maxPl && c.d > 5000) continue; nPl++; }
      const p = R.project(c.pos.x, c.pos.y, c.pos.z, _proj);
      let x = p.x, y = p.y, on = !p.behind && x > m && x < W - m && y > m && y < H - m;
      let edge = false;
      if (!on) {
        if (!c.edge) continue;
        let dx = p.nx, dy = -p.ny; if (p.behind) { dx = -dx; dy = -dy; if (Math.abs(dx) + Math.abs(dy) < 1e-3) dy = 1; }
        const k = Math.min((W / 2 - m) / Math.max(Math.abs(dx) * W / 2, 1e-3), (H / 2 - m) / Math.max(Math.abs(dy) * H / 2, 1e-3));
        x = W / 2 + dx * W / 2 * k; y = H / 2 + dy * H / 2 * k; edge = true;
      } else if (c.off) {
        const sr = World.screenR(c.pos, c.off);
        if (sr > H * 0.35 && c.prio < 5) continue; // too close to label usefully
        y -= Math.min(sr, H * 0.3);
      }
      const L = this.labels[li++];
      if (L.key !== c.key) { L.key = c.key; L.nm.textContent = c.nm; L.el.className = 'plabel ' + c.cls; }
      L.el.classList.toggle('edge', edge);
      const dist = c.d >= 10000 ? (c.d / 1000).toFixed(0) + 'k' : c.d >= 1000 ? (c.d / 1000).toFixed(1) + 'k' : fmt(c.d);
      this.setT(L.ds, dist + ' km');
      L.el.style.display = 'flex';
      L.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-4px, -50%)`;
    }
    for (; li < this.labels.length; li++) { const L = this.labels[li]; if (L.el.style.display !== 'none') L.el.style.display = 'none'; L.key = ''; }
  },
  itemName(p) {
    if (p.kind === 'weapon') return WEAPONS[p.sub].name;
    if (p.kind === 'power') return BUFFS[p.sub].name;
    return p.D.label || p.kind;
  },

  drawRadar() {
    const c = this.rctx, cv = this.e.radar, S = cv.width, h = S / 2, P = Player;
    c.clearRect(0, 0, S, S);
    c.fillStyle = 'rgba(8, 11, 24, 0.72)'; c.beginPath(); c.arc(h, h, h - 2, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(255, 207, 112, 0.55)'; c.lineWidth = 2; c.beginPath(); c.arc(h, h, h - 3, 0, TAU); c.stroke();
    c.strokeStyle = 'rgba(255, 207, 112, 0.14)'; c.lineWidth = 1.5;
    c.beginPath(); c.arc(h, h, h * 0.5, 0, TAU); c.stroke();
    c.beginPath(); c.moveTo(h, 8); c.lineTo(h, S - 8); c.moveTo(8, h); c.lineTo(S - 8, h); c.stroke();
    const range = 1400, sc = (h - 10) / range;
    const plot = (pos, clampEdge) => {
      _v1.subVectors(pos, P.pos);
      const x = _v1.dot(P.right), z = -_v1.dot(P.fwd), y = _v1.dot(P.up);
      let px = x * sc, pz = z * sc;
      const l = Math.hypot(px, pz);
      if (l > h - 10) { if (!clampEdge) return null; px *= (h - 10) / l; pz *= (h - 10) / l; }
      return [h + px, h + pz, y];
    };
    const dot = (p, r, col, shape) => {
      if (!p) return;
      c.globalAlpha = p[2] < -60 ? 0.55 : 1;
      c.fillStyle = col;
      if (shape === 'dia') { c.beginPath(); c.moveTo(p[0], p[1] - r); c.lineTo(p[0] + r, p[1]); c.lineTo(p[0], p[1] + r); c.lineTo(p[0] - r, p[1]); c.fill(); }
      else if (shape === 'sq') c.fillRect(p[0] - r, p[1] - r, r * 2, r * 2);
      else { c.beginPath(); c.arc(p[0], p[1], r, 0, TAU); c.fill(); }
      if (Math.abs(p[2]) > 60) { c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(p[0], p[1] + (p[2] > 0 ? -7 : 7)); c.stroke(); }
      c.globalAlpha = 1;
    };
    const s = World.cur;
    if (s) {
      for (const b of s.bodies) {
        const p = plot(b.pos, false); if (!p) continue;
        c.strokeStyle = 'rgba(215, 220, 242, 0.6)'; c.lineWidth = 2; c.beginPath(); c.arc(p[0], p[1], Math.max(4, b.r * sc), 0, TAU); c.stroke();
      }
      for (const st of s.stations) dot(plot(st.pos, true), 5, '#7fe6ff', 'sq');
    }
    for (const p of Items.list) {
      if (!p.alive) continue;
      const sp = plot(p.pos, p.D.special);
      if (p.kind === 'crystal') dot(sp, 2, '#7fe6ff');
      else dot(sp, p.D.special ? 6 : 4, cssRgb(p.col.map((v) => v / 2.6)), p.D.special ? 'dia' : 'c');
    }
    for (const e of Enemies.list) {
      if (!e.alive) continue;
      dot(plot(e.pos, e.engaged || e.boss), e.boss ? 8 : e.elite ? 5 : 3.5, e.boss ? '#ff3355' : e.elite ? '#ffcf70' : '#ff5a72');
    }
    const wp = Game.waypoint();
    if (wp) dot(plot(wp.pos, true), 6, '#ffcf70', 'dia');
    c.fillStyle = '#fff1cc'; c.beginPath(); c.moveTo(h, h - 8); c.lineTo(h + 6, h + 6); c.lineTo(h, h + 3); c.lineTo(h - 6, h + 6); c.fill();
  },

  // ─── pause menu ───
  pauseTab(tab) {
    document.querySelectorAll('#scr-pause .tab').forEach((t) => t.classList.toggle('on', t.dataset.tab === tab));
    for (const id of ['ship', 'log', 'settings', 'controls']) $('tab-' + id).hidden = id !== tab;
    if (tab === 'ship') this.renderShip();
    if (tab === 'log') this.renderLog();
    if (tab === 'settings') this.syncSettings();
  },
  renderShip() {
    const P = Player;
    const st = (k, v) => `<div class="stat"><span class="v">${v}</span><span class="k">${k}</span></div>`;
    let h = '<div class="statgrid">' +
      st('Pilot level', P.level) + st('Credits', fmt(P.credits)) + st('Star Keys', `${P.keys.length} / 8`) +
      st('Hull', `${fmt(P.hp)} / ${fmt(P.maxHp)}`) + st('Shield', `${fmt(P.shield)} / ${fmt(P.maxShield)}`) +
      st('Damage bonus', '+' + Math.round((P.baseDmg - 1) * 100) + '%') + st('Fire rate bonus', '+' + Math.round((P.baseRate - 1) * 100) + '%') +
      st('Missiles', `${P.missiles} / ${P.maxMissiles}`) + '</div>';
    h += '<p class="sectitle">Weapons</p><div class="list">' + WORDER.map((id) => {
      const lv = P.weapons[id];
      return `<div class="li ${lv ? 'done' : ''}"><span><b style="color:${WEAPONS[id].css}">${WEAPONS[id].name}</b> · ${WEAPONS[id].desc}</span><span class="s">${lv ? 'Level ' + lv + ' / 5' : 'Not found'}</span></div>`;
    }).join('') + '</div>';
    h += '<p class="sectitle">Ship modules</p><div class="list">' + Object.keys(UPGRADES).map((k) => `<div class="li"><span>${UPGRADES[k].name} · ${UPGRADES[k].desc}</span><span class="s">Mk ${P.upg[k]} / ${UPGRADES[k].max}</span></div>`).join('') + '</div>';
    $('tab-ship').innerHTML = h;
  },
  renderLog() {
    const P = Player;
    let h = '<div class="statgrid">' +
      `<div class="stat"><span class="v">${fmt(P.stats.kills)}</span><span class="k">Enemies destroyed</span></div>` +
      `<div class="stat"><span class="v">${Game.chartedCount()} / ${World.allBodies().length}</span><span class="k">Worlds charted</span></div>` +
      `<div class="stat"><span class="v">${Object.keys(Game.bossesDown).length} / 9</span><span class="k">Guardians defeated</span></div>` +
      `<div class="stat"><span class="v">${Math.floor(P.stats.time / 60)} min</span><span class="k">Time flown</span></div></div>`;
    h += '<p class="sectitle">Star systems</p><div class="list">' + World.systems.map((s) => {
      const ch = s.bodies.filter((b) => b.discovered).length, down = Game.bossesDown[s.def.boss.key];
      return `<div class="li ${down ? 'done' : ''}"><span><b>${s.name}</b> · ${s.def.star.cls} · danger ${s.def.danger}<br><span class="s">${ch} / ${s.bodies.length} worlds charted · Guardian: ${s.def.boss.name}</span></span><span class="s">${down ? 'Liberated' : s.discovered ? 'Visited' : 'Unvisited'}</span></div>`;
    }).join('') + '</div>';
    $('tab-log').innerHTML = h;
  },

  // ─── station ───
  renderShop() {
    const P = Player, box = $('shop');
    $('st-cr').textContent = fmt(P.credits);
    let h = '';
    for (const k in UPGRADES) {
      const U2 = UPGRADES[k], lv = P.upg[k], max = lv >= U2.max, price = Game.upgPrice(k);
      h += `<div class="item"><h4><span>${U2.name}</span><span class="lv">Mk ${lv}/${U2.max}</span></h4><p>${U2.desc}</p>` +
        `<button class="btn small buy" data-upg="${k}" ${max || P.credits < price ? 'disabled' : ''}>${max ? 'Maxed' : 'Buy · ' + fmt(price)}</button></div>`;
    }
    for (const id of WORDER) {
      const lv = P.weapons[id]; if (!lv) continue;
      const price = Game.tunePrice(id), max = lv >= 5;
      h += `<div class="item"><h4><span style="color:${WEAPONS[id].css}">${WEAPONS[id].name}</span><span class="lv">Lv ${lv}/5</span></h4><p>Weapon tuning: more damage and fire power.</p>` +
        `<button class="btn small buy" data-wpn="${id}" ${max || P.credits < price ? 'disabled' : ''}>${max ? 'Maxed' : 'Tune · ' + fmt(price)}</button></div>`;
    }
    box.innerHTML = h;
    box.querySelectorAll('[data-upg]').forEach((b) => b.addEventListener('click', () => Game.buyUpgrade(b.dataset.upg)));
    box.querySelectorAll('[data-wpn]').forEach((b) => b.addEventListener('click', () => Game.buyTune(b.dataset.wpn)));
  },

  // ─── galaxy / system map ───
  renderMap() {
    const cv = $('mapc'), dpr = Math.min(devicePixelRatio || 1, 2);
    const W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    $('map-gal').classList.toggle('on', this.mapMode === 'gal'); $('map-sys').classList.toggle('on', this.mapMode === 'sys');
    $('map-title').textContent = this.mapMode === 'gal' ? 'Galaxy chart' : World.cur.name + ' system';
    if (this.mapMode === 'gal') this.drawGalaxy(c, W, H); else this.drawSystem(c, W, H);
    this.renderMapInfo();
  },
  galaxyBg: null,
  drawGalaxy(c, W, H) {
    const P = Player;
    const pad = 70, minX = -95000, maxX = 115000, minZ = -55000, maxZ = 135000;
    const sc = Math.min((W - pad * 2) / (maxX - minX), (H - pad * 2 - 40) / (maxZ - minZ));
    const ox = W / 2 - (minX + maxX) / 2 * sc, oz = H / 2 + 20 - (minZ + maxZ) / 2 * sc;
    const X = (x) => ox + x * sc, Z = (z) => oz + z * sc;
    this.mapLayout = { X, Z, sc };
    // galaxy glow and arms
    const cx = X(0), cz = Z(0), gr = 160000 * sc;
    let g = c.createRadialGradient(cx, cz, 0, cx, cz, gr);
    g.addColorStop(0, 'rgba(255, 190, 120, 0.42)'); g.addColorStop(0.12, 'rgba(255, 150, 90, 0.16)'); g.addColorStop(0.5, 'rgba(110, 90, 190, 0.07)'); g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    if (!this.galaxyBg) {
      const r = new RNG(77), pts = [];
      for (let i = 0; i < 2600; i++) {
        const arm = i % 3, t = Math.pow(r.next(), 0.7);
        const ang = arm * TAU / 3 + t * 5.2 + r.range(-0.35, 0.35) * (1 - t * 0.5);
        const rad = 6000 + t * 150000;
        pts.push([Math.cos(ang) * rad + r.range(-5000, 5000), Math.sin(ang) * rad + r.range(-5000, 5000), r.next()]);
      }
      this.galaxyBg = pts;
    }
    for (const [x, z, b] of this.galaxyBg) {
      c.fillStyle = b > 0.92 ? 'rgba(255, 240, 220, 0.8)' : b > 0.6 ? 'rgba(170, 160, 255, 0.35)' : 'rgba(255, 200, 160, 0.22)';
      const s = b > 0.92 ? 1.6 : 1.1;
      c.fillRect(X(x) - s / 2, Z(z) - s / 2, s, s);
    }
    // route lines between nearest systems (decorative)
    c.strokeStyle = 'rgba(255, 207, 112, 0.1)'; c.lineWidth = 1; c.setLineDash([3, 6]);
    for (const a of World.systems) {
      const near = World.systems.filter((b) => b !== a).sort((p, q) => p.pos.distSq(a.pos) - q.pos.distSq(a.pos)).slice(0, 2);
      for (const b of near) { c.beginPath(); c.moveTo(X(a.pos.x), Z(a.pos.z)); c.lineTo(X(b.pos.x), Z(b.pos.z)); c.stroke(); }
    }
    c.setLineDash([]);
    // systems
    c.textBaseline = 'middle';
    for (const s of World.systems) {
      const x = X(s.pos.x), z = Z(s.pos.z), col = s.bh ? '#ffae6a' : cssRgb(s.stars[0].col.map((v) => Math.min(1, v * 1.3)));
      const sel = this.mapSel === s, down = Game.bossesDown[s.def.boss.key];
      g = c.createRadialGradient(x, z, 0, x, z, 26); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.globalAlpha = s.discovered ? 1 : 0.6; c.fillStyle = g; c.beginPath(); c.arc(x, z, 26, 0, TAU); c.fill(); c.globalAlpha = 1;
      c.fillStyle = '#fff'; c.beginPath(); c.arc(x, z, s.bh ? 5 : 3.5, 0, TAU); c.fill();
      if (s.bh) { c.strokeStyle = '#ffae6a'; c.lineWidth = 2; c.beginPath(); c.ellipse(x, z, 13, 5, -0.3, 0, TAU); c.stroke(); }
      if (down) { c.strokeStyle = '#ffcf70'; c.lineWidth = 1.5; c.beginPath(); c.arc(x, z, 12, 0, TAU); c.stroke(); }
      if (sel) { c.strokeStyle = '#fff1cc'; c.lineWidth = 2; c.beginPath(); c.arc(x, z, 18, 0, TAU); c.stroke(); }
      c.font = '600 13px "Chakra Petch", system-ui, sans-serif'; c.fillStyle = sel ? '#fff1cc' : '#d8dcf0';
      const tx = x + 22 > W - 120 ? x - 22 - c.measureText(s.name).width : x + 22;
      c.fillText(s.name, tx, z - 6);
      c.font = '11px "Chakra Petch", system-ui, sans-serif'; c.fillStyle = '#8f96b8';
      c.fillText(`Danger ${s.def.danger}${down ? ' · liberated' : ''}`, tx, z + 9);
    }
    // player
    const px = X(P.pos.x), pz = Z(P.pos.z), ang = Math.atan2(P.fwd.z, P.fwd.x);
    c.save(); c.translate(px, pz); c.rotate(ang);
    c.fillStyle = '#ffcf70'; c.beginPath(); c.moveTo(10, 0); c.lineTo(-7, 6); c.lineTo(-4, 0); c.lineTo(-7, -6); c.fill(); c.restore();
    const wp = Game.waypoint();
    if (wp) { c.strokeStyle = 'rgba(255, 207, 112, 0.7)'; c.setLineDash([5, 5]); c.beginPath(); c.moveTo(px, pz); c.lineTo(X(wp.pos.x), Z(wp.pos.z)); c.stroke(); c.setLineDash([]); }
    $('map-legend').innerHTML = 'Tap a star to see its worlds and warp there.<br>Gold rings mark systems whose guardian you have defeated.';
  },
  drawSystem(c, W, H) {
    const s = World.cur, P = Player;
    let maxR = 0; for (const b of s.planets) maxR = Math.max(maxR, b.def.orbit + (b.moons.length ? 3000 : 0));
    maxR = Math.max(maxR, 9000) * 1.08;
    const sc = Math.min(W, H - 80) / 2 / maxR * 0.92;
    const ox = W / 2, oz = H / 2 + 20;
    const X = (x) => ox + (x - s.pos.x) * sc, Z = (z) => oz + (z - s.pos.z) * sc;
    this.mapLayout = { X, Z, sc };
    c.textBaseline = 'middle';
    if (s.def.belt) { c.strokeStyle = 'rgba(200, 180, 150, 0.18)'; c.lineWidth = Math.max(2, s.def.belt.w * 2 * sc); c.beginPath(); c.arc(ox, oz, s.def.belt.r * sc, 0, TAU); c.stroke(); }
    for (const b of s.planets) { c.strokeStyle = 'rgba(255, 207, 112, 0.13)'; c.lineWidth = 1; c.beginPath(); c.arc(ox, oz, b.def.orbit * sc, 0, TAU); c.stroke(); }
    const sc0 = s.bh ? '#ffae6a' : cssRgb(s.stars[0].col);
    for (const st of s.stars) {
      const g = c.createRadialGradient(X(st.pos.x), Z(st.pos.z), 0, X(st.pos.x), Z(st.pos.z), 30);
      g.addColorStop(0, s.bh ? '#000' : '#fff'); g.addColorStop(0.25, sc0); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.beginPath(); c.arc(X(st.pos.x), Z(st.pos.z), 30, 0, TAU); c.fill();
    }
    for (const b of s.bodies) {
      const x = X(b.pos.x), z = Z(b.pos.z), r = clamp(b.r * sc * 3, 3.5, 16);
      const col = cssRgb(b.pal[Math.min(2, b.pal.length - 1)].map((v) => Math.min(1, v * 1.6 + 0.08)));
      c.fillStyle = col; c.beginPath(); c.arc(x, z, r, 0, TAU); c.fill();
      if (b.rings) { c.strokeStyle = 'rgba(230, 210, 180, 0.6)'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(x, z, r * 2, r * 0.7, -0.4, 0, TAU); c.stroke(); }
      if (this.mapSel === b) { c.strokeStyle = '#fff1cc'; c.lineWidth = 2; c.beginPath(); c.arc(x, z, r + 6, 0, TAU); c.stroke(); }
      if (!b.parent || this.mapSel === b) {
        c.font = '600 12.5px "Chakra Petch", system-ui, sans-serif'; c.fillStyle = b.discovered ? '#d8dcf0' : '#8f96b8';
        c.fillText(b.discovered ? b.name : b.name + ' · uncharted', x + r + 6, z - 5);
        const tags = this.bodyTags(b);
        if (tags) { c.font = '11px "Chakra Petch", system-ui, sans-serif'; c.fillStyle = '#ffcf70'; c.fillText(tags, x + r + 6, z + 10); }
      }
      if (b.station) { c.fillStyle = '#7fe6ff'; c.fillRect(X(b.station.pos.x) - 3, Z(b.station.pos.z) - 3, 6, 6); }
    }
    const px = X(P.pos.x), pz = Z(P.pos.z), ang = Math.atan2(P.fwd.z, P.fwd.x);
    c.save(); c.translate(clamp(px, 10, W - 10), clamp(pz, 10, H - 10)); c.rotate(ang);
    c.fillStyle = '#ffcf70'; c.beginPath(); c.moveTo(10, 0); c.lineTo(-7, 6); c.lineTo(-4, 0); c.lineTo(-7, -6); c.fill(); c.restore();
    const wp = Game.waypoint();
    if (wp) { c.strokeStyle = 'rgba(255, 207, 112, 0.7)'; c.setLineDash([5, 5]); c.beginPath(); c.moveTo(px, pz); c.lineTo(X(wp.pos.x), Z(wp.pos.z)); c.stroke(); c.setLineDash([]); }
    $('map-legend').innerHTML = `${s.name} · ${s.def.star.cls}<br>Tap a world to set a waypoint or fly there on autopilot.`;
  },
  bodyTags(b) {
    const t = [];
    if (b.station) t.push('Station');
    if (b.def.weapon && !Game.uniques[b.id + '/weapon']) t.push('Weapon signal');
    if (b.def.module && !Game.uniques[b.id + '/module']) t.push('Module signal');
    const bd = b.sys.def.boss;
    if (bd.planet === b.name && !Game.bossesDown[bd.key]) t.push('Guardian');
    return t.join(' · ');
  },
  mapClick(e) {
    const L = this.mapLayout; if (!L) return;
    const rect = $('mapc').getBoundingClientRect(), x = e.clientX - rect.left, y = e.clientY - rect.top;
    let best = null, bd = 34;
    if (this.mapMode === 'gal') {
      for (const s of World.systems) { const d = Math.hypot(L.X(s.pos.x) - x, L.Z(s.pos.z) - y); if (d < bd) { bd = d; best = s; } }
    } else {
      for (const b of World.cur.bodies) { const d = Math.hypot(L.X(b.pos.x) - x, L.Z(b.pos.z) - y); if (d < bd) { bd = d; best = b; } }
    }
    this.mapSel = best; Sound.play('ui');
    this.renderMap();
  },
  renderMapInfo() {
    const box = $('map-info'), sel = this.mapSel;
    if (!sel) { box.hidden = true; return; }
    box.hidden = false;
    let h = '';
    if (this.mapMode === 'gal') {
      const s = sel, ch = s.bodies.filter((b) => b.discovered).length, down = Game.bossesDown[s.def.boss.key];
      const here = World.cur === s && World.curDist < 22000;
      h = `<p class="eyebrow">${s.def.star.cls}</p><h3>${s.name}</h3><p class="meta">Danger ${s.def.danger} of 9 · ${ch} / ${s.bodies.length} worlds charted</p><p>${s.def.blurb}</p>` +
        `<p class="meta">Guardian: ${s.def.boss.name}${down ? ' (defeated)' : ''}</p>` +
        `<div class="row" style="justify-content:flex-start">` +
        (here ? `<button class="btn small" id="mi-sys">Show this system</button>` : `<button class="btn primary small" id="mi-warp" ${Game.canWarp() ? '' : 'disabled'}>Warp here</button>`) +
        (here ? '' : `<button class="btn small" id="mi-wp">Set waypoint</button>`) + '</div>' +
        (here || Game.canWarp() ? '' : '<p class="meta">Warp drive is blocked while enemies are engaging you.</p>');
    } else {
      const b = sel, i = b.info;
      h = `<p class="eyebrow">${i.cls}</p><h3>${b.name}</h3>` +
        (b.discovered ? `<p class="meta">${fmt(i.radiusKm)} km radius · ${i.grav.toFixed(2)} g · ${fmt(i.temp)} K</p><p>${b.T.desc}</p>` : '<p>Uncharted. Fly close to scan it.</p>') +
        (this.bodyTags(b) ? `<p class="meta" style="color:var(--gold)">${this.bodyTags(b)}</p>` : '') +
        `<div class="row" style="justify-content:flex-start"><button class="btn primary small" id="mi-auto">Autopilot</button><button class="btn small" id="mi-wp">Set waypoint</button></div>`;
    }
    box.innerHTML = h;
    const on = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', fn); };
    on('mi-warp', () => Game.startWarp(sel));
    on('mi-sys', () => { this.mapMode = 'sys'; this.mapSel = null; this.renderMap(); });
    on('mi-wp', () => { Game.setWaypoint(sel); Game.closeMap(); });
    on('mi-auto', () => { Game.setWaypoint(sel); Game.autopilot = true; Game.apMouse = { x: Input.mouse.x, y: Input.mouse.y }; Game.closeMap(); UI.toast(`Autopilot set for <b>${sel.name}</b>. Steer or brake to take control.`); });
  },
};
