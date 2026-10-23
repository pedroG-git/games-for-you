// Piece shapes and the tray generator. A shape is a list of [row, col] cells.
export const N = 8;

export const COLORS = ['#ff4d5e', '#ff9a2e', '#ffd23a', '#4fd65a', '#2ec9e8', '#3f7cff', '#a35cff'];

// Cell values: 0 empty, 1–7 placed block (colour k+1), GOLD = golden block (Classic bonus),
// 11–17 Adventures target block, STONE needs two clears (first one cracks it), CRACKED needs one more.
export const GOLD = 9, STONE = 20, CRACKED = 21;
export const GOLD_COLOR = '#ffc21f';
export const isTarget = (v) => v >= 11;
export const colorOf = (v) => (v >= STONE ? '#9aa0b5' : v >= 11 ? COLORS[v - 11] : v === GOLD ? GOLD_COLOR : COLORS[v - 1]);
/** Themes swap the block colours in place (COLORS keeps its identity, so colorOf follows). */
export function setColors(list) { COLORS.splice(0, COLORS.length, ...list); }

// Shapes drawn as text so they're easy to read; every orientation is listed (no player rotation).
const ART = [
  // [weight, rows...]
  [3, '#'],
  [4, '##'], [4, '#|#'],
  [4, '###'], [4, '#|#|#'],
  [3, '####'], [3, '#|#|#|#'],
  [2, '#####'], [2, '#|#|#|#|#'],
  [5, '##|##'],
  [2, '###|###|###'],
  [2, '###|###'], [2, '##|##|##'],
  [3, '##|#.'], [3, '##|.#'], [3, '#.|##'], [3, '.#|##'],
  [2, '#.|#.|##'], [2, '.#|.#|##'], [2, '##|#.|#.'], [2, '##|.#|.#'],
  [2, '###|#..'], [2, '###|..#'], [2, '#..|###'], [2, '..#|###'],
  [2, '###|.#.'], [2, '.#.|###'], [2, '#.|##|#.'], [2, '.#|##|.#'],
  [2, '##.|.##'], [2, '.##|##.'], [2, '#.|##|.#'], [2, '.#|##|#.'],
  [1, '###|#..|#..'], [1, '###|..#|..#'], [1, '#..|#..|###'], [1, '..#|..#|###'],
];

export const SHAPES = ART.map(([w, art]) => {
  const cells = [];
  art.split('|').forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '#') cells.push([r, c]); }));
  return { w, cells, h: Math.max(...cells.map((p) => p[0])) + 1, wd: Math.max(...cells.map((p) => p[1])) + 1 };
});
const TOTAL = SHAPES.reduce((s, p) => s + p.w, 0);

function randomShape(rng) {
  let r = rng() * TOTAL;
  for (let i = 0; i < SHAPES.length; i++) { r -= SHAPES[i].w; if (r < 0) return i; }
  return 0;
}

export function fits(grid, shape, row, col) {
  for (const [r, c] of SHAPES[shape].cells) {
    const y = row + r, x = col + c;
    if (y < 0 || x < 0 || y >= N || x >= N || grid[y * N + x]) return false;
  }
  return true;
}

export function fitsAnywhere(grid, shape) {
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (fits(grid, shape, r, c)) return true;
  return false;
}

export function fullLines(grid) {
  const rows = [], cols = [];
  for (let r = 0; r < N; r++) { let f = true; for (let c = 0; c < N; c++) if (!grid[r * N + c]) { f = false; break; } if (f) rows.push(r); }
  for (let c = 0; c < N; c++) { let f = true; for (let r = 0; r < N; r++) if (!grid[r * N + c]) { f = false; break; } if (f) cols.push(c); }
  return { rows, cols };
}
export function lineCells({ rows, cols }) {
  const set = new Set();
  for (const r of rows) for (let c = 0; c < N; c++) set.add(r * N + c);
  for (const c of cols) for (let r = 0; r < N; r++) set.add(r * N + c);
  return set;
}

// Clears every full row/column in place. Stones crack instead of vanishing.
export function clearLines(grid) {
  const lines = fullLines(grid), L = lines.rows.length + lines.cols.length;
  const gone = [], vals = [], cracked = [];
  let hit = 0;
  for (const j of lineCells(lines)) {
    const v = grid[j];
    if (v === STONE) { grid[j] = CRACKED; cracked.push(j); continue; }
    if (isTarget(v)) hit++;
    gone.push(j); vals.push(v); grid[j] = 0;
  }
  return { L, gone, vals, cracked, hit };
}

// Is there a spot where this shape completes a line that holds a target block?
function helps(grid, s) {
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (!fits(grid, s, r, c)) continue;
    const g = grid.slice();
    for (const [y, x] of SHAPES[s].cells) g[(r + y) * N + c + x] = 1;
    for (const j of lineCells(fullLines(g))) if (isTarget(g[j])) return true;
  }
  return false;
}

// Three random pieces; at least one is guaranteed to fit the current board.
// help (0–1) = chance that one piece is swapped for one that clears a line through target blocks.
export function dealTray(grid, rng = Math.random, help = 0) {
  const tray = deal(grid, rng);
  if (help && rng() < help) {
    const order = SHAPES.map((_, i) => i).sort(() => rng() - 0.5);
    const s = order.find((i) => helps(grid, i));
    if (s !== undefined) tray[Math.floor(rng() * 3)].s = s;
  }
  return tray;
}

function deal(grid, rng) {
  const pick = () => ({ s: randomShape(rng), k: Math.floor(rng() * COLORS.length) });
  for (let tries = 0; tries < 60; tries++) {
    const tray = [pick(), pick(), pick()];
    if (tray.some((p) => fitsAnywhere(grid, p.s))) return tray;
  }
  // Very full board: swap one piece for the biggest shape that still fits.
  const tray = [pick(), pick(), pick()];
  const ok = SHAPES.map((_, i) => i).filter((i) => fitsAnywhere(grid, i))
    .sort((a, b) => SHAPES[b].cells.length - SHAPES[a].cells.length);
  if (ok.length) tray[Math.floor(rng() * 3)].s = ok[0];
  return tray;
}
