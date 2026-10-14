import { THREE, B, MAT, blobShadow } from './gfx.js';

// ---------- produtos ----------
// Índices estáveis (a gravação guarda-os): 0-7 balcões do rés-do-chão, 8 e 13 pratos da cozinha, 9-12 balcões do 1.º andar.
export const PRODUCTS = [
  { id: 'pao', name: 'Pão', price: 5, cost: 0, cashier: 50, interval: 1.1, h: 0.25, color: '#c98a45', stand: 'oven' },
  { id: 'cafe', name: 'Café', price: 8, cost: 60, cashier: 120, interval: 1.3, h: 0.25, color: '#6d4c41', stand: 'machine' },
  { id: 'croissant', name: 'Croissant vegano', price: 13, cost: 250, cashier: 300, interval: 1.5, h: 0.2, color: '#e0a040', stand: 'oven' },
  { id: 'biscoito', name: 'Bolacha de aveia', price: 20, cost: 700, cashier: 700, interval: 1.7, h: 0.13, color: '#d9a066', stand: 'oven' },
  { id: 'nata', name: 'Nata vegana', price: 30, cost: 1800, cashier: 1500, interval: 1.9, h: 0.18, color: '#e9c46a', stand: 'oven' },
  { id: 'donut', name: 'Donut vegano', price: 44, cost: 4500, cashier: 3500, interval: 2.1, h: 0.19, color: '#f48fb1', stand: 'griddle' },
  { id: 'cha', name: 'Chá', price: 64, cost: 11000, cashier: 8000, interval: 2.3, h: 0.26, color: '#4db6ac', stand: 'machine' },
  { id: 'bolo', name: 'Bolo de cenoura', price: 95, cost: 26000, cashier: 18000, interval: 2.5, h: 0.3, color: '#ef8f3a', stand: 'oven' },
  { id: 'tosta', name: 'Tosta de abacate', price: 40, kitchen: true, interval: 1.6, h: 0.17, color: '#7cb342', stand: 'griddle' },
  { id: 'sumo', name: 'Sumo de laranja', price: 140, cost: 0, cashier: 100000, interval: 2.0, h: 0.3, color: '#ffa726', floor: 1, stand: 'machine' },
  { id: 'gelado', name: 'Gelado vegano', price: 200, cost: 300000, cashier: 250000, interval: 2.2, h: 0.3, color: '#f8bbd0', floor: 1, stand: 'fridge' },
  { id: 'panqueca', name: 'Panquecas', price: 290, cost: 800000, cashier: 600000, interval: 2.4, h: 0.2, color: '#e2a85a', floor: 1, stand: 'griddle' },
  { id: 'batido', name: 'Batido de fruta', price: 420, cost: 2000000, cashier: 1500000, interval: 2.6, h: 0.34, color: '#ec407a', floor: 1, stand: 'machine' },
  { id: 'hamburguer', name: 'Hambúrguer de grão', price: 90, kitchen: true, interval: 2.2, h: 0.3, color: '#8d6e63', stand: 'griddle' },
];

