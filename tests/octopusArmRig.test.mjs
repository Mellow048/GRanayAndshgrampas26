/**
 * Numeric verification of the arm solver shipped inside `tide-pool-octopus.html`.
 *
 * The page has no browser-free test surface of its own — it is one inline
 * <script> that expects a DOM. So this test does what the browser would do,
 * minus the DOM: it slices the *shipped* functions and constants straight out
 * of the delivered file by marker, evaluates them, and drives them headlessly.
 * Nothing here is a reimplementation. If someone edits the solver in the page,
 * these numbers move; if they edit the markers, the test fails loudly rather
 * than silently passing on stale code.
 *
 * What is asserted, and why each threshold is where it is:
 *
 *   seed      the closed-form arc must be exact — it is the reference solution.
 *   rest      a still pose must be still: zero tip error, zero clamp fires.
 *   live      12,000 ambient solves. The residual is *not* zero by design: the
 *             muscle wave deliberately leaves the tip a couple of pixels off,
 *             which is what makes the arm look alive. Thresholds are the
 *             measured distribution plus headroom, not a wish.
 *   strain    when the crab is out of reach the arm must fail honestly: fully
 *             straight, and the reported error must equal reach - length.
 *   coil      reeling the crab to the mouth puts the target at ~0.3 of arm
 *             length. That regime folds chains; see the page's own comments.
 *   teleport  a target that jumps in one frame must not fold the arm.
 *
 * The kink clamp is a safety net, so the meaningful assertion is how *rarely*
 * it fires, not that it never does.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PAGE = path.join(ROOT, "tide-pool-octopus.html");
const DEG = 180 / Math.PI;

/* ---------------------------------------------------------------- rig ---- */

/**
 * Pull the shipped constants, ground functions, arm definitions, solver and
 * path builders out of the delivered page and evaluate them as one module.
 */
function loadRig() {
  const src = fs.readFileSync(PAGE, "utf8");
  const script = src.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(script, "page must contain exactly one inline <script>");
  const js = script[1];

  const slice = (start, end) => {
    const i = js.indexOf(start);
    assert.ok(i >= 0, `shipped page lost the marker: ${start}`);
    const j = js.indexOf(end, i);
    assert.ok(j >= 0, `shipped page lost the end marker after "${start}": ${end}`);
    return js.slice(i, j);
  };

  const HDR = "  /* ============================================================";
  const consts = slice("var VW = 960", "/* The seabed.");
  const floors = slice("function sandY(x)", "/* Eight arms");
  const armDef = js.slice(
    js.indexOf("var ARM_DEF"),
    js.indexOf("];", js.indexOf("var ARM_DEF")) + 2,
  );
  const solver = slice("/* Rotate everything distal", `${HDR}\n     3. PATH BUILDERS`);
  const paths = slice("function catmull(p)", `${HDR}\n     4. BUILD THE STATIC`);

  /* The page closes over two module-scope animation variables; expose them as
     parameters so a test can set activity and scene time deterministically. */
  const factory = new Function(
    "ACT0",
    "T0",
    `${consts}${floors}${armDef}\n${solver}\n${paths}
     /* The page declares this rounding helper above the first slice marker, so
        it is not captured above; the path builders call it. Re-declare it here
        with the page's own definition rather than letting the slice fail. */
     var f2 = function (n) { return n.toFixed(2); };
     var ACT = ACT0, sceneT = T0;
     return {
       ARM_DEF, HEAD, HEAD_RX, HEAD_RY, SEG, ITERS, POST_ITERS, SMOOTH_ROUNDS,
       BEND_LIMIT, SAFE_BEND, WAVE_AMP, WAVE_MIN, SLACK, AMP_FRAC, REPAIR_ERR,
       sandY, rockTop, lipY, seedArc, solveArm, reach, turnAt, limbPath, openPath,
       set: function (a, t) { ACT = a; sceneT = t; },
     };`,
  );
  return factory(1, 0);
}

