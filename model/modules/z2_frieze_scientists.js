/**
 * Zone 2 — Structural Scientist Frieze Sub-Frame (Phase 4, Photo 14)
 * & 18-Panel Molded Fascia + 72 Gold-Accented French Scientist Plaques (Phase 9, Pl. 20, Photo 36, Photo 18).
 */

import {
  BAY_W, wOuter, FACES, facePt, PieceBuilder,
} from './z2_geom_helpers.js';

// Exact 72 French scientists (18 per face, left-to-right viewed from outside; SE verified on Photo 18 & Pl. 20, NW verified on Photo 36)
const SCIENTIST_NAMES_BY_FACE = [
  // Face 0: SE (+Z École Militaire / Champ-de-Mars)
  [
    'CAUCHY', 'BELGRAND', 'REGNAULT', 'FRESNEL', 'DE PRONY', 'VICAT',
    'EBELMEN', 'COULOMB', 'POINSOT', 'FOUCAULT', 'DELAUNAY', 'MORIN',
    'HAUY', 'COMBES', 'THENARD', 'ARAGO', 'POISSON', 'MONGE',
  ],
  // Face 1: NE (+X La Bourdonnais)
  [
    'PETIET', 'DAGUERRE', 'WURTZ', 'LE VERRIER', 'PERDONNET', 'DELAMBRE',
    'MALUS', 'BREGUET', 'POLONCEAU', 'DUMAS', 'CLAPEYRON', 'BORDA',
    'FOURIER', 'BICHAT', 'SAUVAGE', 'PELOUZE', 'CARNOT', 'LAME',
  ],
  // Face 2: NW (-Z Trocadéro / Seine — verified letter-for-letter in Photo 36)
  [
    'SEGUIN', 'LALANDE', 'TRESCA', 'PONCELET', 'BRESSE', 'LAGRANGE',
    'BELANGER', 'CUVIER', 'LAPLACE', 'DULONG', 'CHASLES', 'LAVOISIER',
    'AMPERE', 'CHEVREUL', 'FLACHAT', 'NAVIER', 'LEGENDRE', 'CHAPTAL',
  ],
  // Face 3: SW (-X Grenelle)
  [
    'JAMIN', 'GAY-LUSSAC', 'FIZEAU', 'SCHNEIDER', 'LE CHATELIER', 'BERTHIER',
    'BARRAL', 'DE DION', 'GOUIN', 'JOUSSELIN', 'BROCA', 'BECQUEREL',
    'CORIOLIS', 'CAIL', 'TRIGER', 'GIFFARD', 'PERRIER', 'STURM',
  ],
];

