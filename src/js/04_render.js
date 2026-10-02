// ───────────────────────────── renderer ─────────────────────────────
const QUALITY = {
  high: { label: 'High', dpr: 2, scale: 1, msaa: 4, bloom: true, levels: 6, planetTex: 2048, sky: 1024, stars: 7000, fx: 1 },
  medium: { label: 'Medium', dpr: 1.5, scale: 1, msaa: 4, bloom: true, levels: 5, planetTex: 1024, sky: 768, stars: 5000, fx: 0.85 },
  low: { label: 'Low', dpr: 1, scale: 0.85, msaa: 0, bloom: true, levels: 4, planetTex: 512, sky: 512, stars: 3500, fx: 0.6 },
  // only used in safe mode (after a graphics failure): plainest settings that still look like the game
  safe: { label: 'Safe', dpr: 1, scale: 0.75, msaa: 0, bloom: false, levels: 0, planetTex: 512, sky: 384, stars: 2500, fx: 0.5 },
};

class FXBatch {
  constructor(max) {
    const g = { pos: new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), idx: new Uint16Array([0, 1, 2, 0, 2, 3]) };
    this.mesh = addInstancing(makeMesh(g), 16, max, [[4, 4, 0], [5, 4, 4], [6, 4, 8], [7, 4, 12]]);
    this.max = max; this.n = 0; this.d = this.mesh.inst.data;
  }
  begin() { this.n = 0; }
  add(wx, wy, wz, dx, dy, dz, len, wid, r, g, b, a, shape, p1 = 0, p2 = 0, p3 = 0) {
    if (this.n >= this.max) return;
    const o = this.n++ * 16, d = this.d, c = R.cam;
    d[o] = wx - c.x; d[o + 1] = wy - c.y; d[o + 2] = wz - c.z; d[o + 3] = len;
    d[o + 4] = dx; d[o + 5] = dy; d[o + 6] = dz; d[o + 7] = wid;
    d[o + 8] = r; d[o + 9] = g; d[o + 10] = b; d[o + 11] = a;
    d[o + 12] = shape; d[o + 13] = p1; d[o + 14] = p2; d[o + 15] = p3;
  }
  glow(wx, wy, wz, size, c, a = 1) { this.add(wx, wy, wz, 0, 0, 0, 0, size, c[0], c[1], c[2], a, 1); }
  draw(depthTest = true) {
    if (!this.n) return;
    uploadInstances(this.mesh, this.n);
    const P = useProg(R.P.fx);
    U.m4(P, 'u_view', R.view); U.m4(P, 'u_proj', R.proj);
    setBlend(1); setDepth(depthTest, false); setCull(0);
    drawInst(this.mesh, this.n);
  }
}

