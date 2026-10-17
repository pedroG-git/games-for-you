// Dragon Match — Royal Match-style match-3: beat levels to earn stars, spend stars to restore the
// dragon rider fortress. Rules live in engine.js; this file draws, animates and handles input.
import * as E from './engine.js';
import { levelFor, isHard } from './levels.js';
import { MOVES } from './moves.js';
import { installArt, use, tileArt, goalArt, GEM_COLORS } from './art.js';
import { AREAS, currentArea, renderScene } from './fortress.js';
import { play, settings, unlock, setMusic } from './audio.js';

const $ = (id) => document.getElementById(id);
const { W, H, idx } = E;
const SAVE = 'dragon-save', SET = 'dragon-settings', CACHE = 'dragon-moves';
installArt();

const load = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } };

// ---------------------------------------------------------------- saved progress
const BOOSTS = ['rocket', 'bomb', 'light', 'hammer', 'arrow', 'cannon', 'shuffle'];
const P = Object.assign({ level: 1, stars: 0, built: [], seen: [], boost: {} }, load(SAVE) || {});
for (const b of BOOSTS) if (!(P.boost[b] >= 0)) P.boost[b] = ['hammer', 'shuffle'].includes(b) ? 2 : 1;
const saveP = () => store(SAVE, P);
Object.assign(settings, load(SET) || {});
const saveSettings = () => store(SET, settings);

const cache = load(CACHE) || {};
function getLevel(n) {
  if (MOVES[n] && !cache[n]) cache[n] = { v: MOVES[n][0], m: MOVES[n][1] };
  const known = !!cache[n];
  const L = levelFor(n, cache);
  if (!known) store(CACHE, cache);
  return L;
}

// ---------------------------------------------------------------- state of the level being played
let S = null, L = null;
const G = { busy: false, sel: -1, tool: null, down: null, extra: false, pre: new Set(), speed: 1, at: new Map(), merge: new Map(), hintT: 0 };
const els = new Map(), iceEls = new Map();
let cell = 44;

// ---------------------------------------------------------------- screens
function show(id) {
  for (const s of ['home', 'game']) $(s).hidden = s !== id;
  for (const m of document.querySelectorAll('.modal')) m.hidden = true;
}
const openModal = (id) => { $(id).hidden = false; };
const closeModal = (id) => { $(id).hidden = true; };

function layout() {
  const vw = innerWidth, vh = innerHeight;
  document.documentElement.style.setProperty('--sw', Math.max(220, Math.min(vw - 32, 440, (vh - 330) / 0.8)) + 'px');
  const hud = $('hud').offsetHeight || 86;
  cell = Math.floor(Math.min((Math.min(vw, 560) - 16) / W, (vh - hud - 120) / H));
  document.documentElement.style.setProperty('--cell', cell + 'px');
  if (S && !$('game').hidden) { buildBoard(); render(true); }
}
addEventListener('resize', layout);

// ---------------------------------------------------------------- home / fortress
function openHome(justBuilt) {
  show('home');
  layout();
  $('h-stars').querySelector('b').textContent = P.stars;
  const a = currentArea(P.built), done = a >= AREAS.length, shownArea = done ? AREAS.length - 1 : a;
  const A = AREAS[shownArea];
  $('area-name').textContent = done ? 'The fortress is restored!' : `Area ${a + 1} · ${A.name}`;
  renderScene($('scene'), shownArea, P.built, justBuilt);
  const n = A.tasks.filter((_, i) => P.built.includes(shownArea + ':' + i)).length;
  $('area-prog').querySelector('i').style.width = (n / A.tasks.length) * 100 + '%';
  $('area-prog').querySelector('span').textContent = `${n} / ${A.tasks.length}`;
  $('h-tasks').hidden = done;
  $('h-badge').hidden = done || !A.tasks.some((t, i) => !P.built.includes(a + ':' + i) && t.cost <= P.stars);
  const hard = isHard(P.level);
  $('h-play').className = 'big' + (hard ? ' hard' : '');
  $('h-play').innerHTML = `Level ${P.level}${hard ? '<small>Hard level</small>' : ''}`;
  if (!done && !P.seen.includes('area' + a)) { P.seen.push('area' + a); saveP(); say(A.name, A.intro); }
}

