/**
 * Tower-Focused Viewport & Look Constraints (`viewport_constraints.js`)
 *
 * Enforces structural clearance across all interactive free-orbit states
 * (Stop 12 Hero 3D Showcase, Detail I–IV craftsmanship presets, and `Reveal 3D` /
 * drag-to-orbit on Stops 01–11):
 *
 *   1. Height- & distance-adaptive Tower-spine target tether (`[7.5 m .. 295.0 m]` vertical,
 *      tightening toward `[0, y, 0]` as orbital distance increases).
 *   2. Spherical ground-floor polar pre-clamp (`Y >= max(1.90 m, localGroundY + 1.75 m)`)
 *      solved BEFORE Cartesian conversion so downward drags glide horizontally along
 *      pedestrian eye-level without collapsing horizontal radius into the piers.
 *   3. Exact 4-pier (`±45°` inclined legs) + upper-shaft exterior structural exclusion so
 *      the camera never clips inside iron lattice bars, masonry plinths, or platform decks.
 *   4. World-edge & aerial-mist safety cap (`maxDist = 555 m`, `R_xz <= 555 m`, >400 m inside
 *      the 960 m 100%-mist horizon closure ring).
 *   5. Strict Anti-Outward-Gaze & Tower-In-Viewport Frustum Guard: prevents panning or
 *      looking outward away from the Eiffel Tower into surrounding low-poly Paris blocks,
 *      guaranteeing the Tower spine stays framed inside `|ndc_x| <= 0.56, |ndc_y| <= 0.78`.
 *   6. `OrbitControls` residual damping flush when hitting boundaries so controls never
 *      accumulate phantom velocity or bounce against constraints.
 */

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Outer half-width (m) of the Eiffel Tower square horizontal section at elevation `y` (m).
 */
export function towerHalfWidthAtY(y) {
  const h = clamp(Number(y) || 0, 0, 312.5);
  if (h < 57.6) return lerp(62.5, 35.4, h / 57.6);
  if (h < 115.7) return lerp(35.4, 20.5, (h - 57.6) / (115.7 - 57.6));
  if (h < 196.0) return lerp(20.5, 10.2, (h - 115.7) / (196.0 - 115.7));
  return lerp(10.2, 5.2, clamp((h - 196.0) / 104.0, 0, 1));
}

/**
 * Local terrain elevation (m relative to `Sol au centre de la Tour = 0.0 m` / `33.50 NGF`).
 * Models the terraced Chaillot hill rising NW of Pont d'Iéna (`Z < -282 m`).
 */
export function localGroundElevation(x, z) {
  if (z < -282) {
    if (z >= -476) {
      return lerp(0.0, 7.6, (-282 - z) / (476 - 282));
    }
    if (z >= -562) {
      return 7.6;
    }
    if (z >= -700) {
      return lerp(7.6, 24.0, (-562 - z) / (700 - 562));
    }
    return 24.0;
  }
  return 0.0;
}

/**
 * Minimum pedestrian / tripod clearance elevation at `(x, z)` for interactive free-orbit.
 */
export function minAllowedCameraY(x, z) {
  return Math.max(1.9, localGroundElevation(x, z) + 1.75);
}

/**
 * Center offset `c(y)` and bounding leg radius `rLeg(y)` for the 4 inclined piers
 * (`(±c(y), ±c(y))` in XZ) from `Y = 0 m` plinths to `Y = 60 m` First Stage soffit.
 */
export function getInclinedPierLegSpec(y) {
  const h = clamp(Number(y) || 0, 0, 62.0);
  const u = clamp(h / 57.63, 0, 1);
  return {
    centerOffsetM: lerp(49.9, 26.5, u),
    legRadiusM: lerp(15.2, 11.2, u),
  };
}

/**
 * Minimum signed clearance distance (m) from `(x, y, z)` to the 4 inclined pier legs
 * and upper Tower lattice shaft (`> 0` means strictly outside structure).
 */
export function computeStructuralClearanceM(x, y, z) {
  const h = Number(y) || 0;
  if (h > 316.0) {
    return Math.hypot(x, z) + (h - 316.0);
  }

  let minClearance = Infinity;

  // 1. Below First Stage top (0..62 m): check 4 inclined pier legs (±c, ±c)
  if (h <= 62.0) {
    const { centerOffsetM, legRadiusM } = getInclinedPierLegSpec(h);
    const ax = Math.abs(x);
    const az = Math.abs(z);
    const distPier = Math.hypot(ax - centerOffsetM, az - centerOffsetM);
    minClearance = Math.min(minClearance, distPier - legRadiusM);
  }

  // 2. First Stage girder box & upper lattice shaft (44..314 m)
  if (h >= 44.0) {
    const halfW = towerHalfWidthAtY(h);
    // Chebyshev + rounded corner envelope matching square iron tower cross-section
    const ax = Math.abs(x);
    const az = Math.abs(z);
    const dx = Math.max(0, ax - halfW);
    const dz = Math.max(0, az - halfW);
    const outsideDist = dx > 0 || dz > 0 ? Math.hypot(dx, dz) : -Math.min(halfW - ax, halfW - az);
    minClearance = Math.min(minClearance, outsideDist);
  }

  return minClearance;
}

