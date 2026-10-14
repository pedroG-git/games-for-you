// Klondike rules. Pure logic, no rendering; also used by the Node tools.
// Card = integer 0..51, suit = floor(c/13): 0 spades, 1 hearts, 2 clubs, 3 diamonds. Rank 0 = ace.

export const rankOf = c => c % 13;
export const suitOf = c => Math.floor(c / 13);
export const isRed = c => (suitOf(c) & 1) === 1;

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function newGame(seed, draw) {
  const r = mulberry32(seed);
  const d = Array.from({ length: 52 }, (_, i) => i);
  for (let i = 51; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  const tab = [], up = [];
  let k = 0;
  for (let i = 0; i < 7; i++) { tab.push(d.slice(k, k + i + 1)); k += i + 1; up.push(1); }
  // stock: last element is the next card drawn
  return { seed, draw, tab, up, stock: d.slice(k), waste: [], found: [[], [], [], []] };
}

export const clone = st => ({
  seed: st.seed, draw: st.draw,
  tab: st.tab.map(p => p.slice()), up: st.up.slice(),
  stock: st.stock.slice(), waste: st.waste.slice(),
  found: st.found.map(p => p.slice()),
});

export function canTab(card, pile) {
  if (!pile.length) return rankOf(card) === 12;
  const t = pile[pile.length - 1];
  return isRed(t) !== isRed(card) && rankOf(t) === rankOf(card) + 1;
}
export const canFound = (st, card) => st.found[suitOf(card)].length === rankOf(card);

// Moves: {t:'draw'} or {t:'move', from:['t',i]|['w']|['f',s], to:['t',j]|['f'], n}
export function leadCard(st, m) {
  const f = m.from;
  if (f[0] === 't') { const p = st.tab[f[1]]; return p[p.length - m.n]; }
  if (f[0] === 'w') return st.waste[st.waste.length - 1];
  const p = st.found[f[1]]; return p[p.length - 1];
}

export function legal(st, m) {
  if (m.t === 'draw') return st.stock.length + st.waste.length > 0;
  const f = m.from, to = m.to, n = m.n || 1;
  if (f[0] === 't') { if (n < 1 || n > st.up[f[1]]) return false; }
  else if (n !== 1) return false;
  else if (f[0] === 'w' && !st.waste.length) return false;
  else if (f[0] === 'f' && !st.found[f[1]].length) return false;
  const c = leadCard(st, m);
  if (c === undefined) return false;
  if (to[0] === 'f') return n === 1 && f[0] !== 'f' && canFound(st, c);
  if (f[0] === 't' && f[1] === to[1]) return false;
  return canTab(c, st.tab[to[1]]);
}

// Mutates st. Returns { flipped: card|null, recycled: bool, drawn: n }
export function apply(st, m) {
  const res = { flipped: null, recycled: false, drawn: 0 };
  if (m.t === 'draw') {
    if (!st.stock.length) { st.stock = st.waste.reverse(); st.waste = []; res.recycled = true; return res; }
    for (let i = 0; i < st.draw && st.stock.length; i++) { st.waste.push(st.stock.pop()); res.drawn++; }
    return res;
  }
  const f = m.from, to = m.to, n = m.n || 1;
  let cards;
  if (f[0] === 't') {
    const p = st.tab[f[1]];
    cards = p.splice(p.length - n, n);
    st.up[f[1]] -= n;
    if (p.length && st.up[f[1]] === 0) { st.up[f[1]] = 1; res.flipped = p[p.length - 1]; }
  } else if (f[0] === 'w') cards = [st.waste.pop()];
  else cards = [st.found[f[1]].pop()];
  if (to[0] === 'f') st.found[suitOf(cards[0])].push(cards[0]);
  else { st.tab[to[1]].push(...cards); st.up[to[1]] += n; }
  return res;
}

export const isWon = st => st.found.every(p => p.length === 13);
export const allFaceUp = st => st.tab.every((p, i) => st.up[i] === p.length);

// Talon as one sequence: seq[0] is drawn first; the first w cards are in the waste.
export const talonSeq = st => ({ seq: st.waste.concat(st.stock.slice().reverse()), w: st.waste.length });

// Waste sizes at which a card is on top, reachable by drawing (and recycling) from w.
export function reachable(n, w, d) {
  const out = [];
  if (n === 0) return out;
  const seen = new Set();
  let cur = w, recycled = 0;
  if (cur > 0) { out.push(cur); seen.add(cur); }
  for (let guard = 0; guard < 2 * n + 4; guard++) {
    if (cur === n) { if (++recycled > 1) break; cur = 0; continue; }
    cur = Math.min(cur + d, n);
    if (!seen.has(cur)) { seen.add(cur); out.push(cur); }
  }
  return out;
}

function playable(st, c) {
  if (canFound(st, c)) return true;
  for (let j = 0; j < 7; j++) if (canTab(c, st.tab[j])) return true;
  return false;
}

// Useful moves in priority order. Empty result = probably stuck.
export function hints(st) {
  const out = [];
  const add = (score, from, to, n = 1) => out.push({ t: 'move', from, to, n, score });
  const { tab, up, waste } = st;
  const wt = waste.length ? waste[waste.length - 1] : -1;

  let kingWaiting = wt >= 0 && rankOf(wt) === 12;
  for (let i = 0; i < 7; i++) {
    const len = tab[i].length; if (!len) continue;
    if (len > up[i] && rankOf(tab[i][len - up[i]]) === 12) kingWaiting = true;
  }

  for (let i = 0; i < 7; i++) {
    const len = tab[i].length; if (!len) continue;
    const u = up[i], down = len - u, top = tab[i][len - 1];
    if (canFound(st, top)) add(100 + (u === 1 && down ? 5 : 0), ['t', i], ['f']);
    const lead = tab[i][len - u];
    for (let j = 0; j < 7; j++) {
      if (j === i || !canTab(lead, tab[j])) continue;
      if (down > 0) add(80 + down, ['t', i], ['t', j], u);
      else if (tab[j].length && kingWaiting) add(30, ['t', i], ['t', j], u);
    }
    for (let n = 1; n < u; n++) {
      const exposed = tab[i][len - n - 1];
      if (!canFound(st, exposed)) continue;
      const l2 = tab[i][len - n];
      for (let j = 0; j < 7; j++) if (j !== i && tab[j].length && canTab(l2, tab[j])) add(40, ['t', i], ['t', j], n);
    }
  }
  if (wt >= 0) {
    if (canFound(st, wt)) add(95, ['w'], ['f']);
    for (let j = 0; j < 7; j++) if (canTab(wt, tab[j])) add(tab[j].length ? 60 : 55, ['w'], ['t', j]);
  }
  const { seq, w } = talonSeq(st);
  for (const p of reachable(seq.length, w, st.draw)) {
    if (p === w) continue;
    if (playable(st, seq[p - 1])) { out.push({ t: 'draw', score: 10 }); break; }
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

// Destinations for a tap on a card: foundation first, then tableau piles starting after the source.
export function tapTargets(st, from, n) {
  const m0 = { t: 'move', from, n };
  const c = leadCard(st, m0);
  const out = [];
  if (n === 1 && from[0] !== 'f' && canFound(st, c)) out.push({ ...m0, to: ['f'] });
  const start = from[0] === 't' ? from[1] : -1;
  const nonEmpty = [], empty = [];
  for (let k = 1; k <= 7; k++) {
    const j = (start + k + 7) % 7;
    if (from[0] === 't' && j === from[1]) continue;
    if (!canTab(c, st.tab[j])) continue;
    if (st.tab[j].length) nonEmpty.push(j);
    else if (!(from[0] === 't' && st.tab[from[1]].length === n)) empty.push(j); // king already on an empty base: pointless
  }
  for (const j of nonEmpty) out.push({ ...m0, to: ['t', j] });
  if (empty.length) out.push({ ...m0, to: ['t', empty[0]] });
  return out;
}
