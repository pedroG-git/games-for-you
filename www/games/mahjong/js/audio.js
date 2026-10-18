// Synthesised sounds (tile clicks, chimes) and a calm pentatonic music loop (WebAudio). No audio files.
let ctx = null, sfxBus = null, musicBus = null, musicTimer = null, nextBeat = 0, beat = 0;
export const settings = { sfx: true, music: true, vib: true };

export function unlock() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(ctx.destination);
  musicBus = ctx.createGain(); musicBus.gain.value = 0; musicBus.connect(ctx.destination);
  setMusic(settings.music);
}

function tone(freq, dur, vol, type = 'sine', when = 0, slide = 0, bus = sfxBus) {
  if (!ctx) return;
  if (bus === sfxBus && !settings.sfx) return;
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
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28];

function noise(dur, vol, freq = 800, when = 0, bus = sfxBus) {
  if (!ctx || (bus === sfxBus && !settings.sfx)) return;
  const t = ctx.currentTime + when, n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 2.5;
  const g = ctx.createGain(); g.gain.value = vol;
  src.connect(f); f.connect(g); g.connect(bus); src.start(t);
}
// a pluck that sounds a bit like a koto string
function pluck(n, when = 0, vol = 0.1, bus = sfxBus) {
  tone(note(n), 0.9, vol, 'triangle', when, 0, bus);
  tone(note(n + 12), 0.25, vol * 0.35, 'sine', when, 0, bus);
}
const clack = (when = 0) => { noise(0.05, 0.9, 2600, when); tone(1400, 0.04, 0.05, 'square', when, 0.6); };

export const play = {
  pick() { clack(); },
  nope() { tone(220, 0.1, 0.12, 'triangle', 0, 0.7); buzz(15); },
  // tiles click together, then a chime that climbs with the combo
  match(combo) {
    clack(); clack(0.07);
    const base = 72 + PENTA[Math.min(combo - 1, 9)];
    pluck(base, 0.1, 0.11); pluck(base + 7, 0.17, 0.07);
    buzz(12);
  },
  combo(n) { for (let i = 0; i < Math.min(n, 6); i++) pluck(79 + PENTA[i], 0.05 + i * 0.06, 0.06); },
  gold() { [88, 91, 96, 100].forEach((n, i) => tone(note(n), 0.4, 0.06, 'sine', i * 0.05)); noise(0.3, 0.15, 5000); },
  hint() { pluck(84, 0, 0.07); pluck(91, 0.1, 0.06); },
  undo() { tone(500, 0.12, 0.08, 'triangle', 0, 0.6); },
  shuffle() { for (let i = 0; i < 10; i++) clack(i * 0.035 + Math.random() * 0.02); },
  win() { [72, 74, 76, 79, 81, 84, 86, 88, 91, 96].forEach((n, i) => pluck(n, i * 0.08, 0.1)); },
  stuck() { [76, 72, 69].forEach((n, i) => pluck(n, i * 0.16, 0.09)); },
  tap() { tone(660, 0.06, 0.1, 'triangle', 0, 1.4); },
  light() { [72, 79, 84, 88, 91].forEach((n, i) => pluck(n, i * 0.07, 0.08)); },
  coin() { tone(note(93), 0.08, 0.06, 'square'); tone(note(100), 0.18, 0.06, 'square', 0.07); },
};

// ---------------------------------------------------------------- music
// Slow pentatonic koto-like melody over soft drones, 70 bpm. Changes every 4 bars.
const CHORDS = [[50, 57], [45, 52], [47, 54], [43, 50]];
const MELODY = [74, -1, 76, 79, -1, 81, 79, -1, 76, -1, 74, 72, 74, -1, -1, -1,
  79, -1, 81, 84, -1, 81, 79, 76, 74, -1, 76, -1, 72, -1, -1, -1];
const BEAT = 60 / 70 / 2;

function scheduleMusic() {
  while (nextBeat < ctx.currentTime + 0.3) {
    const when = nextBeat - ctx.currentTime;
    const bar = Math.floor(beat / 8) % 4, step = beat % 8;
    const ch = CHORDS[bar];
    if (step === 0) for (const n of ch) tone(note(n - 12), BEAT * 8, 0.035, 'sine', when, 0, musicBus);
    if (step === 0 || step === 5) pluck(ch[0], when, 0.03, musicBus);
    const m = MELODY[beat % MELODY.length];
    if (m > 0 && Math.floor(beat / 32) % 3 !== 2) pluck(m, when, 0.035, musicBus);
    if (Math.floor(beat / 32) % 3 === 2 && step % 4 === 2) pluck(ch[1] + 24, when, 0.02, musicBus);
    nextBeat += BEAT; beat++;
  }
}

export function setMusic(on) {
  settings.music = on;
  if (!ctx) return;
  musicBus.gain.cancelScheduledValues(ctx.currentTime);
  musicBus.gain.linearRampToValueAtTime(on ? 0.6 : 0, ctx.currentTime + 0.6);
  if (on && !musicTimer) {
    nextBeat = ctx.currentTime + 0.1;
    musicTimer = setInterval(scheduleMusic, 100);
  } else if (!on && musicTimer) {
    setTimeout(() => { if (!settings.music) { clearInterval(musicTimer); musicTimer = null; } }, 700);
  }
}

document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend(); else ctx.resume();
});
