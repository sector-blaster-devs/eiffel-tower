/**
 * Stage 6 — Post-Load Monochrome Intro & 'Explore' Entry Overlay (`museum_v2`)
 *
 * Once asset loading completes, presents the full completed 1889 Tower (`step = 11.0`)
 * unobstructed in the 3D background with a calm, pure monochrome (`chroma = 0`)
 * museum title & 'Explore' / 'Explorer' button in the lower-left margin.
 *
 * Deterministic & Deep-Link Bypasses:
 *   - Automatically skipped when URL contains `?intro=0|false`, `?skipIntro=1|true`,
 *     `?stop=...`, `?photo=...`, `?chapter=...`, `?autoplay=1|true`,
 *     `?record=1|true`, `?deterministic=1|true`, or `?debug=1|true`.
 *   - Immediately exited when `enterDeterministicMode(...)`, `goToStop(...)`,
 *     or Archive `"Visit Stop N"` is invoked programmatically.
 */

const INTRO_STRINGS = Object.freeze({
  en: {
    regionAria: 'Exhibition introduction',
    eyebrow: '1887–1889 · Champ-de-Mars, Paris',
    title: 'The 300-Meter Tower',
    subtitle:
      'Gustave Eiffel’s riveted iron tower for the 1889 Exposition Universelle, reconstructed from original engineering drawings and construction photographs.',
    exploreLabel: 'Explore',
    exploreAria: 'Explore the 1887–1889 Eiffel Tower exhibition',
    legalLinks: [
      { tab: 'credits', label: 'Credits & Licenses' },
      { tab: 'terms', label: 'Terms of Use' },
      { tab: 'privacy', label: 'Privacy Policy' },
    ],
  },
  fr: {
    regionAria: 'Introduction de l’exposition',
    eyebrow: '1887–1889 · Champ-de-Mars, Paris',
    title: 'La Tour de 300 mètres',
    subtitle:
      'La tour en fer riveté de Gustave Eiffel pour l’Exposition universelle de 1889, reconstituée d’après les plans d’exécution et photographies du chantier.',
    exploreLabel: 'Explorer',
    exploreAria: 'Explorer l’exposition de la Tour Eiffel 1887–1889',
    legalLinks: [
      { tab: 'credits', label: 'Crédits & Licences' },
      { tab: 'terms', label: 'Conditions d’utilisation' },
      { tab: 'privacy', label: 'Confidentialité' },
    ],
  },
});

