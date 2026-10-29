// Flower Garden — merge-2 game: board, orders, generators, garden renovation and story.
import {
  W, H, CHAINS, MAX_ITEM, GENS, MAX_GEN, GEN_ODDS, ENERGY_MAX, ENERGY_SECS, LEVEL_GIFTS, xpNeed,
  PEOPLE, CUSTOMERS, ORDER_CHATTER, AREAS, INTRO, DAILY, startBoard,
} from './data.js';
import { play, unlock, settings as audio, setMusic } from './audio.js';
import { face, scene } from './art.js';

const KEY = 'flower-garden-v1';
// One-time move of saves made under the old key.
try { const old = localStorage.getItem('joanas-garden-v1'); if (old !== null && localStorage.getItem(KEY) === null) localStorage.setItem(KEY, old); localStorage.removeItem('joanas-garden-v1'); } catch (e) { /* storage blocked */ }
const $ = (id) => document.getElementById(id);
const rnd = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rnd(a.length)];
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const COLORS = ['#e86a92', '#f5b301', '#7fd18f', '#7cc4f4', '#c39bf0', '#ff9a6b'];
const CENTER = Math.floor(H / 2) * W + Math.floor(W / 2);

// ---------------------------------------------------------------- state + saving
function freshState() {
  return {
    v: 1, board: startBoard(), energy: ENERGY_MAX, energyTs: Date.now(), coins: 50, stars: 0, gems: 25, xp: 0, level: 1,
    orders: [], orderCount: 0, nextId: 1, served: 0, area: 0, task: 0, finished: false,
    storage: [], slots: 4, daily: { last: '', day: 0 }, music: true, sfx: true, seenIntro: false, tut: 0,
  };
}
let S;
try {
  const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
  S = raw && raw.v === 1 ? Object.assign(freshState(), raw) : freshState();
} catch (e) { S = freshState(); }
// Older saves: the cat chain, Cat Basket and cat customers are gone. Cat items become Tea & Cakes of the same level,
// baskets become Teapots, cat orders are dropped (fillOrders makes new ones).
const noCat = (o) => {
  if (!o) return o;
  if (o.c === 'cat') o.c = 'tea';
  if (o.g === 'basket') o.g = 'teapot';
  return o;
};
S.board = S.board.map(noCat);
S.storage = S.storage.map(noCat);
S.orders = S.orders.filter((o) => o.who !== 'meme' && o.who !== 'mimi' && !o.items.some((it) => it.c === 'cat'));
delete S.cats;
while (S.area < AREAS.length && S.task >= AREAS[S.area].tasks.length) { S.area++; S.task = 0; }

let saveT = 0, resetting = false;
function save() { clearTimeout(saveT); saveT = setTimeout(saveNow, 400); }
function saveNow() {
  clearTimeout(saveT);
  if (resetting) return;
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage full or blocked */ }
}
document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
window.addEventListener('pagehide', saveNow);

audio.sfx = S.sfx; audio.music = S.music;

// ---------------------------------------------------------------- helpers
const emojiOf = (o) => (o.g ? GENS[o.g].emoji : CHAINS[o.c].items[o.l - 1][0]);
const nameOf = (o) => (o.g ? GENS[o.g].name : CHAINS[o.c].items[o.l - 1][1]);
const isItem = (o) => o && !o.g;
const usable = (o) => o && !o.lock && !o.bubble;
const unlockedChains = () => Object.keys(CHAINS).filter((c) => CHAINS[c].unlock <= S.level);
const unlockedGens = () => unlockedChains().map((c) => CHAINS[c].gen);
const canAfford = () => S.area < AREAS.length && S.stars >= AREAS[S.area].tasks[S.task].cost;
const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const dailyReady = () => S.daily.last !== today();

function canMerge(a, b) {
  if (!a || !b || a === b || b.bubble || a.lock || a.bubble) return false;
  if (a.g || b.g) return a.g === b.g && a.l === b.l && a.l < MAX_GEN && !b.lock;
  return a.c === b.c && a.l === b.l && a.l < MAX_ITEM;
}

function nearestFree(i) {
  const x0 = i % W, y0 = Math.floor(i / W);
  let best = -1, bd = 1e9;
  S.board.forEach((o, k) => {
    if (o) return;
    const d = (k % W - x0) ** 2 + (Math.floor(k / W) - y0) ** 2 + Math.random() * 0.1;
    if (d < bd) { bd = d; best = k; }
  });
  return best;
}

// Put a new thing on the board near the centre, or in storage if the board is full.
function placeNew(o, near = CENTER) {
  const k = nearestFree(near);
  if (k >= 0) { S.board[k] = o; spawned.push(k); return 'board'; }
  S.storage.push(o);
  return 'storage';
}
let spawned = []; // cells to animate after the next render

function regen() {
  const now = Date.now(), step = ENERGY_SECS * 1000;
  if (S.energy >= ENERGY_MAX) { S.energyTs = now; return; }
  const n = Math.floor((now - S.energyTs) / step);
  if (n > 0) {
    S.energy = Math.min(ENERGY_MAX, S.energy + n);
    S.energyTs = S.energy >= ENERGY_MAX ? now : S.energyTs + n * step;
  }
}

// ---------------------------------------------------------------- queue (modals / dialogue wait their turn)
const Q = [];
let hold = false;
function queue(fn, front = false) { if (front) Q.unshift(fn); else Q.push(fn); pump(); }
function isBusy() { return hold || !$('sheet').hidden || !$('dlg').hidden; }
function pump() { if (Q.length && !isBusy()) Q.shift()(); }

