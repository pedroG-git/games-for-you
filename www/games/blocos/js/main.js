// Blocos — Block Blast-style puzzle: drag pieces onto an 8×8 board, fill rows/columns to clear them.
// Classic = endless high-score game. Adventures = endless levels where pre-placed blocks must be cleared.
import { N, SHAPES, GOLD, STONE, CRACKED, isTarget, colorOf, setColors, fits, fitsAnywhere, dealTray, fullLines, lineCells, clearLines } from './pieces.js';
import { play, settings, unlock, setMusic } from './audio.js';
import { catSVG } from './cats.js';
import { DIFFS, worldOf, levelInfo } from './levels.js';
import { renderMap } from './map.js';

const $ = (id) => document.getElementById(id);
const SAVE = 'blocos-save', BEST = 'blocos-best', SET = 'blocos-settings';
const RUN = 'blocos-adv-run', PROG = 'blocos-adv', SCREEN = 'blocos-screen';
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
// blocks and every GIFT_LINES lines. Used anywhere (most of all when stuck).
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
// Golden blocks: now and then a Classic piece carries a golden cell; clearing it doubles that clear's
// points and may drop a power-up (surprise rewards keep a game fun). Score milestones get a cheer.
const GOLD_DEAL = 0.18, GOLD_GIFT = 0.5, GIFT_LINES = 20;
const MILESTONES = [250, 500, 1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000, 30000, 50000, 75000, 100000];
function deal(grid, classic) {
  const tray = dealTray(grid, Math.random, classic ? 0 : help());
  if (classic && Math.random() < GOLD_DEAL) {
    const p = tray[Math.floor(Math.random() * tray.length)];
    if (p) p.g = Math.floor(Math.random() * SHAPES[p.s].cells.length);
  }
  return tray;
}

// Themes: block colours + board look, unlocked by the Classic best score.
const THEME = 'blocos-theme';
const THEMES = [
  { id: 'classic', name: 'Classic', need: 0, colors: ['#ff4d5e', '#ff9a2e', '#ffd23a', '#4fd65a', '#2ec9e8', '#3f7cff', '#a35cff'] },
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
  if (t.need > best) { play.back(); cat('meme', `Mrrp. (Score ${t.need} in Classic to unlock ${t.name}.)`, true); return; }
  play.tap();
  applyTheme(t.id);
  renderThemes();
  if (S) renderAll();
});
// A theme unlocked by a new best: tell her once.
function checkUnlock() {
  const t = THEMES.filter((x) => x.need <= best).pop();
  if (t.need <= theme.seen) return;
  theme.seen = t.need;
  store(THEME, theme);
  if (t.need > 0) setTimeout(() => cat('mimi', `Mew mew! (New theme unlocked: ${t.name}! Find it in ⚙️)`, true), 2600);
}

// A power-up dropped in Classic: a cat brings it and its button bounces.
function classicGift(why) {
  const k = PW[Math.floor(Math.random() * PW.length)];
  pw[k]++;
  savePw();
  setTimeout(() => {
    const b = document.querySelector(`#bottom .pw[data-pw="${k}"]`);
    b.classList.remove('got'); void b.offsetWidth; b.classList.add('got');
    const r = b.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, '#ffd23a', 14);
    play.best();
    cat(nextCat(), `Mrrp! (${why} Here, a ${PW_ICON[k]} for you!)`, true);
    renderHud();
  }, 700);
}

function newGame() {
  const grid = Array(N * N).fill(0);
  S = {
    grid, tray: deal(grid, true), score: 0, combo: 0, miss: 0,
    undo: null, undoReady: true, pending: null, over: false,
    startBest: best, beat: false, adv: null, lines: 0, ms: 0, near: false,
  };
  shown = 0;
  save();
}

function save() { if (S) store(S.adv ? RUN : SAVE, S); }
try { Object.assign(settings, JSON.parse(localStorage.getItem(SET)) || {}); } catch (e) { /* ignore */ }
const saveSettings = () => localStorage.setItem(SET, JSON.stringify(settings));
const help = () => (S.adv ? DIFFS[S.adv.diff].help : 0);

// ---------------------------------------------------------------- screens
function show(name) {
  screen = name;
  arm = null;
  for (const id of ['menu', 'map', 'app']) $(id).hidden = id !== name;
  for (const id of ['over', 'win', 'lvl']) $(id).hidden = true;
  localStorage.setItem(SCREEN, name === 'app' ? (S.adv ? 'adv' : 'classic') : name);
  $('b-restart').textContent = S && S.adv ? 'Restart level' : 'Restart game';
  $('b-restart').hidden = name !== 'app';
}

