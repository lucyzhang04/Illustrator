// First-grade words that are easy to sound out AND easy to draw.
const THREE = [
  'cat', 'dog', 'sun', 'hat', 'pig', 'bug', 'bed', 'cup', 'bus', 'hen',
  'fox', 'box', 'bat', 'map', 'pan', 'net', 'pen', 'web', 'log', 'mop',
  'pot', 'rug', 'jam', 'van', 'ant', 'egg', 'bee', 'cow', 'car', 'sky',
  'run', 'hop', 'sit', 'eat', 'dig', 'hug', 'nap', 'mud', 'nut', 'zip',
];

const FOUR = [
  'jump', 'fish', 'frog', 'duck', 'ball', 'tree', 'star', 'moon', 'cake',
  'kite', 'boat', 'bird', 'hand', 'milk', 'sock', 'ship', 'drum', 'bell',
  'nest', 'rain', 'leaf', 'book', 'bike', 'door', 'king', 'lamp', 'ring',
  'sled', 'crab', 'flag', 'swim', 'kick', 'sing', 'snow', 'bear', 'goat',
];

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * An endless list of words: the 3-letter words first, then the 4-letter ones,
 * then everything again in a new order, forever.
 */
export function makeWordStream(): (n: number) => string {
  const list: string[] = [];
  let round = 0;
  return (n) => {
    while (list.length <= n) {
      let more = round === 0 ? [...shuffle(THREE), ...shuffle(FOUR)] : shuffle([...THREE, ...FOUR]);
      if (list.length && more[0] === list[list.length - 1]) more = [...more.slice(1), more[0]];
      list.push(...more);
      round++;
    }
    return list[n];
  };
}

export const ALL_WORDS: readonly string[] = [...THREE, ...FOUR];

export const isVowel = (ch: string) => 'aeiou'.includes(ch.toLowerCase());

/** Says a word out loud, slowly, when the browser can. */
export function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.7;
  u.pitch = 1.1;
  u.lang = 'en-US';
  window.speechSynthesis.speak(u);
}

export const canSpeak = () => 'speechSynthesis' in window;
