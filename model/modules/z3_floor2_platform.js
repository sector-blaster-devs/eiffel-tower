/**
 * Zone 3 Sub-Module B1: 2nd Platform Structural Girders, Floor Grillage, Openings,
 * Console R Brackets & Chamfered Observation Deck (+110.6292m to +118.33m, Phase 5).
 */

import {
  PIERS, lerp, lerp3, stage2PierBounds, pierChordCenters,
  MultiBatch, addLacedBoxChord, addBoxTruss4,
} from './z3_geom_helpers.js';

const SQRT1_2 = Math.SQRT1_2;

export function chamferedSquareVerts(halfSpan, chamfer) {
  const c = halfSpan - chamfer;
  return [
    [-c, +halfSpan], [+c, +halfSpan], [+halfSpan, +c], [+halfSpan, -c],
    [+c, -halfSpan], [-c, -halfSpan], [-halfSpan, -c], [-halfSpan, +c],
  ];
}

// Co-registered clear floor cutouts for Zone 5 Otis (P1, P3), Stairs (P2, P4), Edoux & e1/e2
export function isFloor2Opening(x, z) {
  const d13 = (-x + z) * SQRT1_2; // + toward Pile 3 (-X,+Z), - toward Pile 1 (+X,-Z)
  const d24 = (x + z) * SQRT1_2;  // + toward Pile 2 (+X,+Z), - toward Pile 4 (-X,-Z)

  // Pile 1 (-12.20 on d13) & Pile 3 (+12.20 on d13) Otis inclined elevator openings
  if (Math.abs(Math.abs(d13) - 12.20) < 2.65 && Math.abs(d24) < 2.65) return true;
  // Pile 2 (+13.30 on d24) & Pile 4 (-13.30 on d24) service stairwell openings
  if (Math.abs(Math.abs(d24) - 13.30) < 1.85 && Math.abs(d13) < 2.80) return true;
  // Central 45° Edoux cabin Ca1, hydraulic cylinders Cy, & spiral stairs e1/e2
  if (d13 > -0.35 && d13 < 4.45 && Math.abs(d24) < 2.05) return true;
  if (d13 > -4.45 && d13 <= -0.35 && Math.abs(d24) < 1.35) return true;
  if (Math.hypot(x - 1.591, z - 1.591) < 0.98) return true;
  if (Math.hypot(x + 1.591, z + 1.591) < 0.98) return true;
  return false;
}

function planePt(pl, u, y) {
  const { xo, xi } = stage2PierBounds(y);
  switch (pl) {
    case 0: return [u, y, +xo];
    case 1: return [u, y, -xo];
    case 2: return [+xo, y, u];
    case 3: return [-xo, y, u];
    case 4: return [u, y, +xi];
    case 5: return [u, y, -xi];
    case 6: return [+xi, y, u];
    default: return [-xi, y, u];
  }
}

function addP11GirderSpan(pri, lat, pl, u0A, u0B, u1A, u1B, y0, y1, nBays) {
  const nrm = pl < 2 || (pl >= 4 && pl < 6) ? [0, 0, 1] : [1, 0, 0];
  const ym = (y0 + y1) * 0.5;
  const p0A = planePt(pl, u0A, y0), p0B = planePt(pl, u0B, y0);
  const p1A = planePt(pl, u1A, y1), p1B = planePt(pl, u1B, y1);
  const pmA = lerp3(p0A, p1A, 0.5), pmB = lerp3(p0B, p1B, 0.5);

  // Double-tier girder chords (bottom 110.63m, mid 113.18m, top 115.73m — Pl. 66 Fig. 2 & Photo 46)
  pri.addStrut(p0A, p0B, 0.34, 0.44, [0, 1, 0]);
  pri.addStrut(pmA, pmB, 0.20, 0.34, [0, 1, 0]);
  pri.addStrut(p1A, p1B, 0.36, 0.46, [0, 1, 0]);

  for (let i = 0; i <= nBays; i++) {
    const t = i / nBays;
    const bL = lerp3(p0A, p0B, t), mL = lerp3(pmA, pmB, t), tL = lerp3(p1A, p1B, t);
    pri.addStrut(bL, tL, 0.16, 0.28, nrm);
    if (i < nBays) {
      const tNext = (i + 1) / nBays;
      const bR = lerp3(p0A, p0B, tNext), mR = lerp3(pmA, pmB, tNext), tR = lerp3(p1A, p1B, tNext);
      lat.addStrut(bL, mR, 0.095, 0.16, nrm);
      lat.addStrut(bR, mL, 0.095, 0.16, nrm);
      lat.addStrut(mL, tR, 0.095, 0.16, nrm);
      lat.addStrut(mR, tL, 0.095, 0.16, nrm);
    }
  }
  void ym;
}

