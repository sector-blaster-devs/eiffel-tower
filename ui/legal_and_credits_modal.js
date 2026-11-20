/**
 * Museum Editorial Credits, Licenses, Terms of Use & Privacy Policy Modal
 * (`ui/legal_and_credits_modal.js`)
 *
 * Pure achromatic Light Gallery Paper & Card aesthetic (`R === G === B`, zero brown/sepia,
 * zero `backdrop-filter`, zero pill badges, zero thick left accent borders).
 * Bilingual (`en` / `fr`) and fully accessible (`role="dialog"`, Escape to close, focus restore).
 */

import {
  ARCHIVAL_REFERENCE_CREDITS,
  MESH_PACK_CREDITS,
  CODE_AND_VENDOR_CREDITS,
  LICENSE_TEXTS,
  TERMS_TEMPLATE,
  PRIVACY_TEMPLATE,
  LEGAL_MODAL_COPY,
} from '../story_and_archive/credits_legal_data.js';

function normalizeLang(raw) {
  return String(raw || '').trim().toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

function normalizeTab(tab) {
  const t = String(tab || '').trim().toLowerCase();
  if (t === 'licenses' || t === 'terms' || t === 'privacy') return t;
  return 'credits';
}

async function copyTextWithFallback(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below
    }
  }
  if (typeof document === 'undefined') return false;
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return Boolean(ok);
  } catch {
    return false;
  }
}

export class LegalAndCreditsModal {
  constructor({ parent = null, lang = 'en', onOpenChange = null } = {}) {
    this._lang = normalizeLang(lang);
    this._activeTab = 'credits';
    this._isOpen = false;
    this._returnFocusEl = null;
    this._copyResetTimer = null;
    this.onOpenChange = typeof onOpenChange === 'function' ? onOpenChange : null;

    this.el = null;
    this._dom = {};
    this._boundKeydown = null;

    this._mount(parent);
    this._render();
  }

  _mount(parent) {
    if (typeof document === 'undefined') return;

    let root = document.getElementById('museum-legal-modal');
    if (!root) {
      root = document.createElement('section');
      root.id = 'museum-legal-modal';
      const host =
        (parent instanceof HTMLElement && parent) ||
        document.getElementById('museum-ui-root') ||
        document.body;
      host.appendChild(root);
    }

    root.className = 'm2-legal-modal';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('data-theme-zone', 'light');
    root.hidden = true;
    root.setAttribute('aria-hidden', 'true');
    root.replaceChildren();

    // Top Header
    const topbar = document.createElement('header');
    topbar.className = 'm2-legal-topbar';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'm2-legal-heading-group';

    const eyebrow = document.createElement('div');
    eyebrow.className = 'm2-legal-eyebrow';

    const title = document.createElement('h2');
    title.id = 'museum-legal-modal-title';
    title.className = 'm2-legal-title';
    root.setAttribute('aria-labelledby', title.id);

    titleGroup.append(eyebrow, title);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.id = 'btn-legal-close';
    closeBtn.className = 'm2-legal-close-btn';
    closeBtn.addEventListener('click', () => this.close());

    topbar.append(titleGroup, closeBtn);

    // Tab Navigation Bar
    const tabBar = document.createElement('div');
    tabBar.className = 'm2-legal-tabbar';
    tabBar.setAttribute('role', 'tablist');

    // Scrollable Body
    const scrollBody = document.createElement('div');
    scrollBody.className = 'm2-legal-scroll';
    scrollBody.setAttribute('tabindex', '0');

    const contentWrap = document.createElement('div');
    contentWrap.className = 'm2-legal-content';
    scrollBody.appendChild(contentWrap);

    root.append(topbar, tabBar, scrollBody);

    this._boundKeydown = (e) => {
      if (!this._isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.close();
      }
    };
    document.addEventListener('keydown', this._boundKeydown, true);

    this.el = root;
    this._dom = {
      eyebrow,
      title,
      closeBtn,
      tabBar,
      scrollBody,
      contentWrap,
    };
  }

