// Dragon Match engine: pure match-3 rules (no DOM), so the level generator can simulate games with it.
// A board is W×H cells; each column is playable from top[c] to bot[c]. Moves run as generators that
// yield a phase after every step ('swap', 'match', 'blast', 'fall', 'collect') so the UI can animate them.
export const W = 8, H = 9;
export const SPECIALS = ['rh', 'rv', 'bomb', 'prop', 'light'];
export const isSpecial = (t) => !!t && SPECIALS.includes(t.t);
const movable = (t) => !!t && t.t !== 'box';

// ---------------------------------------------------------------- random (state lives in S.rs so clones replay)
export function rand(S) {
  S.rs = (S.rs + 0x6D2B79F5) | 0;
  let t = Math.imul(S.rs ^ (S.rs >>> 15), 1 | S.rs);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const rint = (S, n) => Math.floor(rand(S) * n);

// ---------------------------------------------------------------- board helpers
export const idx = (r, c) => r * W + c;
export const inBoard = (S, r, c) => c >= 0 && c < W && r >= S.top[c] && r <= S.bot[c];
const colorAt = (S, r, c) => { const t = inBoard(S, r, c) && S.tiles[idx(r, c)]; return t && t.t === 'g' ? t.c : -1; };
const newTile = (S, t, extra) => ({ id: S.nextId++, t, ...extra });
const gem = (S, c) => newTile(S, 'g', { c });

/** Builds a fresh game state from a level description (see levels.js). */
export function createState(L, seed) {
  const S = {
    top: L.top.slice(), bot: L.bot.slice(), colors: L.colors, moves: L.moves,
    tiles: Array(W * H).fill(null), ice: Array(W * H).fill(0),
    goals: L.goals.map((g) => ({ ...g, left: g.n })),
    eggsLeft: 0, nextId: 1, rs: seed | 0, wave: 0, queue: [], won: false, lost: false, stats: { specials: 0 },
  };
  for (const [r, c, hp] of L.boxes) S.tiles[idx(r, c)] = newTile(S, 'box', { hp });
  for (const [r, c] of L.ice) S.ice[idx(r, c)] = 1;
  const eggGoal = S.goals.find((g) => g.t === 'egg');
  if (eggGoal) {
    S.eggsLeft = eggGoal.n;
    for (const [r, c] of L.eggs) { S.tiles[idx(r, c)] = newTile(S, 'egg'); S.eggsLeft--; }
  }
  fillNoMatch(S);
  if (!hasMove(S)) shuffle(S);
  return S;
}

export function clone(S) {
  return {
    ...S, top: S.top, bot: S.bot, tiles: S.tiles.map((t) => t && { ...t }), ice: S.ice.slice(),
    goals: S.goals.map((g) => ({ ...g })), queue: [], stats: { ...S.stats },
  };
}

function fillNoMatch(S) {
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    if (!inBoard(S, r, c) || S.tiles[idx(r, c)]) continue;
    const bad = new Set();
    if (colorAt(S, r, c - 1) >= 0 && colorAt(S, r, c - 1) === colorAt(S, r, c - 2)) bad.add(colorAt(S, r, c - 1));
    if (colorAt(S, r - 1, c) >= 0 && colorAt(S, r - 1, c) === colorAt(S, r - 2, c)) bad.add(colorAt(S, r - 1, c));
    const a = colorAt(S, r - 1, c - 1);
    if (a >= 0 && a === colorAt(S, r - 1, c) && a === colorAt(S, r, c - 1)) bad.add(a); // no 2×2 squares
    const ok = [...Array(S.colors).keys()].filter((k) => !bad.has(k));
    S.tiles[idx(r, c)] = gem(S, ok[rint(S, ok.length)]);
  }
}