// ---------------------------------------------------------------- effects
function anim(el, cls) {
  if (!el) return;
  el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
  el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
}
function fxSpan(txt, cls, x, y) {
  const s = document.createElement('span');
  s.className = 'fx ' + cls; s.textContent = txt; s.style.left = x + 'px'; s.style.top = y + 'px';
  $('fx').append(s);
  return s;
}
const mid = (r) => [r.left + r.width / 2, r.top + r.height / 2];

function burst(el, n = 10) {
  if (!el) return;
  const [cx, cy] = mid(el.getBoundingClientRect());
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + Math.random() * 0.6, d = 28 + Math.random() * 42;
    const star = k % 3 === 0;
    const s = fxSpan(star ? '✨' : '', star ? '' : 'dot', cx, cy);
    if (!star) s.style.background = pick(COLORS);
    s.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px) scale(.2)`, opacity: 0 },
    ], { duration: 520 + Math.random() * 260, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => s.remove();
  }
}

// Little icons fly from a rect to a HUD pill; the pill bounces when they land.
function flyTo(from, emoji, target, n, sound) {
  const [fx, fy] = mid(from), [tx, ty] = mid(target.getBoundingClientRect());
  for (let k = 0; k < n; k++) {
    const x = fx + (Math.random() - 0.5) * 40, y = fy + (Math.random() - 0.5) * 20;
    const s = fxSpan(emoji, 'fly', x, y), dx = tx - x, dy = ty - y;
    const a = s.animate([
      { transform: 'translate(0,0) scale(.4)', opacity: 0 },
      { transform: `translate(${dx * 0.25 + (Math.random() - 0.5) * 40}px, ${dy * 0.25 - 50}px) scale(1.25)`, opacity: 1, offset: 0.35 },
      { transform: `translate(${dx}px, ${dy}px) scale(.6)`, opacity: 1 },
    ], { duration: 780, delay: k * 80, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'backwards' });
    a.onfinish = () => { s.remove(); anim(target, 'bump'); if (sound) sound(); };
  }
}

function confetti(n = 90) {
  for (let k = 0; k < n; k++) {
    const d = document.createElement('div');
    d.className = 'conf';
    d.style.left = Math.random() * 100 + 'vw';
    d.style.background = pick(COLORS);
    d.style.width = 6 + rnd(6) + 'px';
    $('fx').append(d);
    const drift = (Math.random() - 0.5) * 160;
    d.animate([
      { transform: 'translate(0,0) rotate(0)' },
      { transform: `translate(${drift}px, 110vh) rotate(${360 + rnd(720)}deg)` },
    ], { duration: 1800 + rnd(1600), delay: rnd(500), easing: 'cubic-bezier(.3,.2,.6,1)', fill: 'backwards' }).onfinish = () => d.remove();
  }
}

// ---------------------------------------------------------------- board rendering
const cells = [];
let sel = -1, drag = null, hintOn = false, lastAct = Date.now();

function buildBoard() {
  for (let i = 0; i < W * H; i++) {
    const d = document.createElement('div');
    d.className = 'cell' + ((i % W + Math.floor(i / W)) % 2 ? ' alt' : '');
    d.dataset.i = i;
    $('board').append(d);
    cells.push(d);
  }
}
const itEl = (i) => cells[i] && cells[i].firstElementChild;

function wantedKeys() {
  const s = new Set();
  for (const o of S.orders) for (const it of o.items) s.add(it.c + it.l);
  return s;
}

function cellHTML(o, want) {
  if (!o) return '';
  if (o.g) {
    const tut = S.tut === 0 && S.seenIntro && o.g === 'pot' ? ' tut' : '';
    return `<div class="it gen${tut}"><span class="e">${GENS[o.g].emoji}</span><b class="lv">${'★'.repeat(o.l)}</b></div>`;
  }
  const cls = ['it'];
  if (o.lock) cls.push('lock');
  if (o.bubble) cls.push('bub');
  if (o.l === MAX_ITEM) cls.push('max');
  const ok = usable(o) && want.has(o.c + o.l) ? '<i class="ok">✓</i>' : '';
  return `<div class="${cls.join(' ')}"><span class="e">${emojiOf(o)}</span>${ok}${o.bubble ? '<i class="cd"></i>' : ''}</div>`;
}

function renderBoard() {
  const want = wantedKeys();
  S.board.forEach((o, i) => {
    cells[i].innerHTML = cellHTML(o, want);
    cells[i].classList.toggle('sel', i === sel && !!o);
  });
  if (drag && drag.on) itEl(drag.from)?.classList.add('dragging');
  hintOn = false;
  for (const k of spawned) anim(itEl(k), 'spawn');
  spawned = [];
  updateTimers();
}

function layout() {
  const r = $('boardwrap').getBoundingClientRect();
  const c = Math.floor(Math.min((r.width - 24) / W, (r.height - 20) / H));
  document.documentElement.style.setProperty('--cell', Math.max(28, c) + 'px');
}

function cellAt(x, y) {
  const r = $('board').getBoundingClientRect(), pad = 5, cw = (r.width - pad * 2) / W, ch = (r.height - pad * 2) / H;
  const cx = Math.floor((x - r.left - pad) / cw), cy = Math.floor((y - r.top - pad) / ch);
  if (cx < 0 || cy < 0 || cx >= W || cy >= H) return -1;
  return cy * W + cx;
}

// Animate the item now in cell k as if it moved there from rect `from`.
function flipFrom(k, from, dur = 380) {
  const el = itEl(k);
  if (!el || !from) return;
  const to = cells[k].getBoundingClientRect();
  cells[k].style.zIndex = 5;
  el.animate([
    { transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(.35)` },
    { transform: 'translate(0,0) scale(1.18)', offset: 0.75 },
    { transform: 'none' },
  ], { duration: dur, easing: 'ease-out' }).onfinish = () => { cells[k].style.zIndex = ''; };
}

