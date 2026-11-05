// Blocos — Block Blast-style puzzle: drag pieces onto an 8×8 board, fill rows/columns to clear them.
// Classic = endless high-score game. Adventures = endless levels where pre-placed blocks must be cleared.
import { N, SHAPES, GOLD, STONE, CRACKED, isTarget, isGem, colorOf, setColors, fits, fitsAnywhere, fullLines, lineCells } from './pieces.js';
import { play, settings, unlock, setMusic, buzz } from './audio.js';
import { DIFFS, worldOf, levelInfo } from './levels.js';
import { deal, move, refill, canUndo, undoMove } from './rules.js';
import { renderMap } from './map.js';

const $ = (id) => document.getElementById(id);
const SAVE = 'blocos-save', BEST = 'blocos-best', SET = 'blocos-settings';
const RUN = 'blocos-adv-run', PROG = 'blocos-adv', SCREEN = 'blocos-screen', STATS = 'blocos-stats';
const GAP = 2, PAD = 6;

// ---------------------------------------------------------------- state
let S = null; // current game (classic or adventure level)
let best = Number(localStorage.getItem(BEST)) || 0;
let shown = 0; // number currently displayed in the big counter (counts up/down)
let screen = 'menu';

const load = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } };
const valid = (g) => g && Array.isArray(g.grid) && g.grid.length === N * N;

let prog = load(PROG);
if (!prog || !prog.time) prog = { mode: 'moves', time: {}, moves: {}, relaxed: {} };
const saveProg = () => store(PROG, prog);
const unlockedIn = (mode) => Math.max(0, ...Object.keys(prog[mode]).map(Number)) + 1;
const totalStars = () => ['time', 'moves', 'relaxed'].reduce((s, m) => s + Object.values(prog[m]).reduce((a, b) => a + b, 0), 0);

// Power-ups: earned by winning Adventures levels and the daily puzzle, and in Classic by clearing golden
// blocks and every 20 lines. Used anywhere (most of all when stuck).
const POWER = 'blocos-power', DAILY = 'blocos-daily';
const PW = ['fresh', 'turn', 'bomb'], PW_ICON = { fresh: '🔄', turn: '↻', bomb: '💣' };
const pw = Object.assign({ fresh: 2, turn: 2, bomb: 1 }, load(POWER) || {});
const savePw = () => store(POWER, pw);
let arm = null; // 'bomb' while waiting for a tap on the board

// Daily puzzle: a new level every day, solving it on days in a row builds a streak.
const daily = Object.assign({ last: '', streak: 0 }, load(DAILY) || {});
const dayStr = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayStr(d); };
const streakNow = () => (daily.last === dayStr() || daily.last === yesterday() ? daily.streak : 0);

// ---------------------------------------------------------------- Classic extras
// Golden blocks: now and then a Classic piece carries a golden cell (dealt in rules.js); clearing it
// doubles that clear's points and may drop a power-up (surprise rewards keep a game fun).
const GOLD_GIFT = 0.5;
const MILESTONES = [250, 500, 1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000, 30000, 50000, 75000, 100000];

// Classic stats (own key, added in 1.32): games, lines, best combo and the last scores.
// cur = the most recently recorded game, so a game recorded twice (undo after game over) is updated, not added.
const HIST = 12;
const stats = Object.assign({ games: 0, lines: 0, bestCombo: 0, hist: [], cur: null }, load(STATS) || {});
function record(g) {
  if (!g || g.adv || !valid(g) || !(g.score > 0)) return;
  const l = g.lines || 0, c = g.maxCombo || 0;
  if (stats.cur && g.id && stats.cur.id === g.id) {
    stats.lines += l - stats.cur.l;
    if (stats.hist.length) stats.hist[stats.hist.length - 1] = g.score;
  } else {
    stats.games++;
    stats.lines += l;
    stats.hist.push(g.score);
    if (stats.hist.length > HIST) stats.hist.splice(0, stats.hist.length - HIST);
  }
  stats.bestCombo = Math.max(stats.bestCombo, c);
  stats.cur = { id: g.id || 0, l };
  store(STATS, stats);
}
function statsHtml(now = null) {
  const h = stats.hist, top = Math.max(1, ...h);
  const bars = h.map((v, i) => `<i class="${i === h.length - 1 && now !== null ? 'now' : ''}" style="height:${Math.max(6, Math.round(100 * v / top))}%"></i>`).join('');
  return `<div class="hist">${bars}</div>`
    + `<div class="chips"><span>🔥 x${stats.bestCombo}<small>Best combo</small></span>`
    + `<span>${stats.lines}<small>Lines</small></span><span>${stats.games}<small>Games</small></span></div>`;
}

