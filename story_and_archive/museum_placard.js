/**
 * Stage 5 — Negative-Space Museum Exhibition Placard & Hero 3D Showcase Component
 *
 * Presents chronological 1887–1889 curatorial commentary inside each archival photograph's
 * verified negative-space zone (adapting automatically between neutral light and dark
 * achromatic black/white/grey surfaces), and renders the 5 architectural craftsmanship
 * focus presets on Stop 12 (Hero 3D Model Showcase).
 *
 * Stage 5 Streamlined Design Guarantees:
 *   - Borderless card (`border: none`, zero left accent border)
 *   - Pure black / white / grey palette (`chroma = 0`, zero brown tints)
 *   - Date-only eyebrow (zero `1 / 11` or `1 / 12` step counter)
 *   - Concise, literal stop titles with zero colons (`:`)
 *   - Zero metadata chips (`.m2-placard-inscription-row` / `.m2-placard-tag` removed)
 *   - Zero `Supporting Archival Plates` section (`.m2-placard-support` removed)
 *   - Strictly ZERO competing timeline/chapter/prev-next playthrough controls
 */

import {
  WALKTHROUGH_STOPS,
  HERO_FINALE_PRESETS,
  getWalkthroughStop,
  getStopForPhotoId,
} from './walkthrough_data.js';

const UI_COPY = Object.freeze({
  en: {
    collapseLabel: 'Hide placard text',
    expandLabel: 'Expand placard text',
    collapseShort: 'Hide',
    expandShort: 'Expand',
    heroPresetsHeading: '3D Architectural Vantages',
  },
  fr: {
    collapseLabel: 'Masquer le texte du cartel',
    expandLabel: 'Afficher le texte du cartel',
    collapseShort: 'Masquer',
    expandShort: 'Afficher',
    heroPresetsHeading: 'Points de vue architecturaux 3D',
  },
});

/**
 * Ensures any stop title rendered on a museum placard is concise and free of colons (`:`).
 * Canonical Stage 5 titles are already authored without colons; if an external caller supplies
 * a legacy `Prefix: Subject` string, keeps the concise literal side cleanly.
 *
 * @param {string} rawTitle
 * @returns {string}
 */
export function sanitizeStopTitle(rawTitle) {
  const str = String(rawTitle || '').trim();
  if (!str.includes(':')) return str;
  const parts = str
    .split(':')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length <= 1) return str.replace(/:/g, '').trim();
  const chosen = parts[parts.length - 1];
  return chosen.charAt(0).toUpperCase() + chosen.slice(1);
}

function createCollapseButtonNodes(isCollapsed, shortLabel) {
  const text = document.createElement('span');
  text.className = 'm2-placard-toggle-text';
  text.textContent = shortLabel;

  const glyph = document.createElement('span');
  glyph.className = 'm2-placard-toggle-glyph';
  glyph.setAttribute('aria-hidden', 'true');
  glyph.textContent = isCollapsed ? '+' : '−';

  return [text, glyph];
}

function normalizeExternalStop(raw, fallback) {
  if (!raw || typeof raw !== 'object') return fallback;
  const base = fallback || WALKTHROUGH_STOPS[0];
  const dateEn = raw.dateLabel?.en || raw.dateShortEn || base.dateLabel.en;
  const dateFr = raw.dateLabel?.fr || raw.dateShortFr || base.dateLabel.fr;
  const headEn = sanitizeStopTitle(raw.headline?.en || raw.headlineEn || raw.shortTitleEn || base.headline.en);
  const headFr = sanitizeStopTitle(raw.headline?.fr || raw.headlineFr || raw.shortTitleFr || base.headline.fr);
  const narrEn = raw.narrative?.en || raw.narrativeEn || base.narrative.en;
  const narrFr = raw.narrative?.fr || raw.narrativeFr || base.narrative.fr;
  const elevEn = raw.elevationSummary?.en || raw.elevationSummaryEn || base.elevationSummary.en;
  const elevFr = raw.elevationSummary?.fr || raw.elevationSummaryFr || base.elevationSummary.fr;
  const surfaceTheme =
    raw.placard?.surfaceTheme ||
    (raw.placardSurface === 'dark' ? 'dark_plinth' : raw.placardSurface === 'light' ? 'light_vellum' : null) ||
    base.placard.surfaceTheme;
  const normBboxXYWH =
    (Array.isArray(raw.placard?.normBboxXYWH) && raw.placard.normBboxXYWH.length >= 3
      ? raw.placard.normBboxXYWH
      : Array.isArray(raw.placardBbox) && raw.placardBbox.length >= 3
      ? raw.placardBbox
      : base.placard.normBboxXYWH);

  return {
    ...base,
    ...raw,
    stopIndex: Number.isFinite(Number(raw.stopIndex))
      ? Number(raw.stopIndex)
      : Number.isFinite(Number(raw.stopNumber))
      ? Number(raw.stopNumber)
      : base.stopIndex,
    kind: raw.kind || base.kind,
    primaryPhotoId:
      raw.primaryPhotoId !== undefined
        ? raw.primaryPhotoId
        : raw.photoId !== undefined
        ? raw.photoId
        : base.primaryPhotoId,
    dateLabel: { en: dateEn, fr: dateFr },
    headline: { en: headEn, fr: headFr },
    narrative: { en: narrEn, fr: narrFr },
    elevationSummary: { en: elevEn, fr: elevFr },
    placard: {
      ...base.placard,
      ...(raw.placard || {}),
      surfaceTheme,
      normBboxXYWH,
    },
  };
}

