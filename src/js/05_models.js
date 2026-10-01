// ───────────────────────────── models ─────────────────────────────
const L = (h, m = 1) => linArr(h, m);
const MODELS = {};

function qFromTo(dx, dy, dz) { return new Quat().setFromUnitVectors(new V3(0, 1, 0), new V3(dx, dy, dz).normalize()); }

function mPlayerShip() {
  const gb = new GB();
  const hull = L(0xdfe5ee), hull2 = L(0xa9b2c2), dark = L(0x262c38), gold = [1.0, 0.68, 0.26], glass = L(0x3b86c8);
  gb.add(gCyl(0.46, 0.66, 4.4, 8), { p: [0, 0, 0.3], e: [-90, 0, 0], s: [1, 1, 0.72], c: hull, flat: true });
  gb.add(gCyl(0.0, 0.46, 1.6, 8), { p: [0, 0, -2.7], e: [-90, 0, 0], s: [1, 1, 0.72], c: hull, flat: true });
  gb.add(gSphere(16, 10), { p: [0, 0.3, -1.2], s: [0.33, 0.27, 0.95], c: glass, em: 0.22 });
  const wing = gSlab([[0.35, -0.7], [3.3, 1.05], [3.45, 1.75], [0.45, 2.15]], 0.14);
  gb.add(wing, { p: [0, -0.12, 0], e: [0, 0, -5], c: hull2, flat: true });
  gb.add(wing, { p: [0, -0.12, 0], e: [0, 0, 5], s: [-1, 1, 1], c: hull2, flat: true });
  const ang = Math.atan2(1.75, 2.95) / DEG;
  gb.add(gBox(3.0, 0.05, 0.16), { p: [1.86, -0.2, 0.22], e: [0, -ang, -5], c: gold, em: 2.6 });
  gb.add(gBox(3.0, 0.05, 0.16), { p: [-1.86, -0.2, 0.22], e: [0, ang, 5], c: gold, em: 2.6 });
  for (const sx of [-1, 1]) {
    gb.add(gCyl(0.36, 0.42, 2.2, 10), { p: [0.8 * sx, -0.1, 1.55], e: [-90, 0, 0], c: dark, flat: true });
    gb.add(gCyl(0.3, 0.3, 0.08, 14), { p: [0.8 * sx, -0.1, 2.68], e: [-90, 0, 0], c: [1.0, 0.8, 0.5], em: 2.6 });
    gb.add(gTorus(0.41, 0.06, 6, 18), { p: [0.8 * sx, -0.1, 2.45], c: gold, em: 2.2 });
    gb.add(gCyl(0.28, 0.36, 0.3, 10), { p: [0.8 * sx, -0.1, 0.35], e: [-90, 0, 0], c: L(0x0d1015), flat: true });
    gb.add(gCyl(0.12, 0.12, 1.4, 8), { p: [3.42 * sx, -0.42, 1.3], e: [-90, 0, 0], c: hull, flat: true });
    gb.add(gSphere(8, 5), { p: [3.42 * sx, -0.42, 0.55], s: 0.14, c: sx < 0 ? [1, 0.12, 0.08] : [0.1, 1, 0.3], em: 4 });
    gb.add(gCyl(0.07, 0.09, 1.2, 6), { p: [1.25 * sx, -0.24, -0.4], e: [-90, 0, 0], c: dark });
    gb.add(gBox(0.05, 0.07, 3.0), { p: [0.62 * sx, 0.06, 0.4], c: gold, em: 2.0 });
  }
  const fin = gSlab([[0, 0.9], [1.05, 1.9], [1.1, 2.55], [0, 2.4]], 0.1);
  gb.add(fin, { p: [0.3, 0.22, 0], e: [0, 0, 72], c: hull2, flat: true });
  gb.add(fin, { p: [-0.3, 0.22, 0], e: [0, 0, 108], c: hull2, flat: true });
  gb.add(gBox(0.2, 0.14, 2.8), { p: [0, 0.42, 0.95], c: dark, flat: true });
  gb.add(gBox(0.06, 0.04, 2.6), { p: [0, 0.5, 0.95], c: gold, em: 2.4 });
  return gb.mesh();
}

