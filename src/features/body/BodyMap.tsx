// Original front/back body figure. Each side is drawn once (left half, x < 100) and mirrored.
import type { Muscle } from '../../db/types';
import { MUSCLE_LABEL } from '../../lib/format';

const SILHOUETTE =
  'M100,56 L91,56 Q89,64 72,68 Q52,70 45,80 Q37,94 39,110 Q37,132 40,156 Q31,186 30,218 Q30,240 35,256 Q43,260 46,250 Q49,232 47,218 Q58,190 61,160 Q62,142 63,128 ' +
  'Q65,162 70,198 Q62,212 62,238 Q64,282 68,312 Q66,330 66,346 Q62,370 66,394 L88,396 Q86,370 90,346 Q92,330 92,316 Q98,272 98,254 L100,254 Z';

type Shapes = Partial<Record<Muscle, string[]>>;

const SHOULDER_FRONT = 'M71,72 Q57,70 49,80 Q53,90 60,96 Q63,85 73,79 Z';
const SHOULDER_SIDE = 'M48,82 Q42,90 42,103 L52,105 Q55,99 59,97 Q52,91 48,82 Z';
const UPPER_ARM = 'M45,110 Q41,128 44,151 L56,153 Q60,131 58,110 Z';
const FOREARM = 'M43,160 Q35,186 35,214 L46,216 Q55,190 57,162 Z';

const FRONT: Shapes = {
  front_delts: [SHOULDER_FRONT],
  side_delts: [SHOULDER_SIDE],
  chest: ['M98,79 L75,79 Q64,85 63,100 Q67,118 84,120 Q94,120 98,114 Z'],
  biceps: [UPPER_ARM],
  forearms: [FOREARM],
  abs: ['M90,126 L98.5,126 L98.5,146 L89.5,146 Z', 'M89.5,149 L98.5,149 L98.5,170 L90,170 Z', 'M90,173 L98.5,173 L98.5,196 L92,196 Z'],
  obliques: ['M86,125 Q75,125 69,135 Q71,170 75,195 L88,198 Q84,160 86,125 Z'],
  abductors: ['M70,204 Q64,216 64,234 L69,238 Q71,222 76,210 Z'],
  quads: ['M77,212 Q70,242 72,300 Q81,312 92,306 Q96,262 94,226 Z'],
  adductors: ['M96,220 Q98.5,224 98.5,232 L98,266 Q94,250 95,228 Z'],
  calves: ['M71,332 Q65,352 69,386 L79,387 Q82,354 80,333 Z', 'M83,333 Q88,352 87,382 L82,382 Q84,356 83,333 Z'],
};

const BACK: Shapes = {
  traps: ['M98.5,58 L91,60 Q86,68 73,73 Q86,80 98.5,104 Z'],
  rear_delts: [SHOULDER_FRONT],
  side_delts: [SHOULDER_SIDE],
  triceps: [UPPER_ARM],
  forearms: [FOREARM],
  upper_back: ['M96,108 Q86,92 75,82 Q70,96 75,112 Q86,116 96,122 Z'],
  lats: ['M74,118 Q67,108 64,110 Q64,142 79,178 Q87,160 93,130 Q85,124 74,118 Z'],
  lower_back: ['M98.5,138 L95,138 Q91,166 85,192 L98.5,196 Z'],
  abductors: ['M71,200 Q64,210 66,222 L79,214 Q80,205 84,199 Z'],
  glutes: ['M98.5,206 L85,204 Q69,214 70,240 Q84,256 98.5,246 Z'],
  hamstrings: ['M72,253 Q70,282 74,306 L92,306 Q96,282 95,257 Q84,261 72,253 Z'],
  adductors: ['M96.5,252 Q98.5,256 98.5,262 L98,290 Q95,276 96.5,252 Z'],
  calves: ['M72,331 Q63,352 71,380 L84,382 Q92,352 90,331 Z'],
};

export function BodyMap({ side, colour, selected, onSelect }: {
  side: 'front' | 'back';
  colour: (m: Muscle) => string;
  selected: Muscle | null;
  onSelect: (m: Muscle) => void;
}) {
  const shapes = side === 'front' ? FRONT : BACK;
  const entries = Object.entries(shapes) as [Muscle, string[]][];
  // Selected muscle is drawn last so its outline sits on top.
  entries.sort(([a], [b]) => Number(a === selected) - Number(b === selected));
  return (
    <svg viewBox="0 0 200 400" className="h-full w-full" role="group" aria-label={`Body map, ${side}`}>
      <g fill="var(--color-surface-2)">
        <ellipse cx="100" cy="33" rx="16" ry="20" />
        <path d={SILHOUETTE} />
        <path d={SILHOUETTE} transform="translate(200,0) scale(-1,1)" />
      </g>
      {entries.map(([m, paths]) => {
        const sel = m === selected;
        return (
          <g key={m} role="button" aria-label={MUSCLE_LABEL[m]} tabIndex={0} className="cursor-pointer outline-none"
            onClick={() => onSelect(m)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(m)}
            fill={colour(m)} stroke={sel ? 'var(--color-ink)' : 'var(--color-surface)'} strokeWidth={sel ? 2 : 2.2} strokeLinejoin="round">
            {paths.map((d, i) => (
              <g key={i}>
                <path d={d} />
                <path d={d} transform="translate(200,0) scale(-1,1)" />
              </g>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

/** Muscles visible on each side, for the "tap the figure" hint and tests. */
export const MAP_MUSCLES = { front: Object.keys(FRONT) as Muscle[], back: Object.keys(BACK) as Muscle[] };
