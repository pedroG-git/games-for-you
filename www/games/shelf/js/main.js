// Shelf Sort — UI. Rules live in engine.js, levels in levels.js, pictures in items.js.
import * as E from './engine.js';
import { levelFor, dailyFor, isHard } from './levels.js';
import { itemURL } from './items.js';
import * as snd from './audio.js';

const $ = (id) => document.getElementById(id);
const load = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } };
const HELPERS = ['undo', 'hint', 'shuffle', 'magnet', 'extra'];
const ICONS = { undo: '↶', hint: '💡', shuffle: '🔀', magnet: '🧲', extra: '⏳' };
const COMBO_MS = 4000;

// ---------------------------------------------------------------- save
const saved = load('shelf-save') || {};
const save = Object.assign({ level: 1, stars: {}, helpers: {}, daily: {}, streak: 0, lastDaily: '', run: null }, saved);
for (const h of HELPERS) save.helpers[h] = Number.isFinite(+save.helpers[h]) ? Math.max(0, Math.floor(+save.helpers[h])) : (saved.helpers ? 0 : 1);
if (!saved.helpers) for (const h of HELPERS) save.helpers[h] = 1;
save.level = Math.max(1, Math.floor(+save.level || 1));
const persist = () => store('shelf-save', save);
persist();
const prefs = Object.assign({ sfx: true, vib: true }, load('shelf-settings'));
snd.settings.sfx = !!prefs.sfx; snd.settings.vib = !!prefs.vib;

const pad = (n) => String(n).padStart(2, '0');
const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => isoOf(new Date());
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return isoOf(d); };
const streakNow = () => (save.lastDaily === today() || save.lastDaily === yesterday() ? save.streak : 0);

// ---------------------------------------------------------------- screens
function show(which) { $('home').hidden = which !== 'home'; $('game').hidden = which !== 'game'; }
const modalOpen = () => !!document.querySelector('.modal:not([hidden])');
const openM = (id) => { $(id).hidden = false; };
const closeM = (id) => { $(id).hidden = true; };

function renderHome() {
  const n = save.level, hard = isHard(n);
  const p = $('h-play');
  p.className = 'big' + (hard ? ' hard' : '');
  p.innerHTML = hard ? `Hard level<small>Level ${n}</small>` : `Level ${n}`;
  const done = !!save.daily[today()], st = streakNow();
  $('h-daily').querySelector('small').textContent = done ? '✓ done today' + (st ? ` · 🔥 ${st}` : '') : (st ? `🔥 ${st} day streak` : 'A harder shelf');
  $('h-dbadge').hidden = done;
  $('h-help').innerHTML = HELPERS.map((h) => `<span>${ICONS[h]}<b>${save.helpers[h]}</b></span>`).join('');
}
function buildHomeShelf() {
  const types = [3, 9, 14, 20, 26, 5];
  $('homeshelf').innerHTML = types.map((t, k) => `<div>${[0, 1, 2].map((j) => `<img alt="" src="${itemURL(((t + (k % 2 && j === 1 ? 4 : 0)) % 32) + 1)}">`).join('')}</div>`).join('');
}

// ---------------------------------------------------------------- lights
function buildLights() {
  const w = innerWidth, n = Math.max(3, Math.round(w / 120)), seg = w / n, sag = 17;
  const cols = ['#ff5d73', '#ffd23a', '#5fd4a0', '#6ab8ff', '#ff9a3a', '#c98aff'];
  let d = `M0 6`, bulbs = '';
  for (let s = 0; s < n; s++) {
    const x0 = s * seg, cx = x0 + seg / 2, x1 = x0 + seg;
    d += ` Q${cx} ${6 + sag * 2} ${x1} 6`;
    for (let k = 1; k <= 3; k++) {
      const t = k / 4, x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1, y = (1 - t) * (1 - t) * 6 + 2 * (1 - t) * t * (6 + sag * 2) + t * t * 6;
      const c = cols[(s * 3 + k) % cols.length];
      bulbs += `<g class="b" style="color:${c};animation-delay:${((s * 3 + k) % 5) * 0.4}s"><rect x="${x - 3}" y="${y}" width="6" height="6" fill="#5a3a40"/><path d="M${x - 7} ${y + 6}h14q1 14 -7 16q-8 -2 -7 -16z" fill="${c}"/><path d="M${x - 4} ${y + 10}q0 6 2 8" stroke="#fff" stroke-opacity=".7" stroke-width="2" fill="none" stroke-linecap="round"/></g>`;
    }
  }
  $('lights').innerHTML = `<svg viewBox="0 0 ${w} 64" preserveAspectRatio="none"><path d="${d}" fill="none" stroke="#4a2a3a" stroke-width="2.5"/>${bulbs}</svg>`;
}

