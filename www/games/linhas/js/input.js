// Touch input: draw, extend, loop and reroute lines; apply carriages and interchanges.
import * as E from './engine.js';
import { CITIES } from './cities.js';
import { R, toWorld, toScreen } from './render.js';
import { play } from './audio.js';

const HIT = 28;        // px: how close a finger must be to a station (about 9.6 mm across, Parhi et al. 2006)
const CAP_HIT = 30;    // px: grabbing the end of a line
const REASON = { tunnels: 'Not enough tunnels', lines: 'No free line', short: 'Line too short' };

// api: { get() → state, ui, toast(msg), changed(), edited(routesBefore), blocked() → bool, setTool(t), tapped(kind) }
export function initInput(canvas, api) {
  let drag = null;
  const ui = api.ui;

  const pos = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const st = (S, id) => S.stations.find((s) => s.id === id);
  const stationAt = (S, p) => { const w = toWorld(p.x, p.y); return E.hitStation(S, w.x, w.y, HIT / R.scale); };

  // Consecutive station pairs of a line (a loop also has the closing pair).
  function pairs(L) {
    const ids = L.stations, out = [];
    for (let k = 0; k < ids.length - 1; k++) out.push([ids[k], ids[k + 1]]);
    if (L.loop && ids.length > 2 && ids[0] !== ids[ids.length - 1]) out.push([ids[ids.length - 1], ids[0]]);
    return out;
  }

  // The line segment under p. Near stations it only counts when `ends` is set (dropping a train there is fine,
  // but grabbing there should start a new line instead).
  function segmentAt(S, p, reach = 18, ends = false) {
    let best = null, bd = reach;
    S.lines.forEach((L, li) => pairs(L).forEach(([a, b], k) => {
      const A = st(S, a), B = st(S, b);
      if (!A || !B) return;
      const sa = toScreen(A.x, A.y), sb = toScreen(B.x, B.y);
      if (!ends && (Math.hypot(p.x - sa.x, p.y - sa.y) < 22 || Math.hypot(p.x - sb.x, p.y - sb.y) < 22)) return;
      const pts = E.segmentPoints(A, B).map((q) => toScreen(q.x, q.y));
      for (let i = 0; i < pts.length - 1; i++) {
        const d = distSeg(p, pts[i], pts[i + 1]);
        if (d < bd) { bd = d; best = { line: li, k }; }
      }
    }));
    return best;
  }

  function freeColor(S) {
    const city = CITIES.find((c) => c.id === S.city) || CITIES[0];
    const used = S.lines.map((l) => l.color);
    return city.colors.find((c) => !used.includes(c)) || city.colors[0];
  }

  function newIds(S) {
    if (drag.kind === 'reroute') {
      const L = S.lines[drag.line], ids = L.stations.slice();
      if (drag.target < 0) return ids;
      ids.splice(drag.k + 1, 0, drag.target);
      return ids;
    }
    return drag.end === 'start' ? drag.ids.slice().reverse() : drag.ids.slice();
  }

  function tunnelsOk(S, ids) {
    try {
      const old = drag.kind === 'new' ? 0 : E.crossings(S, S.lines[drag.line].stations);
      return E.crossings(S, ids) - old <= S.inv.tunnels;
    } catch (e) { return true; }
  }

  function preview(S) {
    let pts;
    if (drag.kind === 'reroute') {
      const L = S.lines[drag.line], ids = L.stations.slice();
      const mid = drag.target >= 0 ? st(S, drag.target) : drag.cursor;
      pts = ids.slice(0, drag.k + 1).map((id) => st(S, id));
      pts.push(mid);
      const rest = drag.k + 1 < ids.length ? ids.slice(drag.k + 1) : [ids[0]];
      pts.push(...rest.map((id) => st(S, id)));
      if (L.loop && drag.k + 1 < ids.length && ids[0] !== ids[ids.length - 1]) pts.push(st(S, ids[0]));
    } else {
      pts = drag.ids.map((id) => st(S, id));
      pts.push(drag.loop ? st(S, drag.ids[0]) : drag.cursor);
    }
    const bad = drag.kind !== 'reroute' || drag.target >= 0 ? !tunnelsOk(S, newIds(S)) : false;
    ui.preview = { line: drag.kind === 'new' ? -1 : drag.line, color: drag.color, pts: pts.filter(Boolean), bad };
  }

  // Where a spare train, carriage or interchange would go if let go at p.
  function dropTarget(S, kind, p) {
    if (kind === 'interchange') {
      const id = stationAt(S, p);
      return id >= 0 && !st(S, id).interchange ? { station: id } : null;
    }
    if (kind === 'carriage') {
      let hit = null, bd = 40;
      S.lines.forEach((L, li) => L.trains.forEach((t, ti) => {
        if (t.cars >= E.MAX_CARS) return;
        const q = E.trainPose(S, li, ti); if (!q) return;
        const sp = toScreen(q.x, q.y), d = Math.hypot(sp.x - p.x, sp.y - p.y);
        if (d < bd) { bd = d; hit = { line: li, train: ti }; }
      }));
      if (hit) return hit;
      // On a line but not on a train: the train of that line with the fewest carriages.
      const seg = segmentAt(S, p, 30, true);
      if (!seg) return null;
      const T = S.lines[seg.line].trains;
      let ti = -1;
      T.forEach((t, i) => { if (t.cars < E.MAX_CARS && (ti < 0 || t.cars < T[ti].cars)) ti = i; });
      return ti >= 0 ? { line: seg.line, train: ti } : null;
    }
    const seg = segmentAt(S, p, 30, true);
    return seg ? { line: seg.line } : null;
  }

  function place(S, kind, target, p) {
    if (!target) {
      api.toast(kind === 'train' ? 'Drop it on a line' : kind === 'carriage' ? 'Drop it on a train' : 'Drop it on a station');
      play.locked(); return false;
    }
    let ok = false;
    if (kind === 'train') { const w = toWorld(p.x, p.y); ok = E.addTrain(S, target.line, w.x, w.y); }
    else if (kind === 'carriage') ok = E.addCarriage(S, target.line, target.train);
    else ok = E.makeInterchange(S, target.station);
    if (ok) { play.connect(); api.changed(); } else play.locked();
    return ok;
  }

  function applyTool(S, p) {
    const kind = ui.tool;
    const left = { train: S.inv.trains, carriage: S.inv.carriages, interchange: S.inv.interchanges }[kind];
    if (!left) { api.setTool(null); return; }
    const target = dropTarget(S, kind, p);
    if (!target) { api.toast(kind === 'train' ? 'Tap a line' : kind === 'carriage' ? 'Tap a train' : 'Tap a station'); return; }
    place(S, kind, target, p);
    api.setTool(null);
  }

  // Dragging a spare from the bar: the item floats a little above the finger so you can see where it lands.
  const LIFT = 36;
  let carry = null;
  function startCarry(kind, e) {
    const S = api.get();
    if (!S || api.blocked() || drag || carry) return;
    carry = { kind, x0: e.clientX, y0: e.clientY, moved: false };
  }
  addEventListener('pointermove', (e) => {
    if (!carry) return;
    const S = api.get();
    if (!S) { carry = null; ui.carry = null; return; }
    if (!carry.moved && Math.hypot(e.clientX - carry.x0, e.clientY - carry.y0) < 10) return;
    if (!carry.moved) { carry.moved = true; play.tap(); api.setTool(null); }
    const r = canvas.getBoundingClientRect(), p = { x: e.clientX - r.left, y: e.clientY - r.top - LIFT };
    ui.carry = { kind: carry.kind, x: p.x, y: p.y, target: dropTarget(S, carry.kind, p) };
  });
  addEventListener('pointerup', () => {
    if (!carry) return;
    const c = carry, S = api.get(), k = ui.carry;
    carry = null; ui.carry = null;
    if (!c.moved) { api.tapped(c.kind); return; }
    if (S && k && !api.blocked()) place(S, c.kind, k.target, k);
  });
  addEventListener('pointercancel', () => { carry = null; ui.carry = null; });
  for (const [sel, kind] of [['#c-trains', 'train'], ['#c-cars', 'carriage'], ['#c-ich', 'interchange']]) {
    const el = document.querySelector(sel);
    if (el) el.addEventListener('pointerdown', (e) => startCarry(kind, e));
  }

  canvas.addEventListener('pointerdown', (e) => {
    const S = api.get();
    if (!S || api.blocked() || drag) return;
    const p = pos(e);
    if (ui.tool) { applyTool(S, p); return; }
    // With a line picked in the bar, tapping one of its stations takes that station off the line.
    if (ui.sel != null && S.lines[ui.sel]) {
      const id = stationAt(S, p), L = S.lines[ui.sel];
      if (id >= 0 && L.stations.includes(id)) {
        const ids = L.stations.filter((x) => x !== id);
        if (ids.length < 2) { api.toast('A line needs two stations — use 🗑 to remove it'); play.locked(); return; }
        const before = E.routesOf(S);
        const r = E.setLine(S, ui.sel, ids);
        if (r.ok) { play.remove(); api.edited(before); }
        else { api.toast(REASON[r.reason] || "Can't do that"); play.locked(); }
        api.changed();
        return;
      }
    }
    ui.sel = null;

    for (const cap of R.caps) {
      if (Math.hypot(cap.x - p.x, cap.y - p.y) > CAP_HIT) continue;
      const L = S.lines[cap.line];
      let ids = L.stations.slice();
      if (cap.end === 'start') ids.reverse();
      drag = { kind: 'extend', line: cap.line, end: cap.end, ids, loop: false, color: L.color };
      break;
    }
    if (!drag) {
      const id = stationAt(S, p);
      if (id >= 0) {
        if (S.lines.length >= S.inv.lines) { api.toast('No free line'); play.locked(); return; }
        drag = { kind: 'new', line: S.lines.length, ids: [id], loop: false, color: freeColor(S) };
      }
    }
    if (!drag) {
      const seg = segmentAt(S, p);
      if (seg) drag = { kind: 'reroute', line: seg.line, k: seg.k, target: -1, color: S.lines[seg.line].color };
    }
    if (!drag) return;
    drag.before = E.routesOf(S);
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    drag.cursor = toWorld(p.x, p.y);
    play.tap();
    preview(S);
  });

  canvas.addEventListener('pointermove', (e) => {
    const S = api.get();
    if (!drag || !S) return;
    const p = pos(e);
    drag.cursor = toWorld(p.x, p.y);
    const id = stationAt(S, p);
    if (drag.kind === 'reroute') {
      const L = S.lines[drag.line];
      const t = id >= 0 && !L.stations.includes(id) ? id : -1;
      if (t >= 0 && t !== drag.target) play.link(L.stations.length + 1);
      drag.target = t;
    } else {
      const ids = drag.ids, n = ids.length;
      if (id >= 0) {
        if (id === ids[n - 1]) { /* still on the terminal */ }
        else if (n >= 2 && id === ids[n - 2]) { ids.pop(); drag.loop = false; play.unlink(ids.length); }
        else if (n >= 3 && id === ids[0]) { if (!drag.loop) play.link(n + 1); drag.loop = true; }
        else if (!ids.includes(id)) { ids.push(id); drag.loop = false; play.link(ids.length); }
      } else if (drag.loop) {
        const f = st(S, ids[0]), s = toScreen(f.x, f.y);
        if (Math.hypot(s.x - p.x, s.y - p.y) > HIT * 1.6) drag.loop = false;
      }
    }
    preview(S);
  });

  function finish() {
    const S = api.get(), d = drag;
    drag = null; ui.preview = null;
    if (!S || !d) return;
    let r = null;
    if (d.kind === 'new') {
      if (d.ids.length < 2) return;
      r = E.setLine(S, d.line, d.ids);
      if (r && r.ok && d.loop) E.setLoop(S, d.line, true);
    } else if (d.kind === 'extend') {
      const ids = d.end === 'start' ? d.ids.slice().reverse() : d.ids.slice();
      if (ids.length < 2) { E.removeLine(S, d.line); play.remove(); api.edited(d.before); api.changed(); return; }
      const same = ids.join() === S.lines[d.line].stations.join();
      if (same && !d.loop) return;
      r = same ? { ok: true } : E.setLine(S, d.line, ids);
      if (r && r.ok && d.loop) E.setLoop(S, d.line, true);
    } else {
      if (d.target < 0) return;
      const ids = S.lines[d.line].stations.slice();
      ids.splice(d.k + 1, 0, d.target);
      r = E.setLine(S, d.line, ids);
    }
    if (!r || r.ok) { play.connect(); api.edited(d.before); }
    else { api.toast(REASON[r.reason] || "Can't build that"); play.locked(); }
    api.changed();
  }
  canvas.addEventListener('pointerup', finish);
  canvas.addEventListener('pointercancel', () => { drag = null; ui.preview = null; });
}

function distSeg(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy;
  let t = L ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / L : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
