/**
 * Tower Parvis, Step-Aware Caisson Excavation Pits, Quai d'Orsay & Quai de Billy Embankments,
 * Real PBR Collodion Seine & 5-Arch Pont d'Iéna (`world/w_parvis_seine.js`).
 *
 * Features:
 *   - Exact 4-pier excavation pit cutouts (`|x +- 52| < 17.5`, `|z +- 52| < 17.5`) with timber
 *     shoring struts and pen-and-ink plank outlines for Stops 01 (`#13`) & 02 (`#09`).
 *   - 100% real-light `MeshStandardMaterial` Seine (`0xb7b4ae`) & ornamental Parvis basins (`0xaba8a1`)
 *     with `0` emissive/unlit shaders, animated tileable normal ripples, and bankside optical depth.
 *   - Continuous `+-1700 m` embankment & river skirts extending >700 m past 100% distance-fog closure.
 *   - Explicit semicircular arch intrados & cutwater ink lines on the 5-arch Pont d'Iéna.
 */

function smooth01(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function buildParvisAndSeine(ctx) {
  const { THREE, pal, box, cyl, dome, lineSeg, archCurve } = ctx;
  const group = new THREE.Group();
  group.name = 'parvis_seine_iena';

  // 1. Parvis 5x5 Ground Patch Grid (Z in [-128, +85], X in [-115, +115]) with exact 4 Pier Pit Cutouts
  const xs = [-115, -69.5, -34.5, 34.5, 69.5, 115];
  const zs = [-128, -69.5, -34.5, 34.5, 69.5, 85];
  for (let ix = 0; ix < 5; ix++) {
    for (let iz = 0; iz < 5; iz++) {
      if ((ix === 1 || ix === 3) && (iz === 1 || iz === 3)) continue;
      const x0 = xs[ix];
      const x1 = xs[ix + 1];
      const z0 = zs[iz];
      const z1 = zs[iz + 1];
      box(group, pal.gravel, 0.5 * (x0 + x1), -0.14, 0.5 * (z0 + z1), x1 - x0, 0.24, z1 - z0, 0, {
        noSketchEdges: true,
      });
    }
  }
  // Wide Left-Bank / Champ-de-Mars continuous gravel skirt out to +-1700 m (matching foreground texel density!)
  const skirtMat = pal.gravelSkirt || pal.gravel;
  box(group, skirtMat, -907.5, -0.18, -21.5, 1585, 0.24, 213, 0, { noSketchEdges: true });
  box(group, skirtMat, 907.5, -0.18, -21.5, 1585, 0.24, 213, 0, { noSketchEdges: true });
  box(group, skirtMat, 0, -0.22, 892.5, 3400, 0.24, 1615, 0, { noSketchEdges: true });

  // Subtle Parvis geometric walk border lines in ink
  for (const sx of [-1, 1]) {
    lineSeg(group, sx * 96, 0.01, -124, sx * 96, 0.01, 82);
  }

  // 2. Step-Aware Pier Excavation Pits (|x +- 52| < 17.5, |z +- 52| < 17.5) & Smooth Backfill
  const pitGroups = [];
  const backfillGroups = [];
  const soubCurbGroup = new THREE.Group();
  soubCurbGroup.name = 'parvis_soubassement_curbs';
  const expoParvisGroup = new THREE.Group();
  expoParvisGroup.name = 'parvis_expo_1889';
  group.add(soubCurbGroup, expoParvisGroup);

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const cx = sx * 52.0;
      const cz = sz * 52.0;
      const pGrp = new THREE.Group();
      pGrp.name = `pier_pit_${sx > 0 ? 'E' : 'W'}_${sz > 0 ? 'S' : 'N'}`;
      box(pGrp, pal.earth, cx, -11.74, cz, 29.2, 0.24, 29.2);
      // Sheet-pile cofferdam curb collar around pit rim
      for (let d = 0; d < 4; d++) {
        const ang = d * Math.PI * 0.5;
        const dx = Math.sin(ang);
        const dz = Math.cos(ang);
        const wLow = box(pGrp, pal.earth, cx + dx * 15.1, -8.6, cz + dz * 15.1, 31.6, 6.1, 1.5, ang);
        wLow.rotation.order = 'YXZ';
        wLow.rotation.x = -0.22;
        box(pGrp, pal.earth, cx + dx * 16.2, -5.75, cz + dz * 16.2, 33.4, 0.35, 1.5, ang);
        const wTop = box(pGrp, pal.earth, cx + dx * 17.15, -2.82, cz + dz * 17.15, 35.0, 5.65, 1.3, ang);
        wTop.rotation.order = 'YXZ';
        wTop.rotation.x = -0.19;
        // Timber wale beams & vertical shoring posts (#13 & #09 caisson excavations)
        box(pGrp, pal.wood, cx + dx * 16.3, -2.4, cz + dz * 16.3, 32.8, 0.26, 0.26, ang);
        box(pGrp, pal.wood, cx + dx * 15.3, -5.4, cz + dz * 15.3, 30.8, 0.26, 0.26, ang);
        box(pGrp, pal.wood, cx + dx * 17.35, -0.12, cz + dz * 17.35, 35.2, 0.24, 0.36, ang);
        for (let k = -3; k <= 3; k++) {
          const tangX = dz * k * 4.4;
          const tangZ = -dx * k * 4.4;
          lineSeg(
            pGrp,
            cx + dx * 16.9 + tangX,
            -0.25,
            cz + dz * 16.9 + tangZ,
            cx + dx * 14.8 + tangX,
            -8.2,
            cz + dz * 14.8 + tangZ
          );
        }
      }
      group.add(pGrp);
      pitGroups.push(pGrp);

      const bfGrp = new THREE.Group();
      bfGrp.name = `pier_backfill_${sx > 0 ? 'E' : 'W'}_${sz > 0 ? 'S' : 'N'}`;
      const hole = 2.4;
      box(bfGrp, pal.gravel, cx, -0.14, cz - 9.95, 35.1, 0.24, 17.55 - hole, 0, { noSketchEdges: true });
      box(bfGrp, pal.gravel, cx, -0.14, cz + 9.95, 35.1, 0.24, 17.55 - hole, 0, { noSketchEdges: true });
      box(bfGrp, pal.gravel, cx - 9.95, -0.14, cz, 17.55 - hole, 0.24, hole * 2, 0, { noSketchEdges: true });
      box(bfGrp, pal.gravel, cx + 9.95, -0.14, cz, 17.55 - hole, 0.24, hole * 2, 0, { noSketchEdges: true });
      box(bfGrp, pal.earth, cx, -4.45, cz, 6.4, 0.24, 6.4, 0, { noSketchEdges: true });
      group.add(bfGrp);
      backfillGroups.push(bfGrp);

      const scx = sx * 51.9535;
      const scz = sz * 51.9535;
      for (const side of [-1, 1]) {
        box(soubCurbGroup, pal.stone, scx + side * 12.6, 0.04, scz, 0.85, 0.14, 26.0);
        box(soubCurbGroup, pal.stone, scx, 0.04, scz + side * 12.6, 24.4, 0.14, 0.85);
      }
    }
  }

  // 1889 Under-Tower Parterre & Twin Ornamental Basins ("Bassin de la Tour Eiffel", Photo #38)
  cyl(expoParvisGroup, pal.stone, 0, 0.05, 0, 21.0, 21.2, 0.14, 28);
  cyl(expoParvisGroup, pal.lawn, 0, 0.09, 0, 20.2, 20.2, 0.10, 28, { noSketchRings: true });
  cyl(expoParvisGroup, pal.allee, 0, 0.11, 0, 8.5, 8.5, 0.10, 24);
  for (const sx of [-1, 1]) {
    const bx = sx * 55.5;
    const bz = -75.5;
    cyl(expoParvisGroup, pal.stone, bx, 0.12, bz, 7.6, 7.9, 0.24, 24);
    cyl(expoParvisGroup, pal.marble, bx, 0.38, bz, 6.8, 7.0, 0.52, 24);
    cyl(expoParvisGroup, pal.water, bx, 0.56, bz, 6.3, 6.3, 0.18, 24, { noSketchRings: true });
    cyl(expoParvisGroup, pal.stone, bx, 1.15, bz, 2.6, 3.2, 1.25, 8, { pilasters: 8 });
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI * 0.5 + 0.4;
      box(
        expoParvisGroup,
        pal.marble,
        bx + Math.cos(a) * 2.35,
        1.55,
        bz + Math.sin(a) * 2.35,
        0.95,
        0.95,
        1.35,
        -a
      );
    }
    cyl(expoParvisGroup, pal.marble, bx, 2.35, bz, 1.15, 1.55, 1.35, 12);
    cyl(expoParvisGroup, pal.stone, bx, 3.18, bz, 2.55, 1.35, 0.48, 18);
    cyl(expoParvisGroup, pal.water, bx, 3.38, bz, 2.25, 2.25, 0.12, 18, { noSketchRings: true });
    cyl(expoParvisGroup, pal.marble, bx, 4.25, bz, 0.58, 0.82, 1.65, 10);
    box(expoParvisGroup, pal.copper, bx, 5.45, bz, 0.72, 1.15, 0.72, 0.4);
    dome(expoParvisGroup, pal.gold, bx, 6.05, bz, 0.34, 0.52, 12, { ribs: 6 });
  }

  // 3. Real PBR Collodion Seine River Surface (Z in [-282, -128], Y = -4.20 m, X in [-1700, +1700])
  box(group, pal.earth, 0, -6.3, -205, 3400, 0.3, 162, 0, { noSketchEdges: true });
  const seineGeo = new THREE.PlaneGeometry(3400, 154, 48, 8);
  seineGeo.rotateX(-Math.PI * 0.5);
  const seineMesh = new THREE.Mesh(seineGeo, pal.seineWater);
  seineMesh.name = 'seine_river_pbr';
  seineMesh.position.set(0, -4.2, -205);
  seineMesh.receiveShadow = true;
  group.add(seineMesh);

  let lastExplicitUpdateNow = -1e9;
  const advanceWaterRipples = (tSec) => {
    if (pal.seineNormalMap) {
      pal.seineNormalMap.offset.x = (tSec * 0.014) % 1.0;
      pal.seineNormalMap.offset.y = Math.sin(tSec * 0.18) * 0.018;
    }
    if (pal.basinNormalMap) {
      pal.basinNormalMap.offset.x = Math.cos(tSec * 0.22) * 0.025;
      pal.basinNormalMap.offset.y = Math.sin(tSec * 0.26) * 0.025;
    }
  };

  // Automatic fallback so water stays gently animated even if host loop omits parisWorld.update()
  seineMesh.onBeforeRender = () => {
    const nowMs = typeof performance !== 'undefined' ? performance.now() : 0;
    if (nowMs - lastExplicitUpdateNow > 160) {
      advanceWaterRipples(nowMs * 0.001);
    }
  };

  // Quai d'Orsay (Z = -128) & Quai de Billy (Z = -282) Masonry Embankments
  for (const [qz, sign] of [
    [-128, -1],
    [-282, 1],
  ]) {
    box(group, pal.stone, 0, -3.0, qz - sign * 1.2, 3400, 6.0, 2.6);
    box(group, pal.stone, 0, 0.06, qz - sign * 1.1, 3400, 0.16, 2.8);
    // Horizontal water-line & cornice ink strokes along foreground/midground quais
    lineSeg(group, -920, -4.08, qz + sign * 0.12, 920, -4.08, qz + sign * 0.12);
    lineSeg(group, -920, 0.14, qz + sign * 0.28, 920, 0.14, qz + sign * 0.28);

    for (const sx of [-1, 1]) {
      box(group, pal.stone, sx * 865, -4.85, qz + sign * 2.5, 1700, 2.3, 4.8);
      box(group, pal.stone, sx * 865, 0.52, qz + sign * 0.1, 1700, 0.96, 0.52);
      for (let x = 28; x <= 420; x += 28) {
        ctx.addTree(sx * x, 0, qz - sign * 8.8, 0.90 + (x % 3) * 0.07);
        if (x <= 260) ctx.addLamp(sx * x, 0, qz - sign * 2.2, 1.0, false);
      }
    }
  }

  // Moored 1889 Seine Steam-Packet Bateaux-Hirondelles (monochrome iron & collodion cabin)
  for (const [bx, bz, dir] of [
    [84, -192, 1],
    [-102, -224, -1],
  ]) {
    box(group, pal.expoIron, bx, -3.85, bz, 34, 1.3, 6.2);
    box(group, pal.cream, bx, -2.75, bz, 24, 1.4, 5.2);
    box(group, pal.glass, bx, -2.65, bz, 22, 0.85, 5.35);
    cyl(group, pal.expoIron, bx + dir * 3.5, -0.8, bz, 0.42, 0.48, 3.2, 10);
  }

  // Quai d'Orsay Exposition Riverfront Galleries & Ribbed Corner Pavilions
  for (const sx of [-1, 1]) {
    box(expoParvisGroup, pal.cream, sx * 158, 5.8, -112, 104, 11.6, 17.5);
    box(expoParvisGroup, pal.slate, sx * 158, 12.9, -112, 106, 2.6, 18.8);
    for (let xOff = -42; xOff <= 42; xOff += 14) {
      archCurve(expoParvisGroup, sx * 158 + xOff, 1.0, -103.1, 4.8, 4.2, 'x', 0, 10);
      archCurve(expoParvisGroup, sx * 158 + xOff, 1.0, -120.9, 4.8, 4.2, 'x', 0, 10);
    }
    cyl(expoParvisGroup, pal.cream, sx * 108, 12.4, -112, 6.6, 7.0, 2.8, 16, { pilasters: 8 });
    dome(expoParvisGroup, pal.copper, sx * 108, 13.8, -112, 6.6, 6.4, 18, { ribs: 12 });
  }

  // 4. 5-Arch Masonry Pont d'Iéna (X in [-14.5, +14.5], Z in [-282, -128], roadway Y = +0.08 m)
  box(group, pal.allee, 0, -0.18, -205, 19.2, 0.52, 155.4);
  for (const sx of [-1, 1]) {
    box(group, pal.stone, sx * 12.05, -0.12, -205, 4.9, 0.64, 155.4);
    box(group, pal.stone, sx * 14.2, 0.62, -205, 0.50, 0.86, 154.6);
    box(group, pal.stone, sx * 14.35, 0.12, -205, 0.82, 0.26, 155.2);
    // Bridge abutment equestrian sculpture pedestals (Guerriers de Pont d'Iéna)
    for (const az of [-129.2, -280.8]) {
      box(group, pal.stone, sx * 14.3, 1.65, az, 2.2, 3.3, 2.8);
      box(group, pal.marble, sx * 14.3, 3.85, az, 1.1, 1.5, 1.8);
    }
  }
  const pierZs = [-129.2, -158.8, -189.6, -220.4, -251.2, -280.8];
  for (let i = 0; i < pierZs.length; i++) {
    const pz = pierZs[i];
    box(group, pal.stone, 0, -3.1, pz, 29.2, 6.2, 3.4);
    if (i > 0 && i < 5) {
      for (const sx of [-1, 1]) {
        cyl(group, pal.stone, sx * 14.6, -3.1, pz, 1.65, 1.85, 6.1, 12, { pilasters: 6 });
        dome(group, pal.stone, sx * 14.6, -0.05, pz, 1.65, 0.65, 12, { ribs: 6 });
      }
      ctx.addLamp(-14.2, 1.05, pz, 0.88, false);
      ctx.addLamp(14.2, 1.05, pz, 0.88, false);
    }
  }
  for (let a = 0; a < 5; a++) {
    const zStart = pierZs[a] - 1.5;
    const zEnd = pierZs[a + 1] + 1.5;
    const span = Math.abs(zEnd - zStart);
    const zMid = 0.5 * (zStart + zEnd);
    for (let s = 0; s < 10; s++) {
      const um = ((s + 0.5) / 10) * 2 - 1;
      const archY = -0.58 - 2.95 * um * um;
      const hSp = Math.max(0.48, 0.04 - archY);
      box(group, pal.stone, 0, archY + hSp * 0.5, zMid - um * span * 0.5, 29.0, hSp, span / 10 + 0.18, 0, {
        noSketchEdges: true,
      });
    }
    // Crisp drawn parabolic/segmental arch intrados & extrados ink rings on both bridge faces
    for (const sx of [-1, 1]) {
      const faceX = sx * 14.54;
      const segs = 16;
      for (let s = 0; s < segs; s++) {
        const u0 = (s / segs) * 2 - 1;
        const u1 = ((s + 1) / segs) * 2 - 1;
        const z0 = zMid - u0 * span * 0.5;
        const z1 = zMid - u1 * span * 0.5;
        const y0 = -0.58 - 2.95 * u0 * u0;
        const y1 = -0.58 - 2.95 * u1 * u1;
        lineSeg(group, faceX, y0, z0, faceX, y1, z1);
        lineSeg(group, faceX, y0 + 0.44, z0, faceX, y1 + 0.44, z1);
      }
      // Imperial spandrel medallion wreath
      const med = cyl(group, pal.marble, sx * 14.56, -0.95, zMid, 0.95, 0.95, 0.16, 12, {
        noSketchRings: true,
      });
      med.rotation.z = Math.PI * 0.5;
    }
  }

  return {
    group,
    seineMesh,
    setStep(step) {
      for (const pg of pitGroups) pg.visible = step < 1.28;
      const showBf = step >= 1.15;
      const bfRise = smooth01(1.15, 1.32, step);
      for (const bg of backfillGroups) {
        bg.visible = showBf;
        bg.position.y = (1 - bfRise) * -4.2;
      }
      soubCurbGroup.visible = step >= 4.1;
      expoParvisGroup.visible = step >= 8.5;
    },
    update(dt, elapsedSec) {
      lastExplicitUpdateNow = typeof performance !== 'undefined' ? performance.now() : 0;
      advanceWaterRipples(elapsedSec);
    },
  };
}