// ---------------------------------------------------------------- sparks
const cv = $('sparks'), cx2 = cv.getContext('2d');
let parts = [], sparkRun = false;
function fitCanvas() { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; }
function burst(x, y, n = 16, spread = 1) {
  const cols = ['#ffe066', '#ff9ec0', '#9be8ff', '#ffffff', '#ffb04a', '#b6f08a'];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283, v = (1.5 + Math.random() * 4.5) * spread;
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, life: 0, max: 30 + Math.random() * 26, c: cols[i % cols.length], r: 2 + Math.random() * 3.5, star: Math.random() < 0.4 });
  }
  if (!sparkRun) { sparkRun = true; requestAnimationFrame(sparkLoop); }
}
function sparkLoop() {
  const k = devicePixelRatio;
  cx2.clearRect(0, 0, cv.width, cv.height);
  parts = parts.filter((p) => p.life < p.max);
  for (const p of parts) {
    p.life++; p.x += p.vx; p.y += p.vy; p.vy += 0.16; p.vx *= 0.98;
    const a = 1 - p.life / p.max;
    cx2.globalAlpha = a; cx2.fillStyle = p.c;
    cx2.beginPath();
    if (p.star) {
      const r = p.r * 1.8;
      for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.4 : r, an = i * Math.PI / 4; cx2.lineTo((p.x + Math.cos(an) * rr) * k, (p.y + Math.sin(an) * rr) * k); }
      cx2.closePath();
    } else cx2.arc(p.x * k, p.y * k, p.r * a * k + 0.5, 0, 6.283);
    cx2.fill();
  }
  cx2.globalAlpha = 1;
  if (parts.length) requestAnimationFrame(sparkLoop); else sparkRun = false;
}

// ---------------------------------------------------------------- run state
let R = null;             // current run
const cubs = new Map();   // cubby id -> element
let geo = { cw: 100, ch: 100 };
let drag = null, busy = false, loading = false, hintTimer = 0;
let combo = 0, lastMatch = 0;
const paused = () => document.hidden || modalOpen() || loading || !$('game') || $('game').hidden;
const movesLeft = () => R.meta.limit + R.bonus - R.used;
const findCub = (id) => {
  for (let c = 0; c < 3; c++) { const col = R.st.cols[c]; for (let r = 0; r < Math.min(R.st.V, col.length); r++) if (col[r].id === id) return [c, r]; }
  return null;
};

function persistRun() {
  if (!R || R.dbg) return;
  save.run = R.over ? null : { kind: R.kind, key: R.key, meta: R.meta, start: R.start, st: R.st, used: R.used, bonus: R.bonus, time: R.time };
  persist();
}

function begin(kind, key, dbg = false) {
  show('game');
  closeAll();
  loading = true; $('loading').hidden = false; $('cubs').innerHTML = ''; cubs.clear(); $('orders').innerHTML = ''; $('waiting').innerHTML = '';
  R = null;
  setTimeout(() => {
    let r = null;
    const sr = save.run;
    if (!dbg && sr && sr.kind === kind && sr.key === key && sr.st && sr.start) {
      r = { kind, key, meta: sr.meta, start: sr.start, st: sr.st, used: sr.used || 0, bonus: sr.bonus || 0, time: sr.time };
    } else {
      let L = null;
      try { L = kind === 'daily' ? dailyFor(key) : levelFor(key); } catch (e) { console.error(e); }
      if (!L) { loading = false; $('loading').hidden = true; show('home'); renderHome(); return; }
      const start = E.clone(L);
      const meta = { mode: L.mode, limit: L.limit, par: L.par, hard: !!L.hard, daily: kind === 'daily', n: L.n };
      r = { kind, key, meta, start, st: E.clone(start), used: 0, bonus: 0, time: L.mode === 'time' ? L.limit : 0 };
    }
    r.history = []; r.over = false; r.dbg = dbg;
    R = r; window.__shelf = { R, E };
    combo = 0; lastMatch = 0;
    loading = false; $('loading').hidden = true;
    setupRun();
    persistRun();
  }, 40);
}

function setupRun() {
  $('g-title').textContent = R.kind === 'daily' ? 'Daily' : `Level ${R.key}`;
  $('g-ico').textContent = R.meta.mode === 'time' ? '⏱' : '👣';
  const o = $('orders');
  o.innerHTML = Object.keys(R.start.orders).map((t) => `<div class="chip" data-t="${t}"><img alt="" src="${itemURL(+t)}"><b></b></div>`).join('');
  layout(); sync(null, true); hud(true); helperUI();
}

function restart() {
  R.st = E.clone(R.start); R.used = 0; R.bonus = 0; R.time = R.meta.mode === 'time' ? R.meta.limit : 0; R.history = []; R.over = false;
  combo = 0; lastMatch = 0; closeAll(); setupRun(); persistRun();
}
function closeAll() { document.querySelectorAll('.modal').forEach((m) => { m.hidden = true; }); }