// Themes: block colours + board look, unlocked by the Classic best score.
const THEME = 'blocos-theme';
const THEMES = [
  { id: 'classic', name: 'Rainbow', need: 0, colors: ['#ff3b5c', '#ff8a1f', '#ffd60a', '#2fd65c', '#18c2f2', '#4a64ff', '#b44dff'] },
  { id: 'candy', name: 'Candy', need: 500, colors: ['#ff7eb6', '#ffa86b', '#ffe17a', '#8be0a4', '#7fd8f0', '#9fb4ff', '#d39bff'] },
  { id: 'ocean', name: 'Ocean', need: 1500, colors: ['#ff6f61', '#ffb347', '#f9e07f', '#3ddc97', '#1fd1e0', '#2f8cff', '#6c63ff'] },
  { id: 'sunset', name: 'Sunset', need: 3000, colors: ['#ff3d6e', '#ff7a2f', '#ffc23a', '#c2e05a', '#ff9ec4', '#b04aff', '#7a4dff'] },
  { id: 'forest', name: 'Forest', need: 6000, colors: ['#e8574a', '#f29a3c', '#f2d25c', '#6cc24a', '#3fb59a', '#4f8fd6', '#a07ad6'] },
  { id: 'neon', name: 'Neon night', need: 10000, colors: ['#ff2e88', '#ff8c1a', '#ffe500', '#39ff6a', '#00e5ff', '#3d7bff', '#c63dff'] },
];
const theme = Object.assign({ id: 'classic', seen: 0 }, load(THEME) || {});
function applyTheme(id) {
  const t = THEMES.find((x) => x.id === id && x.need <= best) || THEMES[0];
  theme.id = t.id;
  store(THEME, theme);
  setColors(t.colors);
  document.body.dataset.theme = t.id;
}
function renderThemes() {
  $('themes').innerHTML = THEMES.map((t) => `<button data-t="${t.id}" class="${t.id === theme.id ? 'on' : ''}${t.need > best ? ' locked' : ''}">`
    + `<span class="sw">${t.colors.slice(0, 4).map((c) => `<i style="background:${c}"></i>`).join('')}</span>`
    + `<b>${t.name}</b><small>${t.need > best ? `🔒 👑${t.need}` : t.id === theme.id ? '✓' : ''}</small></button>`).join('');
}
$('themes').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const t = THEMES.find((x) => x.id === b.dataset.t);
  if (t.need > best) { play.back(); nope(b); return; }
  play.tap();
  applyTheme(t.id);
  renderThemes();
  if (S) renderAll();
});
// A theme unlocked by a new best: remember it so it is only noticed once.
function checkUnlock() {
  const t = THEMES.filter((x) => x.need <= best).pop();
  if (t.need <= theme.seen) return;
  theme.seen = t.need;
  store(THEME, theme);
}

// A power-up dropped in Classic: its button bounces.
function classicGift() {
  const k = PW[Math.floor(Math.random() * PW.length)];
  pw[k]++;
  savePw();
  setTimeout(() => {
    const b = document.querySelector(`#bottom .pw[data-pw="${k}"]`);
    b.classList.remove('got'); void b.offsetWidth; b.classList.add('got');
    const r = b.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, '#ffd23a', 14);
    play.best();
    renderHud();
  }, 700);
}

function newGame() {
  if (S && !S.adv) record(S); // a Classic game left by "Play again" or restart still counts
  const grid = Array(N * N).fill(0);
  S = {
    grid, tray: null, score: 0, combo: 0, miss: 0,
    undo: null, undoReady: true, pending: null, over: false,
    startBest: best, beat: false, adv: null, lines: 0, ms: 0, near: false, maxCombo: 0, id: Date.now(),
  };
  S.tray = deal(S);
  shown = 0;
  save();
}

function save() { if (S) store(S.adv ? RUN : SAVE, S); }
try { Object.assign(settings, JSON.parse(localStorage.getItem(SET)) || {}); } catch (e) { /* ignore */ }
const saveSettings = () => localStorage.setItem(SET, JSON.stringify(settings));

// ---------------------------------------------------------------- screens
function show(name) {
  screen = name;
  arm = null;
  for (const id of ['menu', 'map', 'app']) $(id).hidden = id !== name;
  if (name !== 'app') setAura(0);
  for (const id of ['over', 'win', 'lvl']) $(id).hidden = true;
  localStorage.setItem(SCREEN, name === 'app' ? (S.adv ? 'adv' : 'classic') : name);
}

function openMenu() {
  $('m-best').textContent = best;
  $('m-stars').textContent = totalStars();
  const done = daily.last === dayStr(), st = streakNow();
  $('m-daily').classList.toggle('ready', !done);
  $('m-daily-sub').textContent = done ? `✓${st > 1 ? ` 🔥${st}` : ' Done'}` : st ? `🔥${st} · Play!` : 'New!';
  $('m-stats').hidden = !stats.games;
  $('m-stats').innerHTML = stats.games ? statsHtml() : '';
  show('menu');
}

function startDaily() {
  const d = new Date(), day = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
  startLevel('moves', day, 1, dayStr());
}

function openClassic() {
  S = load(SAVE);
  if (!valid(S) || S.adv) { S = null; newGame(); }
  if (!S.id) { S.id = Date.now(); save(); }
  shown = S.score;
  startBoard();
}

function openMap() {
  show('map');
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.mode === prog.mode));
  renderMap($('map-scroll'), $('map-path'), prog[prog.mode], unlockedIn(prog.mode), openLevel);
}

// day = the daily puzzle's date: its levels come from their own seeds ('daily'), played with the Moves rules.
function startLevel(mode, n, diff, day = null) {
  const info = levelInfo(day ? 'daily' : mode, n, diff);
  const grid = info.grid.slice();
  if (!day) { prog.mode = mode; saveProg(); }
  S = {
    grid, tray: null, score: 0, combo: 0, miss: 0, ice: info.ice ? info.ice.slice() : null,
    undo: null, undoReady: true, pending: null, over: false, won: false, why: '',
    adv: {
      mode, n, diff, daily: day, left: info.total, total: info.total, started: false, gems: info.gems,
      moves: mode === 'moves' ? info.moves : null, time: mode === 'time' ? info.time : null, timeTotal: info.time,
    },
  };
  S.tray = deal(S);
  shown = info.total;
  save();
  startBoard();
}

