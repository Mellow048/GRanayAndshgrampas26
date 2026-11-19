import * as THREE from "three";
import { CONFIG, SET_MAP } from "./config.js";
import { instantiateCharacter } from "./assetLoader.js";

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

/**
 * Deterministic 60Hz Fixed-Timestep Episode Timeline Runner.
 * Resolves all spatial targets strictly via SET_MAP waypoint names.
 */
export class EpisodeRunner {
  constructor({
    scene,
    characterTemplates,
    animationLibrary,
    sfxEngine,
    cameraDirector,
    waypoints = SET_MAP,
    onCaptionChange = null,
    onTimeUpdate = null,
    onEpisodeEnd = null,
  }) {
    this.scene = scene;
    this.characterTemplates = characterTemplates;
    this.animationLibrary = animationLibrary;
    this.sfxEngine = sfxEngine;
    this.cameraDirector = cameraDirector;
    this.waypoints = waypoints;

    this.onCaptionChange = onCaptionChange;
    this.onTimeUpdate = onTimeUpdate;
    this.onEpisodeEnd = onEpisodeEnd;

    this.actorsGroup = new THREE.Group();
    this.actorsGroup.name = "EpisodeCast";
    this.scene.add(this.actorsGroup);

    this.episode = null;
    this.actors = new Map();
    this.sortedEvents = [];

    this.simTime = 0;
    this.accumulator = 0;
    this.nextEventIdx = 0;
    this.playing = false;
    this.ended = false;
    this.speedScale = 1.0;

    this.activeMoves = new Map(); // actorId -> { from, to, startTime, duration, anim }
    this.activeDialogues = []; // { actorId, text, endTime }
    this.lastCaptionKey = "";

    this._resolver = {
      getActor: (id) => this.actors.get(id) || null,
      getWaypoint: (name) => this.waypoints[name] || null,
    };
  }

  getWaypoint(name) {
    const wp = this.waypoints[name];
    if (!wp) {
      throw new Error(
        `Unknown SET_MAP waypoint "${name}". Available: ${Object.keys(this.waypoints).join(", ")}`
      );
    }
    return wp;
  }

  loadEpisode(episodeData) {
    if (!episodeData || !Array.isArray(episodeData.cast) || !Array.isArray(episodeData.timeline)) {
      throw new Error("Episode JSON must include 'cast' array and 'timeline' array.");
    }

    this.disposeCast();
    this.episode = structuredClone(episodeData);
    this.sortedEvents = [...this.episode.timeline].sort((a, b) => a.time - b.time);

    // Instantiate each cast member cleanly via SkeletonUtils.clone
    for (const member of this.episode.cast) {
      const template = this.characterTemplates.get(member.asset);
      if (!template) {
        throw new Error(`Unknown character asset "${member.asset}" in cast.`);
      }
      const clips = this.animationLibrary.buildClipsForCharacter(template);
      const actor = instantiateCharacter(member.id, template, clips);
      this.actors.set(member.id, actor);
      this.actorsGroup.add(actor.root);
    }

    this.resetToStart();
  }

  resetToStart() {
    if (!this.episode) return;

    this.sfxEngine.stopAll();
    this.sfxEngine.resetPacerClock(0);
    this.cameraDirector.reset();

    this.simTime = 0;
    this.accumulator = 0;
    this.nextEventIdx = 0;
    this.ended = false;
    this.activeMoves.clear();
    this.activeDialogues = [];
    this._emitCaption(null);

    for (const member of this.episode.cast) {
      const actor = this.actors.get(member.id);
      if (!actor) continue;
      actor.resetPose();

      const spawnWp = this.getWaypoint(member.spawn);
      actor.root.position.set(spawnWp.x, spawnWp.y, spawnWp.z);
      if (member.facing && this.waypoints[member.facing]) {
        actor.lookAt(this.waypoints[member.facing]);
      } else {
        actor.root.rotation.set(0, 0, 0);
      }
      actor.playAnimation("idle", 0);
      actor.update(0);
    }

    // Trigger t=0 events immediately so initial frame is already posed & framed
    this._dispatchEventsUpTo(0, { silent: true });
    this.cameraDirector.update(0, this._resolver);

    if (this.onTimeUpdate) {
      this.onTimeUpdate(this.simTime, this.episode.duration);
    }
  }

