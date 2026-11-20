/**
 * Stage 2 — Zone 4: Unified Upper Square Shaft (Panneaux 19–29), Helical Spiral Staircase,
 * 3rd Platform (+276.13 m), Gustave Eiffel's Private Apartment (+278.71 m),
 * 4 Open Campanile Diagonal Arches, Sautter-Lemonnier Phare, Coupole,
 * 300.515 m Meteorological Terrace & +312.275 m "R.F." Tricolore Flagpole (May 1889 State).
 *
 * Owner: builder-summit
 * Primary References:
 *   - Plates: Pl. 65 Fig. 3 (1:200 P29 corbel, 3rd floor, Eiffel apartment, lower campanile),
 *             Pl. 59 Fig. 4 (1:200 campanile arches, phare, lanterne, coupole, 300.515m terrace, flagpole),
 *             Pl. 66 Figs. 3–4 (Panneaux 15–29 & 24.385m campanile rabattement),
 *             Pl. 53 Figs. 18–27 (all 7 summit horizontal framing plans),
 *             Pl. 08 Figs. 1–2 (diagonal shaft section & helical spiral stair),
 *             Pl. 55 Fig. 1 (master 1:1000 elevation to +312.275 m).
 *   - Photos: 01 (14 Sept 1888), 46 (26 Dec 1888), 16 (spiral stair), 35 (3rd-floor gallery),
 *             05 (Sautter-Lemonnier Fresnel lighthouse), 33 (31 March 1889 300m flag),
 *             44 (campanile engraving, excluding unbuilt balustrade spheres), 18 (May 1889 complete).
 */

const SQRT2 = Math.SQRT2;
const INV_SQRT2 = Math.SQRT1_2;

// Exact unified shaft taper from Pl. 70 Fig. 8 (18.500m at Y=179.0522m) to Pl. 65 Fig. 3 (10.000m at Y=264.8565m)
const Y_COLLAR_P17_18 = 179.0522;
const Y_INTERM_DECK = 195.93;
const Y_P28_TOP = 264.8565;
const HS_COLLAR = 9.25;
const HS_CORE_TOP = 5.0;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function shaftHalfSpan(y) {
  if (y >= Y_P28_TOP) return HS_CORE_TOP;
  if (y <= Y_COLLAR_P17_18) return HS_COLLAR;
  return HS_CORE_TOP + ((HS_COLLAR - HS_CORE_TOP) * (Y_P28_TOP - y)) / (Y_P28_TOP - Y_COLLAR_P17_18);
}

/**
 * Lightweight indexed BufferGeometry accumulator grouped by material key.
 */
class MeshBatch {
  constructor(initVerts = 512, initIdx = 1024) {
    this._vCap = initVerts;
    this._iCap = initIdx;
    this.vCount = 0;
    this.iCount = 0;
    this._pos = new Float32Array(initVerts * 3);
    this._norm = new Float32Array(initVerts * 3);
    this._uv = new Float32Array(initVerts * 2);
    this._idx = new Uint32Array(initIdx);
  }

  _ensureVerts(addV) {
    const need = this.vCount + addV;
    if (need <= this._vCap) return;
    let cap = this._vCap;
    while (cap < need) cap <<= 1;
    const np = new Float32Array(cap * 3);
    np.set(this._pos.subarray(0, this.vCount * 3));
    this._pos = np;
    const nn = new Float32Array(cap * 3);
    nn.set(this._norm.subarray(0, this.vCount * 3));
    this._norm = nn;
    const nu = new Float32Array(cap * 2);
    nu.set(this._uv.subarray(0, this.vCount * 2));
    this._uv = nu;
    this._vCap = cap;
  }

  _ensureIdx(addI) {
    const need = this.iCount + addI;
    if (need <= this._iCap) return;
    let cap = this._iCap;
    while (cap < need) cap <<= 1;
    const ni = new Uint32Array(cap);
    ni.set(this._idx.subarray(0, this.iCount));
    this._idx = ni;
    this._iCap = cap;
  }

  addQuadXYZ(x0, y0, z0, x1, y1, z1, x2, y2, z2, x3, y3, z3, u0 = 0, v0 = 0, u1 = 1, v1 = 1) {
    const ux = x1 - x0, uy = y1 - y0, uz = z1 - z0;
    const vx = x3 - x0, vy = y3 - y0, vz = z3 - z0;
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    const inv = 1 / len;
    nx *= inv; ny *= inv; nz *= inv;

    this._ensureVerts(4);
    this._ensureIdx(6);

    const base = this.vCount;
    const po = base * 3;
    const pos = this._pos;
    pos[po] = x0; pos[po + 1] = y0; pos[po + 2] = z0;
    pos[po + 3] = x1; pos[po + 4] = y1; pos[po + 5] = z1;
    pos[po + 6] = x2; pos[po + 7] = y2; pos[po + 8] = z2;
    pos[po + 9] = x3; pos[po + 10] = y3; pos[po + 11] = z3;

    const norm = this._norm;
    norm[po] = nx; norm[po + 1] = ny; norm[po + 2] = nz;
    norm[po + 3] = nx; norm[po + 4] = ny; norm[po + 5] = nz;
    norm[po + 6] = nx; norm[po + 7] = ny; norm[po + 8] = nz;
    norm[po + 9] = nx; norm[po + 10] = ny; norm[po + 11] = nz;

    const uo = base * 2;
    const uv = this._uv;
    uv[uo] = u0; uv[uo + 1] = v0;
    uv[uo + 2] = u1; uv[uo + 3] = v0;
    uv[uo + 4] = u1; uv[uo + 5] = v1;
    uv[uo + 6] = u0; uv[uo + 7] = v1;

    const io = this.iCount;
    const idx = this._idx;
    idx[io] = base; idx[io + 1] = base + 1; idx[io + 2] = base + 2;
    idx[io + 3] = base; idx[io + 4] = base + 2; idx[io + 5] = base + 3;

    this.vCount = base + 4;
    this.iCount = io + 6;
  }

  addQuad(p0, p1, p2, p3, u0 = 0, v0 = 0, u1 = 1, v1 = 1) {
    this.addQuadXYZ(
      p0[0], p0[1], p0[2],
      p1[0], p1[1], p1[2],
      p2[0], p2[1], p2[2],
      p3[0], p3[1], p3[2],
      u0, v0, u1, v1
    );
  }

  addTri(p0, p1, p2) {
    const x0 = p0[0], y0 = p0[1], z0 = p0[2];
    const x1 = p1[0], y1 = p1[1], z1 = p1[2];
    const x2 = p2[0], y2 = p2[1], z2 = p2[2];
    const ux = x1 - x0, uy = y1 - y0, uz = z1 - z0;
    const vx = x2 - x0, vy = y2 - y0, vz = z2 - z0;
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    const inv = 1 / len;
    nx *= inv; ny *= inv; nz *= inv;

    this._ensureVerts(3);
    this._ensureIdx(3);

    const base = this.vCount;
    const po = base * 3;
    const pos = this._pos;
    pos[po] = x0; pos[po + 1] = y0; pos[po + 2] = z0;
    pos[po + 3] = x1; pos[po + 4] = y1; pos[po + 5] = z1;
    pos[po + 6] = x2; pos[po + 7] = y2; pos[po + 8] = z2;

    const norm = this._norm;
    norm[po] = nx; norm[po + 1] = ny; norm[po + 2] = nz;
    norm[po + 3] = nx; norm[po + 4] = ny; norm[po + 5] = nz;
    norm[po + 6] = nx; norm[po + 7] = ny; norm[po + 8] = nz;

    const uo = base * 2;
    const uv = this._uv;
    uv[uo] = 0; uv[uo + 1] = 0;
    uv[uo + 2] = 1; uv[uo + 3] = 0;
    uv[uo + 4] = 0.5; uv[uo + 5] = 1;

    const io = this.iCount;
    const idx = this._idx;
    idx[io] = base; idx[io + 1] = base + 1; idx[io + 2] = base + 2;

    this.vCount = base + 3;
    this.iCount = io + 3;
  }

  /**
   * 3D rectangular prism strut from point A to point B with cross-section (wU x wV).
   */
  addStrut(a, b, wU, wV = wU, upHint = [0, 1, 0]) {
    const ax = a[0], ay = a[1], az = a[2];
    const bx = b[0], by = b[1], bz = b[2];
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 1e-5) return;
    const invLen = 1 / len;
    const tx = dx * invLen, ty = dy * invLen, tz = dz * invLen;

    let hx = upHint[0], hy = upHint[1], hz = upHint[2];
    if (Math.abs(tx * hx + ty * hy + tz * hz) > 0.94) {
      hx = 1; hy = 0; hz = 0;
      if (Math.abs(tx) > 0.9) { hx = 0; hy = 0; hz = 1; }
    }
    let ux = hy * tz - hz * ty;
    let uy = hz * tx - hx * tz;
    let uz = hx * ty - hy * tx;
    const uLen = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1;
    const invULen = 1 / uLen;
    ux *= invULen; uy *= invULen; uz *= invULen;

    const vx = ty * uz - tz * uy;
    const vy = tz * ux - tx * uz;
    const vz = tx * uy - ty * ux;

    const uxh = ux * (wU * 0.5), uyh = uy * (wU * 0.5), uzh = uz * (wU * 0.5);
    const vxh = vx * (wV * 0.5), vyh = vy * (wV * 0.5), vzh = vz * (wV * 0.5);

    const a0x = ax - uxh - vxh, a0y = ay - uyh - vyh, a0z = az - uzh - vzh;
    const a1x = ax + uxh - vxh, a1y = ay + uyh - vyh, a1z = az + uzh - vzh;
    const a2x = ax + uxh + vxh, a2y = ay + uyh + vyh, a2z = az + uzh + vzh;
    const a3x = ax - uxh + vxh, a3y = ay - uyh + vyh, a3z = az - uzh + vzh;

    const b0x = bx - uxh - vxh, b0y = by - uyh - vyh, b0z = bz - uzh - vzh;
    const b1x = bx + uxh - vxh, b1y = by + uyh - vyh, b1z = bz + uzh - vzh;
    const b2x = bx + uxh + vxh, b2y = by + uyh + vyh, b2z = bz + uzh + vzh;
    const b3x = bx - uxh + vxh, b3y = by - uyh + vyh, b3z = bz - uzh + vzh;

    this.addQuadXYZ(a0x, a0y, a0z, a1x, a1y, a1z, b1x, b1y, b1z, b0x, b0y, b0z);
    this.addQuadXYZ(a1x, a1y, a1z, a2x, a2y, a2z, b2x, b2y, b2z, b1x, b1y, b1z);
    this.addQuadXYZ(a2x, a2y, a2z, a3x, a3y, a3z, b3x, b3y, b3z, b2x, b2y, b2z);
    this.addQuadXYZ(a3x, a3y, a3z, a0x, a0y, a0z, b0x, b0y, b0z, b3x, b3y, b3z);
    this.addQuadXYZ(a3x, a3y, a3z, a2x, a2y, a2z, a1x, a1y, a1z, a0x, a0y, a0z);
    this.addQuadXYZ(b0x, b0y, b0z, b1x, b1y, b1z, b2x, b2y, b2z, b3x, b3y, b3z);
  }

  addAxisBox(cx, cy, cz, sx, sy, sz) {
    const x0 = cx - sx * 0.5, x1 = cx + sx * 0.5;
    const y0 = cy - sy * 0.5, y1 = cy + sy * 0.5;
    const z0 = cz - sz * 0.5, z1 = cz + sz * 0.5;
    this.addQuadXYZ(x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1);
    this.addQuadXYZ(x1, y0, z0, x0, y0, z0, x0, y1, z0, x1, y1, z0);
    this.addQuadXYZ(x1, y0, z1, x1, y0, z0, x1, y1, z0, x1, y1, z1);
    this.addQuadXYZ(x0, y0, z0, x0, y0, z1, x0, y1, z1, x0, y1, z0);
    this.addQuadXYZ(x0, y1, z1, x1, y1, z1, x1, y1, z0, x0, y1, z0);
    this.addQuadXYZ(x0, y0, z0, x1, y0, z0, x1, y0, z1, x0, y0, z1);
  }

  /**
   * Frustum / cylinder ring or capped tube centered at (cx, ., cz) from (y0, r0) to (y1, r1).
   */
  addFrustum(cx, cz, y0, r0, y1, r1, segs = 24, capBottom = false, capTop = false, wallThick = 0) {
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2;
      const a1 = ((i + 1) / segs) * Math.PI * 2;
      const c0 = Math.cos(a0), s0 = Math.sin(a0);
      const c1 = Math.cos(a1), s1 = Math.sin(a1);

      const p00 = [cx + c0 * r0, y0, cz + s0 * r0];
      const p10 = [cx + c1 * r0, y0, cz + s1 * r0];
      const p11 = [cx + c1 * r1, y1, cz + s1 * r1];
      const p01 = [cx + c0 * r1, y1, cz + s0 * r1];
      this.addQuad(p00, p01, p11, p10, i / segs, 0, (i + 1) / segs, 1);

      if (wallThick > 0 && r0 > wallThick && r1 > wallThick) {
        const ir0 = r0 - wallThick, ir1 = r1 - wallThick;
        const q00 = [cx + c0 * ir0, y0, cz + s0 * ir0];
        const q10 = [cx + c1 * ir0, y0, cz + s1 * ir0];
        const q11 = [cx + c1 * ir1, y1, cz + s1 * ir1];
        const q01 = [cx + c0 * ir1, y1, cz + s0 * ir1];
        this.addQuad(q00, q10, q11, q01);
        if (capTop) this.addQuad(q01, q11, p11, p01);
        if (capBottom) this.addQuad(p00, p10, q10, q00);
      } else {
        if (capTop && r1 > 1e-4) this.addTri([cx, y1, cz], p11, p01);
        if (capBottom && r0 > 1e-4) this.addTri([cx, y0, cz], p00, p10);
      }
    }
  }

  toBufferGeometry(THREE) {
    if (this.vCount === 0) return null;
    const geom = new THREE.BufferGeometry();
    const vc3 = this.vCount * 3;
    const vc2 = this.vCount * 2;
    geom.setAttribute('position', new THREE.BufferAttribute(this._pos.slice(0, vc3), 3));
    geom.setAttribute('normal', new THREE.BufferAttribute(this._norm.slice(0, vc3), 3));
    geom.setAttribute('uv', new THREE.BufferAttribute(this._uv.slice(0, vc2), 2));
    if (this.vCount > 65535) {
      geom.setIndex(new THREE.BufferAttribute(this._idx.slice(0, this.iCount), 1));
    } else {
      const idx16 = new Uint16Array(this.iCount);
      const src = this._idx;
      for (let i = 0; i < this.iCount; i++) idx16[i] = src[i];
      geom.setIndex(new THREE.BufferAttribute(idx16, 1));
    }
    geom.computeBoundingBox();
    geom.computeBoundingSphere();
    return geom;
  }
}

class MultiBatch {
  constructor(THREE, materials) {
    this.THREE = THREE;
    this.materials = materials;
    this.batches = new Map();
  }

  get(matKey) {
    if (!this.batches.has(matKey)) {
      this.batches.set(matKey, new MeshBatch());
    }
    return this.batches.get(matKey);
  }

  buildGroup(name) {
    const g = new this.THREE.Group();
    g.name = name;
    for (const [matKey, batch] of this.batches.entries()) {
      const geom = batch.toBufferGeometry(this.THREE);
      if (!geom) continue;
      const mat = this.materials[matKey] || this.materials.ironPrimary;
      const mesh = new this.THREE.Mesh(geom, mat);
      mesh.name = `${name}_${matKey}`;
      g.add(mesh);
    }
    return g;
  }
}

function ensureFallbackMaterials(THREE, rawMats = {}) {
  const mk = (name, color, roughness = 0.55, metalness = 0.4, extra = {}) =>
    rawMats[name] ||
    new THREE.MeshStandardMaterial({
      name,
      color,
      roughness,
      metalness,
      side: THREE.DoubleSide,
      ...extra,
    });
  return {
    ...rawMats,
    ironPrimary: mk('ironPrimary', 0x5c382c, 0.52, 0.44),
    ironLattice: mk('ironLattice', 0x6b4335, 0.56, 0.38),
    ironCast: mk('ironCast', 0x363432, 0.45, 0.64),
    masonryAshlar: mk('masonryAshlar', 0xe2dac9, 0.84, 0.03),
    concreteSub: mk('concreteSub', 0x9e9a91, 0.92, 0.02),
    woodPavilion: mk('woodPavilion', 0x8f6239, 0.64, 0.05),
    woodTimberTemp: mk('woodTimberTemp', 0xbc9056, 0.78, 0.02),
    glass1889: mk('glass1889', 0xc8dde6, 0.14, 0.1, { transparent: true, opacity: 0.42, depthWrite: false }),
    lampGlobe1889: mk('lampGlobe1889_glass', 0xebe6dc, 0.32, 0.00),
    goldAccent: mk('goldAccent', 0xd1a43e, 0.3, 0.82),
    copperDome: mk('copperDome', 0x586f64, 0.42, 0.58),
    flagTricolore: mk('flagTricolore', 0xffffff, 0.74, 0.02),
    craneSteel: mk('craneSteel', 0x3b434a, 0.44, 0.65),
  };
}

/**
 * Chamfered-square (8-vertex octagon) points in XZ plane:
 *   |x| <= halfFlat, |z| <= halfFlat, with 45-deg corner chamfers of setback `chamfer` along each side.
 */
function chamferedSquareVertices(halfFlat, chamfer) {
  const s = halfFlat - chamfer;
  return [
    [-s, halfFlat],
    [s, halfFlat],
    [halfFlat, s],
    [halfFlat, -s],
    [s, -halfFlat],
    [-s, -halfFlat],
    [-halfFlat, -s],
    [-halfFlat, s],
  ];
}

/**
 * Map face-local (u, y, depthInward) onto the 4 cardinal shaft faces:
 *   face 0: +Z (SE), face 1: -Z (NW), face 2: +X (NE), face 3: -X (SW)
 */
function shaftFacePoint(faceIdx, u, y, depthInward = 0) {
  const hs = shaftHalfSpan(y) - depthInward;
  switch (faceIdx) {
    case 0: return [u, y, hs];
    case 1: return [-u, y, -hs];
    case 2: return [hs, y, -u];
    default: return [-hs, y, u];
  }
}

function addLacedDiagonal2D(mb, faceIdx, u0, y0, u1, y1, zInward, spread = 0.17, chordW = 0.065, laceSegs = 8) {
  const pri = mb.get('ironPrimary');
  const lat = mb.get('ironLattice');
  const du = u1 - u0, dy = y1 - y0;
  const len = Math.hypot(du, dy) || 1;
  const nu = (-dy / len) * spread;
  const ny = (du / len) * spread;

  const aTop = shaftFacePoint(faceIdx, u0 + nu, y0 + ny, zInward);
  const bTop = shaftFacePoint(faceIdx, u1 + nu, y1 + ny, zInward);
  const aBot = shaftFacePoint(faceIdx, u0 - nu, y0 - ny, zInward);
  const bBot = shaftFacePoint(faceIdx, u1 - nu, y1 - ny, zInward);

  pri.addStrut(aTop, bTop, chordW, chordW * 1.3);
  pri.addStrut(aBot, bBot, chordW, chordW * 1.3);

  for (let i = 0; i < laceSegs; i++) {
    const t0 = i / laceSegs;
    const t1 = (i + 1) / laceSegs;
    const p0 = i % 2 === 0
      ? [lerp(aTop[0], bTop[0], t0), lerp(aTop[1], bTop[1], t0), lerp(aTop[2], bTop[2], t0)]
      : [lerp(aBot[0], bBot[0], t0), lerp(aBot[1], bBot[1], t0), lerp(aBot[2], bBot[2], t0)];
    const p1 = i % 2 === 0
      ? [lerp(aBot[0], bBot[0], t1), lerp(aBot[1], bBot[1], t1), lerp(aBot[2], bBot[2], t1)]
      : [lerp(aTop[0], bTop[0], t1), lerp(aTop[1], bTop[1], t1), lerp(aTop[2], bTop[2], t1)];
    lat.addStrut(p0, p1, 0.032, 0.038);
  }
}

/**
 * Build one standard unified upper-shaft panel (P19 collar or P20..P28).
 */
