// Linhas: screens, game loop, saves and HUD.
import { CITIES, GOALS } from './cities.js';
import * as E from './engine.js';
import { settings, unlock, setMusic, play } from './audio.js';
import * as Rn from './render.js';
import { initInput } from './input.js';

const $ = (s) => document.querySelector(s);
const load = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } };
const K = { best: 'linhas-best', daily: 'linhas-daily', set: 'linhas-settings', run: 'linhas-run', tut: 'linhas-tut' };
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
// Icons shared with the bottom bar (index.html).
const ICON = (id) => document.querySelector(id + ' svg').outerHTML;
const OPT = {
  line: [() => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18h6l6-12h6"/><circle cx="3" cy="18" r="1.6" fill="currentColor"/><circle cx="21" cy="6" r="1.6" fill="currentColor"/></svg>', 'New line', 'One more colour'],
  carriage: [() => ICON('#c-cars'), 'Carriage', 'More room on a train'],
  tunnel: [() => ICON('#c-tun'), 'Tunnel', 'Cross the river'],
  interchange: [() => ICON('#c-ich'), 'Interchange', 'Bigger, faster station'],
};

const pref = load(K.set) || {};
let mode = pref.mode === 'relaxed' ? 'relaxed' : 'normal';
for (const k of ['sfx', 'music', 'vib']) if (typeof pref[k] === 'boolean') settings[k] = pref[k];
const look = Rn.look;
look.night = !!pref.night; look.cb = !!pref.cb;
let autoPause = !!pref.autoPause;
const saveSettings = () => store(K.set, { sfx: settings.sfx, music: settings.music, vib: settings.vib, mode, night: look.night, cb: look.cb, autoPause });
const applyLook = () => { $('#game').classList.toggle('night', look.night); hudKey = ''; };

let S = null, ended = false, paused = false, speed = 1, last = performance.now(), lastDeliver = 0, toastT = 0, hudKey = '';
let undo = [], best0 = 0, cheered = false, shownScore = -1;
const ui = { preview: null, tool: null, sel: null, hint: null, carry: null, info: null }; // info: { station, until } after a tap on a station
let tut = load(K.tut) || {};

const today = () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
const cityOf = (id) => CITIES.find((c) => c.id === id) || CITIES[0];
const bestKey = (st) => (st.mode === 'relaxed' ? st.city + '-relaxed' : st.city);
const starsFor = (score) => GOALS.filter((g) => score >= g).length;
const starRow = (n, fresh = 0) => GOALS.map((_, i) => (i < n ? `<b class="${i >= n - fresh ? 'new' : ''}" style="animation-delay:${0.25 + (i - n + fresh) * 0.18}s">★</b>` : '<i>★</i>')).join('');
// Unlocking counts your best in a city in any mode (Normal, Relaxed or Daily).
function cityBest(id, all = load(K.best) || {}) {
  return Math.max(all[id] || 0, all[id + '-relaxed'] || 0, all[id + '-daily'] || 0);
}
const isLocked = (c, all) => !!c.unlock && cityBest(c.unlock.city, all) < c.unlock.score;
// Bests are saved while you play, not only when a game ends, so leaving a game early still counts.
function recordBest(st = S) {
  if (!st || !(st.score > 0)) return;
  if (st.mode === 'daily') {
    const d = load(K.daily);
    if (!(d && d.date === st.seed && d.score >= st.score)) store(K.daily, { date: st.seed, score: st.score });
  }
  const all = load(K.best) || {}, k = st.mode === 'daily' ? st.city + '-daily' : bestKey(st);
  if ((all[k] || 0) < st.score) { all[k] = st.score; store(K.best, all); }
}
function bestSoFar(st) {
  if (st.mode === 'daily') { const d = load(K.daily); return d && d.date === st.seed ? d.score : 0; }
  return (load(K.best) || {})[bestKey(st)] || 0;
}

// ---------------------------------------------------------------- screens
function show(name) {
  $('#menu').hidden = name !== 'menu';
  $('#game').hidden = name !== 'game';
  if (name === 'game') requestAnimationFrame(() => { Rn.resize(); });
  if (name === 'menu') renderMenu();
}
const modal = (id, on) => { $(id).hidden = !on; };

// Menu card: the city's water plus a little network grown by the game itself, so each city looks like itself.
const previews = new Map();
function citySvg(c) {
  if (previews.has(c.id)) return previews.get(c.id);
  const g = E.newGame({ city: c.id, mode: 'relaxed', seed: [...c.id].reduce((h, ch) => h * 31 + ch.charCodeAt(0), 7) >>> 0 });
  for (let i = 0; i < 2000 && g.stations.length < 7; i++) E.step(g, 0.1);
  const st = g.stations, near = (from, pool) => pool.sort((p, q) => Math.hypot(p.x - from.x, p.y - from.y) - Math.hypot(q.x - from.x, q.y - from.y))[0];
  // Two lines: one through the first four stations in nearest-neighbour order, one through the rest and back to it.
  const a = [st[0]], rest = st.slice(1, 4);
  while (rest.length) { const n = near(a[a.length - 1], rest); a.push(n); rest.splice(rest.indexOf(n), 1); }
  const b = st.slice(4);
  if (b.length) b.push(near(b[b.length - 1], a.slice()));
  const path = (ids) => ids.map((p, i) => (i ? E.segmentPoints(ids[i - 1], p).slice(1) : [p])).flat()
    .map((p, i) => `${i ? 'L' : 'M'}${Math.round(p.x)} ${Math.round(p.y)}`).join('');
  const shape = (p) => {
    const x = Math.round(p.x), y = Math.round(p.y);
    if (p.shape === 'triangle') return `<path d="M${x} ${y - 40}L${x + 38} ${y + 26}L${x - 38} ${y + 26}Z"/>`;
    if (p.shape === 'square') return `<rect x="${x - 32}" y="${y - 32}" width="64" height="64"/>`;
    if (p.shape === 'circle') return `<circle cx="${x}" cy="${y}" r="34"/>`;
    return `<path d="M${x} ${y - 40}L${x + 40} ${y}L${x} ${y + 40}L${x - 40} ${y}Z"/>`;
  };
  const water = (c.waterPolys || []).map((p) => `<path d="M${p.map(([x, y]) => `${Math.round(x)} ${Math.round(y)}`).join('L')}Z"/>`).join('');
  const svg = `<svg viewBox="100 260 800 1000" preserveAspectRatio="xMidYMid slice"><rect x="0" y="0" width="1000" height="1600" fill="${c.bg}"/><g fill="${c.water}">${water}</g>`
    + `<g fill="none" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"><path d="${path(a)}" stroke="${Rn.paint(c.colors[0])}"/>`
    + (b.length > 1 ? `<path d="${path(b)}" stroke="${Rn.paint(c.colors[1])}"/>` : '') + '</g>'
    + `<g fill="#fff" stroke="#222" stroke-width="16">${st.map(shape).join('')}</g></svg>`;
  previews.set(c.id, svg);
  return svg;
}

function renderMenu() {
  const best = load(K.best) || {};
  const bestOf = (c) => best[mode === 'relaxed' ? c.id + '-relaxed' : c.id] || 0;
  $('#cities').innerHTML = '';
  for (const c of CITIES) {
    const locked = isLocked(c, best);
    const b = document.createElement('button');
    b.className = 'city' + (locked ? ' locked' : '');
    b.innerHTML = citySvg(c) + `<b>${c.name}</b><small>${c.sub || ''}</small><span class="best">👑 ${bestOf(c)}</span>`
      + `<span class="stars">${starRow(starsFor(bestOf(c)))}</span>`
      + (locked ? `<span class="lock">🔒 ${c.unlock.score} in ${cityOf(c.unlock.city).name}<br><small>best ${cityBest(c.unlock.city, best)}</small></span>` : '');
    b.onclick = () => {
      unlock();
      if (locked) { play.locked(); return; }
      play.tap();
      start(c.id, mode, (Math.random() * 1e9) | 0);
    };
    $('#cities').append(b);
  }
  document.querySelectorAll('#modes button').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
  const d = load(K.daily), t = today();
  $('#m-daily-sub').textContent = `${cityOf(CITIES[t % CITIES.length].id).name} · ` + (d && d.date === t ? `👑 ${d.score}` : 'new today');
  const run = load(K.run);
  const ok = run && !run.over && run.stations;
  $('#m-cont').hidden = !ok;
  if (ok) $('#m-cont-sub').textContent = `${cityOf(run.city).name} · 👤 ${run.score}`;
}

document.querySelectorAll('#modes button').forEach((b) => b.addEventListener('click', () => {
  unlock(); play.tap();
  mode = b.dataset.mode; saveSettings(); renderMenu();
}));
$('#m-daily').onclick = () => {
  unlock(); play.tap();
  const t = today();
  start(CITIES[t % CITIES.length].id, 'daily', t);
};
$('#m-cont').onclick = () => {
  unlock(); play.tap();
  const run = load(K.run);
  if (!run) return renderMenu();
  S = run; begin();
};

// ---------------------------------------------------------------- game
function start(city, m, seed) {
  S = E.newGame({ city, mode: m, seed });
  begin();
}
function begin() {
  show('game');
  Rn.reset(S);
  paused = false; speed = 1; hudKey = ''; ended = false;
  undo = []; best0 = bestSoFar(S); cheered = false; shownScore = -1;
  $('#game').classList.remove('viewing'); $('#mapview').hidden = true;
  ui.preview = null; ui.tool = null; ui.sel = null; ui.carry = null; ui.info = null;
  for (const id of ['#pause', '#upgrade', '#over', '#settings']) modal(id, false);
  $('#frozen').hidden = true; $('#game').classList.remove('frozen'); $('#b-pause').classList.remove('on');
  $('#b-speed').textContent = '▶';
  if (S.pendingUpgrade) showUpgrade();
  if (S.over) gameOver(-1);
  save();
}
function save() { recordBest(); if (S && !S.over) store(K.run, S); }
setInterval(() => { if (!$('#game').hidden) save(); }, 4000);

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('on'), 1500);
}

