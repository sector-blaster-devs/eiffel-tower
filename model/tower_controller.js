/**
 * Physically Grounded Eiffel Tower Construction & Ambient Kinematics Controller
 * (`model/tower_controller.js`)
 *
 *   - Loads all 5 procedural Eiffel zones (`159` total pieces; `148` permanent pieces,
 *     `627` meshes, `3,176,054` triangles at `step = 11.0`).
 *   - Drives zone geometry construction via `BuildKinematicsEngine` (caisson pneumatic sinking, stepped
 *     masonry courses, 54.6° inclined shoe hydraulic seating, battered derrick/creeper hoists with
 *     damped pendulum sway & live 3D hoist cables, `boîte à sable` platform girder bleed, 74m arch
 *     cantilever closure, and top-down falsework dismantling).
 *   - Guarantees `0.000 m` origin/floor plunge across `[0.0 .. 11.0]` and exact canonical resting
 *     geometry at all 8 calibrated PnP steps (`0.55, 1.50, 3.55, 3.60, 4.85, 5.66, 6.52, 11.0`).
 *   - Enforces strict `0` emissive / `0` `emissiveMap` compliance across all Tower materials,
 *     automatically enables `renderer.localClippingEnabled = true`, and flags `shadowMap.needsUpdate`
 *     only when construction geometry changes.
 */

import { createMaterials } from 'museum/model/materials.js';
import { buildZone as buildZone1 } from 'museum/model/modules/zone1_foundations_piers1.js';
import { buildZone as buildZone2 } from 'museum/model/modules/zone2_arches_floor1.js';
import { buildZone as buildZone3 } from 'museum/model/modules/zone3_middle_floor2_merger.js';
import { buildZone as buildZone4 } from 'museum/model/modules/zone4_upper_shaft_summit.js';
import { buildZone as buildZone5 } from 'museum/model/modules/zone5_elevators_cranes_falsework.js';
import { BuildKinematicsEngine } from './build_kinematics.js';

const ZONE_DEFS = [
  {
    slot: 'zone1',
    id: 'zone1_foundations_piers1',
    expectedY: [-11.55, 57.63],
    buildFn: buildZone1,
  },
  {
    slot: 'zone2',
    id: 'zone2_arches_floor1',
    expectedY: [1.95, 69.20],
    buildFn: buildZone2,
  },
  {
    slot: 'zone3',
    id: 'zone3_middle_floor2_merger',
    expectedY: [57.20, 197.02],
    buildFn: buildZone3,
  },
  {
    slot: 'zone4',
    id: 'zone4_upper_shaft_summit',
    expectedY: [178.98, 312.275],
    buildFn: buildZone4,
  },
  {
    slot: 'zone5',
    id: 'zone5_elevators_cranes_falsework',
    expectedY: [-11.55, 295.0],
    buildFn: buildZone5,
  },
];

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Exact local bounding box relative to `rootObj` (`0.000 m` origin plunge).
 */
export function computeLocalGeometryBox(THREE, rootObj) {
  const box = new THREE.Box3();
  const tmpBox = new THREE.Box3();
  const relMat = new THREE.Matrix4();
  const instMat = new THREE.Matrix4();
  const fullMat = new THREE.Matrix4();

  if (rootObj) {
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
          tmpBox.copy(geom.boundingBox).applyMatrix4(fullMat);
          box.union(tmpBox);
        }
      } else {
        tmpBox.copy(geom.boundingBox).applyMatrix4(relMat);
        box.union(tmpBox);
      }
    });
  }
  return box;
}

export class TowerModelController {
  constructor({
    THREE,
    scene,
    renderer = null,
    widenSpans = true,
    onShadowInvalidate = null,
    providedMaterials = null,
  } = {}) {
    if (!THREE) {
      throw new Error('TowerModelController requires { THREE, scene }.');
    }
    this.THREE = THREE;
    this.scene = scene || null;
    this.renderer = renderer || null;
    this.widenSpans = widenSpans !== false;
    this.onShadowInvalidate = typeof onShadowInvalidate === 'function' ? onShadowInvalidate : null;
    this.providedMaterials = providedMaterials || null;

    this.materials = null;
    this.rootGroup = null;
    this.kinematics = null;

    this.zones = new Map();
    this.pieces = [];
    this.step = 11.0;
    this.nightFactor = 0.0;
    this.initialized = false;

    this._initPromise = null;
    this._opticGroup = null;
    this._cutawayPortalId = null;
    this._elapsedSec = 0.0;
    this._shadowsDirty = true;
    this._sceneHookInstalled = false;

    if (this.renderer) {
      this.attachRenderer(this.renderer);
    }
  }