function startBoard() {
  // A saved game whose tray ended up empty would be stuck: deal fresh pieces.
  if (!Array.isArray(S.tray) || S.tray.every((t) => !t)) { S.tray = deal(S); S.pending = null; save(); }
  $('board').classList.remove('dead');
  show('app');
  layout();
  renderAll(true);
  if (S.over) gameOver(true);
}

// ---------------------------------------------------------------- layout
let cell = 40;
const board = $('board'), cells = [];
for (let i = 0; i < N * N; i++) { const d = document.createElement('div'); d.className = 'c'; board.appendChild(d); cells.push(d); }

function layout() {
  const w = Math.min(window.innerWidth - 24, 520);
  const h = window.innerHeight - (S && S.adv ? (S.adv.mode !== 'relaxed' ? 280 : 250) : 268); // Classic: + best bar
  cell = Math.floor(Math.max(24, Math.min(56, (w - PAD * 2 - GAP * 7) / 8, (h - GAP * 7) / 11)));
  document.documentElement.style.setProperty('--cell', cell + 'px');
  document.documentElement.style.setProperty('--gap', GAP + 'px');
  sizeCanvas();
}

// ---------------------------------------------------------------- render
function cellClass(v) {
  if (!v) return 'c';
  if (v === GOLD) return 'c b gold';
  if (isGem(v)) return 'c b gem';
  if (v >= STONE) return v === CRACKED ? 'c b st cr' : 'c b st';
  return isTarget(v) ? 'c b t' : 'c b';
}
function paint(i, v, ice = S && S.ice) {
  const d = cells[i];
  d.className = cellClass(v) + (ice && ice[i] ? ` ice${ice[i]}` : '');
  d.style.removeProperty('--hk');
  if (v) d.style.setProperty('--k', colorOf(v)); else d.style.removeProperty('--k');
}
function renderBoard() { flushFx(); S.grid.forEach((v, i) => paint(i, v)); }

function pieceEl(p, size) {
  const sh = SHAPES[p.s];
  const el = document.createElement('div');
  el.className = 'piece';
  el.style.gridTemplateColumns = `repeat(${sh.wd}, ${size})`;
  el.style.gridTemplateRows = `repeat(${sh.h}, ${size})`;
  sh.cells.forEach(([r, c], n) => {
    const b = document.createElement('div');
    b.className = n === p.g ? 'b gold' : n === p.gem ? 'b gem' : 'b';
    b.style.setProperty('--k', colorOf(p.k + 1));
    b.style.gridRow = r + 1; b.style.gridColumn = c + 1;
    el.appendChild(b);
  });
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

const stars = (k, of = 3) => '★'.repeat(k) + '☆'.repeat(of - k);
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function renderLimit() {
  const a = S.adv, el = $('limit');
  el.hidden = !a || a.mode === 'relaxed';
  if (el.hidden) return;
  el.classList.toggle('timed', a.mode === 'time');
  if (a.mode === 'moves') {
    $('limit-t').textContent = `👣 ${a.moves}`;
    el.classList.toggle('low', a.moves <= 3);
  } else {
    $('limit-t').textContent = `⏱ ${clock(Math.ceil(a.time))}`;
    $('tbar').firstChild.style.width = (100 * a.time / a.timeTotal) + '%';
    el.classList.toggle('low', a.time <= 10);
  }
}

function renderHud() {
  const a = S.adv;
  $('best').hidden = !!a;
  $('chip').hidden = !a;
  if (a) $('chip').innerHTML = a.daily ? `📅 Daily${streakNow() ? ` <span>🔥${streakNow()}</span>` : ''}` : `Level ${a.n} <span>${stars(a.diff)}</span>`;
  $('best-n').textContent = best;
  $('score').classList.toggle('goal', !!a);
  renderBestBar();
  setAura(S.combo);
  $('b-undo').disabled = !(S.undo && S.undoReady) || S.over || S.won;
  document.querySelectorAll('#bottom .pw').forEach((b) => {
    const k = b.dataset.pw;
    b.querySelector('i').textContent = pw[k] || '+';
    b.classList.toggle('none', !pw[k]);
    b.classList.toggle('armed', arm === k);
  });
  board.classList.toggle('aim', arm === 'bomb');
  renderLimit();
}

// Classic: a bar that fills toward the best score she had when this game started.
function renderBestBar() {
  const el = $('bestbar');
  el.hidden = !!S.adv || !(S.startBest > 0);
  if (el.hidden) return;
  const k = Math.min(1, S.score / S.startBest);
  el.firstChild.style.width = k * 100 + '%';
  el.classList.toggle('near', !S.beat && k >= 0.8);
  el.classList.toggle('beat', S.beat);
}

let countTimer = null;
function renderScore() {
  clearInterval(countTimer);
  const el = $('score'), target = S.adv ? S.adv.left : S.score;
  if (shown === target) { el.textContent = shown; return; }
  el.classList.add('bump');
  setTimeout(() => el.classList.remove('bump'), 140);
  const from = shown, to = target, t0 = performance.now();
  countTimer = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / 450);
    shown = Math.round(from + (to - from) * k);
    el.textContent = shown;
    if (k >= 1) clearInterval(countTimer);
  }, 30);
}

function renderAll(deal = false) { renderBoard(); renderTray(deal); renderHud(); renderScore(); }

// ---------------------------------------------------------------- rules

