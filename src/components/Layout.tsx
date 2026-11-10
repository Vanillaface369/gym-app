import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { IconBody, IconCalendar, IconDumbbell, IconTarget } from './icons';
import { useActive } from '../lib/hooks';
import { startWorkout, suggestedTemplate } from '../db/actions';
import { fmtClock } from '../lib/format';
import { useNow } from '../lib/hooks';

const TABS = [
  { to: '/', label: 'Workout', Icon: IconDumbbell },
  { to: '/body', label: 'Body', Icon: IconBody },
  { to: '/targets', label: 'Targets', Icon: IconTarget },
  { to: '/log', label: 'Log', Icon: IconCalendar },
];

export function Layout() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const active = useActive();
  const now = useNow(1000, !!active);
  const showStart = pathname === '/' || pathname === '/log';

  const onStart = async () => {
    if (!active) {
      const t = await suggestedTemplate();
      if (!t) return;
      await startWorkout(t);
    }
    nav('/active');
  };

  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col">
      <main className="flex-1 pb-44">
        <Outlet />
      </main>
      {showStart && active !== undefined && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-lg bg-gradient-to-t from-bg via-bg/90 to-transparent px-4 pt-6 pb-2">
          <button
            onClick={onStart}
            className="pointer-events-auto flex w-full items-center justify-center gap-3 rounded-2xl bg-accent py-4 text-lg font-bold text-accent-ink shadow-xl shadow-black/50 active:scale-[0.98]"
          >
            {active ? (
              <><span className="rec-dot h-2.5 w-2.5 rounded-full bg-danger" />Resume Workout<span className="tabular font-semibold opacity-70">{fmtClock((now - active.startedAt) / 1000)}</span></>
            ) : 'Start Workout'}
          </button>
        </div>
      )}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto grid h-16 max-w-lg grid-cols-4">
          {TABS.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} end
              className={({ isActive }) => `flex flex-col items-center justify-center gap-1 text-xs font-medium ${isActive ? 'text-accent' : 'text-muted'}`}>
              <Icon size={22} />{label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