// ---------------------------------------------------------------- layout
function layout() {
  if (!R) return;
  const wrap = $('shelfwrap').getBoundingClientRect(), V = R.st.V;
  const maxW = Math.min(wrap.width, 460), padX = 16, padT = 30, padB = 8;
  const cwFull = (maxW - padX) / 3;
  const ch = Math.floor(Math.min((wrap.height - padT - padB - 8) / V, cwFull * 0.85));
  const cw = Math.floor(Math.min(cwFull, ch * 1.8));
  const sh = $('shelf');
  sh.style.width = cw * 3 + padX + 'px'; sh.style.height = ch * V + padT + padB + 'px';
  sh.style.setProperty('--cw', cw + 'px'); sh.style.setProperty('--ch', ch + 'px');
  const sw = (cw - 6) / 3, sH = ch - 6;
  const scale = Math.min((sw * 1.3) / 60, (sH * 0.88) / 80); // the drawings leave room at their sides, so they may touch
  sh.style.setProperty('--iw', 60 * scale + 'px'); sh.style.setProperty('--ih', 80 * scale + 'px');
  geo = { cw, ch, iw: 60 * scale, ih: 80 * scale, sw, sH };
}
const pos = (c, r) => `translate(${c * geo.cw}px, ${(R.st.V - 1 - r) * geo.ch}px)`;

// ---------------------------------------------------------------- shelf rendering
function mkCub(b) {
  const el = document.createElement('div');
  el.className = 'cub' + (b.id % 2 ? ' alt' : ''); el.dataset.id = b.id;
  el.innerHTML = '<div class="cb"><div class="deep"></div>' +
    [0, 1, 2].map((i) => `<div class="it empty" data-i="${i}"><div class="fit"><i class="pic"></i><b class="ice"></b><b class="glue"></b></div></div>`).join('') +
    '<div class="lk"><b class="ch"></b><b class="ch c2"></b><div class="pad"></div></div></div>';
  el._slots = [...el.querySelectorAll('.it')]; el._v = [0, 0, 0]; el._lock = b.lock; el._deep = -1;
  return el;
}
const picURL = (v) => (v & E.MYST ? itemURL('myst') : itemURL(E.T(v)));
function afterAnim(el, cls, ms) { setTimeout(() => el.classList.remove(cls), ms); }

function updateCub(el, b, ev) {
  el.classList.toggle('locked', b.lock > 0);
  const lk = el.querySelector('.lk');
  if (b.lock > 0) { lk.className = 'lk'; lk.querySelector('.pad').textContent = b.lock; }
  else if (el._lock > 0) { lk.classList.add('fall'); setTimeout(() => { if (!el.classList.contains('locked')) { lk.className = 'lk'; } }, 750); }
  el._lock = b.lock;
  const dn = Math.min(3, b.L.length);
  if (dn !== el._deep) { el.querySelector('.deep').innerHTML = '<u></u>'.repeat(dn); el._deep = dn; }
  for (let i = 0; i < 3; i++) {
    const s = el._slots[i], v = b.s[i], p = el._v[i];
    if (v === p) continue;
    el._v[i] = v;
    s.classList.toggle('empty', !v);
    if (!v) continue;
    const pic = s.querySelector('.pic'), ice = s.querySelector('.ice'), glue = s.querySelector('.glue');
    const same = p && E.T(p) === E.T(v);
    if (!same || (p & E.MYST) !== (v & E.MYST)) {
      pic.style.backgroundImage = `url("${picURL(v)}")`;
      if (same && (p & E.MYST) && !(v & E.MYST)) { pic.classList.add('flip'); afterAnim(pic, 'flip', 520); }
    }
    const lv = E.ICE(v);
    if (same && E.ICE(p) > lv) {
      ice.className = 'ice ' + (lv ? 'l1 crack' : 'break');
      if (lv) afterAnim(ice, 'crack', 320);
    } else ice.className = 'ice' + (lv ? ' l' + lv : '');
    if (same && (p & E.GLUE) && !(v & E.GLUE)) glue.className = 'glue gone';
    else glue.className = 'glue' + (v & E.GLUE ? ' on' : '');
    if (!p && ev && ev.forward && ev.forward.includes(b.id)) { s.classList.add('fwd'); afterAnim(s, 'fwd', 520); }
  }
}

