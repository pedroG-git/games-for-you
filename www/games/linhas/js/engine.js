// Linhas game logic: stations, lines, trains, passengers. Pure (no DOM), deterministic from the seed.
// The state is plain JSON, so a run can be saved with JSON.stringify and loaded with JSON.parse.
import { CITIES } from './cities.js';

export const SHAPES = ['circle', 'triangle', 'square', 'diamond', 'star', 'cross', 'pentagon']; // first 3 common, rest rare
export const DAY = 20;        // game seconds per day; a week is 7 days
export const CAPACITY = 6;    // station queue limit (interchange: 12); a train car holds 6
const SPEED = 95;             // train speed, world units per second
const DWELL = 0.6;            // seconds a train waits at each stop
const TRANSFER = 1000;        // routing cost of changing lines (vs 1 per stop)
const SLACK = 3;              // passengers also take a route up to this many stops longer than the best
const MIN_GAP = 90;           // minimum distance between stations
export const MAX_CARS = 3;
// Difficulty: seconds between new passengers at each station (from PAX_START down to PAX_MIN, one second less
// every PAX_RAMP seconds), and how long a station may stay overcrowded before the game ends.
const PAX_START = 16, PAX_MIN = 5, PAX_RAMP = 120;
const OVERFLOW = 50, RECOVER = 40;
const EXPRESS = 1.4;           // express lines run this much faster
// Rush hour (mornings and evenings) brings 1.6× the passengers; the rest of the day is a bit calmer, so a day
// has as many passengers as before.
const RUSH_K = 0.73, CALM_K = 1.168;
const WEATHER_SPEED = { clear: 1, rain: 0.9, snow: 0.8, fog: 0.95 };
const W = 1000, H = 1600;