function normalizeLang(raw) {
  return String(raw || '').trim().toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

function isTruthyParam(val) {
  const s = String(val || '').trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes';
}

function isFalsyParam(val) {
  const s = String(val || '').trim().toLowerCase();
  return s === '0' || s === 'false' || s === 'no';
}

/**
 * Determines whether the visitor session should open on the post-load full-3D
 * 'Explore' landing state (true by default for normal interactive visits; false
 * when deep-linking to a stop/photo or running deterministic/debug automation).
 *
 * @param {string} [searchString]
 * @returns {boolean}
 */
export function shouldStartInLandingMode(searchString = undefined) {
  const raw =
    searchString !== undefined
      ? String(searchString || '')
      : typeof window !== 'undefined' && window.location
      ? window.location.search
      : '';
  if (!raw) return true;

  try {
    const params = new URLSearchParams(raw);
    if (params.has('intro') && isFalsyParam(params.get('intro'))) return false;
    if (params.has('skipIntro') && isTruthyParam(params.get('skipIntro'))) return false;
    if (params.has('stop') && String(params.get('stop') || '').trim() !== '') return false;
    if (params.has('photo') && String(params.get('photo') || '').trim() !== '') return false;
    if (params.has('chapter') && String(params.get('chapter') || '').trim() !== '') return false;
    if (isTruthyParam(params.get('autoplay'))) return false;
    if (isTruthyParam(params.get('record'))) return false;
    if (isTruthyParam(params.get('deterministic'))) return false;
    if (isTruthyParam(params.get('debug'))) return false;
  } catch {
    return true;
  }
  return true;
}

export class LandingIntro {
  /**
   * @param {object} [options]
   * @param {HTMLElement|string|null} [options.container=null]
   * @param {HTMLElement|null} [options.parent=null]
   * @param {'en'|'fr'} [options.lang='en']
   * @param {boolean} [options.active=true]
   * @param {() => void} [options.onExplore=null]
   */
  constructor({
    container = null,
    parent = null,
    lang = 'en',
    active = true,
    onExplore = null,
    onOpenLegal = null,
  } = {}) {
    this._lang = normalizeLang(lang);
    this._active = Boolean(active);
    this.onExplore = typeof onExplore === 'function' ? onExplore : null;
    this.onOpenLegal = typeof onOpenLegal === 'function' ? onOpenLegal : null;

    this.el = null;
    this._eyebrowEl = null;
    this._titleEl = null;
    this._subtitleEl = null;
    this._exploreBtn = null;
    this._exploreLabelEl = null;
    this._legalNavEl = null;

    this._mount(container, parent);
    this._syncDom();
  }

  _mount(container, parent) {
    if (typeof document === 'undefined') return;

    let root = null;
    if (typeof container === 'string') {
      root = document.querySelector(container);
    } else if (container instanceof HTMLElement) {
      root = container;
    }
    if (!root) {
      root = document.getElementById('museum-landing-intro');
    }
    if (!root) {
      root = document.createElement('section');
      root.id = 'museum-landing-intro';
      const host =
        (parent instanceof HTMLElement && parent) ||
        document.getElementById('museum-ui-root') ||
        document.getElementById('monograph-ui') ||
        document.body;
      host.appendChild(root);
    }

    root.className = 'm2-landing-intro';
    root.setAttribute('role', 'region');
    root.replaceChildren();

    const eyebrow = document.createElement('div');
    eyebrow.id = 'landing-intro-eyebrow';
    eyebrow.className = 'm2-landing-eyebrow';

    const title = document.createElement('h1');
    title.id = 'landing-intro-title';
    title.className = 'm2-landing-title';

    const subtitle = document.createElement('p');
    subtitle.id = 'landing-intro-subtitle';
    subtitle.className = 'm2-landing-subtitle';

    const exploreBtn = document.createElement('button');
    exploreBtn.type = 'button';
    exploreBtn.id = 'btn-landing-explore';
    exploreBtn.className = 'm2-landing-explore-btn';

    const exploreLabel = document.createElement('span');
    exploreLabel.className = 'm2-landing-explore-label';

    const arrowSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arrowSvg.setAttribute('viewBox', '0 0 24 24');
    arrowSvg.setAttribute('aria-hidden', 'true');
    arrowSvg.classList.add('m2-landing-explore-icon');
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '5');
    line.setAttribute('y1', '12');
    line.setAttribute('x2', '19');
    line.setAttribute('y2', '12');
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    poly.setAttribute('points', '13 6 19 12 13 18');
    arrowSvg.append(line, poly);

    exploreBtn.append(exploreLabel, arrowSvg);
    exploreBtn.addEventListener('click', () => {
      if (!this._active) return;
      if (typeof this.onExplore === 'function') {
        this.onExplore();
      }
    });

    const legalNav = document.createElement('div');
    legalNav.className = 'm2-landing-legal-links';

    root.append(eyebrow, title, subtitle, exploreBtn, legalNav);

    this.el = root;
    this._eyebrowEl = eyebrow;
    this._titleEl = title;
    this._subtitleEl = subtitle;
    this._exploreBtn = exploreBtn;
    this._exploreLabelEl = exploreLabel;
    this._legalNavEl = legalNav;
  }

  _syncDom() {
    if (!this.el) return;
    const copy = INTRO_STRINGS[this._lang] || INTRO_STRINGS.en;

    this.el.setAttribute('aria-label', copy.regionAria);
    this._eyebrowEl.textContent = copy.eyebrow;
    this._titleEl.textContent = copy.title;
    this._subtitleEl.textContent = copy.subtitle;
    this._exploreLabelEl.textContent = copy.exploreLabel;
    this._exploreBtn.setAttribute('aria-label', copy.exploreAria);

    if (this._legalNavEl) {
      this._legalNavEl.replaceChildren();
      if (this.onOpenLegal) {
        this._legalNavEl.hidden = false;
        copy.legalLinks.forEach((item, idx) => {
          if (idx > 0) {
            const sep = document.createElement('span');
            sep.className = 'm2-landing-legal-sep';
            sep.setAttribute('aria-hidden', 'true');
            sep.textContent = '·';
            this._legalNavEl.appendChild(sep);
          }
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'm2-landing-legal-btn';
          btn.textContent = item.label;
          btn.addEventListener('click', () => {
            this.onOpenLegal?.(item.tab, btn);
          });
          this._legalNavEl.appendChild(btn);
        });
      } else {
        this._legalNavEl.hidden = true;
      }
    }

    this.el.hidden = !this._active;
    this.el.setAttribute('aria-hidden', this._active ? 'false' : 'true');
    this.el.classList.toggle('is-active', this._active);

    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.toggle('landing-intro-active', this._active);
    }
  }

  isActive() {
    return this._active;
  }

  setActive(active) {
    const next = Boolean(active);
    this._active = next;
    this._syncDom();
    return this._active;
  }

  setLanguage(lang) {
    this._lang = normalizeLang(lang);
    this._syncDom();
    return this._lang;
  }

  getLanguage() {
    return this._lang;
  }

  dispose() {
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.remove('landing-intro-active');
    }
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
    this.el = null;
  }
}

export function createLandingIntro(options = {}) {
  return new LandingIntro(options);
}
