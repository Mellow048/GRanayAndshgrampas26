import * as THREE from "three";
import { CONFIG, DEFAULT_EPISODE, EPISODE_PRESETS, SET_MAP } from "./config.js";
import {
  loadHouse,
  loadCharacterTemplate,
  instantiateCharacter,
} from "./assetLoader.js";
import { AnimationLibrary } from "./animationLibrary.js";
import { SfxEngine } from "./sfxEngine.js";
import { PlayerCamera } from "./playerCamera.js";
import { ComedyPropManager, ThoughtBubbleCache } from "./comedyProps.js";
import { EpisodeRunner } from "./episodeRunner.js";
import { StudioUI } from "./studioUI.js";

const urlParams = new URLSearchParams(window.location.search);
const isHeadless = urlParams.get("headless") === "1";

const loadingOverlay = document.getElementById("loadingOverlay");
const loadingText = document.getElementById("loadingText");
const loadingBar = document.getElementById("loadingBar");
const stageContainer = document.getElementById("stageContainer");
const fadeOverlay = document.getElementById("fadeOverlay");

function setProgress(pct, label) {
  if (loadingBar) loadingBar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  if (loadingText) loadingText.textContent = label;
}

function setupCartoonLighting(scene) {
  scene.background = new THREE.Color(0x87cefa);
  scene.fog = new THREE.FogExp2(0x9fd8ff, 0.014);

  const hemi = new THREE.HemisphereLight(0xfffbe6, 0x998877, 2.05);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0xfff4e0, 0.98);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff8e7, 1.35);
  sun.position.set(10, 18, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(isHeadless ? 512 : 1024, isHeadless ? 512 : 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 45;
  sun.shadow.camera.left = -12;
  sun.shadow.camera.right = 12;
  sun.shadow.camera.top = 12;
  sun.shadow.camera.bottom = -12;
  sun.shadow.bias = -0.0008;
  scene.add(sun);

  const roomLights = [
    { pos: [0.0, 2.3, -2.5], color: 0xfff1d6, intensity: 1.75, dist: 11 }, // Back Hall
    { pos: [4.8, 2.3, 1.5], color: 0xffeacc, intensity: 1.85, dist: 11 },  // Living Room
    { pos: [-5.2, 2.3, 0.5], color: 0xfff5e0, intensity: 1.85, dist: 11 }, // Kitchen
    { pos: [-0.8, 2.3, 0.2], color: 0xfff0d4, intensity: 1.45, dist: 10 }, // Foyer
    { pos: [-4.2, 4.9, 2.1], color: 0xfff4de, intensity: 1.65, dist: 11 }, // Upstairs Bedroom
  ];

  for (const rl of roomLights) {
    const pt = new THREE.PointLight(rl.color, rl.intensity, rl.dist, 1.15);
    pt.position.set(rl.pos[0], rl.pos[1], rl.pos[2]);
    scene.add(pt);
  }

  const camFill = new THREE.PointLight(0xfff6ea, 2.0, 7.5, 1.1);
  scene.add(camFill);
  return { camFill };
}

function getStageTargetSize(aspectKey) {
  const spec = CONFIG.aspectModes[aspectKey] || CONFIG.aspectModes["16:9"];
  if (isHeadless) {
    return { width: spec.width, height: spec.height };
  }
  const rect = stageContainer.getBoundingClientRect();
  const availW = Math.max(320, rect.width - 16);
  const availH = Math.max(240, rect.height - 16);
  const targetRatio = spec.aspect;
  let w = availW;
  let h = w / targetRatio;
  if (h > availH) {
    h = availH;
    w = h * targetRatio;
  }
  return { width: Math.floor(w), height: Math.floor(h) };
}

async function bootstrap() {
  setProgress(5, "Initializing Three.js POV renderer...");

  const scene = new THREE.Scene();
  const { camFill } = setupCartoonLighting(scene);

  const renderer = new THREE.WebGLRenderer({
    antialias: !isHeadless,
    powerPreference: "high-performance",
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = isHeadless ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.24;
  renderer.autoClear = false;

  const initialSize = getStageTargetSize(CONFIG.defaultAspect);
  renderer.setSize(initialSize.width, initialSize.height, false);
  renderer.domElement.className = "studio-canvas";
  stageContainer.appendChild(renderer.domElement);

  const playerCamera = new PlayerCamera(renderer.domElement);
  scene.add(playerCamera.camera);

  // Dedicated fullscreen fade pass rendered after world + FPS viewmodel
  const fadeScene = new THREE.Scene();
  const fadeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const fadeQuadMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
  });
  const fadeQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), fadeQuadMat);
  fadeScene.add(fadeQuad);

  const comedyProps = new ComedyPropManager(scene, SET_MAP);
  const bubbleCache = new ThoughtBubbleCache();
  const sfxEngine = new SfxEngine();
  const animLib = new AnimationLibrary();

  setProgress(15, "Loading Granny 1 House, Cast & Mixamo templates...");
  const [house, , grannyTemplate, grandpaTemplate] = await Promise.all([
    loadHouse(),
    animLib.loadAllTemplates(),
    loadCharacterTemplate("granny"),
    loadCharacterTemplate("grandpa"),
  ]);

  scene.add(house.root);
  playerCamera.setHouse(house);

  if (!isHeadless) {
    setProgress(70, "Preloading 25 cartoon SFX & BGM...");
    await sfxEngine.preloadAll((done, total) => {
      setProgress(70 + (done / total) * 24, `Loading SFX (${done}/${total})...`);
    });
  }

  setProgress(95, "Retargeting animations for Granny & Grandpa...");
  const grannyClips = animLib.buildClipsForCharacter(grannyTemplate);
  const grandpaClips = animLib.buildClipsForCharacter(grandpaTemplate);
  animLib.disposeSourceTemplates();

  const granny = instantiateCharacter("granny", grannyTemplate, grannyClips, bubbleCache);
  const grandpa = instantiateCharacter("grandpa", grandpaTemplate, grandpaClips, bubbleCache);
  scene.add(granny.root);
  scene.add(grandpa.root);

  const characters = { granny, grandpa };

  const runner = new EpisodeRunner({
    characters,
    playerCamera,
    comedyProps,
    sfxEngine,
    house,
  });

  let ui = null;

  function resizeRenderer(aspectKey = playerCamera.aspectKey) {
    const { width, height } = getStageTargetSize(aspectKey);
    renderer.setSize(width, height, false);
    renderer.domElement.style.width = `${width}px`;
    renderer.domElement.style.height = `${height}px`;
    playerCamera.setAspect(aspectKey);
    playerCamera.camera.aspect = width / height;
    playerCamera.camera.updateProjectionMatrix();
    playerCamera.viewmodelCamera.aspect = width / height;
    playerCamera.viewmodelCamera.updateProjectionMatrix();
  }

  function loadEpisode(epObj) {
    const info = runner.loadEpisode(epObj);
    resizeRenderer(playerCamera.aspectKey);
    ui?.setEpisodeJson(epObj);
    ui?.syncButtons();
    ui?.syncState({
      simTime: runner.simTime,
      duration: runner.duration,
      isPlaying: runner.isPlaying,
      isFinished: runner.isFinished,
    });
    return info;
  }

  if (!isHeadless) {
    ui = new StudioUI({
      runner,
      sfxEngine,
      playerCamera,
      characters,
      renderer,
      onLoadEpisode: loadEpisode,
      onAspectChange: (key) => resizeRenderer(key),
    });

    runner.onStateChange = (st) => ui.syncState(st);
    runner.onFinish = () => {
      ui.syncButtons();
      ui.toast("Episode finished! Hit Play to replay or Edit JSON Skits.");
    };
  }

  window.addEventListener("resize", () => resizeRenderer(playerCamera.aspectKey));

  const heldKeys = new Set();
  window.addEventListener("keydown", (e) => {
    if (
      document.activeElement &&
      ["TEXTAREA", "INPUT", "SELECT"].includes(document.activeElement.tagName)
    ) {
      return;
    }
    heldKeys.add(e.code);
  });
  window.addEventListener("keyup", (e) => heldKeys.delete(e.code));

  const startPresetKey = urlParams.get("preset") || "grandpa_key_pov_44s";
  const initialEp = EPISODE_PRESETS[startPresetKey] || DEFAULT_EPISODE;
  loadEpisode(initialEp);

  if (isHeadless) {
    document.body.classList.add("headless-mode");
  }

  function renderFrame() {
    camFill.position.copy(playerCamera.camera.position);
    camFill.position.y = Math.max(0.8, playerCamera.camera.position.y + 0.1);

    const alpha = playerCamera.fadeAlpha;
    fadeQuadMat.opacity = alpha;
    if (fadeOverlay) {
      fadeOverlay.style.opacity = String(alpha);
    }

    renderer.clear();
    renderer.render(scene, playerCamera.camera);
    if (playerCamera.mode === "pov" && playerCamera.hasHeldProp()) {
      renderer.clearDepth();
      renderer.render(playerCamera.viewmodelScene, playerCamera.viewmodelCamera);
    }
    if (alpha > 0.002) {
      renderer.render(fadeScene, fadeCamera);
    }
  }

  renderFrame();
  setProgress(100, "Ready!");
  setTimeout(() => {
    loadingOverlay?.classList.add("hidden");
  }, 150);

  let lastWall = performance.now();
  let accumulator = 0;

  function animate(now) {
    requestAnimationFrame(animate);
    if (isHeadless) return;

    const frameDt = Math.min(CONFIG.maxFrameDt, (now - lastWall) / 1000);
    lastWall = now;

    if (runner.isPlaying) {
      accumulator += frameDt;
      while (accumulator >= CONFIG.fixedDt) {
        runner.step(CONFIG.fixedDt);
        accumulator -= CONFIG.fixedDt;
      }
    } else if (heldKeys.size > 0 && playerCamera.mode === "pov") {
      const speed = 2.6 * frameDt;
      const forward = new THREE.Vector3(0, 0, -1).applyEuler(
        new THREE.Euler(0, playerCamera.yaw, 0)
      );
      const right = new THREE.Vector3(1, 0, 0).applyEuler(
        new THREE.Euler(0, playerCamera.yaw, 0)
      );
      if (heldKeys.has("KeyW") || heldKeys.has("ArrowUp"))
        playerCamera.playerPos.addScaledVector(forward, speed);
      if (heldKeys.has("KeyS") || heldKeys.has("ArrowDown"))
        playerCamera.playerPos.addScaledVector(forward, -speed);
      if (heldKeys.has("KeyA") || heldKeys.has("ArrowLeft"))
        playerCamera.playerPos.addScaledVector(right, -speed);
      if (heldKeys.has("KeyD") || heldKeys.has("ArrowRight"))
        playerCamera.playerPos.addScaledVector(right, speed);
      if (heldKeys.has("KeyQ")) playerCamera.yaw += 1.6 * frameDt;
      if (heldKeys.has("KeyE")) playerCamera.yaw -= 1.6 * frameDt;
      playerCamera.update(frameDt, runner.resolver);
      ui?.syncState({
        simTime: runner.simTime,
        duration: runner.duration,
        isPlaying: false,
        isFinished: runner.isFinished,
      });
    } else if (playerCamera.mode === "orbit") {
      playerCamera.update(frameDt, runner.resolver);
    }

    renderFrame();
  }
  requestAnimationFrame(animate);

  // -------------------------------------------------------------------------
  // Headless Deterministic Export Hook (used by scripts/export-video.mjs)
  // -------------------------------------------------------------------------
  window.__GRANNY_STUDIO__ = {
    version: "2.0.0-pov",
    ready: true,
    getPresetKeys: () => Object.keys(EPISODE_PRESETS),
    beginHeadlessExport: async ({ episode, pacerEnabled = true, aspectOverride = "" } = {}) => {
      sfxEngine.setPacerEnabled(pacerEnabled);
      sfxEngine.startEventCapture();
      if (episode) {
        runner.loadEpisode(episode);
      } else {
        runner.reset();
      }
      await runner._flushMicrotasks();
      if (aspectOverride && CONFIG.aspectModes[aspectOverride]) {
        resizeRenderer(aspectOverride);
      } else {
        resizeRenderer(playerCamera.aspectKey);
      }
      renderFrame();
      return {
        title: runner.episode?.title || "Granny POV Episode",
        duration: runner.duration,
        aspectKey: playerCamera.aspectKey,
        width: renderer.domElement.width,
        height: renderer.domElement.height,
      };
    },
    advanceExportFrames: async (frameCount, dt) => {
      if (frameCount > 0 && dt > 0) {
        const subSteps = Math.max(1, Math.round(dt / CONFIG.fixedDt));
        const subDt = dt / subSteps;
        for (let f = 0; f < frameCount; f += 1) {
          for (let i = 0; i < subSteps; i += 1) {
            await runner.stepAsync(subDt);
          }
        }
      }
      return {
        simTime: runner.simTime,
        isFinished: runner.isFinished,
      };
    },
    renderExportFrame: async (dt) => {
      if (dt > 0) {
        const subSteps = Math.max(1, Math.round(dt / CONFIG.fixedDt));
        const subDt = dt / subSteps;
        for (let i = 0; i < subSteps; i += 1) {
          await runner.stepAsync(subDt);
        }
      }
      renderFrame();
      return {
        simTime: runner.simTime,
        isFinished: runner.isFinished,
        dataUrl: renderer.domElement.toDataURL("image/jpeg", 0.90),
      };
    },
    finishHeadlessExport: () => {
      return sfxEngine.stopEventCapture(runner.simTime);
    },
  };
}

bootstrap().catch((err) => {
  console.error("[Studio] Fatal boot error:", err);
  window.__GRANNY_STUDIO_ERROR__ = err?.message || String(err);
  setProgress(100, `Error: ${err.message}`);
});
