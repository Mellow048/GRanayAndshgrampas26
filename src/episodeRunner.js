import * as THREE from "three";
import { CONFIG, SET_MAP } from "./config.js";

const LOCOMOTION_ANIMS = new Set(["walk", "run", "run2", "sneak", "granny_walk"]);
const PLAYER_PERSONAL_SPACE = 1.3;
const ACTOR_SEPARATION = 1.05;

/**
 * Deterministic 60Hz POV Episode & Multi-Skit Beat Runner.
 * Supports multi-skit POV JSON (`skits[].beats` with `at` or `after`) and legacy `actions`.
 */
export class EpisodeRunner {
  constructor({
    characters,
    playerCamera,
    cameraDirector = null,
    comedyProps,
    sfxEngine,
    house = null,
  }) {
    this.characters = characters;
    this.playerCamera = playerCamera;
    this.cameraDirector = cameraDirector;
    this.comedyProps = comedyProps;
    this.sfxEngine = sfxEngine;
    this.house = house;

    this.episode = null;
    this.events = [];
    this.activeCharMoves = [];

    this.simTime = 0;
    this.duration = 0;
    this.isPlaying = false;
    this.isFinished = false;
    this.nextEventIndex = 0;

    this.onStateChange = null;
    this.onFinish = null;

    this.resolver = {
      getActor: (id) => this.characters[id] || null,
      getProp: (id) => this.comedyProps?.getProp(id) || null,
      getWaypoint: (id) => (typeof id === "string" ? SET_MAP[id] || null : id),
    };
  }

  setHouse(house) {
    this.house = house;
    this.playerCamera?.setHouse(house);
  }

  resolveWaypoint(target) {
    if (!target) return { x: 0, y: 0, z: 0 };
    if (typeof target === "string") {
      if (SET_MAP[target]) return { ...SET_MAP[target] };
      const actor = this.characters[target];
      if (actor) {
        return {
          x: actor.root.position.x,
          y: actor.root.position.y,
          z: actor.root.position.z,
        };
      }
      const prop = this.comedyProps?.getProp(target);
      if (prop) {
        return {
          x: prop.mesh.position.x,
          y: prop.mesh.position.y,
          z: prop.mesh.position.z,
        };
      }
      console.warn(`[EpisodeRunner] Unknown target "${target}"`);
      return { x: 0, y: 0, z: 0 };
    }
    return { x: target.x ?? 0, y: target.y ?? 0, z: target.z ?? 0 };
  }

  computePath(fromPos, toPos) {
    const startVec = new THREE.Vector3(fromPos.x, fromPos.y ?? 0, fromPos.z);
    const goalVec = new THREE.Vector3(toPos.x, toPos.y ?? 0, toPos.z);

    if (
      this.house &&
      typeof this.house.findPath === "function" &&
      Math.abs(startVec.y) < 0.25 &&
      Math.abs(goalVec.y) < 0.25
    ) {
      const path = this.house.findPath(startVec, goalVec);
      if (path && path.length >= 2) {
        return path.map((p) =>
          p instanceof THREE.Vector3 ? p : new THREE.Vector3(p.x, p.y ?? 0, p.z)
        );
      }
    }
    return [startVec, goalVec];
  }

  compileTimeline(episode) {
    const rawEvents = [];

    if (Array.isArray(episode.skits)) {
      let skitCursor = 0;
      for (const skit of episode.skits) {
        let beatCursor = skit.startAt ?? skitCursor;
        let skitMaxEnd = beatCursor;
        for (const beat of skit.beats || []) {
          let at = beatCursor;
          if (typeof beat.at === "number") {
            at = beat.at;
          } else if (typeof beat.after === "number") {
            at = beatCursor + beat.after;
          }
          const duration = Math.max(0, beat.duration ?? 0);
          rawEvents.push({ ...beat, at, duration });
          beatCursor = at;
          skitMaxEnd = Math.max(skitMaxEnd, at + duration);
        }
        skitCursor = skitMaxEnd;
      }
    } else if (Array.isArray(episode.actions)) {
      for (const act of episode.actions) {
        rawEvents.push({
          ...act,
          at: act.at ?? 0,
          duration: Math.max(0, act.duration ?? 0),
        });
      }
    }

    rawEvents.sort((a, b) => a.at - b.at);
    return rawEvents;
  }

