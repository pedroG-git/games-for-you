// Game-state rules without any DOM: a move, undo and dealing. main.js adds the effects on top;
// tools/test-blocos.js tests these directly.
import { N, SHAPES, GOLD, GEM, isGem, clearLines, dealTray, addGem } from './pieces.js';
import { DIFFS } from './levels.js';

const K = 1.05;
// Points actually added for one move (rounded once per move; Classic only).
export const gain = (S, n) => (S.adv ? n : Math.round(n * K));

const GOLD_DEAL = 0.18;
export function deal(S, rng = Math.random) {
  const a = S.adv;
  if (!a) {
    const tray = dealTray(S.grid, rng, 0);
    if (rng() < GOLD_DEAL) {
      const p = tray[Math.floor(rng() * tray.length)];
      if (p) p.g = Math.floor(rng() * SHAPES[p.s].cells.length);
    }
    return tray;
  }
  const tray = dealTray(S.grid, rng, DIFFS[a.diff].help, S.ice);
  return a.gems ? addGem(tray, S.grid, a.gems, rng) : tray;
}

// Place tray piece i at (row, col). Mutates S synchronously; returns what happened (for effects).
export function move(S, i, row, col) {
  const p = S.tray[i], sh = SHAPES[p.s], a = S.adv;
  S.undo = {
    grid: S.grid.slice(), tray: S.tray.slice(), score: S.score, combo: S.combo, miss: S.miss, dealt: false,
    lines: S.lines || 0, maxCombo: S.maxCombo || 0, ice: S.ice ? S.ice.slice() : null,
    left: a && a.left, moves: a && a.moves, gems: a && a.gems,
  };
  const placed = [];
  sh.cells.forEach(([r, c], n) => {
    const j = (row + r) * N + col + c;
    S.grid[j] = n === p.g ? GOLD : n === p.gem ? GEM + p.k + 1 : p.k + 1;
    placed.push(j);
  });
  const pre = S.grid.slice(), preIce = S.ice ? S.ice.slice() : null;
  S.tray[i] = null;
  if (a && a.moves !== null) a.moves--;

  const res = clearLines(S.grid, S.ice), L = res.L;
  let raw = sh.cells.length, allClear = false, golden = false, gift = false;
  if (L) {
    S.combo += 1; S.miss = 0;
    let pts = 10 * L * (L + 1) / 2 * S.combo;
    allClear = S.grid.every((v) => !v);
    if (allClear) pts += 300;
    golden = !a && res.vals.includes(GOLD);
    if (golden) pts *= 2;
    raw += pts;
    S.maxCombo = Math.max(S.maxCombo || 0, S.combo);
    if (a) {
      a.left -= res.hit;
      if (a.gems) a.gems = Math.max(0, a.gems - res.gems);
    } else {
      const before = S.lines || 0;
      S.lines = before + L;
      gift = Math.floor(S.lines / 20) > Math.floor(before / 20);
    }
  } else if (++S.miss >= 3) {
    S.combo = 0;
  }
  const gained = gain(S, raw);
  S.score += gained;
  return { p, sh, row, col, placed, pre, preIce, res, L, allClear, golden, gift, gained, combo: S.combo };
}

// After a move: an empty tray gets the pieces saved by undo, or new ones. Returns true if dealt.
export function refill(S, rng = Math.random) {
  if (!S.tray.every((t) => !t)) return false;
  S.undo.dealt = true;
  if (S.pending) { S.tray = S.pending; S.pending = null; } else { S.tray = deal(S, rng); S.undoReady = true; }
  return true;
}

export function canUndo(S) { return !!(S.undo && S.undoReady && !S.won && S.why !== 'time'); }

export function undoMove(S) {
  const u = S.undo;
  if (u.dealt) S.pending = S.tray.slice();
  Object.assign(S, { grid: u.grid, tray: u.tray, score: u.score, combo: u.combo, miss: u.miss });
  if ('lines' in u) { S.lines = u.lines; S.maxCombo = u.maxCombo; }
  if (u.ice) S.ice = u.ice;
  if (S.adv) { S.adv.left = u.left; S.adv.moves = u.moves; if (u.gems !== undefined) S.adv.gems = u.gems; }
  S.undo = null; S.undoReady = false; S.over = false; S.why = '';
}

export const gemCells = (grid) => grid.filter(isGem).length;
