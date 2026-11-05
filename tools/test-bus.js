// node tools/test-bus.js - Bus stars and level-map unlock logic (www/games/bus/js/progress.js)
const P = require('../www/games/bus/js/progress.js');

const fails = [];
const eq = (got, want, what) => { if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); };

// stars from helpers
eq([0, 1, 2, 3, 7].map(P.starsFor), [3, 2, 1, 1, 1], 'starsFor');

// an old save (before stars): beaten levels show 1 star, frontier and beyond 0
const old = { level: 6, wins: 5 };
eq([1, 2, 5].map((n) => P.starsOf(old, n)), [1, 1, 1], 'old save beaten levels default to 1 star');
eq([P.starsOf(old, 6), P.starsOf(old, 7), P.starsOf(old, 0)], [0, 0, 0], 'unbeaten levels have no stars');
eq([P.isUnlocked(old, 1), P.isUnlocked(old, 6), P.isUnlocked(old, 7), P.isUnlocked(old, 0)], [true, true, false, false], 'unlock');
eq([P.isBeaten(old, 5), P.isBeaten(old, 6)], [true, false], 'beaten');
eq(P.totalStars(old), 5, 'old total');

// winning the frontier moves progress on
const s = { level: 1, wins: 0 };
let r = P.recordWin(s, 1, 0);
eq([r.first, r.stars, r.best, s.level, s.stars[1]], [true, 3, 3, 2, 3], 'first win, no helpers');
r = P.recordWin(s, 2, 2);
eq([r.first, r.stars, s.level, P.starsOf(s, 2)], [true, 1, 3, 1], 'first win, two helpers');

// replays: never lower stars, never move progress
r = P.recordWin(s, 1, 1);
eq([r.first, r.stars, r.best, s.level, P.starsOf(s, 1)], [false, 2, 3, 3, 3], 'replay worse keeps best');
r = P.recordWin(s, 2, 0);
eq([r.first, r.best, s.level, P.starsOf(s, 2)], [false, 3, 3, 3], 'replay better raises stars');
eq(P.totalStars(s), 6, 'total');

// replaying an old (no star data) level upgrades it
r = P.recordWin(old, 3, 1);
eq([r.first, r.best, old.level, P.starsOf(old, 3), P.starsOf(old, 4)], [false, 2, 6, 2, 1], 'old save replay');

// junk star data is ignored
const junk = { level: 4, stars: { 1: 9, 2: 'x', 3: 2 } };
eq([1, 2, 3].map((n) => P.starsOf(junk, n)), [1, 1, 2], 'junk stars');
const arr = { level: 2, stars: [] };
P.recordWin(arr, 1, 0);
eq([Array.isArray(arr.stars), arr.stars[1]], [false, 3], 'array stars replaced by object');
eq(P.frontier({}), 1, 'missing level');

if (fails.length) { console.error('test-bus FAILED\n' + fails.join('\n')); process.exit(1); }
console.log('test-bus: all checks passed');
