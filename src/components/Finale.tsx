import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MOVIE_H, MOVIE_W, canRecordMovie, download, fetchStoryboard, makePoster, planMovie, playMovie, renderWaiting,
} from '../lib/movie';
import type { Drawing, Movie } from '../lib/movie';
import { localStoryboard } from '../lib/story';

const WAIT_FOR_STORY_MS = 50_000;

/** The movie screen: writes the story, plays it, and offers things to keep. */
export function Finale({ name, drawings, audio, onBack, onMore }: {
  name: string; drawings: Drawing[]; audio: AudioContext | null; onBack: () => void; onMore: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playing = useRef<ReturnType<typeof playMovie> | null>(null);
  const [movie, setMovie] = useState<Movie | null>(null);
  const [busy, setBusy] = useState(true);
  const [paused, setPaused] = useState(false);
  const [video, setVideo] = useState<Blob | null>(null);

  const play = useCallback((m: Movie, record: boolean) => {
    playing.current?.cancel();
    setBusy(true);
    setPaused(false);
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

  /** Stops the movie where it is so there is time to read, or starts it again. */
  const togglePause = () => {
    if (!busy || !movie || !playing.current) return;
    if (paused) playing.current.resume();
    else playing.current.pause();
    setPaused(!paused);
  };

  const file = name.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'my';
  const savePictures = async () => {
    const blob = await makePoster(name, drawings);
    if (blob) download(blob, `${file}-picture-book.png`);
  };

  return (
    <div className="finale pop-in">
      <h1>{name}'s movie</h1>
      <div className={`screen${paused ? ' is-paused' : ''}`}>
        <canvas
          ref={canvasRef}
          width={MOVIE_W}
          height={MOVIE_H}
          aria-label={`A short movie of ${name}'s drawings. Tap to pause or play.`}
          onClick={togglePause}
        />
      </div>
      <div className="finale-row">
        <button type="button" className="btn btn-plain" onClick={onBack}>
          <span aria-hidden="true">←</span> Back
        </button>
        {busy ? (
          <button type="button" className="btn btn-pause" disabled={!movie} onClick={togglePause}>
            {paused ? 'Play' : 'Pause'}
          </button>
        ) : (
          <button type="button" className="btn btn-pause" disabled={!movie} onClick={() => movie && play(movie, false)}>
            Watch again
          </button>
        )}
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
        <button type="button" className="btn btn-next-inline" onClick={onMore}>
          Draw more <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
