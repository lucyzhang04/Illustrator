import { useEffect, useRef, useState } from 'react';
import { Book } from './components/Book';
import type { Spread } from './components/Book';
import { Finale } from './components/Finale';
import { IntroScene } from './components/IntroScene';
import { DrawPage, NameCard, StarPage, WordPage } from './components/Pages';
import type { Drawing } from './lib/movie';
import { makeWordStream } from './lib/words';

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
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [hint, setHint] = useState(false);
  const wordAt = useRef(makeWordStream()).current;
  const art = useRef<{ id: string; canvas: HTMLCanvasElement | null; hasInk: boolean }>({ id: '', canvas: null, hasInk: false });
  const audio = useRef<AudioContext | null>(null);

  /** Keeps the picture on the current page, if there is one. Returns every picture so far. */
  const keep = (n: number): Drawing[] => {
    const a = art.current;
    if (a.id !== `word-${n}` || !a.hasInk || !a.canvas) return drawings;
    const copy = document.createElement('canvas');
    copy.width = a.canvas.width;
    copy.height = a.canvas.height;
    copy.getContext('2d')!.drawImage(a.canvas, 0, 0);
    art.current = { id: '', canvas: null, hasInk: false };
    const all = [...drawings, { word: wordAt(n), canvas: copy }];
    setDrawings(all);
    return all;
  };

  let spread: Spread;
  if (stage.kind === 'intro') {
    spread = {
      id: 'intro',
      left: <IntroScene side="left" />,
      right: <IntroScene side="right" />,
      overlay: <NameCard name={name} onName={setName} onNext={() => setStage({ kind: 'word', n: 0 })} />,
    };
  } else if (stage.kind === 'word') {
    const { n } = stage;
    const id = `word-${n}`;
    spread = {
      id,
      left: (
        <WordPage
          name={name.trim()}
          word={wordAt(n)}
          count={drawings.length}
          hint={hint}
          onDone={() => {
            const all = keep(n);
            if (!all.length) return setHint(true);
            // Sound may only start from a tap, so the movie's music is set up here.
            try {
              audio.current ??= new AudioContext();
              void audio.current.resume();
            } catch {
              audio.current = null;
            }
            setStage({ kind: 'finale', n, show: all.length });
          }}
        />
      ),
      right: (
        <DrawPage
          onInk={(canvas, hasInk) => {
            art.current = { id, canvas, hasInk };
            if (hasInk) setHint(false);
          }}
          onNext={() => {
            keep(n);
            setHint(false);
            setStage({ kind: 'word', n: n + 1 });
          }}
        />
      ),
    };
  } else {
    spread = {
      id: `finale-${stage.show}`,
      left: <StarPage />,
      right: <StarPage flip />,
      overlay: (
        <Finale
          name={name.trim()}
          drawings={drawings}
          audio={audio.current}
          onMore={() => setStage({ kind: 'word', n: stage.n + 1 })}
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
