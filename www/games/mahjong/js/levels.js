// Board layouts (hand-made + generated) and the endless journey: which layout and how hard each level is.
// Layers are drawn on a tile grid; `o` shifts a layer in half tiles, so [1,1] sits between 4 tiles below.
import * as E from './engine.js';

const L = (name, ...layers) => ({ name, layers });
const ly = (o, r, z) => ({ o, r, z });
const row = (s, n) => Array(n).fill(s);

// Portrait friendly: at most 8 tiles wide, so tiles stay big on a phone.
export const LAYOUTS = [
  L('First Steps', ly([0, 0], row('####', 4)), ly([2, 2], ['##'])),
  L('Little Bridge', ly([0, 0], row('######', 3)), ly([2, 1], ['####']), ly([4, 1], ['##'])),
  L('Tea Cup', ly([0, 0], ['######', '######', '######', '.####.', '..##..']), ly([1, 1], ['#####', '#####'])),
  L('Little Pyramid', ly([0, 0], row('####', 5)), ly([1, 1], row('###', 4)), ly([2, 2], row('##', 3)), ly([3, 3], row('#', 2))),
  L('Little Garden', ly([0, 0], row('######', 5)), ly([2, 2], row('####', 3))),
  L('Star', ly([0, 0], ['##....##', '###..###', '.######.', '..####..', '..####..', '.######.', '###..###', '##....##']),
    ly([2, 2], ['#....#', '.#..#.', '..##..', '..##..', '.#..#.', '#....#']), ly([6, 6], ['##', '##'])),
  L('Moon', ly([0, 0], ['..####..', '.######.', '###..###', '##....##', '##....##', '##....##', '###..###', '.######.', '..####..']),
    ly([2, 2], ['.####.', '##..##', '#....#', '#....#', '#....#', '##..##', '.####.']),
    ly([5, 7], ['###', '###'], 0), ly([6, 8], ['##'], 1)),
  L('Heart', ly([0, 0], ['.##..##.', '########', '########', '########', '.######.', '..####..', '...##...']),
    ly([1, 1], ['.#...#.', '#######', '#######', '.#####.', '..###..']), ly([2, 2], ['######', '.####.', '..##..'])),
  L('Fortress', ly([0, 0], ['##.##.##', '########', '##....##', '##....##', '##....##', '##....##', '##....##', '##....##', '########', '##.##.##']),
    ly([0, 0], ['##....##', '##....##', '', '', '', '', '', '', '##....##', '##....##']),
    ly([1, 1], ['#.....#', '', '', '', '', '', '', '', '#.....#']), ly([6, 8], ['##', '##'], 0)),
  L('Butterfly', ly([0, 0], ['##....##', '###..###', '########', '.######.', '.######.', '########', '###..###', '##....##']),
    ly([1, 1], ['#.....#', '##...##', '.#####.', '.#####.', '##...##', '#.....#']), ly([6, 2], row('##', 4))),
  L('Diamond', ly([0, 0], ['...##...', '..####..', '.######.', '########', '########', '.######.', '..####..', '...##...']),
    ly([2, 2], ['..##..', '.####.', '######', '######', '.####.', '..##..']), ly([4, 4], ['.##.', '####', '####', '.##.']), ly([6, 6], ['##', '##'])),
  L('Lotus', ly([0, 0], ['..#..#..', '.######.', '########', '.######.', '.######.', '########', '.######.', '..#..#..']),
    ly([2, 2], ['.#..#.', '######', '.####.', '.####.', '######', '.#..#.']), ly([4, 4], ['.##.', '####', '####', '.##.']), ly([6, 6], ['##', '##'])),
  L('Koi Fish', ly([0, 0], ['...##...', '..####..', '.######.', '########', '########', '.######.', '..####..', '...##...', '..####..', '.##..##.']),
    ly([2, 2], ['..##..', '.####.', '######', '######', '.####.', '..##..']), ly([4, 4], ['.##.', '####', '####', '.##.']), ly([6, 7], ['##'])),
  L('Great Wall', ly([0, 0], ['########', '', '########', '', '########', '', '########', '', '########']),
    ly([2, 0], ['######', '', '######', '', '######', '', '######', '', '######']),
    ly([4, 0], ['####', '', '####', '', '####', '', '####', '', '####'])),
  L('Lantern', ly([0, 0], ['..##..', ...row('######', 6), '..##..']), ly([1, 2], row('#####', 6)), ly([2, 4], row('####', 4)), ly([3, 6], row('###', 2))),
  L('Bamboo', ly([0, 0], row('##.##.##', 10)), ly([1, 1], row('#..#..#', 8)), ly([1, 4], row('#..#..#', 6))),
  L('Pyramid', ly([0, 0], row('######', 7)), ly([1, 1], row('#####', 6)), ly([2, 2], row('####', 5)), ly([3, 3], row('###', 4)), ly([4, 4], row('##', 3))),
  L('Twin Towers', ly([0, 0], [...row('###..###', 4), '########', ...row('###..###', 4)]), ly([1, 1], row('##...##', 8)),
    ly([2, 2], row('#....#', 7)), ly([2, 3], row('#....#', 6))),
  L('Cross', ly([0, 0], [...row('..####..', 3), ...row('########', 4), ...row('..####..', 3)]),
    ly([2, 2], [...row('.####.', 2), ...row('######', 4), ...row('.####.', 2)]), ly([4, 2], row('####', 8)), ly([6, 4], row('##', 6)), ly([6, 8], ['##'])),
  L('Great Turtle', ly([0, 0], ['..####..', '.######.', ...row('########', 6), '.######.', '..####..']),
    ly([2, 2], ['.####.', ...row('######', 6), '.####.']), ly([4, 4], row('####', 6)), ly([6, 6], row('##', 4))),
];

