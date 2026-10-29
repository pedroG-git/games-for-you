// Bus - client: drawing, input, animation and saving. All game logic lives in rules.js / levelgen.js.
(() => {
  'use strict';

  const SAVE_KEY = 'bus-save';
  // One-time move of saves made under the old key.
  try { const old = localStorage.getItem('busdajoana-save'); if (old !== null && localStorage.getItem(SAVE_KEY) === null) localStorage.setItem(SAVE_KEY, old); localStorage.removeItem('busdajoana-save'); } catch (e) { /* storage blocked */ }
  const COLORS = ['#e4572e', '#3e7cb1', '#f2c14e', '#5aa84b', '#8e6bbf', '#f28c28', '#2bb3a3', '#ee7bb0'];
  const LIGHT = COLORS.map((c) => shade(c, 0.3));
  const INK = '#3b2f2a';
  const TITLE_FONT = '"Luckiest Guy", "Arial Black", Impact, sans-serif';
  const CHALK_FONT = '"Chalkboard SE", "Comic Sans MS", "Marker Felt", cursive';
  const BOARD_MS = 80;
  const HOP_MS = 170;
  const DIRV = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
  const DIRA = { U: -Math.PI / 2, D: Math.PI / 2, L: Math.PI, R: 0 };
  const defaultSave = () => ({ level: 1, wins: 0, boosters: { slot: 2, shuffle: 2 }, muted: false, seenQuotes: [], current: null, updated: 0, epoch: 0 });

  const $ = (id) => document.getElementById(id);
  const cv = $('c');
  const ctx = cv.getContext('2d');
  const bg = document.createElement('canvas');
  const bctx = bg.getContext('2d');

  let W = 0, H = 0, DPR = 1, L = null;
  let save = null, quotes = [];
  let n = 1, state = null, usedSlot = false, levelDone = false;
  let screen = 'title';
  const vis = new Map(); // busId -> running animation ('exit' to a slot, or 'nudge' when blocked)
  let leaving = [], hoppers = [];
  let queueShift = 0, lastBoard = 0, settleT = 0, wiggleUntil = 0, slotFlash = -1e9;
  let now = performance.now();

  // ---------- helpers ----------
  function shade(hex, p) {
    const v = parseInt(hex.slice(1), 16);
    const f = (c) => Math.round(p < 0 ? c * (1 + p) : c + (255 - c) * p);
    return `rgb(${f(v >> 16)},${f((v >> 8) & 255)},${f(v & 255)})`;
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const easeOut = (k) => 1 - (1 - k) * (1 - k);
  const easeInOut = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  function rr(c, x, y, w, h, r) {
    w = Math.max(0, w);
    h = Math.max(0, h);
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function cubic(p0, p1, p2, p3, t) {
    const u = 1 - t;
    return [0, 1].map((i) => u * u * u * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t * t * t * p3[i]);
  }
  function cubicD(p0, p1, p2, p3, t) {
    const u = 1 - t;
    return [0, 1].map((i) => 3 * u * u * (p1[i] - p0[i]) + 6 * u * t * (p2[i] - p1[i]) + 3 * t * t * (p3[i] - p2[i]));
  }
  const bus = (id) => state.buses[id];

  function showScreen(id) {
    for (const s of ['title', 'win', 'lose']) $(s).classList.toggle('show', s === id);
  }

  // ---------- layout ----------
  function layoutAll() {
    W = window.innerWidth;
    H = window.innerHeight;
    DPR = Math.min(window.devicePixelRatio || 1, 3);
    for (const k of [cv, bg]) {
      k.width = Math.round(W * DPR);
      k.height = Math.round(H * DPR);
    }
    if (!state) return;
    const top = $('hud').getBoundingClientRect().bottom + 4;
    const bottom = $('bar').getBoundingClientRect().top - 6;
    const avail = Math.max(320, bottom - top);
    const fh = clamp(avail * 0.17, 84, 140);
    const ph = clamp(avail * 0.12, 62, 92);
    let sh = clamp(avail * 0.19, 84, 200);
    const { cols, rows } = state;
    let gAvail = avail - fh - ph - sh - 10;
    let cell = Math.min((W - 16) / cols, gAvail / rows, 58);
    if (cell < 20) {
      sh = Math.max(64, sh - (20 * rows - gAvail));
      gAvail = avail - fh - ph - sh - 10;
      cell = Math.min((W - 16) / cols, gAvail / rows);
    }
    const gh = cell * rows;
    sh += Math.max(0, Math.min(gAvail - gh - 8, 260 - sh)); // spare room makes the line longer
    const F = { y: top, h: fh };
    const S = { y: top + fh, h: sh };
    const P = { y: S.y + sh, h: ph };
    const gy0 = P.y + ph + 10;
    const G = { cell, cols, rows, w: cell * cols, h: gh, x: (W - cell * cols) / 2, y: gy0 + Math.max(0, (bottom - gy0 - gh) / 2) };
    L = { top, bottom, F, S, P, G, bx: 6, bw: W * 0.62 };
    L.doorX = L.bx + L.bw * 0.5;
    layoutSlots();
    buildPath();
    drawBg();
  }

  function layoutSlots() {
    const k = state.slots.length;
    L.sw = Math.min(72, (W - 16) / k);
    L.sx0 = (W - L.sw * k) / 2;
    L.pw = Math.min(L.sw * 0.58, 30);
    L.pl = Math.min(L.P.h * 0.76, L.pw * 2.3);
  }
  const slotCenter = (i) => [L.sx0 + L.sw * (i + 0.5), L.P.y + L.P.h * 0.5];

  // the waiting line: a snake road from the restaurant door down to the parking lot
  function buildPath() {
    const S = L.S;
    const lanes = Math.max(2, Math.round((S.h - 8) / 24));
    const gap = (S.h - 8) / lanes;
    const ys = [];
    for (let k = 0; k < lanes; k++) ys.push(S.y + 4 + gap * (k + 0.5));
    const xl = 16, xr = W - 16;
    const pts = [[L.doorX, S.y - 2], [L.doorX, ys[0]]];
    let right = true;
    for (let k = 0; k < lanes; k++) {
      if (k === lanes - 1) {
        pts.push([W / 2, ys[k]], [W / 2, S.y + S.h + 2]);
        break;
      }
      const x = right ? xr : xl;
      pts.push([x, ys[k]], [x, ys[k + 1]]);
      right = !right;
    }
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    L.path = { pts, cum, total: cum[cum.length - 1] };
    L.gap = gap;
    L.sp = clamp(gap * 0.5, 8, 13);
    L.pr = L.sp * 0.46;
  }
  function pointAt(s) {
    const { pts, cum, total } = L.path;
    s = clamp(s, 0, total);
    let i = 1;
    while (i < cum.length - 1 && cum[i] < s) i++;
    const k = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
    return [lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)];
  }

  // ---------- static background (redrawn on layout / new level / extra slot) ----------
  function drawBg() {
    const c = bctx;
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    c.fillStyle = '#f3e6c9';
    c.fillRect(0, 0, W, H);
    drawFacade(c);
    drawStreet(c);
    drawParking(c);
    drawGridLot(c);
  }

  function drawFacade(c) {
    const F = L.F, y0 = F.y, h = F.h, yb = F.y + F.h;
    // sky, sea, sand
    const g = c.createLinearGradient(0, y0, 0, yb);
    g.addColorStop(0, '#8fcfe0');
    g.addColorStop(1, '#d5eef2');
    c.fillStyle = g;
    c.fillRect(0, y0 - 60, W, h + 60);
    const seaY = y0 + h * 0.46;
    c.fillStyle = '#4f9fb8';
    c.fillRect(0, seaY, W, h * 0.2);
    c.strokeStyle = 'rgba(255,255,255,.55)';
    c.lineWidth = 1.5;
    for (let x = L.bx + L.bw + 4; x < W; x += 16) {
      c.beginPath();
      c.arc(x, seaY + h * 0.1, 4, Math.PI * 1.1, Math.PI * 1.9);
      c.stroke();
    }
    c.fillStyle = '#e8cf9a';
    c.fillRect(0, seaY + h * 0.2, W, yb - seaY - h * 0.2);

    // ferris wheel on the wharf
    const cbx = L.bx + L.bw + 8, cbw = W - cbx - 6;
    const wr = Math.min(h * 0.3, cbw * 0.42), wx = cbx + cbw * 0.55, wy = y0 + h * 0.34;
    c.strokeStyle = INK;
    c.lineWidth = 2.2;
    c.beginPath();
    c.moveTo(wx - wr * 0.6, yb);
    c.lineTo(wx, wy);
    c.lineTo(wx + wr * 0.6, yb);
    c.stroke();
    c.beginPath();
    c.arc(wx, wy, wr, 0, Math.PI * 2);
    c.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      c.beginPath();
      c.moveTo(wx, wy);
      c.lineTo(wx + Math.cos(a) * wr, wy + Math.sin(a) * wr);
      c.lineWidth = 1;
      c.stroke();
      c.fillStyle = COLORS[i];
      c.beginPath();
      c.arc(wx + Math.cos(a) * wr, wy + Math.sin(a) * wr + 2, Math.max(2.5, wr * 0.12), 0, Math.PI * 2);
      c.fill();
      c.lineWidth = 1.2;
      c.stroke();
    }

    // the restaurant
    const bx = L.bx, bw = L.bw, by = y0 + 3, bh = yb - by;
    c.fillStyle = '#88ad94';
    c.strokeStyle = INK;
    c.lineWidth = 3;
    rr(c, bx, by, bw, bh + 6, 6);
    c.fill();
    c.stroke();
    // sign
    const sy = by + 6, shh = h * 0.31;
    c.fillStyle = '#fff4dc';
    c.strokeStyle = '#c8423b';
    c.lineWidth = 3;
    rr(c, bx + 8, sy, bw - 16, shh, 8);
    c.fill();
    c.stroke();
    let fs = shh * 0.72;
    c.font = `${fs}px ${TITLE_FONT}`;
    while (fs > 10 && c.measureText('Bus').width > bw - 34) c.font = `${(fs -= 1)}px ${TITLE_FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = INK;
    c.fillText('Bus', bx + bw / 2 + 1.5, sy + shh * 0.56 + 1.5);
    c.fillStyle = '#c8423b';
    c.fillText('Bus', bx + bw / 2, sy + shh * 0.56);
    // awning with scallops
    const ay = by + h * 0.44, ah = h * 0.13, stripes = Math.max(7, Math.round(bw / 26)), stw = bw / stripes;
    for (let i = 0; i < stripes; i++) {
      c.fillStyle = i % 2 ? '#fff4e0' : '#d9483b';
      c.fillRect(bx + i * stw, ay, stw, ah);
      c.beginPath();
      c.arc(bx + i * stw + stw / 2, ay + ah, stw / 2, 0, Math.PI);
      c.fill();
    }
    c.strokeStyle = INK;
    c.lineWidth = 2.5;
    c.strokeRect(bx, ay, bw, ah);
    c.beginPath();
    for (let i = 0; i < stripes; i++) c.arc(bx + i * stw + stw / 2, ay + ah, stw / 2, Math.PI, 0, true);
    c.stroke();
    // door and windows
    const gy = ay + ah + stw / 2 + 4, dw = bw * 0.15, dh = yb - gy;
    c.fillStyle = '#6b4a3a';
    c.lineWidth = 2.5;
    rr(c, L.doorX - dw / 2, gy, dw, dh + 4, 4);
    c.fill();
    c.stroke();
    c.fillStyle = '#f2c14e';
    c.beginPath();
    c.arc(L.doorX + dw * 0.28, gy + dh * 0.55, 2, 0, Math.PI * 2);
    c.fill();
    const wins = [[bx + 8, L.doorX - dw / 2 - 8], [L.doorX + dw / 2 + 8, bx + bw - 8]];
    wins.forEach(([x1, x2], i) => {
      if (x2 - x1 < 10) return;
      const wy0 = gy + 2, wh = yb - gy - 8;
      c.fillStyle = '#bfe3ee';
      rr(c, x1, wy0, x2 - x1, wh, 4);
      c.fill();
      c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.8)';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x1 + 6, wy0 + wh - 4);
      c.lineTo(x1 + 14, wy0 + 4);
      c.stroke();
      c.strokeStyle = INK;
      c.lineWidth = 2.5;
      if (i === 1 && x2 - x1 > 34 && wh > 14) {
        c.fillStyle = '#d9483b';
        rr(c, x2 - 32, wy0 + 4, 26, Math.min(12, wh - 6), 3);
        c.fill();
        c.fillStyle = '#fff';
        c.font = 'bold 7.5px system-ui, sans-serif';
        c.fillText('OPEN', x2 - 19, wy0 + 4 + Math.min(12, wh - 6) / 2 + 0.5);
      }
    });

    // chalkboard: Burger of the Day
    const ch = h * 0.6, cy = yb - ch - 3;
    c.strokeStyle = '#8a5a32';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(cbx + 8, cy + ch - 4);
    c.lineTo(cbx + 3, yb + 2);
    c.moveTo(cbx + cbw - 8, cy + ch - 4);
    c.lineTo(cbx + cbw - 3, yb + 2);
    c.stroke();
    c.fillStyle = '#2f3b33';
    c.strokeStyle = '#a0703f';
    c.lineWidth = 4;
    rr(c, cbx, cy, cbw, ch, 4);
    c.fill();
    c.stroke();
    c.fillStyle = '#f6d860';
    c.font = `bold ${clamp(cbw * 0.075, 7, 10)}px ${CHALK_FONT}`;
    c.fillText('BURGER OF THE DAY', cbx + cbw / 2, cy + 10);
    const pun = window.punFor ? window.punFor(n) : '';
    let pfs = 13, lines;
    for (; pfs >= 7; pfs--) {
      c.font = `${pfs}px ${CHALK_FONT}`;
      lines = wrap(c, pun, cbw - 10);
      if (lines.length * pfs * 1.12 <= ch - 22) break;
    }
    c.fillStyle = '#f4f1e8';
    const ty = cy + 18 + (ch - 22 - lines.length * pfs * 1.12) / 2 + pfs * 0.56;
    lines.forEach((ln, i) => c.fillText(ln, cbx + cbw / 2, ty + i * pfs * 1.12));
  }

  function wrap(c, text, maxW) {
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (c.measureText(t).width > maxW && cur) {
        lines.push(cur);
        cur = w;
      } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function drawStreet(c) {
    const S = L.S;
    c.fillStyle = '#e9dcc0';
    c.fillRect(0, S.y, W, S.h);
    c.strokeStyle = 'rgba(59,47,42,.08)';
    c.lineWidth = 1;
    for (let x = 0; x < W; x += 22) {
      c.beginPath();
      c.moveTo(x, S.y);
      c.lineTo(x, S.y + S.h);
      c.stroke();
    }
    const road = (w, col) => {
      c.strokeStyle = col;
      c.lineWidth = w;
      c.lineJoin = 'round';
      c.lineCap = 'round';
      c.beginPath();
      L.path.pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.stroke();
    };
    road(L.gap * 0.9 + 4, INK);
    road(L.gap * 0.9, '#8d8b93');
    road(L.gap * 0.62, '#9b99a1');
  }

  function drawParking(c) {
    const P = L.P;
    c.fillStyle = '#67656b';
    c.fillRect(0, P.y, W, P.h);
    c.fillStyle = '#cfc6b4';
    c.fillRect(0, P.y, W, 4);
    c.fillStyle = INK;
    c.fillRect(0, P.y + 4, W, 1.5);
    const k = state.slots.length, base = k - (usedSlot ? 1 : 0);
    for (let i = 0; i < k; i++) {
      const x = L.sx0 + L.sw * i;
      if (i >= base) {
        c.strokeStyle = '#ffd166';
        c.setLineDash([5, 4]);
        c.lineWidth = 2;
        rr(c, x + 3, P.y + 9, L.sw - 6, P.h - 14, 6);
        c.stroke();
        c.setLineDash([]);
        continue;
      }
      c.fillStyle = 'rgba(255,255,255,.85)';
      c.fillRect(x, P.y + 10, 2, P.h - 16);
      c.fillRect(x + L.sw - 2, P.y + 10, 2, P.h - 16);
      c.fillStyle = 'rgba(255,255,255,.18)';
      c.font = `bold ${Math.min(22, L.sw * 0.4)}px system-ui, sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('P', x + L.sw / 2, P.y + P.h * 0.55);
    }
  }

  function drawGridLot(c) {
    const G = L.G;
    c.fillStyle = 'rgba(0,0,0,.12)';
    rr(c, G.x - 6, G.y - 3, G.w + 12, G.h + 12, 12);
    c.fill();
    c.fillStyle = '#e9ddc2';
    c.strokeStyle = INK;
    c.lineWidth = 3;
    rr(c, G.x - 6, G.y - 6, G.w + 12, G.h + 12, 12);
    c.fill();
    c.stroke();
    c.fillStyle = '#dccdac';
    const pad = G.cell * 0.1;
    for (let y = 0; y < G.rows; y++)
      for (let x = 0; x < G.cols; x++) {
        rr(c, G.x + x * G.cell + pad, G.y + y * G.cell + pad, G.cell - 2 * pad, G.cell - 2 * pad, G.cell * 0.18);
        c.fill();
      }
  }

  // ---------- sprites ----------
  function drawBurger(c, x, y, r) {
    c.fillStyle = '#6dbb4a';
    c.beginPath();
    c.arc(x, y, r * 1.18, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#e9a94f';
    c.strokeStyle = INK;
    c.lineWidth = Math.max(1, r * 0.22);
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = '#fff3d1';
    for (const [dx, dy] of [[-0.35, -0.2], [0.25, -0.35], [0.1, 0.3]]) {
      c.beginPath();
      c.arc(x + dx * r, y + dy * r, Math.max(0.6, r * 0.13), 0, Math.PI * 2);
      c.fill();
    }
  }

  // a bus seen from above; front points along `ang`
  function drawBus(c, x, y, ang, len, wid, color, o = {}) {
    c.save();
    c.translate(x, y);
    c.rotate(ang);
    if (o.alpha != null) c.globalAlpha = o.alpha;
    const hl = len / 2, hw = wid / 2, r = Math.min(wid * 0.34, 9);
    c.fillStyle = 'rgba(0,0,0,.2)';
    rr(c, -hl + 1, -hw + 3, len, wid, r);
    c.fill();
    c.fillStyle = COLORS[color];
    c.strokeStyle = INK;
    c.lineWidth = Math.max(1.5, wid * 0.08);
    rr(c, -hl, -hw, len, wid, r);
    c.fill();
    c.stroke();
    c.fillStyle = LIGHT[color];
    rr(c, -hl + wid * 0.2, -hw + wid * 0.22, len - wid * 0.5, wid * 0.56, r * 0.5);
    c.fill();
    // windshield
    c.fillStyle = '#2d4a5a';
    rr(c, hl - wid * 0.27, -hw + wid * 0.15, wid * 0.15, wid * 0.7, 2);
    c.fill();
    // side windows
    c.fillStyle = '#d7eef7';
    const span = len - wid * 0.65, nw = Math.max(1, Math.floor(span / (wid * 0.42)));
    const step = span / nw;
    for (let i = 0; i < nw; i++) {
      const wx = -hl + wid * 0.22 + i * step;
      c.fillRect(wx, -hw + wid * 0.05, step * 0.62, wid * 0.11);
      c.fillRect(wx, hw - wid * 0.16, step * 0.62, wid * 0.11);
    }
    drawBurger(c, -hl + wid * 0.48, 0, wid * 0.17);
    if (o.arrow) {
      const s = wid * 0.3, ax = len > wid * 2.4 ? wid * 0.25 : wid * 0.12;
      c.fillStyle = '#fff';
      c.strokeStyle = INK;
      c.lineWidth = Math.max(1.2, wid * 0.05);
      c.beginPath();
      c.moveTo(ax + s, 0);
      c.lineTo(ax, -s * 0.85);
      c.lineTo(ax, -s * 0.35);
      c.lineTo(ax - s * 0.9, -s * 0.35);
      c.lineTo(ax - s * 0.9, s * 0.35);
      c.lineTo(ax, s * 0.35);
      c.lineTo(ax, s * 0.85);
      c.closePath();
      c.fill();
      c.stroke();
    }
    c.restore();
  }

  function drawLabel(c, x, y, text) {
    c.font = 'bold 11px system-ui, sans-serif';
    const w = c.measureText(text).width + 10;
    c.fillStyle = 'rgba(59,47,42,.88)';
    rr(c, x - w / 2, y - 8, w, 16, 8);
    c.fill();
    c.fillStyle = '#fff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, x, y + 0.5);
  }

  function drawPerson(c, x, y, r, color) {
    c.fillStyle = COLORS[color];
    c.strokeStyle = INK;
    c.lineWidth = 1.1;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = '#f5d0a9';
    c.beginPath();
    c.arc(x, y - r * 0.38, r * 0.5, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  }

  // ---------- poses ----------
  function gridPose(b) {
    const G = L.G, cells = Rules.cellsOf(b);
    const [hx, hy] = cells[0], [tx, ty] = cells[cells.length - 1];
    return {
      x: G.x + ((hx + tx) / 2 + 0.5) * G.cell,
      y: G.y + ((hy + ty) / 2 + 0.5) * G.cell,
      a: DIRA[b.dir],
      len: b.len * G.cell - G.cell * 0.16,
      wid: G.cell * 0.76,
    };
  }

  function exitPose(v) {
    const e = now - v.t0;
    if (e < v.d1) {
      const k = Math.pow(e / v.d1, 1.25);
      return { x: v.x0 + v.dx * v.dist1 * k, y: v.y0 + v.dy * v.dist1 * k, a: v.a0, len: v.len0, wid: v.wid0 };
    }
    const s = easeInOut(Math.min(1, (e - v.d1) / v.d2));
    const C = L.G.cell;
    const p0 = [v.x0 + v.dx * v.dist1, v.y0 + v.dy * v.dist1];
    const p1 = [p0[0] + v.dx * C * 2.2, p0[1] + v.dy * C * 2.2];
    const p3 = slotCenter(v.slot);
    const p2 = [p3[0], p3[1] + L.P.h * 1.4];
    const pt = cubic(p0, p1, p2, p3, s);
    const d = cubicD(p0, p1, p2, p3, s);
    const a = Math.abs(d[0]) + Math.abs(d[1]) > 1e-3 ? Math.atan2(d[1], d[0]) : -Math.PI / 2;
    return { x: pt[0], y: pt[1], a, len: lerp(v.len0, L.pl, s), wid: lerp(v.wid0, L.pw, s) };
  }

  function nudgeOffset(v) {
    const k = (now - v.t0) / v.dur;
    if (k >= 1) return 0;
    if (k < 0.45) return v.dist * easeOut(k / 0.45);
    return v.dist * (1 - easeOut((k - 0.45) / 0.55));
  }

  // free cells in front of a bus before it bumps into another one
  function freeCells(b) {
    const occ = new Set();
    for (const o of state.buses) if (o.status === 'grid' && o.id !== b.id) for (const [x, y] of Rules.cellsOf(o)) occ.add(x + ',' + y);
    const [dx, dy] = DIRV[b.dir];
    let [x, y] = Rules.cellsOf(b)[0];
    let k = 0;
    for (;;) {
      x += dx;
      y += dy;
      if (x < 0 || y < 0 || x >= state.cols || y >= state.rows || occ.has(x + ',' + y)) return k;
      k++;
    }
  }

  // ---------- input ----------
  function onPointer(e) {
    Sfx.unlock();
    if (screen !== 'play' || !L) return;
    const G = L.G;
    const px = (e.clientX - G.x) / G.cell, py = (e.clientY - G.y) / G.cell;
    if (px < -0.6 || py < -0.6 || px > G.cols + 0.6 || py > G.rows + 0.6) return;
    let best = null, bd = 0.45;
    for (const b of state.buses) {
      if (b.status !== 'grid') continue;
      for (const [x, y] of Rules.cellsOf(b)) {
        const d = Math.max(Math.abs(px - (x + 0.5)), Math.abs(py - (y + 0.5))) - 0.5;
        if (d < bd) {
          bd = d;
          best = b;
        }
      }
    }
    if (best) tapBus(best);
  }

  function tapBus(b) {
    const pose = gridPose(b);
    const pathLen = Rules.exitPath(state, b.id).length;
    const r = Rules.tapBus(state, b.id);
    if (r.ok) {
      const [dx, dy] = DIRV[b.dir];
      const dist1 = (pathLen + 0.6) * L.G.cell;
      const p0 = [pose.x + dx * dist1, pose.y + dy * dist1], t = slotCenter(r.slot);
      vis.set(b.id, {
        kind: 'exit', t0: now, slot: r.slot, x0: pose.x, y0: pose.y, a0: pose.a, len0: pose.len, wid0: pose.wid,
        dx, dy, dist1, d1: 90 + pathLen * 32, d2: clamp(Math.hypot(t[0] - p0[0], t[1] - p0[1]) * 0.9, 260, 620),
      });
      Sfx.tap();
      Sfx.vibrate(8);
      scheduleSave();
    } else if (r.reason === 'blocked') {
      const f = freeCells(b);
      vis.set(b.id, { kind: 'nudge', t0: now, dist: (f + 0.14) * L.G.cell, dur: 220 + f * 60 });
      Sfx.blocked();
      Sfx.vibrate(35);
    } else if (r.reason === 'noslot') {
      slotFlash = now;
      Sfx.noslot();
      Sfx.vibrate([25, 40, 25]);
    }
  }

  // ---------- boosters ----------
  function useSlot() {
    if (usedSlot || save.boosters.slot <= 0) return Sfx.noslot();
    Rules.addSlot(state);
    usedSlot = true;
    save.boosters.slot--;
    layoutSlots();
    drawBg();
    Sfx.reward();
    resumeFromLose();
    updateUI();
    scheduleSave();
  }

  function useShuffle() {
    if (save.boosters.shuffle <= 0 || !Rules.shuffleQueue(state)) return Sfx.noslot();
    save.boosters.shuffle--;
    wiggleUntil = now + 600;
    Sfx.shuffle();
    resumeFromLose();
    updateUI();
    scheduleSave();
  }

  function resumeFromLose() {
    if (screen !== 'lose') return;
    screen = 'play';
    settleT = 0;
    showScreen(null);
  }

  // ---------- level flow ----------
  function startLevel(level, resume) {
    n = level;
    vis.clear();
    leaving = [];
    hoppers = [];
    queueShift = 0;
    settleT = 0;
    levelDone = false;
    state = null;
    if (resume && save.current && save.current.n === level && save.current.state) {
      try {
        state = save.current.state;
        usedSlot = !!save.current.usedSlot;
        Rules.status(state);
      } catch {
        state = null;
      }
    }
    if (!state) {
      state = Rules.createState(window.LevelGen.generate(level));
      usedSlot = false;
    }
    layoutAll();
    updateUI();
    scheduleSave();
  }

  function onWin() {
    screen = 'win';
    levelDone = true;
    save.wins++;
    save.level = n + 1;
    const reward = save.wins % 5 === 0;
    if (reward) {
      save.boosters.slot++;
      save.boosters.shuffle++;
    }
    const q = pickQuote();
    $('winT').textContent = `Level ${n} complete!`;
    $('qText').textContent = q ? `“${q.text}”` : 'Order up!';
    $('qWho').textContent = q ? `— ${q.who}` : '';
    $('qEp').textContent = q && q.ep ? q.ep : '';
    showScreen('win');
    Sfx.win();
    Sfx.vibrate([20, 50, 20]);
    if (reward)
      setTimeout(() => Sfx.reward(), 700);
    updateUI();
    saveNow();
  }

  function onLose() {
    screen = 'lose';
    const lS = $('lSlot'), lF = $('lShuffle');
    lS.querySelector('span').textContent = save.boosters.slot;
    lF.querySelector('span').textContent = save.boosters.shuffle;
    lS.disabled = usedSlot || save.boosters.slot <= 0;
    lF.disabled = save.boosters.shuffle <= 0;
    showScreen('lose');
    Sfx.lose();
    Sfx.vibrate([60, 60, 120]);
    saveNow();
  }

  function pickQuote() {
    if (!quotes.length) return null;
    let seen = new Set((save.seenQuotes || []).filter((i) => i < quotes.length));
    if (seen.size >= quotes.length) seen = new Set();
    const pool = quotes.map((_, i) => i).filter((i) => !seen.has(i));
    const i = pool[Math.floor(Math.random() * pool.length)];
    seen.add(i);
    save.seenQuotes = [...seen];
    return quotes[i];
  }

  function updateUI() {
    $('lvl').textContent = `Level ${n}`;
    $('left').textContent = `${state ? state.queue.length : 0} customers`;
    $('nSlot').textContent = save.boosters.slot;
    $('nShuffle').textContent = save.boosters.shuffle;
    $('bSlot').disabled = usedSlot || save.boosters.slot <= 0;
    $('bShuffle').disabled = save.boosters.shuffle <= 0;
    $('mute').textContent = save.muted ? '🔇' : '🔊';
  }

  // ---------- per-frame update ----------
  function update(dt) {
    queueShift = Math.max(0, queueShift - (dt * L.sp) / (BOARD_MS * 0.95));
    for (const [id, v] of vis) {
      if (v.kind === 'exit' && now - v.t0 >= v.d1 + v.d2) {
        vis.delete(id);
        Sfx.park();
      } else if (v.kind === 'nudge' && now - v.t0 >= v.dur) vis.delete(id);
    }
    hoppers = hoppers.filter((h) => now - h.t0 < HOP_MS);
    leaving = leaving.filter((l) => now - l.t0 < l.dur);
    if (screen !== 'play') return;

    if (now - lastBoard >= BOARD_MS) tryBoard();

    const inTransit = hoppers.length > 0 || [...vis.values()].some((v) => v.kind === 'exit');
    const st = Rules.status(state);
    if (st !== 'playing' && !inTransit && (st === 'lost' || leaving.length === 0)) {
      settleT += dt;
      if (settleT > (st === 'won' ? 500 : 450)) {
        settleT = 0;
        if (st === 'won') onWin();
        else onLose();
      }
    } else settleT = 0;
  }

  function tryBoard() {
    if (!state.queue.length) return;
    // only board a bus that has finished driving into its spot
    const c = state.queue[0];
    let target = -1;
    for (let i = 0; i < state.slots.length; i++) {
      const id = state.slots[i];
      if (id === null) continue;
      const b = bus(id);
      if (b.color === c && b.seated < b.cap) {
        target = i;
        break;
      }
    }
    if (target < 0) return;
    const v = vis.get(state.slots[target]);
    if (v && v.kind === 'exit') return;
    const r = Rules.boardNext(state);
    if (!r) return;
    lastBoard = now;
    hoppers.push({ t0: now, from: pointAt(L.path.total), slot: r.slot, color: r.color });
    queueShift = Math.min(queueShift + L.sp, L.sp * 3);
    const b = bus(r.busId);
    Sfx.board(b.seated);
    if (r.departed) {
      leaving.push({ id: r.busId, t0: now, hold: HOP_MS + 60, dur: HOP_MS + 60 + 520, slot: r.slot, color: b.color, cap: b.cap });
      setTimeout(() => Sfx.honk(), HOP_MS);
      Sfx.vibrate(15);
    }
    $('left').textContent = `${state.queue.length} customers`;
    scheduleSave();
  }

  // ---------- render ----------
  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bg, 0, 0);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (!state || !L) return;

    // buses on the grid
    for (const b of state.buses) {
      if (b.status !== 'grid') continue;
      const p = gridPose(b);
      const v = vis.get(b.id);
      if (v && v.kind === 'nudge') {
        const off = nudgeOffset(v), [dx, dy] = DIRV[b.dir];
        p.x += dx * off;
        p.y += dy * off;
      }
      drawBus(ctx, p.x, p.y, p.a, p.len, p.wid, b.color, { arrow: true });
    }

    // "no free spot" flash
    const fk = (now - slotFlash) / 450;
    if (fk < 1) {
      ctx.fillStyle = `rgba(217,72,59,${0.45 * (1 - fk)})`;
      ctx.fillRect(0, L.P.y, W, L.P.h);
    }

    // parked buses
    state.slots.forEach((id, i) => {
      if (id === null) return;
      const v = vis.get(id);
      if (v && v.kind === 'exit') return;
      const b = bus(id), [x, y] = slotCenter(i);
      drawBus(ctx, x, y, -Math.PI / 2, L.pl, L.pw, b.color);
      drawLabel(ctx, x, y + L.pl * 0.16, `${b.seated}/${b.cap}`);
    });

    // full buses driving away
    for (const l of leaving) {
      const [x, y] = slotCenter(l.slot);
      const k = Math.max(0, (now - l.t0 - l.hold) / (l.dur - l.hold));
      const e = k * k;
      drawBus(ctx, x, y - e * (L.P.h + L.S.h * 0.5), -Math.PI / 2, L.pl, L.pw, l.color, { alpha: 1 - e * 0.9 });
      if (k === 0) drawLabel(ctx, x, y + L.pl * 0.16, `${l.cap}/${l.cap}`);
    }

    // the waiting line
    const q = state.queue, sp = L.sp, tot = L.path.total;
    const shown = Math.min(q.length, Math.floor(tot / sp) + 2);
    const moving = queueShift > 0.5 || now < wiggleUntil;
    for (let i = shown - 1; i >= 0; i--) {
      const s = tot - i * sp - queueShift;
      if (s < 0) continue;
      const [x, y] = pointAt(s);
      const bob = moving ? -Math.abs(Math.sin(now / 85 + i * 0.9)) * 2.4 : 0;
      drawPerson(ctx, x, y + bob, L.pr, q[i]);
    }

    // customers hopping onto buses
    for (const h of hoppers) {
      const k = (now - h.t0) / HOP_MS, to = slotCenter(h.slot);
      const x = lerp(h.from[0], to[0], k), y = lerp(h.from[1], to[1], k) - Math.sin(k * Math.PI) * 16;
      drawPerson(ctx, x, y, L.pr * (1 - k * 0.3), h.color);
    }

    // buses driving from the grid to their spot (on top of everything)
    for (const [id, v] of vis) {
      if (v.kind !== 'exit') continue;
      const p = exitPose(v);
      drawBus(ctx, p.x, p.y, p.a, p.len, p.wid, bus(id).color, { arrow: now - v.t0 < v.d1 });
    }
  }

  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(50, t - now);
    now = t;
    if (!state || !L) return;
    update(dt);
    render();
  }

  // ---------- saving (on the phone) ----------
  let saveTimer = 0;
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 500);
  }
  function saveNow() {
    clearTimeout(saveTimer);
    if (!save) return;
    save.current = state && !levelDone ? { n, state, usedSlot } : null;
    save.updated = Date.now();
    const body = JSON.stringify(save);
    try {
      localStorage.setItem(SAVE_KEY, body);
    } catch {}
  }
  async function loadSave() {
    let pick = null;
    try {
      pick = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    } catch {}
    const s = Object.assign(defaultSave(), pick || {});
    s.boosters = Object.assign({ slot: 2, shuffle: 2 }, (pick && pick.boosters) || {});
    if (!Array.isArray(s.seenQuotes)) s.seenQuotes = [];
    return s;
  }

  // ---------- boot ----------
  async function init() {
    if (!window.Rules || !window.LevelGen) {
      $('titleLvl').textContent = 'Game files missing (rules.js / levelgen.js)';
      return;
    }
    try {
      quotes = await (await fetch('data/quotes.json', { cache: 'no-store' })).json();
    } catch {
      quotes = [];
    }
    save = await loadSave();
    Sfx.setMuted(save.muted);
    startLevel(save.level, true);
    $('titleLvl').textContent = `Level ${save.level}`;
    if (document.fonts) document.fonts.load(`20px ${TITLE_FONT}`).then(() => state && drawBg(), () => {});
    requestAnimationFrame(frame);
  }

  cv.addEventListener('pointerdown', onPointer);
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  window.addEventListener('resize', () => state && layoutAll());
  document.addEventListener('visibilitychange', () => document.hidden && saveNow());
  window.addEventListener('pagehide', saveNow);

  $('play').addEventListener('click', () => {
    Sfx.unlock();
    showScreen(null);
    screen = 'play';
    settleT = 0;
  });
  let restartArmed = 0;
  $('restart').addEventListener('click', () => {
    const btn = $('restart');
    if (Date.now() - restartArmed > 3000) {
      restartArmed = Date.now();
      btn.textContent = 'Sure? Tap again to start over';
      btn.classList.add('armed');
      setTimeout(() => {
        if (Date.now() - restartArmed >= 3000) {
          btn.textContent = 'Start over from level 1';
          btn.classList.remove('armed');
        }
      }, 3100);
      return;
    }
    restartArmed = 0;
    btn.textContent = 'Start over from level 1';
    btn.classList.remove('armed');
    save = Object.assign(defaultSave(), { muted: save.muted, epoch: Date.now() });
    startLevel(1, false);
    saveNow();
    $('titleLvl').textContent = 'Level 1';
  });
  $('next').addEventListener('click', () => {
    Sfx.unlock();
    showScreen(null);
    startLevel(save.level, false);
    screen = 'play';
  });
  $('retry').addEventListener('click', () => {
    showScreen(null);
    startLevel(n, false);
    screen = 'play';
  });
  $('lSlot').addEventListener('click', useSlot);
  $('lShuffle').addEventListener('click', useShuffle);
  $('bSlot').addEventListener('click', () => screen === 'play' && useSlot());
  $('bShuffle').addEventListener('click', () => screen === 'play' && useShuffle());
  $('mute').addEventListener('click', () => {
    Sfx.unlock();
    save.muted = !save.muted;
    Sfx.setMuted(save.muted);
    updateUI();
    scheduleSave();
  });

  // for testing from the console / tools
  window.BusDebug = { state: () => state, screen: () => screen, save: () => save, tap: (id) => tapBus(bus(id)) };

  layoutAll();
  init();
})();
