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
    const buffer = this.buffers.get(key);
    const meta = SFX_MANIFEST[key];
    if (!buffer || !meta) return false;

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

    const randomJitter =
      pitchJitter > 0 ? (Math.random() * 2 - 1) * pitchJitter : 0;
    source.playbackRate.value = Math.max(0.5, Math.min(2.0, pitch + randomJitter));

    const gainNode = ctx.createGain();
    const targetVol = volume ?? meta.defaultVolume ?? 0.7;
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
  // High-Retention Cartoon SFX Pacer Hooks (1.0s – 2.0s comedic audio cadence)
  // ---------------------------------------------------------------------------
  notifyCameraCut(mode, cutType, simTime) {
    if (!this.pacerEnabled) return;
    if (simTime - this.lastAnySfxTime < 0.45) return;

    if (mode === "dramatic_zoom" || mode === "closeup") {
      this.play(cutType === "whip" ? "swoosh" : "vine_boom", {
        volume: 0.62,
        pitchJitter: 0.08,
        simTime,
      });
    } else if (cutType === "whip") {
      this.play("whoosh", { volume: 0.58, pitchJitter: 0.1, simTime });
    } else {
      this.play("swoosh", { volume: 0.52, pitchJitter: 0.1, simTime });
    }
  }

  notifyDialogue(actorId, simTime) {
    if (!this.pacerEnabled) return;
    if (simTime - this.lastAnySfxTime < 0.35) return;
    const key = actorId === "granny" ? "pop" : "ding";
    this.play(key, { volume: 0.65, pitchJitter: 0.1, simTime });
  }

  notifyAction(animName, simTime) {
    if (!this.pacerEnabled) return;
    if (simTime - this.lastAnySfxTime < 0.45) return;

    const map = {
      jump: "whoosh",
      punch: "bonk",
      terrified: "glitch",
      laugh: "granny_laugh",
      sit: "aww",
    };
    const key = map[animName];
    if (key) {
      this.play(key, {
        volume: 0.62,
        pitchJitter: 0.08,
        simTime,
        maxDuration: 1.6,
      });
    }
  }

  /**
   * Called every simulation step while characters are active; keeps footsteps
   * and idle comedic pops landing every ~1.0 to 2.0 seconds.
   */
  tickPacer(simDt, simTime, { anyMoving = false, moveAnim = "walk" } = {}) {
    if (!this.pacerEnabled) return;

    // Context footsteps during walk/run/sneak
    if (anyMoving) {
      const stepPeriod =
        moveAnim === "run" || moveAnim === "run2"
          ? CONFIG.sfxPacer.footstepIntervalRun
          : moveAnim === "sneak"
            ? CONFIG.sfxPacer.footstepIntervalSneak
            : CONFIG.sfxPacer.footstepIntervalWalk;

      this.stepAccumulator += simDt;
      if (
        this.stepAccumulator >= stepPeriod &&
        simTime - this.lastPacerTime >= 0.95
      ) {
        this.stepAccumulator = 0;
        const stepSfx = moveAnim === "sneak" ? "squidward_walk" : "click";
        if (
          this.play(stepSfx, {
            volume: moveAnim === "sneak" ? 0.48 : 0.36,
            pitchJitter: 0.14,
            simTime,
            maxDuration: 0.65,
          })
        ) {
          this.lastPacerTime = simTime;
        }
      }
    }

    // Idle-gap filler ensuring a punchy cartoon SFX lands every 1.0–1.85s
    const gap = simTime - this.lastAnySfxTime;
    if (gap >= this.nextGapThreshold) {
      const accents = ["pop", "ding", "discord", "click", "checkmark", "rizz"];
      const choice = accents[Math.floor(Math.random() * accents.length)];
      if (
        this.play(choice, {
          volume: 0.5,
          pitchJitter: 0.12,
          simTime,
          maxDuration: 0.9,
        })
      ) {
        this.lastPacerTime = simTime;
        this.nextGapThreshold =
          CONFIG.sfxPacer.minIntervalSec +
          Math.random() *
            (CONFIG.sfxPacer.maxIntervalSec - CONFIG.sfxPacer.minIntervalSec);
      }
    }
  }
}
