import type { IncomingMessage, ServerResponse } from 'node:http';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { BACKDROPS, MAX_PICTURES, MAX_SCENES, cleanStoryboard } from '../src/lib/story';
import { ALL_WORDS } from '../src/lib/words';

// POST /api/storyboard
// Body:    { pictures: [{ word: "cat", image: "data:image/png;base64,..." }, ...] }
// Returns: a Storyboard (see src/lib/story.ts) that Fable wrote after looking
//          at the drawings. The browser animates the drawings to it.
// The child's name is never sent here; it is added to the movie in the browser.

const MODEL = 'claude-fable-5-2';
const MAX_IMAGE_CHARS = 400_000; // about 300 KB per drawing

const Storyboard = z.object({
  title: z.string().describe('A short title for the story, 2 to 5 easy words.'),
  scenes: z.array(z.object({
    sentence: z.string().describe('One short sentence a first grader can read. It uses the word of each picture in the scene, spelled exactly.'),
    backdrop: z.enum(BACKDROPS),
    actors: z.array(z.object({
      picture: z.number().int().describe('Number of the picture, counting from 0.'),
      keys: z.array(z.object({
        at: z.number().describe('Moment in the scene, 0 (start) to 1 (end).'),
        x: z.number().describe('Centre of the drawing, 0 (left edge) to 100 (right edge). Values below 0 or above 100 are off screen.'),
        y: z.number().describe('Centre of the drawing, 0 (top) to 100 (bottom). Values below 0 or above 100 are off screen.'),
        size: z.number().describe('Height of the drawing in percent of the stage height, 5 to 80.'),
        tilt: z.number().describe('Rotation in degrees. 360 is one full spin.'),
      })),
    })),
  })),
});

const SYSTEM = `You direct very short animated picture books for children who are just learning to read. A first grader has read some words and drawn a picture for each one. You will see each drawing with its word. Turn them into one tiny, happy story and say how each drawing moves.

The story
- Use every picture in at least one scene. Write at most ${MAX_SCENES} scenes; with more pictures than that, put two or three in a scene.
- Each scene has one sentence of 3 to 7 words. It must contain the word of every picture in that scene, spelled exactly as given.
- Besides those words, use only very common sight words a first grader knows (I, a, the, see, can, is, on, in, and, my, we, go, look, big, at, it, to, up, like, has, with, ran, sat, got, fun, you, he, she, his, her, was, said, play, little, down, out). No names, no hard words, no contractions.
- Let the scenes connect into a little story when you can, with a cheerful ending. Keep everything gentle and kind.
- Look at what the child actually drew. If the cat is purple or the sun has a face, let the story and the motion enjoy that, but never comment on how well it is drawn.

The animation
- The stage is a wide rectangle, about twice as wide as it is tall. The sentence is shown below the stage, so drawings never cover it.
- Each actor is one of the child's drawings, moved by keyframes. Positions are the centre of the drawing in percent of the stage. A drawing is a little wider than it is tall, so at size 60 it covers about a third of the stage width.
- Give each actor 3 to 6 keyframes that act out the sentence: hop, sneak in from the side, drop from the sky, grow, spin, chase another drawing. Start actors off screen or tiny when they should make an entrance. Bring every actor to rest, fully on screen and no smaller than size 30, by at = 0.8, and keep it there until at = 1.
- When a scene has several actors, keep their resting places apart so they do not cover each other.
- Pick the backdrop that fits the sentence: sunny (grass and sun), night (moon and stars), water (waves), snow, rainbow, or plain.`;

type Picture = { word: string; image: { media_type: 'image/png' | 'image/jpeg'; data: string } };

function readPictures(body: unknown): Picture[] | null {
  const list = (body as { pictures?: unknown } | null)?.pictures;
  if (!Array.isArray(list) || list.length < 1 || list.length > MAX_PICTURES) return null;
  const pictures: Picture[] = [];
  for (const item of list) {
    const { word, image } = (item ?? {}) as { word?: unknown; image?: unknown };
    if (typeof word !== 'string' || !ALL_WORDS.includes(word)) return null;
    if (typeof image !== 'string' || image.length > MAX_IMAGE_CHARS) return null;
    const match = /^data:(image\/png|image\/jpeg);base64,([A-Za-z0-9+/]+=*)$/.exec(image);
    if (!match) return null;
    pictures.push({ word, image: { media_type: match[1] as Picture['image']['media_type'], data: match[2] } });
  }
  return pictures;
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export default async function handler(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Use POST.' });
  if (!process.env.ANTHROPIC_API_KEY) return send(res, 503, { error: 'The story writer is not set up.' });
  const pictures = readPictures(req.body);
  if (!pictures) return send(res, 400, { error: 'Send 1 to 16 pictures, each with a word and a PNG or JPEG image.' });

  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  pictures.forEach((p, i) => {
    content.push({ type: 'text', text: `Picture ${i}: the word is "${p.word}".` });
    content.push({ type: 'image', source: { type: 'base64', media_type: p.image.media_type, data: p.image.data } });
  });
  content.push({ type: 'text', text: 'Write the storyboard for these pictures.' });

  const client = new Anthropic();
  try {
    const message = await client.beta.messages.parse(
      {
        model: MODEL,
        max_tokens: 16000,
        // If Fable declines a request, the API retries it on another model.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: SYSTEM,
        messages: [{ role: 'user', content }],
        output_config: { effort: 'low', format: betaZodOutputFormat(Storyboard) },
      },
      { timeout: 55_000, maxRetries: 1 },
    );
    if (message.stop_reason === 'refusal') return send(res, 502, { error: 'The story writer said no to this one.' });
    const board = cleanStoryboard(message.parsed_output, pictures.length);
    if (!board) return send(res, 502, { error: 'The story came back empty.' });
    return send(res, 200, board);
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return send(res, 429, { error: 'Too many stories at once. Try again soon.' });
    if (error instanceof Anthropic.AuthenticationError) return send(res, 503, { error: 'The story writer is not set up.' });
    if (error instanceof Anthropic.APIError) {
      console.error('storyboard: API error', error.status, error.message);
      return send(res, 502, { error: 'The story writer had a problem.' });
    }
    console.error('storyboard: unexpected error', error);
    return send(res, 500, { error: 'Something went wrong.' });
  }
}
