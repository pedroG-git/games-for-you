// Piece shapes and the tray generator. A shape is a list of [row, col] cells.
export const N = 8;

export const COLORS = ['#ff4d5e', '#ff9a2e', '#ffd23a', '#4fd65a', '#2ec9e8', '#3f7cff', '#a35cff'];

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

function randomShape() {
  let r = Math.random() * TOTAL;
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

// Three random pieces; at least one is guaranteed to fit the current board.
export function dealTray(grid) {
  for (let tries = 0; tries < 60; tries++) {
    const tray = [0, 1, 2].map(() => ({ s: randomShape(), k: Math.floor(Math.random() * COLORS.length) }));
    if (tray.some((p) => fitsAnywhere(grid, p.s))) return tray;
  }
  // Very full board: swap one piece for the biggest shape that still fits.
  const tray = [0, 1, 2].map(() => ({ s: randomShape(), k: Math.floor(Math.random() * COLORS.length) }));
  const ok = SHAPES.map((_, i) => i).filter((i) => fitsAnywhere(grid, i))
    .sort((a, b) => SHAPES[b].cells.length - SHAPES[a].cells.length);
  if (ok.length) tray[Math.floor(Math.random() * 3)].s = ok[0];
  return tray;
}
