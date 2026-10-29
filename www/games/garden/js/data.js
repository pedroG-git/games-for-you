// Game content: item chains, generators, people, areas and the story.

export const W = 7, H = 9;

// Every chain has 8 levels. Two of the same level merge into the next one.
export const CHAINS = {
  flower: { name: 'Flowers', gen: 'pot', unlock: 1, items: [['🌱', 'Seed'], ['🌿', 'Sprout'], ['🌼', 'Daisy'], ['🌷', 'Tulip'], ['🌹', 'Rose'], ['🌻', 'Sunflower'], ['🌺', 'Hibiscus'], ['💐', 'Bouquet']] },
  tea: { name: 'Tea & Cakes', gen: 'teapot', unlock: 1, items: [['🍵', 'Green Tea'], ['🍪', 'Cookie'], ['🧁', 'Cupcake'], ['🍩', 'Donut'], ['🥐', 'Croissant'], ['🍰', 'Cake Slice'], ['🥧', 'Pie'], ['🎂', 'Party Cake']] },
  tool: { name: 'Garden Tools', gen: 'shed', unlock: 2, items: [['🧤', 'Gloves'], ['✂️', 'Shears'], ['🪣', 'Bucket'], ['🧹', 'Broom'], ['🔨', 'Hammer'], ['🪚', 'Saw'], ['🛠️', 'Tool Set'], ['🧰', 'Toolbox']] },
  fruit: { name: 'Fruits', gen: 'tree', unlock: 3, items: [['🍒', 'Cherries'], ['🍓', 'Strawberry'], ['🍋', 'Lemon'], ['🍑', 'Peach'], ['🍎', 'Apple'], ['🍐', 'Pear'], ['🍉', 'Watermelon'], ['🍍', 'Pineapple']] },
};
export const MAX_ITEM = 8;

export const GENS = {
  pot: { emoji: '🪴', name: 'Flower Pot', chain: 'flower' },
  teapot: { emoji: '🫖', name: 'Teapot', chain: 'tea' },
  shed: { emoji: '🛖', name: 'Garden Shed', chain: 'tool' },
  tree: { emoji: '🌳', name: 'Fruit Tree', chain: 'fruit' },
};
export const MAX_GEN = 3;
// Chance of producing item level 1/2/3, per generator level.
export const GEN_ODDS = { 1: [0.88, 0.12, 0], 2: [0.68, 0.26, 0.06], 3: [0.5, 0.34, 0.16] };

export const ENERGY_MAX = 100;
export const ENERGY_SECS = 120; // one energy every 2 minutes, like the original

// Level → generator copy gifted on level up (so generators can be merged).
export const LEVEL_GIFTS = { 4: 'pot', 5: 'teapot', 6: 'shed', 7: 'pot', 8: 'tree', 9: 'teapot', 10: 'tree' };
export const xpNeed = (lvl) => 12 + lvl * 10;

// People. `face` is an emoji.
export const PEOPLE = {
  me: { name: 'You', face: '👩' },
  pedro: { name: 'Pedro', face: '👨' },
  petunia: { name: 'Mrs. Petunia', face: '👵' },
  basil: { name: 'Mr. Basil', face: '👴' },
  rosa: { name: 'Rosa the Mail Lady', face: '👩‍🦰' },
  leo: { name: 'Little Leo', face: '👦' },
  bea: { name: 'Bea the Beekeeper', face: '👩‍🌾' },
};
export const CUSTOMERS = ['pedro', 'petunia', 'basil', 'rosa', 'leo', 'bea'];

export const ORDER_CHATTER = {
  pedro: ['For my next DIY project. Don\'t ask.', 'I\'m hungry. And also helpful!', 'This will NOT collapse. Probably.'],
  petunia: ['Have you heard the latest? No? Well…', 'Just for me. Totally not for gossip.', 'Basil looked at me today. Twice!'],
  basil: ['Hmph. For my prize roses.', 'Don\'t tell Petunia I was here.', 'My mustache needs a treat.'],
  rosa: ['A postcard said you have the best stuff!', 'I didn\'t read it. Much.', 'Delivery for… me!'],
  leo: ['For my mom! She\'ll be so happy!', 'Can I water the flowers? Pleeease?', 'I\'m going to be a gardener!'],
  bea: ['My bees send their love. Bzzz.', 'Something sweet, please!', 'The bees say your flowers are the best.'],
};

