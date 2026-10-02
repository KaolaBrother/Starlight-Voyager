// ───────────────────────────── GLSL sources ─────────────────────────────
const SH = {};

SH.noise = `
vec3 mod289v3(vec3 x){return x - floor(x*(1.0/289.0))*289.0;}
vec4 mod289v4(vec4 x){return x - floor(x*(1.0/289.0))*289.0;}
vec4 permute4(vec4 x){return mod289v4(((x*34.0)+1.0)*x);}
vec4 tis4(vec4 r){return 1.79284291400159 - 0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289v3(i);
  vec4 p = permute4(permute4(permute4(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = tis4(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
//@GENERIC_BEGIN
float fbm(vec3 p, int oct){
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 10; i++) { if (i >= oct) break; s += a * snoise(p); p = p * 2.02 + vec3(17.1, 5.3, 9.7); a *= 0.5; }
  return s;
}
float ridged(vec3 p, int oct){
  float s = 0.0, a = 0.5, w = 1.0;
  for (int i = 0; i < 10; i++) { if (i >= oct) break; float n = 1.0 - abs(snoise(p)); n *= n; n *= w; w = clamp(n * 1.6, 0.0, 1.0); s += a * n; p = p * 2.1 + vec3(3.7, 11.2, 7.9); a *= 0.5; }
  return s;
}
//@GENERIC_END
//@OCTAVES
vec3 hash33(vec3 p3){ p3 = fract(p3 * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yxx) * p3.zyx); }
float hash13(vec3 p3){ p3 = fract(p3 * 0.1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
`;

SH.fsVS = `
out vec2 v_uv;
void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); v_uv = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }
`;

// ─── sky nebula bake (one cube face per draw, output gamma-encoded) ───
SH.skyBakeFS = SH.noise + `
uniform int u_face; uniform vec3 u_core; uniform vec3 u_seed;
in vec2 v_uv; out vec4 o;
vec3 faceDir(int f, vec2 st){ vec2 c = st * 2.0 - 1.0;
  if (f == 0) return vec3(1.0, -c.y, -c.x);
  if (f == 1) return vec3(-1.0, -c.y, c.x);
  if (f == 2) return vec3(c.x, 1.0, c.y);
  if (f == 3) return vec3(c.x, -1.0, -c.y);
  if (f == 4) return vec3(c.x, -c.y, 1.0);
  return vec3(-c.x, -c.y, -1.0); }
float starLayer(vec3 d, float sc, float dens){
  vec3 p = d * sc; vec3 ip = floor(p); vec3 fp = fract(p);
  float present = step(1.0 - dens, hash13(ip + 17.0));
  vec3 c = 0.25 + 0.5 * hash33(ip);
  float dd = length(fp - c);
  return present * smoothstep(0.22, 0.0, dd) * (0.3 + 0.7 * hash13(ip + 3.0));
}
vec3 sky(vec3 d){
  float lat = d.y + 0.08 * fbm(d * 2.0 + u_seed, 3);
  float band = exp(-lat * lat * 9.0);
  float bandT = exp(-lat * lat * 40.0);
  float core = pow(max(dot(d, u_core), 0.0), 3.0);
  vec3 p = d * 2.4 + u_seed;
  float n1 = fbm(p, 6) * 0.5 + 0.5;
  float n2 = fbm(p * 3.1 + 7.0, 5) * 0.5 + 0.5;
  float haze = band * mix(0.35, 1.0, n1) * mix(0.6, 1.0, n2);
  float lanes = smoothstep(-0.02, 0.32, fbm(d * vec3(5.0, 12.0, 5.0) + u_seed + 3.0, 6)) * bandT;
  vec3 hazeCol = mix(vec3(0.40, 0.46, 0.78), vec3(1.0, 0.76, 0.48), clamp(core * 0.9 + bandT * 0.15, 0.0, 1.0));
  vec3 col = hazeCol * haze * (0.03 + 0.20 * core * band + 0.035 * bandT);
  col *= 1.0 - lanes * 0.85;
  vec3 q = d * 1.5 + u_seed * 0.37;
  vec3 w = vec3(fbm(q + vec3(1.7, 9.2, 0.3), 4), fbm(q + vec3(8.3, 2.8, 4.1), 4), fbm(q + vec3(3.1, 6.6, 7.3), 4));
  float neb = fbm(q * 1.3 + w * 2.1, 6);
  float fine = fbm(q * 4.2 + w * 1.3, 5);
  float region = smoothstep(-0.08, 0.42, fbm(d * 0.85 + u_seed + 20.0, 3));
  vec3 cA = vec3(0.60, 0.08, 0.42), cB = vec3(0.06, 0.26, 0.74), cC = vec3(0.95, 0.38, 0.14), cD = vec3(0.06, 0.55, 0.55);
  vec3 nc = mix(cA, cB, smoothstep(-0.25, 0.25, w.x));
  nc = mix(nc, cC, smoothstep(0.05, 0.45, w.y) * 0.6);
  nc = mix(nc, cD, smoothstep(0.15, 0.55, w.z) * 0.45);
  float dens = smoothstep(-0.12, 0.5, neb) * (0.5 + 0.5 * smoothstep(-0.3, 0.4, fine));
  col += nc * dens * region * 0.15;
  col += nc * pow(max(neb, 0.0), 3.0) * region * 0.25;
  col *= 1.0 - smoothstep(0.15, 0.55, fine) * 0.4 * region;
  float s = starLayer(d, 190.0, 0.2 + band * 0.45) * 0.45 + starLayer(d, 420.0, 0.12 + band * 0.55) * 0.3;
  col += vec3(0.85, 0.9, 1.0) * s * (0.45 + band);
  col += vec3(0.003, 0.0035, 0.008);
  return col;
}
void main(){ vec3 d = normalize(faceDir(u_face, v_uv)); vec3 c = sky(d); o = vec4(pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2)), 1.0); }
`;

SH.skyFS = `
uniform samplerCube u_sky; uniform mat4 u_ivp; uniform float u_bright;
in vec2 v_uv; out vec4 o;
void main(){ vec4 p = u_ivp * vec4(v_uv * 2.0 - 1.0, 1.0, 1.0); vec3 d = normalize(p.xyz / p.w); vec3 c = pow(texture(u_sky, d).rgb, vec3(2.2)); o = vec4(c * u_bright, 1.0); }
`;