/**
 * Minimum exterior horizontal radius from the Tower centerline `(0, y, 0)` in free-orbit mode
 * so visitors never slip underneath the First Stage ceiling looking outward into low-poly blocks
 * or clip inside the upper shaft.
 */
export function minFreeOrbitAxisRadiusAtY(y) {
  const h = clamp(Number(y) || 0, 0, 315);
  if (h < 58.0) return 50.0;
  if (h < 122.0) return towerHalfWidthAtY(h) * 1.32 + 9.5;
  return towerHalfWidthAtY(h) * 1.32 + 11.5;
}

/**
 * Smoothly pushes a 3D point `(x, y, z)` outside the 4 inclined piers, upper Tower shaft,
 * and optional inner free-orbit core. Mutates `vec3` in place and returns `true` if adjusted.
 */
export function repelPointFromTowerStructure(
  vec3,
  { extraMargin = 4.2, enforceInnerEsplanadeExclusion = true } = {}
) {
  let changed = false;
  let x = vec3.x;
  let y = vec3.y;
  let z = vec3.z;

  // 1. Keep outside free-orbit central core when requested (prevents ducking under Floor 1 deck)
  if (enforceInnerEsplanadeExclusion && y < 312.0) {
    const minAxisR = minFreeOrbitAxisRadiusAtY(y);
    const rXZ = Math.hypot(x, z);
    if (rXZ < minAxisR) {
      if (rXZ > 1e-4) {
        const s = minAxisR / rXZ;
        x *= s;
        z *= s;
      } else {
        x = 0;
        z = minAxisR;
      }
      changed = true;
    }
  }

  // 2. Keep outside all 4 inclined pier legs (±c(y), ±c(y)) for y <= 63 m
  if (y <= 63.0) {
    const { centerOffsetM, legRadiusM } = getInclinedPierLegSpec(y);
    const reqPierR = legRadiusM + extraMargin;
    const sx = x >= 0 ? 1 : -1;
    const sz = z >= 0 ? 1 : -1;
    const cx = sx * centerOffsetM;
    const cz = sz * centerOffsetM;
    const dx = x - cx;
    const dz = z - cz;
    const dPier = Math.hypot(dx, dz);
    if (dPier < reqPierR) {
      if (dPier > 1e-4) {
        const s = reqPierR / dPier;
        x = cx + dx * s;
        z = cz + dz * s;
      } else {
        // Push outward along pier diagonal away from Tower center
        const inv = 1 / Math.SQRT2;
        x = cx + sx * inv * reqPierR;
        z = cz + sz * inv * reqPierR;
      }
      changed = true;
    }
  }

  // 3. Keep outside upper square lattice & platform boxes for y >= 43 m
  if (y >= 43.0 && y <= 314.0) {
    const reqR = Math.SQRT2 * towerHalfWidthAtY(y) + extraMargin;
    // Rounded-square radial clearance so corners of Floor 1 / Floor 2 balconies are cleared cleanly
    const halfBox = towerHalfWidthAtY(y) + extraMargin;
    const ax = Math.abs(x);
    const az = Math.abs(z);
    if (ax < halfBox && az < halfBox) {
      const rXZ = Math.hypot(x, z);
      const safeR = Math.min(reqR, Math.max(halfBox, rXZ));
      if (rXZ > 1e-4 && rXZ < safeR) {
        const s = safeR / rXZ;
        x *= s;
        z *= s;
      } else if (rXZ <= 1e-4) {
        z = halfBox;
      }
      changed = true;
    }
  }

  if (changed) {
    vec3.set(x, y, z);
  }
  return changed;
}

/**
 * Smoothly pushes or elevates a 3D point `(x, y, z)` outside all 1889 Exposition Universelle
 * pavilions, cupolas, covered promenade walkways, fountains, and outer Haussmannian blocks
 * (`w_champ_de_mars.js`, `w_parvis_seine.js`, `w_trocadero.js`).
 * Mutates `vec3` in place and returns `true` if adjusted.
 */