export class MuseumPlacard {
  /**
   * @param {HTMLElement} container Parent mount element (e.g. `#ui-overlay` or `document.body`)
   * @param {object} [options]
   * @param {'en'|'fr'} [options.lang='en']
   * @param {number} [options.initialStopIndex=1]
   * @param {Array<object>|null} [options.stops=null] Optional custom stop overrides
   * @param {number} [options.topSafePx=68]
   * @param {number} [options.bottomSafePx=92]
   * @param {(itemId: string, ctx: { stop: object }) => void} [options.onInspectArchiveItem]
   * @param {(preset: object, stop: object) => void} [options.onSelectHeroPreset]
   * @param {() => void} [options.onOpenArchiveGallery]
   */
  constructor(container, options = {}) {
    if (!container) {
      throw new Error('MuseumPlacard requires a valid DOM container element.');
    }
    this.container = container;
    this.lang = options.lang === 'fr' ? 'fr' : 'en';
    this.topSafePx = Number.isFinite(options.topSafePx) ? options.topSafePx : 68;
    this.bottomSafePx = Number.isFinite(options.bottomSafePx) ? options.bottomSafePx : 92;
    this.onSelectHeroPreset = options.onSelectHeroPreset || null;
    this.onCollapsedChange =
      typeof options.onCollapsedChange === 'function' ? options.onCollapsedChange : null;
    this._customStops = Array.isArray(options.stops) && options.stops.length > 0 ? options.stops : null;

    this._stop = this._resolveStop(options.initialStopIndex || 1);
    this._plateRect = null;
    this._is3DRevealed = false;
    this._activeHeroPresetId = 'overview';
    this._userToggledCollapse = typeof options.collapsed === 'boolean';
    this._collapsed =
      typeof options.collapsed === 'boolean' ? options.collapsed : this._isMobileViewport();
    this._visible = true;
    this._pointerDownPos = null;

    this._root = document.createElement('aside');
    this._root.className = 'm2-placard';
    this._root.classList.toggle('is-collapsed', this._collapsed);
    this._root.setAttribute('data-collapsed', this._collapsed ? 'true' : 'false');
    this._root.setAttribute('aria-live', 'polite');

    this._buildSkeleton();
    this.container.appendChild(this._root);

    this._onWindowResize = () => {
      if (!this._userToggledCollapse) {
        const shouldCollapse = this._isMobileViewport();
        if (this._collapsed !== shouldCollapse) {
          this.setCollapsed(shouldCollapse, { user: false });
          return;
        }
      }
      this._applyPosition();
    };
    window.addEventListener('resize', this._onWindowResize, { passive: true });

    this._renderContent();
    this._applyPosition();
  }

  _isMobileViewport() {
    return typeof window !== 'undefined' && (window.innerWidth || 1440) <= 860;
  }

