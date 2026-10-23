// Achievements and the daily streak. Saved in localStorage: 'linhas-ach' {id: time}, 'linhas-stats' {cities, days}.
import { crossings, MAX_CARS } from './engine.js';

const load = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } };
const trains = (S) => S.lines.reduce((n, l) => n + l.trains.length, 0);

// test(S, x): x = { night, cities, streak, stars, end } — S is the game being played.
export const ACH = [
  { id: 'first', icon: '🚆', name: 'All aboard', desc: 'Draw your first line', test: (S) => S.lines.length > 0 },
  { id: 'p100', icon: '👤', name: 'Rush hour', desc: '100 passengers home in one game', test: (S) => S.score >= 100 },
  { id: 'p500', icon: '👥', name: 'Commuter city', desc: '500 passengers in one game', test: (S) => S.score >= 500 },
  { id: 'p1000', icon: '🏙️', name: 'Metropolis', desc: '1000 passengers in one game', test: (S) => S.score >= 1000 },
  { id: 'p2000', icon: '🌆', name: 'Megacity', desc: '2000 passengers in one game', test: (S) => S.score >= 2000 },
  { id: 'w5', icon: '📆', name: 'Five weeks', desc: 'Reach week 5 in Normal or Daily', test: (S) => S.mode !== 'relaxed' && S.week >= 4 },
  { id: 'w10', icon: '🗓️', name: 'Ten weeks', desc: 'Reach week 10 in Normal or Daily', test: (S) => S.mode !== 'relaxed' && S.week >= 9 },
  { id: 'w20', icon: '🧘', name: 'Slow and steady', desc: 'Reach week 20 in Relaxed', test: (S) => S.mode === 'relaxed' && S.week >= 19 },
  { id: 'loop', icon: '⭕', name: 'Round and round', desc: 'Close a line into a loop', test: (S) => S.lines.some((l) => l.loop) },
  { id: 'tunnel', icon: '🌊', name: 'Under the river', desc: 'Run a line under the water', test: (S) => S.lines.some((l) => crossings(S, l.loop ? [...l.stations, l.stations[0]] : l.stations) > 0) },
  { id: 'ich', icon: '🔄', name: 'Change here', desc: 'Build an interchange', test: (S) => S.stations.some((s) => s.interchange) },
  { id: 'lines7', icon: '🌈', name: 'Every colour', desc: 'Have 7 lines at once', test: (S) => S.lines.length >= 7 },
  { id: 'long', icon: '📏', name: 'The long way', desc: 'A line with 12 stops', test: (S) => S.lines.some((l) => l.stations.length >= 12) },
  { id: 'cars', icon: '🚃', name: 'Full length', desc: `A train with ${MAX_CARS} carriages`, test: (S) => S.lines.some((l) => l.trains.some((t) => t.cars >= MAX_CARS)) },
  { id: 'fleet', icon: '🚉', name: 'Fleet', desc: '12 trains running', test: (S) => trains(S) >= 12 },
  { id: 'clean', icon: '✋', name: 'No take-backs', desc: '300 passengers without using undo', test: (S) => S.score >= 300 && !S.undos },
  { id: 'stars', icon: '⭐', name: 'Three stars', desc: 'Earn ★★★ in a city', test: (S, x) => x.stars >= 3 },
  { id: 'night', icon: '🌙', name: 'Night shift', desc: '200 passengers with the night look on', test: (S, x) => x.night && S.score >= 200 },
  { id: 'daily', icon: '📅', name: 'Daily rider', desc: 'Play a daily challenge', test: (S) => S.mode === 'daily' && S.score >= 20 },
  { id: 'streak3', icon: '🔥', name: 'Three in a row', desc: 'Daily challenges 3 days in a row', test: (S, x) => x.streak >= 3 },
  { id: 'streak7', icon: '💎', name: 'A whole week', desc: 'Daily challenges 7 days in a row', test: (S, x) => x.streak >= 7 },
  { id: 'world', icon: '🌍', name: 'World traveller', desc: 'Play in 6 different cities', test: (S, x) => x.cities >= 6 },
];

export const got = () => load('linhas-ach') || {};
const stats = () => { const s = load('linhas-stats') || {}; return { cities: s.cities || [], days: s.days || [] }; };

const dayNum = (d) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
// Daily challenges in a row, ending today (or yesterday, so the streak isn't lost before today's game).
export function streak(days = stats().days) {
  const set = new Set(days), d = new Date();
  if (!set.has(dayNum(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(dayNum(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
// The last `n` days, oldest first: [{ day: YYYYMMDD, played }].
export function calendar(n = 28) {
  const set = new Set(stats().days), d = new Date(), out = [];
  d.setDate(d.getDate() - n + 1);
  for (let i = 0; i < n; i++) { out.push({ day: dayNum(d), date: new Date(d), played: set.has(dayNum(d)) }); d.setDate(d.getDate() + 1); }
  return out;
}

// Remembers that this game counts (city played, daily done). Call once the game has a few passengers.
export function note(S) {
  const s = stats();
  let changed = false;
  if (S.score >= 20 && !s.cities.includes(S.city)) { s.cities.push(S.city); changed = true; }
  if (S.mode === 'daily' && S.score >= 20 && !s.days.includes(S.seed)) { s.days.push(S.seed); s.days = s.days.slice(-400); changed = true; }
  if (changed) store('linhas-stats', s);
}

// Checks every achievement; returns the ones just earned.
export function check(S, extra) {
  note(S);
  const have = got(), s = stats(), fresh = [];
  const x = { cities: s.cities.length, streak: streak(s.days), ...extra };
  for (const a of ACH) {
    if (have[a.id]) continue;
    let ok = false;
    try { ok = a.test(S, x); } catch (e) { ok = false; }
    if (ok) { have[a.id] = Date.now(); fresh.push(a); }
  }
  if (fresh.length) store('linhas-ach', have);
  return fresh;
}