// ---------------------------------------------------------------- finding matches
function runsAt(S) {
  const runs = [];
  for (let r = 0; r < H; r++) for (let c = 0; c < W;) {
    const k = colorAt(S, r, c); let e = c + 1;
    if (k >= 0) while (colorAt(S, r, e) === k) e++;
    if (k >= 0 && e - c >= 3) runs.push({ dir: 'h', k, cells: [...Array(e - c).keys()].map((i) => idx(r, c + i)) });
    c = Math.max(e, c + 1);
  }
  for (let c = 0; c < W; c++) for (let r = 0; r < H;) {
    const k = colorAt(S, r, c); let e = r + 1;
    if (k >= 0) while (colorAt(S, e, c) === k) e++;
    if (k >= 0 && e - r >= 3) runs.push({ dir: 'v', k, cells: [...Array(e - r).keys()].map((i) => idx(r + i, c)) });
    r = Math.max(e, r + 1);
  }
  for (let r = 0; r < H - 1; r++) for (let c = 0; c < W - 1; c++) {
    const k = colorAt(S, r, c);
    if (k >= 0 && k === colorAt(S, r, c + 1) && k === colorAt(S, r + 1, c) && k === colorAt(S, r + 1, c + 1)) {
      runs.push({ dir: 's', k, cells: [idx(r, c), idx(r, c + 1), idx(r + 1, c), idx(r + 1, c + 1)] });
    }
  }
  return runs;
}

/** Groups of matched cells, each with the special it creates and where. `prefer` = cells the player just moved. */
export function findGroups(S, prefer = []) {
  const runs = runsAt(S);
  if (!runs.length) return [];
  const parent = runs.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const owner = new Map();
  runs.forEach((run, i) => run.cells.forEach((cell) => {
    if (owner.has(cell)) parent[find(i)] = find(owner.get(cell)); else owner.set(cell, i);
  }));
  const byRoot = new Map();
  runs.forEach((run, i) => { const r = find(i); if (!byRoot.has(r)) byRoot.set(r, []); byRoot.get(r).push(run); });
  const groups = [];
  for (const rs of byRoot.values()) {
    const cells = [...new Set(rs.flatMap((r) => r.cells))];
    const lines = rs.filter((r) => r.dir !== 's');
    const longest = lines.reduce((m, r) => (r.cells.length > m.cells.length ? r : m), { cells: [] });
    const hasH = lines.some((r) => r.dir === 'h'), hasV = lines.some((r) => r.dir === 'v');
    let make = null, at = null;
    if (longest.cells.length >= 5) make = 'light';
    else if (hasH && hasV) {
      make = 'bomb';
      const h = lines.find((r) => r.dir === 'h'), v = lines.find((r) => r.dir === 'v');
      at = h.cells.find((x) => v.cells.includes(x));
    } else if (longest.cells.length === 4) make = longest.dir === 'h' ? 'rv' : 'rh';
    else if (rs.some((r) => r.dir === 's')) make = 'prop';
    const p = cells.find((x) => prefer.includes(x));
    if (p !== undefined) at = p;
    else if (at === null) {
      const src = longest.cells.length ? longest.cells : cells;
      at = src[Math.floor((src.length - 1) / 2)];
    }
    groups.push({ k: rs[0].k, cells, make, at });
  }
  return groups;
}

// Quick check: is cell i part of a 3-run or 2×2 square of its colour?
function matchesAt(S, i) {
  const r = Math.floor(i / W), c = i % W, k = colorAt(S, r, c);
  if (k < 0) return false;
  let a = c, b = c;
  while (colorAt(S, r, a - 1) === k) a--;
  while (colorAt(S, r, b + 1) === k) b++;
  if (b - a >= 2) return true;
  a = r; b = r;
  while (colorAt(S, a - 1, c) === k) a--;
  while (colorAt(S, b + 1, c) === k) b++;
  if (b - a >= 2) return true;
  for (const [dr, dc] of [[0, 0], [0, -1], [-1, 0], [-1, -1]]) {
    const r0 = r + dr, c0 = c + dc;
    if (colorAt(S, r0, c0) === k && colorAt(S, r0, c0 + 1) === k && colorAt(S, r0 + 1, c0) === k && colorAt(S, r0 + 1, c0 + 1) === k) return true;
  }
  return false;
}

