/**
 * Quiet Top-Right Museum Header (`museum_v2` Stage 7 Rights-Clean)
 *
 * Neutral black/white/grey gallery header containing:
 *   1. `EN · FR` bilingual toggle
 *   2. Optional discreet Pure View toggle
 *
 * Full archive drawer trigger removed so only walkthrough plates are exposed.
 */

const HEADER_STRINGS = {
  en: {
    navAria: 'Exhibition language and view controls',
    langAria: 'Switch exhibition language (English / Français)',
    legalLabel: 'Credits & Legal',
    legalAria: 'Open credits, licenses, terms of use, and privacy policy',
    pureViewTitle: 'Unobstructed exhibition view',
    restoreTitle: 'Restore exhibition interface',
  },
  fr: {
    navAria: "Contrôles de langue et d'affichage de l'exposition",
    langAria: "Changer la langue de l'exposition (English / Français)",
    legalLabel: 'Crédits & Légal',
    legalAria: 'Ouvrir les crédits, licences, conditions et politique de confidentialité',
    pureViewTitle: 'Vue pure sans interface',
    restoreTitle: "Afficher l'interface de l'exposition",
  },
};

function normalizeLang(raw) {
  return String(raw || '').trim().toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

export class MuseumHeader {
  constructor({
    container = null,
    parent = null,
    lang = 'en',
    enablePureViewButton = true,
    onLanguageChange = null,
    onPureViewChange = null,
    onOpenLegal = null,
  } = {}) {
    this._lang = normalizeLang(lang);
    this._enablePureView = Boolean(enablePureViewButton);
    this._pureViewActive = false;

    this.onLanguageChange = typeof onLanguageChange === 'function' ? onLanguageChange : null;
    this.onPureViewChange = typeof onPureViewChange === 'function' ? onPureViewChange : null;
    this.onOpenLegal = typeof onOpenLegal === 'function' ? onOpenLegal : null;

    this.el = null;
    this._zenExitBtn = null;
    this._dom = {};

    this._mount(container, parent);
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
      root = document.getElementById('museum-header');
    }

    if (!root) {
      root = document.createElement('nav');
      root.id = 'museum-header';
      const host =
        (parent instanceof HTMLElement && parent) ||
        document.getElementById('museum-ui-root') ||
        document.getElementById('monograph-ui') ||
        document.body;
      host.appendChild(root);
    }

    root.className = 'museum-header';
    root.innerHTML = '';

    // 1. EN · FR Language Toggle
    const langBtn = document.createElement('button');
    langBtn.type = 'button';
    langBtn.id = 'btn-lang-toggle';
    langBtn.className = 'museum-header-btn';

    const enSpan = document.createElement('span');
    enSpan.className = 'museum-lang-opt';
    enSpan.dataset.langOpt = 'en';
    enSpan.textContent = 'EN';

    const sepSpan = document.createElement('span');
    sepSpan.className = 'museum-lang-sep';
    sepSpan.setAttribute('aria-hidden', 'true');
    sepSpan.textContent = '·';

    const frSpan = document.createElement('span');
    frSpan.className = 'museum-lang-opt';
    frSpan.dataset.langOpt = 'fr';
    frSpan.textContent = 'FR';

    langBtn.append(enSpan, sepSpan, frSpan);
    langBtn.addEventListener('click', () => {
      const next = this._lang === 'en' ? 'fr' : 'en';
      this.setLanguage(next, { emit: true });
    });

    root.append(langBtn);

    // 1b. Credits & Legal Trigger
    let legalBtn = null;
    if (this.onOpenLegal) {
      const divLegal = document.createElement('span');
      divLegal.className = 'museum-header-divider';
      divLegal.setAttribute('role', 'separator');
      divLegal.setAttribute('aria-hidden', 'true');

      legalBtn = document.createElement('button');
      legalBtn.type = 'button';
      legalBtn.id = 'btn-legal-open';
      legalBtn.className = 'museum-header-btn museum-header-btn--legal';
      legalBtn.addEventListener('click', () => {
        this.onOpenLegal?.('credits', legalBtn);
      });
      root.append(divLegal, legalBtn);
    }

    // 2. Optional Pure View Button
    let zenBtn = null;
    if (this._enablePureView) {
      const div2 = document.createElement('span');
      div2.className = 'museum-header-divider';
      div2.setAttribute('role', 'separator');
      div2.setAttribute('aria-hidden', 'true');

      zenBtn = document.createElement('button');
      zenBtn.type = 'button';
      zenBtn.id = 'btn-zen-enter';
      zenBtn.className = 'museum-header-btn museum-header-btn--icon';
      zenBtn.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      `;
      zenBtn.addEventListener('click', () => {
        this.setPureView(true, { emit: true });
      });
      root.append(div2, zenBtn);

      let exitBtn = document.getElementById('btn-zen-exit');
      if (!exitBtn) {
        exitBtn = document.createElement('button');
        exitBtn.type = 'button';
        exitBtn.id = 'btn-zen-exit';
        exitBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
            <circle cx="12" cy="12" r="2.5" />
          </svg>
        `;
        document.body.appendChild(exitBtn);
      }
      exitBtn.addEventListener('click', () => {
        this.setPureView(false, { emit: true });
      });
      this._zenExitBtn = exitBtn;
    }

    this.el = root;
    this._dom = {
      langBtn,
      enSpan,
      frSpan,
      legalBtn,
      zenBtn,
    };

    this._syncStrings();
  }

  _syncStrings() {
    if (!this.el) return;
    const t = HEADER_STRINGS[this._lang] || HEADER_STRINGS.en;
    this.el.setAttribute('aria-label', t.navAria);
    this._dom.langBtn.setAttribute('aria-label', t.langAria);
    this._dom.langBtn.title = t.langAria;
    this._dom.enSpan.classList.toggle('is-active', this._lang === 'en');
    this._dom.frSpan.classList.toggle('is-active', this._lang === 'fr');

    if (this._dom.legalBtn) {
      this._dom.legalBtn.textContent = t.legalLabel;
      this._dom.legalBtn.setAttribute('aria-label', t.legalAria);
      this._dom.legalBtn.title = t.legalAria;
    }

    if (this._dom.zenBtn) {
      this._dom.zenBtn.setAttribute('aria-label', t.pureViewTitle);
      this._dom.zenBtn.title = t.pureViewTitle;
    }
    if (this._zenExitBtn) {
      this._zenExitBtn.setAttribute('aria-label', t.restoreTitle);
      this._zenExitBtn.title = t.restoreTitle;
    }
  }

  setLanguage(lang, { emit = false } = {}) {
    const next = normalizeLang(lang);
    this._lang = next;
    this._syncStrings();
    if (emit && this.onLanguageChange) {
      this.onLanguageChange(next);
    }
    return this._lang;
  }

  getLanguage() {
    return this._lang;
  }

  setArchiveCount(_count) {}

  setPureView(active, { emit = false } = {}) {
    this._pureViewActive = Boolean(active);
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('zen-mode', this._pureViewActive);
    }
    if (emit && this.onPureViewChange) {
      this.onPureViewChange(this._pureViewActive);
    }
    return this._pureViewActive;
  }

  getPureView() {
    return this._pureViewActive;
  }

  dispose() {
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
    this.el = null;
  }
}

export function createMuseumHeader(options = {}) {
  return new MuseumHeader(options);
}