function makeFacePlaqueStripMaterial(THREE, fallbackMat, names18, faceId) {
  if (typeof document === 'undefined') return fallbackMat;
  const canvas = document.createElement('canvas');
  canvas.width = 4096;
  canvas.height = 76;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return fallbackMat;

  ctx.fillStyle = '#3b3029';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cellW = canvas.width / 18; // 227.55 px x 76 px = 3.00:1 aspect matching 3.62m x 1.18m plaque!
  for (let i = 0; i < 18; i++) {
    const x0 = i * cellW;
    ctx.strokeStyle = '#8c7658';
    ctx.lineWidth = 3;
    ctx.strokeRect(x0 + 6, 6, cellW - 12, canvas.height - 12);

    ctx.fillStyle = '#b59c78';
    const label = names18[i] || '';
    const fontPx = label.length > 10 ? 19 : label.length > 8 ? 23 : 27;
    ctx.font = `bold ${fontPx}px "Arial Narrow", Arial, Helvetica, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x0 + cellW * 0.5, canvas.height * 0.54);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;

  return new THREE.MeshStandardMaterial({
    name: `friezePlaques_${faceId}`,
    color: 0xffffff,
    map: tex,
    roughness: 0.40,
    metalness: 0.52,
    side: THREE.DoubleSide,
  });
}

export function buildFriezePieces(THREE, mats) {
  const out = [];

  // 1. Phase 4 Structural Frieze X-Frame & Diamond Trellis Band ([4.20, 4.60], Photo 14 & Pl. 20)
  {
    const pb = new PieceBuilder();
    const pri = pb.use(mats.ironPrimary);
    const lat = pb.use(mats.ironLattice);

    const ySill0 = 51.32, ySill1 = 52.58, yTrellisTop = 53.95;
    const w0 = wOuter(ySill0) + 0.08;
    const w1 = wOuter(ySill1) + 0.14;
    const w2 = wOuter(yTrellisTop) + 0.28;

    for (let f = 0; f < 4; f++) {
      const uLim0 = Math.min(34.92, wOuter(ySill0) + 0.35);
      pri.addBeam(facePt(f, -uLim0, ySill0, w0), facePt(f, uLim0, ySill0, w0), 0.22, 0.24);
      pri.addBeam(facePt(f, -34.92, ySill1, w1), facePt(f, 34.92, ySill1, w1), 0.24, 0.28);
      pri.addBeam(facePt(f, -34.92, yTrellisTop, w2), facePt(f, 34.92, yTrellisTop, w2), 0.22, 0.26);

      // 18 bays of structural X-frame & 4-diamond ornamental iron cresting per bay (Pl. 20)
      for (let b = 0; b < 18; b++) {
        const ua = -34.92 + b * BAY_W + 0.14;
        const ub = ua + BAY_W - 0.28;
        // Structural X behind plaque zone (visible in Photo 14 before Phase 9 plaque cladding!)
        lat.addBeam(facePt(f, ua, ySill0, w0 - 0.10), facePt(f, ub, ySill1, w1 - 0.10), 0.10, 0.10);
        lat.addBeam(facePt(f, ub, ySill0, w0 - 0.10), facePt(f, ua, ySill1, w1 - 0.10), 0.10, 0.10);

        // 4 diamond/fleuron lattice motifs above each scientist plaque (Pl. 20)
        const subStep = (ub - ua) / 4;
        for (let m = 0; m < 4; m++) {
          const m0 = ua + m * subStep, m1 = m0 + subStep, mc = (m0 + m1) * 0.5;
          const ym = (ySill1 + yTrellisTop) * 0.5, wm = (w1 + w2) * 0.5;
          lat.addBeam(facePt(f, mc, ySill1, w1), facePt(f, m1, ym, wm), 0.06, 0.06);
          lat.addBeam(facePt(f, m1, ym, wm), facePt(f, mc, yTrellisTop, w2), 0.06, 0.06);
          lat.addBeam(facePt(f, mc, yTrellisTop, w2), facePt(f, m0, ym, wm), 0.06, 0.06);
          lat.addBeam(facePt(f, m0, ym, wm), facePt(f, mc, ySill1, w1), 0.06, 0.06);
          lat.addBeam(facePt(f, mc, ySill1, w1), facePt(f, mc, yTrellisTop + 0.18, w2), 0.055, 0.055);
        }
      }
    }

    out.push(pb.build(THREE, {
      id: 'z2_frieze_xframe_p4', phase: 5, span: [4.90, 5.30],
      plateRefs: ['20', '67'], photoRefs: ['01', '46', '36', '18'],
    }));
  }

  // 2. Phase 9 Molded Frieze Fascia, Solid Sheet-Iron Backing, Console-Tail Drops & 72 Scientist Plaques ([9.00, 9.40])
  {
    const pb = new PieceBuilder();
    const pri = pb.use(mats.ironPrimary);
    const cast = pb.use(mats.ironCast);
    const gold = pb.use(mats.goldAccent);

    const yArchBot = 50.95;
    const yBot = 51.36, yTop = 52.54;
    const wB = wOuter(yBot) + 0.20, wT = wOuter(yTop) + 0.24;
    const ySpandrel0 = 54.00, ySpandrel1 = 55.82;
    const wS0 = wOuter(ySpandrel0) + 0.30, wS1 = wOuter(ySpandrel1) + 0.52;

    // Inset solid dark sheet-iron backing plane (~0.06m behind plaques & diamond trellis: zero sky bleed, zero Z-fighting!)
    const wBackArch = wOuter(yArchBot) + 0.11;
    const wBackMid = wOuter(yTop) + 0.08;
    const wBackTop = wOuter(ySpandrel0) + 0.21;

    for (let f = 0; f < 4; f++) {
      const plaqueMat = makeFacePlaqueStripMaterial(THREE, mats.ironPrimary, SCIENTIST_NAMES_BY_FACE[f], FACES[f].id);
      const plaqueBuilder = pb.use(plaqueMat);

      // Continuous dark sheet-iron backing behind lower sill + plaques (50.95..52.54m) & behind diamond trellis (52.54..54.02m)
      cast.addQuad(
        facePt(f, -34.08, yArchBot, wBackArch), facePt(f, 34.08, yArchBot, wBackArch),
        facePt(f, 34.92, yTop, wBackMid + 0.05), facePt(f, -34.92, yTop, wBackMid + 0.05)
      );
      cast.addQuad(
        facePt(f, -34.92, yTop, wBackMid), facePt(f, 34.92, yTop, wBackMid),
        facePt(f, 34.92, ySpandrel0 + 0.02, wBackTop), facePt(f, -34.92, ySpandrel0 + 0.02, wBackTop)
      );
      // Molded lower frieze architrave sill beam (51.02 m, Photo 36)
      pri.addBeam(facePt(f, -34.12, 51.02, wOuter(51.02) + 0.19), facePt(f, 34.12, 51.02, wOuter(51.02) + 0.19), 0.16, 0.22);

      // Molded spandrel backing panels above diamond trellis (54.00 -> 55.82 m, Pl. 20 horizontal corrugated fascia)
      pri.addQuad(
        facePt(f, -34.92, ySpandrel0, wS0), facePt(f, 34.92, ySpandrel0, wS0),
        facePt(f, 34.92, ySpandrel1, wS1), facePt(f, -34.92, ySpandrel1, wS1)
      );

      // 19 Vertical Riveted Console-Tail Divider Drops framing the 18 scientist plaques per facade (Photo 36)
      for (let k = -9; k <= 9; k++) {
        const uTop = k * BAY_W;
        const uBot = Math.max(-34.08, Math.min(34.08, uTop));
        const uPlq = Math.max(-34.84, Math.min(34.84, uTop));
        // Upper fascia console pilaster rib (52.54 -> 55.82 m) & inter-plaque console-tail divider (50.95 -> 52.58 m)
        pri.addBeam(facePt(f, uTop, yTop, wT + 0.04), facePt(f, uTop, ySpandrel1, wS1 + 0.06), 0.22, 0.20, [0, 0, 1]);
        pri.addBeam(facePt(f, uBot, yArchBot, wOuter(yArchBot) + 0.21), facePt(f, uPlq, yTop + 0.04, wT + 0.05), 0.22, 0.18, [0, 0, 1]);
        // Riveted corbel cap above plaque seam (52.50..52.88m) & lower pendant culot boss (50.95..51.34m, Photo 36)
        cast.addBeam(facePt(f, uPlq, 52.48, wT + 0.08), facePt(f, uTop, 52.88, wOuter(52.88) + 0.30), 0.26, 0.22, [0, 0, 1], true);
        cast.addBeam(facePt(f, uBot, yArchBot, wOuter(yArchBot) + 0.23), facePt(f, uPlq, 51.34, wB + 0.07), 0.25, 0.20, [0, 0, 1], true);
        cast.addSphere(facePt(f, uPlq, 51.95, (wB + wT) * 0.5 + 0.06), 0.055, 6, 5);
      }

      for (let b = 0; b < 18; b++) {
        const ua = -34.92 + b * BAY_W + 0.13;
        const ub = -34.92 + (b + 1) * BAY_W - 0.13;
        const u0Tex = b / 18, u1Tex = (b + 1) / 18;

        // Textured plaque quad carrying exact gold capital surname
        plaqueBuilder.addQuadUV(
          facePt(f, ua, yBot, wB), facePt(f, ub, yBot, wB),
          facePt(f, ub, yTop, wT), facePt(f, ua, yTop, wT),
          u0Tex, 0.0, u1Tex, 1.0
        );

        // 3D Gilded upper/lower & side plaque frame moldings (leaving crisp painted gold surname unobstructed!)
        gold.addBeam(facePt(f, ua, yBot + 0.04, wB + 0.02), facePt(f, ub, yBot + 0.04, wB + 0.02), 0.05, 0.04);
        gold.addBeam(facePt(f, ua, yTop - 0.04, wT + 0.02), facePt(f, ub, yTop - 0.04, wT + 0.02), 0.05, 0.04);
        gold.addBeam(facePt(f, ua + 0.03, yBot + 0.04, wB + 0.02), facePt(f, ua + 0.03, yTop - 0.04, wT + 0.02), 0.045, 0.04);
        gold.addBeam(facePt(f, ub - 0.03, yBot + 0.04, wB + 0.02), facePt(f, ub - 0.03, yTop - 0.04, wT + 0.02), 0.045, 0.04);
      }
    }

    out.push(pb.build(THREE, {
      id: 'z2_frieze_72_scientists_p9', phase: 9, span: [9.00, 9.40],
      plateRefs: ['20', '55'], photoRefs: ['36', '18'],
    }));
  }

  return out;
}