/** All moves the player can make: swaps that match or involve a special, and taps on specials. */
export function listMoves(S) {
  const out = [];
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const i = idx(r, c), t = S.tiles[i];
    if (!movable(t)) continue;
    if (isSpecial(t)) out.push({ tap: i });
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      if (!inBoard(S, r + dr, c + dc)) continue;
      const j = idx(r + dr, c + dc), u = S.tiles[j];
      if (!movable(u)) continue;
      if (isSpecial(t) || isSpecial(u)) { out.push({ a: i, b: j }); continue; }
      S.tiles[i] = u; S.tiles[j] = t;
      if (matchesAt(S, i) || matchesAt(S, j)) out.push({ a: i, b: j });
      S.tiles[i] = t; S.tiles[j] = u;
    }
  }
  return out;
}
export function hasMove(S) {
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const i = idx(r, c), t = S.tiles[i];
    if (!movable(t)) continue;
    if (isSpecial(t)) return true;
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      if (!inBoard(S, r + dr, c + dc)) continue;
      const j = idx(r + dr, c + dc), u = S.tiles[j];
      if (!movable(u)) continue;
      if (isSpecial(u)) return true;
      S.tiles[i] = u; S.tiles[j] = t;
      const ok = matchesAt(S, i) || matchesAt(S, j);
      S.tiles[i] = t; S.tiles[j] = u;
      if (ok) return true;
    }
  }
  return false;
}

/** Re-deals the gems (not specials, boxes or eggs) so there is no match and at least one move. */
export function shuffle(S) {
  const spots = [];
  for (let i = 0; i < W * H; i++) if (S.tiles[i] && S.tiles[i].t === 'g') spots.push(i);
  for (let tries = 0; tries < 60; tries++) {
    const pool = spots.map((i) => S.tiles[i]);
    for (let k = pool.length - 1; k > 0; k--) { const j = rint(S, k + 1); [pool[k], pool[j]] = [pool[j], pool[k]]; }
    spots.forEach((i, k) => { S.tiles[i] = pool[k]; });
    if (tries > 40) spots.forEach((i) => { S.tiles[i].c = rint(S, S.colors); }); // recolour if stuck
    if (!runsAt(S).length && hasMove(S)) return true;
  }
  return false;
}

// ---------------------------------------------------------------- goals
function count(S, t, c) {
  const g = S.goals.find((x) => x.t === t && (t !== 'gem' || x.c === c));
  if (g && g.left > 0) g.left--;
}
export const goalsDone = (S) => S.goals.every((g) => g.left <= 0);

// ---------------------------------------------------------------- hitting cells
// Damage one cell: gems pop, boxes lose a layer (once per wave), specials get queued to go off, ice melts.
function hit(S, i) {
  const r = Math.floor(i / W), c = i % W;
  if (!inBoard(S, r, c)) return;
  const t = S.tiles[i];
  if (t && t.t === 'box') {
    if (t.hw === S.wave) return;
    t.hw = S.wave;
    if (--t.hp <= 0) { S.tiles[i] = null; count(S, 'box'); }
    return;
  }
  if (S.ice[i]) { S.ice[i] = 0; count(S, 'ice'); }
  if (!t || t.t === 'egg') return;
  if (t.t === 'g') { S.tiles[i] = null; count(S, 'gem', t.c); return; }
  if (isSpecial(t) && !t.fired) { t.fired = true; S.queue.push({ t: t.t, at: i, id: t.id }); }
}
// Matches crack boxes next to them.
function nudge(S, i) {
  const r = Math.floor(i / W), c = i % W;
  for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
    if (!inBoard(S, r + dr, c + dc)) continue;
    const t = S.tiles[idx(r + dr, c + dc)];
    if (t && t.t === 'box') hit(S, idx(r + dr, c + dc));
  }
}

function clearGroups(S, groups) {
  S.wave++;
  for (const g of groups) {
    for (const i of g.cells) {
      const t = S.tiles[i];
      if (!t || t.t !== 'g') continue;
      hit(S, i); nudge(S, i);
    }
    if (g.make) { S.tiles[g.at] = newTile(S, g.make, { born: true }); S.stats.specials++; }
  }
}

