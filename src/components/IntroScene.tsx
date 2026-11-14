import type { CSSProperties } from 'react';
import './intro.css';

const BROWN = { stroke: '#8d5524' };
const delay = (s: number): CSSProperties => ({ animationDelay: `${s}s` });

function Block({ x, y, letter, color, wait, tilt }: { x: number; y: number; letter: string; color: string; wait: number; tilt: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="drop" style={delay(wait)}>
        <g transform={`rotate(${tilt})`}>
          <rect className="inkf" x="-29" y="-58" width="58" height="58" rx="7" fill={color} />
          <text className="block-letter" x="0" y="-14" textAnchor="middle">{letter}</text>
        </g>
      </g>
    </g>
  );
}

/**
 * The opening drawing: everyone arrives once and then stays put. It spans both
 * pages, so each page shows its own half of the same 1200 x 750 picture.
 */
export function IntroScene({ side }: { side: 'left' | 'right' }) {
  const wobble = `wobble-${side}`;
  const W: CSSProperties = { filter: `url(#${wobble})` };
  const wormClip = `worm-${side}`;

  return (
    <svg className={`sc sc-${side}`} viewBox="0 0 1200 750" aria-hidden="true">
      <defs>
        {/* Makes every line a little shaky, like a hand-drawn one. */}
        <filter id={wobble} x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="4" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <clipPath id={wormClip}>
          <rect x="-90" y="-220" width="180" height="216" />
        </clipPath>
      </defs>

      {/* Sun in the corner, drawn on. */}
      <g transform="translate(96 98)">
        <g style={W}>
          <circle className="sun-fill" r="40" fill="#ffe066" />
          <circle className="ink draw" style={{ stroke: '#f08c00' }} r="40" pathLength={1} />
          {Array.from({ length: 8 }, (_, i) => (
            <path
              key={i}
              className="ink draw"
              style={{ stroke: '#f08c00', ...delay(0.9 + i * 0.07) }}
              pathLength={1}
              transform={`rotate(${i * 45})`}
              d="M54,0 L78,3"
            />
          ))}
        </g>
      </g>

      {/* A scribble of grass for the friends to stand on. */}
      <g style={W}>
        <path
          className="ink draw"
          style={{ stroke: '#51cf66', ...delay(0.5) }}
          pathLength={1}
          d="M236,698 q18,-10 36,0 t36,0 t36,0 t36,0 t36,0 t36,0 t36,0 t36,0 t36,0"
        />
      </g>

      {/* ABC blocks tumble in. */}
      <g style={W}>
        <Block x={96} y={700} letter="A" color="#ff8787" wait={1.5} tilt={-3} />
        <Block x={162} y={700} letter="B" color="#74c0fc" wait={1.8} tilt={4} />
        <Block x={130} y={641} letter="C" color="#8ce99a" wait={2.1} tilt={-6} />
      </g>

      {/* A boy walks in, laughing, with a book to show his friend. */}
      <g transform="translate(328 692)">
        <g className="boy-in">
          <g className="boy-bob">
            <g style={W}>
              <g className="leg-a"><path className="ink" d="M0,-70 L-13,0 l15,0" /></g>
              <g className="leg-b"><path className="ink" d="M0,-70 L13,0 l15,0" /></g>
              <path d="M-18,-127 L20,-129 L24,-66 L-22,-63 Z" fill="#4dabf7" opacity=".9" />
              <path className="ink" d="M0,-130 L0,-70" />
              <circle className="inkf" cx="0" cy="-158" r="28" fill="#fff" />
              <path className="ink" style={BROWN} d="M-27,-165 L-22,-191 L-13,-176 L-5,-196 L5,-178 L14,-194 L21,-175 L27,-167" />
              <path className="ink" d="M-7,-164 q5,-9 10,0 M9,-164 q5,-9 10,0" />
              <path className="inkf" d="M-7,-151 q13,21 26,0 Z" fill="#ff6b6b" />
              <g className="boy-show">
                <path className="ink" d="M0,-116 L30,-100" />
                <g transform="translate(48 -102)">
                  <path className="inkf" fill="#ffd43b" d="M0,4 L-25,-4 L-25,-38 L0,-30 Z" />
                  <path className="inkf" fill="#ffd43b" d="M0,4 L25,-4 L25,-38 L0,-30 Z" />
                  <path className="ink" style={{ strokeWidth: 3 }} d="M8,-20 l10,-3 M8,-12 l10,-3" />
                </g>
                <path className="ink" d="M0,-116 L42,-92" />
              </g>
            </g>
          </g>
        </g>
      </g>

      {/* His friend floats down under three balloons. */}
      <g transform="translate(462 692)">
        <g className="friend-in">
          <g style={W}>
            <path className="ink" style={{ strokeWidth: 2.5 }} d="M24,-150 L46,-196 M24,-150 L70,-184 M24,-150 L20,-202" />
            <ellipse className="inkf" cx="46" cy="-216" rx="16" ry="20" fill="#ff6b6b" />
            <ellipse className="inkf" cx="72" cy="-204" rx="16" ry="20" fill="#ffd43b" />
            <ellipse className="inkf" cx="19" cy="-222" rx="16" ry="20" fill="#74c0fc" />
            <path className="ink" d="M-8,-62 L-10,0 l-13,0 M8,-62 L10,0 l-13,0" />
            <path className="inkf" fill="#da77f2" d="M0,-131 L-33,-60 L33,-60 Z" />
            <circle className="inkf" cx="0" cy="-158" r="27" fill="#fff" />
            <path className="ink" style={{ stroke: '#f08c00' }} d="M-27,-160 q-4,-34 27,-29 q32,-4 27,29 M27,-160 q11,20 5,46 M22,-172 q14,18 12,52 M-26,-166 q8,-14 26,-18" />
            <circle cx="-12" cy="-162" r="3.2" fill="#2f2f38" />
            <circle cx="4" cy="-162" r="3.2" fill="#2f2f38" />
            <path className="ink" d="M-15,-150 q10,12 21,0" />
            <path className="ink" d="M0,-116 L-30,-98 M0,-116 L24,-150" />
          </g>
        </g>
      </g>

      {/* A conveyor belt rolls in from the right... */}
      <g className="belt-in">
        <g style={W}>
          <path className="ink" d="M772,684 L758,714 M772,684 L788,714 M1090,684 L1076,714 M1090,684 L1106,714" />
          <rect className="inkf" x="724" y="656" width="520" height="28" rx="14" fill="#dee2e6" />
          {Array.from({ length: 9 }, (_, i) => (
            <g key={i} transform={`translate(${742 + i * 56} 670)`}>
              <g className="wheel">
                <circle className="inkf" r="9" fill="#fff" style={{ strokeWidth: 3 }} />
                <path className="ink" style={{ strokeWidth: 3 }} d="M-6,0 L6,0" />
              </g>
            </g>
          ))}
          <path className="belt-dash" d="M738,656 L1240,656" />
        </g>
      </g>

      {/* ...carrying a girl who is far too busy drawing to notice. */}
      <g transform="translate(872 654)">
        <g className="girl-in">
          <g style={W}>
            <path className="inkf" fill="#fff" d="M-172,-2 L-86,-2 L-74,-19 L-160,-19 Z" />
            <path className="ink draw" style={{ stroke: '#ff6b6b', strokeWidth: 3.5, ...delay(3.7), animationDuration: '.8s' }} pathLength={1} d="M-152,-8 q7,-9 14,0 t14,0 t14,0 t14,0" />
            <path className="ink" d="M50,-16 L96,-8" />
            <g className="kick-a"><path className="ink" d="M96,-8 L88,-54 l-13,-4" /></g>
            <g className="kick-b"><path className="ink" d="M96,-8 L113,-50 l-11,-8" /></g>
            <path fill="#ff922b" opacity=".9" d="M-42,-50 L56,-31 L60,-4 L-34,-20 Z" />
            <path className="ink" d="M-40,-36 L50,-16" />
            <path className="ink" d="M-40,-36 L-28,-4 L-66,-4" />
            <circle className="inkf" cx="-74" cy="-64" r="27" fill="#fff" />
            <path className="ink" style={{ stroke: '#5c3d2e' }} d="M-99,-74 q8,-24 34,-17 q20,0 18,24 M-50,-80 q24,-12 30,12 M-52,-86 q16,-20 32,-2" />
            <circle cx="-50" cy="-82" r="6" fill="#f06595" />
            <path className="ink" style={{ strokeWidth: 3.5 }} d="M-97,-74 l10,4 M-79,-70 l10,-4" />
            <circle cx="-89" cy="-63" r="3.2" fill="#2f2f38" />
            <circle cx="-73" cy="-63" r="3.2" fill="#2f2f38" />
            <path className="ink" style={{ strokeWidth: 3.5 }} d="M-90,-49 l13,1" />
            <path className="inkf" style={{ strokeWidth: 3 }} fill="#ff8fa3" d="M-86,-48 q3,10 9,0 Z" />
            <g className="scribble-arm">
              <path className="ink" d="M-40,-36 L-56,-6 L-98,-16" />
              <path d="M-110,-5 L-94,-36" stroke="#fab005" strokeWidth="8" strokeLinecap="round" fill="none" />
              <path d="M-112,-2 L-110,-6" stroke="#2f2f38" strokeWidth="5" strokeLinecap="round" fill="none" />
            </g>
          </g>
        </g>
      </g>

      {/* A bookworm in glasses pops out of a book. */}
      <g transform="translate(600 724)">
        <g style={W}>
          <g clipPath={`url(#${wormClip})`}>
            <g className="worm-up">
              <path d="M0,16 C-24,-18 24,-44 0,-74" stroke="#2f2f38" strokeWidth="35" strokeLinecap="round" fill="none" />
              <path d="M0,16 C-24,-18 24,-44 0,-74" stroke="#8ce99a" strokeWidth="26" strokeLinecap="round" fill="none" />
              <g className="worm-head">
                <circle className="inkf" cx="0" cy="-90" r="25" fill="#8ce99a" />
                <circle className="inkf" style={{ strokeWidth: 3.5 }} cx="-10" cy="-94" r="9" fill="#fff" />
                <circle className="inkf" style={{ strokeWidth: 3.5 }} cx="10" cy="-94" r="9" fill="#fff" />
                <circle cx="-9" cy="-93" r="2.8" fill="#2f2f38" />
                <circle cx="11" cy="-93" r="2.8" fill="#2f2f38" />
                <path className="ink" style={{ strokeWidth: 3.5 }} d="M-9,-78 q9,9 18,0" />
                <path className="inkf" fill="#2f2f38" d="M-28,-114 L0,-127 L28,-114 L0,-103 Z" />
                <path className="ink" style={{ stroke: '#fab005', strokeWidth: 3.5 }} d="M24,-113 l4,17" />
              </g>
            </g>
          </g>
          <path className="inkf" fill="#ff8787" d="M-82,-8 q41,-17 82,0 q41,-17 82,0 l0,15 q-41,-17 -82,0 q-41,-17 -82,0 Z" />
        </g>
      </g>

      {/* And a cat zooms in on a pencil rocket. */}
      <g transform="translate(968 150)">
        <g className="rocket-in">
          <g style={W} transform="rotate(-6)">
            <g className="flame">
              <path className="inkf" fill="#ff922b" d="M80,-13 L124,-19 L105,-6 L134,0 L105,6 L124,19 L80,13 Z" />
              <path fill="#ffd43b" d="M82,-6 L104,-8 L96,0 L104,8 L82,6 Z" />
            </g>
            <rect className="inkf" x="-62" y="-15" width="124" height="30" fill="#ffd43b" />
            <rect className="inkf" x="62" y="-15" width="18" height="30" rx="4" fill="#ffa8a8" />
            <path className="inkf" fill="#ffe8cc" d="M-62,-15 L-102,0 L-62,15 Z" />
            <path className="inkf" style={{ strokeWidth: 2 }} fill="#2f2f38" d="M-89,-5 L-102,0 L-89,5 Z" />
            <path className="ink" style={{ stroke: '#f08c00' }} d="M24,-24 q28,-6 21,-36" />
            <ellipse className="inkf" cx="4" cy="-33" rx="24" ry="19" fill="#ffa94d" />
            <path className="inkf" fill="#ffa94d" d="M-37,-70 L-35,-92 L-22,-79 Z M-13,-79 L-4,-92 L-6,-68 Z" />
            <circle className="inkf" cx="-22" cy="-61" r="18" fill="#ffa94d" />
            <circle cx="-29" cy="-64" r="2.8" fill="#2f2f38" />
            <circle cx="-16" cy="-64" r="2.8" fill="#2f2f38" />
            <path className="ink" style={{ strokeWidth: 2.5 }} d="M-28,-55 q3,5 6,0 q3,5 6,0" />
            <path className="ink" style={{ strokeWidth: 2 }} d="M-41,-59 l-13,-3 M-41,-55 l-13,2 M-3,-59 l13,-3 M-3,-55 l13,2" />
          </g>
        </g>
      </g>
    </svg>
  );
}