function buildStandardShaftPanel(THREE, materials, panelDef) {
  const { id, y0, y1, subTiers = 1, hasSubDiamond = true } = panelDef;
  const mb = new MultiBatch(THREE, materials);
  const pri = mb.get('ironPrimary');
  const lat = mb.get('ironLattice');

  const hs0 = shaftHalfSpan(y0);
  const hs1 = shaftHalfSpan(y1);
  const dy = y1 - y0;

  // Box-chord width tapers smoothly from 0.72m at Y=196m to 0.58m at Y=265m
  const cw0 = lerp(0.58, 0.74, clamp((265 - y0) / 85, 0, 1));
  const cw1 = lerp(0.58, 0.74, clamp((265 - y1) / 85, 0, 1));
  const cw = (cw0 + cw1) * 0.5;

  // 1. 4 Corner Laced Box-Chords (Arbalétriers C)
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const flOffsets = [
      [0, 0],
      [-cw, 0],
      [0, -cw],
      [-cw, -cw],
    ];
    const botPts = flOffsets.map(([ox, oz]) => [sx * (hs0 + ox), y0, sz * (hs0 + oz)]);
    const topPts = flOffsets.map(([ox, oz]) => [sx * (hs1 + ox), y1, sz * (hs1 + oz)]);

    for (let f = 0; f < 4; f++) {
      pri.addStrut(botPts[f], topPts[f], 0.11, 0.11, [1, 0, 0]);
    }
    // Splice collar plate at top of panel
    const cx1 = sx * (hs1 - cw * 0.5);
    const cz1 = sz * (hs1 - cw * 0.5);
    pri.addAxisBox(cx1, y1 - 0.14, cz1, cw + 0.06, 0.28, cw + 0.06);

    // Diagonal lacing along all 4 sides of each corner box-chord
    const nLace = Math.max(4, Math.round(dy / 0.85));
    const sidePairs = [[0, 1], [1, 3], [3, 2], [2, 0]];
    for (const [iA, iB] of sidePairs) {
      for (let s = 0; s < nLace; s++) {
        const t0 = s / nLace, t1 = (s + 1) / nLace;
        const pA0 = [lerp(botPts[iA][0], topPts[iA][0], t0), lerp(y0, y1, t0), lerp(botPts[iA][2], topPts[iA][2], t0)];
        const pB0 = [lerp(botPts[iB][0], topPts[iB][0], t0), lerp(y0, y1, t0), lerp(botPts[iB][2], topPts[iB][2], t0)];
        const pA1 = [lerp(botPts[iA][0], topPts[iA][0], t1), lerp(y0, y1, t1), lerp(botPts[iA][2], topPts[iA][2], t1)];
        const pB1 = [lerp(botPts[iB][0], topPts[iB][0], t1), lerp(y0, y1, t1), lerp(botPts[iB][2], topPts[iB][2], t1)];
        lat.addStrut(s % 2 === 0 ? pA0 : pB0, s % 2 === 0 ? pB1 : pA1, 0.036, 0.036);
      }
    }
  }

  // 2. 4 Faces: Central Twin-Post (Arbalétrier bd, 0.50m wide), Top Belt Entretoise & St. Andrew's X-Bays
  const beltH = clamp(dy * 0.072, 0.36, 0.56);
  for (let f = 0; f < 4; f++) {
    // Central 0.50m twin post (two chords at u = ±0.23m laced together)
    for (const uPost of [-0.23, 0.23]) {
      pri.addStrut(
        shaftFacePoint(f, uPost, y0, 0.14),
        shaftFacePoint(f, uPost, y1, 0.14),
        0.09,
        0.22,
        [1, 0, 0]
      );
    }
    const postSegs = Math.max(4, Math.round(dy / 0.8));
    for (let s = 0; s < postSegs; s++) {
      const ya = lerp(y0, y1, s / postSegs);
      const yb = lerp(y0, y1, (s + 1) / postSegs);
      lat.addStrut(
        shaftFacePoint(f, s % 2 === 0 ? -0.23 : 0.23, ya, 0.14),
        shaftFacePoint(f, s % 2 === 0 ? 0.23 : -0.23, yb, 0.14),
        0.035,
        0.045
      );
    }

    // Top horizontal laced belt girder (Entretoise)
    const uOuterTop = hs1 - cw * 0.45;
    const uOuterBot = shaftHalfSpan(y1 - beltH) - cw * 0.45;
    pri.addStrut(shaftFacePoint(f, -uOuterTop, y1, 0.12), shaftFacePoint(f, uOuterTop, y1, 0.12), 0.10, 0.24);
    pri.addStrut(shaftFacePoint(f, -uOuterBot, y1 - beltH, 0.12), shaftFacePoint(f, uOuterBot, y1 - beltH, 0.12), 0.09, 0.22);

    const nBelt = Math.max(10, Math.round((uOuterTop * 2) / 0.65));
    for (let k = 0; k < nBelt; k++) {
      const ua = lerp(-uOuterTop, uOuterTop, k / nBelt);
      const ub = lerp(-uOuterTop, uOuterTop, (k + 1) / nBelt);
      lat.addStrut(
        shaftFacePoint(f, ua, k % 2 === 0 ? y1 : y1 - beltH, 0.12),
        shaftFacePoint(f, ub, k % 2 === 0 ? y1 - beltH : y1, 0.12),
        0.034,
        0.04
      );
    }

    // Bay diagonals (2 bays per face: left [-uBay, -0.25] & right [+0.25, +uBay])
    for (let tier = 0; tier < subTiers; tier++) {
      const ty0 = lerp(y0, y1 - beltH, tier / subTiers);
      const ty1 = lerp(y0, y1 - beltH, (tier + 1) / subTiers);
      const uIn0 = shaftHalfSpan(ty0) - cw * 0.65;
      const uIn1 = shaftHalfSpan(ty1) - cw * 0.65;
      const yMid = (ty0 + ty1) * 0.5;
      const uInMid = shaftHalfSpan(yMid) - cw * 0.65;

      for (const sgn of [-1, 1]) {
        const uInner = sgn * 0.25;
        const uOut0 = sgn * uIn0;
        const uOut1 = sgn * uIn1;
        const uOutMid = sgn * uInMid;

        // Primary laced St. Andrew's X-cross
        const laceN = Math.max(5, Math.round((ty1 - ty0) / 0.95));
        addLacedDiagonal2D(mb, f, uInner, ty0, uOut1, ty1, 0.16, 0.145, 0.058, laceN);
        addLacedDiagonal2D(mb, f, uOut0, ty0, uInner, ty1, 0.22, 0.145, 0.058, laceN);

        // Central X-intersection gusset plate
        const uCross = (uInner + (uOut0 + uOut1) * 0.5) * 0.5;
        const pCross = shaftFacePoint(f, uCross, yMid, 0.19);
        pri.addAxisBox(pCross[0], pCross[1], pCross[2], 0.44, 0.44, 0.12);

        // Secondary mid-height horizontal tie & diamond sub-lattice (characteristic upper-shaft trellis!)
        lat.addStrut(
          shaftFacePoint(f, uInner, yMid, 0.26),
          shaftFacePoint(f, uOutMid, yMid, 0.26),
          0.048,
          0.055
        );
        if (hasSubDiamond) {
          const uTopMid = (uInner + uOut1) * 0.5;
          const uBotMid = (uInner + uOut0) * 0.5;
          lat.addStrut(shaftFacePoint(f, uInner, yMid, 0.28), shaftFacePoint(f, uTopMid, ty1, 0.28), 0.042, 0.045);
          lat.addStrut(shaftFacePoint(f, uTopMid, ty1, 0.28), shaftFacePoint(f, uOutMid, yMid, 0.28), 0.042, 0.045);
          lat.addStrut(shaftFacePoint(f, uOutMid, yMid, 0.28), shaftFacePoint(f, uBotMid, ty0, 0.28), 0.042, 0.045);
          lat.addStrut(shaftFacePoint(f, uBotMid, ty0, 0.28), shaftFacePoint(f, uInner, yMid, 0.28), 0.042, 0.045);
          // Vertical bisector rod through bay center
          lat.addStrut(shaftFacePoint(f, uBotMid, ty0, 0.28), shaftFacePoint(f, uTopMid, ty1, 0.28), 0.04, 0.04);
        }
      }
    }
  }

  // 3. Internal Horizontal Stiffening Diaphragm Ring at Top of Panel (framing elevator & stair core)
  const rInner = Math.max(2.6, hs1 - cw - 0.1);
  const rCore = Math.min(2.35, rInner - 0.4);
  for (const sgn of [-1, 1]) {
    lat.addStrut([-rInner, y1 - 0.18, sgn * rCore], [rInner, y1 - 0.18, sgn * rCore], 0.08, 0.14);
    lat.addStrut([sgn * rCore, y1 - 0.18, -rInner], [sgn * rCore, y1 - 0.18, rInner], 0.08, 0.14);
  }
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    lat.addStrut([sx * rInner, y1 - 0.18, sz * rCore], [sx * rCore, y1 - 0.18, sz * rInner], 0.07, 0.10);
  }

  return mb.buildGroup(id);
}

/**
 * Build Panneau 29 (Y = 264.8565 -> 275.280m):
 *   - Lower 3.5035m 4-bay fine diamond-trellis sub-panel + inspection walkway
 *   - Upper 6.92m 4x2 X-braced core frame (10.00m x 10.00m vertical)
 *   - 8 concave-curved lattice console brackets + 4 diagonal corner chamfer brackets
 */
function buildPanneau29Corbel(THREE, materials) {
  const mb = new MultiBatch(THREE, materials);
  const pri = mb.get('ironPrimary');
  const lat = mb.get('ironLattice');

  const yBot = 264.8565;
  const ySub = 268.36;
  const yMid = 271.82;
  const ySoffit = 275.28;
  const hs = 5.0;
  const cw = 0.58;

  // 1. 4 Vertical Corner Box-Chords (Arbalétriers C at ±5.00m)
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    for (const [ox, oz] of [[0, 0], [-cw, 0], [0, -cw], [-cw, -cw]]) {
      pri.addStrut([sx * (hs + ox), yBot, sz * (hs + oz)], [sx * (hs + ox), ySoffit, sz * (hs + oz)], 0.11, 0.11, [1, 0, 0]);
    }
    const cx = sx * (hs - cw * 0.5), cz = sz * (hs - cw * 0.5);
    pri.addAxisBox(cx, ySub, cz, cw + 0.06, 0.24, cw + 0.06);
    pri.addAxisBox(cx, yMid, cz, cw + 0.05, 0.20, cw + 0.05);
  }

  // 2. 4 Faces of the 10.00m Core: 3 equal X-bays (-4.80, -1.60, +1.60, +4.80m) + central Arbalétrier bd (0.0m, Pl. 65 Fig. 3 & Pl. 66 Fig. 4!)
  const bayPosts = [-1.60, 0.0, 1.60];
  for (let f = 0; f < 4; f++) {
    for (const uP of bayPosts) {
      const wP = uP === 0 ? 0.18 : 0.13;
      pri.addStrut(shaftFacePoint(f, uP, yBot, 0.14), shaftFacePoint(f, uP, ySoffit, 0.14), wP, 0.22, [1, 0, 0]);
    }
    // Horizontal struts at ySub (268.36m), yMid (271.82m), ySoffit (275.28m)
    for (const yh of [ySub, yMid, ySoffit]) {
      pri.addStrut(shaftFacePoint(f, -4.80, yh, 0.14), shaftFacePoint(f, 4.80, yh, 0.14), 0.14, 0.24);
    }

    // Lower 3.50m sub-panel + upper 2 tiers across 3 equal sub-bays (central bay X crosses right on Arbalétrier bd!)
    const uWalls = [-4.80, -1.60, 1.60, 4.80];
    for (let b = 0; b < 3; b++) {
      const ua = uWalls[b], ub = uWalls[b + 1];
      const um = (ua + ub) * 0.5;
      const ym = (yBot + ySub) * 0.5;
      // Primary X + diamond sub-cross
      lat.addStrut(shaftFacePoint(f, ua, yBot, 0.16), shaftFacePoint(f, ub, ySub, 0.16), 0.072, 0.085);
      lat.addStrut(shaftFacePoint(f, ub, yBot, 0.16), shaftFacePoint(f, ua, ySub, 0.16), 0.072, 0.085);
      lat.addStrut(shaftFacePoint(f, um, yBot, 0.18), shaftFacePoint(f, ub, ym, 0.18), 0.052, 0.065);
      lat.addStrut(shaftFacePoint(f, ub, ym, 0.18), shaftFacePoint(f, um, ySub, 0.18), 0.052, 0.065);
      lat.addStrut(shaftFacePoint(f, um, ySub, 0.18), shaftFacePoint(f, ua, ym, 0.18), 0.052, 0.065);
      lat.addStrut(shaftFacePoint(f, ua, ym, 0.18), shaftFacePoint(f, um, yBot, 0.18), 0.052, 0.065);
      lat.addStrut(shaftFacePoint(f, ua, ym, 0.19), shaftFacePoint(f, ub, ym, 0.19), 0.045, 0.055);
      if (b !== 1) {
        lat.addStrut(shaftFacePoint(f, um, yBot, 0.17), shaftFacePoint(f, um, ySub, 0.17), 0.055, 0.065, [1, 0, 0]);
      }

      // Upper 2 tiers (268.36 -> 271.82 -> 275.28m): 3x2 bold laced X-boxes matching Pl. 65 Fig. 3, Pl. 66 Fig. 4 & Photo 18!
      for (const [ty0, ty1] of [[ySub, yMid], [yMid, ySoffit]]) {
        addLacedDiagonal2D(mb, f, ua, ty0, ub, ty1, 0.16, 0.11, 0.052, 6);
        addLacedDiagonal2D(mb, f, ub, ty0, ua, ty1, 0.20, 0.11, 0.052, 6);
        lat.addStrut(shaftFacePoint(f, ua, (ty0 + ty1) * 0.5, 0.18), shaftFacePoint(f, ub, (ty0 + ty1) * 0.5, 0.18), 0.052, 0.06);
        const pc = shaftFacePoint(f, um, (ty0 + ty1) * 0.5, 0.18);
        pri.addAxisBox(pc[0], pc[1], pc[2], 0.30, 0.30, 0.10);
      }
    }
  }

  // Interior suspended inspection footbridges (Passerelles suspendues pour la visite, Pl. 65 Fig. 3)
  for (let f = 0; f < 4; f++) {
    lat.addStrut(shaftFacePoint(f, -4.5, 265.15, 0.65), shaftFacePoint(f, 4.5, 265.15, 0.65), 0.06, 0.55);
    lat.addStrut(shaftFacePoint(f, -4.5, 266.05, 0.90), shaftFacePoint(f, 4.5, 266.05, 0.90), 0.04, 0.04);
    lat.addStrut(shaftFacePoint(f, -4.5, 269.28, 0.85), shaftFacePoint(f, 4.5, 269.28, 0.85), 0.045, 0.045);
    lat.addStrut(shaftFacePoint(f, -4.5, 272.74, 0.85), shaftFacePoint(f, 4.5, 272.74, 0.85), 0.045, 0.045);
  }

  // 3. 8 Concave-Curved Lattice Console Brackets with Vertical Hangers & Sub-Panel X-Web (Pl. 65 Fig. 3!)
  const corbelKnots = [
    [266.20, 5.00],
    [268.36, 5.10],
    [269.50, 5.32],
    [270.50, 5.58],
    [271.50, 6.04],
    [272.50, 6.46],
    [273.50, 6.94],
    [274.50, 7.52],
    [275.28, 8.275],
  ];

  const evalBracketPt = (faceIdx, uPos, outDist, y) => {
    switch (faceIdx) {
      case 0: return [uPos, y, outDist];
      case 1: return [-uPos, y, -outDist];
      case 2: return [outDist, y, -uPos];
      default: return [-outDist, y, uPos];
    }
  };

  for (let f = 0; f < 4; f++) {
    for (const sgn of [-1, 1]) {
      const uBrk = sgn * 4.78;
      // Twin-plane box console (width 0.36m) with double-chord laced arch & 4 vertical hangers (5.32, 6.08, 6.82, 7.48m, Pl. 65 Fig. 3!)
      for (const du of [-0.18, 0.18]) {
        const bp = (outDist, y) => evalBracketPt(f, uBrk + du, outDist, y);
        for (let k = 0; k < corbelKnots.length - 1; k++) {
          const [ya, oa] = corbelKnots[k];
          const [yb, ob] = corbelKnots[k + 1];
          pri.addStrut(bp(oa, ya), bp(ob, yb), 0.11, 0.14);
          if (k >= 1) {
            const oInA = Math.max(5.00, oa - 0.28);
            const oInB = Math.max(5.00, ob - 0.28);
            pri.addStrut(bp(oInA, ya), bp(oInB, yb), 0.08, 0.10);
            lat.addStrut(bp(oa, ya), bp(oInB, yb), 0.042, 0.048);
            lat.addStrut(bp(oInA, ya), bp(ob, yb), 0.042, 0.048);
          }
        }
        // Top soffit chord + pixel-calibrated horizontal bracket ties (269.20, 270.55, 271.45, 272.93, 274.16, 275.22m)
        pri.addStrut(bp(5.00, 275.22), bp(8.275, 275.22), 0.085, 0.12);
        lat.addStrut(bp(5.00, 269.20), bp(5.26, 269.20), 0.05, 0.06);
        lat.addStrut(bp(5.00, 270.55), bp(5.58, 270.55), 0.055, 0.068);
        pri.addStrut(bp(5.00, 271.45), bp(6.02, 271.45), 0.065, 0.08);
        pri.addStrut(bp(5.00, 272.93), bp(6.68, 272.93), 0.065, 0.08);
        pri.addStrut(bp(5.00, 274.16), bp(7.32, 274.16), 0.065, 0.08);
        // 4 Vertical hanger posts inside flared console (outDist = 5.32, 6.08, 6.82, 7.48m, Pl. 65 Fig. 3!)
        pri.addStrut(bp(5.32, 269.50), bp(5.32, 275.24), 0.068, 0.078, [1, 0, 0]);
        pri.addStrut(bp(6.08, 271.45), bp(6.08, 275.24), 0.075, 0.085, [1, 0, 0]);
        pri.addStrut(bp(6.82, 272.93), bp(6.82, 275.24), 0.070, 0.080, [1, 0, 0]);
        pri.addStrut(bp(7.48, 274.16), bp(7.48, 275.24), 0.065, 0.075, [1, 0, 0]);
        // Complete double-X web diagonals across all corbel sub-cells (Pl. 65 Fig. 3)
        const xCells = [
          [5.00, 5.32, 269.50, 270.55],
          [5.00, 5.32, 270.55, 271.45],
          [5.00, 5.32, 271.45, 272.93],
          [5.00, 5.32, 272.93, 274.16],
          [5.00, 5.32, 274.16, 275.22],
          [5.32, 6.08, 271.45, 272.93],
          [5.32, 6.08, 272.93, 274.16],
          [5.32, 6.08, 274.16, 275.22],
          [6.08, 6.82, 272.93, 274.16],
          [6.08, 6.82, 274.16, 275.22],
          [6.82, 7.48, 274.16, 275.22],
        ];
        for (const [xa, xb, ya, yb] of xCells) {
          lat.addStrut(bp(xa, ya), bp(xb, yb), 0.048, 0.055);
          lat.addStrut(bp(xb, ya), bp(xa, yb), 0.048, 0.055);
        }
        // Triangular spandrel toes along curved extrados
        lat.addStrut(bp(5.32, 270.55), bp(5.96, 271.45), 0.048, 0.055);
        lat.addStrut(bp(5.58, 270.55), bp(5.32, 271.45), 0.046, 0.052);
        lat.addStrut(bp(6.08, 271.60), bp(6.68, 272.93), 0.048, 0.055);
        lat.addStrut(bp(6.82, 273.20), bp(7.32, 274.16), 0.048, 0.055);
        lat.addStrut(bp(7.48, 274.35), bp(8.20, 275.22), 0.050, 0.058);
        lat.addStrut(bp(7.48, 275.22), bp(7.85, 274.76), 0.046, 0.052);
      }
      // Transverse lacing across the 0.36m curved console soffit
      for (let k = 1; k < corbelKnots.length - 1; k++) {
        const [ya, oa] = corbelKnots[k];
        const [yb, ob] = corbelKnots[k + 1];
        lat.addStrut(evalBracketPt(f, uBrk - 0.18, oa, ya), evalBracketPt(f, uBrk + 0.18, ob, yb), 0.036, 0.036);
        lat.addStrut(evalBracketPt(f, uBrk + 0.18, oa, ya), evalBracketPt(f, uBrk - 0.18, ob, yb), 0.036, 0.036);
      }
      // Intermediate console rib aligned with ±1.60m bay post under the 3rd-floor girder
      pri.addStrut(evalBracketPt(f, sgn * 1.60, 5.0, 272.40), evalBracketPt(f, sgn * 1.60, 8.15, 275.28), 0.10, 0.16);
      lat.addStrut(evalBracketPt(f, sgn * 1.60, 5.0, 273.85), evalBracketPt(f, sgn * 1.60, 6.60, 273.85), 0.055, 0.08);
    }
    // Center console rib at u = 0.0m
    pri.addStrut(evalBracketPt(f, 0, 5.0, 272.40), evalBracketPt(f, 0, 8.15, 275.28), 0.12, 0.18);
  }

  return mb.buildGroup('z4_panneau_29_corbel');
}

/**
 * Build authentic 1889 helical iron spiral staircase segment.
 */