// ---------------------------------------------------------------- input: tap + drag
function startDrag(o, e) {
  const g = document.createElement('div');
  g.className = 'ghost';
  g.textContent = emojiOf(o);
  g.style.fontSize = Math.round(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell')) * 0.8) + 'px';
  document.body.append(g);
  drag.ghost = g;
  itEl(drag.from)?.classList.add('dragging');
  sel = drag.from;
  clearHint();
  play.pick();
  moveGhost(e.clientX, e.clientY);
}

function moveGhost(x, y) {
  const g = drag.ghost;
  g.style.transform = `translate(${x - g.offsetWidth / 2}px, ${y - g.offsetHeight / 2 - 18}px) scale(1.1)`;
  const j = cellAt(x, y);
  if (j !== drag.over) {
    if (drag.over >= 0) cells[drag.over].classList.remove('over', 'over-merge');
    drag.over = j;
    if (j >= 0 && j !== drag.from) cells[j].classList.add(canMerge(S.board[drag.from], S.board[j]) ? 'over-merge' : 'over');
  }
}

function endDrag(d, x, y) {
  d.ghost.remove();
  if (d.over >= 0) cells[d.over].classList.remove('over', 'over-merge');
  const sr = $('n-store').getBoundingClientRect();
  if (x >= sr.left && x <= sr.right && y >= sr.top && y <= sr.bottom) return storeFrom(d.from);
  drop(d.from, cellAt(x, y), d.ghost.getBoundingClientRect());
}

$('board').addEventListener('pointerdown', (e) => {
  const c = e.target.closest('.cell');
  if (!c || drag) return;
  drag = { from: +c.dataset.i, x: e.clientX, y: e.clientY, on: false, id: e.pointerId, over: -1 };
});
window.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  if (!drag.on) {
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 9) return;
    const o = S.board[drag.from];
    if (!usable(o)) { drag = null; return; }
    drag.on = true;
    startDrag(o, e);
  }
  moveGhost(e.clientX, e.clientY);
});
window.addEventListener('pointerup', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag; drag = null;
  if (d.on) endDrag(d, e.clientX, e.clientY); else tapCell(d.from);
});
window.addEventListener('pointercancel', () => {
  if (!drag) return;
  const d = drag; drag = null;
  if (d.on) { d.ghost.remove(); if (d.over >= 0) cells[d.over].classList.remove('over', 'over-merge'); renderBoard(); }
});
document.addEventListener('contextmenu', (e) => e.preventDefault());

function tapCell(i) {
  const o = S.board[i];
  lastAct = Date.now();
  if (!o) { sel = -1; renderBoard(); renderInfo(); return; }
  sel = i;
  if (o.g) return produce(i);
  play.tap();
  renderBoard(); renderInfo(); clearHint();
  anim(itEl(i), 'pop-s');
}

function drop(i, j, ghostRect) {
  const a = S.board[i], b = j >= 0 ? S.board[j] : null;
  if (j < 0 || j === i) { renderBoard(); flipFrom(i, ghostRect, 260); return; }
  if (b && canMerge(a, b)) return merge(i, j);
  if (b && !usable(b)) { play.error(); renderBoard(); flipFrom(i, ghostRect, 260); anim(cells[j], 'shake'); return; }
  const fromJ = cells[j].getBoundingClientRect();
  S.board[j] = a; S.board[i] = b || null; sel = j;
  play.drop();
  after();
  flipFrom(j, ghostRect, 220);
  if (b) flipFrom(i, fromJ, 300);
}

function merge(i, j) {
  const a = S.board[i], b = S.board[j];
  const res = a.g ? { g: a.g, l: a.l + 1 } : { c: a.c, l: a.l + 1 };
  const freed = !!b.lock;
  S.board[i] = null; S.board[j] = res; sel = j;
  play.merge(res.l);
  if (S.tut === 1) S.tut = 2;
  let bub = -1;
  if (isItem(res) && res.l >= 2 && Math.random() < 0.06) {
    bub = nearestFree(j);
    if (bub >= 0) S.board[bub] = { c: res.c, l: res.l, bubble: Date.now() + 60000 };
  }
  after();
  anim(itEl(j), 'pop');
  burst(cells[j], res.l >= 5 ? 16 : 10);
  if (freed) { const [x, y] = mid(cells[j].getBoundingClientRect()); leafPuff(x, y); }
  if (bub >= 0) { anim(itEl(bub), 'spawn'); setTimeout(play.bubble, 250); }
}

function leafPuff(x, y) {
  for (let k = 0; k < 6; k++) {
    const s = fxSpan(pick(['🍃', '🌿']), '', x, y), a = Math.random() * Math.PI * 2;
    s.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 },
      { transform: `translate(${Math.cos(a) * 50}px, ${Math.sin(a) * 50 + 30}px) rotate(${rnd(360)}deg)`, opacity: 0 }],
    { duration: 800, easing: 'ease-out' }).onfinish = () => s.remove();
  }
}

