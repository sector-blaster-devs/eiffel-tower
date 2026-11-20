/**
 * Zone 3 Sub-Module B2: Phase 9 (1889 Exposition) 2nd-Floor Architectural Enclosures:
 *   - Lower 36.80m multipane glazed gallery curtain wall (+110.63 -> +115.55m, Pl. 45 & Photo 18)
 *   - Covered passenger shelter (Abri), +118.68m Terrasse canopy, railing & +123.01m standards (Pl. 45)
 *   - Ornate octagonal Le Figaro printing kiosk with cupola & globe lamps (Photo 32)
 *   - Elevated PHOTOGRAPHE roof cabin (+118.68 -> +122.95m) & BOUTIQUE pavilions (Pl. 45)
 */

import { lerp, MeshBatch, MultiBatch } from './z3_geom_helpers.js';
import { chamferedSquareVerts } from './z3_floor2_platform.js';

function makeLeFigaroPlaqueMaterial(THREE, materials) {
  const fallback = materials.goldAccent || materials.ironPrimary;
  if (typeof document === 'undefined') return fallback;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return fallback;

  ctx.fillStyle = '#efe8dc';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#8c7658';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 502, 118);
  ctx.strokeStyle = '#6e5b43';
  ctx.lineWidth = 3;
  ctx.strokeRect(14, 14, 484, 100);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 66px Georgia, "Times New Roman", serif';
  ctx.fillStyle = '#a68d6b';
  ctx.fillText('LE FIGARO', 258, 69);
  ctx.fillStyle = '#1e1c19';
  ctx.fillText('LE FIGARO', 256, 67);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;

  return new THREE.MeshStandardMaterial({
    name: 'leFigaroPlaque',
    color: 0xffffff,
    map: tex,
    roughness: 0.44,
    metalness: 0.28,
    side: THREE.DoubleSide,
  });
}

