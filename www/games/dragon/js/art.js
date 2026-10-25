import { PROPS } from './props.js';

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
  ${grad('rkB', [[0, '#ffb0a0'], [0.35, '#ff3b4a'], [1, '#8a0a24']])}
  ${grad('rkG', [[0, '#fff6b8'], [0.5, '#ffc93a'], [1, '#b86a00']])}
  ${grad('rkF', [[0, '#ffe08a'], [1, '#ff6a1a']])}
  <radialGradient id="rkGl" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffb020" stop-opacity=".55"/><stop offset="1" stop-color="#ff6a1a" stop-opacity="0"/></radialGradient>
  <symbol id="rocket" viewBox="0 0 100 100">
    <ellipse cx="50" cy="50" rx="50" ry="30" fill="url(#rkGl)"/>
    <path d="M41 36L33 14Q48 16 58 36Z M41 64L33 86Q48 84 58 64Z" fill="url(#rkF)" stroke="#5a1400" stroke-width="3" stroke-linejoin="round"/>
    <path d="M40 34L36 22" stroke="#fff" stroke-width="2.5" opacity=".6" stroke-linecap="round"/>
    <path d="M25 33L25 67Q10 63 3 50Q10 37 25 33Z" fill="url(#rkG)" stroke="#5a1400" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M75 33L75 67Q90 63 97 50Q90 37 75 33Z" fill="url(#rkG)" stroke="#5a1400" stroke-width="3.5" stroke-linejoin="round"/>
    <rect x="23" y="32" width="54" height="36" rx="7" fill="url(#rkB)" stroke="#4a0010" stroke-width="3.5"/>
    <rect x="29" y="32" width="6" height="36" fill="url(#rkG)" stroke="#4a0010" stroke-width="2"/><rect x="65" y="32" width="6" height="36" fill="url(#rkG)" stroke="#4a0010" stroke-width="2"/>
    <circle cx="50" cy="50" r="9" fill="#4a0010"/><circle cx="50" cy="50" r="6.5" fill="#bff4ff"/><circle cx="48" cy="48" r="2.5" fill="#fff"/>
    <rect x="25" y="36" width="50" height="5" rx="2.5" fill="#fff" opacity=".55"/>
    <path d="M10 44Q14 40 20 39" stroke="#fff" stroke-width="2.5" opacity=".7" fill="none" stroke-linecap="round"/>
  </symbol>
  <radialGradient id="bmB" cx=".36" cy=".32" r=".75"><stop offset="0" stop-color="#9a8ac8"/><stop offset=".35" stop-color="#4a3a7a"/><stop offset=".8" stop-color="#1a1030"/><stop offset="1" stop-color="#0a0418"/></radialGradient>
  <radialGradient id="bmS" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6b0"/><stop offset=".4" stop-color="#ffc93a" stop-opacity=".9"/><stop offset="1" stop-color="#ff6a1a" stop-opacity="0"/></radialGradient>
  <symbol id="bomb" viewBox="0 0 100 100">
    <path d="M62 24Q66 8 80 12" stroke="#3a2010" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M62 24Q66 8 80 12" stroke="#c8a070" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-dasharray="4 3"/>
    <circle cx="82" cy="11" r="13" fill="url(#bmS)"/>
    <path d="M82 1L84.5 8.5L92 11L84.5 13.5L82 21L79.5 13.5L72 11L79.5 8.5Z" fill="#fff"/>
    <circle cx="46" cy="58" r="37" fill="url(#bmB)" stroke="#05020c" stroke-width="3.5"/>
    <path d="M14 66Q46 82 78 66" stroke="#ffc93a" stroke-width="5" fill="none" opacity=".9"/>
    <path d="M14 66Q46 82 78 66" stroke="#05020c" stroke-width="1.5" fill="none" opacity=".6"/>
    <rect x="50" y="17" width="20" height="14" rx="3" transform="rotate(32 60 24)" fill="url(#rkG)" stroke="#05020c" stroke-width="3"/>
    <path d="M46 40l4.5 9.5 10.5 1.2-7.8 7 2.2 10.3-9.4-5.3-9.4 5.3 2.2-10.3-7.8-7 10.5-1.2z" fill="url(#rkG)" stroke="#5a2a00" stroke-width="2.5" stroke-linejoin="round"/>
    <ellipse cx="31" cy="40" rx="11" ry="6.5" fill="#fff" opacity=".45" transform="rotate(-35 31 40)"/>
    <circle cx="66" cy="76" r="3" fill="#fff" opacity=".35"/>
  </symbol>
  ${grad('drH', [[0, '#a8ffb8'], [0.5, '#3ad46a'], [1, '#127a3a']])}
  ${grad('drW', [[0, '#ffe0a8'], [1, '#ff7a3d']])}
  ${grad('drC', [[0, '#fffbe8'], [1, '#e8c98a']])}
  <symbol id="prop" viewBox="0 0 100 100">
    <path d="M30 52Q12 18 0 34Q10 38 6 48Q16 46 16 56Q24 52 30 62Z" fill="url(#drW)" stroke="#6a2a06" stroke-width="3" stroke-linejoin="round"/>
    <path d="M70 52Q88 18 100 34Q90 38 94 48Q84 46 84 56Q76 52 70 62Z" fill="url(#drW)" stroke="#6a2a06" stroke-width="3" stroke-linejoin="round"/>
    <path d="M28 50L10 36M28 54L12 48M72 50L90 36M72 54L88 48" stroke="#c2480a" stroke-width="2" opacity=".7"/>
    <path d="M33 30L25 10L44 24Z M67 30L75 10L56 24Z" fill="url(#drC)" stroke="#5a3a10" stroke-width="3" stroke-linejoin="round"/>
    <path d="M44 22L50 12L56 22Z" fill="#ff8a3d" stroke="#6a2a06" stroke-width="2.5" stroke-linejoin="round"/>
    <ellipse cx="50" cy="52" rx="27" ry="27" fill="url(#drH)" stroke="#0b4a24" stroke-width="3.5"/>
    <ellipse cx="50" cy="67" rx="16" ry="11" fill="#d4ffdc" stroke="#0b4a24" stroke-width="2.5"/>
    <circle cx="44" cy="64" r="2.2" fill="#0b4a24"/><circle cx="56" cy="64" r="2.2" fill="#0b4a24"/>
    <path d="M43 71Q50 76 57 71" stroke="#0b4a24" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <circle cx="38" cy="47" r="8.5" fill="#fff" stroke="#0b4a24" stroke-width="2.5"/><circle cx="62" cy="47" r="8.5" fill="#fff" stroke="#0b4a24" stroke-width="2.5"/>
    <circle cx="39.5" cy="48.5" r="5" fill="#1a1030"/><circle cx="60.5" cy="48.5" r="5" fill="#1a1030"/>
    <circle cx="41.5" cy="46" r="2" fill="#fff"/><circle cx="62.5" cy="46" r="2" fill="#fff"/>
    <ellipse cx="29" cy="60" rx="4.5" ry="3" fill="#ff7ab0" opacity=".6"/><ellipse cx="71" cy="60" rx="4.5" ry="3" fill="#ff7ab0" opacity=".6"/>
    <ellipse cx="41" cy="32" rx="10" ry="5" fill="#fff" opacity=".45" transform="rotate(-15 41 32)"/>
  </symbol>
  <radialGradient id="cbG" cx=".5" cy=".5" r=".5"><stop offset=".55" stop-color="#fff2a8" stop-opacity=".9"/><stop offset=".8" stop-color="#ff8ad8" stop-opacity=".45"/><stop offset="1" stop-color="#a86bff" stop-opacity="0"/></radialGradient>
  <radialGradient id="cbC" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#fff" stop-opacity=".85"/><stop offset=".75" stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <symbol id="light" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="50" fill="url(#cbG)"/>
    ${[0, 3, 2, 1, 4, 5].map((g) => GEM_COLORS[g]).map((col, i) => { // colour bomb: a rainbow swirl round a white-hot core
      const P = (deg, r) => { const t = (deg * Math.PI) / 180; return `${(50 + r * Math.cos(t)).toFixed(1)} ${(50 + r * Math.sin(t)).toFixed(1)}`; };
      const a0 = i * 60 - 90, a1 = a0 + 60;
      return `<path d="M50 50Q${P(a0 - 40, 26)} ${P(a0, 40)}A40 40 0 0 1 ${P(a1, 40)}Q${P(a1 - 40, 26)} 50 50Z" fill="${col}"/>`;
    }).join('')}
    <circle cx="50" cy="50" r="40" fill="url(#cbC)"/>
    <circle cx="50" cy="50" r="40" fill="none" stroke="#3a1468" stroke-width="3.5"/>
    <ellipse cx="37" cy="31" rx="11" ry="6" fill="#fff" opacity=".85" transform="rotate(-35 37 31)"/>
    <path d="M78 14l2.2 5.8 5.8 2.2-5.8 2.2-2.2 5.8-2.2-5.8-5.8-2.2 5.8-2.2z M18 72l1.6 4.2 4.2 1.6-4.2 1.6-1.6 4.2-1.6-4.2-4.2-1.6 4.2-1.6z" fill="#fff"/>
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
  ${grad('hmW', [[0, '#e8b070'], [1, '#8a4a1a']], 1, 0)}
  ${grad('hmI', [[0, '#f0f4fa'], [0.45, '#a8b2c2'], [1, '#4a5466']])}
  <symbol id="hammer" viewBox="0 0 100 100">
    <g transform="translate(50 52) scale(.84) rotate(35) translate(-50 -50)">
      <rect x="44" y="34" width="12" height="62" rx="5" fill="url(#hmW)" stroke="#3a1a06" stroke-width="3.5"/>
      <rect x="42" y="72" width="16" height="20" rx="4" fill="#7a2a1a" stroke="#3a1a06" stroke-width="3"/>
      <path d="M44 77H56M44 82H56M44 87H56" stroke="#3a1a06" stroke-width="1.5" opacity=".6"/>
      <rect x="14" y="10" width="72" height="30" rx="7" fill="url(#hmI)" stroke="#1e2430" stroke-width="3.5"/>
      <rect x="10" y="8" width="12" height="34" rx="4" fill="#6b7686" stroke="#1e2430" stroke-width="3"/><rect x="78" y="8" width="12" height="34" rx="4" fill="#6b7686" stroke="#1e2430" stroke-width="3"/>
      <rect x="40" y="10" width="20" height="30" fill="url(#rkG)" stroke="#1e2430" stroke-width="3"/>
      <rect x="24" y="14" width="52" height="5" rx="2.5" fill="#fff" opacity=".6"/>
    </g>
  </symbol>
  <symbol id="arrow" viewBox="0 0 100 100">
    <path d="M4 38H22M2 50H18M4 62H22" stroke="#ffe08a" stroke-width="3" stroke-linecap="round" opacity=".8"/>
    <rect x="14" y="45" width="66" height="10" rx="5" fill="url(#hmW)" stroke="#3a1a06" stroke-width="3"/>
    <rect x="60" y="44" width="6" height="12" fill="url(#rkG)" stroke="#3a1a06" stroke-width="2"/>
    <path d="M98 50L72 30L77 50L72 70Z" fill="url(#hmI)" stroke="#1e2430" stroke-width="3" stroke-linejoin="round"/>
    <path d="M94 49L76 35L79 49Z" fill="#fff" opacity=".6"/>
    <path d="M14 50L26 30H40L30 50Z" fill="url(#rkB)" stroke="#4a0010" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M14 50L26 70H40L30 50Z" fill="#f4eef8" stroke="#4a0010" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M26 34L32 46M26 66L32 54" stroke="#fff" stroke-width="1.5" opacity=".6"/>
    <rect x="18" y="47" width="58" height="3" rx="1.5" fill="#fff" opacity=".45"/>
  </symbol>
  ${grad('cnB', [[0, '#4a5466'], [0.4, '#a8b2c2'], [1, '#2a303c']], 1, 0)}
  <symbol id="cannon" viewBox="0 0 100 100">
    <circle cx="50" cy="10" r="9" fill="url(#bmS)"/>
    <path d="M32 16H68L64 70H36Z" fill="url(#cnB)" stroke="#141820" stroke-width="3.5" stroke-linejoin="round"/>
    <rect x="28" y="8" width="44" height="13" rx="5" fill="url(#cnB)" stroke="#141820" stroke-width="3"/>
    <ellipse cx="50" cy="10" rx="13" ry="3" fill="#141820"/>
    <rect x="32" y="34" width="36" height="6" fill="url(#rkG)" stroke="#141820" stroke-width="2"/><rect x="34" y="54" width="32" height="6" fill="url(#rkG)" stroke="#141820" stroke-width="2"/>
    <path d="M40 22V66" stroke="#fff" stroke-width="3" opacity=".45" stroke-linecap="round"/>
    <path d="M18 92L28 62H72L82 92Z" fill="url(#hmW)" stroke="#3a1a06" stroke-width="3.5" stroke-linejoin="round"/>
    ${[24, 76].map((x) => `<circle cx="${x}" cy="82" r="14" fill="url(#hmW)" stroke="#3a1a06" stroke-width="3.5"/><path d="M${x - 10} 82H${x + 10}M${x} 72V92M${x - 7} 75L${x + 7} 89M${x + 7} 75L${x - 7} 89" stroke="#5a2a0e" stroke-width="2"/><circle cx="${x}" cy="82" r="4" fill="url(#rkG)" stroke="#3a1a06" stroke-width="2"/>`).join('')}
  </symbol>
  <symbol id="mix" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="46" fill="#b25cff" opacity=".25"/>
    <path d="M18 44A33 33 0 0 1 76 28" stroke="#3a1a06" stroke-width="13" fill="none" stroke-linecap="round"/>
    <path d="M82 56A33 33 0 0 1 24 72" stroke="#3a1a06" stroke-width="13" fill="none" stroke-linecap="round"/>
    <path d="M18 44A33 33 0 0 1 76 28" stroke="url(#rkG)" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M82 56A33 33 0 0 1 24 72" stroke="url(#rkG)" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M66 14L90 24L74 42Z" fill="url(#rkG)" stroke="#3a1a06" stroke-width="3" stroke-linejoin="round"/>
    <path d="M34 86L10 76L26 58Z" fill="url(#rkG)" stroke="#3a1a06" stroke-width="3" stroke-linejoin="round"/>
    <use href="#gem4" x="31" y="31" width="38" height="38"/>
  </symbol>`;

export function installArt() {
  const div = document.createElement('div');
  div.innerHTML = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${gems.join('')}${specials}${obstacles}${PROPS}</defs></svg>`;
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
