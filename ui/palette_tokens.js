/**
 * Museum Exhibition Palette Tokens & Neutral Colorimetry Auditor (`museum_v2` Stage 6)
 *
 * Stage 5 & Stage 6 Curatorial UI Guarantees:
 *   - Visitor UI Chrome, Intro & Label Overlays use pure achromatic Black / White / Grey (`R === G === B`, zero brown/sepia):
 *       1. Zone A — Dark Gallery Matte (`#121212` / `#1c1c1c` with `#f5f5f5` white ink & `#d4d4d4` light grey)
 *       2. Zone B — Light Gallery Label & Archive (`#f2f2f2` / `#ffffff` with `#121212` black ink & `#383838` dark grey)
 *   - Read-only 3D scene material/fog reference palettes (`TOWER_HERO_PBR_PALETTE`, `PARIS_SKETCH_FOG_PALETTE`,
 *     `MEASURED_ARCHIVAL_SWATCHES`) remain exported intact for 3D scene compatibility.
 *   - Stage 6 Auditor (`auditStage6UiCompliance`) verifies Stage 5 neutral rules PLUS `0` decimal meter heights
 *     in visitor text.
 */

export const UI_DARK_PLINTH_TOKENS = Object.freeze({
  '--bg-museum-canvas': '#121212',
  '--surface-plate-plinth': '#1c1c1c',
  '--surface-plate-elevated': '#292929',
  '--surface-plate-active': '#363636',
  '--surface-plate-overlay': 'rgba(18, 18, 18, 0.90)',
  '--surface-dark-placard': 'rgba(20, 20, 20, 0.93)',
  '--border-plate-subtle': '#383838',
  '--border-plate-interactive': '#737373',
  '--text-on-dark-primary': '#f5f5f5',
  '--text-on-dark-secondary': '#d4d4d4',
  '--text-on-dark-muted': '#a3a3a3',
  '--accent-on-dark-vellum': '#ffffff',
  '--accent-on-dark-iron': '#bdbdbd',
  '--focus-ring-on-dark': '#ffffff',
});

export const UI_LIGHT_VELLUM_TOKENS = Object.freeze({
  '--bg-vellum-paper': '#f2f2f2',
  '--surface-vellum-card': '#ffffff',
  '--surface-vellum-inset': '#e6e6e6',
  '--surface-photo-placard': 'rgba(255, 255, 255, 0.94)',
  '--border-vellum-subtle': '#d4d4d4',
  '--border-vellum-interactive': '#737373',
  '--text-on-light-primary': '#121212',
  '--text-on-light-secondary': '#383838',
  '--text-on-light-muted': '#595959',
  '--accent-on-light-iron': '#141414',
  '--accent-on-light-sage': '#474747',
  '--focus-ring-on-light': '#121212',
});

