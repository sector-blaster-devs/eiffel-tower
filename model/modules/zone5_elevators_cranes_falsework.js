/**
 * Stage 2 — Zone 5: 1889 Hydraulic Elevators, Authentic Straight Pier Stairs,
 * Temporary Battered Timber Falsework Towers, Sandboxes & Climbing Creeper Cranes.
 *
 * Owner: builder-mechanisms
 * Primary References:
 *   - Plates: Pl. 08 Figs. 1–4 (PL. XX N–S diagonal Otis & Édoux section),
 *             Pl. 04 & Pl. 17 (Otis double-deck cabin, hydraulic cylinder & 12:1 tackle),
 *             Pl. 53 Figs. 1–5, 9, 12, 14, 16–17 (pier track girders, Pile 3 pumps, floors),
 *             Pl. 63 (Otis & Combaluzier masonry/caisson pits & Ré1),
 *             Pl. 69 Fig. 1 (Pile 2 Est RdC Combaluzier cage, skylight & straight stairs),
 *             Pl. 70 Figs. 1, 4, 8 (2nd-floor stairs & P17–18 shaft cut).
 *   - Photos: 09 (derricks, props, jacks, Decauville track), 23 & 51 (battered pier
 *             falsework pylons, sandboxes, central falsework towers, creeper cranes),
 *             14 (arch falsework + creeper cranes at ~102–115m), 06 (riveters & forge),
 *             49 (1st-floor falsework), 01 & 46 & 54 (upper shaft climbing cranes & stages),
 *             47 (1889 straight parallel DESCENTE pier stairs), 28 & 29 (Otis machinery/cabin),
 *             18 (completed May 1889 Exposition state).
 */

const SQRT2 = Math.SQRT2;
const INV_SQRT2 = Math.SQRT1_2;

