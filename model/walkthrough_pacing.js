/**
 * Stage 2 — Slowed Exhibition Construction Pacing & Beat-B Easing Choreography
 *
 * Replaces Stage 1's brisk Beat-B flight durations (`2.6s–5.8s`, total `26.4s` across Stops 1->8)
 * and steep `smoothstepQuintic` midpoint velocity spike (`1.875x` peak slope) with a deliberate,
 * architectural pacing schedule (`61.8s` total Beat-B construction across Stops 1->8) and a C¹
 * low-crest construction ramp (`1.16x` peak slope) so visitors clearly watch girders being
 * hoisted on cranes, swinging with damped pendulum inertia, resting on `boîtes à sable`, and
 * locking into the iron lattice before each archival glass plate dissolves in.
 *
 * Zero DOM / CSS / UI changes to Stage 1's `#exhibition-walkthrough-bar`.
 */

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
 * Slowed Beat-B durations (`flightDurationSec` on the departing stop `k` for `Stop k -> Stop k+1`).
 * Stops 1 -> 8 span active construction `[0.55 -> 11.00]`; Stops 8 -> 11 are pure camera flights at `11.00`.
 */
export const STAGE2_BEAT_B_FLIGHT_DURATIONS_SEC = Object.freeze({
  'stop_01_design_elevation_1889': 13.2,          // Stop 1 (#55, 11.0) -> Stop 2 (#13, 0.55): Unhurried 3D Tower descent & reverse build to foundations
  '1887_05_caissons': 12.8,                       // Stop 2 (0.55) -> Stop 3 (1.50): Massifs, sommiers, 16 sabots & bigues (154-deg wide-angle sweep)
  '1887_07_base_shoes': 12.2,                     // Stop 3 (1.50) -> Stop 4 (#51, 3.55): 9 inclined pier tiers, central falsework & Floor-1 box girders
  '1888_01_14_lattice_closeup': 9.2,              // Stop 4 (#51, 3.55) -> Stop 5 (#23, 3.60): 384m glide out beneath South Arch to Champ-de-Mars
  '1888_01_07_first_stage_timelapse_1': 9.8,      // Stop 5 (#23, 3.60) -> Stop 6 (#14, 4.85): Creeper cranes & Stage-2 piers to 89m (pre-arch)
  '1888_06_12_second_stage_timelapse_2': 8.8,     // Stop 6 (#14, 4.85) -> Stop 7 (#01, 5.66): 4 decorative arches close, Floor 2 + P12 & scaffold strip
  '1888_09_14_self_supporting_timelapse_3': 8.6,  // Stop 7 (#01, 5.66) -> Stop 8 (#46, 6.52): Shaft merger, Interm. Platform & climbing cranes to 216m
  '1888_12_26_winter_ascent_timelapse_4': 13.5,   // Stop 8 (#46, 6.52) -> Stop 9 (#18, 11.0): Upper shaft, Floor 3, campanile, phare, pavilions & lifts
  '1889_05_completed_axial_timelapse_5': 11.2,    // Stop 9 (11.0) -> Stop 10 (11.0): Grand Champ-de-Mars vista & East Parvis sweep beneath 74m arch
  '1889_summer_under_the_arch': 4.6,              // Stop 10 (11.0) -> Stop 11 (11.0): Smooth pedestrian glide onto East Parvis
  '1889_summer_coutan_basin': 6.8,                // Stop 11 (11.0) -> Stop 12 (11.0): Unified 560m optical reveal to Hero 3D Showcase
  '1889_hero_3d_showcase_finale': 5.2,            // Stop 12 (11.0) -> Stop 1 (#55, 11.0): Seamless loop dolly-zoom to 1:1000 Full Elevation
});

/**
 * Recommended raw step-scrubber playback rate (`0.14 steps/sec` = `~78.6s` for `0.0 -> 11.0`,
 * replacing Stage 1's rushed `0.85 steps/sec` = `12.9s` sprint).
 */
export const STAGE2_RAW_SCRUB_STEPS_PER_SEC = 0.14;

/**
 * C¹ smooth construction progression curve `easeConstructionBeatB(u)` on `[0, 1]`:
 *   - `f(0) = 0`, `f(1) = 1`, `f'(0) = 0`, `f'(1) = 0` (zero velocity snap at Beat A / Beat C joins).
 *   - Peak midpoint slope is `1.164` (vs `1.875` for `smoothstepQuintic`), spreading mechanical
 *     hoisting evenly across the full Beat-B flight window instead of rushing the middle 40%.
 */
