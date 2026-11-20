/**
 * Zone 2 — Cantilevered `Consoles` (`~1.94 m` spacing), `+56.40 m` Exterior Promenade,
 * `+57.63 m` Restaurant & Pier-Quadrant Timber Decks (`isWoodDecking = true`),
 * Open Central Court, 4 Semi-Elliptical Balconies, `45°` Corner Balconies, and
 * Shaft/Stairwell Balustrades (`Pl. 20`, `Pl. 53 Figs. 9 & 11`).
 */

import {
  Y_CORNICE_BOT, Y_PROMENADE, Y_PROM_RAIL_TOP, Y_FLOOR1_DECK, Y_COURT_RAIL_TOP,
  EXT_HALF, ARCADE_W, COURT_HALF, BALCON_CURB, BAY_W,
  wOuter, facePt, PieceBuilder,
} from './z2_geom_helpers.js';

function addBalustradeRun(pri, lat, p0, p1, yBot, yTop, stepM = 0.97) {
  const len = Math.hypot(p1[0] - p0[0], p1[2] - p0[2]);
  if (len < 0.05) return;
  const n = Math.max(1, Math.round(len / stepM));
  const at = (t, y) => [p0[0] + (p1[0] - p0[0]) * t, y, p0[2] + (p1[2] - p0[2]) * t];
  pri.addBeam(at(0, yTop), at(1, yTop), 0.11, 0.09, [0, 1, 0]);
  pri.addBeam(at(0, yBot + 0.10), at(1, yBot + 0.10), 0.08, 0.07, [0, 1, 0]);
  lat.addBeam(at(0, yTop - 0.18), at(1, yTop - 0.18), 0.05, 0.05, [0, 1, 0]);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pri.addBeam(at(t, yBot), at(t, yTop), 0.06, 0.06, [1, 0, 0]);
    if (i < n) {
      const tNext = (i + 1) / n;
      lat.addBeam(at(t, yBot + 0.12), at(tNext, yTop - 0.20), 0.038, 0.038, [0, 1, 0]);
      lat.addBeam(at(tNext, yBot + 0.12), at(t, yTop - 0.20), 0.038, 0.038, [0, 1, 0]);
    }
  }
}

