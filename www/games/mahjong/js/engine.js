// Mahjong Solitaire rules: free tiles, always-solvable deals, an exact solver and a difficulty rating.
// Pure logic (no DOM) so node tools can test it.
//
// Fairness ideas (from the literature on Shanghai/mahjong solitaire):
// - About 3% of random Turtle deals can't be won at all, so deals are built from a solution instead:
//   we "play" the empty layout (remove two free slots at a time) and give each removed pair a face.
// - Removing tiles never makes another tile blocked. So with only two copies of a face you can never get
//   stuck; dead ends only come from pairing the wrong copies of a face that has four. That is the
//   difficulty knob (doubles vs. quads), and it lets the solver play all "safe" moves without branching.
// - Difficulty is measured like the de Bondt solver does: how often a random player clears the deal.

// 42 faces: 0-8 dots, 9-17 bamboo, 18-26 characters, 27-30 winds, 31-33 dragons, 34-37 flowers, 38-41 seasons.
// Any flower matches any flower, any season any season → 36 match classes.
export const FACES = 42, CLASSES = 36;
export const classOf = (f) => (f < 34 ? f : f < 38 ? 34 : 35);
export const facesOfClass = (c) => (c < 34 ? [c] : c === 34 ? [34, 35, 36, 37] : [38, 39, 40, 41]);

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
export const pick = (rand, arr) => arr[Math.floor(rand() * arr.length)];
export function shuffle(rand, arr) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

// ---------------------------------------------------------------- geometry
// A tile at {x, y, z} covers x..x+2, y..y+2 in half-tile units. It is free when nothing lies on it and
// its left or right long side is open.
export function geometry(pos) {
  const n = pos.length, above = [], left = [], right = [];
  for (let i = 0; i < n; i++) { above.push([]); left.push([]); right.push([]); }
  for (let i = 0; i < n; i++) {
    const a = pos[i];
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const b = pos[j], dx = b.x - a.x, dy = b.y - a.y;
      if (Math.abs(dy) >= 2) continue;
      if (b.z > a.z && Math.abs(dx) < 2) above[i].push(j);
      else if (b.z === a.z && dx === -2) left[i].push(j);
      else if (b.z === a.z && dx === 2) right[i].push(j);
    }
  }
  return { n, pos, above, left, right };
}

export function isFree(g, alive, i) {
  if (!alive[i]) return false;
  for (const j of g.above[i]) if (alive[j]) return false;
  let l = false;
  for (const j of g.left[i]) if (alive[j]) { l = true; break; }
  if (!l) return true;
  for (const j of g.right[i]) if (alive[j]) return false;
  return true;
}
export function freeList(g, alive) {
  const out = [];
  for (let i = 0; i < g.n; i++) if (isFree(g, alive, i)) out.push(i);
  return out;
}
export const count = (alive) => { let k = 0; for (const a of alive) k += a; return k; };

// All matchable pairs among the free tiles.
export function pairs(g, faces, alive) {
  const by = new Map(), out = [];
  for (const i of freeList(g, alive)) {
    const c = classOf(faces[i]);
    if (!by.has(c)) by.set(c, []);
    by.get(c).push(i);
  }
  for (const list of by.values()) for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) out.push([list[a], list[b]]);
  return out;
}

// ---------------------------------------------------------------- dealing
// Play the faceless layout: remove two free slots at a time until empty. Higher tiles are taken first
// more often so we don't end with two tiles stacked on each other. Returns the pairs in order, or null.
export function removalOrder(g, alive0, rand, tries = 300) {
  for (let t = 0; t < tries; t++) {
    const alive = Uint8Array.from(alive0), order = [];
    let left = count(alive), ok = true;
    while (left > 0) {
      const free = freeList(g, alive);
      if (free.length < 2) { ok = false; break; }
      const a = weighted(rand, free, g, -1), b = weighted(rand, free, g, a);
      alive[a] = 0; alive[b] = 0; left -= 2;
      order.push([a, b]);
    }
    if (ok) return order;
  }
  return null;
}
function weighted(rand, free, g, not) {
  let sum = 0;
  for (const i of free) if (i !== not) sum += 1 + g.pos[i].z * 2;
  let r = rand() * sum;
  for (const i of free) {
    if (i === not) continue;
    r -= 1 + g.pos[i].z * 2;
    if (r <= 0) return i;
  }
  return free.find((i) => i !== not);
}

