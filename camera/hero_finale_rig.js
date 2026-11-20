/**
 * Stage 3 — Stop 11 Hero 3D Model Showcase & Craftsmanship Rig (`hero_finale_rig.js`)
 *
 * Highlights the craftsmanship of the 3.18M-triangle Eiffel Tower 3D model on Stop 11
 * across both desktop (`1440×900`) and portrait mobile (`390×844`) viewports, with
 * 100% deterministic `update(dtSec)` compatibility for automated video capture.
 *
 * Key Capabilities:
 *   1. Viewport- & Placard-Aware Framing:
 *      - Desktop (`aspect >= 0.82`): Preserves canonical `HERO_FINALE_CAMERA` Overview
 *        (`[240, 52, 440] -> [0, 134, 0], FOV 42°`) keeping `[0 .. 312.275 m]` unclipped,
 *        and composes Detail I–IV slightly right-of-placard so `.m2-placard` on the left
 *        never occludes the featured ironwork.
 *      - Portrait Mobile (`aspect < 0.82`): Compensates narrow horizontal FOV and bottom-docked
 *        `.m2-placard` on ALL 5 presets (Overview + Detail I–IV) so neither horizontal arches
 *        nor pier plinths are clipped or hidden behind UI chrome.
 *   2. Deterministic `update(dtSec)` Living Architectural Motion:
 *      - `overview`: Serene azimuthal turntable (`0.036 rad/s` during auto-play `finale_orbit`;
 *        `0.015 rad/s` gentle contemplation drift when settled idle on Stop 11).
 *      - `Detail I–IV`: Subtle `C^∞` sinusoidal specular parallax breath (`±2.4°` azimuth,
 *        `±0.55 m` vertical counter-poise) so real sunlight travels across rivets, cast-iron
 *        `sabots`, gilded 72-scientist plaques, and summit lantern glass.
 *      - Instant Zero-Jump Yield: Yields immediately (`0.000 px` jump) on user pointer/wheel/touch
 *        input and smoothly ramps back in only after `5.0 s` of idle contemplation.
 */

