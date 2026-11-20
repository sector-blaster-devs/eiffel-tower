/**
 * Zone 2 — 4 Monumental Decorative Arches (Exterior Ornate Scrollwork Rib + Interior Lattice Rib
 * + 3D Wind-Bracing + Semicircular Spandrels + 1889 Globe Lamps, +1.950 m .. +43.33 m).
 * Derived from Pl. 67 Figs. 1-2, 8, 14, 18, 22-23, Pl. 20, Pl. 55, and Photos 14, 18, 36, 46.
 */

import {
  Y_ARCH_BASE, Y_POUTRE_ARC_BOT, BAY_W, wOuter, wInner, facePt, faceNorm, vLerp, PieceBuilder,
} from './z2_geom_helpers.js';

const YC_ARCH = 0.10;
const R_INTR = 37.75; // yc + R_INTR = +37.85 m vertical-projection crown (Pl. 55, Pl. 66, Photo 18 & 36)
const R_EXTR = 40.50; // yc + R_EXTR = +40.60 m (leaves 2.73 m open spandrel ring cutouts right across crown!)
const N_HALF_BAYS = 26;
const Y_SPRING_PED = 2.22; // Chord centerline just above +1.95 m cast-iron arch pedestal shoe
const THETA_MAX = Math.acos((Y_SPRING_PED - YC_ARCH) / R_INTR); // ~1.5146 rad, extending all the way to +1.95 m pedestals

function pierInnerEdgeU(y) {
  if (y < 2.50) return 40.95; // Projecting stone arch pedestal outer tie zone (37.12 .. 41.45 m)
  return wInner(y) - 0.48;
}

function archSample(sgn, idx) {
  const th = THETA_MAX * (1.0 - idx / N_HALF_BAYS); // idx=0 at +2.22 m pedestal shoe, idx=N_HALF_BAYS at crown u=0
  const st = Math.sin(th), ct = Math.cos(th);
  const yIn = YC_ARCH + R_INTR * ct;
  let uInRaw = R_INTR * st;
  if (yIn < 8.0) {
    const q = Math.max(0, Math.min(1, (8.0 - yIn) / (8.0 - Y_SPRING_PED)));
    uInRaw -= 0.50 * q * q * (3 - 2 * q);
  }
  const uPierIn = pierInnerEdgeU(yIn);
  const uIn = sgn * Math.min(uInRaw, uPierIn - 0.45);

  const yExRaw = YC_ARCH + R_EXTR * ct;
  const uExRaw = R_EXTR * st;
  const uPierEx = pierInnerEdgeU(Math.max(2.50, yExRaw));
  const clamped = uExRaw > uPierEx;
  const uEx = sgn * (clamped ? pierInnerEdgeU(yIn) : uExRaw);
  const yEx = clamped ? Math.min(yIn + 1.85, yExRaw) : yExRaw;
  return { uIn, yIn, uEx, yEx, th };
}