SH.starsVS = `
in vec3 a_pos; in vec4 a_col;
uniform mat4 u_vp; uniform float u_px; uniform float u_time;
out vec3 v_c;
void main(){
  gl_Position = u_vp * vec4(a_pos * 5000.0, 1.0);
  float tw = 0.78 + 0.22 * sin(u_time * (0.6 + fract(a_pos.x * 91.7) * 2.4) + a_pos.y * 311.0);
  v_c = a_col.rgb * tw;
  gl_PointSize = max(a_col.a * u_px, 1.0);
}`;
SH.starsFS = `
in vec3 v_c; out vec4 o;
void main(){ vec2 c = gl_PointCoord * 2.0 - 1.0; float d = dot(c, c); if (d > 1.0) discard; float a = exp(-d * 3.2); o = vec4(v_c * a, 1.0); }
`;

// ─── planet surface bake ───
SH.planetBakeFS = SH.noise + `
uniform int u_type; uniform int u_mode; uniform vec3 u_seed; uniform vec3 u_c[6]; uniform vec4 u_p; uniform vec4 u_p2; uniform vec3 u_spot;
in vec2 v_uv; out vec4 o;

float craters(vec3 d, float scale, float density){
  vec3 p = d * scale + u_seed * 0.37;
  vec3 ip = floor(p), fp = fract(p);
  float h = 0.0;
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec3 g = vec3(float(x), float(y), float(z));
    vec3 cell = ip + g;
    float present = step(1.0 - density, hash13(cell + 5.1));
    vec3 c = g + 0.15 + 0.7 * hash33(cell) - fp;
    float r = 0.22 + 0.22 * hash13(cell + 9.7);
    float dd = length(c) / r;
    float bowl = dd < 1.0 ? (dd * dd - 1.0) : 0.0;
    float rim = exp(-pow((dd - 1.0) * 3.5, 2.0)) * 0.45;
    h += present * (bowl + rim) * (0.6 + 0.4 * hash13(cell + 2.2));
  }
  return h;
}
vec4 tTerran(vec3 d, vec3 p){
  float warp = fbm(p * 1.3 + 11.0, 4);
  float h = fbm(p * 1.1 + warp * 0.55, 7) + u_p.y;
  float sea = u_p.x;
  float lat = abs(d.y);
  float moist = fbm(p * 2.2 + 31.0, 4) * 0.5 + 0.5;
  vec3 col; float spec;
  if (h < sea) {
    float dp = clamp((sea - h) * 3.2, 0.0, 1.0);
    col = mix(u_c[1], u_c[0], sqrt(dp));
    spec = 1.0;
  } else {
    float e = clamp((h - sea) * 2.4, 0.0, 1.0);
    vec3 low = mix(u_c[2], u_c[3], smoothstep(0.42, 0.78, (1.0 - moist) * 0.85 + lat * 0.12 + e * 0.25));
    col = mix(u_c[5], low, smoothstep(0.0, 0.03, e));
    col = mix(col, u_c[4], smoothstep(0.32, 0.62, e));
    col = mix(col, vec3(0.86, 0.88, 0.92), smoothstep(0.84, 0.97, e));
    col *= 0.82 + 0.36 * (fbm(p * 9.0, 3) * 0.5 + 0.5);
    spec = 0.0;
  }
  float ice = smoothstep(u_p.z, u_p.z + 0.05, lat + fbm(p * 3.0 + 5.0, 3) * 0.12);
  col = mix(col, vec3(0.86, 0.9, 0.97), ice);
  spec *= 1.0 - ice;
  return vec4(col, spec);
}
vec4 tDesert(vec3 d, vec3 p){
  float h = fbm(p * 1.4, 6);
  float dn = fbm(p * 3.0, 3);
  float dunes = sin(dot(d, normalize(vec3(0.3, 0.25, 1.0))) * 140.0 + dn * 7.0) * 0.5 + 0.5;
  dunes *= smoothstep(-0.1, 0.3, h);
  float can = ridged(p * 2.2 + 4.0, 5);
  vec3 col = mix(u_c[0], u_c[1], smoothstep(-0.3, 0.5, h));
  col = mix(col, u_c[2], dunes * 0.35);
  col = mix(col, u_c[3], smoothstep(0.55, 0.9, can) * 0.85);
  col = mix(col, u_c[4], smoothstep(0.3, 0.6, fbm(p * 0.8 + 9.0, 3)) * 0.4);
  col *= 0.9 + 0.2 * (fbm(p * 11.0, 3) * 0.5 + 0.5);
  float pole = smoothstep(0.88, 0.95, abs(d.y) + h * 0.05);
  col = mix(col, vec3(0.82, 0.8, 0.76), pole * 0.7);
  return vec4(col, clamp(h * 0.5 + 0.5 - smoothstep(0.55, 0.9, can) * 0.3, 0.0, 1.0));
}
vec4 tIce(vec3 d, vec3 p){
  float h = fbm(p * 1.5, 6);
  float cr = ridged(p * 3.5 + 2.0, 5);
  vec3 col = mix(u_c[0], u_c[1], smoothstep(-0.35, 0.45, h));
  col = mix(col, u_c[2], smoothstep(0.62, 0.95, cr) * 0.8);
  float sea = smoothstep(-0.2, -0.38, h);
  col = mix(col, u_c[3], sea * 0.85);
  col *= 0.9 + 0.2 * (fbm(p * 12.0, 3) * 0.5 + 0.5);
  return vec4(col, 0.25 + sea * 0.6);
}
vec4 tLava(vec3 d, vec3 p){
  float h = fbm(p * 1.3, 6);
  float r = ridged(p * 1.8 + 3.0, 6);
  float cracks = smoothstep(0.6, 0.92, r);
  float lakes = smoothstep(-0.16, -0.32, h);
  vec3 rock = mix(u_c[0], u_c[1], smoothstep(-0.2, 0.5, h + fbm(p * 6.0, 3) * 0.3));
  float hot = max(cracks, lakes);
  vec3 molten = mix(u_c[2], u_c[3], smoothstep(0.3, 1.0, hot) * (0.5 + 0.5 * fbm(p * 8.0, 2)));
  return vec4(mix(rock, molten, hot), hot);
}
vec4 tGas(vec3 d, vec3 p){
  float lat = d.y;
  float t1 = fbm(vec3(d.x * 2.0, lat * 9.0, d.z * 2.0) + u_seed, 5);
  float t2 = fbm(vec3(d.x * 5.0, lat * 24.0, d.z * 5.0) + u_seed * 1.3, 4);
  float y = lat * u_p.x + t1 * u_p.y + t2 * u_p.y * 0.35;
  float b1 = sin(y * 3.14159) * 0.5 + 0.5;
  float b2 = sin(y * 1.73 + 1.1) * 0.5 + 0.5;
  float b3 = sin(y * 5.1 + 2.0) * 0.5 + 0.5;
  vec3 col = mix(u_c[0], u_c[1], b1);
  col = mix(col, u_c[2], b2 * 0.55);
  col = mix(col, u_c[3], b3 * 0.35 * smoothstep(-0.2, 0.6, t2 + 0.3));
  vec3 sp = normalize(u_spot);
  vec3 east = normalize(cross(vec3(0.0, 1.0, 0.0), sp));
  vec3 north = cross(sp, east);
  vec2 lc = vec2(dot(d - sp, east) / (u_p.z * 1.8), dot(d - sp, north) / u_p.z);
  float sd = length(lc);
  float sa = atan(lc.y, lc.x) + sd * 5.0;
  float sn = fbm(vec3(cos(sa) * sd, sin(sa) * sd, 0.5) * 3.0 + u_seed, 3);
  float spot = smoothstep(1.0, 0.55, sd) * step(0.0, dot(d, sp));
  col = mix(col, mix(u_c[4], u_c[5], sn * 0.5 + 0.5), spot * 0.92);
  col *= 0.82 + 0.18 * (1.0 - abs(lat));
  return vec4(col, 0.0);
}
vec4 tToxic(vec3 d, vec3 p){
  vec3 w = vec3(fbm(p + 1.0, 4), fbm(p + 7.0, 4), fbm(p + 13.0, 4));
  float n = fbm(p * 1.5 + w * 1.8, 6);
  float bands = sin(d.y * 10.0 + n * 4.0) * 0.5 + 0.5;
  vec3 col = mix(u_c[0], u_c[1], smoothstep(-0.4, 0.4, n));
  col = mix(col, u_c[2], bands * 0.4);
  col = mix(col, u_c[3], smoothstep(0.25, 0.6, w.x) * 0.5);
  float glow = smoothstep(0.42, 0.7, fbm(p * 3.0 + w * 2.0, 4));
  return vec4(col, glow * 0.7);
}
vec4 tCrystal(vec3 d, vec3 p){
  vec3 q = d * u_p.x + u_seed;
  vec3 ip = floor(q), fp = fract(q);
  float d1 = 9.0, d2 = 9.0; vec3 id = vec3(0.0);
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec3 g = vec3(float(x), float(y), float(z));
    vec3 r = g + hash33(ip + g) - fp;
    float dd = dot(r, r);
    if (dd < d1) { d2 = d1; d1 = dd; id = ip + g; } else if (dd < d2) { d2 = dd; }
  }
  float edge = sqrt(d2) - sqrt(d1);
  float hc = hash13(id);
  vec3 col = mix(u_c[0], u_c[1], hc);
  col = mix(col, u_c[2], smoothstep(0.7, 1.0, hash13(id + 4.0)) * 0.7);
  col *= 0.55 + 0.45 * (fbm(q * 0.6, 3) * 0.5 + 0.5) + 0.25 * hc;
  float vein = smoothstep(0.09, 0.0, edge);
  col = mix(col, u_c[3], vein);
  return vec4(col, clamp(vein * 0.95 + smoothstep(0.86, 1.0, hc) * 0.45, 0.0, 1.0));
}
vec4 tBarren(vec3 d, vec3 p){
  float h = fbm(p * 1.5, 6) * 0.5;
  float cr = craters(d, 6.0, 0.55) * 0.35 + craters(d, 14.0, 0.5) * 0.18 + craters(d, 31.0, 0.45) * 0.08;
  h += cr;
  vec3 col = mix(u_c[0], u_c[1], smoothstep(-0.45, 0.45, h));
  col = mix(col, u_c[2], smoothstep(0.15, 0.55, fbm(p * 0.7 + 3.0, 3)) * 0.55);
  col *= 0.72 + 0.5 * clamp(cr + 0.5, 0.0, 1.0);
  return vec4(col, clamp(h * 0.6 + 0.5, 0.0, 1.0));
}
vec4 tIron(vec3 d, vec3 p){
  float h = fbm(p * 1.2, 6);
  float cr = craters(d, 7.0, 0.42) * 0.25 + craters(d, 17.0, 0.36) * 0.12;
  float can = ridged(p * 1.6 + 8.0, 5);
  vec3 col = mix(u_c[0], u_c[1], smoothstep(-0.35, 0.45, h + cr));
  col = mix(col, u_c[2], smoothstep(0.08, 0.6, fbm(p * 2.0 + 4.0, 4)) * 0.55);
  col = mix(col, u_c[3], smoothstep(0.6, 0.95, can) * 0.65);
  col *= 0.8 + 0.35 * clamp(cr + 0.5, 0.0, 1.0);
  float cap = smoothstep(0.9, 0.95, abs(d.y) + h * 0.04);
  col = mix(col, vec3(0.86, 0.84, 0.82), cap);
  return vec4(col, clamp((h + cr) * 0.5 + 0.5 - smoothstep(0.6, 0.95, can) * 0.25, 0.0, 1.0));
}
vec4 tBio(vec3 d, vec3 p){
  float h = fbm(p * 1.3, 5);
  float v1 = ridged(p * 2.5 + 3.0, 6);
  float v2 = ridged(p * 5.0 + 9.0, 4);
  float veins = smoothstep(0.72, 0.95, v1) + smoothstep(0.78, 0.98, v2) * 0.5;
  vec3 col = mix(u_c[0], u_c[1], smoothstep(-0.3, 0.5, h));
  vec3 gc = mix(u_c[2], u_c[3], smoothstep(-0.2, 0.3, fbm(p * 0.8 + 2.0, 3)));
  col = mix(col, gc, clamp(veins, 0.0, 1.0));
  float pools = smoothstep(-0.25, -0.4, h);
  col = mix(col, u_c[4], pools);
  return vec4(col, clamp(veins + pools * 0.8, 0.0, 1.0));
}
vec4 tMachine(vec3 d, vec3 p){
  vec3 ad = abs(d); vec2 f; float face;
  if (ad.x > ad.y && ad.x > ad.z) { f = d.yz / ad.x; face = d.x > 0.0 ? 1.0 : 2.0; }
  else if (ad.y > ad.z) { f = d.xz / ad.y; face = d.y > 0.0 ? 3.0 : 4.0; }
  else { f = d.xy / ad.z; face = d.z > 0.0 ? 5.0 : 6.0; }
  vec2 g = f * u_p.x; vec2 gi = floor(g), gf = fract(g);
  float panel = hash12(gi + face * 37.0);
  float line = 1.0 - smoothstep(0.0, 0.05, min(min(gf.x, 1.0 - gf.x), min(gf.y, 1.0 - gf.y)));
  vec2 g2 = f * u_p.x * 5.0; vec2 gf2 = fract(g2);
  float line2 = 1.0 - smoothstep(0.0, 0.08, min(min(gf2.x, 1.0 - gf2.x), min(gf2.y, 1.0 - gf2.y)));
  vec3 col = mix(u_c[0], u_c[1], panel * 0.8);
  col = mix(col, u_c[2], step(0.82, panel) * 0.6);
  col *= (1.0 - line * 0.55) * (1.0 - line2 * 0.18);
  float cluster = smoothstep(0.0, 0.45, fbm(p * 2.3, 4));
  float lights = step(0.6, hash12(floor(g2) + face * 11.0)) * cluster;
  float trench = line * smoothstep(0.1, 0.5, fbm(p * 1.1 + 5.0, 3));
  return vec4(col, clamp(lights * 0.9 + trench * 0.8, 0.0, 1.0));
}
vec4 tStorm(vec3 d, vec3 p){
  vec3 w = vec3(fbm(p * 1.2 + 3.0, 4), fbm(p * 1.2 + 9.0, 4), 0.0);
  float y = d.y * u_p.x + w.x * 1.8;
  float n = fbm(vec3(d.x * 3.0 + w.y, y * 2.0, d.z * 3.0), 5);
  vec3 col = mix(u_c[0], u_c[1], sin(y * 2.5) * 0.5 + 0.5);
  col = mix(col, u_c[2], smoothstep(-0.2, 0.5, n) * 0.6);
  col = mix(col, u_c[3], smoothstep(0.3, 0.7, w.y) * 0.5);
  float flash = smoothstep(0.6, 0.8, fbm(p * 4.0 + w * 3.0, 4));
  return vec4(col, flash * 0.55);
}
vec4 tIceGiant(vec3 d, vec3 p){
  float t = fbm(vec3(d.x * 2.0, d.y * 7.0, d.z * 2.0) + u_seed, 4);
  float y = d.y * u_p.x + t * u_p.y;
  vec3 col = mix(u_c[0], u_c[1], sin(y * 3.0) * 0.5 + 0.5);
  col = mix(col, u_c[2], smoothstep(0.1, 0.6, fbm(p * 2.0, 4)) * 0.3);
  col *= 0.86 + 0.14 * (1.0 - abs(d.y));
  return vec4(col, 0.0);
}
vec4 tSulfur(vec3 d, vec3 p){
  float h = fbm(p * 1.5, 5);
  vec3 col = mix(u_c[0], u_c[1], smoothstep(-0.4, 0.4, h));
  col = mix(col, u_c[2], smoothstep(0.1, 0.5, fbm(p * 3.0 + 5.0, 4)) * 0.6);
  vec3 q = d * 9.0 + u_seed; vec3 ip = floor(q), fp = fract(q); float d1 = 9.0;
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec3 g = vec3(float(x), float(y), float(z)); vec3 r = g + hash33(ip + g) - fp; d1 = min(d1, dot(r, r)); }
  d1 = sqrt(d1);
  float cal = smoothstep(0.2, 0.08, d1);
  float ring = smoothstep(0.34, 0.2, d1) - cal;
  col = mix(col, u_c[3], ring * 0.75);
  col = mix(col, u_c[4], cal);
  return vec4(col, cal * 0.85);
}
vec4 tShattered(vec3 d, vec3 p){
  float h = fbm(p * 1.4, 6);
  float cr = craters(d, 8.0, 0.4) * 0.2;
  float r = ridged(p * 1.2 + 6.0, 6);
  float fiss = smoothstep(0.76, 0.97, r);
  vec3 col = mix(u_c[0], u_c[1], smoothstep(-0.3, 0.4, h + cr));
  col *= 0.8 + 0.3 * clamp(cr + 0.5, 0.0, 1.0);
  col = mix(col, u_c[2], fiss);
  return vec4(col, fiss);
}
vec4 tRogue(vec3 d, vec3 p){
  float h = fbm(p * 1.3, 6);
  float ice = smoothstep(0.15, 0.5, fbm(p * 2.0 + 3.0, 4));
  vec3 col = mix(u_c[0], u_c[1], smoothstep(-0.3, 0.4, h));
  col = mix(col, u_c[2], ice * 0.6);
  float aur = smoothstep(0.72, 0.95, abs(d.y)) * (0.5 + 0.5 * fbm(p * 4.0, 3));
  float cracks = smoothstep(0.82, 0.97, ridged(p * 2.0 + 1.0, 5));
  return vec4(mix(col, u_c[3], cracks), clamp(aur * 0.8 + cracks * 0.7, 0.0, 1.0));
}
float cloudsF(vec3 d){
  vec3 p = d * 2.0 + u_seed * 1.7 + 50.0;
  vec3 w = vec3(fbm(p * 0.9, 3), fbm(p * 0.9 + 5.0, 3), fbm(p * 0.9 + 9.0, 3));
  float n = fbm(p * 1.4 + w * 1.7 + vec3(0.0, d.y * 2.0, 0.0), 6);
  float n2 = fbm(p * 4.0 + w * 2.0, 4);
  float c = smoothstep(u_p2.x - 0.05, u_p2.x + 0.45, n + n2 * 0.28);
  c *= 0.6 + 0.4 * smoothstep(0.0, 0.3, abs(abs(d.y) - 0.45));
  return c * u_p2.y;
}
void main(){
  float phi = v_uv.x * 6.28318530718;
  float th = (1.0 - v_uv.y) * 3.14159265359;
  vec3 d = vec3(-cos(phi) * sin(th), cos(th), sin(phi) * sin(th));
  if (u_mode == 1) { float c = cloudsF(d); o = vec4(c, c, c, 1.0); return; }
  vec3 p = d * u_p2.z + u_seed;
  vec4 r;
  if (u_type == 0 || u_type == 7 || u_type == 8 || u_type == 17) r = tTerran(d, p);
  else if (u_type == 1) r = tDesert(d, p);
  else if (u_type == 2) r = tIce(d, p);
  else if (u_type == 3) r = tLava(d, p);
  else if (u_type == 4) r = tGas(d, p);
  else if (u_type == 5) r = tToxic(d, p);
  else if (u_type == 6) r = tCrystal(d, p);
  else if (u_type == 9) r = tBarren(d, p);
  else if (u_type == 10) r = tIron(d, p);
  else if (u_type == 11) r = tBio(d, p);
  else if (u_type == 12) r = tMachine(d, p);
  else if (u_type == 13) r = tStorm(d, p);
  else if (u_type == 14) r = tIceGiant(d, p);
  else if (u_type == 15) r = tSulfur(d, p);
  else if (u_type == 16) r = tShattered(d, p);
  else r = tRogue(d, p);
  o = vec4(pow(clamp(r.rgb, 0.0, 1.0), vec3(1.0 / 2.2)), clamp(r.a, 0.0, 1.0));
}`;

