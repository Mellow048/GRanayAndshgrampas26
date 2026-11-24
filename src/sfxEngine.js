import { CONFIG, SFX_MANIFEST } from "./config.js";

/**
 * Web Audio API Mixer with:
 * - Preloaded AudioBuffers from ./SoundEffects
 * - Looping BGM + comedic dead-silence "cutBgm" ducking
 * - Movement-synced footsteps (player + characters)
 * - Context-matched 1-2s Cartoon SFX Pacer (whip-pans, bubble pops, pickups, reactions)
 * - Dual routing to live speakers + MediaStreamAudioDestinationNode
 * - Offline event & BGM capture for GitHub Actions FFmpeg export
 */
export class SfxEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.bgmGain = null;
    this.compressor = null;
    this.streamDest = null;

    this.buffers = new Map();
    this.activeSources = new Set();
    this.lastPlayedByKey = new Map();

    // BGM state
    this.bgmSource = null;
    this.bgmKey = null;
    this.bgmVolume = 0.28;
    this.bgmDuckTimer = 0;

    this.pacerEnabled = CONFIG.sfxPacer.enabledByDefault;
    this.muted = false;
    this.lastAnySfxTime = -Infinity;
    this.stepAccumulator = 0;
    this.nextGapThreshold = 1.65;

    // Offline deterministic capture for FFmpeg export
    this.exportMode = false;
    this.recordedEvents = [];
    this.recordedBgm = []; // { startTime, endTime, path, volume }
    this.recordedDucks = []; // { startTime, endTime }
    this._activeExportBgm = null;
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

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = this.bgmVolume;
    this.bgmGain.connect(this.compressor);

    this.streamDest = this.ctx.createMediaStreamDestination();

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
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
    this.lastAnySfxTime = simTime - 0.4;
    this.stepAccumulator = 0;
    this.nextGapThreshold = 1.65;
    this.bgmDuckTimer = 0;
  }

  startEventCapture() {
    this.exportMode = true;
    this.recordedEvents = [];
    this.recordedBgm = [];
    this.recordedDucks = [];
    this._activeExportBgm = null;
    this.lastPlayedByKey.clear();
  }

  stopEventCapture(finalTime = null) {
    if (this._activeExportBgm && finalTime !== null) {
      this._activeExportBgm.endTime = Math.max(
        this._activeExportBgm.startTime,
        finalTime
      );
      this.recordedBgm.push(this._activeExportBgm);
      this._activeExportBgm = null;
    }
    this.exportMode = false;
    return {
      sfx: [...this.recordedEvents],
      bgm: [...this.recordedBgm],
      ducks: [...this.recordedDucks],
    };
  }

  playBgm(key, { volume = 0.25, simTime = 0 } = {}) {
    const meta = SFX_MANIFEST[key];
    if (!meta) return;

    if (this.exportMode) {
      if (this._activeExportBgm) {
        this._activeExportBgm.endTime = Math.max(
          this._activeExportBgm.startTime,
          simTime
        );
        this.recordedBgm.push(this._activeExportBgm);
      }
      this._activeExportBgm = {
        key,
        path: meta.path,
        volume,
        startTime: Math.max(0, simTime),
        endTime: null,
      };
      return;
    }

    this.stopBgm();
    const buffer = this.buffers.get(key);
    if (!buffer) return;
    const ctx = this.ensureContext();
    if (ctx.state !== "running") return;

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    this.bgmVolume = volume;
    this.bgmGain.gain.setValueAtTime(volume, ctx.currentTime);
    src.connect(this.bgmGain);
    src.start(ctx.currentTime);
    this.bgmSource = src;
    this.bgmKey = key;
  }

  stopBgm(simTime = 0) {
    if (this.exportMode && this._activeExportBgm) {
      this._activeExportBgm.endTime = Math.max(
        this._activeExportBgm.startTime,
        simTime
      );
      this.recordedBgm.push(this._activeExportBgm);
      this._activeExportBgm = null;
    }
    if (this.bgmSource) {
      try {
        this.bgmSource.stop();
      } catch {
        // Ignore already stopped
      }
      this.bgmSource = null;
      this.bgmKey = null;
    }
  }

  muteBgmFor(durationSec = 1.2, simTime = 0) {
    this.bgmDuckTimer = Math.max(this.bgmDuckTimer, durationSec);
    if (this.exportMode) {
      this.recordedDucks.push({
        startTime: Math.max(0, simTime),
        endTime: Math.max(0, simTime + durationSec),
      });
      return;
    }
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  stopAll() {
    this.stopBgm();
    for (const src of this.activeSources) {
      try {
        src.stop();
      } catch {
        // Ignore
      }
    }
    this.activeSources.clear();
  }

  play(
    key,
    {
      volume = null,
      pitch = 1.0,
      pitchJitter = 0.08,
      simTime = null,
      cooldown = CONFIG.sfxPacer.globalCooldownSec,
      maxDuration = null,
      cutBgm = false,
      cutBgmDuration = 1.4,
    } = {}
  ) {
    const meta = SFX_MANIFEST[key];
    if (!meta) return false;

    const randomJitter =
      pitchJitter > 0 ? (Math.random() * 2 - 1) * pitchJitter : 0;
    const effectivePitch = Math.max(0.5, Math.min(2.0, pitch + randomJitter));
    const targetVol = volume ?? meta.defaultVolume ?? 0.7;

    if (cutBgm) {
      this.muteBgmFor(cutBgmDuration, simTime ?? 0);
    }

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
    if (ctx.state !== "running") return false;

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
  // Kids-Comedy POV Foley & 1-2s Slapstick Pacer Hooks
  // ---------------------------------------------------------------------------
  notifyWhipPan(duration, simTime) {
    if (!this.pacerEnabled || duration > 0.25) return;
    if (simTime - this.lastAnySfxTime < 0.35) return;
    this.play("whoosh", {
      volume: 0.55,
      pitch: 1.05,
      pitchJitter: 0.08,
      simTime,
      maxDuration: 0.45,
    });
  }

  notifyBubblePop(iconName, simTime) {
    if (!this.pacerEnabled) return;
    if (simTime - this.lastAnySfxTime < 0.25) return;
    const key =
      iconName === "exclamation" || iconName === "angry" ? "discord" : "pop";
    this.play(key, {
      volume: 0.72,
      pitchJitter: 0.08,
      simTime,
      maxDuration: 0.65,
    });
  }

  notifyPickup(propName, simTime) {
    if (!this.pacerEnabled || !propName) return;
    this.play("kaching", {
      volume: 0.68,
      pitchJitter: 0.06,
      simTime,
      maxDuration: 0.9,
    });
  }

  notifyAction(animName, simTime) {
    if (!this.pacerEnabled) return;
    if (simTime - this.lastAnySfxTime < 0.35) return;
    const map = {
      jump: { key: "whoosh", volume: 0.5, pitch: 1.08, maxDuration: 0.55 },
      punch: { key: "bonk", volume: 0.78, pitch: 1.0, maxDuration: 0.85 },
      laugh: { key: "granny_laugh", volume: 0.72, pitch: 1.0, maxDuration: 1.35 },
      terrified: { key: "glitch", volume: 0.55, pitch: 1.05, maxDuration: 0.8 },
      panic: { key: "glitch", volume: 0.62, pitch: 1.12, maxDuration: 0.85 },
    };
    const spec = map[animName];
    if (spec) {
      this.play(spec.key, {
        volume: spec.volume,
        pitch: spec.pitch,
        pitchJitter: 0.06,
        simTime,
        cooldown: 0.35,
        maxDuration: spec.maxDuration,
      });
    }
  }

  tickPacer(simDt, simTime, { anyMoving = false, moveAnim = "walk", movingActors = [], playerMoving = false } = {}) {
    // Restore ducked BGM smoothly after comedy silence cut
    if (!this.exportMode && this.bgmDuckTimer > 0) {
      this.bgmDuckTimer = Math.max(0, this.bgmDuckTimer - simDt);
      if (this.bgmDuckTimer === 0 && this.bgmGain && this.ctx) {
        this.bgmGain.gain.setTargetAtTime(this.bgmVolume, this.ctx.currentTime, 0.08);
      }
    }

    if (!this.pacerEnabled) return;

    if (anyMoving) {
      const isRun = moveAnim === "run" || moveAnim === "run2";
      const isSneak = moveAnim === "sneak";
      const stepPeriod = isRun
        ? CONFIG.sfxPacer.footstepIntervalRun
        : isSneak
          ? CONFIG.sfxPacer.footstepIntervalSneak
          : CONFIG.sfxPacer.footstepIntervalWalk;

      // Distinct footstep timbre per character so multi-actor chases don't sound identical
      const primaryActor = movingActors?.[0]?.id || (playerMoving ? "player" : "granny");
      const actorBasePitch =
        primaryActor === "grandpa" ? 0.8 : primaryActor === "granny" ? 1.06 : 0.94;
      const animMul = isRun ? 1.24 : isSneak ? 0.84 : 1.0;

      this.stepAccumulator += simDt;
      if (this.stepAccumulator >= stepPeriod) {
        this.stepAccumulator -= stepPeriod;
        this.play("squidward_walk", {
          volume: isRun ? 0.28 : isSneak ? 0.18 : 0.22,
          pitch: actorBasePitch * animMul,
          pitchJitter: 0.07,
          simTime,
          cooldown: 0.34,
          maxDuration: isRun ? 0.18 : 0.26,
        });
      }
      return;
    }

    this.stepAccumulator = 0;

    // Do NOT inject random phantom pop/ding/click cues during quiet beats —
    // let authored SFX and BGM control the comedy timing cleanly.
  }
}
