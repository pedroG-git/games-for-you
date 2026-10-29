// Endless levels, made from the level number (same number = same shelf). Every level is played by the solver in
// engine.js before it is shown: its shortest win sets the move or time limit, and the share of greedy tries that
// win within that limit has to stay in the band for the level's difficulty — so every level can be won.
import { rng, shuffle, solve, clone, T, KEY, GLUE, MYST } from './engine.js';
import { TYPES } from './items.js';

export const isBreather = (n) => n > 5 && n % 5 === 0;
export const isHard = (n) => n > 8 && n % 10 === 9;

// What a level number asks for. `d` is the "effective" level: breathers step back, hard levels step forward.
// Slow ramp: 1-10 easy (learn), 11-30 gentle growth, real challenge after ~30. Specials arrive one at a time:
// locks ~8, keys ~12, ice ~15, glue ~22, mystery ~30.
export function params(n, daily = false) {
  const d = daily ? 40 + (n % 20) : isBreather(n) ? Math.max(1, Math.round(n * 0.65) - 2) : isHard(n) ? n + 6 : n;
  const step = (list) => list.find(([at]) => d <= at)?.[1] ?? list[list.length - 1][1];
  const since = (from, every, base, max) => (d < from ? 0 : Math.min(max, base + Math.floor((d - from) / every)));
  return {
    d,
    V: step([[2, 2], [6, 3], [18, 4], [45, 5], [Infinity, 6]]),
    hidden: step([[4, 0], [12, 1], [32, 2], [Infinity, 3]]),
    layers: step([[5, 0], [14, 1], [35, 2], [Infinity, 3]]),
    groups: Math.min(36, Math.round(4 + d * 0.6)), // size cap: triples on the shelf
    holes: step([[4, 6], [20, 6], [40, 5], [Infinity, 4]]), // free front slots at the start
    backHoles: step([[10, 0.25], [30, 0.18], [Infinity, 0.12]]),
    variety: step([[3, 1], [12, 0.75], [30, 0.8], [60, 0.9], [Infinity, 1]]), // distinct types per triple
    mode: daily ? (n % 2 ? 'time' : 'moves') : n <= 3 ? 'moves' : n % 3 === 2 ? 'time' : 'moves',
    slack: step([[8, 2.4], [20, 2], [35, 1.7], [60, 1.5], [Infinity, 1.4]]),
    secPer: step([[10, 4.5], [25, 4], [40, 3.5], [60, 3.1], [Infinity, 2.8]]),
    minRate: step([[8, 0.65], [20, 0.5], [30, 0.35], [45, 0.22], [Infinity, 0.12]]),
    locks: since(8, 14, 1, 3),
    keys: d < 12 ? 0 : 1,
    ice: since(15, 12, 2, 6),
    glue: since(22, 12, 1, 5),
    myst: since(30, 12, 2, 6),
    orders: d <= 10 ? 99 : Math.min(6, 2 + Math.floor(d / 14)),
  };
}

export const levelFor = (n) => build(n, params(n), n * 7919 + 13);
export const dailyFor = (key) => {
  const num = Number(String(key).replace(/-/g, ''));
  return Object.assign(build(num, params(num, true), num * 31 + 7), { daily: true });
};

const countGroups = (st) => {
  let k = 0;
  for (const col of st.cols) for (const b of col) { for (const x of b.s) if (x) k++; for (const l of b.L) for (const x of l) if (x) k++; }
  return k / 3;
};

