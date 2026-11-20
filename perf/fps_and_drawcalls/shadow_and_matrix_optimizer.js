/**
 * Smart Shadow Policy, Deep Caisson Shadow Culling & Static Scene-Graph Matrix Optimizer
 * (`perf/fps_and_drawcalls/shadow_and_matrix_optimizer.js`)
 *
 * Eliminates redundant 4096×4096 / 1024×1024 shadow-map passes and per-frame world-matrix
 * traversals across static Paris 1889 and settled Eiffel Tower subtrees while preserving
 * shadow fidelity, PnP resting alignment, and mood/sun transitions:
 *
 *   1. **Lossless Deep-Subterranean Shadow Caster Culling (`max.y <= -6.6 m`)**:
 *      Disables `castShadow` on Tower foundation geometry strictly beneath the `y = -6.5 m`
 *      excavation pit floor (run BEFORE zone batching so underground caissons never bloat
 *      above-ground shadow-casting VBOs, while keeping open-pit Stop 02 `#13` shadows intact).
 *
 *   2. **Authoritative Smart Shadow Update Policy (`scene.onBeforeRender` Gatekeeper)**:
 *      - Suppresses redundant `atmosphere.requestShadowUpdate()` calls on `Stop 09 -> 10 -> 11 -> 12`
 *        and Free Orbit when `step === 11.0`, `sunLight` state, `cutaway`, `zoneVisMask`, and
 *        `renderMode` are unchanged (`0` wasted shadow passes across Hero Showcase & completed flights).
 *      - During continuous Beat-B construction flights (`step 0.55 -> 6.52 -> 11.0`), refreshes
 *        shadows at every calibrated PnP step (`0.55, 1.50, 3.55, 3.60, 4.85, 5.66, 6.52, 11.0`),
 *        every Paris Exposition step boundary (`1.15, 1.28, 1.32, 4.10, 7.50, 8.00, 8.50`),
 *        every `Δstep >= threshold` (`0.085` GPU / `0.11` software WebGL), and once on the exact
 *        settle frame whenever construction motion pauses.
 *
 *   3. **Static Scene-Graph Matrix Freezing (`matrixAutoUpdate = false` + `O(1)` Subtree Skip)**:
 *      - Freezes static leaf `Mesh`, `InstancedMesh`, `LineSegments`, and non-animated `Group`
 *        transforms across `parisWorld` (preserving `backfillGroups` `y`-rise at `step 1.15..1.32`)
 *        and `towerController` (preserving all 159 `piece.object3D` roots when active, articulated
 *        crane/elevator/summit sub-rigs, Edoux hydraulic rams/cables, and hoist rigging pool).
 *      - Dynamically freezes settled `piece.object3D` subtrees while their zone settled-batch
 *        is active (`step >= settleStep`) and unfreezes them before `setStep` whenever `step`
 *        drops below `settleStep`, cutting `matrixAutoUpdate` nodes at `step = 11.0` from ~1,200
 *        down to < 45!
 */

const CALIBRATED_PNP_STEPS = Object.freeze([0.55, 1.50, 3.55, 3.60, 4.85, 5.66, 6.52, 11.0]);
const PARIS_VISIBILITY_STEP_BOUNDARIES = Object.freeze([1.15, 1.28, 1.32, 4.10, 7.50, 8.00, 8.50]);

const DYNAMIC_TOWER_NODE_NAMES = new Set([
  'z4_fresnel_optic',
  'z4_robinson_anemometer',
  'z4_flag_tricolore_1889',
  'edoux_kinematic_wrapper',
  'edoux_cabine_superieure_Ca2',
  'edoux_cabine_inferieure_Ca1',
  'edoux_top_sheave_cables',
  'upper_shaft_climbing_rig',
  'upper_crane_boom_N',
  'upper_crane_boom_S',
  'upper_crane_hoist_N',
  'upper_crane_hoist_S',
  's2_active_hoist_rigging_pool',
]);