export const MEASURED_ARCHIVAL_SWATCHES = Object.freeze({
  collodion_deep_iron: { hex: '#141413', threeHex: 0x141413, sources: ['13', '32', '38', '51'] },
  puddled_iron_silhouette: { hex: '#1e1d1b', threeHex: 0x1e1d1b, sources: ['01', '14', '18', '47'] },
  albumen_charcoal_shadow: { hex: '#3c3a3b', threeHex: 0x3c3a3b, sources: ['02', '23', '46'] },
  litho_etching_ink: { hex: '#45433d', threeHex: 0x45433d, sources: ['04', '25', '57'] },
  rouge_de_venise_shadow: { hex: '#5a473a', threeHex: 0x5a473a, sources: ['25', '64'] },
  rouge_de_venise_sunlit: { hex: '#685746', threeHex: 0x685746, sources: ['25', '31'] },
  champ_de_mars_foliage_muted: { hex: '#615d55', threeHex: 0x615d55, sources: ['57', '07'] },
  albumen_silver_midtone: { hex: '#767475', threeHex: 0x767475, sources: ['02', '06', '51'] },
  lemercier_sage_iron_wash: { hex: '#8f907f', threeHex: 0x8f907f, sources: ['69', '49'] },
  antique_laurel_ochre: { hex: '#9e7f5e', threeHex: 0x9e7f5e, sources: ['64', '61', '07'] },
  albumen_mist_sky: { hex: '#acabab', threeHex: 0xacabab, sources: ['02', '46', '32'] },
  ecole_militaire_haze: { hex: '#c4b0ab', threeHex: 0xc4b0ab, sources: ['57', '37'] },
  chateau_landon_limestone: { hex: '#d0c5a9', threeHex: 0xd0c5a9, sources: ['69', '03', '63'] },
  esplanade_crushed_gravel: { hex: '#dcd8cf', threeHex: 0xdcd8cf, sources: ['36', '38', '01', '57'] },
  lemercier_vellum_ground: { hex: '#eadac1', threeHex: 0xeadac1, sources: ['03', '08', '20', '45', '53', '69'] },
  glass_plate_pearl_sky: { hex: '#efede8', threeHex: 0xefede8, sources: ['09', '14', '18', '36'] },
});

export const TOWER_HERO_PBR_PALETTE = Object.freeze({
  ironPrimary: { hex: '#5a473a', threeHex: 0x5a473a, roughness: 0.54, metalness: 0.42 },
  ironLattice: { hex: '#685746', threeHex: 0x685746, roughness: 0.56, metalness: 0.38 },
  ironSecondary: { hex: '#44372f', threeHex: 0x44372f, roughness: 0.58, metalness: 0.46 },
  ironCast: { hex: '#2b2927', threeHex: 0x2b2927, roughness: 0.48, metalness: 0.58 },
  craneSteel: { hex: '#3c3a38', threeHex: 0x3c3a38, roughness: 0.46, metalness: 0.60 },
  masonryAshlar: { hex: '#d2c8b4', threeHex: 0xd2c8b4, roughness: 0.84, metalness: 0.02 },
  concreteSub: { hex: '#9c9589', threeHex: 0x9c9589, roughness: 0.92, metalness: 0.00 },
  woodPavilion: { hex: '#76614d', threeHex: 0x76614d, roughness: 0.68, metalness: 0.04 },
  woodTimberTemp: { hex: '#b8ab96', threeHex: 0xb8ab96, roughness: 0.86, metalness: 0.00 },
  glass1889: { hex: '#cfd4d0', threeHex: 0xcfd4d0, roughness: 0.12, metalness: 0.05, opacity: 0.36 },
  lampGlobe1889: { hex: '#ebe6dc', threeHex: 0xebe6dc, roughness: 0.32, metalness: 0.00, opacity: 0.88 },
  copperDome: { hex: '#6a6f65', threeHex: 0x6a6f65, roughness: 0.46, metalness: 0.45 },
  goldAccent: { hex: '#9a8262', threeHex: 0x9a8262, roughness: 0.42, metalness: 0.62 },
  elevatorCabinRed: { hex: '#5e3d31', threeHex: 0x5e3d31, roughness: 0.52, metalness: 0.18 },
  flagNavyMuted: { hex: '#2f3b46', threeHex: 0x2f3b46, roughness: 0.82, metalness: 0.00 },
  flagWhiteMuted: { hex: '#eae5dc', threeHex: 0xeae5dc, roughness: 0.82, metalness: 0.00 },
  flagRedMuted: { hex: '#7d3d33', threeHex: 0x7d3d33, roughness: 0.82, metalness: 0.00 },
});

