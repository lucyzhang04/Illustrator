// The "script" for a movie. Fable writes one from the child's words and
// drawings (see api/storyboard.ts); `localStoryboard` is the stand-in used
// when the server can't be reached. Nothing in here touches the browser, so
// the server uses it too.

export const BACKDROPS = ['sunny', 'night', 'water', 'snow', 'rainbow', 'plain'] as const;
export type Backdrop = (typeof BACKDROPS)[number];

/**
 * Where a drawing is at one moment of a scene. `at` runs 0 to 1 through the
 * scene; `x`/`y` are the drawing's centre in percent of the stage (0,0 is the
 * top left); `size` is its height in percent of the stage; `tilt` is degrees.
 */
export type Key = { at: number; x: number; y: number; size: number; tilt: number };
export type Actor = { picture: number; keys: Key[] };
export type Scene = { sentence: string; backdrop: Backdrop; actors: Actor[] };
export type Storyboard = { title: string | null; scenes: Scene[] };

export const MAX_SCENES = 8;
export const MAX_PICTURES = 16;

const clamp = (v: unknown, lo: number, hi: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : fallback;

const k = (at: number, x: number, y: number, size: number, tilt = 0): Key => ({ at, x, y, size, tilt });

/** A few ready-made ways for a drawing to move, centred on `cx`. */
const MOVES: ((cx: number, size: number) => Key[])[] = [
  // hop in from the left
  (cx, s) => [k(0, -20, 60, s), k(0.2, cx - 30, 38, s, -8), k(0.4, cx - 12, 58, s), k(0.6, cx, 36, s, 8), k(0.8, cx, 56, s), k(1, cx, 54, s)],
  // zoom up from far away
  (cx, s) => [k(0, cx, 50, 6), k(0.45, cx, 50, s * 1.2, -6), k(0.7, cx, 52, s * 0.95, 4), k(1, cx, 52, s)],
  // float down from the sky
  (cx, s) => [k(0, cx + 20, -30, s, 14), k(0.35, cx - 10, 20, s, -10), k(0.7, cx + 5, 44, s, 6), k(1, cx, 54, s)],
  // roll in from the right
  (cx, s) => [k(0, 125, 56, s, 360), k(0.6, cx, 56, s, 0), k(0.8, cx, 46, s, -6), k(1, cx, 54, s)],
  // pop up from below
  (cx, s) => [k(0, cx, 130, s), k(0.35, cx, 40, s, -5), k(0.55, cx, 60, s, 5), k(0.75, cx, 50, s), k(1, cx, 54, s)],
];

const VERBS = new Set(['run', 'hop', 'sit', 'eat', 'dig', 'hug', 'nap', 'zip', 'jump', 'swim', 'kick', 'sing']);
const THE = new Set(['sky', 'sun', 'moon', 'rain', 'snow', 'mud', 'jam', 'milk']);
const ONE = ['I see %.', 'Look at %!', 'This is %.', 'I like %.'];

function withArticle(word: string) {
  if (THE.has(word)) return `the ${word}`;
  return `${'aeiou'.includes(word[0]) ? 'an' : 'a'} ${word}`;
}

function join(parts: string[]) {
  if (parts.length < 2) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

function sentenceFor(words: string[], n: number) {
  const nouns = words.filter((w) => !VERBS.has(w));
  const verbs = words.filter((w) => VERBS.has(w));
  const parts: string[] = [];
  if (nouns.length === 1) parts.push(ONE[n % ONE.length].replace('%', withArticle(nouns[0])));
  else if (nouns.length) parts.push(`I see ${join(nouns.map(withArticle))}.`);
  if (verbs.length) parts.push(`I can ${join(verbs)}!`);
  return parts.join(' ');
}

/** A simple storyboard made without any help from the server. */
export function localStoryboard(words: string[]): Storyboard {
  const count = Math.min(MAX_SCENES, words.length);
  const scenes: Scene[] = [];
  for (let s = 0; s < count; s++) {
    const from = Math.floor((s * words.length) / count);
    const to = Math.floor(((s + 1) * words.length) / count);
    const group = words.slice(from, to);
    const size = group.length === 1 ? 62 : group.length === 2 ? 48 : 36;
    scenes.push({
      sentence: sentenceFor(group, s),
      backdrop: BACKDROPS[s % BACKDROPS.length],
      actors: group.map((_, j) => ({
        picture: from + j,
        keys: MOVES[(s + j) % MOVES.length](((j + 1) * 100) / (group.length + 1), size),
      })),
    });
  }
  return { title: null, scenes };
}

type Loose = { title?: unknown; scenes?: unknown };

/**
 * Makes a storyboard from the server safe to play: every number in range,
 * every picture real, and every drawing on screen at least once.
 */
export function cleanStoryboard(raw: unknown, pictureCount: number): Storyboard | null {
  if (!raw || typeof raw !== 'object') return null;
  const loose = raw as Loose;
  if (!Array.isArray(loose.scenes)) return null;
  const scenes: Scene[] = [];
  for (const item of loose.scenes.slice(0, MAX_SCENES)) {
    if (!item || typeof item !== 'object') continue;
    const s = item as { sentence?: unknown; backdrop?: unknown; actors?: unknown };
    const sentence = typeof s.sentence === 'string' ? s.sentence.replace(/\s+/g, ' ').trim().slice(0, 70) : '';
    const actors: Actor[] = [];
    for (const a of Array.isArray(s.actors) ? s.actors.slice(0, 4) : []) {
      const actor = a as { picture?: unknown; keys?: unknown };
      const picture = actor?.picture;
      if (typeof picture !== 'number' || !Number.isInteger(picture) || picture < 0 || picture >= pictureCount) continue;
      const keys = (Array.isArray(actor.keys) ? actor.keys.slice(0, 8) : [])
        .filter((key): key is Record<string, unknown> => !!key && typeof key === 'object')
        .map((key) => k(
          clamp(key.at, 0, 1, 0), clamp(key.x, -40, 140, 50), clamp(key.y, -40, 140, 50),
          clamp(key.size, 5, 80, 50), clamp(key.tilt, -720, 720, 0),
        ))
        .sort((p, q) => p.at - q.at);
      actors.push({ picture, keys: keys.length ? keys : MOVES[actors.length % MOVES.length](50, 55) });
    }
    if (!sentence || !actors.length) continue;
    scenes.push({
      sentence,
      backdrop: BACKDROPS.includes(s.backdrop as Backdrop) ? (s.backdrop as Backdrop) : 'plain',
      actors,
    });
  }
  if (!scenes.length) return null;

  // Any drawing the script forgot still gets its moment.
  const seen = new Set(scenes.flatMap((s) => s.actors.map((a) => a.picture)));
  let next = 0;
  for (let p = 0; p < pictureCount; p++) {
    if (seen.has(p)) continue;
    const scene = scenes[next++ % scenes.length];
    if (scene.actors.length < 4) scene.actors.push({ picture: p, keys: MOVES[p % MOVES.length](18 + ((p * 31) % 64), 30) });
  }
  const title = typeof loose.title === 'string' ? loose.title.replace(/\s+/g, ' ').trim().slice(0, 40) : '';
  return { title: title || null, scenes };
}
