// Shared by the home screen and every game: the 🏠 button and the phone's back gesture.
//
// In a game:
//   <button class="gfy-home" aria-label="All games"></button>   → goes to the home screen (styled by nav.css)
//   GFY.back([['#popup', '#popup-close'], ['#level', '#level-back']])
//     Back steps, top-most first. On back, the first step whose element is on screen runs:
//     its button is clicked (or nothing happens, if the button is null). If none is on screen, back goes home.
// On the home screen, back puts the app in the background, like any other Android app.
(() => {
  const inGame = location.pathname.includes('/games/');
  const steps = [];

  const shown = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';

  function home() {
    location.replace(inGame ? '../../index.html' : 'index.html');
  }

  let lastBack = 0;
  function back() {
    if (Date.now() - lastBack < 300) return;
    lastBack = Date.now();
    if (!inGame) return app && (app.minimizeApp ? app.minimizeApp() : app.exitApp());
    for (const [where, button] of steps) {
      if (!shown(document.querySelector(where))) continue;
      if (button) document.querySelector(button)?.click();
      return;
    }
    home();
  }

  window.GFY = { home, back: (list) => steps.push(...list) };

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.gfy-home')) return;
    e.preventDefault();
    e.stopPropagation();
    home();
  }, true);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') back(); });

  // Android back button / back swipe (needs the @capacitor/app plugin; does nothing in a browser).
  const C = window.Capacitor;
  const app = C && C.isNativePlatform && C.isNativePlatform() ? (C.Plugins && C.Plugins.App) || (C.registerPlugin && C.registerPlugin('App')) : null;
  if (app) app.addListener('backButton', back);

  // Remembered so the home screen can offer "Keep playing".
  if (inGame) {
    const game = location.pathname.split('/games/')[1].split('/')[0];
    try { localStorage.setItem('gfy-last', game); } catch {}
  }
})();
