'use strict';
// ───────────────────────────── math & utilities ─────────────────────────────
const PI = Math.PI, TAU = Math.PI * 2, DEG = Math.PI / 180;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const invLerp = (a, b, v) => clamp((v - a) / (b - a), 0, 1);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const chance = (p) => Math.random() < p;
const fmt = (n) => Math.round(n).toLocaleString('en-US');

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

class RNG {
  constructor(seed) { this.s = (seed >>> 0) || 1; }
  next() {
    this.s = (this.s + 0x6D2B79F5) | 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a, b) { return a + this.next() * (b - a); }
  int(a, b) { return Math.floor(a + this.next() * (b - a + 1)); }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  chance(p) { return this.next() < p; }
}

// colours: hex → linear rgb array
function srgbArr(h) { return [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255]; }
function linArr(h, mul = 1) { const c = srgbArr(h); return [Math.pow(c[0], 2.2) * mul, Math.pow(c[1], 2.2) * mul, Math.pow(c[2], 2.2) * mul]; }
function mixArr(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
function scaleArr(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
function cssRgb(a) { // linear → css srgb
  const f = (v) => Math.round(clamp(Math.pow(clamp(v, 0, 1), 1 / 2.2), 0, 1) * 255);
  return `rgb(${f(a[0])},${f(a[1])},${f(a[2])})`;
}

class V3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  clone() { return new V3(this.x, this.y, this.z); }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
  addVectors(a, b) { this.x = a.x + b.x; this.y = a.y + b.y; this.z = a.z + b.z; return this; }
  subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this; }
  scale(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
  addScaled(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
  dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
  crossVectors(a, b) {
    const ax = a.x, ay = a.y, az = a.z, bx = b.x, by = b.y, bz = b.z;
    this.x = ay * bz - az * by; this.y = az * bx - ax * bz; this.z = ax * by - ay * bx; return this;
  }
  len() { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); }
  lenSq() { return this.x * this.x + this.y * this.y + this.z * this.z; }
  normalize() { const l = this.len(); if (l > 1e-12) { this.x /= l; this.y /= l; this.z /= l; } return this; }
  setLen(l) { return this.normalize().scale(l); }
  clampLen(m) { const l = this.len(); if (l > m) this.scale(m / l); return this; }
  dist(v) { const dx = this.x - v.x, dy = this.y - v.y, dz = this.z - v.z; return Math.sqrt(dx * dx + dy * dy + dz * dz); }
  distSq(v) { const dx = this.x - v.x, dy = this.y - v.y, dz = this.z - v.z; return dx * dx + dy * dy + dz * dz; }
  lerp(v, t) { this.x += (v.x - this.x) * t; this.y += (v.y - this.y) * t; this.z += (v.z - this.z) * t; return this; }
  negate() { this.x = -this.x; this.y = -this.y; this.z = -this.z; return this; }
  applyQuat(q) {
    const x = this.x, y = this.y, z = this.z, qx = q.x, qy = q.y, qz = q.z, qw = q.w;
    const tx = 2 * (qy * z - qz * y), ty = 2 * (qz * x - qx * z), tz = 2 * (qx * y - qy * x);
    this.x = x + qw * tx + qy * tz - qz * ty;
    this.y = y + qw * ty + qz * tx - qx * tz;
    this.z = z + qw * tz + qx * ty - qy * tx;
    return this;
  }
  randomUnit(r = Math.random) {
    const u = r() * 2 - 1, t = r() * TAU, s = Math.sqrt(1 - u * u);
    return this.set(s * Math.cos(t), u, s * Math.sin(t));
  }
  // random vector perpendicular to n (unit)
  randomPerp(n) {
    const a = Math.abs(n.x) < 0.9 ? new V3(1, 0, 0) : new V3(0, 1, 0);
    const p = new V3().crossVectors(n, a).normalize();
    const q = new V3().crossVectors(n, p);
    const t = Math.random() * TAU;
    return this.set(p.x * Math.cos(t) + q.x * Math.sin(t), p.y * Math.cos(t) + q.y * Math.sin(t), p.z * Math.cos(t) + q.z * Math.sin(t));
  }
}

class Quat {
  constructor(x = 0, y = 0, z = 0, w = 1) { this.x = x; this.y = y; this.z = z; this.w = w; }
  set(x, y, z, w) { this.x = x; this.y = y; this.z = z; this.w = w; return this; }
  copy(q) { this.x = q.x; this.y = q.y; this.z = q.z; this.w = q.w; return this; }
  clone() { return new Quat(this.x, this.y, this.z, this.w); }
  identity() { return this.set(0, 0, 0, 1); }
  setAxisAngle(a, ang) { const h = ang / 2, s = Math.sin(h); this.x = a.x * s; this.y = a.y * s; this.z = a.z * s; this.w = Math.cos(h); return this; }
  multiplyQuats(a, b) {
    const ax = a.x, ay = a.y, az = a.z, aw = a.w, bx = b.x, by = b.y, bz = b.z, bw = b.w;
    this.x = ax * bw + aw * bx + ay * bz - az * by;
    this.y = ay * bw + aw * by + az * bx - ax * bz;
    this.z = az * bw + aw * bz + ax * by - ay * bx;
    this.w = aw * bw - ax * bx - ay * by - az * bz;
    return this;
  }
  multiply(q) { return this.multiplyQuats(this, q); }
  premultiply(q) { return this.multiplyQuats(q, this); }
  normalize() { let l = Math.hypot(this.x, this.y, this.z, this.w); if (l < 1e-12) return this.identity(); l = 1 / l; this.x *= l; this.y *= l; this.z *= l; this.w *= l; return this; }
  conjugate() { this.x = -this.x; this.y = -this.y; this.z = -this.z; return this; }
  slerp(qb, t) {
    if (t <= 0) return this; if (t >= 1) return this.copy(qb);
    const x = this.x, y = this.y, z = this.z, w = this.w;
    let cos = w * qb.w + x * qb.x + y * qb.y + z * qb.z;
    let bx = qb.x, by = qb.y, bz = qb.z, bw = qb.w;
    if (cos < 0) { cos = -cos; bx = -bx; by = -by; bz = -bz; bw = -bw; }
    if (cos > 0.9995) {
      this.x = x + (bx - x) * t; this.y = y + (by - y) * t; this.z = z + (bz - z) * t; this.w = w + (bw - w) * t;
      return this.normalize();
    }
    const th = Math.acos(cos), s = Math.sin(th);
    const ra = Math.sin((1 - t) * th) / s, rb = Math.sin(t * th) / s;
    this.x = x * ra + bx * rb; this.y = y * ra + by * rb; this.z = z * ra + bz * rb; this.w = w * ra + bw * rb;
    return this;
  }
  setFromUnitVectors(f, t) {
    let r = f.x * t.x + f.y * t.y + f.z * t.z + 1;
    if (r < 1e-6) {
      r = 0;
      if (Math.abs(f.x) > Math.abs(f.z)) { this.x = -f.y; this.y = f.x; this.z = 0; this.w = r; }
      else { this.x = 0; this.y = -f.z; this.z = f.y; this.w = r; }
    } else {
      this.x = f.y * t.z - f.z * t.y; this.y = f.z * t.x - f.x * t.z; this.z = f.x * t.y - f.y * t.x; this.w = r;
    }
    return this.normalize();
  }
  // rotation whose local -Z points along fwd and local +Y is close to up
  lookRotation(fwd, up) {
    const zx = -fwd.x, zy = -fwd.y, zz = -fwd.z;
    let zl = Math.hypot(zx, zy, zz) || 1;
    const Z = [zx / zl, zy / zl, zz / zl];
    let X = [up.y * Z[2] - up.z * Z[1], up.z * Z[0] - up.x * Z[2], up.x * Z[1] - up.y * Z[0]];
    let xl = Math.hypot(X[0], X[1], X[2]);
    if (xl < 1e-6) { // up parallel to fwd
      const alt = Math.abs(Z[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      X = [alt[1] * Z[2] - alt[2] * Z[1], alt[2] * Z[0] - alt[0] * Z[2], alt[0] * Z[1] - alt[1] * Z[0]];
      xl = Math.hypot(X[0], X[1], X[2]);
    }
    X = [X[0] / xl, X[1] / xl, X[2] / xl];
    const Y = [Z[1] * X[2] - Z[2] * X[1], Z[2] * X[0] - Z[0] * X[2], Z[0] * X[1] - Z[1] * X[0]];
    return this.setFromBasis(X, Y, Z);
  }
  setFromBasis(X, Y, Z) {
    const m11 = X[0], m12 = Y[0], m13 = Z[0], m21 = X[1], m22 = Y[1], m23 = Z[1], m31 = X[2], m32 = Y[2], m33 = Z[2];
    const tr = m11 + m22 + m33;
    if (tr > 0) { const s = 0.5 / Math.sqrt(tr + 1); this.w = 0.25 / s; this.x = (m32 - m23) * s; this.y = (m13 - m31) * s; this.z = (m21 - m12) * s; }
    else if (m11 > m22 && m11 > m33) { const s = 2 * Math.sqrt(1 + m11 - m22 - m33); this.w = (m32 - m23) / s; this.x = 0.25 * s; this.y = (m12 + m21) / s; this.z = (m13 + m31) / s; }
    else if (m22 > m33) { const s = 2 * Math.sqrt(1 + m22 - m11 - m33); this.w = (m13 - m31) / s; this.x = (m12 + m21) / s; this.y = 0.25 * s; this.z = (m23 + m32) / s; }
    else { const s = 2 * Math.sqrt(1 + m33 - m11 - m22); this.w = (m21 - m12) / s; this.x = (m13 + m31) / s; this.y = (m23 + m32) / s; this.z = 0.25 * s; }
    return this.normalize();
  }
  setEuler(x, y, z) { // XYZ order
    const c1 = Math.cos(x / 2), c2 = Math.cos(y / 2), c3 = Math.cos(z / 2), s1 = Math.sin(x / 2), s2 = Math.sin(y / 2), s3 = Math.sin(z / 2);
    this.x = s1 * c2 * c3 + c1 * s2 * s3; this.y = c1 * s2 * c3 - s1 * c2 * s3; this.z = c1 * c2 * s3 + s1 * s2 * c3; this.w = c1 * c2 * c3 - s1 * s2 * s3;
    return this;
  }
}

// rotate a vector toward a target direction by at most maxAng radians (both unit); writes into out
function rotateToward(out, from, to, maxAng) {
  const d = clamp(from.dot(to), -1, 1);
  const ang = Math.acos(d);
  if (ang <= maxAng || ang < 1e-5) return out.copy(to);
  const t = maxAng / ang;
  // slerp between vectors
  const s = Math.sin(ang);
  if (s < 1e-4) { // opposite: pick any perpendicular
    out.randomPerp(from); return out;
  }
  const a = Math.sin((1 - t) * ang) / s, b = Math.sin(t * ang) / s;
  return out.set(from.x * a + to.x * b, from.y * a + to.y * b, from.z * a + to.z * b).normalize();
}

// closest-approach distance squared between segment p0→p1 and point c
function segPointDistSq(p0x, p0y, p0z, p1x, p1y, p1z, cx, cy, cz) {
  const dx = p1x - p0x, dy = p1y - p0y, dz = p1z - p0z;
  const l2 = dx * dx + dy * dy + dz * dz;
  let t = 0;
  if (l2 > 1e-9) t = clamp(((cx - p0x) * dx + (cy - p0y) * dy + (cz - p0z) * dz) / l2, 0, 1);
  const qx = p0x + dx * t - cx, qy = p0y + dy * t - cy, qz = p0z + dz * t - cz;
  return qx * qx + qy * qy + qz * qz;
}
// ray (origin o, unit dir d) vs sphere: returns distance along ray or -1
function raySphere(ox, oy, oz, dx, dy, dz, cx, cy, cz, r) {
  const lx = ox - cx, ly = oy - cy, lz = oz - cz;
  const b = lx * dx + ly * dy + lz * dz;
  const c = lx * lx + ly * ly + lz * lz - r * r;
  const h = b * b - c;
  if (h < 0) return -1;
  const s = Math.sqrt(h);
  const t = -b - s;
  if (t >= 0) return t;
  if (-b + s >= 0) return 0; // inside
  return -1;
}

// ─── 4x4 matrices (column-major Float32Array) ───
const M4 = {
  create() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
  perspective(o, fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    o.fill(0); o[0] = f / aspect; o[5] = f; o[10] = (far + near) * nf; o[11] = -1; o[14] = 2 * far * near * nf; return o;
  },
  multiply(o, a, b) {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
      a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    for (let i = 0; i < 4; i++) {
      const b0 = b[i * 4], b1 = b[i * 4 + 1], b2 = b[i * 4 + 2], b3 = b[i * 4 + 3];
      o[i * 4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      o[i * 4 + 1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      o[i * 4 + 2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      o[i * 4 + 3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    }
    return o;
  },
  // rotation (quat) + translation + scale
  compose(o, q, px, py, pz, sx, sy, sz) {
    const x = q.x, y = q.y, z = q.z, w = q.w, x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
    o[0] = (1 - (yy + zz)) * sx; o[1] = (xy + wz) * sx; o[2] = (xz - wy) * sx; o[3] = 0;
    o[4] = (xy - wz) * sy; o[5] = (1 - (xx + zz)) * sy; o[6] = (yz + wx) * sy; o[7] = 0;
    o[8] = (xz + wy) * sz; o[9] = (yz - wx) * sz; o[10] = (1 - (xx + yy)) * sz; o[11] = 0;
    o[12] = px; o[13] = py; o[14] = pz; o[15] = 1;
    return o;
  },
  invert(o, a) {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
      a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11,
      b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30,
      b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) return null;
    det = 1 / det;
    o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det; o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det; o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det; o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det; o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det; o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det; o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det; o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det; o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return o;
  },
};

// frustum from a view-projection matrix (camera-relative world space)
class Frustum {
  constructor() { this.p = new Float32Array(24); }
  set(m) {
    const p = this.p;
    const rows = (i) => [m[i], m[4 + i], m[8 + i], m[12 + i]];
    const r0 = rows(0), r1 = rows(1), r2 = rows(2), r3 = rows(3);
    const planes = [
      [r3[0] + r0[0], r3[1] + r0[1], r3[2] + r0[2], r3[3] + r0[3]],
      [r3[0] - r0[0], r3[1] - r0[1], r3[2] - r0[2], r3[3] - r0[3]],
      [r3[0] + r1[0], r3[1] + r1[1], r3[2] + r1[2], r3[3] + r1[3]],
      [r3[0] - r1[0], r3[1] - r1[1], r3[2] - r1[2], r3[3] - r1[3]],
      [r3[0] + r2[0], r3[1] + r2[1], r3[2] + r2[2], r3[3] + r2[3]],
      [r3[0] - r2[0], r3[1] - r2[1], r3[2] - r2[2], r3[3] - r2[3]],
    ];
    for (let i = 0; i < 6; i++) {
      const pl = planes[i], l = Math.hypot(pl[0], pl[1], pl[2]) || 1;
      p[i * 4] = pl[0] / l; p[i * 4 + 1] = pl[1] / l; p[i * 4 + 2] = pl[2] / l; p[i * 4 + 3] = pl[3] / l;
    }
  }
  sphere(x, y, z, r) { // camera-relative centre
    const p = this.p;
    for (let i = 0; i < 24; i += 4) if (p[i] * x + p[i + 1] * y + p[i + 2] * z + p[i + 3] < -r) return false;
    return true;
  }
}

// ─── CPU value noise (asteroid shapes etc.) ───
const noise3 = (() => {
  const perm = new Uint8Array(512), vals = new Float32Array(256);
  const r = new RNG(9001);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(r.next() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  for (let i = 0; i < 256; i++) vals[i] = r.next() * 2 - 1;
  const h = (x, y, z) => vals[perm[(perm[(perm[x & 255] + y) & 255] + z) & 255]];
  const f = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  return function (x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi, u = f(xf), v = f(yf), w = f(zf);
    const x0 = lerp(h(xi, yi, zi), h(xi + 1, yi, zi), u), x1 = lerp(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u);
    const x2 = lerp(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), x3 = lerp(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u);
    return lerp(lerp(x0, x1, v), lerp(x2, x3, v), w);
  };
})();
function fbm3(x, y, z, oct = 4) { let s = 0, a = 0.5; for (let i = 0; i < oct; i++) { s += a * noise3(x, y, z); x = x * 2.03 + 3.1; y = y * 2.03 + 1.7; z = z * 2.03 + 5.3; a *= 0.5; } return s; }

// shared scratch vectors (never hold references across calls)
const _v1 = new V3(), _v2 = new V3(), _v3 = new V3(), _v4 = new V3(), _v5 = new V3(), _v6 = new V3();
const _q1 = new Quat(), _q2 = new Quat(), _q3 = new Quat();
const AXIS_X = new V3(1, 0, 0), AXIS_Y = new V3(0, 1, 0), AXIS_Z = new V3(0, 0, 1);