  _resolveStop(stopIndexOrId, explicitStop = null) {
    const canonical = getWalkthroughStop(stopIndexOrId);
    if (explicitStop && typeof explicitStop === 'object') {
      const hasCustomNarrative = Boolean(explicitStop.narrative?.en || explicitStop.narrativeEn);
      if (hasCustomNarrative) {
        return normalizeExternalStop(explicitStop, canonical);
      }
      // If explicitStop is a lightweight controller stop (e.g. from WalkthroughController),
      // match by photoId / stopId first so narrative & elevationSummary match the photo.
      const photoQuery = explicitStop.photoId || explicitStop.primaryPhotoId;
      const matchedCanonical = photoQuery
        ? getStopForPhotoId(photoQuery) || getWalkthroughStop(explicitStop.stopId || stopIndexOrId)
        : getWalkthroughStop(explicitStop.stopId || stopIndexOrId);
      return normalizeExternalStop(explicitStop, matchedCanonical);
    }
    if (this._customStops) {
      const idx =
        typeof stopIndexOrId === 'number' && Number.isFinite(stopIndexOrId)
          ? Math.max(1, Math.min(this._customStops.length, Math.round(stopIndexOrId))) - 1
          : this._customStops.findIndex(
              (s) =>
                s.stopId === stopIndexOrId ||
                s.primaryPhotoId === String(stopIndexOrId || '').replace(/^photo_|^#/i, '').padStart(2, '0') ||
                s.photoId === String(stopIndexOrId || '').replace(/^photo_|^#/i, '').padStart(2, '0')
            );
      if (idx >= 0 && this._customStops[idx]) {
        return normalizeExternalStop(this._customStops[idx], canonical);
      }
    }
    return canonical;
  }

  get element() {
    return this._root;
  }

  getCurrentStop() {
    return this._stop;
  }

  getActiveHeroPreset() {
    return (
      HERO_FINALE_PRESETS.find((p) => p.presetId === this._activeHeroPresetId) ||
      HERO_FINALE_PRESETS[0]
    );
  }

  setStops(customStops) {
    this._customStops = Array.isArray(customStops) && customStops.length > 0 ? customStops : null;
    this._stop = this._resolveStop(this._stop.stopIndex);
    this._renderContent();
    this._applyPosition();
  }

  setStop(stopIndexOrId, state = {}) {
    const nextStop = this._resolveStop(stopIndexOrId, state.stop || null);
    const stopChanged = nextStop.stopIndex !== this._stop.stopIndex;
    this._stop = nextStop;

    if (state.plateRect !== undefined) {
      this._plateRect = state.plateRect;
    }
    if (state.is3DRevealed !== undefined) {
      this._is3DRevealed = Boolean(state.is3DRevealed);
    }
    if (state.activeHeroPresetId !== undefined) {
      this._activeHeroPresetId = state.activeHeroPresetId;
    } else if (stopChanged && nextStop.kind === 'hero_3d_model_finale') {
      this._activeHeroPresetId = 'overview';
    }

    this._renderContent();
    this._applyPosition();
  }

  updatePlateRect(plateRect) {
    this._plateRect = plateRect || null;
    this._applyPosition();
  }

  set3DRevealState(isRevealed) {
    const next = Boolean(isRevealed);
    if (this._is3DRevealed === next) return;
    this._is3DRevealed = next;
    this._renderContent();
    this._applyPosition();
  }

  setActiveHeroPreset(presetId) {
    if (!presetId || this._activeHeroPresetId === presetId) return;
    this._activeHeroPresetId = presetId;
    if (this._stop.kind === 'hero_3d_model_finale') {
      this._renderContent();
      this._applyPosition();
    }
  }

  setLanguage(lang) {
    const normalized = lang === 'fr' ? 'fr' : 'en';
    if (this.lang === normalized) return;
    this.lang = normalized;
    this._renderContent();
    this._applyPosition();
  }

  isCollapsed() {
    return this._collapsed;
  }

  setCollapsed(collapsed, { user = true } = {}) {
    if (user) {
      this._userToggledCollapse = true;
    }
    const next = Boolean(collapsed);
    const changed = this._collapsed !== next;
    this._collapsed = next;
    this._root.classList.toggle('is-collapsed', this._collapsed);
    this._root.setAttribute('data-collapsed', this._collapsed ? 'true' : 'false');
    this._syncCollapseButton();
    this._applyPosition();
    if (changed) {
      this._root.scrollTop = 0;
      if (typeof this.onCollapsedChange === 'function') {
        this.onCollapsedChange(this._collapsed);
      }
    }
  }

  setVisible(visible) {
    this._visible = Boolean(visible);
    this._root.hidden = !this._visible;
  }

  destroy() {
    window.removeEventListener('resize', this._onWindowResize);
    if (this._root && this._root.parentNode) {
      this._root.parentNode.removeChild(this._root);
    }
  }

  _buildSkeleton() {
    this._eyebrowRow = document.createElement('div');
    this._eyebrowRow.className = 'm2-placard-eyebrow-row';

    this._metaEl = document.createElement('div');
    this._metaEl.className = 'm2-placard-meta';

    this._collapseBtn = document.createElement('button');
    this._collapseBtn.type = 'button';
    this._collapseBtn.className = 'm2-placard-collapse-btn';
    this._collapseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setCollapsed(!this._collapsed);
    });

    this._root.addEventListener('pointerdown', (e) => {
      this._pointerDownPos = { x: e.clientX, y: e.clientY };
    });

    this._root.addEventListener('click', (e) => {
      if (this._pointerDownPos) {
        const dx = e.clientX - this._pointerDownPos.x;
        const dy = e.clientY - this._pointerDownPos.y;
        this._pointerDownPos = null;
        if (Math.hypot(dx, dy) > 8) return;
      }
      const target = e.target instanceof Element ? e.target : null;
      if (!target) return;
      if (target.closest('button, a, input, select, textarea, [role="button"], .m2-hero-preset-grid')) {
        return;
      }
      const sel = typeof window !== 'undefined' ? window.getSelection?.() : null;
      if (sel && !sel.isCollapsed && this._root.contains(sel.anchorNode)) {
        return;
      }
      this.setCollapsed(!this._collapsed);
    });

    this._eyebrowRow.appendChild(this._metaEl);
    this._eyebrowRow.appendChild(this._collapseBtn);

    this._headlineEl = document.createElement('h2');
    this._headlineEl.className = 'm2-placard-headline';

    this._bodyEl = document.createElement('div');
    this._bodyEl.className = 'm2-placard-body';

    this._narrativeEl = document.createElement('p');
    this._narrativeEl.className = 'm2-placard-narrative';

    this._elevationEl = document.createElement('div');
    this._elevationEl.className = 'm2-placard-elevation';

    this._heroWrapEl = document.createElement('div');
    this._heroWrapEl.className = 'm2-hero-presets';

    // Stage 5: Streamlined body — narrative + elevation summary + (on Stop 11) 3D presets.
    // Metadata brown chips (`.m2-placard-inscription-row`) and `Supporting Archival Plates`
    // (`.m2-placard-support`) are intentionally omitted from the placard DOM.
    this._bodyEl.appendChild(this._narrativeEl);
    this._bodyEl.appendChild(this._elevationEl);
    this._bodyEl.appendChild(this._heroWrapEl);

    this._root.appendChild(this._eyebrowRow);
    this._root.appendChild(this._headlineEl);
    this._root.appendChild(this._bodyEl);
  }