function sync(ev, init) {
  if (!R) return;
  const st = R.st, V = st.V, seen = new Set();
  for (let c = 0; c < 3; c++) {
    for (let r = 0; r < Math.min(V, st.cols[c].length); r++) {
      const b = st.cols[c][r];
      seen.add(b.id);
      let el = cubs.get(b.id);
      if (!el) {
        el = mkCub(b); cubs.set(b.id, el); $('cubs').append(el);
        if (init) el.style.transition = 'none';
        else { el.style.transform = pos(c, V); el.getBoundingClientRect(); }
      }
      el.style.transform = pos(c, r);
      updateCub(el, b, ev);
      if (init) { el.getBoundingClientRect(); el.style.transition = ''; }
    }
  }
  for (const [id, el] of cubs) if (!seen.has(id)) { el.remove(); cubs.delete(id); }
  $('waiting').innerHTML = [0, 1, 2].map((c) => `<div>${'<u></u>'.repeat(Math.min(5, Math.max(0, st.cols[c].length - V)))}</div>`).join('');
}

function hud(first) {
  if (!R) return;
  const g = $('g-val');
  if (R.meta.mode === 'time') { const t = Math.max(0, Math.ceil(R.time)); g.textContent = `${Math.floor(t / 60)}:${pad(t % 60)}`; $('g-count').classList.toggle('low', R.time < 10 && !R.over); }
  else { g.textContent = Math.max(0, movesLeft()); $('g-count').classList.toggle('low', movesLeft() <= 3 && !R.over); }
  for (const chip of $('orders').children) {
    const t = chip.dataset.t, left = Math.ceil(Math.max(0, R.st.orders[t] || 0) / 3), b = chip.querySelector('b');
    if (b.textContent !== '×' + left) {
      const was = b.textContent;
      b.textContent = '×' + left;
      if (!first && was) { chip.classList.remove('bump'); void chip.offsetWidth; chip.classList.add('bump'); }
    }
    chip.classList.toggle('done', left === 0);
  }
}
function bumpCount() { const c = $('g-count'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
function helperUI() {
  for (const h of HELPERS) {
    const b = $('t-' + h);
    b.querySelector('i').textContent = save.helpers[h];
    b.classList.toggle('zero', save.helpers[h] <= 0);
  }
  $('t-extra').querySelector('span').textContent = R && R.meta.mode === 'moves' ? '+5' : '⏳';
}
function shakeBtn(h) { const b = $('t-' + h); b.classList.remove('shk'); void b.offsetWidth; b.classList.add('shk'); snd.play.nope(); }

// ---------------------------------------------------------------- fx
function slotRect(id, i) {
  const el = cubs.get(id);
  return el ? el._slots[i].getBoundingClientRect() : null;
}
function fx(ev) {
  for (const m of ev.matches) {
    const el = cubs.get(m.id);
    if (!el) continue;
    let sx = 0, sy = 0, n = 0;
    m.slots.forEach((i, k) => {
      const r = slotRect(m.id, i);
      if (!r) return;
      const g = document.createElement('div');
      g.className = 'ghost';
      const w = geo.iw, h = geo.ih;
      g.style.cssText = `left:${r.left + (r.width - w) / 2}px;top:${r.bottom - h - r.height * 0.07}px;width:${w}px;height:${h}px;background-image:url("${itemURL(m.t)}");animation-delay:${k * 0.05}s`;
      $('fx').append(g); setTimeout(() => g.remove(), 800);
      sx += r.left + r.width / 2; sy += r.bottom - h / 2; n++;
    });
    if (n) { burst(sx / n, sy / n, 22); setTimeout(() => burst(sx / n, sy / n, 10, 0.7), 120); }
    el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 520);
  }
  for (const id of ev.unlocked) { const r = cubs.get(id)?.getBoundingClientRect(); if (r) burst(r.left + r.width / 2, r.top + r.height / 2, 12); }
  for (const id of ev.thawed) { const r = cubs.get(id)?.getBoundingClientRect(); if (r) burst(r.left + r.width / 2, r.top + r.height / 2, 8, 0.6); }
}

function sounds(ev, landed) {
  const P = snd.play;
  if (ev.matches.length) P.match(combo);
  else if (landed) P.drop();
  if (ev.unlocked.length) P.unlock();
  if (ev.thawed.length) P.ice();
  if (ev.forward.length) setTimeout(P.forward, 150);
  if (ev.fell.length) setTimeout(P.fall, 300);
}

// ---------------------------------------------------------------- moves
function afterEvent(ev, landed) {
  const now = performance.now();
  if (ev.matches.length) {
    combo = now - lastMatch < COMBO_MS && combo > 0 ? combo + 1 : 1;
    lastMatch = now;
    if (combo >= 3) {
      if (R.meta.mode === 'time') { R.time += 3; bumpCount(); }
      else if (combo % 3 === 0) { R.bonus++; bumpCount(); }
      setTimeout(() => snd.play.combo(combo), 250);
    }
    comboUI(true);
  }
  fx(ev); sounds(ev, landed); sync(ev); hud(); persistRun();
  clearHint();
  setTimeout(checkEnd, ev.matches.length ? 500 : 80);
}
function comboUI(bump) {
  const c = $('combo');
  c.classList.toggle('on', combo >= 2);
  c.querySelector('b').textContent = combo >= 2 ? '×' + combo : '';
  if (bump && combo >= 2) { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
}

function doMove(c, r, i, tc, tr, slot) {
  R.history.push({ st: E.clone(R.st), used: R.used });
  if (R.history.length > 40) R.history.shift();
  const ev = E.apply(R.st, c, r, i, tc, tr, slot);
  R.used++;
  afterEvent(ev, true);
}

function checkEnd() {
  if (!R || R.over || drag) return;
  if (E.done(R.st)) return win();
  if (R.meta.mode === 'moves' && movesLeft() <= 0) return lose('moves');
  if (E.moves(R.st).length === 0) return jam();
}

// ---------------------------------------------------------------- end screens
function stars() {
  const frac = R.meta.mode === 'time' ? R.time / R.meta.limit : movesLeft() / R.meta.limit;
  return frac >= 0.4 ? 3 : frac >= 0.2 ? 2 : 1;
}
function win() {
  R.over = true; clearHint();
  const s = stars(), lines = [];
  let nextLabel = 'Next level';
  if (R.kind === 'level') {
    const n = +R.key;
    const first = n === save.level;
    save.stars[n] = Math.max(save.stars[n] || 0, s);
    if (first) {
      save.level = n + 1;
      if (n % 10 === 0) { for (const h of HELPERS) save.helpers[h]++; lines.push('<div class="gift">🎁 Level gift: +1 of each helper</div>'); }
    }
  } else {
    const first = !save.daily[R.key];
    save.daily[R.key] = Math.max(save.daily[R.key] || 0, s);
    if (first) {
      save.streak = save.lastDaily === yesterday() ? save.streak + 1 : 1;
      save.lastDaily = R.key;
      const h = HELPERS[Math.floor(Math.random() * HELPERS.length)];
      save.helpers[h]++;
      lines.push(`<div class="gift">🎁 Daily gift: +1 ${ICONS[h]}</div>`);
    }
    lines.push(`<div>🔥 Streak: ${streakNow()} ${streakNow() === 1 ? 'day' : 'days'}</div>`);
    nextLabel = `Level ${save.level}`;
  }
  if (!R.dbg) { save.run = null; persist(); }
  helperUI();
  $('win-next').textContent = nextLabel;
  $('win-lines').innerHTML = lines.join('');
  [...$('win-stars').children].forEach((x, i) => x.classList.toggle('on', i < s));
  snd.play.win();
  for (let k = 0; k < 6; k++) setTimeout(() => burst(innerWidth * (0.15 + Math.random() * 0.7), innerHeight * 0.3, 24, 1.4), k * 120);
  setTimeout(() => openM('m-win'), 700);
}
function lose(why) {
  if (R.over) return;
  R.over = true; cancelDrag(); clearHint();
  $('lose-title').textContent = why === 'time' ? 'Out of time' : 'Out of moves';
  $('lose-text').textContent = 'Some orders are still open.';
  snd.play.lose();
  if (!R.dbg) { save.run = null; persist(); }
  setTimeout(() => openM('m-lose'), 300);
}
function jam() {
  if (R.over) return;
  snd.play.lose();
  $('jam-undo').querySelector('b').textContent = `(${save.helpers.undo})`;
  $('jam-shuffle').querySelector('b').textContent = `(${save.helpers.shuffle})`;
  $('jam-undo').hidden = save.helpers.undo <= 0 || !R.history.length;
  $('jam-shuffle').hidden = save.helpers.shuffle <= 0 || typeof E.reshuffle !== 'function';
  openM('m-jam');
}

// ---------------------------------------------------------------- helpers
function clearHint() {
  clearTimeout(hintTimer);
  document.querySelectorAll('.hint,.hintsrc').forEach((e) => e.classList.remove('hint', 'hintsrc'));
}
function spend(h) { save.helpers[h]--; persist(); helperUI(); }
const canAct = () => R && !R.over && !drag && !busy && !modalOpen() && !loading;

function useUndo(fromJam) {
  if ((!canAct() && !fromJam) || R.over) return;
  if (save.helpers.undo <= 0 || !R.history.length) return shakeBtn('undo');
  const h = R.history.pop();
  R.st = h.st; R.used = h.used; combo = 0; comboUI();
  spend('undo'); clearHint(); snd.play.undo();
  sync(null, true); hud(); persistRun();
}
function localHint(st) {
  let best = null, bs = -1e9;
  for (const m of E.moves(st)) {
    const [c, r, i, tc, tr] = m, a = st.cols[c][r], b = st.cols[tc][tr], it = a.s[i], t = E.T(it);
    let s = Math.random();
    if (b.lock) s += 500;
    else {
      const same = b.s.filter((x) => x && E.T(x) === t && !(x & E.MYST)).length, other = b.s.filter((x) => x).length - same;
      s += same === 2 ? 300 : same === 1 && other === 0 ? 60 : -other * 10;
      if (a.s.filter((x) => x && E.T(x) === t).length > 1) s -= 80;
      if (!a.s.some((x, k) => k !== i && x)) s += 20;
    }
    if (s > bs) { bs = s; best = m; }
  }
  return best;
}
function useHint() {
  if (!canAct()) return;
  if (save.helpers.hint <= 0) return shakeBtn('hint');
  let m = null;
  try { m = typeof E.hint === 'function' ? E.hint(R.st, R.used * 131 + 7) : localHint(R.st); } catch (e) { console.error(e); }
  if (!m) return shakeBtn('hint');
  const [c, r, i, tc, tr] = m, a = R.st.cols[c][r], b = R.st.cols[tc][tr];
  spend('hint'); clearHint(); snd.play.hint();
  cubs.get(a.id)?._slots[i].classList.add('hintsrc');
  cubs.get(b.id)?.classList.add('hint');
  hintTimer = setTimeout(clearHint, 2000);
}
function useShuffle(fromJam) {
  if (!fromJam && !canAct()) return;
  if (save.helpers.shuffle <= 0 || typeof E.reshuffle !== 'function') return shakeBtn('shuffle');
  let ns = null;
  try { ns = E.reshuffle(R.st, R.used * 977 + R.st.matches + 3); } catch (e) { console.error(e); }
  if (!ns) return shakeBtn('shuffle');
  R.history.push({ st: E.clone(R.st), used: R.used });
  R.st = ns; combo = 0; comboUI();
  spend('shuffle'); clearHint(); snd.play.shuffle();
  const cb = $('cubs'); cb.classList.remove('wob'); void cb.offsetWidth; cb.classList.add('wob');
  sync(null, true); hud(); persistRun();
}
// The magnet sells one set of three for the player. It takes items that could be reached (fronts, and the next row
// behind them), prefers a type from the open orders, and then does what a match does: orders, locks, thaw, rows forward.
function magnetPlan(st) {
  const ok = (v) => v > 0 && !E.ICE(v) && !(v & E.MYST) && E.T(v) !== E.KEY;
  const by = {};
  for (let c = 0; c < 3; c++) for (let r = 0; r < Math.min(st.V, st.cols[c].length); r++) {
    const b = st.cols[c][r];
    if (b.lock) continue;
    for (let i = 0; i < 3; i++) if (ok(b.s[i])) (by[E.T(b.s[i])] ||= []).push({ c, r, b, arr: b.s, i, front: 1 });
    if (b.L.length) for (let i = 0; i < 3; i++) if (ok(b.L[0][i])) (by[E.T(b.L[0][i])] ||= []).push({ c, r, b, arr: b.L[0], i, front: 0 });
  }
  let bt = 0, bw = -1;
  for (const t of Object.keys(by)) {
    const n = by[t].length;
    if (n < 3) continue;
    const w = (st.orders[t] > 0 ? 1000 : 0) + n;
    if (w > bw) { bw = w; bt = +t; }
  }
  if (!bt) return null;
  return { t: bt, picks: by[bt].sort((x, y) => y.front - x.front).slice(0, 3) };
}
function useMagnet() {
  if (!canAct()) return;
  if (save.helpers.magnet <= 0) return shakeBtn('magnet');
  const plan = magnetPlan(R.st);
  if (!plan) return shakeBtn('magnet');
  const st = R.st, V = st.V;
  R.history.push({ st: E.clone(st), used: R.used });
  const ev = { key: false, matches: [], unlocked: [], thawed: [], revealed: [], fell: [], forward: [] };
  const touched = new Map();
  for (const p of plan.picks) {
    p.arr[p.i] = 0;
    if (!touched.has(p.b.id)) touched.set(p.b.id, { c: p.c, r: p.r, b: p.b, slots: [] });
    if (p.front) touched.get(p.b.id).slots.push(p.i);
  }
  for (const { c, r, b, slots } of touched.values()) {
    b.L = b.L.filter((l) => l.some((x) => x));
    ev.matches.push({ c, id: b.id, t: plan.t, slots: slots.length ? slots : [0, 1, 2].filter((i) => false) });
    b.cleared = true;
  }
  st.matches++;
  if (st.orders[plan.t] > 0) st.orders[plan.t] = Math.max(0, st.orders[plan.t] - 3);
  for (let c = 0; c < 3; c++) for (let r = 0; r < Math.min(V, st.cols[c].length); r++) {
    const b = st.cols[c][r];
    if (b.lock > 0) { b.lock--; if (!b.lock) ev.unlocked.push(b.id); }
  }
  const near = new Set();
  for (const { c, r } of touched.values()) for (const [dc, dr] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const cc = c + dc, rr = r + dr;
    if (cc >= 0 && cc < 3 && rr >= 0 && rr < Math.min(V, st.cols[cc].length)) near.add(st.cols[cc][rr]);
  }
  for (const b of near) {
    if (b.lock) continue;
    for (let i = 0; i < 3; i++) {
      const x = b.s[i];
      if (!x) continue;
      let y = x;
      if (E.ICE(y)) y -= 64;
      y &= ~E.GLUE & ~E.MYST;
      if (y !== x) { b.s[i] = y; (E.ICE(x) && !E.ICE(y) ? ev.thawed : ev.revealed).push(b.id); }
    }
  }
  for (let c = 0; c < 3; c++) {
    const col = st.cols[c];
    for (let r = 0; r < Math.min(V, col.length); r++) {
      const b = col[r];
      if (b.lock || b.s.some((x) => x)) { b.cleared = false; continue; }
      if (b.L.length) { b.s = b.L.shift(); ev.forward.push(b.id); b.cleared = false; continue; }
      if (b.cleared && col.length > V) { col.splice(r, 1); ev.fell.push(c); r--; continue; }
      b.cleared = false;
    }
  }
  spend('magnet'); snd.play.magnet();
  afterEvent(ev, false);
}
function useExtra() {
  if (!canAct()) return;
  if (save.helpers.extra <= 0) return shakeBtn('extra');
  if (R.meta.mode === 'time') R.time += 30; else R.bonus += 5;
  spend('extra'); snd.play.extra(); bumpCount(); hud(); persistRun();
}

// ---------------------------------------------------------------- drag
const cubsEl = $('cubs');
function hitCub(x, y) {
  const rc = cubsEl.getBoundingClientRect();
  const c = Math.floor((x - rc.left) / geo.cw), rowFromTop = Math.floor((y - rc.top) / geo.ch), r = R.st.V - 1 - rowFromTop;
  if (c < 0 || c > 2 || r < 0 || r >= Math.min(R.st.V, R.st.cols[c].length)) return null;
  return { c, r, b: R.st.cols[c][r], left: rc.left + c * geo.cw };
}
function clearHover() { document.querySelectorAll('.cub.hov').forEach((e) => e.classList.remove('hov')); }
function moveFloat(x, y, scale = 1.18) {
  const f = drag.float;
  f.style.transform = `translate(${x - geo.iw / 2}px, ${y - geo.ih * 0.9}px) scale(${scale})`;
}
$('shelf').addEventListener('pointerdown', (e) => {
  snd.unlock();
  if (drag || busy || !R || R.over || paused()) return;
  const it = e.target.closest('.it');
  if (!it) return;
  const id = +it.closest('.cub').dataset.id, pos2 = findCub(id);
  if (!pos2) return;
  const [c, r] = pos2, b = R.st.cols[c][r], i = +it.dataset.i, v = b.s[i];
  if (!v) return;
  if (b.lock || !E.movable(v)) { it.classList.remove('shake'); void it.offsetWidth; it.classList.add('shake'); snd.play.nope(); return; }
  e.preventDefault();
  const f = document.createElement('div');
  f.className = 'float';
  f.style.width = geo.iw + 'px'; f.style.height = geo.ih + 'px';
  f.style.backgroundImage = `url("${picURL(v)}")`;
  $('fx').append(f);
  drag = { c, r, i, v, id, it, float: f, pid: e.pointerId, x: e.clientX, y: e.clientY };
  it.classList.add('lifted');
  try { $('shelf').setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  moveFloat(e.clientX, e.clientY);
  snd.play.pick();
});
function hover(x, y) {
  clearHover();
  const h = hitCub(x, y - geo.ih * 0.4);
  if (h && E.legal(R.st, drag.c, drag.r, drag.i, h.c, h.r)) cubs.get(h.b.id)?.classList.add('hov');
}
$('shelf').addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.pid) return;
  drag.x = e.clientX; drag.y = e.clientY;
  moveFloat(e.clientX, e.clientY);
  hover(e.clientX, e.clientY);
});
const upDrag = (e) => { if (drag && e.pointerId === drag.pid) endDrag(e.type === 'pointercancel'); };
$('shelf').addEventListener('pointerup', upDrag);
$('shelf').addEventListener('pointercancel', upDrag);
function cancelDrag() {
  if (!drag) return;
  drag.float.remove(); drag.it.classList.remove('lifted'); drag = null; clearHover();
}
function flyTo(f, cxp, cyp, scale, ms, then) {
  f.style.transition = `transform ${ms}ms ease-out`;
  f.style.transform = `translate(${cxp - geo.iw / 2}px, ${cyp - geo.ih / 2}px) scale(${scale})`;
  setTimeout(then, ms + 10);
}
function endDrag(cancelled) {
  const d = drag;
  clearHover();
  const h = cancelled ? null : hitCub(d.x, d.y - geo.ih * 0.4);
  const ok = h && E.legal(R.st, d.c, d.r, d.i, h.c, h.r);
  drag = null; busy = true;
  const finish = () => { d.float.remove(); d.it.classList.remove('lifted'); busy = false; };
  if (ok) {
    const b = h.b, el = cubs.get(b.id), rc = el.getBoundingClientRect();
    let slot = Math.max(0, Math.min(2, Math.floor((d.x - h.left) / (geo.cw / 3))));
    let tx, ty, scale = 1;
    if (b.lock) { tx = rc.left + rc.width / 2; ty = rc.top + rc.height / 2; scale = 0.8; }
    else {
      const j = b.s[slot] === 0 ? slot : b.s.indexOf(0), sr = el._slots[j].getBoundingClientRect();
      tx = sr.left + sr.width / 2; ty = sr.bottom - sr.height * 0.07 - geo.ih / 2;
    }
    flyTo(d.float, tx, ty, scale, 140, () => {
      finish();
      if (!R || R.over) return;
      doMove(d.c, d.r, d.i, h.c, h.r, slot);
    });
  } else {
    if (h && !cancelled && !(h.c === d.c && h.r === d.r)) snd.play.nope();
    const sr = d.it.getBoundingClientRect();
    flyTo(d.float, sr.left + sr.width / 2, sr.bottom - sr.height * 0.07 - geo.ih / 2, 1, 170, finish);
  }
}

