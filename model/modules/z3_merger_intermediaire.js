/**
 * Zone 3 Sub-Module C: Pier-to-Shaft Merger (Panneaux 12–17, +115.73m -> +179.0522m),
 * Lower Spiral Stair e2, 18.500m Collar (Pl. 70 Fig. 8), Unified Shaft P18–P19_lower,
 * Plancher des Machinistes (+193.67m) & Plancher Intermédiaire Édoux (+195.93m).
 */

import {
  PIERS, lerp, lerp3, mergerBounds, unifiedShaftHalfSpan, pierChordCenters,
  MeshBatch, MultiBatch, addLacedBoxChord, addLacedBeam, addBoxTruss4, addGussetTri,
} from './z3_geom_helpers.js';

const SQRT1_2 = Math.SQRT1_2;
const PIER_FACES = [[0, 1, [1, 0, 0]], [0, 2, [0, 0, 1]], [3, 1, [0, 0, 1]], [3, 2, [1, 0, 0]]];

function buildLowerMergerPanel(THREE, materials, id, name, y0, y1, span) {
  const mb = new MultiBatch(THREE, materials);
  const pri = mb.get('ironPrimary'), lat = mb.get('ironLattice');
  const b0 = mergerBounds(y0), b1 = mergerBounds(y1);
  for (const p of PIERS) {
    const c0 = pierChordCenters(p, b0.xo, b0.xi, y0);
    const c1 = pierChordCenters(p, b1.xo, b1.xi, y1);
    for (let i = 0; i < 4; i++) addLacedBoxChord(pri, lat, c0[i], c1[i], b0.cw, b1.cw, 9, true);
    for (const [iA, iB, nrm] of PIER_FACES) {
      addLacedBeam(pri, lat, c1[iA], c1[iB], 0.48, 0.30, [0, 1, 0], 0.68);
      addLacedBeam(pri, lat, c0[iA], c1[iB], 0.38, 0.24, nrm, 0.70);
      addLacedBeam(pri, lat, c0[iB], c1[iA], 0.38, 0.24, nrm, 0.70);
      const m0 = lerp3(c0[iA], c0[iB], 0.5), m1 = lerp3(c1[iA], c1[iB], 0.5);
      lat.addStrut(m0, lerp3(c0[iA], c1[iA], 0.5), 0.085, 0.11);
      lat.addStrut(m0, lerp3(c0[iB], c1[iB], 0.5), 0.085, 0.11);
      lat.addStrut(m1, lerp3(c0[iA], c1[iA], 0.5), 0.085, 0.11);
      lat.addStrut(m1, lerp3(c0[iB], c1[iB], 0.5), 0.085, 0.11);
      addGussetTri(pri, c1[iA], lerp3(c1[iA], c1[iB], 0.16), lerp3(c1[iA], c0[iA], 0.14), 0.04);
      addGussetTri(pri, c1[iB], lerp3(c1[iB], c1[iA], 0.16), lerp3(c1[iB], c0[iB], 0.14), 0.04);
    }
    lat.addStrut(c1[0], c1[3], 0.14, 0.14);
    lat.addStrut(c1[1], c1[2], 0.14, 0.14);
  }
  // Inter-pier horizontal Entretoises & full-panel central Saint-André X-bracing across all 4 faces (Pl. 34 Figs. 5–8, Pl. 66 Fig. 2, Pl. 55)
  const yBot = y0 + 0.35, yTop = y1 - 0.55;
  const bBot = mergerBounds(yBot), bTop = mergerBounds(yTop);
  const uBot = bBot.xi - 0.14, uTop = bTop.xi - 0.14, tCross = uBot / Math.max(0.01, uBot + uTop);
  for (let f = 0; f < 4; f++) {
    const nrm = f < 2 ? [0, 0, 1] : [1, 0, 0];
    addBoxTruss4(pri, lat, shaftFacePt(f, -b1.xi, b1.hsOuter, y1 - 0.16, 0.24),
      shaftFacePt(f, +b1.xi, b1.hsOuter, y1 - 0.16, 0.24), 0.46, 0.28, nrm, 0.65, true);
    const vBL = shaftFacePt(f, -uBot, bBot.hsOuter, yBot, 0.24), vBR = shaftFacePt(f, +uBot, bBot.hsOuter, yBot, 0.24);
    const vTL = shaftFacePt(f, -uTop, bTop.hsOuter, yTop, 0.24), vTR = shaftFacePt(f, +uTop, bTop.hsOuter, yTop, 0.24);
    addBoxTruss4(pri, lat, vBL, vTR, 0.44, 0.28, nrm, 0.64, true);
    addBoxTruss4(pri, lat, vBR, vTL, 0.44, 0.28, nrm, 0.64, true);
    addOctagonGusset(pri, lerp3(vBL, vTR, tCross), f, 0.58, 0.045);
    addGussetTri(pri, vBL, lerp3(vBL, vBR, 0.85 / Math.max(1.0, 2 * uBot)), lerp3(vBL, vTL, 0.085), 0.042);
    addGussetTri(pri, vBR, lerp3(vBR, vBL, 0.85 / Math.max(1.0, 2 * uBot)), lerp3(vBR, vTR, 0.085), 0.042);
    addGussetTri(pri, vTL, lerp3(vTL, vTR, 0.85 / Math.max(1.0, 2 * uTop)), lerp3(vTL, vBL, 0.085), 0.042);
    addGussetTri(pri, vTR, lerp3(vTR, vTL, 0.85 / Math.max(1.0, 2 * uTop)), lerp3(vTR, vBR, 0.085), 0.042);
  }
  for (const sgn of [-1, 1]) {
    lat.addStrut([-b1.xi, y1, sgn * b1.xi], [+b1.xi, y1, sgn * b1.xi], 0.22, 0.22);
    lat.addStrut([sgn * b1.xi, y1, -b1.xi], [sgn * b1.xi, y1, +b1.xi], 0.22, 0.22);
  }
  // Photo 01 (step 5.79): 3.2m P15 chord starter splice stubs (amorces, +148.22 -> +151.45m, nested inside P15)
  if (id === 'z3_merger_p14') {
    const yAm = 151.45, bAm = mergerBounds(yAm);
    for (const p of PIERS) {
      addLacedBoxChord(pri, lat, [p.sx * b1.xo, y1, p.sz * b1.xo], [p.sx * bAm.xo, yAm, p.sz * bAm.xo], 0.68, 0.68, 3, true);
    }
    for (let f = 0; f < 4; f++) {
      const nrm = f < 2 ? [0, 0, 1] : [1, 0, 0];
      for (const sgn of [-1, 1]) {
        addBoxTruss4(pri, lat, shaftFacePt(f, sgn * b1.xi, b1.hsOuter, y1, 0.14),
          shaftFacePt(f, sgn * bAm.xi, bAm.hsOuter, yAm, 0.14), 0.34, 0.24, nrm, 0.58, true);
      }
    }
  }
  return { id, name, phase: 5, span, obj: mb.buildGroup(id) };
}

