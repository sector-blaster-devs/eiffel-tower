/**
 * Zone 2 — 4 Monumental Decorative Arches & Complete 1889 First Platform (+10.000 m .. +66.500 m)
 *
 * Strictly derived from Gustave Eiffel's 1889 shop plates (Pl. 20 Fig. 1, Pl. 53 Figs. 6-11,
 * Pl. 55, Pl. 67 Figs. 1-23, 69-75) and 1888–1889 photographs (Photos 12, 14, 18, 21, 23, 36, 46).
 *
 * Modular ES sub-modules:
 *   - z2_geom_helpers.js       : Canonical coordinates, pier-plane seam, GeomBuilder & PieceBuilder
 *   - z2_floor1_girders.js     : Poutre de l'Arc, Grande Poutre, Consoles, Promenade & Central Court Balconies
 *   - z2_frieze_scientists.js  : Structural frieze X-frame (Phase 4) & 72 gold-painted scientist plaques (Phase 9)
 *   - z2_decorative_arches.js  : 4 Exterior ornate + 4 Interior lattice arches, wind-bracing, spandrels & globe lamps
 *   - z2_galerie_vitree_1889.js: 1889 9-arch / 18-bay semicircular iron arcade (Phase 6) & multipane glazing (Phase 9)
 *   - z2_pavilions_1889.js     : 4 Ornate 1889 Restaurant Pavilions & 4 Corner Cupola Salons (Phase 9)
 */

import {
  Y_ARCH_BASE, Y_FLAGSTAFF_TOP, EXT_HALF, COURT_HALF, resolveMaterials,
} from './z2_geom_helpers.js';
import { buildFloor1GirderPieces } from './z2_floor1_girders.js';
import { buildConsolesDecksCourtPieces } from './z2_consoles_decks_court.js';
import { buildFriezePieces } from './z2_frieze_scientists.js';
import { buildDecorativeArchPieces } from './z2_decorative_arches.js';
import { buildGalerieVitreePieces } from './z2_galerie_vitree_1889.js';
import { buildPavilion1889Pieces } from './z2_pavilions_1889.js';

export function buildZone(ctx = {}) {
  const { THREE } = ctx;
  if (!THREE) {
    throw new Error('zone2_arches_floor1.buildZone requires ctx.THREE');
  }

  const mats = resolveMaterials(THREE, ctx.materials);
  const group = new THREE.Group();
  group.name = 'zone2_arches_floor1';

  const pieces = [];
  let totalVerts = 0;
  let totalTris = 0;
  let totalMeshes = 0;

  const registerAll = (builtList) => {
    for (const res of builtList) {
      group.add(res.piece.object3D);
      pieces.push(res.piece);
      totalVerts += res.vertCount;
      totalTris += res.triCount;
      totalMeshes += res.meshCount;
    }
  };

  // 1. 1st-Floor Box Girders, Open Grillage, Consoles, Promenade, Decks & Central Court (Phase 3 [3.20, 4.00])
  registerAll(buildFloor1GirderPieces(THREE, mats));
  registerAll(buildConsolesDecksCourtPieces(THREE, mats));

  // 2. 4 Monumental Decorative Arches & 1889 Suspended Globe Lamps (Phase 4-5 [4.05, 5.24] & Phase 9 [9.60, 10.00])
  registerAll(buildDecorativeArchPieces(THREE, mats));

  // 3. Scientist Frieze X-Frame (Phase 4 [4.20, 4.60]) & 72 Gold-Accented Plaques (Phase 9 [9.00, 9.40])
  registerAll(buildFriezePieces(THREE, mats));

  // 4. 1889 Semicircular Galerie Arcade (Phase 6 [6.20, 6.90]) & Multipane Glazing (Phase 9 [9.10, 9.50])
  registerAll(buildGalerieVitreePieces(THREE, mats));

  // 5. 4 Ornate 1889 Restaurant Pavilions & Corner Cupola Salons (Phase 9 [9.20, 9.90])
  registerAll(buildPavilion1889Pieces(THREE, mats));

  function setConstructionState(globalStep = 11.0) {
    const step = Math.max(0.0, Math.min(11.0, Number(globalStep) || 0.0));
    for (const piece of pieces) {
      const obj = piece.object3D;
      const [t0] = piece.span;
      if (step < t0) {
        obj.visible = false;
      } else if (piece.vanishSpan && step >= piece.vanishSpan[1]) {
        obj.visible = false;
      } else {
        obj.visible = true;
      }
    }
  }

  setConstructionState(11.0);

  const stats = {
    zoneId: 'zone2_arches_floor1',
    pieceCount: pieces.length,
    meshCount: totalMeshes,
    vertexCount: totalVerts,
    triangleCount: totalTris,
    yRangeM: [Y_ARCH_BASE, Y_FLAGSTAFF_TOP],
    exteriorSquareM: EXT_HALF * 2,
    centralCourtVoidM: COURT_HALF * 2,
    scientistPlaqueCount: 72,
  };

  return {
    zoneId: 'zone2_arches_floor1',
    group,
    pieces,
    setConstructionState,
    stats,
  };
}

export default buildZone;