// ─── planet render ───
SH.planetVS = `
in vec3 a_pos; in vec3 a_nrm; in vec2 a_uv;
uniform mat4 u_model; uniform mat4 u_vp;
out vec2 v_uv; out vec3 v_wpos; out vec3 v_nrm; out vec3 v_opos; out vec3 v_east; out vec3 v_north;
void main(){
  v_uv = a_uv; v_opos = a_pos;
  vec4 w = u_model * vec4(a_pos, 1.0);
  v_wpos = w.xyz;
  mat3 m = mat3(u_model);
  v_nrm = m * a_nrm;
  vec3 e = normalize(vec3(a_pos.z, 0.0, -a_pos.x) + vec3(1e-5, 0.0, 0.0));
  v_east = m * e; v_north = m * cross(a_pos, e);
  gl_Position = u_vp * w;
}`;
SH.planetFS = SH.noise + `
uniform sampler2D u_map; uniform sampler2D u_cloud;
uniform float u_hasCloud; uniform float u_cloudOff; uniform vec3 u_star; uniform vec3 u_starCol;
uniform vec3 u_atmo; uniform float u_atmoStr; uniform int u_amode; uniform vec3 u_emis; uniform float u_detail;
uniform vec2 u_texel; uniform float u_bump; uniform float u_ambient;
in vec2 v_uv; in vec3 v_wpos; in vec3 v_nrm; in vec3 v_opos; in vec3 v_east; in vec3 v_north; out vec4 o;
void main(){
  vec4 t = texture(u_map, v_uv);
  vec3 alb = pow(t.rgb, vec3(2.2));
  vec3 Ng = normalize(v_nrm);
  vec3 N = Ng;
#ifndef LITE
  if (u_detail > 0.01) {
    float dn = snoise(v_opos * 60.0) * 0.5 + snoise(v_opos * 150.0) * 0.3;
    alb *= 1.0 + dn * 0.14 * u_detail;
  }
#endif
  if (u_amode == 2 && u_bump > 0.001) {
    float hu = texture(u_map, v_uv + vec2(u_texel.x, 0.0)).a;
    float hv = texture(u_map, v_uv + vec2(0.0, u_texel.y)).a;
    N = normalize(Ng - (normalize(v_east) * (hu - t.a) + normalize(v_north) * (hv - t.a)) * u_bump);
  }
  vec3 V = normalize(-v_wpos);
  vec3 L = normalize(u_star - v_wpos);
  float ndl = dot(N, L);
  float ndlG = dot(Ng, L);
  float wrap = clamp((ndl + 0.06) / 1.06, 0.0, 1.0) * smoothstep(-0.2, 0.05, ndlG);
  float cl = 0.0, csh = 0.0;
  if (u_hasCloud > 0.5) {
    vec2 cuv = vec2(v_uv.x + u_cloudOff, v_uv.y);
    cl = texture(u_cloud, cuv).r;
    csh = texture(u_cloud, cuv + vec2(0.004, 0.002)).r;
  }
  alb *= 1.0 - csh * 0.45;
  vec3 col = alb * u_starCol * wrap;
  if (u_amode == 0) {
    vec3 H = normalize(L + V);
    float sp = pow(max(dot(Ng, H), 0.0), 70.0) * t.a * (1.0 - cl);
    col += u_starCol * sp * 0.6 * smoothstep(0.0, 0.1, ndlG);
  }
  float cw = clamp((ndlG + 0.1) / 1.1, 0.0, 1.0);
  col = mix(col, u_starCol * cw * 0.92, cl);
  if (u_amode == 1) {
    float night = smoothstep(0.2, -0.3, ndlG);
    col += u_emis * t.a * (0.3 + 1.0 * night) * (1.0 - cl * 0.85);
  }
  col += alb * u_ambient;
  float vn = max(dot(Ng, V), 0.0);
  float fres = pow(1.0 - vn, 2.4);
  col += u_atmo * fres * smoothstep(-0.3, 0.45, ndlG) * u_atmoStr;
  o = vec4(col, 1.0);
}`;

