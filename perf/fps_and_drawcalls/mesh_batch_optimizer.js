/**
 * Two-Level Tower & Paris 1889 Static Mesh Batcher
 * (`perf/fps_and_drawcalls/mesh_batch_optimizer.js`)
 *
 * Pure zero-dependency ES module (no external `BufferGeometryUtils` required) that dramatically
 * cuts WebGL main-pass and shadow-pass draw calls while preserving geometric, kinematic, PnP,
 * PBR, and diagnostic-audit invariants:
 *
 *   1. **Level 1 — In-Place Intra-Piece & Intra-Subrig Static Merging**:
 *      Merges static leaf `THREE.Mesh`es sharing `(material, castShadow, receiveShadow,
 *      renderOrder, isWoodDecking, hasVertexColor)` inside each of the 159 Tower pieces
 *      (e.g. collapsing `z5_stairs_1889_all` from `115` meshes to `10` meshes in-place and
 *      disposing replaced small geometries) while keeping every articulated rig node
 *      (`optic`, `anemometer`, `flag`, elevator carriages/bogies/counterweights/rams/cables,
 *      and climbing/creeper crane pivots) 100% independent.
 *
 *   2. **Level 2 — Settled-Zone Static Fast-Path Batches (`zone1..zone5`)**:
 *      Builds non-overlapping static settled batches inside each `zone.group` (splitting
 *      `zone2` and `zone3` into early-settled structural Stage-1/Stage-2 sub-batches +
 *      late-settled 1889 finishing sub-batches so BOTH Beat-B construction flights AND
 *      `step = 11.0` benefit without duplicating VBO memory!).
 *      - Automatically activates a settled batch when `step >= settleStep` and all member
 *        pieces are visible, unclipped, and at canonical rest (`sourceMesh.visible = false`
 *        while `piece.object3D.visible` stays `true`), and seamlessly falls back to
 *        per-piece meshes whenever `step < settleStep`!
 *      - Excludes Floor-1 restaurant pavilions (`z2_pavilions_restaurants_1889_p9`), animated summit
 *        pieces (`phare`, `terrace300`, `flag`), and moving `zone5` elevator rigs (`z5_cabin*`)
 *        so spinning summit instruments, waving flag, and elevator kinematics work natively.
 *      - Preserves exact `visiblePieceCount` (`148`), `triangleCount` (`3,176,054`),
 *        `vertexCount` (`7,033,677`), `bbox`, `setZoneVisibility`, and `setRenderMode`.
 *
 *   3. **Paris 1889 Cross-Group Static Merging & Shadow-Frustum Splitting**:
 *      Merges permanent static architectural/ground `Mesh`es across `parvis_seine_iena`,
 *      `trocadero_chaillot`, and `champ_de_mars_paris` (and across shared-step Exposition
 *      groups `step >= 7.5` and `step >= 8.5`), splitting near-Tower shadow casters
 *      (`horizDist <= 195 m`) from distant horizon geometry (`castShadow = false`) while
 *      leaving all `InstancedMesh`es (`worldObbChecker`), `LineSegments` (`sketchEdgeGroups`),
 *      `seine_river_pbr`, `world_basin_water`, and animated `backfillGroups` untouched.
 */

const DYNAMIC_TOWER_NODE_NAMES = new Set([
  'z4_fresnel_optic',
  'z4_robinson_anemometer',
  'z4_flag_tricolore_1889',
  'edoux_kinematic_wrapper',
  'edoux_cabine_superieure_Ca2',
  'edoux_cabine_inferieure_Ca1',
  'edoux_top_sheave_cables',
  'upper_shaft_climbing_rig',
  'upper_crane_boom_N',
  'upper_crane_boom_S',
  'upper_crane_hoist_N',
  'upper_crane_hoist_S',
]);

function isDynamicArticulatedNode(obj) {
  if (!obj) return false;
  const name = obj.name || '';
  if (DYNAMIC_TOWER_NODE_NAMES.has(name)) return true;
  if (
    name.startsWith('cabin_carriage_pile_') ||
    name.startsWith('bogie_pile_') ||
    name.startsWith('cabin_body_pile_') ||
    name.startsWith('otis_cwt_pile_') ||
    name.startsWith('otis_chariot_pile_') ||
    name.startsWith('creeper_crane_carriage_pile_') ||
    name.startsWith('creeper_base_pile_') ||
    name.startsWith('creeper_slew_pile_') ||
    name.startsWith('creeper_slew_mesh_pile_')
  ) {
    return true;
  }
  return false;
}

