/**
 * Champ-de-Mars Axial Lawns & Gravel Allées, Botanical Chestnut Rows, 1889 Fontaine Coutan,
 * Palais des Beaux-Arts / Arts Libéraux, Dôme Central, 420m Glazed Galerie des Machines &
 * Lithographic Haussmannian Paris (`world/w_champ_de_mars.js`).
 *
 * Features:
 *   - True 1889 Formigé proportions on Palais des Beaux-Arts & Arts Libéraux,
 *     with full architectural arcade bay curves, iron lattice purlins, and ribbed cupolas.
 *   - Boulevard setback (`|X| >= 262 m`) so Stop 11 Hero Finale (`[240, 52, 440]`) overlooks
 *     tree-lined Parisian avenues and sculpted Exposition palaces rather than raw `1x1x1` boxes.
 *   - Outer Haussmannian districts culled cleanly at `R_xz <= 920 m` over a continuous
 *     `+-1700 m` street skirt so 100.0% mist closure (`960 m`) hides every world boundary.
 */

import { createHaussmannBlockGeometry } from './sketch_materials.js';

function makeGableVaultGeo(THREE, widthX, spanZ, wallH, apexH) {
  const hw = widthX * 0.5;
  const hz = spanZ * 0.5;
  const shoulderH = wallH + (apexH - wallH) * 0.58;
  const prof = [
    [-hz, 0],
    [-hz, wallH],
    [-hz * 0.56, shoulderH],
    [0, apexH],
    [hz * 0.56, shoulderH],
    [hz, wallH],
    [hz, 0],
  ];
  const pos = [];
  const uvs = [];
  const idx = [];
  for (let i = 0; i < prof.length - 1; i++) {
    const [z0, y0] = prof[i];
    const [z1, y1] = prof[i + 1];
    const base = pos.length / 3;
    pos.push(-hw, y0, z0, hw, y0, z0, hw, y1, z1, -hw, y1, z1);
    uvs.push(0, 0, widthX * 0.04, 0, widthX * 0.04, 1, 0, 1);
    idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }
  for (const sx of [-1, 1]) {
    const cBase = pos.length / 3;
    pos.push(sx * hw, 0, 0);
    uvs.push(0.5, 0);
    for (const [zp, yp] of prof) {
      pos.push(sx * hw, yp, zp);
      uvs.push(0.5 + zp / spanZ, yp / apexH);
    }
    for (let i = 1; i < prof.length; i++) {
      if (sx > 0) idx.push(cBase, cBase + i, cBase + i + 1);
      else idx.push(cBase, cBase + i + 1, cBase + i);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function hash01(a, b) {
  let n = (a * 374761393 + b * 668265263) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

export function buildChampDeMars(ctx) {
  const { THREE, pal, box, cyl, dome, instanced, lineSeg, archCurve, addHaussmannSketch } = ctx;
  const group = new THREE.Group();
  group.name = 'champ_de_mars_paris';

  const chantierFenceGroup = new THREE.Group();
  chantierFenceGroup.name = 'cdm_chantier_fence';
  const gardensGroup = new THREE.Group();
  gardensGroup.name = 'cdm_parterre_gardens';
  const fountainGroup = new THREE.Group();
  fountainGroup.name = 'cdm_fontaine_coutan';
  const awningGroup = new THREE.Group();
  awningGroup.name = 'cdm_promenade_awnings';
  const palaisWingsGroup = new THREE.Group();
  palaisWingsGroup.name = 'cdm_palais_wings';
  const expoGrandGroup = new THREE.Group();
  expoGrandGroup.name = 'cdm_dome_central_machines';
  group.add(
    chantierFenceGroup,
    gardensGroup,
    fountainGroup,
    awningGroup,
    palaisWingsGroup,
    expoGrandGroup
  );

  // 1. Central Sightline Corridor (|X| <= 30 m, Z in [+85, +560]): strictly Y <= +0.16 m!
  box(group, pal.allee, 0, 0.02, 332, 96, 0.06, 496, 0, { noSketchEdges: true });
  box(chantierFenceGroup, pal.wood, 0, 0.92, 74.5, 136, 1.84, 0.22);

  for (let p = 0; p < 5; p++) {
    const zp = 212 + p * 66;
    for (const sx of [-1, 1]) {
      box(gardensGroup, pal.stone, sx * 12.2, 0.06, zp, 17.6, 0.08, 52.0);
      box(gardensGroup, pal.lawn, sx * 12.2, 0.09, zp, 16.4, 0.08, 50.8, 0, {
        noSketchEdges: true,
      });
    }
  }

  // 2. 1889 Fontaine Coutan ([0, 0, +155 m], visible step >= 8.5, hidden step < 8.5)
  const fRim = cyl(fountainGroup, pal.stone, 0, 0.31, 155, 15.4, 15.8, 0.62, 32, {
    noSketchRings: true,
  });
  fRim.scale.z = 1.42;
  ctx.ring(fountainGroup, 0, 0.63, 155, 15.4, 15.4 * 1.42, 32);
  const fWat = cyl(fountainGroup, pal.water, 0, 0.48, 155, 14.5, 14.5, 0.08, 32, {
    noSketchRings: true,
  });
  fWat.scale.z = 1.42;
  const fBase = cyl(fountainGroup, pal.marble, 0, 1.35, 155, 6.2, 7.6, 1.8, 20, {
    noSketchRings: true,
  });
  fBase.scale.z = 1.25;
  ctx.ring(fountainGroup, 0, 2.25, 155, 6.2, 6.2 * 1.25, 20);
  cyl(fountainGroup, pal.marble, 0, 3.25, 155, 4.1, 5.2, 2.2, 16, { pilasters: 8 });
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI * 0.5 + Math.PI * 0.25;
    box(
      fountainGroup,
      pal.marble,
      Math.cos(a) * 5.2,
      2.3,
      155 + Math.sin(a) * 6.2,
      2.1,
      2.0,
      2.8,
      -a
    );
  }
  cyl(fountainGroup, pal.marble, 0, 6.1, 155, 1.9, 3.1, 3.6, 12, { pilasters: 6 });
  dome(fountainGroup, pal.marble, 0, 7.9, 155, 2.1, 2.2, 14, { ribs: 8 });
  cyl(fountainGroup, pal.marble, 0, 10.8, 155, 0.55, 1.15, 2.8, 10);
  box(fountainGroup, pal.gold, 0, 12.5, 155, 0.55, 0.85, 0.55);

  // 3. Flanking Striped Promenade Galleries (|X| = 36.8 m, Photo #18!), Chestnut Alleys & Gaslamps
  for (const sx of [-1, 1]) {
    box(awningGroup, pal.cream, sx * 36.8, 3.95, 366, 5.6, 0.55, 364);
    box(awningGroup, pal.terracottaBand, sx * 36.8, 4.32, 366, 5.9, 0.28, 364);
    for (let z = 188; z <= 546; z += 16) {
      box(awningGroup, pal.expoIron, sx * 34.3, 1.95, z, 0.22, 3.9, 0.22);
      lineSeg(awningGroup, sx * 33.9, 4.22, z, sx * 39.7, 4.22, z);
    }
    for (let z = 94; z <= 554; z += 22) {
      ctx.addLamp(sx * 32.0, 0, z, 0.95, true);
      for (const xo of [49, 66, 82]) {
        ctx.addTree(sx * xo, 0, z + ((xo * 3) % 9) - 4, 0.90 + (xo % 5) * 0.05);
      }
    }
    // Avenue de Suffren (+X) & Avenue de La Bourdonnais (-X) boulevard tree rows framing Stop 11
    for (let z = -60; z <= 560; z += 28) {
      ctx.addTree(sx * 212, 0, z, 0.92);
      ctx.addTree(sx * 234, 0, z + 14, 0.88);
    }
  }

  // 4. Flanking Palais des Beaux-Arts (+X) & Palais des Arts Libéraux (-X)
  //    Refined to authentic 1889 Formigé proportions (engraving #58):
  //    |X| in [98, 150], Z in [196, 484], 16.8 m classical arcade, 21.8 m glazed iron nave,
  //    29.4 m ribbed central cupola & 22.8 m architectural Mansard corner pavilions.
  for (const sx of [-1, 1]) {
    const px = sx * 124.0;
    box(palaisWingsGroup, pal.cream, px, 8.4, 340, 50.0, 16.8, 288);
    box(palaisWingsGroup, pal.expoBrick, px, 9.2, 340, 50.4, 7.2, 282);
    box(palaisWingsGroup, pal.expoIron, px, 17.1, 340, 51.4, 1.1, 289);

    // 14 Classical Arched Bays along both inner Champ-de-Mars & outer Avenue facades
    for (let z = 204; z <= 476; z += 19.4) {
      box(palaisWingsGroup, pal.stone, sx * 98.8, 8.4, z, 1.3, 16.6, 2.0);
      box(palaisWingsGroup, pal.stone, sx * 149.2, 8.4, z, 1.3, 16.6, 2.0);
      if (Math.abs(z - 340) > 22 && z + 9.7 <= 474) {
        const bz = z + 9.7;
        box(palaisWingsGroup, pal.glass, sx * 98.7, 9.0, bz, 0.5, 9.8, 10.5);
        box(palaisWingsGroup, pal.glass, sx * 149.3, 9.0, bz, 0.5, 9.8, 10.5);
        archCurve(palaisWingsGroup, sx * 98.2, 10.8, bz, 5.2, 3.2, 'z', 0, 10);
        archCurve(palaisWingsGroup, sx * 149.8, 10.8, bz, 5.2, 3.2, 'z', 0, 10);
      }
    }

    // Glazed Iron Nave Vault + Drawn Structural Trusses
    const roof = new THREE.Mesh(makeGableVaultGeo(THREE, 282, 44, 0.4, 5.2), pal.glass);
    roof.rotation.y = Math.PI * 0.5;
    roof.position.set(px, 17.5, 340);
    roof.receiveShadow = true;
    palaisWingsGroup.add(roof);
    for (let z = 206; z <= 474; z += 19.2) {
      lineSeg(palaisWingsGroup, px - 22, 17.9, z, px - 12.3, 20.7, z);
      lineSeg(palaisWingsGroup, px - 12.3, 20.7, z, px, 22.7, z);
      lineSeg(palaisWingsGroup, px, 22.7, z, px + 12.3, 20.7, z);
      lineSeg(palaisWingsGroup, px + 12.3, 20.7, z, px + 22, 17.9, z);
    }

    // Central Monumental Portal & Ribbed Formigé Cupola (Z = 340, apex ~31.6 m)
    const cx = sx * 108.5;
    box(palaisWingsGroup, pal.cream, cx, 10.6, 340, 22, 21.2, 30);
    box(palaisWingsGroup, pal.stone, sx * 97.4, 10.2, 340, 2.2, 20.4, 24);
    box(palaisWingsGroup, pal.glass, sx * 96.2, 8.6, 340, 0.5, 13.8, 12.6);
    archCurve(palaisWingsGroup, sx * 95.8, 9.8, 340, 6.3, 5.6, 'z', 0, 14);
    cyl(palaisWingsGroup, pal.cream, cx, 23.0, 340, 9.8, 10.4, 4.8, 16, { pilasters: 12 });
    dome(palaisWingsGroup, pal.copper, cx, 25.4, 340, 10.0, 8.2, 20, { ribs: 16 });
    cyl(palaisWingsGroup, pal.cream, cx, 34.4, 340, 1.8, 2.2, 2.4, 10, { pilasters: 6 });
    dome(palaisWingsGroup, pal.gold, cx, 35.6, 340, 1.7, 1.4, 10, { ribs: 6 });

    // Architectural Square Mansard Corner Pavilions (Z = 207 & 473, replacing smooth clay spheres!)
    for (const cz of [207, 473]) {
      box(palaisWingsGroup, pal.cream, px, 9.6, cz, 53.0, 19.2, 22.0);
      box(palaisWingsGroup, pal.stone, px, 19.5, cz, 54.2, 0.9, 23.2);
      for (const endX of [px - 16.5, px + 16.5]) {
        const pavRoof = new THREE.Mesh(new THREE.CylinderGeometry(8.2, 12.6, 5.4, 4), pal.slate);
        pavRoof.rotation.y = Math.PI * 0.25;
        pavRoof.position.set(endX, 22.6, cz);
        pavRoof.receiveShadow = true;
        palaisWingsGroup.add(pavRoof);
        box(palaisWingsGroup, pal.expoIron, endX, 25.6, cz, 9.8, 0.55, 9.8);
      }
    }
  }

  // 5. Strictly Behind Z = +580 m: Monumental Dôme Central (X = 0, Z = +595 m) & 420m Galerie des Machines
  box(expoGrandGroup, pal.cream, 0, 15.8, 603, 68, 31.6, 42);
  box(expoGrandGroup, pal.cream, 0, 11.2, 606, 196, 22.4, 34);
  box(expoGrandGroup, pal.expoBrick, 0, 11.8, 606, 196.6, 9.2, 32);
  box(expoGrandGroup, pal.stone, 0, 17.0, 583.5, 30, 34.0, 6);
  box(expoGrandGroup, pal.glass, 0, 12.5, 580.4, 15.5, 23.0, 0.6);
  archCurve(expoGrandGroup, 0, 15.5, 580.0, 7.8, 7.8, 'x', 0, 14);
  for (const sx of [-1, 1]) {
    box(expoGrandGroup, pal.cream, sx * 22.5, 20.5, 584.5, 8.2, 41.0, 8.5);
    dome(expoGrandGroup, pal.copper, sx * 22.5, 41.0, 584.5, 4.2, 5.2, 14, { ribs: 8 });
  }
  cyl(expoGrandGroup, pal.cream, 0, 38.8, 595, 17.4, 18.2, 14.4, 20, { pilasters: 12 });
  cyl(expoGrandGroup, pal.glass, 0, 39.2, 595, 17.65, 17.65, 6.2, 20, { noSketchRings: true });
  dome(expoGrandGroup, pal.copper, 0, 46.0, 595, 17.8, 16.8, 22, { ribs: 16 });
  cyl(expoGrandGroup, pal.gold, 0, 64.5, 595, 3.2, 3.8, 4.2, 12, { pilasters: 8 });
  dome(expoGrandGroup, pal.gold, 0, 66.6, 595, 3.0, 2.2, 12, { ribs: 8 });
  cyl(expoGrandGroup, pal.gold, 0, 69.6, 595, 0.35, 0.85, 2.0, 8);

  const machVault = new THREE.Mesh(makeGableVaultGeo(THREE, 420, 90, 21.5, 46.2), pal.glass);
  machVault.position.set(0, 0, 670);
  machVault.receiveShadow = true;
  expoGrandGroup.add(machVault);
  box(expoGrandGroup, pal.expoIron, 0, 47.0, 670, 420, 2.0, 8.5);
  const ribTuples = [];
  for (let x = -210; x <= 210; x += 21) {
    ribTuples.push([x, 0, 670, 1, 1, 1, 0]);
    // Crisp 3-hinged Contamin arch truss ink lines inside Galerie des Machines
    lineSeg(expoGrandGroup, x, 0, 625, x, 21.8, 625);
    lineSeg(expoGrandGroup, x, 21.8, 625, x, 36.2, 644.8);
    lineSeg(expoGrandGroup, x, 36.2, 644.8, x, 46.7, 670);
    lineSeg(expoGrandGroup, x, 46.7, 670, x, 36.2, 695.2);
    lineSeg(expoGrandGroup, x, 36.2, 695.2, x, 21.8, 715);
    lineSeg(expoGrandGroup, x, 21.8, 715, x, 0, 715);
  }
  instanced(
    expoGrandGroup,
    makeGableVaultGeo(THREE, 1.15, 91.2, 21.8, 46.7),
    pal.expoIron,
    ribTuples
  );

  // 6. Permanent Landmarks (École Militaire & Dôme des Invalides) + Lithographic Haussmannian Paris
  box(group, pal.stone, 0, 10.5, 782, 230, 21.0, 32);
  box(group, pal.slate, 0, 23.5, 782, 232, 5.2, 33);
  box(group, pal.stone, 0, 15.5, 778, 34, 31.0, 36);
  dome(group, pal.slate, 0, 31.0, 778, 15.5, 12.5, 12, { ribs: 8 });
  // Hôtel & Dôme des Invalides (X = +685, Z = +195)
  box(group, pal.stone, 685, 14.0, 195, 58, 28.0, 58);
  cyl(group, pal.stone, 685, 42.0, 195, 16.5, 17.5, 28.0, 20, { pilasters: 12 });
  dome(group, pal.gold, 685, 56.0, 195, 16.8, 25.0, 22, { ribs: 16 });
  cyl(group, pal.gold, 685, 89.0, 195, 1.2, 2.8, 16.5, 8);

  // Continuous Parisian macadam street skirts out to +-1700 m (zero visible boundary!)
  box(group, pal.street, 940, -0.16, 808, 1520, 0.24, 1784, 0, { noSketchEdges: true });
  box(group, pal.street, -940, -0.16, 808, 1520, 0.24, 1784, 0, { noSketchEdges: true });

  const wallA = [];
  const wallB = [];
  const roofs = [];
  const maxBlockR = 920.0; // Fades to 97%+ mist by 920m and 100.0% by 960m

  const pushDistrict = (x0, x1, z0, z1, stepX, stepZ, yGround = 0) => {
    for (let x = x0; x <= x1; x += stepX) {
      for (let z = z0; z <= z1; z += stepZ) {
        if (Math.abs(x - 685) < 56 && Math.abs(z - 195) < 56) continue;
        const r1 = hash01(x, z);
        const r2 = hash01(z + 17, x - 31);
        const cx = x + (r1 - 0.5) * 16;
        const cz = z + (r2 - 0.5) * 15;
        const radXZ = Math.hypot(cx, cz);
        if (radXZ > maxBlockR) continue;
        // Keep Avenue de Suffren / La Bourdonnais clear around Stop 11 camera [240, 52, 440]
        if (Math.abs(cx) < 262 && cz > -125 && cz < 620) continue;

        const h = 15.8 + r1 * 6.8;
        const wx = 34 + r2 * 26;
        const wz = 20 + (1 - r2) * 18;
        const yaw = Math.floor(r1 * 4) * 0.22 - 0.22 + (r2 - 0.5) * 0.06;
        (r1 > 0.45 ? wallA : wallB).push([cx, yGround + h * 0.5, cz, wx, h, wz, yaw]);
        roofs.push([cx, yGround + h + 2.1, cz, wx * 0.74, 4.2, wz * 0.74, yaw]);
        if (radXZ < 850) {
          addHaussmannSketch(group, cx, yGround, cz, wx, h, wz, yaw);
        }
        if (r2 > 0.66 && radXZ < 560) {
          ctx.addTree(cx + (cx > 0 ? -1 : 1) * (wx * 0.58), yGround, cz, 0.85);
        }
      }
    }
  };

  pushDistrict(268, 910, -102, 860, 74, 66, 0);
  pushDistrict(-910, -268, -102, 860, 74, 66, 0);
  pushDistrict(274, 910, -880, -305, 78, 70, 6);
  pushDistrict(-910, -274, -880, -305, 78, 70, 6);
  pushDistrict(-460, 460, -915, -835, 78, 70, 24);
  pushDistrict(-220, 220, 845, 915, 78, 70, 0);

  const blockGeo = createHaussmannBlockGeometry(THREE);
  const mansardGeo = new THREE.CylinderGeometry(0.78, 1.0, 1.0, 4);
  mansardGeo.rotateY(Math.PI * 0.25);
  instanced(group, blockGeo, pal.cityWall, wallA);
  instanced(group, blockGeo, pal.cityWallWarm, wallB);
  instanced(group, mansardGeo, pal.slate, roofs);

  return {
    group,
    setStep(step) {
      chantierFenceGroup.visible = step >= 2.2 && step < 5.2;
      gardensGroup.visible = step >= 7.5;
      fountainGroup.visible = step >= 8.5;
      awningGroup.visible = step >= 8.0;
      palaisWingsGroup.visible = step >= 7.5;
      expoGrandGroup.visible = step >= 7.0;
    },
  };
}
