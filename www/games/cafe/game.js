import { THREE, B, MAT, blobMat, makeLabel, rr, nameTag, disposeTree } from './gfx.js';
import { PRODUCTS, makeProduct, drawIcon, drawFlag, makePerson, animPerson, sitPerson, makeCat } from './models.js';
import { skyTexture, buildGround, buildEsplanade, buildFloor2, makeCloud, makeBike, makeStation, makeCounter, makeCashTile, makeBill, makeTable, makeBin } from './world.js';
import { Sound } from './audio.js';
import { ADS, openAd } from './ads.js';

const $ = (id) => document.getElementById(id);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// ---------- constantes ----------
const N1 = 8; // produtos de balcão do rés-do-chão (índices 0-7)
const F2K = [9, 10, 11, 12]; // produtos do 1.º andar
const F2X = [-3.5, 3.5, -10.5, 10.5];
const STOVES = [{ k: 8, x: 3.5 }, { k: 13, x: -3.5 }];
const FL = [{ oz: 0 }, { oz: -90 }];
const MOD = 7;
const ORDER = [3, 4, 2, 5, 1, 6, 0, 7];
const modX = (k) => (ORDER[k] - 3.5) * MOD;
const STATION_Z = -7, COUNTER_Z = 5, LANE = 11.5;
const SZ_OFF = [0, -0.5, -0.2, -0.6, -0.1, -0.5, -0.3, -0.6, 0, -0.2, -0.5, 0, -0.4];
const S_ROT = [0.04, -0.05, 0.06, -0.03, -0.06, 0.05, -0.04, 0.03, 0, 0.04, -0.05, 0.05, -0.03];
const STOCK_CAP = 40;
const HELPER_COST = [80, 500, 2500, 10000, 40000];
const HELPER2_COST = [120000, 400000, 1200000];
const TABLE_POS = [[0, 18.2], [9.5, 18], [-9.5, 18], [4.5, 20.8], [-4.5, 20.8], [14, 18.4], [-14, 18.4]];
const TABLE_COST = [0, 0, 15000, 40000, 100000, 250000, 600000];
const WAITER_COST = [50000, 200000];
const WAITER_NAMES = ['Sr. Grão', 'D. Aveia'];
const COOK_NAMES = ['Chef Tofu', 'Chef Seitan'];
const SALA_COST = 20000, COOK_COST = 30000, STOVE2_COST = 120000, FLOOR2_COST = 150000;
const KZ = 13.6, TIP = 2.5;
const BINS = [{ x: 7, z: -4.3, floor: 0 }, { x: -8.8, z: 13.6, floor: 0, sala: true }, { x: 7, z: FL[1].oz - 4.3, floor: 1 }];
const UPS = [
  { id: 'speed', name: 'Velocidade', desc: 'Andar mais rápido', base: 40, max: 12 },
  { id: 'cap', name: 'Capacidade', desc: 'Carregar mais itens', base: 30, max: 27 },
  { id: 'grow', name: 'Produção', desc: 'Fornos e máquinas mais rápidos', base: 60, max: 16 },
  { id: 'price', name: 'Preços', desc: 'Os clientes pagam mais', base: 80, max: Infinity },
  { id: 'pedro', name: 'Pedro', desc: 'Anda mais rápido e carrega mais', base: 150, max: 15, needsHelper: true },
];
const upShown = (u) => !u.needsHelper || S.helpers > 0;

let CFG = {
  cafeName: 'Café da Joana',
  tagline: 'Pastelaria 100% vegana',
  player: { name: 'Joana', hair: '#5b3a21', dress: '#e85d75', skin: '#f2c9a0', style: 'pony' },
  helper: { name: 'Pedro', hair: '#2b2118', shirt: '#3b7dd8', skin: '#e8b98c', style: 'short' },
  cats: [
    { name: 'Meme', color: '#8d8d93', patch: '#ffffff', stripes: true },
    { name: 'Mimi', color: '#e59a4a', patch: '#fff3e0', stripes: true },
  ],
};

// ---------- estado gravado ----------
const S = {
  v: 3, cash: 0, total: 0, built: 1, cashiers: new Array(N1).fill(false), helpers: 0, up: { speed: 0, cap: 0, grow: 0, price: 0, pedro: 0 },
  muted: false, tut: 0, padPaid: {}, pets: 0, sala: false, tables: 2, cook: false, waiters: 0, stove2: false,
  floor2: false, built2: 0, cashiers2: [false, false, false, false], helpers2: 0, goal: null, goalsDone: 0, adNext: 0, adBump: 2, adVotes: {}, stats: null, gfx: 'high', gfxUser: false, w: null,
};
// ---------- estatísticas internas (desligadas na app: não há servidor) ----------
const newStats = () => ({ since: Date.now(), sessions: 0, play: 0, idle: 0, dist: 0, area: { cafe: 0, esplanada: 0, andar: 0 }, days: {}, sold: {}, earned: { balcoes: 0, mesas: 0, objetivos: 0 }, served: 0, cheio: 0, lixo: 0, ads: { opened: 0, skipped: 0, done: 0 }, fps: 0, events: [] });
const tracking = false;
const statsOff = newStats();
function ST() {
  if (!tracking) return statsOff; // desligado: o que se escrever aqui é deitado fora
  return S.stats || (S.stats = newStats());
}
function logEvent(e) {
  const st = ST();
  st.events.push({ t: Math.round(st.play), d: Date.now(), e });
  if (st.events.length > 400) st.events.splice(0, st.events.length - 400);
}
function statSale(k, qty, amount, where) {
  const st = ST(), n = PRODUCTS[k].name;
  st.sold[n] = (st.sold[n] || 0) + qty;
  st.earned[where] += amount;
}
function statTick(dt, raw) {
  if (!tracking) return;
  const st = ST();
  st.play += dt;
  const day = new Date().toISOString().slice(0, 10);
  st.days[day] = (st.days[day] || 0) + dt;
  st.area[player.floor === 1 ? 'andar' : player.z > 5 ? 'esplanada' : 'cafe'] += dt;
  if (player.still > 5) st.idle += dt;
  if (player.moving) st.dist += speedOf() * dt;
  if (raw > 0 && raw < 0.5) st.fps = st.fps ? st.fps * 0.995 + (1 / raw) * 0.005 : 1 / raw;
}
const sound = new Sound();
let running = false;

const speedOf = () => 5.2 * (1 + 0.07 * S.up.speed) * (player.boost > 0 ? 1.35 : 1);
const capOf = () => 6 + 2 * S.up.cap;
let adBoost = 0; // segundos de prémio de anúncio: dinheiro e velocidade a dobrar
const growMult = () => Math.pow(0.92, S.up.grow);
const saleMult = () => priceMult() * (adBoost > 0 ? 2 : 1);
const priceMult = () => 1 + 0.15 * S.up.price;
const pileCap = () => 9 + S.up.grow;
const upCost = (u) => Math.round(u.base * Math.pow(1.55, S.up[u.id]));
function fmt(n) {
  n = Math.floor(n);
  if (n < 1000) return String(n);
  const units = ['K', 'M', 'B', 'T', 'Q'];
  let i = -1;
  while (n >= 1000 && i < units.length - 1) {
    n /= 1000;
    i++;
  }
  return (n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2)).replace('.', ',') + units[i];
}
const hasCashier = (k) => (k < N1 ? S.cashiers[k] : S.cashiers2[k - 9]);

// ---------- cena, luz e qualidade gráfica ----------
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = skyTexture();
const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 260);
const CAM_OFF = new THREE.Vector3(15, 22, 15);
const camTarget = new THREE.Vector3(0, 1, 0);
scene.add(new THREE.HemisphereLight(0xffffff, 0xd6e6b8, 1.7));
const sun = new THREE.DirectionalLight(0xfff0d0, 1.9);
sun.shadow.mapSize.set(1536, 1536);
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 80 });
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.05;
scene.add(sun, sun.target);
const FORCE_GFX = new URLSearchParams(location.search).get('gfx');
function applyGfx() {
  const high = (FORCE_GFX || S.gfx) !== 'low';
  renderer.shadowMap.enabled = high;
  sun.castShadow = high;
  blobMat.visible = !high;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, high ? 2 : 1.5));
  scene.traverse((o) => {
    if (o.material && !o.isSprite) o.material.needsUpdate = true;
  });
  resize();
}
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  const aspect = w / h;
  const viewH = aspect < 1 ? 22 : 14;
  camera.top = viewH / 2;
  camera.bottom = -viewH / 2;
  camera.left = (-viewH * aspect) / 2;
  camera.right = (viewH * aspect) / 2;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

