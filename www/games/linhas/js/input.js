// Touch input: draw, extend, loop and reroute lines; apply carriages and interchanges.
import * as E from './engine.js';
import { CITIES } from './cities.js';
import { R, toWorld, toScreen, setZoom } from './render.js';
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

  // The line under p, using the lanes as drawn (side-by-side lines each have their own), so the finger gets the line
  // it actually touches. Near stations it only counts when `ends` is set (dropping a train there is fine,
  // but grabbing there should start a new line instead).
  function segmentAt(S, p, reach = 18, ends = false) {
    let best = null, bd = reach;
    S.lines.forEach((L, li) => {
      const path = R.paths[li], pr = pairs(L);
      if (!path) return;
      for (let i = 0; i < path.pts.length - 1; i++) {
        const k = path.ks[i], ab = pr[k];
        if (!ab) continue;
        if (!ends && ab.some((id) => { const q = st(S, id), s = toScreen(q.x, q.y); return Math.hypot(p.x - s.x, p.y - s.y) < 22; })) continue;
        const d = distSeg(p, path.pts[i], path.pts[i + 1]);
        if (d < bd) { bd = d; best = { line: li, k }; }
      }
    });
    return best;
  }

  function freeColor(S) {
    const city = CITIES.find((c) => c.id === S.city) || CITIES[0];
    const used = S.lines.map((l) => l.color);
    return city.colors.find((c) => !used.includes(c)) || city.colors[0];
  }

  function newIds(S) {
    if (drag.kind === 'reroute') {
      const L = S.lines[drag.line];
      if (drag.target < 0) return L.stations.slice();
      return E.insertIds(S, drag.line, drag.k, drag.target);
    }
    return drag.end === 'start' ? drag.ids.slice().reverse() : drag.ids.slice();
  }

  // Same rule as building: ferries need no tunnels, some cities need two per crossing, a loop closes back.
  function tunnelsOk(S, ids) {
    try {
      const L = drag.kind === 'new' ? null : S.lines[drag.line];
      const old = L ? E.tunnelsFor(S, L.stations, L.loop) : 0;
      return E.tunnelsFor(S, ids, drag.loop || (drag.kind === 'reroute' && L.loop)) - old <= S.inv.tunnels;
    } catch (e) { return true; }
  }

  function preview(S) {
    let pts;
    if (drag.kind === 'reroute') {
      const L = S.lines[drag.line];
      if (drag.target >= 0) {
        // the line as it will be built (the station may go in elsewhere on the line, to keep it untangled)
        const ids = newIds(S);
        pts = ids.map((id) => st(S, id));
        if (L.loop) pts.push(st(S, ids[0]));
      } else {
        const ids = L.stations.slice();
        pts = ids.slice(0, drag.k + 1).map((id) => st(S, id));
        pts.push(drag.cursor);
        const rest = drag.k + 1 < ids.length ? ids.slice(drag.k + 1) : [ids[0]];
        pts.push(...rest.map((id) => st(S, id)));
        if (L.loop && drag.k + 1 < ids.length) pts.push(st(S, ids[0]));
      }
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
    if (kind === 'express' && seg && S.lines[seg.line].express) return null;
    return seg ? { line: seg.line } : null;
  }

  function place(S, kind, target, p) {
    if (!target) {
      api.toast(kind === 'train' ? 'Drop it on a line' : kind === 'express' ? 'Drop it on a line that is not express yet' : kind === 'carriage' ? 'Drop it on a train' : 'Drop it on a station');
      play.locked(); return false;
    }
    let ok = false;
    if (kind === 'train') { const w = toWorld(p.x, p.y); ok = E.addTrain(S, target.line, w.x, w.y); }
    else if (kind === 'carriage') ok = E.addCarriage(S, target.line, target.train);
    else if (kind === 'express') ok = E.makeExpress(S, target.line);
    else ok = E.makeInterchange(S, target.station);
    if (ok) { play.connect(); api.changed(); } else play.locked();
    return ok;
  }

  function applyTool(S, p) {
    const kind = ui.tool;
    const left = { train: S.inv.trains, carriage: S.inv.carriages, interchange: S.inv.interchanges, express: S.inv.express }[kind];
    if (!left) { api.setTool(null); return; }
    const target = dropTarget(S, kind, p);
    if (!target) { api.toast(kind === 'train' || kind === 'express' ? 'Tap a line' : kind === 'carriage' ? 'Tap a train' : 'Tap a station'); return; }
    place(S, kind, target, p);
    api.setTool(null);
  }

  // Dragging a spare from the bar: the item floats a little above the finger so you can see where it lands.
  const LIFT = 36;
  let carry = null;
  function startCarry(kind, e, from = null) {
    const S = api.get();
    if (!S || api.blocked() || drag || carry) return;
    carry = { kind, from, x0: e.clientX, y0: e.clientY, moved: false };
  }
  // A train already on the map, under p (not while it sits in a station: that grab draws a line).
  function trainAt(S, p) {
    let hit = null, bd = 20;
    S.lines.forEach((L, li) => L.trains.forEach((t, ti) => {
      const q = E.trainPose(S, li, ti); if (!q) return;
      const sp = toScreen(q.x, q.y), d = Math.hypot(sp.x - p.x, sp.y - p.y);
      if (d < bd) { bd = d; hit = { line: li, train: ti }; }
    }));
    return hit;
  }
  const overBar = (y) => { const b = document.getElementById('bar'); return b && y > b.getBoundingClientRect().top + 4; };
  addEventListener('pointermove', (e) => {
    if (!carry) return;
    const S = api.get();
    if (!S) { carry = null; ui.carry = null; return; }
    if (!carry.moved && Math.hypot(e.clientX - carry.x0, e.clientY - carry.y0) < 10) return;
    if (!carry.moved) { carry.moved = true; play.tap(); api.setTool(null); }
    const r = canvas.getBoundingClientRect(), p = { x: e.clientX - r.left, y: e.clientY - r.top - LIFT };
    if (carry.from) {
      // Moving a train: onto any line, or down onto the bar to put it back with the spares.
      const back = overBar(e.clientY);
      ui.carry = { kind: 'train', x: p.x, y: p.y, hide: carry.from, target: back ? { bar: true } : dropTarget(S, 'train', p) };
    } else ui.carry = { kind: carry.kind, x: p.x, y: p.y, target: dropTarget(S, carry.kind, p) };
  });
  addEventListener('pointerup', () => {
    if (!carry) return;
    const c = carry, S = api.get(), k = ui.carry;
    carry = null; ui.carry = null;
    if (c.from) {
      if (!c.moved || !S || !k || api.blocked()) return;
      const tg = k.target, f = c.from;
      let ok;
      if (tg && tg.bar) ok = E.storeTrain(S, f.line, f.train);
      else if (tg) { const w = toWorld(k.x, k.y); ok = E.moveTrainTo(S, f.line, f.train, tg.line, w.x, w.y); }
      else { api.toast('Drop it on a line — or on the bar to keep it'); play.locked(); return; }
      if (ok) { play.connect(); api.changed(); } else { api.toast('Every line keeps at least one train'); play.locked(); }
      return;
    }
    if (!c.moved) { api.tapped(c.kind); return; }
    if (S && k && !api.blocked()) place(S, c.kind, k.target, k);
  });
  addEventListener('pointercancel', () => { carry = null; ui.carry = null; });
  for (const [sel, kind] of [['#c-trains', 'train'], ['#c-cars', 'carriage'], ['#c-ich', 'interchange'], ['#c-exp', 'express']]) {
    const el = document.querySelector(sel);
    if (el) el.addEventListener('pointerdown', (e) => startCarry(kind, e));
  }

  // Two fingers zoom and pan the map (one finger keeps drawing); a second finger cancels whatever the first one started.
  const fingers = new Map();
  let pinch = null;
  const pinchInfo = () => {
    const [a, b] = [...fingers.values()];
    return { m: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, d: Math.hypot(a.x - b.x, a.y - b.y) || 1 };
  };
  canvas.addEventListener('pointerdown', (e) => {
    fingers.set(e.pointerId, pos(e));
    if (fingers.size === 2) {
      drag = null; ui.preview = null;
      pinch = { ...pinchInfo(), z: { ...R.zoom } };
    }
  }, true);
  canvas.addEventListener('pointermove', (e) => {
    if (!fingers.has(e.pointerId)) return;
    fingers.set(e.pointerId, pos(e));
    if (pinch && fingers.size === 2) {
      const n = pinchInfo();
      // the point under the fingers' midpoint follows the midpoint (pan), the spread sets the zoom
      setZoom(pinch.z.k * n.d / pinch.d, n.m.x, n.m.y, { k: pinch.z.k, x: pinch.z.x + n.m.x - pinch.m.x, y: pinch.z.y + n.m.y - pinch.m.y });
    }
  }, true);
  const lift = (e) => { fingers.delete(e.pointerId); if (!fingers.size) pinch = null; };
  canvas.addEventListener('pointerup', lift, true);
  canvas.addEventListener('pointercancel', lift, true);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); const p = pos(e); setZoom(R.zoom.k * Math.exp(-e.deltaY / 400), p.x, p.y); }, { passive: false });

  canvas.addEventListener('pointerdown', (e) => {
    const S = api.get();
    if (!S || api.blocked() || drag || pinch) return;
    const p = pos(e);
    // A tap on the edge marker of a station filling up out of sight zooms back out to the whole map.
    if ((R.marks || []).some((m) => Math.hypot(m.x - p.x, m.y - p.y) < 26)) { R.zoom = { k: 1, x: 0, y: 0 }; play.tap(); return; }
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
    const was = ui.sel;
    ui.sel = null; const info = ui.info; ui.info = null;

    // A terminal station sits right next to its end cap: whichever is closer to the finger wins.
    const sid = stationAt(S, p), sp = sid >= 0 ? toScreen(st(S, sid).x, st(S, sid).y) : null;
    for (const cap of R.caps) {
      const dc = Math.hypot(cap.x - p.x, cap.y - p.y);
      if (dc > CAP_HIT || (sp && Math.hypot(sp.x - p.x, sp.y - p.y) < dc)) continue;
      const L = S.lines[cap.line];
      let ids = L.stations.slice();
      if (cap.end === 'start') ids.reverse();
      drag = { kind: 'extend', line: cap.line, end: cap.end, ids, loop: false, color: L.color };
      break;
    }
    if (!drag) {
      const id = stationAt(S, p);
      if (id >= 0) {
        // With every line in use a tap still shows the station's passengers; dragging says there is no free line.
        drag = { kind: 'new', line: S.lines.length, ids: [id], loop: false, color: freeColor(S), full: S.lines.length >= S.inv.lines };
      }
    }
    if (!drag) {
      const tr = trainAt(S, p);
      if (tr) { startCarry('move', e, tr); return; }
    }
    if (!drag) {
      const seg = segmentAt(S, p);
      if (seg) drag = { kind: 'reroute', line: seg.line, k: seg.k, target: -1, color: S.lines[seg.line].color };
    }
    if (!drag && S.mode === 'creative') drag = { kind: 'place' };
    if (!drag) return;
    drag.before = E.routesOf(S);
    drag.p0 = p; drag.was = was; ui.info = info;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    drag.cursor = toWorld(p.x, p.y);
    if (drag.kind === 'place') return;
    play.tap();
    preview(S);
  });

  canvas.addEventListener('pointermove', (e) => {
    const S = api.get();
    if (!drag || !S || pinch) return;
    const p = pos(e);
    if (!drag.moved && Math.hypot(p.x - drag.p0.x, p.y - drag.p0.y) > 10) drag.moved = true;
    if (drag.full && drag.moved) { drag = null; ui.preview = null; api.toast('No free line'); play.locked(); return; }
    drag.cursor = toWorld(p.x, p.y);
    if (drag.kind === 'place') return;
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
    // A tap on a line (or on the number at its end) picks it: the others fade so you can see where it goes.
    if (!d.moved && d.kind !== 'new' && S.lines[d.line]) {
      play.tap();
      ui.sel = d.was === d.line ? null : d.line;
      if (ui.sel != null) api.toast('Tap a station to take it off · 🗑 removes the line');
      api.changed(); return;
    }
    if (d.kind === 'place') { if (!d.moved) { const w = toWorld(d.p0.x, d.p0.y); api.place(w.x, w.y); api.changed(); } return; }
    let r = null;
    if (d.kind === 'new') {
      // A tap on a station shows where its passengers want to go.
      if (d.ids.length < 2 && !d.moved) { ui.info = ui.info && ui.info.station === d.ids[0] ? null : { station: d.ids[0], until: performance.now() + 5000 }; return; }
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
      r = E.setLine(S, d.line, E.insertIds(S, d.line, d.k, d.target));
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