// ---------------------------------------------------------------- specials going off
const rc = (i) => [Math.floor(i / W), i % W];
function row(S, r) { for (let c = 0; c < W; c++) hit(S, idx(r, c)); }
function col(S, c) { for (let r = 0; r < H; r++) hit(S, idx(r, c)); }
function area(S, r0, c0, rad) {
  for (let r = r0 - rad; r <= r0 + rad; r++) for (let c = c0 - rad; c <= c0 + rad; c++) if (inBoard(S, r, c)) hit(S, idx(r, c));
}
function mostCommonColor(S) {
  const n = Array(S.colors).fill(0);
  for (const t of S.tiles) if (t && t.t === 'g') n[t.c]++;
  return n.indexOf(Math.max(...n));
}

// Where a flying dragon goes: something that helps the goals, else any gem.
function pickTarget(S, avoid) {
  const want = (t, c) => S.goals.some((g) => g.left > 0 && g.t === t && (t !== 'gem' || g.c === c));
  let best = [], score = -1;
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    if (!inBoard(S, r, c)) continue;
    const i = idx(r, c), t = S.tiles[i];
    if (avoid.has(i)) continue;
    let s = 0;
    if (t && t.t === 'box' && want('box')) s = 10 + (3 - t.hp);
    else if (S.ice[i] && want('ice') && !(t && t.t === 'box')) s = 8;
    else if (t && t.t === 'g' && want('gem', t.c)) s = 6;
    else if (want('egg') && r > 0 && inBoard(S, r - 1, c) && S.tiles[idx(r - 1, c)] && S.tiles[idx(r - 1, c)].t === 'egg' && t && t.t !== 'egg') s = 7;
    else if (t && t.t === 'g') s = 1;
    if (s > score) { score = s; best = [i]; } else if (s === score) best.push(i);
  }
  return best.length ? best[rint(S, best.length)] : -1;
}

/** Sets off one special (or a combo / booster). Pushes visual effects to fx. */
function activate(S, a, fx) {
  if (a.id !== undefined && S.tiles[a.at] && S.tiles[a.at].id === a.id) S.tiles[a.at] = null;
  const [r, c] = rc(a.at);
  switch (a.t) {
    case 'rh': fx.push({ fx: 'rocket', r, c, dir: 'h' }); row(S, r); break;
    case 'rv': fx.push({ fx: 'rocket', r, c, dir: 'v' }); col(S, c); break;
    case 'cross': fx.push({ fx: 'rocket', r, c, dir: 'h' }, { fx: 'rocket', r, c, dir: 'v' }); row(S, r); col(S, c); break;
    case 'bigcross':
      for (let d = -1; d <= 1; d++) {
        fx.push({ fx: 'rocket', r: r + d, c, dir: 'h' }, { fx: 'rocket', r, c: c + d, dir: 'v' });
        if (r + d >= 0 && r + d < H) row(S, r + d);
        if (c + d >= 0 && c + d < W) col(S, c + d);
      }
      break;
    case 'bomb': { const rad = a.rad || 2; fx.push({ fx: 'bomb', r, c, rad }); area(S, r, c, rad); break; }
    case 'prop': {
      fx.push({ fx: 'spin', r, c });
      area(S, r, c, 0);
      for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) if (inBoard(S, r + dr, c + dc)) hit(S, idx(r + dr, c + dc));
      const avoid = new Set();
      for (let k = 0; k < (a.n || 1); k++) {
        const to = pickTarget(S, avoid);
        if (to < 0) break;
        avoid.add(to);
        const [tr, tc] = rc(to);
        fx.push({ fx: 'fly', r, c, tr, tc, carry: a.carry || null });
        if (a.carry) activate(S, { t: a.carry, at: to }, fx); else hit(S, to);
      }
      break;
    }
    case 'light': {
      const k = a.color >= 0 ? a.color : mostCommonColor(S);
      const targets = [];
      for (let i = 0; i < W * H; i++) if (S.tiles[i] && S.tiles[i].t === 'g' && S.tiles[i].c === k) targets.push(i);
      fx.push({ fx: 'light', r, c, targets: targets.map(rc), turn: a.turn || null });
      if (a.turn) {
        for (const i of targets) {
          const t = a.turn === 'rocket' ? (rand(S) < 0.5 ? 'rh' : 'rv') : a.turn;
          S.tiles[i] = newTile(S, t, { fired: true });
          S.queue.push({ t, at: i, id: S.tiles[i].id });
        }
      } else for (const i of targets) hit(S, i);
      break;
    }
    case 'all': fx.push({ fx: 'nova', r, c }); for (let i = 0; i < W * H; i++) hit(S, i); break;
    case 'hammer': fx.push({ fx: 'hammer', r, c }); hit(S, a.at); break;
  }
}

