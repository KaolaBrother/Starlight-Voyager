// ───────────────────────────── audio (synthesised) ─────────────────────────────
const Sound = {
  ctx: null, master: null, sfx: null, music: null, noise: null, verb: null, on: true, sfxVol: 0.8, musVol: 0.6, last: {}, engine: null, beam: null,
  combat: 0, bossMode: false, chordI: 0, nextChord: 0, nextArp: 0, nextBeat: 0, beat: 0, schedId: 0, padVoices: [],
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { this.ctx = new AC(); } catch (e) { this.ctx = null; return; }
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = this.on ? 1 : 0;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
    this.master.connect(comp); comp.connect(c.destination);
    this.sfx = c.createGain(); this.sfx.gain.value = this.sfxVol; this.sfx.connect(this.master);
    this.music = c.createGain(); this.music.gain.value = this.musVol * 0.55; this.music.connect(this.master);
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
    // reverb impulse
    const il = Math.floor(c.sampleRate * 3.2), ir = c.createBuffer(2, il, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const a = ir.getChannelData(ch); for (let i = 0; i < il; i++) a[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / il, 2.6); }
    this.verb = c.createConvolver(); this.verb.buffer = ir;
    const vg = c.createGain(); vg.gain.value = 0.9; this.verb.connect(vg); vg.connect(this.music);
    this.delay = c.createDelay(1.0); this.delay.delayTime.value = 0.42;
    const fb = c.createGain(); fb.gain.value = 0.38; this.delay.connect(fb); fb.connect(this.delay);
    const dl = c.createGain(); dl.gain.value = 0.5; this.delay.connect(dl); dl.connect(this.verb); dl.connect(this.music);
    this.startEngine();
    this.nextChord = c.currentTime + 0.2; this.nextArp = c.currentTime + 1; this.nextBeat = c.currentTime + 0.5;
    this.schedId = setInterval(() => this.schedule(), 120);
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  setOn(v) { this.on = v; if (this.master) this.master.gain.setTargetAtTime(v ? 1 : 0, this.ctx.currentTime, 0.05); },
  setVol(s, m) { this.sfxVol = s; this.musVol = m; if (this.sfx) { this.sfx.gain.value = s; this.music.gain.value = m * 0.55; } },
  ok(name, gap) { const t = performance.now(); if (this.last[name] && t - this.last[name] < gap) return false; this.last[name] = t; return true; },
  env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); },
  osc(type, f0, f1, t, dur, peak, dest, filt) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    this.env(g, t, Math.min(0.005, dur * 0.2), peak, dur);
    if (filt) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filt; o.connect(f); f.connect(g); } else o.connect(g);
    g.connect(dest || this.sfx); o.start(t); o.stop(t + dur + 0.05);
    return o;
  },
  nz(t, dur, peak, type, f0, f1, q = 1, dest) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; s.loop = true;
    f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(f1, 10), t + dur);
    this.env(g, t, 0.004, peak, dur);
    s.connect(f); f.connect(g); g.connect(dest || this.sfx);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  },
  play(name, k = 1) {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime + 0.005;
    switch (name) {
      case 'pulse': if (!this.ok(name, 45)) return; this.osc('square', 1500 * rand(0.95, 1.05), 260, t, 0.07, 0.045, null, 3200); break;
      case 'scatter': if (!this.ok(name, 60)) return; this.nz(t, 0.14, 0.16, 'bandpass', 1600, 500, 0.8); this.osc('sine', 180, 55, t, 0.12, 0.2); break;
      case 'plasma': if (!this.ok(name, 60)) return; this.osc('sine', 420, 90, t, 0.28, 0.16); this.osc('sawtooth', 210, 60, t, 0.22, 0.06, null, 900); break;
      case 'arc': if (!this.ok(name, 70)) return; this.nz(t, 0.16, 0.1, 'bandpass', 3800, 1800, 3); this.osc('sawtooth', 2600, 500, t, 0.1, 0.03, null, 5000); break;
      case 'rail': if (!this.ok(name, 80)) return; this.nz(t, 0.3, 0.13, 'highpass', 3000, 900, 1); this.osc('sine', 2200, 70, t, 0.4, 0.2); this.osc('square', 90, 40, t, 0.25, 0.08, null, 400); break;
      case 'missile': if (!this.ok(name, 80)) return; this.nz(t, 0.45, 0.1, 'bandpass', 500, 2200, 1.5); break;
      case 'explode': {
        if (!this.ok(name + (k > 2 ? 'b' : ''), 50)) return;
        const s = clamp(k, 0.4, 4);
        this.nz(t, 0.5 + s * 0.25, 0.22 + s * 0.06, 'lowpass', 1400 + s * 600, 90, 0.7);
        this.osc('sine', 110, 28, t, 0.35 + s * 0.15, 0.25 + s * 0.05);
        break;
      }
      case 'hit': if (!this.ok(name, 40)) return; this.osc('square', 1700, 1100, t, 0.03, 0.025, null, 4000); break;
      case 'phit': if (!this.ok(name, 90)) return; this.osc('sine', 700, 260, t, 0.14, 0.12); this.nz(t, 0.1, 0.06, 'bandpass', 2400, 1200, 2); break;
      case 'hhit': if (!this.ok(name, 110)) return; this.nz(t, 0.2, 0.2, 'lowpass', 900, 200, 1); this.osc('square', 120, 60, t, 0.16, 0.08, null, 500); break;
      case 'credit': if (!this.ok(name, 50)) return; this.osc('sine', 1320 * rand(0.98, 1.06), 1980, t, 0.07, 0.035); break;
      case 'pickup': if (!this.ok(name, 80)) return; [880, 1175, 1568].forEach((f, i) => this.osc('triangle', f, f, t + i * 0.055, 0.12, 0.07)); break;
      case 'weapon': [523, 659, 784, 1047, 1319].forEach((f, i) => this.osc('triangle', f, f, t + i * 0.075, 0.3, 0.09)); this.osc('sine', 131, 131, t, 0.6, 0.12); break;
      case 'levelup': [392, 494, 587, 784, 988].forEach((f, i) => this.osc('triangle', f, f, t + i * 0.09, 0.45, 0.08)); [196, 294].forEach((f) => this.osc('sine', f, f, t + 0.36, 0.9, 0.07)); break;
      case 'warp': {
        const c = this.ctx, o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(60, t); o.frequency.exponentialRampToValueAtTime(900, t + 2.8);
        f.type = 'lowpass'; f.frequency.setValueAtTime(200, t); f.frequency.exponentialRampToValueAtTime(5000, t + 2.8);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 2.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
        o.connect(f); f.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + 3.3);
        this.nz(t + 1.6, 1.6, 0.2, 'bandpass', 300, 3000, 0.8);
        break;
      }
      case 'warpout': this.nz(t, 1.4, 0.28, 'lowpass', 3000, 80, 0.7); this.osc('sine', 80, 30, t, 1.0, 0.3); break;
      case 'nova': this.nz(t, 1.8, 0.35, 'lowpass', 4000, 60, 0.6); this.osc('sine', 70, 22, t, 1.4, 0.4); this.osc('sawtooth', 300, 40, t, 0.9, 0.08, null, 1200); break;
      case 'dock': [659, 880, 1109].forEach((f, i) => this.osc('sine', f, f, t + i * 0.12, 0.7, 0.07)); break;
      case 'alarm': if (!this.ok(name, 1400)) return; this.osc('square', 880, 880, t, 0.09, 0.04, null, 2000); this.osc('square', 660, 660, t + 0.14, 0.09, 0.04, null, 2000); break;
      case 'ui': if (!this.ok(name, 40)) return; this.osc('sine', 1100, 900, t, 0.04, 0.04); break;
      case 'deny': this.osc('square', 220, 160, t, 0.12, 0.05, null, 900); break;
      case 'boss': this.osc('sawtooth', 55, 52, t, 2.4, 0.16, null, 600); this.osc('sawtooth', 82.4, 80, t + 0.05, 2.4, 0.1, null, 500); this.nz(t, 2.2, 0.08, 'lowpass', 400, 80, 1); break;
      case 'charge': this.osc('sawtooth', 120, 900, t, 1.0, 0.05, null, 2400); break;
      case 'shieldup': this.osc('sine', 300, 1200, t, 0.35, 0.08); break;
      case 'discover': [587, 740, 880, 1175].forEach((f, i) => this.osc('sine', f, f, t + i * 0.1, 0.8, 0.06)); break;
    }
  },
  startEngine() {
    const c = this.ctx, o1 = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o1.type = 'sawtooth'; o1.frequency.value = 48; o2.type = 'sawtooth'; o2.frequency.value = 72.5;
    f.type = 'lowpass'; f.frequency.value = 220; f.Q.value = 2;
    g.gain.value = 0;
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(this.sfx); o1.start(); o2.start();
    const ns = c.createBufferSource(); ns.buffer = this.noise; ns.loop = true;
    const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 900; nf.Q.value = 0.7;
    const ng = c.createGain(); ng.gain.value = 0;
    ns.connect(nf); nf.connect(ng); ng.connect(this.sfx); ns.start();
    this.engine = { o1, o2, f, g, nf, ng };
  },
  setEngine(speed01, boost, active) {
    if (!this.engine) return;
    const e = this.engine, t = this.ctx.currentTime;
    const a = active ? 1 : 0;
    e.g.gain.setTargetAtTime(a * (0.022 + speed01 * 0.03), t, 0.1);
    e.f.frequency.setTargetAtTime(160 + speed01 * 900, t, 0.1);
    e.o1.frequency.setTargetAtTime(44 + speed01 * 30, t, 0.2); e.o2.frequency.setTargetAtTime(66 + speed01 * 45, t, 0.2);
    e.ng.gain.setTargetAtTime(a * boost * 0.07, t, 0.12);
    e.nf.frequency.setTargetAtTime(600 + boost * 1800, t, 0.2);
  },
  beamOn(on) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    if (on && !this.beam) {
      const o = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
      o.type = 'sawtooth'; o.frequency.value = 110; o2.type = 'square'; o2.frequency.value = 221;
      f.type = 'lowpass'; f.frequency.value = 1500; lfo.frequency.value = 26; lg.gain.value = 0.025;
      lfo.connect(lg); lg.connect(g.gain);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.06);
      o.connect(f); o2.connect(f); f.connect(g); g.connect(this.sfx); o.start(); o2.start(); lfo.start();
      this.beam = { o, o2, g, lfo };
    } else if (!on && this.beam) {
      const b = this.beam; this.beam = null;
      b.g.gain.cancelScheduledValues(t); b.g.gain.setTargetAtTime(0.0001, t, 0.03);
      b.o.stop(t + 0.2); b.o2.stop(t + 0.2); b.lfo.stop(t + 0.2);
    }
  },
  // ─── generative music ───
  CHORDS: [[57, 64, 67, 71, 74], [53, 60, 64, 67, 72], [48, 55, 59, 64, 67], [55, 62, 64, 67, 71]],
  BOSS: [[50, 57, 62, 65], [46, 53, 58, 62], [43, 50, 55, 58], [45, 52, 57, 61]],
  mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); },
  schedule() {
    const c = this.ctx; if (!c || c.state !== 'running') return;
    const now = c.currentTime, ahead = now + 0.3;
    const prog = this.bossMode ? this.BOSS : this.CHORDS;
    while (this.nextChord < ahead) {
      const ch = prog[this.chordI % prog.length];
      this.pad(ch, this.nextChord, this.bossMode ? 6 : 9);
      this.curChord = ch;
      this.chordI++;
      this.nextChord += this.bossMode ? 6 : 9;
    }
    while (this.nextArp < ahead) {
      if (this.curChord && Math.random() < 0.55) {
        const n = pick(this.curChord) + (Math.random() < 0.5 ? 12 : 24);
        this.pluck(this.mtof(n), this.nextArp, 0.035);
      }
      this.nextArp += this.bossMode ? 0.27 : 0.42;
    }
    const tempo = 60 / 112;
    while (this.nextBeat < ahead) {
      const k = this.combat;
      if (k > 0.05 && this.curChord) {
        const b = this.beat % 8;
        const root = this.curChord[0] - 12;
        this.bass(this.mtof(root + (b === 6 ? 7 : 0)), this.nextBeat, 0.09 * k);
        if (b % 2 === 1) this.hat(this.nextBeat, 0.03 * k);
        if (b === 0 || b === 4) this.kick(this.nextBeat, 0.16 * k);
      }
      this.beat++;
      this.nextBeat += tempo / 2;
    }
  },
  pad(notes, t, dur) {
    const c = this.ctx;
    for (const m of notes) {
      const f = this.mtof(m);
      const g = c.createGain(), flt = c.createBiquadFilter();
      flt.type = 'lowpass'; flt.frequency.setValueAtTime(500, t); flt.frequency.linearRampToValueAtTime(1100, t + dur * 0.5); flt.frequency.linearRampToValueAtTime(600, t + dur + 2);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.022, t + 2.2); g.gain.setValueAtTime(0.022, t + dur - 0.5); g.gain.linearRampToValueAtTime(0.0001, t + dur + 2.5);
      for (const det of [-6, 7]) {
        const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
        o.connect(flt); o.start(t); o.stop(t + dur + 2.6);
      }
      flt.connect(g); g.connect(this.verb); g.connect(this.music);
    }
  },
  pluck(f, t, v) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    o.connect(g); g.connect(this.delay); g.connect(this.music); o.start(t); o.stop(t + 1.3);
  },
  bass(f, t, v) {
    const c = this.ctx, o = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.setValueAtTime(700, t); fl.frequency.exponentialRampToValueAtTime(140, t + 0.22);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
    o.connect(fl); fl.connect(g); g.connect(this.music); o.start(t); o.stop(t + 0.3);
  },
  hat(t, v) { this.nz(t, 0.05, v, 'highpass', 7000, 7000, 1, this.music); },
  kick(t, v) { this.osc('sine', 120, 40, t, 0.22, v, this.music); },
};
