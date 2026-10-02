// ───────────────────────────── galaxy & world ─────────────────────────────
const PT = {
  terran: { name: 'Terran', cls: 'Terrestrial · temperate', sh: 0, amode: 0, clouds: [0.02, 0.9], atmo: [0.3, 0.55, 1.0], aStr: 1.0, p: [0.0, 0.0, 0.9, 0], scale: 1.0,
    pal: [[0x0a2350, 0x1d6fa5, 0x3c7a32, 0xa08a52, 0x6e5d4b, 0xcdbb84]], desc: 'Temperate world with liquid oceans and a breathable nitrogen-oxygen atmosphere.', g: 1.0, heat: 15 },
  ocean: { name: 'Ocean', cls: 'Terrestrial · oceanic', sh: 7, amode: 0, clouds: [-0.05, 0.95], atmo: [0.25, 0.6, 1.0], aStr: 1.1, p: [0.24, 0.0, 0.92, 0], scale: 1.0,
    pal: [[0x061a40, 0x1a7fb5, 0x4a8a3e, 0x9c8c5a, 0x6d6255, 0xe0d0a0], [0x041c34, 0x168a9c, 0x3f8040, 0xa59a68, 0x6a6058, 0xe8dcb0]], desc: 'A global ocean broken only by scattered island chains. Storm systems span continents.', g: 1.05, heat: 10 },
  jungle: { name: 'Jungle', cls: 'Terrestrial · humid', sh: 8, amode: 0, clouds: [0.08, 0.8], atmo: [0.4, 0.85, 0.6], aStr: 1.0, p: [-0.12, 0.05, 0.96, 0], scale: 1.1,
    pal: [[0x0b2a45, 0x1e6f7a, 0x1f5e22, 0x4f7a2a, 0x4b4a3a, 0xa89b6a]], desc: 'Dense canopy covers most of the land. The air is thick, warm and humid.', g: 1.1, heat: 30 },
  tundra: { name: 'Tundra', cls: 'Terrestrial · cold', sh: 17, amode: 0, clouds: [0.12, 0.7], atmo: [0.6, 0.75, 1.0], aStr: 0.8, p: [-0.06, 0.02, 0.62, 0], scale: 1.0,
    pal: [[0x13304a, 0x3d7392, 0x6b7a5a, 0x8f8a7a, 0x6a645e, 0xb0a890]], desc: 'Cold steppe and permafrost under a thin, clear sky.', g: 0.9, heat: 0 },
  desert: { name: 'Desert', cls: 'Terrestrial · arid', sh: 1, amode: 2, clouds: null, atmo: [0.95, 0.62, 0.35], aStr: 0.7, p: [0, 0, 0, 0], scale: 1.0,
    pal: [[0xa86b3c, 0xdba66a, 0xf0c88a, 0x6e3f22, 0xc0784a], [0xb88a5a, 0xe8c898, 0xfff0d0, 0x7a5a3a, 0xd09a6a]], desc: 'Dune seas and wind-cut canyons. Water survives only as buried ice.', g: 0.8, heat: 20 },
  ice: { name: 'Ice', cls: 'Terrestrial · frozen', sh: 2, amode: 0, clouds: null, atmo: [0.6, 0.8, 1.0], aStr: 0.6, p: [0, 0, 0, 0], scale: 1.0,
    pal: [[0xf2f6fa, 0xb8d4ea, 0x5f8fb8, 0x8fb6d8]], desc: 'A frozen crust kilometres thick, cracked by tidal stress.', g: 0.7, heat: -10 },
  lava: { name: 'Lava', cls: 'Terrestrial · volcanic', sh: 3, amode: 1, clouds: null, atmo: [1.0, 0.35, 0.1], aStr: 0.8, emis: [3.0, 1.1, 0.25], p: [0, 0, 0, 0], scale: 1.0,
    pal: [[0x1a1210, 0x3a2e2a, 0xff5a10, 0xffd040]], desc: 'Rivers of magma cross a basalt crust. Surface temperatures pass 1,200 K.', g: 1.2, heat: 900 },
  gas: { name: 'Gas giant', cls: 'Jovian · gas giant', sh: 4, amode: 0, clouds: null, atmo: [0.9, 0.75, 0.55], aStr: 0.7, p: [7, 1.0, 0.16, 0], scale: 1.0,
    pal: [[0xd9b48a, 0xa8703f, 0xf0dcc0, 0x7a4a2a, 0xc0502a, 0xf0a070]], desc: 'A hydrogen-helium giant with banded cloud decks and centuries-old storms.', g: 2.4, heat: 40 },
  toxic: { name: 'Toxic', cls: 'Terrestrial · greenhouse', sh: 5, amode: 1, clouds: null, atmo: [0.6, 0.95, 0.2], aStr: 1.1, emis: [0.7, 1.8, 0.3], p: [0, 0, 0, 0], scale: 1.1,
    pal: [[0x8a9a2a, 0x4a6a1a, 0xd0d860, 0x2a4a3a]], desc: 'Clouds of sulfuric acid shroud a runaway greenhouse.', g: 0.95, heat: 420 },
  crystal: { name: 'Crystal', cls: 'Exotic · crystalline', sh: 6, amode: 1, clouds: null, atmo: [0.7, 0.4, 1.0], aStr: 0.9, emis: [1.4, 0.8, 2.6], p: [7, 0, 0, 0], scale: 1.0,
    pal: [[0x3a1a6a, 0x6a3ab8, 0xc080ff, 0x80ffff]], desc: 'Silicate lattices have grown across the entire surface. They glow after dark.', g: 0.85, heat: 0 },
  barren: { name: 'Barren', cls: 'Terrestrial · airless', sh: 9, amode: 2, clouds: null, atmo: [0, 0, 0], aStr: 0, p: [0, 0, 0, 0], scale: 1.0,
    pal: [[0x4a4a4e, 0x8a8a8e, 0x2e2e34], [0x5a5048, 0x9a9288, 0x3a332e]], desc: 'Airless, cratered rock that records four billion years of impacts.', g: 0.4, heat: 0 },
  iron: { name: 'Iron', cls: 'Terrestrial · oxidised', sh: 10, amode: 2, clouds: null, atmo: [0.9, 0.45, 0.25], aStr: 0.45, p: [0, 0, 0, 0], scale: 1.0,
    pal: [[0x7a2e1a, 0xc06a3a, 0x3a1a12, 0x2a120c]], desc: 'Oxidised iron dust gives this world its rust-red colour.', g: 0.6, heat: 5 },
  bio: { name: 'Bioluminescent', cls: 'Exotic · living', sh: 11, amode: 1, clouds: null, atmo: [0.2, 1.0, 0.8], aStr: 0.9, emis: [0.4, 2.4, 2.0], p: [0, 0, 0, 0], scale: 1.0,
    pal: [[0x0a0e1a, 0x1a2a2a, 0x20e0d0, 0xc040ff, 0x40ffa0]], desc: 'Glowing organisms form planet-wide networks that pulse in the dark.', g: 1.0, heat: 25 },
  machine: { name: 'Machine', cls: 'Artificial · ecumenopolis', sh: 12, amode: 1, clouds: null, atmo: [0.5, 0.6, 0.8], aStr: 0.45, emis: [2.6, 1.7, 0.9], p: [10, 0, 0, 0], scale: 1.0,
    pal: [[0x2a2e36, 0x5a606a, 0x8a6a3a]], desc: 'A world rebuilt as one continuous structure. Its builders are long gone.', g: 1.3, heat: 30 },
  storm: { name: 'Storm', cls: 'Jovian · storm giant', sh: 13, amode: 1, clouds: null, atmo: [0.6, 0.4, 1.0], aStr: 0.9, emis: [1.4, 1.4, 2.6], p: [5, 0, 0, 0], scale: 1.0,
    pal: [[0x3a2a6a, 0x7a4ab0, 0xc8a0f0, 0x2a1a40]], desc: 'Lightning storms churn without pause through violet ammonia clouds.', g: 1.9, heat: 30 },
  icegiant: { name: 'Ice giant', cls: 'Neptunian · ice giant', sh: 14, amode: 0, clouds: null, atmo: [0.4, 0.8, 1.0], aStr: 0.9, p: [6, 0.6, 0, 0], scale: 1.0,
    pal: [[0x6ac8e0, 0x3a8ab8, 0xb0f0ff], [0x5ad8c0, 0x2a9a90, 0xc0fff0]], desc: 'Water, ammonia and methane ices beneath a calm blue atmosphere.', g: 1.4, heat: 0 },
  sulfur: { name: 'Sulfur', cls: 'Moon · volcanic', sh: 15, amode: 1, clouds: null, atmo: [1.0, 0.8, 0.3], aStr: 0.4, emis: [2.6, 0.9, 0.2], p: [0, 0, 0, 0], scale: 1.0,
    pal: [[0xe8d040, 0xd08a20, 0xf8f0c0, 0x7a2a10, 0x140804]], desc: 'Tidal heating drives hundreds of active sulfur volcanoes.', g: 0.5, heat: 60 },
  shattered: { name: 'Shattered', cls: 'Terrestrial · fractured', sh: 16, amode: 1, clouds: null, atmo: [1.0, 0.4, 0.1], aStr: 0.4, emis: [3.0, 0.8, 0.2], p: [0, 0, 0, 0], scale: 1.0,
    pal: [[0x2a2624, 0x4a4440, 0xff6a20]], desc: 'Split by an ancient impact. Magma still glows along the fault lines.', g: 0.7, heat: 120 },
  rogue: { name: 'Rogue', cls: 'Exotic · dark ice', sh: 18, amode: 1, clouds: null, atmo: [0.3, 0.5, 1.0], aStr: 0.45, emis: [0.4, 1.8, 1.4], p: [0, 0, 0, 0], scale: 1.0,
    pal: [[0x0e0e16, 0x23222e, 0x5a6a8a, 0x60c0ff]], desc: 'A world of black ice. Aurorae ring both of its poles.', g: 0.8, heat: -20 },
};
const PAL_ALT = { // named palette overrides
  gasGreen: [0x9fbf7a, 0x5f8a4a, 0xd8e8b0, 0x3d5a32, 0x2a6a5a, 0x8ad0b0],
  gasGold: [0xf0c860, 0xb8862a, 0xfff0c0, 0x8a5a1a, 0xe07a2a, 0xffd090],
  gasRed: [0xc05a3a, 0x7a2a1a, 0xe8a070, 0x4a1a12, 0xffb060, 0xffe0a0],
  crystalBlue: [0x103a4a, 0x2a8aa8, 0x9fe8ff, 0xffffff],
  crystalCyan: [0x0a3a3a, 0x1a9a8a, 0x8fffe0, 0xd0fff0],
  storm2: [0x4a1a2a, 0x9a3a4a, 0xf0a090, 0x2a0a14],
};

