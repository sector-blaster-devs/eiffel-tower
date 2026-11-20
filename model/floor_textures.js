/**
 * Archival Floor, Masonry, Riverbank & Promenade Deck PBR Textures (`model/floor_textures.js`)
 *
 * Delivers high-definition procedural PBR textures (albedo `SRGBColorSpace` + analytic normal
 * + packed cavity-AO / roughness / sheen `NoColorSpace`) coupled with composable dual-scale
 * stochastic world-space triplanar sampling so EVERY floor, ground, plinth, parterre, riverbank,
 * street, excavation pit, and Tower timber deck surface exhibits crisp close-up relief and
 * physically grounded specular/roughness response with ZERO UV stretching on merged meshes.
 *
 * Strict Compliance:
 *   - Archival Photography & Lemercier Vellum Palette (#5 & #8; zero bright synthetic colors)
 *   - Real Light Response Only (`emissive = 0x000000`, `emissiveIntensity = 0.0`, `0` AdditiveBlending)
 *   - Self-Contained Offline Procedural Generation (zero external URLs / CDNs)
 *   - Composable `onBeforeCompile` chaining so radial mist / sketch shaders compose seamlessly.
 */

let _cachedFloorTextureBank = null;
const _noiseGridCache = new Map();
const _pebbleGridCache = new Map();

// ---------------------------------------------------------------------------
// Deterministic Hash & Value-Noise / Cellular Helpers
// ---------------------------------------------------------------------------

