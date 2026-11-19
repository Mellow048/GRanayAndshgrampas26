import * as THREE from "three";
import { CONFIG, EPISODE_PRESETS, SFX_MANIFEST } from "./config.js";

/**
 * Builds and manages the Granny 3D Cartoon Studio UI:
 * - Transport (Play/Pause/Restart/Scrubber/Speed)
 * - Director vs Free Orbit toggle
 * - Waypoint Calibrator (3D markers + floor raycast click + Copy SET_MAP JSON)
 * - Live Episode JSON Editor ("Apply JSON")
 * - SFX Pacer toggle + Quick SFX Test Pad
 * - Record Episode (WebM) combining 9:16 canvas + captions + Web Audio SFX
 */
export class StudioUI {
  constructor({
    scene,
    renderer,
    house,
    cameraDirector,
    episodeRunner,
    sfxEngine,
    waypoints,
    initialEpisode,
  }) {
    this.scene = scene;
    this.renderer = renderer;
    this.house = house;
    this.cameraDirector = cameraDirector;
    this.episodeRunner = episodeRunner;
    this.sfxEngine = sfxEngine;
    this.waypoints = waypoints;

    this.activeCaption = null;
    this.isScrubbing = false;
    this.calibratorEnabled = false;
    this.selectedWaypoint = Object.keys(this.waypoints)[0] || "hallway";
    this.calibratorFloor = "ground"; // "ground" | "upper"

    this.markerGroup = new THREE.Group();
    this.markerGroup.name = "WaypointCalibratorMarkers";
    this.markerGroup.visible = false;
    this.scene.add(this.markerGroup);
    this.markersByKey = new Map();

    this.raycaster = new THREE.Raycaster();
    this.pointerNdc = new THREE.Vector2();
    this.pointerDownPos = { x: 0, y: 0 };

    // WebM Recording state
    this.isRecording = false;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.compositeCanvas = document.createElement("canvas");
    this.compositeCanvas.width = CONFIG.exportWidth;
    this.compositeCanvas.height = CONFIG.exportHeight;
    this.compositeCtx = this.compositeCanvas.getContext("2d");

    this._bindDom();
    this._buildWaypointMarkers();
    this._buildSfxPad();
    this._populateEpisodeEditor(initialEpisode);
  }

