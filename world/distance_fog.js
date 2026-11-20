/**
 * Archival Atmospheric Distance Fog & Architectural Sketch Shader (`world/distance_fog.js`)
 *
 * Delivers two coupled exhibition capabilities grounded in the
 * 1887–1889 archival collodion / albumen glass-plate palette (`#5`, `#8`):
 *
 *   1. **Archival Distance Fog Limiting Render Distance**:
 *      - Configures global `THREE.Fog` harmonized with the horizon sky dome
 *        (`day: #e6e2da`, `dusk: #e4ddd0`, `night: #dad5cb`) with `near = 380 m, far = 2100 m`
 *        so the Hero Eiffel Tower (`R_xz <= 72 m`) stays crisp from Stop 08 (`540 m`)
 *        and Stop 11 (`508 m`).
 *      - Injects a smooth **Hybrid World-Radial + Camera-Range Render-Distance Mist**
 *        onto all surrounding Parisian materials and sketch outlines so low-poly
 *        outer districts (`R_xz <= 930 m`) and world skirts (`±1680 m`) dissolve
 *        100.0% into `fogColor` by `R_xz = 960 m` (or `vFogDepth = 1340 m`) —
 *        more than 700 m before any world boundary can ever enter view.
 *
 *   2. **Real-Light-Driven Architectural Sketch Shading (`0` Emissive / `0` Unlit Cheats)**:
 *      - Preserves 100% physical `MeshStandardMaterial` lighting, `PCFSoftShadowMap`
 *        shadow reception, and `PMREM` reflections.
 *      - Gates subtle `45°` copperplate cross-hatching (`#45433d`) strictly from
 *        real `reflectedLight.directDiffuse / totalDiffuse` inside `#include <aomap_fragment>`,
 *        appearing only on shaded/shadowed surfaces with `fwidth` anti-aliasing.
 *      - Applies subtle ground-contact AO on vertical facades and bankside depth
 *        attenuation on the PBR Seine river surface.
 */

export const EXHIBITION_FOG_PRESETS = Object.freeze({
  day: Object.freeze({
    mood: 'day',
    label: 'Collodion Daylight Mist',
    fogColor: 0xe6e2da,
    skyHorizonHex: 0xe6e2da,
    skyMidHex: 0xe2dfd8,
    skyZenithHex: 0xd2cec6,
    fogNear: 380.0,
    fogFar: 2100.0,
    radialInner: 165.0,
    radialOuter: 960.0,
    radialExponent: 1.40,
    camFogInner: 430.0,
    camFogOuter: 1340.0,
  }),
  dusk: Object.freeze({
    mood: 'dusk',
    label: 'Warm Albumen Mist',
    fogColor: 0xe4ddd0,
    skyHorizonHex: 0xe4ddd0,
    skyMidHex: 0xdcd4c7,
    skyZenithHex: 0xc8c0b4,
    fogNear: 360.0,
    fogFar: 2050.0,
    radialInner: 160.0,
    radialOuter: 950.0,
    radialExponent: 1.38,
    camFogInner: 415.0,
    camFogOuter: 1310.0,
  }),
  night: Object.freeze({
    mood: 'night',
    label: 'Silver-Gelatin Carbon Mist',
    fogColor: 0xdad5cb,
    skyHorizonHex: 0xdad5cb,
    skyMidHex: 0xcbc6bc,
    skyZenithHex: 0xb7b2a8,
    fogNear: 350.0,
    fogFar: 1980.0,
    radialInner: 155.0,
    radialOuter: 940.0,
    radialExponent: 1.36,
    camFogInner: 400.0,
    camFogOuter: 1280.0,
  }),
});

export const WORLD_DISTANCE_LIMITS = Object.freeze({
  heroClearRadiusM: 165.0,
  trocaderoRadiusM: 765.0,
  cityMaxBlockRadiusM: 925.0,
  fullMistClosureRadiusM: 960.0,
  cameraMaxRenderDistM: 1340.0,
  worldGroundSkirtHalfExtentM: 1680.0,
});

function smoothstepJS(edge0, edge1, x) {
  const t = Math.max(0.0, Math.min(1.0, (x - edge0) / Math.max(1e-6, edge1 - edge0)));
  return t * t * (3.0 - 2.0 * t);
}