function produce(i) {
  const o = S.board[i];
  regen();
  if (S.energy <= 0) { play.error(); anim(itEl(i), 'shake'); openShop(); return; }
  const k = nearestFree(i);
  if (k < 0) { play.error(); anim(itEl(i), 'shake'); renderInfo(); return; }
  S.energy--;
  const odds = GEN_ODDS[o.l];
  let r = Math.random(), l = 1;
  for (let n = 0; n < odds.length; n++) { if (r < odds[n]) { l = n + 1; break; } r -= odds[n]; }
  S.board[k] = { c: GENS[o.g].chain, l };
  if (S.tut === 0) S.tut = 1;
  const from = cells[i].getBoundingClientRect();
  play.spawn();
  after();
  flipFrom(k, from);
  anim(itEl(i), 'wobble');
}

function storeFrom(i) {
  const o = S.board[i];
  if (!usable(o)) { renderBoard(); return; }
  if (S.storage.length >= S.slots) { play.error(); anim($('n-store'), 'shake'); renderBoard(); return; }
  S.storage.push(o); S.board[i] = null; sel = -1;
  play.drop();
  after();
  anim($('n-store'), 'bump');
}

function sell(i) {
  const o = S.board[i];
  if (!isItem(o) || !usable(o)) return;
  const v = 2 ** (o.l - 1), r = cells[i].getBoundingClientRect();
  S.board[i] = null; S.coins += v; sel = -1;
  after();
  flyTo(r, '🪙', $('p-coin'), Math.min(5, v), play.coin);
}

function popBubble(i) {
  const o = S.board[i];
  if (!o || !o.bubble) return;
  if (S.gems < o.l) { play.error(); anim(itEl(i), 'shake'); return; }
  S.gems -= o.l; delete o.bubble;
  play.bubble();
  after();
  anim(itEl(i), 'pop'); burst(cells[i], 12);
}

// ---------------------------------------------------------------- idle hint
function findPair() {
  for (let i = 0; i < S.board.length; i++) {
    const a = S.board[i];
    if (!usable(a)) continue;
    for (let j = 0; j < S.board.length; j++) if (j !== i && canMerge(a, S.board[j])) return [i, j];
  }
  return null;
}
function showHint() {
  const p = findPair();
  if (!p) return;
  hintOn = true;
  for (const i of p) itEl(i)?.classList.add('hint');
}
function clearHint() {
  hintOn = false;
  for (const e of document.querySelectorAll('.it.hint')) e.classList.remove('hint');
}

// ---------------------------------------------------------------- orders
const newIds = new Set();
const maxOrders = () => (S.level >= 5 ? 4 : 3);

function makeOrder() {
  S.orderCount++;
  const id = S.nextId++;
  if (S.orderCount === 1) {
    return { id, who: 'pedro', line: 'Can you grow me a little sprout? 🌿', items: [{ c: 'flower', l: 2 }], coins: 10, stars: 2, xp: 6, gems: 0, until: 0 };
  }
  const timed = S.orderCount % 5 === 0;
  const busy = S.orders.map((o) => o.who);
  let pool = CUSTOMERS.filter((w) => !busy.includes(w));
  if (!pool.length) pool = CUSTOMERS;
  const who = pick(pool);
  const chains = unlockedChains();
  const maxN = S.level <= 1 ? 1 : S.level < 3 ? 2 : 3;
  const n = 1 + rnd(maxN);
  const cap = Math.min(7, 2 + Math.floor(S.level / 2));
  const items = [];
  for (let k = 0; k < n; k++) items.push({ c: pick(chains), l: Math.max(1, Math.ceil(Math.random() ** 1.5 * cap)) });
  items.sort((a, b) => a.c.localeCompare(b.c) || a.l - b.l);
  let coins = 0, stars = 1, xp = 0;
  for (const it of items) { coins += 3 * 2 ** (it.l - 1); stars += Math.ceil(it.l / 2); xp += 2 * it.l; }
  const m = timed ? 2 : 1;
  return { id, who, line: pick(ORDER_CHATTER[who]), items, coins: coins * m, stars: stars * m, xp, gems: timed ? 2 : 0, until: timed ? Date.now() + 8 * 60000 : 0 };
}

function fillOrders() {
  while (S.orders.length < maxOrders()) {
    const o = makeOrder();
    newIds.add(o.id);
    S.orders.push(o);
  }
}

// Board cells that would be used to serve an order (-1 where an item is missing).
function findItems(order) {
  const used = [];
  for (const it of order.items) {
    used.push(S.board.findIndex((o, i) => isItem(o) && usable(o) && o.c === it.c && o.l === it.l && !used.includes(i)));
  }
  return used;
}

function renderOrders() {
  const box = $('orders'), sl = box.scrollLeft;
  box.innerHTML = S.orders.map((o) => {
    const used = findItems(o), ready = !used.includes(-1);
    const cls = ['order'];
    if (ready) cls.push('ready');
    if (o.until) cls.push('timed');
    if (newIds.has(o.id)) cls.push('new');
    if (ready && S.tut === 2) cls.push('tut');
    const items = o.items.map((it, k) => `<span class="oit${used[k] >= 0 ? ' have' : ''}">${CHAINS[it.c].items[it.l - 1][0]}<i>✓</i></span>`).join('');
    return `<div class="${cls.join(' ')}" data-id="${o.id}">
      <div class="ohead">${face(o.who)}<div class="oname">${PEOPLE[o.who].name}${o.until ? `<span class="otime" data-until="${o.until}">⏱</span>` : ''}</div></div>
      <p class="oline">${o.line}</p>
      <div class="oitems">${items}</div>
      <div class="ofoot"><div class="orew"><span>🪙${o.coins}</span><span>⭐${o.stars}</span>${o.gems ? `<span>💎${o.gems}</span>` : ''}</div>
      <button class="serve"${ready ? '' : ' disabled'}>Serve</button></div>
    </div>`;
  }).join('');
  box.scrollLeft = sl;
  newIds.clear();
}