function openMenu() {
  $('m-best').textContent = best;
  $('m-stars').textContent = totalStars();
  $('menu-cats').innerHTML = `<div>${catSVG('meme')}</div><div>${catSVG('mimi')}</div>`;
  const done = daily.last === dayStr(), st = streakNow();
  $('m-daily').classList.toggle('ready', !done);
  $('m-daily-sub').textContent = done ? `✓${st > 1 ? ` 🔥${st}` : ' Done'}` : st ? `🔥${st} · Play!` : 'New!';
  show('menu');
}

function startDaily() {
  const d = new Date(), day = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
  startLevel('moves', day, 1, dayStr());
}

function openClassic() {
  S = load(SAVE);
  if (!valid(S) || S.adv) newGame();
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
    grid, tray: null, score: 0, combo: 0, miss: 0,
    undo: null, undoReady: true, pending: null, over: false, won: false, why: '',
    adv: {
      mode, n, diff, daily: day, left: info.total, total: info.total, started: false,
      moves: mode === 'moves' ? info.moves : null, time: mode === 'time' ? info.time : null, timeTotal: info.time,
    },
  };
  S.tray = dealTray(grid, Math.random, help());
  shown = info.total;
  save();
  startBoard();
}

function startBoard() {
  // A saved game whose tray ended up empty would be stuck: deal fresh pieces.
  if (!Array.isArray(S.tray) || S.tray.every((t) => !t)) { S.tray = deal(S.grid, !S.adv); S.pending = null; save(); }
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
  if (v >= STONE) return v === CRACKED ? 'c b st cr' : 'c b st';
  return isTarget(v) ? 'c b t' : 'c b';
}
function paint(i, v) {
  const d = cells[i];
  d.className = cellClass(v);
  d.style.removeProperty('--hk');
  if (v) d.style.setProperty('--k', colorOf(v)); else d.style.removeProperty('--k');
}
function renderBoard() { S.grid.forEach((v, i) => paint(i, v)); }