function addOrnateScrollBay(pri, lat, cast, f, s0, s1, wFn, withFestoon = true) {
  const fn = faceNorm(f);
  const pI0 = facePt(f, s0.uIn, s0.yIn, wFn(s0.yIn));
  const pI1 = facePt(f, s1.uIn, s1.yIn, wFn(s1.yIn));
  const pE0 = facePt(f, s0.uEx, s0.yEx, wFn(s0.yEx));
  const pE1 = facePt(f, s1.uEx, s1.yEx, wFn(s1.yEx));
  const uvPt = (tu, tr) => vLerp(vLerp(pI0, pI1, tu), vLerp(pE0, pE1, tu), tr);

  // Heavy curved intrados & extrados riveted box chords + radial post
  pri.addBeam(pI0, pI1, 0.42, 0.46, fn);
  pri.addBeam(pE0, pE1, 0.40, 0.44, fn);
  pri.addBeam(pI0, pE0, 0.21, 0.34, fn);

  // Pl. 67 Fig. 14 ("Panneau décoré des faces 1 et 4 — Volute et macaron"):
  // 1) Central radial mullion + symmetric \|/ V-diagonals
  lat.addBeam(uvPt(0.50, 0.02), uvPt(0.50, 0.98), 0.095, 0.18, fn);
  lat.addBeam(uvPt(0.45, 0.04), uvPt(0.07, 0.96), 0.105, 0.19, fn);
  lat.addBeam(uvPt(0.55, 0.04), uvPt(0.93, 0.96), 0.105, 0.19, fn);

  // 2) Smooth 8-segment semicircular inscribed arch rib springing up side posts to crown (0.50, 0.73)
  lat.addBeam(uvPt(0.06, 0.05), uvPt(0.06, 0.43), 0.078, 0.15, fn);
  lat.addBeam(uvPt(0.94, 0.05), uvPt(0.94, 0.43), 0.078, 0.15, fn);
  for (let k = 0; k < 8; k++) {
    const a0 = (k / 8) * Math.PI, a1 = ((k + 1) / 8) * Math.PI;
    lat.addBeam(
      uvPt(0.50 - Math.cos(a0) * 0.44, 0.43 + Math.sin(a0) * 0.30),
      uvPt(0.50 - Math.cos(a1) * 0.44, 0.43 + Math.sin(a1) * 0.30),
      0.082, 0.16, fn
    );
  }

  // 3) 4 Wrought-Iron S-Volute Spirals + Cast-Iron "Macaron" Rosette Medallions (Pl. 67 Fig. 14 Coupe EF)
  const addVoluteSpiral = (cu, cr, su, sr, turnsSign) => {
    const eye = uvPt(cu, cr);
    cast.addSphere(eye, 0.092, 8, 6);
    let prev = eye;
    for (let s = 1; s <= 6; s++) {
      const t = s / 6;
      const ang = turnsSign * (0.25 + t * 1.45) * Math.PI;
      const rad = 0.025 + t * 0.92;
      const cur = uvPt(cu + Math.cos(ang) * su * rad, cr + Math.sin(ang) * sr * rad);
      lat.addBeam(prev, cur, 0.062, 0.13, fn);
      prev = cur;
    }
  };
  addVoluteSpiral(0.30, 0.81, 0.15, 0.13, 1);
  addVoluteSpiral(0.70, 0.81, -0.15, 0.13, 1);
  addVoluteSpiral(0.21, 0.19, -0.14, -0.13, 1);
  addVoluteSpiral(0.79, 0.19, 0.14, -0.13, 1);
  cast.addSphere(uvPt(0.50, 0.73), 0.088, 8, 6);

  // 4) Hanging Intrados Openwork Festoon ("feston ajouré", Photo 36: tangent circular rings + cusped pendant scallops)
  if (withFestoon) {
    const inPt = (tu, dRad) => {
      const u = s0.uIn + (s1.uIn - s0.uIn) * tu;
      const y = s0.yIn + (s1.yIn - s0.yIn) * tu;
      const len = Math.hypot(u, y - YC_ARCH) || 1;
      const uOff = u - (u / len) * dRad, yOff = y - ((y - YC_ARCH) / len) * dRad;
      return facePt(f, uOff, yOff, wFn(yOff));
    };
    for (const tc of [0.25, 0.75]) {
      for (let k = 0; k < 8; k++) {
        const a0 = (k / 8) * Math.PI * 2, a1 = ((k + 1) / 8) * Math.PI * 2;
        lat.addBeam(
          inPt(tc + Math.cos(a0) * 0.115, 0.175 + Math.sin(a0) * 0.125),
          inPt(tc + Math.cos(a1) * 0.115, 0.175 + Math.sin(a1) * 0.125),
          0.048, 0.10, fn
        );
      }
      // Cusped pendant twin-arch scallop framing each festoon ring
      const tL = tc - 0.25, tR = tc + 0.25;
      lat.addBeam(inPt(tL, 0.03), inPt(tL, 0.34), 0.052, 0.11, fn);
      lat.addBeam(inPt(tL, 0.34), inPt(tc - 0.09, 0.29), 0.050, 0.10, fn);
      lat.addBeam(inPt(tc - 0.09, 0.29), inPt(tc + 0.09, 0.29), 0.050, 0.10, fn);
      lat.addBeam(inPt(tc + 0.09, 0.29), inPt(tR, 0.34), 0.050, 0.10, fn);
      if (tc > 0.5) lat.addBeam(inPt(1.0, 0.03), inPt(1.0, 0.34), 0.052, 0.11, fn);
    }
  }
}

