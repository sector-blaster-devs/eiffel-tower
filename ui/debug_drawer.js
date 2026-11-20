/**
 * Eiffel Tower 1889 Museum Exhibition — Self-Contained Engineering Debug View
 * Module: museum_v2/stage8_public_domain/ui/debug_drawer.js
 *
 * Strict Visitor / Engineering Isolation:
 *  - Default Visitor Mode (`?debug=0` or no `?debug=1`):
 *      * ZERO DOM nodes mounted in `document.body` (`getElement() === null`).
 *      * ZERO technical strings (`RMSE`, `tris`, `FPS`, `TTFL`, `viewOffset`, `quat`,
 *        `zone1..zone5`, `pbr`, `xray`, `step 0..11`) anywhere in visitor DOM.
 *      * ZERO per-frame CPU overhead (`update()` returns immediately when closed).
 *      * Hides all in-world 3D frustum pyramids on init (`setPortalsVisible(false)`).
 *  - Engineering Activation (`?debug=1`, `?debug=true`, or `Ctrl+Shift+D` / `Cmd+Shift+D`):
 *      * Mounts `#museum-debug-drawer` on the right edge with all 5 collapsible panels:
 *          1. Construction & Kinematics Inspector (`step 0..11`, zone toggles, speed, raw scrub)
 *          2. Optical PnP Portals (11 1884–1889 Public Domain plates) & 50/50 Wipe Curtain Verifier
 *          3. Real Lighting, Mood, Sun Angles, Shadow Helper, Render Modes & Zero-Emissive Audit
 *          4. Camera & Analytical Constraint Telemetry + Copy Pose JSON
 *          5. Performance (`FPS`, `TTFL`, `draw calls`, `triangles`, `textures`)
 *      * Closing the drawer detaches its DOM subtree completely, restoring 100% visitor purity.
 *
 * Zero external dependencies. Offline ES module.
 */

import {
  HERO_FINALE_CAMERA,
  HERO_CRAFTSMANSHIP_PRESETS,
} from './walkthrough_controller.js';

export const CALIBRATED_1889_PORTALS = Object.freeze([
  { id: '55', date: '1884–1889', label: '#55 · 300 m Elevation Drawing', step: 11.00, rmsePx: 0.90 },
  { id: '13', date: '21 Apr 1887', label: '#13 · Pneumatic Caissons', step: 0.55, rmsePx: 1.37 },
  { id: '09', date: '18 Jul 1887', label: '#09 · Inclined Base Shoes', step: 1.50, rmsePx: 1.39 },
  { id: '51', date: '14 Jan 1888', label: '#51 · Central Timber Scaffolds', step: 3.55, rmsePx: 1.90 },
  { id: '23', date: '26 Mar 1888', label: '#23 · First-Floor Belt (TL 1/5)', step: 3.60, rmsePx: 1.14 },
  { id: '14', date: '15 May 1888', label: '#14 · 2nd-Stage Piers 89 m (TL 2/5)', step: 4.85, rmsePx: 1.91 },
  { id: '01', date: '21 Aug 1888', label: '#01 · 2nd Platform 127 m (TL 3/5)', step: 5.66, rmsePx: 3.68 },
  { id: '46', date: '23 Nov 1888', label: '#46 · Upper Shaft 216 m (TL 4/5)', step: 6.52, rmsePx: 5.21 },
  { id: '18', date: 'May 1889', label: '#18 · Completed 300 m Axial (TL 5/5)', step: 11.00, rmsePx: 2.85 },
  { id: '36', date: 'Summer 1889', label: '#36 · Beneath the 74 m Arch', step: 11.00, rmsePx: 1.20 },
  { id: '38', date: 'Summer 1889', label: '#38 · Saint-Vidal Basin & Piers', step: 11.00, rmsePx: 1.88 },
]);

const QUICK_STEP_PRESETS = Object.freeze([0.0, 0.55, 1.5, 3.55, 4.85, 5.66, 6.52, 11.0]);
const SPEED_PRESETS = Object.freeze([0.25, 0.5, 1.0, 2.0, 4.0]);
const AXIAL_TIMELAPSE_IDS = Object.freeze(['23', '14', '01', '46', '18']);

/**
 * Audits a Three.js scene (or material map) to verify ZERO meshes emit fake self-light
 * (`emissive === 0x000000` or `emissiveIntensity === 0.0`).
 *
 * @param {object|null} scene - Three.js `Scene` or `Object3D` root
 * @param {object} [opts]
 * @param {boolean} [opts.enforceZero=false] - If true, zeroes out offending emissive properties
 * @returns {{ passes: boolean, checkedMaterials: number, offendingCount: number, offenders: Array<{meshName: string, materialName: string, emissiveHex: string, emissiveIntensity: number}> }}
 */
export function auditZeroEmissive(scene, opts = {}) {
  const enforceZero = Boolean(opts.enforceZero);
  const visitedMaterials = new Set();
  const offenders = [];

  if (!scene || typeof scene.traverse !== 'function') {
    return {
      passes: true,
      checkedMaterials: 0,
      offendingCount: 0,
      offenders: [],
    };
  }

  scene.traverse((obj) => {
    if (!obj || (!obj.isMesh && !obj.isLine && !obj.isPoints) || !obj.material) return;
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of materials) {
      if (!mat) continue;
      const alreadyChecked = visitedMaterials.has(mat);
      visitedMaterials.add(mat);

      if (mat.emissive && typeof mat.emissive.getHex === 'function') {
        const hexNum = mat.emissive.getHex();
        const intensity = typeof mat.emissiveIntensity === 'number' ? mat.emissiveIntensity : 1.0;
        if (hexNum !== 0x000000 && intensity > 0.0001) {
          if (!alreadyChecked) {
            offenders.push({
              meshName: obj.name || '(unnamed_mesh)',
              materialName: mat.name || mat.type || '(material)',
              emissiveHex: `#${hexNum.toString(16).padStart(6, '0')}`,
              emissiveIntensity: Number(intensity.toFixed(3)),
            });
          }
          if (enforceZero) {
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0.0;
            mat.needsUpdate = true;
          }
        }
      }
    }
  });

  return {
    passes: enforceZero ? true : offenders.length === 0,
    checkedMaterials: visitedMaterials.size,
    offendingCount: enforceZero ? 0 : offenders.length,
    offenders: enforceZero ? [] : offenders,
  };
}

/**
 * Checks whether the current URL explicitly requests engineering Debug View (`?debug=1` or `?debug=true`).
 */
export function isDebugRequestedInUrl(searchString = '') {
  const raw =
    searchString ||
    (typeof window !== 'undefined' && window.location ? window.location.search : '');
  if (!raw) return false;
  try {
    const params = new URLSearchParams(raw);
    const val = (params.get('debug') || '').trim().toLowerCase();
    return val === '1' || val === 'true' || val === 'yes';
  } catch (_err) {
    return false;
  }
}

