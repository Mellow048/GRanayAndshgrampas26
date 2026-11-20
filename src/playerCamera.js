import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CONFIG } from "./config.js";
import { createPropMesh } from "./comedyProps.js";

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// Lock FPS pitch cleanly between -45 deg (down) and +35 deg (up) so the camera never stares at ceilings.
const MIN_CAMERA_PITCH = -Math.PI / 4; // -45 deg
const MAX_CAMERA_PITCH = (35 * Math.PI) / 180; // +35 deg

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function wrapAngleDiff(target, current) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

/**
 * First-Person Player POV Camera Controller + Free Orbit Inspector toggle.
 * Supports eye-level walking with head-bob, whip-pan double-takes,
 * nod/shake/peek gestures, crouch/under-bed hiding, bottom-right FPS held-item
 * viewmodel, fade-to-black overlay, and 16:9 / 9:16 aspect toggling.
 */
export class PlayerCamera {
  constructor(domElement, house = null) {
    this.house = house;
    this.aspectKey = CONFIG.defaultAspect || "16:9";
    const aspectSpec = CONFIG.aspectModes[this.aspectKey];

    this.camera = new THREE.PerspectiveCamera(
      aspectSpec.fov,
      aspectSpec.aspect,
      0.06,
      120
    );
    this.camera.rotation.order = "YXZ";

    // Dedicated Viewmodel scene + camera rendered in a second depth-cleared pass
    // so held FPS props NEVER clip into counters, walls, or doorways.
    this.viewmodelScene = new THREE.Scene();
    this.viewmodelCamera = new THREE.PerspectiveCamera(
      aspectSpec.fov,
      aspectSpec.aspect,
      0.04,
      10
    );
    this.viewmodelScene.add(new THREE.HemisphereLight(0xfffbe6, 0x776655, 2.0));
    const vmKeyLight = new THREE.DirectionalLight(0xfff8e7, 1.5);
    vmKeyLight.position.set(1.5, 2.5, 2.0);
    this.viewmodelScene.add(vmKeyLight);

    this.heldItemMount = new THREE.Group();
    this.heldItemMount.name = "FPSHeldItemMount";
    this.heldItemMount.position.set(0.28, -0.22, -0.5);
    this.viewmodelScene.add(this.heldItemMount);
    this.heldPropMesh = null;
    this.heldPropType = null;
    this.heldEquipPop = 1;
    this.heldUseTimer = 0;
    this.vmBobTime = 0;

    this.orbitControls = new OrbitControls(this.camera, domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.08;
    this.orbitControls.target.set(0, 1.0, -2.0);
    this.orbitControls.enabled = false;

    this.mode = "pov"; // "pov" | "orbit"

    // Player spatial state
    this.playerPos = new THREE.Vector3(0, 0, -2.6); // Feet XZ on floor
    this.baseEyeHeight = CONFIG.playerEyeHeight;
    this.crouchStartHeight = CONFIG.playerEyeHeight;
    this.crouchTargetHeight = CONFIG.playerEyeHeight;
    this.crouchElapsed = 1;
    this.crouchDuration = 0.35;

    // Look yaw/pitch state
    this.yaw = 0;
    this.pitch = 0;
    this.lookStartYaw = 0;
    this.lookStartPitch = 0;
    this.lookTargetYaw = 0;
    this.lookTargetPitch = 0;
    this.lookElapsed = 1;
    this.lookDuration = 0.25;
    this.trackingRef = null;

    // Walk polyline state
    this.activeWalk = null;
    this.isWalking = false;
    this.bobPhase = 0;
    this.bobAmount = 0;

    // Gestures (nod_yes, shake_no, shake_panic, peek_lean)
    this.activeGesture = null;
    this.shakeIntensity = 0;
    this.shakePhase = 0;

    // Fade-to-black state
    this.fadeAlpha = 0;
    this.fadeStart = 0;
    this.fadeTarget = 0;
    this.fadeElapsed = 1;
    this.fadeDuration = 0.4;

    this._tmpTargetPos = new THREE.Vector3();
    this._tmpEyePos = new THREE.Vector3();
    this._tmpFinalPos = new THREE.Vector3();
  }

  setHouse(house) {
    this.house = house;
  }

  setAspect(aspectKey) {
    const spec = CONFIG.aspectModes[aspectKey];
    if (!spec) return spec;
    this.aspectKey = aspectKey;
    this.camera.aspect = spec.aspect;
    this.camera.fov = spec.fov;
    this.camera.updateProjectionMatrix();
    this.viewmodelCamera.aspect = spec.aspect;
    this.viewmodelCamera.fov = spec.fov;
    this.viewmodelCamera.updateProjectionMatrix();
    // Adjust held viewmodel slightly for narrower 9:16 frame
    if (aspectKey === "9:16") {
      this.heldItemMount.position.set(0.18, -0.24, -0.5);
    } else {
      this.heldItemMount.position.set(0.28, -0.22, -0.5);
    }
    return spec;
  }

  hasHeldProp() {
    return Boolean(this.heldPropMesh);
  }

  setInspectionMode(isOrbit) {
    this.mode = isOrbit ? "orbit" : "pov";
    this.orbitControls.enabled = isOrbit;
    this.heldItemMount.visible = !isOrbit;
    if (isOrbit) {
      if (this.camera.position.y < 3.0) {
        this.camera.position.set(0, 9.5, 11.5);
        this.orbitControls.target.set(0, 0.5, 0.0);
      }
      this.orbitControls.update();
    }
  }

  reset(spawnPos = null, lookAtPos = null) {
    this.activeWalk = null;
    this.isWalking = false;
    this.bobPhase = 0;
    this.bobAmount = 0;
    this.activeGesture = null;
    this.shakeIntensity = 0;
    this.trackingRef = null;

    this.baseEyeHeight = CONFIG.playerEyeHeight;
    this.crouchStartHeight = CONFIG.playerEyeHeight;
    this.crouchTargetHeight = CONFIG.playerEyeHeight;
    this.crouchElapsed = 1;

    this.fadeAlpha = 0;
    this.fadeStart = 0;
    this.fadeTarget = 0;
    this.fadeElapsed = 1;

    this.holdProp(null);

    if (spawnPos) {
      this.playerPos.set(spawnPos.x, spawnPos.y || 0, spawnPos.z);
    } else {
      this.playerPos.set(0, 0, -2.6);
    }

    if (lookAtPos) {
      const { yaw, pitch } = this._computeYawPitchTo(lookAtPos);
      this.yaw = yaw;
      this.pitch = pitch;
    } else {
      this.yaw = 0;
      this.pitch = 0;
    }
    this.lookStartYaw = this.yaw;
    this.lookTargetYaw = this.yaw;
    this.lookStartPitch = this.pitch;
    this.lookTargetPitch = this.pitch;
    this.lookElapsed = 1;
  }

  _resolveTargetPosition(ref, resolver, out) {
    if (!ref || !resolver) return false;
    if (typeof ref === "object" && "x" in ref && "z" in ref) {
      out.set(ref.x, ref.y ?? 1.35, ref.z);
      return true;
    }
    const actor = resolver.getActor(ref);
    if (actor) {
      actor.getHeadWorldPosition(out);
      out.y -= 0.08;
      return true;
    }
    const prop = resolver.getProp ? resolver.getProp(ref) : null;
    if (prop) {
      out.copy(prop.mesh.position);
      out.y += 0.08;
      return true;
    }
    const wp = resolver.getWaypoint(ref);
    if (wp) {
      // Surface waypoints (e.g. counter top y=1.13) target just above the surface rather than adding +1.35m eye height.
      const yOff = (wp.y || 0) > 0.2 ? 0.12 : 1.35;
      out.set(wp.x, (wp.y || 0) + yOff, wp.z);
      return true;
    }
    return false;
  }

  _computeYawPitchTo(targetPos) {
    const eyeY = this.playerPos.y + this.baseEyeHeight;
    const dx = targetPos.x - this.playerPos.x;
    const dy = targetPos.y - eyeY;
    const dz = targetPos.z - this.playerPos.z;
    const horizDist = Math.max(1e-4, Math.hypot(dx, dz));
    // Three.js camera looks down -Z; yaw = atan2(-dx, -dz)
    const yaw = Math.atan2(-dx, -dz);
    const pitch = clamp(Math.atan2(dy, horizDist), MIN_CAMERA_PITCH, MAX_CAMERA_PITCH);
    return { yaw, pitch };
  }

  startWalk({ points, duration = 2.5, autoLook = true }) {
    if (!points || points.length < 2) return;
    const cumDist = [0];
    let totalLength = 0;
    for (let i = 1; i < points.length; i += 1) {
      totalLength += points[i].distanceTo(points[i - 1]);
      cumDist.push(totalLength);
    }
    this.activeWalk = {
      points,
      cumDist,
      totalLength,
      elapsed: 0,
      duration: Math.max(0.1, duration),
      autoLook,
    };
    this.isWalking = true;
    if (autoLook && points.length >= 2) {
      const lookAhead = points[1].clone();
      lookAhead.y = this.playerPos.y + this.baseEyeHeight;
      this.lookAtPosition(lookAhead, { duration: 0.35, trackRef: null });
    }
  }

  lookAtPosition(targetPos, { duration = 0.25, trackRef = null } = {}) {
    const { yaw, pitch } = this._computeYawPitchTo(targetPos);
    this.lookStartYaw = this.yaw;
    this.lookStartPitch = this.pitch;
    this.lookTargetYaw = this.yaw + wrapAngleDiff(yaw, this.yaw);
    this.lookTargetPitch = pitch;
    this.lookElapsed = 0;
    this.lookDuration = Math.max(0.01, duration);
    this.trackingRef = trackRef;
  }

  lookAt(ref, { duration = 0.25, track = false } = {}, resolver) {
    if (this._resolveTargetPosition(ref, resolver, this._tmpTargetPos)) {
      this.lookAtPosition(this._tmpTargetPos, {
        duration,
        trackRef: track ? ref : null,
      });
    }
  }

  crouch({ crouched = true, duration = 0.35 } = {}) {
    this.crouchStartHeight = this.baseEyeHeight;
    this.crouchTargetHeight = crouched
      ? CONFIG.playerCrouchHeight
      : CONFIG.playerEyeHeight;
    this.crouchElapsed = 0;
    this.crouchDuration = Math.max(0.05, duration);
  }

  triggerGesture(type = "nod_yes", duration = 0.7) {
    if (type === "shake_panic") {
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.45);
      return;
    }
    this.activeGesture = {
      type,
      elapsed: 0,
      duration: Math.max(0.2, duration),
    };
  }