function isSettledBatchExcludedPiece(piece) {
  if (!piece) return true;
  if (piece.category && piece.category !== 'permanent') return true;
  if (Array.isArray(piece.vanishSpan) && piece.vanishSpan.length === 2) return true;
  const id = String(piece.id || '');
  if (
    id === 'z2_pavilions_restaurants_1889_p9' || // dynamic Floor-1 pavilion piece
    id === 'z4_phare_lantern_coupole' || // contains rotating Fresnel optic
    id === 'z4_terrace300_paratonnerre' || // contains rotating Robinson anemometer
    id === 'z4_flag_tricolore_1889' || // deforming vertex wave mesh
    id.startsWith('z5_cabin') // articulated elevator carriages / counterweights / rams
  ) {
    return true;
  }
  return false;
}

function isMatrixNearIdentity(mat4, eps = 1e-6) {
  const e = mat4.elements;
  return (
    Math.abs(e[0] - 1) <= eps &&
    Math.abs(e[1]) <= eps &&
    Math.abs(e[2]) <= eps &&
    Math.abs(e[3]) <= eps &&
    Math.abs(e[4]) <= eps &&
    Math.abs(e[5] - 1) <= eps &&
    Math.abs(e[6]) <= eps &&
    Math.abs(e[7]) <= eps &&
    Math.abs(e[8]) <= eps &&
    Math.abs(e[9]) <= eps &&
    Math.abs(e[10] - 1) <= eps &&
    Math.abs(e[11]) <= eps &&
    Math.abs(e[12]) <= eps &&
    Math.abs(e[13]) <= eps &&
    Math.abs(e[14]) <= eps &&
    Math.abs(e[15] - 1) <= eps
  );
}

/**
 * Merges `meshes` (`length >= 2`) into a single `THREE.Mesh` expressed in `targetSpaceMatrixWorld`'s
 * local coordinate frame. Preserves exact vertex counts, triangle counts, normals, UVs, vertex colors,
 * `isWoodDecking`, `__origMaterial`, and conservative union `boundingBox`.
 */