function hash2i(ix, iy, seed = 1) {
  let n = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function clampByte(v) {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

function smooth01(t) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

function getNoiseGrid(period, seed) {
  const key = (period << 16) ^ seed;
  let grid = _noiseGridCache.get(key);
  if (!grid) {
    grid = new Float64Array(period * period);
    for (let cy = 0; cy < period; cy++) {
      const row = cy * period;
      for (let cx = 0; cx < period; cx++) {
        grid[row + cx] = hash2i(cx, cy, seed);
      }
    }
    _noiseGridCache.set(key, grid);
  }
  return grid;
}

/**
 * Periodic tileable bilinear value noise on an integer period `period` (divides `size`).
 */
function tileValueNoise(u, v, period, seed) {
  const grid = getNoiseGrid(period, seed);
  const x = u * period;
  const y = v * period;
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  let x0 = ix % period;
  if (x0 < 0) x0 += period;
  let y0 = iy % period;
  if (y0 < 0) y0 += period;
  const x1 = x0 + 1 === period ? 0 : x0 + 1;
  const y1 = y0 + 1 === period ? 0 : y0 + 1;

  const r0 = y0 * period;
  const r1 = y1 * period;
  const n00 = grid[r0 + x0];
  const n10 = grid[r0 + x1];
  const n01 = grid[r1 + x0];
  const n11 = grid[r1 + x1];

  const nx0 = n00 + (n10 - n00) * sx;
  const nx1 = n01 + (n11 - n01) * sx;
  return nx0 + (nx1 - nx0) * sy;
}

function getPebbleGrid(cells, seed, jitter) {
  const key = `${cells}_${seed}_${jitter}`;
  let grid = _pebbleGridCache.get(key);
  if (!grid) {
    grid = new Float64Array(cells * cells * 5);
    let o = 0;
    for (let cy = 0; cy < cells; cy++) {
      for (let cx = 0; cx < cells; cx++) {
        const aniso = 0.85 + 0.30 * hash2i(cx, cy, seed + 31);
        grid[o] = (hash2i(cx, cy, seed) - 0.5) * jitter + 0.5;
        grid[o + 1] = (hash2i(cx, cy, seed + 17) - 0.5) * jitter + 0.5;
        grid[o + 2] = aniso;
        grid[o + 3] = 1.0 / aniso;
        grid[o + 4] = hash2i(cx, cy, seed + 53);
        o += 5;
      }
    }
    _pebbleGridCache.set(key, grid);
  }
  return grid;
}

/**
 * Periodic Worley / cellular pebble dome field on `cells × cells` grid.
 * Returns `{ dome, border, cellTone }` where `dome` is `[0..1]` pebble crown height,
 * `border` is `[0..1]` inter-pebble crevice factor, and `cellTone` is `[0..1]` random stone ID.
 */
function tileCellularPebbles(u, v, cells, seed, jitter = 0.78) {
  const grid = getPebbleGrid(cells, seed, jitter);
  const gx = u * cells;
  const gy = v * cells;
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  const fx = gx - ix;
  const fy = gy - iy;

  let c0y = (iy - 1) % cells;
  if (c0y < 0) c0y += cells;
  const c1y = c0y + 1 === cells ? 0 : c0y + 1;
  const c2y = c1y + 1 === cells ? 0 : c1y + 1;

  let c0x = (ix - 1) % cells;
  if (c0x < 0) c0x += cells;
  const c1x = c0x + 1 === cells ? 0 : c0x + 1;
  const c2x = c1x + 1 === cells ? 0 : c1x + 1;

  let d1Sq = 9801.0;
  let d2Sq = 9801.0;
  let bestTone = 0.5;

  for (let ny = 0; ny < 3; ny++) {
    const dy = ny - 1;
    const cy = ny === 0 ? c0y : ny === 1 ? c1y : c2y;
    const rowBase = cy * cells * 5;
    for (let nx = 0; nx < 3; nx++) {
      const dx = nx - 1;
      const cx = nx === 0 ? c0x : nx === 1 ? c1x : c2x;
      const o = rowBase + cx * 5;
      const rx = dx + grid[o] - fx;
      const ry = dy + grid[o + 1] - fy;
      const ax = rx * grid[o + 2];
      const ay = ry * grid[o + 3];
      const distSq = ax * ax + ay * ay;
      if (distSq < d1Sq) {
        d2Sq = d1Sq;
        d1Sq = distSq;
        bestTone = grid[o + 4];
      } else if (distSq < d2Sq) {
        d2Sq = distSq;
      }
    }
  }

  const d1 = Math.sqrt(d1Sq);
  const d2 = Math.sqrt(d2Sq);
  const border = clamp01((d2 - d1) * 2.35);
  const dome = Math.sqrt(clamp01(1.0 - d1Sq * 1.65)) * smooth01(border * 1.35);
  return { dome, border, cellTone: bestTone };
}

/**
 * Pure-JS byte synthesizer for a 3-map PBR set (`albedoBytes`, `normalBytes`, `roughAoBytes`).
 * Runs identically in a Web Worker (zero `THREE` dependency) or synchronously on main thread.
 */
function buildPbrMapTrioRaw(size, slopeScale, sampleFn) {
  const N = size * size;
  const heights = new Float32Array(N);
  const albedoBytes = new Uint8Array(N * 4);
  const roughAoBytes = new Uint8Array(N * 4);
  const normalBytes = new Uint8Array(N * 4);

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  const invSize = 1.0 / size;

  for (let y = 0; y < size; y++) {
    const v = y * invSize;
    const row = y * size;
    for (let x = 0; x < size; x++) {
      const u = x * invSize;
      const idx = row + x;
      const p = sampleFn(u, v, x, y, size);
      heights[idx] = p.h;

      const o = idx << 2;
      const ar = clampByte(p.albR);
      const ag = clampByte(p.albG);
      const ab = clampByte(p.albB);
      albedoBytes[o] = ar;
      albedoBytes[o + 1] = ag;
      albedoBytes[o + 2] = ab;
      albedoBytes[o + 3] = 255;

      sumR += ar;
      sumG += ag;
      sumB += ab;

      // R = Ambient Occlusion [0..255], G = Roughness [0..255], B = Micro-sheen [0..255]
      roughAoBytes[o] = clampByte(clamp01(p.ao) * 255);
      roughAoBytes[o + 1] = clampByte(clamp01(p.rough) * 255);
      roughAoBytes[o + 2] = clampByte(clamp01(p.sheen ?? 0.5) * 255);
      roughAoBytes[o + 3] = 255;
    }
  }

  // Normalize albedoBytes gently around sRGB 244 so `material.color` stays true to measured palette hex
  const targetMean = 244.0;
  const gainR = targetMean / Math.max(64.0, sumR / N);
  const gainG = targetMean / Math.max(64.0, sumG / N);
  const gainB = targetMean / Math.max(64.0, sumB / N);
  for (let i = 0; i < N * 4; i += 4) {
    albedoBytes[i] = clampByte(albedoBytes[i] * gainR);
    albedoBytes[i + 1] = clampByte(albedoBytes[i + 1] * gainG);
    albedoBytes[i + 2] = clampByte(albedoBytes[i + 2] * gainB);
  }

  // Precompute analytic central-difference + Sobel normal map (zero 2x2 dFdx blockiness!)
  const sobelScale = 0.125 * slopeScale;
  for (let y = 0; y < size; y++) {
    const ym = (y === 0 ? size - 1 : y - 1) * size;
    const yc = y * size;
    const yp = (y + 1 === size ? 0 : y + 1) * size;
    for (let x = 0; x < size; x++) {
      const xm = x === 0 ? size - 1 : x - 1;
      const xp = x + 1 === size ? 0 : x + 1;

      const hTL = heights[ym + xm];
      const hT = heights[ym + x];
      const hTR = heights[ym + xp];
      const hL = heights[yc + xm];
      const hR = heights[yc + xp];
      const hBL = heights[yp + xm];
      const hB = heights[yp + x];
      const hBR = heights[yp + xp];

      // 3x3 Sobel filter for smooth, anti-aliased tangent slopes
      const nx = -((hTR + 2.0 * hR + hBR) - (hTL + 2.0 * hL + hBL)) * sobelScale;
      const ny = -((hBL + 2.0 * hB + hBR) - (hTL + 2.0 * hT + hTR)) * sobelScale;
      const invLen = 1.0 / Math.sqrt(nx * nx + ny * ny + 1.0);

      const o = (yc + x) << 2;
      normalBytes[o] = clampByte((nx * invLen * 0.5 + 0.5) * 255);
      normalBytes[o + 1] = clampByte((ny * invLen * 0.5 + 0.5) * 255);
      normalBytes[o + 2] = clampByte((invLen * 0.5 + 0.5) * 255);
      normalBytes[o + 3] = 255;
    }
  }

  return { size, albedoBytes, normalBytes, roughAoBytes };
}

function wrapRawPbrTrio(THREE, raw, maxAniso) {
  const { size, albedoBytes, normalBytes, roughAoBytes } = raw;
  const mkTex = (bytes, isSrgb) => {
    const tex = new THREE.DataTexture(bytes, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    if (isSrgb && THREE.SRGBColorSpace) {
      tex.colorSpace = THREE.SRGBColorSpace;
    } else if (THREE.NoColorSpace) {
      tex.colorSpace = THREE.NoColorSpace;
    }
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = maxAniso;
    tex.needsUpdate = true;
    return tex;
  };

  return {
    albedoMap: mkTex(albedoBytes, true),
    normalMap: mkTex(normalBytes, false),
    roughnessMap: mkTex(roughAoBytes, false),
  };
}

// ---------------------------------------------------------------------------
// Procedural Texture Bank (Worker-Synthesizable + Cached per-session)
// ---------------------------------------------------------------------------

export function synthesizeFloorTextureRawBankPart(part = 'all') {
  const S = 512;
  const S_MED = 256;
  const doA = part === 'all' || part === 'floor_a';
  const doB = part === 'all' || part === 'floor_b';
  const out = {};

  if (doA) {
    // 1. Esplanade Crushed Limestone & Flint Gravel (`#dbd6cc` / `#bfb9ae` / `#e8e4dc`)
    out.esplanadeGravel = buildPbrMapTrioRaw(S, 5.6, (u, v) => {
      const pCoarse = tileCellularPebbles(u, v, 28, 101, 0.84);
      const pFine = tileCellularPebbles(u, v, 64, 211, 0.86);
      const sand = tileValueNoise(u, v, 128, 307);
      const macroUndul = tileValueNoise(u, v, 8, 401);
      const rake = 0.5 + 0.5 * Math.sin(u * Math.PI * 36.0 + (macroUndul - 0.5) * 2.2);

      const h =
        0.46 * pCoarse.dome +
        0.30 * pFine.dome +
        0.13 * sand +
        0.06 * rake +
        0.05 * macroUndul;

      // Flint dark pebbles (~18% of stones) vs sunlit crushed limestone calcite grains
      const isFlint = pCoarse.cellTone < 0.18 ? 1.0 : 0.0;
      const isBrightCalcite = pCoarse.cellTone > 0.78 ? 1.0 : 0.0;
      const crevice = clamp01(pCoarse.border * 0.65 + pFine.border * 0.35);

      let lum = 236 + (h - 0.45) * 42 - isFlint * 28 + isBrightCalcite * 14;
      lum *= 0.86 + 0.16 * crevice;
      const warm = (pCoarse.cellTone - 0.5) * 7.0 - isFlint * 4.0;

      // Smooth flint facets (0.72) vs powdery crushed limestone interstices (0.97)
      const rough = clamp01(0.95 - pCoarse.dome * 0.14 - isFlint * 0.08 + (1.0 - crevice) * 0.05);
      const ao = clamp01(0.54 + 0.46 * smooth01(crevice * 1.15));

      return {
        h,
        albR: lum + warm,
        albG: lum + warm * 0.35,
        albB: lum - warm * 0.75,
        rough,
        ao,
      };
    });
  }

  if (doB) {
    // 2. Compacted Promenade Allée Sand-Gravel (`#e2ddd3`)
    out.alleeGravel = buildPbrMapTrioRaw(S_MED, 4.4, (u, v) => {
      const pFine = tileCellularPebbles(u, v, 48, 503, 0.82);
      const grit = tileValueNoise(u, v, 128, 521);
      const wheelRake = 0.5 + 0.5 * Math.sin(u * Math.PI * 44.0 + tileValueNoise(u, v, 12, 541) * 1.8);
      const h = 0.40 * pFine.dome + 0.38 * grit + 0.22 * wheelRake;
      const lum = 238 + (h - 0.48) * 34;
      const rough = clamp01(0.93 - pFine.dome * 0.10 - wheelRake * 0.04);
      const ao = clamp01(0.66 + 0.34 * pFine.border);
      return {
        h,
        albR: lum + 2,
        albG: lum,
        albB: lum - 3,
        rough,
        ao,
      };
    });

    // 3. Muted Archival Parterre Turf & Boxwood Stipple (`#8c887f` — 0% bright green)
    out.parterreTurf = buildPbrMapTrioRaw(S_MED, 5.0, (u, v) => {
      const tuftA = tileCellularPebbles(u, v, 36, 601, 0.88);
      const tuftB = tileCellularPebbles(u, v, 84, 619, 0.90);
      const blade = tileValueNoise(u, v, 128, 643);
      const mowBand = 0.5 + 0.5 * Math.cos(v * Math.PI * 8.0);
      const h = 0.42 * tuftA.dome + 0.36 * tuftB.dome + 0.18 * blade + 0.04 * mowBand;
      const lum = 234 + (h - 0.46) * 40 + (mowBand - 0.5) * 10;
      const rough = clamp01(0.96 - blade * 0.07);
      const ao = clamp01(0.52 + 0.48 * (0.55 * tuftA.border + 0.45 * tuftB.border));
      return {
        h,
        albR: lum + 1,
        albG: lum + 1,
        albB: lum - 2,
        rough,
        ao,
      };
    });

    // 4. Château-Landon Dressed Ashlar Masonry (`#d2c8b4`, 8 courses × 4 blocks running bond + chisel tool marks)
    out.ashlarMasonry = buildPbrMapTrioRaw(S, 6.4, (u, v, x, y, size) => {
      const courses = 8;
      const blocksPerRow = 4;
      const cyF = v * courses;
      const course = Math.floor(cyF);
      const fy = cyF - course; // [0..1] inside course

      const uShift = (u + (course % 2) * (0.5 / blocksPerRow)) % 1.0;
      const bxF = uShift * blocksPerRow;
      const blockIdx = Math.floor(bxF);
      const fx = bxF - blockIdx; // [0..1] inside block

      const bedDist = Math.min(fy, 1.0 - fy) * (size / courses);     // pixels from horizontal mortar joint
      const perpDist = Math.min(fx, 1.0 - fx) * (size / blocksPerRow); // pixels from vertical mortar joint
      const jointPx = Math.min(bedDist, perpDist);

      const blockRand = hash2i(blockIdx, course, 701);
      const blockTilt = (hash2i(blockIdx, course, 719) - 0.5) * 0.08 * (fx - 0.5);

      // 45-degree stone-mason drove chisel marks inside inner panel (drafted margin around perimeter!)
      const inMargin = bedDist < 7.5 || perpDist < 7.5;
      const chiselPhase = (x + y * (course % 2 === 0 ? 1 : -1)) * 0.85;
      const chisel = inMargin ? 0.5 + 0.15 * Math.sin(x * 1.4) : 0.5 + 0.5 * Math.sin(chiselPhase);
      const pores = tileValueNoise(u, v, 128, 733) * 0.6 + tileValueNoise(u, v, 32, 743) * 0.4;

      let h = 0.78 + blockTilt + (blockRand - 0.5) * 0.06 + chisel * 0.07 - (1.0 - pores) * 0.08;
      let rough = clamp01(0.84 - chisel * 0.05 + (1.0 - pores) * 0.09);
      let ao = clamp01(0.86 + pores * 0.14);
      let lum = 242 + (blockRand - 0.5) * 24 + (pores - 0.5) * 18;

      // Recessed lime-mortar joint & chamfered stone arris
      if (jointPx < 2.2) {
        const jt = jointPx / 2.2;
        h = 0.12 + jt * 0.22 + pores * 0.05;
        rough = 0.96;
        ao = 0.42 + jt * 0.22;
        lum = 196 + pores * 16;
      } else if (jointPx < 5.0) {
        const bev = smooth01((jointPx - 2.2) / 2.8);
        h = 0.34 + bev * (h - 0.34);
        ao = 0.64 + bev * (ao - 0.64);
        lum = 224 + bev * (lum - 224);
      }

      return {
        h,
        albR: lum + (blockRand - 0.5) * 6,
        albG: lum + (blockRand - 0.5) * 3,
        albB: lum - (blockRand - 0.5) * 5,
        rough,
        ao,
      };
    });

    // 5. Seine Embankment / Riverbank Heavy Weathered Quay Stone (`#c9c0ae`)
    out.quayStoneRiverbank = buildPbrMapTrioRaw(S_MED, 6.8, (u, v, x, y, size) => {
      const courses = 6;
      const blocks = 3;
      const cyF = v * courses;
      const course = Math.floor(cyF);
      const fy = cyF - course;
      const uShift = (u + (course % 2) * (0.5 / blocks)) % 1.0;
      const bxF = uShift * blocks;
      const blockIdx = Math.floor(bxF);
      const fx = bxF - blockIdx;

      const jointPx = Math.min(
        Math.min(fy, 1.0 - fy) * (size / courses),
        Math.min(fx, 1.0 - fx) * (size / blocks)
      );
      const bRand = hash2i(blockIdx, course, 809);
      const roughRock = tileValueNoise(u, v, 32, 821) * 0.55 + tileValueNoise(u, v, 128, 829) * 0.45;
      const streak = tileValueNoise(u * 2.0, v * 0.35, 16, 839); // Vertical rainwater weathering streaks

      let h = 0.68 + (bRand - 0.5) * 0.10 + roughRock * 0.22;
      let rough = clamp01(0.88 - roughRock * 0.08);
      let ao = clamp01(0.76 + roughRock * 0.24 - (1.0 - streak) * 0.12);
      let lum = 236 + (bRand - 0.5) * 28 + (roughRock - 0.5) * 22 - (1.0 - streak) * 18;

      if (jointPx < 2.6) {
        const jt = jointPx / 2.6;
        h = 0.08 + jt * 0.22;
        rough = 0.96;
        ao = 0.36 + jt * 0.25;
        lum = 182 + roughRock * 18;
      } else if (jointPx < 5.5) {
        const bev = smooth01((jointPx - 2.6) / 2.9);
        h = 0.30 + bev * (h - 0.30);
        ao = 0.60 + bev * (ao - 0.60);
      }

      return {
        h,
        albR: lum + 2,
        albG: lum,
        albB: lum - 3,
        rough,
        ao,
      };
    });

    // 6. Parisian Pavés de Grès / Macadam Street Paving (`#c9c4ba`)
    out.macadamStreet = buildPbrMapTrioRaw(S_MED, 5.8, (u, v) => {
      const rows = 12;
      const cols = 8;
      const ryF = v * rows;
      const row = Math.floor(ryF);
      const fy = ryF - row;
      const uShift = (u + (row % 2) * (0.5 / cols)) % 1.0;
      const cxF = uShift * cols;
      const col = Math.floor(cxF);
      const fx = cxF - col;

      const dx = Math.abs(fx - 0.5) * 2.0;
      const dy = Math.abs(fy - 0.5) * 2.0;
      const edge = Math.max(dx, dy);
      const grit = tileValueNoise(u, v, 128, 907);
      const settTone = hash2i(col, row, 919);

      // Crowned pillow top of worn sandstone sett
      const crown = clamp01(1.0 - (dx * dx * 0.65 + dy * dy * 0.75));
      let h = 0.32 + crown * 0.52 + grit * 0.12;
      let rough = clamp01(0.72 + (1.0 - crown) * 0.22 + (grit - 0.5) * 0.08);
      let ao = clamp01(0.62 + crown * 0.38);
      let lum = 236 + (settTone - 0.5) * 28 + crown * 12;

      if (edge > 0.84) {
        const jt = smooth01((edge - 0.84) / 0.16);
        h = h * (1.0 - jt) + (0.08 + grit * 0.10) * jt;
        rough = rough * (1.0 - jt) + 0.96 * jt;
        ao = ao * (1.0 - jt) + 0.42 * jt;
        lum = lum * (1.0 - jt) + 192 * jt;
      }

      return {
        h,
        albR: lum + 1,
        albG: lum,
        albB: lum - 2,
        rough,
        ao,
      };
    });

    // 7. Caisson Foundation Excavation Wet Earth & Alluvial River Gravel (`#787167`)
    out.excavationEarth = buildPbrMapTrioRaw(S_MED, 6.5, (u, v) => {
      const clods = tileCellularPebbles(u, v, 18, 1009, 0.92);
      const gravel = tileCellularPebbles(u, v, 52, 1021, 0.88);
      const mud = tileValueNoise(u, v, 32, 1033);
      const fine = tileValueNoise(u, v, 128, 1049);

      const h = 0.44 * clods.dome + 0.28 * gravel.dome + 0.18 * mud + 0.10 * fine;
      // Wet puddle/silt pockets in low spots drop roughness to 0.50!
      const wetness = smooth01((0.46 - h) * 3.2);
      const rough = clamp01(0.90 - wetness * 0.38 - gravel.dome * 0.08);
      const ao = clamp01(0.48 + 0.52 * (0.6 * clods.border + 0.4 * gravel.border));
      const lum = 232 + (h - 0.45) * 48 - wetness * 26;

      return {
        h,
        albR: lum + 4,
        albG: lum,
        albB: lum - 5,
        rough,
        ao,
      };
    });
  }

  if (doA) {
    // 8. 1889 Oiled French Oak Promenade Deck Planking (`#745f4b` — all Tower horizontal decks)
    out.oakDeckPlanks = buildPbrMapTrioRaw(S, 5.8, (u, v, x, y, size) => {
      const planks = 8; // 8 planks across 1.28 m = 0.16 m (16 cm) plank width
      const pyF = v * planks;
      const plankIdx = Math.floor(pyF);
      const fy = pyF - plankIdx; // [0..1] across plank width

      // Staggered butt-joint every ~2.40 m along plank length `u`
      const buttU = ((plankIdx * 0.37 + 0.19) % 1.0);
      const duButt = Math.min(Math.abs(u - buttU), 1.0 - Math.abs(u - buttU));
      const segId = u >= buttU ? 1 : 0;

      const boardRand = hash2i(plankIdx, segId, 1103);
      // Cathedral oak grain + fine longitudinal wood vessels + medullary rays
      const wave = Math.sin(u * Math.PI * 4.0 + plankIdx * 2.1) * 0.08;
      const ring = Math.sin((fy + wave - 0.5) * 26.0 + tileValueNoise(u * 0.5, v * 2.0, 16, 1117) * 4.5);
      const pores = tileValueNoise(u * 0.35, v * 3.0, 64, 1129);
      const fineFiber = tileValueNoise(u, v, 128, 1151);

      let h = 0.76 + (boardRand - 0.5) * 0.06 + ring * 0.055 + pores * 0.05 + fineFiber * 0.03;
      let rough = clamp01(0.62 - ring * 0.05 + (1.0 - pores) * 0.10 + (boardRand - 0.5) * 0.06);
      let ao = clamp01(0.86 + ring * 0.06 + pores * 0.08);
      let lum = 238 + (boardRand - 0.5) * 28 + ring * 11 + (pores - 0.5) * 14;

      // Longitudinal caulked plank seam groove
      const seamDistPx = Math.min(fy, 1.0 - fy) * (size / planks);
      const buttDistPx = duButt * size;

      if (seamDistPx < 1.8 || buttDistPx < 1.5) {
        h = 0.10;
        rough = 0.92;
        ao = 0.34;
        lum = 168;
      } else if (seamDistPx < 4.2 || buttDistPx < 3.4) {
        const bev = smooth01((Math.min(seamDistPx - 1.8, buttDistPx - 1.5)) / 2.2);
        h = 0.35 + bev * (h - 0.35);
        ao = 0.58 + bev * (ao - 0.58);
        lum = 206 + bev * (lum - 206);
      } else {
        // Twin countersunk iron deck-bolt heads flanking each butt-joint (`duButt * size` ~ 10 px)
        const boltDxPx = Math.abs(buttDistPx - 10.5);
        const boltY1Px = Math.abs(fy - 0.27) * (size / planks);
        const boltY2Px = Math.abs(fy - 0.73) * (size / planks);
        const boltMinY = Math.min(boltY1Px, boltY2Px);
        const boltR = Math.sqrt(boltDxPx * boltDxPx + boltMinY * boltMinY);
        if (boltR < 3.4) {
          if (boltR > 2.3) {
            // Countersunk recess ring
            h = 0.42;
            ao = 0.48;
            rough = 0.85;
            lum = 180;
          } else {
            // Domed iron bolt head
            const crown = Math.sqrt(clamp01(1.0 - (boltR / 2.3) ** 2));
            h = 0.62 + crown * 0.24;
            ao = 0.74;
            rough = 0.46;
            lum = 172 + crown * 22;
          }
        }
      }

      return {
        h,
        albR: lum + 5,
        albG: lum,
        albB: lum - 6,
        rough,
        ao,
      };
    });

    // 9. Fine Veined Limestone / Carrara Fountain Marble (`#e6e1d7`)
    out.marbleCarved = buildPbrMapTrioRaw(S_MED, 2.8, (u, v) => {
      const n1 = tileValueNoise(u, v, 8, 1201);
      const n2 = tileValueNoise(u, v, 32, 1213);
      const vein = Math.pow(clamp01(1.0 - Math.abs(Math.sin((u * 2.0 + v * 1.5 + n1 * 0.8) * Math.PI * 2.0))), 6.0);
      const cryst = tileValueNoise(u, v, 128, 1229);
      const h = 0.75 + cryst * 0.08 - vein * 0.06 + n2 * 0.05;
      const rough = clamp01(0.54 + vein * 0.14 + (cryst - 0.5) * 0.08);
      const ao = clamp01(0.90 - vein * 0.10 + cryst * 0.06);
      const lum = 244 - vein * 22 + (n2 - 0.5) * 10;
      return {
        h,
        albR: lum + 1,
        albG: lum,
        albB: lum - 1,
        rough,
        ao,
      };
    });

    // 10. Animated Multi-Wave Collodion Seine & Basin Ripple Normal Map (`256x256`)
    out.waterRipple = buildPbrMapTrioRaw(S_MED, 3.6, (u, v) => {
      const tau = Math.PI * 2.0;
      const w1 = Math.sin(u * tau * 3.0 + v * tau * 1.0);
      const w2 = Math.sin(u * tau * 5.0 - v * tau * 2.0 + 1.1);
      const w3 = Math.cos(u * tau * 2.0 + v * tau * 6.0 + 2.3);
      const w4 = tileValueNoise(u, v, 64, 1301) - 0.5;
      const h = 0.5 + 0.18 * w1 + 0.13 * w2 + 0.10 * w3 + 0.12 * w4;
      return {
        h,
        albR: 244,
        albG: 244,
        albB: 244,
        rough: clamp01(0.16 + Math.abs(w4) * 0.10),
        ao: 0.96,
      };
    });
  }

  return out;
}

export function synthesizeFloorTextureRawBank() {
  const bank = synthesizeFloorTextureRawBankPart('all');
  return {
    esplanadeGravel: bank.esplanadeGravel,
    alleeGravel: bank.alleeGravel,
    parterreTurf: bank.parterreTurf,
    ashlarMasonry: bank.ashlarMasonry,
    quayStoneRiverbank: bank.quayStoneRiverbank,
    macadamStreet: bank.macadamStreet,
    excavationEarth: bank.excavationEarth,
    oakDeckPlanks: bank.oakDeckPlanks,
    marbleCarved: bank.marbleCarved,
    waterRipple: bank.waterRipple,
  };
}

export function hydrateFloorTextureBank(THREE, rawBank, maxAniso = 8) {
  if (_cachedFloorTextureBank) return _cachedFloorTextureBank;
  if (!rawBank) return getFloorTextureBank(THREE, maxAniso);
  _cachedFloorTextureBank = {
    esplanadeGravel: wrapRawPbrTrio(THREE, rawBank.esplanadeGravel, maxAniso),
    alleeGravel: wrapRawPbrTrio(THREE, rawBank.alleeGravel, maxAniso),
    parterreTurf: wrapRawPbrTrio(THREE, rawBank.parterreTurf, maxAniso),
    ashlarMasonry: wrapRawPbrTrio(THREE, rawBank.ashlarMasonry, maxAniso),
    quayStoneRiverbank: wrapRawPbrTrio(THREE, rawBank.quayStoneRiverbank, maxAniso),
    macadamStreet: wrapRawPbrTrio(THREE, rawBank.macadamStreet, maxAniso),
    excavationEarth: wrapRawPbrTrio(THREE, rawBank.excavationEarth, maxAniso),
    oakDeckPlanks: wrapRawPbrTrio(THREE, rawBank.oakDeckPlanks, maxAniso),
    marbleCarved: wrapRawPbrTrio(THREE, rawBank.marbleCarved, maxAniso),
    waterRipple: wrapRawPbrTrio(THREE, rawBank.waterRipple, maxAniso),
  };
  return _cachedFloorTextureBank;
}

export function getFloorTextureBank(THREE, maxAniso = 8) {
  if (_cachedFloorTextureBank) return _cachedFloorTextureBank;
  return hydrateFloorTextureBank(THREE, synthesizeFloorTextureRawBank(), maxAniso);
}

// ---------------------------------------------------------------------------
// Composable World-Space Dual-Scale Stochastic Triplanar PBR Shader Injection
// ---------------------------------------------------------------------------

/**
 * Attaches world-space triplanar + dual-scale stochastic floor PBR sampling directly to a
 * `MeshStandardMaterial` / `MeshPhysicalMaterial`, reusing Three.js's bound `map`, `normalMap`,
 * and `roughnessMap` texture slots (zero UV-stretching on merged geometry, zero extra sampler units).
 *
 * Safely chains any pre-existing `material.onBeforeCompile` (such as sketch-fog's
 * radial distance mist) and optionally adds archival radial mist (`135m..880m`) if none is present.
 *
 * `specialMode`:
 *   - `0`: Standard world-space triplanar + optional dual-scale horizontal break-up
 *   - `1`: Esplanade Gravel — adds radial/square Château-Landon dressed-stone apron & curb joints
 *          around the 4 pier plinths (`[±51.9535, ±51.9535]`) + pier contact-shadow AO + axial wear
 *   - `2`: Riverbank / Quay / Bridge Stone — adds capillary dampness darkening & specular sheen drop
 *          near the Seine waterline (`Y <= -1.8 m`, river level `Y = -4.20 m`)
 */
export function attachWorldSurfacePbr(THREE, material, {
  pbrTrio,
  tileMeters = [1.80, 1.80],
  secondaryScaleRatio = 0.27, // Dual-scale stochastic second octave on horizontal floors (0 = off)
  albedoStrength = 0.92,
  normalStrength = 1.05,
  roughnessStrength = 0.95,
  aoStrength = 0.72,
  verticalGrain = false,
  specialMode = 0,
  enableRadialMist = false,
  mistInnerR = 135.0,
  mistOuterR = 880.0,
} = {}) {
  if (!material || !pbrTrio) return material;

  // Enforce strict Zero-Emissive & Real-Light-Only contract
  if (material.emissive) material.emissive.setHex(0x000000);
  material.emissiveIntensity = 0.0;
  material.emissiveMap = null;
  material.blending = THREE.NormalBlending;

  // Bind genuine Three.js PBR maps onto the material
  material.map = pbrTrio.albedoMap;
  material.normalMap = pbrTrio.normalMap;
  material.roughnessMap = pbrTrio.roughnessMap;
  material.normalScale = material.normalScale || new THREE.Vector2(1, 1);
  material.normalScale.set(normalStrength, normalStrength);

  const scaleVec = new THREE.Vector2(1.0 / tileMeters[0], 1.0 / tileMeters[1]);
  const hasOwnCompile = Object.prototype.hasOwnProperty.call(material, 'onBeforeCompile');
  const hasOwnKey = Object.prototype.hasOwnProperty.call(material, 'customProgramCacheKey');
  const prevCompile =
    hasOwnCompile && typeof material.onBeforeCompile === 'function' && !material.userData?.__s2FloorPbrAttached
      ? material.onBeforeCompile.bind(material)
      : null;
  const prevKeyFn =
    hasOwnKey && typeof material.customProgramCacheKey === 'function' && !material.userData?.__s2FloorPbrAttached
      ? material.customProgramCacheKey.bind(material)
      : null;

  const keySuffix = `s2_ws_pbr_u1_rm${enableRadialMist ? 1 : 0}`;
  material.customProgramCacheKey = () => (prevKeyFn ? `${prevKeyFn()}_${keySuffix}` : keySuffix);

  material.onBeforeCompile = (shader, renderer) => {
    if (prevCompile) {
      prevCompile(shader, renderer);
    }

    shader.uniforms.uPbrTileScale = { value: scaleVec };
    shader.uniforms.uPbrSecRatio = { value: secondaryScaleRatio };
    shader.uniforms.uPbrAlbedoStr = { value: albedoStrength };
    shader.uniforms.uPbrNormalStr = { value: normalStrength };
    shader.uniforms.uPbrRoughStr = { value: roughnessStrength };
    shader.uniforms.uPbrAoStr = { value: aoStrength };
    shader.uniforms.uPbrVertGrain = { value: verticalGrain ? 1.0 : 0.0 };
    shader.uniforms.uPbrSpecialMode = { value: Number(specialMode) || 0.0 };
    shader.uniforms.uPbrMistInnerR = { value: mistInnerR };
    shader.uniforms.uPbrMistOuterR = { value: mistOuterR };

    // Vertex: compute exact world position & world normal in isolated `vPbr*` namespace
    // (zero symbol collision with sketch-fog `vS2WorldPos` / `s2Wp`)
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

    const hasUpstreamRadialMist =
      shader.fragmentShader.includes('uMistInnerR') ||
      shader.fragmentShader.includes('s2CombinedMist') ||
      shader.fragmentShader.includes('vMuseumWorldXZ') ||
      shader.fragmentShader.includes('museumRadMist') ||
      shader.fragmentShader.includes('uRadialFog');

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
uniform float uPbrSpecialMode;
uniform float uPbrMistInnerR;
uniform float uPbrMistOuterR;
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

  vec2 pbrUvX = ( uPbrVertGrain > 0.5 ? vec2( pbrPos.y, pbrPos.z ) : vec2( pbrPos.z, pbrPos.y ) ) * uPbrTileScale;
  vec2 pbrUvY = vec2( pbrPos.x, pbrPos.z ) * uPbrTileScale;
  vec2 pbrUvZ = ( uPbrVertGrain > 0.5 ? vec2( pbrPos.y, pbrPos.x ) : vec2( pbrPos.x, pbrPos.y ) ) * uPbrTileScale;

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
    // Normalized around neutral 0.905 linear (244 sRGB) so material.color stays exact
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
    vec3 pbrDX = uPbrVertGrain > 0.5 ? vec3( 0.0, pbrNX.x, pbrNX.y ) : vec3( 0.0, pbrNX.y, pbrNX.x );
    vec3 pbrDY = vec3( pbrNY.x, 0.0, pbrNY.y );
    vec3 pbrDZ = uPbrVertGrain > 0.5 ? vec3( pbrNZ.y, pbrNZ.x, 0.0 ) : vec3( pbrNZ.x, pbrNZ.y, 0.0 );
    float pbrDistFade = 1.0 / ( 1.0 + 0.00018 * dot( vViewPosition, vViewPosition ) );
    pbrWorldDeltaN = ( pbrDX * pbrBW.x + pbrDY * pbrBW.y + pbrDZ * pbrBW.z ) * uPbrNormalStr * pbrDistFade;
  #endif

  if ( uPbrSpecialMode > 0.5 && uPbrSpecialMode < 1.5 ) {
    // Esplanade Gravel: Dressed Château-Landon stone apron & curb joints around the 4 pier plinths [±51.9535, ±51.9535]
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
    pbrRoughSample = clamp( pbrRoughSample - 0.04 * pbrAxialPath, 0.08, 1.0 );
  } else if ( uPbrSpecialMode > 1.5 ) {
    // Riverbank / Quay / Bridge Pier Stone: Capillary waterline dampness near Seine Y = -4.20 m
    float pbrWaterDamp = smoothstep( -1.55, -4.25, vPbrWorldPos.y );
    if ( pbrWaterDamp > 0.005 ) {
      pbrAlbedoMod *= mix( vec3( 1.0 ), vec3( 0.68, 0.69, 0.66 ), pbrWaterDamp );
      pbrRoughSample = mix( pbrRoughSample, 0.24, pbrWaterDamp * 0.88 );
      pbrAoSample *= mix( 1.0, 0.82, pbrWaterDamp );
    }
  }
}
diffuseColor.rgb *= pbrAlbedoMod * mix( 1.0, pbrAoSample, 0.42 );`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `float roughnessFactor = pbrRoughSample;`
      )
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

    if (enableRadialMist && !hasUpstreamRadialMist) {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <fog_fragment>',
        `#include <fog_fragment>
#ifdef USE_FOG
  float pbrRadR = length( vPbrWorldPos.xz );
  float pbrRadMist = pow( smoothstep( uPbrMistInnerR, uPbrMistOuterR, pbrRadR ), 0.85 );
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, pbrRadMist );
#endif`
      );
    }
  };

  material.userData = material.userData || {};
  material.userData.__s2FloorPbrAttached = true;
  material.userData.pbrTrio = pbrTrio;
  material.needsUpdate = true;
  return material;
}