const G = loadRig();
const { SEG, BEND_LIMIT, HEAD, HEAD_RX, HEAD_RY, ARM_DEF, SLACK, AMP_FRAC } = G;

/** Rebuild the eight arms exactly as the page's buildArms() does. */
function buildArms() {
  return ARM_DEF.map((def, i) => {
    const th = (def.ang * Math.PI) / 180;
    const root = {
      x: HEAD.x + HEAD_RX * 0.92 * Math.cos(th),
      y: HEAD.y + HEAD_RY * 0.96 * Math.sin(th),
    };
    const restDist = Math.hypot(def.tip[0] - root.x, def.tip[1] - root.y);
    const len = Math.round(restDist * SLACK);
    const slack = len - restDist;
    const lens = [];
    const pts = [];
    for (let s = 0; s < SEG; s++) lens.push(len / SEG);
    for (let p = 0; p <= SEG; p++) pts.push({ x: root.x, y: root.y });
    const arm = {
      i, def, root, pts, lens, lenTotal: len, restDist, slack,
      amp: slack * AMP_FRAC, curl: root.x < HEAD.x ? 1 : -1,
      phase: i * 0.77, tipErr: 0, reach: 0, total: len,
      clamps: 0, reseeds: 0, repairs: 0, coils: 0,
      hasPrev: false, prevTx: 0, prevTy: 0,
      home: { x: def.tip[0], y: def.tip[1] }, width: 9 + def.w * 7,
    };
    G.seedArc(arm, arm.home.x, arm.home.y);
    return arm;
  });
}

/* ----------------------------------------------------------- measures ---- */

/** Largest deviation of any segment from its fixed length. Must stay ~0. */
const lengthError = (arm) => {
  let worst = 0;
  for (let i = 0; i < SEG; i++) {
    const got = Math.hypot(arm.pts[i + 1].x - arm.pts[i].x, arm.pts[i + 1].y - arm.pts[i].y);
    worst = Math.max(worst, Math.abs(got - arm.lens[i]));
  }
  return worst;
};

/** Drift of the chain's root off the mantle attachment point. Must stay 0. */
const baseError = (arm) => Math.hypot(arm.pts[0].x - arm.root.x, arm.pts[0].y - arm.root.y);

/** Largest absolute joint turn, in radians. The kink invariant. */
const maxTurn = (arm) => {
  let worst = 0;
  for (let i = 1; i < SEG; i++) worst = Math.max(worst, Math.abs(G.turnAt(arm, i)));
  return worst;
};

/**
 * Standard deviation of the joint turns, in degrees. A folded arm and a nicely
 * coiled arm can share the same maxTurn, so this is what actually tells them
 * apart: low scatter means the bend is spread evenly along the arm.
 */
const curvatureScatter = (arm) => {
  const turns = [];
  for (let i = 1; i < SEG; i++) turns.push(G.turnAt(arm, i));
  const mean = turns.reduce((s, v) => s + v, 0) / turns.length;
  const varr = turns.reduce((s, v) => s + (v - mean) * (v - mean), 0) / turns.length;
  return Math.sqrt(varr) * DEG;
};

const summarise = (n) => (typeof n === "number" ? (Math.abs(n) < 1e-6 ? n.toExponential(2) : n.toFixed(3)) : String(n));

/* ------------------------------------------------------------ the tests --- */

test("shipped page exposes the rig the tests expect", () => {
  assert.equal(ARM_DEF.length, 8, "eight arms");
  assert.equal(SEG, 10, "ten joints each");
  for (const name of ["ITERS", "POST_ITERS", "SMOOTH_ROUNDS", "BEND_LIMIT", "SAFE_BEND",
                      "WAVE_AMP", "WAVE_MIN", "SLACK", "AMP_FRAC", "REPAIR_ERR"]) {
    assert.ok(Number.isFinite(G[name]), `${name} must be a finite shipped constant`);
  }
  assert.ok(G.SAFE_BEND < G.BEND_LIMIT, "smoothing budget must leave room for the wave");
  assert.ok(typeof G.solveArm === "function", "solveArm must be shipped");
  assert.ok(!/function fabrik/.test(fs.readFileSync(PAGE, "utf8")),
    "the superseded unconstrained FABRIK pass must be gone");
});

