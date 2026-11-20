/**
 * Eiffel Tower 1889 Museum Edition — Main Exhibit Runtime (`app.js`)
 *
 * Integrates the Museum Exhibition UI, 3D Lighting/PBR/Sketch/Physics overhaul,
 * and Zero-Jump Optical Camera Choreography:
 *   1. Zero-Jump Optical Camera Choreography (`0.000 px` onset/lock continuity, helical `CatmullRomCurve3`
 *      4-pier obstacle-avoiding paths, Tower-anchored focal gaze, `C¹` Hermite interruption, rising-front
 *      drag-to-orbit release)
 *   2. Strict 6-Layer Tower-Focused Viewport & Look Constraints + Polished Stop 12 Hero 3D Model Showcase
 *      with responsive desktop/mobile framing and deterministic turntable/craftsmanship sway
 */

import { bootPipeline } from './startup_orchestrator.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { TowerModelController } from './model/tower_controller.js';
import { applyStage2BuildPacing } from './model/walkthrough_pacing.js';
import {
  hydrateTowerPbrBank,
  upgradeTowerMaterialsAndDecks,
  createOverrideMaterials,
  applyRenderModeToGroup,
} from './model/materials.js';
import {
  hydrateFloorTextureBank,
  upgradeWorldFloorAndSurfaceMaterials,
} from './model/floor_textures.js';
import {
  createAtmosphereController,
  enforceZeroEmissiveAcrossScene,
  auditZeroEmissive as auditSceneEmissive,
} from './world/atmosphere.js';
import { createParis1889World } from './world/paris_1889.js';
import { PhotoPortalSystem } from './portals/photo_portals.js';
import {
  createViewportConstraints,
  installStage3CameraChoreography,
} from './camera/index.js';

import {
  createMuseumPlacard,
  LEGACY_CHAPTER_TO_STOP_MAP,
} from './story_and_archive/index.js';

import * as themeDebugMod from './ui/theme_and_debug_index.js';
import {
  mountExhibitionThemeAndDebug,
  HERO_FINALE_CAMERA,
  auditVisitorDomCompliance,
  auditStage5NeutralUiCompliance,
} from './ui/theme_and_debug_index.js';
import { installRuntimeFpsAndDrawCallOptimizations } from './perf/fps_and_drawcalls/index.js';

const BOOT_START_MS = typeof performance !== 'undefined' ? performance.now() : 0;

function detectStartInLanding() {
  if (typeof themeDebugMod.shouldStartInLandingMode === 'function') {
    return Boolean(themeDebugMod.shouldStartInLandingMode());
  }
  if (typeof window === 'undefined' || !window.location) return true;
  const raw = window.location.search || '';
  if (!raw) return true;
  try {
    const params = new URLSearchParams(raw);
    const falsy = (v) => ['0', 'false', 'no'].includes(String(v || '').trim().toLowerCase());
    const truthy = (v) => ['1', 'true', 'yes'].includes(String(v || '').trim().toLowerCase());
    if (params.has('intro') && falsy(params.get('intro'))) return false;
    if (params.has('skipIntro') && truthy(params.get('skipIntro'))) return false;
    if (params.has('stop') && String(params.get('stop') || '').trim() !== '') return false;
    if (params.has('photo') && String(params.get('photo') || '').trim() !== '') return false;
    if (params.has('chapter') && String(params.get('chapter') || '').trim() !== '') return false;
    if (truthy(params.get('autoplay'))) return false;
    if (truthy(params.get('record'))) return false;
    if (truthy(params.get('deterministic'))) return false;
    if (truthy(params.get('debug'))) return false;
  } catch {
    return true;
  }
  return true;
}

function detectInitialLang() {
  if (typeof window === 'undefined') return 'en';
  const params = new URLSearchParams(window.location.search);
  const q = params.get('lang');
  if (q && q.toLowerCase().startsWith('fr')) return 'fr';
  return 'en';
}

function probeSoftwareWebGL() {
  if (typeof document === 'undefined') return false;
  try {
    const probeCanvas = document.createElement('canvas');
    probeCanvas.width = 1;
    probeCanvas.height = 1;
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return false;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const name = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '') : '';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /swiftshader|llvmpipe|software/i.test(name);
  } catch {
    return false;
  }
}

