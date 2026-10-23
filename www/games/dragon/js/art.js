// All the pictures, drawn as SVG symbols (viewBox 0 0 100 100). Injected once into the page as <defs>.
const grad = (id, stops, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
const rgrad = (id, stops, cx = 0.4, cy = 0.35) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="0.7">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</radialGradient>`;

// Gems: ruby, sapphire, emerald, amber, amethyst, pearl (each its own shape, so colours aren't the only cue).
export const GEM_COLORS = ['#ff3b5c', '#3d8bff', '#2ed47a', '#ffb627', '#b25cff', '#f4eef8'];
export const GEM_NAMES = ['Ruby', 'Sapphire', 'Emerald', 'Amber', 'Amethyst', 'Pearl'];
// A cut gem: facets between the outline and the table, each shaded by how much it faces the light (top-left).
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mixc = (a, b, t) => '#' + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * Math.max(0, Math.min(1, t))).toString(16).padStart(2, '0')).join('');
const pts = (l) => l.map((p) => p.map((v) => +v.toFixed(1)).join(',')).join(' ');
const spark = (x, y, r) => `<path d="M${x} ${y - r}Q${x + r * .18} ${y - r * .18} ${x + r} ${y}Q${x + r * .18} ${y + r * .18} ${x} ${y + r}Q${x - r * .18} ${y + r * .18} ${x - r} ${y}Q${x - r * .18} ${y - r * .18} ${x} ${y - r}Z" fill="#fff"/>`;
function cut(i, outer, [cx, cy], k, [dark, mid, light], line) {
  const inner = outer.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
  const shade = (pa, pb) => {
    const mx = (pa[0] + pb[0]) / 2 - cx, my = (pa[1] + pb[1]) / 2 - cy, l = Math.hypot(mx, my) || 1;
    return (1 - (mx + my) / l / Math.SQRT2) / 2;
  };
  const col = (t) => (t > 0.5 ? mixc(mid, light, (t - 0.5) * 2.2) : mixc(dark, mid, t * 2));
  let f = '';
  outer.forEach((a, j) => {
    const b = outer[(j + 1) % outer.length], c = inner[(j + 1) % outer.length], d = inner[j], t = shade(a, b);
    f += `<polygon points="${pts([a, b, d])}" fill="${col(t + 0.07)}"/><polygon points="${pts([b, c, d])}" fill="${col(t - 0.07)}"/>`;
  });
  const [tx, ty] = inner.reduce(([x, y], p) => [Math.min(x, p[0]), Math.min(y, p[1])], [100, 100]);
  return `${grad(`g${i}t`, [[0, light], [0.55, mid], [1, mixc(mid, dark, 0.35)]], 0.6, 1)}
   <symbol id="gem${i}" viewBox="0 0 100 100">
   <polygon points="${pts(outer)}" fill="${dark}" stroke="${line}" stroke-width="5" stroke-linejoin="round"/>${f}
   <polygon points="${pts(inner)}" fill="url(#g${i}t)" stroke="${light}" stroke-opacity=".5" stroke-width="1.2"/>
   <polygon points="${pts(outer)}" fill="none" stroke="${line}" stroke-width="3" stroke-linejoin="round"/>
   ${spark(tx + (cx - tx) * 0.55, ty + (cy - ty) * 0.6, 9)}<circle cx="${cx + (cx - tx) * 0.7}" cy="${cy + (cy - ty) * 0.75}" r="2.5" fill="#fff" opacity=".7"/></symbol>`;
}
const ring = (n, r, rot, cx = 50, cy = 50) => Array.from({ length: n }, (_, j) => {
  const a = rot + (j * 2 * Math.PI) / n;
  return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
});
const gems = [
  // ruby: round brilliant
  cut(0, ring(8, 45, 0), [50, 50], 0.5, ['#7a001e', '#ff2d55', '#ffc2cc'], '#4e0013'),
  // sapphire: drop
  cut(1, [[50, 4], [63, 20], [77, 37], [87, 56], [84, 74], [72, 88], [50, 95], [28, 88], [16, 74], [13, 56], [23, 37], [37, 20]], [50, 62], 0.48, ['#08236e', '#2f7bff', '#c2dcff'], '#04164a'),
  // emerald: step cut
  cut(2, [[28, 7], [72, 7], [91, 26], [91, 74], [72, 93], [28, 93], [9, 74], [9, 26]], [50, 50], 0.58, ['#024a29', '#1fc46a', '#b4ffd6'], '#01361d'),
  // amber: trillion
  cut(3, [[44, 9], [56, 9], [95, 79], [89, 89], [11, 89], [5, 79]], [50, 63], 0.5, ['#8a4000', '#ffad14', '#fff3b8'], '#5e2b00'),
  // amethyst: kite
  cut(4, [[50, 4], [69, 22], [89, 40], [69, 68], [50, 96], [31, 68], [11, 40], [31, 22]], [50, 44], 0.5, ['#350866', '#9d3bff', '#ecd2ff'], '#250448'),
  // pearl: sphere with a soft rainbow sheen
  `${rgrad('g5a', [[0, '#ffffff'], [0.5, '#f3eaf7'], [0.85, '#c9b6d6'], [1, '#9c86ad']], 0.38, 0.32)}
   <linearGradient id="g5b" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#ff9ad5" stop-opacity=".55"/><stop offset=".5" stop-color="#9ae6ff" stop-opacity=".25"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
   <symbol id="gem5" viewBox="0 0 100 100"><circle cx="50" cy="51" r="42" fill="url(#g5a)" stroke="#6e5a80" stroke-width="4"/>
   <circle cx="50" cy="51" r="40" fill="url(#g5b)"/>
   <path d="M18 62A34 34 0 0 0 82 62A38 30 0 0 1 18 62Z" fill="#fff" opacity=".45"/>
   <ellipse cx="36" cy="32" rx="13" ry="8" fill="#fff" transform="rotate(-30 36 32)"/>${spark(64, 26, 6)}</symbol>`,
];

// Specials
const specials = `
  ${grad('rk', [[0, '#ffe08a'], [0.5, '#ff7a1a'], [1, '#b8320a']])}
  ${grad('fl', [[0, '#fff3a0'], [1, '#ff4d1a']], 1, 0)}
  <symbol id="rocket" viewBox="0 0 100 100">
    <path d="M4 50L18 38L18 62Z" fill="url(#fl)"/><path d="M96 50L82 38L82 62Z" fill="url(#fl)"/>
    <path d="M14 50Q4 42 0 50Q4 58 14 50Z" fill="#ffd23a"/><path d="M86 50Q96 42 100 50Q96 58 86 50Z" fill="#ffd23a"/>
    <rect x="16" y="36" width="68" height="28" rx="14" fill="url(#rk)" stroke="#7a1f00" stroke-width="3"/>
    <path d="M30 36L22 22L40 36ZM70 36L78 22L60 36ZM30 64L22 78L40 64ZM70 64L78 78L60 64Z" fill="#c22a1e" stroke="#7a1f00" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="50" cy="50" r="7" fill="#fff4c2" stroke="#7a1f00" stroke-width="2.5"/>
    <rect x="22" y="40" width="56" height="6" rx="3" fill="#fff" opacity=".45"/>
  </symbol>
  ${rgrad('bm', [[0, '#7a4a8a'], [0.6, '#2b1736'], [1, '#12081a']])}
  <symbol id="bomb" viewBox="0 0 100 100">
    <path d="M60 22Q70 6 84 12" stroke="#8a5a2b" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M84 12L80 2L88 8L96 4L90 14L98 18L86 18Z" fill="#ffcf3a"/>
    <circle cx="48" cy="56" r="36" fill="url(#bm)" stroke="#0a0410" stroke-width="3"/>
    <rect x="50" y="14" width="18" height="12" rx="3" transform="rotate(30 59 20)" fill="#5a3a6a" stroke="#0a0410" stroke-width="2.5"/>
    <path d="M48 36L54 50L68 52L56 60L60 74L48 66L36 74L40 60L28 52L42 50Z" fill="#ff4d2e" opacity=".9"/>
    <path d="M48 44L51 52L59 53L52 57L54 65L48 61L42 65L44 57L37 53L45 52Z" fill="#ffd23a"/>
    <ellipse cx="34" cy="38" rx="10" ry="6" fill="#fff" opacity=".35" transform="rotate(-30 34 38)"/>
  </symbol>
  ${grad('dr', [[0, '#8af0a8'], [1, '#1e8a4a']])}
  ${grad('wg', [[0, '#ffd9a0'], [1, '#ff8a3d']])}
  <symbol id="prop" viewBox="0 0 100 100">
    <path d="M38 52Q14 30 2 40Q12 46 8 54Q18 52 20 62Q28 54 38 60Z" fill="url(#wg)" stroke="#9a3d0a" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M62 52Q86 30 98 40Q88 46 92 54Q82 52 80 62Q72 54 62 60Z" fill="url(#wg)" stroke="#9a3d0a" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M36 26L32 10L44 22ZM64 26L68 10L56 22Z" fill="#ffe08a" stroke="#7a5a00" stroke-width="2"/>
    <ellipse cx="50" cy="52" rx="24" ry="26" fill="url(#dr)" stroke="#0e5a2e" stroke-width="3"/>
    <ellipse cx="50" cy="68" rx="13" ry="9" fill="#c8ffd8"/>
    <circle cx="42" cy="66" r="2.2" fill="#0e5a2e"/><circle cx="58" cy="66" r="2.2" fill="#0e5a2e"/>
    <circle cx="40" cy="46" r="7" fill="#fff"/><circle cx="60" cy="46" r="7" fill="#fff"/>
    <circle cx="41" cy="47" r="4" fill="#1a1030"/><circle cx="61" cy="47" r="4" fill="#1a1030"/>
    <circle cx="42.5" cy="45" r="1.5" fill="#fff"/><circle cx="62.5" cy="45" r="1.5" fill="#fff"/>
    <ellipse cx="42" cy="34" rx="8" ry="4" fill="#fff" opacity=".4"/>
  </symbol>
  <radialGradient id="ey" cx=".5" cy=".5" r=".55"><stop offset="0" stop-color="#fff7c2"/><stop offset=".35" stop-color="#ffb627"/><stop offset=".7" stop-color="#ff3b8a"/><stop offset="1" stop-color="#5a1aa8"/></radialGradient>
  <symbol id="light" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="44" fill="#7a3dff" opacity=".35"/>
    <circle cx="50" cy="50" r="38" fill="url(#ey)" stroke="#3a0a6b" stroke-width="3"/>
    <path d="M50 18Q60 50 50 82Q40 50 50 18Z" fill="#1a0a2b"/>
    <path d="M50 30Q54 50 50 70Q46 50 50 30Z" fill="#ff4d2e" opacity=".8"/>
    <ellipse cx="34" cy="32" rx="10" ry="6" fill="#fff" opacity=".6" transform="rotate(-35 34 32)"/>
    <circle cx="68" cy="66" r="3" fill="#fff" opacity=".7"/>
  </symbol>`;

// Obstacles: crate (1 layer), iron-banded crate (2), rune stone (3); dragon egg; ice.
const obstacles = `
  ${grad('wd', [[0, '#e0a868'], [1, '#9a5a24']])}
  <symbol id="box1" viewBox="0 0 100 100">
    <rect x="6" y="6" width="88" height="88" rx="8" fill="url(#wd)" stroke="#5a2f0e" stroke-width="4"/>
    <path d="M6 34H94M6 66H94" stroke="#7a4317" stroke-width="3"/>
    <path d="M14 14L86 86M86 14L14 86" stroke="#6b3a12" stroke-width="7" opacity=".55"/>
    <rect x="10" y="10" width="80" height="6" rx="3" fill="#fff" opacity=".3"/>
  </symbol>
  ${grad('ir', [[0, '#d7dde6'], [1, '#6b7686']])}
  <symbol id="box2" viewBox="0 0 100 100">
    <use href="#box1"/>
    <rect x="6" y="40" width="88" height="20" fill="url(#ir)" stroke="#39414d" stroke-width="3"/>
    <rect x="40" y="6" width="20" height="88" fill="url(#ir)" stroke="#39414d" stroke-width="3"/>
    <circle cx="50" cy="50" r="7" fill="#9aa4b2" stroke="#39414d" stroke-width="3"/>
    <circle cx="16" cy="50" r="3" fill="#39414d"/><circle cx="84" cy="50" r="3" fill="#39414d"/><circle cx="50" cy="16" r="3" fill="#39414d"/><circle cx="50" cy="84" r="3" fill="#39414d"/>
  </symbol>
  ${grad('st', [[0, '#a7b2c4'], [1, '#4b5468']])}
  <symbol id="box3" viewBox="0 0 100 100">
    <rect x="5" y="5" width="90" height="90" rx="12" fill="url(#st)" stroke="#262b38" stroke-width="4"/>
    <path d="M5 38H50V5M50 38H95M30 38V68M5 68H95M70 68V95M70 38V68" stroke="#2f3546" stroke-width="3" fill="none" opacity=".6"/>
    <path d="M40 46L50 56L60 46M50 56V64" stroke="#5ae6ff" stroke-width="4" fill="none" stroke-linecap="round"/>
    <rect x="10" y="10" width="80" height="6" rx="3" fill="#fff" opacity=".25"/>
  </symbol>
  ${grad('eg', [[0, '#7ef0e0'], [0.6, '#1fa3a0'], [1, '#0b5560']])}
  <symbol id="egg" viewBox="0 0 100 100">
    <path d="M50 6C74 6 88 44 88 62A38 34 0 0 1 12 62C12 44 26 6 50 6Z" fill="url(#eg)" stroke="#073b42" stroke-width="3"/>
    <circle cx="36" cy="54" r="6" fill="#ffd23a"/><circle cx="62" cy="40" r="4.5" fill="#ffd23a"/><circle cx="64" cy="70" r="7" fill="#ffd23a"/>
    <circle cx="44" cy="76" r="3.5" fill="#ffd23a"/><circle cx="52" cy="24" r="3.5" fill="#ffd23a"/>
    <path d="M24 46Q36 40 32 30" stroke="#fff" stroke-width="5" fill="none" opacity=".5" stroke-linecap="round"/>
  </symbol>
  <symbol id="ice" viewBox="0 0 100 100">
    <rect x="2" y="2" width="96" height="96" rx="10" fill="#bfeaff" opacity=".85"/>
    <path d="M14 20L40 46L34 70M40 46L70 40L88 16M70 40L80 76" stroke="#fff" stroke-width="3" fill="none" opacity=".8"/>
    <rect x="8" y="8" width="40" height="8" rx="4" fill="#fff" opacity=".7"/>
  </symbol>
  <symbol id="star" viewBox="0 0 100 100">
    <path d="M50 4L63 36L97 38L70 59L80 93L50 74L20 93L30 59L3 38L37 36Z" fill="#ffd23a" stroke="#a86a00" stroke-width="5" stroke-linejoin="round"/>
    <path d="M50 18L58 40L80 41L50 30Z" fill="#fff" opacity=".5"/>
  </symbol>
  <symbol id="hammer" viewBox="0 0 100 100">
    <rect x="44" y="34" width="12" height="62" rx="5" fill="#a8672e" stroke="#4a2a0e" stroke-width="3" transform="rotate(35 50 60)"/>
    <rect x="16" y="10" width="62" height="30" rx="8" fill="url(#ir)" stroke="#262b38" stroke-width="3.5" transform="rotate(35 50 30)"/>
  </symbol>
  <symbol id="arrow" viewBox="0 0 100 100">
    <path d="M8 50H80" stroke="#a8672e" stroke-width="9" stroke-linecap="round"/>
    <path d="M96 50L72 34L76 50L72 66Z" fill="url(#ir)" stroke="#262b38" stroke-width="3" stroke-linejoin="round"/>
    <path d="M8 50L20 34H32L22 50L32 66H20Z" fill="#ff4d5e" stroke="#7a0020" stroke-width="2.5"/>
  </symbol>
  <symbol id="cannon" viewBox="0 0 100 100">
    <rect x="30" y="8" width="40" height="62" rx="10" fill="url(#st)" stroke="#262b38" stroke-width="3.5"/>
    <rect x="26" y="6" width="48" height="12" rx="5" fill="#6b7686" stroke="#262b38" stroke-width="3"/>
    <circle cx="28" cy="78" r="16" fill="#a8672e" stroke="#4a2a0e" stroke-width="3.5"/><circle cx="72" cy="78" r="16" fill="#a8672e" stroke="#4a2a0e" stroke-width="3.5"/>
    <circle cx="28" cy="78" r="4" fill="#4a2a0e"/><circle cx="72" cy="78" r="4" fill="#4a2a0e"/>
  </symbol>
  <symbol id="mix" viewBox="0 0 100 100">
    <path d="M10 70Q50 100 90 70L82 30Q50 10 18 30Z" fill="#ff4d8a" stroke="#7a0a3b" stroke-width="3.5"/>
    <path d="M18 30Q50 46 82 30" stroke="#7a0a3b" stroke-width="3" fill="none"/>
    <circle cx="50" cy="12" r="8" fill="#ffd23a" stroke="#a86a00" stroke-width="3"/>
    <path d="M30 58L40 50M60 50L70 58M45 66H55" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".8"/>
  </symbol>`;

export function installArt() {
  const div = document.createElement('div');
  div.innerHTML = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${gems.join('')}${specials}${obstacles}</defs></svg>`;
  document.body.prepend(div.firstChild);
}

/** Inline <svg> using one symbol. */
export const use = (id, cls = '') => `<svg class="${cls}" viewBox="0 0 100 100"><use href="#${id}"/></svg>`;

/** Symbol for a tile. */
export function tileArt(t) {
  if (t.t === 'g') return use('gem' + t.c);
  if (t.t === 'rh') return use('rocket');
  if (t.t === 'rv') return use('rocket', 'rot');
  if (t.t === 'box') return use('box' + Math.min(3, t.hp));
  return use(t.t);
}

/** Icon for a goal. */
export function goalArt(g) {
  if (g.t === 'gem') return use('gem' + g.c);
  if (g.t === 'box') return use('box1');
  return use(g.t);
}
