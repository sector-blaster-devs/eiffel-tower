/**
 * Stage 4 Module — Early-Boot Parallel Asset, Catalog & Worker Orchestrator (`startup_orchestrator.js`)
 *
 * Imported as the very first module in `app.js` (zero heavy dependencies) so it executes
 * immediately at page module-graph start — BEFORE `three.core.js` (`1.26 MB`) and the 5
 * procedural Tower zone modules finish parsing on the main thread.
 *
 * Launches 4 independent critical-path workloads in parallel from `t ~ 0 ms`:
 *   1. Worker A (`floor`): 10 archival world/deck PBR trios (`512x512` & `256x256`) transferred zero-copy
 *   2. Worker B (`tower_and_world`): 10 Tower PBR trios + Tricolore + 4 Paris lithographic/roof/foliage sets
 *   3. Catalog JSON fetch: `photo_cameras_3d.json`
 *   4. Stop 01 Archival Elevation (`#55`): high-priority fetch + off-thread `img.decode()`
 *
 * Includes automatic main-thread fallback if Web Workers are unavailable or blocked.
 */

export const STOP01_PLATE_REL_URL =
  './references/plans/structural_and_elevation_plates/55_Eiffel_1900_Planche_I_Elevation_Wikimedia_PD.jpg';

export const STOP02_PLATE_REL_URL =
  './references/photos/construction/foundations_and_pillars/13_Durandelle_1887_05_01_Foundation_Caissons_Getty_106P1J_CC0.jpg';

const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function runSinglePbrWorker(task, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    if (typeof Worker === 'undefined') {
      reject(new Error('Web Worker API unavailable'));
      return;
    }

    let worker = null;
    let settled = false;
    let timer = null;

    const cleanup = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      if (worker) {
        try {
          worker.terminate();
        } catch {
          // Ignore worker termination errors
        }
        worker = null;
      }
    };

    try {
      worker = new Worker(new URL('./pbr_worker.js', import.meta.url), {
        type: 'module',
        name: `s4_pbr_${task}`,
      });
    } catch (err) {
      cleanup();
      reject(err);
      return;
    }

    timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(`PBR worker timed out on task: ${task}`));
    }, timeoutMs);

    worker.onmessage = (ev) => {
      if (settled) return;
      settled = true;
      const payload = ev?.data || {};
      cleanup();
      if (payload.ok && payload.result) {
        resolve({
          result: payload.result,
          workerDurationMs: payload.durationMs ?? null,
        });
      } else {
        reject(new Error(payload.error || `PBR worker failed on task: ${task}`));
      }
    };

    worker.onerror = (err) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(err?.message || `PBR worker error on task: ${task}`));
    };

    worker.postMessage({ id: 1, task });
  });
}

async function synthesizePbrFallbackOnMainThread(task) {
  if (task === 'floor') {
    const { synthesizeFloorTextureRawBank } = await import('./model/floor_textures.js');
    return { floor: synthesizeFloorTextureRawBank() };
  }
  if (task === 'tower_and_world') {
    const [{ synthesizeTowerPbrRawBank }, { synthesizeSketchWorldRawMaps }] = await Promise.all([
      import('./model/materials.js'),
      import('./world/sketch_materials.js'),
    ]);
    return {
      tower: synthesizeTowerPbrRawBank(),
      world: synthesizeSketchWorldRawMaps(),
    };
  }
  const [
    { synthesizeFloorTextureRawBank },
    { synthesizeTowerPbrRawBank },
    { synthesizeSketchWorldRawMaps },
  ] = await Promise.all([
    import('./model/floor_textures.js'),
    import('./model/materials.js'),
    import('./world/sketch_materials.js'),
  ]);
  return {
    floor: synthesizeFloorTextureRawBank(),
    tower: synthesizeTowerPbrRawBank(),
    world: synthesizeSketchWorldRawMaps(),
  };
}