function extradosYAtU(uAbs) {
  if (uAbs >= R_EXTR - 0.05) return Y_SPRING_PED + 1.5;
  return YC_ARCH + Math.sqrt(Math.max(0, R_EXTR * R_EXTR - uAbs * uAbs));
}

function spandrelTopY(u) {
  return Math.min(Y_POUTRE_ARC_BOT + 0.08, 2.50 + (44.4535 - Math.abs(u)) / 0.5295526);
}

// Pl. 20, Pl. 66 & Pl. 67 Figs. 19-20: 2-tier (~48°) Saint-André diamond spandrel lattice (transitioning to 1 tier near crown)
function addSpandrelDiamondBay(pri, lat, f, ua, ub, wFn) {
  const fn = faceNorm(f);
  const yb0 = extradosYAtU(Math.abs(ua)), yb1 = extradosYAtU(Math.abs(ub));
  const yt0 = spandrelTopY(ua), yt1 = spandrelTopY(ub);
  const h0 = yt0 - yb0, h1 = yt1 - yb1, hAvg = (h0 + h1) * 0.5;
  if (Math.min(h0, h1) < 1.15) return;

  pri.addBeam(facePt(f, ua, yb0, wFn(yb0)), facePt(f, ua, yt0, wFn(yt0)), 0.21, 0.32, fn);
  const nTiers = hAvg >= 9.0 ? 3 : hAvg >= 3.05 ? 2 : 1;
  for (let t = 0; t < nTiers; t++) {
    const f0 = t / nTiers, f1 = (t + 1) / nTiers;
    const yL0 = yb0 + h0 * f0, yL1 = yb0 + h0 * f1;
    const yR0 = yb1 + h1 * f0, yR1 = yb1 + h1 * f1;
    lat.addBeam(facePt(f, ua, yL0, wFn(yL0)), facePt(f, ub, yR1, wFn(yR1)), 0.14, 0.20, fn);
    lat.addBeam(facePt(f, ub, yR0, wFn(yR0)), facePt(f, ua, yL1, wFn(yL1)), 0.14, 0.20, fn);
    if (t > 0) {
      lat.addBeam(facePt(f, ua, yL0, wFn(yL0)), facePt(f, ub, yR0, wFn(yR0)), 0.11, 0.18, fn);
    }
  }
}