function buildSpiralStairFlight(
  THREE,
  materials,
  id,
  cx,
  cz,
  yStart,
  yEnd,
  outerRadius = 0.72,
  turnHeight = 3.55,
  phaseRad = 0,
  newelRadius = 0.105,
  railBars = 1,
  turnRefY = Y_COLLAR_P17_18
) {
  const mb = new MultiBatch(THREE, materials);
  const pri = mb.get('ironPrimary');
  const lat = mb.get('ironLattice');
  const wood = mb.get('woodPavilion');

  // Central wrought-iron tubular newel column (0.20m radius on Escalier du campanile, Pl. 59 & Pl. 65!)
  pri.addFrustum(cx, cz, yStart, newelRadius, yEnd, newelRadius, 16, true, true);

  const stepRise = 0.21;
  const nSteps = Math.max(4, Math.round((yEnd - yStart) / stepRise));
  const railTopH = railBars > 1 ? 1.02 : 0.94;
  let prevOuter = null;
  let prevRails = null;

  for (let i = 0; i <= nSteps; i++) {
    const y = lerp(yStart, yEnd, i / nSteps);
    const ang = phaseRad + ((y - turnRefY) / turnHeight) * Math.PI * 2;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const pIn = [cx + ca * (newelRadius + 0.005), y, cz + sa * (newelRadius + 0.005)];
    const pOut = [cx + ca * outerRadius, y, cz + sa * outerRadius];
    const rCage = outerRadius + 0.02;
    const curRails = railBars === 3
      ? [0.34, 0.68, 1.02].map((dh) => [cx + ca * rCage, y + dh, cz + sa * rCage])
      : [[cx + ca * rCage, y + railTopH, cz + sa * rCage]];

    if (i < nSteps) {
      wood.addStrut(pIn, pOut, 0.20, 0.038);
      if (railBars > 1 || i % 2 === 0) {
        lat.addStrut(pOut, curRails[curRails.length - 1], 0.026, 0.026, [1, 0, 0]);
      }
    }
    if (prevOuter) {
      pri.addStrut(prevOuter, pOut, 0.04, 0.17);
      for (let r = 0; r < curRails.length; r++) {
        lat.addStrut(prevRails[r], curRails[r], 0.032, 0.032);
      }
    }
    prevOuter = pOut;
    prevRails = curRails;
  }

  return mb.buildGroup(id);
}

/**
 * Build 3rd-Floor Structural Girder Ring & Cantilevered 18.65m Chamfered-Octagon Deck (+275.28 -> +277.18m).
 * Strictly authentic May 1889 state: NO corner balustrade spheres, NO post-1904 TSF outriggers!
 */
function buildThirdFloorDeckAndBalustrade(THREE, materials) {
  const mb = new MultiBatch(THREE, materials);
  const pri = mb.get('ironPrimary');
  const lat = mb.get('ironLattice');
  const wood = mb.get('woodPavilion');

  const ySoffit = 275.28;
  const yDeck = 276.13;
  const yRail = 277.18;

  // Inner 16.55m (±8.275m, 3.275m chamfer) structural box-girder ring + outer ±8.85m (8.93m cornice, 3.06m chamfer) balcony (Pl. 53 Fig. 18 & Photo 18)
  const vInner = chamferedSquareVertices(8.275, 3.275);
  const vOuter = chamferedSquareVertices(8.85, 3.06);
  const vCore = chamferedSquareVertices(4.85, 0.35);

  for (let i = 0; i < 8; i++) {
    const j = (i + 1) % 8;
    const [ix0, iz0] = vInner[i], [ix1, iz1] = vInner[j];
    const [ox0, oz0] = vOuter[i], [ox1, oz1] = vOuter[j];
    const [cx0, cz0] = vCore[i], [cx1, cz1] = vCore[j];

    // 0.85m deep riveted plate-girder fascia on inner 16.55m ring (Pl. 65 Fig. 3)
    pri.addQuad([ix0, ySoffit, iz0], [ix1, ySoffit, iz1], [ix1, yDeck, iz1], [ix0, yDeck, iz0]);
    pri.addStrut([ix0, ySoffit + 0.05, iz0], [ix1, ySoffit + 0.05, iz1], 0.18, 0.12);
    pri.addStrut([ix0, yDeck - 0.05, iz0], [ix1, yDeck - 0.05, iz1], 0.22, 0.12);

    // Outer 18.65m cantilevered walkway fascia & cornice
    pri.addStrut([ox0, yDeck - 0.14, oz0], [ox1, yDeck - 0.14, oz1], 0.16, 0.28);
    // Cantilevered console brackets from 16.55m fascia to 18.65m walkway edge
    const edgeLen = Math.hypot(ox1 - ox0, oz1 - oz0);
    const nBrk = Math.max(3, Math.round(edgeLen / 1.45));
    for (let b = 0; b <= nBrk; b++) {
      const t = b / nBrk;
      const bxIn = lerp(ix0, ix1, t), bzIn = lerp(iz0, iz1, t);
      const bxOut = lerp(ox0, ox1, t), bzOut = lerp(oz0, oz1, t);
      pri.addStrut([bxIn, ySoffit + 0.22, bzIn], [bxOut, yDeck - 0.08, bzOut], 0.08, 0.14);
      pri.addStrut([bxIn, yDeck - 0.06, bzIn], [bxOut, yDeck - 0.06, bzOut], 0.09, 0.12);
    }

    // Planked floor deck (annular octagon leaving central elevator/stair core framed cleanly)
    wood.addQuad([cx0, yDeck, cz0], [cx1, yDeck, cz1], [ox1, yDeck, oz1], [ox0, yDeck, oz0]);
    pri.addQuad([ox0, yDeck - 0.08, oz0], [ox1, yDeck - 0.08, oz1], [cx1, yDeck - 0.08, cz1], [cx0, yDeck - 0.08, cz0]);

    // Authentic 1889 1.05m wrought-iron lattice balustrade around 18.65m perimeter (NO corner spheres!)
    pri.addStrut([ox0, yRail, oz0], [ox1, yRail, oz1], 0.075, 0.065);
    pri.addStrut([ox0, yDeck + 0.10, oz0], [ox1, yDeck + 0.10, oz1], 0.055, 0.055);
    lat.addStrut([ox0, yDeck + 0.56, oz0], [ox1, yDeck + 0.56, oz1], 0.04, 0.04);

    const nPost = Math.max(4, Math.round(edgeLen / 1.15));
    for (let p = 0; p < nPost; p++) {
      const t0 = p / nPost, t1 = (p + 1) / nPost;
      const px0 = lerp(ox0, ox1, t0), pz0 = lerp(oz0, oz1, t0);
      const px1 = lerp(ox0, ox1, t1), pz1 = lerp(oz0, oz1, t1);
      pri.addStrut([px0, yDeck, pz0], [px0, yRail + 0.02, pz0], 0.055, 0.055, [1, 0, 0]);
      // Diamond X-lattice balustrade infill
      lat.addStrut([px0, yDeck + 0.10, pz0], [px1, yRail - 0.03, pz1], 0.028, 0.028);
      lat.addStrut([px1, yDeck + 0.10, pz1], [px0, yRail - 0.03, pz0], 0.028, 0.028);
    }
  }

  // Central 10.00m x 10.00m floor beams & pixel-calibrated 45-deg solives diagonales cross-grid (Pl. 53 Fig. 18)
  const stPt = (s, t, y) => [(s + t) * INV_SQRT2, y, (s - t) * INV_SQRT2];
  const sBound = 4.88 * Math.SQRT2;
  for (const sgn of [-1, 1]) {
    pri.addStrut([-5.0, yDeck - 0.35, sgn * 5.0], [5.0, yDeck - 0.35, sgn * 5.0], 0.24, 0.65);
    pri.addStrut([sgn * 5.0, yDeck - 0.35, -5.0], [sgn * 5.0, yDeck - 0.35, 5.0], 0.24, 0.65);
  }
  // Primary 45-deg trimmer girders bounding the Édoux elevator & circular tank bay (s = -1.76m, +1.88m, +2.64m; t = -2.38m, +2.68m)
  for (const sTrim of [-1.76, 1.88, 2.64]) {
    const tLim = sBound - Math.abs(sTrim);
    pri.addStrut(stPt(sTrim, -tLim, yDeck - 0.28), stPt(sTrim, tLim, yDeck - 0.28), 0.17, 0.46);
  }
  pri.addStrut(stPt(-1.76, -2.38, yDeck - 0.26), stPt(2.64, -2.38, yDeck - 0.26), 0.16, 0.42);
  pri.addStrut(stPt(-1.76, 2.68, yDeck - 0.26), stPt(2.64, 2.68, yDeck - 0.26), 0.16, 0.42);

  // Interval clipper subtracting [cutA, cutB] from a list of 1D segments
  const clipIntervals = (segs, cutA, cutB) => {
    if (cutA >= cutB) return segs;
    const out = [];
    for (const [a, b] of segs) {
      if (b <= cutA || a >= cutB) {
        out.push([a, b]);
      } else {
        if (cutA - a > 0.16) out.push([a, cutA]);
        if (b - cutB > 0.16) out.push([cutB, b]);
      }
    }
    return out;
  };

  // 1. Constant-s 45-deg solives diagonales across entire ±4.88m core (clipped around Édoux bay & e2 stairwell)
  const sSolives = [-6.08, -5.24, -4.36, -3.42, -2.68, -2.46, -1.12, -0.38, 0.36, 1.16, 3.28, 4.36, 5.28, 6.08];
  for (const sVal of sSolives) {
    const tLim = sBound - Math.abs(sVal);
    if (tLim <= 0.18) continue;
    let segs = [[-tLim, tLim]];
    if (sVal > -1.74 && sVal < 2.62) {
      segs = clipIntervals(segs, -2.36, 2.66);
    }
    const dsStair = 0.85 * 0.85 - (sVal + 2.250) * (sVal + 2.250);
    if (dsStair > 0.005) {
      const tCut = Math.sqrt(dsStair);
      segs = clipIntervals(segs, -tCut, tCut);
    }
    for (const [ta, tb] of segs) {
      lat.addStrut(stPt(sVal, ta, yDeck - 0.16), stPt(sVal, tb, yDeck - 0.16), 0.10, 0.22);
    }
  }

  // 2. Constant-t 45-deg solives diagonales across entire ±4.88m core (clipped around Édoux bay & e2 stairwell)
  const tSolives = [-6.22, -5.32, -4.36, -3.44, -2.38, -1.56, -1.16, -0.38, -0.08, 0.40, 1.16, 1.92, 2.68, 3.42, 4.66, 5.16, 6.22];
  for (const tVal of tSolives) {
    const sLim = sBound - Math.abs(tVal);
    if (sLim <= 0.18) continue;
    let segs = [[-sLim, sLim]];
    if (tVal > -2.36 && tVal < 2.66) {
      segs = clipIntervals(segs, -1.74, 2.62);
    }
    const dtStair = 0.85 * 0.85 - tVal * tVal;
    if (dtStair > 0.005) {
      const sCut = Math.sqrt(dtStair);
      segs = clipIntervals(segs, -2.250 - sCut, -2.250 + sCut);
    }
    const isSpine = Math.abs(tVal + 0.08) < 0.02;
    for (const [sa, sb] of segs) {
      (isSpine ? pri : lat).addStrut(stPt(sa, tVal, yDeck - 0.15), stPt(sb, tVal, yDeck - 0.15), isSpine ? 0.13 : 0.10, isSpine ? 0.28 : 0.22);
    }
  }

  for (const sgn of [-1, 1]) {
    lat.addStrut([0.0, yDeck - 0.18, sgn * 2.66], [0.0, yDeck - 0.18, sgn * 4.90], 0.12, 0.26);
    lat.addStrut([sgn * 2.66, yDeck - 0.18, 0.0], [sgn * 4.90, yDeck - 0.18, 0.0], 0.12, 0.26);
  }
  pri.addFrustum(-1.591, -1.591, yDeck - 0.22, 0.84, yDeck, 0.84, 16, false, false, 0.08);

  const deckGroup = mb.buildGroup('z4_floor3_deck_balustrade');

  // Planked ±4.88m interior floor of Salle du 3e Étage strip-clipped in (s, t) cleanly framing the Édoux bay & e2 stairwell
  // (tagged isWoodDecking = true so OPEN_FRAMING_PLAN_VIEWS hides it on Pl. 53 Fig. 18 while 3D PBR has razor-clean oak planking!)
  const coreFloorBatch = new MeshBatch();
  const nStrips = 96;
  const sMaxFloor = 4.88 * Math.SQRT2;
  for (let i = 0; i < nStrips; i++) {
    const s0 = -sMaxFloor + (i / nStrips) * (2 * sMaxFloor);
    const s1 = -sMaxFloor + ((i + 1) / nStrips) * (2 * sMaxFloor);
    const sm = 0.5 * (s0 + s1);
    const tLim = sMaxFloor - Math.abs(sm);
    if (tLim <= 0.02) continue;
    const tLim0 = Math.max(0, sMaxFloor - Math.abs(s0));
    const tLim1 = Math.max(0, sMaxFloor - Math.abs(s1));
    let segs = [[-tLim, tLim]];
    if (sm > -1.76 && sm < 2.64) {
      segs = clipIntervals(segs, -2.38, 2.68);
    }
    const dStair = 0.83 * 0.83 - (sm + 2.250) * (sm + 2.250);
    if (dStair > 0.002) {
      const tCut = Math.sqrt(dStair);
      segs = clipIntervals(segs, -tCut, tCut);
    }
    for (const [ta, tb] of segs) {
      const ta0 = Math.max(-tLim0, Math.min(tLim0, ta)), tb0 = Math.max(-tLim0, Math.min(tLim0, tb));
      const ta1 = Math.max(-tLim1, Math.min(tLim1, ta)), tb1 = Math.max(-tLim1, Math.min(tLim1, tb));
      coreFloorBatch.addQuad(stPt(s0, ta0, yDeck), stPt(s1, ta1, yDeck), stPt(s1, tb1, yDeck), stPt(s0, tb0, yDeck));
    }
  }
  coreFloorBatch.addStrut(stPt(-1.76, -2.38, yDeck + 0.015), stPt(-1.76, 2.68, yDeck + 0.015), 0.14, 0.03);
  coreFloorBatch.addStrut(stPt(2.64, -2.38, yDeck + 0.015), stPt(2.64, 2.68, yDeck + 0.015), 0.14, 0.03);
  coreFloorBatch.addStrut(stPt(-1.76, -2.38, yDeck + 0.015), stPt(2.64, -2.38, yDeck + 0.015), 0.14, 0.03);
  coreFloorBatch.addStrut(stPt(-1.76, 2.68, yDeck + 0.015), stPt(2.64, 2.68, yDeck + 0.015), 0.14, 0.03);
  coreFloorBatch.addFrustum(-1.591, -1.591, yDeck, 1.08, yDeck + 0.02, 1.08, 24, false, true, 0.25);
  const coreFloorGeom = coreFloorBatch.toBufferGeometry(THREE);
  if (coreFloorGeom) {
    const coreFloorMesh = new THREE.Mesh(coreFloorGeom, materials.woodPavilion || materials.ironPrimary);
    coreFloorMesh.name = 'z4_floor3_deck_balustrade_interiorFloorWood';
    coreFloorMesh.userData.isWoodDecking = true;
    deckGroup.add(coreFloorMesh);
  }

  return deckGroup;
}

/**
 * Build Salle du 3e Étage Structural Iron Frame, Lower Diamond-Trellis Dado, Exposed Radial Ceiling I-Beams & Upper Roof Promenade (+276.13 -> +279.76m).
 */
function buildThirdFloorPavilionFrame(THREE, materials) {
  const mb = new MultiBatch(THREE, materials);
  const pri = mb.get('ironPrimary');
  const lat = mb.get('ironLattice');
  const gold = mb.get('goldAccent');
  const globe = mb.get('lampGlobe1889');
  const wood = mb.get('woodPavilion');

  const yFloor = 276.13;
  const yDado = 277.33; // 1.20m iron dado
  const yRoof = 278.71; // 2.58m floor-to-roof (Pl. 65 Fig. 3)
  const yUpperRail = 279.76;

  const vPav = chamferedSquareVertices(8.275, 3.275);
  const vCore = chamferedSquareVertices(5.0, 0.05);

  // 8 Moulded Corner Balustrade Pedestals + Opaline Milk-Glass Globes with Gilt Brass Neck Collars (r = 0.175m, Photo 44!)
  const globeBands = 7;
  const rGlobe = 0.175;
  const yGlobeCenter = 280.03; // top at 280.205m -> 0.445m above 279.76m rail (<0.50m Pl. 65 tolerance!)
  for (let i = 0; i < 8; i++) {
    const [kx, kz] = vPav[i];
    pri.addAxisBox(kx, yRoof + 0.05, kz, 0.34, 0.10, 0.34);
    pri.addAxisBox(kx, 0.5 * (yRoof + 0.10 + 279.78), kz, 0.26, 279.78 - (yRoof + 0.10), 0.26);
    lat.addAxisBox(kx, 0.5 * (yRoof + 0.18 + 279.70), kz, 0.30, 0.68, 0.16);
    lat.addAxisBox(kx, 0.5 * (yRoof + 0.18 + 279.70), kz, 0.16, 0.68, 0.30);
    pri.addAxisBox(kx, 279.80, kz, 0.34, 0.07, 0.34);
    gold.addFrustum(kx, kz, 279.83, 0.125, 279.89, 0.075, 14, true, false);
    for (let b = 0; b < globeBands; b++) {
      const a0 = -0.42 * Math.PI + (b / globeBands) * 0.92 * Math.PI;
      const a1 = -0.42 * Math.PI + ((b + 1) / globeBands) * 0.92 * Math.PI;
      globe.addFrustum(
        kx,
        kz,
        yGlobeCenter + rGlobe * Math.sin(a0),
        Math.max(0.012, rGlobe * Math.cos(a0)),
        yGlobeCenter + rGlobe * Math.sin(a1),
        Math.max(0.012, rGlobe * Math.cos(a1)),
        14,
        b === 0,
        b === globeBands - 1
      );
    }
  }

  for (let i = 0; i < 8; i++) {
    const j = (i + 1) % 8;
    const [x0, z0] = vPav[i], [x1, z1] = vPav[j];
    const [cx0, cz0] = vCore[i], [cx1, cz1] = vCore[j];
    const nBays = i % 2 === 0 ? 8 : 4; // 8 window bays on 10m cardinal faces, 4 on 4.63m chamfers

    // Dado sill & roof cornice fascia + modillion dentils
    pri.addStrut([x0, yDado, z0], [x1, yDado, z1], 0.14, 0.10);
    pri.addStrut([x0, yRoof - 0.08, z0], [x1, yRoof - 0.08, z1], 0.24, 0.18);
    pri.addStrut([x0, yRoof + 0.03, z0], [x1, yRoof + 0.03, z1], 0.28, 0.08);
    // Mid-gallery circumferential ceiling T-rib & core cornice header (Photo 35 ceiling, Y > 278.60m clip plane)
    lat.addStrut(
      [0.5 * (x0 + cx0), 278.65, 0.5 * (z0 + cz0)],
      [0.5 * (x1 + cx1), 278.65, 0.5 * (z1 + cz1)],
      0.075,
      0.06
    );
    pri.addStrut([cx0, 278.64, cz0], [cx1, 278.64, cz1], 0.12, 0.10);

    // Roof promenade deck between 16.55m edge and 10.00m Eiffel apartment
    wood.addQuad([cx0, yRoof, cz0], [cx1, yRoof, cz1], [x1, yRoof, z1], [x0, yRoof, z0]);

    // Upper +278.71m promenade balustrade: horizontal rails + diamond trellis band & frieze balusters (Photo 44 & Pl. 65)
    for (const ry of [yRoof + 0.14, yRoof + 0.48, yRoof + 0.82, yUpperRail]) {
      pri.addStrut([x0, ry, z0], [x1, ry, z1], ry === yUpperRail ? 0.065 : 0.042, 0.045);
    }

    for (let b = 0; b < nBays; b++) {
      const t0 = b / nBays, t1 = (b + 1) / nBays;
      const bx0 = lerp(x0, x1, t0), bz0 = lerp(z0, z1, t0);
      const bx1 = lerp(x0, x1, t1), bz1 = lerp(z0, z1, t1);
      const bxm = 0.5 * (bx0 + bx1), bzm = 0.5 * (bz0 + bz1);
      const icx0 = lerp(cx0, cx1, t0), icz0 = lerp(cz0, cz1, t0);
      // Vertical stanchion post + exposed radial ceiling I-beam (solive) with knee-gusset brackets (Photo 35!)
      pri.addStrut([bx0, yFloor, bz0], [bx0, yRoof, bz0], 0.09, 0.09, [1, 0, 0]);
      pri.addStrut([icx0, 278.65, icz0], [bx0, 278.65, bz0], 0.075, 0.09);
      pri.addStrut([icx0, 278.615, icz0], [bx0, 278.615, bz0], 0.145, 0.024);
      lat.addStrut([lerp(icx0, bx0, 0.90), 278.62, lerp(icz0, bz0, 0.90)], [bx0, 278.42, bz0], 0.045, 0.055);
      lat.addStrut([icx0, 278.46, icz0], [lerp(icx0, bx0, 0.10), 278.62, lerp(icz0, bz0, 0.10)], 0.045, 0.055);
      // Upper promenade rail stanchions + diamond trellis + top frieze balusters (Photo 44)
      if (b % 2 === 0 && b > 0) {
        pri.addStrut([bx0, yRoof, bz0], [bx0, yUpperRail + 0.03, bz0], 0.095, 0.095, [1, 0, 0]);
      } else if (b > 0) {
        lat.addStrut([bx0, yRoof + 0.14, bz0], [bx0, yUpperRail, bz0], 0.038, 0.038, [1, 0, 0]);
      }
      lat.addStrut([bx0, yRoof + 0.14, bz0], [bxm, yRoof + 0.82, bzm], 0.024, 0.024);
      lat.addStrut([bxm, yRoof + 0.14, bzm], [bx0, yRoof + 0.82, bz0], 0.024, 0.024);
      lat.addStrut([bxm, yRoof + 0.14, bzm], [bx1, yRoof + 0.82, bz1], 0.024, 0.024);
      lat.addStrut([bx1, yRoof + 0.14, bz1], [bxm, yRoof + 0.82, bzm], 0.024, 0.024);
      lat.addStrut([bxm, yRoof + 0.82, bzm], [bxm, yUpperRail, bzm], 0.022, 0.022, [1, 0, 0]);

      // Sheet-iron / wood backing panel + exterior X-trellis dado (Photo 44, Photo 35 & Pl. 65 Fig. 3)
      pri.addQuad([bx0, yFloor, bz0], [bx1, yFloor, bz1], [bx1, yDado, bz1], [bx0, yDado, bz0]);
      lat.addStrut([bx0, yFloor + 0.08, bz0], [bx1, yDado - 0.06, bz1], 0.036, 0.036);
      lat.addStrut([bx1, yFloor + 0.08, bz1], [bx0, yDado - 0.06, bz0], 0.036, 0.036);
    }
  }

  return mb.buildGroup('z4_floor3_pavilion_frame');
}

