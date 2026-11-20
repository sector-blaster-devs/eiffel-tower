/**
 * Elevated Archival PBR Material Library & Tower Surface Upgrader (`model/materials.js`)
 *
 *   - Archival Photography & Lemercier Vellum Palette (#5 & #8)
 *   - 100% Real Light Response Only (`emissive = 0x000000`, `emissiveIntensity = 0.0`, `0` AdditiveBlending)
 *   - High-definition `512x512` & `256x256` procedural PBR maps (analytic normal, cavity AO, roughness)
 *     via world-space triplanar sampling (`attachWorldSurfacePbr`) so UV-less `MeshBucket` iron girders,
 *     riveted gussets, ashlar plinths, timber scaffolds, copper cupola, gilt accents, elevator cabins,
 *     and all horizontal oak promenade decks (`isWoodDecking`) exhibit crisp close-up 3D relief.
 *   - Automatic embossed normal/roughness generation for UV-mapped `CanvasTexture` frieze plaques (72 scientists),
 *     `LE FIGARO` kiosk plaques, porcelain-enamel `DESCENTE`/`MONTÉE` signs, and `R.F. 1889` wool tricolore flag.
 */

import {
  attachWorldSurfacePbr,
  getFloorTextureBank,
} from './floor_textures.js';

let _cachedTowerPbrBank = null;
let _cachedTricoloreTex = null;
const _noiseGridCache = new Map();
const _embossedCanvasCache = new WeakMap();

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

function tileNoise(u, v, period, seed) {
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
  return (n00 + (n10 - n00) * sx) * (1 - sy) + (n01 + (n11 - n01) * sx) * sy;
}

function buildSurfaceTrioRaw(size, slopeScale, sampleFn) {
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

      roughAoBytes[o] = clampByte(clamp01(p.ao) * 255);
      roughAoBytes[o + 1] = clampByte(clamp01(p.rough) * 255);
      roughAoBytes[o + 2] = clampByte(clamp01(p.sheen ?? 0.5) * 255);
      roughAoBytes[o + 3] = 255;
    }
  }

  const targetMean = 244.0;
  const gainR = targetMean / Math.max(64.0, sumR / N);
  const gainG = targetMean / Math.max(64.0, sumG / N);
  const gainB = targetMean / Math.max(64.0, sumB / N);
  for (let i = 0; i < N * 4; i += 4) {
    albedoBytes[i] = clampByte(albedoBytes[i] * gainR);
    albedoBytes[i + 1] = clampByte(albedoBytes[i + 1] * gainG);
    albedoBytes[i + 2] = clampByte(albedoBytes[i + 2] * gainB);
  }

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

function wrapSurfaceTrio(THREE, raw, maxAniso) {
  const { size, albedoBytes, normalBytes, roughAoBytes } = raw;
  const mk = (bytes, srgb) => {
    const tex = new THREE.DataTexture(bytes, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    if (srgb && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    else if (THREE.NoColorSpace) tex.colorSpace = THREE.NoColorSpace;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = maxAniso;
    tex.needsUpdate = true;
    return tex;
  };

  return {
    albedoMap: mk(albedoBytes, true),
    normalMap: mk(normalBytes, false),
    roughnessMap: mk(roughAoBytes, false),
  };
}

function makeTricoloreRaw() {
  const w = 384;
  const h = 256;
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 234;
      let g = 229;
      let b = 220;
      if (x < 128) {
        r = 47; g = 59; b = 70;
      } else if (x >= 256) {
        r = 125; g = 61; b = 51;
      }
      const weave = (((x + y) & 3) < 2 ? 4 : -4) + (hash2i(x, y, 3001) - 0.5) * 8;
      const seam = Math.abs(x - 128) <= 1 || Math.abs(x - 256) <= 1 ? -14 : 0;
      const border = x <= 1 || x >= w - 2 || y <= 1 || y >= h - 2 ? -18 : 0;
      const o = (y * w + x) * 4;
      data[o] = clampByte(r + weave + seam + border);
      data[o + 1] = clampByte(g + weave + seam + border);
      data[o + 2] = clampByte(b + weave + seam + border);
      data[o + 3] = 255;
    }
  }
  return { w, h, data };
}

