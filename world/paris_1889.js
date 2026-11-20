/**
 * Surrounding 1889 Paris World Orchestrator (`world/paris_1889.js`)
 *
 * Transforms the surrounding 1889 Paris & Exposition Universelle context
 * (Parvis, Caisson Pits, Seine, Pont d'Iéna, Chaillot/Trocadéro, Champ-de-Mars Palaces,
 * Fontaine Coutan, Galerie des Machines, École Militaire, Invalides & Haussmannian Paris)
 * into a refined Monochrome Collodion Photograph & Architectural Pen-and-Ink Maquette:
 *
 *   1. **100% Real Light Sources Only (`0` Emissive / `0` Unlit Shaders)**:
 *      Every surrounding surface and water body (`seine_river_pbr`, ornamental basins)
 *      uses `MeshStandardMaterial` (`emissive = 0x000000`, `fog = true`, `receiveShadow = true`)
 *      with real-shadow-gated `45°` copperplate cross-hatching.
 *   2. **Complete Architectural Pen-and-Ink Outlines**:
 *      Batches `EdgesGeometry` + explicit cupola meridian ribs + semicircular arcade bays +
 *      Haussmann cornice/mansard contours + botanical bough ink strokes across BOTH permanent
 *      and step-conditional visibility groups, with view-space depth bias (`0` z-fighting)
 *      and distance ink-softening (`#383531` -> `#7a756d` -> `0%` alpha).
 *   3. **Botanical Etching Park Trees**:
 *      Multi-branched skeletal timber trunks (`#4b4640`) + porous alpha-tested (`0.44`)
 *      silver-gelatin chestnut foliage clusters (`#635f57`) casting dappled leafy shadows.
 *   4. **Distance Fog Limiting Render Distance**:
 *      Harmonized with archival sky mist (`day #e6e2da`, `dusk #e4ddd0`, `night #dad5cb`)
 *      via global `THREE.Fog` + Hybrid World-Radial (`165..960 m`) + Camera-Range (`430..1340 m`)
 *      mist closing 100.0% more than 700 m before any `+-1700 m` world skirt edge.
 */

import {
  EXHIBITION_FOG_PRESETS,
  WORLD_DISTANCE_LIMITS,
  createWorldMistUniforms,
  updateWorldMistUniformsForMood,
  applyExhibitionDistanceFog,
  createSketchInkLineMaterial,
  auditWorldSketchAndFog,
} from './distance_fog.js';
import {
  PARIS_SKETCH_WORLD_PALETTE,
  createSketchWorldMaterials,
  createSkeletalTreeTrunkGeometry,
  createBotanicalCrownClusterGeometry,
} from './sketch_materials.js';
import { buildParvisAndSeine } from './w_parvis_seine.js';
import { buildTrocadero } from './w_trocadero.js';
import { buildChampDeMars } from './w_champ_de_mars.js';

function mergeGroupMeshesByMaterial(THREE, grp, castShadowMats) {
  for (const child of grp.children) {
    if (child.isGroup) mergeGroupMeshesByMaterial(THREE, child, castShadowMats);
  }
  const buckets = new Map();
  for (const child of grp.children) {
    if (!child.isMesh || child.isInstancedMesh || child.material?.isShaderMaterial) continue;
    if (child.name === 'seine_river_pbr') continue;
    let list = buckets.get(child.material);
    if (!list) buckets.set(child.material, (list = []));
    list.push(child);
  }
  for (const [mat, meshes] of buckets.entries()) {
    const shouldCast = castShadowMats.has(mat);
    if (meshes.length < 2) {
      for (const m of meshes) {
        m.receiveShadow = true;
        m.castShadow = shouldCast;
      }
      continue;
    }
    let vCount = 0;
    let iCount = 0;
    const geos = meshes.map((m) => {
      m.updateMatrix();
      const g = m.geometry.clone();
      g.applyMatrix4(m.matrix);
      const nV = g.attributes.position.count;
      vCount += nV;
      iCount += g.index ? g.index.count : nV;
      grp.remove(m);
      m.geometry.dispose();
      return g;
    });
    const pos = new Float32Array(vCount * 3);
    const nrm = new Float32Array(vCount * 3);
    const uvs = new Float32Array(vCount * 2);
    const idx = vCount > 65535 ? new Uint32Array(iCount) : new Uint16Array(iCount);
    let vOff = 0;
    let iOff = 0;
    for (const g of geos) {
      pos.set(g.attributes.position.array, vOff * 3);
      if (g.attributes.normal) nrm.set(g.attributes.normal.array, vOff * 3);
      if (g.attributes.uv) uvs.set(g.attributes.uv.array, vOff * 2);
      const nV = g.attributes.position.count;
      if (g.index) {
        const gI = g.index.array;
        for (let k = 0; k < gI.length; k++) idx[iOff + k] = gI[k] + vOff;
        iOff += gI.length;
      } else {
        for (let k = 0; k < nV; k++) idx[iOff + k] = vOff + k;
        iOff += nV;
      }
      vOff += nV;
      g.dispose();
    }
    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    merged.setIndex(new THREE.BufferAttribute(idx, 1));
    merged.computeBoundingSphere();
    const mergedMesh = new THREE.Mesh(merged, mat);
    mergedMesh.receiveShadow = true;
    mergedMesh.castShadow = shouldCast;
    grp.add(mergedMesh);
  }
}