// Combining two specials by swapping them together.
function combo(x, y) {
  const kind = (t) => (t === 'rh' || t === 'rv' ? 'rocket' : t);
  const [p, q] = [kind(x), kind(y)].sort();
  if (p === 'light' && q === 'light') return { t: 'all' };
  if (q === 'light') return { t: 'light', turn: p };
  if (p === 'light') return { t: 'light', turn: q };
  if (p === 'prop' && q === 'prop') return { t: 'prop', n: 3 };
  if (p === 'prop' || q === 'prop') { const o = kind(x) === 'prop' ? y : x; return { t: 'prop', carry: kind(o) === 'rocket' ? o : 'bomb' }; }
  if (p === 'bomb' && q === 'bomb') return { t: 'bomb', rad: 3 };
  if (p === 'bomb' || q === 'bomb') return { t: 'bigcross' };
  return { t: 'cross' };
}

// ---------------------------------------------------------------- gravity
// Tiles fall straight down; boxes stay put, and gaps under them are filled by tiles sliding in diagonally.
function gravity(S) {
  let moved = false;
  for (let guard = 0; guard < 200; guard++) {
    for (let c = 0; c < W; c++) {
      let r = S.bot[c];
      while (r >= S.top[c]) {
        let end = r; // segment [start..end] between boxes
        while (r >= S.top[c] && !(S.tiles[idx(r, c)] && S.tiles[idx(r, c)].t === 'box')) r--;
        const start = r + 1;
        const stack = [];
        for (let k = end; k >= start; k--) if (S.tiles[idx(k, c)]) stack.push(S.tiles[idx(k, c)]);
        let k = end;
        for (const t of stack) { if (S.tiles[idx(k, c)] !== t) moved = true; S.tiles[idx(k, c)] = t; k--; }
        if (start === S.top[c]) {
          let n = 0;
          for (; k >= start; k--) { S.tiles[idx(k, c)] = spawn(S); S.tiles[idx(k, c)].y0 = start - 1 - n++; moved = true; }
        } else for (; k >= start; k--) S.tiles[idx(k, c)] = null;
        r--; // skip the box
      }
    }
    // One diagonal slide, then settle again.
    let slid = false;
    for (let r = H - 1; r >= 0 && !slid; r--) for (let c = 0; c < W && !slid; c++) {
      if (!inBoard(S, r, c) || S.tiles[idx(r, c)]) continue;
      for (const dc of [-1, 1]) {
        const sc = c + dc;
        if (!inBoard(S, r - 1, sc)) continue;
        const t = S.tiles[idx(r - 1, sc)];
        if (movable(t)) { S.tiles[idx(r, c)] = t; S.tiles[idx(r - 1, sc)] = null; slid = moved = true; break; }
      }
    }
    if (!slid) break;
  }
  return moved;
}
function spawn(S) {
  if (S.eggsLeft > 0) {
    const on = S.tiles.filter((t) => t && t.t === 'egg').length;
    if (on < 2 && rand(S) < 0.4) { S.eggsLeft--; return newTile(S, 'egg'); }
  }
  return gem(S, rint(S, S.colors));
}
function collectEggs(S) {
  const got = [];
  for (let c = 0; c < W; c++) {
    if (S.bot[c] < S.top[c]) continue;
    const i = idx(S.bot[c], c), t = S.tiles[i];
    if (t && t.t === 'egg') { S.tiles[i] = null; count(S, 'egg'); got.push([S.bot[c], c]); }
  }
  return got;
}

