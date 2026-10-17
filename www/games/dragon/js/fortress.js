// The dragon rider fortress you restore with stars. Each area is a scene with tasks; each task adds
// something to the picture. x/y are % of the scene, s = size in % of scene width.
export const AREAS = [
  {
    name: 'The Old Gate', sky: ['#ffb38a', '#7a5cff'], ground: '#5c6b4a',
    intro: 'You climb the last steps to the forgotten fortress of the dragon riders. It needs you.',
    tasks: [
      { name: 'Clear the rubble', cost: 1, icon: '🪨', x: 20, y: 74, s: 12, say: 'The path is open. The gate is next.' },
      { name: 'Repair the gate', cost: 2, icon: '🚪', x: 50, y: 58, s: 22, say: 'The old gate creaks open after a hundred years.' },
      { name: 'Light the torches', cost: 1, icon: '🔥', x: 30, y: 52, s: 10, say: 'Warm light! Something far away roars back.' },
      { name: 'Second torch', cost: 1, icon: '🔥', x: 70, y: 52, s: 10, say: 'Now the gate glows from both sides.' },
      { name: 'Raise the banner', cost: 2, icon: '🚩', x: 82, y: 30, s: 12, say: 'Your banner flies over the fortress again.' },
      { name: 'Plant mountain pines', cost: 2, icon: '🌲', x: 10, y: 60, s: 16, say: 'Pines for shade, and for hiding from wild dragons.' },
    ],
  },
  {
    name: 'Training Yard', sky: ['#9ad8ff', '#4a7bd8'], ground: '#a08a5c',
    intro: 'Every rider trains here first. Sword, bow and shield, then wings.',
    tasks: [
      { name: 'Sweep the yard', cost: 1, icon: '🧹', x: 18, y: 78, s: 10, say: 'Clean stones, ready for practice.' },
      { name: 'Weapon rack', cost: 2, icon: '⚔️', x: 30, y: 56, s: 16, say: 'Two swords, polished and sharp.' },
      { name: 'Archery target', cost: 2, icon: '🎯', x: 72, y: 54, s: 16, say: 'Bullseye on your first try!' },
      { name: 'Shield wall', cost: 2, icon: '🛡️', x: 50, y: 46, s: 14, say: 'Shields painted with dragon scales.' },
      { name: 'Riding saddle', cost: 3, icon: '🏇', x: 50, y: 74, s: 16, say: 'A saddle big enough for a dragon. One day.' },
      { name: 'Victory bell', cost: 2, icon: '🔔', x: 86, y: 30, s: 11, say: 'Ring it after every hard lesson.' },
    ],
  },
  {
    name: 'The Library', sky: ['#5a3a8a', '#1e1240'], ground: '#4a2f2a', dark: true,
    intro: 'Old books tell of a sleeping egg hidden somewhere in the mountain.',
    tasks: [
      { name: 'Dust the shelves', cost: 1, icon: '📚', x: 22, y: 50, s: 18, say: 'Thousands of books about dragons!' },
      { name: 'Candles', cost: 1, icon: '🕯️', x: 48, y: 40, s: 10, say: 'Read by candlelight, like the old riders.' },
      { name: 'Reading desk', cost: 2, icon: '🪑', x: 50, y: 70, s: 14, say: 'A quiet place to study.' },
      { name: 'Ancient scroll', cost: 2, icon: '📜', x: 74, y: 62, s: 12, say: 'The scroll shows a map to the Dragon Nest.' },
      { name: 'Star map', cost: 2, icon: '🗺️', x: 76, y: 36, s: 14, say: 'The stars line up above the nest tonight.' },
      { name: 'Crystal orb', cost: 3, icon: '🔮', x: 30, y: 74, s: 12, say: 'In the orb you see a golden egg, glowing.' },
    ],
  },
  {
    name: 'Dragon Nest', sky: ['#ff7a4a', '#8a1a3a'], ground: '#5a3a2a',
    intro: 'High above the clouds lies the nest. And something is still warm in it.',
    tasks: [
      { name: 'Build the nest', cost: 2, icon: '🪺', x: 50, y: 68, s: 22, say: 'A nest of branches and soft moss.' },
      { name: 'Find the egg', cost: 3, icon: '🥚', x: 50, y: 58, s: 12, say: 'The egg! It is warm and it is moving.' },
      { name: 'Fire pit', cost: 2, icon: '🔥', x: 20, y: 72, s: 12, say: 'Dragon eggs love fire. It glows brighter.' },
      { name: 'Treasure pile', cost: 2, icon: '💎', x: 80, y: 72, s: 12, say: 'Every dragon needs a little treasure.' },
      { name: 'Wake the dragon', cost: 4, icon: '🐉', x: 50, y: 34, s: 30, say: 'CRACK! Your dragon is born. It chose you.' },
    ],
  },
  {
    name: 'Great Hall', sky: ['#ffd38a', '#c2603a'], ground: '#6b3a2a',
    intro: 'Riders from far away want to meet you and your dragon. Prepare the hall!',
    tasks: [
      { name: 'Long table', cost: 2, icon: '🍽️', x: 50, y: 72, s: 14, say: 'A table for a hundred riders.' },
      { name: 'Feast', cost: 2, icon: '🍲', x: 34, y: 68, s: 11, say: 'Soup, bread and roasted chestnuts.' },
      { name: 'Banners of the houses', cost: 2, icon: '🎏', x: 20, y: 34, s: 14, say: 'Each house brings its colours.' },
      { name: 'Music', cost: 2, icon: '🎻', x: 80, y: 56, s: 12, say: 'Songs about the first dragon riders.' },
      { name: 'Golden chandelier', cost: 3, icon: '🪔', x: 50, y: 24, s: 14, say: 'The hall shines like dragon gold.' },
      { name: 'Rider’s crown', cost: 3, icon: '👑', x: 66, y: 44, s: 12, say: 'They name you Rider of the Mountain!' },
    ],
  },
  {
    name: 'Sky Tower', sky: ['#2a3a8a', '#0a0a2a'], ground: '#3a3a5a', dark: true,
    intro: 'From the tower you can see every kingdom. Your dragon wants to fly.',
    tasks: [
      { name: 'Fix the stairs', cost: 2, icon: '🪜', x: 24, y: 66, s: 16, say: 'Three hundred steps. Your legs hurt!' },
      { name: 'Telescope', cost: 2, icon: '🔭', x: 72, y: 58, s: 14, say: 'You can see a storm coming from the east.' },
      { name: 'Moon window', cost: 2, icon: '🌙', x: 30, y: 24, s: 12, say: 'Moonlight fills the tower.' },
      { name: 'Wind chimes', cost: 2, icon: '🎐', x: 56, y: 34, s: 10, say: 'They sing when dragons fly past.' },
      { name: 'Flight lessons', cost: 3, icon: '🪽', x: 80, y: 30, s: 14, say: 'You fly! Above the clouds, holding on tight.' },
      { name: 'Signal fire', cost: 3, icon: '🔥', x: 50, y: 70, s: 14, say: 'Now every rider knows: the fortress is alive.' },
    ],
  },
  {
    name: 'Crystal Caves', sky: ['#3ad8d8', '#1a3a6a'], ground: '#2a4a5a',
    intro: 'Deep under the fortress the walls are full of the same gems you match.',
    tasks: [
      { name: 'Light the cave', cost: 2, icon: '💡', x: 50, y: 30, s: 10, say: 'The crystals sparkle in every colour.' },
      { name: 'Crystal bridge', cost: 3, icon: '🌉', x: 50, y: 62, s: 24, say: 'A bridge over the underground river.' },
      { name: 'Gem garden', cost: 2, icon: '💎', x: 22, y: 70, s: 12, say: 'Rubies and sapphires growing like flowers.' },
      { name: 'Glowing mushrooms', cost: 2, icon: '🍄', x: 80, y: 72, s: 12, say: 'Your dragon thinks they are snacks.' },
      { name: 'Hidden waterfall', cost: 3, icon: '💧', x: 80, y: 40, s: 12, say: 'Fresh water for thirsty dragons.' },
      { name: 'Ancient rune stone', cost: 3, icon: '🗿', x: 22, y: 42, s: 14, say: 'The runes say: one rider, one dragon, forever.' },
    ],
  },
  {
    name: 'Dragon Festival', sky: ['#ff8ad8', '#5a3aff'], ground: '#4a6a3a',
    intro: 'The fortress is restored. Time to celebrate with all the dragons!',
    tasks: [
      { name: 'Fireworks', cost: 2, icon: '🎆', x: 24, y: 24, s: 16, say: 'Dragons breathe fireworks into the sky!' },
      { name: 'Lanterns', cost: 2, icon: '🏮', x: 74, y: 30, s: 12, say: 'A thousand lanterns float away.' },
      { name: 'Festival tent', cost: 3, icon: '🎪', x: 50, y: 58, s: 24, say: 'Games, food and dragon rides for everyone.' },
      { name: 'Dragon cake', cost: 2, icon: '🎂', x: 24, y: 74, s: 12, say: 'Spicy cake. Dragons only.' },
      { name: 'Trophy', cost: 3, icon: '🏆', x: 78, y: 72, s: 12, say: 'Winner of the great dragon race: you!' },
      { name: 'Your dragon’s crown', cost: 4, icon: '🐲', x: 50, y: 30, s: 22, say: 'Your dragon is grown up now. The adventure goes on.' },
    ],
  },
];

/** Which area is current, given the list of built task keys ("a:t"). */
export function currentArea(built) {
  for (let a = 0; a < AREAS.length; a++) if (AREAS[a].tasks.some((_, t) => !built.includes(a + ':' + t))) return a;
  return AREAS.length; // all done
}

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
    d.style.fontSize = `calc(${t.s} * var(--sw) / 100)`;
    d.textContent = t.icon;
    el.appendChild(d);
  });
}
