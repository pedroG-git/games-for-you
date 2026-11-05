// node tools/test-blocos.js [boards] - Blocos: every tray has a fitting piece, Classic score gain, undo/resume, ice + gem goals
const BOARDS = Number(process.argv[2]) || 3000;
(async () => {
  const P = await import('../www/games/blocos/js/pieces.js');
  const Lv = await import('../www/games/blocos/js/levels.js');
  const R = await import('../www/games/blocos/js/rules.js');
  const { N, SHAPES, fits, fitsAnywhere, fullLines, dealTray, clearLines, isGem } = P;
  const rngFrom = Lv._test.rngFrom;
  const fails = [];
  const ok = (c, m) => { if (!c) fails.push(m); };

  // 10. every dealt tray has at least one piece that fits, over many random boards (incl. near-full ones)
  let trays = 0;
  for (let b = 0; b < BOARDS; b++) {
    const rng = rngFrom(1000 + b), dens = rng();
    const g = Array(N * N).fill(0).map(() => (rng() < dens ? 1 + Math.floor(rng() * 7) : 0));
    while (true) { const { rows, cols } = fullLines(g); if (!rows.length && !cols.length) break; clearLines(g); }
    if (g.every(Boolean)) continue;
    for (const help of [0, 0.5, 1]) {
      const tray = dealTray(g, rng, help);
      trays++;
      ok(tray.length === 3 && tray.some((p) => fitsAnywhere(g, p.s)), `board ${b} help ${help}: no piece fits`);
    }
  }
  // also boards from real play: a Classic game played randomly until stuck
  for (let gm = 0; gm < 200; gm++) {
    const rng = rngFrom(77 + gm), S = { grid: Array(N * N).fill(0), score: 0, combo: 0, miss: 0, adv: null, undoReady: true, pending: null };
    S.tray = R.deal(S, rng);
    ok(S.tray.some((p) => fitsAnywhere(S.grid, p.s)), `game ${gm}: first tray has no fit`);
    for (let m = 0; m < 400; m++) {
      const opts = [];
      S.tray.forEach((p, i) => { if (p) for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (fits(S.grid, p.s, r, c)) opts.push([i, r, c]); });
      if (!opts.length) break;
      const [i, r, c] = opts[Math.floor(rng() * opts.length)];
      R.move(S, i, r, c);
      if (R.refill(S, rng)) { trays++; ok(S.tray.some((p) => fitsAnywhere(S.grid, p.s)), `game ${gm}: fresh tray has no fit`); }
    }
  }

  // 8. Classic gain: round(raw * 1.05) once per move; Adventures unchanged; undo + resume keep the stored score
  const classic = () => ({ grid: Array(N * N).fill(0), tray: [], score: 0, combo: 0, miss: 0, adv: null, undoReady: true, pending: null, lines: 0 });
  const one = SHAPES.findIndex((s) => s.cells.length === 1), bar = SHAPES.findIndex((s) => s.cells.length === 4 && s.h === 1);
  {
    const S = classic();
    S.tray = [{ s: one, k: 0 }, { s: one, k: 1 }, { s: one, k: 2 }];
    R.move(S, 0, 0, 0);
    ok(S.score === Math.round(1 * 1.05), `single cell gain ${S.score}`);
    // fill row 1 except one cell, then complete it: raw = 1 + 10 = 11 -> 12
    for (let c = 0; c < 7; c++) S.grid[N + c] = 1;
    const before = S.score;
    R.move(S, 1, 1, 7);
    ok(S.score - before === Math.round(11 * 1.05), `line gain ${S.score - before} != ${Math.round(11 * 1.05)}`);
    const after = S.score;
    R.undoMove(S);
    ok(S.score === before, `undo restores score (${S.score} != ${before})`);
    R.move(S, 1, 1, 7);
    ok(S.score === after, `redo after undo gives same score (${S.score} != ${after})`);
    const resumed = JSON.parse(JSON.stringify(S));
    ok(resumed.score === after, 'resume keeps stored score');
    resumed.tray[2] = { s: one, k: 3 };
    R.move(resumed, 2, 5, 5);
    ok(resumed.score === after + 1, `resumed game adds normally (${resumed.score - after})`);
    // bigger move: 4-bar completing two lines with combo
    const T = classic();
    for (let c = 4; c < N; c++) { T.grid[c] = 1; T.grid[N + c] = 1; }
    T.tray = [{ s: bar, k: 0 }, null, null];
    const sq = SHAPES.findIndex((s) => s.cells.length === 4 && s.h === 2 && s.wd === 2);
    for (let c = 0; c < 2; c++) { T.grid[c] = 1; T.grid[N + c] = 1; }
    T.tray[0] = { s: sq, k: 0 };
    T.combo = 2;
    R.move(T, 0, 0, 2);
    const raw = 4 + 10 * 2 * 3 / 2 * 3 + 300; // two lines, combo 3, board cleared
    ok(T.score === Math.round(raw * 1.05), `two-line combo gain ${T.score} != ${Math.round(raw * 1.05)}`);
  }
  {
    const S = { grid: Array(N * N).fill(0), tray: [{ s: one, k: 0 }], score: 0, combo: 0, miss: 0, undoReady: true, pending: null,
      adv: { mode: 'moves', diff: 2, left: 5, total: 5, moves: 10, gems: 0 } };
    for (let c = 0; c < 7; c++) S.grid[c] = 11;
    S.grid[N * 5] = 1;
    R.move(S, 0, 0, 7);
    ok(S.score === 11, `adventure score not boosted (${S.score})`);
    ok(S.adv.left === 5 - 7, `adventure left counts raw hits (${S.adv.left})`);
  }

  // 7. ice and gems: rules + the AI balancing
  {
    const S = { grid: Array(N * N).fill(0), tray: [{ s: one, k: 0, gem: 0 }, { s: one, k: 1 }, null], score: 0, combo: 0, miss: 0,
      undoReady: true, pending: null, ice: Array(N * N).fill(0), adv: { mode: 'relaxed', diff: 2, left: 3, total: 3, moves: null, gems: 1 } };
    S.ice[3] = 2;
    for (let c = 0; c < 7; c++) S.grid[c] = 1;
    R.move(S, 0, 0, 7); // gem placed in a completing line: gem collected + ice melts one layer
    ok(S.ice[3] === 1 && S.adv.left === 1 && S.adv.gems === 0, `ice/gem first clear: ice ${S.ice[3]} left ${S.adv.left} gems ${S.adv.gems}`);
    R.undoMove(S);
    ok(S.ice[3] === 2 && S.adv.left === 3 && S.adv.gems === 1, 'undo restores ice, left and gems');
    R.move(S, 0, 0, 7);
    for (let c = 0; c < 7; c++) S.grid[c] = 1;
    R.move(S, 1, 0, 7);
    ok(S.ice[3] === 0 && S.adv.left === 0, `second clear melts the ice (ice ${S.ice[3]} left ${S.adv.left})`);
    // gem dealing: only while more gems are needed than on the board
    const g = Array(N * N).fill(0);
    ok(P.addGem(dealTray(g, rngFrom(5)), g, 1, rngFrom(6)).some((p) => p.gem !== undefined), 'gem piece dealt when needed');
    g[0] = P.GEM + 1;
    ok(!P.addGem(dealTray(g, rngFrom(5)), g, 1, rngFrom(6)).some((p) => p.gem !== undefined), 'no gem piece when board has enough');
    ok(isGem(P.GEM + 1) && P.isTarget(P.GEM + 1) && !isGem(P.GOLD), 'gem values');
  }
  let iceLv = 0, gemLv = 0, allWins = 0, allRuns = 0;
  for (const mode of ['moves', 'time', 'relaxed']) for (let n = 1; n <= 30; n++) {
    const ex = Lv.extras(n);
    if (!ex.ice && !ex.gems) continue;
    const info = Lv.levelInfo(mode, n, 2);
    if (ex.ice) { iceLv++; ok(info.ice && info.ice.filter((v) => v === 2).length === ex.ice, `${mode} ${n}: ice count`); ok(info.ice.every((v, j) => !v || !info.grid[j]), `${mode} ${n}: ice on a block`); }
    if (ex.gems) { gemLv++; ok(info.gems === ex.gems, `${mode} ${n}: gem count`); }
    const layers = info.ice ? info.ice.reduce((a, b) => a + b, 0) : 0;
    ok(info.total === info.grid.filter(P.isTarget).length + layers + info.gems, `${mode} ${n}: total counts all goals`);
    // the AI (with the game's rules) wins most fresh runs within the moves budget: not impossible, not free
    let wins = 0, minMoves = Infinity;
    for (let i = 0; i < 6; i++) {
      const m = Lv._test.simulate(info.grid, rngFrom(9000 + n * 31 + i), 0.2, 120, info.ice, info.gems);
      if (m <= info.moves) wins++;
      minMoves = Math.min(minMoves, m);
    }
    ok(wins >= 1, `${mode} ${n}: AI never wins within ${info.moves} moves`);
    allWins += wins; allRuns += 6;
    ok(minMoves >= 3, `${mode} ${n}: trivially short (${minMoves} moves)`);
  }
  ok(iceLv > 0 && gemLv > 0, 'some ice and gem levels exist');
  ok(allWins / allRuns >= 0.6, `ice/gem levels: AI wins only ${allWins}/${allRuns} within budget`);

  console.log(`blocos: ${trays} trays checked, ${iceLv} ice + ${gemLv} gem levels balanced (AI wins ${allWins}/${allRuns})`);
  if (fails.length) { console.log('FAIL\n' + [...new Set(fails)].slice(0, 30).join('\n')); process.exit(1); }
  console.log('OK');
})();
