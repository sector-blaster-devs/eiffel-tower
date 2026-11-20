/**
 * Zone 2 — 4 Ornate 1889 Wooden/Iron Restaurant Pavilions & 4 Corner Bar/Salon Cupola Pavilions
 * (`Restaurant Français`, `Restaurant Russe`, `Brasserie Flamande`, `Bar Anglo-Américain`, Phase 9 [9.20, 9.90]).
 * Derived from Pl. 20, Pl. 53 Fig. 9, and archival Photos 18, 36, 12, 21.
 */

import {
  Y_FLOOR1_DECK, BAY_W, facePt, faceNorm, PieceBuilder,
} from './z2_geom_helpers.js';

function addOctagonalCupola(pri, copper, gold, cx, cz, yBase, rBase, hDome, hFinial) {
  const segs = 8;
  const rings = [
    [yBase, rBase],
    [yBase + hDome * 0.25, rBase * 0.96],
    [yBase + hDome * 0.58, rBase * 0.78],
    [yBase + hDome * 0.85, rBase * 0.46],
    [yBase + hDome, rBase * 0.16],
  ];
  // Moulded cornice drum at base of cupola
  pri.addCylinder([cx, yBase - 0.14, cz], [cx, yBase + 0.04, cz], rBase * 1.06, rBase * 1.06, segs, true);

  for (let r = 0; r < rings.length - 1; r++) {
    const [y0, rad0] = rings[r];
    const [y1, rad1] = rings[r + 1];
    copper.addCylinder([cx, y0, cz], [cx, y1, cz], rad0, rad1, segs, r === rings.length - 2);
    for (let s = 0; s < segs; s++) {
      const a = (s / segs) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      pri.addBeam(
        [cx + ca * (rad0 + 0.02), y0, cz + sa * (rad0 + 0.02)],
        [cx + ca * (rad1 + 0.02), y1, cz + sa * (rad1 + 0.02)],
        0.045, 0.045
      );
    }
  }
  // Gilded wrought-iron lightning finial standard & collar orb (strictly <= +63.48 m behind arch crowns!)
  const yApex = yBase + hDome;
  pri.addCylinder([cx, yApex - 0.04, cz], [cx, yApex + hFinial * 0.45, cz], 0.068, 0.042, 8, true);
  gold.addCylinder([cx, yApex + hFinial * 0.42, cz], [cx, yApex + hFinial, cz], 0.036, 0.012, 8, true);
  gold.addSphere([cx, yApex + hFinial * 0.42, cz], 0.095, 8, 6);
}

function addDormerLucarne(pri, wood, glass, gold, f, uc, wFront, dirSign, yBase) {
  // Classical 1889 clerestory dormer window (lucarne) with pitched gable & gold finial (Restaurant Français & Anglo-Américain)
  const fn = faceNorm(f);
  const hw = 0.68, yTop = yBase + 0.50, yGable = yBase + 0.80;
  const wBack = wFront - dirSign * 1.10;
  const pFL = facePt(f, uc - hw, yBase, wFront), pFR = facePt(f, uc + hw, yBase, wFront);
  const pTL = facePt(f, uc - hw, yTop, wFront), pTR = facePt(f, uc + hw, yTop, wFront);
  const pPeak = facePt(f, uc, yGable, wFront);
  const pRidgeB = facePt(f, uc, yGable - 0.06, wBack);

  wood.addBeam(pFL, pTL, 0.11, 0.13, fn);
  wood.addBeam(pFR, pTR, 0.11, 0.13, fn);
  glass.addQuad(pFL, pFR, pTR, pTL);
  pri.addBeam(facePt(f, uc, yBase, wFront), facePt(f, uc, yTop, wFront), 0.04, 0.05, fn);
  wood.addTri(pTL, pTR, pPeak);
  pri.addBeam(pTL, pPeak, 0.10, 0.12, fn);
  pri.addBeam(pTR, pPeak, 0.10, 0.12, fn);
  wood.addQuad(pTL, facePt(f, uc - hw, yTop, wBack), pRidgeB, pPeak);
  wood.addQuad(facePt(f, uc + hw, yTop, wBack), pTR, pPeak, pRidgeB);
  gold.addCylinder(pPeak, [pPeak[0], pPeak[1] + 0.18, pPeak[2]], 0.036, 0.010, 6, true);
}

