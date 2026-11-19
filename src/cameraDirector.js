import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CONFIG } from "./config.js";

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * 9:16 Vertical Shorts Camera Director + Free Orbit Inspector toggle.
 */
export class CameraDirector {
  constructor(domElement) {
    this.camera = new THREE.PerspectiveCamera(
      48,
      CONFIG.shortsAspect,
      0.08,
      120
    );
    this.camera.position.set(0, 1.85, 5.2);

    this.orbitControls = new OrbitControls(this.camera, domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.08;
    this.orbitControls.target.set(0, 1.1, 1.5);
    this.orbitControls.enabled = false;

    this.mode = "director"; // "director" | "orbit"
    this.shot = {
      mode: "wide",
      target: null,
      lookTarget: null,
      cut: "instant",
      fov: 48,
      elapsed: 0,
    };

    this.currentPos = this.camera.position.clone();
    this.currentLook = new THREE.Vector3(0, 1.1, 1.5);
    this.currentFov = 48;

    this.whipStartPos = this.currentPos.clone();
    this.whipStartLook = this.currentLook.clone();
    this.whipElapsed = 1;
    this.whipDuration = 0.26;

    this.shakeIntensity = 0;
    this.shakePhase = 0;

    // Reusable scratch vectors
    this._desiredPos = new THREE.Vector3();
    this._desiredLook = new THREE.Vector3();
    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._targetPos = new THREE.Vector3();
    this._lookPos = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);
  }

  setInspectionMode(isOrbit) {
    this.mode = isOrbit ? "orbit" : "director";
    this.orbitControls.enabled = isOrbit;
    if (isOrbit) {
      // Pull up slightly so user gets a clear overview of the Granny 1 House
      if (this.camera.position.y < 3.0) {
        this.camera.position.set(0, 9.5, 11.5);
        this.orbitControls.target.set(0, 0.5, 1.0);
      }
      this.orbitControls.update();
    }
  }

  triggerShake(intensity = 0.25) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  applyShot(
    {
      mode = "wide",
      target = null,
      lookTarget = null,
      cut = "instant",
      shake = 0,
    },
    resolver
  ) {
    this.shot = {
      mode,
      target,
      lookTarget,
      cut,
      elapsed: 0,
      fov:
        mode === "closeup"
          ? 40
          : mode === "wide"
            ? 52
            : mode === "dramatic_zoom"
              ? 48
              : 46,
    };

    if (shake > 0) {
      this.triggerShake(shake);
    }

    this._computeDesiredPose(resolver, this._desiredPos, this._desiredLook);

    if (cut === "instant") {
      this.currentPos.copy(this._desiredPos);
      this.currentLook.copy(this._desiredLook);
      this.currentFov = this.shot.fov;
      this.whipElapsed = this.whipDuration;
    } else {
      this.whipStartPos.copy(this.currentPos);
      this.whipStartLook.copy(this.currentLook);
      this.whipElapsed = 0;
    }
  }

  reset() {
    this.shakeIntensity = 0;
    this.whipElapsed = this.whipDuration;
    this.shot = {
      mode: "wide",
      target: null,
      lookTarget: null,
      cut: "instant",
      elapsed: 0,
      fov: 48,
    };
  }

  _resolvePositionAndForward(ref, resolver, outPos, outForward) {
    outForward.set(0, 0, 1);
    if (!ref || !resolver) {
      outPos.set(0, 0, 2);
      return false;
    }

    const actor = resolver.getActor(ref);
    if (actor) {
      outPos.copy(actor.root.position);
      outForward.set(0, 0, 1).applyQuaternion(actor.root.quaternion).normalize();
      return actor;
    }

    const wp = resolver.getWaypoint(ref);
    if (wp) {
      outPos.set(wp.x, wp.y, wp.z);
      return true;
    }

    return false;
  }