/**
 * Build Phase 9 Multipane Panoramic Glazing, Interior Sill Shelf, Cove Orientation Maps & Wooden Guichet Counters
 * for Salle du 3e Étage (+276.15 -> +278.67m, Photo 35: "Un des magasins du 3e étage").
 */
function buildThirdFloorGlazing(THREE, materials) {
  const mb = new MultiBatch(THREE, materials);
  const pri = mb.get('ironPrimary');
  const gold = mb.get('goldAccent');
  const glass = mb.get('glass1889');
  const wood = mb.get('woodPavilion');
  const mapPanel = mb.get('masonryAshlar');

  const yBot = 277.33;
  const yMid = 278.02;
  const yTop = 278.63;
  const vPav = chamferedSquareVertices(8.19, 3.24);
  const vFrame = chamferedSquareVertices(8.23, 3.255);
  const vWainscot = chamferedSquareVertices(8.08, 3.20);
  const vSillIn = chamferedSquareVertices(7.92, 3.13);
  const vRailIn = chamferedSquareVertices(7.84, 3.10);
  const vCoveOut = chamferedSquareVertices(8.16, 3.23);
  const vCoveIn = chamferedSquareVertices(7.82, 3.09);

  for (let i = 0; i < 8; i++) {
    const j = (i + 1) % 8;
    const [x0, z0] = vPav[i], [x1, z1] = vPav[j];
    const [fx0, fz0] = vFrame[i], [fx1, fz1] = vFrame[j];
    const [wx0, wz0] = vWainscot[i], [wx1, wz1] = vWainscot[j];
    const [sx0, sz0] = vSillIn[i], [sx1, sz1] = vSillIn[j];
    const [rx0, rz0] = vRailIn[i], [rx1, rz1] = vRailIn[j];
    const [co0, czo0] = vCoveOut[i], [co1, czo1] = vCoveOut[j];
    const [ci0, czi0] = vCoveIn[i], [ci1, czi1] = vCoveIn[j];
    const nPanes = i % 2 === 0 ? 16 : 8;

    glass.addQuad([x0, yBot, z0], [x1, yBot, z1], [x1, yTop, z1], [x0, yTop, z0]);
    wood.addStrut([fx0, yBot + 0.03, fz0], [fx1, yBot + 0.03, fz1], 0.06, 0.05);
    wood.addStrut([fx0, yTop - 0.03, fz0], [fx1, yTop - 0.03, fz1], 0.06, 0.05);
    pri.addStrut([fx0, yMid, fz0], [fx1, yMid, fz1], 0.042, 0.04);

    // Interior tongue-and-groove wood dado, moulded continuous sill ledge (Y = 277.32m) & brass leaning rail (Photo 35 left!)
    wood.addQuad([wx1, 276.15, wz1], [wx0, 276.15, wz0], [wx0, 277.29, wz0], [wx1, 277.29, wz1]);
    wood.addStrut([wx0, 276.21, wz0], [wx1, 276.21, wz1], 0.055, 0.12);
    wood.addQuad([fx0, 277.32, fz0], [fx1, 277.32, fz1], [sx1, 277.32, sz1], [sx0, 277.32, sz0]);
    wood.addStrut([sx0, 277.30, sz0], [sx1, 277.30, sz1], 0.065, 0.055);
    gold.addStrut([rx0, 277.22, rz0], [rx1, 277.22, rz1], 0.036, 0.036);

    // Angled ~42° upper cove panoramic horizon orientation-map panels (Photo 35 top-left: 278.38 -> 278.66m!)
    mapPanel.addQuad([co1, 278.39, czo1], [co0, 278.39, czo0], [ci0, 278.66, czi0], [ci1, 278.66, czi1]);
    wood.addStrut([co0, 278.38, czo0], [co1, 278.38, czo1], 0.055, 0.05);
    wood.addStrut([ci0, 278.66, czi0], [ci1, 278.66, czi1], 0.06, 0.05);

    for (let p = 1; p < nPanes; p++) {
      const t = p / nPanes;
      const mx = lerp(fx0, fx1, t), mz = lerp(fz0, fz1, t);
      (p % 2 === 0 ? pri : wood).addStrut([mx, yBot, mz], [mx, yTop, mz], p % 2 === 0 ? 0.042 : 0.030, 0.04, [1, 0, 0]);
      // Vertical dado wainscoting strips + sill corbels & cove map frame dividers on primary bay mullions
      const bwx = lerp(wx0, wx1, t), bwz = lerp(wz0, wz1, t);
      wood.addStrut([bwx, 276.26, bwz], [bwx, 277.27, bwz], 0.032, 0.026, [1, 0, 0]);
      if (p % 2 === 0) {
        const bsx = lerp(sx0, sx1, t), bsz = lerp(sz0, sz1, t);
        const brx = lerp(rx0, rx1, t), brz = lerp(rz0, rz1, t);
        wood.addStrut([bwx, 277.08, bwz], [bsx, 277.29, bsz], 0.045, 0.05);
        pri.addStrut([bwx, 277.16, bwz], [brx, 277.22, brz], 0.028, 0.028);
        wood.addStrut([lerp(co0, co1, t), 278.38, lerp(czo0, czo1, t)], [lerp(ci0, ci1, t), 278.66, lerp(czi0, czi1, t)], 0.045, 0.04);
      }
    }
  }

  // Panelled oak core arcade & projecting souvenir/refreshment guichet counters along ±5.02m core walls (Photo 35 right!)
  for (let f = 0; f < 4; f++) {
    const cPt = (u, y, r) => {
      switch (f) {
        case 0: return [u, y, r];
        case 1: return [-u, y, -r];
        case 2: return [r, y, -u];
        default: return [-r, y, u];
      }
    };
    // Core lobby portal header + flanking oak kiosk walls (leaving central [-1.15, +1.15m] lobby doorway open)
    wood.addQuad(cPt(-1.15, 278.18, 5.02), cPt(1.15, 278.18, 5.02), cPt(1.15, 278.58, 5.02), cPt(-1.15, 278.58, 5.02));
    for (const sgn of [-1, 1]) {
      const uA = sgn > 0 ? 1.15 : -4.72;
      const uB = sgn > 0 ? 4.72 : -1.15;
      const uC0 = sgn > 0 ? 1.42 : -4.42;
      const uC1 = sgn > 0 ? 4.42 : -1.42;
      const uMid = 0.5 * (uC0 + uC1);
      // Backing oak wall + interior display shelves
      wood.addQuad(cPt(uA, 276.15, 5.02), cPt(uB, 276.15, 5.02), cPt(uB, 278.58, 5.02), cPt(uA, 278.58, 5.02));
      wood.addStrut(cPt(uC0, 277.56, 5.14), cPt(uC1, 277.56, 5.14), 0.22, 0.035);
      wood.addStrut(cPt(uC0, 277.98, 5.14), cPt(uC1, 277.98, 5.14), 0.22, 0.035);
      // Projecting X-panelled wooden guichet counter (r = 5.02 -> 5.62m, Y = 276.15 -> 277.10m, Photo 35 right foreground!)
      wood.addQuad(cPt(uC0, 276.15, 5.60), cPt(uC1, 276.15, 5.60), cPt(uC1, 277.08, 5.60), cPt(uC0, 277.08, 5.60));
      wood.addQuad(cPt(uC0, 276.15, 5.02), cPt(uC0, 276.15, 5.60), cPt(uC0, 277.08, 5.60), cPt(uC0, 277.08, 5.02));
      wood.addQuad(cPt(uC1, 276.15, 5.60), cPt(uC1, 276.15, 5.02), cPt(uC1, 277.08, 5.02), cPt(uC1, 277.08, 5.60));
      wood.addQuad(cPt(uC0 - 0.04, 277.10, 5.00), cPt(uC1 + 0.04, 277.10, 5.00), cPt(uC1 + 0.04, 277.10, 5.66), cPt(uC0 - 0.04, 277.10, 5.66));
      wood.addStrut(cPt(uC0 - 0.04, 277.08, 5.65), cPt(uC1 + 0.04, 277.08, 5.65), 0.07, 0.055);
      for (const [xa, xb] of [[uC0 + 0.08, uMid - 0.06], [uMid + 0.06, uC1 - 0.08]]) {
        wood.addStrut(cPt(xa, 276.22, 5.62), cPt(xb, 277.02, 5.62), 0.045, 0.032);
        wood.addStrut(cPt(xb, 276.22, 5.62), cPt(xa, 277.02, 5.62), 0.045, 0.032);
        // Twin shallow wooden kiosk arches & spandrel entablature above counter (277.10 -> 278.52m, Photo 35!)
        const xm = 0.5 * (xa + xb);
        wood.addStrut(cPt(xa, 278.16, 5.56), cPt(xm, 278.38, 5.56), 0.055, 0.07);
        wood.addStrut(cPt(xm, 278.38, 5.56), cPt(xb, 278.16, 5.56), 0.055, 0.07);
      }
      for (const up of [uC0, uMid, uC1]) {
        wood.addStrut(cPt(up, 276.15, 5.56), cPt(up, 278.50, 5.56), 0.085, 0.085, [1, 0, 0]);
      }
      wood.addStrut(cPt(uC0 - 0.05, 278.48, 5.57), cPt(uC1 + 0.05, 278.48, 5.57), 0.095, 0.10);
    }
  }

  return mb.buildGroup('z4_floor3_pavilion_glazing');
}

/**
 * Build Gustave Eiffel's Private Apartment & Aerodynamic Laboratories (+278.71 -> +280.98m, 10.00m x 10.00m).
 * Matches Pl. 65 Fig. 3, Pl. 53 Fig. 20 & Photo 44: recessed glass1889 windows, moulded wood frames/mullions,
 * vertical wainscoting dado strips, and bracketed eave cornice trim.
 */