function shaftFacePt(f, u, hs, y, inset = 0.14) {
  const d = hs - inset;
  if (f === 0) return [u, y, +d];
  if (f === 1) return [-u, y, -d];
  if (f === 2) return [+d, y, -u];
  return [-d, y, u];
}

function addZone4MatchedCornerChords(pri, lat, hs0, hs1, y0, y1, cw = 0.74, nLace = 10) {
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const offs = [[0, 0], [-cw, 0], [0, -cw], [-cw, -cw]];
    const bPts = offs.map(([ox, oz]) => [sx * (hs0 + ox), y0, sz * (hs0 + oz)]);
    const tPts = offs.map(([ox, oz]) => [sx * (hs1 + ox), y1, sz * (hs1 + oz)]);
    for (let k = 0; k < 4; k++) pri.addStrut(bPts[k], tPts[k], 0.115, 0.115, [1, 0, 0]);
    pri.addAxisBox(sx * (hs1 - cw * 0.5), y1 - 0.14, sz * (hs1 - cw * 0.5), cw + 0.06, 0.28, cw + 0.06);
    for (const [iA, iB] of [[0, 1], [1, 3], [3, 2], [2, 0]]) {
      for (let s = 0; s < nLace; s++) {
        const t0 = s / nLace, t1 = (s + 1) / nLace;
        lat.addStrut(s % 2 === 0 ? lerp3(bPts[iA], tPts[iA], t0) : lerp3(bPts[iB], tPts[iB], t0),
          s % 2 === 0 ? lerp3(bPts[iB], tPts[iB], t1) : lerp3(bPts[iA], tPts[iA], t1), 0.038, 0.038);
      }
    }
  }
}

// Pl. 70 Fig. 8 Horizontal Diaphragm Collar Grid (Poutres A, B, C, C', H, H', K & Poteaux A, B)
function addCollarDiaphragmGrid(pri, lat, hs, y, fullDetail = true) {
  const c = hs - 0.06;
  const mids = [[0, c], [c, 0], [0, -c], [-c, 0]];
  for (let i = 0; i < 4; i++) {
    const [x0, z0] = mids[i], [x1, z1] = mids[(i + 1) % 4];
    addBoxTruss4(pri, lat, [x0, y - 0.24, z0], [x1, y - 0.24, z1], 0.56, 0.46, [0, 1, 0], 0.72, true);
    pri.addAxisBox(x0 * 0.96, y - 0.24, z0 * 0.96, 0.92, 0.50, 0.92);
  }
  if (!fullDetail) return;
  const cA = hs - 0.34;
  addBoxTruss4(pri, lat, [+cA, y - 0.24, +cA], [-cA, y - 0.24, -cA], 0.40, 0.48, [0, 1, 0], 0.70, true);
  pri.addAxisBox(+c * 0.5, y - 0.24, +c * 0.5, 0.88, 0.50, 0.88);
  pri.addAxisBox(-c * 0.5, y - 0.24, -c * 0.5, 0.88, 0.50, 0.88);
  // Open X-laced 0.90m-wide Poutre H (-X,+Z Pile 3) & Poutre H' (+X,-Z Pile 1) + Poteaux A & B
  addBoxTruss4(pri, lat, [-2.62, y - 0.24, +3.08], [-8.68, y - 0.24, +8.92], 0.90, 0.46, [0, 1, 0], 0.84, true);
  addBoxTruss4(pri, lat, [+0.48, y - 0.24, -0.42], [+8.82, y - 0.24, -8.62], 0.90, 0.46, [0, 1, 0], 0.84, true);
  pri.addAxisBox(-2.82, y - 0.24, +2.92, 0.96, 0.52, 0.96); // Poteau B collar
  pri.addAxisBox(+1.45, y - 0.24, -0.55, 0.78, 0.50, 0.78); // Poteau A collar
  // Poutre K orthogonal struts framing Poteau B into Poutre C'
  pri.addStrut([-3.12, y - 0.24, +2.85], [-3.12, y - 0.24, +(c - 3.12)], 0.24, 0.38);
  pri.addStrut([-2.85, y - 0.24, +2.62], [-(c - 2.62), y - 0.24, +2.62], 0.24, 0.38);
}