export function parse(def) {
  const pos = [];
  def.layers.forEach((l, i) => {
    const z = l.z ?? i;
    l.r.forEach((s, r) => { for (let c = 0; c < s.length; c++) if (s[c] === '#') pos.push({ x: l.o[0] + c * 2, y: l.o[1] + r * 2, z }); });
  });
  return normalize(pos);
}
function normalize(pos) {
  const mx = Math.min(...pos.map((p) => p.x)), my = Math.min(...pos.map((p) => p.y));
  for (const p of pos) { p.x -= mx; p.y -= my; }
  return pos.sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);
}
export const layoutNamed = (name) => LAYOUTS.find((l) => l.name === name);

// ---------------------------------------------------------------- generated layouts (mirror symmetric)
const SHAPES = {
  oval: (u, v) => u * u + v * v <= 1.05,
  diamond: (u, v) => Math.abs(u) + Math.abs(v) <= 1.15,
  box: () => true,
  ring: (u, v) => { const d = u * u + v * v; return d <= 1.1 && d >= 0.22; },
  cross: (u, v) => Math.abs(u) < 0.45 || Math.abs(v) < 0.4,
  hourglass: (u, v) => Math.abs(u) <= Math.abs(v) + 0.3,
  wings: (u, v) => Math.abs(u) >= Math.abs(v) * 0.6 - 0.1,
  stripes: (u, v, r) => r % 3 !== 2,
};
const NAMES = { oval: 'Pearl', diamond: 'Jade', box: 'Courtyard', ring: 'Moon Gate', cross: 'Crossroads', hourglass: 'Hourglass', wings: 'Wings', stripes: 'Rice Fields' };

export function generate(rand, target) {
  for (let t = 0; t < 40; t++) {
    const shape = E.pick(rand, Object.keys(SHAPES));
    const cols = target < 40 ? 6 : E.pick(rand, [7, 8, 8]);
    const rows = Math.max(5, Math.min(10, Math.round(target < 40 ? 5 + target / 14 : 7 + rand() * 3)));
    const f = SHAPES[shape], pos = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < Math.ceil(cols / 2); c++) {
      const u = (c + 0.5 - cols / 2) / (cols / 2), v = (r + 0.5 - rows / 2) / (rows / 2);
      if (!f(u, v, r)) continue;
      pos.push({ x: c * 2, y: r * 2, z: 0 });
      if (cols - 1 - c !== c) pos.push({ x: (cols - 1 - c) * 2, y: r * 2, z: 0 });
    }
    if (pos.length < 12) continue;
    const W = cols * 2, has = (x, y, z) => pos.some((p) => p.x === x && p.y === y && p.z === z);
    // stack layers: aligned on top, or half-offset resting on four tiles
    for (let z = 1; z < 5 && pos.length < target; z++) {
      const half = rand() < 0.5, below = pos.filter((p) => p.z === z - 1);
      let cand = [];
      for (const p of below) {
        const x = p.x + (half ? 1 : 0), y = p.y + (half ? 1 : 0);
        const ok = half ? [[-1, -1], [1, -1], [-1, 1], [1, 1]].every(([dx, dy]) => has(x + dx, y + dy, z - 1)) : true;
        if (ok && x <= W - 2 - x) cand.push({ x, y, z });
      }
      if (!half) cand = cand.filter((p) => [[-2, 0], [2, 0], [0, -2], [0, 2]].filter(([dx, dy]) => has(p.x + dx, p.y + dy, z - 1)).length >= 3);
      if (!cand.length) break;
      for (const p of cand) {
        pos.push(p);
        const m = W - 2 - p.x;
        if (m !== p.x) pos.push({ x: m, y: p.y, z });
      }
    }
    // trim the top layers (mirror pairs) down to the target
    while (pos.length > target + 1) {
      const top = Math.max(...pos.map((p) => p.z));
      const tops = pos.filter((p) => p.z === top);
      const p = E.pick(rand, tops), m = W - 2 - p.x;
      pos.splice(pos.indexOf(p), 1);
      const q = pos.find((o) => o.z === top && o.x === m && o.y === p.y);
      if (q) pos.splice(pos.indexOf(q), 1);
    }
    if (pos.length % 2) {
      const top = Math.max(...pos.map((p) => p.z)), tops = pos.filter((p) => p.z === top);
      const mid = tops.find((p) => p.x === W - 2 - p.x) || E.pick(rand, tops);
      pos.splice(pos.indexOf(mid), 1);
    }
    if (pos.length < Math.min(target, 16) * 0.7) continue;
    return { name: NAMES[shape], pos: normalize(pos) };
  }
  return { name: 'Little Garden', pos: parse(layoutNamed('Little Garden')) };
}