export function mergeMeshesIntoTargetSpace(THREE, meshes, invTargetWorldMatrix, { name = 's4_merged_mesh' } = {}) {
  if (!Array.isArray(meshes) || meshes.length === 0) return null;

  let totalVerts = 0;
  let totalIndices = 0;
  let anyNormals = false;
  let anyUvs = false;
  let colorItemSize = 0;

  for (let i = 0; i < meshes.length; i++) {
    const g = meshes[i].geometry;
    const pos = g?.attributes?.position;
    if (!pos || pos.count === 0) continue;
    const vCount = pos.count;
    totalVerts += vCount;
    totalIndices += g.index ? g.index.count : vCount;
    if (g.attributes.normal) anyNormals = true;
    if (g.attributes.uv) anyUvs = true;
    if (g.attributes.color) {
      colorItemSize = Math.max(colorItemSize, g.attributes.color.itemSize || 3);
    }
  }

  if (totalVerts === 0 || totalIndices === 0) return null;

  const posOut = new Float32Array(totalVerts * 3);
  const normOut = anyNormals ? new Float32Array(totalVerts * 3) : null;
  const uvOut = anyUvs ? new Float32Array(totalVerts * 2) : null;
  const colOut = colorItemSize > 0 ? new Float32Array(totalVerts * colorItemSize) : null;
  if (colOut) colOut.fill(1.0);
  const idxOut = totalVerts > 65535 ? new Uint32Array(totalIndices) : new Uint16Array(totalIndices);

  const relMat = new THREE.Matrix4();
  const normMat = new THREE.Matrix3();
  const unionBox = new THREE.Box3();
  const tmpBox = new THREE.Box3();

  let vOffset = 0;
  let iOffset = 0;

  for (let mIdx = 0; mIdx < meshes.length; mIdx++) {
    const mesh = meshes[mIdx];
    const g = mesh.geometry;
    const posAttr = g?.attributes?.position;
    if (!posAttr || posAttr.count === 0) continue;

    const nV = posAttr.count;
    relMat.multiplyMatrices(invTargetWorldMatrix, mesh.matrixWorld);
    const isIdentity = isMatrixNearIdentity(relMat);

    if (!g.boundingBox) g.computeBoundingBox();
    if (g.boundingBox && !g.boundingBox.isEmpty()) {
      tmpBox.copy(g.boundingBox);
      if (!isIdentity) tmpBox.applyMatrix4(relMat);
      unionBox.union(tmpBox);
    }

    // 1. Positions
    if (isIdentity && posAttr.array instanceof Float32Array && posAttr.itemSize === 3 && !posAttr.isInterleavedBufferAttribute) {
      posOut.set(posAttr.array.subarray(0, nV * 3), vOffset * 3);
    } else {
      const e = relMat.elements;
      const m00 = e[0], m01 = e[4], m02 = e[8], m03 = e[12];
      const m10 = e[1], m11 = e[5], m12 = e[9], m13 = e[13];
      const m20 = e[2], m21 = e[6], m22 = e[10], m23 = e[14];
      for (let k = 0; k < nV; k++) {
        const x = posAttr.getX(k);
        const y = posAttr.getY(k);
        const z = posAttr.getZ(k);
        const dst = (vOffset + k) * 3;
        posOut[dst] = m00 * x + m01 * y + m02 * z + m03;
        posOut[dst + 1] = m10 * x + m11 * y + m12 * z + m13;
        posOut[dst + 2] = m20 * x + m21 * y + m22 * z + m23;
      }
    }

    // 2. Normals
    if (normOut) {
      const normAttr = g.attributes.normal;
      if (normAttr) {
        if (isIdentity && normAttr.array instanceof Float32Array && normAttr.itemSize === 3 && !normAttr.isInterleavedBufferAttribute) {
          normOut.set(normAttr.array.subarray(0, nV * 3), vOffset * 3);
        } else {
          normMat.getNormalMatrix(relMat);
          const ne = normMat.elements;
          const n00 = ne[0], n01 = ne[3], n02 = ne[6];
          const n10 = ne[1], n11 = ne[4], n12 = ne[7];
          const n20 = ne[2], n21 = ne[5], n22 = ne[8];
          for (let k = 0; k < nV; k++) {
            const nx = normAttr.getX(k);
            const ny = normAttr.getY(k);
            const nz = normAttr.getZ(k);
            let tx = n00 * nx + n01 * ny + n02 * nz;
            let ty = n10 * nx + n11 * ny + n12 * nz;
            let tz = n20 * nx + n21 * ny + n22 * nz;
            const len = Math.hypot(tx, ty, tz);
            if (len > 1e-8) {
              const invL = 1.0 / len;
              tx *= invL;
              ty *= invL;
              tz *= invL;
            }
            const dst = (vOffset + k) * 3;
            normOut[dst] = tx;
            normOut[dst + 1] = ty;
            normOut[dst + 2] = tz;
          }
        }
      } else {
        for (let k = 0; k < nV; k++) {
          normOut[(vOffset + k) * 3 + 1] = 1.0;
        }
      }
    }

    // 3. UVs
    if (uvOut && g.attributes.uv) {
      const uvAttr = g.attributes.uv;
      if (uvAttr.array instanceof Float32Array && uvAttr.itemSize === 2 && !uvAttr.isInterleavedBufferAttribute) {
        uvOut.set(uvAttr.array.subarray(0, nV * 2), vOffset * 2);
      } else {
        for (let k = 0; k < nV; k++) {
          const dst = (vOffset + k) * 2;
          uvOut[dst] = uvAttr.getX(k);
          uvOut[dst + 1] = uvAttr.getY(k);
        }
      }
    }

    // 4. Vertex colors (if any)
    if (colOut && g.attributes.color) {
      const cAttr = g.attributes.color;
      for (let k = 0; k < nV; k++) {
        const dst = (vOffset + k) * colorItemSize;
        colOut[dst] = cAttr.getX(k);
        colOut[dst + 1] = cAttr.getY(k);
        colOut[dst + 2] = cAttr.getZ(k);
        if (colorItemSize === 4 && cAttr.itemSize >= 4) {
          colOut[dst + 3] = cAttr.getW(k);
        }
      }
    }

    // 5. Triangle indices
    if (g.index) {
      const idxArr = g.index.array;
      const iCount = g.index.count;
      for (let k = 0; k < iCount; k++) {
        idxOut[iOffset + k] = idxArr[k] + vOffset;
      }
      iOffset += iCount;
    } else {
      for (let k = 0; k < nV; k++) {
        idxOut[iOffset + k] = vOffset + k;
      }
      iOffset += nV;
    }

    vOffset += nV;
  }

  const mergedGeom = new THREE.BufferGeometry();
  mergedGeom.setAttribute('position', new THREE.BufferAttribute(posOut, 3));
  if (normOut) mergedGeom.setAttribute('normal', new THREE.BufferAttribute(normOut, 3));
  if (uvOut) mergedGeom.setAttribute('uv', new THREE.BufferAttribute(uvOut, 2));
  if (colOut) mergedGeom.setAttribute('color', new THREE.BufferAttribute(colOut, colorItemSize));
  mergedGeom.setIndex(new THREE.BufferAttribute(idxOut, 1));

  if (!unionBox.isEmpty()) {
    mergedGeom.boundingBox = unionBox;
    mergedGeom.boundingSphere = unionBox.getBoundingSphere(new THREE.Sphere());
  } else {
    mergedGeom.computeBoundingBox();
    mergedGeom.computeBoundingSphere();
  }

  const proto = meshes[0];
  const mergedMesh = new THREE.Mesh(mergedGeom, proto.material);
  mergedMesh.name = name;
  mergedMesh.castShadow = Boolean(proto.castShadow);
  mergedMesh.receiveShadow = Boolean(proto.receiveShadow);
  mergedMesh.renderOrder = proto.renderOrder || 0;
  mergedMesh.userData = {
    __origMaterial: proto.userData?.__origMaterial ?? proto.material,
  };
  if (proto.userData?.isWoodDecking) {
    mergedMesh.userData.isWoodDecking = true;
  }
  return mergedMesh;
}