function addOctagonalKiosk(mb, plaqueBatch, globeBatch, cx, y0, cz, radius) {
  const pri = mb.get('ironPrimary');
  const wood = mb.get('woodPavilion');
  const glass = mb.get('glass1889');
  const gold = mb.get('goldAccent');
  const dome = mb.get('copperDome');

  const yCornice = y0 + 2.95; // +118.68m cornice
  const yBalTop = yCornice + 0.68; // +119.36m carved rooftop balustrade
  const yRoofApex = yCornice + 1.55; // +120.23m octagonal zinc roof deck for lantern drum
  const yDrumTop = 121.72; // 8-column octagonal colonnade lantern top
  const yDomeTop = 122.65; // bell-dome crown
  const yFinialTip = 123.52; // signature spire finial (Y ~ 121.2-123.6m, Photo 32 & Pl. 45)

  const pts = [];
  for (let i = 0; i < 8; i++) {
    const a = (i + 0.5) * (Math.PI / 4);
    pts.push([cx + Math.cos(a) * radius, cz + Math.sin(a) * radius]);
  }

  for (let i = 0; i < 8; i++) {
    const j = (i + 1) % 8;
    const [x0, z0] = pts[i], [x1, z1] = pts[j];
    const mx = (x0 + x1) * 0.5, mz = (z0 + z1) * 0.5;
    const nLen = Math.hypot(mx - cx, mz - cz) || 1;
    const nx = (mx - cx) / nLen, nz = (mz - cz) / nLen;

    // Wainscot dado, multipane printing-press windows, "LE FIGARO" frieze, cornice & balustrade
    wood.addQuad([x0, y0, z0], [x1, y0, z1], [x1, y0 + 0.95, z1], [x0, y0 + 0.95, z0]);
    glass.addQuad([x0, y0 + 0.95, z0], [x1, y0 + 0.95, z1], [x1, yCornice - 0.45, z1], [x0, yCornice - 0.45, z0]);
    wood.addStrut([mx, y0 + 0.95, mz], [mx, yCornice - 0.45, mz], 0.07, 0.07, [1, 0, 0]);
    wood.addStrut([x0, yCornice - 0.25, z0], [x1, yCornice - 0.25, z1], 0.12, 0.34);
    gold.addStrut([x0, yCornice - 0.08, z0], [x1, yCornice - 0.08, z1], 0.14, 0.045);
    gold.addStrut([x0, yCornice - 0.42, z0], [x1, yCornice - 0.42, z1], 0.14, 0.045);
    const px0 = lerp(x0, x1, 0.065) + nx * 0.072, pz0 = lerp(z0, z1, 0.065) + nz * 0.072;
    const px1 = lerp(x0, x1, 0.935) + nx * 0.072, pz1 = lerp(z0, z1, 0.935) + nz * 0.072;
    plaqueBatch.addQuad(
      [px1, yCornice - 0.40, pz1],
      [px0, yCornice - 0.40, pz0],
      [px0, yCornice - 0.10, pz0],
      [px1, yCornice - 0.10, pz1]
    );
    wood.addStrut([x0, yCornice, z0], [x1, yCornice, z1], 0.24, 0.18);
    wood.addStrut([x0, y0, z0], [x0, yBalTop + 0.12, z0], 0.15, 0.15, [1, 0, 0]);
    wood.addStrut([x0, yBalTop, z0], [x1, yBalTop, z1], 0.085, 0.085);
    for (let b = 1; b <= 4; b++) {
      const bx = lerp(x0, x1, b / 5), bz = lerp(z0, z1, b / 5);
      wood.addStrut([bx, yCornice, bz], [bx, yBalTop, bz], 0.055, 0.055, [1, 0, 0]);
    }

    // Steep octagonal zinc roof + 4 miniature gabled turret dormers (lucarnes in Photo 32)
    const rx0 = lerp(cx, x0, 0.44), rz0 = lerp(cz, z0, 0.44);
    const rx1 = lerp(cx, x1, 0.44), rz1 = lerp(cz, z1, 0.44);
    dome.addQuad([x0, yCornice + 0.06, z0], [x1, yCornice + 0.06, z1], [rx1, yRoofApex, rz1], [rx0, yRoofApex, rz0]);
    if (i % 2 === 1) {
      const dx = lerp(cx, mx, 0.68), dz = lerp(cz, mz, 0.68);
      wood.addAxisBox(dx, yCornice + 0.72, dz, 0.48, 0.78, 0.48);
      dome.addStrut([dx, yCornice + 1.10, dz], [dx, yCornice + 1.75, dz], 0.34, 0.34, [1, 0, 0]);
      wood.addFrustum(x0, z0, yBalTop + 0.12, 0.068, yBalTop + 0.36, 0.016, 8, true, false);
    }

    // Ornate 8-column open octagonal colonnade lantern cupola + ogee bell dome (Y = 120.2 -> 122.65m)
    const lx0 = lerp(cx, x0, 0.40), lz0 = lerp(cz, z0, 0.40);
    const lx1 = lerp(cx, x1, 0.40), lz1 = lerp(cz, z1, 0.40);
    const tx0 = lerp(cx, x0, 0.34), tz0 = lerp(cz, z0, 0.34);
    const tx1 = lerp(cx, x1, 0.34), tz1 = lerp(cz, z1, 0.34);
    wood.addStrut([lx0, yRoofApex - 0.05, lz0], [lx0, yDrumTop, lz0], 0.11, 0.11, [1, 0, 0]);
    glass.addQuad([lx0, yRoofApex + 0.10, lz0], [lx1, yRoofApex + 0.10, lz1], [lx1, yDrumTop - 0.12, lz1], [lx0, yDrumTop - 0.12, lz0]);
    wood.addStrut([lx0, yDrumTop, lz0], [lx1, yDrumTop, lz1], 0.14, 0.14);
    dome.addQuad([lx0, yDrumTop, lz0], [lx1, yDrumTop, lz1], [tx1, yDrumTop + 0.48, tz1], [tx0, yDrumTop + 0.48, tz0]);
    dome.addTri([cx, yDomeTop, cz], [tx0, yDrumTop + 0.48, tz0], [tx1, yDrumTop + 0.48, tz1]);

    // 4 Corner "LE FIGARO" opaline globe lamp standards with flared brass neck collars (Photo 32)
    if (i % 2 === 0) {
      pri.addFrustum(x0, z0, yBalTop + 0.08, 0.088, yBalTop + 0.22, 0.062, 10, true, false);
      pri.addFrustum(x0, z0, yBalTop + 0.22, 0.044, yBalTop + 0.62, 0.036, 10, false, false);
      gold.addFrustum(x0, z0, yBalTop + 0.62, 0.056, yBalTop + 0.70, 0.098, 12, true, false);
      gold.addFrustum(x0, z0, yBalTop + 0.70, 0.086, yBalTop + 0.81, 0.175, 14, false, false);
      globeBatch.addSphere(x0, yBalTop + 1.05, z0, 0.285, 16, 10);
      gold.addFrustum(x0, z0, yBalTop + 1.015, 0.292, yBalTop + 1.085, 0.292, 16, false, false);
      gold.addFrustum(x0, z0, yBalTop + 1.29, 0.155, yBalTop + 1.37, 0.064, 12, false, true);
      gold.addSphere(x0, yBalTop + 1.43, z0, 0.052, 10, 6);
      gold.addFrustum(x0, z0, yBalTop + 1.46, 0.032, yBalTop + 1.58, 0.006, 8, false, false);
    }
  }
  // Central cupola spire & rounded finial (Y = 122.65 -> 123.52m)
  pri.addStrut([cx, yDomeTop - 0.10, cz], [cx, yFinialTip, cz], 0.08, 0.08, [1, 0, 0]);
  gold.addSphere(cx, yDomeTop + 0.28, cz, 0.13, 12, 8);
}