  _render() {
    if (!this.el) return;
    const copy = LEGAL_MODAL_COPY[this._lang] || LEGAL_MODAL_COPY.en;

    this._dom.eyebrow.textContent = copy.eyebrow;
    this._dom.title.textContent = copy.title;
    this._dom.closeBtn.textContent = copy.closeLabel;
    this._dom.closeBtn.setAttribute('aria-label', copy.closeAria);

    // Tabs
    this._dom.tabBar.replaceChildren();
    for (const tabDef of copy.tabs) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'm2-legal-tab';
      btn.id = `btn-legal-tab-${tabDef.id}`;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', this._activeTab === tabDef.id ? 'true' : 'false');
      if (this._activeTab === tabDef.id) {
        btn.classList.add('is-active');
      }
      btn.textContent = tabDef.label;
      btn.addEventListener('click', () => {
        this.setTab(tabDef.id);
      });
      this._dom.tabBar.appendChild(btn);
    }

    // Active Tab Body
    const wrap = this._dom.contentWrap;
    wrap.replaceChildren();

    if (this._activeTab === 'credits') {
      this._renderCreditsTab(wrap, copy);
    } else if (this._activeTab === 'licenses') {
      this._renderLicensesTab(wrap, copy);
    } else if (this._activeTab === 'terms') {
      this._renderTemplateTab(wrap, copy, TERMS_TEMPLATE[this._lang] || TERMS_TEMPLATE.en, 'terms');
    } else if (this._activeTab === 'privacy') {
      this._renderTemplateTab(wrap, copy, PRIVACY_TEMPLATE[this._lang] || PRIVACY_TEMPLATE.en, 'privacy');
    }
  }

  _renderCreditsTab(wrap, copy) {
    const lang = this._lang;

    // Section 01: Procedural 3D Mesh Pack & World Assets
    const secMesh = document.createElement('section');
    secMesh.className = 'm2-legal-section';

    const meshH = document.createElement('h3');
    meshH.className = 'm2-legal-section-heading';
    meshH.textContent = copy.creditsSections.meshHeading;
    secMesh.appendChild(meshH);

    const meshList = document.createElement('div');
    meshList.className = 'm2-legal-stack';

    for (const item of MESH_PACK_CREDITS) {
      const row = document.createElement('article');
      row.className = 'm2-legal-entry';

      const head = document.createElement('div');
      head.className = 'm2-legal-entry-head';

      const nameEl = document.createElement('h4');
      nameEl.className = 'm2-legal-entry-title';
      nameEl.textContent = item.title[lang];

      const licEl = document.createElement('span');
      licEl.className = 'm2-legal-entry-meta';
      licEl.textContent = item.license;

      head.append(nameEl, licEl);

      const authorEl = document.createElement('p');
      authorEl.className = 'm2-legal-entry-sub';
      authorEl.textContent = item.author[lang];

      const scopeEl = document.createElement('p');
      scopeEl.className = 'm2-legal-entry-desc';
      scopeEl.textContent = item.scope[lang];

      row.append(head, authorEl, scopeEl);
      meshList.appendChild(row);
    }
    secMesh.appendChild(meshList);

    // Section 02: Application Code & Third-Party Software
    const secCode = document.createElement('section');
    secCode.className = 'm2-legal-section';

    const codeH = document.createElement('h3');
    codeH.className = 'm2-legal-section-heading';
    codeH.textContent = copy.creditsSections.codeHeading;
    secCode.appendChild(codeH);

    const codeList = document.createElement('div');
    codeList.className = 'm2-legal-stack';

    for (const pkg of CODE_AND_VENDOR_CREDITS) {
      const row = document.createElement('article');
      row.className = 'm2-legal-entry';

      const head = document.createElement('div');
      head.className = 'm2-legal-entry-head';

      const nameEl = document.createElement('h4');
      nameEl.className = 'm2-legal-entry-title';
      nameEl.textContent = `${pkg.name} · ${pkg.version}`;

      const licEl = document.createElement('span');
      licEl.className = 'm2-legal-entry-meta';
      licEl.textContent = pkg.license;

      head.append(nameEl, licEl);

      const authorEl = document.createElement('p');
      authorEl.className = 'm2-legal-entry-sub';
      authorEl.textContent = pkg.author;

      const roleEl = document.createElement('p');
      roleEl.className = 'm2-legal-entry-desc';
      roleEl.textContent = pkg.role[lang];

      row.append(head, authorEl, roleEl);
      codeList.appendChild(row);
    }
    secCode.appendChild(codeList);

    // Section 03: All 11 Archival References
    const secRefs = document.createElement('section');
    secRefs.className = 'm2-legal-section';

    const refsH = document.createElement('h3');
    refsH.className = 'm2-legal-section-heading';
    refsH.textContent = copy.creditsSections.refsHeading;
    secRefs.appendChild(refsH);

    const grid = document.createElement('div');
    grid.className = 'm2-legal-refs-grid';

    for (const ref of ARCHIVAL_REFERENCE_CREDITS) {
      const card = document.createElement('article');
      card.className = 'm2-legal-ref-card';

      const thumbWell = document.createElement('div');
      thumbWell.className = 'm2-legal-ref-thumb';

      const img = document.createElement('img');
      img.src = ref.thumb;
      img.alt = ref.title[lang];
      img.loading = 'lazy';
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', () => {
        img.hidden = true;
        thumbWell.textContent = `#${ref.id}`;
      });
      thumbWell.appendChild(img);

      const body = document.createElement('div');
      body.className = 'm2-legal-ref-body';

      const metaLine = document.createElement('div');
      metaLine.className = 'm2-legal-ref-meta';
      metaLine.textContent = `Plate #${ref.id} · ${ref.year} · ${ref.license}`;

      const titleEl = document.createElement('h4');
      titleEl.className = 'm2-legal-ref-title';
      titleEl.textContent = ref.title[lang];

      const creatorEl = document.createElement('p');
      creatorEl.className = 'm2-legal-ref-creator';
      creatorEl.textContent = ref.creator;

      const sourceEl = document.createElement('p');
      sourceEl.className = 'm2-legal-ref-source';
      sourceEl.textContent = `${ref.source} · ${copy.creditsSections.accessionLabel} ${ref.accession}`;

      body.append(metaLine, titleEl, creatorEl, sourceEl);
      card.append(thumbWell, body);
      grid.appendChild(card);
    }
    secRefs.appendChild(grid);

    wrap.append(secMesh, secCode, secRefs);
  }

  _renderLicensesTab(wrap, copy) {
    const lang = this._lang;
    const blocks = [
      LICENSE_TEXTS.mit,
      LICENSE_TEXTS.meshPack,
      LICENSE_TEXTS.apache2,
      LICENSE_TEXTS.archival,
    ];

    const col = document.createElement('div');
    col.className = 'm2-legal-prose-col';

    for (const block of blocks) {
      const sec = document.createElement('section');
      sec.className = 'm2-legal-section';

      const h = document.createElement('h3');
      h.className = 'm2-legal-section-heading';
      h.textContent = block.heading[lang];

      const pre = document.createElement('pre');
      pre.className = 'm2-legal-license-pre';
      pre.textContent = block.body;

      sec.append(h, pre);
      col.appendChild(sec);
    }

    const combinedText = blocks.map((b) => `${b.heading[lang]}\n\n${b.body}`).join('\n\n---\n\n');
    const actionRow = document.createElement('div');
    actionRow.className = 'm2-legal-action-row';

    const copyBtn = this._buildCopyButton(copy, combinedText);
    actionRow.appendChild(copyBtn);

    wrap.append(actionRow, col);
  }

  _renderTemplateTab(wrap, copy, templateData, kind) {
    const col = document.createElement('div');
    col.className = 'm2-legal-prose-col';

    const noticeBar = document.createElement('div');
    noticeBar.className = 'm2-legal-template-notice';

    const noticeText = document.createElement('p');
    noticeText.className = 'm2-legal-template-notice-text';
    noticeText.textContent = templateData.notice;

    const copyBtn = this._buildCopyButton(copy, templateData.plainText, `btn-copy-${kind}-template`);
    noticeBar.append(noticeText, copyBtn);

    col.appendChild(noticeBar);

    for (const secData of templateData.sections) {
      const sec = document.createElement('section');
      sec.className = 'm2-legal-template-section';

      const h = document.createElement('h3');
      h.className = 'm2-legal-template-heading';
      h.textContent = secData.heading;

      const p = document.createElement('p');
      p.className = 'm2-legal-template-body';
      p.textContent = secData.body;

      sec.append(h, p);
      col.appendChild(sec);
    }

    const fullDetails = document.createElement('details');
    fullDetails.className = 'm2-legal-raw-details';
    const summary = document.createElement('summary');
    summary.className = 'm2-legal-raw-summary';
    summary.textContent =
      this._lang === 'fr'
        ? 'Afficher le modèle complet prêt à copier'
        : 'View full ready-to-copy template text';
    const pre = document.createElement('pre');
    pre.className = 'm2-legal-license-pre';
    pre.textContent = templateData.plainText;
    fullDetails.append(summary, pre);
    col.appendChild(fullDetails);

    wrap.appendChild(col);
  }

  _buildCopyButton(copy, textToCopy, id = '') {
    const btn = document.createElement('button');
    btn.type = 'button';
    if (id) btn.id = id;
    btn.className = 'm2-legal-copy-btn';
    btn.textContent = copy.copyTemplate;
    btn.addEventListener('click', async () => {
      const ok = await copyTextWithFallback(textToCopy);
      btn.textContent = ok ? copy.copiedTemplate : copy.copyFailed;
      if (this._copyResetTimer !== null) {
        clearTimeout(this._copyResetTimer);
      }
      this._copyResetTimer = setTimeout(() => {
        btn.textContent = (LEGAL_MODAL_COPY[this._lang] || LEGAL_MODAL_COPY.en).copyTemplate;
      }, 2200);
    });
    return btn;
  }

  open(tab = 'credits', triggerEl = null) {
    if (!this.el) return;
    this._returnFocusEl =
      triggerEl instanceof HTMLElement
        ? triggerEl
        : typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    this._activeTab = normalizeTab(tab);
    this._isOpen = true;
    this._render();
    this.el.hidden = false;
    this.el.setAttribute('aria-hidden', 'false');
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.add('legal-modal-open');
    }
    this._dom.scrollBody.scrollTop = 0;
    this._dom.closeBtn?.focus?.();
    if (this.onOpenChange) {
      this.onOpenChange(true, this._activeTab);
    }
  }

  close() {
    if (!this.el || !this._isOpen) return;
    this._isOpen = false;
    this.el.hidden = true;
    this.el.setAttribute('aria-hidden', 'true');
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.remove('legal-modal-open');
    }
    if (this._returnFocusEl && typeof this._returnFocusEl.focus === 'function') {
      try {
        this._returnFocusEl.focus();
      } catch {
        // Ignore if element was detached
      }
    }
    this._returnFocusEl = null;
    if (this.onOpenChange) {
      this.onOpenChange(false, this._activeTab);
    }
  }

  isOpen() {
    return this._isOpen;
  }

  setTab(tab) {
    const next = normalizeTab(tab);
    if (this._activeTab === next) return;
    this._activeTab = next;
    this._render();
    if (this._dom.scrollBody) {
      this._dom.scrollBody.scrollTop = 0;
    }
  }

  getTab() {
    return this._activeTab;
  }

  setLanguage(lang) {
    const next = normalizeLang(lang);
    if (this._lang === next) return this._lang;
    this._lang = next;
    this._render();
    return this._lang;
  }

  dispose() {
    if (this._copyResetTimer !== null) {
      clearTimeout(this._copyResetTimer);
      this._copyResetTimer = null;
    }
    if (this._boundKeydown && typeof document !== 'undefined') {
      document.removeEventListener('keydown', this._boundKeydown, true);
      this._boundKeydown = null;
    }
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.remove('legal-modal-open');
    }
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
    this.el = null;
  }
}

export function createLegalAndCreditsModal(options = {}) {
  return new LegalAndCreditsModal(options);
}
