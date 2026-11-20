/**
 * Spatial Photo Portals, Zero-Jump Optical Camera Flight & Untinted Plate Overlay
 *
 * Powered by `OpticalCameraRig` (`camera/optical_camera_rig.js`):
 *   1. `0.000 px` Onset & Lock-In Projection Continuity across all 11 calibrated PnP portals
 *      (including extreme rising-front `-75.4%` shift `#23` and portrait-mobile `>115°` sub-frustums),
 *      preserving calibrated PnP reprojection RMSE at portal rest.
 *   2. Helical `CatmullRomCurve3` exterior flight paths with 4-pier + shaft obstacle clearance,
 *      Tower-anchored focal gaze steering (never turns away from the Tower on 180° cross-axis flights),
 *      and `C¹` Hermite velocity-matched mid-flight interruption continuity.
 *   3. Zero-Jump Interactive Drag-to-Orbit Release (`allowCanvasDragExit = true`): dragging >6 px
 *      on any Stop 01–10 canvas smoothly dissolves the glass plate in frozen aspect-locked geometry
 *      while unshifting `viewOffset` to constrained 3D orbit with `0.000 px` frame-0 snap.
 *   4. Independent frozen-geometry `_departingFrame` cross-dissolve so departing glass plates
 *      never cut in 1 frame or stretch to the incoming plate's aspect ratio.
 *   5. Preserves fast 320 px boot thumbnails, `0` emissive materials, `0` `AdditiveBlending`,
 *      and hidden 3D frustum markers in visitor mode.
 */

import {
  DEFAULT_LANGUAGE,
  normalizeLanguage,
  getPhotoCuration,
  PHOTO_CURATION_1889,
  CHAMP_DE_MARS_TIMELAPSE_IDS,
  PHOTO_CHRONOLOGICAL_IDS,
} from 'museum/story/chapters_1889.js';

import {
  OpticalCameraRig,
  smoothstepQuintic,
} from 'museum/camera/optical_camera_rig.js';

import {
  flushOrbitControlsMomentum,
} from 'museum/camera/viewport_constraints.js';

const DEG2RAD = Math.PI / 180;

const ARCHIVE_LINE_HEX = 0x685746;
const ARCHIVE_HIGHLIGHT_HEX = 0x8a7560;
const ARCHIVE_DIM_HEX = 0x44372f;

