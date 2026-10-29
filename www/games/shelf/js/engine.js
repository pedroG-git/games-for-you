// Shelf Sort rules — pure functions, no DOM, so tools/test-shelf.js can run them in Node.
//
// The shelf has 3 columns. Each column is a list of cubbies, bottom first; only the lowest `V` are on screen,
// the rest wait above and slide down when a cubby leaves. A cubby has 3 front slots (`s`) and hidden back layers
// (`L`, next first) that move forward when the front is empty. Three equal items in one front = a match.
//
// An item is one integer: type (bits 0-5, 0 = empty slot), ice (bits 6-7: matches still needed nearby),
// glue (bit 8: can't be moved until a match happens next to it), mystery (bit 9: shown as "?" until touched).
export const KEY = 63;
export const T = (it) => it & 63;
export const ICE = (it) => (it >> 6) & 3;
export const GLUE = 256, MYST = 512;
export const movable = (it) => it > 0 && !ICE(it) && !(it & GLUE);
// Can this item be one of three in a match? (Glued items can, frozen or hidden ones can't.)
const matchable = (it) => it > 0 && !ICE(it) && !(it & MYST) && T(it) !== KEY;

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffle(rand, arr) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

// state = { V, cols: [[cubby]], orders: {type: left}, matches, nextId }, cubby = { id, s: [3], L: [[3]], lock }
export const clone = (st) => ({
  V: st.V, matches: st.matches, nextId: st.nextId, orders: Object.assign({}, st.orders),
  cols: st.cols.map((c) => c.map((b) => ({ id: b.id, s: b.s.slice(), L: b.L.map((l) => l.slice()), lock: b.lock }))),
});
export const done = (st) => Object.values(st.orders).every((n) => n <= 0);
const free = (b) => (b.s[0] === 0) + (b.s[1] === 0) + (b.s[2] === 0);
export const visible = (st, c, r) => r < st.V && r < st.cols[c].length;

// Every legal move: [col, row, slot, toCol, toRow]. The item lands in the first free slot (or opens a lock, for a key).
export function moves(st) {
  const out = [], targets = [];
  for (let c = 0; c < 3; c++) for (let r = 0; r < Math.min(st.V, st.cols[c].length); r++) {
    const b = st.cols[c][r];
    if (!b.lock && free(b)) targets.push([c, r]);
  }
  for (let c = 0; c < 3; c++) for (let r = 0; r < Math.min(st.V, st.cols[c].length); r++) {
    const b = st.cols[c][r];
    if (b.lock) continue;
    for (let i = 0; i < 3; i++) {
      const it = b.s[i];
      if (!movable(it)) continue;
      for (const [tc, tr] of targets) if (tc !== c || tr !== r) out.push([c, r, i, tc, tr]);
      if (T(it) === KEY) {
        for (let c2 = 0; c2 < 3; c2++) for (let r2 = 0; r2 < Math.min(st.V, st.cols[c2].length); r2++) {
          if (st.cols[c2][r2].lock) out.push([c, r, i, c2, r2]);
        }
      }
    }
  }
  return out;
}

export function legal(st, c, r, i, tc, tr) {
  if (!visible(st, c, r) || !visible(st, tc, tr) || (c === tc && r === tr)) return false;
  const a = st.cols[c][r], b = st.cols[tc][tr], it = a.s[i];
  if (a.lock || !movable(it)) return false;
  if (b.lock) return T(it) === KEY;
  return free(b) > 0;
}

// Plays a move (mutates st). `slot` picks the landing slot when it is free. Returns what happened, for the animations:
// { key, matches: [{ c, id, t, slots }], unlocked: [id], thawed: [id], revealed: [id], fell: [col] }
export function apply(st, c, r, i, tc, tr, slot = -1) {
  const ev = { key: false, matches: [], unlocked: [], thawed: [], revealed: [], fell: [], forward: [] };
  const a = st.cols[c][r], b = st.cols[tc][tr];
  const it = a.s[i] & ~MYST;
  a.s[i] = 0;
  if (b.lock) { b.lock = 0; ev.key = true; ev.unlocked.push(b.id); }
  else {
    const j = slot >= 0 && b.s[slot] === 0 ? slot : b.s.indexOf(0);
    b.s[j] = it;
    if (b.s.every((x) => matchable(x) && T(x) === T(it))) {
      ev.matches.push({ c: tc, id: b.id, t: T(it), slots: [0, 1, 2] });
      b.s = [0, 0, 0];
      b.cleared = true;
      afterMatch(st, tc, tr, T(it), ev);
    }
  }
  settle(st, ev);
  return ev;
}

