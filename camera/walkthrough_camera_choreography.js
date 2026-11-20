/**
 * Unified Walkthrough Camera & Step Choreography (`walkthrough_camera_choreography.js`)
 *
 * Bridges `OpticalCameraRig`, `ViewportConstraints`, `HeroFinaleRig`, and `PhotoPortalSystem`
 * into the exhibition runtime (`app.js`, `WalkthroughController`, `MuseumPlacard`):
 *
 *   1. Interactive Stop Transitions (`Next`, `Prev`, rail detents, Archive jumps):
 *      Eliminates frame-0 `step` pop by smoothly gliding 3D Tower construction
 *      (`easeConstructionBeatB`) across the camera flight while departing glass plates dissolve
 *      in frozen geometry and arriving glass plates materialize at optical lock.
 *   2. Tactile Continuous Rail Scrubbing (`setTau(..., { scrubbing: true })`):
 *      Smoothly releases locked 2D plates at `0.000 px` jump when dragging along the timeline
 *      rail and damps the 3D camera along a curated exterior Champ-de-Mars elevation spline,
 *      then flies seamlessly (`0.000 px` jump) into the nearest calibrated PnP stop on release.
 *   3. Stop 11 Hero 3D Showcase & Responsive Presets (`HeroFinaleRig`):
 *      Routes Overview + Detail I–IV preset clicks and `Reset View` through viewport- &
 *      placard-aware poses on both desktop (`1440×900`) and mobile (`390×844`), with
 *      deterministic `update(dtSec)` ambient turntable / parallax sway and instant user yield.
 */

import {
  createHeroFinaleRig,
  resolveResponsiveHeroPose,
  HERO_FINALE_CAMERA,
  HERO_SHOWCASE_PRESETS,
} from './hero_finale_rig.js';