const PREVIEW_WIDTH_M = 2.4;
const PINNED_TEX_MAX_PX = 1280;
const FLIGHT_DURATION_SEC = 1.45;
const DEPARTING_DISSOLVE_SEC = 0.36;
const RELEASE_DURATION_SEC = 0.65;
const TIMELAPSE_HOLD_SEC = 1.85;
const TIMELAPSE_FINAL_HOLD_SEC = 2.6;
const TIMELAPSE_GLIDE_SEC = 2.35;
const IMAGE_LRU_MAX = 8;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function smoothstepCubic(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function joinAssetUrl(prefix, relPath) {
  const cleanRel = String(relPath || '').replace(/^\/+/, '');
  if (!prefix) return cleanRel;
  const cleanPrefix = String(prefix).endsWith('/') ? String(prefix) : `${prefix}/`;
  return encodeURI(`${cleanPrefix}${cleanRel}`);
}

function normalizePhotoId(raw) {
  if (raw === null || raw === undefined) return '';
  const s = String(raw).trim().replace(/^#/, '');
  return /^\d$/.test(s) ? s.padStart(2, '0') : s;
}

export class PhotoPortalSystem {
  constructor({
    THREE,
    scene,
    camera,
    controls,
    domCanvas,
    domOverlayContainer,
    photoCamerasUrl = './data/catalog/photo_cameras_3d.json',
    assetPrefix = './',
    lang = DEFAULT_LANGUAGE,
    allowCanvasDragExit = true,
    viewportConstraints = null,
    towerController = null,
    opticalRig = null,
    preloadedCatalog = null,
    preloadedFullImages = null,
    preloadedImagePromises = null,
    onSelectPortal,
    onExitPortal,
    onStepRequest,
    onWipeChange,
    onBlendChange,
    onTimelapseChange,
    onThumbnailReady,
  } = {}) {
    if (!THREE) throw new Error('PhotoPortalSystem requires THREE');
    if (!scene) throw new Error('PhotoPortalSystem requires scene');
    if (!camera) throw new Error('PhotoPortalSystem requires camera');

    this.THREE = THREE;
    this.scene = scene;
    this.camera = camera;
    this.controls = controls || null;
    this.domCanvas = domCanvas || null;
    this.domOverlayContainer = domOverlayContainer || null;
    this.photoCamerasUrl = photoCamerasUrl;
    this.assetPrefix = assetPrefix;
    this._lang = normalizeLanguage(lang);
    this._allowCanvasDragExit = Boolean(allowCanvasDragExit);
    this.viewportConstraints = viewportConstraints || null;
    this._towerController = towerController || null;
    this._releasingCutawayId = null;
    this._preloadedCatalog = preloadedCatalog || null;

    this.opticalRig =
      opticalRig ||
      new OpticalCameraRig({
        THREE,
        camera,
        controls: this.controls,
        viewportConstraints: this.viewportConstraints,
      });

    this.onSelectPortal = typeof onSelectPortal === 'function' ? onSelectPortal : null;
    this.onExitPortal = typeof onExitPortal === 'function' ? onExitPortal : null;
    this.onStepRequest = typeof onStepRequest === 'function' ? onStepRequest : null;
    this.onWipeChange = typeof onWipeChange === 'function' ? onWipeChange : null;
    this.onBlendChange = typeof onBlendChange === 'function' ? onBlendChange : null;
    this.onTimelapseChange = typeof onTimelapseChange === 'function' ? onTimelapseChange : null;
    this.onThumbnailReady = typeof onThumbnailReady === 'function' ? onThumbnailReady : null;

    this.portalsGroup = new THREE.Group();
    this.portalsGroup.name = 'photo_portals_1889';
    this.portalsGroup.visible = false; // Hidden in visitor mode; toggleable from Debug View
    this.scene.add(this.portalsGroup);

    this._stationsGroup = new THREE.Group();
    this._stationsGroup.name = 'portal_stations';
    this.portalsGroup.add(this._stationsGroup);

    this._pinnedContainer = new THREE.Group();
    this._pinnedContainer.name = 'pinned_frustum_plane';
    this.portalsGroup.add(this._pinnedContainer);

    this._portals = [];
    this._portalById = new Map();
    this._stationNodes = new Map();
    this._previewHitMeshes = [];

    this._activePortalId = null;
    this._pinnedPortalId = null;
    this._pinnedObject = null;
    this._hoveredPortalId = null;

    this._blend = 1.0;
    this._lastRenderedPlateOpacity = 0.0;
    this._wipeSplit = null;
    this._activeStep = 11.0;
    this._portalsVisible = false;
    this._previewThumbnailsRequested = false;
    this._sharedPlaceholderTex = null;
    this._savedFreeFov = Number.isFinite(camera.fov) ? camera.fov : 42.0;

    this._vpWidth = 0;
    this._vpHeight = 0;
    this._currentRect = null;

    this._flight = null;
    this._freeFlight = null;
    this._timelapse = null;
    this._departingPlate = null;

    this._imageLru = new Map();
    this._decodedImages = new Map();
    this._pinnedTexCache = new Map();
    this._preloadedImagePromises = new Map();

    if (preloadedFullImages) {
      const entries =
        preloadedFullImages instanceof Map
          ? preloadedFullImages.entries()
          : Object.entries(preloadedFullImages);
      for (const [rawId, img] of entries) {
        const key = normalizePhotoId(rawId);
        if (key && img && (img.naturalWidth > 0 || img.width > 0)) {
          this._decodedImages.set(key, img);
          this._imageLru.set(key, Promise.resolve(img));
        }
      }
    }

    if (preloadedImagePromises) {
      const entries =
        preloadedImagePromises instanceof Map
          ? preloadedImagePromises.entries()
          : Object.entries(preloadedImagePromises);
      for (const [rawId, p] of entries) {
        const key = normalizePhotoId(rawId);
        if (key && p && typeof p.then === 'function') {
          this._preloadedImagePromises.set(key, p);
          p.then((img) => {
            if (img && !this._disposed && (img.naturalWidth > 0 || img.width > 0)) {
              this._decodedImages.set(key, img);
              this._imageLru.set(key, Promise.resolve(img));
            }
          }).catch(() => {});
        }
      }
    }

    this._raycaster = new THREE.Raycaster();
    this._ndcPointer = new THREE.Vector2();
    this._tmpVec3 = new THREE.Vector3();
    this._tmpSpherical = new THREE.Spherical();

    this._pointerState = {
      active: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      lastX: 0,
      lastY: 0,
      startTime: 0,
      moved: false,
      orbitingFromPortal: false,
    };
    this._wipeDragging = false;

    this._dom = null;
    this._disposed = false;

    this._buildDomOverlay();
    this._bindCanvasEvents();
  }

  setViewportConstraints(vc) {
    this.viewportConstraints = vc || null;
    this.opticalRig.setViewportConstraints(this.viewportConstraints);
  }

  setTowerController(tc) {
    this._towerController = tc || null;
    this.syncPortalCutaway();
  }

  syncPortalCutaway() {
    return null;
  }

  getOpticalRig() {
    return this.opticalRig;
  }

  async init() {
    let catalog = this._preloadedCatalog;
    if (!catalog) {
      const res = await fetch(this.photoCamerasUrl);
      if (!res.ok) {
        throw new Error(`Failed to load calibrated cameras (${res.status})`);
      }
      catalog = await res.json();
    }
    const rawById = new Map();
    for (const entry of catalog.cameras || []) {
      rawById.set(String(entry.photo_id), entry);
    }

    const orderedIds = PHOTO_CHRONOLOGICAL_IDS.filter((id) => rawById.has(id));
    for (const entry of catalog.cameras || []) {
      const id = String(entry.photo_id);
      if (!orderedIds.includes(id)) orderedIds.push(id);
    }

    const timelapseSet = new Set(CHAMP_DE_MARS_TIMELAPSE_IDS);
    this._portals = orderedIds.map((photoId, idx) => {
      const camEntry = rawById.get(photoId);
      const curation =
        getPhotoCuration(photoId, this._lang) ||
        PHOTO_CURATION_1889[photoId] || {
          photoId,
          chronologicalIndex: idx,
          dateLabel: '1889',
          title: this._lang === 'fr' ? 'Vue Historique' : 'Historical View',
          vantageLabel: 'Champ-de-Mars',
          caption: '',
        };
      const imageUrl = joinAssetUrl(this.assetPrefix, camEntry.path);
      const thumbnailUrl = joinAssetUrl(this.assetPrefix, `thumbnails/${photoId}_320.jpg`);
      return {
        photoId,
        camEntry,
        curation,
        isTimelapse: timelapseSet.has(photoId),
        imageUrl,
        thumbnailUrl,
        thumbnailDataUrl: thumbnailUrl,
        recommendedStep: Number(camEntry.recommended_global_step ?? 11.0),
      };
    });

    this._portalById.clear();
    for (const portal of this._portals) {
      this._portalById.set(portal.photoId, portal);
      this._createStationMarker3D(portal);
    }

    this._refreshViewportSize();
    this.setActiveStep(this._activeStep);

    // Only fetch 3D frustum station preview textures if 3D frustums are actually visible
    if (this._portalsVisible) {
      this._ensurePreviewThumbnailsLoaded();
    }

    return this._portals;
  }

  _ensurePreviewThumbnailsLoaded() {
    if (this._previewThumbnailsRequested || this._disposed) return;
    this._previewThumbnailsRequested = true;
    Promise.allSettled(
      this._portals.map((portal) => this._populatePreviewThumbnail(portal))
    );
  }

  setAllowCanvasDragExit(allow) {
    this._allowCanvasDragExit = Boolean(allow);
  }

  prefetchPortal(photoId) {
    const portal = this.getPortalById(photoId);
    if (!portal) return;
    this._loadFullImage(portal.photoId, portal.imageUrl).catch(() => {});
  }

  setLanguage(lang = DEFAULT_LANGUAGE) {
    this._lang = normalizeLanguage(lang);
    for (const portal of this._portals) {
      const localized = getPhotoCuration(portal.photoId, this._lang);
      if (localized) {
        portal.curation = localized;
      }
    }
    return this._lang;
  }

  getLanguage() {
    return this._lang;
  }

  getPortalById(photoId) {
    return this._portalById.get(normalizePhotoId(photoId)) || null;
  }

  getCatalog() {
    const out = {};
    for (const [id, p] of this._portalById) {
      out[id] = p.camEntry;
    }
    return out;
  }

  getActivePortalId() {
    return this._activePortalId;
  }

  getPinnedPortalId() {
    return this._pinnedPortalId;
  }

  getOverlayRect() {
    return this._currentRect ? { ...this._currentRect } : null;
  }

  getCurrentRect() {
    return this.getOverlayRect();
  }

  getRenderedPlateOpacity() {
    return this._activePortalId ? clamp(Number(this._lastRenderedPlateOpacity) || 0, 0, 1) : 0.0;
  }

  getBlend() {
    return this._blend;
  }

  setBlend(alpha) {
    const next = clamp(Number.isFinite(Number(alpha)) ? Number(alpha) : this._blend, 0.0, 1.0);
    this._blend = next;
    // During an active non-immediate portal flight, keep incoming plate gated by flight alignment
    const flightReveal = this._flight ? this._computeFlightPlateReveal(this._flight.rawT || 0) : 1.0;
    this._syncOverlayVisuals(flightReveal);
    if (this.onBlendChange) this.onBlendChange(this._blend);
  }

  setOpacity(alpha) {
    this.setBlend(alpha);
  }

  getWipe() {
    return this._wipeSplit;
  }

  setWipe(splitU) {
    const rawStr = typeof splitU === 'string' ? splitU.trim().toLowerCase() : null;
    if (
      splitU === null ||
      splitU === undefined ||
      splitU === false ||
      (rawStr !== null && ['off', 'none', 'null', 'false', ''].includes(rawStr))
    ) {
      this._wipeSplit = null;
    } else {
      const n = Number(splitU);
      this._wipeSplit = Number.isFinite(n) ? clamp(n, 0.0, 1.0) : 0.5;
      this._savedWipePos = this._wipeSplit;
    }
    const flightReveal = this._flight ? this._computeFlightPlateReveal(this._flight.rawT || 0) : 1.0;
    this._syncOverlayVisuals(flightReveal);
    if (this.onWipeChange) this.onWipeChange(this._wipeSplit);
  }

  setWipeEnabled(enabled) {
    if (!enabled) {
      this.setWipe(null);
    } else {
      this.setWipe(Number.isFinite(this._savedWipePos) ? this._savedWipePos : 0.5);
    }
  }

  setWipePosition(pos) {
    const next = clamp(Number.isFinite(Number(pos)) ? Number(pos) : 0.5, 0.0, 1.0);
    this._savedWipePos = next;
    this.setWipe(next);
  }

  pinActiveFrustumInWorld() {
    if (this._activePortalId) {
      this.exitPortal({ keepPinnedIn3D: true, reason: 'debug-pin' });
    }
  }

  clearPinnedFrustum() {
    this.clearPinned3D();
  }

  isFlying() {
    return Boolean(this._flight || this._freeFlight || this.opticalRig.isActive());
  }

  hasActiveVisualTransition() {
    return Boolean(
      this._flight ||
        this._freeFlight ||
        this.opticalRig.isActive() ||
        this._departingPlate ||
        (this._timelapse && this._timelapse.playing)
    );
  }

  _computeFlightPlateReveal(rawT) {
    // Only materialize incoming 2D plate once camera approaches optical lock (`rawT >= 0.74`)
    // so unaligned 2D photographs never slide across moving 3D ironwork mid-flight!
    return smoothstepCubic(clamp((rawT - 0.74) / 0.26, 0.0, 1.0));
  }

  /**
   * Captures any currently visible glass plate into `_dom.departingFrame` with frozen
   * pixel geometry so it dissolves smoothly over `DEPARTING_DISSOLVE_SEC` (`0.36 s`)
   * instead of cutting in 1 frame or stretching to a new plate's aspect ratio.
   */
  _snapshotDepartingPlate(durationSec = DEPARTING_DISSOLVE_SEC) {
    if (!this._dom?.departingFrame || !this._dom?.mainImg) return;
    const currentOpacity = this._lastRenderedPlateOpacity;
    const src = this._dom.mainImg.src;
    if (currentOpacity <= 0.015 || !src || !this._currentRect) {
      return;
    }

    const { x, y, width, height } = this._currentRect;
    const df = this._dom.departingFrame;
    const di = this._dom.departingImg;
    di.src = src;
    df.style.left = `${x}px`;
    df.style.top = `${y}px`;
    df.style.width = `${width}px`;
    df.style.height = `${height}px`;
    df.style.clipPath = this._dom.clipViewport.style.clipPath || 'none';
    df.style.display = 'block';
    df.style.opacity = String(clamp(currentOpacity, 0, 1));

    this._departingPlate = {
      startOpacity: clamp(currentOpacity, 0, 1),
      elapsed: 0,
      duration: Math.max(0.12, durationSec),
    };
  }

  _clearDepartingPlateImmediate() {
    this._departingPlate = null;
    if (this._dom?.departingFrame) {
      this._dom.departingFrame.style.opacity = '0';
      this._dom.departingFrame.style.display = 'none';
    }
  }

  startTimelapse({ loop = true } = {}) {
    const validIds = CHAMP_DE_MARS_TIMELAPSE_IDS.filter((id) => this._portalById.has(id));
    if (validIds.length < 2) return;

    let startIdx = validIds.indexOf(this._activePortalId);
    if (startIdx < 0 || startIdx >= validIds.length - 1) {
      startIdx = 0;
    }

    const firstId = validIds[startIdx];
    this._cancelPendingStates(true);
    this._timelapse = {
      playing: true,
      loop: Boolean(loop),
      ids: validIds,
      currentIndex: startIdx,
      phase: 'entering',
      timer: 0,
      fromPortal: null,
      toPortal: this._portalById.get(firstId),
    };

    for (const id of validIds) {
      const p = this._portalById.get(id);
      if (p) this._loadFullImage(p.photoId, p.imageUrl).catch(() => {});
    }

    if (this.onTimelapseChange) this.onTimelapseChange(true);

    const immediateEnter = this._activePortalId === firstId;
    this._enterPortalInternal(firstId, {
      immediate: immediateEnter,
      blend: this._blend > 0.05 ? this._blend : 0.68,
      preserveTimelapse: true,
    }).then(() => {
      if (this._timelapse && this._timelapse.playing) {
        this._timelapse.phase = 'hold';
        this._timelapse.timer = 0;
      }
    });
  }

  stopTimelapse() {
    if (!this._timelapse) return;
    const wasPlaying = this._timelapse.playing;
    const snapId = this._activePortalId;
    this._timelapse = null;

    if (this._dom?.outgoingImg) {
      this._dom.outgoingImg.style.opacity = '0';
      this._dom.outgoingImg.style.display = 'none';
    }

    if (snapId && this._portalById.has(snapId)) {
      const portal = this._portalById.get(snapId);
      this._applyLockedPortalCamera(portal.camEntry);
      this._syncOverlayVisuals(1.0);
    }

    if (wasPlaying && this.onTimelapseChange) {
      this.onTimelapseChange(false);
    }
  }

  async enterPortal(
    photoId,
    { immediate = false, blend = 0.62, duration = FLIGHT_DURATION_SEC, skipStepCallback = false } = {}
  ) {
    if (this._timelapse) {
      this.stopTimelapse();
    }
    return this._enterPortalInternal(photoId, {
      immediate,
      blend,
      duration,
      skipStepCallback,
      preserveTimelapse: false,
    });
  }

  async _enterPortalInternal(
    photoId,
    {
      immediate = false,
      blend = 0.62,
      duration = FLIGHT_DURATION_SEC,
      skipStepCallback = false,
      preserveTimelapse = false,
    } = {}
  ) {
    const id = normalizePhotoId(photoId);
    const portal = this._portalById.get(id);
    if (!portal) {
      throw new Error(`Unknown photo portal id: ${id}`);
    }

    if (!preserveTimelapse && this._timelapse) {
      this.stopTimelapse();
    }

    this._refreshViewportSize();

    // If smoothly transitioning away from a different visible portal, cross-dissolve departing plate cleanly
    const prevPortalId = this._activePortalId;
    if (!immediate && prevPortalId && prevPortalId !== id) {
      this._snapshotDepartingPlate(DEPARTING_DISSOLVE_SEC);
    } else if (immediate) {
      this._clearDepartingPlateImmediate();
    }

    this._cancelPendingStates(true);
    this._releasingCutawayId = null;

    if (!prevPortalId && Number.isFinite(this.camera.fov)) {
      this._savedFreeFov = clamp(this.camera.fov, 28, 65);
    }

    if (Number.isFinite(Number(blend))) {
      this._blend = clamp(Number(blend), 0.0, 1.0);
    }

    this._pinnedContainer.visible = false;
    this._activePortalId = id;
    this._hoveredPortalId = null;
    if (this.domCanvas) this.domCanvas.style.cursor = '';
    this._updateStationVisibilities();

    if (this.controls) {
      this.controls.enabled = false;
      flushOrbitControlsMomentum(this.controls, { spherical: true, pan: true, scale: true });
    }

    // Show fast 320px thumbnail immediately if full-res is still decoding so there is zero blank flash
    if (this._dom?.mainImg && prevPortalId !== id) {
      if (this._decodedImages.has(id)) {
        this._dom.mainImg.src = this._decodedImages.get(id).src;
      } else if (portal.thumbnailUrl) {
        this._dom.mainImg.src = portal.thumbnailUrl;
      }
    }

    const imgPromise = this._loadFullImage(portal.photoId, portal.imageUrl).catch(() => null);

    if (immediate) {
      this.opticalRig.cancel();
      const img = await imgPromise;
      if (this._activePortalId !== id) return portal;
      if (this._dom?.mainImg && img) {
        if (this._dom.mainImg.src !== img.src) {
          this._dom.mainImg.src = img.src;
        }
        if (!this._dom.mainImg.complete && typeof this._dom.mainImg.decode === 'function') {
          await this._dom.mainImg.decode().catch(() => {});
        }
      }
      if (this._dom?.outgoingImg) {
        this._dom.outgoingImg.style.opacity = '0';
        this._dom.outgoingImg.style.display = 'none';
      }
      if (!skipStepCallback && this.onStepRequest && Number.isFinite(portal.recommendedStep)) {
        this.onStepRequest(portal.recommendedStep, portal);
      }
      this._applyLockedPortalCamera(portal.camEntry);
      this.syncPortalCutaway();
      this._flight = null;
      this._syncOverlayVisuals(1.0);
      if (this.onSelectPortal) this.onSelectPortal(portal);
      return portal;
    }

    imgPromise.then((img) => {
      if (this._activePortalId === id && this._dom?.mainImg && img && this._dom.mainImg.src !== img.src) {
        this._dom.mainImg.src = img.src;
      }
    });

    if (this._dom?.outgoingImg) {
      this._dom.outgoingImg.style.opacity = '0';
      this._dom.outgoingImg.style.display = 'none';
    }

    if (!skipStepCallback && this.onStepRequest && Number.isFinite(portal.recommendedStep)) {
      this.onStepRequest(portal.recommendedStep, portal);
    }

    this._releasingCutawayId = null;
    this.syncPortalCutaway();

    const endPortalState = this._computePortalOpticalState(portal.camEntry);
    const endCanonical = this.opticalRig.portalStateToCanonical(
      endPortalState,
      this._vpWidth,
      this._vpHeight
    );

    const startRect = this._currentRect ? { ...this._currentRect } : { ...endPortalState.rect };
    this._currentRect = { ...endPortalState.rect };

    // If re-locking onto the SAME portal at nearly identical camera position (< 0.25m), fade plate directly
    const camDistToPortal = Math.hypot(
      this.camera.position.x - endPortalState.position[0],
      this.camera.position.y - endPortalState.position[1],
      this.camera.position.z - endPortalState.position[2]
    );
    const initialReveal = prevPortalId === id && camDistToPortal < 0.25 ? 1.0 : 0.0;
    this._syncOverlayVisuals(initialReveal);

    if (this.onSelectPortal) this.onSelectPortal(portal);

    const flightDur = Math.max(0.25, Number(duration) || FLIGHT_DURATION_SEC);

    return new Promise((resolve) => {
      const flightRecord = {
        portal,
        rawT: 0,
        duration: flightDur,
        resolve,
      };
      this._flight = flightRecord;

      this.opticalRig.beginFlight({
        endCanonical,
        vpWidth: this._vpWidth,
        vpHeight: this._vpHeight,
        durationSec: flightDur,
        kind: prevPortalId ? `portal_${prevPortalId}_to_${id}` : `free_to_portal_${id}`,
        startRect,
        endRect: endPortalState.rect,
        onProgress: ({ rawT, rect }) => {
          if (this._flight !== flightRecord) return;
          flightRecord.rawT = rawT;
          if (this._releasingCutawayId && rawT >= 0.36) {
            this._releasingCutawayId = null;
          }
          this.syncPortalCutaway();
          if (rect) {
            this._currentRect = { ...rect };
          }
          const reveal = initialReveal > 0.5 ? 1.0 : this._computeFlightPlateReveal(rawT);
          this._syncOverlayVisuals(reveal);
        },
        onComplete: () => {
          if (this._flight !== flightRecord) return;
          this._flight = null;
          this._releasingCutawayId = null;
          this._applyLockedPortalCamera(portal.camEntry);
          this.syncPortalCutaway();
          this._syncOverlayVisuals(1.0);
          resolve(portal);
        },
      });
    });
  }

  /**
   * Jump-free optical transition from ANY current state (locked rising-front portal, mid-flight,
   * or free-orbit) directly to a symmetric 3D camera pose (e.g. Stop 11 Hero 3D Model Showcase).
   */
  async flyToFreeCamera({ position, target, fov = 42.0, duration = 1.45, immediate = false } = {}) {
    if (this._timelapse) {
      this.stopTimelapse();
    }
    this._refreshViewportSize();

    const W_vp = Math.max(1, this._vpWidth);
    const H_vp = Math.max(1, this._vpHeight);

    const endPos =
      Array.isArray(position) && position.length === 3
        ? [Number(position[0]), Number(position[1]), Number(position[2])]
        : [this.camera.position.x, this.camera.position.y, this.camera.position.z];
    const endTarget =
      Array.isArray(target) && target.length === 3
        ? [Number(target[0]), Number(target[1]), Number(target[2])]
        : [0, 134, 0];
    const endFov = clamp(Number.isFinite(Number(fov)) ? Number(fov) : 42.0, 14, 95);

    const prevPortalId = this._activePortalId;
    const prevPortal = prevPortalId ? this._portalById.get(prevPortalId) : null;

    if (!immediate && this._lastRenderedPlateOpacity > 0.015) {
      this._snapshotDepartingPlate(DEPARTING_DISSOLVE_SEC);
    } else if (immediate) {
      this._clearDepartingPlateImmediate();
    }

    this._cancelPendingStates(true);
    this.clearPinned3D();

    const endCanonical = this.opticalRig.freePoseToCanonical({
      position: endPos,
      target: endTarget,
      fov: endFov,
    });

    if (immediate) {
      this.opticalRig.cancel();
      this._activePortalId = null;
      this._releasingCutawayId = null;
      this.syncPortalCutaway();
      this._currentRect = null;
      this._hideMainOverlayFrame();

      this.camera.clearViewOffset();
      this.camera.position.set(endPos[0], endPos[1], endPos[2]);
      this.camera.quaternion.set(...endCanonical.quaternion);
      this.camera.fov = endFov;
      this.camera.aspect = W_vp / H_vp;
      this.camera.near = 0.45;
      this.camera.far = 4500.0;
      this.camera.up.set(0, 1, 0);
      this.camera.updateMatrixWorld(true);
      this.camera.updateProjectionMatrix();

      if (this.controls) {
        this.controls.target.set(endTarget[0], endTarget[1], endTarget[2]);
        flushOrbitControlsMomentum(this.controls, { spherical: true, pan: true, scale: true });
        this.controls.enabled = true;
        const prevDamp = this.controls.enableDamping;
        this.controls.enableDamping = false;
        this.controls.update();
        this.controls.enableDamping = prevDamp;
      }
      this._updateStationVisibilities();
      if (prevPortal && this.onExitPortal) {
        this.onExitPortal({
          previousPhotoId: prevPortalId,
          portal: prevPortal,
          pinnedIn3D: false,
          reason: 'free-pose',
        });
      }
      return;
    }

    this._activePortalId = null;
    this._releasingCutawayId = null;
    this.syncPortalCutaway();
    this._currentRect = null;
    this._hideMainOverlayFrame();

    if (this.controls) {
      this.controls.enabled = false;
      flushOrbitControlsMomentum(this.controls, { spherical: true, pan: true, scale: true });
    }
    this._updateStationVisibilities();

    const flightDur = Math.max(0.28, Number(duration) || 1.45);

    return new Promise((resolve) => {
      const ffRecord = { resolve };
      this._freeFlight = ffRecord;

      this.opticalRig.beginFlight({
        endCanonical,
        vpWidth: W_vp,
        vpHeight: H_vp,
        durationSec: flightDur,
        kind: prevPortalId ? `portal_${prevPortalId}_to_free` : 'free_to_free',
        onProgress: ({ rawT }) => {
          if (this._freeFlight !== ffRecord) return;
          if (this._releasingCutawayId && rawT >= 0.36) {
            this._releasingCutawayId = null;
            this.syncPortalCutaway();
          }
        },
        onComplete: () => {
          if (this._freeFlight !== ffRecord) return;
          this._freeFlight = null;
          this._releasingCutawayId = null;
          this.syncPortalCutaway();
          const curW = Math.max(1, this._vpWidth);
          const curH = Math.max(1, this._vpHeight);
          this.camera.clearViewOffset();
          this.camera.position.set(endPos[0], endPos[1], endPos[2]);
          this.camera.quaternion.set(...endCanonical.quaternion);
          this.camera.fov = endFov;
          this.camera.aspect = curW / curH;
          this.camera.near = 0.45;
          this.camera.far = 4500.0;
          this.camera.up.set(0, 1, 0);
          this.camera.updateMatrixWorld(true);
          this.camera.updateProjectionMatrix();

          if (this.controls) {
            this.controls.target.set(endTarget[0], endTarget[1], endTarget[2]);
            flushOrbitControlsMomentum(this.controls, { spherical: true, pan: true, scale: true });
            this.controls.enabled = true;
            const prevDamp = this.controls.enableDamping;
            this.controls.enableDamping = false;
            this.controls.update();
            this.controls.enableDamping = prevDamp;
          }
          if (prevPortal && this.onExitPortal) {
            this.onExitPortal({
              previousPhotoId: prevPortalId,
              portal: prevPortal,
              pinnedIn3D: false,
              reason: 'free-pose',
            });
          }
          resolve();
        },
      });
    });
  }

  /**
   * Releases an active portal into constrained 3D free orbit.
   *   - `immediate: false` (default — used on canvas drag-to-orbit & Debug exit):
   *     Starts at `0.000 px` optical delta, dissolves the departing glass plate smoothly
   *     over `0.38 s`, and unshifts rising-front `viewOffset` + FOV + roll over `0.65 s`.
   *   - `immediate: true`: Synchronous release for instant programmatic resets.
   */
  exitPortal({ keepPinnedIn3D = false, reason = 'user', immediate = false } = {}) {
    const prevId = this._activePortalId;
    const prevPortal = prevId ? this._portalById.get(prevId) : null;

    if (this._timelapse) {
      const wasPlaying = this._timelapse.playing;
      this._timelapse = null;
      if (wasPlaying && this.onTimelapseChange) this.onTimelapseChange(false);
    }

    this._refreshViewportSize();

    if (!immediate && this._lastRenderedPlateOpacity > 0.015) {
      this._snapshotDepartingPlate(0.38);
    } else if (immediate) {
      this._clearDepartingPlateImmediate();
    }

    this._cancelPendingStates(true);
    this._activePortalId = null;
    this._currentRect = null;
    this._hideMainOverlayFrame();

    if (keepPinnedIn3D && prevPortal && this._portalsVisible) {
      this._showPinnedInWorld3D(prevPortal);
    } else {
      this.clearPinned3D();
    }
    this._updateStationVisibilities();

    if (immediate) {
      this._releasingCutawayId = null;
      this.syncPortalCutaway();
      const st = this.opticalRig.extractLiveCanonicalState(this._vpWidth, this._vpHeight);
      const aspect = this._vpWidth / Math.max(1, this._vpHeight);
      const settledFov = clamp(this._savedFreeFov || 42.0, 30.0, 52.0);
      this.opticalRig.cancel();
      this.camera.clearViewOffset();
      this.camera.aspect = aspect;
      this.camera.fov = settledFov;
      this.camera.near = 0.45;
      this.camera.far = 4500.0;
      this.camera.up.set(0, 1, 0);
      this.camera.lookAt(st.focalPoint[0], clamp(st.focalPoint[1], 8, 290), st.focalPoint[2]);
      this.camera.updateMatrixWorld(true);
      this.camera.updateProjectionMatrix();

      if (this.controls) {
        this.controls.target.set(
          st.focalPoint[0],
          clamp(st.focalPoint[1], 8, 290),
          st.focalPoint[2]
        );
        flushOrbitControlsMomentum(this.controls, { spherical: true, pan: true, scale: true });
        this.controls.enabled = true;
        const prevDamp = this.controls.enableDamping;
        this.controls.enableDamping = false;
        this.controls.update();
        this.controls.enableDamping = prevDamp;
      }
      if (this.viewportConstraints) {
        this.viewportConstraints.enforce();
      }
    } else {
      this._releasingCutawayId = null;
      this.syncPortalCutaway();
      this.opticalRig.beginOrbitRelease({
        vpWidth: this._vpWidth,
        vpHeight: this._vpHeight,
        durationSec: RELEASE_DURATION_SEC,
        onComplete: () => {
          this._releasingCutawayId = null;
          this.syncPortalCutaway();
        },
      });
    }

    if (prevPortal && this.onExitPortal) {
      this.onExitPortal({
        previousPhotoId: prevId,
        portal: prevPortal,
        pinnedIn3D: Boolean(keepPinnedIn3D && this._portalsVisible),
        reason,
      });
    }
  }

  _hideMainOverlayFrame() {
    this._lastRenderedPlateOpacity = 0.0;
    if (this._dom?.plateFrame) {
      this._dom.plateFrame.style.opacity = '0';
      this._dom.plateFrame.style.display = 'none';
    }
    if (this._dom?.outgoingImg) {
      this._dom.outgoingImg.style.opacity = '0';
      this._dom.outgoingImg.style.display = 'none';
    }
  }

  clearPinned3D() {
    this._pinnedPortalId = null;
    this._pinnedContainer.visible = false;
    while (this._pinnedContainer.children.length > 0) {
      const child = this._pinnedContainer.children.pop();
      this._disposeObject3D(child, false);
    }
    this._pinnedObject = null;
  }

  setActiveStep(step) {
    const s = Number.isFinite(Number(step)) ? clamp(Number(step), 0.0, 11.0) : 11.0;
    this._activeStep = s;
    this._updateStationHighlights();
  }

  setPortalsVisible(visible) {
    this._portalsVisible = Boolean(visible);
    this.portalsGroup.visible = this._portalsVisible;
    if (this._portalsVisible) {
      this._ensurePreviewThumbnailsLoaded();
    }
    this._updateStationVisibilities();
    if (!this._portalsVisible && this.domCanvas && !this._activePortalId) {
      this.domCanvas.style.cursor = '';
    }
  }

  onResize(width, height) {
    if (Number.isFinite(Number(width)) && Number(width) > 0) {
      this._vpWidth = Number(width);
    }
    if (Number.isFinite(Number(height)) && Number(height) > 0) {
      this._vpHeight = Number(height);
    }
    this._refreshViewportSize();

    if (this._timelapse && this._timelapse.playing && this._timelapse.phase === 'glide') {
      const u = smoothstepQuintic(this._timelapse.timer / TIMELAPSE_GLIDE_SEC);
      this._applyTimelapseGlideAt(this._timelapse.fromPortal, this._timelapse.toPortal, u);
      this._syncOverlayVisuals(1.0);
      return;
    }

    if (this._flight) {
      const endState = this._computePortalOpticalState(this._flight.portal.camEntry);
      if (this.opticalRig._flight) {
        this.opticalRig._flight.endCanonical = this.opticalRig.portalStateToCanonical(
          endState,
          this._vpWidth,
          this._vpHeight
        );
        this.opticalRig._flight.endRect = { ...endState.rect };
      }
      this.opticalRig.onResize(this._vpWidth, this._vpHeight);
      this._currentRect = { ...endState.rect };
      this._syncOverlayVisuals(this._computeFlightPlateReveal(this._flight.rawT || 0));
      return;
    }

    if (this.opticalRig.isActive()) {
      this.opticalRig.onResize(this._vpWidth, this._vpHeight);
      return;
    }

    if (this._activePortalId) {
      const portal = this._portalById.get(this._activePortalId);
      if (portal) {
        this._applyLockedPortalCamera(portal.camEntry);
        this._syncOverlayVisuals(1.0);
      }
    }
  }

  update(dt = 0.016) {
    if (this._disposed) return;
    const safeDt = clamp(Number.isFinite(dt) ? dt : 0.016, 0.0, 0.12);

    // 1. Advance frozen-geometry departing plate dissolve (`1 -> 0` over 0.36 s)
    if (this._departingPlate && this._dom?.departingFrame) {
      this._departingPlate.elapsed += safeDt;
      const u = clamp(this._departingPlate.elapsed / this._departingPlate.duration, 0, 1);
      const op = this._departingPlate.startOpacity * (1.0 - smoothstepCubic(u));
      if (u >= 1.0 || op <= 0.003) {
        this._clearDepartingPlateImmediate();
      } else {
        this._dom.departingFrame.style.opacity = String(op.toFixed(4));
      }
    }

    // 2. Advance OpticalCameraRig (portal flights, free-3D flights, rising-front orbit releases)
    if (this.opticalRig.isActive()) {
      this.opticalRig.update(safeDt, this._vpWidth, this._vpHeight);
    }

    // Keep spatial interior cutaway strictly synchronized with live 3D camera position
    this.syncPortalCutaway();

    // 3. Advance Champ-de-Mars 5-plate axial timelapse sequence
    if (
      this._timelapse &&
      this._timelapse.playing &&
      !this._flight &&
      !this._freeFlight &&
      !this.opticalRig.isActive()
    ) {
      this._updateTimelapse(safeDt);
    }

    // 4. Station hover opacity in Debug View
    if (this._portalsVisible) {
      for (const [id, node] of this._stationNodes.entries()) {
        if (!node.group.visible) continue;
        const isHovered = this._hoveredPortalId === id;
        const targetQuadOpacity = isHovered ? 0.96 : node.isStepRelevant ? 0.84 : 0.48;
        node.quadMat.opacity += (targetQuadOpacity - node.quadMat.opacity) * Math.min(1, safeDt * 10);
        const targetLineOpacity = isHovered ? 0.92 : node.isStepRelevant ? 0.72 : 0.34;
        node.frustumMat.opacity += (targetLineOpacity - node.frustumMat.opacity) * Math.min(1, safeDt * 10);
      }
    }
  }

  verifyAllPortalsProjection() {
    const { THREE } = this;
    const W_vp = Math.max(1, this._vpWidth);
    const H_vp = Math.max(1, this._vpHeight);
    const probeCam = new THREE.PerspectiveCamera(45, W_vp / H_vp, 0.45, 4500.0);
    const rows = [];

    for (const portal of this._portals) {
      const { camEntry, photoId, recommendedStep } = portal;
      const state = this._computePortalOpticalState(camEntry);
      probeCam.position.set(...state.position);
      probeCam.quaternion.set(...state.quaternion);
      probeCam.fov = state.fov;
      probeCam.aspect = state.fullWidth / state.fullHeight;
      probeCam.near = state.near;
      probeCam.far = state.far;
      probeCam.setViewOffset(
        state.fullWidth,
        state.fullHeight,
        state.offsetX,
        state.offsetY,
        state.subWidth,
        state.subHeight
      );
      probeCam.updateMatrixWorld(true);
      probeCam.updateProjectionMatrix();

      const [W_img, H_img] = camEntry.image_size_px;
      const { x: xRect, y: yRect, width: wRect, height: hRect } = state.rect;
      const landmarks = camEntry.landmarks_reprojection || [];
      let sumSqObs = 0;
      let sumSqRef = 0;

      for (const lm of landmarks) {
        const [wx, wy, wz] = lm.world_xyz_m;
        this._tmpVec3.set(wx, wy, wz).project(probeCam);
        const screenX = (this._tmpVec3.x * 0.5 + 0.5) * W_vp;
        const screenY = (0.5 - this._tmpVec3.y * 0.5) * H_vp;
        const uImg = ((screenX - xRect) / wRect) * W_img;
        const vImg = ((screenY - yRect) / hRect) * H_img;

        const dxObs = uImg - lm.observed_px[0];
        const dyObs = vImg - lm.observed_px[1];
        sumSqObs += dxObs * dxObs + dyObs * dyObs;

        const dxRef = uImg - lm.projected_px[0];
        const dyRef = vImg - lm.projected_px[1];
        sumSqRef += dxRef * dxRef + dyRef * dyRef;
      }
      const n = Math.max(1, landmarks.length);
      rows.push({
        id: photoId,
        photoId,
        step: recommendedStep,
        era: '1887–89',
        numLandmarks: landmarks.length,
        rmsePx: Math.sqrt(sumSqObs / n),
        rmseVsObservedPx: Math.sqrt(sumSqObs / n),
        rmseVsCatalogProjectedPx: Math.sqrt(sumSqRef / n),
        catalogRmsePx: camEntry.reprojection_rmse_px,
      });
    }
    return rows;
  }

  verifyPortalProjection(photoId = undefined) {
    const targetId = photoId !== undefined ? photoId : this._activePortalId;
    if (!targetId) {
      const portals = this.verifyAllPortalsProjection();
      const meanRmsePx =
        portals.length > 0
          ? portals.reduce((acc, r) => acc + r.rmseVsObservedPx, 0) / portals.length
          : 0;
      return { portals, meanRmsePx };
    }
    const portal = this._portalById.get(normalizePhotoId(targetId));
    if (!portal || !this._currentRect) {
      if (photoId === undefined) {
        return { portals: this.verifyAllPortalsProjection() };
      }
      return null;
    }

    const { camEntry } = portal;
    const [W_img, H_img] = camEntry.image_size_px;
    const W_vp = this._vpWidth;
    const H_vp = this._vpHeight;
    const { x: xRect, y: yRect, width: wRect, height: hRect } = this._currentRect;

    this.camera.updateMatrixWorld(true);
    this.camera.updateProjectionMatrix();

    const landmarks = camEntry.landmarks_reprojection || [];
    let sumSqObs = 0;
    let sumSqRefProj = 0;
    let maxDiffFromRefProjPx = 0;

    for (const lm of landmarks) {
      const [wx, wy, wz] = lm.world_xyz_m;
      this._tmpVec3.set(wx, wy, wz).project(this.camera);
      const screenX = (this._tmpVec3.x * 0.5 + 0.5) * W_vp;
      const screenY = (0.5 - this._tmpVec3.y * 0.5) * H_vp;

      const uImg = ((screenX - xRect) / wRect) * W_img;
      const vImg = ((screenY - yRect) / hRect) * H_img;

      const dxObs = uImg - lm.observed_px[0];
      const dyObs = vImg - lm.observed_px[1];
      sumSqObs += dxObs * dxObs + dyObs * dyObs;

      const dxRef = uImg - lm.projected_px[0];
      const dyRef = vImg - lm.projected_px[1];
      const diffRef = Math.hypot(dxRef, dyRef);
      sumSqRefProj += dxRef * dxRef + dyRef * dyRef;
      if (diffRef > maxDiffFromRefProjPx) maxDiffFromRefProjPx = diffRef;
    }

    const n = Math.max(1, landmarks.length);
    const result = {
      photoId: portal.photoId,
      viewport: [W_vp, H_vp],
      rect: { xRect, yRect, wRect, hRect },
      numLandmarks: landmarks.length,
      rmseVsObservedPx: Math.sqrt(sumSqObs / n),
      catalogRmsePx: camEntry.reprojection_rmse_px,
      rmseVsCatalogProjectedPx: Math.sqrt(sumSqRefProj / n),
      maxDiffFromCatalogProjectedPx: maxDiffFromRefProjPx,
    };
    if (photoId === undefined) {
      result.portals = this.verifyAllPortalsProjection();
    }
    return result;
  }

  dispose() {
    this._disposed = true;
    this.stopTimelapse();
    this._cancelPendingStates(true);
    this.opticalRig.cancel();
    this._unbindCanvasEvents();
    this.clearPinned3D();

    for (const [, tex] of this._pinnedTexCache) {
      tex.dispose();
    }
    this._pinnedTexCache.clear();

    for (const [, node] of this._stationNodes) {
      if (node.previewTexture && node.previewTexture !== this._sharedPlaceholderTex) {
        node.previewTexture.dispose();
      }
    }
    this._stationNodes.clear();
    if (this._sharedPlaceholderTex) {
      this._sharedPlaceholderTex.dispose();
      this._sharedPlaceholderTex = null;
    }

    this._disposeObject3D(this.portalsGroup, true);
    if (this.portalsGroup.parent) {
      this.portalsGroup.parent.remove(this.portalsGroup);
    }

    if (this._dom?.root && this._dom.root.parentNode) {
      this._dom.root.parentNode.removeChild(this._dom.root);
    }
  }

  // ===========================================================================
  // Internal — Exact PnP View-Offset Projection Math
  // ===========================================================================

  _refreshViewportSize() {
    const cw = this.domCanvas?.clientWidth || 0;
    const ch = this.domCanvas?.clientHeight || 0;
    if (cw > 0 && ch > 0) {
      this._vpWidth = cw;
      this._vpHeight = ch;
    } else if (!this._vpWidth || !this._vpHeight) {
      this._vpWidth = typeof window !== 'undefined' && window.innerWidth ? window.innerWidth : 1440;
      this._vpHeight = typeof window !== 'undefined' && window.innerHeight ? window.innerHeight : 900;
    }
  }

  _getNormalizedViewOffset(camEntry) {
    const [W_img, H_img] = camEntry.image_size_px;
    const vo = camEntry.view_offset;
    if (vo && vo.enabled) {
      return {
        fullWidth: vo.fullWidth,
        fullHeight: vo.fullHeight,
        offsetX: vo.offsetX,
        offsetY: vo.offsetY,
        width: vo.width,
        height: vo.height,
      };
    }
    return {
      fullWidth: W_img,
      fullHeight: H_img,
      offsetX: 0,
      offsetY: 0,
      width: W_img,
      height: H_img,
    };
  }

  _computeCenteredPlateRect(camEntry) {
    const [W_img, H_img] = camEntry.image_size_px;
    const W_vp = Math.max(1, this._vpWidth);
    const H_vp = Math.max(1, this._vpHeight);

    const isCompact = W_vp <= 768;
    const imgAspect = W_img / H_img;

    if (isCompact) {
      const topClear = 52;
      const bottomReserved = Math.min(H_vp * 0.37, 308);
      const availH = Math.max(180, H_vp - topClear - bottomReserved);
      const maxW = W_vp * 0.92;
      const maxH = availH;

      let wRect = maxW;
      let hRect = wRect / imgAspect;
      if (hRect > maxH) {
        hRect = maxH;
        wRect = hRect * imgAspect;
      }

      const xRect = (W_vp - wRect) * 0.5;
      const yRect = topClear + (availH - hRect) * 0.38;
      return { x: xRect, y: yRect, width: wRect, height: hRect };
    }

    const maxW = W_vp * 0.83;
    const maxH = H_vp * 0.77;

    let wRect = maxW;
    let hRect = wRect / imgAspect;
    if (hRect > maxH) {
      hRect = maxH;
      wRect = hRect * imgAspect;
    }

    const xRect = (W_vp - wRect) * 0.5;
    const yRect = Math.max(52, (H_vp - hRect - 24) * 0.43);

    return { x: xRect, y: yRect, width: wRect, height: hRect };
  }

  _computePortalOpticalState(camEntry) {
    const W_vp = Math.max(1, this._vpWidth);
    const H_vp = Math.max(1, this._vpHeight);
    const rect = this._computeCenteredPlateRect(camEntry);
    const vo = this._getNormalizedViewOffset(camEntry);
    const s = vo.width / rect.width;
    const rOrigin = Math.hypot(camEntry.position_xyz_m[0], camEntry.position_xyz_m[2]);
    const near = Number.isFinite(Number(camEntry.near_clip_m))
      ? Number(camEntry.near_clip_m)
      : 0.45;
    const far = Number.isFinite(Number(camEntry.far_clip_m))
      ? Math.max(4500.0, Number(camEntry.far_clip_m))
      : Math.max(4500.0, rOrigin + 2400.0);

    return {
      position: [...camEntry.position_xyz_m],
      quaternion: [...camEntry.quaternion_xyzw],
      fov: camEntry.fov_y_deg,
      near,
      far,
      fullWidth: vo.fullWidth,
      fullHeight: vo.fullHeight,
      offsetX: vo.offsetX - rect.x * s,
      offsetY: vo.offsetY - rect.y * s,
      subWidth: W_vp * s,
      subHeight: H_vp * s,
      rect,
    };
  }

  _applyLockedPortalCamera(camEntry) {
    const state = this._computePortalOpticalState(camEntry);
    this._currentRect = { ...state.rect };

    this.camera.position.set(state.position[0], state.position[1], state.position[2]);
    this.camera.quaternion.set(
      state.quaternion[0],
      state.quaternion[1],
      state.quaternion[2],
      state.quaternion[3]
    );
    this.camera.fov = state.fov;
    this.camera.aspect = state.fullWidth / state.fullHeight;
    this.camera.near = state.near;
    this.camera.far = state.far;
    this.camera.setViewOffset(
      state.fullWidth,
      state.fullHeight,
      state.offsetX,
      state.offsetY,
      state.subWidth,
      state.subHeight
    );
    this.camera.updateMatrixWorld(true);
    this.camera.updateProjectionMatrix();
  }

  _applyTimelapseGlideAt(fromPortal, toPortal, u) {
    const W = Math.max(1, this._vpWidth);
    const H = Math.max(1, this._vpHeight);
    const stA = this._computePortalOpticalState(fromPortal.camEntry);
    const stB = this._computePortalOpticalState(toPortal.camEntry);
    const canA = this.opticalRig.portalStateToCanonical(stA, W, H);
    const canB = this.opticalRig.portalStateToCanonical(stB, W, H);

    const pos = [
      canA.position[0] + (canB.position[0] - canA.position[0]) * u,
      canA.position[1] + (canB.position[1] - canA.position[1]) * u,
      canA.position[2] + (canB.position[2] - canA.position[2]) * u,
    ];
    const qA = new this.THREE.Quaternion(...canA.quaternion);
    const qB = new this.THREE.Quaternion(...canB.quaternion);
    qA.slerp(qB, u).normalize();

    const tanHalfY = Math.exp(
      Math.log(Math.max(1e-4, canA.tanHalfY)) * (1 - u) +
        Math.log(Math.max(1e-4, canB.tanHalfY)) * u
    );
    const shiftX = canA.shiftX + (canB.shiftX - canA.shiftX) * u;
    const shiftY = canA.shiftY + (canB.shiftY - canA.shiftY) * u;

    this.opticalRig.applyCanonicalState(
      {
        position: pos,
        quaternion: [qA.x, qA.y, qA.z, qA.w],
        tanHalfY,
        shiftX,
        shiftY,
      },
      W,
      H
    );

    this._currentRect = {
      x: stA.rect.x + (stB.rect.x - stA.rect.x) * u,
      y: stA.rect.y + (stB.rect.y - stA.rect.y) * u,
      width: stA.rect.width + (stB.rect.width - stA.rect.width) * u,
      height: stA.rect.height + (stB.rect.height - stA.rect.height) * u,
    };
  }

  _cancelPendingStates(resolvePending = false) {
    if (this._flight) {
      const pending = this._flight;
      this._flight = null;
      if (resolvePending && pending.resolve) {
        pending.resolve(pending.portal);
      }
    }
    if (this._freeFlight) {
      const pending = this._freeFlight;
      this._freeFlight = null;
      if (resolvePending && pending.resolve) {
        pending.resolve();
      }
    }
  }

  // ===========================================================================
  // Internal — Champ-de-Mars 5-Plate Timelapse Engine
  // ===========================================================================

  _updateTimelapse(dt) {
    const tl = this._timelapse;
    if (!tl || !tl.playing) return;

    tl.timer += dt;

    if (tl.phase === 'hold') {
      const isFinalPlate = tl.currentIndex === tl.ids.length - 1;
      const holdDur = isFinalPlate ? TIMELAPSE_FINAL_HOLD_SEC : TIMELAPSE_HOLD_SEC;
      if (tl.timer < holdDur) return;

      const nextIndex = tl.currentIndex + 1;
      if (nextIndex >= tl.ids.length) {
        if (!tl.loop) {
          this.stopTimelapse();
          return;
        }
        tl.currentIndex = 0;
        tl.phase = 'entering';
        tl.timer = 0;
        this._enterPortalInternal(tl.ids[0], {
          immediate: false,
          blend: this._blend,
          preserveTimelapse: true,
        }).then(() => {
          if (this._timelapse === tl && tl.playing) {
            tl.phase = 'hold';
            tl.timer = 0;
          }
        });
        return;
      }

      const fromPortal = this._portalById.get(tl.ids[tl.currentIndex]);
      const toPortal = this._portalById.get(tl.ids[nextIndex]);
      if (!fromPortal || !toPortal) {
        this.stopTimelapse();
        return;
      }

      tl.fromPortal = fromPortal;
      tl.toPortal = toPortal;
      tl.currentIndex = nextIndex;
      tl.phase = 'glide';
      tl.timer = 0;
      this._activePortalId = toPortal.photoId;
      this._updateStationVisibilities();

      if (this._dom?.outgoingImg && this._dom?.mainImg) {
        this._dom.outgoingImg.src = this._dom.mainImg.src;
        this._dom.outgoingImg.style.display = 'block';
        this._dom.outgoingImg.style.opacity = String(this._blend);
      }

      this._loadFullImage(toPortal.photoId, toPortal.imageUrl)
        .then((img) => {
          if (this._timelapse === tl && this._dom?.mainImg && img) {
            this._dom.mainImg.src = img.src;
          }
        })
        .catch(() => {});

      if (this.onSelectPortal) {
        this.onSelectPortal(toPortal);
      }
      return;
    }

    if (tl.phase === 'glide') {
      const rawU = clamp(tl.timer / TIMELAPSE_GLIDE_SEC, 0.0, 1.0);
      const u = smoothstepQuintic(rawU);

      this._applyTimelapseGlideAt(tl.fromPortal, tl.toPortal, u);

      const stepA = tl.fromPortal.recommendedStep;
      const stepB = tl.toPortal.recommendedStep;
      const interpStep = stepA + (stepB - stepA) * u;
      if (this.onStepRequest) {
        this.onStepRequest(interpStep, tl.toPortal);
      }

      this._syncOverlayVisuals(1.0, {
        incomingWeight: u,
        outgoingWeight: 1.0 - u,
      });

      if (rawU >= 1.0) {
        tl.phase = 'hold';
        tl.timer = 0;
        if (this._dom?.outgoingImg) {
          this._dom.outgoingImg.style.opacity = '0';
          this._dom.outgoingImg.style.display = 'none';
        }
        this._applyLockedPortalCamera(tl.toPortal.camEntry);
        if (this.onStepRequest) {
          this.onStepRequest(tl.toPortal.recommendedStep, tl.toPortal);
        }
        this._syncOverlayVisuals(1.0);
      }
    }
  }

  // ===========================================================================
  // Internal — In-World 3D Frustum Markers (Debug View Only; Zero Emissive/Additive)
  // ===========================================================================

  _computeFrustumBoundsAtDepth(camEntry, depthM) {
    const vo = this._getNormalizedViewOffset(camEntry);
    const halfH = depthM * Math.tan(camEntry.fov_y_deg * 0.5 * DEG2RAD);
    const fullH = 2.0 * halfH;
    const fullW = (vo.fullWidth / vo.fullHeight) * fullH;

    const xLeft = -0.5 * fullW + (vo.offsetX / vo.fullWidth) * fullW;
    const xRight = xLeft + (vo.width / vo.fullWidth) * fullW;
    const yTop = 0.5 * fullH - (vo.offsetY / vo.fullHeight) * fullH;
    const yBottom = yTop - (vo.height / vo.fullHeight) * fullH;

    return { xLeft, xRight, yTop, yBottom, depthM };
  }

  _buildFrustumQuadGeometry(bounds) {
    const { THREE } = this;
    const { xLeft, xRight, yTop, yBottom, depthM } = bounds;
    const z = -depthM;

    const positions = new Float32Array([
      xLeft, yBottom, z,
      xRight, yBottom, z,
      xRight, yTop, z,
      xLeft, yTop, z,
    ]);
    const uvs = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);
    const normals = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]);
    const indices = [0, 1, 2, 0, 2, 3];

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geom.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geom.setIndex(indices);
    geom.computeBoundingSphere();
    return geom;
  }

  _buildBrassPyramidLinesGeometry(bounds, includeInnerMat = true) {
    const { THREE } = this;
    const { xLeft, xRight, yTop, yBottom, depthM } = bounds;
    const z = -depthM;

    const verts = [
      0, 0, 0, xLeft, yBottom, z,
      0, 0, 0, xRight, yBottom, z,
      0, 0, 0, xRight, yTop, z,
      0, 0, 0, xLeft, yTop, z,
      xLeft, yBottom, z, xRight, yBottom, z,
      xRight, yBottom, z, xRight, yTop, z,
      xRight, yTop, z, xLeft, yTop, z,
      xLeft, yTop, z, xLeft, yBottom, z,
    ];

    if (includeInnerMat) {
      const mx = (xRight - xLeft) * 0.045;
      const my = (yTop - yBottom) * 0.045;
      const il = xLeft + mx;
      const ir = xRight - mx;
      const ib = yBottom + my;
      const it = yTop - my;
      const iz = z + 0.004;
      verts.push(
        il, ib, iz, ir, ib, iz,
        ir, ib, iz, ir, it, iz,
        ir, it, iz, il, it, iz,
        il, it, iz, il, ib, iz
      );
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    return geom;
  }

  _createPlaceholderCollodionTexture() {
    if (this._sharedPlaceholderTex) return this._sharedPlaceholderTex;
    const { THREE } = this;
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ddd7cb';
    ctx.fillRect(0, 0, 32, 32);
    const tex = new THREE.CanvasTexture(canvas);
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    this._sharedPlaceholderTex = tex;
    return tex;
  }

  _createStationMarker3D(portal) {
    if (portal?.camEntry?.hide_world_station_marker) {
      return;
    }
    const { THREE } = this;
    const { camEntry, photoId } = portal;

    const unit = this._computeFrustumBoundsAtDepth(camEntry, 1.0);
    const unitWidth = Math.max(0.05, unit.xRight - unit.xLeft);
    const previewDepth = clamp(PREVIEW_WIDTH_M / unitWidth, 1.8, 6.2);
    const bounds = this._computeFrustumBoundsAtDepth(camEntry, previewDepth);

    const group = new THREE.Group();
    group.name = `portal_station_${photoId}`;
    group.position.set(...camEntry.position_xyz_m);
    group.quaternion.set(...camEntry.quaternion_xyzw);

    const frustumGeom = this._buildBrassPyramidLinesGeometry(bounds, true);
    const frustumMat = new THREE.LineBasicMaterial({
      color: ARCHIVE_LINE_HEX,
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
    });
    const frustumLines = new THREE.LineSegments(frustumGeom, frustumMat);
    group.add(frustumLines);

    const worldDownInLocal = new THREE.Vector3(0, -1, 0)
      .applyQuaternion(group.quaternion.clone().invert())
      .multiplyScalar(Math.min(1.6, Math.max(0.6, camEntry.position_xyz_m[1])));
    const stemGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      worldDownInLocal,
    ]);
    const stemMat = new THREE.LineBasicMaterial({
      color: ARCHIVE_DIM_HEX,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    group.add(new THREE.Line(stemGeom, stemMat));

    const placeholderTex = this._createPlaceholderCollodionTexture();
    const quadGeom = this._buildFrustumQuadGeometry(bounds);
    const quadMat = new THREE.MeshStandardMaterial({
      name: `portal_quad_${photoId}`,
      map: placeholderTex,
      color: 0xffffff,
      roughness: 0.92,
      metalness: 0.0,
      transparent: true,
      opacity: 0.84,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const quadMesh = new THREE.Mesh(quadGeom, quadMat);
    quadMesh.userData.portalId = photoId;
    quadMesh.renderOrder = 4;
    group.add(quadMesh);

    this._stationsGroup.add(group);
    this._previewHitMeshes.push(quadMesh);

    this._stationNodes.set(photoId, {
      portal,
      group,
      frustumLines,
      frustumMat,
      quadMesh,
      quadMat,
      previewTexture: placeholderTex,
      isStepRelevant: true,
    });
  }

  async _populatePreviewThumbnail(portal) {
    const node = this._stationNodes.get(portal.photoId);
    if (!node || this._disposed) return;

    let img;
    try {
      img = await this._decodeImageElement(portal.thumbnailUrl);
      portal.thumbnailDataUrl = portal.thumbnailUrl;
    } catch {
      try {
        img = await this._decodeImageElement(portal.imageUrl);
        portal.thumbnailDataUrl = portal.imageUrl;
      } catch {
        return;
      }
    }
    if (this._disposed || !img) return;

    this.onThumbnailReady?.(portal.photoId, portal.thumbnailDataUrl);

    const { THREE } = this;
    const tex = new THREE.Texture(img);
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;

    if (node.previewTexture && node.previewTexture !== this._sharedPlaceholderTex) {
      node.previewTexture.dispose();
    }
    node.previewTexture = tex;
    node.quadMat.map = tex;
    node.quadMat.needsUpdate = true;
  }

  _computePinnedPlaneDistance(camEntry) {
    const [cx, cy, cz] = camEntry.position_xyz_m;
    const lms = camEntry.landmarks_reprojection || [];
    let minDist = Infinity;
    for (const lm of lms) {
      const [wx, wy, wz] = lm.world_xyz_m;
      const d = Math.hypot(wx - cx, wy - cy, wz - cz);
      if (d > 2.0 && d < minDist) minDist = d;
    }
    if (!Number.isFinite(minDist)) {
      return clamp(Math.hypot(cx, cz) * 0.25, 28.0, 58.0);
    }
    return minDist >= 46.0 ? clamp(minDist * 0.22, 28.0, 62.0) : clamp(minDist * 0.68, 9.0, 34.0);
  }

  _showPinnedInWorld3D(portal) {
    this.clearPinned3D();

    const { THREE } = this;
    const { camEntry, photoId } = portal;
    const dPinned = this._computePinnedPlaneDistance(camEntry);
    const bounds = this._computeFrustumBoundsAtDepth(camEntry, dPinned);

    const group = new THREE.Group();
    group.name = `pinned_frustum_${photoId}`;
    group.position.set(...camEntry.position_xyz_m);
    group.quaternion.set(...camEntry.quaternion_xyzw);

    const linesGeom = this._buildBrassPyramidLinesGeometry(bounds, true);
    const linesMat = new THREE.LineBasicMaterial({
      color: ARCHIVE_LINE_HEX,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    const sightlines = new THREE.LineSegments(linesGeom, linesMat);
    sightlines.renderOrder = 5;
    group.add(sightlines);

    const node = this._stationNodes.get(photoId);
    let initialTex = this._pinnedTexCache.get(photoId) || null;
    if (!initialTex && this._decodedImages.has(photoId)) {
      initialTex = this._buildPinnedCanvasTexture(photoId, this._decodedImages.get(photoId));
    }
    if (!initialTex) {
      initialTex = node?.previewTexture || this._createPlaceholderCollodionTexture();
    }

    const quadGeom = this._buildFrustumQuadGeometry(bounds);
    const quadMat = new THREE.MeshStandardMaterial({
      name: `pinned_quad_${photoId}`,
      map: initialTex,
      color: 0xffffff,
      roughness: 0.92,
      metalness: 0.0,
      transparent: true,
      opacity: 0.48,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const quadMesh = new THREE.Mesh(quadGeom, quadMat);
    quadMesh.renderOrder = 6;
    group.add(quadMesh);

    this._pinnedContainer.add(group);
    this._pinnedContainer.visible = this._portalsVisible;
    this._pinnedPortalId = photoId;
    this._pinnedObject = { group, quadMesh, quadMat, sightlines, dPinned, bounds };

    if (!this._pinnedTexCache.has(photoId)) {
      this._loadPinnedTexture(portal).then((hiTex) => {
        if (
          hiTex &&
          !this._disposed &&
          this._pinnedPortalId === photoId &&
          this._pinnedObject?.quadMat === quadMat
        ) {
          quadMat.map = hiTex;
          quadMat.needsUpdate = true;
        }
      });
    }
  }

  _buildPinnedCanvasTexture(photoId, img) {
    if (!img) return null;
    const w0 = img.naturalWidth || img.width || 512;
    const h0 = img.naturalHeight || img.height || 512;
    const scale = Math.min(1, PINNED_TEX_MAX_PX / Math.max(w0, h0));
    const cw = Math.max(32, Math.round(w0 * scale));
    const ch = Math.max(32, Math.round(h0 * scale));

    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, cw, ch);

    const { THREE } = this;
    const tex = new THREE.CanvasTexture(canvas);
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;

    if (this._pinnedTexCache.size >= 4) {
      const oldestKey = this._pinnedTexCache.keys().next().value;
      const oldTex = this._pinnedTexCache.get(oldestKey);
      if (oldTex) oldTex.dispose();
      this._pinnedTexCache.delete(oldestKey);
    }
    this._pinnedTexCache.set(photoId, tex);
    return tex;
  }

  async _loadPinnedTexture(portal) {
    if (this._pinnedTexCache.has(portal.photoId)) {
      return this._pinnedTexCache.get(portal.photoId);
    }
    try {
      const img = await this._loadFullImage(portal.photoId, portal.imageUrl);
      return this._buildPinnedCanvasTexture(portal.photoId, img);
    } catch {
      return null;
    }
  }

  _updateStationHighlights() {
    const s = this._activeStep;
    for (const [, node] of this._stationNodes) {
      const rec = node.portal.recommendedStep;
      const isCompletedBand = s >= 9.2 && rec >= 10.5;
      const isNearStep = Math.abs(rec - s) <= 0.95;
      node.isStepRelevant = isCompletedBand || isNearStep;
      node.frustumMat.color.setHex(node.isStepRelevant ? ARCHIVE_HIGHLIGHT_HEX : ARCHIVE_LINE_HEX);
    }
  }

  _updateStationVisibilities() {
    const inOpticalLock = Boolean(this._activePortalId);
    this._stationsGroup.visible = this._portalsVisible && !inOpticalLock;
    for (const [id, node] of this._stationNodes) {
      node.group.visible = this._portalsVisible && !inOpticalLock && this._activePortalId !== id;
    }
    if (inOpticalLock) {
      this._pinnedContainer.visible = false;
    } else if (this._pinnedObject) {
      this._pinnedContainer.visible = this._portalsVisible;
    }
  }

  // ===========================================================================
  // Internal — Untinted Archival Glass-Plate Overlay + Frozen Departing Layer
  // ===========================================================================

  _buildDomOverlay() {
    if (!this.domOverlayContainer || typeof document === 'undefined') return;

    const root = document.createElement('div');
    root.className = 's3-portal-overlay-root';
    Object.assign(root.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      overflow: 'hidden',
      userSelect: 'none',
      WebkitUserSelect: 'none',
    });

    // Frozen-geometry departing plate frame (eliminates 1-frame cuts & aspect stretch)
    const departingFrame = document.createElement('div');
    departingFrame.className = 's3-portal-departing-frame';
    Object.assign(departingFrame.style, {
      position: 'absolute',
      left: '0px',
      top: '0px',
      width: '0px',
      height: '0px',
      display: 'none',
      opacity: '0',
      overflow: 'hidden',
      pointerEvents: 'none',
      boxSizing: 'border-box',
      borderRadius: '1px',
      boxShadow: '0 0 0 1px rgba(38, 38, 38, 0.20), 0 14px 36px rgba(20, 20, 20, 0.14)',
    });

    const departingImg = document.createElement('img');
    departingImg.className = 's3-portal-img-departing';
    departingImg.alt = '';
    departingImg.draggable = false;
    Object.assign(departingImg.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      objectFit: 'fill',
      display: 'block',
      pointerEvents: 'none',
      filter: 'none',
    });
    departingFrame.appendChild(departingImg);

    const plateFrame = document.createElement('div');
    plateFrame.className = 's3-portal-plate-frame';
    Object.assign(plateFrame.style, {
      position: 'absolute',
      left: '0px',
      top: '0px',
      width: '0px',
      height: '0px',
      display: 'none',
      opacity: '0',
      pointerEvents: 'none',
      boxSizing: 'border-box',
      borderRadius: '1px',
      boxShadow: '0 0 0 1px rgba(38, 38, 38, 0.24), 0 18px 48px rgba(20, 20, 20, 0.18)',
    });

    const clipViewport = document.createElement('div');
    clipViewport.className = 's3-portal-plate-clip';
    Object.assign(clipViewport.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      pointerEvents: 'none',
    });

    const outgoingImg = document.createElement('img');
    outgoingImg.className = 's3-portal-img-outgoing';
    outgoingImg.alt = '';
    outgoingImg.draggable = false;
    Object.assign(outgoingImg.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      objectFit: 'fill',
      display: 'none',
      opacity: '0',
      pointerEvents: 'none',
      filter: 'none',
    });

    const mainImg = document.createElement('img');
    mainImg.className = 's3-portal-img-main';
    mainImg.alt = '';
    mainImg.draggable = false;
    Object.assign(mainImg.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      objectFit: 'fill',
      display: 'block',
      opacity: '0',
      pointerEvents: 'none',
      filter: 'none',
    });

    const glassSheen = document.createElement('div');
    glassSheen.className = 's3-portal-glass-bevel';
    Object.assign(glassSheen.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      boxShadow: 'inset 0 0 0 1px rgba(245, 245, 245, 0.26)',
    });

    clipViewport.appendChild(outgoingImg);
    clipViewport.appendChild(mainImg);
    clipViewport.appendChild(glassSheen);

    // Neutral monochrome vertical wipe curtain divider
    const wipeHit = document.createElement('div');
    wipeHit.className = 's3-portal-wipe-divider';
    Object.assign(wipeHit.style, {
      position: 'absolute',
      top: '-6px',
      bottom: '-6px',
      width: '28px',
      marginLeft: '-14px',
      left: '50%',
      display: 'none',
      pointerEvents: 'auto',
      cursor: 'ew-resize',
      touchAction: 'none',
      zIndex: '5',
    });

    const wipeRule = document.createElement('div');
    Object.assign(wipeRule.style, {
      position: 'absolute',
      top: '6px',
      bottom: '6px',
      left: '50%',
      width: '1px',
      transform: 'translateX(-0.5px)',
      background: 'rgba(245, 245, 245, 0.88)',
      boxShadow: '0 0 4px rgba(28, 28, 28, 0.45)',
    });

    const wipeGrip = document.createElement('div');
    Object.assign(wipeGrip.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: '12px',
      height: '34px',
      transform: 'translate(-50%, -50%)',
      borderRadius: '999px',
      background: '#1c1c1c',
      border: '1px solid #d4d4d4',
      boxShadow: '0 3px 10px rgba(20, 20, 20, 0.35)',
    });

    wipeHit.appendChild(wipeRule);
    wipeHit.appendChild(wipeGrip);

    this._bindWipeDividerEvents(wipeHit, plateFrame);

    plateFrame.appendChild(clipViewport);
    plateFrame.appendChild(wipeHit);
    root.appendChild(departingFrame);
    root.appendChild(plateFrame);
    this.domOverlayContainer.appendChild(root);

    this._dom = {
      root,
      departingFrame,
      departingImg,
      plateFrame,
      clipViewport,
      mainImg,
      outgoingImg,
      wipeHit,
    };
  }

  _bindWipeDividerEvents(wipeHit, plateFrame) {
    const updateFromClientX = (clientX) => {
      const r = plateFrame.getBoundingClientRect();
      if (r.width <= 1) return;
      const u = clamp((clientX - r.left) / r.width, 0.0, 1.0);
      this.setWipe(u);
    };

    wipeHit.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this._wipeDragging = true;
      try {
        wipeHit.setPointerCapture(e.pointerId);
      } catch {
        // Ignore synthetic events
      }
      updateFromClientX(e.clientX);
    });

    wipeHit.addEventListener('pointermove', (e) => {
      if (!this._wipeDragging) return;
      e.stopPropagation();
      e.preventDefault();
      updateFromClientX(e.clientX);
    });

    const stopDrag = (e) => {
      if (!this._wipeDragging) return;
      e.stopPropagation();
      this._wipeDragging = false;
      try {
        wipeHit.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
    };

    wipeHit.addEventListener('pointerup', stopDrag);
    wipeHit.addEventListener('pointercancel', stopDrag);
  }

  _syncOverlayVisuals(flightReveal = 1.0, crossDissolve = null) {
    if (!this._dom || !this._activePortalId || !this._currentRect) return;

    const { plateFrame, clipViewport, mainImg, outgoingImg, wipeHit } = this._dom;
    const { x, y, width, height } = this._currentRect;

    const clampedFrameReveal = clamp(flightReveal, 0.0, 1.0);
    const clampedBlend = clamp(this._blend, 0.0, 1.0);

    const effectiveFrameOpacity = crossDissolve
      ? clampedFrameReveal
      : clampedBlend <= 0.002
        ? 0.0
        : clampedFrameReveal * clampedBlend;
    plateFrame.style.display = 'block';
    plateFrame.style.left = `${x}px`;
    plateFrame.style.top = `${y}px`;
    plateFrame.style.width = `${width}px`;
    plateFrame.style.height = `${height}px`;
    plateFrame.style.opacity = String(effectiveFrameOpacity);

    if (crossDissolve) {
      mainImg.style.opacity = String(clamp(clampedBlend * crossDissolve.incomingWeight, 0.0, 1.0));
      outgoingImg.style.display = 'block';
      outgoingImg.style.opacity = String(
        clamp(clampedBlend * crossDissolve.outgoingWeight, 0.0, 1.0)
      );
      this._lastRenderedPlateOpacity = clampedFrameReveal * clampedBlend;
    } else {
      mainImg.style.opacity = String(clampedBlend);
      this._lastRenderedPlateOpacity = clampedFrameReveal * clampedBlend;
    }

    if (this._wipeSplit !== null && Number.isFinite(this._wipeSplit)) {
      const u = clamp(this._wipeSplit, 0.0, 1.0);
      const rightInsetPct = (1.0 - u) * 100.0;
      clipViewport.style.clipPath = `inset(0 ${rightInsetPct}% 0 0)`;
      clipViewport.style.WebkitClipPath = `inset(0 ${rightInsetPct}% 0 0)`;
      wipeHit.style.display = 'block';
      wipeHit.style.left = `${u * 100.0}%`;
    } else {
      clipViewport.style.clipPath = 'none';
      clipViewport.style.WebkitClipPath = 'none';
      wipeHit.style.display = 'none';
    }
  }

  // ===========================================================================
  // Internal — Pointer Raycasting (Debug View) & Zero-Jump Drag-to-Orbit Release
  // ===========================================================================

  _bindCanvasEvents() {
    if (!this.domCanvas) return;

    this._onCanvasPointerDown = (e) => {
      if (this._wipeDragging) return;
      if (e.button !== undefined && e.button !== 0) return;

      this._pointerState.active = true;
      this._pointerState.pointerId = e.pointerId;
      this._pointerState.startX = e.clientX;
      this._pointerState.startY = e.clientY;
      this._pointerState.lastX = e.clientX;
      this._pointerState.lastY = e.clientY;
      this._pointerState.startTime = performance.now();
      this._pointerState.moved = false;
      this._pointerState.orbitingFromPortal = false;
    };

    this._onCanvasPointerMove = (e) => {
      if (this._wipeDragging) return;

      if (this._pointerState.active && e.pointerId === this._pointerState.pointerId) {
        const totalDist = Math.hypot(
          e.clientX - this._pointerState.startX,
          e.clientY - this._pointerState.startY
        );

        if (totalDist > 6.0) {
          this._pointerState.moved = true;

          if (
            this._allowCanvasDragExit &&
            !this._pointerState.orbitingFromPortal &&
            (this._activePortalId || this._flight || this._timelapse)
          ) {
            this._pointerState.orbitingFromPortal = true;
            // Smooth 0.000 px optical release (`immediate: false`)!
            this.exitPortal({
              keepPinnedIn3D: this._portalsVisible,
              reason: 'orbit-drag',
              immediate: false,
            });
          }
        }

        if (this._pointerState.orbitingFromPortal) {
          const dx = e.clientX - this._pointerState.lastX;
          const dy = e.clientY - this._pointerState.lastY;

          if (this.opticalRig.isReleasing()) {
            // Feed drag delta smoothly into active rising-front release unshift
            this.opticalRig.addReleaseDragDelta(dx, dy);
          } else if (this.controls) {
            // Release already completed during continuous stroke -> continue seamless constrained orbit
            const H = Math.max(300, this._vpHeight || 900);
            const rotScale = (2.0 * Math.PI * 0.62) / H;
            const target = this.controls.target;
            this._tmpVec3.copy(this.camera.position).sub(target);
            this._tmpSpherical.setFromVector3(this._tmpVec3);
            this._tmpSpherical.theta -= dx * rotScale;
            this._tmpSpherical.phi = clamp(this._tmpSpherical.phi - dy * rotScale, 0.32, 2.15);
            this._tmpVec3.setFromSpherical(this._tmpSpherical);
            this.camera.position.copy(target).add(this._tmpVec3);
            this.camera.lookAt(target);
            if (this.viewportConstraints) {
              this.viewportConstraints.enforce();
            }
          }
        }

        this._pointerState.lastX = e.clientX;
        this._pointerState.lastY = e.clientY;
        return;
      }

      if (!this._activePortalId && !this._flight && this._portalsVisible) {
        const hitId = this._raycastPortalAtClientXY(e.clientX, e.clientY);
        if (hitId !== this._hoveredPortalId) {
          this._hoveredPortalId = hitId;
          this.domCanvas.style.cursor = hitId ? 'pointer' : '';
        }
      }
    };

    this._onCanvasPointerUp = (e) => {
      if (!this._pointerState.active || e.pointerId !== this._pointerState.pointerId) return;

      const wasClick =
        !this._pointerState.moved &&
        !this._pointerState.orbitingFromPortal &&
        performance.now() - this._pointerState.startTime < 550;

      this._pointerState.active = false;
      this._pointerState.orbitingFromPortal = false;

      if (wasClick && this._portalsVisible && !this._activePortalId) {
        const hitId = this._raycastPortalAtClientXY(e.clientX, e.clientY);
        if (hitId) {
          this.enterPortal(hitId).catch(() => {});
        }
      }
    };

    this._onCanvasPointerCancel = () => {
      this._pointerState.active = false;
      this._pointerState.orbitingFromPortal = false;
    };

    this.domCanvas.addEventListener('pointerdown', this._onCanvasPointerDown);
    window.addEventListener('pointermove', this._onCanvasPointerMove, { passive: true });
    window.addEventListener('pointerup', this._onCanvasPointerUp, { passive: true });
    window.addEventListener('pointercancel', this._onCanvasPointerCancel, { passive: true });
  }

  _unbindCanvasEvents() {
    if (!this.domCanvas) return;
    if (this._onCanvasPointerDown) {
      this.domCanvas.removeEventListener('pointerdown', this._onCanvasPointerDown);
    }
    if (this._onCanvasPointerMove) {
      window.removeEventListener('pointermove', this._onCanvasPointerMove);
    }
    if (this._onCanvasPointerUp) {
      window.removeEventListener('pointerup', this._onCanvasPointerUp);
    }
    if (this._onCanvasPointerCancel) {
      window.removeEventListener('pointercancel', this._onCanvasPointerCancel);
    }
  }

  _raycastPortalAtClientXY(clientX, clientY) {
    if (!this.domCanvas || !this._portalsVisible || this._previewHitMeshes.length === 0) {
      return null;
    }
    const rect = this.domCanvas.getBoundingClientRect();
    if (rect.width <= 1 || rect.height <= 1) return null;
    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      return null;
    }

    this._ndcPointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this._ndcPointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this._raycaster.setFromCamera(this._ndcPointer, this.camera);
    const visibleTargets = this._previewHitMeshes.filter((m) => {
      const pid = m.userData.portalId;
      const node = this._stationNodes.get(pid);
      return Boolean(node && node.group.visible);
    });

    if (visibleTargets.length === 0) return null;
    const hits = this._raycaster.intersectObjects(visibleTargets, false);
    if (hits.length > 0) {
      return hits[0].object.userData.portalId || null;
    }
    return null;
  }

  // ===========================================================================
  // Internal — Bounded-Memory Image Loader & Disposal
  // ===========================================================================

  _decodeImageElement(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to decode archival plate: ${url}`));
      img.src = url;
    });
  }

  async _loadFullImage(photoId, url) {
    const key = normalizePhotoId(photoId);
    if (this._imageLru.has(key)) {
      const cached = this._imageLru.get(key);
      this._imageLru.delete(key);
      this._imageLru.set(key, cached);
      return cached;
    }

    if (this._preloadedImagePromises.has(key)) {
      const prePromise = this._preloadedImagePromises.get(key);
      this._preloadedImagePromises.delete(key);
      const preImg = await prePromise.catch(() => null);
      if (preImg && (preImg.naturalWidth > 0 || preImg.width > 0)) {
        if (this._imageLru.size >= IMAGE_LRU_MAX) {
          const oldest = this._imageLru.keys().next().value;
          this._imageLru.delete(oldest);
          this._decodedImages.delete(oldest);
        }
        this._decodedImages.set(key, preImg);
        this._imageLru.set(key, Promise.resolve(preImg));
        return preImg;
      }
    }

    const promise = this._decodeImageElement(url);
    if (this._imageLru.size >= IMAGE_LRU_MAX) {
      const oldest = this._imageLru.keys().next().value;
      this._imageLru.delete(oldest);
      this._decodedImages.delete(oldest);
    }
    this._imageLru.set(key, promise);

    try {
      const img = await promise;
      this._decodedImages.set(key, img);
      return img;
    } catch (err) {
      this._imageLru.delete(key);
      this._decodedImages.delete(key);
      throw err;
    }
  }

  _disposeObject3D(root, disposeTextures = false) {
    if (!root) return;
    root.traverse((obj) => {
      if (obj.geometry) {
        obj.geometry.dispose();
      }
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          if (disposeTextures && m.map) m.map.dispose();
          m.dispose();
        }
      }
    });
  }
}