// A match: the order goes down, locks count down, and neighbours thaw, unglue and show what they are.
function afterMatch(st, c, r, t, ev) {
  st.matches++;
  if (st.orders[t] > 0) st.orders[t] = Math.max(0, st.orders[t] - 3);
  for (let cc = 0; cc < 3; cc++) for (let rr = 0; rr < Math.min(st.V, st.cols[cc].length); rr++) {
    const b = st.cols[cc][rr];
    if (b.lock > 0) { b.lock--; if (!b.lock) ev.unlocked.push(b.id); }
  }
  for (const [dc, dr] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const cc = c + dc, rr = r + dr;
    if (cc < 0 || cc > 2 || rr < 0 || !visible(st, cc, rr)) continue;
    const b = st.cols[cc][rr];
    if (b.lock) continue;
    for (let i = 0; i < 3; i++) {
      const x = b.s[i];
      if (!x) continue;
      let y = x;
      if (ICE(y)) y -= 64;
      y &= ~GLUE & ~MYST;
      if (y !== x) { b.s[i] = y; (ICE(x) && !ICE(y) ? ev.thawed : ev.revealed).push(b.id); }
    }
  }
}

// Empty fronts pull their next layer forward. A cubby emptied by a match with nothing behind it leaves the shelf
// when another cubby waits above it, and the column slides down.
function settle(st, ev) {
  for (let c = 0; c < 3; c++) {
    const col = st.cols[c];
    for (let r = 0; r < Math.min(st.V, col.length); r++) {
      const b = col[r];
      if (b.lock || b.s.some((x) => x)) { b.cleared = false; continue; }
      if (b.L.length) { b.s = b.L.shift(); ev.forward.push(b.id); b.cleared = false; continue; }
      if (b.cleared && col.length > st.V) { col.splice(r, 1); ev.fell.push(c); r--; continue; }
      b.cleared = false;
    }
  }
}

// ---------------------------------------------------------------- solver
// A greedy player with a little randomness. Many tries; the shortest win is the proof that the level can be won.
function score(st, m, last, rand, noise) {
  const [c, r, i, tc, tr] = m;
  const a = st.cols[c][r], b = st.cols[tc][tr], it = a.s[i], t = T(it);
  if (b.lock) return 900 + rand() * noise;
  if (last && last[0] === tc && last[1] === tr && last[3] === c && last[4] === r) return -500;
  let same = 0, other = 0;
  for (const x of b.s) { if (!x) continue; if (matchable(x) && T(x) === t) same++; else other++; }
  const fr = 3 - same - other;
  let s = 0;
  const want = st.orders[t] > 0 ? 1 : 0;
  if (same === 2) s += 1000 + want * 300;
  else if (same === 1 && fr === 2) s += 70 + want * 20;
  else if (same === 1) s -= 10;
  else if (fr === 3) s += 4;
  else s -= 40 + other * 10;
  // leaving the source: an odd one out walking away from a pair is good, emptying the front shows the next layer
  let left = 0, pairT = -1, pairN = 0;
  for (let k = 0; k < 3; k++) {
    if (k === i || !a.s[k]) continue;
    left++;
    if (matchable(a.s[k]) && T(a.s[k]) !== t) { if (pairT === T(a.s[k])) pairN++; else if (pairT < 0) { pairT = T(a.s[k]); pairN = 1; } }
  }
  if (left === 0) s += a.L.length ? 35 : 12;
  if (pairN === 2) s += 45;
  let sameSrc = 0;
  for (let k = 0; k < 3; k++) if (k !== i && matchable(a.s[k]) && T(a.s[k]) === t) sameSrc++;
  if (sameSrc) s -= 60; // don't break up a pair
  return s + rand() * noise;
}

