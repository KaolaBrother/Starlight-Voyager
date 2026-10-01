// ───────────────────────────── WebGL2 core ─────────────────────────────
const canvas = document.getElementById('game');
let gl = null;
try {
  gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: true, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
} catch (e) { gl = null; }

const GLX = { hdr: false, maxSamples: 0, aniso: null, maxAniso: 1 };
const ATTR = { a_pos: 0, a_nrm: 1, a_uv: 2, a_col: 3, i_a: 4, i_b: 5, i_c: 6, i_d: 7 };
const GLSL_HEAD = '#version 300 es\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\nprecision highp samplerCube;\n';

function glInit() {
  if (!gl) return false;
  const e1 = gl.getExtension('EXT_color_buffer_float');
  const e2 = e1 ? null : gl.getExtension('EXT_color_buffer_half_float');
  gl.getExtension('OES_texture_float_linear');
  GLX.aniso = gl.getExtension('EXT_texture_filter_anisotropic');
  if (GLX.aniso) GLX.maxAniso = gl.getParameter(GLX.aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) || 1;
  GLX.maxSamples = gl.getParameter(gl.MAX_SAMPLES) || 0;
  GLX.hdr = !!(e1 || e2);
  if (GLX.hdr) { // verify half-float render targets actually work
    const t = makeTarget(4, 4, { hdr: true });
    GLX.hdr = t.ok; freeTarget(t);
  }
  return true;
}

function compileShader(type, src, name) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) {
    const log = gl.getShaderInfoLog(s);
    const numbered = src.split('\n').map((l, i) => (i + 1) + ': ' + l).join('\n');
    console.error('Shader error in ' + name + '\n' + log + '\n' + numbered);
    throw new Error('Shader compile failed: ' + name + ': ' + log);
  }
  return s;
}

function makeProgram(name, vs, fs, defines = '') {
  const vsrc = GLSL_HEAD + defines + vs, fsrc = GLSL_HEAD + defines + fs;
  const v = compileShader(gl.VERTEX_SHADER, vsrc, name + '.vs');
  const f = compileShader(gl.FRAGMENT_SHADER, fsrc, name + '.fs');
  const p = gl.createProgram();
  gl.attachShader(p, v); gl.attachShader(p, f);
  for (const k in ATTR) gl.bindAttribLocation(p, ATTR[k], k);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error('Link failed: ' + name + ': ' + gl.getProgramInfoLog(p));
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(p, i);
    u[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, info.name);
  }
  return { p, u, name };
}

// ─── state cache ───
const GLS = { prog: null, blend: -1, dt: -1, dw: -1, cull: -1 };
function glResetState() { GLS.prog = null; GLS.blend = -1; GLS.dt = -1; GLS.dw = -1; GLS.cull = -1; }
function useProg(pr) { if (GLS.prog !== pr) { gl.useProgram(pr.p); GLS.prog = pr; } return pr; }
// 0 none, 1 additive, 2 alpha, 3 premultiplied
function setBlend(m) {
  if (GLS.blend === m) return; GLS.blend = m;
  if (m === 0) { gl.disable(gl.BLEND); return; }
  gl.enable(gl.BLEND);
  if (m === 1) gl.blendFunc(gl.ONE, gl.ONE);
  else if (m === 2) gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
}
function setDepth(test, write) {
  if (GLS.dt !== test) { GLS.dt = test; test ? gl.enable(gl.DEPTH_TEST) : gl.disable(gl.DEPTH_TEST); }
  if (GLS.dw !== write) { GLS.dw = write; gl.depthMask(write); }
}
// 0 none, 1 back, 2 front
function setCull(m) {
  if (GLS.cull === m) return; GLS.cull = m;
  if (m === 0) gl.disable(gl.CULL_FACE); else { gl.enable(gl.CULL_FACE); gl.cullFace(m === 1 ? gl.BACK : gl.FRONT); }
}

// uniform helpers (missing uniforms are ignored)
const U = {
  f(pr, n, v) { const l = pr.u[n]; if (l) gl.uniform1f(l, v); },
  i(pr, n, v) { const l = pr.u[n]; if (l) gl.uniform1i(l, v); },
  v2(pr, n, x, y) { const l = pr.u[n]; if (l) gl.uniform2f(l, x, y); },
  v3(pr, n, x, y, z) { const l = pr.u[n]; if (l) gl.uniform3f(l, x, y, z); },
  a3(pr, n, a) { const l = pr.u[n]; if (l) gl.uniform3f(l, a[0], a[1], a[2]); },
  v4(pr, n, x, y, z, w) { const l = pr.u[n]; if (l) gl.uniform4f(l, x, y, z, w); },
  m4(pr, n, m) { const l = pr.u[n]; if (l) gl.uniformMatrix4fv(l, false, m); },
  tex(pr, n, t, unit, target = gl.TEXTURE_2D) {
    const l = pr.u[n]; if (!l) return;
    gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(target, t); gl.uniform1i(l, unit);
  },
};