export function buildDecorativeArchPieces(THREE, mats) {
  const out = [];

  // 3 Cantilevered Construction Stages (Phase 5 [4.87, 5.38] — erected AFTER Photo 14 15 May 1888 at step 4.85, BEFORE Photo 01 21 Aug 1888 at step 5.66!)
  const stages = [
    { id: 'z2_arches_haunches', phase: 5, span: [4.87, 5.08], bStart: 0, bEnd: 12, includeBaseShoe: true, photoRefs: ['01', '36', '18'] },
    { id: 'z2_arches_midspan', phase: 5, span: [5.04, 5.24], bStart: 12, bEnd: 23, includeBaseShoe: false, photoRefs: ['01', '36', '18'] },
    { id: 'z2_arches_crown', phase: 5, span: [5.20, 5.38], bStart: 23, bEnd: N_HALF_BAYS, includeBaseShoe: false, photoRefs: ['01', '46', '36', '18'] },
  ];

  // Smoothly seat lower arch ribs (<12m) directly onto Zone 1's projecting arch pedestals (w=57.80m & 46.10m at Y=+1.95m)
  const wExt = (y) => {
    const base = wOuter(y) - 0.16;
    if (y >= 12.0) return base;
    const t = Math.max(0, Math.min(1, (12.0 - y) / (12.0 - Y_ARCH_BASE)));
    const s = t * t * (3 - 2 * t);
    return base * (1 - s) + 57.85 * s;
  };
  const wInt = (y) => {
    const base = wInner(y) + 0.16;
    if (y >= 12.0) return base;
    const t = Math.max(0, Math.min(1, (12.0 - y) / (12.0 - Y_ARCH_BASE)));
    const s = t * t * (3 - 2 * t);
    return base * (1 - s) + 46.10 * s;
  };

  for (const stg of stages) {
    const pb = new PieceBuilder();
    const pri = pb.use(mats.ironPrimary);
    const lat = pb.use(mats.ironLattice);
    const cast = pb.use(mats.ironCast);
    const priInt = pb.use(mats.ironPrimary, { isInteriorArch: true });
    const latInt = pb.use(mats.ironLattice, { isInteriorArch: true });
    const castInt = pb.use(mats.ironCast, { isInteriorArch: true });

    for (let f = 0; f < 4; f++) {
      const fn = faceNorm(f);
      for (const sgn of [-1, 1]) {
        // Cast-iron arch springing shoes (`Sabots de l'arc`) seated at exact Y = +1.950 m on Zone 1's projecting pedestals
        if (stg.includeBaseShoe) {
          const sBase = archSample(sgn, 0);
          const uMid = (sBase.uIn + sBase.uEx) * 0.5;
          const shoeW = Math.abs(sBase.uEx - sBase.uIn) + 0.36;
          const wPedExt = wExt(Y_ARCH_BASE);
          const wPedInt = wInt(Y_ARCH_BASE);
          cast.addBeam(facePt(f, uMid, Y_ARCH_BASE, wPedExt), facePt(f, uMid, Y_SPRING_PED + 0.12, wPedExt), shoeW, 0.92, fn, true);
          castInt.addBeam(facePt(f, uMid, Y_ARCH_BASE, wPedInt), facePt(f, uMid, Y_SPRING_PED + 0.12, wPedInt), shoeW, 0.92, fn, true);
          latInt.addBeam(facePt(f, sBase.uIn, Y_SPRING_PED + 0.10, wExt(Y_SPRING_PED)), facePt(f, sBase.uIn, Y_SPRING_PED + 0.10, wInt(Y_SPRING_PED)), 0.22, 0.22);
        }

        for (let b = stg.bStart; b < stg.bEnd; b++) {
          const s0 = archSample(sgn, b);
          const s1 = archSample(sgn, b + 1);
          // Pl. 67 Fig. 14 ("Panneau décoré des faces 1 et 4"): both exterior & courtyard faces carry Volute et macaron + festoon!
          addOrnateScrollBay(pri, lat, cast, f, s0, s1, wExt, b >= 2);
          addOrnateScrollBay(priInt, latInt, castInt, f, s0, s1, wInt, b >= 2);

          // 3D Transverse Wind-Bracing tying Exterior & Interior Arches (Pl. 67 Figs. 2, 22, 23)
          if (b % 2 === 0 || b === N_HALF_BAYS - 1) {
            const pExtI = facePt(f, s0.uIn, s0.yIn, wExt(s0.yIn));
            const pIntI = facePt(f, s0.uIn, s0.yIn, wInt(s0.yIn));
            const pExtE = facePt(f, s0.uEx, s0.yEx, wExt(s0.yEx));
            const pIntE = facePt(f, s0.uEx, s0.yEx, wInt(s0.yEx));
            latInt.addBeam(pExtI, pIntI, 0.20, 0.20);
            latInt.addBeam(pExtE, pIntE, 0.20, 0.20);
            const pExtNextI = facePt(f, s1.uIn, s1.yIn, wExt(s1.yIn));
            const pIntNextI = facePt(f, s1.uIn, s1.yIn, wInt(s1.yIn));
            latInt.addBeam(pExtI, pIntNextI, 0.13, 0.13);
            latInt.addBeam(pIntI, pExtNextI, 0.13, 0.13);
          }
        }

        // Plumb 3.825 m 2-tier (~48°) Saint-André diamond spandrel lattice (Tympan de l'Arc, Pl. 20, Pl. 66, Pl. 67 Figs. 19-20)
        const duSp = 3.825;
        const kRange = stg.bStart === 0 ? [5, 9] : stg.bStart === 12 ? [1, 5] : [0, 1];
        for (let k = kRange[0]; k < kRange[1]; k++) {
          const ua = sgn * k * duSp, ub = sgn * (k + 1) * duSp;
          addSpandrelDiamondBay(pri, lat, f, ua, ub, wExt);
          addSpandrelDiamondBay(priInt, latInt, f, ua, ub, wInt);
        }
      }
      // Crown central radial & spandrel post at u = 0 when crown closes
      if (stg.bEnd === N_HALF_BAYS) {
        const sc = archSample(1, N_HALF_BAYS);
        const yTop = Y_POUTRE_ARC_BOT + 0.08;
        pri.addBeam(facePt(f, 0, sc.yIn, wExt(sc.yIn)), facePt(f, 0, yTop, wExt(yTop)), 0.24, 0.38, fn);
        priInt.addBeam(facePt(f, 0, sc.yIn, wInt(sc.yIn)), facePt(f, 0, yTop, wInt(yTop)), 0.20, 0.32, fn);
        latInt.addBeam(facePt(f, 0, sc.yIn, wExt(sc.yIn)), facePt(f, 0, sc.yIn, wInt(sc.yIn)), 0.22, 0.22);
      }
    }

    out.push(pb.build(THREE, {
      id: stg.id, phase: stg.phase, span: stg.span,
      plateRefs: ['67', '66', '20', '55'], photoRefs: stg.photoRefs,
    }));
  }

  // 4. 1889 Phase 9 Semicircular Spandrel Arch Rings & Exterior Arch Globe Lamps ([9.60, 10.00], Photo 36!)
  {
    const pb = new PieceBuilder();
    const pri = pb.use(mats.ironPrimary);
    const priInt = pb.use(mats.ironPrimary, { isInteriorArch: true });
    const cast = pb.use(mats.ironCast);
    const gold = pb.use(mats.goldAccent);
    const globe = pb.use(mats.lampGlobe1889);

    for (let f = 0; f < 4; f++) {
      const fn = faceNorm(f);
      for (const sgn of [-1, 1]) {
        // Ornamental semicircular spandrel arch moldings across clear span (Photo 36 & Pl. 55; hidden on bare-ossature Pl. 66!)
        for (let k = 0; k < 5; k++) {
          const ua = sgn * k * BAY_W, ub = sgn * (k + 1) * BAY_W, uc = (ua + ub) * 0.5;
          const ybMax = Math.max(extradosYAtU(Math.abs(ua)), extradosYAtU(Math.abs(ub)));
          const ytMin = Math.min(spandrelTopY(ua), spandrelTopY(ub));
          const rSp = Math.min(BAY_W * 0.44, (ytMin - ybMax) * 0.44);
          if (rSp > 0.55) {
            const ySp = ytMin - 0.18 - rSp;
            for (const [wFn, pBuilder] of [[wExt, pri], [wInt, priInt]]) {
              for (let s = 0; s < 8; s++) {
                const a0 = (s / 8) * Math.PI, a1 = ((s + 1) / 8) * Math.PI;
                const su0 = uc - Math.cos(a0) * rSp * sgn, sy0 = ySp + Math.sin(a0) * rSp;
                const su1 = uc - Math.cos(a1) * rSp * sgn, sy1 = ySp + Math.sin(a1) * rSp;
                pBuilder.addBeam(facePt(f, su0, sy0, wFn(sy0)), facePt(f, su1, sy1, wFn(sy1)), 0.16, 0.26, fn);
              }
            }
          }
        }
        for (let b = 1; b < N_HALF_BAYS; b++) {
          const s0 = archSample(sgn, b), s1 = archSample(sgn, b + 1);
          // 3 bright spherical opaline lamps per radial bay along the exterior intrados chord (Photo 36!)
          for (const frac of [0.18, 0.50, 0.82]) {
            const u = s0.uIn + (s1.uIn - s0.uIn) * frac;
            const y = s0.yIn + (s1.yIn - s0.yIn) * frac + 0.06;
            const wBase = wExt(y) + 0.24;
            const pMount = facePt(f, u, y, wBase);
            const pCap = facePt(f, u, y - 0.10, wBase + 0.18);
            const pGlobe = facePt(f, u, y - 0.22, wBase + 0.20);
            cast.addBeam(pMount, pCap, 0.05, 0.05);
            gold.addCylinder([pCap[0], pCap[1] + 0.03, pCap[2]], [pCap[0], pCap[1] - 0.04, pCap[2]], 0.06, 0.09, 8, true);
            globe.addSphere(pGlobe, 0.135, 8, 6);
          }
        }
      }
    }

    out.push(pb.build(THREE, {
      id: 'z2_arch_globe_lamps_1889', phase: 9, span: [9.60, 10.00],
      plateRefs: ['20', '67'], photoRefs: ['36', '18'],
    }));
  }

  return out;
}
