/**
 * Zone 1 — Substructure, Pneumatic Caissons, Monumental Stone Plinths (Soubassements),
 * Cast-Steel Shoes (Sabots & Contre-Sabots), and Stage-1 Inclined Lattice Piers
 * (-11.55 m to +57.63 m / 21.95 NGF to 91.13 NGF).
 *
 * Strictly derived from Gustave Eiffel's 1889 shop plates (Pl. 03, Pl. 08 Fig. 4,
 * Pl. 20 Fig. 1, Pl. 53 Figs. 2 & 9, Pl. 55, Pl. 63, Pl. 66 Figs. 1, 5, 6, Pl. 69 Fig. 1)
 * and 1887–1889 construction/Exposition photographs (Photos 06, 09, 13, 18, 23, 30, 36, 38, 51).
 */

// ============================================================================
// Canonical Constants & Verified 3D Pier Trajectory
// ============================================================================

const Y_CAISSON_BOT_P1 = -11.55; // 21.95 NGF (Pl. 03, Pl. 63 Fig. 23)
const Y_CAISSON_BOT_P4 = -9.91;  // 23.59 NGF (Pl. 63 Fig. 31)
const Y_CAISSON_TOP = -5.50;     // 28.00 NGF (Pl. 63)

const Y_RE1_BOT = -7.35;         // 26.15 NGF (Pl. 08 Fig. 4, Pl. 63 Fig. 14)
const Y_CONC_BOT_P3 = -6.50;     // 27.00 NGF (Pl. 63 Fig. 13)
const Y_CONC_BOT_P2 = -6.33;     // 27.17 NGF (Pl. 63 Fig. 1)
const Y_CONC_TOP = -4.50;        // 29.00 NGF (Pl. 63)
const Y_PUMP_FLOOR = -3.00;      // 30.50 NGF (Pl. 08 Fig. 4, Pl. 53)

const Y_SOL = 0.00;              // 33.50 NGF (Pl. 55 canonical origin)
const Y_SOUB_CROWN = 1.58;       // 35.08 NGF (Pl. 69 Fig. 1, Pl. 63)
const Y_SOMMIER_CTR = 2.10;      // 35.60 NGF (Pl. 66 Fig. 1, Pl. 63 Fig. 8)
const Y_SHOE_PIN = 2.50;         // 36.00 NGF (Pl. 55, Pl. 03 Fig. 9)
const Y_CABIN_LANDING = 5.80;    // 39.30 NGF (Pl. 69, Pl. 63 Fig. 13)

const Y_POUTRE_ARC_BOT = 43.33;  // 76.83 NGF (Pl. 20: 91.13 - 7.30 - 7.00)
const Y_GRANDE_POUTRE_BOT = 50.33; // 83.83 NGF (Pl. 20: 91.13 - 7.30)
const Y_PROMENADE_F1 = 56.40;    // 89.90 NGF (Pl. 20)
const Y_FLOOR1_DECK = 57.63;     // 91.13 NGF (Pl. 20, Pl. 55, Pl. 08 Fig. 4)

// Pier center-to-center half-span at Y = +2.50 m (36.00 NGF): 103.907 / 2 = 51.9535 m
// Pier center-to-center half-span at Y = +50.33 m (83.83 NGF): 38.250 / 2 + 7.500 = 26.6250 m (Pl. 20)
const PIER_XC_AT_SHOE = 51.9535;
const PIER_XC_AT_GP_BOT = 26.6250;
const PIER_BATTER_DX_DY = (PIER_XC_AT_SHOE - PIER_XC_AT_GP_BOT) / (Y_GRANDE_POUTRE_BOT - Y_SHOE_PIN); // 0.529552582
const PIER_HALF_WIDTH = 7.500;   // Constant 15.000 m x 15.000 m horizontal square between chord centers

const PIERS = [
  {
    id: 'p1',
    num: 1,
    name: 'Pile 1 (Nord)',
    sx: +1,
    sz: -1,
    caissons: true,
    caissonBotY: Y_CAISSON_BOT_P1,
    elevator: 'otis',
    phaseOffset: 0.00,
    photoRefs: ['13', '30', '23', '36', '38'],
  },
  {
    id: 'p2',
    num: 2,
    name: 'Pile 2 (Est)',
    sx: +1,
    sz: +1,
    caissons: false,
    concBotY: Y_CONC_BOT_P2,
    elevator: 'combaluzier',
    phaseOffset: 0.02,
    photoRefs: ['18', '23', '36', '51'],
  },
  {
    id: 'p3',
    num: 3,
    name: 'Pile 3 (Sud)',
    sx: -1,
    sz: +1,
    caissons: false,
    concBotY: Y_CONC_BOT_P3,
    hasPumpBasement: true,
    elevator: 'otis',
    phaseOffset: 0.04,
    photoRefs: ['09', '18', '23', '36', '51'],
  },
  {
    id: 'p4',
    num: 4,
    name: 'Pile 4 (Ouest)',
    sx: -1,
    sz: -1,
    caissons: true,
    caissonBotY: Y_CAISSON_BOT_P4,
    elevator: 'combaluzier',
    phaseOffset: 0.06,
    photoRefs: ['13', '30', '23', '36'],
  },
];

// 11 Structural Tiers spanning Y = +2.50 m .. +57.63 m across Starter Amorces, Entretoise Inférieure Web & Panneaux 1..5
// Verified against Pl. 03 Fig. 9, Pl. 55, Pl. 08 Fig. 4, Pl. 66 Fig. 1, Pl. 20 Fig. 1, and Photo 09 (July 1887).
const PIER_TIERS = [
  {
    tier: 0,
    id: 't0a_starter_amorces',
    label: 'Amorces des 4 arbalétriers, semelle inférieure (3.72/4.95 m) & consoles d’angle',
    y0: 2.50,
    y1: 6.90,
    panelY0: 2.50,
    panelY1: 6.90,
    half: 'starter_amorces',
    hasArbaletriers: true,
    baseStrutPart: 'amorces',
    hasTopStrut: false,
    hasDiaphragm: false,
    phase: 1,
    spanBase: [1.24, 1.44],
    photoRefs: ['09', '06', '23', '36'],
  },
  {
    tier: 1,
    id: 't0b_entretoise_inf_web',
    label: 'Entretoises inférieures A/B — membrures supérieures (6.90 m) & treillis Saint-André',
    y0: 3.72,
    y1: 6.90,
    panelY0: 3.72,
    panelY1: 6.90,
    half: 'starter_web',
    hasArbaletriers: false,
    baseStrutPart: 'web',
    hasTopStrut: false,
    hasDiaphragm: false,
    phase: 1,
    spanBase: [1.53, 1.66],
    photoRefs: ['06', '23', '36'],
  },
  {
    tier: 2,
    id: 't1_p1a',
    label: 'Panneau 1 inférieur & Entretoise intermédiaire 1',
    y0: 6.90,
    y1: 11.90,
    panelY0: 6.90,
    panelY1: 16.90,
    half: 'lower',
    hasBaseStrut: false,
    hasTopStrut: true,       // Entretoise intermédiaire 1 at Y=11.90 (45.40 NGF, Pl. 03 Fig. 9)
    topStrutType: 'interm',
    hasDiaphragm: true,
    phase: 1,
    spanBase: [1.64, 1.80],
    photoRefs: ['06', '23', '36'],
  },
  {
    tier: 3,
    id: 't2_p1b',
    label: 'Panneau 1 supérieur & Entretoise courante 1',
    y0: 11.90,
    y1: 16.90,
    panelY0: 6.90,
    panelY1: 16.90,
    half: 'upper',
    hasTopStrut: true,       // Entretoise courante 1 at Y=16.90 (50.40 NGF, Pl. 03 Fig. 9)
    topStrutType: 'main',
    hasDiaphragm: true,
    phase: 1,
    spanBase: [1.78, 1.92],
    photoRefs: ['06', '23', '36'],
  },
  {
    tier: 4,
    id: 't3_p2a',
    label: 'Panneau 2 inférieur & Entretoise intermédiaire 2',
    y0: 16.90,
    y1: 22.575,
    panelY0: 16.90,
    panelY1: 28.00,
    half: 'lower',
    hasTopStrut: true,
    topStrutType: 'interm',
    hasDiaphragm: false,
    phase: 2,
    spanBase: [2.00, 2.22],
    photoRefs: ['23', '36', '18'],
  },
  {
    tier: 5,
    id: 't4_p2b',
    label: 'Panneau 2 supérieur & Entretoise courante 2',
    y0: 22.575,
    y1: 28.00,
    panelY0: 16.90,
    panelY1: 28.00,
    half: 'upper',
    hasTopStrut: true,
    topStrutType: 'main',
    hasDiaphragm: true,
    phase: 2,
    spanBase: [2.18, 2.40],
    photoRefs: ['23', '36', '18'],
  },
  {
    tier: 6,
    id: 't5_p3a',
    label: 'Panneau 3 inférieur & Entretoise intermédiaire 3',
    y0: 28.00,
    y1: 33.425,
    panelY0: 28.00,
    panelY1: 38.85,
    half: 'lower',
    hasTopStrut: true,
    topStrutType: 'interm',
    hasDiaphragm: false,
    phase: 2,
    spanBase: [2.36, 2.58],
    photoRefs: ['23', '36', '18', '51'],
  },
  {
    tier: 7,
    id: 't6_p3b',
    label: 'Panneau 3 supérieur & Entretoise courante 3',
    y0: 33.425,
    y1: 38.85,
    panelY0: 28.00,
    panelY1: 38.85,
    half: 'upper',
    hasTopStrut: true,
    topStrutType: 'main',
    hasDiaphragm: true,
    phase: 2,
    spanBase: [2.54, 2.76],
    photoRefs: ['23', '36', '18', '51'],
  },
  {
    tier: 8,
    id: 't7_p4a',
    label: 'Panneau 4 inférieur (Sous-poutre de l’Arc)',
    y0: 38.85,
    y1: 43.33,
    panelY0: 38.85,
    panelY1: 50.33,
    half: 'p4_lower',
    hasTopStrut: true,       // Soffit of Poutre de l'Arc at Y=43.33
    topStrutType: 'main',
    hasDiaphragm: true,
    phase: 2,
    spanBase: [2.72, 2.94],
    photoRefs: ['23', '36', '18', '51'],
  },
  {
    tier: 9,
    id: 't8_p4b_arc_girder',
    label: 'Panneau 4 supérieur (Cadre Poutre de l’Arc & Masque)',
    y0: 43.33,
    y1: 50.33,
    panelY0: 38.85,
    panelY1: 50.33,
    half: 'p4_upper',
    hasTopStrut: true,       // Top of Poutre de l'Arc / Soffit of Grande Poutre at Y=50.33
    topStrutType: 'main',
    hasDiaphragm: true,
    phase: 3,
    spanBase: [2.90, 3.12],
    photoRefs: ['23', '36', '18', '51'],
  },
  {
    tier: 10,
    id: 't9_p5_grande_poutre',
    label: 'Panneau 5 (Noeud d’angle de la Grande Poutre du 1er Étage, +57.63 m)',
    y0: 50.33,
    y1: 57.63,
    panelY0: 50.33,
    panelY1: 57.63,
    half: 'p5_girder',
    hasTopStrut: true,       // 1st-Floor Deck frame at Y=57.63 (91.13 NGF)
    topStrutType: 'main',
    hasDiaphragm: true,
    phase: 3,
    spanBase: [3.08, 3.28],
    photoRefs: ['23', '36', '18', '51'],
  },
];

// ============================================================================
// Pier Coordinate Helpers
// ============================================================================

function pierCenterAbs(y) {
  return PIER_XC_AT_SHOE - PIER_BATTER_DX_DY * (y - Y_SHOE_PIN);
}

/**
 * Exact 3D point on pier `p` at elevation `y` and local offsets `(ox, oz)`
 * where `ox > 0` points outward along pier's `sx` axis and `oz > 0` points outward along `sz`.
 * Corners:
 *   A (inner, toward tower axis): ox = -7.5, oz = -7.5
 *   Bx (outer-X, inner-Z):        ox = +7.5, oz = -7.5
 *   Dz (inner-X, outer-Z):        ox = -7.5, oz = +7.5
 *   C (outer corner):             ox = +7.5, oz = +7.5
 */
function pierPoint(pier, y, ox = 0.0, oz = 0.0) {
  const c = pierCenterAbs(y);
  return [
    pier.sx * (c + ox),
    y,
    pier.sz * (c + oz),
  ];
}

function pierUnitAxis(pier) {
  const vx = -pier.sx * PIER_BATTER_DX_DY;
  const vy = 1.0;
  const vz = -pier.sz * PIER_BATTER_DX_DY;
  const len = Math.hypot(vx, vy, vz);
  return [vx / len, vy / len, vz / len];
}

// ============================================================================
// Fallback Materials
// ============================================================================

function resolveMaterials(THREE, inputMats = {}) {
  const fallback = (key, opts) => {
    if (inputMats && inputMats[key]) return inputMats[key];
    return new THREE.MeshStandardMaterial({ name: key, ...opts });
  };
  return {
    ironPrimary: fallback('ironPrimary', { color: 0x5c382c, roughness: 0.52, metalness: 0.44, side: THREE.DoubleSide }),
    ironLattice: fallback('ironLattice', { color: 0x6b4335, roughness: 0.56, metalness: 0.38, side: THREE.DoubleSide }),
    ironCast: fallback('ironCast', { color: 0x363432, roughness: 0.45, metalness: 0.64, side: THREE.DoubleSide }),
    masonryAshlar: fallback('masonryAshlar', { color: 0xe2dac9, roughness: 0.84, metalness: 0.03 }),
    concreteSub: fallback('concreteSub', { color: 0x9e9a91, roughness: 0.92, metalness: 0.02 }),
    woodPavilion: fallback('woodPavilion', { color: 0x8f6239, roughness: 0.64, metalness: 0.05, side: THREE.DoubleSide }),
    woodTimberTemp: fallback('woodTimberTemp', { color: 0xbc9056, roughness: 0.78, metalness: 0.02, side: THREE.DoubleSide }),
    glass1889: fallback('glass1889', { color: 0xc8dde6, transparent: true, opacity: 0.42, roughness: 0.14, metalness: 0.10, side: THREE.DoubleSide, depthWrite: false }),
    goldAccent: fallback('goldAccent', { color: 0xd1a43e, roughness: 0.30, metalness: 0.82, side: THREE.DoubleSide }),
    copperDome: fallback('copperDome', { color: 0x586f64, roughness: 0.42, metalness: 0.58, side: THREE.DoubleSide }),
    flagTricolore: fallback('flagTricolore', { color: 0xffffff, roughness: 0.74, metalness: 0.02, side: THREE.DoubleSide }),
    craneSteel: fallback('craneSteel', { color: 0x3b434a, roughness: 0.44, metalness: 0.65, side: THREE.DoubleSide }),
  };
}

// ============================================================================
// Fast Indexed BufferGeometry Builder (Zero Temporary Mesh Allocations)
// ============================================================================