async function initMuseumExhibition() {
  const initialLang = detectInitialLang();
  document.documentElement.lang = initialLang;

  const canvas = document.getElementById('world-canvas');
  const overlayRoot = document.getElementById('portal-overlay-root');
  const uiRoot = document.getElementById('museum-ui-root');
  const bootVeil = document.getElementById('boot-veil');
  const brandSubEl = document.getElementById('brand-plaque-sub');

  const syncBrandPlaqueLang = (lang) => {
    if (!brandSubEl) return;
    brandSubEl.textContent =
      lang === 'fr' ? 'Exposition d’archives 1887–1889' : '1887–1889 Archival Exhibition';
  };
  syncBrandPlaqueLang(initialLang);

  // 1. WebGLRenderer & Scene Setup
  const bootProfile = {
    bootStartFromTimeOriginMs: Number(BOOT_START_MS.toFixed(2)),
    rendererSetupMs: 0,
    atmosphereInitMs: 0,
    workerCatalogWaitMs: 0,
    pbrHydrateMs: 0,
    parisWorldBuildMs: 0,
    towerBuildMs: 0,
    surfaceUpgradeMs: 0,
    s4PerfInstallMs: 0,
    portalInitMs: 0,
    uiMountMs: 0,
    stop01LockMs: 0,
    firstRenderShaderCompileMs: 0,
    ttflMs: 0,
    totalFromNavigationStartMs: 0,
    orchestrator: bootPipeline?.timings || null,
  };
  let tPhase = performance.now();

  const isSoftwareWebGL = probeSoftwareWebGL();
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isSoftwareWebGL,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: isSoftwareWebGL,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSoftwareWebGL ? 1.0 : 2.0));
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    HERO_FINALE_CAMERA.fov,
    Math.max(1, window.innerWidth) / Math.max(1, window.innerHeight),
    0.5,
    4500.0
  );
  camera.position.set(...HERO_FINALE_CAMERA.position);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.065;
  controls.rotateSpeed = 0.62;
  controls.zoomSpeed = 0.82;
  controls.panSpeed = 0.58;
  controls.screenSpacePanning = false;
  controls.target.set(...HERO_FINALE_CAMERA.target);
  controls.update();

  let customPoseUnconstrained = false;
  canvas.addEventListener('pointerdown', () => { customPoseUnconstrained = false; }, { passive: true });
  canvas.addEventListener('wheel', () => { customPoseUnconstrained = false; }, { passive: true });
  canvas.addEventListener('touchstart', () => { customPoseUnconstrained = false; }, { passive: true });

  const viewportConstraints = createViewportConstraints({ THREE, camera, controls });
  bootProfile.rendererSetupMs = Number((performance.now() - tPhase).toFixed(2));
  tPhase = performance.now();

  // 2. Real Physical Lighting Rig, Monochrome Sketch+Mist 1889 Paris & Hero PBR/Kinematics Tower
  const atmosphere = createAtmosphereController({
    THREE,
    scene,
    renderer,
    isSoftwareWebGL,
  });
  bootProfile.atmosphereInitMs = Number((performance.now() - tPhase).toFixed(2));
  tPhase = performance.now();

  // Join background PBR worker buffers & pre-fetched JSON catalogs launched at t ~ 0 ms
  const [pbrRaw, catalogs] = bootPipeline
    ? await Promise.all([bootPipeline.pbrRawPromise, bootPipeline.catalogsPromise])
    : [null, null];
  bootProfile.workerCatalogWaitMs = Number((performance.now() - tPhase).toFixed(2));
  tPhase = performance.now();

  if (pbrRaw) {
    hydrateFloorTextureBank(THREE, pbrRaw.floor, 8);
    hydrateTowerPbrBank(THREE, pbrRaw.tower, 8);
  }
  bootProfile.pbrHydrateMs = Number((performance.now() - tPhase).toFixed(2));
  tPhase = performance.now();

  const parisWorld = createParis1889World({
    THREE,
    scene,
    skipOverwrittenFloorMaps: true,
    rawWorldMaps: pbrRaw?.world || null,
  });
  bootProfile.parisWorldBuildMs = Number((performance.now() - tPhase).toFixed(2));

  // Couple mood switches across world distance fog and directional lighting/fog
  let appRef = null;
  let deterministicMode = false;
  const rawAtmoSetMood = atmosphere.setMood.bind(atmosphere);
  atmosphere.setMood = (mood, opts) => {
    const explicitNonImmediate =
      opts === false || (opts && typeof opts === 'object' && (opts.immediate === false || opts.animate === true));
    const useImmediate = !explicitNonImmediate;
    parisWorld.setMood?.(mood);
    const next = rawAtmoSetMood(mood, useImmediate ? { immediate: true } : opts);
    if (deterministicMode) {
      renderer.render(scene, camera);
    } else {
      appRef?.requestFrame?.(useImmediate ? 2 : 6);
    }
    return next;
  };
  atmosphere.setMood('day', { immediate: true });

  tPhase = performance.now();
  const towerController = new TowerModelController({
    THREE,
    scene,
    renderer,
  });
  await towerController.init();
  bootProfile.towerBuildMs = Number((performance.now() - tPhase).toFixed(2));
  tPhase = performance.now();

  // Upgrade all floor/ground/water surfaces & Tower oak decks/cabins/plaques, then enforce 0 emissive
  upgradeWorldFloorAndSurfaceMaterials(parisWorld, THREE);
  upgradeTowerMaterialsAndDecks(towerController, THREE, towerController.materials);
  enforceZeroEmissiveAcrossScene(scene);
  bootProfile.surfaceUpgradeMs = Number((performance.now() - tPhase).toFixed(2));
  tPhase = performance.now();

  // Stage 4 Shard B: Static mesh & zone batching, shader unification, non-enumerable pbrTrio,
  // smart shadow policy, frozen static matrices & post-Frame-1 idle shader prewarmer
  const s4PerfState = installRuntimeFpsAndDrawCallOptimizations({
    THREE,
    scene,
    camera,
    renderer,
    towerController,
    parisWorld,
    atmosphere,
    isSoftwareWebGL,
    prewarmMode: 'idle',
  });
  atmosphere.requestShadowUpdate();
  bootProfile.s4PerfInstallMs = Number((performance.now() - tPhase).toFixed(2));
  tPhase = performance.now();

  towerController.setEdgesVisible = (visible) => {
    parisWorld.setEdgesVisible(visible);
  };

  // 3. Calibrated PnP Optical Portal System (0 frustum fetches in visitor mode; pre-decoded Stop 01 plate)
  const portalSystem = new PhotoPortalSystem({
    THREE,
    scene,
    camera,
    controls,
    domOverlayContainer: overlayRoot,
    domCanvas: canvas,
    photoCamerasUrl: './data/catalog/photo_cameras_3d.json',
    assetPrefix: './',
    lang: initialLang,
    allowCanvasDragExit: true,
    viewportConstraints,
    towerController,
    preloadedCatalog: catalogs?.photoCameras || null,
    preloadedImagePromises: bootPipeline
      ? {
          '55': bootPipeline.stop01ImagePromise,
          '13': bootPipeline.stop02ImagePromise,
        }
      : null,
  });
  await portalSystem.init();
  portalSystem.setPortalsVisible(false);
  bootProfile.portalInitMs = Number((performance.now() - tPhase).toFixed(2));
  tPhase = performance.now();

  // Diagnostic Render-Mode Overrides (`pbr | ink | xray | silhouette` — zero-emissive MeshStandardMaterial)
  let renderModeOverrides = null;
  let currentRenderMode = 'pbr';
  let lastShadowStep = -999;

  const syncStepAcrossScene = (numericStep) => {
    if (!Number.isFinite(numericStep)) return;
    towerController.setStep(numericStep);
    parisWorld.setStep(numericStep);
    portalSystem.setActiveStep(numericStep);
    atmosphere.setStep?.(numericStep);
    const shadowDelta = isSoftwareWebGL ? 0.08 : 0.015;
    if (Math.abs(numericStep - lastShadowStep) >= shadowDelta) {
      lastShadowStep = numericStep;
      atmosphere.requestShadowUpdate();
    }
    appRef?.requestFrame?.();
  };

  // 4. Museum Exhibition UI: Story Placard + Unified Walkthrough + Debug Drawer
  let museumUi = null;
  let activeHeroPresetId = 'overview';

  const placard = createMuseumPlacard(uiRoot, {
    lang: initialLang,
    initialStopIndex: 1,
    topSafePx: 68,
    bottomSafePx: 94,
    onSelectHeroPreset: (preset) => {
      if (!preset) return;
      museumUi?.walkthrough?.pause?.();
      activeHeroPresetId = preset.presetId || preset.id || 'overview';
      const isPortraitOverview =
        activeHeroPresetId === 'overview' &&
        window.innerWidth / Math.max(1, window.innerHeight) < 0.75;
      app.setCameraPose({
        position: isPortraitOverview ? [262, 62, 480] : preset.position,
        target: isPortraitOverview ? [0, 88, 0] : preset.target,
        fov: isPortraitOverview ? 54 : preset.fov || preset.fovYDeg || 42,
        duration: 1.15,
        immediate: false,
      });
    },
  });

  let readyResolve = null;
  const readyPromise = new Promise((resolve) => {
    readyResolve = resolve;
  });

  const app = {
    ttflMs: null,
    bootProfile,
    scene,
    camera,
    controls,
    renderer,
    towerController,
    parisWorld,
    atmosphere,
    portalSystem,
    viewportConstraints,
    placard,
    museumUi: null,

    whenReady: () => readyPromise,

    requestFrame: () => {},

    setStep: (step, { skipChapterSync = false } = {}) => {
      const clamped = Math.max(0, Math.min(11, Number(step) || 0));
      syncStepAcrossScene(clamped);
      if (!skipChapterSync && museumUi?.walkthrough && !museumUi.walkthrough.isPlaying()) {
        museumUi.walkthrough._step = clamped;
      }
      return clamped;
    },

    getStep: () => towerController.getStep(),

    setChapter: async (chapterOrStopId, { immediate = false } = {}) => {
      const key = String(chapterOrStopId || '').trim();
      const mappedOneBased = LEGACY_CHAPTER_TO_STOP_MAP[key];
      if (mappedOneBased !== undefined) {
        return museumUi.walkthrough.goToStop(mappedOneBased - 1, {
          immediate,
          reason: 'legacy_chapter',
        });
      }
      return museumUi.walkthrough.goToStop(key, { immediate, reason: 'set_chapter' });
    },

    goToStop: (stopIndexOrId, opts = {}) => museumUi.walkthrough.goToStop(stopIndexOrId, opts),

    startExplore: async ({ immediate = false } = {}) => {
      museumUi?.exitLandingMode?.();
      return app.goToStop(0, { immediate: Boolean(immediate), reason: 'explore' });
    },

    enterLandingMode: async ({ immediate = true } = {}) => {
      museumUi?.walkthrough?.pause?.();
      app.setStep(11.0, { skipChapterSync: false });
      const vw = typeof window !== 'undefined' ? window.innerWidth : 1440;
      const vh = typeof window !== 'undefined' ? window.innerHeight : 900;
      const pose = app.heroFinaleRig?.activatePreset
        ? app.heroFinaleRig.activatePreset('overview', vw, vh)
        : {
            position: vw / Math.max(1, vh) < 0.80 ? [250, 58, 480] : [...HERO_FINALE_CAMERA.position],
            target: vw / Math.max(1, vh) < 0.80 ? [0, 82, 0] : [...HERO_FINALE_CAMERA.target],
            fov: vw / Math.max(1, vh) < 0.80 ? 56 : HERO_FINALE_CAMERA.fov,
          };
      await app.setCameraPose({
        position: pose.position,
        target: pose.target,
        fov: pose.fov,
        immediate: Boolean(immediate),
      });
      museumUi?.enterLandingMode?.();
      app.requestFrame?.(3);
    },

    exitLandingMode: () => museumUi?.exitLandingMode?.(),
    isLandingMode: () => Boolean(museumUi?.isLandingMode?.()),

    enterPortal: async (photoId, opts = {}) => {
      const id = String(photoId || '').replace(/^#/, '').padStart(2, '0');
      app.heroFinaleRig?.deactivate?.();
      const portal = await portalSystem.enterPortal(id, {
        immediate: Boolean(opts.immediate),
        blend: opts.blend !== undefined ? Number(opts.blend) : 1.0,
        duration: opts.duration,
        skipStepCallback: opts.skipStepCallback !== false,
      });
      portalSystem.syncPortalCutaway();
      const rect = portalSystem.getOverlayRect();
      placard.updatePlateRect(rect);
      return portal;
    },

    exitPortal: async (opts = {}) => {
      portalSystem.exitPortal(opts);
      portalSystem.syncPortalCutaway();
      if (opts?.immediate) {
        viewportConstraints.enforce();
      }
    },

    setCameraPose: async ({
      position,
      target,
      fov = 42,
      duration = 1.35,
      immediate = false,
      unconstrained = false,
    } = {}) => {
      customPoseUnconstrained = Boolean(unconstrained);
      await portalSystem.flyToFreeCamera({
        position,
        target,
        fov,
        duration,
        immediate,
      });
      portalSystem.syncPortalCutaway();
      if (!customPoseUnconstrained) {
        viewportConstraints.enforce();
      }
      if (immediate && controls) {
        const prevDamp = controls.enableDamping;
        controls.enableDamping = false;
        controls.update();
        controls.enableDamping = prevDamp;
      }
    },

    flyToCameraPose: async ({ position, target, fov = 42, durationMs = 1100 } = {}) => {
      return app.setCameraPose({
        position,
        target,
        fov,
        duration: Math.max(0.25, Number(durationMs) / 1000),
        immediate: false,
      });
    },

    setBlend: (alpha) => portalSystem.setBlend(alpha),
    getBlend: () => portalSystem.getBlend(),
    setWipe: (splitU) => portalSystem.setWipe(splitU),
    getWipe: () => portalSystem.getWipe(),

    setLanguage: (lang) => {
      const next = museumUi.header.setLanguage(lang, { emit: true });
      syncBrandPlaqueLang(next);
      portalSystem.setLanguage(next);
      return next;
    },
    getLanguage: () => museumUi.walkthrough.getLanguage(),

    setMood: (mood, opts = {}) => {
      const next = atmosphere.setMood(mood, opts);
      atmosphere.requestShadowUpdate();
      app.requestFrame();
      return next;
    },
    getMood: () => atmosphere.getMood(),

    setZenMode: (active) => museumUi.header.setPureView(Boolean(active), { emit: true }),
    getZenMode: () => museumUi.header.getPureView(),

    setPlaybackSpeed: (mult) => museumUi.walkthrough.setSpeedMultiplier(mult),
    startConstructionPlay: () => museumUi.walkthrough.play(),
    stopConstructionPlay: () => museumUi.walkthrough.pause(),

    getActivePortalId: () => portalSystem.getActivePortalId(),
    getPinnedPortalId: () => portalSystem.getPinnedPortalId(),

    getCameraViewOffset: () => {
      const v = camera.view;
      return v && v.enabled
        ? {
            enabled: true,
            fullWidth: v.fullWidth,
            fullHeight: v.fullHeight,
            offsetX: v.offsetX,
            offsetY: v.offsetY,
            width: v.width,
            height: v.height,
          }
        : { enabled: false };
    },

    setRenderMode: (mode = 'pbr') => {
      currentRenderMode = mode;
      if (!renderModeOverrides && mode !== 'pbr') {
        renderModeOverrides = createOverrideMaterials(THREE);
      }
      applyRenderModeToGroup(towerController.rootGroup, mode, renderModeOverrides);
      atmosphere.requestShadowUpdate();
      if (deterministicMode) {
        renderer.render(scene, camera);
      } else {
        app.requestFrame();
      }
      return currentRenderMode;
    },

    verifyPortalProjection: (photoId) => portalSystem.verifyPortalProjection(photoId),
    verifyAllPortalsProjection: () => portalSystem.verifyAllPortalsProjection(),

    getMetrics: () => ({
      ttflMs: app.ttflMs,
      bootProfile: app.bootProfile,
      step: towerController.getStep(),
      mood: atmosphere.getMood(),
      renderMode: currentRenderMode,
      activePortalId: portalSystem.getActivePortalId(),
      playthrough: museumUi?.walkthrough?.getPlaythroughState?.() || null,
      constraints: viewportConstraints.getFlags(),
      tower: towerController.getMetrics(),
      world: parisWorld.getMetrics?.() || null,
      s4Fps: app.getStage4FpsTelemetry?.() || null,
      renderer: {
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        textures: renderer.info.memory.textures,
        geometries: renderer.info.memory.geometries,
        programs: renderer.info.programs?.length ?? 0,
      },
    }),

    auditVisitorCompliance: () => auditVisitorDomCompliance(document.body),
    auditStage5NeutralUi: () => auditStage5NeutralUiCompliance(document),
    auditStage6Ui: () =>
      museumUi?.auditStage6Ui?.() || themeDebugMod.auditStage6UiCompliance?.(document) || null,
    auditZeroEmissive: () => auditSceneEmissive(scene),
    auditWorldSketchAndFog: () => parisWorld.audit?.() || null,
    getKinematicsTelemetry: () => towerController.getKinematicsTelemetry(),
  };
  appRef = app;

  const startInLanding = detectStartInLanding();

  museumUi = mountExhibitionThemeAndDebug({
    document,
    uiRoot,
    debugMountPoint: document.body,
    lang: initialLang,
    initialStopIndex: 0,
    startInLanding,
    onExploreStart: () => {
      app.startExplore({ immediate: false });
    },
    placard,
    app,
    portalSystem,
    towerController,
    atmosphere,
    lightingRig: atmosphere,
    parisWorld,
    scene,
    camera,
    controls,
    renderer,
    // Omit raw canvas pointerdown hook so single 0-px clicks on dark plinth don't fade out the plate;
    // intentional >6px orbit drags release cleanly via portalSystem.onExitPortal below.
    canvas: null,
    assetBasePath: './',
    onLanguageChange: (nextLang) => {
      syncBrandPlaqueLang(nextLang);
      portalSystem.setLanguage(nextLang);
    },
    onStopChange: ({ stopIndex, stopNumber, stop }) => {
      if (!stop?.photoId) {
        activeHeroPresetId = 'overview';
      }
      portalSystem.syncPortalCutaway();
      lastShadowStep = towerController.getStep();
      atmosphere.requestShadowUpdate();
      const overlayRect = portalSystem.getOverlayRect();
      placard.setStop(stopNumber || stop?.stopId, {
        stop,
        plateRect: overlayRect,
        is3DRevealed: false,
      });
      // Prefetch upcoming glass plate in idle background once first frame has painted
      const stops = museumUi.walkthrough.getStops();
      const nextStop = stops[(stopIndex + 1) % Math.max(1, stops.length)];
      if (app.ttflMs !== null && nextStop?.photoId) {
        portalSystem.prefetchPortal(nextStop.photoId);
      }
    },
    onReveal3DChange: ({ isRevealing3D, stop, photoId }) => {
      // If visitor orbited freely in 3D (`activePortalId === null`) and clicks `Show Plate`,
      // glide smoothly back into the calibrated optical lock!
      const targetPhotoId = photoId || stop?.photoId;
      if (!isRevealing3D && targetPhotoId && !portalSystem.getActivePortalId()) {
        app.enterPortal(targetPhotoId, {
          immediate: false,
          blend: 1.0,
          duration: 0.85,
          skipStepCallback: true,
        });
      }
    },
    onHeroFinaleActivate: ({ presetId }) => {
      activeHeroPresetId = presetId || 'overview';
    },
  });
  museumUi.debugDrawer.attachSystems({ canvas });
  applyStage2BuildPacing(museumUi.walkthrough, {
    debugDrawer: museumUi.debugDrawer,
  });
  const cameraChoreography = installStage3CameraChoreography({
    THREE,
    app,
    camera,
    controls,
    canvas,
    portalSystem,
    viewportConstraints,
    walkthrough: museumUi.walkthrough,
    placard,
  });
  app.museumUi = museumUi;

  // Release plate cleanly ONLY on intentional >6px 3D drag (`orbit-drag`), never on stray 0-px click
  portalSystem.onExitPortal = ({ reason }) => {
    if (reason === 'orbit-drag') {
      museumUi.walkthrough.notifyCanvasDragStart();
      placard.set3DRevealState(true);
    }
  };

  // Resize handling keeps PnP rising-front framing, Stop 11 responsive showcase & negative-space placard synced
  // and immediately repaints WebGL backbuffer so paused software-WebGL resizes never blank to #141413
  const onResize = () => {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSoftwareWebGL ? 1.0 : 2.0));
    renderer.setSize(w, h, false);
    if (!portalSystem.getActivePortalId() && !portalSystem.isFlying()) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    cameraChoreography.onResize(w, h);
    portalSystem.onResize(w, h);
    const rect = portalSystem.getOverlayRect();
    placard.updatePlateRect(rect);
    if (!deterministicMode) {
      renderer.render(scene, camera);
    }
    app.requestFrame?.();
  };
  window.addEventListener('resize', onResize, { passive: true });

  bootProfile.uiMountMs = Number((performance.now() - tPhase).toFixed(2));
  tPhase = performance.now();

  // 5. Post-Load Initial State:
  //    - Visitor default (`startInLanding === true`): Display full completed 3D Tower (`step = 11.0`)
  //      in the background behind the monochrome `'Explore'` landing state.
  //    - Deep-link / `?intro=0` / automation (`startInLanding === false`): Jump directly to target stop.
  const bootParams = new URLSearchParams(window.location.search || '');
  if (startInLanding) {
    app.setStep(11.0, { skipChapterSync: false });
    const bootPose = cameraChoreography.heroFinaleRig.activatePreset(
      'overview',
      window.innerWidth,
      window.innerHeight
    );
    await app.setCameraPose({
      position: bootPose.position,
      target: bootPose.target,
      fov: bootPose.fov,
      immediate: true,
    });
    museumUi.enterLandingMode?.();
  } else {
    museumUi.exitLandingMode?.();
    const stopParam = bootParams.get('stop');
    const photoParam = bootParams.get('photo');
    const chapterParam = bootParams.get('chapter');
    let bootStopIdx = 0;
    if (stopParam !== null && stopParam.trim() !== '') {
      const n = Number(stopParam);
      bootStopIdx = Number.isFinite(n) && n >= 1
        ? museumUi.walkthrough.resolveStopIndex(n - 1)
        : museumUi.walkthrough.resolveStopIndex(stopParam);
    } else if (photoParam !== null && photoParam.trim() !== '') {
      const cleanPid = photoParam.trim().replace(/^#/, '').padStart(2, '0');
      const foundIdx = museumUi.walkthrough
        .getStops()
        .findIndex((s) => String(s.photoId) === cleanPid);
      if (foundIdx >= 0) bootStopIdx = foundIdx;
    } else if (chapterParam !== null && chapterParam.trim() !== '') {
      const mapped = LEGACY_CHAPTER_TO_STOP_MAP[chapterParam.trim()];
      if (mapped !== undefined) bootStopIdx = Math.max(0, mapped - 1);
    }
    await museumUi.walkthrough.goToStop(bootStopIdx, { immediate: true, reason: 'boot' });
    const activeStop = museumUi.walkthrough.getActiveStop();
    placard.setStop(bootStopIdx + 1, {
      stop: activeStop,
      plateRect: portalSystem.getOverlayRect(),
      is3DRevealed: false,
    });
    if (['1', 'true', 'yes'].includes(String(bootParams.get('autoplay') || '').toLowerCase())) {
      museumUi.walkthrough.play();
    }
  }
  bootProfile.stop01LockMs = Number((performance.now() - tPhase).toFixed(2));
  tPhase = performance.now();

  // Render first exhibition frame & record Cold TTFL
  renderer.render(scene, camera);
  const nowAfterFirstRender = performance.now();
  bootProfile.firstRenderShaderCompileMs = Number((nowAfterFirstRender - tPhase).toFixed(2));
  const ttflMs = Number((nowAfterFirstRender - BOOT_START_MS).toFixed(1));
  bootProfile.ttflMs = ttflMs;
  bootProfile.totalFromNavigationStartMs = Number(nowAfterFirstRender.toFixed(1));
  app.ttflMs = ttflMs;
  museumUi.debugDrawer.markFirstFrameRendered(ttflMs);

  // Dismiss opening veil cleanly and hide from visitor DOM after transition
  if (bootVeil) {
    bootVeil.classList.add('is-fading');
    setTimeout(() => {
      bootVeil.hidden = true;
      bootVeil.setAttribute('aria-hidden', 'true');
    }, 480);
  }

  // Prefetch upcoming plate quietly after first paint without bloating cold-boot Landing payload
  setTimeout(() => {
    if (startInLanding) {
      portalSystem.prefetchPortal('55');
    } else {
      const stops = museumUi.walkthrough.getStops();
      const activeIdx = museumUi.walkthrough.getStopIndex();
      const nextStop = stops[(activeIdx + 1) % Math.max(1, stops.length)];
      if (nextStop?.photoId) {
        portalSystem.prefetchPortal(nextStop.photoId);
      }
    }
  }, 120);

  // 6. Main Exhibition Frame Loop + Deterministic Capture Mode
  let inAdvanceSim = false;
  let elapsedSec = 0;
  let lastFrameNow = performance.now();
  let dirtyFrames = 3;

  app.requestFrame = (minFrames = 2) => {
    dirtyFrames = Math.max(dirtyFrames, Number(minFrames) || 2);
  };
  controls.addEventListener('change', () => {
    if (!inAdvanceSim) {
      dirtyFrames = Math.max(dirtyFrames, 2);
    }
  });

  const advanceSimulation = (dtSec) => {
    inAdvanceSim = true;
    const safeTotalDt = Math.max(0, Math.min(Number(dtSec) || 0, 0.25));
    const initSpeedMult = museumUi.walkthrough.isPlaying()
      ? museumUi.walkthrough.getSpeedMultiplier()
      : 1.0;
    const subSteps =
      safeTotalDt > 0 ? Math.max(1, Math.ceil((safeTotalDt * initSpeedMult) / 0.05)) : 1;
    const stepDt = safeTotalDt / subSteps;

    for (let s = 0; s < subSteps; s += 1) {
      elapsedSec += stepDt;

      museumUi.update(stepDt);

      const speedMult = museumUi.walkthrough.isPlaying()
        ? museumUi.walkthrough.getSpeedMultiplier()
        : 1.0;
      portalSystem.update(stepDt * speedMult);
      cameraChoreography.update(stepDt);
      portalSystem.syncPortalCutaway();
      atmosphere.update(stepDt);
      parisWorld.update(stepDt, elapsedSec);
      towerController.update(stepDt, elapsedSec);

      if (controls.enabled && !portalSystem.getActivePortalId() && !portalSystem.isFlying()) {
        controls.update();
        if (!customPoseUnconstrained) {
          viewportConstraints.enforce();
        }
      }
    }

    renderer.render(scene, camera);
    inAdvanceSim = false;
  };

  // Wrap immediate programmatic jumps so canvas pixels update synchronously before returning
  const rawGoToStop = app.goToStop;
  app.goToStop = async (stopIndexOrId, opts = {}) => {
    customPoseUnconstrained = false;
    if (!opts?.keepLanding) {
      museumUi?.exitLandingMode?.();
    }
    const res = await rawGoToStop(stopIndexOrId, opts);
    if (opts.immediate) {
      advanceSimulation(0);
      dirtyFrames = isSoftwareWebGL ? 0 : Math.max(dirtyFrames, 2);
    } else {
      dirtyFrames = Math.max(dirtyFrames, 3);
    }
    return res;
  };
  const rawSetCameraPose = app.setCameraPose;
  app.setCameraPose = async (opts = {}) => {
    const res = await rawSetCameraPose(opts);
    if (opts.immediate) {
      advanceSimulation(0);
      dirtyFrames = isSoftwareWebGL ? 0 : Math.max(dirtyFrames, 2);
    } else {
      dirtyFrames = Math.max(dirtyFrames, 3);
    }
    return res;
  };

  app.enterDeterministicCapture = ({ fps = 30, startStop = 1 } = {}) => {
    deterministicMode = true;
    elapsedSec = 0;
    museumUi?.exitLandingMode?.();
    cameraChoreography.heroFinaleRig.deactivate();
    towerController.resetDeterministicClock?.();
    return museumUi.walkthrough.enterDeterministicMode({ fps, startStop });
  };

  app.stepDeterministicFrame = (dtSec = 1 / 30) => {
    advanceSimulation(dtSec);
    return museumUi.walkthrough.getPlaythroughState();
  };

  app.exitDeterministicCapture = () => {
    deterministicMode = false;
    museumUi.walkthrough.exitDeterministicMode();
    lastFrameNow = performance.now();
    dirtyFrames = Math.max(dirtyFrames, 3);
  };

  s4PerfState.attachAppHooks(app);

  let lastSimWallNow = performance.now();
  let lastSwRenderEndMs = 0;

  const rafTick = (now) => {
    requestAnimationFrame(rafTick);
    if (deterministicMode) {
      lastSimWallNow = now;
      return;
    }

    if (isSoftwareWebGL) {
      const hasUrgentMotion =
        dirtyFrames > 0 ||
        museumUi.walkthrough.hasActiveMotion() ||
        atmosphere.isTransitioning?.() ||
        portalSystem.hasActiveVisualTransition() ||
        Boolean(cameraChoreography.hasUrgentMotion?.());
      if (!hasUrgentMotion) {
        if (!cameraChoreography.hasActiveMotion()) {
          lastSimWallNow = now;
          return;
        }
        // Leave >= 280 ms of idle main-thread window after each software-WebGL ambient frame
        // so browser compositing & Playwright screenshots never starve under SwiftShader.
        if (performance.now() - lastSwRenderEndMs < 280) {
          return;
        }
      }
    }

    const dt = (now - lastSimWallNow) / 1000;
    lastSimWallNow = now;
    lastFrameNow = now;

    if (dirtyFrames > 0) dirtyFrames -= 1;
    advanceSimulation(dt);
    if (isSoftwareWebGL) {
      lastSwRenderEndMs = performance.now();
    }
  };
  requestAnimationFrame(rafTick);

  // Expose automation & verification hooks
  window.__MUSEUM_APP__ = app;
  window.__MUSEUM_UI__ = museumUi;
  window.__STAGE3_APP__ = app;
  window.__STAGE4_APP__ = app;
  window.__STAGE5_APP__ = app;
  window.__STAGE6_APP__ = app;

  readyResolve(app);
  return app;
}

initMuseumExhibition().catch((err) => {
  console.error('[Stage3 Museum Exhibition] Fatal initialization error:', err);
});