test("closed-form arc seed is an exact solution", () => {
  let tip = 0;
  let len = 0;
  for (const arm of buildArms()) {
    tip = Math.max(tip, Math.hypot(arm.pts[SEG].x - arm.home.x, arm.pts[SEG].y - arm.home.y));
    len = Math.max(len, lengthError(arm));
  }
  assert.ok(tip < 1e-9, `tip must land on target, was ${summarise(tip)}px`);
  assert.ok(len < 1e-9, `segment lengths must be exact, was ${summarise(len)}px`);
});

test("rest pose is genuinely at rest (200 frames)", () => {
  G.set(0, 0);
  const arms = buildArms();
  let tip = 0, len = 0, base = 0, turn = 0, clamps = 0;
  for (let f = 0; f < 200; f++) {
    for (const arm of arms) {
      tip = Math.max(tip, G.solveArm(arm, arm.home.x, arm.home.y));
      len = Math.max(len, lengthError(arm));
      base = Math.max(base, baseError(arm));
      turn = Math.max(turn, maxTurn(arm));
      clamps += arm.clamps;
    }
  }
  assert.ok(tip < 0.5, `still pose must not drift, was ${summarise(tip)}px`);
  assert.ok(len < 1e-6, `lengths exact, was ${summarise(len)}px`);
  assert.ok(base < 1e-6, `base pinned to mantle, was ${summarise(base)}px`);
  assert.ok(turn <= BEND_LIMIT + 1e-9, `no kink past limit, was ${(turn * DEG).toFixed(2)}deg`);
  assert.equal(clamps, 0, "the clamp must never need to fire on a still pose");
});

test("live ambient motion: 1500 frames x 8 arms = 12000 solves", () => {
  G.set(1, 0);
  const arms = buildArms();
  const errs = [];
  let len = 0, base = 0, turn = 0, clamps = 0, overReach = 0;

  for (let f = 0; f < 1500; f++) {
    const T = f / 60;
    G.set(1, T);
    for (const arm of arms) {
      const amp = arm.amp;
      const tx = arm.home.x + amp * Math.sin(T * (0.5 + arm.def.w * 0.16) + arm.phase)
               + amp * 0.4 * Math.sin(T * 0.23 + arm.phase * 2);
      const ty = arm.home.y + amp * 0.52 * Math.cos(T * (0.62 + arm.def.w * 0.13) + arm.phase * 1.4);
      if (Math.hypot(tx - arm.root.x, ty - arm.root.y) > arm.lenTotal - 0.5) overReach++;
      errs.push(G.solveArm(arm, tx, ty));
      len = Math.max(len, lengthError(arm));
      base = Math.max(base, baseError(arm));
      turn = Math.max(turn, maxTurn(arm));
      clamps += arm.clamps;
    }
  }

  const sorted = errs.slice().sort((a, b) => a - b);
  const mean = errs.reduce((s, v) => s + v, 0) / errs.length;
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const worst = sorted[sorted.length - 1];
  const jointPasses = errs.length * (SEG - 1);
  const repairs = arms.reduce((n, a) => n + a.repairs, 0);
  const reseeds = arms.reduce((n, a) => n + a.reseeds, 0);

  assert.ok(mean < 2, `mean tip error ${mean.toFixed(3)}px`);
  assert.ok(p95 < 4, `p95 tip error ${p95.toFixed(3)}px`);
  assert.ok(worst < 8, `worst tip error ${worst.toFixed(3)}px`);
  assert.equal(overReach, 0, `ambient wander must never exceed arm length (${overReach}/${errs.length})`);
  assert.ok(len < 1e-6, `lengths exact, was ${summarise(len)}px`);
  assert.ok(base < 1e-6, `base pinned, was ${summarise(base)}px`);
  assert.ok(turn <= BEND_LIMIT + 1e-9, `bend limit under motion, was ${(turn * DEG).toFixed(2)}deg`);
  assert.ok(clamps / jointPasses < 0.001,
    `clamp should be a net that never fires, was ${(clamps / jointPasses * 100).toFixed(4)}% of joints`);
  assert.equal(repairs, 0, `ambient motion must never need a fold repair (${repairs})`);
  assert.equal(reseeds, 0, `ambient motion must never need a teleport re-seed (${reseeds})`);
});