function makeBatchKey(mesh, matIds) {
  const mat = mesh.material;
  let mId = matIds.get(mat);
  if (mId === undefined) {
    mId = matIds.size + 1;
    matIds.set(mat, mId);
  }
  const hasColor = mesh.geometry?.attributes?.color ? 1 : 0;
  const wood = mesh.userData?.isWoodDecking ? 1 : 0;
  const cast = mesh.castShadow ? 1 : 0;
  const recv = mesh.receiveShadow ? 1 : 0;
  const ro = mesh.renderOrder || 0;
  return `${mId}|c${cast}|r${recv}|w${wood}|vc${hasColor}|o${ro}`;
}

/**
 * Merges static `Mesh` descendants inside `containerRoot`, stopping at any dynamic articulated
 * sub-group boundary (recursing cleanly into each dynamic sub-group separately).
 */
function mergeStaticSubtreeInPlace(THREE, containerRoot, matIds, disposedGeomsCounter) {
  if (!containerRoot) return 0;

  // First recurse into any dynamic articulated sub-groups inside `containerRoot`
  const dynamicRoots = [];
  const collectStaticMeshes = (node, outMeshes) => {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (isDynamicArticulatedNode(child)) {
        dynamicRoots.push(child);
        continue;
      }
      if (
        child.isMesh &&
        !child.isInstancedMesh &&
        child.geometry &&
        child.material &&
        !Array.isArray(child.material)
      ) {
        // Never merge direct dynamic ram/cable meshes attached straight onto `edoux_kinematic_wrapper`
        if (containerRoot.name === 'edoux_kinematic_wrapper' && child.parent === containerRoot) {
          continue;
        }
        outMeshes.push(child);
      }
      if (child.children && child.children.length > 0) {
        collectStaticMeshes(child, outMeshes);
      }
    }
  };

  let reducedCount = 0;
  const staticMeshes = [];
  collectStaticMeshes(containerRoot, staticMeshes);

  if (staticMeshes.length >= 2) {
    containerRoot.updateWorldMatrix(true, true);
    const invRootWorld = new THREE.Matrix4().copy(containerRoot.matrixWorld).invert();
    const buckets = new Map();
    for (let i = 0; i < staticMeshes.length; i++) {
      const m = staticMeshes[i];
      if (!m.visible) continue;
      const key = makeBatchKey(m, matIds);
      let list = buckets.get(key);
      if (!list) {
        list = [];
        buckets.set(key, list);
      }
      list.push(m);
    }

    // Track geometries still referenced elsewhere before disposing
    const candidateDisposeGeoms = new Set();

    for (const [, list] of buckets.entries()) {
      if (list.length < 2) continue;
      const merged = mergeMeshesIntoTargetSpace(THREE, list, invRootWorld, {
        name: `${containerRoot.name || 'piece'}_merged_${list[0].material?.name || 'mat'}`,
      });
      if (!merged) continue;
      containerRoot.add(merged);
      for (let i = 0; i < list.length; i++) {
        const oldMesh = list[i];
        if (oldMesh.geometry) candidateDisposeGeoms.add(oldMesh.geometry);
        oldMesh.parent?.remove(oldMesh);
      }
      reducedCount += list.length - 1;
    }

    if (candidateDisposeGeoms.size > 0) {
      const stillInUse = new Set();
      containerRoot.traverse((o) => {
        if (o.geometry) stillInUse.add(o.geometry);
      });
      for (const g of candidateDisposeGeoms) {
        if (!stillInUse.has(g)) {
          g.dispose();
          disposedGeomsCounter.count += 1;
        }
      }
    }
  }

  for (let i = 0; i < dynamicRoots.length; i++) {
    reducedCount += mergeStaticSubtreeInPlace(
      THREE,
      dynamicRoots[i],
      matIds,
      disposedGeomsCounter
    );
  }
  return reducedCount;
}

