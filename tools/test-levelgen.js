// node tools/test-levelgen.js [maxLevel] - checks generated levels: invariants, solvability, determinism, difficulty
const Rules = require('../www/games/bus/js/rules.js');
const LevelGen = require('../www/games/bus/js/levelgen.js');

const MAX = Number(process.argv[2]) || 300;
const fails = [];
const bands = {};

function checkInvariants(L) {
  const seen = new Set();
  const per = {};
  for (const b of L.buses) {
    if (!['U', 'D', 'L', 'R'].includes(b.dir) || ![2, 3].includes(b.len)) return 'bad bus ' + b.id;
    if (b.color < 0 || b.color >= L.colors || b.color > 7) return 'bad color ' + b.id;
    for (const [x, y] of Rules.cellsOf(b)) {
      if (x < 0 || y < 0 || x >= L.cols || y >= L.rows) return 'out of bounds ' + b.id;
      const k = x + ',' + y;
      if (seen.has(k)) return 'overlap at ' + k;
      seen.add(k);
    }
    per[b.color] = (per[b.color] || 0) + b.cap;
  }
  if (L.buses.some((b, i) => b.id !== i)) return 'ids not 0..n-1';
  const q = {};
  for (const c of L.queue) q[c] = (q[c] || 0) + 1;
  for (const c of Object.keys({ ...per, ...q })) if (per[c] !== q[c]) return 'color ' + c + ' caps ' + per[c] + ' vs queue ' + q[c];
  if (L.slots < 4) return 'too few slots';
  return null;
}

// replay the stored solution using only the Rules API (eager boarding, tap when stalled)
function solvesLazily(L) {
  const st = Rules.createState(L);
  let next = 0;
  for (;;) {
    while (Rules.boardNext(st));
    const s = Rules.status(st);
    if (s === 'won') return true;
    if (s === 'lost' || next >= L.solution.length) return false;
    const r = Rules.tapBus(st, L.solution[next++]);
    if (!r.ok) return false;
  }
}

// a careless player: taps random tappable buses, boarding happens automatically
function randomPlayerWins(L, seed) {
  let a = seed;
  const rnd = () => ((a = (a * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const st = Rules.createState(L);
  for (;;) {
    while (Rules.boardNext(st));
    const s = Rules.status(st);
    if (s !== 'playing') return s === 'won';
    const opts = st.buses.filter((b) => Rules.canExit(st, b.id));
    if (!opts.length) return false;
    Rules.tapBus(st, opts[Math.floor(rnd() * opts.length)].id);
  }
}

// a player who follows the hint every time
function hintPlayerWins(L) {
  const st = Rules.createState(L);
  for (;;) {
    while (Rules.boardNext(st));
    const s = Rules.status(st);
    if (s !== 'playing') return s === 'won';
    const h = Rules.hint(st);
    if (h === null || !Rules.tapBus(st, h).ok) return false;
  }
}

let maxMs = 0;
for (let n = 1; n <= MAX; n++) {
  const t0 = process.hrtime.bigint();
  const L = LevelGen.generate(n);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  maxMs = Math.max(maxMs, ms);
  const err = checkInvariants(L);
  if (err) fails.push(`L${n}: ${err}`);
  if (!LevelGen.verify(L)) fails.push(`L${n}: stored solution fails (eager taps)`);
  if (JSON.stringify(L) !== JSON.stringify(LevelGen.generate(n))) fails.push(`L${n}: not deterministic`);
  const lo = n <= 5 ? 1 : n <= 15 ? 6 : n <= 30 ? 16 : n <= 45 ? 31 : n <= 100 ? 46 : 101;
  const key = `${lo}-${{ 1: 5, 6: 15, 16: 30, 31: 45, 46: 100, 101: MAX }[lo]}`;
  const b = (bands[key] = bands[key] || { n: 0, grid: new Set(), buses: 0, fill: 0, colors: new Set(), slots: new Set(), ms: 0, rnd: 0, hint: 0, pax: 0 });
  b.n++;
  b.grid.add(`${L.cols}x${L.rows}`);
  b.buses += L.buses.length;
  b.fill += L.buses.reduce((s, x) => s + x.len, 0) / (L.cols * L.rows);
  b.colors.add(L.colors);
  b.slots.add(L.slots);
  b.ms += ms;
  b.pax += L.queue.length;
  let w = 0;
  for (let s = 1; s <= 10; s++) w += randomPlayerWins(L, s * 7919 + n);
  b.rnd += w / 10;
  b.hint += hintPlayerWins(L) ? 1 : 0;
}

console.log('band      grids            buses  fill  colors  slots  pax   rand-win  hint-win  avg ms');
for (const [k, b] of Object.entries(bands)) {
  console.log(
    k.padEnd(9),
    [...b.grid].slice(0, 3).join(',').padEnd(16),
    (b.buses / b.n).toFixed(1).padStart(5),
    ((b.fill / b.n) * 100).toFixed(0).padStart(4) + '%',
    [...b.colors].join('/').padStart(7),
    [...b.slots].join('/').padStart(6),
    String(Math.round(b.pax / b.n)).padStart(4),
    ((b.rnd / b.n) * 100).toFixed(0).padStart(8) + '%',
    ((b.hint / b.n) * 100).toFixed(0).padStart(8) + '%',
    (b.ms / b.n).toFixed(2).padStart(7)
  );
}
console.log(`max gen ms: ${maxMs.toFixed(1)}`);
if (fails.length) {
  console.log(`FAIL (${fails.length}):\n` + fails.slice(0, 20).join('\n'));
  process.exit(1);
}
console.log(`OK: ${MAX} levels valid, solvable, deterministic`);