// ---------- efeitos visuais ----------
const tmpV = new THREE.Vector3();
const flies = [];
function fly(mesh, from, toFn, dur = 0.28) {
  if (flies.length > 80) return;
  mesh.position.copy(from);
  scene.add(mesh);
  flies.push({ m: mesh, from: from.clone(), to: toFn, t: 0, dur });
}
function updateFlies(dt) {
  for (let i = flies.length - 1; i >= 0; i--) {
    const f = flies[i];
    f.t += dt;
    const p = Math.min(1, f.t / f.dur);
    f.m.position.lerpVectors(f.from, f.to(), p);
    f.m.position.y += Math.sin(p * Math.PI) * 1.3;
    if (p >= 1) {
      scene.remove(f.m);
      flies.splice(i, 1);
    }
  }
}
const floats = [];
// falas: só uma de cada vez e com pausas, para o ecrã não ficar cheio
let nextSay = 0;
function say(text, x, y, z, color) {
  const now = performance.now();
  if (now < nextSay) return false;
  if (Math.hypot(x - player.x, z - player.z) > 16) return false;
  nextSay = now + 10000;
  floatText(text, x, y, z, color, text.length > 30 ? 4.2 : 3);
  return true;
}
function floatText(text, x, y, z, color = '#ffffff', dur = 1.4) {
  if (floats.length > 14) return;
  const speech = dur > 1.5;
  let lines = [text];
  if (speech && text.length > 30) {
    let cut = text.indexOf('? ') + 1;
    if (cut <= 0 || cut > text.length - 4) cut = text.lastIndexOf(' ', Math.floor(text.length / 2) + 4);
    if (cut > 0) lines = [text.slice(0, cut).trim(), text.slice(cut).trim()];
  }
  const W = speech ? 640 : 320, H = 72 + (lines.length - 1) * 50;
  const L = makeLabel(W, H, (speech ? 0.62 : 0.75) * (H / 72));
  const c = L.ctx;
  c.font = `bold ${speech ? 40 : 46}px system-ui, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineWidth = 8;
  c.strokeStyle = 'rgba(40,30,30,.85)';
  lines.forEach((ln, n) => {
    c.fillStyle = color;
    c.strokeText(ln, W / 2, 38 + n * 50, W - 20);
    c.fillText(ln, W / 2, 38 + n * 50, W - 20);
  });
  L.tex.needsUpdate = true;
  L.sprite.position.set(x, y, z);
  scene.add(L.sprite);
  floats.push({ L, t: 0, dur, v: speech ? 0.45 : 1.3 });
}
function updateFloats(dt) {
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    f.t += dt;
    f.L.sprite.position.y += dt * f.v;
    f.L.sprite.material.opacity = Math.max(0, Math.min(1, (f.dur - f.t) / 0.5));
    if (f.t > f.dur) {
      scene.remove(f.L.sprite);
      f.L.tex.dispose();
      f.L.sprite.material.dispose();
      floats.splice(i, 1);
    }
  }
}
const pops = [];
function pop(g) {
  g.scale.setScalar(0.01);
  pops.push({ g, t: 0 });
}
function updatePops(dt) {
  for (let i = pops.length - 1; i >= 0; i--) {
    const p = pops[i];
    p.t += dt * 2.2;
    const x = Math.min(1, p.t);
    const c1 = 1.70158, c3 = c1 + 1;
    p.g.scale.setScalar(1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2));
    if (x >= 1) pops.splice(i, 1);
  }
}
// faíscas (desbloqueios, objetivos, festinhas)
const sparkGeo = {};
const sparks = [];
function burst(x, y, z, color = '#ffd54f', n = 12) {
  const geo = sparkGeo[color] || (sparkGeo[color] = new B().sph(color, 0.16, 0.16, 0.16, 0, 0, 0, true).geometry());
  for (let i = 0; i < n && sparks.length < 60; i++) {
    const m = new THREE.Mesh(geo, MAT);
    m.position.set(x, y, z);
    scene.add(m);
    const a = Math.random() * 6.28, sp = 1.5 + Math.random() * 2.5;
    sparks.push({ m, vx: Math.cos(a) * sp, vy: 3 + Math.random() * 3, vz: Math.sin(a) * sp, t: 0 });
  }
}
function updateSparks(dt) {
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.t += dt;
    s.vy -= 12 * dt;
    s.m.position.x += s.vx * dt;
    s.m.position.y += s.vy * dt;
    s.m.position.z += s.vz * dt;
    s.m.scale.setScalar(Math.max(0.01, 1 - s.t / 0.9));
    if (s.t > 0.9) {
      scene.remove(s.m);
      sparks.splice(i, 1);
    }
  }
}
function setCount(group, n, make, posFn) {
  while (group.children.length < n) {
    const m = make();
    posFn(m, group.children.length);
    group.add(m);
  }
  while (group.children.length > n) group.remove(group.children[group.children.length - 1]);
}
let toastT = 0;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  toastT = 3;
}
function fade() {
  const f = $('fade');
  f.style.transition = 'none';
  f.style.opacity = '1';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    f.style.transition = 'opacity .45s';
    f.style.opacity = '0';
  }));
}

// ---------- módulos: banca de produção + balcão ----------
const mods = []; // módulos construídos
const modByK = {};
const modPos = (k) => (k < N1 ? { floor: 0, x: modX(k) } : { floor: 1, x: F2X[k - 9] });
function buildModule(k, animate) {
  const pos = modPos(k), oz = FL[pos.floor].oz;
  const st = makeStation(k);
  const sz = oz + STATION_Z + SZ_OFF[k];
  st.group.position.set(pos.x, 0, sz);
  st.group.rotation.y = S_ROT[k];
  scene.add(st.group);
  const ct = makeCounter(k);
  ct.group.position.set(pos.x, 0, oz + COUNTER_Z);
  scene.add(ct.group);
  const tile = makeCashTile();
  tile.position.set(pos.x + 2.9, 0, oz + 3.3);
  scene.add(tile);
  const cashGroup = new THREE.Group();
  cashGroup.position.set(pos.x + 2.9, 0.08, oz + 3.3);
  scene.add(cashGroup);
  const m = { k, floor: pos.floor, x: pos.x, oz, sz, pile: 0, timer: 0, stock: 0, queue: [], cashValue: 0, bills: 0, spawnT: 1 + Math.random() * 2, serveT: 0, stGroup: st.group, ctGroup: ct.group, pileGroup: st.pileGroup, stockGroup: ct.stockGroup, cashGroup, cashierMesh: null };
  mods.push(m);
  modByK[k] = m;
  if (hasCashier(k)) addCashier(m, false);
  if (animate) {
    pop(st.group);
    pop(ct.group);
    burst(pos.x, 1.5, oz - 1);
  }
  return m;
}
const SKINS = ['#f2c9a0', '#d9a273', '#8d5a3b', '#f7d7b5', '#c68642'];
const SHIRTS = ['#ef5350', '#ab47bc', '#5c6bc0', '#29b6f6', '#26a69a', '#9ccc65', '#ffca28', '#ff7043', '#8d6e63', '#ec407a'];
const HAIRS = ['#3e2723', '#212121', '#bf8040', '#6d4c41', '#d7b98e', '#9e9e9e'];
const PANTS = ['#3d4a66', '#4e342e', '#455a64', '#263238'];
function addCashier(m, animate) {
  const i = m.k % 4;
  const g = makePerson({ shirt: '#ffffff', pants: '#37474f', hair: HAIRS[i], skin: SKINS[i], apron: PRODUCTS[m.k].color, style: ['bun', 'short', 'bob', 'pony'][i] });
  g.position.set(m.x + 1.6, 0, m.oz + COUNTER_Z - 1.1);
  scene.add(g);
  m.cashierMesh = g;
  if (animate) pop(g);
}
const pileMake = (k) => () => makeProduct(k);
function syncPile(src) {
  const h = PRODUCTS[src.k].h;
  setCount(src.pileGroup, src.pile, pileMake(src.k), (m, i) => m.position.set(-0.8 + (i % 3) * 0.8, Math.floor(i / 3) * h, 0));
}
function syncStock(m) {
  const h = PRODUCTS[m.k].h;
  setCount(m.stockGroup, m.stock, pileMake(m.k), (o, i) => o.position.set(-1.6 + (i % 4) * 0.66, Math.floor(i / 4) * h, 0));
}
function syncCash(m) {
  setCount(m.cashGroup, Math.min(40, Math.ceil(m.bills)), makeBill, (o, i) => o.position.set(i % 2 ? 0.3 : -0.3, 0.05 + Math.floor(i / 4) * 0.1, (i >> 1) % 2 ? 0.22 : -0.22));
}

// ---------- quadrados de compra ----------
let pads = [];
function padDraw(p) {
  const c = p.L.ctx;
  c.clearRect(0, 0, 256, 256);
  rr(c, 8, 8, 240, 240, 36);
  c.fillStyle = 'rgba(38,198,218,0.92)';
  c.fill();
  const frac = p.paid / p.cost;
  if (frac > 0) {
    c.save();
    c.clip();
    c.fillStyle = 'rgba(0,131,143,0.92)';
    c.fillRect(0, 248 - 240 * frac, 256, 240 * frac);
    c.restore();
  }
  rr(c, 8, 8, 240, 240, 36);
  c.lineWidth = 10;
  c.strokeStyle = '#ffffff';
  c.setLineDash([26, 14]);
  c.stroke();
  c.setLineDash([]);
  c.fillStyle = '#ffffff';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  let y = 70;
  if (p.icon >= 0) {
    drawIcon(c, p.icon, 128, 62, 34);
    y = 128;
  }
  c.font = 'bold 40px system-ui, sans-serif';
  p.label.split('\n').forEach((ln, i) => c.fillText(ln, 128, y + i * 44, 220));
  c.fillStyle = '#2e7d32';
  rr(c, 40, 176, 44, 30, 6);
  c.fill();
  c.fillStyle = '#a5d6a7';
  c.beginPath();
  c.arc(62, 191, 8, 0, 7);
  c.fill();
  c.fillStyle = '#ffffff';
  c.font = 'bold 44px system-ui, sans-serif';
  c.textAlign = 'left';
  c.fillText(fmt(Math.ceil(p.cost - p.paid)), 94, 193, 130);
  p.L.tex.needsUpdate = true;
  p.shown = Math.ceil(p.cost - p.paid);
}
function makePad(key, x, z, cost, label, icon, onDone) {
  const g = new THREE.Group();
  g.position.set(x, 0.04, z);
  g.rotation.y = Math.PI / 4;
  const L = makeLabel(256, 256, 1);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3), new THREE.MeshBasicMaterial({ map: L.tex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  g.add(m);
  scene.add(g);
  const p = { key, x, z, cost, paid: Math.min(S.padPaid[key] || 0, cost - 1), label, icon, onDone, g, L, shown: -1 };
  padDraw(p);
  pops.push({ g, t: 0 });
  return p;
}
const splitName = (n) => n.replace(' de ', '\nde ').replace(' veg', '\nveg');
function refreshPads() {
  const want = [];
  // rés-do-chão
  if (S.built < N1) {
    const k = S.built, P = PRODUCTS[k];
    want.push(['prod' + k, modX(k), -1, P.cost, splitName(P.name), k, () => {
      S.built++;
      buildModule(k, true);
      toast(P.name + ' desbloqueado!');
    }]);
  }
  for (const m of mods) {
    if (hasCashier(m.k)) continue;
    want.push(['cash' + m.k, m.x - 2.6, m.oz + 1.3, PRODUCTS[m.k].cashier, 'Caixa', -1, () => {
      if (m.k < N1) S.cashiers[m.k] = true;
      else S.cashiers2[m.k - 9] = true;
      addCashier(m, true);
      toast('Caixa contratado para o balcão: ' + PRODUCTS[m.k].name + '!');
    }]);
  }
  if (S.helpers < HELPER_COST.length) {
    const first = S.helpers === 0;
    want.push(['help' + S.helpers, 0, -1.9, HELPER_COST[S.helpers], first ? 'Contratar\n' + CFG.helper.name : 'Ajudante', -1, () => {
      S.helpers++;
      addHelper(S.helpers - 1, 0, true);
      toast(first ? CFG.helper.name + ' chegou para ajudar a ' + CFG.player.name + '!' : 'Novo ajudante contratado!');
    }]);
  }
  if (!S.sala && S.built >= 5) want.push(['sala', -1.8, 0.9, SALA_COST, 'Esplanada', 8, () => {
    S.sala = true;
    openEsplanade(true);
    toast('Esplanada aberta! Passa entre os balcões: cozinha, serve à mesa e recolhe a gorjeta.');
  }]);
  if (!S.floor2 && S.built >= N1) want.push(['floor2', 0, -4.5, FLOOR2_COST, '1.º andar', 9, () => {
    S.floor2 = true;
    S.built2 = Math.max(1, S.built2);
    openFloor2(true);
    toast('1.º andar aberto! Sobe pelas escadas da porta ao fundo.');
  }]);
  // esplanada
  if (S.sala) {
    if (!S.cook) want.push(['cook', 0, 14.7, COOK_COST, 'Cozinheiro', -1, () => {
      S.cook = true;
      addCooks(true);
      toast('O Chef Tofu chegou! Agora a cozinha trabalha sozinha.');
    }]);
    if (!S.stove2) want.push(['stove2', -3.5, 16.7, STOVE2_COST, 'Novo prato', 13, () => {
      S.stove2 = true;
      buildStove(1, true);
      if (S.cook) addCooks(true);
      toast('Novo prato na cozinha: hambúrguer de grão!');
    }]);
    if (S.waiters < WAITER_COST.length) {
      const n = S.waiters;
      want.push(['waiter' + n, 7, 14.6, WAITER_COST[n], 'Empregado\nde mesa', -1, () => {
        S.waiters++;
        addWaiter(n, true);
        toast(`${WAITER_NAMES[n]} vem servir às mesas!`);
      }]);
    }
    if (S.tables < TABLE_POS.length) {
      const n = S.tables;
      want.push(['table' + n, TABLE_POS[n][0], TABLE_POS[n][1], TABLE_COST[n], 'Mesa', -1, () => {
        S.tables++;
        buildTable(n, true);
        toast('Mesa nova na esplanada!');
      }]);
    }
  }
  // 1.º andar
  if (S.floor2) {
    const oz = FL[1].oz;
    if (S.built2 < F2K.length) {
      const k = F2K[S.built2], P = PRODUCTS[k];
      want.push(['prod' + k, F2X[k - 9], oz - 1, P.cost, splitName(P.name), k, () => {
        S.built2++;
        buildModule(k, true);
        toast(P.name + ' desbloqueado!');
      }]);
    }
    if (S.helpers2 < HELPER2_COST.length) {
      const n = S.helpers2;
      want.push(['help2_' + n, 0, oz - 1.9, HELPER2_COST[n], 'Ajudante', -1, () => {
        S.helpers2++;
        addHelper(n, 1, true);
        toast('Novo ajudante no 1.º andar!');
      }]);
    }
  }
  const keys = new Set(want.map((w) => w[0]));
  pads = pads.filter((p) => {
    if (keys.has(p.key)) return true;
    scene.remove(p.g);
    p.L.tex.dispose();
    return false;
  });
  for (const w of want) if (!pads.some((p) => p.key === w[0])) pads.push(makePad(...w));
}

// ---------- jogadora ----------
const player = { floor: 0, moved: false, x: 1.6, z: -0.4, group: null, anchor: null, carry: [], meshes: [], boost: 0, still: 0, moving: false, tPick: 0, tDrop: 0, fullT: 0 };
function buildPlayer() {
  const o = CFG.player;
  player.group = makePerson({ shirt: o.dress, dress: true, hair: o.hair, skin: o.skin, apron: '#ffffff', style: o.style || 'pony' });
  player.anchor = new THREE.Group();
  player.anchor.position.set(0, 0.66, -0.5);
  player.group.add(player.anchor);
  player.group.position.set(player.x, 0, player.z);
  scene.add(player.group);
}
function restack(meshes, types) {
  let y = 0;
  for (let i = 0; i < meshes.length; i++) {
    meshes[i].position.set(0, y, 0);
    y += PRODUCTS[types[i]].h;
  }
}
function carryAdd(k) {
  const m = makeProduct(k);
  player.carry.push(k);
  player.meshes.push(m);
  player.anchor.add(m);
  restack(player.meshes, player.carry);
}
function carryRemove(k) {
  const i = k === undefined ? player.carry.length - 1 : player.carry.lastIndexOf(k);
  if (i < 0) return -1;
  const kk = player.carry[i];
  player.carry.splice(i, 1);
  player.anchor.remove(player.meshes.splice(i, 1)[0]);
  restack(player.meshes, player.carry);
  return kk;
}
const playerHand = () => tmpV.set(player.x, 1.2 + Math.min(4, player.carry.length * 0.2), player.z).clone();

const input = { x: 0, y: 0, active: false, id: null, ox: 0, oy: 0 };
const keys = {};
function bindInput() {
  const joy = $('joy'), knob = $('knob');
  canvas.addEventListener('pointerdown', (e) => {
    if (!running || input.active) return;
    sound.muted = S.muted;
    sound.init(); // depois de uma atualização automática o som volta ao primeiro toque
    input.active = true;
    input.id = e.pointerId;
    input.ox = e.clientX;
    input.oy = e.clientY;
    input.x = input.y = 0;
    joy.style.display = 'block';
    joy.style.left = e.clientX + 'px';
    joy.style.top = e.clientY + 'px';
    knob.style.transform = 'translate(0,0)';
    $('drag').style.display = 'none';
    try { canvas.setPointerCapture(e.pointerId); } catch {}
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!input.active || e.pointerId !== input.id) return;
    let dx = e.clientX - input.ox, dy = e.clientY - input.oy;
    const d = Math.hypot(dx, dy), R = 46;
    if (d > R) {
      dx *= R / d;
      dy *= R / d;
    }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    input.x = dx / R;
    input.y = dy / R;
  });
  const end = (e) => {
    if (e.pointerId !== input.id) return;
    input.active = false;
    input.x = input.y = 0;
    joy.style.display = 'none';
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  window.addEventListener('keydown', (e) => (keys[e.key.toLowerCase()] = true));
  window.addEventListener('keyup', (e) => (keys[e.key.toLowerCase()] = false));
  window.addEventListener('contextmenu', (e) => e.preventDefault());
}

function xLim(f) {
  let mx = 3.5;
  if (f === 0) for (let k = 0; k < Math.min(N1, S.built + 1); k++) mx = Math.max(mx, Math.abs(modX(k)));
  else for (let i = 0; i < Math.min(F2K.length, S.built2 + 1); i++) mx = Math.max(mx, Math.abs(F2X[i]));
  return mx + 4.5;
}
function canStand(x, z) {
  const f = player.floor, lz = z - FL[f].oz;
  if (lz >= -4.9 && lz <= 3.9) return Math.abs(x) <= xLim(f);
  if (lz < -4.9 && lz >= -9.2 && Math.abs(x) <= 1.2) return f === 1 || S.floor2; // escadas
  if (f === 0 && S.sala) {
    if (lz > 3.9 && lz < 12.5) {
      const g = Math.round(x / 7) * 7; // passagens entre balcões
      return Math.abs(g) <= 21 && Math.abs(x - g) <= 1.25;
    }
    if (lz >= 12.5 && lz <= 22 && Math.abs(x) <= 17) {
      for (const s of stoves) if (Math.abs(x - s.x) < 2.0 && lz < 15.7) return false;
      for (const t of tables) {
        const d = Math.hypot(x - t.x, z - t.z);
        if (d < 1.0 && d < Math.hypot(player.x - t.x, player.z - t.z)) return false;
      }
      return true;
    }
  }
  return false;
}
function goFloor(f) {
  player.floor = f;
  player.x = 0;
  player.z = FL[f].oz - 5.7;
  player.stairsArmed = false; // só volta a usar as escadas depois de sair do corredor
  player.group.position.set(player.x, 0, player.z);
  player.group.rotation.y = 0;
  camTarget.set(player.x, 1, player.z);
  fade();
  sound.stairs();
}
function takeFrom(src, fromZ) {
  if (player.carry.length < capOf()) {
    if (player.tPick <= 0) {
      src.pile--;
      syncPile(src);
      fly(makeProduct(src.k), tmpV.set(src.x, 1.1, fromZ), playerHand, 0.2);
      carryAdd(src.k);
      player.tPick = 0.07;
      sound.pick();
    }
  } else if (player.fullT <= 0) {
    floatText('CHEIO!', player.x, 2.6 + player.carry.length * 0.1, player.z, '#ff8a80');
    ST().cheio++;
    sound.full();
    player.fullT = 1.6;
  }
}
function collectCash(src, x, y, z) {
  const v = src.cashValue;
  S.cash += v;
  S.total += v;
  goalProgress('earn', v);
  for (let i = 0; i < Math.min(8, Math.ceil(src.bills)); i++) fly(makeBill(), tmpV.set(x, y, z), playerHand, 0.2 + i * 0.04);
  src.cashValue = 0;
  src.bills = 0;
  floatText('+' + fmt(v), player.x, 2.8, player.z, '#b9f6ca');
  sound.cash();
}
let binHint = false;
function updatePlayer(dt) {
  let jx = input.x, jy = input.y;
  if (keys['arrowleft'] || keys['a']) jx -= 1;
  if (keys['arrowright'] || keys['d']) jx += 1;
  if (keys['arrowup'] || keys['w']) jy -= 1;
  if (keys['arrowdown'] || keys['s']) jy += 1;
  let mag = Math.hypot(jx, jy);
  if (mag > 1) {
    jx /= mag;
    jy /= mag;
    mag = 1;
  }
  player.moving = mag > 0.15;
  if (player.moving) {
    const wx = (jx + jy) * 0.7071, wz = (-jx + jy) * 0.7071; // direção do ecrã -> mundo
    const sp = speedOf();
    const nx = player.x + wx * sp * dt, nz = player.z + wz * sp * dt;
    if (canStand(nx, nz)) {
      player.x = nx;
      player.z = nz;
    } else if (canStand(nx, player.z)) player.x = nx;
    else if (canStand(player.x, nz)) player.z = nz;
    player.group.rotation.y = Math.atan2(wx, wz);
    player.still = 0;
    player.moved = true;
    const lz = player.z - FL[player.floor].oz;
    if (lz > -5.1) player.stairsArmed = true;
    else if (lz < -8.3 && player.stairsArmed !== false) goFloor(player.floor ? 0 : 1);
  } else player.still += dt;
  player.group.position.set(player.x, 0, player.z);
  animPerson(player.group, player.moving, dt);
  if (player.boost > 0) player.boost -= dt;
  player.tPick -= dt;
  player.tDrop -= dt;
  player.fullT -= dt;

  for (const m of mods) {
    if (m.floor !== player.floor) continue;
    const dx = Math.abs(player.x - m.x), lz = player.z - m.oz;
    if (dx < 1.9 && lz < -3.5 && lz > -5.2 && m.pile > 0) takeFrom(m, m.sz + 1.35);
    if (dx < 2.1 && lz > 2.3 && lz < 4.2 && m.stock < STOCK_CAP && player.tDrop <= 0 && player.carry.includes(m.k)) {
      carryRemove(m.k);
      m.stock++;
      syncStock(m);
      const cx = m.x, cz = m.oz + COUNTER_Z;
      fly(makeProduct(m.k), playerHand(), () => tmpV.set(cx - 0.6, 1.3, cz), 0.2);
      player.tDrop = 0.055;
      sound.drop();
    }
    if (m.cashValue > 0 && Math.hypot(player.x - (m.x + 2.9), lz - 3.3) < 1.5) {
      collectCash(m, m.x + 2.9, 0.3, m.oz + 3.3);
      syncCash(m);
    }
  }
  // lixo: parada junto ao caixote deita fora o que leva
  if (player.carry.length) {
    for (const b of BINS) {
      if (b.floor !== player.floor || (b.sala && !S.sala) || Math.hypot(player.x - b.x, player.z - b.z) > 1.4) continue;
      if (!binHint) {
        binHint = true;
        toast('Fica parada junto ao lixo para deitar fora o que levas.');
      }
      if (player.still < 0.45 || player.tDrop > 0) break;
      const k = carryRemove();
      ST().lixo++;
      fly(makeProduct(k), playerHand(), () => tmpV.set(b.x, 1.0, b.z), 0.22);
      player.tDrop = 0.06;
      sound.drop();
      break;
    }
  }
  // comprar (parada sobre um quadrado)
  for (const p of pads) {
    if (Math.hypot(player.x - p.x, player.z - p.z) < 1.15 && player.still > 0.3 && player.moved && S.cash >= 1) {
      const pay = Math.min(Math.max(p.cost / 1.2, 25) * dt, S.cash, p.cost - p.paid);
      S.cash -= pay;
      p.paid += pay;
      S.padPaid[p.key] = p.paid;
      if (Math.random() < 0.3) fly(makeBill(), playerHand(), () => tmpV.set(p.x, 0.1, p.z), 0.22);
      if (p.paid >= p.cost - 0.001) {
        delete S.padPaid[p.key];
        logEvent('compra: ' + p.key + ' (' + p.label.replace('\n', ' ') + ')');
        p.onDone();
        sound.unlock();
        refreshPads();
        save();
        break;
      } else if (Math.ceil(p.cost - p.paid) !== p.shown) {
        padDraw(p);
        sound.pick();
      }
    }
  }
}

// ---------- produção ----------
function updateStations(dt) {
  const g = growMult(), cap = pileCap();
  for (const m of mods) {
    if (m.pile >= cap) continue;
    m.timer += dt;
    const iv = PRODUCTS[m.k].interval * g;
    if (m.timer >= iv) {
      m.timer -= iv;
      m.pile++;
      syncPile(m);
    }
  }
}

// ---------- clientes dos balcões ----------
const customers = [];
const bagGeo = new B().rbox('#d9a066', 0.34, 0.4, 0.22, 0.46, 0.66, 0.1).box('#b98850', 0.2, 0.12, 0.03, 0.46, 0.9, 0.1).geometry();
const NATS = ['pt', 'pt', 'pt', 'pt', 'fr', 'fr', 'de', 'de', 'uk', 'uk', 'es', 'es'];
function linesFor(nat) {
  const J = CFG.player.name, P = CFG.helper.name, cat = pick(CFG.cats).name;
  switch (nat) {
    case 'fr': return [`Merci, ${J} !`, 'Oh là là, délicieux !', 'Sans beurre ?! Impossible... et pourtant !', "C'est végane ? Incroyable !", "Un de plus, s'il vous plaît.", `${cat} m'a jugé. Je reviens demain.`, 'Presque trop bon pour être vrai.'];
    case 'de': return [`Danke, ${J}!`, 'Sehr lecker!', 'Ohne Butter? Unglaublich!', 'Das nehme ich gleich zweimal.', 'Kaffee und Kuchen, perfekt!', `${cat} ist hier die Chefin, oder?`, 'Vegan? Schmeckt man gar nicht!'];
    case 'uk': return [`Thanks, ${J}!`, 'Lovely!', 'Proper tea. Brilliant.', 'No milk in the tea? Rather good, actually.', 'Sorry, could I have one more?', `${cat} is clearly the manager.`, "Vegan? You're joking. It's delicious."];
    case 'es': return [`¡Gracias, ${J}!`, '¡Qué rico!', '¿Vegano? ¡No me lo creo!', `¡Olé, ${J}!`, 'Otro más, por favor.', `Aquí manda ${cat}, ¿verdad?`, '¡Esto está de muerte!'];
    default: return [`Obrigado, ${J}!`, `Obrigada, ${J}!`, 'Que delícia!', 'Isto é vegan? Não acredito!', 'É de comer e chorar por mais!', 'Mais uma nata e rebento!', `A ${cat} é que é a gerente?`, `A ${cat} cobrou-me uma festinha.`, 'Volto amanhã. E depois de amanhã.', 'Melhor que o da minha avó. Não lhe digam!', 'Era só um café... levo seis bolos.', `O ${P} que lave a loiça!`, 'Sem ovos? Como é que isto é tão bom?', 'Hoje a dieta fica à porta.', 'Hmm, que cheirinho!'];
  }
}
const speak = (c) => say(pick(linesFor(c.nat)), c.x, 3.4, c.z, '#fff59d');
function randomPerson() {
  const woman = Math.random() < 0.5;
  const style = woman ? pick(['long', 'pony', 'bun', 'bob', 'long']) : pick(['short', 'short', 'hat', 'bald', 'short']);
  return makePerson({ shirt: pick(SHIRTS), pants: pick(PANTS), hair: pick(HAIRS), skin: pick(SKINS), style, dress: woman && Math.random() < 0.45, hatColor: pick(SHIRTS), glasses: Math.random() < 0.18 });
}
function bubbleDraw(c) {
  const x = c.bubble.ctx;
  x.clearRect(0, 0, 128, 72);
  rr(x, 4, 4, 120, 54, 18);
  x.fillStyle = '#ffffff';
  x.fill();
  x.lineWidth = 4;
  x.strokeStyle = '#3b2a1a';
  x.stroke();
  x.beginPath();
  x.moveTo(52, 57);
  x.lineTo(64, 70);
  x.lineTo(76, 57);
  x.fillStyle = '#ffffff';
  x.fill();
  drawIcon(x, c.k, 36, 31, 18);
  x.fillStyle = '#3b2a1a';
  x.font = 'bold 36px system-ui, sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(String(c.remaining), 88, 35);
  drawFlag(x, c.nat, 98, 1, 27, 18);
  c.bubble.tex.needsUpdate = true;
}
function addBubble(c) {
  c.bubble = makeLabel(128, 72, 0.95);
  c.bubble.sprite.position.y = 2.75;
  c.bubble.sprite.visible = false;
  c.group.add(c.bubble.sprite);
  bubbleDraw(c);
}
function removePerson(c) {
  scene.remove(c.group);
  disposeTree(c.group);
}
function spawnCustomer(m) {
  const side = Math.random() < 0.5 ? -1 : 1;
  const qty = 1 + Math.floor(Math.random() * (2 + Math.min(6, Math.floor(S.up.cap / 2))));
  const sx = m.floor ? side * 27 : m.x + side * (14 + Math.random() * 6);
  const c = { m, k: m.k, x: sx, z: m.oz + LANE + (Math.random() - 0.5), group: randomPerson(), qty, remaining: qty, state: 'in', atLane: false, path: null, speed: 3 + Math.random() * 0.8, nat: pick(NATS) };
  addBubble(c);
  c.group.position.set(c.x, 0, c.z);
  scene.add(c.group);
  m.queue.push(c);
  customers.push(c);
}
function moveTo(e, tx, tz, dt, speed) {
  const dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz);
  if (d < 0.06) {
    animPerson(e.group, false, dt);
    return true;
  }
  const s = Math.min(d, speed * dt);
  e.x += (dx / d) * s;
  e.z += (dz / d) * s;
  e.group.position.set(e.x, 0, e.z);
  e.group.rotation.y = Math.atan2(dx, dz);
  animPerson(e.group, true, dt);
  return false;
}
function updateCustomers(dt) {
  for (const m of mods) {
    m.spawnT -= dt;
    if (m.spawnT <= 0) {
      m.spawnT = 2.2 + Math.random() * 2.6;
      if (m.queue.length < 4) spawnCustomer(m);
    }
    const head = m.queue[0];
    m.serveT -= dt;
    const lz = player.z - m.oz;
    const attended = hasCashier(m.k) || (player.floor === m.floor && Math.abs(player.x - m.x) < 2.7 && lz > 1.6 && lz < 4.5);
    if (head && head.arrived && m.stock > 0 && m.serveT <= 0 && attended) {
      m.stock--;
      syncStock(m);
      head.remaining--;
      bubbleDraw(head);
      const hx = head.x, hz = head.z;
      fly(makeProduct(m.k), tmpV.set(m.x - 0.6, 1.3, m.oz + COUNTER_Z), () => tmpV.set(hx, 1.0, hz), 0.2);
      m.serveT = 0.2;
      if (head.remaining <= 0) {
        const amount = head.qty * PRODUCTS[m.k].price * saleMult();
        m.cashValue += amount;
        statSale(m.k, head.qty, amount, 'balcoes');
        m.bills += head.qty;
        syncCash(m);
        goalProgress('sell', head.qty, m.k);
        if (player.floor === m.floor && Math.abs(player.x - m.x) < 14) sound.sale();
        m.queue.shift();
        head.state = 'out';
        head.bubble.sprite.visible = false;
        head.group.add(new THREE.Mesh(bagGeo, MAT));
        const side = Math.random() < 0.5 ? -1 : 1;
        const exit = m.floor ? side * 27 : head.x + side * (16 + Math.random() * 5);
        head.path = [[m.x + 1.25, head.z + 0.4], [m.x + 1.25, m.oz + LANE + 0.6], [exit, m.oz + LANE + 0.6]];
        if (Math.random() < 0.2) speak(head);
      }
    }
  }
  for (let i = customers.length - 1; i >= 0; i--) {
    const c = customers[i], m = c.m;
    if (c.state === 'in') {
      if (!c.atLane) {
        if (moveTo(c, m.x, m.oz + LANE, dt, c.speed)) {
          c.atLane = true;
          c.bubble.sprite.visible = true;
        }
      } else {
        const idx = m.queue.indexOf(c);
        const arrived = moveTo(c, m.x - 0.6, m.oz + COUNTER_Z + 1.5 + idx * 1.15, dt, c.speed);
        c.arrived = arrived && idx === 0;
        if (arrived) c.group.rotation.y = Math.PI;
      }
    } else if (moveTo(c, c.path[0][0], c.path[0][1], dt, c.speed)) {
      c.path.shift();
      if (!c.path.length) {
        removePerson(c);
        customers.splice(i, 1);
      }
    }
  }
}

