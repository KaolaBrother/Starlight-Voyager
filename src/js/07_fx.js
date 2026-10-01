// ───────────────────────────── particles & effects ─────────────────────────────
const PMAX = 5000;
const Parts = {
  n: 0,
  px: new Float64Array(PMAX), py: new Float64Array(PMAX), pz: new Float64Array(PMAX),
  vx: new Float32Array(PMAX), vy: new Float32Array(PMAX), vz: new Float32Array(PMAX),
  life: new Float32Array(PMAX), max: new Float32Array(PMAX), s0: new Float32Array(PMAX), s1: new Float32Array(PMAX),
  c0: new Float32Array(PMAX * 3), c1: new Float32Array(PMAX * 3), drag: new Float32Array(PMAX), shape: new Uint8Array(PMAX),
  st: new Float32Array(PMAX), a0: new Float32Array(PMAX), p1: new Float32Array(PMAX),
  spawn(x, y, z, vx, vy, vz, life, s0, s1, c0, c1, shape = 1, drag = 0, stretch = 0, a0 = 1, p1 = 0) {
    if (this.n >= PMAX) return;
    const i = this.n++;
    this.px[i] = x; this.py[i] = y; this.pz[i] = z; this.vx[i] = vx; this.vy[i] = vy; this.vz[i] = vz;
    this.life[i] = life; this.max[i] = life; this.s0[i] = s0; this.s1[i] = s1;
    this.c0[i * 3] = c0[0]; this.c0[i * 3 + 1] = c0[1]; this.c0[i * 3 + 2] = c0[2];
    this.c1[i * 3] = c1[0]; this.c1[i * 3 + 1] = c1[1]; this.c1[i * 3 + 2] = c1[2];
    this.shape[i] = shape; this.drag[i] = drag; this.st[i] = stretch; this.a0[i] = a0; this.p1[i] = p1;
  },
  kill(i) {
    const j = --this.n;
    if (i === j) return;
    this.px[i] = this.px[j]; this.py[i] = this.py[j]; this.pz[i] = this.pz[j];
    this.vx[i] = this.vx[j]; this.vy[i] = this.vy[j]; this.vz[i] = this.vz[j];
    this.life[i] = this.life[j]; this.max[i] = this.max[j]; this.s0[i] = this.s0[j]; this.s1[i] = this.s1[j];
    for (let k = 0; k < 3; k++) { this.c0[i * 3 + k] = this.c0[j * 3 + k]; this.c1[i * 3 + k] = this.c1[j * 3 + k]; }
    this.shape[i] = this.shape[j]; this.drag[i] = this.drag[j]; this.st[i] = this.st[j]; this.a0[i] = this.a0[j]; this.p1[i] = this.p1[j];
  },
  clear() { this.n = 0; },
  update(dt) {
    for (let i = this.n - 1; i >= 0; i--) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.kill(i); continue; }
      const d = this.drag[i];
      if (d > 0) { const k = Math.exp(-d * dt); this.vx[i] *= k; this.vy[i] *= k; this.vz[i] *= k; }
      this.px[i] += this.vx[i] * dt; this.py[i] += this.vy[i] * dt; this.pz[i] += this.vz[i] * dt;
    }
  },
  draw(fx) {
    const cx = R.cam.x, cy = R.cam.y, cz = R.cam.z;
    for (let i = 0; i < this.n; i++) {
      const t = 1 - this.life[i] / this.max[i];
      const s = lerp(this.s0[i], this.s1[i], t);
      const r = lerp(this.c0[i * 3], this.c1[i * 3], t), g = lerp(this.c0[i * 3 + 1], this.c1[i * 3 + 1], t), b = lerp(this.c0[i * 3 + 2], this.c1[i * 3 + 2], t);
      const fade = t < 0.08 ? t / 0.08 : Math.pow(1 - t, 1.3);
      const a = this.a0[i] * fade;
      const dx = this.px[i] - cx, dy = this.py[i] - cy, dz = this.pz[i] - cz;
      if (dx * dx + dy * dy + dz * dz > 25e6) continue;
      const st = this.st[i];
      if (st > 0) {
        const vx = this.vx[i], vy = this.vy[i], vz = this.vz[i], sp = Math.hypot(vx, vy, vz) || 1;
        fx.add(this.px[i], this.py[i], this.pz[i], vx / sp, vy / sp, vz / sp, sp * st, s, r, g, b, a, this.shape[i], this.p1[i]);
      } else fx.add(this.px[i], this.py[i], this.pz[i], 0, 0, 0, 0, s, r, g, b, a, this.shape[i], this.p1[i]);
    }
  },
};

