/**
 * Zone 3 Geometry & Trajectory Helpers (+57.630 m to +195.930 m).
 * Provides indexed BufferGeometry batching, open-laced box chords/beams,
 * riveted gusset plates, and exact 3D pier/merger/shaft coordinate solvers.
 */

export const PIERS = [
  { id: 'p1', num: 1, sx: +1, sz: -1 }, // Pile 1 Nord (+X, -Z) — Otis
  { id: 'p2', num: 2, sx: +1, sz: +1 }, // Pile 2 Est  (+X, +Z) — Stair
  { id: 'p3', num: 3, sx: -1, sz: +1 }, // Pile 3 Sud  (-X, +Z) — Otis
  { id: 'p4', num: 4, sx: -1, sz: -1 }, // Pile 4 Ouest(-X, -Z) — Stair
];

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function lerp3(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function interpKnots(knots, y) {
  if (y <= knots[0][0]) return knots[0];
  const last = knots[knots.length - 1];
  if (y >= last[0]) return last;
  for (let i = 0; i < knots.length - 1; i++) {
    const a = knots[i], b = knots[i + 1];
    if (y >= a[0] && y <= b[0]) {
      const t = (y - a[0]) / (b[0] - a[0]);
      return a.map((va, idx) => lerp(va, b[idx], t));
    }
  }
  return last;
}

// Piecewise-exact Stage-2 pier chord centers [y, xo, xi, cw]
// Outer face = xo + cw/2; inner clear window face = xi - cw/2 (Pl. 45, Pl. 34, Pl. 55, Photo 18)
const STAGE2_KNOTS = [
  [57.6300, 30.2593, 15.2593, 0.88],  // Zone 1 exact handoff at 1er Etage (0.000m seam)
  [68.6300, 27.7200, 13.6200, 0.86],  // True P6/P7 seam (Pl. 20 & Pl. 08: 57.63+11.00=68.63m, 14.10m c-to-c = 27.72-13.62)
  [77.6770, 25.2000, 11.9600, 0.84],  // P7/P8 joint (Pl. 66 Fig. 2 & Pl. 55)
  [89.2038, 21.9800, 10.0800, 0.82],  // P8/P9 joint (+0.28m outer curve match to Pl. 55 & Photo 18)
  [100.0635, 18.7600, 8.2400, 0.80],  // P9/P10 joint (Pl. 45: outer 38.32m->18.76m, clear 15.68m->7.84+0.40=8.24m)
  [104.0000, 17.8100, 7.5950, 0.79],  // Pl. 34 Fig. 4 normal section (7.20+0.395=7.595m)
  [110.6292, 16.4250, 6.7450, 0.78],  // P10/P11 girder soffit (Pl. 45: outer 33.63m->16.425m, clear 12.71m->6.355+0.39=6.745m)
  [115.7300, 15.4350, 6.0200, 0.76],  // 2e Etage deck (Pl. 55 outer 31.63m->15.435m, inner clear 11.28m->5.64+0.38=6.02m)
];

export function stage2PierBounds(y) {
  const [, xo, xi, cw] = interpKnots(STAGE2_KNOTS, y);
  return { xo, xi, cw };
}

// Piecewise-exact Merger chord centers [y, xo, xi, cw, hsOuter] with strict xo = hsOuter - cw/2
const MERGER_KNOTS = [
  [115.7300, 15.43500, 6.02000, 0.76, 15.81500], // 2e Etage core (Pl. 55: 31.63m outer)
  [127.2300, 13.98000, 4.98500, 0.76, 14.36000], // P12/P13 joint (82°21'27" convergence)
  [137.8541, 12.65000, 3.95000, 0.75, 13.02500], // P13/P14 joint (Photo 01 step 5.79 crown)
  [148.2235, 11.34500, 2.91750, 0.75, 11.72000], // P14/P15 joint (Pl. 55 & Pl. 66 Fig. 3: 23.44m outer)
  [158.5940, 10.48000, 1.92720, 0.74, 10.85000], // P15/P16 joint (Pl. 66 Fig. 3: 21.70m outer)
  [169.0240,  9.63609, 0.93135, 0.74, 10.00609], // P16/P17 strut (Pl. 70: 20.01218m outer, 1.8627m inner)
  [179.0522,  8.88000, 0.23000, 0.74,  9.25000], // P17/P18 collar (Pl. 70: exact 18.500m outer, ±0.23m twin post)
];

export function mergerBounds(y) {
  const [, xo, xi, cw, hsOuter] = interpKnots(MERGER_KNOTS, y);
  return { xo, xi, cw, hsOuter };
}

// Exact match to Zone 4's shaftHalfSpan(y) for 0.000m seam closure at Y = +195.930m
export function unifiedShaftHalfSpan(y) {
  const y0 = 179.0522, yTop = 264.8565;
  if (y <= y0) return 9.25;
  if (y >= yTop) return 5.0;
  return 5.0 + (4.25 * (yTop - y)) / (yTop - y0);
}

// 4 chord center points of pier `p` at elevation `y`: [outerCorner, xOuterZInner, xInnerZOuter, innerCorner]
export function pierChordCenters(p, xo, xi, y) {
  return [
    [p.sx * xo, y, p.sz * xo],
    [p.sx * xo, y, p.sz * xi],
    [p.sx * xi, y, p.sz * xo],
    [p.sx * xi, y, p.sz * xi],
  ];
}

export class MeshBatch {
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

  addQuadXYZ(x0, y0, z0, x1, y1, z1, x2, y2, z2, x3, y3, z3) {
    const ux = x1 - x0, uy = y1 - y0, uz = z1 - z0;
    const vx = x3 - x0, vy = y3 - y0, vz = z3 - z0;
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    const inv = 1 / len;
    nx *= inv; ny *= inv; nz *= inv;

    this._ensureVerts(4);
    this._ensureIdx(6);

    const b = this.vCount;
    const po = b * 3;
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

    const uo = b * 2;
    const uv = this._uv;
    uv[uo] = 0; uv[uo + 1] = 0;
    uv[uo + 2] = 1; uv[uo + 3] = 0;
    uv[uo + 4] = 1; uv[uo + 5] = 1;
    uv[uo + 6] = 0; uv[uo + 7] = 1;

    const io = this.iCount;
    const idx = this._idx;
    idx[io] = b; idx[io + 1] = b + 1; idx[io + 2] = b + 2;
    idx[io + 3] = b; idx[io + 4] = b + 2; idx[io + 5] = b + 3;

    this.vCount = b + 4;
    this.iCount = io + 6;
  }

  addQuad(p0, p1, p2, p3) {
    this.addQuadXYZ(
      p0[0], p0[1], p0[2],
      p1[0], p1[1], p1[2],
      p2[0], p2[1], p2[2],
      p3[0], p3[1], p3[2]
    );
  }

  addTri(p0, p1, p2) {
    const x0 = p0[0], y0 = p0[1], z0 = p0[2];
    const x1 = p1[0], y1 = p1[1], z1 = p1[2];
    const x2 = p2[0], y2 = p2[1], z2 = p2[2];
    const ux = x1 - x0, uy = y1 - y0, uz = z1 - z0;
    const vx = x2 - x0, vy = y2 - y0, vz = z2 - z0;
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    const inv = 1 / len;
    nx *= inv; ny *= inv; nz *= inv;

    this._ensureVerts(3);
    this._ensureIdx(3);

    const b = this.vCount;
    const po = b * 3;
    const pos = this._pos;
    pos[po] = x0; pos[po + 1] = y0; pos[po + 2] = z0;
    pos[po + 3] = x1; pos[po + 4] = y1; pos[po + 5] = z1;
    pos[po + 6] = x2; pos[po + 7] = y2; pos[po + 8] = z2;

    const norm = this._norm;
    norm[po] = nx; norm[po + 1] = ny; norm[po + 2] = nz;
    norm[po + 3] = nx; norm[po + 4] = ny; norm[po + 5] = nz;
    norm[po + 6] = nx; norm[po + 7] = ny; norm[po + 8] = nz;

    const uo = b * 2;
    const uv = this._uv;
    uv[uo] = 0; uv[uo + 1] = 0;
    uv[uo + 2] = 1; uv[uo + 3] = 0;
    uv[uo + 4] = 0.5; uv[uo + 5] = 1;

    const io = this.iCount;
    const idx = this._idx;
    idx[io] = b; idx[io + 1] = b + 1; idx[io + 2] = b + 2;

    this.vCount = b + 3;
    this.iCount = io + 3;
  }

  addBox8(c) {
    this.addQuad(c[0], c[1], c[2], c[3]);
    this.addQuad(c[5], c[4], c[7], c[6]);
    this.addQuad(c[4], c[0], c[3], c[7]);
    this.addQuad(c[1], c[5], c[6], c[2]);
    this.addQuad(c[3], c[2], c[6], c[7]);
    this.addQuad(c[4], c[5], c[1], c[0]);
  }

  addAxisBox(cx, cy, cz, sx, sy, sz) {
    const x0 = cx - sx * 0.5, x1 = cx + sx * 0.5;
    const y0 = cy - sy * 0.5, y1 = cy + sy * 0.5;
    const z0 = cz - sz * 0.5, z1 = cz + sz * 0.5;
    this.addQuadXYZ(x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1);
    this.addQuadXYZ(x1, y0, z0, x0, y0, z0, x0, y1, z0, x1, y1, z0);
    this.addQuadXYZ(x0, y0, z0, x0, y0, z1, x0, y1, z1, x0, y1, z0);
    this.addQuadXYZ(x1, y0, z1, x1, y0, z0, x1, y1, z0, x1, y1, z1);
    this.addQuadXYZ(x0, y1, z1, x1, y1, z1, x1, y1, z0, x0, y1, z0);
    this.addQuadXYZ(x0, y0, z0, x1, y0, z0, x1, y0, z1, x0, y0, z1);
  }

  addFrustum(cx, cz, y0, r0, y1, r1, segs = 12, capBot = false, capTop = false) {
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2;
      const a1 = ((i + 1) / segs) * Math.PI * 2;
      const c0 = Math.cos(a0), s0 = Math.sin(a0);
      const c1 = Math.cos(a1), s1 = Math.sin(a1);
      const b0 = [cx + c0 * r0, y0, cz + s0 * r0];
      const b1 = [cx + c1 * r0, y0, cz + s1 * r0];
      const t0 = [cx + c0 * r1, y1, cz + s0 * r1];
      const t1 = [cx + c1 * r1, y1, cz + s1 * r1];
      if (r0 > 1e-4 && r1 > 1e-4) {
        this.addQuad(b1, b0, t0, t1);
      } else if (r1 <= 1e-4 && r0 > 1e-4) {
        this.addTri([cx, y1, cz], b1, b0);
      } else if (r0 <= 1e-4 && r1 > 1e-4) {
        this.addTri([cx, y0, cz], t0, t1);
      }
      if (capBot && r0 > 1e-4) this.addTri([cx, y0, cz], b0, b1);
      if (capTop && r1 > 1e-4) this.addTri([cx, y1, cz], t1, t0);
    }
  }

  addSphere(cx, cy, cz, radius, segs = 14, bands = 8) {
    for (let b = 0; b < bands; b++) {
      const th0 = -Math.PI * 0.5 + (b / bands) * Math.PI;
      const th1 = -Math.PI * 0.5 + ((b + 1) / bands) * Math.PI;
      const y0 = cy + Math.sin(th0) * radius;
      const y1 = cy + Math.sin(th1) * radius;
      const r0 = Math.max(0, Math.cos(th0) * radius);
      const r1 = Math.max(0, Math.cos(th1) * radius);
      this.addFrustum(cx, cz, y0, r0, y1, r1, segs, false, false);
    }
  }

  addStrut(a, b, w, d = w, upHint = [0, 1, 0]) {
    const ax = a[0], ay = a[1], az = a[2];
    const bx = b[0], by = b[1], bz = b[2];
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 1e-5) return;
    const invLen = 1 / len;
    const fx = dx * invLen, fy = dy * invLen, fz = dz * invLen;
    let ux = upHint[0], uy = upHint[1], uz = upHint[2];
    if (Math.abs(fx * ux + fy * uy + fz * uz) > 0.94) { ux = 1; uy = 0; uz = 0; }
    if (Math.abs(fx * ux + fy * uy + fz * uz) > 0.94) { ux = 0; uy = 0; uz = 1; }
    let rx = fy * uz - fz * uy, ry = fz * ux - fx * uz, rz = fx * uy - fy * ux;
    const rl = Math.sqrt(rx * rx + ry * ry + rz * rz) || 1;
    const invRl = 1 / rl;
    rx *= invRl; ry *= invRl; rz *= invRl;
    const vx = ry * fz - rz * fy, vy = rz * fx - rx * fz, vz = rx * fy - ry * fx;
    const rxh = rx * (w * 0.5), ryh = ry * (w * 0.5), rzh = rz * (w * 0.5);
    const vxh = vx * (d * 0.5), vyh = vy * (d * 0.5), vzh = vz * (d * 0.5);

    const c0x = bx - rxh - vxh, c0y = by - ryh - vyh, c0z = bz - rzh - vzh;
    const c1x = bx + rxh - vxh, c1y = by + ryh - vyh, c1z = bz + rzh - vzh;
    const c2x = bx + rxh + vxh, c2y = by + ryh + vyh, c2z = bz + rzh + vzh;
    const c3x = bx - rxh + vxh, c3y = by - ryh + vyh, c3z = bz - rzh + vzh;

    const c4x = ax - rxh - vxh, c4y = ay - ryh - vyh, c4z = az - rzh - vzh;
    const c5x = ax + rxh - vxh, c5y = ay + ryh - vyh, c5z = az + rzh - vzh;
    const c6x = ax + rxh + vxh, c6y = ay + ryh + vyh, c6z = az + rzh + vzh;
    const c7x = ax - rxh + vxh, c7y = ay - ryh + vyh, c7z = az - rzh + vzh;

    this.addQuadXYZ(c0x, c0y, c0z, c1x, c1y, c1z, c2x, c2y, c2z, c3x, c3y, c3z);
    this.addQuadXYZ(c5x, c5y, c5z, c4x, c4y, c4z, c7x, c7y, c7z, c6x, c6y, c6z);
    this.addQuadXYZ(c4x, c4y, c4z, c0x, c0y, c0z, c3x, c3y, c3z, c7x, c7y, c7z);
    this.addQuadXYZ(c1x, c1y, c1z, c5x, c5y, c5z, c6x, c6y, c6z, c2x, c2y, c2z);
    this.addQuadXYZ(c3x, c3y, c3z, c2x, c2y, c2z, c6x, c6y, c6z, c7x, c7y, c7z);
    this.addQuadXYZ(c4x, c4y, c4z, c5x, c5y, c5z, c1x, c1y, c1z, c0x, c0y, c0z);
  }

  toMesh(THREE, mat, name) {
    if (!this.iCount) return null;
    const g = new THREE.BufferGeometry();
    const vc3 = this.vCount * 3;
    const vc2 = this.vCount * 2;
    g.setAttribute('position', new THREE.BufferAttribute(this._pos.slice(0, vc3), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(this._norm.slice(0, vc3), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(this._uv.slice(0, vc2), 2));
    if (this.vCount > 65535) {
      g.setIndex(new THREE.BufferAttribute(this._idx.slice(0, this.iCount), 1));
    } else {
      const idx16 = new Uint16Array(this.iCount);
      const src = this._idx;
      for (let i = 0; i < this.iCount; i++) idx16[i] = src[i];
      g.setIndex(new THREE.BufferAttribute(idx16, 1));
    }
    const m = new THREE.Mesh(g, mat);
    m.name = name;
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }
}

export class MultiBatch {
  constructor(THREE, materials) {
    this.THREE = THREE;
    this.materials = materials;
    this.map = new Map();
  }
  get(key) {
    if (!this.map.has(key)) this.map.set(key, new MeshBatch());
    return this.map.get(key);
  }
  buildGroup(name) {
    const grp = new this.THREE.Group();
    grp.name = name;
    for (const [k, batch] of this.map.entries()) {
      const m = batch.toMesh(this.THREE, this.materials[k] || this.materials.ironPrimary, `${name}_${k}`);
      if (m) grp.add(m);
    }
    return grp;
  }
}

export function addLacedBoxChord(pri, lat, c0, c1, cw0, cw1, nLace = 10, spliceTop = true) {
  const offs = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]];
  const bPts = offs.map(([ox, oz]) => [c0[0] + ox * cw0, c0[1], c0[2] + oz * cw0]);
  const tPts = offs.map(([ox, oz]) => [c1[0] + ox * cw1, c1[1], c1[2] + oz * cw1]);
  for (let i = 0; i < 4; i++) pri.addStrut(bPts[i], tPts[i], 0.125, 0.125, [1, 0, 0]);
  if (spliceTop) pri.addAxisBox(c1[0], c1[1] - 0.12, c1[2], cw1 + 0.06, 0.24, cw1 + 0.06);
  for (let f = 0; f < 4; f++) {
    const j = (f + 1) % 4;
    for (let s = 0; s < nLace; s++) {
      const t0 = s / nLace, t1 = (s + 1) / nLace;
      const pA = lerp3(bPts[f], tPts[f], s % 2 === 0 ? t0 : t1);
      const pB = lerp3(bPts[j], tPts[j], s % 2 === 0 ? t1 : t0);
      lat.addStrut(pA, pB, 0.042, 0.042);
    }
  }
}

