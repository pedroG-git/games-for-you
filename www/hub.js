// Home screen: game tiles + "new version" check against GitHub Releases
(() => {
  const REPO = 'pedroG-git/games-for-you';
  const $ = (id) => document.getElementById(id);
  const current = window.APP_VERSION || '0.0.0';

  // replace(), so the back gesture never steps back into a game that was already left
  const open = (e) => {
    e.preventDefault();
    const href = e.currentTarget.href;
    document.body.classList.add('leaving');
    setTimeout(() => location.replace(href), 140);
  };

  const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const day = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const num = (x) => Math.max(0, Math.floor(+x || 0));
  // Small "something is waiting today" badges. Each returns [emoji, label], or '' when nothing is waiting.
  // The games write these keys themselves; a missing or broken key never breaks the home screen.
  const BADGES = {
    dragon() {
      const s = read('dragon-save');
      return s && s.level >= 2 && !(s.gift && s.gift.day === day(new Date())) ? ['🎁', 'Daily gift'] : '';
    },
    blocos() {
      const s = read('blocos-daily') || {};
      if (s.last === day(new Date())) return '';
      const y = new Date(); y.setDate(y.getDate() - 1);
      return ['📅' + (s.streak > 0 && s.last === day(y) ? '🔥' + s.streak : ''), 'Daily puzzle'];
    },
    linhas() {
      const d = read('linhas-daily'), t = new Date();
      return d && d.date === t.getFullYear() * 10000 + (t.getMonth() + 1) * 100 + t.getDate() ? '' : ['📅', 'Daily challenge'];
    },
    // Only once the game has been started, so a game never tried doesn't nag.
    mahjong() {
      const s = read('mahjong-save');
      return s && s.level >= 2 && !(s.daily && s.daily[iso(new Date())]) ? ['📅', 'Daily puzzle'] : '';
    },
    paciencia() {
      const s = read('paciencia-v1');
      const played = s && s.stats && Object.values(s.stats).some((x) => x && x.played > 0);
      return played && !(s.daily && s.daily[iso(new Date())]) ? ['📅', 'Game of the day'] : '';
    },
    garden() {
      const s = read('flower-garden-v1');
      return s && s.seenIntro && s.daily && s.daily.last !== day(new Date()) ? ['🎁', 'Daily gift'] : '';
    },
  };
  // How far each game has got, shown on its card. Read from the games' own saves; '' shows nothing.
  const LINHAS_GOALS = [300, 800, 1500]; // the star scores in games/linhas/js/cities.js
  const PROGRESS = {
    bus() { const s = read('bus-save'); return s && s.wins > 0 ? `Level ${num(s.level)}` : ''; },
    dragon() { const s = read('dragon-save'); return s && s.level > 1 ? `Level ${num(s.level)}` : ''; },
    mahjong() { const s = read('mahjong-save'); return s && s.level > 1 ? `Level ${num(s.level)}` : ''; },
    garden() { const s = read('flower-garden-v1'); return s && s.level > 1 ? `Level ${num(s.level)}` : ''; },
    blocos() { const b = num(read('blocos-best')); return b ? `👑 ${b.toLocaleString('en')}` : ''; },
    paciencia() {
      const s = read('paciencia-v1');
      const won = s && s.stats ? Object.values(s.stats).reduce((a, x) => a + num(x && x.won), 0) : 0;
      return won ? `🏆 ${won} won` : '';
    },
    linhas() {
      // Each city's best in any mode (Normal, Relaxed, Daily), like the game's own stars.
      const city = {};
      for (const [k, v] of Object.entries(read('linhas-best') || {})) {
        const c = k.replace(/-(relaxed|daily)$/, '');
        city[c] = Math.max(city[c] || 0, num(v));
      }
      const stars = Object.values(city).reduce((a, v) => a + LINHAS_GOALS.filter((g) => v >= g).length, 0);
      return stars ? `★ ${stars}` : '';
    },
  };
  const folder = (g) => g.path.split('/')[1];
  const badgeOf = (g) => { try { return (BADGES[folder(g)] || (() => ''))(); } catch { return ''; } };
  const progressOf = (g) => { try { return (PROGRESS[folder(g)] || (() => ''))(); } catch { return ''; } };

  // Most recently played first; games never played keep their order below.
  const played = read('gfy-played') || {};
  const games = window.GAMES.map((g, i) => ({ g, i })).sort((a, b) => {
    return (+played[folder(b.g)] || 0) - (+played[folder(a.g)] || 0) || a.i - b.i;
  }).map((o) => o.g);

  games.forEach((g, i) => {
    const a = document.createElement('a');
    a.className = 'tile';
    a.href = g.path;
    a.style.setProperty('--c', g.color);
    a.style.setProperty('--i', i);
    a.innerHTML = '<img alt=""><b></b><small></small>';
    const badge = badgeOf(g), progress = progressOf(g);
    if (badge) {
      const em = document.createElement('em');
      em.textContent = badge[0];
      em.title = badge[1];
      a.append(em);
    }
    if (progress) {
      const p = document.createElement('span');
      p.className = 'progress';
      p.textContent = progress;
      a.append(p);
    }
    a.querySelector('img').src = g.icon;
    a.querySelector('b').textContent = g.name;
    a.querySelector('small').textContent = g.tag || '';
    // Read aloud as one sentence: name, what it is, how far, what's waiting.
    a.setAttribute('aria-label', [g.name, g.tag, progress, badge && badge[1]].filter(Boolean).join('. '));
    a.addEventListener('click', open);
    $('games').append(a);
  });

  // "Keep playing": the game opened last (remembered by shared/nav.js)
  let lastGame = '';
  try { lastGame = localStorage.getItem('gfy-last') || ''; } catch {}
  const last = window.GAMES.find((g) => g.path.split('/')[1] === lastGame);
  if (last) {
    const a = $('last');
    a.href = last.path;
    a.style.setProperty('--c', last.color);
    a.querySelector('img').src = last.icon;
    a.querySelector('b').textContent = last.name;
    const lb = badgeOf(last), lp = progressOf(last);
    a.querySelector('small').textContent = ['Keep playing', lp, lb && lb[0]].filter(Boolean).join(' · ');
    a.setAttribute('aria-label', ['Keep playing ' + last.name, lp, lb && lb[1]].filter(Boolean).join('. '));
    a.addEventListener('click', open);
    a.hidden = false;
  }

  const h = new Date().getHours();
  $('hello').textContent = h < 5 ? 'Good night!' : h < 12 ? 'Good morning!' : h < 19 ? 'Good afternoon!' : 'Good evening!';
  $('version').textContent = `Version ${current}`;

  const parse = (v) => String(v).replace(/^v/, '').split('.').map((x) => parseInt(x, 10) || 0);
  function newer(a, b) {
    const x = parse(a), y = parse(b);
    for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
    return false;
  }

  // The download page on the website: it always offers the newest APK, so an update never stops at an in-between version.
  const SITE = 'https://pedrog-git.github.io/games-for-you/';
  let downloadUrl = '';
  // Latest version: GitHub Pages first (no rate limit), GitHub API as a fallback.
  async function latest() {
    try {
      const r = await fetch(`https://pedrog-git.github.io/games-for-you/version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (r.ok) {
        const { version } = await r.json();
        if (version) return { version, url: SITE };
      }
    } catch {}
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    const rel = await r.json();
    return { version: rel.tag_name, url: SITE };
  }

  async function check(manual) {
    if (manual) $('check').textContent = 'Checking…';
    try {
      const rel = await latest();
      if (newer(rel.version, current)) {
        downloadUrl = rel.url;
        $('updateText').textContent = `Version ${String(rel.version).replace(/^v/, '')} is ready!`;
        $('update').hidden = false;
        if (manual) $('check').textContent = 'Check for updates';
      } else if (manual) {
        $('check').textContent = 'You have the newest version';
      }
    } catch {
      if (manual) $('check').textContent = navigator.onLine === false ? 'No internet? Try again later' : 'Could not check. Try again later';
    }
  }

  // Opens the website in the phone's browser; its download button gets the newest APK, tapping the download installs it.
  $('updateBtn').addEventListener('click', () => downloadUrl && (location.href = downloadUrl));
  $('check').addEventListener('click', () => check(true));
  check(false);
  // The app can stay open in the background for days: check again whenever it comes back.
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check(false));
  // Restored from the page cache: rebuild so badges and order are current.
  addEventListener('pageshow', (e) => e.persisted && location.reload());
})();