function setTool(t) {
  ui.tool = t;
  if (t === 'train') toast('Drag it onto a line — or tap a line');
  if (t === 'carriage') toast('Tap a train');
  if (t === 'interchange') toast('Tap a station');
  hudKey = '';
}

function handle(events, now) {
  for (const ev of events || []) {
    if (ev.type === 'station') { Rn.pop(ev.id, now); play.station(); }
    else if (ev.type === 'deliver') {
      Rn.float(ev.x, ev.y, '+' + (ev.n || 1), now);
      cheer(ev.n || 1);
      if (now - lastDeliver > 90) { play.deliver(); lastDeliver = now; }
    } else if (ev.type === 'warn') {
      play.warn();
      if (autoPause && !paused) { setPaused(true); toast('A station is filling up'); }
    }
    else if (ev.type === 'week') { play.week(); showUpgrade(); }
    else if (ev.type === 'over') { gameOver(ev.id); break; }
  }
}

// Feedback while playing: the score bumps, and reaching a star or beating your best gets its own moment.
function cheer(n) {
  const el = $('#score');
  el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  const was = S.score - n;
  const star = GOALS.findIndex((g) => was < g && S.score >= g);
  if (star >= 0) { toast(`${'★'.repeat(star + 1)}  Star ${star + 1} of 3!`); play.star(); return; }
  const opened = CITIES.find((c) => c.unlock && c.unlock.city === S.city && was < c.unlock.score && S.score >= c.unlock.score && cityBest(S.city) < c.unlock.score);
  if (opened) { recordBest(); toast(`🔓 ${opened.name} unlocked!`); play.star(); return; }
  if (!cheered && best0 > 0 && was <= best0 && S.score > best0) { cheered = true; toast('👑 New best!'); play.best(); }
}