  _bindDom() {
    this.els = {
      playPauseBtn: document.getElementById("playPauseBtn"),
      restartBtn: document.getElementById("restartBtn"),
      scrubber: document.getElementById("timelineScrubber"),
      timeReadout: document.getElementById("timeReadout"),
      speedSlider: document.getElementById("speedSlider"),
      speedReadout: document.getElementById("speedReadout"),
      orbitToggleBtn: document.getElementById("orbitToggleBtn"),
      calibratorToggleBtn: document.getElementById("calibratorToggleBtn"),
      calibratorControls: document.getElementById("calibratorControls"),
      waypointSelect: document.getElementById("waypointSelect"),
      floorSelect: document.getElementById("floorSelect"),
      copySetMapBtn: document.getElementById("copySetMapBtn"),
      pacerToggle: document.getElementById("pacerToggle"),
      muteToggle: document.getElementById("muteToggle"),
      recordBtn: document.getElementById("recordBtn"),
      jsonEditor: document.getElementById("episodeJsonInput"),
      presetSelect: document.getElementById("presetSelect"),
      applyJsonBtn: document.getElementById("applyJsonBtn"),
      statusBanner: document.getElementById("statusBanner"),
      sfxPadGrid: document.getElementById("sfxPadGrid"),
      captionOverlay: document.getElementById("captionOverlay"),
      captionSpeaker: document.getElementById("captionSpeaker"),
      captionText: document.getElementById("captionText"),
      loadingOverlay: document.getElementById("loadingOverlay"),
      loadingText: document.getElementById("loadingText"),
    };

    this.els.playPauseBtn.addEventListener("click", async () => {
      await this.sfxEngine.resume();
      if (this.episodeRunner.playing) {
        this.episodeRunner.pause();
      } else {
        this.episodeRunner.play();
      }
      this.syncPlayButton();
    });

    this.els.restartBtn.addEventListener("click", async () => {
      await this.sfxEngine.resume();
      this.episodeRunner.restart({ autoplay: true });
      this.syncPlayButton();
    });

    this.els.scrubber.addEventListener("pointerdown", () => {
      this.isScrubbing = true;
    });
    this.els.scrubber.addEventListener("input", () => {
      const target = parseFloat(this.els.scrubber.value);
      this.episodeRunner.seek(target);
    });
    this.els.scrubber.addEventListener("change", () => {
      this.isScrubbing = false;
    });
    window.addEventListener("pointerup", () => {
      this.isScrubbing = false;
    });

    this.els.speedSlider.addEventListener("input", () => {
      const val = parseFloat(this.els.speedSlider.value);
      this.episodeRunner.setSpeed(val);
      this.els.speedReadout.textContent = `${val.toFixed(2).replace(/\.00$/, "")}x`;
    });

    this.els.orbitToggleBtn.addEventListener("click", () => {
      const nextOrbit = this.cameraDirector.mode !== "orbit";
      if (!nextOrbit && this.calibratorEnabled) {
        this.setCalibratorEnabled(false);
      }
      this.cameraDirector.setInspectionMode(nextOrbit);
      this.syncCameraButtons();
    });

    this.els.calibratorToggleBtn.addEventListener("click", () => {
      this.setCalibratorEnabled(!this.calibratorEnabled);
    });

    this.els.waypointSelect.addEventListener("change", () => {
      this.selectedWaypoint = this.els.waypointSelect.value;
      this._refreshMarkerHighlight();
    });

    this.els.floorSelect.addEventListener("change", () => {
      this.calibratorFloor = this.els.floorSelect.value;
    });

    this.els.copySetMapBtn.addEventListener("click", async () => {
      const formatted = `export const SET_MAP = ${JSON.stringify(this.waypoints, null, 2)};`;
      try {
        await navigator.clipboard.writeText(formatted);
        this.setStatus("Copied calibrated SET_MAP JSON to clipboard!");
      } catch {
        this.els.jsonEditor.value = formatted;
        this.setStatus("Clipboard blocked — printed SET_MAP JSON into editor.");
      }
    });

    this.els.pacerToggle.checked = this.sfxEngine.pacerEnabled;
    this.els.pacerToggle.addEventListener("change", () => {
      this.sfxEngine.setPacerEnabled(this.els.pacerToggle.checked);
    });

    this.els.muteToggle.addEventListener("change", () => {
      this.sfxEngine.setMuted(this.els.muteToggle.checked);
    });

    if (this.els.presetSelect) {
      for (const [key, preset] of Object.entries(EPISODE_PRESETS)) {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = preset.title || key;
        this.els.presetSelect.appendChild(opt);
      }
      this.els.presetSelect.addEventListener("change", async () => {
        await this.sfxEngine.resume();
        const preset = EPISODE_PRESETS[this.els.presetSelect.value];
        if (!preset) return;
        this._populateEpisodeEditor(preset);
        this.episodeRunner.loadEpisode(preset);
        this.episodeRunner.play();
        this.syncPlayButton();
        this.setStatus(`Loaded preset "${preset.title}" (${preset.duration}s)`);
      });
    }

    this.els.applyJsonBtn.addEventListener("click", async () => {
      await this.sfxEngine.resume();
      try {
        const parsed = JSON.parse(this.els.jsonEditor.value);
        this.episodeRunner.loadEpisode(parsed);
        this.episodeRunner.play();
        this.syncPlayButton();
        this.setStatus(`Loaded "${parsed.title || "Untitled Episode"}" (${parsed.duration}s)`);
      } catch (err) {
        this.setStatus(`JSON Error: ${err.message}`, true);
      }
    });

    this.els.recordBtn.addEventListener("click", async () => {
      await this.sfxEngine.resume();
      if (this.isRecording) {
        this.stopRecording();
      } else {
        this.startRecording();
      }
    });

    // Raycast click on canvas for Waypoint Calibrator (distinguish click vs orbit drag)
    const canvas = this.renderer.domElement;
    canvas.addEventListener("pointerdown", (e) => {
      this.pointerDownPos = { x: e.clientX, y: e.clientY };
    });
    canvas.addEventListener("pointerup", (e) => {
      if (!this.calibratorEnabled) return;
      const dragDist = Math.hypot(
        e.clientX - this.pointerDownPos.x,
        e.clientY - this.pointerDownPos.y
      );
      if (dragDist > 5) return;
      this._handleCalibratorFloorClick(e);
    });
  }

  _buildWaypointMarkers() {
    this.els.waypointSelect.innerHTML = "";
    for (const [key, wp] of Object.entries(this.waypoints)) {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = `${key} (${wp.label || key})`;
      this.els.waypointSelect.appendChild(opt);

      const group = new THREE.Group();
      group.position.set(wp.x, wp.y, wp.z);

      const ringGeo = new THREE.RingGeometry(0.22, 0.32, 24);
      ringGeo.rotateX(-Math.PI * 0.5);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 0.02;
      group.add(ring);

      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 1.35, 8),
        new THREE.MeshBasicMaterial({ color: 0xf8fafc })
      );
      pole.position.y = 0.675;
      group.add(pole);

