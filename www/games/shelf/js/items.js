// The shop's goods, drawn as SVG in a 60×80 box (standing on y = 78). Brands are made up.
const O = '#3b2340';
const line = `stroke="${O}" stroke-width="2.4" stroke-linejoin="round"`;
const shine = (d) => `<path d="${d}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="3" stroke-linecap="round"/>`;
const word = (x, y, s, fill, size = 8, rot = 0) =>
  `<text x="${x}" y="${y}" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="${size}" text-anchor="middle" fill="${fill}"${rot ? ` transform="rotate(${rot} ${x} ${y})"` : ''}>${s}</text>`;

const bottle = (body, cap, label, text, ink = '#fff') => `
  <path d="M24 8h12v7c0 4 9 8 9 17v42q0 4-4 4H19q-4 0-4-4V32c0-9 9-13 9-17z" fill="${body}" ${line}/>
  <rect x="22.5" y="3" width="15" height="8" rx="2" fill="${cap}" ${line}/>
  <rect x="15.5" y="42" width="29" height="18" fill="${label}"/>${word(30, 54.5, text, ink, 8)}
  ${shine('M21 34v32')}`;
const carton = (body, top, text, ink) => `
  <path d="M14 24l8-14h16l8 14v52q0 2-2 2H16q-2 0-2-2z" fill="${body}" ${line}/>
  <path d="M14 24h32M22 10l-2 14M38 10l2 14" fill="none" ${line}/><path d="M22 10h16l-2-6H24z" fill="${top}" ${line}/>
  <rect x="14" y="38" width="32" height="22" fill="${top}"/>${word(30, 52, text, ink, 8)}${shine('M18 30v40')}`;
const zig = (y) => 'M13 ' + y + Array.from({ length: 8 }, (_, k) => ` l2.1 -3 l2.1 3`).join('');
const bag = (body, band, text, ink) => `
  <path d="M13 8h34v6l3 56-3 6v4H13v-4l-3-6 3-56z" fill="${body}" ${line}/>
  <path d="${zig(14)} M13 74h34" fill="none" stroke="${O}" stroke-width="1.6" opacity=".5"/><path d="M15 12h30" stroke="#fff" stroke-opacity=".4" stroke-width="2"/>
  <ellipse cx="30" cy="44" rx="17" ry="12" fill="${band}"/>${word(30, 47.5, text, ink, 9, -8)}
  ${shine('M17 20v40')}`;
const jar = (fill, lid, label, text) => `
  <rect x="13" y="22" width="34" height="56" rx="9" fill="${fill}" ${line}/>
  <rect x="11" y="11" width="38" height="13" rx="3" fill="${lid}" ${line}/>
  <rect x="17" y="40" width="26" height="20" rx="3" fill="${label}"/>${word(30, 53.5, text, O, 7.5)}${shine('M18 30v40')}`;
const box = (body, front, text, ink, x2 = '') => `
  <rect x="9" y="14" width="42" height="64" rx="3" fill="${body}" ${line}/>
  <rect x="13" y="22" width="34" height="32" rx="4" fill="${front}"/>${x2}${word(30, 68, text, ink, 9)}${shine('M14 18v14')}`;

