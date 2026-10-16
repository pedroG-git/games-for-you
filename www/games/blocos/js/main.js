// Blocos da Joana — Block Blast-style puzzle: drag pieces onto an 8×8 board, fill rows/columns to clear them.
import { N, COLORS, SHAPES, fits, fitsAnywhere, dealTray } from './pieces.js';
import { play, settings, unlock, setMusic } from './audio.js';
import { catSVG } from './cats.js';

const $ = (id) => document.getElementById(id);
const SAVE = 'blocos-save', BEST = 'blocos-best', SET = 'blocos-settings';
const GAP = 2, PAD = 6;

// ---------------------------------------------------------------- state
let S = null;
let best = Number(localStorage.getItem(BEST)) || 0;
let shown = 0; // score currently displayed (counts up)

function newGame() {
  const grid = Array(N * N).fill(0);
  S = {
    grid, tray: dealTray(grid), score: 0, combo: 0, miss: 0,
    undo: null, undoReady: true, pending: null, over: false,
    startBest: best, beat: false,
  };
  shown = 0;
  save();
}

function save() { try { localStorage.setItem(SAVE, JSON.stringify(S)); } catch (e) { /* ignore */ } }
function load() {
  try { S = JSON.parse(localStorage.getItem(SAVE)); } catch (e) { S = null; }
  if (!S || !Array.isArray(S.grid) || S.grid.length !== N * N) newGame();
  shown = S.score;
}
try { Object.assign(settings, JSON.parse(localStorage.getItem(SET)) || {}); } catch (e) { /* ignore */ }
const saveSettings = () => localStorage.setItem(SET, JSON.stringify(settings));

// ---------------------------------------------------------------- layout
let cell = 40;
const board = $('board'), cells = [];
for (let i = 0; i < N * N; i++) { const d = document.createElement('div'); d.className = 'c'; board.appendChild(d); cells.push(d); }

function layout() {
  const w = Math.min(window.innerWidth - 24, 520);
  const h = window.innerHeight - 250;
  cell = Math.floor(Math.max(24, Math.min(56, (w - PAD * 2 - GAP * 7) / 8, (h - GAP * 7) / 11)));
  document.documentElement.style.setProperty('--cell', cell + 'px');
  document.documentElement.style.setProperty('--gap', GAP + 'px');
  sizeCanvas();
}

// ---------------------------------------------------------------- render
function paint(i, v) {
  const d = cells[i];
  d.className = v ? 'c b' : 'c';
  d.style.removeProperty('--hk');
  if (v) d.style.setProperty('--k', COLORS[v - 1]); else d.style.removeProperty('--k');
}
function renderBoard() { S.grid.forEach((v, i) => paint(i, v)); }

function pieceEl(p, size) {
  const sh = SHAPES[p.s];
  const el = document.createElement('div');
  el.className = 'piece';
  el.style.gridTemplateColumns = `repeat(${sh.wd}, ${size})`;
  el.style.gridTemplateRows = `repeat(${sh.h}, ${size})`;
  for (const [r, c] of sh.cells) {
    const b = document.createElement('div');
    b.className = 'b';
    b.style.setProperty('--k', COLORS[p.k]);
    b.style.gridRow = r + 1; b.style.gridColumn = c + 1;
    el.appendChild(b);
  }
  return el;
}

const slots = [...document.querySelectorAll('.slot')];
function renderTray(deal = false) {
  slots.forEach((slot, i) => {
    slot.innerHTML = '';
    slot.className = 'slot';
    const p = S.tray[i];
    if (!p) return;
    slot.appendChild(pieceEl(p, 'var(--pc)'));
    if (!fitsAnywhere(S.grid, p.s)) slot.classList.add('nofit');
    if (deal) { slot.classList.add('deal'); slot.firstChild.style.animationDelay = i * 70 + 'ms'; }
  });
}

function renderHud() {
  $('best-n').textContent = best;
  const c = $('combo');
  c.hidden = S.combo < 2;
  c.textContent = `Combo x${S.combo}`;
  const u = $('b-undo');
  u.disabled = !(S.undo && S.undoReady) || S.over;
}

let countTimer = null;
function renderScore() {
  clearInterval(countTimer);
  const el = $('score');
  if (shown === S.score) { el.textContent = shown; return; }
  el.classList.add('bump');
  setTimeout(() => el.classList.remove('bump'), 140);
  const from = shown, to = S.score, t0 = performance.now();
  countTimer = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / 450);
    shown = Math.round(from + (to - from) * k);
    el.textContent = shown;
    if (k >= 1) clearInterval(countTimer);
  }, 30);
}

