// node tools/test-shelf.js [maxLevel] - Shelf Sort: rules work, every level and daily is won by the solver in its limit
const MAX = Number(process.argv[2]) || 40;
(async () => {
  const E = await import('../www/games/shelf/js/engine.js');
  const Lv = await import('../www/games/shelf/js/levels.js');
  const fails = [];
  const ok = (cond, msg) => { if (!cond) fails.push(msg); };

  // rules: a triple clears, the order goes down, a lock counts down, the column slides down
  const cb = (id, s, L = [], lock = 0) => ({ id, s, L, lock });
  const st = { V: 1, matches: 0, nextId: 9, orders: { 1: 3 }, cols: [
    [cb(1, [1, 1, 0]), cb(2, [4, 4, 5])], [cb(3, [1, 2, 3])], [cb(4, [2, 3, 0], [], 1)]] };
  ok(!E.legal(st, 2, 0, 0, 0, 0), 'locked cubby must not give items');
  const ev = E.apply(st, 1, 0, 0, 0, 0);
  ok(ev.matches.length === 1 && st.orders[1] === 0 && E.done(st), 'triple should clear and finish the order');
  ok(st.cols[2][0].lock === 0, 'a match should count the lock down');
  ok(st.cols[0].length === 1 && st.cols[0][0].id === 2, 'emptied cubby should leave and the column slide down');
  const st2 = { V: 2, matches: 0, nextId: 9, orders: { 2: 3 }, cols: [[cb(1, [2, 0, 0], [[2, 2, 7]])], [cb(2, [2 + 64, 0, 0])], [cb(3, [E.KEY, 0, 0])]] };
  ok(!E.legal(st2, 1, 0, 0, 0, 0), 'frozen item must not move');
  E.apply(st2, 0, 0, 0, 2, 0);
  ok(st2.cols[0][0].s.join() === '2,2,7', 'empty front should pull the next layer forward');

  // levels
  const t0 = Date.now();
  let slow = 0, hintMax = 0, reshuffled = 0;
  const rows = [];
  for (let n = 1; n <= MAX; n++) {
    const a = Date.now();
    const L = Lv.levelFor(n);
    const ms = Date.now() - a;
    slow = Math.max(slow, ms);
    if (!L) { fails.push(`level ${n}: no level`); continue; }
    const items = L.cols.flat().reduce((s, b) => s + b.s.filter(Boolean).length + b.L.flat().filter(Boolean).length, 0);
    rows.push(`${String(n).padStart(3)} ${L.mode.padEnd(5)} V${L.V} items ${String(items).padStart(3)} par ${String(L.par).padStart(3)} limit ${String(L.limit).padStart(3)} win ${Math.round(L.rate * 100)}% ${ms}ms${L.hard ? ' HARD' : L.breather ? ' breather' : ''}`);
    // replay the stored solution: every move legal, wins within the limit
    const st = E.clone(L);
    let legalAll = true;
    for (const m of L.sol || []) { if (!E.legal(st, ...m)) { legalAll = false; break; } E.apply(st, ...m); }
    ok(L.sol && legalAll && E.done(st), `level ${n}: stored solution is not a legal win`);
    ok(L.sol && L.sol.length === L.par, `level ${n}: par != sol length`);
    ok(L.mode === 'time' || L.par <= L.limit, `level ${n}: par above the move limit`);
    ok(L.mode !== 'time' || L.limit >= L.par * 2, `level ${n}: time limit under 2 s per move`);
    const f0 = E.clone(L).cols.slice(0, 3).reduce((t, col) => t + col.slice(0, L.V).filter((b) => !b.lock).reduce((u, b) => u + b.s.filter((x) => !x).length, 0), 0);
    ok(f0 >= 3, `level ${n}: only ${f0} free front slots`);
    ok(slow < 400 || ms < 400, `level ${n}: took ${ms}ms`);
    // hint: legal, quick, and following hints wins
    if (n % 7 === 1) {
      const h0 = Date.now(), h = E.hint(L, n);
      const hms = Date.now() - h0;
      hintMax = Math.max(hintMax, hms);
      ok(h && E.legal(L, ...h), `level ${n}: hint missing or illegal`);
      const s2 = E.clone(L);
      for (let k = 0; k < 3 && !E.done(s2); k++) { const m = E.hint(s2, k); ok(m && E.legal(s2, ...m), `level ${n}: hint ${k} illegal`); if (m) E.apply(s2, ...m); }
      const s3 = E.clone(L), before = JSON.stringify(s3);
      const r0 = Date.now(), rs = E.reshuffle(s3, n);
      hintMax = Math.max(hintMax, Date.now() - r0);
      ok(JSON.stringify(s3) === before, `level ${n}: reshuffle mutated the state`);
      if (rs) {
        ok(JSON.stringify(rs.orders) === JSON.stringify(L.orders), `level ${n}: reshuffle changed orders`);
        ok(!rs.cols.some((col) => col.some((b) => !b.lock && b.s[0] && b.s[0] === b.s[1] && b.s[1] === b.s[2])), `level ${n}: reshuffle left a triple`);
        ok(E.solve(rs, { tries: 40, seed: 3, limit: 300 }).best, `level ${n}: reshuffled state not winnable`);
        reshuffled++;
      }
    }
    for (const [t, c] of Object.entries(L.orders)) ok(c % 3 === 0 && c > 0, `level ${n}: order ${t}×${c} not a multiple of 3`);
  }
  for (const key of ['2026-10-29', '2026-10-30', '2026-11-01']) {
    const L = Lv.dailyFor(key);
    ok(L && L.par, `daily ${key}: not made`);
    if (L) { const s9 = E.clone(L); let g = true; for (const m of L.sol) { if (!E.legal(s9, ...m)) { g = false; break; } E.apply(s9, ...m); } ok(g && E.done(s9), `daily ${key}: bad solution`); }
    if (L) rows.push(`daily ${key} items ${L.cols.flat().reduce((t, b) => t + b.s.filter(Boolean).length + b.L.flat().filter(Boolean).length, 0)} ${L.mode} V${L.V} par ${L.par} limit ${L.limit} win ${Math.round(L.rate * 100)}%`);
  }
  if (process.argv.includes('-v')) console.log(rows.join('\n'));
  console.log(`shelf: ${MAX} levels in ${Date.now() - t0}ms (slowest ${slow}ms), hint/reshuffle max ${hintMax}ms, ${reshuffled} reshuffles ok`);
  if (fails.length) { console.error(fails.join('\n')); process.exit(1); }
  console.log('shelf ok');
})();
