/**
 * Zone 2 — Authentic 1889 Semicircular Iron `Galerie` Arcade (Phase 6, Pl. 20 & Photo 46)
 * & Multipane Enclosed `Galerie Vitrée` Glazing + Tricolore Pennants (Phase 9, Pl. 20, Photo 18, Photo 36).
 */

import {
  Y_PROMENADE, Y_FLOOR1_DECK, Y_ARCADE_SPRING, Y_SUBARCH_CROWN,
  Y_GRAND_ARCH_LOW, Y_GRAND_ARCH_INT, Y_GRAND_ARCH_EXT, Y_CARTOUCHE_TOP, Y_FLAGSTAFF_TOP,
  EXT_HALF, ARCADE_W, BAY_W, facePt, faceNorm, PieceBuilder,
} from './z2_geom_helpers.js';

const W_ARCADE_OUT = 35.22; // Outer 70.695 m promenade arcade plane (Pl. 20, Photo 46 & Photo 18)
const GRAND_W = BAY_W * 2;  // 7.76 m center-to-center across 9 grand arches = 69.84 m

function addArchRing(pri, lat, f, uc, ycIn, rIn, ycOut, rOut, w, segs = 18, withOculi = false) {
  const fn = faceNorm(f);
  const aOutMin = rOut > BAY_W ? Math.acos(BAY_W / rOut) : 0.0;
  for (let s = 0; s < segs; s++) {
    const t0 = s / segs, t1 = (s + 1) / segs;
    const aE0 = aOutMin + t0 * (Math.PI - 2 * aOutMin), aE1 = aOutMin + t1 * (Math.PI - 2 * aOutMin);
    const dx0 = -Math.cos(aE0) * rOut, dx1 = -Math.cos(aE1) * rOut;
    const uE0 = uc + dx0, yE0 = ycOut + Math.sin(aE0) * rOut;
    const uE1 = uc + dx1, yE1 = ycOut + Math.sin(aE1) * rOut;

    let uI0, yI0, uI1, yI1;
    if (withOculi) {
      // Project inward along radial normal onto (ycIn=61.24, rIn=3.86) so all 7+7 haunch oculi stay concentric!
      const k0 = Math.min(0.985, Math.abs(dx0) / rIn) * Math.sign(dx0 || 1e-6);
      const k1 = Math.min(0.985, Math.abs(dx1) / rIn) * Math.sign(dx1 || 1e-6);
      uI0 = uc + k0 * rIn * 0.965;
      yI0 = ycIn + Math.sqrt(Math.max(0.04, rIn * rIn - (uI0 - uc) * (uI0 - uc)));
      uI1 = uc + k1 * rIn * 0.965;
      yI1 = ycIn + Math.sqrt(Math.max(0.04, rIn * rIn - (uI1 - uc) * (uI1 - uc)));
    } else {
      const aI0 = t0 * Math.PI, aI1 = t1 * Math.PI;
      uI0 = uc - Math.cos(aI0) * rIn; yI0 = ycIn + Math.sin(aI0) * rIn;
      uI1 = uc - Math.cos(aI1) * rIn; yI1 = ycIn + Math.sin(aI1) * rIn;
    }

    pri.addBeam(facePt(f, uI0, yI0, w), facePt(f, uI1, yI1, w), 0.14, 0.22, fn);
    pri.addBeam(facePt(f, uE0, yE0, w), facePt(f, uE1, yE1, w), 0.18, 0.26, fn);
    lat.addBeam(facePt(f, uI0, yI0, w), facePt(f, uE0, yE0, w), 0.075, 0.15, fn);

    if (withOculi) {
      const cx = (uI0 + uI1 + uE0 + uE1) * 0.25, cy = (yI0 + yI1 + yE0 + yE1) * 0.25;
      if (Math.abs(cx - uc) > 0.78) {
        // Normal thickness across tilted arch band = vertical delta * cos(slope)
        const dyBand = 0.5 * (yE0 + yE1 - yI0 - yI1);
        const cosSlope = Math.sin(0.5 * (aE0 + aE1));
        const perpH = dyBand * Math.max(0.46, cosSlope);
        const chordW = Math.hypot(uE1 - uE0, yE1 - yE0);
        const rad = Math.min(perpH * 0.44, chordW * 0.42);
        const oSegs = 8;
        for (let k = 0; k < oSegs; k++) {
          const b0 = (k / oSegs) * Math.PI * 2, b1 = ((k + 1) / oSegs) * Math.PI * 2;
          lat.addBeam(
            facePt(f, cx + Math.cos(b0) * rad, cy + Math.sin(b0) * rad, w),
            facePt(f, cx + Math.cos(b1) * rad, cy + Math.sin(b1) * rad, w),
            0.072, 0.12, fn
          );
        }
      }
    }
  }
}

