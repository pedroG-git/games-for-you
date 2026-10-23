// Canvas drawing for Linhas. Sizes are in screen pixels so the map stays readable while the city grows.
import { CITIES } from './cities.js';
import { trainPose, segmentPoints } from './engine.js';

export const LW = 7;      // line width
export const SR = 11;     // station radius
export const R = {
  canvas: null, ctx: null, W: 0, H: 0, dpr: 1,
  cam: null, scale: 1, ox: 0, oy: 0, padT: 80, padB: 96,
  pops: {}, floats: [], caps: [], overId: -1,
};

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
  const hud = document.getElementById('hud'), bar = document.getElementById('bar');
  if (hud && hud.offsetParent) R.padT = hud.getBoundingClientRect().bottom + 8;
  if (bar && bar.offsetParent) R.padB = R.H - bar.getBoundingClientRect().top + 8;
}

export function reset(state) {
  R.cam = { ...state.view };
  R.pops = {}; R.floats = []; R.caps = []; R.overId = -1;
}

export const pop = (id, now) => { R.pops[id] = now; };
export const float = (x, y, text, now) => { R.floats.push({ x, y, text, t0: now }); };

function fit() {
  const c = R.cam, aw = R.W - 32, ah = Math.max(80, R.H - R.padT - R.padB);
  R.scale = Math.min(aw / c.w, ah / c.h);
  R.ox = 16 + (aw - c.w * R.scale) / 2 - c.x * R.scale;
  R.oy = R.padT + (ah - c.h * R.scale) / 2 - c.y * R.scale;
}
export const toScreen = (x, y) => ({ x: x * R.scale + R.ox, y: y * R.scale + R.oy });
export const toWorld = (sx, sy) => ({ x: (sx - R.ox) / R.scale, y: (sy - R.oy) / R.scale });

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

// Lines that share a stretch of track are drawn side by side: which lines use each stretch.
function sharing(S) {
  const share = new Map();
  S.lines.forEach((L, li) => linePairs(L).forEach(([a, b]) => {
    const k = pairKey(a, b);
    if (!share.has(k)) share.set(k, []);
    if (!share.get(k).includes(li)) share.get(k).push(li);
  }));
  return share;
}
// Screen offset of line li on the stretch a-b.
function offsetFor(S, share, li, a, b) {
  const list = share.get(pairKey(a, b));
  if (!list || list.length < 2) return { x: 0, y: 0 };
  const lo = S.stations[Math.min(a, b)], hi = S.stations[Math.max(a, b)];
  const dx = hi.x - lo.x, dy = hi.y - lo.y, l = Math.hypot(dx, dy) || 1;
  const o = (list.indexOf(li) - (list.length - 1) / 2) * (LW + 2);
  return { x: (-dy / l) * o, y: (dx / l) * o };
}
function linePath(S, share, L, li) {
  const out = [];
  for (const [a, b] of linePairs(L)) {
    const off = offsetFor(S, share, li, a, b);
    for (const p of segmentPoints(S.stations[a], S.stations[b])) {
      const q = toScreen(p.x, p.y);
      out.push({ x: q.x + off.x, y: q.y + off.y });
    }
  }
  return out;
}

// Short T-stub past each terminal: grab it to extend the line. pts are in screen pixels.
function endCap(c, li, end, pts, color) {
  const sp = end === 'start' ? pts[0] : pts[pts.length - 1];
  let q = null;
  const order = end === 'start' ? pts : pts.slice().reverse();
  for (const o of order) if (Math.hypot(o.x - sp.x, o.y - sp.y) > 0.5) { q = o; break; }
  let dx = 0, dy = -1;
  if (q) { const L = Math.hypot(sp.x - q.x, sp.y - q.y) || 1; dx = (sp.x - q.x) / L; dy = (sp.y - q.y) / L; }
  const tip = { x: sp.x + dx * 26, y: sp.y + dy * 26 };
  c.strokeStyle = color; c.lineWidth = LW;
  c.beginPath(); c.moveTo(sp.x, sp.y); c.lineTo(tip.x, tip.y); c.stroke();
  c.beginPath(); c.moveTo(tip.x - dy * 9, tip.y + dx * 9); c.lineTo(tip.x + dy * 9, tip.y - dx * 9); c.stroke();
  R.caps.push({ line: li, end, x: tip.x, y: tip.y });
}

function easeBack(t) { const s = 1.7; t -= 1; return t * t * ((s + 1) * t + s) + 1; }

