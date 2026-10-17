// Synthesised sound effects + a light music loop (WebAudio). No audio files.
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
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
}
const note = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI → Hz
export const buzz = (ms) => {
  if (settings.vib && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { /* ignore */ } }
};
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

function noise(dur, vol, freq = 800, when = 0) {
  if (!ctx || !settings.sfx) return;
  const t = ctx.currentTime + when, n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(freq * 0.3, t + dur);
  const g = ctx.createGain(); g.gain.value = vol;
  src.connect(f); f.connect(g); g.connect(sfxBus); src.start(t);
}

export const play = {
  pick() { tone(760, 0.05, 0.08, 'triangle', 0, 1.3); },
  swap() { tone(420, 0.08, 0.1, 'triangle', 0, 1.5); },
  nope() { tone(300, 0.08, 0.1, 'triangle', 0, 0.7); tone(250, 0.1, 0.08, 'triangle', 0.08, 0.7); buzz(15); },
  // Rising notes: bigger cascades = higher pitch.
  match(combo, size) {
    const base = 67 + PENTA[Math.min(combo, 8)];
    const n = Math.min(2 + Math.floor(size / 3), 5);
    for (let i = 0; i < n; i++) {
      tone(note(base + PENTA[i]), 0.2, 0.14, 'triangle', i * 0.04);
      tone(note(base + PENTA[i] + 12), 0.14, 0.04, 'sine', i * 0.04);
    }
    buzz(12);
  },
  born() { [79, 84, 88].forEach((n, i) => tone(note(n), 0.16, 0.1, 'square', i * 0.05)); },
  rocket() { noise(0.35, 0.5, 2400); tone(900, 0.3, 0.08, 'sawtooth', 0, 0.3); buzz(20); },
  bomb() { noise(0.6, 0.9, 500); tone(110, 0.5, 0.35, 'sine', 0, 0.35); buzz([40, 30, 40]); },
  fly() { tone(600, 0.3, 0.06, 'triangle', 0, 2); noise(0.25, 0.2, 3000); },
  light() { [84, 88, 91, 96, 100].forEach((n, i) => tone(note(n), 0.3, 0.07, 'sine', i * 0.04)); noise(0.4, 0.25, 4000); buzz(30); },
  nova() { this.bomb(); this.light(); },
  box() { tone(180, 0.1, 0.18, 'square', 0, 0.5); noise(0.12, 0.35, 900); },
  ice() { tone(2400, 0.08, 0.05, 'triangle', 0, 0.6); tone(3100, 0.06, 0.04, 'sine', 0.03); },
  egg() { [72, 79, 84].forEach((n, i) => tone(note(n), 0.25, 0.12, 'triangle', i * 0.07)); buzz(20); },
  goal() { tone(note(88), 0.18, 0.08, 'sine'); },
  hammer() { tone(140, 0.2, 0.3, 'square', 0, 0.4); noise(0.2, 0.5, 700); buzz(40); },
  shuffle() { for (let i = 0; i < 8; i++) tone(500 + Math.random() * 600, 0.05, 0.05, 'triangle', i * 0.04); },
  win() { [72, 76, 79, 84, 79, 84, 88, 91].forEach((n, i) => tone(note(n), 0.35, 0.13, 'triangle', i * 0.08)); },
  lose() { [67, 63, 60, 55].forEach((n, i) => tone(note(n), 0.4, 0.14, 'triangle', i * 0.18)); buzz(60); },
  build() { [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => { tone(note(n), 0.4, 0.12, 'triangle', i * 0.07); tone(note(n + 12), 0.3, 0.04, 'sine', i * 0.07); }); },
  tap() { tone(660, 0.06, 0.12, 'triangle', 0, 1.4); },
  locked() { tone(200, 0.12, 0.12, 'square', 0, 0.8); buzz(15); },
};

// ---------------------------------------------------------------- music
// Heroic minor loop (i–VI–III–VII): low drums, bass and a horn-like melody every other round.
const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
const MELODY = [69, -1, 72, 76, 74, -1, 72, -1, 69, -1, 65, 69, 72, -1, -1, -1, 67, -1, 64, 67, 72, -1, 71, 67, 74, -1, 72, 71, 69, -1, -1, -1];
const BEAT = 60 / 96 / 2; // eighth notes at 96 bpm

function scheduleMusic() {
  while (nextBeat < ctx.currentTime + 0.3) {
    const when = nextBeat - ctx.currentTime;
    const bar = Math.floor(beat / 8) % 4, step = beat % 8;
    const ch = CHORDS[bar];
    if (step === 0 || step === 3 || step === 6) tone(note(ch[0] - 24), BEAT * 1.6, 0.08, 'triangle', when, 0, musicBus);
    if (step === 0 || step === 4) tone(70, 0.18, 0.12, 'sine', when, 0.5, musicBus); // drum
    if (step % 2 === 1) for (const n of ch) tone(note(n), BEAT * 0.8, 0.014, 'sawtooth', when, 0, musicBus);
    const m = MELODY[beat % MELODY.length];
    if (m > 0 && Math.floor(beat / 32) % 2 === 1) tone(note(m), BEAT * 1.8, 0.035, 'triangle', when, 0, musicBus);
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

// Pause everything when the app goes to the background.
document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend(); else ctx.resume();
});
