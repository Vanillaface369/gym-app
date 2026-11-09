import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../db/db';
import { startWorkout, suggestedTemplate } from '../../db/actions';

/** Target of the app icon's "Start workout" shortcut: resume the workout in progress, or start today's. */
export function StartRoute() {
  const nav = useNavigate();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return; // StrictMode runs effects twice in dev
    started.current = true;
    (async () => {
      if (!(await db.active.get('current'))) {
        const t = await suggestedTemplate();
        if (!t) return nav('/', { replace: true });
        await startWorkout(t);
      }
      nav('/active', { replace: true });
    })();
  }, [nav]);
  return <p className="p-8 text-center text-muted">Starting your workout…</p>;
}
