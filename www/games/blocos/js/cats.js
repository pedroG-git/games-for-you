// Meme (white, with crown) and Mimi (Siamese) — same drawings as in Joana's Garden.
let uid = 0;

// Inner cat drawing in a 0..100 box (no <svg> wrapper), so scenes can nest it.
function catBody(kind) {
  const id = `cg${++uid}`;
  const mimi = kind === 'mimi';
  const head = mimi ? '#f3e6cf' : '#ffffff';
  const line = mimi ? '#c9b48f' : '#d8d0d8';
  const ear = mimi ? '#5a3f33' : '#ffffff';
  const inner = mimi ? '#8a6656' : '#f7b6c8';
  const eye = mimi ? '#4f9fe0' : '#5fb2ec';
  return `
  <defs><radialGradient id="${id}" cx="50%" cy="62%" r="42%">
    <stop offset="0" stop-color="#5a3f33" stop-opacity=".95"/><stop offset=".55" stop-color="#7a5646" stop-opacity=".75"/><stop offset="1" stop-color="#f3e6cf" stop-opacity="0"/>
  </radialGradient></defs>
  <path d="M16 46 L20 8 L46 30 Z" fill="${ear}" stroke="${line}" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M84 46 L80 8 L54 30 Z" fill="${ear}" stroke="${line}" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M23 36 L24 18 L38 30 Z" fill="${inner}"/>
  <path d="M77 36 L76 18 L62 30 Z" fill="${inner}"/>
  <ellipse cx="50" cy="58" rx="39" ry="33" fill="${head}" stroke="${line}" stroke-width="2.5"/>
  ${mimi ? `<ellipse cx="50" cy="66" rx="24" ry="21" fill="url(#${id})"/>` : ''}
  <ellipse cx="35" cy="54" rx="8" ry="9.5" fill="${eye}"/><ellipse cx="65" cy="54" rx="8" ry="9.5" fill="${eye}"/>
  <ellipse cx="35.5" cy="55" rx="4" ry="6" fill="#1f2433"/><ellipse cx="65.5" cy="55" rx="4" ry="6" fill="#1f2433"/>
  <circle cx="33" cy="51" r="2.6" fill="#fff"/><circle cx="63" cy="51" r="2.6" fill="#fff"/>
  <circle cx="37.5" cy="58" r="1.2" fill="#fff"/><circle cx="67.5" cy="58" r="1.2" fill="#fff"/>
  <path d="M46 66 L54 66 L50 71 Z" fill="${mimi ? '#3d2a22' : '#f48fae'}" stroke-linejoin="round"/>
  <path d="M50 71 Q46 77 41 74 M50 71 Q54 77 59 74" fill="none" stroke="${mimi ? '#3d2a22' : '#9a8a94'}" stroke-width="2" stroke-linecap="round"/>
  <g stroke="${mimi ? '#8a7a6a' : '#b9b1b9'}" stroke-width="1.6" stroke-linecap="round">
    <path d="M28 66 L8 62 M28 70 L9 72 M72 66 L92 62 M72 70 L91 72"/>
  </g>
  ${mimi ? '' : `<ellipse cx="27" cy="66" rx="5" ry="3" fill="#f7b6c8" opacity=".6"/><ellipse cx="73" cy="66" rx="5" ry="3" fill="#f7b6c8" opacity=".6"/>
  <path d="M38 27 L40 15 L45 22 L50 12 L55 22 L60 15 L62 27 Z" fill="#f5c542" stroke="#d49a12" stroke-width="1.6" stroke-linejoin="round"/>
  <circle cx="50" cy="22" r="2" fill="#e86a92"/>`}`;
}

export function catSVG(kind) {
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${catBody(kind)}</svg>`;
}