      const labelSprite = this._createLabelSprite(key);
      labelSprite.position.y = 1.55;
      group.add(labelSprite);

      this.markerGroup.add(group);
      this.markersByKey.set(key, { group, ringMat, labelSprite });
    }
    this.els.waypointSelect.value = this.selectedWaypoint;
    this._refreshMarkerHighlight();
  }

  _createLabelSprite(text) {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 64;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(8, 8, 240, 48, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 24px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 128, 33);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, depthTest: false })
    );
    sprite.scale.set(1.15, 0.29, 1);
    return sprite;
  }

  _refreshMarkerHighlight() {
    for (const [key, entry] of this.markersByKey.entries()) {
      const isSelected = key === this.selectedWaypoint;
      entry.ringMat.color.setHex(isSelected ? 0xf97316 : 0x38bdf8);
      entry.group.scale.setScalar(isSelected ? 1.18 : 0.92);
    }
  }

  _handleCalibratorFloorClick(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointerNdc, this.cameraDirector.camera);
    const hits = this.raycaster.intersectObjects(this.house.floorMeshes, false);

    // Filter hits to the requested floor height band so clicks pass cleanly through the roof
    const minY = this.calibratorFloor === "upper" ? 2.1 : -0.6;
    const maxY = this.calibratorFloor === "upper" ? 3.8 : 1.2;
    const hit = hits.find((h) => h.point.y >= minY && h.point.y <= maxY);

    if (!hit) {
      this.setStatus("Click a visible floor surface inside the house.", true);
      return;
    }

    const wp = this.waypoints[this.selectedWaypoint];
    if (!wp) return;

    wp.x = Number(hit.point.x.toFixed(2));
    wp.y = Number(hit.point.y.toFixed(2));
    wp.z = Number(hit.point.z.toFixed(2));

    const marker = this.markersByKey.get(this.selectedWaypoint);
    if (marker) {
      marker.group.position.set(wp.x, wp.y, wp.z);
    }

    this.setStatus(
      `Moved "${this.selectedWaypoint}" → (${wp.x}, ${wp.y}, ${wp.z})`
    );
  }

  setCalibratorEnabled(enabled) {
    this.calibratorEnabled = Boolean(enabled);
    this.markerGroup.visible = this.calibratorEnabled;
    this.els.calibratorControls.hidden = !this.calibratorEnabled;

    if (this.calibratorEnabled) {
      this.cameraDirector.setInspectionMode(true);
    }
    this.syncCameraButtons();
  }

  _buildSfxPad() {
    this.els.sfxPadGrid.innerHTML = "";
    for (const key of Object.keys(SFX_MANIFEST)) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sfx-btn";
      btn.textContent = key.replace(/_/g, " ");
      btn.title = SFX_MANIFEST[key].path;
      btn.addEventListener("click", async () => {
        await this.sfxEngine.resume();
        this.sfxEngine.play(key, { pitchJitter: 0.04, cooldown: 0.05 });
      });
      this.els.sfxPadGrid.appendChild(btn);
    }
  }

  _populateEpisodeEditor(episode) {
    this.els.jsonEditor.value = JSON.stringify(episode, null, 2);
  }

  setLoading(visible, message = "Loading 3D Studio Assets...") {
    this.els.loadingOverlay.hidden = !visible;
    this.els.loadingText.textContent = message;
  }

  setStatus(message, isError = false) {
    this.els.statusBanner.textContent = message;
    this.els.statusBanner.classList.toggle("is-error", isError);
  }

  syncPlayButton() {
    this.els.playPauseBtn.textContent = this.episodeRunner.playing
      ? "Pause"
      : "Play";
  }

  syncCameraButtons() {
    const isOrbit = this.cameraDirector.mode === "orbit";
    this.els.orbitToggleBtn.textContent = isOrbit
      ? "Cam: Free Orbit"
      : "Cam: Director";
    this.els.orbitToggleBtn.classList.toggle("is-active", isOrbit);
    this.els.calibratorToggleBtn.classList.toggle(
      "is-active",
      this.calibratorEnabled
    );
  }

  updateTime(current, duration) {
    const dur = Math.max(0.1, duration || 1);
    if (!this.isScrubbing) {
      this.els.scrubber.max = dur.toFixed(2);
      this.els.scrubber.value = Math.min(dur, current).toFixed(2);
    }
    this.els.timeReadout.textContent = `${current.toFixed(1)}s / ${dur.toFixed(1)}s`;
  }

  updateCaption(captionObj) {
    this.activeCaption = captionObj;
    if (!captionObj) {
      this.els.captionOverlay.hidden = true;
      this.els.captionSpeaker.textContent = "";
      this.els.captionText.textContent = "";
      return;
    }

    this.els.captionOverlay.hidden = false;
    this.els.captionSpeaker.textContent = captionObj.speakerLabel || "";
    this.els.captionText.textContent = captionObj.text || "";
  }

  // ---------------------------------------------------------------------------
  // WebM Video + Audio Export
  // ---------------------------------------------------------------------------
  startRecording() {
    if (typeof MediaRecorder === "undefined") {
      this.setStatus("MediaRecorder is not supported in this browser.", true);
      return;
    }

    if (this.calibratorEnabled) {
      this.setCalibratorEnabled(false);
    }
    this.cameraDirector.setInspectionMode(false);
    this.syncCameraButtons();

    this.recordedChunks = [];
    this.isRecording = true;
    this.els.recordBtn.textContent = "Recording... (Stop)";
    this.els.recordBtn.classList.add("is-recording");

    // Draw initial frame so captureStream has live video pixels immediately
    this.captureCompositeFrame();

    const videoStream = this.compositeCanvas.captureStream(CONFIG.exportFps);
    const audioStream = this.sfxEngine.getMediaStream();
    const combinedTracks = [
      ...videoStream.getVideoTracks(),
      ...audioStream.getAudioTracks(),
    ];
    const combinedStream = new MediaStream(combinedTracks);

    const mimeCandidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    const mimeType = mimeCandidates.find((m) =>
      MediaRecorder.isTypeSupported(m)
    );

    this.mediaRecorder = new MediaRecorder(
      combinedStream,
      mimeType ? { mimeType, videoBitsPerSecond: 4_500_000 } : undefined
    );

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.recordedChunks.push(e.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      const blob = new Blob(this.recordedChunks, {
        type: mimeType || "video/webm",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const slug = (this.episodeRunner.episode?.title || "granny-short")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      a.href = url;
      a.download = `${slug || "granny-short"}.webm`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);

      this.isRecording = false;
      this.els.recordBtn.textContent = "Record Episode (WebM)";
      this.els.recordBtn.classList.remove("is-recording");
      this.setStatus(`Exported ${a.download} (${(blob.size / 1024 / 1024).toFixed(2)} MB)`);
    };

    this.mediaRecorder.start(200);
    this.episodeRunner.restart({ autoplay: true });
    this.syncPlayButton();
    this.setStatus("Recording 9:16 WebM episode with Web Audio SFX...");
  }

  stopRecording() {
    if (!this.isRecording) return;
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
  }

  /**
   * Composites WebGL scene + bold TikTok/Shorts caption onto the 720x1280 export canvas.
   */
  captureCompositeFrame(force = false) {
    if (!this.isRecording && !force) return;
    const ctx = this.compositeCtx;
    const w = this.compositeCanvas.width;
    const h = this.compositeCanvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(this.renderer.domElement, 0, 0, w, h);

    if (this.activeCaption && this.activeCaption.text) {
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Speaker badge
      if (this.activeCaption.speakerLabel) {
        ctx.font = "800 26px ui-sans-serif, system-ui, sans-serif";
        const badgeText = this.activeCaption.speakerLabel.toUpperCase();
        const badgeW = ctx.measureText(badgeText).width + 32;
        ctx.fillStyle = "#f97316";
        ctx.beginPath();
        ctx.roundRect((w - badgeW) * 0.5, h * 0.72 - 22, badgeW, 38, 10);
        ctx.fill();
        ctx.fillStyle = "#0f172a";
        ctx.fillText(badgeText, w * 0.5, h * 0.72 - 2);
      }

      // Wrapped bold outlined Shorts caption
      ctx.font = "900 44px ui-sans-serif, system-ui, sans-serif";
      const words = this.activeCaption.text.toUpperCase().split(/\s+/);
      const lines = [];
      let line = "";
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > w - 84 && line) {
          lines.push(line);
          line = word;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);

      const startY = h * 0.785;
      const lineHeight = 52;
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;
      ctx.lineWidth = 11;
      ctx.strokeStyle = "#090d16";
      ctx.fillStyle = "#fef08a";

      lines.forEach((ln, idx) => {
        const y = startY + idx * lineHeight;
        ctx.strokeText(ln, w * 0.5, y);
        ctx.fillText(ln, w * 0.5, y);
      });

      ctx.restore();
    }
  }
}