test("over-reach fails honestly instead of lying about the tip", () => {
  G.set(0, 0);
  const arm = buildArms()[7];
  const tx = 742;
  const ty = G.sandY(742) - 14;
  for (let f = 0; f < 240; f++) G.solveArm(arm, tx, ty);

  const need = Math.hypot(tx - arm.root.x, ty - arm.root.y);
  const expected = Math.max(0, need - arm.lenTotal);
  assert.ok(need > arm.lenTotal, `the story beat must really be out of reach (${need.toFixed(1)} > ${arm.lenTotal})`);
  assert.ok(Math.abs(arm.tipErr - expected) < 3,
    `reported error must equal reach - length, got ${arm.tipErr.toFixed(2)} vs ${expected.toFixed(2)}px`);
  assert.ok(maxTurn(arm) < 8 * (Math.PI / 180),
    `a straining arm straightens, maxTurn was ${(maxTurn(arm) * DEG).toFixed(2)}deg`);
  assert.ok(lengthError(arm) < 1e-6, "lengths stay exact while straining");
});

test("deep coil: reeling the crab from the seabed to the mouth", () => {
  G.set(1, 0);
  const arm = buildArms()[7];
  const from = { x: 600, y: 474 };   /* where the grab lands */
  const to = { x: 446, y: 424 };     /* the mouth */
  let move = 0, hold = 0, turn = 0, scatter = 0, n = 0;

  /* 1.5s reel-in, eased exactly as the page's smoothstep does */
  for (let f = 0; f < 90; f++) {
    G.set(1, f / 60);
    const u = f / 90;
    const s = u * u * (3 - 2 * u);
    const tx = from.x + (to.x - from.x) * s;
    const ty = from.y + (to.y - from.y) * s;
    move = Math.max(move, G.solveArm(arm, tx, ty));
    turn = Math.max(turn, maxTurn(arm));
    scatter += curvatureScatter(arm);
    n++;
  }
  /* then a 3s hold at the mouth */
  for (let f = 0; f < 180; f++) {
    G.set(1, 1.5 + f / 60);
    hold = Math.max(hold, G.solveArm(arm, to.x, to.y));
    turn = Math.max(turn, maxTurn(arm));
    scatter += curvatureScatter(arm);
    n++;
  }
  const jointPasses = (90 + 180) * (SEG - 1);

  assert.ok(arm.coils > 0, "this motion must actually exercise the coil regime");
  assert.ok(move < 6, `worst error while reeling ${move.toFixed(2)}px`);
  assert.ok(hold < 2, `worst error while holding at the mouth ${hold.toFixed(2)}px`);
  assert.ok(turn <= BEND_LIMIT + 1e-9, `coil respects the bend limit, was ${(turn * DEG).toFixed(2)}deg`);
  assert.ok(scatter / n < 5, `coil bends evenly, curvature scatter ${(scatter / n).toFixed(2)}deg`);
  assert.ok(lengthError(arm) < 1e-6, "lengths exact while coiled");
  assert.ok(arm.clamps / jointPasses < 0.01,
    `clamp stays rare even in a coil, was ${(arm.clamps / jointPasses * 100).toFixed(3)}% of joints (${arm.clamps})`);
  assert.equal(arm.repairs, 0, "the coil must not need residual repairs once seeded properly");
});