function addGlazedSkylightLantern(pri, glass, copper, gold, f, uc, wMid, yBase, halfU, halfW, hWall) {
  // Classical 1889 glazed roof monitor lantern (lanterneau vitré, Restaurant Brébant/Français & Bar Anglo-Américain)
  const fn = faceNorm(f);
  const yTop = yBase + hWall, yCap = yTop + 0.34;
  const u0 = uc - halfU, u1 = uc + halfU, w0 = wMid - halfW, w1 = wMid + halfW;
  for (const [su, sw] of [[u0, w0], [u1, w0], [u1, w1], [u0, w1]]) {
    pri.addBeam(facePt(f, su, yBase, sw), facePt(f, su, yTop, sw), 0.08, 0.08, fn);
  }
  glass.addQuad(facePt(f, u0, yBase, w1), facePt(f, u1, yBase, w1), facePt(f, u1, yTop, w1), facePt(f, u0, yTop, w1));
  glass.addQuad(facePt(f, u1, yBase, w0), facePt(f, u0, yBase, w0), facePt(f, u0, yTop, w0), facePt(f, u1, yTop, w0));
  glass.addQuad(facePt(f, u0, yBase, w0), facePt(f, u0, yBase, w1), facePt(f, u0, yTop, w1), facePt(f, u0, yTop, w0));
  glass.addQuad(facePt(f, u1, yBase, w1), facePt(f, u1, yBase, w0), facePt(f, u1, yTop, w0), facePt(f, u1, yTop, w1));
  const nM = Math.max(2, Math.round((halfU * 2) / 0.65));
  for (let i = 1; i < nM; i++) {
    const um = u0 + (u1 - u0) * (i / nM);
    pri.addBeam(facePt(f, um, yBase, w1), facePt(f, um, yTop, w1), 0.04, 0.05, fn);
    pri.addBeam(facePt(f, um, yBase, w0), facePt(f, um, yTop, w0), 0.04, 0.05, fn);
  }
  const uR0 = uc - halfU * 0.65, uR1 = uc + halfU * 0.65;
  copper.addQuad(facePt(f, u0, yTop, w0), facePt(f, u1, yTop, w0), facePt(f, uR1, yCap, wMid), facePt(f, uR0, yCap, wMid));
  copper.addQuad(facePt(f, u1, yTop, w1), facePt(f, u0, yTop, w1), facePt(f, uR0, yCap, wMid), facePt(f, uR1, yCap, wMid));
  copper.addTri(facePt(f, u0, yTop, w1), facePt(f, u0, yTop, w0), facePt(f, uR0, yCap, wMid));
  copper.addTri(facePt(f, u1, yTop, w0), facePt(f, u1, yTop, w1), facePt(f, uR1, yCap, wMid));
  gold.addBeam(facePt(f, uR0, yCap + 0.05, wMid), facePt(f, uR1, yCap + 0.05, wMid), 0.045, 0.045);
  for (const ux of [uR0, uc, uR1]) {
    const pF = facePt(f, ux, yCap, wMid);
    gold.addCylinder(pF, [pF[0], pF[1] + 0.28, pF[2]], 0.038, 0.012, 6, true);
  }
}