  holdProp(propType = null) {
    if (this.heldPropMesh) {
      this.heldItemMount.remove(this.heldPropMesh);
      this.heldPropMesh.traverse((n) => {
        if (n.geometry) n.geometry.dispose();
        if (n.material) {
          const ms = Array.isArray(n.material) ? n.material : [n.material];
          for (const m of ms) {
            if (m.map) m.map.dispose();
            m.dispose();
          }
        }
      });
      this.heldPropMesh = null;
    }

    this.heldPropType = propType || null;
    if (!propType) return;

    const mesh = createPropMesh(propType);
    // Scale cleanly for crisp FPS bottom-right framing
    mesh.scale.setScalar(propType === "emoji_ball" ? 0.45 : 0.72);
    if (propType === "golden_key") {
      mesh.rotation.set(0.3, -0.4, -0.35);
    } else if (propType === "toy_blaster") {
      mesh.rotation.set(0.05, -0.15, 0);
    }
    this.heldItemMount.add(mesh);
    this.heldPropMesh = mesh;
    this.heldEquipPop = 0;
  }

  useHeldProp() {
    this.heldUseTimer = 0.32;
  }

  startFade({ to = 1, duration = 0.4 } = {}) {
    this.fadeStart = this.fadeAlpha;
    this.fadeTarget = clamp(to, 0, 1);
    this.fadeElapsed = 0;
    this.fadeDuration = Math.max(0.02, duration);
  }