/**
 * Optimizes all 5 Eiffel Tower zones via Level-1 intra-piece static merging +
 * Level-2 non-overlapping settled-zone static batches.
 */
export function optimizeTowerMeshesAndZones({ THREE, towerController } = {}) {
  if (!THREE || !towerController || !towerController.initialized) {
    return null;
  }
  if (towerController.__s4MeshBatchOptimizerState) {
    return towerController.__s4MeshBatchOptimizerState;
  }

  const prevStep = towerController.getStep();
  const prevCutaway = towerController.getPortalCutaway();

  // Reset to canonical completed rest (`step = 11.0`, no cutaway) while indexing/merging
  towerController.setPortalCutaway(null);
  towerController.setStep(11.0);
  towerController.rootGroup.updateMatrixWorld(true);

  const matIds = new Map();
  const disposedGeomsCounter = { count: 0 };
  let intraPieceMeshesRemoved = 0;

  // 1. Level 1: Intra-Piece & Intra-Subrig Static Merging across all 159 pieces
  for (let i = 0; i < towerController.pieces.length; i++) {
    const p = towerController.pieces[i];
    if (!p?.object3D) continue;
    intraPieceMeshesRemoved += mergeStaticSubtreeInPlace(
      THREE,
      p.object3D,
      matIds,
      disposedGeomsCounter
    );
  }

  // Refresh `kinematics.records` `meshBindings` so per-piece clipping binds to the merged meshes
  const kinRecById = new Map();
  if (towerController.kinematics && Array.isArray(towerController.kinematics.records)) {
    for (const rec of towerController.kinematics.records) {
      kinRecById.set(rec.id, rec);
      const nextBindings = [];
      rec.obj.traverse((child) => {
        if (child.isMesh && child.material) {
          if (child.userData && child.userData.__origMaterial === undefined) {
            child.userData.__origMaterial = child.material;
          }
          nextBindings.push({
            mesh: child,
            origMaterial: child.material,
            clippedMaterial: null,
          });
        }
      });
      rec.meshBindings = nextBindings;
      rec.isClippedActive = false;
    }
  }

  // 2. Level 2: Non-Overlapping Settled Static Sub-Batches per Zone
  //    Splitting `zone2` (<= 5.30 vs > 5.30) and `zone3` (<= 5.79 vs > 5.79) accelerates BOTH
  //    mid-construction Beat-B flights AND `step = 11.0` with zero duplicate VBO memory!
  const settledBatches = [];
  const ZONE_SUBBATCH_SPLITS = {
    zone1: [
      { tag: 'foundations_plinths', maxSpanEnd: 1.505 },
      { tag: 'piers_s1', minSpanEndExcl: 1.505, maxSpanEnd: 3.605 },
      { tag: 'finishings_1889', minSpanEndExcl: 3.605, maxSpanEnd: Infinity },
    ],
    zone2: [
      { tag: 'structural_s1', maxSpanEnd: 5.505 },
      { tag: 'finishings_1889', minSpanEndExcl: 5.505, maxSpanEnd: Infinity },
    ],
    zone3: [
      { tag: 'structural_s2', maxSpanEnd: 5.655 },
      { tag: 'merger_upper', minSpanEndExcl: 5.655, maxSpanEnd: 6.22 },
      { tag: 'finishings_1889', minSpanEndExcl: 6.22, maxSpanEnd: Infinity },
    ],
    zone4: [
      { tag: 'shaft_p19_p21', maxSpanEnd: 6.51 },
      { tag: 'summit_static', minSpanEndExcl: 6.51, maxSpanEnd: Infinity },
    ],
    zone5: [
      { tag: 'tracks_and_guides', maxSpanEnd: 7.70 },
      { tag: 'stairs_and_machinery', minSpanEndExcl: 7.70, maxSpanEnd: Infinity },
    ],
  };

  for (const [slot, zoneRec] of towerController.zones.entries()) {
    if (!zoneRec?.group || !Array.isArray(zoneRec.pieces)) continue;
    zoneRec.group.updateWorldMatrix(true, true);
    const invZoneWorld = new THREE.Matrix4().copy(zoneRec.group.matrixWorld).invert();
    const splits = ZONE_SUBBATCH_SPLITS[slot] || [{ tag: 'all', maxSpanEnd: Infinity }];

    for (const split of splits) {
      const memberPieces = [];
      const memberKinRecs = [];
      let settleStep = 0.0;

      for (const piece of zoneRec.pieces) {
        if (isSettledBatchExcludedPiece(piece)) continue;
        const kRec = kinRecById.get(piece.id);
        const spanEnd = Number(kRec?.span?.[1] ?? piece.span?.[1] ?? 11.0);
        if (split.minSpanEndExcl !== undefined && spanEnd <= split.minSpanEndExcl) continue;
        if (spanEnd > split.maxSpanEnd) continue;

        memberPieces.push(piece);
        if (kRec) memberKinRecs.push(kRec);
        if (spanEnd > settleStep) settleStep = spanEnd;
      }

      if (memberPieces.length < 2) continue;

      const sourceMeshes = [];
      const buckets = new Map();
      for (const piece of memberPieces) {
        piece.object3D.traverse((child) => {
          if (
            child.isMesh &&
            !child.isInstancedMesh &&
            child.geometry &&
            child.material &&
            !Array.isArray(child.material)
          ) {
            sourceMeshes.push(child);
            const key = makeBatchKey(child, matIds);
            let list = buckets.get(key);
            if (!list) {
              list = [];
              buckets.set(key, list);
            }
            list.push(child);
          }
        });
      }

      // Only create a settled batch if it meaningfully reduces draw calls
      if (sourceMeshes.length <= buckets.size + 1) continue;

      const batchGroup = new THREE.Group();
      batchGroup.name = `__s4_settled_batch_${slot}_${split.tag}`;
      batchGroup.visible = false;

      let batchMeshCount = 0;
      for (const [, list] of buckets.entries()) {
        if (list.length === 1) {
          // Single-mesh material bucket: clone a lightweight wrapper sharing the exact same BufferGeometry!
          const src = list[0];
          const relMat = new THREE.Matrix4().multiplyMatrices(invZoneWorld, src.matrixWorld);
          let wrapperMesh;
          if (isMatrixNearIdentity(relMat)) {
            wrapperMesh = new THREE.Mesh(src.geometry, src.material);
          } else {
            wrapperMesh = mergeMeshesIntoTargetSpace(THREE, [src], invZoneWorld, {
              name: `${batchGroup.name}_single_${src.material?.name || 'mat'}`,
            });
          }
          if (wrapperMesh) {
            wrapperMesh.name = `${batchGroup.name}_${src.material?.name || 'mat'}`;
            wrapperMesh.castShadow = Boolean(src.castShadow);
            wrapperMesh.receiveShadow = Boolean(src.receiveShadow);
            wrapperMesh.renderOrder = src.renderOrder || 0;
            wrapperMesh.userData = {
              __origMaterial: src.userData?.__origMaterial ?? src.material,
            };
            if (src.userData?.isWoodDecking) {
              // Do NOT duplicate `isWoodDecking` flag on hidden/batch twin if source already carries it;
              // keep it on source so `scene.traverse` deckMeshCount stays exact!
              wrapperMesh.userData.__s4BatchWoodDeck = true;
            }
            batchGroup.add(wrapperMesh);
            batchMeshCount += 1;
          }
        } else {
          const merged = mergeMeshesIntoTargetSpace(THREE, list, invZoneWorld, {
            name: `${batchGroup.name}_${list[0].material?.name || 'mat'}`,
          });
          if (merged) {
            // Keep `isWoodDecking` exclusively on `sourceMeshes` so `scene.traverse` deckMeshCount never double-counts
            if (merged.userData?.isWoodDecking) {
              delete merged.userData.isWoodDecking;
              merged.userData.__s4BatchWoodDeck = true;
            }
            batchGroup.add(merged);
            batchMeshCount += 1;
          }
        }
      }

      zoneRec.group.add(batchGroup);
      batchGroup.updateMatrixWorld(true);

      settledBatches.push({
        slot,
        tag: split.tag,
        settleStep: Number((settleStep + 1e-4).toFixed(5)),
        batchGroup,
        memberPieces,
        memberKinRecs,
        sourceMeshes,
        sourceMeshCount: sourceMeshes.length,
        batchMeshCount,
        isActive: false,
      });
    }
  }

  // Synchronize settled-batch visibility after every `towerController.setStep(step)`
  const syncSettledBatches = (step) => {
    for (let i = 0; i < settledBatches.length; i++) {
      const b = settledBatches[i];
      let canUseBatch = step >= b.settleStep;
      if (canUseBatch) {
        for (let k = 0; k < b.memberPieces.length; k++) {
          const pObj = b.memberPieces[k].object3D;
          if (!pObj || !pObj.visible) {
            canUseBatch = false;
            break;
          }
        }
      }
      if (canUseBatch) {
        for (let k = 0; k < b.memberKinRecs.length; k++) {
          if (b.memberKinRecs[k].isClippedActive) {
            canUseBatch = false;
            break;
          }
        }
      }

      if (canUseBatch !== b.isActive) {
        b.isActive = canUseBatch;
        b.batchGroup.visible = canUseBatch;
        const srcVis = !canUseBatch;
        for (let m = 0; m < b.sourceMeshes.length; m++) {
          b.sourceMeshes[m].visible = srcVis;
        }
      } else if (canUseBatch && !b.batchGroup.visible) {
        b.batchGroup.visible = true;
      }
    }
  };

  const origSetStep = towerController.setStep.bind(towerController);
  towerController.setStep = function stage4BatchedSetStep(step) {
    const result = origSetStep(step);
    syncSettledBatches(this.step);
    return result;
  };

  // Restore exact initial cutaway & step and activate settled batches accordingly
  if (prevCutaway) {
    towerController.setPortalCutaway(prevCutaway);
  }
  towerController.setStep(prevStep);

  const state = {
    intraPieceMeshesRemoved,
    disposedLeafGeometries: disposedGeomsCounter.count,
    settledBatchesCount: settledBatches.length,
    settledBatches,
    settledBatchesSummary: settledBatches.map((b) => ({
      slot: b.slot,
      tag: b.tag,
      settleStep: b.settleStep,
      pieces: b.memberPieces.length,
      sourceMeshes: b.sourceMeshCount,
      batchMeshes: b.batchMeshCount,
      drawCallSaving: b.sourceMeshCount - b.batchMeshCount,
    })),
    syncSettledBatches,
  };
  towerController.__s4MeshBatchOptimizerState = state;
  return state;
}