const HP = Math.PI / 2;
function productShape(id) {
  const b = new B();
  switch (id) {
    case 'pao':
      b.sph('#c98a45', 0.62, 0.3, 0.38, 0, 0.14, 0);
      for (const x of [-0.14, 0, 0.14]) b.rbox('#f0d29a', 0.05, 0.04, 0.2, x, 0.27, 0, 0.35);
      break;
    case 'cafe':
      b.cyl('#f1f1f1', 0.3, 0.03, 0, 0.015, 0, 0.46).cyl('#ffffff', 0.24, 0.2, 0, 0.13, 0, 0.34).cyl('#5a3620', 0.3, 0.02, 0, 0.225, 0).torus('#ffffff', 0.07, 0.025, 0.2, 0.13, 0);
      break;
    case 'croissant':
      b.torus('#e0a040', 0.16, 0.085, 0, 0.09, 0.07, -HP, Math.PI, 1.25, 1.25, 1.25).sph('#d99536', 0.26, 0.2, 0.22, 0, 0.1, -0.1).sph('#c98530', 0.1, 0.1, 0.1, -0.2, 0.08, 0.07, true).sph('#c98530', 0.1, 0.1, 0.1, 0.2, 0.08, 0.07, true);
      break;
    case 'biscoito':
      b.cyl('#d9a066', 0.5, 0.1, 0, 0.05, 0);
      for (const [x, z] of [[0.1, 0.08], [-0.12, -0.02], [0.03, -0.14], [-0.05, 0.15]]) b.sph('#4a2c17', 0.09, 0.05, 0.09, x, 0.105, z, true);
      break;
    case 'nata':
      b.cyl('#d9a441', 0.3, 0.15, 0, 0.075, 0, 0.42).cyl('#f7d95c', 0.36, 0.02, 0, 0.155, 0).cyl('#8a4b16', 0.13, 0.022, 0.04, 0.157, 0.03).cyl('#a5611f', 0.08, 0.022, -0.08, 0.157, -0.05);
      break;
    case 'donut':
      b.torus('#e2a85a', 0.15, 0.085, 0, 0.085, 0, -HP).torus('#f48fb1', 0.15, 0.075, 0, 0.11, 0, -HP, Math.PI * 2, 1, 1, 0.75);
      ['#ffffff', '#ffd54f', '#4fc3f7', '#ffffff', '#aed581', '#ffd54f'].forEach((c, i) => b.box(c, 0.05, 0.02, 0.02, Math.cos(i * 1.05) * 0.15, 0.178, Math.sin(i * 1.05) * 0.15, i * 0.9));
      break;
    case 'cha':
      b.cyl('#4db6ac', 0.26, 0.24, 0, 0.12, 0, 0.32).cyl('#b5651d', 0.27, 0.02, 0, 0.235, 0).torus('#4db6ac', 0.08, 0.028, 0.2, 0.12, 0);
      break;
    case 'bolo':
      b.cyl('#d98a3d', 0.44, 0.2, 0, 0.1, 0).cyl('#fff6e9', 0.46, 0.07, 0, 0.225, 0).cone('#f57c00', 0.1, 0.16, 0, 0.32, 0, Math.PI).sph('#43a047', 0.08, 0.05, 0.08, 0, 0.26, 0, true);
      break;
    case 'tosta':
      b.rbox('#d9a066', 0.5, 0.09, 0.4, 0, 0.045, 0).rbox('#8bc34a', 0.42, 0.05, 0.32, 0, 0.11, 0).sph('#e53935', 0.1, 0.06, 0.1, -0.1, 0.14, 0.05, true).sph('#e53935', 0.1, 0.06, 0.1, 0.12, 0.14, -0.05, true);
      break;
    case 'sumo':
      b.cyl('#ffa726', 0.22, 0.26, 0, 0.13, 0, 0.3).cyl('#fff3e0', 0.31, 0.03, 0, 0.27, 0).cyl('#ff9800', 0.17, 0.03, 0.13, 0.29, 0, 0.17, 0, HP).cyl('#ffe0b2', 0.11, 0.035, 0.13, 0.29, 0, 0.11, 0, HP);
      break;
    case 'gelado':
      b.cyl('#fff3e0', 0.24, 0.14, 0, 0.07, 0, 0.34).sph('#f8bbd0', 0.25, 0.22, 0.25, -0.07, 0.2, 0).sph('#b2dfdb', 0.25, 0.22, 0.25, 0.09, 0.2, 0.03).rbox('#e2a85a', 0.04, 0.16, 0.1, 0.02, 0.27, -0.08);
      break;
    case 'panqueca':
      b.cyl('#e2a85a', 0.46, 0.05, 0, 0.03, 0).cyl('#d99a48', 0.45, 0.05, 0.01, 0.085, 0).cyl('#e2a85a', 0.46, 0.05, -0.01, 0.14, 0.01).cyl('#8d4a1f', 0.3, 0.02, 0, 0.172, 0).sph('#d32f2f', 0.1, 0.09, 0.1, 0.03, 0.2, 0, true);
      break;
    case 'batido':
      b.cyl('#f06292', 0.2, 0.28, 0, 0.14, 0, 0.28).sph('#ffffff', 0.27, 0.14, 0.27, 0, 0.29, 0).sph('#d32f2f', 0.08, 0.08, 0.08, 0.02, 0.37, 0, true);
      break;
    case 'hamburguer':
      b.cyl('#d9a066', 0.44, 0.08, 0, 0.04, 0).cyl('#5d4037', 0.47, 0.07, 0, 0.115, 0).cyl('#7cb342', 0.52, 0.03, 0, 0.165, 0, 0.5, 0, 0, 9).cyl('#e53935', 0.42, 0.03, 0, 0.195, 0).sph('#d9a066', 0.46, 0.22, 0.46, 0, 0.215, 0);
      for (const [x, z] of [[0.08, 0.05], [-0.1, 0.02], [0, -0.1]]) b.sph('#fff3e0', 0.04, 0.02, 0.06, x, 0.325, z, true);
      break;
  }
  return b.geometry();
}
const productGeo = [];
export function makeProduct(i) {
  const g = productGeo[i] || (productGeo[i] = productShape(PRODUCTS[i].id));
  const m = new THREE.Mesh(g, MAT);
  m.receiveShadow = false;
  m.castShadow = false;
  return m;
}