function buildEiffelApartment(THREE, materials) {
  const mb = new MultiBatch(THREE, materials);
  const pri = mb.get('ironPrimary');
  const lat = mb.get('ironLattice');
  const cast = mb.get('ironCast');
  const gold = mb.get('goldAccent');
  const globe = mb.get('lampGlobe1889');
  const wood = mb.get('woodPavilion');
  const glass = mb.get('glass1889');

  const yFloor = 278.71;
  const yEave = 280.98;
  const yRidge = 281.24;
  const hs = 5.0;
  const wallHs = 4.92;

  // 4 Vertical Corner Iron Columns (Arbalétriers C continuing through apartment)
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    pri.addAxisBox(sx * 4.82, (yFloor + yEave) * 0.5, sz * 4.82, 0.36, yEave - yFloor, 0.36);
  }

  // 4 Architectural Wood Walls with Punched Recessed Windows, Moulded Wood Frames, Vertical Wainscoting & Cornice Dentils
  const winCenters = [-3.45, -1.15, 1.15, 3.45];
  const wy0 = yFloor + 0.94; // 279.65m dado height
  const wy1 = yFloor + 1.92; // 280.63m window head
  const hw = 0.44;
  const pierSegs = [[-4.72, -3.89], [-3.01, -1.59], [-0.71, 0.71], [1.59, 3.01], [3.89, 4.72]];

  for (let f = 0; f < 4; f++) {
    const pt = (u, y, r = wallHs) => {
      switch (f) {
        case 0: return [u, y, r];
        case 1: return [-u, y, -r];
        case 2: return [r, y, -u];
        default: return [-r, y, u];
      }
    };

    // Punched exterior & interior wood wall panels (clean open casement window cutouts revealing the furnished interior!)
    wood.addQuad(pt(-4.72, yFloor), pt(4.72, yFloor), pt(4.72, wy0), pt(-4.72, wy0));
    wood.addQuad(pt(4.72, yFloor, wallHs - 0.08), pt(-4.72, yFloor, wallHs - 0.08), pt(-4.72, wy0, wallHs - 0.08), pt(4.72, wy0, wallHs - 0.08));
    wood.addQuad(pt(-4.72, wy1), pt(4.72, wy1), pt(4.72, yEave - 0.10), pt(-4.72, yEave - 0.10));
    for (const [pu0, pu1] of pierSegs) {
      wood.addQuad(pt(pu0, wy0), pt(pu1, wy0), pt(pu1, wy1), pt(pu0, wy1));
      wood.addQuad(pt(pu1, wy0, wallHs - 0.08), pt(pu0, wy0, wallHs - 0.08), pt(pu0, wy1, wallHs - 0.08), pt(pu1, wy1, wallHs - 0.08));
      for (let cy = wy0 + 0.12; cy < wy1 - 0.04; cy += 0.18) {
        wood.addStrut(pt(pu0 + 0.02, cy, wallHs + 0.015), pt(pu1 - 0.02, cy, wallHs + 0.015), 0.024, 0.022);
      }
    }

    // Vertical wainscoting strips (lambris à couvre-joints), plinth skirt, dado chair-rail & bracketed wood cornice trim
    wood.addStrut(pt(-4.72, yFloor + 0.07, wallHs + 0.025), pt(4.72, yFloor + 0.07, wallHs + 0.025), 0.05, 0.14);
    wood.addStrut(pt(-4.72, wy0 - 0.02, wallHs + 0.032), pt(4.72, wy0 - 0.02, wallHs + 0.032), 0.065, 0.055);
    wood.addStrut(pt(-4.72, yEave - 0.14, wallHs + 0.035), pt(4.72, yEave - 0.14, wallHs + 0.035), 0.07, 0.08);
    for (let wu = -4.56; wu <= 4.57; wu += 0.24) {
      wood.addStrut(pt(wu, yFloor + 0.12, wallHs + 0.02), pt(wu, wy0 - 0.04, wallHs + 0.02), 0.030, 0.024, [1, 0, 0]);
    }
    for (let du = -4.56; du <= 4.57; du += 0.38) {
      wood.addStrut(pt(du, yEave - 0.20, wallHs + 0.02), pt(du, yEave - 0.08, wallHs + 0.07), 0.045, 0.055);
    }

    // Iron eave cornice (±5.12m matching Campanile arch legs) + 0.88m-deep horizontal lattice ring girder (280.10..280.98m, Pl. 59 & Pl. 65)
    pri.addStrut(pt(-5.12, yEave - 0.06, 5.10), pt(5.12, yEave - 0.06, 5.10), 0.18, 0.14);
    pri.addQuad(pt(-5.12, yEave, 5.12), pt(5.12, yEave, 5.12), pt(4.82, yEave, 4.82), pt(-4.82, yEave, 4.82));
    pri.addStrut(pt(-4.85, 280.10, 4.68), pt(4.85, 280.10, 4.68), 0.14, 0.12);
    pri.addStrut(pt(-4.85, 280.94, 4.68), pt(4.85, 280.94, 4.68), 0.14, 0.12);
    for (let g = -4; g < 4; g++) {
      const gu0 = g * 1.18, gu1 = (g + 1) * 1.18;
      lat.addStrut(pt(gu0, 280.12, 4.68), pt(gu1, 280.92, 4.68), 0.04, 0.04);
      lat.addStrut(pt(gu1, 280.12, 4.68), pt(gu0, 280.92, 4.68), 0.04, 0.04);
    }

    // Vertical iron pilasters + 4 recessed glass1889 casement windows with deep moulded wood frames & mullions
    for (const up of [-2.3, 0.0, 2.3]) {
      pri.addStrut(pt(up, yFloor, wallHs + 0.035), pt(up, yEave - 0.08, wallHs + 0.035), 0.11, 0.085, [1, 0, 0]);
    }
    const rGlass = wallHs - 0.07;
    const rOuter = wallHs + 0.035;
    for (const wc of winCenters) {
      const uL = wc - hw, uR = wc + hw, wyTrans = wy0 + 0.65;
      // Recessed glass1889 pane + 4 deep wood reveal returns (left/right jambs, sill, head soffit)
      glass.addQuad(pt(uL, wy0, rGlass), pt(uR, wy0, rGlass), pt(uR, wy1, rGlass), pt(uL, wy1, rGlass));
      wood.addQuad(pt(uL, wy0, rOuter), pt(uL, wy0, rGlass), pt(uL, wy1, rGlass), pt(uL, wy1, rOuter));
      wood.addQuad(pt(uR, wy0, rGlass), pt(uR, wy0, rOuter), pt(uR, wy1, rOuter), pt(uR, wy1, rGlass));
      wood.addQuad(pt(uL, wy0, rOuter), pt(uR, wy0, rOuter), pt(uR, wy0, rGlass), pt(uL, wy0, rGlass));
      wood.addQuad(pt(uL, wy1, rGlass), pt(uR, wy1, rGlass), pt(uR, wy1, rOuter), pt(uL, wy1, rOuter));
      // Moulded outer wood architrave, projecting sill, lintel cornice hood, central casement stile, imposte transom & muntins
      wood.addStrut(pt(uL - 0.07, wy0 - 0.02, wallHs + 0.05), pt(uR + 0.07, wy0 - 0.02, wallHs + 0.05), 0.09, 0.055);
      wood.addStrut(pt(uL - 0.09, wy1 + 0.04, wallHs + 0.055), pt(uR + 0.09, wy1 + 0.04, wallHs + 0.055), 0.10, 0.065);
      wood.addStrut(pt(uL - 0.03, wy0, rOuter), pt(uL - 0.03, wy1 + 0.02, rOuter), 0.065, 0.05, [1, 0, 0]);
      wood.addStrut(pt(uR + 0.03, wy0, rOuter), pt(uR + 0.03, wy1 + 0.02, rOuter), 0.065, 0.05, [1, 0, 0]);
      wood.addStrut(pt(wc, wy0, rGlass + 0.02), pt(wc, wy1, rGlass + 0.02), 0.042, 0.045, [1, 0, 0]);
      wood.addStrut(pt(uL, wyTrans, rGlass + 0.02), pt(uR, wyTrans, rGlass + 0.02), 0.042, 0.042);
      for (const mu of [wc - 0.22, wc + 0.22]) {
        wood.addStrut(pt(mu, wy0, rGlass + 0.015), pt(mu, wy1, rGlass + 0.015), 0.024, 0.028, [1, 0, 0]);
      }
      wood.addStrut(pt(uL, wy0 + 0.32, rGlass + 0.015), pt(uR, wy0 + 0.32, rGlass + 0.015), 0.024, 0.026);
    }
  }

  // Low-pitched 4-sided zinc hipped roof (280.98m eaves -> 281.24m center stairwell collar, Pl. 65 Fig. 3 & Pl. 53 Fig. 20)
  const roofCorners = [[-hs, yEave, hs], [hs, yEave, hs], [hs, yEave, -hs], [-hs, yEave, -hs]];
  const innerCollar = [[-0.62, yRidge, 0.62], [0.62, yRidge, 0.62], [0.62, yRidge, -0.62], [-0.62, yRidge, -0.62]];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    pri.addQuad(roofCorners[i], roofCorners[j], innerCollar[j], innerCollar[i]);
  }
  // Central Escalier du Campanile stairwell curb & Pl. 53 Fig. 20 interior salon/laboratory partition walls with doorways
  pri.addFrustum(0, 0, yFloor - 0.12, 0.88, yRidge, 0.88, 16, false, false, 0.14);
  const yPartTop = yEave - 0.12;
  const yDoorHead = yFloor + 1.98;
  for (const sgn of [-1, 1]) {
    for (const dir of [-1, 1]) {
      const a0 = dir * 0.92, d0 = dir * 2.38, d1 = dir * 3.22, a1 = dir * 4.72;
      const [za0, zd0] = a0 < d0 ? [a0, d0] : [d0, a0];
      const [zd1, za1] = d1 < a1 ? [d1, a1] : [a1, d1];
      const [zdl, zdr] = d0 < d1 ? [d0, d1] : [d1, d0];
      wood.addQuad([sgn * 1.72, yFloor, za0], [sgn * 1.72, yFloor, zd0], [sgn * 1.72, yPartTop, zd0], [sgn * 1.72, yPartTop, za0]);
      wood.addQuad([sgn * 1.72, yFloor, zd1], [sgn * 1.72, yFloor, za1], [sgn * 1.72, yPartTop, za1], [sgn * 1.72, yPartTop, zd1]);
      wood.addQuad([sgn * 1.72, yDoorHead, zdl], [sgn * 1.72, yDoorHead, zdr], [sgn * 1.72, yPartTop, zdr], [sgn * 1.72, yPartTop, zdl]);
      wood.addStrut([sgn * 1.72, yFloor, d0], [sgn * 1.72, yDoorHead, d0], 0.08, 0.06, [1, 0, 0]);
      wood.addStrut([sgn * 1.72, yFloor, d1], [sgn * 1.72, yDoorHead, d1], 0.08, 0.06, [1, 0, 0]);

      wood.addQuad([za0, yFloor, sgn * 1.72], [zd0, yFloor, sgn * 1.72], [zd0, yPartTop, sgn * 1.72], [za0, yPartTop, sgn * 1.72]);
      wood.addQuad([zd1, yFloor, sgn * 1.72], [za1, yFloor, sgn * 1.72], [za1, yPartTop, sgn * 1.72], [zd1, yPartTop, sgn * 1.72]);
      wood.addQuad([zdl, yDoorHead, sgn * 1.72], [zdr, yDoorHead, sgn * 1.72], [zdr, yPartTop, sgn * 1.72], [zdl, yPartTop, sgn * 1.72]);
      wood.addStrut([d0, yFloor, sgn * 1.72], [d0, yDoorHead, sgn * 1.72], 0.06, 0.08, [1, 0, 0]);
      wood.addStrut([d1, yFloor, sgn * 1.72], [d1, yDoorHead, sgn * 1.72], 0.06, 0.08, [1, 0, 0]);
    }
  }

  // Interior Furnishings & Scientific Instruments of Logement de M. Eiffel (Pl. 53 Fig. 20, visible through glass1889!)
  const addSalonChair = (cx, cz, faceAng = 0) => {
    const ca = Math.cos(faceAng), sa = Math.sin(faceAng);
    const cPt = (lx, ly, lz) => [cx + lx * ca + lz * sa, yFloor + ly, cz - lx * sa + lz * ca];
    wood.addStrut(cPt(-0.24, 0.46, 0), cPt(0.24, 0.46, 0), 0.48, 0.05);
    for (const [lx, lz] of [[-0.21, -0.20], [0.21, -0.20], [-0.21, 0.20], [0.21, 0.20]]) {
      wood.addStrut(cPt(lx, 0.02, lz), cPt(lx, 0.46, lz), 0.045, 0.045, [1, 0, 0]);
    }
    wood.addStrut(cPt(-0.22, 0.46, -0.21), cPt(-0.22, 1.18, -0.24), 0.05, 0.05, [1, 0, 0]);
    wood.addStrut(cPt(0.22, 0.46, -0.21), cPt(0.22, 1.18, -0.24), 0.05, 0.05, [1, 0, 0]);
    wood.addQuad(cPt(-0.21, 0.56, -0.22), cPt(0.21, 0.56, -0.22), cPt(0.21, 1.14, -0.24), cPt(-0.21, 1.14, -0.24));
    wood.addStrut(cPt(-0.25, 1.17, -0.24), cPt(0.25, 1.17, -0.24), 0.06, 0.06);
    for (const lx of [-0.23, 0.23]) {
      wood.addStrut(cPt(lx, 0.68, -0.21), cPt(lx, 0.66, 0.18), 0.045, 0.04);
      wood.addStrut(cPt(lx, 0.46, 0.18), cPt(lx, 0.66, 0.18), 0.04, 0.04, [1, 0, 0]);
    }
  };

  // 1. SE Salon (+Z): Gustave Eiffel's oak bureau à cylindre writing desk, banker's lamp, armchairs, parlor table & bookshelves
  wood.addAxisBox(2.95, yFloor + 0.76, 3.55, 1.58, 0.06, 0.86);
  wood.addAxisBox(2.38, yFloor + 0.39, 3.55, 0.42, 0.72, 0.78);
  wood.addAxisBox(3.52, yFloor + 0.39, 3.55, 0.42, 0.72, 0.78);
  wood.addAxisBox(2.95, yFloor + 1.03, 3.36, 1.52, 0.48, 0.34);
  wood.addAxisBox(2.95, yFloor + 1.29, 3.36, 1.58, 0.05, 0.38);
  gold.addFrustum(3.32, 3.40, yFloor + 1.31, 0.07, yFloor + 1.48, 0.025, 10, true, false);
  globe.addFrustum(3.32, 3.40, yFloor + 1.46, 0.13, yFloor + 1.56, 0.04, 12, false, true);
  addSalonChair(2.95, 2.58, 0);
  addSalonChair(1.98, 3.50, 0.45 * Math.PI);

  // Parlor round table & companion chairs in SW-SE Salon bay (-X/+Z)
  wood.addFrustum(-2.90, 3.45, yFloor + 0.74, 0.58, yFloor + 0.79, 0.58, 16, true, true);
  wood.addFrustum(-2.90, 3.45, yFloor + 0.04, 0.28, yFloor + 0.74, 0.10, 12, true, false);
  gold.addFrustum(-2.90, 3.45, yFloor + 0.79, 0.08, yFloor + 1.18, 0.03, 10, true, false);
  globe.addFrustum(-2.90, 3.45, yFloor + 1.16, 0.14, yFloor + 1.36, 0.14, 12, true, true);
  addSalonChair(-3.76, 3.45, 0.5 * Math.PI);
  addSalonChair(-2.04, 3.45, -0.5 * Math.PI);

  // Glazed oak bibliothèques (bookshelves) along z = 1.84m Salon inner walls
  for (const bx of [-3.25, 3.25]) {
    wood.addAxisBox(bx, yFloor + 1.04, 1.86, 2.10, 2.04, 0.32);
    for (const sy of [0.52, 0.92, 1.30, 1.66, 2.04]) {
      wood.addAxisBox(bx, yFloor + sy, 1.88, 2.16, 0.04, 0.36);
    }
    gold.addAxisBox(bx - 0.38, yFloor + 1.10, 1.98, 0.68, 0.24, 0.16);
    cast.addAxisBox(bx + 0.42, yFloor + 1.48, 1.98, 0.72, 0.24, 0.16);
  }

  // 2. NW & SW Aerodynamic / Meteorological Laboratories (-Z & -X): Mercury Barometer/Manometer Stand & Instrument Benches
  cast.addFrustum(-2.95, -3.55, yFloor + 0.02, 0.32, yFloor + 0.55, 0.11, 12, true, true);
  cast.addAxisBox(-2.95, yFloor + 1.24, -3.55, 0.18, 1.44, 0.14);
  gold.addFrustum(-2.95, -3.55, yFloor + 0.56, 0.045, yFloor + 1.98, 0.040, 12, false, true);
  globe.addAxisBox(-2.95, yFloor + 1.42, -3.55, 0.28, 0.28, 0.16);
  gold.addAxisBox(-2.95, yFloor + 1.78, -3.55, 0.24, 0.24, 0.16);

  // NW Recording Barograph / Wind-Pressure Bench (+X/-Z)
  wood.addAxisBox(2.90, yFloor + 0.86, -3.55, 1.68, 0.06, 0.74);
  for (const [lx, lz] of [[2.16, -3.84], [3.64, -3.84], [2.16, -3.26], [3.64, -3.26]]) {
    cast.addStrut([lx, yFloor + 0.02, lz], [lx, yFloor + 0.86, lz], 0.055, 0.055, [1, 0, 0]);
  }
  gold.addFrustum(2.55, -3.55, yFloor + 0.89, 0.15, yFloor + 1.32, 0.15, 14, true, true);
  cast.addAxisBox(3.25, -3.55 ? yFloor + 1.02 : 0, -3.55, 0.42, 0.26, 0.32);
  gold.addStrut([2.85, yFloor + 1.36, -3.55], [3.58, yFloor + 1.48, -3.55], 0.07, 0.07);
  gold.addStrut([3.22, yFloor + 0.89, -3.55], [3.22, yFloor + 1.62, -3.55], 0.04, 0.04, [1, 0, 0]);

  // SW Optical & Chemical Bench (-X) + NE Inclined Architect's Drafting Table (+X)
  wood.addAxisBox(-3.65, yFloor + 0.86, 0.0, 0.72, 0.06, 1.72);
  for (const lz of [-0.76, 0.76]) {
    cast.addStrut([-3.92, yFloor + 0.02, lz], [-3.92, yFloor + 0.86, lz], 0.05, 0.05, [1, 0, 0]);
    cast.addStrut([-3.38, yFloor + 0.02, lz], [-3.38, yFloor + 0.86, lz], 0.05, 0.05, [1, 0, 0]);
    gold.addStrut([-3.65, yFloor + 0.89, lz * 0.65], [-3.65, yFloor + 1.68, lz * 0.65], 0.038, 0.038, [1, 0, 0]);
  }
  gold.addStrut([-3.65, yFloor + 1.62, -0.55], [-3.65, yFloor + 1.62, 0.55], 0.05, 0.05);
  glass.addFrustum(-3.65, 0.0, yFloor + 0.90, 0.13, yFloor + 1.46, 0.13, 14, true, true);

  // NE Inclined Drafting Table (+X facing NE windows)
  wood.addQuad([3.28, yFloor + 0.94, -0.82], [3.28, yFloor + 0.94, 0.82], [4.04, yFloor + 1.18, 0.82], [4.04, yFloor + 1.18, -0.82]);
  for (const lz of [-0.72, 0.72]) {
    wood.addStrut([3.34, yFloor + 0.02, lz], [3.34, yFloor + 0.94, lz], 0.06, 0.06, [1, 0, 0]);
    wood.addStrut([3.98, yFloor + 0.02, lz], [3.98, yFloor + 1.16, lz], 0.06, 0.06, [1, 0, 0]);
  }
  gold.addStrut([3.96, yFloor + 1.18, 0.55], [3.66, yFloor + 1.52, 0.55], 0.032, 0.032);
  globe.addFrustum(3.62, 0.55, yFloor + 1.44, 0.11, yFloor + 1.52, 0.035, 10, false, true);

  // 1. Interior/Terrace straight iron stair from 3e Étage (+276.13m) to Logement promenade (+278.71m, Pl. 65 Fig. 3)
  const xLow0 = 1.45, xLow1 = 3.55, zLow = 4.42;
  for (const dz of [-0.26, 0.26]) {
    pri.addStrut([xLow0, 276.13, zLow + dz], [xLow1, yFloor, zLow + dz], 0.055, 0.15);
    lat.addStrut([xLow0, 276.13 + 0.90, zLow + dz], [xLow1, yFloor + 0.90, zLow + dz], 0.032, 0.032);
  }
  for (let s = 0; s <= 11; s++) {
    const t = s / 11;
    const lx = lerp(xLow0, xLow1, t), ly = lerp(276.18, yFloor, t);
    lat.addStrut([lx, ly, zLow - 0.25], [lx, ly, zLow + 0.25], 0.17, 0.034);
    if (s % 2 === 0) {
      lat.addStrut([lx, ly, zLow + 0.26], [lx, ly + 0.90, zLow + 0.26], 0.026, 0.026, [1, 0, 0]);
    }
  }

  // 2. Exterior Logement terrace stair (+278.71 -> +280.98m on +X side, outer stringer & cage at x=+5.46m, z=+2.85..+4.80m, Pl. 65 Fig. 3!)
  const sxIn = 4.96, sxOut = 5.46, szBot = 2.85, szLand0 = 4.18, szLand1 = 4.80;
  pri.addStrut([sxIn, yFloor, szBot], [sxIn, yEave, szLand0], 0.06, 0.16);
  pri.addStrut([sxOut, yFloor, szBot], [sxOut, yEave, szLand0], 0.06, 0.16);
  lat.addStrut([sxOut, yFloor + 0.45, szBot], [sxOut, yEave + 0.45, szLand0], 0.032, 0.032);
  pri.addStrut([sxOut, yFloor + 0.90, szBot], [sxOut, yEave + 0.90, szLand0], 0.038, 0.038);
  for (let s = 0; s <= 10; s++) {
    const t = s / 10;
    const sy = lerp(yFloor + 0.08, yEave, t);
    const sz = lerp(szBot, szLand0, t);
    lat.addStrut([sxIn, sy, sz], [sxOut, sy, sz], 0.18, 0.036);
    lat.addStrut([sxOut, sy, sz], [sxOut, sy + 0.90, sz], 0.028, 0.028, [1, 0, 0]);
  }
  // Top corner landing at +280.98m (z = 4.18..4.80m, x = 4.96..5.46m) feeding directly onto SE Campanile arch-side stair!
  pri.addAxisBox(0.5 * (sxIn + sxOut), yEave - 0.05, 0.5 * (szLand0 + szLand1), sxOut - sxIn + 0.04, 0.10, szLand1 - szLand0);
  for (const lz of [szLand0, 0.5 * (szLand0 + szLand1), szLand1]) {
    pri.addStrut([sxOut, yEave, lz], [sxOut, yEave + 0.90, lz], 0.034, 0.034, [1, 0, 0]);
  }
  for (const dh of [0.30, 0.60, 0.90]) {
    lat.addStrut([sxOut, yEave + dh, szLand0], [sxOut, yEave + dh, szLand1], 0.03, 0.03);
    lat.addStrut([sxIn, yEave + dh, szLand1], [sxOut, yEave + dh, szLand1], 0.03, 0.03);
  }

  const aptGroup = mb.buildGroup('z4_eiffel_apartment');

  // Warm oak parquet floor slab inside ±4.90m around the r = 0.88m central stairwell (tagged isWoodDecking = true)
  const aptFloorBatch = new MeshBatch();
  const nApt = 20;
  const halfApt = 4.90;
  for (let ix = 0; ix < nApt; ix++) {
    const x0 = -halfApt + (ix / nApt) * (2 * halfApt);
    const x1 = -halfApt + ((ix + 1) / nApt) * (2 * halfApt);
    const xm = 0.5 * (x0 + x1);
    for (let iz = 0; iz < nApt; iz++) {
      const z0 = -halfApt + (iz / nApt) * (2 * halfApt);
      const z1 = -halfApt + ((iz + 1) / nApt) * (2 * halfApt);
      const zm = 0.5 * (z0 + z1);
      if (xm * xm + zm * zm < 0.84 * 0.84) continue;
      aptFloorBatch.addQuad([x0, yFloor + 0.02, z1], [x1, yFloor + 0.02, z1], [x1, yFloor + 0.02, z0], [x0, yFloor + 0.02, z0]);
    }
  }
  aptFloorBatch.addFrustum(0, 0, yFloor + 0.02, 1.12, yFloor + 0.035, 1.12, 18, false, true, 0.24);
  const aptFloorGeom = aptFloorBatch.toBufferGeometry(THREE);
  if (aptFloorGeom) {
    const aptFloorMesh = new THREE.Mesh(aptFloorGeom, materials.woodPavilion || materials.ironPrimary);
    aptFloorMesh.name = 'z4_eiffel_apartment_interiorFloorWood';
    aptFloorMesh.userData.isWoodDecking = true;
    aptGroup.add(aptFloorMesh);
  }

  return aptGroup;
}

/**
 * Build Campanile Lower 4.60m Straight Legs, 2-Tier Lattice Screen & "4 Contrefiches" (+280.98 -> +285.58m),
 * 4 Open ~1.00m-Deep Curved Diagonal Lattice Arches (+285.58 -> +292.95m, exact Pl. 59 Fig. 4 & Pl. 65 Fig. 3),
 * & Continuous Central 1.20m Helical Staircase (+276.13 -> +293.215m).
 */