function addPitchedCabin(mb, cx, y0, cz, sx, sz, wallH, roofH, isWood = true) {
  const pri = mb.get('ironPrimary');
  const wall = mb.get(isWood ? 'woodPavilion' : 'ironPrimary');
  const glass = mb.get('glass1889');
  const dome = mb.get('copperDome');
  const hx = sx * 0.5, hz = sz * 0.5;
  const yEave = y0 + wallH, yPeak = yEave + roofH;
  const c = [[cx - hx, cz + hz], [cx + hx, cz + hz], [cx + hx, cz - hz], [cx - hx, cz - hz]];

  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    const [x0, z0] = c[i], [x1, z1] = c[j];
    wall.addQuad([x0, y0, z0], [x1, y0, z1], [x1, y0 + 0.90, z1], [x0, y0 + 0.90, z0]);
    glass.addQuad([x0, y0 + 0.90, z0], [x1, y0 + 0.90, z1], [x1, yEave, z1], [x0, yEave, z0]);
    pri.addStrut([x0, y0, z0], [x0, yEave, z0], 0.11, 0.11, [1, 0, 0]);
    pri.addStrut([x0, yEave, z0], [x1, yEave, z1], 0.14, 0.14);
    for (let m = 1; m <= 4; m++) {
      const mx = lerp(x0, x1, m / 5), mz = lerp(z0, z1, m / 5);
      pri.addStrut([mx, y0 + 0.90, mz], [mx, yEave, mz], 0.055, 0.055, [1, 0, 0]);
    }
    dome.addTri([cx, yPeak, cz], [x0, yEave, z0], [x1, yEave, z1]);
  }
}

// Pl. 45 Fig. 2 Left (-X) Upper-Terrace Glazed Observation Shelter & Otis Distributor Frame + Air-Resistance Lab
function addWestTerraceStructures(mb, yTerr) {
  const pri = mb.get('ironPrimary');
  const lat = mb.get('ironLattice');
  const wood = mb.get('woodPavilion');
  const glass = mb.get('glass1889');
  const dome = mb.get('copperDome');

  // 1. Left (-X = -14.20..-6.85m, Y = 118.68..123.71m) open steel distributor & counterweight frame (Pl. 45)
  const zFront = +14.25, zBack = +11.65;
  const yGirderBot = 123.01, yGirderTop = 123.71;
  // Upper 0.70m plate girder ("700" at 7.98m above 115.73m = +123.71m), columns, counterweight guides & X-bracing
  for (const zP of [zFront, zBack]) {
    for (const xCol of [-14.15, -13.15, -10.85, -7.35]) {
      pri.addStrut([xCol, yTerr, zP], [xCol, yGirderTop, zP], 0.18, 0.18, [1, 0, 0]);
    }
    pri.addStrut([-14.20, yGirderBot + 0.35, zP], [-6.85, yGirderBot + 0.35, zP], 0.22, 0.70);
    lat.addStrut([-13.15, yTerr + 0.15, zP], [-7.35, yGirderBot, zP], 0.09, 0.12);
    lat.addStrut([-7.35, yTerr + 0.15, zP], [-13.15, yGirderBot, zP], 0.09, 0.12);
  }
  // Counterweight guide frame ("Contrepoids des Cables du distributeur", X = -12.35..-11.65m) & upper sheave beam
  for (const xCw of [-12.35, -11.65]) {
    lat.addStrut([xCw, yTerr + 1.10, zFront - 0.40], [xCw, yGirderTop + 0.65, zFront - 0.40], 0.08, 0.08, [1, 0, 0]);
  }
  pri.addStrut([-12.60, yGirderTop + 0.66, zFront - 0.40], [-7.20, yGirderTop + 0.66, zFront - 0.40], 0.16, 0.22);

  // 2. "Cabinet pour etude de la resistance de l'air a la chute des corps" (X = -5.35..-1.65m, Y = 118.48..120.48m)
  addPitchedCabin(mb, -3.50, yTerr + 0.02, +13.10, 3.70, 2.30, 1.22, 0.78, true);
}

