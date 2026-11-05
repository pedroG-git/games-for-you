// Bus - stars and the level map. Pure logic (no drawing), also used by tools/test-bus.js.
// Stars come from the helpers used in the winning attempt: none = 3, one = 2, more = 1.
// Saves from before stars existed have no star data: their beaten levels count as 1 star until replayed.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BusProgress = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const starsFor = (helpers) => (helpers <= 0 ? 3 : helpers === 1 ? 2 : 1);

  // Highest level that can be played (the next unbeaten one). save.level is that level.
  const frontier = (save) => Math.max(1, Math.floor(save.level) || 1);

  const isBeaten = (save, n) => n >= 1 && n < frontier(save);
  const isUnlocked = (save, n) => n >= 1 && n <= frontier(save);

  // 0 for unbeaten levels, 1..3 for beaten ones.
  function starsOf(save, n) {
    if (!isBeaten(save, n)) return 0;
    const s = save.stars && save.stars[n];
    return s >= 1 && s <= 3 ? s : 1;
  }

  // Records a win of level n with the given helper count. Mutates save.
  // Returns { stars, best, first }: first = this was the next unbeaten level (progress moves on).
  function recordWin(save, n, helpers) {
    const stars = starsFor(helpers);
    const first = n >= frontier(save);
    if (!save.stars || typeof save.stars !== 'object' || Array.isArray(save.stars)) save.stars = {};
    const best = Math.max(stars, first ? 0 : starsOf(save, n));
    save.stars[n] = best;
    if (first) save.level = n + 1;
    return { stars, best, first };
  }

  function totalStars(save) {
    let t = 0;
    for (let n = 1; n < frontier(save); n++) t += starsOf(save, n);
    return t;
  }

  return { starsFor, frontier, isBeaten, isUnlocked, starsOf, recordWin, totalStars };
});