function isDynamicArticulatedTowerNode(obj) {
  if (!obj) return false;
  const name = obj.name || '';
  if (DYNAMIC_TOWER_NODE_NAMES.has(name)) return true;
  if (
    name.startsWith('cabin_carriage_pile_') ||
    name.startsWith('bogie_pile_') ||
    name.startsWith('cabin_body_pile_') ||
    name.startsWith('otis_cwt_pile_') ||
    name.startsWith('otis_chariot_pile_') ||
    name.startsWith('creeper_crane_carriage_pile_') ||
    name.startsWith('creeper_base_pile_') ||
    name.startsWith('creeper_slew_pile_') ||
    name.startsWith('creeper_slew_mesh_pile_')
  ) {
    return true;
  }
  return false;
}

function isNearCalibratedPnpStep(step, eps = 2.0e-3) {
  for (let i = 0; i < CALIBRATED_PNP_STEPS.length; i++) {
    if (Math.abs(step - CALIBRATED_PNP_STEPS[i]) <= eps) return true;
  }
  return false;
}

function crossedStepBoundary(prevStep, nextStep) {
  if (!Number.isFinite(prevStep) || !Number.isFinite(nextStep)) return true;
  const lo = Math.min(prevStep, nextStep);
  const hi = Math.max(prevStep, nextStep);
  if (hi - lo < 1e-6) return false;
  for (let i = 0; i < PARIS_VISIBILITY_STEP_BOUNDARIES.length; i++) {
    const b = PARIS_VISIBILITY_STEP_BOUNDARIES[i];
    if ((prevStep < b && nextStep >= b) || (prevStep >= b && nextStep < b)) {
      return true;
    }
  }
  return false;
}

/**
 * Disables `castShadow` on Tower meshes strictly below `maxWorldY` (`-6.6 m`, beneath the
 * `y = -6.5 m` caisson excavation pit floor). Call BEFORE `optimizeTowerMeshesAndZones`
 * so deep subterranean caisson chambers are batched separately from above-ground shadow casters.
 */
export function cullDeepSubterraneanShadowCasters({
  THREE,
  towerController,
  maxWorldY = -6.6,
} = {}) {
  if (!THREE || !towerController?.rootGroup) return { culledCount: 0 };

  const prevStep = towerController.getStep();
  towerController.setStep(11.0);
  towerController.rootGroup.updateMatrixWorld(true);

  const worldBox = new THREE.Box3();
  let culledCount = 0;

  towerController.rootGroup.traverse((obj) => {
    if (!obj.isMesh || obj.isInstancedMesh || !obj.castShadow || !obj.geometry) return;
    if (!obj.geometry.boundingBox) obj.geometry.computeBoundingBox();
    if (!obj.geometry.boundingBox || obj.geometry.boundingBox.isEmpty()) return;
    worldBox.copy(obj.geometry.boundingBox).applyMatrix4(obj.matrixWorld);
    if (worldBox.max.y <= maxWorldY) {
      obj.castShadow = false;
      culledCount += 1;
    }
  });

  if (Math.abs(prevStep - 11.0) > 1e-6) {
    towerController.setStep(prevStep);
  }
  return { culledCount };
}

/**
 * Freezes `matrixAutoUpdate` on static Paris 1889 and Eiffel Tower nodes and installs `O(1)`
 * subtree skipping on immutable world groups, settled zone batches, and settled pieces.
 */