// ─── enemies ───
function mDrone() {
  const gb = new GB(), dark = L(0x30343e), red = [1.0, 0.16, 0.1];
  gb.add(gIco(1), { s: 1.1, c: dark, flat: true });
  gb.add(gTorus(1.55, 0.13, 5, 18), { c: L(0x60666f), flat: true });
  for (let i = 0; i < 4; i++) { const a = i * 90 + 45; gb.add(gBox(0.16, 1.4, 0.9), { p: [Math.cos(a * DEG) * 1.35, Math.sin(a * DEG) * 1.35, 0.35], e: [0, 0, a - 90], c: L(0x8a2626), flat: true }); }
  gb.add(gSphere(10, 6), { p: [0, 0, -1.0], s: 0.42, c: red, em: 5 });
  gb.add(gTorus(1.56, 0.05, 4, 24), { p: [0, 0, -0.14], c: red, em: 2.5 });
  return gb.mesh();
}
function mRaider() {
  const gb = new GB(), hull = L(0x40434d), dark = L(0x22242a), acc = [1.0, 0.42, 0.08];
  gb.add(gCyl(0.0, 0.75, 3.8, 6), { p: [0, 0, -0.7], e: [-90, 0, 0], s: [1, 1, 0.55], c: hull, flat: true });
  gb.add(gBox(1.3, 0.6, 1.8), { p: [0, 0, 1.9], c: dark, flat: true });
  const w = gSlab([[0.4, 0.5], [3.4, -0.9], [3.5, -0.3], [0.5, 1.9]], 0.12);
  gb.add(w, { p: [0, 0, 0.6], c: hull, flat: true });
  gb.add(w, { p: [0, 0, 0.6], s: [-1, 1, 1], c: hull, flat: true });
  for (const sx of [-1, 1]) {
    gb.add(gBox(2.6, 0.04, 0.14), { p: [1.9 * sx, 0.08, 0.35], e: [0, 26 * sx, 0], c: acc, em: 3 });
    gb.add(gCyl(0.32, 0.36, 1.6, 8), { p: [0.55 * sx, 0, 2.2], e: [-90, 0, 0], c: dark, flat: true });
    gb.add(gCyl(0.26, 0.26, 0.06, 10), { p: [0.55 * sx, 0, 3.02], e: [-90, 0, 0], c: [1, 0.3, 0.05], em: 4 });
    gb.add(gBox(0.08, 0.9, 0.5), { p: [3.45 * sx, 0.35, -0.5], c: hull, flat: true });
  }
  gb.add(gBox(0.5, 0.12, 0.6), { p: [0, 0.32, -0.6], c: [1, 0.2, 0.05], em: 3 });
  return gb.mesh();
}
function mGunship() {
  const gb = new GB(), hull = L(0x3a3546), dark = L(0x1e1b26), acc = [0.65, 0.2, 1.0];
  gb.add(gCyl(1.7, 2.0, 6.5, 6), { e: [-90, 0, 0], c: hull, flat: true });
  gb.add(gCyl(0.7, 1.7, 2.4, 6), { p: [0, 0, -4.4], e: [-90, 0, 0], c: hull, flat: true });
  gb.add(gBox(2.4, 1.2, 3.0), { p: [0, 1.7, 0.8], c: dark, flat: true });
  for (const sx of [-1, 1]) {
    gb.add(gBox(1.6, 1.8, 5.0), { p: [2.9 * sx, -0.2, 0.3], c: dark, flat: true });
    gb.add(gCyl(0.22, 0.3, 3.2, 8), { p: [2.9 * sx, -0.2, -3.6], e: [-90, 0, 0], c: L(0x55505f), flat: true });
    gb.add(gSphere(6, 4), { p: [2.9 * sx, -0.2, -5.25], s: 0.32, c: acc, em: 4 });
    gb.add(gBox(0.1, 0.5, 4.0), { p: [3.75 * sx, -0.2, 0.3], c: acc, em: 2.5 });
  }
  gb.add(gBox(1.6, 0.25, 0.4), { p: [0, 2.0, -0.7], c: acc, em: 3 });
  gb.add(gCyl(1.2, 1.2, 0.1, 12), { p: [0, 0, 3.3], e: [-90, 0, 0], c: acc, em: 3.5 });
  return gb.mesh();
}
function mSpiker() {
  const gb = new GB();
  gb.add(gIco(1), { s: 1.0, c: [1.0, 0.72, 0.1], em: 2.4, flat: true });
  const ico = gIco(0);
  for (let i = 0; i < ico.pos.length; i += 3) {
    const d = new V3(ico.pos[i], ico.pos[i + 1], ico.pos[i + 2]);
    gb.add(gCyl(0.0, 0.32, 1.7, 5), { p: [d.x * 1.45, d.y * 1.45, d.z * 1.45], q: qFromTo(d.x, d.y, d.z), c: L(0x2c2820), flat: true });
  }
  gb.add(gTorus(1.25, 0.1, 4, 20), { e: [90, 0, 0], c: L(0x4a4030), flat: true });
  return gb.mesh();
}
function mTurret() {
  const gb = new GB(), hull = L(0x4a4f5a), dark = L(0x23262d), red = [1, 0.15, 0.1];
  gb.add(gCyl(2.0, 2.6, 1.0, 8), { p: [0, -1.2, 0], c: dark, flat: true });
  gb.add(gSphere(12, 8), { p: [0, 0, 0], s: [1.8, 1.4, 1.8], c: hull, flat: true });
  gb.add(gBox(2.6, 1.2, 2.2), { p: [0, 0.4, -0.6], c: hull, flat: true });
  for (const sx of [-1, 1]) {
    gb.add(gCyl(0.2, 0.28, 3.4, 8), { p: [0.6 * sx, 0.45, -2.6], e: [-90, 0, 0], c: dark, flat: true });
    gb.add(gSphere(6, 4), { p: [0.6 * sx, 0.45, -4.35], s: 0.26, c: red, em: 4 });
  }
  gb.add(gBox(1.6, 0.2, 0.2), { p: [0, 1.05, -1.7], c: red, em: 3 });
  gb.add(gTorus(2.3, 0.08, 4, 24), { p: [0, -1.2, 0], e: [90, 0, 0], c: red, em: 2.5 });
  return gb.mesh();
}
function mLancer() {
  const gb = new GB(), hull = L(0x353b48), acc = [0.35, 0.85, 1.0];
  gb.add(gCyl(0.06, 0.5, 6.4, 6), { p: [0, 0, -0.4], e: [-90, 0, 0], c: hull, flat: true });
  gb.add(gTorus(1.25, 0.14, 5, 20), { p: [0, 0, 1.2], c: L(0x59606e), flat: true });
  gb.add(gTorus(1.26, 0.05, 4, 24), { p: [0, 0, 1.05], c: acc, em: 3 });
  for (let i = 0; i < 3; i++) {
    const a = i * 120;
    gb.add(gSlab([[0, 0], [1.6, 1.4], [1.6, 2.3], [0, 2.4]], 0.08), { p: [0, 0, 0.6], e: [0, 0, a + 90], c: hull, flat: true });
  }
  gb.add(gSphere(8, 6), { p: [0, 0, -3.6], s: 0.3, c: acc, em: 5 });
  gb.add(gCyl(0.35, 0.35, 0.08, 10), { p: [0, 0, 2.9], e: [-90, 0, 0], c: acc, em: 4 });
  return gb.mesh();
}
function mJelly() {
  const gb = new GB(), pink = [1.0, 0.32, 0.72];
  gb.add(gSphere(18, 10), { p: [0, 0.4, 0], s: [2.3, 1.5, 2.3], c: pink, em: 0.55 });
  gb.add(gSphere(10, 6), { p: [0, 0.4, 0], s: 0.9, c: [1, 0.7, 0.95], em: 3.0 });
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU, l = 2.5 + (i % 3) * 0.8;
    gb.add(gCyl(0.1, 0.03, l, 4), { p: [Math.cos(a) * 1.3, -0.6 - l / 2, Math.sin(a) * 1.3], c: [0.9, 0.35, 0.8], em: 1.2 });
  }
  gb.add(gTorus(2.1, 0.09, 4, 24), { p: [0, -0.15, 0], e: [90, 0, 0], c: [1, 0.55, 0.9], em: 2.5 });
  return gb.mesh();
}
function mWasp() {
  const gb = new GB(), body = L(0x203c26), acc = [0.55, 1.0, 0.25];
  gb.add(gSphere(10, 6), { s: [0.6, 0.55, 1.2], c: body, flat: true });
  gb.add(gSphere(10, 6), { p: [0, -0.1, 1.5], s: [0.7, 0.62, 1.0], c: body, flat: true });
  gb.add(gTorus(0.62, 0.07, 4, 14), { p: [0, -0.1, 1.3], c: acc, em: 2.5 });
  gb.add(gTorus(0.55, 0.07, 4, 14), { p: [0, -0.1, 1.85], c: acc, em: 2.5 });
  gb.add(gCyl(0.0, 0.18, 0.9, 5), { p: [0, -0.1, 2.85], e: [90, 0, 0], c: L(0x101a12) });
  const wg = gSlab([[0, 0], [2.2, -0.5], [2.3, 0.3], [0.2, 0.7]], 0.04);
  gb.add(wg, { p: [0.3, 0.4, 0], e: [0, 0, 18], c: [0.6, 1, 0.7], em: 0.8 });
  gb.add(wg, { p: [-0.3, 0.4, 0], e: [0, 0, -18], s: [-1, 1, 1], c: [0.6, 1, 0.7], em: 0.8 });
  for (const sx of [-1, 1]) gb.add(gSphere(6, 4), { p: [0.32 * sx, 0.12, -0.95], s: 0.18, c: acc, em: 4 });
  return gb.mesh();
}
function mCarrier() {
  const gb = new GB(), hull = L(0x464a54), dark = L(0x24262c), acc = [1.0, 0.3, 0.12];
  gb.add(gBox(8, 4.5, 24), { c: hull, flat: true });
  gb.add(gCyl(0.6, 5.6, 8, 4), { p: [0, 0, -15.8], e: [-90, 45, 0], s: [1, 1, 0.75], c: hull, flat: true });
  gb.add(gBox(4.5, 3.5, 7), { p: [0, 3.6, 5], c: dark, flat: true });
  gb.add(gBox(3.8, 0.4, 0.5), { p: [0, 4.7, 1.4], c: [1, 0.85, 0.6], em: 2.5 });
  for (const sx of [-1, 1]) {
    gb.add(gBox(0.2, 2.2, 12), { p: [4.05 * sx, -0.4, 0], c: acc, em: 2.2 });
    gb.add(gBox(2.4, 2.8, 16), { p: [5.0 * sx, -0.6, 2], c: dark, flat: true });
  }
  for (const x of [-2.6, 0, 2.6]) {
    gb.add(gCyl(1.1, 1.3, 2.4, 10), { p: [x, 0, 13], e: [-90, 0, 0], c: dark, flat: true });
    gb.add(gCyl(0.95, 0.95, 0.1, 12), { p: [x, 0, 14.25], e: [-90, 0, 0], c: acc, em: 4.5 });
  }
  return gb.mesh();
}

