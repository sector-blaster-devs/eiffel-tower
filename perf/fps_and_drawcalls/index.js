/**
 * Unified Runtime FPS, Frame-Time & Draw-Call Optimizer (`perf/fps_and_drawcalls/index.js`)
 *
 * Cuts WebGL draw calls, shadow-pass overhead, CPU `Material.clone()` stalls, mid-flight shader
 * recompilation freezes, and per-frame scene-graph matrix traversals while preserving geometric,
 * kinematic, PnP, lighting, PBR, sketch/fog, visitor-DOM, and deterministic-capture invariants.
 */

import {
  mergeMeshesIntoTargetSpace,
  optimizeTowerMeshesAndZones,
  optimizeParisWorldMeshes,
} from './mesh_batch_optimizer.js';
import {
  sanitizeMaterialUserDataForFastClone,
  makeHeavyMaterialUserDataNonEnumerable,
  optimizeKinematicsEngine,
  unifySceneShaderPrograms,
  prewarmSceneShaders,
} from './kinematics_and_shader_optimizer.js';
import {
  cullDeepSubterraneanShadowCasters,
  freezeStaticSceneMatrices,
  installSmartShadowPolicy,
  installShadowAndMatrixOptimizations,
} from './shadow_and_matrix_optimizer.js';

/**
 * Installs all Stage 4 Shard B runtime FPS, draw-call, shadow, shader, and matrix optimizations.
 *
 * Recommended call site in `app.js`:
 *   Call once after `upgradeTowerMaterialsAndDecks` / `enforceZeroEmissiveAcrossScene` (and after
 *   `app` / `museumUi` are constructed if hooking `app.setRenderMode` & `app.enterDeterministicCapture`),
 *   BEFORE the initial `goToStop(0)` + Boot Frame 1 `renderer.render(scene, camera)` so even Boot
 *   Frame 1 benefits from unified shaders and static mesh batching!
 *
 * @param {object} options
 * @param {object} options.THREE - Three.js namespace
 * @param {object} [options.app] - Exhibition app handle (optional; attaches telemetry & render-mode/capture hooks)
 * @param {object} options.scene - `THREE.Scene`
 * @param {object} [options.camera] - `THREE.Camera`
 * @param {object} options.renderer - `THREE.WebGLRenderer`
 * @param {object} options.towerController - Initialized `TowerModelController`
 * @param {object} options.parisWorld - Initialized `createParis1889World` controller
 * @param {object} [options.atmosphere] - Initialized `createAtmosphereController`
 * @param {boolean} [options.isSoftwareWebGL=false] - Software WebGL flag
 * @param {'idle'|'immediate'|'manual'} [options.prewarmMode='idle'] - Off-frustum shader prewarm schedule
 * @param {boolean} [options.optimizeTriplanarTaps=true] - Weight-gate `<0.4%` triplanar planes
 */
