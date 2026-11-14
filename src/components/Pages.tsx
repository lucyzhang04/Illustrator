import { useRef } from 'react';
import { DrawingPad } from './DrawingPad';
import { canSpeak, isVowel, speak } from '../lib/words';

/** The little card in the middle of the opening pages that asks for a name. */
export function NameCard({ name, onName, onNext }: { name: string; onName: (v: string) => void; onNext: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const ready = name.trim().length > 0;
  return (
    <>
      <form
        className="namecard"
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) onNext();
        }}
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget) input.current?.focus({ preventScroll: true });
        }}
      >
        {/* a tiny friend waving from the corner of the card */}
        <svg className="namecard-doodle" viewBox="0 0 80 100" aria-hidden="true">
          <g fill="none" stroke="#2f2f38" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="40" cy="26" r="15" fill="#fff" />
            <path d="M34,24 l0,1 M46,24 l0,1 M33,31 q7,7 14,0" />
            <path d="M40,41 L40,72 M40,72 L28,96 M40,72 L52,96 M40,50 L20,60 M40,50 L62,30" />
            <path d="M66,22 l6,-6 M70,30 l8,-2" stroke="#f08c00" />
          </g>
        </svg>
        <h1>Hi! What is your name?</h1>
        <label className="namecard-line">
          <span>My name is</span>
          <input
            ref={input}
            value={name}
            onChange={(e) => onName(e.target.value.slice(0, 12))}
            maxLength={12}
            autoComplete="off"
            autoCapitalize="words"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            aria-label="Your name"
          />
          <span>.</span>
        </label>
      </form>
      <button type="button" className="btn btn-next pop-in" disabled={!ready} onClick={onNext}>
        Next <span aria-hidden="true">→</span>
      </button>
    </>
  );
}

/** Left-hand page: the word to read. */
export function WordPage({ name, word, count, hint, onDone }: {
  name: string; word: string; count: number; hint: boolean; onDone: () => void;
}) {
  return (
    <div className="wordpage">
      <p className="hello">Hi, {name}!</p>
      <p className="ask">Can you read this word?</p>
      <div className="word" aria-label={word}>
        {[...word].map((ch, i) => (
          <span key={i} className={isVowel(ch) ? 'vowel' : undefined} aria-hidden="true">{ch}</span>
        ))}
      </div>
      {canSpeak() && (
        <button type="button" className="tool hear" onClick={() => speak(word)}>
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <path d="M5,12 h6 l8,-7 v22 l-8,-7 h-6 Z" fill="#ffd43b" stroke="#2f2f38" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M23,11 q4,5 0,10 M26,7 q7,9 0,18" fill="none" stroke="#2f2f38" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          hear it
        </button>
      )}
      <p className="then">
        Now draw it!
        <svg viewBox="0 0 120 50" aria-hidden="true">
          <path d="M6,30 q40,-28 100,-6 M88,10 l20,14 l-22,12" fill="none" stroke="#e8590c" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </p>
      <div className="done-row">
        <button type="button" className="btn btn-done" onClick={onDone}>I'm done!</button>
        {hint
          ? <span className="tally nudge" role="status">Draw a picture first!</span>
          : count > 0 && <span className="tally">{count} {count === 1 ? 'picture' : 'pictures'} so far</span>}
      </div>
    </div>
  );
}

/** Right-hand page: the drawing box. */
export function DrawPage({ onInk, onNext }: {
  onInk: (canvas: HTMLCanvasElement, hasInk: boolean) => void; onNext: () => void;
}) {
  return (
    <div className="drawpage">
      <DrawingPad onInk={onInk} />
      <button type="button" className="btn btn-next" onClick={onNext}>
        Next <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}

/** A quiet page with a few stars, behind the movie screen. */
export function StarPage({ flip }: { flip?: boolean }) {
  const stars = [[92, 96, 30, '#ffd43b'], [84, 330, 20, '#ff8787'], [66, 704, 24, '#74c0fc'], [330, 716, 20, '#8ce99a']] as const;
  return (
    <svg className="starpage" viewBox="0 0 600 750" aria-hidden="true" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      {stars.map(([x, y, r, color], i) => (
        <path
          key={i}
          transform={`translate(${x} ${y}) rotate(${i * 17})`}
          d={Array.from({ length: 10 }, (_, k) => {
            const rr = k % 2 ? r * 0.45 : r;
            const a = (k * Math.PI) / 5 - Math.PI / 2;
            return `${k ? 'L' : 'M'}${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr).toFixed(1)}`;
          }).join(' ') + ' Z'}
          fill={color}
          stroke="#2f2f38"
          strokeWidth="4"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