function showUpgrade() {
  const U = S.pendingUpgrade;
  if (!U) return;
  $('#up-title').textContent = `Week ${S.week + 1}`;
  const got = S.score - (S.wk0 || 0);
  $('#up-week').textContent = `Last week: ${got} passenger${got === 1 ? '' : 's'} home`;
  $('#up-opts').innerHTML = '';
  for (const key of U.options) {
    const [ic, name, sub] = OPT[key] || [() => '⭐', key, ''];
    const b = document.createElement('button');
    b.className = 'opt';
    b.innerHTML = `<span>${ic()}</span><b>${name}</b><small>${sub}</small>`;
    b.onclick = () => {
      E.chooseUpgrade(S, key); play.pick();
      (S.weeks = S.weeks || []).push(S.score - (S.wk0 || 0));
      S.wk0 = S.score;
      modal('#upgrade', false); hudKey = ''; save();
    };
    $('#up-opts').append(b);
  }
  modal('#upgrade', true);
}

function gameOver(id) {
  if (ended) return;
  ended = true;
  S.over = true;
  Rn.R.overId = id;
  localStorage.removeItem(K.run);
  const had = starsFor(best0);
  recordBest();
  const best = Math.max(best0, S.score), isBest = S.score > best0;
  $('#over-title').textContent = id >= 0 ? 'Overcrowded!' : 'Last stop!';
  $('#over-score').textContent = S.score;
  $('#over-stats').textContent = `${cityOf(S.city).name} · week ${S.week + 1} · ${S.stations.length} stations`;
  $('#over-best').textContent = isBest && S.score > 0 ? '👑 New best!' : `👑 Best ${best}`;
  const stars = starsFor(S.score);
  $('#over-stars').innerHTML = starRow(stars, Math.max(0, stars - had));
  // Passengers per week, the last (unfinished) week included.
  const weeks = (S.weeks || []).concat(S.score - (S.wk0 || 0)).slice(-12), top = Math.max(1, ...weeks);
  const first = (S.weeks || []).length + 1 - weeks.length + 1;
  $('#over-chart').innerHTML = weeks.map((n, i) => `<div><b style="height:${Math.max(3, Math.round((n / top) * 100))}%"></b><small>${first + i}</small></div>`).join('');
  $('#over-chart').hidden = weeks.length < 2;
  const next = GOALS.find((g) => S.score < g);
  $('#over-sub').textContent = next ? `Passengers home · next ★ at ${next}` : 'Passengers home';
  setTimeout(() => { if (S && S.over) modal('#over', true); }, id >= 0 ? 1400 : 0);
  isBest && S.score > 0 ? play.best() : play.over();
}

