// Synthesised sound effects (WebAudio). No audio files.
let ctx = null, noiseBuf = null, master = null;
export const sfx = { enabled: true, haptic: true };

export function unlock() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.6; master.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

function noise(freq, q, dur, vol, type = 'bandpass', when = 0) {
  if (!ctx || !sfx.enabled) return;
  const t = ctx.currentTime + when;
  const src = ctx.createBufferSource(); src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  src.connect(f); f.connect(g); g.connect(master); src.start(t, Math.random() * 0.1, dur + 0.02);
}
function tone(freq, dur, vol, type = 'sine', when = 0, slide = 0) {
  if (!ctx || !sfx.enabled) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.03);
}
const buzz = ms => { if (sfx.haptic && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { /* ignore */ } } };

const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28]; // pentatonic, one step per rank
export const play = {
  pick() { noise(2600, 1.2, 0.05, 0.16, 'highpass'); buzz(5); },
  place(when = 0) { noise(1500, 0.9, 0.07, 0.3, 'bandpass', when); tone(150, 0.07, 0.16, 'sine', when, 0.6); if (!when) buzz(8); },
  deal(when = 0) { noise(2100, 1.1, 0.045, 0.14, 'bandpass', when); },
  flip(when = 0) { noise(3200, 1.5, 0.05, 0.2, 'highpass', when); },
  draw() { noise(1900, 0.8, 0.08, 0.24); buzz(6); },
  recycle() { for (let i = 0; i < 5; i++) noise(1700 + i * 150, 1, 0.05, 0.13, 'bandpass', i * 0.035); buzz(10); },
  foundation(rank, when = 0) {
    const f = 392 * Math.pow(2, SCALE[rank] / 12);
    tone(f, 0.42, 0.2, 'triangle', when); tone(f * 2, 0.3, 0.06, 'sine', when);
    noise(1500, 0.9, 0.05, 0.16, 'bandpass', when); if (!when) buzz(12);
  },
  error() { tone(170, 0.12, 0.16, 'triangle', 0, 0.8); buzz([12, 40, 12]); },
  undo() { noise(1300, 0.8, 0.08, 0.2); tone(300, 0.08, 0.07, 'sine', 0, 0.7); buzz(6); },
  hint() { tone(880, 0.18, 0.1, 'sine'); tone(1320, 0.25, 0.08, 'sine', 0.09); },
  win() {
    [0, 4, 7, 12, 16, 19, 24].forEach((n, i) => { const f = 392 * Math.pow(2, n / 12); tone(f, 0.6, 0.17, 'triangle', i * 0.11); tone(f * 2, 0.5, 0.05, 'sine', i * 0.11); });
    buzz([30, 60, 30, 60, 80]);
  },
};