// ícone 2D de cada produto (balões, placas, objetivos)
export function drawIcon(ctx, i, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineWidth = Math.max(2, r * 0.12);
  ctx.strokeStyle = '#3b2a1a';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const fs = (c) => {
    ctx.fillStyle = c;
    ctx.fill();
    ctx.stroke();
  };
  const cup = (body, liquid) => {
    ctx.beginPath();
    ctx.arc(r * 0.62, 0.1 * r, r * 0.3, -1.2, 1.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, -r * 0.5);
    ctx.lineTo(r * 0.6, -r * 0.5);
    ctx.lineTo(r * 0.42, r * 0.75);
    ctx.lineTo(-r * 0.52, r * 0.75);
    ctx.closePath();
    fs(body);
    ctx.beginPath();
    ctx.ellipse(-r * 0.05, -r * 0.5, r * 0.65, r * 0.18, 0, 0, Math.PI * 2);
    fs(liquid);
  };
  const glass = (liquid) => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, -r * 0.8);
    ctx.lineTo(r * 0.55, -r * 0.8);
    ctx.lineTo(r * 0.38, r * 0.85);
    ctx.lineTo(-r * 0.38, r * 0.85);
    ctx.closePath();
    fs(liquid);
  };
  const rect = (x, y, w, h, rad) => {
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  };
  const dots = (c, pts, s) => {
    ctx.fillStyle = c;
    for (const [x, y] of pts) {
      ctx.beginPath();
      ctx.arc(x * r, y * r, r * s, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  switch (PRODUCTS[i].id) {
    case 'pao':
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.6, 0, 0, Math.PI * 2);
      fs('#c98a45');
      ctx.strokeStyle = '#f5deb0';
      for (const dx of [-0.4, 0, 0.4]) {
        ctx.beginPath();
        ctx.moveTo((dx - 0.1) * r, -0.25 * r);
        ctx.lineTo((dx + 0.1) * r, 0.2 * r);
        ctx.stroke();
      }
      break;
    case 'cafe': cup('#ffffff', '#5a3620'); break;
    case 'cha': cup('#4db6ac', '#b5651d'); break;
    case 'croissant':
      ctx.beginPath();
      ctx.arc(0, r * 0.35, r * 0.75, Math.PI * 1.05, Math.PI * 1.95);
      ctx.lineWidth = r * 0.75;
      ctx.stroke();
      ctx.lineWidth = r * 0.52;
      ctx.strokeStyle = '#e0a040';
      ctx.stroke();
      break;
    case 'biscoito':
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
      fs('#d9a066');
      dots('#4a2c17', [[-0.35, -0.25], [0.3, -0.35], [0.1, 0.2], [-0.3, 0.4], [0.5, 0.3]], 0.13);
      break;
    case 'nata':
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
      fs('#d9a441');
      dots('#f7d95c', [[0, 0]], 0.62);
      ctx.fillStyle = '#8a4b16';
      ctx.beginPath();
      ctx.ellipse(r * 0.12, -r * 0.08, r * 0.25, r * 0.16, 0.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'donut':
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
      fs('#f48fb1');
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
      fs('#ffffff');
      break;
    case 'tosta':
      rect(-r * 0.9, -r * 0.6, r * 1.8, r * 1.3, r * 0.25);
      fs('#d9a066');
      rect(-r * 0.62, -r * 0.36, r * 1.24, r * 0.8, r * 0.2);
      ctx.fillStyle = '#8bc34a';
      ctx.fill();
      dots('#e53935', [[-0.25, -0.05], [0.25, 0.1]], 0.14);
      break;
    case 'bolo':
      ctx.beginPath();
      ctx.rect(-r * 0.8, -r * 0.15, r * 1.6, r * 0.9);
      fs('#d98a3d');
      ctx.beginPath();
      ctx.rect(-r * 0.85, -r * 0.45, r * 1.7, r * 0.35);
      fs('#fff6e9');
      ctx.beginPath();
      ctx.arc(0, -r * 0.65, r * 0.22, 0, Math.PI * 2);
      fs('#f57c00');
      break;
    case 'sumo':
      glass('#ffa726');
      ctx.beginPath();
      ctx.arc(r * 0.5, -r * 0.8, r * 0.34, 0, Math.PI * 2);
      fs('#ff9800');
      break;
    case 'batido':
      glass('#f06292');
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.8, r * 0.6, r * 0.28, 0, 0, Math.PI * 2);
      fs('#ffffff');
      dots('#d32f2f', [[0.1, -1.05]], 0.16);
      break;
    case 'gelado':
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, -r * 0.05);
      ctx.lineTo(r * 0.5, -r * 0.05);
      ctx.lineTo(0, r * 0.95);
      ctx.closePath();
      fs('#e2a85a');
      ctx.beginPath();
      ctx.arc(0, -r * 0.35, r * 0.55, 0, Math.PI * 2);
      fs('#f8bbd0');
      break;
    case 'panqueca':
      for (const y of [0.45, 0.15, -0.15]) {
        ctx.beginPath();
        ctx.ellipse(0, y * r, r * 0.9, r * 0.3, 0, 0, Math.PI * 2);
        fs('#e2a85a');
      }
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.2, r * 0.5, r * 0.15, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#8d4a1f';
      ctx.fill();
      dots('#d32f2f', [[0.05, -0.4]], 0.16);
      break;
    case 'hamburguer':
      rect(-r * 0.85, r * 0.25, r * 1.7, r * 0.45, r * 0.15);
      fs('#d9a066');
      rect(-r * 0.92, -r * 0.05, r * 1.84, r * 0.34, r * 0.12);
      fs('#5d4037');
      rect(-r * 0.98, -r * 0.2, r * 1.96, r * 0.2, r * 0.08);
      fs('#7cb342');
      ctx.beginPath();
      ctx.moveTo(-r * 0.85, -r * 0.2);
      ctx.quadraticCurveTo(0, -r * 1.25, r * 0.85, -r * 0.2);
      ctx.closePath();
      fs('#d9a066');
      break;
  }
  ctx.restore();
}