// ---------- ajudantes ----------
const helpers = [];
function addHelper(i, floor, animate) {
  const first = i === 0 && floor === 0;
  const o = CFG.helper;
  const g = first
    ? makePerson({ shirt: o.shirt, pants: '#37474f', hair: o.hair, skin: o.skin, apron: '#ffffff', style: o.style || 'short' })
    : makePerson({ shirt: ['#66bb6a', '#ffa726', '#ab47bc', '#26c6da'][(i + floor) % 4], pants: '#37474f', hair: HAIRS[(i * 2 + floor) % HAIRS.length], skin: SKINS[(i + floor * 2) % SKINS.length], apron: '#ffffff', style: ['bun', 'short', 'pony', 'hat'][(i + floor) % 4], hatColor: '#ffffff' });
  const tag = nameTag(first ? pedroName() : 'Ajudante', first ? '#90caf9' : '#ffffff');
  tag.position.y = 2.5;
  g.add(tag);
  const anchor = new THREE.Group();
  anchor.position.set(0, 0.66, -0.5);
  g.add(anchor);
  const home = floor ? [i * 1.3 - 1.3, FL[1].oz + 0.2] : [i * 1.3 - 2.6, 0.2];
  const h = { i, floor, first, x: home[0], z: home[1], home, group: g, anchor, tag, mode: 'idle', t: 0.5, k: -1, carry: 0, want: 0, wait: 0, say: 12 };
  g.position.set(h.x, 0, h.z);
  scene.add(g);
  helpers.push(h);
  if (animate) pop(g);
}
const pedroName = () => CFG.helper.name + (S.up.pedro > 0 ? ' ★' + S.up.pedro : '');
function pedroLevelUp() {
  const h = helpers.find((o) => o.first);
  if (!h) return;
  const y = h.tag.position.y;
  h.group.remove(h.tag);
  h.tag.material.map.dispose();
  h.tag.material.dispose();
  h.tag = nameTag(pedroName(), '#90caf9');
  h.tag.position.y = y;
  h.group.add(h.tag);
  burst(h.x, 2, h.z, '#90caf9', 14);
  floatText(pick(['Estou mais forte!', 'Fui ao ginásio!', 'Agora ninguém me apanha!']), h.x, 3.4, h.z, '#90caf9', 2.4);
}
function helperSync(h) {
  if (h.k < 0) return setCount(h.anchor, 0);
  const hh = PRODUCTS[h.k].h;
  setCount(h.anchor, h.carry, pileMake(h.k), (m, i) => m.position.set(0, i * hh, 0));
  h.tag.position.y = 2.5 + Math.max(0, h.carry * hh - 1.2);
}
function pedroJokes() {
  const J = CFG.player.name, cat = pick(CFG.cats).name;
  return [
    `${J}, és a melhor!`, `Amo-te, ${J}!`, 'Sou padeiro por amor... e pela massa.',
    'Tentei contar uma piada sobre pão, mas era seca.', 'A minha piada sobre fermento ainda está a crescer.',
    'O pão caiu ao chão. Ficou pão-ralisado.', 'O que diz um croissant ao outro? Estás em forma!',
    'O que disse o zero ao oito? Belo cinto!', 'Qual é o animal mais antigo? A zebra: ainda é a preto e branco.',
    'O que é um ponto verde ao canto? Uma ervilha de castigo.', 'Porque está triste o livro de matemática? Tem muitos problemas.',
    'Pedi um bolo sem ovos, sem leite e sem graça. Saiu esta piada.', 'O donut foi ao dentista? Precisava de um recheio.',
    'Este café é como eu: forte e quentinho.', `${cat}, sabes qual é o cúmulo da gata? Ter sete vidas e dormir em todas.`,
    'Quem comeu o último donut? ...Fui eu.', 'Hoje a loiça é minha. Outra vez.',
    'Porque é que o café foi à esquadra? Foi assaltado... era um expresso.', 'O que faz a tosta no ginásio? Abdominais de abacate.',
    'Subi ao 1.º andar a pé. Já posso comer um gelado.',
  ];
}
function updateHelpers(dt) {
  const baseCap = Math.max(4, Math.floor(capOf() * 0.75));
  const baseSp = 4.4 * (1 + 0.05 * S.up.speed);
  for (const h of helpers) {
    // o Pedro tem as suas próprias melhorias
    const cap = h.first ? baseCap + 2 * S.up.pedro : baseCap;
    const sp = h.first ? baseSp * (1 + 0.08 * S.up.pedro) : baseSp;
    if (h.first) {
      h.say -= dt;
      if (h.say <= 0) {
        h.say = 28 + Math.random() * 30;
        if (player.floor === 0) say(pick(pedroJokes()), h.x, 3.4, h.z, '#90caf9');
      }
    }
    switch (h.mode) {
      case 'idle': {
        h.t -= dt;
        moveTo(h, h.home[0], h.home[1], dt, sp);
        if (h.t > 0) break;
        h.t = 0.4;
        let best = null, bs = -1e9;
        for (const m of mods) {
          if (m.floor !== h.floor) continue;
          let reserved = 0;
          for (const o of helpers) if (o !== h && o.m === m) reserved += o.mode === 'toCounter' || o.mode === 'drop' ? o.carry : o.want;
          let waiting = 0;
          for (const q of m.queue) waiting += q.remaining;
          const covered = m.stock + reserved;
          const need = Math.min(waiting + 8, STOCK_CAP) - covered;
          if (need > 0 && m.pile > 0) {
            // 1.º balcões com clientes à espera sem produto; 2.º repor os mais vazios; desempate: o mais perto
            const deficit = waiting - covered;
            const score = (deficit > 0 ? 1000 + deficit * 10 : need / (covered + 1)) - Math.abs(h.x - m.x) * 0.05;
            if (score > bs) {
              bs = score;
              best = m;
              h.want = Math.min(cap, need);
            }
          }
        }
        if (best) {
          h.m = best;
          h.k = best.k;
          h.mode = 'toStation';
        }
        break;
      }
      case 'toStation':
        if (moveTo(h, h.m.x + (h.i % 2 ? 0.9 : -0.9), h.m.oz - 4.6, dt, sp)) {
          h.mode = 'collect';
          h.t = 0;
          h.wait = 0;
        }
        break;
      case 'collect': {
        const m = h.m;
        h.t -= dt;
        animPerson(h.group, false, dt);
        if (h.carry >= h.want) h.mode = 'toCounter';
        else if (m.pile > 0) {
          if (h.t <= 0) {
            m.pile--;
            syncPile(m);
            h.carry++;
            helperSync(h);
            h.t = 0.1;
          }
        } else {
          h.wait += dt;
          if (h.wait > 1.5) {
            if (h.carry > 0) h.mode = 'toCounter';
            else {
              h.mode = 'idle';
              h.k = -1;
              h.m = null;
              h.want = 0;
            }
          }
        }
        break;
      }
      case 'toCounter':
        if (moveTo(h, h.m.x + (h.i % 2 ? 0.7 : -0.7), h.m.oz + 3.5, dt, sp)) {
          h.mode = 'drop';
          h.t = 0;
        }
        break;
      case 'drop': {
        const m = h.m;
        h.t -= dt;
        animPerson(h.group, false, dt);
        if (h.carry === 0) {
          helperSync(h);
          h.mode = 'idle';
          h.k = -1;
          h.m = null;
          h.want = 0;
          h.t = 0.1;
        } else if (m.stock < STOCK_CAP && h.t <= 0) {
          h.carry--;
          m.stock++;
          syncStock(m);
          helperSync(h);
          h.t = 0.08;
        }
        break;
      }
    }
  }
}