function place(i, row, col) {
  flushFx();
  const a = S.adv, ev = move(S, i, row, col);
  const cx = col + ev.sh.wd / 2, cy = row + ev.sh.h / 2;
  play.place();

  if (!a && ((ev.golden && Math.random() < GOLD_GIFT) || ev.gift)) classicGift();
  if (!a) {
    S.ms = S.ms || 0;
    let hitMs = 0;
    while (S.ms < MILESTONES.length && S.score >= MILESTONES[S.ms]) hitMs = MILESTONES[S.ms++];
    if (hitMs) setTimeout(() => {
      play.praise();
      const r = $('score').getBoundingClientRect();
      for (const k of [0, 2, 4]) burst(r.left + r.width / 2, r.top + r.height / 2, colorOf(k + 1), 10);
      play.allClear();
    }, ev.L ? 900 : 200);
  }

  if (!a && S.score > best) {
    best = S.score;
    localStorage.setItem(BEST, best);
    if (!S.beat && S.startBest > 0) {
      S.beat = true;
      setTimeout(() => { play.best(); }, 500);
    }
    checkUnlock();
  }

  const won = !!(a && a.left <= 0);
  let fresh = false; // not "deal": that would hide the deal() function
  if (won) win();
  else {
    fresh = refill(S);
    if (fresh) setTimeout(() => play.deal(), 150);
    checkOver();
    save();
  }
  renderAll(fresh);
  landFx(ev, cx, cy, won);
}

function undo() {
  if (!canUndo(S)) return;
  flushFx();
  undoMove(S);
  shown = S.adv ? S.adv.left : S.score;
  $('board').classList.remove('dead');
  $('over').hidden = true;
  play.undo();
  save();
  renderAll();
}

function checkOver() {
  const left = S.tray.filter(Boolean);
  if (left.length && left.every((p) => !fitsAnywhere(S.grid, p.s))) S.why = 'space';
  else if (S.adv && S.adv.moves !== null && S.adv.moves <= 0) S.why = 'moves';
  else return;
  S.over = true;
  setTimeout(gameOver, 500);
}

const OVER_TITLE = { space: 'No more space!', moves: 'Out of moves!', time: "Time's up!" };

function gameOver(instant = false) {
  if (!S.over) return;
  if (!S.adv) record(S);
  renderHud();
  $('board').classList.add('dead');
  if (!instant) play.over();
  setTimeout(() => {
    if (!S.over || screen !== 'app') return;
    const a = S.adv;
    if (a) {
      $('over-title').textContent = OVER_TITLE[S.why] || OVER_TITLE.space;
      $('over-lbl').textContent = 'Blocks left';
      $('over-score').textContent = a.left;
      $('over-sub').textContent = a.daily ? '📅 Daily puzzle' : `Level ${a.n} · ${DIFFS[a.diff].name}`;
      $('b-again').textContent = 'Try again';
      $('over-stats').hidden = true;
    } else {
      $('over-title').textContent = S.beat ? 'New Best!' : 'No more space!';
      $('over-lbl').textContent = 'Score';
      $('over-score').textContent = S.score;
      $('over-sub').innerHTML = `👑 Best <b id="over-best">${best}</b>`;
      $('b-again').textContent = 'Play again';
      $('over-stats').hidden = false;
      $('over-stats').innerHTML = statsHtml(S.score);
    }
    $('b-over-map').hidden = !a;
    $('b-over-map').textContent = a && a.daily ? '🏠 Menu' : '🗺️ Map';
    $('b-over-undo').hidden = !(S.undo && S.undoReady) || S.why === 'time';
    $('b-over-fresh').hidden = S.why !== 'space' || !pw.fresh;
    $('b-over-bomb').hidden = S.why !== 'space' || !pw.bomb;
    $('b-over-fresh').textContent = `🔄 New pieces (${pw.fresh} left)`;
    $('b-over-bomb').textContent = `💣 Drop a bomb (${pw.bomb} left)`;
    $('over').hidden = false;
  }, instant ? 0 : 1100);
}


function win() {
  const a = S.adv;
  S.won = true;
  const had = a.daily ? 0 : prog[a.mode][a.n] || 0;
  if (!a.daily && a.diff > had) { prog[a.mode][a.n] = a.diff; saveProg(); }
  localStorage.removeItem(RUN);
  // Rewards: one random power-up per level, one of each for the first daily solve of the day.
  const gift = [], first = a.daily && a.daily === dayStr() && daily.last !== a.daily;
  if (first) {
    daily.streak = (daily.last === yesterday() ? daily.streak : 0) + 1;
    daily.last = a.daily;
    store(DAILY, daily);
    gift.push(...PW);
  } else if (!a.daily) gift.push(PW[Math.floor(Math.random() * PW.length)]);
  for (const k of gift) pw[k]++;
  savePw();
  setTimeout(() => {
    play.best();
  }, 350);
  setTimeout(() => {
    if (screen !== 'app' || !S.won) return;
    $('win-title').textContent = a.daily ? 'Daily puzzle solved!' : `Level ${a.n} complete!`;
    const got = a.daily ? 3 : Math.max(had, a.diff);
    [...$('win-stars').children].forEach((s, i) => {
      s.className = i < got ? 'on' : '';
      s.style.animationDelay = 250 + i * 250 + 'ms';
      if (i < got) setTimeout(() => play.tick(), 250 + i * 250);
    });
    $('win-msg').textContent = a.diff === 3 ? 'All 3 stars. Perfect!'
      : a.diff > had ? `Beat it on ${DIFFS[a.diff + 1].name} for ${stars(a.diff + 1)}`
        : `You already have ${stars(had)} here`;
    if (a.daily) {
      const st = streakNow();
      $('win-msg').textContent = first ? `🔥 ${st} ${st === 1 ? 'day' : 'days in a row'} · a new puzzle tomorrow` : a.daily !== dayStr() ? "That was yesterday's puzzle · today's is waiting" : 'Already solved today · a new puzzle tomorrow';
    }
    $('win-gift').textContent = gift.length ? `Reward: ${gift.map((k) => PW_ICON[k]).join(' ')}` : '';
    $('win-next').hidden = !!a.daily;
    $('win-map').textContent = a.daily ? '🏠 Menu' : '🗺️ Map';
    $('win').hidden = false;
  }, 1600);
}

