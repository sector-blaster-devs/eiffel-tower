/**
 * Zone 3 Sub-Module A: Stage-2 Inclined Lattice Piers (Panneaux 6_upper..10, +57.630m to +110.6292m).
 * Models all 16 open-laced box arbalétriers, 4-face St. Andrew's X + secondary corner trellis,
 * internal pier diaphragms, riveted gussets, and Panneau 10's 8-plane diamond-lattice transfer belt.
 */

import {
  PIERS, lerp, lerp3, stage2PierBounds, pierChordCenters,
  MultiBatch, addLacedBoxChord, addLacedBeam, addBoxTruss4, addGussetTri,
} from './z3_geom_helpers.js';

const PIER_FACE_PAIRS = [
  [0, 1, [1, 0, 0]], // X-outer face
  [0, 2, [0, 0, 1]], // Z-outer face
  [3, 1, [0, 0, 1]], // Z-inner face
  [3, 2, [1, 0, 0]], // X-inner face
];

function addPanneau6Pier(mb, p, webMb = mb) {
  const pri = mb.get('ironPrimary'), lat = mb.get('ironLattice');
  const wPri = webMb.get('ironPrimary'), wLat = webMb.get('ironLattice');
  const y0 = 57.6300, yMid = 63.1300, yG0 = 68.0000, y1 = 68.6300, yG1 = 69.2400;
  const b0 = stage2PierBounds(y0), bM = stage2PierBounds(yMid);
  const bG0 = stage2PierBounds(yG0), b1 = stage2PierBounds(y1), bG1 = stage2PierBounds(yG1);
  const c0 = pierChordCenters(p, b0.xo, b0.xi, y0);
  const cM = pierChordCenters(p, bM.xo, bM.xi, yMid);
  const cG0 = pierChordCenters(p, bG0.xo, bG0.xi, yG0);
  const c1 = pierChordCenters(p, b1.xo, b1.xi, y1);
  const cG1 = pierChordCenters(p, bG1.xo, bG1.xi, yG1);

  for (let i = 0; i < 4; i++) {
    pri.addAxisBox(c0[i][0], 57.4200, c0[i][2], b0.cw + 0.06, 0.4400, b0.cw + 0.06);
    addLacedBoxChord(pri, lat, c0[i], c1[i], b0.cw, b1.cw, 12, true);
  }

  for (const [iA, iB, nrm] of PIER_FACE_PAIRS) {
    const a0 = c0[iA], bPt0 = c0[iB], am = cM[iA], bmPt = cM[iB];
    const aG0 = cG0[iA], bG0 = cG0[iB], aG1 = cG1[iA], bG1 = cG1[iB];
    const mid0 = lerp3(a0, bPt0, 0.5), midG0 = lerp3(aG0, bG0, 0.5);

    // Bottom collar (57.63m), mid-tie (63.13m), central post & St. Andrew's X up to 68.00m girder soffit
    addBoxTruss4(pri, lat, a0, bPt0, 0.36, 0.52, [0, 1, 0], 0.72, true);
    addBoxTruss4(pri, lat, am, bmPt, 0.30, 0.34, [0, 1, 0], 0.74, true);
    addBoxTruss4(wPri, wLat, mid0, midG0, 0.36, 0.26, nrm, 0.74, true);
    addBoxTruss4(wPri, wLat, a0, bG0, 0.44, 0.28, nrm, 0.72, true);
    addBoxTruss4(wPri, wLat, bPt0, aG0, 0.44, 0.28, nrm, 0.72, true);

    // Pl. 20 Fig. 1: 1.24m-deep 10-panel St. Andrew's X-lattice horizontal box girder (Y = 68.00..69.24m)
    pri.addStrut(aG0, bG0, 0.34, 0.22, [0, 1, 0]);
    pri.addStrut(aG1, bG1, 0.34, 0.22, [0, 1, 0]);
    for (let k = 0; k <= 10; k++) {
      wLat.addStrut(lerp3(aG0, bG0, k / 10), lerp3(aG1, bG1, k / 10), 0.095, 0.16, nrm);
      if (k < 10) {
        wLat.addStrut(lerp3(aG0, bG0, k / 10), lerp3(aG1, bG1, (k + 1) / 10), 0.095, 0.16, nrm);
        wLat.addStrut(lerp3(aG0, bG0, (k + 1) / 10), lerp3(aG1, bG1, k / 10), 0.095, 0.16, nrm);
      }
    }
    addGussetTri(pri, aG0, lerp3(aG0, bG0, 0.12), lerp3(aG0, a0, 0.14), 0.045);
    addGussetTri(pri, bG0, lerp3(bG0, aG0, 0.12), lerp3(bG0, bPt0, 0.14), 0.045);
  }
  lat.addStrut(c1[0], c1[3], 0.18, 0.18);
  lat.addStrut(c1[1], c1[2], 0.18, 0.18);
}