// bandeirinha simples por nacionalidade
export function drawFlag(ctx, nat, x, y, w, h) {
  ctx.save();
  ctx.translate(x, y);
  const band = (cols, vertical, sizes) => {
    let o = 0;
    cols.forEach((c, i) => {
      const f = sizes ? sizes[i] : 1 / cols.length;
      ctx.fillStyle = c;
      if (vertical) ctx.fillRect(o * w, 0, f * w + 0.5, h);
      else ctx.fillRect(0, o * h, w, f * h + 0.5);
      o += f;
    });
  };
  switch (nat) {
    case 'fr': band(['#1f4fa8', '#ffffff', '#e03131'], true); break;
    case 'de': band(['#1a1a1a', '#d92b2b', '#f7c600'], false); break;
    case 'es': band(['#c8102e', '#f7c600', '#c8102e'], false, [0.25, 0.5, 0.25]); break;
    case 'uk':
      ctx.fillStyle = '#1f3f8f';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = h * 0.22;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, h); ctx.moveTo(w, 0); ctx.lineTo(0, h); ctx.stroke();
      ctx.lineWidth = h * 0.36;
      ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
      ctx.strokeStyle = '#d92b2b';
      ctx.lineWidth = h * 0.2;
      ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
      break;
    default:
      band(['#1e7b3c', '#d92b2b'], true, [0.4, 0.6]);
      ctx.fillStyle = '#f7c600';
      ctx.beginPath(); ctx.arc(w * 0.4, h / 2, h * 0.24, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = '#3b2a1a';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, w, h);
  ctx.restore();
}

