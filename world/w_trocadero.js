/**
 * Chaillot Terraced Cascade, Horseshoe Basin, and 1878/1889 Palais du Trocadéro
 * (Salle des Fêtes Rotunda, Curved Colonnade Wings & Twin Towers) (`world/w_trocadero.js`).
 *
 * Features:
 *   - Continuous Right-Bank ground plateau extending to `+-1700 m` (zero world edge before fog closure).
 *   - Architectural pen-and-ink meridian ribs on the Salle des Fêtes dome, Moorish belfry arches,
 *     and semicircular arcade ink work across both 20-bay curved colonnade wings.
 */

export function buildTrocadero(ctx) {
  const { THREE, pal, box, cyl, dome, archCurve } = ctx;
  const group = new THREE.Group();
  group.name = 'trocadero_chaillot';
  const expoPavGroup = new THREE.Group();
  expoPavGroup.name = 'trocadero_expo_pavilions';
  group.add(expoPavGroup);

  // 1. Chaillot Terraced Hill Topography (Z in [-282, -1700], rising Y = 0 -> +24 m at Z = -700)
  const lowSteps = 10;
  for (let i = 0; i < lowSteps; i++) {
    const z0 = -282 - i * 19.4;
    const z1 = z0 - 19.8;
    const ym = (i + 0.5) * (7.6 / lowSteps);
    box(group, pal.lawn, 0, ym * 0.5 - 0.1, 0.5 * (z0 + z1), 460, ym + 0.25, 20.2, 0, {
      noSketchEdges: i % 2 === 1,
    });
    box(group, pal.allee, 0, ym + 0.05, 0.5 * (z0 + z1), 30, 0.14, 20.2, 0, { noSketchEdges: true });
    // Continuous flanking Right-Bank urban slopes out to +-1700 m
    box(group, pal.gravel, -965, ym * 0.4 - 0.1, 0.5 * (z0 + z1), 1470, ym * 0.8 + 0.3, 20.4, 0, {
      noSketchEdges: true,
    });
    box(group, pal.gravel, 965, ym * 0.4 - 0.1, 0.5 * (z0 + z1), 1470, ym * 0.8 + 0.3, 20.4, 0, {
      noSketchEdges: true,
    });
  }

  // Mid Basin Terrace Plateau (Z = -476..-562, Y = +7.6 m)
  box(group, pal.allee, 0, 3.7, -519, 460, 7.6, 88);
  box(group, pal.gravel, -965, 3.5, -519, 1470, 7.2, 88, 0, { noSketchEdges: true });
  box(group, pal.gravel, 965, 3.5, -519, 1470, 7.2, 88, 0, { noSketchEdges: true });

  // Upper Cascade Hillside (Z = -562..-700, Y = +7.6 -> +24.0 m) & Palais Plateau (Z = -700..-1700)
  const upSteps = 10;
  for (let i = 0; i < upSteps; i++) {
    const z0 = -562 - i * 13.8;
    const z1 = z0 - 14.2;
    const topY = 7.6 + (i + 1) * (16.4 / upSteps);
    box(group, pal.lawn, 0, topY * 0.5, 0.5 * (z0 + z1), 480, topY, 14.4, 0, {
      noSketchEdges: i % 2 === 1,
    });
    box(group, pal.gravel, -970, topY * 0.48, 0.5 * (z0 + z1), 1460, topY * 0.96, 14.4, 0, {
      noSketchEdges: true,
    });
    box(group, pal.gravel, 970, topY * 0.48, 0.5 * (z0 + z1), 1460, topY * 0.96, 14.4, 0, {
      noSketchEdges: true,
    });
    for (const sx of [-1, 1]) {
      box(group, pal.stone, sx * 22, topY + 0.15, 0.5 * (z0 + z1), 7.5, 0.45, 14.4);
      box(group, pal.stone, sx * 26.2, topY + 0.65, 0.5 * (z0 + z1), 0.65, 1.0, 14.4);
    }
  }
  box(group, pal.allee, 0, 12.0, -765, 520, 24.0, 134);
  box(group, pal.gravel, 0, 11.9, -1266, 3400, 23.8, 868, 0, { noSketchEdges: true });
  box(group, pal.gravel, -980, 11.8, -765, 1440, 23.6, 134, 0, { noSketchEdges: true });
  box(group, pal.gravel, 980, 11.8, -765, 1440, 23.6, 134, 0, { noSketchEdges: true });

  // 2. Horseshoe Bassin du Trocadéro (Z = -520, Y = +7.6..+8.6 m) & Radial Parterres (Photo #15!)
  cyl(group, pal.stone, 0, 8.05, -520, 31.5, 32.2, 0.95, 32);
  cyl(group, pal.water, 0, 8.28, -520, 29.6, 29.6, 0.55, 32, { noSketchRings: true });
  for (const sx of [-1, 1]) {
    cyl(group, pal.stone, sx * 19, 8.05, -514, 15.5, 16.0, 0.95, 24);
    cyl(group, pal.water, sx * 19, 8.30, -514, 14.2, 14.2, 0.55, 24, { noSketchRings: true });
    // Sculpted fountain jets & bronze animal sculptures on stone plinths (Taureau, Cheval, Éléphant, Rhinocéros)
    cyl(group, pal.marble, sx * 18.5, 9.6, -516, 0.4, 2.4, 2.3, 12);
    box(group, pal.stone, sx * 35, 9.2, -496, 3.2, 3.0, 4.2);
    box(group, pal.gold, sx * 35, 11.3, -496, 1.5, 1.4, 2.4);
  }
  for (let k = -5; k <= 5; k++) {
    const a = k * 0.24;
    const rx = Math.sin(a) * 39.5;
    const rz = -516 + Math.cos(a) * 35.5;
    box(group, pal.lawn, rx, 7.68, rz, 6.2, 0.22, 9.5, a, { noSketchEdges: true });
    box(group, pal.stone, rx, 7.64, rz, 6.8, 0.14, 10.1, a);
  }

  // 3. Grande Cascade & Château d'Eau Grotto (Z = -695..-558, X in [-15, +15])
  box(group, pal.cream, 0, 28.0, -692, 30, 8.2, 12);
  cyl(group, pal.stone, 0, 28.0, -686, 6.5, 6.5, 7.8, 16, { pilasters: 8 });
  dome(group, pal.copper, 0, 32.1, -692, 8.5, 5.2, 18, { ribs: 12 });
  for (let c = 0; c < 8; c++) {
    const zc = -678 + c * 15.6;
    const yc = 22.4 - c * 1.78;
    box(group, pal.stone, 0, yc - 0.9, zc, 24.5, 2.2, 16.0);
    box(group, pal.water, 0, yc + 0.24, zc, 19.6, 0.16, 14.2, 0, { noSketchEdges: true });
    box(group, pal.marble, 0, yc - 0.15, zc + 7.9, 19.4, 0.95, 0.45);
    for (const sx of [-1, 1]) {
      box(group, pal.stone, sx * 12.2, yc + 0.65, zc, 1.1, 1.1, 16.0);
      cyl(group, pal.marble, sx * 12.2, yc + 1.55, zc + 6.5, 0.45, 0.55, 0.9, 8);
    }
  }

  // Lower Park 1889 Exposition Pavilions (Algeria / Tunisia / Forestry Pavilions in Photo #15 midground)
  for (const sx of [-1, 1]) {
    box(expoPavGroup, pal.cream, sx * 38, 8.2, -395, 20, 8.8, 36);
    dome(expoPavGroup, pal.marble, sx * 38, 12.6, -384, 6.5, 5.6, 16, { ribs: 10 });
    box(expoPavGroup, pal.cream, sx * 42, 6.2, -336, 22, 8.5, 24);
    dome(expoPavGroup, pal.marble, sx * 42, 10.4, -336, 5.8, 4.6, 16, { ribs: 10 });
    for (const mx of [-8, 8]) {
      cyl(expoPavGroup, pal.cream, sx * 42 + mx, 11.2, -325, 1.1, 1.25, 7.5, 10, { pilasters: 4 });
      dome(expoPavGroup, pal.gold, sx * 42 + mx, 15.0, -325, 1.2, 1.5, 10, { ribs: 6 });
    }
    for (let zt = -670; zt <= -305; zt += 26) {
      const baseH =
        zt < -560
          ? 24 - (-560 - zt < 0 ? 0 : (zt + 700) * 0.115)
          : zt < -476
            ? 7.6
            : (zt + 282) * -0.039;
      for (const xo of [56, 82, 112, 145]) {
        if (zt > -450 && xo < 65) continue;
        ctx.addTree(sx * xo, Math.max(0, baseH), zt + (xo % 7), 0.94 + (xo % 5) * 0.05);
      }
      if (zt >= -470) ctx.addLamp(sx * 16.5, Math.max(0.1, (zt + 282) * -0.039), zt, 0.95, false);
    }
  }

  // 4. Palais du Trocadéro — Central Domed Salle des Fêtes Rotunda (X = 0, Z = -765, apex Y = +68 m)
  cyl(group, pal.cream, 0, 32.6, -765, 35.8, 36.6, 17.2, 28);
  for (const yb of [27.5, 31.8, 36.2, 40.4]) {
    cyl(group, pal.terracottaBand, 0, yb, -765, 36.4, 36.4, 0.68, 28);
  }
  cyl(group, pal.stone, 0, 41.5, -765, 37.3, 36.8, 1.1, 28);
  for (let k = -8; k <= 8; k++) {
    const a = k * 0.165;
    const px = Math.sin(a) * 36.5;
    const pz = -765 + Math.cos(a) * 36.5;
    box(group, pal.stone, px, 32.8, pz, 1.35, 16.8, 1.65, a);
    if (k < 8) {
      const am = (k + 0.5) * 0.165;
      const gx = Math.sin(am) * 35.9;
      const gz = -765 + Math.cos(am) * 35.9;
      box(group, pal.glass, gx, 35.2, gz, 2.8, 6.2, 0.6, am);
      archCurve(group, gx, 37.0, gz, 1.55, 1.6, 'x', am, 8);
    }
  }
  cyl(group, pal.cream, 0, 47.6, -765, 28.2, 28.6, 12.4, 24);
  cyl(group, pal.terracottaBand, 0, 46.2, -765, 28.6, 28.6, 0.75, 24);
  cyl(group, pal.stone, 0, 53.6, -765, 29.4, 28.8, 1.15, 24);
  for (let k = -6; k <= 6; k++) {
    const a = k * 0.22;
    box(group, pal.stone, Math.sin(a) * 28.6, 47.6, -765 + Math.cos(a) * 28.6, 1.4, 11.8, 1.5, a);
    if (k < 6) {
      const am = (k + 0.5) * 0.22;
      box(group, pal.glass, Math.sin(am) * 28.1, 47.8, -765 + Math.cos(am) * 28.1, 2.6, 5.8, 0.6, am);
    }
  }
  dome(group, pal.slate, 0, 53.8, -765, 28.6, 10.2, 24, { ribs: 16 });
  cyl(group, pal.cream, 0, 64.8, -765, 4.4, 4.8, 2.4, 12, { pilasters: 6 });
  dome(group, pal.gold, 0, 66.0, -765, 4.2, 1.5, 12, { ribs: 8 });
  cyl(group, pal.gold, 0, 67.8, -765, 0.35, 0.75, 1.6, 8);

  // 5. Twin Tall Square Moorish Minarets (X = +-46.5, Z = -762, apex Y = +92 m)
  // + Open #15 Belvedere Balcony at [-46.5, +41.3, -749.3] (0 occlusion on #15!)
  for (const sx of [-1, 1]) {
    const mx = sx * 46.5;
    const mz = -762.0;
    box(group, pal.cream, mx, 32.65, -753.55, 10.6, 17.3, 8.1);
    box(group, pal.terracottaBand, mx, 36.5, -753.55, 10.8, 0.7, 8.3);
    box(group, pal.stone, mx, 41.12, -753.55, 11.2, 0.36, 8.4);
    for (const side of [-1, 1]) {
      box(group, pal.stone, mx + side * 5.3, 41.75, -753.55, 0.38, 0.9, 8.1);
    }

    box(group, pal.cream, mx, 48.5, mz, 8.8, 49.0, 8.8);
    for (let yBand = 30; yBand <= 70; yBand += 6.5) {
      box(group, pal.terracottaBand, mx, yBand, mz, 8.96, 0.72, 8.96);
    }
    for (const cxOff of [-4.2, 4.2]) {
      for (const czOff of [-4.2, 4.2]) {
        box(group, pal.stone, mx + cxOff, 53.0, mz + czOff, 0.95, 58.0, 0.95);
      }
    }
    box(group, pal.stone, mx, 73.2, mz, 9.6, 0.95, 9.6);
    box(group, pal.cream, mx, 78.0, mz, 8.4, 8.8, 8.4);
    box(group, pal.glass, mx, 78.2, mz, 5.2, 6.2, 8.65);
    box(group, pal.glass, mx, 78.2, mz, 8.65, 6.2, 5.2);
    archCurve(group, mx, 79.8, mz + 4.38, 2.4, 2.0, 'x', 0, 8);
    archCurve(group, mx, 79.8, mz - 4.38, 2.4, 2.0, 'x', 0, 8);
    box(group, pal.stone, mx, 83.2, mz, 9.9, 1.5, 9.9);
    cyl(group, pal.cream, mx, 86.2, mz, 3.6, 3.9, 4.5, 8, { pilasters: 8 });
    dome(group, pal.copper, mx, 88.4, mz, 3.7, 3.1, 14, { ribs: 8 });
    cyl(group, pal.gold, mx, 91.7, mz, 0.12, 0.35, 1.2, 8);
  }

  // 6. Sweeping Semicircular Arcaded Colonnade Wings (Ailes du Trocadéro, 20 bays per wing)
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 20; i++) {
      const t = i / 19;
      const ang = 0.08 + t * 0.78;
      const wx = sx * (52 + Math.sin(ang) * 228);
      const wz = -530 - Math.cos(ang) * 222;
      const yaw = -sx * ang;
      box(group, pal.cream, wx, 27.2, wz, 9.6, 18.4, 9.5, yaw);
      box(group, pal.terracottaBand, wx, 34.4, wz, 9.8, 0.65, 9.8, yaw);
      box(group, pal.stone, wx, 36.9, wz, 9.8, 1.1, 10.2, yaw);
      box(group, pal.glass, wx, 30.8, wz + 0.3, 5.4, 6.8, 9.7, yaw);
      const fwdX = wx + Math.sin(yaw) * 4.88;
      const fwdZ = wz + Math.cos(yaw) * 4.88;
      archCurve(group, fwdX, 32.4, fwdZ, 2.6, 2.2, 'x', yaw, 8);
    }
    const tx = sx * 226;
    const tz = -674;
    box(group, pal.cream, tx, 28.0, tz, 18, 23.2, 18, -sx * 0.82);
    dome(group, pal.slate, tx, 39.6, tz, 9.2, 5.6, 16, { ribs: 12 });
  }

  return {
    group,
    setStep(step) {
      expoPavGroup.visible = step >= 7.5;
    },
  };
}