// Pl. 53 Figs. 16–17: Compact 5.63m x 5.63m 45° Plancher des Machinistes (+193.67m)
function addMachinistesDeck(mb, y) {
  const pri = mb.get('ironPrimary'), lat = mb.get('ironLattice'), wood = mb.get('woodMachinistes');
  const cx = 0.20, cz = -1.05, h = 2.815; // Longr des fers = 5.630m
  const uV = [-SQRT1_2, SQRT1_2], vV = [SQRT1_2, SQRT1_2];
  const pt = (u, v) => [cx + u * uV[0] + v * vV[0], y, cz + u * uV[1] + v * vV[1]];
  const c = [pt(-h, -h), pt(h, -h), pt(h, h), pt(-h, h)];
  for (let i = 0; i < 4; i++) {
    const a = c[i], b = c[(i + 1) % 4];
    pri.addStrut([a[0], y - 0.22, a[2]], [b[0], y - 0.22, b[2]], 0.28, 0.44);
    pri.addStrut([a[0], y + 0.95, a[2]], [b[0], y + 0.95, b[2]], 0.055, 0.055);
  }
  pri.addStrut(pt(0.15, -h), pt(0.15, h), 0.22, 0.36);
  pri.addStrut([4.35, y - 0.22, -5.15], [4.35, y - 0.22, +2.75], 0.22, 0.38);
  const nG = 12, st = (2 * h) / nG;
  for (let iu = 0; iu < nG; iu++) {
    const u0 = -h + iu * st, u1 = u0 + st, um = (u0 + u1) * 0.5;
    for (let iv = 0; iv < nG; iv++) {
      const v0 = -h + iv * st, v1 = v0 + st, vm = (v0 + v1) * 0.5;
      const pm = pt(um, vm);
      if (Math.hypot(pm[0] + 1.591, pm[2] + 1.591) < 0.88 || Math.hypot(pm[0] - 1.591, pm[2] - 1.591) < 0.88) continue;
      if (um > 0.35 && Math.abs(vm) < 1.35) continue;
      wood.addQuad(pt(u0, v0), pt(u1, v0), pt(u1, v1), pt(u0, v1));
      if (iv % 2 === 0) lat.addStrut(pt(u0, v0), pt(u1, v0), 0.08, 0.16);
    }
  }
}

function addOctagonGusset(pri, center, f, radius = 0.65, thick = 0.045) {
  const ux = f === 0 ? 1 : f === 1 ? -1 : 0;
  const uz = f === 2 ? -1 : f === 3 ? 1 : 0;
  const nx = f === 2 ? 1 : f === 3 ? -1 : 0;
  const nz = f === 0 ? 1 : f === 1 ? -1 : 0;
  const ht = thick * 0.5;
  const ring = (sgn) => Array.from({ length: 8 }, (_, k) => {
    const a = (k + 0.5) * (Math.PI / 4);
    const cu = Math.cos(a) * radius, cv = Math.sin(a) * radius;
    return [center[0] + ux * cu + nx * sgn * ht, center[1] + cv, center[2] + uz * cu + nz * sgn * ht];
  });
  const fr = ring(1), bk = ring(-1);
  for (let k = 1; k < 7; k++) {
    pri.addTri(fr[0], fr[k], fr[k + 1]);
    pri.addTri(bk[0], bk[k + 1], bk[k]);
  }
}