function addKokoshnikGable(pri, wood, glass, gold, f, uc, wFront, dirSign, yBase, hw, hOgee) {
  // Photo 21 Restaurant Russe: carved wooden Russian kokoshnik ogee gable, scalloped fretwork bargeboard & pendant drop finial
  const fn = faceNorm(f);
  const wBack = wFront - dirSign * 0.95;
  const ogeeY = (t) => {
    // Classic S-curved Russian ogee (accolade): convex lower haunch + concave upper cusp point
    const s = t < 0.62 ? Math.sin((t / 0.62) * Math.PI * 0.5) * 0.72 : 0.72 + Math.pow((t - 0.62) / 0.38, 1.55) * 0.28;
    return yBase + hOgee * s;
  };
  const segs = 6;
  const pCenter = facePt(f, uc, yBase + hOgee * 0.18, wFront);
  for (const sgn of [-1, 1]) {
    for (let i = 0; i < segs; i++) {
      const t0 = i / segs, t1 = (i + 1) / segs;
      const u0 = uc + sgn * hw * (1 - t0), y0 = ogeeY(t0);
      const u1 = uc + sgn * hw * (1 - t1), y1 = ogeeY(t1);
      const uI0 = uc + sgn * hw * 0.76 * (1 - t0), yI0 = yBase + (y0 - yBase) * 0.74;
      const uI1 = uc + sgn * hw * 0.76 * (1 - t1), yI1 = yBase + (y1 - yBase) * 0.74;
      // Outer carved ogee bargeboard & scalloped inner fretwork band (Photo 21!)
      wood.addBeam(facePt(f, u0, y0, wFront), facePt(f, u1, y1, wFront), 0.13, 0.16, fn);
      gold.addBeam(facePt(f, u0, y0 + 0.05, wFront + dirSign * 0.02), facePt(f, u1, y1 + 0.05, wFront + dirSign * 0.02), 0.045, 0.06, fn);
      wood.addQuad(facePt(f, uI0, yI0, wFront), facePt(f, uI1, yI1, wFront), facePt(f, u1, y1, wFront), facePt(f, u0, y0, wFront));
      // Fretwork radial dentil spokes & roof barrel cheek
      pri.addBeam(facePt(f, uI0, yI0, wFront + dirSign * 0.02), facePt(f, u0, y0, wFront + dirSign * 0.02), 0.04, 0.05, fn);
      wood.addQuad(facePt(f, u0, y0, wFront), facePt(f, u1, y1, wFront), facePt(f, u1, y1 - 0.05, wBack), facePt(f, u0, y0 - 0.05, wBack));
      glass.addTri(pCenter, facePt(f, uI0, yI0, wFront - dirSign * 0.02), facePt(f, uI1, yI1, wFront - dirSign * 0.02));
    }
  }
  // Carved Photo 21 central wooden pendant drop finial (cul-de-lampe) + spirelet
  const pApex = facePt(f, uc, yBase + hOgee, wFront);
  wood.addBeam(facePt(f, uc, yBase + hOgee * 0.42, wFront + dirSign * 0.03), pApex, 0.12, 0.10, fn);
  gold.addSphere(facePt(f, uc, yBase + hOgee * 0.40, wFront + dirSign * 0.03), 0.065, 6, 5);
  gold.addCylinder(pApex, [pApex[0], pApex[1] + 0.32, pApex[2]], 0.042, 0.012, 6, true);
}

function addRussianFacetedTurret(pri, wood, copper, gold, cx, cz, yBase, rBase, hTotal) {
  // Faceted 8-sided Russian Boyar tent/onion turret finial (Restaurant Russe, Photo 21)
  const segs = 8;
  const prof = [
    [0.00, 1.00, wood],
    [0.22, 1.04, wood],
    [0.36, 0.72, copper],
    [0.50, 0.88, copper], // Onion-bulb swell
    [0.64, 0.48, copper],
    [1.00, 0.08, copper], // Steep 8-facet shatyor tent spire
  ];
  for (let i = 0; i < prof.length - 1; i++) {
    const [t0, k0, mat] = prof[i], [t1, k1] = prof[i + 1];
    const y0 = yBase + hTotal * t0, y1 = yBase + hTotal * t1;
    const r0 = rBase * k0, r1 = rBase * k1;
    mat.addCylinder([cx, y0, cz], [cx, y1, cz], r0, r1, segs, i === prof.length - 2);
    for (let s = 0; s < segs; s++) {
      const a = (s / segs) * Math.PI * 2;
      pri.addBeam(
        [cx + Math.cos(a) * (r0 + 0.02), y0, cz + Math.sin(a) * (r0 + 0.02)],
        [cx + Math.cos(a) * (r1 + 0.02), y1, cz + Math.sin(a) * (r1 + 0.02)],
        0.042, 0.042
      );
    }
  }
  const yTip = yBase + hTotal;
  gold.addSphere([cx, yTip + 0.08, cz], 0.105, 8, 6);
  gold.addCylinder([cx, yTip + 0.14, cz], [cx, yTip + 0.52, cz], 0.036, 0.010, 8, true);
}

