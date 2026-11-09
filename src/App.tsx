import { HashRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { WorkoutTab } from './features/workout/WorkoutTab';
import { ActiveWorkoutPage } from './features/session/ActiveWorkout';
import { ExerciseLogPage } from './features/session/ExerciseLog';
import { SummaryPage } from './features/session/Summary';
import { SettingsPage } from './features/settings/SettingsPage';
import { TargetsTab } from './features/targets/TargetsTab';
import { BodyTab } from './features/body/BodyTab';
import { ExerciseHistoryPage } from './features/progress/ExerciseHistory';
import { LogTab } from './features/log/LogTab';
import { RestAlarm } from './features/session/RestTimer';
import { useActive, useSettings, useWakeLock } from './lib/hooks';

export default function App() {
  const active = useActive();
  const settings = useSettings();
  useWakeLock(!!active && settings.keepScreenOn);

  return (
    // Hash routing works on any static host (GitHub Pages included) without server rewrites.
    <HashRouter>
      <RestAlarm active={active} />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<WorkoutTab />} />
          <Route path="/body" element={<BodyTab />} />
          <Route path="/targets" element={<TargetsTab />} />
          <Route path="/log" element={<LogTab />} />
        </Route>
        <Route path="/active" element={<ActiveWorkoutPage />} />
        <Route path="/active/:key" element={<ExerciseLogPage />} />
        <Route path="/session/:id" element={<SummaryPage />} />
        <Route path="/exercise/:id" element={<ExerciseHistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </HashRouter>
  );
}