// ---------------------------------------------------------------- timer
let lastT = performance.now(), lastSave = 0;
setInterval(() => {
  const now = performance.now(), dt = Math.min(0.5, (now - lastT) / 1000);
  lastT = now;
  if (!R || R.over || paused()) return;
  if (combo > 0) {
    const f = 1 - (now - lastMatch) / COMBO_MS;
    if (f <= 0) { combo = 0; comboUI(); } else $('combo').querySelector('s').style.transform = `scaleX(${f})`;
  }
  if (R.meta.mode === 'time') {
    R.time -= dt; hud();
    if (R.time <= 0) { R.time = 0; hud(); lose('time'); return; }
  }
  if (now - lastSave > 2000) { lastSave = now; persistRun(); }
}, 200);
document.addEventListener('visibilitychange', () => { if (document.hidden) persistRun(); lastT = performance.now(); });

// ---------------------------------------------------------------- wiring
for (const h of HELPERS) $('t-' + h).addEventListener('click', () => ({ undo: () => useUndo(), hint: useHint, shuffle: () => useShuffle(), magnet: useMagnet, extra: useExtra })[h]());
document.querySelectorAll('.b-set').forEach((b) => b.addEventListener('click', () => { snd.unlock(); snd.play.tap(); openM('m-set'); }));
$('s-sfx').checked = snd.settings.sfx; $('s-vib').checked = snd.settings.vib;
$('s-sfx').onchange = (e) => { snd.settings.sfx = prefs.sfx = e.target.checked; store('shelf-settings', prefs); snd.play.tap(); };
$('s-vib').onchange = (e) => { snd.settings.vib = prefs.vib = e.target.checked; store('shelf-settings', prefs); snd.buzz(30); };
$('s-close').onclick = () => closeM('m-set');
$('s-help').onclick = () => openM('m-help');
$('help-ok').onclick = () => closeM('m-help');