// ---------- esplanada: cozinha ao ar livre, mesas, cozinheiros e empregados ----------
const stoves = [], tables = [], guests = [], waiters = [];
let chefSay = 40;
function buildStove(i, animate) {
  const d = STOVES[i];
  const st = makeStation(d.k, false);
  st.group.position.set(d.x, 0, KZ);
  scene.add(st.group);
  const hint = nameTag('Fica aqui para cozinhar', '#fff59d');
  hint.scale.multiplyScalar(1.4);
  hint.position.set(0, 2.2, 2.4);
  st.group.add(hint);
  stoves[i] = { i, k: d.k, x: d.x, pile: 0, timer: 0, group: st.group, pileGroup: st.pileGroup, hint, cookMesh: null };
  if (animate) {
    pop(st.group);
    burst(d.x, 1.5, KZ + 1);
  }
}
function addCooks(animate) {
  for (const s of stoves) {
    if (!s || s.cookMesh) continue;
    const g = makePerson({ shirt: '#ffffff', pants: '#37474f', hair: s.i ? '#bf8040' : '#3e2723', skin: s.i ? '#f7d7b5' : '#d9a273', apron: s.i ? '#ef8f3a' : '#7cb342', style: 'chef' });
    g.position.set(s.x, 0, KZ - 1.45);
    const tag = nameTag(COOK_NAMES[s.i], '#c5e1a5');
    tag.position.y = 2.95;
    g.add(tag);
    scene.add(g);
    s.cookMesh = g;
    if (animate) pop(g);
  }
}
function buildTable(i, animate) {
  const [x, z] = TABLE_POS[i];
  const t = makeTable(i);
  t.group.position.set(x, 0, z);
  scene.add(t.group);
  tables[i] = { i, x, z, group: t.group, itemsGroup: t.itemsGroup, cashGroup: t.cashGroup, guest: null, items: 0, k: 8, cashValue: 0, bills: 0, spawnT: 1 + Math.random() * 3 };
  if (animate) pop(t.group);
}
function syncTable(t) {
  const h = PRODUCTS[t.k].h;
  setCount(t.itemsGroup, t.items, pileMake(t.k), (m, i) => m.position.set((i % 2) * 0.5 - 0.2, Math.floor(i / 2) * h, 0));
  setCount(t.cashGroup, Math.min(12, Math.ceil(t.bills)), makeBill, (m, i) => m.position.set(0, i * 0.1, 0));
}
let espBuilt = false;
function openEsplanade(animate) {
  if (espBuilt) return;
  espBuilt = true;
  world.lotMesh.visible = false;
  buildEsplanade(scene);
  buildStove(0, animate);
  if (S.stove2) buildStove(1, animate);
  for (let i = 0; i < S.tables; i++) buildTable(i, animate);
  if (S.cook) addCooks(false);
  for (let i = 0; i < S.waiters; i++) addWaiter(i, false);
  addBin(BINS[1]);
}
function addWaiter(i, animate) {
  const g = makePerson({ shirt: '#212121', pants: '#212121', hair: i ? '#bf8040' : '#9e9e9e', skin: i ? '#f2c9a0' : '#c68642', apron: '#ffffff', style: i ? 'bun' : 'short', glasses: i === 0 });
  const tag = nameTag(WAITER_NAMES[i], '#ffe082');
  tag.position.y = 2.5;
  g.add(tag);
  const anchor = new THREE.Group();
  anchor.position.set(0, 0.66, -0.5);
  g.add(anchor);
  const home = [-0.7 + i * 1.4, 15.6];
  const h = { i, x: home[0], z: home[1], home, group: g, anchor, tag, mode: 'idle', t: 0.5, k: -1, carry: 0, want: 0, wait: 0, table: null, src: null };
  g.position.set(h.x, 0, h.z);
  scene.add(g);
  waiters.push(h);
  if (animate) pop(g);
}
function spawnGuest(t) {
  const avail = stoves.filter(Boolean);
  const s = pick(avail);
  const qty = 1 + Math.floor(Math.random() * (2 + Math.min(3, Math.floor(S.up.cap / 4))));
  const cz = t.z - 1.15, sx = t.x + (Math.random() * 16 - 8);
  const o = { table: t, k: s.k, qty, remaining: qty, x: sx, z: 24.2, group: randomPerson(), state: 'in', path: [[t.x + 1.3, 22.6], [t.x + 1.3, cz], [t.x, cz]], speed: 3 + Math.random() * 0.6, nat: pick(NATS), t: 0 };
  addBubble(o);
  o.group.position.set(o.x, 0, o.z);
  scene.add(o.group);
  t.guest = o;
  guests.push(o);
}
function serveGuest(t) {
  const g = t.guest;
  g.remaining--;
  t.k = g.k;
  t.items++;
  syncTable(t);
  bubbleDraw(g);
  if (g.remaining <= 0) {
    g.state = 'eat';
    g.t = 4 + Math.random() * 2;
    g.bubble.sprite.visible = false;
    goalProgress('serve', 1);
    goalProgress('sell', g.qty, g.k);
    if (Math.random() < 0.15) speak(g);
  }
}
function updateWaiters(dt) {
  const cap = Math.max(3, Math.floor(capOf() * 0.5));
  const sp = 4.6 * (1 + 0.05 * S.up.speed);
  const reset = (h) => {
    h.carry = 0;
    helperSync(h);
    h.mode = 'idle';
    h.table = null;
    h.src = null;
    h.k = -1;
    h.want = 0;
    h.t = 0.1;
  };
  for (const h of waiters) {
    switch (h.mode) {
      case 'idle': {
        h.t -= dt;
        moveTo(h, h.home[0], h.home[1], dt, sp);
        if (h.t > 0) break;
        h.t = 0.4;
        let best = null, bs = 0, bw = 0, bsrc = null;
        for (const t of tables) {
          const g = t.guest;
          if (!g || g.state !== 'sit') continue;
          let reserved = 0;
          for (const o of waiters) if (o !== h && o.table === t) reserved += o.mode === 'toTable' || o.mode === 'drop' ? o.carry : o.want;
          const need = g.remaining - reserved;
          const src = stoves.find((s) => s && s.k === g.k);
          if (need > 0 && src && src.pile > 0 && need > bs) {
            bs = need;
            best = t;
            bsrc = src;
            bw = Math.min(cap, need);
          }
        }
        if (best) {
          h.table = best;
          h.src = bsrc;
          h.k = bsrc.k;
          h.want = bw;
          h.mode = 'toSrc';
        }
        break;
      }
      case 'toSrc':
        if (moveTo(h, h.src.x + 0.9, 16.1, dt, sp)) {
          h.mode = 'collect';
          h.t = 0;
          h.wait = 0;
        }
        break;
      case 'collect': {
        const st = h.src;
        h.t -= dt;
        animPerson(h.group, false, dt);
        if (h.carry >= h.want) h.mode = 'toTable';
        else if (st.pile > 0) {
          if (h.t <= 0) {
            st.pile--;
            syncPile(st);
            h.carry++;
            helperSync(h);
            h.t = 0.1;
          }
        } else {
          h.wait += dt;
          if (h.wait > 2.5) {
            if (h.carry > 0) h.mode = 'toTable';
            else reset(h);
          }
        }
        break;
      }
      case 'toTable':
        if (moveTo(h, h.table.x + 1.25, h.table.z + 0.5, dt, sp)) {
          h.mode = 'drop';
          h.t = 0;
        }
        break;
      case 'drop': {
        const t = h.table, g = t.guest;
        h.t -= dt;
        animPerson(h.group, false, dt);
        const ok = g && g.state === 'sit' && g.k === h.k && g.remaining > 0;
        if (h.carry === 0 || !ok) reset(h);
        else if (h.t <= 0) {
          h.carry--;
          helperSync(h);
          serveGuest(t);
          h.t = 0.1;
        }
        break;
      }
    }
  }
}
function updateEsplanade(dt) {
  if (!S.sala) return;
  const here = player.floor === 0;
  for (const s of stoves) {
    if (!s) continue;
    const atStove = here && Math.abs(player.x - s.x) < 2.3 && player.z > 15.6 && player.z < 17.7;
    if (s.pile < pileCap() && (S.cook || atStove)) {
      s.timer += dt;
      const iv = PRODUCTS[s.k].interval * growMult();
      if (s.timer >= iv) {
        s.timer -= iv;
        s.pile++;
        syncPile(s);
      }
    }
    s.hint.visible = !S.cook && !atStove;
    if (here && Math.abs(player.x - s.x) < 1.9 && player.z > 15.6 && player.z < 17.4 && s.pile > 0) {
      // só leva o que os clientes pediram (menos o que ela e os empregados já levam), para não ficar carregada de pratos
      let need = 0;
      for (const g of guests) if (g.k === s.k && (g.state === 'in' || g.state === 'sit')) need += g.remaining;
      for (const k of player.carry) if (k === s.k) need--;
      for (const w of waiters) if (w.k === s.k) need -= w.mode === 'toTable' || w.mode === 'drop' ? w.carry : w.want;
      if (need > 0) takeFrom(s, KZ + 1.35);
      else if (player.moving && player.fullT <= 0) {
        floatText('Sem pedidos por agora', player.x, 2.8, player.z, '#fff59d');
        player.fullT = 3;
      }
    }
  }
  if (S.cook) {
    chefSay -= dt;
    if (chefSay <= 0) {
      chefSay = 60 + Math.random() * 60;
      say(pick(['Tofu no ponto!', 'Sem ovos, com amor.', 'Abacate maduro à primeira!', 'Quem roubou o meu grão?', 'Isto não se queima. Quase nunca.', `${pick(CFG.cats).name}, fora da cozinha!`]), stoves[0].x, 3.8, KZ - 1.4, '#c5e1a5');
    }
  }
  for (const t of tables) {
    const near = here && Math.hypot(player.x - t.x, player.z - t.z) < 2.2;
    const g = t.guest;
    if (!g) {
      t.spawnT -= dt;
      if (t.spawnT <= 0) spawnGuest(t);
    } else if (g.state === 'sit' && near && player.tDrop <= 0 && player.carry.includes(g.k)) {
      carryRemove(g.k);
      const tx = t.x, tz = t.z;
      fly(makeProduct(g.k), playerHand(), () => tmpV.set(tx, 1.1, tz), 0.2);
      serveGuest(t);
      player.tDrop = 0.08;
      sound.drop();
    }
    if (t.cashValue > 0 && near) {
      collectCash(t, t.x, 1, t.z);
      syncTable(t);
    }
  }
  for (let i = guests.length - 1; i >= 0; i--) {
    const g = guests[i], t = g.table;
    if (g.state === 'in') {
      if (moveTo(g, g.path[0][0], g.path[0][1], dt, g.speed)) {
        g.path.shift();
        if (!g.path.length) {
          g.state = 'sit';
          g.group.rotation.y = 0;
          g.group.position.y = -0.04;
          sitPerson(g.group, true);
          g.bubble.sprite.visible = true;
        }
      }
    } else if (g.state === 'eat') {
      g.t -= dt;
      g.group.userData.upper.rotation.x = Math.max(0, Math.sin(g.t * 5)) * 0.18;
      if (g.t <= 0) {
        const amount = g.qty * PRODUCTS[g.k].price * saleMult() * TIP;
        t.cashValue += amount;
        statSale(g.k, g.qty, amount, 'mesas');
        ST().served++;
        t.bills += g.qty * 2;
        t.items = 0;
        syncTable(t);
        if (here) sound.sale();
        t.guest = null;
        t.spawnT = 1.5 + Math.random() * 2.5;
        g.state = 'out';
        sitPerson(g.group, false);
        const cz = t.z - 1.15;
        g.path = [[t.x + 1.3, cz], [t.x + 1.3, 22.6], [t.x + (Math.random() * 30 - 15), 24.4]];
        if (Math.random() < 0.25) speak(g);
      }
    } else if (g.state === 'out') {
      if (moveTo(g, g.path[0][0], g.path[0][1], dt, g.speed)) {
        g.path.shift();
        if (!g.path.length) {
          removePerson(g);
          guests.splice(i, 1);
        }
      }
    }
  }
  updateWaiters(dt);
}

