import * as THREE from "three";
import { resolvePropPlacement, isEmbedded } from "./stagingSafety.js";

const BUBBLE_ICONS = {
  key: { symbol: "KEY", bg: "#fef08a", accent: "#ca8a04", draw: "key" },
  question: { symbol: "?", bg: "#e0f2fe", accent: "#0284c7", draw: "text" },
  exclamation: { symbol: "!", bg: "#fee2e2", accent: "#dc2626", draw: "text" },
  zzz: { symbol: "Zzz", bg: "#ede9fe", accent: "#6d28d9", draw: "zzz" },
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
  } else if (spec.draw === "zzz") {
    ctx.strokeStyle = "#0f172a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const [tx, ty, size, rot, col] of [
      [-34, 14, 40, -0.14, "#7c3aed"],
      [0, -4, 52, 0.08, "#6d28d9"],
      [38, -22, 62, -0.1, "#5b21b6"],
    ]) {
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(rot);
      ctx.font = `900 ${size}px ui-sans-serif, system-ui, sans-serif`;
      ctx.lineWidth = 7;
      ctx.fillStyle = col;
      ctx.strokeText("Z", 0, 0);
      ctx.fillText("Z", 0, 0);
      ctx.restore();
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

function makeLavaTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#b91c1c";
  ctx.fillRect(0, 0, 512, 512);

  const blobs = [
    [90, 80, 68, "#f97316"], [240, 120, 85, "#fb923c"], [410, 90, 72, "#facc15"],
    [150, 260, 92, "#ea580c"], [340, 280, 76, "#facc15"], [440, 400, 82, "#f97316"],
    [80, 410, 74, "#fb923c"], [250, 430, 88, "#ea580c"], [40, 220, 54, "#fef08a"],
    [300, 50, 50, "#fef08a"], [460, 240, 60, "#fef08a"], [190, 180, 42, "#450a0a"],
    [360, 170, 38, "#7c2d12"], [120, 340, 44, "#450a0a"], [330, 380, 46, "#7c2d12"],
  ];
  for (const [cx, cy, r, col] of blobs) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(9, 9);
  tex.needsUpdate = true;
  return tex;
}

function makePackageLabelTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#fef3c7";
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = "#dc2626";
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 240, 112);
  ctx.fillStyle = "#dc2626";
  ctx.font = "900 34px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("MYSTERY!", 128, 48);
  ctx.fillStyle = "#0f172a";
  ctx.font = "800 22px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("DO NOT PRESS", 128, 92);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
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

    case "delivery_box": {
      const cardboard = new THREE.MeshStandardMaterial({ color: 0xc28e5c, roughness: 0.78 });
      const tape = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.45 });
      const labelMat = new THREE.MeshBasicMaterial({ map: makePackageLabelTexture() });

      const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.52), cardboard);
      body.position.y = 0.21;
      body.castShadow = true;
      body.receiveShadow = true;

      const labelFront = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.22), labelMat);
      labelFront.position.set(0, 0.22, -0.265);
      labelFront.rotation.y = Math.PI;
      const labelBack = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.22), labelMat);
      labelBack.position.set(0, 0.22, 0.265);

      const flapLPivot = new THREE.Group();
      flapLPivot.name = "BoxFlapL";
      flapLPivot.position.set(-0.31, 0.42, 0);
      const flapL = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.03, 0.52), cardboard);
      flapL.position.set(0.155, 0.015, 0);
      const tapeL = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.034, 0.1), tape);
      tapeL.position.set(0.155, 0.016, 0);
      flapLPivot.add(flapL, tapeL);

      const flapRPivot = new THREE.Group();
      flapRPivot.name = "BoxFlapR";
      flapRPivot.position.set(0.31, 0.42, 0);
      const flapR = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.03, 0.52), cardboard);
      flapR.position.set(-0.155, 0.015, 0);
      const tapeR = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.034, 0.1), tape);
      tapeR.position.set(-0.155, 0.016, 0);
      flapRPivot.add(flapR, tapeR);

      group.add(body, labelFront, labelBack, flapLPivot, flapRPivot);
      break;
    }

    case "red_button": {
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.5 });
      const warnMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 });
      const btnMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xdc2626,
        emissiveIntensity: 0.55,
        roughness: 0.25,
      });

      const base = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.09, 0.42), baseMat);
      base.position.y = 0.045;
      base.castShadow = true;
      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.035, 0.45), warnMat);
      trim.position.y = 0.025;
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.05, 18), baseMat);
      collar.position.y = 0.11;

      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.145, 0.09, 20), btnMat);
      cap.position.y = 0.155;
      cap.name = "ButtonCap";
      cap.castShadow = true;

      group.add(base, trim, collar, cap);
      break;
    }

    case "rising_lava": {
      const lavaTex = makeLavaTexture();
      const lavaMat = new THREE.MeshBasicMaterial({
        map: lavaTex,
        color: 0xffaa44,
        transparent: true,
        opacity: 0.92,
      });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(44, 44, 1, 1), lavaMat);
      plane.rotation.x = -Math.PI * 0.5;
      plane.name = "LavaPlane";
      group.add(plane);
      break;
    }

    case "cookie": {
      // A single comedy-scale cookie (48cm wide) split into four sectors, so the
      // "bite" action can bite real chunks off it instead of faking a shrink.
      const dough = new THREE.MeshStandardMaterial({ color: 0xd39247, roughness: 0.88 });
      const rimMat = new THREE.MeshStandardMaterial({ color: 0xb9762f, roughness: 0.9 });
      const chipMat = new THREE.MeshStandardMaterial({ color: 0x40230f, roughness: 0.7 });
      const R = 0.24;
      const H = 0.075;
      for (let i = 0; i < 4; i += 1) {
        const sector = new THREE.Mesh(
          new THREE.CylinderGeometry(R, R * 0.97, H, 12, 1, false, (i * Math.PI) / 2, Math.PI / 2 - 0.012),
          i % 2 === 0 ? dough : rimMat
        );
        sector.name = `CookieSector_${i}`;
        sector.position.y = H / 2;
        sector.castShadow = true;
        group.add(sector);
      }
      const chipSpots = [
        [0.09, 0.07],
        [-0.11, 0.05],
        [0.02, -0.13],
        [-0.06, -0.04],
        [0.14, -0.05],
        [-0.01, 0.11],
      ];
      for (const [cx, cz] of chipSpots) {
        const chip = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), chipMat);
        chip.position.set(cx, H + 0.012, cz);
        chip.scale.y = 0.55;
        group.add(chip);
      }
      group.userData.sectors = 4;
      group.userData.bitesTaken = 0;
      break;
    }

    case "car": {
      // A whole cartoon car for the "riding a car" gag. Built from primitives
      // like every other prop; `bounce` reads as the suspension revving.
      const paint = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35, metalness: 0.4 });
      const glass = new THREE.MeshStandardMaterial({ color: 0xbae6fd, roughness: 0.1, metalness: 0.6 });
      const tyre = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.85 });
      const chrome = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.25, metalness: 0.8 });
      const lampMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfacc15, emissiveIntensity: 0.8 });
      const tailMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x991b1b, emissiveIntensity: 0.6 });

      const body = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.42, 1.7), paint);
      body.position.y = 0.42;
      body.castShadow = true;
      body.receiveShadow = true;
      const hood = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 1.62), paint);
      hood.position.set(0.92, 0.71, 0);
      hood.castShadow = true;
      const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 1.62), paint);
      trunk.position.set(-1.08, 0.68, 0);

      // Open-top convertible, so the seated performers read clearly instead of
      // being hidden inside an opaque primitive cabin.
      const seatMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
      const seats = [];
      for (const z of [-0.58, 0.58]) {
        const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.14, 0.48), seatMat);
        cushion.position.set(-0.1, 0.72, z);
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.55, 0.48), seatMat);
        back.position.set(-0.42, 0.96, z);
        back.rotation.z = -0.12;
        seats.push(cushion, back);
      }
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 1.52), chrome);
      dash.position.set(0.52, 0.82, 0);
      const windscreen = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.38, 1.48), glass);
      windscreen.position.set(0.72, 1.08, 0);
      windscreen.material.transparent = true;
      windscreen.material.opacity = 0.38;

      const wheelGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.16, 18);
      const wheels = [];
      for (const [wx, wz] of [[0.95, 0.84], [0.95, -0.84], [-0.95, 0.84], [-0.95, -0.84]]) {
        const w = new THREE.Mesh(wheelGeo, tyre);
        w.name = "CarWheel";
        w.rotation.x = Math.PI / 2;
        w.position.set(wx, 0.26, wz);
        w.castShadow = true;
        wheels.push(w);
      }

      const headL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.28), lampMat);
      headL.position.set(1.42, 0.52, 0.54);
      const headR = headL.clone();
      headR.position.z = -0.54;
      const tailL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.24), tailMat);
      tailL.position.set(-1.42, 0.5, 0.54);
      const tailR = tailL.clone();
      tailR.position.z = -0.54;
      const bumpF = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 1.75), chrome);
      bumpF.position.set(1.44, 0.28, 0);
      const bumpR = bumpF.clone();
      bumpR.position.x = -1.44;

      group.add(body, hood, trunk, dash, windscreen, ...seats, headL, headR, tailL, tailR, bumpF, bumpR, ...wheels);
      break;
    }
    case "cookie_jar":
    default: {
      // Bigger than a real jar (48cm) plus a few cookies inside, so the camera
      // can actually tell what the heist is about.
      const jarMat = new THREE.MeshStandardMaterial({
        color: 0x7dd3fc,
        roughness: 0.25,
        metalness: 0.05,
        transparent: true,
        opacity: 0.72,
      });
      const lidMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.35 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.44, 18), jarMat);
      body.position.y = 0.22;
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.05, 18), lidMat);
      base.position.y = 0.025;
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.07, 18), lidMat);
      lid.position.y = 0.47;
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), lidMat);
      knob.position.y = 0.53;
      group.add(body, base, lid, knob);

      const innerDough = new THREE.MeshStandardMaterial({ color: 0xd39247, roughness: 0.9 });
      const innerChip = new THREE.MeshStandardMaterial({ color: 0x40230f, roughness: 0.7 });
      for (const [cx, cy, cz, rot] of [
        [0.02, 0.16, 0.04, 0.5],
        [-0.05, 0.27, -0.03, 1.1],
        [0.06, 0.36, 0.02, 2.0],
      ]) {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.08, 0.03, 10), innerDough);
        c.position.set(cx, cy, cz);
        c.rotation.z = rot;
        group.add(c);
        if (cy > 0.2) {
          const chip = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 5), innerChip);
          chip.position.set(cx + 0.02, cy + 0.016, cz);
          group.add(chip);
        }
      }
      break;
    }
  }

  return group;
}


