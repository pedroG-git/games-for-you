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

export const play = {
  pick() { tone(760, 0.06, 0.1, 'triangle', 0, 1.3); },
  place() { tone(220, 0.09, 0.22, 'square', 0, 0.6); tone(440, 0.05, 0.08, 'triangle'); buzz(8); },
  back() { tone(500, 0.1, 0.08, 'sine', 0, 0.6); },
  // Rising arpeggio: more lines = more notes, combo = higher pitch.
  clear(lines, combo) {
    const base = 67 + PENTA[Math.min(combo, 6)];
    const n = Math.min(2 + lines, 7);
    for (let i = 0; i < n; i++) {
      tone(note(base + PENTA[i]), 0.22, 0.17, 'triangle', i * 0.055);
      tone(note(base + PENTA[i] + 12), 0.16, 0.05, 'sine', i * 0.055);
    }
    tone(90, 0.3, 0.25, 'sine', 0, 0.5); // thump
    buzz(lines >= 2 ? [25, 40, 35] : 25);
  },
  praise() { [72, 76, 79, 84, 88].forEach((n, i) => tone(note(n), 0.3, 0.12, 'square', i * 0.06)); },
  allClear() { [72, 76, 79, 84, 79, 84, 88, 91].forEach((n, i) => tone(note(n), 0.35, 0.13, 'triangle', i * 0.07)); },
  deal() { [0, 1, 2].forEach((i) => tone(note(79 + i * 4), 0.08, 0.06, 'sine', i * 0.05)); },
  undo() { tone(700, 0.18, 0.1, 'sine', 0, 0.5); },
  over() { [67, 63, 60, 55].forEach((n, i) => tone(note(n), 0.4, 0.14, 'triangle', i * 0.18)); buzz(60); },
  best() { [72, 76, 79, 84, 88, 91, 96].forEach((n, i) => { tone(note(n), 0.4, 0.13, 'triangle', i * 0.08); tone(note(n + 12), 0.3, 0.04, 'sine', i * 0.08); }); },
  tap() { tone(660, 0.06, 0.12, 'triangle', 0, 1.4); },
};

// ---------------------------------------------------------------- music
// Bouncy I–V–vi–IV loop: bass, offbeat chord stabs and a melody every other round.
const CHORDS = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]];
const MELODY = [72, -1, 76, 79, 79, -1, 76, -1, 74, -1, 71, 74, 79, -1, -1, -1, 76, -1, 72, 76, 81, -1, 79, 76, 77, -1, 76, 74, 72, -1, -1, -1];
const BEAT = 60 / 112 / 2; // eighth notes at 112 bpm

function scheduleMusic() {
  while (nextBeat < ctx.currentTime + 0.3) {
    const when = nextBeat - ctx.currentTime;
    const bar = Math.floor(beat / 8) % 4, step = beat % 8;
    const ch = CHORDS[bar];
    if (step % 4 === 0) tone(note(ch[0] - 24), BEAT * 1.8, 0.07, 'triangle', when, 0, musicBus);
    if (step % 4 === 2) tone(note(ch[0] - 17), BEAT * 1.2, 0.04, 'triangle', when, 0, musicBus);
    if (step % 2 === 1) for (const n of ch) tone(note(n), BEAT * 0.7, 0.018, 'square', when, 0, musicBus);
    const m = MELODY[beat % MELODY.length];
    if (m > 0 && Math.floor(beat / 32) % 2 === 1) tone(note(m), BEAT * 1.6, 0.035, 'triangle', when, 0, musicBus);
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
