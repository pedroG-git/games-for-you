// Synthesised sound effects + a calm, sparse pluck loop (WebAudio). No audio files.
let ctx = null, sfxBus = null, musicBus = null, musicTimer = null, nextBeat = 0, beat = 0;
export const settings = { sfx: true, music: true, vib: true };

export function unlock() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.5; sfxBus.connect(ctx.destination);
  musicBus = ctx.createGain(); musicBus.gain.value = 0; musicBus.connect(ctx.destination);
  setMusic(settings.music);
}

function tone(freq, dur, vol, type = 'sine', when = 0, slide = 0, bus = sfxBus) {
  if (!ctx) return;
  if (bus === sfxBus && !settings.sfx) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
}
const note = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI → Hz
const buzz = (ms) => {
  if (settings.vib && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { /* ignore */ } }
};
// Soft pluck: sine + quiet octave, fast decay.
const pluck = (n, vol, when = 0, bus = sfxBus, dur = 0.5) => {
  tone(note(n), dur, vol, 'sine', when, 0, bus);
  tone(note(n + 12), dur * 0.5, vol * 0.25, 'triangle', when, 0, bus);
};

export const play = {
  tap() { tone(700, 0.05, 0.08, 'triangle', 0, 1.3); },
  connect() { pluck(76, 0.14); pluck(83, 0.1, 0.07); buzz(10); },
  remove() { tone(420, 0.16, 0.1, 'sine', 0, 0.55); },
  // Each delivery: a tiny pluck from a pentatonic scale so many deliveries make a melody.
  deliver(n = 1) {
    const P = [72, 74, 76, 79, 81, 84];
    pluck(P[Math.floor(Math.random() * P.length)], 0.06 + Math.min(n, 4) * 0.01, 0, sfxBus, 0.35);
  },
  station() { pluck(67, 0.1); pluck(74, 0.07, 0.09); },
  warn() { tone(330, 0.18, 0.08, 'triangle'); tone(330, 0.18, 0.08, 'triangle', 0.25); buzz([20, 60, 20]); },
  week() { [72, 76, 79, 84].forEach((n, i) => pluck(n, 0.11, i * 0.09, sfxBus, 0.7)); },
  pick() { pluck(79, 0.12); pluck(84, 0.1, 0.06); buzz(12); },
  over() { [67, 64, 60, 55].forEach((n, i) => pluck(n, 0.13, i * 0.22, sfxBus, 0.9)); buzz(60); },
  best() { [72, 76, 79, 84, 88, 91].forEach((n, i) => pluck(n, 0.12, i * 0.08, sfxBus, 0.8)); },
  // Drawing a line: each station added plays the next note up the scale, so a long line climbs.
  link(n = 2) {
    const P = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84, 86, 88, 91];
    pluck(P[Math.min(P.length - 1, Math.max(0, n - 2))], 0.12, 0, sfxBus, 0.4); buzz(6);
  },
  unlink(n = 2) { tone(520 - n * 10, 0.08, 0.07, 'triangle', 0, 0.7); },
  star() { [79, 84, 88, 91].forEach((n, i) => pluck(n, 0.12, i * 0.07, sfxBus, 0.9)); buzz([12, 40, 12]); },
  undo() { tone(600, 0.1, 0.08, 'triangle', 0, 0.6); },
  locked() { tone(200, 0.12, 0.1, 'square', 0, 0.8); buzz(15); },
};

// ---------------------------------------------------------------- music
// Slow, sparse plucks over soft held chords. Lots of silence, like a quiet city at night.
const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]; // Am F C G
const SCALE = [69, 72, 74, 76, 79, 81, 84];
const BEAT = 60 / 72 / 2; // eighth notes at 72 bpm
let seedR = 7;
const rnd = () => (seedR = (seedR * 16807) % 2147483647) / 2147483647;

function scheduleMusic() {
  while (nextBeat < ctx.currentTime + 0.3) {
    const when = nextBeat - ctx.currentTime;
    const bar = Math.floor(beat / 16) % 4, step = beat % 16;
    const ch = CHORDS[bar];
    if (step === 0) {
      tone(note(ch[0] - 12), BEAT * 14, 0.035, 'sine', when, 0, musicBus);
      for (const n of ch) tone(note(n), BEAT * 10, 0.012, 'triangle', when, 0, musicBus);
    }
    if (step % 2 === 0 && rnd() < 0.3) pluck(SCALE[Math.floor(rnd() * SCALE.length)], 0.03, when, musicBus, 1.2);
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
