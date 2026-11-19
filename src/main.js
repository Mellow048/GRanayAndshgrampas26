import * as THREE from "three";
import { CONFIG, DEFAULT_EPISODE, EPISODE_PRESETS, SET_MAP } from "./config.js";
import { loadCharacterTemplate, loadHouse } from "./assetLoader.js";
import { AnimationLibrary } from "./animationLibrary.js";
import { SfxEngine } from "./sfxEngine.js";
import { CameraDirector } from "./cameraDirector.js";
import { EpisodeRunner } from "./episodeRunner.js";
import { StudioUI } from "./studioUI.js";

function setupLighting(scene) {
  const hemi = new THREE.HemisphereLight(0xfff8ef, 0x64748b, 1.85);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0xffffff, 0.9);
  scene.add(ambient);

  const sunKey = new THREE.DirectionalLight(0xfff4e0, 1.15);
  sunKey.position.set(6, 14, 9);
  sunKey.castShadow = true;
  sunKey.shadow.mapSize.set(2048, 2048);
  sunKey.shadow.camera.near = 1;
  sunKey.shadow.camera.far = 35;
  sunKey.shadow.camera.left = -12;
  sunKey.shadow.camera.right = 12;
  sunKey.shadow.camera.top = 12;
  sunKey.shadow.camera.bottom = -12;
  sunKey.shadow.bias = -0.0005;
  scene.add(sunKey);

  // Evenly distributed interior ceiling lights so every indoor room in Granny 1 House is well-lit
  const roomLights = [
    { pos: [0.0, 2.5, -2.6], color: 0xffe8cc, intensity: 7.5, dist: 14 }, // Back room
    { pos: [3.8, 2.5, -1.8], color: 0xffdfb3, intensity: 6.5, dist: 12 }, // East corridor & doorway
    { pos: [5.2, 2.5, 2.8], color: 0xffe4c4, intensity: 7.5, dist: 14 }, // Living room
    { pos: [-5.5, 2.5, 0.8], color: 0xffe8cc, intensity: 7.0, dist: 12 }, // Kitchen
    { pos: [-0.8, 2.5, 0.2], color: 0xffe8cc, intensity: 6.0, dist: 11 }, // Front foyer
  ];
  for (const rl of roomLights) {
    const pt = new THREE.PointLight(rl.color, rl.intensity, rl.dist, 1.2);
    pt.position.set(...rl.pos);
    scene.add(pt);
  }
}

