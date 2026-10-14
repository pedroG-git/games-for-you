// "Anúncios" jogáveis: demos dos próximos jogos. Cada um é um mini-jogo 2D num ecrã por cima do café.
// 0: Bolhas da Bruxa (bubble shooter, Halloween aconchegante)
// 1: Mahjong de Papel (pares de peças, desenhado à mão)
// 2: Doce Lar (combina 3, aconchegante)

const TAU = Math.PI * 2;
const rnd = (n) => Math.floor(Math.random() * n);
function rrect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

// ============================================================ 0. Bolhas da Bruxa
class Bubbles {
  constructor(W, H, sfx) {
    this.W = W; this.H = H; this.sfx = sfx;
    this.cols = 8;
    this.r = W / (this.cols * 2 + 1);
    this.rowH = this.r * 1.732;
    this.top = 16;
    this.rows = Math.floor((H - 150 - this.top) / this.rowH);
    this.grid = [];
    for (let r = 0; r < this.rows; r++) this.grid.push(new Array(this.cols).fill(-1));
    for (let r = 0; r < 5; r++) for (let c = 0; c < this.cols; c++) this.grid[r][c] = rnd(4);
    this.initial = 5 * this.cols;
    this.shots = 18;
    this.cur = rnd(4); this.next = rnd(4);
    this.sx = W / 2; this.sy = H - 78;
    this.aim = -Math.PI / 2;
    this.shot = null; this.popped = 0; this.parts = []; this.sparks = []; this.texts = []; this.done = false; this.t = 0; this.shake = 0; this.recoil = 0;
    this.stars = Array.from({ length: 40 }, () => [Math.random() * W, Math.random() * H * 0.7, Math.random() * 1.6 + 0.4]);
    this.target = this.aim; this.raw = this.aim; this.gx = W / 2; this.gy = this.top; this.glow = [];
    this.buildSweep();
    this.path = this.trace(this.aim);
  }
  get score() { return Math.min(1, this.popped / (this.initial * 0.7)); }
  hud() { return `Tiros: ${this.shots}\nRebentadas: ${this.popped}`; }
  result() { return `Rebentaste ${this.popped} bolhas!`; }
  cell(r, c) { return [this.r + c * 2 * this.r + (r % 2 ? this.r : 0), this.top + this.r + r * this.rowH]; }
  neigh(r, c) {
    const o = r % 2 ? [[0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1]] : [[0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0]];
    return o.map(([dr, dc]) => [r + dr, c + dc]).filter(([a, b]) => a >= 0 && a < this.rows && b >= 0 && b < this.cols);
  }
  // Calcula o caminho exato da bolha (com ricochete nas paredes) e a casa onde vai ficar.
  // A mira desenha este caminho e o tiro segue-o ponto por ponto, por isso batem sempre certo.
  trace(angle, fast) {
    let x = this.sx, y = this.sy, vx = Math.cos(angle), vy = Math.sin(angle);
    const pts = [[x, y]], step = fast ? 6 : 3, hitD = this.r * 1.7;
    const filled = [];
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) if (this.grid[r][c] >= 0) filled.push(this.cell(r, c));
    for (let i = 0; i < 3000; i++) {
      x += vx * step; y += vy * step;
      if (x < this.r) { x = this.r; vx = Math.abs(vx); }
      if (x > this.W - this.r) { x = this.W - this.r; vx = -Math.abs(vx); }
      if (!fast) pts.push([x, y]);
      if (y <= this.top + this.r) break;
      let hit = false;
      for (const [bx, by] of filled) if (Math.abs(bx - x) < hitD && Math.abs(by - y) < hitD && Math.hypot(bx - x, by - y) < hitD) { hit = true; break; }
      if (hit) break;
    }
    let best = null, bd = 1e9;
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
      if (this.grid[r][c] >= 0) continue;
      const [cx, cy] = this.cell(r, c), d = Math.hypot(cx - x, cy - y);
      if (d < bd) { bd = d; best = [r, c]; }
    }
    return { pts, cell: best };
  }
  // grupo que rebentaria se a bolha atual ficasse na casa (r, c)
  group(r0, c0, k) {
    const seen = new Set([r0 * 100 + c0]), q = [[r0, c0]];
    while (q.length) {
      const [r, c] = q.pop();
      for (const [a, b] of this.neigh(r, c)) if (this.grid[a][b] === k && !seen.has(a * 100 + b)) { seen.add(a * 100 + b); q.push([a, b]); }
    }
    return seen;
  }
  // Tabela de mira: para cada ângulo (de meio em meio grau) guarda a casa onde a bolha ia parar e se fazia grupo.
  // Serve para a mira "agarrar" suavemente às casas e ajudar quando o tiro passa a rasar um grupo.
  buildSweep() {
    this.A0 = -Math.PI + 0.2; this.AS = 0.0087;
    this.sweep = [];
    for (let a = this.A0; a <= -0.2; a += this.AS) {
      const cell = this.trace(a, true).cell;
      const id = cell ? cell[0] * 100 + cell[1] : -1;
      this.sweep.push({ a, id, hit: cell ? this.group(cell[0], cell[1], this.cur).size >= 3 : false });
    }
  }
  setAim(direct) {
    const n = this.sweep.length, i0 = Math.max(0, Math.min(n - 1, Math.round((direct - this.A0) / this.AS)));
    let pick = i0;
    if (!this.sweep[i0].hit) { // ajuda: se a menos de ~5 graus houver um tiro que faz grupo, a mira encosta-se a ele
      for (let d = 1; d <= 11; d++) {
        if (i0 - d >= 0 && this.sweep[i0 - d].hit) { pick = i0 - d; break; }
        if (i0 + d < n && this.sweep[i0 + d].hit) { pick = i0 + d; break; }
      }
    }
    // centra na faixa de ângulos que vai dar à mesma casa, para o dedo a tremer não mudar o alvo
    let lo = pick, hi = pick;
    const id = this.sweep[pick].id;
    while (lo > 0 && this.sweep[lo - 1].id === id) lo--;
    while (hi < n - 1 && this.sweep[hi + 1].id === id) hi++;
    const centre = this.sweep[Math.round((lo + hi) / 2)].a;
    // dentro da mesma casa segue o dedo a 60%, para continuar a sentir-se livre
    this.target = pick === i0 ? centre + (direct - centre) * 0.6 : centre;
  }
  // Mira por arrasto: a linha não salta para o dedo. Arrastar para os lados roda-a devagar
  // (o ecrã inteiro de um lado ao outro dá cerca de 75 graus), em qualquer sítio do ecrã.
  down(x) { this.aiming = true; this.lastX = x; }
  move(x) {
    if (!this.aiming) return;
    this.raw = Math.max(this.A0, Math.min(-0.2, this.raw + (x - this.lastX) * (1.3 / this.W)));
    this.lastX = x;
    this.setAim(this.raw);
  }
  up() {
    this.aiming = false;
    if (this.shot || this.shots <= 0 || this.done) return;
    this.aim = this.target; // dispara exatamente para o alvo, mesmo que a linha ainda estivesse a deslizar
    this.path = this.trace(this.aim);
    if (!this.path.cell) return;
    this.shot = { pts: this.path.pts, cell: this.path.cell, d: 0, k: this.cur, x: this.sx, y: this.sy, trail: [] };
    this.cur = this.next; this.next = rnd(4); this.shots--;
    this.recoil = 1;
    this.sfx.pick();
  }
  land() {
    const s = this.shot;
    this.shot = null;
    const [r0, c0] = s.cell;
    this.grid[r0][c0] = s.k;
    const [lx, ly] = this.cell(r0, c0);
    const seen = new Set([r0 * 100 + c0]), q = [[r0, c0]];
    while (q.length) {
      const [r, c] = q.pop();
      for (const [a, b] of this.neigh(r, c)) if (this.grid[a][b] === s.k && !seen.has(a * 100 + b)) { seen.add(a * 100 + b); q.push([a, b]); }
    }
    if (seen.size >= 3) {
      const before = this.popped;
      let i = 0;
      for (const id of seen) this.pop(Math.floor(id / 100), id % 100, false, i++ * 0.035);
      const ok = new Set(), q2 = [];
      for (let c = 0; c < this.cols; c++) if (this.grid[0][c] >= 0) { ok.add(c); q2.push([0, c]); }
      while (q2.length) {
        const [r, c] = q2.pop();
        for (const [a, b] of this.neigh(r, c)) if (this.grid[a][b] >= 0 && !ok.has(a * 100 + b)) { ok.add(a * 100 + b); q2.push([a, b]); }
      }
      for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) if (this.grid[r][c] >= 0 && !ok.has(r * 100 + c)) this.pop(r, c, true, 0);
      const n = this.popped - before;
      this.texts.push({ x: lx, y: ly, text: n >= 8 ? `Uau! +${n}` : `+${n}`, t: 0 });
      this.shake = Math.min(0.3, 0.1 + n * 0.02);
      this.sfx.sale();
      if (n >= 6) this.sfx.unlock();
    } else {
      this.bump = { r: r0, c: c0, t: 0.18 };
      this.sfx.drop();
    }
    if (!this.grid.some((row) => row.some((v) => v >= 0))) this.done = true;
    if (r0 >= this.rows - 1) this.done = true;
    this.buildSweep();
    this.path = this.trace(this.aim);
  }
  pop(r, c, fall, delay) {
    const [x, y] = this.cell(r, c), k = this.grid[r][c];
    this.parts.push({ x, y, k, t: -delay, fall, vy: fall ? -120 : 0, vx: fall ? (Math.random() - 0.5) * 120 : 0 });
    const col = ['#f28c28', '#f4f1ea', '#8e5bd1', '#b6f25c'][k];
    for (let i = 0; i < 6; i++) { const a = Math.random() * TAU, sp = 80 + Math.random() * 160; this.sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: -delay, col }); }
    this.grid[r][c] = -1;
    this.popped++;
  }
  update(dt) {
    this.t += dt;
    this.shake = Math.max(0, this.shake - dt);
    this.recoil = Math.max(0, this.recoil - dt * 6);
    if (this.bump) { this.bump.t -= dt; if (this.bump.t <= 0) this.bump = null; }
    if (!this.shot && !this.done) {
      // a linha desliza suavemente até ao alvo em vez de saltar
      this.aim += (this.target - this.aim) * Math.min(1, dt * 14);
      this.path = this.trace(this.aim);
      if (this.path.cell) {
        const [tx, ty] = this.cell(this.path.cell[0], this.path.cell[1]);
        const f = Math.min(1, dt * 22);
        this.gx += (tx - this.gx) * f; this.gy += (ty - this.gy) * f;
        const grp = this.group(this.path.cell[0], this.path.cell[1], this.cur);
        this.glow = grp.size >= 3 ? [...grp].filter((id) => id !== this.path.cell[0] * 100 + this.path.cell[1]) : [];
      }
    }
    const s = this.shot;
    if (s) {
      s.d += this.H * 1.9 * dt; // distância percorrida ao longo do caminho calculado
      const i = Math.min(s.pts.length - 1, Math.floor(s.d / 3));
      [s.x, s.y] = s.pts[i];
      s.trail.push([s.x, s.y]);
      if (s.trail.length > 7) s.trail.shift();
      if (i >= s.pts.length - 1) this.land();
    } else if (this.shots <= 0 && !this.parts.length) this.done = true;
    for (const p of this.parts) { p.t += dt; if (p.t > 0 && p.fall) { p.vy += 1500 * dt; p.y += p.vy * dt; p.x += p.vx * dt; } }
    this.parts = this.parts.filter((p) => p.t < (p.fall ? 1.1 : 0.22));
    for (const p of this.sparks) { p.t += dt; if (p.t > 0) { p.vy += 500 * dt; p.x += p.vx * dt; p.y += p.vy * dt; } }
    this.sparks = this.sparks.filter((p) => p.t < 0.5);
    for (const p of this.texts) p.t += dt;
    this.texts = this.texts.filter((p) => p.t < 0.9);
  }
  bubble(c, k, x, y, r, a = 1) {
    c.save();
    c.globalAlpha = a;
    c.translate(x, y);
    const col = ['#f28c28', '#f4f1ea', '#8e5bd1', '#2f2a35'][k];
    c.beginPath(); c.arc(0, 0, r * 0.93, 0, TAU);
    c.fillStyle = col; c.fill();
    c.lineWidth = r * 0.09; c.strokeStyle = 'rgba(255,236,200,.75)'; c.stroke();
    c.fillStyle = k === 1 ? '#2b1b3d' : k === 3 ? '#b6f25c' : k === 2 ? '#ffe36e' : '#3b1d08';
    if (k === 0) { // abóbora
      c.strokeStyle = '#c96a12'; c.lineWidth = r * 0.07;
      for (const s of [-0.45, 0.45]) { c.beginPath(); c.ellipse(0, 0, r * Math.abs(s), r * 0.86, 0, 0, TAU); c.stroke(); }
      c.fillStyle = '#5b8c2a'; c.fillRect(-r * 0.1, -r * 1.02, r * 0.2, r * 0.26);
      c.fillStyle = '#3b1d08';
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * r * 0.42, -r * 0.05); c.lineTo(s * r * 0.16, -r * 0.05); c.lineTo(s * r * 0.3, -r * 0.34); c.fill(); }
      c.beginPath(); c.arc(0, r * 0.2, r * 0.38, 0.1, Math.PI - 0.1); c.fill();
    } else if (k === 1) { // fantasma
      for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * r * 0.3, -r * 0.15, r * 0.13, r * 0.2, 0, 0, TAU); c.fill(); }
      c.beginPath(); c.ellipse(0, r * 0.32, r * 0.14, r * 0.2, 0, 0, TAU); c.fill();
      c.fillStyle = '#f7b6c2'; for (const s of [-1, 1]) { c.beginPath(); c.arc(s * r * 0.52, r * 0.12, r * 0.1, 0, TAU); c.fill(); }
    } else if (k === 2) { // morcego
      c.fillStyle = '#6b3fb0';
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * r * 0.75, -r * 0.5); c.lineTo(s * r * 0.3, -r * 1.12); c.lineTo(s * r * 0.15, -r * 0.6); c.fill(); }
      c.fillStyle = '#ffe36e'; for (const s of [-1, 1]) { c.beginPath(); c.arc(s * r * 0.28, -r * 0.1, r * 0.15, 0, TAU); c.fill(); }
      c.fillStyle = '#fff'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * r * 0.2, r * 0.25); c.lineTo(s * r * 0.06, r * 0.25); c.lineTo(s * r * 0.13, r * 0.5); c.fill(); }
    } else { // gata preta
      c.fillStyle = '#2f2a35';
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * r * 0.8, -r * 0.45); c.lineTo(s * r * 0.55, -r * 1.12); c.lineTo(s * r * 0.2, -r * 0.75); c.fill(); }
      c.fillStyle = '#b6f25c'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * r * 0.3, -r * 0.1, r * 0.17, r * 0.13, 0, 0, TAU); c.fill(); }
      c.fillStyle = '#2f2a35'; for (const s of [-1, 1]) c.fillRect(s * r * 0.3 - r * 0.03, -r * 0.22, r * 0.06, r * 0.24);
      c.fillStyle = '#f7a1b5'; c.beginPath(); c.moveTo(-r * 0.09, r * 0.18); c.lineTo(r * 0.09, r * 0.18); c.lineTo(0, r * 0.3); c.fill();
    }
    c.restore();
  }
  draw(c) {
    const { W, H } = this;
    c.save();
    if (this.shake > 0) c.translate((Math.random() - 0.5) * this.shake * 30, (Math.random() - 0.5) * this.shake * 30);
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#241733'); g.addColorStop(0.7, '#4a2545'); g.addColorStop(1, '#6b3320');
    c.fillStyle = g; c.fillRect(-20, -20, W + 40, H + 40);
    c.fillStyle = '#ffe9b0';
    for (const [x, y, s] of this.stars) { c.globalAlpha = 0.4 + 0.4 * Math.sin(this.t * 2 + x); c.fillRect(x, y, s, s); }
    c.globalAlpha = 1;
    c.beginPath(); c.arc(W * 0.82, H * 0.5, 34, 0, TAU); c.fillStyle = '#ffe9b0'; c.fill();
    c.beginPath(); c.arc(W * 0.82 + 12, H * 0.5 - 8, 30, 0, TAU); c.fillStyle = '#3a1f3d'; c.fill();
    c.fillStyle = '#1b1024';
    c.fillRect(W * 0.08, H - 200, 70, 70);
    c.beginPath(); c.moveTo(W * 0.08 - 10, H - 200); c.lineTo(W * 0.08 + 35, H - 245); c.lineTo(W * 0.08 + 80, H - 200); c.fill();
    c.fillStyle = '#ffc857'; c.fillRect(W * 0.08 + 14, H - 180, 16, 20); c.fillRect(W * 0.08 + 40, H - 180, 16, 20);
    c.fillStyle = '#1b1024'; c.fillRect(-20, H - 130, W + 40, 150);
    for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(20 + i * (W / 5.5), H - 128, 16, 12, 0, 0, TAU); c.fillStyle = i % 2 ? '#c96a12' : '#f28c28'; c.fill(); }
    for (let r = 0; r < this.rows; r++) for (let cc = 0; cc < this.cols; cc++) if (this.grid[r][cc] >= 0) {
      const [x, y] = this.cell(r, cc);
      const b = this.bump && this.bump.r === r && this.bump.c === cc ? 1 + this.bump.t * 1.2 : 1;
      this.bubble(c, this.grid[r][cc], x, y, this.r * b);
    }
    // mira: linha contínua com brilho, pontos a marchar, bolha "fantasma" e destaque do grupo que vai rebentar
    if (!this.shot && this.shots > 0 && !this.done) {
      const { pts, cell } = this.path;
      const hit = this.glow.length > 0;
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 9);
      for (const id of this.glow) {
        const [x, y] = this.cell(Math.floor(id / 100), id % 100);
        c.strokeStyle = `rgba(255,236,150,${0.55 + 0.4 * pulse})`; c.lineWidth = 3.5;
        c.beginPath(); c.arc(x, y, this.r * (1.0 + 0.06 * pulse), 0, TAU); c.stroke();
      }
      c.save();
      c.lineCap = 'round'; c.lineJoin = 'round';
      c.shadowColor = hit ? '#ffd76a' : '#ffe9b0'; c.shadowBlur = hit ? 14 : 8;
      c.strokeStyle = hit ? 'rgba(255,215,106,.55)' : 'rgba(255,233,176,.32)'; c.lineWidth = hit ? 5 : 4;
      c.beginPath();
      for (let i = 6; i < pts.length - 3; i += 2) { if (i === 6) c.moveTo(pts[i][0], pts[i][1]); else c.lineTo(pts[i][0], pts[i][1]); }
      c.stroke();
      c.restore();
      const gap = 9, off = (this.t * 16) % gap;
      for (let i = 8 + off; i < pts.length - 4; i += gap) {
        const p = pts[Math.floor(i)], f = i / pts.length;
        c.globalAlpha = 0.95 - f * 0.4;
        c.fillStyle = hit ? '#ffe38a' : '#ffe9b0';
        c.beginPath(); c.arc(p[0], p[1], 4.4 - f * 1.4, 0, TAU); c.fill();
      }
      c.globalAlpha = 1;
      if (cell) {
        this.bubble(c, this.cur, this.gx, this.gy, this.r * (hit ? 1 + 0.05 * pulse : 1), hit ? 0.7 : 0.4);
        c.strokeStyle = hit ? '#ffd76a' : '#ffe9b0'; c.lineWidth = hit ? 3.5 : 2.5; c.setLineDash([6, 5]); c.lineDashOffset = -this.t * 30;
        c.beginPath(); c.arc(this.gx, this.gy, this.r * 1.04, 0, TAU); c.stroke(); c.setLineDash([]);
      }
    }
    // caldeirão (com recuo ao disparar)
    const ry = this.recoil * 7;
    c.fillStyle = '#120b18'; c.beginPath(); c.ellipse(this.sx, this.sy + 22 + ry, 46, 30, 0, 0, TAU); c.fill();
    c.fillStyle = '#7bd65a'; c.beginPath(); c.ellipse(this.sx, this.sy + 6 + ry, 38, 10, 0, 0, TAU); c.fill();
    for (let i = 0; i < 3; i++) { const p = (this.t * 0.8 + i / 3) % 1; c.globalAlpha = 0.5 * (1 - p); c.beginPath(); c.arc(this.sx - 20 + i * 20, this.sy + 2 - p * 26, 4 + p * 3, 0, TAU); c.fill(); }
    c.globalAlpha = 1;
    if (this.shot) {
      this.shot.trail.forEach(([x, y], i) => this.bubble(c, this.shot.k, x, y, this.r * (0.5 + i * 0.06), 0.08 + i * 0.05));
      this.bubble(c, this.shot.k, this.shot.x, this.shot.y, this.r);
    } else if (this.shots > 0) this.bubble(c, this.cur, this.sx, this.sy + ry, this.r);
    this.bubble(c, this.next, this.sx + 74, this.sy + 26, this.r * 0.6);
    c.fillStyle = 'rgba(255,233,176,.85)'; c.font = '600 13px system-ui, sans-serif'; c.textAlign = 'center';
    c.fillText('Arrasta para os lados para apontar · larga para disparar', W / 2, H - 10);
    for (const p of this.parts) if (p.t > 0) this.bubble(c, p.k, p.x, p.y, this.r * (p.fall ? 1 : 1 + p.t * 3), Math.max(0, 1 - p.t / (p.fall ? 1.1 : 0.22)));
      else this.bubble(c, p.k, p.x, p.y, this.r);
    for (const p of this.sparks) if (p.t > 0) { c.globalAlpha = Math.max(0, 1 - p.t / 0.5); c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, 3.5, 0, TAU); c.fill(); }
    c.globalAlpha = 1;
    c.font = 'bold 26px Georgia, serif'; c.textAlign = 'center';
    for (const p of this.texts) { c.globalAlpha = Math.max(0, 1 - p.t / 0.9); c.fillStyle = '#ffe9b0'; c.strokeStyle = '#241733'; c.lineWidth = 5; c.strokeText(p.text, p.x, p.y - 20 - p.t * 50); c.fillText(p.text, p.x, p.y - 20 - p.t * 50); }
    c.globalAlpha = 1;
    c.restore();
  }
}