const GALAXY = [
  { name: 'Solace', pos: [52000, 0, 96000], danger: 1, star: { cls: 'G2 V', temp: 5800, solR: 1.0, hex: 0xffe4b0, r: 700 },
    blurb: 'A calm yellow sun and your home port. Raiders are few here.',
    belt: { r: 6300, w: 700, n: 1500 },
    boss: { key: 'warden', name: 'Warden Prime', planet: 'Thalos' },
    planets: [
      { name: 'Osk', type: 'barren', r: 140, orbit: 1900, ang: 2.3 },
      { name: 'Cindra', type: 'desert', r: 220, orbit: 3000, ang: 4.1, weapon: 'scatter' },
      { name: 'Verdigris', type: 'terran', r: 320, orbit: 4400, ang: 0.6, station: 'Haven Station', home: true, moons: [{ name: 'Pell', type: 'barren', r: 70, dist: 950, pal: 1 }] },
      { name: 'Thalos', type: 'gas', r: 900, orbit: 8600, ang: 1.75, rings: [1.35, 2.3, 0xd8c8a8, 0x8a7a68, 0xf0e0c0], moons: [{ name: 'Ixo', type: 'ice', r: 110, dist: 2100 }, { name: 'Brin', type: 'sulfur', r: 95, dist: 2800 }] },
      { name: 'Mirelle', type: 'ocean', r: 300, orbit: 11400, ang: 3.4, module: true },
    ] },
  { name: 'Cinder Reach', pos: [8000, 1500, 124000], danger: 2, star: { cls: 'M1 III', temp: 3600, solR: 40, hex: 0xff7040, r: 1400 },
    blurb: 'A swollen red giant. Its inner worlds have melted.',
    belt: { r: 12700, w: 900, n: 1400 },
    boss: { key: 'colossus', name: 'Magma Colossus', planet: 'Emberjaw' },
    planets: [
      { name: 'Pyre', type: 'lava', r: 260, orbit: 4300, ang: 0.3, weapon: 'plasma' },
      { name: 'Ashfall', type: 'sulfur', r: 200, orbit: 6300, ang: 2.5 },
      { name: 'Rustvale', type: 'iron', r: 300, orbit: 8700, ang: 4.4, station: 'Rustvale Depot' },
      { name: 'Emberjaw', type: 'shattered', r: 240, orbit: 11000, ang: 1.4 },
      { name: 'Kiln', type: 'gas', r: 780, orbit: 15000, ang: 5.6, palAlt: 'gasRed', rings: [1.3, 2.0, 0xc89070, 0x6a3a2a, 0xe8b090], moons: [{ name: 'Smolder', type: 'lava', r: 90, dist: 1900 }] },
    ] },
  { name: 'Glacia', pos: [98000, -1200, 62000], danger: 3, star: { cls: 'B5 V', temp: 15000, solR: 3.6, hex: 0xb0ccff, r: 600 },
    blurb: 'A hot blue star lighting a family of frozen worlds.',
    belt: { r: 7800, w: 800, n: 1400 },
    boss: { key: 'leviathan', name: 'Crystal Leviathan', planet: 'Halcyon' },
    planets: [
      { name: 'Rime', type: 'ice', r: 260, orbit: 3700, ang: 1.0 },
      { name: 'Frostmere', type: 'tundra', r: 330, orbit: 6000, ang: 3.2, station: 'Frostmere Spire' },
      { name: 'Halcyon', type: 'icegiant', r: 820, orbit: 9600, ang: 5.0, rings: [1.4, 2.4, 0xd0e8ff, 0x7898c0, 0xffffff], moons: [{ name: 'Sliver', type: 'crystal', r: 100, dist: 2200, palAlt: 'crystalBlue', weapon: 'rail' }] },
      { name: 'Shard', type: 'crystal', r: 230, orbit: 12800, ang: 2.2, palAlt: 'crystalBlue', module: true },
    ] },
  { name: 'Verdance', pos: [-38000, 1000, 96000], danger: 4, star: { cls: 'F6 V', temp: 6400, solR: 1.3, hex: 0xfff2d8, r: 680 },
    blurb: 'Life everywhere: jungles, seas and a hive that guards them.',
    boss: { key: 'hive', name: 'Hive Queen', planet: 'Miasma' },
    planets: [
      { name: 'Canopy', type: 'jungle', r: 340, orbit: 4200, ang: 4.0, station: 'Canopy Ring' },
      { name: 'Brine', type: 'ocean', r: 300, orbit: 6400, ang: 0.9, pal: 1 },
      { name: 'Miasma', type: 'toxic', r: 290, orbit: 8800, ang: 2.6, weapon: 'arc' },
      { name: 'Spora', type: 'bio', r: 230, orbit: 11200, ang: 5.4 },
      { name: 'Leviath', type: 'gas', r: 860, orbit: 14400, ang: 1.9, palAlt: 'gasGreen', moons: [{ name: 'Moss', type: 'tundra', r: 110, dist: 2200 }] },
    ] },
  { name: 'Nyx Expanse', pos: [62000, 2200, 14000], danger: 5, star: { cls: 'M8 V', temp: 2600, solR: 0.15, hex: 0xff66c4, r: 450 },
    blurb: 'A violet dwarf buried in nebula gas. Strange lights move here.',
    nebula: [0.55, 0.18, 0.75],
    boss: { key: 'eye', name: 'The Void Eye', planet: 'Prism' },
    planets: [
      { name: 'Umbra', type: 'rogue', r: 260, orbit: 2700, ang: 3.0 },
      { name: 'Lumen', type: 'bio', r: 300, orbit: 5100, ang: 0.4, weapon: 'beam' },
      { name: 'Tempest', type: 'storm', r: 700, orbit: 8200, ang: 2.0, station: 'Tempest Watch' },
      { name: 'Prism', type: 'crystal', r: 250, orbit: 11200, ang: 4.8 },
    ] },
  { name: 'Helios Twins', pos: [-82000, -1800, 42000], danger: 6, binary: true,
    star: { cls: 'K0 V + A0 V', temp: 5200, solR: 0.9, hex: 0xffc070, r: 620 }, star2: { hex: 0xe8f0ff, r: 420, temp: 9800 },
    blurb: 'Two suns circling each other. Old machine worlds orbit both.',
    belt: { r: 10600, w: 900, n: 1500 },
    boss: { key: 'dreadnought', name: 'Sun Dreadnought', planet: 'Aurum' },
    planets: [
      { name: 'Scorch', type: 'lava', r: 200, orbit: 4300, ang: 5.5 },
      { name: 'Dune Sea', type: 'desert', r: 340, orbit: 6300, ang: 1.2, pal: 1 },
      { name: 'Gearhold', type: 'machine', r: 300, orbit: 8700, ang: 3.0, station: 'Gearhold Yard' },
      { name: 'Aurum', type: 'gas', r: 950, orbit: 12800, ang: 4.6, palAlt: 'gasGold', rings: [1.35, 2.2, 0xf0d8a0, 0x9a7a40, 0xfff0d0], moons: [{ name: 'Gild', type: 'sulfur', r: 110, dist: 2400 }] },
    ] },
  { name: 'Aurora Drift', pos: [102000, 900, -30000], danger: 7, star: { cls: 'A5 V', temp: 8200, solR: 1.7, hex: 0xc8fff0, r: 620 },
    blurb: 'Teal light and ocean worlds. Something vast swims between them.',
    nebula: [0.1, 0.55, 0.5],
    boss: { key: 'wyrm', name: 'Storm Wyrm', planet: 'Zephyr' },
    planets: [
      { name: 'Tidewell', type: 'ocean', r: 360, orbit: 4500, ang: 2.0, station: 'Tidewell Anchorage' },
      { name: 'Glimmer', type: 'crystal', r: 260, orbit: 6900, ang: 4.2, palAlt: 'crystalCyan' },
      { name: 'Borealis', type: 'tundra', r: 300, orbit: 9100, ang: 0.2 },
      { name: 'Zephyr', type: 'icegiant', r: 780, orbit: 12800, ang: 3.4, pal: 1, rings: [1.3, 2.1, 0xb0fff0, 0x5a9a90, 0xe0fff8] },
    ] },
  { name: 'Ironforge', pos: [-64000, -1400, -42000], danger: 8, star: { cls: 'DA white dwarf', temp: 25000, solR: 0.012, hex: 0xe8f0ff, r: 260 },
    blurb: 'A dead star’s white ember. The machine fleets build here.',
    belt: { r: 6800, w: 1000, n: 1700 },
    boss: { key: 'mothership', name: 'Iron Mothership', planet: 'Anvil' },
    planets: [
      { name: 'Foundry', type: 'machine', r: 340, orbit: 3500, ang: 0.8, station: 'Foundry Gate' },
      { name: 'Slag', type: 'shattered', r: 280, orbit: 5600, ang: 2.9 },
      { name: 'Anvil', type: 'iron', r: 310, orbit: 8000, ang: 4.9 },
      { name: 'Cinderhulk', type: 'lava', r: 220, orbit: 10400, ang: 1.6 },
    ] },
  { name: 'The Maw', pos: [0, 0, 0], danger: 9, bh: true, star: { cls: 'Supermassive black hole', temp: 0, solR: 0, hex: 0xffa050, r: 520 },
    blurb: 'The galactic core. Every path in the galaxy bends toward it.',
    nebula: [0.7, 0.3, 0.12],
    boss: { key: 'sovereign', name: 'The Void Sovereign', planet: null },
    planets: [
      { name: 'Event', type: 'shattered', r: 300, orbit: 6000, ang: 1.0 },
      { name: 'Requiem', type: 'bio', r: 280, orbit: 8900, ang: 3.3, station: 'Last Light' },
      { name: 'Oblivion', type: 'storm', r: 650, orbit: 12000, ang: 5.2, palAlt: 'storm2' },
      { name: 'Ember Halo', type: 'sulfur', r: 240, orbit: 15000, ang: 2.4 },
    ] },
];