$('orders').addEventListener('click', (e) => {
  const b = e.target.closest('.serve'), card = e.target.closest('.order');
  if (b && card) serve(+card.dataset.id);
});

let hudHold = 0;
function serve(id) {
  const o = S.orders.find((x) => x.id === id);
  if (!o) return;
  const used = findItems(o);
  if (used.includes(-1)) return;
  const card = document.querySelector(`.order[data-id="${id}"]`), cr = card.getBoundingClientRect();
  // Items fly from the board into the customer's card.
  for (const k of used) {
    const r = cells[k].getBoundingClientRect(), [x, y] = mid(r), [tx, ty] = mid(cr);
    const s = fxSpan(emojiOf(S.board[k]), 'item', x, y);
    s.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${tx - x}px, ${ty - y}px) scale(.3)`, opacity: 0.4 }],
      { duration: 450, easing: 'cubic-bezier(.5,0,.7,1)' }).onfinish = () => s.remove();
    S.board[k] = null;
  }
  S.orders = S.orders.filter((x) => x !== o);
  S.coins += o.coins; S.stars += o.stars; S.gems += o.gems; S.served++;
  if (S.tut === 2) S.tut = 3;
  sel = -1;
  play.serve();
  hudHold = Date.now() + 1100;
  setTimeout(() => {
    flyTo(cr, '🪙', $('p-coin'), Math.min(6, 2 + Math.floor(o.coins / 15)), play.coin);
    flyTo(cr, '⭐', $('p-star'), Math.min(6, o.stars), play.star);
    if (o.gems) flyTo(cr, '💎', $('p-gem'), o.gems, play.coin);
    setTimeout(renderHUD, 900);
  }, 350);
  addXP(o.xp);
  fillOrders();
  after();
}

// ---------------------------------------------------------------- levels
function addXP(n) {
  S.xp += n;
  while (S.xp >= xpNeed(S.level)) {
    S.xp -= xpNeed(S.level);
    S.level++;
    const lv = S.level, rewards = ['💎 +5', '⚡ Energy refilled'];
    S.gems += 5;
    S.energy = Math.max(S.energy, ENERGY_MAX);
    for (const c of Object.keys(CHAINS)) {
      if (CHAINS[c].unlock === lv) { placeNew({ g: CHAINS[c].gen, l: 1 }); rewards.push(`New: ${GENS[CHAINS[c].gen].emoji} ${GENS[CHAINS[c].gen].name}!`); }
    }
    let gift = LEVEL_GIFTS[lv];
    if (gift && !unlockedGens().includes(gift)) gift = 'pot';
    if (gift) { placeNew({ g: gift, l: 1 }); rewards.push(`🎁 ${GENS[gift].emoji} ${GENS[gift].name}`); }
    queue(() => levelModal(lv, rewards));
  }
  fillOrders();
}

function levelModal(lv, rewards) {
  confetti(100);
  play.levelUp();
  openSheet(`<div class="big">🎉</div><h2>Level ${lv}!</h2><p class="note">You're blooming! 🌸</p>
    <div class="rewards">${rewards.map((r) => `<div>${r}</div>`).join('')}</div>
    <button class="wide" data-close>Yay!</button>`, null, true);
}

function openLevel() {
  const next = Object.keys(CHAINS).filter((c) => CHAINS[c].unlock > S.level)
    .map((c) => `<div class="srow"><span class="sic">${GENS[CHAINS[c].gen].emoji}</span><div><b>${GENS[CHAINS[c].gen].name}</b><small>${CHAINS[c].name}</small></div><b>Level ${CHAINS[c].unlock}</b></div>`);
  openSheet(`<h2>Level ${S.level}</h2><p class="note">${S.xp} / ${xpNeed(S.level)} XP — serve orders and fix up the garden to level up.</p>
    <div class="bar"><i style="width:${(S.xp / xpNeed(S.level)) * 100}%"></i></div>
    ${next.length ? `<h3>Coming up</h3>${next.join('')}` : '<p class="note">Everything is unlocked! 🌸</p>'}`);
}

// ---------------------------------------------------------------- HUD, info, nav
function renderHUD() {
  regen();
  $('lvln').textContent = S.level;
  $('xpring').style.strokeDashoffset = 106.8 * (1 - Math.min(1, S.xp / xpNeed(S.level)));
  $('en').textContent = S.energy;
  if (Date.now() >= hudHold) {
    $('coins').textContent = S.coins; $('stars').textContent = S.stars; $('gems').textContent = S.gems;
  }
  $('g-stars').textContent = S.stars;
  $('ent').textContent = S.energy < ENERGY_MAX ? `+1 in ${fmt(Math.max(0, ENERGY_SECS - Math.floor((Date.now() - S.energyTs) / 1000)))}` : '';
}

function renderInfo() {
  const el = $('info'), o = sel >= 0 ? S.board[sel] : null;
  if (!o) {
    el.innerHTML = `<span class="ibig">🌸</span><div class="itext"><b>Flower Garden</b><span>Tap a generator to grow things. Drag two of the same together to merge!</span></div>`;
    return;
  }
  const big = `<span class="ibig">${emojiOf(o)}</span>`;
  if (o.g) {
    const g = GENS[o.g], ch = CHAINS[g.chain];
    const up = o.l < MAX_GEN ? ` Merge two ★${o.l} to upgrade.` : ' Fully upgraded!';
    el.innerHTML = `${big}<div class="itext"><b>${g.name} ${'★'.repeat(o.l)}</b><span>Tap to grow ${ch.name} (⚡1).${up}</span></div><button class="ib" data-act="store">📦</button>`;
  } else if (o.lock) {
    el.innerHTML = `${big}<div class="itext"><b>Overgrown ${nameOf(o)} 🌿</b><span>Merge another ${emojiOf(o)} ${nameOf(o)} into it to free it.</span></div>`;
  } else if (o.bubble) {
    el.innerHTML = `${big}<div class="itext"><b>Bubble ${nameOf(o)} 🫧</b><span>Pop it to keep it — or it floats away for 🪙${o.l}.</span></div><button class="ib main" data-act="pop">Pop 💎${o.l}</button>`;
  } else {
    const ch = CHAINS[o.c], next = o.l < MAX_ITEM ? `Merge two to get ${ch.items[o.l][0]} ${ch.items[o.l][1]}` : 'Max level! 🏆';
    el.innerHTML = `${big}<div class="itext"><b>${nameOf(o)} · Lv ${o.l}/${MAX_ITEM}</b><span>${next}</span></div>
      <button class="ib" data-act="store">📦</button><button class="ib" data-act="sell">Sell 🪙${2 ** (o.l - 1)}</button>`;
  }
}

$('info').addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b || sel < 0) return;
  const act = b.dataset.act;
  if (act === 'sell') sell(sel);
  else if (act === 'store') storeFrom(sel);
  else if (act === 'pop') popBubble(sel);
});

function renderNav() {
  $('n-store-t').textContent = `${S.storage.length}/${S.slots}`;
  $('n-garden-b').hidden = !canAfford();
  $('n-daily-d').hidden = !dailyReady();
}

function updateTimers() {
  const now = Date.now();
  S.board.forEach((o, i) => {
    if (o && o.bubble) { const c = cells[i].querySelector('.cd'); if (c) c.textContent = Math.max(0, Math.ceil((o.bubble - now) / 1000)); }
  });
  for (const t of document.querySelectorAll('.otime')) t.textContent = `⏱ ${fmt(Math.max(0, Math.ceil((+t.dataset.until - now) / 1000)))}`;
}

function renderAll() { renderBoard(); renderOrders(); renderHUD(); renderInfo(); renderNav(); }
function after() { lastAct = Date.now(); clearHint(); renderAll(); save(); }

// ---------------------------------------------------------------- sheets
function openSheet(html, bind, center = false) {
  const sh = $('sheet'), again = !sh.hidden;
  sh.className = 'sheet' + (center ? ' center' : '') + (again ? ' noanim' : '');
  sh.innerHTML = (center ? '' : '<button class="x" data-close>✕</button>') + html;
  sh.hidden = false; $('backdrop').hidden = false;
  if (!again) play.open();
  for (const b of sh.querySelectorAll('[data-close]')) b.addEventListener('click', closeSheet);
  if (bind) bind(sh);
}
function closeSheet() {
  $('sheet').hidden = true; $('backdrop').hidden = true;
  pump();
}
$('backdrop').addEventListener('click', () => { if (!$('sheet').classList.contains('center')) closeSheet(); });

function openShop() {
  const chains = unlockedChains();
  const rows = [
    { icon: '⚡', name: '+100 Energy', sub: 'A big boost', price: '💎 20', can: S.gems >= 20, buy: () => { S.gems -= 20; S.energy += 100; } },
    { icon: '⚡', name: '+50 Energy', sub: 'A little boost', price: '🪙 300', can: S.coins >= 300, buy: () => { S.coins -= 300; S.energy += 50; } },
    { icon: '🎁', name: 'Mystery Box', sub: '3 surprise items', price: '🪙 150', can: S.coins >= 150,
      buy: () => { S.coins -= 150; for (let k = 0; k < 3; k++) placeNew({ c: pick(chains), l: 2 + rnd(2) }); } },
    ...unlockedGens().map((g) => ({ icon: GENS[g].emoji, name: GENS[g].name, sub: 'Merge two to upgrade', price: '🪙 400', can: S.coins >= 400,
      buy: () => { S.coins -= 400; placeNew({ g, l: 1 }); } })),
    { icon: '📦', name: 'Storage slot', sub: `${S.slots}/10 slots`, price: '💎 15', can: S.gems >= 15 && S.slots < 10, buy: () => { S.gems -= 15; S.slots++; } },
  ];
  openSheet(`<h2>Shop 🛍️</h2><p class="note">You have 🪙${S.coins} · 💎${S.gems} · ⚡${S.energy}</p>
    ${rows.map((r, k) => `<div class="srow"><span class="sic">${r.icon}</span><div><b>${r.name}</b><small>${r.sub}</small></div><button data-k="${k}"${r.can ? '' : ' disabled'}>${r.price}</button></div>`).join('')}`,
  (sh) => {
    for (const b of sh.querySelectorAll('[data-k]')) {
      b.addEventListener('click', () => {
        const r = rows[+b.dataset.k];
        if (!r.can) return;
        r.buy(); play.coin(); burst(b, 10);
        after(); openShop();
      });
    }
  });
}

function openStorage() {
  const n = Math.max(S.slots, S.storage.length);
  let html = '';
  for (let k = 0; k < n; k++) html += S.storage[k] ? `<button class="slot" data-k="${k}">${emojiOf(S.storage[k])}</button>` : '<div class="slot"></div>';
  openSheet(`<h2>Storage 📦</h2><p class="note">Drag items onto 📦 to store them. Tap one here to put it back on the board.</p>
    <div class="slots">${html}</div>
    ${S.slots < 10 ? `<button class="wide ghost" id="buyslot"${S.gems >= 15 ? '' : ' disabled'}>+1 slot for 💎15</button>` : ''}`, (sh) => {
    for (const b of sh.querySelectorAll('[data-k]')) {
      b.addEventListener('click', () => {
        const k = nearestFree(CENTER);
        if (k < 0) { play.error(); anim(b, 'shake'); return; }
        S.board[k] = S.storage.splice(+b.dataset.k, 1)[0];
        spawned.push(k);
        play.spawn(); after(); openStorage();
      });
    }
    const buy = sh.querySelector('#buyslot');
    if (buy) buy.addEventListener('click', () => { if (S.gems < 15) return; S.gems -= 15; S.slots++; play.coin(); after(); openStorage(); });
  });
}

function rewardText(r) {
  return [r.coins && `🪙${r.coins}`, r.energy && `⚡${r.energy}`, r.gems && `💎${r.gems}`, r.gen && '🎁'].filter(Boolean).join(' ');
}
function openDaily() {
  const cur = S.daily.day % 7, ready = dailyReady();
  const days = DAILY.map((r, k) => `<div class="day${k < cur ? ' got' : ''}${k === cur && ready ? ' now' : ''}"><small>Day ${k + 1}</small><span>${rewardText(r)}</span></div>`).join('');
  openSheet(`<h2>Daily Gift 🎁</h2><p class="note">Come back every day for a present!</p><div class="days">${days}</div>
    <button class="wide" id="claim"${ready ? '' : ' disabled'}>${ready ? 'Claim!' : 'Come back tomorrow! 🌙'}</button>`, (sh) => {
    sh.querySelector('#claim').addEventListener('click', () => {
      if (!dailyReady()) return;
      const r = DAILY[S.daily.day % 7];
      S.coins += r.coins || 0; S.energy += r.energy || 0; S.gems += r.gems || 0;
      if (r.gen) placeNew({ g: pick(unlockedGens()), l: 1 });
      S.daily.day++; S.daily.last = today();
      play.serve(); confetti(50);
      after(); openDaily();
    });
  });
}

function openSettings(confirming = false) {
  openSheet(`<h2>Settings</h2>
    <div class="row"><span>🎵 Music</span><button class="switch${S.music ? ' on' : ''}" id="s-music"></button></div>
    <div class="row"><span>🔊 Sound effects</span><button class="switch${S.sfx ? ' on' : ''}" id="s-sfx"></button></div>
    <button class="wide ghost danger" id="s-reset">${confirming ? 'Tap again to confirm — everything resets!' : 'Reset progress'}</button>
    <p class="note small">Flower Garden · made with love 🌸</p>`, (sh) => {
    sh.querySelector('#s-music').addEventListener('click', () => { S.music = !S.music; setMusic(S.music); save(); openSettings(); });
    sh.querySelector('#s-sfx').addEventListener('click', () => { S.sfx = !S.sfx; audio.sfx = S.sfx; play.tap(); save(); openSettings(); });
    sh.querySelector('#s-reset').addEventListener('click', () => {
      if (!confirming) return openSettings(true);
      resetting = true;
      try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
      location.reload();
    });
  });
}

// ---------------------------------------------------------------- dialogue
let dq = null;
function dialogue(lines, done) {
  dq = { lines, i: 0, done, typing: 0 };
  $('dlg').hidden = false;
  showLine();
}
function showLine() {
  const [who, text] = dq.lines[dq.i], chars = Array.from(text), t = $('dlg-text');
  $('dlg-face').innerHTML = face(who);
  $('dlg-name').textContent = PEOPLE[who].name;
  anim($('dlg-face'), 'pop');
  t.textContent = '';
  let n = 0;
  clearInterval(dq.typing);
  dq.typing = setInterval(() => {
    n++;
    t.textContent = chars.slice(0, n).join('');
    if (n % 3 === 1) play.blip();
    if (n >= chars.length) { clearInterval(dq.typing); dq.typing = 0; }
  }, 20);
}
$('dlg').addEventListener('click', () => {
  if (!dq) return;
  if (dq.typing) { clearInterval(dq.typing); dq.typing = 0; $('dlg-text').textContent = dq.lines[dq.i][1]; return; }
  dq.i++;
  if (dq.i < dq.lines.length) { showLine(); return; }
  const cb = dq.done;
  dq = null; $('dlg').hidden = true;
  if (cb) cb();
  pump();
});

// ---------------------------------------------------------------- garden (renovation)
let gView = 0;
function openGarden() {
  gView = Math.min(S.area, AREAS.length - 1);
  $('garden').hidden = false;
  play.open();
  renderGarden();
}

function renderGarden(fresh = -1) {
  const a = gView, area = AREAS[a];
  const done = a < S.area ? area.tasks.length : S.task;
  $('g-title').textContent = area.name;
  $('g-stars').textContent = S.stars;
  const top = Math.min(S.area, AREAS.length - 1);
  $('g-tabs').innerHTML = top > 0 ? AREAS.slice(0, top + 1).map((x, k) => `<button data-a="${k}" class="${k === a ? 'on' : ''}">${x.name}</button>`).join('') : '';
  $('g-scene').innerHTML = scene(a, done, fresh);
  let html = `<div class="prog"><span>${done}/${area.tasks.length}</span><div class="bar"><i style="width:${(done / area.tasks.length) * 100}%"></i></div></div>`;
  if (a === S.area && S.area < AREAS.length) {
    const t = area.tasks[S.task];
    html += `<div class="task"><span class="tic">🔨</span><div><b>${t.name}</b><small>${S.stars >= t.cost ? 'Ready to do!' : `Need ${t.cost - S.stars} more ⭐ — serve orders!`}</small></div>
      <button id="dotask"${S.stars >= t.cost ? '' : ' disabled'}>⭐${t.cost}</button></div>`;
  } else if (S.area >= AREAS.length && a === AREAS.length - 1) {
    html += '<div class="alldone">All done! 🌸 The whole garden is restored.<br>Keep serving orders — the town loves you!</div>';
  } else {
    html += '<div class="alldone">Completed! ✓</div>';
  }
  html += `<ul class="tlist">${area.tasks.map((t, k) => `<li class="${k < done ? 'done' : k === done && a === S.area ? 'next' : ''}">${k < done ? '✅' : '⬜'} ${t.name}<span>⭐${t.cost}</span></li>`).join('')}</ul>`;
  $('g-panel').innerHTML = html;
  const b = $('dotask');
  if (b) b.addEventListener('click', doTask);
}

$('g-tabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-a]');
  if (b) { gView = +b.dataset.a; play.tap(); renderGarden(); }
});
$('g-back').addEventListener('click', () => { $('garden').hidden = true; play.tap(); renderAll(); });

function doTask() {
  if (hold || S.area >= AREAS.length) return;
  const area = AREAS[S.area], t = area.tasks[S.task];
  if (S.stars < t.cost) { play.error(); anim($('dotask'), 'shake'); return; }
  S.stars -= t.cost;
  const ti = S.task, a = S.area;
  S.task++;
  if (t.areaDone) {
    // Move on right away (so a closed app never gets stuck); the view stays on the finished area until the story ends.
    S.gems += 20;
    placeNew({ g: pick(unlockedGens()), l: 1 });
    S.area++; S.task = 0;
    if (t.finale) S.finished = true;
  }
  gView = a;
  hold = true;
  play.task();
  renderGarden(ti);
  const n = $('g-scene').querySelector('.t.new');
  setTimeout(() => { burst(n || $('g-scene'), 18); burst($('g-scene'), 10); }, 350);
  addXP(5 + t.cost);
  renderHUD(); save();
  setTimeout(() => {
    hold = false;
    queue(() => dialogue(t.story, () => {
      if (t.areaDone) {
        if (t.finale) queue(finale, true); else queue(() => areaModal(area.name), true);
        gView = Math.min(S.area, AREAS.length - 1);
      }
      save(); renderGarden(); renderAll();
    }), true);
  }, 1300);
}

function areaModal(name) {
  confetti(120); play.levelUp();
  openSheet(`<div class="big">🏡✨</div><h2>${name} restored!</h2><p class="note">Something new is waiting: ${AREAS[S.area].name}!</p>
    <div class="rewards"><div>💎 +20</div><div>🎁 New generator</div></div><button class="wide" data-close>Let's go!</button>`, null, true);
}