export function freezeStaticSceneMatrices({ THREE, towerController, parisWorld } = {}) {
  if (!THREE) return null;

  const protoUpdateMatrixWorld = THREE.Object3D.prototype.updateMatrixWorld;
  function fastStaticSubtreeUpdateMatrixWorld(force) {
    if (force || this.matrixWorldNeedsUpdate) {
      return protoUpdateMatrixWorld.call(this, force);
    }
  }

  let parisNodesFrozen = 0;
  let towerNodesFrozen = 0;

  // 1. Freeze `parisWorld.group` static hierarchy (keeping `parvis_seine_iena` backfillGroups live)
  if (parisWorld?.group && !parisWorld.__s4MatricesFrozen) {
    const pRoot = parisWorld.group;
    pRoot.updateMatrixWorld(true);
    pRoot.matrixAutoUpdate = false;
    parisNodesFrozen += 1;

    const parvisGroup = pRoot.getObjectByName('parvis_seine_iena');
    const backfillDynamicGroups = new Set();
    if (parvisGroup) {
      // Backfill groups are unnamed direct Group children of `parvis_seine_iena`
      // (`pitGroups` are also direct Group children; keeping direct Group children of
      // `parvis_seine_iena` auto-updating costs only ~10 groups while guaranteeing backfill y-rise!)
      for (const ch of parvisGroup.children) {
        if (ch.isGroup) backfillDynamicGroups.add(ch);
      }
    }

    pRoot.traverse((obj) => {
      if (obj === pRoot) return;
      if (backfillDynamicGroups.has(obj)) {
        obj.matrixAutoUpdate = true;
        return;
      }
      if (obj.matrixAutoUpdate) {
        obj.matrixAutoUpdate = false;
        parisNodesFrozen += 1;
      }
    });

    // Install O(1) static-subtree skip on top-level immutable children of `parisWorld.group`
    for (const topChild of pRoot.children) {
      if (topChild === parvisGroup) continue;
      topChild.updateMatrixWorld = fastStaticSubtreeUpdateMatrixWorld;
    }

    parisWorld.__s4MatricesFrozen = true;
  }

  // 2. Freeze static leaf nodes & settled batches inside `towerController.rootGroup`
  if (towerController?.rootGroup && !towerController.__s4MatricesFrozen) {
    const tRoot = towerController.rootGroup;
    tRoot.updateMatrixWorld(true);
    tRoot.matrixAutoUpdate = false;
    towerNodesFrozen += 1;

    const pieceRoots = new Set();
    for (const p of towerController.pieces || []) {
      if (p?.object3D) pieceRoots.add(p.object3D);
    }

    const zoneGroups = new Set();
    for (const zRec of towerController.zones?.values?.() || []) {
      if (zRec?.group) {
        zoneGroups.add(zRec.group);
        if (zRec.group.matrixAutoUpdate) {
          zRec.group.matrixAutoUpdate = false;
          towerNodesFrozen += 1;
        }
      }
    }

    const hoistPool = tRoot.getObjectByName('s2_active_hoist_rigging_pool');
    const isInsideHoistPool = (obj) => {
      if (!hoistPool) return false;
      let cur = obj;
      while (cur) {
        if (cur === hoistPool) return true;
        cur = cur.parent;
      }
      return false;
    };

    tRoot.traverse((obj) => {
      if (obj === tRoot || zoneGroups.has(obj)) return;
      if (pieceRoots.has(obj)) return;
      if (isDynamicArticulatedTowerNode(obj)) return;
      if (obj.parent?.name === 'edoux_kinematic_wrapper' && obj.isMesh) return;
      if (isInsideHoistPool(obj)) return;

      if (obj.matrixAutoUpdate) {
        obj.matrixAutoUpdate = false;
        towerNodesFrozen += 1;
      }
      if (typeof obj.name === 'string' && obj.name.startsWith('__s4_settled_batch_')) {
        obj.updateMatrixWorld = fastStaticSubtreeUpdateMatrixWorld;
      }
    });

    // Dynamically freeze settled `piece.object3D` subtrees while their settledBatch is active,
    // and unfreeze them BEFORE `setStep` runs whenever `step < settleStep`!
    const settledBatches = towerController.__s4MeshBatchOptimizerState?.settledBatches || [];
    const syncFrozenPieceSubtrees = () => {
      for (let i = 0; i < settledBatches.length; i++) {
        const b = settledBatches[i];
        if (b.isActive && !b.__s4PiecesFrozen) {
          for (let k = 0; k < b.memberPieces.length; k++) {
            const pObj = b.memberPieces[k].object3D;
            if (!pObj) continue;
            pObj.matrixAutoUpdate = false;
            pObj.updateMatrixWorld = fastStaticSubtreeUpdateMatrixWorld;
          }
          b.__s4PiecesFrozen = true;
        } else if (!b.isActive && b.__s4PiecesFrozen) {
          for (let k = 0; k < b.memberPieces.length; k++) {
            const pObj = b.memberPieces[k].object3D;
            if (!pObj) continue;
            pObj.matrixAutoUpdate = true;
            if (pObj.updateMatrixWorld === fastStaticSubtreeUpdateMatrixWorld) {
              delete pObj.updateMatrixWorld;
            }
            protoUpdateMatrixWorld.call(pObj, true);
          }
          b.__s4PiecesFrozen = false;
        }
      }
    };

    // Apply initial freeze state (e.g. if currently at `step = 11.0`)
    syncFrozenPieceSubtrees();

    // Replace `rootGroup.updateMatrixWorld(true)` inside `setStep` with `force = false`
    // so unchanged subtrees skip cleanly while moved piece/rig subtrees set `force = true` locally!
    let insideSetStep = false;
    tRoot.updateMatrixWorld = function stage4TowerRootUpdateMatrixWorld(force) {
      const effectiveForce = insideSetStep ? false : Boolean(force);
      return protoUpdateMatrixWorld.call(this, effectiveForce);
    };

    const prevSetStep = towerController.setStep.bind(towerController);
    towerController.setStep = function stage4MatrixAwareSetStep(step) {
      const numeric = Number(step);
      const nextStep = Number.isFinite(numeric) ? Math.max(0, Math.min(11, numeric)) : 11.0;

      // Unfreeze any batch whose `settleStep` is above `nextStep` BEFORE kinematics mutates poses
      for (let i = 0; i < settledBatches.length; i++) {
        const b = settledBatches[i];
        if (b.__s4PiecesFrozen && nextStep < b.settleStep) {
          for (let k = 0; k < b.memberPieces.length; k++) {
            const pObj = b.memberPieces[k].object3D;
            if (!pObj) continue;
            pObj.matrixAutoUpdate = true;
            if (pObj.updateMatrixWorld === fastStaticSubtreeUpdateMatrixWorld) {
              delete pObj.updateMatrixWorld;
            }
          }
          b.__s4PiecesFrozen = false;
        }
      }

      insideSetStep = true;
      try {
        const res = prevSetStep(nextStep);
        syncFrozenPieceSubtrees();
        return res;
      } finally {
        insideSetStep = false;
      }
    };

    const prevSetCutaway = towerController.setPortalCutaway.bind(towerController);
    towerController.setPortalCutaway = function stage4MatrixAwareSetCutaway(photoId = null) {
      const res = prevSetCutaway(photoId);
      syncFrozenPieceSubtrees();
      return res;
    };

    towerController.__s4MatricesFrozen = true;
  }

  return {
    parisNodesFrozen,
    towerNodesFrozen,
  };
}