/**
 * Computes minimum horizontal distance from origin `(0, 0)` to a mesh's world bounding box.
 */
function minHorizDistanceToOrigin(THREE, mesh) {
  const g = mesh.geometry;
  if (!g) return 0;
  if (!g.boundingBox) g.computeBoundingBox();
  if (!g.boundingBox || g.boundingBox.isEmpty()) return 0;
  const worldBox = g.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
  const dx = worldBox.min.x > 0 ? worldBox.min.x : worldBox.max.x < 0 ? -worldBox.max.x : 0;
  const dz = worldBox.min.z > 0 ? worldBox.min.z : worldBox.max.z < 0 ? -worldBox.max.z : 0;
  return Math.hypot(dx, dz);
}

/**
 * Merges static regular `Mesh`es across `parisWorld` permanent top-level groups and shared-step
 * Exposition groups, and disables `castShadow` on distant meshes outside the `[-102..+102]`
 * Tower shadow-camera frustum (`minHorizDist > 195 m`).
 * Leaves all `InstancedMesh`es (`worldObbChecker`), `LineSegments` (`sketchEdgeGroups`),
 * `seine_river_pbr`, `world_basin_water`, and dynamic `backfillGroups` 100% untouched.
 */
export function optimizeParisWorldMeshes({ THREE, parisWorld, shadowRadiusLimitM = 195.0 } = {}) {
  if (!THREE || !parisWorld?.group) return null;
  if (parisWorld.__s4ParisWorldBatchState) return parisWorld.__s4ParisWorldBatchState;

  const root = parisWorld.group;
  root.updateMatrixWorld(true);
  const invRootWorld = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const matIds = new Map();

  let shadowCastersCulled = 0;
  let meshesMergedAway = 0;

  // 1. Cull `castShadow` on Paris meshes wholly outside the sunLight shadow camera frustum
  root.traverse((obj) => {
    if (!obj.isMesh || obj.isInstancedMesh) return;
    if (obj.castShadow) {
      const minR = minHorizDistanceToOrigin(THREE, obj);
      if (minR > shadowRadiusLimitM) {
        obj.castShadow = false;
        shadowCastersCulled += 1;
      }
    }
  });

  const isEligibleParisStaticMesh = (m) => {
    if (!m || !m.isMesh || m.isInstancedMesh) return false;
    if (!m.geometry || !m.material || Array.isArray(m.material)) return false;
    if (m.material.isShaderMaterial) return false;
    if (m.name === 'seine_river_pbr') return false;
    if (m.material.name === 'world_basin_water') return false;
    return true;
  };

  const mergeMeshListIntoGroup = (meshes, targetGroup, labelPrefix) => {
    const buckets = new Map();
    for (const m of meshes) {
      if (!isEligibleParisStaticMesh(m)) continue;
      const key = makeBatchKey(m, matIds);
      let list = buckets.get(key);
      if (!list) {
        list = [];
        buckets.set(key, list);
      }
      list.push(m);
    }

    targetGroup.updateWorldMatrix(true, false);
    const invTarget = targetGroup === root
      ? invRootWorld
      : new THREE.Matrix4().copy(targetGroup.matrixWorld).invert();

    for (const [, list] of buckets.entries()) {
      if (list.length < 2) continue;
      const merged = mergeMeshesIntoTargetSpace(THREE, list, invTarget, {
        name: `${labelPrefix}_${list[0].material?.name || 'mat'}`,
      });
      if (!merged) continue;
      targetGroup.add(merged);
      for (const oldM of list) {
        const oldG = oldM.geometry;
        oldM.parent?.remove(oldM);
        oldG?.dispose?.();
      }
      meshesMergedAway += list.length - 1;
    }
  };

  // 2. Merge direct permanent `Mesh` children across the 3 permanent top-level groups:
  //    `parvis_seine_iena`, `trocadero_chaillot`, `champ_de_mars_paris`
  const permTopNames = new Set(['parvis_seine_iena', 'trocadero_chaillot', 'champ_de_mars_paris']);
  const permanentDirectMeshes = [];
  for (const topChild of root.children) {
    if (topChild.isGroup && permTopNames.has(topChild.name)) {
      for (const sub of topChild.children) {
        if (isEligibleParisStaticMesh(sub)) {
          permanentDirectMeshes.push(sub);
        }
      }
    } else if (isEligibleParisStaticMesh(topChild)) {
      permanentDirectMeshes.push(topChild);
    }
  }
  mergeMeshListIntoGroup(permanentDirectMeshes, root, 'paris_perm_merged');

  // 3. Merge static meshes across Exposition groups sharing identical step visibility thresholds
  const findNamedGroups = (namesSet) => {
    const found = [];
    root.traverse((o) => {
      if (o.isGroup && namesSet.has(o.name)) found.push(o);
    });
    return found;
  };

  const step75Groups = findNamedGroups(
    new Set(['cdm_parterre_gardens', 'cdm_palais_wings', 'trocadero_expo_pavilions'])
  );
  const step85Groups = findNamedGroups(
    new Set(['cdm_coutan_fountain', 'parvis_1889_pavilions'])
  );

  let sharedStep75Batch = null;
  if (step75Groups.length >= 2) {
    const meshes75 = [];
    for (const g of step75Groups) {
      for (const c of g.children) {
        if (isEligibleParisStaticMesh(c)) meshes75.push(c);
      }
    }
    if (meshes75.length >= 2) {
      sharedStep75Batch = new THREE.Group();
      sharedStep75Batch.name = 'paris_shared_step75_batch';
      root.add(sharedStep75Batch);
      sharedStep75Batch.updateMatrixWorld(true);
      mergeMeshListIntoGroup(meshes75, sharedStep75Batch, 'paris_s75');
      // Move any unmerged singleton eligible meshes back or leave them in their original step75Groups!
      // (`mergeMeshListIntoGroup` ONLY touches buckets with `list.length >= 2`, so singletons stay in place!)
    }
  }

  let sharedStep85Batch = null;
  if (step85Groups.length >= 2) {
    const meshes85 = [];
    for (const g of step85Groups) {
      for (const c of g.children) {
        if (isEligibleParisStaticMesh(c)) meshes85.push(c);
      }
    }
    if (meshes85.length >= 2) {
      sharedStep85Batch = new THREE.Group();
      sharedStep85Batch.name = 'paris_shared_step85_batch';
      root.add(sharedStep85Batch);
      sharedStep85Batch.updateMatrixWorld(true);
      mergeMeshListIntoGroup(meshes85, sharedStep85Batch, 'paris_s85');
    }
  }

  if (sharedStep75Batch || sharedStep85Batch) {
    const origSetStep = parisWorld.setStep.bind(parisWorld);
    parisWorld.setStep = (step = 11.0) => {
      const s = Number.isFinite(Number(step)) ? Number(step) : 11.0;
      origSetStep(s);
      if (sharedStep75Batch) sharedStep75Batch.visible = s >= 7.5;
      if (sharedStep85Batch) sharedStep85Batch.visible = s >= 8.5;
    };
    const curStep = parisWorld.getMetrics?.()?.step ?? 11.0;
    parisWorld.setStep(curStep);
  }

  const state = {
    meshesMergedAway,
    shadowCastersCulled,
  };
  parisWorld.__s4ParisWorldBatchState = state;
  return state;
}