function buildCampanileArchesAndStair(THREE, materials) {
  const mb = new MultiBatch(THREE, materials);
  const pri = mb.get('ironPrimary');
  const lat = mb.get('ironLattice');
  const cast = mb.get('ironCast');

  const yBase = 280.98;
  const ySpring = 285.58; // Parties droites des poutres en diagonale: 4.60m (Pl. 59 Fig. 4 E & Pl. 65 Fig. 3)
  const yCrown = 292.95;  // Plate-forme du Phare soffit
  const xLegOut = 4.86;   // outer chord center (projected ±5.08m with halfRibW=0.26m, matching Pl. 59 5.04m!)
  const xLegIn = 3.84;    // inner chord center (~1.02m axis depth = 1.44m projected truss depth, matching Pl. 59 3.60m!)

  // 1. Lower 4.60m Straight Diagonal Box Legs ("Parties droites des poutres en diagonale")
  //    + "4 Contrefiches des poutres en diagonale"
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const px = -sz * INV_SQRT2;
    const pz = sx * INV_SQRT2;
    const hw = 0.26;

    const legRing = (y) => [
      [sx * xLegOut + px * hw, y, sz * xLegOut + pz * hw],
      [sx * xLegOut - px * hw, y, sz * xLegOut - pz * hw],
      [sx * xLegIn - px * hw, y, sz * xLegIn - pz * hw],
      [sx * xLegIn + px * hw, y, sz * xLegIn + pz * hw],
    ];

    const nLegSegs = 6;
    for (let s = 0; s < nLegSegs; s++) {
      const rA = legRing(lerp(yBase, ySpring, s / nLegSegs));
      const rB = legRing(lerp(yBase, ySpring, (s + 1) / nLegSegs));
      for (let c = 0; c < 4; c++) {
        pri.addStrut(rA[c], rB[c], 0.088, 0.088, [1, 0, 0]);
        const cn = (c + 1) % 4;
        lat.addStrut(rB[c], rB[cn], 0.045, 0.045);
        lat.addStrut(rA[c], rB[cn], 0.042, 0.042);
        lat.addStrut(rA[cn], rB[c], 0.042, 0.042);
      }
    }

    // Heavy 3D laced box-lattice raking "Contrefiche de la poutre en diagonale"
    // Sloping from central collar (0.52m, 281.04m) up to arch springing (4.42m, 285.50m)
    const nCf = 7;
    const cfRing = (t) => {
      const xr = lerp(0.52, 4.42, t);
      const yr = lerp(yBase + 0.06, ySpring - 0.08, t);
      const dHalf = 0.20;
      const wHalf = 0.22;
      return [
        [sx * (xr - dHalf) + px * wHalf, yr + dHalf, sz * (xr - dHalf) + pz * wHalf],
        [sx * (xr - dHalf) - px * wHalf, yr + dHalf, sz * (xr - dHalf) - pz * wHalf],
        [sx * (xr + dHalf) - px * wHalf, yr - dHalf, sz * (xr + dHalf) - pz * wHalf],
        [sx * (xr + dHalf) + px * wHalf, yr - dHalf, sz * (xr + dHalf) + pz * wHalf],
      ];
    };
    for (let s = 0; s < nCf; s++) {
      const cA = cfRing(s / nCf);
      const cB = cfRing((s + 1) / nCf);
      for (let c = 0; c < 4; c++) {
        pri.addStrut(cA[c], cB[c], 0.082, 0.082);
        const cn = (c + 1) % 4;
        lat.addStrut(cB[c], cB[cn], 0.04, 0.04);
        lat.addStrut(cA[c], cB[cn], 0.036, 0.036);
        lat.addStrut(cA[cn], cB[c], 0.036, 0.036);
      }
    }
    pri.addStrut([sx * 0.55, yBase + 0.08, sz * 0.55], [sx * xLegIn, yBase + 0.08, sz * xLegIn], 0.14, 0.16);
  }

  // Full 2-tier 280.98..285.58m vertical face double-diamond lattice screen + laced sub-belts & E—F collar girder (Pl. 65 Fig. 3, Pl. 59 Fig. 4 & Photo 44!)
  const spanU = 4.66;
  const ySillTop = 281.36;
  const yMidBot = 283.36;
  const yMidTop = 283.68;
  const yFriezeBot = 284.93;
  const yFriezeTop = 285.42;
  for (let f = 0; f < 4; f++) {
    const fp = (u, y, r = 4.90) => {
      switch (f) {
        case 0: return [u, y, r];
        case 1: return [-u, y, -r];
        case 2: return [r, y, -u];
        default: return [-r, y, u];
      }
    };

    // Laced bottom sill belt (281.04..281.36m), laced mid-tier girder (283.36..283.68m), laced top frieze belt (284.93..285.42m), & E—F collar fascia (285.58..286.06m)
    const yCollarTop = 286.06;
    pri.addStrut(fp(-spanU, yBase + 0.06, 4.92), fp(spanU, yBase + 0.06, 4.92), 0.12, 0.14);
    lat.addStrut(fp(-spanU, ySillTop, 4.89), fp(spanU, ySillTop, 4.89), 0.06, 0.065);
    pri.addStrut(fp(-spanU, yMidBot, 4.89), fp(spanU, yMidBot, 4.89), 0.075, 0.075);
    pri.addStrut(fp(-spanU, yMidTop, 4.89), fp(spanU, yMidTop, 4.89), 0.075, 0.075);
    pri.addStrut(fp(-spanU, yFriezeBot, 4.90), fp(spanU, yFriezeBot, 4.90), 0.085, 0.085);
    pri.addStrut(fp(-spanU, yFriezeTop, 4.90), fp(spanU, yFriezeTop, 4.90), 0.085, 0.085);
    for (let b = -8; b < 8; b++) {
      const bu0 = b * (spanU / 8), bu1 = (b + 1) * (spanU / 8);
      lat.addStrut(fp(bu0, yBase + 0.08, 4.89), fp(bu1, ySillTop, 4.89), 0.032, 0.032);
      lat.addStrut(fp(bu1, yBase + 0.08, 4.89), fp(bu0, ySillTop, 4.89), 0.032, 0.032);
      lat.addStrut(fp(bu0, yMidBot, 4.89), fp(bu1, yMidTop, 4.89), 0.034, 0.034);
      lat.addStrut(fp(bu1, yMidBot, 4.89), fp(bu0, yMidTop, 4.89), 0.034, 0.034);
      lat.addStrut(fp(bu0, yFriezeBot, 4.90), fp(bu1, yFriezeTop, 4.90), 0.038, 0.038);
      lat.addStrut(fp(bu1, yFriezeBot, 4.90), fp(bu0, yFriezeTop, 4.90), 0.038, 0.038);
    }

    pri.addQuad(fp(-4.85, ySpring, 4.88), fp(4.85, ySpring, 4.88), fp(4.85, yCollarTop, 4.88), fp(-4.85, yCollarTop, 4.88));
    pri.addStrut(fp(-5.00, ySpring + 0.08, 4.95), fp(5.00, ySpring + 0.08, 4.95), 0.16, 0.16);
    pri.addStrut(fp(-4.88, yCollarTop - 0.04, 4.90), fp(4.88, yCollarTop - 0.04, 4.90), 0.14, 0.08);
    // Collar deck walkway rim & stiffeners at Y = 286.06m (exposing open lattice triangles below 285.58m!)
    pri.addQuad(fp(-4.86, yCollarTop, 3.82), fp(4.86, yCollarTop, 3.82), fp(4.86, yCollarTop, 4.88), fp(-4.86, yCollarTop, 4.88));
    if (f < 2) {
      const zBearer = f === 0 ? 1.85 : -1.85;
      pri.addAxisBox(0, 0.5 * (ySpring + yCollarTop), zBearer, 7.60, 0.48, 0.18);
    }

    // Vertical framing mullions (u = ±0.58m & ±2.33m, Photo 44 & Pl. 65) + bold V-raker chords framing the Contrefiches
    for (const um of [-2.33, -0.58, 0.58, 2.33]) {
      pri.addStrut(fp(um, yBase + 0.06, 4.88), fp(um, ySpring, 4.88), 0.075, 0.075, [1, 0, 0]);
    }
    pri.addStrut(fp(0, yBase + 0.08, 4.80), fp(-4.52, ySpring - 0.04, 4.80), 0.19, 0.20);
    pri.addStrut(fp(0, yBase + 0.08, 4.80), fp(4.52, ySpring - 0.04, 4.80), 0.19, 0.20);

    // Exact 16-subbay (0.5825m half-pitch) double-trellis 45° X-lattice bars across 281.36..284.93m (Pl. 65 Fig. 3 & Photo 44!)
    const halfPitch = 0.5825;
    const runSpan = 6 * halfPitch; // 3.495m horizontal run over 3.57m height (~45.6°)
    const slopeDY = (yFriezeBot - ySillTop) / runSpan;
    for (let k = -14; k <= 14; k++) {
      const uNode = k * halfPitch;
      const barW = k % 2 === 0 ? 0.064 : 0.048;
      for (const dir of [-1, 1]) {
        const u0c = clamp(uNode, -spanU, spanU);
        const u1c = clamp(uNode + dir * runSpan, -spanU, spanU);
        if (Math.abs(u1c - u0c) > 0.22) {
          const y0c = ySillTop + ((u0c - uNode) * dir) * slopeDY;
          const y1c = ySillTop + ((u1c - uNode) * dir) * slopeDY;
          if (Math.abs(y1c - y0c) > 0.22) {
            lat.addStrut(fp(u0c, y0c, 4.89), fp(u1c, y1c, 4.89), barW, 0.048);
          }
        }
      }
    }
  }

  // 2. 4 Open ~1.00m-Deep Curved 3D Box-Lattice Campanile Diagonal Arch Girders (Y = 285.58 -> 292.95m)
  //    Calibrated knot-for-knot to Pl. 59 Fig. 4 & Pl. 65 Fig. 3 (<0.04m extrados & intrados error!):
  const archKnots = [
    // [y, xo_center, xi_center]  (with halfRibW*INV_SQRT2 ≈ 0.18..0.13m -> exact r_ext & r_int!)
    [285.58, 4.86, 3.84],
    [286.50, 4.83, 3.81],
    [287.50, 4.72, 3.74],
    [288.50, 4.53, 3.52],
    [289.50, 4.24, 3.12],
    [290.50, 3.79, 2.50],
    [291.00, 3.48, 2.01],
    [291.50, 3.07, 1.66],
    [292.00, 2.56, 1.25],
    [292.50, 2.04, 0.82],
    [292.95, 1.58, 0.55],
  ];
  const sampleArch = (y) => {
    if (y <= archKnots[0][0]) return [archKnots[0][1], archKnots[0][2]];
    for (let k = 0; k < archKnots.length - 1; k++) {
      const [y0, xo0, xi0] = archKnots[k];
      const [y1, xo1, xi1] = archKnots[k + 1];
      if (y <= y1) {
        const u = (y - y0) / (y1 - y0);
        return [lerp(xo0, xo1, u), lerp(xi0, xi1, u)];
      }
    }
    const last = archKnots[archKnots.length - 1];
    return [last[1], last[2]];
  };

  const crownVaultKnots = [
    [290.70, 2.34],
    [291.05, 1.82],
    [291.35, 1.32],
    [291.55, 0.78],
    [291.65, 0.24],
  ];

  const nArchSegs = 18;
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const px = -sz * INV_SQRT2;
    const pz = sx * INV_SQRT2;

    const ringNodes = [];
    for (let i = 0; i <= nArchSegs; i++) {
      const y = lerp(ySpring, yCrown, i / nArchSegs);
      const [xo, xi] = sampleArch(y);
      const halfRibW = lerp(0.26, 0.18, i / nArchSegs);
      ringNodes.push([
        [sx * xo + px * halfRibW, y, sz * xo + pz * halfRibW],
        [sx * xo - px * halfRibW, y, sz * xo - pz * halfRibW],
        [sx * xi - px * halfRibW, y, sz * xi - pz * halfRibW],
        [sx * xi + px * halfRibW, y, sz * xi + pz * halfRibW],
      ]);
    }

    for (let i = 0; i < nArchSegs; i++) {
      const rA = ringNodes[i];
      const rB = ringNodes[i + 1];
      for (let c = 0; c < 4; c++) {
        pri.addStrut(rA[c], rB[c], 0.085, 0.085);
      }
      // Radial struts & crisp Warren/X web lacing across the ~1.00m radial truss depth (Pl. 59 Fig. 4!)
      for (let c = 0; c < 4; c++) {
        const cn = (c + 1) % 4;
        lat.addStrut(rB[c], rB[cn], 0.048, 0.048);
        lat.addStrut(rA[c], rB[cn], 0.044, 0.044);
        lat.addStrut(rA[cn], rB[c], 0.044, 0.044);
      }
    }

    // Curved inner crown vault intrados gussets (290.70..291.65m) & vertical spandrel web up to 292.95m (Pl. 59 Fig. 4 & Pl. 65 Fig. 3!)
    for (const sgnW of [-0.14, 0.14]) {
      for (let k = 0; k < crownVaultKnots.length - 1; k++) {
        const [ya, xa] = crownVaultKnots[k];
        const [yb, xb] = crownVaultKnots[k + 1];
        const pA = [sx * xa + px * sgnW, ya, sz * xa + pz * sgnW];
        const pB = [sx * xb + px * sgnW, yb, sz * xb + pz * sgnW];
        pri.addStrut(pA, pB, 0.075, 0.075);
        if (k > 0) {
          const [, xiA] = sampleArch(ya);
          lat.addStrut(pA, [sx * xa + px * sgnW, Math.min(292.94, ya + (xiA - xa) * 1.15), sz * xa + pz * sgnW], 0.045, 0.045, [1, 0, 0]);
        }
      }
    }
    for (const [xv, yBotV] of [[0.52, 291.60], [0.95, 291.48], [1.42, 291.28]]) {
      pri.addStrut([sx * xv, yBotV, sz * xv], [sx * xv, 292.95, sz * xv], 0.055, 0.055, [1, 0, 0]);
    }
    lat.addStrut([sx * 0.24, 291.65, sz * 0.24], [sx * 0.95, 292.45, sz * 0.95], 0.045, 0.045);
    lat.addStrut([sx * 0.95, 291.48, sz * 0.95], [sx * 0.24, 292.45, sz * 0.24], 0.045, 0.045);

    // Outer vertical support standards under Plate-forme du Phare G—H corners (±2.19m, Pl. 59 Fig. 4!)
    pri.addStrut([sx * 2.19, 292.30, sz * 2.19], [sx * 2.19, 292.965, sz * 2.19], 0.068, 0.068, [1, 0, 0]);
    pri.addStrut([sx * 1.62, 292.88, sz * 1.62], [sx * 2.19, 292.965, sz * 2.19], 0.055, 0.055);

    // 3. "Escalier établi sur le côté de la poutre en diagonale continue" (Pl. 65 Fig. 3, Pl. 66 Fig. 4, Photo 44 & Photo 18!)
    //    Open stepped exterior service stairway climbing Y = 280.98 -> 292.95m (normal projection <= 0.46m -> ±5.48m max width).
    const evalStairFrame = (y) => {
      if (y <= ySpring) return [xLegOut, 1.0, 0.0];
      const [xo] = sampleArch(y);
      const [xoA] = sampleArch(Math.max(ySpring, y - 0.05));
      const [xoB] = sampleArch(Math.min(yCrown, y + 0.05));
      const dxoDy = (xoB - xoA) / (Math.min(yCrown, y + 0.05) - Math.max(ySpring, y - 0.05));
      const invLen = 1.0 / Math.hypot(1.0, dxoDy);
      return [xo, invLen, -dxoDy * invLen];
    };
    const wSt = 0.21;
    const hStr = 0.04, hMid = 0.25, hRail = 0.455;
    const nExtSteps = 52;
    let prevSt = null;
    for (let i = 0; i <= nExtSteps; i++) {
      const y = lerp(yBase, yCrown, i / nExtSteps);
      const [xo, nu, ny] = evalStairFrame(y);
      const mkPair = (hOff) => {
        const xc = xo + hOff * nu;
        const yc = y + hOff * ny;
        return [
          [sx * xc + px * wSt, yc, sz * xc + pz * wSt],
          [sx * xc - px * wSt, yc, sz * xc - pz * wSt],
        ];
      };
      const curSt = { s0: mkPair(hStr), s1: mkPair(hMid), s2: mkPair(hRail) };

      if (i < nExtSteps) {
        // Horizontal stepped iron tread
        const xt = xo + 0.16 * nu, yt = y + 0.05 * ny;
        lat.addStrut(
          [sx * xt + px * wSt, yt, sz * xt + pz * wSt],
          [sx * xt - px * wSt, yt, sz * xt - pz * wSt],
          0.17,
          0.032
        );
      }
      if (i % 2 === 0) {
        for (let side = 0; side < 2; side++) {
          lat.addStrut(curSt.s0[side], curSt.s2[side], 0.028, 0.028);
        }
      }
      if (prevSt) {
        for (let side = 0; side < 2; side++) {
          pri.addStrut(prevSt.s0[side], curSt.s0[side], 0.042, 0.075);
          lat.addStrut(prevSt.s1[side], curSt.s1[side], 0.028, 0.028);
          pri.addStrut(prevSt.s2[side], curSt.s2[side], 0.036, 0.036);
          if (i % 2 === 0) {
            lat.addStrut(prevSt.s0[side], curSt.s2[side], 0.022, 0.022);
          }
        }
      }
      prevSt = curSt;
    }

    // Top arched safety portal hoop at Phare balcony arrival (+292.95 -> +294.20m, Photo 44!)
    const xGate = 1.56;
    const gL = [sx * xGate + px * wSt, 292.96, sz * xGate + pz * wSt];
    const gR = [sx * xGate - px * wSt, 292.96, sz * xGate - pz * wSt];
    const gLt = [gL[0], 293.98, gL[2]];
    const gRt = [gR[0], 293.98, gR[2]];
    pri.addStrut(gL, gLt, 0.036, 0.036, [1, 0, 0]);
    pri.addStrut(gR, gRt, 0.036, 0.036, [1, 0, 0]);
    lat.addStrut([gL[0], 293.22, gL[2]], gRt, 0.024, 0.024);
    lat.addStrut([gR[0], 293.22, gR[2]], gLt, 0.024, 0.024);
    for (let a = 0; a < 6; a++) {
      const a0 = (a / 6) * Math.PI, a1 = ((a + 1) / 6) * Math.PI;
      const c0 = Math.cos(a0) * wSt, s0 = Math.sin(a0) * 0.21;
      const c1 = Math.cos(a1) * wSt, s1 = Math.sin(a1) * 0.21;
      pri.addStrut(
        [sx * xGate + px * c0, 293.98 + s0, sz * xGate + pz * c0],
        [sx * xGate + px * c1, 293.98 + s1, sz * xGate + pz * c1],
        0.032,
        0.032
      );
    }
  }

  // "Cinq blocs de fonte de 20x20" calibrated wind-gauge blocks atop +286.06m E—F collar deck (pixel-scanned Pl. 59 Fig. 4!)
  for (const [xGrp, pitch] of [[2.25, 0.21], [-3.23, 0.21]]) {
    cast.addAxisBox(xGrp, 286.13, -4.35, 1.12, 0.14, 0.32);
    for (let b = 0; b < 5; b++) {
      cast.addAxisBox(xGrp + (b - 2) * pitch, 286.29, -4.35, 0.13, 0.18, 0.20);
    }
  }
  cast.addAxisBox(-1.81, 286.21, -4.35, 0.44, 0.28, 0.26);

  // Central crown soffit truss & collar ring under Plate-forme du Phare uniting all 4 arches (Y=292.35..292.965m, Pl. 59 Fig. 4)
  pri.addFrustum(0, 0, 292.45, 1.32, 292.965, 1.98, 16, false, false, 0.16);
  lat.addFrustum(0, 0, 291.62, 0.32, 292.45, 1.32, 16, false, false, 0.06);

  // Single authentic 1.200m-railed intermediate rest landing on Escalier du Campanile (+X side, xOuter=1.15m clear of "1.200" text, Pl. 59 Fig. 4!)
  const yPal = 289.85;
  const xOuter = 1.15;
  pri.addAxisBox(0.75, yPal - 0.05, 0.0, xOuter - 0.34, 0.10, 0.90);
  pri.addStrut([0.24, yPal - 0.48, -0.42], [xOuter - 0.03, yPal - 0.08, -0.42], 0.05, 0.07);
  pri.addStrut([0.24, yPal - 0.48, 0.42], [xOuter - 0.03, yPal - 0.08, 0.42], 0.05, 0.07);
  for (const [px, pz] of [[xOuter, -0.44], [xOuter, 0.44], [0.40, -0.44], [0.40, 0.44]]) {
    pri.addStrut([px, yPal, pz], [px, yPal + 1.20, pz], 0.036, 0.036, [1, 0, 0]);
  }
  for (const ry of [yPal + 0.30, yPal + 0.60, yPal + 0.90, yPal + 1.20]) {
    lat.addStrut([xOuter, ry, -0.44], [xOuter, ry, 0.44], 0.03, 0.03);
    lat.addStrut([xOuter, ry, -0.44], [0.22, ry, -0.44], 0.03, 0.03);
    lat.addStrut([xOuter, ry, 0.44], [0.22, ry, 0.44], 0.03, 0.03);
  }

  const archGroup = mb.buildGroup('z4_campanile_arches');
  // Central Escalier du Campanile (+276.13m -> +293.215m): r_newel=0.20m, r_cage=0.85m, 3-bar helical cage, turnHeight=2.85m locked to 287.15m/+X & 288.58m/-X!
  const campStair = buildSpiralStairFlight(THREE, materials, 'z4_campanile_spiral_stair', 0, 0, 276.13, 293.215, 0.85, 2.85, 0.0, 0.20, 3, 287.15);
  archGroup.add(campStair);
  return archGroup;
}

/**
 * Build Sautter-Lemonnier Phare Platform (+293.215m), Soubassement, Lantern Balcony (+296.295m),
 * Glazed Lighthouse Drum & Ribbed Copper Coupole (+298.86 -> +300.515m).
 * Calibrated directly to Pl. 59 Fig. 4 (59_fig4_coupole_elevation_alpha.png) & Photo 18!
 * Returns { group, opticGroup } so the Fresnel optic can gently revolve in setConstructionState.
 */