// Time Attack clock. Starts on the first pick-up; pauses in the background, in settings and on other screens.
let lastT = performance.now(), lastSec = 0;
setInterval(() => {
  const now = performance.now(), dt = (now - lastT) / 1000;
  lastT = now;
  const a = S && S.adv;
  if (!a || a.time === null || !a.started || S.over || S.won || screen !== 'app' || document.hidden || GFY.settings.isOpen()) return;
  a.time = Math.max(0, a.time - dt);
  const sec = Math.ceil(a.time);
  if (sec !== lastSec && sec <= 10 && sec > 0) play.tick();
  lastSec = sec;
  if (a.time <= 0) { drop(); S.over = true; S.why = 'time'; save(); gameOver(); }
  renderLimit();
}, 200);

// ---------------------------------------------------------------- effects
// All effects are visual only: the game state is already final when they start.
const cellXY = (j) => {
  const rect = board.getBoundingClientRect(), r = Math.floor(j / N), c = j % N;
  return [rect.left + PAD + c * (cell + GAP) + cell / 2, rect.top + PAD + r * (cell + GAP) + cell / 2];
};

// The piece lands with a squash-bounce; completed lines flash, then clear. While they flash the board
// shows the move's in-between state; any new input or render first finishes it (flushFx).
const FLASH = 190;
let pendingFx = null;
function flushFx() {
  const f = pendingFx;
  if (!f) return;
  pendingFx = null;
  clearTimeout(f.t);
  f.run();
}
function landFx(ev, cx, cy, won) {
  if (!ev.L) { for (const j of ev.placed) cells[j].classList.add('land'); return; }
  const lines = new Set([...ev.res.gone, ...ev.res.cracked, ...ev.res.melted]);
  for (const j of lines) { paint(j, ev.pre[j], ev.preIce); cells[j].classList.add('flash'); }
  for (const j of ev.placed) cells[j].classList.add('land');
  const run = () => {
    for (const j of lines) paint(j, S.grid[j]);
    clearFx(ev, cx, cy, won);
  };
  const f = { run, t: 0 };
  f.t = setTimeout(() => { if (pendingFx === f) { pendingFx = null; run(); } }, FLASH);
  pendingFx = f;
}

function clearFx(ev, cx, cy, won) {
  const { res, L, combo } = ev;
  blast(res.gone, res.vals, cx, cy, combo);
  if (res.cracked.length) crack(res.cracked);
  if (res.melted.length) melt(res.melted);
  play.clear(L, combo);
  kick(combo, L);
  if (L >= 2 || combo >= 3) shake(L >= 3 || combo >= 4);
  if (L >= 3) bigClear(L, combo);
  if (ev.allClear) { boardClear(); if (!won) play.allClear(); }
}

const blastLayer = $('blast');
function blast(gone, vals, cx, cy, combo = 1) {
  const rect = board.getBoundingClientRect(), more = Math.min(combo, 6);
  gone.forEach((j, n) => {
    const r = Math.floor(j / N), c = j % N, color = colorOf(vals[n]);
    const d = document.createElement('div');
    d.className = 'pop b';
    d.style.setProperty('--k', color);
    d.style.left = PAD + c * (cell + GAP) + 'px';
    d.style.top = PAD + r * (cell + GAP) + 'px';
    const delay = Math.hypot(r + 0.5 - cy, c + 0.5 - cx) * 28;
    d.style.animationDelay = delay + 'ms';
    blastLayer.appendChild(d);
    setTimeout(() => d.remove(), delay + 450);
    const x = rect.left + PAD + c * (cell + GAP) + cell / 2, y = rect.top + PAD + r * (cell + GAP) + cell / 2;
    setTimeout(() => {
      burst(x, y, color, (isTarget(vals[n]) ? 12 : 7) + more * 2);
      if (isGem(vals[n])) { burst(x, y, '#ff7ad9', 16); burst(x, y, '#9ff3ff', 10); ring(x, y, '#ffd6f5', cell * 2.2, 3); }
    }, delay + 120);
  });
}

function crack(list) {
  setTimeout(() => play.crack(), 120);
  for (const j of list) { const [x, y] = cellXY(j); burst(x, y, '#c9cddb', 5); }
}
function melt(list) {
  setTimeout(() => play.crack(), 80);
  for (const j of list) { const [x, y] = cellXY(j); burst(x, y, '#dff6ff', 9); burst(x, y, '#8fd8ff', 5); }
}

// The board never shakes (player feedback); kept as a no-op so callers stay simple.
function shake() {}

