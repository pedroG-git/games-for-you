// Paciência - Klondike solitaire rendered with Three.js.
import * as THREE from '../../../shared/vendor/three/three.module.js';
import * as E from './engine.js';
import { CW, CH, CR, THEMES, faceTexture, backTexture, feltTexture, slotTexture, shadowTexture, roundedRectGeometry } from './cards.js';
import { sfx, play, unlock } from './audio.js';

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - t, 3);

// ---------------------------------------------------------------- save data
const LS_KEY = 'paciencia-v1';
// One-time move of saves made under the old key.
try { const old = localStorage.getItem('paciencia-joana-v1'); if (old !== null && localStorage.getItem(LS_KEY) === null) localStorage.setItem(LS_KEY, old); localStorage.removeItem('paciencia-joana-v1'); } catch (e) { /* storage blocked */ }
const blankStats = () => ({ played: 0, won: 0, streak: 0, best: 0, time: 0, moves: 0 });
const DEFAULTS = {
  settings: { draw: 1, theme: 'verde', sound: true, haptic: true, left: false, diff: 'normal' },
  stats: { 1: blankStats(), 3: blankStats() }, recent: [], daily: {}, game: null,
};
let data = structuredClone(DEFAULTS);
try {
  const raw = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
  if (raw) data = { ...data, ...raw, settings: { ...data.settings, ...raw.settings }, stats: { ...data.stats, ...raw.stats } };
} catch (e) { /* start fresh */ }
const S = data.settings;
function persist() {
  try {
    if (data.game) data.game.undo = undoStack.slice(-200);
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch (e) { /* storage unavailable: play without saving */ }
}

// ---------------------------------------------------------------- scene
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 3));
const scene = new THREE.Scene();
const FOV = 32, TILT = 0.14;
const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 100);
scene.add(new THREE.AmbientLight(0xffffff, 2.35));
const sun = new THREE.DirectionalLight(0xfff4e0, 0.9);
sun.position.set(-4, 6, 12); scene.add(sun);

const felt = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshBasicMaterial());
felt.position.z = -0.02; scene.add(felt);

const STEP = 1.13, TAB_Y = -(CH + 0.3), Z_STEP = 0.012;
const OFF_DOWN = 0.21, OFF_UP = 0.48, FAN = 0.4;
const colX = i => (i - 3) * STEP;
const foundX = s => colX(S.left ? 3 + s : s);
const stockX = () => colX(S.left ? 0 : 6);
const wasteX = () => colX(S.left ? 1 : 5);

const cardGeo = roundedRectGeometry(CW, CH, CR);
const slotGeo = new THREE.PlaneGeometry(CW, CH);
const mkSlot = kind => {
  const m = new THREE.Mesh(slotGeo, new THREE.MeshBasicMaterial({ map: slotTexture(kind), transparent: true, depthWrite: false }));
  m.position.z = 0.001; scene.add(m); return m;
};
const slots = { found: [0, 1, 2, 3].map(mkSlot), stock: mkSlot('stock'), tab: Array.from({ length: 7 }, () => mkSlot('plain')) };

const backMat = new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0 });
const shadowTex = shadowTexture();
const shadowGeo = new THREE.PlaneGeometry(CW / 0.6875, CH / 0.7727);
const cards = [];
for (let c = 0; c < 52; c++) {
  const g = new THREE.Group();
  const front = new THREE.Mesh(cardGeo, new THREE.MeshStandardMaterial({ map: faceTexture(c, renderer), roughness: 0.55, metalness: 0 }));
  const back = new THREE.Mesh(cardGeo, backMat); back.rotation.y = Math.PI;
  g.add(front, back); scene.add(g);
  const shadow = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.45 }));
  scene.add(shadow);
  cards.push({
    id: c, g, shadow, x: 0, y: 0, z: 0, ry: Math.PI, rz: 0, tx: 0, ty: 0, lift: 0,
    jit: (((c * 7919) % 13) / 13 - 0.5) * 0.022, T: { x: 0, y: 0, z: 0, ry: Math.PI, sh: false },
    anim: null, drag: null, phys: null, fx: null,
  });
}

// glow marker for hints and drop targets
const glow = (() => {
  const cv = document.createElement('canvas'); cv.width = 160; cv.height = 220;
  const x = cv.getContext('2d');
  x.strokeStyle = '#ffd95a'; x.lineJoin = 'round';
  for (const [lw, a] of [[26, 0.12], [18, 0.2], [10, 0.45], [5, 1]]) { x.globalAlpha = a; x.lineWidth = lw; x.strokeRect(22, 22, 116, 176); }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(CW * 160 / 116, CH * 220 / 176),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }));
  m.renderOrder = 10; m.visible = false; scene.add(m);
  return { m, until: 0, hold: false };
})();

