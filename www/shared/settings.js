// One settings panel for every game, plus the gear button that opens it. Load after nav.js, with settings.css.
//
//   GFY.settings.init({
//     lang: 'en' | 'pt',                               // wording of the fixed rows (default 'en')
//     sfx:   { get: () => bool, set: (bool) => {} },   // 🔊 Sounds
//     music: { get, set },                             // 🎵 Music: leave out if the game has no music
//     vib:   { get, set },                             // 📳 Vibration
//     extras: [                                        // the game's own rows, between Vibration and Done
//       { type: 'toggle', label: '🌙 Night map', get, set },
//       { type: 'seg', label: 'Tiles', options: [['classic', '🀄 Classic'], ['pics', '🍎 Pictures']], get, set },
//       { type: 'node', label: '🎨 Theme', el: someElement },   // the element is moved into the panel
//       { type: 'button', label: 'Restart game', onClick, close: true, danger: false },   // label/hidden may be functions
//     ],
//     onOpen, onClose,                                 // optional hooks
//   });
//   GFY.settings.open() / close() / isOpen() / refresh()
//
// Every element with class "gfy-gear" opens the panel. Saving stays in the game: set() writes the game's own storage key.
(() => {
  const TEXT = {
    en: { title: 'Settings', sfx: '🔊 Sounds', music: '🎵 Music', vib: '📳 Vibration', done: 'Done' },
    pt: { title: 'Definições', sfx: '🔊 Som', music: '🎵 Música', vib: '📳 Vibração', done: 'Fechar' },
  };
  let ov = null, onOpen = null, onClose = null;
  const syncs = [];

  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };

  function toggle(label, ctl) {
    const row = el('div', 'gfy-set-row');
    row.appendChild(el('span', 'gfy-set-lbl', label));
    const sw = el('button', 'gfy-sw');
    sw.type = 'button'; sw.setAttribute('role', 'switch');
    const sync = () => sw.setAttribute('aria-checked', ctl.get() ? 'true' : 'false');
    sw.addEventListener('click', () => { ctl.set(!ctl.get()); sync(); });
    syncs.push(sync); sync();
    row.appendChild(sw);
    return row;
  }

  function seg(x) {
    const row = el('div', 'gfy-set-seg');
    row.appendChild(el('span', 'gfy-set-lbl', x.label));
    const opts = el('div', 'gfy-set-opts');
    const btns = x.options.map(([value, text]) => {
      const b = el('button', 'gfy-opt', text);
      b.type = 'button';
      b.addEventListener('click', () => { x.set(value); sync(); });
      opts.appendChild(b);
      return [value, b];
    });
    const sync = () => { for (const [v, b] of btns) b.setAttribute('aria-pressed', String(x.get() === v)); };
    syncs.push(sync); sync();
    row.appendChild(opts);
    return row;
  }

  function init(o) {
    const t = TEXT[o.lang] || TEXT.en;
    ov = el('div', 'gfy-set-ov');
    ov.hidden = true;
    const box = el('div', 'gfy-set-box');
    box.setAttribute('role', 'dialog');
    box.appendChild(el('h2', 'gfy-set-title', t.title));
    box.appendChild(toggle(t.sfx, o.sfx));
    if (o.music) box.appendChild(toggle(t.music, o.music));
    box.appendChild(toggle(t.vib, o.vib));
    for (const x of o.extras || []) {
      if (x.type === 'toggle') box.appendChild(toggle(x.label, x));
      else if (x.type === 'seg') box.appendChild(seg(x));
      else if (x.type === 'node') {
        const w = el('div', 'gfy-set-node');
        if (x.label) w.appendChild(el('span', 'gfy-set-lbl', x.label));
        x.el.hidden = false;
        w.appendChild(x.el);
        box.appendChild(w);
      } else if (x.type === 'button') {
        const b = el('button', 'gfy-set-btn' + (x.danger ? ' danger' : ''), typeof x.label === 'function' ? x.label() : x.label);
        b.type = 'button';
        if (typeof x.label === 'function' || x.hidden) syncs.push(() => { if (typeof x.label === 'function') b.textContent = x.label(); if (x.hidden) b.hidden = !!x.hidden(); });
        b.addEventListener('click', () => { if (x.close) close(); x.onClick(); });
        box.appendChild(b);
      }
    }
    const done = el('button', 'gfy-set-done', t.done);
    done.type = 'button';
    done.addEventListener('click', close);
    box.appendChild(done);
    ov.appendChild(box);
    ov.addEventListener('pointerdown', (e) => { if (e.target === ov) close(); });
    document.body.appendChild(ov);
    onOpen = o.onOpen; onClose = o.onClose;
    // The phone's back gesture closes the panel before anything underneath it.
    if (window.GFY && GFY.backTop) GFY.backTop([['.gfy-set-ov', '.gfy-set-done']]);
    for (const g of document.querySelectorAll('.gfy-gear, .b-set')) {
      g.addEventListener('click', open);
      if (!g.getAttribute('aria-label')) g.setAttribute('aria-label', t.title);
    }
  }

  function refresh() { for (const s of syncs) s(); }
  function open() {
    if (!ov) return;
    refresh();
    ov.hidden = false;
    if (onOpen) onOpen();
  }
  function close() {
    if (!ov || ov.hidden) return;
    ov.hidden = true;
    if (onClose) onClose();
  }
  const isOpen = () => !!ov && !ov.hidden;

  (window.GFY = window.GFY || {}).settings = { init, open, close, isOpen, refresh };
})();