const EXPCOL = {
  fire: { flash: [3, 2.4, 1.6], hot: [2.6, 1.3, 0.35], cool: [0.5, 0.1, 0.03], spark: [3, 2.0, 0.9], ring: [1.6, 0.7, 0.25] },
  void: { flash: [2.4, 1.6, 3], hot: [1.6, 0.5, 2.4], cool: [0.3, 0.05, 0.5], spark: [2.2, 1.2, 3], ring: [1.2, 0.4, 2.0] },
  hive: { flash: [2, 3, 1.4], hot: [0.8, 2.2, 0.3], cool: [0.1, 0.4, 0.05], spark: [1.4, 3, 0.6], ring: [0.5, 1.6, 0.3] },
  ice: { flash: [2, 2.6, 3], hot: [0.6, 1.6, 2.6], cool: [0.05, 0.2, 0.5], spark: [1.4, 2.4, 3], ring: [0.4, 1.2, 2.0] },
  gold: { flash: [3, 2.6, 1.6], hot: [2.6, 1.9, 0.6], cool: [0.6, 0.3, 0.05], spark: [3, 2.6, 1.2], ring: [2.0, 1.5, 0.5] },
  plasma: { flash: [2, 3, 1.6], hot: [0.6, 2.4, 0.5], cool: [0.05, 0.4, 0.08], spark: [1.4, 3, 1.0], ring: [0.4, 1.8, 0.4] },
};
const _rv = new V3();
function explode(pos, size, pal = 'fire', power = 1) {
  const P = EXPCOL[pal] || EXPCOL.fire, q = R.q.fx;
  Parts.spawn(pos.x, pos.y, pos.z, 0, 0, 0, 0.22, size * 3, size * 7, P.flash, P.hot, 1, 0, 0, 1);
  const nf = Math.round((10 + size * 1.2) * q * power);
  for (let i = 0; i < nf; i++) {
    _rv.randomUnit().scale(rand(3, 14) * Math.sqrt(size));
    Parts.spawn(pos.x, pos.y, pos.z, _rv.x, _rv.y, _rv.z, rand(0.45, 1.1), size * rand(0.7, 1.3), size * rand(1.8, 2.8), P.hot, P.cool, 1, 2.2, 0, 0.85);
  }
  const ns = Math.round((16 + size * 2) * q * power);
  for (let i = 0; i < ns; i++) {
    _rv.randomUnit().scale(rand(30, 110) * (0.6 + size * 0.08));
    Parts.spawn(pos.x, pos.y, pos.z, _rv.x, _rv.y, _rv.z, rand(0.35, 0.9), rand(0.18, 0.4) * (0.6 + size * 0.06), 0.05, P.spark, P.cool, 0, 1.4, 0.035, 1);
  }
  const ne = Math.round(6 * q * power);
  for (let i = 0; i < ne; i++) {
    _rv.randomUnit().scale(rand(8, 30));
    Parts.spawn(pos.x, pos.y, pos.z, _rv.x, _rv.y, _rv.z, rand(1.2, 2.4), rand(0.25, 0.5) * Math.sqrt(size), 0.1, P.spark, P.cool, 5, 0.6, 0, 1);
  }
  Parts.spawn(pos.x, pos.y, pos.z, 0, 0, 0, 0.55, size * 1.2, size * 9 * power, P.ring, P.cool, 2, 0, 0, 0.9, 0.1);
  const d = pos.dist(R.cam);
  Game.shake(clamp(size * 0.12 * power * (1 - d / 1400), 0, 1.2));
}
function sparks(pos, dir, n, col, spd = 60) {
  for (let i = 0; i < n; i++) {
    _rv.randomUnit().scale(0.8);
    if (dir) _rv.add(dir);
    _rv.normalize().scale(rand(0.4, 1) * spd);
    Parts.spawn(pos.x, pos.y, pos.z, _rv.x, _rv.y, _rv.z, rand(0.15, 0.4), rand(0.15, 0.3), 0.04, col, [col[0] * 0.3, col[1] * 0.3, col[2] * 0.3], 0, 2, 0.04, 1);
  }
}
function puff(pos, size, col, life = 0.4) {
  Parts.spawn(pos.x, pos.y, pos.z, 0, 0, 0, life, size, size * 2, col, [col[0] * 0.2, col[1] * 0.2, col[2] * 0.2], 1, 0, 0, 1);
}
function ringFx(pos, r0, r1, col, life = 0.6, th = 0.08) {
  Parts.spawn(pos.x, pos.y, pos.z, 0, 0, 0, life, r0, r1, col, [col[0] * 0.3, col[1] * 0.3, col[2] * 0.3], 2, 0, 0, 1, th);
}

