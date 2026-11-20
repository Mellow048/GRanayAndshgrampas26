import * as THREE from "three";
import { CONFIG, SET_MAP } from "./config.js";

const LOCOMOTION_ANIMS = new Set(["walk", "run", "run2", "sneak", "granny_walk", "jump"]);
const PLAYER_PERSONAL_SPACE = 1.3;
const ACTOR_SEPARATION = 1.05;

const STAIRS_BOTTOM = new THREE.Vector3(-1.9, 0.0, 4.0);
const STAIRS_MIDDLE = new THREE.Vector3(-1.9, 1.54, 2.5);
const STAIRS_TOP = new THREE.Vector3(-1.9, 2.85, 1.25);
const UPSTAIRS_LANDING = new THREE.Vector3(-1.9, 2.85, 0.95);

function getFloorIndex(y) {
  return y < 2.1 ? 1 : 2;
}

function getBaseFloorY(y) {
  return getFloorIndex(y) === 1 ? 0.0 : 2.85;
}

function isOnStairs(pos) {
  return (
    pos.x >= -2.7 &&
    pos.x <= -1.1 &&
    pos.z >= 1.15 &&
    pos.z <= 4.15 &&
    pos.y >= 0.12 &&
    pos.y <= 2.75
  );
}

function isElevatedSurfacePos(pos) {
  if (isOnStairs(pos)) return false;
  const floorY = getBaseFloorY(pos.y);
  return Math.abs(pos.y - floorY) > 0.25;
}