function build(n, P, seed0, relax = 0) {
  let fallback = null;
  const bonus = isBreather(n) ? 0.15 : 0;
  for (let attempt = 0; attempt < 9; attempt++) {
    const rand = rng(seed0 + attempt * 104729);
    const st = makeShelf(P, rand);
    if (!st) continue;
    const g = countGroups(st), cap = Math.min(300, Math.ceil(g * 4) + 20);
    const { best } = solve(st, { tries: 6, seed: seed0 + attempt, limit: cap });
    if (!best || best.length > g * 3 + 8) continue; // unwinnable, or a silly marathon
    const par = best.length;
    const moveLimit = Math.ceil(par * P.slack) + 2;
    const { rate } = solve(st, { tries: 10, seed: seed0 + attempt + 99, limit: moveLimit, noise: 40 });
    const L = { n, V: st.V, cols: st.cols, orders: st.orders, nextId: st.nextId, matches: 0, mode: P.mode, par, rate, hard: isHard(n), breather: isBreather(n), sol: best };
    L.limit = P.mode === 'time' ? Math.ceil((par * P.secPer + 15) / 5) * 5 : moveLimit;
    if (rate >= P.minRate + bonus) return L;
    if (!fallback || rate > fallback.rate) fallback = L;
  }
  if (fallback) return fallback;
  // nothing solvable: ease the shelf step by step (fewer specials, more free slots), last of all a small plain one
  const easier = relax === 0 ? Object.assign({}, P, { holes: P.holes + 1, ice: Math.ceil(P.ice / 2), glue: Math.ceil(P.glue / 2), myst: Math.ceil(P.myst / 2), locks: Math.min(P.locks, 1) })
    : relax === 1 ? Object.assign({}, P, { holes: P.holes + 2, ice: 0, glue: 0, myst: 0, locks: 0, keys: 0, groups: Math.ceil(P.groups * 0.7) })
    : Object.assign({}, P, { holes: 6, hidden: 0, layers: 0, ice: 0, glue: 0, myst: 0, locks: 0, keys: 0, groups: 4, V: 3 });
  return build(n, easier, seed0 + 1, relax + 1);
}

