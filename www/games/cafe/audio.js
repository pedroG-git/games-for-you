// Som gerado em código (Web Audio): efeitos + música de fundo simples
export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.last = 0;
  }
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.5;
    this.musicGain.connect(this.master);
    this.step = 0;
    this.nextT = this.ctx.currentTime + 0.1;
    setInterval(() => this.schedule(), 120);
  }
  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 1;
  }
  suspend(on) {
    if (!this.ctx) return;
    if (on) this.ctx.suspend();
    else this.ctx.resume();
  }
  tone(f, d, type = 'sine', v = 0.12, delay = 0, slideTo = 0, dest = null) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    this.toneAt(t, f, d, type, v, slideTo, dest);
  }
  toneAt(t, f, d, type, v, slideTo, dest) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g);
    g.connect(dest || this.master);
    o.start(t);
    o.stop(t + d + 0.03);
  }
  throttled(ms) {
    const n = performance.now();
    if (n - this.last < ms) return true;
    this.last = n;
    return false;
  }
  pick() {
    if (this.throttled(55)) return;
    this.tone(620 + Math.random() * 160, 0.07, 'triangle', 0.11);
  }
  drop() {
    if (this.throttled(55)) return;
    this.tone(380 + Math.random() * 60, 0.07, 'triangle', 0.1);
  }
  cash() {
    this.tone(988, 0.09, 'square', 0.05);
    this.tone(1319, 0.16, 'square', 0.05, 0.08);
  }
  sale() {
    this.tone(784, 0.1, 'sine', 0.07);
  }
  unlock() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.12, i * 0.09));
  }
  full() {
    this.tone(200, 0.12, 'sine', 0.1);
  }
  meow() {
    this.tone(620, 0.16, 'sawtooth', 0.04, 0, 900);
    this.tone(900, 0.3, 'sawtooth', 0.04, 0.16, 480);
  }
  stairs() {
    [330, 392, 494, 587].forEach((f, i) => this.tone(f, 0.09, 'triangle', 0.09, i * 0.06));
  }
  click() {
    this.tone(500, 0.05, 'triangle', 0.1);
  }
  // música: quatro acordes em loop, baixo + arpejo suave
  schedule() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const stepLen = 0.3;
    const chords = [
      [261.63, 329.63, 392.0, 523.25],
      [220.0, 261.63, 329.63, 440.0],
      [174.61, 220.0, 261.63, 349.23],
      [196.0, 246.94, 293.66, 392.0],
    ];
    const pattern = [0, 2, 1, 2, 3, 2, 1, 2];
    if (this.nextT < this.ctx.currentTime) this.nextT = this.ctx.currentTime + 0.05;
    while (this.nextT < this.ctx.currentTime + 0.4) {
      const s = this.step % 32;
      const ch = chords[Math.floor(s / 8)];
      const i = s % 8;
      if (i === 0 || i === 4) this.toneAt(this.nextT, ch[0] / 2, 0.5, 'sine', 0.09, 0, this.musicGain);
      this.toneAt(this.nextT, ch[pattern[i]] * 2, 0.26, 'triangle', 0.035, 0, this.musicGain);
      if (i === 0 && Math.floor(this.step / 32) % 2 === 1) this.toneAt(this.nextT, ch[2] * 4, 0.5, 'sine', 0.02, 0, this.musicGain);
      this.nextT += stepLen;
      this.step++;
    }
  }
}
