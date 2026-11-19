import { CONFIG, SFX_MANIFEST } from "./config.js";

/**
 * Web Audio API SFX Engine with dual routing (live speakers + MediaStreamAudioDestinationNode
 * for WebM export) and a configurable 1–2s Cartoon SFX Pacer.
 */
export class SfxEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.compressor = null;
    this.streamDest = null;

    this.buffers = new Map();
    this.activeSources = new Set();
    this.lastPlayedByKey = new Map();

    this.pacerEnabled = CONFIG.sfxPacer.enabledByDefault;
    this.muted = false;
    this.lastAnySfxTime = -Infinity;
    this.lastPacerTime = -Infinity;
    this.stepAccumulator = 0;
    this.nextGapThreshold = 1.45;

    // Offline deterministic audio log for GitHub Actions / FFmpeg export
    this.exportMode = false;
    this.recordedEvents = [];
  }

  startEventCapture() {
    this.exportMode = true;
    this.recordedEvents = [];
    this.lastPlayedByKey.clear();
  }

  stopEventCapture() {
    this.exportMode = false;
    return [...this.recordedEvents];
  }

  getCapturedEvents() {
    return [...this.recordedEvents];
  }

  ensureContext() {
    if (this.ctx) return this.ctx;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();

    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -10;
    this.compressor.knee.value = 12;
    this.compressor.ratio.value = 6;
    this.compressor.attack.value = 0.004;
    this.compressor.release.value = 0.14;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : CONFIG.sfxPacer.masterVolume;

    this.streamDest = this.ctx.createMediaStreamDestination();

    // Route ALL SFX through compressor + masterGain -> live destination AND WebM recorder stream
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
    this.masterGain.connect(this.streamDest);

    return this.ctx;
  }

  async resume() {
    const ctx = this.ensureContext();
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
  }

  async preloadAll(onProgress = null) {
    const ctx = this.ensureContext();
    const entries = Object.entries(SFX_MANIFEST);
    let completed = 0;

    await Promise.all(
      entries.map(async ([key, meta]) => {
        try {
          const response = await fetch(encodeURI(meta.path));
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          this.buffers.set(key, audioBuffer);
        } catch (err) {
          console.warn(`[SfxEngine] Could not load SFX "${key}":`, err);
        } finally {
          completed += 1;
          if (onProgress) onProgress(completed, entries.length, key);
        }
      })
    );
  }

  getMediaStream() {
    this.ensureContext();
    return this.streamDest.stream;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.muted ? 0 : CONFIG.sfxPacer.masterVolume,
        this.ctx.currentTime,
        0.02
      );
    }
  }

  setPacerEnabled(enabled) {
    this.pacerEnabled = Boolean(enabled);
  }

  resetPacerClock(simTime = 0) {
    this.lastAnySfxTime = simTime - 0.5;
    this.lastPacerTime = simTime - 0.5;
    this.stepAccumulator = 0;
    this.nextGapThreshold = 1.25;
  }

  stopAll() {
    for (const src of this.activeSources) {
      try {
        src.stop();
      } catch {
        // Ignore already-stopped AudioBufferSourceNode
      }
    }
    this.activeSources.clear();
  }

  /**
   * Plays a preloaded sound effect with optional volume, pitch, and jitter.
   */
  play(
    key,
    {
      volume = null,
      pitch = 1.0,
      pitchJitter = 0.06,
      simTime = null,
      cooldown = CONFIG.sfxPacer.globalCooldownSec,
      maxDuration = null,
    } = {}
  ) {
    const meta = SFX_MANIFEST[key];
    if (!meta) return false;

    const randomJitter =
      pitchJitter > 0 ? (Math.random() * 2 - 1) * pitchJitter : 0;
    const effectivePitch = Math.max(0.5, Math.min(2.0, pitch + randomJitter));
    const targetVol = volume ?? meta.defaultVolume ?? 0.7;

    if (this.exportMode) {
      const clockTime = simTime ?? 0;
      const prevKeyTime = this.lastPlayedByKey.get(key) ?? -Infinity;
      if (clockTime - prevKeyTime < cooldown) {
        return false;
      }
      this.lastPlayedByKey.set(key, clockTime);
      if (simTime !== null) {
        this.lastAnySfxTime = simTime;
      }
      this.recordedEvents.push({
        time: Math.max(0, clockTime),
        key,
        path: meta.path,
        volume: targetVol,
        pitch: effectivePitch,
        maxDuration,
      });
      return true;
    }

    const buffer = this.buffers.get(key);
    if (!buffer) return false;

    const ctx = this.ensureContext();
    if (ctx.state !== "running") {
      return false;
    }

    const nowWall = ctx.currentTime;
    const prevKeyTime = this.lastPlayedByKey.get(key) ?? -Infinity;
    if (nowWall - prevKeyTime < cooldown) {
      return false;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = effectivePitch;

    const gainNode = ctx.createGain();
    gainNode.gain.value = targetVol;

    source.connect(gainNode);
    gainNode.connect(this.compressor);

    this.activeSources.add(source);
    this.lastPlayedByKey.set(key, nowWall);
    if (simTime !== null) {
      this.lastAnySfxTime = simTime;
    }

    source.onended = () => {
      this.activeSources.delete(source);
      gainNode.disconnect();
    };

    if (maxDuration && maxDuration > 0 && buffer.duration > maxDuration) {
      source.start(nowWall, 0, maxDuration);
    } else {
      source.start(nowWall);
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // Context-Matched Action & Footstep Foley (No Random SFX Spam)
  // ---------------------------------------------------------------------------
  notifyCameraCut(_mode, _cutType, _simTime) {
    // Intentionally silent unless explicitly scripted via an "sfx" timeline event.
  }

  notifyDialogue(_actorId, _simTime) {
    // Intentionally silent unless explicitly scripted via an "sfx" timeline event.
  }

  notifyAction(animName, simTime) {
    if (!this.pacerEnabled) return;

    const map = {
      jump: { key: "whoosh", volume: 0.48, pitch: 1.08, maxDuration: 0.55 },
      punch: { key: "bonk", volume: 0.78, pitch: 1.0, maxDuration: 0.9 },
      laugh: { key: "granny_laugh", volume: 0.75, pitch: 1.0, maxDuration: 1.4 },
    };
    const spec = map[animName];
    if (spec) {
      this.play(spec.key, {
        volume: spec.volume,
        pitch: spec.pitch,
        pitchJitter: 0.05,
        simTime,
        cooldown: 0.35,
        maxDuration: spec.maxDuration,
      });
    }
  }

  /**
   * Called every simulation step; plays rhythmic walking/running footsteps
   * strictly while actors are actively moving across the floor.
   */
  tickPacer(simDt, simTime, { anyMoving = false, moveAnim = "walk" } = {}) {
    if (!this.pacerEnabled) return;

    if (!anyMoving) {
      this.stepAccumulator = 0;
      return;
    }

    const isRun = moveAnim === "run" || moveAnim === "run2";
    const isSneak = moveAnim === "sneak";
    const stepPeriod = isRun
      ? CONFIG.sfxPacer.footstepIntervalRun
      : isSneak
        ? CONFIG.sfxPacer.footstepIntervalSneak
        : CONFIG.sfxPacer.footstepIntervalWalk;

    this.stepAccumulator += simDt;
    if (this.stepAccumulator >= stepPeriod) {
      this.stepAccumulator -= stepPeriod;
      this.play("squidward_walk", {
        volume: isRun ? 0.5 : isSneak ? 0.36 : 0.44,
        pitch: isRun ? 1.28 : isSneak ? 0.8 : 0.96,
        pitchJitter: 0.06,
        simTime,
        cooldown: 0.2,
        maxDuration: isRun ? 0.24 : 0.36,
      });
    }
  }
}
