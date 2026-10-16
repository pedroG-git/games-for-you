// Adventures levels: endless, generated from (mode, level number), balanced by letting a simple AI play them.
import { N, SHAPES, fits, dealTray, clearLines, fullLines, isTarget, STONE } from './pieces.js';

export const MODES = ['time', 'moves', 'relaxed'];
export const DIFFS = [null,
  { name: 'Easy', help: 0.5, stone: 0.5, mv: [1.6, 4], tm: [9, 25] },
  { name: 'Normal', help: 0.2, stone: 1, mv: [1.3, 2], tm: [7, 12] },
  { name: 'Hard', help: 0, stone: 1.6, mv: [1.1, 1], tm: [5, 6] },
];
export const WORLDS = [
  { name: 'Garden', deco: ['🌷', '🌻', '🦋', '🍀', '🐝'], bg: ['#7fd67a', '#3e9e55'] },
  { name: 'Beach', deco: ['🐚', '🌴', '🦀', '⛱️', '🐠'], bg: ['#ffe2a1', '#3fc0d8'] },
  { name: 'Snow', deco: ['❄️', '⛄', '🌲', '🧣', '🐧'], bg: ['#eef6ff', '#8fb6e8'] },
  { name: 'Candy', deco: ['🍭', '🍬', '🧁', '🍩', '🍓'], bg: ['#ffc4e1', '#d36bb0'] },
  { name: 'Space', deco: ['🪐', '⭐', '🚀', '🌙', '👽'], bg: ['#5a3aa8', '#160d3a'] },
];
export const worldOf = (n) => WORLDS[Math.floor((n - 1) / 10) % WORLDS.length];