function addFlemishSteppedGable(pri, wood, glass, gold, f, uc, wFront, dirSign, yBase, hw, hStepTotal) {
  // Brasserie Flamande: 5-tier crow-stepped Flemish Renaissance gable (pignon à redents) & cross-mullion window
  const fn = faceNorm(f);
  const wBack = wFront - dirSign * 1.05;
  const nSteps = 5;
  glass.addQuad(
    facePt(f, uc - hw * 0.72, yBase, wFront - dirSign * 0.02),
    facePt(f, uc + hw * 0.72, yBase, wFront - dirSign * 0.02),
    facePt(f, uc + hw * 0.72, yBase + hStepTotal * 0.56, wFront - dirSign * 0.02),
    facePt(f, uc - hw * 0.72, yBase + hStepTotal * 0.56, wFront - dirSign * 0.02)
  );
  pri.addBeam(facePt(f, uc, yBase, wFront), facePt(f, uc, yBase + hStepTotal * 0.56, wFront), 0.05, 0.06, fn);
  pri.addBeam(facePt(f, uc - hw * 0.72, yBase + hStepTotal * 0.30, wFront), facePt(f, uc + hw * 0.72, yBase + hStepTotal * 0.30, wFront), 0.05, 0.06);

  for (let s = 0; s < nSteps; s++) {
    const t0 = s / nSteps, t1 = (s + 1) / nSteps;
    const wStep = hw * (1 - s / (nSteps + 0.3));
    const y0 = yBase + hStepTotal * t0, y1 = yBase + hStepTotal * t1;
    // Stepped Flemish masonry/timber tier + stone/gold coping cap on each step!
    wood.addQuad(facePt(f, uc - wStep, y0, wFront), facePt(f, uc + wStep, y0, wFront), facePt(f, uc + wStep, y1, wFront), facePt(f, uc - wStep, y1, wFront));
    gold.addBeam(facePt(f, uc - wStep - 0.05, y1, wFront), facePt(f, uc + wStep + 0.05, y1, wFront), 0.055, 0.14);
  }
  const yTop = yBase + hStepTotal;
  wood.addQuad(facePt(f, uc - hw, yBase, wFront), facePt(f, uc - hw, yBase, wBack), facePt(f, uc, yTop - 0.08, wBack), facePt(f, uc, yTop, wFront));
  wood.addQuad(facePt(f, uc + hw, yBase, wBack), facePt(f, uc + hw, yBase, wFront), facePt(f, uc, yTop, wFront), facePt(f, uc, yTop - 0.08, wBack));
  const pPin = facePt(f, uc, yTop, wFront);
  pri.addCylinder(pPin, [pPin[0], pPin[1] + 0.36, pPin[2]], 0.045, 0.014, 6, true);
  gold.addSphere([pPin[0], pPin[1] + 0.38, pPin[2]], 0.06, 6, 5);
}