function addCartoucheShield(pri, lat, f, uc, yBase, yShieldTop, w) {
  // Structural C-volute crown shield sitting across the arch extrados (64.88 -> 66.32 m, Phase 6)
  const fn = faceNorm(f);
  const hw = 1.06, yMid = yBase + (yShieldTop - yBase) * 0.55;
  pri.addBeam(facePt(f, uc - hw * 0.82, yBase, w), facePt(f, uc - hw, yMid, w), 0.15, 0.19, fn);
  pri.addBeam(facePt(f, uc + hw * 0.82, yBase, w), facePt(f, uc + hw, yMid, w), 0.15, 0.19, fn);
  pri.addBeam(facePt(f, uc - hw, yMid, w), facePt(f, uc - 0.78, yShieldTop, w), 0.15, 0.19, fn);
  pri.addBeam(facePt(f, uc + hw, yMid, w), facePt(f, uc + 0.78, yShieldTop, w), 0.15, 0.19, fn);
  pri.addBeam(facePt(f, uc - 0.78, yShieldTop, w), facePt(f, uc + 0.78, yShieldTop, w), 0.14, 0.18, fn);
  pri.addBeam(facePt(f, uc - 0.72, yBase + 0.42, w), facePt(f, uc + 0.72, yBase + 0.42, w), 0.13, 0.17, fn);
  for (const dx of [-0.48, 0, 0.48]) {
    lat.addBeam(facePt(f, uc + dx, yBase + 0.42, w), facePt(f, uc + dx, yShieldTop, w), 0.08, 0.13, fn);
  }
}

function addPalmetteFinial(pri, lat, f, uc, yBase, yTop, w) {
  // Openwork ~0.84 m 9-frond palmette cresting finial crowning each 7.76 m arch (66.32 -> 67.16 m, Pl. 20 Fig. 1, Phase 9)
  const fn = faceNorm(f);
  const rim = [
    [-0.78, yBase], [-0.62, yBase + 0.28], [-0.48, yBase + 0.48], [-0.24, yBase + 0.70],
    [0.00, yTop],
    [0.24, yBase + 0.70], [0.48, yBase + 0.48], [0.62, yBase + 0.28], [0.78, yBase],
  ];
  for (let i = 0; i < rim.length - 1; i++) {
    pri.addBeam(facePt(f, uc + rim[i][0], rim[i][1], w), facePt(f, uc + rim[i + 1][0], rim[i + 1][1], w), 0.10, 0.14, fn);
  }
  for (const [dx, yt] of rim) {
    lat.addBeam(facePt(f, uc + dx * 0.28, yBase - 0.06, w), facePt(f, uc + dx, yt, w), 0.075, 0.12, fn);
  }
}

