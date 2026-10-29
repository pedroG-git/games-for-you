// Soft synthesised sounds (WebAudio): pops, chimes, a little clatter. No music, no audio files.
let ctx = null, bus = null;
export const settings = { sfx: true, vib: true };

export function unlock() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  bus = ctx.createGain(); bus.gain.value = 0.5; bus.connect(ctx.destination);
}

function tone(freq, dur, vol, type = 'sine', when = 0, slide = 0) {
  if (!ctx || !settings.sfx) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
}
const note = (n) => 440 * Math.pow(2, (n - 69) / 12);
export const buzz = (ms) => {
  if (settings.vib && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { /* ignore */ } }
};
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

function noise(dur, vol, freq = 800, when = 0) {
  if (!ctx || !settings.sfx) return;
  const t = ctx.currentTime + when, n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 2;
  const g = ctx.createGain(); g.gain.value = vol;
  src.connect(f); f.connect(g); g.connect(bus); src.start(t);
}
const bell = (n, when = 0, vol = 0.09) => {
  tone(note(n), 0.8, vol, 'triangle', when);
  tone(note(n + 12), 0.25, vol * 0.35, 'sine', when);
};

export const play = {
  pick() { tone(520, 0.07, 0.07, 'sine', 0, 1.3); },
  drop() { tone(300, 0.08, 0.1, 'sine', 0, 0.7); noise(0.04, 0.35, 1800); buzz(8); },
  nope() { tone(210, 0.12, 0.1, 'triangle', 0, 0.75); buzz(18); },
  match(combo = 1) {
    const base = 72 + PENTA[Math.min(Math.max(combo, 1) - 1, 9)];
    tone(note(base - 12), 0.14, 0.12, 'sine', 0, 1.6); noise(0.08, 0.4, 3000, 0.02);
    bell(base, 0.06, 0.1); bell(base + 7, 0.14, 0.07); bell(base + 12, 0.22, 0.05);
    buzz(20);
  },
  combo(n) { for (let i = 0; i < Math.min(n, 6); i++) bell(84 + PENTA[i], 0.05 + i * 0.05, 0.04); },
  unlock() { noise(0.25, 0.5, 1200); [60, 67, 72].forEach((n, i) => tone(note(n), 0.2, 0.07, 'square', i * 0.06)); buzz([15, 30, 25]); },
  ice() { noise(0.12, 0.6, 5200); tone(1800, 0.1, 0.05, 'sine', 0, 0.6); buzz(12); },
  forward() { noise(0.12, 0.25, 900); },
  fall() { tone(160, 0.2, 0.12, 'sine', 0.05, 0.6); },
  hint() { bell(84, 0, 0.07); bell(91, 0.1, 0.06); },
  undo() { tone(500, 0.14, 0.08, 'triangle', 0, 0.6); },
  shuffle() { for (let i = 0; i < 9; i++) noise(0.04, 0.5, 1800 + Math.random() * 1500, i * 0.035); },
  magnet() { tone(180, 0.35, 0.1, 'sawtooth', 0, 3); bell(79, 0.3, 0.08); },
  extra() { bell(76, 0, 0.08); bell(83, 0.1, 0.07); },
  tap() { tone(660, 0.06, 0.08, 'triangle', 0, 1.4); },
  win() { [72, 74, 76, 79, 81, 84, 88, 91].forEach((n, i) => bell(n, i * 0.08, 0.09)); buzz([20, 40, 20, 40, 60]); },
  lose() { [76, 72, 69].forEach((n, i) => bell(n, i * 0.16, 0.07)); buzz(60); },
};

document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend(); else ctx.resume();
});