function finale() {
  confetti(180); play.levelUp();
  setTimeout(() => confetti(120), 900);
  openSheet(`<div class="big">💐🎉😻</div><h2>The End… or is it?</h2>
    <p class="note">The Secret Garden is finished, the tulip thief is caught, and Basil & Petunia are engaged!<br>But customers keep coming — keep merging! 🌸</p>
    <div class="rewards"><div>💎 +20</div><div>🎁 New generator</div></div><button class="wide" data-close>Keep merging!</button>`, null, true);
}

// ---------------------------------------------------------------- nav + HUD buttons
$('n-store').addEventListener('click', openStorage);
$('n-garden').addEventListener('click', openGarden);
$('n-shop').addEventListener('click', openShop);
$('n-daily').addEventListener('click', openDaily);
$('n-set').addEventListener('click', () => openSettings());
$('p-en').addEventListener('click', openShop);
$('p-gem').addEventListener('click', openShop);
$('p-coin').addEventListener('click', openShop);
$('p-star').addEventListener('click', openGarden);
$('lvl').addEventListener('click', openLevel);

document.addEventListener('pointerdown', () => unlock(), { capture: true });

// ---------------------------------------------------------------- game loop (1 s)
setInterval(() => {
  regen();
  const now = Date.now();
  let changed = false;
  S.board.forEach((o, i) => {
    if (o && o.bubble && now > o.bubble) {
      const r = cells[i].getBoundingClientRect();
      S.board[i] = null; S.coins += o.l; changed = true;
      if (sel === i) sel = -1;
      flyTo(r, '🪙', $('p-coin'), 2, play.coin);
    }
  });
  S.orders.forEach((o, k) => {
    if (o.until && now > o.until) { const n = makeOrder(); newIds.add(n.id); S.orders[k] = n; changed = true; }
  });
  if (changed) after();
  else { renderHUD(); updateTimers(); renderNav(); }
  const idle = S.tut === 1 ? 1500 : 7000;
  if (!hintOn && !drag && now - lastAct > idle && !isBusy() && $('garden').hidden && S.seenIntro) showHint();
}, 1000);

// ---------------------------------------------------------------- start
buildBoard();
layout();
new ResizeObserver(layout).observe($('boardwrap'));
regen();
fillOrders();
renderAll();
if (!S.seenIntro) {
  queue(() => dialogue(INTRO, () => { S.seenIntro = true; save(); renderAll(); }));
}