function addCourtyardArchedWall(pri, lat, wood, glass, gold, f, uMin, uMax, wWall, nBays, style = 'francais') {
  const fn = faceNorm(f);
  const y0 = Y_FLOOR1_DECK, yDado = 58.52, ySpring = 59.80, yEave = 61.58;
  const baySpan = (uMax - uMin) / nBays;

  wood.addBeam(facePt(f, uMin, yEave, wWall), facePt(f, uMax, yEave, wWall), 0.24, 0.30);
  wood.addBeam(facePt(f, uMin, 62.06, wWall), facePt(f, uMax, 62.06, wWall), 0.09, 0.11);

  for (let b = 0; b < nBays; b++) {
    const ua = uMin + b * baySpan, ub = ua + baySpan, uc = (ua + ub) * 0.5;
    wood.addBeam(facePt(f, ua, y0, wWall), facePt(f, ua, 62.10, wWall), 0.20, 0.22, fn);
    wood.addBeam(facePt(f, ua, 60.95, wWall), facePt(f, ua, yEave, wWall - 0.34), 0.13, 0.15);
    if (b === nBays - 1) {
      wood.addBeam(facePt(f, ub, y0, wWall), facePt(f, ub, 62.10, wWall), 0.20, 0.22, fn);
    }
    for (let t = 0.15; t < 0.90; t += 0.22) {
      const ur = ua + baySpan * t;
      wood.addBeam(facePt(f, ur, yEave, wWall), facePt(f, ur, 62.06, wWall), 0.055, 0.055, fn);
    }
    wood.addQuad(
      facePt(f, ua + 0.10, y0, wWall), facePt(f, ub - 0.10, y0, wWall),
      facePt(f, ub - 0.10, yDado, wWall), facePt(f, ua + 0.10, yDado, wWall)
    );
    lat.addBeam(facePt(f, ua + 0.12, y0 + 0.08, wWall - 0.03), facePt(f, ub - 0.12, yDado - 0.08, wWall - 0.03), 0.06, 0.05);
    lat.addBeam(facePt(f, ub - 0.12, y0 + 0.08, wWall - 0.03), facePt(f, ua + 0.12, yDado - 0.08, wWall - 0.03), 0.06, 0.05);

    const wa = ua + 0.24, wb = ub - 0.24, rW = Math.min(1.52, (wb - wa) * 0.5);
    if (style === 'flamande') {
      // Flemish Brasserie: heavy oak cross-mullion rectangular casements + leaded diamond transom & half-timber bracing
      glass.addQuad(facePt(f, wa, yDado, wWall), facePt(f, wb, yDado, wWall), facePt(f, wb, yEave - 0.22, wWall), facePt(f, wa, yEave - 0.22, wWall));
      for (const um of [wa + (wb - wa) / 3, wa + ((wb - wa) * 2) / 3]) {
        wood.addBeam(facePt(f, um, yDado, wWall - 0.03), facePt(f, um, yEave - 0.22, wWall - 0.03), 0.085, 0.10, fn);
      }
      for (const yt of [59.35, 60.25, 60.95]) {
        wood.addBeam(facePt(f, wa, yt, wWall - 0.03), facePt(f, wb, yt, wWall - 0.03), 0.08, 0.10);
      }
      wood.addBeam(facePt(f, ua + 0.12, y0, wWall - 0.04), facePt(f, uc, yDado, wWall - 0.04), 0.08, 0.07);
      wood.addBeam(facePt(f, ub - 0.12, y0, wWall - 0.04), facePt(f, uc, yDado, wWall - 0.04), 0.08, 0.07);
    } else {
      glass.addQuad(facePt(f, wa, yDado, wWall), facePt(f, wb, yDado, wWall), facePt(f, wb, ySpring, wWall), facePt(f, wa, ySpring, wWall));
      for (let s = 0; s < 6; s++) {
        const a0 = (s / 6) * Math.PI, a1 = ((s + 1) / 6) * Math.PI;
        const p0 = facePt(f, uc - Math.cos(a0) * rW, ySpring + Math.sin(a0) * rW, wWall);
        const p1 = facePt(f, uc - Math.cos(a1) * rW, ySpring + Math.sin(a1) * rW, wWall);
        glass.addTri(facePt(f, uc, ySpring, wWall), p0, p1);
        wood.addBeam(p0, p1, 0.085, 0.11, fn);
      }
      pri.addBeam(facePt(f, uc, yDado, wWall), facePt(f, uc, ySpring + rW, wWall), 0.04, 0.05, fn);
      pri.addBeam(facePt(f, wa, 59.16, wWall), facePt(f, wb, 59.16, wWall), 0.045, 0.06);
      wood.addQuad(
        facePt(f, ua + 0.10, ySpring + rW - 0.08, wWall + 0.02), facePt(f, ub - 0.10, ySpring + rW - 0.08, wWall + 0.02),
        facePt(f, ub - 0.10, yEave, wWall + 0.02), facePt(f, ua + 0.10, yEave, wWall + 0.02)
      );
      if (style === 'russe') {
        // Photo 21: carved Russian ogee arch valence & central wooden pendant inside each bay!
        wood.addBeam(facePt(f, wa, ySpring + 0.15, wWall - 0.06), facePt(f, uc, ySpring + rW + 0.18, wWall - 0.06), 0.11, 0.09, fn);
        wood.addBeam(facePt(f, wb, ySpring + 0.15, wWall - 0.06), facePt(f, uc, ySpring + rW + 0.18, wWall - 0.06), 0.11, 0.09, fn);
        wood.addBeam(facePt(f, uc, ySpring + rW - 0.35, wWall - 0.07), facePt(f, uc, ySpring + rW + 0.22, wWall - 0.07), 0.10, 0.08, fn);
      } else if (style === 'anglo') {
        // Bar Anglo-Américain: projecting shallow bow-transom sill & mullion grid
        wood.addBeam(facePt(f, wa, yDado, wWall - 0.18), facePt(f, wb, yDado, wWall - 0.18), 0.12, 0.34);
        wood.addBeam(facePt(f, wa, ySpring, wWall - 0.18), facePt(f, wb, ySpring, wWall - 0.18), 0.10, 0.32);
        pri.addBeam(facePt(f, wa + 0.45, yDado, wWall - 0.16), facePt(f, wa + 0.45, ySpring, wWall - 0.16), 0.045, 0.06, fn);
        pri.addBeam(facePt(f, wb - 0.45, yDado, wWall - 0.16), facePt(f, wb - 0.45, ySpring, wWall - 0.16), 0.045, 0.06, fn);
      }
    }
    if (b === 2 || b === 3) {
      gold.addBeam(facePt(f, wa + 0.15, 59.78, wWall - 0.05), facePt(f, wb - 0.15, 59.78, wWall - 0.05), 0.22, 0.04, fn);
    }
  }
}

