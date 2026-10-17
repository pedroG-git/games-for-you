// node tools/test-dragon.js [maxLevel] - Dragon Match: generated levels are valid, deterministic and winnable by the AI
const MAX = Number(process.argv[2]) || 40;
(async () => {
  const E = await import('../www/games/dragon/js/engine.js');
  const Lv = await import('../www/games/dragon/js/levels.js');
  const fails = [];
  const t0 = Date.now();
  for (let n = 1; n <= MAX; n++) {
    const t = Date.now();
    const L = Lv.levelFor(n);
    const again = Lv.levelFor(n);
    if (JSON.stringify(L) !== JSON.stringify(again)) fails.push(n + ': not deterministic');
    const S = E.createState(L, 123);
    if (S.tiles.some((x, i) => x && !E.inBoard(S, Math.floor(i / E.W), i % E.W))) fails.push(n + ': tile outside board');
    if (!E.hasMove(S)) fails.push(n + ': no first move');
    // Can the AI win with the given moves? (other seeds than the balancing runs)
    const tries = [11, 22, 33, 44, 55, 66].map((s) => Lv.simulate(L, s));
    const wins = tries.filter((m) => m <= L.moves).length;
    if (!wins) fails.push(n + ': AI never wins');
    const goals = L.goals.map((g) => g.t + (g.t === 'gem' ? g.c : '') + ':' + g.n).join(' ');
    console.log(`L${String(n).padStart(3)} ${L.hard ? 'H' : L.tricky ? 't' : ' '} ${L.shape.padEnd(7)} c${L.colors} moves ${String(L.moves).padStart(2)}  AI ${tries.join(',').padEnd(18)} win ${wins}/6  ${goals}  ${Date.now() - t}ms`);
  }
  console.log(`${MAX} levels in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  if (fails.length) { console.log('FAIL\n' + fails.join('\n')); process.exit(1); }
  console.log('OK');
})();
