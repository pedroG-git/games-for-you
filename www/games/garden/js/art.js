// Drawn art: cat portraits and the two renovation scenes (inline SVG strings).
import { PEOPLE } from './data.js';

let uid = 0;

// Inner cat drawing in a 0..100 box (no <svg> wrapper), so scenes can nest it.
function catBody(kind) {
  const id = `cg${++uid}`;
  const mimi = kind === 'mimi';
  const head = mimi ? '#f3e6cf' : '#ffffff';
  const line = mimi ? '#c9b48f' : '#d8d0d8';
  const ear = mimi ? '#5a3f33' : '#ffffff';
  const inner = mimi ? '#8a6656' : '#f7b6c8';
  const eye = mimi ? '#4f9fe0' : '#5fb2ec';
  return `
  <defs><radialGradient id="${id}" cx="50%" cy="62%" r="42%">
    <stop offset="0" stop-color="#5a3f33" stop-opacity=".95"/><stop offset=".55" stop-color="#7a5646" stop-opacity=".75"/><stop offset="1" stop-color="#f3e6cf" stop-opacity="0"/>
  </radialGradient></defs>
  <path d="M16 46 L20 8 L46 30 Z" fill="${ear}" stroke="${line}" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M84 46 L80 8 L54 30 Z" fill="${ear}" stroke="${line}" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M23 36 L24 18 L38 30 Z" fill="${inner}"/>
  <path d="M77 36 L76 18 L62 30 Z" fill="${inner}"/>
  <ellipse cx="50" cy="58" rx="39" ry="33" fill="${head}" stroke="${line}" stroke-width="2.5"/>
  ${mimi ? `<ellipse cx="50" cy="66" rx="24" ry="21" fill="url(#${id})"/>` : ''}
  <ellipse cx="35" cy="54" rx="8" ry="9.5" fill="${eye}"/><ellipse cx="65" cy="54" rx="8" ry="9.5" fill="${eye}"/>
  <ellipse cx="35.5" cy="55" rx="4" ry="6" fill="#1f2433"/><ellipse cx="65.5" cy="55" rx="4" ry="6" fill="#1f2433"/>
  <circle cx="33" cy="51" r="2.6" fill="#fff"/><circle cx="63" cy="51" r="2.6" fill="#fff"/>
  <circle cx="37.5" cy="58" r="1.2" fill="#fff"/><circle cx="67.5" cy="58" r="1.2" fill="#fff"/>
  <path d="M46 66 L54 66 L50 71 Z" fill="${mimi ? '#3d2a22' : '#f48fae'}" stroke-linejoin="round"/>
  <path d="M50 71 Q46 77 41 74 M50 71 Q54 77 59 74" fill="none" stroke="${mimi ? '#3d2a22' : '#9a8a94'}" stroke-width="2" stroke-linecap="round"/>
  <g stroke="${mimi ? '#8a7a6a' : '#b9b1b9'}" stroke-width="1.6" stroke-linecap="round">
    <path d="M28 66 L8 62 M28 70 L9 72 M72 66 L92 62 M72 70 L91 72"/>
  </g>
  ${mimi ? '' : `<ellipse cx="27" cy="66" rx="5" ry="3" fill="#f7b6c8" opacity=".6"/><ellipse cx="73" cy="66" rx="5" ry="3" fill="#f7b6c8" opacity=".6"/>
  <path d="M38 27 L40 15 L45 22 L50 12 L55 22 L60 15 L62 27 Z" fill="#f5c542" stroke="#d49a12" stroke-width="1.6" stroke-linejoin="round"/>
  <circle cx="50" cy="22" r="2" fill="#e86a92"/>`}`;
}

