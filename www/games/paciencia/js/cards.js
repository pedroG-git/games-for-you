// Card artwork drawn on canvas at start-up (no image files), plus geometry helpers.
import * as THREE from '../../../shared/vendor/three/three.module.js';
import { rankOf, suitOf } from './engine.js';

export const CW = 1, CH = 1.42, CR = 0.075;
const TW = 256, TH = Math.round(TW * CH);
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const RED = '#c5283a', BLACK = '#1a2130';
const FONT = 'Roboto, "Helvetica Neue", Arial, sans-serif';

export const THEMES = {
  verde: { name: 'Verde', felt: ['#37966a', '#1f6b4b', '#0e3d2b'], back: '#24539a', ui: '#0e3d2b' },
  azul: { name: 'Azul', felt: ['#3d74b8', '#234f8c', '#10264a'], back: '#b4472f', ui: '#10264a' },
  bordo: { name: 'Bordô', felt: ['#a04058', '#74263c', '#3d0f1e'], back: '#1d6b63', ui: '#3d0f1e' },
};

export function suitPath(ctx, s, cx, cy, size) {
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(size, size);
  ctx.beginPath();
  const stem = () => { ctx.moveTo(0, 0.12); ctx.quadraticCurveTo(-0.02, 0.4, -0.18, 0.5); ctx.lineTo(0.18, 0.5); ctx.quadraticCurveTo(0.02, 0.4, 0, 0.12); };
  if (s === 1) { // heart
    ctx.moveTo(0, -0.2);
    ctx.bezierCurveTo(-0.1, -0.52, -0.56, -0.5, -0.5, -0.1);
    ctx.bezierCurveTo(-0.46, 0.16, -0.15, 0.3, 0, 0.5);
    ctx.bezierCurveTo(0.15, 0.3, 0.46, 0.16, 0.5, -0.1);
    ctx.bezierCurveTo(0.56, -0.5, 0.1, -0.52, 0, -0.2);
  } else if (s === 3) { // diamond
    ctx.moveTo(0, -0.52);
    ctx.quadraticCurveTo(-0.16, -0.22, -0.4, 0);
    ctx.quadraticCurveTo(-0.16, 0.22, 0, 0.52);
    ctx.quadraticCurveTo(0.16, 0.22, 0.4, 0);
    ctx.quadraticCurveTo(0.16, -0.22, 0, -0.52);
  } else if (s === 0) { // spade
    ctx.moveTo(0, -0.5);
    ctx.bezierCurveTo(-0.15, -0.3, -0.5, -0.12, -0.5, 0.12);
    ctx.bezierCurveTo(-0.5, 0.42, -0.12, 0.42, 0, 0.2);
    ctx.bezierCurveTo(0.12, 0.42, 0.5, 0.42, 0.5, 0.12);
    ctx.bezierCurveTo(0.5, -0.12, 0.15, -0.3, 0, -0.5);
    stem();
  } else { // club
    ctx.arc(0, -0.25, 0.235, 0, Math.PI * 2);
    ctx.moveTo(-0.02, 0.07); ctx.arc(-0.255, 0.07, 0.235, 0, Math.PI * 2);
    ctx.moveTo(0.49, 0.07); ctx.arc(0.255, 0.07, 0.235, 0, Math.PI * 2);
    ctx.moveTo(0.14, 0); ctx.arc(0, 0, 0.14, 0, Math.PI * 2);
    stem();
  }
  ctx.fill();
  ctx.restore();
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function crown(ctx, cx, cy, w, h, points) {
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, cy + h / 2);
  ctx.lineTo(cx - w / 2 - w * 0.06, cy - h * 0.25);
  const step = w / (points - 1);
  for (let i = 0; i < points; i++) {
    const px = cx - w / 2 + i * step;
    const tall = (i === (points - 1) / 2) ? 0.62 : 0.42;
    if (i > 0) ctx.lineTo(px - step / 2, cy + h * 0.05);
    ctx.lineTo(px, cy - h * tall);
  }
  ctx.lineTo(cx + w / 2 + w * 0.06, cy - h * 0.25);
  ctx.lineTo(cx + w / 2, cy + h / 2);
  ctx.closePath(); ctx.fill();
  for (let i = 0; i < points; i++) {
    const px = cx - w / 2 + i * step, tall = (i === (points - 1) / 2) ? 0.62 : 0.42;
    ctx.beginPath(); ctx.arc(px, cy - h * tall - h * 0.08, h * 0.1, 0, Math.PI * 2); ctx.fill();
  }
}

function finish(canvas, renderer) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