  loadEpisode(episodeJson) {
    const episode =
      typeof episodeJson === "string" ? JSON.parse(episodeJson) : episodeJson;

    this.episode = episode;
    this.events = this.compileTimeline(episode);

    let maxEnd = 1.0;
    for (const ev of this.events) {
      maxEnd = Math.max(maxEnd, ev.at + (ev.duration ?? 0));
    }
    this.duration = maxEnd;
    this.reset();
    return {
      title: episode.title ?? "Untitled Episode",
      duration: this.duration,
      eventCount: this.events.length,
    };
  }

  reset() {
    this.simTime = 0;
    this.nextEventIndex = 0;
    this.activeCharMoves = [];
    this.isPlaying = false;
    this.isFinished = false;
    this.sfxEngine?.stopAll();
    this.sfxEngine?.resetPacerClock(0);

    if (!this.episode) return;

    if (this.episode.aspect && this.playerCamera) {
      this.playerCamera.setAspect(this.episode.aspect);
    }

    // Reset cast
    for (const char of Object.values(this.characters)) {
      char.resetPose();
      char.root.visible = false;
    }

    for (const castEntry of this.episode.cast || []) {
      const char = this.characters[castEntry.id];
      if (!char) continue;
      char.root.visible = true;
      const spawn = this.resolveWaypoint(castEntry.spawn || "back_hall");
      char.root.position.set(spawn.x, spawn.y ?? 0, spawn.z);

      if (castEntry.facing) {
        const facePt = this.resolveWaypoint(castEntry.facing);
        char.lookAt(facePt);
      } else {
        char.root.rotation.y = 0;
      }
      char.playAnim(castEntry.anim || "idle", 0.01, null, true);
      char.mixer.update(0.016);
    }

    // Reset 3D comedy props
    this.comedyProps?.loadProps(this.episode.props || []);

    // Reset PlayerCamera spawn
    if (this.playerCamera) {
      const pSpawn = this.resolveWaypoint(this.episode.playerSpawn || "back_hall");
      const pLook = this.episode.playerFacing
        ? this.resolveWaypoint(this.episode.playerFacing)
        : null;
      const lookVec = pLook
        ? new THREE.Vector3(pLook.x, (pLook.y ?? 0) + 1.35, pLook.z)
        : null;
      this.playerCamera.reset(pSpawn, lookVec);
      this.playerCamera.setInspectionMode(false);
    }

    this.dispatchDueEvents(0);
    this.playerCamera?.update(0, this.resolver);
    this.emitState();
  }

  play() {
    if (!this.episode) return;
    if (this.isFinished) this.reset();
    this.isPlaying = true;
    this.emitState();
  }

  pause() {
    this.isPlaying = false;
    this.sfxEngine?.stopAll();
    this.emitState();
  }

  stop() {
    this.isPlaying = false;
    this.reset();
  }

  seek(targetTime) {
    if (!this.episode) return;
    const clamped = Math.max(0, Math.min(this.duration, targetTime));
    const wasPlaying = this.isPlaying;
    const wasExport = this.sfxEngine?.exportMode;

    if (this.sfxEngine) {
      this.sfxEngine.exportMode = true;
      const savedEvents = [...this.sfxEngine.recordedEvents];
      this.reset();
      const dt = CONFIG.fixedDt;
      const steps = Math.floor(clamped / dt);
      for (let i = 0; i < steps; i++) {
        this.step(dt, { silentSeek: true });
      }
      const rem = clamped - steps * dt;
      if (rem > 1e-5) {
        this.step(rem, { silentSeek: true });
      }
      this.sfxEngine.recordedEvents = savedEvents;
      this.sfxEngine.exportMode = Boolean(wasExport);
    }

    this.isPlaying = wasPlaying;
    this.emitState();
  }

