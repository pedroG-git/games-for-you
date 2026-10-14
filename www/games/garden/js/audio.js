// Synthesised sound effects + a gentle music loop (WebAudio). No audio files.
let ctx = null, sfxBus = null, musicBus = null, musicTimer = null, nextBeat = 0, beat = 0;
export const settings = { sfx: true, music: true };

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
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
}
const note = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI → Hz
const buzz = (ms) => { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { /* ignore */ } } };
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

export const play = {
  tap() { tone(660, 0.08, 0.18, 'triangle', 0, 1.4); buzz(6); },
  spawn() { tone(520, 0.12, 0.16, 'sine', 0, 1.8); },
  pick() { tone(880, 0.05, 0.08, 'triangle'); },
  drop() { tone(300, 0.08, 0.14, 'sine', 0, 0.7); },
  merge(lvl) {
    const base = 72 + PENTA[Math.min(lvl, PENTA.length - 1)];
    tone(note(base), 0.18, 0.22, 'triangle'); tone(note(base + 7), 0.22, 0.16, 'sine', 0.06);
    tone(note(base + 12), 0.3, 0.1, 'sine', 0.12); buzz(14);
  },
  coin(when = 0) { tone(1318, 0.08, 0.12, 'square', when); tone(1760, 0.16, 0.1, 'square', when + 0.07); },
  star(when = 0) { tone(1568, 0.25, 0.12, 'sine', when, 1.25); },
  serve() { [72, 76, 79, 84].forEach((n, i) => tone(note(n), 0.3, 0.16, 'triangle', i * 0.07)); buzz(20); },
  error() { tone(180, 0.15, 0.16, 'sawtooth', 0, 0.8); buzz(30); },
  levelUp() { [67, 72, 76, 79, 84, 88].forEach((n, i) => { tone(note(n), 0.35, 0.16, 'triangle', i * 0.09); tone(note(n + 12), 0.25, 0.05, 'sine', i * 0.09); }); },
  task() { [79, 83, 86, 91, 95].forEach((n, i) => tone(note(n), 0.4, 0.12, 'sine', i * 0.06)); },
  blip() { tone(note(84 + Math.floor(Math.random() * 3) * 2), 0.04, 0.05, 'triangle'); },
  bubble() { tone(400, 0.15, 0.14, 'sine', 0, 3); },
  open() { tone(500, 0.1, 0.08, 'sine', 0, 1.5); },
};

// ---------------------------------------------------------------- music
// Slow I–vi–IV–V loop with a soft pad, a lazy arpeggio and a little melody.
const CHORDS = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
const MELODY = [76, -1, 79, 76, 74, -1, 72, -1, 72, -1, 76, 74, 72, -1, 69, -1, 69, -1, 72, 69, 67, -1, 65, -1, 67, -1, 71, 74, 74, -1, -1, -1];
const BEAT = 60 / 84 / 2; // eighth notes at 84 bpm

function scheduleMusic() {
  while (nextBeat < ctx.currentTime + 0.3) {
    const when = nextBeat - ctx.currentTime;
    const bar = Math.floor(beat / 8) % 4, step = beat % 8;
    const ch = CHORDS[bar];
    if (step === 0) {
      for (const n of ch) tone(note(n - 12), BEAT * 8, 0.035, 'sine', when, 0, musicBus);
      tone(note(ch[0] - 24), BEAT * 4, 0.06, 'triangle', when, 0, musicBus);
    }
    if (step === 4) tone(note(ch[0] - 24), BEAT * 4, 0.045, 'triangle', when, 0, musicBus);
    const arp = [0, 1, 2, 1][step % 4];
    tone(note(ch[arp] + 12), BEAT * 1.6, 0.028, 'triangle', when, 0, musicBus);
    const m = MELODY[beat % MELODY.length];
    if (m > 0 && Math.floor(beat / 32) % 2 === 1) tone(note(m), BEAT * 2.2, 0.04, 'sine', when, 0, musicBus);
    nextBeat += BEAT; beat++;
  }
}

export function setMusic(on) {
  settings.music = on;
  if (!ctx) return;
  musicBus.gain.cancelScheduledValues(ctx.currentTime);
  musicBus.gain.linearRampToValueAtTime(on ? 0.7 : 0, ctx.currentTime + 0.6);
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