import {
  runAdversarialConstraintFuzz,
  flushOrbitControlsMomentum,
} from './viewport_constraints.js';

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstepCubic(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

/**
 * C¹ low-crest construction ramp matching `model/walkthrough_pacing.js` (`f(0)=0, f(1)=1,
 * f'(0)=0, f'(1)=0`).
 */
function easeInteractiveStep(u) {
  const x = clamp(u, 0, 1);
  if (x <= 0 || x >= 1) return x;
  const collar = 0.14;
  const m = 1.0 / (1.0 - collar);
  let ramp;
  if (x < collar) {
    ramp = (m * x * x) / (2.0 * collar);
  } else if (x > 1.0 - collar) {
    const dx = 1.0 - x;
    ramp = 1.0 - (m * dx * dx) / (2.0 * collar);
  } else {
    ramp = m * (x - 0.5 * collar);
  }
  return clamp(0.70 * ramp + 0.30 * smoothstepCubic(x), 0, 1);
}

/**
 * Evaluates a curated exterior Tower-framing pose `(position, target, fov)` along the
 * continuous walkthrough rail parameter `tau in [0 .. 10]` during interactive scrubbing.
 */
export function evaluateScrubExteriorPose(tau, vpWidth = 1440, vpHeight = 900, maxTau = 11.0) {
  const denom = Math.max(10.0, Number(maxTau) || 11.0);
  const u = clamp((Number(tau) || 0) / denom, 0, 1);
  const s = smoothstepCubic(u);
  const aspect = Math.max(1, vpWidth) / Math.max(1, vpHeight);
  const isPortrait = aspect < 0.80;

  if (isPortrait) {
    return {
      position: [
        lerp(122.0, 254.0, s),
        lerp(22.0, 54.0, s),
        lerp(168.0, 468.0, s),
      ],
      target: [0.0, lerp(14.0, 76.0, s), 0.0],
      fov: lerp(50.0, 55.0, s),
    };
  }

  return {
    position: [
      lerp(112.0, 240.0, s),
      lerp(19.0, 52.0, s),
      lerp(142.0, 440.0, s),
    ],
    target: [0.0, lerp(18.0, 134.0, s), 0.0],
    fov: 42.0,
  };
}

export function installStage3CameraChoreography({
  THREE,
  app,
  camera,
  controls,
  canvas,
  portalSystem,
  viewportConstraints,
  walkthrough,
  placard,
} = {}) {
  if (!THREE || !app || !camera || !controls || !portalSystem || !viewportConstraints || !walkthrough) {
    throw new Error('installStage3CameraChoreography requires core scene/UI systems');
  }

  portalSystem.setViewportConstraints?.(viewportConstraints);
  portalSystem.setTowerController?.(app.towerController || null);
  portalSystem.setAllowCanvasDragExit?.(true);

  // Zero-leak telephoto fog & world-mist compensation for orthographic elevation stops (e.g. Stop 12 #55 at Z=3600m):
  // Offsets `scene.fog` and `mistUniforms` ONLY inside `scene.onBeforeRender` -> `scene.onAfterRender`, keeping
  // `scene.fog.near/far` (380/2100) and `parisWorld.audit()` 100% invariant outside WebGL draw calls!
  if (app.scene && !app.scene.__s5TelephotoFogHooked) {
    const targetScene = app.scene;
    targetScene.__s5TelephotoFogHooked = true;
    const prevBefore = targetScene.onBeforeRender;
    const prevAfter = targetScene.onAfterRender;
    let savedFogState = null;
    let cachedExpoGrandGroup = undefined;

    targetScene.onBeforeRender = function s5TelephotoBeforeRender(
      renderer,
      scn,
      cam,
      geometry,
      material,
      group
    ) {
      // Sync spatial portal cutaway state before every WebGL draw call.
      portalSystem.syncPortalCutaway?.();

      if (cam && scn?.fog && scn.fog.isFog && !scn.fog.isFogExp2) {
        const rCamXZ = Math.hypot(cam.position.x, cam.position.z);
        if (rCamXZ > 540.0 && !savedFogState) {
          const teleShift = Math.max(0.0, rCamXZ - 480.0);
          const mu = app.parisWorld?.mistUniforms || null;
          if (cachedExpoGrandGroup === undefined) {
            cachedExpoGrandGroup = scn.getObjectByName('cdm_dome_central_machines') || null;
          }
          // Only hide South Expo Dôme Central & Galerie des Machines when camera is well past Z = 820m
          // (where Dome is already >1.5x off-screen during Hero <-> #55 and #55 <-> #13 flights, preventing any visible pop!).
          const hideSouthExpo = cam.position.z > 820.0 && Boolean(cachedExpoGrandGroup?.visible);
          savedFogState = {
            fogNear: scn.fog.near,
            fogFar: scn.fog.far,
            camFogInner: mu?.uCamFogInner ? mu.uCamFogInner.value : null,
            camFogOuter: mu?.uCamFogOuter ? mu.uCamFogOuter.value : null,
            inkCamInner: mu?.uInkCamFadeInner ? mu.uInkCamFadeInner.value : null,
            inkCamOuter: mu?.uInkCamFadeOuter ? mu.uInkCamFadeOuter.value : null,
            mu,
            hidExpoGrand: hideSouthExpo,
          };
          if (hideSouthExpo && cachedExpoGrandGroup) {
            cachedExpoGrandGroup.visible = false;
          }
          if (rCamXZ > 600.0) {
            scn.fog.near = savedFogState.fogNear + teleShift;
            scn.fog.far = savedFogState.fogFar + teleShift;
            if (mu?.uCamFogInner) mu.uCamFogInner.value = savedFogState.camFogInner + teleShift;
            if (mu?.uCamFogOuter) mu.uCamFogOuter.value = savedFogState.camFogOuter + teleShift;
            if (mu?.uInkCamFadeInner) mu.uInkCamFadeInner.value = savedFogState.inkCamInner + teleShift;
            if (mu?.uInkCamFadeOuter) mu.uInkCamFadeOuter.value = savedFogState.inkCamOuter + teleShift;
          }
        }
      }
      if (typeof prevBefore === 'function') {
        prevBefore.call(this, renderer, scn, cam, geometry, material, group);
      }
    };

    targetScene.onAfterRender = function s5TelephotoAfterRender(renderer, scn, cam) {
      if (savedFogState && scn?.fog) {
        if (savedFogState.hidExpoGrand && cachedExpoGrandGroup) {
          cachedExpoGrandGroup.visible = true;
        }
        scn.fog.near = savedFogState.fogNear;
        scn.fog.far = savedFogState.fogFar;
        const { mu } = savedFogState;
        if (mu?.uCamFogInner && savedFogState.camFogInner !== null) {
          mu.uCamFogInner.value = savedFogState.camFogInner;
        }
        if (mu?.uCamFogOuter && savedFogState.camFogOuter !== null) {
          mu.uCamFogOuter.value = savedFogState.camFogOuter;
        }
        if (mu?.uInkCamFadeInner && savedFogState.inkCamInner !== null) {
          mu.uInkCamFadeInner.value = savedFogState.inkCamInner;
        }
        if (mu?.uInkCamFadeOuter && savedFogState.inkCamOuter !== null) {
          mu.uInkCamFadeOuter.value = savedFogState.inkCamOuter;
        }
        savedFogState = null;
      }
      if (typeof prevAfter === 'function') {
        prevAfter.call(this, renderer, scn, cam);
      }
    };
  }

  const heroFinaleRig = createHeroFinaleRig({
    THREE,
    camera,
    controls,
    viewportConstraints,
    idleResumeDelaySec: 4.8,
    ambientMotionEnabled: true,
  });

  let interactiveStepGlide = null;
  let scrubState = {
    active: false,
    anchorTau: 0,
    releasedPortal: false,
    desiredPose: null,
  };

  let lastViewportPortrait =
    (typeof window !== 'undefined' ? window.innerWidth : 1440) /
      Math.max(1, typeof window !== 'undefined' ? window.innerHeight : 900) <
    0.80;

  // Bind user interaction listeners so Stop 11 ambient motion yields at 0.000 px jump
  if (canvas) {
    const onInputStart = () => {
      heroFinaleRig.notifyUserInputStart();
    };
    const onInputEnd = () => {
      heroFinaleRig.notifyUserInputEnd();
    };
    canvas.addEventListener('pointerdown', onInputStart, { passive: true });
    canvas.addEventListener('touchstart', onInputStart, { passive: true });
    canvas.addEventListener('wheel', () => {
      heroFinaleRig.notifyUserInputStart();
      heroFinaleRig.notifyUserInputEnd();
    }, { passive: true });
    if (typeof window !== 'undefined') {
      window.addEventListener('pointerup', onInputEnd, { passive: true });
      window.addEventListener('pointercancel', onInputEnd, { passive: true });
      window.addEventListener('touchend', onInputEnd, { passive: true });
    }
  }

  // ---------------------------------------------------------------------------
  // 1. Upgrade Placard & Programmatic Preset Selection (`Detail I–IV` & `Overview`)
  // ---------------------------------------------------------------------------
  heroFinaleRig.flyToPreset = (
    presetId = 'overview',
    { duration = 1.25, immediate = false } = {}
  ) => {
    walkthrough.pause();
    interactiveStepGlide = null;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 900;
    const pose = heroFinaleRig.activatePreset(presetId, vw, vh);
    placard?.setActiveHeroPreset?.(pose.presetId);

    return app.setCameraPose({
      position: pose.position,
      target: pose.target,
      fov: pose.fov,
      duration,
      immediate,
    });
  };

  if (placard) {
    placard.onSelectHeroPreset = (preset) => {
      if (!preset) return;
      const presetId = preset.presetId || preset.id || 'overview';
      heroFinaleRig.flyToPreset(presetId, { duration: 1.25, immediate: false });
    };
  }

  // ---------------------------------------------------------------------------
  // 2. Upgrade Walkthrough `_activateHeroFinale` (`Stop 11` & `Reset View` button)
  // ---------------------------------------------------------------------------
  walkthrough._activateHeroFinale = async function stage3ActivateHeroFinale({
    immediate = false,
    duration = undefined,
    presetId = 'overview',
  } = {}) {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 900;
    const pose = heroFinaleRig.activatePreset(presetId, vw, vh);
    placard?.setActiveHeroPreset?.(pose.presetId);

    await app.setCameraPose({
      position: pose.position,
      target: pose.target,
      fov: pose.fov,
      duration: duration ?? 1.45,
      immediate,
    });

    if (this.onHeroFinaleActivate) {
      this.onHeroFinaleActivate({
        presetId: pose.presetId,
        cameraPose: {
          position: [...pose.position],
          target: [...pose.target],
          fov: pose.fov,
        },
        immediate,
      });
    }
  };

  // ---------------------------------------------------------------------------
  // 3. Upgrade Interactive `goToStop` (Eliminate Frame-0 Step Pop & Plate Cut)
  // ---------------------------------------------------------------------------
  const origWalkthroughGoToStop = walkthrough.goToStop.bind(walkthrough);

  walkthrough.goToStop = async function stage3GoToStop(
    stopIndexOrId,
    { immediate = false, reason = 'programmatic', keepLanding = false } = {}
  ) {
    scrubState.active = false;
    scrubState.desiredPose = null;

    if (this._landingMode && !keepLanding && !(immediate && reason === 'boot')) {
      this.setLandingMode(false);
    }

    const nextIdx = this.resolveStopIndex(stopIndexOrId);
    const nextStop = this._stops[nextIdx];
    if (!nextStop) {
      return origWalkthroughGoToStop(stopIndexOrId, { immediate, reason, keepLanding });
    }

    // Deactivate Stop 12 / Landing showcase rig when navigating to photo portals (Stops 01..11)
    if (nextStop.photoId) {
      heroFinaleRig.deactivate();
    }

    // Immediate jumps (boot, deterministic capture init, replay reset) stay synchronous
    if (immediate || this._isPlaying) {
      interactiveStepGlide = null;
      const res = await origWalkthroughGoToStop(stopIndexOrId, { immediate, reason, keepLanding });
      portalSystem.syncPortalCutaway?.();
      return res;
    }

    // Smooth interactive transition!
    const navToken = (this._navSeq = (this._navSeq || 0) + 1);

    const prevIdx = this._stopIndex;
    const startStep = Number.isFinite(app.getStep?.()) ? app.getStep() : this._step;
    const targetStep = nextStop.calibratedStep;
    const stepDelta = Math.abs(targetStep - startStep);

    // Distance- & angle-aware flight duration so wide cross-Tower sweeps (#18 -> #36, 700m)
    // glide majestically (~2.35s) while nearby axial steps stay crisp (~1.38s)
    let destPos = HERO_FINALE_CAMERA.position;
    if (nextStop.photoId) {
      const pEntry =
        portalSystem.getPortalById?.(nextStop.photoId)?.camEntry ||
        portalSystem.getCatalog?.()?.[nextStop.photoId];
      if (pEntry?.position_xyz_m) destPos = pEntry.position_xyz_m;
    }
    const rStartXZ = Math.hypot(camera.position.x, camera.position.z);
    const rDestXZ = Math.hypot(destPos[0], destPos[2]);
    const isTelephotoFlight = Math.max(rStartXZ, rDestXZ) > 900.0;
    const isTelephotoFoundationsFlight =
      isTelephotoFlight && Math.min(rStartXZ, rDestXZ) < 95.0;
    const chordDistM = Math.hypot(
      destPos[0] - camera.position.x,
      destPos[1] - camera.position.y,
      destPos[2] - camera.position.z
    );
    const isAdjacentFirstHalf =
      Math.abs(nextIdx - prevIdx) === 1 && Math.min(prevIdx, nextIdx) <= 5;
    let flightDurSec;
    if (isTelephotoFoundationsFlight) {
      // Stop 1 (#55, step 11.0) <-> Stop 2 (#13, step 0.55): unhurried 3.6 km descent + full reverse/forward build
      flightDurSec = clamp(4.60 + stepDelta * 0.19, 5.40, 6.80);
    } else if (isTelephotoFlight) {
      // Landing ('Explore') -> Stop 1 (#55) & Stop 12 <-> Stop 1 telephoto dolly-zoom
      flightDurSec = clamp(3.85 + stepDelta * 0.15, 3.80, 5.20);
    } else if (isAdjacentFirstHalf) {
      // Calm, museum-paced first-half transitions (Stops 2 <-> 3 <-> 4 <-> 5 <-> 6 <-> 7)
      const loIdx = Math.min(prevIdx, nextIdx);
      const baseFirstHalfSec =
        loIdx === 1
          ? 4.65 // #13 <-> #09 154-deg wide-angle foundation sweep
          : loIdx === 2
            ? 4.55 // #09 <-> #51 West pier ascent into SW Pile 3 lattice
            : loIdx === 3
              ? 5.60 // #51 <-> #23 384m glide out beneath South Arch to Champ-de-Mars
              : loIdx === 4
                ? 3.20 // #23 <-> #14 Champ-de-Mars Stage 2 vista zoom
                : 2.65; // #14 <-> #01 Floor 2 axial glide
      flightDurSec = baseFirstHalfSec;
    } else {
      flightDurSec = clamp(1.45 + chordDistM * 0.0014 + stepDelta * 0.14, 1.50, 2.75);
    }

    this._stopIndex = nextIdx;
    this._fromStopIndex = prevIdx;
    this._toStopIndex = nextIdx;
    this._tau = nextIdx;
    this._isRevealing3D = false;
    this._revealAnimActive = false;
    this._isFinished = false;
    this._beat = 'idle';
    this._beatTimer = 0;

    this._plateOpacity = nextStop.photoId ? 1.0 : 0.0;
    this._targetPlateOpacity = this._plateOpacity;
    this._placardOpacity = 1.0;

    // Smoothly interpolate `step` across the flight instead of popping on frame 0!
    if (stepDelta > 1e-3) {
      interactiveStepGlide = {
        startStep,
        targetStep,
        stopIndex: nextIdx,
        elapsed: 0,
        duration: flightDurSec * 0.92,
      };
    } else {
      interactiveStepGlide = null;
      this._step = targetStep;
      this._emitStep(targetStep, { stopIndex: nextIdx, beat: 'settled', progress: 1.0 });
    }

    this._emitPlacardOpacity(1.0, nextIdx);
    this._syncBarDom();

    // Update placard content immediately so visitor sees destination title/caption cleanly
    if (this.onStopChange) {
      this.onStopChange({
        stopIndex: nextIdx,
        stopNumber: nextIdx + 1,
        stop: nextStop,
        tau: this._tau,
        step: targetStep,
        immediate: false,
        reason,
      });
    }

    if (nextStop.photoId) {
      const lockPromise = this._applyPortalLock(nextStop.photoId, {
        plateOpacity: 1.0,
        immediate: false,
        duration: flightDurSec,
        beat: 'settled',
      });
      // `portalSystem.enterPortal` synchronously sets `_currentRect` to the incoming plate's
      // exact viewport frame before flight begins; sync placard immediately so `Explore -> Stop 1`
      // fades the placard directly at its final gallery margin with 0 px jump at lock.
      placard?.updatePlateRect?.(portalSystem.getOverlayRect());
      await lockPromise;
    } else {
      await this._activateHeroFinale({
        immediate: false,
        duration: flightDurSec,
        presetId: 'overview',
      });
    }

    if (navToken !== this._navSeq) {
      return this.getActiveStop();
    }

    // Guarantee exact calibrated step at flight completion
    interactiveStepGlide = null;
    this._step = targetStep;
    this._emitStep(targetStep, { stopIndex: nextIdx, beat: 'settled', progress: 1.0 });
    placard?.updatePlateRect?.(portalSystem.getOverlayRect());
    this._syncBarDom();
    app.requestFrame?.(3);
    return nextStop;
  };

  // ---------------------------------------------------------------------------
  // 4. Upgrade Rail Scrubbing (`setTau(..., { scrubbing: true })`)
  // ---------------------------------------------------------------------------
  const origSetTau = walkthrough.setTau.bind(walkthrough);

  walkthrough.setTau = function stage3SetTau(tau, opts = {}) {
    const scrubbing = Boolean(opts?.scrubbing);
    if (!scrubbing) {
      scrubState.active = false;
      scrubState.desiredPose = null;
      return origSetTau(tau, opts);
    }

    interactiveStepGlide = null;
    heroFinaleRig.deactivate();

    if (!scrubState.active) {
      scrubState.active = true;
      scrubState.anchorTau = this._tau;
      scrubState.releasedPortal = false;
    }

    const resTau = origSetTau(tau, opts);

    const vw = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 900;

    // Release locked 2D plate cleanly (`0.000 px` jump) once user drags > 0.08 stops along rail
    if (!scrubState.releasedPortal && Math.abs(resTau - scrubState.anchorTau) > 0.08) {
      scrubState.releasedPortal = true;
      if (portalSystem.getActivePortalId() || portalSystem.isFlying()) {
        portalSystem.exitPortal({
          keepPinnedIn3D: false,
          reason: 'rail-scrub',
          immediate: false,
        });
      }
      placard?.set3DRevealState?.(true);
    }

    if (scrubState.releasedPortal) {
      const maxTau = Math.max(1, (this._stops?.length || 12) - 1);
      scrubState.desiredPose = evaluateScrubExteriorPose(resTau, vw, vh, maxTau);
    }

    app.requestFrame?.(3);
    return resTau;
  };

  // ---------------------------------------------------------------------------
  // 5. Upgrade `hasActiveMotion` for Software-WebGL Idle Scheduler
  // ---------------------------------------------------------------------------
  const origHasActiveMotion = walkthrough.hasActiveMotion.bind(walkthrough);
  walkthrough.hasActiveMotion = function stage3HasActiveMotion() {
    return (
      origHasActiveMotion() ||
      Boolean(interactiveStepGlide) ||
      Boolean(scrubState.active && scrubState.desiredPose) ||
      portalSystem.hasActiveVisualTransition() ||
      heroFinaleRig.hasActiveAmbientMotion()
    );
  };

  // ---------------------------------------------------------------------------
  // 6. Per-Frame Choreography Update & Responsive Resize Hook
  // ---------------------------------------------------------------------------
  function update(dtSec) {
    const safeDt = clamp(Number(dtSec) || 0, 0, 0.25);

    // 6a. Advance smooth interactive `step` glide during non-autoplay stop flights
    if (interactiveStepGlide && safeDt > 0) {
      interactiveStepGlide.elapsed += safeDt;
      const u = clamp(interactiveStepGlide.elapsed / interactiveStepGlide.duration, 0, 1);
      const eased = easeInteractiveStep(u);
      const nextStep = lerp(
        interactiveStepGlide.startStep,
        interactiveStepGlide.targetStep,
        eased
      );
      walkthrough._step = nextStep;
      walkthrough._emitStep(nextStep, {
        stopIndex: interactiveStepGlide.stopIndex,
        beat: 'interactive_flight',
        progress: eased,
      });
      if (u >= 1.0) {
        interactiveStepGlide = null;
      }
    }

    // 6b. Advance smooth damped 3D camera glide during active rail scrubbing
    if (
      scrubState.active &&
      scrubState.desiredPose &&
      !portalSystem.getActivePortalId() &&
      !portalSystem.getOpticalRig().isReleasing() &&
      safeDt > 0
    ) {
      const alpha = 1.0 - Math.exp(-safeDt * 6.5);
      const dp = scrubState.desiredPose;
      camera.position.x = lerp(camera.position.x, dp.position[0], alpha);
      camera.position.y = lerp(camera.position.y, dp.position[1], alpha);
      camera.position.z = lerp(camera.position.z, dp.position[2], alpha);
      controls.target.x = lerp(controls.target.x, dp.target[0], alpha);
      controls.target.y = lerp(controls.target.y, dp.target[1], alpha);
      controls.target.z = lerp(controls.target.z, dp.target[2], alpha);
      camera.fov = lerp(camera.fov, dp.fov, alpha);
      camera.lookAt(controls.target);
      camera.updateProjectionMatrix();
      flushOrbitControlsMomentum(controls, { spherical: true, pan: true });
      viewportConstraints.enforce();
    }

    // 6c. Advance Landing / Stop 12 Hero 3D Showcase ambient turntable / craftsmanship parallax sway
    const playState = walkthrough.getPlaythroughState();
    const activeStop = walkthrough.getActiveStop?.();
    const inLandingMode = Boolean(app.isLandingMode?.());
    const onHero3D = Boolean((activeStop && !activeStop.photoId) || inLandingMode);
    if (
      onHero3D &&
      !heroFinaleRig.isActive() &&
      !portalSystem.getActivePortalId() &&
      !portalSystem.isFlying()
    ) {
      heroFinaleRig.activatePreset(
        'overview',
        typeof window !== 'undefined' ? window.innerWidth : 1440,
        typeof window !== 'undefined' ? window.innerHeight : 900
      );
    } else if (!onHero3D && heroFinaleRig.isActive()) {
      heroFinaleRig.deactivate();
    }

    if (
      heroFinaleRig.isActive() &&
      !portalSystem.getActivePortalId() &&
      !portalSystem.isFlying()
    ) {
      heroFinaleRig.update(safeDt, {
        isAutoplayFinaleBeat:
          playState.beat === 'finale_orbit' ||
          (onHero3D && !inLandingMode && playState.isPlaying && playState.beat === 'hold_d'),
        isCameraFlying: portalSystem.isFlying(),
        speedMultiplier: walkthrough.isPlaying() ? walkthrough.getSpeedMultiplier() : 1.0,
      });
    }
  }

  function onResize(width, height) {
    const w = Math.max(1, Number(width) || 1440);
    const h = Math.max(1, Number(height) || 900);
    const nowPortrait = w / h < 0.80;

    if (
      nowPortrait !== lastViewportPortrait &&
      heroFinaleRig.isActive() &&
      !portalSystem.getActivePortalId() &&
      !portalSystem.isFlying()
    ) {
      const pose = resolveResponsiveHeroPose(heroFinaleRig.getActivePresetId(), w, h);
      camera.clearViewOffset();
      camera.position.set(...pose.position);
      controls.target.set(...pose.target);
      camera.fov = pose.fov;
      camera.aspect = w / h;
      camera.lookAt(controls.target);
      camera.updateProjectionMatrix();
      flushOrbitControlsMomentum(controls, { spherical: true, pan: true });
      const prevDamp = controls.enableDamping;
      controls.enableDamping = false;
      controls.update();
      controls.enableDamping = prevDamp;
      viewportConstraints.enforce();
    }

    lastViewportPortrait = nowPortrait;
  }

  // ---------------------------------------------------------------------------
  // 7. Attach Verification & Telemetry Hooks onto `app`
  // ---------------------------------------------------------------------------
  const rigRef = portalSystem.getOpticalRig();
  const origResetDet = rigRef.resetDeterministic?.bind(rigRef);
  rigRef.resetDeterministic = () => {
    origResetDet?.();
    heroFinaleRig.resetDeterministic?.();
  };

  app.opticalRig = rigRef;
  app.heroFinaleRig = heroFinaleRig;
  app.cameraChoreography = {
    heroFinaleRig,
    opticalRig: rigRef,
    update,
    onResize,
    hasUrgentMotion: () => Boolean(interactiveStepGlide || scrubState.active),
    hasActiveMotion: () =>
      Boolean(interactiveStepGlide || scrubState.active || heroFinaleRig.hasActiveAmbientMotion()),
  };

  app.constraintFuzzTest = (iterations = 1500) =>
    runAdversarialConstraintFuzz({
      THREE,
      camera,
      controls,
      constraints: viewportConstraints,
      iterations,
    });

  app.getCameraMotionTelemetry = () => portalSystem.getOpticalRig().getTelemetry();

  app.resetCameraMotionTelemetry = () => portalSystem.getOpticalRig().resetTelemetry();

  app.auditCameraAndViewport = ({ fuzzIterations = 1200 } = {}) => {
    const portals = portalSystem.verifyAllPortalsProjection();
    const meanRmsePx =
      portals.length > 0
        ? portals.reduce((acc, r) => acc + r.rmseVsObservedPx, 0) / portals.length
        : 0;
    const motion = portalSystem.getOpticalRig().getTelemetry();
    const fuzz = runAdversarialConstraintFuzz({
      THREE,
      camera,
      controls,
      constraints: viewportConstraints,
      iterations: fuzzIterations,
    });

    return {
      pnpAlignment: {
        portalCount: portals.length,
        meanRmsePx: Number(meanRmsePx.toFixed(4)),
        passed: portals.length >= 11 && meanRmsePx <= 1.85,
        portals,
      },
      motionContinuity: motion,
      viewportConstraintsFuzz: fuzz,
      heroFinaleState: {
        active: heroFinaleRig.isActive(),
        activePresetId: heroFinaleRig.getActivePresetId(),
        presetsAvailable: Object.keys(HERO_SHOWCASE_PRESETS),
      },
    };
  };

  return app.cameraChoreography;
}