// ---------------------------------------------------------------- moves
function* cascade(S, acts, prefer = []) {
  let combo = 0;
  for (;;) {
    while (acts.length) {
      const fx = [];
      for (const a of acts) { S.wave++; activate(S, a, fx); }
      yield { type: 'blast', fx };
      acts = S.queue.splice(0);
    }
    if (gravity(S)) yield { type: 'fall' };
    const eggs = collectEggs(S);
    if (eggs.length) { yield { type: 'collect', eggs }; continue; }
    const groups = findGroups(S, prefer);
    prefer = [];
    if (!groups.length) break;
    clearGroups(S, groups);
    yield { type: 'match', groups, combo: combo++ };
    acts = S.queue.splice(0);
  }
  if (goalsDone(S)) { S.won = true; return; }
  if (S.moves <= 0) { S.lost = true; return; }
  if (!hasMove(S)) { shuffle(S); yield { type: 'shuffle' }; }
}

/** Player swaps cells a and b. Yields animation phases; returns false if the swap was not allowed. */
export function* swap(S, a, b) {
  const ta = S.tiles[a], tb = S.tiles[b];
  if (!movable(ta) || !movable(tb)) return false;
  S.tiles[a] = tb; S.tiles[b] = ta;
  yield { type: 'swap' };
  const sa = isSpecial(ta), sb = isSpecial(tb);
  if (sa && sb) {
    S.moves--;
    S.tiles[a] = null; S.tiles[b] = null;
    yield* cascade(S, [{ ...combo(ta.t, tb.t), at: b }]);
    return true;
  }
  if (sa || sb) {
    S.moves--;
    const sp = sa ? ta : tb, other = sa ? tb : ta, at = sa ? b : a;
    ta.fired = tb.fired = isSpecial(ta) || isSpecial(tb);
    const act = { t: sp.t, at, id: sp.id };
    if (sp.t === 'light') act.color = other.t === 'g' ? other.c : -1;
    yield* cascade(S, [act], [a, b]);
    return true;
  }
  const groups = findGroups(S, [a, b]);
  if (!groups.length) { S.tiles[a] = ta; S.tiles[b] = tb; yield { type: 'swapback' }; return false; }
  S.moves--;
  clearGroups(S, groups);
  yield { type: 'match', groups, combo: 0 };
  yield* cascade(S, S.queue.splice(0));
  return true;
}

/** Player taps a special to set it off. */
export function* tap(S, i) {
  const t = S.tiles[i];
  if (!isSpecial(t)) return false;
  S.moves--;
  t.fired = true;
  yield* cascade(S, [{ t: t.t, at: i, id: t.id }]);
  return true;
}

/** In-game boosters: they don't use a move. kind = hammer | arrow (row) | cannon (column) | shuffle. */
export function* tool(S, kind, i) {
  if (kind === 'shuffle') { shuffle(S); yield { type: 'shuffle' }; return true; }
  const t = { hammer: 'hammer', arrow: 'rh', cannon: 'rv' }[kind];
  yield* cascade(S, [{ t, at: i }]);
  return true;
}

/** Puts pre-level boosters on random gems: kinds from 'rocket' | 'bomb' | 'light'. */
export function placeBoosters(S, kinds) {
  for (const k of kinds) {
    const spots = [];
    for (let i = 0; i < W * H; i++) if (S.tiles[i] && S.tiles[i].t === 'g') spots.push(i);
    if (!spots.length) return;
    const t = k === 'rocket' ? (rand(S) < 0.5 ? 'rh' : 'rv') : k;
    S.tiles[spots[rint(S, spots.length)]] = newTile(S, t, { born: true });
  }
}

/** Dragon finale after a win: leftover moves become rockets that fly off (just for fun, no goals left). */
export function* finale(S) {
  while (S.moves > 0) {
    const spots = [];
    for (let i = 0; i < W * H; i++) if (S.tiles[i] && S.tiles[i].t === 'g') spots.push(i);
    if (!spots.length) break;
    const take = Math.min(S.moves, 3), acts = [];
    for (let k = 0; k < take && spots.length; k++) {
      const i = spots.splice(rint(S, spots.length), 1)[0], t = rand(S) < 0.5 ? 'rh' : 'rv';
      S.tiles[i] = newTile(S, t, { fired: true });
      acts.push({ t, at: i, id: S.tiles[i].id });
    }
    S.moves -= take;
    yield { type: 'turn' };
    yield* cascade(S, acts);
  }
}

/** Runs a generator to the end without animation (for the simulator). */
export function run(gen) { let r; do r = gen.next(); while (!r.done); return r.value; }