// A random shelf for the parameters (not yet checked).
function makeShelf(P, rand) {
  const rows = P.V + P.hidden;
  let id = 1;
  const cols = [[], [], []];
  for (let c = 0; c < 3; c++) for (let r = 0; r < rows; r++) {
    const depth = P.layers ? Math.floor(rand() * (P.layers + 1) * 0.999) : 0;
    cols[c].push({ id: id++, s: [0, 0, 0], L: Array.from({ length: depth }, () => [0, 0, 0]), lock: 0 });
  }
  // size cap: drop back layers, then hidden cubbies, until the shelf is about `groups` triples
  const slotsOf = () => cols.reduce((t, col) => t + col.reduce((u, b) => u + 3 * (1 + b.L.length), 0), 0);
  const target = 3 * P.groups + P.holes + 2;
  while (slotsOf() > target) {
    const withL = cols.flatMap((col) => col.filter((b) => b.L.length));
    if (withL.length) { withL[Math.floor(rand() * withL.length)].L.pop(); continue; }
    const tall = cols.filter((col) => col.length > Math.max(2, P.V));
    if (!tall.length) break;
    tall[Math.floor(rand() * tall.length)].pop();
  }
  // locked cubbies (never in the bottom row, so the start always has room to play)
  const lockable = [];
  for (let c = 0; c < 3; c++) for (let r = 1; r < cols[c].length; r++) lockable.push(cols[c][r]);
  for (const b of shuffle(rand, lockable).slice(0, P.locks)) b.lock = 2 + Math.floor(rand() * 4);

  // every slot, front ones of unlocked cubbies on screen first in line for the starting holes
  const front = [], back = [];
  for (let c = 0; c < 3; c++) for (let r = 0; r < cols[c].length; r++) {
    const b = cols[c][r];
    for (let i = 0; i < 3; i++) ((r < P.V && !b.lock) ? front : back).push([b.s, i]);
    for (const l of b.L) for (let i = 0; i < 3; i++) back.push([l, i]);
  }
  shuffle(rand, front);
  const holes = new Set(front.slice(0, P.holes));
  const filled = front.slice(P.holes);
  for (const s of shuffle(rand, back)) {
    // locked fronts stay full; other back slots may be empty sometimes
    const lockedFront = cols.some((col) => col.some((b) => b.lock && b.s === s[0]));
    if (!lockedFront && rand() < P.backHoles) holes.add(s); else filled.push(s);
  }
  // keys take a slot of their own (not on screen at the start, so finding it is part of the fun)
  const keySlots = [];
  if (P.locks) for (let k = 0; k < P.keys; k++) {
    const i = filled.findIndex((s) => back.includes(s) && !cols.some((col) => col.some((b) => b.lock && b.s === s[0])));
    if (i >= 0) keySlots.push(filled.splice(i, 1)[0]);
  }
  while (filled.length % 3) holes.add(filled.pop());
  const groups = filled.length / 3;
  if (groups < 2) return null;

  // types: some appear 3 times, some 6 times
  const kinds = Math.max(2, Math.min(TYPES.length, Math.round(groups * P.variety)));
  const pool = shuffle(rand, TYPES.map((_, i) => i + 1)).slice(0, kinds);
  const items = [];
  for (let g = 0; g < groups; g++) { const t = pool[g % kinds]; items.push(t, t, t); }
  shuffle(rand, items);
  filled.forEach(([arr, i], k) => { arr[i] = items[k]; });
  for (const [arr, i] of keySlots) arr[i] = KEY;
  for (const [arr, i] of holes) arr[i] = 0;

  // no ready-made triples, and no layer left completely empty
  const all = [];
  for (const col of cols) for (const b of col) { all.push(b.s); all.push(...b.L); }
  for (let pass = 0; pass < 20; pass++) {
    let bad = false;
    for (const a of all) {
      if (a[0] && a[0] === a[1] && a[1] === a[2]) {
        bad = true;
        const o = all[Math.floor(rand() * all.length)], j = Math.floor(rand() * 3);
        if (o[j] && o !== a) [a[0], o[j]] = [o[j], a[0]];
      }
    }
    if (!bad) break;
  }
  for (const col of cols) for (const b of col) b.L = b.L.filter((l) => l.some((x) => x));
  for (const col of cols) for (const b of col) if (!b.s.some((x) => x) && b.L.length) b.s = b.L.shift();

  // specials: ice and glue on screen or behind, mystery boxes only behind (they come forward hidden)
  const onScreen = [], behind = [];
  for (const col of cols) col.forEach((b, r) => {
    for (let i = 0; i < 3; i++) if (b.s[i] && T(b.s[i]) !== KEY) (r < P.V ? onScreen : behind).push([b.s, i]);
    for (const l of b.L) for (let i = 0; i < 3; i++) if (l[i] && T(l[i]) !== KEY) behind.push([l, i]);
  });
  const pick = (list, k) => shuffle(rand, list.filter(([a, i]) => a[i] < 64)).slice(0, k);
  for (const [a, i] of pick(onScreen.concat(behind), P.ice)) a[i] += 64 * (1 + (rand() < 0.4));
  for (const [a, i] of pick(onScreen.concat(behind), P.glue)) a[i] |= GLUE;
  for (const [a, i] of pick(behind, P.myst)) a[i] |= MYST;

  // orders: all of a few types — the ones buried deepest count the most
  const depthOf = {}, count = {};
  cols.forEach((col) => col.forEach((b, r) => {
    const see = (x, d) => { if (!x || T(x) === KEY) return; const t = T(x); count[t] = (count[t] || 0) + 1; depthOf[t] = Math.max(depthOf[t] || 0, d); };
    b.s.forEach((x) => see(x, r >= P.V ? 2 + r - P.V : 0));
    b.L.forEach((l, k) => l.forEach((x) => see(x, k + 1 + Math.max(0, r - P.V))));
  }));
  const types = Object.keys(count).map(Number);
  const chosen = P.orders >= types.length ? types
    : types.sort((a, b) => depthOf[b] - depthOf[a] + (rand() - 0.5) * 2).slice(0, P.orders);
  const orders = {};
  for (const t of chosen) orders[t] = count[t];
  let freeFront = 0;
  for (const col of cols) col.slice(0, P.V).forEach((b) => { if (!b.lock) freeFront += b.s.filter((x) => !x).length; });
  if (freeFront < 3 || !Object.keys(orders).length) return null;
  return clone({ V: P.V, cols, orders, matches: 0, nextId: id });
}