  attachRenderer(renderer) {
    if (!renderer) return;
    this.renderer = renderer;
    renderer.localClippingEnabled = true;
    if (renderer.shadowMap) {
      renderer.shadowMap.needsUpdate = true;
    }
  }

  _installSceneRenderHook() {
    if (!this.scene || this._sceneHookInstalled) return;
    const prevHook = this.scene.onBeforeRender;
    const self = this;
    this.scene.onBeforeRender = function stage2TowerSceneBeforeRender(
      renderer,
      scene,
      camera,
      renderTarget
    ) {
      if (renderer) {
        self.renderer = renderer;
        renderer.localClippingEnabled = true;
        if (self._shadowsDirty && renderer.shadowMap) {
          renderer.shadowMap.needsUpdate = true;
          self._shadowsDirty = false;
        }
      }
      if (typeof prevHook === 'function') {
        prevHook.call(this, renderer, scene, camera, renderTarget);
      }
    };
    this._sceneHookInstalled = true;
  }

  _markShadowsDirty() {
    this._shadowsDirty = true;
    if (this.renderer?.shadowMap) {
      this.renderer.shadowMap.needsUpdate = true;
    }
    if (this.onShadowInvalidate) {
      this.onShadowInvalidate(this.step);
    }
  }

  async init() {
    if (this._initPromise) return this._initPromise;
    this._initPromise = this._doInit();
    return this._initPromise;
  }

  async _doInit() {
    const { THREE } = this;

    this.materials = this.providedMaterials || createMaterials(THREE);
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'eiffel_tower_1889';
    if (this.scene) {
      this.scene.add(this.rootGroup);
      this._installSceneRenderHook();
    }

    this.zones.clear();
    this.pieces = [];

    for (const def of ZONE_DEFS) {
      const built = await def.buildFn({
        THREE,
        materials: this.materials,
      });

      if (!built || !built.group) {
        throw new Error(`Zone builder ${def.id} did not return { group, pieces }.`);
      }

      const zoneId = built.zoneId || def.id;
      built.group.name = zoneId;

      const setConstructionState =
        typeof built.setConstructionState === 'function'
          ? built.setConstructionState.bind(built)
          : null;
      const updateSummitAmbient =
        typeof built.updateSummitAmbient === 'function'
          ? built.updateSummitAmbient.bind(built)
          : null;

      const rawPieces = Array.isArray(built.pieces) ? built.pieces : [];
      const normalizedPieces = rawPieces
        .map((p, idx) => {
          const obj = p?.object3D || p?.mesh || p?.group;
          if (!obj) return null;
          obj.updateMatrix();
          const localBox = computeLocalGeometryBox(THREE, obj);
          const localCenter = localBox.isEmpty()
            ? new THREE.Vector3(0, 0, 0)
            : localBox.getCenter(new THREE.Vector3());
          return {
            id: p.id || `${def.slot}_piece_${idx}`,
            label: p.label || p.id || `${def.slot}_${idx}`,
            zoneSlot: def.slot,
            object3D: obj,
            phase: p.phase ?? 0,
            span:
              Array.isArray(p.span) && p.span.length === 2
                ? [Number(p.span[0]), Number(p.span[1])]
                : [0.0, 0.05],
            vanishSpan:
              Array.isArray(p.vanishSpan) && p.vanishSpan.length === 2
                ? [Number(p.vanishSpan[0]), Number(p.vanishSpan[1])]
                : null,
            category: p.category || 'permanent',
            yMin: p.yMin ?? null,
            yMax: p.yMax ?? null,
            photoRefs: p.photoRefs || [],
            basePos: obj.position.clone(),
            baseScale: obj.scale.clone(),
            baseQuat: obj.quaternion.clone(),
            localBox,
            localCenter,
          };
        })
        .filter(Boolean);

      this.rootGroup.add(built.group);
      this.pieces.push(...normalizedPieces);
      this.zones.set(def.slot, {
        slot: def.slot,
        zoneId,
        expectedY: def.expectedY,
        status: 'loaded',
        group: built.group,
        pieces: normalizedPieces,
        setConstructionState,
        updateSummitAmbient,
        moduleStats: built.stats || null,
      });
    }

    this._sanitizeMaterialsAndShadows();

    // Initialize Zone 5 carriages to completed rest before indexing canonical piece bounds
    for (const rec of this.zones.values()) {
      if (rec.setConstructionState) {
        rec.setConstructionState(11.0);
      }
    }

    this.kinematics = new BuildKinematicsEngine({
      THREE,
      rootGroup: this.rootGroup,
      zones: this.zones,
      pieces: this.pieces,
      materials: this.materials,
      widenSpans: this.widenSpans,
    });

    this.initialized = true;
    this.setStep(11.0);
    this.setNightFactor(0.0);

    return {
      materials: this.materials,
      rootGroup: this.rootGroup,
    };
  }

