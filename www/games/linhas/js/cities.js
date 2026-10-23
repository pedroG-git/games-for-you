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

export const COLORS = ['#e4423f', '#2f6fd6', '#f2b51d', '#2fa35b', '#8e4fc4', '#f0782d', '#2bb3c0'];

export const CITIES = [
  {
    id: 'lisboa', name: 'Lisboa', sub: 'Rio Tejo', unlock: null, bg: '#f3eee4', water: '#a9d3e8',
    // The Tejo along the bottom, widening into the estuary on the right.
    waterPolys: [
      [[-20, 1265], [180, 1235], [380, 1205], [560, 1190], [720, 1150], [860, 1085], [1020, 1010], [1020, 1620], [-20, 1620]],
    ],
    colors: COLORS,
  },
  {
    id: 'porto', name: 'Porto', sub: 'Rio Douro', unlock: { city: 'lisboa', score: 500 }, bg: '#f1ece6', water: '#9fcbe3',
    // The Douro snaking across the middle of the city.
    waterPolys: [
      band([[-40, 860], [150, 820], [300, 885], [450, 830], [600, 875], [750, 805], [900, 845], [1040, 800]], 72),
    ],
    colors: COLORS,
  },
  {
    id: 'berlin', name: 'Berlin', sub: 'Spree', unlock: { city: 'porto', score: 500 }, bg: '#eeeee8', water: '#a3cde0',
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
    // The Thames looping through the middle. Only two tunnels to start with.
    waterPolys: [
      band([[-40, 990], [140, 950], [290, 1010], [400, 1090], [540, 1060], [620, 950], [740, 900], [850, 960], [910, 1080], [1040, 1130]], 62),
    ],
    start: { tunnels: 2 },
    colors: COLORS,
  },
  {
    id: 'paris', name: 'Paris', sub: 'Seine · 1 interchange', unlock: { city: 'london', score: 500 }, bg: '#f2ede2', water: '#a6cfe2',
    // The Seine arcing up through the city from the south-east. Starts with one interchange.
    waterPolys: [
      band([[1040, 1290], [880, 1180], [740, 1030], [600, 900], [450, 840], [300, 860], [150, 940], [-40, 1060]], 56),
    ],
    start: { interchanges: 1 },
    colors: COLORS,
  },
  {
    id: 'newyork', name: 'New York', sub: 'Two rivers · 5 tunnels', unlock: { city: 'paris', score: 500 }, bg: '#eeece6', water: '#9cc4dc',
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
    // Tokyo Bay in the south-east and the Sumida river. Trains are faster, but so are the crowds.
    waterPolys: [
      [[1040, 980], [920, 1040], [820, 1160], [760, 1320], [780, 1640], [1040, 1640]],
      band([[560, -40], [590, 300], [630, 600], [690, 860], [800, 1060]], 42),
    ],
    speed: 125, busy: 0.8,
    colors: COLORS,
  },
];

// Stars for each city: passengers delivered in one game.
export const GOALS = [300, 800, 1500];

// Colour-blind friendly line colours (Okabe & Ito), in the same order as COLORS.
export const CB_COLORS = ['#d55e00', '#0072b2', '#f0e442', '#009e73', '#cc79a7', '#e69f00', '#56b4e9'];
