// The dragon rider fortress you restore with stars. Each area is a scene with tasks; each task adds
// something to the picture. x/y are % of the scene, s = size in % of scene width.
export const AREAS = [
  {
    name: 'The Old Gate', sky: ['#ffb38a', '#7a5cff'], ground: '#5c6b4a',
    tasks: [
      { name: 'Clear the rubble', cost: 1, art: 'rubble', icon: '🪨', x: 20, y: 74, s: 12 },
      { name: 'Repair the gate', cost: 2, art: 'gate', icon: '🚪', x: 50, y: 58, s: 22 },
      { name: 'Light the torches', cost: 1, art: 'torch', icon: '🔥', x: 30, y: 62, s: 10 },
      { name: 'Second torch', cost: 1, art: 'torch', icon: '🔥', x: 70, y: 62, s: 10 },
      { name: 'Raise the banner', cost: 2, art: 'banner', icon: '🚩', x: 82, y: 64, s: 12 },
      { name: 'Plant mountain pines', cost: 2, art: 'pines', icon: '🌲', x: 10, y: 64, s: 16 },
    ],
  },
  {
    name: 'Training Yard', sky: ['#9ad8ff', '#4a7bd8'], ground: '#a08a5c',
    tasks: [
      { name: 'Sweep the yard', cost: 1, art: 'broom', icon: '🧹', x: 18, y: 78, s: 10 },
      { name: 'Weapon rack', cost: 2, art: 'rack', icon: '⚔️', x: 30, y: 56, s: 16 },
      { name: 'Archery target', cost: 2, art: 'target', icon: '🎯', x: 72, y: 54, s: 16 },
      { name: 'Shield wall', cost: 2, art: 'shield', icon: '🛡️', x: 50, y: 57, s: 14 },
      { name: 'Riding saddle', cost: 3, art: 'saddle', icon: '🏇', x: 50, y: 74, s: 16 },
      { name: 'Victory bell', cost: 2, art: 'bell', icon: '🔔', x: 88, y: 64, s: 11 },
    ],
  },
  {
    name: 'The Library', sky: ['#5a3a8a', '#1e1240'], ground: '#4a2f2a', dark: true,
    tasks: [
      { name: 'Dust the shelves', cost: 1, art: 'books', icon: '📚', x: 22, y: 58, s: 18 },
      { name: 'Candles', cost: 1, art: 'candles', icon: '🕯️', x: 85, y: 76, s: 10 },
      { name: 'Reading desk', cost: 2, art: 'desk', icon: '🪑', x: 50, y: 70, s: 14 },
      { name: 'Ancient scroll', cost: 2, art: 'scroll', icon: '📜', x: 70, y: 62, s: 12 },
      { name: 'Star map', cost: 2, art: 'starmap', icon: '🗺️', x: 76, y: 36, s: 14 },
      { name: 'Crystal orb', cost: 3, art: 'orb', icon: '🔮', x: 30, y: 74, s: 12 },
    ],
  },
  {
    name: 'Dragon Nest', sky: ['#ff7a4a', '#8a1a3a'], ground: '#5a3a2a',
    tasks: [
      { name: 'Build the nest', cost: 2, art: 'nest', icon: '🪺', x: 50, y: 68, s: 22 },
      { name: 'Find the egg', cost: 3, art: 'egg', icon: '🥚', x: 50, y: 58, s: 12 },
      { name: 'Fire pit', cost: 2, art: 'firepit', icon: '🔥', x: 20, y: 72, s: 12 },
      { name: 'Treasure pile', cost: 2, art: 'treasure', icon: '💎', x: 80, y: 72, s: 12 },
      { name: 'Wake the dragon', cost: 4, art: 'dragon', icon: '🐉', x: 50, y: 34, s: 30 },
    ],
  },
  {
    name: 'Great Hall', sky: ['#ffd38a', '#c2603a'], ground: '#6b3a2a',
    tasks: [
      { name: 'Long table', cost: 2, art: 'table', icon: '🍽️', x: 50, y: 72, s: 14 },
      { name: 'Feast', cost: 2, art: 'feast', icon: '🍲', x: 34, y: 68, s: 11 },
      { name: 'Banners of the houses', cost: 2, art: 'housebanners', icon: '🎏', x: 20, y: 34, s: 14 },
      { name: 'Music', cost: 2, art: 'music', icon: '🎻', x: 80, y: 63, s: 12 },
      { name: 'Golden chandelier', cost: 3, art: 'chandelier', icon: '🪔', x: 50, y: 24, s: 14 },
      { name: 'Rider’s crown', cost: 3, art: 'crown', icon: '👑', x: 66, y: 44, s: 12 },
    ],
  },
  {
    name: 'Sky Tower', sky: ['#2a3a8a', '#0a0a2a'], ground: '#3a3a5a', dark: true,
    tasks: [
      { name: 'Fix the stairs', cost: 2, art: 'stairs', icon: '🪜', x: 24, y: 66, s: 16 },
      { name: 'Telescope', cost: 2, art: 'telescope', icon: '🔭', x: 72, y: 58, s: 14 },
      { name: 'Moon window', cost: 2, art: 'moonwindow', icon: '🌙', x: 30, y: 24, s: 12 },
      { name: 'Wind chimes', cost: 2, art: 'chimes', icon: '🎐', x: 56, y: 34, s: 10 },
      { name: 'Flight lessons', cost: 3, art: 'wings', icon: '🪽', x: 80, y: 30, s: 14 },
      { name: 'Signal fire', cost: 3, art: 'signalfire', icon: '🔥', x: 50, y: 70, s: 14 },
    ],
  },
  {
    name: 'Crystal Caves', sky: ['#3ad8d8', '#1a3a6a'], ground: '#2a4a5a',
    tasks: [
      { name: 'Light the cave', cost: 2, art: 'cavelight', icon: '💡', x: 50, y: 30, s: 10 },
      { name: 'Crystal bridge', cost: 3, art: 'bridge', icon: '🌉', x: 50, y: 62, s: 24 },
      { name: 'Gem garden', cost: 2, art: 'gemgarden', icon: '💎', x: 28, y: 70, s: 12 },
      { name: 'Glowing mushrooms', cost: 2, art: 'mushrooms', icon: '🍄', x: 70, y: 76, s: 12 },
      { name: 'Hidden waterfall', cost: 3, art: 'waterfall', icon: '💧', x: 86, y: 63, s: 12 },
      { name: 'Ancient rune stone', cost: 3, art: 'rune', icon: '🗿', x: 12, y: 64, s: 14 },
    ],
  },
  {
    name: 'Dragon Festival', sky: ['#ff8ad8', '#5a3aff'], ground: '#4a6a3a',
    tasks: [
      { name: 'Fireworks', cost: 2, art: 'fireworks', icon: '🎆', x: 24, y: 24, s: 16 },
      { name: 'Lanterns', cost: 2, art: 'lanterns', icon: '🏮', x: 74, y: 30, s: 12 },
      { name: 'Festival tent', cost: 3, art: 'tent', icon: '🎪', x: 50, y: 58, s: 24 },
      { name: 'Dragon cake', cost: 2, art: 'cake', icon: '🎂', x: 24, y: 74, s: 12 },
      { name: 'Trophy', cost: 3, art: 'trophy', icon: '🏆', x: 78, y: 72, s: 12 },
      { name: 'Your dragon’s crown', cost: 4, art: 'dragon2', icon: '🐲', x: 50, y: 30, s: 22 },
    ],
  },
];

