/**
 * Monochrome Collodion & Architectural Pen-and-Ink Materials + Foliage (`world/sketch_materials.js`)
 *
 * Synthesizes offline, deterministic procedural PBR textures and geometries grounded
 * in the measured 1887–1889 glass-plate palette (`#5`, `#8`):
 *   - `0` colored low-poly Paris materials (every material HSL saturation `<= 0.10`)
 *   - `0` `emissive` / `emissiveMap` / unlit shaders
 *   - `512x512` crisp lithographic Haussmann & Exposition elevation maps (`map` + `normalMap` + `roughnessMap`)
 *   - `512x512` crushed-limestone esplanade gravel & dressed Château-Landon ashlar stone PBR maps
 *   - `256x256` ribbed standing-seam zinc/slate & oxidized dome cupola PBR maps
 *   - `256x256` tileable multi-wave Seine & basin ripple normal map
 *   - Multi-branched skeletal timber trees + porous alpha-tested silver-gelatin botanical foliage clusters
 */

import { attachWorldSketchAndMistShader } from './distance_fog.js';

export const PARIS_SKETCH_WORLD_PALETTE = Object.freeze({
  esplanadeGravel: 0xdbd6cc,
  alleeGravel: 0xe2ddd3,
  macadamStreet: 0xc9c4ba,
  excavationEarth: 0x787167,
  parterreMuted: 0x8c887f,
  dressedStone: 0xd2c8b4,
  wallLight: 0xdfdacf,
  wallMid: 0xc4beb3,
  masonryBand: 0xb6afa3,
  marble: 0xe6e1d7,
  weatheredTimber: 0x8d8579,
  treeSketchFoliage: 0x635f57,
  treeTimberBark: 0x4b4640,
  roofSlate: 0x807c75,
  expoIron: 0x625c55,
  patinaDome: 0x777870,
  antiqueBronze: 0x948d80,
  basinWater: 0xaba8a1,
  seineWater: 0xb7b4ae,
  collodionGlass: 0xcfd4d0,
  opalineGlobe: 0xebe6dc,
  sketchEdgeInk: 0x383531,
  sketchEdgeDistant: 0x7a756d,
});

function hash2(x, y) {
  let n = (((x & 1023) * 374761393) ^ ((y & 1023) * 668265263)) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function clampByte(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

function configureMipmappedDataTexture(THREE, tex, repX = 1, repY = 1, isSrgb = false) {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repX, repY);
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 8;
  if (isSrgb && THREE.SRGBColorSpace) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.needsUpdate = true;
  return tex;
}

function computeNormalBytesFromHeightField(hField, size, strength = 1.35) {
  const normalData = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    const ym = (y === 0 ? size - 1 : y - 1) * size;
    const yc = y * size;
    const yp = (y + 1 === size ? 0 : y + 1) * size;
    for (let x = 0; x < size; x++) {
      const xm = x === 0 ? size - 1 : x - 1;
      const xp = x + 1 === size ? 0 : x + 1;
      const dx = (hField[yc + xp] - hField[yc + xm]) * strength;
      const dy = (hField[yp + x] - hField[ym + x]) * strength;
      const invLen = 1.0 / Math.sqrt(dx * dx + dy * dy + 1.0);
      const idx = (yc + x) << 2;
      normalData[idx] = Math.round((-dx * invLen * 0.5 + 0.5) * 255);
      normalData[idx + 1] = Math.round((-dy * invLen * 0.5 + 0.5) * 255);
      normalData[idx + 2] = Math.round((invLen * 0.5 + 0.5) * 255);
      normalData[idx + 3] = 255;
    }
  }
  return normalData;
}

function buildNormalFromHeightField(THREE, hField, size, strength = 1.35, repX = 1, repY = 1) {
  const normalData = computeNormalBytesFromHeightField(hField, size, strength);
  const tex = new THREE.DataTexture(normalData, size, size, THREE.RGBAFormat);
  return configureMipmappedDataTexture(THREE, tex, repX, repY, false);
}

/**
 * 1. Dual-scale Crushed-Limestone Esplanade Gravel (`512x512` `map` + `normalMap` + `roughnessMap`)
 */
function makeCollodionGravelPbrMaps(THREE, repX = 30, repY = 30) {
  const size = 256;
  const colorData = new Uint8Array(size * size * 4);
  const roughData = new Uint8Array(size * size * 4);
  const hField = new Float32Array(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const fine = hash2(x, y);
      const med =
        0.25 *
        (hash2(x >> 1, y >> 1) +
          hash2((x + 1) >> 1, y >> 1) +
          hash2(x >> 1, (y + 1) >> 1) +
          hash2((x + 1) >> 1, (y + 1) >> 1));
      const coarse =
        0.25 *
        (hash2(x >> 3, y >> 3) +
          hash2((x + 4) >> 3, y >> 3) +
          hash2(x >> 3, (y + 4) >> 3) +
          hash2((x + 4) >> 3, (y + 4) >> 3));
      const rake = 0.5 + 0.5 * Math.sin((y / size) * Math.PI * 28.0 + med * 1.15);
      const h = 0.46 * fine + 0.28 * med + 0.16 * coarse + 0.10 * rake;
      hField[y * size + x] = h;

      const lum = Math.round(237 + (h - 0.5) * 36);
      const warm = Math.round((coarse - 0.5) * 5);
      const idx = (y * size + x) * 4;
      colorData[idx] = clampByte(lum + warm);
      colorData[idx + 1] = clampByte(lum);
      colorData[idx + 2] = clampByte(lum - 2);
      colorData[idx + 3] = 255;

      const rVal = clampByte(Math.round(232 - (h - 0.5) * 32));
      roughData[idx] = rVal;
      roughData[idx + 1] = rVal;
      roughData[idx + 2] = rVal;
      roughData[idx + 3] = 255;
    }
  }

  const colorMap = configureMipmappedDataTexture(
    THREE,
    new THREE.DataTexture(colorData, size, size, THREE.RGBAFormat),
    repX,
    repY,
    true
  );
  const roughnessMap = configureMipmappedDataTexture(
    THREE,
    new THREE.DataTexture(roughData, size, size, THREE.RGBAFormat),
    repX,
    repY,
    false
  );
  const normalMap = buildNormalFromHeightField(THREE, hField, size, 1.45, repX, repY);
  return { colorMap, normalMap, roughnessMap };
}