/**
 * Evaluate the analytical surrounding-world mist closure factor `[0..1]` at a
 * world XZ radius `radiusXZ` and camera depth `camDepth` (matching the GLSL shader).
 */
export function evaluateWorldMistFactor(
  radiusXZ,
  camDepth = radiusXZ,
  preset = EXHIBITION_FOG_PRESETS.day
) {
  const radS = smoothstepJS(preset.radialInner, preset.radialOuter, radiusXZ);
  const radMist = Math.pow(radS, preset.radialExponent);
  const camMist = smoothstepJS(preset.camFogInner, preset.camFogOuter, camDepth);
  return 1.0 - (1.0 - radMist) * (1.0 - camMist);
}

/**
 * Create shared live uniform objects consumed by all surrounding-world PBR materials
 * and batched architectural pen-and-ink `LineSegments`.
 */
export function createWorldMistUniforms(THREE, mood = 'day') {
  const preset = EXHIBITION_FOG_PRESETS[mood] || EXHIBITION_FOG_PRESETS.day;
  const inkNear = new THREE.Color(0x383531);
  const inkFar = new THREE.Color(0x7a756d);
  // Line fragment mix runs after <colorspace_fragment>, so keep sRGB channels explicit
  const srgbHexToVec3 = (hex) =>
    new THREE.Vector3(
      ((hex >> 16) & 0xff) / 255,
      ((hex >> 8) & 0xff) / 255,
      (hex & 0xff) / 255
    );

  return {
    uMistInnerR: { value: preset.radialInner },
    uMistOuterR: { value: preset.radialOuter },
    uMistExponent: { value: preset.radialExponent },
    uCamFogInner: { value: preset.camFogInner },
    uCamFogOuter: { value: preset.camFogOuter },
    uInkEdgeFadeInnerR: { value: 165.0 },
    uInkEdgeFadeOuterR: { value: 895.0 },
    uInkCamFadeInner: { value: 360.0 },
    uInkCamFadeOuter: { value: 1160.0 },
    uHatchColorLinear: { value: new THREE.Color(0x45433d) },
    uInkNearSrgb: { value: srgbHexToVec3(0x383531) },
    uInkFarSrgb: { value: srgbHexToVec3(0x7a756d) },
    uInkNearColorRef: { value: inkNear },
    uInkFarColorRef: { value: inkFar },
  };
}

/**
 * Synchronize `mistUniforms` to a named archival mood preset (`day` | `dusk` | `night`).
 */
export function updateWorldMistUniformsForMood(mistUniforms, mood = 'day') {
  if (!mistUniforms) return;
  const preset = EXHIBITION_FOG_PRESETS[mood] || EXHIBITION_FOG_PRESETS.day;
  mistUniforms.uMistInnerR.value = preset.radialInner;
  mistUniforms.uMistOuterR.value = preset.radialOuter;
  mistUniforms.uMistExponent.value = preset.radialExponent;
  mistUniforms.uCamFogInner.value = preset.camFogInner;
  mistUniforms.uCamFogOuter.value = preset.camFogOuter;
}

/**
 * Configure or update global `scene.fog` (`THREE.Fog`) harmonized with the archival
 * glass-plate sky horizon and sync `mistUniforms` if supplied.
 */
export function applyExhibitionDistanceFog({
  THREE,
  scene,
  mood = 'day',
  near,
  far,
  color,
  mistUniforms = null,
} = {}) {
  if (!THREE || !scene) return null;
  const key = Object.prototype.hasOwnProperty.call(EXHIBITION_FOG_PRESETS, mood) ? mood : 'day';
  const preset = EXHIBITION_FOG_PRESETS[key];
  const fogHex = color !== undefined ? color : preset.fogColor;
  const fogNear = Number.isFinite(near) ? near : preset.fogNear;
  const fogFar = Number.isFinite(far) ? far : preset.fogFar;

  if (scene.fog && scene.fog.isFog && !scene.fog.isFogExp2) {
    scene.fog.color.setHex(fogHex);
    scene.fog.near = fogNear;
    scene.fog.far = fogFar;
  } else {
    scene.fog = new THREE.Fog(fogHex, fogNear, fogFar);
  }

  if (mistUniforms) {
    updateWorldMistUniformsForMood(mistUniforms, key);
  }

  return {
    fog: scene.fog,
    mood: key,
    preset,
  };
}

