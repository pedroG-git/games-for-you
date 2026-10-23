// node tools/test-linhas.js [weeks] - Linhas: a greedy auto-player runs every city; no crashes, saves round-trip, deterministic
const WEEKS = Number(process.argv[2]) || 6;
(async () => {
  const E = await import('../www/games/linhas/js/engine.js');
  const { CITIES } = await import('../www/games/linhas/js/cities.js');
  const fails = [];

  // Greedy player: hook every unconnected station onto the nearest line end, or start a new line.
  function play(s) {
    if (s.pendingUpgrade) E.chooseUpgrade(s, s.pendingUpgrade.options[0]);
    if (s.inv.express > 0) E.makeExpress(s, 0);
    if (s.inv.interchanges > 0) {
      const busy = [...s.stations].sort((a, b) => b.queue.length - a.queue.length)[0];
      E.makeInterchange(s, busy.id);
    }
    const on = new Set(s.lines.flatMap((l) => l.stations));
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    for (const st of s.stations) {
      if (on.has(st.id)) continue;
      if (s.lines.length < s.inv.lines) {
        const near = s.stations.filter((o) => o.id !== st.id).sort((a, b) => dist(a, st) - dist(b, st));
        for (const o of near) if (E.setLine(s, s.lines.length, [st.id, o.id]).ok) { on.add(st.id); break; }
        if (on.has(st.id)) continue;
      }
      const ends = [];
      s.lines.forEach((l, L) => {
        if (l.loop) return;
        ends.push({ L, ids: [...l.stations, st.id], d: dist(s.stations[l.stations[l.stations.length - 1]], st) });
        ends.push({ L, ids: [st.id, ...l.stations], d: dist(s.stations[l.stations[0]], st) });
      });
      ends.sort((a, b) => a.d - b.d);
      for (const e of ends) if (E.setLine(s, e.L, e.ids).ok) { on.add(st.id); break; }
    }
  }

  function run(city, mode, seed, seconds, check) {
    let s = E.newGame({ city, mode, seed });
    let t = 0, events = 0;
    while (t < seconds && !s.over) {
      play(s);
      for (let i = 0; i < 20; i++) events += E.step(s, 0.05).length;
      t += 1;
      if (check && t === Math.floor(seconds / 2)) {
        const copy = JSON.parse(JSON.stringify(s));
        const a = run2(s, 60), b = run2(copy, 60);
        if (a !== b) fails.push(`${city}/${mode}: save round-trip diverged (${a} vs ${b})`);
        s = copy;
      }
      for (const [L, line] of s.lines.entries()) line.trains.forEach((_, i) => {
        const p = E.trainPose(s, L, i);
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) fails.push(`${city}/${mode}: bad train pose`);
      });
    }
    return { s, events };
  }
  // Runs a copy forward without the player, returns a fingerprint.
  function run2(s, seconds) {
    const c = JSON.parse(JSON.stringify(s));
    for (let i = 0; i < seconds * 20; i++) { if (c.pendingUpgrade) E.chooseUpgrade(c, c.pendingUpgrade.options[0]); E.step(c, 0.05); }
    return `${c.score}/${c.stations.length}/${c.t.toFixed(2)}`;
  }

  const seconds = WEEKS * E.DAY * 7;
  for (const c of CITIES) {
    for (const mode of ['normal', 'relaxed']) {
      try {
        const t0 = Date.now();
        const { s } = run(c.id, mode, 1234, seconds, true);
        const again = run(c.id, mode, 1234, seconds, false).s;
        if (s.score !== again.score) fails.push(`${c.id}/${mode}: not deterministic (${s.score} vs ${again.score})`);
        if (s.score <= 0) fails.push(`${c.id}/${mode}: no passengers delivered`);
        if (mode === 'relaxed' && s.over) fails.push(`${c.id}/relaxed: game ended`);
        if (s.stations.some((st) => st.id !== s.stations.indexOf(st))) fails.push(`${c.id}: station ids out of order`);
        console.log(`${c.id.padEnd(7)} ${mode.padEnd(8)} score ${String(s.score).padStart(4)}  week ${s.week}  stations ${String(s.stations.length).padStart(2)}  lines ${s.lines.length}  ${s.over ? 'over' : 'running'}  ${Date.now() - t0} ms`);
      } catch (e) {
        fails.push(`${c.id}/${mode}: ${e.stack}`);
      }
    }
  }
  // Balance: a decent player (cheapest insertion of every new station) should last about 5 weeks in normal mode.
  function decent(s) {
    E.autoPlace(s);
    if (s.inv.express > 0 && s.lines.length) E.makeExpress(s, s.lines.findIndex((l) => !l.express));
    if (s.pendingUpgrade) {
      const pref = ['line', 'carriage', 'interchange', 'tunnel', 'express'];
      const o = s.pendingUpgrade.options.slice().sort((a, b) => pref.indexOf(a) - pref.indexOf(b));
      E.chooseUpgrade(s, s.inv.tunnels < 1 && o.includes('tunnel') ? 'tunnel' : o[0]);
    }
    if (s.inv.interchanges > 0) E.makeInterchange(s, [...s.stations].sort((a, b) => b.queue.length - a.queue.length)[0].id);
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const on = new Set(s.lines.flatMap((l) => l.stations));
    for (const st of s.stations) {
      if (on.has(st.id)) continue;
      if (s.lines.length < s.inv.lines) {
        const near = s.stations.filter((o) => o.id !== st.id && o.shape !== st.shape).sort((a, b) => dist(a, st) - dist(b, st));
        if (near.slice(0, 4).some((o) => E.setLine(s, s.lines.length, [st.id, o.id]).ok)) { on.add(st.id); continue; }
      }
      const opts = [];
      s.lines.forEach((l, L) => {
        const ids = l.stations, P = (i) => s.stations[ids[i]];
        const lacks = ids.some((id) => s.stations[id].shape === st.shape) ? 0 : -60;
        for (let i = 0; i <= ids.length; i++) {
          let add;
          if (i === 0) { if (l.loop) continue; add = dist(st, P(0)); }
          else if (i === ids.length) add = l.loop ? dist(P(i - 1), st) + dist(st, P(0)) - dist(P(i - 1), P(0)) : dist(P(i - 1), st);
          else add = dist(P(i - 1), st) + dist(st, P(i)) - dist(P(i - 1), P(i));
          const n = ids.slice(); n.splice(i, 0, st.id);
          opts.push({ L, ids: n, c: add + lacks + ids.length * 8 });
        }
      });
      opts.sort((a, b) => a.c - b.c);
      if (opts.some((o) => E.setLine(s, o.L, o.ids).ok)) on.add(st.id);
    }
  }
  for (const c of CITIES) {
    const weeks = [];
    for (let seed = 1; seed <= 7; seed++) {
      const s = E.newGame({ city: c.id, mode: 'normal', seed: seed * 7919 });
      while (!s.over && s.week < 20) { decent(s); for (let i = 0; i < 10; i++) E.step(s, 0.1); }
      weeks.push(s.week + s.day / 7);
    }
    weeks.sort((a, b) => a - b);
    const med = weeks[3];
    console.log(`${c.id.padEnd(7)} balance: decent player lasts ${weeks.map((w) => w.toFixed(1)).join(' ')} weeks`);
    if (med < 3.5 || med > 12) fails.push(`${c.id}: balance off, median ${med.toFixed(1)} weeks (want 3.5-12)`);
  }

  // Undo: removing or shortening lines and then restoring the routes gives back the same map, trains and tunnels.
  for (let seed = 1; seed <= 24; seed++) {
    const s = E.newGame({ city: CITIES[seed % CITIES.length].id, mode: 'normal', seed });
    for (let i = 0; i < 300 + seed * 20 && !s.over; i++) { decent(s); E.step(s, 1); }
    if (s.over || !s.lines.length) continue;
    const trains = () => s.lines.reduce((n, l) => n + l.trains.length, 0) + s.inv.trains;
    const snap = E.routesOf(s), T = trains(), tun = s.inv.tunnels;
    const last = s.lines.length - 1;
    if (seed % 3 === 0) E.removeLine(s, 0);
    else if (seed % 3 === 1 && s.lines[last].stations.length > 2) E.setLine(s, last, s.lines[last].stations.slice(1));
    else { E.removeLine(s, last); if (s.lines.length) E.removeLine(s, 0); }
    E.restoreRoutes(s, snap);
    if (JSON.stringify(E.routesOf(s)) !== JSON.stringify(snap)) fails.push(`undo ${seed}: routes differ`);
    if (trains() !== T || s.inv.tunnels !== tun) fails.push(`undo ${seed}: trains ${trains()}/${T}, tunnels ${s.inv.tunnels}/${tun}`);
  }

  // Moving trains: storing keeps the train count, every line keeps one train, carriages travel with the train.
  {
    const s = E.newGame({ city: 'lisboa', mode: 'normal', seed: 5 });
    E.setLine(s, 0, [0, 1, 2]); E.setLine(s, 1, [0, 2]);
    s.inv.trains = 1; s.inv.carriages = 1;
    E.addTrain(s, 0, s.stations[1].x, s.stations[1].y); E.addCarriage(s, 0, 1);
    if (E.storeTrain(s, 1, 0)) fails.push('storeTrain: took the last train of a line');
    if (!E.moveTrainTo(s, 0, 1, 1, s.stations[2].x, s.stations[2].y)) fails.push('moveTrainTo failed');
    if (s.lines[1].trains.length !== 2 || s.lines[1].trains[1].cars !== 2) fails.push('moveTrainTo: train or carriage lost');
    if (!E.storeTrain(s, 1, 1) || s.inv.trains !== 1 || s.inv.carriages !== 1) fails.push('storeTrain: spares not returned');
  }

  // Challenges: every puzzle can be solved by the decent player on its fixed map, weekly challenges run, creative never ends.
  const CH = await import('../www/games/linhas/js/challenges.js');
  for (const p of CH.PUZZLES) {
    const s = E.newGame({ city: p.city, mode: 'puzzle', seed: p.seed, mods: { ...p.mods, goal: p.goal, weeks: p.weeks } });
    while (!s.over) { decent(s); for (let i = 0; i < 10; i++) E.step(s, 0.1); }
    if (!s.won) fails.push(`puzzle ${p.id}: decent player only got ${s.score}/${p.goal} (week ${s.week})`);
  }
  for (let w = 202601; w <= 202652; w++) {
    const c = CH.weekly(w), s = E.newGame({ city: c.city, mode: 'weekly', seed: c.seed, mods: c.mods });
    if (s.city !== c.city || c.twists.length !== 2 || c.twists[0] === c.twists[1]) fails.push(`weekly ${w}: bad challenge`);
    for (let i = 0; i < 200 && !s.over; i++) { decent(s); E.step(s, 1); }
    if (s.score <= 0 && !s.over) fails.push(`weekly ${w}: nothing delivered`);
  }
  {
    const s = E.newGame({ city: 'roma', mode: 'creative', seed: 3 });
    const n0 = s.stations.length;
    if (!E.addStation(s, 700, 500, 'star') || E.addStation(s, 700, 520, 'star')) fails.push('creative: addStation spacing');
    for (let i = 0; i < 6000; i++) { E.step(s, 0.1); if (s.pendingUpgrade) fails.push('creative: upgrade picker'); }
    if (s.over || s.stations.length !== n0 + 1) fails.push(`creative: over ${s.over}, stations ${s.stations.length}`);
  }

  const d = E.newGame({ mode: 'daily', seed: 20261023 });
  if (d.city !== CITIES[20261023 % CITIES.length].id) fails.push('daily: wrong city');
  if (fails.length) { console.error('FAIL\n' + fails.join('\n')); process.exit(1); }
  console.log('Linhas OK');
})();
