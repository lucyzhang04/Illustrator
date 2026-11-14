import { MAX_PICTURES, cleanStoryboard } from './story';
import type { Backdrop, Key, Scene, Storyboard } from './story';

export type Drawing = { word: string; canvas: HTMLCanvasElement };

export const MOVIE_W = 1280;
export const MOVIE_H = 720;

const W = MOVIE_W;
const H = MOVIE_H;
const INK = '#2f2f38';
const HAND = '"Patrick Hand", "Comic Sans MS", cursive';
const READ = '"Andika", "Comic Sans MS", sans-serif';
const PASTELS = ['#ffe8a3', '#cfe8ff', '#ffd6e4', '#d3f5cf', '#e5dbff', '#ffe0c2'];
const CONFETTI = ['#ff6b6b', '#ffd43b', '#51cf66', '#4dabf7', '#da77f2', '#ff922b'];
const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5]; // C major pentatonic

type Note = { t: number; freq: number; dur: number; vol: number };

export type Movie = {
  name: string;
  drawings: Drawing[];
  board: Storyboard;
  /** The words the child drew, so the captions can make them stand out. */
  words: Set<string>;
  titleDur: number;
  per: number;
  endDur: number;
  total: number;
  notes: Note[];
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const easeOutCubic = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
const easeInCubic = (x: number) => Math.pow(clamp01(x), 3);
function easeOutBack(x: number) {
  const c = 1.9;
  const y = clamp01(x) - 1;
  return 1 + (c + 1) * y * y * y + c * y * y;
}

const tokens = (sentence: string) => sentence.split(' ').filter(Boolean);
const bare = (token: string) => token.toLowerCase().replace(/[^a-z]/g, '');

/** When each word of a caption pops in, relative to the start of its scene. */
function captionTiming(per: number, count: number) {
  const first = Math.min(0.7, per * 0.2);
  const step = Math.min(0.42, (per * 0.5) / count);
  return { first, step };
}

/** Lays the movie out so it lasts 15 to 30 seconds whatever the number of scenes. */
export function planMovie(name: string, drawings: Drawing[], board: Storyboard): Movie {
  const scenes = board.scenes;
  const titleDur = 3;
  const endDur = 5;
  const per = Math.max(2.75, Math.min(7, 22 / Math.max(1, scenes.length)));
  const total = titleDur + per * scenes.length + endDur;
  const words = new Set(drawings.map((d) => d.word));

  const notes: Note[] = [];
  for (let k = 0; k < 5; k++) notes.push({ t: 0.3 + k * 0.16, freq: SCALE[k], dur: 0.4, vol: 0.2 });
  scenes.forEach((scene, i) => {
    const start = titleDur + i * per;
    const list = tokens(scene.sentence);
    const { first, step } = captionTiming(per, list.length);
    list.forEach((token, j) => {
      const t = start + first + j * step;
      if (words.has(bare(token))) {
        for (const f of [SCALE[0], SCALE[2], SCALE[3]]) notes.push({ t, freq: f, dur: 0.6, vol: 0.14 });
      } else {
        notes.push({ t, freq: SCALE[(i + j) % SCALE.length], dur: 0.3, vol: 0.16 });
      }
    });
  });
  const endStart = titleDur + per * scenes.length;
  [0, 2, 3, 5].forEach((s, k) => notes.push({ t: endStart + 0.15 + k * 0.17, freq: SCALE[s], dur: 0.5, vol: 0.2 }));
  for (const f of [SCALE[0], SCALE[2], SCALE[3], SCALE[5]]) {
    notes.push({ t: endStart + 1, freq: f, dur: 1.6, vol: 0.12 });
  }
  return { name, drawings, board, words, titleDur, per, endDur, total, notes };
}

function rand(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function paper(ctx: CanvasRenderingContext2D, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.shadowColor = 'rgba(47,47,56,.18)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.roundRect(34, 34, W - 68, H - 68, 26);
  ctx.fill();
  ctx.restore();
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.restore();
}

/** Text centred on (x, y) that grows out of its own middle. */
function popText(
  ctx: CanvasRenderingContext2D, text: string, x: number, y: number,
  font: (size: number) => string, size: number, maxWidth: number, color: string, scale: number,
) {
  if (scale <= 0) return;
  let fs = size;
  ctx.font = font(fs);
  while (ctx.measureText(text).width > maxWidth && fs > 30) {
    fs -= 6;
    ctx.font = font(fs);
  }
  ctx.save();
  ctx.translate(x, y - fs * 0.3);
  ctx.scale(scale, scale);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.fillText(text, 0, fs * 0.3);
  ctx.restore();
}

/** How far a scene has slid in from the right or out to the left. */
function slide(ctx: CanvasRenderingContext2D, u: number, dur: number, enters: boolean) {
  const edge = Math.min(0.3, dur * 0.15);
  let dx = 0;
  let alpha = 1;
  if (enters && u < edge) {
    const k = easeOutCubic(u / edge);
    dx = (1 - k) * W * 0.5;
    alpha = k;
  } else if (u > dur - edge) {
    const k = easeInCubic((u - (dur - edge)) / edge);
    dx = -k * W * 0.5;
    alpha = 1 - k;
  }
  ctx.translate(dx, 0);
  ctx.globalAlpha = alpha;
}

function drawTitle(ctx: CanvasRenderingContext2D, u: number, m: Movie) {
  paper(ctx, PASTELS[0]);
  ctx.save();
  slide(ctx, u, m.titleDur, false);
  const hand = (s: number) => `${s}px ${HAND}`;
  const read = (s: number) => `700 ${s}px ${READ}`;
  if (m.board.title) {
    popText(ctx, m.board.title, W / 2, 330, read, 124, 1040, INK, easeOutBack(u / 0.5));
    popText(ctx, `a picture book by ${m.name}`, W / 2, 470, hand, 76, 1000, '#e8590c', easeOutBack((u - 0.4) / 0.5));
  } else {
    popText(ctx, `${m.name}'s`, W / 2, 300, hand, 150, 1000, '#e8590c', easeOutBack(u / 0.5));
    popText(ctx, 'Picture Book', W / 2, 460, read, 124, 1000, INK, easeOutBack((u - 0.35) / 0.5));
  }
  ctx.restore();
  const s = easeOutBack((u - 0.2) / 0.6);
  if (s > 0) {
    star(ctx, 150, 150, 44 * s, u * 0.8, '#ffd43b');
    star(ctx, W - 150, 170, 34 * s, -u * 0.9, '#ff8787');
    star(ctx, 190, H - 150, 30 * s, -u * 0.7, '#74c0fc');
    star(ctx, W - 180, H - 140, 46 * s, u * 0.6, '#8ce99a');
  }
}

const STAGE_H = 540;

function wavy(ctx: CanvasRenderingContext2D, y: number, amp: number, len: number, shift: number, color: string) {
  ctx.beginPath();
  ctx.moveTo(0, STAGE_H);
  for (let x = 0; x <= W; x += 16) ctx.lineTo(x, y + Math.sin((x + shift) / len) * amp);
  ctx.lineTo(W, STAGE_H);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawBackdrop(ctx: CanvasRenderingContext2D, kind: Backdrop, u: number, i: number) {
  const fill = (color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, W, H);
  };
  const rnd = rand(31 + i);
  if (kind === 'sunny') {
    fill('#d7efff');
    ctx.save();
    ctx.translate(1120, 120);
    ctx.rotate(u * 0.3);
    ctx.strokeStyle = '#f59f00';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    for (let r = 0; r < 10; r++) {
      ctx.rotate(Math.PI / 5);
      ctx.beginPath();
      ctx.moveTo(78, 0);
      ctx.lineTo(108, 0);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 60, 0, Math.PI * 2);
    ctx.fillStyle = '#ffe066';
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    wavy(ctx, 420, 10, 70, 0, '#b2f2bb');
    wavy(ctx, 470, 8, 50, 90, '#8ce99a');
  } else if (kind === 'night') {
    fill('#e3dcff');
    for (let p = 0; p < 14; p++) {
      const x = 60 + rnd() * (W - 120);
      const y = 40 + rnd() * 300;
      const tw = 0.7 + 0.3 * Math.sin(u * 3 + p);
      star(ctx, x, y, (12 + rnd() * 10) * tw, p, '#ffe066');
    }
    ctx.beginPath();
    ctx.arc(1110, 130, 66, 0, Math.PI * 2);
    ctx.fillStyle = '#fff3bf';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = INK;
    ctx.stroke();
    wavy(ctx, 450, 8, 80, 0, '#c5b8f5');
  } else if (kind === 'water') {
    fill('#e3f6ff');
    wavy(ctx, 330, 14, 46, u * 60, '#a5d8ff');
    wavy(ctx, 400, 14, 40, -u * 80, '#74c0fc');
    wavy(ctx, 470, 12, 36, u * 100, '#4dabf7');
  } else if (kind === 'snow') {
    fill('#eaf2fb');
    wavy(ctx, 440, 16, 110, 0, '#ffffff');
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#a5d8ff';
    ctx.lineWidth = 3;
    for (let p = 0; p < 40; p++) {
      const x = rnd() * W + Math.sin(u + p) * 20;
      const y = (rnd() * STAGE_H + u * (50 + rnd() * 60)) % STAGE_H;
      ctx.beginPath();
      ctx.arc(x, y, 5 + rnd() * 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (kind === 'rainbow') {
    fill('#fff6da');
    ['#ff6b6b', '#ff922b', '#ffd43b', '#51cf66', '#4dabf7', '#9775fa'].forEach((color, r) => {
      ctx.beginPath();
      ctx.arc(W / 2, 560, 520 - r * 34, Math.PI, 0);
      ctx.lineWidth = 30;
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.75;
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    wavy(ctx, 480, 8, 60, 0, '#d3f9d8');
  } else {
    fill(PASTELS[(i + 1) % PASTELS.length]);
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    for (let p = 0; p < 26; p++) {
      ctx.beginPath();
      ctx.arc(rnd() * W, rnd() * STAGE_H, 10 + rnd() * 16, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** A white copy of a drawing, used to give it a sticker-style outline. */
const stickers = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
function stickerOf(drawing: HTMLCanvasElement) {
  let sticker = stickers.get(drawing);
  if (!sticker) {
    sticker = document.createElement('canvas');
    sticker.width = 500;
    sticker.height = 400;
    const pad = 12;
    const shape = document.createElement('canvas');
    shape.width = 500;
    shape.height = 400;
    const sc = shape.getContext('2d')!;
    sc.drawImage(drawing, pad, pad, 500 - pad * 2, 400 - pad * 2);
    sc.globalCompositeOperation = 'source-in';
    sc.fillStyle = '#fff';
    sc.fillRect(0, 0, 500, 400);
    const c = sticker.getContext('2d')!;
    for (let a = 0; a < 16; a++) {
      c.drawImage(shape, Math.cos((a * Math.PI) / 8) * pad, Math.sin((a * Math.PI) / 8) * pad);
    }
    c.drawImage(drawing, pad, pad, 500 - pad * 2, 400 - pad * 2);
    stickers.set(drawing, sticker);
  }
  return sticker;
}

function poseAt(keys: Key[], p: number): Key {
  if (p <= keys[0].at) return keys[0];
  const last = keys[keys.length - 1];
  if (p >= last.at) return last;
  let n = 1;
  while (keys[n].at < p) n++;
  const a = keys[n - 1];
  const b = keys[n];
  const raw = (p - a.at) / Math.max(0.0001, b.at - a.at);
  const e = raw * raw * (3 - 2 * raw);
  const mix = (from: number, to: number) => from + (to - from) * e;
  return { at: p, x: mix(a.x, b.x), y: mix(a.y, b.y), size: mix(a.size, b.size), tilt: mix(a.tilt, b.tilt) };
}

function drawScene(ctx: CanvasRenderingContext2D, u: number, i: number, scene: Scene, m: Movie) {
  const D = m.per;
  drawBackdrop(ctx, scene.backdrop, u, i);
  const fade = Math.min(0.25, D * 0.1);
  const alpha = Math.min(clamp01(u / fade), clamp01((D - u) / fade));

  // The drawings act out the sentence.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, STAGE_H + 20);
  ctx.clip();
  ctx.globalAlpha = alpha;
  const p = clamp01(u / (D * 0.85));
  scene.actors.forEach((actor, j) => {
    const drawing = m.drawings[actor.picture];
    if (!drawing) return;
    const pose = poseAt(actor.keys, p);
    const h = (pose.size / 100) * STAGE_H;
    const w = h * 1.25;
    ctx.save();
    ctx.translate((pose.x / 100) * W, (pose.y / 100) * STAGE_H + Math.sin(u * 3 + j * 2) * 5);
    ctx.rotate(((pose.tilt + Math.sin(u * 2.2 + j) * 2) * Math.PI) / 180);
    ctx.drawImage(stickerOf(drawing.canvas), -w / 2, -h / 2, w, h);
    ctx.restore();
  });
  ctx.restore();

  // The sentence, read along one word at a time.
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(60, 548, W - 120, 136, 28);
  ctx.fill();
  ctx.stroke();
  const list = tokens(scene.sentence);
  let fs = 86;
  const font = () => `700 ${fs}px ${READ}`;
  ctx.font = font();
  while (ctx.measureText(scene.sentence).width > W - 220 && fs > 34) {
    fs -= 4;
    ctx.font = font();
  }
  const space = ctx.measureText(' ').width;
  const widths = list.map((token) => ctx.measureText(token).width);
  let x = W / 2 - (widths.reduce((sum, w) => sum + w, 0) + space * (list.length - 1)) / 2;
  const { first, step } = captionTiming(D, list.length);
  const baseY = 616 + fs * 0.34;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  list.forEach((token, j) => {
    const since = u - (first + j * step);
    const s = easeOutBack(since / 0.3);
    const special = m.words.has(bare(token));
    if (s > 0) {
      const hop = special ? -Math.abs(Math.sin(since * 7)) * 18 * Math.max(0, 1 - since / 1.1) : 0;
      ctx.save();
      ctx.translate(x + widths[j] / 2, baseY - fs * 0.3 + hop);
      ctx.scale(s, s);
      ctx.fillStyle = special ? '#e8590c' : INK;
      ctx.fillText(token, 0, fs * 0.3);
      ctx.restore();
    }
    x += widths[j] + space;
  });
  ctx.restore();
}

function drawEnd(ctx: CanvasRenderingContext2D, u: number, m: Movie) {
  paper(ctx, PASTELS[3]);
  const hasPictures = m.drawings.length > 0;
  popText(ctx, 'The End', W / 2, hasPictures ? 180 : 330, (s) => `${s}px ${HAND}`, 150, 1000, '#e8590c', easeOutBack(u / 0.5));
  ctx.save();
  ctx.globalAlpha = clamp01((u - 0.4) / 0.4);
  popText(ctx, `by ${m.name}`, W / 2, hasPictures ? 262 : 430, (s) => `${s}px ${HAND}`, 64, 900, INK, 1);
  ctx.restore();

  // Every picture again, as a little gallery.
  const max = 12;
  const all = m.drawings;
  const shown = all.length <= max ? all : all.slice(all.length - max);
  const k = shown.length;
  if (k > 0) {
    const rows = k <= 6 ? 1 : 2;
    const cols = Math.ceil(k / rows);
    const cell = Math.min(1060 / cols, 350 / rows);
    const top = 300 + (350 - cell * rows) / 2;
    shown.forEach((d, idx) => {
      const r = Math.floor(idx / cols);
      const inRow = r === rows - 1 ? k - cols * (rows - 1) : cols;
      const c = idx - r * cols;
      const cx = W / 2 + (c - (inRow - 1) / 2) * cell;
      const cy = top + r * cell + cell / 2;
      const s = easeOutBack((u - (0.6 + idx * 0.14)) / 0.4);
      if (s <= 0) return;
      const w = cell - 22;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(((idx % 2 ? 2.5 : -2.5) * Math.PI) / 180);
      ctx.scale(s, s);
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -w / 2, w, w, 10);
      ctx.fill();
      ctx.stroke();
      const iw = w - 14;
      ctx.drawImage(d.canvas, -iw / 2, -w / 2 + 7, iw, iw * 0.8);
      ctx.font = `700 ${Math.round(w * 0.15)}px ${READ}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = INK;
      ctx.fillText(d.word, 0, w / 2 - w * 0.05);
      ctx.restore();
    });
  }

  const rnd = rand(7);
  for (let p = 0; p < 70; p++) {
    const x0 = rnd() * W;
    const speed = 140 + rnd() * 160;
    const phase = rnd();
    const color = CONFETTI[Math.floor(rnd() * CONFETTI.length)];
    const y = ((u * speed + phase * 900) % (H + 80)) - 40;
    ctx.save();
    ctx.translate(x0 + Math.sin(u * 2 + phase * 6) * 30, y);
    ctx.rotate(u * 3 + phase * 6);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(-6, -9, 12, 18);
    ctx.restore();
  }
}

/** Draws the movie as it looks `t` seconds in. */
export function renderMovie(ctx: CanvasRenderingContext2D, t: number, m: Movie) {
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  const scenes = m.board.scenes;
  const n = scenes.length;
  if (t < m.titleDur) {
    drawTitle(ctx, t, m);
  } else if (n > 0 && t < m.titleDur + n * m.per) {
    const i = Math.min(n - 1, Math.floor((t - m.titleDur) / m.per));
    drawScene(ctx, t - m.titleDur - i * m.per, i, scenes[i], m);
  } else {
    drawEnd(ctx, Math.min(t - m.titleDur - n * m.per, m.endDur), m);
  }
  ctx.restore();
}

/** Something to look at while the story is being written. */
export function renderWaiting(ctx: CanvasRenderingContext2D, t: number, drawings: Drawing[]) {
  ctx.save();
  paper(ctx, PASTELS[1]);
  popText(ctx, 'Making your movie', W / 2, 200, (s) => `${s}px ${HAND}`, 110, 1000, INK, 1);
  const shown = drawings.slice(0, 6);
  shown.forEach((d, j) => {
    const h = 200;
    const x = W / 2 + (j - (shown.length - 1) / 2) * 190;
    const y = 430 - Math.abs(Math.sin(t * 3 - j * 0.6)) * 50;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t * 2 + j) * 0.08);
    ctx.drawImage(stickerOf(d.canvas), -h * 0.625, -h / 2, h * 1.25, h);
    ctx.restore();
  });
  for (let dot = 0; dot < 3; dot++) {
    ctx.beginPath();
    ctx.arc(W / 2 - 40 + dot * 40, 610 - Math.abs(Math.sin(t * 4 - dot * 0.7)) * 22, 11, 0, Math.PI * 2);
    ctx.fillStyle = CONFETTI[dot];
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Asks Fable for a storyboard. The drawings are sent small, on white, without
 * the child's name. Gives null when the server can't help.
 */
export async function fetchStoryboard(drawings: Drawing[], signal: AbortSignal): Promise<Storyboard | null> {
  if (!drawings.length || drawings.length > MAX_PICTURES) return null;
  const small = document.createElement('canvas');
  small.width = 400;
  small.height = 320;
  const sc = small.getContext('2d')!;
  const pictures = drawings.map((d) => {
    sc.fillStyle = '#fff';
    sc.fillRect(0, 0, 400, 320);
    sc.drawImage(d.canvas, 0, 0, 400, 320);
    return { word: d.word, image: small.toDataURL('image/png') };
  });
  try {
    const res = await fetch('/api/storyboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pictures }),
      signal,
    });
    if (!res.ok) return null;
    return cleanStoryboard(await res.json(), drawings.length);
  } catch {
    return null;
  }
}

function pluck(audio: AudioContext, out: AudioNode, when: number, note: Note) {
  const osc = audio.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = note.freq;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.linearRampToValueAtTime(note.vol, when + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0008, when + note.dur);
  osc.connect(gain);
  gain.connect(out);
  osc.start(when);
  osc.stop(when + note.dur + 0.05);
}

function pickMime(withAudio: boolean): string | undefined {
  const options = withAudio
    ? ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus']
    : ['video/mp4;codecs=avc1.42E01E', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8'];
  return [...options, 'video/webm', 'video/mp4'].find((t) => MediaRecorder.isTypeSupported(t));
}

export const canRecordMovie = () =>
  typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function';

/**
 * Plays the movie on the canvas in real time. With `record`, it is also
 * captured, and `done` gives back the video file once the movie ends.
 */
export function playMovie(
  canvas: HTMLCanvasElement, m: Movie, opts: { record: boolean; audio: AudioContext | null },
): { done: Promise<Blob | null>; cancel: () => void; pause: () => void; resume: () => void } {
  const ctx = canvas.getContext('2d')!;
  const audio = opts.audio && opts.audio.state !== 'closed' ? opts.audio : null;
  let cancelled = false;
  let raf = 0;
  let recorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let master: GainNode | null = null;
  const chunks: Blob[] = [];
  let cancel = () => {};
  let pause = () => {};
  let resume = () => {};

  renderMovie(ctx, 0, m);
  if (audio) {
    void audio.resume();
    master = audio.createGain();
    master.gain.value = 0.6;
    master.connect(audio.destination);
  }
  if (opts.record && canRecordMovie()) {
    try {
      stream = canvas.captureStream(30);
      let hasAudio = false;
      if (audio && master) {
        const dest = audio.createMediaStreamDestination();
        master.connect(dest);
        dest.stream.getAudioTracks().forEach((track) => stream!.addTrack(track));
        hasAudio = true;
      }
      recorder = new MediaRecorder(stream, { mimeType: pickMime(hasAudio), videoBitsPerSecond: 4_000_000 });
    } catch {
      recorder = null;
    }
  }

  const done = new Promise<Blob | null>((resolve) => {
    const stopAll = () => {
      master?.disconnect();
      stream?.getTracks().forEach((track) => track.stop());
    };
    if (recorder) {
      const rec = recorder;
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.onstop = () => {
        stopAll();
        resolve(cancelled || !chunks.length ? null : new Blob(chunks, { type: rec.mimeType || chunks[0].type }));
      };
      rec.onerror = () => {
        stopAll();
        resolve(null);
      };
      rec.start(1000);
    }
    const finish = () => {
      if (recorder && recorder.state !== 'inactive') recorder.stop();
      else {
        stopAll();
        resolve(null);
      }
    };

    if (audio && master) {
      const a0 = audio.currentTime + 0.06;
      for (const note of m.notes) pluck(audio, master, a0 + note.t, note);
    }
    // Movie time only moves while playing, so a pause can last as long as it likes.
    let t0 = performance.now();
    let played = 0;
    let paused = false;
    let ended = false;
    const frame = () => {
      if (cancelled || paused) return;
      const t = played + (performance.now() - t0) / 1000;
      renderMovie(ctx, Math.min(t, m.total), m);
      if (t < m.total + 0.3) raf = requestAnimationFrame(frame);
      else {
        ended = true;
        finish();
      }
    };
    raf = requestAnimationFrame(frame);
    pause = () => {
      if (cancelled || paused || ended) return;
      paused = true;
      played += (performance.now() - t0) / 1000;
      cancelAnimationFrame(raf);
      if (recorder?.state === 'recording') recorder.pause();
      void audio?.suspend(); // holds the music that is still to come
    };
    resume = () => {
      if (cancelled || !paused || ended) return;
      paused = false;
      t0 = performance.now();
      if (recorder?.state === 'paused') recorder.resume();
      void audio?.resume();
      raf = requestAnimationFrame(frame);
    };
    cancel = () => {
      if (cancelled) return;
      cancelled = true;
      cancelAnimationFrame(raf);
      void audio?.resume();
      finish();
    };
  });

  return { done, cancel: () => cancel(), pause: () => pause(), resume: () => resume() };
}

/** One picture with every drawing and its word, ready to print or keep. */
export function makePoster(name: string, drawings: Drawing[]): Promise<Blob | null> {
  const cols = Math.min(3, Math.max(1, drawings.length));
  const rows = Math.ceil(drawings.length / cols);
  const cellW = 520;
  const cellH = 500;
  const pad = 50;
  const head = 190;
  const canvas = document.createElement('canvas');
  canvas.width = pad * 2 + cols * cellW;
  canvas.height = head + rows * cellH + pad;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  popText(ctx, `${name}'s Picture Book`, canvas.width / 2, 130, (s) => `${s}px ${HAND}`, 100, canvas.width - 80, '#e8590c', 1);
  drawings.forEach((d, i) => {
    const x = pad + (i % cols) * cellW + 20;
    const y = head + Math.floor(i / cols) * cellH;
    const w = cellW - 40;
    ctx.lineWidth = 5;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.roundRect(x, y, w, w * 0.8, 14);
    ctx.stroke();
    ctx.drawImage(d.canvas, x, y, w, w * 0.8);
    ctx.font = `700 64px ${READ}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = INK;
    ctx.fillText(d.word, x + w / 2, y + w * 0.8 + 68);
  });
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