class StationRT {
  constructor(sys, planet, name, i) {
    this.sys = sys; this.planet = planet; this.name = name; this.id = 'st' + i;
    const r = new RNG(hashStr(name));
    const out = new V3().subVectors(planet.pos, sys.pos).normalize();
    const side = new V3().crossVectors(out, AXIS_Y).normalize();
    const dir = new V3().copy(out).scale(-0.35).addScaled(side, 0.94).normalize();
    this.pos = planet.pos.clone().addScaled(dir, planet.r + 1000).add(new V3(0, r.range(-120, 120), 0));
    this.q = new Quat().lookRotation(dir, AXIS_Y);
    this.ringRot = r.range(0, TAU);
    this.gate = this.pos.clone().add(new V3(0, 0, -68).applyQuat(this.q));
    this.gateDir = new V3(0, 0, -1).applyQuat(this.q);
    this.radius = 150;
  }
}

class PlanetRT {
  constructor(sys, d, parent, idx) {
    this.sys = sys; this.def = d; this.parent = parent; this.name = d.name;
    this.id = sys.def.name + '/' + d.name;
    const T = PT[d.type];
    this.T = T; this.typeKey = d.type; this.r = d.r;
    const rng = new RNG(hashStr(this.id));
    this.rng = rng;
    this.seed = [rng.range(-50, 50), rng.range(-50, 50), rng.range(-50, 50)];
    const palHex = d.palAlt ? PAL_ALT[d.palAlt] : T.pal[d.pal || 0] || T.pal[0];
    this.pal = palHex.map((h) => L(h));
    this.palHex = palHex;
    this.p = T.p.slice();
    if (d.type === 'gas') { this.p[0] = rng.range(6, 10); this.p[1] = rng.range(0.7, 1.3); this.p[2] = rng.range(0.12, 0.2); }
    if (d.type === 'icegiant') { this.p[0] = rng.range(4, 7); }
    this.p2 = [T.clouds ? T.clouds[0] + rng.range(-0.06, 0.06) : 0, T.clouds ? T.clouds[1] : 0, T.scale * rng.range(0.85, 1.2), 0];
    this.spot = [rng.range(-1, 1), rng.range(-0.35, 0.35), rng.range(-1, 1)];
    this.clouds = !!T.clouds;
    this.atmo = T.atmo; this.aStr = T.aStr; this.amode = T.amode; this.emis = T.emis || [0, 0, 0];
    this.typeId = T.sh;
    this.tiltQ = new Quat().setEuler(rng.range(-0.45, 0.45), 0, rng.range(-0.45, 0.45));
    this.spin = rng.range(0.004, 0.012) * (rng.chance(0.15) ? -1 : 1);
    this.rot = rng.range(0, TAU);
    this.q = new Quat();
    this.cloudSpd = rng.range(0.0015, 0.004);
    this.tex = null; this.cloudTex = null; this.texW = 0; this.texH = 0;
    this.pos = new V3();
    if (parent) {
      this.moon = { dist: d.dist, speed: rng.range(0.006, 0.012) * (1100 / d.dist), phase: rng.range(0, TAU), inc: rng.range(-0.25, 0.25) };
      this.updateMoon(0);
    } else {
      const inc = rng.range(-0.04, 0.04);
      this.pos.set(sys.pos.x + Math.cos(d.ang) * d.orbit, sys.pos.y + Math.sin(inc) * d.orbit, sys.pos.z + Math.sin(d.ang) * d.orbit);
    }
    this.rings = null;
    if (d.rings) this.rings = { inner: d.rings[0] * d.r, outer: d.rings[1] * d.r, c1: L(d.rings[2]), c2: L(d.rings[3]), c3: L(d.rings[4]), seed: rng.range(0, 100), mesh: null };
    this.moons = [];
    this.station = null;
    this.discovered = false;
    this.zoneR = d.r + (d.type === 'gas' || d.type === 'icegiant' || d.type === 'storm' ? 2000 : 1500);
    // flavour data
    const orbitAU = (parent ? parent.def.orbit : d.orbit) / 4300;
    const s = sys.def.star;
    let temp = s.temp ? s.temp * Math.sqrt(Math.max(s.solR, 0.02) / (2 * orbitAU * 215)) * 0.92 : 60 + rng.range(0, 40);
    if (sys.def.binary) temp *= 1.25;
    temp += T.heat;
    this.info = {
      cls: T.cls, au: orbitAU, temp: Math.round(temp), radiusKm: Math.round(d.r * 20 / 10) * 10,
      grav: +(T.g * Math.pow(d.r / 320, 0.35) * (parent ? 0.6 : 1)).toFixed(2), day: +(TAU / Math.abs(this.spin) / 60).toFixed(1),
    };
  }
  updateMoon(t) {
    const p = this.parent, m = this.moon, a = m.phase + t * m.speed;
    this.pos.set(p.pos.x + Math.cos(a) * m.dist, p.pos.y + Math.sin(a) * Math.sin(m.inc) * m.dist, p.pos.z + Math.sin(a) * m.dist);
  }
}