SH.atmoVS = `
in vec3 a_pos; in vec3 a_nrm;
uniform mat4 u_model; uniform mat4 u_vp;
out vec3 v_wpos; out vec3 v_nrm;
void main(){ vec4 w = u_model * vec4(a_pos, 1.0); v_wpos = w.xyz; v_nrm = mat3(u_model) * a_nrm; gl_Position = u_vp * w; }`;
SH.atmoFS = `
uniform vec3 u_atmo; uniform vec3 u_star; uniform float u_limb; uniform float u_str;
in vec3 v_wpos; in vec3 v_nrm; out vec4 o;
void main(){
  vec3 N = normalize(v_nrm); vec3 V = normalize(-v_wpos);
  float d = dot(N, V);
  float t = clamp(-d / u_limb, 0.0, 1.0);
  float g = pow(t, 3.0);
  vec3 L = normalize(u_star - v_wpos);
  float lit = smoothstep(-0.45, 0.55, dot(N, L));
  o = vec4(u_atmo * g * lit * u_str, 1.0);
}`;

SH.ringVS = `
in vec3 a_pos; in vec2 a_uv;
uniform mat4 u_model; uniform mat4 u_vp;
out vec2 v_uv; out vec3 v_wpos;
void main(){ v_uv = a_uv; vec4 w = u_model * vec4(a_pos, 1.0); v_wpos = w.xyz; gl_Position = u_vp * w; }`;
SH.ringFS = SH.noise + `
uniform vec3 u_c1; uniform vec3 u_c2; uniform vec3 u_c3; uniform float u_seed; uniform vec3 u_star; uniform vec3 u_starCol;
uniform vec3 u_center; uniform float u_R; uniform vec3 u_nrm; uniform float u_alpha;
in vec2 v_uv; in vec3 v_wpos; out vec4 o;
void main(){
  float r = v_uv.x;
  float n1 = snoise(vec3(r * 22.0, u_seed, 0.5)) * 0.5 + 0.5;
  float n2 = snoise(vec3(r * 85.0, u_seed * 2.0, 1.5)) * 0.5 + 0.5;
  float n3 = snoise(vec3(r * 260.0, u_seed * 3.0, 2.5)) * 0.5 + 0.5;
  float dens = (0.2 + 0.8 * n1) * (0.45 + 0.55 * n2) * (0.7 + 0.3 * n3);
  dens *= smoothstep(0.0, 0.08, r) * smoothstep(1.0, 0.86, r);
  dens *= smoothstep(0.012, 0.035, abs(r - 0.63));
  vec3 col = mix(u_c1, u_c2, smoothstep(0.2, 0.8, n1));
  col = mix(col, u_c3, smoothstep(0.6, 0.9, n2) * 0.5);
  vec3 L = normalize(u_star - v_wpos);
  vec3 oc = v_wpos - u_center;
  float b = dot(oc, L);
  float c = dot(oc, oc) - u_R * u_R;
  float h = b * b - c;
  float sh = b < 0.0 ? smoothstep(0.0, u_R * u_R * 0.03, h) : 0.0;
  float lit = 1.0 - sh * 0.93;
  float side = 0.55 + 0.45 * abs(dot(u_nrm, L));
  o = vec4(col * u_starCol * lit * side, clamp(dens * u_alpha, 0.0, 1.0));
}`;