// ---------------------------------------------------------------- helpers
function rnd(s) {
  let t = (s.rng = (s.rng + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const cityOf = (s) => CITIES.find((c) => c.id === s.city) || CITIES[0];
const cap = (st) => (st.interchange ? CAPACITY * 2 : CAPACITY);

function inPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const inWater = (city, x, y) => city.waterPolys.some((p) => inPoly(x, y, p));

// ---------------------------------------------------------------- geometry
// Between two stations the bend always sits on the same side, whichever way the line runs,
// so lines sharing a stretch of track stay parallel.
export function segmentPoints(a, b) {
  if (Number.isInteger(a.id) && Number.isInteger(b.id) && a.id > b.id) return segmentPoints(b, a).reverse();
  const dx = b.x - a.x, dy = b.y - a.y, ax = Math.abs(dx), ay = Math.abs(dy);
  const bend = ax > ay
    ? { x: a.x + Math.sign(dx) * (ax - ay), y: a.y }
    : { x: a.x, y: a.y + Math.sign(dy) * (ay - ax) };
  return [{ x: a.x, y: a.y }, bend, { x: b.x, y: b.y }];
}

// Route geometry, cached per line object (station positions never move).
const geoCache = new WeakMap();
function geom(s, line) {
  const key = line.stations.join(',') + (line.loop ? 'L' : '');
  const hit = geoCache.get(line);
  if (hit && hit.key === key) return hit;
  const ids = line.loop ? [...line.stations, line.stations[0]] : line.stations;
  const pts = [], cum = [], stopD = [];
  let d = 0;
  const add = (p) => {
    if (pts.length) {
      const q = pts[pts.length - 1], l = Math.hypot(p.x - q.x, p.y - q.y);
      if (l < 1e-9) return;
      d += l;
    }
    pts.push(p); cum.push(d);
  };
  for (let i = 0; i < ids.length; i++) {
    const st = s.stations[ids[i]];
    if (i === 0) add({ x: st.x, y: st.y });
    else for (const p of segmentPoints(s.stations[ids[i - 1]], st).slice(1)) add(p);
    if (i < line.stations.length) stopD.push(d);
  }
  const g = { key, pts, cum, stopD, total: d };
  geoCache.set(line, g);
  return g;
}

function pointAt(g, d) {
  const { pts, cum } = g;
  if (pts.length === 1) return { x: pts[0].x, y: pts[0].y, angle: 0 };
  d = Math.max(0, Math.min(g.total, d));
  let i = 1;
  while (i < cum.length - 1 && cum[i] < d) i++;
  const a = pts[i - 1], b = pts[i], l = cum[i] - cum[i - 1] || 1, f = (d - cum[i - 1]) / l;
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, angle: Math.atan2(b.y - a.y, b.x - a.x) };
}

// Distance along the route of the point closest to (x, y).
function project(g, x, y) {
  let best = Infinity, bd = 0;
  for (let i = 1; i < g.pts.length; i++) {
    const a = g.pts[i - 1], b = g.pts[i], vx = b.x - a.x, vy = b.y - a.y, l2 = vx * vx + vy * vy || 1;
    const f = Math.max(0, Math.min(1, ((x - a.x) * vx + (y - a.y) * vy) / l2));
    const px = a.x + vx * f, py = a.y + vy * f, dd = (px - x) ** 2 + (py - y) ** 2;
    if (dd < best) { best = dd; bd = g.cum[i - 1] + Math.sqrt(l2) * f; }
  }
  return bd;
}

export function routePoints(s, lineIdx) {
  return geom(s, s.lines[lineIdx]).pts.map((p) => ({ x: p.x, y: p.y }));
}

export function trainPose(s, lineIdx, trainIdx) {
  const line = s.lines[lineIdx], tr = line.trains[trainIdx], g = geom(s, line);
  const p = pointAt(g, tr.d);
  return { x: p.x, y: p.y, angle: tr.dir < 0 ? p.angle + Math.PI : p.angle };
}

export function crossings(s, ids) {
  const city = cityOf(s);
  let n = 0;
  for (let i = 1; i < ids.length; i++) {
    const pts = segmentPoints(s.stations[ids[i - 1]], s.stations[ids[i]]);
    let wet = false;
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1], b = pts[k], steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 6));
      for (let j = 1; j <= steps; j++) {
        const w = inWater(city, a.x + (b.x - a.x) * (j / steps), a.y + (b.y - a.y) * (j / steps));
        if (w && !wet) n++;
        wet = w;
      }
    }
  }
  return n;
}
// Tunnels a route uses (some cities, like Istanbul, need two per crossing).
const usage = (s, ids, loop) => crossings(s, loop ? [...ids, ids[0]] : ids) * (cityOf(s).tunnelCost || 1);