/**
 * Enhance a surrounding-world `MeshStandardMaterial` with:
 *   - Strict zero-emissive / real-light-only enforcement (`fog = true`)
 *   - Real-shadow-gated `45°` copperplate architectural cross-hatching (`#45433d`)
 *   - Subtle ground-contact AO on vertical masonry walls
 *   - Optional Seine bankside depth shading (`isRiverWater: true`)
 *   - Hybrid World-Radial + Camera-Range render-distance mist closing 100% before world edges
 */
export function attachWorldSketchAndMistShader(THREE, material, mistUniforms, opts = {}) {
  if (!material) return material;

  const hatchStrength = Number(opts.hatchStrength ?? 0.16);
  const hatchScale = Number(opts.hatchScale ?? 2.35);
  const contactAoStrength = Number(opts.contactAoStrength ?? 0.14);
  const printGrainStrength = Number(opts.printGrainStrength ?? 0.018);
  const isRiverWater = Boolean(opts.isRiverWater);
  const variantKey = 's2_world_sketch_mist_u1';

  material.fog = true;
  if (material.emissive && typeof material.emissive.setHex === 'function') {
    material.emissive.setHex(0x000000);
  }
  material.emissiveIntensity = 0.0;
  material.emissiveMap = null;
  material.blending = THREE.NormalBlending;

  material.userData.worldSketchMist = {
    enabled: true,
    hatchStrength,
    hatchScale,
    contactAoStrength,
    isRiverWater,
  };

  material.customProgramCacheKey = () => variantKey;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uMistInnerR = mistUniforms.uMistInnerR;
    shader.uniforms.uMistOuterR = mistUniforms.uMistOuterR;
    shader.uniforms.uMistExponent = mistUniforms.uMistExponent;
    shader.uniforms.uCamFogInner = mistUniforms.uCamFogInner;
    shader.uniforms.uCamFogOuter = mistUniforms.uCamFogOuter;
    shader.uniforms.uHatchColorLinear = mistUniforms.uHatchColorLinear;
    shader.uniforms.uS2HatchStrength = { value: hatchStrength };
    shader.uniforms.uS2HatchScale = { value: hatchScale };
    shader.uniforms.uS2ContactAoStrength = { value: contactAoStrength };
    shader.uniforms.uS2PrintGrainStrength = { value: printGrainStrength };
    shader.uniforms.uS2IsRiverWater = { value: isRiverWater ? 1.0 : 0.0 };

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
uniform float uS2HatchStrength;
uniform float uS2HatchScale;
uniform float uS2ContactAoStrength;
uniform float uS2PrintGrainStrength;
uniform float uS2IsRiverWater;

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

  // 1. Subtle architectural plinth contact AO near ground plane
  if ( uS2ContactAoStrength > 0.001 ) {
    float s2GroundH = clamp( vS2WorldPos.y, 0.0, 2.4 ) / 2.4;
    float s2ContactAo = mix( 1.0 - uS2ContactAoStrength * s2VertFace, 1.0, smoothstep( 0.0, 1.0, s2GroundH ) );
    reflectedLight.indirectDiffuse *= s2ContactAo;
    reflectedLight.directDiffuse *= mix( 1.0, s2ContactAo, 0.35 );
  }

  // 2. Real-light-driven 45-degree copperplate cross-hatching in cast/form shadows
  if ( uS2HatchStrength > 0.001 ) {
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
    float s2HCoord1 = ( s2PlanarAxis + vS2WorldPos.y * 1.05 ) * uS2HatchScale;
    float s2HCoord2 = ( s2PlanarAxis - vS2WorldPos.y * 1.05 ) * ( uS2HatchScale * 1.08 );
    float s2Stroke1 = smoothstep( 0.30, 0.62, s2BandLimitedSin( s2HCoord1 ) );
    float s2Stroke2 = smoothstep( 0.28, 0.64, s2BandLimitedSin( s2HCoord2 ) );
    float s2InkMask = ( ( 1.0 - s2Stroke1 ) * s2InShadow + ( 1.0 - s2Stroke2 ) * 0.65 * s2DeepShadow );
    s2InkMask = clamp( s2InkMask, 0.0, 1.0 ) * uS2HatchStrength * s2HatchDistFade * mix( 0.42, 1.0, s2VertFace );
    reflectedLight.indirectDiffuse = mix( reflectedLight.indirectDiffuse, uHatchColorLinear * s2IndLum * 1.35, s2InkMask );
  }

  // 3. Collodion glass-plate subtle micro-tooth so large planes never read as synthetic CG plastic
  if ( uS2PrintGrainStrength > 0.001 ) {
    float s2GrainA = s2BandLimitedSin( vS2WorldPos.x * 0.61 + vS2WorldPos.z * 0.47 );
    float s2GrainB = s2BandLimitedSin( vS2WorldPos.x * 0.23 - vS2WorldPos.z * 0.53 + vS2WorldPos.y * 0.37 );
    float s2GrainMod = 1.0 + ( ( s2GrainA * 0.6 + s2GrainB * 0.4 ) - 0.5 ) * ( uS2PrintGrainStrength * 2.0 );
    reflectedLight.indirectDiffuse *= s2GrainMod;
    reflectedLight.directDiffuse *= s2GrainMod;
  }

  // 4. Seine masonry-quai bankside depth darkening (100% real-light multiplicative modulation)
  if ( uS2IsRiverWater > 0.5 ) {
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
  };

  return material;
}