export function addLacedBeam(pri, lat, a, b, depth = 0.42, thick = 0.26, up = [0, 1, 0], step = 0.72) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const len = Math.hypot(dx, dy, dz);
  if (len < 0.05) return;
  let ux = up[0], uy = up[1], uz = up[2];
  const fx = dx / len, fy = dy / len, fz = dz / len;
  if (Math.abs(fx * ux + fy * uy + fz * uz) > 0.92) { ux = 0; uy = 1; uz = 0; }
  if (Math.abs(fx * ux + fy * uy + fz * uz) > 0.92) { ux = 1; uy = 0; uz = 0; }
  const hd = depth * 0.5;
  const aTop = [a[0] + ux * hd, a[1] + uy * hd, a[2] + uz * hd];
  const bTop = [b[0] + ux * hd, b[1] + uy * hd, b[2] + uz * hd];
  const aBot = [a[0] - ux * hd, a[1] - uy * hd, a[2] - uz * hd];
  const bBot = [b[0] - ux * hd, b[1] - uy * hd, b[2] - uz * hd];
  pri.addStrut(aTop, bTop, 0.095, thick, up);
  pri.addStrut(aBot, bBot, 0.095, thick, up);
  const n = Math.max(3, Math.round(len / step));
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n;
    lat.addStrut(i % 2 === 0 ? lerp3(aBot, bBot, t0) : lerp3(aTop, bTop, t0),
      i % 2 === 0 ? lerp3(aTop, bTop, t1) : lerp3(aBot, bBot, t1), 0.038, thick * 0.55, up);
  }
}