$('#o-again').onclick = () => { play.tap(); start(S.city, S.mode, S.mode === 'daily' ? today() : (Math.random() * 1e9) | 0); };
$('#o-menu').onclick = () => { play.tap(); modal('#over', false); show('menu'); };
// The finished network on its own, before going back to the results.
$('#o-map').onclick = () => {
  play.tap(); modal('#over', false);
  $('#mapview-t').textContent = `${cityOf(S.city).name} · ${S.score} home`;
  $('#mapview').hidden = false; $('#game').classList.add('viewing');
};
$('#mv-back').onclick = () => {
  play.tap(); $('#mapview').hidden = true; $('#game').classList.remove('viewing'); modal('#over', true);
};
$('#b-back').onclick = () => { play.tap(); save(); show('menu'); };
$('#b-pause').onclick = () => { play.tap(); setPaused(!paused); };
$('#p-resume').onclick = () => { play.tap(); setPaused(false); };
$('#p-close').onclick = () => { play.tap(); modal('#pause', false); };
$('#f-resume').onclick = () => { play.tap(); setPaused(false); };
$('#f-more').onclick = () => { play.tap(); disarm(); modal('#pause', true); };
// Restart and End game throw the run away, so they ask for a second tap.
let armed = null, armT = 0;
function confirmTap(btn, label, go) {
  if (armed === btn) { disarm(); go(); return; }
  disarm(); play.tap();
  armed = btn; btn.dataset.label = btn.textContent; btn.textContent = label; btn.classList.add('confirm');
  armT = setTimeout(disarm, 3000);
}
function disarm() {
  clearTimeout(armT);
  if (armed) { armed.textContent = armed.dataset.label; armed.classList.remove('confirm'); }
  armed = null;
}
$('#p-restart').onclick = (e) => confirmTap(e.currentTarget, 'Tap again to restart', () => {
  play.tap(); modal('#pause', false); start(S.city, S.mode, S.mode === 'daily' ? today() : (Math.random() * 1e9) | 0);
});
$('#p-end').onclick = (e) => confirmTap(e.currentTarget, 'Tap again to end', () => { modal('#pause', false); setPaused(false); gameOver(-1); });
$('#b-speed').onclick = () => {
  play.tap();
  speed = speed === 1 ? 2 : 1;
  $('#b-speed').textContent = speed === 1 ? '▶' : '⏩';
};
// Paused: time stops but lines can still be drawn and changed. The ⋯ button opens the pause menu.
function setPaused(on) {
  if (!S || S.over) return;
  paused = on;
  $('#frozen').hidden = !on;
  $('#game').classList.toggle('frozen', on);
  $('#b-pause').classList.toggle('on', on);
  if (!on) modal('#pause', false);
  if (on) save();
}