// Choose the faces for `nPairs` pairs: `quads` classes appear 4 times, the rest only twice.
export function facePairs(rand, nPairs, quadShare, noBonus = false) {
  let q = Math.round(quadShare * nPairs / 2);
  q = Math.min(Math.floor(nPairs / 2), Math.max(q, nPairs - CLASSES));
  const d = nPairs - 2 * q;
  const classes = shuffle(rand, Array.from({ length: CLASSES }, (_, i) => i));
  if (noBonus && nPairs <= 34) classes.sort((a, b) => (a >= 34) - (b >= 34)); // flowers & seasons last
  const out = [];
  classes.forEach((c, k) => {
    if (k >= q + d) return;
    const f = shuffle(rand, facesOfClass(c).slice());
    const get = (i) => f[i % f.length];
    out.push([get(0), get(1)]);
    if (k < q) out.push([get(2), get(3)]);
  });
  return shuffle(rand, out);
}

// Put the face pairs onto the removal order. faces[i] = -1 for slots that aren't in play.
export function assign(n, order, fp, rand) {
  const faces = new Array(n).fill(-1);
  order.forEach(([a, b], k) => {
    const [f1, f2] = rand() < 0.5 ? fp[k] : [fp[k][1], fp[k][0]];
    faces[a] = f1; faces[b] = f2;
  });
  return faces;
}

export function deal(g, rand, quadShare, noBonus) {
  const order = removalOrder(g, new Uint8Array(g.n).fill(1), rand);
  if (!order) return null;
  return assign(g.n, order, facePairs(rand, order.length, quadShare, noBonus), rand);
}

// New faces for the tiles still on the board, so that the board can be cleared again.
// Keeps the same faces, only moves them. null if the remaining tiles can't be cleared in any order.
export function reshuffle(g, faces, alive, rand) {
  const order = removalOrder(g, alive, rand);
  if (!order) return null;
  const by = new Map();
  for (let i = 0; i < g.n; i++) if (alive[i]) {
    const c = classOf(faces[i]);
    if (!by.has(c)) by.set(c, []);
    by.get(c).push(faces[i]);
  }
  const fp = [];
  for (const list of by.values()) { shuffle(rand, list); for (let k = 0; k < list.length; k += 2) fp.push([list[k], list[k + 1]]); }
  shuffle(rand, fp);
  const out = faces.slice(), nf = assign(g.n, order, fp, rand);
  for (let i = 0; i < g.n; i++) if (alive[i]) out[i] = nf[i];
  return out;
}

// Last resort when the remaining tiles are stuck on top of each other: lay them flat in rows.
export function flatLayout(m) {
  const cols = m <= 12 ? 4 : 6, pos = [];
  const rows = Math.ceil(m / cols);
  for (let r = 0; r < rows; r++) {
    const inRow = Math.min(cols, m - r * cols);
    const off = cols - inRow; // center short rows (half-tile steps)
    for (let c = 0; c < inRow; c++) pos.push({ x: off + c * 2, y: r * 2, z: 0 });
  }
  return pos;
}

// ---------------------------------------------------------------- difficulty: random player
export function playout(g, faces, alive0, rand) {
  const alive = Uint8Array.from(alive0);
  let left = count(alive);
  while (left > 0) {
    const p = pairs(g, faces, alive);
    if (!p.length) return false;
    const [a, b] = pick(rand, p);
    alive[a] = 0; alive[b] = 0; left -= 2;
  }
  return true;
}
export function winRate(g, faces, rand, runs = 40, alive) {
  alive = alive || Uint8Array.from(faces, (f) => (f >= 0 ? 1 : 0));
  let w = 0;
  for (let i = 0; i < runs; i++) if (playout(g, faces, alive, rand)) w++;
  return w / runs;
}