  _sanitizeMaterialsAndShadows() {
    this._opticGroup = null;
    if (!this.rootGroup) return;

    this.rootGroup.traverse((obj) => {
      if (obj.name === 'z4_fresnel_optic') {
        this._opticGroup = obj;
      }
      if (!obj.material) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      if (obj.isMesh) {
        const isGlass = mats.some((m) => m && (m.transparent || m.name === 'glass1889'));
        obj.castShadow = !isGlass;
        obj.receiveShadow = true;
      }
      // Enforce strict zero-emissive contract
      for (const m of mats) {
        if (!m) continue;
        if (m.emissive && typeof m.emissive.setHex === 'function') {
          m.emissive.setHex(0x000000);
        }
        if ('emissiveIntensity' in m) {
          m.emissiveIntensity = 0.0;
        }
        if ('emissiveMap' in m) {
          m.emissiveMap = null;
        }
      }
    });
  }

  setStep(step) {
    const numeric = Number(step);
    const nextStep = clamp(Number.isFinite(numeric) ? numeric : 11.0, 0.0, 11.0);
    const changed = Math.abs(nextStep - this.step) > 1e-6;
    this.step = nextStep;

    // 1. Run per-zone internal state FIRST (positions `zone5` climbing cranes & elevator carriages along rails)
    for (const rec of this.zones.values()) {
      if (rec.status !== 'loaded' || !rec.group) continue;
      if (rec.setConstructionState) {
        rec.setConstructionState(this.step);
      }
    }

    // 2. Apply Stage 2 physically grounded kinematics SECOND so `BuildKinematicsEngine` owns
    //    piece visibility, rigid hoist transforms, clipping planes, crane boom slewing & hoist cables!
    if (this.kinematics) {
      this.kinematics.applyStep(this.step, this._elapsedSec);
    }

    // 3. Preserve continuous summit flag / anemometer / Fresnel optic phase across `setStep` calls
    if (this._elapsedSec > 0 && this.step >= 8.76) {
      this._applySummitAmbient(this._elapsedSec);
    }

    if (this.rootGroup) {
      this.rootGroup.updateMatrixWorld(true);
    }

    if (changed) {
      this._markShadowsDirty();
    }
    return this.step;
  }