export function catSVG(kind) {
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${catBody(kind)}</svg>`;
}

export function face(who) {
  const p = PEOPLE[who];
  if (!p) return '<span class="face">🙂</span>';
  if (p.face === 'meme' || p.face === 'mimi') return `<span class="face cat">${catSVG(p.face)}</span>`;
  return `<span class="face">${p.face}</span>`;
}

// ---------------------------------------------------------------- helpers
const emo = (x, y, s, e, extra = '') => `<text x="${x}" y="${y}" font-size="${s}" text-anchor="middle" dominant-baseline="central"${extra}>${e}</text>`;
const cat = (kind, x, y, s) => `<svg x="${x}" y="${y}" width="${s}" height="${s}" viewBox="0 0 100 100">${catBody(kind)}</svg>`;
const bunting = (y, x0 = 6, x1 = 354) => {
  const cols = ['#e86a92', '#f5c542', '#7cc6e8', '#8fd18a', '#c99be8'];
  let s = `<path d="M${x0} ${y} Q180 ${y + 18} ${x1} ${y}" fill="none" stroke="#9a7a6a" stroke-width="1.5"/>`;
  const n = 15;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, x = x0 + (x1 - x0) * t, yy = y + 18 * 2 * t * (1 - t);
    s += `<path d="M${x - 8} ${yy} L${x + 8} ${yy} L${x} ${yy + 13} Z" fill="${cols[i % cols.length]}"/>`;
  }
  return s;
};
const confetti = () => {
  const cols = ['#e86a92', '#f5c542', '#7cc6e8', '#8fd18a', '#c99be8'];
  let s = '', seed = 7;
  const r = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 36; i++) s += `<rect x="${(r() * 350).toFixed(1)}" y="${(30 + r() * 200).toFixed(1)}" width="4" height="7" rx="1" fill="${cols[i % 5]}" opacity=".9"/>`;
  return s;
};

function wrap(defs, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 260" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">${defs}${body}</svg>`;
}
function tasks(list, done, fresh) {
  return list.map((t, i) => `<g class="t t${i}${i === fresh ? ' new' : ''}">${done > i ? t[1] : t[0]}</g>`).join('');
}

