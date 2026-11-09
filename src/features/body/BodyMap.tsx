// Front/back body map. Shapes come from bodyShapes.ts (traced from the user's reference screenshots).
import type { Muscle } from '../../db/types';
import { MUSCLE_LABEL } from '../../lib/format';
import { BACK, FRONT, VIEWBOX } from './bodyShapes';

/**
 * Some regions cover more than one muscle (e.g. the shoulder is front + side delts).
 * `pick` chooses which of a region's muscles it stands for (the least recovered), used for both colour and tap.
 */
export function BodyMap({ side, colour, pick, selected, onSelect }: {
  side: 'front' | 'back';
  colour: (m: Muscle) => string;
  pick: (muscles: Muscle[]) => Muscle;
  selected: Muscle | null;
  onSelect: (m: Muscle) => void;
}) {
  const fig = side === 'front' ? FRONT : BACK;
  const regions = fig.regions.map((r) => ({ ...r, m: pick(r.muscles) }));
  // The selected region is drawn last so its outline sits on top.
  regions.sort((a, b) => Number(a.muscles.includes(selected!)) - Number(b.muscles.includes(selected!)));
  return (
    <svg viewBox={VIEWBOX} className="h-full w-full" role="group" aria-label={`Body map, ${side}`}>
      <path d={fig.body} fill="var(--color-body)" />
      {regions.map((r) => {
        const sel = selected !== null && r.muscles.includes(selected);
        const label = r.muscles.map((m) => MUSCLE_LABEL[m]).join(' / ');
        return (
          <path key={r.muscles.join()} d={r.d} role="button" aria-label={label} tabIndex={0}
            className="cursor-pointer outline-none" fill={colour(r.m)}
            stroke={sel ? 'var(--color-ink)' : 'none'} strokeWidth={sel ? 4 : 0} strokeLinejoin="round"
            onClick={() => onSelect(r.m)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(r.m)} />
        );
      })}
    </svg>
  );
}