export function faceTexture(card, renderer) {
  const cv = document.createElement('canvas'); cv.width = TW; cv.height = TH;
  const ctx = cv.getContext('2d');
  const r = rankOf(card), s = suitOf(card), col = (s & 1) ? RED : BLACK;
  const g = ctx.createLinearGradient(0, 0, 0, TH);
  g.addColorStop(0, '#fffefb'); g.addColorStop(1, '#f1ede3');
  ctx.fillStyle = g; ctx.fillRect(0, 0, TW, TH);

  if (r >= 10) { // court cards: tinted panel with a crown
    ctx.fillStyle = (s & 1) ? '#fbe4e2' : '#e3e8f1';
    rr(ctx, 22, 124, TW - 44, TH - 148, 16); ctx.fill();
    ctx.strokeStyle = col; ctx.globalAlpha = 0.35; ctx.lineWidth = 3; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = '#d9a431';
    crown(ctx, TW / 2, 176, r === 12 ? 112 : r === 11 ? 96 : 78, 50, r === 12 ? 5 : 3);
    ctx.fillStyle = col;
    suitPath(ctx, s, TW / 2, 272, 112);
  } else {
    ctx.fillStyle = col;
    suitPath(ctx, s, TW / 2, 238, r === 0 ? 196 : 168);
  }

  ctx.fillStyle = col;
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.font = `bold 108px ${FONT}`;
  const label = RANKS[r];
  ctx.save();
  ctx.translate(14, 100);
  if (label === '10') ctx.scale(0.74, 1);
  ctx.fillText(label, 0, 0);
  ctx.restore();
  suitPath(ctx, s, TW - 56, 60, 80);

  ctx.strokeStyle = 'rgba(40,30,10,0.22)'; ctx.lineWidth = 3;
  rr(ctx, 1.5, 1.5, TW - 3, TH - 3, CR * TW); ctx.stroke();
  return finish(cv, renderer);
}

export function backTexture(theme, renderer) {
  const cv = document.createElement('canvas'); cv.width = TW; cv.height = TH;
  const ctx = cv.getContext('2d');
  const c = THEMES[theme].back;
  ctx.fillStyle = '#fbfaf5'; ctx.fillRect(0, 0, TW, TH);
  const m = 15;
  ctx.save();
  rr(ctx, m, m, TW - 2 * m, TH - 2 * m, 12); ctx.clip();
  ctx.fillStyle = c; ctx.fillRect(0, 0, TW, TH);
  const T = (TW - 2 * m) / 4; // azulejo tile
  for (let ty = 0; ty < 7; ty++) for (let tx = 0; tx < 4; tx++) {
    const x = m + tx * T + T / 2, y = m + ty * T + T / 2;
    ctx.fillStyle = '#fbfaf5';
    for (let k = 0; k < 4; k++) { // petals
      ctx.save(); ctx.translate(x, y); ctx.rotate(k * Math.PI / 2 + Math.PI / 4);
      ctx.beginPath(); ctx.ellipse(0, -T * 0.25, T * 0.1, T * 0.22, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    ctx.beginPath(); ctx.arc(x, y, T * 0.09, 0, Math.PI * 2); ctx.fillStyle = '#e8b93c'; ctx.fill();
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { // corner rosettes shared by 4 tiles
      const px = x + dx * T / 2, py = y + dy * T / 2;
      ctx.fillStyle = '#fbfaf5'; ctx.beginPath(); ctx.arc(px, py, T * 0.24, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(px, py, T * 0.13, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(40,30,10,0.22)'; ctx.lineWidth = 3;
  rr(ctx, 1.5, 1.5, TW - 3, TH - 3, CR * TW); ctx.stroke();
  return finish(cv, renderer);
}

export function feltTexture(theme) {
  const S = 512, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const ctx = cv.getContext('2d');
  const [a, b, c] = THEMES[theme].felt;
  const g = ctx.createRadialGradient(S / 2, S * 0.4, S * 0.05, S / 2, S / 2, S * 0.62);
  g.addColorStop(0, a); g.addColorStop(0.55, b); g.addColorStop(1, c);
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 26000; i++) {
    ctx.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.05)';
    ctx.fillRect(rnd() * S, rnd() * S, 1.2, 1.2);
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// kind: 0-3 foundation suit, 'stock', 'plain'
export function slotTexture(kind) {
  const cv = document.createElement('canvas'); cv.width = TW; cv.height = TH;
  const ctx = cv.getContext('2d');
  rr(ctx, 6, 6, TW - 12, TH - 12, CR * TW);
  ctx.fillStyle = 'rgba(0,0,0,0.13)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.34)'; ctx.lineWidth = 6; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  if (typeof kind === 'number') suitPath(ctx, kind, TW / 2, TH / 2, 120);
  else if (kind === 'stock') {
    ctx.strokeStyle = 'rgba(255,255,255,0.38)'; ctx.lineWidth = 14; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(TW / 2, TH / 2, 52, -Math.PI * 0.35, Math.PI * 1.25); ctx.stroke();
    ctx.save(); ctx.translate(TW / 2 + 52 * Math.cos(-Math.PI * 0.35), TH / 2 + 52 * Math.sin(-Math.PI * 0.35));
    ctx.rotate(-Math.PI * 0.35 + Math.PI / 2 + 0.25);
    ctx.beginPath(); ctx.moveTo(-26, 4); ctx.lineTo(8, 22); ctx.lineTo(8, -22); ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,0.42)'; ctx.fill(); ctx.restore();
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function shadowTexture() {
  const W = 128, H = 176, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.filter = 'blur(9px)';
  ctx.fillStyle = '#000';
  rr(ctx, 20, 20, W - 40, H - 40, 10); ctx.fill();
  if (ctx.filter !== 'blur(9px)') { // no canvas filter support: approximate with stacked strokes
    for (let i = 0; i < 10; i++) { ctx.globalAlpha = 0.09; rr(ctx, 20 - i, 20 - i, W - 40 + 2 * i, H - 40 + 2 * i, 10 + i); ctx.fill(); }
  }
  return new THREE.CanvasTexture(cv);
}

export function roundedRectGeometry(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  const g = new THREE.ShapeGeometry(s, 5);
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
  return g;
}
