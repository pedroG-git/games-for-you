// Mahjong Journey — calm mahjong solitaire where every board can be cleared. Rules live in engine.js,
// layouts and level difficulty in levels.js. This file draws, animates and handles input.
import * as E from './engine.js';
import { levelFor, dailyFor, classicFor, LAYOUTS, PATH, parse, isHard as isHardLevel } from './levels.js';
import { CHAPTERS, PER, chapterOf, chapterInfo, renderScene } from './chapters.js';
import { faceURL } from './tiles.js';
import { play, settings, unlock, setMusic } from './audio.js';

const $ = (id) => document.getElementById(id);
const SAVE = 'mahjong-save', SET = 'mahjong-settings';
const PRICE = { hint: 40, shuffle: 60 };
const COMBO_MS = 5000;

const load = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } };

// ---------------------------------------------------------------- saved progress
const P = Object.assign({ level: 1, coins: 100, hints: 3, shuffles: 3, stars: {}, album: [], daily: {}, best: {}, tips: {}, runs: {} }, load(SAVE) || {});
const saveP = () => store(SAVE, P);
Object.assign(settings, { dim: true, warn: true, style: 'classic' }, load(SET) || {});
const saveSettings = () => store(SET, settings);

// ---------------------------------------------------------------- the board being played
// G = { mode, key, name, pos, faces, alive, hist: [[a, b, pts]], score, time, hints, shuffles, gold, ... }
let G = null;
const geo = { tw: 40, th: 52, lift: 4, Z: 0 };

function show(id) {
  for (const s of ['home', 'game']) $(s).hidden = s !== id;
  for (const m of document.querySelectorAll('.modal')) m.hidden = true;
  hideSay();
}
const openModal = (id) => { $(id).hidden = false; };
const closeModal = (id) => { $(id).hidden = true; };
const todayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function setTheme(ch) {
  document.body.style.setProperty('--bg1', ch.bg[0]);
  document.body.style.setProperty('--bg2', ch.bg[1]);
}

function sizeHome() {
  const vw = innerWidth, vh = innerHeight;
  document.documentElement.style.setProperty('--sw', Math.max(220, Math.min(vw - 32, 440, (vh - 380) / 0.78)) + 'px');
}
addEventListener('resize', () => { sizeHome(); if (G && !$('game').hidden) { layoutBoard(); render(); } });

// ---------------------------------------------------------------- home / journey
function openHome(fresh = -1) {
  show('home');
  sizeHome();
  const ch = chapterInfo(chapterOf(P.level));
  setTheme(ch);
  $('ch-name').textContent = ch.name + (ch.trip > 1 ? ` · Trip ${ch.trip}` : '');
  const done = (P.level - 1) % PER;
  renderScene($('scene'), ch, done, fresh);
  $('ch-prog').querySelector('i').style.width = (done / PER * 100) + '%';
  $('ch-prog').querySelector('span').textContent = `${done} / ${PER}`;
  const hard = isHardLevel(P.level), run = P.runs.journey;
  $('h-play').className = 'big' + (hard ? ' hard' : '');
  $('h-play').innerHTML = `Level ${P.level}<small>${run && run.key === P.level ? 'Continue' : hard ? 'Hard level' : 'Play'}</small>`;
  $('h-coins').querySelector('b').textContent = P.coins;
  $('h-dbadge').hidden = !!P.daily[todayKey()];
}