export function repelPointFromExpositionObstacles(
  vec3,
  { extraMargin = 4.5, avoidTrees = false, preferAerialLift = false } = {}
) {
  let changed = false;
  let x = vec3.x;
  let y = vec3.y;
  let z = vec3.z;
  const m = Math.max(1.5, extraMargin);

  // 1. Champ-de-Mars Striped Promenade Awnings (`|x| in [33.85, 39.75]`, `z in [184, 548]`, `topY = 4.46 m`)
  if (z >= 184.0 - m && z <= 548.0 + m) {
    const ax = Math.abs(x);
    const xLo = 33.85 - m;
    const xHi = 39.75 + m;
    const reqY = 4.46 + m;
    if (ax >= xLo && ax <= xHi && y < reqY) {
      if (preferAerialLift || y >= 2.8) {
        y = reqY;
      } else {
        const sx = x >= 0 ? 1 : -1;
        x = sx * (ax < 36.8 ? xLo : xHi);
      }
      changed = true;
    }
  }

  // 2. Optional Tree Crown Clearance during flights (Champ-de-Mars chestnut alleys & discrete Quai d'Orsay trees)
  if (avoidTrees) {
    const ax = Math.abs(x);
    if (z >= 92.0 && z <= 556.0 && ax >= 46.5 && ax <= 85.5 && y < 13.0) {
      y = 13.0;
      changed = true;
    }
    // Quai d'Orsay trees stand at discrete 28m intervals (x = +-28, +-56, +-84, ..., z = -119.2, crown r ~ 4.4m);
    // only clear actual tree crowns rather than treating the open boulevard gaps as a solid 13.5m wall.
    if (z >= -124.2 && z <= -114.2 && ax >= 23.0 && y < 13.2) {
      const nearestTreeX = Math.max(28.0, Math.round(ax / 28.0) * 28.0);
      const distTree = Math.hypot(ax - nearestTreeX, z + 119.2);
      if (distTree < 5.2) {
        if (preferAerialLift && y >= 5.5) {
          y = 13.2;
        } else {
          const sx = x >= 0 ? 1 : -1;
          const dxTree = ax - nearestTreeX;
          const pushX = dxTree < 0 ? nearestTreeX - 5.4 : nearestTreeX + 5.4;
          x = sx * pushX;
        }
        changed = true;
      }
    }
  }

  // 2b. Quai d'Orsay Exposition Riverfront Galleries & Ribbed Corner Pavilions (`|x| in [101, 211]`, `z in [-121.5, -102.5]`, `topY = 20.2 m`)
  if (z >= -121.5 - m && z <= -102.5 + m) {
    const ax = Math.abs(x);
    const xLo = 101.0 - m;
    const xHi = 211.0 + m;
    const reqY = (ax < 118.0 ? 20.4 : 15.6) + m;
    if (ax >= xLo && ax <= xHi && y < reqY) {
      if (preferAerialLift || y >= 9.0) {
        y = reqY;
      } else {
        const sx = x >= 0 ? 1 : -1;
        x = sx * (ax < 156.0 ? xLo : xHi);
      }
      changed = true;
    }
  }

  // 3. 1889 Fontaine Coutan (`(0, 155)`, `rx = 15.8`, `rz = 22.5`, `topY = 13.0 m`)
  {
    const rx = 15.8 + m;
    const rz = 22.5 + m;
    const dz = z - 155.0;
    const q = (x * x) / (rx * rx) + (dz * dz) / (rz * rz);
    const reqY = 13.0 + m;
    if (q < 1.0 && y < reqY) {
      if (preferAerialLift || y >= 7.5) {
        y = reqY;
      } else if (q > 1e-6) {
        const s = 1.0 / Math.sqrt(q);
        x *= s;
        z = 155.0 + dz * s;
      } else {
        x = rx;
      }
      changed = true;
    }
  }

  // 4. Palais des Beaux-Arts (+X) & Palais des Arts Libéraux (-X)
  //    `|x| in [95.6, 151.1]`, `z in [195.4, 484.6]`, wing/Mansard roof `26.0 m`, central Formigé cupola (`z=340`) `37.0 m`
  if (z >= 195.4 - m && z <= 484.6 + m) {
    const ax = Math.abs(x);
    const xLo = 95.6 - m;
    const xHi = 151.1 + m;
    if (ax >= xLo && ax <= xHi) {
      const zCupolaDist = (z - 340.0) / 38.0;
      const roofTop = 26.2 + 11.2 * Math.exp(-zCupolaDist * zCupolaDist);
      const reqY = roofTop + m;
      if (y < reqY) {
        if (preferAerialLift || y >= 18.0 || ax >= 123.5) {
          y = reqY;
        } else {
          const sx = x >= 0 ? 1 : -1;
          x = sx * xLo;
        }
        changed = true;
      }
    }
  }

  // 5. Monumental Dôme Central & Galerie des Machines (`z >= 580`, `|x| <= 212`, `topY = 70.6 m`)
  if (z > 580.0 - m && Math.abs(x) < 212.0 + m && y < 71.0 + m) {
    z = 580.0 - m;
    changed = true;
  }

  // 6. Parvis Twin Ornamental Basins (`(+-55.5, -75.5)`, `r = 7.9`, `topY = 6.6 m`)
  {
    const sx = x >= 0 ? 1 : -1;
    const dx = x - sx * 55.5;
    const dz = z + 75.5;
    const d = Math.hypot(dx, dz);
    const reqR = 7.9 + m;
    const reqY = 6.6 + m;
    if (d < reqR && y < reqY) {
      if (preferAerialLift || y >= 4.0) {
        y = reqY;
      } else if (d > 1e-4) {
        const s = reqR / d;
        x = sx * 55.5 + dx * s;
        z = -75.5 + dz * s;
      } else {
        x = sx * (55.5 + reqR);
      }
      changed = true;
    }
  }

  // 7. Trocadéro Lower Park Pavilions (`|x| in [27, 53]`, `z in [-413, -321]`, `topY = 16.5 m`)
  if (z >= -413.0 - m && z <= -321.0 + m) {
    const ax = Math.abs(x);
    const xLo = 27.0 - m;
    const xHi = 53.0 + m;
    const reqY = 16.5 + m;
    if (ax >= xLo && ax <= xHi && y < reqY) {
      y = reqY;
      changed = true;
    }
  }

  // 8. Outer Left-Bank Haussmannian Apartment Districts (`w_champ_de_mars.js:300-319`: inner walls protrude to `|x| = 234.2 m` across `z in [-128.3, 625]`, `topY ~ 26.8 m`)
  if (z >= -132.0 && z <= 625.0 && Math.abs(x) > 232.0 - m && y < 27.5 + m) {
    if (preferAerialLift || y >= 18.0) {
      y = 27.5 + m;
    } else {
      x = (x >= 0 ? 1 : -1) * (232.0 - m);
    }
    changed = true;
  }

  // 9. Right-Bank Haussmannian Districts (`w_champ_de_mars.js:320-321`: inner walls protrude to `|x| = 246.3 m` for `z <= -282`, `topY ~ 33.2 m`)
  if (z <= -278.0 && Math.abs(x) > 244.0 - m && y < 33.5 + m) {
    if (preferAerialLift || y >= 22.0) {
      y = 33.5 + m;
    } else {
      x = (x >= 0 ? 1 : -1) * (244.0 - m);
    }
    changed = true;
  }

  // 10. Trocadéro Semicircular Colonnade Wings & Pavilions (`w_trocadero.js:200-219`: `z <= -516`, `topY ~ 42.5 m`)
  if (z <= -516.0 + m && y < 43.0 + m) {
    if (preferAerialLift || y >= 28.0) {
      y = 43.0 + m;
    } else {
      z = -516.0 + m;
    }
    changed = true;
  }

  if (changed) {
    vec3.set(x, y, z);
  }
  return changed;
}