// Renovation areas. Each task costs stars and plays a little story scene.
export const AREAS = [
  {
    name: 'The Flower Shop',
    tasks: [
      { name: 'Pull the weeds', cost: 3, story: [
        ['pedro', 'Done! I pulled ALL the weeds! 💪'],
        ['me', 'Pedro… those were my tulip bulbs.'],
        ['pedro', '…Most of the weeds, then.'],
      ] },
      { name: 'Wash the window', cost: 4, story: [
        ['petunia', 'Ooh, a sparkly clean window! Now I can see EVERYTHING inside.'],
        ['petunia', 'I mean… how lovely, dear!'],
      ] },
      { name: 'Fix the door', cost: 5, story: [
        ['pedro', 'I fixed the door! It opens both ways now.'],
        ['me', 'Is that… a feature?'],
        ['pedro', 'It is now.'],
      ] },
      { name: 'Make a cozy reading corner', cost: 6, story: [
        ['me', 'Pedro! Come see the new reading corner!'],
        ['pedro', 'Nice! Very cozy. Is that sofa supposed to lean?'],
        ['me', 'It\'s a feature.'],
        ['petunia', 'A cozy corner for gossip! I mean… for reading, dear.'],
      ] },
      { name: 'Paint the shop sign', cost: 7, story: [
        ['rosa', 'Postcard for you! Not that I read it.'],
        ['rosa', 'Your aunt says hi, the weather is nice, and she\'s jealous of your sign.'],
        ['me', '…Thanks, Rosa.'],
      ] },
      { name: 'Build the flower stand', cost: 8, story: [
        ['basil', 'Hmph. Basil Thornbury, next door. My roses won Best in Show eleven years running.'],
        ['basil', 'So don\'t get any ideas, young lady.'],
        ['me', 'Nice to meet you too, Mr. Basil!'],
        ['pedro', 'He smells like tulips. Suspicious.'],
      ] },
      { name: 'Hang the flower baskets', cost: 9, story: [
        ['petunia', 'Big news! Basil was seen at MIDNIGHT with a FLASHLIGHT!'],
        ['me', 'Maybe he was looking for his glasses?'],
        ['petunia', 'At midnight?! In YOUR garden?! I\'ll find out. I always find out.'],
      ] },
      { name: 'Fix the old bench', cost: 10, story: [
        ['pedro', 'Look, I fixed the bench! And I\'m sitting on it! And it holds!'],
        ['me', 'Wow! Okay, now get up.'],
        ['pedro', 'I\'m not moving. Just in case.'],
      ] },
      { name: 'Plant the window boxes', cost: 11, story: [
        ['me', 'Pedro… why do you have a tulip petal in your hair?'],
        ['pedro', 'No comment.'],
        ['me', 'Pedro.'],
        ['pedro', 'Okay, the wind did it. Probably.'],
      ] },
      { name: 'Grand reopening!', cost: 12, areaDone: true, story: [
        ['petunia', 'The flower shop is OPEN! Biggest news since Basil\'s mustache incident!'],
        ['leo', 'Yay! Flowers! Can I smell them?'],
        ['me', 'We did it! But the tulips keep disappearing…'],
        ['me', 'And someone keeps sneaking off behind the shop at night.'],
        ['pedro', 'Behind the shop? There\'s only that old locked gate…'],
        ['me', 'Grandma\'s old gate! Let\'s see what\'s back there! 🗝️'],
      ] },
    ],
  },
  {
    name: 'The Secret Garden',
    tasks: [
      { name: 'Open the old gate', cost: 6, story: [
        ['me', 'Grandma had a whole secret garden back here! 😮'],
        ['pedro', 'How did the thief even get in? The gate was locked!'],
        ['me', 'Someone has a key… or a very good way in.'],
      ] },
      { name: 'Clear the brambles', cost: 7, story: [
        ['pedro', 'I was attacked by a bush. Tell my story.'],
        ['me', 'It\'s a tiny scratch, Pedro.'],
        ['pedro', 'Tell it BRAVELY.'],
      ] },
      { name: 'Lay the stone path', cost: 8, story: [
        ['me', 'Look — big boot prints in the mud…'],
        ['me', '…and a trail of dropped tulip petals!'],
        ['pedro', 'We are getting warmer, detective.'],
      ] },
      { name: 'Restore the fountain', cost: 9, story: [
        ['petunia', 'Is that a FOUNTAIN back there?! I must tell the whole street!'],
        ['petunia', 'Purely as a public service, of course.'],
        ['pedro', 'Free water for the plants. Acceptable.'],
      ] },
      { name: 'Build the greenhouse', cost: 10, story: [
        ['me', 'Pedro, come quick! The greenhouse is FULL of tulips!'],
        ['pedro', 'The missing tulips! All tied with little pink ribbons…?'],
        ['me', 'Who steals tulips just to tie ribbons on them?'],
        ['pedro', 'A romantic thief. Interesting.'],
      ] },
      { name: 'Plant the rose arch', cost: 11, story: [
        ['basil', 'Ahem. Lovely… roses. Not as good as mine. Anyway. Goodbye.'],
        ['me', 'Mr. Basil, why are you so red?'],
        ['basil', 'It\'s… sunburn! Hmph!'],
      ] },
      { name: 'Hang the fairy lights', cost: 12, story: [
        ['me', 'Shh! Tonight we hide and catch the tulip thief.'],
        ['pedro', 'I brought snacks for the stakeout. 🍪'],
        ['me', 'Look! Someone is coming through the gate! And… is that Mr. Basil?!'],
        ['basil', 'Oh no. Oh no no no. I can explain!'],
      ] },
      { name: 'Set up the tea table', cost: 13, story: [
        ['basil', 'Fine! I took the tulips. I only grow roses, and Petunia… loves tulips.'],
        ['basil', 'I want to give her one hundred tulips. And ask her something important.'],
        ['me', 'But how did you get through the locked gate?'],
        ['basil', 'Your grandmother gave me a spare key years ago. She knew my secret before I did.'],
      ] },
      { name: 'Build the gazebo', cost: 14, story: [
        ['pedro', 'I built a whole gazebo. By myself.'],
        ['me', 'And it\'s… standing?!'],
        ['pedro', 'I\'m as surprised as you are.'],
        ['basil', 'Young man, that is a fine gazebo. Perfect for a… special question.'],
      ] },
      { name: 'Throw a garden party!', cost: 15, areaDone: true, finale: true, story: [
        ['basil', 'Petunia… one hundred tulips. Will you marry me? 💍'],
        ['petunia', 'YES! Oh, Basil! Yes!'],
        ['petunia', 'Oh, I have to tell everyone! …Wait. I AM the news!'],
        ['leo', 'Everybody\'s crying! Is that good crying?'],
        ['pedro', 'The best crying, buddy.'],
        ['pedro', 'I knew all along. You\'re welcome. Now, where is the cake?'],
        ['me', 'The garden is finished… but the customers keep coming! Let\'s keep growing! 🌸'],
      ] },
    ],
  },
];