  play() {
    if (!this.episode) return;
    if (this.ended) {
      this.resetToStart();
    }
    this.playing = true;
  }

  pause() {
    this.playing = false;
    this.sfxEngine.stopAll();
  }

  restart({ autoplay = true } = {}) {
    this.resetToStart();
    this.playing = autoplay;
  }

  setSpeed(speed) {
    this.speedScale = clamp(Number(speed) || 1.0, 0.25, 3.0);
  }

  /**
   * Deterministically scrubs to any timestamp in [0, duration] using fixed 60Hz steps.
   */
  seek(targetTime) {
    if (!this.episode) return;
    const clampedTarget = clamp(targetTime, 0, this.episode.duration);
    const wasPlaying = this.playing;
    this.playing = false;

    this.resetToStart();

    const step = CONFIG.fixedDt;
    while (this.simTime + step <= clampedTarget + 1e-6) {
      this._stepFixed(step, { silent: true });
    }
    const remainder = clampedTarget - this.simTime;
    if (remainder > 1e-5) {
      this._stepFixed(remainder, { silent: true });
    }

    if (this.onTimeUpdate) {
      this.onTimeUpdate(this.simTime, this.episode.duration);
    }
    this.playing = wasPlaying && !this.ended;
  }

  update(rawDt) {
    if (!this.episode) return;

    if (!this.playing) {
      this.cameraDirector.update(Math.min(rawDt, CONFIG.maxFrameDt), this._resolver);
      return;
    }

    const scaledDt = Math.min(rawDt, CONFIG.maxFrameDt) * this.speedScale;
    this.accumulator += scaledDt;

    while (this.accumulator >= CONFIG.fixedDt && !this.ended) {
      this._stepFixed(CONFIG.fixedDt, { silent: false });
      this.accumulator -= CONFIG.fixedDt;
    }

    if (this.onTimeUpdate) {
      this.onTimeUpdate(this.simTime, this.episode.duration);
    }
  }

  _stepFixed(dt, { silent = false } = {}) {
    this.simTime += dt;

    this._dispatchEventsUpTo(this.simTime, { silent });
    this._updateMoves(dt);
    this._updateDialogues();

    for (const actor of this.actors.values()) {
      actor.update(dt);
    }

    this.cameraDirector.update(dt, this._resolver);

    if (!silent) {
      const firstMove = this.activeMoves.values().next().value;
      this.sfxEngine.tickPacer(dt, this.simTime, {
        anyMoving: this.activeMoves.size > 0,
        moveAnim: firstMove ? firstMove.anim : "walk",
      });
    }

    if (this.simTime >= this.episode.duration && !this.ended) {
      this.simTime = this.episode.duration;
      this.ended = true;
      this.playing = false;
      this._emitCaption(null);
      for (const actor of this.actors.values()) {
        actor.setSpeaking(false);
      }
      if (!silent && this.onEpisodeEnd) {
        this.onEpisodeEnd();
      }
    }
  }

  _dispatchEventsUpTo(timeSec, { silent = false } = {}) {
    while (
      this.nextEventIdx < this.sortedEvents.length &&
      this.sortedEvents[this.nextEventIdx].time <= timeSec + 1e-6
    ) {
      const evt = this.sortedEvents[this.nextEventIdx];
      this.nextEventIdx += 1;
      this._executeEvent(evt, { silent });
    }
  }

