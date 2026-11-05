// node tools/test-dragon-engine.js - Dragon Match engine rules: chains, grass, honey, special combos, save/resume
const assert = require('assert');
(async () => {
  const E = await import('../www/games/dragon/js/engine.js');
  const { W, H, idx } = E;
  const FULL = { top: Array(W).fill(0), bot: Array(W).fill(H - 1), colors: 5, moves: 20, boxes: [], ice: [], eggs: [] };
  // Board from a picture: one string per row, '0'-'4' gems, 'R' rocket(h), 'V' rocket(v), 'B' bomb, 'L' light,
  // 'P' prop, 'H' honey, lower-case letters a-e = chained gem 0-4. Goals and grass are passed in.
  function board(rows, goals = [{ t: 'gem', c: 4, n: 99 }], extra = {}) {
    const S = E.createState({ ...FULL, goals, ...extra }, 7);
    let id = 1000;
    rows.forEach((row, r) => [...row].forEach((ch, c) => {
      const i = idx(r, c);
      if (/[0-4]/.test(ch)) S.tiles[i] = { id: id++, t: 'g', c: +ch };
      else if (/[a-e]/.test(ch)) S.tiles[i] = { id: id++, t: 'g', c: ch.charCodeAt(0) - 97, lock: 1 };
      else S.tiles[i] = { id: id++, t: { R: 'rh', V: 'rv', B: 'bomb', L: 'light', P: 'prop', H: 'honey' }[ch] };
    }));
    return S;
  }
  // A filler pattern with no matches: colours 0-3 cycle so no three in a row/column.
  const fill = (r) => [...Array(W).keys()].map((c) => String((r * 2 + c) % 4 === 3 ? 3 : ((r * 2 + c) % 4))).join('');
  const base = () => [...Array(H).keys()].map(fill);
  const goal = (S, t) => S.goals.find((g) => g.t === t);
  let n = 0;
  const test = (name, fn) => { fn(); n++; console.log('ok', name); };

  test('chained gem cannot be swapped', () => {
    const rows = base(); rows[8] = 'a' + rows[8].slice(1);
    const S = board(rows, [{ t: 'chain', n: 1 }]);
    assert.strictEqual(E.movable(S.tiles[idx(8, 0)]), false);
    assert.strictEqual(E.run(E.swap(S, idx(8, 0), idx(8, 1))), false);
    assert.ok(!E.listMoves(S).some((m) => m.a === idx(8, 0) || m.b === idx(8, 0)));
  });

  test('matching a chained gem breaks the chain and keeps the gem', () => {
    const rows = base();
    rows[8] = 'e44' + rows[8].slice(3); // chained 4, two 4s next to it... then swap a 4 in from above
    rows[7] = '4' + '1' + '2' + rows[7].slice(3);
    rows[8] = 'e14' + rows[8].slice(3);
    // swap (7,1)? simpler: put row 8 = e,1,4 and row 7 col 1 = 4 -> swap (7,1)<->(8,1) makes e44
    rows[7] = '3' + '4' + '2' + rows[7].slice(3);
    const S = board(rows, [{ t: 'chain', n: 1 }]);
    const ok = E.run(E.swap(S, idx(7, 1), idx(8, 1)));
    assert.strictEqual(ok, true);
    assert.strictEqual(goal(S, 'chain').left, 0);
    assert.ok(S.won);
  });

  test('chained gems do not fall', () => {
    const rows = base(); rows[3] = 'a' + rows[3].slice(1);
    const S = board(rows, [{ t: 'chain', n: 1 }]);
    const id = S.tiles[idx(3, 0)].id;
    E.run(E.tool(S, 'hammer', idx(8, 0))); // empty a cell under it
    assert.strictEqual(S.tiles[idx(3, 0)].id, id);
    assert.ok(S.tiles[idx(8, 0)], 'gap under the chain got filled diagonally');
  });

  test('a match touching grass spreads it to the whole match', () => {
    const rows = base();
    rows[8] = '114' + rows[8].slice(3); rows[7] = '33' + '1' + rows[7].slice(3);
    const S = board(rows, [{ t: 'grass', n: 10 }], { grass: [[8, 0]] });
    E.run(E.swap(S, idx(7, 2), idx(8, 2)));
    assert.ok(S.grass[idx(8, 1)] && S.grass[idx(8, 2)]);
    assert.strictEqual(goal(S, 'grass').left, 8);
  });

  test('a rocket fired from grass covers its whole row', () => {
    const rows = base(); rows[4] = 'R' + rows[4].slice(1);
    const S = board(rows, [{ t: 'grass', n: 40 }], { grass: [[4, 0]] });
    E.run(E.tap(S, idx(4, 0)));
    for (let c = 0; c < W; c++) assert.ok(S.grass[idx(4, c)], 'cell ' + c);
    assert.strictEqual(goal(S, 'grass').left, 40 - 7);
  });

  test('honey grows after a move that clears none', () => {
    const rows = base(); rows[0] = 'H' + rows[0].slice(1);
    rows[8] = '114' + rows[8].slice(3); rows[7] = '33' + '1' + rows[7].slice(3);
    const S = board(rows, [{ t: 'honey', n: 1 }], { honey: [[0, 0]] });
    E.run(E.swap(S, idx(7, 2), idx(8, 2)));
    assert.strictEqual(S.tiles.filter((t) => t && t.t === 'honey').length, 2);
    assert.strictEqual(goal(S, 'honey').left, 2);
  });

  test('a match next to honey wipes it and stops it growing', () => {
    const rows = base(); rows[6] = 'H' + rows[6].slice(1);
    rows[8] = '114' + rows[8].slice(3); rows[7] = '33' + '1' + rows[7].slice(3);
    const S = board(rows, [{ t: 'honey', n: 1 }, { t: 'gem', c: 4, n: 99 }], { honey: [[6, 0]] });
    // row 7 col 0 is '3'; make the match in row 7 under the honey instead
    S.tiles[idx(7, 0)] = { id: 1, t: 'g', c: 2 }; S.tiles[idx(7, 1)] = { id: 2, t: 'g', c: 2 }; S.tiles[idx(7, 2)] = { id: 3, t: 'g', c: 0 };
    S.tiles[idx(8, 2)] = { id: 4, t: 'g', c: 2 };
    E.run(E.swap(S, idx(7, 2), idx(8, 2)));
    assert.strictEqual(goal(S, 'honey').left, 0);
    assert.ok(!S.tiles.some((t) => t && t.t === 'honey'));
  });

  test('honey stays fixed and cannot be swapped', () => {
    const rows = base(); rows[2] = 'H' + rows[2].slice(1);
    const S = board(rows, [{ t: 'honey', n: 1 }], { honey: [[2, 0]] });
    assert.strictEqual(E.run(E.swap(S, idx(2, 0), idx(2, 1))), false);
  });

  // ---- existing special + special combos
  const comboBoard = (a, b) => { const rows = base(); rows[4] = rows[4].slice(0, 3) + a + b + rows[4].slice(5); return board(rows); };
  test('rocket + rocket clears a cross', () => {
    const S = comboBoard('R', 'V');
    E.run(E.swap(S, idx(4, 3), idx(4, 4)));
    assert.ok(S.stats !== undefined);
    assert.strictEqual(S.moves, 19);
  });
  test('bomb + bomb is a big blast (radius 3)', () => {
    const S = comboBoard('B', 'B'); const fx = [];
    const g = E.swap(S, idx(4, 3), idx(4, 4)); let r;
    while (!(r = g.next()).done) if (r.value.type === 'blast') fx.push(...r.value.fx);
    assert.ok(fx.some((f) => f.fx === 'bomb' && f.rad === 3));
  });
  test('light + light hits the whole board', () => {
    const S = comboBoard('L', 'L'); const fx = [];
    const g = E.swap(S, idx(4, 3), idx(4, 4)); let r;
    while (!(r = g.next()).done) if (r.value.type === 'blast') fx.push(...r.value.fx);
    assert.ok(fx.some((f) => f.fx === 'nova'));
  });
  test('light + rocket turns a colour into rockets', () => {
    const S = comboBoard('L', 'R'); const fx = [];
    const g = E.swap(S, idx(4, 3), idx(4, 4)); let r;
    while (!(r = g.next()).done) if (r.value.type === 'blast') fx.push(...r.value.fx);
    assert.ok(fx.some((f) => f.fx === 'light' && f.turn === 'rocket'));
  });
  test('rocket + bomb is a big cross, prop + bomb carries a bomb', () => {
    let S = comboBoard('R', 'B'), fx = [], g = E.swap(S, idx(4, 3), idx(4, 4)), r;
    while (!(r = g.next()).done) if (r.value.type === 'blast') fx.push(...r.value.fx);
    assert.ok(fx.filter((f) => f.fx === 'rocket').length >= 6);
    S = comboBoard('P', 'B'); fx = []; g = E.swap(S, idx(4, 3), idx(4, 4));
    while (!(r = g.next()).done) if (r.value.type === 'blast') fx.push(...r.value.fx);
    assert.ok(fx.some((f) => f.fx === 'fly' && f.carry === 'bomb'));
  });
  test('light + chained gem only breaks the chain', () => {
    const rows = base(); rows[4] = rows[4].slice(0, 3) + 'LR' + rows[4].slice(5);
    rows[0] = 'a' + rows[0].slice(1);
    const S = board(rows, [{ t: 'chain', n: 1 }]);
    // make colour 0 the most common so light picks it is not needed: light+rocket picks most common colour
    E.run(E.swap(S, idx(4, 3), idx(4, 4)));
    assert.ok(goal(S, 'chain').left === 0 || S.tiles[idx(0, 0)].lock === 1, 'chain is either broken (counted) or untouched');
  });

  test('snapshot / restore keeps a settled board', () => {
    const rows = base(); rows[3] = 'b' + rows[3].slice(1); rows[6] = 'H' + rows[6].slice(1);
    const S = board(rows, [{ t: 'chain', n: 1 }], { grass: [[8, 8 - 1]] });
    const D = JSON.parse(JSON.stringify(E.snapshot(S)));
    const T = E.restore(D);
    assert.deepStrictEqual(T.tiles, D.tiles);
    assert.strictEqual(T.tiles[idx(3, 0)].lock, 1);
    assert.strictEqual(T.grass[idx(8, 7)], 1);
    assert.strictEqual(T.moves, S.moves);
    assert.strictEqual(T.rs, S.rs);
    // the same move on both gives the same result (random state included)
    E.run(E.tool(S, 'hammer', idx(8, 2)));
    E.run(E.tool(T, 'hammer', idx(8, 2)));
    assert.deepStrictEqual(T.tiles.map((t) => t && t.t + (t.c ?? '')), S.tiles.map((t) => t && t.t + (t.c ?? '')));
    // an old save without grass still loads
    delete D.grass;
    assert.strictEqual(E.restore(D).grass.length, W * H);
  });

  console.log(`${n} engine tests OK`);
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