function addPlatformDeckDiamond(mb, woodDeck, hs, y, walkwayOut) {
  const pri = mb.get('ironPrimary'), lat = mb.get('ironLattice');
  const c = 8.38, cCorner = walkwayOut - 0.24, hD = c * SQRT1_2;
  const uIn = 0.65, uOut = 3.76, vWell = 1.68, vStair = 2.250, rStair = 0.85;
  const mids = [[0, c], [c, 0], [0, -c], [-c, 0]];
  for (let i = 0; i < 4; i++) {
    const [x0, z0] = mids[i], [x1, z1] = mids[(i + 1) % 4];
    const [ix0, iz0] = [x0 * (c - 0.56) / c, z0 * (c - 0.56) / c], [ix1, iz1] = [x1 * (c - 0.56) / c, z1 * (c - 0.56) / c];
    pri.addStrut([(x0 + ix0) * 0.5, y - 0.22, (z0 + iz0) * 0.5], [(x1 + ix1) * 0.5, y - 0.22, (z1 + iz1) * 0.5], 0.52, 0.40);
    woodDeck.addStrut([x0, y + 0.025, z0], [x1, y + 0.025, z1], 0.16, 0.06);
    pri.addAxisBox(x0 * 0.97, y - 0.24, z0 * 0.97, 0.68, 0.44, 0.68);
  }
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    addBoxTruss4(pri, lat, [sx * cCorner, y - 0.26, sz * cCorner], [sx * c * 0.5, y - 0.26, sz * c * 0.5], 0.56, 0.42, [0, 1, 0], 0.64, true);
    pri.addAxisBox(sx * c * 0.5, y - 0.26, sz * c * 0.5, 0.78, 0.46, 0.78);
  }

  const uV = [-SQRT1_2, SQRT1_2], vV = [SQRT1_2, SQRT1_2];
  const dPt = (u, v, yy = y) => [u * uV[0] + v * vV[0], yy, u * uV[1] + v * vV[1]];
  const emitStrip = (u0, u1, va, vb) => {
    if (vb - va < 1e-3) return;
    woodDeck.addQuad(dPt(u0, va, y), dPt(u1, va, y), dPt(u1, vb, y), dPt(u0, vb, y));
    woodDeck.addQuad(dPt(u0, vb, y - 0.09), dPt(u1, vb, y - 0.09), dPt(u1, va, y - 0.09), dPt(u0, va, y - 0.09));
  };

  // Exact 45° (u, v) wood decking with analytic circular chord cuts around e1/e2 & crisp Ca1/Ca2 rectangular wells
  const uKnots = [];
  for (let s = 0; s < 12; s++) uKnots.push(lerp(-hD, -uOut, s / 12));
  for (let s = 0; s < 16; s++) uKnots.push(lerp(-uOut, -rStair, s / 16));
  for (let s = 0; s <= 12; s++) uKnots.push(lerp(-rStair, +rStair, s / 12));
  for (let s = 1; s <= 16; s++) uKnots.push(lerp(+rStair, +uOut, s / 16));
  for (let s = 1; s <= 12; s++) uKnots.push(lerp(+uOut, +hD, s / 12));

  for (let i = 0; i < uKnots.length - 1; i++) {
    const u0 = uKnots[i], u1 = uKnots[i + 1], um = (u0 + u1) * 0.5, au = Math.abs(um);
    if (au >= uOut - 1e-4) {
      emitStrip(u0, u1, -hD, +hD);
    } else if (au >= rStair - 1e-4) {
      emitStrip(u0, u1, -hD, -vWell);
      emitStrip(u0, u1, +vWell, +hD);
    } else {
      const dy0 = Math.sqrt(Math.max(0, rStair * rStair - u0 * u0));
      const dy1 = Math.sqrt(Math.max(0, rStair * rStair - u1 * u1));
      woodDeck.addQuad(dPt(u0, -hD, y), dPt(u1, -hD, y), dPt(u1, -vStair - dy1, y), dPt(u0, -vStair - dy0, y));
      woodDeck.addQuad(dPt(u0, -vStair - dy0, y - 0.09), dPt(u1, -vStair - dy1, y - 0.09), dPt(u1, -hD, y - 0.09), dPt(u0, -hD, y - 0.09));
      woodDeck.addQuad(dPt(u0, +vStair + dy0, y), dPt(u1, +vStair + dy1, y), dPt(u1, +hD, y), dPt(u0, +hD, y));
      woodDeck.addQuad(dPt(u0, +hD, y - 0.09), dPt(u1, +hD, y - 0.09), dPt(u1, +vStair + dy1, y - 0.09), dPt(u0, +vStair + dy0, y - 0.09));
      if (au >= uIn - 1e-4) {
        woodDeck.addQuad(dPt(u0, -vStair + dy0, y), dPt(u1, -vStair + dy1, y), dPt(u1, -vWell, y), dPt(u0, -vWell, y));
        woodDeck.addQuad(dPt(u0, +vWell, y), dPt(u1, +vWell, y), dPt(u1, +vStair - dy1, y), dPt(u0, +vStair - dy0, y));
      } else {
        woodDeck.addQuad(dPt(u0, -vStair + dy0, y), dPt(u1, -vStair + dy1, y), dPt(u1, +vStair - dy1, y), dPt(u0, +vStair - dy0, y));
        woodDeck.addQuad(dPt(u0, +vStair - dy0, y - 0.09), dPt(u1, +vStair - dy1, y - 0.09), dPt(u1, -vStair + dy1, y - 0.09), dPt(u0, -vStair + dy0, y - 0.09));
      }
    }
  }

  // 45° iron framing (Pl. 53 Fig. 14): corridor girders (±3.55m), full outer-diamond joists & open curbs
  const vCorr = 3.55, vLim = hD - 0.14;
  for (const sgn of [-1, 1]) {
    pri.addStrut(dPt(-hD, sgn * vWell, y - 0.21), dPt(+hD, sgn * vWell, y - 0.21), 0.15, 0.32);
    pri.addStrut(dPt(-hD, sgn * vCorr, y - 0.20), dPt(+hD, sgn * vCorr, y - 0.20), 0.12, 0.28);
    for (let k = -9; k <= 9; k++) {
      const u = k * 0.64, vc = sgn * vStair;
      if (Math.abs(u) > vLim) continue;
      if (Math.abs(u) < rStair - 0.02) {
        const dy = Math.sqrt(rStair * rStair - u * u);
        lat.addStrut(dPt(u, sgn * vWell, y - 0.16), dPt(u, vc - sgn * dy, y - 0.16), 0.08, 0.16);
        lat.addStrut(dPt(u, vc + sgn * dy, y - 0.16), dPt(u, sgn * vLim, y - 0.16), 0.08, 0.16);
      } else {
        lat.addStrut(dPt(u, sgn * vWell, y - 0.16), dPt(u, sgn * vLim, y - 0.16), 0.08, 0.16);
      }
    }
    for (const su of [-1, 1]) {
      pri.addStrut(dPt(su * uOut, sgn * vCorr, y - 0.20), dPt(su * uOut, sgn * hD, y - 0.20), 0.14, 0.26);
      lat.addStrut(dPt(su * uOut, sgn * vCorr, y - 0.19), dPt(su * 2.45, sgn * (hD - 0.08), y - 0.19), 0.09, 0.16);
    }
  }
  lat.addStrut(dPt(-uIn, 0, y - 0.16), dPt(+uIn, 0, y - 0.16), 0.09, 0.18);
  for (const sgn of [-1, 1]) {
    const ua = sgn * uIn, ub = sgn * uOut;
    for (const uT of [ua, ub]) pri.addStrut(dPt(uT, -vWell, y - 0.21), dPt(uT, +vWell, y - 0.21), 0.15, 0.32);
    lat.addStrut(dPt(ub, 0, y - 0.17), dPt(sgn * hD, 0, y - 0.17), 0.09, 0.18);
    lat.addStrut(dPt(sgn * 5.15, -vWell, y - 0.17), dPt(sgn * 5.15, +vWell, y - 0.17), 0.08, 0.16);
    for (const [pA, pB] of [[dPt(ua, -vWell, y + 0.03), dPt(ub, -vWell, y + 0.03)], [dPt(ub, -vWell, y + 0.03), dPt(ub, +vWell, y + 0.03)],
      [dPt(ub, +vWell, y + 0.03), dPt(ua, +vWell, y + 0.03)], [dPt(ua, +vWell, y + 0.03), dPt(ua, -vWell, y + 0.03)]]) {
      pri.addStrut(pA, pB, 0.11, 0.08);
      woodDeck.addStrut([pA[0], y + 0.075, pA[2]], [pB[0], y + 0.075, pB[2]], 0.12, 0.05);
    }
    const sc = dPt(0, sgn * vStair, y);
    pri.addFrustum(sc[0], sc[2], y - 0.22, rStair, y + 0.03, rStair, 24, false, false);
    for (let s = 0; s < 24; s++) {
      const a0 = (s / 24) * Math.PI * 2, a1 = ((s + 1) / 24) * Math.PI * 2;
      const rI = rStair + 0.04, rW = rStair + 0.05;
      pri.addStrut([sc[0] + Math.cos(a0) * rI, y + 0.02, sc[2] + Math.sin(a0) * rI],
        [sc[0] + Math.cos(a1) * rI, y + 0.02, sc[2] + Math.sin(a1) * rI], 0.09, 0.06);
      woodDeck.addStrut([sc[0] + Math.cos(a0) * rW, y + 0.055, sc[2] + Math.sin(a0) * rW],
        [sc[0] + Math.cos(a1) * rW, y + 0.055, sc[2] + Math.sin(a1) * rW], 0.11, 0.05);
    }
  }

  // Outer 8.68m square gallery walkway (`|x|,|z| <= 8.68m`, `Y <= 197.01m`) with continuous iron & wood curbs
  const wWoodIn = hs + 0.06, wBeamIn = walkwayOut - 0.20, wOut = walkwayOut - 0.02;
  const sqWoodIn = [[-wWoodIn, wWoodIn], [wWoodIn, wWoodIn], [wWoodIn, -wWoodIn], [-wWoodIn, -wWoodIn]];
  const sqBeamIn = [[-wBeamIn, wBeamIn], [wBeamIn, wBeamIn], [wBeamIn, -wBeamIn], [-wBeamIn, -wBeamIn]];
  const sqOut = [[-wOut, wOut], [wOut, wOut], [wOut, -wOut], [-wOut, -wOut]];
  for (let e = 0; e < 4; e++) {
    const j = (e + 1) % 4;
    pri.addStrut([sqBeamIn[e][0], y - 0.36, sqBeamIn[e][1]], [sqOut[e][0], y - 0.10, sqOut[e][1]], 0.24, 0.22);
    pri.addStrut([sqOut[e][0], y - 0.08, sqOut[e][1]], [sqOut[j][0], y - 0.08, sqOut[j][1]], 0.14, 0.24);
    pri.addStrut([sqBeamIn[e][0], y - 0.08, sqBeamIn[e][1]], [sqBeamIn[j][0], y - 0.08, sqBeamIn[j][1]], 0.10, 0.20);
    const xm = (sqOut[e][0] + sqOut[j][0]) * 0.5, zm = (sqOut[e][1] + sqOut[j][1]) * 0.5;
    const xdm = (mids[e][0]), zdm = (mids[e][1]);
    pri.addStrut([xdm, y - 0.24, zdm], [xm, y - 0.09, zm], 0.22, 0.22);
    woodDeck.addStrut([sqOut[e][0], y + 0.04, sqOut[e][1]], [sqOut[j][0], y + 0.04, sqOut[j][1]], 0.12, 0.08);
    woodDeck.addStrut([sqWoodIn[e][0], y + 0.03, sqWoodIn[e][1]], [sqWoodIn[j][0], y + 0.03, sqWoodIn[j][1]], 0.10, 0.06);
    pri.addStrut([sqOut[e][0], y + 0.98, sqOut[e][1]], [sqOut[j][0], y + 0.98, sqOut[j][1]], 0.06, 0.06);
    lat.addStrut([sqOut[e][0], y + 0.50, sqOut[e][1]], [sqOut[j][0], y + 0.50, sqOut[j][1]], 0.04, 0.04);
    for (let s = 0; s < 10; s++) {
      const t0 = s / 10, t1 = (s + 1) / 10;
      const i0 = [lerp(sqWoodIn[e][0], sqWoodIn[j][0], t0), lerp(sqWoodIn[e][1], sqWoodIn[j][1], t0)];
      const i1 = [lerp(sqWoodIn[e][0], sqWoodIn[j][0], t1), lerp(sqWoodIn[e][1], sqWoodIn[j][1], t1)];
      const o0 = [lerp(sqOut[e][0], sqOut[j][0], t0), lerp(sqOut[e][1], sqOut[j][1], t0)];
      const o1 = [lerp(sqOut[e][0], sqOut[j][0], t1), lerp(sqOut[e][1], sqOut[j][1], t1)];
      woodDeck.addQuad([i0[0], y, i0[1]], [i1[0], y, i1[1]], [o1[0], y, o1[1]], [o0[0], y, o0[1]]);
      woodDeck.addQuad([o0[0], y - 0.08, o0[1]], [o1[0], y - 0.08, o1[1]], [i1[0], y - 0.08, i1[1]], [i0[0], y - 0.08, i0[1]]);
      pri.addStrut([o0[0], y, o0[1]], [o0[0], y + 1.00, o0[1]], 0.055, 0.055, [1, 0, 0]);
      lat.addStrut([o0[0], y + 0.08, o0[1]], [o1[0], y + 0.95, o1[1]], 0.034, 0.034);
      lat.addStrut([o1[0], y + 0.08, o1[1]], [o0[0], y + 0.95, o0[1]], 0.034, 0.034);
    }
  }
}

