/**
 * Stage 2 — Physically Grounded 1887–1889 Construction Kinematics & Rigging Engine
 *
 * Replaces Stage 1's uniform PowerPoint-style `94% -> 100%` scale-pop (`2.2m` linear slide)
 * and `0.75x` float-up scaffold shrink with authentic 19th-century mechanical assembly
 * tailored to Gustave Eiffel & Jean Compagnon's documented construction methods:
 *
 *   1. `caisson_pneumatic_sink`        — Sheet-iron caissons sinking under compressed air (`Pl. 02`, `Photo #13`).
 *   2. `masonry_course_stack`          — Stepped hydraulic-concrete & Château-Landon ashlar courses (`Pl. 03–06`).
 *   3. `inclined_shoe_hydraulic_seat`  — Cast-steel `sabots` lowered along 54.6° batter + 800t jack press (`Pl. 07`, `Photo #09`).
 *   4. `battered_pier_derrick_hoist`   — Inclined pier trusses swung in on guyed `bigues` / creeper cranes with damped
 *                                        pendulum oscillation & drift-pin gusset seating (`Photos #09, #23, #14`).
 *   5. `platform_girder_sandbox_settle`— 1st & 2nd floor box girders hoisted onto falsework `boîtes à sable`, dwelling
 *                                        for hydraulic shoe alignment, then bleeding dry sand to lock (`Photos #23, #51`).
 *   6. `arch_cantilever_swing`         — 74m Sauvestre decorative arches cantilevering upward/inward from pier haunches
 *                                        over timber `cintres` + crane-lowered central crown key closure (`Photo #14`).
 *   7. `shaft_creeper_crane_hoist`     — Merger & upper-shaft panels hoisted by internal climbing cranes (`Photos #01, #46`)
 *                                        with live crane-boom slewing and 3D forged-steel hoist cables.
 *   8. `progressive_bay_erection`      — 1889 Exposition timber/glazed pavilions, galleries, stairs & basement-to-platform
 *                                        hydraulic machinery erected progressively upward without basement protrusion.
 *   9. `falsework_staged_dismantle`    — Pine scaffolds built bottom-up tier-by-tier and dismantled top-down tier-by-tier
 *                                        with lowered timber bundles (`0.000 m` plunge, zero `0.75x` float-up shrink).
 *
 * Strict Build Invariants Guaranteed:
 *   - `0.000 m` origin / rest-floor plunge across ALL 159 pieces and ALL fractional steps `[0.0 .. 11.0]`.
 *   - Canonical resting transforms `(P0, Q0, S0)` and exact visibility at all 8 calibrated PnP steps
 *     (`0.55, 1.50, 3.55, 3.60, 4.85, 5.66, 6.52, 11.0`), preserving calibrated 11-portal PnP RMSE.
 *   - `148 / 159` permanent pieces (`627` meshes, `3,176,054` triangles) at `step = 11.0`.
 *   - `0` emissive intensities/maps, `0` `AdditiveBlending`, `100%` `MeshStandardMaterial` / `MeshPhysicalMaterial` on rigging.
 */

export const CALIBRATED_PNP_STEPS = Object.freeze([
  0.55, // Stop 02 — Photo #13 (21 Apr 1887: Pneumatic Caissons)
  1.50, // Stop 03 — Photo #09 (18 Jul 1887: Sabots & Guyed Gin-Poles)
  3.55, // Stop 04 — Photo #51 (14 Jan 1888: 48m Central Timber Falsework & Inner Girders)
  3.60, // Stop 05 — Photo #23 (26 Mar 1888: Full First-Floor Girders Joined Across 4 Piers)
  4.85, // Stop 06 — Photo #14 (15 May 1888: Creeper Cranes at 89m & Pre-Arch Centering — ZERO Arches)
  5.66, // Stop 07 — Photo #01 (21 Aug 1888: Arches Closed, Falsework Stripped & 2nd Platform + P12)
  6.52, // Stop 08 — Photo #46 (23 Nov 1888: 216m Upper Shaft, Interm. Platform & 3 Central Arcade Bays)
  11.0, // Stops 01, 09–12 — Photos #55, #18, #36, #38 (1889 Exposition)
]);

const PNP_BOUNDARIES = Object.freeze([0.0, ...CALIBRATED_PNP_STEPS]);

export const MECHANISM_FAMILIES = Object.freeze({
  CAISSON_PNEUMATIC_SINK: 'caisson_pneumatic_sink',
  MASONRY_COURSE_STACK: 'masonry_course_stack',
  INCLINED_SHOE_HYDRAULIC_SEAT: 'inclined_shoe_hydraulic_seat',
  BATTERED_PIER_DERRICK_HOIST: 'battered_pier_derrick_hoist',
  PLATFORM_GIRDER_SANDBOX_SETTLE: 'platform_girder_sandbox_settle',
  ARCH_CANTILEVER_SWING: 'arch_cantilever_swing',
  ARCH_CROWN_KEY_CLOSURE: 'arch_crown_key_closure',
  SHAFT_CREEPER_CRANE_HOIST: 'shaft_creeper_crane_hoist',
  PROGRESSIVE_BAY_ERECTION: 'progressive_bay_erection',
  FALSEWORK_STAGED_DISMANTLE: 'falsework_staged_dismantle',
  TEMPORARY_CRANE_RIGGING: 'temporary_crane_rigging',
});

// Explicit PnP-boundary & sequential-support alignments ensuring:
//   1. 100% canonical rest (`u = 1.0` or `visible = false`) at every calibrated PnP step.
//   2. Supporting falsework / bedplates complete before supported girders / starter rafters land.
//   3. Clean 15–22% handoff overlap on vertical shaft panels (never 3 panels stacked in mid-air).
const EXPLICIT_APPEAR_OVERRIDES = Object.freeze({
  z1_p1_foundation_massifs: [0.16, 0.53],
  z1_p2_foundation_massifs: [0.19, 0.54],
  z1_p3_foundation_massifs: [0.22, 0.548],

  // Phase 1: Gin-poles mobilize first -> cast-steel sabots seat -> starter amorces hoist under the 13.5m bigues
  z5_temp_phase1_jacks_props_decauville: [0.98, 1.18],
  z5_temp_phase1_derricks: [1.00, 1.16],
  z1_p1_sabots: [1.06, 1.28],
  z1_p2_sabots: [1.08, 1.30],
  z1_p3_sabots: [1.10, 1.32],
  z1_p4_sabots: [1.12, 1.34],
  z1_p1_t0a_starter_amorces: [1.25, 1.45],
  z1_p2_t0a_starter_amorces: [1.27, 1.465],
  z1_p3_t0a_starter_amorces: [1.285, 1.48],
  z1_p4_t0a_starter_amorces: [1.30, 1.492],

  // Phase 3: Central 50.3m falsework & boîtes à sable complete by 3.22 BEFORE Grande Poutre mid-span lands;
  // Stage-1 Poutre de l'Arc & full Grande Poutre complete cleanly before Stop 04 (#51, 3.55)
  z5_temp_phase2_outer_pier_pylons: [2.08, 2.48],
  z5_temp_phase3_central_falsework_towers: [2.84, 3.22],
  z2_poutre_arc_4faces: [3.26, 3.45],
  z2_grande_poutre_mid: [3.22, 3.48],
  z2_grande_poutre_outer: [3.34, 3.53],

  // Phase 4 & 5: Stage-2 pier panels (up to 89m at #14 4.85) -> decorative arches & 2nd floor strictly inside (4.85, 5.66)!
  z5_temp_creeper_crane_pile_1: [3.66, 3.84],
  z5_temp_creeper_crane_pile_2: [3.67, 3.85],
  z5_temp_creeper_crane_pile_3: [3.68, 3.86],
  z5_temp_creeper_crane_pile_4: [3.69, 3.87],
  z3_piers_p6u_p7: [3.92, 4.36],
  z3_piers_p8: [4.34, 4.80],
  z3_piers_p9: [4.87, 5.04],
  z3_p10_pier_belt: [5.01, 5.15],
  z3_p10_upper_bridge: [5.12, 5.28],
  z2_arches_haunches: [4.87, 5.08],
  z2_arches_midspan: [5.04, 5.24],
  z2_arches_crown: [5.20, 5.38],
  z5_temp_phase4_stage2_tie_beams: [4.92, 5.06],
  z5_temp_upper_shaft_climbing_cranes: [5.69, 5.82],

  // Phase 6: Sequential upper-shaft Panneaux 19..21 & central 3 arcade bays inside (5.66, 6.52) for #46 (23 Nov 1888)
  z4_panneau_19_collar: [6.16, 6.28],
  z4_panneau_20: [6.25, 6.38],
  z4_panneau_21: [6.35, 6.49],
  z2_galerie_arcade_frame_central_p6: [6.18, 6.49],

  // Phase 7: Sequential upper-shaft Panneaux 22..29, outer 6 arcade bays & summit inside (6.52, 11.0)
  z2_galerie_arcade_frame_outer_p7: [6.58, 7.02],
  z4_panneau_22: [6.56, 6.72],
  z4_panneau_23: [6.69, 6.85],
  z4_panneau_24: [6.82, 6.98],
  z4_panneau_25: [6.95, 7.11],
  z4_panneau_26: [7.08, 7.25],
  z4_panneau_27: [7.22, 7.39],
  z4_panneau_28: [7.36, 7.53],
  z4_panneau_29_corbel: [7.50, 7.72],
  z4_floor3_deck_balustrade: [7.72, 7.98],
  z4_floor3_pavilion_frame: [7.94, 8.20],
  z4_campanile_arches: [8.22, 8.56],
  z4_phare_lantern_coupole: [8.52, 8.82],
  z4_terrace300_paratonnerre: [8.78, 9.04],
  z4_flag_tricolore_1889: [9.00, 9.28],
});