// Combo aura: the page and board glow in a colour that shifts strongly with the combo level.
const AURA = ['', '#2ee6ff', '#45ff8a', '#ffe23a', '#ff8a2a', '#ff3df0', '#b45cff'];
let auraLv = -1;
function setAura(combo) {
  const lv = combo >= 2 ? Math.min(combo - 1, AURA.length - 1) : 0;
  if (lv === auraLv) return;
  auraLv = lv;
  const b = document.body;
  if (lv) {
    b.dataset.combo = lv;
    b.style.setProperty('--aura', AURA[lv]);
    b.style.setProperty('--aura2', AURA[Math.min(lv + 1, AURA.length - 1)]);
  } else delete b.dataset.combo;
}
// A clear pulses the aura; bigger with more lines and a higher combo.
function kick(combo, L) {
  setAura(combo);
  const el = $('aura');
  el.classList.remove('kick', 'kick2'); void el.offsetWidth; el.classList.add(L >= 3 || combo >= 4 ? 'kick2' : 'kick');
  if (combo >= 2) {
    const r = board.getBoundingClientRect();
    ring(r.left + r.width / 2, r.top + r.height / 2, AURA[Math.min(combo - 1, AURA.length - 1)], r.width * (0.5 + combo * 0.08), 4 + combo);
  }
}

// 3+ lines at once: shockwaves, a flash and a fountain of blocks.
function bigClear(L, combo) {
  const r = board.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  const fl = $('flashfx');
  fl.classList.remove('on'); void fl.offsetWidth; fl.classList.add('on');
  for (let k = 0; k < L; k++) setTimeout(() => ring(x, y, colorOf((k % 7) + 1), r.width * (0.7 + k * 0.25), 7), k * 110);
  for (let k = 0; k < 7; k++) burst(x, y, colorOf(k + 1), 6 + L * 2 + combo);
}

// The whole board cleared: rainbow board, waves of fireworks and confetti from the top.
function boardClear() {
  const r = board.getBoundingClientRect();
  board.classList.remove('allclear'); void board.offsetWidth; board.classList.add('allclear');
  setTimeout(() => board.classList.remove('allclear'), 1700);
  const fl = $('flashfx');
  fl.classList.remove('on'); void fl.offsetWidth; fl.classList.add('on');
  for (let k = 0; k < 4; k++) setTimeout(() => ring(r.left + r.width / 2, r.top + r.height / 2, colorOf((k * 2 % 7) + 1), r.width * (0.8 + k * 0.3), 9), k * 160);
  for (let k = 0; k < 9; k++) {
    setTimeout(() => {
      const x = r.left + r.width * (0.15 + Math.random() * 0.7), y = r.top + r.height * (0.15 + Math.random() * 0.7);
      burst(x, y, colorOf((k % 7) + 1), 22);
      burst(x, y, '#ffffff', 6);
    }, 120 + k * 110);
  }
  confetti(70);
  setTimeout(() => buzz([60, 40, 60, 40, 120, 60, 200]), 250);
}

// Particles (squares, rings, confetti) on a full-screen canvas; the loop only runs while any exist.
const cv = $('fx'), g = cv.getContext('2d');
let parts = [], running = false;
function sizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  cv.width = window.innerWidth * dpr; cv.height = window.innerHeight * dpr;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
}
const startFx = () => { if (!running) { running = true; requestAnimationFrame(tick); } };
function burst(x, y, color, count = 7) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 5;
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 3, life: 1, s: cell * (0.12 + Math.random() * 0.16), color, rot: Math.random() * 6 });
  }
  startFx();
}
function ring(x, y, color, size, w = 5) {
  parts.push({ ring: true, x, y, r: cell * 0.3, vr: size / 30, life: 1, color, w });
  startFx();
}
function confetti(count) {
  for (let i = 0; i < count; i++) {
    parts.push({
      x: Math.random() * window.innerWidth, y: -20 - Math.random() * 200, vx: Math.random() * 2 - 1, vy: 2 + Math.random() * 3,
      life: 1.6, s: cell * (0.15 + Math.random() * 0.15), color: colorOf((i % 7) + 1), rot: Math.random() * 6, slow: true,
    });
  }
  startFx();
}
function tick() {
  g.clearRect(0, 0, window.innerWidth, window.innerHeight);
  for (const p of parts) {
    g.globalAlpha = Math.max(0, Math.min(1, p.life));
    if (p.ring) {
      p.r += p.vr; p.life -= 0.035;
      g.strokeStyle = p.color; g.lineWidth = p.w * Math.max(0.2, p.life);
      g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.stroke();
      continue;
    }
    p.x += p.vx; p.y += p.vy; p.rot += 0.2;
    if (p.slow) { p.vy = Math.min(p.vy + 0.05, 4); p.vx += Math.sin(p.rot) * 0.1; p.life -= 0.008; } else { p.vy += 0.35; p.life -= 0.022; }
    g.fillStyle = p.color;
    g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillRect(-p.s / 2, -p.s / 2, p.s, p.s); g.restore();
  }
  g.globalAlpha = 1;
  parts = parts.filter((p) => p.life > 0);
  if (parts.length) requestAnimationFrame(tick); else { running = false; g.clearRect(0, 0, window.innerWidth, window.innerHeight); }
}