SH.sunVS = `
in vec3 a_pos; in vec3 a_nrm;
uniform mat4 u_model; uniform mat4 u_vp;
out vec3 v_opos; out vec3 v_nrm; out vec3 v_wpos;
void main(){ v_opos = a_pos; vec4 w = u_model * vec4(a_pos, 1.0); v_wpos = w.xyz; v_nrm = mat3(u_model) * a_nrm; gl_Position = u_vp * w; }`;
SH.sunFS = SH.noise + `
uniform vec3 u_col; uniform float u_time; uniform float u_dark;
in vec3 v_opos; in vec3 v_nrm; in vec3 v_wpos; out vec4 o;
void main(){
  if (u_dark > 0.5) { o = vec4(0.0, 0.0, 0.0, 1.0); return; }
  vec3 p = normalize(v_opos);
#ifdef LITE
  float n = 0.6, g = 0.5;
#else
  float n = fbm(p * 5.0 + vec3(0.0, u_time * 0.03, u_time * 0.02), 4) * 0.5 + 0.5;
  float g = snoise(p * 22.0 + vec3(u_time * 0.08)) * 0.5 + 0.5;
#endif
  float v = n * 0.72 + g * 0.28;
  vec3 V = normalize(-v_wpos);
  float mu = max(dot(normalize(v_nrm), V), 0.0);
  float limb = 0.4 + 0.6 * pow(mu, 0.5);
  vec3 c = u_col * (1.1 + v * 1.5) * limb;
  c += vec3(1.0, 0.95, 0.85) * pow(v, 5.0) * 0.9 * limb;
  o = vec4(c, 1.0);
}`;

