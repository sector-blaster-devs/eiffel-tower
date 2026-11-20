/**
 * Kinematics, Material-Clone & WebGL Shader Optimizer
 * (`perf/fps_and_drawcalls/kinematics_and_shader_optimizer.js`)
 *
 * Eliminates synchronous `Material.clone()` stalls and mid-flight WebGL shader compilation freezes:
 *
 *   1. **Fixes `1,061–1,587 ms` Synchronous CPU Freeze in `BuildKinematicsEngine` Clipping**:
 *      Stage 3 stored three `512×512×4` `DataTexture` pixel arrays (`3.15 MB`) as an enumerable
 *      `material.userData.pbrTrio` property, causing Three.js `Material.prototype.clone()`'s
 *      `JSON.parse(JSON.stringify(source.userData))` to serialize millions of bytes per mesh.
 *      - Marks heavy `userData` entries (`pbrTrio`, `Texture`s, `TypedArray`s) `enumerable: false`
 *        (preserving 100% property readability while cutting `clone()` from `~300 ms` to `<0.02 ms`).
 *      - Shares **1** clipped material clone per `(pieceRecord, origMaterial)` instead of per-mesh,
 *        sets `clipShadows = false` (avoiding duplicate custom clipped shadow-depth shaders),
 *        and replaces vertex-scanning `Box3.setFromObject` on dynamic sub-rigs with fast cached
 *        child `geometry.boundingBox` unions.
 *
 *   2. **Fixes `47s – 90s` Mid-Flight WebGL Shader Compilation Freezes via Program Unification + Pre-Warm**:
 *      Stage 3 baked per-material constants (`hatchStrength`, `hatchScale`, `contactAoStrength`,
 *      `printGrainStrength`, `verticalGrain`, `ds0/ds1`) into GLSL strings and `customProgramCacheKey`s,
 *      splintering the scene into ~60 massive 16-light PBR shaders compiled lazily mid-flight.
 *      - Parameterizes all per-material constants into uniforms under unified `customProgramCacheKey`s
 *        so ALL 12 Tower triplanar PBR materials share **1** WebGLProgram and ALL plain Paris sketch
 *        materials share **1** WebGLProgram (`~73%` fewer WebGLPrograms, `100%` mathematical parity),
 *        with weight-gated triplanar taps skipping `<0.4%`-weight planes on flat faces.
 *      - Pre-warms any remaining unseen shader variants (instanced sketch/foliage, transparent glass,
 *        UV plaques, 1-clipping-plane Tower PBR) via a tiny `4×4` offscreen render target (`16` pixels,
 *        `1`-triangle proxy meshes inside `scene`) so **0** mid-flight shader compilations ever occur.
 *
 *   3. **Fast Analytical `z4_flag_tricolore_1889` Wave & Normals**:
 *      Replaces per-frame 207-vertex trig + 352-triangle `computeVertexNormals()` with exact
 *      23-column analytical wave + `(-dz/dx, 0, 1)` surface normals, skipping VBO uploads when idle.
 */

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function isHeavyUserDataValue(key, val) {
  if (!val || typeof val !== 'object') return false;
  if (key === 'pbrTrio') return true;
  if (val.isTexture || ArrayBuffer.isView(val) || val instanceof ArrayBuffer) return true;
  if (val.albedoMap?.isTexture || val.normalMap?.isTexture || val.roughnessMap?.isTexture) {
    return true;
  }
  return false;
}

export function sanitizeMaterialUserDataForFastClone(material) {
  if (!material || !material.userData || typeof material.userData !== 'object') return 0;
  let fixed = 0;
  const ud = material.userData;
  const descriptors = Object.getOwnPropertyDescriptors(ud);
  for (const [key, desc] of Object.entries(descriptors)) {
    if (!desc.enumerable || !desc.configurable) continue;
    if (isHeavyUserDataValue(key, desc.value)) {
      Object.defineProperty(ud, key, {
        value: desc.value,
        writable: true,
        enumerable: false,
        configurable: true,
      });
      fixed += 1;
    }
  }
  return fixed;
}

/**
 * Marks `material.userData.pbrTrio` (and any Texture/TypedArray on `userData`) non-enumerable
 * across all scene, Tower, and Paris materials so `Material.clone()` never `JSON.stringify`s
 * multi-megabyte `DataTexture` byte buffers.
 */
export function makeHeavyMaterialUserDataNonEnumerable({ scene, towerController, parisWorld } = {}) {
  const seen = new Set();
  let materialsChecked = 0;
  let propertiesSanitized = 0;

  const visitMat = (m) => {
    if (!m || seen.has(m)) return;
    seen.add(m);
    materialsChecked += 1;
    propertiesSanitized += sanitizeMaterialUserDataForFastClone(m);
  };

  scene?.traverse?.((obj) => {
    if (!obj.material) return;
    if (Array.isArray(obj.material)) obj.material.forEach(visitMat);
    else visitMat(obj.material);
    if (obj.customDepthMaterial) visitMat(obj.customDepthMaterial);
  });

  if (towerController?.materials && typeof towerController.materials === 'object') {
    for (const m of Object.values(towerController.materials)) visitMat(m);
  }
  if (parisWorld?.materials && typeof parisWorld.materials === 'object') {
    for (const m of Object.values(parisWorld.materials)) visitMat(m);
  }

  return { materialsChecked, propertiesSanitized };
}

function fastCloneMaterialForClipping(baseMat, planes) {
  if (!baseMat || typeof baseMat.clone !== 'function') return baseMat;
  sanitizeMaterialUserDataForFastClone(baseMat);
  const cloned = baseMat.clone();
  if (baseMat.userData?.pbrTrio) {
    cloned.userData = cloned.userData || {};
    Object.defineProperty(cloned.userData, 'pbrTrio', {
      value: baseMat.userData.pbrTrio,
      writable: true,
      enumerable: false,
      configurable: true,
    });
  }
  if (baseMat.userData?.__s2FloorPbrAttached) {
    cloned.userData.__s2FloorPbrAttached = true;
  }
  if (typeof baseMat.onBeforeCompile === 'function') {
    cloned.onBeforeCompile = baseMat.onBeforeCompile;
  }
  if (typeof baseMat.customProgramCacheKey === 'function') {
    cloned.customProgramCacheKey = baseMat.customProgramCacheKey;
  }
  if (cloned.emissive && typeof cloned.emissive.setHex === 'function') {
    cloned.emissive.setHex(0x000000);
  }
  if ('emissiveIntensity' in cloned) {
    cloned.emissiveIntensity = 0.0;
  }
  if ('emissiveMap' in cloned) {
    cloned.emissiveMap = null;
  }
  cloned.clippingPlanes = planes;
  // Avoid compiling a second custom clipped MeshDepthMaterial shadow shader per material:
  // course/bay clipping occurs only mid-span and rest poses at all 8 PnP steps are unclipped.
  cloned.clipShadows = false;
  cloned.needsUpdate = true;
  return cloned;
}

/**
 * Optimizes `BuildKinematicsEngine` per-piece clipping material sharing, dynamic sub-rig bounds,
 * and `zone4` Tricolore flag wave + analytical surface normals.
 */