// ─── bosses ───
function mBattleship(acc) {
  const gb = new GB(), hull = L(0x4b505c), dark = L(0x23262e), mid = L(0x343843);
  gb.add(gBox(14, 6, 56), { c: hull, flat: true });
  gb.add(gCyl(0.6, 9.6, 20, 4), { p: [0, 0, -38], e: [-90, 45, 0], s: [1, 1, 0.45], c: hull, flat: true });
  gb.add(gBox(9, 4, 34), { p: [0, 4.6, 4], c: mid, flat: true });
  gb.add(gBox(5, 7, 7), { p: [0, 9.5, 14], c: dark, flat: true });
  gb.add(gBox(4.4, 0.6, 0.4), { p: [0, 11.2, 10.4], c: acc, em: 3 });
  gb.add(gBox(16, 9, 9), { p: [0, 0, 32], c: dark, flat: true });
  for (const [x, y] of [[-4.5, -2.2], [4.5, -2.2], [-4.5, 2.2], [4.5, 2.2]]) {
    gb.add(gCyl(1.9, 1.9, 0.2, 14), { p: [x, y, 36.6], e: [-90, 0, 0], c: acc, em: 5 });
  }
  for (const sx of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const z = -14 + k * 14;
      gb.add(gBox(4, 4, 9), { p: [9 * sx, 0, z], c: mid, flat: true });
      gb.add(gCyl(0.5, 0.7, 6, 8), { p: [9 * sx, 0.6, z - 7], e: [-90, 0, 0], c: dark, flat: true });
      gb.add(gSphere(6, 4), { p: [9 * sx, 0.6, z - 10.1], s: 0.6, c: acc, em: 4 });
    }
    gb.add(gBox(0.3, 1.0, 50), { p: [7.1 * sx, 1.6, 0], c: acc, em: 2.2 });
    gb.add(gSlab([[0, -6], [10, 6], [10, 12], [0, 12]], 0.8), { p: [7 * sx, -2.5, 14], s: [sx, 1, 1], c: mid, flat: true });
  }
  return gb.mesh();
}
function mColossus() {
  const gb = new GB();
  const g = gIco(3);
  displace(g, (x, y, z) => 1 + fbm3(x * 1.7 + 3, y * 1.7, z * 1.7, 4) * 0.35);
  gb.add(g, {
    s: 16, flat: true, vc: (x, y, z) => {
      const n = fbm3(x * 0.25 + 9, y * 0.25, z * 0.25, 3);
      return n > 0.2 ? [1.0, 0.34, 0.05, 1.7] : [0.16 + n * 0.1, 0.12, 0.11, 0];
    },
  });
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU;
    gb.add(gCyl(0.0, 3.2, 9, 5), { p: [Math.cos(a) * 17, Math.sin(a) * 17, 0], q: qFromTo(Math.cos(a), Math.sin(a), 0), c: L(0x2a2220), flat: true });
  }
  gb.add(gSphere(12, 8), { p: [0, 0, -15.5], s: 3.0, c: [1.0, 0.75, 0.2], em: 6 });
  return gb.mesh();
}
function mRockChunk(seed, hot) {
  const gb = new GB(), g = gIco(1);
  displace(g, (x, y, z) => 1 + fbm3(x * 2 + seed, y * 2, z * 2, 3) * 0.5);
  gb.add(g, { flat: true, vc: (x, y, z) => (hot && fbm3(x * 2 + seed, y * 2 + 5, z * 2, 2) > 0.15 ? [1, 0.4, 0.05, 3] : [0.2, 0.16, 0.14, 0]) });
  return gb.mesh();
}
function mSerpentHead(acc, body) {
  const gb = new GB();
  gb.add(gCyl(0.6, 4.2, 10, 5), { p: [0, 0, -2], e: [-90, 0, 0], s: [1, 1, 0.6], c: body, flat: true });
  gb.add(gBox(5, 2.2, 6), { p: [0, -1.4, 0], c: L(0x1e2028), flat: true });
  for (const sx of [-1, 1]) {
    gb.add(gSphere(8, 6), { p: [1.9 * sx, 1.0, -2.5], s: [0.7, 0.45, 1.0], c: acc, em: 5 });
    gb.add(gCyl(0.0, 0.7, 5, 5), { p: [2.8 * sx, -1.8, -5.6], e: [-100, 0, -10 * sx], c: L(0xd9d4c8), flat: true });
    gb.add(gCyl(0.0, 0.8, 6, 5), { p: [1.6 * sx, 3.0, 2.2], e: [-40, 0, -20 * sx], c: body, flat: true });
  }
  gb.add(gBox(0.4, 0.4, 7), { p: [0, 2.3, 0], c: acc, em: 2.5 });
  return gb.mesh();
}
function mSerpentSeg(acc, body) {
  const gb = new GB();
  gb.add(gIco(1), { s: [3.2, 2.7, 3.4], c: body, flat: true });
  gb.add(gCyl(0.0, 0.9, 3.4, 5), { p: [0, 3.6, 0.4], e: [-25, 0, 0], c: body, flat: true });
  gb.add(gTorus(2.9, 0.22, 4, 20), { c: acc, em: 2.8 });
  for (const sx of [-1, 1]) gb.add(gCyl(0.0, 0.6, 2.6, 5), { p: [3.4 * sx, -0.6, 0.4], e: [0, 0, -100 * sx], c: L(0x2a2c34), flat: true });
  return gb.mesh();
}
function mHiveQueen() {
  const gb = new GB(), body = L(0x2d1f3a), acc = [0.5, 1.0, 0.3];
  gb.add(gSphere(20, 12), { p: [0, 0, 9], s: [8.5, 6.5, 12], flat: true, vc: (x, y, z) => (fbm3(x * 0.3, y * 0.3, z * 0.3 + 4, 3) > 0.18 ? [0.55, 1.0, 0.3, 2.6] : [0.18, 0.12, 0.24, 0]) });
  gb.add(gSphere(16, 10), { s: [5, 4.2, 5.5], c: body, flat: true });
  gb.add(gSphere(14, 10), { p: [0, 0.8, -7.5], s: [3.6, 3.0, 4.2], c: body, flat: true });
  for (const sx of [-1, 1]) {
    gb.add(gSphere(8, 6), { p: [1.8 * sx, 1.9, -10.2], s: [1.1, 0.9, 1.0], c: acc, em: 4.5 });
    gb.add(gCyl(0.0, 0.7, 5, 5), { p: [1.2 * sx, -1.0, -12.5], e: [-110, 0, 0], c: L(0xcfd8b8), flat: true });
    const wg = gSlab([[0, 0], [16, -6], [18, 2], [2, 6]], 0.2);
    gb.add(wg, { p: [3 * sx, 3.8, 0], e: [0, 0, 20 * sx], s: [sx, 1, 1], c: [0.55, 0.95, 0.6], em: 0.7 });
    for (let k = 0; k < 3; k++) gb.add(gCyl(0.25, 0.35, 8, 5), { p: [5.6 * sx, -4.5, -3 + k * 3.5], e: [0, 0, 40 * sx], c: body, flat: true });
  }
  return gb.mesh();
}
function mVoidEye(acc) {
  const gb = new GB();
  gb.add(gSphere(36, 24), { s: 12, c: L(0xcfc9d8) });
  gb.add(gCyl(6.8, 6.8, 0.2, 40), { p: [0, 0, -11.55], e: [-90, 0, 0], s: [1, 1, 1], c: acc, em: 4 });
  gb.add(gCyl(3.2, 3.2, 0.25, 32), { p: [0, 0, -11.75], e: [-90, 0, 0], c: [0, 0, 0], em: 1 });
  gb.add(gTorus(7.0, 0.35, 6, 48), { p: [0, 0, -11.4], c: [1, 1, 1], em: 3 });
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU;
    gb.add(gBox(7, 4, 14), { p: [Math.cos(a) * 12.5, Math.sin(a) * 12.5, 3], e: [0, 0, a / DEG], c: L(0x2a2433), flat: true });
  }
  return gb.mesh();
}
function mSpikeRing(acc) {
  const gb = new GB();
  gb.add(gTorus(20, 1.0, 6, 64), { c: L(0x3a3344), flat: true });
  gb.add(gTorus(20, 0.35, 4, 64), { p: [0, 0, -1.0], c: acc, em: 3 });
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU;
    gb.add(gCyl(0.0, 1.3, 7, 5), { p: [Math.cos(a) * 24, Math.sin(a) * 24, 0], q: qFromTo(Math.cos(a), Math.sin(a), 0), c: L(0x2a2433), flat: true });
  }
  return gb.mesh();
}

