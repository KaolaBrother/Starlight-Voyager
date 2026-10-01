// ───────────────────────────── geometry ─────────────────────────────
function gSphere(ws = 32, hs = 16) {
  const pos = [], nrm = [], uv = [], idx = [];
  for (let iy = 0; iy <= hs; iy++) {
    const v = iy / hs, th = v * PI;
    for (let ix = 0; ix <= ws; ix++) {
      const u = ix / ws, ph = u * TAU;
      const x = -Math.cos(ph) * Math.sin(th), y = Math.cos(th), z = Math.sin(ph) * Math.sin(th);
      pos.push(x, y, z); nrm.push(x, y, z); uv.push(u, 1 - v);
    }
  }
  for (let iy = 0; iy < hs; iy++) for (let ix = 0; ix < ws; ix++) {
    const a = iy * (ws + 1) + ix + 1, b = iy * (ws + 1) + ix, c = (iy + 1) * (ws + 1) + ix, d = (iy + 1) * (ws + 1) + ix + 1;
    if (iy !== 0) idx.push(a, b, d);
    if (iy !== hs - 1) idx.push(b, c, d);
  }
  return { pos, nrm, uv, idx };
}

function gBox(w = 1, h = 1, d = 1) {
  const pos = [], nrm = [], uv = [], idx = [];
  const face = (cx, cy, cz, ux, uy, uz, vx, vy, vz, nx, ny, nz) => {
    const b = pos.length / 3;
    const c = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (const [a, e] of c) {
      pos.push(cx + ux * a + vx * e, cy + uy * a + vy * e, cz + uz * a + vz * e);
      nrm.push(nx, ny, nz); uv.push((a + 1) / 2, (e + 1) / 2);
    }
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  };
  const x = w / 2, y = h / 2, z = d / 2;
  face(x, 0, 0, 0, 0, -z, 0, y, 0, 1, 0, 0);
  face(-x, 0, 0, 0, 0, z, 0, y, 0, -1, 0, 0);
  face(0, y, 0, x, 0, 0, 0, 0, -z, 0, 1, 0);
  face(0, -y, 0, x, 0, 0, 0, 0, z, 0, -1, 0);
  face(0, 0, z, x, 0, 0, 0, y, 0, 0, 0, 1);
  face(0, 0, -z, -x, 0, 0, 0, y, 0, 0, 0, -1);
  return { pos, nrm, uv, idx };
}

// cylinder along Y (top at +h/2)
function gCyl(rt, rb, h, seg = 12, caps = true) {
  const pos = [], nrm = [], uv = [], idx = [];
  const hh = h / 2, slope = (rb - rt) / h;
  const grid = [];
  for (let y = 0; y <= 1; y++) {
    const row = [], r = y === 0 ? rt : rb;
    for (let x = 0; x <= seg; x++) {
      const u = x / seg, th = u * TAU, s = Math.sin(th), c = Math.cos(th);
      pos.push(r * s, y === 0 ? hh : -hh, r * c);
      const l = Math.hypot(s, slope, c);
      nrm.push(s / l, slope / l, c / l); uv.push(u, 1 - y);
      row.push(pos.length / 3 - 1);
    }
    grid.push(row);
  }
  for (let x = 0; x < seg; x++) {
    const a = grid[0][x], b = grid[1][x], c = grid[1][x + 1], d = grid[0][x + 1];
    idx.push(a, b, d, b, c, d);
  }
  if (caps) {
    for (const top of [true, false]) {
      const r = top ? rt : rb; if (r <= 0) continue;
      const sign = top ? 1 : -1, cs = pos.length / 3;
      for (let x = 1; x <= seg; x++) { pos.push(0, hh * sign, 0); nrm.push(0, sign, 0); uv.push(0.5, 0.5); }
      const ring = pos.length / 3;
      for (let x = 0; x <= seg; x++) {
        const th = x / seg * TAU;
        pos.push(r * Math.sin(th), hh * sign, r * Math.cos(th)); nrm.push(0, sign, 0); uv.push(0, 0);
      }
      for (let x = 0; x < seg; x++) {
        const c = cs + x, i = ring + x;
        if (top) idx.push(i, i + 1, c); else idx.push(i + 1, i, c);
      }
    }
  }
  return { pos, nrm, uv, idx };
}

// torus in XY plane around Z
function gTorus(R, r, rs = 8, ts = 24, arc = TAU) {
  const pos = [], nrm = [], uv = [], idx = [];
  for (let j = 0; j <= rs; j++) for (let i = 0; i <= ts; i++) {
    const u = i / ts * arc, v = j / rs * TAU;
    const x = (R + r * Math.cos(v)) * Math.cos(u), y = (R + r * Math.cos(v)) * Math.sin(u), z = r * Math.sin(v);
    pos.push(x, y, z);
    const cx = R * Math.cos(u), cy = R * Math.sin(u);
    const l = Math.hypot(x - cx, y - cy, z) || 1;
    nrm.push((x - cx) / l, (y - cy) / l, z / l); uv.push(i / ts, j / rs);
  }
  for (let j = 1; j <= rs; j++) for (let i = 1; i <= ts; i++) {
    const a = (ts + 1) * j + i - 1, b = (ts + 1) * (j - 1) + i - 1, c = (ts + 1) * (j - 1) + i, d = (ts + 1) * j + i;
    idx.push(a, b, d, b, c, d);
  }
  return { pos, nrm, uv, idx };
}