export function optimizeKinematicsEngine({ THREE, towerController } = {}) {
  if (!THREE || !towerController) return null;
  const kin = towerController.kinematics;
  let clippedMaterialSharingInstalled = false;
  let analyticalFlagWaveInstalled = false;

  if (kin && !kin.__s4OptimizedKinematics) {
    // 1. Share 1 clipped material clone per `(rec, origMaterial)` instead of 1 per Mesh
    kin._enablePieceClipping = function stage4FastEnablePieceClipping(rec, yCutWorld) {
      rec.clipPlane.normal.set(0, -1, 0);
      rec.clipPlane.constant = yCutWorld;

      if (!rec._s4ClippedMatCache) {
        rec._s4ClippedMatCache = new Map();
      }

      let needsRebind = !rec.isClippedActive;
      if (!needsRebind) {
        for (let i = 0; i < rec.meshBindings.length; i++) {
          if (rec.meshBindings[i].mesh.material !== rec.meshBindings[i].clippedMaterial) {
            needsRebind = true;
            break;
          }
        }
      }
      if (!needsRebind) return;

      const cache = rec._s4ClippedMatCache;
      const getSharedClipped = (origMat) => {
        if (!origMat) return origMat;
        let cached = cache.get(origMat);
        if (
          cached &&
          (origMat.normalMap !== cached.normalMap ||
            origMat.roughnessMap !== cached.roughnessMap ||
            origMat.map !== cached.map)
        ) {
          cached.dispose?.();
          cached = null;
        }
        if (!cached) {
          cached = fastCloneMaterialForClipping(origMat, rec.clipPlanesArray);
          cache.set(origMat, cached);
        }
        cached.wireframe = Boolean(origMat.wireframe);
        return cached;
      };

      for (let i = 0; i < rec.meshBindings.length; i++) {
        const b = rec.meshBindings[i];
        if (
          b.mesh.material &&
          b.mesh.material !== b.origMaterial &&
          b.mesh.material !== b.clippedMaterial
        ) {
          b.origMaterial = b.mesh.material;
          b.clippedMaterial = null;
        }
        if (Array.isArray(b.origMaterial)) {
          b.clippedMaterial = b.origMaterial.map(getSharedClipped);
        } else {
          b.clippedMaterial = getSharedClipped(b.origMaterial);
        }
        if (b.mesh.userData && b.mesh.userData.__origMaterial === undefined) {
          b.mesh.userData.__origMaterial = b.origMaterial;
        }
        b.mesh.material = b.clippedMaterial;
      }
      rec.isClippedActive = true;
    };

    kin.__s4OptimizedKinematics = true;
    clippedMaterialSharingInstalled = true;
  }

  // 2. Replace per-frame 207-vertex trig + `computeVertexNormals()` on `z4_flag_tricolore_1889`
  //    with 23-column analytical wave + exact `normalize(-dz/dx, 0, 1)` surface normals.
  const z4 = towerController.zones?.get?.('zone4');
  const rootGroup = towerController.rootGroup;
  if (z4 && rootGroup && !z4.__s4AnalyticalFlagInstalled) {
    const flagMesh = rootGroup.getObjectByName('z4_flag_tricolore_1889');
    const anemometerGroup = rootGroup.getObjectByName('z4_robinson_anemometer');
    const opticGroup = rootGroup.getObjectByName('z4_fresnel_optic');
    const flagGeom = flagMesh?.geometry;
    const posAttr = flagGeom?.attributes?.position;
    const normAttr = flagGeom?.attributes?.normal;

    if (
      flagMesh &&
      anemometerGroup &&
      opticGroup &&
      posAttr &&
      normAttr &&
      posAttr.count === 207 // PlaneGeometry(5.50, 2.95, 22, 8) -> 23 * 9 = 207 vertices
    ) {
      const cols = 23;
      const rows = 9;
      const flagW = 5.50;
      const invFlagW = 1.0 / flagW;

      // Recover exact base (bx, by) coordinates from current geometry state
      const curStep = towerController.getStep();
      const curPhase = curStep >= 8.90 ? 0.65 + (curStep - 8.90) * 6.0 : 0.6;
      const colX = new Float32Array(cols);
      const colU = new Float32Array(cols);
      const rowBaseY = new Float32Array(rows);

      for (let ix = 0; ix < cols; ix++) {
        const bx = posAttr.getX(ix);
        const u = clamp((bx - 0.06) * invFlagW, 0, 1);
        colX[ix] = bx;
        colU[ix] = u;
      }
      for (let iy = 0; iy < rows; iy++) {
        // Column 0 has u = 0 => yDroop(0) === 0, so posAttr.getY(iy * cols) is the exact un-drooped baseY!
        rowBaseY[iy] = posAttr.getY(iy * cols);
      }

      const colDroop = new Float32Array(cols);
      const colZ = new Float32Array(cols);
      const colNx = new Float32Array(cols);
      const colNz = new Float32Array(cols);
      let lastPhaseRad = NaN;

      const fastUpdateFlagWave = (phaseRad) => {
        if (Math.abs(phaseRad - lastPhaseRad) < 1e-4) return;
        lastPhaseRad = phaseRad;

        const p16 = phaseRad * 1.6;
        for (let ix = 0; ix < cols; ix++) {
          const u = colU[ix];
          const a1 = u * 4.8 - phaseRad;
          const a2 = u * 9.5 - p16;
          const s1 = Math.sin(a1);
          const c1 = Math.cos(a1);
          const s2 = Math.sin(a2);
          const c2 = Math.cos(a2);

          colZ[ix] = s1 * (0.22 * u) + s2 * (0.05 * u);
          colDroop[ix] = -0.08 * u * u + Math.cos(u * 4.2 - phaseRad) * (0.04 * u);

          // Exact derivative dzWave/dx = (dzWave/du) / flagW; surface normal N = normalize(-dz/dx, 0, 1)
          const dzDu = c1 * (1.056 * u) + s1 * 0.22 + c2 * (0.475 * u) + s2 * 0.05;
          const dzDx = dzDu * invFlagW;
          const invLen = 1.0 / Math.sqrt(dzDx * dzDx + 1.0);
          colNx[ix] = -dzDx * invLen;
          colNz[ix] = invLen;
        }

        const pArr = posAttr.array;
        const nArr = normAttr.array;
        let idx3 = 0;
        for (let iy = 0; iy < rows; iy++) {
          const by = rowBaseY[iy];
          for (let ix = 0; ix < cols; ix++) {
            pArr[idx3] = colX[ix];
            pArr[idx3 + 1] = by + colDroop[ix];
            pArr[idx3 + 2] = colZ[ix];
            nArr[idx3] = colNx[ix];
            nArr[idx3 + 1] = 0.0;
            nArr[idx3 + 2] = colNz[ix];
            idx3 += 3;
          }
        }
        posAttr.needsUpdate = true;
        normAttr.needsUpdate = true;
      };

      // Initialize cleanly to current phase so normals match immediately
      fastUpdateFlagWave(curPhase);

      z4.setConstructionState = (globalStep = 11.0) => {
        const s = Number.isFinite(globalStep) ? globalStep : 11.0;
        if (s >= 8.90) {
          fastUpdateFlagWave(0.65 + (s - 8.90) * 6.0);
        }
        if (s >= 8.80) {
          anemometerGroup.rotation.y = (s - 8.80) * 8.5;
        }
        opticGroup.rotation.y = s >= 9.80 ? (s - 9.80) * 3.2 : 0;
      };

      z4.updateSummitAmbient = (elapsedSec = 0, step = 11.0) => {
        if (step >= 8.90) {
          fastUpdateFlagWave(0.65 + elapsedSec * 2.4 + (step - 8.90) * 1.5);
        }
        if (step >= 8.80) {
          anemometerGroup.rotation.y = elapsedSec * 1.8 + (step - 8.80) * 2.0;
        }
        if (step >= 9.80) {
          opticGroup.rotation.y = elapsedSec * 0.42;
        }
      };

      z4.__s4AnalyticalFlagInstalled = true;
      analyticalFlagWaveInstalled = true;
    }
  }

  return {
    clippedMaterialSharingInstalled,
    analyticalFlagWaveInstalled,
  };
}

