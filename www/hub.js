// Home screen: game tiles + "new version" check against GitHub Releases
(() => {
  const REPO = 'pedroG-git/games-for-you';
  const $ = (id) => document.getElementById(id);
  const current = window.APP_VERSION || '0.0.0';

  // replace(), so the back gesture never steps back into a game that was already left
  const open = (e) => { e.preventDefault(); location.replace(e.currentTarget.href); };

  window.GAMES.forEach((g, i) => {
    const a = document.createElement('a');
    a.className = 'tile';
    a.href = g.path;
    a.style.setProperty('--c', g.color);
    a.style.setProperty('--i', i);
    a.innerHTML = '<img alt=""><b></b><small></small>';
    a.querySelector('img').src = g.icon;
    a.querySelector('b').textContent = g.name;
    a.querySelector('small').textContent = g.tag || '';
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
})();
