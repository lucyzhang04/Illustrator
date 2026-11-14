# Illustrator

A picture book that helps first graders learn to read: read a word, draw it, and watch your drawings turn into a short movie.

## How it works

1. **Opening pages.** Hand-drawn characters arrive once (about 4.5 seconds), then a card asks "What is your name?"
2. **Word pages.** Each page shows one short word (cat, dog, run, jump...) next to a drawing box. **Next** turns the page to a new word, for as long as the child likes.
3. **I'm done!** The drawings and words are sent to Claude Fable, which writes a tiny story and says how each drawing should move. The browser animates the child's own drawings to that script (15 to 30 seconds), with read-along captions, and records it.
4. **Keep it.** Save the movie (MP4 or WebM, depending on the browser) or one picture with every drawing and its word.

There is no login and nothing is stored on a server. The child's name never leaves the browser.

## Run it

```bash
npm install
npm run dev
```

`npm run dev` serves the pages only. Without the server function the movie uses a built-in story instead of Fable's, so everything still works. To run the function locally too, use `vercel dev` with `ANTHROPIC_API_KEY` set.

## Deploy (Vercel)

Import the repository in Vercel; it detects Vite and the `api/` function on its own. Add one environment variable:

| Name | Value |
| --- | --- |
| `ANTHROPIC_API_KEY` | A Claude API key. Only the server function reads it. |

## Where things are

| Path | What |
| --- | --- |
| `src/components/IntroScene.tsx`, `intro.css` | The opening drawing and its one-time animations |
| `src/components/Book.tsx` | The book and the page turn |
| `src/components/Pages.tsx`, `DrawingPad.tsx` | Name card, word page, drawing box |
| `src/components/Finale.tsx` | The movie screen and save buttons |
| `src/lib/words.ts` | The word list |
| `src/lib/story.ts` | The storyboard format, safety checks, and the built-in story |
| `src/lib/movie.ts` | Draws, plays and records the movie |
| `api/storyboard.ts` | Server function that asks Fable for the storyboard |
