// Picks the crop of the body map that shows an exercise's target muscles, for exercise thumbnails.
import type { Muscle } from '../../db/types';
import { BACK, FRONT, type Figure } from './bodyShapes';

type Box = [x0: number, y0: number, x1: number, y1: number];

const boxCache = new Map<string, Box>();
function bbox(d: string): Box {
  let b = boxCache.get(d);
  if (!b) {
    const n = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
    b = [Infinity, Infinity, -Infinity, -Infinity];
    for (let i = 0; i + 1 < n.length; i += 2) {
      b[0] = Math.min(b[0], n[i]); b[1] = Math.min(b[1], n[i + 1]);
      b[2] = Math.max(b[2], n[i]); b[3] = Math.max(b[3], n[i + 1]);
    }
    boxCache.set(d, b);
  }
  return b;
}

export interface IconView { figure: Figure; viewBox: string }

/**
 * Front or back, whichever shows more of the primary muscles (ties: front),
 * (secondary muscles only break ties),
 * zoomed to a square around them. Null when the exercise has no muscles on the map.
 */
export function muscleIconView(primary: Muscle[], secondary: Muscle[]): IconView | null {
  // Area of the target shapes on each side, so calves and lats use the back view where they're bigger.
  const area = (r: Figure['regions'][number]) => { const b = bbox(r.d); return (b[2] - b[0]) * (b[3] - b[1]); };
  const score = (f: Figure) => f.regions.reduce((s, r) =>
    s + (r.muscles.some((m) => primary.includes(m)) ? area(r) : r.muscles.some((m) => secondary.includes(m)) ? area(r) / 1000 : 0), 0);
  const figure = score(BACK) > score(FRONT) ? BACK : FRONT;
  const hit = figure.regions.filter((r) => r.muscles.some((m) => primary.includes(m)));
  if (!hit.length) return null;
  const u: Box = [Infinity, Infinity, -Infinity, -Infinity];
  for (const r of hit) {
    const b = bbox(r.d);
    u[0] = Math.min(u[0], b[0]); u[1] = Math.min(u[1], b[1]); u[2] = Math.max(u[2], b[2]); u[3] = Math.max(u[3], b[3]);
  }
  const size = Math.max(260, (u[2] - u[0]) * 1.2, (u[3] - u[1]) * 1.2);
  const cx = (u[0] + u[2]) / 2, cy = (u[1] + u[3]) / 2;
  return { figure, viewBox: `${Math.round(cx - size / 2)} ${Math.round(cy - size / 2)} ${Math.round(size)} ${Math.round(size)}` };
}
