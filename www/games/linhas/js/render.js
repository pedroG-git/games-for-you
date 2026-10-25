// Canvas drawing for Linhas. Sizes are in screen pixels so the map stays readable while the city grows.
import { CITIES, COLORS, CB_COLORS } from './cities.js';
import { trainPose, segmentPoints, wants, weatherOf, DAY, MAP } from './engine.js';

export const LW = 7;      // line width
export const SR = 11;     // station radius
export const R = {
  canvas: null, ctx: null, W: 0, H: 0, dpr: 1,
  cam: null, scale: 1, ox: 0, oy: 0, padT: 80, padB: 96, padL: 0, padR: 0,
  rot: false, // landscape: the tall map is drawn turned a quarter (its top on the left); the game itself never knows
  pops: {}, floats: [], caps: [], paths: [], overId: -1,
  zoom: { k: 1, x: 0, y: 0 }, // the player's pinch zoom on top of the automatic fit: screen = fit × k + (x, y)
};

// Look of the map: day or night, and line colours that colour-blind players can tell apart.
export const look = { night: false, cb: false, cycle: true };
const THEMES = {
  day: { station: '#fff', ink: '#222', pax: '#333', core: 'rgba(255,255,255,.75)', halo: '#fff', wedge: 'rgba(40,40,50,.22)', soft: 'rgba(31,42,68,.35)' },
  night: { station: '#1c2232', ink: '#eef1f7', pax: '#d3d9e6', core: 'rgba(8,12,22,.55)', halo: '#0b0f1a', wedge: 'rgba(230,235,245,.25)', soft: 'rgba(238,241,247,.35)',
    bg: '#161c2b', water: '#253a52' },
};
export const paint = (c) => (look.cb && COLORS.includes(c) ? CB_COLORS[COLORS.indexOf(c)] : c);

export function init(canvas) {
  R.canvas = canvas;
  R.ctx = canvas.getContext('2d');
  resize();
  addEventListener('resize', resize);
}

export function resize() {
  const c = R.canvas;
  R.dpr = Math.min(devicePixelRatio || 1, 3);
  R.W = c.clientWidth; R.H = c.clientHeight;
  c.width = Math.round(R.W * R.dpr); c.height = Math.round(R.H * R.dpr);
  R.rot = R.W > R.H;
  const hud = document.getElementById('hud'), bar = document.getElementById('bar');
  if (R.rot) { // the HUD is a column on the left, the controls a column on the right (style.css)
    R.padT = R.padB = 8; R.padL = R.padR = 0;
    if (hud && hud.offsetParent) R.padL = hud.getBoundingClientRect().right - 8;
    if (bar && bar.offsetParent) R.padR = R.W - bar.getBoundingClientRect().left - 8;
    return;
  }
  R.padL = R.padR = 0;
  if (hud && hud.offsetParent) R.padT = hud.getBoundingClientRect().bottom + 8;
  if (bar && bar.offsetParent) R.padB = R.H - bar.getBoundingClientRect().top + 8;
}

export function reset(state) {
  R.cam = { ...state.view };
  R.pops = {}; R.floats = []; R.caps = []; R.paths = []; R.overId = -1; R.zoom = { k: 1, x: 0, y: 0 }; laneCache = { key: '', runs: [] };
}

export const pop = (id, now) => { R.pops[id] = now; };
export const float = (x, y, text, now) => { R.floats.push({ x, y, text, t0: now }); };