function renderAll(deal = false) { renderBoard(); renderTray(deal); renderHud(); renderScore(); }

// ---------------------------------------------------------------- rules
function fullLines(grid) {
  const rows = [], cols = [];
  for (let r = 0; r < N; r++) { let f = true; for (let c = 0; c < N; c++) if (!grid[r * N + c]) { f = false; break; } if (f) rows.push(r); }
  for (let c = 0; c < N; c++) { let f = true; for (let r = 0; r < N; r++) if (!grid[r * N + c]) { f = false; break; } if (f) cols.push(c); }
  return { rows, cols };
}
function lineCells({ rows, cols }) {
  const set = new Set();
  for (const r of rows) for (let c = 0; c < N; c++) set.add(r * N + c);
  for (const c of cols) for (let r = 0; r < N; r++) set.add(r * N + c);
  return set;
}

const WORDS = ['', 'Nice!', 'Good!', 'Great!', 'Excellent!', 'Amazing!', 'Unbelievable!'];

function place(i, row, col) {
  const p = S.tray[i], sh = SHAPES[p.s];
  S.undo = { grid: S.grid.slice(), tray: S.tray.slice(), score: S.score, combo: S.combo, miss: S.miss, dealt: false };

  for (const [r, c] of sh.cells) S.grid[(row + r) * N + col + c] = p.k + 1;
  S.tray[i] = null;
  S.score += sh.cells.length;

  const lines = fullLines(S.grid);
  const L = lines.rows.length + lines.cols.length;
  const cx = col + sh.wd / 2, cy = row + sh.h / 2;
  let gained = sh.cells.length;
  play.place();

  if (L) {
    const gone = [...lineCells(lines)];
    const colors = gone.map((j) => S.grid[j]);
    gone.forEach((j) => { S.grid[j] = 0; });
    S.combo += 1; S.miss = 0;
    let pts = 10 * L * (L + 1) / 2 * S.combo;
    const allClear = S.grid.every((v) => !v);
    if (allClear) pts += 300;
    S.score += pts; gained += pts;

    blast(gone, colors, cx, cy);
    play.clear(L, S.combo);
    if (L >= 2) shake();
    if (L >= 2 || S.combo >= 2) praise(allClear ? 'All Clear!' : WORDS[Math.min(L, 6)], S.combo >= 2 ? `Combo x${S.combo}` : '');
    if (allClear) { play.allClear(); cat('mimi', 'Mew?! (Where did all the blocks go?!)', true); }
    else if (L >= 3 || S.combo >= 4) cat(nextCat(), null);
  } else if (++S.miss >= 3) {
    S.combo = 0;
  }
  points(gained, cx, cy);

  if (S.score > best) {
    best = S.score;
    localStorage.setItem(BEST, best);
    if (!S.beat && S.startBest > 0) {
      S.beat = true;
      setTimeout(() => { play.best(); praise('New Best!', ''); cat('meme', 'Mrrrow!! (New record! I demand a celebration snack.)', true); }, 500);
    }
  }

  let deal = false;
  if (S.tray.every((t) => !t)) {
    deal = true;
    S.undo.dealt = true;
    if (S.pending) { S.tray = S.pending; S.pending = null; } else { S.tray = dealTray(S.grid); S.undoReady = true; }
    setTimeout(() => play.deal(), 150);
  }
  checkOver();
  save();
  renderAll(deal);
}

function undo() {
  if (!S.undo || !S.undoReady) return;
  const u = S.undo;
  if (u.dealt) S.pending = S.tray.slice();
  Object.assign(S, { grid: u.grid, tray: u.tray, score: u.score, combo: u.combo, miss: u.miss });
  S.undo = null; S.undoReady = false; S.over = false;
  shown = S.score;
  $('board').classList.remove('dead');
  $('over').hidden = true;
  play.undo();
  save();
  renderAll();
}

function checkOver() {
  const left = S.tray.filter(Boolean);
  if (left.length && left.every((p) => !fitsAnywhere(S.grid, p.s))) {
    S.over = true;
    setTimeout(gameOver, 500);
  }
}

function gameOver(instant = false) {
  if (!S.over) return;
  renderHud();
  $('board').classList.add('dead');
  if (!instant) play.over();
  setTimeout(() => {
    if (!S.over) return;
    $('over-title').textContent = S.beat ? 'New Best!' : 'No more space!';
    $('over-score').textContent = S.score;
    $('over-best').textContent = best;
    $('b-over-undo').hidden = !(S.undo && S.undoReady);
    $('over').hidden = false;
  }, instant ? 0 : 1100);
}