function preloadAndDecodeImage(url) {
  if (typeof Image === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    if ('fetchPriority' in img) {
      img.fetchPriority = 'high';
    }
    let finished = false;
    const done = (val) => {
      if (finished) return;
      finished = true;
      resolve(val);
    };
    img.onload = () => {
      if (typeof img.decode === 'function') {
        img.decode().then(() => done(img)).catch(() => done(img));
      } else {
        done(img);
      }
    };
    img.onerror = () => done(null);
    img.src = url;
    if (typeof img.decode === 'function') {
      img.decode().then(() => done(img)).catch(() => {
        // Wait for onload/onerror fallback if early decode() rejects before headers arrive
      });
    }
  });
}

async function fetchJsonChecked(url, label) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${label}: HTTP ${res.status}`);
  }
  return res.json();
}

export function startEarlyBootPipeline({
  dataBaseUrl = './data/catalog',
  stop01ImageUrl = STOP01_PLATE_REL_URL,
  stop02ImageUrl = STOP02_PLATE_REL_URL,
} = {}) {
  const tStart = nowMs();
  const timings = {
    pipelineStartMs: Number(tStart.toFixed(2)),
    catalogsReadyMs: null,
    pbrFloorWorkerMs: null,
    pbrTowerWorldWorkerMs: null,
    pbrRawReadyMs: null,
    pbrUsedWorkers: true,
    stop01DecodeReadyMs: null,
    stop02DecodeReadyMs: null,
  };

  const cleanBase = String(dataBaseUrl || './data/catalog').replace(/\/+$/, '');

  // 1. Catalog fetch (uses HTTP cache instead of cache: 'no-store')
  const catalogsPromise = fetchJsonChecked(
    `${cleanBase}/photo_cameras_3d.json`,
    'photo_cameras_3d.json'
  ).then((photoCameras) => {
    timings.catalogsReadyMs = Number((nowMs() - tStart).toFixed(2));
    return { photoCameras };
  });

  // 2. Three parallel background Web Workers for procedural PBR banks (zero-copy Transferable ArrayBuffers)
  const floorAPromise = runSinglePbrWorker('floor_a').catch(() => null);
  const floorBPromise = runSinglePbrWorker('floor_b').catch(() => null);

  const floorPromise = Promise.all([floorAPromise, floorBPromise]).then(async ([resA, resB]) => {
    if (resA?.result?.floorPart && resB?.result?.floorPart) {
      timings.pbrFloorWorkerMs = Number(
        Math.max(resA.workerDurationMs || 0, resB.workerDurationMs || 0).toFixed(2)
      );
      return { ...resA.result.floorPart, ...resB.result.floorPart };
    }
    timings.pbrUsedWorkers = false;
    const fb = await synthesizePbrFallbackOnMainThread('floor');
    return fb.floor;
  });

  const towerWorldPromise = runSinglePbrWorker('tower_and_world')
    .then(({ result, workerDurationMs }) => {
      timings.pbrTowerWorldWorkerMs = workerDurationMs;
      return result;
    })
    .catch(async () => {
      timings.pbrUsedWorkers = false;
      return synthesizePbrFallbackOnMainThread('tower_and_world');
    });

  const pbrRawPromise = Promise.all([floorPromise, towerWorldPromise]).then(
    ([floor, towerAndWorld]) => {
      timings.pbrRawReadyMs = Number((nowMs() - tStart).toFixed(2));
      return {
        floor,
        tower: towerAndWorld.tower,
        world: towerAndWorld.world,
      };
    }
  );

  // 3. Parallel high-priority fetch + off-thread bitmap decode for Stop 01 (`#55` Full Elevation);
  //    Stop 02 (`#13`, 4.0 MB) prefetches cleanly in idle once Stop 01 opens so cold-boot payload stays lean.
  const stop01ImagePromise = preloadAndDecodeImage(stop01ImageUrl).then((img) => {
    timings.stop01DecodeReadyMs = Number((nowMs() - tStart).toFixed(2));
    return img;
  });

  const stop02ImagePromise = Promise.resolve(null);

  return {
    catalogsPromise,
    pbrRawPromise,
    stop01ImagePromise,
    stop02ImagePromise,
    timings,
  };
}

export const bootPipeline =
  typeof window !== 'undefined' && typeof fetch === 'function'
    ? startEarlyBootPipeline()
    : null;