const PIERS = [
  {
    id: 'pile_1',
    name: 'Pile 1 (Nord)',
    sx: 1,
    sz: -1,
    system: 'otis',
    phaseOffset: Math.PI,
    slewBase: 0.35,
  },
  {
    id: 'pile_2',
    name: 'Pile 2 (Est)',
    sx: 1,
    sz: 1,
    system: 'combaluzier',
    phaseOffset: 0.0,
    slewBase: -0.42,
  },
  {
    id: 'pile_3',
    name: 'Pile 3 (Sud)',
    sx: -1,
    sz: 1,
    system: 'otis',
    phaseOffset: 0.0,
    slewBase: 0.42,
  },
  {
    id: 'pile_4',
    name: 'Pile 4 (Ouest)',
    sx: -1,
    sz: -1,
    system: 'combaluzier',
    phaseOffset: Math.PI,
    slewBase: -0.35,
  },
];

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep01(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

/**
 * Exact C1 two-slope radial diagonal coordinate r(Y) = sqrt(X^2 + Z^2) (meters)
 * for the inclined elevator track girders (`Poutres de roulement PA`), calibrated
 * directly against `Pl. 08 Figs. 3 & 4` and `Pl. 53 Fig. 12` (<0.08m error):
 *   - Lower stage (Y <= 65.13m): 54°35'15" incline => r_1(Y) = 71.50 - 0.71103 * Y
 *   - Upper stage (Y >= 74.13m): 78.00° incline   => r_2(Y) = 36.781 - 0.21240 * Y
 *   - Transition curve (65.13m .. 74.13m): exact C1 quadratic Bezier around Y_kink = 69.63m.
 */
const Y_BEND_0 = 65.13;
const Y_BEND_KINK = 69.63;
const Y_BEND_1 = 74.13;
const R_BEND_0 = 71.50 - 0.71103 * Y_BEND_0; // 25.1906 m
const R_BEND_KINK = 71.50 - 0.71103 * Y_BEND_KINK; // 21.9910 m
const R_BEND_1 = 36.781 - 0.2124 * Y_BEND_1; // 21.0358 m

function trackRadiusAtY(y) {
  if (y <= Y_BEND_0) {
    return 71.50 - 0.71103 * y;
  }
  if (y >= Y_BEND_1) {
    return 36.781 - 0.2124 * y;
  }
  const u = (y - Y_BEND_0) / (Y_BEND_1 - Y_BEND_0);
  const om = 1.0 - u;
  return om * om * R_BEND_0 + 2.0 * om * u * R_BEND_KINK + u * u * R_BEND_1;
}

function trackDrDyAtY(y) {
  if (y <= Y_BEND_0) return -0.71103;
  if (y >= Y_BEND_1) return -0.2124;
  const u = (y - Y_BEND_0) / (Y_BEND_1 - Y_BEND_0);
  const drDu = 2.0 * (1.0 - u) * (R_BEND_KINK - R_BEND_0) + 2.0 * u * (R_BEND_1 - R_BEND_KINK);
  return drDu / (Y_BEND_1 - Y_BEND_0);
}

/**
 * Inclined Otis hydraulic press cylinder `Cyl`, trolley bedplate `Vo1`, and `Pou1` sheave axis
 * on Pl. 08 Fig. 4: rises at a steeper ~55.5° angle (`dr/dY = -0.6905`) in the outer pier bay
 * between middle chords (B/D) and outer chord (C), from r = 81.55m (-2.6m) to r = 57.51m (+32.2m).
 */
function otisCylRadiusAtY(y) {
  return 79.75 - 0.6905 * y;
}

/**
 * Convert pier-local diagonal coordinates (y, rDiag, sPerp) to canonical world [x, y, z].
 *   u_rad  = (sx / sqrt(2), 0, sz / sqrt(2))   (outward along pier diagonal)
 *   u_perp = (sz / sqrt(2), 0, -sx / sqrt(2))  (horizontal perpendicular to pier diagonal)
 */
function pierWorldPos(pier, y, rDiag, sPerp = 0.0) {
  const rx = pier.sx * INV_SQRT2;
  const rz = pier.sz * INV_SQRT2;
  const px = pier.sz * INV_SQRT2;
  const pz = -pier.sx * INV_SQRT2;
  return [
    rDiag * rx + sPerp * px,
    y,
    rDiag * rz + sPerp * pz,
  ];
}

/**
 * Convert N-S Edoux diagonal coordinates (y, rNS, sEW) to canonical world [x, y, z]:
 *   +rNS points toward Pile 3 Sud (-X, +Z), matching +X_right on Plate 08!
 *   -rNS points toward Pile 1 Nord (+X, -Z).
 *   +sEW points toward Pile 2 Est (+X, +Z).
 */
function edouxWorldPos(y, rNS, sEW = 0.0) {
  return [
    (-rNS + sEW) * INV_SQRT2,
    y,
    (rNS + sEW) * INV_SQRT2,
  ];
}

/**
 * Approximate outer square half-span of the merged upper shaft at elevation Y (179m..276m).
 */
function upperShaftHalfSpanAtY(y) {
  if (y <= 137.85) return 13.025;
  if (y <= 148.22) return lerp(13.025, 11.720, (y - 137.85) / (148.22 - 137.85));
  if (y <= 158.59) return lerp(11.720, 10.850, (y - 148.22) / (158.59 - 148.22));
  if (y <= 179.05) {
    return lerp(10.850, 9.25, (y - 158.59) / (179.05 - 158.59));
  }
  if (y <= 224.23) {
    return lerp(9.25, 7.77, (y - 179.05) / (224.23 - 179.05));
  }
  if (y <= 264.86) {
    return lerp(7.77, 5.20, (y - 224.23) / (264.86 - 224.23));
  }
  return 5.05;
}

// ============================================================================
// Ensure complete material dictionary with fallbacks
// ============================================================================
function resolveMaterials(THREE, raw = {}) {
  const mk = (name, color, roughness = 0.55, metalness = 0.35, extra = {}) =>
    raw[name] ||
    new THREE.MeshStandardMaterial({
      name,
      color,
      roughness,
      metalness,
      side: THREE.DoubleSide,
      ...extra,
    });

  const woodTimberTemp = mk('woodTimberTemp', 0xbc9056, 0.78, 0.02);
  return {
    ironPrimary: mk('ironPrimary', 0x5c382c, 0.52, 0.44),
    ironLattice: mk('ironLattice', 0x6b4335, 0.56, 0.38),
    ironCast: mk('ironCast', 0x363432, 0.45, 0.64),
    masonryAshlar: mk('masonryAshlar', 0xe2dac9, 0.84, 0.03),
    concreteSub: mk('concreteSub', 0x9e9a91, 0.92, 0.02),
    woodPavilion: mk('woodPavilion', 0x8f6239, 0.64, 0.05),
    woodTimberTemp,
    timberFalsework: woodTimberTemp,
    glass1889:
      raw.glass1889 ||
      new THREE.MeshPhysicalMaterial({
        name: 'glass1889',
        color: 0xc8dde6,
        transparent: true,
        opacity: 0.42,
        roughness: 0.14,
        metalness: 0.1,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    goldAccent: mk('goldAccent', 0xd1a43e, 0.3, 0.82),
    copperDome: mk('copperDome', 0x586f64, 0.42, 0.58),
    craneSteel: mk('craneSteel', 0x3b434a, 0.44, 0.65),
  };
}

// ============================================================================
// High-Performance Indexed BufferGeometry Merging Builder
// ============================================================================
// Unit cube [-0.5, 0.5]^3 with 24 crisp face-normal vertices (6 faces x 15 floats)
const UNIT_BOX_FACES = new Float32Array([
  // +X
   0.5, -0.5, -0.5,   0.5,  0.5, -0.5,   0.5,  0.5,  0.5,   0.5, -0.5,  0.5,   1,  0,  0,
  // -X
  -0.5, -0.5,  0.5,  -0.5,  0.5,  0.5,  -0.5,  0.5, -0.5,  -0.5, -0.5, -0.5,  -1,  0,  0,
  // +Y
  -0.5,  0.5, -0.5,  -0.5,  0.5,  0.5,   0.5,  0.5,  0.5,   0.5,  0.5, -0.5,   0,  1,  0,
  // -Y
  -0.5, -0.5,  0.5,  -0.5, -0.5, -0.5,   0.5, -0.5, -0.5,   0.5, -0.5,  0.5,   0, -1,  0,
  // +Z
  -0.5, -0.5,  0.5,   0.5, -0.5,  0.5,   0.5,  0.5,  0.5,  -0.5,  0.5,  0.5,   0,  0,  1,
  // -Z
   0.5, -0.5, -0.5,  -0.5, -0.5, -0.5,  -0.5,  0.5, -0.5,   0.5,  0.5, -0.5,   0,  0, -1,
]);

let _sharedNormalMat3 = null;
let _sharedCylUp = null;
let _sharedCylDir = null;
let _sharedCylQuat = null;
let _sharedCylMid = null;
let _sharedCylOne = null;
let _sharedCylM4 = null;

class MeshBucket {
  constructor(initVerts = 512, initIdx = 1024) {
    this._vCap = initVerts;
    this._iCap = initIdx;
    this._pos = new Float32Array(initVerts * 3);
    this._norm = new Float32Array(initVerts * 3);
    this._idx = new Uint32Array(initIdx);
    this.vertCount = 0;
    this.idxCount = 0;
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
    nn.set(this._norm.subarray(0, this.vertCount * 3));
    this._norm = nn;
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

  addBoxMatrix(THREE, m4) {
    this._ensureVerts(24);
    this._ensureIdx(36);

    const e = m4.elements;
    const nm = (_sharedNormalMat3 || (_sharedNormalMat3 = new THREE.Matrix3())).getNormalMatrix(m4);
    const ne = nm.elements;
    const e0 = e[0], e1 = e[1], e2 = e[2];
    const e4 = e[4], e5 = e[5], e6 = e[6];
    const e8 = e[8], e9 = e[9], e10 = e[10];
    const e12 = e[12], e13 = e[13], e14 = e[14];
    const ne0 = ne[0], ne1 = ne[1], ne2 = ne[2];
    const ne3 = ne[3], ne4 = ne[4], ne5 = ne[5];
    const ne6 = ne[6], ne7 = ne[7], ne8 = ne[8];

    const pos = this._pos;
    const norm = this._norm;
    const idx = this._idx;
    let base = this.vertCount;
    let io = this.idxCount;

    for (let f = 0; f < 90; f += 15) {
      const n0x = UNIT_BOX_FACES[f + 12];
      const n0y = UNIT_BOX_FACES[f + 13];
      const n0z = UNIT_BOX_FACES[f + 14];
      let nx = ne0 * n0x + ne3 * n0y + ne6 * n0z;
      let ny = ne1 * n0x + ne4 * n0y + ne7 * n0z;
      let nz = ne2 * n0x + ne5 * n0y + ne8 * n0z;
      const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1.0;
      const invNl = 1.0 / nl;
      nx *= invNl;
      ny *= invNl;
      nz *= invNl;

      let po = base * 3;
      for (let k = 0; k < 12; k += 3) {
        const vx0 = UNIT_BOX_FACES[f + k];
        const vy0 = UNIT_BOX_FACES[f + k + 1];
        const vz0 = UNIT_BOX_FACES[f + k + 2];
        pos[po] = e0 * vx0 + e4 * vy0 + e8 * vz0 + e12;
        pos[po + 1] = e1 * vx0 + e5 * vy0 + e9 * vz0 + e13;
        pos[po + 2] = e2 * vx0 + e6 * vy0 + e10 * vz0 + e14;
        norm[po] = nx;
        norm[po + 1] = ny;
        norm[po + 2] = nz;
        po += 3;
      }

      idx[io] = base;
      idx[io + 1] = base + 1;
      idx[io + 2] = base + 2;
      idx[io + 3] = base;
      idx[io + 4] = base + 2;
      idx[io + 5] = base + 3;
      base += 4;
      io += 6;
    }

    this.vertCount = base;
    this.idxCount = io;
  }

  addCylinderBetween(THREE, p0, p1, r0, r1 = r0, radialSegs = 10, openEnded = false) {
    const dx = p1[0] - p0[0];
    const dy = p1[1] - p0[1];
    const dz = p1[2] - p0[2];
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 1e-5) return;

    if (!_sharedCylUp) {
      _sharedCylUp = new THREE.Vector3(0, 1, 0);
      _sharedCylDir = new THREE.Vector3();
      _sharedCylQuat = new THREE.Quaternion();
      _sharedCylMid = new THREE.Vector3();
      _sharedCylOne = new THREE.Vector3(1, 1, 1);
      _sharedCylM4 = new THREE.Matrix4();
    }

    const geom = new THREE.CylinderGeometry(r1, r0, len, radialSegs, 1, openEnded);
    const invLen = 1 / len;
    _sharedCylDir.set(dx * invLen, dy * invLen, dz * invLen);
    _sharedCylQuat.setFromUnitVectors(_sharedCylUp, _sharedCylDir);
    _sharedCylMid.set(
      (p0[0] + p1[0]) * 0.5,
      (p0[1] + p1[1]) * 0.5,
      (p0[2] + p1[2]) * 0.5
    );
    _sharedCylM4.compose(_sharedCylMid, _sharedCylQuat, _sharedCylOne);
    this.addThreeGeometry(THREE, geom, _sharedCylM4);
    geom.dispose();
  }

  addThreeGeometry(THREE, geom, m4) {
    const posAttr = geom.attributes.position;
    const normAttr = geom.attributes.normal;
    const idxAttr = geom.index;
    const pCount = posAttr.count;
    const addIndices = idxAttr ? idxAttr.count : pCount;

    this._ensureVerts(pCount);
    this._ensureIdx(addIndices);

    const e = m4.elements;
    const nm = (_sharedNormalMat3 || (_sharedNormalMat3 = new THREE.Matrix3())).getNormalMatrix(m4);
    const ne = nm.elements;
    const base = this.vertCount;
    const posOut = this._pos;
    const normOut = this._norm;
    const srcPos = posAttr.array;
    const srcNorm = normAttr ? normAttr.array : null;

    let po = base * 3;
    for (let i = 0; i < pCount; i++) {
      const si = i * 3;
      const x = srcPos[si];
      const y = srcPos[si + 1];
      const z = srcPos[si + 2];
      posOut[po] = e[0] * x + e[4] * y + e[8] * z + e[12];
      posOut[po + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
      posOut[po + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
      if (srcNorm) {
        const nx0 = srcNorm[si];
        const ny0 = srcNorm[si + 1];
        const nz0 = srcNorm[si + 2];
        let nx = ne[0] * nx0 + ne[3] * ny0 + ne[6] * nz0;
        let ny = ne[1] * nx0 + ne[4] * ny0 + ne[7] * nz0;
        let nz = ne[2] * nx0 + ne[5] * ny0 + ne[8] * nz0;
        const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1.0;
        const invNl = 1.0 / nl;
        normOut[po] = nx * invNl;
        normOut[po + 1] = ny * invNl;
        normOut[po + 2] = nz * invNl;
      } else {
        normOut[po] = 0;
        normOut[po + 1] = 1;
        normOut[po + 2] = 0;
      }
      po += 3;
    }

    const idxOut = this._idx;
    let io = this.idxCount;
    if (idxAttr) {
      const srcIdx = idxAttr.array;
      for (let i = 0; i < addIndices; i++) {
        idxOut[io + i] = base + srcIdx[i];
      }
    } else {
      for (let i = 0; i < pCount; i++) {
        idxOut[io + i] = base + i;
      }
    }

    this.vertCount = base + pCount;
    this.idxCount = io + addIndices;
  }

  toMesh(THREE, material, name) {
    if (this.vertCount === 0) return null;
    const geom = new THREE.BufferGeometry();
    const vc3 = this.vertCount * 3;
    geom.setAttribute('position', new THREE.BufferAttribute(this._pos.slice(0, vc3), 3));
    geom.setAttribute('normal', new THREE.BufferAttribute(this._norm.slice(0, vc3), 3));
    if (this.vertCount > 65535) {
      geom.setIndex(new THREE.BufferAttribute(this._idx.slice(0, this.idxCount), 1));
    } else {
      const idx16 = new Uint16Array(this.idxCount);
      const src = this._idx;
      for (let i = 0; i < this.idxCount; i++) idx16[i] = src[i];
      geom.setIndex(new THREE.BufferAttribute(idx16, 1));
    }
    geom.computeBoundingSphere();
    geom.computeBoundingBox();
    const mesh = new THREE.Mesh(geom, material);
    if (name) mesh.name = name;
    return mesh;
  }
}

class MultiMaterialBuilder {
  constructor(THREE, materials) {
    this.THREE = THREE;
    this.materials = materials;
    this.buckets = new Map();
    this._m4 = new THREE.Matrix4();
    this._v0 = new THREE.Vector3();
    this._v1 = new THREE.Vector3();
    this._up = new THREE.Vector3();
    this._xAxis = new THREE.Vector3();
    this._yAxis = new THREE.Vector3();
    this._zAxis = new THREE.Vector3();
    this._basis = new THREE.Matrix4();
    this._scale = new THREE.Matrix4();
    this._boxEuler = new THREE.Euler(0, 0, 0, 'YXZ');
    this._boxQuat = new THREE.Quaternion();
  }

  bucket(matKey) {
    let b = this.buckets.get(matKey);
    if (!b) {
      b = new MeshBucket();
      this.buckets.set(matKey, b);
    }
    return b;
  }

  /**
   * Add a rectangular structural strut/beam from p0=[x,y,z] to p1=[x,y,z]
   * with cross-section width `w` (along refUp x dir) and depth `d` (in refUp plane).
   */
  addStrut(matKey, p0, p1, w, d, refUp = [0, 1, 0]) {
    const dx = p1[0] - p0[0];
    const dy = p1[1] - p0[1];
    const dz = p1[2] - p0[2];
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-5) return;

    const yAx = this._yAxis.set(dx / len, dy / len, dz / len);
    const up = this._up.set(refUp[0], refUp[1], refUp[2]);
    if (Math.abs(yAx.dot(up)) > 0.96) {
      up.set(1, 0, 0);
      if (Math.abs(yAx.dot(up)) > 0.9) up.set(0, 0, 1);
    }
    const xAx = this._xAxis.crossVectors(up, yAx).normalize();
    const zAx = this._zAxis.crossVectors(yAx, xAx).normalize();

    this._basis.makeBasis(xAx, yAx, zAx);
    this._basis.setPosition(
      (p0[0] + p1[0]) * 0.5,
      (p0[1] + p1[1]) * 0.5,
      (p0[2] + p1[2]) * 0.5
    );
    this._scale.makeScale(w, len, d);
    this._m4.multiplyMatrices(this._basis, this._scale);
    this.bucket(matKey).addBoxMatrix(this.THREE, this._m4);
  }

  /**
   * Add an axis-aligned or yaw-rotated box centered at [cx, cy, cz].
   */
  addBox(matKey, center, size, yawRad = 0, pitchRad = 0, rollRad = 0) {
    this._boxEuler.set(pitchRad, yawRad, rollRad, 'YXZ');
    this._boxQuat.setFromEuler(this._boxEuler);
    this._v0.set(center[0], center[1], center[2]);
    this._v1.set(size[0], size[1], size[2]);
    this._m4.compose(this._v0, this._boxQuat, this._v1);
    this.bucket(matKey).addBoxMatrix(this.THREE, this._m4);
  }

  /**
   * Add an oriented box given explicit orthonormal basis vectors uRight, uUp, uFwd.
   */
  addOrientedBox(matKey, center, size, uRight, uUp, uFwd) {
    const { THREE } = this;
    const xAx = new THREE.Vector3(uRight[0], uRight[1], uRight[2]).normalize();
    const yAx = new THREE.Vector3(uUp[0], uUp[1], uUp[2]).normalize();
    const zAx = new THREE.Vector3(uFwd[0], uFwd[1], uFwd[2]).normalize();
    const basis = new THREE.Matrix4().makeBasis(xAx, yAx, zAx);
    basis.setPosition(center[0], center[1], center[2]);
    const sc = new THREE.Matrix4().makeScale(size[0], size[1], size[2]);
    basis.multiply(sc);
    this.bucket(matKey).addBoxMatrix(THREE, basis);
  }

  addCylinder(matKey, p0, p1, r0, r1 = r0, segs = 10, openEnded = false) {
    this.bucket(matKey).addCylinderBetween(this.THREE, p0, p1, r0, r1, segs, openEnded);
  }

  /**
   * Add a spoked 1889 cast-iron pulley sheave (`Poulie`) centered at `center`
   * with rotation axis `axisVec` and outer radius `radius`.
   */
  addSpokedSheave(matKey, center, axisVec, radius, width = 0.22, numSpokes = 8) {
    const ax = [axisVec[0], axisVec[1], axisVec[2]];
    const al = Math.hypot(ax[0], ax[1], ax[2]) || 1;
    ax[0] /= al;
    ax[1] /= al;
    ax[2] /= al;

    // Hub
    const halfW = width * 0.65;
    this.addCylinder(
      matKey,
      [center[0] - ax[0] * halfW, center[1] - ax[1] * halfW, center[2] - ax[2] * halfW],
      [center[0] + ax[0] * halfW, center[1] + ax[1] * halfW, center[2] + ax[2] * halfW],
      radius * 0.22,
      radius * 0.22,
      10
    );

    // Orthonormal plane vectors u1, u2 perpendicular to ax
    const ref = Math.abs(ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    let u1 = [
      ax[1] * ref[2] - ax[2] * ref[1],
      ax[2] * ref[0] - ax[0] * ref[2],
      ax[0] * ref[1] - ax[1] * ref[0],
    ];
    const l1 = Math.hypot(u1[0], u1[1], u1[2]) || 1;
    u1 = [u1[0] / l1, u1[1] / l1, u1[2] / l1];
    const u2 = [
      ax[1] * u1[2] - ax[2] * u1[1],
      ax[2] * u1[0] - ax[0] * u1[2],
      ax[0] * u1[1] - ax[1] * u1[0],
    ];

    const rimSegs = 16;
    for (let i = 0; i < rimSegs; i++) {
      const a0 = (i / rimSegs) * Math.PI * 2;
      const a1 = ((i + 1) / rimSegs) * Math.PI * 2;
      const p0 = [
        center[0] + radius * (Math.cos(a0) * u1[0] + Math.sin(a0) * u2[0]),
        center[1] + radius * (Math.cos(a0) * u1[1] + Math.sin(a0) * u2[1]),
        center[2] + radius * (Math.cos(a0) * u1[2] + Math.sin(a0) * u2[2]),
      ];
      const p1 = [
        center[0] + radius * (Math.cos(a1) * u1[0] + Math.sin(a1) * u2[0]),
        center[1] + radius * (Math.cos(a1) * u1[1] + Math.sin(a1) * u2[1]),
        center[2] + radius * (Math.cos(a1) * u1[2] + Math.sin(a1) * u2[2]),
      ];
      this.addStrut(matKey, p0, p1, width, radius * 0.14, ax);
    }

    for (let s = 0; s < numSpokes; s++) {
      const ang = (s / numSpokes) * Math.PI * 2;
      const tip = [
        center[0] + (radius * 0.94) * (Math.cos(ang) * u1[0] + Math.sin(ang) * u2[0]),
        center[1] + (radius * 0.94) * (Math.cos(ang) * u1[1] + Math.sin(ang) * u2[1]),
        center[2] + (radius * 0.94) * (Math.cos(ang) * u1[2] + Math.sin(ang) * u2[2]),
      ];
      this.addStrut(matKey, center, tip, width * 0.42, radius * 0.08, ax);
    }
  }

  /**
   * Add a flanged hydraulic cylinder / cast-iron pipe with bolted collar rings.
   */
  addFlangedCylinder(matKey, p0, p1, radius, collarEveryM = 2.8, segs = 12) {
    this.addCylinder(matKey, p0, p1, radius, radius, segs);
    const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
    if (len < 0.2) return;
    const nCollars = Math.max(2, Math.round(len / collarEveryM) + 1);
    const ux = (p1[0] - p0[0]) / len;
    const uy = (p1[1] - p0[1]) / len;
    const uz = (p1[2] - p0[2]) / len;
    const halfT = Math.min(0.11, len * 0.15);
    for (let i = 0; i < nCollars; i++) {
      const t = i / (nCollars - 1);
      const cx = lerp(p0[0], p1[0], t);
      const cy = lerp(p0[1], p1[1], t);
      const cz = lerp(p0[2], p1[2], t);
      this.addCylinder(
        matKey,
        [cx - ux * halfT, cy - uy * halfT, cz - uz * halfT],
        [cx + ux * halfT, cy + uy * halfT, cz + uz * halfT],
        radius * 1.26,
        radius * 1.26,
        segs
      );
    }
  }

  /**
   * Build into a THREE.Group containing 1 merged Mesh per used material key.
   */
  buildGroup(groupName) {
    const g = new this.THREE.Group();
    g.name = groupName;
    for (const [matKey, bucket] of this.buckets.entries()) {
      const mat = this.materials[matKey] || this.materials.ironPrimary;
      const mesh = bucket.toMesh(this.THREE, mat, `${groupName}_${matKey}`);
      if (mesh) g.add(mesh);
    }
    return g;
  }
}

// ============================================================================
// SUBSYSTEM 1: Permanent Inclined Elevator Track Girders (`Poutres de roulement`)
//              & Support Bents (`Piliers E & F`) + RdC Boarding Platforms
// ============================================================================
function buildTrackSegmentOnPier(mmb, pier, yStart, yEnd, stepM = 2.35, opts = {}) {
  const halfGauge = 1.2275; // Exact 2.455 m girder center-to-center (Pl. 53 Fig. 4)
  const girderDepth = 0.88; // Depth normal to slope
  const chordW = 0.24;
  const chordH = 0.11;

  const uPerp = [pier.sz * INV_SQRT2, 0, -pier.sx * INV_SQRT2];
  const nSegs = Math.max(2, Math.ceil((yEnd - yStart) / stepM));

  for (let i = 0; i < nSegs; i++) {
    const y0 = lerp(yStart, yEnd, i / nSegs);
    const y1 = lerp(yStart, yEnd, (i + 1) / nSegs);
    const r0 = trackRadiusAtY(y0);
    const r1 = trackRadiusAtY(y1);

    // Tangent along track upward & inward normal in the vertical diagonal plane
    const dr = r1 - r0;
    const dy = y1 - y0;
    const segLen = Math.hypot(dr, dy) || 1;
    // Outward normal in (r, y) plane: (+dy/segLen, -dr/segLen) since dr < 0 => (+dy, +|dr|) points UP-OUTWARD
    const nr = dy / segLen;
    const ny = -dr / segLen;

    for (const side of [-1, 1]) {
      const s = side * halfGauge;
      // Top chord (rail level) & bottom chord (offset downward/inward by girderDepth)
      const top0 = pierWorldPos(pier, y0 + ny * (girderDepth * 0.45), r0 + nr * (girderDepth * 0.45), s);
      const top1 = pierWorldPos(pier, y1 + ny * (girderDepth * 0.45), r1 + nr * (girderDepth * 0.45), s);
      const bot0 = pierWorldPos(pier, y0 - ny * (girderDepth * 0.55), r0 - nr * (girderDepth * 0.55), s);
      const bot1 = pierWorldPos(pier, y1 - ny * (girderDepth * 0.55), r1 - nr * (girderDepth * 0.55), s);

      mmb.addStrut('ironPrimary', top0, top1, chordW, chordH, uPerp);
      mmb.addStrut('ironPrimary', bot0, bot1, chordW, chordH, uPerp);

      // Machined bright steel rail head atop top chord
      const rail0 = pierWorldPos(pier, y0 + ny * (girderDepth * 0.54), r0 + nr * (girderDepth * 0.54), s);
      const rail1 = pierWorldPos(pier, y1 + ny * (girderDepth * 0.54), r1 + nr * (girderDepth * 0.54), s);
      mmb.addStrut('craneSteel', rail0, rail1, 0.09, 0.08, uPerp);

      // Double X-lattice web (`treillis` St. Andrew's cross) inside each girder panel
      const midTop = [
        (top0[0] + top1[0]) * 0.5,
        (top0[1] + top1[1]) * 0.5,
        (top0[2] + top1[2]) * 0.5,
      ];
      const midBot = [
        (bot0[0] + bot1[0]) * 0.5,
        (bot0[1] + bot1[1]) * 0.5,
        (bot0[2] + bot1[2]) * 0.5,
      ];
      mmb.addStrut('ironLattice', top0, midBot, 0.07, 0.06, uPerp);
      mmb.addStrut('ironLattice', bot0, midTop, 0.07, 0.06, uPerp);
      mmb.addStrut('ironLattice', midTop, bot1, 0.07, 0.06, uPerp);
      mmb.addStrut('ironLattice', midBot, top1, 0.07, 0.06, uPerp);
      mmb.addStrut('ironLattice', top0, bot0, 0.1, 0.09, uPerp);
    }

    // Transverse cross-ties (`entretoises`) & horizontal St. Andrew's wind bracing between the twin girders
    const lTop0 = pierWorldPos(pier, y0, r0, -halfGauge);
    const rTop0 = pierWorldPos(pier, y0, r0, halfGauge);
    const lTop1 = pierWorldPos(pier, y1, r1, -halfGauge);
    const rTop1 = pierWorldPos(pier, y1, r1, halfGauge);
    mmb.addStrut('ironPrimary', lTop0, rTop0, 0.14, 0.18, [0, 1, 0]);
    mmb.addStrut('ironLattice', lTop0, rTop1, 0.065, 0.065, [0, 1, 0]);
    mmb.addStrut('ironLattice', rTop0, lTop1, 0.065, 0.065, [0, 1, 0]);

    // Central slotted safety rack / cable trough beam
    const c0 = pierWorldPos(pier, y0 - ny * 0.12, r0 - nr * 0.12, 0);
    const c1 = pierWorldPos(pier, y1 - ny * 0.12, r1 - nr * 0.12, 0);
    mmb.addStrut('ironCast', c0, c1, 0.16, 0.14, [0, 1, 0]);
  }

  // Tie struts & support bents (`Piliers E & F`) at structural panel elevations
  if (opts.panelTies) {
    for (const yTie of opts.panelTies) {
      if (yTie < yStart - 0.5 || yTie > yEnd + 0.5) continue;
      const rT = trackRadiusAtY(yTie);
      const halfSpanPier = yTie < 60 ? lerp(5.8, 4.2, clamp(yTie / 60, 0, 1)) : lerp(4.1, 3.1, clamp((yTie - 60) / 60, 0, 1));
      const pL = pierWorldPos(pier, yTie, rT, -halfSpanPier);
      const pR = pierWorldPos(pier, yTie, rT, halfSpanPier);
      mmb.addStrut('ironPrimary', pL, pR, 0.24, 0.28, [0, 1, 0]);
      // Inclined knee braces under track girders
      for (const side of [-1, 1]) {
        const gPt = pierWorldPos(pier, yTie, rT, side * halfGauge);
        const kPt = pierWorldPos(pier, yTie - 1.8, trackRadiusAtY(yTie - 1.8), side * (halfSpanPier * 0.85));
        mmb.addStrut('ironLattice', gPt, kPt, 0.12, 0.12, [0, 1, 0]);
      }
    }
  }

  // RdC Double-Deck Boarding Platforms (`35.08 NGF` = +1.58m & `39.30 NGF` = +5.80m) + Glazed Skylight
  if (opts.includeBaseBoarding) {
    // Support bents Piliers E & F down to pier pit curb (-2.48m, above -2.55m sub-floor pump room section)
    for (const yBent of [1.58, 5.80, 9.20]) {
      const rB = trackRadiusAtY(yBent);
      for (const side of [-1, 1]) {
        const topP = pierWorldPos(pier, yBent, rB, side * halfGauge);
        const botP = pierWorldPos(pier, -2.48, rB, side * halfGauge);
        mmb.addStrut('ironPrimary', topP, botP, 0.24, 0.24, uPerp);
      }
      const x0 = pierWorldPos(pier, -1.2, rB, -halfGauge);
      const x1 = pierWorldPos(pier, yBent - 0.3, rB, halfGauge);
      const x2 = pierWorldPos(pier, -1.2, rB, halfGauge);
      const x3 = pierWorldPos(pier, yBent - 0.3, rB, -halfGauge);
      mmb.addStrut('ironLattice', x0, x1, 0.08, 0.08, [0, 1, 0]);
      mmb.addStrut('ironLattice', x2, x3, 0.08, 0.08, [0, 1, 0]);
    }

    const uRad = [pier.sx * INV_SQRT2, 0, pier.sz * INV_SQRT2];
    const uUp = [0, 1, 0];
    for (const [yDeck, rSpan] of [[1.58, 4.4], [4.02, 2.8]]) {
      const rDeck = trackRadiusAtY(yDeck + 0.6);
      for (const side of [-1, 1]) {
        const deckCenter = pierWorldPos(pier, yDeck - 0.08, rDeck, side * 2.85);
        mmb.addOrientedBox('woodPavilion', deckCenter, [2.5, 0.16, rSpan], uPerp, uUp, uRad);
        mmb.addOrientedBox('ironPrimary', [deckCenter[0], yDeck - 0.24, deckCenter[2]], [2.6, 0.18, rSpan + 0.1], uPerp, uUp, uRad);
        // Boarding railing + posts
        const outerS = side * 4.05;
        const railA = pierWorldPos(pier, yDeck + 1.02, rDeck - rSpan * 0.48, outerS);
        const railB = pierWorldPos(pier, yDeck + 1.02, rDeck + rSpan * 0.48, outerS);
        mmb.addStrut('ironLattice', railA, railB, 0.06, 0.06, uUp);
        for (let k = -2; k <= 2; k++) {
          const rPost = rDeck + (k / 2) * (rSpan * 0.46);
          const pBot = pierWorldPos(pier, yDeck, rPost, outerS);
          const pTop = pierWorldPos(pier, yDeck + 1.04, rPost, outerS);
          mmb.addStrut('ironLattice', pBot, pTop, 0.05, 0.05, uPerp);
        }
        if (yDeck > 3.0) {
          // Iron columns supporting the +4.02m upper cabin boarding gallery (`Cab2` on Pl. 08 Fig. 4)
          for (const rk of [-1, 1]) {
            const cBot = pierWorldPos(pier, 1.58, rDeck + rk * 1.1, side * 3.8);
            const cTop = pierWorldPos(pier, yDeck - 0.2, rDeck + rk * 1.1, side * 3.8);
            mmb.addCylinder('ironCast', cBot, cTop, 0.11, 0.09, 10);
          }
        }
      }
    }

    // Glazed skylight (`Lanterne vitrée` on Pl. 69 Fig. 1 & Pl. 63 Fig. 1) over Combaluzier outer pits (Piles 2 & 4)
    if (pier.system !== 'otis') {
      const rSky = 74.8;
      const skyCenter = pierWorldPos(pier, 2.05, rSky, 0);
      mmb.addOrientedBox('ironPrimary', [skyCenter[0], 1.68, skyCenter[2]], [3.3, 0.22, 4.6], uPerp, uUp, uRad);
      mmb.addOrientedBox('glass1889', [skyCenter[0], 2.15, skyCenter[2]], [3.1, 0.72, 4.4], uPerp, uUp, uRad);
      for (let m = -2; m <= 2; m++) {
        const ridge = pierWorldPos(pier, 2.62, rSky + m * 0.95, 0);
        const eaveL = pierWorldPos(pier, 1.82, rSky + m * 0.95, -1.58);
        const eaveR = pierWorldPos(pier, 1.82, rSky + m * 0.95, 1.58);
        mmb.addStrut('ironLattice', ridge, eaveL, 0.05, 0.05, uUp);
        mmb.addStrut('ironLattice', ridge, eaveR, 0.05, 0.05, uUp);
      }
    }
  }

  // Stage-2 Otis 2nd-floor arrival headframe (`chevalement`), cantilevered deflection bracket (`Pou11`),
  // wood-boarded pit enclosure (`tambour en planches`), elevated disembarkation platform (`es`) & twin
  // approach stairs (`Escalier d'accès`) — Photo 32, Pl. 08 Fig. 3, Pl. 45 Fig. 2 & Pl. 53 Fig. 12.
  if (opts.includeOtisHeadframe) {
    const wMmb = opts.woodBuilder || mmb;
    const uRad = [pier.sx * INV_SQRT2, 0, pier.sz * INV_SQRT2];
    const uUp = [0, 1, 0];
    const yFloor2 = 115.73;
    const yPlat = 117.75;
    const yCant = 120.25;
    const yTop = 123.88; // Strictly inside Pl. 08 Fig. 3 Y <= 124.4 m envelope
    const drRear = -1.28;
    const drFront = 1.05;
    const halfCageW = 1.20;

    // 1. Riveted 4-post open-laced box-frame arrival `chevalement` (Y = 115.73 .. 123.88 m)
    for (const side of [-1, 1]) {
      const sCol = side * halfCageW;
      for (const drCol of [drRear, drFront]) {
        for (const dSub of [-0.11, 0.11]) {
          mmb.addStrut(
            'ironPrimary',
            pierWorldPos(pier, yFloor2, trackRadiusAtY(yFloor2) + drCol + dSub, sCol),
            pierWorldPos(pier, yTop, trackRadiusAtY(yTop) + drCol + dSub, sCol),
            0.09,
            0.11,
            uPerp
          );
        }
        const nLace = 8;
        for (let k = 0; k < nLace; k++) {
          const ya = lerp(yFloor2, yTop, k / nLace);
          const yb = lerp(yFloor2, yTop, (k + 1) / nLace);
          const sign = k % 2 === 0 ? 1 : -1;
          mmb.addStrut(
            'ironLattice',
            pierWorldPos(pier, ya, trackRadiusAtY(ya) + drCol - 0.11 * sign, sCol),
            pierWorldPos(pier, yb, trackRadiusAtY(yb) + drCol + 0.11 * sign, sCol),
            0.035,
            0.045,
            uPerp
          );
        }
      }
      // Horizontal side tie-girders & Saint-André side X-bracing across 3 tiers
      const yTiers = [yFloor2, yPlat, yCant, 122.35, yTop];
      for (let t = 1; t < yTiers.length; t++) {
        const yt = yTiers[t];
        const rt = trackRadiusAtY(yt);
        mmb.addStrut(
          'ironPrimary',
          pierWorldPos(pier, yt, rt + drRear, sCol),
          pierWorldPos(pier, yt, rt + drFront, sCol),
          0.13,
          0.16,
          uUp
        );
        const y0t = yTiers[t - 1];
        const r0t = trackRadiusAtY(y0t);
        mmb.addStrut('ironLattice', pierWorldPos(pier, y0t, r0t + drRear, sCol), pierWorldPos(pier, yt, rt + drFront, sCol), 0.055, 0.065, uPerp);
        mmb.addStrut('ironLattice', pierWorldPos(pier, y0t, r0t + drFront, sCol), pierWorldPos(pier, yt, rt + drRear, sCol), 0.055, 0.065, uPerp);
      }
    }
    // Transverse portal tie-beams & rear portal X-bracing
    for (const yt of [yPlat, yCant, 122.35, yTop]) {
      const rt = trackRadiusAtY(yt);
      for (const drCol of [drRear, drFront]) {
        if (yt === yPlat && drCol === drFront) continue; // Keep upper-cabin boarding doorway clear
        mmb.addStrut(
          'ironPrimary',
          pierWorldPos(pier, yt, rt + drCol, -halfCageW - 0.06),
          pierWorldPos(pier, yt, rt + drCol, halfCageW + 0.06),
          0.15,
          0.18,
          uUp
        );
      }
    }
    for (const [ya, yb] of [[yPlat, yCant], [yCant, yTop]]) {
      const ra = trackRadiusAtY(ya) + drRear;
      const rb = trackRadiusAtY(yb) + drRear;
      mmb.addStrut('ironLattice', pierWorldPos(pier, ya, ra, -halfCageW), pierWorldPos(pier, yb, rb, halfCageW), 0.055, 0.065, uRad);
      mmb.addStrut('ironLattice', pierWorldPos(pier, ya, ra, halfCageW), pierWorldPos(pier, yb, rb, -halfCageW), 0.055, 0.065, uRad);
    }

    // 2. Crown sheaves (`Pou8`, `Pou9`, `Pou12`) & triangular cantilevered deflection bracket (`Pou11`, `Pou10`)
    const rTop = trackRadiusAtY(123.38);
    for (const sOff of [-0.62, 0.0, 0.62]) {
      mmb.addSpokedSheave('ironCast', pierWorldPos(pier, 123.38, rTop + 0.08, sOff), uPerp, 0.68, 0.16, 8);
    }
    for (const sOff of [-0.58, 0.58]) {
      const pPou8 = pierWorldPos(pier, 122.78, 11.45, sOff);
      const pPou9 = pierWorldPos(pier, 122.71, 14.08, sOff);
      mmb.addSpokedSheave('ironCast', pPou8, uPerp, 0.68, 0.15, 8);
      mmb.addSpokedSheave('ironCast', pPou9, uPerp, 0.68, 0.15, 8);
      mmb.addSpokedSheave('ironCast', pierWorldPos(pier, 121.95, 14.55, sOff), uPerp, 0.34, 0.12, 6);
      // Compact middle-chord cheek bracket cradling Pou9 + horizontal hoist cables
      mmb.addStrut('ironPrimary', pierWorldPos(pier, 122.32, 13.52, sOff * 1.18), pierWorldPos(pier, 122.32, 14.62, sOff * 1.18), 0.10, 0.14, uUp);
      mmb.addStrut('craneSteel', pierWorldPos(pier, 123.42, 11.45, sOff), pierWorldPos(pier, 123.35, 14.08, sOff), 0.03, 0.03, uUp);
    }

    // Triangular cantilevered iron bracket projecting horizontally from headframe side carrying `Pou11` (Photo 32 & Pl. 08 Fig. 3)
    const rCantBase = trackRadiusAtY(yCant) + drRear;
    const rCantTip = 8.38;
    for (const side of [-1, 1]) {
      const sBrk = side * 0.92;
      const topIn = pierWorldPos(pier, yCant + 0.18, rCantBase, sBrk);
      const topOut = pierWorldPos(pier, yCant + 0.18, rCantTip, sBrk);
      const botIn = pierWorldPos(pier, yCant - 0.16, rCantBase, sBrk);
      const botOut = pierWorldPos(pier, yCant - 0.16, rCantTip, sBrk);
      const kneeFoot = pierWorldPos(pier, 118.48, trackRadiusAtY(118.48) + drRear, sBrk);
      mmb.addStrut('ironPrimary', topIn, topOut, 0.09, 0.11, uUp);
      mmb.addStrut('ironPrimary', botIn, botOut, 0.09, 0.11, uUp);
      mmb.addStrut('ironPrimary', topOut, botOut, 0.09, 0.10, uPerp);
      // X-laced cantilever cheek + prominent raking diagonal strut
      for (let b = 0; b < 3; b++) {
        const ra = lerp(rCantBase, rCantTip, b / 3);
        const rb = lerp(rCantBase, rCantTip, (b + 1) / 3);
        mmb.addStrut('ironLattice', pierWorldPos(pier, yCant - 0.15, ra, sBrk), pierWorldPos(pier, yCant + 0.17, rb, sBrk), 0.035, 0.04, uPerp);
        mmb.addStrut('ironLattice', pierWorldPos(pier, yCant + 0.17, ra, sBrk), pierWorldPos(pier, yCant - 0.15, rb, sBrk), 0.035, 0.04, uPerp);
      }
      mmb.addStrut('ironPrimary', kneeFoot, botOut, 0.12, 0.14, uPerp);
    }
    mmb.addStrut('ironPrimary', pierWorldPos(pier, yCant, rCantTip, -0.96), pierWorldPos(pier, yCant, rCantTip, 0.96), 0.12, 0.34, uUp);
    for (const sOff of [-0.48, 0.48]) {
      mmb.addSpokedSheave('ironCast', pierWorldPos(pier, 120.38, 8.70, sOff), uPerp, 0.64, 0.15, 8);
      mmb.addSpokedSheave('ironCast', pierWorldPos(pier, 115.96, 9.65, sOff), uPerp, 0.24, 0.10, 6);
      mmb.addStrut('craneSteel', pierWorldPos(pier, 123.38, rTop - 0.55, sOff), pierWorldPos(pier, 120.55, 8.15, sOff), 0.028, 0.028, uPerp);
      mmb.addStrut('craneSteel', pierWorldPos(pier, 120.15, 8.18, sOff), pierWorldPos(pier, 115.96, 9.52, sOff), 0.028, 0.028, uPerp);
    }

    // 3. Vertical tongue-and-groove wood-boarded lower pit safety enclosure (`tambour en planches`, Y = 115.73..117.65 m)
    const yEncTop = 117.65;
    const hEnc = yEncTop - yFloor2;
    const yEncMid = (yFloor2 + yEncTop) * 0.5;
    const rEncIn = 10.82;
    const rEncOut = 13.62;
    const rEncLen = rEncOut - rEncIn;
    const rEncMid = (rEncIn + rEncOut) * 0.5;
    const halfEncW = 1.28;
    for (const side of [-1, 1]) {
      const sWall = side * halfEncW;
      wMmb.addOrientedBox('woodPavilion', pierWorldPos(pier, yEncMid, rEncMid, sWall), [0.06, hEnc, rEncLen], uPerp, uUp, uRad);
      wMmb.addOrientedBox('woodTimberTemp', pierWorldPos(pier, yEncTop + 0.03, rEncMid, sWall), [0.11, 0.06, rEncLen + 0.08], uPerp, uUp, uRad);
      for (let rB = rEncIn + 0.14; rB <= rEncOut - 0.10; rB += 0.24) {
        wMmb.addOrientedBox('woodTimberTemp', pierWorldPos(pier, yEncMid, rB, sWall + side * 0.035), [0.024, hEnc - 0.06, 0.035], uPerp, uUp, uRad);
      }
      mmb.addStrut('ironPrimary', pierWorldPos(pier, yFloor2, rEncIn, sWall), pierWorldPos(pier, yEncTop, rEncIn, sWall), 0.07, 0.07, uPerp);
      mmb.addStrut('ironPrimary', pierWorldPos(pier, yFloor2, rEncOut, sWall), pierWorldPos(pier, yEncTop, rEncOut, sWall), 0.07, 0.07, uPerp);
    }
    // Rear pit wall + framed "RÈGLEMENT" notice plaque (Photo 32) + front lower-cabin portal cheeks
    wMmb.addOrientedBox('woodPavilion', pierWorldPos(pier, yEncMid, rEncIn, 0), [halfEncW * 2.0, hEnc, 0.06], uPerp, uUp, uRad);
    wMmb.addOrientedBox('woodTimberTemp', pierWorldPos(pier, yEncTop + 0.03, rEncIn, 0), [halfEncW * 2.0 + 0.08, 0.06, 0.11], uPerp, uUp, uRad);
    for (let sB = -halfEncW + 0.16; sB <= halfEncW - 0.12; sB += 0.24) {
      wMmb.addOrientedBox('woodTimberTemp', pierWorldPos(pier, yEncMid, rEncIn - 0.035, sB), [0.035, hEnc - 0.06, 0.024], uPerp, uUp, uRad);
    }
    wMmb.addOrientedBox('ironCast', pierWorldPos(pier, 116.88, rEncIn - 0.05, 0), [0.64, 0.76, 0.025], uPerp, uUp, uRad);
    wMmb.addOrientedBox('masonryAshlar', pierWorldPos(pier, 116.88, rEncIn - 0.062, 0), [0.56, 0.68, 0.018], uPerp, uUp, uRad);
    for (const side of [-1, 1]) {
      wMmb.addOrientedBox('woodPavilion', pierWorldPos(pier, yEncMid, rEncOut, side * 0.99), [0.58, hEnc, 0.06], uPerp, uUp, uRad);
    }
    wMmb.addOrientedBox('woodPavilion', pierWorldPos(pier, 117.46, rEncOut, 0), [1.42, 0.38, 0.06], uPerp, uUp, uRad);

    // 4. Elevated passenger disembarkation platform (`es`, Y = 117.75 m) & twin approach stairs (`Escalier d'accès`)
    const rPlatIn = 11.45;
    const rPlatOut = 14.85;
    const rStairFoot = 16.82;
    const walkW = 0.76;
    for (const side of [-1, 1]) {
      const sWalk = side * 1.66;
      const sOuter = side * (1.66 + walkW * 0.48);
      const rWalkLen = rPlatOut - rPlatIn;
      const rWalkMid = (rPlatIn + rPlatOut) * 0.5;
      wMmb.addOrientedBox('woodPavilion', pierWorldPos(pier, yPlat - 0.04, rWalkMid, sWalk), [walkW, 0.08, rWalkLen], uPerp, uUp, uRad);
      mmb.addOrientedBox('ironPrimary', pierWorldPos(pier, yPlat - 0.11, rWalkMid, sOuter), [0.06, 0.14, rWalkLen], uPerp, uUp, uRad);
      for (const rCol of [rPlatIn + 0.08, 13.58, rPlatOut - 0.06]) {
        mmb.addStrut('ironPrimary', pierWorldPos(pier, yFloor2, rCol, sOuter), pierWorldPos(pier, yPlat, rCol, sOuter), 0.08, 0.08, uPerp);
      }
      // Side platform iron handrails (Y = 117.75 .. 118.73 m) & balusters
      for (const dyR of [0.48, 0.98]) {
        mmb.addStrut('ironLattice', pierWorldPos(pier, yPlat + dyR, rPlatIn, sOuter), pierWorldPos(pier, yPlat + dyR, rPlatOut, sOuter), 0.04, 0.04, uUp);
      }
      mmb.addStrut('ironLattice', pierWorldPos(pier, yPlat + 0.98, rPlatIn, sOuter), pierWorldPos(pier, yPlat + 0.98, rPlatIn, side * halfCageW), 0.04, 0.04, uUp);
      for (let b = 0; b <= 7; b++) {
        const rb = lerp(rPlatIn, rPlatOut, b / 7);
        mmb.addStrut('ironLattice', pierWorldPos(pier, yPlat, rb, sOuter), pierWorldPos(pier, yPlat + 0.98, rb, sOuter), 0.03, 0.03, uPerp);
      }

      // Twin approach stair flights (`Escalier d'accès`, 10 steps from Y=117.75, r=14.85 down to Y=115.73, r=16.82)
      const sStair = side * 1.56;
      for (const ds of [-walkW * 0.47, walkW * 0.47]) {
        const sStr = sStair + ds;
        mmb.addStrut('ironPrimary', pierWorldPos(pier, yPlat - 0.06, rPlatOut, sStr), pierWorldPos(pier, yFloor2 + 0.04, rStairFoot, sStr), 0.05, 0.16, uPerp);
        for (const dyR of [0.48, 0.98]) {
          mmb.addStrut('ironLattice', pierWorldPos(pier, yPlat + dyR, rPlatOut, sStr), pierWorldPos(pier, yFloor2 + dyR, rStairFoot, sStr), 0.038, 0.042, uPerp);
        }
        for (let st = 0; st <= 5; st++) {
          const tSt = st / 5;
          const ySt = lerp(yPlat, yFloor2, tSt);
          const rSt = lerp(rPlatOut, rStairFoot, tSt);
          mmb.addStrut('ironLattice', pierWorldPos(pier, ySt, rSt, sStr), pierWorldPos(pier, ySt + 0.98, rSt, sStr), 0.028, 0.028, uPerp);
        }
        // Scrolled wrought-iron bottom newel post (Photo 32)
        mmb.addCylinder('ironCast', pierWorldPos(pier, yFloor2, rStairFoot + 0.06, sStr), pierWorldPos(pier, yFloor2 + 1.06, rStairFoot + 0.06, sStr), 0.042, 0.034, 8);
      }
      const nSteps = 10;
      for (let st = 0; st < nSteps; st++) {
        const tSt = (st + 0.5) / nSteps;
        const yStep = lerp(yPlat, yFloor2, tSt);
        const rStep = lerp(rPlatOut, rStairFoot, tSt);
        wMmb.addOrientedBox('woodPavilion', pierWorldPos(pier, yStep, rStep, sStair), [walkW - 0.06, 0.045, 0.23], uPerp, uUp, uRad);
      }
    }
    // Front upper-cabin threshold bridge (`r = 13.64 .. 14.85 m`) + central front parapet between the twin stairs
    wMmb.addOrientedBox('woodPavilion', pierWorldPos(pier, yPlat - 0.04, 14.24, 0), [2.56, 0.08, 1.20], uPerp, uUp, uRad);
    mmb.addOrientedBox('ironPrimary', pierWorldPos(pier, yPlat - 0.12, 14.82, 0), [4.08, 0.14, 0.08], uPerp, uUp, uRad);
    for (const dyR of [0.48, 0.98]) {
      mmb.addStrut('ironLattice', pierWorldPos(pier, yPlat + dyR, rPlatOut, -1.16), pierWorldPos(pier, yPlat + dyR, rPlatOut, 1.16), 0.04, 0.04, uUp);
    }
    for (let k = -2; k <= 2; k++) {
      mmb.addStrut('ironLattice', pierWorldPos(pier, yPlat, rPlatOut, k * 0.56), pierWorldPos(pier, yPlat + 0.98, rPlatOut, k * 0.56), 0.03, 0.03, uRad);
    }

    // Guide pulley `Pou14` under stair (Pl. 08 Fig. 3) + curve/track guide sheaves `Pou5..Pou7`
    for (const side of [-0.58, 0.58]) {
      mmb.addSpokedSheave('ironCast', pierWorldPos(pier, 115.68, 15.65, side), uPerp, 0.28, 0.10, 6);
    }
    for (const yGuide of [56.2, 66.2, 70.5, 79.5, 92.0, 104.5, 115.4]) {
      const rG = trackRadiusAtY(yGuide);
      for (const side of [-0.82, 0.82]) {
        const gPos = pierWorldPos(pier, yGuide - 0.55, rG + 0.45, side);
        mmb.addSpokedSheave('ironCast', gPos, uPerp, 0.52, 0.14, 6);
      }
    }
  }
}

// ============================================================================
// SUBSYSTEM 2: Authentic 1889 Straight Parallel Pier Stairs (`DESCENTE`, Photo 47),
//              Panneau 6 4-Flight Switchbacks (Pl. 20), Stage-2 Switchbacks (Piles 2 & 4),
//              & Outer-Chord Caged Helical Service Stairs (Piles 1 & 3, Pl. 08 Figs. 3–4)
// ============================================================================
const STAGE2_PIER_KNOTS = [
  [57.6300, 30.2593, 15.2593, 0.88],
  [68.6300, 27.7200, 13.6200, 0.86], // Exact 14.10m center-to-center (`xo - xi = 14.10m`)
  [77.6770, 25.2000, 11.9600, 0.84],
  [89.2038, 21.9800, 10.0800, 0.82],
  [100.0635, 18.7600, 8.2400, 0.80],
  [104.0000, 17.8100, 7.5950, 0.79],
  [110.6292, 16.4250, 6.7450, 0.78],
  [115.7300, 15.4350, 6.0200, 0.76],
];

function stage2PierBoundsAtY(y) {
  if (y <= STAGE2_PIER_KNOTS[0][0]) {
    const [, xo, xi, cw] = STAGE2_PIER_KNOTS[0];
    return { xo, xi, cw, xc: 0.5 * (xo + xi), rCenter: 0.5 * (xo + xi) * SQRT2 };
  }
  const last = STAGE2_PIER_KNOTS[STAGE2_PIER_KNOTS.length - 1];
  if (y >= last[0]) {
    const [, xo, xi, cw] = last;
    return { xo, xi, cw, xc: 0.5 * (xo + xi), rCenter: 0.5 * (xo + xi) * SQRT2 };
  }
  for (let i = 0; i < STAGE2_PIER_KNOTS.length - 1; i++) {
    const a = STAGE2_PIER_KNOTS[i];
    const b = STAGE2_PIER_KNOTS[i + 1];
    if (y >= a[0] && y <= b[0]) {
      const t = (y - a[0]) / (b[0] - a[0]);
      const xo = lerp(a[1], b[1], t);
      const xi = lerp(a[2], b[2], t);
      const cw = lerp(a[3], b[3], t);
      return { xo, xi, cw, xc: 0.5 * (xo + xi), rCenter: 0.5 * (xo + xi) * SQRT2 };
    }
  }
  const [, xo, xi, cw] = last;
  return { xo, xi, cw, xc: 0.5 * (xo + xi), rCenter: 0.5 * (xo + xi) * SQRT2 };
}

function lerpPt3(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

// Fine 3-tier interlocking galvanized diamond wire-mesh safety cage (`grillage en losanges`, Photo 47!)
function addDiamondMeshParapet(mmb, pBot0, pBot1, pTop0, pTop1, uThick, nIntervals = 14) {
  const wireW = 0.019;
  const spanStep = 3;
  for (let k = -2; k < nIntervals; k++) {
    const uA = clamp(k / nIntervals, 0, 1);
    const uB = clamp((k + spanStep) / nIntervals, 0, 1);
    if (uB - uA < 1e-3) continue;
    const tBotA = k < 0 ? (-k) / spanStep : 0.0;
    const tTopB = k + spanStep > nIntervals ? 1.0 - (k + spanStep - nIntervals) / spanStep : 1.0;
    const a0 = lerpPt3(lerpPt3(pBot0, pBot1, uA), lerpPt3(pTop0, pTop1, uA), tBotA);
    const a1 = lerpPt3(lerpPt3(pBot0, pBot1, uB), lerpPt3(pTop0, pTop1, uB), tTopB);
    mmb.addStrut('craneSteel', a0, a1, wireW, wireW, uThick);

    const tTopA = k < 0 ? 1.0 - (-k) / spanStep : 1.0;
    const tBotB = k + spanStep > nIntervals ? (k + spanStep - nIntervals) / spanStep : 0.0;
    const b0 = lerpPt3(lerpPt3(pBot0, pBot1, uA), lerpPt3(pTop0, pTop1, uA), tTopA);
    const b1 = lerpPt3(lerpPt3(pBot0, pBot1, uB), lerpPt3(pTop0, pTop1, uB), tBotB);
    mmb.addStrut('craneSteel', b0, b1, wireW, wireW, uThick);
  }
}

function buildStraightPierStairRun(mmb, pier, yStart, yEnd, sCenter, numFlights = 10) {
  const stairW = 0.92;
  const uPerp = [pier.sz * INV_SQRT2, 0, -pier.sx * INV_SQRT2];
  const uRad = [pier.sx * INV_SQRT2, 0, pier.sz * INV_SQRT2];
  const uUp = [0, 1, 0];

  const dyFlight = (yEnd - yStart) / numFlights;
  for (let f = 0; f < numFlights; f++) {
    const isTopDeckHead = f === numFlights - 1 && Math.abs(yEnd - 57.63) < 0.25;
    const y0 = yStart + f * dyFlight;
    const y1 = isTopDeckHead ? yEnd : y0 + dyFlight * 0.88; // Top flight climbs flush to +57.63m deck!
    const yNext = y0 + dyFlight;
    const r0 = trackRadiusAtY(y0);
    const r1 = trackRadiusAtY(y1);
    const rNext = trackRadiusAtY(yNext);

    // Riveted 250x8mm iron plate stringers (`limons`) + `Photo 47` diamond wire-mesh safety cages
    for (const side of [-1, 1]) {
      const s = sCenter + side * (stairW * 0.5);
      const p0 = pierWorldPos(pier, y0, r0, s);
      const p1 = pierWorldPos(pier, y1, r1, s);
      mmb.addStrut('ironPrimary', p0, p1, 0.06, 0.25, uPerp);

      // Top handrail (`main-courante`), mid-rail, and elevated stair-head safety wire (`+1.36m` in Photo 47)
      const h0 = pierWorldPos(pier, y0 + 1.02, r0, s);
      const h1 = pierWorldPos(pier, y1 + 1.02, r1, s);
      const m0 = pierWorldPos(pier, y0 + 0.52, r0, s);
      const m1 = pierWorldPos(pier, y1 + 0.52, r1, s);
      mmb.addStrut('woodPavilion', h0, h1, 0.065, 0.055, uPerp);
      mmb.addStrut('ironLattice', m0, m1, 0.036, 0.036, uPerp);

      const nBays = 6;
      for (let b = 0; b <= nBays; b++) {
        const tb = b / nBays;
        const yb = lerp(y0, y1, tb);
        const rb = lerp(r0, r1, tb);
        const postTopY = isTopDeckHead && b < nBays ? yb + 1.36 : yb + 1.06;
        mmb.addStrut('ironPrimary', pierWorldPos(pier, yb, rb, s), pierWorldPos(pier, postTopY, rb, s), 0.044, 0.044, uPerp);
      }

      addDiamondMeshParapet(
        mmb,
        pierWorldPos(pier, y0 + 0.06, r0, s),
        pierWorldPos(pier, y1 + 0.06, r1, s),
        isTopDeckHead ? pierWorldPos(pier, y0 + 1.34, r0, s) : pierWorldPos(pier, y0 + 0.98, r0, s),
        isTopDeckHead ? pierWorldPos(pier, y1 + 1.06, r1, s) : pierWorldPos(pier, y1 + 0.98, r1, s),
        uPerp,
        isTopDeckHead ? 20 : 14
      );
      if (f === 0) {
        // Scrolled wrought-iron starter newel volute (`volute de départ`, Photos 05 & 47)
        for (let v = 0; v < 4; v++) {
          const a0 = (v / 4) * Math.PI * 1.35;
          const a1 = ((v + 1) / 4) * Math.PI * 1.35;
          const rad0 = 0.16 - 0.025 * v;
          const rad1 = 0.16 - 0.025 * (v + 1);
          mmb.addStrut(
            'ironCast',
            pierWorldPos(pier, y0 + 0.90 + Math.sin(a0) * rad0, r0 + 0.14 + Math.cos(a0) * rad0, s),
            pierWorldPos(pier, y0 + 0.90 + Math.sin(a1) * rad1, r0 + 0.14 + Math.cos(a1) * rad1, s),
            0.032,
            0.038,
            uPerp
          );
        }
      }
      if (!isTopDeckHead) {
        // Wrap-around intermediate landing handrail, mid-rail, diamond-mesh safety cage & knee volute (`y1 -> yNext`)
        mmb.addStrut('woodPavilion', h1, pierWorldPos(pier, yNext + 1.02, rNext, s), 0.062, 0.052, uPerp);
        mmb.addStrut('ironLattice', m1, pierWorldPos(pier, yNext + 0.52, rNext, s), 0.034, 0.034, uPerp);
        mmb.addStrut('ironPrimary', pierWorldPos(pier, y1, rNext, s), pierWorldPos(pier, yNext + 1.06, rNext, s), 0.044, 0.044, uPerp);
        addDiamondMeshParapet(
          mmb,
          pierWorldPos(pier, y1 + 0.06, r1, s),
          pierWorldPos(pier, yNext + 0.06, rNext, s),
          pierWorldPos(pier, y1 + 0.98, r1, s),
          pierWorldPos(pier, yNext + 0.98, rNext, s),
          uPerp,
          6
        );
        mmb.addCylinder('ironCast', pierWorldPos(pier, y1 + 1.04, r1 + 0.05, s - 0.03), pierWorldPos(pier, y1 + 1.04, r1 + 0.05, s + 0.03), 0.065, 0.065, 8);
      }
      if (isTopDeckHead) {
        mmb.addStrut('ironPrimary', pierWorldPos(pier, y0 + 1.36, r0, s), pierWorldPos(pier, y1 + 1.12, r1, s), 0.034, 0.034, uPerp);
        // Horizontal stair-head safety wing on +57.63m deck (`r1 - 1.15 .. r1`) with fine diamond mesh
        const rHeadIn = r1 - 1.15;
        const wBot0 = pierWorldPos(pier, y1 + 0.05, rHeadIn, s);
        const wBot1 = pierWorldPos(pier, y1 + 0.05, r1, s);
        const wTop0 = pierWorldPos(pier, y1 + 1.06, rHeadIn, s);
        const wTop1 = pierWorldPos(pier, y1 + 1.06, r1, s);
        mmb.addStrut('woodPavilion', wTop0, wTop1, 0.06, 0.05, uPerp);
        mmb.addStrut('ironPrimary', pierWorldPos(pier, y1, rHeadIn, s), wTop0, 0.045, 0.045, uPerp);
        addDiamondMeshParapet(mmb, wBot0, wBot1, wTop0, wTop1, uPerp, 7);
      }
    }

    // Horizontal iron/wood stepped treads (`marches`) every ~0.24m rise
    const nSteps = Math.max(8, Math.round((y1 - y0) / 0.24));
    for (let st = 1; st < nSteps; st++) {
      const ts = st / nSteps;
      const ys = lerp(y0, y1, ts);
      const rs = lerp(r0, r1, ts);
      const treadCenter = pierWorldPos(pier, ys, rs, sCenter);
      mmb.addOrientedBox('ironCast', treadCenter, [stairW - 0.06, 0.04, 0.27], uPerp, uUp, uRad);
    }

    // Horizontal intermediate rest landing (`palier de repos`) + bracket tie back to track girder
    if (!isTopDeckHead) {
      const rLandMid = (r1 + rNext) * 0.5;
      const landLen = Math.max(1.1, Math.abs(r1 - rNext) + 0.45);
      const landCenter = pierWorldPos(pier, y1, rLandMid, sCenter);
      mmb.addOrientedBox('woodPavilion', landCenter, [stairW + 0.14, 0.10, landLen], uPerp, uUp, uRad);
      mmb.addOrientedBox('ironPrimary', [landCenter[0], y1 - 0.12, landCenter[2]], [stairW + 0.2, 0.14, landLen + 0.08], uPerp, uUp, uRad);
    }

    const tieTrack = pierWorldPos(pier, y1 - 0.12, r1, Math.sign(sCenter) * 1.2275);
    const tieOuter = pierWorldPos(pier, y1 - 0.12, r1, sCenter + Math.sign(sCenter) * (stairW * 0.55));
    mmb.addStrut('ironPrimary', tieTrack, tieOuter, 0.14, 0.16, uUp);
  }
}

function buildSwitchbackPierStairsStage2(mmb, pier, yStart = 68.63, yEnd = 115.73) {
  // Pl. 70 Figs. 1 & 4: 20 switchback straight flights ascending from Panneau 6 top (+68.63m)
  // to 2nd Floor (+115.73m) along Zone 3's exact piecewise pier center `0.5 * (xo + xi)` in Piles 2 & 4.
  const nFlights = 20;
  const dy = (yEnd - yStart) / nFlights;
  const uPerp = [pier.sz * INV_SQRT2, 0, -pier.sx * INV_SQRT2];
  const uRad = [pier.sx * INV_SQRT2, 0, pier.sz * INV_SQRT2];
  const uUp = [0, 1, 0];

  for (let i = 0; i < nFlights; i++) {
    const y0 = yStart + i * dy;
    const y1 = y0 + dy;
    const rMid0 = stage2PierBoundsAtY(y0).rCenter;
    const rMid1 = stage2PierBoundsAtY(y1).rCenter;
    const dir = i % 2 === 0 ? 1 : -1;
    const sLane = dir * 0.62;
    const rA = rMid0 - dir * 1.25;
    const rB = rMid1 + dir * 1.25;

    for (const side of [-0.42, 0.42]) {
      const p0 = pierWorldPos(pier, y0, rA, sLane + side);
      const p1 = pierWorldPos(pier, y1, rB, sLane + side);
      mmb.addStrut('ironPrimary', p0, p1, 0.055, 0.22, uPerp);
      const h0 = pierWorldPos(pier, y0 + 0.98, rA, sLane + side);
      const h1 = pierWorldPos(pier, y1 + 0.98, rB, sLane + side);
      mmb.addStrut('woodPavilion', h0, h1, 0.05, 0.045, uPerp);
      mmb.addStrut('ironLattice', pierWorldPos(pier, y0 + 0.50, rA, sLane + side), pierWorldPos(pier, y1 + 0.50, rB, sLane + side), 0.032, 0.032, uPerp);
      for (const tPost of [0, 0.5, 1]) {
        const yp = lerp(y0, y1, tPost);
        const rp = lerp(rA, rB, tPost);
        mmb.addStrut('ironLattice', pierWorldPos(pier, yp, rp, sLane + side), pierWorldPos(pier, yp + 0.98, rp, sLane + side), 0.038, 0.038, uPerp);
      }
      addDiamondMeshParapet(
        mmb,
        pierWorldPos(pier, y0 + 0.06, rA, sLane + side),
        pierWorldPos(pier, y1 + 0.06, rB, sLane + side),
        h0,
        h1,
        uPerp,
        6
      );
    }

    const nSt = 10;
    for (let k = 1; k < nSt; k++) {
      const tk = k / nSt;
      const tc = pierWorldPos(pier, lerp(y0, y1, tk), lerp(rA, rB, tk), sLane);
      mmb.addOrientedBox('ironCast', tc, [0.80, 0.035, 0.25], uPerp, uUp, uRad);
    }

    // Half-turn newel landing platform (`Pl. 70 Fig. 4`)
    const landPos = pierWorldPos(pier, y1, rB + dir * 0.45, 0);
    mmb.addCylinder(
      'ironPrimary',
      [landPos[0], y1 - 0.10, landPos[2]],
      [landPos[0], y1 + 0.02, landPos[2]],
      1.08,
      1.08,
      12
    );
    if (i % 2 === 0) {
      const yTopCol = Math.min(yEnd, y0 + 2 * dy);
      const colA = pierWorldPos(pier, y0, rMid0 - 1.35, 0);
      const colB = pierWorldPos(pier, yTopCol, stage2PierBoundsAtY(yTopCol).rCenter - 1.35, 0);
      mmb.addStrut('ironPrimary', colA, colB, 0.14, 0.14, uPerp);
    }
  }
}

function buildHelicalStaircase(mmb, centerFn, yStart, yEnd, diameterM = 1.68, turnsPer10M = 3.1) {
  const radius = diameterM * 0.5;
  const totalH = yEnd - yStart;
  // Central hollow cast-iron newel column (`noyau central`)
  const nColSegs = Math.max(4, Math.ceil(totalH / 8.0));
  for (let i = 0; i < nColSegs; i++) {
    const ya = lerp(yStart, yEnd, i / nColSegs);
    const yb = lerp(yStart, yEnd, (i + 1) / nColSegs);
    mmb.addCylinder('ironPrimary', centerFn(ya), centerFn(yb), 0.11, 0.11, 8);
  }

  // Helical treads, outer stringer ribbon, handrail & balusters
  const stepRise = 0.26;
  const nSteps = Math.max(12, Math.floor(totalH / stepRise));
  const totalAngle = (totalH / 10.0) * turnsPer10M * Math.PI * 2.0;

  let prevOuter = null;
  let prevRail = null;
  for (let i = 0; i <= nSteps; i++) {
    const t = i / nSteps;
    const y = lerp(yStart, yEnd, t);
    const ang = t * totalAngle;
    const c = centerFn(y);
    const ox = c[0] + Math.cos(ang) * radius;
    const oz = c[2] + Math.sin(ang) * radius;
    const outerPt = [ox, y, oz];
    const railPt = [ox, y + 0.98, oz];

    if (i < nSteps) {
      mmb.addStrut('ironCast', [c[0], y, c[2]], outerPt, 0.22, 0.035, [0, 1, 0]);
    }
    if (prevOuter) {
      mmb.addStrut('ironPrimary', prevOuter, outerPt, 0.04, 0.16, [0, 1, 0]);
      mmb.addStrut('ironLattice', prevRail, railPt, 0.038, 0.038, [0, 1, 0]);
    }
    if (i % 2 === 0) {
      mmb.addStrut('ironLattice', outerPt, railPt, 0.03, 0.03, [1, 0, 0]);
    }
    prevOuter = outerPt;
    prevRail = railPt;
  }
}

// Pl. 20 Fig. 1 (`Panneau 6`, +57.63m -> +68.63m): 4-flight criss-crossing switchback service stair
// (`"Escalier de service du 1er au 2e étage"`) with horizontal rest-landing girders at Y = 60.38, 63.13, 65.88m
// in ALL 4 piers (`Piles 1..4`), offset on the inner-Z side cleanly clear of Otis/Combaluzier tracks!
function buildPanneau6SwitchbackStairs(mmb, pier) {
  const yLevels = [57.63, 60.38, 63.13, 65.88, 68.58];
  const uUp = [0, 1, 0];
  const uZ = [0, 0, 1];
  const uX = [1, 0, 0];

  const xInAt = (y) => stage2PierBoundsAtY(y).xc + 0.65;
  const xOutAt = (y) => stage2PierBoundsAtY(y).xo - 0.95;
  const zBaseAt = (y) => pier.sz * (stage2PierBoundsAtY(y).xi + 1.75);

  // Horizontal rest-landing girders (`60.38m, 63.13m, 65.88m`) & vertical support standards
  for (const yL of [60.38, 63.13, 65.88]) {
    const xA = pier.sx * (xInAt(yL) - 0.55);
    const xB = pier.sx * (xOutAt(yL) + 0.50);
    const zC = zBaseAt(yL);
    for (const dz of [-0.52, 0.52]) {
      mmb.addStrut('ironPrimary', [xA, yL - 0.08, zC + dz], [xB, yL - 0.08, zC + dz], 0.12, 0.20, uZ);
    }
    mmb.addBox('woodPavilion', [0.5 * (xA + xB), yL + 0.04, zC], [Math.abs(xB - xA), 0.08, 1.12]);
    // End turn safety parapets with diamond mesh
    for (const xEnd of [xA, xB]) {
      mmb.addStrut('ironLattice', [xEnd, yL, zC - 0.54], [xEnd, yL + 1.00, zC - 0.54], 0.045, 0.045, uX);
      mmb.addStrut('ironLattice', [xEnd, yL, zC + 0.54], [xEnd, yL + 1.00, zC + 0.54], 0.045, 0.045, uX);
      mmb.addStrut('woodPavilion', [xEnd, yL + 1.00, zC - 0.56], [xEnd, yL + 1.00, zC + 0.56], 0.05, 0.045, uX);
    }
  }
  // Vertical hanger standards at inner & outer switchback columns (`57.63m -> 68.63m`)
  for (const sideFn of [xInAt, xOutAt]) {
    for (const dz of [-0.54, 0.54]) {
      mmb.addStrut(
        'ironPrimary',
        [pier.sx * sideFn(57.63), 57.63, zBaseAt(57.63) + dz],
        [pier.sx * sideFn(68.63), 68.63, zBaseAt(68.63) + dz],
        0.11,
        0.13,
        uZ
      );
    }
  }

  // 4 criss-crossing diagonal flights (`57.63->60.38`, `60.38->63.13`, `63.13->65.88`, `65.88->68.58`)
  // Exact Pl. 20 Fig. 1 parity: `xOut(57.63) -> xIn(60.38) -> xOut(63.13) -> xIn(65.88) -> xOut(68.58)`
  for (let f = 0; f < 4; f++) {
    const y0 = yLevels[f];
    const y1 = yLevels[f + 1];
    const inward = f % 2 === 0;
    const x0 = pier.sx * (inward ? xOutAt(y0) : xInAt(y0));
    const x1 = pier.sx * (inward ? xInAt(y1) : xOutAt(y1));
    const zOff = (inward ? -0.26 : 0.26) * pier.sz;
    const z0 = zBaseAt(y0) + zOff;
    const z1 = zBaseAt(y1) + zOff;

    for (const sSide of [-0.38, 0.38]) {
      const p0 = [x0, y0, z0 + sSide];
      const p1 = [x1, y1, z1 + sSide];
      const h0 = [x0, y0 + 0.98, z0 + sSide];
      const h1 = [x1, y1 + 0.98, z1 + sSide];
      mmb.addStrut('ironPrimary', p0, p1, 0.055, 0.22, uZ);
      mmb.addStrut('woodPavilion', h0, h1, 0.05, 0.045, uZ);
      mmb.addStrut('ironLattice', [x0, y0 + 0.50, z0 + sSide], [x1, y1 + 0.50, z1 + sSide], 0.032, 0.032, uZ);
      for (const tP of [0, 0.33, 0.67, 1]) {
        const xp = lerp(x0, x1, tP);
        const yp = lerp(y0, y1, tP);
        const zp = lerp(z0, z1, tP) + sSide;
        mmb.addStrut('ironLattice', [xp, yp, zp], [xp, yp + 0.98, zp], 0.038, 0.038, uZ);
      }
      addDiamondMeshParapet(mmb, [x0, y0 + 0.06, z0 + sSide], [x1, y1 + 0.06, z1 + sSide], h0, h1, uZ, 8);
    }
    const nSteps = 11;
    for (let st = 1; st < nSteps; st++) {
      const ts = st / nSteps;
      mmb.addOrientedBox('ironCast', [lerp(x0, x1, ts), lerp(y0, y1, ts), lerp(z0, z1, ts)], [0.72, 0.035, 0.25], uZ, uUp, uX);
    }
  }
}

// Pl. 08 Figs. 3–4 (`Piles 1 & 3`, +58.30m -> +115.73m): Authentic outer-chord caged helical service staircase
// (`r = 0.85m` = 1.70m diameter, plumb-vertical per structural panel `P6..P11` right inside `(sx*(xo - 1.12), y, sz*(xo - 1.12))`)
function buildOuterChordHelicalStairsStage2(mmb, pier) {
  const panelSpans = [
    [58.3000, 68.6300],
    [68.6300, 77.6770],
    [77.6770, 89.2038],
    [89.2038, 100.0635],
    [100.0635, 110.6292],
    [110.6292, 115.7300],
  ];
  const rCage = 0.85;
  let prevC = stage2PierBoundsAtY(68.6300).xo - 1.12;

  for (const [yA, yB] of panelSpans) {
    const cPanel = stage2PierBoundsAtY(yB).xo - 1.12;
    const cx = pier.sx * cPanel;
    const cz = pier.sz * cPanel;
    buildHelicalStaircase(mmb, (y) => [cx, y, cz], yA, yB, rCage * 2.0, 3.25);

    // 6 vertical safety-cage stanchion bars & mid-panel hoop around the r = 0.85m spiral cage
    for (let k = 0; k < 6; k++) {
      const ang = (k / 6) * Math.PI * 2.0 + Math.PI * 0.25;
      const vx = cx + Math.cos(ang) * rCage;
      const vz = cz + Math.sin(ang) * rCage;
      mmb.addStrut('ironLattice', [vx, yA, vz], [vx, yB, vz], 0.036, 0.036, [1, 0, 0]);
    }
    const yMid = 0.5 * (yA + yB);
    mmb.addCylinder('ironPrimary', [cx, yA - 0.08, cz], [cx, yA + 0.04, cz], rCage + 0.08, rCage + 0.08, 12);
    mmb.addCylinder('ironLattice', [cx, yMid - 0.03, cz], [cx, yMid + 0.03, cz], rCage + 0.03, rCage + 0.03, 12);

    // Horizontal panel-girder transfer landing stepping inward from `prevC` to `cPanel`
    const xPrev = pier.sx * prevC;
    const zPrev = pier.sz * prevC;
    const uPerp = [pier.sz * INV_SQRT2, 0, -pier.sx * INV_SQRT2];
    for (const sSide of [-0.52, 0.52]) {
      const pStart = [xPrev + uPerp[0] * sSide, yA, zPrev + uPerp[2] * sSide];
      const pEnd = [cx + uPerp[0] * sSide, yA, cz + uPerp[2] * sSide];
      mmb.addStrut('ironPrimary', pStart, pEnd, 0.10, 0.16, uPerp);
      mmb.addStrut('ironLattice', [pStart[0], yA + 0.98, pStart[2]], [pEnd[0], yA + 0.98, pEnd[2]], 0.036, 0.036, uPerp);
    }
    prevC = cPanel;
  }
}

function createDescenteSignMaterial(THREE, labelText = 'DESCENTE', darkBlue = false) {
  if (typeof document === 'undefined') {
    return new THREE.MeshStandardMaterial({
      name: darkBlue ? `enamel_${labelText}` : 'descenteEnamelSign',
      color: darkBlue ? 0x2e3338 : 0xeae4d7,
      roughness: 0.32,
      metalness: 0.08,
    });
  }
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (ctx) {
    ctx.fillStyle = darkBlue ? '#2e3338' : '#eae4d7';
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = darkBlue ? '#eae4d7' : '#1e1c19';
    ctx.lineWidth = 14;
    ctx.strokeRect(10, 10, 492, 236);
    ctx.lineWidth = 4;
    ctx.strokeRect(24, 24, 464, 208);
    for (const [rx, ry] of [[38, 38], [474, 38], [38, 218], [474, 218]]) {
      ctx.beginPath();
      ctx.arc(rx, ry, 6, 0, Math.PI * 2);
      ctx.fillStyle = darkBlue ? '#8c7a62' : '#2b2927';
      ctx.fill();
    }
    ctx.save();
    ctx.translate(256, 134);
    ctx.scale(0.72, 1.18);
    ctx.fillStyle = darkBlue ? '#eae4d7' : '#1e1c19';
    ctx.font = 'bold 110px "Arial Narrow", Impact, Georgia, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, 0, 0);
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(canvas);
  if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return new THREE.MeshStandardMaterial({
    name: darkBlue ? `enamel_${labelText}` : 'descenteEnamelSign',
    color: 0xffffff,
    map: tex,
    roughness: 0.32,
    metalness: 0.08,
  });
}

// Photo 47 (Chevojon 1889): 1st-floor pier `DESCENTE` enamel signposts, intermediate landing plaques & wooden `guichets`
function buildFloor1DescenteKiosksAndSigns(THREE, mmb, stairsGroup) {
  const signMat = createDescenteSignMaterial(THREE, 'DESCENTE', false);
  const plaqueDescenteMat = createDescenteSignMaterial(THREE, 'DESCENTE', true);
  const plaqueMonteeMat = createDescenteSignMaterial(THREE, 'MONTÉE', true);
  const signPlaneGeom = new THREE.PlaneGeometry(0.76, 0.38);
  const landPlaqueGeom = new THREE.PlaneGeometry(0.46, 0.22);
  const uUp = [0, 1, 0];

  for (const pier of PIERS) {
    const uPerp = [pier.sz * INV_SQRT2, 0, -pier.sx * INV_SQRT2];
    const uRad = [pier.sx * INV_SQRT2, 0, pier.sz * INV_SQRT2];
    const lanes = pier.id === 'pile_2' || pier.id === 'pile_4' ? [-3.25, 3.25] : [-3.25];

    // 1. Vertical iron signpost + framed white-enamel `DESCENTE` sign plate at each 1st-floor stair head
    for (const sCenter of lanes) {
      const outSign = Math.sign(sCenter);
      const sPost = sCenter + outSign * 0.44;
      const rPost = trackRadiusAtY(57.63) - 0.45;
      const pFoot = pierWorldPos(pier, 57.63, rPost, sPost);
      const pTop = pierWorldPos(pier, 58.71, rPost, sPost);
      mmb.addStrut('ironPrimary', pFoot, pTop, 0.065, 0.065, uPerp);
      mmb.addBox('ironCast', [pTop[0], pTop[1], pTop[2]], [0.11, 0.05, 0.11]);

      const signCenter = [pFoot[0], 58.92, pFoot[2]];
      // Orient sign face toward promenade approach (`outSign * uPerp` tilted 28° inward along `-uRad`)
      const nVec = new THREE.Vector3(
        outSign * uPerp[0] * 0.88 - uRad[0] * 0.47,
        0,
        outSign * uPerp[2] * 0.88 - uRad[2] * 0.47
      ).normalize();
      const upVec = new THREE.Vector3(0, 1, 0);
      const rightVec = new THREE.Vector3().crossVectors(upVec, nVec).normalize();
      const rotMat = new THREE.Matrix4().makeBasis(rightVec, upVec, nVec);
      const qFront = new THREE.Quaternion().setFromRotationMatrix(rotMat);

      // Wrought-iron backing frame
      mmb.addOrientedBox(
        'ironPrimary',
        signCenter,
        [0.82, 0.43, 0.042],
        [rightVec.x, 0, rightVec.z],
        uUp,
        [nVec.x, 0, nVec.z]
      );

      for (const faceSign of [1, -1]) {
        const mesh = new THREE.Mesh(signPlaneGeom, signMat);
        mesh.position.set(
          signCenter[0] + nVec.x * (faceSign * 0.024),
          signCenter[1],
          signCenter[2] + nVec.z * (faceSign * 0.024)
        );
        if (faceSign > 0) {
          mesh.quaternion.copy(qFront);
        } else {
          mesh.quaternion.copy(qFront).multiply(new THREE.Quaternion().setFromAxisAngle(upVec, Math.PI));
        }
        stairsGroup.add(mesh);
      }

      // Dark-blue/cream enameled `MONTÉE / DESCENTE` plaques on intermediate rest landings (`f = 0..7`)
      const dyFl = (57.63 - 1.58) / 9;
      const pMat = sCenter > 0 ? plaqueMonteeMat : plaqueDescenteMat;
      const nLand = new THREE.Vector3(outSign * uPerp[0], 0, outSign * uPerp[2]).normalize();
      const rLandVec = new THREE.Vector3().crossVectors(upVec, nLand).normalize();
      const qLand = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(rLandVec, upVec, nLand));
      for (let f = 0; f < 8; f++) {
        const yL = 1.58 + f * dyFl + dyFl * 0.88 + 0.62;
        const rL = (trackRadiusAtY(1.58 + f * dyFl + dyFl * 0.88) + trackRadiusAtY(1.58 + (f + 1) * dyFl)) * 0.5;
        const pPlq = pierWorldPos(pier, yL, rL, sCenter + outSign * 0.48);
        mmb.addOrientedBox('ironCast', pPlq, [0.50, 0.25, 0.026], uRad, uUp, uPerp);
        for (const fs of [1, -1]) {
          const pm = new THREE.Mesh(landPlaqueGeom, pMat);
          pm.position.set(pPlq[0] + nLand.x * (fs * 0.016), pPlq[1], pPlq[2] + nLand.z * (fs * 0.016));
          pm.quaternion.copy(qLand);
          if (fs < 0) pm.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(upVec, Math.PI));
          stairsGroup.add(pm);
        }
      }
    }

    // 2. Compact tongue-and-groove wooden booth + sloped twin-windowed elevator landing `guichet` / shelter cabin
    //    & diamond wire-mesh landing balustrade (`Photo 47`, strictly Y <= 59.92m <= 60.0m inside inner pier deck!)
    if (pier.system === 'combaluzier') {
      for (const kSide of [-1, 1]) {
        const sKiosk = kSide * 2.08;
        const rKiosk = 37.35;
        const wS = 1.32;
        const lenR = 2.40;
        const hK = 2.18; // Top cornice at 57.63 + 2.27 = 59.90m (<= 60.0m!)
        const cBody = pierWorldPos(pier, 57.63 + hK * 0.5, rKiosk, sKiosk);
        mmb.addOrientedBox('woodPavilion', cBody, [wS, hK, lenR], uPerp, uUp, uRad);
        const cBase = pierWorldPos(pier, 57.71, rKiosk, sKiosk);
        const cRoof = pierWorldPos(pier, 57.63 + hK + 0.05, rKiosk, sKiosk);
        mmb.addOrientedBox('ironPrimary', cBase, [wS + 0.08, 0.16, lenR + 0.08], uPerp, uUp, uRad);
        mmb.addOrientedBox('woodPavilion', cRoof, [wS + 0.18, 0.08, lenR + 0.18], uPerp, uUp, uRad);
        mmb.addOrientedBox('ironPrimary', [cRoof[0], cRoof[1] + 0.05, cRoof[2]], [wS + 0.22, 0.04, lenR + 0.22], uPerp, uUp, uRad);

        // Fine vertical tongue-and-groove plank battens (`lambris rainurés`, Photo 47!)
        for (let b = -6; b <= 6; b++) {
          const rB = rKiosk + (b / 6) * (lenR * 0.47);
          for (const fOut of [-1, 1]) {
            const pBot = pierWorldPos(pier, 57.78, rB, sKiosk + fOut * (wS * 0.505));
            const pTop = pierWorldPos(pier, 59.78, rB, sKiosk + fOut * (wS * 0.505));
            mmb.addStrut('ironPrimary', pBot, pTop, 0.015, 0.015, uPerp);
          }
        }
        for (let b = -4; b <= 4; b++) {
          const sB = sKiosk + (b / 4) * (wS * 0.45);
          for (const rEnd of [-1, 1]) {
            const pBot = pierWorldPos(pier, 57.78, rKiosk + rEnd * (lenR * 0.505), sB);
            const pTop = pierWorldPos(pier, 59.78, rKiosk + rEnd * (lenR * 0.505), sB);
            mmb.addStrut('ironPrimary', pBot, pTop, 0.015, 0.015, uPerp);
          }
        }
        const winPos = pierWorldPos(pier, 58.92, rKiosk - 0.45, sKiosk + kSide * (wS * 0.51));
        mmb.addOrientedBox('glass1889', winPos, [0.03, 0.72, 0.78], uPerp, uUp, uRad);
        mmb.addOrientedBox('ironPrimary', [winPos[0], winPos[1] - 0.39, winPos[2]], [0.10, 0.05, 0.88], uPerp, uUp, uRad);

        // Sloped twin-windowed elevator landing `guichet` / shelter cabin beside the DESCENTE stair landing (Photo 47!)
        // (`r = 33.78..35.85m`, `s = kSide * 2.02m`, `Y = 57.63..59.22m <= 60.0m`, 22° battered cream hood with 2 framed windows!)
        const sCab = kSide * 2.02;
        const rCabBack = 35.85;
        const rCabFrontBot = 33.78;
        const rCabFrontTop = 34.42; // 22° sloped front face matching Photo 47!
        const cabW = 1.52;
        const yCabTop = 59.16;
        // Rear rectangular cabin core & molded flat roof cornice (`Y = 59.24m <= 60.0m`)
        const cCabCore = pierWorldPos(pier, 0.5 * (57.63 + yCabTop), 0.5 * (rCabFrontTop + rCabBack), sCab);
        mmb.addOrientedBox('masonryAshlar', cCabCore, [cabW, yCabTop - 57.63, rCabBack - rCabFrontTop], uPerp, uUp, uRad);
        const cCabRoof = pierWorldPos(pier, yCabTop + 0.05, 0.5 * (rCabFrontTop - 0.14 + rCabBack), sCab);
        mmb.addOrientedBox('woodPavilion', cCabRoof, [cabW + 0.18, 0.09, rCabBack - rCabFrontTop + 0.28], uPerp, uUp, uRad);
        mmb.addOrientedBox('ironPrimary', [cCabRoof[0], yCabTop + 0.11, cCabRoof[2]], [cabW + 0.22, 0.04, rCabBack - rCabFrontTop + 0.32], uPerp, uUp, uRad);

        // Sloped cream-painted front apron & twin side-by-side recessed windows (`[ □ ] [ □ ]` across `cabW`)
        const slopeDr = rCabFrontTop - rCabFrontBot;
        const slopeDy = yCabTop - 57.68;
        const slopeLen = Math.hypot(slopeDr, slopeDy);
        const uSlopeUp = [(uRad[0] * slopeDr) / slopeLen, slopeDy / slopeLen, (uRad[2] * slopeDr) / slopeLen];
        const uSlopeNorm = [(-uRad[0] * slopeDy) / slopeLen, slopeDr / slopeLen, (-uRad[2] * slopeDy) / slopeLen];
        const cFrontSlope = pierWorldPos(pier, 0.5 * (57.68 + yCabTop), 0.5 * (rCabFrontBot + rCabFrontTop) + 0.14, sCab);
        mmb.addOrientedBox('masonryAshlar', cFrontSlope, [cabW, slopeLen, 0.30], uPerp, uSlopeUp, uSlopeNorm);
        // Lower wainscot rail, side corner pilasters & central mullion between the 2 windows
        for (const mFrac of [-0.48, 0.0, 0.48]) {
          const pM0 = pierWorldPos(pier, 57.68, rCabFrontBot, sCab + mFrac * cabW);
          const pM1 = pierWorldPos(pier, yCabTop, rCabFrontTop, sCab + mFrac * cabW);
          mmb.addStrut('ironPrimary', pM0, pM1, 0.075, 0.06, uPerp);
        }
        const pSillL = pierWorldPos(pier, lerp(57.68, yCabTop, 0.32), lerp(rCabFrontBot, rCabFrontTop, 0.32) - 0.01, sCab - 0.48 * cabW);
        const pSillR = pierWorldPos(pier, lerp(57.68, yCabTop, 0.32), lerp(rCabFrontBot, rCabFrontTop, 0.32) - 0.01, sCab + 0.48 * cabW);
        mmb.addStrut('ironPrimary', pSillL, pSillR, 0.055, 0.055, uSlopeNorm);
        for (const wSide of [-0.24, 0.24]) {
          const wR = lerp(rCabFrontBot, rCabFrontTop, 0.62) - 0.01;
          const wY = lerp(57.68, yCabTop, 0.62);
          const wCenter = pierWorldPos(pier, wY, wR, sCab + wSide * cabW);
          mmb.addOrientedBox('ironPrimary', wCenter, [0.52, 0.58, 0.05], uPerp, uSlopeUp, uSlopeNorm);
          mmb.addOrientedBox(
            'glass1889',
            [wCenter[0] + uSlopeNorm[0] * 0.018, wCenter[1] + uSlopeNorm[1] * 0.018, wCenter[2] + uSlopeNorm[2] * 0.018],
            [0.40, 0.46, 0.03],
            uPerp,
            uSlopeUp,
            uSlopeNorm
          );
        }

        // Photo 47 elevator-landing safety fence (`grillage en losanges`, Y = 57.66..58.68m) flanking guichet without blocking windows!
        const sFenceOut = kSide * 2.82;
        const sCabOuterEdge = sCab + kSide * (cabW * 0.50);
        const sCabInnerEdge = sCab - kSide * (cabW * 0.50);
        const sFenceIn = kSide * 0.85;
        const rFenceFront = 33.85;
        const rFenceBack = 37.35;
        const fCorner = pierWorldPos(pier, 57.66, rFenceFront, sFenceOut);
        const fBack = pierWorldPos(pier, 57.66, rFenceBack, sFenceOut);
        const fCabOut = pierWorldPos(pier, 57.66, rFenceFront, sCabOuterEdge);
        const fCabIn = pierWorldPos(pier, 57.66, rFenceFront, sCabInnerEdge);
        const fGate = pierWorldPos(pier, 57.66, rFenceFront, sFenceIn);
        const fCornerTop = [fCorner[0], 58.66, fCorner[2]];
        const fBackTop = [fBack[0], 58.66, fBack[2]];
        const fCabOutTop = [fCabOut[0], 58.66, fCabOut[2]];
        const fCabInTop = [fCabIn[0], 58.66, fCabIn[2]];
        const fGateTop = [fGate[0], 58.66, fGate[2]];
        mmb.addStrut('ironPrimary', fCornerTop, fBackTop, 0.045, 0.045, uPerp);
        mmb.addStrut('ironPrimary', fCornerTop, fCabOutTop, 0.045, 0.045, uRad);
        mmb.addStrut('ironPrimary', fCabInTop, fGateTop, 0.045, 0.045, uRad);
        for (const pPost of [fCorner, pierWorldPos(pier, 57.66, 0.5 * (rFenceFront + rFenceBack), sFenceOut), fBack, fGate]) {
          mmb.addStrut('ironPrimary', pPost, [pPost[0], 58.68, pPost[2]], 0.048, 0.048, uPerp);
        }
        addDiamondMeshParapet(mmb, fCorner, fBack, fCornerTop, fBackTop, uPerp, 16);
        addDiamondMeshParapet(mmb, fCorner, fCabOut, fCornerTop, fCabOutTop, uRad, 4);
        addDiamondMeshParapet(mmb, fCabIn, fGate, fCabInTop, fGateTop, uRad, 4);
      }
    }
  }

  // 3. Fine diamond safety-mesh infill (`grillage en losanges`, Photo 47) inside all 4 piers' 1st-floor
  //    `Escalier` & `Ascenseur` deck handrail balustrades (`Y = 57.69..58.71m <= 60.0m`)
  for (let f = 0; f < 4; f++) {
    const fPt = (u, y, w) => {
      if (f === 0) return [u, y, w];
      if (f === 1) return [w, y, -u];
      if (f === 2) return [-u, y, -w];
      return [-w, y, u];
    };
    const uThZ = f % 2 === 0 ? [0, 0, 1] : [1, 0, 0];
    const uThDiag = [INV_SQRT2, 0, INV_SQRT2];
    for (const wRail of [29.82, 31.36]) {
      addDiamondMeshParapet(mmb, fPt(20.44, 57.69, wRail), fPt(24.48, 57.69, wRail), fPt(20.44, 58.70, wRail), fPt(24.48, 58.70, wRail), uThZ, 18);
    }
    addDiamondMeshParapet(mmb, fPt(16.78, 57.69, 19.93), fPt(20.92, 57.69, 24.07), fPt(16.78, 58.70, 19.93), fPt(20.92, 58.70, 24.07), uThDiag, 22);
    addDiamondMeshParapet(mmb, fPt(19.93, 57.69, 16.78), fPt(24.07, 57.69, 20.92), fPt(19.93, 58.70, 16.78), fPt(24.07, 58.70, 20.92), uThDiag, 22);
  }
}

// ============================================================================
// SUBSYSTEM 3: Permanent 1889 Hydraulic Elevators & Machinery
//   - Central Edoux Guide Frame (`Poteau A` & `Poteaux B`)
//   - Otis Hydraulic Machinery (`Piles 1 & 3`), Pile 3 Pump Room & Tanks Ré1/Ré2
//   - Roux-Combaluzier-Lepape Machinery (`Piles 2 & 4`)
//   - Edoux Twin 80.2m Cylinders `Cy`, Sheaves `Po`, Tanks `Ré3/Ré4` & Piping
//   - Kinematic Cabins (Otis, Combaluzier, Edoux `Ca1/Ca2`), Chariots & Rams
// ============================================================================
function buildEdouxGuideColumnSection(mmb, yStart, yEnd, stepM = 3.2) {
  // Central lattice guide column `Poteau A` at [0, Y, 0] + two outer guide columns `Poteaux B`
  // at rNS = +4.25m (Pile 3 side) and rNS = -4.25m (Pile 1 side), matching Pl. 70 Fig. 8 & Pl. 08!
  const nSegs = Math.max(2, Math.ceil((yEnd - yStart) / stepM));
  const uDiagNS = [-INV_SQRT2, 0, INV_SQRT2];
  const uDiagEW = [INV_SQRT2, 0, INV_SQRT2];

  for (let i = 0; i < nSegs; i++) {
    const y0 = lerp(yStart, yEnd, i / nSegs);
    const y1 = lerp(yStart, yEnd, (i + 1) / nSegs);

    // Central `Poteau A` (0.76m x 0.76m laced box column at [0, Y, 0])
    for (const [sr, ss] of [[-0.38, -0.38], [0.38, -0.38], [0.38, 0.38], [-0.38, 0.38]]) {
      const p0 = edouxWorldPos(y0, sr, ss);
      const p1 = edouxWorldPos(y1, sr, ss);
      mmb.addStrut('ironPrimary', p0, p1, 0.11, 0.11, uDiagEW);
    }
    // Lacing on `Poteau A`
    for (const side of [-0.38, 0.38]) {
      mmb.addStrut('ironLattice', edouxWorldPos(y0, -0.38, side), edouxWorldPos(y1, 0.38, side), 0.045, 0.045, uDiagEW);
      mmb.addStrut('ironLattice', edouxWorldPos(y0, 0.38, side), edouxWorldPos(y1, -0.38, side), 0.045, 0.045, uDiagEW);
    }

    // Two outer guide columns `Poteaux B` at rNS = +4.20m and rNS = -4.20m
    for (const rSign of [-1, 1]) {
      const rCol = rSign * 4.20;
      for (const ss of [-0.42, 0.42]) {
        mmb.addStrut('ironPrimary', edouxWorldPos(y0, rCol, ss), edouxWorldPos(y1, rCol, ss), 0.12, 0.12, uDiagNS);
      }
      mmb.addStrut('ironLattice', edouxWorldPos(y0, rCol, -0.42), edouxWorldPos(y1, rCol, 0.42), 0.045, 0.045, uDiagNS);
      mmb.addStrut('ironLattice', edouxWorldPos(y0, rCol, 0.42), edouxWorldPos(y1, rCol, -0.42), 0.045, 0.045, uDiagNS);
      // Machined cabin guide rail T-bars facing cabin bays
      const rRail = rSign * 3.92;
      mmb.addStrut('craneSteel', edouxWorldPos(y0, rRail, 0), edouxWorldPos(y1, rRail, 0), 0.09, 0.09, uDiagNS);
      mmb.addStrut('craneSteel', edouxWorldPos(y0, rSign * 0.44, 0), edouxWorldPos(y1, rSign * 0.44, 0), 0.09, 0.09, uDiagNS);
    }

    // Horizontal diagonal bracing ties every ~9.5m (panel boundaries) retaining open cabin bay
    if (i % 3 === 0) {
      for (const ss of [-1.95, 1.95]) {
        mmb.addStrut('ironPrimary', edouxWorldPos(y0, -4.25, ss), edouxWorldPos(y0, 4.25, ss), 0.16, 0.22, [0, 1, 0]);
      }
    }
  }
}

function buildOtisStaticMachinery(mmb, pier) {
  const uPerp = [pier.sz * INV_SQRT2, 0, -pier.sx * INV_SQRT2];
  const uRad = [pier.sx * INV_SQRT2, 0, pier.sz * INV_SQRT2];
  const uUp = [0, 1, 0];

  // 1. Inclined Hydraulic Press Cylinder `Cyl` (0.965m bore, 10.83m stroke, `otisCylRadiusAtY(Y)`)
  //    Spanning from Y = -2.10m (bottom flange lip -2.44m, clearing -2.55m Pl. 53 sub-floor cut) to Y = +10.6m
  const yCylBot = -2.10;
  const yCylTop = 10.60;
  const pCylBot = pierWorldPos(pier, yCylBot, otisCylRadiusAtY(yCylBot), 0);
  const pCylTop = pierWorldPos(pier, yCylTop, otisCylRadiusAtY(yCylTop), 0);
  mmb.addFlangedCylinder('ironCast', pCylBot, pCylTop, 0.52, 2.2, 14);

  // Heavy cast-iron bedplate girders `Vo1` supporting `Cyl` & trolley rails up to Y = +30.4m (`Pou1`)
  // with upper anchorage strut tying into pier cross-frame at Y = +32.2m (Pl. 08 Fig. 4)
  const yTrolleyTop = 30.40;
  const yAnchorTop = 32.20;
  for (const side of [-0.92, 0.92]) {
    const g0 = pierWorldPos(pier, yCylBot, otisCylRadiusAtY(yCylBot), side);
    const g1 = pierWorldPos(pier, yTrolleyTop, otisCylRadiusAtY(yTrolleyTop), side);
    mmb.addStrut('ironPrimary', g0, g1, 0.18, 0.34, uPerp);
    const gAnc = pierWorldPos(pier, yAnchorTop, otisCylRadiusAtY(yAnchorTop), side * 0.85);
    mmb.addStrut('ironPrimary', g1, gAnc, 0.14, 0.22, uPerp);
    // Machined trolley rail on top of bedplate girder
    const tr0 = pierWorldPos(pier, yCylTop, otisCylRadiusAtY(yCylTop) + 0.15, side);
    const tr1 = pierWorldPos(pier, yTrolleyTop, otisCylRadiusAtY(yTrolleyTop) + 0.15, side);
    mmb.addStrut('craneSteel', tr0, tr1, 0.08, 0.08, uPerp);
  }
  // Horizontal seating brackets at structural Entretoise elevations (6.30m, 17.15m, 29.20m)
  for (const yH of [6.30, 17.15, 29.20]) {
    const rCylH = otisCylRadiusAtY(yH);
    for (const side of [-0.92, 0.92]) {
      const outB = pierWorldPos(pier, yH, rCylH, side);
      const inB = pierWorldPos(pier, yH, rCylH - 1.45, side);
      mmb.addStrut('ironPrimary', outB, inB, 0.12, 0.18, uUp);
    }
  }

  // Fixed upper 6-sheave purchase block `Pou1` (`Po2` on Pl. 08 Fig. 4) at Y = 29.65m (12:1 tackle!)
  const yPou1 = 29.65;
  const rPou1 = otisCylRadiusAtY(yPou1) + 0.05;
  const pPou1 = pierWorldPos(pier, yPou1, rPou1, 0);
  for (const sOff of [-0.55, -0.33, -0.11, 0.11, 0.33, 0.55]) {
    const sh = pierWorldPos(pier, yPou1, rPou1, sOff);
    mmb.addSpokedSheave('ironCast', sh, uPerp, 0.68, 0.09, 8);
  }
  mmb.addOrientedBox('ironCast', pPou1, [1.55, 0.48, 0.95], uPerp, uUp, uRad);

  // Hydraulic distributor valve cylinder `Cyl1` & 0.50m supply pipe `t6/t7` rising to 2nd Floor
  const distBot = pierWorldPos(pier, -2.20, 76.2, 1.85);
  const distTop = pierWorldPos(pier, 1.1, 76.2, 1.85);
  mmb.addFlangedCylinder('ironCast', distBot, distTop, 0.28, 1.2, 10);
  mmb.addCylinder('copperDome', [distTop[0], 1.1, distTop[2]], [distTop[0], 1.65, distTop[2]], 0.12, 0.12, 8);

  // Supply main `t5` climbing along track girder to 2nd-floor `Ré2` reservoir
  const nPipe = 12;
  for (let i = 0; i < nPipe; i++) {
    const ya = lerp(-2.20, 116.2, i / nPipe);
    const yb = lerp(-2.20, 116.2, (i + 1) / nPipe);
    const pa = pierWorldPos(pier, ya, trackRadiusAtY(Math.max(0, ya)) - 0.55, 1.48);
    const pb = pierWorldPos(pier, yb, trackRadiusAtY(Math.max(0, yb)) - 0.55, 1.48);
    mmb.addCylinder('ironCast', pa, pb, 0.14, 0.14, 8);
  }

  // Deep Caisson Hydraulic Anchorage & Sump Ties (`Pl. 63 Fig. 23`: Pile 1 caisson base at Y = -11.55m!)
  if (pier.id === 'pile_1') {
    for (const [rCaiss, sCaiss] of [[63.5, -2.2], [63.5, 2.2], [79.5, -2.2], [79.5, 2.2]]) {
      const topBolt = pierWorldPos(pier, -2.80, rCaiss, sCaiss);
      const botBolt = pierWorldPos(pier, -11.55, rCaiss, sCaiss);
      mmb.addCylinder('ironCast', botBolt, topBolt, 0.09, 0.09, 8);
      const platePos = pierWorldPos(pier, -11.49, rCaiss, sCaiss);
      mmb.addOrientedBox('ironCast', platePos, [0.95, 0.12, 0.95], uPerp, uUp, uRad);
    }
    // Deep drainage/suction standpipe to caisson sump (-11.55m)
    mmb.addFlangedCylinder(
      'ironCast',
      pierWorldPos(pier, -11.42, 72.0, 0),
      pierWorldPos(pier, -2.60, 72.0, 0),
      0.22,
      2.5,
      10
    );
  }

  // Pile 3 (Sud) Underground Steam-Hydraulic Pump Basement (`30.50 NGF` = -3.00m) & Open `Ré1` Grillage (-7.35m)
  // Pixel-registered to Eiffel Plate 53 Fig. 1 (`pl53_plan_pile3_pompes`, Y clip [-7.40, -2.55m]):
  //   - Open perimeter `Ré1` suction pit walls down to Y = -7.35m (NO solid bottom slab filling the open bay!)
  //   - 5 diagonal I-beam floor joists (`b`) + perpendicular header girder + twin Z-boundary girders at Y = -3.00m
  //   - Diagonal masonry/iron division wall (`rDiag = 70.85m`) + open octagonal `B` boiler flue curb
  if (pier.id === 'pile_3') {
    // Twin left Z-axis boundary girders & deep `Ré1` footing curb (`X = -45.15m & -45.65m`, `Z = 44.55..50.65m`)
    mmb.addStrut('ironPrimary', [-45.15, -3.00, 44.55], [-45.15, -3.00, 50.65], 0.18, 0.28, uUp);
    mmb.addStrut('ironPrimary', [-45.65, -3.00, 44.55], [-45.65, -3.00, 50.65], 0.18, 0.28, uUp);
    mmb.addStrut('ironCast', [-45.40, -7.25, 44.55], [-45.40, -7.25, 50.65], 0.42, 0.20, uUp);

    // Diagonal `Ré1` division wall (`rDiag = 70.75m`, `Y = -7.35..-2.80m`) & parallel outer curb (`rDiag = 72.45m`)
    mmb.addStrut(
      'ironCast',
      pierWorldPos(pier, -5.08, 70.75, -3.55),
      pierWorldPos(pier, -5.08, 70.75, 4.95),
      0.85,
      4.54,
      uUp
    );
    mmb.addStrut(
      'ironPrimary',
      pierWorldPos(pier, -3.00, 72.45, -3.45),
      pierWorldPos(pier, -3.00, 72.45, 4.55),
      0.18,
      0.28,
      uUp
    );
    for (const sTie of [-0.75, 1.95]) {
      mmb.addStrut(
        'ironPrimary',
        pierWorldPos(pier, -3.00, 70.75, sTie),
        pierWorldPos(pier, -3.00, 72.45, sTie),
        0.16,
        0.24,
        uUp
      );
    }

    // 5 parallel diagonal I-beam floor joists (`b` on Pl. 53 Fig. 1) spanning open `Ré1` pit at Y = -3.00m
    for (const rJ of [64.25, 65.45, 66.65, 67.85, 69.00]) {
      const s0 = Math.max(-3.65, 62.65 - rJ);
      const s1 = rJ - 63.85;
      if (s1 > s0 + 0.25) {
        mmb.addStrut(
          'ironPrimary',
          pierWorldPos(pier, -3.00, rJ, s0),
          pierWorldPos(pier, -3.00, rJ, s1),
          0.16,
          0.26,
          uUp
        );
      }
    }
    // South perimeter footing curb at `rDiag = 64.25m` (`Y = -7.35..-7.15m`) & `uRad` header girder (`sPerp = +1.95m`)
    mmb.addStrut(
      'ironCast',
      pierWorldPos(pier, -7.25, 64.25, -1.20),
      pierWorldPos(pier, -7.25, 64.25, 0.40),
      0.22,
      0.20,
      uUp
    );
    mmb.addStrut(
      'ironPrimary',
      pierWorldPos(pier, -3.00, 63.80, 1.95),
      pierWorldPos(pier, -3.00, 70.75, 1.95),
      0.18,
      0.28,
      uUp
    );

    // Open octagonal boiler-flue double curb `B` (`Cheminée`, centered at `[-52.32, -2.98, 52.62]`, Pl. 53 Fig. 1)
    // Drawn on the 3 outer facets (`a ∈ [22.5°..157.5°]` in (-X, +Z) quadrant) abutting the diagonal division wall
    const flueCx = -52.32;
    const flueCz = 52.62;
    for (const rOct of [1.35, 1.90]) {
      for (const k of [1, 2, 3]) {
        const a0 = ((k + 0.5) * Math.PI) / 4;
        const a1 = ((k + 1.5) * Math.PI) / 4;
        mmb.addStrut(
          'ironCast',
          [flueCx + rOct * Math.cos(a0), -2.98, flueCz + rOct * Math.sin(a0)],
          [flueCx + rOct * Math.cos(a1), -2.98, flueCz + rOct * Math.sin(a1)],
          0.16,
          0.26,
          uUp
        );
      }
    }
    mmb.addCylinder('ironCast', [flueCx - 0.55, -3.20, flueCz + 0.05], [flueCx - 0.55, -2.65, flueCz + 0.05], 0.13, 0.13, 8);
    mmb.addCylinder('ironCast', [flueCx + 0.25, -3.20, flueCz - 0.45], [flueCx + 0.25, -2.65, flueCz - 0.45], 0.12, 0.12, 8);

    // Two Quillacq steam-hydraulic pumps (`P1`) + Two Worthington duplex pumps (`P2`) seated ON the floor (`Y = -2.26..-0.82m`)
    // with vertical suction standpipes dropping into `Ré1` along the `rDiag = 65.45m & 67.85m` floor joists!
    for (const [sPump, rPump, isQuillacq] of [[-1.65, 65.45, true], [1.25, 65.45, true], [-1.65, 67.85, false], [1.25, 67.85, false]]) {
      const pBase = pierWorldPos(pier, -2.26, rPump, sPump);
      mmb.addOrientedBox('ironCast', pBase, [1.25, 0.42, 2.85], uPerp, uUp, uRad);
      // Vertical suction standpipe into `Ré1` aligned directly under joist `rPump`
      mmb.addCylinder(
        'ironCast',
        pierWorldPos(pier, -6.85, rPump, sPump),
        pierWorldPos(pier, -2.26, rPump, sPump),
        0.12,
        0.12,
        8
      );
      // Twin horizontal steam & hydraulic cylinders above floor
      for (const sSub of [-0.32, 0.32]) {
        const c0 = pierWorldPos(pier, -1.78, rPump - 1.25, sPump + sSub);
        const c1 = pierWorldPos(pier, -1.78, rPump + 1.05, sPump + sSub);
        mmb.addFlangedCylinder('ironCast', c0, c1, 0.23, 0.9, 10);
        // Brass/copper pressure dome (`cloche à air`)
        const domeBot = pierWorldPos(pier, -1.54, rPump + 0.50, sPump + sSub);
        const domeTop = pierWorldPos(pier, -0.82, rPump + 0.50, sPump + sSub);
        mmb.addCylinder('copperDome', domeBot, domeTop, 0.18, 0.15, 10);
      }
      if (isQuillacq) {
        const fwCenter = pierWorldPos(pier, -1.62, rPump - 1.35, sPump);
        mmb.addSpokedSheave('ironCast', fwCenter, uPerp, 0.88, 0.14, 6);
      }
    }
  }

  // 2nd-Floor Horizontal Cylindrical Feed Reservoirs `Ré2` (Y = +116.2m..+118.6m, Pl. 08 Fig. 3!)
  // Two riveted cylindrical tanks (2.25m dia x 5.6m long) seated on 2nd-floor girders
  const rRe2 = pier.id === 'pile_3' ? 2.4 : -2.4;
  const sRe2 = pier.id === 'pile_3' ? -4.8 : 4.8;
  const t0 = edouxWorldPos(117.35, rRe2 - 2.6, sRe2);
  const t1 = edouxWorldPos(117.35, rRe2 + 2.6, sRe2);
  mmb.addFlangedCylinder('ironCast', t0, t1, 1.12, 1.35, 16);
  // Saddle cradles on 2nd floor (+115.73m)
  for (const dR of [-1.8, 0.0, 1.8]) {
    const sad = edouxWorldPos(116.05, rRe2 + dR, sRe2);
    mmb.addBox('ironPrimary', sad, [1.8, 0.64, 0.36], Math.PI * 0.25);
  }
}

function combaluzierStage2CenterR(y) {
  // Exact Stage-2 pier centerline diagonal radius matching Zone 3 (`Panneau 6` top at +68.63m -> 21.10m):
  //   Y = 57.630m -> X_center = 24.475m (r = 34.613m)
  //   Y = 68.630m -> X_center = 21.100m (r = 29.840m)
  //   Y = 77.677m -> X_center = 18.880m (r = 26.700m)
  if (y <= 57.63) return 24.475 * SQRT2;
  if (y <= 68.63) return lerp(24.475, 21.10, (y - 57.63) / 11.0) * SQRT2;
  return lerp(21.10, 18.88, clamp((y - 68.63) / (77.677 - 68.63), 0, 1.2)) * SQRT2;
}

function buildCombaluzierUpperHeadframeAndSheaths(mmb, pier) {
  const uPerp = [pier.sz * INV_SQRT2, 0, -pier.sx * INV_SQRT2];
  const uUp = [0, 1, 0];

  // 1. Twin Semicircular / Circular Lattice Wheel Brackets (`Châssis supportant les gaines supérieures`, Pl. 20 Fig. 1!)
  //    Identical twin `R = 2.12m` lattice brackets centered on Panneau 6 top (`Y = +68.63m -> top +70.75m`)
  //    in the 45° pier-diagonal plane (`u_rad, Y`) at `sPerp = ±1.52m, rC = 25.90m`!
  for (const [sBrk, yC, rC, radW] of [[-1.52, 68.63, 25.90, 2.12], [1.52, 68.63, 25.90, 2.12]]) {
    const nSeg = 18;
    const radInner = radW - 0.34;
    for (let k = 0; k < nSeg; k++) {
      const a0 = (k / nSeg) * Math.PI * 2;
      const a1 = ((k + 1) / nSeg) * Math.PI * 2;
      const pOut0 = pierWorldPos(pier, yC + radW * Math.sin(a0), rC + radW * Math.cos(a0), sBrk);
      const pOut1 = pierWorldPos(pier, yC + radW * Math.sin(a1), rC + radW * Math.cos(a1), sBrk);
      const pIn0 = pierWorldPos(pier, yC + radInner * Math.sin(a0), rC + radInner * Math.cos(a0), sBrk);
      const pIn1 = pierWorldPos(pier, yC + radInner * Math.sin(a1), rC + radInner * Math.cos(a1), sBrk);
      mmb.addStrut('ironPrimary', pOut0, pOut1, 0.14, 0.16, uPerp);
      mmb.addStrut('ironLattice', pIn0, pIn1, 0.08, 0.10, uPerp);
      mmb.addStrut('ironLattice', pIn0, pOut1, 0.06, 0.07, uPerp);
      if (k % 2 === 0) {
        const pHub = pierWorldPos(pier, yC, rC, sBrk);
        mmb.addStrut('ironLattice', pHub, pIn0, 0.07, 0.08, uPerp);
      }
    }
    // Horizontal diametral chord at Panneau 6 top (+68.63m) & cast-iron hub
    mmb.addStrut(
      'ironPrimary',
      pierWorldPos(pier, 68.63, rC - radW - 0.35, sBrk),
      pierWorldPos(pier, 68.63, rC + radW + 0.35, sBrk),
      0.16,
      0.22,
      uPerp
    );
    mmb.addSpokedSheave('ironCast', pierWorldPos(pier, yC, rC, sBrk), uPerp, 0.55, 0.18, 6);

    // Support standards inside Panneau 6 (+57.63m .. +68.63m) under each arched wheel bracket
    for (const dR of [-3.85, -1.55, 0.85]) {
      const pTop = pierWorldPos(pier, 68.63, combaluzierStage2CenterR(68.63) + dR, sBrk);
      const pBot = pierWorldPos(pier, 57.63, combaluzierStage2CenterR(57.63) + dR * 1.05, sBrk);
      mmb.addStrut('ironPrimary', pTop, pBot, 0.15, 0.18, uPerp);
    }
    for (const yBrace of [61.30, 64.95]) {
      const rB = combaluzierStage2CenterR(yBrace);
      mmb.addStrut('ironLattice', pierWorldPos(pier, yBrace, rB - 3.9, sBrk), pierWorldPos(pier, yBrace, rB + 0.9, sBrk), 0.10, 0.12, uPerp);
    }
  }

  // 2. Inclined Braced Headframe & Twin Parallel Upper Piston Sheaths (`Gaines supérieures`, +58.20m -> apex +73.25m!)
  //    Inner chord hits exact apex `(Y = +73.25m, r = 23.97m -> X = ±16.95m)`; perpendicular top cap slopes to `(Y = +72.00m, r = 25.85m)`!
  const rInAt = (y) => lerp(32.35, 23.97, (y - 58.20) / (73.25 - 58.20));
  const rOutAt = (y) => lerp(34.35, 25.85, (y - 58.20) / (72.00 - 58.20));

  for (const sSide of [-0.92, 0.92]) {
    // Inner & outer inclined box chords + perpendicular top crosshead cap (`73.25m -> 72.00m`)
    const pInBot = pierWorldPos(pier, 58.20, rInAt(58.20), sSide);
    const pInTop = pierWorldPos(pier, 73.22, rInAt(73.22), sSide * 0.25);
    const pOutBot = pierWorldPos(pier, 58.20, rOutAt(58.20), sSide);
    const pOutTop = pierWorldPos(pier, 72.00, rOutAt(72.00), sSide);
    mmb.addStrut('ironPrimary', pInBot, pInTop, 0.15, 0.18, uPerp);
    mmb.addStrut('ironPrimary', pOutBot, pOutTop, 0.15, 0.18, uPerp);
    mmb.addStrut('ironPrimary', pInTop, pOutTop, 0.14, 0.18, uPerp);

    // Inclined St. Andrew's X-bracing bays along the sheath frame
    const yKnots = [58.20, 61.80, 65.20, 68.63, 70.40, 72.00];
    for (let i = 0; i < yKnots.length - 1; i++) {
      const ya = yKnots[i];
      const yb = yKnots[i + 1];
      const aIn = pierWorldPos(pier, ya, rInAt(ya), sSide * (ya > 71 ? 0.5 : 1.0));
      const bIn = pierWorldPos(pier, yb, rInAt(yb), sSide * (yb > 71 ? 0.4 : 1.0));
      const aOut = pierWorldPos(pier, ya, rOutAt(ya), sSide);
      const bOut = pierWorldPos(pier, yb, rOutAt(yb), sSide);
      mmb.addStrut('ironLattice', aIn, bOut, 0.075, 0.085, uPerp);
      mmb.addStrut('ironLattice', aOut, bIn, 0.075, 0.085, uPerp);
      mmb.addStrut('ironLattice', bIn, bOut, 0.09, 0.10, uPerp);
    }
  }
  // Exact apex ridge bar at Y = +73.25m (`X ≈ ±16.95m`) & Pl. 20 horizontal tie bars (`69.40m, 71.40m, 71.85m`)
  mmb.addStrut('ironPrimary', pierWorldPos(pier, 73.22, 23.97, -0.35), pierWorldPos(pier, 73.22, 23.97, 0.35), 0.14, 0.06, uUp);
  for (const [yH, rSpanExtra] of [[69.40, 0.65], [71.40, 0.45], [71.85, 0.15]]) {
    for (const sSide of [-0.92, 0.92]) {
      mmb.addStrut(
        'ironPrimary',
        pierWorldPos(pier, yH, rInAt(yH) - 0.15, sSide),
        pierWorldPos(pier, yH, rOutAt(Math.min(72.0, yH)) + rSpanExtra, sSide),
        0.12,
        0.15,
        uPerp
      );
    }
    mmb.addStrut('ironLattice', pierWorldPos(pier, yH, rInAt(yH), -0.92), pierWorldPos(pier, yH, rInAt(yH), 0.92), 0.10, 0.12, uUp);
  }

  // Twin parallel flanged upper piston sheath tubes (`Gaines supérieures des pistons articulés`, r = 0.16m)
  for (const sTube of [-0.68, 0.68]) {
    mmb.addFlangedCylinder(
      'ironCast',
      pierWorldPos(pier, 58.60, rInAt(58.60) + 0.62, sTube),
      pierWorldPos(pier, 72.75, rInAt(72.75) + 0.55, sTube * 0.65),
      0.16,
      2.4,
      10
    );
    mmb.addCylinder(
      'craneSteel',
      pierWorldPos(pier, 62.20, rInAt(62.20) + 1.38, sTube),
      pierWorldPos(pier, 72.15, rInAt(72.15) + 1.32, sTube * 0.85),
      0.11,
      0.11,
      8
    );
  }
}

function buildCombaluzierStaticMachinery(mmb, pier) {
  const uPerp = [pier.sz * INV_SQRT2, 0, -pier.sx * INV_SQRT2];
  const uRad = [pier.sx * INV_SQRT2, 0, pier.sz * INV_SQRT2];
  const uUp = [0, 1, 0];

  // Twin slotted articulated-piston guide cylinders running from basement (-1.9m) to 1st Floor (+59.2m)
  // + longitudinal slot flange lips + twin articulated pitch-chain piston link rods (`pistons articulés à chaînons`, Pl. 34!)
  const nSeg = 14;
  for (let i = 0; i < nSeg; i++) {
    const y0 = lerp(-1.9, 59.2, i / nSeg);
    const y1 = lerp(-1.9, 59.2, (i + 1) / nSeg);
    const r0 = trackRadiusAtY(Math.max(0, y0)) - 0.18 * Math.min(0, y0);
    const r1 = trackRadiusAtY(Math.max(0, y1)) - 0.18 * Math.min(0, y1);
    for (const side of [-0.78, 0.78]) {
      const p0 = pierWorldPos(pier, y0 + 0.18, r0 + 0.12, side);
      const p1 = pierWorldPos(pier, y1 + 0.18, r1 + 0.12, side);
      mmb.addCylinder('ironCast', p0, p1, 0.16, 0.16, 10);
      // Machined longitudinal guide slot cheek along cylinder face
      const s0 = pierWorldPos(pier, y0 + 0.18, r0 - 0.03, side);
      const s1 = pierWorldPos(pier, y1 + 0.18, r1 - 0.03, side);
      mmb.addStrut('ironPrimary', s0, s1, 0.06, 0.08, uPerp);
    }
    // Twin articulated Galle pitch-chain piston link rods (`pistons articulés à chaînons`) rising alongside cylinders
    for (const chainSide of [-0.54, 0.54]) {
      const c0 = pierWorldPos(pier, y0 + 0.22, r0 + 0.08, chainSide);
      const c1 = pierWorldPos(pier, y1 + 0.22, r1 + 0.08, chainSide);
      mmb.addStrut('craneSteel', c0, c1, 0.055, 0.095, uPerp);
      for (let k = 0; k < 4; k++) {
        const tk = (k + 0.5) / 4;
        const yPin = lerp(y0, y1, tk) + 0.22;
        const rPin = lerp(r0, r1, tk) + 0.08;
        const pPinA = pierWorldPos(pier, yPin, rPin, chainSide - 0.065);
        const pPinB = pierWorldPos(pier, yPin, rPin, chainSide + 0.065);
        mmb.addCylinder('ironCast', pPinA, pPinB, 0.052, 0.052, 8);
      }
    }
  }

  // Slotted guide-trunk collar yokes (`colliers d'entretoisement`) every ~3.5m tying cylinders to track girders
  for (let yCol = -1.2; yCol <= 58.8; yCol += 3.50) {
    const rCol = trackRadiusAtY(Math.max(0, yCol)) - 0.18 * Math.min(0, yCol);
    const ykL = pierWorldPos(pier, yCol + 0.18, rCol + 0.12, -1.18);
    const ykR = pierWorldPos(pier, yCol + 0.18, rCol + 0.12, 1.18);
    mmb.addStrut('ironPrimary', ykL, ykR, 0.11, 0.13, uUp);
    for (const side of [-0.78, 0.78]) {
      const cBot = pierWorldPos(pier, yCol + 0.10, rCol + 0.15, side);
      const cTop = pierWorldPos(pier, yCol + 0.26, rCol + 0.09, side);
      mmb.addCylinder('ironCast', cBot, cTop, 0.225, 0.225, 10);
    }
  }
  // Upper piston crosshead bridge (`traverse d'attelage`) at +59.05m
  const chL = pierWorldPos(pier, 59.05, trackRadiusAtY(59.05) + 0.06, -0.82);
  const chR = pierWorldPos(pier, 59.05, trackRadiusAtY(59.05) + 0.06, 0.82);
  mmb.addStrut('craneSteel', chL, chR, 0.14, 0.18, uUp);

  // Basement horizontal/inclined driving hydraulic cylinders & large toothed sprocket wheels (Y = -1.6m)
  for (const side of [-0.78, 0.78]) {
    const spPos = pierWorldPos(pier, -1.55, 72.8, side);
    mmb.addSpokedSheave('ironCast', spPos, uPerp, 0.88, 0.18, 8);
    // Horizontal hydraulic press barrels in masonry pit between Massifs A & C (`Pl. 63 Figs. 1 & 31`)
    const cylA = pierWorldPos(pier, -1.65, 65.2, side);
    const cylB = pierWorldPos(pier, -1.65, 72.2, side);
    mmb.addFlangedCylinder('ironCast', cylA, cylB, 0.30, 1.8, 12);
  }
  // Open side sill girders at Y = -2.05m (keeping central vault open down to -3.72m!)
  for (const sBeam of [-1.05, 1.05]) {
    mmb.addOrientedBox('ironPrimary', pierWorldPos(pier, -2.05, 69.2, sBeam), [0.24, 0.28, 8.4], uPerp, uUp, uRad);
  }

  // Subterranean pit vault (`Y = -3.80..-0.65 m`, `|s| <= 2.10 m`, visible down through open 4.36m elevator pit!):
  // Vertical weighted hydraulic accumulator, tandem water-pressure pump block & valve chest, and flanged manifolds (Pl. 04, Pl. 34)
  mmb.addOrientedBox('ironPrimary', pierWorldPos(pier, -3.72, 70.6, 0), [4.1, 0.16, 9.2], uPerp, uUp, uRad);
  const accR = 71.20;
  const accS = -1.52;
  mmb.addFlangedCylinder('ironCast', pierWorldPos(pier, -3.65, accR, accS), pierWorldPos(pier, -1.95, accR, accS), 0.27, 0.85, 10);
  mmb.addCylinder('craneSteel', pierWorldPos(pier, -2.10, accR, accS), pierWorldPos(pier, -0.68, accR, accS), 0.16, 0.16, 10);
  for (let w = 0; w < 5; w++) {
    const yW = -2.25 + w * 0.28;
    mmb.addCylinder('ironCast', pierWorldPos(pier, yW, accR, accS), pierWorldPos(pier, yW + 0.23, accR, accS), 0.54, 0.54, 12);
  }
  mmb.addCylinder('copperDome', pierWorldPos(pier, -0.82, accR, accS), pierWorldPos(pier, -0.66, accR, accS), 0.58, 0.50, 12);
  for (const ds of [-0.60, 0.60]) {
    mmb.addCylinder('craneSteel', pierWorldPos(pier, -3.65, accR, accS + ds), pierWorldPos(pier, -0.66, accR, accS + ds), 0.042, 0.042, 6);
  }
  // Tandem water-pressure pump block & bronze-trimmed distributor valve chest (`s = +1.52 m`, clear beside `s = +0.78 m` cylinder)
  const pumpS = 1.52;
  mmb.addOrientedBox('ironPrimary', pierWorldPos(pier, -3.45, 70.5, pumpS), [0.88, 0.36, 4.0], uPerp, uUp, uRad);
  mmb.addFlangedCylinder('ironCast', pierWorldPos(pier, -3.02, 68.7, pumpS), pierWorldPos(pier, -3.02, 70.2, pumpS), 0.26, 0.7, 10);
  mmb.addFlangedCylinder('ironCast', pierWorldPos(pier, -3.02, 70.8, pumpS), pierWorldPos(pier, -3.02, 72.3, pumpS), 0.26, 0.7, 10);
  mmb.addOrientedBox('ironCast', pierWorldPos(pier, -2.48, 70.5, pumpS), [0.68, 0.58, 0.96], uPerp, uUp, uRad);
  mmb.addCylinder('copperDome', pierWorldPos(pier, -2.18, 70.5, pumpS), pierWorldPos(pier, -1.68, 70.5, pumpS), 0.15, 0.12, 8);
  // Flanged high-pressure manifold pipes feeding `cylA/cylB` across open vault
  mmb.addFlangedCylinder('ironCast', pierWorldPos(pier, -2.35, accR, accS), pierWorldPos(pier, -2.35, 70.5, pumpS), 0.095, 1.2, 8);
  mmb.addFlangedCylinder('copperDome', pierWorldPos(pier, -1.95, 70.5, pumpS), pierWorldPos(pier, -1.65, 69.2, 0.78), 0.085, 0.9, 8);
  mmb.addFlangedCylinder('copperDome', pierWorldPos(pier, -1.95, accR, accS), pierWorldPos(pier, -1.65, 69.2, -0.78), 0.085, 0.9, 8);

  // Lower 1st-floor landing guide sheaves (+62.4m, connecting into `z5_combaluzier_upper_headframe_${pier.id}`)
  const yTop = 62.4;
  const rTop = trackRadiusAtY(yTop);
  for (const side of [-0.78, 0.78]) {
    const topSh = pierWorldPos(pier, yTop + 0.2, rTop + 0.1, side);
    mmb.addSpokedSheave('ironCast', topSh, uPerp, 0.68, 0.15, 8);
  }
}

function buildEdouxStaticMachinery(mmb) {
  const uDiagNS = [-INV_SQRT2, 0, INV_SQRT2];
  const uDiagEW = [INV_SQRT2, 0, INV_SQRT2];

  // 1. Twin 80.20m vertical cast-iron/steel hydraulic cylinders `Cy` (+115.73m -> +195.93m)
  //    Positioned on Pile 1 side (rNS = -2.15m) at sEW = ±1.45m (exact `Pl. 70 Fig. 8` cylinder passages!)
  for (const sEW of [-1.45, 1.45]) {
    const nSec = 10;
    for (let i = 0; i < nSec; i++) {
      const ya = lerp(115.73, 195.93, i / nSec);
      const yb = lerp(115.73, 195.93, (i + 1) / nSec);
      mmb.addFlangedCylinder('ironCast', edouxWorldPos(ya, -2.15, sEW), edouxWorldPos(yb, -2.15, sEW), 0.22, 4.0, 12);
    }
    // Stuffing-box gland head at Plancher Intermédiaire (+195.93m) & base shoe on 2nd Floor (+115.73m)
    mmb.addCylinder('copperDome', edouxWorldPos(195.65, -2.15, sEW), edouxWorldPos(196.35, -2.15, sEW), 0.32, 0.28, 12);
    mmb.addCylinder('ironCast', edouxWorldPos(115.73, -2.15, sEW), edouxWorldPos(116.45, -2.15, sEW), 0.38, 0.34, 12);
  }

  // 2. Hydraulic Distributor `AD` on `Plancher des Machinistes` (+193.67m) & Tank `Ré4` (+196.0..199.1m)
  const adPos = edouxWorldPos(194.45, -2.95, 0);
  mmb.addBox('ironCast', adPos, [1.4, 1.35, 1.4], Math.PI * 0.25);
  mmb.addCylinder('copperDome', edouxWorldPos(193.75, -2.95, -0.45), edouxWorldPos(195.65, -2.95, -0.45), 0.20, 0.20, 10);
  // Open rectangular/cylindrical intermediate tank `Ré4` (+196.0..199.1m)
  mmb.addCylinder('ironCast', edouxWorldPos(196.05, -2.85, 2.35), edouxWorldPos(199.15, -2.85, 2.35), 0.92, 0.92, 14);

  // 2b. `+195.93m` Édoux `Plancher Intermédiaire` well enclosures, sliding transfer gates (`portillons`),
  //     hydraulic buffer stops (`heurtoirs`) & cast-iron guide-column collars (`colliers`, Pl. 08 & Pl. 53 Fig. 14)
  const yInt = 195.93;
  const hGate = 1.05;
  for (const rSign of [-1, 1]) {
    const rIn = rSign * 0.62;
    const rOut = rSign * 3.68;
    // End well parapets (`rNS = ±0.62m` & `±3.68m`) + diamond wire mesh directly on trimmer beams
    for (const rEnd of [rIn, rOut]) {
      mmb.addStrut('ironPrimary', edouxWorldPos(yInt + hGate, rEnd, -1.68), edouxWorldPos(yInt + hGate, rEnd, 1.68), 0.055, 0.055, [0, 1, 0]);
      mmb.addStrut('ironLattice', edouxWorldPos(yInt + 0.52, rEnd, -1.68), edouxWorldPos(yInt + 0.52, rEnd, 1.68), 0.036, 0.036, [0, 1, 0]);
      addDiamondMeshParapet(mmb, edouxWorldPos(yInt + 0.05, rEnd, -1.68), edouxWorldPos(yInt + 0.05, rEnd, 1.68), edouxWorldPos(yInt + hGate - 0.03, rEnd, -1.68), edouxWorldPos(yInt + hGate - 0.03, rEnd, 1.68), uDiagNS, 10);
    }
    // Side enclosures & sliding passenger transfer gates (`portillons de transbordement`) along `sEW = ±1.68m`
    for (const sSide of [-1.68, 1.68]) {
      mmb.addStrut('ironPrimary', edouxWorldPos(yInt + hGate + 0.06, rIn, sSide), edouxWorldPos(yInt + hGate + 0.06, rOut, sSide), 0.06, 0.08, [0, 1, 0]);
      mmb.addStrut('ironPrimary', edouxWorldPos(yInt + hGate, rIn, sSide), edouxWorldPos(yInt + hGate, rOut, sSide), 0.048, 0.048, [0, 1, 0]);
      for (const rPost of [rIn, rSign * 1.32, rSign * 2.98, rOut]) {
        mmb.addStrut('ironPrimary', edouxWorldPos(yInt, rPost, sSide), edouxWorldPos(yInt + hGate + 0.06, rPost, sSide), 0.05, 0.05, uDiagEW);
      }
      addDiamondMeshParapet(mmb, edouxWorldPos(yInt + 0.05, rIn, sSide), edouxWorldPos(yInt + 0.05, rOut, sSide), edouxWorldPos(yInt + hGate - 0.04, rIn, sSide), edouxWorldPos(yInt + hGate - 0.04, rOut, sSide), uDiagEW, 10);
      // Sliding gate pickets & brass latch handle (`goldAccent`)
      for (let g = 1; g <= 5; g++) {
        const rg = lerp(rSign * 1.32, rSign * 2.98, g / 6);
        mmb.addStrut('ironLattice', edouxWorldPos(yInt + 0.06, rg, sSide), edouxWorldPos(yInt + hGate - 0.02, rg, sSide), 0.028, 0.028, uDiagEW);
      }
      mmb.addCylinder('goldAccent', edouxWorldPos(yInt + 0.56, rSign * 2.15, sSide - 0.04), edouxWorldPos(yInt + 0.56, rSign * 2.15, sSide + 0.04), 0.045, 0.045, 8);
    }
    // Twin hydraulic buffer stops (`heurtoirs hydrauliques`) seated directly on trimmer beam corners
    for (const sBuf of [-1.64, 1.64]) {
      const rBuf = rSign * 0.65;
      mmb.addCylinder('ironCast', edouxWorldPos(yInt - 0.72, rBuf, sBuf), edouxWorldPos(yInt - 0.08, rBuf, sBuf), 0.11, 0.09, 8);
      mmb.addCylinder('copperDome', edouxWorldPos(yInt - 0.08, rBuf, sBuf), edouxWorldPos(yInt + 0.26, rBuf, sBuf), 0.065, 0.075, 8);
    }
    // Cast-iron guide-column collars (`colliers de guidage`) clamping `Poteaux B` (`rNS = ±4.20m`) to `±3.68m` trimmers
    mmb.addBox('ironCast', edouxWorldPos(yInt - 0.08, rSign * 4.20, 0), [0.98, 0.34, 0.98], Math.PI * 0.25);
    for (const sTie of [-0.42, 0.42]) {
      mmb.addStrut('ironPrimary', edouxWorldPos(yInt - 0.08, rSign * 4.20, sTie), edouxWorldPos(yInt - 0.14, rOut, sTie), 0.12, 0.18, [0, 1, 0]);
    }
  }
  // Central cast-iron guide collar clamping `Poteau A` (`[0, Y, 0]`) to `±0.62m` trimmers
  mmb.addBox('ironCast', edouxWorldPos(yInt - 0.08, 0, 0), [0.96, 0.36, 0.96], Math.PI * 0.25);
  for (const sTie of [-0.38, 0.38]) {
    mmb.addStrut('ironPrimary', edouxWorldPos(yInt - 0.10, -0.62, sTie), edouxWorldPos(yInt - 0.10, 0.62, sTie), 0.12, 0.18, [0, 1, 0]);
  }

  // 3. Upper Cylindrical Feed Reservoir `Ré3` right under 3rd Floor (`304.63 NGF` = +271.13m..+275.45m, Pl. 08 Fig. 1!)
  mmb.addFlangedCylinder('ironCast', edouxWorldPos(271.13, 2.05, 0), edouxWorldPos(275.45, 2.05, 0), 1.18, 1.4, 16);
  // Support girder cradle under `Ré3` at Y = 271.0m
  mmb.addStrut('ironPrimary', edouxWorldPos(271.0, 0.4, -1.6), edouxWorldPos(271.0, 3.8, -1.6), 0.22, 0.32, [0, 1, 0]);
  mmb.addStrut('ironPrimary', edouxWorldPos(271.0, 0.4, 1.6), edouxWorldPos(271.0, 3.8, 1.6), 0.22, 0.32, [0, 1, 0]);

  // 4. Six Overhead Deflection/Return Sheaves `Po1, Po2` (`6 Poulies de renvoi`, Pl. 65 Fig. 3 & Pl. 08 Fig. 1!)
  //    Simultaneously aligned to Pl. 65 Fig. 3 (`X ≈ ±2.60m & 0.0m, Y = 282.1m & 283.9m`) AND Pl. 08 Fig. 1 (`rNS = ±2.15m`):
  const sheaveSpecs = [
    [282.35, 2.15, -1.53, 0.72],  // Left lower on Pl. 65 (X = -2.60m, rNS = +2.15m)
    [283.95, 2.15, -1.53, 0.72],  // Left upper on Pl. 65 (X = -2.60m, rNS = +2.15m)
    [282.10, -2.15, 1.53, 0.90],  // Right lower on Pl. 65 (X = +2.60m, rNS = -2.15m)
    [283.85, -2.15, 1.53, 0.90],  // Right upper on Pl. 65 (X = +2.60m, rNS = -2.15m)
    [282.05, -2.05, -1.98, 0.86], // Center lower on Pl. 65 (X = +0.05m, rNS = -2.05m)
    [283.90, 2.05, 1.98, 0.86],   // Center upper on Pl. 65 (X = -0.05m, rNS = +2.05m)
  ];
  for (const [ySh, rSh, sOff, radSh] of sheaveSpecs) {
    const shCenter = edouxWorldPos(ySh, rSh, sOff);
    mmb.addSpokedSheave('ironCast', shCenter, uDiagEW, radSh, 0.16, 8);
  }
  // Vertical sheave hanger standards at X = ±2.60m & overhead cradle beams (`281.25m & 284.75m`, Pl. 65 Fig. 3)
  for (const [rH, sH] of [[2.15, -1.53], [-2.15, 1.53]]) {
    for (const dS of [-0.22, 0.22]) {
      mmb.addStrut('ironPrimary', edouxWorldPos(281.15, rH, sH + dS), edouxWorldPos(284.90, rH, sH + dS), 0.12, 0.14, uDiagEW);
    }
  }
  for (const yBeam of [281.25, 284.75]) {
    for (const sOff of [-1.53, 1.53]) {
      mmb.addStrut('ironPrimary', edouxWorldPos(yBeam, -2.55, sOff), edouxWorldPos(yBeam, 2.55, sOff), 0.15, 0.20, [0, 1, 0]);
    }
  }

  // 4b. Two Suspended Inspection Catwalks (`Passerelles suspendues pour la visite`, Pl. 65 Fig. 3:
  //     decks at Y = 264.40m & 267.85m, top handrails at Y = 265.18m & 268.63m, within column batter!)
  for (const [yDeck, halfW] of [[264.40, 4.30], [267.85, 4.48]]) {
    const corners = [
      [-halfW, yDeck, -halfW],
      [halfW, yDeck, -halfW],
      [halfW, yDeck, halfW],
      [-halfW, yDeck, halfW],
    ];
    for (let c = 0; c < 4; c++) {
      const a = corners[c];
      const b = corners[(c + 1) % 4];
      // Catwalk deck stringer, mid-rail (+0.38m), and top handrail (+0.78m -> 265.93m & 268.63m)
      mmb.addStrut('ironPrimary', a, b, 0.22, 0.16, [0, 1, 0]);
      mmb.addStrut('ironLattice', [a[0], yDeck + 0.38, a[2]], [b[0], yDeck + 0.38, b[2]], 0.06, 0.07, [0, 1, 0]);
      mmb.addStrut('ironLattice', [a[0], yDeck + 0.78, a[2]], [b[0], yDeck + 0.78, b[2]], 0.07, 0.08, [0, 1, 0]);
      for (let p = 0; p <= 6; p++) {
        const u = p / 6;
        const px = lerp(a[0], b[0], u);
        const pz = lerp(a[2], b[2], u);
        mmb.addStrut('ironLattice', [px, yDeck, pz], [px, yDeck + 0.80, pz], 0.05, 0.05, [1, 0, 0]);
      }
    }
    // Interior cross-walkways flanking the central Édoux shaft (`z = ±2.85m`)
    for (const zWalk of [-2.85, 2.85]) {
      mmb.addStrut('ironPrimary', [-halfW, yDeck, zWalk], [halfW, yDeck, zWalk], 0.20, 0.14, [0, 1, 0]);
      mmb.addStrut('ironLattice', [-halfW, yDeck + 0.78, zWalk], [halfW, yDeck + 0.78, zWalk], 0.06, 0.07, [0, 1, 0]);
    }
  }
  // Vertical steel suspension hanger rods (`tiges de suspension`) from 3rd-floor girder soffit (+274.2m -> +264.40m)
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      mmb.addCylinder('craneSteel', [sx * 3.45, 264.40, sz * 4.28], [sx * 3.45, 274.20, sz * 4.28], 0.036, 0.036, 6);
      mmb.addCylinder('craneSteel', [sx * 4.28, 264.40, sz * 3.45], [sx * 4.28, 274.20, sz * 3.45], 0.036, 0.036, 6);
    }
  }

  // 5. Worthington Vertical Rising Main & Condenser/Standpipe Line (+115.73m -> +295.00m `Plancher de la Lanterne` soffit!)
  //    Matches Pl. 08 pipes `t4, t7, t8`; above +276.13m, routed discretely inside Zone 4's NE (+X, -Z) corner column &
  //    curved diagonal campanile arch rib (leaving the open arch void 280.98..293.2m 100% clear alongside Escalier du campanile!)
  const nRise = 18;
  for (let i = 0; i < nRise; i++) {
    const ya = lerp(115.73, 276.13, i / nRise);
    const yb = lerp(115.73, 276.13, (i + 1) / nRise);
    mmb.addCylinder('ironCast', edouxWorldPos(ya, -3.55, 1.35), edouxWorldPos(yb, -3.55, 1.35), 0.13, 0.13, 8);
    mmb.addCylinder('ironCast', edouxWorldPos(ya, 3.55, -1.35), edouxWorldPos(yb, 3.55, -1.35), 0.12, 0.12, 8);
  }
  const campanileRibPipeKnots = [
    [276.13, 4.10],
    [280.98, 4.35],
    [285.58, 4.35],
    [286.50, 4.32],
    [287.50, 4.23],
    [288.50, 4.025],
    [289.50, 3.68],
    [290.50, 3.145],
    [291.00, 2.745],
    [291.50, 2.365],
    [292.00, 1.905],
    [292.50, 1.43],
    [292.95, 1.065],
    [293.08, 1.02],
  ];
  for (let i = 0; i < campanileRibPipeKnots.length - 1; i++) {
    const [ya, ca] = campanileRibPipeKnots[i];
    const [yb, cb] = campanileRibPipeKnots[i + 1];
    mmb.addCylinder('ironCast', [ca, ya, -ca], [cb, yb, -cb], 0.052, 0.052, 6);
  }
  // Horizontal feed inside the +293.08m Phare gallery deck & compact `Ré0` expansion drum inside 1.16m-radius Lanterne drum
  mmb.addCylinder('ironCast', [1.02, 293.08, -1.02], [0.32, 293.08, -0.32], 0.052, 0.052, 6);
  mmb.addCylinder('ironCast', [0.32, 293.08, -0.32], [0.32, 293.38, -0.32], 0.065, 0.065, 8);
  mmb.addCylinder('copperDome', [0.32, 293.35, -0.32], [0.32, 295.00, -0.32], 0.25, 0.25, 12);
}

// ============================================================================
// Kinematic Elevator Cabins, Counterweights, Purchase Chariots & Plunger Rams
// ============================================================================
function createInclinedDoubleDeckCabinRig(THREE, materials, pier, isOtis = true) {
  const wrapper = new THREE.Group();
  wrapper.name = `cabin_wrapper_${pier.id}`;

  const carriage = new THREE.Group();
  carriage.name = `cabin_carriage_${pier.id}`;
  wrapper.add(carriage);

  // Build carriage chassis & cabin body in local space where:
  //   +X = uPerp (width across track, ±1.18m)
  //   +Y = vertically UP when cabin stays upright, while stepped chassis follows pier incline!
  //   +Z = uRad (positive = outward away from tower center; negative = inward/up-slope!)
  // Because the cabin walls & windows in Pl. 04 Inset A, Pl. 17 Fig. 5 & Photo 29 remain
  // upright (vertical mullions & horizontal roof/floors!) while the underframe bogie & stepped
  // chassis tilt to match the local track angle `alpha = atan2(1, |dr/dY|)`, we separate:
  //   1. `bogieGroup` (tilts to exact track tangent!)
  //   2. `bodyGroup` (stays plumb vertical, with upper compartment stepped up-slope relative to lower!)
  const bogieMmb = new MultiMaterialBuilder(THREE, materials);
  // Inclined steel underframe chassis (6.2m long along track x 2.35m wide) + 4 flanged wheels
  for (const sx of [-1.18, 1.18]) {
    bogieMmb.addStrut('craneSteel', [sx, -0.15, -3.1], [sx, -0.15, 3.1], 0.14, 0.26, [1, 0, 0]);
    for (const sz of [-2.35, 2.35]) {
      bogieMmb.addSpokedSheave('ironCast', [sx, -0.32, sz], [1, 0, 0], 0.34, 0.10, 6);
    }
  }
  for (const sz of [-2.6, 0.0, 2.6]) {
    bogieMmb.addStrut('craneSteel', [-1.22, -0.15, sz], [1.22, -0.15, sz], 0.14, 0.18, [0, 1, 0]);
  }
  const bogieGroup = bogieMmb.buildGroup(`bogie_${pier.id}`);
  carriage.add(bogieGroup);

  const bodyMmb = new MultiMaterialBuilder(THREE, materials);
  const wCab = isOtis ? 2.42 : 2.28;
  const dDeck = isOtis ? 2.65 : 2.40;
  const hDeck = 2.45;
  // Lower deck centered at (0, +1.35, +0.95); Upper deck stepped up-slope at (0, +3.75, -0.95)
  const decks = [
    { y0: 0.25, zc: 0.92, hasBalcony: isOtis },
    { y0: 2.68, zc: -0.92, hasBalcony: isOtis },
  ];
  for (const dk of decks) {
    // Floor & ceiling frames + 8 transverse I-beam floor joist ends (`poutrelles`, Pl. 17 Fig. 5!)
    bodyMmb.addBox('woodPavilion', [0, dk.y0 + 0.06, dk.zc], [wCab, 0.12, dDeck]);
    bodyMmb.addBox('ironPrimary', [0, dk.y0 - 0.04, dk.zc], [wCab + 0.08, 0.10, dDeck + 0.08]);
    const zJoistFront = dk.hasBalcony ? dk.zc - dDeck * 0.5 - 0.88 : dk.zc - dDeck * 0.45;
    const zJoistBack = dk.zc + dDeck * 0.45;
    for (let j = 0; j < 8; j++) {
      const zJ = lerp(zJoistFront, zJoistBack, j / 7);
      const wSpan = zJ < dk.zc - dDeck * 0.5 ? wCab * 0.82 : wCab + 0.14;
      bodyMmb.addBox('ironPrimary', [0, dk.y0 - 0.11, zJ], [wSpan, 0.11, 0.045]);
      bodyMmb.addBox('craneSteel', [0, dk.y0 - 0.165, zJ], [wSpan + 0.02, 0.024, 0.105]);
    }
    bodyMmb.addBox('woodPavilion', [0, dk.y0 + hDeck, dk.zc], [wCab + 0.12, 0.10, dDeck + 0.12]);
    // Curved clerestory roof crown
    bodyMmb.addBox('ironPrimary', [0, dk.y0 + hDeck + 0.14, dk.zc], [wCab * 0.68, 0.18, dDeck * 0.86]);
    bodyMmb.addBox('goldAccent', [0, dk.y0 + hDeck + 0.25, dk.zc], [wCab * 0.70, 0.04, dDeck * 0.88]);

    // Corner & mullion posts + lower wooden wainscoting + multipane 1889 glazing
    for (const sx of [-wCab * 0.48, wCab * 0.48]) {
      bodyMmb.addBox('woodPavilion', [sx, dk.y0 + 0.48, dk.zc], [0.07, 0.82, dDeck - 0.1]);
      bodyMmb.addBox('glass1889', [sx, dk.y0 + 1.62, dk.zc], [0.03, 1.42, dDeck - 0.18]);
      for (let m = -2; m <= 2; m++) {
        const zm = dk.zc + (m / 2) * (dDeck * 0.46);
        bodyMmb.addStrut('ironPrimary', [sx, dk.y0, zm], [sx, dk.y0 + hDeck, zm], 0.06, 0.06, [1, 0, 0]);
      }
      // Interior passenger bench
      bodyMmb.addBox('woodPavilion', [sx * 0.76, dk.y0 + 0.44, dk.zc], [0.42, 0.08, dDeck * 0.78]);
    }
    for (const sz of [dk.zc - dDeck * 0.48, dk.zc + dDeck * 0.48]) {
      bodyMmb.addBox('woodPavilion', [0, dk.y0 + 0.48, sz], [wCab - 0.1, 0.82, 0.07]);
      bodyMmb.addBox('glass1889', [0, dk.y0 + 1.62, sz], [wCab - 0.18, 1.42, 0.03]);
      for (const xm of [-wCab * 0.24, wCab * 0.24]) {
        bodyMmb.addStrut('ironPrimary', [xm, dk.y0, sz], [xm, dk.y0 + hDeck, sz], 0.055, 0.055, [0, 0, 1]);
      }
    }

    // Otis forward conductor balcony (`Pl. 17 Fig. 5`: raked diamond wire-mesh front parapet!)
    if (dk.hasBalcony) {
      const zBalBack = dk.zc - dDeck * 0.5;
      const zBalToe = zBalBack - 0.94;
      const zBalTop = zBalToe + 0.34;
      const wBal = wCab * 0.78;
      const hwBal = wBal * 0.5;
      const yBal0 = dk.y0 + 0.04;
      const yBal1 = dk.y0 + 0.98;
      bodyMmb.addBox('ironPrimary', [0, dk.y0 + 0.02, 0.5 * (zBalBack + zBalToe)], [wBal, 0.08, 0.94]);
      const pFL0 = [-hwBal, yBal0, zBalToe];
      const pFR0 = [hwBal, yBal0, zBalToe];
      const pFL1 = [-hwBal, yBal1, zBalTop];
      const pFR1 = [hwBal, yBal1, zBalTop];
      bodyMmb.addStrut('ironPrimary', pFL0, pFL1, 0.042, 0.042, [1, 0, 0]);
      bodyMmb.addStrut('ironPrimary', pFR0, pFR1, 0.042, 0.042, [1, 0, 0]);
      bodyMmb.addStrut('ironPrimary', [0, yBal0, zBalToe], [0, yBal1, zBalTop], 0.035, 0.035, [1, 0, 0]);
      bodyMmb.addStrut('woodPavilion', pFL1, pFR1, 0.05, 0.045, [0, 1, 0]);
      addDiamondMeshParapet(bodyMmb, pFL0, pFR0, pFL1, pFR1, [0, 0, 1], 10);
      for (const sx of [-hwBal, hwBal]) {
        const pSB0 = [sx, yBal0, zBalBack];
        const pSB1 = [sx, yBal1, zBalBack];
        const pSF0 = [sx, yBal0, zBalToe];
        const pSF1 = [sx, yBal1, zBalTop];
        const zMid = 0.5 * (zBalBack + zBalTop);
        bodyMmb.addStrut('ironPrimary', [sx, yBal0, zMid], [sx, yBal1, zMid], 0.036, 0.036, [1, 0, 0]);
        bodyMmb.addStrut('woodPavilion', pSF1, pSB1, 0.05, 0.045, [1, 0, 0]);
        addDiamondMeshParapet(bodyMmb, pSF0, pSB0, pSF1, pSB1, [1, 0, 0], 6);
      }
    }
  }

  // Otis stepped triangular steel lattice under-cradle & counterweight safety-brake lever (`parachute`, Pl. 17 Fig. 5!)
  if (isOtis) {
    for (const sx of [-1.06, 1.06]) {
      // Lower triangular steel truss cradle tying horizontal lower deck (y=0.14) down into inclined bogie chassis
      const cFront = [sx, 0.14, -0.35];
      const cMidSoffit = [sx, 0.14, 0.92];
      const cRear = [sx, 0.14, 2.18];
      const cApex = [sx, -0.82, 1.48];
      const cToe = [sx, -0.38, 0.36];
      bodyMmb.addStrut('craneSteel', cFront, cToe, 0.075, 0.09, [1, 0, 0]);
      bodyMmb.addStrut('craneSteel', cToe, cApex, 0.085, 0.10, [1, 0, 0]);
      bodyMmb.addStrut('craneSteel', cApex, cRear, 0.085, 0.10, [1, 0, 0]);
      bodyMmb.addStrut('ironLattice', cMidSoffit, cToe, 0.055, 0.06, [1, 0, 0]);
      bodyMmb.addStrut('ironLattice', cMidSoffit, cApex, 0.055, 0.06, [1, 0, 0]);
      bodyMmb.addStrut('ironLattice', [sx, 0.14, 1.56], cApex, 0.055, 0.06, [1, 0, 0]);
      // Upper stepped-deck knee-brace truss tying upper deck front overhang into lower cabin frame
      bodyMmb.addStrut('craneSteel', [sx, 2.54, -2.18], [sx, 1.82, -0.40], 0.065, 0.08, [1, 0, 0]);
      bodyMmb.addStrut('ironLattice', [sx, 2.54, -1.32], [sx, 2.12, -0.40], 0.048, 0.05, [1, 0, 0]);
    }
    bodyMmb.addStrut('craneSteel', [-1.06, -0.82, 1.48], [1.06, -0.82, 1.48], 0.07, 0.08, [0, 1, 0]);
    bodyMmb.addStrut('craneSteel', [-1.06, -0.38, 0.36], [1.06, -0.38, 0.36], 0.07, 0.08, [0, 1, 0]);

    // Counterweight safety-brake lever (`levier à contrepoids du parachute Otis`) suspended under lower balcony
    bodyMmb.addStrut('craneSteel', [0, -0.58, 0.48], [0, -0.30, -0.68], 0.055, 0.075, [1, 0, 0]);
    bodyMmb.addBox('ironCast', [0, -0.28, -0.78], [0.28, 0.24, 0.38]);
    bodyMmb.addCylinder('craneSteel', [0, -0.16, -0.82], [0, 0.22, -0.92], 0.016, 0.016, 6);
    bodyMmb.addStrut('ironLattice', [0, -0.66, -0.52], [0, -0.76, 0.45], 0.036, 0.036, [1, 0, 0]);
    bodyMmb.addCylinder('craneSteel', [0, -0.38, -0.72], [0, -0.66, -0.52], 0.016, 0.016, 6);
  }
  const bodyGroup = bodyMmb.buildGroup(`cabin_body_${pier.id}`);
  carriage.add(bodyGroup);

  // Align carriage yaw so local +X = uPerp, local +Z = uRad!
  const uPerpV = new THREE.Vector3(pier.sz * INV_SQRT2, 0, -pier.sx * INV_SQRT2);
  const uUpV = new THREE.Vector3(0, 1, 0);
  const uRadV = new THREE.Vector3(pier.sx * INV_SQRT2, 0, pier.sz * INV_SQRT2);
  const rotMat = new THREE.Matrix4().makeBasis(uPerpV, uUpV, uRadV);
  carriage.quaternion.setFromRotationMatrix(rotMat);

  let cwtGroup = null;
  let chariotGroup = null;
  if (isOtis) {
    // Otis wheeled cast-iron counterweight carriage `Cp1`
    const cwtMmb = new MultiMaterialBuilder(THREE, materials);
    cwtMmb.addBox('ironCast', [0, 0, 0], [1.65, 0.36, 4.4]);
    for (const sx of [-0.88, 0.88]) {
      for (const sz of [-1.7, 1.7]) {
        cwtMmb.addSpokedSheave('craneSteel', [sx, -0.12, sz], [1, 0, 0], 0.22, 0.08, 6);
      }
    }
    cwtGroup = cwtMmb.buildGroup(`otis_cwt_${pier.id}`);
    cwtGroup.quaternion.copy(carriage.quaternion);
    wrapper.add(cwtGroup);

    // Otis mobile 6-sheave purchase chariot `Cha / Pou2` + twin polished piston rods `tg`
    const chMmb = new MultiMaterialBuilder(THREE, materials);
    for (const sOff of [-0.55, -0.33, -0.11, 0.11, 0.33, 0.55]) {
      chMmb.addSpokedSheave('ironCast', [sOff, 0.15, 0], [1, 0, 0], 0.68, 0.09, 8);
    }
    chMmb.addBox('craneSteel', [0, 0.0, 0], [1.72, 0.42, 1.55]);
    for (const sx of [-0.92, 0.92]) {
      for (const sz of [-0.55, 0.55]) {
        chMmb.addSpokedSheave('ironCast', [sx, -0.22, sz], [1, 0, 0], 0.24, 0.08, 6);
      }
    }
    // Twin 11m polished steel piston rods extending down-slope into cylinder `Cyl`
    for (const sx of [-0.36, 0.36]) {
      chMmb.addCylinder('craneSteel', [sx, 0.15, 0.4], [sx, 0.15, 11.4], 0.075, 0.075, 10);
    }
    chariotGroup = chMmb.buildGroup(`otis_chariot_${pier.id}`);
    chariotGroup.quaternion.copy(carriage.quaternion);
    wrapper.add(chariotGroup);
  }

  function setElevation(yCabinLowerFloor) {
    const rCab = trackRadiusAtY(yCabinLowerFloor + 1.2);
    const drDy = trackDrDyAtY(yCabinLowerFloor + 1.2);
    // Track climbs in -uRad (+Y, -Z_local): slope angle from horizontal is atan2(1, |drDy|)
    const pitchTrack = Math.atan2(1.0, Math.abs(drDy)); // ~0.96 rad (55°) lower, ~1.36 rad (78°) upper
    const pos = pierWorldPos(pier, yCabinLowerFloor, rCab - 0.35, 0);
    carriage.position.set(pos[0], pos[1], pos[2]);
    // Tilt bogie underframe along local -Z up-slope (rotation around local +X by +pitchTrack)
    bogieGroup.rotation.set(pitchTrack, 0, 0);
    bogieGroup.position.set(0, 1.45, 0.25);
    // Gently adjust upper/lower stepped offset as slope steepens so both decks stay horizontal on rails
    const stepShiftZ = lerp(0.0, 0.52, clamp((pitchTrack - 0.96) / 0.40, 0, 1));
    bodyGroup.position.set(0, 0, stepShiftZ);

    if (isOtis && cwtGroup && chariotGroup) {
      const uNorm = clamp((yCabinLowerFloor - 1.58) / (115.73 - 1.58), 0, 1);
      // Counterweight descends from 112m to 68.7m as cabin ascends (43.32m travel, Pl. 08!)
      const yCwt = lerp(111.5, 68.2, uNorm);
      const rCwt = trackRadiusAtY(yCwt) + 1.35;
      const pCwt = pierWorldPos(pier, yCwt, rCwt, 0);
      cwtGroup.position.set(pCwt[0], pCwt[1], pCwt[2]);
      cwtGroup.rotation.copy(carriage.rotation);
      cwtGroup.rotateX(Math.atan2(1.0, Math.abs(trackDrDyAtY(yCwt))));

      // Traveling purchase chariot moves DOWN-SLOPE 10.83m (from Y=22.4m to Y=13.5m) to hoist cabin!
      const yCha = lerp(22.4, 13.5, uNorm);
      const rCha = otisCylRadiusAtY(yCha) + 0.15;
      const pCha = pierWorldPos(pier, yCha, rCha, 0);
      chariotGroup.position.set(pCha[0], pCha[1], pCha[2]);
      chariotGroup.quaternion.copy(carriage.quaternion);
      chariotGroup.rotateX(Math.atan2(1.0, 0.6905));
    }
  }

  return { wrapper, setElevation };
}

function createEdouxCounterbalancedRig(THREE, materials) {
  const wrapper = new THREE.Group();
  wrapper.name = 'edoux_kinematic_wrapper';

  function buildVerticalCabin(name) {
    const mmb = new MultiMaterialBuilder(THREE, materials);
    const w = 3.15;
    const d = 3.35;
    const h = 3.30;
    // Floor, steel crosshead beam, roof & cupola
    mmb.addBox('ironPrimary', [0, -0.12, 0], [w + 0.16, 0.22, d + 0.16]);
    mmb.addBox('woodPavilion', [0, 0.04, 0], [w, 0.10, d]);
    mmb.addBox('woodPavilion', [0, h, 0], [w + 0.14, 0.12, d + 0.14]);
    mmb.addBox('ironPrimary', [0, h + 0.24, 0], [w + 0.20, 0.26, 0.45]);
    mmb.addBox('goldAccent', [0, h + 0.42, 0], [w * 0.62, 0.08, d * 0.62]);

    for (const sx of [-w * 0.48, w * 0.48]) {
      mmb.addBox('woodPavilion', [sx, 0.52, 0], [0.08, 0.92, d - 0.12]);
      mmb.addBox('glass1889', [sx, 1.98, 0], [0.035, 1.88, d - 0.20]);
      for (let m = -2; m <= 2; m++) {
        mmb.addStrut('ironPrimary', [sx, 0, (m / 2) * (d * 0.46)], [sx, h, (m / 2) * (d * 0.46)], 0.07, 0.07, [1, 0, 0]);
      }
      mmb.addBox('woodPavilion', [sx * 0.78, 0.46, 0], [0.46, 0.08, d * 0.72]);
    }
    for (const sz of [-d * 0.48, d * 0.48]) {
      mmb.addBox('woodPavilion', [0, 0.52, sz], [w - 0.12, 0.92, 0.08]);
      mmb.addBox('glass1889', [0, 1.98, sz], [w - 0.20, 1.88, 0.035]);
      for (const xm of [-w * 0.22, w * 0.22]) {
        mmb.addStrut('ironPrimary', [xm, 0, sz], [xm, h, sz], 0.06, 0.06, [0, 0, 1]);
      }
    }
    const g = mmb.buildGroup(name);
    g.rotation.y = Math.PI * 0.25; // Oriented on 45° diagonal frame (`Pl. 70 Fig. 8`)
    return g;
  }

  // `Ca2`: Upper cabin (+195.93m -> +276.13m) on Pile 1 side (rNS = -2.15m)
  const cabUpper = buildVerticalCabin('edoux_cabine_superieure_Ca2');
  // `Ca1`: Lower counterbalance cabin (+195.93m -> +115.73m) on Pile 3 side (rNS = +2.15m)
  const cabLower = buildVerticalCabin('edoux_cabine_inferieure_Ca1');
  wrapper.add(cabUpper, cabLower);

  // Twin 80.5m polished steel hydraulic rams `Pi` (0.16m radius) supporting `Ca2`
  const ramGeom = new THREE.CylinderGeometry(0.155, 0.155, 80.6, 12);
  ramGeom.translate(0, -40.3, 0); // Top of ram at local y=0 (underside of Ca2!)
  const ramL = new THREE.Mesh(ramGeom, materials.craneSteel);
  const ramR = new THREE.Mesh(ramGeom, materials.craneSteel);
  wrapper.add(ramL, ramR);

  // 6 Dynamic Steel Suspension/Counterbalance Cables `Câb` (3 per cabin) over the `6 Poulies de renvoi` (`283.9m & 282.1m`)
  const cableGeom = new THREE.CylinderGeometry(0.028, 0.028, 1.0, 6);
  cableGeom.translate(0, 0.5, 0); // Base at y=0, extends +Y by scale.y
  const cablesUpper = [];
  const cablesLower = [];
  for (const [sOff, ySheave] of [[-1.53, 283.90], [0.0, 282.15], [1.53, 283.90]]) {
    const cu = new THREE.Mesh(cableGeom, materials.craneSteel);
    const cl = new THREE.Mesh(cableGeom, materials.craneSteel);
    const pU = edouxWorldPos(0, -2.15, sOff);
    const pL = edouxWorldPos(0, 2.15, sOff);
    cu.position.set(pU[0], 0, pU[2]);
    cl.position.set(pL[0], 0, pL[2]);
    wrapper.add(cu, cl);
    cablesUpper.push({ mesh: cu, ySheave });
    cablesLower.push({ mesh: cl, ySheave });
  }
  // Horizontal top bridge cables across the 6 sheaves (`Y = 284.75m` for `sOff = ±1.53`, `Y = 282.95m` for `sOff = 0.0`)
  const topCableMmb = new MultiMaterialBuilder(THREE, materials);
  for (const [yC, sOff] of [[282.95, 0.0], [284.75, -1.53], [284.75, 1.53]]) {
    topCableMmb.addCylinder('craneSteel', edouxWorldPos(yC, -2.15, sOff), edouxWorldPos(yC, 2.15, sOff), 0.028, 0.028, 6);
  }
  wrapper.add(topCableMmb.buildGroup('edoux_top_sheave_cables'));

  function setRelayFraction(uRelay) {
    // uRelay in [0..1]:
    //   0.0 => Both cabins meet at Plancher Intermédiaire (+195.93m) for passenger transfer!
    //   1.0 => Ca2 at 3rd Floor (+276.13m, rams Pi fully extended) & Ca1 at 2nd Floor (+115.73m)!
    const u = clamp(uRelay, 0, 1);
    const yCa2 = 195.93 + 80.20 * u;
    const yCa1 = 195.93 - 80.20 * u;

    const p2 = edouxWorldPos(yCa2, -2.15, 0);
    const p1 = edouxWorldPos(yCa1, 2.15, 0);
    cabUpper.position.set(p2[0], p2[1], p2[2]);
    cabLower.position.set(p1[0], p1[1], p1[2]);

    const pRamL = edouxWorldPos(yCa2 - 0.15, -2.15, -1.45);
    const pRamR = edouxWorldPos(yCa2 - 0.15, -2.15, 1.45);
    ramL.position.set(pRamL[0], pRamL[1], pRamL[2]);
    ramR.position.set(pRamR[0], pRamR[1], pRamR[2]);

    for (const { mesh, ySheave } of cablesUpper) {
      const lenU = Math.max(0.5, ySheave - (yCa2 + 3.45));
      mesh.position.y = yCa2 + 3.45;
      mesh.scale.set(1, lenU, 1);
    }
    for (const { mesh, ySheave } of cablesLower) {
      const lenL = Math.max(0.5, ySheave - (yCa1 + 3.45));
      mesh.position.y = yCa1 + 3.45;
      mesh.scale.set(1, lenL, 1);
    }
  }

  return { wrapper, setRelayFraction };
}


// ============================================================================
// SUBSYSTEM 4: Temporary Construction Falsework & Climbing Cranes
//   - Phase 1: 4 Guyed Timber Derrick Masts (`Bigues`), 16 Shoe Hydraulic Jacks,
//              Raking Timber Props (`Étais`) & Decauville Narrow-Gauge Rail Loop
//   - Phase 2: 12 Outer Battered Multi-Tier Pyramidal Timber Falsework Pylons
//              (`Pylônes de 43m`) + Cast-Iron Sandboxes (`Boîtes à sable`)
//   - Phase 3: 4 Central Multi-Bay Timber Falsework Towers (`50.3m` tall) +
//              Curved Arch Centering (`Cintres`) + Phase 4 Stage-2 Tie-Beams
//   - Phases 2–4: 4 Pivoting Climbing Creeper Cranes (`Grues pivotantes`)
//   - Phases 6–7: 2 Upper-Shaft Internal Climbing Cranes & Riveting Stages
// ============================================================================

function pierChordCenterAtY(y) {
  // Exact Zone 1 arbalétrier pier square center (verified against Pl. 03, Pl. 69, Pl. 55):
  // xc(Y) = 51.9535 - 0.5295526 * (Y - 2.50), with 4 chords at ±7.50m in X and Z.
  return 51.9535 - 0.5295526 * (y - 2.50);
}

function buildPhase0CaissonAirlocksAndDerrick(THREE, materials) {
  // Photo 13 (`step = 0.55`, May 1, 1887) & Photo 30: Pneumatic Caisson `Sas à Air` Cylinders,
  // Lock-Tender Sheds & Tall Ladder-Runged Timber A-Frame Derrick (`Chèvre de fonçage`) on Pile 4 Ouest (+ Pile 1).
  const mmb = new MultiMaterialBuilder(THREE, materials);

  // 1. Center cylindrical riveted `sas à air`: [-50.835, Y, -52.828], R = 0.967 m, Y = -5.20 .. +2.30 m
  const cMid = [-50.835, 0, -52.828];
  mmb.addCylinder('ironCast', [cMid[0], -5.20, cMid[2]], [cMid[0], 2.28, cMid[2]], 0.967, 0.967, 20);
  mmb.addCylinder('ironPrimary', [cMid[0], 2.28, cMid[2]], [cMid[0], 2.44, cMid[2]], 0.967, 0.38, 20);
  mmb.addCylinder('copperDome', [cMid[0], 2.44, cMid[2]], [cMid[0], 2.54, cMid[2]], 0.24, 0.18, 12);
  for (const yRing of [-3.4, -1.8, -0.4, 0.95, 2.24]) {
    mmb.addCylinder('ironPrimary', [cMid[0], yRing, cMid[2]], [cMid[0], yRing + 0.06, cMid[2]], 0.995, 0.995, 20);
  }
  // Twin angled cylindrical muck chutes (`écluses à déblais`) & compressed-air riser pipe
  mmb.addCylinder('ironCast', [cMid[0] - 0.65, 0.55, cMid[2] + 0.35], [cMid[0] - 1.55, -0.35, cMid[2] + 0.85], 0.28, 0.24, 12);
  mmb.addCylinder('ironCast', [cMid[0] + 0.65, 0.55, cMid[2] - 0.35], [cMid[0] + 1.55, -0.35, cMid[2] - 0.85], 0.28, 0.24, 12);
  mmb.addCylinder('craneSteel', [cMid[0] - 0.85, -3.5, cMid[2] + 0.55], [cMid[0] - 0.85, 2.35, cMid[2] + 0.55], 0.075, 0.075, 8);
  // Adjacent two-tier wooden lock-tender cabin (`cabane d'éclusier`, left of center cylinder in Photo 13)
  mmb.addBox('woodTimberTemp', [-53.20, 1.15, -53.95], [2.10, 2.85, 2.40], 0.24);
  mmb.addBox('woodPavilion', [-53.45, 2.95, -54.25], [1.95, 1.05, 1.95], 0.24);
  mmb.addBox('woodPavilion', [-52.65, 2.42, -53.65], [2.45, 0.10, 2.65], 0.24, 0, -0.22);

  // 2. Foreground-right cylindrical riveted `sas à air`: [-44.058, Y, -46.554], R = 1.317 m, Y = -5.20 .. +1.26 m
  const cRgt = [-44.058, 0, -46.554];
  mmb.addCylinder('ironCast', [cRgt[0], -5.20, cRgt[2]], [cRgt[0], 1.24, cRgt[2]], 1.317, 1.317, 24);
  mmb.addCylinder('ironPrimary', [cRgt[0], 1.24, cRgt[2]], [cRgt[0], 1.42, cRgt[2]], 1.317, 0.48, 24);
  for (const yRing of [-3.6, -2.1, -0.75, 0.45, 1.20]) {
    mmb.addCylinder('ironPrimary', [cRgt[0], yRing, cRgt[2]], [cRgt[0], yRing + 0.06, cRgt[2]], 1.345, 1.345, 24);
  }
  // Bolted rectangular airlock door, wooden operator platform + X-guardrail, sloped lean-to roof & access ladder
  mmb.addBox('ironPrimary', [-42.88, -0.02, -45.95], [0.42, 1.18, 0.86], -0.45);
  mmb.addBox('woodTimberTemp', [-42.25, -0.82, -45.35], [1.65, 0.12, 1.85], -0.25);
  for (const [px, pz] of [[-42.95, -44.55], [-41.45, -44.85], [-41.65, -46.15]]) {
    mmb.addStrut('woodTimberTemp', [px, -2.2, pz], [px, 0.15, pz], 0.09, 0.09, [1, 0, 0]);
  }
  mmb.addStrut('woodTimberTemp', [-42.95, 0.12, -44.55], [-41.45, 0.12, -44.85], 0.08, 0.08, [0, 1, 0]);
  mmb.addStrut('woodTimberTemp', [-42.95, -0.75, -44.55], [-41.45, 0.10, -44.85], 0.06, 0.06, [0, 1, 0]);
  mmb.addStrut('woodTimberTemp', [-42.95, 0.10, -44.55], [-41.45, -0.75, -44.85], 0.06, 0.06, [0, 1, 0]);
  mmb.addBox('woodPavilion', [-41.85, 1.48, -45.95], [2.55, 0.09, 2.35], -0.24, 0, 0.16);
  for (const lx of [-0.26, 0.26]) {
    mmb.addStrut('woodTimberTemp', [-41.15 + lx, -1.65, -44.65], [-41.55 + lx, 2.35, -45.75], 0.065, 0.085, [1, 0, 0]);
  }
  for (let r = 0; r < 11; r++) {
    const tr = (r + 0.5) / 11;
    const ry = lerp(-1.45, 2.20, tr);
    const rz = lerp(-44.70, -45.70, tr);
    const rx = lerp(-41.15, -41.55, tr);
    mmb.addStrut('woodTimberTemp', [rx - 0.26, ry, rz], [rx + 0.26, ry, rz], 0.04, 0.04, [0, 1, 0]);
  }

  // 3. Tall ladder-runged timber A-frame caisson derrick (`Chèvre de fonçage`): exact PnP apex [-43.553, +10.600, -50.953]
  const apex = [-43.553, 10.600, -50.953];
  const legL = [-45.05, -1.50, -50.35];
  const legR = [-42.15, -1.50, -51.55];
  const legRear = [-43.35, -0.85, -55.45];
  mmb.addStrut('timberFalsework', legL, apex, 0.22, 0.24, [0, 0, 1]);
  mmb.addStrut('timberFalsework', legR, apex, 0.22, 0.24, [0, 0, 1]);
  mmb.addStrut('timberFalsework', legRear, [apex[0], apex[1] - 0.25, apex[2]], 0.19, 0.21, [1, 0, 0]);
  for (let k = 1; k <= 14; k++) {
    const tk = k / 15;
    mmb.addStrut('woodTimberTemp', lerpPt3(legL, apex, tk), lerpPt3(legR, apex, tk), 0.065, 0.075, [0, 1, 0]);
  }
  mmb.addBox('ironCast', [apex[0], apex[1] - 0.12, apex[2]], [0.52, 0.42, 0.48]);
  mmb.addSpokedSheave('ironCast', [apex[0], apex[1] - 0.48, apex[2]], [0.38, 0, 0.92], 0.34, 0.10, 6);
  mmb.addCylinder('craneSteel', [apex[0], apex[1] - 0.50, apex[2]], [apex[0], -2.20, apex[2]], 0.032, 0.032, 6);
  for (const guyFoot of [[-58.2, 1.15, -45.8], [-35.2, 1.15, -47.2], [-48.5, 1.45, -60.5], [-38.8, 1.45, -59.8]]) {
    mmb.addCylinder('craneSteel', [apex[0], apex[1] - 0.08, apex[2]], guyFoot, 0.024, 0.024, 6);
  }
  // Background timber staging trestle (`estacade en charpente`, Photo 13) + riverside Pile 1 airlocks
  mmb.addBox('timberFalsework', [-46.6, 3.12, -55.8], [4.6, 0.18, 3.2], 0.15);
  for (const [tx, tz] of [[-48.5, -54.6], [-44.7, -55.0], [-48.3, -57.0], [-44.5, -57.2]]) {
    mmb.addStrut('timberFalsework', [tx, -1.2, tz], [tx, 3.12, tz], 0.20, 0.20, [1, 0, 0]);
  }
  mmb.addStrut('timberFalsework', [-48.5, -0.6, -54.6], [-44.7, 3.05, -55.0], 0.12, 0.12, [0, 0, 1]);
  mmb.addStrut('timberFalsework', [-44.7, -0.6, -55.0], [-48.5, 3.05, -54.6], 0.12, 0.12, [0, 0, 1]);
  for (const [ax, az] of [[48.5, -50.5], [52.2, -47.2]]) {
    mmb.addCylinder('ironCast', [ax, -5.20, az], [ax, 2.10, az], 1.05, 1.05, 16);
    mmb.addCylinder('ironPrimary', [ax, 2.10, az], [ax, 2.26, az], 1.05, 0.42, 16);
  }
  return mmb.buildGroup('z5_temp_phase0_caisson_airlocks_derrick');
}

function buildPhase1Derricks(THREE, materials) {
  const mmb = new MultiMaterialBuilder(THREE, materials);

  // 4 authentic July 1887 guyed timber gin-poles (`bigues / mâts-grues`, Photo 09 at `step 1.50`, 18 July 1887):
  // Single slender round timber mast leaning slightly inward along the pier batter from ground crib (`Y = +0.05m`)
  // to its forged-iron spider cap at exact `[-46.50, 13.55, +46.50]` on Pile 3 (`Photo 09` landmark `derrick_mast_top_cap`!),
  // rigged with 4 slender guy wires (`haubans`) to the 4 corner shoe anchorages and a compact hoist block (`palan`).
  for (const pier of PIERS) {
    const cxShoe = pier.sx * 51.9535;
    const czShoe = pier.sz * 51.9535;
    const uPerp = [pier.sz * INV_SQRT2, 0, -pier.sx * INV_SQRT2];

    const footX = pier.sx * 46.75;
    const footZ = pier.sz * 46.75;
    const topX = pier.sx * 46.50;
    const topZ = pier.sz * 46.50;
    const yBase = 0.05;
    const yMastTop = 13.55;

    // Compact squared-timber sole crib (`semelle en charpente`) on ground inside pier square
    for (const off of [-0.85, 0.85]) {
      mmb.addBox('timberFalsework', [footX + off, yBase + 0.12, footZ], [0.26, 0.24, 2.2]);
      mmb.addBox('timberFalsework', [footX, yBase + 0.34, footZ + off], [2.2, 0.22, 0.26]);
    }
    // Cast-iron pivot step (`crapaudine`) at gin-pole foot
    mmb.addCylinder('ironCast', [footX, yBase + 0.42, footZ], [footX, yBase + 0.72, footZ], 0.28, 0.24, 8);

    // Single slender round timber gin-pole (`mât-grue`, r = 0.20m -> 0.14m) with wrought-iron collar bands
    mmb.addCylinder('timberFalsework', [footX, yBase + 0.55, footZ], [topX, yMastTop - 0.18, topZ], 0.20, 0.14, 10);
    for (let k = 1; k <= 7; k++) {
      const u = k / 8;
      const bx = lerp(footX, topX, u);
      const by = lerp(yBase + 0.65, yMastTop - 0.25, u);
      const bz = lerp(footZ, topZ, u);
      const rBand = lerp(0.205, 0.148, u);
      mmb.addCylinder('ironCast', [bx - pier.sx * 0.02, by - 0.05, bz - pier.sz * 0.02], [bx, by + 0.05, bz], rBand, rBand, 8);
    }

    // Forged-iron spider cap (`bonnet de bigue`) at exact Y = +13.55m (`derrick_mast_top_cap` landmark!)
    mmb.addCylinder('ironCast', [topX, yMastTop - 0.24, topZ], [topX, yMastTop, topZ], 0.21, 0.16, 8);

    // Compact upper & lower hoist pulley blocks (`moufle supérieure et inférieure`) hanging from gin-pole head
    const sheaveTop = [topX - pier.sx * 0.18, yMastTop - 0.42, topZ - pier.sz * 0.18];
    const hookPt = [sheaveTop[0], 7.35, sheaveTop[2]];
    mmb.addSpokedSheave('ironCast', sheaveTop, uPerp, 0.24, 0.08, 6);
    mmb.addCylinder('craneSteel', [sheaveTop[0] - 0.06, sheaveTop[1], sheaveTop[2]], [hookPt[0] - 0.05, hookPt[1], hookPt[2]], 0.016, 0.016, 5);
    mmb.addCylinder('craneSteel', [sheaveTop[0] + 0.06, sheaveTop[1], sheaveTop[2]], [hookPt[0] + 0.05, hookPt[1], hookPt[2]], 0.016, 0.016, 5);
    mmb.addSpokedSheave('ironCast', hookPt, uPerp, 0.20, 0.08, 6);

    // Compact hand-operated geared crab winch (`treuil à engrenages`) strapped near gin-pole foot
    const winchPos = [footX + pier.sx * 0.55, yBase + 0.78, footZ + pier.sz * 0.55];
    mmb.addBox('ironCast', winchPos, [0.85, 0.68, 0.75]);
    mmb.addSpokedSheave(
      'craneSteel',
      [winchPos[0] + uPerp[0] * 0.48, winchPos[1] + 0.08, winchPos[2] + uPerp[2] * 0.48],
      uPerp,
      0.38,
      0.06,
      6
    );
    // Lead line from gin-pole head down to crab winch drum
    mmb.addCylinder('craneSteel', [topX, yMastTop - 0.30, topZ], winchPos, 0.014, 0.014, 5);

    // 4 slender taut steel guy cables (`haubans`, r = 0.015m) anchored to the 4 corner shoe plinths (`±7.50m`)
    for (const dx of [-1, 1]) {
      for (const dz of [-1, 1]) {
        const gx = cxShoe + dx * 7.50;
        const gz = czShoe + dz * 7.50;
        mmb.addCylinder('craneSteel', [topX, yMastTop - 0.14, topZ], [gx, 2.15, gz], 0.015, 0.015, 5);
      }
    }
  }

  return mmb.buildGroup('phase1_guyed_timber_derricks');
}

function buildPhase1ShoeJacksPropsAndDecauville(THREE, materials) {
  const mmb = new MultiMaterialBuilder(THREE, materials);

  // 1. 16 Hydraulic 800-Tonne Shoe Jacking Frames (`Presses hydrauliques de 800t`) & Raking Timber Shores (`Étais`)
  for (const pier of PIERS) {
    for (const dx of [-1, 1]) {
      for (const dz of [-1, 1]) {
        const sxShoe = pier.sx * (51.9535 + dx * 7.50);
        const szShoe = pier.sz * (51.9535 + dz * 7.50);

        // Portable 800t hydraulic jack press & hand-pump manifold beside cast-iron shoe (`Y = 1.65..2.85m`)
        const jx = sxShoe - pier.sx * 0.85;
        const jz = szShoe - pier.sz * 0.85;
        mmb.addFlangedCylinder('ironCast', [jx, 1.62, jz], [jx, 2.72, jz], 0.34, 1.2, 10);
        mmb.addCylinder('copperDome', [jx + 0.52, 1.62, jz], [jx + 0.52, 2.38, jz], 0.11, 0.11, 8);
        mmb.addCylinder('craneSteel', [jx + 0.52, 2.35, jz - 0.45], [jx + 0.52, 2.55, jz + 0.55], 0.025, 0.025, 6);

        // Nearly-vertical timber shores (`chandelles en bois`, Photo 09) tucked strictly under the Y = 6.9m starter truss chords
        // (eliminating any high raking bars projecting into the sky near Photo 09's close-up camera!)
        if (dx === -1 || dz === -1) {
          const yPropTop = 6.65;
          const xcTop = pierChordCenterAtY(yPropTop);
          const tx = pier.sx * (xcTop + dx * 7.50);
          const tz = pier.sz * (xcTop + dz * 7.50);
          const bx1 = tx - pier.sx * 0.45;
          const bz1 = tz - pier.sz * 0.45;
          mmb.addCylinder('timberFalsework', [bx1, 0.15, bz1], [tx, yPropTop, tz], 0.13, 0.11, 7);
          mmb.addBox('timberFalsework', [bx1, 0.10, bz1], [1.1, 0.20, 1.1], Math.PI * 0.25);
        }
      }
    }
  }

  // 2. 0.60m Narrow-Gauge Decauville Construction Railway (`Voie Decauville`, Photo 09) & Flatcars
  //    Perimeter square loop at ±39.5m + diagonal spurs feeding all 4 piers at Y = 0.06m
  const railGaugeHalf = 0.30;
  const loopHalf = 39.5;
  const trackSegments = [
    [[-loopHalf, -loopHalf], [loopHalf, -loopHalf]],
    [[loopHalf, -loopHalf], [loopHalf, loopHalf]],
    [[loopHalf, loopHalf], [-loopHalf, loopHalf]],
    [[-loopHalf, loopHalf], [-loopHalf, -loopHalf]],
    [[-loopHalf, -loopHalf], [-51.5, -51.5]],
    [[loopHalf, -loopHalf], [51.5, -51.5]],
    [[loopHalf, loopHalf], [51.5, 51.5]],
    [[-loopHalf, loopHalf], [-51.5, 51.5]],
  ];

  for (const [[x0, z0], [x1, z1]] of trackSegments) {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    const nx = -dz / len;
    const nz = dx / len;
    for (const s of [-railGaugeHalf, railGaugeHalf]) {
      mmb.addStrut(
        'craneSteel',
        [x0 + nx * s, 0.08, z0 + nz * s],
        [x1 + nx * s, 0.08, z1 + nz * s],
        0.05,
        0.06,
        [0, 1, 0]
      );
    }
    const nSleepers = Math.floor(len / 1.15);
    for (let i = 0; i <= nSleepers; i += 2) {
      const t = i / Math.max(1, nSleepers);
      const sx = lerp(x0, x1, t);
      const sz = lerp(z0, z1, t);
      mmb.addStrut(
        'timberFalsework',
        [sx - nx * 0.52, 0.03, sz - nz * 0.52],
        [sx + nx * 0.52, 0.03, sz + nz * 0.52],
        0.14,
        0.06,
        [0, 1, 0]
      );
    }
  }

  // 4 Decauville iron material bogie flatcars (`wagonnets`) carrying iron girder sections
  for (const [wx, wz, yaw] of [[0, 39.5, 0], [39.5, 0, Math.PI * 0.5], [-24.0, 39.5, 0], [0, -39.5, 0]]) {
    mmb.addBox('ironCast', [wx, 0.34, wz], [2.2, 0.14, 1.05], yaw);
    mmb.addBox('ironPrimary', [wx, 0.56, wz], [3.4, 0.28, 0.52], yaw);
  }

  return mmb.buildGroup('phase1_jacks_props_decauville');
}

function addBatteredPyramidalTimberPylon(mmb, opts) {
  const {
    baseX,
    baseZ,
    topX,
    topZ,
    yBase = 0.0,
    yTop = 43.0,
    halfBaseX = 3.2,
    halfBaseZ = 3.2,
    halfTopX = 1.75,
    halfTopZ = 1.75,
    nTiers = 8,
  } = opts;

  function cornerAt(t, sx, sz) {
    const cx = lerp(baseX, topX, t);
    const cz = lerp(baseZ, topZ, t);
    const hx = lerp(halfBaseX, halfTopX, t);
    const hz = lerp(halfBaseZ, halfTopZ, t);
    return [cx + sx * hx, lerp(yBase, yTop, t), cz + sz * hz];
  }

  // Masonry/concrete sole pad (`massif provisoire`) at ground
  mmb.addBox('timberFalsework', [baseX, yBase + 0.18, baseZ], [halfBaseX * 2.25, 0.36, halfBaseZ * 2.25]);

  // 4 heavy squared-timber corner posts (`poteaux d'angle` 0.32m x 0.32m) + central kingpost
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      for (let i = 0; i < nTiers; i++) {
        const p0 = cornerAt(i / nTiers, sx, sz);
        const p1 = cornerAt((i + 1) / nTiers, sx, sz);
        mmb.addStrut('timberFalsework', p0, p1, 0.30, 0.30, [1, 0, 0]);
      }
    }
  }
  // Intermediate face verticals (`poteaux intermédiaires`) for rich Eiffel scaffold lattice density
  for (let i = 0; i < nTiers; i++) {
    const t0 = i / nTiers;
    const t1 = (i + 1) / nTiers;
    for (const side of [-1, 1]) {
      mmb.addStrut('timberFalsework', cornerAt(t0, 0, side), cornerAt(t1, 0, side), 0.20, 0.20, [1, 0, 0]);
      mmb.addStrut('timberFalsework', cornerAt(t0, side, 0), cornerAt(t1, side, 0), 0.20, 0.20, [0, 0, 1]);
    }
  }

  // Horizontal double ledgers (`moises horizontales`) & St. Andrew's X-bracing (`croix de Saint-André`) on all 4 faces
  for (let i = 0; i <= nTiers; i++) {
    const t = i / nTiers;
    const cNN = cornerAt(t, -1, -1);
    const cPN = cornerAt(t, 1, -1);
    const cPP = cornerAt(t, 1, 1);
    const cNP = cornerAt(t, -1, 1);

    if (i > 0) {
      mmb.addStrut('timberFalsework', cNN, cPN, 0.18, 0.24, [0, 1, 0]);
      mmb.addStrut('timberFalsework', cPN, cPP, 0.18, 0.24, [0, 1, 0]);
      mmb.addStrut('timberFalsework', cPP, cNP, 0.18, 0.24, [0, 1, 0]);
      mmb.addStrut('timberFalsework', cNP, cNN, 0.18, 0.24, [0, 1, 0]);
      // Internal plan cross-ties
      mmb.addStrut('timberFalsework', cornerAt(t, -1, 0), cornerAt(t, 1, 0), 0.16, 0.20, [0, 1, 0]);
      mmb.addStrut('timberFalsework', cornerAt(t, 0, -1), cornerAt(t, 0, 1), 0.16, 0.20, [0, 1, 0]);
    }

    if (i < nTiers) {
      const tNext = (i + 1) / nTiers;
      const nNN = cornerAt(tNext, -1, -1);
      const nPN = cornerAt(tNext, 1, -1);
      const nPP = cornerAt(tNext, 1, 1);
      const nNP = cornerAt(tNext, -1, 1);

      const faces = [
        [cNN, cPN, nNN, nPN],
        [cPN, cPP, nPN, nPP],
        [cPP, cNP, nPP, nNP],
        [cNP, cNN, nNP, nNN],
      ];
      for (const [bA, bB, uA, uB] of faces) {
        mmb.addStrut('timberFalsework', bA, uB, 0.15, 0.16, [0, 1, 0]);
        mmb.addStrut('timberFalsework', bB, uA, 0.15, 0.16, [0, 1, 0]);
      }
    }
  }

  // Open timber top cap grillage (`chevêtres`), thin plank catwalk, open 2-rail handrails & 2 Cast-Iron Sandboxes (`Boîtes à sable`)!
  for (const sz of [-0.72, 0.0, 0.72]) {
    mmb.addStrut(
      'timberFalsework',
      [topX - halfTopX * 1.12, yTop + 0.16, topZ + sz * halfTopZ],
      [topX + halfTopX * 1.12, yTop + 0.16, topZ + sz * halfTopZ],
      0.24,
      0.28,
      [0, 1, 0]
    );
  }
  mmb.addBox('timberFalsework', [topX, yTop + 0.32, topZ], [halfTopX * 2.28, 0.10, halfTopZ * 2.28]);
  // Open 2-rail timber posts & handrails around sandbox inspection catwalk (replaces solid 0.95m box wall!)
  const rx = halfTopX * 1.10;
  const rz = halfTopZ * 1.10;
  const rCorners = [
    [topX - rx, topZ - rz],
    [topX + rx, topZ - rz],
    [topX + rx, topZ + rz],
    [topX - rx, topZ + rz],
  ];
  for (let c = 0; c < 4; c++) {
    const [ax, az] = rCorners[c];
    const [bx, bz] = rCorners[(c + 1) % 4];
    const mx = 0.5 * (ax + bx);
    const mz = 0.5 * (az + bz);
    mmb.addStrut('timberFalsework', [ax, yTop + 0.34, az], [ax, yTop + 1.06, az], 0.08, 0.08, [1, 0, 0]);
    mmb.addStrut('timberFalsework', [mx, yTop + 0.34, mz], [mx, yTop + 1.06, mz], 0.07, 0.07, [1, 0, 0]);
    for (const dyR of [0.68, 1.04]) {
      mmb.addStrut('timberFalsework', [ax, yTop + dyR, az], [bx, yTop + dyR, bz], 0.06, 0.07, [0, 1, 0]);
    }
  }
  // Cylindrical cast-iron sandboxes (`boîtes à sable`) & oak striking plungers bearing pier chord
  for (const off of [-0.65, 0.65]) {
    mmb.addFlangedCylinder(
      'ironCast',
      [topX + off, yTop + 0.36, topZ - off * 0.5],
      [topX + off, yTop + 1.14, topZ - off * 0.5],
      0.32,
      0.7,
      10
    );
  }
}

function buildPhase2OuterPierFalseworkPylons(THREE, materials) {
  const mmb = new MultiMaterialBuilder(THREE, materials);

  // For each of the 4 piers, 3 overhanging `arbalétrier` chords (Chord A inner-inner, Chord B1 & Chord B2 inner-outer)
  // are propped by battered pyramidal squared-timber pylons (`Photos 23, 51, 14`) meeting Zone 1's exact chord soffits:
  //   - Chord A (`inner-inner`) propped right below `Poutre de l'Arc` soffit (`Y = 43.33m`, chord at ±22.84m)
  //   - Chords B1 & B2 (`inner-outer` / `outer-inner`) propped at `Panneau 3/4` (`Y = 39.20m`, chord at ±25.0m / ±40.0m,
  //     tucked cleanly inside the inclined outer pier face so nothing protrudes beyond the iron pier silhouette!)
  const yTopA = 42.15;
  const xcA = pierChordCenterAtY(yTopA + 1.15); // 30.35m => inner chord at 22.85m!
  const cInnerA = xcA - 7.50; // 22.85m

  const yTopB = 38.60;
  const xcB = pierChordCenterAtY(yTopB + 1.15); // 32.23m => inner=24.73m, outer=39.73m!
  const cInnerB = xcB - 7.50; // 24.73m
  const cOuterB = xcB + 7.50 - 1.35; // 38.38m (1.35m inward of outer face so pylon top stays 100% under chord!)

  for (const pier of PIERS) {
    // 1. Tall Inner-Diagonal Pylon (`43.3m` total with sandboxes) under Chord A
    addBatteredPyramidalTimberPylon(mmb, {
      baseX: pier.sx * 26.8,
      baseZ: pier.sz * 26.8,
      topX: pier.sx * (cInnerA + 0.35),
      topZ: pier.sz * (cInnerA + 0.35),
      yBase: 0.0,
      yTop: yTopA,
      halfBaseX: 3.35,
      halfBaseZ: 3.35,
      halfTopX: 1.75,
      halfTopZ: 1.75,
      nTiers: 8,
    });

    // 2. Facade-Z Flank Pylon (`39.8m` total with sandboxes) under Chord B1
    addBatteredPyramidalTimberPylon(mmb, {
      baseX: pier.sx * 27.6,
      baseZ: pier.sz * 41.2,
      topX: pier.sx * (cInnerB + 0.25),
      topZ: pier.sz * cOuterB,
      yBase: 0.0,
      yTop: yTopB,
      halfBaseX: 2.95,
      halfBaseZ: 2.95,
      halfTopX: 1.55,
      halfTopZ: 1.55,
      nTiers: 7,
    });

    // 3. Facade-X Flank Pylon (`39.8m` total with sandboxes) under Chord B2
    addBatteredPyramidalTimberPylon(mmb, {
      baseX: pier.sx * 41.2,
      baseZ: pier.sz * 27.6,
      topX: pier.sx * cOuterB,
      topZ: pier.sz * (cInnerB + 0.25),
      yBase: 0.0,
      yTop: yTopB,
      halfBaseX: 2.95,
      halfBaseZ: 2.95,
      halfTopX: 1.55,
      halfTopZ: 1.55,
      nTiers: 7,
    });

    // Horizontal timber tie-bridges (`passerelles d'entretoisement`) linking the 3 pylons of each pier at Y=22m & Y=33m
    for (const yTie of [22.0, 33.2]) {
      const tA = yTie / yTopA;
      const tB = yTie / yTopB;
      const pA = [pier.sx * lerp(26.8, cInnerA + 0.35, tA), yTie, pier.sz * lerp(26.8, cInnerA + 0.35, tA)];
      const pB1 = [pier.sx * lerp(27.6, cInnerB + 0.25, tB), yTie, pier.sz * lerp(41.2, cOuterB, tB)];
      const pB2 = [pier.sx * lerp(41.2, cOuterB, tB), yTie, pier.sz * lerp(27.6, cInnerB + 0.25, tB)];
      mmb.addStrut('timberFalsework', pA, pB1, 0.22, 0.28, [0, 1, 0]);
      mmb.addStrut('timberFalsework', pA, pB2, 0.22, 0.28, [0, 1, 0]);
    }
  }

  return mmb.buildGroup('phase2_outer_pier_falsework_pylons');
}

function buildPhase3CentralFacadeFalseworkTowers(THREE, materials) {
  const mmb = new MultiMaterialBuilder(THREE, materials);

  // 4 huge central multi-bay timber falsework towers (`échafaudages centraux de 50m`, Photos 23, 51, 14, 49)
  // centered on the 4 perimeter facades `(0, ±33.5m)` & `(±33.5m, 0)` supporting the `Grande Poutre` soffit
  // at `Y = 50.30m` and the decorative arch centering (`cintres des arcs`, crown intrados at `Y = 39.40m`).
  const facades = [
    { name: 'SE', cx: 0, cz: 33.5, uSpan: [1, 0, 0], uDepth: [0, 0, 1] },
    { name: 'NW', cx: 0, cz: -33.5, uSpan: [-1, 0, 0], uDepth: [0, 0, -1] },
    { name: 'NE', cx: 33.5, cz: 0, uSpan: [0, 0, 1], uDepth: [1, 0, 0] },
    { name: 'SW', cx: -33.5, cz: 0, uSpan: [0, 0, -1], uDepth: [-1, 0, 0] },
  ];

  const yBase = 0.0;
  const yMainCap = 42.45; // Lower cap & sandboxes directly under `Poutre de l'Arc` soffit (+43.33m, Photo 51!)
  const yUpperCap = 49.35; // Upper flared trestle cap + sandboxes cleanly under `Grande Poutre` soffit (+50.33m!)
  const nTiers = 7;

  for (const fac of facades) {
    function ptAt(tY, uNorm, vNorm) {
      const halfW = lerp(8.20, 7.66, tY);
      const halfD = lerp(3.80, 3.44, tY);
      const y = lerp(yBase, yMainCap, tY);
      return [
        fac.cx + fac.uSpan[0] * (uNorm * halfW) + fac.uDepth[0] * (vNorm * halfD),
        y,
        fac.cz + fac.uSpan[2] * (uNorm * halfW) + fac.uDepth[2] * (vNorm * halfD),
      ];
    }
    function fWorld(uM, yM, dM) {
      return [
        fac.cx + fac.uSpan[0] * uM + fac.uDepth[0] * dM,
        yM,
        fac.cz + fac.uSpan[2] * uM + fac.uDepth[2] * dM,
      ];
    }

    const uCols = [-1.0, -0.34, 0.34, 1.0]; // 3 bays wide along facade (matches Photo 23 & Photo 51!)
    const vCols = [-1.0, 0.0, 1.0];         // 2 bays deep across facade girder + inner arch plane

    // Timber sole grillage sleepers at ground
    for (const u of uCols) {
      mmb.addStrut('timberFalsework', ptAt(0.004, u, -1.12), ptAt(0.004, u, 1.12), 0.36, 0.32, [0, 1, 0]);
    }

    // 12 continuous battered squared-timber vertical columns (`3 x 4` grid, 0 -> 42.45m)
    for (const u of uCols) {
      for (const v of vCols) {
        const wPost = Math.abs(u) === 1.0 && Math.abs(v) === 1.0 ? 0.32 : 0.26;
        for (let k = 0; k < nTiers; k++) {
          mmb.addStrut('timberFalsework', ptAt(k / nTiers, u, v), ptAt((k + 1) / nTiers, u, v), wPost, wPost, [0, 1, 0]);
        }
      }
    }

    // 7 tiers of horizontal ledgers (`moises`) + full St. Andrew's X-bracing across all bays!
    for (let k = 0; k <= nTiers; k++) {
      const t = k / nTiers;
      if (k > 0) {
        for (const v of vCols) {
          mmb.addStrut('timberFalsework', ptAt(t, -1.04, v), ptAt(t, 1.04, v), 0.20, 0.24, [0, 1, 0]);
        }
        for (const u of uCols) {
          mmb.addStrut('timberFalsework', ptAt(t, u, -1.04), ptAt(t, u, 1.04), 0.20, 0.24, [0, 1, 0]);
        }
      }

      if (k < nTiers) {
        const tNext = (k + 1) / nTiers;
        for (const v of [-1.0, 1.0]) {
          for (let b = 0; b < uCols.length - 1; b++) {
            const uA = uCols[b];
            const uB = uCols[b + 1];
            mmb.addStrut('timberFalsework', ptAt(t, uA, v), ptAt(tNext, uB, v), 0.15, 0.16, [0, 1, 0]);
            mmb.addStrut('timberFalsework', ptAt(t, uB, v), ptAt(tNext, uA, v), 0.15, 0.16, [0, 1, 0]);
          }
        }
        for (const u of uCols) {
          for (let b = 0; b < vCols.length - 1; b++) {
            const vA = vCols[b];
            const vB = vCols[b + 1];
            mmb.addStrut('timberFalsework', ptAt(t, u, vA), ptAt(tNext, u, vB), 0.14, 0.15, [0, 1, 0]);
            mmb.addStrut('timberFalsework', ptAt(t, u, vB), ptAt(tNext, u, vA), 0.14, 0.15, [0, 1, 0]);
          }
        }
      }
    }

    // Lower `Boîtes à sable` at Y = 42.55..43.31m supporting `Poutre de l'Arc` bottom chord (+43.33m, Photo 51!)
    for (const u of uCols) {
      const sbLow = ptAt(1.0, u, 1.0);
      mmb.addFlangedCylinder('ironCast', [sbLow[0], yMainCap + 0.10, sbLow[2]], [sbLow[0], 43.31, sbLow[2]], 0.26, 0.65, 10);
    }

    // Curved Timber Arch-Centering Ribs (`Cintre en charpente de l'arc décoratif`, Y = 36.75..37.55m <= 38.6m):
    // Framed strictly inside the central tower bents (`x in [-7.66..+7.66m]`) with vertical & raking fan struts
    // at EVERY node `a = 0..nArcSegs` down to Tier 5 (`Y = 30.3m`) so zero sticks float in mid-air at `step = 3.55`!
    for (const vArch of [-1.0, 1.0]) {
      const nArcSegs = 6;
      const dOff = vArch * 3.44;
      for (let a = 0; a <= nArcSegs; a++) {
        const xA = lerp(-7.66, 7.66, a / nArcSegs);
        const yA = 0.10 + Math.sqrt(37.75 * 37.75 - xA * xA) - 0.30; // <= 37.55m <= 38.6m!
        const pArcA = fWorld(xA, yA, dOff);
        const pFoot = ptAt(5 / nTiers, clamp(xA / 7.80, -1.0, 1.0), vArch);
        mmb.addStrut('timberFalsework', pFoot, pArcA, 0.17, 0.18, [0, 1, 0]);
        if (a < nArcSegs) {
          const xB = lerp(-7.66, 7.66, (a + 1) / nArcSegs);
          const yB = 0.10 + Math.sqrt(37.75 * 37.75 - xB * xB) - 0.30;
          const pArcB = fWorld(xB, yB, dOff);
          mmb.addStrut('timberFalsework', pArcA, pArcB, 0.22, 0.28, [0, 1, 0]);
        }
      }
    }

    // Upper Open-Framed Flared Trestle Stage (`Y = 42.45m -> 49.35m`, Photo 51 `14 JANVIER 88 N° 29`!):
    // Replaces oversized solid tan cap block with fanning timber `contrefiches`, open cap sills (`chevêtres`),
    // open 2-rail working catwalk (`Y = 49.10..50.06m < 50.33m`), and `boîtes à sable` cylinders (`49.45..50.31m <= 50.33m`)!
    for (const v of vCols) {
      const dV = v * 3.38;
      // Vertical continuation posts & bay X-bracing (`42.45 -> 49.35m`)
      for (const u of uCols) {
        const pBot = ptAt(1.0, u, v);
        const pTop = fWorld(u * 7.60, yUpperCap, dV);
        mmb.addStrut('timberFalsework', pBot, pTop, 0.24, 0.24, [0, 1, 0]);
      }
      for (let b = 0; b < uCols.length - 1; b++) {
        const p00 = ptAt(1.0, uCols[b], v);
        const p10 = ptAt(1.0, uCols[b + 1], v);
        const p01 = fWorld(uCols[b] * 7.60, yUpperCap, dV);
        const p11 = fWorld(uCols[b + 1] * 7.60, yUpperCap, dV);
        mmb.addStrut('timberFalsework', p00, p11, 0.14, 0.15, [0, 1, 0]);
        mmb.addStrut('timberFalsework', p10, p01, 0.14, 0.15, [0, 1, 0]);
      }
      // Flared raking `contrefiches` fanning outward to `±9.85m` & inward fans (exact Photo 51 upper trestle!)
      for (const sgn of [-1, 1]) {
        const pCluster = ptAt(1.0, sgn * 1.0, v);
        for (const uFlare of [sgn * 8.75, sgn * 9.85, sgn * 6.35]) {
          mmb.addStrut('timberFalsework', pCluster, fWorld(uFlare, yUpperCap, dV), 0.19, 0.21, [0, 1, 0]);
        }
        const pInnerCluster = ptAt(1.0, sgn * 0.34, v);
        mmb.addStrut('timberFalsework', pInnerCluster, fWorld(sgn * 4.45, yUpperCap, dV), 0.17, 0.19, [0, 1, 0]);
        mmb.addStrut('timberFalsework', pInnerCluster, fWorld(sgn * 0.85, yUpperCap, dV), 0.17, 0.19, [0, 1, 0]);
      }
      // Open longitudinal cap sill (`chevêtre`, `-9.95m .. +9.95m`) at `Y = 49.35m`
      mmb.addStrut('timberFalsework', fWorld(-9.95, yUpperCap, dV), fWorld(9.95, yUpperCap, dV), 0.26, 0.30, [0, 1, 0]);
    }
    // Transverse cap cross-sills linking the 3 bents at `Y = 49.35m`
    for (const uCross of [-9.85, -7.60, -2.58, 2.58, 7.60, 9.85]) {
      mmb.addStrut('timberFalsework', fWorld(uCross, yUpperCap, -3.55), fWorld(uCross, yUpperCap, 3.55), 0.22, 0.26, [0, 1, 0]);
    }

    // Thin planked working catwalk (`Y = 49.10m`) + open 2-rail timber posts & handrails (`Y <= 50.08m < 50.33m`!)
    const yaw = fac.uSpan[0] !== 0 ? 0 : Math.PI * 0.5;
    for (const dWalk of [-3.65, 3.65]) {
      const wCenter = fWorld(0, 49.10, dWalk);
      mmb.addBox('timberFalsework', wCenter, [20.2, 0.10, 0.92], yaw);
      const dRail = dWalk + Math.sign(dWalk) * 0.42;
      for (let p = -6; p <= 6; p++) {
        const uP = (p / 6) * 9.95;
        mmb.addStrut('timberFalsework', fWorld(uP, 49.10, dRail), fWorld(uP, 50.08, dRail), 0.075, 0.075, [0, 1, 0]);
      }
      for (const yRail of [49.58, 50.05]) {
        mmb.addStrut('timberFalsework', fWorld(-9.95, yRail, dRail), fWorld(9.95, yRail, dRail), 0.06, 0.07, [0, 1, 0]);
      }
    }

    // 10 Flanged Cast-Iron Sand-Box (`Boîte à sable`) Jacking Cylinders (`Y = 49.48 -> 50.31m <= 50.33m`)!
    for (const uSb of [-9.65, -7.60, -2.58, 2.58, 7.60, 9.65]) {
      for (const dSb of [-3.30, 0.46]) { // `dSb = +0.46m` -> `w = 33.96m` directly under Grande Poutre exterior chord!
        const pSb0 = fWorld(uSb, yUpperCap + 0.12, dSb);
        const pSb1 = fWorld(uSb, 50.31, dSb);
        mmb.addFlangedCylinder('ironCast', pSb0, pSb1, 0.27, 0.55, 10);
      }
    }
  }

  return mmb.buildGroup('phase3_central_facade_falsework_towers');
}

function buildPhase4Stage2TemporaryTieBeams(THREE, materials) {
  const mmb = new MultiMaterialBuilder(THREE, materials);

  // Photo 14 (`step 4.85`, 12 Jun 1888): Slim horizontal tie-beams (`0.28m x 0.32m`, ZERO X-lacing across
  // the open central sky gap!) spanning between converging Stage-2 piers at `Y = 95.15m` (`Panneau 9` working stage)
  // and `Y = 103.85m` (flush just below the `104.65m` pier crowns), with short raking knee-braces ONLY within
  // `1.8m` of the inner pier chords + slim timber riveting plank platforms wrapping the 4 piers at `95.15m`!
  const levels = [
    { y: 95.15, halfSpan: 10.6, xi: 9.07, xo: 20.22, planeOff: 20.3, hasPierStage: true },
    { y: 103.85, halfSpan: 8.8, xi: 7.62, xo: 17.85, planeOff: 18.2, hasPierStage: false },
  ];

  for (const lv of levels) {
    const facades = [
      { pA: [-lv.halfSpan, lv.y, lv.planeOff], pB: [lv.halfSpan, lv.y, lv.planeOff], axisX: true },
      { pA: [-lv.halfSpan, lv.y, -lv.planeOff], pB: [lv.halfSpan, lv.y, -lv.planeOff], axisX: true },
      { pA: [lv.planeOff, lv.y, -lv.halfSpan], pB: [lv.planeOff, lv.y, lv.halfSpan], axisX: false },
      { pA: [-lv.planeOff, lv.y, -lv.halfSpan], pB: [-lv.planeOff, lv.y, lv.halfSpan], axisX: false },
    ];
    for (const { pA, pB, axisX } of facades) {
      // Slim horizontal iron tie-beam across [-xi, +xi] + narrow plank walk (ZERO X-lacing across open sky!)
      mmb.addStrut('ironPrimary', pA, pB, 0.28, 0.32, [0, 1, 0]);
      mmb.addStrut('timberFalsework', [pA[0], lv.y + 0.19, pA[2]], [pB[0], lv.y + 0.19, pB[2]], 0.32, 0.06, [0, 1, 0]);
      // Short raking knee-braces ONLY within 1.8m of the inner pier chords (`±lv.xi`)
      for (const sEnd of [-1, 1]) {
        const uChord = sEnd * lv.xi;
        const uBrace = sEnd * (lv.xi - 1.65);
        const kFoot = axisX ? [uChord, lv.y - 1.25, pA[2]] : [pA[0], lv.y - 1.25, uChord];
        const kHead = axisX ? [uBrace, lv.y - 0.14, pA[2]] : [pA[0], lv.y - 0.14, uBrace];
        mmb.addStrut('ironLattice', kFoot, kHead, 0.11, 0.12, [0, 1, 0]);
      }
    }

    // Slim timber riveting plank platforms wrapping the 4 Stage-2 piers at `Y = 95.15m` (`Photo 14`)
    if (lv.hasPierStage) {
      const cIn = lv.xi - 0.55;
      const cOut = lv.xo + 0.68;
      for (const pier of PIERS) {
        const xIn = pier.sx * cIn;
        const xOut = pier.sx * cOut;
        const zIn = pier.sz * cIn;
        const zOut = pier.sz * cOut;
        const pCorners = [
          [xIn, lv.y, zIn],
          [xOut, lv.y, zIn],
          [xOut, lv.y, zOut],
          [xIn, lv.y, zOut],
        ];
        for (let c = 0; c < 4; c++) {
          const cA = pCorners[c];
          const cB = pCorners[(c + 1) % 4];
          mmb.addStrut('timberFalsework', cA, cB, 0.48, 0.12, [0, 1, 0]);
          mmb.addStrut('timberFalsework', [cA[0], lv.y + 0.88, cA[2]], [cB[0], lv.y + 0.88, cB[2]], 0.05, 0.06, [0, 1, 0]);
          mmb.addStrut('timberFalsework', cA, [cA[0], lv.y + 0.90, cA[2]], 0.06, 0.06, [1, 0, 0]);
        }
      }
    }
  }

  return mmb.buildGroup('phase4_stage2_temporary_tie_beams');
}

function createPierCreeperCraneRig(THREE, materials, pier) {
  // Authentic Guyenet & Eiffel 4-tonne pivoting climbing crane (`grue pivotante grimpante`, 12 tonnes weight,
  // 12.0m radius lattice jib boom `volée`) that climbs the permanent elevator track girders (`poutres de roulement`)
  // in Phases 2, 3, and 4 (`Photos 23, 51, 14`)!
  // Outer `wrapper` stays at [0,0,0] for `app.js` visibility transitions; inner `carriage` moves & slews!
  const wrapper = new THREE.Group();
  wrapper.name = `creeper_crane_wrapper_${pier.id}`;

  const carriage = new THREE.Group();
  carriage.name = `creeper_crane_carriage_${pier.id}`;
  wrapper.add(carriage);

  const uPerpV = new THREE.Vector3(pier.sz * INV_SQRT2, 0, -pier.sx * INV_SQRT2);
  const uUpV = new THREE.Vector3(0, 1, 0);
  const uRadV = new THREE.Vector3(pier.sx * INV_SQRT2, 0, pier.sz * INV_SQRT2);
  carriage.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(uPerpV, uUpV, uRadV));

  // 1. Inclined Track Sleeper Shoe (`Châssis-traîneau` wedged onto elevator track girders) + Horizontal Working Stage
  const baseMmb = new MultiMaterialBuilder(THREE, materials);
  // Triangular leveling frame (`châssis triangulaire`, local +Z = outward down-slope, -Z = inward up-slope)
  for (const sx of [-1.18, 1.18]) {
    baseMmb.addStrut('craneSteel', [sx, -2.2, 2.2], [sx, 1.4, -2.0], 0.18, 0.28, [1, 0, 0]);
    baseMmb.addStrut('craneSteel', [sx, 0.0, -2.2], [sx, 0.0, 2.5], 0.18, 0.24, [1, 0, 0]);
    baseMmb.addStrut('craneSteel', [sx, -2.2, 2.2], [sx, 0.0, 2.5], 0.16, 0.20, [1, 0, 0]);
    // Lower central lead-screw jack (`vis centrale de relevage`) used to hitch the crane up the track!
    baseMmb.addCylinder('craneSteel', [sx * 0.45, -2.6, 2.6], [sx * 0.45, -0.8, 1.1], 0.065, 0.065, 8);
  }
  // Horizontal timber operator & riveter working platform (`4.8m x 4.6m`) + handrails + portable coal rivet forge!
  baseMmb.addBox('timberFalsework', [0, 0.12, 0.15], [4.8, 0.16, 4.6]);
  for (const sx of [-2.32, 2.32]) {
    baseMmb.addBox('timberFalsework', [sx, 0.65, 0.15], [0.07, 0.96, 4.6]);
  }
  for (const sz of [-2.08, 2.38]) {
    baseMmb.addBox('timberFalsework', [0, 0.65, sz], [4.8, 0.96, 0.07]);
  }
  // Portable cast-iron coal rivet forge (`forge portative`) & glowing brazier pan on deck corner
  baseMmb.addCylinder('ironCast', [1.65, 0.20, 1.55], [1.65, 0.95, 1.55], 0.34, 0.38, 8);
  baseMmb.addCylinder('copperDome', [1.65, 0.95, 1.55], [1.65, 1.08, 1.55], 0.32, 0.32, 8);

  // Fixed vertical cast-steel pivot kingpost (`pivot central`, Y = 0..4.2m)
  baseMmb.addFlangedCylinder('craneSteel', [0, -0.35, 0], [0, 4.35, 0], 0.24, 1.4, 10);
  baseMmb.addCylinder('ironCast', [0, 0.18, 0], [0, 0.58, 0], 0.95, 1.05, 12); // Roller slewing ring (`couronne de galets`)
  carriage.add(baseMmb.buildGroup(`creeper_base_${pier.id}`));

  // 2. 360°-Pivoting Superstructure (`slewGroup`: Twin Lattice Jib `Volée`, Backstays, Winch & Counterweight)
  const slewGroup = new THREE.Group();
  slewGroup.name = `creeper_slew_${pier.id}`;
  carriage.add(slewGroup);

  const slewMmb = new MultiMaterialBuilder(THREE, materials);
  // Revolving mast sleeve (`fût tournant`) & twin geared hand/steam winch drums
  slewMmb.addCylinder('craneSteel', [0, 0.58, 0], [0, 4.65, 0], 0.32, 0.28, 10);
  slewMmb.addBox('ironCast', [0, 1.35, -0.95], [1.35, 1.10, 1.45]);
  for (const sx of [-0.78, 0.78]) {
    slewMmb.addSpokedSheave('ironCast', [sx, 1.45, -0.85], [1, 0, 0], 0.52, 0.10, 6);
  }
  // Tail counterweight frame & cast-iron ballast box (`contrepoids`, local -Z = tail whenlocal +Z = boom direction)
  for (const sx of [-0.55, 0.55]) {
    slewMmb.addStrut('craneSteel', [sx, 0.75, 0], [sx, 1.15, -3.45], 0.14, 0.20, [1, 0, 0]);
    slewMmb.addCylinder('craneSteel', [sx * 0.6, 4.45, 0], [sx, 1.25, -3.35], 0.04, 0.04, 6);
  }
  slewMmb.addBox('ironCast', [0, 1.35, -3.15], [1.65, 0.95, 1.25]);

  // 15.0m Lattice Iron Jib Boom (`Volée en treillis`, rising to +13.3m above carriage deck at ~7.25m inward reach,
  // matching the exact silhouette & lateral station of the 4 pier booms in `Photo 14`!)
  const jibFootY = 1.05;
  const jibTip = [0, 13.30, 7.25];
  const nJibBays = 9;
  for (let i = 0; i < nJibBays; i++) {
    const t0 = i / nJibBays;
    const t1 = (i + 1) / nJibBays;
    const halfW0 = lerp(0.54, 0.20, t0);
    const halfW1 = lerp(0.54, 0.20, t1);
    const halfH0 = lerp(0.32, 0.16, t0);
    const halfH1 = lerp(0.32, 0.16, t1);
    const c0 = [0, lerp(jibFootY, jibTip[1], t0), lerp(0.35, jibTip[2], t0)];
    const c1 = [0, lerp(jibFootY, jibTip[1], t1), lerp(0.35, jibTip[2], t1)];

    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const a = [sx * halfW0, c0[1] + sy * halfH0, c0[2]];
        const b = [sx * halfW1, c1[1] + sy * halfH1, c1[2]];
        slewMmb.addStrut('craneSteel', a, b, 0.075, 0.075, [1, 0, 0]);
      }
      // Side lattice diagonals
      slewMmb.addStrut(
        'ironLattice',
        [sx * halfW0, c0[1] - halfH0, c0[2]],
        [sx * halfW1, c1[1] + halfH1, c1[2]],
        0.04,
        0.04,
        [1, 0, 0]
      );
      slewMmb.addStrut(
        'ironLattice',
        [sx * halfW0, c0[1] + halfH0, c0[2]],
        [sx * halfW1, c1[1] - halfH1, c1[2]],
        0.04,
        0.04,
        [1, 0, 0]
      );
    }
    // Top & bottom cross-ties
    slewMmb.addStrut('ironLattice', [-halfW1, c1[1] + halfH1, c1[2]], [halfW1, c1[1] + halfH1, c1[2]], 0.045, 0.045, [0, 1, 0]);
  }

  // Twin tension tie-rods (`tirants de retenue`) from masthead (`Y=4.55m`) out to jib head & mid-boom strut
  for (const sx of [-0.22, 0.22]) {
    slewMmb.addCylinder('craneSteel', [sx, 4.55, 0], [sx, jibTip[1], jibTip[2]], 0.042, 0.042, 6);
    slewMmb.addCylinder('craneSteel', [sx, 4.55, 0], [sx * 1.6, lerp(jibFootY, jibTip[1], 0.58), lerp(0.35, jibTip[2], 0.58)], 0.036, 0.036, 6);
  }
  // Jib-head cast-iron sheave pulley, vertical steel hoist chain/cable & weighted hook block (`moufle à crochet`)
  slewMmb.addSpokedSheave('ironCast', jibTip, [1, 0, 0], 0.44, 0.11, 6);
  const hookDropPt = [0, jibTip[1] - 6.8, jibTip[2]];
  slewMmb.addCylinder('craneSteel', jibTip, hookDropPt, 0.026, 0.026, 6);
  slewMmb.addSpokedSheave('ironCast', hookDropPt, [1, 0, 0], 0.28, 0.12, 6);
  slewMmb.addBox('ironCast', [0, hookDropPt[1] - 0.32, jibTip[2]], [0.34, 0.42, 0.26]);

  slewGroup.add(slewMmb.buildGroup(`creeper_slew_mesh_${pier.id}`));

  function setClimbState(yTrack, slewAngleRad) {
    const r = trackRadiusAtY(yTrack);
    const pos = pierWorldPos(pier, yTrack, r + 2.15, 0);
    carriage.position.set(pos[0], pos[1], pos[2]);
    slewGroup.rotation.y = slewAngleRad;
  }

  return { wrapper, setClimbState };
}