  getEyeWorldPosition(out = new THREE.Vector3()) {
    return out.set(
      this.playerPos.x,
      this.playerPos.y + this.baseEyeHeight,
      this.playerPos.z
    );
  }

  update(dt, resolver) {
    // Update fade even if in POV
    if (this.fadeElapsed < this.fadeDuration) {
      this.fadeElapsed = Math.min(this.fadeDuration, this.fadeElapsed + dt);
      const ft = easeInOutSine(this.fadeElapsed / this.fadeDuration);
      this.fadeAlpha = this.fadeStart + (this.fadeTarget - this.fadeStart) * ft;
    }

    if (this.mode === "orbit") {
      this.orbitControls.update();
      return;
    }

    // Crouch interpolation
    if (this.crouchElapsed < this.crouchDuration) {
      this.crouchElapsed = Math.min(this.crouchDuration, this.crouchElapsed + dt);
      const ct = easeInOutSine(this.crouchElapsed / this.crouchDuration);
      this.baseEyeHeight =
        this.crouchStartHeight + (this.crouchTargetHeight - this.crouchStartHeight) * ct;
    }

    // Walking along polyline
    if (this.activeWalk) {
      this.activeWalk.elapsed += dt;
      const rawT = clamp(this.activeWalk.elapsed / this.activeWalk.duration, 0, 1);
      const t = rawT * 0.88 + easeInOutSine(rawT) * 0.12;
      const targetDist = t * this.activeWalk.totalLength;

      if (this.activeWalk.totalLength < 1e-4 || this.activeWalk.points.length < 2) {
        this.playerPos.copy(this.activeWalk.points[this.activeWalk.points.length - 1]);
      } else {
        let seg = 0;
        while (
          seg < this.activeWalk.cumDist.length - 2 &&
          this.activeWalk.cumDist[seg + 1] < targetDist
        ) {
          seg += 1;
        }
        const segStart = this.activeWalk.cumDist[seg];
        const segLen = Math.max(1e-5, this.activeWalk.cumDist[seg + 1] - segStart);
        const alpha = clamp((targetDist - segStart) / segLen, 0, 1);
        this.playerPos.lerpVectors(
          this.activeWalk.points[seg],
          this.activeWalk.points[seg + 1],
          alpha
        );

        if (this.activeWalk.autoLook && !this.trackingRef && this.lookElapsed >= this.lookDuration) {
          const ahead = this.activeWalk.points[seg + 1];
          const dx = ahead.x - this.playerPos.x;
          const dz = ahead.z - this.playerPos.z;
          if (dx * dx + dz * dz > 0.02) {
            const desiredYaw = Math.atan2(-dx, -dz);
            this.yaw += wrapAngleDiff(desiredYaw, this.yaw) * Math.min(1, dt * 6);
          }
        }
      }

      this.bobPhase += dt * 11.5;
      this.bobAmount += (1 - this.bobAmount) * Math.min(1, dt * 10);

      if (rawT >= 1) {
        this.playerPos.copy(
          this.activeWalk.points[this.activeWalk.points.length - 1]
        );
        this.activeWalk = null;
        this.isWalking = false;
      }
    } else {
      this.bobAmount *= Math.exp(-10 * dt);
    }

    // Look tracking / whip-pan
    if (this.trackingRef && this._resolveTargetPosition(this.trackingRef, resolver, this._tmpTargetPos)) {
      const { yaw, pitch } = this._computeYawPitchTo(this._tmpTargetPos);
      if (this.lookElapsed < this.lookDuration) {
        this.lookTargetYaw = this.lookStartYaw + wrapAngleDiff(yaw, this.lookStartYaw);
        this.lookTargetPitch = pitch;
      } else {
        this.yaw += wrapAngleDiff(yaw, this.yaw) * Math.min(1, dt * 11);
        this.pitch += (pitch - this.pitch) * Math.min(1, dt * 11);
      }
    }

    if (this.lookElapsed < this.lookDuration) {
      this.lookElapsed = Math.min(this.lookDuration, this.lookElapsed + dt);
      const lt = easeOutCubic(this.lookElapsed / this.lookDuration);
      this.yaw = this.lookStartYaw + (this.lookTargetYaw - this.lookStartYaw) * lt;
      this.pitch = this.lookStartPitch + (this.lookTargetPitch - this.lookStartPitch) * lt;
    }

    // Gestures
    let gesturePitch = 0;
    let gestureYaw = 0;
    let gestureRoll = 0;
    let gestureLeanX = 0;
    if (this.activeGesture) {
      this.activeGesture.elapsed += dt;
      const gt = clamp(this.activeGesture.elapsed / this.activeGesture.duration, 0, 1);
      const envelope = Math.sin(gt * Math.PI);
      if (this.activeGesture.type === "nod_yes") {
        gesturePitch = Math.sin(gt * Math.PI * 4) * 0.22 * envelope;
      } else if (this.activeGesture.type === "shake_no") {
        gestureYaw = Math.sin(gt * Math.PI * 4) * 0.28 * envelope;
      } else if (this.activeGesture.type === "peek_lean") {
        gestureLeanX = Math.sin(gt * Math.PI) * 0.36;
        gestureRoll = -Math.sin(gt * Math.PI) * 0.14;
      }
      if (gt >= 1) {
        this.activeGesture = null;
      }
    }

    // Head-bob + handheld shake
    const bobY = Math.sin(this.bobPhase) * 0.042 * this.bobAmount;
    const bobX = Math.cos(this.bobPhase * 0.5) * 0.02 * this.bobAmount;

    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeIntensity > 0.002) {
      this.shakePhase += dt * 48;
      shakeX = Math.sin(this.shakePhase * 1.1) * this.shakeIntensity * 0.08;
      shakeY = Math.cos(this.shakePhase * 1.45) * this.shakeIntensity * 0.08;
      this.shakeIntensity *= Math.exp(-6.5 * dt);
    } else {
      this.shakeIntensity = 0;
    }