// ---------------------------------------------------------------- exact solver
// A deal is winnable iff we can decide which copies pair up so that greedy play clears the board
// (with fixed pairs every face is a "double", and doubles never trap you). So we search over pairings:
// play every decided pair (and any face whose 4 copies are all free), and when stuck, branch on how one
// face with 2+ free copies pairs up. A copy lying (indirectly) on top of another can't be its partner.
// Returns { ok: true | false | null (gave up), nodes, partner }.
const ABORT = {};
export function solve(g, faces, alive0, budget = 20000) {
  const n = g.n, alive = Uint8Array.from(alive0), cls = faces.map((f) => (f < 0 ? -1 : classOf(f)));
  const partner = new Int16Array(n).fill(-1), members = [];
  for (let c = 0; c < CLASSES; c++) members.push([]);
  let left = 0, nodes = 0;
  for (let i = 0; i < n; i++) if (alive[i]) { members[cls[i]].push(i); left++; }
  // tiles that must leave before i (everything lying on it, recursively)
  const over = new Map();
  const onTop = (i) => {
    if (over.has(i)) return over.get(i);
    const s = new Set();
    for (const j of g.above[i]) if (alive0[j]) { s.add(j); for (const k of onTop(j)) s.add(k); }
    over.set(i, s);
    return s;
  };
  const canPair = (a, b) => !onTop(a).has(b) && !onTop(b).has(a);
  for (const m of members) if (m.length === 2) {
    if (!canPair(m[0], m[1])) return { ok: false, nodes: 0, partner };
    partner[m[0]] = m[1]; partner[m[1]] = m[0];
  }
  const dead = new Set();
  const key = () => {
    let s = '';
    for (let i = 0; i < n; i += 30) { let v = 0; for (let k = 0; k < 30 && i + k < n; k++) if (alive[i + k]) v |= 1 << k; s += v.toString(36) + '.'; }
    for (const m of members) if (m.length === 4 && alive[m[0]] && alive[m[1]] && alive[m[2]] && alive[m[3]]) s += partner[m[0]] < 0 ? '-' : m.indexOf(partner[m[0]]);
    return s;
  };
  const link = (a, b, undo) => { partner[a] = b; partner[b] = a; undo.push(-1 - a, -1 - b); };
  const take = (i, undo) => { alive[i] = 0; left--; undo.push(i); };
  const restore = (undo) => {
    for (let k = undo.length - 1; k >= 0; k--) { const u = undo[k]; if (u >= 0) { alive[u] = 1; left++; } else partner[-1 - u] = -1; }
  };
  // Decided pairs that wait on each other in a circle (each lies under the other) can never be taken.
  function deadlock() {
    const state = new Uint8Array(n); // 0 new, 1 visiting, 2 done (indexed by the pair's lower tile)
    const visit = (a) => {
      const lo = Math.min(a, partner[a]);
      if (state[lo] === 1) return true;
      if (state[lo] === 2) return false;
      state[lo] = 1;
      for (const t of [a, partner[a]]) for (const j of onTop(t)) if (alive[j] && partner[j] >= 0 && visit(j)) return true;
      state[lo] = 2;
      return false;
    };
    for (let i = 0; i < n; i++) if (alive[i] && partner[i] >= 0 && visit(i)) return true;
    return false;
  }
  function rec() {
    if (++nodes > budget) throw ABORT;
    const undo = [];
    let stuckOn = null;
    for (let changed = true; changed;) {
      changed = false;
      const free = freeList(g, alive), isF = new Uint8Array(n);
      for (const i of free) isF[i] = 1;
      for (const i of free) {
        const p = partner[i];
        if (alive[i] && p >= 0 && isF[p] && alive[p]) { take(i, undo); take(p, undo); changed = true; }
      }
      if (changed) continue;
      stuckOn = [];
      for (const m of members) {
        if (m.length < 4 || partner[m[0]] >= 0 || !alive[m[0]]) continue;
        const fr = m.filter((i) => isF[i]);
        if (fr.length === 4) { link(m[0], m[1], undo); link(m[2], m[3], undo); for (const i of m) take(i, undo); changed = true; } else if (fr.length >= 2) stuckOn.push({ m, fr });
      }
    }
    if (left === 0) return true;
    const k = key();
    if (stuckOn.length && !dead.has(k) && !deadlock()) {
      // branch on the face with the most free copies; try "pair the free ones together" first
      stuckOn.sort((a, b) => b.fr.length - a.fr.length);
      const { m, fr } = stuckOn[0];
      const [a, b, c, d] = [...fr, ...m.filter((i) => !fr.includes(i))];
      for (const [p, q, r, s] of [[a, b, c, d], [a, c, b, d], [a, d, b, c]]) {
        if (!canPair(p, q) || !canPair(r, s)) continue;
        const u = [];
        link(p, q, u); link(r, s, u);
        if (rec()) return true;
        restore(u);
      }
      dead.add(k);
    }
    restore(undo);
    return false;
  }
  // partners are kept on success (restore only runs on failure), so callers can read the plan
  try { const ok = rec(); return { ok, nodes, partner }; } catch (e) { if (e === ABORT) return { ok: null, nodes, partner }; throw e; }
}

// A pair that keeps the board winnable. Safe pairs first (all remaining copies of that face are free).
// { pair, ok: true (proven good) | null (unknown) | false (board can't be cleared any more) } or null.
export function hint(g, faces, alive, budget = 40000) {
  const ps = pairs(g, faces, alive);
  if (!ps.length) return null;
  const rem = new Map(), fc = new Map(), inc = (m, c) => m.set(c, (m.get(c) || 0) + 1);
  for (let i = 0; i < g.n; i++) if (alive[i]) inc(rem, classOf(faces[i]));
  for (const i of freeList(g, alive)) inc(fc, classOf(faces[i]));
  const safe = ps.find(([a]) => fc.get(classOf(faces[a])) === rem.get(classOf(faces[a])));
  if (safe) return { pair: safe, ok: true };
  const r = solve(g, faces, alive, budget);
  if (r.ok === false) return { pair: ps[0], ok: false };
  if (r.ok) {
    const good = ps.find(([a, b]) => r.partner[a] === b);
    if (good) return { pair: good, ok: true };
  }
  return { pair: ps[0], ok: null };
}
