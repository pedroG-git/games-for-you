// All the pictures, drawn as SVG symbols (viewBox 0 0 100 100). Injected once into the page as <defs>.
const grad = (id, stops, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
const rgrad = (id, stops, cx = 0.4, cy = 0.35) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="0.7">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</radialGradient>`;
const shine = '<ellipse cx="36" cy="28" rx="14" ry="7" fill="#fff" opacity=".55" transform="rotate(-25 36 28)"/><circle cx="70" cy="70" r="3" fill="#fff" opacity=".5"/>';

// Gems: ruby, sapphire, emerald, amber, amethyst, pearl (each its own shape, so colours aren't the only cue).
export const GEM_COLORS = ['#ff3b5c', '#3d8bff', '#2ed47a', '#ffb627', '#b25cff', '#f4eef8'];
export const GEM_NAMES = ['Ruby', 'Sapphire', 'Emerald', 'Amber', 'Amethyst', 'Pearl'];
const gems = [
  // ruby: round brilliant
  `${grad('g0a', [[0, '#ff8a9c'], [0.5, '#ff2d55'], [1, '#a3002a']])}
   <symbol id="gem0" viewBox="0 0 100 100"><polygon points="50,6 81,18 94,50 81,82 50,94 19,82 6,50 19,18" fill="url(#g0a)" stroke="#7a0020" stroke-width="3"/>
   <polygon points="50,26 67,33 74,50 67,67 50,74 33,67 26,50 33,33" fill="#ff5c78" opacity=".75"/>
   <path d="M50 6L50 26M81 18L67 33M94 50L74 50M81 82L67 67M50 94L50 74M19 82L33 67M6 50L26 50M19 18L33 33" stroke="#ffd0d8" stroke-width="2" opacity=".5"/>${shine}</symbol>`,
  // sapphire: drop
  `${grad('g1a', [[0, '#9cc8ff'], [0.5, '#2f7bff'], [1, '#0a2f8a']])}
   <symbol id="gem1" viewBox="0 0 100 100"><path d="M50 5C62 26 84 44 84 64A34 32 0 0 1 16 64C16 44 38 26 50 5Z" fill="url(#g1a)" stroke="#06226b" stroke-width="3"/>
   <path d="M50 30C57 42 68 52 68 63A18 17 0 0 1 32 63C32 52 43 42 50 30Z" fill="#5d9dff" opacity=".7"/>${shine}</symbol>`,
  // emerald: step cut rectangle
  `${grad('g2a', [[0, '#8dffc0'], [0.5, '#1fc46a'], [1, '#04673a']])}
   <symbol id="gem2" viewBox="0 0 100 100"><polygon points="28,8 72,8 90,26 90,74 72,92 28,92 10,74 10,26" fill="url(#g2a)" stroke="#034d2b" stroke-width="3"/>
   <polygon points="36,24 64,24 74,34 74,66 64,76 36,76 26,66 26,34" fill="#3fe08a" opacity=".7"/>
   <path d="M28 8L36 24M72 8L64 24M90 26L74 34M90 74L74 66M72 92L64 76M28 92L36 76M10 74L26 66M10 26L26 34" stroke="#d6ffe8" stroke-width="2" opacity=".45"/>${shine}</symbol>`,
  // amber: triangle (trillion)
  `${grad('g3a', [[0, '#ffe58a'], [0.5, '#ffad14'], [1, '#b35c00']])}
   <symbol id="gem3" viewBox="0 0 100 100"><path d="M50 8Q55 8 58 13L93 77Q96 86 86 88L14 88Q4 86 7 77L42 13Q45 8 50 8Z" fill="url(#g3a)" stroke="#8a4300" stroke-width="3"/>
   <polygon points="50,34 72,74 28,74" fill="#ffd04d" opacity=".75"/>${shine}</symbol>`,
  // amethyst: kite
  `${grad('g4a', [[0, '#e3b8ff'], [0.5, '#9d3bff'], [1, '#4a0f8a']])}
   <symbol id="gem4" viewBox="0 0 100 100"><polygon points="50,4 88,40 50,96 12,40" fill="url(#g4a)" stroke="#3a0870" stroke-width="3" stroke-linejoin="round"/>
   <polygon points="50,22 70,41 50,74 30,41" fill="#b86dff" opacity=".75"/><path d="M12 40L88 40M50 4L50 22" stroke="#f1dcff" stroke-width="2" opacity=".5"/>${shine}</symbol>`,
  // pearl: sphere
  `${rgrad('g5a', [[0, '#ffffff'], [0.55, '#f1e6f5'], [1, '#b7a3c4']])}
   <symbol id="gem5" viewBox="0 0 100 100"><circle cx="50" cy="52" r="40" fill="url(#g5a)" stroke="#8c7a99" stroke-width="3"/>
   <ellipse cx="50" cy="70" rx="26" ry="10" fill="#ffd9ec" opacity=".45"/>${shine}</symbol>`,
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