function buildPhareLanternAndCupola(THREE, materials) {
  const mb = new MultiBatch(THREE, materials);
  const pri = mb.get('ironPrimary');
  const lat = mb.get('ironLattice');
  const cast = mb.get('ironCast');
  const wood = mb.get('woodPavilion');
  const glass = mb.get('glass1889');
  const copper = mb.get('copperDome');
  const gold = mb.get('goldAccent');

  // 1. Plate-forme du Phare (Y = 292.965 soffit -> 293.215 deck = 0.250m slab, ±2.21m across flats, Pl. 59 Fig. 4 G—H & Pl. 53 Fig. 22)
  const yPhSoffit = 292.965;
  const yPhDeck = 293.215;
  const yPhRail = 294.215; // 1.00m railing
  const vPhare = chamferedSquareVertices(2.21, 0.60);
  const vPhCenter = chamferedSquareVertices(0.62, 0.15);

  for (let i = 0; i < 8; i++) {
    const j = (i + 1) % 8;
    const [x0, z0] = vPhare[i], [x1, z1] = vPhare[j];
    const [cx0, cz0] = vPhCenter[i], [cx1, cz1] = vPhCenter[j];

    pri.addQuad([x0, yPhSoffit, z0], [x1, yPhSoffit, z1], [x1, yPhDeck, z1], [x0, yPhDeck, z0]);
    wood.addQuad([cx0, yPhDeck, cz0], [cx1, yPhDeck, cz1], [x1, yPhDeck, z1], [x0, yPhDeck, z0]);
    pri.addQuad([x0, yPhSoffit, z0], [x1, yPhSoffit, z1], [cx1, yPhSoffit, cz1], [cx0, yPhSoffit, cz0]);

    // 4-bar horizontal railing around Plate-forme du Phare (Pl. 59 Fig. 4)
    for (const ry of [yPhDeck + 0.25, yPhDeck + 0.50, yPhDeck + 0.75, yPhRail]) {
      lat.addStrut([x0, ry, z0], [x1, ry, z1], ry === yPhRail ? 0.046 : 0.028, 0.032);
    }
    const nP = 3;
    for (let p = 0; p < nP; p++) {
      const t0 = p / nP;
      const px0 = lerp(x0, x1, t0), pz0 = lerp(z0, z1, t0);
      pri.addStrut([px0, yPhDeck, pz0], [px0, yPhRail, pz0], 0.036, 0.036, [1, 0, 0]);
    }
  }
  // 45-deg diagonal floor girders & joists under Plate-forme du Phare (Pl. 53 Fig. 22, strictly inside ±2.21m)
  for (const off of [-0.60, 0.60]) {
    const L = 1.98;
    pri.addStrut([-L * INV_SQRT2 + off * INV_SQRT2, yPhSoffit + 0.12, L * INV_SQRT2 + off * INV_SQRT2], [L * INV_SQRT2 + off * INV_SQRT2, yPhSoffit + 0.12, -L * INV_SQRT2 + off * INV_SQRT2], 0.095, 0.20);
    pri.addStrut([-L * INV_SQRT2 + off * INV_SQRT2, yPhSoffit + 0.12, -L * INV_SQRT2 - off * INV_SQRT2], [L * INV_SQRT2 + off * INV_SQRT2, yPhSoffit + 0.12, L * INV_SQRT2 - off * INV_SQRT2], 0.095, 0.20);
  }

  // 2. Soubassement de la Lanterne du Phare (Y = 293.215 -> 295.520m = 2.305m, exact vernier r = 1.16m, Pl. 59 Fig. 4 K-L!)
  pri.addFrustum(0, 0, 293.215, 1.16, 295.52, 1.16, 24, false, true);
  // 12-spoke spiderweb radial I-beam framing at Lanterne floor (295.52m & 296.29m, Pl. 53 Fig. 24)
  for (let sp = 0; sp < 12; sp++) {
    const a = (sp / 12) * Math.PI * 2;
    const ca = Math.cos(a), sa = Math.sin(a);
    pri.addStrut([ca * 0.38, 295.50, sa * 0.38], [ca * 1.14, 295.50, sa * 1.14], 0.055, 0.13);
    pri.addStrut([ca * 0.40, 296.27, sa * 0.40], [ca * 1.64, 296.27, sa * 1.64], 0.055, 0.13);
  }
  // 8 Vertical pilaster ribs & 8 rectangular casement windows around Soubassement drum (r = 1.16m)
  for (let w = 0; w < 8; w++) {
    const a = (w / 8) * Math.PI * 2 + Math.PI / 8;
    const aPil = (w / 8) * Math.PI * 2;
    pri.addStrut(
      [Math.cos(aPil) * 1.16, 293.215, Math.sin(aPil) * 1.16],
      [Math.cos(aPil) * 1.16, 295.52, Math.sin(aPil) * 1.16],
      0.050,
      0.050,
      [1, 0, 0]
    );
    const ca = Math.cos(a), sa = Math.sin(a);
    const tx = -sa * 0.17, tz = ca * 0.17;
    const rW = 1.165;
    glass.addQuad(
      [ca * rW - tx, 294.02, sa * rW - tz],
      [ca * rW + tx, 294.02, sa * rW + tz],
      [ca * rW + tx, 294.82, sa * rW + tz],
      [ca * rW - tx, 294.82, sa * rW - tz]
    );
  }

  // 3. Concave-Flared Console Skirt (295.52 -> 296.295m) & Solid Paneled Balcon de la Lanterne (296.295 -> 297.195m, exact r = 1.66..1.70m, Pl. 59 M-N!)
  pri.addFrustum(0, 0, 295.52, 1.16, 295.92, 1.32, 24, false, false);
  pri.addFrustum(0, 0, 295.92, 1.32, 296.295, 1.66, 24, false, true);
  // Solid sheet-iron paneled parapet of Balcon de la Lanterne (0.90m high: 296.295 -> 297.195m, open 0.09m handrail coping!)
  pri.addFrustum(0, 0, 296.295, 1.66, 297.195, 1.66, 24, false, false, 0.06);
  pri.addFrustum(0, 0, 297.155, 1.70, 297.215, 1.70, 24, true, true, 0.09);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const ca = Math.cos(a), sa = Math.sin(a);
    pri.addStrut([ca * 1.16, 295.52, sa * 1.16], [ca * 1.64, 296.28, sa * 1.64], 0.050, 0.075);
    pri.addStrut([ca * 1.67, 296.295, sa * 1.67], [ca * 1.67, 297.195, sa * 1.67], 0.044, 0.044, [1, 0, 0]);
  }

  // 4. Sautter-Lemonnier Glazed Lighthouse Drum (Y = 296.35 -> 298.335m, clear glass above 297.195m = 1.14m, exact r = 1.04m, Photo 05 & Pl. 59)
  pri.addFrustum(0, 0, 296.295, 1.06, 297.195, 1.05, 24, false, true);
  glass.addFrustum(0, 0, 297.195, 1.04, 298.335, 1.04, 24, false, false);
  pri.addFrustum(0, 0, 298.31, 1.05, 298.40, 1.09, 24, true, true);
  for (let m = 0; m < 12; m++) {
    const a0 = (m / 12) * Math.PI * 2;
    const a1 = a0 + Math.PI / 12;
    gold.addStrut(
      [Math.cos(a0) * 1.045, 297.195, Math.sin(a0) * 1.045],
      [Math.cos(a1) * 1.045, 298.335, Math.sin(a1) * 1.045],
      0.026,
      0.026
    );
    gold.addStrut(
      [Math.cos(a1) * 1.045, 297.195, Math.sin(a1) * 1.045],
      [Math.cos(a0) * 1.045, 298.335, Math.sin(a0) * 1.045],
      0.026,
      0.026
    );
  }

  // 5. Bullet-Ogival Ribbed Copper Coupole Dome (Y = 298.38 -> 300.515m, exact vernier r = 1.06m -> 0.50m, Pl. 59 Fig. 4 O-P!)
  const domeRings = [
    [298.38, 1.06],
    [298.86, 1.06], // Niveau du plancher de la coupole (332.36 NGF)
    [299.22, 1.03],
    [299.58, 0.96],
    [299.92, 0.84],
    [300.24, 0.68],
    [300.515, 0.50],
  ];
  // Horizontal cornice ring & Pl. 53 Fig. 26 twin 45°-diagonal girder grillage at Plancher de la Coupole (298.86m)
  pri.addFrustum(0, 0, 298.83, 1.09, 298.89, 1.09, 24, false, false, 0.07);
  for (const off of [-0.34, 0.34]) {
    const halfSpan = Math.sqrt(Math.max(0.1, 1.02 * 1.02 - off * off));
    pri.addStrut(
      [(-halfSpan + off) * INV_SQRT2, 298.84, (halfSpan + off) * INV_SQRT2],
      [(halfSpan + off) * INV_SQRT2, 298.84, (-halfSpan + off) * INV_SQRT2],
      0.075,
      0.15
    );
  }
  for (let j = -3; j <= 3; j++) {
    const s = j * 0.25;
    lat.addStrut(
      [(s - 0.34) * INV_SQRT2, 298.84, (-s - 0.34) * INV_SQRT2],
      [(s + 0.34) * INV_SQRT2, 298.84, (-s + 0.34) * INV_SQRT2],
      0.050,
      0.11
    );
  }
  for (let r = 0; r < domeRings.length - 1; r++) {
    const [ya, ra] = domeRings[r];
    const [yb, rb] = domeRings[r + 1];
    copper.addFrustum(0, 0, ya, ra, yb, rb, 24, r === 0, r === domeRings.length - 2);
  }
  // 16 Standing-seam meridian ribs on Coupole
  for (let m = 0; m < 16; m++) {
    const a = (m / 16) * Math.PI * 2;
    const ca = Math.cos(a), sa = Math.sin(a);
    for (let r = 0; r < domeRings.length - 1; r++) {
      const [ya, ra] = domeRings[r];
      const [yb, rb] = domeRings[r + 1];
      pri.addStrut([ca * (ra + 0.010), ya, sa * (ra + 0.010)], [ca * (rb + 0.010), yb, sa * (rb + 0.010)], 0.024, 0.024);
    }
  }

  // Circular rail track & 2 Mobile Angled "Tricolore" Searchlight Projectors (projecteurs mobiles, Photo 44!)
  // Positioned at θ = +68° and -112° on r = 1.33m balcony track (|x| <= 0.79m < 1.04m, r <= 1.62m < 1.66m -> 0% Pl. 59 / Pl. 53 spillover!)
  const globe = mb.get('lampGlobe1889');
  cast.addFrustum(0, 0, 296.295, 1.24, 296.325, 1.24, 28, false, true, 0.032);
  cast.addFrustum(0, 0, 296.295, 1.44, 296.325, 1.44, 28, false, true, 0.032);

  const addTiltedCyl = (batch, p0, p1, r0, r1, segs = 14, cap0 = false, cap1 = false) => {
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1], dz = p1[2] - p0[2];
    const len = Math.hypot(dx, dy, dz) || 1;
    const tx = dx / len, ty = dy / len, tz = dz / len;
    let ux = -tz, uy = 0, uz = tx;
    const uLen = Math.hypot(ux, uy, uz) || 1;
    ux /= uLen; uz /= uLen;
    const vx = ty * uz - tz * uy, vy = tz * ux - tx * uz, vz = tx * uy - ty * ux;
    for (let s = 0; s < segs; s++) {
      const a0 = (s / segs) * Math.PI * 2, a1 = ((s + 1) / segs) * Math.PI * 2;
      const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      const q00 = [p0[0] + (ux * c0 + vx * s0) * r0, p0[1] + (uy * c0 + vy * s0) * r0, p0[2] + (uz * c0 + vz * s0) * r0];
      const q10 = [p0[0] + (ux * c1 + vx * s1) * r0, p0[1] + (uy * c1 + vy * s1) * r0, p0[2] + (uz * c1 + vz * s1) * r0];
      const q11 = [p1[0] + (ux * c1 + vx * s1) * r1, p1[1] + (uy * c1 + vy * s1) * r1, p1[2] + (uz * c1 + vz * s1) * r1];
      const q01 = [p1[0] + (ux * c0 + vx * s0) * r1, p1[1] + (uy * c0 + vy * s0) * r1, p1[2] + (uz * c0 + vz * s0) * r1];
      batch.addQuad(q00, q01, q11, q10);
      if (cap0 && r0 > 1e-4) batch.addTri(p0, q00, q10);
      if (cap1 && r1 > 1e-4) batch.addTri(p1, q11, q01);
    }
  };

  for (const azDeg of [68, -112]) {
    const az = (azDeg * Math.PI) / 180;
    const ca = Math.cos(az), sa = Math.sin(az);
    const tx = -sa, tz = ca;
    const rTrack = 1.33;
    const cx = ca * rTrack, cz = sa * rTrack;
    // 4-wheeled trunnion carriage & brass turntable ring on balcony rail track
    for (const [dr, dt] of [[-0.10, -0.14], [0.10, -0.14], [-0.10, 0.14], [0.10, 0.14]]) {
      const wx = ca * (rTrack + dr) + tx * dt, wz = sa * (rTrack + dr) + tz * dt;
      cast.addFrustum(wx, wz, 296.31, 0.045, 296.36, 0.045, 8, true, true);
    }
    cast.addStrut([cx - tx * 0.19, 296.38, cz - tz * 0.19], [cx + tx * 0.19, 296.38, cz + tz * 0.19], 0.28, 0.05);
    gold.addFrustum(cx, cz, 296.40, 0.17, 296.45, 0.16, 14, true, true);
    // Twin U-yoke trunnion standards rising to Y = 297.37m + elevation gear quadrant
    for (const sgnT of [-1, 1]) {
      cast.addStrut(
        [cx + tx * sgnT * 0.15, 296.44, cz + tz * sgnT * 0.15],
        [cx + tx * sgnT * 0.20, 297.38, cz + tz * sgnT * 0.20],
        0.048,
        0.065,
        [1, 0, 0]
      );
    }
    gold.addStrut([cx + tx * 0.21, 297.08, cz + tz * 0.21], [cx - ca * 0.14 + tx * 0.21, 297.28, cz - sa * 0.14 + tz * 0.21], 0.025, 0.045);

    // Cylindrical Sautter-Lemonnier searchlight projector drum angled 24° downward over Paris, clearing the 297.215m rail
    const tilt = (24 * Math.PI) / 180;
    const dx = ca * Math.cos(tilt), dy = -Math.sin(tilt), dz = sa * Math.cos(tilt);
    const piv = [cx, 297.37, cz];
    const ptA = (s) => [piv[0] + dx * s, piv[1] + dy * s, piv[2] + dz * s];
    addTiltedCyl(cast, ptA(-0.22), ptA(0.22), 0.175, 0.175, 16, true, false);
    addTiltedCyl(gold, ptA(-0.25), ptA(-0.20), 0.155, 0.185, 16, true, true);
    addTiltedCyl(gold, ptA(0.19), ptA(0.25), 0.188, 0.192, 16, true, false);
    addTiltedCyl(glass, ptA(0.24), ptA(0.252), 0.172, 0.172, 16, false, true);
    addTiltedCyl(globe, ptA(-0.08), ptA(0.16), 0.135, 0.145, 12, true, true);
    // Top brass ventilation hood on projector barrel
    const hBase = [piv[0] - ca * Math.sin(tilt) * 0.17, piv[1] + Math.cos(tilt) * 0.17, piv[2] - sa * Math.sin(tilt) * 0.17];
    gold.addFrustum(hBase[0], hBase[2], hBase[1] - 0.02, 0.065, hBase[1] + 0.09, 0.075, 10, false, true);
  }

  const root = mb.buildGroup('z4_phare_lantern_coupole');

  // Revolving Sautter-Lemonnier Catadioptric Fresnel Drum, Brass Bi-Valve Frames & Electric Carbon-Arc Regulator
  const opticMb = new MultiBatch(THREE, materials);
  const oCast = opticMb.get('ironCast');
  const oGold = opticMb.get('goldAccent');
  const oGlass = opticMb.get('glass1889');
  const oGlobe = opticMb.get('lampGlobe1889');

  // 1. Cast-iron fluted pedestal & brass clockwork rotation table (297.195 -> 297.52m)
  oCast.addFrustum(0, 0, 297.195, 0.40, 297.38, 0.30, 16, true, true);
  oCast.addFrustum(0, 0, 297.38, 0.35, 297.47, 0.35, 16, true, true);
  oGold.addFrustum(0, 0, 297.47, 0.59, 297.52, 0.59, 20, true, true, 0.14);

  // 2. Central Sautter-Lemonnier Electric Carbon-Arc Regulator & Glowing Focal Arc Core (Y = 297.78m)
  oCast.addAxisBox(0, 297.56, 0, 0.18, 0.09, 0.18);
  for (const sgn of [-1, 1]) {
    oGold.addStrut([sgn * 0.085, 297.52, 0], [sgn * 0.085, 298.06, 0], 0.022, 0.022, [1, 0, 0]);
  }
  oGold.addStrut([-0.095, 298.05, 0], [0.095, 298.05, 0], 0.032, 0.028);
  oCast.addFrustum(0, 0, 297.58, 0.020, 297.75, 0.014, 8, false, true);
  oCast.addFrustum(0, 0, 297.81, 0.014, 298.04, 0.020, 8, true, false);
  oGlobe.addFrustum(0, 0, 297.735, 0.062, 297.825, 0.062, 12, true, true);

  // 3. Concentric Stepped glass1889 Catadioptric Fresnel Prism Rings & Central Dioptric Belt Lens
  oGlass.addFrustum(0, 0, 297.69, 0.590, 297.78, 0.618, 20, true, false, 0.065);
  oGlass.addFrustum(0, 0, 297.78, 0.618, 297.87, 0.590, 20, false, true, 0.065);
  for (let k = 0; k < 4; k++) {
    const ya = 297.525 + k * 0.04, yb = ya + 0.036;
    const rOuter = 0.562 + k * 0.007;
    oGlass.addFrustum(0, 0, ya, rOuter - 0.012, yb, rOuter, 20, true, true, 0.050);
  }
  for (let k = 0; k < 6; k++) {
    const ya = 297.88 + k * 0.058, yb = ya + 0.052;
    const ra = lerp(0.588, 0.40, k / 6), rb = lerp(0.588, 0.36, (k + 1) / 6);
    oGlass.addFrustum(0, 0, ya, ra, yb, rb + 0.012, 20, false, true, 0.050);
  }

  // 4. 8 Vertical Brass Bi-Valve Meridian Frames, Horizontal Belt Rings & Twin Revolving Tricolore Filter Sectors
  for (const [ry, rr] of [[297.515, 0.595], [297.685, 0.602], [297.875, 0.602], [298.08, 0.505], [298.235, 0.385]]) {
    oGold.addFrustum(0, 0, ry - 0.012, rr, ry + 0.012, rr, 20, true, true, 0.035);
  }
  for (let m = 0; m < 8; m++) {
    const a = (m / 8) * Math.PI * 2;
    const ca = Math.cos(a), sa = Math.sin(a);
    oGold.addStrut([ca * 0.598, 297.51, sa * 0.598], [ca * 0.605, 297.88, sa * 0.605], 0.026, 0.026, [1, 0, 0]);
    oGold.addStrut([ca * 0.602, 297.88, sa * 0.602], [ca * 0.380, 298.24, sa * 0.380], 0.024, 0.024);
  }
  oGold.addFrustum(0, 0, 298.23, 0.38, 298.28, 0.24, 16, false, true);
  for (const sgn of [-1, 1]) {
    const baseAz = sgn > 0 ? 0 : Math.PI;
    for (let s = -2; s < 2; s++) {
      const a0 = baseAz + s * 0.19, a1 = baseAz + (s + 1) * 0.19;
      const p00 = [Math.cos(a0) * 0.64, 297.55, Math.sin(a0) * 0.64];
      const p10 = [Math.cos(a1) * 0.64, 297.55, Math.sin(a1) * 0.64];
      const p11 = [Math.cos(a1) * 0.64, 298.12, Math.sin(a1) * 0.64];
      const p01 = [Math.cos(a0) * 0.64, 298.12, Math.sin(a0) * 0.64];
      oGlass.addQuad(p00, p10, p11, p01);
      oGold.addStrut(p00, p10, 0.022, 0.022);
      oGold.addStrut(p01, p11, 0.022, 0.022);
      if (s === -2) oGold.addStrut(p00, p01, 0.024, 0.024, [1, 0, 0]);
      if (s === 1) oGold.addStrut(p10, p11, 0.024, 0.024, [1, 0, 0]);
    }
  }

  const opticGroup = opticMb.buildGroup('z4_fresnel_optic');
  root.add(opticGroup);

  return { group: root, opticGroup };
}

/**
 * Create a high-resolution procedural canvas texture for the authentic 1889
 * 5.50m x 3.00m French Tricolore flag with "R.F." monogram (Photo 18 & Photo 33).
 */
function createTricoloreRFMaterial(THREE, fallbackMat) {
  if (typeof document === 'undefined') return fallbackMat;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 280;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return fallbackMat;

  ctx.fillStyle = '#2f3b46';
  ctx.fillRect(0, 0, 171, 280);
  ctx.fillStyle = '#eae5dc';
  ctx.fillRect(171, 0, 170, 280);
  ctx.fillStyle = '#7d3d33';
  ctx.fillRect(341, 0, 171, 280);

  // Authentic "R F" dark-gold / crimson-edged monogram in white stripe (zoom_photo18_crown.png!)
  ctx.fillStyle = '#2d241b';
  ctx.font = 'bold 84px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('R F', 256, 142);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;

  return new THREE.MeshStandardMaterial({
    name: 'flagTricolore_RF1889',
    color: 0xffffff,
    map: tex,
    roughness: 0.82,
    metalness: 0.00,
    side: THREE.DoubleSide,
  });
}

/**
 * Build Terrasse Supérieure (+300.515m), Meteorological Instruments, 4-Ribbed Soutien du Paratonnerre
 * (+300.515 -> +303.565m), Tapered Flagpole peaking at exact Y = +312.275m, & Waving 5.50x3.00m "RF" Flag.
 */