export const INTRO = [
  ['me', 'Grandma\'s old flower shop… it\'s all mine now! 🌸'],
  ['pedro', 'It\'s… very overgrown. Is that a shopping cart in the roses?'],
  ['petunia', 'Yoo-hoo! Petunia, from next door. I know EVERYTHING that happens on this street!'],
  ['petunia', 'Did you hear? Someone has been stealing tulips at night! 👀'],
  ['me', 'A tulip thief?! Pedro, let\'s get this shop blooming again — and find out who it is!'],
  ['me', 'Tap the 🪴 Flower Pot to grow things. Drag two of the same together to merge them!'],
];

// 7-day daily reward cycle.
export const DAILY = [
  { coins: 60 }, { energy: 30 }, { gems: 5 }, { coins: 120 }, { energy: 60 }, { gems: 10 }, { gen: true, gems: 5 },
];

// Starting board: generators, a few items and overgrown (locked) cells to free by merging into them.
export function startBoard() {
  const b = Array(W * H).fill(null);
  const put = (x, y, o) => { b[y * W + x] = o; };
  put(3, 4, { g: 'pot', l: 1 });
  put(2, 4, { g: 'teapot', l: 1 });
  put(3, 3, { c: 'flower', l: 1 });
  put(4, 4, { c: 'flower', l: 1 });
  put(4, 3, { c: 'tea', l: 1 });
  // Overgrown border: low-level items you free by merging a matching one into them.
  const lock = [
    [0, 0, 'flower', 2], [1, 0, 'tea', 1], [2, 0, 'flower', 1], [4, 0, 'tea', 2], [5, 0, 'flower', 1], [6, 0, 'tea', 1],
    [0, 1, 'tea', 1], [6, 1, 'flower', 2], [0, 7, 'flower', 1], [6, 7, 'tea', 2],
    [0, 8, 'tea', 2], [1, 8, 'flower', 1], [2, 8, 'tea', 1], [3, 8, 'flower', 3], [4, 8, 'flower', 1], [5, 8, 'tea', 1], [6, 8, 'flower', 2],
    [3, 0, 'flower', 3], [0, 4, 'flower', 2], [6, 4, 'tea', 3],
  ];
  for (const [x, y, c, l] of lock) put(x, y, { c, l, lock: 1 });
  return b;
}