$('h-play').onclick = () => { snd.unlock(); snd.play.tap(); begin('level', save.level); };
$('h-daily').onclick = () => { snd.unlock(); snd.play.tap(); begin('daily', today()); };
const toHome = () => { persistRun(); cancelDrag(); closeAll(); R && (R.over = R.over || false); show('home'); renderHome(); };
$('g-back').onclick = toHome;
for (const id of ['win-home', 'lose-home', 'jam-home']) $(id).onclick = toHome;
$('win-next').onclick = () => { closeM('m-win'); begin('level', save.level); };
$('lose-retry').onclick = () => { restart(); };
$('jam-retry').onclick = () => { restart(); };
$('jam-undo').onclick = () => { closeM('m-jam'); useUndo(true); };
$('jam-shuffle').onclick = () => { closeM('m-jam'); useShuffle(true); };

addEventListener('resize', () => { buildLights(); fitCanvas(); if (R && !$('game').hidden) { layout(); sync(null, true); } });
buildLights(); fitCanvas(); buildHomeShelf(); renderHome();

// Debug: index.html#play=12 opens that level directly (nothing is saved); #daily opens today's daily.
const m = /play=(\d+)/.exec(location.hash);
if (m) begin('level', +m[1], true);
else if (/daily/.test(location.hash)) begin('daily', today(), true);
