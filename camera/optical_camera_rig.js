/**
 * Unified Zero-Jump Optical Camera Rig & Helical Flight Planner (`optical_camera_rig.js`)
 *
 * Eliminates every pre-move pixel, pose, `viewOffset`, FOV, and quaternion jump across:
 *   - Calibrated PnP portal -> portal flights (including rising-front lenses up to -75.4% shift
 *     and portrait-mobile effective sub-frustum FOVs >115°)
 *   - Portal -> Free 3D Showcase flights (e.g. Stop 10 `#38` -> Stop 12 Hero `[240, 52, 440]`)
 *   - Rising-front portal -> Interactive free-orbit drag release (`0.000 px` onset jump)
 *   - Free-orbit -> Portal re-lock (`Show Plate`, rail scrub snap)
 *   - Mid-flight retarget interruptions (`C¹` velocity-matched Hermite carry-over)
 *
 * Mathematical Invariant:
 *   Every Three.js perspective frustum (`camera.projectionMatrix.elements` `e`) is uniquely
 *   determined on viewport `(W_vp, H_vp)` by `(tanHalfY = 1/e[5], shiftX = e[8], shiftY = e[9])`
 *   applied via `setViewOffset(W_vp, H_vp, +0.5 * W_vp * shiftX, -0.5 * H_vp * shiftY, W_vp, H_vp)`.
 *   Capturing `(position, quaternion, tanHalfY, shiftX, shiftY)` directly from the live camera
 *   matrix guarantees `< 1e-6 px` (`0.000 px`) projection jump on transition frame 0.
 */