function sub3(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function add3(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function scale3(a, s) {
  return [a[0] * s, a[1] * s, a[2] * s];
}
function lerp3(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}
function cross3(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function norm3(a) {
  const l = Math.hypot(a[0], a[1], a[2]) || 1.0;
  return [a[0] / l, a[1] / l, a[2] / l];
}

class GeomBuilder {
  constructor(initVerts = 512, initIdx = 1024) {
    this._vCap = initVerts;
    this._iCap = initIdx;
    this._pos = new Float32Array(initVerts * 3);
    this._nrm = new Float32Array(initVerts * 3);
    this._uvs = new Float32Array(initVerts * 2);
    this._idx = new Uint32Array(initIdx);
    this.vertCount = 0;
    this.idxCount = 0;
    this.minY = Infinity;
    this.maxY = -Infinity;
    this.sumX = 0;
    this.sumY = 0;
    this.sumZ = 0;
  }

  _ensureVerts(addV) {
    const need = this.vertCount + addV;
    if (need <= this._vCap) return;
    let cap = this._vCap;
    while (cap < need) cap <<= 1;
    const np = new Float32Array(cap * 3);
    np.set(this._pos.subarray(0, this.vertCount * 3));
    this._pos = np;
    const nn = new Float32Array(cap * 3);
    nn.set(this._nrm.subarray(0, this.vertCount * 3));
    this._nrm = nn;
    const nu = new Float32Array(cap * 2);
    nu.set(this._uvs.subarray(0, this.vertCount * 2));
    this._uvs = nu;
    this._vCap = cap;
  }

  _ensureIdx(addI) {
    const need = this.idxCount + addI;
    if (need <= this._iCap) return;
    let cap = this._iCap;
    while (cap < need) cap <<= 1;
    const ni = new Uint32Array(cap);
    ni.set(this._idx.subarray(0, this.idxCount));
    this._idx = ni;
    this._iCap = cap;
  }

  _pushVertXYZ(px, py, pz, nx, ny, nz, u, v) {
    this._ensureVerts(1);
    const idx = this.vertCount++;
    const po = idx * 3;
    const uo = idx * 2;
    this._pos[po] = px;
    this._pos[po + 1] = py;
    this._pos[po + 2] = pz;
    this._nrm[po] = nx;
    this._nrm[po + 1] = ny;
    this._nrm[po + 2] = nz;
    this._uvs[uo] = u;
    this._uvs[uo + 1] = v;
    if (py < this.minY) this.minY = py;
    if (py > this.maxY) this.maxY = py;
    this.sumX += px;
    this.sumY += py;
    this.sumZ += pz;
    return idx;
  }

  _pushVert(p, n, u, v) {
    return this._pushVertXYZ(p[0], p[1], p[2], n[0], n[1], n[2], u, v);
  }

  /**
   * Add a flat quad (p0 -> p1 -> p2 -> p3 CCW from outside).
   */
  addQuad(p0, p1, p2, p3, uvScale = 0.25) {
    const x0 = p0[0], y0 = p0[1], z0 = p0[2];
    const x1 = p1[0], y1 = p1[1], z1 = p1[2];
    const x2 = p2[0], y2 = p2[1], z2 = p2[2];
    const x3 = p3[0], y3 = p3[1], z3 = p3[2];
    const e1x = x1 - x0, e1y = y1 - y0, e1z = z1 - z0;
    const e2x = x3 - x0, e2y = y3 - y0, e2z = z3 - z0;
    let nx = e1y * e2z - e1z * e2y;
    let ny = e1z * e2x - e1x * e2z;
    let nz = e1x * e2y - e1y * e2x;
    const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1.0;
    const invNl = 1.0 / nl;
    nx *= invNl; ny *= invNl; nz *= invNl;
    const w = Math.sqrt(e1x * e1x + e1y * e1y + e1z * e1z) * uvScale;
    const h = Math.sqrt(e2x * e2x + e2y * e2y + e2z * e2z) * uvScale;

    this._ensureVerts(4);
    this._ensureIdx(6);
    const i0 = this._pushVertXYZ(x0, y0, z0, nx, ny, nz, 0, 0);
    const i1 = this._pushVertXYZ(x1, y1, z1, nx, ny, nz, w, 0);
    const i2 = this._pushVertXYZ(x2, y2, z2, nx, ny, nz, w, h);
    const i3 = this._pushVertXYZ(x3, y3, z3, nx, ny, nz, 0, h);
    const io = this.idxCount;
    const idx = this._idx;
    idx[io] = i0; idx[io + 1] = i1; idx[io + 2] = i2;
    idx[io + 3] = i0; idx[io + 4] = i2; idx[io + 5] = i3;
    this.idxCount = io + 6;
  }

  addTri(p0, p1, p2, uvScale = 0.25) {
    const x0 = p0[0], y0 = p0[1], z0 = p0[2];
    const x1 = p1[0], y1 = p1[1], z1 = p1[2];
    const x2 = p2[0], y2 = p2[1], z2 = p2[2];
    const e1x = x1 - x0, e1y = y1 - y0, e1z = z1 - z0;
    const e2x = x2 - x0, e2y = y2 - y0, e2z = z2 - z0;
    let nx = e1y * e2z - e1z * e2y;
    let ny = e1z * e2x - e1x * e2z;
    let nz = e1x * e2y - e1y * e2x;
    const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1.0;
    const invNl = 1.0 / nl;
    nx *= invNl; ny *= invNl; nz *= invNl;
    const u1 = Math.sqrt(e1x * e1x + e1y * e1y + e1z * e1z) * uvScale;
    const v2 = Math.sqrt(e2x * e2x + e2y * e2y + e2z * e2z) * uvScale;

    this._ensureVerts(3);
    this._ensureIdx(3);
    const i0 = this._pushVertXYZ(x0, y0, z0, nx, ny, nz, 0, 0);
    const i1 = this._pushVertXYZ(x1, y1, z1, nx, ny, nz, u1, 0);
    const i2 = this._pushVertXYZ(x2, y2, z2, nx, ny, nz, 0, v2);
    const io = this.idxCount;
    const idx = this._idx;
    idx[io] = i0; idx[io + 1] = i1; idx[io + 2] = i2;
    this.idxCount = io + 3;
  }

  /**
   * Add an arbitrary 8-corner hexahedron:
   * bottom loop [b0, b1, b2, b3] CCW when viewed from +Y (above),
   * top loop    [t0, t1, t2, t3] directly above [b0, b1, b2, b3].
   */
  addHexahedron(bot, top, caps = true, uvScale = 0.25) {
    // Check winding of bot wrt upward direction (top[0] - bot[0])
    const upVec = sub3(top[0], bot[0]);
    const topN = cross3(sub3(top[1], top[0]), sub3(top[3], top[0]));
    let b = bot;
    let t = top;
    if (dot3(topN, upVec) < 0) {
      b = [bot[0], bot[3], bot[2], bot[1]];
      t = [top[0], top[3], top[2], top[1]];
    }
    for (let k = 0; k < 4; k++) {
      const kn = (k + 1) % 4;
      // Side quad facing outward: b[k] -> b[kn] -> t[kn] -> t[k]
      // Wait: if top loop is CCW from above (e.g. (-x,-z) -> (-x,+z) -> (+x,+z) -> (+x,-z)),
      // side 0: (-x,-z) -> (-x,+z) -> (-x,+z,y1) -> (-x,-z,y1): e1=(0,0,+z), e2=(0,+y,0), e1 x e2 = (-1,0,0) OUTWARD!
      this.addQuad(b[k], b[kn], t[kn], t[k], uvScale);
    }
    if (caps) {
      this.addQuad(t[0], t[1], t[2], t[3], uvScale);
      this.addQuad(b[0], b[3], b[2], b[1], uvScale);
    }
  }

  addBox(cx, cy, cz, sx, sy, sz, caps = true) {
    const hx = sx * 0.5, hy = sy * 0.5, hz = sz * 0.5;
    const bot = [
      [cx - hx, cy - hy, cz - hz],
      [cx - hx, cy - hy, cz + hz],
      [cx + hx, cy - hy, cz + hz],
      [cx + hx, cy - hy, cz - hz],
    ];
    const top = [
      [cx - hx, cy + hy, cz - hz],
      [cx - hx, cy + hy, cz + hz],
      [cx + hx, cy + hy, cz + hz],
      [cx + hx, cy + hy, cz - hz],
    ];
    this.addHexahedron(bot, top, caps);
  }

  /**
   * Add a 3D beam along segment p0 -> p1 with rectangular section (wU along uAxis, wV along vAxis).
   */
  addBeamFrame(p0, p1, uAxis, vAxis, wU, wV, caps = false) {
    const hu = scale3(uAxis, wU * 0.5);
    const hv = scale3(vAxis, wV * 0.5);
    const cornersAt = (p) => [
      add3(p, add3(scale3(hu, -1), scale3(hv, -1))),
      add3(p, add3(scale3(hu, -1), hv)),
      add3(p, add3(hu, hv)),
      add3(p, add3(hu, scale3(hv, -1))),
    ];
    this.addHexahedron(cornersAt(p0), cornersAt(p1), caps);
  }

  addBeam(p0, p1, wU, wV, hintVec = [0, 1, 0], caps = false) {
    const d = sub3(p1, p0);
    const len = Math.hypot(d[0], d[1], d[2]);
    if (len < 1e-4) return;
    const tAxis = [d[0] / len, d[1] / len, d[2] / len];
    let uAxis = cross3(hintVec, tAxis);
    if (Math.hypot(uAxis[0], uAxis[1], uAxis[2]) < 1e-3) {
      uAxis = cross3([1, 0, 0], tAxis);
      if (Math.hypot(uAxis[0], uAxis[1], uAxis[2]) < 1e-3) {
        uAxis = cross3([0, 0, 1], tAxis);
      }
    }
    uAxis = norm3(uAxis);
    const vAxis = norm3(cross3(tAxis, uAxis));
    this.addBeamFrame(p0, p1, uAxis, vAxis, wU, wV, caps);
  }

  /**
   * Add a polygonal prism (e.g. octagonal cut-stone sommier or cylindrical contre-sabot)
   * centered on baseCenter -> topCenter with orthogonal basis (uAxis, vAxis).
   */
  addPolygonPrism(baseCenter, topCenter, uAxis, vAxis, rBase, rTop, sides = 8, rotOffsetRad = Math.PI / 8) {
    const ring = (c, r) => {
      const pts = [];
      for (let i = 0; i < sides; i++) {
        const a = rotOffsetRad + (i / sides) * Math.PI * 2;
        const ca = Math.cos(a) * r;
        const sa = Math.sin(a) * r;
        pts.push([
          c[0] + uAxis[0] * ca + vAxis[0] * sa,
          c[1] + uAxis[1] * ca + vAxis[1] * sa,
          c[2] + uAxis[2] * ca + vAxis[2] * sa,
        ]);
      }
      return pts;
    };
    const bPts = ring(baseCenter, rBase);
    const tPts = ring(topCenter, rTop);
    const axis = sub3(topCenter, baseCenter);
    // Ensure outward winding on sides
    const testN = cross3(sub3(bPts[1], bPts[0]), axis);
    const rad0 = sub3(bPts[0], baseCenter);
    const flip = dot3(testN, rad0) < 0;

    for (let i = 0; i < sides; i++) {
      const inx = (i + 1) % sides;
      if (!flip) {
        this.addQuad(bPts[i], bPts[inx], tPts[inx], tPts[i], 0.35);
      } else {
        this.addQuad(bPts[inx], bPts[i], tPts[i], tPts[inx], 0.35);
      }
    }
    // Top & bottom fan caps
    for (let i = 1; i < sides - 1; i++) {
      if (!flip) {
        this.addTri(tPts[0], tPts[i], tPts[i + 1], 0.35);
        this.addTri(baseCenter, bPts[i + 1], bPts[i], 0.35);
      } else {
        this.addTri(tPts[0], tPts[i + 1], tPts[i], 0.35);
        this.addTri(baseCenter, bPts[i], bPts[i + 1], 0.35);
      }
    }
    if (!flip) {
      this.addTri(baseCenter, bPts[1], bPts[0], 0.35);
      this.addTri(baseCenter, bPts[0], bPts[sides - 1], 0.35);
    } else {
      this.addTri(baseCenter, bPts[0], bPts[1], 0.35);
      this.addTri(baseCenter, bPts[sides - 1], bPts[0], 0.35);
    }
  }

  /**
   * Add a flat gusset plate (riveted nodal plate) of thickness `thick` from a 3D polygon `pts` (4 or 5 pts).
   */
  addPlatePolygon(pts, normalVec, thick = 0.045) {
    if (pts.length < 3) return;
    const h = scale3(normalVec, thick * 0.5);
    const f = pts.map((p) => add3(p, h));
    const b = pts.map((p) => sub3(p, h));
    const e1 = sub3(f[1], f[0]);
    const e2 = sub3(f[2], f[0]);
    const flip = dot3(cross3(e1, e2), normalVec) < 0;

    for (let i = 1; i < pts.length - 1; i++) {
      if (!flip) {
        this.addTri(f[0], f[i], f[i + 1], 0.5);
        this.addTri(b[0], b[i + 1], b[i], 0.5);
      } else {
        this.addTri(f[0], f[i + 1], f[i], 0.5);
        this.addTri(b[0], b[i], b[i + 1], 0.5);
      }
    }
    for (let i = 0; i < pts.length; i++) {
      const inx = (i + 1) % pts.length;
      if (!flip) {
        this.addQuad(b[i], b[inx], f[inx], f[i], 0.5);
      } else {
        this.addQuad(b[inx], b[i], f[i], f[inx], 0.5);
      }
    }
  }

  isEmpty() {
    return this.vertCount === 0;
  }

  getCentroid() {
    if (this.vertCount === 0) return [0, 0, 0];
    return [
      this.sumX / this.vertCount,
      this.sumY / this.vertCount,
      this.sumZ / this.vertCount,
    ];
  }

  toBufferGeometry(THREE, recenterOffset = null) {
    const geom = new THREE.BufferGeometry();
    const vc3 = this.vertCount * 3;
    const vc2 = this.vertCount * 2;
    const posSlice = this._pos.slice(0, vc3);
    if (recenterOffset) {
      const ox = recenterOffset[0];
      const oy = recenterOffset[1];
      const oz = recenterOffset[2];
      for (let i = 0; i < vc3; i += 3) {
        posSlice[i] -= ox;
        posSlice[i + 1] -= oy;
        posSlice[i + 2] -= oz;
      }
    }
    geom.setAttribute('position', new THREE.BufferAttribute(posSlice, 3));
    geom.setAttribute('normal', new THREE.BufferAttribute(this._nrm.slice(0, vc3), 3));
    geom.setAttribute('uv', new THREE.BufferAttribute(this._uvs.slice(0, vc2), 2));
    if (this.vertCount > 65535) {
      geom.setIndex(new THREE.BufferAttribute(this._idx.slice(0, this.idxCount), 1));
    } else {
      const idx16 = new Uint16Array(this.idxCount);
      const src = this._idx;
      for (let i = 0; i < this.idxCount; i++) idx16[i] = src[i];
      geom.setIndex(new THREE.BufferAttribute(idx16, 1));
    }
    geom.computeBoundingSphere();
    return geom;
  }
}

/**
 * Multi-material piece accumulator: merges each material bucket into a single Mesh
 * inside a pivot Group positioned at the piece's own 3D centroid so construction
 * lowering/scaling animations operate locally around the piece itself and settle at 0.000 m.
 */
class PieceBuilder {
  constructor() {
    this.buckets = new Map(); // key -> { mat, geomB, userData }
  }

  bucket(mat, userData = null) {
    const key = userData ? `${mat.uuid || mat.name || 'mat'}::${JSON.stringify(userData)}` : mat;
    let entry = this.buckets.get(key);
    if (!entry) {
      entry = { mat, geomB: new GeomBuilder(), userData };
      this.buckets.set(key, entry);
    }
    return entry.geomB;
  }

  finalize(THREE, meta) {
    let totalVerts = 0;
    let sumX = 0, sumY = 0, sumZ = 0;
    let yMin = Infinity, yMax = -Infinity;

    for (const { geomB: b } of this.buckets.values()) {
      if (b.isEmpty()) continue;
      totalVerts += b.vertCount;
      sumX += b.sumX;
      sumY += b.sumY;
      sumZ += b.sumZ;
      if (b.minY < yMin) yMin = b.minY;
      if (b.maxY > yMax) yMax = b.maxY;
    }

    const cx = totalVerts > 0 ? sumX / totalVerts : 0;
    const cy = totalVerts > 0 ? sumY / totalVerts : 0;
    const cz = totalVerts > 0 ? sumZ / totalVerts : 0;

    const grp = new THREE.Group();
    grp.name = meta.id;
    grp.position.set(cx, cy, cz);

    let meshCount = 0;
    let triCount = 0;
    for (const { mat, geomB: b, userData } of this.buckets.values()) {
      if (b.isEmpty()) continue;
      const geom = b.toBufferGeometry(THREE, [cx, cy, cz]);
      const mesh = new THREE.Mesh(geom, mat);
      mesh.name = `${meta.id}_${mat.name || meshCount}${userData && userData.isSoilRemblai ? '_remblai' : ''}`;
      if (userData) Object.assign(mesh.userData, userData);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      grp.add(mesh);
      meshCount++;
      triCount += b.idxCount / 3;
    }

    return {
      piece: {
        id: meta.id,
        label: meta.label,
        object3D: grp,
        phase: meta.phase,
        span: meta.span,
        vanishSpan: meta.vanishSpan || null,
        category: meta.category || 'permanent',
        yMin: Number.isFinite(yMin) ? Number(yMin.toFixed(3)) : 0,
        yMax: Number.isFinite(yMax) ? Number(yMax.toFixed(3)) : 0,
        photoRefs: meta.photoRefs || [],
      },
      vertCount: totalVerts,
      triCount,
      meshCount,
    };
  }
}

// ============================================================================
// True 3D Open-Laced Structural Member Generators (Pl. 03 Figs. 8, 21–32)
// ============================================================================

/**
 * Build a 4-chord open-laced wrought-iron box strut/diagonal (Pl. 03 Figs. 8, 31–32, Photo 51):
 * - 4 corner angle chords (`ironPrimary`) forming a `wFace × wDepth` rectangular section
 * - Crisscross flat-bar St. Andrew's lattice webbing (`treillis`, `ironLattice`) on front & back faces
 *   (and top/bottom lacing bars on main struts).
 */
function addOpenLacedBoxMember(primaryB, latticeB, p0, p1, faceNormal, wFace, wDepth, opts = {}) {
  const d = sub3(p1, p0);
  const len = Math.hypot(d[0], d[1], d[2]);
  if (len < 0.08) return;
  const tAxis = [d[0] / len, d[1] / len, d[2] / len];

  // uAxis = outward normal to pier face, vAxis = in-plane perpendicular to member
  let uAxis = sub3(faceNormal, scale3(tAxis, dot3(faceNormal, tAxis)));
  if (Math.hypot(uAxis[0], uAxis[1], uAxis[2]) < 1e-3) {
    uAxis = cross3([0, 1, 0], tAxis);
  }
  uAxis = norm3(uAxis);
  const vAxis = norm3(cross3(tAxis, uAxis));

  const chordW = opts.chordW || 0.085;
  const hu = (wDepth - chordW) * 0.5;
  const hv = (wFace - chordW) * 0.5;

  // 4 corner angle chords
  for (const su of [-1, +1]) {
    for (const sv of [-1, +1]) {
      const off = add3(scale3(uAxis, su * hu), scale3(vAxis, sv * hv));
      primaryB.addBeamFrame(add3(p0, off), add3(p1, off), uAxis, vAxis, chordW, chordW, false);
    }
  }

  // End batten plates (étrésillons d'extrémité)
  const endPad = Math.min(0.28, len * 0.12);
  for (const [ta, tb] of [[0.0, endPad / len], [1.0 - endPad / len, 1.0]]) {
    const qa = lerp3(p0, p1, ta);
    const qb = lerp3(p0, p1, tb);
    for (const su of [-1, +1]) {
      const off = scale3(uAxis, su * hu);
      primaryB.addBeamFrame(add3(qa, off), add3(qb, off), uAxis, vAxis, 0.032, wFace, false);
    }
  }

  // Crisscross flat-bar lattice webbing (`barres de treillis`) on front & back faces
  const pitch = opts.pitch || 1.12;
  const tStart = endPad / len;
  const tEnd = 1.0 - endPad / len;
  const activeLen = (tEnd - tStart) * len;
  const nBays = Math.max(2, Math.round(activeLen / pitch));
  const barThick = opts.barThick || 0.026;
  const barWidth = opts.barWidth || 0.058;

  for (let i = 0; i < nBays; i++) {
    const ta = tStart + ((tEnd - tStart) * i) / nBays;
    const tb = tStart + ((tEnd - tStart) * (i + 1)) / nBays;
    const pa = lerp3(p0, p1, ta);
    const pb = lerp3(p0, p1, tb);

    for (const su of [-1, +1]) {
      const uOff = scale3(uAxis, su * hu);
      const aBot = add3(pa, add3(uOff, scale3(vAxis, -hv)));
      const aTop = add3(pa, add3(uOff, scale3(vAxis, +hv)));
      const bBot = add3(pb, add3(uOff, scale3(vAxis, -hv)));
      const bTop = add3(pb, add3(uOff, scale3(vAxis, +hv)));
      latticeB.addBeam(aBot, bTop, barThick, barWidth, uAxis, false);
      latticeB.addBeam(aTop, bBot, barThick, barWidth, uAxis, false);
    }

    // Side depth lacing (single Warren zig-zag on top/bottom depth faces for 3D parallax!)
    if (opts.laceDepth !== false) {
      for (const sv of [-1, +1]) {
        const vOff = scale3(vAxis, sv * hv);
        const aIn = add3(pa, add3(vOff, scale3(uAxis, (i % 2 === 0 ? -1 : +1) * hu)));
        const bOut = add3(pb, add3(vOff, scale3(uAxis, (i % 2 === 0 ? +1 : -1) * hu)));
        latticeB.addBeam(aIn, bOut, barThick, barWidth * 0.85, vAxis, false);
      }
    }
  }
}

/**
 * Build a segment of one of the 16 primary 0.80m–0.85m riveted box-chord `arbalétriers`
 * (Pl. 03 Figs. 21–28, Photo 06) sliced cleanly on horizontal planes `Y = y0` and `Y = y1`
 * so tier joints and the +57.630 m 1st-floor deck plane meet with 0.000 m vertical overhang:
 * - Heavy corner angle irons (`cornières` 120×120) + outer flanged web cover plates (`tôles`)
 * - Open double-crisscross lattice bars (`treillis`) on the two pier-interior sides
 * - Internal square stiffener diaphragms (`Entretoises intérieures des arbalétriers`, Fig. 28)
 * - Riveted splice collar (`couvre-joint`) near panel joint.
 */
function addArbaletrierSegment(primaryB, latticeB, pier, ox, oz, y0, y1, addSplice = true) {
  const p0 = pierPoint(pier, y0, ox, oz);
  const p1 = pierPoint(pier, y1, ox, oz);
  const d = sub3(p1, p0);
  const len = Math.hypot(d[0], d[1], d[2]);
  if (len < 0.05) return;

  // Horizontal pier-local axes (guaranteeing exact Y = y0 and Y = y1 end planes!)
  const ux = [pier.sx, 0, 0];
  const vz = [0, 0, pier.sz];

  const W = 0.88; // Horizontal section width corresponding to ~0.80 m perpendicular box section (Pl. 03 Figs. 21–26)
  const cornerW = 0.132;
  const h = (W - cornerW) * 0.5;
  const capTop = y1 >= Y_FLOOR1_DECK - 0.01;

  // 4 heavy corner angle-iron bundles (`cornières d'angle` 120×120) + proud exterior L-angle flange strips
  for (const su of [-1, +1]) {
    for (const sv of [-1, +1]) {
      const off = add3(scale3(ux, su * h), scale3(vz, sv * h));
      primaryB.addBeamFrame(add3(p0, off), add3(p1, off), ux, vz, cornerW, cornerW, capTop);
      // Proud corner L-angle legs (`cornières saillantes` 110×28 mm) catching 3D edge highlights (Photo 09, Photo 38)
      const cEdgeU = add3(scale3(ux, su * (W * 0.5 + 0.014)), scale3(vz, sv * (W * 0.5 - 0.055)));
      const cEdgeV = add3(scale3(ux, su * (W * 0.5 - 0.055)), scale3(vz, sv * (W * 0.5 + 0.014)));
      latticeB.addBeamFrame(add3(p0, cEdgeU), add3(p1, cEdgeU), ux, vz, 0.028, 0.115, capTop);
      latticeB.addBeamFrame(add3(p0, cEdgeV), add3(p1, cEdgeV), ux, vz, 0.115, 0.028, capTop);
    }
  }

  // Two outward-facing solid web plates (`tôles pleines`, Pl. 03 Figs. 21–26) on the pier's exterior corner sides,
  // and open crisscross lattice webbing (`treillis`) on the two inward-facing sides!
  const suOut = ox > 0 ? +1 : -1;
  const svOut = oz > 0 ? +1 : -1;

  // Solid web plates + central longitudinal riveted seam cover-strap (`couvre-joint longitudinal`) on the 2 outer faces
  const plateT = 0.038;
  primaryB.addBeamFrame(
    add3(p0, scale3(ux, suOut * h)),
    add3(p1, scale3(ux, suOut * h)),
    ux,
    vz,
    plateT,
    W - 0.04,
    false
  );
  latticeB.addBeamFrame(
    add3(p0, scale3(ux, suOut * (W * 0.5 + 0.012))),
    add3(p1, scale3(ux, suOut * (W * 0.5 + 0.012))),
    ux,
    vz,
    0.024,
    0.11,
    capTop
  );
  primaryB.addBeamFrame(
    add3(p0, scale3(vz, svOut * h)),
    add3(p1, scale3(vz, svOut * h)),
    ux,
    vz,
    W - 0.04,
    plateT,
    false
  );
  latticeB.addBeamFrame(
    add3(p0, scale3(vz, svOut * (W * 0.5 + 0.012))),
    add3(p1, scale3(vz, svOut * (W * 0.5 + 0.012))),
    ux,
    vz,
    0.11,
    0.024,
    capTop
  );

  // Lower reinforced outer cover-plate flanges (`semelles extérieures renforcées`, Pl. 03 Figs. 9, 21–24, 30; Photo 09)
  // Stepped inward on side width (`0.64 m` vs `0.88 m`) so main box corner `cornières` stay visible in 3D relief!
  const extFlange = y0 < 7.00 ? 0.32 : (y0 < 22.65 ? 0.37 : 0.0);
  const extX = ox > 0 ? extFlange : 0.0;
  const extZ = oz > 0 ? extFlange : 0.0;
  const finW = 0.64;
  if (extX > 0) {
    const outMid = 0.43 + extX * 0.5;
    primaryB.addBeamFrame(
      add3(p0, scale3(ux, +outMid)),
      add3(p1, scale3(ux, +outMid)),
      ux,
      vz,
      extX + 0.03,
      finW,
      false
    );
    // Twin outer T-flange L-angle strips (`cornières extérieures`) along the outer edge of the reinforced web fin
    for (const sv of [-1, +1]) {
      const fAngleOff = add3(scale3(ux, 0.44 + extX - 0.045), scale3(vz, sv * (finW * 0.5 + 0.016)));
      latticeB.addBeamFrame(add3(p0, fAngleOff), add3(p1, fAngleOff), ux, vz, 0.10, 0.032, false);
    }
  }
  if (extZ > 0) {
    const outMid = 0.43 + extZ * 0.5;
    primaryB.addBeamFrame(
      add3(p0, scale3(vz, +outMid)),
      add3(p1, scale3(vz, +outMid)),
      ux,
      vz,
      finW,
      extZ + 0.03,
      false
    );
    for (const su of [-1, +1]) {
      const fAngleOff = add3(scale3(vz, 0.44 + extZ - 0.045), scale3(ux, su * (finW * 0.5 + 0.016)));
      latticeB.addBeamFrame(add3(p0, fAngleOff), add3(p1, fAngleOff), ux, vz, 0.032, 0.10, false);
    }
  }

  // Crisscross double lattice bars on the 2 inner faces of the box chord (Photo 06!)
  const laceTopMargin = capTop ? Math.min(0.15, 0.12 / len) : 0.0;
  const q1 = laceTopMargin > 0 ? lerp3(p0, p1, 1.0 - laceTopMargin) : p1;
  const nLace = Math.max(3, Math.round(len / 0.92));
  for (let i = 0; i < nLace; i++) {
    const pa = lerp3(p0, q1, i / nLace);
    const pb = lerp3(p0, q1, (i + 1) / nLace);

    // Face -suOut (normal ux, width along vz)
    {
      const fOff = scale3(ux, -suOut * h);
      const a0 = add3(pa, add3(fOff, scale3(vz, -h)));
      const a1 = add3(pa, add3(fOff, scale3(vz, +h)));
      const b0 = add3(pb, add3(fOff, scale3(vz, -h)));
      const b1 = add3(pb, add3(fOff, scale3(vz, +h)));
      latticeB.addBeam(a0, b1, 0.028, 0.068, ux, false);
      latticeB.addBeam(a1, b0, 0.028, 0.068, ux, false);
    }
    // Face -svOut (normal vz, width along ux)
    {
      const fOff = scale3(vz, -svOut * h);
      const a0 = add3(pa, add3(fOff, scale3(ux, -h)));
      const a1 = add3(pa, add3(fOff, scale3(ux, +h)));
      const b0 = add3(pb, add3(fOff, scale3(ux, -h)));
      const b1 = add3(pb, add3(fOff, scale3(ux, +h)));
      latticeB.addBeam(a0, b1, 0.028, 0.068, vz, false);
      latticeB.addBeam(a1, b0, 0.028, 0.068, vz, false);
    }
  }

  // Internal stiffener diaphragm (`Entretoise intérieure`, Pl. 03 Fig. 28) at mid-segment
  const pMid = lerp3(p0, p1, 0.5);
  const pMid2 = lerp3(p0, p1, Math.min(0.95, 0.5 + 0.08 / len));
  primaryB.addBeamFrame(pMid, pMid2, ux, vz, W * 0.94, W * 0.94, true);

  // Periodic transverse riveted splice cover-straps (`couvre-joints transversaux`, Pl. 03 Figs. 21–26, Photo 09, Photo 38)
  // spaced every ~3.1 m along the inclined box trunk (staying strictly below Y = 57.630 m)
  void addSplice;
  const nStraps = Math.max(1, Math.round(len / 3.1));
  const strapH = 0.24 / len;
  for (let k = 0; k < nStraps; k++) {
    const tc = (k + 0.42) / nStraps;
    const s0 = Math.max(0.06, tc - strapH * 0.5);
    const s1 = Math.min(0.94, tc + strapH * 0.5);
    const yaS = y0 + (y1 - y0) * s1;
    if (yaS >= Y_FLOOR1_DECK - 0.22) continue;
    const qa = lerp3(p0, p1, s0);
    const qb = lerp3(p0, p1, s1);
    latticeB.addBeamFrame(qa, qb, ux, vz, W + 0.068, W + 0.068, true);
    if (extX > 0) {
      latticeB.addBeamFrame(
        add3(qa, scale3(ux, 0.43 + extX * 0.5)),
        add3(qb, scale3(ux, 0.43 + extX * 0.5)),
        ux,
        vz,
        extX + 0.055,
        finW + 0.068,
        true
      );
    }
    if (extZ > 0) {
      latticeB.addBeamFrame(
        add3(qa, scale3(vz, 0.43 + extZ * 0.5)),
        add3(qb, scale3(vz, 0.43 + extZ * 0.5)),
        ux,
        vz,
        finW + 0.068,
        extZ + 0.055,
        true
      );
    }
  }
}

// ============================================================================
// Sub-System 1: Substructure, Pneumatic Caissons, Ré1 & Foundation Masonry
// ============================================================================

function buildPierSubstructurePieces(THREE, mats, pier) {
  const builtPieces = [];
  const dt = pier.phaseOffset;

  // Radial outward unit vector along the 45° diagonal of this pier: (sx/sqrt2, 0, sz/sqrt2)
  const rOut = [pier.sx * Math.SQRT1_2, 0, pier.sz * Math.SQRT1_2];
  // Perpendicular tangent unit vector across the diagonal: (-sx/sqrt2, 0, +sz/sqrt2)
  const rPerp = [-pier.sx * Math.SQRT1_2, 0, pier.sz * Math.SQRT1_2];
  const up = [0, 1, 0];

  // Thrust shift from Y=+2.50 down to Y=-5.50: along outward pier inclination
  const shoeCorners = [
    { key: 'A', ox: -7.5, oz: -7.5, isInner: true },
    { key: 'Bx', ox: +7.5, oz: -7.5, isInner: false },
    { key: 'Dz', ox: -7.5, oz: +7.5, isInner: false },
    { key: 'C', ox: +7.5, oz: +7.5, isInner: false },
  ];

  // 1A. Caissons (Piles 1 & 4) OR Concrete Pads + Pile 3 Pump/Ré1 Pit (Piles 2 & 3)
  {
    const pb = new PieceBuilder();
    const concB = pb.bucket(mats.concreteSub);
    const castB = pb.bucket(mats.ironCast);
    const ironB = pb.bucket(mats.ironPrimary);
    const stoneB = pb.bucket(mats.masonryAshlar);

    if (pier.caissons) {
      const yBot = pier.caissonBotY; // -11.55 or -11.52
      const yTop = Y_CAISSON_TOP;    // -5.50
      const yChamber = yBot + 1.85;  // Working chamber ceiling (`chambre de travail`)

      for (const sc of shoeCorners) {
        // Shoe at Y=2.50 thrusts outward along (-tAxis) down to yTop=-5.50 (dy = 8.0m -> outward shift ~4.2m)
        const basePt = pierPoint(pier, Y_SHOE_PIN, sc.ox, sc.oz);
        const shiftOut = 3.85;
        // Inner Massif A caisson is 15.00m x 6.00m extending inward under elevator pit (Pl. 63 Fig. 23–24);
        // Pile 4 Massif C caisson spans s_out = +8.67..+19.55 m (Pl. 63 Fig. 31)
        const isP4OuterC = pier.id === 'p4' && sc.key === 'C';
        const cLen = sc.isInner ? 15.00 : (isP4OuterC ? 10.88 : 9.61);
        const cWid = 6.00;
        const radShift = sc.isInner ? 1.20 : (isP4OuterC ? 3.50 : shiftOut);
        const cx = basePt[0] + pier.sx * radShift * Math.SQRT1_2;
        const cz = basePt[2] + pier.sz * radShift * Math.SQRT1_2;

        // Concrete core fill inside caisson
        concB.addBeamFrame(
          [cx, yBot + 0.08, cz],
          [cx, yTop, cz],
          rOut,
          rPerp,
          cLen - 0.16,
          cWid - 0.16,
          true
        );

        // Riveted sheet-iron caisson outer cutting shoe & upper shell (Pl. 63, Photo 30)
        // Cutting-edge lower chamber (`chambre de travail`)
        castB.addBeamFrame([cx, yBot, cz], [cx, yChamber, cz], rOut, rPerp, cLen, cWid, true);
        // Upper sheet-iron cofferdam skin (`hausses métalliques`) with horizontal stiffener ribs
        ironB.addBeamFrame([cx, yChamber, cz], [cx, yTop, cz], rOut, rPerp, cLen, cWid, true);
        for (let yr = yBot + 1.2; yr < yTop; yr += 1.45) {
          castB.addBeamFrame([cx, yr, cz], [cx, yr + 0.14, cz], rOut, rPerp, cLen + 0.18, cWid + 0.18, true);
        }

        // Twin cylindrical pneumatic airlock access shafts (`cheminées à air`, Photo 13) capped at -5.50m
        const nShafts = sc.isInner ? 3 : 2;
        for (let k = 0; k < nShafts; k++) {
          const sOff = ((k - (nShafts - 1) * 0.5) * cLen) * 0.45;
          const scx = cx + rOut[0] * sOff;
          const scz = cz + rOut[2] * sOff;
          castB.addPolygonPrism([scx, yTop - 0.1, scz], [scx, yTop + 0.65, scz], rOut, rPerp, 0.52, 0.52, 10, 0);
        }
      }
    } else {
      // Piles 2 & 3: Open-cut concrete foundation pads (`béton de fondation`, -6.50/-6.33m to -4.50m)
      const yBot = pier.concBotY;
      const yTop = Y_CONC_TOP;

      for (const sc of shoeCorners) {
        const basePt = pierPoint(pier, Y_SHOE_PIN, sc.ox, sc.oz);
        const isSide = Math.sign(sc.ox) !== Math.sign(sc.oz);
        // On Pile 3 (`hasPumpBasement`), keep inner pad A and side pads B/D clear of the central pump & Ré1 room (Pl. 53 Fig. 1)
        const shift = pier.hasPumpBasement
          ? (sc.isInner ? -1.40 : isSide ? 3.85 : 3.40)
          : (sc.isInner ? 1.80 : 3.40);
        const pLen = pier.hasPumpBasement
          ? (sc.isInner ? 4.20 : isSide ? 5.80 : 10.00)
          : (sc.isInner ? 12.00 : 10.00);
        const pWid = pier.hasPumpBasement
          ? (sc.isInner ? 4.20 : isSide ? 3.80 : 7.40)
          : (sc.isInner ? 8.20 : 7.40);
        const cx = basePt[0] + pier.sx * shift * Math.SQRT1_2;
        const cz = basePt[2] + pier.sz * shift * Math.SQRT1_2;
        concB.addBeamFrame([cx, yBot, cz], [cx, yTop, cz], rOut, rPerp, pLen, pWid, true);
      }

      const pCtr = [pier.sx * PIER_XC_AT_SHOE, 0, pier.sz * PIER_XC_AT_SHOE];
      if (!pier.hasPumpBasement) {
        // Central concrete mat connecting elevator trench (Pile 2 Est; Pile 3 Sud is excavated for pump/Ré1 basement!)
        concB.addBeamFrame([pCtr[0], yBot + 0.4, pCtr[2]], [pCtr[0], yTop, pCtr[2]], rOut, rPerp, 14.5, 9.5, true);
      }

      // Pile 3 (Sud): Open Subterranean Hydraulic Pump Basement (-3.00m / 30.50 NGF), Ré1 Pit (-7.35m / 26.15 NGF, Pl. 53 Fig. 1)
      // & Inward Subterranean Boiler-Flue / Retaining Chamber (`Mur de pignon`, Pl. 63 Fig. 13 left)
      if (pier.hasPumpBasement) {
        // Inward concrete foundation pad extension under boiler-flue retaining chamber (-rOut = 12.2..22.8 m, outside Pl. 53 Fig. 1)
        const inPadX = pCtr[0] - rOut[0] * 17.50;
        const inPadZ = pCtr[2] - rOut[2] * 17.50;
        concB.addBeamFrame([inPadX, yBot, inPadZ], [inPadX, yTop, inPadZ], rOut, rPerp, 10.6, 10.6, true);

        // Subterranean portion (<= -0.80 m) of `Mur de pignon` boiler-flue walls (upper cap builds with Soubassement at step 3.85..4.45)
        const chWallX = pCtr[0] - rOut[0] * 21.85;
        const chWallZ = pCtr[2] - rOut[2] * 21.85;
        stoneB.addBeamFrame([chWallX, yTop, chWallZ], [chWallX, -0.80, chWallZ], rOut, rPerp, 1.45, 10.4, true);
        for (const [dOff, wThk] of [[19.55, 1.35], [16.55, 1.25]]) {
          const pwX = pCtr[0] - rOut[0] * dOff;
          const pwZ = pCtr[2] - rOut[2] * dOff;
          stoneB.addBeamFrame([pwX, yTop, pwZ], [pwX, -0.80, pwZ], rOut, rPerp, wThk, 9.6, true);
        }
        stoneB.addBeamFrame([inPadX, yTop, inPadZ], [inPadX, -3.35, inPadZ], rOut, rPerp, 9.4, 10.2, true);

        // Pl. 53 Fig. 1 & Pl. 63 Fig. 13: Open central subterranean room with authentic retaining walls & stepped pedestal `B`:
        // 1) Thick diagonal Ré1 / elevator-pit dividing wall at s_out = -2.85 m + parallel trench curb at s_out = -1.35 m (Pl. 53 Fig. 1)
        const diagWallX = pCtr[0] - rOut[0] * 2.85 + rPerp[0] * 0.35;
        const diagWallZ = pCtr[2] - rOut[2] * 2.85 + rPerp[2] * 0.35;
        concB.addBeamFrame([diagWallX, Y_RE1_BOT, diagWallZ], [diagWallX, Y_RE1_BOT + 0.85, diagWallZ], rOut, rPerp, 1.60, 9.9, true);
        stoneB.addBeamFrame([diagWallX, Y_RE1_BOT + 0.85, diagWallZ], [diagWallX, -0.80, diagWallZ], rOut, rPerp, 1.38, 9.8, true);

        const trenchCurbX = pCtr[0] - rOut[0] * 1.35 + rPerp[0] * 0.25;
        const trenchCurbZ = pCtr[2] - rOut[2] * 1.35 + rPerp[2] * 0.25;
        stoneB.addBeamFrame([trenchCurbX, yBot, trenchCurbZ], [trenchCurbX, -0.80, trenchCurbZ], rOut, rPerp, 0.38, 8.8, true);

        // 2) Orthogonal inner Ré1 retaining curb wall at ox = -6.05 m, oz ∈ [-7.65, -0.95] m (left double-wall on Pl. 53 Fig. 1)
        const leftWallX = pCtr[0] + pier.sx * (-6.05);
        const leftWallZ = pCtr[2] + pier.sz * (-4.30);
        concB.addBox(leftWallX, -7.00, leftWallZ, 0.72, 0.70, 6.70, true);
        stoneB.addBox(leftWallX, -4.60, leftWallZ, 0.56, 4.10, 6.70, true);

        // 3) Central stepped masonry support block `B` at (ox = +1.00 m, oz = +0.95 m, Pl. 53 Fig. 1 & Pl. 63 Fig. 13)
        const pedBX = pCtr[0] + pier.sx * 1.00;
        const pedBZ = pCtr[2] + pier.sz * 0.95;
        concB.addBeamFrame([pedBX, yBot, pedBZ], [pedBX, yTop, pedBZ], rOut, rPerp, 3.10, 3.10, true);
        stoneB.addPolygonPrism([pedBX, yTop, pedBZ], [pedBX, -0.80, pedBZ], rOut, rPerp, 1.78, 1.48, 8, Math.PI / 8);

        // 4) Outer longitudinal perimeter retaining wall at s_perp = -11.4 m (outside Pl. 53 Fig. 1 crop, preserves Pl. 63 Fig. 13 section!)
        const perimX = pCtr[0] + rOut[0] * 0.50 - rPerp[0] * 11.40;
        const perimZ = pCtr[2] + rOut[2] * 0.50 - rPerp[2] * 11.40;
        concB.addBeamFrame([perimX, Y_RE1_BOT, perimZ], [perimX, yTop, perimZ], rOut, rPerp, 15.6, 0.90, true);
        stoneB.addBeamFrame([perimX, yTop, perimZ], [perimX, -0.80, perimZ], rOut, rPerp, 16.4, 0.85, true);
      }
    }

    builtPieces.push(
      pb.finalize(THREE, {
        id: pier.caissons
          ? `z1_${pier.id}_pneumatic_caissons`
          : pier.hasPumpBasement
            ? `z1_${pier.id}_concrete_pads_pump_re1`
            : `z1_${pier.id}_concrete_pads`,
        label: pier.caissons
          ? `${pier.name} — 4 Caissons métalliques à air comprimé (${pier.caissonBotY.toFixed(2)} m .. -5.50 m)`
          : pier.hasPumpBasement
            ? `${pier.name} — Béton de fondation, Sous-sol des machines (-3.00 m) & Fosse Ré1 (-7.35 m)`
            : `${pier.name} — Massifs de béton de fondation (${pier.concBotY.toFixed(2)} m .. -4.50 m)`,
        phase: 0,
        span: [0.00 + dt, 0.34 + dt],
        photoRefs: pier.caissons ? ['13', '30'] : ['13'],
      })
    );
  }

    // 1B. Stepped & Battered Foundation Masonry (`Massifs A, B, C, D`) + Retaining Walls + Anchor Bolts
    // On Pile 4 (`Photo 13`, May 1, 1887, `step = 0.55`): ONLY left `33.78 NGF` dressed block (`Bx` at `[-58.95, +0.87, -45.15]`)
    // has coursed ashlar above `-1.1 m`, while active caissons `A, Dz, C` sink inside riveted sheet-iron cofferdam `hausses`.
  {
    const isP4 = pier.id === 'p4';
    const pb = new PieceBuilder();
    const stoneB = pb.bucket(mats.masonryAshlar);
    const remblaiB = pb.bucket(mats.masonryAshlar, { isSoilRemblai: true });
    const concB = pb.bucket(mats.concreteSub);
    const pbEarly = isP4 ? new PieceBuilder() : null;
    const earlyStoneB = isP4 ? pbEarly.bucket(mats.masonryAshlar) : null;
    const pbBolts = isP4 ? new PieceBuilder() : null;
    const castB = (isP4 ? pbBolts : pb).bucket(mats.ironCast);

    const yFoot = pier.caissons ? Y_CAISSON_TOP : Y_CONC_TOP; // -5.50 or -4.50
    const yTopMasonry = 1.15; // rises cleanly into the Soubassement & Sommiers
    const tAxis = pierUnitAxis(pier); // points UP and INWARD; -tAxis points DOWN and OUTWARD
    const pCtr = [pier.sx * PIER_XC_AT_SHOE, 0, pier.sz * PIER_XC_AT_SHOE];

    if (isP4) {
      const hIronB = pbEarly.bucket(mats.ironPrimary);
      const hCastB = pbEarly.bucket(mats.ironCast);
      const hConcB = pbEarly.bucket(mats.concreteSub);
      const hWoodB = pbEarly.bucket(mats.woodPavilion);
      const addCofferdamHausse = (sOutCtr, sPerpCtr, hLen, hWid, yTopH, strutOffsets) => {
        const hx = pCtr[0] + rOut[0] * sOutCtr + rPerp[0] * sPerpCtr;
        const hz = pCtr[2] + rOut[2] * sOutCtr + rPerp[2] * sPerpCtr;
        const wThk = 0.14;
        for (const s of [-1, +1]) {
          const sxW = hx + rPerp[0] * s * (0.5 * hWid - 0.5 * wThk);
          const szW = hz + rPerp[2] * s * (0.5 * hWid - 0.5 * wThk);
          hIronB.addBeamFrame([sxW, yFoot, szW], [sxW, yTopH, szW], rOut, rPerp, hLen - 0.52, wThk, true);
          hCastB.addBeamFrame([sxW, yTopH - 0.12, szW], [sxW, yTopH, szW], rOut, rPerp, hLen - 0.44, 0.24, true);
          const exW = hx + rOut[0] * s * (0.5 * hLen - 0.5 * wThk);
          const ezW = hz + rOut[2] * s * (0.5 * hLen - 0.5 * wThk);
          hIronB.addBeamFrame([exW, yFoot, ezW], [exW, yTopH, ezW], rOut, rPerp, wThk, hWid - 0.52, true);
          hCastB.addBeamFrame([exW, yTopH - 0.12, ezW], [exW, yTopH, ezW], rOut, rPerp, 0.24, hWid - 0.44, true);
          for (const sp of [-1, +1]) {
            const c0 = [
              hx + rOut[0] * s * (0.5 * hLen - 0.52) + rPerp[0] * sp * (0.5 * hWid - 0.07),
              0.5 * (yFoot + yTopH),
              hz + rOut[2] * s * (0.5 * hLen - 0.52) + rPerp[2] * sp * (0.5 * hWid - 0.07),
            ];
            const c1 = [
              hx + rOut[0] * s * (0.5 * hLen - 0.07) + rPerp[0] * sp * (0.5 * hWid - 0.52),
              0.5 * (yFoot + yTopH),
              hz + rOut[2] * s * (0.5 * hLen - 0.07) + rPerp[2] * sp * (0.5 * hWid - 0.52),
            ];
            hIronB.addBeam(c0, c1, yTopH - yFoot, wThk, [0, 1, 0], true);
          }
        }
        hConcB.addBeamFrame([hx, yFoot + 0.05, hz], [hx, -1.31, hz], rOut, rPerp, hLen - 0.30, hWid - 0.30, true);
        for (const stOff of strutOffsets) {
          const p0 = [hx + rOut[0] * stOff - rPerp[0] * (0.5 * hWid - 0.14), -0.88, hz + rOut[2] * stOff - rPerp[2] * (0.5 * hWid - 0.14)];
          const p1 = [hx + rOut[0] * stOff + rPerp[0] * (0.5 * hWid - 0.14), -0.88, hz + rOut[2] * stOff + rPerp[2] * (0.5 * hWid - 0.14)];
          hWoodB.addBeam(p0, p1, 0.18, 0.18, [0, 1, 0], true);
        }
      };
      addCofferdamHausse(-7.80, 0.00, 18.10, 6.60, -0.72, [-5.40, +1.60, +5.30]);
      const divX = pCtr[0] - rOut[0] * 4.60;
      const divZ = pCtr[2] - rOut[2] * 4.60;
      hIronB.addBeamFrame([divX, yFoot, divZ], [divX, -0.76, divZ], rOut, rPerp, 0.14, 6.32, true);
      addCofferdamHausse(+3.86, +10.61, 9.20, 6.00, -0.68, [-2.20, +2.20]);
      addCofferdamHausse(+14.11, 0.00, 10.20, 6.00, -0.75, [-2.50, +2.50]);
    }

    const nCourses = 6;
    for (const sc of shoeCorners) {
      const topPin = pierPoint(pier, Y_SHOE_PIN, sc.ox, sc.oz);
      const targetStoneB = isP4 && sc.key === 'Bx' ? earlyStoneB : stoneB;

      // Stepped coursed limestone blocks following the downward-outward thrust vector (-tAxis)
      const isSide = Math.sign(sc.ox) !== Math.sign(sc.oz);
      for (let c = 0; c < nCourses; c++) {
        const u0 = c / nCourses;
        const u1 = (c + 1) / nCourses;
        const ya = yFoot + (yTopMasonry - yFoot) * u0;
        const yb = yFoot + (yTopMasonry - yFoot) * u1;
        const ym = 0.5 * (ya + yb);
        const dyBelowPin = Y_SHOE_PIN - ym;
        const inPumpZone = pier.hasPumpBasement && ya < -2.45;
        const thrustScale = inPumpZone
          ? (sc.isInner ? -0.25 : 0.85)
          : (sc.isInner ? 0.62 : 0.80);
        const cx = topPin[0] - tAxis[0] * dyBelowPin * thrustScale;
        const cz = topPin[2] - tAxis[2] * dyBelowPin * thrustScale;

        const taper = 1.0 - 0.38 * u0;
        const mLen = inPumpZone
          ? (sc.isInner ? 4.20 : isSide ? 5.60 : 8.2 * taper + 2.35)
          : ((sc.isInner ? 8.5 : 8.2) * taper + 2.35);
        const mWid = inPumpZone
          ? (sc.isInner ? 4.00 : isSide ? 3.80 : 5.8 * taper + 1.55)
          : (5.8 * taper + 1.55);
        targetStoneB.addBeamFrame([cx, ya, cz], [cx, yb, cz], rOut, rPerp, mLen, mWid, true);
      }

      // Twin Ø0.10 m × 7.80 m wrought-iron anchor bolts (`Boulons d'ancrage`, Pl. 63 Fig. 23) + anchor gallery beam
      for (const sb of [-0.62, +0.62]) {
        const boltTop = add3(topPin, add3(scale3(rPerp, sb), scale3(tAxis, 0.25)));
        const boltBot = add3(boltTop, scale3(tAxis, -7.80));
        castB.addBeam(boltBot, boltTop, 0.11, 0.11, rPerp, true);
      }
      // Anchor gallery transverse washer beam (`sommier d'ancrage` inside inspection gallery)
      const galCtr = add3(topPin, scale3(tAxis, -6.90));
      castB.addBeamFrame(
        sub3(galCtr, scale3(rPerp, 0.95)),
        add3(galCtr, scale3(rPerp, 0.95)),
        tAxis, rOut, 0.32, 0.42, true
      );
    }

    // Piles 1 & 4 (Pneumatic Caissons, Pl. 63 Figs. 23 & 31):
    // Deep subterranean retaining foundation (<= -0.80 m; upper parvis cap builds with Soubassement at step 3.85..4.45)
    if (pier.caissons) {
      const inFootX = pCtr[0] - rOut[0] * 18.2;
      const inFootZ = pCtr[2] - rOut[2] * 18.2;
      concB.addBeamFrame([inFootX, -7.30, inFootZ], [inFootX, -4.85, inFootZ], rOut, rPerp, 9.4, 10.2, true);

      // True structural masonry retaining walls (`Murs de soutènement`, Pl. 63 Figs. 23 & 31) bordering the `Remblai` pocket
      for (const [dOff, wThk] of [[13.55, 0.95], [19.65, 1.45]]) {
        const murX = pCtr[0] - rOut[0] * dOff;
        const murZ = pCtr[2] - rOut[2] * dOff;
        stoneB.addBeamFrame([murX, Y_CAISSON_TOP, murZ], [murX, -0.80, murZ], rOut, rPerp, wThk, 10.0, true);
      }
      // Pure-soil `Remblai` embankment side closures (tagged `isSoilRemblai: true` so orthographic cutaway sections show blank `Remblai` chamber)
      const extSoilX = pCtr[0] - rOut[0] * 22.15;
      const extSoilZ = pCtr[2] - rOut[2] * 22.15;
      remblaiB.addBeamFrame([extSoilX, Y_CAISSON_TOP, extSoilZ], [extSoilX, -0.80, extSoilZ], rOut, rPerp, 1.25, 10.0, true);
      const slabX = pCtr[0] - rOut[0] * 17.85;
      const slabZ = pCtr[2] - rOut[2] * 17.85;
      for (const s of [-1, +1]) {
        const retSideX = slabX + rPerp[0] * s * 4.55;
        const retSideZ = slabZ + rPerp[2] * s * 4.55;
        remblaiB.addBeamFrame([retSideX, Y_CAISSON_TOP, retSideZ], [retSideX, -0.80, retSideZ], rOut, rPerp, 9.4, 0.85, true);
      }

      // Pile 4 (Ouest, Pl. 63 Fig. 31): Stepped `Remblai` retaining pocket & corbel on `Massif C`'s inner side
      // (s_out = +6.95..+9.45 m, Y = -5.50..-1.15 m, flanking the Combaluzier `Remblai` earth pocket)
      if (pier.id === 'p4') {
        const cInWallX = pCtr[0] + rOut[0] * 8.95;
        const cInWallZ = pCtr[2] + rOut[2] * 8.95;
        stoneB.addBeamFrame([cInWallX, Y_CAISSON_TOP, cInWallZ], [cInWallX, -1.15, cInWallZ], rOut, rPerp, 1.05, 6.2, true);

        const stepLowX = pCtr[0] + rOut[0] * 8.15;
        const stepLowZ = pCtr[2] + rOut[2] * 8.15;
        stoneB.addBeamFrame([stepLowX, -3.05, stepLowZ], [stepLowX, -2.05, stepLowZ], rOut, rPerp, 1.95, 6.0, true);

        const stepTopX = pCtr[0] + rOut[0] * 7.90;
        const stepTopZ = pCtr[2] + rOut[2] * 7.90;
        stoneB.addBeamFrame([stepTopX, -2.15, stepTopZ], [stepTopX, -1.30, stepTopZ], rOut, rPerp, 1.95, 6.0, true);
      }
    }

    // Outer toe stepped masonry retaining block (+rOut = 16.2..19.5 m, Pl. 63 Figs. 13, 23 & 31; <= -0.80 m during Phase 0)
    {
      const outToeX = pCtr[0] + rOut[0] * 17.85;
      const outToeZ = pCtr[2] + rOut[2] * 17.85;
      const yToeBot = pier.caissons ? Y_CAISSON_TOP : pier.concBotY + 0.35;
      const yToeTop = pier.caissons ? -0.80 : -1.35;
      stoneB.addBeamFrame([outToeX, yToeBot, outToeZ], [outToeX, yToeTop, outToeZ], rOut, rPerp, 3.30, 6.2, true);
    }

    // Subterranean lower elevator trench retaining walls (<= -0.80 m; cleared of Ré1 room on Pile 3!)
    if (!pier.hasPumpBasement) {
      const pitCtr = [pier.sx * (PIER_XC_AT_SHOE - 0.8), 0, pier.sz * (PIER_XC_AT_SHOE - 0.8)];
      for (const s of [-1, +1]) {
        const wx = pitCtr[0] + rPerp[0] * s * 2.55;
        const wz = pitCtr[2] + rPerp[2] * s * 2.55;
        stoneB.addBeamFrame([wx, yFoot + 0.6, wz], [wx, -0.80, wz], rOut, rPerp, 13.8, 0.72, true);
      }
    }
    void up;

    if (isP4) {
      builtPieces.push(
        pbEarly.finalize(THREE, {
          id: 'z1_p4_massif_a_early',
          label: `${pier.name} — Maçonnerie initiale (33.78 NGF) & hausses de batardeaux en tôle (Photo 13)`,
          phase: 0,
          span: [0.28, 0.48],
          photoRefs: ['13', '30'],
        })
      );
    }

    builtPieces.push(
      pb.finalize(THREE, {
        id: `z1_${pier.id}_foundation_massifs`,
        label: isP4
          ? `${pier.name} — Massifs de maçonnerie en gradins & murs de soutènement (${yFoot.toFixed(2)} m .. +1.15 m)`
          : `${pier.name} — 4 Massifs de maçonnerie en gradins, galeries & boulons d’ancrage (${yFoot.toFixed(2)} m .. +1.15 m)`,
        phase: 0,
        span: isP4 ? [0.60, 0.84] : [0.28 + dt, 0.60 + dt],
        photoRefs: isP4 ? ['09'] : ['13', '09'],
      })
    );

    if (isP4) {
      builtPieces.push(
        pbBolts.finalize(THREE, {
          id: 'z1_p4_anchor_bolts',
          label: `${pier.name} — 8 Boulons d’ancrage Ø0.10 m & sommiers de galerie`,
          phase: 0,
          span: [0.62, 0.82],
          photoRefs: ['09'],
        })
      );
    }
  }

  return builtPieces;
}

// ============================================================================
// Sub-System 2: Monumental Stone Plinths (`Soubassements`) & 16 `Sommiers`
// ============================================================================

function buildPierSoubassementPieces(THREE, mats, pier) {
  const builtPieces = [];
  const dt = pier.phaseOffset;

  const cx = pier.sx * PIER_XC_AT_SHOE;
  const cz = pier.sz * PIER_XC_AT_SHOE;
  const rOut = [pier.sx * Math.SQRT1_2, 0, pier.sz * Math.SQRT1_2];
  const rPerp = [-pier.sx * Math.SQRT1_2, 0, pier.sz * Math.SQRT1_2];

  // 2A. Monumental Battered Limestone Soubassement (Pl. 69 Fig. 1, Pl. 55, Photos 09, 36, 38)
  {
    const pb = new PieceBuilder();
    const stoneB = pb.bucket(mats.masonryAshlar);

    // Outer base half-width = 10.50 m -> reaches 51.9535 + 10.50 = 62.4535 m (exact Pl. 55 124.906 m outer span!)
    // Crown half-width at Y = +1.58 m (35.08 NGF) = 20.55 / 2 = 10.275 m (`Poutre du Soubassement` 20.55 m square, Pl. 69!)
    const hSocle = 10.50;  // 21.00 m socle square (+ projecting arch pedestals to 37.119 m!)
    const hBot = 10.42;
    const hCrown = 10.275; // exact 20.55 m x 20.55 m at Y = +1.58 m!

    // Helper: frame a square/battered masonry course around the 4.36 m-wide central diagonal elevator pit
    // (`Cage de l'ascenseur`, |s_perp| < 2.18 m, s_out ∈ [-5.20, +6.60] m, Pl. 63 Fig. 1 Coupe EF)
    // while keeping all outer ±h0 / ±h1 square perimeter faces 100% identical.
    const diagPt = (sO, y, sP) => [
      cx + rOut[0] * sO + rPerp[0] * sP,
      y,
      cz + rOut[2] * sO + rPerp[2] * sP,
    ];
    const addTriPrism = (bot3, top3, uvScale = 0.22) => {
      const upVec = sub3(top3[0], bot3[0]);
      const topN = cross3(sub3(top3[1], top3[0]), sub3(top3[2], top3[0]));
      const flip = dot3(topN, upVec) < 0;
      const [b0, b1, b2] = flip ? [bot3[0], bot3[2], bot3[1]] : bot3;
      const [t0, t1, t2] = flip ? [top3[0], top3[2], top3[1]] : top3;
      stoneB.addQuad(b0, b1, t1, t0, uvScale);
      stoneB.addQuad(b1, b2, t2, t1, uvScale);
      stoneB.addQuad(b2, b0, t0, t2, uvScale);
      stoneB.addTri(t0, t1, t2, uvScale);
      stoneB.addTri(b0, b2, b1, uvScale);
    };
    const addPitFramedCourse = (y0, y1, h0, h1, shift = 0, uvScale = 0.22) => {
      const sShift = shift * Math.SQRT2;
      const d0 = h0 * Math.SQRT2;
      const d1 = h1 * Math.SQRT2;
      const sMin = -5.20, sMax = 6.60, wH = 2.18;
      const wIn0 = d0 - Math.abs(sMin - sShift), wIn1 = d1 - Math.abs(sMin - sShift);
      const wOut0 = d0 - Math.abs(sMax - sShift), wOut1 = d1 - Math.abs(sMax - sShift);

      addTriPrism(
        [diagPt(sShift - d0, y0, 0), diagPt(sMin, y0, -wIn0), diagPt(sMin, y0, wIn0)],
        [diagPt(sShift - d1, y1, 0), diagPt(sMin, y1, -wIn1), diagPt(sMin, y1, wIn1)],
        uvScale
      );
      addTriPrism(
        [diagPt(sShift + d0, y0, 0), diagPt(sMax, y0, wOut0), diagPt(sMax, y0, -wOut0)],
        [diagPt(sShift + d1, y1, 0), diagPt(sMax, y1, wOut1), diagPt(sMax, y1, -wOut1)],
        uvScale
      );
      stoneB.addHexahedron(
        [diagPt(sMin, y0, -wIn0), diagPt(sShift, y0, -d0), diagPt(sShift, y0, -wH), diagPt(sMin, y0, -wH)],
        [diagPt(sMin, y1, -wIn1), diagPt(sShift, y1, -d1), diagPt(sShift, y1, -wH), diagPt(sMin, y1, -wH)],
        true, uvScale
      );
      stoneB.addHexahedron(
        [diagPt(sShift, y0, -d0), diagPt(sMax, y0, -wOut0), diagPt(sMax, y0, -wH), diagPt(sShift, y0, -wH)],
        [diagPt(sShift, y1, -d1), diagPt(sMax, y1, -wOut1), diagPt(sMax, y1, -wH), diagPt(sShift, y1, -wH)],
        true, uvScale
      );
      stoneB.addHexahedron(
        [diagPt(sMin, y0, wH), diagPt(sShift, y0, wH), diagPt(sShift, y0, d0), diagPt(sMin, y0, wIn0)],
        [diagPt(sMin, y1, wH), diagPt(sShift, y1, wH), diagPt(sShift, y1, d1), diagPt(sMin, y1, wIn1)],
        true, uvScale
      );
      stoneB.addHexahedron(
        [diagPt(sShift, y0, wH), diagPt(sMax, y0, wH), diagPt(sMax, y0, wOut0), diagPt(sShift, y0, d0)],
        [diagPt(sShift, y1, wH), diagPt(sMax, y1, wH), diagPt(sMax, y1, wOut1), diagPt(sShift, y1, d1)],
        true, uvScale
      );
    };

    // 1. Dressed ashlar base socle (Y = -0.40 m .. +0.26 m) framed around central elevator pit
    addPitFramedCourse(-0.40, 0.26, hSocle, hSocle, 0);

    // 2. Battered limestone glacis / talus (Y = +0.26 m .. +1.34 m) framed around central elevator pit
    addPitFramedCourse(0.26, 1.34, hBot, hCrown - 0.12, 0);

    // 3. Molded classical stone cornice (`Poutre du Soubassement`, Y = +1.34 m .. +1.58 m, 20.55 m + overhang)
    addPitFramedCourse(1.34, 1.46, hCrown + 0.18, hCrown + 0.18, 0);
    addPitFramedCourse(1.46, 1.58, hCrown + 0.30, hCrown + 0.30, 0);
    // Low stone parapet / plinth curb around perimeter at Y = +1.58 .. +1.82 m
    addPitFramedCourse(1.58, 1.82, hCrown, hCrown, 0);

    // 4. Curved inner corner (`Partie courbe du Soubassement`, Pl. 69 Fig. 1) facing tower center (0,0)
    const inCornerX = cx - pier.sx * (hCrown - 1.2);
    const inCornerZ = cz - pier.sz * (hCrown - 1.2);
    stoneB.addPolygonPrism(
      [inCornerX, -0.35, inCornerZ],
      [inCornerX, Y_SOUB_CROWN + 0.24, inCornerZ],
      [1, 0, 0],
      [0, 0, 1],
      3.45,
      3.15,
      12,
      0
    );

    // 5. Recessed pilaster buttresses on all 4 Soubassement facades (4 pilasters per face, Photo 36 & 38)
    for (let k = -1.5; k <= 1.5; k += 1.0) {
      const off = k * 5.2;
      // +X and -X faces
      for (const s of [-1, +1]) {
        stoneB.addBox(cx + s * (hBot - 0.05), 0.82, cz + off, 0.36, 1.12, 1.35, true);
        stoneB.addBox(cx + off, 0.82, cz + s * (hBot - 0.05), 1.35, 1.12, 0.36, true);
      }
    }

    // 6. 4 Projecting Decorative Arch Pedestals (`Massifs de l'arc décoratif`, Pl. 69 Fig. 1, Pl. 53 Fig. 2, Pl. 55)
    // On the two interior faces (facing across X=0 and Z=0 toward adjacent piers), reaching exact ±37.119 m!
    // Because the decorative arch follows the inclined pier axis, the two pedestals on each interior face
    // sit asymmetrically at t = -6.40 m (near Partie courbe, width 3.90 m) and t = +8.45 m (flush with outer wall, width 3.90 m),
    // flanked by `Prise de gaz` masonry corner tabs (Pl. 69 Fig. 1).
    const innerEdgeTarget = 37.119; // exact Pl. 55 printed 74.238 / 2
    const mainInnerEdge = PIER_XC_AT_SHOE - hSocle; // 51.9535 - 10.50 = 41.4535 m
    const projDepth = mainInnerEdge - innerEdgeTarget; // 4.3345 m inward projection!

    for (const ribOffset of [-6.40, +8.45]) {
      // Interior face toward X = 0 (at X = sx * (37.119 .. 41.65))
      const px = pier.sx * (innerEdgeTarget + projDepth * 0.5 + 0.15);
      const pz = cz + pier.sz * ribOffset;
      stoneB.addBox(px, 0.25, pz, projDepth + 0.30, 2.90, 3.90, true);
      stoneB.addBox(px, 1.82, pz, projDepth + 0.48, 0.28, 4.15, true);

      // Interior face toward Z = 0 (at Z = sz * (37.119 .. 41.65))
      const qx = cx + pier.sx * ribOffset;
      const qz = pier.sz * (innerEdgeTarget + projDepth * 0.5 + 0.15);
      stoneB.addBox(qx, 0.25, qz, 3.90, 2.90, projDepth + 0.30, true);
      stoneB.addBox(qx, 1.82, qz, 4.15, 0.28, projDepth + 0.48, true);
    }

    // `Prise de gaz` masonry tabs flanking the decorative arch pedestals (Pl. 69 Fig. 1: t = +11.15 m & -3.95 m)
    for (const [gazOff, gazW] of [[+11.15, 1.50], [-3.95, 1.00]]) {
      const gx = pier.sx * (PIER_XC_AT_SHOE - 11.48);
      stoneB.addBox(gx, 0.18, cz + pier.sz * gazOff, 2.55, 2.74, gazW, true);
      const qz = pier.sz * (PIER_XC_AT_SHOE - 11.48);
      stoneB.addBox(cx + pier.sx * gazOff, 0.18, qz, gazW, 2.74, 2.55, true);
    }
    // Subterranean corner joist-bearing footing out to ±12.48 m / -14.70 m (Pl. 53 Fig. 2, Y = -1.20..-0.06 m)
    stoneB.addBox(pier.sx * (PIER_XC_AT_SHOE - 12.45), -0.63, cz + pier.sz * 11.44, 4.50, 1.14, 2.08, true);
    stoneB.addBox(cx + pier.sx * 11.44, -0.63, pier.sz * (PIER_XC_AT_SHOE - 12.45), 2.08, 1.14, 4.50, true);

    // 7. Entrance Terrace Apron, `Billets` Kiosk Cheek Walls & 8-Step `Escaliers d'accès` (Pl. 69 Fig. 1, Pl. 53 Fig. 2)
    // Subterranean terrace apron (`35.08` entrance court & RdC joist border, t ∈ [-4.50, +6.55] m, ox ∈ [-14.70, -10.20] m, Y = -1.20..-0.06 m)
    stoneB.addBox(pier.sx * (PIER_XC_AT_SHOE - 12.45), -0.63, cz + pier.sz * 1.025, 4.50, 1.14, 11.05, true);
    stoneB.addBox(cx + pier.sx * 1.025, -0.63, pier.sz * (PIER_XC_AT_SHOE - 12.45), 11.05, 1.14, 4.50, true);

    // Pair of `Billets` stone cheek walls flanking the central entrance/exit (`Entrée` / `Sortie`, t = -1.75 m & +3.25 m)
    for (const bilOff of [-1.75, +3.25]) {
      stoneB.addBox(pier.sx * (PIER_XC_AT_SHOE - 11.42), 0.68, cz + pier.sz * bilOff, 2.45, 1.76, 1.45, true);
      stoneB.addBox(cx + pier.sx * bilOff, 0.68, pier.sz * (PIER_XC_AT_SHOE - 11.42), 1.45, 1.76, 2.45, true);
    }

    // 8-step entrance stairs centered at t = +0.75 m (width 6.30 m); steps above Y = +0.45 m stay >= 37.119 m (`Pl. 55` clear span!)
    for (let stepIdx = 0; stepIdx < 8; stepIdx++) {
      const sy = 1.38 - stepIdx * 0.19; // +1.38 m down to +0.05 m
      const stepOuterDist = sy > 0.40
        ? (PIER_XC_AT_SHOE - 12.60 - stepIdx * 0.42) // stays >= 37.30 m above ground
        : (PIER_XC_AT_SHOE - 13.86 - (stepIdx - 3) * 0.47); // reaches 36.20 m (-15.75 m local) at base!
      const stepDepth = (PIER_XC_AT_SHOE - 10.20) - stepOuterDist;
      const stepMid = stepOuterDist + stepDepth * 0.5;
      const stepYBot = stepIdx >= 5 ? -0.45 : sy - 0.24;
      const stepH = (sy + 0.09) - stepYBot;
      const stepYCtr = stepYBot + stepH * 0.5;
      stoneB.addBox(pier.sx * stepMid, stepYCtr, cz + pier.sz * 0.75, stepDepth, stepH, 6.30, true);
      stoneB.addBox(cx + pier.sx * 0.75, stepYCtr, pier.sz * stepMid, 6.30, stepH, stepDepth, true);
    }

    // 8. Masonry elevator-landing pier on inner side up to +5.80 m (`Palier 39.30 NGF`, Pl. 63 Fig. 13, Pl. 08 Fig. 4)
    const landX = cx - pier.sx * 6.2;
    const landZ = cz - pier.sz * 6.2;
    stoneB.addBeamFrame([landX, Y_SOUB_CROWN, landZ], [landX, Y_CABIN_LANDING, landZ], rOut, rPerp, 3.4, 5.8, true);
    stoneB.addBeamFrame([landX, Y_CABIN_LANDING - 0.22, landZ], [landX, Y_CABIN_LANDING + 0.08, landZ], rOut, rPerp, 3.7, 6.1, true);

    // 9. Subterranean plinth collar (`Empattement du soubassement`, Y = -1.55..-0.06 m) & upper retaining/vault caps
    // Built with the finished Soubassement (`step 3.85..4.45`) so Photos 13, 09, 23 show open pits & bare shoe massifs!
    addPitFramedCourse(-1.55, -0.06, 11.475, 11.475, 1.025);

    const pitCtr = [pier.sx * (PIER_XC_AT_SHOE - 0.8), 0, pier.sz * (PIER_XC_AT_SHOE - 0.8)];
    for (const s of [-1, +1]) {
      const wx = pitCtr[0] + rPerp[0] * s * 2.55;
      const wz = pitCtr[2] + rPerp[2] * s * 2.55;
      stoneB.addBeamFrame([wx, -0.80, wz], [wx, Y_SOUB_CROWN - 0.1, wz], rOut, rPerp, 13.8, 0.72, true);
    }

    if (pier.caissons) {
      const remblaiB = pb.bucket(mats.masonryAshlar, { isSoilRemblai: true });
      const yInCap = pier.id === 'p4' ? 0.90 : 0.45; // Pl. 63 Figs. 23 & 31 inward parvis level (34.00 / 34.45 NGF)
      for (const [dOff, wThk] of [[13.55, 0.95], [19.65, 1.45]]) {
        const murX = cx - rOut[0] * dOff;
        const murZ = cz - rOut[2] * dOff;
        stoneB.addBeamFrame([murX, -0.80, murZ], [murX, yInCap, murZ], rOut, rPerp, wThk, 10.0, true);
      }
      const extSoilX = cx - rOut[0] * 22.15;
      const extSoilZ = cz - rOut[2] * 22.15;
      remblaiB.addBeamFrame([extSoilX, -0.80, extSoilZ], [extSoilX, yInCap - 0.30, extSoilZ], rOut, rPerp, 1.25, 10.0, true);
      const slabX = cx - rOut[0] * 17.85;
      const slabZ = cz - rOut[2] * 17.85;
      stoneB.addBeamFrame([slabX, yInCap - 0.32, slabZ], [slabX, yInCap, slabZ], rOut, rPerp, 9.7, 10.0, true);
      remblaiB.addBeamFrame([slabX, -0.80, slabZ], [slabX, yInCap - 0.32, slabZ], rOut, rPerp, 9.7, 10.0, true);
      for (const s of [-1, +1]) {
        const retSideX = slabX + rPerp[0] * s * 4.55;
        const retSideZ = slabZ + rPerp[2] * s * 4.55;
        remblaiB.addBeamFrame([retSideX, -0.80, retSideZ], [retSideX, yInCap - 0.32, retSideZ], rOut, rPerp, 9.4, 0.85, true);
      }
      const outToeX = cx + rOut[0] * 17.85;
      const outToeZ = cz + rOut[2] * 17.85;
      const yOutToeCap = pier.id === 'p4' ? 0.82 : -0.10; // Pl. 63 Fig. 31 outer terrace retaining cap (34.45 NGF)
      stoneB.addBeamFrame([outToeX, -0.80, outToeZ], [outToeX, yOutToeCap, outToeZ], rOut, rPerp, 3.30, 6.2, true);
      if (pier.id === 'p4') {
        const outStepX = cx + rOut[0] * 16.35;
        const outStepZ = cz + rOut[2] * 16.35;
        stoneB.addBeamFrame([outStepX, -0.40, outStepZ], [outStepX, 0.90, outStepZ], rOut, rPerp, 1.50, 6.2, true);
      }
    }

    if (pier.hasPumpBasement) {
      const ironB = pb.bucket(mats.ironPrimary);
      const chWallX = cx - rOut[0] * 21.85;
      const chWallZ = cz - rOut[2] * 21.85;
      stoneB.addBeamFrame([chWallX, -0.80, chWallZ], [chWallX, -0.06, chWallZ], rOut, rPerp, 1.45, 10.4, true);
      for (const [dOff, wThk] of [[19.55, 1.35], [16.55, 1.25]]) {
        const pwX = cx - rOut[0] * dOff;
        const pwZ = cz - rOut[2] * dOff;
        stoneB.addBeamFrame([pwX, -0.80, pwZ], [pwX, 1.52, pwZ], rOut, rPerp, wThk, 9.6, true);
      }
      const chRoofX = cx - rOut[0] * 16.70;
      const chRoofZ = cz - rOut[2] * 16.70;
      stoneB.addBeamFrame([chRoofX, 0.55, chRoofZ], [chRoofX, 1.54, chRoofZ], rOut, rPerp, 7.00, 9.6, true);
      const bx = pier.sx * (PIER_XC_AT_SHOE + 0.5);
      const bz = pier.sz * (PIER_XC_AT_SHOE + 0.5);
      for (let k = -3; k <= 3; k++) {
        const gx = bx + rOut[0] * k * 2.1;
        const gz = bz + rOut[2] * k * 2.1;
        ironB.addBeamFrame([gx, 1.05, gz], [gx, 1.48, gz], rOut, rPerp, 0.28, 14.2, true);
      }
    }

    builtPieces.push(
      pb.finalize(THREE, {
        id: `z1_${pier.id}_soubassement`,
        label: `${pier.name} — Soubassement en pierre de taille (20.55 m), corniches & massifs d’arc`,
        phase: 4,
        span: [3.85 + dt, 4.45 + dt],
        photoRefs: ['14', '36', '38', '18'],
      })
    );
  }

  // 2B. 4 Stepped Multi-Course Octagonal Inclined Château-Landon Cut-Stone Bearing Blocks (`Sommiers`, Pl. 63 Fig. 8, Photo 09)
  {
    const pb = new PieceBuilder();
    const stoneB = pb.bucket(mats.masonryAshlar);
    const tAxis = pierUnitAxis(pier);
    const rThrustOut = norm3(sub3(rOut, scale3(tAxis, dot3(rOut, tAxis))));

    // 4 crisp stepped constant-radius dressed ashlar courses perpendicular to pier inclination `tAxis`
    // Stepping asymmetrically outward along `rThrustOut` exactly as documented in Photo 09 & Pl. 63!
    const sommierCourses = [
      { t0: -0.68, t1: -0.42, rBot: 1.30, rTop: 1.28, outShift: 0.02 },
      { t0: -0.98, t1: -0.68, rBot: 1.48, rTop: 1.46, outShift: 0.12 },
      { t0: -1.36, t1: -0.98, rBot: 1.68, rTop: 1.66, outShift: 0.24 },
      { t0: -1.90, t1: -1.36, rBot: 1.90, rTop: 1.88, outShift: 0.38 },
    ];

    for (const [ox, oz] of [[-7.5, -7.5], [+7.5, -7.5], [-7.5, +7.5], [+7.5, +7.5]]) {
      const pinPt = pierPoint(pier, Y_SHOE_PIN, ox, oz);
      for (const sc of sommierCourses) {
        const ecc = scale3(rThrustOut, sc.outShift);
        const cBot = add3(add3(pinPt, scale3(tAxis, sc.t0)), ecc);
        const cTop = add3(add3(pinPt, scale3(tAxis, sc.t1)), ecc);
        stoneB.addPolygonPrism(cBot, cTop, rThrustOut, rPerp, sc.rBot, sc.rTop, 8, Math.PI / 8);
      }
    }

    builtPieces.push(
      pb.finalize(THREE, {
        id: `z1_${pier.id}_sommiers`,
        label: `${pier.name} — 4 Sommiers octogonaux en gradins en pierre de Château-Landon (+2.10 m / 35.60 NGF)`,
        phase: 0,
        span: [0.84 + dt, 1.00],
        photoRefs: ['09', '13', '36'],
      })
    );
  }

  // 2C. Ground-Floor Glazed Entrance, `Billets` / `W.C.` Annexes & Parvis Curb Moldings (`Phase 8 [8.60, 9.15]`, Photos 36 & 38)
  {
    const pb = new PieceBuilder();
    const stoneB = pb.bucket(mats.masonryAshlar);
    const ironB = pb.bucket(mats.ironPrimary);
    const glassB = pb.bucket(mats.glass1889);
    const woodB = pb.bucket(mats.woodPavilion);

    // 1. Dressed ashlar parvis curb moldings (`bordures de trottoir / socle mouluré`, Y = 0.00..0.38 m, <= 10.50 m outer, >= 37.12 m inner)
    for (const [yC, hH, hw] of [[0.285, 0.05, 10.495], [0.345, 0.07, 10.455]]) {
      // Stepped water-table nosing around the 21.00 m Soubassement socle perimeter
      stoneB.addBox(cx + pier.sx * (hw - 0.14), yC, cz, 0.28, hH, hw * 2, true);
      stoneB.addBox(cx, yC, cz + pier.sz * (hw - 0.14), hw * 2, hH, 0.28, true);
      stoneB.addBox(cx - pier.sx * (hw - 0.14), yC, cz + pier.sz * 1.65, 0.28, hH, (hw - 1.65) * 2, true);
      stoneB.addBox(cx + pier.sx * 1.65, yC, cz - pier.sz * (hw - 0.14), (hw - 1.65) * 2, hH, 0.28, true);
    }
    // Parvis sidewalk curb (`bordure de trottoir`, Y = 0.00..0.22 m) along entrance courts, arch pedestals & Partie courbe
    const parvisMid = 39.38; // spans 37.30 .. 41.46 m (strictly >= 37.119 m Pl. 55 clear span!)
    stoneB.addBox(pier.sx * parvisMid, 0.09, cz + pier.sz * 1.02, 4.16, 0.18, 10.80, true);
    stoneB.addBox(cx + pier.sx * 1.02, 0.09, pier.sz * parvisMid, 10.80, 0.18, 4.16, true);
    for (const stairRim of [-2.48, +3.98]) {
      stoneB.addBox(pier.sx * 39.42, 0.14, cz + pier.sz * stairRim, 4.05, 0.28, 0.34, true);
      stoneB.addBox(cx + pier.sx * stairRim, 0.14, pier.sz * 39.42, 0.34, 0.28, 4.05, true);
    }
    for (const ribOffset of [-6.40, +8.45]) {
      const pEdge = 39.36; // 37.125 .. 41.595 m
      stoneB.addBox(pier.sx * pEdge, 0.19, cz + pier.sz * ribOffset, 4.47, 0.38, 4.08, true);
      stoneB.addBox(cx + pier.sx * ribOffset, 0.19, pier.sz * pEdge, 4.08, 0.38, 4.47, true);
    }
    stoneB.addPolygonPrism(
      [cx - pier.sx * 9.05, 0.00, cz - pier.sz * 9.05],
      [cx - pier.sx * 9.05, 0.22, cz - pier.sz * 9.05],
      [1, 0, 0], [0, 0, 1], 3.72, 3.62, 12, 0
    );

    // 2. Framed `Entrée / Sortie` Masonry Portals (`t = +0.75 m`) & Glazed `Guichets des Billets` (`t = -1.75, +3.25 m`, Pl. 69, Photos 36 & 38)
    const entFaceDist = PIER_XC_AT_SHOE - 10.30;
    for (const [fx, fz, swapXZ] of [
      [pier.sx * entFaceDist, cz + pier.sz * 0.75, false],
      [cx + pier.sx * 0.75, pier.sz * entFaceDist, true],
    ]) {
      const box = (dx, y, dz, w, h, d, mB, cap = true) =>
        swapXZ ? mB.addBox(fx + dz, y, fz + dx, d, h, w, cap) : mB.addBox(fx + dx, y, fz + dz, w, h, d, cap);
      // Classical doorway architrave jambs, lintel hood & glazed double doors (`Y = 0.22..1.80 m`)
      box(0, 0.94, 0, 3.05, 1.44, 0.22, woodB, true);
      box(0, 1.42, 0, 2.75, 0.42, 0.26, glassB, false);
      for (const sJ of [-1.58, +1.58]) box(sJ, 0.98, 0, 0.28, 1.54, 0.36, stoneB, true);
      box(0, 1.74, 0, 3.56, 0.16, 0.44, stoneB, true);
      for (const mX of [-0.90, 0.00, +0.90]) box(mX, 0.96, 0, 0.09, 1.46, 0.28, ironB, false);
    }

    for (const bilOff of [-1.75, +3.25]) {
      for (const [kx, kz, swapXZ] of [
        [pier.sx * (PIER_XC_AT_SHOE - 11.42), cz + pier.sz * bilOff, false],
        [cx + pier.sx * bilOff, pier.sz * (PIER_XC_AT_SHOE - 11.42), true],
      ]) {
        const wU = swapXZ ? 1.36 : 2.34;
        const wV = swapXZ ? 2.34 : 1.36;
        // Glazed ticket-guichet (`Billets`) booth, mullions, fascia frieze & classical cornice hood (`Y = 1.56..2.52 m`)
        woodB.addBox(kx, 1.72, kz, wU, 0.32, wV, true);
        glassB.addBox(kx, 2.04, kz, wU - 0.12, 0.36, wV - 0.12, false);
        for (const su of [-1, +1]) {
          for (const sv of [-1, +1]) {
            ironB.addBox(kx + su * (wU * 0.46), 1.98, kz + sv * (wV * 0.46), 0.12, 0.84, 0.12, false);
          }
        }
        woodB.addBox(kx, 2.30, kz, wU + 0.04, 0.16, wV + 0.04, true); // `BILLETS` fascia frieze
        stoneB.addBox(kx, 2.43, kz, wU + 0.10, 0.10, wV + 0.10, true); // Classical cornice hood
      }
    }

    // 3. 4-Sided Glazed RDC Elevator-Boarding Pavilion & `WATER CLOSETS` Annex Trim (`+1.58 m .. +5.82 m`, Photos 19, 36, 38 & 62)
    const pavX = cx - pier.sx * 0.9;
    const pavZ = cz - pier.sz * 0.9;

    // 4-sided paneled wainscot, pilasters, glazed clerestory bays, window mullions & transom bars
    const addPavFacade = (fCtr, uAxis, nAxis, spanLen, hasPortalHood, nMull = 12) => {
      woodB.addBeamFrame([fCtr[0], Y_SOUB_CROWN, fCtr[2]], [fCtr[0], 2.78, fCtr[2]], uAxis, nAxis, spanLen, 0.14, true);
      stoneB.addBeamFrame([fCtr[0], 2.78, fCtr[2]], [fCtr[0], 2.87, fCtr[2]], uAxis, nAxis, spanLen + 0.10, 0.22, true);
      glassB.addBeamFrame([fCtr[0], 2.87, fCtr[2]], [fCtr[0], 5.34, fCtr[2]], uAxis, nAxis, spanLen - 0.16, 0.06, false);
      // Horizontal transom bars (`Y = 3.82 m` & `4.68 m`)
      for (const yTr of [3.82, 4.68]) {
        ironB.addBeamFrame([fCtr[0], yTr - 0.045, fCtr[2]], [fCtr[0], yTr + 0.045, fCtr[2]], uAxis, nAxis, spanLen, 0.13, false);
      }
      // Fluted pilasters (`~2.02 m` pitch) & intermediate vertical window mullions (`~0.67 m` pitch)
      for (let i = 0; i <= nMull; i++) {
        const s = ((i / nMull) - 0.5) * (spanLen - 0.18);
        const mx = fCtr[0] + uAxis[0] * s;
        const mz = fCtr[2] + uAxis[2] * s;
        if (i % 3 === 0) {
          ironB.addBeamFrame([mx, Y_SOUB_CROWN, mz], [mx, 5.36, mz], uAxis, nAxis, 0.18, 0.24, false);
          stoneB.addBeamFrame([mx, 5.22, mz], [mx, 5.34, mz], uAxis, nAxis, 0.26, 0.30, true);
        } else {
          woodB.addBeamFrame([mx, 2.86, mz], [mx, 5.34, mz], uAxis, nAxis, 0.075, 0.11, false);
          woodB.addBeamFrame([mx, 1.72, mz], [mx, 2.72, mz], uAxis, nAxis, 0.065, 0.18, false);
        }
      }
      if (hasPortalHood) {
        // Projecting classical entrance / `WATER CLOSETS` annex cornice hood & fascia (`Y = 3.02..3.32 m`)
        woodB.addBeamFrame([fCtr[0], 3.00, fCtr[2]], [fCtr[0], 3.16, fCtr[2]], uAxis, nAxis, 3.85, 0.42, true);
        stoneB.addBeamFrame([fCtr[0], 3.16, fCtr[2]], [fCtr[0], 3.30, fCtr[2]], uAxis, nAxis, 4.15, 0.58, true);
        glassB.addBeamFrame([fCtr[0], 1.62, fCtr[2]], [fCtr[0], 2.98, fCtr[2]], uAxis, nAxis, 2.40, 0.22, false);
      }
    };

    if (pier.elevator === 'combaluzier') {
      // Piles 2 & 4 (Roux-Combaluzier, Pl. 69 Fig. 1 & Photos 19 & 62):
      // Leave a 4.50 m clear central diagonal shaft & subterranean hydraulic vault viewing well (`|s_perp| < 2.25 m`)
      // flanked by peripheral lateral boarding galleries (`|s_perp| >= 2.25 m`) at `39.30 NGF` (`+5.80 m`) with
      // structural iron well-trimmer girders, molded wood curbs & wrought-iron balustrades (`+5.82..+6.78 m`).
      const latB = pb.bucket(mats.ironLattice);
      const woodDeckB = pb.bucket(mats.woodPavilion, { isWoodDecking: true });
      const wellHalf = 2.25;
      const pavPt = (u, y, v) => [
        pavX + rOut[0] * u + rPerp[0] * v,
        y,
        pavZ + rOut[2] * u + rPerp[2] * v,
      ];
      const addWingBand = (mB, y0, y1, uLen, vInner, vOuter) => {
        const wSpan = vOuter - vInner;
        const vMid = 0.5 * (vInner + vOuter);
        for (const sv of [-1, +1]) {
          mB.addBeamFrame(pavPt(0, y0, sv * vMid), pavPt(0, y1, sv * vMid), rOut, rPerp, uLen, wSpan, true);
        }
      };

      // Peripheral entablature soffit, frieze, cornice & non-overlapping lateral wood boarding decks (`|s_perp| >= 2.25 m`)
      addWingBand(ironB, 5.34, 5.44, 9.25, wellHalf, 4.425);
      addWingBand(woodB, 5.44, 5.64, 9.16, wellHalf + 0.05, 4.38);
      addWingBand(stoneB, 5.64, 5.75, 9.48, wellHalf + 0.03, 4.54);
      addWingBand(ironB, 5.32, 5.82, 9.60, wellHalf, wellHalf + 0.14); // Longitudinal riveted iron well-trimmer girders
      addWingBand(ironB, 5.75, 5.82, 9.60, 4.44, 4.60);                // Outer cornice rim
      addWingBand(woodDeckB, 5.75, 5.82, 9.28, wellHalf + 0.14, 4.44); // Peripheral `+5.82 m` wood boarding planks
      for (const su of [-1, +1]) {
        for (const sv of [-1, +1]) {
          const vMid = 0.5 * (wellHalf + 0.14 + 4.44);
          ironB.addBeamFrame(pavPt(su * 4.72, 5.75, sv * vMid), pavPt(su * 4.72, 5.82, sv * vMid), rOut, rPerp, 0.16, 4.44 - (wellHalf + 0.14), true);
        }
      }

      // Open gallery stanchions under the lateral boarding decks + molded wood curbs & wrought-iron shaft balustrades (`Photos 19 & 62`)
      for (const sv of [-1, +1]) {
        const vRail = sv * (wellHalf + 0.07);
        for (const uCol of [-4.25, -1.42, +1.42, +4.25]) {
          ironB.addBeamFrame(pavPt(uCol, Y_SOUB_CROWN, vRail), pavPt(uCol, 5.34, vRail), rOut, rPerp, 0.18, 0.20, false);
        }
        // Molded wood toe-curbs flanking the central cabin-boarding gate (`u ∈ [-2.72, -0.98] m`) + end returns
        woodB.addBeamFrame(pavPt(-3.66, 5.82, vRail), pavPt(-3.66, 5.93, vRail), rOut, rPerp, 1.88, 0.11, true);
        woodB.addBeamFrame(pavPt(+1.81, 5.82, vRail), pavPt(+1.81, 5.93, vRail), rOut, rPerp, 5.58, 0.11, true);
        // Continuous wrought-iron top handrail (`+6.76 m`), mid-rail & lower rail along inner shaft well
        latB.addBeamFrame(pavPt(0, 6.73, vRail), pavPt(0, 6.78, vRail), rOut, rPerp, 9.16, 0.065, true);
        latB.addBeamFrame(pavPt(0, 6.32, vRail), pavPt(0, 6.36, vRail), rOut, rPerp, 9.16, 0.045, false);
        latB.addBeamFrame(pavPt(0, 5.95, vRail), pavPt(0, 5.99, vRail), rOut, rPerp, 9.16, 0.045, false);
        for (const uPost of [-4.55, -2.72, -0.98, +1.80, +4.55]) {
          ironB.addBeamFrame(pavPt(uPost, 5.82, vRail), pavPt(uPost, 6.80, vRail), rOut, rPerp, 0.06, 0.06, true);
        }
        for (let k = -13; k <= 13; k++) {
          const uBar = k * 0.335;
          if (Math.abs(uBar - (-4.55)) < 0.08 || Math.abs(uBar - (-2.72)) < 0.08 || Math.abs(uBar - (-0.98)) < 0.08 || Math.abs(uBar - 1.80) < 0.08 || Math.abs(uBar - 4.55) < 0.08) continue;
          latB.addBeamFrame(pavPt(uBar, 5.93, vRail), pavPt(uBar, 6.73, vRail), rOut, rPerp, 0.026, 0.026, false);
        }
        // End-return curbs & guardrails enclosing outer/inner ends of each lateral boarding gallery (`u = ±4.55 m`)
        const vEndMid = sv * 0.5 * (wellHalf + 0.07 + 4.42);
        const vEndSpan = 4.42 - (wellHalf + 0.07);
        for (const su of [-1, +1]) {
          const uEnd = su * 4.55;
          woodB.addBeamFrame(pavPt(uEnd, 5.82, vEndMid), pavPt(uEnd, 5.93, vEndMid), rOut, rPerp, 0.11, vEndSpan, true);
          latB.addBeamFrame(pavPt(uEnd, 6.73, vEndMid), pavPt(uEnd, 6.78, vEndMid), rOut, rPerp, 0.065, vEndSpan, true);
          latB.addBeamFrame(pavPt(uEnd, 6.32, vEndMid), pavPt(uEnd, 6.36, vEndMid), rOut, rPerp, 0.045, vEndSpan, false);
          latB.addBeamFrame(pavPt(uEnd, 5.95, vEndMid), pavPt(uEnd, 5.99, vEndMid), rOut, rPerp, 0.045, vEndSpan, false);
          ironB.addBeamFrame(pavPt(uEnd, 5.82, sv * 4.40), pavPt(uEnd, 6.80, sv * 4.40), rOut, rPerp, 0.06, 0.06, true);
          for (let j = 1; j <= 5; j++) {
            const vB = sv * (wellHalf + 0.07 + (j / 6) * vEndSpan);
            latB.addBeamFrame(pavPt(uEnd, 5.93, vB), pavPt(uEnd, 6.73, vB), rOut, rPerp, 0.026, 0.026, false);
          }
        }
      }

      // Outer lateral facades (`sv = ±1`) + split end-wing return facades (`su = ±1`, strictly `|s_perp| >= 2.28 m` clear of central tracks & vault!)
      for (const sv of [-1, +1]) {
        addPavFacade(pavPt(0, 0, sv * 4.05), rOut, rPerp, 8.20, true, 12);
        for (const su of [-1, +1]) {
          addPavFacade(pavPt(su * 4.25, 0, sv * 3.18), rPerp, rOut, 1.80, false, 3);
        }
      }
    } else {
      // Boarding deck (`39.30 NGF = +5.80 m`) + classical entablature fascia frieze & stepped cornice hood (`+5.34..+5.82 m`)
      ironB.addBeamFrame([pavX, 5.34, pavZ], [pavX, 5.44, pavZ], rOut, rPerp, 9.25, 8.85, true);
      woodB.addBeamFrame([pavX, 5.44, pavZ], [pavX, 5.64, pavZ], rOut, rPerp, 9.16, 8.76, true);
      stoneB.addBeamFrame([pavX, 5.64, pavZ], [pavX, 5.75, pavZ], rOut, rPerp, 9.48, 9.08, true);
      ironB.addBeamFrame([pavX, 5.75, pavZ], [pavX, 5.82, pavZ], rOut, rPerp, 9.60, 9.20, true);
      woodB.addBeamFrame([pavX, Y_CABIN_LANDING - 0.06, pavZ], [pavX, Y_CABIN_LANDING + 0.02, pavZ], rOut, rPerp, 9.00, 8.60, true);

      for (const sv of [-1, +1]) {
        addPavFacade([pavX + rPerp[0] * sv * 4.05, 0, pavZ + rPerp[2] * sv * 4.05], rOut, rPerp, 8.20, true);
      }
      for (const su of [-1, +1]) {
        addPavFacade([pavX + rOut[0] * su * 4.25, 0, pavZ + rOut[2] * su * 4.25], rPerp, rOut, 7.90, su < 0);
      }
    }

    // Classical cornice band, fascia & mullioned windows around inner `Urinoirs / W.C.` masonry annex (`landX, landZ`)
    const landX = cx - pier.sx * 6.2;
    const landZ = cz - pier.sz * 6.2;
    woodB.addBeamFrame([landX, 3.02, landZ], [landX, 3.18, landZ], rOut, rPerp, 3.44, 5.84, true);
    stoneB.addBeamFrame([landX, 3.18, landZ], [landX, 3.30, landZ], rOut, rPerp, 3.56, 5.96, true);
    for (const sv of [-1, +1]) {
      const ax = landX + rPerp[0] * sv * 2.91;
      const az = landZ + rPerp[2] * sv * 2.91;
      glassB.addBeamFrame([ax, 2.02, az], [ax, 2.96, az], rOut, rPerp, 2.45, 0.08, false);
      for (const uM of [-0.82, 0.00, +0.82]) {
        ironB.addBeamFrame([ax + rOut[0] * uM, 1.60, az + rOut[2] * uM], [ax + rOut[0] * uM, 3.02, az + rOut[2] * uM], rOut, rPerp, 0.12, 0.14, false);
      }
    }

    builtPieces.push(
      pb.finalize(THREE, {
        id: `z1_${pier.id}_rdc_pavilion`,
        label: `${pier.name} — Pavillon vitré RdC, guichets des billets, annexes W.C. & bordures du parvis (0.00 m .. +5.82 m)`,
        phase: 8,
        span: [8.60 + dt, 9.15 + dt],
        photoRefs: ['36', '38', '18'],
      })
    );
  }

  return builtPieces;
}

// ============================================================================
// Sub-System 3: 16 Cast-Steel `Sabots` & `Contre-Sabots` (`Phase 1 [1.00, 1.35]`)
// ============================================================================

function buildPierSabotsPiece(THREE, mats, pier) {
  const dt = pier.phaseOffset;
  const pb = new PieceBuilder();
  const castB = pb.bucket(mats.ironCast);
  const primB = pb.bucket(mats.ironPrimary);
  const latB = pb.bucket(mats.ironLattice);

  const tAxis = pierUnitAxis(pier);
  const rOut = [pier.sx * Math.SQRT1_2, 0, pier.sz * Math.SQRT1_2];
  const rPerp = [-pier.sx * Math.SQRT1_2, 0, pier.sz * Math.SQRT1_2];
  const rThrustOut = norm3(sub3(rOut, scale3(tAxis, dot3(rOut, tAxis))));
  const uAxis = norm3(sub3([pier.sx, 0, 0], scale3(tAxis, pier.sx * tAxis[0])));
  const vAxis = norm3(cross3(tAxis, uAxis));

  for (const [ox, oz] of [[-7.5, -7.5], [+7.5, -7.5], [-7.5, +7.5], [+7.5, +7.5]]) {
    const pinPt = pierPoint(pier, Y_SHOE_PIN, ox, oz);
    const bearFace = add3(pinPt, scale3(tAxis, -0.42));
    const plateTop = add3(pinPt, scale3(tAxis, -0.20));
    const pistonTop = add3(pinPt, scale3(tAxis, +0.18));
    const sabotTop = add3(pinPt, scale3(tAxis, +0.74));

    const extX = ox > 0 ? 0.34 : 0.0;
    const extZ = oz > 0 ? 0.34 : 0.0;
    const outCollarOff = add3([pier.sx * extX * 0.5, 0, 0], [0, 0, pier.sz * extZ * 0.5]);

    // 1. Octagonal cast-iron `contre-sabot` base collar (`r = 1.04 m`) + outward toe flange lip (Pl. 03 Fig. 9, Photo 09)
    castB.addPolygonPrism(
      add3(bearFace, scale3(outCollarOff, 0.55)),
      add3(plateTop, scale3(outCollarOff, 0.55)),
      rThrustOut,
      rPerp,
      1.08,
      1.02,
      8,
      Math.PI / 8
    );

    // 2. Twin prominent lateral cast-iron anchor-bolt flange ears (`oreilles d'ancrage`, Pl. 63 & Photo 09)
    // projecting along ±rPerp (`±1.24 m`) with cylindrical bolt-boss sleeves, heavy washers, Ø0.11 m bolts & tall hex nuts!
    castB.addBeamFrame(bearFace, add3(plateTop, scale3(tAxis, 0.04)), rThrustOut, rPerp, 0.78, 2.48, true);
    for (const sEar of [-1, +1]) {
      const earPt = add3(bearFace, scale3(rPerp, sEar * 0.98));
      const bossTop = add3(earPt, scale3(tAxis, 0.50));
      // Cylindrical cast-iron anchor-bolt boss housing + stiffening web gusset back to `sabot` body
      castB.addPolygonPrism(earPt, bossTop, rThrustOut, rPerp, 0.22, 0.19, 10, 0);
      castB.addBeam(
        add3(plateTop, scale3(rPerp, sEar * 0.62)),
        add3(sabotTop, scale3(rPerp, sEar * 0.50)),
        0.16,
        0.52,
        rThrustOut,
        true
      );
      // Square washer bearing plate (`plaque de serrage`) + tall hexagonal nut (`écrou six-pans`) + threaded bolt tip
      const washTop = add3(bossTop, scale3(tAxis, 0.07));
      primB.addBeamFrame(bossTop, washTop, rThrustOut, rPerp, 0.36, 0.36, true);
      const nutTop = add3(washTop, scale3(tAxis, 0.16));
      latB.addPolygonPrism(washTop, nutTop, rThrustOut, rPerp, 0.145, 0.145, 6, 0);
      primB.addPolygonPrism(nutTop, add3(nutTop, scale3(tAxis, 0.16)), rThrustOut, rPerp, 0.065, 0.062, 8, 0);
    }

    // 3. Cylindrical machined `contre-sabot` piston (`Ø 1.24 m`, housing 800-ton hydraulic press ram)
    castB.addPolygonPrism(plateTop, pistonTop, rThrustOut, rPerp, 0.66, 0.62, 12, 0);

    // 4. Flared cast-steel `sabot` socket sleeve receiving the reinforced lower `arbalétrier` (Pl. 03 Figs. 9 & 30)
    castB.addPolygonPrism(
      add3(pinPt, scale3(tAxis, +0.02)),
      add3(pinPt, scale3(tAxis, +0.38)),
      uAxis,
      vAxis,
      0.86,
      0.74,
      8,
      Math.PI / 8
    );
    castB.addBeamFrame(
      add3(add3(pinPt, scale3(tAxis, +0.30)), outCollarOff),
      add3(sabotTop, outCollarOff),
      uAxis,
      vAxis,
      0.96 + extX,
      0.96 + extZ,
      true
    );

    // 5. 8 radial stiffening gusset ribs (`nervures`) + recessed 800t hydraulic press jacking niche (`niche de vérin`, Photo 09)
    for (let k = 0; k < 8; k++) {
      const ang = (k / 8) * Math.PI * 2;
      const dir = add3(scale3(rThrustOut, Math.cos(ang)), scale3(rPerp, Math.sin(ang)));
      const nBase = add3(plateTop, scale3(dir, 0.82));
      const nTop = add3(sabotTop, scale3(dir, 0.54));
      castB.addBeam(nBase, nTop, 0.10, 0.24, tAxis, true);
    }
    // Framed 800-ton hydraulic press jacking niche on the outward thrust face (`Photo 09`)
    for (const sJ of [-0.26, +0.26]) {
      const jBase = add3(bearFace, add3(scale3(rThrustOut, 0.92), scale3(rPerp, sJ)));
      const jTop = add3(jBase, scale3(tAxis, 0.56));
      primB.addBeamFrame(jBase, jTop, rThrustOut, rPerp, 0.22, 0.09, true);
    }
    const jLintel0 = add3(bearFace, add3(scale3(rThrustOut, 0.92), scale3(tAxis, 0.50)));
    primB.addBeamFrame(jLintel0, add3(jLintel0, scale3(tAxis, 0.10)), rThrustOut, rPerp, 0.24, 0.62, true);

    // 6. Riveted starter collar (`collier d'amorce`) + flange ring transitioning into reinforced `arbalétrier`
    primB.addBeamFrame(
      add3(sabotTop, outCollarOff),
      add3(add3(pinPt, scale3(tAxis, +0.92)), outCollarOff),
      uAxis,
      vAxis,
      0.88 + extX,
      0.88 + extZ,
      true
    );
    latB.addBeamFrame(
      add3(add3(pinPt, scale3(tAxis, +0.70)), outCollarOff),
      add3(add3(pinPt, scale3(tAxis, +0.82)), outCollarOff),
      uAxis,
      vAxis,
      0.98 + extX,
      0.98 + extZ,
      true
    );
  }

  return pb.finalize(THREE, {
    id: `z1_${pier.id}_sabots`,
    label: `${pier.name} — 4 Sabots & contre-sabots en acier coulé, boulons & niches de vérins 800 t (+2.50 m)`,
    phase: 1,
    span: [1.00 + dt * 1.5, 1.29 + dt],
    photoRefs: ['09', '36'],
  });
}

// ============================================================================
// Sub-System 4: 4 Inclined Quadrilateral Lattice Piers (`+2.50 m .. +57.63 m`)
// ============================================================================

/**
 * Helper to obtain the 4 faces of a pier at any elevation `y`:
 * Each face is defined by its left corner `(ox0, oz0)`, right corner `(ox1, oz1)`,
 * outward horizontal normal `faceNormal`, and `isInteriorPortal` (true for the 2 faces
 * facing across the arches toward adjacent piers, which carry raised `Entretoise inférieure B`!).
 */
function getPierFaces(pier) {
  // Corners in pier-local (ox, oz):
  //   A  = (-7.5, -7.5) [inner corner toward (0,0)]
  //   Bx = (+7.5, -7.5) [outer along sx, inner along sz]
  //   Dz = (-7.5, +7.5) [inner along sx, outer along sz]
  //   C  = (+7.5, +7.5) [outer corner]
  return [
    {
      name: 'ext_x',
      c0: [+7.5, -7.5], // Bx
      c1: [+7.5, +7.5], // C
      normal: [pier.sx, 0, 0],
      isInteriorPortal: false, // Exterior tower facade!
    },
    {
      name: 'ext_z',
      c0: [-7.5, +7.5], // Dz
      c1: [+7.5, +7.5], // C
      normal: [0, 0, pier.sz],
      isInteriorPortal: false, // Exterior tower facade!
    },
    {
      name: 'int_x',
      c0: [-7.5, -7.5], // A
      c1: [-7.5, +7.5], // Dz
      normal: [-pier.sx, 0, 0],
      isInteriorPortal: true,  // Interior arch-facing face (`Entretoise inférieure B`, Pl. 66 Fig. 5)!
    },
    {
      name: 'int_z',
      c0: [-7.5, -7.5], // A
      c1: [+7.5, -7.5], // Bx
      normal: [0, 0, -pier.sz],
      isInteriorPortal: true,  // Interior arch-facing face (`Entretoise inférieure B`, Pl. 66 Fig. 5)!
    },
  ];
}

/**
 * Add twin-plane riveted trapezoidal nodal gusset plates (`Goussets A–H`, Pl. 03 Figs. 8, 10–17; Photo 09)
 * flush with the front & back web planes (`±planeHalfDepth` along `faceNormal`) of the open-laced box trusses
 * so they project cleanly out of the `arbalétrier` side faces and carry proud riveted edge stiffeners.
 */
function addFaceGusset(primaryB, centerPt, dirA, dirB, faceNormal, sizeA = 1.25, sizeB = 1.15, planeHalfDepth = 0.265) {
  const p0 = sub3(centerPt, add3(scale3(dirA, 0.18), scale3(dirB, 0.16)));
  const p1 = add3(centerPt, scale3(dirA, sizeA));
  const p1b = add3(p1, scale3(dirB, sizeB * 0.34));
  const p2b = add3(centerPt, add3(scale3(dirA, sizeA * 0.34), scale3(dirB, sizeB)));
  const p3 = add3(centerPt, scale3(dirB, sizeB));
  const basePoly = [p0, p1, p1b, p2b, p3];
  for (const sN of [-1, +1]) {
    const off = scale3(faceNormal, sN * planeHalfDepth);
    primaryB.addPlatePolygon(
      basePoly.map((pt) => add3(pt, off)),
      faceNormal,
      0.032
    );
    // Proud beveled gusset hypotenuse stiffener bar (`cornière de bordure`)
    primaryB.addBeam(add3(p1b, off), add3(p2b, off), 0.048, 0.065, faceNormal, false);
  }
}

/**
 * Add internal horizontal diaphragm cross-bracing (`Entretoise diagonale horizontale`, Pl. 03 Figs. 36–37, Photo 51)
 * at elevation `y`, framing around a clear central octagon/passage so the diagonal Otis/Combaluzier
 * elevator tracks and spiral service stair pass unobstructed!
 */
function addInternalHorizontalDiaphragm(primaryB, latticeB, pier, y) {
  const cA = pierPoint(pier, y, -7.5, -7.5);
  const cBx = pierPoint(pier, y, +7.5, -7.5);
  const cC = pierPoint(pier, y, +7.5, +7.5);
  const cDz = pierPoint(pier, y, -7.5, +7.5);

  const m0 = lerp3(cA, cBx, 0.5);
  const m1 = lerp3(cBx, cC, 0.5);
  const m2 = lerp3(cC, cDz, 0.5);
  const m3 = lerp3(cDz, cA, 0.5);
  const up = [0, 1, 0];

  // Diamond collar beams tying midpoints of the 4 `Entretoises` (leaves central 10.6m diagonal clear for elevators!)
  for (const [pa, pb] of [[m0, m1], [m1, m2], [m2, m3], [m3, m0]]) {
    addOpenLacedBoxMember(primaryB, latticeB, pa, pb, up, 0.44, 0.42, {
      chordW: 0.07,
      pitch: 0.95,
      laceDepth: false,
    });
  }

  // Twin parallel transverse tie girders flanking the diagonal elevator shaft (Pl. 03 Fig. 37)
  for (const t of [0.24, 0.76]) {
    const q0 = lerp3(cA, cDz, t);
    const q1 = lerp3(cBx, cC, t);
    primaryB.addBeam(q0, q1, 0.26, 0.34, up, false);
  }
}

function buildPierTierPiece(THREE, mats, pier, tierSpec) {
  const dt = pier.phaseOffset * 0.85;
  const pb = new PieceBuilder();
  const primB = pb.bucket(mats.ironPrimary);
  const latB = pb.bucket(mats.ironLattice);
  const p3WebTag = pier.id === 'p3' ? { isPier3FaceWeb: true } : null;
  const webPrimB = p3WebTag ? pb.bucket(mats.ironPrimary, p3WebTag) : primB;
  const webLatB = p3WebTag ? pb.bucket(mats.ironLattice, p3WebTag) : latB;

  const { y0, y1, panelY0, panelY1, half } = tierSpec;
  const faces = getPierFaces(pier);

  // 1. 4 Inclined 0.82 m × 0.82 m Box-Chord `Arbalétriers` across [y0 .. y1]
  if (tierSpec.hasArbaletriers !== false) {
    for (const [ox, oz] of [[-7.5, -7.5], [+7.5, -7.5], [-7.5, +7.5], [+7.5, +7.5]]) {
      addArbaletrierSegment(primB, latB, pier, ox, oz, y0, y1, half === 'upper' || half === 'p4_upper');
    }
  }

  // 2. Tier 1 Base Truss: `Entretoise inférieure A` (exterior faces, Pl. 03 Fig. 9: Y = +3.72 m .. +6.90 m) &
  //    `Entretoise inférieure B` (raised portal on interior faces, Pl. 66 Fig. 5, Photo 09: Y = +4.95 m .. +6.90 m)
  //    Split sequentially into `amorces` (bottom chord + knee-brackets + lower gussets at step 1.50) and
  //    `web` (6.90 m top chord + central spine + 4-bay Saint-André X-web + upper gussets after Photo 09).
  if (tierSpec.baseStrutPart || tierSpec.hasBaseStrut) {
    const buildLowerAmorces = tierSpec.baseStrutPart === 'amorces' || Boolean(tierSpec.hasBaseStrut);
    const buildUpperWeb = tierSpec.baseStrutPart === 'web' || Boolean(tierSpec.hasBaseStrut);

    for (const f of faces) {
      const yBotStrut = f.isInteriorPortal ? 4.95 : 3.72;
      const yTopStrut = 6.90; // Exact 40.40 NGF bottom of Panneau 1 (Pl. 03 Fig. 9 & Pl. 66 Fig. 1)

      const b0 = pierPoint(pier, yBotStrut, f.c0[0], f.c0[1]);
      const b1 = pierPoint(pier, yBotStrut, f.c1[0], f.c1[1]);
      const t0 = pierPoint(pier, yTopStrut, f.c0[0], f.c0[1]);
      const t1 = pierPoint(pier, yTopStrut, f.c1[0], f.c1[1]);

      const hDirTop = norm3(sub3(t1, t0));
      const hDirBot = norm3(sub3(b1, b0));
      const upDirL = norm3(sub3(t0, b0));
      const upDirR = norm3(sub3(t1, b1));

      if (buildLowerAmorces) {
        // Bottom chord (`3.72 m` exterior / `4.95 m` interior portal) erected with starter amorces (Photo 09)
        addOpenLacedBoxMember(primB, latB, b0, b1, f.normal, 0.48, 0.56, { pitch: 0.85 });

        // Curved portal knee-brackets (`consoles d'angle`) under Entretoise inférieure B (Pl. 66 Fig. 5, Photo 09 left)
        if (f.isInteriorPortal) {
          const kL0 = pierPoint(pier, 3.72, f.c0[0], f.c0[1]);
          const kR0 = pierPoint(pier, 3.72, f.c1[0], f.c1[1]);
          primB.addBeam(kL0, lerp3(b0, b1, 0.16), 0.24, 0.44, f.normal, true);
          primB.addBeam(kR0, lerp3(b0, b1, 0.84), 0.24, 0.44, f.normal, true);
          latB.addBeam(lerp3(kL0, b0, 0.48), lerp3(b0, b1, 0.085), 0.14, 0.34, f.normal, false);
          latB.addBeam(lerp3(kR0, b1, 0.48), lerp3(b0, b1, 0.915), 0.14, 0.34, f.normal, false);
        }

        // Bottom corner riveted gussets (`Gousset h`, Photo 09 & Pl. 03 Fig. 9)
        addFaceGusset(primB, b0, hDirBot, upDirL, f.normal, 1.42, 1.15, 0.27);
        addFaceGusset(primB, b1, scale3(hDirBot, -1), upDirR, f.normal, 1.42, 1.15, 0.27);
      }

      if (buildUpperWeb) {
        // 6.90 m top perimeter chord (untagged) + central inclined spine (`Entretoise longitudinale`, u = 0.50)
        addOpenLacedBoxMember(primB, latB, t0, t1, f.normal, 0.54, 0.62, { pitch: 0.85 });
        addOpenLacedBoxMember(webPrimB, webLatB, lerp3(b0, b1, 0.5), lerp3(t0, t1, 0.5), f.normal, 0.44, 0.48, { pitch: 0.90 });

        // 4-bay double-diagonal St. Andrew's X-cross web (`nSub = 4`, Pl. 03 Fig. 9, Pl. 66 Fig. 1)
        const nSub = 4;
        for (let i = 0; i < nSub; i++) {
          const uA = i / nSub;
          const uB = (i + 1) / nSub;
          const pbA = lerp3(b0, b1, uA);
          const pbB = lerp3(b0, b1, uB);
          const ptA = lerp3(t0, t1, uA);
          const ptB = lerp3(t0, t1, uB);

          addOpenLacedBoxMember(webPrimB, webLatB, pbA, ptB, f.normal, 0.30, 0.44, { pitch: 0.78, laceDepth: false });
          addOpenLacedBoxMember(webPrimB, webLatB, ptA, pbB, f.normal, 0.30, 0.44, { pitch: 0.78, laceDepth: false });
        }

        // Top corner riveted gusset plates (`Goussets C, D`, Pl. 03 Fig. 9)
        addFaceGusset(webPrimB, t0, hDirTop, scale3(upDirL, -1), f.normal, 1.48, 1.25, 0.29);
        addFaceGusset(webPrimB, t1, scale3(hDirTop, -1), scale3(upDirR, -1), f.normal, 1.48, 1.25, 0.29);
      }
    }
  }

  // 3. Face Bracing for Open Truss Panels `Panneaux 1, 2, 3` (`half === 'lower' | 'upper'`)
  if (half === 'lower' || half === 'upper') {
    const ya = tierSpec.hasBaseStrut ? panelY0 : y0;
    const yb = y1;
    const yMid = 0.5 * (panelY0 + panelY1);

    for (const f of faces) {
      // Full-panel corner points for exact St. Andrew's X-cross trajectory
      const pBL = pierPoint(pier, panelY0, f.c0[0], f.c0[1]);
      const pBR = pierPoint(pier, panelY0, f.c1[0], f.c1[1]);
      const pTL = pierPoint(pier, panelY1, f.c0[0], f.c0[1]);
      const pTR = pierPoint(pier, panelY1, f.c1[0], f.c1[1]);
      const pXCenter = pierPoint(pier, yMid, 0.5 * (f.c0[0] + f.c1[0]), 0.5 * (f.c0[1] + f.c1[1]));

      // Central inclined longitudinal spine (`Entretoise longitudinale`, Pl. 03 Fig. 8 & Fig. 18, Pl. 66 Fig. 1)
      const sBot = pierPoint(pier, ya, 0.5 * (f.c0[0] + f.c1[0]), 0.5 * (f.c0[1] + f.c1[1]));
      const sTop = pierPoint(pier, yb, 0.5 * (f.c0[0] + f.c1[0]), 0.5 * (f.c0[1] + f.c1[1]));
      addOpenLacedBoxMember(webPrimB, webLatB, sBot, sTop, f.normal, 0.46, 0.48, { pitch: 1.10 });

      // St. Andrew's X-diagonals (`Croix de Saint-André`, Pl. 03 Fig. 8) split cleanly at X-center
      if (half === 'lower') {
        addOpenLacedBoxMember(webPrimB, webLatB, pBL, pXCenter, f.normal, 0.50, 0.50, { pitch: 1.12 });
        addOpenLacedBoxMember(webPrimB, webLatB, pBR, pXCenter, f.normal, 0.50, 0.50, { pitch: 1.12 });

        // Corner gussets at bottom of panel + central X-crossing gusset (`Pl. 03 Fig. 8 & Fig. 29`)
        const hDir = norm3(sub3(pBR, pBL));
        const dL = norm3(sub3(pXCenter, pBL));
        const dR = norm3(sub3(pXCenter, pBR));
        addFaceGusset(webPrimB, pBL, hDir, dL, f.normal, 1.42, 1.55, 0.26);
        addFaceGusset(webPrimB, pBR, scale3(hDir, -1), dR, f.normal, 1.42, 1.55, 0.26);
        // Central diamond gusset plate at X-node
        addFaceGusset(webPrimB, pXCenter, scale3(dL, -1), scale3(dR, -1), f.normal, 1.25, 1.25, 0.26);
        addFaceGusset(webPrimB, pXCenter, dL, dR, f.normal, 1.25, 1.25, 0.26);
      } else {
        addOpenLacedBoxMember(webPrimB, webLatB, pXCenter, pTL, f.normal, 0.50, 0.50, { pitch: 1.12 });
        addOpenLacedBoxMember(webPrimB, webLatB, pXCenter, pTR, f.normal, 0.50, 0.50, { pitch: 1.12 });

        const hDir = norm3(sub3(pTR, pTL));
        const dL = norm3(sub3(pXCenter, pTL));
        const dR = norm3(sub3(pXCenter, pTR));
        addFaceGusset(webPrimB, pTL, hDir, dL, f.normal, 1.42, 1.55, 0.28);
        addFaceGusset(webPrimB, pTR, scale3(hDir, -1), dR, f.normal, 1.42, 1.55, 0.28);
      }

      // Top Horizontal Perimeter Box-Strut (`Entretoise intermédiaire` or `Entretoise courante`) + end node gussets
      if (tierSpec.hasTopStrut) {
        const e0 = pierPoint(pier, yb, f.c0[0], f.c0[1]);
        const e1 = pierPoint(pier, yb, f.c1[0], f.c1[1]);
        const strutFaceH = tierSpec.topStrutType === 'main' ? 0.64 : 0.50;
        const strutDepth = tierSpec.topStrutType === 'main' ? 0.60 : 0.48;
        addOpenLacedBoxMember(primB, latB, e0, e1, f.normal, strutFaceH, strutDepth, { pitch: 1.12 });
        if (tierSpec.topStrutType === 'interm') {
          const hInterm = norm3(sub3(e1, e0));
          const trunkUpL = norm3(sub3(pTL, pBL));
          const trunkUpR = norm3(sub3(pTR, pBR));
          addFaceGusset(primB, e0, hInterm, scale3(trunkUpL, -1), f.normal, 1.20, 0.95, 0.25);
          addFaceGusset(primB, e1, scale3(hInterm, -1), scale3(trunkUpR, -1), f.normal, 1.20, 0.95, 0.25);
        }
      }
    }
  }

  // 4. Tier 7 & Tier 8: `Panneau 4` (`38.85 m .. 50.33 m` — Lower Band + 7.00 m `Poutre de l'Arc` & `Masque`)
  //    Matches Pl. 20 Fig. 1, Pl. 66 Fig. 1, and Pl. 66 Fig. 6!
  if (half === 'p4_lower') {
    const ySubStrut = 41.05; // Lower frieze rail of Masque (Pl. 66 Fig. 6: 2.256m band)
    for (const f of faces) {
      const b0 = pierPoint(pier, y0, f.c0[0], f.c0[1]);
      const b1 = pierPoint(pier, y0, f.c1[0], f.c1[1]);
      const m0 = pierPoint(pier, ySubStrut, f.c0[0], f.c0[1]);
      const m1 = pierPoint(pier, ySubStrut, f.c1[0], f.c1[1]);
      const t0 = pierPoint(pier, y1, f.c0[0], f.c0[1]);
      const t1 = pierPoint(pier, y1, f.c1[0], f.c1[1]);

      // Primary structural X-cross lower legs (running from 38.85 toward center at 44.59)
      const pXCenter = pierPoint(pier, 44.59, 0.5 * (f.c0[0] + f.c1[0]), 0.5 * (f.c0[1] + f.c1[1]));
      const clipT = (y1 - y0) / (44.59 - y0);
      addOpenLacedBoxMember(webPrimB, webLatB, b0, lerp3(b0, pXCenter, clipT), f.normal, 0.48, 0.48, { pitch: 1.05 });
      addOpenLacedBoxMember(webPrimB, webLatB, b1, lerp3(b1, pXCenter, clipT), f.normal, 0.48, 0.48, { pitch: 1.05 });

      const hDirB = norm3(sub3(b1, b0));
      addFaceGusset(webPrimB, b0, hDirB, norm3(sub3(pXCenter, b0)), f.normal, 1.38, 1.45, 0.26);
      addFaceGusset(webPrimB, b1, scale3(hDirB, -1), norm3(sub3(pXCenter, b1)), f.normal, 1.38, 1.45, 0.26);
      const hDirT = norm3(sub3(t1, t0));
      addFaceGusset(webPrimB, t0, hDirT, norm3(sub3(b0, t0)), f.normal, 1.35, 1.15, 0.29);
      addFaceGusset(webPrimB, t1, scale3(hDirT, -1), norm3(sub3(b1, t1)), f.normal, 1.35, 1.15, 0.29);

      // Central inclined spine
      const s0 = lerp3(b0, b1, 0.5);
      const s1 = lerp3(t0, t1, 0.5);
      addOpenLacedBoxMember(webPrimB, webLatB, s0, s1, f.normal, 0.44, 0.46, { pitch: 1.05 });

      // Sub-strut at 41.05m & Poutre de l'Arc soffit perimeter strut at 43.33m + dense diagonal trellis (Pl. 66 Fig. 6)
      addOpenLacedBoxMember(webPrimB, webLatB, m0, m1, f.normal, 0.42, 0.46, { pitch: 1.05 });
      addOpenLacedBoxMember(primB, latB, t0, t1, f.normal, 0.66, 0.62, { pitch: 1.05 });

      const nFrieze = 6;
      for (let i = 0; i < nFrieze; i++) {
        const uA = i / nFrieze, uB = (i + 1) / nFrieze;
        webLatB.addBeam(lerp3(m0, m1, uA), lerp3(t0, t1, uB), 0.14, 0.24, f.normal, false);
        webLatB.addBeam(lerp3(m0, m1, uB), lerp3(t0, t1, uA), 0.14, 0.24, f.normal, false);
      }
    }
  }

  if (half === 'p4_upper') {
    // 7.00 m deep `Poutre de l'Arc` pier section (Y = 43.33 m .. 50.33 m):
    // Matches `Pl. 20 Fig. 1` (true-vertical girder web posts + X-diagonals) & `Pl. 66 Fig. 6` (`Masque placé sur le Panneau 4`)!
    for (const f of faces) {
      const b0 = pierPoint(pier, y0, f.c0[0], f.c0[1]);
      const b1 = pierPoint(pier, y0, f.c1[0], f.c1[1]);
      const t0 = pierPoint(pier, y1, f.c0[0], f.c0[1]);
      const t1 = pierPoint(pier, y1, f.c1[0], f.c1[1]);

      // Top horizontal girder chord at Y = 50.33 m (`Semelle inférieure de la Grande Poutre` — perimeter ring untagged)
      addOpenLacedBoxMember(primB, latB, t0, t1, f.normal, 0.72, 0.68, { pitch: 1.02 });

      // Mid-height horizontal tie at Y = 46.83 m
      const m0 = pierPoint(pier, 0.5 * (y0 + y1), f.c0[0], f.c0[1]);
      const m1 = pierPoint(pier, 0.5 * (y0 + y1), f.c1[0], f.c1[1]);
      addOpenLacedBoxMember(webPrimB, webLatB, m0, m1, f.normal, 0.40, 0.44, { pitch: 1.05 });

      // Primary behind-masque structural diagonals completing Panneau 4 X-cross
      const pXCenter = pierPoint(pier, 44.59, 0.5 * (f.c0[0] + f.c1[0]), 0.5 * (f.c0[1] + f.c1[1]));
      addOpenLacedBoxMember(webPrimB, webLatB, pXCenter, t0, f.normal, 0.46, 0.46, { pitch: 1.05 });
      addOpenLacedBoxMember(webPrimB, webLatB, pXCenter, t1, f.normal, 0.46, 0.46, { pitch: 1.05 });

      // 4-sub-bay `Masque` framing (`Pl. 66 Fig. 6`)
      const nBays = 4;
      for (let i = 0; i <= nBays; i++) {
        const u = i / nBays;
        const pbPt = lerp3(b0, b1, u);
        const ptPt = lerp3(t0, t1, u);
        if (i > 0 && i < nBays) {
          webPrimB.addBeam(pbPt, ptPt, 0.24, 0.32, f.normal, false);
        }
        if (i < nBays) {
          const uNext = (i + 1) / nBays;
          const pbN = lerp3(b0, b1, uNext);
          const ptN = lerp3(t0, t1, uNext);
          webLatB.addBeam(pbPt, ptN, 0.20, 0.28, f.normal, false);
          webLatB.addBeam(ptPt, pbN, 0.20, 0.28, f.normal, false);
        }
      }

      // True-vertical internal girder web posts (`Pl. 20 Fig. 1`: vertical along span coordinate inside pier overlap!)
      const hSpan = norm3(sub3(b1, b0)); // horizontal unit vector along face
      for (const sOff of [-3.60, 0.00, +3.60]) {
        const topMid = lerp3(t0, t1, 0.5);
        const botMid = lerp3(b0, b1, 0.5);
        // Project top point vertically down along face plane (same span coordinate as topMid + sOff*hSpan!)
        const spanShift = dot3(sub3(topMid, botMid), hSpan) + sOff;
        if (Math.abs(spanShift) < 6.8) {
          const vTop = add3(topMid, scale3(hSpan, sOff));
          const vBot = add3(botMid, scale3(hSpan, spanShift));
          webPrimB.addBeam(vBot, vTop, 0.22, 0.28, f.normal, false);
        }
      }

      const hDir = norm3(sub3(t1, t0));
      const dDirL = norm3(sub3(b0, t0));
      const dDirR = norm3(sub3(b1, t1));
      addFaceGusset(webPrimB, t0, hDir, dDirL, f.normal, 1.38, 1.35, 0.31);
      addFaceGusset(webPrimB, t1, scale3(hDir, -1), dDirR, f.normal, 1.38, 1.35, 0.31);
      const hDirB = norm3(sub3(b1, b0));
      addFaceGusset(webPrimB, b0, hDirB, scale3(dDirL, -1), f.normal, 1.30, 1.15, 0.29);
      addFaceGusset(webPrimB, b1, scale3(hDirB, -1), scale3(dDirR, -1), f.normal, 1.30, 1.15, 0.29);
    }
  }

  // 5. Tier 9: `Panneau 5` (`50.33 m .. 57.63 m` — 7.30 m 1st-Floor `Grande Poutre` Pier-Corner Box Frame)
  //    Top flange sits strictly flush at Y = +57.630 m (91.13 NGF) with 0.000 m vertical overhang!
  if (half === 'p5_girder') {
    const yTopChordCtr = y1 - 0.365; // 57.265 m -> top flange of 0.72 m chord is at 57.625 m (flush <= 57.630 m!)
    for (const f of faces) {
      const b0 = pierPoint(pier, y0, f.c0[0], f.c0[1]);
      const b1 = pierPoint(pier, y0, f.c1[0], f.c1[1]);
      const p0 = pierPoint(pier, Y_PROMENADE_F1, f.c0[0], f.c0[1]);
      const p1 = pierPoint(pier, Y_PROMENADE_F1, f.c1[0], f.c1[1]);
      const t0c = pierPoint(pier, yTopChordCtr, f.c0[0], f.c0[1]);
      const t1c = pierPoint(pier, yTopChordCtr, f.c1[0], f.c1[1]);

      // Promenade sub-chord at Y = 56.40 m (89.90 NGF) & Main 1st-Floor Deck Girder Chord flush with Y = 57.63 m (91.13 NGF)
      addOpenLacedBoxMember(primB, latB, p0, p1, f.normal, 0.46, 0.52, { pitch: 0.98 });
      addOpenLacedBoxMember(primB, latB, t0c, t1c, f.normal, 0.72, 0.72, { pitch: 0.96 });

      // 4 sub-bays with posts & diamond St. Andrew's X-diagonals (`Pl. 66 Fig. 1`, `Photo 23`, `Photo 51`)
      const nBays = 4;
      for (let i = 0; i <= nBays; i++) {
        const u = i / nBays;
        const pbPt = lerp3(b0, b1, u);
        const ppPt = lerp3(p0, p1, u);
        const ptPt = lerp3(t0c, t1c, u);
        if (i > 0 && i < nBays) {
          addOpenLacedBoxMember(primB, latB, pbPt, ptPt, f.normal, 0.34, 0.42, { pitch: 0.96, laceDepth: false });
        }
        if (i < nBays) {
          const uN = (i + 1) / nBays;
          const pbN = lerp3(b0, b1, uN);
          const ppN = lerp3(p0, p1, uN);
          const ptN = lerp3(t0c, t1c, uN);
          addOpenLacedBoxMember(primB, latB, pbPt, ppN, f.normal, 0.32, 0.36, { pitch: 0.96, laceDepth: false });
          addOpenLacedBoxMember(primB, latB, ppPt, pbN, f.normal, 0.32, 0.36, { pitch: 0.96, laceDepth: false });
          // Upper deck curb bracing (89.90 -> 90.77 NGF)
          latB.addBeam(ppPt, ptN, 0.14, 0.22, f.normal, false);
          latB.addBeam(ptPt, ppN, 0.14, 0.22, f.normal, false);
        }
      }

      // True-vertical internal girder web posts (`Pl. 20 Fig. 1`)
      const hSpan = norm3(sub3(b1, b0));
      for (const sOff of [-3.60, 0.00, +3.60]) {
        const topMid = lerp3(t0c, t1c, 0.5);
        const botMid = lerp3(b0, b1, 0.5);
        const spanShift = dot3(sub3(topMid, botMid), hSpan) + sOff;
        if (Math.abs(spanShift) < 6.8) {
          const vTop = add3(topMid, scale3(hSpan, sOff));
          const vBot = add3(botMid, scale3(hSpan, spanShift));
          primB.addBeam(vBot, vTop, 0.22, 0.28, f.normal, false);
        }
      }

      // Corner gussets at bottom (50.33 m) and top (seated strictly below Y = 57.630 m)
      const g0 = pierPoint(pier, y1 - 0.42, f.c0[0], f.c0[1]);
      const g1 = pierPoint(pier, y1 - 0.42, f.c1[0], f.c1[1]);
      const hDir = norm3(sub3(g1, g0));
      const dDirL = norm3(sub3(b0, g0));
      const dDirR = norm3(sub3(b1, g1));
      addFaceGusset(primB, g0, hDir, dDirL, f.normal, 1.35, 1.22, 0.34);
      addFaceGusset(primB, g1, scale3(hDir, -1), dDirR, f.normal, 1.35, 1.22, 0.34);
      const hDirB = norm3(sub3(b1, b0));
      addFaceGusset(primB, b0, hDirB, scale3(dDirL, -1), f.normal, 1.32, 1.20, 0.32);
      addFaceGusset(primB, b1, scale3(hDirB, -1), scale3(dDirR, -1), f.normal, 1.32, 1.20, 0.32);
    }
  }

  // 6. Internal Horizontal Diaphragm Bracing Frame (`Entretoises diagonales horizontales`, Pl. 03 Figs. 36–37)
  if (tierSpec.hasDiaphragm) {
    const yDiaph = y1 >= Y_FLOOR1_DECK - 0.01 ? y1 - 0.34 : y1;
    addInternalHorizontalDiaphragm(primB, latB, pier, yDiaph);
  }

  return pb.finalize(THREE, {
    id: `z1_${pier.id}_${tierSpec.id}`,
    label: `${pier.name} — ${tierSpec.label} (+${y0.toFixed(2)} m .. +${y1.toFixed(2)} m)`,
    phase: tierSpec.phase,
    span: [
      Number((tierSpec.spanBase[0] + dt).toFixed(3)),
      Number((tierSpec.spanBase[1] + dt).toFixed(3)),
    ],
    photoRefs: tierSpec.photoRefs,
  });
}

// ============================================================================
// Public Zone Builder (`buildZone(ctx)`)
// ============================================================================

export function buildZone(ctx = {}) {
  const { THREE } = ctx;
  if (!THREE) {
    throw new Error('zone1_foundations_piers1.buildZone requires ctx.THREE');
  }

  const mats = resolveMaterials(THREE, ctx.materials);
  const group = new THREE.Group();
  group.name = 'zone1_foundations_piers1';

  const pieces = [];
  let totalVerts = 0;
  let totalTris = 0;
  let totalMeshes = 0;

  const registerBuilt = (res) => {
    group.add(res.piece.object3D);
    pieces.push(res.piece);
    totalVerts += res.vertCount;
    totalTris += res.triCount;
    totalMeshes += res.meshCount;
  };

  // 1. Substructure & Foundations (Phase 0, [0.00, 0.65])
  for (const pier of PIERS) {
    for (const res of buildPierSubstructurePieces(THREE, mats, pier)) {
      registerBuilt(res);
    }
  }

  // 2. Monumental Stone Plinths (`Soubassements`) & 16 Inclined `Sommiers` (Phase 0, [0.60, 1.00])
  for (const pier of PIERS) {
    for (const res of buildPierSoubassementPieces(THREE, mats, pier)) {
      registerBuilt(res);
    }
  }

  // 3. 16 Cast-Steel `Sabots` & `Contre-Sabots` (Phase 1, [1.00, 1.35])
  for (const pier of PIERS) {
    registerBuilt(buildPierSabotsPiece(THREE, mats, pier));
  }

  // 4. 4 Inclined Quadrilateral Lattice Piers (`+2.50 m .. +57.63 m`, Tiers 1..9 across Phase 1..3 [1.35, 3.30])
  for (const tierSpec of PIER_TIERS) {
    for (const pier of PIERS) {
      registerBuilt(buildPierTierPiece(THREE, mats, pier, tierSpec));
    }
  }

  // Cache canonical rest positions & scales on each piece's object3D for standalone or host timeline updates
  const restState = pieces.map((p) => ({
    piece: p,
    pos: p.object3D.position.clone(),
    scale: p.object3D.scale.clone(),
  }));

  function setConstructionState(globalStep = 11.0) {
    const step = Math.max(0.0, Math.min(11.0, Number(globalStep) || 0.0));
    for (const item of restState) {
      const { piece, pos, scale } = item;
      const obj = piece.object3D;
      const [t0, t1] = piece.span;
      if (step < t0) {
        obj.visible = false;
        continue;
      }
      if (piece.vanishSpan) {
        const [v0, v1] = piece.vanishSpan;
        if (step >= v1) {
          obj.visible = false;
          obj.position.copy(pos);
          obj.scale.copy(scale);
          continue;
        }
        if (step > v0) {
          const raw = Math.max(0, Math.min(1, (step - v0) / Math.max(1e-4, v1 - v0)));
          const q = raw * raw * (3 - 2 * raw);
          obj.visible = true;
          obj.position.set(pos.x, pos.y + q * 1.6, pos.z);
          obj.scale.copy(scale);
          continue;
        }
      }
      if (step < t1) {
        const raw = Math.max(0, Math.min(1, (step - t0) / Math.max(1e-4, t1 - t0)));
        const u = raw * raw * (3 - 2 * raw);
        // Zero radial shrinkage (`dr === 0.00 m`) and zero downward plunge (`dy >= 0.00 m`)
        const liftOffset = piece.phase === 0 ? (1.0 - u) * 0.18 : (1.0 - u) * 2.10;
        obj.visible = true;
        obj.position.set(pos.x, pos.y + liftOffset, pos.z);
        obj.scale.copy(scale);
      } else {
        obj.visible = true;
        obj.position.copy(pos);
        obj.scale.copy(scale);
      }
    }
  }

  const stats = {
    zoneId: 'zone1_foundations_piers1',
    pieceCount: pieces.length,
    meshCount: totalMeshes,
    vertexCount: totalVerts,
    triangleCount: totalTris,
    yRangeM: [Y_CAISSON_BOT_P1, Y_FLOOR1_DECK],
    pierCenterAtShoeM: PIER_XC_AT_SHOE,
    pierCenterAtFloor1M: Number(pierCenterAbs(Y_FLOOR1_DECK).toFixed(4)),
  };

  return {
    zoneId: 'zone1_foundations_piers1',
    group,
    pieces,
    setConstructionState,
    stats,
  };
}

export default buildZone;
