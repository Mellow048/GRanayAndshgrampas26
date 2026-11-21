import * as THREE from "three";
import { CONFIG, EPISODE_PRESETS, SET_MAP, SFX_MANIFEST } from "./config.js";
import { resolveSemanticTagAtPoint } from "./assetLoader.js";

/**
 * Interactive Studio UI controller:
 * - Transport bar + Aspect (16:9 / 9:16) + POV / Orbit toggle
 * - Character & Player POV test controls (animations, bubbles, held props, gestures)
 * - 25-clip Soundboard
 * - Waypoint Calibrator (click-to-teleport + live coordinate readout)
 * - Click-to-Tag Spatial Memory Raycaster + brief mesh outline highlight
 * - Live Multi-Skit JSON Editor
 * - Real-time WebM export (MediaRecorder) + Fade-to-black overlay
 */
export class StudioUI {
  constructor({
    runner,
    sfxEngine,
    playerCamera,
    cameraDirector,
    characters,
    renderer,
    scene = null,
    onLoadEpisode,
    onAspectChange,
    onExportStateChange,
  }) {
    this.runner = runner;
    this.sfxEngine = sfxEngine;
    this.playerCamera = playerCamera;
    this.cameraDirector = cameraDirector;
    this.characters = characters;
    this.renderer = renderer;
    this.scene = scene || playerCamera?.scene || null;
    this.onLoadEpisode = onLoadEpisode;
    this.onAspectChange = onAspectChange;
    this.onExportStateChange = onExportStateChange;

    this.isRecording = false;
    this.activeTab = "director";

    this.raycaster = new THREE.Raycaster();
    this._pointerNdc = new THREE.Vector2();
    this._pointerDownPos = null;
    this._tagHighlight = null;
    this.lastSelectedSpatial = null;

    this.els = {
      presetSelect: document.getElementById("presetSelect"),
      playPauseBtn: document.getElementById("playPauseBtn"),
      stopBtn: document.getElementById("stopBtn"),
      timelineSlider: document.getElementById("timelineSlider"),
      timeReadout: document.getElementById("timeReadout"),
      aspectToggleBtn: document.getElementById("aspectToggleBtn"),
      camModeBtn: document.getElementById("camModeBtn"),
      pacerToggleBtn: document.getElementById("pacerToggleBtn"),
      muteBtn: document.getElementById("muteBtn"),
      exportBtn: document.getElementById("exportBtn"),
      panelToggleBtn: document.getElementById("panelToggleBtn"),
      studioPanel: document.getElementById("studioPanel"),
      episodeEditor: document.getElementById("episodeEditor"),
      applyJsonBtn: document.getElementById("applyJsonBtn"),
      soundboardGrid: document.getElementById("soundboardGrid"),
      waypointList: document.getElementById("waypointList"),
      coordReadout: document.getElementById("coordReadout"),
      copyCoordBtn: document.getElementById("copyCoordBtn"),
      spatialMemoryReadout: document.getElementById("spatialMemoryReadout"),
      copyTagBtn: document.getElementById("copyTagBtn"),
      focusTagBtn: document.getElementById("focusTagBtn"),
      walkTagBtn: document.getElementById("walkTagBtn"),
      statusToast: document.getElementById("statusToast"),
      fadeOverlay: document.getElementById("fadeOverlay"),
      stageContainer: document.getElementById("stageContainer"),
    };

    this.bindEvents();
    this.bindCanvasRaycaster();
    this.populatePresets();
    this.populateSoundboard();
    this.populateWaypoints();
    this.syncButtons();
  }

