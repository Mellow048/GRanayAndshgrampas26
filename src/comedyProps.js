import * as THREE from "three";

const BUBBLE_ICONS = {
  key: { symbol: "KEY", bg: "#fef08a", accent: "#ca8a04", draw: "key" },
  question: { symbol: "?", bg: "#e0f2fe", accent: "#0284c7", draw: "text" },
  exclamation: { symbol: "!", bg: "#fee2e2", accent: "#dc2626", draw: "text" },
  zzz: { symbol: "ZZZ", bg: "#ede9fe", accent: "#6d28d9", draw: "text" },
  angry: { symbol: "GRR!", bg: "#fecaca", accent: "#b91c1c", draw: "angry" },
  laugh: { symbol: "HAHA", bg: "#fef9c3", accent: "#ea580c", draw: "laugh" },
  food: { symbol: "COOKIE", bg: "#ffedd5", accent: "#c2410c", draw: "cookie" },
  heart: { symbol: "LOVE", bg: "#fce7f3", accent: "#db2777", draw: "heart" },
};

function drawComicBubbleTexture(iconName) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 192;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const spec = BUBBLE_ICONS[iconName] || BUBBLE_ICONS.question;

  ctx.clearRect(0, 0, 256, 192);

  // Comic cloud / speech bubble body
  ctx.fillStyle = spec.bg;
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.roundRect(22, 16, 212, 128, 42);
  ctx.fill();
  ctx.stroke();

  // Thought tail dots
  for (const [cx, cy, r] of [
    [118, 158, 12],
    [104, 178, 7],
  ]) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(128, 80);

  if (spec.draw === "key") {
    // Bold golden key icon
    ctx.fillStyle = "#facc15";
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(-44, 0, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = spec.bg;
    ctx.beginPath();
    ctx.arc(-44, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.roundRect(-20, -8, 86, 16, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(34, 8, 12, 18);
    ctx.strokeRect(34, 8, 12, 18);
    ctx.fillRect(52, 8, 12, 14);
    ctx.strokeRect(52, 8, 12, 14);
  } else if (spec.draw === "angry") {
    // Comic anger vein + furious eyes
    ctx.strokeStyle = "#dc2626";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-42, -22);
    ctx.lineTo(-10, -4);
    ctx.moveTo(42, -22);
    ctx.lineTo(10, -4);
    ctx.stroke();
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(-26, 10, 10, 0, Math.PI * 2);
    ctx.arc(26, 10, 10, 0, Math.PI * 2);
    ctx.fill();
  } else if (spec.draw === "laugh") {
    // Bold icon-first laughing emoji face (no small text)
    ctx.fillStyle = "#facc15";
    ctx.strokeStyle = "#854d0e";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(0, 0, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Happy > < eyes
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-24, -18);
    ctx.lineTo(-10, -10);
    ctx.lineTo(-24, -2);
    ctx.moveTo(24, -18);
    ctx.lineTo(10, -10);
    ctx.lineTo(24, -2);
    ctx.stroke();
    // Big open laughing mouth
    ctx.fillStyle = "#7f1d1d";
    ctx.beginPath();
    ctx.arc(0, 6, 22, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fb7185";
    ctx.beginPath();
    ctx.arc(0, 21, 11, Math.PI, Math.PI * 2);
    ctx.fill();
  } else if (spec.draw === "cookie") {
    ctx.fillStyle = "#d97706";
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(0, 0, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#451a03";
    for (const [cx, cy] of [
      [-14, -12],
      [14, -10],
      [-6, 14],
      [16, 12],
      [0, -2],
    ]) {
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (spec.draw === "heart") {
    ctx.fillStyle = "#ec4899";
    ctx.strokeStyle = "#831843";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, 28);
    ctx.bezierCurveTo(-48, -4, -34, -40, 0, -14);
    ctx.bezierCurveTo(34, -40, 48, -4, 0, 28);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = spec.accent;
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 8;
    ctx.font = "900 72px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeText(spec.symbol, 0, 4);
    ctx.fillText(spec.symbol, 0, 4);
  }

  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Manages cached comic thought-bubble textures and per-character floating sprites.
 */
export class ThoughtBubbleCache {
  constructor() {
    this.textures = new Map();
  }

  getTexture(iconName) {
    if (!this.textures.has(iconName)) {
      const tex = drawComicBubbleTexture(iconName);
      if (tex) this.textures.set(iconName, tex);
    }
    return this.textures.get(iconName) || null;
  }

  dispose() {
    for (const tex of this.textures.values()) {
      tex.dispose();
    }
    this.textures.clear();
  }
}

function makeEmojiFaceTexture(angry = false) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = angry ? "#fb923c" : "#facc15";
  ctx.fillRect(0, 0, 512, 256);

  const drawFaceAt = (cx, cy) => {
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(cx - 48, cy - 22, 16, 0, Math.PI * 2);
    ctx.arc(cx + 48, cy - 22, 16, 0, Math.PI * 2);
    ctx.fill();

    if (angry) {
      ctx.strokeStyle = "#7f1d1d";
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(cx - 70, cy - 52);
      ctx.lineTo(cx - 22, cy - 34);
      ctx.moveTo(cx + 70, cy - 52);
      ctx.lineTo(cx + 22, cy - 34);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy + 48, 36, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(cx - 52, cy - 26, 6, 0, Math.PI * 2);
      ctx.arc(cx + 44, cy - 26, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 12;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(cx, cy + 12, 48, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
  };

  // Mirror emoji face on BOTH front (u=0.5) and back (u=0/1 seam) hemispheres
  drawFaceAt(256, 128);
  drawFaceAt(0, 128);
  drawFaceAt(512, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Builds reusable low-poly cartoon slapstick props (Golden Key, Padlock,
 * Opening Treasure Chest, Emoji Ball, Toy Blaster, Cookie Jar).
 */
export function createPropMesh(propType) {
  const group = new THREE.Group();
  group.name = `Prop_${propType}`;

  switch (propType) {
    case "golden_key": {
      const gold = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        emissive: 0xca8a04,
        emissiveIntensity: 0.35,
        roughness: 0.25,
        metalness: 0.75,
      });
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.022, 10, 20), gold);
      bow.position.set(0, 0.09, 0);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.24, 10), gold);
      shaft.position.set(0, -0.07, 0);
      const tooth1 = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.028, 0.02), gold);
      tooth1.position.set(0.035, -0.14, 0);
      const tooth2 = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.025, 0.02), gold);
      tooth2.position.set(0.03, -0.18, 0);
      group.add(bow, shaft, tooth1, tooth2);
      group.rotation.z = -0.35;
      break;
    }

    case "padlock": {
      const brass = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        roughness: 0.32,
        metalness: 0.65,
      });
      const steel = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.28,
        metalness: 0.8,
      });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.08), brass);
      body.position.y = 0.08;
      const shackle = new THREE.Mesh(
        new THREE.TorusGeometry(0.06, 0.016, 10, 18, Math.PI),
        steel
      );
      shackle.position.y = 0.16;
      shackle.name = "Shackle";
      group.add(body, shackle);
      break;
    }

    case "treasure_chest": {
      const wood = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.65 });
      const gold = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        roughness: 0.3,
        metalness: 0.7,
      });
      const glow = new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xfacc15,
        emissiveIntensity: 0.9,
      });

      const base = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.36, 0.48), wood);
      base.position.y = 0.18;
      base.castShadow = true;
      base.receiveShadow = true;

      const bandL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.38, 0.5), gold);
      bandL.position.set(-0.24, 0.19, 0);
      const bandR = bandL.clone();
      bandR.position.x = 0.24;

      const innerGlow = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.36), glow);
      innerGlow.position.y = 0.36;
      innerGlow.visible = false;
      innerGlow.name = "ChestGlow";

      // Golden confetti/sparkle burst group inside chest
      const sparkles = new THREE.Group();
      sparkles.name = "ChestSparkles";
      sparkles.visible = false;
      const sparkColors = [0xfef08a, 0x38bdf8, 0xf472b6, 0x4ade80];
      for (let i = 0; i < 8; i += 1) {
        const sMat = new THREE.MeshBasicMaterial({
          color: sparkColors[i % sparkColors.length],
        });
        const sMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 0), sMat);
        const angle = (i / 8) * Math.PI * 2;
        sMesh.userData = {
          vx: Math.cos(angle) * 0.65,
          vy: 1.5 + (i % 3) * 0.35,
          vz: Math.sin(angle) * 0.65,
        };
        sMesh.position.set(0, 0.36, 0);
        sparkles.add(sMesh);
      }

      const lidPivot = new THREE.Group();
      lidPivot.name = "ChestLid";
      lidPivot.position.set(0, 0.36, -0.24);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.18, 0.5), wood);
      lid.position.set(0, 0.09, 0.24);
      lid.castShadow = true;
      const lidTrim = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.05, 0.52), gold);
      lidTrim.position.set(0, 0.02, 0.24);
      const lockPlate = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, 0.04), gold);
      lockPlate.position.set(0, 0.0, 0.49);
      lidPivot.add(lid, lidTrim, lockPlate);

      group.add(base, bandL, bandR, innerGlow, sparkles, lidPivot);
      break;
    }

    case "emoji_ball": {
      const tex = makeEmojiFaceTexture(false);
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        color: 0xffffff,
        roughness: 0.3,
      });
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 18), mat);
      sphere.position.y = 0.28;
      sphere.rotation.y = -Math.PI * 0.5;
      sphere.castShadow = true;
      group.add(sphere);
      break;
    }

    case "toy_blaster": {
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 });
      const accentMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.35 });
      const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.34), bodyMat);
      barrel.position.set(0, 0.07, 0);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.07), accentMat);
      grip.position.set(0, -0.02, 0.09);
      grip.rotation.x = 0.25;
      const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.06, 12), accentMat);
      muzzle.rotation.x = Math.PI * 0.5;
      muzzle.position.set(0, 0.07, -0.18);
      group.add(barrel, grip, muzzle);
      break;
    }

    case "cookie_jar":
    default: {
      const jarMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3 });
      const lidMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.35 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.32, 16), jarMat);
      body.position.y = 0.16;
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.06, 16), lidMat);
      lid.position.y = 0.34;
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), lidMat);
      knob.position.y = 0.39;
      group.add(body, lid, knob);
      break;
    }
  }

  return group;
}