// Undo: every map change keeps the routes from before it, so a slip of the finger costs nothing.
function edited(before) {
  if (JSON.stringify(before) === JSON.stringify(E.routesOf(S))) return;
  undo.push(before);
  if (undo.length > 30) undo.shift();
  hudKey = '';
}
$('#b-undo').onclick = () => {
  if (!S || S.over || S.pendingUpgrade) return;
  const snap = undo.pop();
  if (!snap) { play.locked(); toast('Nothing to undo'); return; }
  E.restoreRoutes(S, snap); play.undo();
  ui.sel = null; ui.tool = null; hudKey = ''; save();
};
$('#b-trash').onclick = () => {
  if (ui.sel == null || !S.lines[ui.sel]) return;
  const before = E.routesOf(S);
  E.removeLine(S, ui.sel); play.remove(); edited(before);
  ui.sel = null; hudKey = ''; save();
};
// Tapping a spare (instead of dragging it) arms it: the next tap on the map places it.
function tapped(kind) {
  if (!S) return;
  const n = { train: S.inv.trains, carriage: S.inv.carriages, interchange: S.inv.interchanges }[kind];
  if (!n) { play.locked(); toast(kind === 'train' ? 'New trains come each week' : kind === 'carriage' ? 'No carriages yet' : 'No interchanges yet'); return; }
  play.tap();
  if (ui.tool === kind) return setTool(null);
  setTool(kind);
}
$('#c-tun').onclick = () => toast(`${S.inv.tunnels} tunnels left`);

// ---------------------------------------------------------------- first-game hints
const HINTS = {
  draw: 'Drag from one station to another to build a line',
  extend: 'Drag the ⊢ end of a line onto a new station',
  remove: 'Tap a coloured dot below to pick a line, then 🗑 to remove it',
  train: 'Drag the new train from below onto a busy line',
  move: 'Tip: drag a train to move it — or onto the bar to keep it',
};
let hintFor = null, hintT = 0;
function updateHint() {
  const done = (k) => { if (!tut[k]) { tut[k] = true; store(K.tut, tut); } };
  if (S.lines.length) done('draw');
  if (S.lines.some((l) => l.stations.length > 2)) done('extend');
  if (ui.sel != null) done('remove');
  if (S.lines.some((l) => l.trains.length > 1)) done('train');
  let h = null;
  const loose = S.stations.some((st) => !S.lines.some((l) => l.stations.includes(st.id)));
  if (!tut.draw) h = 'draw';
  else if (!tut.train && S.inv.trains > 0) h = 'train';
  else if (!tut.move && S.week >= 2 && S.lines.some((l) => l.trains.length > 1)) h = 'move';
  else if (!tut.extend && loose && S.t > 8) h = 'extend';
  else if (!tut.remove && S.week >= 1 && S.lines.length >= S.inv.lines) h = 'remove';
  // The optional hints go away by themselves after a while, the first one stays until a line is drawn.
  if (h && h !== 'draw') {
    if (hintFor !== h) { hintFor = h; hintT = S.t; }
    if (S.t - hintT > 12) { done(h); h = null; }
  }
  if (ui.preview || ui.carry || S.over || paused || !$('#card').hidden) h = null;
  ui.hint = h;
  const el = $('#hint');
  if (el.hidden !== !h) el.hidden = !h;
  if (h && el.textContent !== HINTS[h]) el.textContent = HINTS[h];
}

