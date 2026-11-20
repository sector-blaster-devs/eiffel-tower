/**
 * Zone 2 — 1st-Floor Box Girders (`Poutre de l'Arc`, `Grande Poutre`) &
 * Gustave Eiffel's Complete `Pl. 53 Fig. 9` Open Iron Grillage, `4×4` Pier-Quadrant
 * Secondary Girder Grid, Horizontal St. Andrew's `X` Wind-Bracing (`contreventement`),
 * and Framed Structural Curbs for the `Ascenseur` & `Escalier` Shafts (`+43.33 .. +57.63 m`).
 */

import {
  Y_POUTRE_ARC_BOT, Y_GRANDE_POUTRE_BOT, Y_CORNICE_BOT, Y_FLOOR1_DECK,
  EXT_HALF, ARCADE_W, COURT_HALF, BAY_W,
  wOuter, wInner, facePt, PieceBuilder,
} from './z2_geom_helpers.js';

function addTrussPanelX(pri, lat, f, u0, u1, y0, y1, wFn, chordD = 0.42, diagW = 0.20) {
  const w0 = wFn(y0), w1 = wFn(y1);
  const p00 = facePt(f, u0, y0, w0), p10 = facePt(f, u1, y0, w0);
  const p01 = facePt(f, u0, y1, w1), p11 = facePt(f, u1, y1, w1);
  pri.addBeam(p00, p01, 0.26, chordD, [0, 0, 1]);
  lat.addBeam(p00, p11, diagW, chordD * 0.68, [0, 1, 0]);
  lat.addBeam(p10, p01, diagW, chordD * 0.68, [0, 1, 0]);
}

function addGussetDisc(pri, f, u, y, w, r = 0.38) {
  const c = facePt(f, u, y, w);
  pri.addCylinder([c[0], y - 0.035, c[2]], [c[0], y + 0.035, c[2]], r, r, 8, true);
}

function addHorizXCell(pri, lat, f, u0, u1, w0, w1, yX, tieW = 0.16, gussetR = 0.34) {
  lat.addBeam(facePt(f, u0, yX, w0), facePt(f, u1, yX, w1), tieW, 0.11, [0, 1, 0]);
  lat.addBeam(facePt(f, u1, yX, w0), facePt(f, u0, yX, w1), tieW, 0.11, [0, 1, 0]);
  if (gussetR > 0) addGussetDisc(pri, f, (u0 + u1) * 0.5, yX, (w0 + w1) * 0.5, gussetR);
}