function openTasks() {
  const a = currentArea(P.built), A = AREAS[a];
  $('t-title').textContent = A.name;
  const list = $('t-list');
  list.innerHTML = '';
  A.tasks.forEach((t, i) => {
    const done = P.built.includes(a + ':' + i);
    const row = document.createElement('div');
    row.className = 'task' + (done ? ' done' : '');
    row.innerHTML = `<span class="ic">${t.icon}</span><span class="nm"></span>`;
    row.querySelector('.nm').textContent = t.name;
    if (!done) {
      const b = document.createElement('button');
      b.className = t.cost <= P.stars ? '' : 'cant';
      b.innerHTML = `${use('star')}${t.cost}`;
      b.addEventListener('click', () => build(a, i));
      row.appendChild(b);
    }
    list.appendChild(row);
  });
  openModal('m-tasks');
}

function build(a, i) {
  const t = AREAS[a].tasks[i];
  if (t.cost > P.stars) { play.locked(); say('Not enough stars', `You need ${t.cost - P.stars} more. Play levels to earn stars!`); return; }
  P.stars -= t.cost;
  P.built.push(a + ':' + i);
  saveP();
  closeModal('m-tasks');
  openHome(i);
  play.build();
  const item = $('scene').children[2 + i];
  if (item) { const r = item.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, ['#ffd23a', '#fff', '#ff8a3d'], 30); }
  say(t.name, t.say);
  if (currentArea(P.built) !== a) {
    setTimeout(() => {
      play.win();
      showPraise('Area complete!');
      setTimeout(() => openHome(), 1600);
    }, 2200);
  }
}

// ---------------------------------------------------------------- story / tips bubble
let sayT = 0;
function say(title, text) {
  const el = $('say');
  el.querySelector('b').textContent = title;
  el.querySelector('span').textContent = text;
  el.hidden = false;
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  clearTimeout(sayT);
  sayT = setTimeout(() => { el.hidden = true; }, 5000);
}
$('say').addEventListener('click', () => { $('say').hidden = true; });

function showPraise(text) {
  const p = $('praise');
  p.textContent = text;
  p.classList.remove('show'); void p.offsetWidth; p.classList.add('show');
}

// ---------------------------------------------------------------- start a level
function goalsHTML(goals, withLeft) {
  return goals.map((g) => `<div class="goal${withLeft && g.left <= 0 ? ' done' : ''}">${goalArt(g)}<b>${withLeft ? (g.left <= 0 ? '✓' : g.left) : g.n}</b></div>`).join('');
}

function openStart() {
  L = getLevel(P.level);
  $('st-title').textContent = `Level ${P.level}`;
  $('st-tag').hidden = !L.hard;
  $('st-goals').innerHTML = goalsHTML(L.goals, false);
  G.pre.clear();
  for (const b of $('st-boost').children) {
    const k = b.dataset.b;
    b.classList.remove('on');
    b.classList.toggle('none', !P.boost[k]);
    b.querySelector('i').textContent = P.boost[k];
  }
  $('st-play').className = 'big' + (L.hard ? ' hard' : '');
  openModal('m-start');
}

function startLevel() {
  for (const k of G.pre) P.boost[k]--;
  saveP();
  S = E.createState(L, (Math.random() * 2 ** 31) | 0);
  E.placeBoosters(S, [...G.pre]);
  G.pre.clear(); G.extra = false; G.sel = -1; G.tool = null; G.busy = false;
  show('game');
  $('goals').innerHTML = '';
  layout();
  buildBoard();
  for (let i = 0; i < W * H; i++) if (S.tiles[i] && S.tiles[i].t !== 'box') S.tiles[i].y0 = Math.floor(i / W) - H - 1;
  render();
  updateTools();
  tutorial();
  resetHint();
}

