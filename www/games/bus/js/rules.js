// Bus da Joana - game rules (pure functions over a plain JSON state; works in the browser and in Node)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Rules = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const DIRS = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };

  function createState(level) {
    return {
      n: level.n,
      cols: level.cols,
      rows: level.rows,
      colors: level.colors,
      slots: new Array(level.slots).fill(null),
      queue: level.queue.slice(),
      buses: level.buses.map((b) => ({
        id: b.id, x: b.x, y: b.y, dir: b.dir, len: b.len, color: b.color, cap: b.cap,
        status: 'grid', seated: 0,
      })),
    };
  }

  // cells of a bus, head first; the body extends behind the head (opposite to dir)
  function cellsOf(bus) {
    const [dx, dy] = DIRS[bus.dir];
    const out = [];
    for (let i = 0; i < bus.len; i++) out.push([bus.x - dx * i, bus.y - dy * i]);
    return out;
  }

  // occupancy of buses still on the grid: Int16Array of busId+1 (0 = empty)
  function occupancy(state) {
    const occ = new Int16Array(state.cols * state.rows);
    for (const b of state.buses) {
      if (b.status !== 'grid') continue;
      for (const [x, y] of cellsOf(b)) occ[y * state.cols + x] = b.id + 1;
    }
    return occ;
  }

  function exitPath(state, busId) {
    const b = state.buses[busId];
    const [dx, dy] = DIRS[b.dir];
    const out = [];
    for (let x = b.x + dx, y = b.y + dy; x >= 0 && y >= 0 && x < state.cols && y < state.rows; x += dx, y += dy) out.push([x, y]);
    return out;
  }

  // ids of grid buses standing in the exit path (nearest first)
  function blockersOf(state, busId, occ) {
    occ = occ || occupancy(state);
    const out = [];
    for (const [x, y] of exitPath(state, busId)) {
      const id = occ[y * state.cols + x] - 1;
      if (id >= 0 && out[out.length - 1] !== id) out.push(id);
    }
    return out;
  }

  function canExit(state, busId) {
    const b = state.buses[busId];
    return !!b && b.status === 'grid' && blockersOf(state, busId).length === 0;
  }

  function freeSlot(state) {
    return state.slots.indexOf(null);
  }

  function tapBus(state, busId) {
    const b = state.buses[busId];
    if (!b || b.status !== 'grid') return { ok: false, reason: 'notgrid' };
    if (!canExit(state, busId)) return { ok: false, reason: 'blocked' };
    const slot = freeSlot(state);
    if (slot < 0) return { ok: false, reason: 'noslot' };
    b.status = 'parked';
    state.slots[slot] = busId;
    return { ok: true, slot };
  }

  // the parked bus (lowest slot) that the front passenger would board, or -1
  function boardingSlot(state) {
    if (!state.queue.length) return -1;
    const c = state.queue[0];
    for (let i = 0; i < state.slots.length; i++) {
      const id = state.slots[i];
      if (id === null) continue;
      const b = state.buses[id];
      if (b.color === c && b.seated < b.cap) return i;
    }
    return -1;
  }

  function boardNext(state) {
    const slot = boardingSlot(state);
    if (slot < 0) return null;
    const b = state.buses[state.slots[slot]];
    const color = state.queue.shift();
    b.seated++;
    let departed = false;
    if (b.seated >= b.cap) {
      b.status = 'gone';
      state.slots[slot] = null;
      departed = true;
    }
    return { busId: b.id, slot, color, departed };
  }

  function status(state) {
    if (!state.queue.length) return 'won';
    if (freeSlot(state) < 0 && boardingSlot(state) < 0) return 'lost';
    return 'playing';
  }

  function addSlot(state) {
    state.slots.push(null);
  }

  // booster: passengers that fit the free seats of parked buses move to the front of the line
  function shuffleQueue(state) {
    const need = {};
    for (const id of state.slots) {
      if (id === null) continue;
      const b = state.buses[id];
      need[b.color] = (need[b.color] || 0) + b.cap - b.seated;
    }
    const front = [];
    const rest = [];
    for (const c of state.queue) {
      if (need[c] > 0) {
        need[c]--;
        front.push(c);
      } else rest.push(c);
    }
    const next = front.concat(rest);
    const changed = next.some((c, i) => c !== state.queue[i]);
    state.queue = next;
    return changed;
  }

  // colors the parked buses can't serve, in the order the line needs them
  function neededColors(state) {
    const need = {};
    for (const id of state.slots) {
      if (id === null) continue;
      const b = state.buses[id];
      need[b.color] = (need[b.color] || 0) + b.cap - b.seated;
    }
    const out = [];
    for (const c of state.queue) {
      if (need[c] > 0) need[c]--;
      else if (!out.includes(c)) out.push(c);
    }
    return out;
  }

  // tappable buses, most promising first: wanted colors early in the line, then buses that free wanted ones
  function candidates(state) {
    const want = neededColors(state);
    const occ = occupancy(state);
    const grid = state.buses.filter((b) => b.status === 'grid');
    const score = {};
    for (const b of grid) {
      const w = want.indexOf(b.color);
      if (w < 0) continue;
      blockersOf(state, b.id, occ).forEach((id, depth) => {
        const s = w * 4 + depth + 1;
        if (score[id] === undefined || s < score[id]) score[id] = s;
      });
      if (score[b.id] === undefined || w * 4 < score[b.id]) score[b.id] = w * 4;
    }
    return grid
      .filter((b) => blockersOf(state, b.id, occ).length === 0)
      .sort((a, b) => (score[a.id] ?? 999) - (score[b.id] ?? 999) || b.cap - a.cap)
      .map((b) => b.id);
  }

  const clone = (s) => JSON.parse(JSON.stringify(s));

  // a good next tap: short search (taps + automatic boarding) for a line that clears the level,
  // falling back to the most promising tappable bus
  function hint(state, budget) {
    if (freeSlot(state) < 0 || !state.queue.length) return null;
    const first = candidates(state);
    if (!first.length) return null;
    let nodes = budget || 4000;
    const seen = new Set();
    function dfs(st) {
      while (boardNext(st));
      const s = status(st);
      if (s === 'won') return true;
      if (s === 'lost' || --nodes <= 0) return false;
      const key = st.buses.map((b) => (b.status === 'grid' ? 0 : b.status === 'gone' ? 9 : b.seated + 1)).join(',');
      if (seen.has(key)) return false;
      seen.add(key);
      for (const id of candidates(st).slice(0, 5)) {
        const nx = clone(st);
        tapBus(nx, id);
        if (dfs(nx)) return true;
        if (nodes <= 0) return false;
      }
      return false;
    }
    for (const id of first.slice(0, 6)) {
      const nx = clone(state);
      tapBus(nx, id);
      if (dfs(nx)) return id;
      if (nodes <= 0) break;
    }
    return first[0];
  }

  return { DIRS, createState, cellsOf, occupancy, exitPath, blockersOf, canExit, tapBus, boardNext, status, addSlot, shuffleQueue, hint };
});
