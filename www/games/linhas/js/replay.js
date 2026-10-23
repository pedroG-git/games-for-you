// Time-lapse: the network is recorded as it grows, replayed after the game, and can be saved as a picture.
import { CITIES } from './cities.js';
import { segmentPoints } from './engine.js';
import { paint, shapePath } from './render.js';

const MAX = 240; // snapshots kept per game (older ones are thinned out evenly)

// Called every frame: keeps a snapshot whenever the map changed, at most twice a game day.
export function record(S, force = false) {
  const h = S.hist || (S.hist = []);
  const key = `${S.rev}|${S.stations.length}`, last = h[h.length - 1];
  if (last && last.key === key) return;
  if (!force && last && S.t - last.t < 10) return;
  h.push({ key, t: S.t, wk: S.week + 1, ns: S.stations.length, r: S.lines.map((l) => [l.color, l.stations.slice(), l.loop ? 1 : 0]) });
  if (h.length > MAX) S.hist = h.filter((_, i) => i % 2 === 0 || i === h.length - 1);
}

// Draws one snapshot into a W×H box of canvas c (pixels), framed on the whole final map.
function drawSnap(c, S, snap, x0, y0, W, H) {
  const city = CITIES.find((k) => k.id === S.city) || CITIES[0], v = S.view;
  const k = Math.min(W / v.w, H / v.h), ox = x0 + (W - v.w * k) / 2 - v.x * k, oy = y0 + (H - v.h * k) / 2 - v.y * k;
  const P = (p) => [p.x * k + ox, p.y * k + oy];
  const u = Math.max(1, W / 300); // line and station size grow with the picture
  c.save();
  c.beginPath(); c.rect(x0, y0, W, H); c.clip();
  c.fillStyle = city.bg; c.fillRect(x0, y0, W, H);
  c.fillStyle = city.water;
  for (const poly of city.waterPolys || []) {
    c.beginPath(); poly.forEach(([x, y], i) => (i ? c.lineTo(...P({ x, y })) : c.moveTo(...P({ x, y })))); c.closePath(); c.fill();
  }
  c.lineCap = c.lineJoin = 'round';
  for (const [color, ids, loop] of snap.r) {
    const list = loop ? [...ids, ids[0]] : ids;
    c.strokeStyle = paint(color); c.lineWidth = 4 * u; c.beginPath();
    list.forEach((id, i) => {
      if (!i) { c.moveTo(...P(S.stations[id])); return; }
      for (const q of segmentPoints(S.stations[list[i - 1]], S.stations[id]).slice(1)) c.lineTo(...P(q));
    });
    c.stroke();
  }
  c.fillStyle = '#fff'; c.strokeStyle = '#222'; c.lineWidth = 1.8 * u;
  for (let i = 0; i < snap.ns; i++) {
    const st = S.stations[i], [x, y] = P(st);
    shapePath(c, st.shape, x, y, 4.5 * u); c.fill(); c.stroke();
  }
  c.restore();
}

// Poster: the finished map with the city, the score and the weeks.
function poster(S) {
  const W = 1080, H = 1440, cv = document.createElement('canvas'), c = cv.getContext('2d');
  cv.width = W; cv.height = H;
  const city = CITIES.find((k) => k.id === S.city) || CITIES[0];
  c.fillStyle = city.bg; c.fillRect(0, 0, W, H);
  const h = S.hist || [];
  drawSnap(c, S, h[h.length - 1] || { ns: S.stations.length, r: [] }, 40, 190, W - 80, H - 330);
  c.fillStyle = '#222'; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  c.font = '900 76px system-ui, sans-serif'; c.fillText(city.name, 60, 120);
  c.font = '600 34px system-ui, sans-serif'; c.fillStyle = '#555';
  c.fillText(`${S.score} passengers home · ${S.week + 1} week${S.week ? 's' : ''} · ${S.lines.length} lines`, 62, 168);
  c.textAlign = 'right'; c.font = '800 30px system-ui, sans-serif'; c.fillStyle = '#e4423f';
  c.fillText('Linhas · Games for you', W - 60, H - 60);
  return cv;
}

// Shares the picture on a phone (save it to the gallery, send it…), downloads it in a browser.
async function savePicture(cv, name) {
  const url = cv.toDataURL('image/png'), C = window.Capacitor;
  if (C && C.isNativePlatform && C.isNativePlatform()) {
    const plug = (n) => (C.Plugins && C.Plugins[n]) || C.registerPlugin(n);
    const file = await plug('Filesystem').writeFile({ path: name, data: url.split(',')[1], directory: 'CACHE' });
    await plug('Share').share({ title: 'My Linhas map', files: [file.uri] });
    return;
  }
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
}

// Plays the time-lapse in the canvas of the #replay modal.
let anim = 0;
export function openReplay(S, $, toast) {
  const cv = $('#rp-cv'), c = cv.getContext('2d'), dpr = Math.min(devicePixelRatio || 1, 3);
  const h = S.hist && S.hist.length ? S.hist : [{ wk: S.week + 1, ns: S.stations.length, r: [] }];
  $('#replay').hidden = false;
  const box = cv.getBoundingClientRect();
  cv.width = Math.round(box.width * dpr); cv.height = Math.round(box.height * dpr);
  const dur = Math.max(3500, Math.min(9000, h.length * 70)), t0 = performance.now();
  cancelAnimationFrame(anim);
  const frame = (now) => {
    if ($('#replay').hidden) return;
    const f = Math.min(1, (now - t0) / dur), snap = h[Math.min(h.length - 1, Math.floor(f * h.length))];
    drawSnap(c, S, snap, 0, 0, cv.width, cv.height);
    $('#rp-wk').textContent = `Week ${snap.wk}`;
    if (f < 1) anim = requestAnimationFrame(frame);
  };
  anim = requestAnimationFrame(frame);
  $('#rp-again').onclick = () => openReplay(S, $, toast);
  $('#rp-save').onclick = async () => {
    try { await savePicture(poster(S), `linhas-${S.city}-${S.score}.png`); } catch (e) { if (!/cancel/i.test(String(e && e.message))) toast('Could not save the picture'); }
  };
}