/**
 * Create a pen-and-ink `LineBasicMaterial` for surrounding architectural `LineSegments`
 * with subtle depth-bias anti-z-fighting pull, foreground->midground ink softening
 * (`#383531` -> `#7a756d`), and smooth alpha fade to `0.0` before outer fog closure.
 */
export function createSketchInkLineMaterial(THREE, mistUniforms, opts = {}) {
  const opacity = Number(opts.opacity ?? 0.52);
  const cacheTag = opts.cacheTag || `s2_sketch_ink_line_${opacity.toFixed(2)}`;

  const lineMat = new THREE.LineBasicMaterial({
    name: opts.name || 'paris_sketch_ink_line',
    color: 0x383531,
    transparent: true,
    opacity,
    depthWrite: false,
    fog: true,
  });

  lineMat.customProgramCacheKey = () => cacheTag;
  lineMat.onBeforeCompile = (shader) => {
    shader.uniforms.uInkEdgeFadeInnerR = mistUniforms.uInkEdgeFadeInnerR;
    shader.uniforms.uInkEdgeFadeOuterR = mistUniforms.uInkEdgeFadeOuterR;
    shader.uniforms.uInkCamFadeInner = mistUniforms.uInkCamFadeInner;
    shader.uniforms.uInkCamFadeOuter = mistUniforms.uInkCamFadeOuter;
    shader.uniforms.uInkNearSrgb = mistUniforms.uInkNearSrgb;
    shader.uniforms.uInkFarSrgb = mistUniforms.uInkFarSrgb;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vS2EdgeWorldPos;`
      )
      .replace(
        '#include <project_vertex>',
        `vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
#endif
vec4 s2EdgeWorld = modelMatrix * mvPosition;
vS2EdgeWorldPos = s2EdgeWorld.xyz;
mvPosition = viewMatrix * s2EdgeWorld;
// Micro view-space pull prevents coplanar GL_LINES z-fighting stipple on building walls
mvPosition.xyz *= 0.99945;
gl_Position = projectionMatrix * mvPosition;`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vS2EdgeWorldPos;
uniform float uInkEdgeFadeInnerR;
uniform float uInkEdgeFadeOuterR;
uniform float uInkCamFadeInner;
uniform float uInkCamFadeOuter;
uniform vec3 uInkNearSrgb;
uniform vec3 uInkFarSrgb;`
      )
      .replace(
        '#include <fog_fragment>',
        `float s2EdgeR = length( vS2EdgeWorldPos.xz );
float s2InkToneMix = smoothstep( 120.0, 680.0, s2EdgeR );
gl_FragColor.rgb = mix( uInkNearSrgb, uInkFarSrgb, s2InkToneMix );
#include <fog_fragment>
#ifdef USE_FOG
  float s2RadAlpha = 1.0 - smoothstep( uInkEdgeFadeInnerR, uInkEdgeFadeOuterR, s2EdgeR );
  float s2CamAlpha = 1.0 - smoothstep( uInkCamFadeInner, uInkCamFadeOuter, vFogDepth );
  gl_FragColor.a *= ( s2RadAlpha * s2CamAlpha );
#endif`
      );
  };

  return lineMat;
}