export function installRuntimeFpsAndDrawCallOptimizations({
  THREE,
  app = null,
  scene,
  camera = null,
  renderer,
  towerController,
  parisWorld,
  atmosphere = null,
  isSoftwareWebGL = false,
  prewarmMode = 'idle',
  optimizeTriplanarTaps = true,
} = {}) {
  if (!THREE || !scene || !renderer || !towerController) {
    throw new Error(
      'installRuntimeFpsAndDrawCallOptimizations requires { THREE, scene, renderer, towerController }.'
    );
  }
  if (scene.__s4FpsAndDrawCallsState) {
    return scene.__s4FpsAndDrawCallsState;
  }

  const installStartMs = typeof performance !== 'undefined' ? performance.now() : 0;

  // 1. Eliminate `1,061–1,587 ms` `Material.clone()` JSON.stringify stall on `userData.pbrTrio`
  const userDataSanitizeStats = makeHeavyMaterialUserDataNonEnumerable({
    scene,
    towerController,
    parisWorld,
  });

  // 2. Unify scene GLSL shader programs (~60 -> ~16 WebGLPrograms) before any frame compiles
  const shaderUnifyStats = unifySceneShaderPrograms({
    THREE,
    scene,
    towerController,
    parisWorld,
    optimizeTriplanarTaps,
  });

  // 3. Cull deep subterranean caisson shadow casters (`max.y <= -6.6 m`) BEFORE zone batching
  const deepCaissonShadowStats = cullDeepSubterraneanShadowCasters({
    THREE,
    towerController,
    maxWorldY: -6.6,
  });

  // 4. Cull distant Paris shadow casters (`> 195 m`) & merge static Paris/Exposition meshes
  const parisBatchStats = optimizeParisWorldMeshes({
    THREE,
    parisWorld,
    shadowRadiusLimitM: 195.0,
  });

  // 5. Merge intra-piece static meshes + build Level-2 settled-zone batches (`zone1..zone5`)
  const towerBatchStats = optimizeTowerMeshesAndZones({
    THREE,
    towerController,
  });

  // 6. Share 1 clipped material per `(piece, origMaterial)` (`clipShadows = false`) + analytical flag wave
  const kinematicsOptStats = optimizeKinematicsEngine({
    THREE,
    towerController,
  });

  // 7. Offscreen `4x4` 1-triangle shader pre-warmer (zero mid-flight shader compilation stalls)
  let prewarmStats = null;
  let idlePrewarmScheduled = false;
  const ensureShadersPrewarmed = () => {
    if (prewarmStats) return prewarmStats;
    prewarmStats = prewarmSceneShaders({
      THREE,
      renderer,
      scene,
      camera,
      towerController,
      parisWorld,
    });
    return prewarmStats;
  };

  // 8. Track diagnostic render mode (`pbr | ink | xray | silhouette`) & install shadow + matrix policies
  let activeRenderMode = 'pbr';
  const shadowAndMatrix = installShadowAndMatrixOptimizations({
    THREE,
    renderer,
    scene,
    towerController,
    atmosphere,
    parisWorld,
    getRenderMode: () => activeRenderMode,
    isSoftwareWebGL,
    onFirstMainRender: () => {
      if (prewarmMode === 'idle' && !idlePrewarmScheduled && typeof setTimeout === 'function') {
        idlePrewarmScheduled = true;
        // Fire strictly AFTER Boot Frame 1 completes (so `sunLight.shadow.map` is allocated
        // and `app.ttflMs` is already recorded with zero prewarm tax!).
        setTimeout(() => {
          try {
            ensureShadersPrewarmed();
          } catch {
            // Non-fatal if context disposed during teardown
          }
        }, 25);
      }
    },
  });

  if (prewarmMode === 'immediate') {
    ensureShadersPrewarmed();
  }

  const installElapsedMs = Number(
    ((typeof performance !== 'undefined' ? performance.now() : 0) - installStartMs).toFixed(2)
  );

  const state = {
    installElapsedMs,
    userDataSanitizeStats,
    shaderUnifyStats,
    deepCaissonShadowStats,
    parisBatchStats,
    towerBatchStats: towerBatchStats
      ? {
          intraPieceMeshesRemoved: towerBatchStats.intraPieceMeshesRemoved,
          disposedLeafGeometries: towerBatchStats.disposedLeafGeometries,
          settledBatchesCount: towerBatchStats.settledBatchesCount,
          settledBatchesSummary: towerBatchStats.settledBatchesSummary,
        }
      : null,
    kinematicsOptStats,
    matrixStats: shadowAndMatrix.matrixStats,
    ensureShadersPrewarmed,
    forceShadowRefresh: () => shadowAndMatrix.shadowPolicy?.forceShadowRefresh?.(),
    getTelemetry: () => ({
      installElapsedMs,
      userDataSanitizeStats,
      shaderUnifyStats,
      deepCaissonShadowStats,
      parisBatchStats,
      towerBatchStats: towerBatchStats
        ? {
            intraPieceMeshesRemoved: towerBatchStats.intraPieceMeshesRemoved,
            disposedLeafGeometries: towerBatchStats.disposedLeafGeometries,
            settledBatchesCount: towerBatchStats.settledBatchesCount,
            settledBatchesSummary: towerBatchStats.settledBatchesSummary,
          }
        : null,
      kinematicsOptStats,
      matrixStats: shadowAndMatrix.matrixStats,
      shadowPolicy: shadowAndMatrix.shadowPolicy?.getTelemetry?.() || null,
      prewarmStats,
      webglProgramsCount: renderer.info?.programs?.length ?? 0,
    }),
  };

  // 9. Attach optional `app` hooks (`setRenderMode`, `enterDeterministicCapture`, telemetry)
  const attachAppHooks = (targetApp) => {
    if (!targetApp || targetApp.__s4FpsHooksAttached) return;
    targetApp.__s4FpsHooksAttached = true;

    if (typeof targetApp.setRenderMode === 'function') {
      const origSetRenderMode = targetApp.setRenderMode.bind(targetApp);
      targetApp.setRenderMode = (mode = 'pbr') => {
        activeRenderMode = String(mode || 'pbr');
        const nextMode = origSetRenderMode(mode);
        if (activeRenderMode === 'pbr') {
          // Re-sync any mid-span clipped piece materials cleanly when returning to PBR
          towerController.setStep(towerController.getStep());
        }
        shadowAndMatrix.shadowPolicy?.forceShadowRefresh?.();
        return nextMode;
      };
    }

    if (typeof targetApp.enterDeterministicCapture === 'function') {
      const origEnterDet = targetApp.enterDeterministicCapture.bind(targetApp);
      targetApp.enterDeterministicCapture = (opts = {}) => {
        ensureShadersPrewarmed();
        return origEnterDet(opts);
      };
    }

    targetApp.prewarmShadersNow = ensureShadersPrewarmed;
    targetApp.getStage4FpsTelemetry = state.getTelemetry;
  };

  if (app) {
    attachAppHooks(app);
  }
  state.attachAppHooks = attachAppHooks;

  scene.__s4FpsAndDrawCallsState = state;
  return state;
}