  _computeDesiredPose(resolver, outPos, outLook) {
    const targetRef = this.shot.target;
    const actorOrOk = this._resolvePositionAndForward(
      targetRef,
      resolver,
      this._targetPos,
      this._forward
    );

    const isActor = actorOrOk && typeof actorOrOk === "object";
    this._right.crossVectors(this._up, this._forward).normalize();

    const headY = isActor
      ? actorOrOk.spec.targetHeight * 0.85
      : 1.25;

    switch (this.shot.mode) {
      case "closeup": {
        // Tight vertical Shorts face framing from slightly off-axis in front of character
        outPos
          .copy(this._targetPos)
          .addScaledVector(this._forward, 1.48)
          .addScaledVector(this._right, 0.24);
        outPos.y += headY - 0.04;

        outLook.copy(this._targetPos);
        outLook.y += headY - 0.06;
        this.shot.fov = 40;
        break;
      }

      case "dramatic_zoom": {
        const zoomProgress = easeOutCubic(clamp01(this.shot.elapsed / 0.45));
        const dist = 2.05 - zoomProgress * 0.88;
        outPos
          .copy(this._targetPos)
          .addScaledVector(this._forward, dist)
          .addScaledVector(this._right, 0.14);
        outPos.y += headY - 0.08;

        outLook.copy(this._targetPos);
        outLook.y += headY - 0.04;
        this.shot.fov = 48 - zoomProgress * 14;
        break;
      }

      case "over_shoulder": {
        this._resolvePositionAndForward(
          this.shot.lookTarget,
          resolver,
          this._lookPos,
          new THREE.Vector3()
        );
        outPos
          .copy(this._targetPos)
          .addScaledVector(this._forward, -1.25)
          .addScaledVector(this._right, 0.46);
        outPos.y += headY + 0.16;

        outLook.copy(this._lookPos);
        outLook.y += 1.25;
        this.shot.fov = 46;
        break;
      }

      case "chase_cam": {
        // Dynamic trailing-side chase camera staying safely below 2.84m house ceiling
        outPos
          .copy(this._targetPos)
          .addScaledVector(this._forward, -2.35)
          .addScaledVector(this._right, 0.85);
        outPos.y += 1.78;

        outLook.copy(this._targetPos).addScaledVector(this._forward, 0.6);
        outLook.y += 1.15;
        this.shot.fov = 50;
        break;
      }

      case "wide":
      default: {
        outPos.set(
          this._targetPos.x + 1.65,
          this._targetPos.y + 1.95,
          this._targetPos.z + 3.25
        );
        outLook.set(this._targetPos.x, this._targetPos.y + 1.1, this._targetPos.z);
        this.shot.fov = 52;
        break;
      }
    }
  }

  update(dt, resolver) {
    if (this.mode === "orbit") {
      this.orbitControls.update();
      return;
    }

    this.shot.elapsed += dt;
    this._computeDesiredPose(resolver, this._desiredPos, this._desiredLook);

    if (this.whipElapsed < this.whipDuration) {
      this.whipElapsed += dt;
      const t = easeOutCubic(clamp01(this.whipElapsed / this.whipDuration));
      this.currentPos.lerpVectors(this.whipStartPos, this._desiredPos, t);
      this.currentLook.lerpVectors(this.whipStartLook, this._desiredLook, t);
    } else {
      const followRate = 1 - Math.exp(-10 * dt);
      this.currentPos.lerp(this._desiredPos, followRate);
      this.currentLook.lerp(this._desiredLook, followRate);
    }

    const fovBlend = 1 - Math.exp(-12 * dt);
    this.currentFov += (this.shot.fov - this.currentFov) * fovBlend;
    if (Math.abs(this.camera.fov - this.currentFov) > 0.02) {
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    }

    // Apply decaying handheld / impact screen shake
    this.camera.position.copy(this.currentPos);
    if (this.shakeIntensity > 0.002) {
      this.shakePhase += dt * 52;
      const sx = Math.sin(this.shakePhase * 1.1) * this.shakeIntensity * 0.14;
      const sy = Math.cos(this.shakePhase * 1.45) * this.shakeIntensity * 0.14;
      this.camera.position.x += sx;
      this.camera.position.y += sy;
      this.shakeIntensity *= Math.exp(-7.5 * dt);
    } else {
      this.shakeIntensity = 0;
    }

    this.camera.lookAt(this.currentLook);
  }
}