// ---------------------------------------------------------------- area 0: the flower shop
function shop(done, fresh) {
  const defs = `<defs>
    <linearGradient id="sky0" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe6ff"/><stop offset="1" stop-color="#fdf1f6"/></linearGradient>
    <linearGradient id="grass0" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a8de97"/><stop offset="1" stop-color="#86c977"/></linearGradient>
  </defs>`;
  const base = `
    <rect width="360" height="260" fill="url(#sky0)"/>
    <circle cx="312" cy="38" r="20" fill="#ffe08a"/><circle cx="312" cy="38" r="28" fill="#ffe08a" opacity=".3"/>
    <ellipse cx="60" cy="58" rx="22" ry="8" fill="#fff" opacity=".85"/><ellipse cx="78" cy="53" rx="14" ry="8" fill="#fff" opacity=".85"/>
    <path d="M0 180 Q70 140 150 175 Q240 135 360 172 L360 200 L0 200 Z" fill="#c5e8b5"/>
    <rect y="190" width="360" height="70" fill="url(#grass0)"/>
    <rect x="90" y="80" width="180" height="120" fill="#fde2c8" stroke="#d9b08e" stroke-width="2"/>
    <path d="M78 84 L180 30 L282 84 Z" fill="#e47a8f" stroke="#c45c73" stroke-width="2" stroke-linejoin="round"/>
    <path d="M100 78 L180 37 L260 78" fill="none" stroke="#f19aab" stroke-width="3"/>
    <rect x="160" y="52" width="40" height="20" rx="4" fill="#fbd3db" opacity=".7"/>
    <rect x="86" y="198" width="188" height="6" rx="2" fill="#c9a07e"/>`;
  const list = [
    // 0 weeds
    [`<g fill="#5b6b3a">
        <path d="M20 240 q8-26 14 0 q6-22 12 0 q5-18 10 0Z"/><path d="M118 236 q6-20 10 0 q5-16 9 0Z"/><path d="M290 244 q7-24 12 0 q6-20 11 0Z"/>
      </g>${emo(40, 222, 22, '🥀')}${emo(140, 228, 18, '🥀')}${emo(325, 232, 22, '🥀')}${emo(238, 246, 16, '🥀')}`,
     `${emo(30, 238, 14, '🌱')}${emo(130, 236, 15, '🌼')}${emo(150, 246, 12, '🌱')}${emo(236, 246, 15, '🌼')}${emo(318, 244, 13, '🌱')}${emo(340, 236, 14, '🌼')}`],
    // 1 window
    [`<rect x="110" y="115" width="60" height="45" fill="#8c9399" stroke="#6f767c" stroke-width="3"/>
      <path d="M110 115 L132 137 M110 128 Q120 126 124 118 M110 140 Q128 136 134 115 M170 160 L152 142 M170 148 Q160 150 158 158" stroke="#d6d9dc" stroke-width="1" fill="none"/>`,
     `<rect x="110" y="115" width="60" height="45" fill="#bfe7ff" stroke="#fff" stroke-width="4"/>
      <path d="M140 115 V160 M110 137.5 H170" stroke="#fff" stroke-width="3"/>
      <path d="M116 152 L132 121 L138 121 L122 152 Z" fill="#fff" opacity=".55"/>`],
    // 2 door
    [`<g transform="rotate(6 222 200)"><rect x="200" y="125" width="44" height="75" fill="#8b7b6b" stroke="#6b5d50" stroke-width="2"/>
      <path d="M204 140 H240 M204 160 H240 M204 180 H240" stroke="#75675a" stroke-width="1.5"/></g>
      <rect x="192" y="150" width="60" height="8" rx="2" fill="#a88b6a" transform="rotate(-18 222 154)"/>`,
     `<rect x="200" y="125" width="44" height="75" rx="3" fill="#e86a92" stroke="#c4506f" stroke-width="2"/>
      <rect x="208" y="133" width="28" height="22" rx="3" fill="#bfe7ff" stroke="#fff" stroke-width="2"/>
      <rect x="208" y="163" width="28" height="28" rx="3" fill="none" stroke="#f39bb5" stroke-width="2"/>
      <circle cx="237" cy="166" r="3" fill="#f5c542"/>`],
    // 3 cat corner
    ['',
     `<ellipse cx="274" cy="205" rx="32" ry="6" fill="#f3b7c9" opacity=".8"/>${cat('meme', 244, 172, 34)}${cat('mimi', 270, 175, 32)}`],
    // 4 sign
    [`<rect x="140" y="88" width="80" height="20" rx="2" fill="#b8a895" stroke="#8f8170" stroke-width="2"/>
      <path d="M168 88 L172 96 L166 101 L171 108" stroke="#6f6355" stroke-width="1.5" fill="none"/>`,
     `<rect x="134" y="86" width="92" height="23" rx="5" fill="#fff6e8" stroke="#e86a92" stroke-width="2"/>
      <text x="180" y="98" font-size="11.5" font-weight="800" fill="#e05582" text-anchor="middle" dominant-baseline="central" font-family="Georgia, serif">Joana's Garden</text>`],
    // 5 flower stand
    [`${emo(36, 210, 26, '📦')}${emo(66, 214, 22, '📦')}`,
     `<rect x="16" y="196" width="72" height="10" rx="2" fill="#c98f5a"/><rect x="20" y="206" width="6" height="30" fill="#a8723f"/><rect x="78" y="206" width="6" height="30" fill="#a8723f"/>
      <rect x="22" y="214" width="60" height="6" fill="#d9a774"/>
      ${emo(32, 184, 22, '💐')}${emo(53, 186, 20, '🌷')}${emo(73, 184, 22, '🌻')}`],
    // 6 hanging baskets
    ['<circle cx="96" cy="82" r="2" fill="#8a6f5a"/><circle cx="264" cy="82" r="2" fill="#8a6f5a"/>',
     `<path d="M96 82 V100 M264 82 V100" stroke="#8a6f5a" stroke-width="1.5"/>${emo(96, 108, 20, '🌺')}${emo(264, 108, 20, '🌺')}`],
    // 7 bench
    [`${emo(318, 222, 28, '🪵')}`,
     `<rect x="298" y="192" width="58" height="7" rx="2" fill="#c98f5a"/><rect x="298" y="202" width="58" height="7" rx="2" fill="#c98f5a"/>
      <rect x="294" y="214" width="66" height="7" rx="2" fill="#b07a47"/>
      <rect x="300" y="221" width="5" height="18" fill="#8a5a33"/><rect x="350" y="221" width="5" height="18" fill="#8a5a33"/>
      <rect x="301" y="190" width="4" height="26" fill="#8a5a33"/><rect x="349" y="190" width="4" height="26" fill="#8a5a33"/>`],
    // 8 window boxes
    ['<rect x="106" y="160" width="68" height="10" rx="2" fill="#a8723f"/>',
     `${emo(122, 156, 13, '🌷')}${emo(140, 155, 13, '🌷')}${emo(158, 156, 13, '🌷')}<rect x="106" y="160" width="68" height="10" rx="2" fill="#c98f5a" stroke="#a8723f" stroke-width="1.5"/>`],
    // 9 grand reopening
    ['',
     `${bunting(10)}${emo(24, 120, 24, '🎈')}${emo(340, 128, 22, '🎈')}
      <path d="M215 150 L222 142 L229 150" stroke="#8a6f5a" stroke-width="1" fill="none"/>
      <rect x="208" y="150" width="28" height="12" rx="2" fill="#fff" stroke="#8fd18a" stroke-width="1.5"/>
      <text x="222" y="156.5" font-size="7.5" font-weight="800" fill="#4a9a4f" text-anchor="middle" dominant-baseline="central">OPEN</text>`],
  ];
  return wrap(defs, base + tasks(list, done, fresh));
}