export function buildMergerAndIntermediaire(THREE, materials) {
  const pieces = [
    buildLowerMergerPanel(THREE, materials, 'z3_merger_p12', 'Panneau 12 Merger (+115.73–127.23m)', 115.7300, 127.2300, [5.50, 5.64]),
    buildLowerMergerPanel(THREE, materials, 'z3_merger_p13', 'Panneau 13 Merger (+127.23–137.85m)', 127.2300, 137.8541, [5.69, 5.80]),
    buildLowerMergerPanel(THREE, materials, 'z3_merger_p14', 'Panneau 14 Merger (+137.85–148.22m)', 137.8541, 148.2235, [5.77, 5.88]),
  ];

  // Spiral Stairs e2 (+115.73->179.05m), e1 (+115.73->195.93m + top guardrail, Pl. 08 Fig. 2 & Pl. 53 Fig. 14) & P17 Escalier tournant
  const mbStair = new MultiBatch(THREE, materials);
  const priS = mbStair.get('ironPrimary'), latS = mbStair.get('ironLattice');
  for (const [sxS, szS, yA, yB, nSt, aEnd] of [[-1.591, -1.591, 115.73, 179.0522, 195, null], [+1.591, +1.591, 115.73, 195.9300, 248, Math.PI * 0.24], [+1.45, -2.45, 170.6, 179.0522, 30, null]]) {
    const yPostTop = aEnd !== null ? yB + 0.95 : yB;
    priS.addStrut([sxS, yA, szS], [sxS, yPostTop, szS], 0.19, 0.19, [1, 0, 0]);
    for (let i = 0; i < nSt; i++) {
      const a0 = aEnd !== null ? aEnd - (nSt - i) * 0.34 : i * 0.34;
      const a1 = aEnd !== null ? aEnd - (nSt - i - 1) * 0.34 : (i + 1) * 0.34;
      const ya = lerp(yA, yB, i / nSt), yb = lerp(yA, yB, (i + 1) / nSt);
      const rx0 = sxS + Math.cos(a0) * 0.78, rz0 = szS + Math.sin(a0) * 0.78, rx1 = sxS + Math.cos(a1) * 0.78, rz1 = szS + Math.sin(a1) * 0.78;
      latS.addStrut([sxS, ya, szS], [rx0, ya, rz0], 0.14, 0.04);
      priS.addStrut([rx0, ya, rz0], [rx1, yb, rz1], 0.05, 0.14);
      const hr0 = Math.min(yB + 0.95, ya + 0.92), hr1 = Math.min(yB + 0.95, yb + 0.92);
      latS.addStrut([rx0, hr0, rz0], [rx1, hr1, rz1], 0.04, 0.04);
      if (i % 3 === 0) latS.addStrut([rx0, ya, rz0], [rx0, Math.min(yB + 0.95, ya + 0.94), rz0], 0.035, 0.035, [1, 0, 0]);
    }
    if (aEnd !== null) {
      const rG = 0.89, aGap0 = aEnd + 0.02, aGap1 = aEnd + 0.90, nArc = 18;
      for (let s = 0; s < nArc; s++) {
        const aa = lerp(aGap1, aGap0 + Math.PI * 2, s / nArc), ab = lerp(aGap1, aGap0 + Math.PI * 2, (s + 1) / nArc);
        const p0 = [sxS + Math.cos(aa) * rG, yB, szS + Math.sin(aa) * rG], p1 = [sxS + Math.cos(ab) * rG, yB, szS + Math.sin(ab) * rG];
        priS.addStrut([p0[0], yB + 0.95, p0[2]], [p1[0], yB + 0.95, p1[2]], 0.05, 0.05);
        latS.addStrut([p0[0], yB + 0.48, p0[2]], [p1[0], yB + 0.48, p1[2]], 0.036, 0.036);
        priS.addStrut(p0, [p0[0], yB + 0.95, p0[2]], 0.042, 0.042, [1, 0, 0]);
        latS.addStrut([p0[0], yB + 0.06, p0[2]], [p1[0], yB + 0.92, p1[2]], 0.028, 0.028);
        latS.addStrut([p1[0], yB + 0.06, p1[2]], [p0[0], yB + 0.92, p0[2]], 0.028, 0.028);
      }
      const pEnd = [sxS + Math.cos(aGap0) * rG, yB, szS + Math.sin(aGap0) * rG];
      priS.addStrut(pEnd, [pEnd[0], yB + 0.95, pEnd[2]], 0.048, 0.048, [1, 0, 0]);
    }
  }
  pieces.push({ id: 'z3_stair_e2_lower', name: 'Twin Helical Spiral Staircases e1 (+115.73–195.93m) & e2 (+115.73–179.05m)', phase: 6, span: [6.12, 6.20], obj: mbStair.buildGroup('z3_stair_e2_lower') });

  // Panneau 15 ([5.72, 5.78] for Photo 01 at step 5.79) + Panneaux 16–17 & 18.500m Collar ([5.98, 6.13], Pl. 70)
  const addUpperMergerBand = (mb, ya, yb, vGapMode) => {
    const priM = mb.get('ironPrimary'), latM = mb.get('ironLattice');
    const ba = mergerBounds(ya), bb = mergerBounds(yb);
    const yBot = ya + 0.48, yTop = yb - 0.52, bBot = mergerBounds(yBot), bTop = mergerBounds(yTop);
    const wBot = (bBot.hsOuter - 0.70) - (bBot.xi + 0.14), wTop = (bTop.hsOuter - 0.70) - (bTop.xi + 0.14);
    const tCross = wBot / Math.max(0.01, wBot + wTop);
    addZone4MatchedCornerChords(priM, latM, ba.hsOuter, bb.hsOuter, ya, yb, 0.74, 10);
    for (let f = 0; f < 4; f++) {
      const nrm = f < 2 ? [0, 0, 1] : [1, 0, 0];
      const uOutB = bb.hsOuter - 0.42;
      for (const sgn of [-1, 1]) {
        addBoxTruss4(priM, latM, shaftFacePt(f, sgn * ba.xi, ba.hsOuter, ya),
          shaftFacePt(f, sgn * bb.xi, bb.hsOuter, yb), 0.38, 0.28, nrm, 0.70, true);
        const bOut = shaftFacePt(f, sgn * (bBot.hsOuter - 0.70), bBot.hsOuter, yBot);
        const tOut = shaftFacePt(f, sgn * (bTop.hsOuter - 0.70), bTop.hsOuter, yTop);
        const bIn = shaftFacePt(f, sgn * (bBot.xi + 0.14), bBot.hsOuter, yBot);
        const tIn = shaftFacePt(f, sgn * (bTop.xi + 0.14), bTop.hsOuter, yTop);
        addBoxTruss4(priM, latM, bOut, tIn, 0.48, 0.28, nrm, 0.66, true);
        addBoxTruss4(priM, latM, bIn, tOut, 0.48, 0.28, nrm, 0.66, true);
        addOctagonGusset(priM, lerp3(bOut, tIn, tCross), f, 0.65, 0.045);
        addGussetTri(priM, bOut, lerp3(bOut, bIn, 0.95 / wBot), lerp3(bOut, tOut, 0.095), 0.045);
        addGussetTri(priM, tOut, lerp3(tOut, tIn, 0.95 / wTop), lerp3(tOut, bOut, 0.095), 0.045);
        addGussetTri(priM, bIn, lerp3(bIn, bOut, 0.95 / wBot), lerp3(bIn, tIn, 0.095), 0.045);
        addGussetTri(priM, tIn, lerp3(tIn, tOut, 0.95 / wTop), lerp3(tIn, bIn, 0.095), 0.045);
      }
      addBoxTruss4(priM, latM, shaftFacePt(f, -uOutB, bb.hsOuter, yb, 0.28), shaftFacePt(f, +uOutB, bb.hsOuter, yb, 0.28), 0.56, 0.62, [0, 1, 0], 0.68, true);
      if (vGapMode > 0) {
        const yVx0 = vGapMode === 1 ? ya + 0.25 : ya + 0.16, yVx1 = vGapMode === 1 ? yb - 0.72 : 167.72;
        const bVx0 = mergerBounds(yVx0), bVx1 = mergerBounds(yVx1);
        const uVx0 = bVx0.xi - (vGapMode === 1 ? 0.16 : 0.12), uVx1 = bVx1.xi - 0.12, tVx = uVx0 / (uVx0 + uVx1);
        const vBL = shaftFacePt(f, -uVx0, bVx0.hsOuter, yVx0), vBR = shaftFacePt(f, +uVx0, bVx0.hsOuter, yVx0);
        const vTL = shaftFacePt(f, -uVx1, bVx1.hsOuter, yVx1), vTR = shaftFacePt(f, +uVx1, bVx1.hsOuter, yVx1);
        addBoxTruss4(priM, latM, vBL, vTR, 0.36, 0.24, nrm, 0.56, true);
        addBoxTruss4(priM, latM, vBR, vTL, 0.36, 0.24, nrm, 0.56, true);
        const pMid = lerp3(vBL, vTR, tVx);
        addOctagonGusset(priM, pMid, f, 0.50, 0.048);
        if (vGapMode === 2) {
          priM.addStrut(shaftFacePt(f, 0, mergerBounds(pMid[1] - 0.58).hsOuter, pMid[1] - 0.58),
            shaftFacePt(f, 0, mergerBounds(pMid[1] + 0.58).hsOuter, pMid[1] + 0.58), 0.74, 0.055, nrm);
          for (const sgn of [-1, 1]) {
            const bSp0 = mergerBounds(166.75), bSp1 = mergerBounds(169.02);
            priM.addStrut(shaftFacePt(f, sgn * (bSp0.xi - 0.12), bSp0.hsOuter, 166.75),
              shaftFacePt(f, sgn * (bSp1.xi - 0.10), bSp1.hsOuter, 169.02), 0.38, 0.06, nrm);
          }
        }
      }
    }
    addCollarDiaphragmGrid(priM, latM, bb.hsOuter, yb, vGapMode === 0);
  };

  const mbP15 = new MultiBatch(THREE, materials);
  addUpperMergerBand(mbP15, 148.2235, 158.5940, 1);
  pieces.push({ id: 'z3_merger_p15', name: 'Panneau 15 Merger (+148.22–158.59m)', phase: 6, span: [5.85, 5.98], obj: mbP15.buildGroup('z3_merger_p15') });

  const mbMrg = new MultiBatch(THREE, materials);
  addUpperMergerBand(mbMrg, 158.5940, 169.0240, 2);
  addUpperMergerBand(mbMrg, 169.0240, 179.0522, 0);
  pieces.push({ id: 'z3_merger_p15_p17_collar', name: 'Panneaux 16–17 Shaft Merger & 18.500m Collar (+158.59–179.05m)', phase: 6, span: [5.98, 6.13], obj: mbMrg.buildGroup('z3_merger_p15_p17_collar') });

  // Unified Square Shaft P18 (+179.0522->189.0703m), P19_lower (->195.930m), Machinistes & Intermédiaire
  const mbUp = new MultiBatch(THREE, { ...materials, woodMachinistes: materials.woodPavilion });
  const priU = mbUp.get('ironPrimary'), latU = mbUp.get('ironLattice');
  for (const [ya, yb] of [[179.0522, 189.0703], [189.0703, 195.9300]]) {
    const hsA = unifiedShaftHalfSpan(ya), hsB = unifiedShaftHalfSpan(yb);
    const yBot = ya + 0.45, yTop = yb - 0.50, hBot = unifiedShaftHalfSpan(yBot), hTop = unifiedShaftHalfSpan(yTop);
    const wBot = (hBot - 0.68) - 0.36, wTop = (hTop - 0.68) - 0.36, tCross = wBot / Math.max(0.01, wBot + wTop);
    addZone4MatchedCornerChords(priU, latU, hsA, hsB, ya, yb, 0.72, Math.round((yb - ya) / 0.85));
    for (let f = 0; f < 4; f++) {
      const nrm = f < 2 ? [0, 0, 1] : [1, 0, 0];
      for (const uP of [-0.23, 0.23]) priU.addStrut(shaftFacePt(f, uP, hsA, ya), shaftFacePt(f, uP, hsB, yb), 0.11, 0.24, [1, 0, 0]);
      if (yb <= 195.0) {
        addBoxTruss4(priU, latU, shaftFacePt(f, -(hsB - 0.42), hsB, yb, 0.34), shaftFacePt(f, +(hsB - 0.42), hsB, yb, 0.34), 0.54, 0.62, [0, 1, 0], 0.68, true);
      }
      for (const sgn of [-1, 1]) {
        const bOut = shaftFacePt(f, sgn * (hBot - 0.68), hBot, yBot), tOut = shaftFacePt(f, sgn * (hTop - 0.68), hTop, yTop);
        const bIn = shaftFacePt(f, sgn * 0.36, hBot, yBot), tIn = shaftFacePt(f, sgn * 0.36, hTop, yTop);
        addBoxTruss4(priU, latU, bOut, tIn, 0.48, 0.26, nrm, 0.66, true);
        addBoxTruss4(priU, latU, bIn, tOut, 0.48, 0.26, nrm, 0.66, true);
        addOctagonGusset(priU, lerp3(bOut, tIn, tCross), f, 0.65, 0.045);
        addGussetTri(priU, bOut, lerp3(bOut, bIn, 0.95 / wBot), lerp3(bOut, tOut, 0.095), 0.045);
        addGussetTri(priU, tOut, lerp3(tOut, tIn, 0.95 / wTop), lerp3(tOut, bOut, 0.095), 0.045);
        addGussetTri(priU, bIn, lerp3(bIn, bOut, 0.95 / wBot), lerp3(bIn, tIn, 0.095), 0.045);
        addGussetTri(priU, tIn, lerp3(tIn, tOut, 0.95 / wTop), lerp3(tIn, bIn, 0.095), 0.045);
      }
    }
  }
  addMachinistesDeck(mbUp, 193.67);
  const woodDeckBatch = new MeshBatch();
  addPlatformDeckDiamond(mbUp, woodDeckBatch, unifiedShaftHalfSpan(195.93), 195.93, 8.68);
  const upGrp = mbUp.buildGroup('z3_shaft_p18_p19_interm');
  const deckMesh = woodDeckBatch.toMesh(THREE, materials.woodPavilion, 'z3_intermediaire_wood_deck');
  if (deckMesh) {
    deckMesh.userData.isWoodDecking = true;
    upGrp.add(deckMesh);
  }
  pieces.push({ id: 'z3_shaft_p18_p19_interm', name: 'Panneaux 18–19, Machinistes & Plancher Intermédiaire (+179.05–195.93m)', phase: 6, span: [6.12, 6.20], obj: upGrp });

  return pieces;
}