// flat annulus in XZ plane (uv.x radial, uv.y around)
function gRing(inner, outer, seg = 128, rad = 2) {
  const pos = [], nrm = [], uv = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const a = i / seg * TAU, c = Math.cos(a), s = Math.sin(a);
    for (let j = 0; j <= rad; j++) {
      const t = j / rad, r = lerp(inner, outer, t);
      pos.push(c * r, 0, s * r); nrm.push(0, 1, 0); uv.push(t, i / seg);
    }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < rad; j++) {
    const a = i * (rad + 1) + j, b = a + 1, c = a + rad + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  return { pos, nrm, uv, idx };
}

function gIco(detail = 0) {
  const t = (1 + Math.sqrt(5)) / 2;
  let verts = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]]
    .map((v) => { const l = Math.hypot(...v); return [v[0] / l, v[1] / l, v[2] / l]; });
  let faces = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  for (let d = 0; d < detail; d++) {
    const cache = new Map(), nf = [];
    const mid = (a, b) => {
      const k = a < b ? a + '_' + b : b + '_' + a;
      if (cache.has(k)) return cache.get(k);
      const va = verts[a], vb = verts[b];
      const m = [(va[0] + vb[0]) / 2, (va[1] + vb[1]) / 2, (va[2] + vb[2]) / 2], l = Math.hypot(...m);
      verts.push([m[0] / l, m[1] / l, m[2] / l]); cache.set(k, verts.length - 1); return verts.length - 1;
    };
    for (const [a, b, c] of faces) { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); nf.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); }
    faces = nf;
  }
  const pos = [], nrm = [], uv = [], idx = [];
  for (const v of verts) { pos.push(v[0], v[1], v[2]); nrm.push(v[0], v[1], v[2]); uv.push(0, 0); }
  for (const f of faces) idx.push(f[0], f[1], f[2]);
  return { pos, nrm, uv, idx };
}

function gOcta() {
  const v = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const f = [[0, 2, 4], [4, 2, 1], [1, 2, 5], [5, 2, 0], [4, 3, 0], [1, 3, 4], [5, 3, 1], [0, 3, 5]];
  const pos = [], nrm = [], uv = [], idx = [];
  for (const p of v) { pos.push(...p); nrm.push(...p); uv.push(0, 0); }
  for (const t of f) idx.push(...t);
  return { pos, nrm, uv, idx };
}

// convex polygon (x,z points) extruded along Y
function gSlab(pts, th) {
  const pos = [], nrm = [], uv = [], idx = [];
  const n = pts.length, h = th / 2;
  // top and bottom fans
  for (const s of [1, -1]) {
    const b = pos.length / 3;
    for (const [x, z] of pts) { pos.push(x, h * s, z); nrm.push(0, s, 0); uv.push(0, 0); }
    for (let i = 1; i < n - 1; i++) idx.push(b, b + i, b + i + 1);
  }
  // sides
  let cx = 0, cz = 0; for (const [x, z] of pts) { cx += x / n; cz += z / n; }
  for (let i = 0; i < n; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[(i + 1) % n];
    let nx = z1 - z0, nz = -(x1 - x0); const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l;
    if (nx * ((x0 + x1) / 2 - cx) + nz * ((z0 + z1) / 2 - cz) < 0) { nx = -nx; nz = -nz; }
    const b = pos.length / 3;
    pos.push(x0, h, z0, x1, h, z1, x1, -h, z1, x0, -h, z0);
    for (let k = 0; k < 4; k++) { nrm.push(nx, 0, nz); uv.push(0, 0); }
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  return { pos, nrm, uv, idx };
}

// fix triangle winding so faces are CCW when seen from the side their normals point to
function fixWinding(pos, nrm, idx) {
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    const nx = nrm[a] + nrm[b] + nrm[c], ny = nrm[a + 1] + nrm[b + 1] + nrm[c + 1], nz = nrm[a + 2] + nrm[b + 2] + nrm[c + 2];
    if (fx * nx + fy * ny + fz * nz < 0) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  }
}
// un-index and use face normals (faceted look)
function flatten(g) {
  const pos = [], nrm = [], uv = [], idx = [];
  for (let i = 0; i < g.idx.length; i += 3) {
    const ia = g.idx[i], ib = g.idx[i + 1], ic = g.idx[i + 2];
    const A = [g.pos[ia * 3], g.pos[ia * 3 + 1], g.pos[ia * 3 + 2]], B = [g.pos[ib * 3], g.pos[ib * 3 + 1], g.pos[ib * 3 + 2]], C = [g.pos[ic * 3], g.pos[ic * 3 + 1], g.pos[ic * 3 + 2]];
    const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
    let fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    const l = Math.hypot(fx, fy, fz) || 1; fx /= l; fy /= l; fz /= l;
    // orient by the source vertex normals so faces always point outward
    const sx = g.nrm[ia * 3] + g.nrm[ib * 3] + g.nrm[ic * 3], sy = g.nrm[ia * 3 + 1] + g.nrm[ib * 3 + 1] + g.nrm[ic * 3 + 1], sz = g.nrm[ia * 3 + 2] + g.nrm[ib * 3 + 2] + g.nrm[ic * 3 + 2];
    if (fx * sx + fy * sy + fz * sz < 0) { fx = -fx; fy = -fy; fz = -fz; }
    const b = pos.length / 3;
    pos.push(...A, ...B, ...C);
    for (let k = 0; k < 3; k++) nrm.push(fx, fy, fz);
    uv.push(g.uv ? g.uv[ia * 2] : 0, g.uv ? g.uv[ia * 2 + 1] : 0, g.uv ? g.uv[ib * 2] : 0, g.uv ? g.uv[ib * 2 + 1] : 0, g.uv ? g.uv[ic * 2] : 0, g.uv ? g.uv[ic * 2 + 1] : 0);
    idx.push(b, b + 1, b + 2);
  }
  return { pos, nrm, uv, idx };
}
// displace vertices along normal with a function (for asteroids/boss rocks)
function displace(g, fn) {
  for (let i = 0; i < g.pos.length; i += 3) {
    const x = g.pos[i], y = g.pos[i + 1], z = g.pos[i + 2];
    const k = fn(x, y, z);
    g.pos[i] = x * k; g.pos[i + 1] = y * k; g.pos[i + 2] = z * k;
  }
  return g;
}