function fit() {
  const c = R.rot ? { x: R.cam.y, y: MAP.w - R.cam.x - R.cam.w, w: R.cam.h, h: R.cam.w } : R.cam; // the view as drawn
  const aw = Math.max(80, R.W - 32 - R.padL - R.padR), ah = Math.max(80, R.H - R.padT - R.padB);
  R.scale = Math.min(aw / c.w, ah / c.h);
  R.ox = 16 + R.padL + (aw - c.w * R.scale) / 2 - c.x * R.scale;
  R.oy = R.padT + (ah - c.h * R.scale) / 2 - c.y * R.scale;
  const z = R.zoom;
  R.scale *= z.k; R.ox = R.ox * z.k + z.x; R.oy = R.oy * z.k + z.y;
}
// Zoom by k (1..3) keeping the map under the screen point (mx, my) at that point; the map can't be pushed off screen.
export function setZoom(k, mx, my, from = R.zoom) {
  k = Math.max(1, Math.min(3, k));
  const bx = (mx - from.x) / from.k, by = (my - from.y) / from.k; // that point before any zoom
  const x = mx - bx * k, y = my - by * k;
  R.zoom = { k, x: Math.max(R.W * (1 - k), Math.min(0, x)), y: Math.max(R.H * (1 - k), Math.min(0, y)) };
  if (k < 1.03) R.zoom = { k: 1, x: 0, y: 0 };
}
// Map point ↔ screen point. Turned: map (x, y) is drawn at (y, MAP.w - x), a rotation, so left stays left.
export const toScreen = (x, y) => (R.rot ? { x: y * R.scale + R.ox, y: (MAP.w - x) * R.scale + R.oy } : { x: x * R.scale + R.ox, y: y * R.scale + R.oy });
export const toWorld = (sx, sy) => {
  const u = (sx - R.ox) / R.scale, v = (sy - R.oy) / R.scale;
  return R.rot ? { x: MAP.w - v, y: u } : { x: u, y: v };
};
// A direction on the map as a direction on screen.
const turn = (x, y) => (R.rot ? { x: y, y: -x } : { x, y });