test("coil regime generalises to all eight arms, not just the grabbing one", () => {
  let globalWorst = 0, globalTurn = 0, repairs = 0, clamps = 0, passes = 0;
  const means = [];

  for (let ai = 0; ai < 8; ai++) {
    G.set(1, 0);
    const arm = buildArms()[ai];
    let sum = 0, worst = 0, n = 0;
    for (let f = 0; f < 300; f++) {
      const T = f / 60;
      G.set(1, T);
      /* sweep the whole coil regime: target anywhere from 5% to 49% of arm
         length, at a rotating bearing, so no single lucky geometry can pass */
      const ratio = 0.05 + 0.44 * ((Math.sin(f * 0.037) + 1) / 2);
      const bearing = ai * 0.9 + f * 0.21;
      const tx = arm.root.x + ratio * arm.lenTotal * Math.cos(bearing);
      const ty = arm.root.y + ratio * arm.lenTotal * Math.sin(bearing);
      const e = G.solveArm(arm, tx, ty);
      sum += e;
      worst = Math.max(worst, e);
      globalTurn = Math.max(globalTurn, maxTurn(arm));
      assert.ok(lengthError(arm) < 1e-6, `arm ${ai} lengths exact at frame ${f}`);
      n++;
    }
    means.push(sum / n);
    globalWorst = Math.max(globalWorst, worst);
    repairs += arm.repairs;
    clamps += arm.clamps;
    passes += n * (SEG - 1);
  }

  const mean = means.reduce((s, v) => s + v, 0) / means.length;
  assert.ok(mean < 1.5, `mean coil error across arms ${mean.toFixed(3)}px`);
  assert.ok(globalWorst < 6, `worst coil error across arms ${globalWorst.toFixed(2)}px`);
  assert.ok(globalTurn <= BEND_LIMIT + 1e-9,
    `no arm ever kinks past the limit, worst ${(globalTurn * DEG).toFixed(2)}deg`);
  assert.equal(repairs, 0, `coil regime must not fall back on residual repair (${repairs})`);
  assert.ok(clamps / passes < 0.01,
    `clamp stays a safety net across the whole regime, ${(clamps / passes * 100).toFixed(3)}% of joints`);
});

test("a teleporting target re-seeds rather than folding the chain", () => {
  G.set(1, 0);
  const arm = buildArms()[7];
  for (let f = 0; f < 30; f++) G.solveArm(arm, arm.home.x, arm.home.y);

  /* Deliberate one-frame jump of ~250px. Unguarded this measured 31.16px of
     tip error with every joint pinned at the bend limit. */
  const err = G.solveArm(arm, 446, 424);

  assert.equal(arm.reseeds, 1, "the teleport guard must fire exactly once");
  assert.ok(err < 3, `tip must still land on target, was ${err.toFixed(2)}px`);
  assert.ok(maxTurn(arm) <= BEND_LIMIT + 1e-9, `no kink after the jump, was ${(maxTurn(arm) * DEG).toFixed(2)}deg`);
  assert.ok(lengthError(arm) < 1e-6, "lengths exact after the jump");
});

test("solved chains produce drawable paths", () => {
  G.set(1, 2);
  const arms = buildArms();
  for (const arm of arms) G.solveArm(arm, arm.home.x, arm.home.y);

  for (const arm of arms) {
    const outline = G.limbPath(arm.pts, arm.width, 1.7);
    assert.ok(outline.endsWith("Z"), `arm ${arm.i} outline must be closed`);
    assert.ok(!/NaN|Infinity|undefined/.test(outline), `arm ${arm.i} outline must be finite`);
    const suckers = G.openPath(arm.pts);
    assert.ok(suckers.startsWith("M"), `arm ${arm.i} sucker row must be a real path`);
    assert.ok(!/NaN|Infinity|undefined/.test(suckers), `arm ${arm.i} sucker row must be finite`);
  }
});