/**
 * 2. Dressed Château-Landon Ashlar Masonry (`256x256` `map` + `normalMap` + `roughnessMap`)
 */
function makeAshlarStonePbrMaps(THREE, repX = 4, repY = 2) {
  const size = 256;
  const colorData = new Uint8Array(size * size * 4);
  const roughData = new Uint8Array(size * size * 4);
  const hField = new Float32Array(size * size);

  const courseH = 32; // 8 horizontal courses
  const blockW = 64;  // 4 blocks per course with running-bond stagger

  for (let y = 0; y < size; y++) {
    const course = Math.floor(y / courseH);
    const yInCourse = y % courseH;
    const stagger = (course & 1) * (blockW >> 1);
    for (let x = 0; x < size; x++) {
      const xs = (x + stagger) % size;
      const block = Math.floor(xs / blockW);
      const xInBlock = xs % blockW;

      const isJoint = yInCourse < 2 || xInBlock < 2;
      const blockTone = (hash2(block * 13 + course * 7, course * 29) - 0.5) * 0.14;
      const grain = (hash2(x, y) - 0.5) * 0.08;
      const h = isJoint ? 0.18 : 0.72 + blockTone + grain;
      hField[y * size + x] = h;

      const baseLum = isJoint ? 202 : Math.round(240 + blockTone * 55 + grain * 26);
      const idx = (y * size + x) * 4;
      colorData[idx] = clampByte(baseLum + 1);
      colorData[idx + 1] = clampByte(baseLum);
      colorData[idx + 2] = clampByte(baseLum - 2);
      colorData[idx + 3] = 255;

      const rVal = clampByte(isJoint ? 245 : Math.round(216 - blockTone * 24));
      roughData[idx] = rVal;
      roughData[idx + 1] = rVal;
      roughData[idx + 2] = rVal;
      roughData[idx + 3] = 255;
    }
  }

  const colorMap = configureMipmappedDataTexture(
    THREE,
    new THREE.DataTexture(colorData, size, size, THREE.RGBAFormat),
    repX,
    repY,
    true
  );
  const roughnessMap = configureMipmappedDataTexture(
    THREE,
    new THREE.DataTexture(roughData, size, size, THREE.RGBAFormat),
    repX,
    repY,
    false
  );
  const normalMap = buildNormalFromHeightField(THREE, hField, size, 1.55, repX, repY);
  return { colorMap, normalMap, roughnessMap };
}

function synthesizeRibbedRoofRaw() {
  const size = 256;
  const colorData = new Uint8Array(size * size * 4);
  const roughData = new Uint8Array(size * size * 4);
  const hField = new Float32Array(size * size);

  for (let y = 0; y < size; y++) {
    const slateRow = y % 16;
    const lapShadow = slateRow === 0 ? -0.18 : slateRow === 1 ? -0.07 : 0.0;
    for (let x = 0; x < size; x++) {
      const seamPhase = x % 16;
      const standingRib = seamPhase === 0 || seamPhase === 1 ? 0.34 : seamPhase === 2 ? -0.10 : 0.0;
      const patina = (hash2(x >> 1, y >> 1) - 0.5) * 0.08;
      const h = 0.55 + standingRib + lapShadow + patina;
      hField[y * size + x] = h;

      const lum = Math.round(230 + standingRib * 44 + lapShadow * 60 + patina * 36);
      const idx = (y * size + x) * 4;
      colorData[idx] = clampByte(lum);
      colorData[idx + 1] = clampByte(lum);
      colorData[idx + 2] = clampByte(lum - 1);
      colorData[idx + 3] = 255;

      const rVal = clampByte(Math.round(186 - standingRib * 48 + patina * 30));
      roughData[idx] = rVal;
      roughData[idx + 1] = rVal;
      roughData[idx + 2] = rVal;
      roughData[idx + 3] = 255;
    }
  }

  const normalData = computeNormalBytesFromHeightField(hField, size, 1.85);
  return { size, colorData, roughData, normalData };
}

function wrapRibbedRoofMaps(THREE, raw, repX = 8, repY = 3) {
  const { size, colorData, roughData, normalData } = raw;
  return {
    colorMap: configureMipmappedDataTexture(
      THREE,
      new THREE.DataTexture(colorData, size, size, THREE.RGBAFormat),
      repX,
      repY,
      true
    ),
    roughnessMap: configureMipmappedDataTexture(
      THREE,
      new THREE.DataTexture(roughData, size, size, THREE.RGBAFormat),
      repX,
      repY,
      false
    ),
    normalMap: configureMipmappedDataTexture(
      THREE,
      new THREE.DataTexture(normalData, size, size, THREE.RGBAFormat),
      repX,
      repY,
      false
    ),
  };
}