// ---------- pessoas (estilo boneco: cabeça grande, corpo arredondado) ----------
// o: { skin, shirt, pants, hair, style: long|pony|bun|bob|short|bald|hat|chef, dress, apron, hatColor, glasses }
export function makePerson(o) {
  const g = new THREE.Group();
  const skin = o.skin, shirt = o.shirt, pants = o.pants || '#3d4a66';
  const own = (m) => {
    m.userData.own = true;
    return m;
  };
  const leg = () => own(new B().cap(o.dress ? skin : pants, 0.21, 0.5, 0, -0.22, 0).rbox('#4a342a', 0.23, 0.13, 0.32, 0, -0.44, 0.04).mesh());
  const legL = leg(), legR = leg();
  legL.position.set(-0.13, 0.52, 0);
  legR.position.set(0.13, 0.52, 0);
  const u = new B();
  if (o.dress) u.cyl(shirt, 0.92, 0.6, 0, 0.74, 0, 0.48).cap(shirt, 0.52, 0.56, 0, 1.06, 0);
  else u.cap(shirt, 0.58, 0.8, 0, 0.9, 0);
  if (o.apron) {
    u.rbox(o.apron, 0.4, 0.46, 0.07, 0, 0.82, o.dress ? 0.3 : 0.27);
    u.box(o.apron, 0.06, 0.3, 0.04, -0.14, 1.12, 0.24).box(o.apron, 0.06, 0.3, 0.04, 0.14, 1.12, 0.24);
  }
  // cabeça
  u.sph(skin, 0.64, 0.62, 0.62, 0, 1.55, 0);
  u.sph('#2a2a2a', 0.075, 0.1, 0.05, -0.12, 1.53, 0.285, true).sph('#2a2a2a', 0.075, 0.1, 0.05, 0.12, 1.53, 0.285, true);
  u.sph('#f29a9a', 0.1, 0.06, 0.04, -0.21, 1.44, 0.26, true).sph('#f29a9a', 0.1, 0.06, 0.04, 0.21, 1.44, 0.26, true);
  u.sph('#b5524f', 0.09, 0.035, 0.03, 0, 1.4, 0.3, true);
  const hc = o.hair, st = o.style || 'short';
  if (st === 'hat') {
    u.sph(o.hatColor || '#e85d75', 0.68, 0.44, 0.68, 0, 1.74, -0.02).rbox(o.hatColor || '#e85d75', 0.44, 0.06, 0.3, 0, 1.7, 0.34);
    u.sph(hc, 0.66, 0.3, 0.5, 0, 1.5, -0.14);
  } else if (st !== 'bald') {
    u.sph(hc, 0.7, 0.54, 0.7, 0, 1.69, -0.06);
    if (st === 'long') u.rbox(hc, 0.62, 0.78, 0.26, 0, 1.32, -0.25).sph(hc, 0.2, 0.34, 0.2, -0.3, 1.42, 0.02).sph(hc, 0.2, 0.34, 0.2, 0.3, 1.42, 0.02);
    if (st === 'pony') u.sph(hc, 0.22, 0.22, 0.22, 0, 1.78, -0.38).cap(hc, 0.2, 0.6, 0, 1.42, -0.46, 0.25);
    if (st === 'bun') u.sph(hc, 0.32, 0.3, 0.32, 0, 1.98, -0.14);
    if (st === 'bob') u.sph(hc, 0.74, 0.5, 0.56, 0, 1.47, -0.16);
  }
  if (st === 'chef' || o.chef) u.cyl('#ffffff', 0.5, 0.26, 0, 1.96, 0).sph('#ffffff', 0.66, 0.36, 0.66, 0, 2.14, 0);
  if (o.glasses) u.torus('#333333', 0.08, 0.015, -0.12, 1.53, 0.31).torus('#333333', 0.08, 0.015, 0.12, 1.53, 0.31);
  const upper = own(u.mesh());
  const arm = () => own(new B().cap(shirt, 0.16, 0.44, 0, -0.18, 0).sph(skin, 0.16, 0.16, 0.16, 0, -0.44, 0, true).mesh());
  const armL = arm(), armR = arm();
  armL.position.set(-0.36, 1.16, 0);
  armR.position.set(0.36, 1.16, 0);
  armL.rotation.z = -0.14;
  armR.rotation.z = 0.14;
  const body = new THREE.Group();
  body.add(upper, armL, armR);
  g.add(legL, legR, body, blobShadow(0.45));
  g.userData = { legL, legR, armL, armR, upper: body, ph: Math.random() * 6, sit: false };
  return g;
}
export function animPerson(g, moving, dt) {
  const u = g.userData;
  if (u.sit) return;
  if (moving) {
    u.ph += dt * 11;
    const s = Math.sin(u.ph);
    u.legL.rotation.x = s * 0.7;
    u.legR.rotation.x = -s * 0.7;
    u.armL.rotation.x = -s * 0.55;
    u.armR.rotation.x = s * 0.55;
    u.upper.position.y = Math.abs(s) * 0.05;
  } else {
    u.legL.rotation.x *= 0.7;
    u.legR.rotation.x *= 0.7;
    u.armL.rotation.x *= 0.7;
    u.armR.rotation.x *= 0.7;
    u.upper.position.y *= 0.7;
  }
}
export function sitPerson(g, sit) {
  const u = g.userData;
  u.sit = sit;
  u.legL.rotation.x = u.legR.rotation.x = sit ? -1.45 : 0;
  u.armL.rotation.x = u.armR.rotation.x = sit ? -0.5 : 0;
  u.upper.position.y = 0;
  u.upper.rotation.x = 0;
}