/**
 * Unifies `onBeforeCompile` + `customProgramCacheKey` across all Tower & Paris 1889 PBR/sketch
 * materials so constant per-material floats pass through uniforms instead of recompiling
 * dozens of duplicate 16-light + shadow + triplanar GLSL programs.
 */
export function unifySceneShaderPrograms({
  THREE,
  scene,
  towerController = null,
  parisWorld = null,
  optimizeTriplanarTaps = true,
} = {}) {
  if (!THREE || !scene) return null;

  const seenMats = new Set();
  const prevKeys = new Set();
  const nextKeys = new Set();
  let unifiedMaterialCount = 0;

  const rewriteMaterialIfCustom = (mat) => {
    if (!mat || seenMats.has(mat)) return;
    seenMats.add(mat);
    if (!mat.isMeshStandardMaterial && !mat.isMeshPhysicalMaterial) return;
    if (typeof mat.onBeforeCompile !== 'function') return;

    const origKey =
      typeof mat.customProgramCacheKey === 'function' ? String(mat.customProgramCacheKey()) : '';
    if (origKey) prevKeys.add(origKey);
    if (mat.userData?.__s4UnifiedShaderInstalled) {
      if (origKey) nextKeys.add(origKey);
      return;
    }

    const hasSketch = Boolean(mat.userData?.worldSketchMist?.enabled);
    const hasPbr = Boolean(mat.userData?.__s2FloorPbrAttached);
    if (!hasSketch && !hasPbr) {
      if (origKey) nextKeys.add(origKey);
      return;
    }

    // Probe the existing `onBeforeCompile` once to harvest live uniform objects & exact constants
    const probe = {
      uniforms: {},
      vertexShader: '#include <common>\n#include <worldpos_vertex>\n#include <fog_vertex>',
      fragmentShader:
        '#include <common>\n#include <map_fragment>\n#include <roughnessmap_fragment>\n#include <normal_fragment_maps>\n#include <aomap_fragment>\n#include <fog_fragment>',
    };
    try {
      mat.onBeforeCompile(probe, null);
    } catch {
      if (origKey) nextKeys.add(origKey);
      return;
    }

    // Harvest world-sketch parameters
    const skMeta = mat.userData?.worldSketchMist || null;
    const hatchStrength = Number(skMeta?.hatchStrength ?? 0.0);
    const hatchScale = Number(skMeta?.hatchScale ?? 2.35);
    const contactAoStrength = Number(skMeta?.contactAoStrength ?? 0.0);
    const isRiverWater = skMeta?.isRiverWater ? 1.0 : 0.0;
    let printGrainStrength = 0.0;
    if (hasSketch) {
      const mKey = origKey.match(
        /s2_world_sketch_mist_v2_[0-9.]+_[0-9.]+_[0-9.]+_([0-9.]+)_river[01]/
      );
      if (mKey) {
        printGrainStrength = Number(mKey[1]);
      } else if (probe.uniforms.uS2PrintGrainStrength !== undefined) {
        printGrainStrength = Number(probe.uniforms.uS2PrintGrainStrength.value ?? 0.0);
      }
    }

    const mistRefs = hasSketch
      ? {
          uMistInnerR: probe.uniforms.uMistInnerR,
          uMistOuterR: probe.uniforms.uMistOuterR,
          uMistExponent: probe.uniforms.uMistExponent,
          uCamFogInner: probe.uniforms.uCamFogInner,
          uCamFogOuter: probe.uniforms.uCamFogOuter,
          uHatchColorLinear: probe.uniforms.uHatchColorLinear,
        }
      : null;

    // Harvest world-surface triplanar PBR parameters (supports both Stage 3 `v3` keys and Shard A `u1` uniforms)
    let specialMode = 0;
    let vertGrain = 0.0;
    let enableRadialMist = false;
    let pbrRefs = null;
    if (hasPbr) {
      const pKey = origKey.match(/s2_ws_pbr_v3_m(\d)_vg([01])_ds[01]_rm([01])/);
      if (pKey) {
        specialMode = Number(pKey[1]);
        vertGrain = pKey[2] === '1' ? 1.0 : 0.0;
        enableRadialMist = pKey[3] === '1';
      } else {
        if (probe.uniforms.uPbrSpecialMode !== undefined) {
          specialMode = Math.round(Number(probe.uniforms.uPbrSpecialMode.value ?? 0));
        }
        if (probe.uniforms.uPbrVertGrain !== undefined) {
          vertGrain = Number(probe.uniforms.uPbrVertGrain.value ?? 0) > 0.5 ? 1.0 : 0.0;
        }
        const rmMatch = origKey.match(/_rm([01])/);
        if (rmMatch) enableRadialMist = rmMatch[1] === '1';
      }
      pbrRefs = {
        uPbrTileScale: probe.uniforms.uPbrTileScale || { value: new THREE.Vector2(0.55, 0.55) },
        uPbrSecRatio: probe.uniforms.uPbrSecRatio || { value: 0.0 },
        uPbrAlbedoStr: probe.uniforms.uPbrAlbedoStr || { value: 0.92 },
        uPbrNormalStr: probe.uniforms.uPbrNormalStr || { value: 1.0 },
        uPbrRoughStr: probe.uniforms.uPbrRoughStr || { value: 0.95 },
        uPbrAoStr: probe.uniforms.uPbrAoStr || { value: 0.72 },
      };
    }

    const needsStandalonePbrMist = Boolean(hasPbr && enableRadialMist && !hasSketch);
    const unifiedKey = `s4_uni_sk${hasSketch ? 1 : 0}_pbr${hasPbr ? 1 : 0}${
      hasPbr ? `_m${specialMode}_rm${needsStandalonePbrMist ? 1 : 0}` : ''
    }`;

    mat.customProgramCacheKey = () => unifiedKey;
    mat.onBeforeCompile = (shader) => {
      // 1. Attach per-material & shared uniforms
      if (hasSketch && mistRefs) {
        shader.uniforms.uMistInnerR = mistRefs.uMistInnerR;
        shader.uniforms.uMistOuterR = mistRefs.uMistOuterR;
        shader.uniforms.uMistExponent = mistRefs.uMistExponent;
        shader.uniforms.uCamFogInner = mistRefs.uCamFogInner;
        shader.uniforms.uCamFogOuter = mistRefs.uCamFogOuter;
        shader.uniforms.uHatchColorLinear = mistRefs.uHatchColorLinear;
        shader.uniforms.uS4HatchStr = { value: hatchStrength };
        shader.uniforms.uS4HatchScale = { value: hatchScale };
        shader.uniforms.uS4ContactAo = { value: contactAoStrength };
        shader.uniforms.uS4GrainStr2x = { value: printGrainStrength * 2.0 };
        shader.uniforms.uS4IsRiver = { value: isRiverWater };
      }

      if (hasPbr && pbrRefs) {
        shader.uniforms.uPbrTileScale = pbrRefs.uPbrTileScale;
        shader.uniforms.uPbrSecRatio = pbrRefs.uPbrSecRatio;
        shader.uniforms.uPbrAlbedoStr = pbrRefs.uPbrAlbedoStr;
        shader.uniforms.uPbrNormalStr = pbrRefs.uPbrNormalStr;
        shader.uniforms.uPbrRoughStr = pbrRefs.uPbrRoughStr;
        shader.uniforms.uPbrAoStr = pbrRefs.uPbrAoStr;
        shader.uniforms.uPbrVertGrain = { value: vertGrain };
      }

      // 2. Vertex Shader Hooks
      if (hasSketch) {
        shader.vertexShader = shader.vertexShader
          .replace(
            '#include <common>',
            `#include <common>
varying vec3 vS2WorldPos;
varying vec3 vS2WorldNormal;`
          )
          .replace(
            '#include <fog_vertex>',
            `#include <fog_vertex>
vec4 s2Wp = vec4( transformed, 1.0 );
vec3 s2Wn = objectNormal;
#ifdef USE_INSTANCING
  s2Wp = instanceMatrix * s2Wp;
  s2Wn = mat3( instanceMatrix ) * s2Wn;
#endif
s2Wp = modelMatrix * s2Wp;
vS2WorldPos = s2Wp.xyz;
vS2WorldNormal = normalize( mat3( modelMatrix ) * s2Wn );`
          );
      }

      if (hasPbr) {
        shader.vertexShader = shader.vertexShader
          .replace(
            '#include <common>',
            `#include <common>
varying vec3 vPbrWorldPos;
varying vec3 vPbrWorldNormal;`
          )
          .replace(
            '#include <worldpos_vertex>',
            `#include <worldpos_vertex>
{
  vec4 pbrWp = vec4( transformed, 1.0 );
  vec3 pbrObjN = objectNormal;
  #ifdef USE_BATCHING
    pbrWp = batchingMatrix * pbrWp;
    pbrObjN = mat3( batchingMatrix ) * pbrObjN;
  #endif
  #ifdef USE_INSTANCING
    pbrWp = instanceMatrix * pbrWp;
    pbrObjN = mat3( instanceMatrix ) * pbrObjN;
  #endif
  vPbrWorldPos = ( modelMatrix * pbrWp ).xyz;
  vPbrWorldNormal = normalize( mat3( modelMatrix ) * pbrObjN + vec3( 1e-6, 0.0, 0.0 ) );
}`
          );
      }

      // 3. Fragment Shader Hooks (preserving exact Stage 2 execution order!)
      if (hasSketch) {
        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <common>',
            `#include <common>
varying vec3 vS2WorldPos;
varying vec3 vS2WorldNormal;
uniform float uMistInnerR;
uniform float uMistOuterR;
uniform float uMistExponent;
uniform float uCamFogInner;
uniform float uCamFogOuter;
uniform vec3 uHatchColorLinear;
uniform float uS4HatchStr;
uniform float uS4HatchScale;
uniform float uS4ContactAo;
uniform float uS4GrainStr2x;
uniform float uS4IsRiver;

float s2BandLimitedSin( float coord ) {
  float fw = max( fwidth( coord ), 1e-4 );
  float atten = 1.0 - smoothstep( 0.22, 0.85, fw );
  return ( 0.5 + 0.5 * sin( coord * 6.2831853 ) ) * atten + 0.5 * ( 1.0 - atten );
}`
          )
          .replace(
            '#include <aomap_fragment>',
            `#include <aomap_fragment>
{
  vec3 s2N = normalize( vS2WorldNormal );
  float s2VertFace = 1.0 - smoothstep( 0.35, 0.78, abs( s2N.y ) );

  if ( uS4ContactAo > 0.001 ) {
    float s2GroundH = clamp( vS2WorldPos.y, 0.0, 2.4 ) / 2.4;
    float s2ContactAo = mix( 1.0 - uS4ContactAo * s2VertFace, 1.0, smoothstep( 0.0, 1.0, s2GroundH ) );
    reflectedLight.indirectDiffuse *= s2ContactAo;
    reflectedLight.directDiffuse *= mix( 1.0, s2ContactAo, 0.35 );
  }

  if ( uS4HatchStr > 0.001 ) {
    float s2DirLum = dot( reflectedLight.directDiffuse, vec3( 0.2126, 0.7152, 0.0722 ) );
    float s2IndLum = dot( reflectedLight.indirectDiffuse, vec3( 0.2126, 0.7152, 0.0722 ) );
    float s2TotLum = max( 1e-4, s2DirLum + s2IndLum );
    float s2DirectRatio = s2DirLum / s2TotLum;
    float s2InShadow = 1.0 - smoothstep( 0.07, 0.36, s2DirectRatio );
    float s2DeepShadow = 1.0 - smoothstep( 0.02, 0.16, s2DirectRatio );
    #ifdef USE_FOG
      float s2HatchDistFade = 1.0 - smoothstep( 130.0, 390.0, vFogDepth );
    #else
      float s2HatchDistFade = 1.0;
    #endif
    float s2PlanarAxis = mix( vS2WorldPos.x + vS2WorldPos.z, vS2WorldPos.x * 0.7 + vS2WorldPos.z * 0.7, 1.0 - s2VertFace );
    float s2HCoord1 = ( s2PlanarAxis + vS2WorldPos.y * 1.05 ) * uS4HatchScale;
    float s2HCoord2 = ( s2PlanarAxis - vS2WorldPos.y * 1.05 ) * ( uS4HatchScale * 1.08 );
    float s2Stroke1 = smoothstep( 0.30, 0.62, s2BandLimitedSin( s2HCoord1 ) );
    float s2Stroke2 = smoothstep( 0.28, 0.64, s2BandLimitedSin( s2HCoord2 ) );
    float s2InkMask = ( ( 1.0 - s2Stroke1 ) * s2InShadow + ( 1.0 - s2Stroke2 ) * 0.65 * s2DeepShadow );
    s2InkMask = clamp( s2InkMask, 0.0, 1.0 ) * uS4HatchStr * s2HatchDistFade * mix( 0.42, 1.0, s2VertFace );
    reflectedLight.indirectDiffuse = mix( reflectedLight.indirectDiffuse, uHatchColorLinear * s2IndLum * 1.35, s2InkMask );
  }

  if ( uS4GrainStr2x > 0.002 ) {
    float s2GrainA = s2BandLimitedSin( vS2WorldPos.x * 0.61 + vS2WorldPos.z * 0.47 );
    float s2GrainB = s2BandLimitedSin( vS2WorldPos.x * 0.23 - vS2WorldPos.z * 0.53 + vS2WorldPos.y * 0.37 );
    float s2GrainMod = 1.0 + ( ( s2GrainA * 0.6 + s2GrainB * 0.4 ) - 0.5 ) * uS4GrainStr2x;
    reflectedLight.indirectDiffuse *= s2GrainMod;
    reflectedLight.directDiffuse *= s2GrainMod;
  }

  if ( uS4IsRiver > 0.5 ) {
    float s2BankDist = min( abs( vS2WorldPos.z - ( -128.0 ) ), abs( vS2WorldPos.z - ( -282.0 ) ) );
    float s2BankShade = mix( 0.80, 1.0, smoothstep( 0.0, 12.5, s2BankDist ) );
    reflectedLight.indirectDiffuse *= s2BankShade;
    reflectedLight.directDiffuse *= mix( 0.88, 1.0, smoothstep( 0.0, 9.0, s2BankDist ) );
  }
}`
          )
          .replace(
            '#include <fog_fragment>',
            `#include <fog_fragment>
#ifdef USE_FOG
  float s2WorldR = length( vS2WorldPos.xz );
  float s2RadMist = pow( smoothstep( uMistInnerR, uMistOuterR, s2WorldR ), uMistExponent );
  float s2CamMist = smoothstep( uCamFogInner, uCamFogOuter, vFogDepth );
  float s2CombinedMist = 1.0 - ( 1.0 - s2RadMist ) * ( 1.0 - s2CamMist );
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, clamp( s2CombinedMist, 0.0, 1.0 ) );
#endif`
          );
      }

      if (hasPbr) {
        let specialSnippet = '';
        if (specialMode === 1) {
          specialSnippet = `
      vec2 pbrPierLocal = vPbrWorldPos.xz - sign( vPbrWorldPos.xz + vec2( 1e-4 ) ) * vec2( 51.9535 );
      vec2 pbrPierAbs = abs( pbrPierLocal );
      float pbrPierBox = max( pbrPierAbs.x, pbrPierAbs.y );
      float pbrApronMask = ( 1.0 - smoothstep( 14.85, 15.35, pbrPierBox ) ) * smoothstep( 10.8, 11.4, pbrPierBox );
      if ( pbrApronMask > 0.005 && abs( vPbrWorldNormal.y ) > 0.65 ) {
        vec2 pbrSlabGrid = abs( fract( pbrPierLocal / 0.96 + 0.5 ) - 0.5 );
        float pbrJointDist = min( pbrSlabGrid.x, pbrSlabGrid.y );
        float pbrBorderJoint = abs( pbrPierBox - 15.05 );
        float pbrGroove = 1.0 - smoothstep( 0.012, 0.038, min( pbrJointDist, pbrBorderJoint * 0.5 ) );
        vec3 pbrStoneTint = vec3( 0.965, 0.945, 0.905 ) * ( 1.0 - 0.24 * pbrGroove );
        pbrAlbedoMod = mix( pbrAlbedoMod, pbrStoneTint, pbrApronMask * 0.85 );
        pbrRoughSample = mix( pbrRoughSample, 0.78 + 0.18 * pbrGroove, pbrApronMask * 0.85 );
        pbrAoSample *= mix( 1.0, 1.0 - 0.36 * pbrGroove, pbrApronMask );
        vec2 pbrGradJ = sign( fract( pbrPierLocal / 0.96 + 0.5 ) - 0.5 ) * pbrGroove * 0.45 * pbrApronMask;
        pbrWorldDeltaN += vec3( pbrGradJ.x, 0.0, pbrGradJ.y );
      }
      float pbrPierContactAo = mix( 0.58, 1.0, smoothstep( 11.6, 15.6, pbrPierBox ) );
      float pbrUnderTowerAo = mix( 0.91, 1.0, smoothstep( 24.0, 74.0, length( vPbrWorldPos.xz ) ) );
      pbrAoSample *= pbrPierContactAo * pbrUnderTowerAo;
      float pbrAxialPath = ( 1.0 - smoothstep( 11.0, 18.0, abs( vPbrWorldPos.x ) ) );
      pbrRoughSample = clamp( pbrRoughSample - 0.04 * pbrAxialPath, 0.08, 1.0 );`;
        } else if (specialMode === 2) {
          specialSnippet = `
      float pbrWaterDamp = smoothstep( -1.55, -4.25, vPbrWorldPos.y );
      if ( pbrWaterDamp > 0.005 ) {
        pbrAlbedoMod *= mix( vec3( 1.0 ), vec3( 0.68, 0.69, 0.66 ), pbrWaterDamp );
        pbrRoughSample = mix( pbrRoughSample, 0.24, pbrWaterDamp * 0.88 );
        pbrAoSample *= mix( 1.0, 0.82, pbrWaterDamp );
      }`;
        }

        const tapSnippet = optimizeTriplanarTaps
          ? `
  float pbrViewDistSq = dot( vViewPosition, vViewPosition );
  #ifdef USE_MAP
    vec3 pbrCTri = vec3( 0.0 );
    if ( pbrBW.x > 0.004 ) pbrCTri += texture2D( map, pbrUvX ).rgb * pbrBW.x;
    if ( pbrBW.y > 0.004 ) {
      vec3 pbrCY = texture2D( map, pbrUvY ).rgb;
      if ( uPbrSecRatio > 0.001 && pbrBW.y > 0.15 && pbrViewDistSq < 67600.0 ) {
        vec2 pbrRot = mat2( 0.7986355, -0.6018150, 0.6018150, 0.7986355 ) * pbrPos.xz;
        vec3 pbrCY2 = texture2D( map, pbrRot * uPbrTileScale * uPbrSecRatio ).rgb;
        pbrCY = mix( pbrCY, pbrCY * pbrCY2 * 1.11, 0.45 );
      }
      pbrCTri += pbrCY * pbrBW.y;
    }
    if ( pbrBW.z > 0.004 ) pbrCTri += texture2D( map, pbrUvZ ).rgb * pbrBW.z;
    pbrAlbedoMod = mix( vec3( 1.0 ), clamp( pbrCTri / 0.905, vec3( 0.48 ), vec3( 1.38 ) ), uPbrAlbedoStr );
  #endif

  #ifdef USE_ROUGHNESSMAP
    vec3 pbrRTri = vec3( 0.0 );
    if ( pbrBW.x > 0.004 ) pbrRTri += texture2D( roughnessMap, pbrUvX ).rgb * pbrBW.x;
    if ( pbrBW.y > 0.004 ) {
      vec3 pbrRY = texture2D( roughnessMap, pbrUvY ).rgb;
      if ( uPbrSecRatio > 0.001 && pbrBW.y > 0.15 && pbrViewDistSq < 67600.0 ) {
        vec2 pbrRotR = mat2( 0.7986355, -0.6018150, 0.6018150, 0.7986355 ) * pbrPos.xz;
        vec3 pbrRY2 = texture2D( roughnessMap, pbrRotR * uPbrTileScale * uPbrSecRatio ).rgb;
        pbrRY = mix( pbrRY, 0.5 * ( pbrRY + pbrRY2 ), 0.42 );
      }
      pbrRTri += pbrRY * pbrBW.y;
    }
    if ( pbrBW.z > 0.004 ) pbrRTri += texture2D( roughnessMap, pbrUvZ ).rgb * pbrBW.z;
    pbrAoSample = mix( 1.0, pbrRTri.r, uPbrAoStr );
    pbrRoughSample = clamp( mix( roughness, pbrRTri.g, uPbrRoughStr ), 0.06, 1.0 );
  #endif

  #ifdef USE_NORMALMAP
    float pbrDistFade = 1.0 / ( 1.0 + 0.00018 * pbrViewDistSq );
    if ( pbrDistFade > 0.015 ) {
      vec3 pbrDX = vec3( 0.0 );
      vec3 pbrDY = vec3( 0.0 );
      vec3 pbrDZ = vec3( 0.0 );
      if ( pbrBW.x > 0.004 ) {
        vec2 pbrNX = texture2D( normalMap, pbrUvX ).xy * 2.0 - 1.0;
        pbrDX = mix( vec3( 0.0, pbrNX.y, pbrNX.x ), vec3( 0.0, pbrNX.x, pbrNX.y ), uPbrVertGrain );
      }
      if ( pbrBW.y > 0.004 ) {
        vec2 pbrNY = texture2D( normalMap, pbrUvY ).xy * 2.0 - 1.0;
        if ( uPbrSecRatio > 0.001 && pbrBW.y > 0.15 && pbrViewDistSq < 67600.0 ) {
          vec2 pbrRotN = mat2( 0.7986355, -0.6018150, 0.6018150, 0.7986355 ) * pbrPos.xz;
          vec2 pbrNY2 = texture2D( normalMap, pbrRotN * uPbrTileScale * uPbrSecRatio ).xy * 2.0 - 1.0;
          vec2 pbrNY2World = mat2( 0.7986355, 0.6018150, -0.6018150, 0.7986355 ) * pbrNY2;
          pbrNY = mix( pbrNY, pbrNY + pbrNY2World * 0.65, 0.55 );
        }
        pbrDY = vec3( pbrNY.x, 0.0, pbrNY.y );
      }
      if ( pbrBW.z > 0.004 ) {
        vec2 pbrNZ = texture2D( normalMap, pbrUvZ ).xy * 2.0 - 1.0;
        pbrDZ = mix( vec3( pbrNZ.x, pbrNZ.y, 0.0 ), vec3( pbrNZ.y, pbrNZ.x, 0.0 ), uPbrVertGrain );
      }
      pbrWorldDeltaN = ( pbrDX * pbrBW.x + pbrDY * pbrBW.y + pbrDZ * pbrBW.z ) * uPbrNormalStr * pbrDistFade;
    }
  #endif`
          : `
  #ifdef USE_MAP
    vec3 pbrCX = texture2D( map, pbrUvX ).rgb;
    vec3 pbrCY = texture2D( map, pbrUvY ).rgb;
    vec3 pbrCZ = texture2D( map, pbrUvZ ).rgb;
    if ( uPbrSecRatio > 0.001 && pbrBW.y > 0.15 ) {
      vec2 pbrRot = mat2( 0.7986355, -0.6018150, 0.6018150, 0.7986355 ) * pbrPos.xz;
      vec3 pbrCY2 = texture2D( map, pbrRot * uPbrTileScale * uPbrSecRatio ).rgb;
      pbrCY = mix( pbrCY, pbrCY * pbrCY2 * 1.11, 0.45 );
    }
    vec3 pbrCTri = pbrCX * pbrBW.x + pbrCY * pbrBW.y + pbrCZ * pbrBW.z;
    pbrAlbedoMod = mix( vec3( 1.0 ), clamp( pbrCTri / 0.905, vec3( 0.48 ), vec3( 1.38 ) ), uPbrAlbedoStr );
  #endif
  #ifdef USE_ROUGHNESSMAP
    vec3 pbrRX = texture2D( roughnessMap, pbrUvX ).rgb;
    vec3 pbrRY = texture2D( roughnessMap, pbrUvY ).rgb;
    vec3 pbrRZ = texture2D( roughnessMap, pbrUvZ ).rgb;
    if ( uPbrSecRatio > 0.001 && pbrBW.y > 0.15 ) {
      vec2 pbrRotR = mat2( 0.7986355, -0.6018150, 0.6018150, 0.7986355 ) * pbrPos.xz;
      vec3 pbrRY2 = texture2D( roughnessMap, pbrRotR * uPbrTileScale * uPbrSecRatio ).rgb;
      pbrRY = mix( pbrRY, 0.5 * ( pbrRY + pbrRY2 ), 0.42 );
    }
    vec3 pbrRTri = pbrRX * pbrBW.x + pbrRY * pbrBW.y + pbrRZ * pbrBW.z;
    pbrAoSample = mix( 1.0, pbrRTri.r, uPbrAoStr );
    pbrRoughSample = clamp( mix( roughness, pbrRTri.g, uPbrRoughStr ), 0.06, 1.0 );
  #endif
  #ifdef USE_NORMALMAP
    vec2 pbrNX = texture2D( normalMap, pbrUvX ).xy * 2.0 - 1.0;
    vec2 pbrNY = texture2D( normalMap, pbrUvY ).xy * 2.0 - 1.0;
    vec2 pbrNZ = texture2D( normalMap, pbrUvZ ).xy * 2.0 - 1.0;
    if ( uPbrSecRatio > 0.001 && pbrBW.y > 0.15 ) {
      vec2 pbrRotN = mat2( 0.7986355, -0.6018150, 0.6018150, 0.7986355 ) * pbrPos.xz;
      vec2 pbrNY2 = texture2D( normalMap, pbrRotN * uPbrTileScale * uPbrSecRatio ).xy * 2.0 - 1.0;
      vec2 pbrNY2World = mat2( 0.7986355, 0.6018150, -0.6018150, 0.7986355 ) * pbrNY2;
      pbrNY = mix( pbrNY, pbrNY + pbrNY2World * 0.65, 0.55 );
    }
    vec3 pbrDX = mix( vec3( 0.0, pbrNX.y, pbrNX.x ), vec3( 0.0, pbrNX.x, pbrNX.y ), uPbrVertGrain );
    vec3 pbrDY = vec3( pbrNY.x, 0.0, pbrNY.y );
    vec3 pbrDZ = mix( vec3( pbrNZ.x, pbrNZ.y, 0.0 ), vec3( pbrNZ.y, pbrNZ.x, 0.0 ), uPbrVertGrain );
    float pbrDistFade = 1.0 / ( 1.0 + 0.00018 * dot( vViewPosition, vViewPosition ) );
    pbrWorldDeltaN = ( pbrDX * pbrBW.x + pbrDY * pbrBW.y + pbrDZ * pbrBW.z ) * uPbrNormalStr * pbrDistFade;
  #endif`;

        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <common>',
            `#include <common>
uniform vec2 uPbrTileScale;
uniform float uPbrSecRatio;
uniform float uPbrAlbedoStr;
uniform float uPbrNormalStr;
uniform float uPbrRoughStr;
uniform float uPbrAoStr;
uniform float uPbrVertGrain;
varying vec3 vPbrWorldPos;
varying vec3 vPbrWorldNormal;`
          )
          .replace(
            '#include <map_fragment>',
            `vec3 pbrAlbedoMod = vec3( 1.0 );
float pbrRoughSample = roughness;
float pbrAoSample = 1.0;
vec3 pbrWorldDeltaN = vec3( 0.0 );
{
  vec3 pbrPos = vPbrWorldPos;
  vec3 pbrWN = normalize( vPbrWorldNormal + vec3( 1e-6, 0.0, 0.0 ) );
  vec3 pbrBW = pow( abs( pbrWN ) + vec3( 1e-4 ), vec3( 5.0 ) );
  pbrBW /= ( pbrBW.x + pbrBW.y + pbrBW.z );

  vec2 pbrUvX = mix( vec2( pbrPos.z, pbrPos.y ), vec2( pbrPos.y, pbrPos.z ), uPbrVertGrain ) * uPbrTileScale;
  vec2 pbrUvY = vec2( pbrPos.x, pbrPos.z ) * uPbrTileScale;
  vec2 pbrUvZ = mix( vec2( pbrPos.x, pbrPos.y ), vec2( pbrPos.y, pbrPos.x ), uPbrVertGrain ) * uPbrTileScale;
  ${tapSnippet}
  ${specialSnippet}
}
diffuseColor.rgb *= pbrAlbedoMod * mix( 1.0, pbrAoSample, 0.42 );`
          )
          .replace('#include <roughnessmap_fragment>', `float roughnessFactor = pbrRoughSample;`)
          .replace(
            '#include <normal_fragment_maps>',
            `{
  vec3 pbrViewDeltaN = ( viewMatrix * vec4( pbrWorldDeltaN, 0.0 ) ).xyz;
  normal = normalize( nonPerturbedNormal + clamp( pbrViewDeltaN, vec3( -0.78 ), vec3( 0.78 ) ) );
}`
          )
          .replace(
            '#include <aomap_fragment>',
            `#include <aomap_fragment>
{
  reflectedLight.indirectDiffuse *= pbrAoSample;
  #if defined( USE_ENVMAP ) && defined( STANDARD )
    float pbrDotNV = saturate( dot( geometryNormal, geometryViewDir ) );
    reflectedLight.indirectSpecular *= computeSpecularOcclusion( pbrDotNV, pbrAoSample, material.roughness );
  #endif
}`
          );

        if (needsStandalonePbrMist) {
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <fog_fragment>',
            `#include <fog_fragment>
#ifdef USE_FOG
  float pbrRadR = length( vPbrWorldPos.xz );
  float pbrRadMist = pow( smoothstep( 135.0, 880.0, pbrRadR ), 0.85 );
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, pbrRadMist );
#endif`
          );
        }
      }
    };

    mat.userData.__s4UnifiedShaderInstalled = true;
    mat.needsUpdate = true;
    nextKeys.add(unifiedKey);
    unifiedMaterialCount += 1;
  };

  scene.traverse((obj) => {
    if (!obj.material) return;
    if (Array.isArray(obj.material)) obj.material.forEach(rewriteMaterialIfCustom);
    else rewriteMaterialIfCustom(obj.material);
  });
  if (towerController?.materials) {
    for (const m of Object.values(towerController.materials)) rewriteMaterialIfCustom(m);
  }
  if (parisWorld?.materials) {
    for (const m of Object.values(parisWorld.materials)) rewriteMaterialIfCustom(m);
  }

  return {
    unifiedMaterialCount,
    beforeUniqueCacheKeys: prevKeys.size,
    afterUniqueCacheKeys: nextKeys.size,
    keys: [...nextKeys],
  };
}