export function buildFloor1GirderPieces(THREE, mats) {
  const out = [];

  // 1. Poutre de l'Arc (+43.33 m .. +50.33 m, Pl. 20 & Pl. 66 3.88 m bay 2-tier ~48° Saint-André diamond trusses)
  {
    const pb = new PieceBuilder();
    const pri = pb.use(mats.ironPrimary);
    const lat = pb.use(mats.ironLattice);
    const y0 = Y_POUTRE_ARC_BOT, y1 = Y_GRANDE_POUTRE_BOT;
    const ybP = y0 + 0.20, ytP = y1 - 0.18, ymP = (ybP + ytP) * 0.5;
    const wo0 = wOuter(ybP) - 0.18, wo1 = wOuter(ytP) - 0.18, wm0 = (wo0 + wo1) * 0.5;
    const wi0 = wInner(ybP) + 0.18, wi1 = wInner(ytP) + 0.18, wm1 = (wi0 + wi1) * 0.5;
    const uClear0 = 22.6435, uClear1 = 19.1250;

    for (let f = 0; f < 4; f++) {
      // Exterior chords extend full width across piers (±wo0 / ±wo1 per Pl. 20 & Pl. 66); interior chords span clear court
      pri.addBeam(facePt(f, -wo0, ybP, wo0), facePt(f, wo0, ybP, wo0), 0.52, 0.56);
      pri.addBeam(facePt(f, -wo1, ytP, wo1), facePt(f, wo1, ytP, wo1), 0.52, 0.56);
      pri.addBeam(facePt(f, -uClear0, ybP, wi0), facePt(f, uClear0, ybP, wi0), 0.46, 0.50);
      pri.addBeam(facePt(f, -uClear1, ytP, wi1), facePt(f, uClear1, ytP, wi1), 0.46, 0.50);

      // Exact Eiffel bay stations: 10 x 3.825 m across 38.250 m clear span + 4 x 3.750 m across each 15.000 m pier face!
      const uStations = [
        -34.125, -30.375, -26.625, -22.875,
        -19.125, -15.300, -11.475, -7.650, -3.825, 0.0, 3.825, 7.650, 11.475, 15.300, 19.125,
        22.875, 26.625, 30.375, 34.125,
      ];
      for (let idx = 0; idx < uStations.length - 1; idx++) {
        const uRawA = uStations[idx], uRawB = uStations[idx + 1];
        const uaB = Math.max(-wo0, Math.min(wo0, uRawA)), ubB = Math.max(-wo0, Math.min(wo0, uRawB));
        const uaM = Math.max(-wm0, Math.min(wm0, uRawA)), ubM = Math.max(-wm0, Math.min(wm0, uRawB));
        const uaT = Math.max(-wo1, Math.min(wo1, uRawA)), ubT = Math.max(-wo1, Math.min(wo1, uRawB));
        if (Math.abs(ubB - uaB) > 0.45) {
          if (Math.abs(uRawA) < wo1 - 0.05) {
            pri.addBeam(facePt(f, uRawA, ybP, wo0), facePt(f, uRawA, ytP, wo1), 0.24, 0.42, [0, 0, 1]);
          }
          lat.addBeam(facePt(f, uaB, ybP, wo0), facePt(f, ubM, ymP, wm0), 0.18, 0.28, [0, 1, 0]);
          lat.addBeam(facePt(f, ubB, ybP, wo0), facePt(f, uaM, ymP, wm0), 0.18, 0.28, [0, 1, 0]);
          if (Math.abs(ubT - uaT) > 0.35) {
            lat.addBeam(facePt(f, uaM, ymP, wm0), facePt(f, ubT, ytP, wo1), 0.18, 0.28, [0, 1, 0]);
            lat.addBeam(facePt(f, ubM, ymP, wm0), facePt(f, uaT, ytP, wo1), 0.18, 0.28, [0, 1, 0]);
          }
        }
        // Interior clear-span 2-tier (~48°) Saint-André X-panel + 3D transverse wind-bracing (idx = 4..13)
        if (idx >= 4 && idx < 14) {
          const iaB = Math.max(-uClear0, Math.min(uClear0, uRawA)), ibB = Math.max(-uClear0, Math.min(uClear0, uRawB));
          const iaT = Math.max(-uClear1, Math.min(uClear1, uRawA)), ibT = Math.max(-uClear1, Math.min(uClear1, uRawB));
          const iaM = (iaB + iaT) * 0.5, ibM = (ibB + ibT) * 0.5;
          pri.addBeam(facePt(f, iaT, ybP, wi0), facePt(f, iaT, ytP, wi1), 0.22, 0.36, [0, 0, 1]);
          if (idx === 13) pri.addBeam(facePt(f, ibT, ybP, wi0), facePt(f, ibT, ytP, wi1), 0.22, 0.36, [0, 0, 1]);
          lat.addBeam(facePt(f, iaB, ybP, wi0), facePt(f, ibM, ymP, wm1), 0.16, 0.24, [0, 1, 0]);
          lat.addBeam(facePt(f, ibB, ybP, wi0), facePt(f, iaM, ymP, wm1), 0.16, 0.24, [0, 1, 0]);
          lat.addBeam(facePt(f, iaM, ymP, wm1), facePt(f, ibT, ytP, wi1), 0.16, 0.24, [0, 1, 0]);
          lat.addBeam(facePt(f, ibM, ymP, wm1), facePt(f, iaT, ytP, wi1), 0.16, 0.24, [0, 1, 0]);
          lat.addBeam(facePt(f, iaB, ybP + 0.05, wo0), facePt(f, iaB, ybP + 0.05, wi0), 0.20, 0.20);
          lat.addBeam(facePt(f, iaT, ytP - 0.05, wo1), facePt(f, iaT, ytP - 0.05, wi1), 0.20, 0.20);
          lat.addBeam(facePt(f, iaB, ybP + 0.05, wo0), facePt(f, ibB, ybP + 0.05, wi0), 0.14, 0.14);
          lat.addBeam(facePt(f, ibB, ybP + 0.05, wo0), facePt(f, iaB, ybP + 0.05, wi0), 0.14, 0.14);
        }
      }
    }
    out.push(pb.build(THREE, {
      id: 'z2_poutre_arc_4faces', phase: 3, span: [3.26, 3.45],
      plateRefs: ['20', '66', '67'], photoRefs: ['51', '23', '14', '36', '18'],
    }));
  }

  // 2A & 2B. Grande Poutre (+50.33 .. +57.63 m): Mid-span [3.34, 3.58] (Photo 23) & Outer + Pl. 53 Fig. 9 Grillage [3.58, 3.85]
  for (const part of ['mid', 'outer']) {
    const pb = new PieceBuilder();
    const pri = pb.use(mats.ironPrimary);
    const lat = pb.use(mats.ironLattice);
    const yb = Y_GRANDE_POUTRE_BOT + 0.15, yt = Y_CORNICE_BOT;
    const wb = wOuter(yb) - 0.16, wt = wOuter(yt) - 0.12;

    for (let f = 0; f < 4; f++) {
      if (part === 'mid') {
        pri.addBeam(facePt(f, -11.64, yb, wb), facePt(f, 11.64, yb, wb), 0.50, 0.54);
        pri.addBeam(facePt(f, -11.64, yt, wt), facePt(f, 11.64, yt, wt), 0.48, 0.52);
        for (let k = -3; k < 3; k++) {
          addTrussPanelX(pri, lat, f, k * BAY_W, (k + 1) * BAY_W, yb, yt, (y) => wOuter(y) - 0.15, 0.40, 0.20);
        }
      } else {
        // Outer & shoulder bays of Grande Poutre exterior truss (Pl. 20)
        for (const sgn of [-1, 1]) {
          pri.addBeam(facePt(f, sgn * 11.64, yb, wb), facePt(f, sgn * wb, yb, wb), 0.50, 0.54);
          pri.addBeam(facePt(f, sgn * 11.64, yt, wt), facePt(f, sgn * EXT_HALF, yt, wt), 0.48, 0.52);
        }
        for (const k of [-9, -8, -7, -6, -5, -4, 3, 4, 5, 6, 7, 8]) {
          const ua = Math.max(-wb, Math.min(wb, k * BAY_W));
          const ub = Math.max(-wb, Math.min(wb, (k + 1) * BAY_W));
          if (Math.abs(ub - ua) > 0.4) {
            addTrussPanelX(pri, lat, f, ua, ub, yb, yt, (y) => wOuter(y) - 0.15, 0.38, 0.18);
          }
        }

        // Inner courtyard Grande poutre intérieure (+53.20 .. +57.55 m, double-chord box girder at w = 16.32..16.68 m on Pl. 53 Fig. 9)
        const yc0 = 53.20, yc1 = Y_FLOOR1_DECK - 0.08, wGpIn = 16.50;
        pri.addBeam(facePt(f, -32.58, yc1, wGpIn), facePt(f, 32.58, yc1, wGpIn), 0.36, 0.44);
        pri.addBeam(facePt(f, -wGpIn, yc0, wGpIn), facePt(f, wGpIn, yc0, wGpIn), 0.34, 0.40);
        for (let k = -4; k <= 4; k++) {
          const u = k * 4.08;
          pri.addBeam(facePt(f, u, yc0, wGpIn), facePt(f, u, yc1, wGpIn), 0.22, 0.32, [0, 0, 1]);
          if (k < 4) {
            const un = (k + 1) * 4.08;
            lat.addBeam(facePt(f, u, yc0, wGpIn), facePt(f, un, yc1, wGpIn), 0.14, 0.20);
            lat.addBeam(facePt(f, un, yc0, wGpIn), facePt(f, u, yc1, wGpIn), 0.14, 0.20);
          }
        }

        // === A. Pl. 53 Fig. 9 Cardinal Wing Structural Grillage & Horizontal X Wind-Bracing ===
        const yG = 57.28, yX = 56.88, dU = 4.08; // 8 equal 4.08 m bays across [-16.32 .. +16.32 m]
        const wIn = 16.65, wM1 = 24.50, wM2 = 28.52, wOut = ARCADE_W;
        for (const wLong of [wIn, wM1, wM2, wOut, 33.38]) {
          const yStr = wLong > wOut ? 56.24 : yG; // Outer 33.38m promenade stringer sits beneath +56.40m promenade deck!
          pri.addBeam(facePt(f, -4 * dU, yStr, wLong), facePt(f, 4 * dU, yStr, wLong), 0.28, 0.46, [0, 1, 0]);
        }
        for (let k = -4; k <= 4; k++) {
          const u = k * dU;
          pri.addBeam(facePt(f, u, yG, wIn), facePt(f, u, yG, wOut), 0.26, 0.48, [0, 1, 0]);
          lat.addBeam(facePt(f, u, yc0 + 0.55, wGpIn), facePt(f, u, yG - 0.18, wM1), 0.15, 0.22);
        }
        // Continuous 45° diagonal wind-bracing super-lattice + hub gussets across all wing bays (Pl. 53 Fig. 9 exact!)
        for (const uApex of [-3 * dU, -dU, dU, 3 * dU]) {
          addGussetDisc(pri, f, uApex, yX, wIn, 0.40);
          addGussetDisc(pri, f, uApex, yX, wM2, 0.42);
          for (const dir of [-1, 1]) {
            const uMid = uApex + dir * dU;
            lat.addBeam(facePt(f, uApex, yX, wIn), facePt(f, uMid, yX, wM1), 0.18, 0.12, [0, 1, 0]);
            lat.addBeam(facePt(f, uMid, yX, wM1), facePt(f, uApex, yX, wM2), 0.18, 0.12, [0, 1, 0]);
            lat.addBeam(facePt(f, uApex, yX, wM2), facePt(f, uMid, yX, wOut), 0.18, 0.12, [0, 1, 0]);
          }
        }
        for (const uHub of [-4 * dU, -2 * dU, 0, 2 * dU, 4 * dU]) {
          addGussetDisc(pri, f, uHub, yX, wM1, 0.42);
          addGussetDisc(pri, f, uHub, yX, wOut, 0.40);
        }
        // End-bay (Panneau N°5 border bay |u| in [12.24..16.32]) sub-girder at w = 20.42 m & framing joists
        for (const sgn of [-1, 1]) {
          const uA = sgn * 3 * dU, uB = sgn * 4 * dU;
          pri.addBeam(facePt(f, uA, yG, 20.42), facePt(f, uB, yG, 20.42), 0.22, 0.38, [0, 1, 0]);
          for (const frac of [0.25, 0.50, 0.75]) {
            const uJ = uA + (uB - uA) * frac;
            lat.addBeam(facePt(f, uJ, yG + 0.04, wIn), facePt(f, uJ, yG + 0.04, wM1), 0.12, 0.20, [0, 1, 0]);
          }
          addHorizXCell(pri, lat, f, Math.min(uA, uB), Math.max(uA, uB), wIn, 20.42, yX, 0.15, 0.28);
          addHorizXCell(pri, lat, f, Math.min(uA, uB), Math.max(uA, uB), 20.42, wM1, yX, 0.15, 0.28);
        }

        // === B. Pl. 53 Fig. 9 4×4 Pier-Corner Quadrant Grid, Ascenseur & Escalier Curbs + X-Braces ===
        const G = [16.32, 20.42, 24.50, 28.52, 32.58];
        for (const g of [G[0], wIn, G[2], G[3], G[4], 33.38]) {
          const yQuad = g > G[4] ? 56.24 : yG; // Outer 33.38m promenade stringer sits beneath +56.40m promenade deck!
          pri.addBeam(facePt(f, G[0], yQuad, g), facePt(f, G[4], yQuad, g), 0.26, 0.46, [0, 1, 0]);
          pri.addBeam(facePt(f, g, yQuad, G[0]), facePt(f, g, yQuad, G[4]), 0.26, 0.46, [0, 1, 0]);
        }
        // g1 = 20.42 m secondary girders stopping cleanly at the 45°-chamfered Ascenseur opening
        pri.addBeam(facePt(f, G[2], yG, G[1]), facePt(f, G[4], yG, G[1]), 0.24, 0.42, [0, 1, 0]);
        pri.addBeam(facePt(f, G[1], yG, G[2]), facePt(f, G[1], yG, G[4]), 0.24, 0.42, [0, 1, 0]);
        pri.addBeam(facePt(f, G[0], yG, G[1]), facePt(f, COURT_HALF, yG, G[1]), 0.22, 0.38, [0, 1, 0]);
        pri.addBeam(facePt(f, G[1], yG, G[0]), facePt(f, G[1], yG, COURT_HALF), 0.22, 0.38, [0, 1, 0]);

        // 45°-chamfered Otis/Combaluzier Ascenseur shaft trimming girders & corner triangle bracing
        pri.addBeam(facePt(f, G[0], yG, G[1]), facePt(f, G[1], yG, G[0]), 0.26, 0.44, [0, 1, 0]);
        pri.addBeam(facePt(f, G[1], yG, G[2]), facePt(f, G[2], yG, G[1]), 0.26, 0.44, [0, 1, 0]);
        pri.addBeam(facePt(f, 16.75, yG, 19.90), facePt(f, 20.95, yG, 24.10), 0.22, 0.38, [0, 1, 0]);
        pri.addBeam(facePt(f, 19.90, yG, 16.75), facePt(f, 24.10, yG, 20.95), 0.22, 0.38, [0, 1, 0]);
        lat.addBeam(facePt(f, G[0], yX, G[0]), facePt(f, 18.37, yX, 18.37), 0.15, 0.11, [0, 1, 0]);
        lat.addBeam(facePt(f, G[2], yX, G[2]), facePt(f, 22.46, yX, 22.46), 0.16, 0.11, [0, 1, 0]);

        // Pier Escalier stairwell structural curbs inside cell (iu=1: [20.42..24.50], iw=3: [28.52..32.58])
        const wSt0 = 29.82, wSt1 = 31.36;
        pri.addBeam(facePt(f, G[1], yG, wSt0), facePt(f, G[2], yG, wSt0), 0.20, 0.38, [0, 1, 0]);
        pri.addBeam(facePt(f, G[1], yG, wSt1), facePt(f, G[2], yG, wSt1), 0.20, 0.38, [0, 1, 0]);
        addHorizXCell(pri, lat, f, G[1], G[2], G[3], wSt0, yX, 0.13, 0);
        addHorizXCell(pri, lat, f, G[1], G[2], wSt1, G[4], yX, 0.13, 0);

        // St. Andrew's X wind-bracing + node gussets in all remaining 4×4 pier quadrant cells
        for (let iu = 0; iu < 4; iu++) {
          for (let iw = 0; iw < 4; iw++) {
            if (iu <= 1 && iw <= 1) continue; // Ascenseur shaft block
            if (iu === 1 && iw === 3) continue; // Escalier stairwell cell (flank-braced above)
            addHorizXCell(pri, lat, f, G[iu], G[iu + 1], G[iw], G[iw + 1], yX, 0.17, 0.36);
          }
        }
        for (let iu = 0; iu <= 4; iu++) {
          for (let iw = 0; iw <= 4; iw++) {
            if (iu === 1 && iw === 1) continue;
            addGussetDisc(pri, f, G[iu], yX, G[iw], 0.38);
          }
        }
      }
    }
    out.push(pb.build(THREE, {
      id: `z2_grande_poutre_${part}`,
      phase: 3,
      span: part === 'mid' ? [3.22, 3.48] : [3.34, 3.53],
      plateRefs: ['20', '53', '67'],
      photoRefs: ['51', '23', '14', '36', '18'],
    }));
  }

  return out;
}