const R = {
  P: {}, q: QUALITY.high, qName: 'high',
  w: 1, h: 1, cssW: 1, cssH: 1, sw: 1, sh: 1, dpr: 1, scale: 1, dynScale: 1,
  fov: 70 * DEG, near: 1, far: 160000,
  cam: new V3(), camQ: new Quat(),
  proj: M4.create(), view: M4.create(), vp: M4.create(), ivp: M4.create(), frustum: new Frustum(), tmpM: M4.create(),
  scene: null, bloom: [], skyTex: null, skyHasMips: true,
  light: { pos: new V3(), col: [1, 1, 1] }, amb: [0.02, 0.022, 0.03],
  post: { hit: [0, 0, 0, 0], flash: 0, ab: 0, bloomStr: 0.7, exposure: 1.0, vig: 0.55 },
  time: 0,
  sphere: null, sphereLo: null, ring: null, fx: null, fxTop: null, starPts: null,

  init(qName) {
    this.setQuality(qName, true);
    const P = this.P, fv = SH.fsVS;
    P.sky = makeProgram('sky', fv, SH.skyFS);
    P.stars = makeProgram('stars', SH.starsVS, SH.starsFS);
    // planet-surface and sky bake programs compile on demand (see bakeProg / bakeSkyStart)
    P.planet = this.tryProgram('planet', SH.planetVS, SH.planetFS);
    P.atmo = makeProgram('atmo', SH.atmoVS, SH.atmoFS);
    P.ring = makeProgram('ring', SH.ringVS, SH.ringFS);
    P.sun = this.tryProgram('sun', SH.sunVS, SH.sunFS);
    P.disk = this.tryProgram('disk', SH.diskVS, SH.diskFS);
    P.hull = makeProgram('hull', SH.hullVS, SH.hullFS);
    P.hullI = makeProgram('hullI', SH.hullVS, SH.hullFS, '#define INST 1\n');
    P.fx = makeProgram('fx', SH.fxVS, SH.fxFS);
    P.bloomPre = makeProgram('bloomPre', fv, SH.bloomPreFS);
    P.bloomDown = makeProgram('bloomDown', fv, SH.bloomDownFS);
    P.bloomUp = makeProgram('bloomUp', fv, SH.bloomUpFS);
    P.composite = makeProgram('composite', fv, SH.compositeFS);
    this.sphere = makeMesh(toTyped(gSphere(128, 64)));
    this.sphereMid = makeMesh(toTyped(gSphere(64, 32)));
    this.sphereLo = makeMesh(toTyped(gSphere(28, 14)));
    this.ring = makeMesh(toTyped(gRing(1, 2, 160, 3)));
    this.fx = new FXBatch(6000);
    this.fxTop = new FXBatch(256);
    this.buildStars(this.q.stars);
  },

  setQuality(name, initial) {
    this.qName = QUALITY[name] ? name : 'high';
    this.q = QUALITY[this.qName];
    this.dynScale = 1;
    if (!initial) this.resize(true);
  },

  resize(force) {
    const cssW = Math.max(1, window.innerWidth), cssH = Math.max(1, window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, this.q.dpr);
    const w = Math.max(1, Math.round(cssW * dpr)), h = Math.max(1, Math.round(cssH * dpr));
    const scale = clamp(this.q.scale * this.dynScale, 0.4, 1);
    const sw = Math.max(1, Math.round(w * scale)), sh = Math.max(1, Math.round(h * scale));
    if (!force && w === this.w && h === this.h && sw === this.sw && sh === this.sh) return;
    this.cssW = cssW; this.cssH = cssH; this.dpr = dpr; this.w = w; this.h = h; this.sw = sw; this.sh = sh; this.scale = scale;
    canvas.width = w; canvas.height = h;
    freeTarget(this.scene);
    for (const b of this.bloom) freeTarget(b);
    this.scene = makeTarget(sw, sh, { hdr: GLX.hdr, depth: true, samples: this.q.msaa });
    if (!this.scene.ok) this.scene = makeTarget(sw, sh, { hdr: false, depth: true, samples: 0 });
    this.bloom = [];
    if (this.q.bloom) {
      let bw = sw, bh = sh;
      for (let i = 0; i < this.q.levels; i++) {
        bw = Math.max(1, bw >> 1); bh = Math.max(1, bh >> 1);
        if (bw < 4 || bh < 4) break;
        this.bloom.push(makeTarget(bw, bh, { hdr: GLX.hdr }));
      }
    }
  },

  buildStars(n) {
    const rng = new RNG(4242);
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 4);
    const v = new V3();
    for (let i = 0; i < n; i++) {
      v.randomUnit(() => rng.next());
      if (rng.next() < 0.45) { v.y *= 0.12 + rng.next() * 0.2; v.normalize(); }
      pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
      const t = rng.next();
      const c = t < 0.12 ? [0.62, 0.74, 1.0] : t < 0.55 ? [1, 1, 1] : t < 0.82 ? [1.0, 0.9, 0.76] : [1.0, 0.72, 0.5];
      const b = 0.18 + Math.pow(rng.next(), 5) * 2.6;
      col[i * 4] = c[0] * b; col[i * 4 + 1] = c[1] * b; col[i * 4 + 2] = c[2] * b;
      col[i * 4 + 3] = 1.1 + Math.pow(rng.next(), 7) * 3.2;
    }
    if (this.starPts) freeMesh(this.starPts);
    this.starPts = makeMesh({ pos, col }, gl.POINTS);
  },

  // compile; if the device's driver rejects the full shader, retry a simpler variant
  tryProgram(name, vs, fs) {
    try { return makeProgram(name, vs, fs); }
    catch (e) { console.warn(name + ': full shader failed, using simpler version', e); this.fallbacks.push(name); return makeProgram(name + '-lite', vs, fs, '#define LITE 1\n'); }
  },
  fallbacks: [], bakeProgs: {},
  bakeProg(fn) {
    if (fn in this.bakeProgs) return this.bakeProgs[fn];
    let pr = null;
    try { pr = makeProgram('bake-' + fn, SH.fsVS, SH.bakeSource(fn)); }
    catch (e) {
      console.warn('Planet shader ' + fn + ' failed on this device; using a simpler surface', e);
      this.fallbacks.push(fn);
      if (fn !== 'tFallback' && fn !== 'clouds') pr = this.bakeProg('tFallback');
    }
    this.bakeProgs[fn] = pr;
    return pr;
  },

  // sky cube map, baked one face per call so no single GPU submission runs long
  bakeSkyStart(size, core, seed) {
    if (this.skyTex) gl.deleteTexture(this.skyTex);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex);
    for (let f = 0; f < 6; f++) gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + f, 0, gl.RGBA8, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    let prog = null;
    try { prog = this.P.skyBake || (this.P.skyBake = makeProgram('skyBake', SH.fsVS, SH.skyBakeFS)); }
    catch (e) { console.warn('Sky shader failed; using a simpler sky', e); this.fallbacks.push('sky'); prog = this.P.skyBake = makeProgram('skyBake-lite', SH.fsVS, SH.skyBakeFallbackFS); }
    this.skyTex = tex;
    this._sky = { tex, size, core, seed, prog, fb: gl.createFramebuffer() };
  },
  bakeSkyFace(f) {
    const S = this._sky;
    gl.bindFramebuffer(gl.FRAMEBUFFER, S.fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X + f, S.tex, 0);
    const P = useProg(S.prog);
    U.v3(P, 'u_core', S.core.x, S.core.y, S.core.z); U.v3(P, 'u_seed', S.seed[0], S.seed[1], S.seed[2]);
    gl.viewport(0, 0, S.size, S.size);
    setBlend(0); setDepth(false, false); setCull(0);
    U.i(P, 'u_face', f);
    drawFullscreen();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.flush();
  },
  bakeSkyEnd() {
    const S = this._sky;
    gl.deleteFramebuffer(S.fb);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, S.tex);
    while (gl.getError() !== gl.NO_ERROR) { /* clear */ }
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    this.skyHasMips = gl.getError() === gl.NO_ERROR;
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, this.skyHasMips ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    this._sky = null;
  },
  bakeSky(size, core, seed) { this.bakeSkyStart(size, core, seed); for (let f = 0; f < 6; f++) this.bakeSkyFace(f); this.bakeSkyEnd(); },

  // bake a planet surface (and optional cloud layer); returns textures
  bakePlanet(pd, size) {
    const W = size, H = size >> 1;
    const prog = this.bakeProg(SH.bakeTypeFn[pd.typeId] || 'tRogue');
    if (!prog) return { tex: null, cloud: null, w: 0, h: 0 };
    const T = makeTarget(W, H, { mips: true, repeatS: true });
    const flat = new Float32Array(18);
    for (let i = 0; i < 6; i++) { const c = pd.pal[Math.min(i, pd.pal.length - 1)]; flat[i * 3] = c[0]; flat[i * 3 + 1] = c[1]; flat[i * 3 + 2] = c[2]; }
    const setU = (P) => {
      U.v3(P, 'u_seed', pd.seed[0], pd.seed[1], pd.seed[2]);
      if (P.u.u_c) gl.uniform3fv(P.u.u_c, flat);
      U.v4(P, 'u_p', pd.p[0], pd.p[1], pd.p[2], pd.p[3]);
      U.v4(P, 'u_p2', pd.p2[0], pd.p2[1], pd.p2[2], pd.p2[3]);
      U.v3(P, 'u_spot', pd.spot[0], pd.spot[1], pd.spot[2]);
    };
    gl.bindFramebuffer(gl.FRAMEBUFFER, T.fb);
    gl.viewport(0, 0, W, H);
    setBlend(0); setDepth(false, false); setCull(0);
    setU(useProg(prog));
    drawFullscreen();
    gl.bindTexture(gl.TEXTURE_2D, T.tex);
    gl.generateMipmap(gl.TEXTURE_2D);
    if (GLX.aniso) gl.texParameterf(gl.TEXTURE_2D, GLX.aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(4, GLX.maxAniso));
    let cloud = null;
    const cprog = pd.clouds ? this.bakeProg('clouds') : null;
    if (cprog) {
      cloud = makeTarget(W, H, { mips: true, repeatS: true, internal: gl.R8, format: gl.RED, type: gl.UNSIGNED_BYTE });
      if (!cloud.ok) { freeTarget(cloud); cloud = makeTarget(W, H, { mips: true, repeatS: true }); }
      gl.bindFramebuffer(gl.FRAMEBUFFER, cloud.fb);
      gl.viewport(0, 0, W, H);
      setU(useProg(cprog));
      drawFullscreen();
      gl.bindTexture(gl.TEXTURE_2D, cloud.tex);
      gl.generateMipmap(gl.TEXTURE_2D);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // keep only textures; framebuffers can go
    gl.deleteFramebuffer(T.fb);
    if (cloud) gl.deleteFramebuffer(cloud.fb);
    gl.flush();
    return { tex: T.tex, cloud: cloud ? cloud.tex : null, w: W, h: H };
  },

  setCamera(pos, q, fov) {
    this.cam.copy(pos); this.camQ.copy(q); this.fov = fov;
    M4.perspective(this.proj, fov, this.w / this.h, this.near, this.far);
    _q3.copy(q).conjugate();
    M4.compose(this.view, _q3, 0, 0, 0, 1, 1, 1);
    M4.multiply(this.vp, this.proj, this.view);
    M4.invert(this.ivp, this.vp);
    this.frustum.set(this.vp);
  },
  // camera-relative model matrix
  model(pos, q, sx, sy = sx, sz = sx) {
    return M4.compose(this.tmpM, q, pos.x - this.cam.x, pos.y - this.cam.y, pos.z - this.cam.z, sx, sy, sz);
  },
  visible(pos, r) { return this.frustum.sphere(pos.x - this.cam.x, pos.y - this.cam.y, pos.z - this.cam.z, r); },
  // world → CSS pixel coordinates
  project(wx, wy, wz, out) {
    const x = wx - this.cam.x, y = wy - this.cam.y, z = wz - this.cam.z, m = this.vp;
    const cw = m[3] * x + m[7] * y + m[11] * z + m[15];
    const cx = m[0] * x + m[4] * y + m[8] * z + m[12];
    const cy = m[1] * x + m[5] * y + m[9] * z + m[13];
    out.behind = cw <= 0.0001;
    const iw = 1 / Math.max(Math.abs(cw), 0.0001) * (cw < 0 ? -1 : 1);
    out.nx = cx * iw; out.ny = cy * iw;
    out.x = (out.nx * 0.5 + 0.5) * this.cssW; out.y = (0.5 - out.ny * 0.5) * this.cssH; out.w = cw;
    return out;
  },

  // shared uniform setup for hull programs
  hullSetup(P) {
    U.m4(P, 'u_vp', this.vp);
    U.v3(P, 'u_light', this.light.pos.x - this.cam.x, this.light.pos.y - this.cam.y, this.light.pos.z - this.cam.z);
    U.a3(P, 'u_lightCol', this.light.col); U.a3(P, 'u_amb', this.amb);
    U.tex(P, 'u_env', this.skyTex, 0, gl.TEXTURE_CUBE_MAP);
    U.f(P, 'u_envLod', this.skyHasMips ? 3.5 : 0);
    U.f(P, 'u_emis', 1); U.f(P, 'u_flash', 0); U.v3(P, 'u_tintU', 1, 1, 1);
  },
  drawHull(mesh, pos, q, s, flash = 0, tint = null, emis = 1) {
    const P = useProg(this.P.hull);
    if (this._hullFrame !== this.frameId) { this.hullSetup(P); this._hullFrame = this.frameId; }
    U.m4(P, 'u_model', this.model(pos, q, s));
    U.f(P, 'u_flash', flash);
    if (tint) U.v3(P, 'u_tintU', tint[0], tint[1], tint[2]); else U.v3(P, 'u_tintU', 1, 1, 1);
    U.f(P, 'u_emis', emis);
    drawMesh(mesh);
  },
  frameId: 0, _hullFrame: -1, _hullIFrame: -1,

  // main frame
  render(hooks) {
    this.frameId++;
    const S = this.scene;
    gl.bindFramebuffer(gl.FRAMEBUFFER, S.msFb || S.fb);
    gl.viewport(0, 0, this.sw, this.sh);
    setDepth(true, true);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
    // sky
    setDepth(false, false); setBlend(0); setCull(0);
    let P = useProg(this.P.sky);
    U.tex(P, 'u_sky', this.skyTex, 0, gl.TEXTURE_CUBE_MAP); U.m4(P, 'u_ivp', this.ivp); U.f(P, 'u_bright', hooks.skyBright ?? 1);
    drawFullscreen();
    P = useProg(this.P.stars);
    setBlend(1);
    U.m4(P, 'u_vp', this.vp); U.f(P, 'u_px', this.dpr * this.scale); U.f(P, 'u_time', this.time);
    drawMesh(this.starPts);
    // opaque
    setBlend(0); setDepth(true, true); setCull(1);
    hooks.opaque && hooks.opaque();
    // transparent
    hooks.transparent && hooks.transparent();
    this.fx.draw(true);
    this.fxTop.draw(false);
    // resolve MSAA
    if (S.msFb) {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, S.msFb);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, S.fb);
      gl.blitFramebuffer(0, 0, this.sw, this.sh, 0, 0, this.sw, this.sh, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    }
    setDepth(false, false); setCull(0);
    // bloom
    const B = this.bloom, useBloom = this.q.bloom && B.length > 0;
    if (useBloom) {
      setBlend(0);
      P = useProg(this.P.bloomPre);
      gl.bindFramebuffer(gl.FRAMEBUFFER, B[0].fb); gl.viewport(0, 0, B[0].w, B[0].h);
      U.tex(P, 'u_src', S.tex, 0); U.v2(P, 'u_texel', 1 / this.sw, 1 / this.sh);
      U.f(P, 'u_thresh', GLX.hdr ? 1.0 : 0.82); U.f(P, 'u_knee', 0.45);
      drawFullscreen();
      P = useProg(this.P.bloomDown);
      for (let i = 1; i < B.length; i++) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, B[i].fb); gl.viewport(0, 0, B[i].w, B[i].h);
        U.tex(P, 'u_src', B[i - 1].tex, 0); U.v2(P, 'u_texel', 1 / B[i - 1].w, 1 / B[i - 1].h);
        drawFullscreen();
      }
      P = useProg(this.P.bloomUp);
      setBlend(1);
      for (let i = B.length - 1; i > 0; i--) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, B[i - 1].fb); gl.viewport(0, 0, B[i - 1].w, B[i - 1].h);
        U.tex(P, 'u_src', B[i].tex, 0); U.v2(P, 'u_texel', 1 / B[i].w, 1 / B[i].h); U.f(P, 'u_str', 0.9);
        drawFullscreen();
      }
    }
    // composite to screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.w, this.h);
    setBlend(0);
    P = useProg(this.P.composite);
    U.tex(P, 'u_scene', S.tex, 0);
    if (useBloom) U.tex(P, 'u_bloom', B[0].tex, 1); else U.tex(P, 'u_bloom', S.tex, 1);
    U.f(P, 'u_useBloom', useBloom ? 1 : 0);
    const pp = this.post;
    U.f(P, 'u_bloomStr', pp.bloomStr * (GLX.hdr ? 1 : 0.6)); U.f(P, 'u_exposure', pp.exposure);
    U.v4(P, 'u_hit', pp.hit[0], pp.hit[1], pp.hit[2], pp.hit[3]); U.f(P, 'u_flash', pp.flash);
    U.f(P, 'u_ab', pp.ab); U.f(P, 'u_time', this.time); U.f(P, 'u_vig', pp.vig);
    drawFullscreen();
    gl.bindVertexArray(null);
  },
};