/**
 * Flushes internal residual spherical/pan/zoom momentum inside Three.js `OrbitControls`
 * so boundary clamps or programmatic handoffs never fight stale damping deltas.
 */
export function flushOrbitControlsMomentum(controls, { spherical = true, pan = true, scale = false } = {}) {
  if (!controls) return;
  // Standard Three.js r150–r170 OrbitControls private damping accumulators (guarded safely)
  if (spherical && controls._sphericalDelta && typeof controls._sphericalDelta.set === 'function') {
    controls._sphericalDelta.set(0, 0, 0);
  }
  if (pan && controls._panOffset && typeof controls._panOffset.set === 'function') {
    controls._panOffset.set(0, 0, 0);
  }
  if (scale && typeof controls._scale === 'number') {
    controls._scale = 1;
  }
}

export function createViewportConstraints({
  THREE,
  camera,
  controls,
  maxDistance = 555.0,
  maxWorldRadiusXZ = 555.0,
  maxSpineNdcX = 0.56,
  maxSpineNdcY = 0.78,
} = {}) {
  const offset = new THREE.Vector3();
  const spherical = new THREE.Spherical();
  const spinePoint = new THREE.Vector3();
  const projectedSpine = new THREE.Vector3();
  const upVec = new THREE.Vector3(0, 1, 0);

  const lastFlags = {
    groundFloor: false,
    polarMax: false,
    polarMin: false,
    distMax: false,
    distMin: false,
    targetTether: false,
    pierExclusion: false,
    worldRadiusMax: false,
    antiOutwardGaze: false,
    towerFraming: false,
  };

  function resetFlags() {
    lastFlags.groundFloor = false;
    lastFlags.polarMax = false;
    lastFlags.polarMin = false;
    lastFlags.distMax = false;
    lastFlags.distMin = false;
    lastFlags.targetTether = false;
    lastFlags.pierExclusion = false;
    lastFlags.worldRadiusMax = false;
    lastFlags.antiOutwardGaze = false;
    lastFlags.towerFraming = false;
  }

  /**
   * Computes maximum allowed horizontal target tether radius (m) at elevation `targetY`
   * and camera-to-target distance `camDist`.
   *   - Close to base (`y < 58 m`, `dist < 135 m`): up to `54.8 m` so Detail I (`[38, 7.5, 38]`,
   *     `R = 53.74 m`) frames the East Pier plinth & bearing shoes with zero displacement.
   *   - Medium/wide distances (`dist > 135 m`): tightens smoothly toward the Tower centerline
   *     so wide orbital views never swing the Tower out of center or expose perimeter blocks.
   */
  function computeMaxTetherRadius(targetY, camDist) {
    const y = clamp(targetY, 7.5, 295.0);
    let baseR;
    if (y < 58.0) {
      baseR = lerp(56.5, 34.0, clamp((y - 7.5) / 50.5, 0, 1));
    } else {
      baseR = Math.min(34.0, towerHalfWidthAtY(y) * 1.15 + 4.5);
    }
    const distTighten = lerp(1.0, 0.34, clamp((camDist - 135.0) / 175.0, 0, 1));
    return Math.max(5.5, baseR * distTighten);
  }

  function enforce() {
    if (!camera || !controls || !controls.enabled) return lastFlags;

    resetFlags();

    const target = controls.target;

    // -------------------------------------------------------------------------
    // 1. Clamp target elevation to [7.5 m .. 295.0 m]
    // -------------------------------------------------------------------------
    const clampedTargetY = clamp(target.y, 7.5, 295.0);
    if (Math.abs(clampedTargetY - target.y) > 1e-4) {
      const dy = clampedTargetY - target.y;
      target.y = clampedTargetY;
      camera.position.y += dy;
      lastFlags.targetTether = true;
    }

    // -------------------------------------------------------------------------
    // 2. Adaptive horizontal Tower-spine tether
    // -------------------------------------------------------------------------
    const rawCamDist = camera.position.distanceTo(target);
    const maxTetherR = computeMaxTetherRadius(target.y, rawCamDist);
    const curTargetR = Math.hypot(target.x, target.z);
    if (curTargetR > maxTetherR && curTargetR > 1e-5) {
      const scale = maxTetherR / curTargetR;
      const nx = target.x * scale;
      const nz = target.z * scale;
      const dx = nx - target.x;
      const dz = nz - target.z;
      target.x = nx;
      target.z = nz;
      camera.position.x += dx;
      camera.position.z += dz;
      lastFlags.targetTether = true;
    }

    // -------------------------------------------------------------------------
    // 3. Spherical distance & ground-floor-coupled polar envelope
    //    Solving `phi_max` in spherical space BEFORE `setFromSpherical` prevents
    //    horizontal radius collapse when the user drags downward to ground level.
    // -------------------------------------------------------------------------
    offset.copy(camera.position).sub(target);
    spherical.setFromVector3(offset);

    const minDist = Math.max(15.0, towerHalfWidthAtY(target.y) * 0.62 + 8.5);
    if (spherical.radius < minDist) {
      spherical.radius = minDist;
      lastFlags.distMin = true;
    } else if (spherical.radius > maxDistance) {
      spherical.radius = maxDistance;
      lastFlags.distMax = true;
    }

    const estSinPhi = Math.sin(clamp(spherical.phi, 0.32, 2.35));
    const estCamX = target.x + spherical.radius * estSinPhi * Math.sin(spherical.theta);
    const estCamZ = target.z + spherical.radius * estSinPhi * Math.cos(spherical.theta);
    const minCamY = minAllowedCameraY(estCamX, estCamZ);

    const minPolar = 0.32; // 18.3 deg from zenith (avoids pole singularity & top-down world-edge view)
    const minCosPhiForGround = clamp(
      (minCamY - target.y) / Math.max(1.0, spherical.radius),
      -0.96,
      0.92
    );
    const groundMaxPolar = Math.acos(minCosPhiForGround);
    const maxPolar = Math.max(minPolar + 0.04, Math.min(2.22, groundMaxPolar));

    if (spherical.phi < minPolar) {
      spherical.phi = minPolar;
      lastFlags.polarMin = true;
    } else if (spherical.phi > maxPolar) {
      spherical.phi = maxPolar;
      lastFlags.polarMax = true;
      if (groundMaxPolar <= 2.22) {
        lastFlags.groundFloor = true;
      }
    }

    offset.setFromSpherical(spherical);
    camera.position.copy(target).add(offset);

    // -------------------------------------------------------------------------
    // 4. Exterior 4-Pier + Shaft Structural Exclusion & World-Edge Mist Cap
    // -------------------------------------------------------------------------
    // Clamp XZ world radius first so inward scaling never lands inside an unchecked obstacle
    let camAxisR = Math.hypot(camera.position.x, camera.position.z);
    if (camAxisR > maxWorldRadiusXZ && camAxisR > 1e-4) {
      const s = maxWorldRadiusXZ / camAxisR;
      camera.position.x *= s;
      camera.position.z *= s;
      lastFlags.worldRadiusMax = true;
      lastFlags.distMax = true;
    }

    if (
      repelPointFromTowerStructure(camera.position, {
        extraMargin: 4.5,
        enforceInnerEsplanadeExclusion: true,
      })
    ) {
      lastFlags.pierExclusion = true;
    }

    if (
      repelPointFromExpositionObstacles(camera.position, {
        extraMargin: 3.5,
        avoidTrees: false,
        preferAerialLift: false,
      })
    ) {
      lastFlags.pierExclusion = true;
    }

    camAxisR = Math.hypot(camera.position.x, camera.position.z);
    if (camAxisR > maxWorldRadiusXZ && camAxisR > 1e-4) {
      const s = maxWorldRadiusXZ / camAxisR;
      camera.position.x *= s;
      camera.position.z *= s;
      lastFlags.worldRadiusMax = true;
      lastFlags.distMax = true;
    }

    // Re-verify terrain clearance at final XZ (e.g. NW Chaillot hill terraces)
    const exactMinY = minAllowedCameraY(camera.position.x, camera.position.z);
    if (camera.position.y < exactMinY) {
      camera.position.y = exactMinY;
      lastFlags.groundFloor = true;
    }

    // Hard ceiling safety so camera never floats into upper sky dome above 335 m
    if (camera.position.y > 335.0) {
      camera.position.y = 335.0;
      lastFlags.polarMin = true;
    }

    // Re-verify 3D distance cap (`<= maxDistance`) by pulling XZ horizontally if vertical lift pushed dist > maxDistance
    const postDist = camera.position.distanceTo(target);
    if (postDist > maxDistance && postDist > 1e-4) {
      const dy = camera.position.y - target.y;
      const dx = camera.position.x - target.x;
      const dz = camera.position.z - target.z;
      const horizLen = Math.hypot(dx, dz);
      const maxHoriz = Math.sqrt(Math.max(0.0, maxDistance * maxDistance - dy * dy));
      if (horizLen > 1e-4 && maxHoriz < horizLen) {
        const hs = maxHoriz / horizLen;
        camera.position.x = target.x + dx * hs;
        camera.position.z = target.z + dz * hs;
        // Re-check obstacle repulsion if pulled horizontally into an obstacle
        repelPointFromTowerStructure(camera.position, {
          extraMargin: 4.5,
          enforceInnerEsplanadeExclusion: true,
        });
        repelPointFromExpositionObstacles(camera.position, {
          extraMargin: 3.5,
          avoidTrees: false,
          preferAerialLift: true,
        });
      }
      lastFlags.distMax = true;
    }

    // -------------------------------------------------------------------------
    // 5. Strict Anti-Outward-Gaze Guard (XZ Yaw Relative to Tower Spine)
    //    Ensures the camera never looks past an off-center target outward into
    //    surrounding low-poly Paris blocks.
    // -------------------------------------------------------------------------
    const finalAxisR = Math.hypot(camera.position.x, camera.position.z);
    if (finalAxisR > 1e-3) {
      const toSpineX = -camera.position.x / finalAxisR;
      const toSpineZ = -camera.position.z / finalAxisR;
      const lookX = target.x - camera.position.x;
      const lookZ = target.z - camera.position.z;
      const lookLenXZ = Math.hypot(lookX, lookZ);

      if (lookLenXZ > 1e-3) {
        const cosYaw = (lookX * toSpineX + lookZ * toSpineZ) / lookLenXZ;
        // Close to base piers allow ~36° yaw for Detail I; tighten to ~20° at wide distances
        const maxYawRad = lerp(0.63, 0.35, clamp((finalAxisR - 80.0) / 300.0, 0, 1));
        const minCosYaw = Math.cos(maxYawRad);
        if (cosYaw < minCosYaw) {
          // Pull target horizontally toward Tower axis (0, 0) until gaze yaw is inside cone
          let lo = 0.0;
          let hi = 1.0;
          for (let iter = 0; iter < 8; iter++) {
            const mid = 0.5 * (lo + hi);
            const tx = lerp(target.x, 0, mid) - camera.position.x;
            const tz = lerp(target.z, 0, mid) - camera.position.z;
            const tLen = Math.hypot(tx, tz);
            const c = tLen > 1e-4 ? (tx * toSpineX + tz * toSpineZ) / tLen : 1.0;
            if (c >= minCosYaw) {
              hi = mid;
            } else {
              lo = mid;
            }
          }
          target.x = lerp(target.x, 0, hi);
          target.z = lerp(target.z, 0, hi);
          lastFlags.antiOutwardGaze = true;
        }
      }
    }

    // -------------------------------------------------------------------------
    // 6. Tower-In-Viewport Frustum Guard (`|ndc_x| <= maxSpineNdcX`, `|ndc_y| <= maxSpineNdcY`)
    //    Verifies via actual camera projection matrix that the Tower spine anchor
    //    stays comfortably framed inside the viewport under arbitrary pan/aspect.
    // -------------------------------------------------------------------------
    spinePoint.set(0, clamp(target.y, 12.0, 290.0), 0);
    camera.up.copy(upVec);
    camera.lookAt(target);
    camera.updateMatrixWorld(true);
    camera.updateProjectionMatrix();

    projectedSpine.copy(spinePoint).project(camera);
    const outOfFrustum =
      !Number.isFinite(projectedSpine.x) ||
      !Number.isFinite(projectedSpine.y) ||
      projectedSpine.z >= 1.0 ||
      Math.abs(projectedSpine.x) > maxSpineNdcX ||
      Math.abs(projectedSpine.y) > maxSpineNdcY;

    if (outOfFrustum) {
      let lo = 0.0;
      let hi = 1.0;
      for (let iter = 0; iter < 9; iter++) {
        const mid = 0.5 * (lo + hi);
        const tx = lerp(target.x, spinePoint.x, mid);
        const ty = lerp(target.y, spinePoint.y, mid);
        const tz = lerp(target.z, spinePoint.z, mid);
        camera.lookAt(tx, ty, tz);
        camera.updateMatrixWorld(true);
        projectedSpine.copy(spinePoint).project(camera);
        const ok =
          projectedSpine.z < 1.0 &&
          Math.abs(projectedSpine.x) <= maxSpineNdcX &&
          Math.abs(projectedSpine.y) <= maxSpineNdcY;
        if (ok) {
          hi = mid;
        } else {
          lo = mid;
        }
      }
      target.lerp(spinePoint, hi);
      camera.lookAt(target);
      camera.updateMatrixWorld(true);
      lastFlags.towerFraming = true;
    }

    // -------------------------------------------------------------------------
    // 7. Flush residual OrbitControls velocity when hitting hard walls
    // -------------------------------------------------------------------------
    if (
      lastFlags.targetTether ||
      lastFlags.antiOutwardGaze ||
      lastFlags.towerFraming
    ) {
      flushOrbitControlsMomentum(controls, { spherical: false, pan: true });
    }
    if (
      lastFlags.groundFloor ||
      lastFlags.polarMax ||
      lastFlags.polarMin ||
      lastFlags.pierExclusion ||
      lastFlags.worldRadiusMax
    ) {
      flushOrbitControlsMomentum(controls, { spherical: true, pan: false });
    }

    return lastFlags;
  }

  /**
   * Computes a nearest legal `(position, target)` pair for smooth release targeting
   * without mutating the live camera or controls.
   */
  function solveLegalPose({ position, target, fov = 42, aspect = 16 / 9 } = {}) {
    const savedPos = camera.position.clone();
    const savedQuat = camera.quaternion.clone();
    const savedUp = camera.up.clone();
    const savedFov = camera.fov;
    const savedAspect = camera.aspect;
    const savedTarget = controls.target.clone();
    const savedEnabled = controls.enabled;
    const savedView = camera.view && camera.view.enabled ? { ...camera.view } : null;

    camera.clearViewOffset();
    camera.fov = fov;
    camera.aspect = aspect;
    camera.position.set(position[0], position[1], position[2]);
    controls.target.set(target[0], target[1], target[2]);
    controls.enabled = true;
    camera.lookAt(controls.target);
    camera.updateMatrixWorld(true);
    camera.updateProjectionMatrix();

    enforce();

    const legalPosition = [camera.position.x, camera.position.y, camera.position.z];
    const legalTarget = [controls.target.x, controls.target.y, controls.target.z];

    // Restore exact live state
    camera.position.copy(savedPos);
    camera.quaternion.copy(savedQuat);
    camera.up.copy(savedUp);
    camera.fov = savedFov;
    camera.aspect = savedAspect;
    if (savedView) {
      camera.setViewOffset(
        savedView.fullWidth,
        savedView.fullHeight,
        savedView.offsetX,
        savedView.offsetY,
        savedView.width,
        savedView.height
      );
    } else {
      camera.clearViewOffset();
    }
    camera.updateMatrixWorld(true);
    camera.updateProjectionMatrix();
    controls.target.copy(savedTarget);
    controls.enabled = savedEnabled;

    return { position: legalPosition, target: legalTarget };
  }

  function getFlags() {
    return { ...lastFlags };
  }

  return {
    enforce,
    solveLegalPose,
    getFlags,
  };
}