class SystemRT {
  constructor(def, i) {
    this.def = def; this.id = i; this.name = def.name;
    this.pos = new V3(...def.pos);
    this.loaded = false;
    this.stars = [];
    const s = def.star;
    if (def.binary) {
      this.stars.push({ pos: this.pos.clone().add(new V3(-1300, 0, 300)), r: s.r, col: L(s.hex), hex: s.hex, orbitR: 1340, phase: 0 });
      this.stars.push({ pos: this.pos.clone().add(new V3(1300, 0, -300)), r: def.star2.r, col: L(def.star2.hex), hex: def.star2.hex, orbitR: 1340, phase: PI });
    } else this.stars.push({ pos: this.pos.clone(), r: s.r, col: L(s.hex), hex: s.hex });
    this.bh = !!def.bh;
    this.lightCol = this.bh ? [1.25, 0.82, 0.55] : normLight(L(s.hex));
    this.planets = []; this.bodies = []; this.stations = [];
    let si = 0;
    for (const pd of def.planets) {
      const p = new PlanetRT(this, pd, null);
      this.planets.push(p); this.bodies.push(p);
      if (pd.moons) for (const md of pd.moons) { const m = new PlanetRT(this, md, p); p.moons.push(m); this.bodies.push(m); }
      if (pd.station) { p.station = new StationRT(this, p, pd.station, i * 10 + si++); this.stations.push(p.station); }
    }
    this.belt = null;
    this.nebula = [];
    if (def.nebula) {
      const r = new RNG(hashStr(def.name + 'neb'));
      for (let k = 0; k < 14; k++) {
        const v = new V3().randomUnit(() => r.next()); v.y *= 0.35;
        this.nebula.push({ pos: this.pos.clone().addScaled(v, r.range(3000, 15000)), size: r.range(4000, 9000), a: r.range(0.035, 0.08), col: mixArr(def.nebula, [r.next(), r.next() * 0.6, r.next()], 0.25) });
      }
    }
    this.discovered = false;
  }
  get starPos() { return this.stars[0].pos; }
}
function normLight(c) { const m = Math.max(c[0], c[1], c[2]) || 1; return [c[0] / m * 1.25, c[1] / m * 1.25, c[2] / m * 1.25]; }