function synthesizeLithographicHaussmannRaw(opts = {}) {
  const size = 512;
  const cols = opts.cols || 8;
  const storeys = opts.storeys || 5;
  const wallLum = opts.wallLum || 236;
  const winLum = opts.winLum || 106;
  const inkLum = opts.inkLum || 66;

  const colorData = new Uint8Array(size * size * 4);
  const roughData = new Uint8Array(size * size * 4);
  const hField = new Float32Array(size * size);

  const colW = Math.floor(size / cols);
  const arcadeTopY = Math.floor(size * 0.22);
  const corniceBotY = Math.floor(size * 0.93);
  const upperSpan = corniceBotY - arcadeTopY;
  const floorH = Math.floor(upperSpan / storeys);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const grain = (hash2(x, y) - 0.5) * 6.0;
      const colIdx = Math.floor(x / colW);
      const uCol = (x % colW) / colW;

      let lum = wallLum + grain;
      let h = 0.72 + (grain / 255) * 0.4;
      let rough = 228;

      if (y >= corniceBotY) {
        const cy = (y - corniceBotY) / Math.max(1, size - corniceBotY);
        if (cy < 0.22) {
          lum = inkLum + 22;
          h = 0.35;
        } else if (cy < 0.48 && (x % 8) < 4) {
          lum = wallLum - 38;
          h = 0.52;
        } else {
          lum = wallLum + 8;
          h = 0.92;
        }
      } else if (y < arcadeTopY) {
        const ay = y / arcadeTopY;
        const rustJoint = y % 12 < 2;
        const archCenter = 0.5;
        const dx = (uCol - archCenter) / 0.31;
        const dy = Math.max(0, (ay - 0.52) / 0.34);
        const inArchOpening =
          Math.abs(uCol - 0.5) < 0.31 &&
          ay > 0.04 &&
          (ay <= 0.52 || dx * dx + dy * dy <= 1.0);

        if (ay > 0.91) {
          lum = wallLum - 32;
          h = 0.90;
        } else if (inArchOpening) {
          const mullion = Math.abs(uCol - 0.5) < 0.022 || Math.abs(ay - 0.52) < 0.025;
          lum = mullion ? inkLum + 18 : winLum - 8 + (colIdx % 2) * 5;
          h = mullion ? 0.42 : 0.16;
          rough = mullion ? 190 : 76;
        } else if (rustJoint) {
          lum = wallLum - 30;
          h = 0.48;
        }
      } else {
        const relY = y - arcadeTopY;
        const st = Math.min(storeys - 1, Math.floor(relY / floorH));
        const vFloor = (relY - st * floorH) / floorH;

        const hasBalconFilant = st === 0 || st === storeys - 1;
        const winHalfW = 0.24;
        const inWinX = Math.abs(uCol - 0.5) < winHalfW;
        const inFrameX = Math.abs(Math.abs(uCol - 0.5) - winHalfW) < 0.032;
        const inWinY = vFloor > 0.12 && vFloor < 0.80;

        if (hasBalconFilant && vFloor >= 0.04 && vFloor <= 0.23) {
          const bar = (x % 6) < 2 || vFloor < 0.08 || vFloor > 0.19;
          if (bar) {
            lum = inkLum + 8;
            h = 0.86;
            rough = 152;
          } else if (inWinX && inWinY) {
            lum = winLum;
            h = 0.18;
            rough = 72;
          }
        } else if (inWinX && inWinY) {
          const casementBar =
            Math.abs(uCol - 0.5) < 0.020 || Math.abs(vFloor - 0.56) < 0.022;
          const shutterEdge = Math.abs(uCol - 0.5) > winHalfW - 0.045;
          if (casementBar) {
            lum = wallLum - 46;
            h = 0.36;
            rough = 185;
          } else if (shutterEdge) {
            lum = winLum + 26;
            h = 0.28;
            rough = 195;
          } else {
            lum = winLum + ((st + colIdx) % 3) * 4;
            h = 0.15;
            rough = 70;
          }
        } else if (inFrameX && vFloor > 0.10 && vFloor < 0.85) {
          lum = wallLum - 38;
          h = 0.60;
        } else if (Math.abs(uCol - 0.5) < winHalfW + 0.05 && vFloor >= 0.80 && vFloor <= 0.87) {
          lum = inkLum + 38;
          h = 0.88;
        } else if (vFloor < 0.035) {
          lum = wallLum - 22;
          h = 0.82;
        } else if (uCol < 0.02 || uCol > 0.98) {
          lum = wallLum - 16;
          h = 0.64;
        }
      }

      hField[y * size + x] = h;
      const idx = (y * size + x) * 4;
      colorData[idx] = clampByte(lum + 1);
      colorData[idx + 1] = clampByte(lum);
      colorData[idx + 2] = clampByte(lum - 2);
      colorData[idx + 3] = 255;

      roughData[idx] = rough;
      roughData[idx + 1] = rough;
      roughData[idx + 2] = rough;
      roughData[idx + 3] = 255;
    }
  }

  const normalData = computeNormalBytesFromHeightField(hField, size, 1.65);
  return { size, colorData, roughData, normalData, repX: opts.repX || 2 };
}

function wrapLithographicHaussmannMaps(THREE, raw) {
  const { size, colorData, roughData, normalData, repX } = raw;
  const colorMap = configureMipmappedDataTexture(
    THREE,
    new THREE.DataTexture(colorData, size, size, THREE.RGBAFormat),
    repX,
    1,
    true
  );
  colorMap.wrapT = THREE.ClampToEdgeWrapping;

  const roughnessMap = configureMipmappedDataTexture(
    THREE,
    new THREE.DataTexture(roughData, size, size, THREE.RGBAFormat),
    repX,
    1,
    false
  );
  roughnessMap.wrapT = THREE.ClampToEdgeWrapping;

  const normalMap = configureMipmappedDataTexture(
    THREE,
    new THREE.DataTexture(normalData, size, size, THREE.RGBAFormat),
    repX,
    1,
    false
  );
  normalMap.wrapT = THREE.ClampToEdgeWrapping;
  return { colorMap, normalMap, roughnessMap };
}

