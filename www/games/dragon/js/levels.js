// Endless levels, generated from the level number. Moves are balanced by letting a greedy AI play
// each level a few times (see simulate) and giving the player a bit more than the AI needed.
import { W, H, createState, clone, listMoves, swap, tap, run, goalsDone, idx } from './engine.js';

export const isHard = (n) => n >= 10 && n % 10 === 0;
export const isTricky = (n) => n > 10 && n % 10 === 5;
/** The level right after a hard one is an easy breather. */
export const isBreather = (n) => n > 10 && n % 10 === 1;
/** Most moves a level can give (raised from 45 so hard levels can ask for more). */
export const MAX_MOVES = 60;
/** New obstacles and the level where each first appears (one at a time). */
export const INTRO = { chain: 16, grass: 22, honey: 26 };

export function rngFrom(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const int = (rng, n) => Math.floor(rng() * n);
const pick = (rng, a) => a[int(rng, a.length)];

// Board shapes: playable rows per column (top..bot). An empty column has top > bot.
const SHAPES = [
  { name: 'square', top: [1, 1, 1, 1, 1, 1, 1, 1], bot: [8, 8, 8, 8, 8, 8, 8, 8] },
  { name: 'full', top: [0, 0, 0, 0, 0, 0, 0, 0], bot: [8, 8, 8, 8, 8, 8, 8, 8] },
  { name: 'round', top: [1, 0, 0, 0, 0, 0, 0, 1], bot: [7, 8, 8, 8, 8, 8, 8, 7] },
  { name: 'shield', top: [0, 0, 0, 0, 0, 0, 0, 0], bot: [5, 6, 7, 8, 8, 7, 6, 5] },
  { name: 'tower', top: [3, 2, 0, 0, 0, 0, 2, 3], bot: [8, 8, 8, 8, 8, 8, 8, 8] },
  { name: 'gem', top: [2, 1, 0, 0, 0, 0, 1, 2], bot: [6, 7, 8, 8, 8, 8, 7, 6] },
  { name: 'narrow', top: [9, 0, 0, 0, 0, 0, 0, 9], bot: [-1, 8, 8, 8, 8, 8, 8, -1] },
  { name: 'wings', top: [0, 0, 1, 2, 2, 1, 0, 0], bot: [6, 7, 8, 8, 8, 8, 7, 6] },
  { name: 'castle', top: [0, 1, 0, 1, 1, 0, 1, 0], bot: [8, 8, 8, 8, 8, 8, 8, 8] },
];

// Mirrored placement helper: adds (r,c) and its mirror (r, W-1-c).
function mirrorAdd(set, r, c) { set.add(idx(r, c)); set.add(idx(r, W - 1 - c)); }
const ok = (sh, r, c) => c >= 0 && c < W && r >= sh.top[c] && r <= sh.bot[c];

function boxPattern(rng, sh, want) {
  const s = new Set(), kind = int(rng, 4);
  const rows = (r0, n) => { for (let r = r0; r < r0 + n; r++) for (let c = 0; c < 4; c++) if (ok(sh, r, c)) mirrorAdd(s, r, c); };
  if (kind === 0) rows(8 - Math.max(1, Math.round(want / 8)) + 1, Math.max(1, Math.round(want / 8))); // bottom band
  else if (kind === 1) { // pillars
    for (const c of [0, 3]) for (let r = 8; r >= 3 && s.size < want; r--) if (ok(sh, r, c)) mirrorAdd(s, r, c);
  } else if (kind === 2) { // 2×2 clusters
    for (const [r0, c0] of [[6, 0], [6, 2], [3, 1], [3, 3], [7, 3]]) {
      if (s.size >= want) break;
      for (const [dr, dc] of [[0, 0], [0, 1], [1, 0], [1, 1]]) if (ok(sh, r0 + dr, c0 + dc) && c0 + dc < 4) mirrorAdd(s, r0 + dr, c0 + dc);
    }
  } else { // middle belt
    rows(4, Math.max(1, Math.round(want / 8)));
  }
  // Trim to roughly the wanted count (keeping mirror pairs).
  const cells = [...s].filter((i) => Math.floor(i / W) >= 2 && Math.floor(i / W) >= sh.top[i % W] + 2);
  const left = cells.filter((i) => i % W < 4).slice(0, Math.ceil(want / 2));
  const out = new Set();
  for (const i of left) { out.add(i); out.add(Math.floor(i / W) * W + (W - 1 - (i % W))); }
  return [...out];
}

// Chains: gems in the middle rows, never on the top row (it would block the column) or the bottom row.
// Chained gems don't fall, so they sit on a checker pattern (never one above another) and keep away from
// boxes and honey: that way gems can always slide in diagonally and no part of the board gets walled off.
function chainPattern(rng, sh, want, taken) {
  const kind = int(rng, 3), all = [];
  const near = (r, c) => [[0, 0], [0, 1], [1, 0], [0, -1], [-1, 0]].some(([dr, dc]) => taken.has(idx(r + dr, c + dc)) || taken.has(idx(r + dr, W - 1 - c - dc)));
  for (let r = 0; r < H; r++) for (let c = 0; c < 4; c++) {
    if (!ok(sh, r, c) || r < sh.top[c] + 1 || r >= sh.bot[c] || near(r, c)) continue;
    if ((r + c) % 2 !== (kind === 1 ? 1 : 0)) continue; // checkers
    if (kind === 2 && r % 2) continue; // sparse: every other row only
    all.push([r, c]);
  }
  all.sort(() => rng() - 0.5);
  const s = new Set();
  for (const [r, c] of all) { if (s.size >= want) break; mirrorAdd(s, r, c); }
  return [...s];
}

// Grass: a small starting patch at the bottom or in the middle.
function grassPattern(rng, sh, want, taken) {
  const mid = rng() < 0.5, s = new Set();
  const all = [];
  for (let r = 0; r < H; r++) for (let c = 0; c < 4; c++) if (ok(sh, r, c) && !taken.has(idx(r, c))) all.push([r, c]);
  all.sort((a, b) => (mid ? Math.abs(a[0] - 4.5) - Math.abs(b[0] - 4.5) : b[0] - a[0]) || b[1] - a[1]);
  for (const [r, c] of all) { if (s.size >= want) break; mirrorAdd(s, r, c); }
  return [...s];
}

// Honey: one or two clumps, away from the top rows.
function honeyPattern(rng, sh, want, taken) {
  const s = new Set();
  const r0 = 4 + int(rng, 3), c0 = int(rng, 3);
  const cand = [];
  for (let r = 0; r < H; r++) for (let c = 0; c < 4; c++) {
    if (!ok(sh, r, c) || r < sh.top[c] + 2 || taken.has(idx(r, c)) || taken.has(idx(r, W - 1 - c))) continue;
    cand.push([r, c, Math.abs(r - r0) + Math.abs(c - c0)]);
  }
  cand.sort((a, b) => a[2] - b[2]);
  for (const [r, c] of cand) { if (s.size >= want) break; mirrorAdd(s, r, c); }
  return [...s];
}

function icePattern(rng, sh, want, avoid) {
  const s = new Set(), kind = int(rng, 3);
  const all = [];
  for (let r = 0; r < H; r++) for (let c = 0; c < 4; c++) if (ok(sh, r, c)) all.push([r, c]);
  let cand;
  if (kind === 0) cand = all.sort((a, b) => b[0] - a[0]); // from the bottom up
  else if (kind === 1) cand = all.sort((a, b) => (Math.abs(a[0] - 4.5) + (3 - a[1])) - (Math.abs(b[0] - 4.5) + (3 - b[1]))); // centre out
  else cand = all.filter(([r, c]) => (r + c) % 2 === 0).sort((a, b) => b[0] - a[0]); // checkers
  for (const [r, c] of cand) { if (s.size >= want) break; if (!avoid.has(idx(r, c)) || rng() < 0.5) mirrorAdd(s, r, c); }
  return [...s];
}

/** The level layout for level n (variant > 0 = easier re-roll if the first try was too hard). */
export function makeLevel(n, variant = 0) {
  const rng = rngFrom(n * 7919 + variant * 104729 + 13);
  const hard = isHard(n), tricky = isTricky(n), breather = isBreather(n);
  const ramp = Math.min(1, (n - 1) / 60) * (1 - variant * 0.25); // 0 → 1 over the first 60 levels
  let sh;
  if (n <= 3) sh = SHAPES[0];
  else sh = pick(rng, n < 10 ? SHAPES.slice(0, 3) : SHAPES);
  const colors = n <= 12 ? 4 : (hard || rng() < 0.75 ? 5 : 4);

  // Which goals? Introduce one new obstacle at a time, then mix.
  let types;
  if (n <= 3) types = ['gem'];
  else if (n <= 6) types = ['box'];
  else if (n === 7) types = ['gem', 'box'];
  else if (n <= 10) types = ['ice'];
  else if (n === 11) types = ['ice', 'box'];
  else if (n <= 14) types = ['egg'];
  else if (n >= INTRO.chain && n <= INTRO.chain + 2) types = ['chain'];
  else if (n === INTRO.chain + 3) types = ['chain', 'gem'];
  else if (n >= INTRO.grass && n <= INTRO.grass + 2) types = ['grass'];
  else if (n >= INTRO.honey && n <= INTRO.honey + 2) types = ['honey'];
  else if (n === INTRO.honey + 3) types = ['honey', 'gem'];
  else {
    const pool = ['gem', 'box', 'ice', 'egg', ...Object.keys(INTRO).filter((t) => n >= INTRO[t])];
    // Hard levels mix two or three obstacles; a breather has just one.
    const k = breather ? 1 : hard ? 2 + (n > 25 && rng() < 0.6 ? 1 : 0)
      : 1 + (rng() < 0.55 ? 1 : 0) + (tricky && n > 25 && rng() < 0.5 ? 1 : 0);
    types = [];
    while (types.length < k) {
      const t = pick(rng, pool);
      if (types.includes(t) || (t === 'grass' && types.includes('ice')) || (t === 'ice' && types.includes('grass'))) continue;
      types.push(t);
    }
  }
  if (types.includes('egg') && types.includes('box') && sh.name === 'narrow') sh = SHAPES[1];

  const L = { n, hard, tricky, breather, top: sh.top, bot: sh.bot, shape: sh.name, colors, goals: [], boxes: [], ice: [], eggs: [], chains: [], grass: [], honey: [] };
  const boost = hard ? 1.55 : tricky ? 1.15 : breather ? 0.7 : 1;
  let boxCells = new Set();
  if (types.includes('box')) {
    const want = Math.round((10 + ramp * 14) * boost);
    const cells = boxPattern(rng, sh, want);
    const maxHp = n < 20 ? 1 : n < 40 ? 2 : 3;
    for (const i of cells) {
      const r = Math.floor(i / W);
      const hp = Math.max(1, Math.min(maxHp, 1 + Math.floor(rng() * maxHp * (0.5 + ramp)) - (r < 4 ? 1 : 0)));
      L.boxes.push([r, i % W, hp]);
      boxCells.add(i);
    }
    // Mirror cells get the same hp so it looks tidy.
    const hpAt = new Map(L.boxes.map(([r, c, hp]) => [idx(r, c), hp]));
    L.boxes = L.boxes.map(([r, c]) => [r, c, hpAt.get(idx(r, Math.min(c, W - 1 - c)))]);
    if (L.boxes.length) L.goals.push({ t: 'box', n: L.boxes.length });
  }
  if (types.includes('ice')) {
    const want = Math.round((16 + ramp * 26) * boost);
    L.ice = icePattern(rng, sh, want, boxCells).map((i) => [Math.floor(i / W), i % W]);
    if (L.ice.length) L.goals.push({ t: 'ice', n: L.ice.length });
  }
  if (types.includes('egg')) {
    const total = Math.round((2 + ramp * 3) * boost);
    const cols = [...Array(W).keys()].filter((c) => sh.top[c] <= sh.bot[c] && !boxCells.has(idx(sh.top[c], c)));
    const start = Math.min(2, total);
    for (let k = 0; k < start; k++) {
      const c = cols.splice(int(rng, cols.length), 1)[0];
      let r = sh.top[c] + 2;
      while (r > sh.top[c] && boxCells.has(idx(r, c))) r--;
      L.eggs.push([r, c]);
    }
    L.goals.push({ t: 'egg', n: total });
  }
  const taken = new Set([...boxCells, ...L.eggs.map(([r, c]) => idx(r, c))]);
  const cellsOf = (list) => list.map((i) => [Math.floor(i / W), i % W]);
  if (types.includes('honey')) {
    const want = Math.round((6 + ramp * 8) * boost);
    L.honey = cellsOf(honeyPattern(rng, sh, want, taken));
    L.honey.forEach(([r, c]) => taken.add(idx(r, c)));
    if (L.honey.length) L.goals.push({ t: 'honey', n: L.honey.length });
  }
  if (types.includes('chain')) {
    const want = Math.round((8 + ramp * 10) * boost);
    L.chains = cellsOf(chainPattern(rng, sh, want, new Set([...taken, ...L.ice.map(([r, c]) => idx(r, c))])));
    if (L.chains.length < 4) L.chains = []; // too few to be a goal
    else L.goals.push({ t: 'chain', n: L.chains.length });
  }
  if (types.includes('grass')) {
    L.grass = cellsOf(grassPattern(rng, sh, 4, taken));
    let free = 0;
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (ok(sh, r, c)) free++;
    free -= L.grass.length;
    const share = Math.min(1, (0.45 + ramp * 0.3) * boost);
    L.goals.push({ t: 'grass', n: Math.max(8, Math.round((free * share) / 2) * 2) });
  }
  if (types.includes('gem') || !L.goals.length) {
    const nGem = n > 20 && rng() < 0.4 ? 2 : 1;
    const cs = [...Array(colors).keys()].sort(() => rng() - 0.5).slice(0, nGem);
    for (const c of cs) L.goals.push({ t: 'gem', c, n: Math.round(((22 + ramp * 30) * boost) / nGem / 5) * 5 + (nGem === 2 ? 5 : 0) });
  }
  L.seed = (n * 2654435761) | 0;
  return L;
}

// ---------------------------------------------------------------- simulator
// How good a position is for the AI. Every obstacle must count here, or the AI wanders until the move cap
// and the level silently re-rolls easier.
function progress(S) {
  let p = 0;
  for (const g of S.goals) p += ((g.n - g.left) * 30) / Math.max(1, g.n); // honey: left grows when it spreads
  for (let i = 0; i < S.tiles.length; i++) {
    const t = S.tiles[i];
    if (!t) continue;
    if (t.t === 'egg') p += Math.floor(i / W) * 2.5; // eggs lower down are closer to the bottom
    else if (t.t === 'honey') p -= 2; // every honey cell left is a risk (it spreads)
    else if (t.lock) p -= 1; // chained gems also block the column under them
  }
  if (S.goals.some((g) => g.t === 'grass' && g.left > 0)) for (let i = 0; i < S.grass.length; i++) if (S.grass[i]) p += 0.5;
  for (const t of S.tiles) if (t && ['rh', 'rv', 'bomb', 'prop', 'light'].includes(t.t)) p += t.t === 'light' ? 3 : 1.5;
  return p;
}

/** Greedy AI: plays the level by always taking the move with the most goal progress. Returns moves used (or cap). */
export function simulate(L, seed, cap = 70) {
  let S = createState({ ...L, moves: cap }, seed);
  const rng = rngFrom(seed ^ 0x5bd1e995);
  let used = 0;
  while (!S.won && used < cap) {
    const moves = listMoves(S);
    if (!moves.length) break;
    let best = null, bestScore = -Infinity;
    const base = progress(S);
    for (const m of moves) {
      // Judge a move only by what a player can see: its first match/blast, not the cascades after it.
      const T = clone(S), g = m.tap !== undefined ? tap(T, m.tap) : swap(T, m.a, m.b);
      let r;
      do r = g.next(); while (!r.done && r.value.type !== 'fall' && r.value.type !== 'swapback');
      if (r.value && r.value.type === 'swapback') continue;
      const s = progress(T) - base + rng() * 2;
      if (s > bestScore) { bestScore = s; best = m; }
    }
    if (best) run(best.tap !== undefined ? tap(S, best.tap) : swap(S, best.a, best.b));
    if (!best) break;
    used++;
    S.moves = cap; S.lost = false; // the sim never runs out of moves; we count them instead
    if (goalsDone(S)) break;
  }
  return goalsDone(S) ? used : cap;
}

/** Full level with balanced moves. */
export function levelFor(n, cache) {
  if (cache && cache[n]) return { ...makeLevel(n, cache[n].v), moves: cache[n].m };
  let L, med;
  for (let v = 0; v < 4; v++) {
    L = makeLevel(n, v);
    // The greedy AI varies a lot from game to game, so take a high pick of 7 tries (6th best).
    const runs = [1, 2, 3, 4, 5, 6, 7].map((k) => simulate(L, L.seed + k * 977)).sort((a, b) => a - b);
    med = runs[5];
    if (med < (L.hard ? 56 : 45)) { L.v = v; break; }
    L.v = v;
  }
  const f = Math.max(1.12, 1.7 - n * 0.012) * (L.hard ? 0.9 : L.tricky ? 0.95 : L.breather ? 1.25 : 1);
  L.moves = Math.max(10, Math.min(MAX_MOVES, Math.round(med * f + 2)));
  if (cache) cache[n] = { v: L.v, m: L.moves };
  return L;
}