export function buildConsolesDecksCourtPieces(THREE, mats) {
  const pb = new PieceBuilder();
  const pri = pb.use(mats.ironPrimary);
  const lat = pb.use(mats.ironLattice);
  // ONLY flat horizontal timber plank deck surfaces carry isWoodDecking = true!
  const woodDeck = pb.use(mats.woodPavilion, { isWoodDecking: true });

  const uBal = 7.96;      // Semi-elliptical interior balcony half-chord (Pl. 53 Fig. 9: 15.92 m)
  const wBalPeak = 13.86; // Semi-elliptical balcony inner rim (Pl. 53 Fig. 9 centered across all 3 arcs!)
  const uChamfer = 10.65; // 45° triangular corner "Balcon" inner chamfer (Pl. 53 Fig. 9 exact!)
  const wGutter = EXT_HALF + 0.42;     // Cyma-recta Chéneau cornice flare (+0.42 m -> 35.77 m on Pl. 20 & Pl. 53 Fig. 9!)
  const wConsoleTip = EXT_HALF + 0.46; // 18-bay cantilevered promenade console nosings (+35.81 m on Pl. 53 Fig. 9!)

  for (let f = 0; f < 4; f++) {
    // 1. Exterior Promenade Cornice Fascia, Molded Chéneau Gutter & Mid-Promenade Stringer
    pri.addBeam(facePt(f, -EXT_HALF, 56.08, EXT_HALF - 0.04), facePt(f, EXT_HALF, 56.08, EXT_HALF - 0.04), 0.54, 0.26);
    pri.addBeam(facePt(f, -wGutter, 56.36, wGutter), facePt(f, wGutter, 56.36, wGutter), 0.24, 0.24);
    lat.addBeam(facePt(f, -34.25, Y_PROMENADE - 0.14, 34.25), facePt(f, 34.25, Y_PROMENADE - 0.14, 34.25), 0.18, 0.22);

    // 19 Primary Curved Console Brackets framing the 18 per-face bays (Pl. 20, Pl. 53 Figs. 9 & 11, Photo 36)
    for (let k = -9; k <= 9; k++) {
      const u = k * BAY_W;
      const pBot = facePt(f, Math.max(-33.4, Math.min(33.4, u)), 51.35, wOuter(51.35));
      const pMid = facePt(f, u, 54.65, wOuter(54.65) + 1.08);
      const pTop = facePt(f, u, Y_PROMENADE - 0.12, wConsoleTip);
      const pBack = facePt(f, u, Y_PROMENADE - 0.12, ARCADE_W);
      pri.addBeam(pBot, pMid, 0.24, 0.28, [0, 0, 1]);
      pri.addBeam(pMid, pTop, 0.26, 0.30, [0, 0, 1]);
      pri.addBeam(pBack, pTop, 0.24, 0.32, [0, 1, 0]);
      lat.addBeam(facePt(f, u, 53.10, wOuter(53.10) + 0.15), pTop, 0.14, 0.16, [0, 0, 1]);
    }
    // 45° Mitered Corner Console Girder (Pl. 53 Fig. 9 exact corner diagonal)
    pri.addBeam(
      facePt(f, ARCADE_W, Y_PROMENADE - 0.12, ARCADE_W),
      facePt(f, wConsoleTip, Y_PROMENADE - 0.12, wConsoleTip),
      0.28, 0.34, [0, 1, 0]
    );

    // Exterior Galerie Promenade Plank Deck (+56.40 m, tagged isWoodDecking) + Step Riser & Balustrade
    woodDeck.addQuad(
      facePt(f, -EXT_HALF, Y_PROMENADE, EXT_HALF),
      facePt(f, EXT_HALF, Y_PROMENADE, EXT_HALF),
      facePt(f, ARCADE_W, Y_PROMENADE, ARCADE_W),
      facePt(f, -ARCADE_W, Y_PROMENADE, ARCADE_W)
    );
    woodDeck.addQuad(
      facePt(f, -ARCADE_W, Y_PROMENADE, ARCADE_W),
      facePt(f, ARCADE_W, Y_PROMENADE, ARCADE_W),
      facePt(f, ARCADE_W, Y_FLOOR1_DECK, ARCADE_W),
      facePt(f, -ARCADE_W, Y_PROMENADE + 1.23, ARCADE_W)
    );
    addBalustradeRun(pri, lat, facePt(f, -EXT_HALF, 0, EXT_HALF - 0.08), facePt(f, EXT_HALF, 0, EXT_HALF - 0.08), Y_PROMENADE, Y_PROM_RAIL_TOP, 0.97);

    // 2. Interior Courtyard Gallery Cantilever Curb & ~2.04 m / 1.94 m Balcony Console Ribs (Pl. 53 Fig. 9)
    pri.addBeam(facePt(f, -BALCON_CURB, Y_FLOOR1_DECK - 0.14, BALCON_CURB), facePt(f, BALCON_CURB, Y_FLOOR1_DECK - 0.14, BALCON_CURB), 0.22, 0.28);
    for (let r = -4; r <= 4; r++) {
      const uR = r * 2.04;
      const tEll = Math.min(1, Math.abs(uR) / uBal);
      const wEnd = BALCON_CURB - Math.sqrt(Math.max(0, 1 - tEll * tEll)) * (BALCON_CURB - wBalPeak);
      lat.addBeam(facePt(f, uR, 55.65, COURT_HALF), facePt(f, uR, Y_FLOOR1_DECK - 0.16, wEnd + 0.15), 0.13, 0.16);
      pri.addBeam(facePt(f, uR, Y_FLOOR1_DECK - 0.15, COURT_HALF), facePt(f, uR, Y_FLOOR1_DECK - 0.14, wEnd), 0.18, 0.26, [0, 1, 0]);
    }
    for (const uSideRib of [-16.32, -14.28, -12.24, -10.65, 10.65, 12.24, 14.28, 16.32]) {
      pri.addBeam(facePt(f, uSideRib, Y_FLOOR1_DECK - 0.15, COURT_HALF), facePt(f, uSideRib, Y_FLOOR1_DECK - 0.14, BALCON_CURB), 0.16, 0.24, [0, 1, 0]);
    }

    // Cardinal Wing +57.63 m Timber Plank Deck (u in [-16.32, +16.32], w in [16.70, 32.58], tagged isWoodDecking)
    woodDeck.addQuad(
      facePt(f, -16.32, Y_FLOOR1_DECK, ARCADE_W),
      facePt(f, 16.32, Y_FLOOR1_DECK, ARCADE_W),
      facePt(f, 16.32, Y_FLOOR1_DECK, BALCON_CURB),
      facePt(f, -16.32, Y_FLOOR1_DECK, BALCON_CURB)
    );

    // 3. Pier-Corner Quadrant +57.63 m Timber Plank Deck with Framed Ascenseur & Escalier Cutouts!
    woodDeck.addQuad(
      facePt(f, 16.32, Y_FLOOR1_DECK, ARCADE_W), facePt(f, 20.42, Y_FLOOR1_DECK, ARCADE_W),
      facePt(f, 20.42, Y_FLOOR1_DECK, 24.50), facePt(f, 16.32, Y_FLOOR1_DECK, 24.50)
    );
    woodDeck.addQuad(
      facePt(f, 24.50, Y_FLOOR1_DECK, ARCADE_W), facePt(f, ARCADE_W, Y_FLOOR1_DECK, ARCADE_W),
      facePt(f, ARCADE_W, Y_FLOOR1_DECK, 16.32), facePt(f, 24.50, Y_FLOOR1_DECK, 16.32)
    );
    woodDeck.addQuad(
      facePt(f, 20.42, Y_FLOOR1_DECK, 29.82), facePt(f, 24.50, Y_FLOOR1_DECK, 29.82),
      facePt(f, 24.50, Y_FLOOR1_DECK, 24.50), facePt(f, 20.42, Y_FLOOR1_DECK, 24.50)
    );
    woodDeck.addQuad(
      facePt(f, 20.42, Y_FLOOR1_DECK, ARCADE_W), facePt(f, 24.50, Y_FLOOR1_DECK, ARCADE_W),
      facePt(f, 24.50, Y_FLOOR1_DECK, 31.36), facePt(f, 20.42, Y_FLOOR1_DECK, 31.36)
    );
    woodDeck.addTri(
      facePt(f, 16.32, Y_FLOOR1_DECK, 16.32),
      facePt(f, 20.42, Y_FLOOR1_DECK, 16.32),
      facePt(f, 16.32, Y_FLOOR1_DECK, 20.42)
    );
    woodDeck.addTri(
      facePt(f, 24.50, Y_FLOOR1_DECK, 24.50),
      facePt(f, 20.42, Y_FLOOR1_DECK, 24.50),
      facePt(f, 24.50, Y_FLOOR1_DECK, 20.42)
    );

    // Protective iron balustrades around Ascenseur & Escalier floor openings
    addBalustradeRun(pri, lat, facePt(f, 16.75, 0, 19.90), facePt(f, 20.95, 0, 24.10), Y_FLOOR1_DECK, Y_COURT_RAIL_TOP, 1.05);
    addBalustradeRun(pri, lat, facePt(f, 19.90, 0, 16.75), facePt(f, 24.10, 0, 20.95), Y_FLOOR1_DECK, Y_COURT_RAIL_TOP, 1.05);
    addBalustradeRun(pri, lat, facePt(f, 20.42, 0, 29.82), facePt(f, 24.50, 0, 29.82), Y_FLOOR1_DECK, Y_COURT_RAIL_TOP, 1.02);
    addBalustradeRun(pri, lat, facePt(f, 20.42, 0, 31.36), facePt(f, 24.50, 0, 31.36), Y_FLOOR1_DECK, Y_COURT_RAIL_TOP, 1.02);

    // 4. 4 Semi-Elliptical Interior Courtyard Balconies & 45° Triangular Corner "Balcon" (Pl. 53 Fig. 9)
    const nSeg = 16;
    for (let i = 0; i < nSeg; i++) {
      const a0 = -Math.PI * 0.5 + (i / nSeg) * Math.PI;
      const a1 = -Math.PI * 0.5 + ((i + 1) / nSeg) * Math.PI;
      const u0 = Math.sin(a0) * uBal, u1 = Math.sin(a1) * uBal;
      const w0 = BALCON_CURB - Math.cos(a0) * (BALCON_CURB - wBalPeak);
      const w1 = BALCON_CURB - Math.cos(a1) * (BALCON_CURB - wBalPeak);
      woodDeck.addQuad(
        facePt(f, u0, Y_FLOOR1_DECK, BALCON_CURB), facePt(f, u1, Y_FLOOR1_DECK, BALCON_CURB),
        facePt(f, u1, Y_FLOOR1_DECK, w1), facePt(f, u0, Y_FLOOR1_DECK, w0)
      );
      pri.addBeam(facePt(f, u0, Y_FLOOR1_DECK - 0.14, w0), facePt(f, u1, Y_FLOOR1_DECK - 0.14, w1), 0.24, 0.30);
      addBalustradeRun(pri, lat, facePt(f, u0, 0, w0), facePt(f, u1, 0, w1), Y_FLOOR1_DECK, Y_COURT_RAIL_TOP, 0.88);
    }

    addBalustradeRun(pri, lat, facePt(f, -uChamfer, 0, BALCON_CURB), facePt(f, -uBal, 0, BALCON_CURB), Y_FLOOR1_DECK, Y_COURT_RAIL_TOP, 0.94);
    addBalustradeRun(pri, lat, facePt(f, uBal, 0, BALCON_CURB), facePt(f, uChamfer, 0, BALCON_CURB), Y_FLOOR1_DECK, Y_COURT_RAIL_TOP, 0.94);

    woodDeck.addTri(
      facePt(f, uChamfer, Y_FLOOR1_DECK, BALCON_CURB),
      facePt(f, BALCON_CURB, Y_FLOOR1_DECK, BALCON_CURB),
      facePt(f, BALCON_CURB, Y_FLOOR1_DECK, uChamfer)
    );
    pri.addBeam(facePt(f, uChamfer, Y_FLOOR1_DECK - 0.16, BALCON_CURB), facePt(f, BALCON_CURB, Y_FLOOR1_DECK - 0.16, uChamfer), 0.24, 0.32);
    for (const tC of [0.20, 0.40, 0.60, 0.80]) {
      const uA = uChamfer + (BALCON_CURB - uChamfer) * tC;
      const wA = BALCON_CURB + uChamfer - uA;
      const dPerp = Math.min(COURT_HALF - uA, COURT_HALF - wA);
      pri.addBeam(facePt(f, uA, Y_FLOOR1_DECK - 0.15, wA), facePt(f, uA + dPerp, Y_FLOOR1_DECK - 0.15, wA + dPerp), 0.15, 0.24, [0, 1, 0]);
    }
    addBalustradeRun(pri, lat, facePt(f, uChamfer, 0, BALCON_CURB), facePt(f, BALCON_CURB, 0, uChamfer), Y_FLOOR1_DECK, Y_COURT_RAIL_TOP, 0.96);
  }

  return [
    pb.build(THREE, {
      id: 'z2_consoles_decks_court',
      phase: 5,
      span: [4.92, 5.38],
      plateRefs: ['20', '53'],
      photoRefs: ['01', '46', '36', '18', '12'],
    }),
  ];
}