// ---------- caixotes do lixo ----------
function addBin(b) {
  const g = makeBin();
  g.position.set(b.x, 0, b.z);
  const tag = nameTag('Lixo', '#ffffff');
  tag.position.y = 1.7;
  g.add(tag);
  scene.add(g);
}

// ---------- 1.º andar ----------
let floor2Built = false;
const clouds = [];
function openFloor2(animate) {
  if (floor2Built) return;
  floor2Built = true;
  world.doorClosed.visible = false;
  world.stairs.visible = true;
  buildFloor2(scene, FL[1].oz);
  const up = nameTag('1.º andar', '#fff59d'), down = nameTag('Rés-do-chão', '#fff59d');
  up.scale.multiplyScalar(1.5);
  down.scale.multiplyScalar(1.5);
  up.position.set(0, 3.6, -9.0);
  down.position.set(0, 4.9, FL[1].oz - 8.8);
  scene.add(up, down);
  for (let i = 0; i < 9; i++) {
    const c = makeCloud(1 + Math.random() * 1.2);
    c.position.set((Math.random() * 2 - 1) * 90, -7 - Math.random() * 5, FL[1].oz - 40 + Math.random() * 90);
    scene.add(c);
    clouds.push(c);
  }
  for (let i = 0; i < S.built2; i++) buildModule(F2K[i], false);
  for (let i = 0; i < S.helpers2; i++) addHelper(i, 1, false);
  addBin(BINS[2]);
  if (animate) burst(0, 2, -8, '#ffd54f', 20);
}