// ---------------------------------------------------------------- effects
const blastLayer = $('blast');
function blast(gone, colors, cx, cy) {
  const rect = board.getBoundingClientRect();
  gone.forEach((j, n) => {
    const r = Math.floor(j / N), c = j % N;
    const d = document.createElement('div');
    d.className = 'pop b';
    d.style.setProperty('--k', COLORS[colors[n] - 1]);
    d.style.left = PAD + c * (cell + GAP) + 'px';
    d.style.top = PAD + r * (cell + GAP) + 'px';
    const delay = Math.hypot(r + 0.5 - cy, c + 0.5 - cx) * 28;
    d.style.animationDelay = delay + 'ms';
    blastLayer.appendChild(d);
    setTimeout(() => d.remove(), delay + 450);
    setTimeout(() => burst(rect.left + PAD + c * (cell + GAP) + cell / 2, rect.top + PAD + r * (cell + GAP) + cell / 2, COLORS[colors[n] - 1]), delay + 120);
  });
}

function shake() {
  const w = $('boardwrap');
  w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake');
}

let praiseTimer = null;
function praise(word, small) {
  const el = $('praise');
  el.innerHTML = `${word}${small ? `<small>${small}</small>` : ''}`;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(praiseTimer);
  praiseTimer = setTimeout(() => el.classList.remove('show'), 1150);
  if (word) setTimeout(() => play.praise(), 120);
}

function points(n, cx, cy) {
  const rect = board.getBoundingClientRect();
  const d = document.createElement('div');
  d.className = 'pts';
  d.textContent = '+' + n;
  d.style.left = rect.left + PAD + cx * (cell + GAP) + 'px';
  d.style.top = rect.top + PAD + cy * (cell + GAP) + 'px';
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 950);
}

// Particles on a full-screen canvas; the loop only runs while particles exist.
const cv = $('fx'), g = cv.getContext('2d');
let parts = [], running = false;
function sizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  cv.width = window.innerWidth * dpr; cv.height = window.innerHeight * dpr;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function burst(x, y, color) {
  for (let i = 0; i < 7; i++) {
    const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 5;
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 3, life: 1, s: cell * (0.12 + Math.random() * 0.16), color, rot: Math.random() * 6 });
  }
  if (!running) { running = true; requestAnimationFrame(tick); }
}
function tick() {
  g.clearRect(0, 0, window.innerWidth, window.innerHeight);
  for (const p of parts) {
    p.x += p.vx; p.y += p.vy; p.vy += 0.35; p.life -= 0.022; p.rot += 0.2;
    g.globalAlpha = Math.max(0, p.life);
    g.fillStyle = p.color;
    g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillRect(-p.s / 2, -p.s / 2, p.s, p.s); g.restore();
  }
  g.globalAlpha = 1;
  parts = parts.filter((p) => p.life > 0);
  if (parts.length) requestAnimationFrame(tick); else { running = false; g.clearRect(0, 0, window.innerWidth, window.innerHeight); }
}

// Meme & Mimi pop up to cheer.
const CHEERS = {
  meme: ['Mrrow. (Acceptable.)', 'Mrrp! (A princess approves.)', 'Mrrrow! (Now treats, please.)', 'Mrrp. (I could do that too. If I wanted.)'],
  mimi: ['Mew mew! (I saw that!)', 'Mrrrp! (Again! Again!)', 'Mew! (I will tell everyone.)', 'Mew mew mew! (So many blocks gone!)'],
};
let lastCat = 'mimi', catTime = 0, catTimer = null;
const nextCat = () => (lastCat = lastCat === 'meme' ? 'mimi' : 'meme');
function cat(who, text, force = false) {
  const now = Date.now();
  if (!force && now - catTime < 5000) return;
  catTime = now; lastCat = who;
  const lines = CHEERS[who];
  $('cat-face').innerHTML = catSVG(who);
  $('cat-say').innerHTML = `<b>${who === 'meme' ? 'Meme' : 'Mimi'}</b>${text || lines[Math.floor(Math.random() * lines.length)]}`;
  const el = $('cat');
  el.hidden = false; el.classList.remove('out');
  clearTimeout(catTimer);
  catTimer = setTimeout(() => { el.classList.add('out'); catTimer = setTimeout(() => { el.hidden = true; }, 300); }, 2300);
}

