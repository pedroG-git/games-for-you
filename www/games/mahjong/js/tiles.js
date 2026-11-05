// Tile faces, drawn once on a canvas and reused as images. Two sets: classic mahjong and pictures.
// Drawn for small phone tiles: symbols fill most of the face, strong ink colours, simple shapes
// (no fine detail that turns to mush at 40px). Numbered tiles get a corner number with a halo;
// flowers and seasons get a coloured corner badge so the two bonus groups are easy to tell apart.
const W = 120, H = 160, SCALE = 2;
const RED = '#c4161c', GREEN = '#0f6e35', BLUE = '#1747a6', INK = '#141414', FACE = '#fffaf0';
const FLOWER_COL = '#d81b60', SEASON_COL = '#1f63c4';
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
// corner number with a face-coloured halo so it stays readable over any symbol
function corner(x, text, color = '#3a2c12') {
  x.font = '900 25px system-ui, sans-serif'; x.textAlign = 'left'; x.textBaseline = 'top';
  x.lineWidth = 6; x.strokeStyle = FACE; x.strokeText(text, 5, 3);
  x.fillStyle = color; x.fillText(text, 5, 3);
}
// coloured corner badge for flowers / seasons
function badge(x, text, color) {
  x.fillStyle = color; x.beginPath(); x.roundRect(3, 3, 28, 30, 8); x.fill();
  x.fillStyle = '#fff'; x.font = '900 23px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, 17, 19);
}
function glyph(x, ch, cx, cy, size, color) {
  x.fillStyle = color; x.font = `900 ${size}px ${CJK}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(ch, cx, cy);
}
// draw `fn` scaled by `s` around (cx, cy)
function zoom(x, cx, cy, s, fn) { x.save(); x.translate(cx, cy); x.scale(s, s); x.translate(-cx, -cy); fn(); x.restore(); }

// ---------------------------------------------------------------- dots
// bold ring + solid centre: reads as "a dot of colour X" even at 4px radius
function dot(x, cx, cy, r, color) {
  x.fillStyle = color; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
  x.fillStyle = FACE; x.beginPath(); x.arc(cx, cy, r * 0.62, 0, 7); x.fill();
  x.fillStyle = color; x.beginPath(); x.arc(cx, cy, r * 0.38, 0, 7); x.fill();
}
const DOTS = [
  [[60, 84, 46, 'big']],
  [[60, 46, 25, GREEN], [60, 120, 25, BLUE]],
  [[29, 36, 21, BLUE], [60, 83, 21, RED], [91, 130, 21, GREEN]],
  [[33, 50, 23, BLUE], [87, 50, 23, GREEN], [33, 118, 23, GREEN], [87, 118, 23, BLUE]],
  [[31, 40, 20, BLUE], [89, 40, 20, GREEN], [60, 84, 20, RED], [31, 128, 20, GREEN], [89, 128, 20, BLUE]],
  [[34, 37, 19, GREEN], [86, 37, 19, GREEN], [34, 86, 19, RED], [86, 86, 19, RED], [34, 133, 19, RED], [86, 133, 19, RED]],
  [[27, 32, 15, GREEN], [60, 50, 15, GREEN], [93, 68, 15, GREEN], [36, 106, 16, RED], [84, 106, 16, RED], [36, 140, 16, RED], [84, 140, 16, RED]],
  [[36, 29, 16, BLUE], [84, 29, 16, BLUE], [36, 63, 16, BLUE], [84, 63, 16, BLUE], [36, 97, 16, BLUE], [84, 97, 16, BLUE], [36, 131, 16, BLUE], [84, 131, 16, BLUE]],
  [[26, 38, 16, BLUE], [60, 38, 16, BLUE], [94, 38, 16, BLUE], [26, 84, 16, RED], [60, 84, 16, RED], [94, 84, 16, RED], [26, 130, 16, GREEN], [60, 130, 16, GREEN], [94, 130, 16, GREEN]],
];
function drawDots(x, n) {
  for (const [cx, cy, r, c] of DOTS[n - 1]) {
    if (c === 'big') {
      [[r, GREEN], [r * 0.8, FACE], [r * 0.68, RED], [r * 0.5, FACE], [r * 0.38, BLUE], [r * 0.16, FACE]].forEach(([rr, col]) => { x.fillStyle = col; x.beginPath(); x.arc(cx, cy, rr, 0, 7); x.fill(); });
    } else dot(x, cx, cy, r, c);
  }
  corner(x, String(n));
}

// ---------------------------------------------------------------- bamboo
function stick(x, cx, cy, len, color, w = 14) {
  const top = cy - len / 2;
  x.fillStyle = color; x.beginPath(); x.roundRect(cx - w / 2, top, w, len, w / 2); x.fill();
  x.strokeStyle = FACE; x.lineWidth = 2.6;
  x.beginPath(); x.moveTo(cx - w / 2, cy); x.lineTo(cx + w / 2, cy); x.stroke(); // one joint in the middle
}
const BAMBOO = {
  2: [[60, 48, GREEN], [60, 118, BLUE]],
  3: [[60, 48, GREEN], [35, 118, BLUE], [85, 118, BLUE]],
  4: [[37, 48, BLUE], [83, 48, GREEN], [37, 118, GREEN], [83, 118, BLUE]],
  5: [[30, 48, GREEN], [90, 48, BLUE], [60, 83, RED], [30, 118, BLUE], [90, 118, GREEN]],
  6: [[28, 48, GREEN], [60, 48, GREEN], [92, 48, GREEN], [28, 118, BLUE], [60, 118, BLUE], [92, 118, BLUE]],
  7: [[60, 31, RED], [28, 83, GREEN], [60, 83, GREEN], [92, 83, GREEN], [28, 133, GREEN], [60, 133, GREEN], [92, 133, GREEN]],
  8: [[22, 50, GREEN], [46, 50, GREEN], [74, 50, GREEN], [98, 50, GREEN], [22, 118, BLUE], [46, 118, BLUE], [74, 118, BLUE], [98, 118, BLUE]],
  9: [[28, 35, GREEN], [60, 35, RED], [92, 35, BLUE], [28, 83, GREEN], [60, 83, RED], [92, 83, BLUE], [28, 131, GREEN], [60, 131, RED], [92, 131, BLUE]],
};
function drawBamboo(x, n) {
  if (n === 1) zoom(x, 64, 86, 1.14, () => bird(x));
  else {
    const len = n >= 7 ? 44 : 60;
    for (const [cx, cy, c] of BAMBOO[n]) stick(x, cx, cy, len, c, n === 8 ? 13 : n === 5 ? 15 : 16);
  }
  corner(x, String(n));
}
function bird(x) {
  // a little peacock standing on a branch
  x.fillStyle = RED;
  for (let k = -2; k <= 2; k++) { x.save(); x.translate(52, 100); x.rotate(k * 0.32 - 0.4); x.beginPath(); x.ellipse(0, -38, 10, 25, 0, 0, 7); x.fill(); x.restore(); }
  x.fillStyle = BLUE;
  for (let k = -2; k <= 2; k++) { const a = k * 0.32 - 0.4; x.beginPath(); x.arc(52 + Math.sin(a) * 52, 100 - Math.cos(a) * 52, 6, 0, 7); x.fill(); }
  x.fillStyle = GREEN; x.beginPath(); x.ellipse(70, 100, 23, 17, -0.3, 0, 7); x.fill();
  x.beginPath(); x.ellipse(86, 72, 9, 18, 0.25, 0, 7); x.fill();
  x.beginPath(); x.arc(90, 56, 11, 0, 7); x.fill();
  x.fillStyle = '#e8a317'; x.beginPath(); x.moveTo(99, 53); x.lineTo(112, 58); x.lineTo(99, 62); x.fill();
  x.fillStyle = '#fff'; x.beginPath(); x.arc(92, 54, 4, 0, 7); x.fill();
  x.fillStyle = INK; x.beginPath(); x.arc(93, 54, 2.2, 0, 7); x.fill();
  x.strokeStyle = RED; x.lineWidth = 3; x.beginPath(); x.moveTo(88, 46); x.lineTo(84, 38); x.moveTo(91, 46); x.lineTo(92, 37); x.stroke();
  x.strokeStyle = '#6a3c10'; x.lineWidth = 6; x.beginPath(); x.moveTo(30, 126); x.lineTo(104, 120); x.stroke();
  x.strokeStyle = '#d18a00'; x.lineWidth = 3.5; x.beginPath(); x.moveTo(66, 114); x.lineTo(64, 123); x.moveTo(76, 113); x.lineTo(78, 122); x.stroke();
}

// ---------------------------------------------------------------- characters, honors, bonus
function drawChar(x, n) {
  glyph(x, NUMS[n - 1], 62, 50, 64, INK);
  glyph(x, '萬', 60, 119, 68, RED);
  corner(x, String(n));
}
const WINDS = [['東', 'E'], ['南', 'S'], ['西', 'W'], ['北', 'N']];
function drawWind(x, k) { glyph(x, WINDS[k][0], 60, 88, 104, INK); corner(x, WINDS[k][1], BLUE); }
function drawDragon(x, k) {
  if (k === 0) glyph(x, '中', 60, 84, 116, RED);
  else if (k === 1) glyph(x, '發', 60, 86, 104, GREEN);
  else {
    x.strokeStyle = BLUE; x.lineWidth = 10; x.beginPath(); x.roundRect(16, 20, 88, 124, 10); x.stroke();
    x.lineWidth = 5; x.beginPath(); x.roundRect(31, 35, 58, 94, 5); x.stroke();
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
const FLOWERS = [['梅', '#d81b60'], ['蘭', '#7b2fa0'], ['菊', '#d88a00'], ['竹', '#0f6e35']];
function drawFlower(x, k) {
  const [ch, col] = FLOWERS[k];
  zoom(x, 60, 84, 1.12, () => {
    x.strokeStyle = '#5a3a1a'; x.lineWidth = 4; x.beginPath(); x.moveTo(60, 148); x.quadraticCurveTo(50, 110, 60, 76); x.stroke();
    if (k === 3) { for (let j = 0; j < 5; j++) leaf(x, 60, 70 + j * 14, -0.6 - j * 0.15 + (j % 2) * 2.5, 36, col); stick(x, 60, 98, 90, '#1f8a4a', 10); }
    else {
      leaf(x, 56, 118, 2.6, 32, GREEN); leaf(x, 60, 104, -0.5, 30, GREEN);
      blossom(x, 60, 66, 38, k === 2 ? 14 : k === 1 ? 6 : 5, col, '#ffc400');
      if (k === 0) blossom(x, 30, 108, 16, 5, col, '#ffc400');
    }
  });
  glyph(x, ch, 98, 140, 28, RED);
  badge(x, String(k + 1), FLOWER_COL);
}
const SEASONS = [['春', '#1f8a3e'], ['夏', '#d9480f'], ['秋', '#b06a00'], ['冬', '#1f63c4']];
function drawSeason(x, k) {
  const [ch, col] = SEASONS[k];
  zoom(x, 60, 62, 1.3, () => {
    if (k === 0) { leaf(x, 60, 70, -2.2, 32, col); leaf(x, 60, 70, -0.9, 32, col); x.strokeStyle = col; x.lineWidth = 5; x.beginPath(); x.moveTo(60, 70); x.lineTo(60, 92); x.stroke(); }
    else if (k === 1) { x.fillStyle = '#f59f00'; x.beginPath(); x.arc(60, 58, 17, 0, 7); x.fill(); x.strokeStyle = '#f59f00'; x.lineWidth = 5; for (let j = 0; j < 8; j++) { const a = j * Math.PI / 4; x.beginPath(); x.moveTo(60 + Math.cos(a) * 23, 58 + Math.sin(a) * 23); x.lineTo(60 + Math.cos(a) * 30, 58 + Math.sin(a) * 30); x.stroke(); } }
    else if (k === 2) { leaf(x, 40, 76, -0.6, 46, '#c94a00'); leaf(x, 52, 82, -1.6, 34, '#e09b00'); }
    else { x.strokeStyle = col; x.lineWidth = 5; for (let j = 0; j < 3; j++) { const a = j * Math.PI / 3; x.beginPath(); x.moveTo(60 - Math.cos(a) * 26, 60 - Math.sin(a) * 26); x.lineTo(60 + Math.cos(a) * 26, 60 + Math.sin(a) * 26); x.stroke(); } }
  });
  glyph(x, ch, 60, 126, 56, col);
  badge(x, String(k + 1), SEASON_COL);
}

// ---------------------------------------------------------------- picture set
// 42 clearly different pictures (no look-alike faces, no cats). 34-37 = flowers, 38-41 = seasons.
const PICS = ['🍎', '🍊', '🍋', '🍉', '🍇', '🍓', '🍒', '🍑', '🥝', '🍍', '🥥', '🥑', '🍆', '🥕', '🌽', '🍄', '🐶', '🐷',
  '🐭', '🐰', '🦊', '🐻', '🐼', '🐨', '🐳', '🦄', '🐸', '🐵', '🐧', '🐤', '🦋', '🐞', '🐢', '🐙', '🌸', '🌻', '🌷', '🌹', '🌱', '☀️', '🍁', '❄️'];
function drawPic(x, f) {
  const bonus = f >= 34;
  x.font = `${bonus ? 96 : 106}px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(PICS[f], 60, bonus ? 70 : 82);
  if (bonus) {
    x.fillStyle = f < 38 ? FLOWER_COL : SEASON_COL;
    x.beginPath(); x.roundRect(4, 130, 112, 26, 9); x.fill();
    x.fillStyle = '#fff'; x.font = '900 17px system-ui, sans-serif'; x.textBaseline = 'middle';
    x.fillText(f < 38 ? 'FLOWER' : 'SEASON', 60, 144);
  }
}

// ---------------------------------------------------------------- public
// What each face shows, per set (used by tests to make sure every face has a symbol).
export function symbolOf(f, style) {
  if (!(f >= 0 && f < 42)) return null;
  if (style === 'pics') return PICS[f] || null;
  if (f < 9) return DOTS[f] && DOTS[f].length === f + 1 ? `dots ${f + 1}` : null;
  if (f < 18) return f === 9 || (BAMBOO[f - 8] && BAMBOO[f - 8].length === f - 8) ? `bamboo ${f - 8}` : null;
  if (f < 27) return NUMS[f - 18] ? `char ${NUMS[f - 18]}` : null;
  if (f < 31) return WINDS[f - 27] ? `wind ${WINDS[f - 27][0]}` : null;
  if (f < 34) return `dragon ${f - 31}`;
  if (f < 38) return FLOWERS[f - 34] ? `flower ${FLOWERS[f - 34][0]}` : null;
  return SEASONS[f - 38] ? `season ${SEASONS[f - 38][0]}` : null;
}
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