  step(dt, { silentSeek = false } = {}) {
    if (!this.episode) return;

    this.simTime = Math.min(this.duration, this.simTime + dt);

    // 1. Dispatch beats scheduled <= simTime
    this.dispatchDueEvents(this.simTime, { silentSeek });

    // 2. Advance character polyline moves
    let anyCharMoving = false;
    let fastestMoveAnim = "walk";
    for (let i = this.activeCharMoves.length - 1; i >= 0; i--) {
      const m = this.activeCharMoves[i];
      const t =
        m.duration <= 0
          ? 1
          : Math.min(1, (this.simTime - m.startTime) / m.duration);
      const targetDist = m.totalLength * t;

      let segIdx = 0;
      while (
        segIdx < m.cumLengths.length - 2 &&
        m.cumLengths[segIdx + 1] < targetDist
      ) {
        segIdx++;
      }

      const segStart = m.points[segIdx];
      const segEnd = m.points[segIdx + 1];
      const segLen = Math.max(
        1e-5,
        m.cumLengths[segIdx + 1] - m.cumLengths[segIdx]
      );
      const localT = Math.max(
        0,
        Math.min(1, (targetDist - m.cumLengths[segIdx]) / segLen)
      );

      m.actor.root.position.lerpVectors(segStart, segEnd, localT);

      const dx = segEnd.x - segStart.x;
      const dz = segEnd.z - segStart.z;
      if (dx * dx + dz * dz > 1e-6 && !m.keepFacing) {
        m.actor.faceTarget(segEnd, 14);
      }

      // Enforce active LoopRepeat locomotion clip every tick while translating (prevents sliding)
      const act = m.actor.currentAction;
      if (
        m.actor.currentAnimation !== m.anim ||
        !act ||
        act.paused ||
        act.loop !== THREE.LoopRepeat
      ) {
        m.actor.playAnim(m.anim, 0.08, m.animSpeed, true);
      }

      anyCharMoving = true;
      if (m.anim === "run" || m.anim === "run2") fastestMoveAnim = m.anim;

      if (t >= 1) {
        m.actor.playAnim(m.endAnim || "idle", 0.2, null, true);
        this.activeCharMoves.splice(i, 1);
      }
    }

    // 2b. Prevent actors from merging/clipping inside each other
    const visibleActors = Object.values(this.characters).filter((c) => c.root.visible);
    for (let i = 0; i < visibleActors.length; i += 1) {
      for (let j = i + 1; j < visibleActors.length; j += 1) {
        const a = visibleActors[i].root.position;
        const b = visibleActors[j].root.position;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 1e-4 && dist < ACTOR_SEPARATION) {
          const push = (ACTOR_SEPARATION - dist) * 0.5;
          const nx = dx / dist;
          const nz = dz / dist;
          const ax = a.x - nx * push;
          const az = a.z - nz * push;
          const bx = b.x + nx * push;
          const bz = b.z + nz * push;
          if (!this.house || this.house.isPointInsideWalkable(ax, az)) {
            a.x = ax;
            a.z = az;
          }
          if (!this.house || this.house.isPointInsideWalkable(bx, bz)) {
            b.x = bx;
            b.z = bz;
          }
        }
      }
    }