// Info card: the picked line's numbers, or where a tapped station's passengers want to go.
const GLYPH = { circle: '●', triangle: '▲', square: '■', diamond: '◆', star: '★', cross: '✚', pentagon: '⬟' };
function updateCard() {
  let html = '';
  if (ui.info && performance.now() > ui.info.until) ui.info = null;
  const L = ui.sel != null && S.lines[ui.sel];
  if (L && !ui.preview) {
    const cars = L.trains.reduce((n, t) => n + t.cars - 1, 0), riding = L.trains.reduce((n, t) => n + t.pax.length, 0);
    const busy = L.stations.map((id) => S.stations[id]).sort((a, b) => b.queue.length - a.queue.length)[0];
    html = `<span class="n" style="--k:${Rn.paint(L.color)}">${ui.sel + 1}</span><b>${L.carried || 0}</b> delivered · ${riding} riding<br>`
      + `${L.stations.length} stops${L.loop ? ' (loop)' : ''} · ${L.trains.length} train${L.trains.length > 1 ? 's' : ''}${cars ? ` · ${cars} carriage${cars > 1 ? 's' : ''}` : ''}`
      + (busy && busy.queue.length > 2 ? ` · busiest stop ${GLYPH[busy.shape]} ${busy.queue.length} waiting` : '');
  } else if (ui.info && S.stations[ui.info.station] && !ui.preview && !ui.carry) {
    const w = E.wants(S, ui.info.station), st = S.stations[ui.info.station];
    if (!w.length) html = `${GLYPH[st.shape]} Nobody waiting here`;
    else {
      html = 'Waiting: ' + w.map((o) => `<b class="${o.ok ? '' : 'no'}">${GLYPH[o.shape]}×${o.n}</b>`).join(' ');
      const lost = w.filter((o) => !o.ok);
      if (lost.length) html += `<br><span class="no">No line goes to ${lost.map((o) => GLYPH[o.shape]).join(' ')} from here yet</span>`;
      else html += '<br>Every one of them has a way there';
    }
  }
  const el = $('#card');
  if (el.hidden !== !html) el.hidden = !html;
  if (html && el.innerHTML !== html) el.innerHTML = html;
}

// ---------------------------------------------------------------- HUD
function updateHud() {
  updateCard();
  updateHint();
  if (shownScore !== S.score) {
    shownScore = S.score;
    $('#score-n').textContent = S.score;
    const next = GOALS.find((g) => S.score < g);
    $('#goal').textContent = next ? `/ ${next} ★` : '★★★';
  }
  const key = [S.day, S.week, S.lines.length, S.lines.map((l) => l.color).join(), S.inv.lines, S.inv.trains, S.inv.carriages,
    S.inv.tunnels, S.inv.interchanges, ui.sel, ui.tool, undo.length].join('|');
  if (key === hudKey) return;
  hudKey = key;
  $('#dots').innerHTML = DAYS.map((d, i) => `<i class="${i < S.day ? 'on' : i === S.day ? 'now' : ''}"></i>`).join('');
  $('#week-n').textContent = `Week ${S.week + 1}`;
  const city = cityOf(S.city);
  const chips = $('#chips');
  chips.innerHTML = '';
  const used = S.lines.map((l) => l.color), free = city.colors.filter((c) => !used.includes(c));
  for (let i = 0; i < city.colors.length; i++) {
    const b = document.createElement('button');
    const inUse = i < S.lines.length;
    const color = inUse ? S.lines[i].color : free[i - S.lines.length] || '#999';
    b.className = 'chip' + (inUse ? ' used' : i < S.inv.lines ? '' : ' locked') + (ui.sel === i ? ' sel' : '');
    b.style.setProperty('--k', Rn.paint(color));
    if (inUse) b.dataset.n = i + 1; // same number as the badge at the line's ends
    b.onclick = () => {
      if (!inUse) { play.tap(); toast(i < S.inv.lines ? 'Drag between stations to draw a line' : 'Unlock more lines each week'); return; }
      play.tap(); ui.sel = ui.sel === i ? null : i; ui.info = null; hudKey = '';
      if (ui.sel != null) toast('Tap a station to take it off · 🗑 removes the line');
    };
    chips.append(b);
  }
  $('#b-trash').hidden = ui.sel == null || !S.lines[ui.sel];
  $('#b-undo').classList.toggle('off', !undo.length);
  // Spare trains and carriages are placed by themselves, so their counters only show while some are waiting.
  const cnt = (id, n, tool, hideEmpty) => {
    const b = $(id);
    b.querySelector('i').textContent = n;
    b.classList.toggle('empty', !n);
    b.classList.toggle('gone', !!hideEmpty && !n);
    b.classList.toggle('on', !!tool && ui.tool === tool);
  };
  cnt('#c-trains', S.inv.trains, 'train', true);
  cnt('#c-cars', S.inv.carriages, 'carriage', true);
  cnt('#c-tun', S.inv.tunnels);
  cnt('#c-ich', S.inv.interchanges, 'interchange', true);
}