// ============================================================ 1. Mahjong de Papel
const MJ_COLS = ['#e8a013', '#d6455d', '#6b6b78', '#4f9a3f', '#d9a514', '#8a5a2b', '#d667a6', '#3f6fb5', '#7a52b3', '#5aa7c7', '#e0703a', '#c0392b', '#3f6fb5', '#d6455d', '#4f9a3f', '#3f6fb5', '#d6455d', '#4f9a3f'];
class Mahjong {
  // Mahjong solitário com as regras normais:
  //  - 72 peças numa pirâmide de 4 andares; 18 desenhos, 4 peças de cada (como no jogo verdadeiro)
  //  - uma peça está livre se não tiver nada por cima e tiver o lado esquerdo ou o direito solto
  //  - a mesa é distribuída "de trás para a frente", por isso tem sempre solução, mas depois não muda:
  //    não há dicas nem baralhar. Se ela ficar sem jogadas, pode desfazer e tentar outro caminho.
  constructor(W, H, sfx) {
    this.W = W; this.H = H; this.sfx = sfx;
    this.tw = Math.min((W - 30) / 8, 50); this.th = this.tw * 1.3;
    this.dz = 6; // espessura de cada peça / desvio por camada
    this.ox = (W - this.tw * 8) / 2 + 8; this.oy = Math.max(92, (H - this.th * 5) / 2 - 22);
    this.tiles = [];
    for (let y = 0; y < 5; y++) for (let x = y === 0 || y === 4 ? 1 : 0; x < (y === 0 || y === 4 ? 7 : 8); x++) this.tiles.push({ x, y, z: 0 });
    for (let z = 1; z <= 3; z++) for (let y = 1; y < 4; y++) for (let x = z; x < 8 - z; x++) this.tiles.push({ x, y, z });
    this.tiles.forEach((t, i) => { t.gone = false; t.seed = i * 7 + 3; });
    this.total = this.tiles.length / 2;
    this.deal();
    this.sel = null; this.pairs = 0; this.time = 0; this.done = false; this.t = 0; this.parts = []; this.msg = null; this.undo = []; this.stuck = false; this.hint = null;
    // ferramentas para quando fica presa: desfazer (sem limite), dica (3) e baralhar (2)
    const bw = Math.min(118, (W - 40) / 3), by = this.oy + this.th * 5 + 44;
    this.btns = [{ id: 'undo', label: '↶ Desfazer' }, { id: 'hint', label: 'Dica', n: 3 }, { id: 'shuffle', label: 'Baralhar', n: 2 }];
    this.btns.forEach((b, i) => Object.assign(b, { x: W / 2 - (bw * 3 + 16) / 2 + i * (bw + 8), y: by, w: bw, h: 38 }));
    this.btn = this.btns[0];
    this.hintT = 0;
  }
  get score() { return this.pairs / this.total; }
  hud() { const s = Math.floor(this.time); return `Pares: ${this.pairs}/${this.total}\nTempo: ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
  result() { return this.pairs >= this.total ? 'Limpaste a mesa toda!' : `Fizeste ${this.pairs} de ${this.total} pares.`; }
  live() { return this.tiles.filter((t) => !t.gone); }
  at(x, y, z) { return this.tiles.some((t) => !t.gone && t.z === z && t.x === x && Math.abs(t.y - y) < 0.75); }
  covered(t) { return this.at(t.x, t.y, t.z + 1); }
  free(t) { return !t.gone && !this.covered(t) && (!this.at(t.x - 1, t.y, t.z) || !this.at(t.x + 1, t.y, t.z)); }
  pair() {
    const f = this.live().filter((t) => this.free(t));
    for (let i = 0; i < f.length; i++) for (let j = i + 1; j < f.length; j++) if (f[i].k === f[j].k) return [f[i], f[j]];
    return null;
  }
  // distribui a mesa jogando ao contrário: tira pares de peças livres e dá-lhes o mesmo desenho.
  // Assim existe sempre pelo menos uma ordem que limpa a mesa toda.
  deal() {
    const kinds = [];
    for (let k = 0; k < 18; k++) kinds.push(k, k);
    for (let tries = 0; tries < 300; tries++) {
      for (let i = kinds.length - 1; i > 0; i--) { const j = rnd(i + 1); [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
      this.tiles.forEach((t) => { t.gone = false; t.k = -1; });
      let n = 0, ok = true;
      while (n < kinds.length) {
        const f = this.tiles.filter((t) => this.free(t));
        if (f.length < 2) { ok = false; break; }
        const a = f.splice(rnd(f.length), 1)[0], b = f.splice(rnd(f.length), 1)[0];
        a.k = b.k = kinds[n++];
        a.gone = b.gone = true;
      }
      this.tiles.forEach((t) => (t.gone = false));
      if (ok) return;
    }
  }
  // baralhar: redistribui os desenhos das peças que restam, outra vez de trás para a frente, para continuar a ter solução
  reshuffle() {
    const live = this.live(), count = {};
    for (const t of live) count[t.k] = (count[t.k] || 0) + 1;
    const kinds = [];
    for (const k in count) for (let i = 0; i < count[k] / 2; i++) kinds.push(+k);
    const old = live.map((t) => t.k);
    for (let tries = 0; tries < 300; tries++) {
      for (let i = kinds.length - 1; i > 0; i--) { const j = rnd(i + 1); [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
      let n = 0, ok = true;
      while (n < kinds.length) {
        const f = live.filter((t) => this.free(t));
        if (f.length < 2) { ok = false; break; }
        const a = f.splice(rnd(f.length), 1)[0], b = f.splice(rnd(f.length), 1)[0];
        a.k = b.k = kinds[n++];
        a.gone = b.gone = true;
      }
      live.forEach((t) => (t.gone = false));
      if (ok) return;
    }
    live.forEach((t, i) => (t.k = old[i])); // não deu (posições impossíveis): fica como estava
  }
  pos(t) { return [this.ox + t.x * this.tw - t.z * this.dz, this.oy + t.y * this.th - t.z * this.dz]; }
  down(x, y) {
    if (this.done) return;
    const b = this.btns.find((q) => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h);
    if (b) {
      if (b.id === 'undo') { // desfazer a última jogada
        const last = this.undo.pop();
        if (last) { for (const t of last) t.gone = false; this.pairs--; this.sel = null; this.stuck = false; this.sfx.drop(); }
      } else if (b.id === 'hint' && b.n > 0) { // mostra um par possível durante uns segundos
        const pr = this.pair();
        if (pr) { b.n--; this.hint = pr; this.hintT = 3.5; this.sfx.pick(); }
        else this.msg = { text: 'Não há pares livres: desfaz ou baralha', a: 2.2 };
      } else if (b.id === 'shuffle' && b.n > 0 && this.live().length > 2) { // volta a distribuir as peças que restam (com solução)
        b.n--; this.reshuffle(); this.sel = null; this.undo = []; this.stuck = !this.pair(); this.hint = null;
        this.msg = { text: 'Peças baralhadas!', a: 1.8 }; this.sfx.unlock();
      } else if (b.id !== 'undo') this.sfx.full();
      return;
    }
    const hit = this.live().filter((t) => { const [px, py] = this.pos(t); return x >= px && x <= px + this.tw && y >= py && y <= py + this.th; }).sort((a, c) => c.z - a.z)[0];
    if (!hit) return;
    if (!this.free(hit)) {
      this.shake = { t: hit, a: 0.3 };
      this.msg = { text: this.covered(hit) ? 'Presa: tem uma peça por cima' : 'Presa: tem peças dos dois lados', a: 1.6 };
      this.sfx.full();
      return;
    }
    if (this.sel && this.sel !== hit && this.sel.k === hit.k) {
      for (const t of [this.sel, hit]) {
        t.gone = true;
        const [px, py] = this.pos(t);
        for (let i = 0; i < 7; i++) this.parts.push({ x: px + this.tw / 2, y: py + this.th / 2, vx: (Math.random() - 0.5) * 260, vy: -80 - Math.random() * 200, k: t.k, t: 0, star: i > 0 });
      }
      this.undo.push([this.sel, hit]);
      this.sel = null; this.pairs++; this.sfx.sale();
      if (!this.live().length) this.done = true;
      else if (!this.pair()) { this.stuck = true; this.sfx.full(); }
    } else { this.sel = hit; this.sfx.pick(); }
  }
  move() {}
  up() {}
  update(dt) {
    this.t += dt;
    if (!this.done && !this.stuck) this.time += dt;
    if (this.shake) { this.shake.a -= dt; if (this.shake.a <= 0) this.shake = null; }
    if (this.msg) { this.msg.a -= dt; if (this.msg.a <= 0) this.msg = null; }
    if (this.hintT > 0) { this.hintT -= dt; if (this.hintT <= 0 || (this.hint && this.hint.some((t) => t.gone))) { this.hint = null; this.hintT = 0; } }
    for (const p of this.parts) { p.t += dt; p.vy += 600 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    this.parts = this.parts.filter((p) => p.t < 0.7);
  }
  // traço a lápis: linha tremida, desenhada duas vezes
  wob(c, pts, seed, close = true) {
    for (let pass = 0; pass < 2; pass++) {
      c.beginPath();
      pts.forEach(([x, y], i) => {
        const j = (n) => (Math.sin(seed * 12.9898 + i * 78.233 + pass * 37.7 + n) * 43758.5453) % 1;
        const px = x + j(1) * 1.5, py = y + j(2) * 1.5;
        if (i) c.lineTo(px, py); else c.moveTo(px, py);
      });
      if (close) c.closePath();
      c.stroke();
    }
  }
  // pinta uma zona a lápis de cor (riscos inclinados dentro do recorte atual)
  crayon(c, x, y, w, h, color, step = 5) {
    c.save();
    c.strokeStyle = color; c.lineWidth = 3; c.lineCap = 'round';
    for (let i = -h; i < w; i += step) { c.beginPath(); c.moveTo(x + i, y + h); c.lineTo(x + i + h, y); c.stroke(); }
    c.restore();
  }
  doodle(c, k, x, y, s) {
    c.save();
    c.translate(x, y);
    c.lineWidth = 2.6; c.lineCap = 'round'; c.lineJoin = 'round';
    const cols = MJ_COLS;
    c.strokeStyle = cols[k]; c.fillStyle = cols[k] + '70';
    const circ = (r, f) => { c.beginPath(); c.arc(0, 0, r, 0.2, TAU + 0.5); if (f) c.fill(); c.stroke(); };
    if (k >= 12) { // naipe dos círculos: 1 a 6 bolas, como nas peças de mahjong verdadeiras
      const n = k - 11, lay = [[[0, 0]], [[-0.25, -0.3], [0.25, 0.3]], [[-0.3, -0.42], [0, 0], [0.3, 0.42]], [[-0.25, -0.3], [0.25, -0.3], [-0.25, 0.3], [0.25, 0.3]], [[-0.3, -0.42], [0.3, -0.42], [0, 0], [-0.3, 0.42], [0.3, 0.42]], [[-0.25, -0.5], [0.25, -0.5], [-0.25, 0], [0.25, 0], [-0.25, 0.5], [0.25, 0.5]]][n - 1];
      for (const [dx, dy] of lay) { c.beginPath(); c.arc(dx * s * 1.3, dy * s * 1.3, n === 1 ? s * 0.36 : s * 0.17, 0.3, TAU + 0.7); c.fill(); c.stroke(); }
      c.restore();
      return;
    }
    switch (k) {
      case 0: circ(s * 0.3, true); for (let i = 0; i < 8; i++) { const a = i * 0.785; c.beginPath(); c.moveTo(Math.cos(a) * s * 0.42, Math.sin(a) * s * 0.42); c.lineTo(Math.cos(a) * s * 0.6, Math.sin(a) * s * 0.6); c.stroke(); } break;
      case 1: c.beginPath(); c.moveTo(0, s * 0.5); c.bezierCurveTo(-s * 0.9, -s * 0.1, -s * 0.35, -s * 0.7, 0, -s * 0.2); c.bezierCurveTo(s * 0.35, -s * 0.7, s * 0.9, -s * 0.1, 0, s * 0.5); c.fill(); c.stroke(); break;
      case 2: circ(s * 0.42, true); c.beginPath(); c.moveTo(-s * 0.38, -s * 0.2); c.lineTo(-s * 0.36, -s * 0.62); c.lineTo(-s * 0.1, -s * 0.4); c.moveTo(s * 0.38, -s * 0.2); c.lineTo(s * 0.36, -s * 0.62); c.lineTo(s * 0.1, -s * 0.4); c.stroke();
        c.beginPath(); c.arc(-s * 0.15, -s * 0.03, 2, 0, TAU); c.arc(s * 0.15, -s * 0.03, 2, 0, TAU); c.stroke(); c.beginPath(); c.moveTo(-s * 0.1, s * 0.15); c.lineTo(0, s * 0.22); c.lineTo(s * 0.1, s * 0.15); c.stroke(); break;
      case 3: c.beginPath(); c.moveTo(-s * 0.45, s * 0.45); c.quadraticCurveTo(-s * 0.5, -s * 0.5, s * 0.45, -s * 0.45); c.quadraticCurveTo(s * 0.5, s * 0.5, -s * 0.45, s * 0.45); c.fill(); c.stroke(); c.beginPath(); c.moveTo(-s * 0.45, s * 0.45); c.lineTo(s * 0.3, -s * 0.3); c.stroke(); break;
      case 4: c.beginPath(); for (let i = 0; i < 11; i++) { const a = -Math.PI / 2 + i * 0.628, r = i % 2 ? s * 0.25 : s * 0.58; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.fill(); c.stroke(); break;
      case 5: c.beginPath(); c.moveTo(-s * 0.4, -s * 0.2); c.lineTo(-s * 0.3, s * 0.4); c.lineTo(s * 0.25, s * 0.4); c.lineTo(s * 0.35, -s * 0.2); c.closePath(); c.fill(); c.stroke(); c.beginPath(); c.arc(s * 0.42, s * 0.08, s * 0.16, -1.3, 1.3); c.stroke();
        c.beginPath(); c.moveTo(-s * 0.1, -s * 0.35); c.quadraticCurveTo(-s * 0.25, -s * 0.5, -s * 0.08, -s * 0.65); c.moveTo(s * 0.12, -s * 0.35); c.quadraticCurveTo(-s * 0.02, -s * 0.5, s * 0.14, -s * 0.65); c.stroke(); break;
      case 6: for (let i = 0; i < 5; i++) { const a = i * 1.2566; c.beginPath(); c.arc(Math.cos(a) * s * 0.32, Math.sin(a) * s * 0.32, s * 0.2, 0, TAU); c.fill(); c.stroke(); } c.strokeStyle = '#e8a013'; c.fillStyle = '#ffd54f'; circ(s * 0.13, true); break;
      case 7: c.beginPath(); c.arc(0, 0, s * 0.5, 0.6, TAU - 0.9); c.quadraticCurveTo(-s * 0.05, -s * 0.05, s * 0.41, s * 0.28); c.fill(); c.stroke(); break;
      case 8: // chave
        c.beginPath(); c.arc(-s * 0.25, -s * 0.2, s * 0.22, 0, TAU); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(-s * 0.1, -s * 0.05); c.lineTo(s * 0.42, s * 0.47); c.moveTo(s * 0.22, s * 0.27); c.lineTo(s * 0.36, s * 0.13); c.moveTo(s * 0.34, s * 0.39); c.lineTo(s * 0.48, s * 0.25); c.stroke(); break;
      case 9: // nuvem
        c.beginPath(); c.arc(-s * 0.22, s * 0.08, s * 0.22, 1.2, 4.6); c.arc(-s * 0.02, -s * 0.16, s * 0.26, 3.4, 6.0); c.arc(s * 0.26, s * 0.06, s * 0.22, 4.6, 1.9); c.closePath(); c.fill(); c.stroke();
        for (const dx of [-0.2, 0.05, 0.3]) { c.beginPath(); c.moveTo(dx * s, s * 0.4); c.lineTo((dx - 0.06) * s, s * 0.56); c.stroke(); } break;
      case 10: // peixe
        c.beginPath(); c.moveTo(-s * 0.5, 0); c.quadraticCurveTo(-s * 0.1, -s * 0.42, s * 0.25, 0); c.quadraticCurveTo(-s * 0.1, s * 0.42, -s * 0.5, 0); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(s * 0.25, 0); c.lineTo(s * 0.52, -s * 0.26); c.lineTo(s * 0.52, s * 0.26); c.closePath(); c.fill(); c.stroke();
        c.beginPath(); c.arc(-s * 0.25, -s * 0.05, 1.8, 0, TAU); c.stroke(); break;
      default: // cerejas
        c.beginPath(); c.arc(-s * 0.22, s * 0.25, s * 0.22, 0, TAU); c.fill(); c.stroke(); c.beginPath(); c.arc(s * 0.25, s * 0.3, s * 0.22, 0, TAU); c.fill(); c.stroke();
        c.strokeStyle = '#4f9a3f'; c.beginPath(); c.moveTo(-s * 0.2, s * 0.05); c.quadraticCurveTo(-s * 0.05, -s * 0.4, s * 0.2, -s * 0.5); c.quadraticCurveTo(s * 0.25, -s * 0.2, s * 0.25, s * 0.1); c.stroke();
    }
    c.restore();
  }
  star(c, x, y, r, col) {
    c.save(); c.translate(x, y); c.strokeStyle = col; c.lineWidth = 2; c.lineCap = 'round';
    for (let i = 0; i < 4; i++) { const a = i * 0.785; c.beginPath(); c.moveTo(Math.cos(a) * r, Math.sin(a) * r); c.lineTo(-Math.cos(a) * r, -Math.sin(a) * r); c.stroke(); }
    c.restore();
  }
  background(c) {
    const { W, H } = this;
    // secretária de madeira com o caderno pousado em cima
    c.fillStyle = '#c99a6b'; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(120,80,40,.25)'; c.lineWidth = 2;
    for (let y = 18; y < H; y += 34) { c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(W * 0.3, y + 6, W * 0.6, y - 6, W, y + 3); c.stroke(); }
    c.save();
    c.translate(W / 2, H / 2); c.rotate(-0.012); c.translate(-W / 2, -H / 2);
    c.fillStyle = 'rgba(60,40,20,.25)'; c.fillRect(13, 15, W - 20, H - 22);
    c.fillStyle = '#fbf6e9'; c.fillRect(8, 8, W - 20, H - 22);
    c.save(); c.beginPath(); c.rect(8, 8, W - 20, H - 22); c.clip();
    c.strokeStyle = 'rgba(90,140,200,.28)'; c.lineWidth = 1;
    for (let y = 36; y < H; y += 26) { c.beginPath(); c.moveTo(8, y); c.lineTo(W, y); c.stroke(); }
    c.strokeStyle = 'rgba(220,90,90,.4)'; c.beginPath(); c.moveTo(40, 0); c.lineTo(40, H); c.stroke();
    // mancha de café
    c.strokeStyle = 'rgba(150,100,50,.22)'; c.lineWidth = 6; c.beginPath(); c.arc(W - 70, H - 96, 38, 0.3, 5.6); c.stroke();
    c.lineWidth = 2; c.beginPath(); c.arc(W - 70, H - 96, 30, 2, 4.4); c.stroke();
    c.restore();
    // bandeirinhas desenhadas no topo
    c.strokeStyle = '#3a3a3a'; c.lineWidth = 1.6;
    const pts = [];
    for (let i = 0; i <= 8; i++) pts.push([20 + (i * (W - 52)) / 8, 30 + Math.sin((i / 8) * Math.PI) * 16]);
    this.wob(c, pts, 77, false);
    const fc = ['#f28c8c', '#f6c453', '#8cc7a1', '#8fb8e8', '#d7a3e0'];
    for (let i = 0; i < 8; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1], mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + 22;
      c.save(); c.beginPath(); c.moveTo(x1 + 3, y1); c.lineTo(x2 - 3, y2); c.lineTo(mx, my); c.closePath(); c.clip();
      this.crayon(c, x1, y1 - 4, x2 - x1, 30, fc[i % 5], 4); c.restore();
      this.wob(c, [[x1 + 3, y1], [x2 - 3, y2], [mx, my]], 80 + i);
    }
    // fita-cola nos cantos, lápis e plantinha
    for (const [x, y, r, col] of [[30, 14, -0.5, '#f6c453'], [W - 44, 14, 0.45, '#8cc7a1']]) {
      c.save(); c.translate(x, y); c.rotate(r); c.globalAlpha = 0.8; c.fillStyle = col; c.fillRect(-26, -9, 52, 18);
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2; for (let i = -22; i < 26; i += 8) { c.beginPath(); c.moveTo(i, -9); c.lineTo(i + 5, 9); c.stroke(); }
      c.restore();
    }
    c.save(); c.translate(64, H - 58); c.rotate(-0.25);
    c.fillStyle = '#f6c453'; c.fillRect(0, -7, 120, 14); c.fillStyle = '#f2a0a0'; c.fillRect(-16, -7, 16, 14);
    c.fillStyle = '#e8cfa6'; c.beginPath(); c.moveTo(120, -7); c.lineTo(142, 0); c.lineTo(120, 7); c.fill();
    c.fillStyle = '#3a3a3a'; c.beginPath(); c.moveTo(134, -3); c.lineTo(142, 0); c.lineTo(134, 3); c.fill();
    c.strokeStyle = '#3a3a3a'; c.lineWidth = 1.5; c.strokeRect(-16, -7, 136, 14);
    c.restore();
    this.doodle(c, 3, W - 46, 96, 20); this.doodle(c, 6, 22, 96, 13); this.doodle(c, 1, W - 34, H - 40, 13);
    c.restore();
  }
  tile(c, t) {
    let [x, y] = this.pos(t);
    const sel = this.sel === t, free = this.free(t);
    const hinted = this.hint && this.hint.includes(t);
    if (this.shake && this.shake.t === t) x += Math.sin(this.t * 60) * 3;
    if (sel) y -= 4;
    if (hinted) y += Math.sin(this.t * 9) * 2.5;
    const w = this.tw - 3, h = this.th - 3, d = this.dz;
    // sombra no papel
    c.fillStyle = 'rgba(70,55,35,.2)';
    c.fillRect(x + d + 3, y + d + 4, w, h);
    // lados da peça, pintados a lápis de cor conforme o andar
    const side = ['#e9b96e', '#7fc4b0', '#e79ab8', '#8fa8e0'][t.z];
    c.fillStyle = '#f1e7cf';
    c.beginPath(); c.moveTo(x + w, y); c.lineTo(x + w + d, y + d); c.lineTo(x + w + d, y + h + d); c.lineTo(x + d, y + h + d); c.lineTo(x, y + h); c.lineTo(x + w, y + h); c.closePath(); c.fill();
    c.save(); c.clip(); this.crayon(c, x, y, w + d, h + d, side, 4); c.restore();
    c.strokeStyle = '#3a3a3a'; c.lineWidth = 1.6;
    this.wob(c, [[x + w, y], [x + w + d, y + d], [x + w + d, y + h + d], [x + d, y + h + d], [x, y + h]], t.seed + 1, false);
    this.wob(c, [[x + w, y + h], [x + w + d, y + h + d]], t.seed + 2, false);
    // face
    c.fillStyle = sel ? '#fff2a8' : ['#fffdf5', '#fffbe6', '#fff5f8', '#f3f6ff'][t.z];
    c.fillRect(x, y, w, h);
    const cols = MJ_COLS;
    c.strokeStyle = cols[t.k] + '66'; c.lineWidth = 2;
    this.wob(c, [[x + 5, y + 5], [x + w - 5, y + 5], [x + w - 5, y + h - 5], [x + 5, y + h - 5]], t.seed + 5);
    c.strokeStyle = '#3a3a3a'; c.lineWidth = 2;
    this.wob(c, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], t.seed);
    this.doodle(c, t.k, x + w / 2, y + h / 2, w * 0.5);
    if (!free) { // peça presa: fica acinzentada, com riscos a lápis por cima
      c.fillStyle = 'rgba(95,85,75,.34)'; c.fillRect(x, y, w, h);
      c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); this.crayon(c, x, y, w, h, 'rgba(60,55,50,.16)', 7); c.restore();
    }
    if (sel || hinted) { c.strokeStyle = sel ? '#e8a013' : '#4f9a3f'; c.lineWidth = 3; this.wob(c, [[x - 3, y - 3], [x + w + 3, y - 2], [x + w + 2, y + h + 3], [x - 2, y + h + 2]], t.seed + 9); }
  }
  draw(c) {
    const { W, H } = this;
    this.background(c);
    const order = this.live().sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);
    for (const t of order) this.tile(c, t);
    const cols = MJ_COLS;
    for (const p of this.parts) {
      c.globalAlpha = Math.max(0, 1 - p.t / 0.7);
      if (p.star) this.star(c, p.x, p.y, 6, cols[p.k]); else this.doodle(c, p.k, p.x, p.y, this.tw * 0.6);
    }
    c.globalAlpha = 1;
    c.fillStyle = '#3a3a3a'; c.font = 'italic 16px "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive'; c.textAlign = 'center';
    c.fillText(this.stuck ? 'Sem jogadas! Desfaz ou baralha.' : this.msg ? this.msg.text : 'Junta duas peças iguais que estejam livres', W / 2, H - 20);
    // ferramentas, desenhadas a lápis
    this.btns.forEach((b, i) => {
      const on = b.id === 'undo' ? this.undo.length > 0 : b.n > 0;
      c.globalAlpha = on ? 1 : 0.35;
      c.fillStyle = this.stuck && on ? '#ffe08a' : '#fffdf5'; c.fillRect(b.x, b.y, b.w, b.h);
      c.strokeStyle = '#3a3a3a'; c.lineWidth = 2; this.wob(c, [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]], 501 + i);
      c.fillStyle = '#3a3a3a'; c.font = 'italic bold 15px "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive';
      c.fillText(b.n === undefined ? b.label : `${b.label} (${b.n})`, b.x + b.w / 2, b.y + 25);
    });
    c.globalAlpha = 1;
    c.font = 'italic 13px "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive'; c.fillStyle = 'rgba(58,58,58,.7)';
    c.fillText('Livre = sem peça por cima e com um lado solto', W / 2, this.oy + this.th * 5 + 28);
  }
}

// ============================================================ 2. Doce Lar
class Match3 {
  // Peças especiais:
  //   4 em linha       -> peça listrada (limpa a linha ou a coluna inteira)
  //   L ou T           -> peça embrulhada (rebenta o quadrado 3x3 à volta)
  //   5 em linha       -> novelo arco-íris (leva todas as peças de um tipo)
  // Trocar duas especiais entre si faz combinações maiores.
  constructor(W, H, sfx) {
    this.W = W; this.H = H; this.sfx = sfx;
    this.R = 7; this.C = 6; this.K = 5;
    this.cs = Math.min((W - 28) / this.C, (H - 96) / this.R);
    this.ox = (W - this.cs * this.C) / 2; this.oy = (H - this.cs * this.R) / 2 + 2;
    do {
      this.b = [];
      for (let r = 0; r < this.R; r++) { this.b.push([]); for (let c = 0; c < this.C; c++) this.b[r].push(this.fresh(0)); }
    } while (this.runs().length || !this.findMove());
    this.moves = 15; this.points = 0; this.state = 'idle'; this.drag = null; this.parts = []; this.fx = []; this.texts = []; this.done = false; this.t = 0; this.combo = 0; this.quiet = 0; this.pivots = []; this.shake = 0;
  }
  fresh(off) { return { k: rnd(this.K), sp: null, off }; }
  get score() { return Math.min(1, this.points / 160); }
  hud() { return `Jogadas: ${this.moves}\nPontos: ${this.points}`; }
  result() { return `Fizeste ${this.points} pontos!`; }
  // sequências de 3 ou mais iguais
  runs() {
    const out = [], b = this.b;
    for (let r = 0; r < this.R; r++) for (let c = 0; c < this.C;) {
      const k = b[r][c] ? b[r][c].k : -9;
      let n = 1;
      while (c + n < this.C && b[r][c + n] && b[r][c + n].k === k) n++;
      if (k >= 0 && n >= 3) out.push({ dir: 'h', k, len: n, cells: Array.from({ length: n }, (_, i) => [r, c + i]) });
      c += n;
    }
    for (let c = 0; c < this.C; c++) for (let r = 0; r < this.R;) {
      const k = b[r][c] ? b[r][c].k : -9;
      let n = 1;
      while (r + n < this.R && b[r + n][c] && b[r + n][c].k === k) n++;
      if (k >= 0 && n >= 3) out.push({ dir: 'v', k, len: n, cells: Array.from({ length: n }, (_, i) => [r + i, c]) });
      r += n;
    }
    return out;
  }
  swap(r1, c1, r2, c2) { const t = this.b[r1][c1]; this.b[r1][c1] = this.b[r2][c2]; this.b[r2][c2] = t; }
  usable(r1, c1, r2, c2) {
    const A = this.b[r1][c1], B = this.b[r2][c2];
    if (A.sp === 'b' || B.sp === 'b' || (A.sp && B.sp)) return true;
    this.swap(r1, c1, r2, c2);
    const ok = this.runs().length > 0;
    this.swap(r1, c1, r2, c2);
    return ok;
  }
  findMove() {
    for (let r = 0; r < this.R; r++) for (let c = 0; c < this.C; c++) {
      if (c + 1 < this.C && this.usable(r, c, r, c + 1)) return [r, c, r, c + 1];
      if (r + 1 < this.R && this.usable(r, c, r + 1, c)) return [r, c, r + 1, c];
    }
    return null;
  }
  at(x, y) { const c = Math.floor((x - this.ox) / this.cs), r = Math.floor((y - this.oy) / this.cs); return r >= 0 && r < this.R && c >= 0 && c < this.C ? [r, c] : null; }
  down(x, y) { if (this.state === 'idle' && !this.done) { const p = this.at(x, y); if (p) this.drag = { r: p[0], c: p[1], x, y }; } }
  move(x, y) {
    const d = this.drag;
    if (!d || this.state !== 'idle') return;
    const dx = x - d.x, dy = y - d.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < this.cs * 0.35) return;
    const r2 = d.r + (Math.abs(dy) > Math.abs(dx) ? Math.sign(dy) : 0), c2 = d.c + (Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx) : 0);
    this.drag = null;
    if (r2 < 0 || r2 >= this.R || c2 < 0 || c2 >= this.C) return;
    this.play(d.r, d.c, r2, c2);
  }
  up() { this.drag = null; }
  play(r1, c1, r2, c2) {
    this.quiet = 0;
    if (!this.usable(r1, c1, r2, c2)) { this.bad = { r: r1, c: c1, t: 0.25 }; this.sfx.full(); return; }
    this.swap(r1, c1, r2, c2);
    this.moves--; this.combo = 1; this.state = 'resolve'; this.wait = 0.14;
    this.pivots = [[r2, c2], [r1, c1]];
    this.sfx.pick();
    const A = this.b[r2][c2], B = this.b[r1][c1]; // A é a peça que ela arrastou
    if (!(A.sp === 'b' || B.sp === 'b' || (A.sp && B.sp))) return;
    // combinação de duas especiais (ou novelo arco-íris com qualquer peça)
    const kill = new Set();
    const zap = (r, c) => { if (r >= 0 && r < this.R && c >= 0 && c < this.C) this.kill(r, c, kill); };
    const A0 = { ...A }, B0 = { ...B };
    A.sp = null; B.sp = null;
    if (A0.sp === 'b' && B0.sp === 'b') {
      for (let r = 0; r < this.R; r++) for (let c = 0; c < this.C; c++) zap(r, c);
      this.say('Divinal!', r2, c2);
    } else if (A0.sp === 'b' || B0.sp === 'b') {
      const o = A0.sp === 'b' ? B0 : A0;
      zap(r1, c1); zap(r2, c2);
      const targets = [];
      for (let r = 0; r < this.R; r++) for (let c = 0; c < this.C; c++) if (this.b[r][c] && this.b[r][c].k === o.k) targets.push([r, c]);
      if (o.sp) for (const [r, c] of targets) this.b[r][c].sp = o.sp === 'w' ? 'w' : rnd(2) ? 'h' : 'v';
      for (const [r, c] of targets) { this.fx.push({ type: 'ray', r, c, fr: r2, fc: c2, t: 0 }); zap(r, c); }
      this.say(o.sp ? 'Divinal!' : 'Arco-íris!', r2, c2);
    } else {
      const wraps = (A0.sp === 'w') + (B0.sp === 'w');
      const span = wraps === 2 ? 2 : wraps === 1 ? 1 : 0;
      if (wraps === 2) { for (let r = r2 - 2; r <= r2 + 2; r++) for (let c = c2 - 2; c <= c2 + 2; c++) zap(r, c); this.fx.push({ type: 'ring', r: r2, c: c2, s: 2.6, t: 0 }); }
      else {
        for (let d = -span; d <= span; d++) {
          if (r2 + d >= 0 && r2 + d < this.R) { this.fx.push({ type: 'row', r: r2 + d, t: 0 }); for (let c = 0; c < this.C; c++) zap(r2 + d, c); }
          if (c2 + d >= 0 && c2 + d < this.C) { this.fx.push({ type: 'col', c: c2 + d, t: 0 }); for (let r = 0; r < this.R; r++) zap(r, c2 + d); }
        }
      }
      this.say(wraps ? 'Delicioso!' : 'Em cruz!', r2, c2);
    }
    this.finish(kill, []);
  }
  // rebenta uma casa; as especiais disparam o seu efeito em cadeia
  kill(r, c, set) {
    const id = r * 10 + c, p = this.b[r][c];
    if (!p || set.has(id)) return;
    set.add(id);
    if (p.sp === 'h') { this.fx.push({ type: 'row', r, t: 0 }); for (let cc = 0; cc < this.C; cc++) this.kill(r, cc, set); }
    else if (p.sp === 'v') { this.fx.push({ type: 'col', c, t: 0 }); for (let rr = 0; rr < this.R; rr++) this.kill(rr, c, set); }
    else if (p.sp === 'w') { this.fx.push({ type: 'ring', r, c, s: 1.6, t: 0 }); for (let rr = r - 1; rr <= r + 1; rr++) for (let cc = c - 1; cc <= c + 1; cc++) if (rr >= 0 && rr < this.R && cc >= 0 && cc < this.C) this.kill(rr, cc, set); }
    else if (p.sp === 'b') {
      const count = new Array(this.K).fill(0);
      for (const row of this.b) for (const q of row) if (q && q.k >= 0) count[q.k]++;
      const k = count.indexOf(Math.max(...count));
      for (let rr = 0; rr < this.R; rr++) for (let cc = 0; cc < this.C; cc++) if (this.b[rr][cc] && this.b[rr][cc].k === k) { this.fx.push({ type: 'ray', r: rr, c: cc, fr: r, fc: c, t: 0 }); this.kill(rr, cc, set); }
    }
  }
  say(text, r, c) { this.texts.push({ text, x: this.ox + (c + 0.5) * this.cs, y: this.oy + (r + 0.5) * this.cs, t: 0 }); }
  finish(kill, make) {
    if (!kill.size) return;
    this.points += kill.size * this.combo;
    this.shake = Math.min(0.3, 0.05 + kill.size * 0.012);
    for (const id of kill) {
      const r = Math.floor(id / 10), c = id % 10, p = this.b[r][c];
      this.parts.push({ x: this.ox + (c + 0.5) * this.cs, y: this.oy + (r + 0.5) * this.cs, k: p.k, t: 0 });
      this.b[r][c] = null;
    }
    for (const m of make) this.b[m.r][m.c] = { k: m.k, sp: m.sp, off: 0, born: 0.35 };
    for (let c = 0; c < this.C; c++) {
      let w = this.R - 1;
      for (let r = this.R - 1; r >= 0; r--) if (this.b[r][c]) { const p = this.b[r][c]; this.b[r][c] = null; p.off += (w - r) * this.cs; this.b[w][c] = p; w--; }
      for (let r = w; r >= 0; r--) this.b[r][c] = this.fresh((w + 1) * this.cs);
    }
    if (kill.size >= 12 || make.some((m) => m.sp === 'b')) this.sfx.unlock(); else this.sfx.sale();
    this.wait = 0.16;
  }
  step() {
    const runs = this.runs();
    if (!runs.length) return false;
    const inH = new Map(), inV = new Map(), used = new Set(), make = [];
    for (const run of runs) for (const [r, c] of run.cells) (run.dir === 'h' ? inH : inV).set(r * 10 + c, run);
    const pivot = (run) => this.pivots.find(([r, c]) => run.cells.some(([a, b]) => a === r && b === c)) || run.cells[Math.floor(run.len / 2)];
    for (const run of runs) if (run.len >= 5) { const [r, c] = pivot(run); make.push({ r, c, k: -1, sp: 'b' }); used.add(run); }
    for (const [id, rh] of inH) {
      const rv = inV.get(id);
      if (rv && !used.has(rh) && !used.has(rv)) { make.push({ r: Math.floor(id / 10), c: id % 10, k: rh.k, sp: 'w' }); used.add(rh); used.add(rv); }
    }
    for (const run of runs) if (!used.has(run) && run.len === 4) { const [r, c] = pivot(run); make.push({ r, c, k: run.k, sp: run.dir === 'h' ? 'v' : 'h' }); }
    const kill = new Set();
    for (const run of runs) for (const [r, c] of run.cells) this.kill(r, c, kill);
    if (make.length) this.say(make.some((m) => m.sp === 'b') ? 'Arco-íris!' : make.some((m) => m.sp === 'w') ? 'Embrulhada!' : 'Listrada!', make[0].r, make[0].c);
    else if (this.combo >= 2) this.say(['Doce!', 'Delicioso!', 'Divinal!'][Math.min(2, this.combo - 2)], runs[0].cells[1][0], runs[0].cells[1][1]);
    this.finish(kill, make);
    this.pivots = [];
    return true;
  }
  update(dt) {
    this.t += dt; this.quiet += dt;
    this.shake = Math.max(0, this.shake - dt);
    if (this.bad) { this.bad.t -= dt; if (this.bad.t <= 0) this.bad = null; }
    for (const a of [this.parts, this.fx, this.texts]) for (const p of a) p.t += dt;
    this.parts = this.parts.filter((p) => p.t < 0.35);
    this.fx = this.fx.filter((p) => p.t < 0.32);
    this.texts = this.texts.filter((p) => p.t < 1);
    let falling = false;
    for (const row of this.b) for (const p of row) if (p) {
      if (p.born) p.born = Math.max(0, p.born - dt);
      if (p.off > 0) { p.off = Math.max(0, p.off - this.cs * 11 * dt); falling = true; }
    }
    this.hint = this.state === 'idle' && this.quiet > 6 && !this.done ? this.findMove() : null;
    if (falling || this.state !== 'resolve') return;
    this.wait -= dt;
    if (this.wait > 0) return;
    if (this.step()) { this.combo++; return; }
    this.state = 'idle';
    this.quiet = 0;
    if (this.moves <= 0) { this.done = true; return; }
    if (!this.findMove()) { // sem jogadas: baralha
      const all = this.b.flat();
      do {
        for (let i = all.length - 1; i > 0; i--) { const j = rnd(i + 1); [all[i], all[j]] = [all[j], all[i]]; }
        for (let r = 0; r < this.R; r++) for (let c = 0; c < this.C; c++) this.b[r][c] = all[r * this.C + c];
      } while (this.runs().length || !this.findMove());
      this.say('Baralhei!', 3, 2.5);
    }
  }
  piece(c, p, x, y, s, a = 1) {
    const k = p.k;
    c.save();
    c.globalAlpha = a;
    c.translate(x, y);
    const bg = k < 0 ? '#fffaf0' : ['#f3d9b1', '#bfe3dc', '#f6c1c8', '#d9cdf0', '#f0c9a0'][k];
    if (p.sp === 'w') { // embrulhada: brilho a pulsar
      c.fillStyle = `rgba(255,190,90,${0.35 + 0.25 * Math.sin(this.t * 6)})`;
      rrect(c, -s * 0.5, -s * 0.52, s, s, s * 0.28); c.fill();
    }
    c.fillStyle = 'rgba(120,80,50,.18)'; rrect(c, -s * 0.44, -s * 0.4, s * 0.88, s * 0.88, s * 0.24); c.fill();
    c.fillStyle = bg; rrect(c, -s * 0.44, -s * 0.46, s * 0.88, s * 0.88, s * 0.24); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1.5; c.setLineDash([4, 4]); rrect(c, -s * 0.37, -s * 0.39, s * 0.74, s * 0.74, s * 0.18); c.stroke(); c.setLineDash([]);
    c.translate(0, -s * 0.03);
    c.lineWidth = s * 0.05; c.lineCap = 'round'; c.strokeStyle = '#7a4e2d';
    switch (k) {
      case -1: { // novelo arco-íris
        const cols = ['#e8798c', '#f2a65a', '#f2d35a', '#7fc8a9', '#7aa8e0', '#b08be0'];
        cols.forEach((col, i) => { c.strokeStyle = col; c.lineWidth = s * 0.075; c.beginPath(); c.arc(0, 0, s * (0.3 - i * 0.045), this.t * 2 + i, this.t * 2 + i + 4.6); c.stroke(); });
        c.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { const an = this.t * 3 + i * 2.1; c.beginPath(); c.arc(Math.cos(an) * s * 0.36, Math.sin(an) * s * 0.36, s * 0.03, 0, TAU); c.fill(); }
        break;
      }
      case 0:
        c.fillStyle = '#d9a066'; c.beginPath(); c.arc(0, 0, s * 0.27, 0, TAU); c.fill(); c.stroke();
        c.fillStyle = '#5a3620'; for (const [x1, y1] of [[-0.1, -0.08], [0.1, 0.02], [-0.03, 0.13], [0.12, -0.14]]) { c.beginPath(); c.arc(x1 * s, y1 * s, s * 0.035, 0, TAU); c.fill(); } break;
      case 1:
        c.strokeStyle = '#3d8a80'; c.beginPath(); c.arc(s * 0.2, 0.02 * s, s * 0.1, -1.3, 1.3); c.stroke();
        c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(-s * 0.24, -s * 0.12); c.lineTo(s * 0.2, -s * 0.12); c.lineTo(s * 0.13, s * 0.2); c.lineTo(-s * 0.17, s * 0.2); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = '#c98a45'; c.beginPath(); c.ellipse(-s * 0.02, -s * 0.12, s * 0.2, s * 0.05, 0, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(61,138,128,.5)'; c.beginPath(); c.moveTo(-s * 0.06, -s * 0.22); c.quadraticCurveTo(-s * 0.14, -s * 0.3, -s * 0.04, -s * 0.36); c.stroke(); break;
      case 2:
        c.fillStyle = '#e8798c'; c.strokeStyle = '#b84f63'; c.beginPath(); c.arc(0, 0, s * 0.27, 0, TAU); c.fill(); c.stroke();
        for (const o of [-0.12, 0, 0.12]) { c.beginPath(); c.arc(o * s * 2, -s * 0.5, s * 0.55, 1.15 + o, 1.95 + o); c.stroke(); } break;
      case 3:
        c.strokeStyle = '#6b55a8'; c.fillStyle = '#fffaf0'; rrect(c, -s * 0.12, -s * 0.08, s * 0.24, s * 0.34, s * 0.04); c.fill(); c.stroke();
        c.fillStyle = '#ffb347'; c.beginPath(); c.moveTo(0, -s * 0.34); c.quadraticCurveTo(s * 0.12, -s * 0.16, 0, -s * 0.1); c.quadraticCurveTo(-s * 0.12, -s * 0.16, 0, -s * 0.34); c.fill();
        c.fillStyle = 'rgba(255,200,90,.3)'; c.beginPath(); c.arc(0, -s * 0.2, s * 0.2, 0, TAU); c.fill(); break;
      default:
        c.fillStyle = '#c98a45'; c.beginPath(); c.arc(0, 0, s * 0.27, 0, TAU); c.fill(); c.stroke();
        c.strokeStyle = '#fff3d6'; c.beginPath(); for (let i = 0; i < 40; i++) { const an = i * 0.32, rr = s * 0.02 + i * s * 0.0055; c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); } c.stroke();
    }
    c.translate(0, s * 0.03);
    if (p.sp === 'h' || p.sp === 'v') { // listrada: riscas brancas e setas na direção que limpa
      c.save();
      if (p.sp === 'v') c.rotate(Math.PI / 2);
      rrect(c, -s * 0.44, -s * 0.46, s * 0.88, s * 0.88, s * 0.24); c.clip();
      c.strokeStyle = 'rgba(232,121,140,.8)'; c.lineWidth = s * 0.08;
      for (const yy of [-0.33, 0.33]) { c.beginPath(); c.moveTo(-s * 0.5, yy * s); c.lineTo(s * 0.5, yy * s); c.stroke(); }
      c.fillStyle = '#e8798c';
      for (const d of [-1, 1]) { c.beginPath(); c.moveTo(d * s * 0.44, 0); c.lineTo(d * s * 0.3, -s * 0.1); c.lineTo(d * s * 0.3, s * 0.1); c.fill(); }
      c.restore();
    } else if (p.sp === 'w') { // embrulhada: fita e laço
      c.strokeStyle = '#e8798c'; c.lineWidth = s * 0.07;
      c.beginPath(); c.moveTo(-s * 0.44, s * 0.3); c.lineTo(s * 0.44, s * 0.3); c.moveTo(s * 0.3, -s * 0.46); c.lineTo(s * 0.3, s * 0.42); c.stroke();
      c.fillStyle = '#e8798c'; for (const d of [-1, 1]) { c.beginPath(); c.ellipse(s * 0.3 + d * s * 0.09, s * 0.3 - s * 0.09, s * 0.09, s * 0.06, d * 0.7, 0, TAU); c.fill(); }
    }
    c.restore();
  }
  draw(c) {
    const { W, H } = this;
    c.save();
    if (this.shake > 0) c.translate((Math.random() - 0.5) * this.shake * 24, (Math.random() - 0.5) * this.shake * 24);
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#f8e7d3'); g.addColorStop(1, '#e9c6a3');
    c.fillStyle = g; c.fillRect(-20, -20, W + 40, H + 40);
    c.strokeStyle = 'rgba(160,110,70,.14)'; c.lineWidth = 2;
    for (let y = 0; y < H; y += 14) for (let x = (y / 14) % 2 ? 7 : 0; x < W; x += 14) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + 5, y + 8); c.lineTo(x + 10, y); c.stroke(); }
    const bw = this.cs * this.C, bh = this.cs * this.R;
    c.fillStyle = 'rgba(120,80,50,.2)'; rrect(c, this.ox - 10, this.oy - 6, bw + 20, bh + 20, 26); c.fill();
    c.fillStyle = '#fff8ee'; rrect(c, this.ox - 10, this.oy - 10, bw + 20, bh + 20, 26); c.fill();
    c.strokeStyle = '#d9a066'; c.lineWidth = 2; c.setLineDash([7, 6]); rrect(c, this.ox - 4, this.oy - 4, bw + 8, bh + 8, 20); c.stroke(); c.setLineDash([]);
    c.save();
    rrect(c, this.ox - 4, this.oy - 4, bw + 8, bh + 8, 20); c.clip();
    for (let r = 0; r < this.R; r++) for (let cc = 0; cc < this.C; cc++) {
      const p = this.b[r][cc];
      if (!p) continue;
      let x = this.ox + (cc + 0.5) * this.cs, y = this.oy + (r + 0.5) * this.cs - p.off;
      if (this.bad && this.bad.r === r && this.bad.c === cc) x += Math.sin(this.t * 60) * 4;
      const h = this.hint;
      if (h && ((h[0] === r && h[1] === cc) || (h[2] === r && h[3] === cc))) y += Math.sin(this.t * 9) * 3;
      const sel = this.drag && this.drag.r === r && this.drag.c === cc;
      this.piece(c, p, x, y, this.cs * (sel ? 1.08 : 1) * (p.born ? 1 + p.born * 0.9 : 1));
    }
    // efeitos das especiais
    for (const f of this.fx) {
      const a = 1 - f.t / 0.32;
      c.globalAlpha = a * 0.75; c.fillStyle = '#fff3b0';
      if (f.type === 'row') c.fillRect(this.ox, this.oy + (f.r + 0.5) * this.cs - this.cs * 0.28 * a, bw, this.cs * 0.56 * a);
      else if (f.type === 'col') c.fillRect(this.ox + (f.c + 0.5) * this.cs - this.cs * 0.28 * a, this.oy, this.cs * 0.56 * a, bh);
      else if (f.type === 'ring') { c.strokeStyle = '#ffb347'; c.lineWidth = 8 * a; c.beginPath(); c.arc(this.ox + (f.c + 0.5) * this.cs, this.oy + (f.r + 0.5) * this.cs, this.cs * f.s * (0.3 + f.t * 2.4), 0, TAU); c.stroke(); }
      else { c.strokeStyle = '#b08be0'; c.lineWidth = 4 * a; c.beginPath(); c.moveTo(this.ox + (f.fc + 0.5) * this.cs, this.oy + (f.fr + 0.5) * this.cs); c.lineTo(this.ox + (f.c + 0.5) * this.cs, this.oy + (f.r + 0.5) * this.cs); c.stroke(); }
    }
    c.globalAlpha = 1;
    c.restore();
    for (const p of this.parts) this.piece(c, p, p.x, p.y, this.cs * (1 + p.t * 1.5), 1 - p.t / 0.35);
    c.textAlign = 'center'; c.font = '800 26px system-ui, sans-serif';
    for (const p of this.texts) { c.globalAlpha = Math.max(0, 1 - p.t); c.lineWidth = 6; c.strokeStyle = '#fff8ee'; c.fillStyle = '#e8798c'; c.strokeText(p.text, Math.max(70, Math.min(W - 70, p.x)), p.y - p.t * 46); c.fillText(p.text, Math.max(70, Math.min(W - 70, p.x)), p.y - p.t * 46); }
    c.globalAlpha = 1;
    c.fillStyle = '#7a4e2d'; c.font = '600 13px system-ui, sans-serif';
    c.fillText('4 em linha: listrada · L ou T: embrulhada · 5: arco-íris', W / 2, H - 26);
    c.fillText('Troca duas especiais para um combo', W / 2, H - 9);
    c.restore();
  }
}

// ============================================================ ecrã do anúncio
export const ADS = [
  { name: 'Bolhas da Bruxa', tag: 'Rebenta abóboras, fantasmas, morcegos e gatas pretas.', make: (W, H, s) => new Bubbles(W, H, s), bg: '#2b1b3d', fg: '#ffe9b0', accent: '#f28c28', font: 'Georgia, serif' },
  { name: 'Mahjong de Papel', tag: 'Mahjong a sério num caderno desenhado à mão: 72 peças, sem dicas, tem sempre solução.', make: (W, H, s) => new Mahjong(W, H, s), bg: '#fbf6e9', fg: '#3a3a3a', accent: '#e8a013', font: '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive' },
  { name: 'Doce Lar', tag: 'Combina bolachas, chá e novelos de lã. Junta 4 ou 5 para peças especiais e combos!', make: (W, H, s) => new Match3(W, H, s), bg: '#f8e7d3', fg: '#7a4e2d', accent: '#e8798c', font: 'system-ui, sans-serif' },
];

// openAd(i, rewardText, sfx, cb): cb(null) se fechou sem jogar; cb({ score, vote }) no fim
export function openAd(i, rewardText, sfx, cb) {
  const A = ADS[i];
  const root = document.createElement('div');
  root.style.cssText = `position:fixed;inset:0;z-index:30;background:${A.bg};color:${A.fg};display:flex;flex-direction:column;font-family:${A.font};touch-action:none;user-select:none`;
  root.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;padding:calc(8px + env(safe-area-inset-top)) 12px 6px">
      <span style="font-size:11px;font-weight:800;letter-spacing:1px;border:2px solid ${A.fg};border-radius:6px;padding:1px 6px;opacity:.8">ANÚNCIO</span>
      <b style="flex:1;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${A.name}</b>
      <span data-hud style="font:700 12px system-ui,sans-serif;text-align:right;white-space:pre-line"></span>
      <button data-x style="border:0;background:rgba(128,128,128,.25);color:${A.fg};height:34px;border-radius:17px;padding:0 12px;font:700 14px system-ui,sans-serif">Saltar ×</button>
    </div>
    <div data-stage style="flex:1;position:relative;min-height:0"><canvas style="position:absolute;inset:0;width:100%;height:100%"></canvas>
      <div data-card style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:22px;background:rgba(0,0,0,.35)">
        <div style="background:${A.bg};border:3px solid ${A.accent};border-radius:22px;padding:22px 20px;max-width:340px;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.4)">
          <div style="font-size:13px;opacity:.8">Em breve, o próximo jogo:</div>
          <div style="font-size:30px;font-weight:800;color:${A.accent};margin:4px 0 8px">${A.name}</div>
          <div style="font-size:15px;margin-bottom:12px">${A.tag}</div>
          <div style="font:600 14px system-ui,sans-serif;margin-bottom:16px">Experimenta a demo e ganha:<br><b>${rewardText}</b></div>
          <button data-play style="border:0;border-radius:14px;background:${A.accent};color:#fff;font:800 20px system-ui,sans-serif;padding:12px 36px">Jogar demo</button>
          <div><button data-no style="border:0;background:none;color:${A.fg};opacity:.75;text-decoration:underline;font:600 14px system-ui,sans-serif;padding:12px 8px 0">Agora não</button></div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(root);
  const q = (s) => root.querySelector(s);
  const cv = q('canvas'), stage = q('[data-stage]'), card = q('[data-card]');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = stage.clientWidth, H = stage.clientHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  const game = A.make(W, H, sfx);
  window.__adGame = game;
  let playing = false, closed = false, last = performance.now(), endT = 0;
  const xy = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener('pointerdown', (e) => { if (playing) game.down(...xy(e)); });
  cv.addEventListener('pointermove', (e) => { if (playing) game.move(...xy(e)); });
  cv.addEventListener('pointerup', (e) => { if (playing) game.up(...xy(e)); });
  const finish = (res) => {
    if (closed) return;
    closed = true;
    root.remove();
    cb(res);
  };
  // "Saltar": antes de jogar fecha sem prémio; a meio termina já a demo e dá o prémio pelo que fez
  q('[data-x]').onclick = () => {
    if (playing && !game.done) { game.done = true; endT = 1; }
    else finish(game.done ? { score: game.score, vote: null } : null);
  };
  q('[data-no]').onclick = () => finish(null);
  q('[data-play]').onclick = () => { card.style.display = 'none'; playing = true; sfx.click(); };
  function showEnd() {
    playing = false;
    card.style.display = 'flex';
    card.firstElementChild.innerHTML = `
      <div style="font-size:26px;font-weight:800;color:${A.accent};margin-bottom:6px">Fim da demo!</div>
      <div style="font-size:16px;margin-bottom:14px">${game.result()}</div>
      <div style="font:600 14px system-ui,sans-serif;margin-bottom:8px">Gostavas de jogar o jogo completo?</div>
      <div data-votes style="display:flex;gap:8px;justify-content:center;margin-bottom:16px">
        ${[['sim', 'Adorei!'], ['talvez', 'Assim-assim'], ['nao', 'Não é para mim']].map(([v, t]) => `<button data-v="${v}" style="border:2px solid ${A.accent};background:transparent;color:${A.fg};border-radius:12px;font:700 13px system-ui,sans-serif;padding:8px 8px">${t}</button>`).join('')}
      </div>
      <button data-get style="border:0;border-radius:14px;background:${A.accent};color:#fff;font:800 18px system-ui,sans-serif;padding:12px 26px">Receber prémio</button>`;
    let vote = null;
    card.querySelectorAll('[data-v]').forEach((b) => (b.onclick = () => {
      vote = b.dataset.v;
      card.querySelectorAll('[data-v]').forEach((o) => { o.style.background = o === b ? A.accent : 'transparent'; o.style.color = o === b ? '#fff' : A.fg; });
    }));
    card.querySelector('[data-get]').onclick = () => finish({ score: game.score, vote });
  }
  function loop(now) {
    if (closed) return;
    requestAnimationFrame(loop);
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    if (playing) {
      game.update(dt);
      q('[data-hud]').textContent = game.hud();
      if (game.done) { endT += dt; if (endT > 0.7) showEnd(); }
    }
    game.draw(ctx);
  }
  requestAnimationFrame(loop);
  return { game, finish };
}