// ---------------------------------------------------------------------------
// In-Place Upgrader for `paris_1889` World Floor, Ground, Quay & Context Meshes
// ---------------------------------------------------------------------------

/**
 * Traverses a `paris_1889` world group (or full `scene`) and upgrades all world floor,
 * esplanade, allée, parterre, stone plinth/curb/quay/riverbank, street, excavation earth,
 * marble, timber, roof, and water materials in-place with rich world-space PBR textures,
 * while preserving any existing `onBeforeCompile` radial mist hooks!
 */
export function upgradeWorldFloorAndSurfaceMaterials(worldRootOrObject, THREE, {
  maxAnisotropy = 8,
  preserveExistingColors = false,
} = {}) {
  const root = worldRootOrObject?.group || worldRootOrObject;
  if (!root || !THREE) return { upgradedMaterials: 0, upgradedMeshes: 0 };

  const bank = getFloorTextureBank(THREE, maxAnisotropy);
  const visitedMats = new Set();
  let upgradedMaterials = 0;
  let upgradedMeshes = 0;

  root.traverse((obj) => {
    if (!obj.isMesh && !obj.isInstancedMesh) return;
    // Ensure all ground, quay, bridge, and surrounding surfaces receive real cast shadows
    obj.receiveShadow = true;
    upgradedMeshes += 1;

    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      if (!mat || visitedMats.has(mat)) continue;
      visitedMats.add(mat);

      // Strictly enforce Zero-Emissive & Real-Light-Only contract on every world material
      if (mat.emissive) mat.emissive.setHex(0x000000);
      mat.emissiveIntensity = 0.0;
      mat.emissiveMap = null;
      mat.blending = THREE.NormalBlending;

      if (!mat.isMeshStandardMaterial && !mat.isMeshPhysicalMaterial) continue;
      const mName = String(mat.name || '').toLowerCase();
      // Preserve calibrated monochrome Collodion palette when worldSketchMist is present
      const keepColor = preserveExistingColors || Boolean(mat.userData?.worldSketchMist?.enabled);

      if (mName.includes('gravel')) {
        if (!keepColor) mat.color.setHex(0xdbd6cc);
        mat.roughness = 0.90;
        mat.metalness = 0.0;
        attachWorldSurfacePbr(THREE, mat, {
          pbrTrio: bank.esplanadeGravel,
          tileMeters: [1.45, 1.45],
          secondaryScaleRatio: 0.23,
          albedoStrength: 0.95,
          normalStrength: 1.18,
          roughnessStrength: 0.95,
          aoStrength: 0.78,
          specialMode: 1,
          enableRadialMist: true,
        });
        upgradedMaterials += 1;
      } else if (mName.includes('allee')) {
        if (!keepColor) mat.color.setHex(0xe2ddd3);
        mat.roughness = 0.88;
        mat.metalness = 0.0;
        attachWorldSurfacePbr(THREE, mat, {
          pbrTrio: bank.alleeGravel,
          tileMeters: [1.20, 1.20],
          secondaryScaleRatio: 0.29,
          albedoStrength: 0.88,
          normalStrength: 0.95,
          roughnessStrength: 0.90,
          aoStrength: 0.68,
          enableRadialMist: true,
        });
        upgradedMaterials += 1;
      } else if (mName.includes('parterre') || mName.includes('lawn') || mName.includes('turf')) {
        if (!keepColor) mat.color.setHex(0x8c887f);
        mat.roughness = 0.94;
        mat.metalness = 0.0;
        attachWorldSurfacePbr(THREE, mat, {
          pbrTrio: bank.parterreTurf,
          tileMeters: [1.35, 1.35],
          secondaryScaleRatio: 0.24,
          albedoStrength: 0.90,
          normalStrength: 1.02,
          roughnessStrength: 0.90,
          aoStrength: 0.76,
          enableRadialMist: true,
        });
        upgradedMaterials += 1;
      } else if (mName.includes('stone') || mName.includes('quay') || mName.includes('masonry_band')) {
        const isBand = mName.includes('band');
        if (!keepColor) mat.color.setHex(isBand ? 0xb6afa3 : 0xd2c8b4);
        mat.roughness = 0.84;
        mat.metalness = 0.02;
        attachWorldSurfacePbr(THREE, mat, {
          pbrTrio: isBand ? bank.quayStoneRiverbank : bank.ashlarMasonry,
          tileMeters: isBand ? [2.80, 2.40] : [3.52, 3.36],
          albedoStrength: 0.92,
          normalStrength: 1.14,
          roughnessStrength: 0.94,
          aoStrength: 0.82,
          specialMode: 2, // Waterline dampness on quays & bridge piers near Y = -4.20 m!
          enableRadialMist: true,
        });
        upgradedMaterials += 1;
      } else if (mName.includes('street') || mName.includes('macadam')) {
        if (!keepColor) mat.color.setHex(0xc9c4ba);
        mat.roughness = 0.84;
        mat.metalness = 0.01;
        attachWorldSurfacePbr(THREE, mat, {
          pbrTrio: bank.macadamStreet,
          tileMeters: [1.76, 1.76],
          albedoStrength: 0.90,
          normalStrength: 1.05,
          roughnessStrength: 0.92,
          aoStrength: 0.76,
          enableRadialMist: true,
        });
        upgradedMaterials += 1;
      } else if (mName.includes('earth')) {
        if (!keepColor) mat.color.setHex(0x787167);
        mat.roughness = 0.82;
        mat.metalness = 0.01;
        attachWorldSurfacePbr(THREE, mat, {
          pbrTrio: bank.excavationEarth,
          tileMeters: [1.90, 1.90],
          secondaryScaleRatio: 0.31,
          albedoStrength: 0.95,
          normalStrength: 1.22,
          roughnessStrength: 0.96,
          aoStrength: 0.84,
          enableRadialMist: true,
        });
        upgradedMaterials += 1;
      } else if (mName.includes('marble')) {
        if (!keepColor) mat.color.setHex(0xe6e1d7);
        mat.roughness = 0.58;
        mat.metalness = 0.02;
        attachWorldSurfacePbr(THREE, mat, {
          pbrTrio: bank.marbleCarved,
          tileMeters: [2.20, 2.20],
          albedoStrength: 0.85,
          normalStrength: 0.65,
          roughnessStrength: 0.85,
          aoStrength: 0.55,
          enableRadialMist: true,
        });
        upgradedMaterials += 1;
      } else if (mName.includes('world_wood') || mName.includes('bark')) {
        const isBark = mName.includes('bark');
        if (!keepColor) mat.color.setHex(isBark ? 0x4b4640 : 0x8f887e);
        mat.roughness = isBark ? 0.90 : 0.82;
        mat.metalness = 0.0;
        attachWorldSurfacePbr(THREE, mat, {
          pbrTrio: bank.oakDeckPlanks,
          tileMeters: [2.40, 1.28],
          albedoStrength: 0.85,
          normalStrength: 0.88,
          roughnessStrength: 0.88,
          aoStrength: 0.72,
          verticalGrain: true,
          enableRadialMist: true,
        });
        upgradedMaterials += 1;
      } else if (mName.includes('seine') || mName.includes('water')) {
        const isSeine = mName.includes('seine');
        if (!keepColor) mat.color.setHex(isSeine ? 0xb7b4ae : 0xaba8a1);
        mat.roughness = isSeine ? 0.16 : 0.18;
        mat.metalness = 0.08;
        mat.envMapIntensity = 1.25;
        attachWorldSurfacePbr(THREE, mat, {
          pbrTrio: bank.waterRipple,
          tileMeters: isSeine ? [9.5, 6.2] : [3.2, 3.2],
          secondaryScaleRatio: 0.37,
          albedoStrength: 0.14,
          normalStrength: isSeine ? 0.56 : 0.46,
          roughnessStrength: 0.65,
          aoStrength: 0.15,
          enableRadialMist: true,
        });
        upgradedMaterials += 1;
      } else if (mName.includes('wall_light') || mName.includes('wall_mid')) {
        // Subtle dressed-plaster / stone architectural relief on surrounding exhibition massing
        mat.roughness = 0.88;
        mat.metalness = 0.01;
        attachWorldSurfacePbr(THREE, mat, {
          pbrTrio: bank.ashlarMasonry,
          tileMeters: [4.40, 3.80],
          albedoStrength: 0.45,
          normalStrength: 0.55,
          roughnessStrength: 0.65,
          aoStrength: 0.45,
          enableRadialMist: true,
        });
        upgradedMaterials += 1;
      } else {
        // Elevate environment response on copper, antique bronze, iron, slate, opaline globes
        if (mName.includes('bronze') || mName.includes('gold')) {
          if (!keepColor) mat.color.setHex(0x8c8377);
          mat.roughness = 0.42;
          mat.metalness = 0.62;
          mat.envMapIntensity = 1.15;
        } else if (mName.includes('patina') || mName.includes('copper')) {
          if (!keepColor) mat.color.setHex(0x777870);
          mat.roughness = 0.52;
          mat.metalness = 0.42;
          mat.envMapIntensity = 0.95;
        } else if (mName.includes('expo_iron')) {
          if (!keepColor) mat.color.setHex(0x5c564f);
          mat.roughness = 0.56;
          mat.metalness = 0.52;
          mat.envMapIntensity = 0.95;
        } else if (mName.includes('slate')) {
          if (!keepColor) mat.color.setHex(0x807c75);
          mat.roughness = 0.72;
          mat.metalness = 0.10;
        } else if (mName.includes('globe')) {
          if (!keepColor) mat.color.setHex(0xebe6dc);
          mat.roughness = 0.30;
          mat.metalness = 0.0;
          mat.envMapIntensity = 0.95;
        }
        mat.needsUpdate = true;
      }
    }
  });

  return { upgradedMaterials, upgradedMeshes };
}