// ---------- rua ----------
const cars = []; // ciclistas
function buildCars() {
  [['#e85d75', '#ffd54f', '#f2c9a0', '#3e2723', 27.6, 1, -50], ['#4fc3f7', '#ef5350', '#d9a273', '#212121', 29.8, -1, 15], ['#aed581', '#ab47bc', '#8d5a3b', '#bf8040', 27.0, 1, 35], ['#ffa726', '#26a69a', '#f7d7b5', '#9e9e9e', 30.4, -1, -75]].forEach(([c, shirt, skin, hair, z, dir, x]) => {
    const m = makeBike(c, shirt, skin, hair);
    m.position.set(x, 0, z);
    m.rotation.y = dir > 0 ? 0 : Math.PI;
    scene.add(m);
    cars.push({ m, dir, sp: 3 + Math.random() * 2 });
  });
}
function updateAmbient(dt) {
  for (const c of cars) {
    c.m.position.x += c.dir * c.sp * dt;
    if (c.m.position.x > 95) c.m.position.x = -95;
    if (c.m.position.x < -95) c.m.position.x = 95;
  }
  for (const c of clouds) {
    c.position.x += dt * 0.6;
    if (c.position.x > 100) c.position.x = -100;
  }
}

// ---------- gatas ----------
const cats = [];
const CAT_BEDS = [[-6.4, -6.3], [7.6, -6.2]];
function buildCats() {
  CFG.cats.forEach((o, i) => {
    const g = makeCat(o.color, o.patch, o.stripes);
    const tag = nameTag(o.name, '#ffd1dc');
    tag.position.y = 1.25;
    g.add(tag);
    const c = { o, i, x: i ? 2.5 : -2.5, z: 1.5 - i, group: g, state: 'sit', t: 2 + i * 2, tx: 0, tz: 0, cool: 0, say: 8 + Math.random() * 12 };
    g.position.set(c.x, 0, c.z);
    scene.add(g);
    cats.push(c);
  });
}
function catLines(c) {
  const J = CFG.player.name, P = CFG.helper.name, other = (CFG.cats.find((o) => o !== c.o) || c.o).name;
  return c.state === 'sleep'
    ? ['Zzz...', 'Zzz... atum... zzz', 'Não incomodar. Estou a supervisionar.', 'Zzz... 5 da manhã... correr... zzz']
    : ['Miau. (Tradução: comida.)', 'Este balcão é meu.', 'Não sou gorda, sou fofa.', 'Se cabe, eu sento.', 'Festinhas. Agora.', 'Deitei um copo abaixo. De nada.', `A ${J} é minha.`, `${P}, a taça está meio vazia!`, 'Trabalhar? Eu supervisiono.', 'Caixa de cartão > cama cara.', 'Miau? Miau.', `A ${other} roubou-me o lugar.`, 'Vi um pássaro! Era uma folha.', 'Abre a porta. Fecha. Abre outra vez.', 'A gerente sou eu. Perguntas?', `${P}, isso é para mim? Não? Miau.`, 'Estou a fazer dieta. Mentira.', 'O caixote do lixo é o meu buffet.', 'Subi ao telhado. Agora não sei descer.'];
}
function updateCats(dt) {
  let ext = 3.5;
  for (let k = 0; k < S.built; k++) ext = Math.max(ext, Math.abs(modX(k)));
  ext += 2;
  const here = player.floor === 0;
  for (const c of cats) {
    const u = c.group.userData;
    c.t -= dt;
    c.cool -= dt;
    c.say -= dt;
    if (c.say <= 0) {
      c.say = 30 + Math.random() * 40;
      if (here) say(pick(catLines(c)), c.x, 1.8, c.z, '#ffd1dc');
    }
    if (c.state === 'walk') {
      const dx = c.tx - c.x, dz = c.tz - c.z, d = Math.hypot(dx, dz);
      if (d < 0.1 || c.t <= 0) {
        c.state = c.toBed ? 'sleep' : Math.random() < 0.3 ? 'sleep' : 'sit';
        c.t = (c.toBed ? 8 : 3) + Math.random() * 6;
      } else {
        const s = Math.min(d, 1.8 * dt);
        c.x += (dx / d) * s;
        c.z += (dz / d) * s;
        c.group.rotation.y = Math.atan2(dx, dz);
        u.ph += dt * 12;
        u.body.position.y = Math.abs(Math.sin(u.ph)) * 0.04;
        u.head.position.y = 0.5 + Math.abs(Math.sin(u.ph)) * 0.04;
      }
    } else {
      const low = c.state === 'sleep';
      u.body.position.y += ((low ? -0.07 : 0) - u.body.position.y) * 0.1;
      u.head.position.y += ((low ? 0.26 : 0.52) - u.head.position.y) * 0.1;
      if (c.t <= 0) {
        c.state = 'walk';
        c.t = 14;
        c.toBed = false;
        const r = Math.random();
        if (r < 0.2) {
          const bed = CAT_BEDS[(c.i + (Math.random() < 0.3 ? 1 : 0)) % 2];
          c.tx = bed[0];
          c.tz = bed[1];
          c.toBed = true;
        } else if (r < 0.55 && here && player.z < 4) {
          c.tx = player.x + (Math.random() * 3 - 1.5); // gostam de andar atrás da dona
          c.tz = Math.max(-3.8, Math.min(2.6, player.z + (Math.random() * 3 - 1.5)));
        } else {
          c.tx = (Math.random() * 2 - 1) * ext;
          c.tz = -3.6 + Math.random() * 6;
        }
      }
    }
    u.tail.rotation.z = Math.sin(performance.now() / 300 + c.x) * 0.4;
    c.group.position.set(c.x, 0, c.z);
    if (here && c.cool <= 0 && Math.hypot(player.x - c.x, player.z - c.z) < 1.2) {
      c.cool = 40;
      player.boost = 20;
      S.pets++;
      goalProgress('pet', 1);
      sound.meow();
      burst(c.x, 1.0, c.z, '#ff7aa2', 6);
      floatText(pick(['♥', '♥ Miau!', '♥ Prrrr...', '♥ Mrrau?']), c.x, 1.7, c.z, '#ff5c8a');
      toast(`A ${c.o.name} ronronou! Velocidade extra por 20 s`);
      if (c.state === 'sleep') {
        c.state = 'sit';
        c.t = 3;
      }
    }
  }
}

