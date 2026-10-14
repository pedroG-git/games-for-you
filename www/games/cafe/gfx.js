// Ferramentas gráficas: geometria fundida com cores por vértice (poucas draw calls),
// caixas arredondadas, etiquetas em sprites e texturas de canvas.
import * as THREE from '../../shared/vendor/three/three.module.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';

export { THREE };
export const MAT = new THREE.MeshLambertMaterial({ vertexColors: true });

const cache = new Map();
function cached(key, make) {
  let g = cache.get(key);
  if (!g) {
    g = make();
    if (g.index) g = g.toNonIndexed();
    cache.set(key, g);
  }
  return g;
}
const r2 = (v) => Math.round(v * 100) / 100;
const G = {
  box: () => cached('box', () => new THREE.BoxGeometry(1, 1, 1)),
  rbox: (w, h, d, r) => cached(`rb${r2(w)},${r2(h)},${r2(d)},${r2(r)}`, () => new RoundedBoxGeometry(w, h, d, 1, r)),
  sph: (lo) => cached('sph' + (lo ? 1 : 0), () => new THREE.SphereGeometry(0.5, lo ? 8 : 14, lo ? 6 : 10)),
  cyl: (ratio, seg) => cached(`cy${r2(ratio)},${seg}`, () => new THREE.CylinderGeometry(0.5 * ratio, 0.5, 1, seg)),
  cone: (seg) => cached('co' + seg, () => new THREE.ConeGeometry(0.5, 1, seg)),
  cap: (d, h) => cached(`ca${r2(d)},${r2(h)}`, () => new THREE.CapsuleGeometry(d / 2, Math.max(0.01, h - d), 3, 10)),
  torus: (R, r, arc) => cached(`to${r2(R)},${r2(r)},${r2(arc)}`, () => new THREE.TorusGeometry(R, r, 7, arc < 6 ? 9 : 14, arc)),
};

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();

// Construtor de malhas: junta várias formas coloridas numa única geometria.
export class B {
  constructor() {
    this.chunks = [];
    this.count = 0;
  }
  geo(g, color, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
    _e.set(rx, ry, rz);
    _q.setFromEuler(_e);
    _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
    const t = g.clone().applyMatrix4(_m);
    _c.set(color);
    this.chunks.push({ P: t.attributes.position.array, N: t.attributes.normal.array, r: _c.r, g: _c.g, b: _c.b });
    this.count += t.attributes.position.count;
    return this;
  }
  box(color, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0) {
    return this.geo(G.box(), color, x, y, z, w, h, d, rx, ry, rz);
  }
  rbox(color, w, h, d, x, y, z, ry = 0, r, rx = 0, rz = 0) {
    const rad = Math.min(r === undefined ? Math.min(w, h, d) * 0.25 : r, Math.min(w, h, d) / 2);
    return this.geo(G.rbox(w, h, d, rad), color, x, y, z, 1, 1, 1, rx, ry, rz);
  }
  sph(color, sx, sy, sz, x, y, z, lo = false) {
    return this.geo(G.sph(lo), color, x, y, z, sx, sy, sz);
  }
  // cilindro: d = diâmetro da base, dTop = diâmetro do topo
  cyl(color, d, h, x, y, z, dTop = d, rx = 0, rz = 0, seg = 14) {
    return this.geo(G.cyl(d ? dTop / d : 1, seg), color, x, y, z, d, h, d, rx, 0, rz);
  }
  cone(color, d, h, x, y, z, rx = 0, rz = 0, seg = 12) {
    return this.geo(G.cone(seg), color, x, y, z, d, h, d, rx, 0, rz);
  }
  cap(color, d, h, x, y, z, rx = 0, rz = 0) {
    return this.geo(G.cap(d, h), color, x, y, z, 1, 1, 1, rx, 0, rz);
  }
  torus(color, R, r, x, y, z, rx = 0, arc = Math.PI * 2, sx = 1, sy = 1, sz = 1, ry = 0) {
    return this.geo(G.torus(R, r, arc), color, x, y, z, sx, sy, sz, rx, ry, 0);
  }
  geometry() {
    const n = this.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
    let o = 0;
    for (const c of this.chunks) {
      pos.set(c.P, o);
      nor.set(c.N, o);
      for (let i = 0; i < c.P.length; i += 3) {
        col[o + i] = c.r;
        col[o + i + 1] = c.g;
        col[o + i + 2] = c.b;
      }
      o += c.P.length;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return geo;
  }
  mesh(cast = true, receive = true) {
    const m = new THREE.Mesh(this.geometry(), MAT);
    m.castShadow = cast;
    m.receiveShadow = receive;
    return m;
  }
}

// sombra redonda barata (modo de gráficos baixos)
export const blobMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false });
const blobGeo = new THREE.CircleGeometry(0.5, 18);
export function blobShadow(r) {
  const m = new THREE.Mesh(blobGeo, blobMat);
  m.rotation.x = -Math.PI / 2;
  m.scale.set(r * 2, r * 2, 1);
  m.position.y = 0.02;
  return m;
}

export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
export function makeLabel(w, h, worldH) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  const sprite = new THREE.Sprite(m);
  sprite.scale.set((worldH * w) / h, worldH, 1);
  sprite.renderOrder = 10;
  return { sprite, ctx: c.getContext('2d'), tex, w, h };
}
export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
export function nameTag(text, color = '#ffffff') {
  const L = makeLabel(320, 64, 0.5);
  const ctx = L.ctx;
  ctx.font = 'bold 34px system-ui, sans-serif';
  const tw = Math.min(304, ctx.measureText(text).width + 28);
  rr(ctx, (320 - tw) / 2, 8, tw, 48, 24);
  ctx.fillStyle = 'rgba(40,30,30,0.72)';
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 160, 33, 290);
  L.tex.needsUpdate = true;
  return L.sprite;
}
export function disposeTree(obj) {
  obj.traverse((o) => {
    if (o.isMesh && o.material === MAT && o.userData.own) o.geometry.dispose();
    if (o.isSprite) {
      if (o.material.map) o.material.map.dispose();
      o.material.dispose();
    }
  });
}