  setPortalCutaway(photoId = null) {
    const clean =
      photoId !== null && photoId !== undefined && String(photoId).trim() !== ''
        ? String(photoId).trim().replace(/^#/, '').padStart(2, '0')
        : null;
    if (this._cutawayPortalId === clean) return this._cutawayPortalId;
    this._cutawayPortalId = clean;
    if (this.initialized) {
      this.setStep(this.step);
      this._markShadowsDirty();
    }
    return this._cutawayPortalId;
  }

  getPortalCutaway() {
    return this._cutawayPortalId;
  }

  getStep() {
    return this.step;
  }

  setNightFactor(t) {
    const numeric = Number(t);
    this.nightFactor = clamp(Number.isFinite(numeric) ? numeric : 0.0, 0.0, 1.0);
    return this.nightFactor;
  }

  getNightFactor() {
    return this.nightFactor;
  }

  getPieceStats() {
    const visible = this.pieces.filter((p) => p.object3D?.visible).length;
    return {
      visible,
      total: this.pieces.length,
    };
  }

  getKinematicsTelemetry() {
    return this.kinematics ? this.kinematics.getTelemetry() : null;
  }

  setZoneVisibility(zoneKey, visible) {
    const rec = this.zones.get(zoneKey);
    if (rec?.group) {
      rec.group.visible = Boolean(visible);
      this._markShadowsDirty();
    }
  }

  resetDeterministicClock() {
    this._elapsedSec = 0.0;
    if (this.initialized) {
      this.setStep(this.step);
    }
  }

  _applySummitAmbient(elapsedSec) {
    const z4 = this.zones.get('zone4');
    if (z4 && z4.status === 'loaded' && typeof z4.updateSummitAmbient === 'function' && this.step >= 8.76) {
      z4.updateSummitAmbient(elapsedSec, this.step);
    } else if (this._opticGroup && this.step >= 8.8) {
      this._opticGroup.rotation.y = (elapsedSec * 0.45) % (Math.PI * 2);
    }
  }

  update(dt = 0, elapsedSec = null) {
    if (!this.initialized) return;

    const safeDt = Math.max(0, Number.isFinite(dt) ? dt : 0);
    if (Number.isFinite(elapsedSec)) {
      this._elapsedSec = elapsedSec;
    } else {
      this._elapsedSec += safeDt;
    }

    // Living summit motion (Tricolore flag wave, Robinson cup anemometer, Sautter-Lemonnier Fresnel drum)
    if (this.step >= 8.76) {
      this._applySummitAmbient(this._elapsedSec);
    }
  }

  /**
   * Programmatic geometry & timeline verification helper (headless tests & Debug View telemetry).
   */
  getMetrics() {
    const { THREE } = this;
    if (this.rootGroup) {
      this.rootGroup.updateMatrixWorld(true);
    }

    const totalBox = new THREE.Box3();
    const tmpBox = new THREE.Box3();
    const instMatrix = new THREE.Matrix4();
    const worldMat = new THREE.Matrix4();

    let meshCount = 0;
    let instancedMeshCount = 0;
    let lineCount = 0;
    let vertexCount = 0;
    let triangleCount = 0;

    for (const rec of this.zones.values()) {
      if (rec.status !== 'loaded' || !rec.group) continue;
      rec.group.traverseVisible((obj) => {
        const geom = obj.geometry;
        if (!geom) return;
        const posAttr = geom.attributes?.position;
        const vCount = posAttr ? posAttr.count : 0;

        if (obj.isInstancedMesh) {
          instancedMeshCount++;
          const count = obj.count ?? 0;
          vertexCount += vCount * count;
          const trisPer = geom.index ? geom.index.count / 3 : Math.floor(vCount / 3);
          triangleCount += trisPer * count;

          if (!geom.boundingBox) geom.computeBoundingBox();
          if (geom.boundingBox && !geom.boundingBox.isEmpty()) {
            for (let i = 0; i < count; i++) {
              obj.getMatrixAt(i, instMatrix);
              worldMat.multiplyMatrices(obj.matrixWorld, instMatrix);
              tmpBox.copy(geom.boundingBox).applyMatrix4(worldMat);
              totalBox.union(tmpBox);
            }
          }
        } else if (obj.isMesh) {
          meshCount++;
          vertexCount += vCount;
          const tris = geom.index ? geom.index.count / 3 : Math.floor(vCount / 3);
          triangleCount += tris;

          if (!geom.boundingBox) geom.computeBoundingBox();
          if (geom.boundingBox && !geom.boundingBox.isEmpty()) {
            tmpBox.copy(geom.boundingBox).applyMatrix4(obj.matrixWorld);
            totalBox.union(tmpBox);
          }
        } else if (obj.isLine || obj.isLineSegments) {
          lineCount++;
          vertexCount += vCount;
          if (!geom.boundingBox) geom.computeBoundingBox();
          if (geom.boundingBox && !geom.boundingBox.isEmpty()) {
            tmpBox.copy(geom.boundingBox).applyMatrix4(obj.matrixWorld);
            totalBox.union(tmpBox);
          }
        }
      });
    }

    const visiblePieceCount = this.pieces.filter((p) => p.object3D?.visible).length;
    return {
      step: this.step,
      nightFactor: this.nightFactor,
      loadedZonesCount: this.zones.size,
      totalPieceCount: this.pieces.length,
      visiblePieceCount,
      meshCount,
      instancedMeshCount,
      lineCount,
      vertexCount: Math.round(vertexCount),
      triangleCount: Math.round(triangleCount),
      kinematics: this.kinematics ? this.kinematics.getTelemetry() : null,
      bbox: totalBox.isEmpty()
        ? null
        : {
            min: totalBox.min.toArray().map((n) => Number(n.toFixed(3))),
            max: totalBox.max.toArray().map((n) => Number(n.toFixed(3))),
            size: [
              Number((totalBox.max.x - totalBox.min.x).toFixed(3)),
              Number((totalBox.max.y - totalBox.min.y).toFixed(3)),
              Number((totalBox.max.z - totalBox.min.z).toFixed(3)),
            ],
          },
    };
  }
}