// ---------------------------------------------------------------- the journey
// First levels follow a hand-made path (small → big), then hand-made and generated boards alternate.
export const PATH = ['First Steps', 'Little Bridge', 28, 'Tea Cup', 'Little Pyramid', 'Little Garden', 48, 'Star', 60, 'Moon',
  'Heart', 'Fortress', 64, 'Butterfly', 'Diamond', 'Lotus', 72, 'Koi Fish', 'Great Wall', 'Lantern', 80, 'Bamboo', 'Pyramid',
  88, 'Twin Towers', 'Cross', 96, 'Great Turtle'];
const BIG = LAYOUTS.filter((l) => parse(l).length >= 60).map((l) => l.name);

export const isHard = (n) => n >= 9 && n % 10 === 7;
export const isEasy = (n) => n > 10 && n % 10 === 1; // a breather after each chapter

// Share of faces that appear four times (the rest appear twice and can never trap you).
function quadShare(n) {
  if (n <= 3) return 0;
  if (n <= 30) return Math.min(1, 0.15 + (n - 4) * 0.035);
  return 1;
}
// Wanted chance that a random clicker clears the board; real players do much better.
function targetRate(n) {
  if (isHard(n)) return n < 30 ? 0.35 : 0.2;
  if (isEasy(n)) return 0.85;
  if (n <= 30) return 0.95 - (n - 1) * 0.015;
  return 0.45 + 0.1 * Math.sin(n * 1.3);
}

function boardFor(n, rand) {
  const p = n <= PATH.length ? PATH[n - 1] : (n % 2 ? 72 + Math.floor(rand() * 5) * 16 : E.pick(rand, BIG));
  if (isEasy(n) && n > PATH.length) return generate(rand, 48 + Math.floor(rand() * 3) * 8);
  return typeof p === 'number' ? generate(rand, p) : { name: p, pos: parse(layoutNamed(p)) };
}

// Pick the deal (out of a few) whose random-clicker win rate is closest to the target.
export function makeDeal(pos, rand, share, target, tries = 6, runs = 30, noBonus = false) {
  const g = E.geometry(pos);
  let best = null;
  for (let t = 0; t < tries; t++) {
    const faces = E.deal(g, rand, share, noBonus);
    if (!faces) continue;
    const rate = share === 0 ? 1 : E.winRate(g, faces, rand, runs);
    const score = Math.abs(rate - target);
    if (!best || score < best.score) best = { faces, rate, score };
    if (share === 0 || score < 0.04) break;
  }
  return best;
}

export function levelFor(n) {
  const rand = E.rng(n * 7919 + 17);
  const b = boardFor(n, rand);
  const d = makeDeal(b.pos, rand, quadShare(n), targetRate(n), 6, 30, n <= 3);
  return { n, name: b.name, pos: b.pos, faces: d.faces, rate: d.rate, hard: isHard(n) };
}

// One board per calendar day, the same for everybody.
export function dailyFor(dateKey) {
  const seed = Number(dateKey.replace(/-/g, ''));
  const rand = E.rng(seed * 31 + 7);
  const b = rand() < 0.5 ? { name: E.pick(rand, BIG), pos: null } : generate(rand, 80 + Math.floor(rand() * 4) * 16);
  if (!b.pos) b.pos = parse(layoutNamed(b.name));
  const d = makeDeal(b.pos, rand, 1, 0.4);
  return { name: b.name, pos: b.pos, faces: d.faces, rate: d.rate };
}

// Free play on a chosen layout with a fresh deal every time.
export function classicFor(name, seed) {
  const rand = E.rng(seed);
  const pos = parse(layoutNamed(name));
  const d = makeDeal(pos, rand, 1, 0.5, 4, 20);
  return { name, pos, faces: d.faces, rate: d.rate };
}