/**
 * Manages placed gag props in the scene and drives animations (open, close, bounce, spin, pop_out, hide).
 */
export class ComedyPropManager {
  constructor(scene, waypoints) {
    this.scene = scene;
    this.waypoints = waypoints;
    this.group = new THREE.Group();
    this.group.name = "ComedyProps";
    this.scene.add(this.group);

    this.props = new Map(); // id -> { id, type, mesh, basePos, state }
  }

  loadProps(propDefs = []) {
    this.clear();
    for (const def of propDefs) {
      const mesh = createPropMesh(def.type);
      const wp = this.waypoints[def.spawn];
      const basePos = wp
        ? new THREE.Vector3(wp.x, wp.y + (def.yOffset || 0), wp.z)
        : new THREE.Vector3(0, def.yOffset || 0, 0);

      mesh.position.copy(basePos);
      if (def.rotationY) mesh.rotation.y = def.rotationY;
      if (def.scale) mesh.scale.setScalar(def.scale);
      mesh.visible = def.visible !== false;

      this.group.add(mesh);
      this.props.set(def.id, {
        id: def.id,
        type: def.type,
        mesh,
        basePos: basePos.clone(),
        state: {
          spin: Boolean(def.spin),
          float: Boolean(def.float),
          bounce: false,
          popOut: false,
          lidOpen: false,
          phase: 0,
        },
      });
    }
  }