/**
 * Determine which visibility root owns an object:
 * permanent top-level sub-builders (`parvis_seine_iena`, `trocadero_chaillot`, `champ_de_mars_paris`)
 * roll up into `rootGroup`, whereas nested step-conditional groups (`palaisWingsGroup`, `expoGrandGroup`,
 * `fountainGroup`, `pitGroups`, etc.) own their own `LineSegments` so step visibility stays 100% synced.
 */
function findSketchVisibilityOwner(obj, rootGroup, permanentTopGroups) {
  let cur = obj.parent;
  while (cur && cur !== rootGroup) {
    if (cur.isGroup && !permanentTopGroups.has(cur)) {
      return cur;
    }
    cur = cur.parent;
  }
  return rootGroup;
}

export function createParis1889World({
  THREE,
  scene = null,
  mood = 'day',
  autoConfigureFog = true,
  skipOverwrittenFloorMaps = false,
  rawWorldMaps = null,
} = {}) {
  if (!THREE) throw new Error('createParis1889World requires { THREE }.');

  const group = new THREE.Group();
  group.name = 'paris_1889_world';
  if (scene) scene.add(group);

  const mistUniforms = createWorldMistUniforms(THREE, mood);
  if (scene && autoConfigureFog) {
    if (!scene.fog || scene.fog.isFogExp2) {
      applyExhibitionDistanceFog({ THREE, scene, mood, mistUniforms });
    }
  }

  const pal = createSketchWorldMaterials(THREE, mistUniforms, {
    skipOverwrittenFloorMaps,
    rawWorldMaps,
  });
  const treeList = [];
  const permLamps = [];
  const expoLamps = [];
  const dummy = new THREE.Object3D();

  // Map<THREE.Group, number[]> storing explicit 3D pen-and-ink line segment floats `[x0,y0,z0,x1,y1,z1,...]`
  const explicitSketchMap = new Map();
  const getExplicitBuf = (grp) => {
    let arr = explicitSketchMap.get(grp);
    if (!arr) {
      arr = [];
      explicitSketchMap.set(grp, arr);
    }
    return arr;
  };

  const lineSeg = (targetGrp, x0, y0, z0, x1, y1, z1) => {
    getExplicitBuf(targetGrp).push(x0, y0, z0, x1, y1, z1);
  };

  const ring = (targetGrp, cx, y, cz, rx, rz = rx, segs = 20) => {
    const buf = getExplicitBuf(targetGrp);
    const tau = Math.PI * 2.0;
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * tau;
      const a1 = ((i + 1) / segs) * tau;
      buf.push(
        cx + Math.cos(a0) * rx,
        y,
        cz + Math.sin(a0) * rz,
        cx + Math.cos(a1) * rx,
        y,
        cz + Math.sin(a1) * rz
      );
    }
  };

  const archCurve = (
    targetGrp,
    cx,
    springY,
    cz,
    halfSpan,
    riseH,
    axis = 'x',
    yaw = 0,
    segs = 10
  ) => {
    const buf = getExplicitBuf(targetGrp);
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const mapPt = (t) => {
      const localHoriz = Math.cos(t) * halfSpan;
      const ly = springY + Math.sin(t) * riseH;
      const lx = axis === 'x' ? localHoriz : 0;
      const lz = axis === 'z' ? localHoriz : 0;
      return [cx + lx * cosY + lz * sinY, ly, cz - lx * sinY + lz * cosY];
    };
    // Vertical jambs down from spring line + semicircular intrados arch
    const [jx0, , jz0] = mapPt(0);
    const [jx1, , jz1] = mapPt(Math.PI);
    const jambDrop = Math.min(springY, riseH * 1.45);
    buf.push(jx0, springY - jambDrop, jz0, jx0, springY, jz0);
    buf.push(jx1, springY - jambDrop, jz1, jx1, springY, jz1);
    for (let s = 0; s < segs; s++) {
      const [x0, y0, z0] = mapPt((s / segs) * Math.PI);
      const [x1, y1, z1] = mapPt(((s + 1) / segs) * Math.PI);
      buf.push(x0, y0, z0, x1, y1, z1);
    }
  };

  const addHaussmannSketch = (targetGrp, cx, yGround, cz, wx, h, wz, yaw) => {
    const buf = getExplicitBuf(targetGrp);
    const hw = wx * 0.5;
    const hz = wz * 0.5;
    const rw = wx * 0.74 * 0.5 * 0.78;
    const rz = wz * 0.74 * 0.5 * 0.78;
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const pt = (lx, y, lz) => [cx + lx * cosY + lz * sinY, y, cz - lx * sinY + lz * cosY];

    const corners = [
      [-hw, -hz],
      [hw, -hz],
      [hw, hz],
      [-hw, hz],
    ];
    const roofTopCorners = [
      [-rw, -rz],
      [rw, -rz],
      [rw, rz],
      [-rw, rz],
    ];
    const y0 = yGround;
    const yArc = yGround + h * 0.22;
    const yCornice = yGround + h;
    const yMansardTop = yCornice + 4.2;

    for (let i = 0; i < 4; i++) {
      const [xA, zA] = corners[i];
      const [xB, zB] = corners[(i + 1) % 4];
      const [rxA, rzA] = roofTopCorners[i];
      const [rxB, rzB] = roofTopCorners[(i + 1) % 4];

      // Vertical building corner
      const pBot = pt(xA, y0, zA);
      const pTop = pt(xA, yCornice, zA);
      buf.push(pBot[0], pBot[1], pBot[2], pTop[0], pTop[1], pTop[2]);

      // Crowning cornice edge + entresol string-course
      const pTopNext = pt(xB, yCornice, zB);
      buf.push(pTop[0], pTop[1], pTop[2], pTopNext[0], pTopNext[1], pTopNext[2]);
      const pArcA = pt(xA, yArc, zA);
      const pArcB = pt(xB, yArc, zB);
      buf.push(pArcA[0], pArcA[1], pArcA[2], pArcB[0], pArcB[1], pArcB[2]);

      // Mansard hip edge & zinc roof crest rectangle
      const pRoofA = pt(rxA, yMansardTop, rzA);
      const pRoofB = pt(rxB, yMansardTop, rzB);
      buf.push(pTop[0], pTop[1], pTop[2], pRoofA[0], pRoofA[1], pRoofA[2]);
      buf.push(pRoofA[0], pRoofA[1], pRoofA[2], pRoofB[0], pRoofB[1], pRoofB[2]);
    }
  };

  const instanced = (parent, geo, mat, tuples, opts = {}) => {
    if (!tuples.length) return null;
    const mesh = new THREE.InstancedMesh(geo, mat, tuples.length);
    for (let i = 0; i < tuples.length; i++) {
      const [x, y, z, sx, sy, sz, ry = 0] = tuples[i];
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, ry, 0);
      dummy.scale.set(sx, sy, sz);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.receiveShadow = true;
    mesh.castShadow = Boolean(opts.castShadow);
    if (opts.customDepthMaterial) {
      mesh.customDepthMaterial = opts.customDepthMaterial;
    }
    parent.add(mesh);
    return mesh;
  };

  const ctx = {
    THREE,
    pal,
    instanced,
    lineSeg,
    ring,
    archCurve,
    addHaussmannSketch,
    box(parent, mat, x, y, z, sx, sy, sz, ry = 0, opts = {}) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
      m.position.set(x, y, z);
      if (ry) m.rotation.y = ry;
      m.receiveShadow = true;
      if (opts.noSketchEdges) m.userData.noSketchEdges = true;
      parent.add(m);
      return m;
    },
    cyl(parent, mat, x, y, z, rt, rb, h, seg = 16, opts = {}) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
      m.position.set(x, y, z);
      m.receiveShadow = true;
      if (opts.noSketchEdges) m.userData.noSketchEdges = true;
      parent.add(m);
      if (!opts.noSketchRings) {
        const ringSegs = Math.max(12, seg);
        ring(parent, x, y + h * 0.5, z, rt * 1.003, rt * 1.003, ringSegs);
        if (h > 0.35) {
          ring(parent, x, y - h * 0.5, z, rb * 1.003, rb * 1.003, ringSegs);
        }
        if (opts.pilasters) {
          const nPil = opts.pilasters;
          for (let k = 0; k < nPil; k++) {
            const a = (k / nPil) * Math.PI * 2.0;
            lineSeg(
              parent,
              x + Math.cos(a) * rb * 1.004,
              y - h * 0.5,
              z + Math.sin(a) * rb * 1.004,
              x + Math.cos(a) * rt * 1.004,
              y + h * 0.5,
              z + Math.sin(a) * rt * 1.004
            );
          }
        }
      }
      return m;
    },
    dome(parent, mat, x, y, z, r, h, seg = 18, opts = {}) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(r, seg, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
        mat
      );
      m.position.set(x, y, z);
      m.scale.y = h / Math.max(0.01, r);
      m.receiveShadow = true;
      m.userData.noSketchEdges = true; // Replaced by clean analytical meridian ribs + collar rings!
      parent.add(m);

      if (opts.sketchRibs !== false) {
        const nRibs = opts.ribs || 12;
        const arcSteps = 7;
        const rr = r * 1.006;
        const hh = h * 1.006;
        ring(parent, x, y + 0.02, z, rr, rr, Math.max(16, seg));
        ring(
          parent,
          x,
          y + Math.sin(Math.PI * 0.41) * hh,
          z,
          Math.cos(Math.PI * 0.41) * rr,
          Math.cos(Math.PI * 0.41) * rr,
          Math.max(10, Math.floor(seg * 0.75))
        );
        for (let k = 0; k < nRibs; k++) {
          const az = (k / nRibs) * Math.PI * 2.0;
          const ca = Math.cos(az);
          const sa = Math.sin(az);
          for (let s = 0; s < arcSteps; s++) {
            const el0 = (s / arcSteps) * Math.PI * 0.48;
            const el1 = ((s + 1) / arcSteps) * Math.PI * 0.48;
            lineSeg(
              parent,
              x + ca * Math.cos(el0) * rr,
              y + Math.sin(el0) * hh,
              z + sa * Math.cos(el0) * rr,
              x + ca * Math.cos(el1) * rr,
              y + Math.sin(el1) * hh,
              z + sa * Math.cos(el1) * rr
            );
          }
        }
      }
      return m;
    },
    addTree: (x, y, z, s = 1.0) => treeList.push([x, y, z, s]),
    addLamp: (x, y, z, s = 1.0, expoOnly = false) =>
      (expoOnly ? expoLamps : permLamps).push([x, y, z, s]),
  };

  const parvisSeine = buildParvisAndSeine(ctx);
  const trocadero = buildTrocadero(ctx);
  const champDeMars = buildChampDeMars(ctx);
  group.add(parvisSeine.group, trocadero.group, champDeMars.group);

  // Add subtle pen-and-ink trunk & forked-bough strokes for foreground/midground park trees
  for (const [tx, ty, tz, s] of treeList) {
    if (Math.hypot(tx, tz) > 480) continue;
    const yaw = ((tx * 0.13 + tz * 0.07) % (Math.PI * 2));
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    lineSeg(group, tx, ty + 0.1, tz, tx, ty + 3.0 * s, tz);
    lineSeg(group, tx, ty + 2.8 * s, tz, tx + cy * 1.2 * s, ty + 5.2 * s, tz + sy * 1.2 * s);
    lineSeg(group, tx, ty + 2.9 * s, tz, tx - cy * 1.15 * s, ty + 5.3 * s, tz - sy * 1.15 * s);
    lineSeg(group, tx, ty + 3.1 * s, tz, tx - sy * 1.1 * s, ty + 5.5 * s, tz + cy * 1.1 * s);
  }

  // Extract per-visibility-group `EdgesGeometry` BEFORE mesh merging so `noSketchEdges` flags
  // stay exact and every Exposition & permanent building receives crisp pen-and-ink outlines!
  const permanentTopGroups = new Set([parvisSeine.group, trocadero.group, champDeMars.group]);
  const archEdgeMats = new Set([
    pal.stone,
    pal.cream,
    pal.terracottaBand,
    pal.marble,
    pal.expoBrick,
    pal.slate,
    pal.expoIron,
    pal.copper,
    pal.gold,
    pal.wood,
    pal.glass,
  ]);

  const ownerEdgeChunks = new Map();
  const invOwnerMat = new THREE.Matrix4();
  const relMat = new THREE.Matrix4();

  group.updateMatrixWorld(true);
  group.traverse((obj) => {
    if (!obj.isMesh || obj.isInstancedMesh) return;
    if (obj.userData.noSketchEdges) return;
    if (!archEdgeMats.has(obj.material)) return;

    const owner = findSketchVisibilityOwner(obj, group, permanentTopGroups);
    invOwnerMat.copy(owner.matrixWorld).invert();
    relMat.multiplyMatrices(invOwnerMat, obj.matrixWorld);

    const eGeo = new THREE.EdgesGeometry(obj.geometry, 22);
    eGeo.applyMatrix4(relMat);
    const arr = eGeo.attributes.position?.array;
    if (arr && arr.length > 0) {
      let chunks = ownerEdgeChunks.get(owner);
      if (!chunks) ownerEdgeChunks.set(owner, (chunks = []));
      chunks.push(new Float32Array(arr));
    }
    eGeo.dispose();
  });

  // Merge explicit pen-and-ink buffers (`explicitSketchMap`) with `EdgesGeometry` chunks per owner
  for (const [grp, explicitArr] of explicitSketchMap.entries()) {
    if (!explicitArr.length) continue;
    const owner = permanentTopGroups.has(grp) ? group : grp;
    let chunks = ownerEdgeChunks.get(owner);
    if (!chunks) ownerEdgeChunks.set(owner, (chunks = []));
    chunks.push(new Float32Array(explicitArr));
  }

  // Merge static architectural/ground meshes per material per visibility group
  const castShadowMats = new Set([
    pal.stone,
    pal.cream,
    pal.marble,
    pal.expoBrick,
    pal.slate,
    pal.expoIron,
    pal.copper,
    pal.gold,
    pal.wood,
  ]);
  mergeGroupMeshesByMaterial(THREE, group, castShadowMats);

  // Build shared ink line material & attach one batched `LineSegments` per visibility owner
  const inkLineMaterial = createSketchInkLineMaterial(THREE, mistUniforms, {
    name: 'paris_sketch_ink_line',
    opacity: 0.54,
  });
  const sketchEdgeGroups = [];
  let rootSketchEdges = null;
  let totalEdgeSegments = 0;

  for (const [owner, chunks] of ownerEdgeChunks.entries()) {
    let totalFloats = 0;
    for (const c of chunks) totalFloats += c.length;
    if (totalFloats === 0) continue;

    const combined = new Float32Array(totalFloats);
    let off = 0;
    for (const c of chunks) {
      combined.set(c, off);
      off += c.length;
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(combined, 3));
    lineGeo.computeBoundingSphere();

    const lines = new THREE.LineSegments(lineGeo, inkLineMaterial);
    lines.name = owner === group ? 'paris_sketch_edges' : `${owner.name || 'sub'}_sketch_edges`;
    lines.renderOrder = 1;
    owner.add(lines);
    sketchEdgeGroups.push(lines);
    totalEdgeSegments += Math.floor(totalFloats / 6);
    if (owner === group) rootSketchEdges = lines;
  }

  // Multi-Branched Skeletal Timber Trunks + Porous Silver-Gelatin Botanical Chestnut Crowns
  const trunkTuples = [];
  const crownTuples = [];
  for (const [x, y, z, s] of treeList) {
    const yaw = (x * 0.17 + z * 0.11) % (Math.PI * 2.0);
    trunkTuples.push([x, y, z, s, s, s, yaw]);
    crownTuples.push([x, y, z, s, s * (0.96 + ((Math.abs(x + z) % 5) * 0.02)), s, yaw]);
  }
  instanced(group, createSkeletalTreeTrunkGeometry(THREE), pal.bark, trunkTuples, {
    castShadow: true,
  });
  instanced(group, createBotanicalCrownClusterGeometry(THREE), pal.foliage, crownTuples, {
    castShadow: true,
    customDepthMaterial: pal.foliageDepthMaterial,
  });

  // Sculpted Parisian Cast-Iron *Candélabres Oudry* (`0` emissive opaline globes)
  const buildLampBatch = (list, batchName) => {
    const g = new THREE.Group();
    g.name = batchName;
    const bases = [];
    const shafts = [];
    const globes = [];
    for (const [x, y, z, s] of list) {
      bases.push([x, y + 0.55 * s, z, 0.24 * s, 1.1 * s, 0.24 * s, 0]);
      shafts.push([x, y + 2.45 * s, z, 0.11 * s, 2.9 * s, 0.11 * s, 0]);
      globes.push([x, y + 4.10 * s, z, 0.26 * s, 0.35 * s, 0.26 * s, 0]);
    }
    instanced(g, new THREE.CylinderGeometry(0.55, 0.95, 1, 8), pal.expoIron, bases);
    instanced(g, new THREE.CylinderGeometry(0.42, 0.72, 1, 8), pal.expoIron, shafts);
    instanced(g, new THREE.SphereGeometry(1, 10, 8), pal.gasGlobe, globes);
    group.add(g);
    return g;
  };
  buildLampBatch(permLamps, 'paris_permanent_gasoliers');
  const expoLampGroup = buildLampBatch(expoLamps, 'paris_expo_gasoliers');

  let currentStep = 11.0;
  let edgesVisible = true;

  function setStep(step = 11.0) {
    const s = Number.isFinite(Number(step)) ? Number(step) : 11.0;
    currentStep = s;
    parvisSeine.setStep(s);
    trocadero.setStep(s);
    champDeMars.setStep(s);
    expoLampGroup.visible = s >= 8.0;
  }

  function setVisible(visible) {
    group.visible = Boolean(visible);
  }

  function setEdgesVisible(visible) {
    edgesVisible = Boolean(visible);
    for (const segs of sketchEdgeGroups) {
      segs.visible = edgesVisible;
    }
  }

  function setMood(nextMood = 'day') {
    if (scene) {
      applyExhibitionDistanceFog({ THREE, scene, mood: nextMood, mistUniforms });
    } else {
      updateWorldMistUniformsForMood(mistUniforms, nextMood);
    }
  }

  // Strictly zero emissive mutations in Museum Exhibition mode — 100% real light sources only
  function setNightFactor() {
    // Intentional no-op
  }

  function update(dt = 0, elapsedSec = 0) {
    parvisSeine.update(dt, elapsedSec);
  }

  function getMetrics() {
    return {
      step: currentStep,
      edgesVisible,
      sketchLineGroupCount: sketchEdgeGroups.length,
      sketchLineSegments: totalEdgeSegments,
      treeCount: treeList.length,
      lampCount: permLamps.length + expoLamps.length,
      distanceLimits: WORLD_DISTANCE_LIMITS,
    };
  }

  const api = {
    group,
    sketchEdges: rootSketchEdges,
    sketchEdgeGroups,
    mistUniforms,
    materials: pal,
    setVisible,
    setEdgesVisible,
    setStep,
    setMood,
    setNightFactor,
    update,
    getMetrics,
    audit: () => auditWorldSketchAndFog({ THREE, scene, parisWorld: api }),
  };

  setStep(11.0);
  return api;
}

export {
  EXHIBITION_FOG_PRESETS,
  WORLD_DISTANCE_LIMITS,
  PARIS_SKETCH_WORLD_PALETTE,
  applyExhibitionDistanceFog,
  auditWorldSketchAndFog,
};