SH.diskVS = `
in vec3 a_pos; in vec2 a_uv;
uniform mat4 u_model; uniform mat4 u_vp;
out vec2 v_uv; out vec3 v_opos; out vec3 v_wpos; out vec3 v_tan;
void main(){ v_uv = a_uv; v_opos = a_pos; vec4 w = u_model * vec4(a_pos, 1.0); v_wpos = w.xyz;
  v_tan = mat3(u_model) * normalize(vec3(-a_pos.z, 0.0, a_pos.x) + 1e-5); gl_Position = u_vp * w; }`;
SH.diskFS = SH.noise + `
uniform float u_time; uniform float u_str;
in vec2 v_uv; in vec3 v_opos; in vec3 v_wpos; in vec3 v_tan; out vec4 o;
void main(){
  float r = v_uv.x;
  float rad = mix(1.0, 3.6, r);
  float ang = atan(v_opos.z, v_opos.x);
  float spd = 0.9 / pow(rad, 1.5);
  float a2 = ang - u_time * spd;
  vec3 q = vec3(cos(a2) * rad, sin(a2) * rad, r * 2.0);
#ifdef LITE
  float n = 0.5 + 0.5 * sin(a2 * 3.0 + rad * 4.0), fil = 0.6;
#else
  float n = fbm(q * 1.7 + vec3(0.0, 0.0, u_time * 0.04), 5) * 0.5 + 0.5;
  float fil = fbm(vec3(cos(a2) * rad * 3.0, sin(a2) * rad * 3.0, r * 14.0), 3) * 0.5 + 0.5;
#endif
  float dens = smoothstep(0.0, 0.06, r) * pow(1.0 - r, 1.3) * (0.25 + 0.95 * n) * (0.7 + 0.5 * fil);
  vec3 hot = vec3(1.0, 0.92, 0.85) * 4.2, mid = vec3(1.0, 0.5, 0.14) * 2.2, cool = vec3(0.55, 0.1, 0.04);
  vec3 col = mix(hot, mid, smoothstep(0.0, 0.3, r));
  col = mix(col, cool, smoothstep(0.3, 1.0, r));
  float dop = dot(normalize(v_tan), normalize(-v_wpos));
  col *= 1.0 + dop * 0.75;
  o = vec4(col * dens * u_str, 1.0);
}`;

// ─── ships / props (non-instanced and instanced) ───
SH.hullVS = `
in vec3 a_pos; in vec3 a_nrm; in vec4 a_col;
#ifdef INST
in vec4 i_a; in vec4 i_b; in vec4 i_c;
uniform vec3 u_origin;
#else
uniform mat4 u_model;
#endif
uniform mat4 u_vp;
out vec3 v_wpos; out vec3 v_nrm; out vec4 v_col; out vec4 v_tint;
vec3 qrot(vec4 q, vec3 v){ return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v); }
void main(){
#ifdef INST
  vec3 wp = u_origin + i_a.xyz + qrot(i_b, a_pos * i_a.w);
  v_nrm = qrot(i_b, a_nrm);
  v_tint = i_c;
#else
  vec3 wp = (u_model * vec4(a_pos, 1.0)).xyz;
  v_nrm = mat3(u_model) * a_nrm;
  v_tint = vec4(1.0, 1.0, 1.0, 1.0);
#endif
  v_wpos = wp; v_col = a_col;
  gl_Position = u_vp * vec4(wp, 1.0);
}`;
SH.hullFS = `
uniform vec3 u_light; uniform vec3 u_lightCol; uniform vec3 u_amb; uniform samplerCube u_env;
uniform float u_flash; uniform vec3 u_tintU; uniform float u_emis; uniform float u_envLod;
in vec3 v_wpos; in vec3 v_nrm; in vec4 v_col; in vec4 v_tint; out vec4 o;
void main(){
  vec3 N = normalize(v_nrm);
  vec3 V = normalize(-v_wpos);
  vec3 L = normalize(u_light - v_wpos);
  float ndl = max(dot(N, L), 0.0);
  vec3 base = v_col.rgb * v_tint.rgb * u_tintU;
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 36.0);
  float vn = max(dot(N, V), 0.0);
  float fres = pow(1.0 - vn, 3.0);
  vec3 env = pow(textureLod(u_env, reflect(-V, N), u_envLod).rgb, vec3(2.2));
  vec3 col = base * (u_amb + u_lightCol * ndl) + u_lightCol * spec * 0.4;
  col += env * (0.35 + fres * 1.2) * 0.9;
  col += base * (0.16 * vn + 0.3 * fres);
  float e = v_col.a;
  vec3 emc = v_col.rgb * v_tint.rgb * e * u_emis * v_tint.a;
  col = mix(col, emc, clamp(e, 0.0, 1.0));
  col += vec3(1.0, 0.92, 0.85) * u_flash;
  o = vec4(col, 1.0);
}`;

