// Tile faces, drawn once on a canvas and reused as images. Two sets: classic mahjong and pictures.
// Every numbered tile gets a small corner number so similar tiles are easy to tell apart.
const W = 120, H = 160, SCALE = 2;
const RED = '#c62828', GREEN = '#1b7a3c', BLUE = '#1f4e9c', INK = '#1d1d1f';
const CJK = '"Noto Serif CJK SC","Noto Serif CJK","Source Han Serif SC","Songti SC","STSong","Noto Sans CJK SC","PingFang SC","Hiragino Sans GB",serif';
const NUMS = '一二三四五六七八九';

function canvas() {
  const c = document.createElement('canvas');
  c.width = W * SCALE; c.height = H * SCALE;
  const x = c.getContext('2d');
  x.scale(SCALE, SCALE);
  x.lineCap = 'round'; x.lineJoin = 'round';
  return [c, x];
}
function corner(x, text, color = '#7a6a4a') {
  x.fillStyle = color; x.font = 'bold 19px system-ui, sans-serif'; x.textAlign = 'left'; x.textBaseline = 'top';
  x.fillText(text, 7, 5);
}
function glyph(x, ch, cx, cy, size, color) {
  x.fillStyle = color; x.font = `900 ${size}px ${CJK}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(ch, cx, cy);
}

// ---------------------------------------------------------------- dots
function dot(x, cx, cy, r, color) {
  x.fillStyle = color; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
  x.fillStyle = '#fffaf0'; x.beginPath(); x.arc(cx, cy, r * 0.72, 0, 7); x.fill();
  x.fillStyle = color; x.beginPath(); x.arc(cx, cy, r * 0.5, 0, 7); x.fill();
  x.strokeStyle = '#fffaf0'; x.lineWidth = r * 0.12;
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; x.beginPath(); x.moveTo(cx + Math.cos(a) * r * 0.18, cy + Math.sin(a) * r * 0.18); x.lineTo(cx + Math.cos(a) * r * 0.44, cy + Math.sin(a) * r * 0.44); x.stroke(); }
}
const DOTS = [
  [[60, 82, 40, 'big']],
  [[60, 48, 21, GREEN], [60, 116, 21, BLUE]],
  [[30, 38, 17, BLUE], [60, 82, 17, RED], [90, 126, 17, GREEN]],
  [[34, 50, 19, BLUE], [86, 50, 19, GREEN], [34, 114, 19, GREEN], [86, 114, 19, BLUE]],
  [[32, 40, 16, BLUE], [88, 40, 16, GREEN], [60, 82, 16, RED], [32, 124, 16, GREEN], [88, 124, 16, BLUE]],
  [[36, 36, 16, GREEN], [84, 36, 16, GREEN], [36, 86, 16, RED], [84, 86, 16, RED], [36, 128, 16, RED], [84, 128, 16, RED]],
  [[28, 30, 13, GREEN], [60, 46, 13, GREEN], [92, 62, 13, GREEN], [38, 98, 14, RED], [82, 98, 14, RED], [38, 132, 14, RED], [82, 132, 14, RED]],
  [[38, 30, 14, BLUE], [82, 30, 14, BLUE], [38, 64, 14, BLUE], [82, 64, 14, BLUE], [38, 98, 14, BLUE], [82, 98, 14, BLUE], [38, 132, 14, BLUE], [82, 132, 14, BLUE]],
  [[28, 38, 14, BLUE], [60, 38, 14, BLUE], [92, 38, 14, BLUE], [28, 82, 14, RED], [60, 82, 14, RED], [92, 82, 14, RED], [28, 126, 14, GREEN], [60, 126, 14, GREEN], [92, 126, 14, GREEN]],
];
function drawDots(x, n) {
  for (const [cx, cy, r, c] of DOTS[n - 1]) {
    if (c === 'big') {
      [[r, GREEN], [r * 0.8, '#fffaf0'], [r * 0.68, RED], [r * 0.5, '#fffaf0'], [r * 0.36, BLUE], [r * 0.16, '#fffaf0']].forEach(([rr, col]) => { x.fillStyle = col; x.beginPath(); x.arc(cx, cy, rr, 0, 7); x.fill(); });
      x.strokeStyle = GREEN; x.lineWidth = 3;
      for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; x.beginPath(); x.arc(cx + Math.cos(a) * r * 0.9, cy + Math.sin(a) * r * 0.9, 3, 0, 7); x.stroke(); }
    } else dot(x, cx, cy, r, c);
  }
  corner(x, String(n));
}

// ---------------------------------------------------------------- bamboo
function stick(x, cx, cy, len, color, w = 11) {
  const top = cy - len / 2;
  x.fillStyle = color; x.beginPath(); x.roundRect(cx - w / 2, top, w, len, w / 2); x.fill();
  x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(cx - w / 2 + 2, top + 3, 2.5, len - 6);
  x.strokeStyle = 'rgba(0,0,0,.45)'; x.lineWidth = 2.2;
  for (const t of [0.12, 0.5, 0.88]) { x.beginPath(); x.moveTo(cx - w / 2 - 1.5, top + len * t); x.lineTo(cx + w / 2 + 1.5, top + len * t); x.stroke(); }
}
const BAMBOO = {
  2: [[60, 48, GREEN], [60, 116, BLUE]],
  3: [[60, 48, GREEN], [36, 116, BLUE], [84, 116, BLUE]],
  4: [[38, 48, BLUE], [82, 48, GREEN], [38, 116, GREEN], [82, 116, BLUE]],
  5: [[32, 48, GREEN], [88, 48, BLUE], [60, 82, RED], [32, 116, BLUE], [88, 116, GREEN]],
  6: [[30, 48, GREEN], [60, 48, GREEN], [90, 48, GREEN], [30, 116, BLUE], [60, 116, BLUE], [90, 116, BLUE]],
  7: [[60, 30, RED], [30, 82, GREEN], [60, 82, GREEN], [90, 82, GREEN], [30, 132, GREEN], [60, 132, GREEN], [90, 132, GREEN]],
  8: [[24, 50, GREEN], [48, 50, GREEN], [72, 50, GREEN], [96, 50, GREEN], [24, 114, BLUE], [48, 114, BLUE], [72, 114, BLUE], [96, 114, BLUE]],
  9: [[30, 34, GREEN], [60, 34, RED], [90, 34, BLUE], [30, 82, GREEN], [60, 82, RED], [90, 82, BLUE], [30, 130, GREEN], [60, 130, RED], [90, 130, BLUE]],
};
function drawBamboo(x, n) {
  if (n === 1) bird(x);
  else {
    const len = n >= 7 ? 40 : 52;
    for (const [cx, cy, c] of BAMBOO[n]) stick(x, cx, cy, len, c, n === 8 ? 10 : 11);
  }
  corner(x, String(n));
}
function bird(x) {
  // a little peacock standing on a branch
  x.fillStyle = RED;
  for (let k = -2; k <= 2; k++) { x.save(); x.translate(52, 100); x.rotate(k * 0.32 - 0.4); x.beginPath(); x.ellipse(0, -38, 9, 24, 0, 0, 7); x.fill(); x.restore(); }
  x.fillStyle = BLUE;
  for (let k = -2; k <= 2; k++) { const a = k * 0.32 - 0.4; x.beginPath(); x.arc(52 + Math.sin(a) * 52, 100 - Math.cos(a) * 52, 5, 0, 7); x.fill(); }
  x.fillStyle = GREEN; x.beginPath(); x.ellipse(70, 100, 22, 16, -0.3, 0, 7); x.fill();
  x.beginPath(); x.ellipse(86, 72, 8, 18, 0.25, 0, 7); x.fill();
  x.beginPath(); x.arc(90, 56, 10, 0, 7); x.fill();
  x.fillStyle = '#e8a317'; x.beginPath(); x.moveTo(99, 54); x.lineTo(110, 58); x.lineTo(99, 61); x.fill();
  x.fillStyle = '#fff'; x.beginPath(); x.arc(92, 54, 3.5, 0, 7); x.fill();
  x.fillStyle = INK; x.beginPath(); x.arc(93, 54, 1.8, 0, 7); x.fill();
  x.strokeStyle = RED; x.lineWidth = 2.5; x.beginPath(); x.moveTo(88, 46); x.lineTo(84, 38); x.moveTo(91, 46); x.lineTo(92, 37); x.stroke();
  x.strokeStyle = '#7a4a1a'; x.lineWidth = 5; x.beginPath(); x.moveTo(30, 126); x.lineTo(104, 120); x.stroke();
  x.strokeStyle = '#e8a317'; x.lineWidth = 3; x.beginPath(); x.moveTo(66, 114); x.lineTo(64, 123); x.moveTo(76, 113); x.lineTo(78, 122); x.stroke();
}

// ---------------------------------------------------------------- characters, honors, bonus
function drawChar(x, n) {
  glyph(x, NUMS[n - 1], 60, 52, 54, INK);
  glyph(x, '萬', 60, 118, 60, RED);
  corner(x, String(n));
}
const WINDS = [['東', 'E'], ['南', 'S'], ['西', 'W'], ['北', 'N']];
function drawWind(x, k) { glyph(x, WINDS[k][0], 60, 86, 84, INK); corner(x, WINDS[k][1], BLUE); }
function drawDragon(x, k) {
  if (k === 0) glyph(x, '中', 60, 84, 96, RED);
  else if (k === 1) glyph(x, '發', 60, 86, 88, GREEN);
  else {
    x.strokeStyle = BLUE; x.lineWidth = 7; x.beginPath(); x.roundRect(22, 26, 76, 112, 8); x.stroke();
    x.lineWidth = 3; x.beginPath(); x.roundRect(33, 37, 54, 90, 4); x.stroke();
  }
}
function blossom(x, cx, cy, r, petals, color, mid) {
  x.fillStyle = color;
  for (let k = 0; k < petals; k++) { const a = k * Math.PI * 2 / petals; x.beginPath(); x.ellipse(cx + Math.cos(a) * r * 0.62, cy + Math.sin(a) * r * 0.62, r * 0.45, r * (petals > 8 ? 0.16 : 0.34), a, 0, 7); x.fill(); }
  x.fillStyle = mid; x.beginPath(); x.arc(cx, cy, r * 0.28, 0, 7); x.fill();
}
function leaf(x, cx, cy, a, len, color) {
  x.save(); x.translate(cx, cy); x.rotate(a); x.fillStyle = color;
  x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(len * 0.35, -len * 0.22, len, 0); x.quadraticCurveTo(len * 0.35, len * 0.22, 0, 0); x.fill();
  x.restore();
}
const FLOWERS = [['梅', '#e0457b'], ['蘭', '#8e44ad'], ['菊', '#e6a100'], ['竹', '#1b7a3c']];
function drawFlower(x, k) {
  const [ch, col] = FLOWERS[k];
  x.strokeStyle = '#5a3a1a'; x.lineWidth = 3; x.beginPath(); x.moveTo(60, 148); x.quadraticCurveTo(50, 110, 60, 76); x.stroke();
  if (k === 3) { for (let j = 0; j < 5; j++) leaf(x, 60, 70 + j * 14, -0.6 - j * 0.15 + (j % 2) * 2.5, 34, col); stick(x, 60, 98, 90, '#2e8b57', 8); }
  else {
    leaf(x, 56, 118, 2.6, 30, GREEN); leaf(x, 60, 104, -0.5, 28, GREEN);
    blossom(x, 60, 66, 34, k === 2 ? 14 : k === 1 ? 6 : 5, col, '#ffd23a');
    if (k === 0) blossom(x, 30, 108, 14, 5, col, '#ffd23a');
  }
  glyph(x, ch, 98, 140, 22, RED);
  corner(x, String(k + 1), '#c2185b');
}
const SEASONS = [['春', '#2e9d4a'], ['夏', '#e2541b'], ['秋', '#c27a00'], ['冬', '#2a72c9']];
function drawSeason(x, k) {
  const [ch, col] = SEASONS[k];
  if (k === 0) { leaf(x, 60, 70, -2.2, 30, col); leaf(x, 60, 70, -0.9, 30, col); x.strokeStyle = col; x.lineWidth = 4; x.beginPath(); x.moveTo(60, 70); x.lineTo(60, 92); x.stroke(); }
  else if (k === 1) { x.fillStyle = '#ffb300'; x.beginPath(); x.arc(60, 58, 17, 0, 7); x.fill(); x.strokeStyle = '#ffb300'; x.lineWidth = 4; for (let j = 0; j < 8; j++) { const a = j * Math.PI / 4; x.beginPath(); x.moveTo(60 + Math.cos(a) * 23, 58 + Math.sin(a) * 23); x.lineTo(60 + Math.cos(a) * 31, 58 + Math.sin(a) * 31); x.stroke(); } }
  else if (k === 2) { leaf(x, 40, 76, -0.6, 46, '#d35400'); leaf(x, 52, 82, -1.6, 34, '#e6a100'); }
  else { x.strokeStyle = col; x.lineWidth = 4; for (let j = 0; j < 3; j++) { const a = j * Math.PI / 3; x.beginPath(); x.moveTo(60 - Math.cos(a) * 26, 60 - Math.sin(a) * 26); x.lineTo(60 + Math.cos(a) * 26, 60 + Math.sin(a) * 26); x.stroke(); } }
  glyph(x, ch, 60, 122, 50, col);
  corner(x, String(k + 1), '#2a72c9');
}

// ---------------------------------------------------------------- picture set
const PICS = ['🍎', '🍊', '🍋', '🍉', '🍇', '🍓', '🍒', '🍑', '🥝', '🍍', '🥥', '🥑', '🍆', '🥕', '🌽', '🍄', '🐶', '🐱',
  '🐭', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐸', '🐵', '🐧', '🐤', '🦋', '🐞', '🐢', '🐙', '🌸', '🌻', '🌷', '🌹', '🌱', '☀️', '🍁', '❄️'];
function drawPic(x, f) {
  x.font = '74px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(PICS[f], 60, 86);
  if (f >= 34) {
    x.fillStyle = f < 38 ? '#e0457b' : '#2a72c9';
    x.beginPath(); x.roundRect(10, 136, 100, 16, 8); x.fill();
    x.fillStyle = '#fff'; x.font = 'bold 12px system-ui, sans-serif'; x.textBaseline = 'middle';
    x.fillText(f < 38 ? 'FLOWER' : 'SEASON', 60, 145);
  }
}

// ---------------------------------------------------------------- public
export const BONUS_COLOR = (f) => (f >= 38 ? 'season' : f >= 34 ? 'flower' : '');
const cache = {};
export function faceURL(f, style) {
  const k = style + f;
  if (cache[k]) return cache[k];
  const [c, x] = canvas();
  if (style === 'pics') drawPic(x, f);
  else if (f < 9) drawDots(x, f + 1);
  else if (f < 18) drawBamboo(x, f - 8);
  else if (f < 27) drawChar(x, f - 17);
  else if (f < 31) drawWind(x, f - 27);
  else if (f < 34) drawDragon(x, f - 31);
  else if (f < 38) drawFlower(x, f - 34);
  else drawSeason(x, f - 38);
  return (cache[k] = c.toDataURL());
}
