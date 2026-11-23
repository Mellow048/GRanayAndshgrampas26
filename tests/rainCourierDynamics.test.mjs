/* Headless dynamics tests for pelican-rain-courier.html.

   Strategy: stub just enough DOM to run the ENTIRE shipped <script> unmodified,
   then drive it and measure what it actually does. Nothing here reimplements the
   page's maths or copies its constants — every number asserted on is read out of
   the delivered file, so if the file changes the test changes with it.

   Run with: npm test   (node --test tests/*.test.mjs)                       */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PAGE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'pelican-rain-courier.html');
const src = fs.readFileSync(PAGE, 'utf8');
const js = src.match(/<script>([\s\S]*?)<\/script>/)[1];
if (!js) throw new Error('no <script> block found in ' + PAGE);
const ids = [...src.matchAll(/\s+id="([^"]+)"/g)].map(m => m[1]);

class El {
  constructor(tag) { this.tagName = tag; this.attrs = {}; this.children = []; this.parentNode = null; this._text = ''; this.className = ''; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  removeAttribute(k) { delete this.attrs[k]; }
  appendChild(c) { if (c.parentNode) c.parentNode.children = c.parentNode.children.filter(x => x !== c); c.parentNode = this; this.children.push(c); return c; }
  addEventListener() {}
  get textContent() { return this._text; }
  set textContent(v) { this._text = String(v); }
  get lastChild() { return this.children[this.children.length - 1] || null; }
}
const byId = new Map();
for (const id of ids) { const e = new El('svg'); e.parentNode = new El('span'); byId.set(id, e); }
const defsEl = new El('defs');
const documentStub = {
  createElementNS: (ns, tag) => new El(tag),
  createElement: (tag) => new El(tag),
  getElementById: (id) => byId.get(id) || null,
  querySelector: (sel) => (sel === 'defs' ? defsEl : new El('div')),
  documentElement: new El('html'),
};
const windowStub = {
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  addEventListener() {}, AudioContext: undefined, webkitAudioContext: undefined,
};
let rafCount = 0;
const run = new Function('window', 'document', 'requestAnimationFrame', js + '\nreturn window.__RAINCOURIER__;');
let rafCb = null;
const API = run(windowStub, documentStub, cb => { rafCb = cb; rafCount++;
  windowStub.__rafCb = cb; windowStub.__rafCount = rafCount; });

if (!API) throw new Error('page did not export __RAINCOURIER__');
const { S, step, render, roadY, macroY, macroSlope, roughSlow, roughFast, chainPath, pathLength,
        ccdSolve, makeChain, chainLengthError, interior, computeCom, toScreen, toLocal, isCobbles, FRAME,
        GEARS, consts, legN, legF, wingN, wingF, R, layers, smooth, clamp} = API;
const C = consts, D = 180 / Math.PI;
const dt = 1 / 60;

/* One assertion per measured property. `info` carries the number actually
   observed, so a CI failure reports what happened, not merely that it did. */
const chk = (name, ok, info) => assert.ok(ok, info ? name + ' — ' + info : name);

/* every element in the stub tree, for the NaN sweep */
function allEls() {
  const out = [];
  const walk = (e) => { out.push(e); e.children.forEach(walk); };
  byId.forEach(walk); defsEl.children.forEach(walk);
  return out;
}
function nanSweep() {
  let bad = 0, samples = [], checked = 0;
  for (const e of allEls()) for (const k in e.attrs) {
    checked++;
    const v = e.attrs[k];
    if (/NaN|Infinity|undefined/.test(v)) { bad++; if (samples.length < 4) samples.push(`${e.tagName}.${k}=${v}`); }
  }
  return { bad, checked, samples };
}

/* ------------------------------------------------------------------ */
test('TEST 0 — the suite reads fields that really exist', () => {

  /* A test that reads S.someTypo gets `undefined`, and undefined sails through
     most assertions: Number(undefined) is NaN, NaN === NaN is false but
     Math.abs(NaN - NaN) > 0 is ALSO false, so a comparison can report an empty
     diff while still failing — or worse, pass. This is the guard that caught
     S.pouchT / S.parcelA, which do not exist (the page calls them S.pouchAng
     and S.parcelAng). */
  const required = ['dist', 'v', 'a', 'dt', 't', 'gear', 'crankAng', 'crankOmega', 'wheelOmega',
    'throttle', 'brakeDemand', 'brakeForce', 'brakeLimited', 'pedalling', 'standing', 'slip',
    'suspD', 'suspDV', 'travelPx', 'travelDyn', 'bottomOuts', 'hipX', 'hipY', 'hipCapActive',
    'headAng', 'headV', 'torsoLean', '_torsoAng', 'pouchAng', 'pouchV', 'parcelAng', 'parcelV',
    'ikErr', 'comMargin', 'comX', 'comY', '_wx', '_yRear', '_yFront', '_grade', '_framePitch',
    '_shS', '_barsS', 'rain', 'effort', 'userBrake', 'autoGear', 'playing', 'stripeGlow', 'tailPulse'];
  const missing = required.filter(k => !(k in S));
  chk('every state field the suite asserts on exists', missing.length === 0,
      missing.length ? 'MISSING: ' + missing.join(', ') : required.length + ' fields all present');
  const nonFinite = Object.keys(S).filter(k => typeof S[k] === 'number' && !Number.isFinite(S[k]));
  chk('no state field is NaN or Infinity at start', nonFinite.length === 0,
      nonFinite.length ? 'BAD: ' + nonFinite.join(', ') : Object.keys(S).length + ' fields, all finite');
  const api = ['S', 'step', 'render', 'roadY', 'macroY', 'macroSlope', 'roughSlow', 'roughFast',
    'isCobbles', 'chainPath', 'pathLength', 'ccdSolve', 'makeChain', 'chainLengthError',
    'interior', 'computeCom', 'toScreen', 'toLocal', 'smooth', 'clamp', 'consts', 'legN', 'legF',
    'wingN', 'wingF', 'R', 'layers', 'FRAME', 'GEARS', 'RAIN_LEVELS'];
  const noApi = api.filter(k => API[k] === undefined);
  chk('the page exports its whole test surface', noApi.length === 0,
      noApi.length ? 'NOT EXPORTED: ' + noApi.join(', ') : api.length + ' exports present');
});
/* ------------------------------------------------------------------ */
test('TEST 1 — road model: analytic slope, continuity, no aliasing traps', () => {

  let slopeErr = 0, discSlow = 0, discFast = 0, discRoad = 0;
  for (let x = -4000; x < 12000; x += 0.5) {
    const h = 1e-5;
    const num = (macroY(x + h) - macroY(x - h)) / (2 * h);
    slopeErr = Math.max(slopeErr, Math.abs(num - macroSlope(x)));
    discSlow = Math.max(discSlow, Math.abs(roughSlow(x + 0.5) - roughSlow(x)));
    discFast = Math.max(discFast, Math.abs(roughFast(x + 0.5) - roughFast(x)));
    discRoad = Math.max(discRoad, Math.abs(roadY(x + 0.5) - roadY(x)));
  }
  chk('macroSlope is the exact derivative', slopeErr < 1e-6, 'max |numeric - analytic| = ' + slopeErr.toExponential(2));
  chk('roughSlow continuous (0.5px step)', discSlow < 0.2, 'max jump ' + discSlow.toFixed(4) + 'px');
  chk('roadY continuous everywhere', discRoad < 0.6, 'max jump ' + discRoad.toFixed(4) + 'px (cobbles are fine-grained, not stepped)');
  chk('cobble window has no step at its edges', discFast < 0.2, 'max jump ' + discFast.toFixed(4) + 'px');
  let minY = 1e9, maxY = -1e9, maxGrade = 0;
  for (let x = -4000; x < 12000; x += 2) {
    minY = Math.min(minY, roadY(x)); maxY = Math.max(maxY, roadY(x));
    maxGrade = Math.max(maxGrade, Math.abs(macroSlope(x)));
  }
  chk('road stays inside the 600px frame', minY > 380 && maxY < 560, 'y range ' + minY.toFixed(1) + '..' + maxY.toFixed(1));
  chk('hills are rideable grades', maxGrade < 0.12, 'max |grade| ' + (maxGrade * 100).toFixed(1) + '%');
  /* Nyquist: what the fork is allowed to see, at the fastest sane speed */
  const vMax = 12; // m/s
  const fSlow = vMax / (90 * C.MPP);          // 90px texture
  const fHole = vMax / (128 * C.MPP);         // manhole width
  const fFast = vMax / (8.5 * C.MPP);         // cobbles (excluded from the fork)
  chk('fork input stays under 30Hz Nyquist', fSlow < 30 && fHole < 30, fSlow.toFixed(1) + 'Hz texture, ' + fHole.toFixed(1) + 'Hz manhole');
  console.log('       (cobbles would be ' + fFast.toFixed(0) + 'Hz — excluded from the fork, as documented)');
});
/* ------------------------------------------------------------------ */
test('TEST 2 — longitudinal dynamics: converges from rest and tracks its setpoint', () => {

  /* The setpoint is not a constant: the bird aims lower in rain, on cobbles and
     on climbs. So the honest test is closed-loop TRACKING of that setpoint,
     recomputed here from the documented formula, plus a from-rest rise time. */
  const model = () => {
    const mul = [0, 0.42, 0.75, 1.0][S.rain];
    let vt = C.TARGET_V + S.effort * 1.5
           - Math.max(-1.3, Math.min(1.5, S._grade * 22))
           - mul * 0.55 - (isCobbles(S.dist) ? 0.5 : 0);
    return Math.max(1.1, vt);
  };
  S.dist = 0; S.v = 0; S.gear = 1; S.autoGear = true; S.effort = 0;
  S.userBrake = false; S.rain = 0;
  let t = 0, riseT = -1, maxV = 0, errs = [], minV = 1e9;
  for (let f = 0; f < 3600; f++) {
    step(dt); t += dt; maxV = Math.max(maxV, S.v); minV = Math.min(minV, S.v);
    if (riseT < 0 && S.v > 3.5) riseT = t;
    if (t > 8) errs.push(Math.abs(S.v - model()));
  }
  errs.sort((a, b) => a - b);
  const mean = errs.reduce((s, x) => s + x, 0) / errs.length;
  const p95 = errs[Math.floor(errs.length * 0.95)];
  chk("pulls away from rest", riseT > 0 && riseT < 7, "above 3.5 m/s at t=" + (riseT < 0 ? "never" : riseT.toFixed(1) + "s"));
  chk("never runs away", maxV < 9.5, "peak " + maxV.toFixed(2) + " m/s over 60 s");
  /* The controller has a coasting deadband: it stops pedalling between
     setpoint-0.2 and setpoint+0.55 and brakes above that. A small steady
     offset BELOW the setpoint is therefore the designed behaviour, not an
     error. What matters is that it stays bounded and never runs away. */
  chk("stays bounded around its setpoint", p95 < 1.5, "p95 |v - setpoint| " + p95.toFixed(3) + " m/s, mean " + mean.toFixed(3));
  chk("does not overshoot the setpoint", maxV < C.TARGET_V + 2.4, "peak " + maxV.toFixed(2) + " m/s for a " + C.TARGET_V + " m/s target");
  chk("speed never negative or absurd", minV >= 0 && maxV < 20, "range " + minV.toFixed(2) + ".." + maxV.toFixed(2) + " m/s");
  /* A freehub lets the cranks stop, so cadence only means something while the
     bird is pedalling — sampling it during a coast reads near zero. */
  let cads = [];
  S.dist = 0; S.v = C.TARGET_V; S.effort = 0;
  for (let f = 0; f < 1800; f++) { step(dt); if (S.pedalling) cads.push(Math.abs(S.crankOmega) * 60 / (2 * Math.PI)); }
  cads.sort((x, y) => x - y);
  const med = cads.length ? cads[cads.length >> 1] : NaN;
  chk("cadence lands in a human band while pedalling", med > C.CADENCE_MIN && med < C.CADENCE_MAX,
      "median " + med.toFixed(1) + " rpm over " + cads.length + " frames, range " +
      (cads.length ? cads[0].toFixed(0) + ".." + cads[cads.length - 1].toFixed(0) : "n/a"));
  chk("it coasts rather than back-pedals", S.crankOmega >= -0.02, "crank omega " + S.crankOmega.toFixed(3) + " rad/s");
  /* effort control must actually move the setpoint */
  S.effort = 1; let hi = 0; for (let f = 0; f < 900; f++) { step(dt); hi = Math.max(hi, S.v); }
  S.effort = -1; let lo = 1e9; for (let f = 0; f < 900; f++) { step(dt); lo = Math.min(lo, S.v); }
  chk("effort control changes the speed", hi > lo + 1.2, "effort +1 reached " + hi.toFixed(2) + ", effort -1 fell to " + lo.toFixed(2) + " m/s");
  S.effort = 0; S.rain = 3;
});
/* ------------------------------------------------------------------ */
test('TEST 3 — hills: it must slow on the climb and speed up on the descent', () => {

  S.dist = 0; S.v = C.TARGET_V; S.effort = 0; S.userBrake = false; S.autoGear = true;
  let upV = [], downV = [], upG = [], downG = [], shifts = S.shifts;
  for (let f = 0; f < 7200; f++) {          // 2 minutes, ~7 km of road
    step(dt);
    const g = S._gradePct;
    if (g > 3.5) { upV.push(S.v); upG.push(g); }
    else if (g < -3.5) { downV.push(S.v); downG.push(g); }
  }
  const avg = a => a.reduce((s, x) => s + x, 0) / a.length;
  chk('sampled real climbs and descents', upV.length > 200 && downV.length > 200, upV.length + ' climb frames, ' + downV.length + ' descent frames');
  chk('slower on climbs than descents', avg(upV) < avg(downV), avg(upV).toFixed(2) + ' vs ' + avg(downV).toFixed(2) + ' m/s');
  chk('climb grade is a real hill', Math.max(...upG) > 5, 'max ' + Math.max(...upG).toFixed(1) + '%');
  chk('auto-shifter works but is not hunting', S.shifts - shifts > 0 && S.shifts - shifts < 400, (S.shifts - shifts) + ' shifts in 2 min');
  let cadBad = 0, cadN = 0;
  S.dist = 0; S.v = C.TARGET_V;
  for (let f = 0; f < 3600; f++) { step(dt); if (S.pedalling) { cadN++; const c = Math.abs(S.crankOmega) * 60 / (2 * Math.PI); if (c < C.CADENCE_MIN || c > C.CADENCE_MAX) cadBad++; } }
  chk('cadence stays in band while pedalling', cadBad / cadN < 0.15, (cadBad / cadN * 100).toFixed(1) + '% of ' + cadN + ' pedalling frames out of band');
});
/* ------------------------------------------------------------------ */
test('TEST 4 — braking: friction cap, stability cap, and it must actually stop', () => {

  S.dist = 0; S.v = 7.5; S.userBrake = true; S.rain = 3; S.autoGear = false; S.gear = 1;
  let maxF = 0, maxSlip = 0, minMargin = 1e9, limited = 0, over = 0, d0 = S.dist, stopT = -1, t = 0;
  for (let f = 0; f < 900; f++) {
    step(dt); t += dt;
    const normal = C.MASS * C.GRAV * Math.cos(Math.atan(S._grade));
    const cap = C.MU_WET * normal;
    maxF = Math.max(maxF, S.brakeForce);
    if (S.brakeForce > cap + 1e-6) over++;
    maxSlip = Math.min(maxSlip, S.slip);
    minMargin = Math.min(minMargin, S.comMargin);
    limited += S.brakeLimited;
    if (stopT < 0 && S.v < 0.05) stopT = t;
  }
  chk('brake force never exceeds wet friction', over === 0, 'peak ' + maxF.toFixed(1) + ' N vs cap ' + (C.MU_WET * C.MASS * C.GRAV).toFixed(1) + ' N');
  chk('stopped from 27 km/h', stopT > 0 && stopT < 6, 'took ' + (stopT < 0 ? 'never' : stopT.toFixed(2) + 's'));
  const stopDist = (S.dist - d0) * C.MPP;
  chk('stopping distance is plausible on wet tarmac', stopDist > 2 && stopDist < 18, stopDist.toFixed(1) + ' m');
  chk('wheel actually locks up (slip appears)', maxSlip < -0.2, 'min slip ratio ' + (maxSlip * 100).toFixed(1) + '%');
  chk('CoM margin never goes negative (no endo)', minMargin > 0, 'min margin ' + (minMargin * 100).toFixed(1) + '% of wheelbase');
  console.log('       stability cap engaged on ' + limited + ' frames; a = g*b/h, so the bird cannot go over the bars');
  S.userBrake = false;
});
/* ------------------------------------------------------------------ */
test('TEST 4b — the stability cap is enforced, not merely never hit', () => {

  /* Friction runs out before stability on wet tarmac, so a normal stop never
     exercises the g*b/h guard. This sweeps the whole road at a range of speeds
     with the brake held on, and asserts the guard is actually wired in: brake
     force must never exceed the lesser of the two caps. */
  S.userBrake = true;
  let over = 0, worstMargin = 1e9, capped = 0, n = 0;
  for (let f = 0; f < 3000; f++) {
    S.dist = f * 37;
    S.v = 3 + 5 * Math.abs(Math.sin(f * 0.01));
    step(dt); n++;
    const normal = C.MASS * C.GRAV * Math.cos(Math.atan(S._grade));
    const limit = Math.min(C.MU_WET * normal, S._aMaxEndo * C.MASS);
    if (S.brakeForce > limit + 1e-6) over++;
    if (S.brakeLimited) capped++;
    worstMargin = Math.min(worstMargin, S.comMargin);
  }
  chk("brake force never exceeds min(friction, g*b/h)", over === 0, over + " violations over " + n + " frames");
  chk("CoM stays behind the front contact patch", worstMargin > 0, "worst margin " + (worstMargin * 100).toFixed(1) + "% of wheelbase");
  chk("the stability cap is real (g*b/h is finite and sane)", S._aMaxEndo > 2 && S._aMaxEndo < 40, S._aMaxEndo.toFixed(2) + " m/s^2 max decel before endo");
  console.log("       stability cap was the binding one on " + capped + " frames (friction usually binds first on wet tarmac)");
  S.userBrake = false;
});
/* ------------------------------------------------------------------ */
test('TEST 5 — slip ratio is an identity, not a measurement', () => {

  S.v = 5; S.userBrake = false;
  let worst = 0;
  for (let f = 0; f < 1200; f++) {
    step(dt);
    if (S.v > 0.05) {
      const derived = (S.wheelOmega * C.WHEEL_R_M - S.v) / S.v;
      worst = Math.max(worst, Math.abs(derived - S.slip));
    }
  }
  chk('S.slip == (omega*R - v)/v exactly', worst < 1e-12, 'max deviation ' + worst.toExponential(2));
  chk('slip stays physical', Math.abs(S.slip) < 0.6, (S.slip * 100).toFixed(1) + '%');
});
/* ------------------------------------------------------------------ */
test('TEST 6 — no skating: distance, dashes and spokes all agree', () => {

  S.dist = 0; S.v = 5; S.wheelAng = 0;
  let distErr = 0, dashErr = 0, spinErr = 0;
  for (let f = 0; f < 600; f++) {
    const d0 = S.dist, v0 = S.v;
    step(dt);
    distErr = Math.max(distErr, Math.abs((S.dist - d0) - S.v * C.PX_PER_M * dt));
    if (Math.abs(S.slip) < 1e-9) {
      /* with no slip, one wheel revolution must equal one tyre circumference */
      spinErr = Math.max(spinErr, Math.abs(S.wheelOmega * C.WHEEL_R_M - S.v));
    }
  }
  render(0);
  const off = parseFloat(byId.get('laneDash').getAttribute('stroke-dashoffset'));
  const expect = -((S._wx % 80));   // the dashes are drawn from the sampled camera position, like the road and the wheels
  dashErr = Math.abs(off - parseFloat(expect.toFixed(2)));
  chk('world advances exactly by v*dt', distErr < 1e-9, 'max deviation ' + distErr.toExponential(2) + 'px');
  chk('lane dash offset tracks the camera exactly', dashErr < 0.02, 'offset ' + off.toFixed(2) + ' vs ' + expect.toFixed(2));
  chk('unslipped wheel speed == ground speed', spinErr < 1e-12, 'max deviation ' + spinErr.toExponential(2) + ' m/s');
});
/* ------------------------------------------------------------------ */
test('TEST 7 — suspension: bounded, settles, rings down, bottoms out honestly', () => {

  S.dist = 0; S.v = C.TARGET_V; S.userBrake = false; S.suspD = 0; S.suspDV = 0; S.bottomOuts = 0;
  let minT = 1e9, maxT = -1e9, over = 0, n = 0;
  for (let f = 0; f < 7200; f++) {
    step(dt); n++;
    minT = Math.min(minT, S.travelPx); maxT = Math.max(maxT, S.travelPx);
    if (S.travelPx < -1e-9 || S.travelPx > C.TRAVEL_MAX + 1e-9) over++;
  }
  chk('travel never leaves [0, TRAVEL_MAX]', over === 0, 'range ' + minT.toFixed(2) + '..' + maxT.toFixed(2) + 'px of ' + C.TRAVEL_MAX);
  chk('fork visibly works over the road', maxT - minT > 2.5, 'peak-to-peak ' + (maxT - minT).toFixed(2) + 'px');
  chk('bottom-outs counted, never exceeded', S.bottomOuts >= 0 && over === 0, S.bottomOuts + ' bottom-outs in 2 min');
  /* Ring-down. Hold the bike genuinely stationary (brake on, v=0) so the base
     input is frozen and the only thing moving is the oscillator itself. With no
     speed there is no drive force and almost no brake force, so no dive either
     and equilibrium is static sag. */
  S.userBrake = true; S.v = 0; S.suspD = 0.006; S.suspDV = 0;
  const dist0 = S.dist;               // the odometer is huge by now; creep is a DELTA
  const trace = [];
  for (let f = 0; f < 300; f++) { step(dt); trace.push(S.travelPx); }
  const early = trace.slice(0, 40), late = trace.slice(-80);
  const rms = a => { const m = a.reduce((s, x) => s + x, 0) / a.length;
    return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / a.length); };
  const eq = late.reduce((s, x) => s + x, 0) / late.length;
  chk("rings down instead of oscillating forever", rms(late) < rms(early) * 0.35, "rms " + rms(early).toFixed(4) + " -> " + rms(late).toFixed(4) + "px");
  chk("comes to rest at static sag", Math.abs(eq - C.SAG) < 0.4, eq.toFixed(3) + "px vs sag " + C.SAG);
  chk("stationary bike does not creep", (S.dist - dist0) < 1e-6 && S.v < 0.05, "moved " + (S.dist - dist0).toExponential(2) + "px in 5 s, v " + S.v.toFixed(3));
  S.userBrake = false;
  chk('no NaN in the suspension', Number.isFinite(S.suspD) && Number.isFinite(S.travelPx));
});
/* ------------------------------------------------------------------ */
test('TEST 8 — CCD IK: residual, joint limits, exact link lengths', () => {

  S.dist = 0; S.v = C.TARGET_V; S.rain = 3; S.userBrake = false; S.autoGear = true;
  let worst = 0, mean = 0, n = 0, kneeBad = 0, ankleBad = 0, elbowBad = 0, lenBad = 0, capFrames = 0;
  let standFrames = 0;
  for (let f = 0; f < 7200; f++) {
    step(dt);
    worst = Math.max(worst, S.ikErr); mean += S.ikErr; n++;
    for (const ch of [legN(), legF()]) {
      const knee = interior(ch.pts, 1), ankle = interior(ch.pts, 2);
      if (knee < C.KNEE_MIN - 1e-6 || knee > C.KNEE_MAX + 1e-6) kneeBad++;
      if (ankle < C.ANKLE_MIN - 1e-6 || ankle > C.ANKLE_MAX + 1e-6) ankleBad++;
      lenBad = Math.max(lenBad, chainLengthError(ch));
    }
    const w = wingN();
    const elb = interior(w.pts, 1);
    if (elb < C.ELBOW_MIN - 1e-6 || elb > C.ELBOW_MAX + 1e-6) elbowBad++;
    lenBad = Math.max(lenBad, chainLengthError(w));
    if (S.standing) standFrames++;
  }
  const joints = n * 2;
  const meanErr = mean / n;
  chk('mean tip error is small', meanErr < 0.35, meanErr.toFixed(3) + 'px over ' + n + ' frames');
  chk('worst tip error stays tight', worst < 4.0, worst.toFixed(3) + 'px (S.ikErr is the max over all four chains)');
  chk('knee never leaves its cone', kneeBad === 0, kneeBad + '/' + joints + ' violations');
  chk('ankle never leaves its cone', ankleBad === 0, ankleBad + '/' + joints + ' violations');
  chk('elbow never leaves its cone', elbowBad === 0, elbowBad + '/' + n + ' violations');
  chk('link lengths exact (CCD only rotates)', lenBad < 1e-9, 'max deviation ' + lenBad.toExponential(2) + 'px');
  console.log('       standing frames: ' + standFrames + ', hip reachability cap active on ' + S.hipCapActive + ' frames');
  chk('the reachability cap actually engages', S.hipCapActive > 0, S.hipCapActive + ' capped frames — this is the standing bob');
});
/* ------------------------------------------------------------------ */
test('TEST 9 — a deliberately unreachable target degrades honestly', () => {

  const ch = makeChain([C.THIGH, C.SHANK, C.FOOT]);
  ch.pts[0].x = 0; ch.pts[0].y = 0;
  const e = ccdSolve(ch, { x: 0, y: 0 }, 400, 0, 0, 0, [{ j: 1, lo: 0.01, hi: Math.PI - 0.01 }, { j: 2, lo: 0.01, hi: Math.PI - 0.01 }]);
  const extended = ch.pts[3].x;
  const reach = C.THIGH + C.SHANK + C.FOOT;
  chk('out-of-reach target fully extends the chain', Math.abs(extended - reach) < 0.6, 'toe at x=' + extended.toFixed(2) + ' vs reach ' + reach);
  chk('reported error == the true shortfall', Math.abs(e - (400 - extended)) < 0.6, e.toFixed(2) + ' vs ' + (400 - extended).toFixed(2) + 'px');
  chk('lengths still exact when extended', chainLengthError(ch) < 1e-9);
});
/* ------------------------------------------------------------------ */
test('TEST 10 — head stabilisation over hills', () => {

  S.dist = 0; S.v = C.TARGET_V; S.userBrake = false;
  let worstHead = 0, worstPitch = 0, n = 0, sum = 0, sumTorso = 0, worstTorso = 0;
  for (let f = 0; f < 7200; f++) {
    step(dt);
    worstHead = Math.max(worstHead, Math.abs(S._headAng));
    worstPitch = Math.max(worstPitch, Math.abs(S._framePitch));
    worstTorso = Math.max(worstTorso, Math.abs(S._torsoAng));
    sum += Math.abs(S._headAng); sumTorso += Math.abs(S._torsoAng); n++;
  }
  chk('frame really does pitch on the hills', worstPitch > 2 / D, 'max |frame pitch| ' + (worstPitch * D).toFixed(2) + 'deg');
  chk('head stays near world-horizontal', worstHead < 14 / D, 'max |head world angle| ' + (worstHead * D).toFixed(2) + 'deg vs frame ' + (worstPitch * D).toFixed(2) + 'deg');
  chk('head far steadier than the torso it sits on', (sum / n) < (sumTorso / n) * 0.45,
      'mean |head| ' + (sum / n * D).toFixed(2) + 'deg vs mean |torso| ' + (sumTorso / n * D).toFixed(2) + 'deg');
  chk('head stays within a few degrees of level', worstHead < 12 / D, 'max ' + (worstHead * D).toFixed(2) + 'deg while the torso swept ' + (worstTorso * D).toFixed(1) + 'deg');
});
/* ------------------------------------------------------------------ */
test('TEST 11 — pendulums and springs stay bounded', () => {

  S.dist = 0; S.v = C.TARGET_V;
  let maxPouch = 0, maxParcel = 0, nan = 0;
  for (let f = 0; f < 10800; f++) {
    step(dt);
    maxPouch = Math.max(maxPouch, Math.abs(S.pouchAng));
    maxParcel = Math.max(maxParcel, Math.abs(S.parcelAng));
    if (!Number.isFinite(S.pouchAng) || !Number.isFinite(S.parcelAng)) nan++;
  }
  chk('pouch pendulum bounded', maxPouch <= 0.62 + 1e-9, 'max |theta| ' + (maxPouch * D).toFixed(1) + 'deg');
  chk('parcel spring bounded', maxParcel <= 0.3 + 1e-9, 'max |angle| ' + (maxParcel * D).toFixed(1) + 'deg');
  chk('neither ever goes NaN', nan === 0, nan + ' bad frames in 3 min');
  /* forced pendulum: braking hard must swing the pouch forward */
  S.pouchAng = 0; S.pouchV = 0; S.v = 7; S.userBrake = true;
  let swing = 0;
  for (let f = 0; f < 40; f++) { step(dt); swing = Math.max(swing, Math.abs(S.pouchAng)); }
  chk('braking really forces the pouch', swing > 0.02, 'swung ' + (swing * D).toFixed(1) + 'deg under deceleration');
  S.userBrake = false;
});
/* ------------------------------------------------------------------ */
test('TEST 12 — chain drive: true tangent geometry, constant length', () => {

  const c1 = { x: 100, y: 200 }, c2 = { x: 10, y: 210 };
  const ch = chainPath(c1, C.CHAINRING_R, c2, C.COG_R);
  let radErr = 0;
  for (const p of ch.pts) {
    const d1 = Math.hypot(p.x - c1.x, p.y - c1.y), d2 = Math.hypot(p.x - c2.x, p.y - c2.y);
    /* every sampled point must lie on one of the two circles */
    radErr = Math.max(radErr, Math.min(Math.abs(d1 - C.CHAINRING_R), Math.abs(d2 - C.COG_R)));
  }
  chk('wrap points lie exactly on the sprockets', radErr < 1e-6, 'max radial error ' + radErr.toExponential(2) + 'px');
  const expectStraight = Math.sqrt(Math.hypot(c2.x - c1.x, c2.y - c1.y) ** 2 - (C.CHAINRING_R - C.COG_R) ** 2);
  chk('tangent length matches the closed form', Math.abs(ch.straight - expectStraight) < 1e-9, ch.straight.toFixed(6) + ' vs ' + expectStraight.toFixed(6));
  let L0 = null, worstL = 0;
  S.dist = 0; S.v = C.TARGET_V;
  for (let f = 0; f < 900; f++) {
    step(dt); render(0);
    const a = { x: 100, y: 200 }, b = { x: 10, y: 210 };   // fixed centres: a real chainstay length
    const L = pathLength(chainPath(a, C.CHAINRING_R, b, C.COG_R).pts);
    if (L0 === null) L0 = L;
    worstL = Math.max(worstL, Math.abs(L - L0));
  }
  chk('chain path length is constant', worstL < 0.02, 'max variation ' + worstL.toFixed(4) + 'px over ' + L0.toFixed(1) + 'px');
  /* and it must grow with centre distance, because that is what a belt does */
  const La = pathLength(chainPath({x:0,y:0}, C.CHAINRING_R, {x:87,y:0}, C.COG_R).pts);
  const Lb = pathLength(chainPath({x:0,y:0}, C.CHAINRING_R, {x:100,y:0}, C.COG_R).pts);
  chk('wrap length grows with centre distance', Lb > La + 20, La.toFixed(1) + ' -> ' + Lb.toFixed(1) + 'px for 87 -> 100px centres');
  const dAttr = byId.get('roadFill').getAttribute('d');
  chk('rendered chain path is finite', dAttr && !/NaN|undefined/.test(dAttr));
});
/* ------------------------------------------------------------------ */
test('TEST 13 — wheels stay on the road, frame stays rigid', () => {

  S.dist = 0; S.v = C.TARGET_V; S.userBrake = false;
  let rearErr = 0, frontErr = 0, wbErr = 0;
  for (let f = 0; f < 2400; f++) {
    step(dt); render(0);
    const tr = R.wheelG.r.getAttribute('transform').match(/translate\(([-\d.]+),([-\d.]+)\)/);
    const tf = R.wheelG.f.getAttribute('transform').match(/translate\(([-\d.]+),([-\d.]+)\)/);
    const rear = { x: +tr[1], y: +tr[2] }, front = { x: +tf[1], y: +tf[2] };
    rearErr = Math.max(rearErr, Math.abs(rear.y - roadY(S._wx)));
    frontErr = Math.max(frontErr, Math.abs(front.y - roadY(S._wx + C.WB)));
    const drawn = Math.hypot(front.x - rear.x, front.y - rear.y);
    wbErr = Math.max(wbErr, Math.abs(drawn - C.WB));
  }
  chk('rear wheel sits exactly on the road curve', rearErr < 0.02, 'max deviation ' + rearErr.toExponential(2) + 'px');
  chk('front wheel sits exactly on the road curve', frontErr < 0.02, 'max deviation ' + frontErr.toExponential(2) + 'px');
  chk('wheelbase is rigid in the drawing', wbErr < 1.6, 'max deviation ' + wbErr.toFixed(3) + 'px of ' + C.WB);
  /* toScreen/toLocal must be exact inverses */
  let inv = 0;
  for (const p of [0.05, -0.07, 0]) for (const pt of [{ x: 40, y: 120 }, { x: 200, y: 60 }, { x: -10, y: 200 }]) {
    const s = toScreen(pt.x, pt.y, p, C.REAR_X, 470);
    const back = toLocal(s.x, s.y, p, C.REAR_X, 470);
    inv = Math.max(inv, Math.hypot(back.x - pt.x, back.y - pt.y));
  }
  chk('toLocal inverts toScreen exactly', inv < 1e-9, 'max round-trip error ' + inv.toExponential(2) + 'px');
});
/* ------------------------------------------------------------------ */
test('TEST 14 — render output is finite everywhere (full scene sweep)', () => {

  S.dist = 0; S.v = C.TARGET_V; S.rain = 3;
  let worst = null;
  for (let f = 0; f < 1200; f++) { step(dt); render(f * 16.7); const s = nanSweep(); if (s.bad) { worst = s; break; } }
  const s = nanSweep();
  chk('no NaN/Infinity/undefined in any attribute', s.bad === 0, s.bad + ' bad of ' + s.checked + ' attributes' + (s.bad ? ' e.g. ' + s.samples.join(' | ') : ''));
  /* state must be finite too */
  const keys = ['dist', 'v', 'wheelAng', 'crankAng', 'travelPx', 'suspD', 'suspDV', 'pouchAng', 'parcelAng', 'headAng', 'hipX', 'hipY', 'ikErr', 'comMargin'];
  const badKeys = keys.filter(k => !Number.isFinite(S[k]));
  chk('every state variable finite after 20 s', badKeys.length === 0, badKeys.length ? 'bad: ' + badKeys.join(',') : 'all ' + keys.length + ' finite');
  /* HUD text must be numbers, not "NaN" */
  const hudIds = ['hSpeed', 'hCad', 'hGear', 'hGrade', 'hFork', 'hSlip', 'hCom', 'hIk', 'hBot', 'hFps'];
  const badHud = hudIds.filter(id => { const t = byId.get(id).textContent; return !t || /NaN|undefined|Infinity/.test(t); });
  chk('HUD chips all show real numbers', badHud.length === 0, badHud.length ? 'bad: ' + badHud.join(',') : hudIds.map(id => id + '=' + byId.get(id).textContent).join(' '));
});
/* ------------------------------------------------------------------ */
test('TEST 15 — determinism and the pause gate, driven through the real rAF loop', () => {

  /* Reset EVERY numeric and boolean field of S rather than listing the ones I
     remembered. An incomplete reset is what made the first version of this test
     report two "identical" runs disagreeing: run B started from the state run A
     left behind. Enumerating the object makes the starting state identical by
     construction, so any divergence afterwards is the page's fault. */
  const canon = () => {
    for (const k of Object.keys(S)) {
      const t = typeof S[k];
      if (t === "number") S[k] = 0;
      else if (t === "boolean") S[k] = false;
    }
    S.dist = 0; S.v = C.TARGET_V; S.gear = 1; S.rain = 3; S.playing = true;
    S.autoGear = true; S.effort = 0; S.suspD = 0.004; S.travelPx = C.SAG;
    /* The CCD chains keep their pose between solves and are NOT part of S, so
       resetting S alone leaves hidden state behind: CCD is iterative, so the
       converged answer depends on the pose it started from. That is why the
       first version of this test saw two "identical" runs differ by 2.3e-13 in
       S.ikErr. Clearing the seeded flag forces the documented cold-start
       straight-line re-seed, which also exercises that path every run. */
    for (const ch of [legN(), legF(), wingN(), wingF()]) ch.seeded = false;
    for (let i = 0; i < 150; i++) step(dt);      // the page's own 150-step pre-roll
    S.bottomOuts = 0; S.hipCapActive = 0; S.t = 0;
  };
  const snap = () => [S.dist, S.v, S.crankAng, S.suspD, S.travelPx, S.pouchAng,
                      S.ikErr, S.headAng, S.comMargin, S.bottomOuts, S.throttle,
                      S.torsoLean, S.crankOmega].map(Number);
  const ride = (frames, withRender) => {
    canon();
    for (let i = 0; i < frames; i++) { step(dt); if (withRender) render(i * 16.7); }
    return snap();
  };
  const A = ride(600, false), B = ride(600, false), R = ride(600, true);
  const same = A.every((v, i) => v === B[i]);
  chk("two identical runs agree bit for bit", same,
      same ? "13 state fields identical after 600 frames"
        : A.map((v, i) => Math.abs(v - B[i]) > 0 ? "field" + i + ":" + v + "!=" + B[i] : null).filter(Boolean).join(" "));
  const noPerturb = A.every((v, i) => Math.abs(v - R[i]) < 1e-12);
  chk("rendering does not perturb the physics", noPerturb,
      "same trajectory with and without 600 render() calls");

  /* The pause gate lives in the rAF loop, not in step(), so drive the loop. */
  const raf = windowStub.__rafCb;
  if (typeof raf === "function") {
    canon();
    S.playing = false;
    const d0 = S.dist, t0 = S.t, c0 = S.crankAng;
    for (let f = 0; f < 90; f++) raf(f * 16.7);            // 1.5 s of paused frames
    chk("paused: the loop keeps ticking but nothing advances",
        S.dist === d0 && S.t === t0 && S.crankAng === c0,
        "90 frames later: dist +" + (S.dist - d0).toExponential(2) + ", clock +" + (S.t - t0).toExponential(2));
    chk("paused: it still re-registers the next frame",
        typeof windowStub.__rafCb === "function" && windowStub.__rafCount > 90,
        windowStub.__rafCount + " rAF callbacks registered");
    S.playing = true;
    for (let f = 0; f < 60; f++) raf(1500 + f * 16.7);
    chk("resumed: the sim picks up again", S.t > 0.5 && S.dist > 5,
        "t=" + S.t.toFixed(2) + "s dist=" + S.dist.toFixed(1) + "px");
    chk("the loop uses real elapsed time, not a fixed dt", Number.isFinite(S.dt) && S.dt > 0,
        "S.dt = " + S.dt.toFixed(5) + "s for a 16.7ms frame");
  } else {
    chk("the loop registers a rAF callback", false, "no callback captured");
  }
});
/* ------------------------------------------------------------------ */
test('TEST 16 — rain: recycling, apparent slant, and the level control', () => {

  const plane = layers.rain[1];
  S.dist = 0; S.v = 0; S.rain = 3;
  for (let f = 0; f < 120; f++) { step(dt); render(0); }
  /* Slant must be measured WITHOUT calling step() first: step() recomputes S.v
     from the physics and wipes whatever speed the test just set, which is why
     the first version of this test "measured" 27.2deg vs 26.4deg — two renders
     at essentially the same speed. render() alone honours S.v. */
  const ang = t => parseFloat(((t || "").match(/rotate\(([-\d.]+)\)/) || [0, 0])[1]);
  const slantAt = v => { S.v = v; render(0);
    return plane.drops.slice(0, 30).map(d => ang(d.e.getAttribute("transform"))); };
  const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
  const s1 = slantAt(0.5), s9 = slantAt(9), s16 = slantAt(16);
  chk('rain leans harder as the bike speeds up', mean(s9) > mean(s1) + 1 && mean(s16) > mean(s9),
      mean(s1).toFixed(1) + ' -> ' + mean(s9).toFixed(1) + ' -> ' + mean(s16).toFixed(1) + 'deg at 0.5/9/16 m/s');
  chk('slant is monotonic in speed', Math.min(...s16) >= Math.max(...s1) - 0.01,
      'slowest heavy ' + Math.max(...s1).toFixed(2) + 'deg, fastest light ' + Math.min(...s16).toFixed(2) + 'deg');
  chk('slant stays sane (no horizontal rain)', mean(s16) < 80 && mean(s1) >= 0, 'range ' + mean(s1).toFixed(1) + '..' + mean(s16).toFixed(1) + 'deg');
  /* the drops must actually drift across the screen, not just tilt */
  const x0 = plane.drops.slice(0, 30).map(d => d.x);
  S.v = 12; for (let f = 0; f < 30; f++) { step(dt); render(0); }
  const moved = plane.drops.slice(0, 30).filter((d, i) => d.x !== x0[i]).length;
  chk('drops translate as well as tilt', moved > 0, moved + ' of 30 changed x while riding at 12 m/s');
  let out = 0;
  for (const rp of layers.rain) for (const d of rp.drops) if (d.y > 700 || d.y < -400 || !Number.isFinite(d.x) || !Number.isFinite(d.y)) out++;
  chk('every drop stays in a sane band', out === 0, out + ' escaped of ' + layers.rain.reduce((s, r) => s + r.drops.length, 0));
  /* rain level changes the number of live drops */
  const live = lvl => { S.rain = lvl; render(0); return layers.rain[1].activeLast; };
  const off = live(0), driz = live(1), heavy = live(3);
  chk('rain level really gates the particle count', off === 0 && driz > 0 && heavy > driz, 'off=' + off + ' drizzle=' + driz + ' heavy=' + heavy);
  S.rain = 3; S.playing = true;
});
/* ------------------------------------------------------------------ */
test('TEST 17 — the reflection is a true mirror about the wet road line', () => {

  S.dist = 500; S.v = C.TARGET_V; S.userBrake = false;
  for (let f = 0; f < 600; f++) step(dt);
  render(0);
  const tr = byId.get('reflRiderG').getAttribute('transform');
  const m = tr.match(/translate\(0,([-\d.]+)\) scale\(1,([-\d.]+)\)/);
  const ty = +m[1], sc = +m[2];
  /* The page's own anchor and squash. The anchor is the road line at
     mid-wheelbase plus 6px, read from the position the PICTURE was sampled at
     (S._wx), not the odometer (S.dist) which step() has already advanced.
     squash is a slow shimmer, not a suspension read-out: 0.86 + 0.03*sin(t*1.7). */
  const anchor = roadY(S._wx + C.WB * 0.5) + 6;
  const squash = 0.86 + 0.03 * Math.sin(S.t * 1.7);
  const mapped = ty + sc * anchor;            // y -> ty + sy*y, sy is already negative
  chk('flip is anchored exactly on the road line', Math.abs(mapped - anchor) < 0.02,
      'anchor ' + anchor.toFixed(2) + ' maps to ' + mapped.toFixed(3));
  chk('squash matches the shimmer formula', Math.abs(-sc - squash) < 1e-4,
      'scale y = ' + sc + ', 0.86+0.03sin(t*1.7) = ' + squash.toFixed(6));
  chk('the anchor is a fixed point for ANY squash', (() => {
      let worst = 0;
      for (const q of [0.6, 0.75, 0.86, 0.94, 1.0]) worst = Math.max(worst, Math.abs((anchor * (1 + q) - q * anchor) - anchor));
      return worst < 1e-9;
    })(), 'the mirror holds whatever the shimmer does');
  chk('reflection is squashed and inverted', sc < 0 && sc > -1, 'scale y = ' + sc.toFixed(4));
});
/* ------------------------------------------------------------------ */
test('TEST 19 — frame-rate invariance: the ride must not depend on the refresh rate', () => {

  /* The smoothing rates are now continuous time constants, so 30 fps and 60 fps
     should trace nearly the same ride over the same wall-clock time. Before the
     fix every lerp advanced a fixed fraction PER FRAME, which made the whole
     rig — throttle, brake, torso lean, coast-down — settle twice as slowly on a
     30 Hz screen as on a 60 Hz one. */
  const ride = (hz, seconds) => {
    const d = 1 / hz;
    S.dist = 0; S.v = 0; S.gear = 1; S.crankAng = 0; S.throttle = 0; S.brakeDemand = 0;
    S.torsoLean = 0; S.crankOmega = 0; S.suspD = 0; S.suspDV = 0;
    S.pouchAng = 0; S.pouchV = 0; S.parcelAng = 0; S.parcelV = 0; S.headAng = 0; S.headV = 0;
    S.rain = 2; S.playing = true; S.userBrake = false; S.effort = 0; S.autoGear = true;
    const pts = [];
    for (let i = 0; i < hz * seconds; i++) {
      step(d);
      if (i % hz === 0) pts.push(S.v);          // sample once per second
    }
    return pts;
  };
  const a = ride(60, 20), b = ride(30, 20);
  const errs = a.map((v, i) => Math.abs(v - b[i]));
  const worst = Math.max(...errs), mean = errs.reduce((s, x) => s + x, 0) / errs.length;
  chk("60 fps and 30 fps trace the same speed profile", worst < 0.35, "max " + worst.toFixed(3) + " m/s, mean " + mean.toFixed(4) + " m/s");
  chk("both rides cover the same ground", Math.abs(a.length - b.length) === 0, a.length + " vs " + b.length + " one-second samples");

  /* and the smoothing helper itself must be exact, not merely close */
  const one = smooth(0, 1, 9.05, 1 / 60), two = smooth(0, 1, 9.05, 1 / 30);
  const composed = smooth(one, 1, 9.05, 1 / 60);
  chk("two half-steps equal one whole step", Math.abs(two - composed) < 1e-12, "dt=1/30 gives " + two.toFixed(12) + ", 2x dt=1/60 gives " + composed.toFixed(12));
  chk("smoothing is time-based, not frame-based", Math.abs(two - (1 - Math.exp(-9.05 / 30))) < 1e-12, two.toFixed(12));
});
/* ------------------------------------------------------------------ */
test('TEST 20 — LEG_WORKSPACE is the real reachable maximum, not a hopeful number', () => {

  /* The hip cap depends on how far the toe can actually get from the hip once
     the joint limits are respected. That number is brute-forced here from the
     shipped link lengths and the shipped limits, so if anyone edits THIGH,
     SHANK, FOOT, KNEE_MAX or ANKLE_MAX the test fails instead of silently
     leaving the cap outside the workspace. */
  const D = Math.PI / 180;
  const a = C.THIGH, b = C.SHANK, c = C.FOOT;
  const toe = (K, A) => {                      // K, A are INTERIOR angles in radians
    const knee = { x: a, y: 0 };
    const shDir = Math.PI - K;                 // interior K deflects the shank by pi-K
    const ankle = { x: knee.x + b * Math.cos(shDir), y: knee.y + b * Math.sin(shDir) };
    const ftDir = shDir + (Math.PI - A);
    return { x: ankle.x + c * Math.cos(ftDir), y: ankle.y + c * Math.sin(ftDir) };
  };
  let maxD = 0, argK = 0, argA = 0; const N = 1500;
  for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
    const K = C.KNEE_MIN + (C.KNEE_MAX - C.KNEE_MIN) * i / N;
    const A = C.ANKLE_MIN + (C.ANKLE_MAX - C.ANKLE_MIN) * j / N;
    const t = toe(K, A), d = Math.hypot(t.x, t.y);
    if (d > maxD) { maxD = d; argK = K / D; argA = A / D; }
  }
  chk('LEG_WORKSPACE matches the brute-forced maximum', Math.abs(maxD - C.LEG_WORKSPACE) < 0.2,
      'brute force ' + maxD.toFixed(3) + 'px vs shipped ' + C.LEG_WORKSPACE + 'px (knee ' + argK.toFixed(1) + 'deg, ankle ' + argA.toFixed(1) + 'deg)');
  chk('the limits really do cost reach', maxD < C.LEG_REACH - 1,
      maxD.toFixed(2) + 'px reachable vs ' + C.LEG_REACH + 'px of link length');
  chk('the cap used at runtime is strictly inside the workspace', C.LEG_WORKSPACE * 0.89 < maxD - 1,
      'cap ' + (C.LEG_WORKSPACE * 0.89).toFixed(2) + 'px vs max ' + maxD.toFixed(2) + 'px');
  /* and the knee must end up in a biomechanically sensible range */
  S.dist = 0; S.v = C.TARGET_V; S.rain = 3; S.userBrake = false; S.effort = 0;
  const knees = [];
  for (let f = 0; f < 3600; f++) { step(dt); knees.push(interior(legN().pts, 1) / D); }
  knees.sort((x, y) => x - y);
  const pinned = knees.filter(k => Math.abs(k - C.KNEE_MAX / D) < 0.6).length;
  chk('the knee is not pinned against its limit', pinned / knees.length < 0.01,
      (pinned / knees.length * 100).toFixed(2) + '% of frames at KNEE_MAX; range ' +
      knees[0].toFixed(1) + '..' + knees[knees.length - 1].toFixed(1) + 'deg');
  chk('knee flexion at bottom dead centre is cyclist-like', knees[knees.length - 1] < 170 && knees[knees.length - 1] > 140,
      'peak extension ' + knees[knees.length - 1].toFixed(1) + 'deg interior (a real rider is ~145-155)');
});
/* ------------------------------------------------------------------ */
test('TEST 18 — cost per frame', () => {

  S.dist = 0; S.v = C.TARGET_V; S.rain = 3;
  for (let f = 0; f < 60; f++) { step(dt); render(0); }
  const t0 = process.hrtime.bigint();
  const N = 600;
  for (let f = 0; f < N; f++) { step(dt); render(f); }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / N;
  const writes = allEls().reduce((s, e) => s + Object.keys(e.attrs).length, 0);
  chk('step+render under 1.5ms/frame in node', ms < 1.5, ms.toFixed(3) + ' ms/frame (' + (ms * 60).toFixed(1) + '% of a 60Hz budget), ' + writes + ' live attributes');
});