/**
 * Comprehensive programmatic compliance audit of the Stage 2 Surrounding Sketch World
 * and Distance Fog (`0` colored low-poly Paris meshes, `0` emissive/unlit violations,
 * `100%` `MeshStandardMaterial` + `fog: true`, verified `100.0%` mist closure before world edges).
 */
export function auditWorldSketchAndFog({ THREE, scene, parisWorld } = {}) {
  const hslTmp = { h: 0, s: 0, l: 0 };
  const rgbTmp = { r: 0, g: 0, b: 0 };
  const materialViolations = [];
  const colorViolations = [];
  let worldMeshCount = 0;
  let worldInstancedMeshCount = 0;
  let sketchLineObjectCount = 0;
  let sketchLineSegmentCount = 0;
  let maxMaterialChroma = 0;
  let maxMaterialHsvSaturation = 0;
  let seineVerified = false;
  let basinWaterCount = 0;

  const root = parisWorld?.group || scene?.getObjectByName?.('paris_1889_world');
  if (root) {
    root.traverse((obj) => {
      if (obj.isLineSegments) {
        sketchLineObjectCount += 1;
        const vCount = obj.geometry?.attributes?.position?.count || 0;
        sketchLineSegmentCount += Math.floor(vCount / 2);
        if (!obj.material?.fog) {
          materialViolations.push({
            object: obj.name || obj.uuid,
            reason: 'LineSegments material missing fog=true',
          });
        }
        return;
      }
      if (!obj.isMesh) return;
      worldMeshCount += 1;
      if (obj.isInstancedMesh) worldInstancedMeshCount += 1;

      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        if (!m) continue;
        if (!m.isMeshStandardMaterial) {
          materialViolations.push({
            object: obj.name || obj.uuid,
            material: m.name || m.type,
            reason: `Non-MeshStandardMaterial (${m.type})`,
          });
        }
        const emisHex = m.emissive && typeof m.emissive.getHex === 'function' ? m.emissive.getHex() : 0;
        const emisInt = Number(m.emissiveIntensity ?? 0);
        if ((emisHex !== 0 && emisInt > 0) || Boolean(m.emissiveMap)) {
          materialViolations.push({
            object: obj.name || obj.uuid,
            material: m.name || m.type,
            reason: `Emissive violation: hex=0x${emisHex.toString(16)} intensity=${emisInt}`,
          });
        }
        if (THREE && m.blending !== THREE.NormalBlending) {
          materialViolations.push({
            object: obj.name || obj.uuid,
            material: m.name || m.type,
            reason: `Non-normal blending (${m.blending})`,
          });
        }
        if (!m.fog) {
          materialViolations.push({
            object: obj.name || obj.uuid,
            material: m.name || m.type,
            reason: 'Material has fog=false (ignores scene distance fog)',
          });
        }
        if (!m.userData?.worldSketchMist?.enabled) {
          materialViolations.push({
            object: obj.name || obj.uuid,
            material: m.name || m.type,
            reason: 'Material missing worldSketchMist shader hook',
          });
        }
        if (m.color && typeof m.color.getRGB === 'function') {
          const colorSpaceArg = THREE?.SRGBColorSpace ? THREE.SRGBColorSpace : undefined;
          if (colorSpaceArg) m.color.getRGB(rgbTmp, colorSpaceArg);
          else m.color.getRGB(rgbTmp);
          const cMax = Math.max(rgbTmp.r, rgbTmp.g, rgbTmp.b);
          const cMin = Math.min(rgbTmp.r, rgbTmp.g, rgbTmp.b);
          const srgbChroma = cMax - cMin; // True sRGB chroma [0..1] (avoids HSL 1-|2L-1|->0 blow-up near white)
          const hsvSat = cMax > 1e-5 ? srgbChroma / cMax : 0.0;
          if (srgbChroma > maxMaterialChroma) maxMaterialChroma = srgbChroma;
          if (hsvSat > maxMaterialHsvSaturation) maxMaterialHsvSaturation = hsvSat;
          if (srgbChroma > 0.14 || hsvSat > 0.16) {
            colorViolations.push({
              object: obj.name || obj.uuid,
              material: m.name || m.type,
              hex: `#${m.color.getHexString()}`,
              srgbChroma: Number(srgbChroma.toFixed(4)),
              hsvSaturation: Number(hsvSat.toFixed(4)),
            });
          }
        }
        if (obj.name === 'seine_river_pbr') {
          seineVerified =
            Boolean(m.isMeshStandardMaterial) &&
            Boolean(m.normalMap) &&
            Boolean(obj.receiveShadow) &&
            Boolean(m.fog) &&
            (emisHex === 0 || emisInt === 0);
        }
        if (m.name === 'world_basin_water') {
          basinWaterCount += 1;
        }
      }
    });
  }

  let fogValid = false;
  let fogDetails = null;
  if (scene?.fog && scene.fog.isFog && !scene.fog.isFogExp2) {
    const colorSpaceArg = THREE?.SRGBColorSpace ? THREE.SRGBColorSpace : undefined;
    if (colorSpaceArg) {
      scene.fog.color.getHSL(hslTmp, colorSpaceArg);
      scene.fog.color.getRGB(rgbTmp, colorSpaceArg);
    } else {
      scene.fog.color.getHSL(hslTmp);
      scene.fog.color.getRGB(rgbTmp);
    }
    const fogChroma =
      Math.max(rgbTmp.r, rgbTmp.g, rgbTmp.b) - Math.min(rgbTmp.r, rgbTmp.g, rgbTmp.b);
    fogValid =
      scene.fog.near >= 200 &&
      scene.fog.near <= 600 &&
      scene.fog.far >= 1400 &&
      scene.fog.far <= 3000 &&
      fogChroma <= 0.12 &&
      hslTmp.l >= 0.18;
    fogDetails = {
      type: 'Fog',
      colorHex: `#${scene.fog.color.getHexString()}`,
      near: scene.fog.near,
      far: scene.fog.far,
      srgbChroma: Number(fogChroma.toFixed(4)),
      hslLightness: Number(hslTmp.l.toFixed(4)),
    };
  }

  const mistAtParvis140m = Number(evaluateWorldMistFactor(140, 140).toFixed(4));
  const mistAtTrocadero765m = Number(evaluateWorldMistFactor(765, 765).toFixed(4));
  const mistAtClosure960m = Number(evaluateWorldMistFactor(960, 960).toFixed(4));
  const mistAtSkirt1680m = Number(evaluateWorldMistFactor(1680, 1680).toFixed(4));

  const passes =
    Boolean(root) &&
    worldMeshCount > 0 &&
    materialViolations.length === 0 &&
    colorViolations.length === 0 &&
    seineVerified &&
    basinWaterCount > 0 &&
    sketchLineObjectCount >= 5 &&
    sketchLineSegmentCount >= 6000 &&
    fogValid &&
    mistAtParvis140m === 0 &&
    mistAtTrocadero765m >= 0.65 &&
    mistAtTrocadero765m <= 0.88 &&
    mistAtClosure960m >= 0.9999 &&
    mistAtSkirt1680m === 1;

  return {
    passes,
    worldMeshCount,
    worldInstancedMeshCount,
    sketchLineObjectCount,
    sketchLineSegmentCount,
    maxMaterialSaturation: Number(maxMaterialHsvSaturation.toFixed(4)),
    maxMaterialChroma: Number(maxMaterialChroma.toFixed(4)),
    seineVerified,
    basinWaterCount,
    fogValid,
    fogDetails,
    mistProfile: {
      parvis140m: mistAtParvis140m,
      trocadero765m: mistAtTrocadero765m,
      closure960m: mistAtClosure960m,
      worldSkirt1680m: mistAtSkirt1680m,
      safetyBufferBeforeSkirtEdgeM:
        WORLD_DISTANCE_LIMITS.worldGroundSkirtHalfExtentM -
        WORLD_DISTANCE_LIMITS.fullMistClosureRadiusM,
    },
    materialViolationCount: materialViolations.length,
    colorViolationCount: colorViolations.length,
    materialViolations,
    colorViolations,
  };
}