function buildUpperTerraceFlagpoleAndFlag(THREE, materials) {
  const mb = new MultiBatch(THREE, materials);
  const pri = mb.get('ironPrimary');
  const lat = mb.get('ironLattice');
  const wood = mb.get('woodPavilion');
  const gold = mb.get('goldAccent');

  const yTerr = 300.515;
  const yRailTop = 301.515;
  const rTerr = 1.00; // Exact 2.00m circular crown terrace (Pl. 59 Fig. 4 Q—R & Pl. 53 Fig. 27)

  // 1. Flared circular Terrasse Supérieure deck, 12 radial floor I-beams (Pl. 53 Fig. 27) & 12 console brackets (r=0.50m -> 1.00m)
  pri.addFrustum(0, 0, yTerr - 0.16, 0.50, yTerr, rTerr, 24, true, true);
  for (let i = 0; i < 12; i++) {
    const a0 = (i / 12) * Math.PI * 2;
    const a1 = ((i + 1) / 12) * Math.PI * 2;
    const c0 = Math.cos(a0), s0 = Math.sin(a0);
    const c1 = Math.cos(a1), s1 = Math.sin(a1);
    pri.addStrut([c0 * 0.20, yTerr - 0.06, s0 * 0.20], [c0 * (rTerr - 0.02), yTerr - 0.06, s0 * (rTerr - 0.02)], 0.048, 0.10);
    pri.addStrut([c0 * 0.50, yTerr - 0.28, s0 * 0.50], [c0 * (rTerr - 0.04), yTerr - 0.04, s0 * (rTerr - 0.04)], 0.034, 0.044);
    pri.addStrut([c0 * rTerr, yTerr, s0 * rTerr], [c0 * rTerr, yRailTop, s0 * rTerr], 0.034, 0.034, [1, 0, 0]);
    for (const ry of [yTerr + 0.25, yTerr + 0.50, yTerr + 0.75, yRailTop]) {
      lat.addStrut([c0 * rTerr, ry, s0 * rTerr], [c1 * rTerr, ry, s1 * rTerr], ry === yRailTop ? 0.040 : 0.025, 0.030);
    }
  }

  // Meteorological shelter box (Abri des Thermomètres at x = -1.02m -> screen right under ry=180°) & Pluviomètre (x = +0.96m -> screen left, Pl. 59 Fig. 4)
  wood.addAxisBox(-1.02, yTerr + 1.08, 0.0, 0.34, 0.48, 0.28);
  pri.addStrut([-0.96, yTerr, 0.0], [-0.96, yTerr + 0.88, 0.0], 0.040, 0.040, [1, 0, 0]);
  gold.addFrustum(0.96, 0.0, yTerr + 0.85, 0.12, yTerr + 1.16, 0.14, 12, true, true);
  pri.addStrut([0.96, yTerr, 0.0], [0.96, yTerr + 0.85, 0.0], 0.038, 0.038, [1, 0, 0]);

  // 2. Wrought-Iron S-Scroll Quadripod/Octopod Soutien du Paratonnerre (Y = 300.515 -> 303.565m = 3.05m, Q-R on Pl. 59 Fig. 4!)
  const yMidRing = 301.55;
  const yKnee = 302.42;
  const yCollar = 303.565;
  const rSupportAtY = (y) => {
    if (y <= yKnee) return lerp(0.74, 0.64, (y - yTerr) / (yKnee - yTerr));
    const u = clamp((y - yKnee) / (yCollar - yKnee), 0, 1);
    // S-curved bell scroll profile narrowing cleanly into the 303.565m collar
    return 0.13 + 0.51 * Math.pow(1 - u, 1.45) + 0.05 * Math.sin(u * Math.PI);
  };
  const suppSegs = 10;
  for (let r = 0; r < 8; r++) {
    const a = (r / 8) * Math.PI * 2;
    const aNext = ((r + 1) / 8) * Math.PI * 2;
    const ca = Math.cos(a), sa = Math.sin(a);
    const cn = Math.cos(aNext), sn = Math.sin(aNext);
    const ribW = r % 2 === 0 ? 0.044 : 0.034;
    for (let s = 0; s < suppSegs; s++) {
      const ya = lerp(yTerr, yCollar, s / suppSegs);
      const yb = lerp(yTerr, yCollar, (s + 1) / suppSegs);
      const ra = rSupportAtY(ya), rb = rSupportAtY(yb);
      pri.addStrut([ca * ra, ya, sa * ra], [ca * rb, yb, sa * rb], ribW, ribW);
    }
    // Horizontal collar rings at 301.55m & 302.42m (Q-R on Pl. 59 Fig. 4) + lower cage X-bracing
    const rMid = rSupportAtY(yMidRing);
    const rKn = rSupportAtY(yKnee);
    lat.addStrut([ca * rMid, yMidRing, sa * rMid], [cn * rMid, yMidRing, sn * rMid], 0.028, 0.028);
    lat.addStrut([ca * rKn, yKnee, sa * rKn], [cn * rKn, yKnee, sn * rKn], 0.034, 0.034);
    lat.addStrut([ca * 0.74, yTerr + 0.04, sa * 0.74], [cn * rMid, yMidRing, sn * rMid], 0.020, 0.020);
    lat.addStrut([cn * 0.74, yTerr + 0.04, sn * 0.74], [ca * rMid, yMidRing, sa * rMid], 0.020, 0.020);
    lat.addStrut([ca * rMid, yMidRing, sa * rMid], [cn * rKn, yKnee, sn * rKn], 0.020, 0.020);
    lat.addStrut([cn * rMid, yMidRing, sn * rMid], [ca * rKn, yKnee, sa * rKn], 0.020, 0.020);

    // Ornamental wrought-iron radial scroll ties inside the 4 cardinal ribs (302.42 -> 303.25m, Pl. 59 Fig. 4)
    if (r % 2 === 0) {
      lat.addStrut([ca * 0.11, yKnee + 0.04, sa * 0.11], [ca * rKn, yKnee, sa * rKn], 0.026, 0.026);
      lat.addStrut([ca * 0.10, 302.96, sa * 0.10], [ca * rSupportAtY(302.78), 302.78, sa * rSupportAtY(302.78)], 0.022, 0.022);
      for (let v = 0; v < 6; v++) {
        const va0 = (v / 6) * Math.PI * 2;
        const va1 = ((v + 1) / 6) * Math.PI * 2;
        const rC = 0.34, yC = 302.66, radV = 0.13;
        lat.addStrut(
          [ca * (rC + Math.cos(va0) * radV), yC + Math.sin(va0) * radV, sa * (rC + Math.cos(va0) * radV)],
          [ca * (rC + Math.cos(va1) * radV), yC + Math.sin(va1) * radV, sa * (rC + Math.cos(va1) * radV)],
          0.018,
          0.018
        );
      }
    }
  }
  pri.addFrustum(0, 0, yCollar - 0.06, 0.16, yCollar + 0.06, 0.16, 14, true, true);

  // Waist instrument bracket (302.44m, Girouette Garrigou on -X) & upper meteorological crossbar at Y = 303.565m (Pl. 59 Fig. 4!)
  pri.addStrut([-0.84, 302.44, 0], [0.84, 302.44, 0], 0.032, 0.032);
  pri.addStrut([-0.80, 302.44, 0], [-0.80, 303.05, 0], 0.024, 0.024, [1, 0, 0]);
  gold.addStrut([-0.96, 303.00, 0], [-0.62, 303.00, 0], 0.018, 0.044);
  pri.addStrut([-0.98, 303.565, 0], [0.98, 303.565, 0], 0.032, 0.032);
  pri.addStrut([-0.94, 303.565, 0], [-0.94, 304.00, 0], 0.022, 0.022, [1, 0, 0]);
  gold.addFrustum(-0.94, 0, 303.96, 0.08, 304.06, 0.08, 8, true, true);

  // 3. Tapered Flagpole / Paratonnerre Mast rising to EXACT Y = 312.275m (345.775 NGF)!
  pri.addFrustum(0, 0, yTerr, 0.11, yCollar, 0.092, 14, true, false);
  pri.addFrustum(0, 0, yCollar, 0.092, 306.00, 0.068, 14, false, false);
  pri.addFrustum(0, 0, 306.00, 0.068, 309.25, 0.048, 12, false, false);
  // Flag halyard pulley ring ("Poulie de manœuvre du drapeau") at Y = 309.25m & upper collar at Y = 310.55m
  gold.addFrustum(0, 0, 309.20, 0.078, 309.30, 0.078, 12, true, true);
  gold.addAxisBox(0.08, 309.25, 0.0, 0.10, 0.12, 0.05);
  pri.addFrustum(0, 0, 309.25, 0.048, 311.82, 0.028, 12, false, true);
  gold.addFrustum(0, 0, 310.51, 0.062, 310.59, 0.062, 12, true, true);
  // Gilded platinum-tipped paratonnerre terminal spike peaking at EXACT Y = 312.275m!
  gold.addFrustum(0, 0, 311.82, 0.052, 311.94, 0.052, 12, true, true);
  gold.addFrustum(0, 0, 311.94, 0.024, 312.275, 0.002, 10, false, false);
  // 4-pronged V-aigrette corona (Pl. 59 Fig. 4 & March 1889 terminal, staying strictly <= 312.16m so max Y = 312.275m!)
  for (let p = 0; p < 4; p++) {
    const a = (p / 4) * Math.PI * 2;
    const ca = Math.cos(a), sa = Math.sin(a);
    gold.addStrut([0, 310.12, 0], [ca * 0.24, 310.76, sa * 0.24], 0.016, 0.016);
    gold.addStrut([0, 311.55, 0], [ca * 0.14, 311.96, sa * 0.14], 0.013, 0.013);
  }

  const root = mb.buildGroup('z4_terrace300_paratonnerre');

  // Spinning 4-cup Robinson Anemometer at (+0.94, 304.00, 0) on the 303.565m instrument crossbar (+X -> screen left under ry=180°)
  const anemMb = new MultiBatch(THREE, materials);
  anemMb.get('ironPrimary').addStrut([0, -0.44, 0], [0, 0.05, 0], 0.022, 0.022, [1, 0, 0]);
  for (let c = 0; c < 4; c++) {
    const a = (c / 4) * Math.PI * 2;
    const cx = Math.cos(a) * 0.20, cz = Math.sin(a) * 0.20;
    anemMb.get('ironPrimary').addStrut([0, 0, 0], [cx, 0, cz], 0.014, 0.014);
    anemMb.get('goldAccent').addAxisBox(cx, 0, cz, 0.060, 0.060, 0.060);
  }
  const anemometerGroup = anemMb.buildGroup('z4_robinson_anemometer');
  anemometerGroup.position.set(0.94, 304.00, 0);
  root.add(anemometerGroup);

  // 4. Authentic 1889 5.50m x 3.00m "R.F." French Tricolore Flag (Y = 305.98 -> 308.93m, flying +X -> screen left on Pl. 59 ry=180°
  //    & screen right on Pl. 55 / Photo 18, matching Eiffel's 5.50x3.00m flag box on Pl. 59 & Pl. 55 to <0.15m!)
  const flagW = 5.50;
  const flagH = 2.95;
  const segX = 22, segY = 8;
  const flagGeom = new THREE.PlaneGeometry(flagW, flagH, segX, segY);
  // Shift hoist edge to X = +0.06m, center Y = 307.455m (305.98 .. 308.93m)
  flagGeom.translate(0.06 + flagW * 0.5, 307.455, 0.0);
  const posAttr = flagGeom.attributes.position;
  const baseFlagCoords = new Float32Array(posAttr.array.length);
  baseFlagCoords.set(posAttr.array);

  const flagMat = createTricoloreRFMaterial(THREE, materials.flagTricolore);
  const flagMesh = new THREE.Mesh(flagGeom, flagMat);
  flagMesh.name = 'z4_flag_tricolore_1889';

  const updateFlagWave = (phaseRad) => {
    for (let i = 0; i < posAttr.count; i++) {
      const bx = baseFlagCoords[i * 3];
      const by = baseFlagCoords[i * 3 + 1];
      const u = clamp((bx - 0.06) / flagW, 0, 1);
      const zWave = Math.sin(u * 4.8 - phaseRad) * (0.22 * u) + Math.sin(u * 9.5 - phaseRad * 1.6) * (0.05 * u);
      const yDroop = -0.08 * u * u + Math.cos(u * 4.2 - phaseRad) * (0.04 * u);
      posAttr.setXYZ(i, bx, by + yDroop, zWave);
    }
    posAttr.needsUpdate = true;
    flagGeom.computeVertexNormals();
  };
  updateFlagWave(0.6);

  return { terraceGroup: root, flagMesh, updateFlagWave, anemometerGroup };
}

function countGroupStats(root) {
  let meshCount = 0;
  let vertexCount = 0;
  let triangleCount = 0;
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.geometry) return;
    meshCount++;
    const pos = obj.geometry.attributes?.position;
    if (pos) vertexCount += pos.count;
    const idx = obj.geometry.index;
    triangleCount += idx ? idx.count / 3 : pos ? Math.floor(pos.count / 3) : 0;
  });
  return { meshCount, vertexCount, triangleCount: Math.round(triangleCount) };
}

export function buildZone(ctx = {}) {
  const { THREE } = ctx;
  if (!THREE) {
    throw new Error('zone4_upper_shaft_summit.buildZone requires ctx.THREE');
  }
  const materials = ensureFallbackMaterials(THREE, ctx.materials);
  const group = new THREE.Group();
  group.name = 'zone4_upper_shaft_summit';
  const pieces = [];

  const registerPiece = (spec) => {
    group.add(spec.object3D);
    pieces.push({
      vanishSpan: null,
      category: 'permanent',
      photoRefs: [],
      ...spec,
    });
  };

  // --------------------------------------------------------------------------
  // 1. UNIFIED UPPER SQUARE LATTICE SHAFT (Panneaux 19–28: +195.93m -> +264.8565m)
  //    Calibrated to Photo 01 (step 5.95: tower at ~148m -> P19 not yet built!)
  //    and Photo 46 (step 6.85: shaft riveted through P23 +231.97m with P24 +239.33m erected!).
  // --------------------------------------------------------------------------
  const shaftPanels = [
    { id: 'z4_panneau_19_collar', label: 'Panneau 19 (collier supérieur +195.93m → +198.53m)', y0: Y_INTERM_DECK, y1: 198.5258, phase: 6, span: [6.16, 6.28], hasSubDiamond: false, refs: ['photo_46', 'photo_18', 'pl66_fig3'] },
    { id: 'z4_panneau_20', label: 'Panneau 20 du fût supérieur (+198.53m → +207.52m)', y0: 198.5258, y1: 207.5235, phase: 6, span: [6.25, 6.38], hasSubDiamond: true, refs: ['photo_46', 'photo_18', 'pl66_fig3'] },
    { id: 'z4_panneau_21', label: 'Panneau 21 du fût supérieur (+207.52m → +216.09m)', y0: 207.5235, y1: 216.0915, phase: 6, span: [6.35, 6.49], hasSubDiamond: true, refs: ['photo_46', 'photo_18', 'pl66_fig3'] },
    { id: 'z4_panneau_22', label: 'Panneau 22 du fût supérieur (+216.09m → +224.23m)', y0: 216.0915, y1: 224.2318, phase: 7, span: [6.56, 6.72], hasSubDiamond: true, refs: ['photo_18', 'pl66_fig3'] },
    { id: 'z4_panneau_23', label: 'Panneau 23 du fût supérieur (+224.23m → +231.97m)', y0: 224.2318, y1: 231.9705, phase: 7, span: [6.69, 6.85], hasSubDiamond: true, refs: ['photo_18', 'pl66_fig4'] },
    { id: 'z4_panneau_24', label: 'Panneau 24 du fût supérieur (+231.97m → +239.33m)', y0: 231.9705, y1: 239.3316, phase: 7, span: [6.82, 6.98], hasSubDiamond: true, refs: ['photo_18', 'pl66_fig4'] },
    { id: 'z4_panneau_25', label: 'Panneau 25 du fût supérieur (+239.33m → +246.31m)', y0: 239.3316, y1: 246.3058, phase: 7, span: [6.95, 7.11], hasSubDiamond: true, refs: ['photo_18', 'pl66_fig4'] },
    { id: 'z4_panneau_26', label: 'Panneau 26 du fût supérieur (+246.31m → +252.88m)', y0: 246.3058, y1: 252.8778, phase: 7, span: [7.08, 7.25], hasSubDiamond: true, refs: ['photo_18', 'pl66_fig4'] },
    { id: 'z4_panneau_27', label: 'Panneau 27 du fût supérieur (+252.88m → +259.04m)', y0: 252.8778, y1: 259.0411, phase: 7, span: [7.22, 7.39], hasSubDiamond: true, refs: ['photo_18', 'pl66_fig4'] },
    { id: 'z4_panneau_28', label: 'Panneau 28 du fût supérieur (+259.04m → +264.86m)', y0: 259.0411, y1: 264.8565, phase: 7, span: [7.36, 7.53], hasSubDiamond: true, refs: ['photo_18', 'pl66_fig4'] },
  ];

  for (const p of shaftPanels) {
    registerPiece({
      id: p.id,
      label: p.label,
      object3D: buildStandardShaftPanel(THREE, materials, p),
      phase: p.phase,
      span: p.span,
      yMin: p.y0,
      yMax: p.y1,
      photoRefs: p.refs,
    });
  }

  // Panneau 29 Flared Corbel & Console Brackets (+264.8565m -> +275.28m)
  registerPiece({
    id: 'z4_panneau_29_corbel',
    label: 'Panneau 29 — Treillis à 3 travées & 8 consoles courbes du 3e Étage (+264.86m → +275.28m)',
    object3D: buildPanneau29Corbel(THREE, materials),
    phase: 7,
    span: [7.50, 7.72],
    yMin: 264.8565,
    yMax: 275.28,
    photoRefs: ['photo_18', 'pl65_fig3', 'pl66_fig4'],
  });

  // --------------------------------------------------------------------------
  // 2. CENTRAL HELICAL SPIRAL STAIRCASE e2 (-1.591m, -1.591m Pile 4 Ouest quadrant,
  //    symmetric twin to Zone 5's e1 (+1.591m, +1.591m) per Pl. 70 Fig. 8 & Photo 16,
  //    leaving the N-S Édoux Ca1/Ca2 elevator shaft 100% unobstructed!).
  // --------------------------------------------------------------------------
  registerPiece({
    id: 'z4_spiral_stair_lower',
    label: 'Escalier hélicoïdal du fût e2 — volée inférieure (+179.05m → +231.97m)',
    object3D: buildSpiralStairFlight(THREE, materials, 'z4_spiral_stair_lower', -1.591, -1.591, Y_COLLAR_P17_18, 231.9705, 0.78, 3.55),
    phase: 7,
    span: [6.56, 6.92],
    yMin: Y_COLLAR_P17_18,
    yMax: 231.9705,
    photoRefs: ['photo_16', 'pl08_fig2', 'pl70_fig8'],
  });

  registerPiece({
    id: 'z4_spiral_stair_upper',
    label: 'Escalier hélicoïdal du fût e2 — volée supérieure (+231.97m → +276.13m)',
    object3D: buildSpiralStairFlight(THREE, materials, 'z4_spiral_stair_upper', -1.591, -1.591, 231.9705, 276.13, 0.78, 3.55),
    phase: 7,
    span: [7.32, 7.68],
    yMin: 231.9705,
    yMax: 276.13,
    photoRefs: ['photo_16', 'pl08_fig1', 'pl70_fig8'],
  });

  // --------------------------------------------------------------------------
  // 3. THIRD PLATFORM (+276.13m) & GUSTAVE EIFFEL'S APARTMENT (+278.71m)
  // --------------------------------------------------------------------------
  registerPiece({
    id: 'z4_floor3_deck_balustrade',
    label: 'Plancher du 3e Étage (+276.13m, octogone 18.65m), poutres pleines de 0.85m & garde-corps 1889',
    object3D: buildThirdFloorDeckAndBalustrade(THREE, materials),
    phase: 7,
    span: [7.60, 7.82],
    yMin: 275.28,
    yMax: 277.18,
    photoRefs: ['photo_18', 'pl65_fig3', 'pl53_fig18'],
  });

  registerPiece({
    id: 'z4_floor3_pavilion_frame',
    label: 'Salle du 3e Étage — Ossature octogonale (16.55m), soubassement treillissé & terrasse (+278.71m)',
    object3D: buildThirdFloorPavilionFrame(THREE, materials),
    phase: 7,
    span: [7.80, 8.00],
    yMin: 276.13,
    yMax: 279.76,
    photoRefs: ['photo_35', 'photo_18', 'pl65_fig3'],
  });

  registerPiece({
    id: 'z4_eiffel_apartment',
    label: 'Logement, laboratoires & escaliers extérieurs de M. Gustave Eiffel (+276.13m → +281.88m)',
    object3D: buildEiffelApartment(THREE, materials),
    phase: 8,
    span: [8.00, 8.24],
    yMin: 276.13,
    yMax: 281.88,
    photoRefs: ['photo_18', 'pl65_fig3', 'pl53_fig20'],
  });

  registerPiece({
    id: 'z4_floor3_pavilion_glazing',
    label: 'Vitrages panoramiques à petits bois & boiseries de la Salle du 3e Étage (Phase 9)',
    object3D: buildThirdFloorGlazing(THREE, materials),
    phase: 9,
    span: [9.45, 9.80],
    yMin: 276.15,
    yMax: 278.63,
    photoRefs: ['photo_35', 'photo_18'],
  });

  // --------------------------------------------------------------------------
  // 4. 1889 CAMPANILE ARCHES, PHARE, COUPOLE, 300.515m TERRACE & +312.275m FLAGPOLE
  // --------------------------------------------------------------------------
  registerPiece({
    id: 'z4_campanile_arches',
    label: 'Campanile 1889 — 4 poutres en diagonale, escaliers latéraux extérieurs & escalier hélicoïdal (+276.13m → +294.20m)',
    object3D: buildCampanileArchesAndStair(THREE, materials),
    phase: 8,
    span: [8.22, 8.55],
    yMin: 276.13,
    yMax: 294.20,
    photoRefs: ['photo_18', 'photo_44', 'pl65_fig3', 'pl66_fig4', 'pl59_fig4'],
  });

  const { group: phareGroup, opticGroup } = buildPhareLanternAndCupola(THREE, materials);
  registerPiece({
    id: 'z4_phare_lantern_coupole',
    label: 'Plate-forme du Phare (+293.22m), Lanterne électrique Sautter-Lemonnier & Coupole en cuivre (+298.86m)',
    object3D: phareGroup,
    phase: 8,
    span: [8.52, 8.80],
    yMin: 292.915,
    yMax: 300.515,
    photoRefs: ['photo_05', 'photo_18', 'pl59_fig4', 'pl53_fig22', 'pl53_fig26'],
  });

  const { terraceGroup, flagMesh, updateFlagWave, anemometerGroup } = buildUpperTerraceFlagpoleAndFlag(THREE, materials);
  registerPiece({
    id: 'z4_terrace300_paratonnerre',
    label: 'Terrasse supérieure (+300.515m), appareils météorologiques, soutien & paratonnerre (+312.275m)',
    object3D: terraceGroup,
    phase: 8,
    span: [8.76, 8.94],
    yMin: 300.375,
    yMax: 312.275,
    photoRefs: ['photo_33', 'photo_18', 'pl59_fig4', 'pl53_fig27'],
  });

  registerPiece({
    id: 'z4_flag_tricolore_1889',
    label: 'Grand drapeau tricolore "R.F." de l\'inauguration du 31 mars 1889 (5.50m × 3.00m)',
    object3D: flagMesh,
    phase: 8,
    span: [8.92, 9.00],
    yMin: 305.86,
    yMax: 309.00,
    photoRefs: ['photo_33', 'photo_18', 'pl59_fig4', 'pl66_fig4'],
  });

  // --------------------------------------------------------------------------
  // KINEMATIC STATE CONTROLLER (waving Tricolore flag, anemometer & Fresnel optic)
  // --------------------------------------------------------------------------
  function setConstructionState(globalStep = 11.0) {
    const step = Number.isFinite(globalStep) ? globalStep : 11.0;
    if (step >= 8.90) {
      updateFlagWave(0.65 + (step - 8.90) * 6.0);
    }
    if (step >= 8.80) {
      anemometerGroup.rotation.y = (step - 8.80) * 8.5;
    }
    if (step >= 9.80) {
      opticGroup.rotation.y = (step - 9.80) * 3.2;
    } else {
      opticGroup.rotation.y = 0;
    }
  }

  function updateSummitAmbient(elapsedSec = 0, step = 11.0) {
    if (step >= 8.90) {
      updateFlagWave(0.65 + elapsedSec * 2.4 + (step - 8.90) * 1.5);
    }
    if (step >= 8.80) {
      anemometerGroup.rotation.y = elapsedSec * 1.8 + (step - 8.80) * 2.0;
    }
    if (step >= 9.80) {
      opticGroup.rotation.y = elapsedSec * 0.42;
    }
  }

  setConstructionState(11.0);

  const geomStats = countGroupStats(group);
  return {
    zoneId: 'zone4_upper_shaft_summit',
    group,
    pieces,
    setConstructionState,
    updateSummitAmbient,
    stats: {
      pieceCount: pieces.length,
      ...geomStats,
      yRangeM: [Y_COLLAR_P17_18, 312.275],
    },
  };
}

export default buildZone;