// ─── station ───
function mStation() {
  const gb = new GB(), rb = new GB(), hull = L(0xb9c0cc), dark = L(0x3a404c), win = [1.0, 0.86, 0.6], blue = L(0x1d3570), cyan = [0.35, 0.9, 1.0];
  gb.add(gCyl(26, 26, 70, 16), { c: hull, flat: true });
  gb.add(gCyl(10, 26, 16, 16), { p: [0, 43, 0], c: hull, flat: true });
  gb.add(gCyl(26, 12, 16, 16), { p: [0, -43, 0], c: hull, flat: true });
  gb.add(gCyl(27, 27, 4, 16), { p: [0, 12, 0], c: dark, flat: true });
  gb.add(gCyl(27.2, 27.2, 1.2, 32), { p: [0, -10, 0], c: win, em: 2.2 });
  rb.add(gTorus(115, 11, 10, 72), { e: [90, 0, 0], c: hull, flat: true });
  rb.add(gTorus(115, 11.3, 4, 72), { e: [90, 0, 0], s: [1, 1, 0.12], c: win, em: 2.0 });
  for (let i = 0; i < 4; i++) {
    const a = i * 90 + 45;
    rb.add(gCyl(4, 4, 84, 8), { p: [Math.cos(a * DEG) * 70, 0, Math.sin(a * DEG) * 70], e: [0, -a, 90], c: dark, flat: true });
  }
  for (const sy of [-1, 1]) {
    gb.add(gBox(14, 2, 140), { p: [0, sy * 62, 0], c: dark, flat: true });
    for (const sz of [-1, 1]) gb.add(gBox(60, 0.8, 34), { p: [0, sy * 62, sz * 48], c: blue, em: 0.35 });
  }
  gb.add(gCyl(1.2, 1.2, 40, 6), { p: [0, 70, 0], c: dark });
  gb.add(gSphere(6, 4), { p: [0, 90, 0], s: 2.2, c: [1, 0.2, 0.15], em: 5 });
  // docking arm + gate (gate faces -Z)
  gb.add(gBox(10, 10, 40), { p: [0, 0, -44], c: dark, flat: true });
  gb.add(gTorus(22, 2.6, 8, 48), { p: [0, 0, -68], c: hull, flat: true });
  gb.add(gTorus(22, 1.0, 6, 48), { p: [0, 0, -69.5], c: cyan, em: 4 });
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; gb.add(gBox(2, 2, 2), { p: [Math.cos(a) * 25, Math.sin(a) * 25, -68], c: win, em: 3 }); }
  return { core: gb.mesh(), ring: rb.mesh() };
}