export function easeConstructionBeatB(u) {
  const x = clamp(u, 0, 1);
  if (x <= 0 || x >= 1) return x;

  // C¹ cosine-collar ramp with gentle 12% soft start/stop acceleration zones + cubic blend
  const collar = 0.12;
  let ramp;
  if (x < collar) {
    // Match slope `m` cleanly at `x = collar`: `g(x) = m * (x^2 / (2 * collar))`
    const m = 1.0 / (1.0 - collar);
    ramp = (m * x * x) / (2.0 * collar);
  } else if (x > 1.0 - collar) {
    const m = 1.0 / (1.0 - collar);
    const dx = 1.0 - x;
    ramp = 1.0 - (m * dx * dx) / (2.0 * collar);
  } else {
    const m = 1.0 / (1.0 - collar);
    ramp = m * (x - 0.5 * collar);
  }

  return clamp(0.74 * ramp + 0.26 * smoothstepCubic(x), 0, 1);
}

/**
 * Non-invasively installs Stage 2 slowed construction flight durations and Beat-B C¹ step easing
 * onto an existing `WalkthroughController` instance (and optional `DebugDrawer`), preserving 100%
 * of Stage 1's UI, DOM, keyboard, and portal-lock behavior.
 */
export function applyStage2BuildPacing(walkthroughController, { debugDrawer = null, speedScale = 1.0 } = {}) {
  const scale = Number.isFinite(speedScale) && speedScale > 0 ? speedScale : 1.0;

  if (walkthroughController && Array.isArray(walkthroughController._stops)) {
    for (const stop of walkthroughController._stops) {
      const targetSec = STAGE2_BEAT_B_FLIGHT_DURATIONS_SEC[stop.stopId];
      if (Number.isFinite(targetSec)) {
        stop.flightDurationSec = Number((targetSec / scale).toFixed(3));
      }
    }
    if (typeof walkthroughController._computeTotalCycleDurationSec === 'function') {
      walkthroughController._totalDurationSec = walkthroughController._computeTotalCycleDurationSec();
    }

    // Upgrade Beat-B construction `step` progression to `easeConstructionBeatB(u)` without altering Beat C/D locks
    if (!walkthroughController._stage2PacingInstalled && typeof walkthroughController._emitStep === 'function') {
      const origEmitStep = walkthroughController._emitStep.bind(walkthroughController);
      walkthroughController._emitStep = function stage2PacedEmitStep(rawStep, meta = {}) {
        if (
          meta &&
          meta.beat === 'beat_b_flight' &&
          this._beat === 'beat_b_flight' &&
          this._beatDuration > 1e-4
        ) {
          const uRaw = clamp(this._beatTimer / this._beatDuration, 0, 1);
          if (uRaw > 0 && uRaw < 1) {
            const fromStop = this._stops[this._fromStopIndex];
            const toStop = this._stops[this._toStopIndex];
            if (fromStop && toStop && fromStop.calibratedStep !== toStop.calibratedStep) {
              const pacedProgress = easeConstructionBeatB(uRaw);
              const pacedStep = lerp(fromStop.calibratedStep, toStop.calibratedStep, pacedProgress);
              this._step = pacedStep;
              return origEmitStep(pacedStep, { ...meta, progress: pacedProgress });
            }
          }
        }
        return origEmitStep(rawStep, meta);
      };
      walkthroughController._stage2PacingInstalled = true;
    }
  }

  if (debugDrawer && typeof debugDrawer === 'object' && !debugDrawer._stage2ScrubPatched) {
    // Stage 1 DebugDrawer advances raw scrub by `dt * 0.85 * this._rawScrubSpeed`; scaling default
    // `_rawScrubSpeed` to `0.165` yields `0.85 * 0.165 = 0.140 steps/sec` (~78.5s full build).
    if (typeof debugDrawer._rawScrubSpeed === 'number' && Math.abs(debugDrawer._rawScrubSpeed - 1.0) < 1e-3) {
      debugDrawer._rawScrubSpeed = Number((STAGE2_RAW_SCRUB_STEPS_PER_SEC / 0.85).toFixed(4));
    }
    debugDrawer._stage2ScrubPatched = true;
  }

  return {
    flightDurationsSec: STAGE2_BEAT_B_FLIGHT_DURATIONS_SEC,
    rawScrubStepsPerSec: STAGE2_RAW_SCRUB_STEPS_PER_SEC,
  };
}
