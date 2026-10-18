// node tools/test-mahjong.js [maxLevel] - Mahjong: layouts are valid, deals are solvable, levels are fast to make
const MAX = Number(process.argv[2]) || 40;
(async () => {
  const E = await import('../www/games/mahjong/js/engine.js');
  const Lv = await import('../www/games/mahjong/js/levels.js');
  const fails = [];
  const check = (name, pos) => {
    if (pos.length % 2) fails.push(`${name}: odd tile count ${pos.length}`);
    for (let i = 0; i < pos.length; i++) for (let j = i + 1; j < pos.length; j++) {
      const a = pos[i], b = pos[j];
      if (a.z === b.z && Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2) { fails.push(`${name}: tiles overlap at ${a.x},${a.y},${a.z}`); return; }
    }
  };
  for (const l of Lv.LAYOUTS) {
    const pos = Lv.parse(l);
    check(l.name, pos);
    const g = E.geometry(pos);
    const cols = (Math.max(...pos.map((p) => p.x)) + 2) / 2, rows = (Math.max(...pos.map((p) => p.y)) + 2) / 2;
    const ok = E.removalOrder(g, new Uint8Array(g.n).fill(1), E.rng(5));
    if (!ok) fails.push(`${l.name}: no removal order`);
    console.log(`${l.name.padEnd(15)} ${String(pos.length).padStart(3)} tiles  ${cols}x${rows}  layers ${Math.max(...pos.map((p) => p.z)) + 1}`);
  }
  const t0 = Date.now();
  for (let n = 1; n <= MAX; n++) {
    const t = Date.now();
    const L = Lv.levelFor(n);
    const ms = Date.now() - t;
    if (JSON.stringify(L.faces) !== JSON.stringify(Lv.levelFor(n).faces)) fails.push(n + ': not deterministic');
    check('L' + n, L.pos);
    const g = E.geometry(L.pos), alive = new Uint8Array(g.n).fill(1);
    const counts = {};
    for (const f of L.faces) counts[E.classOf(f)] = (counts[E.classOf(f)] || 0) + 1;
    if (Object.values(counts).some((c) => c !== 2 && c !== 4)) fails.push(n + ': bad face counts');
    const s = E.solve(g, L.faces, alive, 200000);
    if (s.ok === false) fails.push(n + ': deal not solvable');
    const h = E.hint(g, L.faces, alive);
    if (!h || h.ok === false) fails.push(n + ': no good hint');
    const quads = Object.values(counts).filter((c) => c === 4).length;
    console.log(`L${String(n).padStart(3)} ${L.hard ? 'H' : ' '} ${L.name.padEnd(14)} ${String(L.pos.length).padStart(3)} tiles quads ${String(quads).padStart(2)}  rate ${L.rate.toFixed(2)}  solver ${s.ok} ${s.nodes}n  ${ms}ms`);
  }
  // a stuck board must still reshuffle into a solvable one
  const L = Lv.levelFor(25), g = E.geometry(L.pos), alive = new Uint8Array(g.n).fill(1), rand = E.rng(9);
  for (let k = 0; k < 20; k++) { const p = E.pairs(g, L.faces, alive); if (!p.length) break; const [a, b] = E.pick(rand, p); alive[a] = 0; alive[b] = 0; }
  const nf = E.reshuffle(g, L.faces, alive, rand);
  if (!nf || E.solve(g, nf, alive, 200000).ok !== true) fails.push('reshuffle not solvable');
  const flat = E.flatLayout(10), fg = E.geometry(flat);
  if (!E.removalOrder(fg, new Uint8Array(10).fill(1), rand)) fails.push('flat layout stuck');
  for (let k = 0; k < 30; k++) { const G = Lv.generate(E.rng(k), 40 + k * 4); check('gen' + k, G.pos); }
  console.log(`${MAX} levels in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  if (fails.length) { console.log('FAIL\n' + fails.join('\n')); process.exit(1); }
  console.log('OK');
})();