/**
 * Bites a cookie-shaped prop one sector at a time. Returns true when a chunk
 * actually disappeared (so callers can time an "eat" sfx to the visible bite).
 */
export function biteCookie(group) {
  if (!group) return false;
  const sectors = group.children.filter((c) => c.name && c.name.startsWith("CookieSector_"));
  const taken = group.userData.bitesTaken || 0;
  if (!sectors.length || taken >= sectors.length) return false;
  sectors[sectors.length - 1 - taken].visible = false;
  group.userData.bitesTaken = taken + 1;
  return true;
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

    // Surface-aware staging (installed by the runner once the house is loaded).
    this.world = null;
    this.actorProvider = null;
    this.stagingLog = [];
  }

  setStaging(world, actorProvider = null) {
    this.world = world || null;
    this.actorProvider = actorProvider || null;
  }

  /** Existing props as `{id, aabb}` so new props can dodge them. */
  _occupiedBoxes(exceptId = null) {
    const out = [];
    for (const p of this.props.values()) {
      if (p.id === exceptId) continue;
      if (p.mesh.visible === false) continue;
      const box = new THREE.Box3().setFromObject(p.mesh);
      if (!box.isEmpty()) out.push({ id: p.id, aabb: box });
    }
    return out;
  }

  /**
   * Seats a prop's origin so its mesh rests on the surface underneath and does
   * not intersect another prop. Returns the final position (origin space).
   */
  seatProp(mesh, desiredOrigin, exceptId = null) {
    if (!this.world || !mesh) return desiredOrigin.clone();

    const box = new THREE.Box3().setFromObject(mesh);
    if (box.isEmpty()) return desiredOrigin.clone();
    const size = box.getSize(new THREE.Vector3());
    const centerOffsetY = (box.min.y + box.max.y) / 2;
    const half = {
      x: Math.max(0.03, size.x / 2),
      y: Math.max(0.03, size.y / 2),
      z: Math.max(0.03, size.z / 2),
    };

    const result = resolvePropPlacement({
      world: this.world,
      desired: { x: desiredOrigin.x, y: desiredOrigin.y + centerOffsetY, z: desiredOrigin.z },
      halfExtents: half,
      others: this._occupiedBoxes(exceptId),
      // Never seat a prop inside a microwave / cupboard / wall.
      isSpotFree: (pos, h) => !isEmbedded(this.world, pos, h),
    });

    const finalOrigin = new THREE.Vector3(
      result.pos.x,
      result.pos.y - centerOffsetY,
      result.pos.z
    );
    if (result.snapped || result.nudged) {
      this.stagingLog.push({
        id: exceptId,
        snapped: result.snapped,
        nudged: result.nudged,
        from: desiredOrigin.clone(),
        to: finalOrigin.clone(),
      });
    }
    return finalOrigin;
  }

  loadProps(propDefs = []) {
    this.clear();
    for (const def of propDefs) {
      const mesh = createPropMesh(def.type);
      const propTag = def.tag || def.id;
      const propLabel = def.label || def.id;
      mesh.name = `Prop_${def.id}`;
      mesh.userData.tag = propTag;
      mesh.userData.propId = def.id;
      mesh.userData.semanticLabel = propLabel;
      mesh.userData.aliases = [def.id, def.type].filter((v, i, arr) => v && arr.indexOf(v) === i);
      mesh.traverse((child) => {
        if (!child.name) {
          child.name = `${def.id}_Part`;
        }
        child.userData.tag = propTag;
        child.userData.propId = def.id;
        child.userData.semanticLabel = propLabel;
        child.userData.aliases = mesh.userData.aliases;
      });
      const wpName = def.spawn || def.waypoint;
      const wp = typeof wpName === "string" ? this.waypoints[wpName] : wpName;
      const spawnOff = def.spawnOffset || null;
      const basePos = wp
        ? new THREE.Vector3(
            wp.x + (spawnOff?.x || 0),
            wp.y + (def.yOffset || 0),
            wp.z + (spawnOff?.z || 0)
          )
        : new THREE.Vector3(spawnOff?.x || 0, def.yOffset || 0, spawnOff?.z || 0);

      mesh.position.copy(basePos);
      if (def.rotationY) mesh.rotation.y = def.rotationY;
      if (this.world) {
        const seated = this.seatProp(mesh, basePos, def.id);
        mesh.position.copy(seated);
        basePos.copy(seated);
      }
      if (def.scale) mesh.scale.setScalar(def.scale);
      mesh.visible = def.visible !== false;

      this.group.add(mesh);
      this.props.set(def.id, {
        id: def.id,
        type: def.type,
        mesh,
        basePos: basePos.clone(),
        initial: {
          basePos: basePos.clone(),
          rotationY: def.rotationY || 0,
          scale: def.scale || 1,
          visible: def.visible !== false,
          spin: Boolean(def.spin),
          float: Boolean(def.float),
        },
        state: {
          spin: Boolean(def.spin),
          float: Boolean(def.float),
          bounce: false,
          popOut: false,
          lidOpen: false,
          pressed: false,
          riseActive: false,
          riseStartY: basePos.y,
          riseTargetY: basePos.y,
          riseElapsed: 0,
          riseDuration: 1,
          // Optional staged size-change / waypoint-drive state for the toy-car
          // transformation gag. Both are simulation-time deterministic.
          grow: null,
          drive: null,
          phase: 0,
        },
      });
    }
  }

  getProp(id) {
    return this.props.get(id) || null;
  }

  resetProp(propId, params = {}) {
    const entry = this.props.get(propId);
    if (!entry) return;
    const { mesh, state, basePos, initial } = entry;

    const wpRef = params.at || params.waypoint;
    if (wpRef && this.waypoints[wpRef]) {
      const wp = this.waypoints[wpRef];
      basePos.set(wp.x, wp.y + (params.yOffset ?? 0), wp.z);
    } else {
      basePos.copy(initial.basePos);
      if (params.yOffset !== undefined) {
        basePos.y += params.yOffset;
      }
    }

    mesh.position.copy(basePos);
    mesh.rotation.set(0, params.rotationY ?? initial.rotationY, 0);
    mesh.scale.setScalar(params.scale ?? initial.scale);
    mesh.visible = params.visible !== undefined ? Boolean(params.visible) : initial.visible;

    state.spin = params.spin !== undefined ? Boolean(params.spin) : initial.spin;
    state.float = params.float !== undefined ? Boolean(params.float) : initial.float;
    state.bounce = false;
    state.popOut = false;
    state.popEndPos = null;
    state.lidOpen = false;
    state.pressed = false;
    state.riseActive = false;
    state.riseStartY = basePos.y;
    state.riseTargetY = basePos.y;
    state.riseElapsed = 0;
    state.grow = null;
    state.drive = null;
    state.phase = 0;

    const glow = mesh.getObjectByName("ChestGlow");
    if (glow) glow.visible = false;
    const sparkles = mesh.getObjectByName("ChestSparkles");
    if (sparkles) sparkles.visible = false;
    const lid = mesh.getObjectByName("ChestLid");
    if (lid) lid.rotation.x = 0;
    const flapL = mesh.getObjectByName("BoxFlapL");
    if (flapL) flapL.rotation.z = 0;
    const flapR = mesh.getObjectByName("BoxFlapR");
    if (flapR) flapR.rotation.z = 0;
    const btnCap = mesh.getObjectByName("ButtonCap");
    if (btnCap) btnCap.position.y = 0.155;
  }

  performAction(propId, action, params = {}) {
    const entry = this.props.get(propId);
    if (!entry) return;
    const { mesh, state, basePos } = entry;

    switch (action) {
      case "reset":
        this.resetProp(propId, params);
        break;
      case "show":
        mesh.visible = true;
        state.bounce = false;
        state.popOut = false;
        state.spin = false;
        if (params.at && this.waypoints[params.at]) {
          const wp = this.waypoints[params.at];
          basePos.set(wp.x, wp.y + (params.yOffset || 0), wp.z);
          mesh.position.copy(this.seatProp(mesh, basePos, propId));
        }
        break;
      case "hide":
      case "pickup":
        mesh.visible = false;
        state.bounce = false;
        state.popOut = false;
        state.spin = false;
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
      case "press":
        mesh.visible = true;
        state.pressed = true;
        break;
      case "unpress":
        state.pressed = false;
        break;
      case "rise_to":
        mesh.visible = true;
        state.riseActive = true;
        state.riseStartY = basePos.y;
        state.riseTargetY = params.targetY ?? basePos.y + 0.5;
        state.riseElapsed = 0;
        state.riseDuration = Math.max(0.1, params.duration || 3.0);
        break;
      case "grow": {
        const targetScale = Math.max(0.01, Number(params.scale) || 1);
        state.grow = {
          from: mesh.scale.x,
          to: targetScale,
          elapsed: 0,
          duration: Math.max(0.1, Number(params.duration) || 1.2),
        };
        mesh.visible = true;
        state.bounce = true;
        break;
      }
      case "drive": {
        const points = [mesh.position.clone()];
        for (const ref of Array.isArray(params.path) ? params.path : []) {
          const wp = typeof ref === "string" ? this.waypoints[ref] : ref;
          if (wp && Number.isFinite(wp.x) && Number.isFinite(wp.z)) {
            points.push(new THREE.Vector3(wp.x, wp.y ?? mesh.position.y, wp.z));
          }
        }
        const lengths = [];
        let totalLength = 0;
        for (let i = 1; i < points.length; i += 1) {
          const length = Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
          lengths.push(length);
          totalLength += length;
        }
        if (points.length > 1 && totalLength > 0) {
          state.drive = {
            points,
            lengths,
            totalLength,
            elapsed: 0,
            duration: Math.max(0.5, Number(params.duration) || 10),
          };
          state.bounce = false;
          state.spin = false;
          state.popOut = false;
          mesh.visible = true;
        }
        break;
      }
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
          mesh.position.copy(this.seatProp(mesh, basePos, propId));
          basePos.copy(mesh.position);
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
      case "bite": {
        // Cookies are four sectors: each bite makes one disappear.
        biteCookie(mesh);
        state.bounce = true;
        break;
      }
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

      if (state.grow) {
        const g = state.grow;
        g.elapsed = Math.min(g.duration, g.elapsed + dt);
        const t = g.elapsed / g.duration;
        const eased = 1 - (1 - t) ** 3;
        mesh.scale.setScalar(g.from + (g.to - g.from) * eased);
        if (t >= 1) state.grow = null;
      }

      if (state.drive) {
        const d = state.drive;
        const previousElapsed = d.elapsed;
        d.elapsed = Math.min(d.duration, d.elapsed + dt);
        let distance = d.totalLength * (d.elapsed / d.duration);
        let segment = 0;
        while (segment < d.lengths.length - 1 && distance > d.lengths[segment]) {
          distance -= d.lengths[segment];
          segment += 1;
        }
        const segmentLength = Math.max(1e-6, d.lengths[segment] || 0);
        const u = Math.min(1, distance / segmentLength);
        const a = d.points[segment];
        const b = d.points[segment + 1];
        if (a && b) {
          mesh.position.set(
            a.x + (b.x - a.x) * u,
            a.y + (b.y - a.y) * u,
            a.z + (b.z - a.z) * u
          );
          mesh.rotation.y = Math.atan2(-(b.z - a.z), b.x - a.x);
          const travelled = d.totalLength * ((d.elapsed - previousElapsed) / d.duration);
          for (const wheel of mesh.children.filter((child) => child.name === "CarWheel")) {
            wheel.rotation.z -= travelled / 0.26;
          }
        }
        if (d.elapsed >= d.duration) state.drive = null;
      }

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

      if (state.riseActive) {
        state.riseElapsed = Math.min(state.riseDuration, state.riseElapsed + dt);
        const rt = state.riseElapsed / state.riseDuration;
        basePos.y = state.riseStartY + (state.riseTargetY - state.riseStartY) * rt;
        mesh.position.y = basePos.y + Math.sin(state.phase * 3.5) * 0.025;
        if (rt >= 1) state.riseActive = false;
      } else if (entry.type === "rising_lava") {
        mesh.position.y = basePos.y + Math.sin(state.phase * 3.5) * 0.025;
      }

      if (entry.type === "rising_lava") {
        const lavaPlane = mesh.getObjectByName("LavaPlane");
        if (lavaPlane?.material?.map) {
          lavaPlane.material.map.offset.x = (state.phase * 0.08) % 1;
          lavaPlane.material.map.offset.y = (state.phase * 0.05) % 1;
        }
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

      const flapL = mesh.getObjectByName("BoxFlapL");
      const flapR = mesh.getObjectByName("BoxFlapR");
      if (flapL && flapR) {
        const openAngle = state.lidOpen ? 2.15 : 0;
        flapL.rotation.z += (openAngle - flapL.rotation.z) * Math.min(1, dt * 10);
        flapR.rotation.z += (-openAngle - flapR.rotation.z) * Math.min(1, dt * 10);
      }

      const btnCap = mesh.getObjectByName("ButtonCap");
      if (btnCap) {
        const targetCapY = state.pressed ? 0.118 : 0.155;
        btnCap.position.y += (targetCapY - btnCap.position.y) * Math.min(1, dt * 18);
        if (btnCap.material) {
          btnCap.material.emissiveIntensity = state.pressed
            ? 1.15
            : 0.45 + Math.sin(state.phase * 6) * 0.25;
        }
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