test("scene coherence: one ground function, three depth planes", () => {
  /* Every arm tip must sit above the foreground lip line, so the front arms
     read as draped over the rock and behind the lip rather than floating. */
  for (const def of ARM_DEF) {
    const [tx, ty] = def.tip;
    assert.ok(G.lipY(tx) > ty, `tip (${tx},${ty}) must be behind the lip at y=${G.lipY(tx).toFixed(1)}`);
    assert.ok(Number.isFinite(G.rockTop(tx)) && Number.isFinite(G.sandY(tx)),
      `ground functions must be finite at x=${tx}`);
  }

  const headBottom = HEAD.y + HEAD_RY;
  const rockAtHead = G.rockTop(HEAD.x);
  assert.ok(Math.abs(headBottom - rockAtHead) < 14,
    `octopus must sit ON the rock: head bottom ${headBottom.toFixed(1)} vs rock top ${rockAtHead.toFixed(1)}`);

  /* The crab only ever walks between these two x positions. */
  for (const x of [548, 742]) {
    const y = G.sandY(x);
    assert.ok(Number.isFinite(y) && y > 440, `crab footing at x=${x} must be on the seabed, got ${y.toFixed(1)}`);
  }
});

test("page markup stays self-contained and well formed", () => {
  const src = fs.readFileSync(PAGE, "utf8");
  assert.ok(!/(?:src|href)="https?:/.test(src), "no external assets or links");
  assert.ok(!/<audio|new Audio|AudioContext/.test(src), "this page is silent by design");
  assert.equal(src.match(/viewBox="0 0 960 600"/g)?.length, 1, "exactly one scene SVG");

  const ids = [...src.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepEqual(dupes, [], "no duplicate element ids");

  const script = src.match(/<script>([\s\S]*?)<\/script>/)[1];
  for (const id of new Set([...script.matchAll(/\$\("([^"]+)"\)/g)].map((m) => m[1]))) {
    assert.ok(ids.includes(id), `JS looks up #${id}, which the markup must define`);
  }

  /* Every element handle the JS touches must be declared. The script runs in
     strict mode, so a missing `var` is a fatal ReferenceError at runtime — and
     `node --check` cannot see it. This once caught a real bug (tRepair). */
  const declared = new Set();
  for (const m of script.matchAll(/\b(?:var|let|const)\s+([^;\n]+);/g)) {
    let depth = 0, cur = "";
    const parts = [];
    for (const ch of m[1]) {
      if ("([{".includes(ch)) depth++;
      else if (")]}".includes(ch)) depth--;
      if (ch === "," && depth === 0) { parts.push(cur); cur = ""; } else cur += ch;
    }
    parts.push(cur);
    for (const part of parts) {
      const name = part.split("=")[0].trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name)) declared.add(name);
    }
  }
  for (const m of script.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/g)) {
    declared.add(m[1]);
    for (const a of m[2].split(",")) {
      if (/^[A-Za-z_$][\w$]*$/.test(a.trim())) declared.add(a.trim());
    }
  }
  const props = "textContent|setAttribute|getAttribute|classList|addEventListener|appendChild|querySelector|value|innerHTML|style";
  const handles = new Set();
  for (const m of script.matchAll(new RegExp(`(?<![.\\w$])([A-Za-z_$][\\w$]*)\\s*\\.\\s*(?:${props})`, "g"))) {
    handles.add(m[1]);
  }
  const known = new Set([...declared, "document", "window", "Math", "console", "performance",
                         "requestAnimationFrame", "Array", "Object", "JSON", "Number", "String",
                         "Boolean", "Date", "isNaN", "isFinite", "parseFloat", "parseInt", "this"]);
  const undeclared = [...handles].filter((h) => !known.has(h));
  assert.deepEqual(undeclared, [], "element handles used but never declared");
});