// ─── builder: merges transformed, coloured parts into one mesh ───
class GB {
  constructor() { this.pos = []; this.nrm = []; this.col = []; this.uv = []; this.idx = []; }
  add(g, o = {}) {
    const geo = o.flat ? flatten(g) : g;
    const q = o.q || (o.e ? new Quat().setEuler(o.e[0] * DEG, o.e[1] * DEG, o.e[2] * DEG) : null);
    const s = typeof o.s === 'number' ? [o.s, o.s, o.s] : (o.s || [1, 1, 1]);
    const p = o.p || [0, 0, 0];
    const c = o.c || [1, 1, 1], em = o.em || 0;
    const base = this.pos.length / 3;
    const v = new V3(), n = new V3();
    const lp = [], ln = [];
    for (let i = 0; i < geo.pos.length; i += 3) {
      v.set(geo.pos[i] * s[0], geo.pos[i + 1] * s[1], geo.pos[i + 2] * s[2]);
      n.set(geo.nrm[i] / s[0], geo.nrm[i + 1] / s[1], geo.nrm[i + 2] / s[2]).normalize();
      if (q) { v.applyQuat(q); n.applyQuat(q); }
      lp.push(v.x + p[0], v.y + p[1], v.z + p[2]); ln.push(n.x, n.y, n.z);
    }
    const li = geo.idx.slice();
    fixWinding(lp, ln, li);
    for (let i = 0; i < lp.length; i++) { this.pos.push(lp[i]); this.nrm.push(ln[i]); }
    const vc = o.vc; // optional per-vertex colour function (x,y,z) => [r,g,b,e]
    for (let i = 0; i < lp.length / 3; i++) {
      if (vc) { const r = vc(lp[i * 3], lp[i * 3 + 1], lp[i * 3 + 2]); this.col.push(r[0], r[1], r[2], r[3]); }
      else this.col.push(c[0], c[1], c[2], em);
      this.uv.push(geo.uv ? geo.uv[i * 2] || 0 : 0, geo.uv ? geo.uv[i * 2 + 1] || 0 : 0);
    }
    for (const k of li) this.idx.push(base + k);
    return this;
  }
  build() {
    let r = 0;
    for (let i = 0; i < this.pos.length; i += 3) r = Math.max(r, Math.hypot(this.pos[i], this.pos[i + 1], this.pos[i + 2]));
    const big = this.pos.length / 3 > 65535;
    return {
      pos: new Float32Array(this.pos), nrm: new Float32Array(this.nrm), col: new Float32Array(this.col), uv: new Float32Array(this.uv),
      idx: big ? new Uint32Array(this.idx) : new Uint16Array(this.idx), radius: r,
    };
  }
  mesh() { return makeMesh(this.build()); }
}
function toTyped(g) {
  const n = g.pos.length / 3;
  fixWinding(g.pos, g.nrm, g.idx);
  const col = new Float32Array(n * 4); for (let i = 0; i < n; i++) { col[i * 4] = 1; col[i * 4 + 1] = 1; col[i * 4 + 2] = 1; col[i * 4 + 3] = 0; }
  return { pos: new Float32Array(g.pos), nrm: new Float32Array(g.nrm), uv: new Float32Array(g.uv), col, idx: n > 65535 ? new Uint32Array(g.idx) : new Uint16Array(g.idx) };
}