function createUpperShaftClimbingCranesRig(THREE, materials) {
  // Phases 5–7 (`step 5.79` Photo 01 -> `step 6.85` Photo 46 -> `step 7.85`):
  //   - Pre-merger (`step <= 5.82`, Photo 01 1888-09-14): Two climbing crane vertical lattice masts/frames
  //     riding the outer left/right pier flanks of P14 (`+137.85 -> +152.2m <= +152.3m`), with wide cantilevered
  //     wooden riveting stage at `Y = +137.53m` (`P13/P14`) and lower riveting walkway at `Y = +127.23m` (`P12/P13`).
  //   - Post-merger (`step >= 6.20`, Photo 46 1888-12-26): Smoothly tracking inward onto the central Édoux guide
  //     columns (`Poteau A` & `Poteaux B`) with twin V-booms crowning the rising shaft!
  const wrapper = new THREE.Group();
  wrapper.name = 'upper_shaft_climbing_cranes_wrapper';

  const rig = new THREE.Group();
  rig.name = 'upper_shaft_climbing_rig';
  wrapper.add(rig);

  // Align local +Z along the Pile1->Pile3 diagonal (`uDiagNS`) and local +X along `uDiagEW`
  const uDiagEW = new THREE.Vector3(INV_SQRT2, 0, INV_SQRT2);
  const uUpV = new THREE.Vector3(0, 1, 0);
  const uDiagNS = new THREE.Vector3(-INV_SQRT2, 0, INV_SQRT2);
  rig.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(uDiagEW, uUpV, uDiagNS));

  // Central climbing collar riding `Poteaux B` & `Poteau A` (`135.45..142.45m <= 144.80m` at `step 5.79`)
  const collarMmb = new MultiMaterialBuilder(THREE, materials);
  for (const sx of [-0.85, 0.85]) {
    collarMmb.addStrut('craneSteel', [sx, -2.4, -4.35], [sx, -2.4, 4.35], 0.22, 0.36, [1, 0, 0]);
    collarMmb.addStrut('craneSteel', [sx, 0.0, -4.35], [sx, 0.0, 4.35], 0.24, 0.42, [1, 0, 0]);
    for (const sz of [-4.15, 0.0, 4.15]) {
      collarMmb.addStrut('craneSteel', [sx, -2.4, sz], [sx, 0.2, sz], 0.20, 0.22, [1, 0, 0]);
    }
  }
  for (const sz of [-2.15, 2.15]) {
    collarMmb.addFlangedCylinder('craneSteel', [0, -0.3, sz], [0, 4.6, sz], 0.24, 1.4, 10);
    collarMmb.addCylinder('ironCast', [0, 0.15, sz], [0, 0.55, sz], 0.88, 0.96, 12);
  }
  rig.add(collarMmb.buildGroup('upper_shaft_collar'));

  // Dynamic tapering cantilevered riveting plank stages (`stageDecks[0]` & `stageDecks[1]`, scale X/Z independently!)
  const stageDecks = [];
  for (const [idxStage, yRel] of [[0, 0.0], [1, 0.0]]) {
    const subGroup = new THREE.Group();
    subGroup.name = `upper_shaft_riveting_stage_${idxStage}`;
    rig.add(subGroup);
    const stageMmb = new MultiMaterialBuilder(THREE, materials);
    const sqCorners = [
      [0, yRel, -SQRT2], // +X, -Z (Pile 1 corner)
      [SQRT2, yRel, 0],  // +X, +Z (Pile 2 corner)
      [0, yRel, SQRT2],  // -X, +Z (Pile 3 corner)
      [-SQRT2, yRel, 0], // -X, -Z (Pile 4 corner)
    ];
    for (let c = 0; c < 4; c++) {
      const pA = sqCorners[c];
      const pB = sqCorners[(c + 1) % 4];
      stageMmb.addStrut('timberFalsework', pA, pB, 0.11, 0.16, [0, 1, 0]);
      const pInA = [pA[0] * 0.91, yRel - 0.02, pA[2] * 0.91];
      const pInB = [pB[0] * 0.91, yRel - 0.02, pB[2] * 0.91];
      stageMmb.addStrut('timberFalsework', pInA, pInB, 0.07, 0.14, [0, 1, 0]);
      const gA = [pA[0] * 1.025, yRel + 0.94, pA[2] * 1.025];
      const gB = [pB[0] * 1.025, yRel + 0.94, pB[2] * 1.025];
      const mA = [pA[0] * 1.025, yRel + 0.47, pA[2] * 1.025];
      const mB = [pB[0] * 1.025, yRel + 0.47, pB[2] * 1.025];
      stageMmb.addStrut('timberFalsework', gA, gB, 0.009, 0.065, [0, 1, 0]);
      stageMmb.addStrut('timberFalsework', mA, mB, 0.007, 0.050, [0, 1, 0]);
      for (let p = 0; p < 6; p++) {
        const tp = p / 6;
        const px = lerp(pA[0], pB[0], tp) * 1.025;
        const pz = lerp(pA[2], pB[2], tp) * 1.025;
        stageMmb.addStrut('timberFalsework', [px, yRel, pz], [px, yRel + 0.97, pz], 0.008, 0.008, [1, 0, 0]);
      }
      for (const tk of [0.0, 0.33, 0.67]) {
        const kx = lerp(pA[0], pB[0], tk);
        const kz = lerp(pA[2], pB[2], tk);
        stageMmb.addStrut('ironLattice', [kx, yRel - 0.05, kz], [kx * 0.82, yRel - 1.55, kz * 0.82], 0.011, 0.075, [0, 1, 0]);
      }
    }
    subGroup.add(stageMmb.buildGroup(`upper_shaft_stage_deck_${idxStage}`));
    stageDecks.push(subGroup);
  }

  // Two climbing crane units (`idx = -1` right/+X flank -> central N pivot; `idx = +1` left/-X flank -> central S pivot)
  const slewArms = [];
  const boomBaseLen = Math.hypot(12.60, 7.90); // 14.871m -> exact [0, 13.60, 8.20] tip at Photo 46!
  const boomPhoto46Pitch = Math.atan2(7.90, 12.60);
  for (const [idx, zPivot] of [[-1, -2.15], [1, 2.15]]) {
    const arm = new THREE.Group();
    arm.position.set(0, 0, zPivot);
    rig.add(arm);

    const baseMmb = new MultiMaterialBuilder(THREE, materials);
    baseMmb.addCylinder('craneSteel', [0, 0.15, 0], [0, 4.85, 0], 0.30, 0.26, 10);
    baseMmb.addBox('ironCast', [0, 1.35, -0.85], [1.25, 1.05, 1.30]);
    baseMmb.addBox('ironCast', [0, 1.30, -2.55], [1.45, 0.85, 1.05]);
    for (const sx of [-0.48, 0.48]) {
      baseMmb.addStrut('craneSteel', [sx, 0.25, -1.65], [sx, 0.25, 1.35], 0.14, 0.22, [1, 0, 0]);
      baseMmb.addStrut('craneSteel', [sx, 0.8, 0], [sx, 1.2, -2.7], 0.12, 0.18, [1, 0, 0]);
      baseMmb.addCylinder('craneSteel', [sx * 0.5, 4.65, 0], [sx, 1.25, -2.6], 0.038, 0.038, 6);
    }
    arm.add(baseMmb.buildGroup(`upper_crane_base_${idx > 0 ? 'S' : 'N'}`));

    // Luffing lattice mast/jib (`boomPivot` at [0, 1.00, 0.30]: vertical flank mast at Photo 01, V-boom at Photo 46!)
    const boomPivot = new THREE.Group();
    boomPivot.position.set(0, 1.00, 0.30);
    arm.add(boomPivot);

    const boomMmb = new MultiMaterialBuilder(THREE, materials);
    const nBays = 9;
    for (let i = 0; i < nBays; i++) {
      const t0 = i / nBays;
      const t1 = (i + 1) / nBays;
      const hw0 = lerp(0.52, 0.20, t0);
      const hw1 = lerp(0.52, 0.20, t1);
      const hh0 = lerp(0.30, 0.16, t0);
      const hh1 = lerp(0.30, 0.16, t1);
      const y0 = t0 * boomBaseLen;
      const y1 = t1 * boomBaseLen;
      for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
          boomMmb.addStrut('craneSteel', [sx * hw0, y0, sy * hh0], [sx * hw1, y1, sy * hh1], 0.072, 0.072, [1, 0, 0]);
        }
        boomMmb.addStrut('ironLattice', [sx * hw0, y0, -hh0], [sx * hw1, y1, hh1], 0.040, 0.040, [1, 0, 0]);
        boomMmb.addStrut('ironLattice', [sx * hw0, y0, hh0], [sx * hw1, y1, -hh1], 0.040, 0.040, [1, 0, 0]);
      }
      boomMmb.addStrut('ironLattice', [-hw1, y1, hh1], [hw1, y1, hh1], 0.042, 0.042, [0, 0, 1]);
      boomMmb.addStrut('ironLattice', [-hw1, y1, -hh1], [hw1, y1, -hh1], 0.042, 0.042, [0, 0, 1]);
    }
    // Upper bolting cross-bar near mast crown (visible on outer flank masts in Photo 01!) + head sheave (`R = 0.21m`)
    boomMmb.addStrut('timberFalsework', [-1.15, boomBaseLen * 0.78, 0], [1.15, boomBaseLen * 0.78, 0], 0.10, 0.12, [0, 0, 1]);
    boomMmb.addSpokedSheave('ironCast', [0, boomBaseLen, 0], [1, 0, 0], 0.42, 0.10, 6);
    for (const sx of [-0.20, 0.20]) {
      boomMmb.addCylinder('craneSteel', [sx, 3.40, -0.35], [sx, boomBaseLen, 0], 0.038, 0.038, 6);
    }
    boomPivot.add(boomMmb.buildGroup(`upper_crane_boom_${idx > 0 ? 'S' : 'N'}`));

    // Plumb-hanging hoist cable & hook block suspended from boom head
    const hoistPivot = new THREE.Group();
    hoistPivot.position.set(0, boomBaseLen, 0);
    boomPivot.add(hoistPivot);
    const hoistMmb = new MultiMaterialBuilder(THREE, materials);
    hoistMmb.addCylinder('craneSteel', [0, 0, 0], [0, -7.2, 0], 0.026, 0.026, 6);
    hoistMmb.addSpokedSheave('ironCast', [0, -7.2, 0], [1, 0, 0], 0.28, 0.10, 6);
    hoistPivot.add(hoistMmb.buildGroup(`upper_crane_hoist_${idx > 0 ? 'S' : 'N'}`));

    // Pre-merger outer pier-flank local coordinates in `rig` space:
    //   idx = -1 -> Pile 2 outer flank (+13.65, 0, +13.45) -> exact Photo 01 right vertical mast silhouette!
    //   idx = +1 -> Pile 3 outer flank (-13.65, 0, +13.45) -> exact Photo 01 left vertical mast silhouette!
    const flankLx = idx < 0 ? (13.65 + 13.45) * INV_SQRT2 : (-13.65 + 13.45) * INV_SQRT2;
    const flankLz = idx < 0 ? (-13.65 + 13.45) * INV_SQRT2 : (13.65 + 13.45) * INV_SQRT2;
    slewArms.push({ arm, boomPivot, hoistPivot, baseSign: idx, zPivot, flankLx, flankLz });
  }

  function setUpperClimbState(yBase, slewDeltaRad = 0.0) {
    rig.position.set(0, yBase, 0);
    // Smoothly transition from Photo 01 (`step 5.79`, `yBase = 137.85m`: stages at `+137.53m` P13/P14 & `+127.23m` P12/P13,
    // outer pier-flank vertical lattice masts `+137.85 -> +152.20m <= +152.30m`) to Photo 46 (`step 6.85`, `yBase = 245.80m`)!
    const tPost = smoothstep01((yBase - 148.0) / 32.0);
    const d0 = lerp(-0.32, -17.20, tPost);
    const d1 = lerp(-10.62, -22.60, tPost);
    const cant0 = lerp(2.82, 0.25, tPost);
    const cant1 = lerp(0.72, 0.25, tPost);
    for (const [stGroup, dy, cant] of [[stageDecks[0], d0, cant0], [stageDecks[1], d1, cant1]]) {
      stGroup.position.set(0, dy, 0);
      const hs = upperShaftHalfSpanAtY(yBase + dy) + cant;
      stGroup.scale.set(hs, 1.0, hs);
    }

    const luffPitch = lerp(-0.055, boomPhoto46Pitch, tPost);
    const boomScaleY = lerp(0.874, 1.000, tPost); // At yBase=137.85m: world max Y = 152.27m <= 152.30m!
    for (const item of slewArms) {
      item.arm.position.set(lerp(item.flankLx, 0.0, tPost), 0.0, lerp(item.flankLz, item.zPivot, tPost));
      const baseYaw = item.baseSign < 0 ? Math.PI * 0.75 : -Math.PI * 0.25;
      item.arm.rotation.y = baseYaw - item.baseSign * slewDeltaRad * tPost;
      item.boomPivot.rotation.x = luffPitch;
      item.boomPivot.scale.set(1.0, boomScaleY, 1.0);
      item.hoistPivot.rotation.x = -luffPitch;
      item.hoistPivot.scale.set(1.0, 1.0 / boomScaleY, 1.0);
    }
  }

  return { wrapper, setUpperClimbState };
}