function tutorial() {
  const tips = {
    first: ['How to play', 'Swap two gems to line up 3 of the same. Collect the gems shown at the top before you run out of moves!'],
    box: ['Crates', 'Make matches next to crates to break them. Iron and stone crates need more hits.'],
    ice: ['Frost', 'Make matches on top of the frost to melt it. Melt all of it!'],
    egg: ['Dragon eggs', 'Clear the gems under the eggs so they fall down to the bottom of the board.'],
  };
  const want = P.level === 1 ? 'first' : ['box', 'ice', 'egg'].find((t) => L.goals.some((g) => g.t === t) && !P.seen.includes(t));
  if (want && !P.seen.includes(want)) { P.seen.push(want); saveP(); setTimeout(() => say(...tips[want]), 900); }
  if (P.level === 2 && !P.seen.includes('specials')) {
    P.seen.push('specials'); saveP();
    setTimeout(() => say('Dragon powers', '4 in a row = fire lance. A square = baby dragon. L or T shape = fire bomb. 5 in a row = dragon eye. Swap two powers together for a mega combo!'), 900);
  }
}

// ---------------------------------------------------------------- drawing the board
const pos = (r, c) => `translate(${c * cell}px, ${r * cell}px)`;

function buildBoard() {
  const cells = $('cells'), icel = $('icel');
  cells.innerHTML = ''; icel.innerHTML = ''; $('tiles').innerHTML = ''; $('fxl').innerHTML = '';
  els.clear(); iceEls.clear();
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    if (!E.inBoard(S, r, c)) continue;
    const d = document.createElement('div');
    d.className = 'cell' + ((r + c) % 2 ? ' alt' : '')
      + (E.inBoard(S, r - 1, c) ? '' : ' e-t') + (E.inBoard(S, r + 1, c) ? '' : ' e-b')
      + (E.inBoard(S, r, c - 1) ? '' : ' e-l') + (E.inBoard(S, r, c + 1) ? '' : ' e-r');
    d.style.transform = pos(r, c);
    cells.appendChild(d);
    if (S.ice[idx(r, c)]) {
      const e = document.createElement('div');
      e.className = 'ice';
      e.style.transform = pos(r, c);
      e.innerHTML = use('ice');
      icel.appendChild(e);
      iceEls.set(idx(r, c), e);
    }
  }
}

function render(instant) {
  const seen = new Set();
  G.at.clear();
  for (let i = 0; i < W * H; i++) {
    const t = S.tiles[i];
    if (!t) continue;
    seen.add(t.id);
    G.at.set(i, t.id);
    const r = Math.floor(i / W), c = i % W;
    let el = els.get(t.id);
    if (!el) {
      el = document.createElement('div');
      el.className = 'tile';
      $('tiles').appendChild(el);
      els.set(t.id, el);
      el.style.transition = 'none';
      el.style.transform = pos(t.y0 !== undefined && !instant ? t.y0 : r, c);
      if (t.born && t.y0 === undefined) { el.classList.add('born'); setTimeout(() => el.classList.remove('born'), 450); }
      void el.offsetWidth;
      el.style.transition = '';
      delete t.y0;
    }
    el._t = t;
    const key = t.t + (t.c !== undefined ? t.c : '') + (t.hp !== undefined ? t.hp : '');
    if (el.dataset.k !== key) {
      if (el.dataset.k && t.t === 'box') { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); play.box(); boxBits(r, c); }
      el.dataset.k = key;
      el.innerHTML = tileArt(t);
      el.classList.toggle('crate', t.t === 'box');
      el.classList.toggle('special', E.isSpecial(t));
    }
    el.classList.toggle('sel', G.sel === i);
    el.style.transform = pos(r, c);
  }
  for (const [id, el] of els) if (!seen.has(id)) { removeTile(el, id); els.delete(id); }
  let melted = false;
  for (const [i, el] of iceEls) {
    if (S.ice[i]) continue;
    el.classList.add('gone');
    setTimeout(() => el.remove(), 320);
    iceEls.delete(i);
    melted = true;
    const r = Math.floor(i / W), c = i % W, b = boardXY(r, c);
    burst(b.x, b.y, ['#e8f8ff', '#9adfff'], 5);
  }
  if (melted) play.ice();
  updateHud();
}

function boardXY(r, c) {
  const b = $('board').getBoundingClientRect();
  return { x: b.left + (c + 0.5) * cell, y: b.top + (r + 0.5) * cell };
}

function goalEl(t) {
  const k = S.goals.findIndex((g) => (t.t === 'g' ? g.t === 'gem' && g.c === t.c : g.t === (t.t === 'box' ? 'box' : t.t)));
  return k >= 0 ? $('goals').children[k] : null;
}