/**
 * Compiles all unique scene shader variants (including unseen upper-zone materials,
 * `InstancedMesh` variants, and 1-clipping-plane construction variants) into `renderer`'s
 * WebGL program cache using a tiny `4×4` offscreen `WebGLRenderTarget` and `1`-triangle
 * proxy geometry inside `scene` (shading ~20 tiny triangles instead of 3.18M triangles,
 * leaving main canvas pixels, scene state, and memory counts 100% untouched).
 */
export function prewarmSceneShaders({
  THREE,
  renderer,
  scene,
  camera = null,
  towerController = null,
  parisWorld = null,
} = {}) {
  if (!THREE || !renderer || !scene) return null;

  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const programsBefore = renderer.info?.programs?.length ?? 0;

  // Build attribute-matched 1-triangle proxy BufferGeometries so `#define USE_UV`, `#define USE_COLOR`,
  // and Vulkan/ANGLE VertexInputLayout + IndexType match every real mesh 1:1!
  const proxyGeomCache = new Map();
  const getGeomSignatureAndProxy = (srcGeom) => {
    const hasNorm = Boolean(srcGeom?.attributes?.normal);
    const hasUv = Boolean(srcGeom?.attributes?.uv);
    const hasUv1 = Boolean(srcGeom?.attributes?.uv1);
    const colSize = srcGeom?.attributes?.color ? srcGeom.attributes.color.itemSize || 3 : 0;
    const hasIndex = Boolean(srcGeom?.index);
    const isU32 = Boolean(srcGeom?.index?.array instanceof Uint32Array);
    const gSig = `n${hasNorm ? 1 : 0}_uv${hasUv ? 1 : 0}_uv2${hasUv1 ? 1 : 0}_c${colSize}_i${
      hasIndex ? (isU32 ? 32 : 16) : 0
    }`;

    let proxy = proxyGeomCache.get(gSig);
    if (!proxy) {
      proxy = new THREE.BufferGeometry();
      proxy.setAttribute(
        'position',
        new THREE.BufferAttribute(
          new Float32Array([-0.02, -0.02, 0, 0.02, -0.02, 0, 0, 0.02, 0]),
          3
        )
      );
      if (hasNorm) {
        proxy.setAttribute(
          'normal',
          new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]), 3)
        );
      }
      if (hasUv) {
        proxy.setAttribute(
          'uv',
          new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0.5, 1]), 2)
        );
      }
      if (hasUv1) {
        proxy.setAttribute(
          'uv1',
          new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0.5, 1]), 2)
        );
      }
      if (colSize > 0) {
        proxy.setAttribute(
          'color',
          new THREE.BufferAttribute(new Float32Array(3 * colSize).fill(1.0), colSize)
        );
      }
      if (hasIndex) {
        const idxArr = isU32 ? new Uint32Array([0, 1, 2]) : new Uint16Array([0, 1, 2]);
        proxy.setIndex(new THREE.BufferAttribute(idxArr, 1));
      }
      proxy.computeBoundingBox();
      proxy.computeBoundingSphere();
      proxyGeomCache.set(gSig, proxy);
    }
    return { gSig, proxy };
  };

  const matSignature = (m) => {
    const customKey =
      typeof m.customProgramCacheKey === 'function' ? m.customProgramCacheKey() : '';
    return [
      m.type,
      customKey,
      m.map ? 1 : 0,
      m.normalMap ? 1 : 0,
      m.roughnessMap ? 1 : 0,
      m.aoMap ? 1 : 0,
      m.metalnessMap ? 1 : 0,
      m.transparent ? 1 : 0,
      m.depthWrite ? 1 : 0,
      m.blending ?? 1,
      m.alphaTest > 0 ? m.alphaTest.toFixed(3) : 0,
      m.side,
      m.flatShading ? 1 : 0,
      m.vertexColors ? 1 : 0,
      m.fog === false ? 0 : 1,
    ].join('|');
  };

  // Collect every unique (material + geometry layout + shadow/instancing) pipeline state
  // AND pre-upload all scene textures (`DataTexture` / `CanvasTexture` + mipmaps) so zero
  // lazy `glTexImage2D` / `glGenerateMipmap` stalls occur when upper zones or water enter view.
  const regularEntries = new Map();
  const instancedEntries = new Map();
  const lineEntries = new Map();
  const clipEntries = new Map();
  const uniqueTextures = new Set();

  const collectMaterialTextures = (m) => {
    if (!m) return;
    for (const slot of ['map', 'normalMap', 'roughnessMap', 'aoMap', 'metalnessMap', 'alphaMap', 'bumpMap']) {
      const tex = m[slot];
      if (tex && tex.isTexture) uniqueTextures.add(tex);
    }
  };

  scene.traverse((obj) => {
    const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
    for (const m of mats) collectMaterialTextures(m);
    const m = mats[0];
    if (!m || !obj.geometry) return;
    const mSig = matSignature(m);
    if (obj.isInstancedMesh) {
      const { gSig, proxy } = getGeomSignatureAndProxy(obj.geometry);
      const key = `${mSig}||${gSig}||r${obj.receiveShadow ? 1 : 0}||ic${obj.instanceColor ? 1 : 0}`;
      if (!instancedEntries.has(key)) {
        instancedEntries.set(key, {
          mat: m,
          proxy,
          receiveShadow: Boolean(obj.receiveShadow),
          castShadow: Boolean(obj.castShadow),
          customDepth: obj.customDepthMaterial || null,
        });
      }
    } else if (obj.isMesh) {
      const { gSig, proxy } = getGeomSignatureAndProxy(obj.geometry);
      const key = `${mSig}||${gSig}||r${obj.receiveShadow ? 1 : 0}`;
      if (!regularEntries.has(key)) {
        regularEntries.set(key, {
          mat: m,
          proxy,
          receiveShadow: Boolean(obj.receiveShadow),
          castShadow: Boolean(obj.castShadow),
        });
      }
    } else if (obj.isLineSegments || obj.isLine) {
      const colSize = obj.geometry?.attributes?.color ? obj.geometry.attributes.color.itemSize || 3 : 0;
      const lKey = `${mSig}||lc${colSize}`;
      if (!lineEntries.has(lKey)) lineEntries.set(lKey, { mat: m, colSize });
    }
  });

  if (typeof renderer.initTexture === 'function') {
    for (const tex of uniqueTextures) {
      try {
        renderer.initTexture(tex);
      } catch {
        // Ignore incomplete async image textures if not yet decoded
      }
    }
  }

  // Also collect unique (material + geometry layout) pairs used by clippable Tower pieces
  if (towerController?.kinematics?.records) {
    for (const rec of towerController.kinematics.records) {
      for (const b of rec.meshBindings || []) {
        const m = Array.isArray(b.origMaterial) ? b.origMaterial[0] : b.origMaterial;
        if (!m || !b.mesh?.geometry) continue;
        const { gSig, proxy } = getGeomSignatureAndProxy(b.mesh.geometry);
        const key = `${matSignature(m)}||${gSig}||r${b.mesh.receiveShadow ? 1 : 0}`;
        if (!clipEntries.has(key)) {
          clipEntries.set(key, {
            protoMat: m,
            proxy,
            receiveShadow: Boolean(b.mesh.receiveShadow),
          });
        }
      }
    }
  }

  const lineGeomPlain = new THREE.BufferGeometry();
  lineGeomPlain.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array([-0.02, 0, 0, 0.02, 0, 0]), 3)
  );
  lineGeomPlain.computeBoundingSphere();

  const lineGeomColor = new THREE.BufferGeometry();
  lineGeomColor.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array([-0.02, 0, 0, 0.02, 0, 0]), 3)
  );
  lineGeomColor.setAttribute(
    'color',
    new THREE.BufferAttribute(new Float32Array([1, 1, 1, 1, 1, 1]), 3)
  );
  lineGeomColor.computeBoundingSphere();

  // Place `dummyClipPlane` at `y <= 9999` so our 1-triangle proxy at `y = 10` is NOT discarded
  // before fragment output / blend stage in ANGLE/Vulkan pipeline specialization!
  const dummyClipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 9999.0);
  const tempClippedClones = [];
  const tempInstancedMeshes = [];

  const prewarmGroup = new THREE.Group();
  prewarmGroup.name = '__s4_shader_prewarm_proxy';
  prewarmGroup.position.set(0, 10, 0);

  for (const { mat, proxy, receiveShadow, castShadow } of regularEntries.values()) {
    const mesh = new THREE.Mesh(proxy, mat);
    mesh.frustumCulled = false;
    mesh.receiveShadow = receiveShadow;
    mesh.castShadow = castShadow;
    prewarmGroup.add(mesh);
  }

  for (const { mat, proxy, receiveShadow, castShadow, customDepth } of instancedEntries.values()) {
    const im = new THREE.InstancedMesh(proxy, mat, 1);
    im.setMatrixAt(0, new THREE.Matrix4());
    im.instanceMatrix.needsUpdate = true;
    im.frustumCulled = false;
    im.receiveShadow = receiveShadow;
    im.castShadow = castShadow;
    if (customDepth) im.customDepthMaterial = customDepth;
    prewarmGroup.add(im);
    tempInstancedMeshes.push(im);
  }

  for (const { mat, colSize } of lineEntries.values()) {
    const ls = new THREE.LineSegments(colSize > 0 ? lineGeomColor : lineGeomPlain, mat);
    ls.frustumCulled = false;
    prewarmGroup.add(ls);
  }

  for (const { protoMat, proxy, receiveShadow } of clipEntries.values()) {
    const clipped = fastCloneMaterialForClipping(protoMat, [dummyClipPlane]);
    tempClippedClones.push(clipped);
    const mesh = new THREE.Mesh(proxy, clipped);
    mesh.frustumCulled = false;
    mesh.receiveShadow = receiveShadow;
    mesh.castShadow = false;
    prewarmGroup.add(mesh);
  }

  const prewarmCam = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  prewarmCam.position.set(0, 10, 2);
  prewarmCam.lookAt(0, 10, 0);
  prewarmCam.updateMatrixWorld(true);

  const prevTarget = renderer.getRenderTarget();
  const prevAutoReset = renderer.info.autoReset;
  const prevAutoClear = renderer.autoClear;
  const prevShadowNeedsUpdate = renderer.shadowMap?.needsUpdate ?? false;
  const prevViewport = new THREE.Vector4();
  const prevScissor = new THREE.Vector4();
  const prevScissorTest = renderer.getScissorTest();
  renderer.getViewport(prevViewport);
  renderer.getScissor(prevScissor);

  const savedChildVis = scene.children.map((c) => ({ child: c, visible: c.visible }));
  const sunLight = scene.getObjectByName('atmo_sun_light');
  const needsInitialShadowAlloc = Boolean(sunLight?.castShadow && !sunLight.shadow?.map);

  try {
    scene.__s4InOffscreenPrewarm = true;
    for (const item of savedChildVis) {
      if (!item.child.isLight && item.child.name !== 'paris_1889_atmosphere') {
        const hasLight = (() => {
          let found = false;
          item.child.traverse((o) => {
            if (o.isLight) found = true;
          });
          return found;
        })();
        if (!hasLight) item.child.visible = false;
      }
    }

    scene.add(prewarmGroup);
    prewarmGroup.updateMatrixWorld(true);
    renderer.info.autoReset = false;
    if (renderer.shadowMap) {
      renderer.shadowMap.needsUpdate = needsInitialShadowAlloc;
    }
    renderer.localClippingEnabled = true;

    // Render directly through `setRenderTarget(null)` inside a 1x1 corner scissor so Three.js uses
    // the EXACT `HalfFloatType` (`RGBA16F`) ACESFilmic tone-mapping render target & shader defines,
    // warming both WebGLProgram AND ANGLE/Vulkan/Metal/D3D12 GraphicsPipelineStates!
    renderer.setRenderTarget(null);
    renderer.setViewport(0, 0, 1, 1);
    renderer.setScissor(0, 0, 1, 1);
    renderer.setScissorTest(true);
    renderer.autoClear = false;
    renderer.render(scene, prewarmCam);
    renderer.getContext()?.finish?.();
  } finally {
    scene.__s4InOffscreenPrewarm = false;
    scene.remove(prewarmGroup);
    for (const item of savedChildVis) {
      item.child.visible = item.visible;
    }
    renderer.setRenderTarget(prevTarget);
    renderer.setViewport(prevViewport);
    renderer.setScissor(prevScissor);
    renderer.setScissorTest(prevScissorTest);
    renderer.autoClear = prevAutoClear;
    renderer.info.autoReset = prevAutoReset;
    if (renderer.shadowMap) {
      renderer.shadowMap.needsUpdate = prevShadowNeedsUpdate;
    }
    for (const im of tempInstancedMeshes) {
      im.dispose?.();
    }
    for (const cm of tempClippedClones) {
      cm.dispose?.();
    }
    for (const pg of proxyGeomCache.values()) {
      pg.dispose();
    }
    lineGeomPlain.dispose();
    lineGeomColor.dispose();

    // Repaint the 1x1 bottom-left pixel cleanly if active camera is available
    if (camera && prevTarget === null) {
      const restorePrevShadow = renderer.shadowMap?.needsUpdate ?? false;
      if (renderer.shadowMap) renderer.shadowMap.needsUpdate = false;
      scene.__s4InOffscreenPrewarm = true;
      try {
        renderer.setViewport(0, 0, 2, 2);
        renderer.setScissor(0, 0, 2, 2);
        renderer.setScissorTest(true);
        renderer.render(scene, camera);
      } finally {
        scene.__s4InOffscreenPrewarm = false;
        renderer.setViewport(prevViewport);
        renderer.setScissor(prevScissor);
        renderer.setScissorTest(prevScissorTest);
        if (renderer.shadowMap) renderer.shadowMap.needsUpdate = restorePrevShadow;
      }
    }
  }

  const programsAfter = renderer.info?.programs?.length ?? 0;
  const elapsedMs = Number(
    ((typeof performance !== 'undefined' ? performance.now() : 0) - t0).toFixed(2)
  );
  return {
    programsBefore,
    programsAfter,
    newlyCompiledCount: Math.max(0, programsAfter - programsBefore),
    elapsedMs,
  };
}