/**
 * Deterministic 60Hz POV Episode & Multi-Skit Beat Runner.
 * Supports:
 *  - Asynchronous sequential timeline gating (`await: true` / `sync: "sequential"`)
 *  - Cross-floor staircase routing (`stairs_bottom -> stairs_middle -> stairs_top`) with 3D/vertical speed clamping
 *  - Elevated furniture approach + jump-arc hopping
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
    this.activeBarrier = null;
    this.nextMoveId = 1;

    this.simTime = 0;
    this.timelineTime = 0;
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
      if (SET_MAP[target]) return { ...SET_MAP[target], _name: target };
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
    return {
      x: target.x ?? 0,
      y: target.y ?? 0,
      z: target.z ?? 0,
      approach: target.approach,
    };
  }

  _findClosestApproach(pos, preferredRef = null) {
    const floorY = getBaseFloorY(pos.y);
    if (preferredRef && SET_MAP[preferredRef]) {
      const wp = SET_MAP[preferredRef];
      return new THREE.Vector3(wp.x, wp.y ?? floorY, wp.z);
    }
    // Search SET_MAP for closest non-elevated waypoint on same floor
    let best = null;
    let bestDist = Infinity;
    for (const wp of Object.values(SET_MAP)) {
      if (wp.elevated) continue;
      if (Math.abs((wp.y ?? 0) - floorY) > 0.25) continue;
      const d = Math.hypot(wp.x - pos.x, wp.z - pos.z);
      if (d > 0.35 && d < 3.0 && d < bestDist) {
        bestDist = d;
        best = wp;
      }
    }
    if (best) {
      return new THREE.Vector3(best.x, best.y ?? floorY, best.z);
    }
    return new THREE.Vector3(pos.x, floorY, pos.z);
  }

  _appendFlatRoute(chain, aVec, bVec, floorY) {
    const startFlat = new THREE.Vector3(aVec.x, floorY, aVec.z);
    const goalFlat = new THREE.Vector3(bVec.x, floorY, bVec.z);
    if (startFlat.distanceTo(goalFlat) < 0.08) return;

    if (
      floorY < 0.25 &&
      this.house &&
      typeof this.house.findPath === "function"
    ) {
      const path = this.house.findPath(startFlat, goalFlat);
      if (path && path.length >= 2) {
        for (let i = 1; i < path.length; i += 1) {
          const p = path[i];
          chain.push({
            pt: new THREE.Vector3(p.x, floorY, p.z),
            isJumpArc: false,
            arcHeight: 0,
          });
        }
        return;
      }
    }
    chain.push({ pt: goalFlat, isJumpArc: false, arcHeight: 0 });
  }

  /**
   * Builds a 3D path + per-segment metadata (jump arcs vs stair ramps vs flat walk)
   * ensuring cross-floor transitions ALWAYS pass sequentially through
   * `stairs_bottom <-> stairs_middle <-> stairs_top`.
   */
  buildPathWithSegments(fromPos, toPos) {
    const startVec = new THREE.Vector3(fromPos.x, fromPos.y ?? 0, fromPos.z);
    const goalVec = new THREE.Vector3(toPos.x, toPos.y ?? 0, toPos.z);

    if (startVec.distanceTo(goalVec) < 0.05) {
      return { points: [startVec, goalVec], segments: [{ isJumpArc: false, arcHeight: 0 }] };
    }

    const startFloor = getFloorIndex(startVec.y);
    const goalFloor = getFloorIndex(goalVec.y);
    const startOnStairs = isOnStairs(startVec);
    const goalOnStairs = isOnStairs(goalVec);

    const chain = [{ pt: startVec.clone(), isJumpArc: false, arcHeight: 0 }];
    let cursor = startVec.clone();

    // Direct short furniture-to-furniture hop on the same floor
    const sameFloorElevated =
      startFloor === goalFloor &&
      isElevatedSurfacePos(startVec) &&
      isElevatedSurfacePos(goalVec) &&
      Math.hypot(goalVec.x - startVec.x, goalVec.z - startVec.z) < 2.2;

    if (sameFloorElevated) {
      chain.push({
        pt: goalVec.clone(),
        isJumpArc: true,
        arcHeight: 0.34,
      });
      return this._finalizeChain(chain);
    }

    // Step off elevated furniture if starting on one
    if (isElevatedSurfacePos(cursor)) {
      const dropPt = this._findClosestApproach(cursor, fromPos.approach);
      chain.push({
        pt: dropPt.clone(),
        isJumpArc: true,
        arcHeight: Math.min(0.45, 0.22 + Math.abs(cursor.y - dropPt.y) * 0.22),
      });
      cursor = dropPt;
    }

    if (startFloor !== goalFloor || startOnStairs || goalOnStairs) {
      const goingUp =
        goalFloor > startFloor || (startFloor === goalFloor && goalVec.y > startVec.y + 0.35);
      const goingDown =
        goalFloor < startFloor || (startFloor === goalFloor && goalVec.y < startVec.y - 0.35);

      if (goingUp) {
        if (!startOnStairs && startFloor === 1) {
          this._appendFlatRoute(chain, cursor, STAIRS_BOTTOM, 0.0);
          chain.push({ pt: STAIRS_BOTTOM.clone(), isJumpArc: false, arcHeight: 0 });
          cursor = STAIRS_BOTTOM.clone();
        }
        const stairSeq = [STAIRS_BOTTOM, STAIRS_MIDDLE, STAIRS_TOP];
        for (const node of stairSeq) {
          if (node.z < cursor.z - 0.12 && node.y >= cursor.y - 0.05) {
            chain.push({ pt: node.clone(), isJumpArc: false, arcHeight: 0 });
            cursor = node.clone();
          }
        }
        if (goalFloor === 2) {
          if (UPSTAIRS_LANDING.z < cursor.z - 0.08) {
            chain.push({ pt: UPSTAIRS_LANDING.clone(), isJumpArc: false, arcHeight: 0 });
            cursor = UPSTAIRS_LANDING.clone();
          }
          if (isElevatedSurfacePos(goalVec)) {
            const app = this._findClosestApproach(goalVec, toPos.approach);
            this._appendFlatRoute(chain, cursor, app, 2.85);
            chain.push({
              pt: goalVec.clone(),
              isJumpArc: true,
              arcHeight: Math.min(0.62, 0.32 + Math.abs(goalVec.y - 2.85) * 0.25),
            });
          } else if (!goalOnStairs) {
            this._appendFlatRoute(chain, cursor, goalVec, goalVec.y);
          }
        } else if (goalOnStairs) {
          chain.push({ pt: goalVec.clone(), isJumpArc: false, arcHeight: 0 });
        }
      } else if (goingDown) {
        if (!startOnStairs && startFloor === 2) {
          this._appendFlatRoute(chain, cursor, UPSTAIRS_LANDING, 2.85);
          chain.push({ pt: UPSTAIRS_LANDING.clone(), isJumpArc: false, arcHeight: 0 });
          cursor = UPSTAIRS_LANDING.clone();
        }
        const stairSeq = [STAIRS_TOP, STAIRS_MIDDLE, STAIRS_BOTTOM];
        for (const node of stairSeq) {
          if (node.z > cursor.z + 0.12 && node.y <= cursor.y + 0.05) {
            chain.push({ pt: node.clone(), isJumpArc: false, arcHeight: 0 });
            cursor = node.clone();
          }
        }
        if (goalFloor === 1) {
          if (isElevatedSurfacePos(goalVec)) {
            const app = this._findClosestApproach(goalVec, toPos.approach);
            this._appendFlatRoute(chain, cursor, app, 0.0);
            chain.push({
              pt: goalVec.clone(),
              isJumpArc: true,
              arcHeight: Math.min(0.58, 0.30 + Math.abs(goalVec.y - 0.0) * 0.24),
            });
          } else if (!goalOnStairs) {
            this._appendFlatRoute(chain, cursor, goalVec, goalVec.y);
          }
        } else if (goalOnStairs) {
          chain.push({ pt: goalVec.clone(), isJumpArc: false, arcHeight: 0 });
        }
      } else {
        chain.push({ pt: goalVec.clone(), isJumpArc: false, arcHeight: 0 });
      }
      return this._finalizeChain(chain);
    }

    // Same floor routing
    const floorY = getBaseFloorY(goalVec.y);
    if (isElevatedSurfacePos(goalVec)) {
      const app = this._findClosestApproach(goalVec, toPos.approach);
      this._appendFlatRoute(chain, cursor, app, floorY);
      chain.push({
        pt: goalVec.clone(),
        isJumpArc: true,
        arcHeight: Math.min(0.62, 0.30 + Math.abs(goalVec.y - floorY) * 0.25),
      });
    } else {
      this._appendFlatRoute(chain, cursor, goalVec, floorY);
    }

    return this._finalizeChain(chain);
  }

  _finalizeChain(chain) {
    const points = [chain[0].pt];
    const segments = [];
    for (let i = 1; i < chain.length; i += 1) {
      const prev = points[points.length - 1];
      const next = chain[i].pt;
      if (prev.distanceTo(next) < 0.06) continue;
      points.push(next);
      segments.push({
        isJumpArc: Boolean(chain[i].isJumpArc),
        arcHeight: chain[i].arcHeight || 0,
      });
    }
    if (points.length < 2) {
      points.push(chain[chain.length - 1].pt.clone());
      segments.push({ isJumpArc: false, arcHeight: 0 });
    }
    return { points, segments };
  }

  computePath(fromPos, toPos) {
    return this.buildPathWithSegments(fromPos, toPos).points;
  }

  _buildFullStopChain(from, stops) {
    const allPoints = [];
    const allSegments = [];
    let cursor = from;
    for (const stop of stops) {
      const dst = this.resolveWaypoint(stop);
      const { points, segments } = this.buildPathWithSegments(cursor, dst);
      if (allPoints.length === 0) {
        allPoints.push(...points);
        allSegments.push(...segments);
      } else {
        for (let i = 1; i < points.length; i += 1) {
          const prev = allPoints[allPoints.length - 1];
          if (prev.distanceTo(points[i]) >= 0.06) {
            allPoints.push(points[i]);
            allSegments.push(segments[i - 1]);
          }
        }
      }
      cursor = dst;
    }
    if (allPoints.length < 2) {
      const p0 = new THREE.Vector3(from.x, from.y ?? 0, from.z);
      return {
        points: [p0, p0.clone()],
        segments: [{ isJumpArc: false, arcHeight: 0 }],
      };
    }
    return { points: allPoints, segments: allSegments };
  }

  _computeMoveTiming(points, segments, requestedDuration, requestedAnim, isPlayer = false) {
    const isRun = requestedAnim === "run" || requestedAnim === "run2";
    const maxFlatSpeed = isPlayer ? 3.2 : isRun ? 3.8 : 2.4;
    const maxStairSpeed3D = isPlayer ? 2.15 : isRun ? 2.65 : 1.95;
    const maxVertSpeed = isPlayer ? 1.55 : isRun ? 1.75 : 1.35;

    const cumWeights = [0];
    let totalWeight = 0;
    let totalLength = 0;
    const segInfo = [];

    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1];
      const b = points[i];
      const segLen = a.distanceTo(b);
      const dy = Math.abs(b.y - a.y);
      const meta = segments[i - 1] || { isJumpArc: false, arcHeight: 0 };
      const isStair = !meta.isJumpArc && dy > 0.15;

      let minSegDur;
      if (meta.isJumpArc) {
        minSegDur = Math.max(0.45, segLen / 2.6);
      } else if (isStair) {
        minSegDur = Math.max(segLen / maxStairSpeed3D, dy / maxVertSpeed);
      } else {
        minSegDur = segLen / maxFlatSpeed;
      }

      totalLength += segLen;
      totalWeight += Math.max(1e-4, minSegDur);
      cumWeights.push(totalWeight);
      segInfo.push({
        ...meta,
        isStair,
        segLen,
        minSegDur,
      });
    }

    const effectiveDuration = Math.max(0.05, requestedDuration ?? 1.5, totalWeight);
    return {
      effectiveDuration,
      cumWeights,
      totalWeight,
      totalLength,
      segInfo,
      maxVertSpeed,
    };
  }

  compileTimeline(episode) {
    const rawEvents = [];

    if (Array.isArray(episode.skits)) {
      let skitCursor = 0;
      for (const skit of episode.skits) {
        let beatCursor = skit.startAt ?? skitCursor;
        let skitMaxEnd = beatCursor;
        const skitSeq = skit.sync === "sequential";

        for (const beat of skit.beats || []) {
          let at = beatCursor;
          if (typeof beat.at === "number") {
            at = beat.at;
          } else if (typeof beat.after === "number") {
            at = beatCursor + beat.after;
          }
          const duration = Math.max(0, beat.duration ?? 0);
          const isAwait =
            beat.await === true || beat.sync === "sequential" || skitSeq;
          rawEvents.push({
            ...beat,
            await: isAwait || beat.await === true,
            at,
            duration,
          });
          beatCursor = isAwait ? at + duration : at;
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

  _estimateEpisodeDuration(episode) {
    // Track virtual positions for accurate precomputed path lengths + await shifts
    const actorPos = {};
    for (const castEntry of episode.cast || []) {
      const sp = this.resolveWaypoint(castEntry.spawn || "back_hall");
      actorPos[castEntry.id] = { x: sp.x, y: sp.y ?? 0, z: sp.z };
    }
    const pSp = this.resolveWaypoint(episode.playerSpawn || "back_hall");
    let playerPos = { x: pSp.x, y: pSp.y ?? 0, z: pSp.z };

    let tlShift = 0;
    let barrierEndSim = 0;
    let maxEnd = 1.0;

    for (const ev of this.events) {
      let fireSim = ev.at + tlShift;
      if (fireSim < barrierEndSim) {
        tlShift += barrierEndSim - fireSim;
        fireSim = barrierEndSim;
      }

      let effDur = Math.max(0, ev.duration ?? 0);
      if (ev.type === "player_walk") {
        const stops = [...(ev.via || []), ev.to];
        const { points, segments } = this._buildFullStopChain(playerPos, stops);
        const timing = this._computeMoveTiming(points, segments, effDur, "walk", true);
        effDur = timing.effectiveDuration;
        const last = points[points.length - 1];
        playerPos = { x: last.x, y: last.y, z: last.z };
      } else if (ev.type === "char_move" || ev.type === "move") {
        const start = ev.from
          ? this.resolveWaypoint(ev.from)
          : actorPos[ev.actor] || { x: 0, y: 0, z: 0 };
        const stops = [...(ev.via || []), ev.to];
        const { points, segments } = this._buildFullStopChain(start, stops);
        const timing = this._computeMoveTiming(
          points,
          segments,
          effDur,
          ev.anim || "walk",
          false
        );
        effDur = timing.effectiveDuration;
        const last = points[points.length - 1];
        actorPos[ev.actor] = { x: last.x, y: last.y, z: last.z };
      } else if ((ev.type === "char_anim" || ev.type === "anim") && effDur === 0) {
        effDur = ev.loop ? 0.5 : 1.05;
      }

      maxEnd = Math.max(maxEnd, fireSim + effDur);
      if (ev.await === true || ev.sync === "sequential") {
        barrierEndSim = Math.max(barrierEndSim, fireSim + effDur);
      }
    }

    return maxEnd;
  }

  loadEpisode(episodeJson) {
    const episode =
      typeof episodeJson === "string" ? JSON.parse(episodeJson) : episodeJson;

    this.episode = episode;
    this.events = this.compileTimeline(episode);
    this.duration = this._estimateEpisodeDuration(episode);
    this.reset();
    return {
      title: episode.title ?? "Untitled Episode",
      duration: this.duration,
      eventCount: this.events.length,
    };
  }

  reset() {
    this.simTime = 0;
    this.timelineTime = 0;
    this.nextEventIndex = 0;
    this.activeCharMoves = [];
    this.activeBarrier = null;
    this.nextMoveId = 1;
    this.isPlaying = false;
    this.isFinished = false;
    this.sfxEngine?.stopAll();
    this.sfxEngine?.resetPacerClock(0);

    if (!this.episode) return;

    if (this.episode.aspect && this.playerCamera) {
      this.playerCamera.setAspect(this.episode.aspect);
    }

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

    this.comedyProps?.loadProps(this.episode.props || []);

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

  _checkBarrierResolved() {
    if (!this.activeBarrier) return true;
    if (this.activeBarrier.isDone()) {
      const done = this.activeBarrier;
      this.activeBarrier = null;
      done.resolve();
      return true;
    }
    return false;
  }

  step(dt, { silentSeek = false } = {}) {
    if (!this.episode) return;

    this.simTime += dt;

    // 1. Check sequential `await` / `sync: "sequential"` barrier before advancing timelineTime
    this._checkBarrierResolved();
    let freezeTimeline = false;
    if (this.activeBarrier && this.nextEventIndex < this.events.length) {
      const nextEv = this.events[this.nextEventIndex];
      if (nextEv.at <= this.timelineTime + dt + 1e-6) {
        freezeTimeline = true;
        this.timelineTime = Math.max(this.timelineTime, Math.min(nextEv.at, this.timelineTime + dt));
      }
    }

    if (!freezeTimeline) {
      this.timelineTime += dt;
    } else if (this.simTime > this.duration) {
      this.duration = this.simTime + 0.05;
    }

    // 2. Dispatch beats scheduled <= timelineTime (halts immediately when an awaited beat fires)
    this.dispatchDueEvents(this.timelineTime, { silentSeek });

    // 3. Advance character 3D polyline moves (with jump-arc hopping & stair vertical clamping)
    let anyCharMoving = false;
    let fastestMoveAnim = "walk";
    for (let i = this.activeCharMoves.length - 1; i >= 0; i--) {
      const m = this.activeCharMoves[i];
      const prevY = m.actor.root.position.y;
      const t =
        m.duration <= 0
          ? 1
          : Math.min(1, (this.simTime - m.startTime) / m.duration);
      const targetWeight = m.totalWeight * t;

      let segIdx = 0;
      while (
        segIdx < m.cumWeights.length - 2 &&
        m.cumWeights[segIdx + 1] < targetWeight
      ) {
        segIdx++;
      }

      const segStart = m.points[segIdx];
      const segEnd = m.points[segIdx + 1];
      const segSpan = Math.max(
        1e-5,
        m.cumWeights[segIdx + 1] - m.cumWeights[segIdx]
      );
      const localT = Math.max(
        0,
        Math.min(1, (targetWeight - m.cumWeights[segIdx]) / segSpan)
      );
      const segMeta = m.segInfo[segIdx] || {};

      m.actor.root.position.lerpVectors(segStart, segEnd, localT);

      if (segMeta.isJumpArc) {
        m.actor.root.position.y +=
          Math.sin(localT * Math.PI) * (segMeta.arcHeight || 0.42);
      } else if (segMeta.isStair) {
        const maxStepY = (m.maxVertSpeed || 1.55) * Math.max(dt, 1 / 120) * 1.35;
        const dyStep = m.actor.root.position.y - prevY;
        if (Math.abs(dyStep) > maxStepY) {
          m.actor.root.position.y = prevY + Math.sign(dyStep) * maxStepY;
        }
      }

      const dx = segEnd.x - segStart.x;
      const dz = segEnd.z - segStart.z;
      if (dx * dx + dz * dz > 1e-6 && !m.keepFacing) {
        m.actor.faceTarget(segEnd, 14);
      }

      const desiredAnim = segMeta.isJumpArc ? "jump" : m.anim;
      const act = m.actor.currentAction;
      if (segMeta.isJumpArc) {
        if (m.actor.currentAnimation !== "jump") {
          m.actor.playAnim("jump", 0.06, 1.15, false);
        }
      } else if (
        m.actor.currentAnimation !== desiredAnim ||
        !act ||
        act.paused ||
        act.loop !== THREE.LoopRepeat
      ) {
        m.actor.playAnim(desiredAnim, 0.08, m.animSpeed, true);
      }

      anyCharMoving = true;
      if (m.anim === "run" || m.anim === "run2") fastestMoveAnim = m.anim;

      if (t >= 1) {
        m.actor.root.position.copy(m.points[m.points.length - 1]);
        m.actor.playAnim(m.endAnim || "idle", 0.2, null, true);
        this.activeCharMoves.splice(i, 1);
      }
    }

    // 3b. Prevent standing ground-level actors from merging/clipping inside each other
    // (Skip elevated furniture & active stair moves so nobody gets pushed into thin air.)
    const visibleActors = Object.values(this.characters).filter((c) => c.root.visible);
    const movingActorSet = new Set(this.activeCharMoves.map((m) => m.actor));
    for (let i = 0; i < visibleActors.length; i += 1) {
      for (let j = i + 1; j < visibleActors.length; j += 1) {
        const actorA = visibleActors[i];
        const actorB = visibleActors[j];
        if (movingActorSet.has(actorA) || movingActorSet.has(actorB)) continue;
        const a = actorA.root.position;
        const b = actorB.root.position;
        if (Math.abs(a.y - b.y) > 0.55) continue;
        if (isElevatedSurfacePos(a) || isElevatedSurfacePos(b)) continue;
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
          if (!this.house || a.y >= 0.4 || this.house.isPointInsideWalkable(ax, az)) {
            a.x = ax;
            a.z = az;
          }
          if (!this.house || b.y >= 0.4 || this.house.isPointInsideWalkable(bx, bz)) {
            b.x = bx;
            b.z = bz;
          }
        }
      }
    }

    // 4. Advance PlayerCamera & enforce personal space around same-floor standing actors
    this.playerCamera?.update(dt, this.resolver);
    if (this.playerCamera && this.playerCamera.mode === "pov") {
      const pPos = this.playerCamera.playerPos;
      if (!this.playerCamera.isWalking && !isElevatedSurfacePos(pPos) && !isOnStairs(pPos)) {
        for (const actor of visibleActors) {
          if (Math.abs(pPos.y - actor.root.position.y) > 0.65) continue;
          const dx = pPos.x - actor.root.position.x;
          const dz = pPos.z - actor.root.position.z;
          const dist = Math.hypot(dx, dz);
          if (dist > 1e-4 && dist < PLAYER_PERSONAL_SPACE) {
            const nx = dx / dist;
            const nz = dz / dist;
            const candX = actor.root.position.x + nx * PLAYER_PERSONAL_SPACE;
            const candZ = actor.root.position.z + nz * PLAYER_PERSONAL_SPACE;
            if (!this.house || pPos.y >= 0.4 || this.house.isPointInsideWalkable(candX, candZ)) {
              pPos.x = candX;
              pPos.z = candZ;
              this.playerCamera.camera.position.x = candX;
              this.playerCamera.camera.position.z = candZ;
            }
          }
        }
      }
    }
    const playerMoving = Boolean(this.playerCamera?.isWalking);

    // 5. Update Characters
    const playerCam = this.playerCamera?.camera || null;
    const playerCamPos = playerCam?.position || null;
    for (const char of visibleActors) {
      char.update(dt, playerCamPos, playerCam);
    }

    // 6. Update 3D Comedy Props
    this.comedyProps?.update(dt, playerCamPos);

    // 7. Advance SFX Pacer & movement footsteps
    if (!silentSeek && this.sfxEngine) {
      const anyMoving = playerMoving || anyCharMoving;
      const moveAnim = playerMoving ? "walk" : fastestMoveAnim;
      this.sfxEngine.tickPacer(dt, this.simTime, { anyMoving, moveAnim });
    }

    // Re-check barrier at end of step so next tick has zero latency
    this._checkBarrierResolved();

    // 8. Check completion (only finish when all events dispatched and no barrier active)
    if (
      this.nextEventIndex >= this.events.length &&
      !this.activeBarrier &&
      this.simTime >= this.duration - 1e-5 &&
      !this.isFinished
    ) {
      this.simTime = this.duration;
      this.isFinished = true;
      this.isPlaying = false;
      this.sfxEngine?.stopBgm(this.simTime);
      this.emitState();
      if (this.onFinish) this.onFinish();
    } else {
      this.emitState();
    }
  }

  _createBarrierForBeat(ev, waitHandle) {
    let resolveFn = () => {};
    const promise = new Promise((resolve) => {
      resolveFn = resolve;
    });
    const startedAt = this.simTime;
    const type = ev.type;

    const isDone = () => {
      if (type === "char_move" || type === "move") {
        return !this.activeCharMoves.some((m) => m.moveId === waitHandle);
      }
      if (type === "player_walk") {
        return !this.playerCamera || !this.playerCamera.isWalking;
      }
      if (type === "player_look") {
        return (
          !this.playerCamera ||
          this.playerCamera.lookElapsed >= this.playerCamera.lookDuration
        );
      }
      if (type === "player_gesture") {
        return (
          !this.playerCamera ||
          (!this.playerCamera.activeGesture && this.playerCamera.quakeTimer <= 0)
        );
      }
      if (type === "player_crouch") {
        return (
          !this.playerCamera ||
          this.playerCamera.crouchElapsed >= this.playerCamera.crouchDuration
        );
      }
      if (type === "fade") {
        return (
          !this.playerCamera ||
          this.playerCamera.fadeElapsed >= this.playerCamera.fadeDuration
        );
      }
      if (type === "char_anim" || type === "anim") {
        const actor = this.characters[ev.actor];
        const minWait = ev.duration ?? 0;
        if (minWait > 0) {
          return this.simTime - startedAt >= minWait - 1e-5;
        }
        const act = actor?.currentAction;
        if (!act || act.loop === THREE.LoopRepeat) {
          return this.simTime - startedAt >= 0.45;
        }
        const clipDur = act.getClip()?.duration || 1.0;
        return !act.isRunning() || act.time >= clipDur - 0.03 || this.simTime - startedAt >= clipDur + 0.15;
      }
      return this.simTime - startedAt >= (ev.duration ?? 0) - 1e-5;
    };

    return { ev, startedAt, promise, resolve: resolveFn, isDone };
  }

  dispatchDueEvents(currentTimelineTime, { silentSeek = false } = {}) {
    while (
      !this.activeBarrier &&
      this.nextEventIndex < this.events.length &&
      this.events[this.nextEventIndex].at <= currentTimelineTime + 1e-6
    ) {
      const ev = this.events[this.nextEventIndex];
      this.nextEventIndex += 1;
      const waitHandle = this.executeBeat(ev, { silentSeek });
      if (ev.await === true || ev.sync === "sequential") {
        const barrier = this._createBarrierForBeat(ev, waitHandle);
        if (!barrier.isDone()) {
          this.activeBarrier = barrier;
          break; // Strict sequential halt: wait for promise/move to resolve before dispatching next beat
        }
        barrier.resolve();
      }
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
      const { points, segments } = this._buildFullStopChain(from, stops);
      this.playerCamera.startWalk({
        points,
        segments,
        duration: ev.duration ?? 2.0,
        autoLook: ev.lookAhead !== false,
      });
      return "player_walk";
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
      return null;
    }

    if (type === "player_gesture" && this.playerCamera) {
      this.playerCamera.triggerGesture(ev.gesture, ev.duration ?? 0.8);
      return null;
    }

    if (type === "player_crouch" && this.playerCamera) {
      this.playerCamera.crouch({
        crouched: Boolean(ev.crouched),
        duration: ev.duration ?? 0.35,
      });
      return null;
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
      return null;
    }

    if (type === "fade" && this.playerCamera) {
      this.playerCamera.startFade({
        to: ev.to ?? 0,
        duration: ev.duration ?? 0.6,
      });
      return null;
    }

    if (type === "char_anim" || type === "anim") {
      const actor = this.characters[ev.actor];
      if (!actor) return null;
      actor.playAnim(
        ev.anim,
        ev.fadeDuration ?? 0.16,
        ev.speed ?? null,
        ev.loop !== undefined ? ev.loop : null
      );
      if (!silentSeek) {
        this.sfxEngine?.notifyAction(ev.anim, this.simTime);
      }
      return null;
    }

    if (type === "char_move" || type === "move") {
      const actor = this.characters[ev.actor];
      if (!actor) return null;

      this.activeCharMoves = this.activeCharMoves.filter((m) => m.actor !== actor);
      const from = ev.from
        ? this.resolveWaypoint(ev.from)
        : {
            x: actor.root.position.x,
            y: actor.root.position.y,
            z: actor.root.position.z,
          };
      const stops = [...(ev.via || []), ev.to];
      const { points, segments } = this._buildFullStopChain(from, stops);

      const requestedAnim = ev.anim || "walk";
      const anim = LOCOMOTION_ANIMS.has(requestedAnim) ? requestedAnim : "walk";
      const timing = this._computeMoveTiming(
        points,
        segments,
        ev.duration ?? 1.5,
        anim,
        false
      );

      const worldSpeed = timing.totalLength / timing.effectiveDuration;
      const animSpeed =
        ev.speed ?? THREE.MathUtils.clamp(worldSpeed / 1.35, 0.85, 1.75);

      if (!ev.keepFacing) {
        actor.lookAtPlayer(false);
      }
      actor.root.position.set(from.x, from.y ?? 0, from.z);
      actor.playAnim(anim, 0.14, animSpeed, true);

      const moveId = this.nextMoveId++;
      this.activeCharMoves.push({
        moveId,
        actor,
        points,
        cumWeights: timing.cumWeights,
        totalWeight: timing.totalWeight,
        segInfo: timing.segInfo,
        maxVertSpeed: timing.maxVertSpeed,
        anim,
        animSpeed,
        keepFacing: Boolean(ev.keepFacing),
        endAnim: ev.endAnim || "idle",
        startTime: this.simTime,
        duration: timing.effectiveDuration,
      });
      return moveId;
    }

    if (type === "char_face" || type === "face") {
      const actor = this.characters[ev.actor];
      if (!actor) return null;
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
      return null;
    }

    if (type === "char_bubble") {
      const actor = this.characters[ev.actor];
      if (!actor) return null;
      actor.showBubble(ev.icon || "question", ev.duration ?? 2.0);
      if (!silentSeek) {
        this.sfxEngine?.notifyBubblePop(ev.icon, this.simTime);
      }
      return null;
    }

    if (type === "char_prop") {
      const actor = this.characters[ev.actor];
      if (!actor) return null;
      actor.setProp(ev.prop ?? null);
      return null;
    }

    if (type === "prop_action") {
      this.comedyProps?.performAction(ev.prop, ev.action, {
        at: ev.waypoint,
        to: ev.to,
        travelDuration: ev.travelDuration,
        targetY: ev.targetY,
        duration: ev.duration,
        yOffset: ev.yOffset ?? 0.25,
      });
      return null;
    }

    if (type === "bgm" && !silentSeek) {
      this.sfxEngine?.playBgm(ev.sound, {
        volume: ev.volume ?? 0.24,
        simTime: this.simTime,
      });
      return null;
    }

    if (type === "stop_bgm" && !silentSeek) {
      this.sfxEngine?.stopBgm(this.simTime);
      return null;
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
    return null;
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
