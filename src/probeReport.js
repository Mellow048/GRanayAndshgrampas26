/**
 * probeReport.js — turns per-frame lens measurements into a verdict.
 *
 * The renderer cannot be "watched" by CI, and a human cannot watch 4000 frames
 * of an agent's episode either. So the things that made the 2:30 episode
 * unreadable are expressed as numbers with hard budgets:
 *
 *   - lens clearance  : how close the nearest surface is to the camera
 *                       ("phased inside a table" = clearance near zero)
 *   - actor proximity : how close the nearest performer is to the lens
 *                       ("something keeps bumping me" = sustained sub-0.45m)
 *   - shield activity : how often the runtime had to rescue the lens, which is
 *                       itself a smell — a good episode needs few rescues
 *
 * Pure functions only, so the thresholds are unit-tested rather than trusted.
 */

export const PROBE_BUDGETS = {
  /** A lens this close to a surface starts slicing it with the near plane. */
  clearanceFloor: 0.3,
  /** Below this the frame is unreadable: you are inside the geometry. */
  clearanceHardFloor: 0.12,
  /** Fraction of frames allowed under `clearanceFloor`. */
  maxClearanceFraction: 0.01,
  /** A performer this close to the lens reads as a shove, not a gag. */
  actorFloor: 0.45,
  /** Fraction of frames allowed with a performer inside `actorFloor`. */
  maxActorFraction: 0.01,
  /** If the runtime shield rescues the lens this often, the staging is wrong. */
  maxShieldFraction: 0.2,
};

function percentile(sorted, p) {
  if (!sorted.length) return Number.NaN;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * (sorted.length - 1))));
  return sorted[idx];
}

/**
 * @param {Array} samples output of `probeExportFrame`
 * @param {object} [budgets] override PROBE_BUDGETS
 */
export function summarizeProbe(samples, budgets = {}) {
  const b = { ...PROBE_BUDGETS, ...budgets };
  const frames = samples.length;
  if (!frames) {
    return { frames: 0, verdict: "fail", reasons: ["no frames probed"], violations: [] };
  }

  const clearances = samples
    .map((s) => (Number.isFinite(s.clearance) ? s.clearance : 99))
    .sort((a, x) => a - x);
  const actorDists = samples
    .map((s) => (Number.isFinite(s.minActorDist) ? s.minActorDist : 99))
    .sort((a, x) => a - x);

  const belowClearance = samples.filter((s) => Number.isFinite(s.clearance) && s.clearance < b.clearanceFloor);
  const insideGeometry = samples.filter((s) => Number.isFinite(s.clearance) && s.clearance < b.clearanceHardFloor);
  const actorTooClose = samples.filter((s) => Number.isFinite(s.minActorDist) && s.minActorDist < b.actorFloor);
  const shieldFrames = samples.filter((s) => (s.shieldCorrections ?? 0) > 0);

  const violations = [];
  const pushWorst = (list, kind, key) => {
    const worst = [...list].sort((x, y) => (Number.isFinite(x[key]) ? x[key] : 99) - (Number.isFinite(y[key]) ? y[key] : 99)).slice(0, 12);
    for (const s of worst) {
      violations.push({
        t: Number(s.simTime?.toFixed?.(2) ?? s.simTime),
        kind,
        value: Number(Number(s[key]).toFixed(3)),
        detail: kind === "lens_inside_surface" ? s.nearestSurface : s.nearestActor,
      });
    }
  };
  pushWorst(insideGeometry, "lens_inside_surface", "clearance");
  pushWorst(
    belowClearance.filter((s) => !insideGeometry.includes(s)),
    "lens_too_close",
    "clearance"
  );
  pushWorst(actorTooClose, "actor_in_lens", "minActorDist");

  const reasons = [];
  if (insideGeometry.length) {
    reasons.push(`${insideGeometry.length} frame(s) had the lens inside geometry (< ${b.clearanceHardFloor}m)`);
  }
  if (belowClearance.length > Math.ceil(b.maxClearanceFraction * frames)) {
    reasons.push(
      `${belowClearance.length}/${frames} frames under ${b.clearanceFloor}m clearance (budget ${Math.ceil(
        b.maxClearanceFraction * frames
      )})`
    );
  }
  if (actorTooClose.length > Math.ceil(b.maxActorFraction * frames)) {
    reasons.push(
      `${actorTooClose.length}/${frames} frames with a performer inside ${b.actorFloor}m (budget ${Math.ceil(
        b.maxActorFraction * frames
      )})`
    );
  }
  if (shieldFrames.length > Math.ceil(b.maxShieldFraction * frames)) {
    reasons.push(
      `the runtime lens shield had to intervene on ${shieldFrames.length}/${frames} frames — restage the scene instead`
    );
  }

  return {
    frames,
    verdict: reasons.length ? "fail" : "pass",
    reasons,
    budgets: b,
    clearance: {
      min: Number(clearances[0].toFixed(3)),
      p1: Number(percentile(clearances, 1).toFixed(3)),
      median: Number(percentile(clearances, 50).toFixed(3)),
      framesBelowFloor: belowClearance.length,
      framesInsideGeometry: insideGeometry.length,
    },
    actor: {
      min: Number(actorDists[0].toFixed(3)),
      p5: Number(percentile(actorDists, 5).toFixed(3)),
      framesTooClose: actorTooClose.length,
    },
    shield: {
      framesCorrected: shieldFrames.length,
      totalCorrections: samples.reduce((n, s) => n + (s.shieldCorrections ?? 0), 0),
      maxMoved: Number(Math.max(0, ...samples.map((s) => s.shieldMoved ?? 0)).toFixed(3)),
    },
    violations,
  };
}

export function formatProbeReport(report) {
  const lines = [];
  lines.push(
    `[Probe] ${report.frames} frame(s) · clearance min ${report.clearance?.min ?? "-"}m p1 ${report.clearance?.p1 ?? "-"}m median ${report.clearance?.median ?? "-"}m`
  );
  lines.push(
    `[Probe] performers: min ${report.actor?.min ?? "-"}m · shield rescues on ${report.shield?.framesCorrected ?? 0} frame(s) (${report.shield?.totalCorrections ?? 0} corrections)`
  );
  if (report.verdict === "pass") {
    lines.push("[Probe] PASS — the lens stays out of the set and clear of bodies.");
  } else {
    lines.push(`[Probe] FAIL — ${report.reasons.join("; ")}`);
    for (const v of report.violations.slice(0, 10)) {
      lines.push(`  · t=${v.t}s ${v.kind} ${v.value}m ${v.detail ? `(${v.detail})` : ""}`);
    }
  }
  return lines.join("\n");
}