// confetti
const CONF_N = 150;
const confetti = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.17, 0.27), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), CONF_N);
confetti.visible = false; confetti.frustumCulled = false; scene.add(confetti);
const confP = [];
{
  const cols = ['#f1c450', '#e8556b', '#4fb6e6', '#7bd389', '#ffffff', '#b98be8'];
  const c = new THREE.Color();
  for (let i = 0; i < CONF_N; i++) { confP.push({}); confetti.setColorAt(i, c.set(cols[i % cols.length])); }
}
let confT = -1;

// ---------------------------------------------------------------- camera fit
const view = { w: 1, h: 1, yBottom: -12, yTop: 2, halfW: 4 };
const v3 = new THREE.Vector3(), ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), ndc = new THREE.Vector2();
function toScreen(x, y) { v3.set(x, y, 0).project(camera); return { x: (v3.x + 1) / 2 * view.w, y: (1 - v3.y) / 2 * view.h }; }
function toWorld(px, py, out = new THREE.Vector3()) {
  ndc.set(px / view.w * 2 - 1, 1 - py / view.h * 2);
  ray.setFromCamera(ndc, camera);
  return ray.ray.intersectPlane(plane, out) || out.set(0, 0, 0);
}
function fitCamera() {
  const w = window.innerWidth, h = window.innerHeight;
  view.w = w; view.h = h;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const topPx = $('top').offsetHeight + 8, botPx = $('bar').offsetHeight + 6;
  const halfW = 3 * STEP + CW / 2 + 0.1, minDepth = 9.4;
  const place = (dist, cy) => {
    camera.position.set(0, cy - dist * Math.sin(TILT), dist * Math.cos(TILT));
    camera.up.set(0, 1, 0); camera.lookAt(0, cy, 0);
    camera.near = Math.max(0.5, dist - 9); camera.far = dist + 16;
    camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  };
  const solveCy = dist => {
    let lo = -60, hi = 30;
    for (let i = 0; i < 32; i++) { const mid = (lo + hi) / 2; place(dist, mid); if (toScreen(0, CH / 2).y < topPx) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  };
  const ok = dist => {
    place(dist, solveCy(dist));
    if (toScreen(0, CH / 2 - minDepth).y > h - botPx) return false;
    for (let y = CH / 2; y > -30; y -= 0.5) {
      const p = toScreen(halfW, y);
      if (p.y > h - botPx) break;
      if (p.x > w - 1) return false;
    }
    return true;
  };
  let lo = 4, hi = 240;
  for (let i = 0; i < 32; i++) { const mid = (lo + hi) / 2; if (ok(mid)) hi = mid; else lo = mid; }
  place(hi, solveCy(hi));
  view.yBottom = toWorld(w / 2, h - botPx).y;
  view.yTop = toWorld(w / 2, 0).y;
  view.halfW = Math.abs(toWorld(w, h - botPx).x);
  felt.position.set(0, (view.yBottom + view.yTop) / 2, -0.02);
  dirty = true;
}

// ---------------------------------------------------------------- game state
let st = null, G = null, undoStack = [];
let seeds = null, dirty = true, lockUntil = 0, celebrating = false, finishing = false;
const now = () => performance.now() / 1000;

function layoutSlots() {
  for (let s = 0; s < 4; s++) slots.found[s].position.set(foundX(s), 0, 0.001);
  slots.stock.position.set(stockX(), 0, 0.001);
  for (let i = 0; i < 7; i++) slots.tab[i].position.set(colX(i), TAB_Y, 0.001);
}

function computeLayout() {
  const set = (c, x, y, idx, up, sh) => { const T = cards[c].T; T.x = x; T.y = y; T.z = 0.012 + idx * Z_STEP; T.ry = up ? 0 : Math.PI; T.sh = sh; };
  st.stock.forEach((c, i) => set(c, stockX(), i * 0.004, i, false, i === 0));
  const nw = st.waste.length, shown = st.draw === 3 ? Math.min(3, nw) : Math.min(1, nw);
  st.waste.forEach((c, i) => {
    const k = Math.max(0, i - (nw - shown));
    // lower cards always peek out on the left so their rank stays readable
    const fx = S.left ? k * FAN : -(Math.max(shown, 1) - 1 - k) * FAN;
    set(c, wasteX() + fx, Math.min(i, 24) * 0.003, i, true, i >= nw - shown || i === 0);
  });
  st.found.forEach((p, s) => p.forEach((c, i) => set(c, foundX(s), i * 0.003, i, true, i === 0 || i === p.length - 1)));
  const avail = (TAB_Y + CH / 2) - view.yBottom - 0.12;
  st.tab.forEach((p, i) => {
    const nd = p.length - st.up[i], nu = st.up[i];
    const need = nd * OFF_DOWN + Math.max(0, nu - 1) * OFF_UP;
    const sc = need + CH > avail ? clamp((avail - CH) / need, 0.3, 1) : 1;
    let y = TAB_Y;
    p.forEach((c, k) => { set(c, colX(i), y, k, k >= nd, true); y -= (k < nd ? OFF_DOWN : OFF_UP) * sc; });
  });
}

// Move every card towards its place in the current state.
function sync(o = {}) {
  computeLayout();
  const t0 = now(), dur = o.dur ?? 0.24;
  for (const c of cards) {
    if (c.drag || c.phys) continue;
    const T = c.T;
    const moved = Math.abs(c.x - T.x) > 0.004 || Math.abs(c.y - T.y) > 0.004;
    const flip = Math.abs(c.ry - T.ry) > 0.01;
    if (!moved && !flip && !c.anim && Math.abs(c.z - T.z) < 0.0005) continue;
    if (dur === 0) { c.x = T.x; c.y = T.y; c.z = T.z; c.ry = T.ry; c.lift = 0; c.anim = null; continue; }
    let delay = o.delay ? (o.delay(c.id) || 0) : 0;
    let lift = (moved || flip) ? (o.lift ?? 0.5) : 0;
    if (flip) lift = Math.max(lift, 0.55);
    if (flip && !moved) delay += 0.1;
    c.anim = { t0: t0 + delay, dur: flip && !moved ? 0.3 : dur, lift, from: null, onStart: o.onStart };
  }
  dirty = true;
}

function snapshot() { return { st: E.clone(st), moves: G.moves }; }
function pushUndo() { undoStack.push(snapshot()); if (undoStack.length > 600) undoStack.shift(); }

function startClock() {
  if (!G.counted) { G.counted = true; data.stats[st.draw].played++; }
}

function afterChange() {
  updateHud();
  if (E.isWon(st)) { win(); return; }
  $('finish').hidden = !(E.allFaceUp(st) && !finishing);
  persist();
}

function doMove(m, fromDrag = false) {
  if (!E.legal(st, m)) return false;
  pushUndo(); startClock();
  const lead = E.leadCard(st, m);
  const res = E.apply(st, m);
  G.moves++;
  if (m.to[0] === 'f') play.foundation(E.rankOf(lead)); else play.place();
  if (res.flipped !== null) play.flip(0.14);
  sync({ dur: fromDrag ? 0.15 : 0.25, lift: fromDrag ? 0 : 0.55 });
  afterChange();
  return true;
}

function doDraw() {
  if (!E.legal(st, { t: 'draw' })) { play.error(); return; }
  pushUndo(); startClock();
  const before = st.waste.length;
  const res = E.apply(st, { t: 'draw' });
  G.moves++;
  if (res.recycled) {
    play.recycle();
    const n = st.stock.length;
    sync({ dur: 0.22, lift: 0.5, delay: id => (n - 1 - st.stock.indexOf(id)) * 0.006 });
  } else {
    play.draw();
    sync({ dur: 0.26, lift: 0.6, delay: id => { const i = st.waste.indexOf(id); return i >= before ? (i - before) * 0.07 : 0; } });
  }
  afterChange();
}

function undo() {
  if (!undoStack.length || celebrating || finishing || now() < lockUntil) { if (!undoStack.length) play.error(); return; }
  const s = undoStack.pop();
  st = s.st; G.st = st; G.moves = s.moves;
  play.undo();
  sync({ dur: 0.2, lift: 0.45 });
  afterChange();
}

// ---------------------------------------------------------------- new game / deal
function pickSeed(diff) {
  const list = seeds[S.draw][diff];
  for (let i = 0; i < 40; i++) {
    const s = list[Math.floor(Math.random() * list.length)];
    if (!data.recent.includes(s)) return s;
  }
  return list[Math.floor(Math.random() * list.length)];
}
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
function dailySeed() {
  const d = new Date(); const day = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  const list = seeds[S.draw].normal; return list[day % list.length];
}

function newGame({ diff = S.diff, seed = null, daily = null, restart = false } = {}) {
  if (G && G.counted && !G.won && !restart) data.stats[st.draw].streak = 0;
  if (seed === null) seed = pickSeed(diff);
  if (!restart) { data.recent.push(seed); if (data.recent.length > 300) data.recent.shift(); }
  const keep = restart && G ? { counted: G.counted } : {};
  st = E.newGame(seed, restart && G ? st.draw : S.draw);
  G = { st, moves: 0, time: 0, counted: false, won: false, diff, daily, seed, ...keep };
  data.game = G; undoStack = [];
  stopCelebration(); finishing = false;
  $('finish').hidden = true; hideSheets();
  dealAnimation();
  updateHud(); persist();
}

function dealAnimation() {
  // gather every card onto the stock, then deal row by row
  const t0 = now(), gx = stockX();
  cards.forEach((c, i) => {
    c.phys = null; c.drag = null; c.fx = null; c.g.visible = true;
    c.T.x = gx; c.T.y = 0; c.T.z = 0.012 + i * Z_STEP; c.T.ry = Math.PI; c.T.sh = i === 0;
    c.anim = { t0, dur: 0.28, lift: 0.3, from: null };
  });
  lockUntil = t0 + 0.34 + 28 * 0.045 + 0.4;
  const order = new Map(); let k = 0;
  for (let r = 0; r < 7; r++) for (let i = r; i < 7; i++) order.set(st.tab[i][r], k++);
  setTimeout(() => {
    sync({ dur: 0.3, lift: 0.7, delay: id => (order.has(id) ? order.get(id) * 0.045 : 0), onStart: id => { if (order.has(id)) play.deal(); } });
  }, 340);
  dirty = true;
}

// ---------------------------------------------------------------- win
function win() {
  if (G.won) return;
  G.won = true; finishing = false;
  $('finish').hidden = true;
  const s = data.stats[st.draw];
  s.won++; s.streak++; s.best = Math.max(s.best, s.streak);
  const t = Math.round(G.time);
  const recT = !s.time || t < s.time, recM = !s.moves || G.moves < s.moves;
  if (recT) s.time = t; if (recM) s.moves = G.moves;
  if (G.daily) data.daily[G.daily] = true;
  persist();
  play.win();
  setTimeout(startCelebration, 450);
  setTimeout(() => {
    $('win-note').textContent = recT && s.won > 1 ? 'Novo melhor tempo!' : G.daily ? 'Jogo do dia concluído.' : 'Jogo resolvido.';
    $('win-stats').innerHTML = statCells([[fmtTime(t), 'Tempo'], [G.moves, 'Jogadas'], [s.streak, 'Série atual'], [s.won, 'Jogos ganhos']]);
    $('win').hidden = false;
  }, 2600);
}

let celT = 0, celNext = 0, celOrder = [];
function startCelebration() {
  celebrating = true; celT = 0; celNext = 0; celOrder = [];
  for (let r = 12; r >= 0; r--) for (let s = 0; s < 4; s++) celOrder.push(s * 13 + r);
  confT = 0;
  for (const p of confP) spawnConf(p, true);
  confetti.visible = true;
  dirty = true;
}
function stopCelebration() {
  celebrating = false; confT = -1; confetti.visible = false;
  for (const c of cards) { c.phys = null; c.g.visible = true; }
}
function spawnConf(p, first) {
  p.x = (Math.random() * 2 - 1) * (view.halfW + 0.5);
  p.y = view.yTop + 0.5 + Math.random() * (first ? 14 : 2);
  p.z = 1.2 + Math.random() * 1.5;
  p.vy = -(3.2 + Math.random() * 3.5); p.ph = Math.random() * 6.28; p.sp = 2 + Math.random() * 5;
  p.rx = Math.random() * 6.28; p.rz = Math.random() * 6.28;
}
const dummy = new THREE.Object3D();
function updateCelebration(dt) {
  if (celebrating) {
    celT += dt;
    while (celNext < 52 && celT > celNext * 0.085) {
      const c = cards[celOrder[celNext]];
      const dir = Math.random() < 0.5 ? -1 : 1;
      c.anim = null;
      c.phys = { vx: dir * (1.3 + Math.random() * 2.6), vy: 1.5 + Math.random() * 3.5, vr: (Math.random() * 2 - 1) * 5, vf: (Math.random() < 0.35 ? 6 : 0), z: 1.0 + celNext * 0.02 };
      celNext++;
    }
    const floor = view.yBottom + CH * 0.55;
    let alive = celNext < 52;
    for (const c of cards) {
      const p = c.phys; if (!p) continue;
      p.vy -= 17 * dt;
      c.x += p.vx * dt; c.y += p.vy * dt; c.z = p.z; c.rz += p.vr * dt; c.ry += p.vf * dt;
      if (c.y < floor && p.vy < 0) { c.y = floor; p.vy = -p.vy * 0.8; p.vr *= 0.9; if (Math.abs(p.vy) > 3) play.deal(); }
      if (Math.abs(c.x) > view.halfW + 1.2) c.g.visible = false; else alive = true;
    }
    if (!alive && celT > 6) celebrating = false;
  }
  if (confT >= 0) {
    confT += dt;
    let any = false;
    for (let i = 0; i < CONF_N; i++) {
      const p = confP[i];
      p.y += p.vy * dt; p.x += Math.sin(confT * 2 + p.ph) * 1.2 * dt; p.rx += p.sp * dt; p.rz += p.sp * 0.6 * dt;
      if (p.y < view.yBottom - 1) { if (confT < 5) spawnConf(p, false); else p.y = -999; }
      if (p.y > -900) any = true;
      dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(p.rx, p.ph, p.rz); dummy.updateMatrix();
      confetti.setMatrixAt(i, dummy.matrix);
    }
    confetti.instanceMatrix.needsUpdate = true;
    if (!any) { confT = -1; confetti.visible = false; }
  }
}

// ---------------------------------------------------------------- auto-finish
function autoFinish() {
  if (finishing || !E.allFaceUp(st) || E.isWon(st)) return;
  finishing = true; $('finish').hidden = true;
  pushUndo(); startClock();
  let stall = 0, n = 0;
  const step = () => {
    if (!finishing) return;
    let best = null;
    const consider = (c, from) => { if (E.canFound(st, c) && (!best || E.rankOf(c) < E.rankOf(best.c))) best = { c, from }; };
    st.tab.forEach((p, i) => { if (p.length) consider(p[p.length - 1], ['t', i]); });
    if (st.waste.length) consider(st.waste[st.waste.length - 1], ['w']);
    if (best) {
      E.apply(st, { t: 'move', from: best.from, to: ['f'], n: 1 }); G.moves++; stall = 0;
      play.foundation(E.rankOf(best.c)); n++;
      sync({ dur: 0.22, lift: 0.6 });
    } else if (st.stock.length + st.waste.length && stall < 2 * (st.stock.length + st.waste.length) + 6) {
      E.apply(st, { t: 'draw' }); G.moves++; stall++;
      sync({ dur: 0.12, lift: 0.3 });
    } else { finishing = false; afterChange(); return; }
    updateHud();
    if (E.isWon(st)) { finishing = false; setTimeout(win, 260); return; }
    setTimeout(step, best ? Math.max(45, 95 - n * 1.2) : 40);
  };
  step();
}

// ---------------------------------------------------------------- hints, feedback
function showGlow(x, y, secs) { glow.m.position.set(x, y, 0.4); glow.m.visible = true; glow.until = now() + secs; glow.hold = false; dirty = true; }
function hint() {
  if (celebrating || finishing || now() < lockUntil || G.won) return;
  const h = E.hints(st)[0];
  if (!h) { play.error(); return; }
  play.hint();
  const t0 = now();
  if (h.t === 'draw') {
    showGlow(stockX(), 0, 1.3);
    const top = st.stock[st.stock.length - 1];
    if (top !== undefined) cards[top].fx = { kind: 'hop', t0, dur: 1.1, dx: 0, dy: 0 };
    return;
  }
  let ids, dest;
  if (h.from[0] === 't') { const p = st.tab[h.from[1]]; ids = p.slice(p.length - h.n); } else ids = [st.waste[st.waste.length - 1]];
  if (h.to[0] === 'f') dest = { x: foundX(E.suitOf(ids[0])), y: 0 };
  else { const p = st.tab[h.to[1]]; dest = p.length ? { x: colX(h.to[1]), y: cards[p[p.length - 1]].T.y - OFF_UP } : { x: colX(h.to[1]), y: TAB_Y }; }
  showGlow(dest.x, dest.y, 1.3);
  const lead = cards[ids[0]];
  for (const id of ids) cards[id].fx = { kind: 'hop', t0, dur: 1.1, dx: (dest.x - lead.T.x) * 0.28, dy: (dest.y - lead.T.y) * 0.28 };
  dirty = true;
}
function shake(ids) { const t0 = now(); for (const id of ids) cards[id].fx = { kind: 'shake', t0, dur: 0.32 }; dirty = true; }

// ---------------------------------------------------------------- input
function inRect(p, x, y, pad = 0) { return Math.abs(p.x - x) <= CW / 2 + pad && Math.abs(p.y - y) <= CH / 2 + pad; }
function pick(p) {
  if (inRect(p, stockX(), 0, 0.08)) return { type: 'stock' };
  if (st.waste.length) { const c = cards[st.waste[st.waste.length - 1]]; if (inRect(p, c.T.x, c.T.y, 0.04)) return { type: 'w' }; }
  for (let s = 0; s < 4; s++) if (inRect(p, foundX(s), 0, 0.04)) return { type: 'f', i: s };
  for (let i = 0; i < 7; i++) {
    const pile = st.tab[i];
    if (Math.abs(p.x - colX(i)) > STEP / 2) continue;
    for (let k = pile.length - 1; k >= 0; k--) { const c = cards[pile[k]]; if (Math.abs(p.y - c.T.y) <= CH / 2) return { type: 't', i, idx: k }; }
  }
  return null;
}
function hitMove(hit) { // {from, n, ids} for a pickable hit
  if (!hit) return null;
  if (hit.type === 'w') return { from: ['w'], n: 1, ids: [st.waste[st.waste.length - 1]] };
  if (hit.type === 'f') { const p = st.found[hit.i]; return p.length ? { from: ['f', hit.i], n: 1, ids: [p[p.length - 1]] } : null; }
  if (hit.type === 't') {
    const p = st.tab[hit.i], n = p.length - hit.idx;
    return n <= st.up[hit.i] ? { from: ['t', hit.i], n, ids: p.slice(hit.idx) } : null;
  }
  return null;
}

let ptr = null;
const wp = new THREE.Vector3();
canvas.addEventListener('pointerdown', e => {
  unlock();
  if (ptr || celebrating || finishing || now() < lockUntil || !st || G.won) return;
  toWorld(e.clientX, e.clientY, wp);
  ptr = { id: e.pointerId, sx: e.clientX, sy: e.clientY, hit: pick(wp), p0: wp.clone(), p: wp.clone(), drag: null };
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
});
canvas.addEventListener('pointermove', e => {
  if (!ptr || e.pointerId !== ptr.id) return;
  toWorld(e.clientX, e.clientY, ptr.p);
  if (!ptr.drag && Math.hypot(e.clientX - ptr.sx, e.clientY - ptr.sy) > 9) {
    const hm = hitMove(ptr.hit);
    if (hm) {
      ptr.drag = hm;
      hm.ids.forEach((id, k) => { const c = cards[id]; c.anim = null; c.fx = null; c.drag = { ox: c.x - ptr.p0.x, oy: c.y - ptr.p0.y, k }; });
      play.pick();
    } else ptr.hit = null; // moved too far to count as a tap
  }
  if (ptr.drag) { updateDropGlow(); dirty = true; }
});
function dropTarget() {
  const d = ptr.drag, lead = cards[d.ids[0]], card = d.ids[0];
  let best = null, bd = 1e9;
  if (d.n === 1 && d.from[0] !== 'f' && E.canFound(st, card) && Math.abs(lead.y) < 1.15) {
    for (let s = 0; s < 4; s++) { const dx = Math.abs(lead.x - foundX(s)); if (dx < 0.7 && dx < bd) { bd = dx; best = { to: ['f'], x: foundX(E.suitOf(card)), y: 0 }; } }
  }
  if (!best && lead.y < TAB_Y + CH * 0.95) {
    for (let j = 0; j < 7; j++) {
      if (d.from[0] === 't' && d.from[1] === j) continue;
      const dx = Math.abs(lead.x - colX(j));
      if (dx < 0.66 && dx < bd && E.canTab(card, st.tab[j])) {
        const p = st.tab[j];
        bd = dx; best = { to: ['t', j], x: colX(j), y: p.length ? cards[p[p.length - 1]].T.y - OFF_UP : TAB_Y };
      }
    }
  }
  return best;
}
function updateDropGlow() {
  const t = dropTarget();
  if (t) { glow.m.position.set(t.x, t.y, 0.4); glow.m.visible = true; glow.hold = true; }
  else if (glow.hold) { glow.m.visible = false; glow.hold = false; }
}
function endPointer(e, cancel) {
  if (!ptr || e.pointerId !== ptr.id) return;
  const P = ptr; ptr = null;
  if (glow.hold) { glow.m.visible = false; glow.hold = false; }
  if (P.drag) {
    ptr = P; const t = cancel ? null : dropTarget(); ptr = null;
    for (const id of P.drag.ids) cards[id].drag = null;
    if (!t || !doMove({ t: 'move', from: P.drag.from, to: t.to, n: P.drag.n }, true)) sync({ dur: 0.2, lift: 0 });
    return;
  }
  if (cancel || !P.hit) return;
  if (P.hit.type === 'stock') { doDraw(); return; }
  const hm = hitMove(P.hit);
  if (!hm || hm.from[0] === 'f') return;
  const targets = E.tapTargets(st, hm.from, hm.n);
  if (targets.length) doMove(targets[0]);
  else { shake(hm.ids); play.error(); }
}
canvas.addEventListener('pointerup', e => endPointer(e, false));
canvas.addEventListener('pointercancel', e => endPointer(e, true));
canvas.addEventListener('contextmenu', e => e.preventDefault());

// ---------------------------------------------------------------- frame loop
let last = now();
function frame() {
  requestAnimationFrame(frame);
  const t = now(), dt = Math.min(0.05, t - last); last = t;
  if (!st) return;
  let active = dirty; dirty = false;

  if (celebrating || confT >= 0) { updateCelebration(dt); active = true; }

  for (const c of cards) {
    let ox = 0, oy = 0, oz = 0;
    if (c.drag && ptr) {
      const tx = ptr.p.x + c.drag.ox, ty = ptr.p.y + c.drag.oy;
      const a = 1 - Math.exp(-dt * 36 / (1 + c.drag.k * 0.3));
      const nx = lerp(c.x, tx, a), ny = lerp(c.y, ty, a);
      const vx = (nx - c.x) / Math.max(dt, 0.001), vy = (ny - c.y) / Math.max(dt, 0.001);
      c.x = nx; c.y = ny;
      c.z = lerp(c.z, 0.85 + c.drag.k * Z_STEP, 1 - Math.exp(-dt * 20));
      c.ty = lerp(c.ty, clamp(vx * 0.03, -0.38, 0.38), 0.25);
      c.tx = lerp(c.tx, clamp(-vy * 0.03, -0.38, 0.38), 0.25);
      c.lift = c.z; active = true;
    } else if (c.anim) {
      const a = c.anim, u = (t - a.t0) / a.dur;
      active = true;
      if (u >= 0) {
        if (!a.from) { a.from = { x: c.x, y: c.y, z: c.z, ry: c.ry, rz: c.rz }; if (a.onStart) a.onStart(c.id); }
        const k = Math.min(u, 1), e = easeOut(k), T = c.T;
        c.x = lerp(a.from.x, T.x, e); c.y = lerp(a.from.y, T.y, e);
        c.z = lerp(a.from.z, T.z, e) + a.lift * Math.sin(Math.PI * k);
        c.ry = lerp(a.from.ry, T.ry, e); c.rz = lerp(a.from.rz, 0, e);
        c.lift = Math.max(0, c.z - T.z);
        if (k >= 1) { c.anim = null; c.lift = 0; c.ry = T.ry; c.rz = 0; }
      }
    }
    if (!c.drag && (Math.abs(c.tx) > 0.001 || Math.abs(c.ty) > 0.001)) { const d = Math.exp(-dt * 14); c.tx *= d; c.ty *= d; active = true; }
    if (c.fx) {
      const u = (t - c.fx.t0) / c.fx.dur;
      if (u >= 1) c.fx = null;
      else if (c.fx.kind === 'shake') ox = Math.sin(u * Math.PI * 6) * 0.07 * (1 - u);
      else { const f = Math.pow(Math.sin(u * Math.PI * 2), 2); ox = c.fx.dx * f; oy = c.fx.dy * f; oz = 0.45 * f; }
      active = true;
    }
    c.g.position.set(c.x + ox, c.y + oy, c.z + oz);
    c.g.rotation.set(c.tx, c.ry + c.ty, c.rz + (c.phys ? 0 : c.jit));
    // soft shadow
    const sh = c.shadow, lift = c.lift + oz;
    if (c.phys || !c.g.visible) sh.visible = false;
    else if (lift > 0.03) {
      const k = Math.min(1, lift / 0.5);
      sh.visible = true;
      sh.position.set(c.x + ox + lift * 0.1, c.y + oy - lift * 0.2, Math.max(c.T.z - 0.005, lerp(c.T.z - 0.005, 0.27, Math.min(1, lift / 0.25))));
      sh.scale.set((1 + k * 0.1) * Math.max(0.15, Math.abs(Math.cos(c.ry))), 1 + k * 0.1, 1);
      sh.material.opacity = lerp(0.5, 0.3, k);
      sh.rotation.z = c.rz;
    } else {
      sh.visible = c.T.sh;
      sh.position.set(c.x + 0.012, c.y - 0.03, c.z - 0.005);
      sh.scale.set(1, 1, 1); sh.material.opacity = 0.42; sh.rotation.z = c.jit;
    }
  }

  if (glow.m.visible) {
    if (!glow.hold && t > glow.until) glow.m.visible = false;
    glow.m.material.opacity = 0.65 + 0.35 * Math.sin(t * 9);
    active = true;
  }
  if (active) renderer.render(scene, camera);
}

// ---------------------------------------------------------------- HUD and sheets
const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const DIFF = { facil: 'Fácil', normal: 'Normal', dificil: 'Difícil' };
function updateHud() {
  $('time').textContent = fmtTime(G.time);
  $('moves').textContent = `${G.moves} ${G.moves === 1 ? 'jogada' : 'jogadas'}`;
  $('label').textContent = G.daily ? 'Jogo do dia' : DIFF[G.diff] || '';
  $('btn-undo').disabled = !undoStack.length;
}
setInterval(() => {
  if (!G || !G.counted || G.won || document.hidden) return;
  G.time += 1; $('time').textContent = fmtTime(G.time);
  if (Math.floor(G.time) % 10 === 0) persist();
}, 1000);

const statCells = rows => rows.map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('');
function refreshSettings() {
  for (const b of $('seg-draw').children) b.classList.toggle('on', +b.dataset.v === S.draw);
  for (const b of $('seg-theme').children) b.classList.toggle('on', b.dataset.v === S.theme);
  $('sw-sound').classList.toggle('on', S.sound);
  $('sw-haptic').classList.toggle('on', S.haptic);
  $('sw-left').classList.toggle('on', S.left);
  const s = data.stats[S.draw];
  $('stats-mode').textContent = `(tirar ${S.draw})`;
  $('stats').innerHTML = statCells([
    [s.played, 'Jogos'], [s.played ? Math.round(100 * s.won / s.played) + '%' : '-', 'Ganhos'],
    [s.streak, 'Série atual'], [s.best, 'Melhor série'],
    [s.time ? fmtTime(s.time) : '-', 'Melhor tempo'], [s.moves || '-', 'Menos jogadas'],
  ]);
}
function showSheet(id) {
  hideSheets(); $('backdrop').hidden = false; $(id).hidden = false;
  if (id === 'sheet-settings') refreshSettings();
  if (id === 'sheet-new') {
    for (const b of document.querySelectorAll('#sheet-new [data-diff]')) b.classList.toggle('on', b.dataset.diff === S.diff);
    $('btn-daily').classList.toggle('done', !!data.daily[todayKey()]);
    $('btn-restart').hidden = !G || G.won || G.moves === 0;
  }
}
function hideSheets() { for (const s of document.querySelectorAll('.sheet')) s.hidden = true; $('backdrop').hidden = true; }

function applyTheme() {
  const th = THEMES[S.theme];
  if (felt.material.map) felt.material.map.dispose();
  felt.material.map = feltTexture(S.theme); felt.material.needsUpdate = true;
  if (backMat.map) backMat.map.dispose();
  backMat.map = backTexture(S.theme, renderer); backMat.needsUpdate = true;
  document.documentElement.style.setProperty('--ui', th.ui);
  document.querySelector('meta[name=theme-color]').content = th.ui;
  renderer.setClearColor(th.ui);
  dirty = true;
}

$('btn-new').onclick = () => { unlock(); showSheet('sheet-new'); };
$('btn-settings').onclick = () => { unlock(); showSheet('sheet-settings'); };
$('btn-hint').onclick = () => { unlock(); hint(); };
$('btn-undo').onclick = () => { unlock(); undo(); };
$('finish').onclick = () => { unlock(); autoFinish(); };
$('backdrop').onclick = () => { if ($('win').hidden) hideSheets(); };
for (const b of document.querySelectorAll('[data-close]')) b.onclick = hideSheets;
for (const b of document.querySelectorAll('#sheet-new [data-diff]')) b.onclick = () => { S.diff = b.dataset.diff; newGame({ diff: S.diff }); };
$('btn-daily').onclick = () => newGame({ diff: 'normal', seed: dailySeed(), daily: todayKey() });
$('btn-restart').onclick = () => newGame({ diff: G.diff, seed: G.seed, daily: G.daily, restart: true });
$('btn-again').onclick = () => newGame({ diff: S.diff });
for (const b of $('seg-draw').children) b.onclick = () => {
  const v = +b.dataset.v; if (v === S.draw) return;
  S.draw = v; refreshSettings();
  if (!G || G.moves === 0 || G.won) newGame({ diff: S.diff }); else persist();
};
for (const b of $('seg-theme').children) b.onclick = () => { S.theme = b.dataset.v; applyTheme(); refreshSettings(); persist(); };
$('sw-sound').onclick = () => { S.sound = !S.sound; sfx.enabled = S.sound; refreshSettings(); persist(); if (S.sound) play.place(); };
$('sw-haptic').onclick = () => { S.haptic = !S.haptic; sfx.haptic = S.haptic; refreshSettings(); persist(); if (S.haptic) play.pick(); };
$('sw-left').onclick = () => { S.left = !S.left; layoutSlots(); sync({ dur: 0.3, lift: 0.3 }); refreshSettings(); persist(); };

window.addEventListener('resize', () => { fitCamera(); if (st) sync({ dur: 0 }); });
document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); else { last = now(); dirty = true; } });
window.addEventListener('pagehide', persist);

// ---------------------------------------------------------------- start
async function start() {
  sfx.enabled = S.sound; sfx.haptic = S.haptic;
  applyTheme(); fitCamera(); layoutSlots();
  seeds = await (await fetch('js/seeds.json')).json();
  const g = data.game;
  if (g && g.st && !g.won && g.st.tab && g.st.tab.length === 7) {
    G = g; st = g.st; undoStack = Array.isArray(g.undo) ? g.undo : [];
    sync({ dur: 0 }); updateHud();
    $('finish').hidden = !E.allFaceUp(st);
  } else { G = null; newGame({ diff: S.diff }); }
  frame();
}
start();

// test hook (used by the automated checks; harmless in normal play)
window.__g = { get st() { return st; }, get G() { return G; }, E, doMove, doDraw, undo, hint, newGame, autoFinish, cards, view, toScreen, get celebrating() { return celebrating; } };