export function addGussetTri(pri, p0, p1, p2, thick = 0.04) {
  const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2];
  const vx = p2[0] - p0[0], vy = p2[1] - p0[1], vz = p2[2] - p0[2];
  let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const nl = (Math.hypot(nx, ny, nz) || 1) / (thick * 0.5);
  nx /= nl; ny /= nl; nz /= nl;
  const f = [p0, p1, p2].map((p) => [p[0] + nx, p[1] + ny, p[2] + nz]);
  const bk = [p0, p1, p2].map((p) => [p[0] - nx, p[1] - ny, p[2] - nz]);
  pri.addTri(f[0], f[1], f[2]);
  pri.addTri(bk[0], bk[2], bk[1]);
}

// 4-chord 3D open-laced box girder with horizontal/transverse X-lacing (`width`) and vertical web lacing (`depth`)
export function addBoxTruss4(pri, lat, a, b, width = 0.56, depth = 0.44, up = [0, 1, 0], step = 0.72, crossX = true) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const len = Math.hypot(dx, dy, dz);
  if (len < 0.05) return;
  const fx = dx / len, fy = dy / len, fz = dz / len;
  let ux = up[0], uy = up[1], uz = up[2];
  if (Math.abs(fx * ux + fy * uy + fz * uz) > 0.92) { ux = 0; uy = 1; uz = 0; }
  if (Math.abs(fx * ux + fy * uy + fz * uz) > 0.92) { ux = 1; uy = 0; uz = 0; }
  let rx = fy * uz - fz * uy, ry = fz * ux - fx * uz, rz = fx * uy - fy * ux;
  const rl = Math.hypot(rx, ry, rz) || 1;
  rx /= rl; ry /= rl; rz /= rl;
  const vx = ry * fz - rz * fy, vy = rz * fx - rx * fz, vz = rx * fy - ry * fx;
  const hw = width * 0.5, hd = depth * 0.5;
  const pt = (p, sw, sd) => [
    p[0] + rx * sw * hw + vx * sd * hd,
    p[1] + ry * sw * hw + vy * sd * hd,
    p[2] + rz * sw * hw + vz * sd * hd,
  ];
  for (const [sw, sd] of [[-1, 1], [1, 1], [1, -1], [-1, -1]]) {
    pri.addStrut(pt(a, sw, sd), pt(b, sw, sd), 0.088, 0.088, up);
  }
  const n = Math.max(2, Math.round(len / step));
  for (const sd of [-1, 1]) {
    const aL = pt(a, -1, sd), bL = pt(b, -1, sd), aR = pt(a, 1, sd), bR = pt(b, 1, sd);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      lat.addStrut(lerp3(aL, bL, t), lerp3(aR, bR, t), 0.042, 0.042, up);
    }
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      lat.addStrut(lerp3(aL, bL, t0), lerp3(aR, bR, t1), 0.046, 0.046, up);
      if (crossX) lat.addStrut(lerp3(aR, bR, t0), lerp3(aL, bL, t1), 0.046, 0.046, up);
    }
  }
  for (const sw of [-1, 1]) {
    const aBot = pt(a, sw, -1), bBot = pt(b, sw, -1), aTop = pt(a, sw, 1), bTop = pt(b, sw, 1);
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      lat.addStrut(lerp3(aBot, bBot, i % 2 === 0 ? t0 : t1), lerp3(aTop, bTop, i % 2 === 0 ? t1 : t0), 0.040, 0.040, up);
    }
  }
}
