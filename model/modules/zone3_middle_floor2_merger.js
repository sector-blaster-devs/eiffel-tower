/**
 * Stage 2 — Zone 3: Stage-2 Inclined Piers (Panneaux 6_upper–10), 2nd Platform (+115.73 m),
 * Pier-to-Shaft Merger (Panneaux 12–17 + 18.500 m Collar at +179.0522 m),
 * Unified Shaft Panneaux 18–19_lower, Plancher des Machinistes (+193.67 m),
 * and Plancher Intermédiaire Édoux (+195.93 m) — May 1889 Exposition State.
 *
 * Owner: builder-middle-2
 */

import { buildStage2Piers } from './z3_piers_stage2.js';
import { buildFloor2Structural } from './z3_floor2_platform.js';
import { buildFloor2Pavilions1889 } from './z3_floor2_pavilions.js';
import { buildMergerAndIntermediaire } from './z3_merger_intermediaire.js';

function resolveMaterials(THREE, raw = {}) {
  const mk = (color, roughness = 0.55, metalness = 0.65, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness, side: THREE.DoubleSide, ...extra });
  return {
    ironPrimary: raw.ironPrimary || mk(0x5b3c2d, 0.52, 0.68, { name: 'ironPrimary' }),
    ironLattice: raw.ironLattice || mk(0x694736, 0.56, 0.62, { name: 'ironLattice' }),
    ironCast: raw.ironCast || mk(0x3b2c26, 0.48, 0.72, { name: 'ironCast' }),
    woodPavilion: raw.woodPavilion || mk(0x9a7147, 0.74, 0.08, { name: 'woodPavilion' }),
    glass1889: raw.glass1889 || mk(0xcfe4ea, 0.14, 0.10, { name: 'glass1889', transparent: true, opacity: 0.42 }),
    lampGlobe1889: raw.lampGlobe1889 || mk(0xebe6dc, 0.32, 0.00, { name: 'lampGlobe1889_glass' }),
    goldAccent: raw.goldAccent || mk(0xd4a946, 0.28, 0.86, { name: 'goldAccent' }),
    copperDome: raw.copperDome || mk(0x52655c, 0.42, 0.72, { name: 'copperDome' }),
  };
}

function computeGroupStats(root) {
  let meshCount = 0, triCount = 0, vertCount = 0;
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.geometry) return;
    meshCount++;
    const pos = obj.geometry.getAttribute('position');
    if (pos) vertCount += pos.count;
    const idx = obj.geometry.getIndex();
    triCount += idx ? Math.floor(idx.count / 3) : pos ? Math.floor(pos.count / 3) : 0;
  });
  return { meshCount, triCount, vertCount };
}

export function buildZone(ctx) {
  const { THREE } = ctx;
  const materials = resolveMaterials(THREE, ctx.materials);
  const group = new THREE.Group();
  group.name = 'zone3_middle_floor2_merger';

  const pieces = [
    ...buildStage2Piers(THREE, materials),
    ...buildFloor2Structural(THREE, materials),
    ...buildFloor2Pavilions1889(THREE, materials),
    ...buildMergerAndIntermediaire(THREE, materials),
  ];

  for (const piece of pieces) {
    piece.object3D = piece.obj;
    piece.mesh = piece.obj;
    piece.restPos = [piece.obj.position.x, piece.obj.position.y, piece.obj.position.z];
    group.add(piece.obj);
  }

  function setConstructionState(globalStep = 11.0) {
    const step = Number.isFinite(globalStep) ? globalStep : 11.0;
    for (const p of pieces) {
      const [t0] = p.span || [0, 1];
      p.obj.visible = step >= t0;
    }
  }

  setConstructionState(11.0);
  const counts = computeGroupStats(group);

  return {
    zoneId: 'zone3_middle_floor2_merger',
    group,
    pieces,
    setConstructionState,
    stats: {
      ...counts,
      pieceCount: pieces.length,
    },
  };
}

export default buildZone;