function wrapTricoloreTexture(THREE, raw) {
  const { w, h, data } = raw;
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
  if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

export function synthesizeTowerPbrRawBank() {
  // 1. 1889 Pompey Puddled Wrought Iron (`512x512`): fibrous rolling streaks, 0.80m plate lap seams
  //    & crisp double-row hemispherical hot-driven rivet heads (`32 mm` pitch)
  const puddledIron = buildSurfaceTrioRaw(512, 6.2, (u, v, x, y, size) => {
    const half = size >> 1; // 256 px = 0.80 m plate module
    const px = x % half;
    const py = y % half;
    const plateId = (Math.floor(x / half) * 3 + Math.floor(y / half)) % 4;
    const plateTone = (hash2i(plateId, 1, 2003) - 0.5) * 14.0;

    // Fibrous puddled-iron rolling slag streaks + brushed rouge-de-Venise paint coat micro-texture
    const rollGrain = tileNoise(u * 0.5, v * 4.0, 64, 2011) * 0.6 + tileNoise(u, v * 8.0, 128, 2027) * 0.4;
    const microPit = tileNoise(u, v, 256, 2039);

    let h = 0.52 + (rollGrain - 0.5) * 0.08 + (microPit - 0.5) * 0.05;
    let rough = clamp01(0.56 - (rollGrain - 0.5) * 0.12 + (0.5 - microPit) * 0.08);
    let ao = clamp01(0.88 + (rollGrain - 0.5) * 0.08);
    let lum = 242 + plateTone + (rollGrain - 0.5) * 18;

    const seamDistX = Math.min(px, half - px);
    const seamDistY = Math.min(py, half - py);
    const minSeam = Math.min(seamDistX, seamDistY);

    if (minSeam < 2.2) {
      // Recessed spliced gusset-plate lap seam
      const st = minSeam / 2.2;
      h = 0.14 + st * 0.24;
      rough = 0.76;
      ao = 0.40 + st * 0.28;
      lum = 198 + st * 22;
    } else if (minSeam < 4.5) {
      // Burnished plate edge bevel catching rim light
      const bt = smooth01((minSeam - 2.2) / 2.3);
      h = 0.62 - bt * 0.10;
      rough = 0.40 + bt * (rough - 0.40);
      lum += (1.0 - bt) * 12;
    } else {
      // Double staggered rows of raised hemispherical rivets along plate borders (offset 11 px & 22 px, pitch 16 px)
      const rivetPitch = 16;
      let minRivRSq = 9801.0;

      if (seamDistX < 28) {
        const rx0 = seamDistX - 11.0;
        const ry0 = (y & 15) - 8.0;
        const d0 = rx0 * rx0 + ry0 * ry0;
        if (d0 < minRivRSq) minRivRSq = d0;
        const rx1 = seamDistX - 22.0;
        const ry1 = ((y + 8) & 15) - 8.0;
        const d1 = rx1 * rx1 + ry1 * ry1;
        if (d1 < minRivRSq) minRivRSq = d1;
      }
      if (seamDistY < 28) {
        const ry0 = seamDistY - 11.0;
        const rx0 = (x & 15) - 8.0;
        const d0 = rx0 * rx0 + ry0 * ry0;
        if (d0 < minRivRSq) minRivRSq = d0;
        const ry1 = seamDistY - 22.0;
        const rx1 = ((x + 8) & 15) - 8.0;
        const d1 = rx1 * rx1 + ry1 * ry1;
        if (d1 < minRivRSq) minRivRSq = d1;
      }

      if (minRivRSq < 23.04) {
        const minRivR = Math.sqrt(minRivRSq);
        if (minRivR > 3.6) {
          // Caulking collar shadow ring around rivet base
          const ct = (minRivR - 3.6) / 1.2;
          h = 0.40 + ct * 0.12;
          ao = 0.46 + ct * 0.42;
          rough = 0.70;
          lum = 212 + ct * 28;
        } else {
          // Raised hemispherical hot-driven rivet dome (`h` up to 0.98!)
          const nr = minRivR / 3.6;
          const dome = Math.sqrt(clamp01(1.0 - nr * nr));
          h = 0.54 + dome * 0.44;
          ao = 0.78 + dome * 0.22;
          rough = clamp01(0.46 - dome * 0.12); // Slightly burnished rivet crown!
          lum = 236 + dome * 20;
        }
      }
    }

    return {
      h,
      albR: lum + 2,
      albG: lum,
      albB: lum - 2,
      rough,
      ao,
    };
  });

  // 2. Sand-Cast Iron Shoes, Saddles & Counterweights (`256x256`)
  const castIron = buildSurfaceTrioRaw(256, 4.8, (u, v) => {
    const sandSkin = tileNoise(u, v, 128, 2111) * 0.65 + tileNoise(u, v, 32, 2129) * 0.35;
    const rib = Math.abs((v * 4.0) % 1.0 - 0.5) < 0.03 ? 1.0 : 0.0;
    const h = 0.50 + (sandSkin - 0.5) * 0.22 + rib * 0.18;
    const rough = clamp01(0.50 - (sandSkin - 0.5) * 0.14);
    const ao = clamp01(0.78 + sandSkin * 0.22);
    const lum = 240 + (sandSkin - 0.5) * 26 + rib * 10;
    return { h, albR: lum, albG: lum, albB: lum, rough, ao };
  });

  // 3. Machined Hydraulic Steel Rams & Forged Crane Frames (`256x256`)
  const forgedSteel = buildSurfaceTrioRaw(256, 3.8, (u, v) => {
    const lathe = 0.5 + 0.5 * Math.sin(v * Math.PI * 64.0 + tileNoise(u, v, 16, 2203) * 1.4);
    const oilFilm = tileNoise(u, v, 32, 2213);
    const h = 0.52 + (lathe - 0.5) * 0.10 + (oilFilm - 0.5) * 0.06;
    const rough = clamp01(0.42 + (0.5 - oilFilm) * 0.14 + (1.0 - lathe) * 0.05);
    const ao = clamp01(0.88 + lathe * 0.10);
    const lum = 242 + (lathe - 0.5) * 14;
    return { h, albR: lum, albG: lum, albB: lum + 1, rough, ao };
  });

  // 4. Boulogne Hydraulic-Lime Concrete Foundation Massifs (`256x256`)
  const concreteMassif = buildSurfaceTrioRaw(256, 5.6, (u, v, x, y, size) => {
    const lifts = 8; // 0.30 m shuttering compaction lifts
    const lyF = v * lifts;
    const liftIdx = Math.floor(lyF);
    const fy = lyF - liftIdx;
    const liftDistPx = Math.min(fy, 1.0 - fy) * (size / lifts);

    const agg = tileNoise(u, v, 128, 2309) * 0.55 + tileNoise(u, v, 32, 2333) * 0.45;
    const boardGrain = Math.sin(u * Math.PI * 16.0 + liftIdx * 1.7) * 0.04;

    let h = 0.62 + (agg - 0.5) * 0.26 + boardGrain;
    let rough = clamp01(0.92 - (agg - 0.5) * 0.10);
    let ao = clamp01(0.74 + agg * 0.24);
    let lum = 240 + (agg - 0.5) * 32 + (hash2i(liftIdx, 3, 2347) - 0.5) * 12;

    if (liftDistPx < 2.0) {
      h = 0.18;
      ao = 0.44;
      rough = 0.97;
      lum = 196;
    }
    return { h, albR: lum + 1, albG: lum, albB: lum - 2, rough, ao };
  });

  // 5. Oiled Oak / Varnished Burgundy-Russet Joinery Paneling (`256x256`)
  const woodJoinery = buildSurfaceTrioRaw(256, 4.6, (u, v, x, y, size) => {
    const boards = 8;
    const pyF = v * boards;
    const bIdx = Math.floor(pyF);
    const fy = pyF - bIdx;
    const seamPx = Math.min(fy, 1.0 - fy) * (size / boards);
    const bRand = hash2i(bIdx, 7, 2411);
    const grain =
      Math.sin((fy - 0.5) * 22.0 + tileNoise(u * 0.5, v * 2.0, 16, 2423) * 4.0) * 0.5 +
      tileNoise(u, v * 3.0, 64, 2437) * 0.5;

    let h = 0.72 + (bRand - 0.5) * 0.06 + grain * 0.09;
    let rough = clamp01(0.56 - grain * 0.08 + (bRand - 0.5) * 0.06);
    let ao = clamp01(0.86 + grain * 0.10);
    let lum = 240 + (bRand - 0.5) * 22 + (grain - 0.5) * 18;

    if (seamPx < 1.5) {
      h = 0.18;
      ao = 0.42;
      rough = 0.86;
      lum = 186;
    }
    return { h, albR: lum + 3, albG: lum, albB: lum - 4, rough, ao };
  });

  // 6. Rough-Sawn Pine Temporary Falsework Scaffolds (`256x256`)
  const scaffoldPine = buildSurfaceTrioRaw(256, 5.4, (u, v, x, y, size) => {
    const beams = 6;
    const pyF = v * beams;
    const bIdx = Math.floor(pyF);
    const fy = pyF - bIdx;
    const seamPx = Math.min(fy, 1.0 - fy) * (size / beams);
    const bRand = hash2i(bIdx, 9, 2503);
    const kerf = Math.sin(u * Math.PI * 72.0 + tileNoise(u, v, 16, 2521) * 2.5) * 0.06;
    const grain = tileNoise(u * 0.4, v * 2.5, 32, 2531);

    let h = 0.66 + (bRand - 0.5) * 0.08 + grain * 0.14 + kerf;
    let rough = clamp01(0.88 - grain * 0.08);
    let ao = clamp01(0.78 + grain * 0.18);
    let lum = 240 + (bRand - 0.5) * 26 + (grain - 0.5) * 22;

    if (seamPx < 1.6) {
      h = 0.14;
      ao = 0.38;
      rough = 0.95;
      lum = 182;
    }
    return { h, albR: lum + 3, albG: lum + 1, albB: lum - 4, rough, ao };
  });

  // 7. Standing-Seam Patinated Copper / Zinc Cupola (`256x256`)
  const patinatedCopper = buildSurfaceTrioRaw(256, 4.5, (u, v, x, y, size) => {
    const seams = 8;
    const sxF = u * seams;
    const sIdx = Math.floor(sxF);
    const fx = sxF - sIdx;
    const ribDistPx = Math.min(fx, 1.0 - fx) * (size / seams);
    const patina = tileNoise(u, v, 32, 2609) * 0.6 + tileNoise(u, v, 128, 2617) * 0.4;

    let h = 0.54 + (patina - 0.5) * 0.10;
    let rough = clamp01(0.46 + (patina - 0.5) * 0.18);
    let ao = clamp01(0.86 + patina * 0.12);
    let lum = 242 + (patina - 0.5) * 24 + (hash2i(sIdx, 1, 2633) - 0.5) * 10;

    if (ribDistPx < 2.2) {
      // Raised standing batten seam
      const rt = 1.0 - ribDistPx / 2.2;
      h = 0.68 + rt * 0.26;
      rough = 0.36;
      lum += rt * 14;
    } else if (ribDistPx < 4.0) {
      ao = 0.64;
    }
    return { h, albR: lum - 1, albG: lum + 2, albB: lum, rough, ao };
  });

  // 8. Hammered Antique Ochre-Gilt Leaf (`256x256`)
  const hammeredGilt = buildSurfaceTrioRaw(256, 3.2, (u, v) => {
    const leafGrid = Math.min(
      Math.min((u * 8) % 1, 1 - ((u * 8) % 1)),
      Math.min((v * 8) % 1, 1 - ((v * 8) % 1))
    );
    const hammer = tileNoise(u, v, 32, 2707) * 0.65 + tileNoise(u, v, 96, 2719) * 0.35;
    const lap = leafGrid < 0.04 ? 0.05 : 0.0;
    const h = 0.58 + (hammer - 0.5) * 0.12 + lap;
    const rough = clamp01(0.38 + (0.5 - hammer) * 0.14);
    const ao = clamp01(0.90 + hammer * 0.10);
    const lum = 244 + (hammer - 0.5) * 16 + lap * 90;
    return { h, albR: lum + 2, albG: lum, albB: lum - 3, rough, ao };
  });

  // 9. Mouth-Blown 1889 Cylinder Crown-Glass Gentle Wave Normal (`128x128`)
  const crownGlassWave = buildSurfaceTrioRaw(128, 1.6, (u, v) => {
    const tau = Math.PI * 2.0;
    const w =
      0.5 +
      0.22 * Math.sin(u * tau * 2.0 + v * tau * 1.0) +
      0.16 * Math.cos(u * tau * 1.0 - v * tau * 3.0 + 0.7) +
      0.12 * (tileNoise(u, v, 16, 2801) - 0.5);
    return { h: w, albR: 244, albG: 244, albB: 244, rough: 0.10, ao: 1.0 };
  });

  // 10. Woven Wool Bunting & Canvas Awning Duck (`256x256`)
  const wovenFabric = buildSurfaceTrioRaw(256, 4.2, (u, v, x, y) => {
    const warp = 0.5 + 0.5 * Math.sin(x * Math.PI * 0.5);
    const weft = 0.5 + 0.5 * Math.sin(y * Math.PI * 0.5);
    const twill = ((x + y) & 3) < 2 ? warp : weft;
    const ripple = 0.5 + 0.5 * Math.sin(u * Math.PI * 4.0 + v * Math.PI * 2.0);
    const fuzz = tileNoise(u, v, 128, 2903);
    const h = 0.45 + twill * 0.24 + ripple * 0.18 + fuzz * 0.10;
    const rough = clamp01(0.84 + (0.5 - twill) * 0.10);
    const ao = clamp01(0.72 + twill * 0.24);
    const lum = 240 + (twill - 0.5) * 20;
    return { h, albR: lum, albG: lum, albB: lum, rough, ao };
  });

  const tricolore = makeTricoloreRaw();

  return {
    puddledIron,
    castIron,
    forgedSteel,
    concreteMassif,
    woodJoinery,
    scaffoldPine,
    patinatedCopper,
    hammeredGilt,
    crownGlassWave,
    wovenFabric,
    tricolore,
  };
}

export function hydrateTowerPbrBank(THREE, rawBank, maxAniso = 8) {
  if (_cachedTowerPbrBank) return _cachedTowerPbrBank;
  if (!rawBank) return getTowerPbrBank(THREE, maxAniso);
  _cachedTowerPbrBank = {
    puddledIron: wrapSurfaceTrio(THREE, rawBank.puddledIron, maxAniso),
    castIron: wrapSurfaceTrio(THREE, rawBank.castIron, maxAniso),
    forgedSteel: wrapSurfaceTrio(THREE, rawBank.forgedSteel, maxAniso),
    concreteMassif: wrapSurfaceTrio(THREE, rawBank.concreteMassif, maxAniso),
    woodJoinery: wrapSurfaceTrio(THREE, rawBank.woodJoinery, maxAniso),
    scaffoldPine: wrapSurfaceTrio(THREE, rawBank.scaffoldPine, maxAniso),
    patinatedCopper: wrapSurfaceTrio(THREE, rawBank.patinatedCopper, maxAniso),
    hammeredGilt: wrapSurfaceTrio(THREE, rawBank.hammeredGilt, maxAniso),
    crownGlassWave: wrapSurfaceTrio(THREE, rawBank.crownGlassWave, maxAniso),
    wovenFabric: wrapSurfaceTrio(THREE, rawBank.wovenFabric, maxAniso),
  };
  if (rawBank.tricolore && !_cachedTricoloreTex) {
    _cachedTricoloreTex = wrapTricoloreTexture(THREE, rawBank.tricolore);
  }
  return _cachedTowerPbrBank;
}

function getTowerPbrBank(THREE, maxAniso = 8) {
  if (_cachedTowerPbrBank) return _cachedTowerPbrBank;
  return hydrateTowerPbrBank(THREE, synthesizeTowerPbrRawBank(), maxAniso);
}

function makeTricoloreTexture(THREE) {
  if (_cachedTricoloreTex) return _cachedTricoloreTex;
  _cachedTricoloreTex = wrapTricoloreTexture(THREE, makeTricoloreRaw());
  return _cachedTricoloreTex;
}

/**
 * Derives an embossed tangent-space `normalMap` + metallic/vitreous `roughnessMap`
 * from an existing 2D `CanvasTexture` (such as the 72 scientist frieze plaques,
 * `LE FIGARO` kiosk plaques, porcelain-enamel `DESCENTE` signs, or `R.F. 1889` flag).
 */
function attachEmbossedReliefToCanvasMaterial(THREE, mat, {
  heightScale = 2.8,
  brightIsRaised = true,
  raisedRoughness = 0.34,
  baseRoughness = 0.62,
} = {}) {
  if (!mat || !mat.map || !mat.map.image || mat.userData?.__s2EmbossedAttached) return;
  const img = mat.map.image;
  const w = Number(img.width) || 0;
  const h = Number(img.height) || 0;
  if (w < 8 || h < 8 || typeof img.getContext !== 'function') return;

  let cachedPair = _embossedCanvasCache.get(mat.map);
  if (!cachedPair) {
    const ctx = img.getContext('2d');
    if (!ctx) return;
    let src;
    try {
      src = ctx.getImageData(0, 0, w, h).data;
    } catch {
      return;
    }

    const total = w * h;
    const lum = new Float32Array(total);
    const roughBytes = new Uint8Array(total * 4);
    const normBytes = new Uint8Array(total * 4);
    // Flat tangent-space normal `[128, 128, 255, 255]` (`0xffff8080` in little-endian RGBA)
    new Uint32Array(normBytes.buffer).fill(0xffff8080);

    const rSpan = raisedRoughness - baseRoughness;
    for (let i = 0; i < total; i++) {
      const o = i << 2;
      const l = (0.299 * src[o] + 0.587 * src[o + 1] + 0.114 * src[o + 2]) * (1.0 / 255.0);
      const hVal = brightIsRaised ? l : 1.0 - l;
      lum[i] = hVal;
      const rVal = baseRoughness + rSpan * smooth01((hVal - 0.35) * 2.5);
      roughBytes[o] = 240;
      roughBytes[o + 1] = clampByte(rVal * 255);
      roughBytes[o + 2] = 255;
      roughBytes[o + 3] = 255;
    }

    for (let y = 0; y < h; y++) {
      const ymOff = (y === 0 ? 0 : y - 1) * w;
      const ycOff = y * w;
      const ypOff = (y + 1 === h ? h - 1 : y + 1) * w;
      for (let x = 0; x < w; x++) {
        const xm = x === 0 ? 0 : x - 1;
        const xp = x + 1 === w ? w - 1 : x + 1;
        const dlx = lum[ycOff + xp] - lum[ycOff + xm];
        const dly = lum[ypOff + x] - lum[ymOff + x];
        if (dlx === 0 && dly === 0) continue;
        const nx = -dlx * heightScale;
        const ny = dly * heightScale; // Canvas Y is top-down vs UV V bottom-up
        const inv = 1.0 / Math.sqrt(nx * nx + ny * ny + 1.0);
        const o = (ycOff + x) << 2;
        normBytes[o] = clampByte((nx * inv * 0.5 + 0.5) * 255);
        normBytes[o + 1] = clampByte((ny * inv * 0.5 + 0.5) * 255);
        normBytes[o + 2] = clampByte((inv * 0.5 + 0.5) * 255);
      }
    }

    const nTex = new THREE.DataTexture(normBytes, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
    if (THREE.NoColorSpace) nTex.colorSpace = THREE.NoColorSpace;
    nTex.flipY = mat.map.flipY;
    nTex.generateMipmaps = true;
    nTex.minFilter = THREE.LinearMipmapLinearFilter;
    nTex.magFilter = THREE.LinearFilter;
    nTex.anisotropy = 8;
    nTex.needsUpdate = true;

    const rTex = new THREE.DataTexture(roughBytes, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
    if (THREE.NoColorSpace) rTex.colorSpace = THREE.NoColorSpace;
    rTex.flipY = mat.map.flipY;
    rTex.generateMipmaps = true;
    rTex.minFilter = THREE.LinearMipmapLinearFilter;
    rTex.magFilter = THREE.LinearFilter;
    rTex.anisotropy = 8;
    rTex.needsUpdate = true;

    cachedPair = { nTex, rTex };
    _embossedCanvasCache.set(mat.map, cachedPair);
  }

  mat.normalMap = cachedPair.nTex;
  mat.normalScale = new THREE.Vector2(0.85, 0.85);
  mat.roughnessMap = cachedPair.rTex;
  mat.roughness = 1.0; // Driven directly by rTex.g (`raisedRoughness` .. `baseRoughness`)
  if (mat.map) {
    mat.map.anisotropy = 8;
    mat.map.needsUpdate = true;
  }
  if (mat.emissive) mat.emissive.setHex(0x000000);
  mat.emissiveIntensity = 0.0;
  mat.emissiveMap = null;
  mat.userData = mat.userData || {};
  mat.userData.__s2EmbossedAttached = true;
  mat.needsUpdate = true;
}

// ---------------------------------------------------------------------------
// Primary Material Factory (100% Drop-In Compatible with `model/materials.js`)
// ---------------------------------------------------------------------------

export function createMaterials(THREE, { maxAnisotropy = 8 } = {}) {
  const towerBank = getTowerPbrBank(THREE, maxAnisotropy);
  const floorBank = getFloorTextureBank(THREE, maxAnisotropy);
  const tricoloreTex = makeTricoloreTexture(THREE);

  const mkTowerTri = (name, color, roughness, metalness, envMapIntensity, side, triOpts) => {
    const mat = new THREE.MeshStandardMaterial({
      name,
      color,
      roughness,
      metalness,
      envMapIntensity,
      side,
    });
    return attachWorldSurfacePbr(THREE, mat, {
      enableRadialMist: false,
      ...triOpts,
    });
  };

  // 1. Structural Puddled Wrought Iron Trio (Rouge de Venise 1889 — #25, #64, #18, #51, #36)
  const ironPrimary = mkTowerTri('ironPrimary', 0x5a473a, 0.54, 0.42, 1.05, THREE.DoubleSide, {
    pbrTrio: towerBank.puddledIron,
    tileMeters: [1.60, 1.60],
    albedoStrength: 0.72,
    normalStrength: 1.08,
    roughnessStrength: 0.90,
    aoStrength: 0.76,
  });

  const ironLattice = mkTowerTri('ironLattice', 0x685746, 0.56, 0.38, 1.02, THREE.DoubleSide, {
    pbrTrio: towerBank.puddledIron,
    tileMeters: [1.60, 1.60],
    albedoStrength: 0.68,
    normalStrength: 0.96,
    roughnessStrength: 0.88,
    aoStrength: 0.72,
  });

  const ironSecondary = mkTowerTri('ironSecondary', 0x44372f, 0.58, 0.46, 1.05, THREE.DoubleSide, {
    pbrTrio: towerBank.puddledIron,
    tileMeters: [1.60, 1.60],
    albedoStrength: 0.70,
    normalStrength: 1.02,
    roughnessStrength: 0.88,
    aoStrength: 0.76,
  });

  // 2. Cast-Iron Shoes, Saddles & Counterweights (#09, #13, #38)
  const ironCast = mkTowerTri('ironCast', 0x2b2927, 0.48, 0.58, 1.10, THREE.DoubleSide, {
    pbrTrio: towerBank.castIron,
    tileMeters: [1.10, 1.10],
    albedoStrength: 0.62,
    normalStrength: 0.88,
    roughnessStrength: 0.85,
    aoStrength: 0.68,
  });

  // 3. Forged Creeper-Crane Frames, Hydraulic Rams & Chains (#09, #14)
  const craneSteel = mkTowerTri('craneSteel', 0x3c3a38, 0.46, 0.60, 1.15, THREE.DoubleSide, {
    pbrTrio: towerBank.forgedSteel,
    tileMeters: [1.20, 1.20],
    albedoStrength: 0.55,
    normalStrength: 0.78,
    roughnessStrength: 0.85,
    aoStrength: 0.60,
  });

  // 4. Château-Landon & Souppes Dressed Ashlar Masonry Plinths (#69, #09, #38)
  const masonryAshlar = mkTowerTri('masonryAshlar', 0xd2c8b4, 0.84, 0.02, 0.85, THREE.FrontSide, {
    pbrTrio: floorBank.ashlarMasonry,
    tileMeters: [3.52, 3.36],
    albedoStrength: 0.94,
    normalStrength: 1.16,
    roughnessStrength: 0.94,
    aoStrength: 0.84,
  });

  // 5. Boulogne-Cement Submerged Foundation Massifs (#63, #13)
  const concreteSub = mkTowerTri('concreteSub', 0x9c9589, 0.92, 0.00, 0.72, THREE.FrontSide, {
    pbrTrio: towerBank.concreteMassif,
    tileMeters: [2.40, 2.40],
    albedoStrength: 0.88,
    normalStrength: 1.05,
    roughnessStrength: 0.90,
    aoStrength: 0.78,
  });

  // 6. Oiled Oak Pavilion Joinery (`woodPavilion`) & Dedicated Horizontal Promenade Planking (`oakDeckPlanks`)
  const woodPavilion = mkTowerTri('woodPavilion', 0x76614d, 0.68, 0.04, 0.90, THREE.DoubleSide, {
    pbrTrio: towerBank.woodJoinery,
    tileMeters: [2.20, 1.28],
    albedoStrength: 0.88,
    normalStrength: 0.96,
    roughnessStrength: 0.90,
    aoStrength: 0.76,
    verticalGrain: true,
  });

  const oakDeckPlanks = mkTowerTri('oakDeckPlanks', 0x745f4b, 0.64, 0.03, 0.92, THREE.DoubleSide, {
    pbrTrio: floorBank.oakDeckPlanks,
    tileMeters: [2.40, 1.28],
    albedoStrength: 0.95,
    normalStrength: 1.16,
    roughnessStrength: 0.95,
    aoStrength: 0.84,
  });

  // 7. Pale Pine Temporary Falsework Scaffolds (#51, #23, #14)
  const woodTimberTemp = mkTowerTri('woodTimberTemp', 0xb8ab96, 0.86, 0.00, 0.75, THREE.DoubleSide, {
    pbrTrio: towerBank.scaffoldPine,
    tileMeters: [2.88, 1.80],
    albedoStrength: 0.90,
    normalStrength: 1.04,
    roughnessStrength: 0.90,
    aoStrength: 0.78,
    verticalGrain: true,
  });

  // 8. Varnished Burgundy-Russet Elevator Cabins (`#5e3d31`, Spec §2.2 — Otis, Combaluzier, Édoux)
  const elevatorCabinRed = attachWorldSurfacePbr(
    THREE,
    new THREE.MeshPhysicalMaterial({
      name: 'elevatorCabinRed',
      color: 0x5e3d31,
      roughness: 0.52,
      metalness: 0.18,
      clearcoat: 0.28,
      clearcoatRoughness: 0.22,
      envMapIntensity: 1.05,
      side: THREE.DoubleSide,
    }),
    {
      pbrTrio: towerBank.woodJoinery,
      tileMeters: [1.80, 1.10],
      albedoStrength: 0.76,
      normalStrength: 0.82,
      roughnessStrength: 0.85,
      aoStrength: 0.72,
      verticalGrain: true,
      enableRadialMist: false,
    }
  );

  // 9. 1889 Mouth-Blown Silver-Celadon Crown Glass (`0` emissive, physical Fresnel & clearcoat)
  const glass1889 = new THREE.MeshPhysicalMaterial({
    name: 'glass1889',
    color: 0xcfd4d0,
    transparent: true,
    opacity: 0.36,
    roughness: 0.10,
    metalness: 0.02,
    ior: 1.52,
    reflectivity: 0.72,
    clearcoat: 0.45,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.35,
    normalMap: towerBank.crownGlassWave.normalMap,
    normalScale: new THREE.Vector2(0.18, 0.18),
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  glass1889.emissive.setHex(0x000000);
  glass1889.emissiveIntensity = 0.0;

  // 10. Opaline Milk-Glass Gasolier & Promenade Globes (`0` emissive; lit strictly by real PointLights!)
  const lampGlobe1889 = new THREE.MeshPhysicalMaterial({
    name: 'lampGlobe1889',
    color: 0xebe6dc,
    transparent: true,
    opacity: 0.88,
    roughness: 0.28,
    metalness: 0.00,
    ior: 1.48,
    reflectivity: 0.58,
    clearcoat: 0.55,
    clearcoatRoughness: 0.14,
    sheen: 0.38,
    sheenRoughness: 0.42,
    sheenColor: new THREE.Color(0xfff6e5),
    envMapIntensity: 1.10,
    normalMap: towerBank.crownGlassWave.normalMap,
    normalScale: new THREE.Vector2(0.10, 0.10),
    side: THREE.DoubleSide,
  });
  lampGlobe1889.emissive.setHex(0x000000);
  lampGlobe1889.emissiveIntensity = 0.0;

  // 11. Patinated Sage-Slate Copper / Zinc Cupola (#69, #25, #59)
  const copperDome = mkTowerTri('copperDome', 0x6a6f65, 0.46, 0.45, 1.08, THREE.DoubleSide, {
    pbrTrio: towerBank.patinatedCopper,
    tileMeters: [2.40, 2.40],
    albedoStrength: 0.78,
    normalStrength: 0.92,
    roughnessStrength: 0.88,
    aoStrength: 0.70,
  });

  // 12. Muted Antique Ochre-Gilt Leaf (`0` emissive — gleams strictly under real lights & PMREM!)
  const goldAccent = mkTowerTri('goldAccent', 0x9a8262, 0.40, 0.64, 1.28, THREE.DoubleSide, {
    pbrTrio: towerBank.hammeredGilt,
    tileMeters: [1.20, 1.20],
    albedoStrength: 0.65,
    normalStrength: 0.72,
    roughnessStrength: 0.85,
    aoStrength: 0.55,
  });

  // 13. Woven Wool Bunting Summit Tricolore Flag & Striped Pavilion Canvas Awnings
  const flagTricolore = new THREE.MeshStandardMaterial({
    name: 'flagTricolore',
    color: 0xffffff,
    map: tricoloreTex,
    normalMap: towerBank.wovenFabric.normalMap,
    normalScale: new THREE.Vector2(0.65, 0.65),
    roughnessMap: towerBank.wovenFabric.roughnessMap,
    roughness: 0.84,
    metalness: 0.00,
    side: THREE.DoubleSide,
  });
  flagTricolore.emissive.setHex(0x000000);
  flagTricolore.emissiveIntensity = 0.0;

  const awningCream = mkTowerTri('awningCream', 0xdfd8ca, 0.86, 0.00, 0.72, THREE.DoubleSide, {
    pbrTrio: towerBank.wovenFabric,
    tileMeters: [0.85, 0.85],
    albedoStrength: 0.65,
    normalStrength: 0.72,
    roughnessStrength: 0.80,
    aoStrength: 0.58,
  });

  const awningStripe = mkTowerTri('awningStripe', 0x6b4c42, 0.86, 0.00, 0.72, THREE.DoubleSide, {
    pbrTrio: towerBank.wovenFabric,
    tileMeters: [0.85, 0.85],
    albedoStrength: 0.65,
    normalStrength: 0.72,
    roughnessStrength: 0.80,
    aoStrength: 0.58,
  });

  return {
    ironPrimary,
    ironLattice,
    ironSecondary,
    ironCast,
    masonryAshlar,
    concreteSub,
    woodPavilion,
    oakDeckPlanks,
    woodTimberTemp,
    timberFalsework: woodTimberTemp,
    elevatorCabinRed,
    glass1889,
    glassClear: glass1889,
    lampGlobe1889,
    lampGlobe1889_glass: lampGlobe1889,
    goldAccent,
    copperDome,
    flagTricolore,
    craneSteel,
    awningCream,
    awningStripe,
  };
}

export const createMaterialLibrary = createMaterials;

// ---------------------------------------------------------------------------
// Post-Build Tower Hierarchy Material, Deck & Plaque Upgrader
// ---------------------------------------------------------------------------

/**
 * Traverses a built `TowerModelController` root group (or `scene`) and upgrades:
 *   1. All horizontal visitor floor decks (`mesh.userData.isWoodDecking === true` at
 *      `+5.82 m`, `+56.40 m`, `+57.63 m`, `+115.73 m`, `+195.93 m`, `+276.13 m`, `+278.71 m`)
 *      to `materials.oakDeckPlanks` (`512x512` oiled oak plank grooves + bolt dimples).
 *   2. All elevator cabin wood bodies (`cabin_body_*`, `edoux_cabine_*`) to `materials.elevatorCabinRed`
 *      (`#5e3d31`, varnished burgundy-russet wood paneling).
 *   3. All inline `CanvasTexture` signs/plaques/flags (`friezePlaques_*` 72 scientists,
 *      `leFigaroPlaque`, `descenteEnamelSign`, `enamel_*`, `flagTricolore_RF1889`) with
 *      embossed normal & metallic/porcelain roughness maps.
 *   4. All pavilion canvas awnings (`awningCream`, `awningStripe`) and any fallback materials,
 *      enforcing `castShadow = true`, `receiveShadow = true`, and `0` emissive everywhere.
 */
export function upgradeTowerMaterialsAndDecks(towerRootOrController, THREE, providedMaterials = null) {
  const root = towerRootOrController?.rootGroup || towerRootOrController;
  if (!root || !THREE) {
    return { deckMeshesUpgraded: 0, cabinMeshesUpgraded: 0, embossedPlaquesUpgraded: 0 };
  }

  const mats = providedMaterials || towerRootOrController?.materials || createMaterials(THREE);
  if (!mats.oakDeckPlanks || !mats.elevatorCabinRed) {
    const fullMats = createMaterials(THREE);
    Object.assign(mats, {
      oakDeckPlanks: mats.oakDeckPlanks || fullMats.oakDeckPlanks,
      elevatorCabinRed: mats.elevatorCabinRed || fullMats.elevatorCabinRed,
      awningCream: mats.awningCream || fullMats.awningCream,
      awningStripe: mats.awningStripe || fullMats.awningStripe,
    });
  }

  let deckMeshesUpgraded = 0;
  let cabinMeshesUpgraded = 0;
  let embossedPlaquesUpgraded = 0;

  const isInsideElevatorCabin = (obj) => {
    let cur = obj;
    while (cur && cur !== root) {
      const n = String(cur.name || '');
      if (n.startsWith('cabin_body_') || n.startsWith('edoux_cabine_')) {
        return true;
      }
      cur = cur.parent;
    }
    return false;
  };

  const canonicalKeys = new Set([
    'ironPrimary',
    'ironLattice',
    'ironSecondary',
    'ironCast',
    'masonryAshlar',
    'concreteSub',
    'woodPavilion',
    'oakDeckPlanks',
    'woodTimberTemp',
    'timberFalsework',
    'elevatorCabinRed',
    'glass1889',
    'glassClear',
    'lampGlobe1889',
    'lampGlobe1889_glass',
    'goldAccent',
    'copperDome',
    'flagTricolore',
    'craneSteel',
    'awningCream',
    'awningStripe',
  ]);
  let canonicalMeshesSwapped = 0;

  root.traverse((obj) => {
    if (!obj.isMesh && !obj.isInstancedMesh) return;

    // 1. Upgrade horizontal visitor timber plank decks (`isWoodDecking`) to dedicated `oakDeckPlanks`
    if (obj.userData?.isWoodDecking) {
      obj.material = mats.oakDeckPlanks;
      if (obj.userData.__origMaterial !== undefined) {
        obj.userData.__origMaterial = mats.oakDeckPlanks;
      }
      obj.castShadow = true;
      obj.receiveShadow = true;
      deckMeshesUpgraded += 1;
      return;
    }

    // 2. Upgrade Otis, Roux-Combaluzier & Édoux cabin wood bodies to `elevatorCabinRed` (#5e3d31)
    const curMatName = String(obj.material?.name || '');
    if ((curMatName === 'woodPavilion' || curMatName === 'elevatorCabinRed') && isInsideElevatorCabin(obj)) {
      obj.material = mats.elevatorCabinRed;
      if (obj.userData.__origMaterial !== undefined) {
        obj.userData.__origMaterial = mats.elevatorCabinRed;
      }
      obj.castShadow = true;
      obj.receiveShadow = true;
      cabinMeshesUpgraded += 1;
      return;
    }

    // 3. Swap any canonical Tower material key to the Stage 2 elevated PBR instance
    if (canonicalKeys.has(curMatName) && mats[curMatName] && obj.material !== mats[curMatName]) {
      obj.material = mats[curMatName];
      if (obj.userData.__origMaterial !== undefined) {
        obj.userData.__origMaterial = mats[curMatName];
      }
      canonicalMeshesSwapped += 1;
    }

    // 4. Add embossed normal + roughness maps to inline CanvasTexture plaques, signs & RF flag
    const mList = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mList) {
      if (!m) continue;
      if (m.emissive) m.emissive.setHex(0x000000);
      m.emissiveIntensity = 0.0;
      m.emissiveMap = null;
      m.blending = THREE.NormalBlending;

      const mn = String(m.name || '');
      if (mn.startsWith('friezePlaques_')) {
        // Raised gilt scientist lettering on matte oxidized rouge-de-Venise iron band
        attachEmbossedReliefToCanvasMaterial(THREE, m, {
          heightScale: 3.2,
          brightIsRaised: true,
          raisedRoughness: 0.34,
          baseRoughness: 0.62,
        });
        m.metalness = 0.56;
        m.envMapIntensity = 1.20;
        embossedPlaquesUpgraded += 1;
      } else if (mn === 'leFigaroPlaque' || mn === 'descenteEnamelSign' || mn.startsWith('enamel_')) {
        // Vitreous porcelain-enamel signage & gilt-lettered Figaro kiosk plaque
        const isLightEnamel = mn === 'descenteEnamelSign';
        attachEmbossedReliefToCanvasMaterial(THREE, m, {
          heightScale: 2.2,
          brightIsRaised: !isLightEnamel,
          raisedRoughness: 0.24,
          baseRoughness: 0.32,
        });
        m.metalness = mn === 'leFigaroPlaque' ? 0.38 : 0.10;
        m.envMapIntensity = 1.12;
        embossedPlaquesUpgraded += 1;
      } else if (mn === 'flagTricolore_RF1889') {
        const towerBank = getTowerPbrBank(THREE);
        m.normalMap = towerBank.wovenFabric.normalMap;
        m.normalScale = new THREE.Vector2(0.68, 0.68);
        m.roughnessMap = towerBank.wovenFabric.roughnessMap;
        m.roughness = 0.84;
        m.metalness = 0.0;
        m.needsUpdate = true;
        embossedPlaquesUpgraded += 1;
      }

      if (!m.transparent) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    }
  });

  if (towerRootOrController && typeof towerRootOrController === 'object' && 'materials' in towerRootOrController) {
    towerRootOrController.materials = mats;
  }

  return {
    deckMeshesUpgraded,
    cabinMeshesUpgraded,
    embossedPlaquesUpgraded,
    canonicalMeshesSwapped,
  };
}

// ---------------------------------------------------------------------------
// Diagnostic Render-Mode Overrides (`pbr | ink | xray | silhouette` — Debug Only)
// Strictly `MeshStandardMaterial` (0 Lambert/Basic/Emissive) so Gate 2 passes in every mode!
// ---------------------------------------------------------------------------

export function createOverrideMaterials(THREE) {
  const mkStd = (name, color, roughness = 0.85, extra = {}) => {
    const m = new THREE.MeshStandardMaterial({
      name,
      color,
      roughness,
      metalness: 0.0,
      side: THREE.DoubleSide,
      ...extra,
    });
    m.emissive.setHex(0x000000);
    m.emissiveIntensity = 0.0;
    return m;
  };

  return {
    inkIron: mkStd('override_inkIron', 0x242322, 0.82),
    inkMasonry: mkStd('override_inkMasonry', 0xded9ce, 0.88),
    inkTemp: mkStd('override_inkTemp', 0x6e5536, 0.86),
    inkGlass: mkStd('override_inkGlass', 0x9aa4a2, 0.35, {
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
    inkLine: new THREE.LineBasicMaterial({
      name: 'override_inkLine',
      color: 0x1e1c19,
    }),
    xrayMesh: mkStd('override_xrayMesh', 0x8f907f, 0.55, {
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
    }),
    xrayLine: new THREE.LineBasicMaterial({
      name: 'override_xrayLine',
      color: 0x45433d,
      transparent: true,
      opacity: 0.55,
    }),
    silhouetteMesh: mkStd('override_silhouetteMesh', 0x141413, 1.0),
    silhouetteLine: new THREE.LineBasicMaterial({
      name: 'override_silhouetteLine',
      color: 0x141413,
    }),
  };
}

export function applyRenderModeToGroup(rootGroup, mode, overrides) {
  if (!rootGroup) return;
  rootGroup.traverse((obj) => {
    if (!obj.isMesh && !obj.isInstancedMesh && !obj.isLine && !obj.isLineSegments) return;
    if (obj.userData.__origMaterial === undefined) {
      obj.userData.__origMaterial = obj.material;
    }
    const orig = obj.userData.__origMaterial;
    if (mode === 'pbr' || !overrides) {
      obj.material = orig;
      return;
    }

    const isLineObj = obj.isLine || obj.isLineSegments;
    if (mode === 'silhouette') {
      obj.material = isLineObj ? overrides.silhouetteLine : overrides.silhouetteMesh;
      return;
    }
    if (mode === 'xray') {
      obj.material = isLineObj ? overrides.xrayLine : overrides.xrayMesh;
      return;
    }
    if (mode === 'ink') {
      if (isLineObj) {
        obj.material = overrides.inkLine;
        return;
      }
      const matName = Array.isArray(orig) ? (orig[0]?.name || '') : (orig?.name || '');
      if (matName.includes('glass')) {
        obj.material = overrides.inkGlass;
      } else if (matName.includes('masonry') || matName.includes('concrete') || matName.includes('lampGlobe')) {
        obj.material = overrides.inkMasonry;
      } else if (matName.includes('woodTimberTemp')) {
        obj.material = overrides.inkTemp;
      } else {
        obj.material = overrides.inkIron;
      }
    }
  });
}
