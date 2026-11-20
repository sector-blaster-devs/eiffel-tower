/**
 * Eiffel Tower 1889 Museum Exhibition — Theme, Intro, Playthrough & Debug Barrel
 * Directory: museum_v2/stage8_public_domain/ui/
 *
 * Exports:
 *  - Neutral black/white/grey UI palette tokens (`chroma = 0`) + Stage 5 & Stage 6 DOM compliance auditors
 *  - Post-load full-3D `LandingIntro` (`#museum-landing-intro` + `#btn-landing-explore`: EN `'Explore'`, FR `'Explorer'`)
 *  - Quiet top-right `MuseumHeader` (`EN · FR` + Pure View)
 *  - Unified single chronological `WalkthroughController` (`#exhibition-walkthrough-bar`, 12-stop loop, no counter)
 *  - Zero-footprint engineering `DebugDrawer` (`?debug=1` or `Ctrl+Shift+D`)
 *  - Turnkey `mountExhibitionThemeAndDebug(context)` (aliased as `initStage1MuseumUI`) wiring helper for `app.js`
 */

export * from './palette_tokens.js';
export * from './museum_header.js';
export * from './walkthrough_controller.js';
export * from './debug_drawer.js';
export * from './landing_intro.js';
export * from './legal_and_credits_modal.js';

import {
  applyRootPaletteTokens,
  auditVisitorDomCompliance,
  auditStage5NeutralUiCompliance,
  auditStage6UiCompliance,
} from './palette_tokens.js';
import { createMuseumHeader } from './museum_header.js';
import {
  createWalkthroughController,
  HERO_FINALE_CAMERA,
} from './walkthrough_controller.js';
import {
  createDebugDrawer,
  auditZeroEmissive,
} from './debug_drawer.js';
import {
  createLandingIntro,
  shouldStartInLandingMode,
} from './landing_intro.js';
import { createLegalAndCreditsModal } from './legal_and_credits_modal.js';

const LEGACY_STAGE3_TOOLBAR_IDS = Object.freeze([
  'chapter-rail',
  'Utility-pill',
  'utility-pill',
  'portal-shelf',
  'portal-active-pill',
  'bottom-dock',
  'hud-pill',
  'help-popover',
]);

/**
 * Hides any legacy Stage 3 competing navigation chrome if still present in markup,
 * guaranteeing strictly ONE playthrough control surface in visitor mode.
 */
export function quarantineLegacyStage3Chrome(doc = typeof document !== 'undefined' ? document : null) {
  if (!doc) return;
  for (const id of LEGACY_STAGE3_TOOLBAR_IDS) {
    const el = doc.getElementById(id);
    if (el) {
      el.setAttribute('hidden', '');
      el.setAttribute('aria-hidden', 'true');
      el.style.setProperty('display', 'none', 'important');
    }
  }
}

/**
 * One-call integration initializer for `app.js`.
 *
 * Connects `LandingIntro`, `MuseumHeader`, `WalkthroughController`,
 * and `DebugDrawer` cleanly to Three.js / `portalSystem` / `placard`.
 */