// ─── billboard FX (projectiles, glows, particles, bars) ───
SH.fxVS = `
in vec3 a_pos; in vec4 i_a; in vec4 i_b; in vec4 i_c; in vec4 i_d;
uniform mat4 u_view; uniform mat4 u_proj;
out vec2 v_q; out float v_half; out vec4 v_col; out vec4 v_d;
void main(){
  vec4 mv = u_view * vec4(i_a.xyz, 1.0);
  vec3 dv = mat3(u_view) * i_b.xyz;
  float wid = max(i_b.w, 1e-4);
  vec2 axis = dv.xy; float al = length(axis);
  axis = al > 1e-5 ? axis / al : vec2(1.0, 0.0);
  float hl = 0.5 * i_a.w * al;
  if (i_d.x > 3.5 && i_d.x < 4.5) { axis = vec2(1.0, 0.0); hl = 0.5 * i_a.w; }
  if (i_d.x > 2.5 && i_d.x < 3.5) { float a = i_d.w; axis = vec2(cos(a), sin(a)); }
  vec2 perp = vec2(-axis.y, axis.x);
  vec2 c = a_pos.xy;
  mv.xy += axis * c.x * (hl + wid) + perp * c.y * wid;
  gl_Position = u_proj * mv;
  v_q = vec2(c.x * (hl + wid) / wid, c.y);
  v_half = hl / wid;
  v_col = i_c; v_d = i_d;
}`;
SH.fxFS = `
in vec2 v_q; in float v_half; in vec4 v_col; in vec4 v_d; out vec4 o;
void main(){
  float shape = v_d.x;
  float da = max(abs(v_q.x) - v_half, 0.0);
  float r = length(vec2(da, v_q.y));
  vec3 col = v_col.rgb; float a = v_col.a; vec3 c;
  if (shape < 0.5) {            // bolt: white-hot core + coloured glow
    float core = smoothstep(0.42, 0.05, r);
    float glow = max(exp(-r * r * 3.5) - 0.03, 0.0);
    c = col * glow + vec3(1.0) * core * (0.6 + 0.4 * max(col.r, max(col.g, col.b)));
  } else if (shape < 1.5) {     // soft glow
    float g = max(1.0 - r, 0.0); c = col * g * g;
  } else if (shape < 2.5) {     // ring
    float th = max(v_d.y, 0.02);
    float rr = smoothstep(th, 0.0, abs(r - (1.0 - th)));
    c = col * rr * step(r, 1.0);
  } else if (shape < 3.5) {     // flare / sparkle (rotated by v_d.w)
    float g = max(1.0 - r, 0.0);
    float st = max(1.0 - abs(v_q.y) * 12.0, 0.0) * max(1.0 - abs(v_q.x) / (v_half + 1.0), 0.0);
    float st2 = max(1.0 - abs(v_q.x) * 12.0, 0.0) * max(1.0 - abs(v_q.y), 0.0) * v_d.y;
    c = col * (g * g * g * 1.6 + st * 1.2 + st2);
  } else if (shape < 4.5) {     // bar (fill in v_d.y)
    float x01 = (v_q.x / (v_half + 1.0)) * 0.5 + 0.5;
    float inside = step(abs(v_q.y), 0.75);
    float fill = step(x01, v_d.y);
    c = mix(vec3(0.05, 0.06, 0.09), col, fill) * inside;
    float frame = (1.0 - step(abs(v_q.y), 0.55)) * inside;
    c += col * 0.25 * frame;
  } else if (shape < 5.5) {     // hard spark
    float core = smoothstep(1.0, 0.0, r);
    c = col * core * core;
  } else {                      // smoke-ish soft puff (dim)
    float g = max(1.0 - r, 0.0); c = col * g * g * g;
  }
  o = vec4(c * a, 1.0);
}`;

