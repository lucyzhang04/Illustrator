import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MOVIE_H, MOVIE_W, canRecordMovie, download, fetchStoryboard, makePoster, planMovie, playMovie, renderWaiting,
} from '../lib/movie';
import type { Drawing, Movie } from '../lib/movie';
import { localStoryboard } from '../lib/story';

const WAIT_FOR_STORY_MS = 50_000;

/** The movie screen: writes the story, plays it, and offers things to keep. */
export function Finale({ name, drawings, audio, onMore }: {
  name: string; drawings: Drawing[]; audio: AudioContext | null; onMore: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playing = useRef<{ cancel: () => void } | null>(null);
  const [movie, setMovie] = useState<Movie | null>(null);
  const [busy, setBusy] = useState(true);
  const [video, setVideo] = useState<Blob | null>(null);

  const play = useCallback((m: Movie, record: boolean) => {
    playing.current?.cancel();
    setBusy(true);
    const run = playMovie(canvasRef.current!, m, { record, audio });
    playing.current = run;
    void run.done.then((blob) => {
      if (playing.current !== run) return;
      if (blob) setVideo(blob);
      setBusy(false);
    });
  }, [audio]);

  // Write the story (Fable if it answers, our own if not), then roll the film.
  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!;
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), WAIT_FOR_STORY_MS);
    let alive = true;
    let raf = 0;
    const t0 = performance.now();
    const wait = () => {
      renderWaiting(ctx, (performance.now() - t0) / 1000, drawings);
      raf = requestAnimationFrame(wait);
    };
    wait();

    void (async () => {
      const fonts = Promise.all([
        document.fonts.load('700 100px Andika'),
        document.fonts.load('100px "Patrick Hand"'),
      ]).catch(() => undefined);
      const board = (await fetchStoryboard(drawings, abort.signal)) ?? localStoryboard(drawings.map((d) => d.word));
      await fonts;
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      if (!alive) return;
      const m = planMovie(name, drawings, board);
      setMovie(m);
      play(m, true);
    })();

    return () => {
      alive = false;
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      abort.abort();
      playing.current?.cancel();
      playing.current = null;
    };
  }, [name, drawings, play]);

  const file = name.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'my';
  const savePictures = async () => {
    const blob = await makePoster(name, drawings);
    if (blob) download(blob, `${file}-picture-book.png`);
  };

  return (
    <div className="finale pop-in">
      <h1>{name}'s movie</h1>
      <div className="screen">
        <canvas ref={canvasRef} width={MOVIE_W} height={MOVIE_H} aria-label={`A short movie of ${name}'s drawings`} />
      </div>
      <div className="finale-row">
        <button type="button" className="btn btn-plain" disabled={busy || !movie} onClick={() => movie && play(movie, false)}>
          Watch again
        </button>
        {canRecordMovie() && (
          <button
            type="button"
            className="btn btn-save"
            disabled={busy || !video}
            onClick={() => video && download(video, `${file}-movie.${video.type.includes('mp4') ? 'mp4' : 'webm'}`)}
          >
            Save movie
          </button>
        )}
        <button type="button" className="btn btn-save" onClick={() => void savePictures()}>Save pictures</button>
        <button type="button" className="btn btn-next-inline" disabled={busy} onClick={onMore}>
          Draw more <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
