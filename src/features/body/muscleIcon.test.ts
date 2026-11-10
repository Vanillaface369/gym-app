import { describe, expect, it } from 'vitest';
import { muscleIconView } from './muscleIcon';
import { BACK, FRONT } from './bodyShapes';

describe('muscleIconView', () => {
  it('uses the side that shows the target muscle', () => {
    expect(muscleIconView(['chest'], ['front_delts', 'triceps'])!.figure).toBe(FRONT);
    expect(muscleIconView(['lats'], ['biceps'])!.figure).toBe(BACK);
    expect(muscleIconView(['calves'], [])!.figure).toBe(BACK); // bigger on the back view
  });
  it('crops a square around the muscle', () => {
    const [, , w, h] = muscleIconView(['chest'], [])!.viewBox.split(' ').map(Number);
    expect(w).toBe(h);
    expect(w).toBeLessThan(400);
  });
  it('returns null with no muscles', () => {
    expect(muscleIconView([], [])).toBeNull();
  });
});