export const PARIS_SKETCH_FOG_PALETTE = Object.freeze({
  skyZenithHex: '#d2cec6',
  skyMidHex: '#e2dfd8',
  skyHorizonHex: '#efece5',
  distanceFogHex: '#e6e2da',
  esplanadeGravelBaseHex: '#dbd6cc',
  esplanadeGravelGrainDarkHex: '#bfb9ae',
  esplanadeGravelGrainLightHex: '#e8e4dc',
  excavationEarthHex: '#787167',
  parterreTurfMutedHex: '#8c887f',
  treeCanopySketchHex: '#635f57',
  parisMassingWallLightHex: '#dfdacf',
  parisMassingWallMidHex: '#c4beb3',
  parisMassingRoofSlateHex: '#807c75',
  parisSketchEdgeInkHex: '#383531',
  parisDistantSilhouetteInkHex: '#7a756d',
  seineWaterCollodionHex: '#b7b4ae',
  fountainBasinWaterHex: '#aba8a1',
});

/**
 * Visitor-mode forbidden technical metadata regex.
 */
export const FORBIDDEN_VISITOR_TEXT_REGEX =
  /\b(RMSE|tris|triangles|draw calls|FPS|TTFL|viewOffset|quat|zone[1-5]|pbr|xray|step\s*\d)\b/i;

/**
 * Stage 6 visitor-mode decimal meter height detector (ensures all meter dimensions are rounded to nearest meter).
 */
export const DECIMAL_METER_HEIGHT_REGEX =
  /\b\d+[.,]\d+\s*(?:m|meters?|mètres?|-meter|-mètre)\b/gi;

/**
 * Applies all neutral black/white/grey UI CSS custom properties directly onto a target element
 * (defaults to `document.documentElement`), ensuring programmatic parity with `style.css`.
 */
export function applyRootPaletteTokens(targetEl = typeof document !== 'undefined' ? document.documentElement : null) {
  if (!targetEl || !targetEl.style) return;
  for (const [k, v] of Object.entries(UI_DARK_PLINTH_TOKENS)) {
    targetEl.style.setProperty(k, v);
  }
  for (const [k, v] of Object.entries(UI_LIGHT_VELLUM_TOKENS)) {
    targetEl.style.setProperty(k, v);
  }
}

export function parseCssColorToRgb(colorStr) {
  if (!colorStr || typeof colorStr !== 'string') return null;
  const s = colorStr.trim();
  const hexMatch = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
  if (hexMatch) {
    const raw = hexMatch[1];
    if (raw.length === 3) {
      return [
        parseInt(raw[0] + raw[0], 16),
        parseInt(raw[1] + raw[1], 16),
        parseInt(raw[2] + raw[2], 16),
        1,
      ];
    }
    return [
      parseInt(raw.slice(0, 2), 16),
      parseInt(raw.slice(2, 4), 16),
      parseInt(raw.slice(4, 6), 16),
      1,
    ];
  }
  const rgbaMatch = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(s);
  if (rgbaMatch) {
    return [
      Number(rgbaMatch[1]),
      Number(rgbaMatch[2]),
      Number(rgbaMatch[3]),
      rgbaMatch[4] !== undefined ? Number(rgbaMatch[4]) : 1,
    ];
  }
  return null;
}

export function computeRelativeLuminance([r, g, b]) {
  const toLinear = (c) => {
    const v = Math.max(0, Math.min(255, c)) / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function computeContrastRatio(fgColor, bgColor) {
  const fg = Array.isArray(fgColor) ? fgColor : parseCssColorToRgb(fgColor);
  const bg = Array.isArray(bgColor) ? bgColor : parseCssColorToRgb(bgColor);
  if (!fg || !bg) return null;
  const l1 = computeRelativeLuminance(fg);
  const l2 = computeRelativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export function rgbToHsl([r, g, b]) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
        break;
    }
    h *= 60;
  }
  return { h: Math.round(h), s: Number((s * 100).toFixed(1)), l: Number((l * 100).toFixed(1)) };
}