  getProp(id) {
    return this.props.get(id) || null;
  }

  performAction(propId, action, params = {}) {
    const entry = this.props.get(propId);
    if (!entry) return;
    const { mesh, state, basePos } = entry;

    switch (action) {
      case "show":
        mesh.visible = true;
        break;
      case "hide":
      case "pickup":
        mesh.visible = false;
        break;
      case "open":
        mesh.visible = true;
        state.lidOpen = true;
        state.sparklePhase = 0;
        {
          const glow = mesh.getObjectByName("ChestGlow");
          if (glow) glow.visible = true;
          const sparkles = mesh.getObjectByName("ChestSparkles");
          if (sparkles) {
            sparkles.visible = true;
            for (const c of sparkles.children) {
              c.position.set(0, 0.36, 0);
              c.scale.setScalar(1);
            }
          }
        }
        break;
      case "close":
        state.lidOpen = false;
        {
          const glow = mesh.getObjectByName("ChestGlow");
          if (glow) glow.visible = false;
          const sparkles = mesh.getObjectByName("ChestSparkles");
          if (sparkles) sparkles.visible = false;
        }
        break;
      case "pop_out":
        mesh.visible = true;
        state.popOut = true;
        state.bounce = true;
        state.spin = entry.type !== "emoji_ball";
        state.phase = 0;
        if (params.at && this.waypoints[params.at]) {
          const wp = this.waypoints[params.at];
          basePos.set(wp.x, wp.y + (params.yOffset || 0), wp.z);
          mesh.position.copy(basePos);
        }
        state.popStartPos = basePos.clone();
        if (params.to && this.waypoints[params.to]) {
          const dst = this.waypoints[params.to];
          state.popEndPos = new THREE.Vector3(dst.x, dst.y + 0.02, dst.z);
          state.popTravelDur = Math.max(0.6, params.travelDuration || 2.2);
        } else {
          state.popEndPos = null;
        }
        break;
      case "bounce":
        mesh.visible = true;
        state.bounce = true;
        break;
      case "stop":
        state.bounce = false;
        state.spin = false;
        break;
      default:
        break;
    }
  }