// ---------------------------------------------------------------- weather, rush hour
const hash = (a, b) => {
  let h = (a ^ Math.imul(b + 0x9e37, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
};
// Each day has its weather, from the city's climate (percent chances); rain and snow slow the trains a little.
export function weatherOf(s) {
  const n = Math.floor(s.t / DAY), c = cityOf(s).climate || { rain: 15 };
  if (n === 0) return 'clear';
  const r = hash(s.seed, n) % 100, sn = c.snow || 0, rn = sn + (c.rain || 0), fg = rn + (c.fog || 0);
  return r < sn ? 'snow' : r < rn ? 'rain' : r < fg ? 'fog' : 'clear';
}
export function rushHour(s) { const f = (s.t % DAY) / DAY; return (f > 0.22 && f < 0.36) || (f > 0.62 && f < 0.76); }
const trainSpeed = (s, line) => (cityOf(s).speed || SPEED) * ((s.mods && s.mods.speed) || 1) * (line.express ? EXPRESS : 1) * WEATHER_SPEED[weatherOf(s)];

export function hitStation(s, x, y, r) {
  let best = -1, bd = r * r;
  for (const st of s.stations) {
    const d = (st.x - x) ** 2 + (st.y - y) ** 2;
    if (d <= bd) { bd = d; best = st.id; }
  }
  return best;
}

// ---------------------------------------------------------------- routing
// C[shape][station * nLines + line] = cost to reach that shape while on `line` at `station`
// (1 per stop, TRANSFER per change). Cached per state and line revision.
const routeCache = new WeakMap();
function routing(s) {
  const hit = routeCache.get(s);
  if (hit && hit.rev === s.rev && hit.ns === s.stations.length) return hit;
  const NS = s.stations.length, NL = s.lines.length;
  const nbrs = s.lines.map((line) => {
    const m = new Map(), n = line.stations.length;
    line.stations.forEach((id, i) => {
      const list = [];
      if (i > 0 || line.loop) list.push(line.stations[(i - 1 + n) % n]);
      if (i < n - 1 || line.loop) list.push(line.stations[(i + 1) % n]);
      m.set(id, [...new Set(list)]);
    });
    return m;
  });
  const linesAt = Array.from({ length: NS }, () => []);
  s.lines.forEach((line, L) => line.stations.forEach((id) => linesAt[id].push(L)));
  const C = {};
  for (const k of SHAPES) {
    const c = new Float64Array(NS * NL).fill(Infinity), q = [];
    for (let L = 0; L < NL; L++) for (const id of s.lines[L].stations) {
      if (s.stations[id].shape === k) { c[id * NL + L] = 0; q.push(id * NL + L); }
    }
    while (q.length) {
      const u = q.shift(), st = Math.floor(u / NL), L = u % NL, cu = c[u];
      for (const nb of nbrs[L].get(st)) {
        const v = nb * NL + L;
        if (cu + 1 < c[v]) { c[v] = cu + 1; q.push(v); }
      }
      for (const L2 of linesAt[st]) {
        const v = st * NL + L2;
        if (cu + TRANSFER < c[v]) { c[v] = cu + TRANSFER; q.push(v); }
      }
    }
    C[k] = c;
  }
  const r = { rev: s.rev, ns: NS, NL, C, nbrs, linesAt };
  routeCache.set(s, r);
  return r;
}
const cost = (r, k, st, L) => r.C[k][st * r.NL + L] ?? Infinity;
function bestAt(r, k, st) {
  let b = Infinity;
  for (const L of r.linesAt[st] || []) b = Math.min(b, cost(r, k, st, L));
  return b;
}

// ---------------------------------------------------------------- game setup
function placeStation(s, shape) {
  const city = cityOf(s), v = s.view;
  for (let tries = 0; tries < 60; tries++) {
    const x = v.x + 40 + rnd(s) * (v.w - 80), y = v.y + 40 + rnd(s) * (v.h - 80);
    if ([[0, 0], [30, 0], [-30, 0], [0, 30], [0, -30]].some(([ox, oy]) => inWater(city, x + ox, y + oy))) continue;
    if (s.stations.some((st) => Math.hypot(st.x - x, st.y - y) < MIN_GAP)) continue;
    const st = { id: s.stations.length, x: Math.round(x), y: Math.round(y), shape, queue: [], interchange: false, overflow: 0 };
    s.stations.push(st);
    return st;
  }
  return null;
}

function newShape(s) {
  if (s.week >= 1 && rnd(s) < 0.1) {
    const rare = SHAPES.slice(3).filter((k) => s.stations.filter((st) => st.shape === k).length < 2);
    if (rare.length) return rare[Math.floor(rnd(s) * rare.length)];
  }
  const r = rnd(s);
  return r < 0.5 ? 'circle' : r < 0.8 ? 'triangle' : 'square';
}

export function newGame({ city, mode = 'normal', seed = 1, mods = null } = {}) {
  seed = seed >>> 0;
  if (!CITIES.some((c) => c.id === city)) city = CITIES[seed % CITIES.length].id;
  const s = {
    v: 1, city, mode, seed, rng: seed ^ 0x9e3779b9, t: 0, day: 0, week: 0, score: 0, speedHint: 1,
    view: { x: 230, y: 380, w: 540, h: 840 },
    stations: [], lines: [],
    inv: { lines: 3, trains: 0, carriages: 0, tunnels: 3, interchanges: 0, express: 0, ...(CITIES.find((c) => c.id === city).start || {}) },
    mods: { speed: 1, busy: 1 },
    pendingUpgrade: null, over: false,
    rev: 0, nextStation: 0, nextPax: 0,
  };
  // Challenge rules (weekly challenge): fewer lines, no tunnels, a faster or busier city...
  if (mods) {
    if (mods.lines) s.inv.lines = mods.lines;
    if (mods.maxLines) s.mods.maxLines = mods.maxLines;
    if (mods.tunnels != null) s.inv.tunnels = mods.tunnels;
    if (mods.noTunnels) s.mods.noTunnels = true;
    if (mods.speed) s.mods.speed = mods.speed;
    if (mods.busy) s.mods.busy = mods.busy;
    if (mods.express) s.inv.express = mods.express;
  }
  for (const k of ['circle', 'triangle', 'square']) placeStation(s, k);
  s.nextStation = 16;
  s.nextPax = 2;
  return s;
}

// ---------------------------------------------------------------- trains
// Which stop a train heads for next, from distance d going in dir.
function nextStop(g, d, dir, loop) {
  const n = g.stopD.length, e = 0.5;
  if (dir > 0) {
    for (let i = 0; i < n; i++) if (g.stopD[i] >= d - e) return { i, dir };
    return loop ? { i: 0, dir } : { i: n - 1, dir: -1 };
  }
  for (let i = n - 1; i >= 0; i--) if (g.stopD[i] <= d + e) return { i, dir };
  return loop ? { i: n - 1, dir } : { i: 0, dir: 1 };
}

function newTrain(s, line, idx = 0) {
  const g = geom(s, line);
  return { d: g.stopD[idx], dir: idx === line.stations.length - 1 && !line.loop ? -1 : 1, cars: 1, pax: [], dwell: 0, i: idx };
}

function nearestStation(s, x, y, ids) {
  let best = ids[0], bd = Infinity;
  for (const id of ids) {
    const st = s.stations[id], d = (st.x - x) ** 2 + (st.y - y) ** 2;
    if (d < bd) { bd = d; best = id; }
  }
  return best;
}

function arrive(s, L, tr, events) {
  const line = s.lines[L], n = line.stations.length, st = s.stations[line.stations[tr.i]];
  let ni = tr.i + tr.dir;
  if (line.loop) ni = (ni + n) % n;
  else if (ni < 0 || ni >= n) { tr.dir = -tr.dir; ni = tr.i + tr.dir; }
  const next = line.stations[ni], r = routing(s);
  let moved = 0, delivered = 0;
  // Unload: deliver, or step off to change lines.
  const keep = [];
  for (const k of tr.pax) {
    if (k === st.shape) { delivered++; continue; }
    const cur = cost(r, k, st.id, L);
    let ride = Infinity;
    for (const nb of r.nbrs[L].get(st.id) || []) ride = Math.min(ride, cost(r, k, nb, L) + 1);
    if (Number.isFinite(cur) && ride > cur) { st.queue.push(k); moved++; } else keep.push(k);
  }
  tr.pax = keep;
  if (delivered) {
    s.score += delivered; moved += delivered;
    line.carried = (line.carried || 0) + delivered;
    events.push({ type: 'deliver', id: st.id, x: st.x, y: st.y, n: delivered });
  }
  // Board: passengers whose best path is this line in this direction.
  const room = tr.cars * CAPACITY;
  const stay = [];
  for (const k of st.queue) {
    const c = cost(r, k, st.id, L);
    // This line must be heading the right way, and be no more than SLACK stops (and no extra change) worse than the best.
    const b = bestAt(r, k, st.id);
    const good = Number.isFinite(c) && c <= b + SLACK && Math.floor(c / TRANSFER) === Math.floor(b / TRANSFER);
    if (tr.pax.length < room && good && cost(r, k, next, L) + 1 === c) {
      tr.pax.push(k); moved++;
    } else stay.push(k);
  }
  st.queue = stay;
  events.push({ type: 'stop', line: L, id: st.id, n: moved });
  tr.i = ni;
  // Interchanges have bigger platforms: boarding there is twice as quick.
  tr.dwell = (DWELL + Math.min(0.6, moved * 0.05)) * (st.interchange ? 0.5 : 1);
}

function moveTrain(s, L, tr, dt, events) {
  const line = s.lines[L], g = geom(s, line);
  let left = dt;
  for (let guard = 0; guard < 8 && left > 0; guard++) {
    if (tr.dwell > 0) {
      const w = Math.min(tr.dwell, left);
      tr.dwell -= w; left -= w;
      if (tr.dwell > 0) return;
      continue;
    }
    const target = g.stopD[tr.i];
    let togo;
    if (line.loop && g.total > 0) {
      togo = tr.dir > 0 ? (((target - tr.d) % g.total) + g.total) % g.total : (((tr.d - target) % g.total) + g.total) % g.total;
    } else togo = Math.abs(target - tr.d);
    const speed = trainSpeed(s, line);
    const step = speed * left;
    if (step < togo) {
      tr.d += tr.dir * step;
      if (line.loop) tr.d = ((tr.d % g.total) + g.total) % g.total;
      return;
    }
    left -= togo / speed;
    tr.d = target;
    arrive(s, L, tr, events);
  }
}

// ---------------------------------------------------------------- editing
function linePressure(s, line) {
  return line.stations.reduce((n, id) => n + s.stations[id].queue.length, 0) / Math.max(1, line.trains.length);
}
function busiestLine(s) {
  let best = null, bp = -1;
  for (const line of s.lines) { const p = linePressure(s, line); if (p > bp) { bp = p; best = line; } }
  return best;
}

function reproject(s, line, poses) {
  const g = geom(s, line);
  line.trains.forEach((tr, i) => {
    const p = poses[i];
    tr.d = project(g, p.x, p.y);
    const ns = nextStop(g, tr.d, tr.dir, line.loop);
    tr.i = ns.i; tr.dir = ns.dir;
  });
}
const posesOf = (s, L) => s.lines[L].trains.map((_, i) => trainPose(s, L, i));

// What the passengers waiting at station id want: [{ shape, n, ok }], ok = the network can take them there now.
export function wants(s, id) {
  const st = s.stations[id], r = routing(s), out = [];
  if (!st) return out;
  for (const k of st.queue) {
    let w = out.find((o) => o.shape === k);
    if (!w) out.push(w = { shape: k, n: 0, ok: Number.isFinite(bestAt(r, k, id)) });
    w.n++;
  }
  return out;
}

export function setLine(s, lineIdx, stationIds) {
  let ids = (stationIds || []).filter((id) => Number.isInteger(id) && s.stations[id]);
  ids = ids.filter((id, i) => i === 0 || id !== ids[i - 1]);
  const creating = lineIdx === s.lines.length;
  const line = s.lines[lineIdx];
  if (!creating && !line) return { ok: false, reason: 'invalid' };
  let loop = !creating && line.loop;
  if (ids.length >= 4 && ids[0] === ids[ids.length - 1]) { ids.pop(); loop = true; }
  if (new Set(ids).size !== ids.length) return { ok: false, reason: 'invalid' };
  if (ids.length < 2) return { ok: false, reason: 'short' };
  if (ids.length < 3) loop = false;
  if (creating && s.lines.length >= s.inv.lines) return { ok: false, reason: 'lines' };
  const used = creating ? 0 : usage(s, line.stations, line.loop);
  const need = usage(s, ids, loop);
  if (need > s.inv.tunnels + used) return { ok: false, reason: 'tunnels' };
  s.inv.tunnels += used - need;
  if (creating) {
    const taken = new Set(s.lines.map((l) => l.color));
    const color = cityOf(s).colors.find((c) => !taken.has(c)) || cityOf(s).colors[lineIdx % 7];
    const nl = { color, stations: ids, loop, trains: [] };
    s.lines.push(nl);
    nl.trains.push(newTrain(s, nl, 0));
  } else {
    const poses = posesOf(s, lineIdx);
    line.stations = ids; line.loop = loop;
    reproject(s, line, poses);
  }
  s.rev++;
  return { ok: true };
}

export function setLoop(s, lineIdx, loop) {
  const line = s.lines[lineIdx];
  if (!line) return { ok: false, reason: 'invalid' };
  loop = !!loop;
  if (loop === line.loop) return { ok: true };
  if (loop && line.stations.length < 3) return { ok: false, reason: 'short' };
  const used = usage(s, line.stations, line.loop), need = usage(s, line.stations, loop);
  if (need > s.inv.tunnels + used) return { ok: false, reason: 'tunnels' };
  s.inv.tunnels += used - need;
  const poses = posesOf(s, lineIdx);
  line.loop = loop;
  reproject(s, line, poses);
  s.rev++;
  return { ok: true };
}

export function removeLine(s, lineIdx) {
  const line = s.lines[lineIdx];
  if (!line) return;
  line.trains.forEach((tr, i) => {
    const p = trainPose(s, lineIdx, i);
    const id = nearestStation(s, p.x, p.y, line.stations);
    s.stations[id].queue.push(...tr.pax.filter((k) => k !== s.stations[id].shape));
    s.inv.carriages += tr.cars - 1;
  });
  s.inv.trains += line.trains.length - 1;
  s.inv.tunnels += usage(s, line.stations, line.loop);
  s.lines.splice(lineIdx, 1);
  s.rev++;
}

// Undo support: the routes of all lines, and putting them back. Trains and passengers stay where they are.
export function routesOf(s) {
  return s.lines.map((l) => ({ color: l.color, stations: l.stations.slice(), loop: l.loop }));
}
export function restoreRoutes(s, snap) {
  const keep = new Set(snap.map((r) => r.color));
  for (let i = s.lines.length - 1; i >= 0; i--) if (!keep.has(s.lines[i].color)) removeLine(s, i);
  // Tunnels only move between the pool and the lines, so the order of the edits doesn't matter.
  s.inv.tunnels += 1000;
  const lines = s.inv.lines;
  s.inv.lines = Math.max(lines, snap.length);
  for (const r of snap) {
    let i = s.lines.findIndex((l) => l.color === r.color);
    if (i < 0) {
      i = s.lines.length;
      if (!setLine(s, i, r.stations).ok) continue;
      s.lines[i].color = r.color; // removeLine kept all but one train, setLine just gave it a new one
    } else setLine(s, i, r.stations);
    setLoop(s, i, r.loop);
  }
  s.inv.lines = lines;
  s.inv.tunnels -= 1000;
  const order = snap.map((r) => r.color);
  s.lines.sort((a, b) => order.indexOf(a.color) - order.indexOf(b.color));
  s.rev++;
}

export function makeInterchange(s, id) {
  const st = s.stations[id];
  if (!st || st.interchange || s.inv.interchanges <= 0) return false;
  st.interchange = true;
  s.inv.interchanges--;
  return true;
}

// Spare trains and carriages wait until the player drags them somewhere.
// A train dropped near (x, y) starts on the line at the closest point, heading on to the next stop.
export function addTrain(s, lineIdx, x, y) {
  const line = s.lines[lineIdx];
  if (!line || s.inv.trains <= 0) return false;
  const g = geom(s, line), d = project(g, x, y), ns = nextStop(g, d, 1, line.loop);
  line.trains.push({ d, dir: ns.dir, cars: 1, pax: [], dwell: 0, i: ns.i });
  s.inv.trains--;
  return true;
}
export function addCarriage(s, lineIdx, trainIdx) {
  const tr = s.lines[lineIdx] && s.lines[lineIdx].trains[trainIdx];
  if (!tr || s.inv.carriages <= 0 || tr.cars >= MAX_CARS) return false;
  tr.cars++;
  s.inv.carriages--;
  return true;
}

// Takes a train off its line and back to the spares (with its carriages); its passengers get off at the nearest stop.
// Every line keeps at least one train.
export function storeTrain(s, lineIdx, trainIdx) {
  const line = s.lines[lineIdx], tr = line && line.trains[trainIdx];
  if (!tr || line.trains.length < 2) return false;
  const p = trainPose(s, lineIdx, trainIdx), id = nearestStation(s, p.x, p.y, line.stations);
  s.stations[id].queue.push(...tr.pax.filter((k) => k !== s.stations[id].shape));
  s.inv.carriages += tr.cars - 1;
  s.inv.trains++;
  line.trains.splice(trainIdx, 1);
  return true;
}
// Moves a train (and its carriages) to the point of a line closest to (x, y) — another line, or elsewhere on its own.
export function moveTrainTo(s, lineIdx, trainIdx, toLine, x, y) {
  const line = s.lines[lineIdx], tr = line && line.trains[trainIdx];
  if (!tr || !s.lines[toLine]) return false;
  if (toLine !== lineIdx && line.trains.length < 2) return false;
  const cars = tr.cars;
  s.inv.trains++; s.inv.carriages += cars - 1;
  const p = trainPose(s, lineIdx, trainIdx), id = nearestStation(s, p.x, p.y, line.stations);
  s.stations[id].queue.push(...tr.pax.filter((k) => k !== s.stations[id].shape));
  line.trains.splice(trainIdx, 1);
  addTrain(s, toLine, x, y);
  const moved = s.lines[toLine].trains[s.lines[toLine].trains.length - 1];
  moved.cars = cars; s.inv.carriages -= cars - 1;
  return true;
}

// Puts every spare train and carriage where it's needed most (used by the test bots).
export function autoPlace(s) { placeSpares(s); }
function placeSpares(s) {
  while (s.inv.trains > 0 && s.lines.length) {
    const line = busiestLine(s);
    let idx = 0, most = -1;
    line.stations.forEach((id, i) => { if (s.stations[id].queue.length > most) { most = s.stations[id].queue.length; idx = i; } });
    line.trains.push(newTrain(s, line, idx));
    s.inv.trains--;
  }
  while (s.inv.carriages > 0 && s.lines.length) {
    const trains = s.lines.flatMap((l) => l.trains.map((tr) => ({ tr, p: linePressure(s, l) })));
    const pick = trains.filter((o) => o.tr.cars < MAX_CARS).sort((a, b) => b.p - a.p || a.tr.cars - b.tr.cars)[0];
    if (!pick) break;
    pick.tr.cars++;
    s.inv.carriages--;
  }
}

export function chooseUpgrade(s, key) {
  if (!s.pendingUpgrade) return;
  if (key === 'line') s.inv.lines = Math.min(cityOf(s).colors.length, s.inv.lines + 1);
  else if (key === 'carriage') s.inv.carriages++;
  else if (key === 'tunnel') s.inv.tunnels += 2;
  else if (key === 'interchange') s.inv.interchanges++;
  else if (key === 'express') s.inv.express = (s.inv.express || 0) + 1;
  s.pendingUpgrade = null;
}

// Turns a line into an express line (its trains run faster). Uses one spare express.
export function makeExpress(s, lineIdx) {
  const line = s.lines[lineIdx];
  if (!line || line.express || !(s.inv.express > 0)) return false;
  line.express = true; s.inv.express--;
  return true;
}

// ---------------------------------------------------------------- simulation
function endWeek(s, events) {
  s.week++;
  const v = s.view, cx = v.x + v.w / 2, cy = v.y + v.h / 2;
  const w = Math.min(W, v.w * 1.12), h = Math.min(H, v.h * 1.12);
  s.view = {
    x: Math.round(Math.max(0, Math.min(W - w, cx - w / 2))), y: Math.round(Math.max(0, Math.min(H - h, cy - h / 2))),
    w: Math.round(w), h: Math.round(h),
  };
  s.inv.trains++;
  // City events: something changes in the city at the start of some weeks.
  for (const r of cityOf(s).rules || []) {
    if (r.week !== s.week + 1) continue;
    if (r.tunnels) s.inv.tunnels += r.tunnels;
    if (r.express) s.inv.express = (s.inv.express || 0) + r.express;
    if (r.carriages) s.inv.carriages += r.carriages;
    if (r.speed) s.mods.speed = ((s.mods && s.mods.speed) || 1) * r.speed;
    if (r.busy) s.mods.busy = ((s.mods && s.mods.busy) || 1) * r.busy;
    events.push({ type: 'rule', text: r.text, icon: r.icon || '📣' });
  }
  const pool = ['carriage', 'interchange'];
  if (!(s.mods && s.mods.noTunnels)) pool.push('tunnel');
  const maxLines = Math.min(cityOf(s).colors.length, (s.mods && s.mods.maxLines) || 99);
  if (s.inv.lines < maxLines) pool.push('line');
  if (s.week >= 2 && s.lines.some((l) => !l.express) && !(s.inv.express > 0)) pool.push('express');
  const a = pool.splice(Math.floor(rnd(s) * pool.length), 1)[0];
  const b = pool[Math.floor(rnd(s) * pool.length)];
  s.pendingUpgrade = { options: [a, b] };
  events.push({ type: 'week', options: [a, b] });
}

// A new passenger wants the shape of another random station, so common shapes are wanted more often than rare ones.
function spawnPax(s) {
  const relaxed = s.mode === 'relaxed';
  for (let tries = 0; tries < 6; tries++) {
    const st = s.stations[Math.floor(rnd(s) * s.stations.length)];
    if (relaxed && st.queue.length >= cap(st) + 4) continue;
    const opts = s.stations.filter((o) => o.shape !== st.shape);
    if (!opts.length) return;
    st.queue.push(opts[Math.floor(rnd(s) * opts.length)].shape);
    return;
  }
}

function tick(s, dt, events) {
  s.t += dt;
  s.day = Math.floor(s.t / DAY) % 7;
  if (s.t >= s.nextStation) {
    const st = placeStation(s, newShape(s));
    if (st) events.push({ type: 'station', id: st.id });
    s.nextStation = s.t + Math.max(9, 22 - s.week * 2);
  }
  if (s.t >= s.nextPax) {
    spawnPax(s);
    const perStation = Math.max(PAX_MIN, PAX_START - s.t / PAX_RAMP) * (cityOf(s).busy || 1) * ((s.mods && s.mods.busy) || 1)
      * (rushHour(s) ? RUSH_K : CALM_K);
    s.nextPax = s.t + perStation / s.stations.length;
  }
  s.lines.forEach((line, L) => line.trains.forEach((tr) => moveTrain(s, L, tr, dt, events)));
  for (const st of s.stations) {
    const before = st.overflow;
    if (st.queue.length > cap(st)) st.overflow += dt / OVERFLOW;
    else st.overflow = Math.max(0, st.overflow - dt / RECOVER);
    if (s.mode === 'relaxed') st.overflow = Math.min(0.95, st.overflow);
    if (before < 0.5 && st.overflow >= 0.5) events.push({ type: 'warn', id: st.id });
    if (st.overflow >= 1 && !s.over) {
      st.overflow = 1;
      s.over = true;
      events.push({ type: 'over', id: st.id });
      return;
    }
  }
  if (Math.floor(s.t / (DAY * 7)) > s.week) endWeek(s, events);
}

export function step(s, dt) {
  const events = [];
  if (s.over || s.pendingUpgrade || !(dt > 0)) return events;
  while (dt > 1e-9 && !s.over && !s.pendingUpgrade) {
    const h = Math.min(0.1, dt);
    tick(s, h, events);
    dt -= h;
  }
  return events;
}
