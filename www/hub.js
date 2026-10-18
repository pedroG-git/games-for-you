// Home screen: game tiles + "new version" check against GitHub Releases
(() => {
  const REPO = 'pedroG-git/games-for-you';
  const APK = 'games-for-you.apk';
  const $ = (id) => document.getElementById(id);
  const current = window.APP_VERSION || '0.0.0';

  for (const g of window.GAMES) {
    const a = document.createElement('a');
    a.className = 'tile';
    a.href = g.path;
    a.style.setProperty('--c', g.color);
    a.innerHTML = `<img src="${g.icon}" alt=""><span></span>`;
    a.querySelector('span').textContent = g.name;
    $('games').append(a);
  }
  $('version').textContent = `Version ${current}`;

  const parse = (v) => String(v).replace(/^v/, '').split('.').map((x) => parseInt(x, 10) || 0);
  function newer(a, b) {
    const x = parse(a), y = parse(b);
    for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
    return false;
  }

  let downloadUrl = '';
  // Latest version: GitHub Pages first (no rate limit), GitHub API as a fallback.
  async function latest() {
    try {
      const r = await fetch(`https://pedrog-git.github.io/games-for-you/version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (r.ok) {
        const { version } = await r.json();
        if (version) return { version, url: `https://github.com/${REPO}/releases/download/v${version}/${APK}` };
      }
    } catch {}
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    const rel = await r.json();
    const asset = (rel.assets || []).find((x) => x.name === APK);
    return { version: rel.tag_name, url: asset ? asset.browser_download_url : rel.html_url };
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

  // Opens the APK in the phone's browser, which downloads it; tapping the download installs the update.
  $('updateBtn').addEventListener('click', () => downloadUrl && (location.href = downloadUrl));
  $('check').addEventListener('click', () => check(true));
  check(false);
})();