// ---------------------------------------------------------------- starting / saving a board
function newRun(mode, key) {
  const L = mode === 'journey' ? levelFor(key) : mode === 'daily' ? dailyFor(key) : classicFor(key, (Date.now() & 0xffffff) + 1);
  const rand = E.rng(mode === 'classic' ? Date.now() & 0xffff : String(key).split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
  const run = { mode, key, name: L.name, pos: L.pos, faces: L.faces, alive: L.pos.map(() => 1), hist: [], score: 0, time: 0, hints: 0, shuffles: 0, gold: null, goldDone: false };
  if (mode !== 'journey' || key >= 5) run.gold = pickGold(run.faces, run.alive, rand);
  return run;
}
function pickGold(faces, alive, rand) {
  const by = {};
  faces.forEach((f, i) => { if (alive[i]) (by[E.classOf(f)] = by[E.classOf(f)] || []).push(i); });
  const list = E.shuffle(rand, Object.values(by)[Math.floor(rand() * Object.keys(by).length)].slice());
  return list.length >= 2 ? [list[0], list[1]] : null;
}
function persist() {
  if (!G || G.over) return;
  P.runs[G.mode] = { mode: G.mode, key: G.key, name: G.name, pos: G.pos, faces: G.faces, alive: Array.from(G.alive), hist: G.hist, score: G.score, time: G.time, hints: G.hints, shuffles: G.shuffles, gold: G.gold, goldDone: G.goldDone };
  saveP();
}

function startGame(mode, key) {
  unlock();
  const saved = P.runs[mode];
  const run = saved && saved.key === key ? saved : newRun(mode, key);
  G = Object.assign({}, run, { alive: Uint8Array.from(run.alive), g: E.geometry(run.pos), sel: -1, combo: 0, last: 0, els: [], over: false, warned: false, busy: false });
  show('game');
  setTheme(chapterInfo(mode === 'journey' ? chapterOf(key) : chapterOf(P.level)));
  $('g-title').textContent = mode === 'journey' ? `Level ${key} · ${G.name}` : mode === 'daily' ? `Daily · ${G.name}` : G.name;
  $('g-time').hidden = mode === 'journey';
  $('combo').hidden = true;
  layoutBoard();
  render(true);
  updateHud();
  persist();
  setTimeout(firstTips, 700);
}

// ---------------------------------------------------------------- drawing the board
function layoutBoard() {
  const wrap = $('boardwrap');
  const W = wrap.clientWidth - 10, H = wrap.clientHeight - 10;
  const xs = G.pos.map((p) => p.x), ys = G.pos.map((p) => p.y), zs = G.pos.map((p) => p.z);
  const cols = (Math.max(...xs) + 2) / 2, rows = (Math.max(...ys) + 2) / 2, Z = Math.max(...zs);
  const L = 0.11; // layer lift per level, in tile widths
  const tw = Math.floor(Math.min(W / (cols + Z * L + 0.15), H / (rows * 1.3 + Z * L + 0.15), 78));
  Object.assign(geo, { tw, th: Math.round(tw * 1.3), lift: tw * L, Z });
  const s = tw * 0.055, root = document.documentElement.style;
  root.setProperty('--tw', tw + 'px');
  root.setProperty('--th', geo.th + 'px');
  root.setProperty('--side', `${s * 0.6}px ${s * 0.6}px 0 #e4d5ae, ${s * 1.1}px ${s * 1.1}px 0 #cdb98c, ${s * 1.6}px ${s * 1.6}px 0 #3c8c66, ${s * 2}px ${s * 2}px 0 #1f5a3c, ${s * 2}px ${s * 2.4}px ${s * 3}px rgba(0,0,0,.45)`);
  const b = $('board');
  b.style.width = (cols * tw + Z * geo.lift + s * 2) + 'px';
  b.style.height = (rows * geo.th + Z * geo.lift + s * 2) + 'px';
}
const tileXY = (i) => { const p = G.pos[i]; return { x: p.x / 2 * geo.tw + (geo.Z - p.z) * geo.lift, y: p.y / 2 * geo.th + (geo.Z - p.z) * geo.lift }; };

function render(animIn = false, only = null) {
  const b = $('board');
  b.innerHTML = '';
  b.classList.toggle('dim', settings.dim);
  G.els = [];
  let k = 0;
  for (let i = 0; i < G.pos.length; i++) {
    if (!G.alive[i]) continue;
    const p = G.pos[i], { x, y } = tileXY(i), el = document.createElement('div');
    el.className = 't';
    el.dataset.i = i;
    el.style.left = x + 'px'; el.style.top = y + 'px';
    el.style.zIndex = p.z * 1000 + p.y * 20 + p.x + 1;
    el.innerHTML = `<i style="background-image:url(${faceURL(G.faces[i], settings.style)})"></i>`;
    if (G.gold && !G.goldDone && G.gold.includes(i)) el.classList.add('gold');
    if (animIn && (!only || only.has(i))) { el.classList.add('in'); el.style.animationDelay = (only ? 0 : Math.min(k++ * 8, 700)) + 'ms'; }
    b.appendChild(el);
    G.els[i] = el;
  }
  if (G.sel >= 0 && G.els[G.sel]) G.els[G.sel].classList.add('sel');
  updateFree();
}
function updateFree() {
  for (let i = 0; i < G.pos.length; i++) if (G.els[i]) G.els[i].classList.toggle('blk', !E.isFree(G.g, G.alive, i));
}
function updateHud() {
  const left = E.count(G.alive), pr = E.pairs(G.g, G.faces, G.alive).length;
  $('g-left').textContent = `🀫 ${left} tiles`;
  $('g-pairs').textContent = `🔗 ${pr} ${pr === 1 ? 'match' : 'matches'}`;
  $('g-time').textContent = '⏱ ' + fmtTime(G.time);
  updateTools();
}
function updateTools() {
  const badge = (id, n, price) => {
    const i = $(id).querySelector('i');
    i.className = n > 0 ? '' : 'buy';
    i.textContent = n > 0 ? n : '🪙' + price;
  };
  badge('t-hint', P.hints, PRICE.hint);
  badge('t-shuffle', P.shuffles, PRICE.shuffle);
  $('t-undo').classList.toggle('off', !G.hist.length);
}

// ---------------------------------------------------------------- playing
$('board').addEventListener('pointerdown', (e) => {
  const el = e.target.closest('.t');
  if (!el || !G || G.busy || G.over) return;
  tap(Number(el.dataset.i));
});

function tap(i) {
  unlock();
  if (!$('say').dataset.keep) hideSay();
  if (!E.isFree(G.g, G.alive, i)) {
    const el = G.els[i];
    el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
    play.nope();
    return;
  }
  if (G.sel === i) { G.els[i].classList.remove('sel'); G.sel = -1; play.pick(); return; }
  if (G.sel >= 0 && E.classOf(G.faces[G.sel]) === E.classOf(G.faces[i])) { match(G.sel, i); return; }
  if (G.sel >= 0 && G.els[G.sel]) G.els[G.sel].classList.remove('sel');
  G.sel = i;
  G.els[i].classList.add('sel');
  play.pick();
}

const PRAISE = { 3: 'Nice!', 5: 'Great!', 7: 'Amazing!', 10: 'Unstoppable!', 15: 'Legendary!' };
function match(a, b) {
  G.sel = -1;
  clearHint();
  const now = performance.now();
  G.combo = now - G.last < COMBO_MS ? G.combo + 1 : 1;
  G.last = now;
  let pts = 10 * Math.min(G.combo, 10);
  const gold = G.gold && !G.goldDone && G.gold.includes(a) && G.gold.includes(b);
  if (gold) { pts += 50; G.goldDone = true; P.coins += 10; }
  G.score += pts;
  G.alive[a] = 0; G.alive[b] = 0;
  G.hist.push([a, b, pts]);

  // the two tiles slide together and vanish
  const A = tileXY(a), B = tileXY(b), mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
  for (const [i, p] of [[a, A], [b, B]]) {
    const el = G.els[i];
    el.classList.remove('sel', 'hint');
    el.style.zIndex = 9000;
    el.classList.add('gone');
    el.style.transform = `translate(${mx - p.x}px, ${my - p.y}px) scale(.6)`;
    setTimeout(() => el.remove(), 340);
    G.els[i] = null;
  }
  const r = $('board').getBoundingClientRect(), sx = r.left + mx + geo.tw / 2, sy = r.top + my + geo.th / 2;
  setTimeout(() => burst(sx, sy, gold ? ['#ffd23a', '#fff1a8', '#ff9a1a'] : ['#fff8e0', '#7cf0a8', '#ffd23a', '#ff6a6a'], gold ? 26 : 12 + Math.min(G.combo, 8) * 2), 200);
  floatText(`+${pts}`, sx, sy);
  play.match(G.combo);
  if (gold) { play.gold(); showPraise('🪙 +10'); tip('gold2', 'Golden tiles', 'Matching the golden pair gives you 10 coins.'); }
  else if (PRAISE[G.combo]) { showPraise(PRAISE[G.combo]); play.combo(G.combo); }
  showCombo();
  updateFree();
  updateHud();
  persist();
  const left = E.count(G.alive);
  if (!left) { G.over = true; setTimeout(winFlow, 450); return; }
  if (!E.pairs(G.g, G.faces, G.alive).length) { setTimeout(openStuck, 500); return; }
  checkAhead();
}

function showCombo() {
  const c = $('combo');
  if (G.combo < 2) { c.hidden = true; return; }
  c.hidden = false;
  c.querySelector('b').textContent = `Combo ×${G.combo}`;
  const s = c.querySelector('s');
  s.style.transition = 'none'; s.style.transform = 'scaleX(1)'; void s.offsetWidth;
  s.style.transition = `transform ${COMBO_MS}ms linear`; s.style.transform = 'scaleX(0)';
  clearTimeout(G.comboT);
  G.comboT = setTimeout(() => { c.hidden = true; }, COMBO_MS);
}

// After each match: is the board still winnable? If not, say so now instead of after 20 more moves.
function checkAhead() {
  if (!settings.warn || G.warned) return;
  const stamp = G.hist.length, game = G;
  setTimeout(() => {
    if (G !== game || G.over || G.hist.length !== stamp) return;
    if (E.solve(G.g, G.faces, G.alive, 15000).ok === false) warnDead();
  }, 420);
}
function warnDead() {
  G.warned = true;
  // how far back is the board winnable again?
  let back = null;
  const a = Uint8Array.from(G.alive);
  for (let k = G.hist.length - 1, n = 1; k >= 0 && n <= 12; k--, n++) {
    a[G.hist[k][0]] = 1; a[G.hist[k][1]] = 1;
    if (E.solve(G.g, G.faces, a, 6000).ok === true) { back = n; break; }
  }
  const acts = [];
  if (back) acts.push([`↶ Undo ${back}`, () => undo(back)]);
  acts.push(['🔀 Shuffle', () => shuffleTool(false), 'alt']);
  say('Dead end ahead', back ? `These tiles can't all be cleared any more. Going back ${back} move${back > 1 ? 's' : ''} fixes it.` : `These tiles can't all be cleared any more. Undo some moves or shuffle.`, acts, true);
}

function undo(n = 1) {
  if (!G || G.busy || G.over) return;
  if (!G.hist.length) { play.nope(); return; }
  const back = new Set();
  for (let k = 0; k < n && G.hist.length; k++) {
    const [a, b, pts] = G.hist.pop();
    G.alive[a] = 1; G.alive[b] = 1; G.score -= pts || 0;
    back.add(a); back.add(b);
  }
  G.combo = 0; G.sel = -1; G.warned = false;
  $('combo').hidden = true;
  hideSay(true);
  clearHint();
  render(true, back);
  updateHud();
  persist();
  play.undo();
}

// ---------------------------------------------------------------- hints & shuffles
function clearHint() {
  clearTimeout(G && G.hintT);
  for (const el of document.querySelectorAll('.t.hint')) el.classList.remove('hint');
}
function hintTool() {
  if (!G || G.busy || G.over) return;
  const h = E.hint(G.g, G.faces, G.alive, 30000);
  if (!h) { openStuck(); return; }
  if (h.ok === false) { if (!G.warned) warnDead(); else play.nope(); return; } // no charge: no good pair exists
  if (P.hints <= 0) { shop('hint'); return; }
  P.hints--; G.hints++;
  clearHint();
  if (G.sel >= 0 && G.els[G.sel]) G.els[G.sel].classList.remove('sel');
  G.sel = -1;
  for (const i of h.pair) G.els[i].classList.add('hint');
  G.hintT = setTimeout(clearHint, 5000);
  play.hint();
  updateTools();
  persist();
}

async function shuffleTool(fromStuck) {
  if (!G || G.busy || G.over) return;
  if (P.shuffles > 0) P.shuffles--;
  else if (!fromStuck) { shop('shuffle'); return; }
  else if (P.coins >= PRICE.shuffle) P.coins -= PRICE.shuffle;
  // (stuck with no shuffles and no coins: this one is free — you can never be stuck for good)
  G.shuffles++;
  closeModal('m-stuck');
  hideSay(true);
  clearHint();
  G.busy = true;
  play.shuffle();
  // gather the tiles in the middle, then deal them back
  const bw = $('board').offsetWidth / 2 - geo.tw / 2, bh = $('board').offsetHeight / 2 - geo.th / 2;
  for (let i = 0; i < G.pos.length; i++) {
    const el = G.els[i];
    if (!el) continue;
    const p = tileXY(i);
    el.style.transition = 'transform .35s ease-in';
    el.style.transform = `translate(${bw - p.x}px, ${bh - p.y}px) rotate(${Math.random() * 60 - 30}deg)`;
  }
  await wait(380);
  const rand = E.rng((Date.now() ^ (G.hist.length * 7919)) >>> 0);
  let nf = E.reshuffle(G.g, G.faces, G.alive, rand);
  if (!nf) { flatten(); nf = E.reshuffle(G.g, G.faces, G.alive, rand); }
  G.faces = nf;
  G.hist = []; G.sel = -1; G.warned = false; G.combo = 0;
  if (G.gold && !G.goldDone) G.gold = pickGold(G.faces, G.alive, rand);
  render(true);
  updateHud();
  persist();
  play.shuffle();
  G.busy = false;
}
// The tiles left lie stuck on each other: lay them out flat (always clearable).
function flatten() {
  const idx = [];
  for (let i = 0; i < G.pos.length; i++) if (G.alive[i]) idx.push(i);
  if (G.gold) G.gold = null;
  G.pos = E.flatLayout(idx.length);
  G.faces = idx.map((i) => G.faces[i]);
  G.alive = new Uint8Array(idx.length).fill(1);
  G.g = E.geometry(G.pos);
  layoutBoard();
}

function openStuck() {
  if (G.over) return;
  play.stuck();
  openModal('m-stuck');
  $('stuck-undo').hidden = !G.hist.length;
  const b = $('stuck-shuffle');
  b.innerHTML = P.shuffles > 0 ? `🔀 Shuffle<small>${P.shuffles} left</small>` : P.coins >= PRICE.shuffle ? `🔀 Shuffle<small>🪙 ${PRICE.shuffle}</small>` : '🔀 Shuffle<small>Free this time</small>';
}
$('stuck-shuffle').addEventListener('click', () => shuffleTool(true));
$('stuck-undo').addEventListener('click', () => { closeModal('m-stuck'); undo(1); });

function shop(kind) {
  const price = PRICE[kind], can = P.coins >= price;
  $('shop-title').textContent = kind === 'hint' ? 'Get a hint' : 'Get a shuffle';
  $('shop-text').textContent = can ? `You have 🪙 ${P.coins}. Buy one for 🪙 ${price}?` : `You need 🪙 ${price} (you have ${P.coins}). Win levels to earn coins — Undo is always free!`;
  $('shop-buy').disabled = !can;
  $('shop-buy').innerHTML = `Buy · 🪙 ${price}`;
  $('shop-buy').onclick = () => {
    P.coins -= price;
    if (kind === 'hint') P.hints++; else P.shuffles++;
    saveP(); play.coin(); closeModal('m-shop');
    if (kind === 'hint') hintTool(); else shuffleTool(false);
  };
  openModal('m-shop');
}
$('shop-close').addEventListener('click', () => closeModal('m-shop'));

$('t-undo').addEventListener('click', () => undo(1));
$('t-hint').addEventListener('click', hintTool);
$('t-shuffle').addEventListener('click', () => shuffleTool(false));
$('g-back').addEventListener('click', () => { persist(); G = null; openHome(); });

// ---------------------------------------------------------------- winning
async function winFlow() {
  const g = G;
  delete P.runs[g.mode];
  const used = g.hints + g.shuffles, stars = used === 0 ? 3 : used <= 2 ? 2 : 1;
  play.win();
  for (let k = 0; k < 5; k++) setTimeout(() => burst(innerWidth * (0.2 + Math.random() * 0.6), innerHeight * (0.25 + Math.random() * 0.4), ['#ffd23a', '#ff6a6a', '#7cf0a8', '#6ac8ff', '#fff'], 30, 1.3), k * 180);
  await wait(900);
  const lines = [['Score', g.score]];
  let coins = 0, next = null, postcard = -1;
  if (g.mode === 'journey') {
    coins = (10 + stars * 5) * (isHardLevel(g.key) ? 2 : 1);
    P.stars[g.key] = Math.max(P.stars[g.key] || 0, stars);
    if (g.key === P.level) {
      P.level++;
      if (g.key % PER === 0) { postcard = chapterOf(g.key); if (!P.album.includes(postcard % CHAPTERS.length)) P.album.push(postcard % CHAPTERS.length); }
    }
    next = () => { if (postcard >= 0) openPostcard(postcard); else startGame('journey', P.level); };
    G.lit = g.key % PER === 0 ? -1 : (g.key - 1) % PER;
    $('win-title').textContent = isHardLevel(g.key) ? 'Hard level beaten!' : 'Well done!';
    $('win-next').innerHTML = postcard >= 0 ? 'New postcard!' : `Level ${P.level}`;
    $('win-home').textContent = 'Journey';
  } else {
    const best = g.mode === 'daily' ? P.daily[g.key] : P.best[g.name];
    const isBest = !best || g.time < best;
    if (g.mode === 'daily') {
      const first = !best;
      if (isBest) P.daily[g.key] = g.time;
      coins = first ? 40 + Math.min(streak(), 7) * 10 : 10;
    } else { coins = 10 + stars * 5; if (isBest) P.best[g.name] = g.time; }
    lines.push(['Time', fmtTime(g.time) + (isBest ? ' ★ best' : '')]);
    if (g.mode === 'daily') lines.push(['Streak', `🔥 ${streak()} day${streak() === 1 ? '' : 's'}`]);
    $('win-title').textContent = g.mode === 'daily' ? 'Daily done!' : 'Board cleared!';
    next = g.mode === 'classic' ? () => startGame('classic', g.name) : () => openHome();
    $('win-next').innerHTML = g.mode === 'classic' ? 'New deal' : 'Continue';
    $('win-home').textContent = 'Home';
  }
  P.coins += coins;
  lines.push(['Coins', `🪙 +${coins}`]);
  saveP();
  $('win-lines').innerHTML = lines.map(([a, b]) => `<div><span>${a}</span><em>${b}</em></div>`).join('');
  const st = $('win-stars').children;
  for (let k = 0; k < 3; k++) st[k].className = k < stars ? 'on' : '';
  openModal('m-win');
  setTimeout(() => play.coin(), 900);
  $('win-next').onclick = () => { closeModal('m-win'); next(); };
  $('win-home').onclick = () => { closeModal('m-win'); if (postcard >= 0) openPostcard(postcard); else openHome(g.mode === 'journey' ? G.lit : -1); };
}

function openPostcard(idx) {
  const ch = chapterInfo(idx);
  openHome();
  const c = $('post-card');
  renderScene(c, ch, PER);
  $('post-text').textContent = `You finished ${ch.name}! Next stop: ${chapterInfo(idx + 1).name}.`;
  openModal('m-post');
  play.light();
}
$('post-ok').addEventListener('click', () => { closeModal('m-post'); openHome(); });

// ---------------------------------------------------------------- daily
function streak() {
  const d = new Date();
  if (!P.daily[todayKey(d)]) d.setDate(d.getDate() - 1);
  let n = 0;
  while (P.daily[todayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function openDaily() {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth(), tk = todayKey();
  const s = streak();
  $('d-streak').textContent = s ? `🔥 ${s} day streak` : 'Start a streak today!';
  $('d-month').textContent = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const first = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
  let h = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d) => `<span class="h">${d}</span>`).join('');
  for (let k = 0; k < first; k++) h += '<span class="e"></span>';
  for (let d = 1; d <= days; d++) {
    const key = todayKey(new Date(y, m, d));
    h += `<span class="${P.daily[key] ? 'done' : ''}${key === tk ? ' today' : ''}">${P.daily[key] ? '✓' : d}</span>`;
  }
  $('d-cal').innerHTML = h;
  $('d-play').innerHTML = P.daily[tk] ? `Play again<small>Best ${fmtTime(P.daily[tk])}</small>` : P.runs.daily && P.runs.daily.key === tk ? 'Continue' : 'Play today';
  openModal('m-daily');
}
$('h-daily').addEventListener('click', () => { play.tap(); openDaily(); });
$('d-play').addEventListener('click', () => startGame('daily', todayKey()));
$('d-close').addEventListener('click', () => closeModal('m-daily'));

// ---------------------------------------------------------------- classic
function unlockLevel(name) { const i = PATH.indexOf(name); return i < 0 ? 1 : i + 1; }
function openClassic() {
  const list = LAYOUTS.map((l) => ({ name: l.name, n: parse(l).length, at: unlockLevel(l.name) })).sort((a, b) => a.n - b.n);
  $('c-list').innerHTML = list.map((l) => {
    const open = l.at <= Math.max(P.level, 4);
    return `<button class="lay${open ? '' : ' lock'}" data-name="${l.name}" ${open ? '' : 'disabled'}><span class="nm">${open ? '' : '🔒 '}${l.name}<br><small>${l.n} tiles${open ? '' : ` · reach level ${l.at}`}</small></span><small>${P.best[l.name] ? '⏱ ' + fmtTime(P.best[l.name]) : ''}</small></button>`;
  }).join('');
  openModal('m-classic');
}
$('c-list').addEventListener('click', (e) => { const b = e.target.closest('.lay'); if (b && !b.disabled) { if (P.runs.classic && P.runs.classic.key !== b.dataset.name) delete P.runs.classic; startGame('classic', b.dataset.name); } });
$('h-classic').addEventListener('click', () => { play.tap(); openClassic(); });
$('c-close').addEventListener('click', () => closeModal('m-classic'));

// ---------------------------------------------------------------- album
function openAlbum() {
  const total = Object.values(P.stars).reduce((a, b) => a + b, 0);
  $('a-sum').textContent = `${P.album.length} of ${CHAPTERS.length} postcards · ★ ${total} stars · level ${P.level}`;
  $('a-grid').innerHTML = CHAPTERS.map((c, i) => {
    const got = P.album.includes(i);
    return `<div class="post${got ? '' : ' lock'}" style="--sky1:${c.sky[0]};--sky2:${c.sky[1]}"><div class="em">${c.items.slice(0, 3).map((it) => it[0]).join('')}</div><div class="nm">${got ? c.name : `Level ${(i + 1) * PER}`}</div></div>`;
  }).join('');
  openModal('m-album');
}
$('h-album').addEventListener('click', () => { play.tap(); openAlbum(); });
$('a-close').addEventListener('click', () => closeModal('m-album'));

// ---------------------------------------------------------------- tips
function say(title, text, acts = [], keep = false) {
  const s = $('say');
  s.querySelector('b').textContent = title;
  s.querySelector('span').textContent = text;
  const box = s.querySelector('.acts');
  box.innerHTML = '';
  for (const [label, fn, cls] of acts) {
    const b = document.createElement('button');
    b.textContent = label;
    if (cls) b.className = cls;
    b.onclick = (e) => { e.stopPropagation(); hideSay(true); fn(); };
    box.appendChild(b);
  }
  s.dataset.keep = keep ? '1' : '';
  s.hidden = false;
  clearTimeout(s._t);
  if (!keep) s._t = setTimeout(() => hideSay(), 9000);
}
function hideSay(force) {
  const s = $('say');
  if (s.dataset.keep && !force) return;
  s.hidden = true; s.dataset.keep = '';
}
$('say').addEventListener('click', () => hideSay(true));
function tip(id, title, text) {
  if (P.tips[id]) return false;
  P.tips[id] = 1; saveP();
  say(title, text);
  return true;
}
function firstTips() {
  if (!G || G.over) return;
  const cls = {};
  G.faces.forEach((f, i) => { if (G.alive[i]) cls[E.classOf(f)] = (cls[E.classOf(f)] || 0) + 1; });
  tip('rules', 'Find the pairs', 'Tap two equal tiles to clear them. Only free tiles work: nothing on top, and the left or right side open. Locked tiles look darker.')
    || ((cls[34] || cls[35]) && tip('bonus', 'Flowers & seasons', 'Any flower matches any other flower. Same with the four seasons!'))
    || (Object.values(cls).some((c) => c === 4) && tip('quads', 'Think ahead', 'Some tiles now appear 4 times. Choosing the wrong two can block you later — but Undo is always free.'))
    || (G.gold && !G.goldDone && tip('gold', 'Golden pair', 'Find the two shiny golden tiles and match them for 10 coins!'));
}

// ---------------------------------------------------------------- effects
const cv = $('sparks'), cx2 = cv.getContext('2d');
let parts = [], sparkRaf = 0;
function burst(x, y, colors, n, speed = 1) {
  const dpr = devicePixelRatio || 1;
  if (cv.width !== innerWidth * dpr) { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; }
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = (2 + Math.random() * 4) * speed;
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: 1, size: 3 + Math.random() * 4, color: colors[i % colors.length], petal: Math.random() < 0.5 });
  }
  if (!sparkRaf) sparkRaf = requestAnimationFrame(tickSparks);
}
function tickSparks() {
  const dpr = devicePixelRatio || 1;
  cx2.setTransform(dpr, 0, 0, dpr, 0, 0);
  cx2.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter((p) => (p.life -= 0.025) > 0);
  for (const p of parts) {
    p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.vx *= 0.97;
    cx2.globalAlpha = Math.min(1, p.life * 1.5);
    cx2.fillStyle = p.color;
    const s = p.size * (0.5 + p.life / 2);
    if (p.petal) { cx2.save(); cx2.translate(p.x, p.y); cx2.rotate(p.life * 8); cx2.beginPath(); cx2.ellipse(0, 0, s, s / 2.2, 0, 0, 7); cx2.fill(); cx2.restore(); }
    else { cx2.beginPath(); cx2.arc(p.x, p.y, s / 2, 0, Math.PI * 2); cx2.fill(); }
  }
  sparkRaf = parts.length ? requestAnimationFrame(tickSparks) : 0;
  if (!parts.length) cx2.clearRect(0, 0, innerWidth, innerHeight);
}
function floatText(text, x, y) {
  const d = document.createElement('div');
  d.className = 'pts'; d.textContent = text;
  d.style.left = x + 'px'; d.style.top = y + 'px';
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 950);
}
function showPraise(text) {
  const p = $('praise');
  p.textContent = text;
  p.classList.remove('show'); void p.offsetWidth; p.classList.add('show');
}