  _syncCollapseButton() {
    const copy = UI_COPY[this.lang];
    const label = this._collapsed ? copy.expandLabel : copy.collapseLabel;
    const shortLabel = this._collapsed ? copy.expandShort : copy.collapseShort;
    this._collapseBtn.setAttribute('aria-label', label);
    this._collapseBtn.setAttribute('title', label);
    this._collapseBtn.setAttribute('aria-expanded', String(!this._collapsed));
    this._collapseBtn.replaceChildren(...createCollapseButtonNodes(this._collapsed, shortLabel));
  }

  _renderContent() {
    const stop = this._stop;
    const lang = this.lang;
    const copy = UI_COPY[lang];

    // Choose neutral surface polarity: if 3D revealed on photo stops, use dark_plinth
    const theme =
      this._is3DRevealed && stop.kind !== 'hero_3d_model_finale'
        ? 'dark_plinth'
        : stop.placard.surfaceTheme;
    this._root.setAttribute('data-theme', theme);
    this._root.setAttribute('data-stop-index', String(stop.stopIndex));

    // Stage 5 Eyebrow: historical date only (zero `1 / 11` or `1 / 12` fraction counter)
    const dateSpan = document.createElement('span');
    dateSpan.textContent = stop.dateLabel[lang];
    this._metaEl.replaceChildren(dateSpan);

    this._syncCollapseButton();
    this._headlineEl.textContent = sanitizeStopTitle(stop.headline[lang]);

    this._narrativeEl.textContent = stop.narrative[lang];
    this._elevationEl.textContent = stop.elevationSummary[lang];
    this._elevationEl.hidden = !stop.elevationSummary[lang];

    // Stop 11 Hero 3D Model Showcase Craftsmanship Presets + Archive CTA
    this._heroWrapEl.replaceChildren();
    if (stop.kind === 'hero_3d_model_finale') {
      const heading = document.createElement('div');
      heading.className = 'm2-placard-section-label';
      heading.textContent = copy.heroPresetsHeading;

      const grid = document.createElement('div');
      grid.className = 'm2-hero-preset-grid';

      const activePreset = this.getActiveHeroPreset();
      for (const preset of HERO_FINALE_PRESETS) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'm2-hero-preset-btn';
        if (preset.presetId === activePreset.presetId) {
          btn.classList.add('is-active');
        }
        const leftWrap = document.createElement('span');
        leftWrap.textContent = preset.label[lang];

        const numEl = document.createElement('span');
        numEl.className = 'm2-hero-preset-num';
        numEl.textContent = preset.numeral === '0' ? '300 m' : preset.numeral;

        btn.append(leftWrap, numEl);
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this._activeHeroPresetId = preset.presetId;
          this._renderContent();
          this._applyPosition();
          if (typeof this.onSelectHeroPreset === 'function') {
            this.onSelectHeroPreset(preset, stop);
          }
        });
        grid.appendChild(btn);
      }

      const cap = document.createElement('p');
      cap.className = 'm2-hero-preset-caption';
      cap.textContent = activePreset.caption[lang];

      this._heroWrapEl.append(heading, grid, cap);
      this._heroWrapEl.hidden = false;
    } else {
      this._heroWrapEl.hidden = true;
    }
  }

  _applyPosition() {
    if (typeof window === 'undefined' || !this._visible) return;
    const vw = window.innerWidth || 1440;
    const vh = window.innerHeight || 900;

    // Mobile / tablet responsive dock handled via CSS media query (`<= 860px`)
    if (vw <= 860) {
      this._root.style.left = '';
      this._root.style.top = '';
      return;
    }

    const cardRect = this._root.getBoundingClientRect();
    const cardW = cardRect.width > 40 ? cardRect.width : 352;
    const cardH = cardRect.height > 40 ? cardRect.height : 220;

    let targetX = 24;
    let targetY = this.topSafePx;

    const r = this._plateRect;
    const [bx, by, bw] = this._stop.placard.normBboxXYWH;

    if (
      r &&
      r.width >= 260 &&
      r.height >= 240 &&
      !this._is3DRevealed &&
      this._stop.kind !== 'hero_3d_model_finale'
    ) {
      const negativeSpacePx = (Number(bw) || 0.32) * r.width;
      const rightMarginPx = vw - (r.x + r.width);
      // On narrow vertical/portrait plates (#14, #01, #46, #18, #55), hang the placard cleanly
      // in the open museum wall margin beside the frame so 0% of the Tower shaft or drawing is covered.
      if (negativeSpacePx < cardW * 0.86 && bx < 0.45 && r.x >= cardW + 36) {
        targetX = Math.max(24, Math.round(r.x - cardW - 18));
        targetY = Math.max(this.topSafePx, Math.round(r.y + Math.max(12, by * r.height)));
      } else if (negativeSpacePx < cardW * 0.86 && bx >= 0.45 && rightMarginPx >= cardW + 36) {
        targetX = Math.round(r.x + r.width + 18);
        targetY = Math.max(this.topSafePx, Math.round(r.y + Math.max(12, by * r.height)));
      } else {
        targetX = Math.round(r.x + bx * r.width);
        targetY = Math.round(r.y + by * r.height);
        // Never allow an in-plate placard (e.g. bottom-left shadow zone on #51) to overhang
        // below the plate frame or bottom-edge glass inscriptions.
        const maxInsidePlateY = Math.max(
          Math.round(r.y + 12),
          Math.round(r.y + r.height - cardH - 14)
        );
        targetY = Math.min(targetY, maxInsidePlateY);
      }
    } else {
      // Pure 3D / Hero Finale: place in calm left margin well clear of central Tower
      targetX = Math.max(24, Math.round(vw * bx));
      targetY = Math.max(this.topSafePx, Math.round(vh * by));
    }

    const maxX = Math.max(20, vw - cardW - 22);
    const maxY = Math.max(this.topSafePx, vh - this.bottomSafePx - cardH);

    const clampedX = Math.max(20, Math.min(maxX, targetX));
    const clampedY = Math.max(this.topSafePx, Math.min(maxY, targetY));

    this._root.style.left = `${clampedX}px`;
    this._root.style.top = `${clampedY}px`;
  }
}

export function createMuseumPlacard(container, options = {}) {
  return new MuseumPlacard(container, options);
}