// [name, svg]
export const TYPES = [
  ['Fizz cola', bottle('#7a1b16', '#e23b2e', '#e23b2e', 'FIZZ')],
  ['Water', bottle('#9fd8f5', '#2d7fd1', '#2d7fd1', 'AQUA')],
  ['Lime soda', bottle('#3fae49', '#1f7a2c', '#f6e84c', 'LIMO', '#1f7a2c')],
  ['Orange juice', carton('#ff9a2a', '#fff3d6', 'SUNNY', '#e8601c')],
  ['Milk', carton('#ffffff', '#5aa9e6', 'MOO', '#fff')],
  ['Crispo chips', bag('#ffd23a', '#e2342f', 'Crispo', '#fff')],
  ['Blue chips', bag('#3d6fe0', '#ffe066', 'WAVY', '#3d6fe0')],
  ['Pear', `<path d="M30 14c-6 0-8 8-9 16-1 6-10 12-10 26 0 13 9 22 19 22s19-9 19-22c0-14-9-20-10-26-1-8-3-16-9-16z" fill="#c6dc3a" ${line}/>
    <path d="M30 14q1-6 4-9" fill="none" ${line}/><path d="M33 9q8-4 12 1-6 5-12-1z" fill="#4caf50" ${line}/>${shine('M18 50q0 10 6 16')}`],
  ['Pineapple', `<path d="M30 30l-8-20 6 6 2-12 2 12 6-6z" fill="#3e9a3a" ${line}/>
    <ellipse cx="30" cy="55" rx="15" ry="23" fill="#f2a72e" ${line}/>
    <path d="M18 44l24 24M16 56l18 18M24 34l20 20M42 44L18 68M44 56L26 74M36 34L16 54" stroke="#b86a12" stroke-width="1.6" opacity=".7"/>${shine('M20 46v14')}`],
  ['Apple', `<path d="M30 30c-4-5-20-6-20 14 0 18 12 34 20 30 8 4 20-12 20-30 0-20-16-19-20-14z" fill="#e8343a" ${line}/>
    <path d="M30 30q0-10 4-14" fill="none" ${line}/><path d="M33 20q10-6 13 2-8 4-13-2z" fill="#4caf50" ${line}/>${shine('M16 44q0 10 5 16')}`],
  ['Bananas', `<path d="M12 30q4 34 34 42 6 0 4-4-24-8-30-40z" fill="#ffd93b" ${line}/>
    <path d="M18 24q2 34 32 44 5-1 3-5-20-10-26-40z" fill="#ffe66b" ${line}/><path d="M14 20l6 4 6-3" fill="#7a5a2a" ${line}/>`],
  ['Teddy', `<circle cx="17" cy="20" r="7" fill="#c98a4b" ${line}/><circle cx="43" cy="20" r="7" fill="#c98a4b" ${line}/>
    <ellipse cx="30" cy="62" rx="17" ry="16" fill="#c98a4b" ${line}/><circle cx="30" cy="30" r="15" fill="#d99a5b" ${line}/>
    <ellipse cx="30" cy="35" rx="7" ry="5" fill="#f3d3a8"/><circle cx="24" cy="27" r="2" fill="${O}"/><circle cx="36" cy="27" r="2" fill="${O}"/>
    <ellipse cx="30" cy="33" rx="2.6" ry="2" fill="${O}"/><path d="M22 47h16l-8 6z" fill="#e8508a" ${line}/>
    <ellipse cx="18" cy="74" rx="6" ry="4" fill="#d99a5b" ${line}/><ellipse cx="42" cy="74" rx="6" ry="4" fill="#d99a5b" ${line}/>`],
  ['Paper rolls', `<rect x="13" y="44" width="34" height="34" rx="4" fill="#fffdf6" ${line}/><rect x="13" y="10" width="34" height="34" rx="4" fill="#fffdf6" ${line}/>
    <ellipse cx="30" cy="12" rx="17" ry="5" fill="#f1ead7" ${line}/><ellipse cx="30" cy="12" rx="5" ry="2" fill="#b98f5a"/>
    <path d="M13 30h34M13 64h34" stroke="#ff8fb5" stroke-width="5"/>`],
  ['Tissues', `<rect x="9" y="30" width="42" height="48" rx="4" fill="#b388ff" ${line}/><path d="M22 30q2-16 8-18 6 2 8 18z" fill="#fff" ${line}/>
    <rect x="9" y="48" width="42" height="14" fill="#7c4dff"/>${word(30, 58.5, 'SOFTY', '#fff', 8)}${shine('M14 36v8')}`],
  ['Choco bar', `<rect x="14" y="8" width="32" height="70" rx="3" fill="#6b3a1e" ${line}/><path d="M14 8h32v20l-6-3-5 4-5-4-5 4-5-4-6 3z" fill="#c9cfd8" ${line}/>
    <rect x="14" y="38" width="32" height="26" fill="#d6452f"/>${word(30, 55, 'COCO', '#ffe8a8', 9)}`],
  ['Easter egg', `<path d="M30 8c-12 0-20 24-20 40s9 30 20 30 20-14 20-30S42 8 30 8z" fill="#fff4dc" ${line}/>
    <path d="M12 38q18 8 36 0M10 52q20 8 40 0M14 66q16 6 32 0" fill="none" stroke="#ff7a59" stroke-width="5"/>${shine('M18 30q-3 8-2 16')}`],
  ['Cereal', box('#ffcf33', '#ff6f3c', 'OATY', '#7a2e00', `<circle cx="24" cy="36" r="5" fill="#ffe8a8"/><circle cx="34" cy="31" r="5" fill="#ffe8a8"/><circle cx="36" cy="43" r="5" fill="#ffe8a8"/>`)],
  ['Ketchup', `<path d="M20 22h20l5 50q0 6-6 6H21q-6 0-6-6z" fill="#e2342f" ${line}/><rect x="22" y="10" width="16" height="12" rx="2" fill="#fff" ${line}/>
    <path d="M26 4h8v6h-8z" fill="#fff" ${line}/><rect x="17" y="44" width="26" height="16" fill="#fff"/>${word(30, 55.5, 'TOMA', '#e2342f', 7.5)}${shine('M21 28l-2 38')}`],
  ['Mustard', `<path d="M20 22h20l5 50q0 6-6 6H21q-6 0-6-6z" fill="#ffd21f" ${line}/><rect x="22" y="10" width="16" height="12" rx="2" fill="#e8401c" ${line}/>
    <path d="M27 2h6v8h-6z" fill="#e8401c" ${line}/><rect x="17" y="44" width="26" height="16" fill="#e8401c"/>${word(30, 55.5, 'YUMM', '#ffd21f', 7.5)}${shine('M21 28l-2 38')}`],
  ['Jam', jar('#b0174c', '#f2f2f2', '#fff', 'JAM')],
  ['Bread', `<path d="M8 40q0-22 22-22t22 22v34q0 4-4 4H12q-4 0-4-4z" fill="#d68a3c" ${line}/>
    <path d="M18 30q4 4 0 8M30 26q4 4 0 8M42 30q4 4 0 8" fill="none" stroke="#8a4f1a" stroke-width="2.4" stroke-linecap="round"/>${shine('M14 44v22')}`],
  ['Cheese', `<path d="M8 50l40-24 6 4v44q0 4-4 4H12q-4 0-4-4z" fill="#ffcb3d" ${line}/><path d="M8 50h46" ${line}/>
    <circle cx="20" cy="62" r="4" fill="#e8a62a"/><circle cx="38" cy="66" r="5" fill="#e8a62a"/><circle cx="46" cy="56" r="3" fill="#e8a62a"/><circle cx="40" cy="40" r="3" fill="#e8a62a"/>`],
  ['Donut', `<ellipse cx="30" cy="56" rx="22" ry="20" fill="#d99a5b" ${line}/><path d="M9 52q2-18 21-18t21 18q-4 6-10 2-6 6-11 1-5 5-11-1-6 4-10-2z" fill="#ff7eb6" ${line}/>
    <ellipse cx="30" cy="52" rx="7" ry="5" fill="#8a5a33" ${line}/><path d="M16 46l3 2M40 42l3-2M24 40l2 3M44 52l2 3M20 58l3-1" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`],
  ['Ice cream', `<path d="M17 38l13 40 13-40z" fill="#e8b468" ${line}/><path d="M20 46l20 0M22 54h16M24 62h12" stroke="#b77c34" stroke-width="1.8"/>
    <circle cx="30" cy="24" r="13" fill="#9be1c8" ${line}/><path d="M15 38q3-8 15-8t15 8q-5 3-8 0-4 4-7 0-4 4-7 0-4 3-8 0z" fill="#ffb3cc" ${line}/>
    <circle cx="30" cy="10" r="4" fill="#e8343a" ${line}/>`],
  ['Cupcake', `<path d="M14 50h32l-5 28H19z" fill="#5ab6e8" ${line}/><path d="M20 50l2 28M30 50v28M40 50l-2 28" stroke="#2d7fb1" stroke-width="1.6"/>
    <path d="M10 50q0-14 10-16 2-12 10-12t10 12q10 2 10 16z" fill="#fff0f6" ${line}/><circle cx="30" cy="18" r="5" fill="#e8343a" ${line}/>
    <path d="M18 42l3 1M38 40l3-2M28 36l2 2" stroke="#ff7eb6" stroke-width="2.4" stroke-linecap="round"/>`],
  ['Honey', jar('#f2a51f', '#8a5a2a', '#fff3c4', 'HONEY')],
  ['Soap', `<rect x="14" y="30" width="32" height="48" rx="8" fill="#ff8fc1" ${line}/><rect x="25" y="16" width="10" height="14" fill="#fff" ${line}/>
    <path d="M25 16h-4v-6h20v6h-6" fill="#fff" ${line}/><circle cx="30" cy="52" r="9" fill="#fff" opacity=".85"/><circle cx="27" cy="50" r="3" fill="#bde7ff"/><circle cx="33" cy="55" r="2" fill="#bde7ff"/>${shine('M19 36v34')}`],
  ['Flower pot', `<path d="M16 52h28l-4 26H20z" fill="#d9663a" ${line}/><rect x="13" y="48" width="34" height="8" rx="2" fill="#e8784a" ${line}/>
    <path d="M30 48V24" stroke="#3e9a3a" stroke-width="3"/><path d="M30 38q-10-2-12-8 8-2 12 8zM30 34q10-2 12-8-8-2-12 8z" fill="#4caf50" ${line}/>
    <g fill="#ffd23a" ${line}><circle cx="30" cy="12" r="6"/><circle cx="22" cy="18" r="6"/><circle cx="38" cy="18" r="6"/><circle cx="25" cy="26" r="6"/><circle cx="35" cy="26" r="6"/></g><circle cx="30" cy="20" r="5" fill="#e8601c" ${line}/>`],
  ['Gift', `<rect x="8" y="34" width="44" height="44" rx="3" fill="#7c4dff" ${line}/><rect x="6" y="26" width="48" height="12" rx="2" fill="#9c7bff" ${line}/>
    <path d="M26 26h8v52h-8z" fill="#ffd23a" ${line}/><path d="M30 26q-14-16-16-6t16 6q14-16 16-6t-16 6z" fill="#ffd23a" ${line}/>`],
  ['Melon slice', `<path d="M6 30h48q0 46-24 46T6 30z" fill="#3e9a3a" ${line}/><path d="M10 30h40q-2 40-20 40T10 30z" fill="#ff5a6e"/>
    <path d="M10 30h40" ${line}/><g fill="${O}"><ellipse cx="22" cy="42" rx="1.8" ry="3"/><ellipse cx="38" cy="42" rx="1.8" ry="3"/><ellipse cx="30" cy="52" rx="1.8" ry="3"/><ellipse cx="24" cy="58" rx="1.8" ry="3"/><ellipse cx="36" cy="58" rx="1.8" ry="3"/></g>`],
  ['Peach tea', `<rect x="15" y="16" width="30" height="62" rx="5" fill="#ffb07a" ${line}/><ellipse cx="30" cy="16" rx="15" ry="4" fill="#d8d8e0" ${line}/>
    <rect x="15" y="34" width="30" height="24" fill="#ff7a59"/><circle cx="30" cy="46" r="7" fill="#ffd0a8"/><path d="M30 39q4-4 7-2" fill="none" stroke="#3e9a3a" stroke-width="2.4"/>${shine('M20 22v48')}`],
  ['Rubber duck', `<path d="M10 54q0-12 14-12 0-24 16-24t14 16q0 8-10 10 10 2 10 16 0 18-22 18T10 54z" fill="#ffd93b" ${line}/>
    <path d="M52 28q8 0 8 4-4 4-10 2z" fill="#ff8a2a" ${line}/><circle cx="44" cy="28" r="2.5" fill="${O}"/><path d="M18 58q8 8 18 0" fill="none" ${line}/>`],
];

export const KEY_SVG = `<path d="M30 6a12 12 0 1 0 0 24 12 12 0 1 0 0-24zm0 7a5 5 0 1 1 0 10 5 5 0 1 1 0-10z" fill="#ffc928" ${line}/>
  <path d="M26 29h8v45h-8z" fill="#ffc928" ${line}/><path d="M34 50h10v6H34zM34 62h7v6h-7z" fill="#ffc928" ${line}/>${shine('M24 12q-3 4 0 9')}`;
export const MYST_SVG = `<rect x="8" y="26" width="44" height="52" rx="5" fill="#ffb347" ${line}/><path d="M8 40h44" ${line}/>
  ${word(30, 70, '?', '#fff', 28)}<path d="M8 26l6-10h32l6 10z" fill="#ffcf7a" ${line}/>`;

const wrap = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80">${inner}</svg>`;
const cache = new Map();
// data: URL for an item's picture (type number; KEY; or 'myst')
export function itemURL(t) {
  if (!cache.has(t)) {
    const inner = t === 'myst' ? MYST_SVG : t === 63 ? KEY_SVG : TYPES[t - 1][1];
    cache.set(t, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(wrap(inner)));
  }
  return cache.get(t);
}