// ─── post processing ───
SH.bloomPreFS = `
uniform sampler2D u_src; uniform vec2 u_texel; uniform float u_thresh; uniform float u_knee;
in vec2 v_uv; out vec4 o;
vec3 pre(vec3 c){ float br = max(c.r, max(c.g, c.b)); float rq = clamp(br - u_thresh + u_knee, 0.0, 2.0 * u_knee); rq = rq * rq / (4.0 * u_knee + 1e-4); float w = max(rq, br - u_thresh) / max(br, 1e-4); return c * w; }
void main(){
  vec2 h = u_texel;
  vec3 s = texture(u_src, v_uv + vec2(-h.x, -h.y)).rgb + texture(u_src, v_uv + vec2(h.x, -h.y)).rgb
         + texture(u_src, v_uv + vec2(-h.x, h.y)).rgb + texture(u_src, v_uv + vec2(h.x, h.y)).rgb;
  o = vec4(pre(min(s * 0.25, vec3(48.0))), 1.0);
}`;
SH.bloomDownFS = `
uniform sampler2D u_src; uniform vec2 u_texel;
in vec2 v_uv; out vec4 o;
void main(){
  vec2 h = u_texel * 0.5;
  vec3 s = texture(u_src, v_uv).rgb * 4.0;
  s += texture(u_src, v_uv - h).rgb; s += texture(u_src, v_uv + h).rgb;
  s += texture(u_src, v_uv + vec2(h.x, -h.y)).rgb; s += texture(u_src, v_uv - vec2(h.x, -h.y)).rgb;
  o = vec4(s / 8.0, 1.0);
}`;
SH.bloomUpFS = `
uniform sampler2D u_src; uniform vec2 u_texel; uniform float u_str;
in vec2 v_uv; out vec4 o;
void main(){
  vec2 h = u_texel * 0.5;
  vec3 s = texture(u_src, v_uv + vec2(-h.x * 2.0, 0.0)).rgb;
  s += texture(u_src, v_uv + vec2(-h.x, h.y)).rgb * 2.0;
  s += texture(u_src, v_uv + vec2(0.0, h.y * 2.0)).rgb;
  s += texture(u_src, v_uv + vec2(h.x, h.y)).rgb * 2.0;
  s += texture(u_src, v_uv + vec2(h.x * 2.0, 0.0)).rgb;
  s += texture(u_src, v_uv + vec2(h.x, -h.y)).rgb * 2.0;
  s += texture(u_src, v_uv + vec2(0.0, -h.y * 2.0)).rgb;
  s += texture(u_src, v_uv + vec2(-h.x, -h.y)).rgb * 2.0;
  o = vec4(s / 12.0 * u_str, 1.0);
}`;
SH.compositeFS = `
uniform sampler2D u_scene; uniform sampler2D u_bloom; uniform float u_bloomStr; uniform float u_exposure;
uniform vec4 u_hit; uniform float u_flash; uniform float u_ab; uniform float u_time; uniform float u_vig; uniform float u_useBloom;
in vec2 v_uv; out vec4 o;
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main(){
  vec2 uv = v_uv;
  vec2 dc = uv - 0.5;
  vec3 col;
  if (u_ab > 0.0005) {
    vec2 off = dc * u_ab;
    col = vec3(texture(u_scene, uv - off).r, texture(u_scene, uv).g, texture(u_scene, uv + off).b);
  } else col = texture(u_scene, uv).rgb;
  if (u_useBloom > 0.5) col += texture(u_bloom, uv).rgb * u_bloomStr;
  col *= u_exposure;
  col = aces(col);
  float vig = smoothstep(0.95, 0.25, length(dc * vec2(1.15, 1.0)));
  col *= mix(1.0, vig, u_vig);
  float edge = smoothstep(0.2, 0.75, length(dc) * 1.35);
  col = mix(col, u_hit.rgb, clamp(u_hit.a * edge, 0.0, 1.0));
  col += u_flash;
  col = pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2));
  col += (hash12(gl_FragCoord.xy + fract(u_time * 7.0) * 113.0) - 0.5) / 200.0;
  o = vec4(col, 1.0);
}`;


// ─── per-type planet bake programs ───
// One small program per planet type instead of a single program containing all 17 types:
// Android GPU drivers (Adreno, Mali) can fail or stall compiling the combined version.
function glslExtract(src, sig) {
  const i = src.indexOf(sig);
  if (i < 0) throw new Error('GLSL function not found: ' + sig);
  let j = src.indexOf('{', i), depth = 0;
  for (; j < src.length; j++) { if (src[j] === '{') depth++; else if (src[j] === '}' && --depth === 0) break; }
  return src.slice(i, j + 1);
}
SH.bakeTypeFn = ['tTerran', 'tDesert', 'tIce', 'tLava', 'tGas', 'tToxic', 'tCrystal', 'tTerran', 'tTerran', 'tBarren', 'tIron', 'tBio', 'tMachine', 'tStorm', 'tIceGiant', 'tSulfur', 'tShattered', 'tTerran', 'tRogue'];
SH.bakeFallbackFn = `vec4 tFallback(vec3 d, vec3 p){
  float h = fbm(p * 1.3, 4); float b = fbm(p * 3.0 + 7.0, 3);
  vec3 col = mix(u_c[0], u_c[1], smoothstep(-0.4, 0.4, h));
  col = mix(col, u_c[2], smoothstep(0.1, 0.6, b) * 0.5);
  return vec4(col, 0.35);
}`;
SH.bakeSource = (fn) => {
  const src = SH.planetBakeFS;
  const head = src.slice(0, src.indexOf('float craters('));
  const dir = 'void main(){\n  float phi = v_uv.x * 6.28318530718;\n  float th = (1.0 - v_uv.y) * 3.14159265359;\n  vec3 d = vec3(-cos(phi) * sin(th), cos(th), sin(phi) * sin(th));\n';
  if (fn === 'clouds') return head + glslExtract(src, 'float cloudsF(') + '\n' + dir + '  float c = cloudsF(d); o = vec4(c, c, c, 1.0);\n}';
  const body = fn === 'tFallback' ? SH.bakeFallbackFn
    : (['tBarren', 'tIron', 'tShattered'].includes(fn) ? glslExtract(src, 'float craters(') + '\n' : '') + glslExtract(src, 'vec4 ' + fn + '(');
  return head + body + '\n' + dir + '  vec3 p = d * u_p2.z + u_seed;\n  vec4 r = ' + fn + '(d, p);\n  o = vec4(pow(clamp(r.rgb, 0.0, 1.0), vec3(1.0 / 2.2)), clamp(r.a, 0.0, 1.0));\n}';
};
// simpler sky used only if the full nebula shader cannot compile on a device
SH.skyBakeFallbackFS = SH.noise + `
uniform int u_face; uniform vec3 u_core; uniform vec3 u_seed;
in vec2 v_uv; out vec4 o;
` + glslExtract(SH.skyBakeFS, 'vec3 faceDir(') + '\n' + glslExtract(SH.skyBakeFS, 'float starLayer(') + `
void main(){
  vec3 d = normalize(faceDir(u_face, v_uv));
  float band = exp(-d.y * d.y * 9.0);
  float core = pow(max(dot(d, u_core), 0.0), 3.0);
  float n = fbm(d * 2.0 + u_seed, 4) * 0.5 + 0.5;
  vec3 col = mix(vec3(0.40, 0.46, 0.78), vec3(1.0, 0.76, 0.48), core) * band * (0.03 + 0.18 * core) * n;
  col += mix(vec3(0.6, 0.08, 0.42), vec3(0.06, 0.26, 0.74), n) * smoothstep(0.55, 0.85, n) * 0.08;
  col += vec3(0.85, 0.9, 1.0) * (starLayer(d, 190.0, 0.2 + band * 0.45) * 0.45 + starLayer(d, 420.0, 0.12 + band * 0.55) * 0.3) * (0.45 + band);
  col += vec3(0.003, 0.0035, 0.008);
  o = vec4(pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2)), 1.0);
}`;