export function rngFrom(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const int = (rng, n) => Math.floor(rng() * n);

// ---------------------------------------------------------------- pictures (r o y g c b p = colours)
const PICS = [
  ['.rr.rr.', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'], // heart
  ['.r.r.', 'rrrrr', '.rrr.', '..r..'], // small heart
  ['o.....o', 'oo...oo', 'ooooooo', 'og.o.go', 'ooopooo', '.ooooo.'], // cat face
  ['...c...', '..ccc..', '.ccccc.', '..ccc..', '...c...'], // diamond
  ['..gg..', '..gg..', 'gggggg', 'gggggg', '..gg..', '..gg..'], // plus
  ['bbbbbb', 'b....b', 'b....b', 'b....b', 'b....b', 'bbbbbb'], // frame
  ['p.....p', '.p...p.', '..p.p..', '...p...', '..p.p..', '.p...p.', 'p.....p'], // X
  ['o...o...', '.o...o..', '..o...o.', '...o...o', 'o...o...', '.o...o..'], // stripes
  ['r.o.y.g', '.c.b.p.', 'r.o.y.g', '.c.b.p.'], // confetti
  ['..p.p..', '.ppppp.', '..pyp..', '.ppppp.', '..p.p..', '...g...', '..ggg..'], // flower
  ['..rrr..', '.rryrr.', 'rrrrrrr', '...o...', '..ooo..'], // mushroom
  ['...g...', '..ggg..', '.ggggg.', '...g...', '...g...', '...g...'], // arrow
  ['..bbbbb', '.....b.', '.....b.', '.....b.', '.b...b.', '..bbb..'], // J
  ['...g...', '..ggg..', '.ggggg.', '..ggg..', '.ggggg.', '...o...', '...o...'], // tree
  ['yyy', '.y.'], // T
  ['cc..cc', 'cc..cc', '......', 'cc..cc', 'cc..cc'], // four squares
  ['y..y', '.yy.', '.yy.', 'y..y'], // little X
  ['bb', 'bb', '..', 'rr', 'rr'], // two blocks
].map((rows) => {
  const cells = [];
  rows.forEach((row, r) => [...row].forEach((ch, c) => { const k = 'roygcbp'.indexOf(ch); if (k >= 0) cells.push([r, c, k]); }));
  return { cells, h: rows.length, w: Math.max(...rows.map((x) => x.length)) };
});

function picture(rng, want) {
  const near = PICS.slice().sort((a, b) => Math.abs(a.cells.length - want) - Math.abs(b.cells.length - want)).slice(0, 3);
  const p = near[int(rng, near.length)], flip = rng() < 0.5;
  const g = Array(N * N).fill(0), dr = int(rng, N - p.h + 1), dc = int(rng, N - p.w + 1);
  for (const [r, c, k] of p.cells) g[(r + dr) * N + dc + (flip ? p.w - 1 - c : c)] = 11 + k;
  return g;
}

// Mirror-symmetric blob grown from a random cell.
function symmetric(rng, want) {
  const g = Array(N * N).fill(0), pal = [int(rng, 7), int(rng, 7), int(rng, 7)];
  const add = (r, c) => { const k = 11 + pal[(r >> 1) % 3]; g[r * N + c] = k; g[r * N + N - 1 - c] = k; };
  add(int(rng, N), int(rng, 4));
  for (let i = 0, n = 2; n < want && i < 400; i++) {
    const own = []; for (let j = 0; j < N * N; j++) if (g[j] && j % N < 4) own.push(j);
    const j = own[int(rng, own.length)], [dr, dc] = [[0, 1], [0, -1], [1, 0], [-1, 0]][int(rng, 4)];
    const r = Math.floor(j / N) + dr, c = (j % N) + dc;
    if (r < 0 || r >= N || c < 0 || c > 3 || g[r * N + c]) continue;
    add(r, c); n += 2;
  }
  return g;
}

// Looks like a half-played board: random pieces dropped around.
function stamps(rng, want) {
  const g = Array(N * N).fill(0), small = SHAPES.map((_, i) => i).filter((i) => SHAPES[i].cells.length <= 5);
  for (let i = 0, n = 0; n < want && i < 300; i++) {
    const s = small[int(rng, small.length)], r = int(rng, N), c = int(rng, N);
    if (!fits(g, s, r, c)) continue;
    const k = 11 + int(rng, 7);
    for (const [y, x] of SHAPES[s].cells) g[(r + y) * N + c + x] = k;
    n += SHAPES[s].cells.length;
  }
  return g;
}

// A full row/column would vanish on the first move: knock a cell out of it.
function strip(g, rng) {
  for (;;) {
    const { rows, cols } = fullLines(g);
    if (rows.length) g[rows[0] * N + int(rng, N)] = 0;
    else if (cols.length) g[int(rng, N) * N + cols[0]] = 0;
    else return g;
  }
}

function pattern(rng, n) {
  const boss = n % 10 === 0;
  const want = Math.max(4, Math.round(5 + 15 * (1 - Math.exp(-(n - 1) / 25)) + rng() * 4 - 2 + (boss ? 4 : 0)));
  const x = rng();
  const g = boss || x < 0.4 ? picture(rng, want) : x < 0.75 ? symmetric(rng, want) : stamps(rng, want);
  return strip(g, rng);
}

// ---------------------------------------------------------------- stones
function stoneCount(n, total, diff) {
  const base = n < 6 ? 0 : Math.min(Math.floor(total * 0.3), Math.floor((n - 1) / 5));
  const k = diff === 3 ? Math.round(base * 1.6) + (n >= 3 ? 1 : 0) : Math.floor(base * DIFFS[diff].stone);
  return Math.min(k, Math.floor(total / 2));
}
function withStones(lvl, n, diff) {
  const g = lvl.grid.slice();
  lvl.order.slice(0, stoneCount(n, lvl.order.length, diff)).forEach((j) => { g[j] = STONE; });
  return g;
}

// ---------------------------------------------------------------- the AI
function evaluate(g, res) {
  // Reward progress on targets and clears; keep the board tidy (few cells, few edges, no holes).
  let s = res.hit * 100 + res.cracked.length * 45 + res.L * 30, filled = 0, edges = 0, near = 0;
  for (let a = 0; a < N; a++) {
    let pr = 1, pc = 1, fr = 0, fc = 0, tr = 0, tc = 0;
    for (let b = 0; b < N; b++) {
      const v = g[a * N + b] ? 1 : 0, w = g[b * N + a] ? 1 : 0;
      if (v !== pr) edges++; if (w !== pc) edges++;
      pr = v; pc = w; fr += v; fc += w; filled += v;
      if (isTarget(g[a * N + b])) tr++; if (isTarget(g[b * N + a])) tc++;
    }
    if (!pr) edges++; if (!pc) edges++;
    if (tr && fr >= 5) near += fr - 4;
    if (tc && fc >= 5) near += fc - 4;
  }
  s += near * 3 - filled * 2 - edges * 2.5;
  for (let j = 0; j < N * N; j++) {
    if (g[j]) continue;
    const r = Math.floor(j / N), c = j % N;
    if ((r === 0 || g[j - N]) && (r === N - 1 || g[j + N]) && (c === 0 || g[j - 1]) && (c === N - 1 || g[j + 1])) s -= 10;
  }
  return s;
}

// Greedy play; returns moves needed to clear every target, or Infinity.
function simulate(start, rng, help, cap = 120) {
  const grid = start.slice();
  let left = grid.filter(isTarget).length, tray = dealTray(grid, rng, help);
  for (let moves = 1; moves <= cap; moves++) {
    let best = null;
    tray.forEach((p, i) => {
      if (!p) return;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        if (!fits(grid, p.s, r, c)) continue;
        const g = grid.slice();
        for (const [y, x] of SHAPES[p.s].cells) g[(r + y) * N + c + x] = 1;
        const res = clearLines(g), v = evaluate(g, res) + rng() * 3;
        if (!best || v > best.v) best = { v, i, g, hit: res.hit };
      }
    });
    if (!best) return Infinity;
    for (let j = 0; j < N * N; j++) grid[j] = best.g[j];
    tray[best.i] = null;
    if ((left -= best.hit) <= 0) return moves;
    if (tray.every((t) => !t)) tray = dealTray(grid, rng, help);
  }
  return Infinity;
}

// ---------------------------------------------------------------- public
const seedOf = (mode, n, v) => (MODES.indexOf(mode) + 1) * 1000003 + n * 7919 + v * 104729;
const cache = new Map();

// Pattern for a level: tries variants until the AI reliably beats it on Normal (keeps the best one).
function level(mode, n) {
  const key = mode + n;
  if (cache.has(key)) return cache.get(key);
  let best = null;
  for (let v = 0; v < 8; v++) {
    const rng = rngFrom(seedOf(mode, n, v)), grid = pattern(rng, n);
    const order = []; grid.forEach((x, j) => { if (x) order.push(j); });
    order.sort(() => rng() - 0.5);
    const lvl = { grid, order }, test = withStones(lvl, n, 2);
    let fails = 0;
    for (let i = 0; i < 6; i++) if (!isFinite(simulate(test, rngFrom(seedOf(mode, n, v) + i), 0.2))) fails++;
    if (!best || fails < best.fails) best = { lvl, fails };
    if (fails === 0) break;
  }
  cache.set(key, best.lvl);
  return best.lvl;
}

// Everything needed to play level n of a mode on a difficulty (1–3).
export function levelInfo(mode, n, diff) {
  const key = `${mode}${n}d${diff}`;
  if (cache.has(key)) return cache.get(key);
  const lvl = level(mode, n), grid = withStones(lvl, n, diff), D = DIFFS[diff];
  const runs = [];
  for (let i = 0; i < 9; i++) runs.push(simulate(grid, rngFrom(seedOf(mode, n, 50 + diff * 10 + i)), D.help));
  runs.sort((a, b) => a - b);
  const est = Math.min(isFinite(runs[4]) ? runs[4] : runs.filter(isFinite).pop() || 40, 60);
  const info = {
    grid,
    total: grid.filter(isTarget).length,
    moves: Math.ceil(est * D.mv[0]) + D.mv[1],
    time: Math.ceil((est * D.tm[0] + D.tm[1]) / 5) * 5,
  };
  if (diff === 1) { // Easy never gets less than Normal
    const nrm = levelInfo(mode, n, 2);
    info.moves = Math.max(info.moves, nrm.moves + 3);
    info.time = Math.max(info.time, nrm.time + 15);
  }
  cache.set(key, info);
  return info;
}

export const _test = { simulate, rngFrom, level, withStones, DIFFS };