// ---------------------------------------------------------------- clock (daily & classic best times)
setInterval(() => {
  if (!G || G.over || document.hidden || $('game').hidden || !$('m-set').hidden || !$('m-stuck').hidden) return;
  G.time++;
  if (G.mode !== 'journey') $('g-time').textContent = '⏱ ' + fmtTime(G.time);
  if (G.time % 10 === 0) persist();
}, 1000);

// ---------------------------------------------------------------- settings & buttons
function openSettings() {
  $('s-sfx').checked = settings.sfx; $('s-music').checked = settings.music; $('s-vib').checked = settings.vib;
  $('s-dim').checked = settings.dim; $('s-warn').checked = settings.warn;
  for (const b of document.querySelectorAll('.seg button')) b.classList.toggle('on', b.dataset.style === settings.style);
  openModal('m-set');
}
for (const b of document.querySelectorAll('.b-set')) b.addEventListener('click', () => { unlock(); openSettings(); });
$('s-sfx').addEventListener('change', (e) => { settings.sfx = e.target.checked; saveSettings(); });
$('s-music').addEventListener('change', (e) => { unlock(); setMusic(e.target.checked); saveSettings(); });
$('s-vib').addEventListener('change', (e) => { settings.vib = e.target.checked; saveSettings(); });
$('s-dim').addEventListener('change', (e) => { settings.dim = e.target.checked; saveSettings(); $('board').classList.toggle('dim', settings.dim); });
$('s-warn').addEventListener('change', (e) => { settings.warn = e.target.checked; saveSettings(); });
for (const b of document.querySelectorAll('.seg button')) b.addEventListener('click', () => {
  settings.style = b.dataset.style; saveSettings();
  for (const o of document.querySelectorAll('.seg button')) o.classList.toggle('on', o === b);
  if (G && !$('game').hidden) render();
});
$('s-close').addEventListener('click', () => closeModal('m-set'));
$('s-help').addEventListener('click', () => { closeModal('m-set'); openModal('m-help'); });
$('help-ok').addEventListener('click', () => closeModal('m-help'));
$('h-hub').addEventListener('click', () => { location.href = '../../index.html'; });
$('h-play').addEventListener('click', () => startGame('journey', P.level));

openHome();