    // 3. Advance PlayerCamera & enforce personal space around standing actors
    this.playerCamera?.update(dt, this.resolver);
    if (this.playerCamera && this.playerCamera.mode === "pov") {
      const pPos = this.playerCamera.playerPos;
      for (const actor of visibleActors) {
        const dx = pPos.x - actor.root.position.x;
        const dz = pPos.z - actor.root.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 1e-4 && dist < PLAYER_PERSONAL_SPACE) {
          const nx = dx / dist;
          const nz = dz / dist;
          const candX = actor.root.position.x + nx * PLAYER_PERSONAL_SPACE;
          const candZ = actor.root.position.z + nz * PLAYER_PERSONAL_SPACE;
          if (!this.house || this.house.isPointInsideWalkable(candX, candZ)) {
            pPos.x = candX;
            pPos.z = candZ;
            this.playerCamera.camera.position.x = candX;
            this.playerCamera.camera.position.z = candZ;
          }
        }
      }
    }
    const playerMoving = Boolean(this.playerCamera?.isWalking);

    // 4. Update Characters (with live player camera & viewport for facing + bubble clamp)
    const playerCam = this.playerCamera?.camera || null;
    const playerCamPos = playerCam?.position || null;
    for (const char of visibleActors) {
      char.update(dt, playerCamPos, playerCam);
    }

    // 5. Update 3D Comedy Props (pass player camera position so Emoji Ball faces viewer)
    this.comedyProps?.update(dt, playerCamPos);

    // 6. Advance SFX Pacer & movement footsteps
    if (!silentSeek && this.sfxEngine) {
      const anyMoving = playerMoving || anyCharMoving;
      const moveAnim = playerMoving ? "walk" : fastestMoveAnim;
      this.sfxEngine.tickPacer(dt, this.simTime, { anyMoving, moveAnim });
    }

    // 7. Check completion
    if (this.simTime >= this.duration - 1e-5 && !this.isFinished) {
      this.isFinished = true;
      this.isPlaying = false;
      this.sfxEngine?.stopBgm(this.simTime);
      this.emitState();
      if (this.onFinish) this.onFinish();
    } else {
      this.emitState();
    }
  }

  dispatchDueEvents(currentTime, { silentSeek = false } = {}) {
    while (
      this.nextEventIndex < this.events.length &&
      this.events[this.nextEventIndex].at <= currentTime + 1e-6
    ) {
      const ev = this.events[this.nextEventIndex];
      this.nextEventIndex += 1;
      this.executeBeat(ev, { silentSeek });
    }
  }

  executeBeat(ev, { silentSeek = false } = {}) {
    const type = ev.type;

    if (type === "player_walk" && this.playerCamera) {
      const from = {
        x: this.playerCamera.playerPos.x,
        y: this.playerCamera.playerPos.y,
        z: this.playerCamera.playerPos.z,
      };
      const stops = [...(ev.via || []), ev.to];
      let points = [];
      let cursor = from;
      for (const stop of stops) {
        const dst = this.resolveWaypoint(stop);
        const seg = this.computePath(cursor, dst);
        points = points.length === 0 ? seg : [...points, ...seg.slice(1)];
        cursor = dst;
      }
      this.playerCamera.startWalk({
        points,
        duration: ev.duration ?? 2.0,
        autoLook: ev.lookAhead !== false,
      });
      return;
    }

    if (type === "player_look" && this.playerCamera) {
      const dur = ev.duration ?? 0.2;
      this.playerCamera.lookAt(
        ev.target,
        { duration: dur, track: Boolean(ev.track) },
        this.resolver
      );
      if (!silentSeek) {
        this.sfxEngine?.notifyWhipPan(dur, this.simTime);
      }
      return;
    }

    if (type === "player_gesture" && this.playerCamera) {
      this.playerCamera.triggerGesture(ev.gesture, ev.duration ?? 0.8);
      return;
    }

    if (type === "player_crouch" && this.playerCamera) {
      this.playerCamera.crouch({
        crouched: Boolean(ev.crouched),
        duration: ev.duration ?? 0.35,
      });
      return;
    }

    if (type === "player_hold" && this.playerCamera) {
      if (ev.prop !== undefined && ev.prop !== this.playerCamera.heldPropType) {
        this.playerCamera.holdProp(ev.prop ?? null);
        if (!silentSeek && ev.prop) {
          this.sfxEngine?.notifyPickup(ev.prop, this.simTime);
        }
      }
      if (ev.use) {
        this.playerCamera.useHeldProp();
      }
      return;
    }

    if (type === "fade" && this.playerCamera) {
      this.playerCamera.startFade({
        to: ev.to ?? 0,
        duration: ev.duration ?? 0.6,
      });
      return;
    }

    if (type === "char_anim" || type === "anim") {
      const actor = this.characters[ev.actor];
      if (!actor) return;
      actor.playAnim(
        ev.anim,
        ev.fadeDuration ?? 0.16,
        ev.speed ?? null,
        ev.loop !== undefined ? ev.loop : null
      );
      if (!silentSeek) {
        this.sfxEngine?.notifyAction(ev.anim, this.simTime);
      }
      return;
    }

    if (type === "char_move" || type === "move") {
      const actor = this.characters[ev.actor];
      if (!actor) return;

      this.activeCharMoves = this.activeCharMoves.filter((m) => m.actor !== actor);
      const from = ev.from
        ? this.resolveWaypoint(ev.from)
        : {
            x: actor.root.position.x,
            y: actor.root.position.y,
            z: actor.root.position.z,
          };
      const stops = [...(ev.via || []), ev.to];
      let points = [];
      let cursor = from;
      for (const stop of stops) {
        const dst = this.resolveWaypoint(stop);
        const seg = this.computePath(cursor, dst);
        points = points.length === 0 ? seg : [...points, ...seg.slice(1)];
        cursor = dst;
      }

      const cumLengths = [0];
      let totalLength = 0;
      for (let i = 1; i < points.length; i++) {
        totalLength += points[i].distanceTo(points[i - 1]);
        cumLengths.push(totalLength);
      }

      const duration = Math.max(0.05, ev.duration ?? 1.5);
      const worldSpeed = totalLength / duration;
      const requestedAnim = ev.anim || "walk";
      const anim = LOCOMOTION_ANIMS.has(requestedAnim) ? requestedAnim : "walk";
      const animSpeed =
        ev.speed ?? THREE.MathUtils.clamp(worldSpeed / 1.35, 0.8, 1.75);

      if (!ev.keepFacing) {
        actor.lookAtPlayer(false);
      }
      actor.root.position.set(from.x, from.y ?? 0, from.z);
      actor.playAnim(anim, 0.14, animSpeed, true);

      this.activeCharMoves.push({
        actor,
        points,
        cumLengths,
        totalLength,
        anim,
        animSpeed,
        keepFacing: Boolean(ev.keepFacing),
        endAnim: ev.endAnim || "idle",
        startTime: ev.at,
        duration,
      });
      return;
    }

    if (type === "char_face" || type === "face") {
      const actor = this.characters[ev.actor];
      if (!actor) return;
      const speed = ev.instant ? 999 : 14;
      if (typeof ev.followPlayer === "boolean") {
        actor.lookAtPlayer(ev.followPlayer);
        if (ev.followPlayer && ev.instant && this.playerCamera) {
          actor.lookAt(this.playerCamera.camera.position);
        }
      }
      if (ev.target === "player" && this.playerCamera) {
        actor.faceTarget(this.playerCamera.camera.position, speed);
      } else if (ev.target) {
        actor.faceTarget(this.resolveWaypoint(ev.target), speed);
      }
      return;
    }

    if (type === "char_bubble") {
      const actor = this.characters[ev.actor];
      if (!actor) return;
      actor.showBubble(ev.icon || "question", ev.duration ?? 2.0);
      if (!silentSeek) {
        this.sfxEngine?.notifyBubblePop(ev.icon, this.simTime);
      }
      return;
    }

    if (type === "char_prop") {
      const actor = this.characters[ev.actor];
      if (!actor) return;
      actor.setProp(ev.prop ?? null);
      return;
    }

    if (type === "prop_action") {
      this.comedyProps?.performAction(ev.prop, ev.action, {
        at: ev.waypoint,
        to: ev.to,
        travelDuration: ev.travelDuration,
        yOffset: ev.yOffset ?? 0.25,
      });
      return;
    }

    if (type === "bgm" && !silentSeek) {
      this.sfxEngine?.playBgm(ev.sound, {
        volume: ev.volume ?? 0.24,
        simTime: this.simTime,
      });
      return;
    }

    if (type === "stop_bgm" && !silentSeek) {
      this.sfxEngine?.stopBgm(this.simTime);
      return;
    }

    if (type === "sfx" && !silentSeek) {
      this.sfxEngine?.play(ev.sound, {
        volume: ev.volume,
        pitch: ev.pitch ?? 1.0,
        simTime: this.simTime,
        cutBgm: Boolean(ev.cutBgm),
        cutBgmDuration: ev.cutBgmDuration ?? 1.4,
      });
    }
  }

  emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        simTime: this.simTime,
        duration: this.duration,
        isPlaying: this.isPlaying,
        isFinished: this.isFinished,
      });
    }
  }
}
