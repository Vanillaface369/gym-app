function ComingSoon({ title, stage, children }: { title: string; stage: string; children?: React.ReactNode }) {
  return (
    <div className="pt-safe px-4">
      <h1 className="pt-6 text-3xl font-bold tracking-tight">{title}</h1>
      <div className="mt-6 rounded-2xl bg-surface p-5 text-muted">
        <p>Coming in <span className="font-semibold text-ink">{stage}</span>.</p>
      </div>
      {children}
    </div>
  );
}

export const BodyTab = () => <ComingSoon title="Body" stage="stage 5 (Recovery) and stage 6 (Strength score)" />;
export const TargetsTab = () => <ComingSoon title="Targets" stage="stage 4 (Weekly set targets)" />;