/**
 * Installs an authoritative `scene.onBeforeRender` shadow-pass gatekeeper so `shadowMap.render`
 * runs ONLY when physical shadow casters or sun light actually changed significantly (or settled).
 */
export function installSmartShadowPolicy({
  renderer,
  scene,
  towerController,
  atmosphere,
  parisWorld = null,
  getRenderMode = null,
  isSoftwareWebGL = false,
  onFirstMainRender = null,
} = {}) {
  if (!renderer || !scene || !towerController) return null;
  if (scene.__s4SmartShadowPolicyState) return scene.__s4SmartShadowPolicyState;

  const stepDeltaThreshold = isSoftwareWebGL ? 0.11 : 0.085;
  const sunLight = atmosphere?.sunLight || scene.getObjectByName('atmo_sun_light') || null;

  let hasRenderedInitialShadow = false;
  let forceNextShadowPass = true;
  let pendingMotionSettleShadow = false;
  let lastRenderedStep = NaN;
  let prevFrameStep = towerController.getStep();
  let lastCutaway = towerController.getPortalCutaway();
  let lastVisMask = -1;
  let lastRenderMode = typeof getRenderMode === 'function' ? getRenderMode() : 'pbr';
  const lastSunState = { x: NaN, y: NaN, z: NaN, intensity: NaN, visible: true };

  let shadowPassesExecuted = 0;
  let shadowPassesSuppressed = 0;
  let lastReason = 'init';

  const computeVisMask = () => {
    let mask = 0;
    let bit = 1;
    if (towerController.rootGroup?.visible) mask |= bit;
    bit <<= 1;
    if (parisWorld?.group?.visible) mask |= bit;
    bit <<= 1;
    for (const zRec of towerController.zones?.values?.() || []) {
      if (zRec?.group?.visible) mask |= bit;
      bit <<= 1;
    }
    return mask;
  };

  const didSunStateChange = () => {
    if (!sunLight) return false;
    const dx = Math.abs(sunLight.position.x - lastSunState.x);
    const dy = Math.abs(sunLight.position.y - lastSunState.y);
    const dz = Math.abs(sunLight.position.z - lastSunState.z);
    const di = Math.abs(sunLight.intensity - lastSunState.intensity);
    if (
      !Number.isFinite(dx) ||
      dx > 0.02 ||
      dy > 0.02 ||
      dz > 0.02 ||
      di > 0.005 ||
      Boolean(sunLight.visible) !== lastSunState.visible
    ) {
      return true;
    }
    return false;
  };

  const recordRenderedShadowState = (step, cutaway, visMask, renderMode) => {
    hasRenderedInitialShadow = true;
    forceNextShadowPass = false;
    pendingMotionSettleShadow = false;
    lastRenderedStep = step;
    lastCutaway = cutaway;
    lastVisMask = visMask;
    lastRenderMode = renderMode;
    if (sunLight) {
      lastSunState.x = sunLight.position.x;
      lastSunState.y = sunLight.position.y;
      lastSunState.z = sunLight.position.z;
      lastSunState.intensity = sunLight.intensity;
      lastSunState.visible = Boolean(sunLight.visible);
    }
  };

  // Override `towerController._markShadowsDirty` so `stage2TowerSceneBeforeRender` doesn't
  // blindly force `shadowMap.needsUpdate = true` when a caller explicitly cleared it, while still
  // flagging `pendingMotionSettleShadow` when construction step changes.
  towerController._markShadowsDirty = function stage4MarkShadowsDirty() {
    this._shadowsDirty = false;
    if (Math.abs(this.step - lastRenderedStep) > 1e-5) {
      pendingMotionSettleShadow = true;
    }
    if (this.renderer?.shadowMap) {
      this.renderer.shadowMap.needsUpdate = true;
    }
    if (this.onShadowInvalidate) {
      this.onShadowInvalidate(this.step);
    }
  };

  const prevSceneBeforeRender = scene.onBeforeRender;
  scene.onBeforeRender = function stage4SmartShadowBeforeRender(
    activeRenderer,
    activeScene,
    activeCamera,
    renderTarget
  ) {
    if (typeof prevSceneBeforeRender === 'function') {
      prevSceneBeforeRender.call(this, activeRenderer, activeScene, activeCamera, renderTarget);
    }

    // Never interfere with offscreen render targets (e.g. PMREM / skyCube / 4x4 shader prewarm)
    if (scene.__s4InOffscreenPrewarm || (renderTarget !== null && renderTarget !== undefined)) {
      return;
    }
    const sm = activeRenderer?.shadowMap;
    if (!sm || !sm.enabled) return;

    const wasInitialRender = !hasRenderedInitialShadow;
    const shadowMapMissing = Boolean(sunLight?.castShadow && !sunLight.shadow?.map);
    const step = towerController.getStep();
    const cutaway = towerController.getPortalCutaway();
    const visMask = computeVisMask();
    const renderMode = typeof getRenderMode === 'function' ? getRenderMode() : 'pbr';
    const stepMovedThisFrame = Math.abs(step - prevFrameStep) > 1e-6;
    prevFrameStep = step;

    // If caller explicitly set `renderer.shadowMap.needsUpdate = false` AND the shadow map
    // already exists AND we don't have an automatic motion-settle refresh due, honor `needsUpdate = false`.
    const wantsAutoSettle =
      pendingMotionSettleShadow && !stepMovedThisFrame && Math.abs(step - lastRenderedStep) > 1e-4;

    if (!sm.needsUpdate && !forceNextShadowPass && !shadowMapMissing && !wantsAutoSettle) {
      return;
    }

    const stepDelta = Number.isFinite(lastRenderedStep) ? Math.abs(step - lastRenderedStep) : Infinity;
    let shouldRenderShadow = false;
    let reason = '';

    if (!hasRenderedInitialShadow || forceNextShadowPass || shadowMapMissing) {
      shouldRenderShadow = true;
      reason = 'initial_or_forced';
    } else if (didSunStateChange()) {
      shouldRenderShadow = true;
      reason = 'sun_or_mood_changed';
    } else if (cutaway !== lastCutaway) {
      shouldRenderShadow = true;
      reason = 'cutaway_changed';
    } else if (visMask !== lastVisMask) {
      shouldRenderShadow = true;
      reason = 'visibility_changed';
    } else if (renderMode !== lastRenderMode) {
      shouldRenderShadow = true;
      reason = 'render_mode_changed';
    } else if (stepDelta > 1e-5 && isNearCalibratedPnpStep(step)) {
      shouldRenderShadow = true;
      reason = 'calibrated_pnp_step';
    } else if (crossedStepBoundary(lastRenderedStep, step)) {
      shouldRenderShadow = true;
      reason = 'paris_step_boundary';
    } else if (stepDelta >= stepDeltaThreshold) {
      shouldRenderShadow = true;
      reason = 'step_delta_threshold';
    } else if (wantsAutoSettle) {
      shouldRenderShadow = true;
      reason = 'motion_settled';
    }

    if (shouldRenderShadow) {
      sm.needsUpdate = true;
      shadowPassesExecuted += 1;
      lastReason = reason;
      recordRenderedShadowState(step, cutaway, visMask, renderMode);
      if (wasInitialRender && typeof onFirstMainRender === 'function') {
        onFirstMainRender();
      }
    } else {
      sm.needsUpdate = false;
      shadowPassesSuppressed += 1;
    }
  };

  const state = {
    forceShadowRefresh: () => {
      forceNextShadowPass = true;
      if (renderer.shadowMap) renderer.shadowMap.needsUpdate = true;
    },
    getTelemetry: () => ({
      shadowPassesExecuted,
      shadowPassesSuppressed,
      suppressionRatio:
        shadowPassesExecuted + shadowPassesSuppressed > 0
          ? Number(
              (
                shadowPassesSuppressed /
                (shadowPassesExecuted + shadowPassesSuppressed)
              ).toFixed(4)
            )
          : 0,
      lastRenderedStep,
      lastReason,
      stepDeltaThreshold,
    }),
  };

  scene.__s4SmartShadowPolicyState = state;
  return state;
}

export function installShadowAndMatrixOptimizations({
  THREE,
  renderer,
  scene,
  towerController,
  atmosphere,
  parisWorld,
  getRenderMode = null,
  isSoftwareWebGL = false,
  onFirstMainRender = null,
} = {}) {
  const matrixStats = freezeStaticSceneMatrices({
    THREE,
    towerController,
    parisWorld,
  });
  const shadowPolicy = installSmartShadowPolicy({
    renderer,
    scene,
    towerController,
    atmosphere,
    parisWorld,
    getRenderMode,
    isSoftwareWebGL,
    onFirstMainRender,
  });
  return {
    matrixStats,
    shadowPolicy,
  };
}