function addDiamondOpeningFrame(pri, lat, cx, cz, halfU, halfV, yDeck) {
  const uVec = [-SQRT1_2, SQRT1_2], vVec = [SQRT1_2, SQRT1_2];
  const corners = [[-halfU, -halfV], [halfU, -halfV], [halfU, halfV], [-halfU, halfV]].map(([u, v]) => [
    cx + u * uVec[0] + v * vVec[0],
    cz + u * uVec[1] + v * vVec[1],
  ]);
  for (let i = 0; i < 4; i++) {
    const [x0, z0] = corners[i], [x1, z1] = corners[(i + 1) % 4];
    addBoxTruss4(pri, lat, [x0, yDeck - 0.34, z0], [x1, yDeck - 0.34, z1], 0.42, 0.56, [0, 1, 0], 0.65, true);
    pri.addStrut([x0, yDeck + 1.05, z0], [x1, yDeck + 1.05, z1], 0.06, 0.06);
    lat.addStrut([x0, yDeck + 0.52, z0], [x1, yDeck + 0.52, z1], 0.04, 0.04);
    pri.addStrut([x0, yDeck, z0], [x0, yDeck + 1.08, z0], 0.07, 0.07, [1, 0, 0]);
  }
}

export function buildFloor2Structural(THREE, materials) {
  const pieces = [];
  const y0 = 110.6292, yDeck = 115.7300;
  const b0 = stage2PierBounds(y0), b1 = stage2PierBounds(yDeck);

  // 1. Panneau 11 Double-Tier Diamond-Lattice Girders (+110.63 -> +115.73m)
  const mbGird = new MultiBatch(THREE, materials);
  const priG = mbGird.get('ironPrimary'), latG = mbGird.get('ironLattice');
  for (const p of PIERS) {
    const c0 = pierChordCenters(p, b0.xo, b0.xi, y0);
    const c1 = pierChordCenters(p, b1.xo, b1.xi, yDeck);
    for (let i = 0; i < 4; i++) addLacedBoxChord(priG, latG, c0[i], c1[i], b0.cw, b1.cw, 6, true);
  }
  for (let pl = 0; pl < 8; pl++) {
    addP11GirderSpan(priG, latG, pl, -b0.xo, -b0.xi, -b1.xo, -b1.xi, y0, yDeck, 5);
    addP11GirderSpan(priG, latG, pl, -b0.xi, +b0.xi, -b1.xi, +b1.xi, y0, yDeck, 6);
    addP11GirderSpan(priG, latG, pl, +b0.xi, +b0.xo, +b1.xi, +b1.xo, y0, yDeck, 5);
  }
  pieces.push({ id: 'z3_floor2_girders_p11', name: 'Panneau 11 2e Étage Main Lattice Girders (+110.63–115.73m)', phase: 5, span: [5.24, 5.42], obj: mbGird.buildGroup('z3_floor2_girders_p11') });

  // 2. Floor Grillage, Openings, Console R Brackets, Chamfered Deck & Railing (Pl. 53 Fig. 12 & Pl. 45)
  const mbDeck = new MultiBatch(THREE, materials);
  const pri = mbDeck.get('ironPrimary'), lat = mbDeck.get('ironLattice'), wood = mbDeck.get('woodPavilion');
  const hsCore = b1.xo + 0.38; // 15.815m (exact 31.63m structural core edge)
  const hsDeck = 19.38;        // Exact 38.76m Pl. 53 Fig. 12 outer Console R fascia, while railing/scroll sit at ±17.65..17.95m (Pl. 45)
  const chamfer = 1.08;

  // Timber deck planks across 31.63m core (tagged isWoodDecking=true below so framing plans show pure iron)
  const nGrid = 32, stepG = (hsCore * 2) / nGrid;
  for (let ix = 0; ix < nGrid; ix++) {
    const xA = -hsCore + ix * stepG, xB = xA + stepG, xm = (xA + xB) * 0.5;
    for (let iz = 0; iz < nGrid; iz++) {
      const zA = -hsCore + iz * stepG, zB = zA + stepG, zm = (zA + zB) * 0.5;
      if (isFloor2Opening(xm, zm)) continue;
      wood.addQuad([xA, yDeck, zB], [xB, yDeck, zB], [xB, yDeck, zA], [xA, yDeck, zA]);
      wood.addQuad([xA, yDeck - 0.14, zA], [xB, yDeck - 0.14, zA], [xB, yDeck - 0.14, zB], [xA, yDeck - 0.14, zB]);
    }
  }

  // 4 N/S/E/W Cardinal Side Bays (Pl. 53 Fig. 12): 14 face-parallel 0.68m solives, 3 Poutres F, & true 45° X wind-bracing
  const cardPt = (face, u, w, yy = yDeck - 0.24) => (
    face === 0 ? [u, yy, +w] : face === 1 ? [u, yy, -w] : face === 2 ? [+w, yy, u] : [-w, yy, u]
  );
  for (let f = 0; f < 4; f++) {
    for (let k = 0; k < 14; k++) {
      const w = 6.42 + k * 0.68;
      lat.addStrut(cardPt(f, -b1.xi, w), cardPt(f, +b1.xi, w), 0.085, 0.20);
    }
    for (const uF of [-3.48, 0.0, +3.48]) {
      pri.addStrut(cardPt(f, uF, b1.xi, yDeck - 0.28), cardPt(f, uF, b1.xo, yDeck - 0.28), 0.20, 0.34);
    }
    for (const wF of [8.26, 11.15, 14.04]) {
      pri.addStrut(cardPt(f, -b1.xi, wF, yDeck - 0.28), cardPt(f, +b1.xi, wF, yDeck - 0.28), 0.16, 0.30);
    }
    lat.addStrut(cardPt(f, -5.95, b1.xi, yDeck - 0.31), cardPt(f, +4.65, b1.xo, yDeck - 0.31), 0.17, 0.24);
    lat.addStrut(cardPt(f, +5.95, b1.xi, yDeck - 0.31), cardPt(f, -4.65, b1.xo, yDeck - 0.31), 0.17, 0.24);
    for (const [gu, gw, gs] of [[0, 11.15, 0.64], [-3.48, 8.26, 0.46], [3.48, 8.26, 0.46], [-3.48, 13.75, 0.46], [3.48, 13.75, 0.46]]) {
      const gp = cardPt(f, gu, gw, yDeck - 0.30);
      pri.addAxisBox(gp[0], gp[1], gp[2], gs, 0.36, gs);
    }
  }

  // 4 Corner Pier Bays (Piles 1–4): 0.72m orthogonal solives around openings + outer perimeter X-bracing
  const nPier = 13, stepP = (b1.xo - b1.xi) / nPier;
  for (const p of PIERS) {
    for (let i = 0; i <= nPier; i++) {
      const u = b1.xi + i * stepP;
      for (let j = 0; j < nPier; j++) {
        const v0 = b1.xi + j * stepP, v1 = v0 + stepP, vm = (v0 + v1) * 0.5;
        if (!isFloor2Opening(p.sx * u, p.sz * vm) && i > 0 && i < nPier) {
          lat.addStrut([p.sx * u, yDeck - 0.24, p.sz * v0], [p.sx * u, yDeck - 0.24, p.sz * v1], 0.085, 0.20);
        }
        if (!isFloor2Opening(p.sx * vm, p.sz * u) && i > 0 && i < nPier) {
          lat.addStrut([p.sx * v0, yDeck - 0.24, p.sz * u], [p.sx * v1, yDeck - 0.24, p.sz * u], 0.085, 0.20);
        }
      }
    }
    const uIn = b1.xi, uStrip = b1.xo - 2.35, uOut = b1.xo;
    pri.addStrut([p.sx * uStrip, yDeck - 0.28, p.sz * uIn], [p.sx * uStrip, yDeck - 0.28, p.sz * uOut], 0.18, 0.32);
    pri.addStrut([p.sx * uIn, yDeck - 0.28, p.sz * uStrip], [p.sx * uOut, yDeck - 0.28, p.sz * uStrip], 0.18, 0.32);
    for (let k = 0; k < 4; k++) {
      const a = lerp(uIn, uOut, k / 4), b = lerp(uIn, uOut, (k + 1) / 4);
      lat.addStrut([p.sx * uStrip, yDeck - 0.30, p.sz * a], [p.sx * uOut, yDeck - 0.30, p.sz * b], 0.13, 0.20);
      lat.addStrut([p.sx * uOut, yDeck - 0.30, p.sz * a], [p.sx * uStrip, yDeck - 0.30, p.sz * b], 0.13, 0.20);
      lat.addStrut([p.sx * a, yDeck - 0.30, p.sz * uStrip], [p.sx * b, yDeck - 0.30, p.sz * uOut], 0.13, 0.20);
      lat.addStrut([p.sx * a, yDeck - 0.30, p.sz * uOut], [p.sx * b, yDeck - 0.30, p.sz * uStrip], 0.13, 0.20);
    }
    pri.addStrut([p.sx * (uOut - 2.1), yDeck - 0.28, p.sz * uOut], [p.sx * uOut, yDeck - 0.28, p.sz * (uOut - 2.1)], 0.18, 0.30);
    pri.addStrut([p.sx * uOut, yDeck - 0.30, p.sz * uOut], [p.sx * 11.4, yDeck - 0.30, p.sz * 11.4], 0.20, 0.32);
    pri.addStrut([p.sx * uIn, yDeck - 0.30, p.sz * uIn], [p.sx * 7.6, yDeck - 0.30, p.sz * 7.6], 0.20, 0.32);
  }

  // Central [-6.02..+6.02m] 45° Floor Joists (0.68m pitch) + NE Edoux Machinery Sub-Grid (M on Pl. 53 Fig. 12)
  const uV = [-SQRT1_2, SQRT1_2], vV = [SQRT1_2, SQRT1_2];
  const cPt = (u, v, yy = yDeck - 0.24) => [u * uV[0] + v * vV[0], yy, u * uV[1] + v * vV[1]];
  for (let ku = -12; ku <= 12; ku++) {
    const u = ku * 0.68;
    for (let kv = -12; kv < 12; kv++) {
      const v0 = kv * 0.68, v1 = (kv + 1) * 0.68, vm = (v0 + v1) * 0.5;
      const pm = cPt(u, vm, yDeck);
      if (Math.abs(pm[0]) > b1.xi || Math.abs(pm[2]) > b1.xi || isFloor2Opening(pm[0], pm[2])) continue;
      lat.addStrut(cPt(u, v0), cPt(u, v1), 0.085, 0.20);
    }
  }
  for (let kv = -4; kv <= 4; kv++) {
    const v = kv * 0.58;
    if (Math.abs(v) < 2.35) lat.addStrut(cPt(0.10, v, yDeck - 0.26), cPt(4.48, v, yDeck - 0.26), 0.09, 0.22);
  }
  for (let ku = 1; ku <= 7; ku++) {
    lat.addStrut(cPt(ku * 0.60, -2.35, yDeck - 0.26), cPt(ku * 0.60, +2.35, yDeck - 0.26), 0.085, 0.20);
  }

  // Framed 45° curbs & internal trimmers around Otis (P1, P3), Stairwells (P2, P4) & Central Edoux/e1/e2
  for (const [cx, cz] of [[+8.627, -8.627], [-8.627, +8.627]]) {
    addDiamondOpeningFrame(pri, lat, cx, cz, 2.72, 2.72, yDeck);
    pri.addStrut([cx - 2.72 * SQRT1_2, yDeck - 0.30, cz - 2.72 * SQRT1_2],
      [cx + 2.72 * SQRT1_2, yDeck - 0.30, cz + 2.72 * SQRT1_2], 0.22, 0.32);
  }
  for (const [sx, sz] of [[+1, +1], [-1, -1]]) {
    const cx = sx * 9.40, cz = sz * 9.40;
    addDiamondOpeningFrame(pri, lat, cx, cz, 2.85, 2.12, yDeck);
    for (let ku = -3; ku <= 3; ku++) {
      const uOff = ku * 0.78;
      lat.addStrut([cx + uOff * uV[0] - 2.08 * vV[0], yDeck - 0.27, cz + uOff * uV[1] - 2.08 * vV[1]],
        [cx + uOff * uV[0] + 2.08 * vV[0], yDeck - 0.27, cz + uOff * uV[1] + 2.08 * vV[1]], 0.11, 0.24);
    }
    for (const vOff of [-1.35, -0.66, 0.0, +0.66, +1.35]) {
      const dx = vOff * SQRT1_2, dz = vOff * SQRT1_2;
      lat.addStrut([cx - 2.80 * SQRT1_2 + dx, yDeck - 0.28, cz + 2.80 * SQRT1_2 + dz],
        [cx + 2.80 * SQRT1_2 + dx, yDeck - 0.28, cz - 2.80 * SQRT1_2 + dz], Math.abs(vOff) > 0.5 && Math.abs(vOff) < 0.8 ? 0.20 : 0.10, 0.26);
    }
  }
  addDiamondOpeningFrame(pri, lat, 0.0, 0.0, 4.65, 2.55, yDeck);
  for (const uOff of [-2.42, -0.35, +1.85, +5.16]) {
    addBoxTruss4(pri, lat, cPt(uOff, -2.55, yDeck - 0.34), cPt(uOff, +2.55, yDeck - 0.34), 0.38, 0.52, [0, 1, 0], 0.60, true);
  }
  for (const vOff of [-2.55, -1.34, +1.34, +2.55]) {
    pri.addStrut(cPt(-4.65, vOff, yDeck - 0.30), cPt(+5.18, vOff, yDeck - 0.30), 0.22, 0.34);
  }
  for (const [sxS, szS] of [[+1.591, +1.591], [-1.591, -1.591]]) {
    for (let k = 0; k < 8; k++) {
      const a0 = (k * Math.PI) / 4, a1 = ((k + 1) * Math.PI) / 4;
      pri.addStrut([sxS + Math.cos(a0) * 1.00, yDeck - 0.26, szS + Math.sin(a0) * 1.00],
        [sxS + Math.cos(a1) * 1.00, yDeck - 0.26, szS + Math.sin(a1) * 1.00], 0.18, 0.32);
    }
  }

  // Cantilevered Chamfered Promenade Ring (15.815m -> 19.38m fascia, ±17.08m X-railing & ±17.65m scroll bracket for Pl. 45!)
  const vIn = chamferedSquareVerts(hsCore, 0.35);
  const vRail = chamferedSquareVerts(17.08, 1.11);
  const vScroll = chamferedSquareVerts(17.65, 1.20);
  const vMid = chamferedSquareVerts(18.62, 1.18);
  const vOut = chamferedSquareVerts(hsDeck, chamfer);
  for (let e = 0; e < 8; e++) {
    const j = (e + 1) % 8;
    const nSeg = e % 2 === 0 ? 14 : 2;
    pri.addStrut([vRail[e][0], yDeck - 0.17, vRail[e][1]], [vRail[j][0], yDeck - 0.17, vRail[j][1]], 0.18, 0.22);
    pri.addStrut([vMid[e][0], yDeck - 0.15, vMid[e][1]], [vMid[j][0], yDeck - 0.15, vMid[j][1]], 0.18, 0.18);
    pri.addStrut([vOut[e][0], yDeck - 0.12, vOut[e][1]], [vOut[j][0], yDeck - 0.12, vOut[j][1]], 0.22, 0.16);
    pri.addStrut([vRail[e][0], yDeck + 1.05, vRail[e][1]], [vRail[j][0], yDeck + 1.05, vRail[j][1]], 0.09, 0.07);
    lat.addStrut([vRail[e][0], yDeck + 0.12, vRail[e][1]], [vRail[j][0], yDeck + 0.12, vRail[j][1]], 0.06, 0.06);

    for (let s = 0; s < nSeg; s++) {
      const t0 = s / nSeg, t1 = (s + 1) / nSeg;
      const i0 = [lerp(vIn[e][0], vIn[j][0], t0), lerp(vIn[e][1], vIn[j][1], t0)];
      const i1 = [lerp(vIn[e][0], vIn[j][0], t1), lerp(vIn[e][1], vIn[j][1], t1)];
      const o0 = [lerp(vOut[e][0], vOut[j][0], t0), lerp(vOut[e][1], vOut[j][1], t0)];
      const o1 = [lerp(vOut[e][0], vOut[j][0], t1), lerp(vOut[e][1], vOut[j][1], t1)];
      const r0 = [lerp(vRail[e][0], vRail[j][0], t0), lerp(vRail[e][1], vRail[j][1], t0)];
      const r1 = [lerp(vRail[e][0], vRail[j][0], t1), lerp(vRail[e][1], vRail[j][1], t1)];
      const sc0 = [lerp(vScroll[e][0], vScroll[j][0], t0), lerp(vScroll[e][1], vScroll[j][1], t0)];

      wood.addQuad([i0[0], yDeck, i0[1]], [i1[0], yDeck, i1[1]], [o1[0], yDeck, o1[1]], [o0[0], yDeck, o0[1]]);
      wood.addQuad([o0[0], yDeck - 0.14, o0[1]], [o1[0], yDeck - 0.14, o1[1]], [i1[0], yDeck - 0.14, i1[1]], [i0[0], yDeck - 0.14, i0[1]]);

      // Console R top rib (to 19.38m for Pl. 53) + lower S-scroll bracket tucked inside ±18.02m (for Pl. 45!)
      pri.addStrut([i0[0], yDeck - 0.14, i0[1]], [o0[0], yDeck - 0.12, o0[1]], 0.18, 0.16);
      pri.addStrut([r0[0] * 0.96, yDeck - 1.85, r0[1] * 0.96], [sc0[0], yDeck - 0.22, sc0[1]], 0.14, 0.18);
      lat.addStrut([r0[0] * 0.97, yDeck - 1.00, r0[1] * 0.97], [r0[0], yDeck - 0.20, r0[1]], 0.10, 0.12);

      // Perimeter balustrade stanchions + St. Andrew's X railing panels along ±17.60m line
      pri.addStrut([r0[0], yDeck, r0[1]], [r0[0], yDeck + 1.08, r0[1]], 0.08, 0.08, [1, 0, 0]);
      lat.addStrut([r0[0], yDeck + 0.12, r0[1]], [r1[0], yDeck + 1.02, r1[1]], 0.042, 0.042);
      lat.addStrut([r1[0], yDeck + 0.12, r1[1]], [r0[0], yDeck + 1.02, r0[1]], 0.042, 0.042);
    }
  }
  const deckGrp = mbDeck.buildGroup('z3_floor2_deck_consoles');
  deckGrp.traverse((m) => { if (m.isMesh && m.name.endsWith('_woodPavilion')) m.userData.isWoodDecking = true; });
  pieces.push({ id: 'z3_floor2_deck_consoles', name: '2e Étage Floor Grillage, Console R & Promenade (+115.73m)', phase: 5, span: [5.38, 5.52], obj: deckGrp });

  return pieces;
}
