import { useEffect, useMemo, useRef, useState } from 'react';
import { Book } from './components/Book';
import type { Spread } from './components/Book';
import { Finale } from './components/Finale';
import { IntroScene } from './components/IntroScene';
import type { Stroke } from './components/DrawingPad';
import { DrawPage, NameCard, StarPage, WordPage } from './components/Pages';
import type { Drawing } from './lib/movie';
import { makeWordStream } from './lib/words';

/** What was drawn on one word page. The strokes let the child come back and change it. */
type PageArt = { word: string; canvas: HTMLCanvasElement; strokes: Stroke[] };

type Stage = { kind: 'intro' } | { kind: 'word'; n: number } | { kind: 'finale'; n: number; show: number };

const BOOK_W = 1232;
const BOOK_H = 782;

/** Scales the book to fill the window, whatever its size. */
function useFit() {
  useEffect(() => {
    const fit = () => {
      const scale = Math.min(window.innerWidth / (BOOK_W + 40), window.innerHeight / (BOOK_H + 30));
      document.documentElement.style.setProperty('--s', String(scale));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
}

export default function App() {
  useFit();
  const [stage, setStage] = useState<Stage>({ kind: 'intro' });
  const [name, setName] = useState('');
  const [pages, setPages] = useState<Record<number, PageArt>>({});
  const [hint, setHint] = useState(false);
  const wordAt = useRef(makeWordStream()).current;
  const art = useRef<{ id: string; canvas: HTMLCanvasElement | null; strokes: Stroke[] }>({ id: '', canvas: null, strokes: [] });
  const audio = useRef<AudioContext | null>(null);

  // The pictures for the movie, in page order.
  const drawings: Drawing[] = useMemo(
    () => Object.keys(pages).map(Number).sort((p, q) => p - q).map((n) => pages[n]),
    [pages],
  );

  /** Keeps what is on the current page, if it changed. Returns how many pictures there are now. */
  const keep = (n: number): number => {
    const a = art.current;
    if (a.id !== `word-${n}` || !a.canvas) return drawings.length;
    art.current = { id: '', canvas: null, strokes: [] };
    const next = { ...pages };
    if (a.strokes.some((stroke) => !stroke.erase)) {
      const copy = document.createElement('canvas');
      copy.width = a.canvas.width;
      copy.height = a.canvas.height;
      copy.getContext('2d')!.drawImage(a.canvas, 0, 0);
      next[n] = { word: wordAt(n), canvas: copy, strokes: a.strokes };
    } else {
      delete next[n];
    }
    setPages(next);
    return Object.keys(next).length;
  };
  const turnTo = (n: number) => {
    setHint(false);
    setStage({ kind: 'word', n });
  };

  let spread: Spread;
  if (stage.kind === 'intro') {
    spread = {
      id: 'intro',
      order: -1,
      left: <IntroScene side="left" />,
      right: <IntroScene side="right" />,
      overlay: <NameCard name={name} onName={setName} onNext={() => setStage({ kind: 'word', n: 0 })} />,
    };
  } else if (stage.kind === 'word') {
    const { n } = stage;
    const id = `word-${n}`;
    spread = {
      id,
      order: n * 2,
      left: (
        <WordPage
          name={name.trim()}
          word={wordAt(n)}
          onBack={n > 0 ? () => {
            keep(n);
            turnTo(n - 1);
          } : undefined}
        />
      ),
      right: (
        <DrawPage
          initial={pages[n]?.strokes}
          count={drawings.length}
          hint={hint}
          onInk={(canvas, strokes) => {
            art.current = { id, canvas, strokes };
            if (strokes.length) setHint(false);
          }}
          onDone={() => {
            const count = keep(n);
            if (!count) return setHint(true);
            // Sound may only start from a tap, so the movie's music is set up here.
            try {
              audio.current ??= new AudioContext();
              void audio.current.resume();
            } catch {
              audio.current = null;
            }
            setStage({ kind: 'finale', n, show: count });
          }}
          onNext={() => {
            keep(n);
            turnTo(n + 1);
          }}
        />
      ),
    };
  } else {
    spread = {
      id: `finale-${stage.n}-${stage.show}`,
      order: stage.n * 2 + 1,
      left: <StarPage />,
      right: <StarPage flip />,
      overlay: (
        <Finale
          name={name.trim()}
          drawings={drawings}
          audio={audio.current}
          onBack={() => turnTo(stage.n)}
          onMore={() => turnTo(stage.n + 1)}
        />
      ),
    };
  }

  return (
    <>
      <div className="stage">
        <Book spread={spread} />
      </div>
      <div className="turn-me">
        <svg viewBox="0 0 80 80" aria-hidden="true">
          <rect x="24" y="8" width="32" height="56" rx="6" fill="#fff" stroke="#2f2f38" strokeWidth="4" />
          <path d="M10,60 q0,14 18,14 M22,68 l6,6 l-7,5" fill="none" stroke="#e8590c" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p>Turn me sideways!</p>
      </div>
    </>
  );
}