// ─── pickups ───
function mPickups() {
  const M = {};
  let gb = new GB();
  gb.add(gOcta(), { s: [0.75, 1.7, 0.75], c: [0.35, 0.95, 1.0], em: 1.8, flat: true });
  gb.add(gOcta(), { p: [0.7, -0.4, 0.2], s: [0.4, 0.9, 0.4], e: [0, 0, -25], c: [0.5, 0.8, 1.0], em: 1.5, flat: true });
  M.crystal = gb.mesh();
  gb = new GB();
  gb.add(gBox(2.4, 0.75, 0.75), { c: [0.25, 1.0, 0.45], em: 2.2 });
  gb.add(gBox(0.75, 2.4, 0.75), { c: [0.25, 1.0, 0.45], em: 2.2 });
  gb.add(gTorus(1.8, 0.14, 5, 28), { c: L(0xdfe6ee), flat: true });
  M.repair = gb.mesh();
  gb = new GB();
  gb.add(gCyl(1.35, 1.35, 0.45, 6), { e: [90, 0, 0], c: [0.3, 0.65, 1.0], em: 1.6, flat: true });
  gb.add(gCyl(1.65, 1.65, 0.25, 6), { e: [90, 0, 0], s: [1, 1, 1], c: L(0xdfe6ee), flat: true });
  M.shield = gb.mesh();
  gb = new GB();
  gb.add(gIco(1), { s: 1.1, c: [0.8, 0.45, 1.0], em: 2.4, flat: true });
  gb.add(gTorus(1.7, 0.1, 4, 24), { e: [70, 0, 0], c: [0.85, 0.6, 1.0], em: 2.0 });
  M.energy = gb.mesh();
  gb = new GB();
  for (const [x, y] of [[-0.6, -0.3], [0.6, -0.3], [0, 0.55]]) {
    gb.add(gCyl(0.28, 0.28, 2.0, 8), { p: [x, y, 0.2], e: [-90, 0, 0], c: L(0xd0d6de), flat: true });
    gb.add(gCyl(0.0, 0.28, 0.6, 8), { p: [x, y, -1.1], e: [-90, 0, 0], c: [1, 0.45, 0.1], em: 2.6 });
  }
  M.missiles = gb.mesh();
  gb = new GB();
  gb.add(gBox(1.8, 1.8, 1.8), { c: L(0x2a2f3a), flat: true });
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) gb.add(gBox(0.55, 0.55, 0.55), { p: [x * 0.95, y * 0.95, z * 0.95], c: [1, 1, 1], em: 2.4 });
  gb.add(gIco(1), { s: 0.75, c: [1, 1, 1], em: 3.0 });
  M.weapon = gb.mesh();
  gb = new GB();
  gb.add(gIco(0), { s: 1.4, c: [1.0, 0.75, 0.3], em: 1.6, flat: true });
  gb.add(gTorus(2.1, 0.12, 5, 30), { e: [90, 0, 0], c: [1, 0.85, 0.5], em: 2.4 });
  gb.add(gTorus(2.1, 0.12, 5, 30), { e: [0, 90, 0], c: [1, 0.85, 0.5], em: 2.4 });
  M.module = gb.mesh();
  gb = new GB();
  gb.add(gOcta(), { s: [1.0, 2.6, 1.0], c: [1, 0.9, 0.65], em: 3.2, flat: true });
  gb.add(gOcta(), { s: [2.6, 1.0, 1.0], c: [1, 0.9, 0.65], em: 3.2, flat: true });
  gb.add(gOcta(), { s: [1.0, 1.0, 2.6], c: [1, 0.9, 0.65], em: 3.2, flat: true });
  M.relic = gb.mesh();
  gb = new GB();
  gb.add(gOcta(), { s: 1.3, c: [1, 1, 1], em: 2.6, flat: true });
  gb.add(gTorus(1.9, 0.12, 4, 26), { c: [1, 1, 1], em: 2.0 });
  M.power = gb.mesh();
  gb = new GB();
  gb.add(gBox(3, 2.2, 2.2), { c: L(0x5c6370), flat: true });
  gb.add(gBox(3.1, 0.3, 2.3), { c: [1, 0.75, 0.3], em: 2.2 });
  gb.add(gBox(0.3, 2.3, 2.3), { p: [1.2, 0, 0], c: L(0x3a3f48), flat: true });
  gb.add(gBox(0.3, 2.3, 2.3), { p: [-1.2, 0, 0], c: L(0x3a3f48), flat: true });
  M.crate = gb.mesh();
  for (const k in M) addInstancing(M[k], 12, 512, [[4, 4, 0], [5, 4, 4], [6, 4, 8]]);
  return M;
}