function pieceEl(p, size) {
  const sh = SHAPES[p.s];
  const el = document.createElement('div');
  el.className = 'piece';
  el.style.gridTemplateColumns = `repeat(${sh.wd}, ${size})`;
  el.style.gridTemplateRows = `repeat(${sh.h}, ${size})`;
  sh.cells.forEach(([r, c], n) => {
    const b = document.createElement('div');
    b.className = n === p.g ? 'b gold' : 'b';
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
    $('limit-t').textContent = `👣 ${a.moves} ${a.moves === 1 ? 'move' : 'moves'}`;
    el.classList.toggle('low', a.moves <= 3);
  } else {
    $('limit-t').textContent = `⏱ ${clock(Math.ceil(a.time))}${a.started ? '' : ' · starts on first move'}`;
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
  const c = $('combo');
  c.hidden = S.combo < 2 && !arm;
  c.textContent = arm ? '💣 Tap the board to drop the bomb' : `Combo x${S.combo}`;
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
  el.lastChild.textContent = S.beat ? '👑 New best!' : k >= 0.8 ? `Almost! ${S.startBest - S.score} to your best` : `👑 ${S.startBest}`;
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
const WORDS = ['', 'Nice!', 'Good!', 'Great!', 'Excellent!', 'Amazing!', 'Unbelievable!'];

function place(i, row, col) {
  const p = S.tray[i], sh = SHAPES[p.s], a = S.adv;
  S.undo = {
    grid: S.grid.slice(), tray: S.tray.slice(), score: S.score, combo: S.combo, miss: S.miss, dealt: false,
    left: a && a.left, moves: a && a.moves,
  };

  sh.cells.forEach(([r, c], n) => { S.grid[(row + r) * N + col + c] = n === p.g ? GOLD : p.k + 1; });
  S.tray[i] = null;
  S.score += sh.cells.length;
  if (a && a.moves !== null) a.moves--;

  const res = clearLines(S.grid), L = res.L;
  const cx = col + sh.wd / 2, cy = row + sh.h / 2;
  let gained = sh.cells.length;
  play.place();

  if (L) {
    S.combo += 1; S.miss = 0;
    let pts = 10 * L * (L + 1) / 2 * S.combo;
    const allClear = S.grid.every((v) => !v);
    if (allClear) pts += 300;
    const golden = !a && res.vals.includes(GOLD);
    if (golden) pts *= 2;
    S.score += pts; gained += pts;
    if (a) a.left -= res.hit;

    blast(res.gone, res.vals, cx, cy);
    if (res.cracked.length) crack(res.cracked);
    play.clear(L, S.combo);
    if (L >= 2) shake();
    const won = a && a.left <= 0;
    if (golden) praise('Golden!', 'Points x2');
    else if (!won && (L >= 2 || S.combo >= 2)) praise(allClear ? 'All Clear!' : WORDS[Math.min(L, 6)], S.combo >= 2 ? `Combo x${S.combo}` : '');
    if (!a) {
      const before = S.lines || 0;
      S.lines = before + L;
      if (golden && Math.random() < GOLD_GIFT) classicGift('Golden blocks!');
      else if (Math.floor(S.lines / GIFT_LINES) > Math.floor(before / GIFT_LINES)) classicGift(`${Math.floor(S.lines / GIFT_LINES) * GIFT_LINES} lines!`);
    }
    if (won) { /* the win popup does the cheering */ } else if (allClear) { play.allClear(); cat('mimi', 'Mew?! (Where did all the blocks go?!)', true); }
    else if (L >= 3 || S.combo >= 4) cat(nextCat(), null);
  } else if (++S.miss >= 3) {
    S.combo = 0;
  }
  if (!a) points(gained, cx, cy);
  if (!a) {
    S.ms = S.ms || 0;
    let hitMs = 0;
    while (S.ms < MILESTONES.length && S.score >= MILESTONES[S.ms]) hitMs = MILESTONES[S.ms++];
    if (hitMs) setTimeout(() => {
      praise(hitMs.toLocaleString('en-US'), 'points!');
      const r = $('score').getBoundingClientRect();
      for (const k of [0, 2, 4]) burst(r.left + r.width / 2, r.top + r.height / 2, colorOf(k + 1), 10);
      play.allClear();
    }, L ? 900 : 200);
    if (!S.near && !S.beat && S.startBest >= 200 && S.score >= S.startBest * 0.9 && S.score < S.startBest) {
      S.near = true;
      setTimeout(() => cat('mimi', `Mew! (Only ${S.startBest - S.score} to your best! You can do it!)`, true), 600);
    }
  }

  if (!a && S.score > best) {
    best = S.score;
    localStorage.setItem(BEST, best);
    if (!S.beat && S.startBest > 0) {
      S.beat = true;
      setTimeout(() => { play.best(); praise('New Best!', ''); cat('meme', 'Mrrrow!! (New record! I demand a celebration snack.)', true); }, 500);
    }
    checkUnlock();
  }

  if (a && a.left <= 0) {
    win();
    renderAll();
    return;
  }

  let fresh = false; // not "deal": that would hide the deal() function below
  if (S.tray.every((t) => !t)) {
    fresh = true;
    S.undo.dealt = true;
    if (S.pending) { S.tray = S.pending; S.pending = null; } else { S.tray = deal(S.grid, !a); S.undoReady = true; }
    setTimeout(() => play.deal(), 150);
  }
  checkOver();
  save();
  renderAll(fresh);
}

function undo() {
  if (!S.undo || !S.undoReady || S.won || S.why === 'time') return;
  const u = S.undo;
  if (u.dealt) S.pending = S.tray.slice();
  Object.assign(S, { grid: u.grid, tray: u.tray, score: u.score, combo: u.combo, miss: u.miss });
  if (S.adv) { S.adv.left = u.left; S.adv.moves = u.moves; shown = u.left; } else shown = S.score;
  S.undo = null; S.undoReady = false; S.over = false; S.why = '';
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
    } else {
      $('over-title').textContent = S.beat ? 'New Best!' : 'No more space!';
      $('over-lbl').textContent = 'Score';
      $('over-score').textContent = S.score;
      $('over-sub').innerHTML = `👑 Best <b id="over-best">${best}</b>`;
      $('b-again').textContent = 'Play again';
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

const WIN_LINES = [
  ['meme', 'Mrrp. (I knew you could do it. I was never worried.)'],
  ['mimi', 'Mew mew! (Next one! Next one!)'],
  ['meme', 'Mrrrow. (Fine work, human. Treat?)'],
  ['mimi', 'Mrrp! (You cleared it ALL!)'],
];

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
    praise('Level Clear!', '');
    play.best();
    const [who, line] = WIN_LINES[Math.floor(Math.random() * WIN_LINES.length)];
    cat(who, line, true);
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
    $('win-msg').textContent = a.diff === 3 ? 'All 3 stars. Purrfect!'
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
  if (!a || a.time === null || !a.started || S.over || S.won || screen !== 'app' || document.hidden || !$('settings').hidden) return;
  a.time = Math.max(0, a.time - dt);
  const sec = Math.ceil(a.time);
  if (sec !== lastSec && sec <= 10 && sec > 0) play.tick();
  lastSec = sec;
  if (a.time <= 0) { drop(); S.over = true; S.why = 'time'; save(); gameOver(); }
  renderLimit();
}, 200);

// ---------------------------------------------------------------- effects
const blastLayer = $('blast');
function blast(gone, vals, cx, cy) {
  const rect = board.getBoundingClientRect();
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
    setTimeout(() => burst(rect.left + PAD + c * (cell + GAP) + cell / 2, rect.top + PAD + r * (cell + GAP) + cell / 2, color, isTarget(vals[n]) ? 12 : 7), delay + 120);
  });
}