export function buildGalerieVitreePieces(THREE, mats) {
  const out = [];

  // 1a/1b. Iron Galerie Arcade Frame split into Central 3 Bays (g = 3..5, [6.18, 6.49] — erected by 23 Nov 1888 Photo 46!)
  //        and Outer 6 Bays + Corner Pilasters (g = 0..2, 6..8, [6.58, 7.02] — erected Dec 1888 after Photo 46!)
  for (const part of ['central', 'outer']) {
    const isCentral = part === 'central';
    const pb = new PieceBuilder();
    const pri = pb.use(mats.ironPrimary);
    const lat = pb.use(mats.ironLattice);
    const gold = pb.use(mats.goldAccent);

    for (let f = 0; f < 4; f++) {
      const fn = faceNorm(f);
      if (!isCentral) {
        // Corner end pilasters & Pl. 20 curved corner acroterion/gutter scroll (56.40 -> 66.22 m at ±35.24 m)
        for (const sgn of [-1, 1]) {
          pri.addBeam(facePt(f, sgn * 35.24, Y_PROMENADE, W_ARCADE_OUT), facePt(f, sgn * 35.24, 65.28, W_ARCADE_OUT), 0.24, 0.28, fn);
          pri.addBeam(facePt(f, sgn * 35.24, 65.28, W_ARCADE_OUT), facePt(f, sgn * 35.14, 66.22, W_ARCADE_OUT), 0.16, 0.20, fn);
        }
      }

      // 10 Main Lattice Stanchions & Sculpted Shield/Urn Capitals at u = -34.92 + k * 7.76 m (k=3..6 central, k=0..2,7..9 outer)
      for (let k = 0; k <= 9; k++) {
        const kCentral = k >= 3 && k <= 6;
        if (kCentral !== isCentral) continue;
        const u = -34.92 + k * GRAND_W;
        for (const du of [-0.17, 0.17]) {
          pri.addBeam(facePt(f, u + du, Y_PROMENADE, W_ARCADE_OUT), facePt(f, u + du, Y_ARCADE_SPRING, W_ARCADE_OUT), 0.12, 0.26, fn);
        }
        for (let yB = Y_PROMENADE + 0.35; yB <= Y_ARCADE_SPRING + 0.05; yB += 0.62) {
          lat.addBeam(facePt(f, u - 0.18, yB, W_ARCADE_OUT), facePt(f, u + 0.18, yB, W_ARCADE_OUT), 0.08, 0.26);
        }
        // Sculpted Pl. 20 shield/urn stanchion capital (60.20 -> 62.45 m)
        pri.addBeam(facePt(f, u - 0.34, Y_ARCADE_SPRING, W_ARCADE_OUT), facePt(f, u + 0.34, Y_ARCADE_SPRING, W_ARCADE_OUT), 0.24, 0.34);
        pri.addBeam(facePt(f, u - 0.30, 61.35, W_ARCADE_OUT), facePt(f, u + 0.30, 61.35, W_ARCADE_OUT), 0.72, 0.26);

        // Transverse valley gutter beam & knee-brace spanning promenade (W_ARCADE_OUT -> ARCADE_W)
        pri.addBeam(facePt(f, u, Y_ARCADE_SPRING, W_ARCADE_OUT), facePt(f, u, Y_ARCADE_SPRING + 0.12, ARCADE_W), 0.16, 0.22);
        lat.addBeam(facePt(f, u, 58.95, W_ARCADE_OUT), facePt(f, u, Y_ARCADE_SPRING, W_ARCADE_OUT - 1.15), 0.10, 0.12);
        pri.addBeam(facePt(f, u, Y_FLOOR1_DECK, ARCADE_W), facePt(f, u, 62.20, ARCADE_W), 0.20, 0.22, fn);
      }

      // 9 Grand 7.76 m Three-Chord Oculus Arches + 13 Crescent Lunette Oculi Rings + 18 Twin 3.88 m Sub-Arches
      for (let g = 0; g < 9; g++) {
        const gCentral = g >= 3 && g <= 5;
        if (gCentral !== isCentral) continue;
        const u0 = -34.92 + g * GRAND_W;
        const uc = u0 + BAY_W;
        // Outer extrados molding ring: middle chord (yc=61.24, r=3.86 -> 65.10m) to extrados (yc=61.68, r=3.98 -> 65.66m)
        addArchRing(pri, lat, f, uc, 61.24, 3.86, 61.68, 3.98, W_ARCADE_OUT, 18, false);
        // Lower arch chord capping diamond tympanum (yc=60.22, r=3.70 -> 63.92m)
        for (let s = 0; s < 18; s++) {
          const a0 = 0.08 + (s / 18) * (Math.PI - 0.16), a1 = 0.08 + ((s + 1) / 18) * (Math.PI - 0.16);
          const pL0 = facePt(f, uc - Math.cos(a0) * 3.70, 60.22 + Math.sin(a0) * 3.70, W_ARCADE_OUT);
          const pL1 = facePt(f, uc - Math.cos(a1) * 3.70, 60.22 + Math.sin(a1) * 3.70, W_ARCADE_OUT);
          pri.addBeam(pL0, pL1, 0.14, 0.20, fn);
        }
        // Pl. 20 Fig. 1 Concentric Row of 13 Tangent Circular Oculi Rings + Radial Mullions inside the 1.18 m Crescent Lunette!
        const oOffsets = [0, -0.66, 0.66, -1.30, 1.30, -1.90, 1.90, -2.46, 2.46, -2.96, 2.96, -3.36, 3.36];
        for (const dx of oOffsets) {
          const yBot = 60.22 + Math.sqrt(Math.max(0.04, 3.70 * 3.70 - dx * dx));
          const yTop = 61.24 + Math.sqrt(Math.max(0.04, 3.86 * 3.86 - dx * dx));
          const cy = (yBot + yTop) * 0.5;
          const cosSlope = Math.sqrt(Math.max(0.22, 1.0 - (dx / 3.78) * (dx / 3.78)));
          const rad = Math.min(0.41, (yTop - yBot) * cosSlope * 0.38);
          const oSegs = 10;
          for (let k = 0; k < oSegs; k++) {
            const b0 = (k / oSegs) * Math.PI * 2, b1 = ((k + 1) / oSegs) * Math.PI * 2;
            lat.addBeam(
              facePt(f, uc + dx + Math.cos(b0) * rad, cy + Math.sin(b0) * rad, W_ARCADE_OUT),
              facePt(f, uc + dx + Math.cos(b1) * rad, cy + Math.sin(b1) * rad, W_ARCADE_OUT),
              0.082, 0.14, fn
            );
          }
        }
        for (const dxBar of [-3.18, -2.72, -2.19, -1.61, -0.99, -0.34, 0.34, 0.99, 1.61, 2.19, 2.72, 3.18]) {
          const yB = 60.22 + Math.sqrt(Math.max(0.04, 3.70 * 3.70 - dxBar * dxBar));
          const yT = 61.24 + Math.sqrt(Math.max(0.04, 3.86 * 3.86 - dxBar * dxBar));
          lat.addBeam(facePt(f, uc + dxBar, yB, W_ARCADE_OUT), facePt(f, uc + dxBar * 1.02, yT, W_ARCADE_OUT), 0.068, 0.13, fn);
        }
        // Contoured crown purlin tying lower arch chord (63.85 m) inward to low gallery wall eave (62.30 m)
        lat.addBeam(facePt(f, uc, Y_GRAND_ARCH_LOW - 0.07, W_ARCADE_OUT), facePt(f, uc, 62.30, ARCADE_W), 0.14, 0.16);
        // Structural C-volute crown shield (64.88 -> 66.32 m; openwork ~0.84m palmette fan added in Phase 9!)
        addCartoucheShield(pri, lat, f, uc, 64.88, 66.32, W_ARCADE_OUT);

        // Central mullion column & sub-arch springing capital corbel dividing grand bay into 2 twin 3.88 m sub-arches
        pri.addBeam(facePt(f, uc, Y_PROMENADE, W_ARCADE_OUT), facePt(f, uc, Y_GRAND_ARCH_INT, W_ARCADE_OUT), 0.18, 0.20, fn);
        pri.addBeam(facePt(f, uc - 0.28, 60.38, W_ARCADE_OUT), facePt(f, uc + 0.28, 60.38, W_ARCADE_OUT), 0.34, 0.24);
        pri.addBeam(facePt(f, uc, Y_FLOOR1_DECK, ARCADE_W), facePt(f, uc, 62.30, ARCADE_W), 0.18, 0.20, fn);

        for (const subSgn of [-1, 1]) {
          const uSubC = uc + subSgn * (BAY_W * 0.5);
          // Twin 3.88 m sub-arch (yc = 60.62, rIn = 1.74 -> 62.36 m, rOut = 1.94 -> 62.56 m)
          addArchRing(pri, lat, f, uSubC, 60.62, 1.74, 60.62, 1.94, W_ARCADE_OUT, 8, false);
          // Diamond spandrel lattice in tympanum above sub-arch up to lower arch chord (yc=60.22, r=3.70)
          for (const dOff of [-1.05, -0.45, 0.15, 0.75, 1.35]) {
            const ud = uSubC + dOff * subSgn;
            const dxG = ud - uc, dxS = ud - uSubC;
            if (Math.abs(dxG) > 3.50 || Math.abs(dxS) > 1.85) continue;
            const yTopG = 60.22 + Math.sqrt(Math.max(0.05, 3.70 * 3.70 - dxG * dxG));
            const yBotS = 60.62 + Math.sqrt(Math.max(0.05, 1.92 * 1.92 - dxS * dxS));
            if (yTopG - yBotS > 0.16) {
              lat.addBeam(facePt(f, ud - 0.28, yBotS, W_ARCADE_OUT), facePt(f, ud + 0.28, yTopG, W_ARCADE_OUT), 0.06, 0.08, fn);
              lat.addBeam(facePt(f, ud + 0.28, yBotS, W_ARCADE_OUT), facePt(f, ud - 0.28, yTopG, W_ARCADE_OUT), 0.06, 0.08, fn);
            }
          }
        }
      }
    }

    out.push(pb.build(THREE, {
      id: isCentral ? 'z2_galerie_arcade_frame_central_p6' : 'z2_galerie_arcade_frame_outer_p7',
      phase: isCentral ? 6 : 7,
      span: isCentral ? [6.18, 6.49] : [6.58, 7.02],
      plateRefs: ['20', '55'],
      photoRefs: isCentral ? ['46', '18', '36'] : ['18', '36'],
    }));
  }

  // 2. Phase 9 Enclosed 1889 Multipane Galerie Vitrée Glazing, Sun-Valances, Gasoliers & Promenade Benches ([9.10, 9.50])
  {
    const pb = new PieceBuilder();
    const pri = pb.use(mats.ironPrimary);
    const lat = pb.use(mats.ironLattice);
    const cast = pb.use(mats.ironCast);
    const wood = pb.use(mats.woodPavilion);
    const glass = pb.use(mats.glass1889);
    const awningCream = pb.use(mats.awningCream);
    const awningStripe = pb.use(mats.awningStripe);
    const gold = pb.use(mats.goldAccent);
    const globe = pb.use(mats.lampGlobe1889);

    const wGlaze = ARCADE_W - 0.04; // 32.54 m enclosed gallery window wall (Pl. 20: 2.78m behind outer arcade!)
    const wVal = W_ARCADE_OUT - 0.12; // Tucked strictly inside outer iron sub-arch ring!
    const wGas = 33.85; // Covered outer promenade centerline for 36 hanging opaline globe gasoliers (Photo 12)

    const addHangingGasolier = (f, uc, fn) => {
      // Cross-rafter under barrel canopy (63.74 -> 62.26m) + pendant stem -> brass foliate crown -> 0.22m opaline globe (59.85m)
      pri.addBeam(facePt(f, uc, 63.74, W_ARCADE_OUT - 0.10), facePt(f, uc, 62.26, ARCADE_W), 0.09, 0.11);
      const yCeil = 62.99, yGlobe = 59.85, rGlobe = 0.22;
      const pTop = facePt(f, uc, yCeil, wGas);
      const pMid = facePt(f, uc, 61.35, wGas);
      const pNeck = facePt(f, uc, 60.22, wGas);
      const pBellTop = facePt(f, uc, 60.11, wGas);
      const pBellBot = facePt(f, uc, 60.02, wGas);
      const pCenter = facePt(f, uc, yGlobe, wGas);
      cast.addCylinder([pTop[0], yCeil + 0.03, pTop[2]], [pTop[0], yCeil - 0.09, pTop[2]], 0.085, 0.042, 8, true);
      cast.addCylinder(pTop, pNeck, 0.024, 0.024, 6, false);
      gold.addSphere(pMid, 0.052, 6, 5);
      gold.addCylinder(pNeck, pBellTop, 0.046, 0.145, 8, true);
      gold.addCylinder(pBellTop, pBellBot, 0.145, 0.245, 8, true);
      globe.addSphere(pCenter, rGlobe, 10, 8);
      gold.addCylinder([pCenter[0], yGlobe + 0.02, pCenter[2]], [pCenter[0], yGlobe - 0.02, pCenter[2]], 0.232, 0.232, 10, false);
      for (const sgn of [-1, 1]) {
        cast.addBeam(facePt(f, uc + sgn * 0.12, 60.14, wGas), facePt(f, uc + sgn * 0.235, yGlobe, wGas), 0.022, 0.022, fn);
        cast.addBeam(facePt(f, uc + sgn * 0.235, yGlobe, wGas), facePt(f, uc, 59.61, wGas), 0.022, 0.022, fn);
      }
      gold.addCylinder([pCenter[0], 59.63, pCenter[2]], [pCenter[0], 59.51, pCenter[2]], 0.055, 0.014, 6, true);
    };

    const addPromenadeBench1889 = (f, uc, fn) => {
      // 1889 Parisian scrolled cast-iron & oak-slat promenade bench (Photos 26 & 27; w in [32.72..33.24m], Y in [56.40..57.26m])
      const wBack = 32.72, wFront = 33.24, y0 = Y_PROMENADE, ySeat = 56.84, yBackTop = 57.26, halfL = 1.08;
      for (const dx of [-0.92, 0, 0.92]) {
        const uLeg = uc + dx;
        cast.addBeam(facePt(f, uLeg, y0, wFront - 0.04), facePt(f, uLeg, ySeat, wFront - 0.02), 0.045, 0.055, fn);
        cast.addBeam(facePt(f, uLeg, y0, wBack + 0.08), facePt(f, uLeg, ySeat, wBack + 0.05), 0.048, 0.058, fn);
        cast.addBeam(facePt(f, uLeg, ySeat, wBack + 0.05), facePt(f, uLeg, yBackTop, wBack), 0.044, 0.052, fn);
        cast.addBeam(facePt(f, uLeg, ySeat - 0.02, wBack + 0.04), facePt(f, uLeg, ySeat - 0.02, wFront), 0.045, 0.05);
        cast.addBeam(facePt(f, uLeg, y0 + 0.16, wBack + 0.07), facePt(f, uLeg, ySeat - 0.04, wFront - 0.06), 0.032, 0.032, fn);
        if (dx !== 0) {
          // Scrolled cast-iron armrest loop
          cast.addBeam(facePt(f, uLeg, ySeat + 0.20, wBack + 0.03), facePt(f, uLeg, ySeat + 0.18, wFront - 0.06), 0.038, 0.042);
          cast.addBeam(facePt(f, uLeg, ySeat, wFront - 0.05), facePt(f, uLeg, ySeat + 0.18, wFront - 0.06), 0.036, 0.04, fn);
        }
      }
      cast.addBeam(facePt(f, uc - 0.92, y0 + 0.22, (wBack + wFront) * 0.5), facePt(f, uc + 0.92, y0 + 0.22, (wBack + wFront) * 0.5), 0.035, 0.035);
      for (const ws of [32.81, 32.94, 33.07, 33.20]) {
        wood.addBeam(facePt(f, uc - halfL, ySeat + 0.016, ws), facePt(f, uc + halfL, ySeat + 0.016, ws), 0.032, 0.095);
      }
      for (const [yb, wb] of [[56.97, wBack + 0.035], [57.11, wBack + 0.018], [57.23, wBack + 0.002]]) {
        wood.addBeam(facePt(f, uc - halfL, yb, wb), facePt(f, uc + halfL, yb, wb), 0.082, 0.030, fn);
      }
    };

    for (let f = 0; f < 4; f++) {
      const fn = faceNorm(f);
      // 9 Contoured barrel-vaulted promenade canopy roofs, 36 hanging opaline gasoliers & 1889 promenade benches
      for (let g = 0; g < 9; g++) {
        const uc = -34.92 + g * GRAND_W + BAY_W;
        addHangingGasolier(f, uc, fn);
        if (g !== 4) {
          // 8 scrolled ironCast & woodPavilion benches per facade along covered +56.40m walk (leaving g=4 central axis clear)
          addPromenadeBench1889(f, uc + (g < 4 ? 1.55 : -1.55), fn);
        }
        const vSegs = 10, rVault = 3.58;
        for (let s = 0; s < vSegs; s++) {
          const a0 = 0.20 + (s / vSegs) * (Math.PI - 0.40);
          const a1 = 0.20 + ((s + 1) / vSegs) * (Math.PI - 0.40);
          const u0 = uc - Math.cos(a0) * rVault, y0 = 60.22 + Math.sin(a0) * rVault;
          const u1 = uc - Math.cos(a1) * rVault, y1 = 60.22 + Math.sin(a1) * rVault;
          const yIn0 = Math.min(62.28, 60.22 + Math.sin(a0) * 2.35);
          const yIn1 = Math.min(62.28, 60.22 + Math.sin(a1) * 2.35);
          pri.addQuad(
            facePt(f, u0, y0, W_ARCADE_OUT - 0.08),
            facePt(f, u1, y1, W_ARCADE_OUT - 0.08),
            facePt(f, u1, yIn1, ARCADE_W),
            facePt(f, u0, yIn0, ARCADE_W)
          );
        }
        // Scalloped 1889 striped/canvas sun-awning valances tucked inside upper sub-arch transoms (g=0,2..6,8)
        if (g !== 1 && g !== 7) {
          for (const subSgn of [-1, 1]) {
            const uSubC = uc + subSgn * (BAY_W * 0.5);
            const rVal = 1.69, yHem = 61.82, nLobes = 6;
            const halfSpan = Math.sqrt(rVal * rVal - (yHem - 60.62) * (yHem - 60.62)); // ~1.19 m strictly inside rIn=1.74m!
            for (let i = 0; i < nLobes; i++) {
              const lobeMat = i % 2 === 0 ? awningCream : awningStripe;
              const x0 = -halfSpan + (2 * halfSpan * i) / nLobes;
              const x1 = -halfSpan + (2 * halfSpan * (i + 1)) / nLobes;
              const xm = (x0 + x1) * 0.5;
              const yArc0 = 60.62 + Math.sqrt(Math.max(0.02, rVal * rVal - x0 * x0));
              const yArc1 = 60.62 + Math.sqrt(Math.max(0.02, rVal * rVal - x1 * x1));
              lobeMat.addQuad(
                facePt(f, uSubC + x0, yHem, wVal), facePt(f, uSubC + x1, yHem, wVal),
                facePt(f, uSubC + x1, yArc1, wVal), facePt(f, uSubC + x0, yArc0, wVal)
              );
              // Scalloped festoon lobe + striped awning seam & gilded braid trim
              lobeMat.addTri(facePt(f, uSubC + x0, yHem, wVal), facePt(f, uSubC + xm, yHem - 0.13, wVal + 0.02), facePt(f, uSubC + x1, yHem, wVal));
              gold.addBeam(facePt(f, uSubC + x0, yHem, wVal + 0.01), facePt(f, uSubC + xm, yHem - 0.13, wVal + 0.02), 0.024, 0.02, fn);
              gold.addBeam(facePt(f, uSubC + xm, yHem - 0.13, wVal + 0.02), facePt(f, uSubC + x1, yHem, wVal + 0.01), 0.024, 0.02, fn);
              if (i > 0) lat.addBeam(facePt(f, uSubC + x0, yHem, wVal + 0.01), facePt(f, uSubC + x0, yArc0, wVal + 0.01), 0.026, 0.02, fn);
            }
          }
        }
      }

      // Pl. 20 outer corner fluted mansard/gallery hood (|u| in [32.15..35.22m], exact 65.28m ridge, all 8 V-valleys 100% open!)
      for (const sgn of [-1, 1]) {
        const uInC = sgn * 32.15, uOutC = sgn * 35.22;
        pri.addQuad(
          facePt(f, uInC, 63.80, W_ARCADE_OUT - 0.14),
          facePt(f, uOutC, 63.80, W_ARCADE_OUT - 0.14),
          facePt(f, uOutC, 65.26, W_ARCADE_OUT - 0.28),
          facePt(f, uInC, 65.26, W_ARCADE_OUT - 0.28)
        );
        pri.addBeam(facePt(f, uInC, 65.28, W_ARCADE_OUT - 0.28), facePt(f, uOutC, 65.28, W_ARCADE_OUT - 0.28), 0.12, 0.16);
        for (let uf = 32.35; uf <= 35.05; uf += 0.42) {
          lat.addBeam(facePt(f, sgn * uf, 63.80, W_ARCADE_OUT - 0.13), facePt(f, sgn * uf, 65.28, W_ARCADE_OUT - 0.27), 0.05, 0.06, fn);
        }
      }

      // 16 Enclosed Multipane Semicircular-Arched Bays across [-31.04 .. +31.04 m] at w = 32.54 m (crown <= 62.26 m!)
      for (let b = 1; b <= 16; b++) {
        const ua = -34.92 + b * BAY_W + 0.16;
        const ub = -34.92 + (b + 1) * BAY_W - 0.16;
        const uc = (ua + ub) * 0.5, rWin = (ub - ua) * 0.5;
        const yDadoTop = 58.55, yWinSpring = 60.48;

        wood.addQuad(
          facePt(f, ua, Y_FLOOR1_DECK, wGlaze), facePt(f, ub, Y_FLOOR1_DECK, wGlaze),
          facePt(f, ub, yDadoTop, wGlaze), facePt(f, ua, yDadoTop, wGlaze)
        );
        wood.addBeam(facePt(f, ua, yDadoTop, wGlaze), facePt(f, ua, yWinSpring, wGlaze), 0.11, 0.14, fn);
        wood.addBeam(facePt(f, ub, yDadoTop, wGlaze), facePt(f, ub, yWinSpring, wGlaze), 0.11, 0.14, fn);
        glass.addQuad(
          facePt(f, ua, yDadoTop, wGlaze), facePt(f, ub, yDadoTop, wGlaze),
          facePt(f, ub, yWinSpring, wGlaze), facePt(f, ua, yWinSpring, wGlaze)
        );
        const segF = 8;
        for (let s = 0; s < segF; s++) {
          const a0 = (s / segF) * Math.PI, a1 = ((s + 1) / segF) * Math.PI;
          const p0 = facePt(f, uc - Math.cos(a0) * rWin, yWinSpring + Math.sin(a0) * rWin, wGlaze);
          const p1 = facePt(f, uc - Math.cos(a1) * rWin, yWinSpring + Math.sin(a1) * rWin, wGlaze);
          glass.addTri(facePt(f, uc, yWinSpring, wGlaze), p0, p1);
          wood.addBeam(p0, p1, 0.10, 0.14, fn);
          if (s > 0) pri.addBeam(facePt(f, uc, yWinSpring, wGlaze), p0, 0.04, 0.06, fn);
        }
        for (const fracU of [0.25, 0.50, 0.75]) {
          const um = ua + (ub - ua) * fracU;
          pri.addBeam(facePt(f, um, yDadoTop, wGlaze), facePt(f, um, yWinSpring, wGlaze), 0.045, 0.06, fn);
        }
        for (const yTrans of [59.20, 59.84, yWinSpring]) {
          pri.addBeam(facePt(f, ua, yTrans, wGlaze), facePt(f, ub, yTrans, wGlaze), 0.05, 0.07);
        }
        wood.addBeam(facePt(f, ua - 0.16, 62.30, wGlaze), facePt(f, ub + 0.16, 62.30, wGlaze), 0.12, 0.16);
      }

      // Low corner glazed wind-screens & Bureau de Tickets / Optique kiosks (Pl. 20 left margin: u = ±33.5 m, <= 61.35 m)
      for (const sgn of [-1, 1]) {
        wood.addQuad(
          facePt(f, sgn * 32.54, Y_PROMENADE, 32.54), facePt(f, sgn * 34.85, Y_PROMENADE, 34.85),
          facePt(f, sgn * 34.85, 59.20, 34.85), facePt(f, sgn * 32.54, 59.20, 32.54)
        );
        glass.addQuad(
          facePt(f, sgn * 32.54, 59.20, 32.54), facePt(f, sgn * 34.85, 59.20, 34.85),
          facePt(f, sgn * 34.85, 61.35, 34.85), facePt(f, sgn * 32.54, 61.35, 32.54)
        );
      }
    }

    out.push(pb.build(THREE, {
      id: 'z2_galerie_vitree_glazing_p9', phase: 9, span: [9.10, 9.50],
      plateRefs: ['20', '53'], photoRefs: ['18', '36', '12', '21'],
    }));
  }

  // 3. Phase 9 Openwork Palmette Arch Finials & Slender Bay-Division Flagpole / Lightning Standards ([9.25, 9.75], Pl. 20)
  {
    const pb = new PieceBuilder();
    const pri = pb.use(mats.ironPrimary);
    const lat = pb.use(mats.ironLattice);
    const gold = pb.use(mats.goldAccent);
    const flag = pb.use(mats.flagTricolore);

    for (let f = 0; f < 4; f++) {
      // 9 Openwork ~0.84m Palmette Cresting Finials atop the 7.76m arch crown shields (66.32 -> 67.16 m, Pl. 20 Fig. 1)
      for (let g = 0; g < 9; g++) {
        const uc = -34.92 + g * GRAND_W + BAY_W;
        addPalmetteFinial(pri, lat, f, uc, 66.32, Y_CARTOUCHE_TOP, W_ARCADE_OUT);
      }

      // 10 Slender Vertical Flagpole / Lightning Standards (Y = 61.80 .. 69.20 m, 8 inter-bay + 2 corner) on all 4 facades (Pl. 20)
      for (let k = 0; k <= 9; k++) {
        const u = -34.92 + k * GRAND_W;
        pri.addCylinder(facePt(f, u, 61.80, W_ARCADE_OUT), facePt(f, u, 65.52, W_ARCADE_OUT), 0.082, 0.064, 8, true);
        pri.addCylinder(facePt(f, u, 65.52, W_ARCADE_OUT), facePt(f, u, Y_FLAGSTAFF_TOP - 0.08, W_ARCADE_OUT), 0.062, 0.046, 8, true);
        // Molded ring collars at 64.86 m, 65.52 m, 67.18 m & Pl. 20 horizontal T-cap / gilded finial at 69.20 m
        pri.addBeam(facePt(f, u - 0.16, 64.86, W_ARCADE_OUT), facePt(f, u + 0.16, 64.86, W_ARCADE_OUT), 0.10, 0.14);
        pri.addBeam(facePt(f, u - 0.22, 65.52, W_ARCADE_OUT), facePt(f, u + 0.22, 65.52, W_ARCADE_OUT), 0.12, 0.16);
        pri.addBeam(facePt(f, u - 0.14, 67.18, W_ARCADE_OUT), facePt(f, u + 0.14, 67.18, W_ARCADE_OUT), 0.09, 0.13);
        pri.addBeam(facePt(f, u - 0.22, Y_FLAGSTAFF_TOP - 0.10, W_ARCADE_OUT), facePt(f, u + 0.22, Y_FLAGSTAFF_TOP - 0.10, W_ARCADE_OUT), 0.09, 0.13);
        gold.addSphere(facePt(f, u, Y_FLAGSTAFF_TOP - 0.075, W_ARCADE_OUT), 0.075, 8, 6);
      }

      // Slender furled/edge-on 1889 Tricolore corner pennants (no false cyan boxes on Pl. 20 ortho elevation!)
      for (const k of [0, 9]) {
        const u = -34.92 + k * GRAND_W;
        const dir = k === 0 ? 1 : -1;
        flag.addQuadUV(
          facePt(f, u, 67.68, W_ARCADE_OUT),
          facePt(f, u + dir * 0.18, 67.72, W_ARCADE_OUT - 0.42),
          facePt(f, u + dir * 0.18, 68.14, W_ARCADE_OUT - 0.42),
          facePt(f, u, 68.18, W_ARCADE_OUT),
          0, 0, 1, 1
        );
      }
    }

    out.push(pb.build(THREE, {
      id: 'z2_galerie_finials_standards_p9', phase: 9, span: [9.25, 9.75],
      plateRefs: ['20', '55'], photoRefs: ['18', '36'],
    }));
  }

  return out;
}
