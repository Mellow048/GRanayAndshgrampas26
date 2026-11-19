import * as THREE from "three";
import { CONFIG, DEFAULT_EPISODE, SET_MAP } from "./config.js";
import { loadCharacterTemplate, loadHouse } from "./assetLoader.js";
import { AnimationLibrary } from "./animationLibrary.js";
import { SfxEngine } from "./sfxEngine.js";
import { CameraDirector } from "./cameraDirector.js";
import { EpisodeRunner } from "./episodeRunner.js";
import { StudioUI } from "./studioUI.js";

function setupLighting(scene) {
  const hemi = new THREE.HemisphereLight(0xfff4e6, 0x334155, 1.35);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);

  const sunKey = new THREE.DirectionalLight(0xfff1d6, 1.45);
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

  // Warm interior room lights inside Granny 1 House so characters pop cleanly
  const roomLights = [
    { pos: [0.0, 2.55, 2.3], color: 0xffd6a5, intensity: 4.5, dist: 12 }, // Hallway
    { pos: [-5.5, 2.55, 1.4], color: 0xffe8cc, intensity: 4.2, dist: 11 }, // Kitchen
    { pos: [4.2, 2.55, 1.6], color: 0xffdfb3, intensity: 4.2, dist: 11 }, // Living room
  ];
  for (const rl of roomLights) {
    const pt = new THREE.PointLight(rl.color, rl.intensity, rl.dist, 1.4);
    pt.position.set(...rl.pos);
    scene.add(pt);
  }
}

async function bootstrap() {
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
    const [house, grannyTpl, grandpaTpl] = await Promise.all([
      loadHouse(),
      loadCharacterTemplate("granny"),
      loadCharacterTemplate("grandpa"),
      animationLibrary.loadAllTemplates(),
      sfxEngine.preloadAll(),
    ]);

    scene.add(house.root);

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

    episodeRunner.loadEpisode(DEFAULT_EPISODE);
    episodeRunner.play();
    studioUI.syncPlayButton();
    studioUI.syncCameraButtons();
    studioUI.setStatus(
      `Ready — "${DEFAULT_EPISODE.title}" (${sfxEngine.buffers.size} SFX loaded). Click stage to unlock audio.`
    );
    if (loadingOverlay) loadingOverlay.hidden = true;

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
      renderer.render(scene, cameraDirector.camera);
      studioUI.captureCompositeFrame();
    }

    requestAnimationFrame(frameLoop);
  } catch (err) {
    console.error("[Granny 3D Cartoon Studio] Startup failed:", err);
    updateLoading(`Startup Error: ${err.message}`);
  }
}

bootstrap();