  bindEvents() {
    this.els.playPauseBtn?.addEventListener("click", async () => {
      await this.sfxEngine.resume();
      if (this.runner.isPlaying) {
        this.runner.pause();
      } else {
        this.runner.play();
      }
      this.syncButtons();
    });

    this.els.stopBtn?.addEventListener("click", () => {
      this.runner.stop();
      this.syncButtons();
    });

    this.els.timelineSlider?.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value);
      this.runner.seek(val);
    });

    this.els.presetSelect?.addEventListener("change", (e) => {
      const key = e.target.value;
      const preset = EPISODE_PRESETS[key];
      if (!preset) return;
      this.els.episodeEditor.value = JSON.stringify(preset, null, 2);
      this.onLoadEpisode(preset);
      this.toast(`Loaded "${preset.title}"`);
    });

    this.els.aspectToggleBtn?.addEventListener("click", () => {
      const next =
        this.playerCamera.aspectKey === "16:9" ? "9:16" : "16:9";
      this.playerCamera.setAspect(next);
      this.onAspectChange?.(next);
      this.syncButtons();
      this.toast(`Aspect switched to ${next}`);
    });

    this.els.camModeBtn?.addEventListener("click", () => {
      const nextIsOrbit = this.playerCamera.mode !== "orbit";
      this.playerCamera.setInspectionMode(nextIsOrbit);
      this.syncButtons();
      this.toast(
        nextIsOrbit
          ? "Orbit Calibrator (Drag + Scroll)"
          : "POV Camera (First-Person)"
      );
    });

    this.els.pacerToggleBtn?.addEventListener("click", () => {
      this.sfxEngine.setPacerEnabled(!this.sfxEngine.pacerEnabled);
      this.syncButtons();
      this.toast(
        `Comedy SFX Pacer: ${this.sfxEngine.pacerEnabled ? "ON" : "OFF"}`
      );
    });

    this.els.muteBtn?.addEventListener("click", async () => {
      await this.sfxEngine.resume();
      this.sfxEngine.setMuted(!this.sfxEngine.muted);
      this.syncButtons();
    });

    this.els.panelToggleBtn?.addEventListener("click", () => {
      this.els.studioPanel?.classList.toggle("collapsed");
    });

    // Tab switching
    document.querySelectorAll("[data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.activeTab = btn.dataset.tab;
        document.querySelectorAll("[data-tab]").forEach((b) => {
          b.classList.toggle("active", b.dataset.tab === this.activeTab);
        });
        document.querySelectorAll("[data-tab-panel]").forEach((p) => {
          p.hidden = p.dataset.tabPanel !== this.activeTab;
        });
      });
    });

    // Quick Director buttons
    document.querySelectorAll("[data-char-anim]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await this.sfxEngine.resume();
        const [actorId, animName] = btn.dataset.charAnim.split(":");
        const actor = this.characters[actorId];
        if (!actor) return;
        actor.root.visible = true;
        actor.playAnim(animName, 0.16, null, animName !== "jump" && animName !== "punch");
        this.sfxEngine.notifyAction(animName, this.runner.simTime);
      });
    });

    document.querySelectorAll("[data-char-bubble]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await this.sfxEngine.resume();
        const [actorId, icon] = btn.dataset.charBubble.split(":");
        const actor = this.characters[actorId];
        if (!actor) return;
        actor.showBubble(icon, 2.2);
        this.sfxEngine.notifyBubblePop(icon, this.runner.simTime);
      });
    });

    document.querySelectorAll("[data-player-gesture]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.playerCamera.triggerGesture(btn.dataset.playerGesture, 0.85);
      });
    });

    document.querySelectorAll("[data-player-hold]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await this.sfxEngine.resume();
        const prop = btn.dataset.playerHold || null;
        this.playerCamera.holdProp(prop === "none" ? null : prop);
        if (prop && prop !== "none") {
          this.sfxEngine.notifyPickup(prop, this.runner.simTime);
        }
      });
    });

    document.getElementById("stopBgmBtn")?.addEventListener("click", () => {
      this.sfxEngine.stopBgm(this.runner.simTime);
    });

    this.els.applyJsonBtn?.addEventListener("click", async () => {
      await this.sfxEngine.resume();
      try {
        const parsed = JSON.parse(this.els.episodeEditor.value);
        this.onLoadEpisode(parsed);
        this.runner.play();
        this.toast("Applied & playing custom skit JSON!");
      } catch (err) {
        this.toast(`JSON Error: ${err.message}`, true);
      }
    });

    this.els.copyCoordBtn?.addEventListener("click", async () => {
      const txt = this.els.coordReadout?.textContent || "";
      try {
        await navigator.clipboard.writeText(txt);
        this.toast("Copied waypoint coordinates!");
      } catch {
        this.toast(txt);
      }
    });

    this.els.exportBtn?.addEventListener("click", () => {
      this.exportWebm();
    });

    this.els.copyTagBtn?.addEventListener("click", async () => {
      const tag = this.lastSelectedSpatial?.tag;
      if (!tag) {
        this.toast("Click a 3D object on the canvas first!", true);
        return;
      }
      try {
        await navigator.clipboard.writeText(tag);
        this.toast(`Copied tag "${tag}"`);
      } catch {
        this.toast(`Tag: ${tag}`);
      }
    });

    this.els.focusTagBtn?.addEventListener("click", () => {
      const tag = this.lastSelectedSpatial?.tag;
      if (!tag) {
        this.toast("Click a 3D object on the canvas first!", true);
        return;
      }
      if (this.playerCamera.mode === "orbit") {
        this.playerCamera.setInspectionMode(false);
        this.syncButtons();
      }
      this.playerCamera.lookAt(tag, { duration: 0.3 }, this.runner.resolver);
      this.toast(`Focusing camera on "${tag}"`);
    });

    this.els.walkTagBtn?.addEventListener("click", () => {
      const tag = this.lastSelectedSpatial?.tag;
      if (!tag) {
        this.toast("Click a 3D object on the canvas first!", true);
        return;
      }
      if (this.playerCamera.mode === "orbit") {
        this.playerCamera.setInspectionMode(false);
        this.syncButtons();
      }
      this.playerCamera.startWalk({
        target: tag,
        standoff: 0.8,
        resolver: this.runner.resolver,
      });
      this.toast(`Walking 0.8m from "${tag}" edge`);
    });
  }

  bindCanvasRaycaster() {
    const canvas = this.renderer?.domElement;
    if (!canvas) return;

    canvas.addEventListener("pointerdown", (e) => {
      this._pointerDownPos = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener("pointerup", (e) => {
      if (!this._pointerDownPos || !this.scene) return;
      const moved = Math.hypot(
        e.clientX - this._pointerDownPos.x,
        e.clientY - this._pointerDownPos.y
      );
      this._pointerDownPos = null;
      if (moved > 6) return; // Ignore OrbitControls drags

      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      this._pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this._pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this._pointerNdc, this.playerCamera.camera);
      const intersects = this.raycaster.intersectObjects(this.scene.children, true);
      const hit = intersects.find(
        (item) =>
          item.object?.isMesh &&
          item.object.visible &&
          !item.object.userData?.isTagHighlightHelper &&
          !item.object.userData?.isSemanticAnchor
      );
      if (!hit) return;

      const resolved = resolveSemanticTagAtPoint(hit.object, hit.point);
      if (!resolved) return;

      this.lastSelectedSpatial = {
        ...resolved,
        hitPoint: hit.point.clone(),
      };
      this._showSpatialMemoryReadout(resolved, hit.point);
      this._highlightClickedMesh(hit.object, resolved);
      this.toast(`Spatial Memory: "${resolved.tag}" (${resolved.meshName})`);
    });
  }

  _showSpatialMemoryReadout(resolved, hitPoint) {
    if (!this.els.spatialMemoryReadout) return;
    const center = new THREE.Vector3();
    if (resolved.box && !resolved.box.isEmpty()) {
      resolved.box.getCenter(center);
    } else {
      center.copy(hitPoint);
    }
    this.els.spatialMemoryReadout.innerHTML =
      `<div><strong>Mesh:</strong> ${resolved.meshName}</div>` +
      `<div><strong>Tag:</strong> <span style="color:#38bdf8">${resolved.tag}</span>` +
      (resolved.label && resolved.label !== resolved.tag ? ` (${resolved.label})` : "") +
      `</div>` +
      `<div><strong>Hit:</strong> { "x": ${hitPoint.x.toFixed(2)}, "y": ${hitPoint.y.toFixed(2)}, "z": ${hitPoint.z.toFixed(2)} }</div>` +
      `<div><strong>Center:</strong> { "x": ${center.x.toFixed(2)}, "y": ${center.y.toFixed(2)}, "z": ${center.z.toFixed(2)} }</div>`;
  }

  _clearTagHighlight() {
    if (!this._tagHighlight) return;
    const { helper, mesh, savedEmissives } = this._tagHighlight;
    if (helper && this.scene) {
      this.scene.remove(helper);
      helper.geometry?.dispose?.();
      helper.material?.dispose?.();
    }
    if (mesh && savedEmissives) {
      for (const entry of savedEmissives) {
        if (entry.mat?.emissive) {
          entry.mat.emissive.copy(entry.emissive);
          entry.mat.emissiveIntensity = entry.emissiveIntensity;
        }
      }
    }
    this._tagHighlight = null;
  }

  _highlightClickedMesh(hitMesh, resolved) {
    this._clearTagHighlight();
    if (!this.scene) return;

    const box = resolved.box && !resolved.box.isEmpty()
      ? resolved.box.clone().expandByScalar(0.025)
      : new THREE.Box3().setFromObject(hitMesh).expandByScalar(0.025);

    const helper = new THREE.Box3Helper(box, 0x38bdf8);
    helper.userData.isTagHighlightHelper = true;
    this.scene.add(helper);

    const savedEmissives = [];
    if (!resolved.isSubRegion && hitMesh.material) {
      const mats = Array.isArray(hitMesh.material) ? hitMesh.material : [hitMesh.material];
      for (const mat of mats) {
        if (mat?.emissive) {
          savedEmissives.push({
            mat,
            emissive: mat.emissive.clone(),
            emissiveIntensity: mat.emissiveIntensity ?? 1,
          });
          mat.emissive.setHex(0x38bdf8);
          mat.emissiveIntensity = 0.45;
        }
      }
    }

    this._tagHighlight = {
      helper,
      mesh: hitMesh,
      savedEmissives,
      expiresAt: performance.now() + 1800,
    };
  }

  updateTagHighlight(nowMs = performance.now()) {
    if (this._tagHighlight && nowMs >= this._tagHighlight.expiresAt) {
      this._clearTagHighlight();
    }
  }

  populatePresets() {
    if (!this.els.presetSelect) return;
    this.els.presetSelect.innerHTML = "";
    for (const [key, ep] of Object.entries(EPISODE_PRESETS)) {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = ep.title;
      this.els.presetSelect.appendChild(opt);
    }
    this.els.episodeEditor.value = JSON.stringify(
      EPISODE_PRESETS.grandpa_key_pov_44s,
      null,
      2
    );
  }

  populateSoundboard() {
    if (!this.els.soundboardGrid) return;
    this.els.soundboardGrid.innerHTML = "";
    for (const [key, meta] of Object.entries(SFX_MANIFEST)) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sfx-btn";
      btn.textContent = key;
      btn.title = `${meta.category.toUpperCase()} (${meta.path})`;
      btn.addEventListener("click", async () => {
        await this.sfxEngine.resume();
        if (meta.category === "bgm") {
          this.sfxEngine.playBgm(key, { volume: meta.defaultVolume });
        } else {
          this.sfxEngine.play(key, { cooldown: 0.05 });
        }
      });
      this.els.soundboardGrid.appendChild(btn);
    }
  }

  populateWaypoints() {
    if (!this.els.waypointList) return;
    this.els.waypointList.innerHTML = "";
    for (const [name, wp] of Object.entries(SET_MAP)) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "wp-btn";
      btn.innerHTML = `<strong>${name}</strong><span>(${wp.x.toFixed(1)}, ${wp.y.toFixed(1)}, ${wp.z.toFixed(1)})</span>`;
      btn.addEventListener("click", () => {
        this.playerCamera.reset(wp, null);
        this.playerCamera.orbitControls?.target?.set(wp.x, wp.y + 1.1, wp.z - 1.5);
        this.toast(`Moved to "${name}"`);
      });
      this.els.waypointList.appendChild(btn);
    }
  }

  setEpisodeJson(episode) {
    if (this.els.episodeEditor) {
      this.els.episodeEditor.value = JSON.stringify(episode, null, 2);
    }
  }

  syncState({ simTime, duration, isPlaying }) {
    if (this.els.timelineSlider) {
      this.els.timelineSlider.max = String(Math.max(0.1, duration));
      this.els.timelineSlider.value = String(simTime);
    }
    if (this.els.timeReadout) {
      this.els.timeReadout.textContent = `${simTime.toFixed(1)}s / ${duration.toFixed(1)}s`;
    }
    if (this.els.playPauseBtn) {
      this.els.playPauseBtn.textContent = isPlaying ? "Pause" : "Play";
    }
    if (this.els.fadeOverlay && this.playerCamera) {
      this.els.fadeOverlay.style.opacity = String(this.playerCamera.fadeAlpha);
    }
    if (this.els.coordReadout && this.playerCamera) {
      const p = this.playerCamera.camera.position;
      this.els.coordReadout.textContent = `{ "x": ${p.x.toFixed(2)}, "y": ${(p.y - CONFIG.playerEyeHeight).toFixed(2)}, "z": ${p.z.toFixed(2)} }`;
    }
  }

  syncButtons() {
    if (this.els.aspectToggleBtn) {
      this.els.aspectToggleBtn.textContent = `Aspect: ${this.playerCamera.aspectKey}`;
    }
    if (this.els.camModeBtn) {
      this.els.camModeBtn.textContent =
        this.playerCamera.mode === "pov" ? "Cam: POV" : "Cam: Orbit";
    }
    if (this.els.pacerToggleBtn) {
      this.els.pacerToggleBtn.textContent = `SFX Pacer: ${this.sfxEngine.pacerEnabled ? "ON" : "OFF"}`;
      this.els.pacerToggleBtn.classList.toggle("active", this.sfxEngine.pacerEnabled);
    }
    if (this.els.muteBtn) {
      this.els.muteBtn.textContent = this.sfxEngine.muted ? "Unmute" : "Mute";
    }
  }

  toast(msg, isError = false) {
    if (!this.els.statusToast) return;
    this.els.statusToast.textContent = msg;
    this.els.statusToast.classList.toggle("error", isError);
    this.els.statusToast.classList.add("visible");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this.els.statusToast?.classList.remove("visible");
    }, 2800);
  }

  async exportWebm() {
    if (this.isRecording) return;
    if (!window.MediaRecorder) {
      this.toast("MediaRecorder unsupported — use Cloud Render workflow!", true);
      return;
    }

    await this.sfxEngine.resume();
    this.isRecording = true;
    this.onExportStateChange?.(true);
    this.els.exportBtn.disabled = true;
    this.els.exportBtn.textContent = "Recording...";

    try {
      const canvas = this.renderer.domElement;
      const videoStream = canvas.captureStream(CONFIG.exportFps);
      const audioStream = this.sfxEngine.getMediaStream();
      const combined = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioStream.getAudioTracks(),
      ]);

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm";

      const chunks = [];
      const recorder = new MediaRecorder(combined, {
        mimeType,
        videoBitsPerSecond: 6_000_000,
      });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const donePromise = new Promise((resolve) => {
        recorder.onstop = resolve;
      });

      this.runner.reset();
      recorder.start(250);
      this.runner.play();

      const prevOnFinish = this.runner.onFinish;
      await new Promise((resolve) => {
        this.runner.onFinish = () => {
          prevOnFinish?.();
          resolve();
        };
      });
      this.runner.onFinish = prevOnFinish;

      await new Promise((r) => setTimeout(r, 250));
      recorder.stop();
      await donePromise;

      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "granny-pov-episode.webm";
      a.click();
      URL.revokeObjectURL(url);
      this.toast("Exported granny-pov-episode.webm!");
    } catch (err) {
      this.toast(`Export failed: ${err.message}`, true);
    } finally {
      this.isRecording = false;
      this.onExportStateChange?.(false);
      this.els.exportBtn.disabled = false;
      this.els.exportBtn.textContent = "Record WebM";
    }
  }
}