/** Which area is current, given the list of built task keys ("a:t"). */
export function currentArea(built) {
  for (let a = 0; a < AREAS.length; a++) if (AREAS[a].tasks.some((_, t) => !built.includes(a + ':' + t))) return a;
  return AREAS.length; // all done
}

/** The picture for a task (an SVG symbol from props.js). */
export const propArt = (t) => `<svg viewBox="0 0 100 100"><use href="#p-${t.art}"/></svg>`;

/** Draws the scene for area a into el. */
export function renderScene(el, a, built, justBuilt) {
  const A = AREAS[a];
  el.style.setProperty('--sky1', A.sky[0]);
  el.style.setProperty('--sky2', A.sky[1]);
  el.style.setProperty('--ground', A.ground);
  el.classList.toggle('dark', !!A.dark);
  el.innerHTML = `<svg class="mount" viewBox="0 0 100 60" preserveAspectRatio="none">
      <path d="M0 60L0 34L14 18L24 28L38 8L52 26L62 16L76 30L88 14L100 26L100 60Z" fill="#000" opacity=".22"/>
      <path d="M0 60L0 44L18 30L32 40L48 26L64 40L80 30L100 42L100 60Z" fill="#000" opacity=".2"/>
      <path d="M38 8L44 16L40 15L36 18L32 14Z M88 14L93 20L89 19L85 21Z" fill="#fff" opacity=".7"/>
    </svg><div class="ground"></div>`;
  A.tasks.forEach((t, i) => {
    const d = document.createElement('div');
    const done = built.includes(a + ':' + i);
    d.className = 'item' + (done ? ' on' : '') + (justBuilt === i ? ' new' : '');
    d.style.left = t.x + '%';
    d.style.top = t.y + '%';
    d.style.width = d.style.height = `calc(${t.s} * 1.2 * var(--sw) / 100)`;
    d.innerHTML = propArt(t);
    el.appendChild(d);
  });
}