function removeTile(el, id) {
  const t = el._t;
  const m = G.merge.get(id);
  if (m !== undefined) { // gems sliding into the power they made
    el.style.transition = 'transform .18s ease-in, opacity .18s ease-in';
    el.style.transform = pos(Math.floor(m / W), m % W) + ' scale(.6)';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 200);
    return;
  }
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
  if (t.t === 'g') burst(cx, cy, [GEM_COLORS[t.c], '#fff'], 7);
  if (t.t === 'box') { burst(cx, cy, ['#c88a4a', '#7a4317', '#ffe0b0'], 12); play.box(); }
  const target = goalEl(t);
  if (target && (t.t !== 'g' || S.goals.some((g) => g.t === 'gem' && g.c === t.c))) {
    flyTo(el.innerHTML, rect, target);
    el.remove();
    return;
  }
  el.classList.add('pop');
  el.style.transform += ' scale(1.35)';
  setTimeout(() => el.remove(), 240);
}

function flyTo(html, rect, target) {
  const f = document.createElement('div');
  f.className = 'flyer';
  f.innerHTML = html;
  f.style.left = rect.left + 'px'; f.style.top = rect.top + 'px';
  f.style.width = rect.width + 'px'; f.style.height = rect.height + 'px';
  $('flyers').appendChild(f);
  const to = target.getBoundingClientRect();
  const dx = to.left + to.width / 2 - (rect.left + rect.width / 2), dy = to.top + 20 - (rect.top + rect.height / 2);
  const a = f.animate([
    { transform: 'translate(0,0) scale(1)' },
    { transform: `translate(${dx * 0.3}px, ${dy * 0.3 - 30}px) scale(1.25)`, offset: 0.3 },
    { transform: `translate(${dx}px, ${dy}px) scale(.6)` },
  ], { duration: 520 + Math.random() * 120, easing: 'ease-in' });
  a.onfinish = () => { f.remove(); target.classList.remove('bump'); void target.offsetWidth; target.classList.add('bump'); play.goal(); };
}

function updateHud() {
  $('moves-n').textContent = S.moves;
  $('moves').classList.toggle('low', S.moves <= 5);
  const box = $('goals');
  if (box.children.length !== S.goals.length) box.innerHTML = goalsHTML(S.goals, true);
  S.goals.forEach((g, k) => {
    const el = box.children[k];
    el.classList.toggle('done', g.left <= 0);
    el.querySelector('b').textContent = g.left <= 0 ? '✓' : g.left;
  });
}

function updateTools() {
  for (const b of $('tools').children) {
    const k = b.dataset.tool;
    b.querySelector('i').textContent = P.boost[k] || '+';
    b.classList.toggle('none', !P.boost[k]);
    b.classList.toggle('armed', G.tool === k);
  }
}

// ---------------------------------------------------------------- effects
function fxEl(cls, html = '') {
  const d = document.createElement('div');
  d.className = 'fx ' + cls;
  d.innerHTML = html;
  $('fxl').appendChild(d);
  return d;
}
const gone = (el, ms) => setTimeout(() => el.remove(), ms);

function rocketFx(r, c, dir) {
  const x = (c + 0.5) * cell, y = (r + 0.5) * cell, len = (dir === 'h' ? W : H) * cell;
  for (const s of [1, -1]) {
    const ang = dir === 'h' ? (s > 0 ? 0 : 180) : (s > 0 ? 90 : -90);
    const beam = fxEl('beam');
    Object.assign(beam.style, { left: x + 'px', top: y - cell * 0.25 + 'px', width: len + 'px' });
    beam.animate([{ transform: `rotate(${ang}deg) scaleX(0)`, opacity: 1 }, { transform: `rotate(${ang}deg) scaleX(1)`, opacity: 1, offset: 0.6 }, { transform: `rotate(${ang}deg) scaleX(1)`, opacity: 0 }], { duration: 420, easing: 'ease-out' });
    gone(beam, 430);
    const rk = fxEl('', use('rocket'));
    Object.assign(rk.style, { left: x - cell / 2 + 'px', top: y - cell / 2 + 'px', width: cell + 'px', height: cell + 'px' });
    const dx = dir === 'h' ? s * len : 0, dy = dir === 'v' ? s * len : 0;
    rk.animate([{ transform: `translate(0,0) rotate(${ang}deg)` }, { transform: `translate(${dx}px, ${dy}px) rotate(${ang}deg)` }], { duration: 380, easing: 'ease-in' });
    gone(rk, 380);
  }
}