const World = {
  systems: [], cur: null, time: 0, bakeQueue: [], placeholder: null,

  build() {
    this.systems = GALAXY.map((d, i) => new SystemRT(d, i));
    const ph = new Uint8Array([90, 90, 100, 0, 90, 90, 100, 0, 90, 90, 100, 0, 90, 90, 100, 0]);
    this.placeholder = makeTex(2, 2, { data: ph });
    this.blackCloud = makeTex(1, 1, { data: new Uint8Array([0, 0, 0, 255]) });
  },
  allBodies() { const a = []; for (const s of this.systems) a.push(...s.bodies); return a; },
  findPlanet(id) { for (const s of this.systems) for (const b of s.bodies) if (b.id === id) return b; return null; },

  load(sys, immediate) {
    if (sys.loaded) return;
    sys.loaded = true;
    for (const b of sys.bodies) {
      if (b.rings && !b.rings.mesh) b.rings.mesh = makeMesh(toTyped(gRing(b.rings.inner, b.rings.outer, 160, 3)));
      if (!b.tex) { if (immediate) this.bake(b); else if (!this.bakeQueue.includes(b)) this.bakeQueue.push(b); }
    }
    if (sys.def.belt && !sys.belt) sys.belt = makeBelt(sys);
    if (this.onLoad) this.onLoad(sys);
  },
  unload(sys) {
    if (!sys.loaded) return;
    sys.loaded = false;
    for (const b of sys.bodies) {
      if (b.tex) { gl.deleteTexture(b.tex); b.tex = null; }
      if (b.cloudTex) { gl.deleteTexture(b.cloudTex); b.cloudTex = null; }
      if (b.rings && b.rings.mesh) { freeMesh(b.rings.mesh); b.rings.mesh = null; }
      const qi = this.bakeQueue.indexOf(b); if (qi >= 0) this.bakeQueue.splice(qi, 1);
    }
    sys.belt = null;
    if (typeof Items !== 'undefined') Items.minerals = Items.minerals.filter((m) => m.sys !== sys);
  },
  bake(b) {
    const size = b.parent ? Math.max(256, R.q.planetTex >> 1) : (b.r > 600 ? R.q.planetTex : Math.max(512, R.q.planetTex));
    try {
      const res = R.bakePlanet(b, size);
      b.tex = res.tex; b.cloudTex = res.cloud; b.texW = res.w; b.texH = res.h;
    } catch (e) { console.warn('Could not paint ' + b.name, e); }
  },

  update(dt, focus) {
    this.time += dt;
    let best = null, bd = Infinity;
    for (const s of this.systems) {
      const d = s.pos.dist(focus);
      if (d < bd) { bd = d; best = s; }
      if (!s.loaded && d < 34000) this.load(s, false);
      else if (s.loaded && d > 44000) this.unload(s);
    }
    this.cur = best; this.curDist = bd;
    for (const s of this.systems) {
      if (!s.loaded) continue;
      if (s.def.binary) {
        const a = this.time * 0.02;
        for (const st of s.stars) { const ang = a + st.phase; st.pos.set(s.pos.x + Math.cos(ang) * st.orbitR, s.pos.y, s.pos.z + Math.sin(ang) * st.orbitR * 0.85); }
      }
      for (const b of s.bodies) {
        b.rot += b.spin * dt;
        _q1.setAxisAngle(AXIS_Y, b.rot);
        b.q.multiplyQuats(b.tiltQ, _q1);
        if (b.parent) b.updateMoon(this.time);
      }
      for (const st of s.stations) st.ringRot += dt * 0.05;
    }
    if (this.bakeQueue.length) this.bake(this.bakeQueue.shift());
    const s = this.cur;
    R.light.pos.copy(s.bh ? s.pos : s.starPos);
    R.light.col = s.lightCol;
  },

  // ─── drawing ───
  drawOpaque() {
    for (const s of this.systems) {
      if (!s.loaded) continue;
      this.drawStars(s);
      for (const b of s.bodies) this.drawBody(b, s);
      for (const st of s.stations) this.drawStation(st);
      if (s.belt) drawBelt(s.belt);
    }
  },
  drawStars(s) {
    const P = useProg(R.P.sun);
    U.m4(P, 'u_vp', R.vp); U.f(P, 'u_time', this.time);
    for (const st of s.stars) {
      if (!R.visible(st.pos, st.r)) continue;
      U.f(P, 'u_dark', s.bh ? 1 : 0);
      U.a3(P, 'u_col', st.col);
      U.m4(P, 'u_model', R.model(st.pos, IDQ, st.r));
      drawMesh(R.sphereMid);
    }
  },
  screenR(pos, r) {
    const d = Math.max(pos.dist(R.cam), 1);
    return r / d * (R.cssH / (2 * Math.tan(R.fov / 2)));
  },
  drawBody(b, s) {
    if (!R.visible(b.pos, b.r * 1.15)) return;
    const sr = this.screenR(b.pos, b.r);
    if (sr < 0.4) return;
    const mesh = sr > 220 ? R.sphere : sr > 30 ? R.sphereMid : R.sphereLo;
    const P = useProg(R.P.planet);
    U.m4(P, 'u_vp', R.vp);
    U.m4(P, 'u_model', R.model(b.pos, b.q, b.r));
    U.tex(P, 'u_map', b.tex || this.placeholder, 0);
    U.tex(P, 'u_cloud', b.cloudTex || this.blackCloud, 1);
    U.f(P, 'u_hasCloud', b.cloudTex ? 1 : 0);
    U.f(P, 'u_cloudOff', (this.time * b.cloudSpd) % 1);
    const lp = s.bh ? s.pos : s.starPos;
    U.v3(P, 'u_star', lp.x - R.cam.x, lp.y - R.cam.y, lp.z - R.cam.z);
    U.a3(P, 'u_starCol', s.lightCol);
    U.a3(P, 'u_atmo', b.atmo); U.f(P, 'u_atmoStr', b.aStr * 0.9);
    U.i(P, 'u_amode', b.tex ? b.amode : 0);
    U.a3(P, 'u_emis', b.emis);
    const dist = b.pos.dist(R.cam);
    U.f(P, 'u_detail', smooth(b.r * 4, b.r * 1.3, dist));
    U.v2(P, 'u_texel', b.texW ? 1.5 / b.texW : 0, b.texH ? 1.5 / b.texH : 0);
    U.f(P, 'u_bump', b.amode === 2 ? 2.2 * smooth(b.r * 12, b.r * 2, dist) : 0);
    U.f(P, 'u_ambient', 0.028);
    setCull(1);
    drawMesh(mesh);
  },
  drawStation(st) {
    if (!R.visible(st.pos, 200)) return;
    if (this.screenR(st.pos, 150) < 0.5) return;
    R.drawHull(MODELS.stationCore, st.pos, st.q, 1);
    _q1.setAxisAngle(AXIS_Y, st.ringRot);
    _q2.multiplyQuats(st.q, _q1);
    R.drawHull(MODELS.stationRing, st.pos, _q2, 1);
  },

  drawTransparent() {
    // atmospheres (additive, back faces)
    const P = useProg(R.P.atmo);
    U.m4(P, 'u_vp', R.vp);
    setBlend(1); setDepth(true, false); setCull(2);
    for (const s of this.systems) {
      if (!s.loaded) continue;
      const lp = s.bh ? s.pos : s.starPos;
      U.v3(P, 'u_star', lp.x - R.cam.x, lp.y - R.cam.y, lp.z - R.cam.z);
      for (const b of s.bodies) {
        if (b.aStr <= 0) continue;
        const k = (b.typeKey === 'gas' || b.typeKey === 'icegiant' || b.typeKey === 'storm') ? 1.06 : 1.12;
        const S = b.r * k;
        if (!R.visible(b.pos, S)) continue;
        if (this.screenR(b.pos, b.r) < 2) continue;
        const cd = b.pos.dist(R.cam);
        const fade = smooth(S * 0.98, S * 1.25, cd);
        if (fade <= 0.01) continue;
        U.m4(P, 'u_model', R.model(b.pos, IDQ, S));
        U.a3(P, 'u_atmo', b.atmo); U.f(P, 'u_str', b.aStr * 1.1 * fade);
        U.f(P, 'u_limb', Math.sqrt(1 - Math.pow(b.r / S, 2)));
        drawMesh(R.sphereMid);
      }
    }
    // rings (alpha), far to near
    const rl = [];
    for (const s of this.systems) if (s.loaded) for (const b of s.bodies) if (b.rings && b.rings.mesh && R.visible(b.pos, b.rings.outer)) rl.push(b);
    rl.sort((a, c) => c.pos.distSq(R.cam) - a.pos.distSq(R.cam));
    if (rl.length) {
      const Pr = useProg(R.P.ring);
      U.m4(Pr, 'u_vp', R.vp);
      setBlend(2); setDepth(true, false); setCull(0);
      for (const b of rl) {
        const s = b.sys, lp = s.bh ? s.pos : s.starPos;
        U.m4(Pr, 'u_model', R.model(b.pos, b.tiltQ, 1));
        U.a3(Pr, 'u_c1', b.rings.c1); U.a3(Pr, 'u_c2', b.rings.c2); U.a3(Pr, 'u_c3', b.rings.c3);
        U.f(Pr, 'u_seed', b.rings.seed);
        U.v3(Pr, 'u_star', lp.x - R.cam.x, lp.y - R.cam.y, lp.z - R.cam.z);
        U.a3(Pr, 'u_starCol', s.lightCol);
        U.v3(Pr, 'u_center', b.pos.x - R.cam.x, b.pos.y - R.cam.y, b.pos.z - R.cam.z);
        U.f(Pr, 'u_R', b.r);
        _v1.set(0, 1, 0).applyQuat(b.tiltQ);
        U.v3(Pr, 'u_nrm', _v1.x, _v1.y, _v1.z);
        U.f(Pr, 'u_alpha', 0.85);
        drawMesh(b.rings.mesh);
      }
    }
    // black hole accretion disk
    for (const s of this.systems) {
      if (!s.loaded || !s.bh) continue;
      const Pd = useProg(R.P.disk);
      U.m4(Pd, 'u_vp', R.vp); U.f(Pd, 'u_time', this.time); U.f(Pd, 'u_str', 1);
      setBlend(1); setDepth(true, false); setCull(0);
      const r = s.stars[0].r;
      _q1.setEuler(0.22, 0, 0.12);
      U.m4(Pd, 'u_model', R.model(s.pos, _q1, r * 1.0));
      drawMesh(BH_DISK);
    }
  },

  // glows / sprites added to the FX batch
  addFx() {
    const fx = R.fx;
    for (const s of this.systems) {
      const d = s.pos.dist(R.cam);
      if (s.loaded && d < 40000) {
        for (const st of s.stars) {
          const c = st.col;
          if (s.bh) {
            fx.add(s.pos.x, s.pos.y, s.pos.z, 0, 0, 0, 0, st.r * 1.25, 1.6, 0.9, 0.5, 1, 2, 0.06);
            fx.add(s.pos.x, s.pos.y, s.pos.z, 0, 0, 0, 0, st.r * 2.6, 1.0, 0.45, 0.15, 0.5, 2, 0.22);
            fx.add(s.pos.x, s.pos.y, s.pos.z, 0, 0, 0, 0, st.r * 9, 0.8, 0.35, 0.12, 0.35, 1);
          } else {
            fx.add(st.pos.x, st.pos.y, st.pos.z, 0, 0, 0, 0, st.r * 3.4, c[0] * 1.4, c[1] * 1.4, c[2] * 1.4, 0.5, 1);
            fx.add(st.pos.x, st.pos.y, st.pos.z, 0, 0, 0, 0, st.r * 9, c[0], c[1], c[2], 0.035, 1);
            fx.add(st.pos.x, st.pos.y, st.pos.z, 0, 0, 0, 0, st.r * 7, c[0] * 1.2, c[1] * 1.2, c[2] * 1.2, 0.16, 3, 0.5, 0, this.time * 0.01);
          }
        }
        for (const n of s.nebula) fx.add(n.pos.x, n.pos.y, n.pos.z, 0, 0, 0, 0, n.size, n.col[0], n.col[1], n.col[2], n.a, 6);
        for (const st of s.stations) {
          const blink = (Math.sin(this.time * 3 + st.ringRot) > 0.6) ? 1 : 0.25;
          _v1.set(0, 90, 0).applyQuat(st.q).add(st.pos);
          fx.add(_v1.x, _v1.y, _v1.z, 0, 0, 0, 0, 14, 1.0, 0.2, 0.15, blink, 1);
          fx.add(st.gate.x, st.gate.y, st.gate.z, 0, 0, 0, 0, 60, 0.3, 0.8, 1.0, 0.35 + 0.15 * Math.sin(this.time * 2), 1);
        }
      } else {
        // distant system: a bright star sprite at a clamped distance
        const dir = _v1.subVectors(s.pos, R.cam).normalize();
        const dd = Math.min(d, 90000);
        const st = s.stars[0];
        const size = Math.max(st.r * 7 * dd / d, dd * 0.0045);
        const b = clamp(1.6 - d / 200000, 0.35, 1.6) * (s.bh ? 1.6 : 1);
        const c = s.bh ? [1.0, 0.55, 0.25] : st.col;
        fx.add(R.cam.x + dir.x * dd, R.cam.y + dir.y * dd, R.cam.z + dir.z * dd, 0, 0, 0, 0, size, c[0] * b * 1.5, c[1] * b * 1.5, c[2] * b * 1.5, 1, 1);
        fx.add(R.cam.x + dir.x * dd, R.cam.y + dir.y * dd, R.cam.z + dir.z * dd, 0, 0, 0, 0, size * 2.5, c[0] * b, c[1] * b, c[2] * b, 0.5, 3, 0.5, 0, 0.3);
      }
    }
  },

  // nearest solid body to a point (for collisions)
  collideBodies(pos, radius, cb) {
    const s = this.cur; if (!s) return;
    for (const b of s.bodies) {
      const d = pos.dist(b.pos), min = b.r + radius;
      if (d < min) cb(b, d, min);
    }
    for (const st of s.stars) {
      const d = pos.dist(st.pos), min = st.r * (s.bh ? 1.1 : 1.05) + radius;
      if (d < min) cb({ star: true, bh: s.bh, pos: st.pos, r: st.r }, d, min);
    }
    for (const st of s.stations) {
      const d = pos.dist(st.pos), min = 32 + radius;
      if (d < min) cb({ station: st, pos: st.pos, r: 32 }, d, min);
    }
  },
};
const IDQ = new Quat();
let BH_DISK = null;

