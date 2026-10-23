// Touch input: draw, extend, loop and reroute lines; apply carriages and interchanges.
import * as E from './engine.js';
import { CITIES } from './cities.js';
import { R, toWorld, toScreen } from './render.js';
import { play } from './audio.js';

const HIT = 26;        // px: how close a finger must be to a station
const REASON = { tunnels: 'Not enough tunnels', lines: 'No free line', short: 'Line too short' };

// api: { get() → state, ui, toast(msg), changed(), blocked() → bool, setTool(t) }
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

  function segmentAt(S, p) {
    let best = null, bd = 14;
    S.lines.forEach((L, li) => pairs(L).forEach(([a, b], k) => {
      const A = st(S, a), B = st(S, b);
      if (!A || !B) return;
      const sa = toScreen(A.x, A.y), sb = toScreen(B.x, B.y);
      if (Math.hypot(p.x - sa.x, p.y - sa.y) < 22 || Math.hypot(p.x - sb.x, p.y - sb.y) < 22) return;
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

  function applyTool(S, p) {
    if (ui.tool === 'carriage') {
      let hit = null, bd = 34;
      S.lines.forEach((L, li) => L.trains.forEach((t, ti) => {
        const q = E.trainPose(S, li, ti); if (!q) return;
        const s = toScreen(q.x, q.y), d = Math.hypot(s.x - p.x, s.y - p.y);
        if (d < bd) { bd = d; hit = [li, ti]; }
      }));
      if (!hit) { api.toast('Tap a train'); return; }
      if (S.inv.carriages <= 0) { play.locked(); api.setTool(null); return; }
      if (E.addCarriage) E.addCarriage(S, hit[0], hit[1]);
      else { S.lines[hit[0]].trains[hit[1]].cars++; S.inv.carriages--; }
      play.connect();
    } else if (ui.tool === 'interchange') {
      const id = stationAt(S, p);
      if (id < 0) { api.toast('Tap a station'); return; }
      if (E.makeInterchange) E.makeInterchange(S, id);
      play.connect();
    }
    api.setTool(null);
    api.changed();
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
        const r = E.setLine(S, ui.sel, ids);
        if (r.ok) play.remove();
        else { api.toast(REASON[r.reason] || "Can't do that"); play.locked(); }
        api.changed();
        return;
      }
    }
    ui.sel = null;

    for (const cap of R.caps) {
      if (Math.hypot(cap.x - p.x, cap.y - p.y) > 24) continue;
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
      drag.target = id >= 0 && !L.stations.includes(id) ? id : -1;
    } else {
      const ids = drag.ids, n = ids.length;
      if (id >= 0) {
        if (id === ids[n - 1]) { /* still on the terminal */ }
        else if (n >= 2 && id === ids[n - 2]) { ids.pop(); drag.loop = false; play.tap(); }
        else if (n >= 3 && id === ids[0]) { if (!drag.loop) play.tap(); drag.loop = true; }
        else if (!ids.includes(id)) { ids.push(id); drag.loop = false; play.tap(); }
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
      if (ids.length < 2) { E.removeLine(S, d.line); play.remove(); api.changed(); return; }
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
    if (!r || r.ok) play.connect();
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