/**
 * 4. High-Resolution Lithographic Haussmannian Boulevard Elevation (`512x512` Canvas + Normal + Roughness)
 */
function makeLithographicHaussmannMaps(THREE, opts = {}) {
  return wrapLithographicHaussmannMaps(THREE, synthesizeLithographicHaussmannRaw(opts));
}

/**
 * 5. Tileable Multi-Wave Seine & Basin Ripple Normal Map (`256x256`, exact periodic harmonics)
 */
export function makeSeineWaterRippleNormalMap(THREE, repX = 46, repY = 5.2) {
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  const tau = Math.PI * 2.0;

  for (let y = 0; y < size; y++) {
    const v = (y / size) * tau;
    for (let x = 0; x < size; x++) {
      const u = (x / size) * tau;
      const dx =
        0.38 * Math.cos(u * 2.0 + v * 1.0) +
        0.28 * Math.cos(u * 3.0 - v * 2.0 + 1.3) +
        0.18 * Math.cos(u * 5.0 + v * 3.0 + 2.4) +
        0.10 * Math.cos(u * 8.0 - v * 4.0 + 0.7) +
        0.06 * Math.cos(u * 13.0 + v * 5.0 + 1.9);
      const dy =
        0.38 * Math.sin(u * 1.0 + v * 2.0) +
        0.28 * Math.sin(u * 2.0 - v * 3.0 + 0.8) +
        0.18 * Math.sin(u * 3.0 + v * 5.0 + 2.1) +
        0.10 * Math.sin(u * 4.0 - v * 7.0 + 1.4) +
        0.06 * Math.sin(u * 5.0 + v * 11.0 + 2.8);

      const nx = Math.max(-1, Math.min(1, dx * 0.34));
      const ny = Math.max(-1, Math.min(1, dy * 0.34));
      const nz = Math.sqrt(Math.max(0.25, 1.0 - nx * nx - ny * ny));
      const idx = (y * size + x) * 4;
      data[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  return configureMipmappedDataTexture(THREE, tex, repX, repY, false);
}

function synthesizeBotanicalFoliageRaw() {
  const size = 256;
  const rgba = new Uint8Array(size * size * 4);
  const hField = new Float32Array(size * size);

  const lobes = [
    [0.50, 0.74, 0.25],
    [0.30, 0.58, 0.23],
    [0.70, 0.57, 0.23],
    [0.22, 0.38, 0.20],
    [0.50, 0.44, 0.24],
    [0.78, 0.39, 0.20],
    [0.36, 0.26, 0.18],
    [0.64, 0.25, 0.18],
    [0.50, 0.84, 0.16],
  ];

  const twigs = [
    [0.50, 0.08, 0.50, 0.68, 0.014],
    [0.50, 0.20, 0.27, 0.54, 0.011],
    [0.50, 0.22, 0.73, 0.53, 0.011],
    [0.37, 0.38, 0.21, 0.39, 0.008],
    [0.63, 0.38, 0.79, 0.40, 0.008],
    [0.50, 0.46, 0.36, 0.72, 0.009],
    [0.50, 0.46, 0.65, 0.71, 0.009],
  ];

  const distToSegSq = (px, py, ax, ay, bx, by) => {
    const vx = bx - ax;
    const vy = by - ay;
    const wx = px - ax;
    const wy = py - ay;
    const len2 = Math.max(1e-6, vx * vx + vy * vy);
    const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2));
    const dx = px - (ax + t * vx);
    const dy = py - (ay + t * vy);
    return dx * dx + dy * dy;
  };

  for (let y = 0; y < size; y++) {
    const ny = y / (size - 1);
    for (let x = 0; x < size; x++) {
      const nx = x / (size - 1);

      const nFine = hash2(x, y);
      const nClust =
        0.25 *
        (hash2(x >> 2, y >> 2) +
          hash2((x + 2) >> 2, y >> 2) +
          hash2(x >> 2, (y + 2) >> 2) +
          hash2((x + 2) >> 2, (y + 2) >> 2));
      const nMacro =
        0.25 *
        (hash2(x >> 4, y >> 4) +
          hash2((x + 8) >> 4, y >> 4) +
          hash2(x >> 4, (y + 8) >> 4) +
          hash2((x + 8) >> 4, (y + 8) >> 4));

      let maxLobe = 0.0;
      for (let i = 0; i < lobes.length; i++) {
        const [lx, ly, lr] = lobes[i];
        const dx = nx - lx;
        const dy = (ny - ly) * 1.04;
        const d = Math.sqrt(dx * dx + dy * dy) / lr;
        const val = Math.max(0.0, 1.0 - d);
        if (val > maxLobe) maxLobe = val;
      }

      const leafTuft = 0.56 * nClust + 0.28 * nMacro + 0.16 * nFine;
      const skyGap =
        nMacro < 0.26 && maxLobe < 0.52 ? -0.35 : nClust < 0.22 && maxLobe < 0.36 ? -0.28 : 0.0;
      let density = maxLobe * 1.48 + (leafTuft - 0.45) * 0.72 + skyGap;

      let onTwig = false;
      for (let i = 0; i < twigs.length; i++) {
        const [ax, ay, bx, by, rad] = twigs[i];
        if (distToSegSq(nx, ny, ax, ay, bx, by) < rad * rad) {
          onTwig = true;
          density = Math.max(density, 0.78);
          break;
        }
      }

      const alpha = density > 0.44 ? clampByte(Math.round(Math.min(1.0, density * 1.35) * 255)) : 0;
      const hatchLine = 0.5 + 0.5 * Math.sin((nx + ny) * Math.PI * 56.0);
      let lum = Math.round(
        186 + ny * 42 + (leafTuft - 0.5) * 52 - (1.0 - ny) * (1.0 - hatchLine) * 22
      );
      if (onTwig) lum = 96;

      hField[y * size + x] = alpha > 0 ? 0.35 + leafTuft * 0.6 : 0.0;
      const idx = (y * size + x) * 4;
      rgba[idx] = clampByte(lum + 1);
      rgba[idx + 1] = clampByte(lum);
      rgba[idx + 2] = clampByte(lum - 2);
      rgba[idx + 3] = alpha;
    }
  }

  const normalData = computeNormalBytesFromHeightField(hField, size, 1.15);
  return { size, rgba, normalData };
}

function wrapBotanicalFoliageMaps(THREE, raw) {
  const { size, rgba, normalData } = raw;
  const colorMap = configureMipmappedDataTexture(
    THREE,
    new THREE.DataTexture(rgba, size, size, THREE.RGBAFormat),
    1,
    1,
    true
  );
  colorMap.wrapS = colorMap.wrapT = THREE.ClampToEdgeWrapping;

  const normalMap = configureMipmappedDataTexture(
    THREE,
    new THREE.DataTexture(normalData, size, size, THREE.RGBAFormat),
    1,
    1,
    false
  );
  normalMap.wrapS = normalMap.wrapT = THREE.ClampToEdgeWrapping;
  return { colorMap, normalMap };
}

/**
 * 6. Porous Silver-Gelatin & Pen-and-Ink Botanical Chestnut Foliage Cluster Texture (`256x256` RGBA)
 */
function makeBotanicalEtchingFoliageMaps(THREE) {
  return wrapBotanicalFoliageMaps(THREE, synthesizeBotanicalFoliageRaw());
}

/**
 * Worker-compatible pure-JS synthesizer for the non-overwritten world PBR maps
 * (`roof`, `haussA`, `haussB`, `foliage` — zero `THREE` dependency).
 */
export function synthesizeSketchWorldRawMaps() {
  return {
    roof: synthesizeRibbedRoofRaw(),
    haussA: synthesizeLithographicHaussmannRaw({
      cols: 8,
      storeys: 5,
      wallLum: 238,
      winLum: 108,
      inkLum: 64,
      repX: 2,
    }),
    haussB: synthesizeLithographicHaussmannRaw({
      cols: 7,
      storeys: 6,
      wallLum: 224,
      winLum: 100,
      inkLum: 60,
      repX: 2,
    }),
    foliage: synthesizeBotanicalFoliageRaw(),
  };
}

/**
 * Build a custom `1x1x1` Haussmannian block `BufferGeometry` where vertical walls
 * map `[0..1]` bottom-to-top to the lithographic elevation texture and the horizontal
 * roof terrace cap maps to a neutral stone corner `(0.01, 0.99)` (zero stretched windows on roofs!).
 */
export function createHaussmannBlockGeometry(THREE) {
  // 4 vertical walls + 1 top cap (bottom cap omitted since all blocks sit in ground)
  const pos = [
    // +Z front
    -0.5, -0.5, 0.5,   0.5, -0.5, 0.5,   0.5, 0.5, 0.5,  -0.5, 0.5, 0.5,
    // -Z back
     0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5,  0.5, 0.5, -0.5,
    // +X right
     0.5, -0.5, 0.5,   0.5, -0.5, -0.5,  0.5, 0.5, -0.5,  0.5, 0.5, 0.5,
    // -X left
    -0.5, -0.5, -0.5, -0.5, -0.5, 0.5,  -0.5, 0.5, 0.5,  -0.5, 0.5, -0.5,
    // +Y roof deck
    -0.5, 0.5, 0.5,    0.5, 0.5, 0.5,    0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
  ];
  const nrm = [
    0, 0, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1,
    0, 0, -1,  0, 0, -1,  0, 0, -1,  0, 0, -1,
    1, 0, 0,   1, 0, 0,   1, 0, 0,   1, 0, 0,
   -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0,
    0, 1, 0,   0, 1, 0,   0, 1, 0,   0, 1, 0,
  ];
  const uvs = [
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 0.65, 0, 0.65, 1, 0, 1,
    0, 0, 0.65, 0, 0.65, 1, 0, 1,
    // Roof cap samples plain top stone band
    0.01, 0.985, 0.03, 0.985, 0.03, 0.995, 0.01, 0.995,
  ];
  const idx = [];
  for (let f = 0; f < 5; f++) {
    const b = f * 4;
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Build a multi-branched skeletal timber tree trunk + primary boughs `BufferGeometry`
 * (`y = 0 .. 7.2 m` in unit-scale tree space) for `InstancedMesh` rendering.
 */
export function createSkeletalTreeTrunkGeometry(THREE) {
  const parts = [];
  const pushLimb = (ax, ay, az, bx, by, bz, rBot, rTop, seg = 5) => {
    const dx = bx - ax;
    const dy = by - ay;
    const dz = bz - az;
    const len = Math.hypot(dx, dy, dz);
    const cyl = new THREE.CylinderGeometry(rTop, rBot, len, seg, 1, false);
    const up = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3(dx, dy, dz).normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
    const mat4 = new THREE.Matrix4().compose(
      new THREE.Vector3(0.5 * (ax + bx), 0.5 * (ay + by), 0.5 * (az + bz)),
      quat,
      new THREE.Vector3(1, 1, 1)
    );
    cyl.applyMatrix4(mat4);
    parts.push(cyl);
  };

  // Main trunk with slight organic lean
  pushLimb(0.0, 0.0, 0.0, 0.04, 3.1, -0.02, 0.25, 0.16, 6);
  pushLimb(0.04, 3.05, -0.02, 0.0, 5.4, 0.03, 0.15, 0.08, 5);
  // 5 Primary upward-forking chestnut boughs
  pushLimb(0.03, 2.75, 0.0, 1.28, 5.35, 0.42, 0.11, 0.045, 5);
  pushLimb(0.03, 2.85, 0.0, -1.22, 5.45, 0.52, 0.11, 0.045, 5);
  pushLimb(0.02, 3.05, -0.02, 0.35, 5.75, -1.25, 0.10, 0.042, 5);
  pushLimb(0.02, 3.15, -0.02, -0.78, 5.65, -1.02, 0.10, 0.042, 5);
  pushLimb(0.0, 4.35, 0.02, 0.55, 6.75, 0.45, 0.075, 0.032, 4);
  pushLimb(0.0, 4.45, 0.02, -0.52, 6.85, -0.35, 0.075, 0.032, 4);

  let vTotal = 0;
  let iTotal = 0;
  for (const g of parts) {
    vTotal += g.attributes.position.count;
    iTotal += g.index ? g.index.count : g.attributes.position.count;
  }
  const pos = new Float32Array(vTotal * 3);
  const nrm = new Float32Array(vTotal * 3);
  const uvs = new Float32Array(vTotal * 2);
  const idx = new Uint16Array(iTotal);
  let vOff = 0;
  let iOff = 0;
  for (const g of parts) {
    pos.set(g.attributes.position.array, vOff * 3);
    nrm.set(g.attributes.normal.array, vOff * 3);
    uvs.set(g.attributes.uv.array, vOff * 2);
    const gIdx = g.index.array;
    for (let k = 0; k < gIdx.length; k++) idx[iOff + k] = gIdx[k] + vOff;
    vOff += g.attributes.position.count;
    iOff += gIdx.length;
    g.dispose();
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  merged.setIndex(new THREE.BufferAttribute(idx, 1));
  merged.computeBoundingSphere();
  return merged;
}

/**
 * Build a porous 4-card botanical crown cluster (`y = 2.4 .. 8.9 m` in unit-scale tree space)
 * with outward-hemispherical blended normals (`trees_foliage/SKILL.md` technique) so real
 * `DirectionalLight` + `HemisphereLight` grade smoothly across the canopy with zero X-card seams.
 */
export function createBotanicalCrownClusterGeometry(THREE) {
  const pos = [];
  const nrm = [];
  const uvs = [];
  const idx = [];

  const crownCenterY = 5.65;
  // 3 vertical/tilted star cards at 0°, 60°, 120° + 1 gently arched upper canopy card
  const cards = [
    { yaw: 0.0, tiltX: 0.06, cy: 5.55, w: 6.1, h: 6.3, bowZ: 0.45 },
    { yaw: Math.PI / 3, tiltX: -0.07, cy: 5.65, w: 5.9, h: 6.2, bowZ: -0.42 },
    { yaw: (2 * Math.PI) / 3, tiltX: 0.05, cy: 5.60, w: 6.0, h: 6.1, bowZ: 0.40 },
    { yaw: 0.4, tiltX: 1.08, cy: 6.35, w: 5.2, h: 5.0, bowZ: 0.35 },
  ];

  const vTmp = new THREE.Vector3();
  const fNorm = new THREE.Vector3();
  const sNorm = new THREE.Vector3();
  const qYaw = new THREE.Quaternion();
  const qTilt = new THREE.Quaternion();
  const qTot = new THREE.Quaternion();
  const xAxis = new THREE.Vector3(1, 0, 0);
  const yAxis = new THREE.Vector3(0, 1, 0);

  for (const c of cards) {
    qYaw.setFromAxisAngle(yAxis, c.yaw);
    qTilt.setFromAxisAngle(xAxis, c.tiltX);
    qTot.multiplyQuaternions(qYaw, qTilt);

    // 2x2 subdivided curved quad (9 vertices, 8 triangles per card) for soft volume
    const baseV = pos.length / 3;
    for (let iy = 0; iy <= 2; iy++) {
      const v = iy / 2;
      const ly = (v - 0.5) * c.h;
      for (let ix = 0; ix <= 2; ix++) {
        const u = ix / 2;
        const lx = (u - 0.5) * c.w;
        const arch = (1.0 - 4.0 * (u - 0.5) * (u - 0.5)) * (1.0 - 2.0 * Math.abs(v - 0.5) * 0.5);
        const lz = c.bowZ * arch;

        vTmp.set(lx, ly, lz).applyQuaternion(qTot);
        vTmp.y += c.cy;
        pos.push(vTmp.x, vTmp.y, vTmp.z);
        uvs.push(u, v);

        fNorm.set(0, 0, 1).applyQuaternion(qTot);
        sNorm.set(vTmp.x, (vTmp.y - crownCenterY) * 1.15 + 0.85, vTmp.z).normalize();
        sNorm.lerp(fNorm, 0.18).normalize();
        nrm.push(sNorm.x, sNorm.y, sNorm.z);
      }
    }

    for (let iy = 0; iy < 2; iy++) {
      for (let ix = 0; ix < 2; ix++) {
        const a = baseV + iy * 3 + ix;
        const b = a + 1;
        const d = a + 3;
        const e = d + 1;
        idx.push(a, b, e, a, e, d);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Build the complete surrounding-world monochrome collodion & architectural sketch
 * PBR material library (`0` emissive, `100%` `MeshStandardMaterial`, `fog = true`).
 */
const EMPTY_MAP_TRIO = Object.freeze({ colorMap: null, normalMap: null, roughnessMap: null });

export function createSketchWorldMaterials(THREE, mistUniforms, {
  skipOverwrittenFloorMaps = false,
  rawWorldMaps = null,
} = {}) {
  const P = PARIS_SKETCH_WORLD_PALETTE;

  const gravelMaps = skipOverwrittenFloorMaps ? EMPTY_MAP_TRIO : makeCollodionGravelPbrMaps(THREE, 24, 24);
  const gravelSkirtMaps = skipOverwrittenFloorMaps ? EMPTY_MAP_TRIO : makeCollodionGravelPbrMaps(THREE, 360, 200);
  const alleeMaps = skipOverwrittenFloorMaps ? EMPTY_MAP_TRIO : makeCollodionGravelPbrMaps(THREE, 26, 90);
  const ashlarMaps = skipOverwrittenFloorMaps ? EMPTY_MAP_TRIO : makeAshlarStonePbrMaps(THREE, 4, 2);

  const roofRaw = rawWorldMaps?.roof || synthesizeRibbedRoofRaw();
  const roofMaps = wrapRibbedRoofMaps(THREE, roofRaw, 10, 3);
  const domeMaps = wrapRibbedRoofMaps(THREE, roofRaw, 14, 4);

  const haussAMaps = rawWorldMaps?.haussA
    ? wrapLithographicHaussmannMaps(THREE, rawWorldMaps.haussA)
    : makeLithographicHaussmannMaps(THREE, {
        cols: 8,
        storeys: 5,
        wallLum: 238,
        winLum: 108,
        inkLum: 64,
        repX: 2,
      });
  const haussBMaps = rawWorldMaps?.haussB
    ? wrapLithographicHaussmannMaps(THREE, rawWorldMaps.haussB)
    : makeLithographicHaussmannMaps(THREE, {
        cols: 7,
        storeys: 6,
        wallLum: 224,
        winLum: 100,
        inkLum: 60,
        repX: 2,
      });

  const seineNormalMap = skipOverwrittenFloorMaps ? null : makeSeineWaterRippleNormalMap(THREE, 48, 5.4);
  const basinNormalMap = skipOverwrittenFloorMaps ? null : makeSeineWaterRippleNormalMap(THREE, 9, 9);
  const foliageMaps = rawWorldMaps?.foliage
    ? wrapBotanicalFoliageMaps(THREE, rawWorldMaps.foliage)
    : makeBotanicalEtchingFoliageMaps(THREE);

  const std = (name, color, roughness, metalness, matOpts = {}, shaderOpts = {}) =>
    attachWorldSketchAndMistShader(
      THREE,
      new THREE.MeshStandardMaterial({
        name,
        color,
        roughness,
        metalness,
        ...matOpts,
      }),
      mistUniforms,
      shaderOpts
    );

  const foliageDepthMaterial = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    map: foliageMaps.colorMap,
    alphaTest: 0.44,
  });

  return {
    seineNormalMap,
    basinNormalMap,
    foliageDepthMaterial,

    gravel: std(
      'world_gravel',
      P.esplanadeGravel,
      0.92,
      0.0,
      {
        map: gravelMaps.colorMap,
        normalMap: gravelMaps.normalMap,
        roughnessMap: gravelMaps.roughnessMap,
        normalScale: new THREE.Vector2(0.56, 0.56),
      },
      { hatchStrength: 0.08, contactAoStrength: 0.0, printGrainStrength: 0.022 }
    ),

    gravelSkirt: std(
      'world_gravel_skirt',
      P.esplanadeGravel,
      0.92,
      0.0,
      {
        map: gravelSkirtMaps.colorMap,
        normalMap: gravelSkirtMaps.normalMap,
        roughnessMap: gravelSkirtMaps.roughnessMap,
        normalScale: new THREE.Vector2(0.48, 0.48),
      },
      { hatchStrength: 0.07, contactAoStrength: 0.0, printGrainStrength: 0.020 }
    ),

    allee: std(
      'world_allee',
      P.alleeGravel,
      0.90,
      0.0,
      {
        map: alleeMaps.colorMap,
        normalMap: alleeMaps.normalMap,
        roughnessMap: alleeMaps.roughnessMap,
        normalScale: new THREE.Vector2(0.42, 0.42),
      },
      { hatchStrength: 0.07, contactAoStrength: 0.0, printGrainStrength: 0.020 }
    ),

    street: std(
      'world_street',
      P.macadamStreet,
      0.93,
      0.0,
      {
        normalMap: gravelMaps.normalMap,
        normalScale: new THREE.Vector2(0.32, 0.32),
      },
      { hatchStrength: 0.09, contactAoStrength: 0.0, printGrainStrength: 0.022 }
    ),

    earth: std(
      'world_earth',
      P.excavationEarth,
      0.93,
      0.0,
      {
        normalMap: gravelMaps.normalMap,
        normalScale: new THREE.Vector2(0.65, 0.65),
      },
      { hatchStrength: 0.18, hatchScale: 2.8, contactAoStrength: 0.12, printGrainStrength: 0.024 }
    ),

    lawn: std(
      'world_parterre_muted',
      P.parterreMuted,
      0.95,
      0.0,
      {
        map: alleeMaps.colorMap,
        normalMap: alleeMaps.normalMap,
        normalScale: new THREE.Vector2(0.36, 0.36),
      },
      { hatchStrength: 0.10, contactAoStrength: 0.0, printGrainStrength: 0.020 }
    ),

    stone: std(
      'world_stone',
      P.dressedStone,
      0.86,
      0.02,
      {
        map: ashlarMaps.colorMap,
        normalMap: ashlarMaps.normalMap,
        roughnessMap: ashlarMaps.roughnessMap,
        normalScale: new THREE.Vector2(0.48, 0.48),
      },
      { hatchStrength: 0.18, hatchScale: 2.4, contactAoStrength: 0.16 }
    ),

    cream: std(
      'world_wall_light',
      P.wallLight,
      0.89,
      0.01,
      {
        map: ashlarMaps.colorMap,
        normalMap: ashlarMaps.normalMap,
        normalScale: new THREE.Vector2(0.34, 0.34),
      },
      { hatchStrength: 0.19, hatchScale: 2.35, contactAoStrength: 0.16 }
    ),

    terracottaBand: std(
      'world_masonry_band',
      P.masonryBand,
      0.88,
      0.01,
      {},
      { hatchStrength: 0.18, hatchScale: 2.5, contactAoStrength: 0.12 }
    ),

    marble: std(
      'world_marble',
      P.marble,
      0.72,
      0.02,
      {},
      { hatchStrength: 0.13, hatchScale: 2.6, contactAoStrength: 0.10 }
    ),

    expoBrick: std(
      'world_wall_mid',
      P.wallMid,
      0.90,
      0.01,
      {
        map: ashlarMaps.colorMap,
        normalMap: ashlarMaps.normalMap,
        normalScale: new THREE.Vector2(0.38, 0.38),
      },
      { hatchStrength: 0.20, hatchScale: 2.45, contactAoStrength: 0.16 }
    ),

    wood: std(
      'world_wood',
      P.weatheredTimber,
      0.89,
      0.0,
      {},
      { hatchStrength: 0.18, hatchScale: 3.1, contactAoStrength: 0.12 }
    ),

    foliage: std(
      'world_tree_sketch',
      P.treeSketchFoliage,
      0.93,
      0.0,
      {
        map: foliageMaps.colorMap,
        normalMap: foliageMaps.normalMap,
        normalScale: new THREE.Vector2(0.38, 0.38),
        alphaTest: 0.44,
        side: THREE.DoubleSide,
      },
      { hatchStrength: 0.16, hatchScale: 2.9, contactAoStrength: 0.04, printGrainStrength: 0.012 }
    ),

    bark: std(
      'world_bark',
      P.treeTimberBark,
      0.92,
      0.0,
      {},
      { hatchStrength: 0.18, hatchScale: 3.4, contactAoStrength: 0.18, printGrainStrength: 0.01 }
    ),

    slate: std(
      'world_roof_slate',
      P.roofSlate,
      0.74,
      0.08,
      {
        map: roofMaps.colorMap,
        normalMap: roofMaps.normalMap,
        roughnessMap: roofMaps.roughnessMap,
        normalScale: new THREE.Vector2(0.62, 0.62),
      },
      { hatchStrength: 0.20, hatchScale: 2.6, contactAoStrength: 0.06 }
    ),

    expoIron: std(
      'world_expo_iron',
      P.expoIron,
      0.58,
      0.48,
      {},
      { hatchStrength: 0.16, hatchScale: 2.8, contactAoStrength: 0.12 }
    ),

    copper: std(
      'world_patina_dome',
      P.patinaDome,
      0.62,
      0.34,
      {
        map: domeMaps.colorMap,
        normalMap: domeMaps.normalMap,
        roughnessMap: domeMaps.roughnessMap,
        normalScale: new THREE.Vector2(0.68, 0.68),
      },
      { hatchStrength: 0.19, hatchScale: 2.5, contactAoStrength: 0.05 }
    ),

    gold: std(
      'world_antique_bronze',
      P.antiqueBronze,
      0.46,
      0.56,
      {},
      { hatchStrength: 0.12, hatchScale: 2.8, contactAoStrength: 0.06 }
    ),

    water: std(
      'world_basin_water',
      P.basinWater,
      0.18,
      0.06,
      {
        envMapIntensity: 1.12,
        normalMap: basinNormalMap,
        normalScale: new THREE.Vector2(0.18, 0.18),
      },
      { hatchStrength: 0.0, contactAoStrength: 0.0, printGrainStrength: 0.008 }
    ),

    seineWater: std(
      'seineCollodionPBR',
      P.seineWater,
      0.16,
      0.06,
      {
        envMapIntensity: 1.18,
        normalMap: seineNormalMap,
        normalScale: new THREE.Vector2(0.24, 0.24),
      },
      { hatchStrength: 0.0, contactAoStrength: 0.0, printGrainStrength: 0.008, isRiverWater: true }
    ),

    glass: std(
      'world_collodion_glass',
      P.collodionGlass,
      0.24,
      0.08,
      { envMapIntensity: 1.05 },
      { hatchStrength: 0.08, hatchScale: 2.9, contactAoStrength: 0.04 }
    ),

    cityWall: std(
      'world_city_wall_a',
      P.wallLight,
      0.88,
      0.02,
      {
        map: haussAMaps.colorMap,
        normalMap: haussAMaps.normalMap,
        roughnessMap: haussAMaps.roughnessMap,
        normalScale: new THREE.Vector2(0.52, 0.52),
      },
      { hatchStrength: 0.18, hatchScale: 2.2, contactAoStrength: 0.18 }
    ),

    cityWallWarm: std(
      'world_city_wall_b',
      P.wallMid,
      0.89,
      0.02,
      {
        map: haussBMaps.colorMap,
        normalMap: haussBMaps.normalMap,
        roughnessMap: haussBMaps.roughnessMap,
        normalScale: new THREE.Vector2(0.52, 0.52),
      },
      { hatchStrength: 0.19, hatchScale: 2.2, contactAoStrength: 0.18 }
    ),

    gasGlobe: std(
      'world_opaline_globe',
      P.opalineGlobe,
      0.34,
      0.0,
      { envMapIntensity: 0.95 },
      { hatchStrength: 0.04, contactAoStrength: 0.0, printGrainStrength: 0.0 }
    ),
  };
}
