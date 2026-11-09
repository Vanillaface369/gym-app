import type { Group } from '../../lib/targets';

const COLOUR: Record<Group, string> = { push: 'var(--color-push)', pull: 'var(--color-pull)', legs: 'var(--color-legs)' };
// Pointy-top hexagon; each group owns two sides, clockwise from the top: push (right), pull (bottom), legs (left).
const ORDER: Group[] = ['push', 'pull', 'legs'];

function vertex(cx: number, cy: number, r: number, i: number): [number, number] {
  const a = ((-90 + 60 * i) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}
const lerp = (a: [number, number], b: [number, number], t: number): [number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/**
 * Hexagon progress ring in three coloured segments.
 * `pct` per group is 0-100. `size` is the width in px; `stroke` the line width.
 */
export function HexRing({ pct, size, stroke, children, label }: {
  pct: Record<Group, number>; size: number; stroke: number; children?: React.ReactNode; label?: string;
}) {
  const h = size * 1.1;
  const cx = size / 2, cy = h / 2;
  const r = Math.min(size / Math.sqrt(3), h / 2) - stroke / 2 - 1;
  const gap = Math.min(r * 0.12, stroke * 1.2); // breathing room where two groups meet
  const len = 2 * r - 2 * gap;
  return (
    <div className="relative" style={{ width: size, height: h }} role={label ? 'img' : undefined} aria-label={label}>
      <svg width={size} height={h} className="absolute inset-0" aria-hidden>
        {ORDER.map((g, k) => {
          const a = vertex(cx, cy, r, 2 * k), b = vertex(cx, cy, r, 2 * k + 1), c = vertex(cx, cy, r, 2 * k + 2);
          const s = lerp(a, b, gap / r), e = lerp(b, c, 1 - gap / r);
          const d = `M${s[0]},${s[1]} L${b[0]},${b[1]} L${e[0]},${e[1]}`;
          const fill = (Math.max(0, Math.min(100, pct[g])) / 100) * len;
          return (
            <g key={g} fill="none" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
              <path d={d} stroke={COLOUR[g]} strokeOpacity={0.18} />
              {fill > 0 && <path d={d} stroke={COLOUR[g]} strokeDasharray={`${fill} ${len + stroke}`} />}
            </g>
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export const GROUP_COLOUR = COLOUR;