function mRock(seed, mineral) {
  const gb = new GB(), g = gIco(2);
  const sx = 1 + (seed % 3) * 0.18, sy = 0.75 + ((seed * 7) % 5) * 0.08;
  displace(g, (x, y, z) => 1 + fbm3(x * 1.4 + seed * 3.1, y * 1.4, z * 1.4, 4) * 0.6 + noise3(x * 4.5 + seed, y * 4.5, z * 4.5) * 0.12);
  gb.add(g, {
    s: [sx, sy, 1], flat: true, vc: (x, y, z) => {
      const n = fbm3(x * 2 + seed, y * 2, z * 2, 3);
      const base = 0.13 + n * 0.12;
      return [base * 1.05, base * 0.97, base * 0.9, 0];
    },
  });
  if (mineral) {
    const r = new RNG(seed * 77 + 1);
    for (let i = 0; i < 7; i++) {
      const d = new V3().randomUnit(() => r.next());
      const c = mineral === 1 ? [0.3, 0.95, 1.0] : [1.0, 0.35, 0.9];
      gb.add(gOcta(), { p: [d.x * 0.95 * sx, d.y * 0.95 * sy, d.z * 0.95], q: qFromTo(d.x, d.y, d.z), s: [0.18, 0.55, 0.18], c, em: 2.6, flat: true });
    }
  }
  return gb.mesh();
}

