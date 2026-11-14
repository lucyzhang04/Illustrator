import { useRef, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Two facing pages, plus anything that sits on top of both (shown once the
 * page has settled). `order` says where the spread is in the book, so the
 * book knows which way to turn.
 */
export type Spread = { id: string; order: number; left: ReactNode; right: ReactNode; overlay?: ReactNode };

/**
 * An open book. Whenever the spread's id changes, a page turns to reveal the
 * new spread: the right-hand page going forward, the left-hand page going back.
 */
export function Book({ spread }: { spread: Spread }) {
  const [settledId, setSettledId] = useState(spread.id);
  const settled = useRef(spread);
  const flipping = spread.id !== settledId;
  if (!flipping) settled.current = spread;
  const from = flipping ? settled.current : spread;
  const forward = flipping && spread.order >= from.order;
  const back = flipping && !forward;
  const settle = (e: React.AnimationEvent) => {
    if (e.target === e.currentTarget) setSettledId(spread.id);
  };

  return (
    <div className={`book${forward ? ' is-flipping is-forward' : ''}${back ? ' is-flipping is-back' : ''}`}>
      <div className="cover" />
      <div className="pages">
        <div className="slot slot-left">
          {back
            ? <div className="page is-left" key={spread.id}>{spread.left}</div>
            : <div className="page is-left" key={from.id}>{from.left}</div>}
        </div>
        {forward && (
          <div className="slot slot-right">
            <div className="page is-right" key={spread.id}>{spread.right}</div>
          </div>
        )}
        <div className="leaf leaf-right" onAnimationEnd={settle}>
          <div className="face front">
            <div className="page is-right" key={from.id}>{from.right}</div>
          </div>
          {forward && (
            <div className="face back">
              <div className="page is-left" key={spread.id}>{spread.left}</div>
            </div>
          )}
        </div>
        {back && (
          <div className="leaf leaf-left" onAnimationEnd={settle}>
            <div className="face front">
              <div className="page is-left" key={from.id}>{from.left}</div>
            </div>
            <div className="face back">
              <div className="page is-right" key={spread.id}>{spread.right}</div>
            </div>
          </div>
        )}
        <div className="seam" />
        {!flipping && spread.overlay && (
          <div className="overlay" key={spread.id}>{spread.overlay}</div>
        )}
      </div>
    </div>
  );
}