// ============================================================================
// Geometry Statistics Helper
// ============================================================================
function countStats(root) {
  let meshCount = 0;
  let vertexCount = 0;
  let triangleCount = 0;
  root.traverse((obj) => {
    if (obj.isMesh && obj.geometry) {
      meshCount++;
      const pos = obj.geometry.attributes.position;
      if (pos) vertexCount += pos.count;
      if (obj.geometry.index) {
        triangleCount += Math.floor(obj.geometry.index.count / 3);
      } else if (pos) {
        triangleCount += Math.floor(pos.count / 3);
      }
    }
  });
  return { meshCount, vertexCount, triangleCount };
}

// ============================================================================
// MAIN ZONE 5 MODULE EXPORT (`buildZone(ctx)`)
// ============================================================================
export function buildZone(ctx) {
  const { THREE } = ctx;
  const materials = resolveMaterials(THREE, ctx.materials);

  const group = new THREE.Group();
  group.name = 'zone5_elevators_cranes_falsework';
  const pieces = [];

  function registerPiece({
    id,
    label,
    object3D,
    phase,
    span,
    vanishSpan = null,
    category = 'permanent',
    yMin,
    yMax,
    photoRefs = [],
  }) {
    object3D.name = id;
    group.add(object3D);
    pieces.push({
      id,
      label,
      object3D,
      phase,
      span,
      vanishSpan,
      category,
      yMin,
      yMax,
      photoRefs,
    });
  }

  // --------------------------------------------------------------------------
  // 1. PERMANENT INCLINED ELEVATOR TRACK GIRDERS (`Poutres de roulement`)
  // --------------------------------------------------------------------------
  // Stage 1 Track Girders in all 4 piers (`Piles 1..4`):
  //   - Lower pier run (`-2.50m -> +57.30m`, `span: [2.10, 3.10]`) capped strictly `<= +57.63m` so `Photos 23 & 51`
  //     have zero protruding tracks above the 1st-floor pier crowns!
  //   - Upper 1st-floor landing extension (`+57.30m -> +65.13m / +62.80m`, `span: [4.05, 4.36]`) erected with `Panneau 6`!
  for (const pier of PIERS) {
    const mmb = new MultiMaterialBuilder(THREE, materials);
    const isOtis = pier.system === 'otis';
    buildTrackSegmentOnPier(mmb, pier, -2.50, 57.30, 2.65, {
      includeBaseBoarding: true,
      panelTies: [9.2, 18.8, 28.5, 38.2, 47.9, 56.2],
    });
    registerPiece({
      id: `z5_track_stage1_${pier.id}`,
      label: `${pier.name} — Poutres de roulement d'ascenseur & embarcadères (-2.5m à +57.3m)`,
      object3D: mmb.buildGroup(`z5_track_stage1_${pier.id}`),
      phase: 2,
      span: [2.10, 3.10],
      vanishSpan: null,
      category: 'permanent',
      yMin: -2.50,
      yMax: 57.60,
      photoRefs: ['photo_23', 'photo_51', 'photo_14', 'photo_28', 'pl08', 'pl69'],
    });

    const mmbUpper = new MultiMaterialBuilder(THREE, materials);
    const yEndUpper = isOtis ? 65.13 : 62.80;
    buildTrackSegmentOnPier(mmbUpper, pier, 57.30, yEndUpper, 2.20, {
      includeBaseBoarding: false,
      panelTies: [61.8],
    });
    registerPiece({
      id: `z5_track_stage1_upper_${pier.id}`,
      label: `${pier.name} — Prolongement des poutres de roulement dans le Panneau 6 (57.3m–${yEndUpper.toFixed(1)}m)`,
      object3D: mmbUpper.buildGroup(`z5_track_stage1_upper_${pier.id}`),
      phase: 4,
      span: [4.05, 4.36],
      vanishSpan: null,
      category: 'permanent',
      yMin: 57.30,
      yMax: yEndUpper,
      photoRefs: ['photo_14', 'photo_28', 'pl08', 'pl20'],
    });
  }

  // Roux-Combaluzier Arched Upper Headframe (`Châssis supportant les gaines supérieures`) & Inclined Upper Piston Sheaths
  // (`Gaines supérieures`, +57.63m -> +73.25m on `Piles 2 Est & 4 Ouest`, Pl. 20 Fig. 1, Phase 9 `span: [9.05, 9.55]`)
  for (const pier of PIERS.filter((p) => p.system === 'combaluzier')) {
    const mmbCombHead = new MultiMaterialBuilder(THREE, materials);
    buildCombaluzierUpperHeadframeAndSheaths(mmbCombHead, pier);
    registerPiece({
      id: `z5_combaluzier_upper_headframe_${pier.id}`,
      label: `${pier.name} — Châssis arqué & gaines supérieures des pistons articulés Combaluzier (+57.6m à +73.25m)`,
      object3D: mmbCombHead.buildGroup(`z5_combaluzier_upper_headframe_${pier.id}`),
      phase: 9,
      span: [9.05, 9.55],
      vanishSpan: null,
      category: 'permanent',
      yMin: 57.63,
      yMax: 73.25,
      photoRefs: ['photo_18', 'pl20', 'pl04'],
    });
  }

  // Stage 2 Otis Upper Track Girders + C¹ Transition Curve (`65.13m..74.13m`) + Headframes (`+124.2m`)
  // in `Piles 1 & 3` ONLY, split at `88.50m` so Photo 14 (`step 4.85`, 15 May 1888) shows tracks cleanly inside the
  // 89.20m Panneau 8 piers while the upper run & 2nd-floor headframe (`88.50..124.2m`) land with Phase 5 (`[5.05, 5.44]`)!
  for (const pier of PIERS.filter((p) => p.system === 'otis')) {
    const mmbLower = new MultiMaterialBuilder(THREE, materials);
    buildTrackSegmentOnPier(mmbLower, pier, 65.13, 88.50, 2.65, {
      includeOtisHeadframe: false,
      panelTies: [66.2, 75.5, 84.8],
    });
    const uPerp = [pier.sz * INV_SQRT2, 0, -pier.sx * INV_SQRT2];
    const nCwtSeg = 7;
    for (let i = 0; i < nCwtSeg; i++) {
      const ya = lerp(66.0, 88.2, i / nCwtSeg);
      const yb = lerp(66.0, 88.2, (i + 1) / nCwtSeg);
      for (const sOff of [-0.88, 0.88]) {
        mmbLower.addStrut(
          'craneSteel',
          pierWorldPos(pier, ya, trackRadiusAtY(ya) + 1.35, sOff),
          pierWorldPos(pier, yb, trackRadiusAtY(yb) + 1.35, sOff),
          0.08,
          0.12,
          uPerp
        );
      }
    }
    registerPiece({
      id: `z5_track_stage2_otis_${pier.id}`,
      label: `${pier.name} — Poutres de roulement Otis & courbe de raccordement (65m–88.5m)`,
      object3D: mmbLower.buildGroup(`z5_track_stage2_otis_${pier.id}`),
      phase: 4,
      span: [4.10, 4.80],
      vanishSpan: null,
      category: 'permanent',
      yMin: 65.13,
      yMax: 88.50,
      photoRefs: ['photo_14', 'photo_01', 'photo_29', 'pl08', 'pl53'],
    });

    const mmbHead = new MultiMaterialBuilder(THREE, materials);
    const mmbHeadWood = new MultiMaterialBuilder(THREE, materials);
    buildTrackSegmentOnPier(mmbHead, pier, 88.50, 123.60, 2.65, {
      includeOtisHeadframe: true,
      woodBuilder: mmbHeadWood,
      panelTies: [94.2, 103.5, 113.0],
    });
    for (let i = 0; i < 6; i++) {
      const ya = lerp(88.2, 114.0, i / 6);
      const yb = lerp(88.2, 114.0, (i + 1) / 6);
      for (const sOff of [-0.88, 0.88]) {
        mmbHead.addStrut(
          'craneSteel',
          pierWorldPos(pier, ya, trackRadiusAtY(ya) + 1.35, sOff),
          pierWorldPos(pier, yb, trackRadiusAtY(yb) + 1.35, sOff),
          0.08,
          0.12,
          uPerp
        );
      }
    }
    const headGroup = mmbHead.buildGroup(`z5_track_stage2_otis_headframe_${pier.id}`);
    const headWoodGroup = mmbHeadWood.buildGroup(`z5_track_stage2_otis_headframe_wood_${pier.id}`);
    if (headWoodGroup.children.length > 0) {
      headWoodGroup.userData.isWoodDecking = true;
      headWoodGroup.traverse((o) => {
        o.userData.isWoodDecking = true;
      });
      headGroup.add(headWoodGroup);
    }
    registerPiece({
      id: `z5_track_stage2_otis_headframe_${pier.id}`,
      label: `${pier.name} — Chevalement supérieur Otis du 2e Étage, palier & poulies Pou8–14 (88.5m–124.1m)`,
      object3D: headGroup,
      phase: 5,
      span: [5.05, 5.44],
      vanishSpan: null,
      category: 'permanent',
      yMin: 88.50,
      yMax: 124.20,
      photoRefs: ['photo_01', 'photo_32', 'photo_46', 'pl08', 'pl45', 'pl53'],
    });
  }

  // --------------------------------------------------------------------------
  // 2. CENTRAL EDOUX VERTICAL GUIDE FRAME (`Poteau A` & `Poteaux B`)
  //    Erected progressively in 5 bands matching Photo 01 (`step 5.66`, P12 top +127.23m)
  //    and Photo 46 (`step 6.85`, P24 top +228.5m) so climbing cranes ride real ironwork without protruding!
  // --------------------------------------------------------------------------
  const edouxBands = [
    { id: 'z5_edoux_guide_b0_base', label: 'Poteaux-guides Édoux embase P12 (115.7m–127.2m)', y0: 115.73, y1: 127.20, phase: 5, span: [5.50, 5.64], refs: ['photo_01', 'pl08'] },
    { id: 'z5_edoux_guide_b0', label: 'Poteaux-guides Édoux amorce P13–P14 (127.2m–144.8m)', y0: 127.20, y1: 144.80, phase: 6, span: [5.70, 5.84], refs: ['photo_01', 'pl08'] },
    { id: 'z5_edoux_guide_b1', label: 'Poteaux-guides Édoux P14–P15 (144.8m–158.5m)', y0: 144.80, y1: 158.50, phase: 6, span: [5.86, 5.98], refs: ['photo_01', 'pl08'] },
    { id: 'z5_edoux_guide_b2', label: 'Poteaux-guides Édoux P16–P18 (158.5m–195.9m)', y0: 158.50, y1: 195.93, phase: 6, span: [6.02, 6.22], refs: ['photo_46', 'pl08'] },
    { id: 'z5_edoux_guide_b3_lower', label: 'Poteaux-guides Édoux P19–P21 (195.9m–216.05m)', y0: 195.93, y1: 216.05, phase: 6, span: [6.24, 6.49], refs: ['photo_46', 'pl08'] },
    { id: 'z5_edoux_guide_b3_upper', label: 'Poteaux-guides Édoux P22–P25 (216.05m–246.1m)', y0: 216.05, y1: 246.10, phase: 7, span: [6.56, 6.96], refs: ['photo_18', 'pl08'] },
    { id: 'z5_edoux_guide_b4', label: 'Poteaux-guides Édoux P26–3e Étage (246.1m–281.2m)', y0: 246.10, y1: 281.20, phase: 7, span: [6.98, 7.65], refs: ['photo_18', 'pl08', 'pl70'] },
  ];
  for (const band of edouxBands) {
    const mmb = new MultiMaterialBuilder(THREE, materials);
    buildEdouxGuideColumnSection(mmb, band.y0, band.y1, 3.20);
    registerPiece({
      id: band.id,
      label: band.label,
      object3D: mmb.buildGroup(band.id),
      phase: band.phase,
      span: band.span,
      vanishSpan: null,
      category: 'permanent',
      yMin: band.y0,
      yMax: band.y1,
      photoRefs: band.refs,
    });
  }

  // --------------------------------------------------------------------------
  // 3. AUTHENTIC 1889 STRAIGHT, SWITCHBACK & OUTER-CHORD HELICAL STAIRS (`Phase 10`)
  //    + `Photo 47` 1st-Floor `DESCENTE` Enamel Signposts & Wooden Boarding Guichets
  //    (Upper-shaft helical stairs 115.73..292.9m are owned by Zones 3 & 4)
  // --------------------------------------------------------------------------
  const stairs1889Root = new THREE.Group();
  const stairs1889Mmb = new MultiMaterialBuilder(THREE, materials);
  // Authentic 1889 pier staircases (`Photo 47`: `DESCENTE` / `MONTÉE`, `Pl. 20`, `Pl. 08 Figs. 3–4`, `Pl. 70`)
  for (const pier of PIERS) {
    // Ground (+1.58m) -> 1st Floor (+57.63m): parallel straight flights with diamond-mesh wire safety cages
    const lanes = pier.id === 'pile_2' || pier.id === 'pile_4' ? [-3.25, 3.25] : [-3.25];
    for (const lane of lanes) {
      buildStraightPierStairRun(stairs1889Mmb, pier, 1.58, 57.63, lane, 9);
    }
    // Panneau 6 (+57.63m -> +68.63m) in ALL 4 piers: Pl. 20 4-flight criss-crossing switchback service stairs
    buildPanneau6SwitchbackStairs(stairs1889Mmb, pier);
    // Panneaux 7..14 (+68.63m -> +115.73m):
    //   - Piles 2 & 4: Pl. 70 switchback flights centered on exact piecewise pier centerline
    //   - Piles 1 & 3: Pl. 08 Figs. 3–4 outer-chord caged helical service stairs (clear of Otis tracks)
    if (pier.id === 'pile_2' || pier.id === 'pile_4') {
      buildSwitchbackPierStairsStage2(stairs1889Mmb, pier, 68.63, 115.73);
    } else {
      buildOuterChordHelicalStairsStage2(stairs1889Mmb, pier);
    }
  }
  buildFloor1DescenteKiosksAndSigns(THREE, stairs1889Mmb, stairs1889Root);
  stairs1889Root.add(stairs1889Mmb.buildGroup('z5_stairs_1889_merged'));
  registerPiece({
    id: 'z5_stairs_1889_all',
    label: 'Escaliers 1889 des 4 piles (Montée/Descente grillagées, Panneau 6, hélicoïdaux Piles 1/3, panneaux DESCENTE & guichets)',
    object3D: stairs1889Root,
    phase: 10,
    span: [10.00, 10.45],
    vanishSpan: null,
    category: 'permanent',
    yMin: 1.58,
    yMax: 115.73,
    photoRefs: ['photo_47', 'pl08', 'pl20', 'pl53', 'pl70'],
  });

  // --------------------------------------------------------------------------
  // 4. STATIC HYDRAULIC MACHINERY, BASEMENT PUMPS & RESERVOIRS (`Phase 10`)
  // --------------------------------------------------------------------------
  const otisMachineryMmb = new MultiMaterialBuilder(THREE, materials);
  for (const pier of PIERS.filter((p) => p.system === 'otis')) {
    buildOtisStaticMachinery(otisMachineryMmb, pier);
  }
  registerPiece({
    id: 'z5_otis_hydraulic_machinery',
    label: 'Machinerie hydraulique Otis, sous-sol des pompes (Pile 3), tirants (Pile 1) & réservoirs Ré1/Ré2',
    object3D: otisMachineryMmb.buildGroup('z5_otis_hydraulic_machinery'),
    phase: 10,
    span: [10.15, 10.75],
    vanishSpan: null,
    category: 'permanent',
    yMin: -11.55,
    yMax: 118.60,
    photoRefs: ['photo_28', 'pl08', 'pl53', 'pl63'],
  });

  const combaluzierMachineryMmb = new MultiMaterialBuilder(THREE, materials);
  for (const pier of PIERS.filter((p) => p.system === 'combaluzier')) {
    buildCombaluzierStaticMachinery(combaluzierMachineryMmb, pier);
  }
  registerPiece({
    id: 'z5_combaluzier_hydraulic_machinery',
    label: 'Machinerie hydraulique Roux-Combaluzier-Lepape (Piles 2 Est & 4 Ouest)',
    object3D: combaluzierMachineryMmb.buildGroup('z5_combaluzier_hydraulic_machinery'),
    phase: 10,
    span: [10.20, 10.80],
    vanishSpan: null,
    category: 'permanent',
    yMin: -3.80,
    yMax: 63.60,
    photoRefs: ['pl04', 'pl34', 'pl63'],
  });

  const edouxMachineryMmb = new MultiMaterialBuilder(THREE, materials);
  buildEdouxStaticMachinery(edouxMachineryMmb);
  registerPiece({
    id: 'z5_edoux_hydraulic_machinery',
    label: 'Cylindres Édoux de 80.2m, poulies supérieures Po, réservoirs Ré3/Ré4 & colonne montante (+295m)',
    object3D: edouxMachineryMmb.buildGroup('z5_edoux_hydraulic_machinery'),
    phase: 10,
    span: [10.25, 10.90],
    vanishSpan: null,
    category: 'permanent',
    yMin: 115.73,
    yMax: 295.00,
    photoRefs: ['pl08', 'pl70'],
  });

  // --------------------------------------------------------------------------
  // 5. KINEMATIC 1889 ELEVATOR CABINS (`Otis`, `Roux-Combaluzier`, `Édoux`)
  // --------------------------------------------------------------------------
  const otisRigs = [];
  for (const pier of PIERS.filter((p) => p.system === 'otis')) {
    const rig = createInclinedDoubleDeckCabinRig(THREE, materials, pier, true);
    otisRigs.push({ pier, rig });
    registerPiece({
      id: `z5_cabin_otis_${pier.id}`,
      label: `${pier.name} — Cabine double Otis, contrepoids Cp1 & chariot mouflé 12:1`,
      object3D: rig.wrapper,
      phase: 10,
      span: [10.35, 10.95],
      vanishSpan: null,
      category: 'permanent',
      yMin: 1.58,
      yMax: 121.50,
      photoRefs: ['photo_29', 'pl08', 'pl17'],
    });
  }

  const combaluzierRigs = [];
  for (const pier of PIERS.filter((p) => p.system === 'combaluzier')) {
    const rig = createInclinedDoubleDeckCabinRig(THREE, materials, pier, false);
    combaluzierRigs.push({ pier, rig });
    registerPiece({
      id: `z5_cabin_combaluzier_${pier.id}`,
      label: `${pier.name} — Cabine double articulée Roux-Combaluzier-Lepape`,
      object3D: rig.wrapper,
      phase: 10,
      span: [10.40, 10.95],
      vanishSpan: null,
      category: 'permanent',
      yMin: 1.58,
      yMax: 63.00,
      photoRefs: ['pl04', 'pl53'],
    });
  }

  const edouxRig = createEdouxCounterbalancedRig(THREE, materials);
  registerPiece({
    id: 'z5_cabins_edoux_counterbalanced',
    label: 'Ascenseur vertical Édoux — Cabines équilibrées Ca1/Ca2, plongeurs Pi & câbles',
    object3D: edouxRig.wrapper,
    phase: 10,
    span: [10.45, 11.00],
    vanishSpan: null,
    category: 'permanent',
    yMin: 115.73,
    yMax: 285.15,
    photoRefs: ['pl08', 'pl70'],
  });

  // --------------------------------------------------------------------------
  // 6. TEMPORARY CONSTRUCTION FALSEWORK & CLIMBING CRANES (`Phases 0..7`)
  // --------------------------------------------------------------------------
  // Phase 0: Pneumatic Caisson `Sas à Air` Cylinders, Lock-Tender Sheds & Tall Timber A-Frame Derrick (`Photo 13`, step 0.55)
  registerPiece({
    id: 'z5_temp_phase0_caisson_airlocks_derrick',
    label: 'Phase 0 — Sas à air des caissons pneumatiques, cabanes d’éclusiers & chèvre de fonçage (mai 1887)',
    object3D: buildPhase0CaissonAirlocksAndDerrick(THREE, materials),
    phase: 0,
    span: [0.18, 0.42],
    vanishSpan: [0.85, 1.02],
    category: 'temporary_falsework',
    yMin: -5.20,
    yMax: 10.65,
    photoRefs: ['photo_13', 'photo_30'],
  });

  // Phase 1: 4 Guyed Timber Gin-Pole Derricks (`Bigues`, Photo 09 at step 1.50, peaking at +13.55m)
  registerPiece({
    id: 'z5_temp_phase1_derricks',
    label: 'Phase 1 — 4 Bigues haubanées en bois de 13.55m (levage des socles, juillet 1887)',
    object3D: buildPhase1Derricks(THREE, materials),
    phase: 1,
    span: [1.10, 1.38],
    vanishSpan: [2.08, 2.28],
    category: 'temporary_crane',
    yMin: 0.05,
    yMax: 13.55,
    photoRefs: ['photo_09'],
  });

  // Phase 1: 16 Hydraulic 800t Shoe Jacks, Raking Timber Props (`Étais`) & Decauville Rail Loop
  registerPiece({
    id: 'z5_temp_phase1_jacks_props_decauville',
    label: 'Phase 1 — 16 Vérins hydrauliques de 800t, étais en bois & voie Decauville (0.60m)',
    object3D: buildPhase1ShoeJacksPropsAndDecauville(THREE, materials),
    phase: 1,
    span: [1.05, 1.35],
    vanishSpan: [2.10, 2.32],
    category: 'temporary_falsework',
    yMin: 0.0,
    yMax: 6.75,
    photoRefs: ['photo_09'],
  });

  // Phase 2: 12 Outer Battered Pyramidal Timber Falsework Pylons (`43.3m` & `39.8m`) + Sandboxes (`Boîtes à sable`)
  registerPiece({
    id: 'z5_temp_phase2_outer_pier_pylons',
    label: 'Phase 2 — 12 Pylônes pyramidaux en charpente & boîtes à sable sous les arbalétriers',
    object3D: buildPhase2OuterPierFalseworkPylons(THREE, materials),
    phase: 2,
    span: [2.15, 2.55],
    vanishSpan: [5.34, 5.58],
    category: 'temporary_falsework',
    yMin: 0.0,
    yMax: 43.33,
    photoRefs: ['photo_23', 'photo_51', 'photo_14'],
  });

  // Phase 3: 4 Central Multi-Bay Timber Falsework Towers (`50.30m` tall) + Curved Arch Centering (`Cintres`)
  registerPiece({
    id: 'z5_temp_phase3_central_falsework_towers',
    label: 'Phase 3 — 4 Grands échafaudages centraux de 50.3m & cintres des arcs décoratifs',
    object3D: buildPhase3CentralFacadeFalseworkTowers(THREE, materials),
    phase: 3,
    span: [3.00, 3.32],
    vanishSpan: [5.40, 5.63],
    category: 'temporary_falsework',
    yMin: 0.0,
    yMax: 50.30,
    photoRefs: ['photo_23', 'photo_51', 'photo_14', 'photo_49'],
  });

  // Phase 5: Stage-2 Temporary Horizontal Tie-Beams & Pier Riveting Stages (`95.15m` & `103.85m`, erected after Photo 14 89m!)
  registerPiece({
    id: 'z5_temp_phase4_stage2_tie_beams',
    label: 'Phase 5 — Passerelles et poutres provisoires de liaison du 2e Étage (95.15m & 103.85m)',
    object3D: buildPhase4Stage2TemporaryTieBeams(THREE, materials),
    phase: 5,
    span: [4.92, 5.06],
    vanishSpan: [5.34, 5.50],
    category: 'temporary_falsework',
    yMin: 93.8,
    yMax: 104.2,
    photoRefs: ['photo_14'],
  });

  // Phase 4: 4 Pivoting Climbing Creeper Cranes (`Grues pivotantes grimpantes` on Stage-2 pier elevator tracks)
  // Deferred past `step 3.68` (`span: [3.70, 3.88]`) once the 1st-floor deck closes (`Photos 51 & 23` have clear sky above 57.6m!)
  const pierCreeperCranes = [];
  for (let i = 0; i < PIERS.length; i++) {
    const pier = PIERS[i];
    const crane = createPierCreeperCraneRig(THREE, materials, pier);
    pierCreeperCranes.push({ pier, crane, phaseOffset: i * 1.15 });
    registerPiece({
      id: `z5_temp_creeper_crane_${pier.id}`,
      label: `${pier.name} — Grue pivotante grimpante (12t, volée de 12m sur voie d'ascenseur)`,
      object3D: crane.wrapper,
      phase: 4,
      span: [3.70, 3.88],
      vanishSpan: [5.28, 5.50],
      category: 'temporary_crane',
      yMin: 56.0,
      yMax: 125.0,
      photoRefs: ['photo_14'],
    });
  }

  // Phases 6–7: Twin Upper-Shaft Internal Climbing Cranes & Suspended Riveting Stages (`Photo 46`)
  const upperShaftCranes = createUpperShaftClimbingCranesRig(THREE, materials);
  upperShaftCranes.setUpperClimbState(274.5, 0.0);
  registerPiece({
    id: 'z5_temp_upper_shaft_climbing_cranes',
    label: 'Phases 6–7 — 2 Grues grimpantes supérieures & échafaudages volants (P13–3e Étage)',
    object3D: upperShaftCranes.wrapper,
    phase: 6,
    span: [5.69, 5.82],
    vanishSpan: [7.80, 8.20],
    category: 'temporary_crane',
    yMin: 120.0,
    yMax: 290.0,
    photoRefs: ['photo_46'],
  });

  // --------------------------------------------------------------------------
  // KINEMATIC TIMELINE CONTROLLER (`setConstructionState(globalStep)`)
  // --------------------------------------------------------------------------
  function evalKeyframeCurve(x, knots) {
    if (x <= knots[0][0]) return knots[0][1];
    const last = knots[knots.length - 1];
    if (x >= last[0]) return last[1];
    for (let i = 0; i < knots.length - 1; i++) {
      const [x0, y0] = knots[i];
      const [x1, y1] = knots[i + 1];
      if (x >= x0 && x <= x1) {
        const u = (x - x0) / Math.max(1e-6, x1 - x0);
        return lerp(y0, y1, smoothstep01(u));
      }
    }
    return last[1];
  }

  // Exact historical climb curve for the 4 Stage-2 pier creeper cranes:
  //   step 3.70 -> +58.0m (mounted above completed 1st-floor platform after Photos 51 & 23)
  //   step 4.85 -> +76.2m (Photo 14, 15 May 1888: working carriage at +76.2m, jib tips at ~89.5m matching Panneau 8 top!)
  //   step 5.24 -> +112.5m (dismantled once 2nd-floor platform girders close)
  const PIER_CRANE_CLIMB_KNOTS = [
    [3.70, 58.0],
    [4.20, 68.0],
    [4.85, 76.2],
    [5.24, 112.5],
  ];

  // Exact historical climb curve for the 2 upper-shaft climbing cranes (strictly monotonic non-decreasing!):
  //   step 5.69 -> +137.85m (mobilizing above completed 2nd floor + P12 after Photo 01 21 Aug 1888)
  //   step 6.52 -> +210.20m (Photo 46, 23 Nov 1888: crane perched atop Panneau 21 +216.1m, jib tips at ~223.8m!)
  //   step 7.11 -> +245.80m (late Dec 1888 climb past Panneau 25)
  //   step 7.85 -> +274.50m (reaching 3rd Floor +276.13m before campanile assembly)
  const UPPER_CRANE_CLIMB_KNOTS = [
    [5.69, 137.85],
    [5.95, 162.50],
    [6.22, 188.00],
    [6.52, 210.20],
    [7.11, 245.80],
    [7.55, 265.00],
    [7.85, 274.50],
  ];

  function setConstructionState(globalStep = 11.0) {
    const step = Number.isFinite(globalStep) ? globalStep : 11.0;

    // 1. Animate the 4 Pier Pivoting Creeper Cranes (`Phases 4..5`, Photo 14):
    //    Orient `slewAngle = Math.PI` (`-uRadV`) so all 4 lattice booms tilt INWARD toward `Axe de la Tour`
    //    (`/` on left piers, `\` on right piers, matching the real photograph in `Photo 14`!)
    const yCreeper = evalKeyframeCurve(step, PIER_CRANE_CLIMB_KNOTS);
    for (let i = 0; i < pierCreeperCranes.length; i++) {
      const { crane, phaseOffset } = pierCreeperCranes[i];
      const slewAngle = Math.PI + 0.10 * Math.sin(step * 2.2 + phaseOffset);
      crane.setClimbState(yCreeper, slewAngle);
    }

    // 2. Animate the 2 Upper-Shaft Internal Climbing Cranes & Tapering Riveting Stages (`Phases 6..7`)
    const yUpper = evalKeyframeCurve(step, UPPER_CRANE_CLIMB_KNOTS);
    const upperSlew = 0.28 * Math.sin(step * 2.4);
    upperShaftCranes.setUpperClimbState(yUpper, upperSlew);

    // 3. Animate the 1889 Hydraulic Elevators (`Otis`, `Roux-Combaluzier`, `Édoux`)!
    //    - Before step 10.50: parked at lower/transfer assembly stations.
    //    - Across [10.50 .. 11.00] (and for continuous time animation if step > 11.0):
    //      smooth harmonic travel along exact rail spines, landing at canonical Pl. 08 showcase
    //      stations at `step = 11.00`:
    //        * Otis Pile 3 Sud at 1er Étage (+57.63m) & Otis Pile 1 Nord at 2e Étage (+115.73m) / mid-run
    //        * Roux-Combaluzier Pile 2 Est at +1.58m & Pile 4 Ouest at +57.63m
    //        * Édoux `uRelay = 1.0` (`Ca2` at 3e Étage +276.13m, `Ca1` at 2e Étage +115.73m, rams extended!)
    if (step < 10.50) {
      for (const { rig } of otisRigs) rig.setElevation(1.58);
      for (const { rig } of combaluzierRigs) rig.setElevation(1.58);
      edouxRig.setRelayFraction(0.0);
    } else {
      const phasePhase = ((step - 10.50) / 0.50) * Math.PI * 2.0; // 0 at 10.50, 2π at 11.00!
      // Wave `wA`: 0 at 10.50 -> 1.0 at 10.75 -> 0 at 11.00; Wave `wB`: 0 at 10.50 -> 1.0 at 11.00 (smooth ramp + cycle)
      const ramp = smoothstep01((step - 10.50) / 0.50);
      const osc = 0.5 - 0.5 * Math.cos(phasePhase); // 0 -> 1 -> 0 across [10.50, 11.00]

      // Otis Pile 1 Nord: travels +1.58m -> +115.73m -> parks at +92.0m / +115.73m showcase
      // Otis Pile 3 Sud: travels +1.58m -> +115.73m -> lands cleanly at 1er Étage (+57.63m) at 11.00!
      for (const { pier, rig } of otisRigs) {
        if (pier.id === 'pile_3') {
          const yTarget = lerp(1.58, 57.63, ramp) + osc * 58.10 * (1.0 - 0.35 * ramp);
          rig.setElevation(clamp(yTarget, 1.58, 115.73));
        } else {
          const yTarget = lerp(1.58, 115.73, ramp) - osc * 48.0 * (1.0 - ramp);
          rig.setElevation(clamp(yTarget, 1.58, 115.73));
        }
      }

      // Roux-Combaluzier Piles 2 & 4: counter-phased travel between Ground (+1.58m) & 1er Étage (+57.63m)
      for (const { pier, rig } of combaluzierRigs) {
        const uComb = pier.id === 'pile_4' ? clamp(ramp * 0.85 + osc * 0.45, 0, 1) : osc;
        rig.setElevation(lerp(1.58, 57.63, uComb));
      }

      // Édoux Twin-Cabin Counterbalanced Lift:
      // At 10.50: uRelay = 0.0 (both cabins meet at +195.93m Plancher Intermédiaire!)
      // At 10.75: uRelay = 0.55 (mid-shaft pass)
      // At 11.00: uRelay = 1.00 (Ca2 at +276.13m 3rd Floor, Ca1 at +115.73m 2nd Floor, exact Pl. 08 Figs. 1-2!)
      const uEdoux = clamp(0.65 * ramp + 0.35 * (0.5 - 0.5 * Math.cos(phasePhase * 1.5)), 0, 1);
      edouxRig.setRelayFraction(step >= 10.995 && step <= 11.005 ? 1.0 : uEdoux);
    }
  }

  // Initialize to completed 1889 Exposition state (`globalStep = 11.0`)
  setConstructionState(11.0);

  const geomStats = countStats(group);
  const stats = {
    pieceCount: pieces.length,
    permanentPieces: pieces.filter((p) => p.category === 'permanent').length,
    temporaryFalseworkPieces: pieces.filter((p) => p.category === 'temporary_falsework').length,
    temporaryCranePieces: pieces.filter((p) => p.category === 'temporary_crane').length,
    ...geomStats,
  };

  return {
    zoneId: 'zone5_elevators_cranes_falsework',
    group,
    pieces,
    setConstructionState,
    stats,
  };
}
