import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

type Stroke = { color: string; width: number; erase: boolean; pts: number[] };

export const PAD_W = 1000; // canvas pixels: twice the size it is shown at
export const PAD_H = 800;

const COLORS = [
  ['black', '#2f2f38'], ['red', '#f03e3e'], ['orange', '#fd7e14'], ['yellow', '#fcc419'],
  ['green', '#40c057'], ['blue', '#339af0'], ['purple', '#9c36b5'], ['pink', '#f783ac'], ['brown', '#8d5524'],
] as const;
const SIZES = [['thin', 6], ['medium', 14], ['fat', 30]] as const;

function setup(ctx: CanvasRenderingContext2D, s: Stroke) {
  ctx.globalCompositeOperation = s.erase ? 'destination-out' : 'source-over';
  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;
  ctx.lineWidth = s.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

/** Draws the piece of the stroke that ends at point number `k` (smoothed through midpoints). */
function segment(ctx: CanvasRenderingContext2D, s: Stroke, k: number) {
  const p = s.pts;
  const x = (i: number) => p[i * 2];
  const y = (i: number) => p[i * 2 + 1];
  ctx.beginPath();
  if (k === 0) {
    ctx.arc(x(0), y(0), s.width / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const mx = (x(k - 1) + x(k)) / 2;
  const my = (y(k - 1) + y(k)) / 2;
  if (k === 1) {
    ctx.moveTo(x(0), y(0));
    ctx.lineTo(mx, my);
  } else {
    ctx.moveTo((x(k - 2) + x(k - 1)) / 2, (y(k - 2) + y(k - 1)) / 2);
    ctx.quadraticCurveTo(x(k - 1), y(k - 1), mx, my);
  }
  ctx.stroke();
}

function tail(ctx: CanvasRenderingContext2D, s: Stroke) {
  const n = s.pts.length / 2;
  if (n < 2) return;
  const p = s.pts;
  ctx.beginPath();
  ctx.moveTo((p[n * 2 - 4] + p[n * 2 - 2]) / 2, (p[n * 2 - 3] + p[n * 2 - 1]) / 2);
  ctx.lineTo(p[n * 2 - 2], p[n * 2 - 1]);
  ctx.stroke();
}

export function DrawingPad({ onInk }: { onInk: (canvas: HTMLCanvasElement, hasInk: boolean) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const current = useRef<Stroke | null>(null);
  const [color, setColor] = useState<string>(COLORS[0][1]);
  const [size, setSize] = useState<number>(SIZES[1][1]);
  const [erase, setErase] = useState(false);
  const [count, setCount] = useState(0);

  const report = () => {
    setCount(strokes.current.length);
    onInk(canvasRef.current!, strokes.current.some((s) => !s.erase));
  };

  const redraw = () => {
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, PAD_W, PAD_H);
    for (const s of strokes.current) {
      setup(ctx, s);
      for (let k = 0; k < s.pts.length / 2; k++) segment(ctx, s, k);
      tail(ctx, s);
    }
  };

  const point = (e: { clientX: number; clientY: number }) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return [
      ((e.clientX - rect.left) * PAD_W) / rect.width,
      ((e.clientY - rect.top) * PAD_H) / rect.height,
    ];
  };

  const down = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (current.current || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const s: Stroke = { color, width: (erase ? Math.max(size, 14) * 1.6 : size) * 2, erase, pts: point(e) };
    current.current = s;
    const ctx = canvasRef.current!.getContext('2d')!;
    setup(ctx, s);
    segment(ctx, s, 0);
  };

  const move = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const s = current.current;
    if (!s) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    setup(ctx, s);
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [];
    for (const ev of events.length ? events : [e.nativeEvent]) {
      const [x, y] = point(ev);
      const n = s.pts.length;
      if (Math.hypot(x - s.pts[n - 2], y - s.pts[n - 1]) < 2) continue;
      s.pts.push(x, y);
      segment(ctx, s, s.pts.length / 2 - 1);
    }
  };

  const up = () => {
    const s = current.current;
    if (!s) return;
    current.current = null;
    const ctx = canvasRef.current!.getContext('2d')!;
    setup(ctx, s);
    tail(ctx, s);
    strokes.current.push(s);
    report();
  };

  const undo = () => {
    strokes.current.pop();
    redraw();
    report();
  };

  const clear = () => {
    strokes.current = [];
    redraw();
    report();
  };

  // Keep a finger on the pad from scrolling or zooming the page.
  useEffect(() => {
    const el = canvasRef.current!;
    const stop = (e: TouchEvent) => e.preventDefault();
    el.addEventListener('touchstart', stop, { passive: false });
    el.addEventListener('touchmove', stop, { passive: false });
    return () => {
      el.removeEventListener('touchstart', stop);
      el.removeEventListener('touchmove', stop);
    };
  }, []);

  return (
    <div className="pad">
      <canvas
        ref={canvasRef}
        className={`pad-canvas${erase ? ' is-erasing' : ''}`}
        width={PAD_W}
        height={PAD_H}
        aria-label="Drawing box"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      />
      <div className="pad-row" role="group" aria-label="Colors">
        {COLORS.map(([label, value]) => (
          <button
            key={value}
            type="button"
            className={`crayon${!erase && color === value ? ' is-on' : ''}`}
            style={{ background: value }}
            aria-label={label}
            aria-pressed={!erase && color === value}
            onClick={() => {
              setColor(value);
              setErase(false);
            }}
          />
        ))}
      </div>
      <div className="pad-row">
        {SIZES.map(([label, value]) => (
          <button
            key={value}
            type="button"
            className={`tool dot${size === value ? ' is-on' : ''}`}
            aria-label={`${label} line`}
            aria-pressed={size === value}
            onClick={() => setSize(value)}
          >
            <span style={{ width: value + 4, height: value + 4, background: erase ? '#adb5bd' : color }} />
          </button>
        ))}
        <button type="button" className={`tool${erase ? ' is-on' : ''}`} aria-pressed={erase} onClick={() => setErase(!erase)}>
          eraser
        </button>
        <button type="button" className="tool" disabled={!count} onClick={undo}>
          undo
        </button>
        <button type="button" className="tool" disabled={!count} onClick={clear}>
          start over
        </button>
      </div>
    </div>
  );
}