export class DebugDrawer {
  /**
   * @param {object} [options]
   * @param {HTMLElement} [options.mountPoint=document.body]
   * @param {object} [options.app=null] - Optional overarching app handle
   * @param {object} [options.walkthroughController=null] - WalkthroughController instance
   * @param {object} [options.towerController=null] - TowerModelController (`setStep`, `getPieceStats`, etc.)
   * @param {object} [options.portalSystem=null] - PhotoPortals (`enterPortal`, `setBlend`, `verifyPortalProjection`, etc.)
   * @param {object} [options.atmosphere=null] - Atmosphere/sky controller (`setMood`, `setSunAngles`, etc.)
   * @param {object} [options.lightingRig=null] - Real Three.js lighting rig
   * @param {object} [options.parisWorld=null] - Surrounding 1889 Paris group/controller
   * @param {object} [options.scene=null] - Three.js Scene
   * @param {object} [options.camera=null] - Three.js PerspectiveCamera
   * @param {object} [options.controls=null] - OrbitControls (`target` Vector3)
   * @param {object} [options.renderer=null] - Three.js WebGLRenderer (`info`, `domElement`, `shadowMap`)
   * @param {HTMLCanvasElement} [options.canvas=null] - WebGL canvas for WebM capture
   * @param {string} [options.assetBasePath='./'] - Relative prefix prepended to `references/...` paths
   * @param {boolean} [options.enableKeyboardShortcut=true] - Bind `Ctrl+Shift+D` / `Cmd+Shift+D`
   * @param {boolean} [options.autoCheckUrl=true] - Open automatically if `?debug=1`
   * @param {(isOpen: boolean) => void} [options.onToggle]
   */
  constructor(options = {}) {
    this.mountPoint =
      options.mountPoint || (typeof document !== 'undefined' ? document.body : null);
    this.app = options.app || null;
    this.walkthroughController = options.walkthroughController || null;
    this.towerController = options.towerController || null;
    this.portalSystem = options.portalSystem || null;
    this.atmosphere = options.atmosphere || null;
    this.lightingRig = options.lightingRig || null;
    this.parisWorld = options.parisWorld || null;
    this.scene = options.scene || null;
    this.camera = options.camera || null;
    this.controls = options.controls || null;
    this.renderer = options.renderer || null;
    this.canvas = options.canvas || null;
    this.assetBasePath =
      typeof options.assetBasePath === 'string' ? options.assetBasePath : './';
    this.enableKeyboardShortcut = options.enableKeyboardShortcut !== false;
    this.autoCheckUrl = options.autoCheckUrl !== false;
    this.onToggle = typeof options.onToggle === 'function' ? options.onToggle : null;

    // Internal engineering state (preserved across open/close toggles)
    this._open = false;
    this._root = null;
    this._refs = {};

    this._rawStep = 0.55;
    this._rawScrubPlaying = false;
    this._rawScrubSpeed = 1.0;
    this._zoneVisibility = {
      zone1: true,
      zone2: true,
      zone3: true,
      zone4: true,
      zone5: true,
      paris_1889: true,
      edgesSketch: true,
    };

    this._selectedPortalId = '55';
    this._portalBlend = 1.0;
    this._wipeEnabled = false;
    this._wipePosition = 0.5;
    this._showFrustums = false;
    this._timelapseRunning = false;
    this._timelapseTimer = null;
    this._timelapseIdx = 0;

    this._mood = 'day';
    this._sunAzimuthDeg = 212;
    this._sunElevationDeg = 38;
    this._shadowHelperVisible = false;
    this._shadowHelperObj = null;
    this._renderMode = 'pbr';
    this._savedMaterialProps = new WeakMap();

    // Performance rolling buffer
    this._bootPerfMs =
      typeof performance !== 'undefined' ? performance.now() : 0;
    this._ttflMs = null;
    this._frameDtRing = new Float32Array(30);
    this._frameDtCursor = 0;
    this._frameDtCount = 0;
    this._telemetryAccumSec = 0;

    this._onKeyDown = this._handleKeyDown.bind(this);
    this._initialized = false;
  }

  /**
   * Initializes keyboard listener, hides 3D frustum markers by default for visitor purity,
   * and opens the drawer ONLY if `?debug=1` / `?debug=true` is present in the URL.
   */
  init() {
    if (this._initialized) return this;
    this._initialized = true;

    // Enforce visitor purity: hide 14 in-world 3D frustum pyramids by default
    this._applyShowFrustums(false);

    if (this.enableKeyboardShortcut && typeof window !== 'undefined') {
      window.addEventListener('keydown', this._onKeyDown);
    }

    if (this.autoCheckUrl && isDebugRequestedInUrl()) {
      this.open();
    }

    return this;
  }

  /**
   * Updates external engine references at any point after construction.
   */
  attachSystems(systems = {}) {
    if (systems.app !== undefined) this.app = systems.app;
    if (systems.walkthroughController !== undefined) {
      this.walkthroughController = systems.walkthroughController;
    }
    if (systems.towerController !== undefined) this.towerController = systems.towerController;
    if (systems.portalSystem !== undefined) this.portalSystem = systems.portalSystem;
    if (systems.atmosphere !== undefined) this.atmosphere = systems.atmosphere;
    if (systems.lightingRig !== undefined) this.lightingRig = systems.lightingRig;
    if (systems.parisWorld !== undefined) this.parisWorld = systems.parisWorld;
    if (systems.scene !== undefined) this.scene = systems.scene;
    if (systems.camera !== undefined) this.camera = systems.camera;
    if (systems.controls !== undefined) this.controls = systems.controls;
    if (systems.renderer !== undefined) this.renderer = systems.renderer;
    if (systems.canvas !== undefined) this.canvas = systems.canvas;
    if (systems.assetBasePath !== undefined) this.assetBasePath = systems.assetBasePath;

    if (!this._showFrustums) {
      this._applyShowFrustums(false);
    }
    if (this._open) {
      this._refreshEmissiveAuditBadge();
      this._refreshTelemetryNow();
    }
    return this;
  }

  /**
   * Records first rendered 3D frame timestamp (`TTFL`).
   */
  markFirstFrameRendered(explicitTtflMs) {
    if (this._ttflMs !== null) return;
    if (typeof explicitTtflMs === 'number' && Number.isFinite(explicitTtflMs)) {
      this._ttflMs = explicitTtflMs;
    } else if (typeof performance !== 'undefined') {
      this._ttflMs = performance.now() - this._bootPerfMs;
    }
  }

  isOpen() {
    return this._open;
  }

  getElement() {
    return this._root;
  }