export function draw(S, ui, now) {
  const c = R.ctx, city = CITIES.find((k) => k.id === S.city) || CITIES[0];
  if (!R.cam) R.cam = { ...S.view };
  for (const p of ['x', 'y', 'w', 'h']) R.cam[p] += (S.view[p] - R.cam[p]) * 0.04;
  fit();
  c.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
  c.fillStyle = city.bg; c.fillRect(0, 0, R.W, R.H);

  // water
  c.fillStyle = city.water;
  for (const poly of city.waterPolys || []) {
    c.beginPath();
    poly.forEach(([x, y], i) => { const p = toScreen(x, y); i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); });
    c.closePath(); c.fill();
  }

  // lines
  c.lineCap = 'round'; c.lineJoin = 'round';
  R.caps = [];
  const share = sharing(S);
  S.lines.forEach((L, i) => {
    const pts = linePath(S, share, L, i);
    const dim = ui.preview && ui.preview.line === i ? 0.25 : 1;
    if (ui.sel === i) strokeScreen(c, pts, '#fff', LW + 8, 0.9);
    strokeScreen(c, pts, L.color, LW, dim);
    if (!L.loop && pts.length > 1 && dim === 1) { endCap(c, i, 'start', pts, L.color); endCap(c, i, 'end', pts, L.color); }
  });

  // first-game hint: a dashed line pulsing between the first two stations
  if (ui.hint === 'draw' && S.stations.length > 1 && !ui.preview) {
    c.setLineDash([2, 14]); c.lineDashOffset = -now / 40;
    strokeScreen(c, segmentPoints(S.stations[0], S.stations[1]).map((p) => toScreen(p.x, p.y)), '#e4423f', LW, 0.5 + 0.3 * Math.sin(now / 250));
    c.setLineDash([]);
  }

  // preview of the line being drawn
  if (ui.preview) {
    const P = ui.preview, pts = [];
    for (let i = 0; i < P.pts.length; i++) {
      if (i === 0) { pts.push(P.pts[0]); continue; }
      const seg = segmentPoints(P.pts[i - 1], P.pts[i]);
      pts.push(...seg.slice(1));
    }
    strokeWorld(c, pts, P.bad ? '#d33' : P.color, LW, P.bad ? 0.8 : 0.85);
  }

  // trains: one rounded car per carriage, a little wider than the line, passengers as white shapes
  S.lines.forEach((L, li) => L.trains.forEach((t, ti) => {
    let pose;
    try { pose = trainPose(S, li, ti); } catch (e) { return; }
    if (!pose) return;
    const n = L.stations.length;
    let prev = t.i - t.dir;
    if (L.loop) prev = (prev + n) % n;
    else prev = Math.max(0, Math.min(n - 1, prev));
    const off = n > 1 && prev !== t.i ? offsetFor(S, share, li, L.stations[prev], L.stations[t.i]) : { x: 0, y: 0 };
    const s = toScreen(pose.x, pose.y);
    c.save(); c.translate(s.x + off.x, s.y + off.y); c.rotate(pose.angle || 0);
    const cars = Math.max(1, t.cars || 1);
    for (let k = 0; k < cars; k++) {
      const x0 = -13 - k * 29;
      c.fillStyle = L.color; c.strokeStyle = 'rgba(0,0,0,.28)'; c.lineWidth = 1.5;
      c.beginPath(); c.roundRect ? c.roundRect(x0, -8.5, 26, 17, 4) : c.rect(x0, -8.5, 26, 17); c.fill(); c.stroke();
      c.fillStyle = '#fff';
      const pax = (t.pax || []).slice(k * 6, k * 6 + 6);
      pax.forEach((sh, j) => { shapePath(c, sh, x0 + 5.5 + (j % 3) * 7.5, -3.8 + Math.floor(j / 3) * 7.6, 2.6); c.fill(); });
    }
    c.restore();
  }));

  // stations
  for (const st of S.stations) {
    const s = toScreen(st.x, st.y);
    let k = 1;
    const p0 = R.pops[st.id];
    if (p0 != null) { const t = (now - p0) / 450; if (t >= 1) delete R.pops[st.id]; else k = Math.max(0.01, easeBack(t)); }
    const r = SR * k;
    if (st.overflow > 0) {
      const hot = st.overflow > 0.5;
      c.fillStyle = hot ? `rgba(214,51,51,${0.25 + 0.12 * Math.sin(now / 140)})` : 'rgba(40,40,50,.22)';
      c.beginPath(); c.moveTo(s.x, s.y); c.arc(s.x, s.y, r + 16, -Math.PI / 2, -Math.PI / 2 + st.overflow * Math.PI * 2); c.closePath(); c.fill();
    }
    if (R.overId === st.id) {
      c.strokeStyle = '#d33'; c.lineWidth = 4;
      c.beginPath(); c.arc(s.x, s.y, r + 18 + Math.sin(now / 120) * 3, 0, Math.PI * 2); c.stroke();
    }
    if (st.interchange) {
      c.fillStyle = '#fff'; c.strokeStyle = '#222'; c.lineWidth = 3.5;
      c.beginPath(); c.arc(s.x, s.y, r + 7, 0, Math.PI * 2); c.fill(); c.stroke();
    }
    shapePath(c, st.shape, s.x, s.y, r);
    c.fillStyle = '#fff'; c.fill();
    c.strokeStyle = '#222'; c.lineWidth = 3.5; c.stroke();
    // waiting passengers
    c.fillStyle = '#333';
    (st.queue || []).forEach((sh, j) => {
      shapePath(c, sh, s.x + r + 9 + (j % 6) * 9, s.y - 5 + Math.floor(j / 6) * 9, 3.3);
      c.fill();
    });
  }

  // tool hint: highlight targets
  if (ui.tool === 'interchange') {
    c.strokeStyle = 'rgba(228,66,63,.6)'; c.lineWidth = 2;
    for (const st of S.stations) if (!st.interchange) { const s = toScreen(st.x, st.y); c.beginPath(); c.arc(s.x, s.y, SR + 10 + Math.sin(now / 150) * 2, 0, Math.PI * 2); c.stroke(); }
  }

  // floating +1
  c.textAlign = 'center'; c.font = 'bold 15px system-ui, sans-serif';
  R.floats = R.floats.filter((f) => now - f.t0 < 900);
  for (const f of R.floats) {
    const t = (now - f.t0) / 900, s = toScreen(f.x, f.y);
    c.globalAlpha = 1 - t; c.fillStyle = '#222';
    c.fillText(f.text, s.x, s.y - 18 - t * 26);
  }
  c.globalAlpha = 1;
}