// ─── textures & render targets ───
function makeTex(w, h, o = {}) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  const internal = o.internal || gl.RGBA8, format = o.format || gl.RGBA, type = o.type || gl.UNSIGNED_BYTE;
  gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, o.data || null);
  const filt = o.nearest ? gl.NEAREST : gl.LINEAR;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, o.mips ? gl.LINEAR_MIPMAP_LINEAR : filt);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filt);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, o.repeatS ? gl.REPEAT : gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

function makeTarget(w, h, o = {}) {
  const hdr = !!o.hdr, internal = o.internal || (hdr ? gl.RGBA16F : gl.RGBA8), type = o.type || (hdr ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE);
  const format = o.format || gl.RGBA;
  const tex = makeTex(w, h, { internal, type, format, mips: o.mips, repeatS: o.repeatS });
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  let depthRb = null;
  if (o.depth) {
    depthRb = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthRb);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRb);
  }
  const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  const T = { fb, tex, w, h, depthRb, ok, msFb: null, msColor: null, msDepth: null, samples: 0, internal };
  if (ok && o.samples > 1) {
    const s = Math.min(o.samples, GLX.maxSamples);
    if (s > 1) {
      const msFb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, msFb);
      const c = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, c);
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, s, internal, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, c);
      const d = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, d);
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, s, gl.DEPTH_COMPONENT24, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, d);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) {
        T.msFb = msFb; T.msColor = c; T.msDepth = d; T.samples = s;
      } else { gl.deleteFramebuffer(msFb); gl.deleteRenderbuffer(c); gl.deleteRenderbuffer(d); }
    }
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindRenderbuffer(gl.RENDERBUFFER, null);
  return T;
}
function freeTarget(T) {
  if (!T) return;
  gl.deleteFramebuffer(T.fb); gl.deleteTexture(T.tex);
  if (T.depthRb) gl.deleteRenderbuffer(T.depthRb);
  if (T.msFb) { gl.deleteFramebuffer(T.msFb); gl.deleteRenderbuffer(T.msColor); gl.deleteRenderbuffer(T.msDepth); }
}

// ─── meshes ───
function makeMesh(geo, mode) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const bufs = [];
  const attr = (loc, data, size) => {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    bufs.push(b);
  };
  attr(0, geo.pos, 3);
  if (geo.nrm) attr(1, geo.nrm, 3);
  if (geo.uv) attr(2, geo.uv, 2);
  if (geo.col) attr(3, geo.col, 4);
  let ib = null, count = geo.pos.length / 3, indexType = 0;
  if (geo.idx) {
    ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.idx, gl.STATIC_DRAW);
    count = geo.idx.length;
    indexType = geo.idx instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
  }
  gl.bindVertexArray(null);
  return { vao, bufs, ib, count, indexType, mode: mode === undefined ? gl.TRIANGLES : mode, inst: null, radius: geo.radius || 1 };
}
function freeMesh(m) {
  if (!m) return;
  gl.deleteVertexArray(m.vao);
  for (const b of m.bufs) gl.deleteBuffer(b);
  if (m.ib) gl.deleteBuffer(m.ib);
  if (m.inst) gl.deleteBuffer(m.inst.buf);
}
// layout: array of [attribLocation, size, offsetInFloats]
function addInstancing(mesh, stride, max, layout) {
  gl.bindVertexArray(mesh.vao);
  const b = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, stride * max * 4, gl.DYNAMIC_DRAW);
  for (const [loc, size, off] of layout) {
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride * 4, off * 4);
    gl.vertexAttribDivisor(loc, 1);
  }
  gl.bindVertexArray(null);
  mesh.inst = { buf: b, data: new Float32Array(stride * max), stride, max, count: 0 };
  return mesh;
}
function uploadInstances(mesh, count) {
  const I = mesh.inst;
  gl.bindBuffer(gl.ARRAY_BUFFER, I.buf);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, I.data, 0, count * I.stride);
}
function drawMesh(m) {
  gl.bindVertexArray(m.vao);
  if (m.ib) gl.drawElements(m.mode, m.count, m.indexType, 0); else gl.drawArrays(m.mode, 0, m.count);
}
function drawInst(m, n) {
  if (n <= 0) return;
  gl.bindVertexArray(m.vao);
  if (m.ib) gl.drawElementsInstanced(m.mode, m.count, m.indexType, 0, n); else gl.drawArraysInstanced(m.mode, 0, m.count, n);
}
let emptyVAO = null;
function drawFullscreen() {
  if (!emptyVAO) emptyVAO = gl.createVertexArray();
  gl.bindVertexArray(emptyVAO);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