function addOpenPierPanel(mb, p, y0, y1, addBotStrut = false, webMb = mb) {
  const pri = mb.get('ironPrimary');
  const lat = mb.get('ironLattice');
  const wPri = webMb.get('ironPrimary');
  const wLat = webMb.get('ironLattice');
  const b0 = stage2PierBounds(y0);
  const b1 = stage2PierBounds(y1);
  const ym = (y0 + y1) * 0.5;
  const bm = stage2PierBounds(ym);
  const c0 = pierChordCenters(p, b0.xo, b0.xi, y0);
  const c1 = pierChordCenters(p, b1.xo, b1.xi, y1);
  const cm = pierChordCenters(p, bm.xo, bm.xi, ym);

  const nLace = Math.max(7, Math.round((y1 - y0) / 0.95));
  for (let i = 0; i < 4; i++) {
    addLacedBoxChord(pri, lat, c0[i], c1[i], b0.cw, b1.cw, nLace, true);
  }

  for (const [iA, iB, nrm] of PIER_FACE_PAIRS) {
    const a0 = c0[iA], bPt0 = c0[iB], a1 = c1[iA], bPt1 = c1[iB];
    const am = cm[iA], bmPt = cm[iB];
    const mid0 = lerp3(a0, bPt0, 0.5);
    const mid1 = lerp3(a1, bPt1, 0.5);
    const center = lerp3(am, bmPt, 0.5);

    // Top horizontal 4-chord box entretoise + central inclined face post + St. Andrew's X-diagonals
    addBoxTruss4(pri, lat, a1, bPt1, 0.36, 0.56, [0, 1, 0], 0.68, true);
    if (addBotStrut) addBoxTruss4(pri, lat, a0, bPt0, 0.36, 0.52, [0, 1, 0], 0.68, true);
    addBoxTruss4(wPri, wLat, mid0, mid1, 0.34, 0.24, nrm, 0.72, true);
    addBoxTruss4(wPri, wLat, a0, bPt1, 0.42, 0.26, nrm, 0.70, true);
    addBoxTruss4(wPri, wLat, bPt0, a1, 0.42, 0.26, nrm, 0.70, true);

    // Secondary mid-tie & 4 corner diamond trellis struts (Pl. 66 Fig. 2 & Photo 18)
    wLat.addStrut(am, bmPt, 0.14, 0.18);
    const qA0 = lerp3(a0, mid0, 0.52), qB0 = lerp3(bPt0, mid0, 0.52);
    const qA1 = lerp3(a1, mid1, 0.52), qB1 = lerp3(bPt1, mid1, 0.52);
    const sA0 = lerp3(a0, am, 0.52), sB0 = lerp3(bPt0, bmPt, 0.52);
    const sA1 = lerp3(a1, am, 0.52), sB1 = lerp3(bPt1, bmPt, 0.52);
    for (const [u, v] of [[qA0, sA0], [qB0, sB0], [qA1, sA1], [qB1, sB1],
      [am, lerp3(a0, bPt1, 0.25)], [bmPt, lerp3(bPt0, a1, 0.25)],
      [am, lerp3(bPt0, a1, 0.75)], [bmPt, lerp3(a0, bPt1, 0.75)]]) {
      wLat.addStrut(u, v, 0.085, 0.11);
    }

    // Riveted nodal gussets at 4 corners & X-crossing
    addGussetTri(pri, a0, lerp3(a0, bPt0, 0.14), lerp3(a0, a1, 0.13), 0.045);
    addGussetTri(pri, bPt0, lerp3(bPt0, a0, 0.14), lerp3(bPt0, bPt1, 0.13), 0.045);
    addGussetTri(pri, a1, lerp3(a1, bPt1, 0.14), lerp3(a1, a0, 0.13), 0.045);
    addGussetTri(pri, bPt1, lerp3(bPt1, a1, 0.14), lerp3(bPt1, bPt0, 0.13), 0.045);
    wPri.addStrut(lerp3(center, mid0, 0.12), lerp3(center, mid1, 0.12), 0.52, 0.28, nrm);
  }

  // Internal horizontal pier X-diaphragm at panel top
  lat.addStrut(c1[0], c1[3], 0.16, 0.16);
  lat.addStrut(c1[1], c1[2], 0.16, 0.16);
}

