// The cities you can build a network in. World is 1000 × 1600; water polygons are drawn as is.

// A river as a polygon: a centre line widened to `width` on both sides.
function band(line, width) {
  const left = [], right = [];
  for (let i = 0; i < line.length; i++) {
    const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len * width / 2, ny = dx / len * width / 2;
    left.push([line[i][0] + nx, line[i][1] + ny]);
    right.push([line[i][0] - nx, line[i][1] - ny]);
  }
  return left.concat(right.reverse());
}

function lake(cx, cy, rx, ry, n = 22) {
  const p = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, wob = 1 + 0.08 * Math.sin(a * 3);
    p.push([cx + Math.cos(a) * rx * wob, cy + Math.sin(a) * ry * wob]);
  }
  return p;
}

// A canal ring: points on an ellipse from angle a0 to a1 (radians).
function arc(cx, cy, rx, ry, a0, a1, n = 14) {
  const p = [];
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  return p;
}

export const COLORS = ['#e4423f', '#2f6fd6', '#f2b51d', '#2fa35b', '#8e4fc4', '#f0782d', '#2bb3c0'];

export const CITIES = [
  {
    id: 'lisboa', name: 'Lisboa', sub: 'Rio Tejo', unlock: null, bg: '#f3eee4', water: '#a9d3e8',
    landmarks: [{ x: 330, y: 1100, icon: '🏰', name: 'Belém' }, { x: 600, y: 560, icon: '🚋', name: 'Elétrico 28' }],
    climate: { rain: 8 }, rules: [{ week: 4, icon: '⛴️', text: 'Ferries across the Tejo: +2 tunnels', tunnels: 2 }],
    // The Tejo along the bottom, widening into the estuary on the right.
    waterPolys: [
      [[-20, 1265], [180, 1235], [380, 1205], [560, 1190], [720, 1150], [860, 1085], [1020, 1010], [1020, 1620], [-20, 1620]],
    ],
    colors: COLORS,
  },
  {
    id: 'porto', name: 'Porto', sub: 'Rio Douro', unlock: { city: 'lisboa', score: 500 }, bg: '#f1ece6', water: '#9fcbe3',
    landmarks: [{ x: 650, y: 900, icon: '🌉', name: 'Ponte Luís I' }, { x: 420, y: 560, icon: '⛪', name: 'Clérigos' }],
    climate: { rain: 28, fog: 12 }, rules: [{ week: 3, icon: '🎉', text: 'São João: the city is busier from now on', busy: 0.92 }],
    // The Douro snaking across the middle of the city.
    waterPolys: [
      band([[-40, 860], [150, 820], [300, 885], [450, 830], [600, 875], [750, 805], [900, 845], [1040, 800]], 72),
    ],
    colors: COLORS,
  },
  {
    id: 'berlin', name: 'Berlin', sub: 'Spree', unlock: { city: 'porto', score: 500 }, bg: '#eeeee8', water: '#a3cde0',
    landmarks: [{ x: 520, y: 700, icon: '🗼', name: 'Fernsehturm' }, { x: 380, y: 1060, icon: '🏛️', name: 'Brandenburger Tor' }],
    climate: { rain: 12, snow: 18 }, rules: [{ week: 4, icon: '❄️', text: 'The Spree froze over: +3 tunnels', tunnels: 3 }],
    // The Spree winding through, plus two lakes.
    waterPolys: [
      band([[-40, 560], [200, 620], [380, 700], [520, 760], [650, 740], [800, 820], [1040, 905]], 56),
      lake(210, 1310, 150, 120),
      lake(860, 1420, 110, 90),
    ],
    colors: COLORS,
  },
  {
    id: 'london', name: 'London', sub: 'Thames · 2 tunnels', unlock: { city: 'berlin', score: 500 }, bg: '#efede9', water: '#9fc6dc',
    landmarks: [{ x: 520, y: 930, icon: '🕰️', name: 'Big Ben' }, { x: 380, y: 700, icon: '🎡', name: 'London Eye' }],
    climate: { rain: 35, fog: 15 }, rules: [{ week: 3, icon: '⚡', text: 'A new express line opens: drag ⚡ onto a line', express: 1 }],
    // The Thames looping through the middle. Only two tunnels to start with.
    waterPolys: [
      band([[-40, 990], [140, 950], [290, 1010], [400, 1090], [540, 1060], [620, 950], [740, 900], [850, 960], [910, 1080], [1040, 1130]], 62),
    ],
    start: { tunnels: 2 },
    colors: COLORS,
  },
  {
    id: 'paris', name: 'Paris', sub: 'Seine · 1 interchange', unlock: { city: 'london', score: 500 }, bg: '#f2ede2', water: '#a6cfe2',
    landmarks: [{ x: 420, y: 980, icon: '🗼', name: 'Tour Eiffel' }, { x: 640, y: 620, icon: '⛪', name: 'Notre-Dame' }],
    climate: { rain: 20, fog: 6 }, rules: [{ week: 4, icon: '🚄', text: 'The Métro is modernised: all trains run faster', speed: 1.1 }],
    // The Seine arcing up through the city from the south-east. Starts with one interchange.
    waterPolys: [
      band([[1040, 1290], [880, 1180], [740, 1030], [600, 900], [450, 840], [300, 860], [150, 940], [-40, 1060]], 56),
    ],
    start: { interchanges: 1 },
    colors: COLORS,
  },
  {
    id: 'newyork', name: 'New York', sub: 'Two rivers · 5 tunnels', unlock: { city: 'paris', score: 500 }, bg: '#eeece6', water: '#9cc4dc',
    landmarks: [{ x: 520, y: 600, icon: '🌳', name: 'Central Park' }, { x: 500, y: 1300, icon: '🗽', name: 'Liberty' }],
    climate: { rain: 15, snow: 15 }, rules: [{ week: 3, icon: '🚃', text: 'The city never sleeps: +1 carriage, and more people', carriages: 1, busy: 0.93 }],
    // Manhattan between the Hudson and the East River, the bay at the bottom. Lots of tunnels.
    waterPolys: [
      band([[330, -40], [300, 400], [270, 800], [220, 1200], [170, 1640]], 80),
      band([[790, -40], [760, 320], [720, 700], [740, 1000], [820, 1240], [1040, 1380]], 56),
      lake(120, 1560, 300, 170),
    ],
    start: { tunnels: 5 },
    colors: COLORS,
  },
  {
    id: 'tokyo', name: 'Tokyo', sub: 'Fast trains · busy', unlock: { city: 'newyork', score: 500 }, bg: '#f1eee9', water: '#a4cbe0',
    landmarks: [{ x: 420, y: 760, icon: '🗼', name: 'Tokyo Tower' }, { x: 300, y: 1100, icon: '⛩️', name: 'Meiji Jingu' }],
    climate: { rain: 25 }, rules: [{ week: 4, icon: '🚅', text: 'Shinkansen: drag ⚡ onto a line to make it express', express: 1 }],
    // Tokyo Bay in the south-east and the Sumida river. Trains are faster, but so are the crowds.
    waterPolys: [
      [[1040, 980], [920, 1040], [820, 1160], [760, 1320], [780, 1640], [1040, 1640]],
      band([[560, -40], [590, 300], [630, 600], [690, 860], [800, 1060]], 42),
    ],
    speed: 125, busy: 0.8,
    colors: COLORS,
  },
  {
    id: 'madrid', name: 'Madrid', sub: 'Manzanares · dry city', unlock: { city: 'tokyo', score: 500 }, bg: '#f4ede1', water: '#a9d0e0',
    landmarks: [{ x: 330, y: 760, icon: '🏰', name: 'Palacio Real' }, { x: 690, y: 930, icon: '🌳', name: 'El Retiro' }],
    climate: { rain: 6 }, rules: [{ week: 3, icon: '🚃', text: 'Cercanías: +1 carriage', carriages: 1 }],
    // Hardly any water: the little Manzanares in the west and the Retiro pond.
    waterPolys: [
      band([[170, -40], [215, 400], [165, 800], [230, 1200], [300, 1640]], 34),
      lake(700, 830, 55, 34),
    ],
    start: { tunnels: 1 },
    colors: COLORS,
  },
  {
    id: 'roma', name: 'Roma', sub: 'Tevere', unlock: { city: 'madrid', score: 500 }, bg: '#f3eadb', water: '#a6cde0',
    landmarks: [{ x: 640, y: 990, icon: '🏟️', name: 'Colosseo' }, { x: 580, y: 700, icon: '⛲', name: 'Fontana di Trevi' }],
    climate: { rain: 10 }, rules: [{ week: 4, icon: '⛪', text: 'Pilgrims arrive for the Jubilee: the city is busier', busy: 0.9 }],
    // The Tiber snaking down the west side of the centre.
    waterPolys: [
      band([[400, -40], [430, 300], [350, 560], [310, 760], [410, 920], [340, 1120], [390, 1350], [310, 1640]], 46),
    ],
    colors: COLORS,
  },
  {
    id: 'amsterdam', name: 'Amsterdam', sub: 'Canals · 7 tunnels', unlock: { city: 'roma', score: 500 }, bg: '#efede6', water: '#9ec7dd',
    landmarks: [{ x: 470, y: 960, icon: '🖼️', name: 'Rijksmuseum' }, { x: 500, y: 540, icon: '🚲', name: 'Dam' }],
    climate: { rain: 30, fog: 10 }, rules: [{ week: 4, icon: '🌉', text: 'New bridges over the grachten: +3 tunnels', tunnels: 3 }],
    // The IJ at the top, three canal rings around the centre and the Amstel flowing in from the south.
    waterPolys: [
      band([[-40, 420], [300, 445], [600, 405], [1040, 430]], 90),
      band(arc(500, 440, 200, 210, 0, Math.PI), 22),
      band(arc(500, 440, 290, 300, 0, Math.PI), 22),
      band(arc(500, 440, 380, 400, 0, Math.PI), 22),
      band([[560, 1640], [590, 1300], [545, 1050], [560, 840]], 40),
    ],
    start: { tunnels: 7 },
    colors: COLORS,
  },
  {
    id: 'rio', name: 'Rio de Janeiro', sub: 'Bay and beaches', unlock: { city: 'amsterdam', score: 500 }, bg: '#f2efe3', water: '#8fcbe0',
    landmarks: [{ x: 300, y: 880, icon: '⛰️', name: 'Corcovado' }, { x: 580, y: 1220, icon: '🏖️', name: 'Copacabana' }],
    climate: { rain: 18 }, rules: [{ week: 3, icon: '🎭', text: 'Carnaval! The city is busier from now on', busy: 0.9 }],
    // The Atlantic along the bottom, Guanabara Bay on the right and the Lagoa in between.
    waterPolys: [
      [[-20, 1300], [200, 1265], [350, 1330], [520, 1285], [700, 1345], [1020, 1255], [1020, 1620], [-20, 1620]],
      [[1020, 300], [830, 380], [760, 620], [800, 900], [880, 1080], [1020, 1120]],
      lake(420, 1150, 90, 55),
    ],
    colors: COLORS,
  },
  {
    id: 'saopaulo', name: 'São Paulo', sub: 'Megacity · 4 lines · busy', unlock: { city: 'rio', score: 500 }, bg: '#efede8', water: '#a2c9dc',
    landmarks: [{ x: 560, y: 880, icon: '🏙️', name: 'Avenida Paulista' }, { x: 500, y: 1120, icon: '🌳', name: 'Ibirapuera' }],
    climate: { rain: 22, fog: 6 }, rules: [{ week: 4, icon: '⚡', text: 'A new express line: drag ⚡ onto a line', express: 1 }],
    // The Tietê across the north and the Pinheiros down the west. A huge, busy city.
    waterPolys: [
      band([[-40, 420], [250, 460], [500, 430], [750, 470], [1040, 440]], 40),
      band([[255, 460], [225, 800], [260, 1150], [200, 1640]], 34),
    ],
    start: { lines: 4 }, busy: 0.85,
    colors: COLORS,
  },
  {
    id: 'istanbul', name: 'İstanbul', sub: 'Bosphorus · tunnels cost 2', unlock: { city: 'saopaulo', score: 500 }, bg: '#f2ece2', water: '#97c3dc',
    landmarks: [{ x: 420, y: 920, icon: '🕌', name: 'Ayasofya' }, { x: 470, y: 590, icon: '🗼', name: 'Galata' }],
    climate: { rain: 18, snow: 6, fog: 6 }, rules: [{ week: 4, icon: '🚇', text: 'Marmaray opens under the Bosphorus: +4 tunnels', tunnels: 4 }],
    // Europe and Asia: the wide Bosphorus, the Golden Horn and the Sea of Marmara. Every crossing needs two tunnels.
    waterPolys: [
      band([[640, -40], [610, 300], [570, 600], [610, 900], [550, 1200], [510, 1420]], 80),
      band([[575, 760], [430, 700], [300, 725], [140, 640]], 34),
      [[-20, 1390], [300, 1350], [500, 1390], [800, 1365], [1020, 1405], [1020, 1620], [-20, 1620]],
    ],
    start: { tunnels: 6 }, tunnelCost: 2,
    colors: COLORS,
  },
  {
    id: 'hongkong', name: 'Hong Kong', sub: 'Harbour · ferries', unlock: { city: 'istanbul', score: 500 }, bg: '#eff0ec', water: '#98c6dd',
    landmarks: [{ x: 360, y: 1110, icon: '⛰️', name: 'Victoria Peak' }, { x: 560, y: 700, icon: '⛴️', name: 'Star Ferry' }],
    climate: { rain: 30, fog: 10 }, rules: [{ week: 3, icon: '✈️', text: 'The Airport Express opens: drag ⚡ onto a line', express: 1 }],
    // Victoria Harbour between Kowloon and the island. No tunnels needed: lines cross by ferry, slowly.
    waterPolys: [
      band([[-40, 880], [200, 840], [400, 865], [600, 830], [800, 870], [1040, 840]], 130),
    ],
    start: { tunnels: 0 }, ferry: true, busy: 0.9,
    colors: COLORS,
  },
];

// Stars for each city: passengers delivered in one game.
export const GOALS = [300, 800, 1500];

// Colour-blind friendly line colours (Okabe & Ito), in the same order as COLORS.
export const CB_COLORS = ['#d55e00', '#0072b2', '#f0e442', '#009e73', '#cc79a7', '#e69f00', '#56b4e9'];