function buildModels() {
  MODELS.player = mPlayerShip();
  MODELS.drone = mDrone(); MODELS.raider = mRaider(); MODELS.gunship = mGunship(); MODELS.spiker = mSpiker();
  MODELS.turret = mTurret(); MODELS.lancer = mLancer(); MODELS.jelly = mJelly(); MODELS.wasp = mWasp(); MODELS.carrier = mCarrier();
  MODELS.battleshipRed = mBattleship([1.0, 0.25, 0.1]);
  MODELS.battleshipGold = mBattleship([1.0, 0.7, 0.2]);
  MODELS.battleshipCyan = mBattleship([0.3, 0.8, 1.0]);
  MODELS.colossus = mColossus();
  MODELS.chunks = [mRockChunk(1, true), mRockChunk(2, true), mRockChunk(3, false)];
  MODELS.serpentHeadIce = mSerpentHead([0.4, 0.9, 1.0], L(0x9fb8d0));
  MODELS.serpentSegIce = mSerpentSeg([0.4, 0.9, 1.0], L(0x7d93ad));
  MODELS.serpentHeadStorm = mSerpentHead([0.75, 0.5, 1.0], L(0x3a3550));
  MODELS.serpentSegStorm = mSerpentSeg([0.75, 0.5, 1.0], L(0x2f2a44));
  MODELS.hive = mHiveQueen();
  MODELS.eyePurple = mVoidEye([0.8, 0.3, 1.0]);
  MODELS.eyeRed = mVoidEye([1.0, 0.2, 0.15]);
  MODELS.spikeRingPurple = mSpikeRing([0.8, 0.3, 1.0]);
  MODELS.spikeRingRed = mSpikeRing([1.0, 0.25, 0.1]);
  const st = mStation(); MODELS.stationCore = st.core; MODELS.stationRing = st.ring;
  BH_DISK = makeMesh(toTyped(gRing(1.6, 6.4, 220, 10)));
  MODELS.pick = mPickups();
  MODELS.rocks = [mRock(1, 0), mRock(2, 0), mRock(3, 0)];
  MODELS.mineral = [mRock(4, 1), mRock(5, 2)];
  for (const m of [...MODELS.rocks, ...MODELS.mineral]) addInstancing(m, 12, 1600, [[4, 4, 0], [5, 4, 4], [6, 4, 8]]);
}