// ---------------------------------------------------------------- area 1: the secret garden
function garden(done, fresh) {
  const defs = `<defs>
    <linearGradient id="sky1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c7e3ff"/><stop offset="1" stop-color="#fbeef6"/></linearGradient>
    <linearGradient id="lawn1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b6e3a3"/><stop offset="1" stop-color="#8ccd7c"/></linearGradient>
    <radialGradient id="glow1"><stop offset="0" stop-color="#fff6b0"/><stop offset="1" stop-color="#ffd84a" stop-opacity="0"/></radialGradient>
  </defs>`;
  let hedge = '';
  for (let x = 10; x < 360; x += 24) hedge += `<circle cx="${x}" cy="70" r="15" fill="#4f9a55"/>`;
  const base = `
    <rect width="360" height="260" fill="url(#sky1)"/>
    <rect y="68" width="360" height="192" fill="url(#lawn1)"/>
    ${hedge}<rect y="68" width="360" height="40" fill="#4f9a55"/>
    <path d="M0 108 Q180 118 360 108" fill="#5fae64"/>
    <rect x="0" y="60" width="22" height="200" fill="#3f8a4a"/><rect x="338" y="60" width="22" height="200" fill="#3f8a4a"/>
    <circle cx="11" cy="60" r="12" fill="#3f8a4a"/><circle cx="349" cy="60" r="12" fill="#3f8a4a"/>
    <rect x="158" y="56" width="44" height="54" rx="20" fill="#2f6e3a"/>`;
  const stones = [[180, 124], [172, 136], [186, 208], [176, 222], [184, 238], [178, 252]];
  const list = [
    // 0 gate
    [`<g stroke="#8a5a3a" stroke-width="3">${[164, 172, 180, 188, 196].map((x) => `<path d="M${x} 66 V108"/>`).join('')}<path d="M160 74 H200 M160 98 H200"/></g>${emo(180, 88, 14, '🔒')}`,
     `<g stroke="#4a4a4a" stroke-width="2.5"><path d="M160 68 L148 74 V112 L160 108 Z" fill="none"/><path d="M200 68 L212 74 V112 L200 108 Z" fill="none"/>
      <path d="M154 72 V110 M206 72 V110"/></g>${cat('meme', 206, 92, 26)}`],
    // 1 brambles
    [`<g fill="#3d5a3a">${[[60, 130], [128, 215], [250, 212], [305, 132], [212, 238]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="22" ry="12"/><ellipse cx="${x - 10}" cy="${y - 6}" rx="12" ry="9"/><ellipse cx="${x + 10}" cy="${y - 7}" rx="12" ry="9"/>`).join('')}</g>
      <g stroke="#a33a3a" stroke-width="1.5">${[[60, 130], [128, 215], [250, 212], [305, 132], [212, 238]].map(([x, y]) => `<path d="M${x - 14} ${y - 8} l-4 -4 M${x + 6} ${y - 14} l2 -5 M${x + 16} ${y - 4} l5 -2"/>`).join('')}</g>`,
     `${emo(122, 182, 12, '🌼')}${emo(126, 226, 12, '🌼')}${emo(242, 186, 11, '🌱')}${emo(316, 196, 12, '🌼')}${emo(214, 248, 11, '🌱')}${emo(140, 120, 10, '🌱')}`],
    // 2 path
    [`${emo(170, 128, 14, '🪨')}${emo(196, 214, 16, '🪨')}${emo(164, 236, 13, '🪨')}${emo(190, 252, 12, '🪨')}`,
     stones.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="11" ry="5" fill="#c9c6c0" stroke="#a8a49c" stroke-width="1"/>`).join('')],
    // 3 fountain
    [`${emo(170, 182, 22, '🪨')}${emo(192, 186, 18, '🪨')}${emo(182, 168, 14, '🪨')}<path d="M160 196 L172 188 L168 182 L178 176" stroke="#7a6a5a" stroke-width="1.5" fill="none"/>`,
     `<ellipse cx="180" cy="190" rx="32" ry="9" fill="#c9c6c0" stroke="#a8a49c" stroke-width="1.5"/>
      <ellipse cx="180" cy="188" rx="27" ry="6" fill="#8fd0f2"/>
      <rect x="176" y="160" width="8" height="28" fill="#dedad3"/>
      <ellipse cx="180" cy="160" rx="16" ry="4.5" fill="#dedad3" stroke="#b8b4ac" stroke-width="1"/>
      <path d="M180 150 Q168 152 164 170 M180 150 Q192 152 196 170 M180 150 Q180 142 180 140" stroke="#6fbbe8" stroke-width="2" fill="none" stroke-linecap="round"/>
      <circle cx="180" cy="139" r="2.5" fill="#bfe7ff"/>${emo(204, 150, 9, '✨')}`],
    // 4 greenhouse
    [`${emo(56, 156, 20, '🧱')}${emo(84, 160, 18, '🧱')}<path d="M44 140 l8 -6 l2 8Z M96 142 l6 4 l-7 3Z M70 138 l4 -7 l4 6Z" fill="#cfe8f5" stroke="#9cc3d8" stroke-width="1"/>`,
     `<path d="M32 170 V128 L70 104 L108 128 V170 Z" fill="#d9f0fb" fill-opacity=".6" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>
      <path d="M51 170 V116 M70 170 V104 M89 170 V116 M32 148 H108" stroke="#fff" stroke-width="2"/>
      ${emo(42, 160, 11, '🌷')}${emo(60, 160, 11, '🌷')}${emo(80, 160, 11, '🌷')}${emo(98, 160, 11, '🌷')}${emo(70, 138, 11, '🌷')}`],
    // 5 rose arch
    [`<path d="M46 236 L52 196 M94 236 L88 198" stroke="#8a5a3a" stroke-width="3" stroke-linecap="round"/>`,
     `<g transform="translate(0 8)"><path d="M44 236 V196 Q70 156 96 196 V236" fill="none" stroke="#7a5a3a" stroke-width="4"/>
      <path d="M44 236 V196 Q70 156 96 196 V236" fill="none" stroke="#5fae64" stroke-width="2" stroke-dasharray="3 5"/>
      ${[[44, 226], [44, 206], [50, 186], [62, 172], [78, 172], [90, 186], [96, 206], [96, 226]].map(([x, y]) => emo(x, y, 12, '🌹')).join('')}</g>`],
    // 6 fairy lights
    ['',
     `<path d="M22 44 Q100 76 180 48 Q260 76 338 44" fill="none" stroke="#6a5a4a" stroke-width="1"/>
      ${[[40, 52], [70, 60], [100, 62], [130, 58], [158, 52], [202, 52], [230, 58], [260, 62], [290, 60], [320, 52]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="url(#glow1)"/><circle cx="${x}" cy="${y}" r="2.3" fill="#ffe36a"/>`).join('')}`],
    // 7 tea table
    ['',
     `<ellipse cx="285" cy="214" rx="32" ry="7" fill="#fff" stroke="#e8cdd6" stroke-width="1.5"/>
      <rect x="282" y="218" width="6" height="22" fill="#d9c2a8"/><ellipse cx="285" cy="240" rx="14" ry="3" fill="#c9b094"/>
      ${emo(266, 203, 15, '🫖')}${emo(287, 205, 13, '🍰')}${emo(305, 205, 12, '☕')}`],
    // 8 gazebo
    [`${emo(282, 154, 22, '🪵')}${emo(308, 158, 20, '🪵')}`,
     `<path d="M250 112 L295 84 L340 112 Z" fill="#f2a3b8" stroke="#d97a96" stroke-width="2" stroke-linejoin="round"/>
      <rect x="252" y="112" width="86" height="6" rx="2" fill="#fff"/>
      <rect x="258" y="118" width="5" height="50" fill="#fff" stroke="#e6e0e6"/><rect x="292" y="118" width="5" height="50" fill="#fff" stroke="#e6e0e6"/><rect x="327" y="118" width="5" height="50" fill="#fff" stroke="#e6e0e6"/>
      <rect x="250" y="166" width="90" height="6" rx="2" fill="#efe6e9"/>
      <path d="M263 124 Q278 132 292 124 M297 124 Q312 132 327 124" stroke="#fbd3db" stroke-width="2" fill="none"/>`],
    // 9 party
    ['',
     `${bunting(18, 26, 334)}${emo(30, 150, 20, '🎈')}${emo(326, 196, 18, '🎈')}${emo(140, 150, 16, '🎈')}
      ${emo(281, 146, 20, '👴')}${emo(310, 146, 20, '👵')}${emo(296, 134, 11, '💍')}${emo(324, 156, 13, '💐')}${confetti()}`],
  ];
  return wrap(defs, base + tasks(list, done, fresh));
}

export function scene(area, done, fresh = -1) {
  return area === 0 ? shop(done, fresh) : garden(done, fresh);
}