// ---------- objetivos ----------
let goalT = 3;
function newGoal() {
  const types = ['sell', 'sell', 'earn', 'pet'];
  if (S.sala) types.push('serve');
  const type = pick(types);
  let g;
  if (type === 'sell') {
    const k = pick(mods).k, n = pick([15, 20, 25, 30, 40]);
    g = { type, k, n, p: 0, reward: Math.round(n * PRODUCTS[k].price * priceMult() * 1.5) };
  } else if (type === 'earn') {
    const n = Math.round(Math.max(150, S.total * 0.04));
    g = { type, n, p: 0, reward: Math.round(n * 0.35) };
  } else if (type === 'pet') {
    g = { type, n: 2 + Math.floor(Math.random() * 2), p: 0, reward: Math.round(Math.max(60, S.total * 0.01)) };
  } else {
    const n = 4 + Math.floor(Math.random() * 5);
    g = { type, n, p: 0, reward: Math.round(n * PRODUCTS[8].price * priceMult() * TIP * 1.5) };
  }
  S.goal = g;
  drawGoal();
}
function drawGoal() {
  const el = $('goal'), g = S.goal;
  if (!g || S.tut < 5) {
    el.classList.add('hidden');
    return;
  }
  el.classList.remove('hidden');
  const text = g.type === 'sell' ? `Vende ${g.n} × ${PRODUCTS[g.k].name}` : g.type === 'earn' ? `Ganha ${fmt(g.n)}` : g.type === 'pet' ? `Faz ${g.n} festinhas às gatas` : `Serve ${g.n} clientes na esplanada`;
  $('goalT').textContent = text;
  $('goalP').textContent = `${g.type === 'earn' ? fmt(Math.min(g.p, g.n)) : Math.min(g.p, g.n)}/${g.type === 'earn' ? fmt(g.n) : g.n} · prémio ${fmt(g.reward)}`;
  $('goalBar').style.width = Math.min(100, (g.p / g.n) * 100) + '%';
}
function goalProgress(type, amount, k) {
  const g = S.goal;
  if (!g || g.type !== type || (type === 'sell' && g.k !== k)) return;
  g.p += amount;
  if (g.p >= g.n) {
    S.cash += g.reward;
    S.total += g.reward;
    S.goalsDone++;
    ST().earned.objetivos += g.reward;
    logEvent('objetivo: ' + g.type);
    toast(`Objetivo cumprido! +${fmt(g.reward)}`);
    sound.unlock();
    burst(player.x, 2, player.z, '#ffd54f', 16);
    S.goal = null;
    goalT = 4;
  }
  drawGoal();
}

// ---------- anúncios jogáveis (demos dos próximos jogos) ----------
let adOpen = false, adCool = 20;
const AD_SECONDS = 60;
function startAd() {
  if (adOpen) return;
  const i = S.adNext % ADS.length;
  adOpen = true;
  ST().ads.opened++;
  input.active = false;
  input.x = input.y = 0;
  $('joy').style.display = 'none';
  openAd(i, `dinheiro a dobrar durante ${AD_SECONDS} s`, sound, (res) => {
    adOpen = false;
    last = performance.now();
    if (!res) {
      adCool = 15;
      ST().ads.skipped++;
      logEvent('anúncio fechado: ' + ADS[i].name);
      return;
    }
    ST().ads.done++;
    logEvent(`anúncio jogado: ${ADS[i].name} (${Math.round(res.score * 100)}%${res.vote ? ', voto ' + res.vote : ''})`);
    adBoost = AD_SECONDS;
    if (res.vote) S.adVotes[ADS[i].name] = res.vote;
    S.adNext++;
    adCool = 150;
    toast(`Prémio do anúncio: dinheiro a dobrar durante ${AD_SECONDS} s!`);
    sound.unlock();
    burst(player.x, 2, player.z, '#ffd54f', 16);
    save();
  });
}

// ---------- tutorial ----------
const arrow = new B().cone('#ffd600', 0.7, 0.9, 0, 0, 0, Math.PI).cyl('#ffd600', 0.3, 0.7, 0, 0.75, 0).mesh(false, false);
function updateTutorial() {
  const hint = $('hint');
  if (S.tut >= 5) {
    arrow.visible = false;
    hint.style.display = 'none';
    return;
  }
  const c = modByK[0];
  if (S.tut === 0 && player.carry.length > 0) S.tut = 1;
  if (S.tut === 1 && c.stock > 0) S.tut = 2;
  if (S.tut === 2 && (c.cashValue > 0 || S.cash > 0)) S.tut = 3;
  if (S.tut === 3 && S.cash > 0 && c.cashValue === 0) S.tut = 4;
  if (S.tut <= 4 && (S.built > 1 || S.helpers > 0 || S.cashiers[0])) {
    S.tut = 5;
    drawGoal();
  }
  const pad = pads.find((p) => p.key === 'prod1') || pads[0];
  const T = [
    ['Recolhe os pães no forno', c.x, STATION_Z + 2],
    ['Leva os pães ao balcão', c.x - 0.6, 3.4],
    ['Fica junto ao balcão para atender os clientes', c.x - 0.6, 3.4],
    ['Recolhe o dinheiro', c.x + 2.9, 3.3],
    ['Fica parada em cima de um quadrado azul para comprar', pad ? pad.x : 0, pad ? pad.z : 0],
  ][Math.min(S.tut, 4)];
  hint.textContent = T[0];
  hint.style.display = 'block';
  arrow.visible = true;
  arrow.position.set(T[1], 2.8 + Math.sin(performance.now() / 220) * 0.3, T[2]);
}

// ---------- interface ----------
const ICON_SND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12"/></svg>';
const ICON_MUTE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';
let hudCash = -1, hudCarry = '';
function updateHud(dt) {
  const c = Math.floor(S.cash);
  if (c !== hudCash) {
    hudCash = c;
    $('cash').textContent = fmt(c);
    $('bUp').classList.toggle('can', UPS.some((u) => upShown(u) && S.up[u.id] < u.max && S.cash >= upCost(u)));
    if (!$('upg').classList.contains('hidden')) renderUpgrades();
  }
  const s = player.carry.length + '/' + capOf();
  if (s !== hudCarry) {
    hudCarry = s;
    $('carry').textContent = s;
    $('carryPill').classList.toggle('full', player.carry.length >= capOf());
  }
  if (toastT > 0) {
    toastT -= dt;
    if (toastT <= 0) $('toast').classList.remove('show');
  }
  if (adBoost > 0) {
    adBoost -= dt;
    $('boost').textContent = `×2 dinheiro · ${Math.ceil(Math.max(0, adBoost))} s`;
  }
  $('boost').classList.toggle('hidden', adBoost <= 0);
  if (adCool > 0) adCool -= dt;
  $('bAd').classList.toggle('hidden', S.tut < 5 || adCool > 0 || adBoost > 0);
  if (!S.goal && S.tut >= 5) {
    goalT -= dt;
    if (goalT <= 0) newGoal();
  }
}
function renderUpgrades() {
  const list = $('upList');
  list.innerHTML = '';
  for (const u of UPS) {
    if (!upShown(u)) continue;
    const lvl = S.up[u.id], maxed = lvl >= u.max, cost = upCost(u);
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `<div class="t"><b>${u.id === 'pedro' ? CFG.helper.name : u.name}</b><span>${u.desc} · Nível ${lvl + 1}</span></div>`;
    const b = document.createElement('button');
    b.className = 'btn';
    b.textContent = maxed ? 'MÁX' : fmt(cost);
    b.disabled = maxed || S.cash < cost;
    b.onclick = () => {
      if (S.cash < cost || maxed) return;
      S.cash -= cost;
      S.up[u.id]++;
      logEvent('melhoria: ' + u.id + ' -> ' + S.up[u.id]);
      if (u.id === 'pedro') pedroLevelUp();
      sound.unlock();
      hudCarry = '';
      renderUpgrades();
      save();
    };
    row.appendChild(b);
    list.appendChild(row);
  }
  $('stats').textContent = `Total ganho: ${fmt(S.total)} · Festinhas às gatas: ${S.pets} · Objetivos: ${S.goalsDone}`;
  $('bGfx').textContent = 'Gráficos: ' + (S.gfx === 'low' ? 'simples' : 'bonitos');
}
function bindUi() {
  $('bSnd').innerHTML = S.muted ? ICON_MUTE : ICON_SND;
  $('bSnd').onclick = () => {
    S.muted = !S.muted;
    sound.setMuted(S.muted);
    $('bSnd').innerHTML = S.muted ? ICON_MUTE : ICON_SND;
    save();
  };
  $('bFs').onclick = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else goFullscreen();
  };
  $('bUp').onclick = () => {
    sound.click();
    renderUpgrades();
    $('upg').classList.remove('hidden');
  };
  $('bClose').onclick = () => $('upg').classList.add('hidden');
  $('bAd').onclick = startAd;
  $('upg').addEventListener('pointerdown', (e) => {
    if (e.target === $('upg')) $('upg').classList.add('hidden');
  });
  $('bGfx').onclick = () => {
    S.gfx = S.gfx === 'low' ? 'high' : 'low';
    S.gfxUser = true;
    applyGfx();
    renderUpgrades();
    save();
  };
  $('bReset').onclick = () => $('confirm').classList.remove('hidden');
  $('bNo').onclick = () => $('confirm').classList.add('hidden');
  $('bYes').onclick = async () => {
    resetting = true;
    try { localStorage.removeItem('cafe-save'); } catch {}
    location.reload();
  };
  $('bPlay').onclick = () => {
    sound.muted = S.muted;
    sound.init();
    goFullscreen();
    $('title').classList.add('hidden');
    $('hud').classList.remove('hidden');
    if (!player.moved && S.total < 50) $('drag').style.display = 'block';
    drawGoal();
    running = true;
    logEvent('sessão iniciada');
    fpsT = 0;
    fpsN = 0;
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      save();
      sound.suspend(true);
    } else sound.suspend(false);
  });
  window.addEventListener('pagehide', () => save());
}
function goFullscreen() {
  const el = document.documentElement;
  try {
    const p = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen && el.webkitRequestFullscreen();
    if (p && p.catch) p.catch(() => {});
    if (screen.orientation && screen.orientation.lock) screen.orientation.lock('portrait').catch(() => {});
  } catch {}
}