// Helper for 8-plane tower framing lines (4 outer ±xo, 4 inner ±xi)
function planePoint(planeIdx, u, y) {
  const { xo, xi } = stage2PierBounds(y);
  switch (planeIdx) {
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

function addDiamondBeltSegment(pri, lat, planeIdx, u0A, u0B, u1A, u1B, y0, y1, nDiv) {
  const nrm = planeIdx < 2 || (planeIdx >= 4 && planeIdx < 6) ? [0, 0, 1] : [1, 0, 0];
  const p0A = planePoint(planeIdx, u0A, y0), p0B = planePoint(planeIdx, u0B, y0);
  const p1A = planePoint(planeIdx, u1A, y1), p1B = planePoint(planeIdx, u1B, y1);
  pri.addStrut(p0A, p0B, 0.30, 0.42, [0, 1, 0]);
  pri.addStrut(p1A, p1B, 0.30, 0.42, [0, 1, 0]);
  const ym = (y0 + y1) * 0.5;
  lat.addStrut(planePoint(planeIdx, (u0A + u1A) * 0.5, ym), planePoint(planeIdx, (u0B + u1B) * 0.5, ym), 0.08, 0.18, [0, 1, 0]);

  for (let i = 0; i < nDiv; i++) {
    const t0 = i / nDiv, t1 = (i + 1) / nDiv, tm = (i + 0.5) / nDiv;
    const bL = lerp3(p0A, p0B, t0), bR = lerp3(p0A, p0B, t1), bM = lerp3(p0A, p0B, tm);
    const tL = lerp3(p1A, p1B, t0), tR = lerp3(p1A, p1B, t1), tM = lerp3(p1A, p1B, tm);
    const mL = lerp3(bL, tL, 0.5), mR = lerp3(bR, tR, 0.5);
    // Double-intersecting diamond lattice web (Pl. 45, Pl. 34, Photo 01, Photo 18)
    lat.addStrut(bL, tR, 0.105, 0.16, nrm);
    lat.addStrut(bR, tL, 0.105, 0.16, nrm);
    lat.addStrut(bM, mL, 0.085, 0.14, nrm);
    lat.addStrut(bM, mR, 0.085, 0.14, nrm);
    lat.addStrut(tM, mL, 0.085, 0.14, nrm);
    lat.addStrut(tM, mR, 0.085, 0.14, nrm);
  }
}

function addUpperP10Bay(pri, lat, planeIdx, u0A, u0B, u1A, u1B, y0, y1, hasMidPost = true) {
  const nrm = planeIdx < 2 || (planeIdx >= 4 && planeIdx < 6) ? [0, 0, 1] : [1, 0, 0];
  const p0A = planePoint(planeIdx, u0A, y0), p0B = planePoint(planeIdx, u0B, y0);
  const p1A = planePoint(planeIdx, u1A, y1), p1B = planePoint(planeIdx, u1B, y1);
  const m0 = lerp3(p0A, p0B, 0.5), m1 = lerp3(p1A, p1B, 0.5);

  // Top soffit box girder at Y = 110.6292m + optional mid-post + St. Andrew's X box diagonals
  addBoxTruss4(pri, lat, p1A, p1B, 0.38, 0.54, [0, 1, 0], 0.65, true);
  if (hasMidPost) addBoxTruss4(pri, lat, m0, m1, 0.38, 0.26, nrm, 0.66, true);
  addBoxTruss4(pri, lat, p0A, p1B, 0.44, 0.28, nrm, 0.68, true);
  addBoxTruss4(pri, lat, p0B, p1A, 0.44, 0.28, nrm, 0.68, true);

  // Corner sub-diagonals & deep top gussets (Pl. 45 & Pl. 34 Figs. 1-3)
  lat.addStrut(lerp3(p0A, m0, 0.48), lerp3(p0A, p1A, 0.46), 0.09, 0.12, nrm);
  lat.addStrut(lerp3(p0B, m0, 0.48), lerp3(p0B, p1B, 0.46), 0.09, 0.12, nrm);
  lat.addStrut(lerp3(p1A, m1, 0.48), lerp3(p1A, p0A, 0.46), 0.09, 0.12, nrm);
  lat.addStrut(lerp3(p1B, m1, 0.48), lerp3(p1B, p0B, 0.46), 0.09, 0.12, nrm);
  addGussetTri(pri, p1A, lerp3(p1A, p1B, 0.16), lerp3(p1A, p0A, 0.18), 0.05);
  addGussetTri(pri, p1B, lerp3(p1B, p1A, 0.16), lerp3(p1B, p0B, 0.18), 0.05);
  if (hasMidPost) {
    addGussetTri(pri, m1, lerp3(m1, p1A, 0.18), lerp3(m1, m0, 0.18), 0.05);
    addGussetTri(pri, m1, lerp3(m1, p1B, 0.18), lerp3(m1, m0, 0.18), 0.05);
  }
}

export function buildStage2Piers(THREE, materials) {
  const pieces = [];
  const attachPier3Web = (parentGrp, p3WebMb, name) => {
    const wGrp = p3WebMb.buildGroup(name);
    wGrp.userData.isPier3FaceWeb = true;
    for (const child of wGrp.children) child.userData.isPier3FaceWeb = true;
    parentGrp.add(wGrp);
    return parentGrp;
  };

  // 1. Panneau 6 (+57.6300 -> +68.6300m, Pl. 20 Fig. 1) & Panneau 7 (+68.6300 -> +77.6770m, Pl. 66 Fig. 2)
  const mbLow = new MultiBatch(THREE, materials);
  const mbLowP3Web = new MultiBatch(THREE, materials);
  for (const p of PIERS) {
    const webMb = p.id === 'p3' ? mbLowP3Web : mbLow;
    addPanneau6Pier(mbLow, p, webMb);
    addOpenPierPanel(mbLow, p, 68.6300, 77.6770, false, webMb);
  }
  const grpLow = attachPier3Web(mbLow.buildGroup('z3_piers_p6u_p7'), mbLowP3Web, 'z3_piers_p6u_p7_p3web');
  pieces.push({ id: 'z3_piers_p6u_p7', name: 'Panneaux 6–7 Stage-2 Piers (+57.63–77.68m)', phase: 4, span: [4.05, 4.36], obj: grpLow });

  // 2a. Panneau 8 (+77.6770 -> +89.2038m) — exact Photo 14 (15 May 1888) crown at step 4.85!
  const mbP8 = new MultiBatch(THREE, materials);
  const mbP8P3Web = new MultiBatch(THREE, materials);
  for (const p of PIERS) {
    const webMb = p.id === 'p3' ? mbP8P3Web : mbP8;
    addOpenPierPanel(mbP8, p, 77.6770, 89.2038, false, webMb);
  }
  const grpP8 = attachPier3Web(mbP8.buildGroup('z3_piers_p8'), mbP8P3Web, 'z3_piers_p8_p3web');
  pieces.push({ id: 'z3_piers_p8', name: 'Panneau 8 Stage-2 Piers (+77.68–89.20m)', phase: 4, span: [4.34, 4.80], obj: grpP8 });

  // 2b. Panneau 9 (+89.2038 -> +100.0635m) — erected after 15 May 1888 (step > 4.85)
  const mbP9 = new MultiBatch(THREE, materials);
  const mbP9P3Web = new MultiBatch(THREE, materials);
  for (const p of PIERS) {
    const webMb = p.id === 'p3' ? mbP9P3Web : mbP9;
    addOpenPierPanel(mbP9, p, 89.2038, 100.0635, false, webMb);
  }
  const grpP9 = attachPier3Web(mbP9.buildGroup('z3_piers_p9'), mbP9P3Web, 'z3_piers_p9_p3web');
  pieces.push({ id: 'z3_piers_p9', name: 'Panneau 9 Stage-2 Piers (+89.20–100.06m)', phase: 5, span: [4.87, 5.04], obj: grpP9 });

  // 3. Panneau 10 Lower Pier Diamond-Belt (+100.0635 -> +102.930m)
  const yB0 = 100.0635, yB1 = 102.9300, yMidBelt = 102.3000, yTopBelt = 104.5200, yTop10 = 110.6292;
  const bB0 = stage2PierBounds(yB0), bB1 = stage2PierBounds(yB1);
  const bMB = stage2PierBounds(yMidBelt), bTB = stage2PierBounds(yTopBelt), bT10 = stage2PierBounds(yTop10);
  const mbP10Belt = new MultiBatch(THREE, materials);
  for (const p of PIERS) {
    const c0 = pierChordCenters(p, bB0.xo, bB0.xi, yB0);
    const c1 = pierChordCenters(p, bB1.xo, bB1.xi, yB1);
    for (let i = 0; i < 4; i++) addLacedBoxChord(mbP10Belt.get('ironPrimary'), mbP10Belt.get('ironLattice'), c0[i], c1[i], bB0.cw, bB1.cw, 4, true);
  }
  for (let pl = 0; pl < 8; pl++) {
    for (const sgn of [-1, 1]) {
      addDiamondBeltSegment(mbP10Belt.get('ironPrimary'), mbP10Belt.get('ironLattice'),
        pl, sgn * bB0.xi, sgn * bB0.xo, sgn * bB1.xi, sgn * bB1.xo, yB0, yB1, 5);
    }
  }
  pieces.push({ id: 'z3_p10_pier_belt', name: 'Panneau 10 Pier Diamond-Lattice Belt (+100.06–102.93m)', phase: 5, span: [5.01, 5.15], obj: mbP10Belt.buildGroup('z3_p10_pier_belt') });

  // 4. Panneau 10 2-Tier Central Diamond Belt (+100.0635->104.52m) + Double-X Upper Bays (->110.6292m, Pl. 45 Fig. 2)
  const mbP10Up = new MultiBatch(THREE, materials);
  const priU = mbP10Up.get('ironPrimary'), latU = mbP10Up.get('ironLattice');
  for (const p of PIERS) {
    const c0 = pierChordCenters(p, bB1.xo, bB1.xi, yB1);
    const c1 = pierChordCenters(p, bT10.xo, bT10.xi, yTop10);
    for (let i = 0; i < 4; i++) addLacedBoxChord(priU, latU, c0[i], c1[i], bB1.cw, bT10.cw, 8, true);
    latU.addStrut(c1[0], c1[3], 0.16, 0.16);
    latU.addStrut(c1[1], c1[2], 0.16, 0.16);
  }
  for (let pl = 0; pl < 8; pl++) {
    const nrm = pl < 2 || (pl >= 4 && pl < 6) ? [0, 0, 1] : [1, 0, 0];
    // 2-tier diamond-lattice transfer girder across central 15.68m clear span (100.0635 -> 102.30 -> 104.52m)
    addDiamondBeltSegment(priU, latU, pl, -bB0.xi, +bB0.xi, -bMB.xi, +bMB.xi, yB0, yMidBelt, 7);
    addDiamondBeltSegment(priU, latU, pl, -bMB.xi, +bMB.xi, -bTB.xi, +bTB.xi, yMidBelt, yTopBelt, 7);
    addBoxTruss4(priU, latU, planePoint(pl, -bTB.xi, yTopBelt), planePoint(pl, +bTB.xi, yTopBelt), 0.36, 0.44, [0, 1, 0], 0.68, true);
    for (const sgn of [-1, 1]) {
      priU.addStrut(planePoint(pl, sgn * bTB.xi, yTopBelt), planePoint(pl, sgn * bTB.xo, yTopBelt), 0.28, 0.36, [0, 1, 0]);
    }
    // Central vertical open-laced post at u=0 (100.0635 -> 110.6292m) + two side-by-side St. Andrew's X-bays
    addBoxTruss4(priU, latU, planePoint(pl, 0, yB0), planePoint(pl, 0, yTop10), 0.54, 0.34, nrm, 0.68, true);
    addUpperP10Bay(priU, latU, pl, -bB1.xo, -bB1.xi, -bT10.xo, -bT10.xi, yB1, yTop10, true);
    addUpperP10Bay(priU, latU, pl, -bTB.xi, 0, -bT10.xi, 0, yTopBelt, yTop10, false);
    addUpperP10Bay(priU, latU, pl, 0, +bTB.xi, 0, +bT10.xi, yTopBelt, yTop10, false);
    addUpperP10Bay(priU, latU, pl, +bB1.xi, +bB1.xo, +bT10.xi, +bT10.xo, yB1, yTop10, true);
  }
  pieces.push({ id: 'z3_p10_upper_bridge', name: 'Panneau 10 Inter-Pier Junction & X-Bays (+100.06–110.63m)', phase: 5, span: [5.12, 5.28], obj: mbP10Up.buildGroup('z3_p10_upper_bridge') });

  return pieces;
}