async function bootstrap() {
  const urlParams = new URLSearchParams(window.location.search);
  const isHeadless = urlParams.get("headless") === "1";

  const stageEl = document.getElementById("shortsStage");
  const loadingOverlay = document.getElementById("loadingOverlay");
  const loadingText = document.getElementById("loadingText");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1120);
  scene.fog = new THREE.Fog(0x0b1120, 18, 46);
  setupLighting(scene);

  // Render strictly at 9:16 vertical Shorts HD resolution (720x1280)
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
    preserveDrawingBuffer: isHeadless,
  });
  renderer.setPixelRatio(1);
  renderer.setSize(CONFIG.exportWidth, CONFIG.exportHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.className = "shorts-canvas";
  stageEl.prepend(renderer.domElement);

  const cameraDirector = new CameraDirector(renderer.domElement);
  const sfxEngine = new SfxEngine();
  const animationLibrary = new AnimationLibrary();

  const updateLoading = (msg) => {
    if (loadingText) loadingText.textContent = msg;
  };

  try {
    updateLoading("Loading Granny 1 House & Character Rigs...");
    const preloadTasks = [
      loadHouse(),
      loadCharacterTemplate("granny"),
      loadCharacterTemplate("grandpa"),
      animationLibrary.loadAllTemplates(),
    ];
    if (!isHeadless) {
      preloadTasks.push(sfxEngine.preloadAll());
    }
    const [house, grannyTpl, grandpaTpl] = await Promise.all(preloadTasks);

    scene.add(house.root);
    cameraDirector.setHouse(house);

    const camFill = new THREE.PointLight(0xfff4e6, 2.2, 8, 1.2);
    scene.add(camFill);

    const characterTemplates = new Map([
      ["granny", grannyTpl],
      ["grandpa", grandpaTpl],
    ]);

    updateLoading("Retargeting Mixamo Animation Library...");
    animationLibrary.buildClipsForCharacter(grannyTpl);
    animationLibrary.buildClipsForCharacter(grandpaTpl);
    // Dispose Mixamo source skeletons right after retargeting both characters
    animationLibrary.disposeSourceTemplates();

    let studioUI = null;

    const episodeRunner = new EpisodeRunner({
      scene,
      house,
      characterTemplates,
      animationLibrary,
      sfxEngine,
      cameraDirector,
      waypoints: SET_MAP,
      onCaptionChange: (cap) => studioUI?.updateCaption(cap),
      onTimeUpdate: (t, dur) => studioUI?.updateTime(t, dur),
      onEpisodeEnd: () => {
        studioUI?.syncPlayButton();
        if (studioUI?.isRecording) {
          studioUI.stopRecording();
        }
      },
    });

    studioUI = new StudioUI({
      scene,
      renderer,
      house,
      cameraDirector,
      episodeRunner,
      sfxEngine,
      waypoints: SET_MAP,
      initialEpisode: DEFAULT_EPISODE,
    });

    // Expose deterministic cloud export API for scripts/export-video.mjs (GitHub Actions)
    window.__GRANNY_STUDIO__ = {
      ready: true,
      presets: EPISODE_PRESETS,
      beginHeadlessExport({ episode = DEFAULT_EPISODE, pacerEnabled = true } = {}) {
        episodeRunner.pause();
        cameraDirector.setInspectionMode(false);
        studioUI.setCalibratorEnabled(false);
        sfxEngine.setPacerEnabled(pacerEnabled);
        sfxEngine.startEventCapture();
        episodeRunner.loadEpisode(episode);
        episodeRunner.resetToStart({ emitInitialSfx: true });
        studioUI.syncCameraButtons();
        return {
          title: episode.title || "granny-short",
          duration: episode.duration,
        };
      },
      renderExportFrame(stepDt = 0) {
        if (stepDt > 0 && !episodeRunner.ended) {
          episodeRunner.accumulator += stepDt;
          while (episodeRunner.accumulator >= CONFIG.fixedDt && !episodeRunner.ended) {
            episodeRunner._stepFixed(CONFIG.fixedDt, { silent: false });
            episodeRunner.accumulator -= CONFIG.fixedDt;
          }
          if (episodeRunner.accumulator > 1e-6 && !episodeRunner.ended) {
            episodeRunner._stepFixed(episodeRunner.accumulator, { silent: false });
            episodeRunner.accumulator = 0;
          }
        }
        camFill.position.copy(cameraDirector.camera.position);
        renderer.render(scene, cameraDirector.camera);
        studioUI.captureCompositeFrame(true);
        return {
          simTime: episodeRunner.simTime,
          duration: episodeRunner.episode?.duration || 0,
          ended: episodeRunner.ended,
          dataUrl: studioUI.compositeCanvas.toDataURL("image/png"),
        };
      },
      finishHeadlessExport() {
        return sfxEngine.stopEventCapture();
      },
    };

    episodeRunner.loadEpisode(DEFAULT_EPISODE);
    if (!isHeadless) {
      episodeRunner.play();
    }
    studioUI.syncPlayButton();
    studioUI.syncCameraButtons();
    studioUI.setStatus(
      `Ready — "${DEFAULT_EPISODE.title}" (${sfxEngine.buffers.size} SFX loaded). Click stage to unlock audio.`
    );
    if (loadingOverlay) loadingOverlay.hidden = true;

    if (!isHeadless) {
      // Unlock Web Audio cleanly on first user interaction anywhere in the studio
      const unlockAudio = () => {
        sfxEngine.resume().then(() => {
          studioUI.setStatus(`Audio active — "${episodeRunner.episode?.title || ""}"`);
        }).catch(() => {});
        window.removeEventListener("pointerdown", unlockAudio);
        window.removeEventListener("keydown", unlockAudio);
      };
      window.addEventListener("pointerdown", unlockAudio, { once: true });
      window.addEventListener("keydown", unlockAudio, { once: true });

      let lastNow = performance.now();
      function frameLoop(now) {
        requestAnimationFrame(frameLoop);
        const rawDt = Math.min(CONFIG.maxFrameDt, (now - lastNow) / 1000);
        lastNow = now;

        episodeRunner.update(rawDt);
        camFill.position.copy(cameraDirector.camera.position);
        renderer.render(scene, cameraDirector.camera);
        studioUI.captureCompositeFrame();
      }

      requestAnimationFrame(frameLoop);
    } else {
      camFill.position.copy(cameraDirector.camera.position);
      renderer.render(scene, cameraDirector.camera);
    }
  } catch (err) {
    console.error("[Granny 3D Cartoon Studio] Startup failed:", err);
    window.__GRANNY_STUDIO_ERROR__ = err.message;
    updateLoading(`Startup Error: ${err.message}`);
  }
}

bootstrap();
