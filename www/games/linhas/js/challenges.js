// Challenges: the weekly challenge (same city and twists for everyone, all week), puzzles with a goal, and creative mode.
import { CITIES } from './cities.js';

// Twists the weekly challenge picks two of. `wet` twists only come up in cities marked dryOk.
export const TWISTS = [
  { id: 'few', icon: '4️⃣', text: 'Never more than 4 lines', mods: { maxLines: 4 } },
  { id: 'dry', icon: '🚫', text: 'No tunnels at all', mods: { noTunnels: true, tunnels: 0 }, wet: true },
  { id: 'fast', icon: '⏩', text: 'Trains run 20% faster', mods: { speed: 1.2 } },
  { id: 'busy', icon: '👥', text: 'A much busier city', mods: { busy: 0.82 } },
  { id: 'exp', icon: '⚡', text: 'Start with an express line', mods: { express: 1 } },
  { id: 'two', icon: '2️⃣', text: 'Start with only 2 lines', mods: { lines: 2 } },
];

const mix = (n) => { n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); return (n ^ (n >>> 16)) >>> 0; };

// The week number (Monday to Sunday) as YYYYWW.
export function weekId(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear(), w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return y * 100 + w;
}

// This week's challenge: { seed, city, twists, mods }.
export function weekly(id = weekId()) {
  const h = mix(id), city = CITIES[h % CITIES.length];
  const wet = !city.dryOk; // "no tunnels" only where the water doesn't cut the city in two
  const pool = TWISTS.filter((t) => !(wet && t.wet));
  const a = pool[(h >>> 8) % pool.length];
  const rest = pool.filter((t) => t !== a && !(a.id === 'two' && t.id === 'few') && !(a.id === 'few' && t.id === 'two'));
  const b = rest[(h >>> 16) % rest.length];
  return { seed: id, city: city.id, twists: [a, b], mods: { ...a.mods, ...b.mods } };
}

// Puzzles: a fixed city and seed (so the stations always appear in the same places), a few rules and a goal.
// Each one opens when the one before it is solved.
export const PUZZLES = [
  { id: 'p1', icon: '🚋', name: 'Two lines', city: 'lisboa', seed: 41, goal: 220, weeks: 3, text: 'Only 2 lines. 220 home by the end of week 3.', mods: { lines: 2, maxLines: 2 } },
  { id: 'p2', icon: '🚫', name: 'No tunnels', city: 'madrid', seed: 7, goal: 450, weeks: 4, text: 'No tunnels under the Manzanares. 450 home in 4 weeks.', mods: { noTunnels: true, tunnels: 0 } },
  { id: 'p3', icon: '🌉', name: 'One crossing', city: 'london', seed: 12, goal: 450, weeks: 4, text: 'One tunnel under the Thames. 450 home in 4 weeks.', mods: { tunnels: 1, noTunnels: true } },
  { id: 'p4', icon: '👥', name: 'Rush city', city: 'tokyo', seed: 4, goal: 600, weeks: 4, text: 'A very busy Tokyo. 600 home in 4 weeks.', mods: { busy: 0.88 } },
  { id: 'p5', icon: '⚡', name: 'Express Métro', city: 'paris', seed: 21, goal: 750, weeks: 5, text: 'Two express lines, never more than 4 lines. 750 in 5 weeks.', mods: { express: 2, maxLines: 4 } },
  { id: 'p6', icon: '⛴️', name: 'Harbour hop', city: 'hongkong', seed: 9, goal: 600, weeks: 5, text: 'Ferries only, at most 3 lines. 600 home in 5 weeks.', mods: { maxLines: 3 } },
  { id: 'p7', icon: '🕌', name: 'Two continents', city: 'istanbul', seed: 5, goal: 400, weeks: 5, text: 'Tunnels cost double. 400 home in 5 weeks.', mods: {} },
  { id: 'p8', icon: '🌷', name: 'Canal maze', city: 'amsterdam', seed: 22, goal: 600, weeks: 6, text: 'Bridges are precious. 600 home in 6 weeks.', mods: { tunnels: 5 } },
];
