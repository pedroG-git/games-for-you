// Synthesized sound effects (WebAudio, no files) + vibration
window.Sfx = (() => {
  let ac = null;
  let muted = false;

  // iOS only allows audio after a touch: call this from a touch/click handler
  function unlock() {
    if (!ac) {
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        return;
      }
    }
    if (ac.state === 'suspended') ac.resume();
  }

  function tone(freq, dur, type = 'sine', vol = 0.12, when = 0, slideTo = 0) {
    if (muted || !ac) return;
    const t = ac.currentTime + when;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ac.destination);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  return {
    unlock,
    setMuted(m) {
      muted = !!m;
    },
    vibrate(p) {
      if (!muted && navigator.vibrate) {
        try {
          navigator.vibrate(p);
        } catch {}
      }
    },
    tap() {
      tone(480, 0.09, 'triangle', 0.16, 0, 820);
    },
    park() {
      tone(300, 0.07, 'sine', 0.08);
    },
    blocked() {
      tone(170, 0.15, 'square', 0.06, 0, 110);
    },
    noslot() {
      tone(220, 0.12, 'square', 0.06);
      tone(180, 0.16, 'square', 0.06, 0.12);
    },
    board(i) {
      tone(620 + (i % 8) * 40, 0.045, 'sine', 0.05);
    },
    honk() {
      tone(392, 0.11, 'square', 0.05);
      tone(330, 0.2, 'square', 0.05, 0.12);
    },
    shuffle() {
      [520, 660, 590, 740].forEach((f, i) => tone(f, 0.07, 'triangle', 0.1, i * 0.05));
    },
    reward() {
      [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.14, 'sine', 0.1, i * 0.08));
    },
    win() {
      [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.2, 'triangle', 0.13, i * 0.11));
    },
    lose() {
      [392, 330, 262, 196].forEach((f, i) => tone(f, 0.28, 'sawtooth', 0.05, i * 0.17));
    },
  };
})();