import {
  localGroundElevation,
  minAllowedCameraY,
  computeStructuralClearanceM,
  repelPointFromTowerStructure,
  repelPointFromExpositionObstacles,
  flushOrbitControlsMomentum,
} from './viewport_constraints.js';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smoothstepQuintic(t) {
  const x = clamp(t, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

export function smoothstepQuinticDeriv(t) {
  const x = clamp(t, 0, 1);
  if (x <= 0 || x >= 1) return 0;
  return 30 * x * x * (x - 1) * (x - 1);
}

/**
 * C² smooth low-crest camera flight progression `easeCameraFlight(t)` on `[0, 1]`:
 *   - `f(0) = 0`, `f(1) = 1`, `f'(0) = f'(1) = 0`, `f''(0) = f''(1) = 0` (continuous 2nd derivative).
 *   - Replaces `smoothstepQuintic`'s `1.875x` midpoint velocity spike with a composed `1.462x`
 *     cruise plateau (`collar = 0.28`), cutting peak linear/angular speed, acceleration, and jerk
 *     while preserving exact `0.000 px` onset/lock and C¹ Hermite interruption tangency.
 */
export function easeCameraFlight(t) {
  const x = clamp(t, 0, 1);
  if (x <= 0 || x >= 1) return x;
  const c = 0.28;
  const m = 1.0 / (1.0 - c);
  let collarRamp;
  if (x < c) {
    const u = x / c;
    collarRamp = m * c * u * u * u * (1.0 - 0.5 * u);
  } else if (x > 1.0 - c) {
    const w = (1.0 - x) / c;
    collarRamp = 1.0 - m * c * w * w * w * (1.0 - 0.5 * w);
  } else {
    collarRamp = m * (x - 0.5 * c);
  }
  return clamp(0.85 * collarRamp + 0.15 * smoothstepQuintic(x), 0, 1);
}

export function easeCameraFlightDeriv(t) {
  const x = clamp(t, 0, 1);
  if (x <= 0 || x >= 1) return 0;
  const c = 0.28;
  const m = 1.0 / (1.0 - c);
  let collarDeriv;
  if (x < c) {
    const u = x / c;
    collarDeriv = m * u * u * (3.0 - 2.0 * u);
  } else if (x > 1.0 - c) {
    const w = (1.0 - x) / c;
    collarDeriv = m * w * w * (3.0 - 2.0 * w);
  } else {
    collarDeriv = m;
  }
  return 0.85 * collarDeriv + 0.15 * smoothstepQuinticDeriv(x);
}

function shortestAngleDelta(fromRad, toRad) {
  let d = (toRad - fromRad) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Computes a natural focal distance `lambda` along world ray `(origin, dir)` closest to the
 * Eiffel Tower vertical axis `(0, y, 0)` (or pier foundations when looking obliquely at a leg).
 */
export function computeRayTowerAnchorDistance(originArr, dirArr) {
  const [ox, , oz] = originArr;
  const [dx, , dz] = dirArr;
  const horizSq = dx * dx + dz * dz;
  const rOrigin = Math.hypot(ox, oz);
  const maxAxisT = Math.max(640.0, rOrigin * 1.15);
  const maxClampT = Math.max(560.0, rOrigin * 1.12);

  if (horizSq > 1e-4) {
    // Parameter along ray of closest approach to vertical Tower axis (0, y, 0)
    const tAxis = -(ox * dx + oz * dz) / horizSq;
    if (tAxis > 14.0 && tAxis < maxAxisT) {
      // Check how close the ray actually passes to the axis; if looking obliquely at a pier
      // (e.g. #13 caissons or #09 base shoes), anchor near the pier at ~32..68m instead of overshooting
      const closestX = ox + dx * tAxis;
      const closestZ = oz + dz * tAxis;
      const closestAxisDist = Math.hypot(closestX, closestZ);
      if (closestAxisDist <= 52.0) {
        return clamp(tAxis, 18.0, maxClampT);
      }
    }

    // Ray looks at a diagonal pier (e.g. (±48, ±48)): find closest approach to nearest pier column
    let bestPierT = null;
    let bestPierDist = Infinity;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const px = sx * 46.0;
        const pz = sz * 46.0;
        const tPier = ((px - ox) * dx + (pz - oz) * dz) / horizSq;
        if (tPier > 10.0 && tPier < 480.0) {
          const d = Math.hypot(ox + dx * tPier - px, oz + dz * tPier - pz);
          if (d < bestPierDist) {
            bestPierDist = d;
            bestPierT = tPier;
          }
        }
      }
    }
    if (bestPierT !== null && bestPierDist < 42.0) {
      return clamp(bestPierT, 16.0, 480.0);
    }
  }

  return clamp(rOrigin > 22.0 ? rOrigin : 75.0, 22.0, Math.max(480.0, rOrigin * 1.08));
}

/**
 * Reference 3D Tower structural landmarks spanning `[0 m .. 312.1 m]` used to measure
 * exact frame-to-frame optical screen-space projection continuity (`px` delta).
 */
export const CONTINUITY_PROBE_LANDMARKS_M = Object.freeze([
  [0.0, 312.12, 0.0],     // Summit flagpole tip
  [0.0, 285.67, 0.0],     // Campanile arch crown
  [0.0, 200.92, 0.0],     // Upper shaft mid-splice
  [-18.8, 118.79, 18.8],  // Second Stage deck SW
  [18.8, 118.79, 18.8],   // Second Stage deck SE
  [-37.8, 57.63, 38.2],   // First Stage platform SW
  [37.8, 57.63, 38.2],    // First Stage platform SE
  [0.0, 40.36, 39.28],    // 74m SE arch crown
  [-48.0, 12.0, 48.0],    // Pile 3 (Sud) masonry sabot
  [-48.0, 12.0, -48.0],   // Pile 4 (Ouest) masonry sabot
]);

export class OpticalCameraRig {
  constructor({ THREE, camera, controls = null, viewportConstraints = null } = {}) {
    if (!THREE) throw new Error('OpticalCameraRig requires THREE');
    if (!camera) throw new Error('OpticalCameraRig requires camera');

    this.THREE = THREE;
    this.camera = camera;
    this.controls = controls;
    this.viewportConstraints = viewportConstraints;

    this._flight = null;
    this._release = null;

    // Live instantaneous kinematics for C¹ interruption velocity matching & telemetry
    this._velPos = [0, 0, 0];
    this._velFocal = [0, 0, 0];
    this._velTanHalfY = 0;
    this._velShiftX = 0;
    this._velShiftY = 0;
    this._angSpeedRadps = 0;

    this._prevSamplePos = null;
    this._prevSampleFocal = null;
    this._prevSampleQuat = new THREE.Quaternion();
    this._prevLinearSpeed = 0;

    // Reusable math scratch objects (zero per-frame GC churn)
    this._tmpVecA = new THREE.Vector3();
    this._tmpVecB = new THREE.Vector3();
    this._tmpVecC = new THREE.Vector3();
    this._tmpUp = new THREE.Vector3(0, 1, 0);
    this._tmpZNeg = new THREE.Vector3(0, 0, -1);
    this._tmpMat4 = new THREE.Matrix4();
    this._tmpQuatLook = new THREE.Quaternion();
    this._tmpQuatCorr = new THREE.Quaternion();
    this._tmpQuatAim = new THREE.Quaternion();
    this._tmpQuatRoll = new THREE.Quaternion();
    this._tmpQuatA = new THREE.Quaternion();
    this._tmpQuatB = new THREE.Quaternion();
    this._tmpSpherical = new THREE.Spherical();

    this._telemetry = {
      transitionCount: 0,
      lastTransitionKind: 'none',
      lastOnsetJumpPx: 0,
      maxOnsetJumpPx: 0,
      lastLockSnapPx: 0,
      maxLockSnapPx: 0,
      maxFrameStepPx: 0,
      linearSpeedMps: 0,
      maxLinearSpeedMps: 0,
      angularSpeedRadps: 0,
      maxAngularSpeedRadps: 0,
      maxLinearAccelJumpMps: 0,
      minFlightCamY: Infinity,
      minFlightGroundClearanceM: Infinity,
      minFlightStructuralClearanceM: Infinity,
      minExteriorFlightStructuralClearanceM: Infinity,
      interruptionCount: 0,
      history: [],
    };
  }

  setViewportConstraints(vc) {
    this.viewportConstraints = vc || null;
  }

  isFlying() {
    return Boolean(this._flight);
  }

  isReleasing() {
    return Boolean(this._release);
  }

  isActive() {
    return Boolean(this._flight || this._release);
  }

  resetTelemetry() {
    this._telemetry = {
      transitionCount: 0,
      lastTransitionKind: 'none',
      lastOnsetJumpPx: 0,
      maxOnsetJumpPx: 0,
      lastLockSnapPx: 0,
      maxLockSnapPx: 0,
      maxFrameStepPx: 0,
      linearSpeedMps: 0,
      maxLinearSpeedMps: 0,
      angularSpeedRadps: 0,
      maxAngularSpeedRadps: 0,
      maxLinearAccelJumpMps: 0,
      minFlightCamY: Infinity,
      minFlightGroundClearanceM: Infinity,
      minFlightStructuralClearanceM: Infinity,
      minExteriorFlightStructuralClearanceM: Infinity,
      interruptionCount: 0,
      history: [],
    };
  }

  resetDeterministic() {
    this.cancel();
    this.resetTelemetry();
  }

  getTelemetry() {
    return {
      ...this._telemetry,
      isFlying: this.isFlying(),
      isReleasing: this.isReleasing(),
      history: this._telemetry.history.slice(-24),
    };
  }

  // ===========================================================================
  // Projection-Exact Canonical Optical State Extraction & Synthesis
  // ===========================================================================

  /**
   * Projects visible landmarks into viewport pixels `(0..vpW, 0..vpH)` using the
   * camera's live `matrixWorldInverse` and `projectionMatrix`.
   */
  captureLandmarkScreenPositions(vpWidth, vpHeight) {
    const W = Math.max(1, vpWidth);
    const H = Math.max(1, vpHeight);
    this.camera.updateMatrixWorld(true);
    this.camera.updateProjectionMatrix();

    const out = [];
    for (let i = 0; i < CONTINUITY_PROBE_LANDMARKS_M.length; i++) {
      const [wx, wy, wz] = CONTINUITY_PROBE_LANDMARKS_M[i];
      this._tmpVecA.set(wx, wy, wz).applyMatrix4(this.camera.matrixWorldInverse);
      // Only measure landmarks strictly in front of camera near plane (`z_eye < -2.0 m`)
      if (this._tmpVecA.z > -2.0) {
        out.push(null);
        continue;
      }
      this._tmpVecB.set(wx, wy, wz).project(this.camera);
      const sx = (this._tmpVecB.x * 0.5 + 0.5) * W;
      const sy = (0.5 - this._tmpVecB.y * 0.5) * H;
      // Only include landmarks near/inside visible screen (`[-0.5W .. 1.5W]`) so behind-back
      // perspective pole points don't skew visible pixel-jump metrics
      if (sx < -0.5 * W || sx > 1.5 * W || sy < -0.5 * H || sy > 1.5 * H) {
        out.push(null);
        continue;
      }
      out.push([sx, sy]);
    }
    return out;
  }

  measureMaxLandmarkJumpPx(snapA, snapB) {
    if (!snapA || !snapB) return 0;
    let maxPx = 0;
    const n = Math.min(snapA.length, snapB.length);
    for (let i = 0; i < n; i++) {
      const a = snapA[i];
      const b = snapB[i];
      if (!a || !b) continue;
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (d > maxPx) maxPx = d;
    }
    return maxPx;
  }

  /**
   * Extracts the exact live 10-DOF optical state from `this.camera`.
   * Re-applying this state via `applyCanonicalState()` reproduces `projectionMatrix`
   * and `matrixWorld` to IEEE-754 floating-point precision (`< 1e-6 px` delta).
   */
  extractLiveCanonicalState(vpWidth, vpHeight) {
    const W = Math.max(1, vpWidth);
    const H = Math.max(1, vpHeight);
    const aspect = W / H;

    // Ensure aspect matches live viewport if no viewOffset is active
    if (!this.camera.view || !this.camera.view.enabled) {
      this.camera.aspect = aspect;
    }
    this.camera.updateMatrixWorld(true);
    this.camera.updateProjectionMatrix();

    const e = this.camera.projectionMatrix.elements;
    const tanHalfY = 1.0 / Math.max(1e-7, Math.abs(e[5]));
    const tanHalfX = 1.0 / Math.max(1e-7, Math.abs(e[0]));
    const shiftX = e[8];
    const shiftY = e[9];

    const position = [this.camera.position.x, this.camera.position.y, this.camera.position.z];
    const quaternion = [
      this.camera.quaternion.x,
      this.camera.quaternion.y,
      this.camera.quaternion.z,
      this.camera.quaternion.w,
    ];

    // Exact local ray mapped to visible screen center `ndc = (0, 0)`
    this._tmpVecA.set(shiftX * tanHalfX, shiftY * tanHalfY, -1.0).normalize();
    this._tmpVecB.copy(this._tmpVecA).applyQuaternion(this.camera.quaternion).normalize();
    const rayDir = [this._tmpVecB.x, this._tmpVecB.y, this._tmpVecB.z];
    const lambda = computeRayTowerAnchorDistance(position, rayDir);
    const focalPoint = [
      position[0] + rayDir[0] * lambda,
      position[1] + rayDir[1] * lambda,
      position[2] + rayDir[2] * lambda,
    ];

    return {
      position,
      quaternion,
      tanHalfY,
      shiftX,
      shiftY,
      focalPoint,
      rayLambda: lambda,
      near: Number.isFinite(this.camera.near) ? this.camera.near : 0.45,
      far: Number.isFinite(this.camera.far) ? this.camera.far : 4500.0,
    };
  }

  /**
   * Converts a calibrated portal optical description (`position, quaternion, fov, fullWidth,
   * fullHeight, offsetX, offsetY, subWidth, subHeight, rect`) into canonical optical state.
   */
  portalStateToCanonical(portalState, vpWidth, vpHeight) {
    const W = Math.max(1, vpWidth);
    const H = Math.max(1, vpHeight);
    const aspect = W / H;

    const tanHalfY =
      Math.tan(portalState.fov * 0.5 * DEG2RAD) *
      (portalState.subHeight / Math.max(1e-6, portalState.fullHeight));
    const tanHalfX = tanHalfY * aspect;

    const shiftX =
      (2.0 * portalState.offsetX + portalState.subWidth - portalState.fullWidth) /
      Math.max(1e-6, portalState.subWidth);
    const shiftY =
      (portalState.fullHeight - 2.0 * portalState.offsetY - portalState.subHeight) /
      Math.max(1e-6, portalState.subHeight);

    const position = [...portalState.position];
    const quaternion = [...portalState.quaternion];

    this._tmpQuatA.set(quaternion[0], quaternion[1], quaternion[2], quaternion[3]).normalize();
    this._tmpVecA.set(shiftX * tanHalfX, shiftY * tanHalfY, -1.0).normalize();
    this._tmpVecB.copy(this._tmpVecA).applyQuaternion(this._tmpQuatA).normalize();
    const rayDir = [this._tmpVecB.x, this._tmpVecB.y, this._tmpVecB.z];
    const lambda = computeRayTowerAnchorDistance(position, rayDir);
    const focalPoint = [
      position[0] + rayDir[0] * lambda,
      position[1] + rayDir[1] * lambda,
      position[2] + rayDir[2] * lambda,
    ];

    return {
      position,
      quaternion,
      tanHalfY,
      shiftX,
      shiftY,
      focalPoint,
      rayLambda: lambda,
      near: Number.isFinite(portalState.near) ? portalState.near : 0.45,
      far: Number.isFinite(portalState.far) ? portalState.far : 4500.0,
      rect: portalState.rect ? { ...portalState.rect } : null,
    };
  }

  /**
   * Builds a canonical symmetric pinhole state for a free 3D camera `(position, target, fov)`.
   */
  freePoseToCanonical({ position, target, fov = 42.0 }) {
    const pos = [Number(position[0]), Number(position[1]), Number(position[2])];
    const tgt = [Number(target[0]), Number(target[1]), Number(target[2])];
    const safeFov = clamp(Number(fov) || 42.0, 12.0, 120.0);
    const tanHalfY = Math.tan(safeFov * 0.5 * DEG2RAD);

    this._tmpVecA.set(pos[0], pos[1], pos[2]);
    this._tmpVecB.set(tgt[0], tgt[1], tgt[2]);
    this._tmpMat4.lookAt(this._tmpVecA, this._tmpVecB, this._tmpUp);
    this._tmpQuatA.setFromRotationMatrix(this._tmpMat4).normalize();

    return {
      position: pos,
      quaternion: [this._tmpQuatA.x, this._tmpQuatA.y, this._tmpQuatA.z, this._tmpQuatA.w],
      tanHalfY,
      shiftX: 0,
      shiftY: 0,
      focalPoint: tgt,
      rayLambda: Math.max(10.0, this._tmpVecA.distanceTo(this._tmpVecB)),
      near: 0.45,
      far: 4500.0,
      rect: null,
    };
  }

  /**
   * Applies a canonical optical state directly to `this.camera` on `(vpWidth, vpHeight)`.
   */
  applyCanonicalState(state, vpWidth, vpHeight) {
    const W = Math.max(1, vpWidth);
    const H = Math.max(1, vpHeight);

    this.camera.position.set(state.position[0], state.position[1], state.position[2]);
    this.camera.quaternion.set(
      state.quaternion[0],
      state.quaternion[1],
      state.quaternion[2],
      state.quaternion[3]
    );

    // Note: Support both ultra-telephoto elevation lenses (~6°..8° on #55) and portrait-mobile >120° sub-frustums
    const fovDeg = clamp(2.0 * Math.atan(Math.max(1e-5, state.tanHalfY)) * RAD2DEG, 0.8, 172.0);
    const rOrigin = Math.hypot(state.position[0], state.position[2]);
    this.camera.fov = fovDeg;
    this.camera.aspect = W / H;
    this.camera.near = clamp(
      Number.isFinite(state.near) ? state.near : 0.45,
      0.25,
      Math.max(800.0, rOrigin * 0.35)
    );
    this.camera.far = Math.max(
      4500.0,
      Number.isFinite(state.far) ? state.far : 4500.0,
      rOrigin + 2400.0
    );

    if (Math.abs(state.shiftX) < 1e-7 && Math.abs(state.shiftY) < 1e-7) {
      this.camera.clearViewOffset();
    } else {
      const offX = 0.5 * W * state.shiftX;
      const offY = -0.5 * H * state.shiftY;
      this.camera.setViewOffset(W, H, offX, offY, W, H);
    }

    this.camera.updateMatrixWorld(true);
    this.camera.updateProjectionMatrix();
  }

  /**
   * Computes the upright quaternion `qAim` that maps the shifted `ndc = (0,0)` ray
   * `normalize(-shiftX * tanHalfX, -shiftY * tanHalfY, -1)` directly onto `normalize(focal - pos)`
   * with zero horizon roll (`up = +Y`).
   */
  _computeShiftedAimQuaternion(posArr, focalArr, tanHalfX, tanHalfY, shiftX, shiftY, outQuat) {
    this._tmpVecA.set(posArr[0], posArr[1], posArr[2]);
    this._tmpVecB.set(focalArr[0], focalArr[1], focalArr[2]);

    // Guard degenerate zero-distance or near-zenith singularity
    this._tmpVecC.copy(this._tmpVecB).sub(this._tmpVecA);
    const dist = this._tmpVecC.length();
    if (dist < 0.5) {
      this._tmpVecB.set(0, clamp(posArr[1], 15, 260), 0);
    }
    this._tmpMat4.lookAt(this._tmpVecA, this._tmpVecB, this._tmpUp);
    this._tmpQuatLook.setFromRotationMatrix(this._tmpMat4).normalize();

    this._tmpVecC.set(shiftX * tanHalfX, shiftY * tanHalfY, -1.0).normalize();
    this._tmpQuatCorr.setFromUnitVectors(this._tmpVecC, this._tmpZNeg);

    return outQuat.copy(this._tmpQuatLook).multiply(this._tmpQuatCorr).normalize();
  }

  // ===========================================================================
  // Helical Exterior Flight Curve Builder (`CatmullRomCurve3` + Obstacle Clearance)
  // ===========================================================================

  _buildHelicalFlightCurve(posA, posB) {
    const { THREE } = this;
    const p0 = new THREE.Vector3(posA[0], posA[1], posA[2]);
    const p1 = new THREE.Vector3(posB[0], posB[1], posB[2]);
    const chordLen = p0.distanceTo(p1);

    if (chordLen < 0.05) {
      return null;
    }

    if (chordLen < 3.5) {
      const shortCurve = new THREE.CatmullRomCurve3(
        [p0, p0.clone().lerp(p1, 0.33), p0.clone().lerp(p1, 0.67), p1],
        false,
        'centripetal',
        0.5
      );
      shortCurve.arcLengthDivisions = 1200;
      return shortCurve;
    }

    const r0 = Math.hypot(p0.x, p0.z);
    const r1 = Math.hypot(p1.x, p1.z);
    const theta0 = Math.atan2(p0.x, p0.z);
    const theta1 = Math.atan2(p1.x, p1.z);

    let dTheta = shortestAngleDelta(theta0, theta1);

    // Near-diametric cross-Tower sweeps (e.g. #18 SE <-> #36 NW, |dTheta| > 157°):
    // Route consistently around the sunlit East (+X) architectural facade (`theta > 0`).
    if (Math.abs(dTheta) > 2.74 && r0 > 28.0 && r1 > 28.0) {
      const midThetaPlus = theta0 + 0.5 * Math.abs(dTheta);
      const midThetaMinus = theta0 - 0.5 * Math.abs(dTheta);
      if (Math.sin(midThetaPlus) >= Math.sin(midThetaMinus)) {
        dTheta = Math.abs(dTheta);
      } else {
        dTheta = -Math.abs(dTheta);
      }
    }

    // Check if pure axial corridor (e.g. Champ-de-Mars #23 -> #14 -> #01 -> #46 -> #18)
    const isPureAxialCorridor =
      Math.abs(dTheta) < 0.24 &&
      ((p0.z > 90 && p1.z > 90) || (p0.z < -90 && p1.z < -90));

    if (isPureAxialCorridor) {
      const k1 = p0.clone().lerp(p1, 0.33);
      const k2 = p0.clone().lerp(p1, 0.67);
      k1.y = Math.max(k1.y, localGroundElevation(k1.x, k1.z) + 0.8);
      k2.y = Math.max(k2.y, localGroundElevation(k2.x, k2.z) + 0.8);
      const axialCurve = new THREE.CatmullRomCurve3([p0, k1, k2, p1], false, 'centripetal', 0.5);
      axialCurve.arcLengthDivisions = 2400;
      return axialCurve;
    }

    // Pedestrian Pont-d'Iéna <-> Parvis Esplanade Glide (e.g. Stop 9 `#36` <-> Stop 10 `#38`):
    // Routes off the south mouth of Pont d'Iéna through the 44m-wide tree-free central Quai d'Orsay
    // opening (`|x| < 18 m` at `z = -119.2`) and across the open Parvis gravel esplanade with
    // strictly monotonic eye-level elevation (`0.000 m` upward bump, >12.5m obstacle clearance).
    const aOnBridge =
      p0.z <= -126.0 && p0.z >= -290.0 && Math.abs(p0.x) <= 13.8 && p0.y <= 8.5;
    const bOnBridge =
      p1.z <= -126.0 && p1.z >= -290.0 && Math.abs(p1.x) <= 13.8 && p1.y <= 8.5;
    const aOnParvis =
      p0.z >= -114.0 && p0.z <= -64.0 && Math.abs(p0.x) <= 92.0 && p0.y <= 12.0;
    const bOnParvis =
      p1.z >= -114.0 && p1.z <= -64.0 && Math.abs(p1.x) <= 92.0 && p1.y <= 12.0;

    if ((aOnBridge && bOnParvis) || (bOnBridge && aOnParvis)) {
      const pBridge = aOnBridge ? p0 : p1;
      const pParvis = aOnBridge ? p1 : p0;
      const sideSign = pParvis.x >= 0 ? 1.0 : -1.0;
      const b0x = pBridge.x;
      const b0z = pBridge.z;
      const b1x = sideSign * 1.5;
      const b1z = -126.0;
      const b2x = sideSign * 8.0;
      const b2z = -106.0;
      const b3x = pParvis.x;
      const b3z = pParvis.z;

      const glideKnots = [p0];
      const glideFracs = [0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875];
      for (const s of glideFracs) {
        const t = aOnBridge ? s : 1.0 - s;
        const om = 1.0 - t;
        const kx =
          om * om * om * b0x +
          3.0 * om * om * t * b1x +
          3.0 * om * t * t * b2x +
          t * t * t * b3x;
        const kz =
          om * om * om * b0z +
          3.0 * om * om * t * b1z +
          3.0 * om * t * t * b2z +
          t * t * t * b3z;
        const smoothS = s * s * (3.0 - 2.0 * s);
        const ky = lerp(p0.y, p1.y, smoothS);
        glideKnots.push(new THREE.Vector3(kx, ky, kz));
      }
      glideKnots.push(p1);
      const glideCurve = new THREE.CatmullRomCurve3(glideKnots, false, 'centripetal', 0.5);
      glideCurve.arcLengthDivisions = 2400;
      return glideCurve;
    }

    const knots = [p0];
    const interiorFracs = [0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875];

    // Detect sweeps between the southern Champ-de-Mars central vista (`z > 185, |x| < 32, y < 22`)
    // and either:
    //   (a) southern SW Pile 3 / West foundation stops (`z > 0`, e.g. `#09 <-> #23`, `#23 <-> #51`, `#51 <-> #14`),
    //       which glide smoothly down the open Champ-de-Mars central corridor with zero piecewise kinks; or
    //   (b) northern Parvis / Seine / Trocadéro (`z <= 0`, e.g. `#18 -> #36`), which route along the central
    //       vista before arcing around the sunlit East Parvis (`R ~ 114 m`).
    const startInCentralVista = p0.z > 185.0 && Math.abs(p0.x) < 32.0 && p0.y < 22.0 && p1.z < 185.0;
    const endInCentralVista = p1.z > 185.0 && Math.abs(p1.x) < 32.0 && p1.y < 22.0 && p0.z < 185.0;
    const pVistaCheck = startInCentralVista ? p0 : endInCentralVista ? p1 : null;
    const pOtherCheck = startInCentralVista ? p1 : endInCentralVista ? p0 : null;

    if (pVistaCheck && pOtherCheck && pOtherCheck.z > 0.0 && Math.abs(dTheta) > 0.45) {
      const pv = pVistaCheck;
      const po = pOtherCheck;
      const isInteriorLegPerch = po.y > 28.0; // e.g. #51 inside SW Pile 3 at y = 49.66 m
      const c1 = isInteriorLegPerch
        ? new THREE.Vector3(pv.x * 0.45 - 2.0, Math.max(pv.y + 12.0, 20.0), pv.z * 0.62 + po.z * 0.38)
        : new THREE.Vector3(-28.0, 15.0, 220.0);
      const c2 = isInteriorLegPerch
        ? new THREE.Vector3(po.x * 0.32, Math.min(po.y - 17.5, 34.0), po.z + 18.0)
        : new THREE.Vector3(Math.min(po.x - 9.0, -74.0), 10.5, 62.0);

      const southKnots = [p0];
      for (const s of interiorFracs) {
        const t = startInCentralVista ? s : 1.0 - s;
        const om = 1.0 - t;
        const pt = new THREE.Vector3(
          om * om * om * pv.x + 3.0 * om * om * t * c1.x + 3.0 * om * t * t * c2.x + t * t * t * po.x,
          om * om * om * pv.y + 3.0 * om * om * t * c1.y + 3.0 * om * t * t * c2.y + t * t * t * po.y,
          om * om * om * pv.z + 3.0 * om * om * t * c1.z + 3.0 * om * t * t * c2.z + t * t * t * po.z
        );
        const dToPo = pt.distanceTo(po);
        const wClear = isInteriorLegPerch
          ? smoothstepQuintic(clamp((dToPo - 10.0) / 18.0, 0.0, 1.0))
          : 1.0;
        if (wClear > 1e-4) {
          const repelledPt = pt.clone();
          repelPointFromTowerStructure(repelledPt, {
            extraMargin: 5.5,
            enforceInnerEsplanadeExclusion: false,
          });
          pt.lerp(repelledPt, wClear);
        }
        repelPointFromExpositionObstacles(pt, {
          extraMargin: 5.0,
          avoidTrees: true,
          preferAerialLift: true,
        });
        const minY = Math.max(2.1, localGroundElevation(pt.x, pt.z) + 1.9);
        if (pt.y < minY) pt.y = minY;
        southKnots.push(pt);
      }
      southKnots.push(p1);
      const southCurve = new THREE.CatmullRomCurve3(southKnots, false, 'centripetal', 0.5);
      southCurve.arcLengthDivisions = 3600;
      return southCurve;
    }

    // Elevated interior leg perch (#51 at [-26.97, 49.66, 27.20]) <-> nearby non-vista ground/pier stop
    // (e.g. #09 West Pier or #13 NW Caissons): climb/descend smoothly along the open West/NW flank outside
    // SW Pile 3 before entering/exiting the upper truss bay with zero hairpin repulsion kinks.
    const startIsLegPerch = p0.y > 28.0 && r0 < 62.0;
    const endIsLegPerch = p1.y > 28.0 && r1 < 62.0;
    if (
      startIsLegPerch !== endIsLegPerch &&
      !startInCentralVista &&
      !endInCentralVista &&
      Math.max(r0, r1) < 160.0
    ) {
      const pPerch = startIsLegPerch ? p0 : p1;
      const pExt = startIsLegPerch ? p1 : p0;
      const cExt = new THREE.Vector3(
        Math.min(pExt.x - 1.5, -58.0),
        Math.max(pExt.y + 18.0, 21.5),
        pExt.z < 10.0 ? lerp(pExt.z, pPerch.z, 0.35) : pExt.z - 11.0
      );
      const cPerch = new THREE.Vector3(
        Math.min(pPerch.x - 22.0, -49.0),
        pPerch.y - 7.5,
        pPerch.z - 13.5
      );
      const perchKnots = [p0];
      for (const s of interiorFracs) {
        const t = startIsLegPerch ? 1.0 - s : s; // t=0 at pExt -> t=1 at pPerch
        const om = 1.0 - t;
        const pt = new THREE.Vector3(
          om * om * om * pExt.x + 3.0 * om * om * t * cExt.x + 3.0 * om * t * t * cPerch.x + t * t * t * pPerch.x,
          om * om * om * pExt.y + 3.0 * om * om * t * cExt.y + 3.0 * om * t * t * cPerch.y + t * t * t * pPerch.y,
          om * om * om * pExt.z + 3.0 * om * om * t * cExt.z + 3.0 * om * t * t * cPerch.z + t * t * t * pPerch.z
        );
        const dToPerch = pt.distanceTo(pPerch);
        const wClear = smoothstepQuintic(clamp((dToPerch - 12.0) / 14.0, 0.0, 1.0));
        if (wClear > 1e-4) {
          const repelledPt = pt.clone();
          repelPointFromTowerStructure(repelledPt, {
            extraMargin: 3.2,
            enforceInnerEsplanadeExclusion: false,
          });
          repelPointFromExpositionObstacles(repelledPt, {
            extraMargin: 4.0,
            avoidTrees: true,
            preferAerialLift: true,
          });
          pt.lerp(repelledPt, wClear);
        }
        const minY = Math.max(2.1, localGroundElevation(pt.x, pt.z) + 1.9);
        if (pt.y < minY) pt.y = minY;
        perchKnots.push(pt);
      }
      perchKnots.push(p1);
      const perchCurve = new THREE.CatmullRomCurve3(perchKnots, false, 'centripetal', 0.5);
      perchCurve.arcLengthDivisions = 3600;
      return perchCurve;
    }

    const useCentralVistaCorridor =
      (startInCentralVista || endInCentralVista) && Math.abs(dTheta) > 0.55;

    const isSameSideFoundationSweep =
      Math.max(r0, r1) < 82.0 && chordLen < 88.0 && p0.x * p1.x > 0.0 && Math.max(p0.y, p1.y) < 18.0;

    // Aerial crane lift: composed low-tripod glide (`3.2 m`) on same-side foundation passes (`#13 <-> #09`),
    // gentle (`5.5..18 m`) on medium passes, sweeping cinema crane (`20..44 m`) on wide cross-field flights.
    const craneLiftM = isSameSideFoundationSweep
      ? 3.2
      : Math.abs(dTheta) > 0.75 && chordLen > 45.0
        ? chordLen <= 210.0
          ? clamp(chordLen * 0.088, 5.5, 18.0)
          : clamp(chordLen * 0.068, 20.0, 44.0)
        : 0.0;

    if (useCentralVistaCorridor) {
      const pVista = startInCentralVista ? p0 : p1;
      const pOther = startInCentralVista ? p1 : p0;
      const sideSign = pOther.x < -38.0 ? -1.0 : 1.0; // +1 sunlit East facade for #36 / #09
      const gateZ = 166.0;
      const gateX = sideSign * 26.0;
      const gateY = Math.max(26.5, Math.min(34.0, Math.max(pVista.y, pOther.y) + 25.5));
      const rGate = Math.hypot(gateX, gateZ);
      const thetaGate = Math.atan2(gateX, gateZ);
      const rOther = Math.max(2.0, Math.hypot(pOther.x, pOther.z));
      const thetaOther = Math.atan2(pOther.x, pOther.z);

      let dThetaParvis = thetaOther - thetaGate;
      while (dThetaParvis > Math.PI) dThetaParvis -= 2 * Math.PI;
      while (dThetaParvis < -Math.PI) dThetaParvis += 2 * Math.PI;
      if (sideSign > 0 && dThetaParvis < 0 && pOther.z < 0) {
        dThetaParvis += 2 * Math.PI;
      } else if (sideSign < 0 && dThetaParvis > 0 && pOther.z < 0) {
        dThetaParvis -= 2 * Math.PI;
      }
      // Ensure sweep passes on the intended side of the Tower axis
      if (Math.abs(dThetaParvis) > Math.PI * 1.05) {
        dThetaParvis = sideSign * (2 * Math.PI - Math.abs(dThetaParvis));
      }

      const vistaSpan = Math.max(40.0, pVista.z - gateZ);
      const parvisArcEst = Math.max(140.0, Math.abs(dThetaParvis) * 116.0 + Math.abs(rOther - 116.0) * 0.5);
      const tGate = clamp(vistaSpan / (vistaSpan + parvisArcEst), 0.22, 0.46);

      for (const s of interiorFracs) {
        const t = startInCentralVista ? s : 1.0 - s;
        let kx;
        let ky;
        let kz;
        if (t <= tGate) {
          const u1 = clamp(t / tGate, 0.0, 1.0);
          kx = lerp(pVista.x, gateX, u1 * u1);
          kz = lerp(pVista.z, gateZ, u1);
          ky = lerp(pVista.y, gateY, Math.sin(0.5 * Math.PI * u1));
        } else {
          const u2 = clamp((t - tGate) / (1.0 - tGate), 0.0, 1.0);
          const sin2 = Math.sin(Math.PI * u2);
          const th = thetaGate + dThetaParvis * u2;
          const rBase = lerp(rGate, rOther, u2);
          const rParvis = lerp(rBase, 114.0, 0.68 * sin2);
          kx = rParvis * Math.sin(th);
          kz = rParvis * Math.cos(th);
          const smoothU2 = u2 * u2 * (3.0 - 2.0 * u2);
          ky = lerp(gateY, pOther.y, smoothU2) + 4.0 * sin2;
        }

        const knot = new THREE.Vector3(kx, ky, kz);
        repelPointFromTowerStructure(knot, {
          extraMargin: 8.5,
          enforceInnerEsplanadeExclusion: knot.y < 58.0,
        });
        repelPointFromExpositionObstacles(knot, {
          extraMargin: 5.5,
          avoidTrees: true,
          preferAerialLift: true,
        });
        const minKnotY = Math.max(2.1, localGroundElevation(knot.x, knot.z) + 1.9);
        if (knot.y < minKnotY) knot.y = minKnotY;
        knots.push(knot);
      }
    } else {
      for (const s of interiorFracs) {
        const sinEnvelope = Math.sin(Math.PI * s);
        const thetaS = theta0 + dTheta * s;

        const rLin = lerp(r0, r1, s);
        const rGeo =
          r0 > 2.0 && r1 > 2.0 ? Math.pow(r0, 1 - s) * Math.pow(r1, s) : rLin;
        let rS = 0.68 * rLin + 0.32 * rGeo;

        // Keep cross-azimuthal arcs gracefully outside the diagonal plinths (`R >= 98m`)
        // when sweeping > 45° across a diagonal pier; keep short same-side foundation passes (`#13 <-> #09`)
        // on a close, unhurried `R ~ 68m` path between the West piers rather than flinging out to `96m`.
        let yS = lerp(p0.y, p1.y, s) + craneLiftM * sinEnvelope;
        if (Math.abs(dTheta) > 0.78 && yS < 64.0) {
          const safeSweepR = isSameSideFoundationSweep
            ? Math.max(r0, r1, 68.0)
            : Math.min(Math.max(r0, r1, 96.0), 112.0);
          if (rS < safeSweepR) {
            rS = lerp(rS, safeSweepR, sinEnvelope);
          }
        }

        const knot = new THREE.Vector3(
          rS * Math.sin(thetaS),
          yS,
          rS * Math.cos(thetaS)
        );

        repelPointFromTowerStructure(knot, {
          extraMargin: 8.5,
          enforceInnerEsplanadeExclusion: Math.abs(dTheta) > 0.85 && yS < 58.0,
        });
        repelPointFromExpositionObstacles(knot, {
          extraMargin: 5.5,
          avoidTrees: true,
          preferAerialLift: true,
        });

        const minKnotY = Math.max(2.1, localGroundElevation(knot.x, knot.z) + 1.9);
        if (knot.y < minKnotY) {
          knot.y = minKnotY;
        }

        knots.push(knot);
      }
    }

    knots.push(p1);

    // Dense 2-pass spline clearance verification: if cubic interpolation between interior knots
    // dips near any Tower pier or Exposition pavilion/dome/awning, lift/repel the nearest knot
    let helicalCurve = new THREE.CatmullRomCurve3(knots, false, 'centripetal', 0.5);
    const probe = new THREE.Vector3();
    for (let pass = 0; pass < 2; pass += 1) {
      let adjustedAny = false;
      for (let i = 1; i <= 64; i += 1) {
        const u = i / 65;
        if (u <= 0.04 || u >= 0.96) continue;
        helicalCurve.getPoint(u, probe);
        const beforeX = probe.x;
        const beforeY = probe.y;
        const beforeZ = probe.z;
        const c1 = repelPointFromTowerStructure(probe, {
          extraMargin: 5.5,
          enforceInnerEsplanadeExclusion: Math.abs(dTheta) > 0.85 && probe.y < 56.0,
        });
        const c2 = repelPointFromExpositionObstacles(probe, {
          extraMargin: 4.8,
          avoidTrees: true,
          preferAerialLift: true,
        });
        const minY = Math.max(2.0, localGroundElevation(probe.x, probe.z) + 1.8);
        const c3 = probe.y < minY;
        if (c3) probe.y = minY;
        if (c1 || c2 || c3) {
          const kIdx = clamp(Math.round(u * (knots.length - 1)), 1, knots.length - 2);
          knots[kIdx].x += (probe.x - beforeX) * 0.65;
          knots[kIdx].y = Math.max(knots[kIdx].y, knots[kIdx].y + (probe.y - beforeY) * 1.05);
          knots[kIdx].z += (probe.z - beforeZ) * 0.65;
          adjustedAny = true;
        }
      }
      if (!adjustedAny) break;
      helicalCurve = new THREE.CatmullRomCurve3(knots, false, 'centripetal', 0.5);
    }

    helicalCurve.arcLengthDivisions = 3600;
    return helicalCurve;
  }

  // ===========================================================================
  // Unified Flight Starter (Portal -> Portal, Portal -> Free, Free -> Portal, Free -> Free)
  // ===========================================================================

  beginFlight({
    endCanonical,
    vpWidth,
    vpHeight,
    durationSec = 1.4,
    kind = 'flight',
    startRect = null,
    endRect = null,
    onProgress = null,
    onComplete = null,
  } = {}) {
    const W = Math.max(1, vpWidth);
    const H = Math.max(1, vpHeight);
    const aspect = W / H;

    // 1. Snapshot exact pre-move landmark pixel positions BEFORE touching anything
    const preSnap = this.captureLandmarkScreenPositions(W, H);

    const wasMoving = this.isActive();
    const carryVelPos = wasMoving ? [...this._velPos] : [0, 0, 0];
    const carryVelFocal = wasMoving ? [...this._velFocal] : [0, 0, 0];
    const carryVelTan = wasMoving ? this._velTanHalfY : 0;
    const carryVelSX = wasMoving ? this._velShiftX : 0;
    const carryVelSY = wasMoving ? this._velShiftY : 0;

    if (wasMoving) {
      this._telemetry.interruptionCount += 1;
    }

    // Cancel any previous pending flight/release without snapping
    this._flight = null;
    this._release = null;

    if (this.controls) {
      this.controls.enabled = false;
      flushOrbitControlsMomentum(this.controls, { spherical: true, pan: true, scale: true });
    }

    // 2. Extract exact live camera canonical state (`0.000000 px` delta)
    const startCanonical = this.extractLiveCanonicalState(W, H);
    const T = Math.max(0.22, Number(durationSec) || 1.4);

    // 3. Precompute helical exterior trajectory & exact endpoint roll-residual quaternions
    const posCurve = this._buildHelicalFlightCurve(
      startCanonical.position,
      endCanonical.position
    );

    const qStart = new this.THREE.Quaternion(...startCanonical.quaternion).normalize();
    const qEnd = new this.THREE.Quaternion(...endCanonical.quaternion).normalize();

    const qAimStart = this._computeShiftedAimQuaternion(
      startCanonical.position,
      startCanonical.focalPoint,
      startCanonical.tanHalfY * aspect,
      startCanonical.tanHalfY,
      startCanonical.shiftX,
      startCanonical.shiftY,
      new this.THREE.Quaternion()
    );
    const dqStart = qAimStart.clone().invert().multiply(qStart).normalize();
    if (dqStart.w < 0) {
      dqStart.set(-dqStart.x, -dqStart.y, -dqStart.z, -dqStart.w);
    }

    const qAimEnd = this._computeShiftedAimQuaternion(
      endCanonical.position,
      endCanonical.focalPoint,
      endCanonical.tanHalfY * aspect,
      endCanonical.tanHalfY,
      endCanonical.shiftX,
      endCanonical.shiftY,
      new this.THREE.Quaternion()
    );
    const dqEnd = qAimEnd.clone().invert().multiply(qEnd).normalize();
    if (dqStart.dot(dqEnd) < 0) {
      dqEnd.set(-dqEnd.x, -dqEnd.y, -dqEnd.z, -dqEnd.w);
    }

    // Azimuth delta for optional mid-flight focal centering toward Tower spine
    const thetaA = Math.atan2(startCanonical.position[0], startCanonical.position[2]);
    const thetaB = Math.atan2(endCanonical.position[0], endCanonical.position[2]);
    const dThetaSigned = shortestAngleDelta(thetaA, thetaB);
    const absDTheta = Math.abs(dThetaSigned);
    const rStartXZ = Math.hypot(startCanonical.position[0], startCanonical.position[2]);
    const rEndXZ = Math.hypot(endCanonical.position[0], endCanonical.position[2]);
    const telePos = rStartXZ >= rEndXZ ? startCanonical.position : endCanonical.position;
    const nearPos = rStartXZ >= rEndXZ ? endCanonical.position : startCanonical.position;
    const isTelephotoAxialFoundations =
      Math.max(rStartXZ, rEndXZ) > 900.0 &&
      Math.min(rStartXZ, rEndXZ) < 95.0 &&
      telePos[2] > 900.0 &&
      nearPos[2] > -35.0;
    const isTelephotoDollyZoom =
      !isTelephotoAxialFoundations &&
      Math.max(rStartXZ, rEndXZ) > 900.0 &&
      Math.min(rStartXZ, rEndXZ) > 25.0;

    // Detect close-focal oblique gaze reversals (`#13 <-> #09` and `#09 <-> #23`) where linear
    // world-space `focalPoint` interpolation passes right beside the moving camera (`658 deg/s` whip).
    // Rotating the gaze offset `(focal - pos)` smoothly across the inward Tower-facing side eliminates
    // the pole singularity while preserving exact `f(0) === fA` and `f(1) === fB` (`0.000 px` jump).
    const offAx = startCanonical.focalPoint[0] - startCanonical.position[0];
    const offAy = startCanonical.focalPoint[1] - startCanonical.position[1];
    const offAz = startCanonical.focalPoint[2] - startCanonical.position[2];
    const offBx = endCanonical.focalPoint[0] - endCanonical.position[0];
    const offBy = endCanonical.focalPoint[1] - endCanonical.position[1];
    const offBz = endCanonical.focalPoint[2] - endCanonical.position[2];
    const gazeROffA = Math.hypot(offAx, offAz);
    const gazeROffB = Math.hypot(offBx, offBz);
    const gazeDotXZ =
      gazeROffA > 2.0 && gazeROffB > 2.0
        ? (offAx * offBx + offAz * offBz) / (gazeROffA * gazeROffB)
        : 1.0;
    const isCloseInteriorPerchFlight =
      (startCanonical.position[1] > 28.0 && rStartXZ < 62.0) !==
        (endCanonical.position[1] > 28.0 && rEndXZ < 62.0) &&
      Math.max(rStartXZ, rEndXZ) < 160.0;
    const useInwardAzimuthGaze =
      !wasMoving &&
      !isTelephotoDollyZoom &&
      !isTelephotoAxialFoundations &&
      gazeROffA > 2.0 &&
      gazeROffB > 2.0 &&
      (gazeDotXZ < -0.15 || (isCloseInteriorPerchFlight && gazeDotXZ < 0.35)) &&
      absDTheta < 1.75;
    let gazeAzA = 0.0;
    let gazeDAz = 0.0;
    if (useInwardAzimuthGaze) {
      gazeAzA = Math.atan2(offAx, offAz);
      const gazeAzB = Math.atan2(offBx, offBz);
      const dShort = shortestAngleDelta(gazeAzA, gazeAzB);
      const dLong = dShort >= 0.0 ? dShort - Math.PI * 2.0 : dShort + Math.PI * 2.0;
      const midPt = posCurve
        ? posCurve.getPointAt(0.5)
        : {
            x: 0.5 * (startCanonical.position[0] + endCanonical.position[0]),
            z: 0.5 * (startCanonical.position[2] + endCanonical.position[2]),
          };
      const azToTower = Math.atan2(-midPt.x, -midPt.z);
      const scoreShort = Math.cos(gazeAzA + 0.5 * dShort - azToTower);
      const scoreLong = Math.cos(gazeAzA + 0.5 * dLong - azToTower);
      gazeDAz = scoreShort >= scoreLong ? dShort : dLong;
    }

    const startClearanceM = computeStructuralClearanceM(
      startCanonical.position[0],
      startCanonical.position[1],
      startCanonical.position[2]
    );
    const endClearanceM = computeStructuralClearanceM(
      endCanonical.position[0],
      endCanonical.position[1],
      endCanonical.position[2]
    );
    const isExteriorFlight = startClearanceM >= 0.0 && endClearanceM >= 0.0;

    this._flight = {
      kind,
      elapsed: 0,
      duration: T,
      vpWidth: W,
      vpHeight: H,
      startCanonical,
      endCanonical,
      posCurve,
      dqStart,
      dqEnd,
      thetaA,
      dThetaSigned,
      rStartXZ,
      rEndXZ,
      isTelephotoDollyZoom,
      isTelephotoAxialFoundations,
      useInwardAzimuthGaze,
      gazeAzA,
      gazeDAz,
      gazeROffA,
      gazeROffB,
      gazeYOffA: offAy,
      gazeYOffB: offBy,
      absDTheta,
      isExteriorFlight,
      wasMoving,
      carryVelPos,
      carryVelFocal,
      carryVelTan,
      carryVelSX,
      carryVelSY,
      startRect: startRect ? { ...startRect } : null,
      endRect: endRect ? { ...endRect } : null,
      onProgress,
      onComplete,
    };

    // 4. Evaluate frame 0 (`elapsed = 0`) and record exact onset projection jump (`px`)
    this._evaluateActiveFlightAt(0, W, H, 0);
    const postSnap = this.captureLandmarkScreenPositions(W, H);
    const onsetJumpPx = this.measureMaxLandmarkJumpPx(preSnap, postSnap);

    this._prevSamplePos = [...startCanonical.position];
    this._prevSampleFocal = [...startCanonical.focalPoint];
    this._prevSampleQuat.copy(this.camera.quaternion);

    this._telemetry.transitionCount += 1;
    this._telemetry.lastTransitionKind = kind;
    this._telemetry.lastOnsetJumpPx = Number(onsetJumpPx.toFixed(6));
    if (onsetJumpPx > this._telemetry.maxOnsetJumpPx) {
      this._telemetry.maxOnsetJumpPx = Number(onsetJumpPx.toFixed(6));
    }
    this._telemetry.history.push({
      kind,
      onsetJumpPx: Number(onsetJumpPx.toFixed(6)),
      interruptedActiveMotion: wasMoving,
      durationSec: T,
    });
  }

  _evaluateActiveFlightAt(tau, vpWidth, vpHeight, dtForVel = 0) {
    const fl = this._flight;
    if (!fl) return null;

    const u = clamp(tau, 0, 1);
    const e = easeCameraFlight(u);
    const T = fl.duration;
    const W = Math.max(1, vpWidth);
    const H = Math.max(1, vpHeight);
    const aspect = W / H;

    // C¹ Hermite initial-velocity carry-over `w(u) = u * (1 - u)^3` (`w(0)=0, w'(0)=1, w(1)=w'(1)=0`)
    const oneMinusU = 1.0 - u;
    const hermiteW = fl.wasMoving ? u * oneMinusU * oneMinusU * oneMinusU : 0.0;

    const isWideToTeleInwardGaze =
      fl.useInwardAzimuthGaze && Math.max(fl.rStartXZ, fl.rEndXZ) > 180.0;
    const isCloseToTelePerch =
      !isWideToTeleInwardGaze &&
      Math.max(fl.rStartXZ, fl.rEndXZ) > 180.0 &&
      Math.min(fl.rStartXZ, fl.rEndXZ) < 75.0 &&
      Math.min(fl.startCanonical.tanHalfY, fl.endCanonical.tanHalfY) < 0.14;
    const fromCloseInward = fl.rStartXZ < fl.rEndXZ;
    const sCloseInward = fromCloseInward ? e : 1.0 - e;

    // 1. Position along arc-length-parameterized helical curve (or log-radial telephoto dolly-zoom
    //    synchronized with `tanHalfY(e)` so apparent Tower height stays constant across `11 <-> 12`)
    if (fl.isTelephotoDollyZoom) {
      if (u <= 0.0) {
        this._tmpVecA.set(...fl.startCanonical.position);
      } else if (u >= 1.0) {
        this._tmpVecA.set(...fl.endCanonical.position);
      } else {
        const rGeo = Math.pow(fl.rStartXZ, 1.0 - e) * Math.pow(fl.rEndXZ, e);
        const thNow = fl.thetaA + fl.dThetaSigned * e;
        this._tmpVecA.set(
          rGeo * Math.sin(thNow),
          lerp(fl.startCanonical.position[1], fl.endCanonical.position[1], e),
          rGeo * Math.cos(thNow)
        );
      }
    } else if (fl.isTelephotoAxialFoundations) {
      // Axial Champ-de-Mars Telephoto <-> Inner Parvis/Foundations (#55 <-> #13):
      // Glides straight down the grand central axis (`|x| <= 18 m` through the 74 m South Arch,
      // >27 m above Dôme Central & >35 m above Fontaine Coutan, 100% clear of all 4 piers)
      // while facing North throughout (`< 16 deg/s` calm gaze alignment, zero end-whip).
      if (u <= 0.0) {
        this._tmpVecA.set(...fl.startCanonical.position);
      } else if (u >= 1.0) {
        this._tmpVecA.set(...fl.endCanonical.position);
      } else {
        const fromTele = fl.rStartXZ >= fl.rEndXZ;
        const pTele = fromTele ? fl.startCanonical.position : fl.endCanonical.position;
        const pNear = fromTele ? fl.endCanonical.position : fl.startCanonical.position;
        const t = fromTele ? e : 1.0 - e;
        const om = 1.0 - t;
        const zShift = 68.0;
        const zNow =
          (pTele[2] + zShift) * Math.pow((pNear[2] + zShift) / (pTele[2] + zShift), t) - zShift;
        const xNow = lerp(pTele[0], pNear[0], t * t * t * t);
        const yNow =
          om * om * om * pTele[1] +
          3.0 * om * om * t * 128.0 +
          3.0 * om * t * t * 18.0 +
          t * t * t * pNear[1];
        this._tmpVecA.set(xNow, yNow, zNow);
      }
    } else if (!fl.posCurve) {
      this._tmpVecA.set(
        lerp(fl.startCanonical.position[0], fl.endCanonical.position[0], e),
        lerp(fl.startCanonical.position[1], fl.endCanonical.position[1], e),
        lerp(fl.startCanonical.position[2], fl.endCanonical.position[2], e)
      );
    } else if (u <= 0.0) {
      this._tmpVecA.set(...fl.startCanonical.position);
    } else if (u >= 1.0) {
      this._tmpVecA.set(...fl.endCanonical.position);
    } else {
      const eCurve = isWideToTeleInwardGaze
        ? fromCloseInward
          ? sCloseInward * sCloseInward * (0.45 + 0.55 * sCloseInward)
          : 1.0 - sCloseInward * sCloseInward * (0.45 + 0.55 * sCloseInward)
        : e;
      fl.posCurve.getPointAt(clamp(eCurve, 0.0, 0.9999999), this._tmpVecA);
    }
    const curvePt = this._tmpVecA;
    let px = curvePt.x + clamp(fl.carryVelPos[0] * T, -2400, 2400) * hermiteW;
    let py = curvePt.y + clamp(fl.carryVelPos[1] * T, -1200, 1200) * hermiteW;
    let pz = curvePt.z + clamp(fl.carryVelPos[2] * T, -2400, 2400) * hermiteW;

    if (fl.wasMoving && u > 0.02 && u < 0.98) {
      // Blend obstacle & ground-floor enforcement smoothly via `sin(pi * u)` so `u -> 0`
      // preserves 100% exact C¹ velocity tangent (`dv = 0` at interruption frame)
      const safetyBlend = smoothstepQuintic(Math.min(1.0, u / 0.18)) * smoothstepQuintic(Math.min(1.0, (1.0 - u) / 0.18));
      this._tmpVecB.set(px, py, pz);
      if (fl.isExteriorFlight) {
        repelPointFromTowerStructure(this._tmpVecB, {
          extraMargin: 5.0,
          enforceInnerEsplanadeExclusion: false,
        });
        repelPointFromExpositionObstacles(this._tmpVecB, {
          extraMargin: 4.5,
          avoidTrees: true,
          preferAerialLift: true,
        });
      }
      const minY = Math.max(1.9, localGroundElevation(this._tmpVecB.x, this._tmpVecB.z) + 1.7);
      if (this._tmpVecB.y < minY) this._tmpVecB.y = minY;
      px = lerp(px, this._tmpVecB.x, safetyBlend);
      py = lerp(py, this._tmpVecB.y, safetyBlend);
      pz = lerp(pz, this._tmpVecB.z, safetyBlend);
    }

    // 2. Focal anchor trajectory (pulled gently toward Tower axis on wide cross-quadrant sweeps)
    const fA = fl.startCanonical.focalPoint;
    const fB = fl.endCanonical.focalPoint;
    let fx = lerp(fA[0], fB[0], e) + clamp(fl.carryVelFocal[0] * T, -120, 120) * hermiteW;
    let fy = lerp(fA[1], fB[1], e) + clamp(fl.carryVelFocal[1] * T, -80, 80) * hermiteW;
    let fz = lerp(fA[2], fB[2], e) + clamp(fl.carryVelFocal[2] * T, -120, 120) * hermiteW;

    if (fl.isTelephotoAxialFoundations && u > 0.0 && u < 1.0) {
      const fromTele = fl.rStartXZ >= fl.rEndXZ;
      const fTele = fromTele ? fA : fB;
      const fNear = fromTele ? fB : fA;
      const t = fromTele ? e : 1.0 - e;
      const om = 1.0 - t;
      fx = lerp(fTele[0], fNear[0], Math.pow(t, 2.8)) + clamp(fl.carryVelFocal[0] * T, -120, 120) * hermiteW;
      fy =
        om * om * om * fTele[1] +
        3.0 * om * om * t * 112.0 +
        3.0 * om * t * t * 14.0 +
        t * t * t * fNear[1] +
        clamp(fl.carryVelFocal[1] * T, -80, 80) * hermiteW;
      fz = lerp(fTele[2], fNear[2], Math.pow(t, 2.4)) + clamp(fl.carryVelFocal[2] * T, -120, 120) * hermiteW;
    } else if (fl.useInwardAzimuthGaze && u > 0.0 && u < 1.0) {
      const eAz = isWideToTeleInwardGaze
        ? fromCloseInward
          ? sCloseInward + 0.48 * sCloseInward * (1.0 - sCloseInward)
          : 1.0 - (sCloseInward + 0.48 * sCloseInward * (1.0 - sCloseInward))
        : e;
      const azNow = fl.gazeAzA + fl.gazeDAz * eAz;
      const rOffNow = Math.exp(lerp(Math.log(fl.gazeROffA), Math.log(fl.gazeROffB), e));
      const yOffNow = lerp(fl.gazeYOffA, fl.gazeYOffB, e);
      fx = curvePt.x + rOffNow * Math.sin(azNow) + clamp(fl.carryVelFocal[0] * T, -120, 120) * hermiteW;
      fy = curvePt.y + yOffNow + clamp(fl.carryVelFocal[1] * T, -80, 80) * hermiteW;
      fz = curvePt.z + rOffNow * Math.cos(azNow) + clamp(fl.carryVelFocal[2] * T, -120, 120) * hermiteW;
    } else if (fl.absDTheta > 0.95) {
      const spinePull = 0.55 * Math.sin(Math.PI * e) * clamp((fl.absDTheta - 0.95) / 1.8, 0, 1);
      fx = lerp(fx, 0.0, spinePull);
      fz = lerp(fz, 0.0, spinePull);
    }

    // 3. Intrinsic lens interpolation (log-linear on tanHalfY prevents wide-to-telephoto zoom sag;
    // on wide-to-telephoto inward sweeps (`#09 <-> #23`) and close interior-perch sweeps (`#51 <-> #23`),
    // keep the wide lens open near the Tower so piers/arches stay cleanly framed before telephoto zoom)
    const eLens =
      isWideToTeleInwardGaze || isCloseToTelePerch
        ? fromCloseInward
          ? sCloseInward * sCloseInward
          : 1.0 - sCloseInward * sCloseInward
        : e;
    const tanA = Math.max(1e-4, fl.startCanonical.tanHalfY);
    const tanB = Math.max(1e-4, fl.endCanonical.tanHalfY);
    const logTan = lerp(Math.log(tanA), Math.log(tanB), eLens);
    const tanHalfY = Math.max(
      0.005,
      Math.exp(logTan) + clamp(fl.carryVelTan * T, -0.6, 0.6) * hermiteW
    );
    const tanHalfX = tanHalfY * aspect;

    const shiftX =
      lerp(fl.startCanonical.shiftX, fl.endCanonical.shiftX, eLens) +
      clamp(fl.carryVelSX * T, -0.8, 0.8) * hermiteW;
    const shiftY =
      lerp(fl.startCanonical.shiftY, fl.endCanonical.shiftY, eLens) +
      clamp(fl.carryVelSY * T, -0.8, 0.8) * hermiteW;

    // Smooth near/far depth-range progression (handles interior portal #51 near=18.6m & telephoto #55 near=600m
    // strictly inside the spatial interior/telephoto zone so exterior approach NEVER near-clips Pile 3 or Paris!)
    const nearA = Number.isFinite(fl.startCanonical.near) ? fl.startCanonical.near : 0.45;
    const nearB = Number.isFinite(fl.endCanonical.near) ? fl.endCanonical.near : 0.45;
    const farA = Number.isFinite(fl.startCanonical.far) ? fl.startCanonical.far : 4500.0;
    const farB = Number.isFinite(fl.endCanonical.far) ? fl.endCanonical.far : 4500.0;
    let nearNow = lerp(nearA, nearB, e);
    if (
      (nearB > 2.0 && nearB <= 40.0 && nearA <= 2.0) ||
      (nearA > 2.0 && nearA <= 40.0 && nearB <= 2.0)
    ) {
      // Interior lattice portal (#51 at [-26.9746, 49.6649, 27.1967]):
      // Keep base near (0.45..0.55m) everywhere outside SW Pile 3 and ramp smoothly to 18.6m
      // across the 15.0m -> 2.0m truss entry around #51 so foreground struts never flash close to the lens.
      const d51 = Math.hypot(px - -26.9746, py - 49.6649, pz - 27.1967);
      const baseNear = Math.min(nearA, nearB);
      const interiorNear = Math.max(nearA, nearB);
      const tInterior = smoothstepQuintic(clamp((15.0 - d51) / (15.0 - 2.0), 0.0, 1.0));
      nearNow = u <= 0.0 ? nearA : u >= 1.0 ? nearB : lerp(baseNear, interiorNear, tInterior);
    } else if (fl.isTelephotoDollyZoom || fl.isTelephotoAxialFoundations || Math.max(nearA, nearB) > 100.0) {
      const rNowXZ = Math.hypot(px, pz);
      const baseNear = Math.min(nearA, nearB);
      const teleNear = Math.max(nearA, nearB);
      const tTele = clamp((rNowXZ - 1800.0) / 1800.0, 0.0, 1.0);
      nearNow = u <= 0.0 ? nearA : u >= 1.0 ? nearB : lerp(baseNear, teleNear, tTele);
    }
    const farNow = Math.max(4500.0, lerp(farA, farB, e), Math.hypot(px, pz) + 2400.0);

    // 4. Tower-anchored orientation (`q(0) === qStart`, `q(1) === qEnd` identically!)
    this._computeShiftedAimQuaternion(
      [px, py, pz],
      [fx, fy, fz],
      tanHalfX,
      tanHalfY,
      shiftX,
      shiftY,
      this._tmpQuatAim
    );
    this._tmpQuatRoll.copy(fl.dqStart).slerp(fl.dqEnd, e);
    this._tmpQuatAim.multiply(this._tmpQuatRoll).normalize();

    const stateNow = {
      position: [px, py, pz],
      quaternion: [
        this._tmpQuatAim.x,
        this._tmpQuatAim.y,
        this._tmpQuatAim.z,
        this._tmpQuatAim.w,
      ],
      tanHalfY,
      shiftX,
      shiftY,
      focalPoint: [fx, fy, fz],
      near: nearNow,
      far: farNow,
    };

    this.applyCanonicalState(stateNow, W, H);

    // 5. Update instantaneous velocity estimates for smooth mid-flight interruption
    if (dtForVel > 1e-5 && this._prevSamplePos) {
      const vx = (px - this._prevSamplePos[0]) / dtForVel;
      const vy = (py - this._prevSamplePos[1]) / dtForVel;
      const vz = (pz - this._prevSamplePos[2]) / dtForVel;
      this._velPos = [vx, vy, vz];

      const deDt = easeCameraFlightDeriv(u) / T;
      if (this._prevSampleFocal) {
        this._velFocal = [
          (fx - this._prevSampleFocal[0]) / dtForVel,
          (fy - this._prevSampleFocal[1]) / dtForVel,
          (fz - this._prevSampleFocal[2]) / dtForVel,
        ];
      } else {
        this._velFocal = [(fB[0] - fA[0]) * deDt, (fB[1] - fA[1]) * deDt, (fB[2] - fA[2]) * deDt];
      }
      this._velTanHalfY = tanHalfY * (Math.log(tanB) - Math.log(tanA)) * deDt;
      this._velShiftX = (fl.endCanonical.shiftX - fl.startCanonical.shiftX) * deDt;
      this._velShiftY = (fl.endCanonical.shiftY - fl.startCanonical.shiftY) * deDt;
    }
    this._prevSampleFocal = [fx, fy, fz];

    let rectNow = null;
    if (fl.startRect && fl.endRect) {
      rectNow = {
        x: lerp(fl.startRect.x, fl.endRect.x, e),
        y: lerp(fl.startRect.y, fl.endRect.y, e),
        width: lerp(fl.startRect.width, fl.endRect.width, e),
        height: lerp(fl.startRect.height, fl.endRect.height, e),
      };
    } else if (fl.endRect) {
      rectNow = { ...fl.endRect };
    } else if (fl.startRect) {
      rectNow = { ...fl.startRect };
    }

    return { u, e, stateNow, rectNow };
  }

  // ===========================================================================
  // Zero-Jump Rising-Front Drag-to-Orbit Release (`0.000 px` Onset & Handoff)
  // ===========================================================================

  /**
   * Releases from ANY locked or mid-flight camera state (including asymmetric rising-front
   * `setViewOffset` lenses like `#23` at `-75.4%` shift / `13.26°` FOV or portrait mobile
   * `123°` aspect-fitted lenses) into constrained interactive free orbit with `0.000 px` jump!
   */
  beginOrbitRelease({
    vpWidth,
    vpHeight,
    durationSec = 0.65,
    onComplete = null,
  } = {}) {
    const W = Math.max(1, vpWidth);
    const H = Math.max(1, vpHeight);
    const aspect = W / H;

    const preSnap = this.captureLandmarkScreenPositions(W, H);

    this._flight = null;
    this._release = null;

    if (this.controls) {
      this.controls.enabled = false;
      flushOrbitControlsMomentum(this.controls, { spherical: true, pan: true, scale: true });
    }

    const startCanonical = this.extractLiveCanonicalState(W, H);
    const startFovDeg = 2.0 * Math.atan(startCanonical.tanHalfY) * RAD2DEG;

    // Natural settled free-orbit vertical FOV (desktop 30°..46°, portrait mobile 42°..56°)
    const settledFovDeg =
      aspect < 0.82 ? clamp(startFovDeg, 42.0, 56.0) : clamp(startFovDeg, 30.0, 46.0);
    const settledTanHalfY = Math.tan(settledFovDeg * 0.5 * DEG2RAD);

    // Exact ray-anchor target at t = 0 (`ndc = (0,0)` projects here with 0.000 px error!)
    const target0 = [...startCanonical.focalPoint];

    // Dolly-compensated initial spherical offset so changing extreme telephoto (`#23` 16.5°)
    // or portrait-mobile wide (`#38` 123°) FOV to `settledFovDeg` preserves apparent Tower scale!
    const rawOffset0 = new this.THREE.Vector3(
      startCanonical.position[0] - target0[0],
      startCanonical.position[1] - target0[1],
      startCanonical.position[2] - target0[2]
    );
    const sph0 = new this.THREE.Spherical().setFromVector3(rawOffset0);
    const isTelephotoRelease = sph0.radius > 900.0;
    const scaleCompensation = isTelephotoRelease
      ? clamp(startCanonical.tanHalfY / Math.max(1e-4, settledTanHalfY), 0.08, 1.0)
      : Math.pow(
          clamp(startCanonical.tanHalfY / Math.max(1e-4, settledTanHalfY), 0.35, 2.8),
          0.72
        );
    const rawDesiredRadius = clamp(
      sph0.radius * scaleCompensation,
      28.0,
      isTelephotoRelease ? 525.0 : 540.0
    );

    const rawCandidateOffset = new this.THREE.Vector3().setFromSphericalCoords(
      rawDesiredRadius,
      clamp(sph0.phi, 0.36, 1.82),
      sph0.theta
    );
    const rawCandidateTarget = [
      clamp(target0[0], -36.0, 36.0),
      clamp(target0[1], 10.0, 285.0),
      clamp(target0[2], -36.0, 36.0),
    ];
    const rawCandidatePos = [
      rawCandidateTarget[0] + rawCandidateOffset.x,
      rawCandidateTarget[1] + rawCandidateOffset.y,
      rawCandidateTarget[2] + rawCandidateOffset.z,
    ];

    // Solve exact legal constrained pose at u = 1 so handoff to OrbitControls has 0.000 px snap
    let legalEnd = { position: rawCandidatePos, target: rawCandidateTarget };
    if (this.viewportConstraints?.solveLegalPose) {
      legalEnd = this.viewportConstraints.solveLegalPose({
        position: rawCandidatePos,
        target: rawCandidateTarget,
        fov: settledFovDeg,
        aspect,
      });
    }

    const offset1Vec = new this.THREE.Vector3(
      legalEnd.position[0] - legalEnd.target[0],
      legalEnd.position[1] - legalEnd.target[1],
      legalEnd.position[2] - legalEnd.target[2]
    );
    const sph1 = new this.THREE.Spherical().setFromVector3(offset1Vec);

    // Exact initial roll residual around `ndc = (0,0)` ray so `q(0) === qStart`
    const qStart = new this.THREE.Quaternion(...startCanonical.quaternion).normalize();
    const qAim0 = this._computeShiftedAimQuaternion(
      startCanonical.position,
      target0,
      startCanonical.tanHalfY * aspect,
      startCanonical.tanHalfY,
      startCanonical.shiftX,
      startCanonical.shiftY,
      new this.THREE.Quaternion()
    );
    const dqRoll0 = qAim0.clone().invert().multiply(qStart).normalize();
    if (dqRoll0.w < 0) {
      dqRoll0.set(-dqRoll0.x, -dqRoll0.y, -dqRoll0.z, -dqRoll0.w);
    }

    this._release = {
      elapsed: 0,
      duration: Math.max(0.25, Number(durationSec) || 0.65),
      vpWidth: W,
      vpHeight: H,
      startCanonical,
      settledFovDeg,
      settledTanHalfY,
      target0,
      target1: legalEnd.target,
      sph0: { radius: sph0.radius, phi: sph0.phi, theta: sph0.theta },
      sph1: { radius: sph1.radius, phi: sph1.phi, theta: sph1.theta },
      dThetaBase: shortestAngleDelta(sph0.theta, sph1.theta),
      dqRoll0,
      targetDragTheta: 0,
      targetDragPhi: 0,
      targetZoomScale: 1.0,
      curDragTheta: 0,
      curDragPhi: 0,
      curZoomScale: 1.0,
      onComplete,
    };

    // Apply frame 0 (`u = 0`) and record exact onset pixel jump
    this._evaluateActiveReleaseAt(0, W, H);
    const postSnap = this.captureLandmarkScreenPositions(W, H);
    const onsetJumpPx = this.measureMaxLandmarkJumpPx(preSnap, postSnap);

    this._prevSamplePos = [...startCanonical.position];
    this._prevSampleQuat.copy(this.camera.quaternion);

    this._telemetry.transitionCount += 1;
    this._telemetry.lastTransitionKind = 'orbit_release';
    this._telemetry.lastOnsetJumpPx = Number(onsetJumpPx.toFixed(6));
    if (onsetJumpPx > this._telemetry.maxOnsetJumpPx) {
      this._telemetry.maxOnsetJumpPx = Number(onsetJumpPx.toFixed(6));
    }
    this._telemetry.history.push({
      kind: 'orbit_release',
      onsetJumpPx: Number(onsetJumpPx.toFixed(6)),
      durationSec: this._release.duration,
    });
  }

  /**
   * Accumulates live user pointer drag `(dxPx, dyPx)` smoothly during the `0.65s` release
   * unshift window before `OrbitControls` takes over natively.
   */
  addReleaseDragDelta(dxPx, dyPx) {
    if (!this._release) return;
    const H = Math.max(300, this._release.vpHeight || 900);
    const rotScale = (2.0 * Math.PI * 0.52) / H;
    this._release.targetDragTheta -= (Number(dxPx) || 0) * rotScale;
    this._release.targetDragPhi = clamp(
      this._release.targetDragPhi - (Number(dyPx) || 0) * rotScale,
      -0.65,
      0.65
    );
  }

  _evaluateActiveReleaseAt(tau, vpWidth, vpHeight) {
    const rel = this._release;
    if (!rel) return null;

    const u = clamp(tau, 0, 1);
    const e = smoothstepQuintic(u);
    const W = Math.max(1, vpWidth);
    const H = Math.max(1, vpHeight);
    const aspect = W / H;

    const tx = lerp(rel.target0[0], rel.target1[0], e);
    const ty = lerp(rel.target0[1], rel.target1[1], e);
    const tz = lerp(rel.target0[2], rel.target1[2], e);

    // At `e = 0` (`curZoomScale = 1.0`), `minR` & `maxR` embrace `rel.sph0.radius` (`557.6m` on #18,
    // `3600m` on #55) so frame 0 NEVER clamps radius and onset jump is `0.000000 px`!
    const minR = lerp(Math.min(16.0, rel.sph0.radius), 16.0, e);
    const maxR = lerp(Math.max(555.0, rel.sph0.radius), 555.0, e);
    const interpBaseR =
      rel.sph0.radius > 900.0
        ? Math.exp(lerp(Math.log(rel.sph0.radius), Math.log(Math.max(16.0, rel.sph1.radius)), e))
        : lerp(rel.sph0.radius, rel.sph1.radius, e);
    const radius = clamp(interpBaseR * rel.curZoomScale, minR, maxR);

    const basePhi = lerp(rel.sph0.phi, rel.sph1.phi, e);
    const minPhi = lerp(Math.min(0.05, rel.sph0.phi), 0.32, e);
    const maxPhi = lerp(Math.max(Math.PI - 0.05, rel.sph0.phi), 2.05, e);
    const phi = clamp(basePhi + rel.curDragPhi, minPhi, maxPhi);
    const theta = rel.sph0.theta + rel.dThetaBase * e + rel.curDragTheta;

    this._tmpSpherical.set(radius, phi, theta);
    this._tmpVecA.setFromSpherical(this._tmpSpherical);

    let px = tx + this._tmpVecA.x;
    let py = ty + this._tmpVecA.y;
    let pz = tz + this._tmpVecA.z;

    // Strictly enforce progressive ground-floor & pier safety on EVERY release frame:
    // - On normal plates (`startY >= 1.90 m`, e.g. `#23` at `4.44 m`), `reqMinY === minY` (`>= 1.90 m`)
    //   for ALL `u in [0..1]`, so downward drags NEVER dip below ground!
    // - On low-tripod plates (`#18` at `0.80 m`, `#36` at `1.38 m`), `reqMinY` starts at exact `startY`
    //   (`0.000 px` onset jump) and glides smoothly to `1.90 m` as `e -> 1`!
    const minY = minAllowedCameraY(px, pz);
    const startFloorY = Math.min(rel.startCanonical.position[1], minY);
    const reqMinY = lerp(startFloorY, minY, e);
    if (py < reqMinY) {
      py = reqMinY;
    }

    if (e > 1e-4) {
      this._tmpVecB.set(px, py, pz);
      repelPointFromTowerStructure(this._tmpVecB, {
        extraMargin: 4.2,
        enforceInnerEsplanadeExclusion: false,
      });
      px = lerp(px, this._tmpVecB.x, e);
      pz = lerp(pz, this._tmpVecB.z, e);
    }

    const shiftX = (1.0 - e) * rel.startCanonical.shiftX;
    const shiftY = (1.0 - e) * rel.startCanonical.shiftY;
    const tanHalfY = Math.exp(
      lerp(
        Math.log(Math.max(1e-4, rel.startCanonical.tanHalfY)),
        Math.log(Math.max(1e-4, rel.settledTanHalfY)),
        e
      )
    );
    const tanHalfX = tanHalfY * aspect;

    this._computeShiftedAimQuaternion(
      [px, py, pz],
      [tx, ty, tz],
      tanHalfX,
      tanHalfY,
      shiftX,
      shiftY,
      this._tmpQuatAim
    );

    // Decay archival tripod roll twist `(dqRoll0 -> Identity)` smoothly across `e`
    this._tmpQuatRoll.set(0, 0, 0, 1);
    this._tmpQuatB.copy(rel.dqRoll0).slerp(this._tmpQuatRoll, e);
    this._tmpQuatAim.multiply(this._tmpQuatB).normalize();

    const startNear = Number.isFinite(rel.startCanonical.near) ? rel.startCanonical.near : 0.45;
    const rNowXZ = Math.hypot(px, pz);
    let nearNow;
    if (rel.sph0.radius > 900.0) {
      const tTele = clamp((rNowXZ - 1800.0) / 1800.0, 0.0, 1.0);
      nearNow = u <= 0.0 ? startNear : u >= 1.0 ? 0.45 : lerp(0.45, startNear, tTele);
    } else if (startNear > 2.0 && startNear <= 40.0) {
      const d51 = Math.hypot(px - -26.9746, py - 49.6649, pz - 27.1967);
      const tInterior = smoothstepQuintic(clamp((15.0 - d51) / (15.0 - 2.0), 0.0, 1.0));
      nearNow = u <= 0.0 ? startNear : u >= 1.0 ? 0.45 : lerp(0.45, startNear, tInterior);
    } else {
      nearNow = lerp(startNear, 0.45, e);
    }
    const farNow = Math.max(4500.0, rNowXZ + 2400.0);

    const stateNow = {
      position: [px, py, pz],
      quaternion: [
        this._tmpQuatAim.x,
        this._tmpQuatAim.y,
        this._tmpQuatAim.z,
        this._tmpQuatAim.w,
      ],
      tanHalfY,
      shiftX,
      shiftY,
      focalPoint: [tx, ty, tz],
      near: nearNow,
      far: farNow,
    };

    this.applyCanonicalState(stateNow, W, H);
    return { u, e, stateNow, target: [tx, ty, tz] };
  }

  // ===========================================================================
  // Per-Frame Deterministic Advance & Resize Adaptation
  // ===========================================================================

  onResize(vpWidth, vpHeight) {
    const W = Math.max(1, vpWidth);
    const H = Math.max(1, vpHeight);
    if (this._flight) {
      this._flight.vpWidth = W;
      this._flight.vpHeight = H;
      const tau = clamp(this._flight.elapsed / this._flight.duration, 0, 1);
      this._evaluateActiveFlightAt(tau, W, H, 0);
    } else if (this._release) {
      this._release.vpWidth = W;
      this._release.vpHeight = H;
      const tau = clamp(this._release.elapsed / this._release.duration, 0, 1);
      this._evaluateActiveReleaseAt(tau, W, H);
    }
  }

  cancel() {
    this._flight = null;
    this._release = null;
    this._prevSampleFocal = null;
    this._velPos = [0, 0, 0];
    this._velFocal = [0, 0, 0];
    this._velTanHalfY = 0;
    this._velShiftX = 0;
    this._velShiftY = 0;
  }

  update(dtSec, vpWidth, vpHeight) {
    const dt = clamp(Number(dtSec) || 0, 0, 0.15);
    const W = Math.max(1, vpWidth || this._flight?.vpWidth || this._release?.vpWidth || 1440);
    const H = Math.max(1, vpHeight || this._flight?.vpHeight || this._release?.vpHeight || 900);

    if (!this._flight && !this._release) {
      this._velPos = [0, 0, 0];
      this._velFocal = [0, 0, 0];
      this._angSpeedRadps = 0;
      this._prevLinearSpeed = 0;
      return;
    }

    const preFrameSnap = dt > 0 ? this.captureLandmarkScreenPositions(W, H) : null;

    if (this._flight) {
      const fl = this._flight;
      fl.elapsed += dt;
      const rawTau = clamp(fl.elapsed / fl.duration, 0, 1);
      const evalRes = this._evaluateActiveFlightAt(rawTau, W, H, dt);

      this._recordFrameKinematics(dt, W, H, preFrameSnap);

      if (typeof fl.onProgress === 'function') {
        fl.onProgress({
          rawT: rawTau,
          easedT: evalRes.e,
          rect: evalRes.rectNow,
          state: evalRes.stateNow,
        });
      }

      if (rawTau >= 1.0) {
        const done = fl;
        this._flight = null;
        this._velPos = [0, 0, 0];
        this._velFocal = [0, 0, 0];
        this._velTanHalfY = 0;
        this._velShiftX = 0;
        this._velShiftY = 0;

        const preLockSnap = this.captureLandmarkScreenPositions(W, H);
        if (typeof done.onComplete === 'function') {
          done.onComplete();
        }
        const postLockSnap = this.captureLandmarkScreenPositions(W, H);
        const lockSnapPx = this.measureMaxLandmarkJumpPx(preLockSnap, postLockSnap);
        this._telemetry.lastLockSnapPx = Number(lockSnapPx.toFixed(6));
        if (lockSnapPx > this._telemetry.maxLockSnapPx) {
          this._telemetry.maxLockSnapPx = Number(lockSnapPx.toFixed(6));
        }
      }
      return;
    }

    if (this._release) {
      const rel = this._release;
      rel.elapsed += dt;
      // Smoothly damp interactive pointer drag & wheel zoom inputs (`OrbitControls` feel, 0 jump)
      const dampAlpha = 1.0 - Math.exp(-14.0 * dt);
      rel.curDragTheta = lerp(rel.curDragTheta, rel.targetDragTheta, dampAlpha);
      rel.curDragPhi = lerp(rel.curDragPhi, rel.targetDragPhi, dampAlpha);
      rel.curZoomScale = lerp(rel.curZoomScale, rel.targetZoomScale, dampAlpha);

      const rawTau = clamp(rel.elapsed / rel.duration, 0, 1);
      const evalRes = this._evaluateActiveReleaseAt(rawTau, W, H);

      this._recordFrameKinematics(dt, W, H, preFrameSnap);

      if (rawTau >= 1.0) {
        const done = rel;
        this._release = null;
        this._velPos = [0, 0, 0];
        this._velFocal = [0, 0, 0];

        const preLockSnap = this.captureLandmarkScreenPositions(W, H);

        // Seamless zero-jump handoff to constrained OrbitControls
        this.camera.clearViewOffset();
        this.camera.fov = done.settledFovDeg;
        this.camera.aspect = W / H;
        this.camera.near = 0.45;
        this.camera.far = 4500.0;
        this.camera.up.set(0, 1, 0);
        this.camera.updateProjectionMatrix();

        if (this.controls) {
          this.controls.target.set(evalRes.target[0], evalRes.target[1], evalRes.target[2]);
          flushOrbitControlsMomentum(this.controls, { spherical: true, pan: true, scale: true });
          this.controls.enabled = true;
          const prevDamp = this.controls.enableDamping;
          this.controls.enableDamping = false;
          this.controls.update();
          this.controls.enableDamping = prevDamp;
        }
        if (this.viewportConstraints) {
          this.viewportConstraints.enforce();
        }

        const postLockSnap = this.captureLandmarkScreenPositions(W, H);
        const lockSnapPx = this.measureMaxLandmarkJumpPx(preLockSnap, postLockSnap);
        this._telemetry.lastLockSnapPx = Number(lockSnapPx.toFixed(6));
        if (lockSnapPx > this._telemetry.maxLockSnapPx) {
          this._telemetry.maxLockSnapPx = Number(lockSnapPx.toFixed(6));
        }

        if (typeof done.onComplete === 'function') {
          done.onComplete();
        }
      }
    }
  }

  _recordFrameKinematics(dt, W, H, preFrameSnap) {
    const cx = this.camera.position.x;
    const cy = this.camera.position.y;
    const cz = this.camera.position.z;

    if (cy < this._telemetry.minFlightCamY) {
      this._telemetry.minFlightCamY = Number(cy.toFixed(3));
    }
    const groundClear = cy - localGroundElevation(cx, cz);
    if (groundClear < this._telemetry.minFlightGroundClearanceM) {
      this._telemetry.minFlightGroundClearanceM = Number(groundClear.toFixed(3));
    }
    const structClear = computeStructuralClearanceM(cx, cy, cz);
    if (structClear < this._telemetry.minFlightStructuralClearanceM) {
      this._telemetry.minFlightStructuralClearanceM = Number(structClear.toFixed(3));
    }
    if (
      this._flight?.isExteriorFlight &&
      structClear < this._telemetry.minExteriorFlightStructuralClearanceM
    ) {
      this._telemetry.minExteriorFlightStructuralClearanceM = Number(structClear.toFixed(3));
    }

    if (dt > 1e-5 && this._prevSamplePos) {
      const distStep = Math.hypot(
        cx - this._prevSamplePos[0],
        cy - this._prevSamplePos[1],
        cz - this._prevSamplePos[2]
      );
      const linSpeed = distStep / dt;
      const speedJump = Math.abs(linSpeed - this._prevLinearSpeed);
      this._prevLinearSpeed = linSpeed;

      const dotQ = clamp(Math.abs(this._prevSampleQuat.dot(this.camera.quaternion)), 0, 1);
      const angStep = 2.0 * Math.acos(dotQ);
      const angSpeed = angStep / dt;

      this._telemetry.linearSpeedMps = Number(linSpeed.toFixed(3));
      this._telemetry.angularSpeedRadps = Number(angSpeed.toFixed(4));
      if (linSpeed > this._telemetry.maxLinearSpeedMps) {
        this._telemetry.maxLinearSpeedMps = Number(linSpeed.toFixed(3));
      }
      if (angSpeed > this._telemetry.maxAngularSpeedRadps) {
        this._telemetry.maxAngularSpeedRadps = Number(angSpeed.toFixed(4));
      }
      if (speedJump > this._telemetry.maxLinearAccelJumpMps) {
        this._telemetry.maxLinearAccelJumpMps = Number(speedJump.toFixed(3));
      }
    }

    if (preFrameSnap) {
      const postFrameSnap = this.captureLandmarkScreenPositions(W, H);
      const stepPx = this.measureMaxLandmarkJumpPx(preFrameSnap, postFrameSnap);
      if (stepPx > this._telemetry.maxFrameStepPx) {
        this._telemetry.maxFrameStepPx = Number(stepPx.toFixed(3));
      }
    }

    this._prevSamplePos = [cx, cy, cz];
    this._prevSampleQuat.copy(this.camera.quaternion);
  }
}