// Historical May 1889 cardinal assignment matching facePt(f) & Gustave Eiffel's Plate 20:
// f=0 (+Z SE École Militaire, Pl. 20): Restaurant Français (Brébant)
// f=1 (+X NE La Bourdonnais / Paris) : Restaurant Russe (Photo 21, Pl. 20 right flank)
// f=2 (-Z NW Trocadéro / Seine)      : Brasserie Flamande
// f=3 (-X SW Grenelle / Suffren)     : Bar Anglo-Américain
const FACE_PAVILION_STYLE = ['francais', 'russe', 'flamande', 'anglo'];

export function buildPavilion1889Pieces(THREE, mats) {
  const pb = new PieceBuilder();
  const pri = pb.use(mats.ironPrimary);
  const lat = pb.use(mats.ironLattice);
  const wood = pb.use(mats.woodPavilion);
  const glass = pb.use(mats.glass1889);
  const copper = pb.use(mats.copperDome);
  const gold = pb.use(mats.goldAccent);

  const uPav = 3 * BAY_W - 0.28; // ±11.36 m -> 22.72 m wide (clears inclined Stage-2 pier legs cleanly!)
  const wIn = 18.62, wOut = 32.42;
  const yEave = 61.58, yMansard = 62.16, yRidge = 62.46;

  for (let f = 0; f < 4; f++) {
    const fn = faceNorm(f);
    const style = FACE_PAVILION_STYLE[f];
    // 1. Main Cardinal Restaurant Pavilion (V-valleys at u=±3.88, ±11.64m kept <=62.46m so Pl. 20 stays 99.1% P!)
    addCourtyardArchedWall(pri, lat, wood, glass, gold, f, -uPav, uPav, wIn, 6, style);

    for (const sgn of [-1, 1]) {
      const uSide = sgn * uPav;
      wood.addQuad(
        facePt(f, uSide, Y_FLOOR1_DECK, wIn), facePt(f, uSide, Y_FLOOR1_DECK, wOut),
        facePt(f, uSide, yEave, wOut), facePt(f, uSide, yEave, wIn)
      );
      for (let wStep = wIn + 0.5; wStep < wOut - 2.2; wStep += 3.2) {
        const wNext = wStep + 2.8;
        lat.addBeam(facePt(f, uSide + sgn * 0.04, 57.8, wStep), facePt(f, uSide + sgn * 0.04, yEave - 0.18, wNext), 0.07, 0.06);
        lat.addBeam(facePt(f, uSide + sgn * 0.04, 57.8, wNext), facePt(f, uSide + sgn * 0.04, yEave - 0.18, wStep), 0.07, 0.06);
        glass.addQuad(
          facePt(f, uSide + sgn * 0.05, 58.75, wStep + 0.4), facePt(f, uSide + sgn * 0.05, 58.75, wNext - 0.4),
          facePt(f, uSide + sgn * 0.05, 60.95, wNext - 0.4), facePt(f, uSide + sgn * 0.05, 60.95, wStep + 0.4)
        );
        if (style === 'flamande') {
          wood.addBeam(facePt(f, uSide + sgn * 0.06, 58.75, (wStep + wNext) * 0.5), facePt(f, uSide + sgn * 0.06, 60.95, (wStep + wNext) * 0.5), 0.08, 0.08);
          wood.addBeam(facePt(f, uSide + sgn * 0.06, 59.85, wStep + 0.4), facePt(f, uSide + sgn * 0.06, 59.85, wNext - 0.4), 0.08, 0.08);
        }
      }
    }

    const uM = uPav - 0.85, wM0 = wIn + 1.15, wM1 = wOut - 1.15, wMid = (wIn + wOut) * 0.5;
    wood.addQuad(facePt(f, -uPav, yEave, wIn), facePt(f, uPav, yEave, wIn), facePt(f, uM, yMansard, wM0), facePt(f, -uM, yMansard, wM0));
    wood.addQuad(facePt(f, uPav, yEave, wOut), facePt(f, -uPav, yEave, wOut), facePt(f, -uM, yMansard, wM1), facePt(f, uM, yMansard, wM1));
    wood.addQuad(facePt(f, -uPav, yEave, wOut), facePt(f, -uPav, yEave, wIn), facePt(f, -uM, yMansard, wM0), facePt(f, -uM, yMansard, wM1));
    wood.addQuad(facePt(f, uPav, yEave, wIn), facePt(f, uPav, yEave, wOut), facePt(f, uM, yMansard, wM1), facePt(f, uM, yMansard, wM0));

    pri.addQuad(facePt(f, -uM, yMansard, wM0), facePt(f, uM, yMansard, wM0), facePt(f, uM - 0.6, yRidge, wMid), facePt(f, -uM + 0.6, yRidge, wMid));
    pri.addQuad(facePt(f, uM, yMansard, wM1), facePt(f, -uM, yMansard, wM1), facePt(f, -uM + 0.6, yRidge, wMid), facePt(f, uM - 0.6, yRidge, wMid));

    // Ornamental wrought-iron & gilded roof ridge cresting (crête de faîtage, <= 62.66 m across V-valleys!)
    const uR = 2 * BAY_W + 0.8;
    pri.addBeam(facePt(f, -uR, yRidge + 0.03, wMid), facePt(f, uR, yRidge + 0.03, wMid), 0.07, 0.07);
    gold.addBeam(facePt(f, -uR, yRidge + 0.20, wMid), facePt(f, uR, yRidge + 0.20, wMid), 0.045, 0.045);
    for (let uC = -uR; uC <= uR + 0.01; uC += 0.85) {
      pri.addBeam(facePt(f, uC, yRidge, wMid), facePt(f, uC, yRidge + 0.21, wMid), 0.04, 0.04, fn);
    }

    // Per-Facade Distinct 1889 Roof Architecture (strictly aligned with u = 0 & u = ±7.76 m Grand Arch crowns!)
    if (style === 'russe') {
      // North (-Z) Restaurant Russe (Photo 21): Kokoshnik ogee gables, fretwork bargeboards & faceted Russian turrets!
      addKokoshnikGable(pri, wood, glass, gold, f, 0, wOut - 0.50, +1, 61.60, 1.55, 1.68);
      for (const uK of [-2 * BAY_W, 0, 2 * BAY_W]) {
        addKokoshnikGable(pri, wood, glass, gold, f, uK, wIn + 0.45, -1, 61.60, uK === 0 ? 1.75 : 1.35, uK === 0 ? 1.82 : 1.42);
      }
      addKokoshnikGable(pri, wood, glass, gold, f, 0, wMid, -1, yRidge - 0.05, 1.85, 1.35);
      for (const sgn of [-1, 1]) {
        const cPt = facePt(f, sgn * (2 * BAY_W), 0, wMid);
        addRussianFacetedTurret(pri, wood, copper, gold, cPt[0], cPt[2], 62.12, 1.26, 1.52);
      }
    } else if (style === 'flamande') {
      // West (-X) Brasserie Flamande: Crow-stepped Flemish gables & wrought-iron spire finials!
      addFlemishSteppedGable(pri, wood, glass, gold, f, 0, wOut - 0.50, +1, 61.60, 1.45, 1.48);
      for (const uG of [-2 * BAY_W, 0, 2 * BAY_W]) {
        addFlemishSteppedGable(pri, wood, glass, gold, f, uG, wIn + 0.45, -1, 61.60, uG === 0 ? 1.65 : 1.32, uG === 0 ? 1.62 : 1.34);
      }
      for (const sgn of [-1, 1]) {
        const cPt = facePt(f, sgn * (2 * BAY_W), 0, wMid);
        addOctagonalCupola(pri, copper, gold, cPt[0], cPt[2], 62.12, 1.20, 0.72, 0.48);
      }
    } else {
      // SE (+Z) Restaurant Français (Brébant) & NE (+X) Bar Anglo-Américain: Classical Mansard cresting & glazed skylight lanterns!
      addDormerLucarne(pri, wood, glass, gold, f, 0, wOut - 0.55, +1, 61.60);
      for (const uD of [-BAY_W * 1.5, 0, BAY_W * 1.5]) {
        addDormerLucarne(pri, wood, glass, gold, f, uD, wIn + 0.55, -1, 61.60);
      }
      addGlazedSkylightLantern(pri, glass, copper, gold, f, 0, wMid, yRidge - 0.04, style === 'anglo' ? 1.55 : 1.90, 1.35, 0.62);
      if (style === 'anglo') {
        // Additional Anglo-American flank skylight lanterns + twin cupolas
        for (const sgn of [-1, 1]) {
          addGlazedSkylightLantern(pri, glass, copper, gold, f, sgn * (2 * BAY_W), wMid, 62.22, 1.05, 1.05, 0.54);
        }
      } else {
        for (const sgn of [-1, 1]) {
          const cPt = facePt(f, sgn * (2 * BAY_W), 0, wMid);
          addOctagonalCupola(pri, copper, gold, cPt[0], cPt[2], 62.12, 1.24, 0.68, 0.42);
        }
      }
    }

    // 2. Outer Corner Bar / Salon Cupola Pavilions ("BAR" on Pl. 20, centered at 30.2 m behind outer Grand Arches)
    const uBar0 = 28.10, uBar1 = 32.35, uBarMid = (uBar0 + uBar1) * 0.5;
    addCourtyardArchedWall(pri, lat, wood, glass, gold, f, uBar0, uBar1, uBar0, 2, style);
    wood.addQuad(facePt(f, uBar0, Y_FLOOR1_DECK, uBar0), facePt(f, uBar0, Y_FLOOR1_DECK, uBar1), facePt(f, uBar0, 58.52, uBar1), facePt(f, uBar0, 58.52, uBar0));
    glass.addQuad(facePt(f, uBar0, 58.52, uBar0 + 0.35), facePt(f, uBar0, 58.52, uBar1 - 0.35), facePt(f, uBar0, 60.85, uBar1 - 0.35), facePt(f, uBar0, 60.85, uBar0 + 0.35));
    wood.addQuad(facePt(f, uBar0, 60.85, uBar0), facePt(f, uBar0, 60.85, uBar1), facePt(f, uBar0, yEave, uBar1), facePt(f, uBar0, yEave, uBar0));
    addDormerLucarne(pri, wood, glass, gold, f, uBarMid + 0.45, uBar1 - 0.35, +1, yEave + 0.02);
    pri.addBeam(facePt(f, uBar0 + 0.9, 62.22, uBarMid), facePt(f, uBar1 - 0.2, 62.22, uBarMid), 0.06, 0.08);
    gold.addBeam(facePt(f, uBar0 + 0.9, 62.38, uBarMid), facePt(f, uBar1 - 0.2, 62.38, uBarMid), 0.04, 0.05);
    const pCornerApex = facePt(f, uBarMid, 62.18, uBarMid);
    pri.addTri(facePt(f, uBar0, yEave, uBar0), facePt(f, uBar1, yEave, uBar0), pCornerApex);
    pri.addTri(facePt(f, uBar1, yEave, uBar0), facePt(f, uBar1, yEave, uBar1), pCornerApex);
    pri.addTri(facePt(f, uBar1, yEave, uBar1), facePt(f, uBar0, yEave, uBar1), pCornerApex);
    pri.addTri(facePt(f, uBar0, yEave, uBar1), facePt(f, uBar0, yEave, uBar0), pCornerApex);
    if (style === 'russe') {
      addRussianFacetedTurret(pri, wood, copper, gold, pCornerApex[0], pCornerApex[2], 62.08, 1.05, 1.24);
    } else {
      addOctagonalCupola(pri, copper, gold, pCornerApex[0], pCornerApex[2], 62.08, 1.05, 0.66, 0.40);
    }
  }

  return [
    pb.build(THREE, {
      id: 'z2_pavilions_restaurants_1889_p9',
      phase: 9,
      span: [9.20, 9.90],
      plateRefs: ['20', '53', '55'],
      photoRefs: ['18', '36', '12', '21'],
    }),
  ];
}
