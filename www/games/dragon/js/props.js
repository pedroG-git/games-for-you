// Fortress pictures: one SVG symbol per thing you build (viewBox 0 0 100 100, standing on the bottom edge).
// Same style as the board art: dark outline, soft gradient, a white shine.
const O = '#2b160a';
const S = (w = 3) => `stroke="${O}" stroke-width="${w}" stroke-linejoin="round"`;
const lg = (id, stops, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
const rg = (id, stops) =>
  `<radialGradient id="${id}" cx=".5" cy=".5" r=".5">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</radialGradient>`;
const shine = (x, y, w, h, r = h / 2, o = 0.35) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="#fff" opacity="${o}"/>`;
const glow = (x, y, r, c = 'pGlowY') => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${c})"/>`;
const sparkle = (x, y, r, c = '#fff') => `<path d="M${x} ${y - r}Q${x + r * .2} ${y - r * .2} ${x + r} ${y}Q${x + r * .2} ${y + r * .2} ${x} ${y + r}Q${x - r * .2} ${y + r * .2} ${x - r} ${y}Q${x - r * .2} ${y - r * .2} ${x} ${y - r}Z" fill="${c}"/>`;
const n = (v) => +v.toFixed(1);
const flameD = (x, y, w, h) =>
  `M${n(x)} ${n(y - h)}C${n(x + w * .25)} ${n(y - h * .7)} ${n(x + w)} ${n(y - h * .5)} ${n(x + w * .9)} ${n(y - h * .22)}` +
  `C${n(x + w * .8)} ${n(y + h * .04)} ${n(x - w * .8)} ${n(y + h * .04)} ${n(x - w * .9)} ${n(y - h * .22)}` +
  `C${n(x - w)} ${n(y - h * .5)} ${n(x - w * .25)} ${n(y - h * .7)} ${n(x)} ${n(y - h)}Z`;
const flame = (x, y, w, h) =>
  `<path d="${flameD(x, y, w, h)}" fill="url(#pFlame)" stroke="#9a2a06" stroke-width="2.5" stroke-linejoin="round"/>` +
  `<path d="${flameD(x, y - h * .05, w * .5, h * .55)}" fill="#fff3a0"/>`;
const sym = (id, body) => `<symbol id="p-${id}" viewBox="0 0 100 100">${body}</symbol>`;

const defs = [
  lg('pWood', [[0, '#e0a868'], [1, '#8a4f1f']]),
  lg('pWoodD', [[0, '#a8672e'], [1, '#5a2f10']]),
  lg('pStone', [[0, '#c9d0db'], [1, '#6b7486']]),
  lg('pStoneW', [[0, '#d8c9b4'], [1, '#8a7660']]),
  lg('pIron', [[0, '#e3e8ef'], [1, '#6b7686']]),
  lg('pIronD', [[0, '#7a8494'], [1, '#2f3644']]),
  lg('pGold', [[0, '#fff3a8'], [0.45, '#ffc93a'], [1, '#c27200']]),
  lg('pFlame', [[0, '#ffe066'], [0.5, '#ff8a1a'], [1, '#ff3a1a']]),
  lg('pLeaf', [[0, '#7ad86a'], [1, '#1f6a3a']]),
  lg('pRed', [[0, '#ff6a6a'], [1, '#b01e30']]),
  lg('pBlue', [[0, '#6ab0ff'], [1, '#1f4ab0']]),
  lg('pGreen', [[0, '#6ae08a'], [1, '#14804a']]),
  lg('pPurple', [[0, '#b67bff'], [1, '#4a1f8a']]),
  lg('pParch', [[0, '#fff5dc'], [1, '#dcb87a']]),
  lg('pCream', [[0, '#fffaf0'], [1, '#e8cf9a']]),
  lg('pLeather', [[0, '#c0703a'], [1, '#6a2e10']]),
  lg('pCrystal', [[0, '#e0fdff'], [0.5, '#5ad8f0'], [1, '#1a5a9a']]),
  lg('pNight', [[0, '#1a2a6a'], [1, '#3a1a6a']]),
  lg('pWater', [[0, '#bff4ff'], [1, '#3a9ae0']]),
  lg('pWing', [[0, '#ffffff'], [1, '#b8dcff']]),
  lg('pDragon', [[0, '#a874ff'], [1, '#5a24b0']]),
  lg('pMembrane', [[0, '#ffd28a'], [1, '#ff7a3d']]),
  lg('pEggG', [[0, '#fff2a0'], [0.55, '#ffae2a'], [1, '#c2480a']]),
  rg('pGlowY', [[0, '#ffd85a', 0.75], [1, '#ffb020', 0]]),
  rg('pGlowC', [[0, '#8af6ff', 0.8], [1, '#3ad8ff', 0]]),
  rg('pGlowP', [[0, '#e0a0ff', 0.8], [1, '#9a4aff', 0]]),
  rg('pGlowG', [[0, '#a0ffb0', 0.7], [1, '#3ae080', 0]]),
  `<radialGradient id="pOrb" cx=".38" cy=".34" r=".7"><stop offset="0" stop-color="#ffffff"/><stop offset=".25" stop-color="#e4c2ff"/><stop offset=".7" stop-color="#8a3dff"/><stop offset="1" stop-color="#3a0a7a"/></radialGradient>`,
].join('');

// ---- little parts used by several pictures ----
const stone = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="url(#pStone)" ${S()}/>` +
  shine(x + 4, y + 3, w - 8, 4, 2, 0.4);
function pine(x, base, w, h) {
  let s = `<rect x="${x - w * .08}" y="${base - h * .2}" width="${w * .16}" height="${h * .2}" fill="url(#pWoodD)" ${S(2.5)}/>`;
  for (let k = 0; k < 3; k++) {
    const top = base - h + k * h * .22, bot = top + h * .42, hw = w * (.28 + k * .12);
    s += `<path d="M${n(x)} ${n(top)}L${n(x + hw)} ${n(bot)}Q${n(x)} ${n(bot - h * .06)} ${n(x - hw)} ${n(bot)}Z" fill="url(#pLeaf)" ${S(2.5)}/>`;
    s += `<path d="M${n(x)} ${n(top + 3)}L${n(x - hw * .5)} ${n(bot - h * .08)}" stroke="#c8ffb0" stroke-width="2.5" opacity=".6" stroke-linecap="round"/>`;
  }
  return s;
}
const sword = (tx, ty, rot) => `<g transform="translate(${tx} ${ty}) rotate(${rot})">
  <polygon points="0,-46 6,-38 6,16 -6,16 -6,-38" fill="url(#pIron)" ${S(2.5)}/><path d="M0 -40V12" stroke="#fff" stroke-width="2" opacity=".6"/>
  <rect x="-15" y="15" width="30" height="7" rx="3" fill="url(#pGold)" ${S(2.5)}/>
  <rect x="-4" y="22" width="8" height="16" rx="2" fill="url(#pLeather)" ${S(2.5)}/>
  <circle cx="0" cy="42" r="5" fill="url(#pGold)" ${S(2.5)}/></g>`;
const candle = (x, top, w, base) => `<rect x="${x - w / 2}" y="${top}" width="${w}" height="${base - top}" rx="2" fill="url(#pCream)" ${S(2.5)}/>` +
  `<path d="M${x - w / 2 + 1} ${top + 4}q3 6 5 0" stroke="#fffaf0" stroke-width="3" fill="none"/>` +
  `<path d="M${x} ${top}v-4" stroke="${O}" stroke-width="2"/>` + flame(x, top - 3, w * .42, w * 1.5);
function crystal(x, base, w, h, fill, rot = 0) {
  const t = base - h;
  return `<g transform="rotate(${rot} ${x} ${base})"><polygon points="${x - w / 2},${base} ${x - w / 2},${t + w * .5} ${x},${t} ${x + w / 2},${t + w * .5} ${x + w / 2},${base}" fill="${fill}" ${S(2.5)}/>` +
    `<polygon points="${x - w / 2},${t + w * .5} ${x},${t} ${x - w * .08},${base}" fill="#fff" opacity=".35"/>` +
    `<polygon points="${x + w / 2},${t + w * .5} ${x},${t} ${x + w * .1},${base} ${x + w / 2},${base}" fill="#000" opacity=".18"/></g>`;
}
const coin = (x, y, r = 6) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * .55}" fill="url(#pGold)" ${S(2)}/>`;
const gemDot = (x, y, r, c) => `<polygon points="${x},${y - r} ${x + r},${y} ${x},${y + r} ${x - r},${y}" fill="${c}" ${S(2)}/><polygon points="${x},${y - r} ${x - r},${y} ${x},${y}" fill="#fff" opacity=".45"/>`;
const crownShape = (x, y, w) => {
  const k = w / 100;
  const p = (px, py) => `${n(x + (px - 50) * k)},${n(y + py * k)}`;
  return `<polygon points="${p(10, 80)} ${p(6, 28)} ${p(28, 50)} ${p(50, 16)} ${p(72, 50)} ${p(94, 28)} ${p(90, 80)}" fill="url(#pGold)" ${S(3)}/>` +
    `<rect x="${n(x - 41 * k)}" y="${n(y + 68 * k)}" width="${n(82 * k)}" height="${n(16 * k)}" rx="${n(3 * k)}" fill="#e09a10" ${S(3)}/>` +
    [[6, 28], [50, 16], [94, 28]].map(([a, b]) => `<circle cx="${n(x + (a - 50) * k)}" cy="${n(y + b * k)}" r="${n(6 * k)}" fill="url(#pGold)" ${S(2.5)}/>`).join('') +
    gemDot(n(x - 22 * k), n(y + 76 * k), n(6 * k), '#ff3b5c') + gemDot(x, n(y + 76 * k), n(7 * k), '#3d8bff') + gemDot(n(x + 22 * k), n(y + 76 * k), n(6 * k), '#2ed47a') +
    `<path d="M${p(16, 64)}L${p(14, 40)}" stroke="#fff" stroke-width="${n(4 * k)}" opacity=".5" stroke-linecap="round"/>`;
};
const lantern = (x, y, w, c) => `<path d="M${x} ${y - w * .9}V${y - w * 1.3}" stroke="${O}" stroke-width="2"/>` + glow(x, y, w * 1.5) +
  `<rect x="${x - w * .5}" y="${y - w * .95}" width="${w}" height="${w * .25}" rx="2" fill="#4a2a0e" ${S(2)}/>` +
  `<rect x="${x - w * .5}" y="${y + w * .7}" width="${w}" height="${w * .25}" rx="2" fill="#4a2a0e" ${S(2)}/>` +
  `<ellipse cx="${x}" cy="${y}" rx="${w * .75}" ry="${w * .8}" fill="${c}" ${S(2.5)}/>` +
  `<path d="M${x - w * .3} ${y - w * .72}Q${x - w * .5} ${y} ${x - w * .3} ${y + w * .72}M${x + w * .3} ${y - w * .72}Q${x + w * .5} ${y} ${x + w * .3} ${y + w * .72}" stroke="${O}" stroke-width="1.5" fill="none" opacity=".45"/>` +
  `<ellipse cx="${x - w * .3}" cy="${y - w * .3}" rx="${w * .16}" ry="${w * .3}" fill="#fff" opacity=".5"/>`;

const P = {};

// ===== The Old Gate =====
P.rubble = stone(8, 68, 28, 26) + stone(36, 68, 28, 26) + stone(64, 68, 28, 26) + stone(22, 42, 28, 26) + stone(50, 42, 28, 26) + stone(36, 16, 28, 26) +
  `<path d="M50 80l6 6M28 52l4 6M76 76l-5 7" stroke="${O}" stroke-width="2" opacity=".5" fill="none"/>` +
  `<path d="M60 18l-4 8" stroke="${O}" stroke-width="2" opacity=".4"/>`;
P.gate = `<path d="M6 98V44A44 44 0 0 1 94 44V98Z" fill="url(#pStone)" ${S()}/>
  <path d="M6 64H20M80 64H94M6 82H20M80 82H94M10 30L22 38M90 30L78 38M30 10L36 22M70 10L64 22" stroke="${O}" stroke-width="2" opacity=".45"/>
  <polygon points="42,0 58,0 60,15 40,15" fill="url(#pStone)" ${S(2.5)}/>
  <path d="M20 98V48A30 30 0 0 1 80 48V98Z" fill="url(#pWood)" ${S()}/>
  <path d="M35 21V98M65 21V98" stroke="#7a4317" stroke-width="2" opacity=".6"/><path d="M50 18V98" stroke="${O}" stroke-width="3"/>
  <rect x="20" y="54" width="60" height="7" fill="url(#pIronD)" ${S(2)}/><rect x="20" y="80" width="60" height="7" fill="url(#pIronD)" ${S(2)}/>
  <circle cx="44" cy="70" r="4.5" fill="none" stroke="url(#pGold)" stroke-width="3"/><circle cx="56" cy="70" r="4.5" fill="none" stroke="url(#pGold)" stroke-width="3"/>
  ${shine(24, 30, 4, 20, 2, 0.3)}`;
P.torch = glow(50, 26, 26) + `<rect x="45" y="50" width="10" height="47" rx="3" fill="url(#pWoodD)" ${S()}/>
  <rect x="44" y="64" width="12" height="5" fill="url(#pIronD)" ${S(2)}/>
  <polygon points="32,40 68,40 61,54 39,54" fill="url(#pIronD)" ${S()}/>${shine(36, 42, 26, 3, 1.5, 0.4)}` + flame(50, 42, 17, 40);
P.banner = `<path d="M24 12Q46 4 66 12T96 14L87 32L96 50Q74 44 52 52T24 52Z" fill="url(#pPurple)" ${S()}/>
  <path d="M28 18Q46 12 64 18" stroke="#fff" stroke-width="3" opacity=".4" fill="none" stroke-linecap="round"/>
  <circle cx="56" cy="31" r="10" fill="url(#pGold)" ${S(2.5)}/>${flame(56, 38, 5.5, 13)}
  <rect x="17" y="6" width="7" height="91" rx="3" fill="url(#pWoodD)" ${S()}/><circle cx="20.5" cy="6" r="5" fill="url(#pGold)" ${S(2.5)}/>`;
P.pines = pine(68, 96, 46, 74) + pine(36, 97, 62, 94);
P.rune = glow(50, 50, 40, 'pGlowC') + `<path d="M28 97L23 32Q27 7 50 5Q73 7 77 32L72 97Z" fill="url(#pStone)" ${S()}/>
  <path d="M30 30Q34 14 48 11" stroke="#fff" stroke-width="3" opacity=".45" fill="none" stroke-linecap="round"/>
  <path d="M41 28L50 38L59 28M50 38V50M40 60L48 68L40 76M58 60V80M58 69L65 63" stroke="#5ae6ff" stroke-width="8" opacity=".35" fill="none" stroke-linecap="round"/>
  <path d="M41 28L50 38L59 28M50 38V50M40 60L48 68L40 76M58 60V80M58 69L65 63" stroke="#c8faff" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <ellipse cx="34" cy="94" rx="12" ry="5" fill="#4aa84a" ${S(2)}/><ellipse cx="64" cy="95" rx="10" ry="4" fill="#4aa84a" ${S(2)}/>`;

// ===== Training Yard =====
P.broom = `<path d="M76 4L42 66" stroke="${O}" stroke-width="10" stroke-linecap="round"/><path d="M76 4L42 66" stroke="url(#pWood)" stroke-width="5" stroke-linecap="round"/>
  <path d="M36 58L54 68L50 96L10 90Z" fill="#f2c95a" ${S()}/>
  <path d="M40 66L24 90M45 68L34 93M50 70L44 95" stroke="#b8862a" stroke-width="2" fill="none"/>
  <path d="M35 60L53 70" stroke="#c22a1e" stroke-width="7" stroke-linecap="round"/>`;
P.rack = `<rect x="12" y="20" width="9" height="77" rx="3" fill="url(#pWoodD)" ${S()}/><rect x="79" y="20" width="9" height="77" rx="3" fill="url(#pWoodD)" ${S()}/>
  <rect x="8" y="24" width="84" height="9" rx="3" fill="url(#pWood)" ${S()}/><rect x="8" y="78" width="84" height="8" rx="3" fill="url(#pWood)" ${S()}/>` +
  sword(37, 52, -14) + sword(63, 52, 14);
P.target = `<path d="M50 50L24 97M50 50L76 97M50 50L50 97" stroke="${O}" stroke-width="8" stroke-linecap="round"/><path d="M50 50L24 97M50 50L76 97" stroke="url(#pWood)" stroke-width="4" stroke-linecap="round"/>
  <circle cx="50" cy="44" r="38" fill="#fff6e8" ${S()}/><circle cx="50" cy="44" r="30" fill="#e8343a" ${S(2)}/>
  <circle cx="50" cy="44" r="21" fill="#fff6e8" ${S(2)}/><circle cx="50" cy="44" r="12" fill="#e8343a" ${S(2)}/><circle cx="50" cy="44" r="5" fill="url(#pGold)" ${S(2)}/>
  <path d="M24 26Q34 14 48 12" stroke="#fff" stroke-width="4" opacity=".6" fill="none" stroke-linecap="round"/>
  <path d="M51 43L86 18" stroke="${O}" stroke-width="5" stroke-linecap="round"/><path d="M51 43L86 18" stroke="#c88a4a" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M82 21L84 10L92 14ZM86 18L97 18L92 25Z" fill="#3d8bff" ${S(2)}/>`;
P.shield = `<defs><clipPath id="pShc"><path d="M50 8L86 18Q88 62 50 92Q12 62 14 18Z"/></clipPath></defs>
  <path d="M50 4L90 15Q92 64 50 97Q8 64 10 15Z" fill="url(#pGold)" ${S()}/>
  <path d="M50 8L86 18Q88 62 50 92Q12 62 14 18Z" fill="url(#pPurple)"/>
  <g clip-path="url(#pShc)" fill="none" stroke="#d6b0ff" stroke-width="2.5" opacity=".7">${
    Array.from({ length: 8 }, (_, r) => Array.from({ length: 7 }, (_, c) => `<path d="M${c * 14 + (r % 2) * 7 - 2} ${r * 11 + 18}q7 8 14 0"/>`).join('')).join('')}</g>
  <path d="M50 8L86 18Q88 62 50 92Q12 62 14 18Z" fill="none" ${S(2)}/>
  <circle cx="50" cy="44" r="11" fill="url(#pGold)" ${S(2.5)}/>${gemDot(50, 44, 6, '#ff3b5c')}
  <path d="M20 22L36 17" stroke="#fff" stroke-width="4" opacity=".5" stroke-linecap="round"/>`;
P.saddle = `<path d="M18 56L10 97M82 56L90 97M30 58L26 97M70 58L74 97" stroke="${O}" stroke-width="8" stroke-linecap="round"/>
  <path d="M18 56L10 97M82 56L90 97M30 58L26 97M70 58L74 97" stroke="url(#pWood)" stroke-width="4" stroke-linecap="round"/>
  <rect x="8" y="52" width="84" height="9" rx="3" fill="url(#pWood)" ${S()}/>
  <path d="M30 62V82M70 62V82" stroke="#5a2a0e" stroke-width="3.5"/>
  <path d="M24 82H36L34 90H26Z M64 82H76L74 90H66Z" fill="url(#pIron)" ${S(2.5)}/>
  <path d="M10 46Q26 34 50 42Q70 32 90 44L84 64Q50 72 16 64Z" fill="url(#pLeather)" ${S()}/>
  <path d="M8 46Q4 28 18 26Q24 34 22 44Z" fill="url(#pLeather)" ${S()}/>
  <path d="M18 60Q50 66 82 58" stroke="#ffd28a" stroke-width="2" stroke-dasharray="4 4" fill="none"/>
  <path d="M30 42Q46 38 58 42" stroke="#fff" stroke-width="3.5" opacity=".35" fill="none" stroke-linecap="round"/>
  <circle cx="50" cy="52" r="5" fill="url(#pGold)" ${S(2)}/>`;
P.bell = `<rect x="14" y="16" width="9" height="81" rx="3" fill="url(#pWoodD)" ${S()}/><rect x="77" y="16" width="9" height="81" rx="3" fill="url(#pWoodD)" ${S()}/>
  <rect x="6" y="10" width="88" height="11" rx="4" fill="url(#pWood)" ${S()}/>
  <path d="M50 21V30" stroke="${O}" stroke-width="4"/>
  <path d="M30 72Q29 34 50 30Q71 34 70 72L77 80H23Z" fill="url(#pGold)" ${S()}/>
  <path d="M28 70H72" stroke="${O}" stroke-width="2" opacity=".5"/>
  <circle cx="50" cy="85" r="6" fill="url(#pGold)" ${S(2.5)}/>
  <path d="M38 40Q36 54 36 66" stroke="#fff" stroke-width="4" opacity=".55" fill="none" stroke-linecap="round"/>`;

// ===== The Library =====
{
  const cols = ['#c22a3a', '#2f6ad8', '#22a05a', '#e09a10', '#8a3dd8', '#d85a2a', '#1a8a8a', '#c23a8a'];
  let books = '', k = 0;
  for (const [top, base] of [[14, 38], [42, 64], [68, 90]]) {
    let x = 17;
    while (x < 80) {
      const w = 6 + ((k * 7) % 4), h = base - top - 2 - ((k * 5) % 6), c = cols[k % cols.length];
      if (x + w > 83) break;
      books += `<rect x="${x}" y="${base - h}" width="${w}" height="${h}" rx="1" fill="${c}" ${S(1.8)}/><rect x="${x + 1.5}" y="${base - h + 3}" width="${w - 3}" height="2" fill="#ffd85a" opacity=".8"/>`;
      x += w + 1; k++;
    }
  }
  P.books = `<rect x="10" y="6" width="80" height="91" rx="4" fill="url(#pWoodD)" ${S()}/><rect x="15" y="12" width="70" height="80" fill="#3a1e0a"/>` + books +
    `<rect x="12" y="37" width="76" height="5" fill="url(#pWood)" ${S(2)}/><rect x="12" y="63" width="76" height="5" fill="url(#pWood)" ${S(2)}/><rect x="12" y="89" width="76" height="6" fill="url(#pWood)" ${S(2)}/>`;
}
P.candles = glow(50, 34, 40) + candle(30, 52, 12, 88) + candle(70, 58, 12, 88) + candle(50, 34, 13, 88) +
  `<ellipse cx="50" cy="90" rx="34" ry="7" fill="url(#pGold)" ${S()}/><ellipse cx="44" cy="88" rx="16" ry="2" fill="#fff" opacity=".45"/>`;
P.desk = `<rect x="12" y="58" width="8" height="39" fill="url(#pWoodD)" ${S()}/><rect x="80" y="58" width="8" height="39" fill="url(#pWoodD)" ${S()}/>
  <rect x="24" y="62" width="52" height="14" rx="2" fill="url(#pWoodD)" ${S(2.5)}/><circle cx="50" cy="69" r="2.5" fill="url(#pGold)"/>
  <rect x="4" y="50" width="92" height="10" rx="3" fill="url(#pWood)" ${S()}/>${shine(8, 52, 80, 3, 1.5, 0.35)}
  <path d="M20 50Q20 30 50 38Q80 30 80 50Z" fill="#fffaf0" ${S(2.5)}/><path d="M50 38V50" stroke="${O}" stroke-width="2"/>
  <path d="M27 42H44M27 46H44M56 42H73M56 46H73" stroke="#8a7660" stroke-width="1.6"/>
  <path d="M18 50Q34 44 50 50Q66 44 82 50" stroke="#c22a3a" stroke-width="3" fill="none"/>
  <ellipse cx="87" cy="45" rx="6" ry="5" fill="#2a2a4a" ${S(2)}/><path d="M86 42L98 18" stroke="${O}" stroke-width="2"/><path d="M96 20Q92 30 88 40Q96 30 98 18Z" fill="#fff" ${S(1.5)}/>`;
P.scroll = `<rect x="18" y="22" width="64" height="58" fill="url(#pParch)" ${S()}/>
  <path d="M28 66Q38 50 50 58T70 36" stroke="#c22a3a" stroke-width="2.5" stroke-dasharray="4 3" fill="none"/>
  <path d="M66 32L74 40M74 32L66 40" stroke="#c22a3a" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M26 46L32 38L38 46ZM34 46L40 36L46 46Z" fill="#8a7660"/><circle cx="58" cy="70" r="4" fill="none" stroke="#3d8bff" stroke-width="2"/>
  <rect x="8" y="16" width="14" height="70" rx="7" fill="url(#pParch)" ${S()}/><rect x="78" y="16" width="14" height="70" rx="7" fill="url(#pParch)" ${S()}/>
  <rect x="11" y="10" width="8" height="8" rx="2" fill="url(#pWoodD)" ${S(2)}/><rect x="11" y="84" width="8" height="8" rx="2" fill="url(#pWoodD)" ${S(2)}/>
  <rect x="81" y="10" width="8" height="8" rx="2" fill="url(#pWoodD)" ${S(2)}/><rect x="81" y="84" width="8" height="8" rx="2" fill="url(#pWoodD)" ${S(2)}/>
  ${shine(11, 22, 3, 56, 1.5, 0.6)}${shine(81, 22, 3, 56, 1.5, 0.6)}`;
P.starmap = `<circle cx="50" cy="50" r="45" fill="url(#pGold)" ${S()}/><circle cx="50" cy="50" r="37" fill="url(#pNight)" ${S(2.5)}/>
  ${Array.from({ length: 16 }, (_, i) => { const a = i * Math.PI / 8; return `<path d="M${n(50 + 39 * Math.cos(a))} ${n(50 + 39 * Math.sin(a))}L${n(50 + 43 * Math.cos(a))} ${n(50 + 43 * Math.sin(a))}" stroke="${O}" stroke-width="2"/>`; }).join('')}
  <path d="M28 58L40 42L54 48L64 30L74 40M54 48L58 66L44 72" stroke="#9ad8ff" stroke-width="1.6" fill="none" opacity=".8"/>
  ${[[28, 58], [40, 42], [54, 48], [64, 30], [74, 40], [58, 66], [44, 72]].map(([x, y], i) => sparkle(x, y, i === 3 ? 6 : 4, i === 3 ? '#ffe066' : '#fff')).join('')}
  <path d="M30 26A10 10 0 1 0 40 36A8 8 0 1 1 30 26Z" fill="#fff3a0"/>
  <path d="M18 34Q24 18 38 12" stroke="#fff" stroke-width="3" opacity=".5" fill="none" stroke-linecap="round"/>`;
P.orb = glow(50, 44, 46, 'pGlowP') + `<path d="M28 96L34 74H66L72 96Z" fill="url(#pGold)" ${S()}/>
  <path d="M34 76Q26 66 30 58M66 76Q74 66 70 58M50 76V68" stroke="${O}" stroke-width="7" stroke-linecap="round" fill="none"/>
  <path d="M34 76Q26 66 30 58M66 76Q74 66 70 58" stroke="url(#pGold)" stroke-width="3.5" stroke-linecap="round" fill="none"/>
  <circle cx="50" cy="44" r="32" fill="url(#pOrb)" ${S()}/>
  <path d="M30 52Q40 34 56 44T72 34" stroke="#fff" stroke-width="3" opacity=".35" fill="none"/>
  <ellipse cx="52" cy="50" rx="6" ry="8" fill="url(#pEggG)" opacity=".85"/>${glow(52, 50, 12)}
  <ellipse cx="38" cy="30" rx="9" ry="5" fill="#fff" opacity=".8" transform="rotate(-35 38 30)"/>${sparkle(64, 26, 4)}`;

// ===== Dragon Nest =====
{
  let twigs = '';
  for (let i = 0; i < 14; i++) {
    const x = 6 + i * 6.6, y = 64 + Math.sin(i * 1.7) * 6, a = (i % 2 ? 1 : -1) * (10 + (i * 13) % 14);
    twigs += `<path d="M${n(x - a * .5)} ${n(y - 4)}L${n(x + a * .5)} ${n(y + 8)}" stroke="#4a2408" stroke-width="2.4" stroke-linecap="round"/>`;
  }
  P.nest = `<path d="M2 60Q50 102 98 60Q94 94 50 96Q6 94 2 60Z" fill="url(#pWood)" ${S()}/>
    <ellipse cx="50" cy="60" rx="47" ry="13" fill="#7a4a1e" ${S()}/><ellipse cx="50" cy="61" rx="37" ry="8" fill="#3a1e0a"/>
    <path d="M14 58Q30 50 50 52T86 58" stroke="#6ac85a" stroke-width="5" fill="none" stroke-linecap="round"/>
    ${twigs}<path d="M8 66Q30 76 52 74M50 86Q72 82 92 68M20 80Q40 88 62 86" stroke="#4a2408" stroke-width="2.4" fill="none"/>
    <path d="M4 56L-2 48M96 56L100 46M30 50L26 42M72 50L78 42" stroke="#4a2408" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="22" cy="58" rx="8" ry="3" fill="#8ae070"/><ellipse cx="74" cy="57" rx="9" ry="3" fill="#8ae070"/>`;
}
P.egg = glow(50, 56, 46) + `<path d="M50 6C74 6 88 44 88 62A38 34 0 0 1 12 62C12 44 26 6 50 6Z" fill="url(#pEggG)" ${S()}/>
  <g fill="none" stroke="#c2480a" stroke-width="2.2" opacity=".6">${
    [[30, 40], [50, 32], [70, 40], [22, 58], [42, 52], [62, 52], [80, 58], [32, 72], [52, 70], [70, 72], [44, 86], [60, 86]].map(([x, y]) => `<path d="M${x - 8} ${y}q8 9 16 0"/>`).join('')}</g>
  <path d="M50 30L56 40L48 46L54 54" stroke="${O}" stroke-width="2.5" fill="none" stroke-linejoin="round"/>
  <path d="M28 46Q30 26 42 16" stroke="#fff" stroke-width="5" opacity=".6" fill="none" stroke-linecap="round"/>${sparkle(76, 22, 6)}`;
P.firepit = glow(50, 44, 44) + `<path d="M24 82L72 66M28 66L76 82" stroke="${O}" stroke-width="12" stroke-linecap="round"/>
  <path d="M24 82L72 66M28 66L76 82" stroke="url(#pWoodD)" stroke-width="7" stroke-linecap="round"/>` + flame(50, 74, 24, 66) +
  [[10, 86], [24, 92], [40, 95], [60, 95], [76, 92], [90, 86]].map(([x, y]) => `<ellipse cx="${x}" cy="${y - 4}" rx="10" ry="7" fill="url(#pStone)" ${S(2.5)}/><ellipse cx="${x - 2}" cy="${y - 7}" rx="5" ry="2" fill="#fff" opacity=".4"/>`).join('');
P.treasure = `<path d="M4 96Q14 54 50 46Q86 54 96 96Z" fill="url(#pGold)" ${S()}/>
  ${coin(28, 70)}${coin(44, 60)}${coin(66, 66)}${coin(80, 84)}${coin(20, 88)}${coin(56, 82)}${coin(38, 84)}
  ${gemDot(54, 52, 9, '#ff3b5c')}${gemDot(32, 78, 7, '#3d8bff')}${gemDot(72, 76, 7, '#2ed47a')}
  <path d="M60 30L64 52H76L80 30Z" fill="url(#pGold)" ${S(2.5)}/><path d="M70 52V60M64 62H76" stroke="${O}" stroke-width="3"/>
  ${sparkle(24, 54, 6)}${sparkle(84, 34, 5)}${sparkle(46, 40, 4)}`;
P.dragon = `<path d="M66 86Q94 92 92 70Q90 58 80 62" stroke="${O}" stroke-width="12" fill="none" stroke-linecap="round"/>
  <path d="M66 86Q94 92 92 70Q90 58 80 62" stroke="#7a3ae0" stroke-width="7" fill="none" stroke-linecap="round"/>
  <path d="M80 62L72 54L86 52Z" fill="url(#pMembrane)" ${S(2.5)}/>
  <path d="M34 54Q8 26 2 44Q12 46 9 55Q19 53 20 62Q28 57 34 64Z" fill="url(#pMembrane)" ${S()}/>
  <path d="M66 54Q92 26 98 44Q88 46 91 55Q81 53 80 62Q72 57 66 64Z" fill="url(#pMembrane)" ${S()}/>
  <path d="M30 52L14 42M70 52L86 42" stroke="#c2480a" stroke-width="2" opacity=".6"/>
  <ellipse cx="50" cy="72" rx="22" ry="23" fill="url(#pDragon)" ${S()}/>
  <ellipse cx="50" cy="76" rx="13" ry="16" fill="#ffe0b0" ${S(2)}/><path d="M40 70H60M39 77H61M41 84H59" stroke="#e0a868" stroke-width="2"/>
  <ellipse cx="38" cy="93" rx="10" ry="5" fill="url(#pDragon)" ${S(2.5)}/><ellipse cx="62" cy="93" rx="10" ry="5" fill="url(#pDragon)" ${S(2.5)}/>
  <ellipse cx="33" cy="72" rx="5" ry="8" fill="url(#pDragon)" ${S(2.5)} transform="rotate(25 33 72)"/><ellipse cx="67" cy="72" rx="5" ry="8" fill="url(#pDragon)" ${S(2.5)} transform="rotate(-25 67 72)"/>
  <path d="M33 22L25 4L42 17Z M67 22L75 4L58 17Z" fill="#ffe8b0" ${S(2.5)}/>
  <path d="M44 16L50 8L56 16Z" fill="#ff8a3d" ${S(2)}/>
  <ellipse cx="50" cy="35" rx="25" ry="20" fill="url(#pDragon)" ${S()}/>
  <ellipse cx="50" cy="45" rx="14" ry="9" fill="#b994ff" ${S(2)}/><circle cx="45" cy="43" r="1.8" fill="${O}"/><circle cx="55" cy="43" r="1.8" fill="${O}"/>
  <path d="M44 49Q50 53 56 49" stroke="${O}" stroke-width="2" fill="none" stroke-linecap="round"/>
  <circle cx="39" cy="31" r="7.5" fill="#fff" ${S(2)}/><circle cx="61" cy="31" r="7.5" fill="#fff" ${S(2)}/>
  <circle cx="40" cy="32" r="4.5" fill="#1a1030"/><circle cx="60" cy="32" r="4.5" fill="#1a1030"/>
  <circle cx="41.5" cy="30" r="1.7" fill="#fff"/><circle cx="61.5" cy="30" r="1.7" fill="#fff"/>
  <ellipse cx="31" cy="41" rx="4" ry="2.5" fill="#ff7ab0" opacity=".6"/><ellipse cx="69" cy="41" rx="4" ry="2.5" fill="#ff7ab0" opacity=".6"/>
  <ellipse cx="42" cy="21" rx="8" ry="3.5" fill="#fff" opacity=".35"/>`;

// ===== Great Hall =====
P.table = `<rect x="10" y="60" width="8" height="37" fill="url(#pWoodD)" ${S()}/><rect x="82" y="60" width="8" height="37" fill="url(#pWoodD)" ${S()}/>
  <polygon points="12,44 88,44 96,56 4,56" fill="url(#pWood)" ${S()}/><rect x="4" y="56" width="92" height="8" fill="url(#pWoodD)" ${S()}/>
  <path d="M40 44H60L62 56V74L56 70L50 76L44 70L38 74V56Z" fill="url(#pRed)" ${S(2.5)}/>
  ${[22, 78].map((x) => `<ellipse cx="${x}" cy="50" rx="9" ry="3.5" fill="#fffaf0" ${S(2)}/>`).join('')}
  <path d="M30 36L32 46H38L40 36Z M62 36L64 46H70L72 36Z" fill="url(#pGold)" ${S(2)}/>
  <path d="M35 46V50M67 46V50" stroke="${O}" stroke-width="2"/>`;
P.feast = `<path d="M50 36Q44 26 50 18T50 4M36 38Q30 30 36 22M64 38Q70 30 64 22" stroke="#fff" stroke-width="3.5" opacity=".6" fill="none" stroke-linecap="round"/>
  <path d="M18 46H82L76 82Q50 96 24 82Z" fill="url(#pIronD)" ${S()}/>
  <ellipse cx="50" cy="46" rx="33" ry="8" fill="#e8742a" ${S()}/><ellipse cx="44" cy="44" rx="10" ry="2.5" fill="#ffc06a"/>
  <circle cx="58" cy="46" r="3" fill="#6ac85a"/><circle cx="38" cy="47" r="2.5" fill="#ffd85a"/>
  <path d="M14 50Q8 56 18 58M86 50Q92 56 82 58" stroke="${O}" stroke-width="4" fill="none"/>
  ${shine(26, 54, 4, 20, 2, 0.3)}
  <ellipse cx="22" cy="88" rx="18" ry="9" fill="#d88a3a" ${S()}/><path d="M12 86l5-4M20 88l5-5M28 88l5-5" stroke="#8a4a1a" stroke-width="2.5" stroke-linecap="round"/>
  ${[[74, 92], [84, 90], [79, 84]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#8a4a1a" ${S(2)}/>`).join('')}`;
P.housebanners = `<rect x="4" y="6" width="92" height="7" rx="3.5" fill="url(#pWoodD)" ${S(2.5)}/>
  ${[[10, 'pRed', 'circle'], [38, 'pBlue', 'star'], [66, 'pGreen', 'tri']].map(([x, g, e]) => {
    const c = x + 12;
    const emb = e === 'circle' ? `<circle cx="${c}" cy="40" r="6" fill="url(#pGold)" ${S(2)}/>`
      : e === 'star' ? `<path d="M${c} 32l2.5 5.5 6 .5-4.5 4 1.5 6-5.5-3.2-5.5 3.2 1.5-6-4.5-4 6-.5z" fill="url(#pGold)" ${S(2)}/>`
        : `<path d="M${c} 32L${c + 7} 46H${c - 7}Z" fill="url(#pGold)" ${S(2)}/>`;
    return `<path d="M${x} 12H${x + 24}V84L${c} 74L${x} 84Z" fill="url(#${g})" ${S()}/><path d="M${x + 4} 16V70" stroke="#fff" stroke-width="3" opacity=".35" stroke-linecap="round"/>
      <path d="M${x} 22H${x + 24}" stroke="#ffc93a" stroke-width="3"/>${emb}`;
  }).join('')}
  <circle cx="5" cy="9.5" r="4.5" fill="url(#pGold)" ${S(2)}/><circle cx="95" cy="9.5" r="4.5" fill="url(#pGold)" ${S(2)}/>`;
P.music = `<path d="M82 10L22 90" stroke="${O}" stroke-width="6" stroke-linecap="round"/><path d="M82 10L22 90" stroke="url(#pWood)" stroke-width="3" stroke-linecap="round"/>
  <path d="M78 8L18 88" stroke="#fffaf0" stroke-width="1.5"/>
  <rect x="45.5" y="10" width="9" height="34" rx="2" fill="#3a1e0a" ${S(2.5)}/><circle cx="50" cy="9" r="6" fill="url(#pWoodD)" ${S(2.5)}/>
  <path d="M50 40C34 40 30 50 34 58C27 62 24 72 30 84C36 97 64 97 70 84C76 72 73 62 66 58C70 50 66 40 50 40Z" fill="url(#pLeather)" ${S()}/>
  <path d="M41 62q-3 5 0 10q3 5 0 10M59 62q3 5 0 10q-3 5 0 10" stroke="${O}" stroke-width="2.2" fill="none"/>
  <rect x="43" y="72" width="14" height="3" fill="#ffe8b0" ${S(1.5)}/><path d="M45 84H55L53 92H47Z" fill="#3a1e0a"/>
  <path d="M48 12V86M50 12V86M52 12V86" stroke="#fff3c8" stroke-width=".8"/>
  <path d="M38 48Q36 56 40 60" stroke="#fff" stroke-width="3" opacity=".45" fill="none" stroke-linecap="round"/>`;
P.chandelier = glow(50, 56, 44) + `<path d="M50 0V36" stroke="${O}" stroke-width="3" stroke-dasharray="5 2"/>
  <path d="M50 36L14 56M50 36L86 56M50 36L32 60M50 36L68 60" stroke="url(#pGold)" stroke-width="2.5"/>
  <ellipse cx="50" cy="60" rx="40" ry="11" fill="none" stroke="${O}" stroke-width="9"/><ellipse cx="50" cy="60" rx="40" ry="11" fill="none" stroke="url(#pGold)" stroke-width="5"/>` +
  [[14, 58], [86, 58], [32, 69], [68, 69], [50, 72]].map(([x, y]) => `<rect x="${x - 5}" y="${y - 4}" width="10" height="6" rx="2" fill="url(#pGold)" ${S(2)}/>` + candle(x, y - 18, 7, y - 3)).join('') +
  `<path d="M50 72L54 84L50 92L46 84Z" fill="#ff3b5c" ${S(2)}/>`;
P.crown = crownShape(50, 6, 92);

// ===== Sky Tower =====
P.stairs = Array.from({ length: 6 }, (_, k) => {
  const x = 4 + k * 15, y = 80 - k * 14;
  return `<rect x="${x}" y="${y}" width="16" height="${97 - y}" fill="url(#pStone)" ${S(2.5)}/><rect x="${x}" y="${y}" width="16" height="5" fill="#e3e8ef" ${S(2)}/>`;
}).join('') + `<path d="M8 66L88 0" stroke="${O}" stroke-width="7" stroke-linecap="round"/><path d="M8 66L88 0" stroke="url(#pWood)" stroke-width="3.5" stroke-linecap="round"/>
  ${[0, 2, 4].map((k) => `<path d="M${12 + k * 15} ${63 - k * 12.5}V${80 - k * 14}" stroke="${O}" stroke-width="3"/>`).join('')}`;
P.telescope = `<path d="M50 60L26 97M50 60L74 97M50 60L50 97" stroke="${O}" stroke-width="7" stroke-linecap="round"/><path d="M50 60L26 97M50 60L74 97M50 60L50 97" stroke="url(#pWood)" stroke-width="3.5" stroke-linecap="round"/>
  <g transform="rotate(-30 50 54)"><rect x="8" y="46" width="30" height="16" rx="3" fill="url(#pGold)" ${S()}/>
  <rect x="36" y="44" width="34" height="20" rx="3" fill="url(#pBlue)" ${S()}/><rect x="68" y="40" width="26" height="28" rx="4" fill="url(#pGold)" ${S()}/>
  <ellipse cx="94" cy="54" rx="3" ry="12" fill="#bff4ff" ${S(2)}/>${shine(40, 47, 26, 4, 2, 0.45)}${shine(71, 44, 20, 4, 2, 0.5)}</g>
  <circle cx="50" cy="58" r="5" fill="url(#pIronD)" ${S(2)}/>`;
P.moonwindow = `<path d="M10 97V42A40 40 0 0 1 90 42V97Z" fill="url(#pStone)" ${S()}/>
  <path d="M22 97V44A28 28 0 0 1 78 44V97Z" fill="url(#pNight)" ${S()}/>
  ${glow(37, 40, 20)}<path d="M40 25A13 13 0 1 0 47 50A10 10 0 1 1 40 25Z" fill="#fff3a0" ${S(2)}/>
  ${sparkle(65, 34, 4)}${sparkle(36, 76, 3)}${sparkle(66, 78, 3.5)}${sparkle(60, 48, 2.5)}
  <path d="M50 16V97M22 62H78" stroke="url(#pWoodD)" stroke-width="5"/><path d="M50 16V97M22 62H78" stroke="${O}" stroke-width="1.5" opacity=".5"/>
  <rect x="14" y="90" width="72" height="7" rx="2" fill="url(#pStone)" ${S(2.5)}/>`;
P.chimes = `<path d="M50 0V10" stroke="${O}" stroke-width="2"/><rect x="10" y="8" width="80" height="8" rx="4" fill="url(#pWood)" ${S(2.5)}/>
  ${[[20, 50], [35, 64], [50, 78], [65, 60], [80, 46]].map(([x, b]) => `<path d="M${x} 16V24" stroke="${O}" stroke-width="1.5"/><rect x="${x - 4.5}" y="24" width="9" height="${b - 24}" rx="4" fill="url(#pIron)" ${S(2.5)}/><rect x="${x - 2.5}" y="27" width="2.5" height="${b - 32}" fill="#fff" opacity=".7"/>`).join('')}
  <path d="M50 78V86" stroke="${O}" stroke-width="1.5"/><path d="M44 86H56L50 98Z" fill="#3d8bff" ${S(2)}/>`;
P.wings = `${[1, -1].map((s) => `<g transform="translate(50 0) scale(${s} 1) translate(-50 0)">
    <path d="M46 48Q34 14 4 16Q14 24 6 30Q20 36 10 44Q24 48 16 56Q30 58 24 68Q38 64 46 60Z" fill="url(#pWing)" ${S()}/>
    <path d="M44 50Q30 32 10 24M44 54Q28 44 12 44M44 58Q32 56 22 62" stroke="#8ab8e0" stroke-width="2" fill="none"/>
    <path d="M40 40Q32 26 18 22" stroke="#fff" stroke-width="3" opacity=".8" fill="none" stroke-linecap="round"/></g>`).join('')}
  <rect x="40" y="44" width="20" height="22" rx="6" fill="url(#pLeather)" ${S()}/><circle cx="50" cy="55" r="5" fill="url(#pGold)" ${S(2)}/>
  <path d="M42 66L38 90M58 66L62 90" stroke="url(#pLeather)" stroke-width="5" stroke-linecap="round"/>`;
P.signalfire = glow(50, 30, 44) + `<rect x="36" y="56" width="28" height="41" fill="url(#pStone)" ${S()}/>
  <path d="M36 70H64M36 84H64M50 56V70M44 70V84M56 84V97" stroke="${O}" stroke-width="2" opacity=".45"/>
  <rect x="30" y="52" width="40" height="7" rx="2" fill="url(#pStone)" ${S(2.5)}/>` + flame(50, 42, 26, 42) +
  `<path d="M18 36H82L72 54H28Z" fill="url(#pIronD)" ${S()}/>${shine(24, 38, 50, 3, 1.5, 0.35)}`;

// ===== Crystal Caves =====
P.cavelight = `<path d="M50 0V30" stroke="${O}" stroke-width="3" stroke-dasharray="5 2"/>` + glow(50, 58, 46, 'pGlowC') +
  `<path d="M36 34H64L58 28H42Z" fill="url(#pIronD)" ${S(2.5)}/>` + crystal(50, 88, 22, 54, 'url(#pCrystal)') +
  `<path d="M36 34L40 90M64 34L60 90M38 62H62" stroke="url(#pIronD)" stroke-width="3"/>${sparkle(50, 56, 7)}`;
P.bridge = `<path d="M0 64Q50 26 100 64L100 82Q50 46 0 82Z" fill="url(#pCrystal)" ${S()}/>
  <path d="M6 66Q50 34 94 66" stroke="#fff" stroke-width="3" opacity=".6" fill="none"/>
  <path d="M10 74Q50 44 90 74" stroke="#1a5a9a" stroke-width="2" opacity=".4" fill="none"/>
  ${[[10, 58], [30, 44], [50, 40], [70, 44], [90, 58]].map(([x, y]) => crystal(x, y + 4, 7, 16, 'url(#pCrystal)')).join('')}
  <path d="M10 46Q50 22 90 46" stroke="#bff4ff" stroke-width="3" fill="none"/>${sparkle(36, 52, 4)}${sparkle(72, 56, 3.5)}`;
P.gemgarden = glow(50, 60, 44, 'pGlowP') + crystal(26, 88, 16, 46, '#ff3b5c', -18) + crystal(76, 88, 15, 44, '#2ed47a', 18) +
  crystal(50, 88, 20, 70, '#3d8bff') + crystal(38, 90, 11, 30, '#b25cff', -8) + crystal(64, 90, 11, 28, '#ffb627', 10) +
  `<path d="M8 97Q14 82 30 86Q50 80 70 86Q86 82 92 97Z" fill="url(#pStone)" ${S()}/>${sparkle(50, 30, 5)}${sparkle(22, 52, 4)}`;
P.mushrooms = glow(50, 60, 46, 'pGlowG') + [[28, 97, 18, 30, '#3ad8c8'], [70, 97, 15, 24, '#ff6ab0'], [50, 97, 22, 46, '#9a6aff']].map(([x, b, r, h, c]) =>
  `<path d="M${x - r * .35} ${b}Q${x - r * .3} ${b - h * .6} ${x - r * .25} ${b - h}H${x + r * .25}Q${x + r * .3} ${b - h * .6} ${x + r * .35} ${b}Z" fill="url(#pCream)" ${S(2.5)}/>` +
  `<path d="M${x - r} ${b - h}Q${x - r} ${b - h - r * 1.3} ${x} ${b - h - r * 1.3}Q${x + r} ${b - h - r * 1.3} ${x + r} ${b - h}Q${x} ${b - h + r * .3} ${x - r} ${b - h}Z" fill="${c}" ${S(2.5)}/>` +
  `<circle cx="${x - r * .4}" cy="${b - h - r * .55}" r="${r * .17}" fill="#fff" opacity=".85"/><circle cx="${x + r * .35}" cy="${b - h - r * .8}" r="${r * .13}" fill="#fff" opacity=".85"/><circle cx="${x + r * .1}" cy="${b - h - r * .25}" r="${r * .1}" fill="#fff" opacity=".85"/>`).join('');
P.waterfall = `<ellipse cx="50" cy="90" rx="44" ry="9" fill="url(#pWater)" ${S()}/>
  <path d="M30 18H70V88Q50 94 30 88Z" fill="url(#pWater)" ${S()}/>
  <path d="M38 22V82M50 26V88M62 22V80" stroke="#fff" stroke-width="3" opacity=".7" stroke-linecap="round" stroke-dasharray="14 8"/>
  <path d="M6 22Q8 6 30 8H70Q92 6 94 22Q80 28 50 24Q20 28 6 22Z" fill="url(#pStone)" ${S()}/>
  ${[[22, 86], [78, 86], [50, 82]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#fff" opacity=".85"/>`).join('')}
  <path d="M16 84Q20 78 26 82M74 82Q80 78 84 84" stroke="#fff" stroke-width="2.5" fill="none"/>`;

// ===== Dragon Festival =====
P.fireworks = [[34, 34, 26, '#ffd23a'], [72, 26, 20, '#ff6ab0'], [66, 70, 18, '#5ae6ff']].map(([x, y, r, c]) =>
  `<circle cx="${x}" cy="${y}" r="${r * .5}" fill="${c}" opacity=".25"/>` +
  Array.from({ length: 12 }, (_, i) => {
    const a = i * Math.PI / 6, x1 = x + r * .3 * Math.cos(a), y1 = y + r * .3 * Math.sin(a), x2 = x + r * Math.cos(a), y2 = y + r * Math.sin(a);
    return `<path d="M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}" stroke="${c}" stroke-width="3.5" stroke-linecap="round"/><circle cx="${n(x2)}" cy="${n(y2)}" r="2.6" fill="#fff"/>`;
  }).join('') + sparkle(x, y, r * .25)).join('') + `<path d="M34 60V97" stroke="#ffd23a" stroke-width="2" stroke-dasharray="3 4" opacity=".7"/>`;
P.lanterns = lantern(26, 64, 22, 'url(#pRed)') + lantern(70, 40, 24, '#ff9a2a') + lantern(46, 22, 16, '#ffd23a');
P.tent = `<defs><clipPath id="pTc"><path d="M50 10L92 52H8Z M12 52H88V96H12Z"/></clipPath></defs>
  <path d="M50 10L92 52H8Z M12 52H88V96H12Z" fill="#fff6e8"/>
  <g clip-path="url(#pTc)">${Array.from({ length: 6 }, (_, i) => `<path d="M50 10L${4 + i * 16} 100L${12 + i * 16} 100Z" fill="#e8343a"/>`).join('')}</g>
  <path d="M50 10L92 52H8Z" fill="none" ${S()}/><rect x="12" y="52" width="76" height="44" fill="none" ${S()}/>
  <path d="M8 52${Array.from({ length: 7 }, (_, i) => `Q${n(8 + i * 12 + 6)} 62 ${n(8 + (i + 1) * 12)} 52`).join('')}" fill="#ffd23a" ${S(2.5)}/>
  <path d="M38 96Q42 70 50 64Q58 70 62 96Z" fill="#3a1e0a" ${S(2.5)}/>
  <path d="M50 10V0" stroke="${O}" stroke-width="2.5"/><path d="M50 0L64 4L50 8Z" fill="#3d8bff" ${S(2)}/>`;
P.cake = `<rect x="40" y="2" width="20" height="8" rx="4" fill="#e8343a" transform="rotate(-20 50 6)" ${S(2)}/><path d="M58 2q4-4 6 0" stroke="#2ea84a" stroke-width="3" fill="none"/>
  <rect x="14" y="68" width="72" height="26" rx="5" fill="#ffb0d0" ${S()}/><rect x="24" y="44" width="52" height="26" rx="5" fill="#ffd0e4" ${S()}/>
  <rect x="34" y="22" width="32" height="24" rx="5" fill="#fff0f6" ${S()}/>
  <path d="M14 74q6 8 12 0q6 8 12 0q6 8 12 0q6 8 12 0q6 8 12 0q6 8 12 0M24 50q6 7 13 0q6 7 13 0q6 7 13 0q6 7 13 0M34 28q8 7 16 0q8 7 16 0" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  ${[22, 40, 60, 78].map((x) => `<circle cx="${x}" cy="84" r="3" fill="#e8343a"/>`).join('')}${[34, 50, 66].map((x) => `<circle cx="${x}" cy="60" r="2.6" fill="#3d8bff"/>`).join('')}
  <ellipse cx="50" cy="96" rx="44" ry="3.5" fill="url(#pGold)" ${S(2)}/>`;
P.trophy = `<path d="M30 20Q8 20 12 38Q16 54 34 54M70 20Q92 20 88 38Q84 54 66 54" stroke="${O}" stroke-width="9" fill="none"/>
  <path d="M30 20Q8 20 12 38Q16 54 34 54M70 20Q92 20 88 38Q84 54 66 54" stroke="url(#pGold)" stroke-width="4.5" fill="none"/>
  <path d="M24 8H76V30Q76 62 50 66Q24 62 24 30Z" fill="url(#pGold)" ${S()}/>
  <rect x="44" y="64" width="12" height="14" fill="url(#pGold)" ${S(2.5)}/><rect x="28" y="78" width="44" height="18" rx="3" fill="url(#pWoodD)" ${S()}/>
  <rect x="38" y="83" width="24" height="7" rx="1" fill="url(#pGold)" ${S(1.5)}/>
  <path d="M50 22l3.5 7.5 8 .7-6 5.3 1.8 8-7.3-4.3-7.3 4.3 1.8-8-6-5.3 8-.7z" fill="#fff6c2" ${S(2)}/>
  <path d="M30 14V34" stroke="#fff" stroke-width="4" opacity=".55" stroke-linecap="round"/>`;
P.dragon2 = glow(50, 50, 50) + `<use href="#p-dragon"/>` + crownShape(50, -6, 34) + sparkle(16, 20, 5) + sparkle(86, 26, 4);

export const PROPS = defs + Object.entries(P).map(([id, body]) => sym(id, body)).join('');