export function buildFloor2Pavilions1889(THREE, materials) {
  const mb = new MultiBatch(THREE, materials);
  const pri = mb.get('ironPrimary');
  const lat = mb.get('ironLattice');
  const wood = mb.get('woodPavilion');
  const glass = mb.get('glass1889');
  const dome = mb.get('copperDome');

  const yBot = 110.63, yDeck = 115.73, yTerr = 118.68, yTerrTop = 119.30, yMastTop = 125.75;

  // 1. Lower Multipane Glazed Gallery Curtain Wall (+110.63 -> +115.55m, 33.7m base -> 35.1m top, Pl. 45)
  const vBot = chamferedSquareVerts(16.85, 1.85);
  const vMid = chamferedSquareVerts(17.55, 1.95);
  for (let e = 0; e < 8; e++) {
    const j = (e + 1) % 8;
    const nWin = e % 2 === 0 ? 14 : 2;
    for (let w = 0; w < nWin; w++) {
      const t0 = w / nWin, t1 = (w + 1) / nWin;
      const b0 = [lerp(vBot[e][0], vBot[j][0], t0), lerp(vBot[e][1], vBot[j][1], t0)];
      const b1 = [lerp(vBot[e][0], vBot[j][0], t1), lerp(vBot[e][1], vBot[j][1], t1)];
      const m0 = [lerp(vMid[e][0], vMid[j][0], t0), lerp(vMid[e][1], vMid[j][1], t0)];
      const m1 = [lerp(vMid[e][0], vMid[j][0], t1), lerp(vMid[e][1], vMid[j][1], t1)];
      const d0 = [lerp(b0[0], m0[0], 0.25), lerp(b0[1], m0[1], 0.25)];
      const d1 = [lerp(b1[0], m1[0], 0.25), lerp(b1[1], m1[1], 0.25)];

      // Solid lower iron dado + 3-transom multipane glazing
      wood.addQuad([b0[0], yBot, b0[1]], [b1[0], yBot, b1[1]], [d1[0], yBot + 1.15, d1[1]], [d0[0], yBot + 1.15, d0[1]]);
      glass.addQuad([d0[0], yBot + 1.15, d0[1]], [d1[0], yBot + 1.15, d1[1]], [m1[0], yDeck - 0.22, m1[1]], [m0[0], yDeck - 0.22, m0[1]]);
      pri.addStrut([b0[0], yBot, b0[1]], [m0[0], yDeck - 0.18, m0[1]], w % 2 === 0 ? 0.15 : 0.075, 0.12, [1, 0, 0]);
      for (const ty of [yBot + 1.15, yBot + 2.50, yBot + 3.80]) {
        const u = (ty - yBot) / (yDeck - yBot);
        pri.addStrut([lerp(b0[0], m0[0], u), ty, lerp(b0[1], m0[1], u)],
          [lerp(b1[0], m1[0], u), ty, lerp(b1[1], m1[1], u)], 0.065, 0.09);
      }
    }
  }

  // 2. Upper Terrasse Canopy (+118.68..119.30m, ±17.45m eave / ±17.05m column line) & Roof Standards (+125.75m, Pl. 45)
  const vTerrEave = chamferedSquareVerts(17.45, 1.22);
  const vTerrCol = chamferedSquareVerts(17.05, 1.11);
  const vTerrIn = chamferedSquareVerts(14.65, 1.10);
  for (let e = 0; e < 8; e++) {
    const j = (e + 1) % 8;
    const e0 = vTerrEave[e], e1 = vTerrEave[j], c0 = vTerrCol[e], c1 = vTerrCol[j], i0 = vTerrIn[e], i1 = vTerrIn[j];
    dome.addQuad([c0[0], yTerrTop, c0[1]], [c1[0], yTerrTop, c1[1]], [e1[0], yTerr + 0.04, e1[1]], [e0[0], yTerr + 0.04, e0[1]]);
    dome.addQuad([i0[0], yTerrTop + 0.04, i0[1]], [i1[0], yTerrTop + 0.04, i1[1]], [c1[0], yTerrTop, c1[1]], [c0[0], yTerrTop, c0[1]]);
    wood.addQuad([e0[0], yTerr - 0.04, e0[1]], [e1[0], yTerr - 0.04, e1[1]], [i1[0], yTerr, i1[1]], [i0[0], yTerr, i0[1]]);
    pri.addStrut([e0[0], yTerr, e0[1]], [e1[0], yTerr, e1[1]], 0.18, 0.22);
    pri.addStrut([c0[0], yTerr - 0.12, c0[1]], [c1[0], yTerr - 0.12, c1[1]], 0.20, 0.28);
    pri.addStrut([c0[0], yTerrTop, c0[1]], [c1[0], yTerrTop, c1[1]], 0.12, 0.10);
  }
  // Exact Pl. 45 gallery columns (+115.73 -> +118.68m) & slender tapered roof standards (mâts -> +125.75m):
  // 1.11m chamfer (±15.94m) + 0.79m end bay (±15.15m) + 22 * 1.377m regular bays across ±15.15m!
  const colU = [-15.94, -15.15];
  for (let k = 1; k <= 21; k++) colU.push(Number((-15.15 + (k * 30.30) / 22).toFixed(2)));
  colU.push(15.15, 15.94);
  const seenCols = new Set();
  const colPts = [];
  for (const sgn of [-1, 1]) {
    for (const u of colU) {
      colPts.push([u, sgn * 17.05], [sgn * 17.05, u]);
    }
  }
  for (const [px, pz] of colPts) {
    const key = `${px.toFixed(2)},${pz.toFixed(2)}`;
    if (seenCols.has(key)) continue;
    seenCols.add(key);
    pri.addStrut([px, yDeck, pz], [px, yTerr, pz], 0.13, 0.13, [1, 0, 0]);
    pri.addAxisBox(px, yTerr - 0.22, pz, 0.24, 0.14, 0.24);
    pri.addStrut([px, yTerr, pz], [px, yTerrTop, pz], 0.15, 0.15, [1, 0, 0]);
    pri.addAxisBox(px, yTerrTop + 0.03, pz, 0.22, 0.08, 0.22);
    pri.addStrut([px, yTerrTop + 0.05, pz], [px, 122.60, pz], 0.11, 0.11, [1, 0, 0]);
    pri.addStrut([px, 122.60, pz], [px, yMastTop - 0.04, pz], 0.075, 0.075, [1, 0, 0]);
    pri.addAxisBox(px, yMastTop - 0.02, pz, 0.14, 0.06, 0.14);
  }

  // 3. 1889 Cabins: Le Figaro Chalet (NE/North court), West Observation/Air-Resistance Shelter & PHOTOGRAPHE
  const plaqueBatch = new MeshBatch();
  const globeBatch = new MeshBatch();
  addOctagonalKiosk(mb, plaqueBatch, globeBatch, +3.60, yDeck, -6.55, 2.18);
  addWestTerraceStructures(mb, yTerr);

  // Elevated PHOTOGRAPHE studio (+120.95 -> +124.75m on open steel stilts & stair, Pl. 45 Fig. 2)
  addPitchedCabin(mb, +8.05, 120.95, +11.80, 6.60, 3.60, 3.10, 0.70, true);
  for (const dx of [-3.15, +3.15]) {
    for (const dz of [-1.65, +1.65]) {
      pri.addStrut([8.05 + dx, yTerr, 11.80 + dz], [8.05 + dx, 120.95, 11.80 + dz], 0.14, 0.14, [1, 0, 0]);
    }
  }
  pri.addStrut([+9.85, yTerr, +13.30], [+7.55, 120.95, +13.30], 0.24, 0.14);

  addPitchedCabin(mb, +0.0, yDeck, +11.10, 5.20, 3.40, 2.65, 0.25, true);   // BOUTIQUE (SE)
  addPitchedCabin(mb, +10.60, yDeck, -0.20, 5.20, 4.20, 2.65, 0.25, true);  // Abri (East)
  addPitchedCabin(mb, -2.60, yDeck, -11.40, 4.40, 3.20, 2.65, 0.25, true);  // NW Passenger Shelter

  const grp = mb.buildGroup('z3_floor2_gallery_cabins_1889');
  const plaqueMesh = plaqueBatch.toMesh(THREE, makeLeFigaroPlaqueMaterial(THREE, materials), 'z3_le_figaro_frieze_plaques');
  if (plaqueMesh) grp.add(plaqueMesh);
  const globeMat = materials.lampGlobe1889 || materials.glass1889 || materials.ironPrimary;
  const globeMesh = globeBatch.toMesh(THREE, globeMat, 'z3_le_figaro_lamp_globes');
  if (globeMesh) grp.add(globeMesh);

  return [{
    id: 'z3_floor2_gallery_cabins_1889',
    name: '2e Étage 1889 Glazed Gallery, Terrasse, Le Figaro Chalet & Cabins (+110.63–124.75m)',
    phase: 9,
    span: [9.30, 9.75],
    obj: grp,
  }];
}