/**
 * Programmatic DOM auditor verifying:
 *   1. Zero brown/warm/bright synthetic colors in computed UI styles (`chroma <= 2` achromatic black/white/grey)
 *   2. Zero `backdrop-filter` glassmorphism over WebGL
 *   3. Zero `sepia()` CSS filters on images in visitor view
 *   4. Zero forbidden technical strings in visible visitor DOM
 */
export function auditVisitorDomCompliance(root = typeof document !== 'undefined' ? document.body : null) {
  const domRoot = root && root.nodeType === 9 ? root.body : root;
  if (!domRoot || typeof window === 'undefined') {
    return { passes: false, reason: 'No DOM root available' };
  }

  const brightColorViolations = [];
  const brownHueViolations = [];
  const backdropFilterViolations = [];
  const sepiaFilterViolations = [];

  const elements = domRoot.querySelectorAll('*');
  for (const el of elements) {
    if (el.closest('#museum-debug-drawer')) continue;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') continue;

    const bf = style.backdropFilter || style.webkitBackdropFilter || 'none';
    if (bf && bf !== 'none') {
      backdropFilterViolations.push({ id: el.id || el.className || el.tagName, backdropFilter: bf });
    }

    if (el.tagName === 'IMG' && style.filter && style.filter.includes('sepia')) {
      sepiaFilterViolations.push({ id: el.id || el.className || el.src, filter: style.filter });
    }

    for (const prop of [
      'color',
      'backgroundColor',
      'borderTopColor',
      'borderLeftColor',
      'borderRightColor',
      'borderBottomColor',
    ]) {
      const rgb = parseCssColorToRgb(style[prop]);
      if (!rgb || rgb[3] === 0) continue;
      const chroma = Math.max(rgb[0], rgb[1], rgb[2]) - Math.min(rgb[0], rgb[1], rgb[2]);
      const { h, s, l } = rgbToHsl(rgb);
      if (chroma > 2) {
        brownHueViolations.push({
          element: el.id || el.className || el.tagName,
          prop,
          value: style[prop],
          chroma,
          hsl: `hsl(${h}, ${s}%, ${l}%)`,
        });
      }
      if (s > 4 && l > 5 && l < 98) {
        brightColorViolations.push({
          element: el.id || el.className || el.tagName,
          prop,
          value: style[prop],
          hsl: `hsl(${h}, ${s}%, ${l}%)`,
        });
      }
    }
  }

  const visibleText = domRoot.innerText || '';
  const techMatches = visibleText.match(new RegExp(FORBIDDEN_VISITOR_TEXT_REGEX.source, 'gi')) || [];

  return {
    passes:
      brightColorViolations.length === 0 &&
      brownHueViolations.length === 0 &&
      backdropFilterViolations.length === 0 &&
      sepiaFilterViolations.length === 0 &&
      techMatches.length === 0,
    brightColorViolations,
    brownHueViolations,
    backdropFilterViolations,
    sepiaFilterViolations,
    forbiddenTechnicalStrings: techMatches,
  };
}

/**
 * Dedicated Stage 5 UI & Label Auditor verifying:
 *   1. Achromatic black/white/grey UI (`maxChroma <= 2`, zero brown hues)
 *   2. Zero left border on `.m2-placard` (`borderLeftWidth === '0px'`)
 *   3. Zero metadata chips (`.m2-placard-tag`, `.m2-placard-inscription-row`)
 *   4. Zero supporting-plates section (`.m2-placard-support`, `.m2-support-chip`)
 *   5. Zero colons in active placard headline
 *   6. Zero step fraction counters (`1 / 11`, `01 / 12`, etc.) in placard or `#exhibition-walkthrough-bar`
 *   7. Zero `63` item counter in `#museum-header`
 */