function crack(list) {
  const rect = board.getBoundingClientRect();
  setTimeout(() => play.crack(), 120);
  for (const j of list) {
    const r = Math.floor(j / N), c = j % N;
    burst(rect.left + PAD + c * (cell + GAP) + cell / 2, rect.top + PAD + r * (cell + GAP) + cell / 2, '#c9cddb', 5);
  }
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
function burst(x, y, color, count = 7) {
  for (let i = 0; i < count; i++) {
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
  const p = S.tray[drag.i], sh = SHAPES[p.s], color = colorOf(p.k + 1);
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
    if (drag || S.over || S.won || !S.tray[i]) return;
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
  if (!pw[k]) { play.back(); cat('mimi', 'Mew? (None left! Clear golden blocks and lots of lines, or win levels, to get more.)', true); return; }
  if (k === 'bomb') {
    arm = arm ? null : 'bomb';
    play.pick();
    if (!arm && S.over) gameOver(true);
    renderHud();
    return;
  }
  spend(k);
  if (k === 'fresh') { S.tray = deal(S.grid, !S.adv); S.pending = null; play.deal(); }
  else { S.tray = S.tray.map((p) => p && { ...p, s: TURN[p.s] }); play.pick(); }
  afterPower(k === 'fresh');
}

// The bomb clears the 3×3 square around the tapped cell (stones crack, as in a line clear).
function bomb(row, col) {
  spend('bomb');
  const gone = [], vals = [], cracked = [];
  let hit = 0;
  for (let r = row - 1; r <= row + 1; r++) for (let c = col - 1; c <= col + 1; c++) {
    if (r < 0 || c < 0 || r >= N || c >= N) continue;
    const j = r * N + c, v = S.grid[j];
    if (!v) continue;
    if (v === STONE) { S.grid[j] = CRACKED; cracked.push(j); continue; }
    if (isTarget(v)) hit++;
    gone.push(j); vals.push(v); S.grid[j] = 0;
  }
  blast(gone, vals, col + 0.5, row + 0.5);
  if (cracked.length) crack(cracked);
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
    lvlCells[i].className = v ? cellClass(v).slice(2) : '';
    if (v) lvlCells[i].style.setProperty('--k', colorOf(v)); else lvlCells[i].style.removeProperty('--k');
  });
  const stones = info.grid.filter((v) => v === STONE).length;
  const limit = pick.mode === 'moves' ? `👣 ${info.moves} moves` : pick.mode === 'time' ? `⏱ ${clock(info.time)}` : '∞ No limit';
  $('lvl-info').innerHTML = `${limit} · 🎯 ${info.total} blocks${stones ? `<br><small>🪨 ${stones} stone${stones > 1 ? 's' : ''}: clear twice</small>` : ''}`;
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

const sw = { 's-sfx': 'sfx', 's-music': 'music', 's-vib': 'vib' };
document.querySelectorAll('.b-set').forEach((b) => b.addEventListener('click', () => {
  unlock(); play.tap();
  for (const [id, k] of Object.entries(sw)) $(id).checked = settings[k];
  renderThemes();
  $('settings').hidden = false;
}));
for (const [id, k] of Object.entries(sw)) {
  $(id).addEventListener('change', (e) => {
    if (k === 'music') setMusic(e.target.checked); else settings[k] = e.target.checked;
    saveSettings();
  });
}
$('b-close').addEventListener('click', () => { play.tap(); $('settings').hidden = true; });
$('b-restart').addEventListener('click', () => { $('settings').hidden = true; again(); });
document.addEventListener('pointerdown', unlock, { once: true });
document.addEventListener('visibilitychange', () => { if (document.hidden && S && !S.won) save(); });
if (location.search.includes('debug')) window.dbg = { get S() { return S; }, renderAll, checkOver, place };

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