// ---------- gravação ----------
let resetting = false, loaded = false;
function save() {
  if (resetting || !loaded) return;
  S.t = Date.now();
  const byK = (f) => Object.fromEntries(mods.map((m) => [m.k, f(m)]));
  S.w = {
    f: player.floor, px: player.x, pz: player.z, carry: player.carry.slice(),
    stock: byK((m) => m.stock), pile: byK((m) => m.pile), cv: byK((m) => m.cashValue), cb: byK((m) => m.bills),
    kp: stoves.map((s) => (s ? s.pile : 0)), tv: tables.map((t) => t.cashValue), tb: tables.map((t) => t.bills),
  };
  const body = JSON.stringify(S);
  try { localStorage.setItem('cafe-save', body); } catch {}
}
async function load() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem('cafe-save')); } catch {}
  if (!d || typeof d !== 'object') return;
  const int = (v, lo, hi, def) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.floor(v))) : def);
  for (const key of ['cash', 'total']) if (Number.isFinite(d[key])) S[key] = Math.max(0, d[key]);
  S.built = int(d.built, 1, N1, 1);
  S.helpers = int(d.helpers, 0, HELPER_COST.length, 0);
  S.tut = int(d.tut, 0, 5, 0);
  S.pets = int(d.pets, 0, 1e9, 0);
  S.goalsDone = int(d.goalsDone, 0, 1e9, 0);
  S.tables = int(d.tables, 2, TABLE_POS.length, 2);
  S.waiters = int(d.waiters, 0, WAITER_COST.length, 0);
  S.built2 = int(d.built2, 0, F2K.length, 0);
  S.helpers2 = int(d.helpers2, 0, HELPER2_COST.length, 0);
  if (Array.isArray(d.cashiers)) for (let i = 0; i < N1; i++) S.cashiers[i] = !!d.cashiers[i];
  if (Array.isArray(d.cashiers2)) for (let i = 0; i < 4; i++) S.cashiers2[i] = !!d.cashiers2[i];
  if (d.up) for (const u of UPS) S.up[u.id] = int(d.up[u.id], 0, u.max, 0);
  if (d.padPaid && typeof d.padPaid === 'object') S.padPaid = d.padPaid;
  S.muted = !!d.muted;
  S.sala = !!d.sala;
  S.cook = !!d.cook;
  S.stove2 = !!d.stove2;
  S.floor2 = !!d.floor2;
  if (S.floor2) S.built2 = Math.max(1, S.built2);
  if (d.gfx === 'low' || d.gfx === 'high') S.gfx = d.gfx;
  S.gfxUser = !!d.gfxUser;
  S.adNext = int(d.adNext, 0, 1e9, 0);
  if (d.adBump !== 2) S.adNext = Math.ceil(S.adNext / ADS.length) * ADS.length; // nesta versão, o próximo anúncio volta a ser as Bolhas da Bruxa
  if (d.adVotes && typeof d.adVotes === 'object') S.adVotes = d.adVotes;
  if (d.stats && typeof d.stats === 'object') {
    const b = newStats(), x = d.stats;
    S.stats = { ...b, ...x, area: { ...b.area, ...x.area }, earned: { ...b.earned, ...x.earned }, ads: { ...b.ads, ...x.ads }, days: { ...x.days }, sold: { ...x.sold }, events: Array.isArray(x.events) ? x.events.slice(-400) : [] };
  }
  const g = d.goal;
  if (g && typeof g === 'object' && ['sell', 'earn', 'pet', 'serve'].includes(g.type) && Number.isFinite(g.n) && Number.isFinite(g.p) && Number.isFinite(g.reward) && (g.type !== 'sell' || PRODUCTS[g.k])) S.goal = { type: g.type, k: g.k, n: g.n, p: g.p, reward: g.reward };
  if (d.w && typeof d.w === 'object') S.w = d.w;
}
// repõe o estado do mundo gravado (stock, pilhas, dinheiro por recolher, o que ela leva, onde está)
function restoreWorld() {
  const w = S.w && typeof S.w === 'object' ? S.w : null;
  const num = (a, i, max) => (a && Number.isFinite(a[i]) ? Math.max(0, Math.min(max, a[i])) : 0);
  for (const m of mods) {
    m.pile = w ? Math.floor(num(w.pile, m.k, pileCap())) : 4;
    m.stock = Math.floor(num(w && w.stock, m.k, STOCK_CAP));
    m.cashValue = num(w && w.cv, m.k, 1e15);
    m.bills = num(w && w.cb, m.k, 40);
    syncPile(m);
    syncStock(m);
    syncCash(m);
  }
  stoves.forEach((s, i) => {
    if (!s) return;
    s.pile = w ? Math.floor(Array.isArray(w.kp) ? num(w.kp, i, pileCap()) : i === 0 && Number.isFinite(w.kp) ? Math.max(0, Math.min(pileCap(), w.kp)) : 0) : 0;
    syncPile(s);
  });
  tables.forEach((t, i) => {
    t.cashValue = num(w && w.tv, i, 1e15);
    t.bills = num(w && w.tb, i, 12);
    syncTable(t);
  });
  if (!w) return;
  if (Array.isArray(w.carry)) for (const k of w.carry.slice(0, capOf())) if (Number.isInteger(k) && k >= 0 && k < PRODUCTS.length) carryAdd(k);
  if (Number.isFinite(w.px) && Number.isFinite(w.pz)) {
    const f = w.f === 1 && S.floor2 ? 1 : 0;
    player.floor = f;
    if (canStand(w.px, w.pz) && w.pz - FL[f].oz > -7.5) {
      player.x = w.px;
      player.z = w.pz;
    } else {
      player.floor = 0;
    }
    player.group.position.set(player.x, 0, player.z);
  }
}

// ---------- ciclo principal ----------
let last = performance.now(), saveT = 0, fpsT = 0, fpsN = 0, fpsChecked = false;
function frame(now) {
  requestAnimationFrame(frame);
  if (adOpen) return; // o café fica em pausa (e não gasta bateria) enquanto o anúncio está aberto
  const raw = (now - last) / 1000;
  const dt = Math.min(0.05, raw);
  last = now;
  if (running && !adOpen) {
    for (let step = window.__ts || 1; step > 0; step--) {
      updatePlayer(dt);
      updateStations(dt);
      updateCustomers(dt);
      updateHelpers(dt);
      updateEsplanade(dt);
      updateCats(dt);
      updateFlies(dt);
    }
    statTick(dt * (window.__ts || 1), raw);
    updateTutorial();
    updateHud(dt);
    saveT += dt;
    if (saveT > 4) {
      saveT = 0;
      save();
    }
    // telemóvel lento? passa sozinho para gráficos simples (uma vez)
    if (!fpsChecked && raw < 0.5) {
      fpsT += raw;
      fpsN++;
      if (fpsT > 6) {
        fpsChecked = true;
        if (fpsN / fpsT < 26 && S.gfx !== 'low' && !S.gfxUser && !FORCE_GFX) {
          S.gfx = 'low';
          applyGfx();
          toast('Gráficos simplificados para o jogo correr melhor (podes mudar em Melhorias).');
        }
      }
    }
  }
  updateAmbient(dt);
  if (!running) updateFlies(dt);
  updateFloats(dt);
  updatePops(dt);
  updateSparks(dt);
  camTarget.lerp(tmpV.set(player.x, 1, player.z), running ? Math.min(1, dt * 6) : 1);
  camera.position.copy(camTarget).add(CAM_OFF);
  camera.lookAt(camTarget);
  sun.target.position.set(Math.round(camTarget.x), 0, Math.round(camTarget.z));
  sun.position.set(sun.target.position.x - 8, 16, sun.target.position.z + 7);
  renderer.render(scene, camera);
}

let world = null;
async function start() {
  try {
    const r = await fetch('config.json', { cache: 'no-store' });
    if (r.ok) {
      const c = await r.json();
      CFG = { ...CFG, ...c, player: { ...CFG.player, ...c.player }, helper: { ...CFG.helper, ...c.helper }, cats: Array.isArray(c.cats) && c.cats.length ? c.cats.map((o, i) => ({ ...(CFG.cats[i] || CFG.cats[0]), ...o })) : CFG.cats };
    }
  } catch {}
  await load();
  loaded = true;
  document.title = CFG.cafeName;
  $('tName').textContent = CFG.cafeName;
  const catNames = CFG.cats.map((c) => 'da ' + c.name);
  $('tSub').innerHTML = `<b style="color:#43a047">${CFG.tagline || ''}</b><br>Com a ajuda do ${CFG.helper.name}${catNames.length ? ', ' + catNames.slice(0, -1).join(', ') + (catNames.length > 1 ? ' e ' : '') + catNames[catNames.length - 1] : ''}`;
  world = buildGround(scene, CFG);
  const soon = nameTag('Esplanada: em breve', '#fff59d');
  soon.scale.multiplyScalar(1.4);
  soon.position.set(0, 2.9, 16.5);
  world.lotMesh.add(soon);
  buildCars();
  for (let k = 0; k < S.built; k++) buildModule(k, false);
  buildPlayer();
  for (let i = 0; i < S.helpers; i++) addHelper(i, 0, false);
  addBin(BINS[0]);
  if (S.sala) openEsplanade(false);
  if (S.floor2) openFloor2(false);
  buildCats();
  scene.add(arrow);
  arrow.visible = false;
  restoreWorld();
  refreshPads();
  bindInput();
  bindUi();
  applyGfx();
  camTarget.set(player.x, 1, player.z);
  $('loading').classList.add('hidden');
  $('title').classList.remove('hidden');
  window.__game = { startAd, S, player, mods, modByK, helpers, cats, customers, save, input, keys, tables, guests, waiters, stoves, renderer, goFloor, get pads() { return pads; } };
  requestAnimationFrame(frame);
}
start();