export function auditStage5NeutralUiCompliance(root = typeof document !== 'undefined' ? document.body : null) {
  const domRoot = root && root.nodeType === 9 ? root.body : root;
  const baseAudit = auditVisitorDomCompliance(domRoot);
  if (!domRoot || typeof window === 'undefined') {
    return { passes: false, reason: 'No DOM root available', baseAudit };
  }

  const placardEl = domRoot.querySelector('.m2-placard');
  const placardStyle = placardEl ? window.getComputedStyle(placardEl) : null;
  const placardBorderLeftWidth = placardStyle ? placardStyle.borderLeftWidth : '0px';

  const metadataChipCount = domRoot.querySelectorAll(
    '.m2-placard-tag, .m2-placard-inscription-row'
  ).length;
  const supportingSectionCount = domRoot.querySelectorAll(
    '.m2-placard-support, .m2-support-chip'
  ).length;

  const headlineText = (domRoot.querySelector('.m2-placard-headline')?.textContent || '').trim();
  const hasColonInHeadline = headlineText.includes(':');

  const placardMetaText = (domRoot.querySelector('.m2-placard-meta')?.textContent || '').trim();
  const barEl = domRoot.querySelector('#exhibition-walkthrough-bar');
  const barText = (barEl?.innerText || barEl?.textContent || '').trim();
  const fractionRegex = /\b\d+\s*\/\s*\d+\b/;
  const hasPlacardStepCounter =
    Boolean(domRoot.querySelector('.m2-placard-stop-num')) || fractionRegex.test(placardMetaText);
  const hasTimelineStepCounter =
    Boolean(domRoot.querySelector('#walkthrough-stop-counter, .walkthrough-counter')) ||
    fractionRegex.test(barText);

  const headerEl = domRoot.querySelector('#museum-header, .m2-exhibition-header');
  const headerText = (headerEl?.innerText || headerEl?.textContent || '').trim();
  const hasHeader63Counter =
    Boolean(domRoot.querySelector('.museum-archive-count, .m2-header-count')) ||
    /\b63\b/.test(headerText);

  return {
    passes:
      baseAudit.passes &&
      placardBorderLeftWidth === '0px' &&
      metadataChipCount === 0 &&
      supportingSectionCount === 0 &&
      !hasColonInHeadline &&
      !hasPlacardStepCounter &&
      !hasTimelineStepCounter &&
      !hasHeader63Counter,
    placardBorderLeftWidth,
    metadataChipCount,
    supportingSectionCount,
    headlineText,
    hasColonInHeadline,
    placardMetaText,
    hasPlacardStepCounter,
    barText,
    hasTimelineStepCounter,
    headerText,
    hasHeader63Counter,
    brownHueViolations: baseAudit.brownHueViolations,
    baseAudit,
  };
}

/**
 * Dedicated Stage 6 UI & Rounded Meters Auditor verifying:
 *   1. All Stage 5 Neutral UI compliance rules (`auditStage5NeutralUiCompliance`)
 *   2. Zero decimal meter heights (`57.6 m`, `115.7 m`, `312.275 m`, etc.) in visible visitor text
 *   3. Zero colons in `#landing-intro-title` when landing intro is present
 */
export function auditStage6UiCompliance(root = typeof document !== 'undefined' ? document.body : null) {
  const domRoot = root && root.nodeType === 9 ? root.body : root;
  const stage5 = auditStage5NeutralUiCompliance(domRoot);
  if (!domRoot || typeof window === 'undefined') {
    return { passes: false, reason: 'No DOM root available', stage5 };
  }

  const visibleVisitorText = domRoot.innerText || '';
  const decimalMeterMatches =
    visibleVisitorText.match(new RegExp(DECIMAL_METER_HEIGHT_REGEX.source, 'gi')) || [];

  const landingTitleText = (domRoot.querySelector('#landing-intro-title')?.textContent || '').trim();
  const hasColonInLandingTitle = landingTitleText.includes(':');

  return {
    passes:
      stage5.passes &&
      decimalMeterMatches.length === 0 &&
      !hasColonInLandingTitle,
    decimalMeterMatches,
    landingTitleText,
    hasColonInLandingTitle,
    stage5,
  };
}