    const finalYaw = this.yaw + gestureYaw;
    const finalPitch = clamp(this.pitch + gesturePitch, MIN_CAMERA_PITCH, MAX_CAMERA_PITCH);
    const rightX = Math.cos(finalYaw);
    const rightZ = -Math.sin(finalYaw);

    this._tmpEyePos.set(
      this.playerPos.x,
      this.playerPos.y + this.baseEyeHeight,
      this.playerPos.z
    );
    this._tmpFinalPos.set(
      this._tmpEyePos.x + rightX * (bobX + gestureLeanX + shakeX),
      this._tmpEyePos.y + bobY + shakeY,
      this._tmpEyePos.z + rightZ * (bobX + gestureLeanX + shakeX)
    );

    if (this.house && typeof this.house.clampCameraPosition === "function") {
      this.camera.position.copy(
        this.house.clampCameraPosition(this._tmpEyePos, this._tmpFinalPos, 0.05)
      );
    } else {
      this.camera.position.copy(this._tmpFinalPos);
    }

    this.camera.rotation.set(finalPitch, finalYaw, gestureRoll, "YXZ");

    // Animate bottom-right FPS held prop (deterministic viewmodel pass)
    if (this.heldPropMesh) {
      this.vmBobTime += dt;
      this.heldEquipPop = Math.min(1, this.heldEquipPop + dt * 6);
      const popScale = easeOutCubic(this.heldEquipPop);
      const baseScale = this.heldPropType === "emoji_ball" ? 0.36 : 0.72;
      this.heldPropMesh.scale.setScalar(baseScale * popScale);

      const baseX = this.aspectKey === "9:16" ? 0.18 : 0.28;
      const baseY = this.aspectKey === "9:16" ? -0.24 : -0.22;
      let pokeZ = 0;
      let pokePitch = 0;
      if (this.heldUseTimer > 0) {
        this.heldUseTimer = Math.max(0, this.heldUseTimer - dt);
        const u = Math.sin((this.heldUseTimer / 0.32) * Math.PI);
        pokeZ = -u * 0.14;
        pokePitch = -u * 0.45;
      }
      this.heldItemMount.position.set(
        baseX + Math.cos(this.bobPhase * 0.5) * 0.012 * this.bobAmount,
        baseY + Math.sin(this.bobPhase) * 0.016 * this.bobAmount + Math.sin(this.vmBobTime * 3.0) * 0.005,
        -0.5 + pokeZ
      );
      this.heldItemMount.rotation.set(pokePitch, 0, 0);
    }
  }

  dispose() {
    this.holdProp(null);
    this.orbitControls.dispose();
  }
}