  _executeEvent(evt, { silent = false } = {}) {
    switch (evt.type) {
      case "move": {
        const actor = this.actors.get(evt.actor);
        if (!actor) break;
        const dest = this.getWaypoint(evt.to);
        const from = actor.root.position.clone();
        const anim = evt.anim || "walk";
        const duration = Math.max(0.1, evt.duration ?? 2.0);

        actor.lookAt(dest);
        actor.playAnimation(
          anim,
          CONFIG.defaultFadeDuration,
          evt.speed ?? null,
          true
        );

        this.activeMoves.set(evt.actor, {
          from,
          to: new THREE.Vector3(dest.x, dest.y, dest.z),
          startTime: evt.time,
          duration,
          anim,
        });
        break;
      }

      case "action": {
        const actor = this.actors.get(evt.actor);
        if (!actor) break;
        this.activeMoves.delete(evt.actor);
        if (evt.facing) {
          const lookTarget = this.actors.get(evt.facing)?.root.position || this.getWaypoint(evt.facing);
          actor.lookAt(lookTarget);
        }
        actor.playAnimation(
          evt.anim || "idle",
          evt.fade ?? CONFIG.defaultFadeDuration,
          evt.speed ?? null,
          evt.loop ?? null
        );
        if (!silent) {
          this.sfxEngine.notifyAction(evt.anim, this.simTime);
        }
        break;
      }

      case "dialogue": {
        const actor = this.actors.get(evt.actor);
        if (actor) {
          actor.setSpeaking(true);
        }
        const dur = evt.duration ?? 2.0;
        this.activeDialogues.push({
          actorId: evt.actor,
          speakerLabel: actor ? actor.spec.label : evt.actor,
          text: evt.text || "",
          endTime: evt.time + dur,
        });
        if (!silent) {
          this.sfxEngine.notifyDialogue(evt.actor, this.simTime);
        }
        break;
      }

      case "camera": {
        this.cameraDirector.applyShot(evt, this._resolver);
        if (!silent) {
          this.sfxEngine.notifyCameraCut(evt.mode, evt.cut, this.simTime);
        }
        break;
      }

      case "sfx": {
        if (!silent) {
          this.sfxEngine.play(evt.sound, {
            volume: evt.volume ?? null,
            pitch: evt.pitch ?? 1.0,
            pitchJitter: evt.pitchJitter ?? 0.05,
            simTime: this.simTime,
          });
        }
        break;
      }

      default:
        break;
    }
  }

  _updateMoves() {
    for (const [actorId, move] of this.activeMoves.entries()) {
      const actor = this.actors.get(actorId);
      if (!actor) {
        this.activeMoves.delete(actorId);
        continue;
      }

      const rawT = clamp((this.simTime - move.startTime) / move.duration, 0, 1);
      const t = easeInOutSine(rawT);
      actor.root.position.lerpVectors(move.from, move.to, t);
      actor.lookAt(move.to);

      if (rawT >= 1) {
        actor.root.position.copy(move.to);
        this.activeMoves.delete(actorId);
        actor.playAnimation("idle", CONFIG.defaultFadeDuration);
      }
    }
  }

  _updateDialogues() {
    this.activeDialogues = this.activeDialogues.filter(
      (d) => this.simTime < d.endTime
    );

    const speakingActors = new Set(this.activeDialogues.map((d) => d.actorId));
    for (const [id, actor] of this.actors.entries()) {
      actor.setSpeaking(speakingActors.has(id));
    }

    const latest =
      this.activeDialogues.length > 0
        ? this.activeDialogues[this.activeDialogues.length - 1]
        : null;
    this._emitCaption(latest);
  }

  _emitCaption(captionObj) {
    const key = captionObj ? `${captionObj.speakerLabel}:${captionObj.text}` : "";
    if (key === this.lastCaptionKey) return;
    this.lastCaptionKey = key;
    if (this.onCaptionChange) {
      this.onCaptionChange(captionObj);
    }
  }

  disposeCast() {
    this.playing = false;
    this.sfxEngine.stopAll();
    for (const actor of this.actors.values()) {
      this.actorsGroup.remove(actor.root);
      actor.dispose();
    }
    this.actors.clear();
  }

  dispose() {
    this.disposeCast();
    this.scene.remove(this.actorsGroup);
  }
}
