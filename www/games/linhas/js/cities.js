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

const COLORS = ['#e4423f', '#2f6fd6', '#f2b51d', '#2fa35b', '#8e4fc4', '#f0782d', '#2bb3c0'];

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
];
