import * as THREE from "three";
import { CONFIG, SET_MAP, NAV_GRAPH } from "./config.js";

const LOCOMOTION_ANIMS = new Set(["walk", "run", "run2", "sneak", "granny_walk", "jump"]);
const PLAYER_PERSONAL_SPACE = 1.3;
const ACTOR_SEPARATION = 1.05;

const BASE_WALK_SPEED = CONFIG.baseWalkSpeed ?? 2.5;
const BASE_RUN_SPEED = CONFIG.baseRunSpeed ?? 3.8;
const BASE_SNEAK_SPEED = CONFIG.baseSneakSpeed ?? 1.65;
const BASE_STAIR_SPEED = CONFIG.baseStairSpeed ?? 1.85;
const BASE_JUMP_SPEED = CONFIG.baseJumpSpeed ?? 2.35;

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
 * Implements:
 *  - Connected indoor NavGraph + Dijkstra shortest-path routing (both floors + stairs + elevated furniture)
 *  - Dynamic distance-based movement duration (`distance / BASE_WALK_SPEED`)
 *  - True `async/await` Promise-based beat execution for `await: true` / `sync: "sequential"`
 *  - Y-axis sine-wave parabolic jump arcs onto/off elevated furniture waypoints
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
    this.nextMoveId = 1;

    this._runToken = 0;
    this._seekToken = 0;
    this._silentSeek = false;
    this.isAwaitingBeat = false;
    this._simWaiters = [];
    this._timelineWaiters = [];

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
      elevated: Boolean(target.elevated),
      approach: target.approach,
      _name: target._name,
    };
  }

  findClosestNavNodeId(pos) {
    if (pos?._name && NAV_GRAPH[pos._name]) {
      return pos._name;
    }
    const wantFloor = getFloorIndex(pos.y ?? 0);
    const wantElevated = isElevatedSurfacePos(pos);

    let bestId = null;
    let bestDist = Infinity;
    for (const [id, node] of Object.entries(NAV_GRAPH)) {
      const floorDiff = getFloorIndex(node.y ?? 0) === wantFloor ? 0 : 100;
      const elevPenalty = Boolean(node.elevated) !== wantElevated ? 25 : 0;
      const d =
        Math.hypot((node.x ?? 0) - (pos.x ?? 0), (node.y ?? 0) - (pos.y ?? 0), (node.z ?? 0) - (pos.z ?? 0)) +
        floorDiff +
        elevPenalty;
      if (d < bestDist) {
        bestDist = d;
        bestId = id;
      }
    }
    return bestId || "front_door_view";
  }

  /**
   * Dijkstra shortest-path search over `NAV_GRAPH`.
   * Prevents intermediate routing across `elevated` furniture unless it is the start/goal.
   */
  findNavPath(startId, goalId) {
    if (!startId || !goalId) return [];
    if (startId === goalId) return [startId];
    if (!NAV_GRAPH[startId] || !NAV_GRAPH[goalId]) return [startId, goalId];

    const dist = new Map();
    const prev = new Map();
    const unvisited = new Set(Object.keys(NAV_GRAPH));

    for (const id of unvisited) {
      dist.set(id, Infinity);
    }
    dist.set(startId, 0);

    while (unvisited.size > 0) {
      let u = null;
      let bestD = Infinity;
      for (const id of unvisited) {
        const d = dist.get(id);
        if (d < bestD) {
          bestD = d;
          u = id;
        }
      }
      if (!u || bestD === Infinity || u === goalId) break;
      unvisited.delete(u);

      const nodeU = NAV_GRAPH[u];
      for (const v of nodeU.neighbors || []) {
        if (!unvisited.has(v)) continue;
        const nodeV = NAV_GRAPH[v];
        if (!nodeV) continue;
        // Do not walk up onto intermediate elevated furniture while traversing a room
        if (nodeV.elevated && v !== goalId && v !== startId) continue;

        const edgeLen = Math.hypot(
          (nodeV.x ?? 0) - (nodeU.x ?? 0),
          (nodeV.y ?? 0) - (nodeU.y ?? 0),
          (nodeV.z ?? 0) - (nodeU.z ?? 0)
        );
        const alt = bestD + edgeLen;
        if (alt < dist.get(v)) {
          dist.set(v, alt);
          prev.set(v, u);
        }
      }
    }

    if (dist.get(goalId) === Infinity) {
      return [startId, goalId];
    }

    const path = [];
    let cur = goalId;
    while (cur !== undefined) {
      path.unshift(cur);
      if (cur === startId) break;
      cur = prev.get(cur);
    }
    return path;
  }

  /**
   * Builds a 3D path + per-segment metadata (jump arcs vs stair ramps vs flat floor)
   * using Dijkstra pathfinding over `NAV_GRAPH`.
   */
  buildPathWithSegments(fromPos, toPos) {
    const startVec = new THREE.Vector3(fromPos.x ?? 0, fromPos.y ?? 0, fromPos.z ?? 0);
    const goalVec = new THREE.Vector3(toPos.x ?? 0, toPos.y ?? 0, toPos.z ?? 0);

    if (startVec.distanceTo(goalVec) < 0.05) {
      return { points: [startVec, goalVec], segments: [{ isJumpArc: false, arcHeight: 0 }] };
    }

    const startId = this.findClosestNavNodeId(fromPos);
    const goalId = this.findClosestNavNodeId(toPos);
    const nodeIds = this.findNavPath(startId, goalId);

    const chain = [{ pt: startVec.clone(), isJumpArc: false, arcHeight: 0 }];

    for (let i = 0; i < nodeIds.length; i += 1) {
      const id = nodeIds[i];
      const node = NAV_GRAPH[id] || SET_MAP[id];
      if (!node) continue;
      const pt = new THREE.Vector3(node.x, node.y ?? 0, node.z);
      const prev = chain[chain.length - 1].pt;
      if (prev.distanceTo(pt) < 0.06) continue;

      const prevNode = i > 0 ? NAV_GRAPH[nodeIds[i - 1]] : null;
      const prevElevated = prevNode ? Boolean(prevNode.elevated) : isElevatedSurfacePos(prev);
      const curElevated = Boolean(node.elevated);
      const isJumpArc = prevElevated || curElevated;
      const arcHeight = isJumpArc
        ? Math.min(0.62, 0.30 + Math.abs(pt.y - prev.y) * 0.25)
        : 0;

      chain.push({ pt, isJumpArc, arcHeight });
    }

    const tail = chain[chain.length - 1].pt;
    if (tail.distanceTo(goalVec) >= 0.06) {
      const lastNode = NAV_GRAPH[nodeIds[nodeIds.length - 1]];
      const isJumpArc = Boolean(lastNode?.elevated) || isElevatedSurfacePos(goalVec);
      chain.push({
        pt: goalVec.clone(),
        isJumpArc,
        arcHeight: isJumpArc ? Math.min(0.62, 0.30 + Math.abs(goalVec.y - tail.y) * 0.25) : 0,
      });
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
      const p0 = new THREE.Vector3(from.x ?? 0, from.y ?? 0, from.z ?? 0);
      return {
        points: [p0, p0.clone()],
        segments: [{ isJumpArc: false, arcHeight: 0 }],
      };
    }
    return { points: allPoints, segments: allSegments };
  }

  _computeMoveTiming(
    points,
    segments,
    requestedDuration,
    requestedAnim,
    isPlayer = false,
    customSpeed = null
  ) {
    const isRun = requestedAnim === "run" || requestedAnim === "run2";
    const isSneak = requestedAnim === "sneak";
    const baseFlatSpeed =
      Number(customSpeed) > 0
        ? Number(customSpeed)
        : isPlayer
          ? BASE_WALK_SPEED
          : isRun
            ? BASE_RUN_SPEED
            : isSneak
              ? BASE_SNEAK_SPEED
              : BASE_WALK_SPEED;
    const stairSpeed = Math.min(baseFlatSpeed, isRun ? 2.45 : BASE_STAIR_SPEED);
    const maxVertSpeed = isPlayer ? 1.55 : isRun ? 1.75 : 1.4;

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
        minSegDur = Math.max(0.55, segLen / Math.max(baseFlatSpeed, BASE_JUMP_SPEED));
      } else if (isStair) {
        minSegDur = Math.max(segLen / stairSpeed, dy / maxVertSpeed);
      } else {
        minSegDur = segLen / baseFlatSpeed;
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

    // Distance / BASE_WALK_SPEED is the lower bound; never teleport faster than physical walk speed
    const explicitMin = Number(requestedDuration) > 0 ? Number(requestedDuration) : 0;
    const effectiveDuration = Math.max(0.08, totalWeight, explicitMin);
    return {
      effectiveDuration,
      cumWeights,
      totalWeight,
      totalLength,
      segInfo,
      maxVertSpeed,
      baseFlatSpeed,
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
    const actorPos = {};
    for (const castEntry of episode.cast || []) {
      const sp = this.resolveWaypoint(castEntry.spawn || "back_hall");
      actorPos[castEntry.id] = { ...sp };
    }
    const pSp = this.resolveWaypoint(episode.playerSpawn || "back_hall");
    let playerPos = { ...pSp };

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
        const timing = this._computeMoveTiming(
          points,
          segments,
          ev.duration,
          "walk",
          true,
          ev.speed
        );
        effDur = timing.effectiveDuration;
        const last = points[points.length - 1];
        const lastStop = stops[stops.length - 1];
        playerPos = {
          x: last.x,
          y: last.y,
          z: last.z,
          _name: typeof lastStop === "string" ? lastStop : undefined,
        };
      } else if (ev.type === "char_move" || ev.type === "move") {
        const start = ev.from
          ? this.resolveWaypoint(ev.from)
          : actorPos[ev.actor] || { x: 0, y: 0, z: 0 };
        const stops = [...(ev.via || []), ev.to];
        const { points, segments } = this._buildFullStopChain(start, stops);
        const timing = this._computeMoveTiming(
          points,
          segments,
          ev.duration,
          ev.anim || "walk",
          false,
          ev.speed
        );
        effDur = timing.effectiveDuration;
        const last = points[points.length - 1];
        const lastStop = stops[stops.length - 1];
        actorPos[ev.actor] = {
          x: last.x,
          y: last.y,
          z: last.z,
          _name: typeof lastStop === "string" ? lastStop : undefined,
        };
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

  _clearWaiters() {
    for (const m of this.activeCharMoves) {
      if (m.resolve) m.resolve();
    }
    this.activeCharMoves = [];
    for (const w of this._simWaiters) {
      if (w.resolve) w.resolve();
    }
    this._simWaiters = [];
    for (const w of this._timelineWaiters) {
      if (w.resolve) w.resolve();
    }
    this._timelineWaiters = [];
    this.isAwaitingBeat = false;
  }

  _waitSim(duration, runToken) {
    if (duration <= 1e-5) return Promise.resolve();
    return new Promise((resolve) => {
      this._simWaiters.push({
        targetTime: this.simTime + duration,
        runToken,
        resolve,
      });
    });
  }

  _waitTimelineUntil(targetTimelineTime, runToken) {
    if (this.timelineTime >= targetTimelineTime - 1e-6) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this._timelineWaiters.push({
        targetTime: targetTimelineTime,
        runToken,
        resolve,
      });
    });
  }

  async _flushMicrotasks() {
    for (let i = 0; i < 4; i += 1) {
      await Promise.resolve();
    }
  }

  /**
   * True `async / await` timeline scheduler.
   * For every beat with `await: true` or `sync: "sequential"`, awaits the beat's
   * Promise (movement, camera walk, look, animation, or timer) before advancing.
   */
  async _driveTimelineAsync(runToken) {
    while (runToken === this._runToken && this.nextEventIndex < this.events.length) {
      const ev = this.events[this.nextEventIndex];
      if (ev.at > this.timelineTime + 1e-6) {
        await this._waitTimelineUntil(ev.at, runToken);
      }
      if (runToken !== this._runToken) return;

      this.nextEventIndex += 1;
      const beatPromise = this.executeBeat(ev, {
        silentSeek: this._silentSeek,
        runToken,
      });

      if (ev.await === true || ev.sync === "sequential") {
        this.isAwaitingBeat = true;
        await beatPromise;
        if (runToken !== this._runToken) return;
        this.isAwaitingBeat = false;
      }
    }
  }

  reset() {
    this._runToken += 1;
    const runToken = this._runToken;
    this._clearWaiters();

    this.simTime = 0;
    this.timelineTime = 0;
    this.nextEventIndex = 0;
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

    this._driveTimelineAsync(runToken);
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

  async seek(targetTime) {
    if (!this.episode) return;
    const seekToken = ++this._seekToken;
    const clamped = Math.max(0, Math.min(this.duration, targetTime));
    const wasPlaying = this.isPlaying;
    const wasExport = this.sfxEngine?.exportMode;

    if (this.sfxEngine) {
      this.sfxEngine.exportMode = true;
      const savedEvents = [...this.sfxEngine.recordedEvents];
      this._silentSeek = true;
      this.reset();
      await this._flushMicrotasks();
      const dt = CONFIG.fixedDt;
      const steps = Math.floor(clamped / dt);
      for (let i = 0; i < steps; i++) {
        if (seekToken !== this._seekToken) break;
        await this.stepAsync(dt, { silentSeek: true });
      }
      const rem = clamped - steps * dt;
      if (rem > 1e-5 && seekToken === this._seekToken) {
        await this.stepAsync(rem, { silentSeek: true });
      }
      this._silentSeek = false;
      this.sfxEngine.recordedEvents = savedEvents;
      this.sfxEngine.exportMode = Boolean(wasExport);
    }

    if (seekToken === this._seekToken) {
      this.isPlaying = wasPlaying;
      this.emitState();
    }
  }

  async stepAsync(dt, { silentSeek = false } = {}) {
    this.step(dt, { silentSeek });
    await this._flushMicrotasks();
  }

  _resolveReadyWaiters() {
    for (let i = this._simWaiters.length - 1; i >= 0; i--) {
      const w = this._simWaiters[i];
      if (w.runToken !== this._runToken || this.simTime >= w.targetTime - 1e-6) {
        this._simWaiters.splice(i, 1);
        w.resolve();
      }
    }
    for (let i = this._timelineWaiters.length - 1; i >= 0; i--) {
      const w = this._timelineWaiters[i];
      if (w.runToken !== this._runToken || this.timelineTime >= w.targetTime - 1e-6) {
        this._timelineWaiters.splice(i, 1);
        w.resolve();
      }
    }
  }

  step(dt, { silentSeek = false } = {}) {
    if (!this.episode) return;

    this.simTime += dt;

    if (!this.isAwaitingBeat) {
      this.timelineTime += dt;
    } else if (this.simTime > this.duration) {
      this.duration = this.simTime + 0.05;
    }

    // 1. Advance character 3D polyline moves (with sine-wave jump arcs & stair slope clamping)
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
          Math.sin(localT * Math.PI) * (segMeta.arcHeight || 0.44);
      } else if (segMeta.isStair) {
        const maxStepY = (m.maxVertSpeed || 1.55) * Math.max(dt, 1 / 120) * 1.35;
        const dyStep = m.actor.root.position.y - prevY;
        if (Math.abs(dyStep) > maxStepY) {
          m.actor.root.position.y = prevY + Math.sign(dyStep) * maxStepY;
        }
      } else {
        // Strict flat floor lock between same-floor standard nodes
        m.actor.root.position.y =
          Math.abs(segEnd.y - segStart.y) < 0.05
            ? segStart.y
            : segStart.y + (segEnd.y - segStart.y) * localT;
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
        if (m.resolve) m.resolve();
      }
    }

    // 2. Prevent standing ground-level actors from merging/clipping inside each other
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

    // 3. Advance PlayerCamera & smoothly ease personal space around same-floor standing actors
    this.playerCamera?.update(dt, this.resolver);
    if (this.playerCamera && this.playerCamera.mode === "pov") {
      const pPos = this.playerCamera.playerPos;
      if (!this.playerCamera.isWalking && !isElevatedSurfacePos(pPos) && !isOnStairs(pPos)) {
        const pushAlpha = Math.min(1, dt * 6);
        for (const actor of visibleActors) {
          if (movingActorSet.has(actor)) continue;
          if (Math.abs(pPos.y - actor.root.position.y) > 0.65) continue;
          const dx = pPos.x - actor.root.position.x;
          const dz = pPos.z - actor.root.position.z;
          const dist = Math.hypot(dx, dz);
          if (dist > 1e-4 && dist < PLAYER_PERSONAL_SPACE) {
            const nx = dx / dist;
            const nz = dz / dist;
            const targetX = actor.root.position.x + nx * PLAYER_PERSONAL_SPACE;
            const targetZ = actor.root.position.z + nz * PLAYER_PERSONAL_SPACE;
            const candX = pPos.x + (targetX - pPos.x) * pushAlpha;
            const candZ = pPos.z + (targetZ - pPos.z) * pushAlpha;
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

    // 4. Update Characters
    const playerCam = this.playerCamera?.camera || null;
    const playerCamPos = playerCam?.position || null;
    for (const char of visibleActors) {
      char.update(dt, playerCamPos, playerCam);
    }

    // 5. Update 3D Comedy Props
    this.comedyProps?.update(dt, playerCamPos);

    // 6. Advance SFX Pacer & movement footsteps
    if (!silentSeek && this.sfxEngine) {
      const anyMoving = playerMoving || anyCharMoving;
      const moveAnim = playerMoving ? "walk" : fastestMoveAnim;
      this.sfxEngine.tickPacer(dt, this.simTime, { anyMoving, moveAnim });
    }

    // 7. Resolve timeline & simulation-time Promises ready on this tick
    this._resolveReadyWaiters();

    // 8. Check completion (only finish when all events dispatched and no awaited beat active)
    if (
      this.nextEventIndex >= this.events.length &&
      !this.isAwaitingBeat &&
      this.activeCharMoves.length === 0 &&
      !this.playerCamera?.isWalking &&
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

  async executeBeat(ev, { silentSeek = false, runToken = this._runToken } = {}) {
    const type = ev.type;

    if (type === "player_walk" && this.playerCamera) {
      const from = {
        x: this.playerCamera.playerPos.x,
        y: this.playerCamera.playerPos.y,
        z: this.playerCamera.playerPos.z,
      };
      const stops = [...(ev.via || []), ev.to];
      const { points, segments } = this._buildFullStopChain(from, stops);
      return this.playerCamera.startWalk({
        points,
        segments,
        duration: ev.duration,
        speed: ev.speed,
        autoLook: ev.lookAhead !== false,
      });
    }

    if (type === "player_look" && this.playerCamera) {
      const dur = ev.duration ?? 0.2;
      const lookPromise = this.playerCamera.lookAt(
        ev.target,
        { duration: dur, track: Boolean(ev.track) },
        this.resolver
      );
      if (!silentSeek) {
        this.sfxEngine?.notifyWhipPan(dur, this.simTime);
      }
      return lookPromise;
    }

    if (type === "player_gesture" && this.playerCamera) {
      return this.playerCamera.triggerGesture(ev.gesture, ev.duration ?? 0.8);
    }

    if (type === "player_crouch" && this.playerCamera) {
      return this.playerCamera.crouch({
        crouched: Boolean(ev.crouched),
        duration: ev.duration ?? 0.35,
      });
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
      return this._waitSim(ev.duration ?? 0, runToken);
    }

    if (type === "fade" && this.playerCamera) {
      return this.playerCamera.startFade({
        to: ev.to ?? 0,
        duration: ev.duration ?? 0.6,
      });
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
      const clipDur = actor.currentAction?.getClip()?.duration || 1.0;
      const waitDur = ev.duration ?? (ev.loop ? 0.45 : clipDur);
      return this._waitSim(waitDur, runToken);
    }

    if (type === "char_move" || type === "move") {
      const actor = this.characters[ev.actor];
      if (!actor) return;

      // Cancel any prior active move for the same actor cleanly
      for (let i = this.activeCharMoves.length - 1; i >= 0; i--) {
        if (this.activeCharMoves[i].actor === actor) {
          if (this.activeCharMoves[i].resolve) this.activeCharMoves[i].resolve();
          this.activeCharMoves.splice(i, 1);
        }
      }

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
        ev.duration,
        anim,
        false,
        ev.speed
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
      return new Promise((resolve) => {
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
          resolve,
        });
      });
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
      return this._waitSim(ev.duration ?? 0, runToken);
    }

    if (type === "char_bubble") {
      const actor = this.characters[ev.actor];
      if (!actor) return;
      actor.showBubble(ev.icon || "question", ev.duration ?? 2.0);
      if (!silentSeek) {
        this.sfxEngine?.notifyBubblePop(ev.icon, this.simTime);
      }
      return this._waitSim(ev.duration ?? 0, runToken);
    }

    if (type === "char_prop") {
      const actor = this.characters[ev.actor];
      if (!actor) return;
      actor.setProp(ev.prop ?? null);
      return this._waitSim(ev.duration ?? 0, runToken);
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
      return this._waitSim(ev.duration ?? 0, runToken);
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

    if ((ev.duration ?? 0) > 0) {
      return this._waitSim(ev.duration, runToken);
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
