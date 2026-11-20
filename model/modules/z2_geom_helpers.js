/**
 * Zone 2 Geometry, Coordinate & Material Helpers (`z2_geom_helpers.js`)
 * Canonical coordinates for 4 Decorative Arches & Complete 1889 First Platform (+10.00 m .. +66.50 m).
 */

export const Y_ARCH_BASE = 1.950;           // Massifs de l'arc décoratif pedestal crown (+1.95 m, Pl. 55 & Pl. 69)
export const Y_ARCH_CROWN_BOT = 37.62;      // Intrados box-chord soffit at crown
export const Y_ARCH_CROWN_SOFFIT = 37.85;   // Vertical-projection intrados crown (YC=+0.10, R=37.75, Pl. 55 & Photo 18)
export const Y_ARCH_CROWN_TOP = 40.60;      // Vertical-projection extrados crown (R=40.50, 2.75m below Poutre de l'Arc)
export const Y_POUTRE_ARC_BOT = 43.33;      // 76.83 NGF (Pl. 20: 91.13 - 7.30 - 7.00)
export const Y_GRANDE_POUTRE_BOT = 50.33;   // 83.83 NGF (Pl. 20: 91.13 - 7.30)
export const Y_CORNICE_BOT = 55.83;         // 50.33 + 5.50 m (Pl. 20 left margin)
export const Y_PROMENADE = 56.40;           // 89.90 NGF — Galerie promenade extérieure (Pl. 20)
export const Y_PROM_RAIL_TOP = 57.55;       // 56.40 + 1.15 m balustrade (Pl. 20)
export const Y_FLOOR1_DECK = 57.63;         // 91.13 NGF — Plancher des Restaurants (Pl. 20, Pl. 53)
export const Y_COURT_RAIL_TOP = 58.75;      // Central court inner railing top
export const Y_ARCADE_SPRING = 60.20;       // 56.40 + 3.80 m stanchion capital (Pl. 20)
export const Y_SUBARCH_CROWN = 62.55;       // Twin 3.88 m sub-arch crown (Pl. 20)
export const Y_GRAND_ARCH_LOW = 63.92;      // Lower arch chord capping diamond tympanum (yc=60.22, r=3.70, Pl. 20)
export const Y_GRAND_ARCH_INT = 65.08;      // Middle arch chord / inner oculus band (yc=61.56, r=3.52, Pl. 20)
export const Y_GRAND_ARCH_EXT = 65.66;      // Outer radial-oculus arch extrados crown (yc=61.68, r=3.98, Pl. 20)
export const Y_CARTOUCHE_TOP = 67.16;       // Openwork 9-frond palmette cresting finial top (~0.84m above 66.32m shield, Pl. 20)
export const Y_FLAGSTAFF_TOP = 69.20;       // Inter-bay flagpole / lightning standard T-cap finial (+69.20 m, Pl. 20 Fig. 1)

export const EXT_HALF = 35.3475;            // 70.695 m exterior promenade square
export const ARCADE_W = 32.58;              // 35.35 - 2.77 m Galerie promenade width (Pl. 20: 2.78 m)
export const COURT_HALF = 17.75;            // Grande poutre intérieure centerline (±17.75 m, Pl. 53 Fig. 9)
export const BALCON_CURB = 16.70;           // Cantilevered straight inner courtyard walkway curb (±16.70 m, Pl. 53 Fig. 9)
export const BALCON_HALF = 13.95;           // Semi-elliptical interior balconies projecting to ±13.95 m (Pl. 53 Fig. 9)
export const BAY_W = 3.88;                  // 18 frieze/sub-arch bays x 3.88 m = 69.84 m (9 x 7.76 m)

export const PIER_BATTER = (51.9535 - 26.6250) / (50.33 - 2.50); // 0.529552582

export function pierCenterAbs(y) {
  return 51.9535 - PIER_BATTER * (y - 2.50);
}
export function wOuter(y) {
  return pierCenterAbs(y) + 7.500;
}
export function wInner(y) {
  return pierCenterAbs(y) - 7.500;
}