  update(dt, cameraPos = null) {
    for (const entry of this.props.values()) {
      const { mesh, state, basePos } = entry;
      if (!mesh.visible) continue;

      state.phase += dt;

      if (entry.type === "emoji_ball") {
        // Yaw-track camera with playful cartoon bounce wobble so the emoji face stays visible
        if (cameraPos) {
          const dx = cameraPos.x - mesh.position.x;
          const dz = cameraPos.z - mesh.position.z;
          if (dx * dx + dz * dz > 1e-4) {
            mesh.rotation.y = Math.atan2(dx, dz);
          }
        }
        mesh.rotation.z = Math.sin(state.phase * 7.0) * 0.22;
        mesh.rotation.x = Math.cos(state.phase * 5.5) * 0.12;
      } else if (state.spin) {
        mesh.rotation.y += dt * 3.4;
      }

      if (state.popOut && state.popEndPos) {
        const u = Math.min(1, state.phase / state.popTravelDur);
        basePos.lerpVectors(state.popStartPos, state.popEndPos, u);
        mesh.position.x = basePos.x;
        mesh.position.z = basePos.z;
      }

      if (state.float) {
        mesh.position.y = basePos.y + Math.sin(state.phase * 3.5) * 0.06;
      } else if (state.bounce) {
        // Initial dramatic +0.95m spring launch out of chest, then lively bounce
        const launch =
          state.popOut && state.phase < 0.75
            ? Math.sin((state.phase / 0.75) * Math.PI) * 0.95
            : 0;
        const hop = Math.abs(Math.sin(state.phase * 6.0)) * 0.58;
        mesh.position.y = basePos.y + Math.max(launch, hop);
      }

      const lid = mesh.getObjectByName("ChestLid");
      if (lid) {
        const targetAngle = state.lidOpen ? -1.95 : 0;
        lid.rotation.x += (targetAngle - lid.rotation.x) * Math.min(1, dt * 12);
      }

      const sparkles = mesh.getObjectByName("ChestSparkles");
      if (sparkles && sparkles.visible) {
        state.sparklePhase = (state.sparklePhase || 0) + dt;
        const spT = state.sparklePhase;
        if (spT > 1.35) {
          sparkles.visible = false;
        } else {
          for (const c of sparkles.children) {
            c.position.set(
              c.userData.vx * spT,
              0.36 + c.userData.vy * spT - 1.2 * spT * spT,
              c.userData.vz * spT
            );
            c.rotation.y += dt * 8;
            c.scale.setScalar(Math.max(0.01, 1 - spT / 1.35));
          }
        }
      }
    }
  }

  clear() {
    for (const entry of this.props.values()) {
      this.group.remove(entry.mesh);
      entry.mesh.traverse((node) => {
        if (node.geometry) node.geometry.dispose();
        if (node.material) {
          const mats = Array.isArray(node.material) ? node.material : [node.material];
          for (const m of mats) {
            if (m.map) m.map.dispose();
            m.dispose();
          }
        }
      });
    }
    this.props.clear();
  }

  dispose() {
    this.clear();
    this.scene.remove(this.group);
  }
}