// ---------------------------------------------------------------- shapes
function poly(c, x, y, r, n, a0) {
  for (let i = 0; i < n; i++) {
    const a = a0 + (i * Math.PI * 2) / n;
    i ? c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
}
export function shapePath(c, shape, x, y, r) {
  c.beginPath();
  switch (shape) {
    case 'triangle': poly(c, x, y + r * 0.18, r * 1.3, 3, -Math.PI / 2); break;
    case 'square': c.rect(x - r * 0.88, y - r * 0.88, r * 1.76, r * 1.76); break;
    case 'diamond': poly(c, x, y, r * 1.2, 4, -Math.PI / 2); break;
    case 'pentagon': poly(c, x, y, r * 1.1, 5, -Math.PI / 2); break;
    case 'star':
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.58 : r * 1.3;
        i ? c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      break;
    case 'cross': {
      const a = r * 0.38, b = r * 1.05;
      const p = [[-a, -b], [a, -b], [a, -a], [b, -a], [b, a], [a, a], [a, b], [-a, b], [-a, a], [-b, a], [-b, -a], [-a, -a]];
      p.forEach(([dx, dy], i) => (i ? c.lineTo(x + dx, y + dy) : c.moveTo(x + dx, y + dy)));
      break;
    }
    default: c.arc(x, y, r, 0, Math.PI * 2);
  }
  c.closePath();
}

// ---------------------------------------------------------------- drawing
function strokeScreen(c, pts, color, w, alpha = 1) {
  if (pts.length < 2) return;
  c.globalAlpha = alpha;
  c.strokeStyle = color; c.lineWidth = w;
  c.beginPath();
  pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
  c.stroke();
  c.globalAlpha = 1;
}
const strokeWorld = (c, pts, color, w, alpha) => strokeScreen(c, pts.map((p) => toScreen(p.x, p.y)), color, w, alpha);

// Consecutive station pairs of a line (a loop also has the closing pair).
function linePairs(L) {
  const ids = L.stations, out = [];
  for (let k = 1; k < ids.length; k++) out.push([ids[k - 1], ids[k]]);
  if (L.loop && ids.length > 2) out.push([ids[ids.length - 1], ids[0]]);
  return out;
}
const pairKey = (a, b) => (a < b ? a + '-' + b : b + '-' + a);

// Every line is cut into straight runs. Runs of different lines that lie on top of each other (same direction, same
// track, overlapping) form a corridor, and every line in a corridor gets its own lane, so no line hides another.
// Lanes are ordered so lines don't cross over each other: a line that leaves the corridor to one side runs on that
// side, and lines that turn a corner together keep their order (left stays left), however the track turns.
export const GAP = LW + 3; // px between the centres of side-by-side lines: leaves a visible gap
let laneCache = { key: '', runs: [] };
function lanes(S) {
  const key = S.lines.map((l) => l.stations.join(',') + (l.loop ? 'o' : '')).join('|');
  if (key === laneCache.key) return laneCache.runs;
  const runs = [];
  S.lines.forEach((L, li) => linePairs(L).forEach(([a, b], k) => {
    const p = segmentPoints(S.stations[a], S.stations[b]);
    for (let i = 0; i < p.length - 1; i++) {
      const A = p[i], B = p[i + 1], len = Math.hypot(B.x - A.x, B.y - A.y);
      if (len < 1e-6) continue;
      let ux = (B.x - A.x) / len, uy = (B.y - A.y) / len;
      if (ux < -1e-6 || (Math.abs(ux) <= 1e-6 && uy < 0)) { ux = -ux; uy = -uy; } // same direction for both ways
      const t0 = A.x * ux + A.y * uy, t1 = B.x * ux + B.y * uy;
      runs.push({ li, k, A, B, ux, uy, c: A.y * ux - A.x * uy, lo: Math.min(t0, t1), hi: Math.max(t0, t1), lane: 0,
        s: (B.x - A.x) * ux + (B.y - A.y) * uy > 0 ? 1 : -1 }); // s: runs along (1) or against (-1) its direction u
    }
  }));
  const up = runs.map((_, i) => i), find = (i) => (up[i] === i ? i : (up[i] = find(up[i])));
  for (let i = 0; i < runs.length; i++) for (let j = i + 1; j < runs.length; j++) {
    const r = runs[i], q = runs[j];
    if (Math.abs(r.ux - q.ux) > 1e-3 || Math.abs(r.uy - q.uy) > 1e-3 || Math.abs(r.c - q.c) > 0.5) continue;
    if (Math.min(r.hi, q.hi) - Math.max(r.lo, q.lo) > 0.5) up[find(i)] = find(j);
  }
  const groups = new Map();
  runs.forEach((r, i) => { const g = find(i); if (!groups.has(g)) groups.set(g, new Set()); groups.get(g).add(r.li); });
  // Each line's runs in travel order: the run before and after each one (a loop wraps around).
  const prev = new Array(runs.length).fill(-1), next = new Array(runs.length).fill(-1);
  for (let i = 1; i < runs.length; i++) if (runs[i].li === runs[i - 1].li) { prev[i] = i - 1; next[i - 1] = i; }
  S.lines.forEach((L, li) => {
    if (!L.loop) return;
    const own = runs.map((r, i) => (r.li === li ? i : -1)).filter((i) => i >= 0);
    if (own.length > 2) { prev[own[0]] = own[own.length - 1]; next[own[own.length - 1]] = own[0]; }
  });
  // Side: where a line goes when it leaves its corridor (+1 towards the normal n = (-uy, ux), -1 away from it).
  const side = new Map();
  runs.forEach((r, i) => {
    const g = find(i);
    let v = 0;
    for (const [j, out] of [[next[i], 1], [prev[i], -1]]) {
      if (j < 0 || find(j) === g) continue;
      const q = runs[j], dx = (q.B.x - q.A.x) * out, dy = (q.B.y - q.A.y) * out; // pointing away from this run
      const d = -r.uy * dx + r.ux * dy;
      if (Math.abs(d) > 1e-6) v += Math.sign(d);
    }
    const key = g + '|' + r.li;
    side.set(key, (side.get(key) || 0) + v);
  });
  // Turning a corner together: the lane order flips with the frame when the two runs point opposite ways (s·s' < 0).
  // Every corridor gets a flip so that shared corners agree, spreading out from the biggest corridors.
  const links = new Map();
  runs.forEach((r, i) => {
    const j = next[i];
    if (j < 0) return;
    const g = find(i), h = find(j);
    if (g === h) return;
    const key = g + '>' + h;
    if (!links.has(key)) links.set(key, { g, h, sign: r.s * runs[j].s, n: 0 });
    links.get(key).n++;
  });
  const adj = new Map();
  for (const l of links.values()) {
    if (l.n < 2) continue; // only corners that at least two lines turn together
    for (const [a, b] of [[l.g, l.h], [l.h, l.g]]) { if (!adj.has(a)) adj.set(a, []); adj.get(a).push([b, l.sign]); }
  }
  const flip = new Map();
  for (const g of [...groups.keys()].sort((a, b) => groups.get(b).size - groups.get(a).size)) {
    if (flip.has(g)) continue;
    flip.set(g, 1);
    const q = [g];
    while (q.length) {
      const a = q.shift();
      for (const [b, sg] of adj.get(a) || []) if (!flip.has(b)) { flip.set(b, flip.get(a) * sg); q.push(b); }
    }
  }
  const order = new Map();
  for (const [g, set] of groups) {
    const f = flip.get(g);
    order.set(g, [...set].sort((x, y) => f * ((side.get(g + '|' + x) || 0) - (side.get(g + '|' + y) || 0)) || x - y));
  }
  runs.forEach((r, i) => {
    const g = find(i), list = order.get(g), f = flip.get(g);
    r.lane = f * (list.indexOf(r.li) - (list.length - 1) / 2) * GAP;
  });
  laneCache = { key, runs };
  return runs;
}
// Where two consecutive lanes meet: the corner of the shifted runs (or both ends when they are parallel).
function corner(p1, q1, p2, q2) {
  const d1x = q1.x - p1.x, d1y = q1.y - p1.y, d2x = q2.x - p2.x, d2y = q2.y - p2.y;
  const den = d1x * d2y - d1y * d2x;
  if (Math.abs(den) < 1e-6) return null;
  const t = ((p2.x - p1.x) * d2y - (p2.y - p1.y) * d2x) / den;
  const x = { x: p1.x + d1x * t, y: p1.y + d1y * t };
  return Math.hypot(x.x - q1.x, x.y - q1.y) < GAP * 4 ? x : null;
}
// The drawn path of line li in screen pixels, plus which station pair (k) each piece belongs to.
function linePath(S, li) {
  const runs = lanes(S).filter((r) => r.li === li), pts = [], ks = [];
  const seg = runs.map((r) => {
    const a = toScreen(r.A.x, r.A.y), b = toScreen(r.B.x, r.B.y), { x: ox, y: oy } = turn(-r.uy * r.lane, r.ux * r.lane);
    return { a: { x: a.x + ox, y: a.y + oy }, b: { x: b.x + ox, y: b.y + oy }, k: r.k };
  });
  seg.forEach((s, i) => {
    if (i === 0) { pts.push(s.a); return; }
    const p = seg[i - 1], x = corner(p.a, p.b, s.a, s.b);
    if (x) { pts.push(x); ks.push(p.k); } else { pts.push(p.b); ks.push(p.k); pts.push(s.a); ks.push(s.k); }
  });
  if (seg.length) { pts.push(seg[seg.length - 1].b); ks.push(seg[seg.length - 1].k); }
  if (S.lines[li].loop && seg.length > 2) { // close the loop at a proper corner
    const l = seg[seg.length - 1], f = seg[0], x = corner(l.a, l.b, f.a, f.b);
    if (x) { pts[0] = x; pts[pts.length - 1] = x; }
  }
  return { pts, ks };
}
// Lane shift of line li at world point w (for trains).
function laneAt(S, li, w) {
  let best = null, bd = Infinity;
  for (const r of lanes(S)) {
    if (r.li !== li) continue;
    const d = distSeg(w, r.A, r.B);
    if (d < bd) { bd = d; best = r; }
  }
  return best ? turn(-best.uy * best.lane, best.ux * best.lane) : { x: 0, y: 0 };
}
function distSeg(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy;
  const t = L ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

// Stub past each terminal, ending in a round badge with the line's number: grab it to extend the line.
function endCap(c, li, end, pts, color) {
  const sp = end === 'start' ? pts[0] : pts[pts.length - 1];
  let q = null;
  const order = end === 'start' ? pts : pts.slice().reverse();
  for (const o of order) if (Math.hypot(o.x - sp.x, o.y - sp.y) > 0.5) { q = o; break; }
  let dx = 0, dy = -1;
  if (q) { const L = Math.hypot(sp.x - q.x, sp.y - q.y) || 1; dx = (sp.x - q.x) / L; dy = (sp.y - q.y) / L; }
  const tip = { x: sp.x + dx * 24, y: sp.y + dy * 24 };
  c.strokeStyle = color; c.lineWidth = LW;
  c.beginPath(); c.moveTo(sp.x, sp.y); c.lineTo(tip.x, tip.y); c.stroke();
  c.fillStyle = color; c.beginPath(); c.arc(tip.x, tip.y, 8.5, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#fff'; c.font = 'bold 11px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(String(li + 1), tip.x, tip.y + 0.5);
  R.caps.push({ line: li, end, x: tip.x, y: tip.y });
}

// 0 by day, 1 at night: dusk from 70% of the day, dawn until 12% of the next.
function duskOf(t) {
  const f = (t % DAY) / DAY;
  if (f < 0.04) return 1;
  if (f < 0.12) return 1 - (f - 0.04) / 0.08;
  if (f < 0.7) return 0;
  if (f < 0.85) return (f - 0.7) / 0.15;
  return 1;
}
// Rain, snow or fog over the map (screen space, light enough to play through).
function drawWeather(c, wx, now) {
  if (wx === 'clear') return;
  if (wx === 'fog') {
    const g = c.createLinearGradient(0, 0, 0, R.H);
    g.addColorStop(0, 'rgba(235,238,242,.32)'); g.addColorStop(0.5, 'rgba(235,238,242,.12)'); g.addColorStop(1, 'rgba(235,238,242,.32)');
    c.fillStyle = g; c.fillRect(0, 0, R.W, R.H); return;
  }
  const n = wx === 'rain' ? 70 : 55, t = now / 1000;
  c.strokeStyle = 'rgba(70,100,140,.28)'; c.fillStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 1.3;
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const r1 = ((i * 7919) % 1000) / 1000, r2 = ((i * 104729) % 1000) / 1000;
    if (wx === 'rain') {
      const y = ((r2 * R.H + t * (520 + r1 * 200)) % (R.H + 40)) - 20, x = ((r1 * R.W - y * 0.18) % R.W + R.W) % R.W;
      c.moveTo(x, y); c.lineTo(x - 3, y + 14);
    } else {
      const y = ((r2 * R.H + t * (40 + r1 * 30)) % (R.H + 20)) - 10, x = (r1 * R.W + Math.sin(t + i) * 12 + R.W) % R.W;
      c.moveTo(x + 2.2, y); c.arc(x, y, 2.2, 0, Math.PI * 2);
    }
  }
  if (wx === 'rain') c.stroke(); else c.fill();
}

function easeBack(t) { const s = 1.7; t -= 1; return t * t * ((s + 1) * t + s) + 1; }

export function draw(S, ui, now) {
  const c = R.ctx, city = CITIES.find((k) => k.id === S.city) || CITIES[0], T = look.night ? THEMES.night : THEMES.day;
  if (!R.cam) R.cam = { ...S.view };
  for (const p of ['x', 'y', 'w', 'h']) R.cam[p] += (S.view[p] - R.cam[p]) * 0.04;
  fit();
  c.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
  c.fillStyle = T.bg || city.bg; c.fillRect(0, 0, R.W, R.H);

  // water
  c.fillStyle = T.water || city.water;
  const water = (city.waterPolys || []).length ? new Path2D() : null;
  for (const poly of city.waterPolys || []) {
    poly.forEach(([x, y], i) => { const p = toScreen(x, y); i ? water.lineTo(p.x, p.y) : water.moveTo(p.x, p.y); });
    water.closePath();
  }
  if (water) c.fill(water);

  // landmarks: faint, under everything, so the city feels like itself
  c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const m of city.landmarks || []) {
    const p = toScreen(m.x, m.y);
    c.globalAlpha = 0.45; c.font = '26px system-ui, sans-serif'; c.fillText(m.icon, p.x, p.y);
    c.globalAlpha = 0.5; c.fillStyle = T.ink; c.font = '600 10px system-ui, sans-serif'; c.fillText(m.name, p.x, p.y + 22);
    c.globalAlpha = 1;
  }

  // day and night: evenings darken the map a little and the stations light up (not with the night look, already dark)
  const dusk = look.night || !look.cycle ? 0 : duskOf(S.t);
  if (dusk > 0) { c.fillStyle = `rgba(22,30,70,${0.2 * dusk})`; c.fillRect(0, 0, R.W, R.H); }

  // lines: each one sits on a casing in the map colour, so side-by-side lines keep a gap and crossings show
  // which line is on top. One line in focus (picked, or being edited) makes the others step back.
  c.lineCap = 'round'; c.lineJoin = 'round';
  R.caps = [];
  R.paths = S.lines.map((_, i) => linePath(S, i));
  const P = ui.preview, focus = ui.sel != null && S.lines[ui.sel] ? ui.sel : P ? P.line : ui.carry && ui.carry.target && ui.carry.target.line;
  const bgc = T.bg || city.bg;
  S.lines.forEach((L, i) => {
    const pts = R.paths[i].pts;
    const editing = P && P.line === i;
    const a = editing ? 0.3 : focus == null ? 1 : focus === i ? 1 : focus === -1 ? 0.55 : 0.3;
    strokeScreen(c, pts, bgc, LW + 4, a);
    if (ui.sel === i) strokeScreen(c, pts, T.halo, LW + 8, 0.9);
    strokeScreen(c, pts, paint(L.color), LW, a);
    if (!L.loop && pts.length > 1 && !editing) {
      c.globalAlpha = a;
      endCap(c, i, 'start', pts, paint(L.color)); endCap(c, i, 'end', pts, paint(L.color));
      c.globalAlpha = 1;
    }
    if (L.express) { // express line: a dashed white stripe down the middle
      c.setLineDash([3, 9]); strokeScreen(c, pts, '#fff', 2.5, 0.9 * a); c.setLineDash([]);
    }
    if (water && city.ferry) { // ferry: over the water the line becomes a dashed route
      c.save(); c.clip(water);
      strokeScreen(c, pts, T.water || city.water, LW + 5, a);
      c.setLineDash([LW * 1.4, LW * 0.9]); strokeScreen(c, pts, paint(L.color), LW - 2, a); c.setLineDash([]);
      c.restore();
    } else if (water && a === 1) { // tunnel: where the line is under the river, it gets a pale core
      c.save(); c.clip(water);
      strokeScreen(c, pts, T.core, LW - 4);
      c.restore();
    }
  });

  // first-game hint: a dashed line pulsing between the first two stations
  if (ui.hint === 'draw' && S.stations.length > 1 && !ui.preview) {
    c.setLineDash([2, 14]); c.lineDashOffset = -now / 40;
    strokeScreen(c, segmentPoints(S.stations[0], S.stations[1]).map((p) => toScreen(p.x, p.y)), '#e4423f', LW, 0.5 + 0.3 * Math.sin(now / 250));
    c.setLineDash([]);
  }

  // preview of the line being drawn
  if (ui.preview) {
    const pts = [];
    for (let i = 0; i < P.pts.length; i++) {
      if (i === 0) { pts.push(P.pts[0]); continue; }
      const seg = segmentPoints(P.pts[i - 1], P.pts[i]);
      pts.push(...seg.slice(1));
    }
    strokeWorld(c, pts, bgc, LW + 4);
    strokeWorld(c, pts, P.bad ? '#d33' : paint(P.color), LW, P.bad ? 0.8 : 1);
  }

  // trains: one rounded car per carriage, a little wider than the line, passengers as white shapes
  const hidden = ui.carry && ui.carry.hide;
  S.lines.forEach((L, li) => L.trains.forEach((t, ti) => {
    if (hidden && hidden.line === li && hidden.train === ti) return;
    let pose;
    try { pose = trainPose(S, li, ti); } catch (e) { return; }
    if (!pose) return;
    const off = laneAt(S, li, pose);
    const s = toScreen(pose.x, pose.y);
    c.save(); c.translate(s.x + off.x, s.y + off.y); c.rotate((pose.angle || 0) - (R.rot ? Math.PI / 2 : 0));
    const cars = Math.max(1, t.cars || 1);
    for (let k = 0; k < cars; k++) {
      const x0 = -13 - k * 29;
      c.fillStyle = paint(L.color); c.strokeStyle = 'rgba(0,0,0,.28)'; c.lineWidth = 1.5;
      c.beginPath(); c.roundRect ? c.roundRect(x0, -8.5, 26, 17, 4) : c.rect(x0, -8.5, 26, 17); c.fill(); c.stroke();
      if (L.express) { c.fillStyle = 'rgba(255,255,255,.85)'; c.fillRect(x0 + 2, -1, 22, 2); }
      c.fillStyle = '#fff';
      const pax = (t.pax || []).slice(k * 6, k * 6 + 6);
      pax.forEach((sh, j) => { shapePath(c, sh, x0 + 5.5 + (j % 3) * 7.5, -3.8 + Math.floor(j / 3) * 7.6, 2.6); c.fill(); });
    }
    c.restore();
  }));

  // station lights after dark
  if (dusk > 0.05) for (const st of S.stations) {
    const s = toScreen(st.x, st.y), g = c.createRadialGradient(s.x, s.y, SR * 0.6, s.x, s.y, SR + 18);
    g.addColorStop(0, `rgba(255,205,110,${0.55 * dusk})`); g.addColorStop(1, 'rgba(255,205,110,0)');
    c.fillStyle = g; c.beginPath(); c.arc(s.x, s.y, SR + 18, 0, Math.PI * 2); c.fill();
  }

  // stations
  for (const st of S.stations) {
    const s = toScreen(st.x, st.y);
    let k = 1;
    const p0 = R.pops[st.id];
    if (p0 != null) { const t = (now - p0) / 450; if (t >= 1) delete R.pops[st.id]; else k = Math.max(0.01, easeBack(t)); }
    const r = SR * k;
    if (st.overflow > 0) {
      const hot = st.overflow > 0.5;
      c.fillStyle = hot ? `rgba(214,51,51,${0.25 + 0.12 * Math.sin(now / 140)})` : T.wedge;
      c.beginPath(); c.moveTo(s.x, s.y); c.arc(s.x, s.y, r + 16, -Math.PI / 2, -Math.PI / 2 + st.overflow * Math.PI * 2); c.closePath(); c.fill();
    }
    if (R.overId === st.id) {
      c.strokeStyle = '#d33'; c.lineWidth = 4;
      c.beginPath(); c.arc(s.x, s.y, r + 18 + Math.sin(now / 120) * 3, 0, Math.PI * 2); c.stroke();
    }
    if (st.interchange) {
      c.fillStyle = T.station; c.strokeStyle = T.ink; c.lineWidth = 3.5;
      c.beginPath(); c.arc(s.x, s.y, r + 7, 0, Math.PI * 2); c.fill(); c.stroke();
    }
    shapePath(c, st.shape, s.x, s.y, r);
    c.fillStyle = T.station; c.fill();
    c.strokeStyle = T.ink; c.lineWidth = 3.5; c.stroke();
    // waiting passengers
    c.fillStyle = T.pax;
    (st.queue || []).forEach((sh, j) => {
      shapePath(c, sh, s.x + r + 9 + (j % 6) * 9, s.y - 5 + Math.floor(j / 6) * 9, 3.3);
      c.fill();
    });
  }

  // picked line: mark its stations, tapping one takes it off the line
  if (ui.sel != null && S.lines[ui.sel]) {
    c.strokeStyle = paint(S.lines[ui.sel].color); c.lineWidth = 3; c.setLineDash([5, 5]); c.lineDashOffset = -now / 60;
    for (const id of S.lines[ui.sel].stations) { const s = toScreen(S.stations[id].x, S.stations[id].y); c.beginPath(); c.arc(s.x, s.y, SR + 9, 0, Math.PI * 2); c.stroke(); }
    c.setLineDash([]);
  }

  // tapped station: where its passengers want to go (green: a line can take them, red: no way there yet)
  if (ui.info && S.stations[ui.info.station] && !ui.preview) {
    const from = S.stations[ui.info.station], w = wants(S, from.id), f = toScreen(from.x, from.y);
    c.strokeStyle = T.ink; c.lineWidth = 3; c.beginPath(); c.arc(f.x, f.y, SR + 9, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 3; c.setLineDash([4, 5]); c.lineDashOffset = -now / 50;
    for (const st of S.stations) {
      const o = w.find((x) => x.shape === st.shape);
      if (!o || st.id === from.id) continue;
      const s = toScreen(st.x, st.y);
      c.strokeStyle = o.ok ? '#2fa35b' : '#d33';
      c.beginPath(); c.arc(s.x, s.y, SR + 8 + Math.sin(now / 200) * 2, 0, Math.PI * 2); c.stroke();
    }
    c.setLineDash([]);
  }

  // tool hint: highlight targets
  if (ui.tool === 'interchange') {
    c.strokeStyle = 'rgba(228,66,63,.6)'; c.lineWidth = 2;
    for (const st of S.stations) if (!st.interchange) { const s = toScreen(st.x, st.y); c.beginPath(); c.arc(s.x, s.y, SR + 10 + Math.sin(now / 150) * 2, 0, Math.PI * 2); c.stroke(); }
  }

  // a spare being dragged: its target lights up, and the item floats above the finger
  if (ui.carry || ui.tool === 'train' || ui.tool === 'carriage') {
    const k = ui.carry, tg = k && k.target, pulse = 0.5 + 0.3 * Math.sin(now / 150);
    if (k && (k.kind === 'train' || k.kind === 'express') && tg && tg.line != null) strokeScreen(c, R.paths[tg.line].pts, paint(S.lines[tg.line].color), LW + 10, pulse * 0.6);
    if (k && k.kind === 'interchange' && tg) {
      const s = toScreen(S.stations[tg.station].x, S.stations[tg.station].y);
      c.strokeStyle = '#e4423f'; c.lineWidth = 4; c.beginPath(); c.arc(s.x, s.y, SR + 12, 0, Math.PI * 2); c.stroke();
    }
    if ((k && k.kind === 'carriage') || ui.tool === 'carriage') {
      S.lines.forEach((L, li) => L.trains.forEach((t, ti) => {
        const q = trainPose(S, li, ti); if (!q) return;
        const s = toScreen(q.x, q.y), on = tg && tg.line === li && tg.train === ti;
        c.strokeStyle = on ? '#e4423f' : T.soft; c.lineWidth = on ? 4 : 2;
        c.beginPath(); c.arc(s.x, s.y, on ? 26 : 22, 0, Math.PI * 2); c.stroke();
      }));
    }
    if (k) {
      const col = tg && tg.line != null ? paint(S.lines[tg.line].color) : '#1f2a44';
      c.save(); c.translate(k.x, k.y); c.globalAlpha = tg ? 1 : 0.6;
      c.fillStyle = col; c.strokeStyle = '#fff'; c.lineWidth = 3;
      c.shadowColor = 'rgba(0,0,0,.3)'; c.shadowBlur = 10; c.shadowOffsetY = 4;
      c.beginPath();
      if (k.kind === 'interchange') { c.fillStyle = '#fff'; c.strokeStyle = '#222'; c.arc(0, 0, SR + 7, 0, Math.PI * 2); }
      else if (c.roundRect) c.roundRect(-17, -11, 34, 22, 5); else c.rect(-17, -11, 34, 22);
      c.fill(); c.shadowColor = 'transparent'; c.stroke();
      if (k.kind === 'carriage' || k.kind === 'express') { c.fillStyle = '#fff'; c.font = 'bold 18px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(k.kind === 'express' ? '⚡' : '+', 0, 1); }
      c.restore();
    }
  }

  drawWeather(c, weatherOf(S), now);

  // floating +1
  c.textAlign = 'center'; c.font = 'bold 15px system-ui, sans-serif';
  R.floats = R.floats.filter((f) => now - f.t0 < 900);
  for (const f of R.floats) {
    const t = (now - f.t0) / 900, s = toScreen(f.x, f.y);
    c.globalAlpha = 1 - t; c.fillStyle = T.ink;
    c.fillText(f.text, s.x, s.y - 18 - t * 26);
  }
  c.globalAlpha = 1;

  // zoomed in: a station filling up out of sight gets a marker at the screen edge, pointing to it
  R.marks = [];
  const x0 = R.padL + 34, y0 = R.padT + 34, x1 = R.W - R.padR - 34, y1 = R.H - R.padB - 34, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  for (const st of S.stations) {
    if (!(st.overflow > 0)) continue;
    const s = toScreen(st.x, st.y);
    if (s.x > x0 - 20 && s.x < x1 + 20 && s.y > y0 - 20 && s.y < y1 + 20) continue;
    const dx = s.x - cx, dy = s.y - cy, f = Math.min(Math.abs((dx > 0 ? x1 - cx : cx - x0) / dx || Infinity), Math.abs((dy > 0 ? y1 - cy : cy - y0) / dy || Infinity));
    const mx = cx + dx * f, my = cy + dy * f, a = Math.atan2(dy, dx), hot = st.overflow > 0.5;
    R.marks.push({ x: mx, y: my });
    c.save(); c.translate(mx, my);
    c.fillStyle = hot ? `rgba(214,51,51,${0.75 + 0.2 * Math.sin(now / 140)})` : T.ink;
    c.save(); c.rotate(a); c.beginPath(); c.moveTo(25, 0); c.lineTo(13, -8); c.lineTo(13, 8); c.closePath(); c.fill(); c.restore();
    c.beginPath(); c.arc(0, 0, 16, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 3;
    c.beginPath(); c.arc(0, 0, 12, -Math.PI / 2, -Math.PI / 2 + st.overflow * Math.PI * 2); c.stroke();
    c.fillStyle = '#fff'; shapePath(c, st.shape, 0, 0, 6); c.fill();
    c.restore();
  }
}