// Right-handed cardinal face frames: u runs left->right viewed from outside, w is outward normal
export const FACES = [
  { id: 'se', idx: 0, label: 'SE (+Z École Militaire)', photoRefs: ['18', '23', '46'] },
  { id: 'ne', idx: 1, label: 'NE (+X La Bourdonnais)', photoRefs: ['18', '36', '46'] },
  { id: 'nw', idx: 2, label: 'NW (-Z Trocadéro)', photoRefs: ['36', '14', '23'] },
  { id: 'sw', idx: 3, label: 'SW (-X Grenelle)', photoRefs: ['14', '36', '46'] },
];

export function facePt(faceIdx, u, y, w) {
  switch (faceIdx & 3) {
    case 0: return [u, y, w];
    case 1: return [w, y, -u];
    case 2: return [-u, y, -w];
    default: return [-w, y, u];
  }
}

export function faceNorm(faceIdx) {
  return facePt(faceIdx, 0, 0, 1);
}

export function vLerp(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function resolveMaterials(THREE, input = {}) {
  const mk = (name, color, roughness = 0.55, metalness = 0.35, extra = {}) =>
    new THREE.MeshStandardMaterial({ name, color, roughness, metalness, side: THREE.DoubleSide, ...extra });
  const mats = {
    ironPrimary: input.ironPrimary || mk('ironPrimary', 0x5c382c, 0.52, 0.44),
    ironLattice: input.ironLattice || mk('ironLattice', 0x6b4335, 0.56, 0.38),
    ironCast: input.ironCast || mk('ironCast', 0x363432, 0.45, 0.64),
    woodPavilion: input.woodPavilion || mk('woodPavilion', 0x8f6239, 0.64, 0.05),
    glass1889: input.glass1889 || new THREE.MeshPhysicalMaterial({
      name: 'glass1889', color: 0xc8dde6, transparent: true, opacity: 0.42,
      roughness: 0.14, metalness: 0.10, side: THREE.DoubleSide, depthWrite: false,
    }),
    goldAccent: input.goldAccent || mk('goldAccent', 0xd1a43e, 0.30, 0.82),
    copperDome: input.copperDome || mk('copperDome', 0x586f64, 0.42, 0.58),
    flagTricolore: input.flagTricolore || mk('flagTricolore', 0xeae6dc, 0.74, 0.02),
    awningCream: mk('awningCream', 0xdfd8ca, 0.82, 0.00),
    awningStripe: mk('awningStripe', 0x6b4c42, 0.82, 0.00),
    lampGlobe1889: input.lampGlobe1889 || mk('lampGlobe1889', 0xebe6dc, 0.32, 0.00),
  };
  return mats;
}

export class GeomBuilder {
  constructor(initVerts = 512) {
    this._vCap = initVerts;
    this.vCount = 0;
    this._pos = new Float32Array(initVerts * 3);
    this._uvs = null;
    this.hasUV = false;
  }

  _ensureVerts(addV) {
    const need = this.vCount + addV;
    if (need <= this._vCap) return;
    let cap = this._vCap;
    while (cap < need) cap <<= 1;
    const np = new Float32Array(cap * 3);
    np.set(this._pos.subarray(0, this.vCount * 3));
    this._pos = np;
    if (this._uvs) {
      const nu = new Float32Array(cap * 2);
      nu.set(this._uvs.subarray(0, this.vCount * 2));
      this._uvs = nu;
    }
    this._vCap = cap;
  }

  _ensureUvsAllocated() {
    if (this._uvs) return;
    const uv = new Float32Array(this._vCap * 2);
    for (let t = 0; t + 2 < this.vCount; t += 3) {
      const o = t * 2;
      uv[o] = 0; uv[o + 1] = 0;
      uv[o + 2] = 1; uv[o + 3] = 0;
      uv[o + 4] = 1; uv[o + 5] = 1;
    }
    this._uvs = uv;
  }

  addTriXYZ(ax, ay, az, bx, by, bz, cx, cy, cz) {
    this._ensureVerts(3);
    const b = this.vCount;
    const po = b * 3;
    const pos = this._pos;
    pos[po] = ax; pos[po + 1] = ay; pos[po + 2] = az;
    pos[po + 3] = bx; pos[po + 4] = by; pos[po + 5] = bz;
    pos[po + 6] = cx; pos[po + 7] = cy; pos[po + 8] = cz;
    if (this._uvs) {
      const uo = b * 2;
      const uv = this._uvs;
      uv[uo] = 0; uv[uo + 1] = 0;
      uv[uo + 2] = 1; uv[uo + 3] = 0;
      uv[uo + 4] = 1; uv[uo + 5] = 1;
    }
    this.vCount = b + 3;
  }

  addTri(a, b, c, uva, uvb, uvc) {
    if (uva !== undefined) {
      this._ensureUvsAllocated();
      this._ensureVerts(3);
      const base = this.vCount;
      const po = base * 3;
      const pos = this._pos;
      pos[po] = a[0]; pos[po + 1] = a[1]; pos[po + 2] = a[2];
      pos[po + 3] = b[0]; pos[po + 4] = b[1]; pos[po + 5] = b[2];
      pos[po + 6] = c[0]; pos[po + 7] = c[1]; pos[po + 8] = c[2];
      const uo = base * 2;
      const uv = this._uvs;
      uv[uo] = uva[0]; uv[uo + 1] = uva[1];
      uv[uo + 2] = uvb ? uvb[0] : 1; uv[uo + 3] = uvb ? uvb[1] : 0;
      uv[uo + 4] = uvc ? uvc[0] : 1; uv[uo + 5] = uvc ? uvc[1] : 1;
      this.vCount = base + 3;
      return;
    }
    this.addTriXYZ(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  }

  addQuadXYZ(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz) {
    this.addTriXYZ(ax, ay, az, bx, by, bz, cx, cy, cz);
    this.addTriXYZ(ax, ay, az, cx, cy, cz, dx, dy, dz);
  }

  addQuad(a, b, c, d) {
    this.addQuadXYZ(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], d[0], d[1], d[2]);
  }

  addQuadUV(a, b, c, d, u0 = 0, v0 = 0, u1 = 1, v1 = 1) {
    this.hasUV = true;
    this._ensureUvsAllocated();
    this._ensureVerts(6);
    const base = this.vCount;
    const po = base * 3;
    const pos = this._pos;
    pos[po] = a[0]; pos[po + 1] = a[1]; pos[po + 2] = a[2];
    pos[po + 3] = b[0]; pos[po + 4] = b[1]; pos[po + 5] = b[2];
    pos[po + 6] = c[0]; pos[po + 7] = c[1]; pos[po + 8] = c[2];
    pos[po + 9] = a[0]; pos[po + 10] = a[1]; pos[po + 11] = a[2];
    pos[po + 12] = c[0]; pos[po + 13] = c[1]; pos[po + 14] = c[2];
    pos[po + 15] = d[0]; pos[po + 16] = d[1]; pos[po + 17] = d[2];
    const uo = base * 2;
    const uv = this._uvs;
    uv[uo] = u0; uv[uo + 1] = v0;
    uv[uo + 2] = u1; uv[uo + 3] = v0;
    uv[uo + 4] = u1; uv[uo + 5] = v1;
    uv[uo + 6] = u0; uv[uo + 7] = v0;
    uv[uo + 8] = u1; uv[uo + 9] = v1;
    uv[uo + 10] = u0; uv[uo + 11] = v1;
    this.vCount = base + 6;
  }

  addBeam(p0, p1, w, d, upHint = [0, 1, 0], caps = false) {
    const p0x = p0[0], p0y = p0[1], p0z = p0[2];
    const p1x = p1[0], p1y = p1[1], p1z = p1[2];
    const dx = p1x - p0x, dy = p1y - p0y, dz = p1z - p0z;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 1e-5) return;
    const invLen = 1 / len;
    const fx = dx * invLen, fy = dy * invLen, fz = dz * invLen;
    let ux = upHint[0], uy = upHint[1], uz = upHint[2];
    let rx = fy * uz - fz * uy, ry = fz * ux - fx * uz, rz = fx * uy - fy * ux;
    let rl = Math.sqrt(rx * rx + ry * ry + rz * rz);
    if (rl < 1e-4) {
      ux = 1; uy = 0; uz = 0;
      rx = fy * uz - fz * uy; ry = fz * ux - fx * uz; rz = fx * uy - fy * ux;
      rl = Math.sqrt(rx * rx + ry * ry + rz * rz) || 1;
    }
    const invRl = 1 / rl;
    rx *= invRl; ry *= invRl; rz *= invRl;
    const vx = ry * fz - rz * fy, vy = rz * fx - rx * fz, vz = rx * fy - ry * fx;
    const rxh = w * 0.5 * rx, ryh = w * 0.5 * ry, rzh = w * 0.5 * rz;
    const vxh = d * 0.5 * vx, vyh = d * 0.5 * vy, vzh = d * 0.5 * vz;

    const a0x = p0x - rxh - vxh, a0y = p0y - ryh - vyh, a0z = p0z - rzh - vzh;
    const a1x = p0x + rxh - vxh, a1y = p0y + ryh - vyh, a1z = p0z + rzh - vzh;
    const a2x = p0x + rxh + vxh, a2y = p0y + ryh + vyh, a2z = p0z + rzh + vzh;
    const a3x = p0x - rxh + vxh, a3y = p0y - ryh + vyh, a3z = p0z - rzh + vzh;

    const b0x = p1x - rxh - vxh, b0y = p1y - ryh - vyh, b0z = p1z - rzh - vzh;
    const b1x = p1x + rxh - vxh, b1y = p1y + ryh - vyh, b1z = p1z + rzh - vzh;
    const b2x = p1x + rxh + vxh, b2y = p1y + ryh + vyh, b2z = p1z + rzh + vzh;
    const b3x = p1x - rxh + vxh, b3y = p1y - ryh + vyh, b3z = p1z - rzh + vzh;

    this.addQuadXYZ(a0x, a0y, a0z, a1x, a1y, a1z, b1x, b1y, b1z, b0x, b0y, b0z);
    this.addQuadXYZ(a1x, a1y, a1z, a2x, a2y, a2z, b2x, b2y, b2z, b1x, b1y, b1z);
    this.addQuadXYZ(a2x, a2y, a2z, a3x, a3y, a3z, b3x, b3y, b3z, b2x, b2y, b2z);
    this.addQuadXYZ(a3x, a3y, a3z, a0x, a0y, a0z, b0x, b0y, b0z, b3x, b3y, b3z);
    if (caps) {
      this.addQuadXYZ(a3x, a3y, a3z, a2x, a2y, a2z, a1x, a1y, a1z, a0x, a0y, a0z);
      this.addQuadXYZ(b0x, b0y, b0z, b1x, b1y, b1z, b2x, b2y, b2z, b3x, b3y, b3z);
    }
  }

  addBoxCenter(cx, cy, cz, sx, sy, sz) {
    this.addBeam([cx, cy - sy * 0.5, cz], [cx, cy + sy * 0.5, cz], sx, sz, [0, 0, 1], true);
  }

  addCylinder(p0, p1, r0, r1, segs = 10, caps = true) {
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1], dz = p1[2] - p0[2];
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-5) return;
    const fx = dx / len, fy = dy / len, fz = dz / len;
    let ux = Math.abs(fy) < 0.9 ? 0 : 1, uy = Math.abs(fy) < 0.9 ? 1 : 0, uz = 0;
    let rx = fy * uz - fz * uy, ry = fz * ux - fx * uz, rz = fx * uy - fy * ux;
    const rl = Math.hypot(rx, ry, rz) || 1;
    rx /= rl; ry /= rl; rz /= rl;
    const vx = ry * fz - rz * fy, vy = rz * fx - rx * fz, vz = rx * fy - ry * fx;
    const ring = (p, r, a) => {
      const ca = Math.cos(a) * r, sa = Math.sin(a) * r;
      return [p[0] + ca * rx + sa * vx, p[1] + ca * ry + sa * vy, p[2] + ca * rz + sa * vz];
    };
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
      const q00 = ring(p0, r0, a0), q10 = ring(p0, r0, a1);
      const q01 = ring(p1, r1, a0), q11 = ring(p1, r1, a1);
      this.addQuad(q00, q10, q11, q01);
      if (caps && r0 > 1e-4) this.addTri(p0, q10, q00);
      if (caps && r1 > 1e-4) this.addTri(p1, q01, q11);
    }
  }

  addSphere(center, r, segU = 8, segV = 6) {
    for (let iv = 0; iv < segV; iv++) {
      const v0 = (iv / segV) * Math.PI, v1 = ((iv + 1) / segV) * Math.PI;
      const y0 = center[1] + Math.cos(v0) * r, y1 = center[1] + Math.cos(v1) * r;
      const sr0 = Math.sin(v0) * r, sr1 = Math.sin(v1) * r;
      for (let iu = 0; iu < segU; iu++) {
        const u0 = (iu / segU) * Math.PI * 2, u1 = ((iu + 1) / segU) * Math.PI * 2;
        const p00 = [center[0] + Math.cos(u0) * sr0, y0, center[2] + Math.sin(u0) * sr0];
        const p10 = [center[0] + Math.cos(u1) * sr0, y0, center[2] + Math.sin(u1) * sr0];
        const p11 = [center[0] + Math.cos(u1) * sr1, y1, center[2] + Math.sin(u1) * sr1];
        const p01 = [center[0] + Math.cos(u0) * sr1, y1, center[2] + Math.sin(u0) * sr1];
        if (iv === 0) this.addTri(p00, p11, p01);
        else if (iv === segV - 1) this.addTri(p00, p10, p11);
        else this.addQuad(p00, p10, p11, p01);
      }
    }
  }

  toBufferGeometry(THREE) {
    if (this.vCount === 0) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this._pos.slice(0, this.vCount * 3), 3));
    if (this.hasUV && this._uvs) {
      g.setAttribute('uv', new THREE.BufferAttribute(this._uvs.slice(0, this.vCount * 2), 2));
    }
    g.computeVertexNormals();
    return g;
  }
}