/**
 * Deterministic adversarial fuzz test (`>= 1,200` extreme & pseudo-random pan/orbit/zoom/gaze
 * perturbations) verifying that `viewportConstraints.enforce()` preserves:
 *   - `cam.y >= 1.85 m` and `cam.y >= localGroundElevation(x, z) + 1.65 m` (`0` underground frames)
 *   - `dist <= 556 m` and `hypot(cam.x, cam.z) <= 556 m` (`0` world-edge / mist-horizon escapes)
 *   - `computeStructuralClearanceM(cam) >= 0` (`0` pier / lattice interior clips)
 *   - Tower spine `|ndc_x| <= 0.60`, `|ndc_y| <= 0.80`, `ndc_z < 1` (`0` outward-looking / lost-Tower frames)
 * Restores exact camera & controls state before returning.
 */
export function runAdversarialConstraintFuzz({
  THREE,
  camera,
  controls,
  constraints,
  iterations = 1500,
} = {}) {
  const savedPos = camera.position.clone();
  const savedQuat = camera.quaternion.clone();
  const savedUp = camera.up.clone();
  const savedFov = camera.fov;
  const savedAspect = camera.aspect;
  const savedView = camera.view && camera.view.enabled ? { ...camera.view } : null;
  const savedTarget = controls.target.clone();
  const savedEnabled = controls.enabled;

  // Deterministic Mulberry32 PRNG
  let seed = 0x18890331;
  const rand = () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const randRange = (lo, hi) => lo + (hi - lo) * rand();

  camera.clearViewOffset();
  camera.fov = 42;
  camera.updateProjectionMatrix();
  controls.enabled = true;

  let undergroundViolations = 0;
  let worldEdgeViolations = 0;
  let pierClipViolations = 0;
  let outwardGazeViolations = 0;
  let towerOutsideViewportViolations = 0;

  let minRecordedCamY = Infinity;
  let maxRecordedDist = 0;
  let maxRecordedAxisR = 0;
  let minRecordedStructuralClearance = Infinity;
  let maxSpineAbsNdcX = 0;
  let maxSpineAbsNdcY = 0;
  let minCosYawToSpine = 1.0;

  const probeSpine = new THREE.Vector3();
  const ndcSpine = new THREE.Vector3();

  // Seed with explicit worst-case adversarial attacks + random walk/teleport stress
  const explicitAttacks = [
    // 1. Subterranean plunge under Tower center
    { cam: [0, -120, 40], tgt: [0, -50, 0] },
    // 2. Chaillot hill NW underground plunge (ground is +24 m at Z = -700)
    { cam: [-40, 5, -550], tgt: [0, 30, 0] },
    // 3. Inside esplanade looking radially OUTWARD away from Tower into Paris blocks
    { cam: [10, 12, 10], tgt: [180, 12, 180] },
    // 4. Directly inside Pile 2 (Est) masonry & iron rafters
    { cam: [48, 8, 48], tgt: [0, 40, 0] },
    // 5. Directly inside Pile 4 (Ouest) at 30m height
    { cam: [-38, 30, -38], tgt: [0, 55, 0] },
    // 6. Directly inside upper shaft at 180m
    { cam: [2, 180, 2], tgt: [0, 200, 0] },
    // 7. Extreme 2500m zoom-out beyond mist wall
    { cam: [1400, 90, 1800], tgt: [0, 120, 0] },
    // 8. Extreme sideways pan trying to lose Tower off screen edge
    { cam: [220, 50, 380], tgt: [-450, 50, 380] },
    // 9. Extreme upward sky pan above lightning rod
    { cam: [120, 40, 180], tgt: [0, 900, 0] },
    // 10. Zenith / nadir pole gimbal lock attack
    { cam: [0.001, 600, 0.001], tgt: [0, 100, 0] },
  ];

  const totalSteps = Math.max(explicitAttacks.length, Number(iterations) || 1500);

  for (let i = 0; i < totalSteps; i++) {
    if (i < explicitAttacks.length) {
      camera.position.set(...explicitAttacks[i].cam);
      controls.target.set(...explicitAttacks[i].tgt);
    } else if (i % 3 === 0) {
      // Aggressive random teleport anywhere in [-1200..1200] x [-150..500] x [-1200..1200]
      camera.position.set(
        randRange(-1100, 1100),
        randRange(-140, 480),
        randRange(-1100, 1100)
      );
      controls.target.set(
        randRange(-500, 500),
        randRange(-90, 450),
        randRange(-500, 500)
      );
    } else {
      // Adversarial incremental pan + downward drag + zoom lunge from previous legal state
      controls.target.x += randRange(-140, 140);
      controls.target.y += randRange(-95, 95);
      controls.target.z += randRange(-140, 140);
      camera.position.x += randRange(-220, 220);
      camera.position.y += randRange(-160, 120);
      camera.position.z += randRange(-220, 220);
    }

    constraints.enforce();

    const cx = camera.position.x;
    const cy = camera.position.y;
    const cz = camera.position.z;
    const tx = controls.target.x;
    const ty = controls.target.y;
    const tz = controls.target.z;

    const groundY = localGroundElevation(cx, cz);
    const dist = camera.position.distanceTo(controls.target);
    const axisR = Math.hypot(cx, cz);
    const structClear = computeStructuralClearanceM(cx, cy, cz);

    if (cy < minRecordedCamY) minRecordedCamY = cy;
    if (dist > maxRecordedDist) maxRecordedDist = dist;
    if (axisR > maxRecordedAxisR) maxRecordedAxisR = axisR;
    if (structClear < minRecordedStructuralClearance) minRecordedStructuralClearance = structClear;

    if (cy < 1.85 - 1e-4 || cy < groundY + 1.65 - 1e-4) {
      undergroundViolations++;
    }
    if (dist > 556.0 || axisR > 556.0) {
      worldEdgeViolations++;
    }
    if (structClear < -0.1) {
      pierClipViolations++;
    }

    // Check outward gaze & NDC spine framing
    const toSpineLen = Math.hypot(cx, cz);
    const lookLen = Math.hypot(tx - cx, tz - cz);
    if (toSpineLen > 1e-3 && lookLen > 1e-3) {
      const cosYaw = ((-cx * (tx - cx)) + (-cz * (tz - cz))) / (toSpineLen * lookLen);
      if (cosYaw < minCosYawToSpine) minCosYawToSpine = cosYaw;
      if (cosYaw < 0.72) {
        outwardGazeViolations++;
      }
    }

    probeSpine.set(0, clamp(ty, 12.0, 290.0), 0);
    ndcSpine.copy(probeSpine).project(camera);
    if (Math.abs(ndcSpine.x) > maxSpineAbsNdcX) maxSpineAbsNdcX = Math.abs(ndcSpine.x);
    if (Math.abs(ndcSpine.y) > maxSpineAbsNdcY) maxSpineAbsNdcY = Math.abs(ndcSpine.y);
    if (
      ndcSpine.z >= 1.0 ||
      Math.abs(ndcSpine.x) > 0.60 ||
      Math.abs(ndcSpine.y) > 0.81
    ) {
      towerOutsideViewportViolations++;
    }
  }

  // Restore exact original state
  camera.position.copy(savedPos);
  camera.quaternion.copy(savedQuat);
  camera.up.copy(savedUp);
  camera.fov = savedFov;
  camera.aspect = savedAspect;
  if (savedView) {
    camera.setViewOffset(
      savedView.fullWidth,
      savedView.fullHeight,
      savedView.offsetX,
      savedView.offsetY,
      savedView.width,
      savedView.height
    );
  } else {
    camera.clearViewOffset();
  }
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  controls.target.copy(savedTarget);
  controls.enabled = savedEnabled;
  flushOrbitControlsMomentum(controls, { spherical: true, pan: true, scale: true });

  const totalViolations =
    undergroundViolations +
    worldEdgeViolations +
    pierClipViolations +
    outwardGazeViolations +
    towerOutsideViewportViolations;

  return {
    passed: totalViolations === 0,
    passes: totalViolations === 0,
    iterations: totalSteps,
    totalViolations,
    violations: {
      underground: undergroundViolations,
      worldEdge: worldEdgeViolations,
      pierClip: pierClipViolations,
      outwardGaze: outwardGazeViolations,
      towerOutsideViewport: towerOutsideViewportViolations,
    },
    boundsObserved: {
      minCamY: Number(minRecordedCamY.toFixed(3)),
      maxDist: Number(maxRecordedDist.toFixed(3)),
      maxAxisRadiusXZ: Number(maxRecordedAxisR.toFixed(3)),
      minStructuralClearanceM: Number(minRecordedStructuralClearance.toFixed(3)),
      minCosYawToSpine: Number(minCosYawToSpine.toFixed(4)),
      maxSpineAbsNdcX: Number(maxSpineAbsNdcX.toFixed(4)),
      maxSpineAbsNdcY: Number(maxSpineAbsNdcY.toFixed(4)),
    },
  };
}
