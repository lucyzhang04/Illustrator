import { useRef, useState } from 'react';
import type { ReactNode } from 'react';

/** Two facing pages, plus anything that sits on top of both (shown once the page has settled). */
export type Spread = { id: string; left: ReactNode; right: ReactNode; overlay?: ReactNode };

/**
 * An open book. Whenever the spread's id changes, the right-hand page turns
 * over to reveal the new spread.
 */
export function Book({ spread }: { spread: Spread }) {
  const [settledId, setSettledId] = useState(spread.id);
  const settled = useRef(spread);
  const flipping = spread.id !== settledId;
  if (!flipping) settled.current = spread;
  const from = flipping ? settled.current : spread;

  return (
    <div className={`book${flipping ? ' is-flipping' : ''}`}>
      <div className="cover" />
      <div className="pages">
        <div className="slot slot-left">
          <div className="page is-left" key={from.id}>{from.left}</div>
        </div>
        {flipping && (
          <div className="slot slot-right">
            <div className="page is-right" key={spread.id}>{spread.right}</div>
          </div>
        )}
        <div
          className="leaf"
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget) setSettledId(spread.id);
          }}
        >
          <div className="face front">
            <div className="page is-right" key={from.id}>{from.right}</div>
          </div>
          {flipping && (
            <div className="face back">
              <div className="page is-left" key={spread.id}>{spread.left}</div>
            </div>
          )}
        </div>
        <div className="seam" />
        {!flipping && spread.overlay && (
          <div className="overlay" key={spread.id}>{spread.overlay}</div>
        )}
      </div>
    </div>
  );
}