import { flushOrbitControlsMomentum } from './viewport_constraints.js';

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function smoothstepCubic(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

/**
 * Canonical Stop 12 Hero 3D Model Showcase Camera.
 */
export const HERO_FINALE_CAMERA = Object.freeze({
  position: Object.freeze([240.0, 52.0, 440.0]),
  target: Object.freeze([0.0, 134.0, 0.0]),
  fov: 42.0,
});

/**
 * Curated Desktop + Portrait-Mobile Showcase Presets highlighting the 5 signature
 * structural & artisanal zones of the 3.18M-triangle 1889 Tower model.
 */
export const HERO_SHOWCASE_PRESETS = Object.freeze({
  overview: Object.freeze({
    id: 'overview',
    desktop: Object.freeze({
      position: Object.freeze([240.0, 52.0, 440.0]),
      target: Object.freeze([0.0, 134.0, 0.0]),
      fov: 42.0,
    }),
    portrait: Object.freeze({
      // Lifts base plinths into upper 62% above bottom-docked mobile placard while keeping 312.3m tip well below header
      position: Object.freeze([250.0, 58.0, 480.0]),
      target: Object.freeze([0.0, 82.0, 0.0]),
      fov: 56.0,
    }),
    motionMode: 'turntable',
    turntableAutoplayRadps: 0.042,
    turntableIdleRadps: 0.015,
  }),

  plinths_shoes: Object.freeze({
    id: 'plinths_shoes',
    desktop: Object.freeze({
      // Frames Pile 2 (Est) Château-Landon ashlar plinth, 54°35′ cast-iron sabots & lower rafters
      // cleanly in the open right-center gallery area clear of left placard
      position: Object.freeze([82.0, 13.5, 88.0]),
      target: Object.freeze([35.0, 10.5, 42.0]),
      fov: 35.0,
    }),
    portrait: Object.freeze({
      position: Object.freeze([96.0, 15.0, 106.0]),
      target: Object.freeze([38.0, 7.5, 38.0]),
      fov: 49.0,
    }),
    motionMode: 'parallax_sway',
    swayAzimuthRad: 0.042, // ±2.4°
    swayElevM: 0.45,
    swayPeriodSec: 18.0,
  }),

  arch_frieze: Object.freeze({
    id: 'arch_frieze',
    desktop: Object.freeze({
      // Full 74m Sauvestre decorative arch, gilded 72-scientists frieze & First Stage glazed arcade
      position: Object.freeze([56.0, 42.0, 126.0]),
      target: Object.freeze([-7.0, 49.5, 4.0]),
      fov: 36.0,
    }),
    portrait: Object.freeze({
      // Pulls back to r~290m so full 125m pier-to-pier arch span fits unclipped inside 390px portrait width above placard
      position: Object.freeze([82.0, 36.0, 278.0]),
      target: Object.freeze([0.0, 20.0, 0.0]),
      fov: 53.0,
    }),
    motionMode: 'parallax_sway',
    swayAzimuthRad: 0.045,
    swayElevM: 0.65,
    swayPeriodSec: 20.0,
  }),

  second_platform: Object.freeze({
    id: 'second_platform',
    desktop: Object.freeze({
      // 115.7m pier-to-shaft convergence, Le Figaro octagonal pavilion & Édoux lift deck
      position: Object.freeze([52.0, 121.5, 76.0]),
      target: Object.freeze([-4.5, 117.5, 2.0]),
      fov: 37.0,
    }),
    portrait: Object.freeze({
      position: Object.freeze([68.0, 118.0, 104.0]),
      target: Object.freeze([0.0, 109.0, 0.0]),
      fov: 48.0,
    }),
    motionMode: 'parallax_sway',
    swayAzimuthRad: 0.044,
    swayElevM: 0.55,
    swayPeriodSec: 19.0,
  }),

  campanile_phare: Object.freeze({
    id: 'campanile_phare',
    desktop: Object.freeze({
      // Campanile arches, Eiffel's private summit study, Sautter-Lemonnier lighthouse & waving Tricolore
      position: Object.freeze([38.0, 286.0, 56.0]),
      target: Object.freeze([-3.0, 291.0, 1.5]),
      fov: 36.0,
    }),
    portrait: Object.freeze({
      position: Object.freeze([54.0, 276.0, 84.0]),
      target: Object.freeze([0.0, 274.0, 0.0]),
      fov: 48.0,
    }),
    motionMode: 'parallax_sway',
    swayAzimuthRad: 0.048,
    swayElevM: 0.5,
    swayPeriodSec: 17.0,
  }),
});

/**
 * Resolves the responsive `(position, target, fov)` pose for a Stop 11 preset ID
 * given the current viewport dimensions `(vpWidth, vpHeight)`.
 */
export function resolveResponsiveHeroPose(presetId = 'overview', vpWidth = 1440, vpHeight = 900) {
  const key = String(presetId || 'overview').trim();
  const spec = HERO_SHOWCASE_PRESETS[key] || HERO_SHOWCASE_PRESETS.overview;
  const aspect = Math.max(1, Number(vpWidth) || 1440) / Math.max(1, Number(vpHeight) || 900);
  const usePortrait = aspect < 0.80;
  const variant = usePortrait ? spec.portrait : spec.desktop;

  return {
    presetId: spec.id,
    isPortrait: usePortrait,
    position: [...variant.position],
    target: [...variant.target],
    fov: variant.fov,
    motionMode: spec.motionMode,
  };
}

export function createHeroFinaleRig({
  THREE,
  camera,
  controls,
  viewportConstraints = null,
  idleResumeDelaySec = 5.0,
  ambientMotionEnabled = true,
} = {}) {
  const tmpOffset = new THREE.Vector3();
  const tmpSpherical = new THREE.Spherical();

  let active = false;
  let activePresetId = 'overview';
  let ambientEnabled = Boolean(ambientMotionEnabled);
  let userInteracting = false;
  let idleSinceInputSec = idleResumeDelaySec; // Start ready to drift once settled on Stop 11
  let swayPhaseSec = 0;
  let lastSwayThetaOffset = 0;
  let lastSwayYOffset = 0;

  function notifyUserInputStart() {
    userInteracting = true;
    idleSinceInputSec = 0;
    lastSwayThetaOffset = 0;
    lastSwayYOffset = 0;
  }

  function notifyUserInputEnd() {
    userInteracting = false;
    idleSinceInputSec = 0;
  }

  function activatePreset(presetId = 'overview', vpWidth = 1440, vpHeight = 900) {
    active = true;
    activePresetId = HERO_SHOWCASE_PRESETS[presetId] ? presetId : 'overview';
    userInteracting = false;
    idleSinceInputSec = idleResumeDelaySec;
    swayPhaseSec = 0;
    lastSwayThetaOffset = 0;
    lastSwayYOffset = 0;
    return resolveResponsiveHeroPose(activePresetId, vpWidth, vpHeight);
  }

  function deactivate() {
    active = false;
    swayPhaseSec = 0;
    lastSwayThetaOffset = 0;
    lastSwayYOffset = 0;
  }

  function setAmbientMotionEnabled(enabled) {
    ambientEnabled = Boolean(enabled);
  }

  function getActivePresetId() {
    return activePresetId;
  }

  function isActive() {
    return active;
  }

  function hasActiveAmbientMotion() {
    return Boolean(active && ambientEnabled && !userInteracting && idleSinceInputSec >= idleResumeDelaySec * 0.8);
  }

  /**
   * Advances Stop 11 showcase motion deterministically by `dtSec`.
   * Applies incremental deltas directly onto `(camera.position, controls.target)` so
   * starting or stopping ambient motion ALWAYS has `0.000 px` jump!
   */
  function update(dtSec, { isAutoplayFinaleBeat = false, isCameraFlying = false, speedMultiplier = 1.0 } = {}) {
    if (!active || !ambientEnabled || isCameraFlying || !camera || !controls) {
      return false;
    }

    const dt = clamp(Number(dtSec) || 0, 0, 0.15);
    if (dt <= 0) return false;

    if (userInteracting) {
      return false;
    }

    idleSinceInputSec += dt;

    const spec = HERO_SHOWCASE_PRESETS[activePresetId] || HERO_SHOWCASE_PRESETS.overview;

    // Ramp weight smoothly in [0..1] over 1.8s after idle threshold (or 1.0 immediately in autoplay finale_orbit)
    const rampWeight = isAutoplayFinaleBeat
      ? 1.0
      : smoothstepCubic((idleSinceInputSec - idleResumeDelaySec) / 1.8);

    if (rampWeight <= 1e-4) {
      return false;
    }

    if (spec.motionMode === 'turntable') {
      const rate = isAutoplayFinaleBeat
        ? spec.turntableAutoplayRadps * clamp(speedMultiplier, 0.2, 4.0)
        : spec.turntableIdleRadps;
      const dTheta = dt * rate * rampWeight;

      tmpOffset.copy(camera.position).sub(controls.target);
      const cosA = Math.cos(dTheta);
      const sinA = Math.sin(dTheta);
      const nx = tmpOffset.x * cosA + tmpOffset.z * sinA;
      const nz = -tmpOffset.x * sinA + tmpOffset.z * cosA;
      camera.position.set(controls.target.x + nx, camera.position.y, controls.target.z + nz);
      camera.lookAt(controls.target);
      flushOrbitControlsMomentum(controls, { spherical: true, pan: true });
      if (viewportConstraints) {
        viewportConstraints.enforce();
      }
      return true;
    }

    if (spec.motionMode === 'parallax_sway') {
      swayPhaseSec += dt * rampWeight;
      const omega = (2.0 * Math.PI) / Math.max(4.0, spec.swayPeriodSec || 18.0);
      const nextThetaOff = (spec.swayAzimuthRad || 0.04) * Math.sin(omega * swayPhaseSec);
      const nextYOff = (spec.swayElevM || 0.5) * (1.0 - Math.cos(omega * swayPhaseSec)) * 0.5;

      const dTheta = nextThetaOff - lastSwayThetaOffset;
      const dY = nextYOff - lastSwayYOffset;
      lastSwayThetaOffset = nextThetaOff;
      lastSwayYOffset = nextYOff;

      tmpOffset.copy(camera.position).sub(controls.target);
      tmpSpherical.setFromVector3(tmpOffset);
      tmpSpherical.theta += dTheta;
      tmpOffset.setFromSpherical(tmpSpherical);

      camera.position.copy(controls.target).add(tmpOffset);
      camera.position.y += dY;
      camera.lookAt(controls.target);
      flushOrbitControlsMomentum(controls, { spherical: true, pan: true });
      if (viewportConstraints) {
        viewportConstraints.enforce();
      }
      return true;
    }

    return false;
  }

  function resetDeterministic() {
    userInteracting = false;
    idleSinceInputSec = idleResumeDelaySec;
    swayPhaseSec = 0;
    lastSwayThetaOffset = 0;
    lastSwayYOffset = 0;
  }

  return {
    activate: ({ presetId = 'overview', vpWidth = 1440, vpHeight = 900 } = {}) =>
      activatePreset(presetId, vpWidth, vpHeight),
    activatePreset,
    deactivate,
    update,
    resetDeterministic,
    notifyUserInputStart,
    notifyUserInputEnd,
    setAmbientMotionEnabled,
    getActivePresetId,
    isActive,
    hasActiveAmbientMotion,
    resolvePose: resolveResponsiveHeroPose,
  };
}