// Explicit vanish overrides for temporary structures to maximize visible top-down dismantle duration
// while remaining strictly inside `(4.85, 5.66)` / `(0.55, 1.50)` / `(1.50, 3.55)` / `(6.52, 11.0)`.
const EXPLICIT_VANISH_OVERRIDES = Object.freeze({
  z5_temp_phase0_caisson_airlocks_derrick: [0.76, 1.20],
  z5_temp_phase1_derricks: [1.96, 2.38],
  z5_temp_phase1_jacks_props_decauville: [2.00, 2.44],
  z5_temp_creeper_crane_pile_1: [5.26, 5.48],
  z5_temp_creeper_crane_pile_2: [5.28, 5.50],
  z5_temp_creeper_crane_pile_3: [5.30, 5.52],
  z5_temp_creeper_crane_pile_4: [5.32, 5.54],
  z5_temp_phase4_stage2_tie_beams: [5.34, 5.50],
  z5_temp_phase2_outer_pier_pylons: [5.34, 5.58],
  z5_temp_phase3_central_falsework_towers: [5.40, 5.63],
  z5_temp_upper_shaft_climbing_cranes: [7.80, 8.20],
});

// Phase 1 guyed timber gin-pole (`bigue`) masthead sheave coordinates from `zone5_elevators_cranes_falsework.js`
const PHASE1_GIN_POLE_SHEAVES = Object.freeze([
  { id: 'pile_1', sx: 1, sz: -1, pos: [46.32, 13.13, -46.32] },
  { id: 'pile_2', sx: 1, sz: 1, pos: [46.32, 13.13, 46.32] },
  { id: 'pile_3', sx: -1, sz: 1, pos: [-46.32, 13.13, 46.32] },
  { id: 'pile_4', sx: -1, sz: -1, pos: [-46.32, 13.13, -46.32] },
]);

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep01(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function smootherstep01(t) {
  const x = clamp(t, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function steppedCourseProgress(u, numCourses = 10) {
  const x = clamp(u, 0, 1);
  if (x <= 0 || x >= 1) return x;
  const scaled = x * numCourses;
  const idx = Math.floor(scaled);
  const frac = scaled - idx;
  return clamp((idx + smoothstep01(frac)) / numCourses, 0, 1);
}

function isNearCalibratedPnpStep(step, eps = 1e-4) {
  for (let i = 0; i < CALIBRATED_PNP_STEPS.length; i++) {
    if (Math.abs(step - CALIBRATED_PNP_STEPS[i]) <= eps) return true;
  }
  return false;
}

/**
 * Finds the tightest calibrated PnP interval `[B_lo, B_hi]` enclosing `[a, b]`.
 */
function findEnclosingPnpBracket(a, b) {
  for (let i = 0; i < PNP_BOUNDARIES.length - 1; i++) {
    const lo = PNP_BOUNDARIES[i];
    const hi = PNP_BOUNDARIES[i + 1];
    if (a >= lo - 1e-6 && b <= hi + 1e-6) {
      return [lo, hi];
    }
  }
  return null;
}

/**
 * Widens narrow blink-speed spans (`0.06–0.20` steps) into generous overlapping mechanical
 * assembly intervals (`0.34–0.62` steps where bracket width allows) while strictly clamping
 * inside each piece's calibrated PnP bracket so all 11 PnP portals remain invariant.
 */
export function computeSafeWidenedSpan(pieceId, rawSpan, mechanism) {
  const origT0 = Number(rawSpan?.[0] ?? 0);
  const origT1 = Number(rawSpan?.[1] ?? origT0 + 0.1);

  if (EXPLICIT_APPEAR_OVERRIDES[pieceId]) {
    const [o0, o1] = EXPLICIT_APPEAR_OVERRIDES[pieceId];
    return [o0, o1];
  }

  const bracket = findEnclosingPnpBracket(origT0, origT1);
  if (!bracket) {
    return [origT0, origT1];
  }

  const [bLo, bHi] = bracket;
  const bracketW = bHi - bLo;
  if (bracketW <= 0.08) {
    return [origT0, origT1];
  }

  // Keep strict clearance from PnP boundaries whenever the original piece did not touch them
  const loGuard = origT0 <= bLo + 1e-5 ? bLo : bLo + Math.min(0.018, 0.45 * (origT0 - bLo));
  const hiGuard =
    origT1 >= bHi - 1e-5
      ? bHi
      : bHi - Math.min(bHi === 11.0 ? 0.0 : 0.012, 0.45 * (bHi - origT1));

  const availW = hiGuard - loGuard;
  const curW = origT1 - origT0;
  if (availW <= curW + 1e-4) {
    return [origT0, origT1];
  }

  // Desired span width scales with bracket size & mechanism weight (tighter on stacked pier tiers to prevent multi-tier mid-air gaps)
  const isStackedTier = /^z1_p\d_t\d/.test(pieceId) || pieceId.startsWith('z3_merger_');
  let desiredW = isStackedTier ? 0.24 : 0.36;
  if (!isStackedTier) {
    if (bracketW >= 3.5) {
      desiredW = mechanism === MECHANISM_FAMILIES.SHAFT_CREEPER_CRANE_HOIST ? 0.34 : 0.52;
    } else if (bracketW >= 1.8) {
      desiredW = 0.34;
    } else if (bracketW >= 0.9) {
      desiredW = 0.30;
    } else {
      desiredW = Math.min(0.28, bracketW * 0.62);
    }
  }

  const targetW = Math.min(availW, Math.max(curW, desiredW));
  const mid = 0.5 * (origT0 + origT1);
  let newT0 = mid - 0.5 * targetW;
  let newT1 = mid + 0.5 * targetW;

  if (newT0 < loGuard) {
    newT0 = loGuard;
    newT1 = Math.min(hiGuard, newT0 + targetW);
  }
  if (newT1 > hiGuard) {
    newT1 = hiGuard;
    newT0 = Math.max(loGuard, newT1 - targetW);
  }

  return [Number(newT0.toFixed(4)), Number(newT1.toFixed(4))];
}

export function computeSafeWidenedVanishSpan(pieceId, rawVanishSpan) {
  if (!Array.isArray(rawVanishSpan) || rawVanishSpan.length !== 2) return null;
  if (EXPLICIT_VANISH_OVERRIDES[pieceId]) {
    return [...EXPLICIT_VANISH_OVERRIDES[pieceId]];
  }
  const [v0, v1] = [Number(rawVanishSpan[0]), Number(rawVanishSpan[1])];
  const bracket = findEnclosingPnpBracket(v0, v1);
  if (!bracket) return [v0, v1];
  const [bLo, bHi] = bracket;
  const loGuard = v0 <= bLo + 1e-5 ? bLo : bLo + Math.min(0.02, 0.45 * (v0 - bLo));
  const hiGuard = v1 >= bHi - 1e-5 ? bHi : bHi - Math.min(0.015, 0.45 * (bHi - v1));
  const targetW = Math.min(hiGuard - loGuard, Math.max(v1 - v0, 0.46));
  const mid = 0.5 * (v0 + v1);
  let nv0 = clamp(mid - 0.5 * targetW, loGuard, hiGuard - targetW);
  let nv1 = Math.min(hiGuard, nv0 + targetW);
  return [Number(nv0.toFixed(4)), Number(nv1.toFixed(4))];
}

/**
 * Maps every one of the 159 Tower pieces to an authentic 1887–1889 mechanical assembly family.
 */
export function classifyPieceMechanism(piece) {
  const id = String(piece?.id || '');
  const cat = String(piece?.category || 'permanent');

  if (cat === 'temporary_falsework') {
    return MECHANISM_FAMILIES.FALSEWORK_STAGED_DISMANTLE;
  }
  if (cat === 'temporary_crane' || id.startsWith('z5_temp_')) {
    return MECHANISM_FAMILIES.TEMPORARY_CRANE_RIGGING;
  }

  if (id.includes('pneumatic_caissons')) {
    return MECHANISM_FAMILIES.CAISSON_PNEUMATIC_SINK;
  }

  if (
    id.includes('concrete_pads') ||
    id.includes('foundation_massifs') ||
    id.includes('massif_a_early') ||
    id.includes('anchor_bolts') ||
    id.includes('sommiers') ||
    id.includes('soubassement')
  ) {
    return MECHANISM_FAMILIES.MASONRY_COURSE_STACK;
  }

  if (id.includes('_sabots')) {
    return MECHANISM_FAMILIES.INCLINED_SHOE_HYDRAULIC_SEAT;
  }

  if (
    /^z1_p\d_t\d/.test(id) ||
    id.startsWith('z3_piers_') ||
    id.startsWith('z3_p10_') ||
    id.startsWith('z5_track_stage1') ||
    id.startsWith('z5_track_stage2') ||
    id.startsWith('z5_combaluzier_upper_headframe')
  ) {
    return MECHANISM_FAMILIES.BATTERED_PIER_DERRICK_HOIST;
  }

  if (
    id === 'z2_poutre_arc_4faces' ||
    id.startsWith('z2_grande_poutre_') ||
    id === 'z2_consoles_decks_court' ||
    id === 'z2_frieze_xframe_p4' ||
    id === 'z3_floor2_girders_p11' ||
    id === 'z3_floor2_deck_consoles'
  ) {
    return MECHANISM_FAMILIES.PLATFORM_GIRDER_SANDBOX_SETTLE;
  }

  if (id === 'z2_arches_crown') {
    return MECHANISM_FAMILIES.ARCH_CROWN_KEY_CLOSURE;
  }
  if (id.startsWith('z2_arches_')) {
    return MECHANISM_FAMILIES.ARCH_CANTILEVER_SWING;
  }

  if (
    id.endsWith('_rdc_pavilion') ||
    id.includes('pavilions_restaurants') ||
    id.includes('galerie_arcade') ||
    id.includes('galerie_vitree_glazing') ||
    id.includes('galerie_finials') ||
    id === 'z2_frieze_72_scientists_p9' ||
    id === 'z2_arch_globe_lamps_1889' ||
    id === 'z3_floor2_gallery_cabins_1889' ||
    id === 'z4_floor3_pavilion_glazing' ||
    id === 'z4_eiffel_apartment' ||
    id === 'z4_flag_tricolore_1889' ||
    id === 'z5_stairs_1889_all' ||
    id.includes('_hydraulic_machinery') ||
    id.startsWith('z5_cabin')
  ) {
    return MECHANISM_FAMILIES.PROGRESSIVE_BAY_ERECTION;
  }

  return MECHANISM_FAMILIES.SHAFT_CREEPER_CRANE_HOIST;
}

/**
 * Clones a material so per-piece `clippingPlanes` never leak across shared palette materials,
 * while preserving custom `onBeforeCompile` / `customProgramCacheKey` shaders and enforcing
 * strict zero-emissive PBR compliance.
 */
function cloneMaterialForClipping(baseMat, planes) {
  if (!baseMat || typeof baseMat.clone !== 'function') return baseMat;
  const cloned = baseMat.clone();
  if (typeof baseMat.onBeforeCompile === 'function') {
    cloned.onBeforeCompile = baseMat.onBeforeCompile;
  }
  if (typeof baseMat.customProgramCacheKey === 'function') {
    cloned.customProgramCacheKey = baseMat.customProgramCacheKey;
  }
  if (cloned.emissive && typeof cloned.emissive.setHex === 'function') {
    cloned.emissive.setHex(0x000000);
  }
  if ('emissiveIntensity' in cloned) {
    cloned.emissiveIntensity = 0.0;
  }
  if ('emissiveMap' in cloned) {
    cloned.emissiveMap = null;
  }
  cloned.clippingPlanes = planes;
  cloned.clipShadows = true;
  cloned.needsUpdate = true;
  return cloned;
}

/**
 * Pre-allocated pool of PBR 3D hoist rigging assemblies (twin forged-steel hoist cables,
 * cast-iron double-sheave hook block, 2-leg spreader slings, and lowered scaffold timber bundle).
 * Uses `MeshStandardMaterial` with `0` emissive and `NormalBlending` (`100%` Gate 2 compliant).
 */
class RiggingVisualPool {
  constructor(THREE, materials, parentGroup, poolSize = 6) {
    this.THREE = THREE;
    this.root = new THREE.Group();
    this.root.name = 's2_active_hoist_rigging_pool';
    this.root.visible = false;
    parentGroup.add(this.root);

    this.cableMat = new THREE.MeshStandardMaterial({
      name: 's2_rigging_forged_cable',
      color: 0x3b3936,
      roughness: 0.50,
      metalness: 0.78,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0.0,
    });
    this.blockMat = new THREE.MeshStandardMaterial({
      name: 's2_rigging_cast_hook_block',
      color: 0x2a2826,
      roughness: 0.66,
      metalness: 0.65,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0.0,
    });
    this.timberMat = new THREE.MeshStandardMaterial({
      name: 's2_rigging_timber_bundle',
      color: materials?.timberFalsework?.color?.getHex?.() ?? 0x9b7d56,
      roughness: 0.86,
      metalness: 0.04,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0.0,
    });

    // Unit cylinder aligned along +Y `[0 .. 1]` so endpoint placement is exact without reallocating geometry
    const unitCyl = new THREE.CylinderGeometry(1.0, 1.0, 1.0, 6, 1);
    unitCyl.translate(0, 0.5, 0);
    const blockGeo = new THREE.BoxGeometry(0.46, 0.58, 0.30);
    const sheaveGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.16, 10);
    sheaveGeo.rotateZ(Math.PI * 0.5);
    const timberGeo = new THREE.BoxGeometry(3.4, 0.34, 0.34);

    this.slots = [];
    for (let i = 0; i < poolSize; i++) {
      const slotGroup = new THREE.Group();
      slotGroup.name = `s2_rigging_slot_${i}`;
      slotGroup.visible = false;

      const cableA = new THREE.Mesh(unitCyl, this.cableMat);
      const cableB = new THREE.Mesh(unitCyl, this.cableMat);
      const slingL = new THREE.Mesh(unitCyl, this.cableMat);
      const slingR = new THREE.Mesh(unitCyl, this.cableMat);

      const hookBlock = new THREE.Group();
      const cheek = new THREE.Mesh(blockGeo, this.blockMat);
      const sheave = new THREE.Mesh(sheaveGeo, this.cableMat);
      hookBlock.add(cheek, sheave);

      const timberBundle = new THREE.Group();
      const b1 = new THREE.Mesh(timberGeo, this.timberMat);
      const b2 = new THREE.Mesh(timberGeo, this.timberMat);
      b2.position.set(0, 0.28, 0.22);
      timberBundle.add(b1, b2);
      timberBundle.visible = false;

      for (const m of [cableA, cableB, slingL, slingR, cheek, sheave, b1, b2]) {
        m.castShadow = false;
        m.receiveShadow = true;
      }

      slotGroup.add(cableA, cableB, slingL, slingR, hookBlock, timberBundle);
      this.root.add(slotGroup);
      this.slots.push({
        group: slotGroup,
        cableA,
        cableB,
        slingL,
        slingR,
        hookBlock,
        timberBundle,
      });
    }

    this._up = new THREE.Vector3(0, 1, 0);
    this._dir = new THREE.Vector3();
    this._tmpA = new THREE.Vector3();
    this._tmpB = new THREE.Vector3();
    this._activeCount = 0;
  }

  resetFrame() {
    this._activeCount = 0;
    for (let i = 0; i < this.slots.length; i++) {
      this.slots[i].group.visible = false;
      this.slots[i].timberBundle.visible = false;
    }
    this.root.visible = false;
  }

  _orientSegment(mesh, pStart, pEnd, radius) {
    this._dir.subVectors(pEnd, pStart);
    const len = this._dir.length();
    if (len < 0.05) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    mesh.position.copy(pStart);
    this._dir.multiplyScalar(1 / len);
    mesh.quaternion.setFromUnitVectors(this._up, this._dir);
    mesh.scale.set(radius, len, radius);
  }

  emitHoist({ boomHeadWorld, lugCenterWorld, spreadVecWorld, showTimberBundle = false, bundleYaw = 0 }) {
    if (this._activeCount >= this.slots.length) return false;
    const dist = boomHeadWorld.distanceTo(lugCenterWorld);
    if (dist < 0.65 || boomHeadWorld.y <= lugCenterWorld.y + 0.35) return false;

    const slot = this.slots[this._activeCount++];
    this.root.visible = true;
    slot.group.visible = true;

    // Hook block sits slightly above the piece's top rigging lugs so V-slings fan out cleanly
    const slingRise = Math.min(2.1, Math.max(0.65, dist * 0.24));
    const blockPos = slot.hookBlock.position;
    blockPos.set(
      lerp(lugCenterWorld.x, boomHeadWorld.x, 0.12),
      lugCenterWorld.y + slingRise,
      lerp(lugCenterWorld.z, boomHeadWorld.z, 0.12)
    );

    // Twin parallel hoist falls from crane sheave down to travelling hook block
    const offX = 0.09;
    this._tmpA.set(boomHeadWorld.x - offX, boomHeadWorld.y, boomHeadWorld.z);
    this._tmpB.set(blockPos.x - offX, blockPos.y + 0.22, blockPos.z);
    this._orientSegment(slot.cableA, this._tmpA, this._tmpB, 0.026);

    this._tmpA.set(boomHeadWorld.x + offX, boomHeadWorld.y, boomHeadWorld.z);
    this._tmpB.set(blockPos.x + offX, blockPos.y + 0.22, blockPos.z);
    this._orientSegment(slot.cableB, this._tmpA, this._tmpB, 0.026);

    // 2-leg forged spreader slings from hook block eye to girder lifting lugs
    this._tmpA.set(blockPos.x, blockPos.y - 0.22, blockPos.z);
    this._tmpB.copy(lugCenterWorld).add(spreadVecWorld);
    this._orientSegment(slot.slingL, this._tmpA, this._tmpB, 0.021);

    this._tmpB.copy(lugCenterWorld).sub(spreadVecWorld);
    this._orientSegment(slot.slingR, this._tmpA, this._tmpB, 0.021);

    slot.timberBundle.visible = Boolean(showTimberBundle);
    if (showTimberBundle) {
      slot.timberBundle.position.copy(lugCenterWorld);
      slot.timberBundle.rotation.set(0, bundleYaw, 0.04);
    }
    return true;
  }
}

export class BuildKinematicsEngine {
  constructor({ THREE, rootGroup, zones, pieces, materials, widenSpans = true } = {}) {
    if (!THREE || !rootGroup) {
      throw new Error('BuildKinematicsEngine requires { THREE, rootGroup }.');
    }
    this.THREE = THREE;
    this.rootGroup = rootGroup;
    this.zones = zones;
    this.materials = materials;
    this.widenSpans = widenSpans !== false;

    this.riggingPool = new RiggingVisualPool(THREE, materials, rootGroup, 6);
    this.records = [];
    this._craneAnchors = {
      pierCreepers: new Map(), // 'pile_1'..'pile_4' -> { wrapper, carriage, slewGroup }
      upperShaftArms: [], // [{ wrapper, arm, boomPivot, hoistPivot }]
    };

    // Reusable scratch math objects (zero per-frame heap allocation)
    this._v0 = new THREE.Vector3();
    this._v1 = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
    this._v3 = new THREE.Vector3();
    this._spread = new THREE.Vector3();
    this._qDelta = new THREE.Quaternion();
    this._qYaw = new THREE.Quaternion();
    this._euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this._invParentMat = new THREE.Matrix4();
    this._testMat = new THREE.Matrix4();

    this._lastTelemetry = {
      step: 11.0,
      activeAppearIds: [],
      activeVanishIds: [],
      activeRiggingCount: 0,
      activeClippedPieceCount: 0,
      minPiecePlungeM: 0.0,
    };

    if (Array.isArray(pieces) && pieces.length > 0) {
      this._indexSceneCranes();
      this._buildPieceRecords(pieces);
    }
  }

  _indexSceneCranes() {
    this._craneAnchors.pierCreepers.clear();
    this._craneAnchors.upperShaftArms = [];

    const z5Group = this.zones?.get?.('zone5')?.group;
    if (!z5Group) return;

    for (const pierId of ['pile_1', 'pile_2', 'pile_3', 'pile_4']) {
      const wrapper = z5Group.getObjectByName(`z5_temp_creeper_crane_${pierId}`);
      const carriage = z5Group.getObjectByName(`creeper_crane_carriage_${pierId}`);
      const slewGroup = z5Group.getObjectByName(`creeper_slew_${pierId}`);
      if (wrapper && carriage && slewGroup) {
        this._craneAnchors.pierCreepers.set(pierId, { wrapper, carriage, slewGroup });
      }
    }

    const upperWrapper = z5Group.getObjectByName('z5_temp_upper_shaft_climbing_cranes');
    const upperRig = z5Group.getObjectByName('upper_shaft_climbing_rig');
    this._craneAnchors.upperRig = upperRig || null;
    for (const tag of ['N', 'S']) {
      const boomMeshGroup = z5Group.getObjectByName(`upper_crane_boom_${tag}`);
      const hoistMeshGroup = z5Group.getObjectByName(`upper_crane_hoist_${tag}`);
      const boomPivot = boomMeshGroup?.parent || null;
      const arm = boomPivot?.parent || null;
      const hoistPivot = hoistMeshGroup?.parent || null;
      if (upperWrapper && arm && boomPivot && hoistPivot) {
        this._craneAnchors.upperShaftArms.push({
          tag,
          wrapper: upperWrapper,
          rig: upperRig,
          arm,
          boomPivot,
          hoistPivot,
          staticHoistMesh: hoistMeshGroup,
        });
      }
    }
  }

  _computeLocalBoundingBox(rootObj) {
    const { THREE } = this;
    const box = new THREE.Box3();
    const tmp = new THREE.Box3();
    const relMat = new THREE.Matrix4();
    const instMat = new THREE.Matrix4();
    const fullMat = new THREE.Matrix4();

    rootObj.traverse((child) => {
      const geom = child.geometry;
      if (!geom) return;
      if (!child.isMesh && !child.isInstancedMesh && !child.isLine && !child.isLineSegments) return;
      if (!geom.boundingBox) geom.computeBoundingBox();
      if (!geom.boundingBox || geom.boundingBox.isEmpty()) return;

      relMat.identity();
      let cur = child;
      while (cur && cur !== rootObj) {
        cur.updateMatrix();
        relMat.premultiply(cur.matrix);
        cur = cur.parent;
      }

      if (child.isInstancedMesh) {
        const count = child.count ?? 0;
        for (let i = 0; i < count; i++) {
          child.getMatrixAt(i, instMat);
          fullMat.multiplyMatrices(relMat, instMat);
          tmp.copy(geom.boundingBox).applyMatrix4(fullMat);
          box.union(tmp);
        }
      } else {
        tmp.copy(geom.boundingBox).applyMatrix4(relMat);
        box.union(tmp);
      }
    });

    if (box.isEmpty()) {
      box.min.set(-0.5, 0, -0.5);
      box.max.set(0.5, 1, 0.5);
    }
    return box;
  }

  _buildPieceRecords(pieces) {
    const { THREE } = this;
    this.rootGroup.updateMatrixWorld(true);

    this.records = pieces.map((p, index) => {
      const obj = p.object3D;
      obj.position.copy(p.basePos);
      obj.quaternion.copy(p.baseQuat);
      obj.scale.copy(p.baseScale);
      obj.visible = true;
      obj.updateMatrixWorld(true);

      const localBox =
        p.localBox && typeof p.localBox.isEmpty === 'function' && !p.localBox.isEmpty()
          ? p.localBox.clone()
          : this._computeLocalBoundingBox(obj);
      const worldBox = new THREE.Box3().setFromObject(obj);
      if (worldBox.isEmpty()) {
        worldBox.min.set(-0.5, 0, -0.5);
        worldBox.max.set(0.5, 1, 0.5);
      }

      const mechanism = classifyPieceMechanism(p);
      const activeSpan = this.widenSpans
        ? computeSafeWidenedSpan(p.id, p.span, mechanism)
        : [...p.span];
      const activeVanishSpan = this.widenSpans
        ? computeSafeWidenedVanishSpan(p.id, p.vanishSpan)
        : p.vanishSpan
          ? [...p.vanishSpan]
          : null;

      // Capture original mesh material references for zero-overhead restoration at rest
      const meshBindings = [];
      obj.traverse((child) => {
        if (child.isMesh && child.material) {
          meshBindings.push({
            mesh: child,
            origMaterial: child.material,
            clippedMaterial: null,
          });
        }
      });

      const cx = 0.5 * (worldBox.min.x + worldBox.max.x);
      const cy = 0.5 * (worldBox.min.y + worldBox.max.y);
      const cz = 0.5 * (worldBox.min.z + worldBox.max.z);
      const heightM = Math.max(0.25, worldBox.max.y - worldBox.min.y);
      const spanX = Math.max(0.25, worldBox.max.x - worldBox.min.x);
      const spanZ = Math.max(0.25, worldBox.max.z - worldBox.min.z);
      const horizRadius = 0.5 * Math.hypot(spanX, spanZ);

      // Determine pier quadrant if localized to a single pier
      const isSinglePier = Math.abs(cx) > 6.5 && Math.abs(cz) > 6.5 && horizRadius < 32.0;
      const pierSx = cx >= 0 ? 1 : -1;
      const pierSz = cz >= 0 ? 1 : -1;
      let pierId = null;
      if (isSinglePier) {
        if (pierSx > 0 && pierSz < 0) pierId = 'pile_1';
        else if (pierSx > 0 && pierSz > 0) pierId = 'pile_2';
        else if (pierSx < 0 && pierSz > 0) pierId = 'pile_3';
        else pierId = 'pile_4';
      } else {
        const mPier = String(p.id).match(/pile_([1-4])|^z1_p([1-4])_/);
        if (mPier) pierId = `pile_${mPier[1] || mPier[2]}`;
      }

      // Pre-allocate local 8 corners of `localBox` for exact O(1) world-Y plunge verification
      const lx0 = localBox.min.x, lx1 = localBox.max.x;
      const ly0 = localBox.min.y, ly1 = localBox.max.y;
      const lz0 = localBox.min.z, lz1 = localBox.max.z;
      const localCorners = [
        new THREE.Vector3(lx0, ly0, lz0),
        new THREE.Vector3(lx1, ly0, lz0),
        new THREE.Vector3(lx0, ly1, lz0),
        new THREE.Vector3(lx1, ly1, lz0),
        new THREE.Vector3(lx0, ly0, lz1),
        new THREE.Vector3(lx1, ly0, lz1),
        new THREE.Vector3(lx0, ly1, lz1),
        new THREE.Vector3(lx1, ly1, lz1),
      ];

      const isDynamicSubRig =
        p.id.startsWith('z5_cabin') ||
        p.id.startsWith('z5_temp_creeper_crane_') ||
        p.id === 'z5_temp_upper_shaft_climbing_cranes';

      return {
        index,
        piece: p,
        id: p.id,
        obj,
        mechanism,
        origSpan: [...p.span],
        span: activeSpan,
        origVanishSpan: p.vanishSpan ? [...p.vanishSpan] : null,
        vanishSpan: activeVanishSpan,
        basePos: p.basePos.clone(),
        baseQuat: p.baseQuat.clone(),
        baseScale: p.baseScale.clone(),
        localCenter: p.localCenter ? p.localCenter.clone() : localBox.getCenter(new THREE.Vector3()),
        localTopPivot: new THREE.Vector3(
          0.5 * (lx0 + lx1),
          ly1,
          0.5 * (lz0 + lz1)
        ),
        localBox,
        localCorners,
        restWorldMinY: worldBox.min.y,
        restWorldMaxY: worldBox.max.y,
        restCentroid: new THREE.Vector3(cx, cy, cz),
        heightM,
        spanX,
        spanZ,
        horizRadius,
        isSinglePier,
        pierSx,
        pierSz,
        pierId,
        isDynamicSubRig,
        phaseSeed: (index * 1.6180339887) % (Math.PI * 2),
        clipPlane: new THREE.Plane(new THREE.Vector3(0, -1, 0), worldBox.max.y + 10.0),
        clipPlanesArray: null,
        isClippedActive: false,
        meshBindings,
      };
    });

    for (const rec of this.records) {
      rec.clipPlanesArray = [rec.clipPlane];
    }
  }

  _enablePieceClipping(rec, yCutWorld) {
    rec.clipPlane.normal.set(0, -1, 0);
    rec.clipPlane.constant = yCutWorld;

    if (!rec.isClippedActive || rec.meshBindings.some((b) => b.mesh.material !== b.clippedMaterial)) {
      for (let i = 0; i < rec.meshBindings.length; i++) {
        const b = rec.meshBindings[i];
        // Adopt any post-init material upgrade (e.g. `upgradeTowerMaterialsAndDecks` or render-mode overrides)
        if (b.mesh.material && b.mesh.material !== b.origMaterial && b.mesh.material !== b.clippedMaterial) {
          b.origMaterial = b.mesh.material;
          b.clippedMaterial = null;
        } else if (
          b.clippedMaterial &&
          !Array.isArray(b.origMaterial) &&
          !Array.isArray(b.clippedMaterial) &&
          (b.origMaterial.normalMap !== b.clippedMaterial.normalMap ||
            b.origMaterial.roughnessMap !== b.clippedMaterial.roughnessMap ||
            b.origMaterial.map !== b.clippedMaterial.map)
        ) {
          b.clippedMaterial = null;
        }
        if (!b.clippedMaterial) {
          if (Array.isArray(b.origMaterial)) {
            b.clippedMaterial = b.origMaterial.map((m) =>
              cloneMaterialForClipping(m, rec.clipPlanesArray)
            );
          } else {
            b.clippedMaterial = cloneMaterialForClipping(b.origMaterial, rec.clipPlanesArray);
          }
        }
        // Sync wireframe flag if Debug View toggled render mode
        if (Array.isArray(b.clippedMaterial) && Array.isArray(b.origMaterial)) {
          for (let k = 0; k < b.clippedMaterial.length; k++) {
            if (b.origMaterial[k]) b.clippedMaterial[k].wireframe = Boolean(b.origMaterial[k].wireframe);
          }
        } else if (b.clippedMaterial && b.origMaterial) {
          b.clippedMaterial.wireframe = Boolean(b.origMaterial.wireframe);
        }
        if (b.mesh.userData && b.mesh.userData.__origMaterial === undefined) {
          b.mesh.userData.__origMaterial = b.origMaterial;
        }
        b.mesh.material = b.clippedMaterial;
      }
      rec.isClippedActive = true;
    }
  }

  _restorePieceMaterials(rec) {
    if (!rec.isClippedActive) return;
    for (let i = 0; i < rec.meshBindings.length; i++) {
      const b = rec.meshBindings[i];
      if (b.mesh.material && b.mesh.material !== b.clippedMaterial) {
        b.origMaterial = b.mesh.material;
        b.clippedMaterial = null;
      } else {
        b.mesh.material = b.origMaterial;
      }
    }
    rec.isClippedActive = false;
  }

  _setCanonicalRest(rec, visible) {
    this._restorePieceMaterials(rec);
    const obj = rec.obj;
    obj.visible = visible;
    obj.position.copy(rec.basePos);
    obj.quaternion.copy(rec.baseQuat);
    obj.scale.copy(rec.baseScale);
  }

  /**
   * Computes `(pos, quat)` for rigid motion where the piece's `localPivot` is translated by
   * `worldDelta` and rotated in world space by `worldDeltaQuat`, then enforces the exact 8-corner
   * floor guard so `minWorldY >= rec.restWorldMinY` (`0.000 m` plunge guaranteed).
   */
  _applyRigidHoistTransform(rec, worldDeltaX, worldDeltaY, worldDeltaZ, rx, ry, rz) {
    const obj = rec.obj;
    const parent = obj.parent;
    parent.updateWorldMatrix(true, false);
    const parentWorld = parent.matrixWorld;
    this._invParentMat.copy(parentWorld).invert();

    // Canonical world position of `localTopPivot`
    this._testMat.compose(rec.basePos, rec.baseQuat, rec.baseScale);
    this._testMat.premultiply(parentWorld);

    const pivotRestWorld = this._v0.copy(rec.localTopPivot).applyMatrix4(this._testMat);
    const pivotTargetWorld = this._v1.set(
      pivotRestWorld.x + worldDeltaX,
      pivotRestWorld.y + worldDeltaY,
      pivotRestWorld.z + worldDeltaZ
    );

    // World delta rotation around `localTopPivot`
    this._euler.set(rx, ry, rz, 'YXZ');
    this._qDelta.setFromEuler(this._euler);

    // Since zones have identity world rotation (`parentWorld` is identity in Tower rootGroup),
    // compose cleanly via general parent-space math:
    obj.scale.copy(rec.baseScale);
    obj.quaternion.copy(rec.baseQuat).premultiply(this._qDelta);

    // Find where `localTopPivot` lands with `basePos` + new `quaternion`, then shift so it hits `pivotTargetWorld`
    obj.position.copy(rec.basePos);
    obj.updateMatrix();
    this._testMat.multiplyMatrices(parentWorld, obj.matrix);
    const currentPivotWorld = this._v2.copy(rec.localTopPivot).applyMatrix4(this._testMat);

    const corrWorldX = pivotTargetWorld.x - currentPivotWorld.x;
    const corrWorldY = pivotTargetWorld.y - currentPivotWorld.y;
    const corrWorldZ = pivotTargetWorld.z - currentPivotWorld.z;

    this._v3.set(
      rec.basePos.x + corrWorldX,
      rec.basePos.y + corrWorldY,
      rec.basePos.z + corrWorldZ
    );
    obj.position.copy(this._v3);
    obj.updateMatrix();
    this._testMat.multiplyMatrices(parentWorld, obj.matrix);

    // Exact 8-corner world-Y plunge guard: never allow any corner below `restWorldMinY` (or 0.0m if above-grade)
    const floorLimitY = rec.restWorldMinY >= -1e-3 ? Math.max(0.0, rec.restWorldMinY) : rec.restWorldMinY;
    let minCornerY = Infinity;
    let maxCornerY = -Infinity;
    for (let i = 0; i < 8; i++) {
      const cy = this._v2.copy(rec.localCorners[i]).applyMatrix4(this._testMat).y;
      if (cy < minCornerY) minCornerY = cy;
      if (cy > maxCornerY) maxCornerY = cy;
    }

    if (minCornerY < floorLimitY) {
      const liftFix = floorLimitY - minCornerY;
      obj.position.y += liftFix;
      minCornerY += liftFix;
      maxCornerY += liftFix;
      pivotTargetWorld.y += liftFix;
    }

    return {
      minCornerY,
      maxCornerY,
      lugWorld: pivotTargetWorld.clone(),
    };
  }

  /**
   * Slews the nearest active `zone5` climbing/creeper crane boom smoothly toward `lugWorld`
   * (weighted by `bell = sin^2(pi * u)` so `u=0` and `u=1` leave calibrated crane angles 100% intact)
   * and returns the 3D world position of a REAL visible crane/derrick sheave (never an empty sky-hook!).
   */
  _resolveCraneBoomAndSlew(rec, step, u, lugWorld) {
    const bell = Math.sin(Math.PI * clamp(u, 0, 1)) ** 2;

    // 1. Upper-shaft internal climbing cranes (`step in [5.66, 8.10]`, high shaft & Floor 3 pieces)
    if (lugWorld.y >= 118.0 && this._craneAnchors.upperShaftArms.length > 0) {
      const firstArm = this._craneAnchors.upperShaftArms[0];
      if (firstArm.wrapper.visible && step >= 5.66 && step <= 8.20) {
        const chosen =
          Math.abs(lugWorld.z) > 1.5
            ? lugWorld.z >= 0
              ? this._craneAnchors.upperShaftArms[1] || firstArm
              : firstArm
            : this._craneAnchors.upperShaftArms[rec.index % this._craneAnchors.upperShaftArms.length];

        chosen.arm.parent?.updateWorldMatrix(true, false);
        const armWorldPos = this._v0;
        chosen.arm.getWorldPosition(armWorldPos);
        const dx = lugWorld.x - armWorldPos.x;
        const dz = lugWorld.z - armWorldPos.z;
        if (Math.hypot(dx, dz) > 0.6 && bell > 1e-3) {
          const targetYaw = Math.atan2(dx, dz);
          let diff = ((targetYaw - chosen.arm.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
          diff = clamp(diff, -0.85, 0.85);
          chosen.arm.rotation.y += diff * bell * 0.75;
        }
        chosen.arm.updateMatrixWorld(true);
        const headWorld = new this.THREE.Vector3();
        chosen.hoistPivot.getWorldPosition(headWorld);
        if (headWorld.y > lugWorld.y + 0.65) {
          if (chosen.staticHoistMesh) chosen.staticHoistMesh.visible = false;
          return headWorld;
        }
      }
    }

    // 2. Stage-2 Pier Pivoting Creeper Cranes (`step in [3.70, 5.55]`, `creeper_slew_pile_1..4`)
    if (step >= 3.70 && step <= 5.55 && this._craneAnchors.pierCreepers.size > 0) {
      const targetPierId = rec.pierId || `pile_${(rec.index % 4) + 1}`;
      const creeper = this._craneAnchors.pierCreepers.get(targetPierId);
      if (creeper && creeper.wrapper.visible) {
        creeper.carriage.updateWorldMatrix(true, false);
        const localTarget = this._v0.copy(lugWorld);
        creeper.carriage.worldToLocal(localTarget);
        if (Math.hypot(localTarget.x, localTarget.z) > 0.5 && bell > 1e-3) {
          const desiredSlew = Math.atan2(localTarget.x, localTarget.z);
          let diff =
            ((desiredSlew - creeper.slewGroup.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
          diff = clamp(diff, -0.95, 0.95);
          creeper.slewGroup.rotation.y += diff * bell * 0.82;
        }
        creeper.slewGroup.updateMatrixWorld(true);
        const headWorld = new this.THREE.Vector3(0, 13.30, 7.25).applyMatrix4(
          creeper.slewGroup.matrixWorld
        );
        if (headWorld.y > lugWorld.y + 0.65) {
          return headWorld;
        }
      }
    }

    // 3. Phase 1 Guyed Timber Gin-Poles (`bigues`, `step in [1.00, 2.38]`)
    if (step >= 1.00 && step <= 2.38 && rec.pierId) {
      const g = PHASE1_GIN_POLE_SHEAVES.find((it) => it.id === rec.pierId);
      if (g && g.pos[1] > lugWorld.y + 0.65) {
        return new this.THREE.Vector3(g.pos[0], g.pos[1], g.pos[2]);
      }
    }

    // Never invent an unanchored sky-hook in empty air!
    return null;
  }

  /**
   * Evaluates and applies physically grounded construction state across all 159 pieces at `step`.
   */
  applyStep(step, _elapsedSec = 0) {
    const s = clamp(Number.isFinite(step) ? step : 11.0, 0.0, 11.0);
    const atCalibratedPnp = isNearCalibratedPnpStep(s, 1e-4);

    this.riggingPool.resetFrame();

    // Restore static plumb-cable visibility on upper climbing cranes before dynamic hoist overrides
    for (const arm of this._craneAnchors.upperShaftArms) {
      if (arm.staticHoistMesh) arm.staticHoistMesh.visible = true;
    }

    // During fractional upper-shaft steps `(5.80 .. 7.82)` (strictly outside PnP photo locks!),
    // perch the twin climbing cranes right on the highest settled shaft panel collar so their
    // 14.8m lattice booms visibly reach above the incoming `panneau` and hoist it with taut cables!
    if (!atCalibratedPnp && s > 5.80 && s < 7.82 && this._craneAnchors.upperRig) {
      let settledShaftTopY = 137.85;
      for (let i = 0; i < this.records.length; i++) {
        const r = this.records[i];
        if (
          s >= r.span[1] &&
          (r.id.startsWith('z3_merger_') || r.id.startsWith('z3_shaft_') || r.id.startsWith('z4_panneau_'))
        ) {
          if (r.restWorldMaxY > settledShaftTopY) settledShaftTopY = r.restWorldMaxY;
        }
      }
      const targetRigY = Math.min(274.5, Math.max(this._craneAnchors.upperRig.position.y, settledShaftTopY - 0.8));
      this._craneAnchors.upperRig.position.y = targetRigY;
      this._craneAnchors.upperRig.updateMatrixWorld(true);
    }

    const activeAppearIds = [];
    const activeVanishIds = [];
    let activeClippedCount = 0;
    let worstPlungeM = 0.0;

    for (let i = 0; i < this.records.length; i++) {
      const rec = this.records[i];
      const [t0, t1] = rec.span;

      // 1. Not yet mobilized (`step < t0`)
      if (s < t0) {
        this._setCanonicalRest(rec, false);
        continue;
      }

      // 2. Temporary structure vanish check (`vanishSpan = [v0, v1]`)
      if (rec.vanishSpan) {
        const [v0, v1] = rec.vanishSpan;
        if (s >= v1) {
          this._setCanonicalRest(rec, false);
          continue;
        }
        if (s > v0 && !atCalibratedPnp) {
          const uv = clamp((s - v0) / Math.max(1e-4, v1 - v0), 0, 1);
          activeVanishIds.push(rec.id);
          this._applyStagedDismantle(rec, s, uv);
          if (rec.isClippedActive) activeClippedCount++;
          continue;
        }
      }

      // 3. Settled permanent/standing state (`step >= t1` or exact PnP calibration lock)
      if (s >= t1 || atCalibratedPnp) {
        if (rec.isDynamicSubRig) {
          this._restorePieceMaterials(rec);
          rec.obj.visible = true;
        } else {
          this._setCanonicalRest(rec, true);
        }
        continue;
      }

      // 4. Active mechanical assembly (`t0 <= s < t1`, `u in [0, 1)`)
      const u = clamp((s - t0) / Math.max(1e-4, t1 - t0), 0, 1);
      activeAppearIds.push(rec.id);
      rec.obj.visible = true;

      const plungeCheck = this._applyAppearMechanism(rec, s, u);
      if (rec.isClippedActive) activeClippedCount++;
      if (plungeCheck < worstPlungeM) worstPlungeM = plungeCheck;
    }

    this._lastTelemetry = {
      step: s,
      atCalibratedPnp,
      activeAppearIds,
      activeVanishIds,
      activeRiggingCount: this.riggingPool._activeCount,
      activeClippedPieceCount: activeClippedCount,
      minPiecePlungeM: Math.abs(worstPlungeM) < 1e-6 ? 0.0 : worstPlungeM,
    };

    return this._lastTelemetry;
  }

  _applyStagedDismantle(rec, _step, uv) {
    const obj = rec.obj;
    obj.visible = true;

    let yMin = rec.restWorldMinY;
    let yMax = rec.restWorldMaxY;
    if (rec.isDynamicSubRig) {
      obj.updateMatrixWorld(true);
      const liveBox = new this.THREE.Box3().setFromObject(obj);
      if (!liveBox.isEmpty()) {
        yMin = liveBox.min.y;
        yMax = liveBox.max.y;
      }
    } else {
      obj.position.copy(rec.basePos);
      obj.quaternion.copy(rec.baseQuat);
      obj.scale.copy(rec.baseScale);
    }

    // Top-down tier-by-tier carpenter dismantle (`yCut` sweeps from `yMax` down to `yMin`; standing base never sinks!)
    const uTier = steppedCourseProgress(uv, 8);
    const yCut = lerp(yMax + 0.08, yMin - 0.08, uTier);
    this._enablePieceClipping(rec, yCut);

    // Lower a dismantled timber bundle from the top standing ledger of the scaffold itself (anchored to real timber!)
    if (rec.mechanism === MECHANISM_FAMILIES.FALSEWORK_STAGED_DISMANTLE && uv > 0.06 && uv < 0.86 && yCut > yMin + 6.0) {
      const tierFrac = (uv * 4.0) % 1.0;
      const sheaveY = yCut - 0.25;
      const bundleY = lerp(sheaveY - 2.2, Math.max(0.85, yMin + 1.1), smoothstep01(tierFrac));
      if (sheaveY > bundleY + 1.5) {
        const lugX = rec.restCentroid.x + (rec.spanX > 25 ? 6.8 : 2.2);
        const lugZ = rec.restCentroid.z + (rec.spanZ > 25 ? 33.5 : 2.2);
        const lugWorld = new this.THREE.Vector3(lugX, bundleY, lugZ);
        const sheaveWorld = new this.THREE.Vector3(lugX, sheaveY, lugZ);
        this._spread.set(1.15, 0, 0);
        this.riggingPool.emitHoist({
          boomHeadWorld: sheaveWorld,
          lugCenterWorld: lugWorld,
          spreadVecWorld: this._spread,
          showTimberBundle: true,
          bundleYaw: rec.phaseSeed,
        });
      }
    }
  }

  _applyAppearMechanism(rec, step, u) {
    const M = MECHANISM_FAMILIES;

    switch (rec.mechanism) {
      case M.CAISSON_PNEUMATIC_SINK: {
        // Sinks from +4.40m higher in the dry pit down to `-11.55m` / `-9.91m` under compressed air (`Pl. 02`)
        const sSink = smootherstep01(u);
        const liftY = 4.40 * (1.0 - sSink);
        const settleDecay = (1.0 - u) * (1.0 - u);
        const rx = 0.012 * Math.sin(u * Math.PI * 5.0 + rec.phaseSeed) * settleDecay;
        const rz = 0.010 * Math.cos(u * Math.PI * 4.0 + rec.phaseSeed) * settleDecay;
        const res = this._applyRigidHoistTransform(rec, 0, liftY, 0, rx, 0, rz);

        if (u < 0.18) {
          const yCut = lerp(res.minCornerY - 0.05, res.maxCornerY + 0.15, smoothstep01(u / 0.18));
          this._enablePieceClipping(rec, yCut);
        } else {
          this._restorePieceMaterials(rec);
        }
        return res.minCornerY - rec.restWorldMinY;
      }

      case M.MASONRY_COURSE_STACK: {
        // Exact canonical rest position; stepped horizontal courses of Souppes/Château-Landon stone rise upward
        rec.obj.position.copy(rec.basePos);
        rec.obj.quaternion.copy(rec.baseQuat);
        rec.obj.scale.copy(rec.baseScale);
        const uCourse = steppedCourseProgress(u, 12);
        const yCut = lerp(rec.restWorldMinY - 0.04, rec.restWorldMaxY + 0.06, uCourse);
        this._enablePieceClipping(rec, yCut);
        return 0.0;
      }

      case M.INCLINED_SHOE_HYDRAULIC_SEAT: {
        // Lowered along 54.6° pier rafter batter (`u in [0, 0.72]`) under the 13.5m guyed gin-poles (`bigues`),
        // then pressed 0.34m by 800t hydraulic jacks (`[0.72, 1.0]`)
        const invLen = 1.0 / Math.hypot(0.52955, 1.0, 0.52955);
        const axX = -0.52955 * rec.pierSx * invLen;
        const axY = 1.0 * invLen;
        const axZ = -0.52955 * rec.pierSz * invLen;

        let axialDist;
        let pendRad = 0.0;
        if (u < 0.72) {
          const uA = u / 0.72;
          axialDist = lerp(4.80, 0.34, smootherstep01(uA));
          const env = (1.0 - uA) * Math.exp(-3.2 * uA);
          pendRad = 0.040 * Math.sin(uA * Math.PI * 3.0 + rec.phaseSeed) * env;
        } else {
          const uB = (u - 0.72) / 0.28;
          axialDist = lerp(0.34, 0.0, smoothstep01(uB));
        }

        const dx = axX * axialDist + rec.pierSx * 0.95 * Math.max(0, 1.0 - u / 0.72) ** 1.4;
        const dy = Math.max(0.0, axY * axialDist);
        const dz = axZ * axialDist + rec.pierSz * 0.95 * Math.max(0, 1.0 - u / 0.72) ** 1.4;

        const res = this._applyRigidHoistTransform(
          rec,
          dx,
          dy,
          dz,
          pendRad * rec.pierSz,
          0,
          -pendRad * rec.pierSx
        );

        if (u < 0.14) {
          const yCut = lerp(res.minCornerY - 0.05, res.maxCornerY + 0.15, smoothstep01(u / 0.14));
          this._enablePieceClipping(rec, yCut);
        } else {
          this._restorePieceMaterials(rec);
        }

        if (u > 0.02 && u < 0.92) {
          const boomHead = this._resolveCraneBoomAndSlew(rec, step, u, res.lugWorld);
          if (boomHead) {
            this._spread.set(0.65 * rec.pierSz, 0, -0.65 * rec.pierSx);
            this.riggingPool.emitHoist({
              boomHeadWorld: boomHead,
              lugCenterWorld: res.lugWorld,
              spreadVecWorld: this._spread,
            });
          }
        }
        return res.minCornerY - rec.restWorldMinY;
      }

      case M.BATTERED_PIER_DERRICK_HOIST: {
        // Multi-tier 60m inclined track spines (`yMin < 0`) bolt upward along the pier rails progressively
        if (rec.heightM > 38.0) {
          rec.obj.position.copy(rec.basePos);
          rec.obj.quaternion.copy(rec.baseQuat);
          rec.obj.scale.copy(rec.baseScale);
          const uRail = steppedCourseProgress(u, 10);
          const yCut = lerp(rec.restWorldMinY - 0.05, rec.restWorldMaxY + 0.10, uRail);
          this._enablePieceClipping(rec, yCut);
          return 0.0;
        }

        // Standard inclined pier panel / Stage-2 rafter lift (`4.4m .. 6.2m` physical derrick clearance):
        // Stage A (`u in [0, 0.78]`): Derrick/creeper hoist lower + outward-to-inward swing + damped pendulum
        // Stage B (`u in [0.78, 1.00]`): Drift-pin alignment & 800-ton shoe-jack splice seating (`0.32m -> 0.0m`)
        const liftMax = clamp(rec.heightM * 0.48 + 2.4, 3.8, 6.2);
        const batterK = rec.restWorldMinY < 57.0 ? 0.52955 : 0.24;

        let dy;
        let radialOut;
        let pendRad = 0.0;
        let yawAlign = 0.0;

        if (u < 0.78) {
          const uA = u / 0.78;
          const sA = smootherstep01(uA);
          dy = lerp(liftMax, 0.32, sA);
          radialOut = 2.60 * (1.0 - sA) ** 1.35;
          const maxSafeTilt = Math.min(0.040, (0.38 * dy) / Math.max(2.0, rec.horizRadius));
          pendRad =
            maxSafeTilt *
            Math.sin(uA * Math.PI * 3.5 + rec.phaseSeed) *
            Math.exp(-3.4 * uA) *
            (1.0 - uA);
          yawAlign = 0.048 * (1.0 - sA) * Math.exp(-2.6 * uA) * (rec.index % 2 === 0 ? 1 : -1);
        } else {
          const uB = (u - 0.78) / 0.22;
          const sB = smoothstep01(uB);
          dy = lerp(0.32, 0.0, sB);
          radialOut = 0.0;
        }

        const dx = rec.isSinglePier
          ? rec.pierSx * (radialOut - batterK * Math.min(dy, 0.32))
          : 0.0;
        const dz = rec.isSinglePier
          ? rec.pierSz * (radialOut - batterK * Math.min(dy, 0.32))
          : 0.0;

        const res = this._applyRigidHoistTransform(
          rec,
          dx,
          dy,
          dz,
          pendRad * (rec.isSinglePier ? rec.pierSz : 1),
          yawAlign,
          -pendRad * (rec.isSinglePier ? rec.pierSx : 0.7)
        );

        if (u < 0.16) {
          const yCut = lerp(res.minCornerY - 0.05, res.maxCornerY + 0.15, smoothstep01(u / 0.16));
          this._enablePieceClipping(rec, yCut);
        } else {
          this._restorePieceMaterials(rec);
        }

        if (u > 0.02 && u < 0.94) {
          const boomHead = this._resolveCraneBoomAndSlew(rec, step, u, res.lugWorld);
          if (boomHead) {
            const sp = Math.min(2.2, Math.max(0.85, rec.horizRadius * 0.28));
            this._spread.set(sp, 0, sp * (rec.isSinglePier ? -rec.pierSx * rec.pierSz : 0.4));
            this.riggingPool.emitHoist({
              boomHeadWorld: boomHead,
              lugCenterWorld: res.lugWorld,
              spreadVecWorld: this._spread,
            });
          }
        }
        return res.minCornerY - rec.restWorldMinY;
      }

      case M.PLATFORM_GIRDER_SANDBOX_SETTLE: {
        // Eiffel's `boîtes à sable` 3-stage platform closure (`Photos #23 & #51`):
        //   [0.00 .. 0.68]: Hoist lowering from `+5.2m` onto falsework sand-box plungers at `+0.42m`
        //   [0.68 .. 0.82]: Steady bearing dwell on `boîtes à sable` (`+0.42m -> +0.38m`) while pier jacks align
        //   [0.82 .. 1.00]: Controlled dry-sand bleed (`+0.38m -> 0.000m`) into permanent dead-level lock
        let dy;
        let tiltZ = 0.0;
        if (u < 0.68) {
          const uA = u / 0.68;
          dy = lerp(5.2, 0.42, smootherstep01(uA));
          const maxSafeRoll = Math.min(0.018, (0.35 * dy) / Math.max(4.0, rec.horizRadius));
          tiltZ =
            maxSafeRoll *
            Math.sin(uA * Math.PI * 2.5 + rec.phaseSeed) *
            Math.exp(-3.2 * uA) *
            (1.0 - uA);
        } else if (u < 0.82) {
          const uHold = (u - 0.68) / 0.14;
          dy = lerp(0.42, 0.38, uHold);
        } else {
          const uBleed = (u - 0.82) / 0.18;
          dy = lerp(0.38, 0.0, smoothstep01(uBleed));
        }

        const res = this._applyRigidHoistTransform(rec, 0, dy, 0, tiltZ * 0.6, 0, tiltZ);

        if (u < 0.22) {
          const yCut = lerp(res.minCornerY - 0.05, res.maxCornerY + 0.15, smoothstep01(u / 0.22));
          this._enablePieceClipping(rec, yCut);
        } else {
          this._restorePieceMaterials(rec);
        }

        if (u > 0.02 && u < 0.82) {
          const boomHead = this._resolveCraneBoomAndSlew(rec, step, u, res.lugWorld);
          if (boomHead) {
            this._spread.set(Math.min(3.4, rec.spanX * 0.18), 0, 0);
            this.riggingPool.emitHoist({
              boomHeadWorld: boomHead,
              lugCenterWorld: res.lugWorld,
              spreadVecWorld: this._spread,
            });
          }
        }
        return res.minCornerY - rec.restWorldMinY;
      }

      case M.ARCH_CANTILEVER_SWING: {
        // Twin opposing arch cantilevers growing upward AND inward simultaneously from all 4 pier haunches
        // along the curved timber `cintres`, coupled with damped upper-chord winch settling (`0.000m` plunge)
        const sCant = smootherstep01(u);
        const dy = 1.45 * (1.0 - sCant) * (1.0 - sCant);
        const yawMicro = 0.007 * Math.sin(u * Math.PI * 3.0) * (1.0 - sCant);
        const res = this._applyRigidHoistTransform(rec, 0, dy, 0, 0, yawMicro, 0);

        const uVoussoir = steppedCourseProgress(u, 14);
        const yCut = lerp(res.minCornerY - 0.05, res.maxCornerY + 0.12, uVoussoir);
        this._enablePieceClipping(rec, yCut);
        return res.minCornerY - rec.restWorldMinY;
      }

      case M.ARCH_CROWN_KEY_CLOSURE: {
        // Central arch crown key-piece (`clef de l'arc`) lowered on tackle anchored directly beneath
        // the already-completed 1st-floor `Grande Poutre` (`+50.3m`) into the cantilevered arch jaws!
        let dy;
        let pend = 0.0;
        if (u < 0.74) {
          const uA = u / 0.74;
          dy = lerp(5.4, 0.30, smootherstep01(uA));
          const maxSafe = Math.min(0.020, (0.35 * dy) / Math.max(4.0, rec.horizRadius));
          pend = maxSafe * Math.sin(uA * Math.PI * 3.0) * Math.exp(-3.4 * uA) * (1.0 - uA);
        } else if (u < 0.85) {
          dy = lerp(0.30, 0.26, (u - 0.74) / 0.11);
        } else {
          dy = lerp(0.26, 0.0, smoothstep01((u - 0.85) / 0.15));
        }

        const res = this._applyRigidHoistTransform(rec, 0, dy, 0, pend, 0, pend * 0.7);
        if (u < 0.15) {
          const yCut = lerp(res.minCornerY - 0.05, res.maxCornerY + 0.12, smoothstep01(u / 0.15));
          this._enablePieceClipping(rec, yCut);
        } else {
          this._restorePieceMaterials(rec);
        }

        if (u > 0.02 && u < 0.90 && res.maxCornerY < 49.4) {
          const lugWorld = new this.THREE.Vector3(0, res.maxCornerY, 32.8);
          const girderSoffitSheave = new this.THREE.Vector3(0, 50.35, 32.8);
          this._spread.set(1.8, 0, 0);
          this.riggingPool.emitHoist({
            boomHeadWorld: girderSoffitSheave,
            lugCenterWorld: lugWorld,
            spreadVecWorld: this._spread,
          });
        }
        return res.minCornerY - rec.restWorldMinY;
      }

      case M.SHAFT_CREEPER_CRANE_HOIST: {
        // Tall continuous spiral stair / guide segments (>36m) bolt upward bay-by-bay with a modest hoist collar
        if (rec.heightM > 36.0) {
          const dy = 1.6 * (1.0 - smootherstep01(u));
          const res = this._applyRigidHoistTransform(rec, 0, dy, 0, 0, 0, 0);
          const yCut = lerp(res.minCornerY - 0.05, res.maxCornerY + 0.12, steppedCourseProgress(u, 12));
          this._enablePieceClipping(rec, yCut);
          return res.minCornerY - rec.restWorldMinY;
        }

        // Merger & Upper-Shaft `Panneaux 12..29`, Floor 3, Campanile & Lighthouse hoisted by internal climbing cranes:
        //   Lift drop (`4.2m .. 5.4m`) keeps `lugWorld` strictly beneath the `14.8m` climbing crane boom-head sheaves!
        const liftMax = clamp(rec.heightM * 0.42 + 1.8, 3.6, 5.4);
        let dy;
        let rx = 0.0;
        let ry = 0.0;
        let rz = 0.0;

        if (u < 0.78) {
          const uA = u / 0.78;
          const sA = smootherstep01(uA);
          dy = lerp(liftMax, 0.28, sA);
          const maxSafeTilt = Math.min(0.038, (0.38 * dy) / Math.max(2.5, rec.horizRadius));
          const damp = Math.exp(-3.4 * uA) * (1.0 - uA);
          rx = maxSafeTilt * Math.sin(uA * Math.PI * 3.5 + rec.phaseSeed) * damp;
          rz = maxSafeTilt * 0.78 * Math.cos(uA * Math.PI * 3.0 + rec.phaseSeed) * damp;
          ry = 0.062 * (1.0 - sA) * Math.exp(-2.5 * uA) * (rec.index % 2 === 0 ? 1 : -1);
        } else {
          const uB = (u - 0.78) / 0.22;
          dy = lerp(0.28, 0.0, smoothstep01(uB));
        }

        const res = this._applyRigidHoistTransform(rec, 0, dy, 0, rx, ry, rz);

        if (u < 0.16) {
          const yCut = lerp(res.minCornerY - 0.05, res.maxCornerY + 0.15, smoothstep01(u / 0.16));
          this._enablePieceClipping(rec, yCut);
        } else {
          this._restorePieceMaterials(rec);
        }

        if (u > 0.02 && u < 0.94) {
          const boomHead = this._resolveCraneBoomAndSlew(rec, step, u, res.lugWorld);
          if (boomHead) {
            const sp = Math.min(2.4, Math.max(0.85, rec.horizRadius * 0.32));
            this._spread.set(sp, 0, sp * 0.55);
            this.riggingPool.emitHoist({
              boomHeadWorld: boomHead,
              lugCenterWorld: res.lugWorld,
              spreadVecWorld: this._spread,
            });
          }
        }
        return res.minCornerY - rec.restWorldMinY;
      }

      case M.PROGRESSIVE_BAY_ERECTION: {
        // Framed carpentry pavilions, multipane glazing, 72 scientist plaques, spiral staircases,
        // hydraulic basement-to-platform pipework, and elevator cabins:
        // Erected progressively bottom-up without pulling sub-grade accumulators through the ground.
        if (rec.isDynamicSubRig) {
          rec.obj.updateMatrixWorld(true);
          const liveBox = new this.THREE.Box3().setFromObject(rec.obj);
          const yMin = liveBox.isEmpty() ? rec.restWorldMinY : liveBox.min.y;
          const yMax = liveBox.isEmpty() ? rec.restWorldMaxY : liveBox.max.y;
          const yCut = lerp(yMin - 0.05, yMax + 0.10, smoothstep01(u));
          this._enablePieceClipping(rec, yCut);
          return 0.0;
        }

        const allowSettle = rec.restWorldMinY >= 0.0 && rec.heightM <= 18.0;
        const dy = allowSettle ? 0.85 * (1.0 - smootherstep01(u)) ** 1.6 : 0.0;
        const res = this._applyRigidHoistTransform(rec, 0, dy, 0, 0, 0, 0);
        const yCut = lerp(
          res.minCornerY - 0.05,
          res.maxCornerY + 0.10,
          steppedCourseProgress(u, 10)
        );
        this._enablePieceClipping(rec, yCut);
        return res.minCornerY - rec.restWorldMinY;
      }

      case M.FALSEWORK_STAGED_DISMANTLE:
      case M.TEMPORARY_CRANE_RIGGING:
      default: {
        // Temporary timber falsework & climbing crane rigs mobilize bottom-up tier-by-tier
        if (rec.isDynamicSubRig) {
          rec.obj.updateMatrixWorld(true);
          const liveBox = new this.THREE.Box3().setFromObject(rec.obj);
          const yMin = liveBox.isEmpty() ? rec.restWorldMinY : liveBox.min.y;
          const yMax = liveBox.isEmpty() ? rec.restWorldMaxY : liveBox.max.y;
          const yCut = lerp(yMin - 0.05, yMax + 0.12, steppedCourseProgress(u, 8));
          this._enablePieceClipping(rec, yCut);
          return 0.0;
        }

        rec.obj.position.copy(rec.basePos);
        rec.obj.quaternion.copy(rec.baseQuat);
        rec.obj.scale.copy(rec.baseScale);
        const yCut = lerp(
          rec.restWorldMinY - 0.05,
          rec.restWorldMaxY + 0.12,
          steppedCourseProgress(u, 9)
        );
        this._enablePieceClipping(rec, yCut);
        return 0.0;
      }
    }
  }

  getTelemetry() {
    return this._lastTelemetry;
  }
}