export function mountExhibitionThemeAndDebug(ctx = {}) {
  const doc = ctx.document || (typeof document !== 'undefined' ? document : null);
  const lang = ctx.lang || 'en';
  const initialLanding =
    ctx.startInLanding !== undefined
      ? Boolean(ctx.startInLanding)
      : shouldStartInLandingMode(ctx.searchString);

  if (doc?.documentElement) {
    applyRootPaletteTokens(doc.documentElement);
    quarantineLegacyStage3Chrome(doc);
  }

  // Ensure 3D frustum pyramids are hidden by default in visitor mode
  ctx.portalSystem?.setPortalsVisible?.(false);

  // Build normalized appAdapter for WalkthroughController
  const appAdapter = ctx.appAdapter || {
    portalSystem: ctx.portalSystem || null,
    towerController: ctx.towerController || null,
    parisWorld: ctx.parisWorld || null,
    setStep: (step) => {
      ctx.towerController?.setStep?.(step);
      ctx.parisWorld?.setStep?.(step);
      ctx.portalSystem?.setActiveStep?.(step);
      ctx.app?.setStep?.(step);
    },
    enterPortal: async (photoId, opts = {}) => {
      if (typeof ctx.app?.enterPortal === 'function') {
        return ctx.app.enterPortal(photoId, opts);
      }
      return ctx.portalSystem?.enterPortal?.(photoId, opts);
    },
    exitPortal: async (opts = {}) => {
      if (typeof ctx.app?.exitPortal === 'function') {
        return ctx.app.exitPortal(opts);
      }
      return ctx.portalSystem?.exitPortal?.(opts);
    },
    setBlend: (opacity) => {
      if (typeof ctx.portalSystem?.setBlend === 'function') {
        ctx.portalSystem.setBlend(opacity);
      } else if (typeof ctx.portalSystem?.setOpacity === 'function') {
        ctx.portalSystem.setOpacity(opacity);
      }
    },
    getActivePortalId: () =>
      ctx.portalSystem?.getActivePortalId?.() ?? ctx.portalSystem?.activePortalId ?? null,
    setCameraPose: async ({ position, target, fov, duration, immediate = false } = {}) => {
      if (typeof ctx.app?.setCameraPose === 'function') {
        return ctx.app.setCameraPose({ position, target, fov, duration, immediate });
      }
      if (typeof ctx.app?.flyToCameraPose === 'function' && !immediate) {
        return ctx.app.flyToCameraPose({ position, target, fov, durationMs: 900 });
      }
      if (ctx.camera?.position?.set && Array.isArray(position)) {
        ctx.camera.position.set(position[0], position[1], position[2]);
        if (typeof fov === 'number') {
          ctx.camera.fov = fov;
          ctx.camera.clearViewOffset?.();
          ctx.camera.updateProjectionMatrix?.();
        }
      }
      if (ctx.controls?.target?.set && Array.isArray(target)) {
        ctx.controls.target.set(target[0], target[1], target[2]);
        ctx.controls.update?.();
      } else if (ctx.camera?.lookAt && Array.isArray(target)) {
        ctx.camera.lookAt(target[0], target[1], target[2]);
      }
    },
  };

  let header = null;
  let walkthrough = null;
  let debugDrawer = null;
  let landingIntro = null;
  let legalModal = null;

  const openLegalModal = (tab = 'credits', triggerEl = null) => {
    legalModal?.open?.(tab, triggerEl);
  };

  const isLandingMode = () => Boolean(landingIntro?.isActive?.() || walkthrough?.isLandingMode?.());

  const enterLandingMode = () => {
    landingIntro?.setActive?.(true);
    walkthrough?.setLandingMode?.(true, { silent: true });
  };

  const exitLandingMode = () => {
    const wasActive = isLandingMode();
    landingIntro?.setActive?.(false);
    walkthrough?.setLandingMode?.(false, { silent: true });
    return wasActive;
  };

  const handleExploreStart = () => {
    exitLandingMode();
    if (typeof ctx.onExploreStart === 'function') {
      ctx.onExploreStart();
    } else if (typeof ctx.app?.startExplore === 'function') {
      ctx.app.startExplore();
    } else {
      walkthrough?.goToStop?.(0, { immediate: false, reason: 'explore' });
    }
  };

  legalModal = createLegalAndCreditsModal({
    parent: ctx.uiRoot || null,
    lang,
  });

  landingIntro = createLandingIntro({
    container: ctx.landingContainer || null,
    parent: ctx.uiRoot || null,
    lang,
    active: initialLanding,
    onExplore: handleExploreStart,
    onOpenLegal: openLegalModal,
  });

  walkthrough = createWalkthroughController({
    container: ctx.walkthroughContainer || null,
    parent: ctx.uiRoot || null,
    stops: ctx.stops || null,
    lang,
    initialStopIndex: ctx.initialStopIndex ?? 0,
    bindKeyboard: ctx.bindKeyboard !== false,
    landingMode: initialLanding,
    appAdapter,
    onLandingModeChange: (active) => {
      landingIntro?.setActive?.(active);
    },
    onExploreRequest: handleExploreStart,
    onStopChange: (payload) => {
      const placard = ctx.placard;
      if (placard) {
        if (typeof placard.getCurrentStop === 'function' && typeof placard.setStop === 'function') {
          const plateRect =
            ctx.portalSystem?.getOverlayRect?.() ||
            ctx.portalSystem?.getCurrentRect?.() ||
            ctx.portalSystem?._currentRect ||
            undefined;
          placard.setStop(payload.stopNumber || payload.stop?.stopId, {
            stop: payload.stop,
            plateRect,
            is3DRevealed: false,
          });
        } else if (typeof placard.setStop === 'function') {
          placard.setStop(payload.stopIndex, payload.stop);
        } else if (typeof placard.renderStop === 'function') {
          placard.renderStop(payload.stop, payload.stopIndex);
        } else if (typeof placard.update === 'function') {
          placard.update(payload);
        }
      }
      if (typeof ctx.onStopChange === 'function') ctx.onStopChange(payload);
    },
    onStepChange: (stepOrPayload, meta) => {
      const numericStep =
        typeof stepOrPayload === 'number' ? stepOrPayload : Number(stepOrPayload?.step);
      if (Number.isFinite(numericStep)) {
        ctx.towerController?.setStep?.(numericStep);
        ctx.parisWorld?.setStep?.(numericStep);
        ctx.portalSystem?.setActiveStep?.(numericStep);
      }
      if (typeof ctx.onStepChange === 'function') ctx.onStepChange(stepOrPayload, meta);
    },
    onPlacardVisibilityChange: ({ opacity, stopIndex, stop }) => {
      const placard = ctx.placard;
      if (placard) {
        if (typeof placard.setOpacity === 'function') {
          placard.setOpacity(opacity);
        } else {
          const domEl = placard.element || placard.el;
          if (domEl instanceof HTMLElement) {
            domEl.style.opacity = String(opacity);
          }
        }
      }
      if (typeof ctx.onPlacardVisibilityChange === 'function') {
        ctx.onPlacardVisibilityChange({ opacity, stopIndex, stop });
      }
    },
    onPortalStateChange: ctx.onPortalStateChange || null,
    onHeroFinaleActivate: ctx.onHeroFinaleActivate || null,
    onPlayStateChange: ctx.onPlayStateChange || null,
    onReveal3DChange: (isRevealing) => {
      const revealedBool =
        typeof isRevealing === 'boolean'
          ? isRevealing
          : Boolean(isRevealing?.active ?? isRevealing?.isRevealing3D);
      ctx.placard?.set3DRevealState?.(revealedBool);
      if (typeof ctx.onReveal3DChange === 'function') {
        ctx.onReveal3DChange(isRevealing);
      }
    },
  });

  header = createMuseumHeader({
    container: ctx.headerContainer || null,
    parent: ctx.uiRoot || null,
    lang,
    enablePureViewButton: ctx.enablePureViewButton !== false,
    onOpenLegal: openLegalModal,
    onLanguageChange: (nextLang) => {
      landingIntro?.setLanguage?.(nextLang);
      legalModal?.setLanguage?.(nextLang);
      walkthrough?.setLanguage?.(nextLang);
      ctx.placard?.setLanguage?.(nextLang);
      ctx.placard?.setLang?.(nextLang);
      if (doc?.documentElement) {
        doc.documentElement.lang = nextLang;
      }
      if (typeof ctx.onLanguageChange === 'function') {
        ctx.onLanguageChange(nextLang);
      }
    },
    onPureViewChange: ctx.onPureViewChange || null,
  });

  debugDrawer = createDebugDrawer({
    mountPoint: ctx.debugMountPoint || doc?.body || null,
    app: ctx.app || null,
    walkthroughController: walkthrough,
    towerController: ctx.towerController || null,
    portalSystem: ctx.portalSystem || null,
    atmosphere: ctx.atmosphere || null,
    lightingRig: ctx.lightingRig || null,
    parisWorld: ctx.parisWorld || null,
    scene: ctx.scene || null,
    camera: ctx.camera || null,
    controls: ctx.controls || null,
    renderer: ctx.renderer || null,
    canvas: ctx.canvas || null,
    assetBasePath: ctx.assetBasePath ?? './',
    enableKeyboardShortcut: ctx.enableDebugShortcut !== false,
    autoCheckUrl: ctx.autoCheckDebugUrl !== false,
  });

  // Automatically pause walkthrough if visitor drags 3D canvas directly
  const targetCanvas =
    ctx.canvas ||
    ctx.renderer?.domElement ||
    doc?.getElementById('world-canvas') ||
    doc?.getElementById('webgl-canvas') ||
    null;

  const onCanvasPointerDown = () => {
    walkthrough?.notifyCanvasDragStart?.();
  };
  if (targetCanvas) {
    targetCanvas.addEventListener('pointerdown', onCanvasPointerDown, { passive: true });
  }

  const update = (dtSec) => {
    walkthrough?.update?.(dtSec);
    debugDrawer?.update?.(dtSec);
  };

  const api = {
    header,
    walkthrough,
    debugDrawer,
    landingIntro,
    legalModal,
    openLegalModal,
    heroFinaleCamera: HERO_FINALE_CAMERA,
    enterLandingMode,
    exitLandingMode,
    isLandingMode,
    startExplore: handleExploreStart,
    update,
    auditVisitorCompliance: () => auditVisitorDomCompliance(doc),
    auditStage5NeutralUi: () => auditStage5NeutralUiCompliance(doc),
    auditStage6Ui: () => auditStage6UiCompliance(doc),
    auditSceneZeroEmissive: (opts) => auditZeroEmissive(ctx.scene, opts),
    dispose: () => {
      if (targetCanvas) {
        targetCanvas.removeEventListener('pointerdown', onCanvasPointerDown);
      }
      debugDrawer?.destroy?.();
      legalModal?.dispose?.();
      landingIntro?.dispose?.();
      walkthrough?.dispose?.();
      header?.dispose?.();
    },
  };

  if (typeof window !== 'undefined') {
    window.__MUSEUM_UI__ = api;
  }

  return api;
}

export const initStage1MuseumUI = mountExhibitionThemeAndDebug;