// ---------------------------------------------------------------- loop
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  if (!S || $('#game').hidden) return;
  if (!paused && !S.pendingUpgrade && !S.over && $('#settings').hidden) {
    let ev = [];
    try { ev = E.step(S, dt * speed); } catch (e) { console.error(e); }
    handle(ev, now);
  }
  if (S.pendingUpgrade && !S.over && $('#upgrade').hidden) showUpgrade();
  if (S.over && !ended) { const st = S.stations.find((x) => x.overflow >= 1); gameOver(st ? st.id : -1); }
  Rn.draw(S, ui, now);
  updateHud();
}

// ---------------------------------------------------------------- settings
document.querySelectorAll('.b-set').forEach((b) => b.addEventListener('click', () => {
  unlock(); play.tap();
  $('#s-sfx').checked = settings.sfx; $('#s-music').checked = settings.music; $('#s-vib').checked = settings.vib;
  $('#s-night').checked = look.night; $('#s-cb').checked = look.cb; $('#s-auto').checked = autoPause;
  modal('#settings', true);
}));
$('#s-sfx').onchange = (e) => { settings.sfx = e.target.checked; saveSettings(); };
$('#s-music').onchange = (e) => { settings.music = e.target.checked; setMusic(settings.music); saveSettings(); };
$('#s-vib').onchange = (e) => { settings.vib = e.target.checked; saveSettings(); };
$('#s-night').onchange = (e) => { look.night = e.target.checked; applyLook(); saveSettings(); };
$('#s-cb').onchange = (e) => { look.cb = e.target.checked; applyLook(); saveSettings(); previews.clear(); if (!$('#menu').hidden) renderMenu(); };
$('#s-auto').onchange = (e) => { autoPause = e.target.checked; saveSettings(); };
$('#s-hints').onclick = () => { play.tap(); tut = {}; store(K.tut, tut); toast('Tips will show again'); };
$('#b-close').onclick = () => { play.tap(); modal('#settings', false); };

// ---------------------------------------------------------------- boot
document.addEventListener('pointerdown', () => unlock(), { capture: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && S && !$('#game').hidden) { save(); if (!S.over && !S.pendingUpgrade) setPaused(true); }
});
addEventListener('pagehide', save);

Rn.init($('#cv'));
applyLook();
recordBest(load(K.run)); // a game left unfinished before bests were saved during play
initInput($('#cv'), {
  get: () => S,
  ui,
  toast,
  setTool,
  changed: () => { hudKey = ''; save(); },
  edited,
  tapped,
  blocked: () => !$('#pause').hidden || !S || S.over || !!S.pendingUpgrade || !$('#settings').hidden,
});
show('menu');
requestAnimationFrame(frame);
// For automated browser tests: index.html?debug
if (location.search.includes('debug')) window.LINHAS = { get: () => S, E, R: Rn.R, toScreen: Rn.toScreen, start, ui };
