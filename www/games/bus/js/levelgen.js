// Bus - endless level generator; every level is built from a known solution and verified with Rules
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./rules.js'));
  else root.LevelGen = factory(root.Rules);
})(typeof self !== 'undefined' ? self : this, function (Rules) {
  const DIRS = Rules.DIRS;
  const DIR_KEYS = ['U', 'D', 'L', 'R'];

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const int = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
  function shuffle(rng, arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function params(n, rng) {
    const t = Math.min(1, (n - 1) / 25);
    let cols = 6 + Math.round(4 * t);
    let rows = 7 + Math.round(5 * t);
    if (n > 25) {
      cols = int(rng, 10, 11);
      rows = int(rng, 12, 13);
    }
    return {
      cols,
      rows,
      maxBuses: Math.round(10 + 70 * t),
      colors: Math.min(8, 4 + Math.floor((n - 1) / 4)),
      slots: n >= 30 && rng() < 0.4 ? 4 : 5,
      len3: 0.1 * t,
      // how passengers are mixed: long single-bus runs early, short interleaved runs later
      maxRun: n <= 2 ? 99 : Math.max(1, Math.round(4 - 3 * t)),
      stick: 0.5 - 0.4 * t, // chance of continuing with the same bus after a run
    };
  }

  // Place buses one by one; each new bus needs a clear exit through the buses placed so far.
  // Removal order = reverse placement order, so the level is always clearable.
  function placeBuses(p, rng) {
    const { cols, rows } = p;
    const occ = new Int8Array(cols * rows);
    const cx = (cols - 1) / 2;
    const cy = (rows - 1) / 2;
    const cells = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) cells.push([x, y, Math.abs(x - cx) + Math.abs(y - cy) + rng() * 1.5]);
    cells.sort((a, b) => a[2] - b[2]);
    const placed = [];
    const free = (x, y) => x >= 0 && y >= 0 && x < cols && y < rows && !occ[y * cols + x];
    for (const [cx0, cy0] of cells) {
      if (placed.length >= p.maxBuses) break;
      if (!free(cx0, cy0)) continue;
      const options = [];
      for (const dir of DIR_KEYS) {
        for (const len of [2, 3]) {
          for (let k = 0; k < len; k++) options.push({ dir, len, k, w: rng() + (len === 3 ? p.len3 : 0) });
        }
      }
      options.sort((a, b) => b.w - a.w);
      for (const o of options) {
        const [dx, dy] = DIRS[o.dir];
        // (cx0,cy0) is the k-th cell behind the head
        const hx = cx0 + dx * o.k;
        const hy = cy0 + dy * o.k;
        let ok = true;
        for (let i = 0; i < o.len && ok; i++) ok = free(hx - dx * i, hy - dy * i);
        for (let x = hx + dx, y = hy + dy; ok && x >= 0 && y >= 0 && x < cols && y < rows; x += dx, y += dy) ok = !occ[y * cols + x];
        if (!ok) continue;
        for (let i = 0; i < o.len; i++) occ[(hy - dy * i) * cols + (hx - dx * i)] = 1;
        placed.push({ x: hx, y: hy, dir: o.dir, len: o.len });
        break;
      }
    }
    return placed;
  }

  function build(n, sub) {
    const rng = mulberry32((n * 2654435761) ^ (sub * 40503) ^ 0x5bd1e995);
    const p = params(n, rng);
    const placed = placeBuses(p, rng);
    // ids follow grid reading order so they reveal nothing about the solution
    const order = placed.map((_, i) => i).reverse(); // removal order as indices into placed
    const ids = placed.map((_, i) => i).sort((a, b) => placed[a].y - placed[b].y || placed[a].x - placed[b].x);
    const idOf = new Array(placed.length);
    ids.forEach((pi, id) => (idOf[pi] = id));
    const colors = Math.min(p.colors, placed.length);
    const colorOf = placed.map(() => int(rng, 0, colors - 1));
    shuffle(rng, colorOf);
    for (let c = 0; c < colors; c++) colorOf[c] = c; // every color appears at least once
    shuffle(rng, colorOf);
    const buses = ids.map((pi, id) => {
      const b = placed[pi];
      return { id, x: b.x, y: b.y, dir: b.dir, len: b.len, color: colorOf[pi], cap: b.len === 3 ? (rng() < 0.7 ? 6 : 8) : 4 };
    });
    const solution = order.map((pi) => idOf[pi]);

    // Build the passenger line by playing the solution: tap the next bus whenever a slot is free,
    // then add one passenger for a parked bus that still has seats (in runs, mixing buses).
    const level = { n, cols: p.cols, rows: p.rows, slots: p.slots, colors, buses, queue: [] };
    const st = Rules.createState(level);
    const queue = [];
    let next = 0;
    let runBus = -1;
    let runLeft = 0;
    for (;;) {
      while (next < solution.length && st.slots.indexOf(null) >= 0) {
        if (!Rules.tapBus(st, solution[next]).ok) return null;
        next++;
      }
      const open = st.slots.filter((id) => id !== null).map((id) => st.buses[id]);
      if (!open.length) break;
      if (runLeft <= 0 || !open.some((b) => b.id === runBus)) {
        const pick = runBus >= 0 && open.some((b) => b.id === runBus) && rng() < p.stick ? st.buses[runBus] : open[int(rng, 0, open.length - 1)];
        runBus = pick.id;
        runLeft = int(rng, 1, p.maxRun);
      }
      const color = st.buses[runBus].color;
      st.queue.push(color);
      queue.push(color);
      runLeft--;
      if (!Rules.boardNext(st)) return null;
    }
    level.queue = queue;
    level.solution = solution;
    return verify(level) ? level : null;
  }

  // replays the stored solution with Rules only: tap whenever a slot is free, board one passenger, repeat
  function verify(level) {
    const st = Rules.createState(level);
    let next = 0;
    for (let guard = 0; guard < 100000; guard++) {
      while (next < level.solution.length && st.slots.indexOf(null) >= 0) {
        if (!Rules.tapBus(st, level.solution[next]).ok) return false;
        next++;
      }
      const s = Rules.status(st);
      if (s === 'won') return next === level.solution.length;
      if (s === 'lost' || !Rules.boardNext(st)) return false;
    }
    return false;
  }

  function generate(n) {
    n = Math.max(1, Math.floor(n) || 1);
    for (let sub = 0; sub < 50; sub++) {
      const level = build(n, sub);
      if (level) return level;
    }
    throw new Error('LevelGen: could not build level ' + n);
  }

  return { generate, verify };
});
