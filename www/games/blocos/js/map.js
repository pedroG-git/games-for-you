// Adventures map: a winding path of level bubbles, 10 per world, level 1 at the bottom. Endless:
// it always shows the worlds up to the one after her current level.
import { WORLDS, rngFrom } from './levels.js';
import { play } from './audio.js';

const STEP = 92; // px between levels (also across world borders, so the path joins up)
const X = (n) => 50 + Math.sin(n * 0.85) * 26; // bubble x in % of width

export function renderMap(scroller, el, stars, unlocked, onTap) {
  const worlds = Math.floor((unlocked - 1) / 10) + 2;
  const h = STEP * 10;
  el.innerHTML = '';
  let current = null;
  for (let w = 0; w < worlds; w++) {
    const W = WORLDS[w % WORLDS.length], band = document.createElement('section');
    band.className = 'world';
    band.style.height = h + 'px';
    band.style.background = `linear-gradient(${W.bg[0]}, ${W.bg[1]})`;
    band.classList.toggle('dark', w % WORLDS.length === 4);
    const y = (k) => h - STEP / 2 - k * STEP; // k = 0..9 inside this world, measured from the bottom

    // Path: smooth S-curves through every bubble, running past both edges so worlds join up.
    let d = '';
    for (let k = -1; k <= 10; k++) {
      const n = w * 10 + k + 1, px = X(n), py = y(k);
      if (k === -1) d = `M${px} ${py}`;
      else { const pp = y(k - 1), mid = (pp + py) / 2; d += ` C${X(n - 1)} ${mid} ${px} ${mid} ${px} ${py}`; }
    }
    band.innerHTML = `<svg viewBox="0 0 100 ${h}" preserveAspectRatio="none"><path d="${d}"/></svg>`
      + `<div class="wname ${X(w * 10 + 1) > 50 ? 'l' : 'r'}">World ${w + 1} · ${W.name}</div>`;

    // Decorations along the sides.
    const rng = rngFrom(w * 31 + 7);
    for (let i = 0; i < 7; i++) {
      const s = document.createElement('span');
      s.className = 'deco';
      s.textContent = W.deco[i % W.deco.length];
      s.style.left = (i % 2 ? 80 + rng() * 12 : 2 + rng() * 12) + '%';
      s.style.top = 40 + (i / 7) * (h - 100) + rng() * 40 + 'px';
      s.style.transform = `rotate(${rng() * 40 - 20}deg)`;
      band.appendChild(s);
    }

    for (let k = 0; k < 10; k++) {
      const n = w * 10 + k + 1, got = stars[n] || 0;
      const b = document.createElement('button');
      b.className = 'lv' + (n > unlocked ? ' locked' : n === unlocked ? ' cur' : '') + (got === 3 ? ' gold' : '');
      b.style.left = X(n) + '%';
      b.style.top = y(k) + 'px';
      b.innerHTML = `<b>${n > unlocked ? '🔒' : n}</b><span class="st">${[1, 2, 3].map((s) => `<i class="${got >= s ? 'on' : ''}">★</i>`).join('')}</span>`;
      b.addEventListener('click', () => {
        if (n > unlocked) { play.locked(); b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); return; }
        onTap(n);
      });
      if (n === unlocked) {
        const t = document.createElement('div');
        t.className = 'token';
        b.appendChild(t);
        current = b;
      }
      band.appendChild(b);
    }
    el.prepend(band); // later worlds go on top
  }
  requestAnimationFrame(() => {
    if (current) scroller.scrollTop = current.offsetTop + current.parentNode.offsetTop - scroller.clientHeight * 0.6;
  });
}