export class PieceBuilder {
  constructor() {
    this.buckets = new Map();
    this._customIdx = 0;
  }

  use(material, userData = null) {
    if (!userData) {
      let entry = this.buckets.get(material);
      if (!entry) {
        entry = { material, builder: new GeomBuilder(), userData: null };
        this.buckets.set(material, entry);
      }
      return entry.builder;
    }
    const key = `ud_${++this._customIdx}`;
    const entry = { material, builder: new GeomBuilder(), userData };
    this.buckets.set(key, entry);
    return entry.builder;
  }

  build(THREE, spec) {
    const grp = new THREE.Group();
    grp.name = spec.id;
    let vertCount = 0, triCount = 0, meshCount = 0;
    for (const { material, builder, userData } of this.buckets.values()) {
      const geom = builder.toBufferGeometry(THREE);
      if (!geom) continue;
      const mesh = new THREE.Mesh(geom, material);
      if (userData) Object.assign(mesh.userData, userData);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      grp.add(mesh);
      const vc = geom.attributes.position.count;
      vertCount += vc;
      triCount += Math.floor(vc / 3);
      meshCount += 1;
    }
    return {
      piece: {
        id: spec.id,
        zone: 'zone2_arches_floor1',
        phase: spec.phase,
        span: spec.span,
        vanishSpan: spec.vanishSpan || null,
        object3D: grp,
        plateRefs: spec.plateRefs || ['20', '53', '67'],
        photoRefs: spec.photoRefs || ['36', '18'],
      },
      vertCount,
      triCount,
      meshCount,
    };
  }
}
