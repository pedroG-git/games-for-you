// Cenário e peças do café: chão, edifício, esplanada, 1.º andar, bancas, balcões, mesas...
import { THREE, B, MAT, canvasTex, makeLabel, rr } from './gfx.js';
import { PRODUCTS, drawIcon } from './models.js';

const HP = Math.PI / 2;
const lamb = (map) => new THREE.MeshLambertMaterial({ map });
function plane(scene, w, d, material, x, y, z) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
  m.rotation.x = -HP;
  m.position.set(x, y, z);
  m.receiveShadow = true;
  scene.add(m);
  return m;
}
const colorMat = (c) => new THREE.MeshLambertMaterial({ color: c });
function rng(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

// ---------- texturas ----------
function grassTex(base, a, b2) {
  const r = rng(11);
  const t = canvasTex(256, 256, (c) => {
    c.fillStyle = base;
    c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 90; i++) {
      c.fillStyle = i % 2 ? a : b2;
      c.globalAlpha = 0.35;
      c.beginPath();
      c.ellipse(r() * 256, r() * 256, 8 + r() * 22, 5 + r() * 12, r() * 3, 0, 7);
      c.fill();
    }
    c.globalAlpha = 1;
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function tileTex(c1, c2, line) {
  const t = canvasTex(128, 128, (c) => {
    c.fillStyle = c1;
    c.fillRect(0, 0, 128, 128);
    c.fillStyle = c2;
    c.fillRect(0, 0, 64, 64);
    c.fillRect(64, 64, 64, 64);
    c.strokeStyle = line;
    c.lineWidth = 3;
    for (const [x, y] of [[0, 0], [64, 0], [0, 64], [64, 64]]) c.strokeRect(x, y, 64, 64);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function woodTex(c1, c2) {
  const t = canvasTex(128, 128, (c) => {
    c.fillStyle = c1;
    c.fillRect(0, 0, 128, 128);
    c.strokeStyle = c2;
    c.lineWidth = 3;
    for (let y = 0; y <= 128; y += 32) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(128, y);
      c.stroke();
    }
    for (let i = 0; i < 4; i++) {
      const x = (i * 53 + 20) % 128;
      c.beginPath();
      c.moveTo(x, i * 32);
      c.lineTo(x, i * 32 + 32);
      c.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function cobbleTex() {
  const r = rng(5);
  const t = canvasTex(128, 128, (c) => {
    c.fillStyle = '#d9d2c2';
    c.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      c.fillStyle = ['#e8e2d4', '#cfc7b6', '#e0d9c9'][Math.floor(r() * 3)];
      rr(c, x * 32 + 2 + (y % 2) * 8, y * 32 + 2, 28, 28, 7);
      c.fill();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function azulejoTex() {
  const t = canvasTex(64, 64, (c) => {
    c.fillStyle = '#f7fbff';
    c.fillRect(0, 0, 64, 64);
    c.strokeStyle = '#2f6fb7';
    c.lineWidth = 3;
    c.strokeRect(1.5, 1.5, 61, 61);
    c.fillStyle = '#2f6fb7';
    c.beginPath();
    c.moveTo(32, 8);
    c.lineTo(56, 32);
    c.lineTo(32, 56);
    c.lineTo(8, 32);
    c.closePath();
    c.fill();
    c.fillStyle = '#f7fbff';
    c.beginPath();
    c.arc(32, 32, 11, 0, 7);
    c.fill();
    c.fillStyle = '#f2c230';
    c.beginPath();
    c.arc(32, 32, 5, 0, 7);
    c.fill();
    c.fillStyle = '#2f6fb7';
    for (const [x, y] of [[6, 6], [58, 6], [6, 58], [58, 58]]) {
      c.beginPath();
      c.arc(x, y, 5, 0, 7);
      c.fill();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
export function skyTexture() {
  return canvasTex(8, 256, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#7cc4f0');
    g.addColorStop(0.6, '#bfe6fb');
    g.addColorStop(1, '#fdf3e1');
    c.fillStyle = g;
    c.fillRect(0, 0, 8, 256);
  });
}

// ---------- peças pequenas de cenário (cada função acrescenta formas a um construtor B) ----------
function tree(b, x, z, s, r) {
  const g1 = ['#4caf50', '#43a047', '#5cb860'][Math.floor(r() * 3)], g2 = ['#66bb6a', '#7cc97f'][Math.floor(r() * 2)];
  if (r() < 0.25) {
    b.cyl('#8a5a2b', 0.4 * s, 1.0 * s, x, 0.5 * s, z);
    for (let i = 0; i < 3; i++) b.cone(i % 2 ? g2 : g1, (2.6 - i * 0.6) * s, 1.6 * s, x, (1.5 + i * 1.0) * s, z);
  } else {
    b.cyl('#8a5a2b', 0.45 * s, 1.5 * s, x, 0.75 * s, z, 0.32 * s);
    b.sph(g1, 2.4 * s, 2.2 * s, 2.4 * s, x, 2.3 * s, z).sph(g2, 1.6 * s, 1.5 * s, 1.6 * s, x + 0.6 * s, 3.1 * s, z + 0.3 * s).sph(g1, 1.5 * s, 1.3 * s, 1.5 * s, x - 0.7 * s, 2.9 * s, z - 0.2 * s);
  }
}
function planter(b, x, z, w, d, r, flowers = true) {
  b.rbox('#a9744a', w, 0.55, d, x, 0.275, z, 0, 0.08);
  b.rbox('#4caf50', w - 0.15, 0.45, d - 0.15, x, 0.7, z, 0, 0.18);
  if (flowers) {
    const cols = ['#f06292', '#ffd54f', '#ba68c8', '#ff8a65', '#ffffff'];
    const n = Math.round(Math.max(w, d) * 1.6);
    for (let i = 0; i < n; i++) b.sph(cols[Math.floor(r() * cols.length)], 0.2, 0.2, 0.2, x + (r() - 0.5) * (w - 0.4), 0.95 + r() * 0.08, z + (r() - 0.5) * (d - 0.4), true);
  }
}
function lampPost(b, x, z) {
  b.cyl('#3f4b53', 0.5, 0.12, x, 0.06, z, 0.3).cyl('#3f4b53', 0.13, 3.2, x, 1.6, z).rbox('#3f4b53', 0.5, 0.12, 0.5, x, 3.25, z).sph('#fff3c4', 0.46, 0.5, 0.46, x, 3.55, z).cone('#3f4b53', 0.6, 0.3, x, 3.92, z);
}
function bench(b, x, z, ry) {
  const c = Math.cos(ry), s = Math.sin(ry);
  b.rbox('#b07a4a', 2.0, 0.12, 0.6, x, 0.5, z, ry, 0.04).rbox('#b07a4a', 2.0, 0.5, 0.1, x - s * 0.3, 0.9, z - c * 0.3, ry, 0.04);
  for (const o of [-0.8, 0.8]) b.box('#5d4037', 0.12, 0.5, 0.5, x + c * o, 0.25, z - s * o, ry);
}
function parasol(b, x, z, c1, c2) {
  b.cyl('#8d6e63', 0.7, 0.14, x, 0.07, z).cyl('#eeeeee', 0.1, 2.9, x, 1.45, z);
  b.cone(c1, 3.2, 0.8, x, 3.05, z, 0, 0, 10).cyl(c2, 3.2, 0.1, x, 2.66, z, 3.2, 0, 0, 10).sph(c2, 0.2, 0.2, 0.2, x, 3.5, z, true);
}
function house(b, x, z, w, h, d, wall, r) {
  b.rbox(wall, w, h, d, x, h / 2, z, 0, 0.1);
  b.box('#c75b39', w + 0.6, 0.25, d * 0.62, x, h + 0.55, z + d * 0.26, 0, 0.5).box('#b84f30', w + 0.6, 0.25, d * 0.62, x, h + 0.55, z - d * 0.26, 0, -0.5);
  // fachada virada a norte (para o café)
  const fz = z - d / 2 - 0.03;
  b.rbox('#8a5a2b', 0.9, 1.6, 0.1, x - w * 0.25, 0.8, fz, 0, 0.04);
  const n = Math.max(1, Math.floor(w / 2));
  for (let i = 0; i < n; i++) {
    const wx = x - w / 2 + (i + 0.5) * (w / n);
    if (h > 3.4) b.rbox('#ffffff', 1.0, 1.0, 0.1, wx, h - 1.1, fz, 0, 0.04).box('#8fc7e8', 0.76, 0.76, 0.12, wx, h - 1.1, fz);
    if (i > 0 || w > 4) b.rbox('#ffffff', 1.0, 1.0, 0.1, wx + (i === 0 ? 0.7 : 0), 1.4, fz, 0, 0.04).box('#8fc7e8', 0.76, 0.76, 0.12, wx + (i === 0 ? 0.7 : 0), 1.4, fz);
  }
  // lado nascente (o que a câmara vê)
  const fx = x + w / 2 + 0.03;
  b.rbox('#ffffff', 0.1, 1.0, 1.0, fx, h - 1.3, z, 0, 0.04).box('#8fc7e8', 0.12, 0.76, 0.76, fx, h - 1.3, z);
  void r;
}

// ---------- rés-do-chão ----------
export function buildGround(scene, cfg) {
  const r = rng(7);
  const grass = grassTex('#84cc56', '#79c24b', '#93d766');
  grass.repeat.set(40, 22);
  plane(scene, 300, 160, lamb(grass), 0, -0.04, 40);
  const tiles = tileTex('#f6e7c8', '#eedcb4', '#dfc79a');
  tiles.repeat.set(16, 3.75);
  plane(scene, 66, 15.2, lamb(tiles), 0, 0, -1.8);
  plane(scene, 66, 4.7, colorMat('#b5e089'), 0, -0.01, 8.05);
  const cob = cobbleTex();
  cob.repeat.set(60, 1.2);
  plane(scene, 130, 2.3, lamb(cob), 0, 0.0, 11.5);
  const cob2 = cobbleTex();
  cob2.repeat.set(140, 1.3);
  plane(scene, 300, 2.6, lamb(cob2), 0, 0, 24.2);
  plane(scene, 300, 6.4, colorMat('#c96a5a'), 0, -0.02, 28.7);
  const cob3 = cobbleTex();
  cob3.repeat.set(140, 1);
  plane(scene, 300, 2, lamb(cob3), 0, 0, 32.9);

  // edifício: parede do fundo com azulejos, janelas e telhado de telha
  const w = new B();
  const wallC = '#fbf1dc';
  w.box(wallC, 31.5, 3.6, 0.6, -17.25, 1.8, -9.6).box(wallC, 31.5, 3.6, 0.6, 17.25, 1.8, -9.6).box(wallC, 3.0, 0.9, 0.6, 0, 3.15, -9.6);
  w.box('#e85d75', 66.2, 0.3, 0.8, 0, 3.72, -9.55);
  for (let i = 0; i < 33; i++) w.box(i % 2 ? '#c75b39' : '#b84f30', 2.02, 0.28, 7.2, -32 + i * 2, 4.95, -13.0, 0, 0.36);
  w.box('#a3472b', 66.4, 0.3, 0.5, 0, 6.2, -16.4);
  w.box('#f3e4c6', 66, 4.6, 0.5, 0, 2.3, -16.6);
  for (const x of [-28, -21, -14, -7, 7, 14, 21, 28]) {
    w.rbox('#ffffff', 1.9, 1.5, 0.14, x, 2.55, -9.3, 0, 0.06).box('#8fc7e8', 1.55, 1.15, 0.16, x, 2.55, -9.29).box('#ffffff', 0.08, 1.15, 0.18, x, 2.55, -9.29).box('#ffffff', 1.55, 0.08, 0.18, x, 2.55, -9.29);
    w.rbox('#3f8f5a', 0.45, 1.5, 0.1, x - 1.2, 2.55, -9.26, 0, 0.04).rbox('#3f8f5a', 0.45, 1.5, 0.1, x + 1.2, 2.55, -9.26, 0, 0.04);
    w.rbox('#a9744a', 1.9, 0.25, 0.3, x, 1.72, -9.15, 0, 0.05);
    for (let i = 0; i < 5; i++) w.sph(['#f06292', '#ffd54f', '#ff8a65'][i % 3], 0.22, 0.22, 0.22, x - 0.7 + i * 0.35, 1.92, -9.12, true);
  }
  // moldura da porta para o 1.º andar
  w.rbox('#e85d75', 0.3, 2.9, 0.75, -1.65, 1.45, -9.6, 0, 0.08).rbox('#e85d75', 0.3, 2.9, 0.75, 1.65, 1.45, -9.6, 0, 0.08).rbox('#e85d75', 3.6, 0.3, 0.75, 0, 2.85, -9.6, 0, 0.08);
  scene.add(w.mesh());
  const az = azulejoTex();
  for (const x of [-17.25, 17.25]) {
    const t = az.clone();
    t.needsUpdate = true;
    t.repeat.set(31.5, 1.2);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(31.5, 1.2), lamb(t));
    m.position.set(x, 0.6, -9.29);
    m.receiveShadow = true;
    scene.add(m);
  }
  // porta fechada (antes de desbloquear o 1.º andar) e escadas (depois)
  const doorClosed = new B().rbox('#8a5a2b', 1.42, 2.6, 0.2, -0.74, 1.3, -9.45, 0, 0.06).rbox('#8a5a2b', 1.42, 2.6, 0.2, 0.74, 1.3, -9.45, 0, 0.06).sph('#f2c230', 0.16, 0.16, 0.16, -0.18, 1.3, -9.32, true).sph('#f2c230', 0.16, 0.16, 0.16, 0.18, 1.3, -9.32, true).mesh();
  scene.add(doorClosed);
  const st = new B();
  st.box('#3b2a1a', 3.0, 2.7, 0.2, 0, 1.35, -12.4);
  for (let i = 0; i < 7; i++) st.rbox(i % 2 ? '#f3e4c6' : '#e8d6b0', 3.0, 0.3, 0.55, 0, 0.15 + i * 0.3, -8.6 - i * 0.5, 0, 0.05);
  st.box('#d9c7a3', 0.2, 2.7, 3.6, -1.5, 1.35, -10.8).box('#d9c7a3', 0.2, 2.7, 3.6, 1.5, 1.35, -10.8);
  const stairs = st.mesh();
  stairs.visible = false;
  scene.add(stairs);

  // letreiro
  const signTex = canvasTex(1024, 256, (c) => {
    rr(c, 8, 8, 1008, 240, 50);
    c.fillStyle = '#fff7ef';
    c.fill();
    c.lineWidth = 16;
    c.strokeStyle = '#e85d75';
    c.stroke();
    c.fillStyle = '#e85d75';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = 'bold 118px Georgia, serif';
    c.fillText(cfg.cafeName, 512, 104, 940);
    c.fillStyle = '#43a047';
    c.font = 'bold 50px system-ui, sans-serif';
    c.fillText(cfg.tagline || '', 512, 196, 900);
  });
  const sign = new THREE.Group();
  const sp = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.25), new THREE.MeshBasicMaterial({ map: signTex, transparent: true }));
  sp.position.y = 6.3;
  sign.add(sp, new B().rbox('#8a5a2b', 0.25, 2.2, 0.25, -3, 4.5, -0.1).rbox('#8a5a2b', 0.25, 2.2, 0.25, 3, 4.5, -0.1).mesh());
  sign.position.set(0, 0, -9.9);
  sign.rotation.y = Math.PI / 4;
  scene.add(sign);

  // árvores, casas do outro lado da rua, arbustos
  const far = new B();
  for (let x = -70; x <= 70; x += 6 + r() * 4) tree(far, x + r() * 2, -21 - r() * 6, 1 + r() * 0.5, r);
  for (const [x, z, s] of [[-38, -7, 1.2], [-40, 3, 1], [38, -8, 1.1], [41, 2, 1.3], [-37, 14, 1.1], [37, 15, 1.2], [-44, 21, 1], [44, 20, 1.1], [-52, -2, 1.3], [53, 8, 1.2]]) tree(far, x, z, s, r);
  scene.add(far.mesh());
  const town = new B();
  let hx = -64;
  const walls = ['#ffe0b2', '#ffccbc', '#fff9c4', '#d1c4e9', '#b3e5fc', '#f8bbd0', '#dcedc8', '#ffffff'];
  while (hx < 64) {
    const hw = 4 + r() * 3, hh = 3.2 + r() * 2.4;
    house(town, hx + hw / 2, 37.5 + r() * 1.5, hw, hh, 5, walls[Math.floor(r() * walls.length)], r);
    hx += hw + 0.4 + (r() < 0.25 ? 2.5 : 0);
  }
  for (let x = -66; x <= 66; x += 11) lampPost(town, x + 3, 33.2);
  scene.add(town.mesh());
  const dash = new B();
  for (let x = -80; x <= 80; x += 4) dash.box('#f5f5f5', 2, 0.02, 0.25, x, 0, 28.7);
  scene.add(dash.mesh(false));

  // decoração do café (fundo entre bancas; o x = 0 é a porta)
  const d = new B();
  const jit = (a) => (r() * 2 - 1) * a;
  const crates = (x, z) => d.rbox('#b07a4a', 1.0, 0.8, 1.0, x, 0.4, z, jit(0.3), 0.06).rbox('#c48b57', 0.9, 0.7, 0.9, x + 0.95, 0.35, z + 0.15, jit(0.3), 0.06).rbox('#a56f3f', 0.85, 0.7, 0.85, x + 0.3, 1.15, z + 0.05, jit(0.3), 0.06).sph('#ef5350', 0.3, 0.3, 0.3, x + 0.2, 1.6, z).sph('#ffa726', 0.3, 0.3, 0.3, x + 0.5, 1.58, z + 0.15);
  const sacks = (x, z) => d.sph('#e8d9b5', 0.9, 1.0, 0.8, x, 0.45, z).sph('#dccb9f', 0.85, 0.9, 0.75, x + 0.75, 0.4, z + 0.2).sph('#e8d9b5', 0.8, 0.8, 0.7, x + 0.35, 1.05, z + 0.1);
  const barrel = (x, z) => d.cyl('#8a5a2b', 0.95, 1.2, x, 0.6, z).cyl('#5d4037', 1.0, 0.1, x, 0.3, z).cyl('#5d4037', 1.0, 0.1, x, 0.9, z).sph('#43a047', 0.9, 0.7, 0.9, x, 1.4, z).sph('#ffd54f', 0.2, 0.2, 0.2, x + 0.2, 1.75, z + 0.1, true).sph('#f06292', 0.2, 0.2, 0.2, x - 0.2, 1.7, z - 0.1, true);
  const shelf = (x, z) => {
    d.rbox('#8a5a2b', 2.0, 0.1, 0.6, x, 0.6, z).rbox('#8a5a2b', 2.0, 0.1, 0.6, x, 1.3, z).rbox('#8a5a2b', 0.1, 1.4, 0.6, x - 1.0, 0.7, z).rbox('#8a5a2b', 0.1, 1.4, 0.6, x + 1.0, 0.7, z);
    [['#ef9a9a', -0.6, 0.85], ['#fff59d', -0.1, 0.85], ['#a5d6a7', 0.5, 0.85], ['#ce93d8', -0.4, 1.55], ['#ffcc80', 0.3, 1.55]].forEach(([c, dx, y]) => d.cyl(c, 0.3, 0.4, x + dx, y, z));
  };
  crates(-21 + jit(0.3), -7.7);
  shelf(-14 + jit(0.2), -8.6);
  // arranhador e camas das gatas
  d.rbox('#d7b98e', 1.3, 0.12, 1.3, -7.2, 0.06, -8.0, 0.3, 0.04).cyl('#d7b98e', 0.25, 2.0, -7.2, 1.0, -8.0).rbox('#e85d75', 1.0, 0.12, 1.0, -6.95, 1.1, -8.0, 0.3, 0.04).rbox('#e85d75', 0.9, 0.12, 0.9, -7.4, 2.05, -8.0, 0.3, 0.04).sph('#fff59d', 0.16, 0.16, 0.16, -6.6, 0.85, -7.7, true);
  for (const [x, z] of [[-6.4, -6.3], [7.6, -6.2]]) d.cyl('#ffb3c1', 1.3, 0.25, x, 0.125, z).cyl('#fff1f3', 0.95, 0.27, x, 0.13, z);
  sacks(6.8, -7.9);
  barrel(13.6, -8.0);
  sacks(14.6, -6.6);
  crates(20.8, -7.9);
  barrel(-27.6, -7.6);
  crates(27.4, -7.7);
  // candeeiros junto às passagens e flores no relvado das filas
  for (const g of [-21, -7, 7, 21]) lampPost(d, g + 1.55, 7.2);
  for (let i = 0; i < 70; i++) {
    const x = jit(31), z = 6.2 + r() * 3.7;
    const m = ((x % 7) + 7) % 7; // distância à passagem mais próxima (múltiplos de 7)
    if (m < 1.7 || m > 5.3) continue;
    if (r() < 0.25) d.cyl('#c9c2b4', 0.5 + r() * 0.3, 0.04, x, 0.01, z);
    else d.sph(['#ffffff', '#ffd54f', '#f48fb1'][Math.floor(r() * 3)], 0.14, 0.14, 0.14, x, 0.08, z, true);
  }
  for (let i = 0; i < 28; i++) {
    const side = i % 2 ? 1 : -1, s = 0.8 + r() * 0.9;
    d.sph(r() < 0.5 ? '#4caf50' : '#66bb6a', s * 1.4, s, s * 1.2, side * (33.6 + r() * 2.2), s * 0.4, -9 + r() * 18);
  }
  planter(d, -32.2, 4.9, 1.2, 1.2, r);
  planter(d, 32.2, 4.9, 1.2, 1.2, r);
  bench(d, -24, 22.9, 0);
  bench(d, 24, 22.9, 0);
  scene.add(d.mesh());

  // relvado onde vai nascer a esplanada (com um cartaz)
  const lot = new B();
  lot.cyl('#8a5a2b', 0.14, 1.6, 0, 0.8, 16.5).rbox('#fff7ef', 2.6, 1.0, 0.12, 0, 1.7, 16.5, 0.6, 0.05);
  for (const [x, z] of [[-10, 15], [9, 18], [-4, 20], [13, 14.5]]) lot.sph('#66bb6a', 1.4, 0.9, 1.2, x, 0.35, z);
  const lotMesh = lot.mesh();
  scene.add(lotMesh);
  return { doorClosed, stairs, lotMesh };
}

// ciclistas na rua
export function makeBike(color, shirt, skin, hair) {
  const b = new B();
  // rodas e quadro
  for (const x of [-0.62, 0.62]) b.torus('#2b2b2b', 0.36, 0.05, x, 0.4, 0).cyl('#b0bec5', 0.1, 0.08, x, 0.4, 0, 0.1, HP);
  b.box(color, 0.9, 0.07, 0.07, 0.02, 0.72, 0, 0, 0, 0.5).box(color, 0.75, 0.07, 0.07, -0.2, 0.62, 0, 0, 0, -0.55).box(color, 0.7, 0.07, 0.07, 0.3, 0.9, 0).box(color, 0.07, 0.6, 0.07, 0.6, 0.72, 0, 0, 0, 0.25);
  b.rbox('#3b2a1a', 0.3, 0.07, 0.16, -0.08, 0.98, 0, 0, 0.03).box('#3b2a1a', 0.07, 0.07, 0.5, 0.68, 1.06, 0);
  b.rbox('#a9744a', 0.34, 0.26, 0.4, -0.72, 0.92, 0, 0, 0.05).sph('#c98a45', 0.3, 0.16, 0.2, -0.72, 1.08, 0, true);
  // ciclista
  b.cap('#3d4a66', 0.17, 0.55, 0.0, 0.72, 0.14, 0, 0.5).cap('#3d4a66', 0.17, 0.55, 0.05, 0.7, -0.14, 0, -0.2);
  b.cap(shirt, 0.42, 0.7, 0.05, 1.32, 0, 0, -0.35).cap(shirt, 0.13, 0.5, 0.4, 1.3, 0.2, 0, -1.1).cap(shirt, 0.13, 0.5, 0.4, 1.3, -0.2, 0, -1.1);
  b.sph(skin, 0.5, 0.48, 0.48, 0.25, 1.86, 0).sph(hair, 0.54, 0.4, 0.54, 0.22, 1.96, 0).sph('#2a2a2a', 0.06, 0.08, 0.05, 0.47, 1.86, 0.12, true).sph('#2a2a2a', 0.06, 0.08, 0.05, 0.47, 1.86, -0.12, true);
  return b.mesh();
}

// ---------- esplanada ----------
export function buildEsplanade(scene) {
  const r = rng(23);
  const deck = woodTex('#d7a86e', '#b98850');
  deck.repeat.set(11, 3);
  plane(scene, 35.4, 9.8, lamb(deck), 0, 0.006, 17.5);
  const b = new B();
  b.rbox('#b98850', 35.8, 0.12, 0.3, 0, 0.03, 12.55).rbox('#b98850', 35.8, 0.12, 0.3, 0, 0.03, 22.45);
  for (const x of [-17.6, 17.6]) {
    planter(b, x, 14.4, 0.9, 3.4, r);
    planter(b, x, 20.4, 0.9, 3.6, r);
    lampPost(b, x, 17.4);
  }
  // bandeirinhas presas a postes
  for (const x of [-17.2, -8.6, 0, 8.6, 17.2]) b.cyl('#eeeeee', 0.1, 3.4, x, 1.7, 22.6);
  const cols = ['#e85d75', '#ffd54f', '#4fc3f7', '#aed581', '#ba68c8'];
  for (let i = 0; i < 43; i++) {
    const x = -17.2 + i * 0.8 + 0.4, sag = Math.sin((((x + 17.2) % 8.6) / 8.6) * Math.PI) * 0.45;
    b.cone(cols[i % cols.length], 0.4, 0.5, x, 3.1 - sag, 22.6, Math.PI, 0, 4);
  }
  const m = b.mesh();
  scene.add(m);
}

// ---------- 1.º andar (terraço sobre os telhados) ----------
export function buildFloor2(scene, oz) {
  const r = rng(41);
  const b = new B();
  b.rbox('#e3d5bd', 64, 1.4, 27.5, 0, -0.72, oz + 2.3, 0, 0.2);
  // muro do fundo com a casinha das escadas
  const wallC = '#d6efe6';
  b.box(wallC, 30.5, 3.0, 0.6, -16.75, 1.5, oz - 9.6).box(wallC, 30.5, 3.0, 0.6, 16.75, 1.5, oz - 9.6).box('#43a08a', 64.2, 0.3, 0.8, 0, 3.1, oz - 9.55);
  b.rbox('#fbf1dc', 4.2, 3.9, 3.4, 0, 1.95, oz - 10.6, 0, 0.12).box('#3b2a1a', 2.6, 2.7, 0.2, 0, 1.35, oz - 8.95);
  b.box('#c75b39', 4.8, 0.25, 2.3, 0, 4.25, oz - 9.8, 0, 0.45).box('#b84f30', 4.8, 0.25, 2.3, 0, 4.25, oz - 11.5, 0, -0.45);
  for (let i = 0; i < 5; i++) b.rbox(i % 2 ? '#f3e4c6' : '#e8d6b0', 2.6, 0.25, 0.5, 0, 0.12 - i * 0.02, oz - 8.6 - i * 0.12, 0, 0.05);
  // parapeito à frente e dos lados
  b.rbox('#f3e4c6', 64, 0.9, 0.5, 0, 0.45, oz + 15.5, 0, 0.1);
  for (const x of [-31.8, 31.8]) b.rbox('#f3e4c6', 0.5, 0.9, 25.6, x, 0.45, oz + 2.9, 0, 0.1);
  for (let x = -30; x <= 30; x += 6) planter(b, x, oz + 14.7, 3.4, 0.8, r);
  // casinhas das escadas dos clientes
  for (const s of [-1, 1]) {
    b.rbox('#fbf1dc', 3.6, 3.6, 4.2, s * 29.6, 1.8, oz + 11.5, 0, 0.12).box('#3b2a1a', 0.2, 2.6, 2.2, s * 27.75, 1.3, oz + 11.5);
    b.box('#c75b39', 2.3, 0.25, 4.8, s * 28.7, 3.95, oz + 11.5, 0, 0, s * 0.45).box('#b84f30', 2.3, 0.25, 4.8, s * 30.5, 3.95, oz + 11.5, 0, 0, -s * 0.45);
  }
  // decoração: vasos grandes, espreguiçadeiras, chapéus de sol
  for (const [x, z] of [[-29, -7.6], [29, -7.6], [-18, -8.2], [18, -8.2], [-7, -8.2], [7, -8.2]]) {
    b.cyl('#c97b4a', 1.0, 1.0, x, 0.5, oz + z, 1.3).sph('#43a047', 1.6, 1.5, 1.6, x, 1.7, oz + z).sph('#66bb6a', 1.0, 1.0, 1.0, x + 0.4, 2.4, oz + z + 0.2);
  }
  parasol(b, -27.5, oz - 2, '#ffa726', '#ffffff');
  parasol(b, 27.5, oz - 2, '#4db6ac', '#ffffff');
  for (const [x, z, c] of [[-28, 1.2, '#ffcc80'], [-26.2, 1.6, '#80cbc4'], [27.6, 1.4, '#f48fb1']]) b.rbox(c, 0.9, 0.16, 2.2, x, 0.4, oz + z, 0.2, 0.06).rbox(c, 0.9, 0.16, 0.9, x - 0.1, 0.75, oz + z - 1.2, 0.2, 0.06, -0.8).box('#8d6e63', 0.8, 0.3, 0.1, x, 0.15, oz + z + 0.7, 0.2).box('#8d6e63', 0.8, 0.3, 0.1, x, 0.15, oz + z - 0.6, 0.2);
  for (const g of [-7, 0, 7]) lampPost(b, g, oz + 7.2);
  scene.add(b.mesh());
  const tiles = tileTex('#f4ede0', '#e7c9a9', '#d8b48e');
  tiles.repeat.set(16, 6.3);
  plane(scene, 63, 25, lamb(tiles), 0, 0, oz + 2.9);
  const strip = tileTex('#dff3ec', '#c5e8dc', '#a9d8c8');
  strip.repeat.set(31, 2.3);
  plane(scene, 62, 4.6, lamb(strip), 0, 0.004, oz + 8.05);
  const cob = cobbleTex();
  cob.repeat.set(30, 1.2);
  plane(scene, 62, 2.3, lamb(cob), 0, 0.006, oz + 11.5);
  // telhados da cidade lá em baixo
  const t = new B();
  const walls = ['#ffe0b2', '#ffccbc', '#fff9c4', '#d1c4e9', '#b3e5fc', '#f8bbd0', '#ffffff'];
  for (let i = 0; i < 90; i++) {
    const x = (r() * 2 - 1) * 95, z = oz - 45 + r() * 110;
    if (Math.abs(x) < 36 && z > oz - 16 && z < oz + 20) continue;
    const wdt = 6 + r() * 6, dep = 6 + r() * 5, top = -3 - r() * 9;
    t.box(walls[Math.floor(r() * walls.length)], wdt, 14, dep, x, top - 7, z);
    t.box(r() < 0.5 ? '#c75b39' : '#b84f30', wdt + 0.6, 0.3, dep * 0.6, x, top + 0.9, z + dep * 0.25, 0, 0.5).box('#a3472b', wdt + 0.6, 0.3, dep * 0.6, x, top + 0.9, z - dep * 0.25, 0, -0.5);
  }
  scene.add(t.mesh(false, false));
}
export function makeCloud(s) {
  const b = new B();
  b.sph('#ffffff', 3 * s, 1.4 * s, 2 * s, 0, 0, 0).sph('#ffffff', 2.2 * s, 1.2 * s, 1.6 * s, 1.6 * s, 0.2 * s, 0.2).sph('#ffffff', 2 * s, 1.0 * s, 1.5 * s, -1.6 * s, 0.1 * s, -0.2).sph('#f4fbff', 1.6 * s, 1.0 * s, 1.3 * s, 0.4 * s, 0.6 * s, 0);
  return b.mesh(false, false);
}

// ---------- bancas de produção ----------
function iconSprite(k, size) {
  const P = PRODUCTS[k];
  const L = makeLabel(128, 128, size);
  L.ctx.beginPath();
  L.ctx.arc(64, 64, 58, 0, 7);
  L.ctx.fillStyle = '#fff7ef';
  L.ctx.fill();
  L.ctx.lineWidth = 8;
  L.ctx.strokeStyle = P.color;
  L.ctx.stroke();
  drawIcon(L.ctx, k, 64, 64, 34);
  L.tex.needsUpdate = true;
  return L.sprite;
}
const BODY = ['#b5694a', '#a1887f', '#c17a55', '#9c6247', '#bf8f5a', '#b0bec5', '#a1887f', '#b0764a'];
function standBody(b, k) {
  const P = PRODUCTS[k], c = P.color;
  switch (P.stand) {
    case 'oven': {
      const body = BODY[k % BODY.length];
      b.rbox(body, 3.4, 1.9, 1.6, 0, 0.95, 0, 0, 0.14).rbox('#5d4037', 3.6, 0.24, 1.8, 0, 1.98, 0, 0, 0.08);
      b.rbox('#3a2a22', 1.6, 1.0, 0.14, -0.6, 0.95, 0.76, 0, 0.3).rbox('#ff9b3d', 1.3, 0.7, 0.1, -0.6, 0.9, 0.81, 0, 0.26).rbox('#ffd27a', 0.8, 0.34, 0.1, -0.6, 0.78, 0.85, 0, 0.14);
      b.rbox('#3a2a22', 1.7, 0.1, 0.3, -0.6, 0.42, 0.9, 0, 0.04);
      b.rbox(c, 0.8, 0.8, 0.12, 1.05, 1.05, 0.78, 0, 0.1).rbox('#fff7ef', 0.5, 0.5, 0.14, 1.05, 1.05, 0.79, 0, 0.1);
      b.cyl('#5d4037', 0.56, 1.5, 1.1, 2.8, -0.2, 0.46).cyl('#3a2a22', 0.7, 0.16, 1.1, 3.6, -0.2);
      for (let i = 0; i < 5; i++) b.box('#8a4a32', 0.5, 0.04, 0.02, -1.3 + i * 0.62, 1.55 + (i % 2) * 0.12, 0.81);
      break;
    }
    case 'machine':
      b.rbox('#a9744a', 3.4, 1.0, 1.6, 0, 0.5, 0, 0, 0.1).rbox('#8a5a2b', 3.5, 0.12, 1.7, 0, 1.06, 0, 0, 0.05);
      b.rbox('#eceff1', 2.2, 1.15, 1.1, -0.35, 1.7, -0.1, 0, 0.16).rbox(c, 2.24, 0.26, 1.14, -0.35, 2.2, -0.1, 0, 0.1).rbox('#37474f', 0.7, 0.36, 0.08, -0.35, 1.9, 0.46, 0, 0.04);
      b.cyl('#90a4ae', 0.12, 0.34, -0.85, 1.38, 0.38).cyl('#90a4ae', 0.12, 0.34, 0.15, 1.38, 0.38).rbox('#546e7a', 1.9, 0.08, 0.5, -0.35, 1.16, 0.42, 0, 0.03);
      b.sph(c, 0.16, 0.16, 0.16, -1.2, 1.9, 0.46, true).sph('#ffd54f', 0.16, 0.16, 0.16, 0.5, 1.9, 0.46, true);
      b.cyl(c, 0.5, 0.75, 1.25, 1.5, 0, 0.42).cyl('#fff7ef', 0.44, 0.06, 1.25, 1.9, 0).cyl('#ffffff', 0.26, 0.2, 0.2, 2.42, -0.2, 0.3).cyl('#ffffff', 0.26, 0.2, -0.3, 2.42, -0.2, 0.3).cyl('#ffffff', 0.26, 0.2, -0.8, 2.42, -0.2, 0.3);
      break;
    case 'fridge':
      b.rbox('#ffffff', 3.4, 1.15, 1.6, 0, 0.58, 0, 0, 0.14).rbox(c, 3.44, 0.22, 1.64, 0, 0.3, 0, 0, 0.06).rbox('#bfe6f7', 3.2, 0.5, 1.4, 0, 1.38, 0, 0, 0.2);
      ['#f8bbd0', '#b2dfdb', '#fff59d', '#d7ccc8', '#ce93d8'].forEach((cc, i) => b.sph(cc, 0.5, 0.42, 0.5, -1.2 + i * 0.6, 1.7, -0.1));
      b.rbox('#e2a85a', 0.5, 0.6, 0.5, 1.2, 2.0, -0.4, 0, 0.1);
      break;
    default:
      b.rbox('#b0bec5', 3.4, 1.0, 1.6, 0, 0.5, 0, 0, 0.1).rbox(c, 3.44, 0.22, 1.64, 0, 0.3, 0, 0, 0.06).rbox('#37474f', 3.5, 0.12, 1.7, 0, 1.06, 0, 0, 0.05);
      b.cyl('#212121', 0.8, 0.06, -0.9, 1.15, 0).cyl('#546e7a', 0.9, 0.14, -0.9, 1.22, 0, 1.0).rbox('#546e7a', 0.7, 0.07, 0.12, -0.2, 1.27, 0.3, 0.5, 0.03);
      b.cyl('#212121', 0.8, 0.06, 0.8, 1.15, 0).cyl('#eceff1', 0.62, 0.46, 0.8, 1.36, 0).cyl('#cfd8dc', 0.66, 0.05, 0.8, 1.61, 0);
  }
}
export function makeStation(k, withAwning = true) {
  const P = PRODUCTS[k], c = P.color;
  const g = new THREE.Group();
  const b = new B();
  standBody(b, k);
  if (withAwning) {
    for (let i = 0; i < 7; i++) {
      const x = -1.68 + i * 0.56, col = i % 2 ? '#ffffff' : c;
      b.box(col, 0.57, 0.1, 1.75, x, 2.72, 1.22, 0, 0.2).cyl(col, 0.56, 0.1, x, 2.5, 2.07, 0.56, HP);
    }
    b.cyl('#f5f5f5', 0.1, 2.6, -1.85, 1.3, 2.0).cyl('#f5f5f5', 0.1, 2.6, 1.85, 1.3, 2.0).box('#f5f5f5', 3.8, 0.1, 0.1, 0, 2.6, 2.0);
  }
  // tabuleiro
  b.rbox('#dfe5e8', 2.7, 0.12, 1.05, 0, 0.74, 1.35, 0, 0.05).box('#90a4ae', 0.12, 0.7, 0.12, -1.2, 0.35, 1.75).box('#90a4ae', 0.12, 0.7, 0.12, 1.2, 0.35, 1.75).box('#90a4ae', 0.12, 0.7, 0.12, -1.2, 0.35, 0.95).box('#90a4ae', 0.12, 0.7, 0.12, 1.2, 0.35, 0.95);
  g.add(b.mesh());
  const pileGroup = new THREE.Group();
  pileGroup.position.set(0, 0.8, 1.35);
  g.add(pileGroup);
  const sign = iconSprite(k, 1.5);
  sign.position.set(0, withAwning ? 4.3 : 3.0, 0);
  g.add(sign);
  return { group: g, pileGroup };
}
export function makeCounter(k) {
  const c = PRODUCTS[k].color;
  const g = new THREE.Group();
  const b = new B();
  b.rbox('#fffaf3', 4.0, 1.0, 1.2, 0, 0.5, 0, 0, 0.1).rbox(c, 4.04, 0.26, 1.24, 0, 0.4, 0, 0, 0.06).rbox('#b07a4a', 4.3, 0.14, 1.45, 0, 1.07, 0, 0, 0.06);
  for (let i = 0; i < 7; i++) b.cyl(i % 2 ? '#ffffff' : c, 0.6, 0.06, -1.8 + i * 0.6, 0.98, 0.7, 0.6, HP);
  b.rbox('#455a64', 0.62, 0.36, 0.5, 1.6, 1.32, 0, 0, 0.08).rbox('#90caf9', 0.46, 0.3, 0.06, 1.6, 1.68, -0.18, 0, 0.03, -0.25).rbox('#37474f', 0.5, 0.05, 0.3, 1.6, 1.16, 0.3, 0, 0.02);
  g.add(b.mesh());
  const stockGroup = new THREE.Group();
  stockGroup.position.set(0, 1.14, 0);
  g.add(stockGroup);
  return { group: g, stockGroup };
}
export function makeCashTile() {
  return new B().rbox('#2f6b3a', 1.9, 0.06, 1.9, 0, 0.02, 0, 0, 0.03).rbox('#3d8a4b', 1.6, 0.07, 1.6, 0, 0.025, 0, 0, 0.03).mesh(false);
}
const billGeo = new B().rbox('#4caf50', 0.5, 0.09, 0.3, 0, 0, 0, 0, 0.03).box('#a5d6a7', 0.16, 0.095, 0.16, 0, 0, 0).geometry();
export function makeBill() {
  const m = new THREE.Mesh(billGeo, MAT);
  return m;
}
export function makeTable(i) {
  const g = new THREE.Group();
  const cloth = ['#fffaf3', '#ffe0e6', '#e0f2f1', '#fff3c4'][i % 4];
  const b = new B();
  b.cyl('#8a5a2b', 0.9, 0.06, 0, 0.03, 0).cyl('#8a5a2b', 0.18, 0.75, 0, 0.4, 0).cyl(cloth, 1.6, 0.1, 0, 0.8, 0, 1.6, 0, 0, 20).cyl(cloth, 1.66, 0.22, 0, 0.66, 0, 1.6, 0, 0, 20);
  b.rbox('#b07a4a', 0.64, 0.1, 0.64, 0, 0.47, -1.15, 0, 0.04).rbox('#b07a4a', 0.64, 0.8, 0.1, 0, 0.9, -1.45, 0, 0.04);
  for (const [x, z] of [[-0.26, -0.9], [0.26, -0.9], [-0.26, -1.4], [0.26, -1.4]]) b.box('#8a5a2b', 0.09, 0.45, 0.09, x, 0.22, z);
  b.cyl('#43a047', 0.16, 0.2, -0.5, 0.95, -0.35, 0.12).sph('#f06292', 0.17, 0.17, 0.17, -0.5, 1.13, -0.35, true);
  g.add(b.mesh());
  const itemsGroup = new THREE.Group();
  itemsGroup.position.set(-0.1, 0.86, 0.2);
  const cashGroup = new THREE.Group();
  cashGroup.position.set(0.42, 0.9, -0.25);
  g.add(itemsGroup, cashGroup);
  return { group: g, itemsGroup, cashGroup };
}
export function makeBin() {
  const g = new THREE.Group();
  g.add(new B().cyl('#5c8a6a', 0.7, 0.95, 0, 0.475, 0, 0.86).cyl('#3f6b4d', 0.94, 0.1, 0, 0.97, 0).cyl('#22302a', 0.7, 0.02, 0, 1.03, 0).rbox('#fff7ef', 0.4, 0.3, 0.04, 0, 0.55, 0.4, 0, 0.02).mesh());
  return g;
}