// ─── asteroid belts ───
function makeBelt(sys) {
  const def = sys.def.belt, rng = new RNG(hashStr(sys.name + 'belt'));
  const n = Math.round(def.n * (R.q.fx > 0.7 ? 1 : 0.7));
  const rocks = [];
  const grid = new Map(), cell = 200;
  for (let i = 0; i < n; i++) {
    const a = rng.range(0, TAU);
    const g = (rng.next() + rng.next() + rng.next()) / 3 - 0.5;
    const rr = def.r + g * def.w * 2;
    const s = 6 + Math.pow(rng.next(), 3.2) * 70;
    const rock = {
      x: sys.pos.x + Math.cos(a) * rr, y: sys.pos.y + (rng.next() - 0.5) * 260 * (0.4 + Math.abs(g)), z: sys.pos.z + Math.sin(a) * rr,
      s, m: rng.int(0, 2), q: new Quat().setEuler(rng.range(0, TAU), rng.range(0, TAU), rng.range(0, TAU)),
      ax: new V3().randomUnit(() => rng.next()), w: rng.range(-0.25, 0.25), tint: 0.8 + rng.next() * 0.4,
    };
    rocks.push(rock);
    const k = Math.floor(rock.x / cell) * 100003 + Math.floor(rock.z / cell);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(rock);
  }
  return { sys, rocks, grid, cell, def };
}
function drawBelt(belt) {
  const dmax = 9000, d2 = dmax * dmax;
  const cnt = [0, 0, 0];
  const t = World.time;
  for (const r of belt.rocks) {
    const dx = r.x - R.cam.x, dy = r.y - R.cam.y, dz = r.z - R.cam.z;
    const dd = dx * dx + dy * dy + dz * dz;
    if (dd > d2) continue;
    if (!R.frustum.sphere(dx, dy, dz, r.s * 1.6)) continue;
    const mesh = MODELS.rocks[r.m], I = mesh.inst;
    const k = cnt[r.m]; if (k >= I.max) continue;
    _q1.setAxisAngle(r.ax, t * r.w); _q2.multiplyQuats(r.q, _q1);
    const o = k * 12, D = I.data;
    D[o] = dx; D[o + 1] = dy; D[o + 2] = dz; D[o + 3] = r.s;
    D[o + 4] = _q2.x; D[o + 5] = _q2.y; D[o + 6] = _q2.z; D[o + 7] = _q2.w;
    D[o + 8] = r.tint; D[o + 9] = r.tint; D[o + 10] = r.tint; D[o + 11] = 1;
    cnt[r.m] = k + 1;
  }
  const P = useProg(R.P.hullI);
  if (R._hullIFrame !== R.frameId) { R.hullSetup(P); R._hullIFrame = R.frameId; }
  U.v3(P, 'u_origin', 0, 0, 0);
  setBlend(0); setDepth(true, true); setCull(1);
  for (let m = 0; m < 3; m++) {
    if (!cnt[m]) continue;
    uploadInstances(MODELS.rocks[m], cnt[m]);
    drawInst(MODELS.rocks[m], cnt[m]);
  }
}
function beltCollide(pos, radius, cb) {
  const s = World.cur; if (!s || !s.belt) return;
  const B = s.belt, c = B.cell;
  const cx = Math.floor(pos.x / c), cz = Math.floor(pos.z / c);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const arr = B.grid.get((cx + i) * 100003 + (cz + j));
    if (!arr) continue;
    for (const r of arr) {
      const dx = pos.x - r.x, dy = pos.y - r.y, dz = pos.z - r.z;
      const min = r.s * 1.05 + radius;
      const dd = dx * dx + dy * dy + dz * dz;
      if (dd < min * min) cb(r, Math.sqrt(dd), min);
    }
  }
}