function ringFx(r, c, rad, color) {
  const d = fxEl('ring'), size = (rad * 2 + 1) * cell;
  Object.assign(d.style, { left: (c + 0.5) * cell - size / 2 + 'px', top: (r + 0.5) * cell - size / 2 + 'px', width: size + 'px', height: size + 'px' });
  if (color) d.style.borderColor = color;
  d.animate([{ transform: 'scale(.2)', opacity: 1 }, { transform: 'scale(1)', opacity: 0 }], { duration: 450, easing: 'ease-out' });
  gone(d, 450);
  const b = boardXY(r, c);
  burst(b.x, b.y, ['#ffd23a', '#ff6a1a', '#fff'], 20 + rad * 6, 1.6);
  $('board').classList.remove('shake'); void $('board').offsetWidth; $('board').classList.add('shake');
}

function flyFx(r, c, tr, tc, carry) {
  const d = fxEl('', use('prop') + (carry ? `<div style="position:absolute;left:25%;top:55%;width:50%;height:50%">${use(carry === 'bomb' ? 'bomb' : 'rocket', carry === 'rv' ? 'rot' : '')}</div>` : ''));
  Object.assign(d.style, { left: c * cell + 'px', top: r * cell + 'px', width: cell * 1.1 + 'px', height: cell * 1.1 + 'px' });
  const dx = (tc - c) * cell, dy = (tr - r) * cell;
  d.animate([
    { transform: 'translate(0,0) scale(1)' },
    { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - cell * 1.5}px) scale(1.6) rotate(${dx > 0 ? 15 : -15}deg)` },
    { transform: `translate(${dx}px, ${dy}px) scale(1)` },
  ], { duration: 460, easing: 'ease-in-out' });
  gone(d, 460);
}

function lightFx(r, c, targets) {
  const x = (c + 0.5) * cell, y = (r + 0.5) * cell;
  targets.forEach(([tr, tc], k) => {
    const tx = (tc + 0.5) * cell, ty = (tr + 0.5) * cell;
    const z = fxEl('zap');
    Object.assign(z.style, { left: x + 'px', top: y + 'px', width: Math.hypot(tx - x, ty - y) + 'px' });
    const ang = (Math.atan2(ty - y, tx - x) * 180) / Math.PI;
    z.animate([{ transform: `rotate(${ang}deg) scaleX(0)` }, { transform: `rotate(${ang}deg) scaleX(1)` }], { duration: 160, delay: k * 18, fill: 'both' });
    gone(z, 420 + k * 18);
  });
  ringFx(r, c, 1, '#ff8ad8');
}

function hammerFx(r, c) {
  const d = fxEl('', use('hammer'));
  Object.assign(d.style, { left: c * cell - cell * 0.3 + 'px', top: r * cell - cell * 0.9 + 'px', width: cell * 1.5 + 'px', height: cell * 1.5 + 'px' });
  d.animate([{ transform: 'rotate(-50deg)', opacity: 0 }, { transform: 'rotate(-60deg)', opacity: 1, offset: 0.4 }, { transform: 'rotate(20deg)', opacity: 1 }], { duration: 300, easing: 'ease-in' });
  gone(d, 320);
}

// Returns how long to wait before showing the result of a blast.
function blastFx(list) {
  let delay = 60;
  const sounds = new Set();
  for (const f of list) {
    if (f.fx === 'rocket') { rocketFx(f.r, f.c, f.dir); sounds.add('rocket'); delay = Math.max(delay, 110); }
    if (f.fx === 'bomb') { ringFx(f.r, f.c, f.rad); sounds.add('bomb'); }
    if (f.fx === 'spin') { ringFx(f.r, f.c, 1, '#7cf08a'); sounds.add('fly'); }
    if (f.fx === 'fly') { flyFx(f.r, f.c, f.tr, f.tc, f.carry); delay = Math.max(delay, 440); }
    if (f.fx === 'light') { lightFx(f.r, f.c, f.targets); sounds.add('light'); delay = Math.max(delay, 300); }
    if (f.fx === 'nova') { ringFx(f.r, f.c, 6, '#ff8ad8'); sounds.add('nova'); delay = Math.max(delay, 300); }
    if (f.fx === 'hammer') { hammerFx(f.r, f.c); sounds.add('hammer'); delay = Math.max(delay, 220); }
  }
  for (const s of sounds) play[s]();
  return delay;
}

function boxBits(r, c) { const b = boardXY(r, c); burst(b.x, b.y, ['#c88a4a', '#7a4317', '#dfe5ee'], 6); }

// ---------------------------------------------------------------- sparks (canvas particles)
const cv = $('sparks'), cx2 = cv.getContext('2d');
let parts = [], sparkRaf = 0;
function burst(x, y, colors, n, speed = 1) {
  const dpr = devicePixelRatio || 1;
  if (cv.width !== innerWidth * dpr) { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; }
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = (2 + Math.random() * 5) * speed;
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: 1, size: 3 + Math.random() * 5, color: colors[i % colors.length], star: Math.random() < 0.3 });
  }
  if (!sparkRaf) sparkRaf = requestAnimationFrame(tickSparks);
}
function tickSparks() {
  const dpr = devicePixelRatio || 1;
  cx2.setTransform(dpr, 0, 0, dpr, 0, 0);
  cx2.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter((p) => (p.life -= 0.028) > 0);
  for (const p of parts) {
    p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.vx *= 0.97;
    cx2.globalAlpha = Math.min(1, p.life * 1.5);
    cx2.fillStyle = p.color;
    const s = p.size * (0.5 + p.life / 2);
    if (p.star) { cx2.save(); cx2.translate(p.x, p.y); cx2.rotate(p.life * 6); cx2.fillRect(-s / 2, -s / 6, s, s / 3); cx2.fillRect(-s / 6, -s / 2, s / 3, s); cx2.restore(); }
    else { cx2.beginPath(); cx2.arc(p.x, p.y, s / 2, 0, Math.PI * 2); cx2.fill(); }
  }
  sparkRaf = parts.length ? requestAnimationFrame(tickSparks) : 0;
  if (!parts.length) cx2.clearRect(0, 0, innerWidth, innerHeight);
}

// ---------------------------------------------------------------- running a move with animation
const wait = (ms) => new Promise((r) => setTimeout(r, ms * G.speed));
const PRAISE = [[7, 'Dragonfire!'], [5, 'Amazing!'], [3, 'Great!']];

async function drive(gen) {
  G.busy = true;
  clearHint();
  let r, cascade = 0;
  const s0 = S;
  while (!(r = gen.next()).done) {
    if (S !== s0) return; // left the level mid-animation
    const ph = r.value;
    if (ph.type === 'swap') { render(); play.swap(); await wait(170); }
    else if (ph.type === 'swapback') { render(); play.nope(); await wait(200); }
    else if (ph.type === 'match') {
      G.merge.clear();
      for (const g of ph.groups) if (g.make) for (const i of g.cells) if (G.at.has(i)) G.merge.set(G.at.get(i), g.at);
      render();
      G.merge.clear();
      cascade = ph.combo;
      play.match(ph.combo, ph.groups.reduce((s, g) => s + g.cells.length, 0));
      if (ph.groups.some((g) => g.make)) setTimeout(() => play.born(), 120);
      await wait(230);
    } else if (ph.type === 'blast') {
      await wait(blastFx(ph.fx));
      render();
      await wait(190);
    } else if (ph.type === 'fall') { render(); await wait(230); }
    else if (ph.type === 'collect') { render(); play.egg(); await wait(260); }
    else if (ph.type === 'shuffle') { showPraise('Shuffle!'); render(); play.shuffle(); await wait(500); }
    else if (ph.type === 'turn') { render(); play.born(); await wait(220); }
  }
  const p = PRAISE.find(([n]) => cascade + 1 >= n);
  if (p && !S.won) showPraise(p[1]);
  G.busy = false;
  return r.value;
}

async function afterMove() {
  if (S.won) return winFlow();
  if (S.lost) return loseFlow();
  resetHint();
}

async function trySwap(a, b) {
  const ra = Math.floor(a / W), ca = a % W, rb = Math.floor(b / W), cb = b % W;
  if (!E.inBoard(S, rb, cb) || Math.abs(ra - rb) + Math.abs(ca - cb) !== 1) return;
  const ta = S.tiles[a], tb = S.tiles[b];
  if (!ta || !tb || ta.t === 'box' || tb.t === 'box') { play.nope(); return; }
  G.sel = -1;
  await drive(E.swap(S, a, b));
  afterMove();
}

async function tapCell(i) {
  const t = S.tiles[i];
  if (G.sel >= 0 && G.sel !== i) {
    const a = G.sel, ra = Math.floor(a / W), rb = Math.floor(i / W);
    if (Math.abs(ra - rb) + Math.abs((a % W) - (i % W)) === 1) { G.sel = -1; return trySwap(a, i); }
  }
  if (E.isSpecial(t)) {
    G.sel = -1;
    await drive(E.tap(S, i));
    return afterMove();
  }
  G.sel = t && t.t !== 'box' && G.sel !== i ? i : -1;
  if (G.sel >= 0) play.pick();
  render();
}

// ---------------------------------------------------------------- input
const board = $('board');
function cellAt(e) {
  const b = board.getBoundingClientRect();
  const c = Math.floor((e.clientX - b.left) / cell), r = Math.floor((e.clientY - b.top) / cell);
  return E.inBoard(S, r, c) ? idx(r, c) : -1;
}
board.addEventListener('pointerdown', (e) => {
  unlock();
  if (G.busy || !S || S.won || S.lost) return;
  const i = cellAt(e);
  if (i < 0) return;
  if (G.tool) { useTool(i); return; }
  G.down = { i, x: e.clientX, y: e.clientY, moved: false };
  try { board.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
});
board.addEventListener('pointermove', (e) => {
  const d = G.down;
  if (!d || d.moved || G.busy) return;
  const dx = e.clientX - d.x, dy = e.clientY - d.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < cell * 0.35) return;
  d.moved = true;
  const r = Math.floor(d.i / W), c = d.i % W;
  const [nr, nc] = Math.abs(dx) > Math.abs(dy) ? [r, c + Math.sign(dx)] : [r + Math.sign(dy), c];
  if (!E.inBoard(S, nr, nc)) return;
  G.sel = -1;
  trySwap(d.i, idx(nr, nc));
});
board.addEventListener('pointerup', () => {
  const d = G.down;
  G.down = null;
  if (d && !d.moved && !G.busy) tapCell(d.i);
});
board.addEventListener('pointercancel', () => { G.down = null; });

// ---------------------------------------------------------------- hint after a few idle seconds
function clearHint() { clearTimeout(G.hintT); for (const el of document.querySelectorAll('.tile.hint')) el.classList.remove('hint'); }
function resetHint() {
  clearHint();
  G.hintT = setTimeout(showHint, 7000);
}
function showHint() {
  if (!S || G.busy || S.won || S.lost || $('game').hidden) return;
  for (const el of document.querySelectorAll('.tile.hint')) el.classList.remove('hint');
  const moves = E.listMoves(S).filter((m) => m.a !== undefined);
  if (moves.length) {
    const m = moves[Math.floor(Math.random() * moves.length)];
    for (const i of [m.a, m.b]) { const el = els.get(S.tiles[i].id); if (el) el.classList.add('hint'); }
  }
  G.hintT = setTimeout(showHint, 7000);
}

// ---------------------------------------------------------------- in-game tools
const TOOL_TIP = { hammer: 'Tap a tile to smash it', arrow: 'Tap a row to fire an arrow', cannon: 'Tap a column to fire the cannon' };
for (const b of $('tools').children) {
  b.addEventListener('click', async () => {
    unlock();
    if (G.busy || !S || S.won || S.lost) return;
    const k = b.dataset.tool;
    if (!P.boost[k]) { play.locked(); say('No more', 'Win levels to get more boosters!'); return; }
    if (k === 'shuffle') {
      P.boost[k]--; saveP(); G.tool = null; updateTools(); $('tool-tip').hidden = true;
      await drive(E.tool(S, 'shuffle'));
      return afterMove();
    }
    G.tool = G.tool === k ? null : k;
    play.tap();
    $('tool-tip').textContent = TOOL_TIP[k];
    $('tool-tip').hidden = !G.tool;
    updateTools();
  });
}
async function useTool(i) {
  const k = G.tool;
  G.tool = null;
  P.boost[k]--; saveP();
  $('tool-tip').hidden = true;
  updateTools();
  await drive(E.tool(S, k, i));
  afterMove();
}

// ---------------------------------------------------------------- win / lose
async function winFlow() {
  G.busy = true;
  clearHint();
  play.win();
  showPraise('Level complete!');
  await wait(1100);
  if (S.moves > 0) {
    showPraise('Dragon fire!');
    G.speed = 0.55;
    await drive(E.finale(S));
    G.speed = 1;
    if (!S) return;
    await wait(400);
  }
  G.busy = true;
  const stars = L.hard ? 2 : 1;
  P.stars += stars;
  P.level++;
  const gifts = [];
  for (let k = 0; k < (L.hard ? 2 : 1); k++) {
    const g = BOOSTS[Math.floor(Math.random() * BOOSTS.length)];
    P.boost[g]++;
    gifts.push(g);
  }
  saveP();
  $('win-n').textContent = '+' + stars;
  $('win-gift').innerHTML = 'Reward: ' + gifts.map((g) => `<span class="gift">${use(g === 'shuffle' ? 'mix' : g)}</span>`).join(' ');
  openModal('m-win');
  const b = $('win-star').getBoundingClientRect();
  burst(b.left + b.width / 2, b.top + b.height / 2, ['#ffd23a', '#fff', '#ff8a3d'], 40, 1.4);
}

function loseFlow() {
  clearHint();
  play.lose();
  $('lose-goals').innerHTML = goalsHTML(S.goals.filter((g) => g.left > 0), true);
  $('lose-more').hidden = G.extra;
  openModal('m-lose');
}

// ---------------------------------------------------------------- buttons
$('h-hub').addEventListener('click', () => { location.href = '../../index.html'; });
$('h-play').addEventListener('click', () => { unlock(); play.tap(); openStart(); });
$('h-tasks').addEventListener('click', () => { unlock(); play.tap(); openTasks(); });
$('t-close').addEventListener('click', () => closeModal('m-tasks'));
$('st-close').addEventListener('click', () => closeModal('m-start'));
$('st-play').addEventListener('click', () => { play.tap(); closeModal('m-start'); startLevel(); });
for (const b of $('st-boost').children) {
  b.addEventListener('click', () => {
    const k = b.dataset.b;
    if (!P.boost[k]) { play.locked(); return; }
    if (G.pre.has(k)) G.pre.delete(k); else G.pre.add(k);
    b.classList.toggle('on', G.pre.has(k));
    play.tap();
  });
}
$('win-ok').addEventListener('click', () => { play.tap(); S = null; openHome(); });
$('lose-more').addEventListener('click', () => {
  G.extra = true;
  S.moves += 5; S.lost = false;
  closeModal('m-lose');
  updateHud();
  resetHint();
});
$('lose-retry').addEventListener('click', () => { closeModal('m-lose'); openStart(); });
$('lose-home').addEventListener('click', () => { S = null; openHome(); });
$('g-back').addEventListener('click', () => { if (!G.busy) openModal('m-quit'); });
$('q-stay').addEventListener('click', () => closeModal('m-quit'));
$('q-leave').addEventListener('click', () => { S = null; clearHint(); openHome(); });

for (const b of document.querySelectorAll('.b-set')) b.addEventListener('click', () => {
  $('s-sfx').checked = settings.sfx; $('s-music').checked = settings.music; $('s-vib').checked = settings.vib;
  openModal('m-set');
});
$('s-sfx').addEventListener('change', (e) => { settings.sfx = e.target.checked; saveSettings(); });
$('s-music').addEventListener('change', (e) => { setMusic(e.target.checked); saveSettings(); });
$('s-vib').addEventListener('change', (e) => { settings.vib = e.target.checked; saveSettings(); });
$('s-close').addEventListener('click', () => closeModal('m-set'));

document.addEventListener('pointerdown', unlock, { once: true });
if (location.search.includes('debug')) window.dbg = { get S() { return S; }, E, P, trySwap, tapCell, openStart };
openHome();