// ---------- gatas ----------
export function makeCat(color, patch, stripes) {
  const g = new THREE.Group();
  const own = (m) => {
    m.userData.own = true;
    return m;
  };
  const dark = '#' + new THREE.Color(color).multiplyScalar(0.6).getHexString();
  const b = new B().sph(color, 0.4, 0.36, 0.66, 0, 0.3, 0).sph(patch, 0.26, 0.24, 0.24, 0, 0.25, 0.2);
  if (stripes) for (const z of [-0.15, 0, 0.15]) b.rbox(dark, 0.3, 0.05, 0.07, 0, 0.47, z, 0, 0.02);
  for (const [x, z] of [[-0.11, 0.2], [0.11, 0.2], [-0.11, -0.2], [0.11, -0.2]]) b.cap(patch, 0.1, 0.22, x, 0.11, z);
  const body = own(b.mesh());
  const hb = new B().sph(color, 0.38, 0.34, 0.34, 0, 0, 0);
  hb.cone(color, 0.14, 0.18, -0.11, 0.2, 0).cone(color, 0.14, 0.18, 0.11, 0.2, 0).cone('#f6a6b2', 0.07, 0.1, -0.11, 0.19, 0.03).cone('#f6a6b2', 0.07, 0.1, 0.11, 0.19, 0.03);
  hb.sph(patch, 0.2, 0.14, 0.12, 0, -0.06, 0.13).sph('#f28b9a', 0.05, 0.035, 0.03, 0, -0.02, 0.19, true);
  hb.sph('#2f4a34', 0.065, 0.08, 0.04, -0.09, 0.04, 0.15, true).sph('#2f4a34', 0.065, 0.08, 0.04, 0.09, 0.04, 0.15, true);
  const head = own(hb.mesh());
  head.position.set(0, 0.5, 0.34);
  const tail = own(new B().cap(color, 0.085, 0.5, 0, 0.22, 0).sph(stripes ? dark : color, 0.1, 0.12, 0.1, 0, 0.46, 0, true).mesh());
  tail.position.set(0, 0.36, -0.3);
  tail.rotation.x = -0.6;
  g.add(body, head, tail, blobShadow(0.4));
  g.userData = { body, head, tail, ph: Math.random() * 6 };
  return g;
}