// ---------------------------------------------------------------- drag & drop
const float = $('float');
let drag = null; // { i, id, el, pw, ph, row, col, ok, touched }

function pieceSize(sh) { return { pw: sh.wd * cell + (sh.wd - 1) * GAP, ph: sh.h * cell + (sh.h - 1) * GAP }; }

function clearPreview() {
  if (!drag) return;
  for (const i of drag.touched) paint(i, S.grid[i]);
  drag.touched = [];
}

function preview(row, col) {
  clearPreview();
  const p = S.tray[drag.i], sh = SHAPES[p.s], color = COLORS[p.k];
  drag.ok = fits(S.grid, p.s, row, col);
  drag.row = row; drag.col = col;
  if (!drag.ok) return;
  const test = S.grid.slice();
  for (const [r, c] of sh.cells) {
    const j = (row + r) * N + col + c;
    test[j] = p.k + 1;
    cells[j].className = 'c ghost';
    cells[j].style.setProperty('--k', color);
    drag.touched.push(j);
  }
  for (const j of lineCells(fullLines(test))) {
    if (!S.grid[j]) continue;
    cells[j].classList.add('hl');
    cells[j].style.setProperty('--hk', color);
    drag.touched.push(j);
  }
}

function moveFloat(x, y) {
  const lift = cell * 1.3;
  const left = x - drag.pw / 2, top = y - drag.ph - lift;
  float.style.transform = `translate(${left}px, ${top}px)`;
  const rect = board.getBoundingClientRect();
  const col = Math.round((left - rect.left - PAD) / (cell + GAP));
  const row = Math.round((top - rect.top - PAD) / (cell + GAP));
  if (row !== drag.row || col !== drag.col) preview(row, col);
}

slots.forEach((slot, i) => {
  slot.addEventListener('pointerdown', (e) => {
    unlock();
    if (drag || S.over || !S.tray[i]) return;
    const p = S.tray[i];
    float.className = '';
    float.innerHTML = '';
    float.appendChild(pieceEl(p, 'var(--cell)'));
    float.style.display = 'block';
    drag = { i, id: e.pointerId, ...pieceSize(SHAPES[p.s]), row: null, col: null, ok: false, touched: [] };
    slot.classList.add('dragging');
    play.pick();
    moveFloat(e.clientX, e.clientY);
  });
});

window.addEventListener('pointermove', (e) => {
  if (drag && e.pointerId === drag.id) moveFloat(e.clientX, e.clientY);
});

function endDrag(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag;
  clearPreview();
  drag = null;
  if (d.ok) {
    float.style.display = 'none';
    place(d.i, d.row, d.col);
    return;
  }
  // Fly back to the tray.
  const r = slots[d.i].getBoundingClientRect();
  float.classList.add('back');
  float.style.transform = `translate(${r.left + r.width / 2 - d.pw / 2}px, ${r.top + r.height / 2 - d.ph / 2}px) scale(.52)`;
  play.back();
  setTimeout(() => { float.style.display = 'none'; float.className = ''; slots[d.i].classList.remove('dragging'); }, 180);
}
window.addEventListener('pointerup', endDrag);
window.addEventListener('pointercancel', endDrag);

// ---------------------------------------------------------------- buttons
$('b-home').addEventListener('click', () => { save(); location.href = '../../index.html'; });
$('b-undo').addEventListener('click', undo);
$('b-over-undo').addEventListener('click', undo);
$('b-again').addEventListener('click', () => {
  play.tap();
  $('over').hidden = true;
  $('board').classList.remove('dead');
  newGame();
  renderAll(true);
});

const sw = { 's-sfx': 'sfx', 's-music': 'music', 's-vib': 'vib' };
$('b-set').addEventListener('click', () => {
  unlock(); play.tap();
  for (const [id, k] of Object.entries(sw)) $(id).checked = settings[k];
  $('settings').hidden = false;
});
for (const [id, k] of Object.entries(sw)) {
  $(id).addEventListener('change', (e) => {
    if (k === 'music') setMusic(e.target.checked); else settings[k] = e.target.checked;
    saveSettings();
  });
}
$('b-close').addEventListener('click', () => { play.tap(); $('settings').hidden = true; });
$('b-restart').addEventListener('click', () => {
  $('settings').hidden = true; $('over').hidden = true;
  $('board').classList.remove('dead');
  newGame();
  renderAll(true);
});
document.addEventListener('pointerdown', unlock, { once: true });
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

// ---------------------------------------------------------------- start
window.addEventListener('resize', layout);
layout();
load();
renderAll(true);
if (S.over) gameOver(true);