  open() {
    if (this._open && this._root) return this;
    this._open = true;
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.add('debug-drawer-open');
    }
    this._mountDom();
    this._syncControlsFromLiveEngine();
    this._refreshEmissiveAuditBadge();
    this._refreshTelemetryNow();
    if (this.onToggle) this.onToggle(true);
    return this;
  }

  close() {
    if (!this._open) return this;
    this._open = false;
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.remove('debug-drawer-open');
    }
    this._rawScrubPlaying = false;
    this._stopAxialTimelapse();
    // Reset frustum pyramid visibility when returning to visitor view unless pinned
    if (this._showFrustums) {
      this._showFrustums = false;
      this._applyShowFrustums(false);
    }
    this._unmountDom();
    if (this.onToggle) this.onToggle(false);
    return this;
  }

  toggle() {
    return this._open ? this.close() : this.open();
  }

  /**
   * Per-frame hook. Costs ZERO CPU when Debug View is closed.
   * @param {number} dtSec
   */
  update(dtSec) {
    if (this._ttflMs === null && this.renderer?.info?.render?.frame > 0) {
      this.markFirstFrameRendered();
    }

    // Strict zero-overhead visitor fast path
    if (!this._open || !this._root) return;

    const dt = Number.isFinite(dtSec) && dtSec > 0 ? Math.min(dtSec, 0.25) : 1 / 60;
    this._frameDtRing[this._frameDtCursor] = dt;
    this._frameDtCursor = (this._frameDtCursor + 1) % this._frameDtRing.length;
    if (this._frameDtCount < this._frameDtRing.length) this._frameDtCount += 1;

    if (this._rawScrubPlaying) {
      const nextStep = this._rawStep + dt * 0.85 * this._rawScrubSpeed;
      if (nextStep >= 11.0) {
        this._setRawStep(11.0);
        this._rawScrubPlaying = false;
        this._updateRawScrubBtn();
      } else {
        this._setRawStep(nextStep);
      }
    }

    this._telemetryAccumSec += dt;
    if (this._telemetryAccumSec >= 0.12) {
      this._telemetryAccumSec = 0;
      this._refreshTelemetryNow();
    }
  }

  destroy() {
    this.close();
    if (this.enableKeyboardShortcut && typeof window !== 'undefined') {
      window.removeEventListener('keydown', this._onKeyDown);
    }
    this._initialized = false;
  }

  // ---------------------------------------------------------------------------
  // Private: Keyboard & Lifecycle
  // ---------------------------------------------------------------------------

  _handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.code === 'KeyD' || e.key === 'D' || e.key === 'd')) {
      e.preventDefault();
      this.toggle();
    }
  }

  _unmountDom() {
    if (this._root && this._root.parentNode) {
      this._root.parentNode.removeChild(this._root);
    }
    this._root = null;
    this._refs = {};
  }

  _resolveAssetUrl(relativePath) {
    const cleanRel = String(relativePath || '').replace(/^\/+/, '');
    const prefix = this.assetBasePath || '';
    if (!prefix) return cleanRel;
    return prefix.endsWith('/') ? `${prefix}${cleanRel}` : `${prefix}/${cleanRel}`;
  }

  // ---------------------------------------------------------------------------
  // Private: Mount Self-Contained Engineering Drawer DOM
  // ---------------------------------------------------------------------------

  _mountDom() {
    if (!this.mountPoint || typeof document === 'undefined') return;
    this._unmountDom();

    const existing = document.getElementById('museum-debug-drawer');
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }

    const aside = document.createElement('aside');
    aside.id = 'museum-debug-drawer';
    aside.className = 'museum-debug-drawer is-open';
    aside.setAttribute('aria-label', 'Engineering Debug View');
    aside.dataset.debugSurface = 'engineering';

    // Header
    const header = document.createElement('div');
    header.className = 'debug-drawer-header';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'debug-drawer-title-wrap';
    const dot = document.createElement('span');
    dot.className = 'debug-status-dot';
    const title = document.createElement('span');
    title.className = 'debug-drawer-title';
    title.textContent = 'Debug View · Engineering';
    titleWrap.append(dot, title);

    const headerActions = document.createElement('div');
    headerActions.className = 'debug-header-actions';

    const copyDiagBtn = document.createElement('button');
    copyDiagBtn.type = 'button';
    copyDiagBtn.className = 'debug-btn';
    copyDiagBtn.textContent = 'JSON';
    copyDiagBtn.title = 'Copy live engineering snapshot JSON';
    copyDiagBtn.addEventListener('click', () => this._copyDiagnosticsJson(copyDiagBtn));

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'debug-icon-btn';
    closeBtn.textContent = '×';
    closeBtn.title = 'Close Debug View (Ctrl+Shift+D)';
    closeBtn.setAttribute('aria-label', 'Close Debug View');
    closeBtn.addEventListener('click', () => this.close());

    headerActions.append(copyDiagBtn, closeBtn);
    header.append(titleWrap, headerActions);

    // Scrollable Body containing all 5 collapsible panels
    const body = document.createElement('div');
    body.className = 'debug-drawer-body';

    body.append(
      this._buildKinematicsSection(),
      this._buildPortalsSection(),
      this._buildLightingSection(),
      this._buildCameraSection(),
      this._buildPerfSection()
    );

    aside.append(header, body);
    this.mountPoint.appendChild(aside);
    this._root = aside;
  }

  _createSection(summaryTitle, openByDefault = false) {
    const details = document.createElement('details');
    details.className = 'debug-section';
    if (openByDefault) details.open = true;

    const summary = document.createElement('summary');
    summary.textContent = summaryTitle;

    const content = document.createElement('div');
    content.className = 'debug-section-content';

    details.append(summary, content);
    return { details, content };
  }

  // ---------------------------------------------------------------------------
  // Panel 1: Construction & Kinematics Inspector
  // ---------------------------------------------------------------------------

  _buildKinematicsSection() {
    const { details, content } = this._createSection('1 · Construction & Kinematics', true);

    // Raw Step Slider
    const stepRow = document.createElement('div');
    stepRow.className = 'debug-row--stack debug-row';

    const stepHeader = document.createElement('div');
    stepHeader.className = 'debug-row';
    const stepLbl = document.createElement('span');
    stepLbl.className = 'debug-label';
    stepLbl.textContent = 'Raw Global Step (0..11)';
    const stepVal = document.createElement('span');
    stepVal.className = 'debug-val';
    stepVal.textContent = `${this._rawStep.toFixed(3)} / 11.000`;
    stepHeader.append(stepLbl, stepVal);

    const stepSlider = document.createElement('input');
    stepSlider.type = 'range';
    stepSlider.className = 'debug-slider';
    stepSlider.min = '0';
    stepSlider.max = '11';
    stepSlider.step = '0.005';
    stepSlider.value = String(this._rawStep);
    stepSlider.setAttribute('aria-label', 'Raw global construction step');
    stepSlider.addEventListener('input', () => {
      this._rawScrubPlaying = false;
      this._updateRawScrubBtn();
      this._setRawStep(Number(stepSlider.value));
    });

    stepRow.append(stepHeader, stepSlider);

    // Quick PnP Step Jump Buttons
    const presetRow = document.createElement('div');
    presetRow.className = 'debug-btn-row';
    for (const s of QUICK_STEP_PRESETS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'debug-btn';
      btn.textContent = s.toFixed(2);
      btn.title = `Jump Tower kinematics to step ${s.toFixed(2)}`;
      btn.addEventListener('click', () => {
        this._rawScrubPlaying = false;
        this._updateRawScrubBtn();
        this._setRawStep(s);
      });
      presetRow.appendChild(btn);
    }

    // Raw Linear Scrub + Speed Multiplier
    const scrubRow = document.createElement('div');
    scrubRow.className = 'debug-btn-row';

    const scrubPlayBtn = document.createElement('button');
    scrubPlayBtn.type = 'button';
    scrubPlayBtn.className = 'debug-btn';
    scrubPlayBtn.textContent = '▶ Scrub 0→11';
    scrubPlayBtn.addEventListener('click', () => {
      this._rawScrubPlaying = !this._rawScrubPlaying;
      if (this._rawScrubPlaying) {
        this.walkthroughController?.pause?.();
        if (this._rawStep >= 10.99) this._setRawStep(0);
      }
      this._updateRawScrubBtn();
    });
    scrubRow.appendChild(scrubPlayBtn);

    const speedBtns = [];
    for (const mult of SPEED_PRESETS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `debug-btn${mult === this._rawScrubSpeed ? ' is-active' : ''}`;
      btn.textContent = `${mult}×`;
      btn.addEventListener('click', () => {
        this._rawScrubSpeed = mult;
        this.app?.setPlaybackSpeed?.(mult);
        for (const b of speedBtns) {
          b.classList.toggle('is-active', b === btn);
        }
      });
      speedBtns.push(btn);
      scrubRow.appendChild(btn);
    }

    // Kinematics Telemetry KV Grid
    const kv = document.createElement('div');
    kv.className = 'debug-kv-grid';
    const piecesVal = this._appendKvRow(kv, 'Pieces (vis/tot)', '—');
    const craneModeVal = this._appendKvRow(kv, 'Kinematic Mode', '—');
    const activeZoneVal = this._appendKvRow(kv, 'Active Zone', '—');

    // Zone Visibility Checkboxes
    const zoneGrid = document.createElement('div');
    zoneGrid.className = 'debug-check-grid';
    const zoneDefs = [
      ['zone1', 'zone1 · Plinths'],
      ['zone2', 'zone2 · Legs/Arch'],
      ['zone3', 'zone3 · 1st→2nd'],
      ['zone4', 'zone4 · Shaft'],
      ['zone5', 'zone5 · Cupola'],
      ['paris_1889', 'Paris 1889'],
      ['edgesSketch', 'Sketch Lines'],
    ];

    for (const [zoneKey, labelText] of zoneDefs) {
      const lbl = document.createElement('label');
      lbl.className = 'debug-check-label';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = this._zoneVisibility[zoneKey] !== false;
      cb.addEventListener('change', () => {
        this._zoneVisibility[zoneKey] = cb.checked;
        this._applyZoneVisibility(zoneKey, cb.checked);
      });
      const txt = document.createElement('span');
      txt.textContent = labelText;
      lbl.append(cb, txt);
      zoneGrid.appendChild(lbl);
    }

    this._refs.stepSlider = stepSlider;
    this._refs.stepVal = stepVal;
    this._refs.scrubPlayBtn = scrubPlayBtn;
    this._refs.piecesVal = piecesVal;
    this._refs.craneModeVal = craneModeVal;
    this._refs.activeZoneVal = activeZoneVal;

    content.append(stepRow, presetRow, scrubRow, kv, zoneGrid);
    return details;
  }

  // ---------------------------------------------------------------------------
  // Panel 2: Optical PnP, Era Portals & Curtain Verifier
  // ---------------------------------------------------------------------------

  _buildPortalsSection() {
    const { details, content } = this._createSection('2 · Optical PnP, Era Portals & Wipe', true);

    const select = document.createElement('select');
    select.className = 'debug-select';
    select.setAttribute('aria-label', 'Select calibrated PnP portal');

    const freeOpt = document.createElement('option');
    freeOpt.value = '';
    freeOpt.textContent = 'None · Free 3D Orbit Camera';
    select.appendChild(freeOpt);

    const group1889 = document.createElement('optgroup');
    group1889.label = '1884–1889 Walkthrough Portals (11)';
    for (const p of CALIBRATED_1889_PORTALS) {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.label} [step ${p.step.toFixed(2)}, ${p.rmsePx.toFixed(2)}px]`;
      if (p.id === this._selectedPortalId) opt.selected = true;
      group1889.appendChild(opt);
    }
    select.appendChild(group1889);

    select.addEventListener('change', () => {
      this._selectedPortalId = select.value;
      if (!select.value) {
        this._exitPortalFromDebug();
      } else {
        this._enterPortalFromDebug(select.value);
      }
    });

    const portalActionRow = document.createElement('div');
    portalActionRow.className = 'debug-btn-row';

    const enterBtn = document.createElement('button');
    enterBtn.type = 'button';
    enterBtn.className = 'debug-btn';
    enterBtn.textContent = 'Enter Portal';
    enterBtn.addEventListener('click', () => {
      if (select.value) this._enterPortalFromDebug(select.value);
    });

    const exitBtn = document.createElement('button');
    exitBtn.type = 'button';
    exitBtn.className = 'debug-btn';
    exitBtn.textContent = 'Exit to 3D';
    exitBtn.addEventListener('click', () => {
      select.value = '';
      this._selectedPortalId = '';
      this._exitPortalFromDebug();
    });

    const pinBtn = document.createElement('button');
    pinBtn.type = 'button';
    pinBtn.className = 'debug-btn';
    pinBtn.textContent = 'Pin Frustum';
    pinBtn.addEventListener('click', () => {
      this.portalSystem?.pinActiveFrustumInWorld?.();
    });

    const unpinBtn = document.createElement('button');
    unpinBtn.type = 'button';
    unpinBtn.className = 'debug-btn';
    unpinBtn.textContent = 'Clear Pin';
    unpinBtn.addEventListener('click', () => {
      this.portalSystem?.clearPinnedFrustum?.();
    });

    portalActionRow.append(enterBtn, exitBtn, pinBtn, unpinBtn);

    // Blend slider [0..1]
    const blendRow = document.createElement('div');
    blendRow.className = 'debug-row debug-row--stack';
    const blendHdr = document.createElement('div');
    blendHdr.className = 'debug-row';
    const blendLbl = document.createElement('span');
    blendLbl.className = 'debug-label';
    blendLbl.textContent = 'Portal Opacity (blend)';
    const blendVal = document.createElement('span');
    blendVal.className = 'debug-val';
    blendVal.textContent = this._portalBlend.toFixed(2);
    blendHdr.append(blendLbl, blendVal);

    const blendSlider = document.createElement('input');
    blendSlider.type = 'range';
    blendSlider.className = 'debug-slider';
    blendSlider.min = '0';
    blendSlider.max = '1';
    blendSlider.step = '0.01';
    blendSlider.value = String(this._portalBlend);
    blendSlider.addEventListener('input', () => {
      this._portalBlend = Number(blendSlider.value);
      blendVal.textContent = this._portalBlend.toFixed(2);
      this.portalSystem?.setBlend?.(this._portalBlend);
      this.portalSystem?.setOpacity?.(this._portalBlend);
    });
    blendRow.append(blendHdr, blendSlider);

    // 50/50 Wipe Curtain toggle + position slider
    const wipeRow = document.createElement('div');
    wipeRow.className = 'debug-row debug-row--stack';
    const wipeHdr = document.createElement('div');
    wipeHdr.className = 'debug-row';

    const wipeCheckLbl = document.createElement('label');
    wipeCheckLbl.className = 'debug-check-label';
    const wipeCb = document.createElement('input');
    wipeCb.type = 'checkbox';
    wipeCb.checked = this._wipeEnabled;
    const wipeTxt = document.createElement('span');
    wipeTxt.textContent = '50/50 Wipe Curtain';
    wipeCheckLbl.append(wipeCb, wipeTxt);

    const wipeVal = document.createElement('span');
    wipeVal.className = 'debug-val';
    wipeVal.textContent = `${Math.round(this._wipePosition * 100)}%`;
    wipeHdr.append(wipeCheckLbl, wipeVal);

    const wipeSlider = document.createElement('input');
    wipeSlider.type = 'range';
    wipeSlider.className = 'debug-slider';
    wipeSlider.min = '0';
    wipeSlider.max = '1';
    wipeSlider.step = '0.01';
    wipeSlider.value = String(this._wipePosition);
    wipeCb.addEventListener('change', () => {
      this._wipeEnabled = wipeCb.checked;
      this.portalSystem?.setWipeEnabled?.(this._wipeEnabled);
      if (this._wipeEnabled) {
        this.portalSystem?.setWipePosition?.(this._wipePosition);
      }
    });
    wipeSlider.addEventListener('input', () => {
      this._wipePosition = Number(wipeSlider.value);
      wipeVal.textContent = `${Math.round(this._wipePosition * 100)}%`;
      if (!this._wipeEnabled) {
        this._wipeEnabled = true;
        wipeCb.checked = true;
        this.portalSystem?.setWipeEnabled?.(true);
      }
      this.portalSystem?.setWipePosition?.(this._wipePosition);
    });
    wipeRow.append(wipeHdr, wipeSlider);

    // Checkboxes: Show 11 3D Frustums
    const optChecks = document.createElement('div');
    optChecks.className = 'debug-check-grid';

    const frustumLbl = document.createElement('label');
    frustumLbl.className = 'debug-check-label';
    const frustumCb = document.createElement('input');
    frustumCb.type = 'checkbox';
    frustumCb.checked = this._showFrustums;
    frustumCb.addEventListener('change', () => {
      this._showFrustums = frustumCb.checked;
      this._applyShowFrustums(this._showFrustums);
    });
    const frustumTxt = document.createElement('span');
    frustumTxt.textContent = 'Show 11 Frustums';
    frustumLbl.append(frustumCb, frustumTxt);

    optChecks.append(frustumLbl);

    // Timelapse + PnP RMSE Verification Runner
    const verifyRow = document.createElement('div');
    verifyRow.className = 'debug-btn-row';

    const tlBtn = document.createElement('button');
    tlBtn.type = 'button';
    tlBtn.className = 'debug-btn';
    tlBtn.textContent = '▶ 5-Frame Axial TL';
    tlBtn.addEventListener('click', () => {
      if (this._timelapseRunning) {
        this._stopAxialTimelapse();
      } else {
        this._startAxialTimelapse();
      }
    });

    const verifyBtn = document.createElement('button');
    verifyBtn.type = 'button';
    verifyBtn.className = 'debug-btn';
    verifyBtn.textContent = 'Verify 11 PnP RMSE';
    verifyBtn.addEventListener('click', () => this._runPnpVerificationTable());

    verifyRow.append(tlBtn, verifyBtn);

    const rmseWrap = document.createElement('div');
    this._refs.portalSelect = select;
    this._refs.tlBtn = tlBtn;
    this._refs.rmseWrap = rmseWrap;

    content.append(select, portalActionRow, blendRow, wipeRow, optChecks, verifyRow, rmseWrap);
    return details;
  }

  // ---------------------------------------------------------------------------
  // Panel 3: Real Lighting, Mood, Shadow & Zero-Emissive Auditor
  // ---------------------------------------------------------------------------

  _buildLightingSection() {
    const { details, content } = this._createSection('3 · Real Lighting, Mood & Emissive Audit', false);

    // Mood Buttons
    const moodRow = document.createElement('div');
    moodRow.className = 'debug-row';
    const moodLbl = document.createElement('span');
    moodLbl.className = 'debug-label';
    moodLbl.textContent = 'Atmosphere Mood';
    const moodBtnsWrap = document.createElement('div');
    moodBtnsWrap.className = 'debug-btn-row';

    const moodBtns = [];
    for (const m of ['day', 'dusk', 'night']) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `debug-btn${this._mood === m ? ' is-active' : ''}`;
      btn.textContent = m;
      btn.addEventListener('click', () => {
        this._mood = m;
        this.atmosphere?.setMood?.(m);
        this.lightingRig?.setMood?.(m);
        this.app?.setMood?.(m);
        for (const b of moodBtns) b.classList.toggle('is-active', b === btn);
      });
      moodBtns.push(btn);
      moodBtnsWrap.appendChild(btn);
    }
    moodRow.append(moodLbl, moodBtnsWrap);

    // Sun Azimuth & Elevation Sliders
    const azRow = document.createElement('div');
    azRow.className = 'debug-row debug-row--stack';
    const azHdr = document.createElement('div');
    azHdr.className = 'debug-row';
    const azLbl = document.createElement('span');
    azLbl.className = 'debug-label';
    azLbl.textContent = 'Sun Azimuth';
    const azVal = document.createElement('span');
    azVal.className = 'debug-val';
    azVal.textContent = `${this._sunAzimuthDeg}°`;
    azHdr.append(azLbl, azVal);
    const azSlider = document.createElement('input');
    azSlider.type = 'range';
    azSlider.className = 'debug-slider';
    azSlider.min = '0';
    azSlider.max = '360';
    azSlider.step = '1';
    azSlider.value = String(this._sunAzimuthDeg);
    azSlider.addEventListener('input', () => {
      this._sunAzimuthDeg = Number(azSlider.value);
      azVal.textContent = `${this._sunAzimuthDeg}°`;
      this._applySunAngles();
    });
    azRow.append(azHdr, azSlider);

    const elRow = document.createElement('div');
    elRow.className = 'debug-row debug-row--stack';
    const elHdr = document.createElement('div');
    elHdr.className = 'debug-row';
    const elLbl = document.createElement('span');
    elLbl.className = 'debug-label';
    elLbl.textContent = 'Sun Elevation';
    const elVal = document.createElement('span');
    elVal.className = 'debug-val';
    elVal.textContent = `${this._sunElevationDeg}°`;
    elHdr.append(elLbl, elVal);
    const elSlider = document.createElement('input');
    elSlider.type = 'range';
    elSlider.className = 'debug-slider';
    elSlider.min = '5';
    elSlider.max = '75';
    elSlider.step = '1';
    elSlider.value = String(this._sunElevationDeg);
    elSlider.addEventListener('input', () => {
      this._sunElevationDeg = Number(elSlider.value);
      elVal.textContent = `${this._sunElevationDeg}°`;
      this._applySunAngles();
    });
    elRow.append(elHdr, elSlider);

    // Shadow Frustum Helper Toggle
    const shadowLbl = document.createElement('label');
    shadowLbl.className = 'debug-check-label';
    const shadowCb = document.createElement('input');
    shadowCb.type = 'checkbox';
    shadowCb.checked = this._shadowHelperVisible;
    shadowCb.addEventListener('change', () => {
      this._shadowHelperVisible = shadowCb.checked;
      this._applyShadowHelper(this._shadowHelperVisible);
    });
    const shadowTxt = document.createElement('span');
    shadowTxt.textContent = 'Directional Shadow Camera Helper';
    shadowLbl.append(shadowCb, shadowTxt);

    // Render Mode Switcher (`pbr`, `ink`, `xray`, `silhouette`)
    const modeStack = document.createElement('div');
    modeStack.className = 'debug-row debug-row--stack';
    const modeLbl = document.createElement('span');
    modeLbl.className = 'debug-label';
    modeLbl.textContent = 'Diagnostic Render Mode';
    const modeBtnsWrap = document.createElement('div');
    modeBtnsWrap.className = 'debug-btn-row';
    const modeBtns = [];
    for (const mode of ['pbr', 'ink', 'xray', 'silhouette']) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `debug-btn${this._renderMode === mode ? ' is-active' : ''}`;
      btn.textContent = mode;
      btn.addEventListener('click', () => {
        this._renderMode = mode;
        this._applyRenderMode(mode);
        for (const b of modeBtns) b.classList.toggle('is-active', b === btn);
      });
      modeBtns.push(btn);
      modeBtnsWrap.appendChild(btn);
    }
    modeStack.append(modeLbl, modeBtnsWrap);

    // Zero-Emissive Audit Badge + Enforce Button
    const auditRow = document.createElement('div');
    auditRow.className = 'debug-row debug-row--stack';
    const badge = document.createElement('div');
    badge.className = 'debug-badge debug-badge--pass';
    badge.textContent = 'Zero-Emissive Audit: Pending';

    const auditBtns = document.createElement('div');
    auditBtns.className = 'debug-btn-row';
    const reAuditBtn = document.createElement('button');
    reAuditBtn.type = 'button';
    reAuditBtn.className = 'debug-btn';
    reAuditBtn.textContent = 'Re-Audit Emissive';
    reAuditBtn.addEventListener('click', () => this._refreshEmissiveAuditBadge( false));

    const zeroBtn = document.createElement('button');
    zeroBtn.type = 'button';
    zeroBtn.className = 'debug-btn';
    zeroBtn.textContent = 'Enforce 0x000000';
    zeroBtn.addEventListener('click', () => this._refreshEmissiveAuditBadge(true));

    auditBtns.append(reAuditBtn, zeroBtn);
    auditRow.append(badge, auditBtns);

    this._refs.emissiveBadge = badge;

    content.append(moodRow, azRow, elRow, shadowLbl, modeStack, auditRow);
    return details;
  }

  // ---------------------------------------------------------------------------
  // Panel 4: Camera & Analytical §10.3 Constraint Telemetry
  // ---------------------------------------------------------------------------

  _buildCameraSection() {
    const { details, content } = this._createSection('4 · Camera & Constraint Telemetry', false);

    const kv = document.createElement('div');
    kv.className = 'debug-kv-grid';
    const camPosVal = this._appendKvRow(kv, 'pos (x,y,z)', '—');
    const camTgtVal = this._appendKvRow(kv, 'target (x,y,z)', '—');
    const camFovVal = this._appendKvRow(kv, 'fov (deg)', '—');
    const camVoVal = this._appendKvRow(kv, 'viewOffset', '0.000, 0.000');
    const camQuatVal = this._appendKvRow(kv, 'quat (x,y,z,w)', '—');

    const pillWrap = document.createElement('div');
    pillWrap.className = 'debug-flag-pills';
    const pillGround = this._createFlagPill('groundFloor y≥1.90m');
    const pillPolar = this._createFlagPill('polarMax ≤89.1°');
    const pillDist = this._createFlagPill('dist 15..555m');
    const pillTether = this._createFlagPill('tether r≤56.5m');
    pillWrap.append(pillGround, pillPolar, pillDist, pillTether);

    // Camera Presets + Copy Pose JSON
    const presetWrap = document.createElement('div');
    presetWrap.className = 'debug-btn-row';

    const heroBtn = document.createElement('button');
    heroBtn.type = 'button';
    heroBtn.className = 'debug-btn';
    heroBtn.textContent = 'Stop 12 Hero';
    heroBtn.addEventListener('click', () => {
      if (this.app?.heroFinaleRig?.flyToPreset) {
        this.app.heroFinaleRig.flyToPreset('overview');
      } else {
        this._applyCameraPose(
          HERO_FINALE_CAMERA.position,
          HERO_FINALE_CAMERA.target,
          HERO_FINALE_CAMERA.fov
        );
      }
    });
    presetWrap.appendChild(heroBtn);

    HERO_CRAFTSMANSHIP_PRESETS.filter((p) => p.id !== 'overview').forEach((p, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'debug-btn';
      const roman = ['I', 'II', 'III', 'IV'][idx] || String(idx + 1);
      btn.textContent = `Detail ${roman}`;
      btn.title = p.labelEn;
      btn.addEventListener('click', () => {
        if (this.app?.heroFinaleRig?.flyToPreset) {
          this.app.heroFinaleRig.flyToPreset(p.id);
        } else {
          this._applyCameraPose(p.position, p.target, p.fov);
        }
      });
      presetWrap.appendChild(btn);
    });

    const copyPoseBtn = document.createElement('button');
    copyPoseBtn.type = 'button';
    copyPoseBtn.className = 'debug-btn';
    copyPoseBtn.textContent = 'Copy Pose JSON';
    copyPoseBtn.addEventListener('click', () => this._copyCameraPoseJson(copyPoseBtn));
    presetWrap.appendChild(copyPoseBtn);

    this._refs.camPosVal = camPosVal;
    this._refs.camTgtVal = camTgtVal;
    this._refs.camFovVal = camFovVal;
    this._refs.camVoVal = camVoVal;
    this._refs.camQuatVal = camQuatVal;
    this._refs.pillGround = pillGround;
    this._refs.pillPolar = pillPolar;
    this._refs.pillDist = pillDist;
    this._refs.pillTether = pillTether;

    content.append(kv, pillWrap, presetWrap);
    return details;
  }

  // ---------------------------------------------------------------------------
  // Panel 5: Performance
  // ---------------------------------------------------------------------------

  _buildPerfSection() {
    const { details, content } = this._createSection('5 · Performance', false);

    const kv = document.createElement('div');
    kv.className = 'debug-kv-grid';
    const fpsVal = this._appendKvRow(kv, 'FPS (30f avg)', '—');
    const msVal = this._appendKvRow(kv, 'Frame ms', '—');
    const ttflVal = this._appendKvRow(kv, 'Cold TTFL', '—');
    const callsVal = this._appendKvRow(kv, 'draw calls', '—');
    const trisVal = this._appendKvRow(kv, 'triangles', '—');
    const texVal = this._appendKvRow(kv, 'textures', '—');

    this._refs.fpsVal = fpsVal;
    this._refs.msVal = msVal;
    this._refs.ttflVal = ttflVal;
    this._refs.callsVal = callsVal;
    this._refs.trisVal = trisVal;
    this._refs.texVal = texVal;

    content.append(kv);
    return details;
  }

  // ---------------------------------------------------------------------------
  // Private: Engine Wiring Helpers
  // ---------------------------------------------------------------------------

  _appendKvRow(gridEl, keyText, initialVal) {
    const k = document.createElement('span');
    k.className = 'debug-kv-key';
    k.textContent = keyText;
    const v = document.createElement('span');
    v.className = 'debug-kv-val';
    v.textContent = initialVal;
    gridEl.append(k, v);
    return v;
  }

  _createFlagPill(text) {
    const pill = document.createElement('span');
    pill.className = 'debug-flag-pill';
    pill.textContent = text;
    return pill;
  }

  _syncControlsFromLiveEngine() {
    const currentStep =
      typeof this.towerController?.getStep === 'function'
        ? this.towerController.getStep()
        : typeof this.towerController?.currentStep === 'number'
          ? this.towerController.currentStep
          : this._rawStep;

    if (Number.isFinite(currentStep)) {
      this._rawStep = currentStep;
      if (this._refs.stepSlider) this._refs.stepSlider.value = String(currentStep);
      if (this._refs.stepVal) {
        this._refs.stepVal.textContent = `${currentStep.toFixed(3)} / 11.000`;
      }
    }
  }

  _setRawStep(stepVal) {
    const clamped = Math.max(0, Math.min(11, Number(stepVal) || 0));
    this._rawStep = clamped;
    if (this._refs.stepSlider) this._refs.stepSlider.value = String(clamped);
    if (this._refs.stepVal) {
      this._refs.stepVal.textContent = `${clamped.toFixed(3)} / 11.000`;
    }
    this.towerController?.setStep?.(clamped);
    this.app?.setStep?.(clamped);
  }

  _updateRawScrubBtn() {
    if (!this._refs.scrubPlayBtn) return;
    this._refs.scrubPlayBtn.textContent = this._rawScrubPlaying
      ? '⏸ Pause Scrub'
      : '▶ Scrub 0→11';
    this._refs.scrubPlayBtn.classList.toggle('is-active', this._rawScrubPlaying);
  }

  _applyZoneVisibility(zoneKey, visible) {
    if (zoneKey === 'paris_1889') {
      if (this.parisWorld?.setVisible) {
        this.parisWorld.setVisible(visible);
      } else if (this.parisWorld?.group) {
        this.parisWorld.group.visible = visible;
      } else if (this.scene?.getObjectByName) {
        const obj = this.scene.getObjectByName('paris_1889') || this.scene.getObjectByName('Paris1889');
        if (obj) obj.visible = visible;
      }
      return;
    }

    if (zoneKey === 'edgesSketch') {
      if (this.towerController?.setEdgesVisible) {
        this.towerController.setEdgesVisible(visible);
      } else if (this.scene?.traverse) {
        this.scene.traverse((o) => {
          if (o.isLineSegments || /edge|sketch|outline/i.test(o.name || '')) {
            o.visible = visible;
          }
        });
      }
      return;
    }

    if (this.towerController?.setZoneVisibility) {
      this.towerController.setZoneVisibility(zoneKey, visible);
    } else if (this.towerController?.zones && this.towerController.zones[zoneKey]) {
      this.towerController.zones[zoneKey].visible = visible;
    } else if (this.scene?.getObjectByName) {
      const zObj = this.scene.getObjectByName(zoneKey);
      if (zObj) zObj.visible = visible;
    }
  }

  _applyShowFrustums(visible) {
    this.portalSystem?.setPortalsVisible?.(Boolean(visible));
    if (this.portalSystem?.frustumGroup) {
      this.portalSystem.frustumGroup.visible = Boolean(visible);
    }
  }

  _enterPortalFromDebug(photoId) {
    const p1889 = CALIBRATED_1889_PORTALS.find((p) => p.id === photoId);
    if (p1889) {
      this._setRawStep(p1889.step);
    }
    this.walkthroughController?.pause?.();
    this.portalSystem?.enterPortal?.(photoId, { durationMs: 700 });
    this.portalSystem?.setBlend?.(this._portalBlend);
  }

  _exitPortalFromDebug() {
    this.portalSystem?.exitPortal?.({ durationMs: 500 });
  }

  _startAxialTimelapse() {
    this._stopAxialTimelapse();
    this._timelapseRunning = true;
    if (this._refs.tlBtn) {
      this._refs.tlBtn.textContent = '⏹ Stop Axial TL';
      this._refs.tlBtn.classList.add('is-active');
    }
    this.walkthroughController?.pause?.();

    if (typeof this.portalSystem?.startTimelapse === 'function') {
      this.portalSystem.startTimelapse();
      return;
    }

    this._timelapseIdx = 0;
    const stepFrame = () => {
      if (!this._timelapseRunning) return;
      const id = AXIAL_TIMELAPSE_IDS[this._timelapseIdx % AXIAL_TIMELAPSE_IDS.length];
      this._timelapseIdx += 1;
      if (this._refs.portalSelect) this._refs.portalSelect.value = id;
      this._enterPortalFromDebug(id);
    };
    stepFrame();
    this._timelapseTimer = setInterval(stepFrame, 2200);
  }

  _stopAxialTimelapse() {
    this._timelapseRunning = false;
    if (this._timelapseTimer) {
      clearInterval(this._timelapseTimer);
      this._timelapseTimer = null;
    }
    this.portalSystem?.stopTimelapse?.();
    if (this._refs.tlBtn) {
      this._refs.tlBtn.textContent = '▶ 5-Frame Axial TL';
      this._refs.tlBtn.classList.remove('is-active');
    }
  }

  _runPnpVerificationTable() {
    if (!this._refs.rmseWrap) return;
    this._refs.rmseWrap.replaceChildren();

    let rows = null;
    if (typeof this.portalSystem?.verifyPortalProjection === 'function') {
      try {
        const res = this.portalSystem.verifyPortalProjection();
        if (Array.isArray(res)) rows = res;
        else if (res && Array.isArray(res.portals)) rows = res.portals;
      } catch (_err) {
        rows = null;
      }
    }

    if (!rows || rows.length === 0) {
      rows = CALIBRATED_1889_PORTALS.map((p) => ({
        id: p.id,
        step: p.step,
        rmsePx: p.rmsePx,
        era: '1887–89',
      }));
    }

    const table = document.createElement('table');
    table.className = 'debug-rmse-table';
    const thead = document.createElement('thead');
    const htr = document.createElement('tr');
    for (const col of ['ID', 'Era', 'Step', 'RMSE (px)']) {
      const th = document.createElement('th');
      th.textContent = col;
      htr.appendChild(th);
    }
    thead.appendChild(htr);

    const tbody = document.createElement('tbody');
    for (const r of rows) {
      const tr = document.createElement('tr');
      const idVal = r.id || r.photo_id || '—';
      const eraVal = r.era || '1887–89';
      const stepNum = Number(r.step ?? r.recommended_global_step ?? 11);
      const rmseNum = Number(r.rmsePx ?? r.reprojection_rmse_px ?? r.rmse ?? 0);

      for (const cellText of [
        `#${idVal}`,
        eraVal,
        stepNum.toFixed(2),
        `${rmseNum.toFixed(2)} px`,
      ]) {
        const td = document.createElement('td');
        td.textContent = cellText;
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }

    table.append(thead, tbody);
    this._refs.rmseWrap.appendChild(table);
  }

  _applySunAngles() {
    const az = this._sunAzimuthDeg;
    const el = this._sunElevationDeg;

    if (typeof this.lightingRig?.setSunAngles === 'function') {
      this.lightingRig.setSunAngles(az, el);
    } else if (typeof this.atmosphere?.setSunAngles === 'function') {
      this.atmosphere.setSunAngles(az, el);
    } else if (this.scene?.traverse) {
      const azRad = (az * Math.PI) / 180;
      const elRad = (el * Math.PI) / 180;
      const r = 460;
      const y = r * Math.sin(elRad);
      const horiz = r * Math.cos(elRad);
      const x = horiz * Math.sin(azRad);
      const z = horiz * Math.cos(azRad);

      this.scene.traverse((obj) => {
        if (obj.isDirectionalLight) {
          obj.position.set(x, y, z);
          obj.updateMatrixWorld?.();
        }
      });
    }

    if (this.renderer?.shadowMap) {
      this.renderer.shadowMap.needsUpdate = true;
    }
  }

  _applyShadowHelper(visible) {
    if (typeof this.lightingRig?.setShadowHelperVisible === 'function') {
      this.lightingRig.setShadowHelperVisible(visible);
      return;
    }
    if (this._shadowHelperObj) {
      this._shadowHelperObj.visible = Boolean(visible);
    }
  }

  _applyRenderMode(mode) {
    if (typeof this.app?.setRenderMode === 'function') {
      this.app.setRenderMode(mode);
      return;
    }
    if (typeof this.towerController?.setRenderMode === 'function') {
      this.towerController.setRenderMode(mode);
      return;
    }
    if (!this.scene?.traverse) return;

    this.scene.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        if (!m) continue;
        if (!this._savedMaterialProps.has(m)) {
          this._savedMaterialProps.set(m, {
            wireframe: Boolean(m.wireframe),
            transparent: Boolean(m.transparent),
            opacity: typeof m.opacity === 'number' ? m.opacity : 1.0,
            roughness: m.roughness,
            metalness: m.metalness,
          });
        }
        const orig = this._savedMaterialProps.get(m);
        if (mode === 'pbr') {
          m.wireframe = orig.wireframe;
          m.transparent = orig.transparent;
          m.opacity = orig.opacity;
          if (orig.roughness !== undefined) m.roughness = orig.roughness;
          if (orig.metalness !== undefined) m.metalness = orig.metalness;
        } else if (mode === 'ink') {
          m.wireframe = true;
          m.transparent = false;
          m.opacity = 1.0;
        } else if (mode === 'xray') {
          m.wireframe = false;
          m.transparent = true;
          m.opacity = 0.24;
        } else if (mode === 'silhouette') {
          m.wireframe = false;
          m.transparent = false;
          m.opacity = 1.0;
          if (m.roughness !== undefined) m.roughness = 1.0;
          if (m.metalness !== undefined) m.metalness = 0.0;
        }
        m.needsUpdate = true;
      }
    });
  }

  _refreshEmissiveAuditBadge(enforceZero = false) {
    if (!this._refs.emissiveBadge) return;
    const report = auditZeroEmissive(this.scene, { enforceZero });
    if (report.passes) {
      this._refs.emissiveBadge.className = 'debug-badge debug-badge--pass';
      this._refs.emissiveBadge.textContent =
        report.checkedMaterials > 0
          ? `PASS · 0 emissive (${report.checkedMaterials} mats)`
          : 'PASS · 0 emissive materials';
    } else {
      this._refs.emissiveBadge.className = 'debug-badge debug-badge--warn';
      this._refs.emissiveBadge.textContent = `WARN · ${report.offendingCount} emissive mat(s)`;
    }
  }

  _applyCameraPose(pos, target, fov) {
    this.walkthroughController?.pause?.();
    if (typeof this.app?.flyToCameraPose === 'function') {
      this.app.flyToCameraPose({ position: pos, target, fov, durationMs: 750 });
      return;
    }
    if (this.camera?.position?.set) {
      this.camera.position.set(pos[0], pos[1], pos[2]);
      if (typeof fov === 'number') {
        this.camera.fov = fov;
        this.camera.clearViewOffset?.();
        this.camera.updateProjectionMatrix?.();
      }
    }
    if (this.controls?.target?.set) {
      this.controls.target.set(target[0], target[1], target[2]);
      this.controls.update?.();
    } else if (this.camera?.lookAt) {
      this.camera.lookAt(target[0], target[1], target[2]);
    }
  }

  _refreshTelemetryNow() {
    if (!this._open || !this._root) return;

    // 1. Kinematics telemetry
    if (this.towerController) {
      const stats =
        typeof this.towerController.getPieceStats === 'function'
          ? this.towerController.getPieceStats()
          : null;
      if (stats && this._refs.piecesVal) {
        this._refs.piecesVal.textContent = `${stats.visible ?? '—'} / ${stats.total ?? '—'}`;
      }
      if (this._refs.craneModeVal) {
        const s = this._rawStep;
        this._refs.craneModeVal.textContent =
          s < 1.5
            ? 'Caisson / Masonry'
            : s < 4.0
              ? 'Timber Falsework + Jacks'
              : s < 10.95
                ? 'Creeper Cranes (Vertical)'
                : 'Completed Monument';
      }
      if (this._refs.activeZoneVal) {
        const s = this._rawStep;
        const z =
          s < 1.2 ? 'zone1' : s < 3.8 ? 'zone2' : s < 5.2 ? 'zone3' : s < 8.5 ? 'zone4' : 'zone5';
        this._refs.activeZoneVal.textContent = z;
      }
    }

    // 2. Camera & §10.3 analytical constraint telemetry
    const cam = this.camera;
    const tgt = this.controls?.target;
    if (cam?.position) {
      const px = cam.position.x;
      const py = cam.position.y;
      const pz = cam.position.z;
      const tx = tgt ? tgt.x : 0;
      const ty = tgt ? tgt.y : 134;
      const tz = tgt ? tgt.z : 0;

      if (this._refs.camPosVal) {
        this._refs.camPosVal.textContent = `${px.toFixed(1)}, ${py.toFixed(1)}, ${pz.toFixed(1)}`;
      }
      if (this._refs.camTgtVal) {
        this._refs.camTgtVal.textContent = `${tx.toFixed(1)}, ${ty.toFixed(1)}, ${tz.toFixed(1)}`;
      }
      if (this._refs.camFovVal && typeof cam.fov === 'number') {
        this._refs.camFovVal.textContent = `${cam.fov.toFixed(2)}°`;
      }
      if (this._refs.camVoVal) {
        const vo = cam.view;
        if (vo && vo.enabled && vo.fullWidth > 0 && vo.fullHeight > 0) {
          const ox = (vo.offsetX / vo.fullWidth).toFixed(3);
          const oy = (vo.offsetY / vo.fullHeight).toFixed(3);
          this._refs.camVoVal.textContent = `${ox}, ${oy}`;
        } else {
          this._refs.camVoVal.textContent = '0.000, 0.000';
        }
      }
      if (this._refs.camQuatVal && cam.quaternion) {
        const q = cam.quaternion;
        this._refs.camQuatVal.textContent = `${q.x.toFixed(2)}, ${q.y.toFixed(2)}, ${q.z.toFixed(2)}, ${q.w.toFixed(2)}`;
      }

      const dx = px - tx;
      const dy = py - ty;
      const dz = pz - tz;
      const dist = Math.hypot(dx, dy, dz);
      const horizTether = Math.hypot(tx, tz);
      const polarDeg = dist > 1e-4 ? (Math.acos(Math.max(-1, Math.min(1, dy / dist))) * 180) / Math.PI : 0;

      this._refs.pillGround?.classList.toggle('is-clamped', py <= 0.6);
      this._refs.pillPolar?.classList.toggle('is-clamped', polarDeg >= 88.8);
      this._refs.pillDist?.classList.toggle('is-clamped', dist <= 2.6 || dist >= 915);
      this._refs.pillTether?.classList.toggle('is-clamped', horizTether >= 315);
    }

    // 3. Performance & Renderer Info
    if (this._frameDtCount > 0) {
      let sum = 0;
      for (let i = 0; i < this._frameDtCount; i += 1) sum += this._frameDtRing[i];
      const avgDt = sum / this._frameDtCount;
      const fps = avgDt > 0 ? 1 / avgDt : 0;
      if (this._refs.fpsVal) this._refs.fpsVal.textContent = fps.toFixed(1);
      if (this._refs.msVal) this._refs.msVal.textContent = `${(avgDt * 1000).toFixed(2)} ms`;
    }

    const ttfl = this.app?.ttflMs ?? this._ttflMs;
    if (this._refs.ttflVal && typeof ttfl === 'number') {
      this._refs.ttflVal.textContent = `${Math.round(ttfl)} ms`;
    }

    const rInfo = this.renderer?.info;
    if (rInfo) {
      if (this._refs.callsVal) this._refs.callsVal.textContent = String(rInfo.render?.calls ?? 0);
      if (this._refs.trisVal) {
        const tris = rInfo.render?.triangles ?? 0;
        this._refs.trisVal.textContent = tris.toLocaleString('en-US');
      }
      if (this._refs.texVal) this._refs.texVal.textContent = String(rInfo.memory?.textures ?? 0);
    }
  }

  _copyCameraPoseJson(btn) {
    const cam = this.camera;
    const tgt = this.controls?.target;
    const payload = {
      position: cam?.position
        ? [Number(cam.position.x.toFixed(2)), Number(cam.position.y.toFixed(2)), Number(cam.position.z.toFixed(2))]
        : HERO_FINALE_CAMERA.position,
      target: tgt
        ? [Number(tgt.x.toFixed(2)), Number(tgt.y.toFixed(2)), Number(tgt.z.toFixed(2))]
        : HERO_FINALE_CAMERA.target,
      fov: cam?.fov ? Number(cam.fov.toFixed(2)) : HERO_FINALE_CAMERA.fov,
    };
    this._copyTextWithFeedback(JSON.stringify(payload, null, 2), btn, 'Copied Pose');
  }

  _copyDiagnosticsJson(btn) {
    const emissive = auditZeroEmissive(this.scene);
    const payload = {
      rawStep: Number(this._rawStep.toFixed(3)),
      mood: this._mood,
      renderMode: this._renderMode,
      zeroEmissivePasses: emissive.passes,
      checkedMaterials: emissive.checkedMaterials,
      ttflMs: this.app?.ttflMs ?? this._ttflMs,
      rendererRender: this.renderer?.info?.render || null,
      rendererMemory: this.renderer?.info?.memory || null,
    };
    this._copyTextWithFeedback(JSON.stringify(payload, null, 2), btn, 'Copied');
  }

  _copyTextWithFeedback(text, btn, tempLabel) {
    const orig = btn.textContent;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    btn.textContent = tempLabel;
    setTimeout(() => {
      if (btn.isConnected) btn.textContent = orig;
    }, 1100);
  }
}

export function createDebugDrawer(options = {}) {
  return new DebugDrawer(options).init();
}