// Shake a refused button (locked theme, empty power-up).
function nope(el) { el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope'); }

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
  const p = S.tray[drag.i], sh = SHAPES[p.s], color = colorOf(p.k + 1);
  drag.ok = fits(S.grid, p.s, row, col);
  drag.row = row; drag.col = col;
  if (!drag.ok) return;
  const test = S.grid.slice();
  for (const [r, c] of sh.cells) {
    const j = (row + r) * N + col + c;
    test[j] = p.k + 1;
    cells[j].className = 'c ghost' + (S.ice && S.ice[j] ? ` ice${S.ice[j]}` : '');
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
  const lift = cell * 1.7;
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
    if (drag || S.over || S.won || !S.tray[i]) return;
    flushFx();
    if (arm) { arm = null; renderHud(); }
    const p = S.tray[i];
    if (S.adv && S.adv.time !== null && !S.adv.started) { S.adv.started = true; lastT = performance.now(); renderLimit(); }
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
  if (d.ok && !S.over) {
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

// Time ran out (or she left) mid-drag: put the piece back.
function drop() {
  if (!drag) return;
  clearPreview();
  slots[drag.i].classList.remove('dragging');
  float.style.display = 'none';
  drag = null;
}

// ---------------------------------------------------------------- power-ups
// Turning = the same shape rotated a quarter turn clockwise (every orientation is in SHAPES).
const shapeKey = (cells) => cells.map(([r, c]) => r * N + c).sort((a, b) => a - b).join();
const TURN = SHAPES.map((sh, i) => {
  const k = shapeKey(sh.cells.map(([r, c]) => [c, sh.h - 1 - r]));
  const j = SHAPES.findIndex((o) => shapeKey(o.cells) === k);
  return j < 0 ? i : j;
});

function spend(k) { pw[k]--; savePw(); arm = null; S.undo = null; }

// After a power-up the board may have room again: clear a game over and check once more.
function afterPower(deal = false) {
  S.over = false; S.why = '';
  $('over').hidden = true;
  $('board').classList.remove('dead');
  checkOver();
  save();
  renderAll(deal);
}

function usePower(k) {
  if (!S || S.won || drag || (S.over && S.why !== 'space')) return;
  unlock();
  flushFx();
  if (!pw[k]) { play.back(); nope(document.querySelector(`#bottom .pw[data-pw="${k}"]`)); return; }
  if (k === 'bomb') {
    arm = arm ? null : 'bomb';
    play.pick();
    if (!arm && S.over) gameOver(true);
    renderHud();
    return;
  }
  spend(k);
  if (k === 'fresh') { S.tray = deal(S); S.pending = null; play.deal(); }
  else { S.tray = S.tray.map((p) => p && { ...p, s: TURN[p.s] }); play.pick(); }
  afterPower(k === 'fresh');
}

// The bomb clears the 3×3 square around the tapped cell (stones crack and ice melts, as in a line clear).
function bomb(row, col) {
  flushFx();
  spend('bomb');
  const gone = [], vals = [], cracked = [], melted = [];
  let hit = 0, gems = 0;
  for (let r = row - 1; r <= row + 1; r++) for (let c = col - 1; c <= col + 1; c++) {
    if (r < 0 || c < 0 || r >= N || c >= N) continue;
    const j = r * N + c, v = S.grid[j];
    if (S.ice && S.ice[j] > 0) { S.ice[j]--; hit++; melted.push(j); }
    if (!v) continue;
    if (v === STONE) { S.grid[j] = CRACKED; cracked.push(j); continue; }
    if (isTarget(v)) hit++;
    if (isGem(v)) gems++;
    gone.push(j); vals.push(v); S.grid[j] = 0;
  }
  if (S.adv && S.adv.gems) S.adv.gems = Math.max(0, S.adv.gems - gems);
  blast(gone, vals, col + 0.5, row + 0.5);
  if (cracked.length) crack(cracked);
  if (melted.length) melt(melted);
  play.clear(2, 1);
  shake();
  if (S.adv && (S.adv.left -= hit) <= 0) { S.over = false; $('over').hidden = true; $('board').classList.remove('dead'); win(); renderAll(); return; }
  afterPower();
}

board.addEventListener('pointerdown', (e) => {
  if (arm !== 'bomb' || !S || S.won) return;
  const rect = board.getBoundingClientRect();
  const col = Math.floor((e.clientX - rect.left - PAD) / (cell + GAP)), row = Math.floor((e.clientY - rect.top - PAD) / (cell + GAP));
  if (row >= 0 && col >= 0 && row < N && col < N) bomb(row, col);
});
document.querySelectorAll('#bottom .pw').forEach((b) => b.addEventListener('click', () => usePower(b.dataset.pw)));
$('b-over-fresh').addEventListener('click', () => usePower('fresh'));
$('b-over-bomb').addEventListener('click', () => {
  $('over').hidden = true;
  $('board').classList.remove('dead');
  usePower('bomb');
});

// ---------------------------------------------------------------- level popup
let pick = null; // { mode, n, diff }
const lvlCells = [];
for (let i = 0; i < N * N; i++) { const d = document.createElement('div'); $('lvl-board').appendChild(d); lvlCells.push(d); }

function openLevel(n) {
  const mode = prog.mode, had = prog[mode][n] || 0;
  pick = { mode, n, diff: Math.min(3, had + 1) };
  $('lvl-title').textContent = `Level ${n}`;
  $('lvl-world').textContent = `${worldOf(n).name} · ${{ time: '⏱ Time Attack', moves: '👣 Moves', relaxed: '∞ Relaxed' }[mode]}`;
  document.querySelectorAll('#diffs button').forEach((b) => {
    const d = Number(b.dataset.d);
    b.querySelector('.st').innerHTML = [1, 2, 3].slice(0, d).map(() => `<i class="${had >= d ? 'on' : ''}">★</i>`).join('');
  });
  const run = load(RUN);
  const cont = valid(run) && run.adv && !run.adv.daily && run.adv.mode === mode && run.adv.n === n && !run.over && !run.won;
  $('lvl-cont').hidden = !cont;
  if (cont) $('lvl-cont').textContent = `▶ Continue (${DIFFS[run.adv.diff].name})`;
  $('lvl').hidden = false;
  play.tap();
  pickDiff(pick.diff);
}

function pickDiff(d) {
  pick.diff = d;
  document.querySelectorAll('#diffs button').forEach((b) => b.classList.toggle('on', Number(b.dataset.d) === d));
  const info = levelInfo(pick.mode, pick.n, d);
  info.grid.forEach((v, i) => {
    lvlCells[i].className = (v ? cellClass(v).slice(2) : '') + (info.ice && info.ice[i] ? ' ice2' : '');
    if (v) lvlCells[i].style.setProperty('--k', colorOf(v)); else lvlCells[i].style.removeProperty('--k');
  });
  const stones = info.grid.filter((v) => v === STONE).length;
  const limit = pick.mode === 'moves' ? `👣 ${info.moves} moves` : pick.mode === 'time' ? `⏱ ${clock(info.time)}` : '∞ No limit';
  const iced = info.ice ? info.ice.filter(Boolean).length : 0, extra = [];
  if (stones) extra.push(`🪨 ${stones} stone${stones > 1 ? 's' : ''}: clear twice`);
  if (iced) extra.push(`🧊 ${iced} ice: clear lines through it twice`);
  if (info.gems) extra.push(`💎 Collect ${info.gems} gems from your pieces`);
  $('lvl-info').innerHTML = `${limit} · 🎯 ${info.total}${extra.length ? `<br><small>${extra.join('<br>')}</small>` : ''}`;
}

document.querySelectorAll('#diffs button').forEach((b) => b.addEventListener('click', () => { play.tap(); pickDiff(Number(b.dataset.d)); }));
$('lvl-play').addEventListener('click', () => { unlock(); play.tap(); startLevel(pick.mode, pick.n, pick.diff); });
$('lvl-cont').addEventListener('click', () => { play.tap(); S = load(RUN); shown = S.adv.left; startBoard(); });
$('lvl-close').addEventListener('click', () => { play.tap(); $('lvl').hidden = true; });

// ---------------------------------------------------------------- buttons
$('m-classic').addEventListener('click', () => { unlock(); play.tap(); openClassic(); });
$('m-adv').addEventListener('click', () => { unlock(); play.tap(); openMap(); });
$('m-daily').addEventListener('click', () => {
  unlock(); play.tap();
  const run = load(RUN);
  if (valid(run) && run.adv && run.adv.daily === dayStr() && !run.over && !run.won) { S = run; shown = S.adv.left; startBoard(); } else startDaily();
});
const backToList = () => (S.adv && S.adv.daily ? openMenu() : openMap());
$('map-back').addEventListener('click', () => { play.tap(); openMenu(); });
document.querySelectorAll('#tabs button').forEach((b) => b.addEventListener('click', () => {
  play.tap(); prog.mode = b.dataset.mode; saveProg(); openMap();
}));

$('b-home').addEventListener('click', () => { drop(); if (!S.won) save(); if (S.adv) backToList(); else openMenu(); });
$('b-undo').addEventListener('click', undo);
$('b-over-undo').addEventListener('click', undo);
$('b-over-map').addEventListener('click', () => { play.tap(); $('over').hidden = true; backToList(); });
function again() {
  play.tap();
  if (S.adv && S.adv.daily) startDaily();
  else if (S.adv) startLevel(S.adv.mode, S.adv.n, S.adv.diff);
  else { newGame(); startBoard(); }
}
$('b-again').addEventListener('click', again);
$('win-retry').addEventListener('click', again);
$('win-map').addEventListener('click', () => { play.tap(); backToList(); });
$('win-next').addEventListener('click', () => { const n = S.adv.n + 1; openMap(); openLevel(n); });

GFY.settings.init({
  sfx: { get: () => settings.sfx, set: (v) => { settings.sfx = v; saveSettings(); } },
  music: { get: () => settings.music, set: (v) => { unlock(); setMusic(v); saveSettings(); } },
  vib: { get: () => settings.vib, set: (v) => { settings.vib = v; saveSettings(); } },
  extras: [
    { type: 'node', label: '🎨 Theme · new ones unlock with your 👑 best', el: $('themes-wrap') },
    { type: 'button', label: () => (S && S.adv ? 'Restart level' : 'Restart game'), hidden: () => screen !== 'app', close: true, onClick: again },
  ],
  onOpen: () => { unlock(); renderThemes(); },
});
document.addEventListener('pointerdown', unlock, { once: true });
document.addEventListener('visibilitychange', () => { if (document.hidden && S && !S.won) save(); });
if (location.search.includes('debug')) window.dbg = { get S() { return S; }, renderAll, checkOver, place, undo, stats };

// ---------------------------------------------------------------- start (back where she left off)
window.addEventListener('resize', layout);
applyTheme(theme.id);
if (!theme.seen) { theme.seen = THEMES.filter((x) => x.need <= best).pop().need; store(THEME, theme); }
layout();
const last = localStorage.getItem(SCREEN), run = load(RUN);
if (last === 'classic') openClassic();
else if (last === 'adv' && valid(run) && run.adv && !run.won) { S = run; shown = S.adv.left; startBoard(); }
else if (last === 'map' || last === 'adv') openMap();
else openMenu();
