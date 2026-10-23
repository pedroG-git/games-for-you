// Canvas drawing for Linhas. Sizes are in screen pixels so the map stays readable while the city grows.
import { CITIES } from './cities.js';
import { routePoints, trainPose, segmentPoints } from './engine.js';

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
function strokeWorld(c, pts, color, w, alpha = 1) {
  if (pts.length < 2) return;
  c.globalAlpha = alpha;
  c.strokeStyle = color; c.lineWidth = w;
  c.beginPath();
  pts.forEach((p, i) => { const s = toScreen(p.x, p.y); i ? c.lineTo(s.x, s.y) : c.moveTo(s.x, s.y); });
  c.stroke();
  c.globalAlpha = 1;
}

// Short T-stub past each terminal: grab it to extend the line.
function endCap(c, li, end, pts, color) {
  const p = end === 'start' ? pts[0] : pts[pts.length - 1];
  let q = null;
  const order = end === 'start' ? pts : pts.slice().reverse();
  for (const o of order) if (Math.hypot(o.x - p.x, o.y - p.y) > 0.5) { q = o; break; }
  const sp = toScreen(p.x, p.y);
  let dx = 0, dy = -1;
  if (q) { const sq = toScreen(q.x, q.y); const L = Math.hypot(sp.x - sq.x, sp.y - sq.y) || 1; dx = (sp.x - sq.x) / L; dy = (sp.y - sq.y) / L; }
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
  S.lines.forEach((L, i) => {
    let pts = [];
    try { pts = routePoints(S, i); } catch (e) { /* engine mid-update */ }
    const dim = ui.preview && ui.preview.line === i ? 0.25 : 1;
    if (ui.sel === i) strokeWorld(c, pts, '#fff', LW + 8, 0.9);
    strokeWorld(c, pts, L.color, LW, dim);
    if (!L.loop && pts.length > 1 && dim === 1) { endCap(c, i, 'start', pts, L.color); endCap(c, i, 'end', pts, L.color); }
  });

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

  // trains
  S.lines.forEach((L, li) => L.trains.forEach((t, ti) => {
    let pose;
    try { pose = trainPose(S, li, ti); } catch (e) { return; }
    if (!pose) return;
    const s = toScreen(pose.x, pose.y);
    c.save(); c.translate(s.x, s.y); c.rotate(pose.angle || 0);
    const cars = Math.max(1, t.cars || 1);
    for (let k = 0; k < cars; k++) {
      const x0 = -11 - k * 24;
      c.fillStyle = L.color;
      c.beginPath(); c.roundRect ? c.roundRect(x0, -7, 22, 14, 3) : c.rect(x0, -7, 22, 14); c.fill();
      c.fillStyle = '#fff';
      const pax = (t.pax || []).slice(k * 6, k * 6 + 6);
      pax.forEach((sh, j) => { shapePath(c, sh, x0 + 4 + (j % 3) * 7, -3.5 + Math.floor(j / 3) * 7, 2.4); c.fill(); });
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
      c.fillStyle = 'rgba(40,40,50,.22)';
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