export function play(st0, { rand, noise = 30, maxSteps = 200, stopAt = Infinity }) {
  const st = clone(st0), path = [];
  let last = null;
  for (let step = 0; step < maxSteps && step < stopAt; step++) {
    if (done(st)) return path;
    const ms = moves(st);
    if (!ms.length) return null;
    let best = null, bs = -Infinity;
    for (const m of ms) { const s = score(st, m, last, rand, noise); if (s > bs) { bs = s; best = m; } }
    apply(st, ...best);
    path.push(best);
    last = best;
  }
  return done(st) ? path : null;
}

// { best: shortest winning path or null, rate: share of tries that won within `limit` moves }
export function solve(st, { tries = 30, seed = 1, limit = 200, noise = 30 } = {}) {
  const rand = rng(seed);
  let best = null, wins = 0;
  for (let k = 0; k < tries; k++) {
    const p = play(st, { rand, noise: k === 0 ? 0.5 : noise, maxSteps: limit + 1 });
    if (p && p.length <= limit) { wins++; if (!best || p.length < best.length) best = p; }
  }
  return { best, rate: wins / tries };
}

// Items still to clear + a generous step cap for the greedy player (it can wander; this keeps failing runs cheap).
export function stepCap(st) {
  let n = 0;
  for (const col of st.cols) for (const b of col) { for (const x of b.s) if (x) n++; for (const l of b.L) for (const x of l) if (x) n++; }
  return Math.min(300, Math.ceil(n / 3) * 4 + 20);
}

// A good next move for the player: the first step of a winning path the solver finds from `st`, else the best
// greedy move, else null (no legal move). Does not mutate st.
export function hint(st, seed = 1) {
  const ms = moves(st);
  if (!ms.length) return null;
  if (done(st)) return null;
  const cap = stepCap(st), rand = rng(seed);
  let best = null;
  for (let k = 0; k < 8; k++) {
    const p = play(st, { rand, noise: k === 0 ? 0.5 : 30, maxSteps: cap });
    if (p && p.length && (!best || p.length < best.length)) best = p;
    if (best && k >= 2) break;
  }
  if (best) return best[0];
  let bm = ms[0], bs = -Infinity;
  for (const m of ms) { const s = score(st, m, null, rand, 5); if (s > bs) { bs = s; bm = m; } }
  return bm;
}

// A new state where the movable, revealed, non-key items in the front slots of on-screen unlocked cubbies are
// dealt out again among those same slots (empty slots stay empty). No ready-made triple, still winnable.
// Returns null if no such shuffle is found. Does not mutate st.
export function reshuffle(st, seed = 1) {
  const rand = rng(seed >>> 0 || 1);
  const slots = [];
  for (let c = 0; c < 3; c++) for (let r = 0; r < Math.min(st.V, st.cols[c].length); r++) {
    const b = st.cols[c][r];
    if (b.lock) continue;
    for (let i = 0; i < 3; i++) { const x = b.s[i]; if (movable(x) && !(x & MYST) && T(x) !== KEY) slots.push([c, r, i]); }
  }
  if (slots.length < 2) return null;
  const vals = slots.map(([c, r, i]) => st.cols[c][r].s[i]);
  if (new Set(vals).size < 2) return null;
  for (let k = 0; k < 20; k++) {
    const v = shuffle(rand, vals.slice());
    if (v.every((x, j) => x === vals[j])) continue;
    const ns = clone(st);
    slots.forEach(([c, r, i], j) => { ns.cols[c][r].s[i] = v[j]; });
    let triple = false;
    for (const col of ns.cols) for (const b of col) if (!b.lock && b.s.every((x) => matchable(x) && T(x) === T(b.s[0]))) triple = true;
    if (triple) continue;
    const cap = stepCap(ns);
    let won = false;
    for (let t = 0; t < 6 && !won; t++) won = !!play(ns, { rand, noise: t ? 30 : 0.5, maxSteps: cap });
    if (won) return ns;
  }
  return null;
}