// ─── speed dust & streaks around the camera ───
const Dust = {
  n: 220, p: null, half: 110,
  init() { this.p = new Float64Array(this.n * 3); for (let i = 0; i < this.n * 3; i++) this.p[i] = rand(-this.half, this.half); this.base = null; },
  draw(fx, vel, warp) {
    if (!this.base) { this.base = R.cam.clone(); for (let i = 0; i < this.n; i++) { this.p[i * 3] += R.cam.x; this.p[i * 3 + 1] += R.cam.y; this.p[i * 3 + 2] += R.cam.z; } }
    const h = this.half, H = h * 2, c = R.cam;
    const sp = vel.len();
    const dx = sp > 0.01 ? -vel.x / sp : 0, dy = sp > 0.01 ? -vel.y / sp : 0, dz = sp > 0.01 ? -vel.z / sp : 1;
    const len = clamp(sp * 0.03, 0.3, 40) + warp * 300;
    const alpha = clamp(0.25 + sp / 500, 0.25, 1) * (1 + warp);
    for (let i = 0; i < this.n; i++) {
      let x = this.p[i * 3], y = this.p[i * 3 + 1], z = this.p[i * 3 + 2];
      let rx = x - c.x, ry = y - c.y, rz = z - c.z;
      if (rx > h) x -= H * Math.ceil((rx - h) / H); else if (rx < -h) x += H * Math.ceil((-h - rx) / H);
      if (ry > h) y -= H * Math.ceil((ry - h) / H); else if (ry < -h) y += H * Math.ceil((-h - ry) / H);
      if (rz > h) z -= H * Math.ceil((rz - h) / H); else if (rz < -h) z += H * Math.ceil((-h - rz) / H);
      this.p[i * 3] = x; this.p[i * 3 + 1] = y; this.p[i * 3 + 2] = z;
      rx = x - c.x; ry = y - c.y; rz = z - c.z;
      const d = Math.sqrt(rx * rx + ry * ry + rz * rz);
      const a = smooth(4, 14, d) * smooth(h, h * 0.55, d) * alpha * 0.55;
      if (a < 0.02) continue;
      fx.add(x, y, z, dx, dy, dz, len, 0.09 + warp * 0.15, 0.75, 0.82, 1.0, a, 0);
    }
  },
};

// ─── damage numbers (DOM pool) ───
const DmgNums = {
  el: null, pool: [], i: 0, last: 0,
  init() { this.el = document.getElementById('dmg'); for (let k = 0; k < 28; k++) { const s = document.createElement('span'); s.className = 'dnum'; s.style.display = 'none'; this.el.appendChild(s); this.pool.push(s); } },
  show(pos, val, cls) {
    const pr = R.project(pos.x, pos.y, pos.z, _proj);
    if (pr.behind || pr.x < -40 || pr.y < -40 || pr.x > R.cssW + 40 || pr.y > R.cssH + 40) return;
    const s = this.pool[this.i]; this.i = (this.i + 1) % this.pool.length;
    s.className = 'dnum' + (cls ? ' ' + cls : '');
    s.textContent = typeof val === 'number' ? Math.round(val) : val;
    s.style.display = 'block';
    s.style.transform = `translate(${(pr.x + rand(-14, 14)).toFixed(0)}px, ${(pr.y - 10 + rand(-6, 6)).toFixed(0)}px) translate(-50%, -50%)`;
    s.style.animation = 'none'; void s.offsetWidth; s.style.animation = '';
  },
};
const _proj = { x: 0, y: 0, nx: 0, ny: 0, w: 0, behind: false };
