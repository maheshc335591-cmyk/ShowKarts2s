import { useEffect, useState } from "react";

function parts(target: number) {
  const diff = Math.max(0, target - Date.now());
  const s = Math.floor(diff / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    mins: Math.floor((s % 3600) / 60),
    secs: s % 60,
    expired: diff === 0,
  };
}

export default function CountdownTimer({ to, compact = false }: { to: string; compact?: boolean }) {
  const target = new Date(to).getTime();
  const [t, setT] = useState(() => parts(target));

  useEffect(() => {
    const id = setInterval(() => setT(parts(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (t.expired) {
    return (
      <span className="text-sm font-semibold text-amber-300">
        {compact ? "Seat hold expired" : "Show started — enjoy the music!"}
      </span>
    );
  }

  const cells = [
    { v: t.days, l: "Days" },
    { v: t.hours, l: "Hrs" },
    { v: t.mins, l: "Min" },
    { v: t.secs, l: "Sec" },
  ];

  if (compact) {
    return (
      <span className="font-mono text-sm text-cyan-200" data-testid="countdown-compact">
        {t.days}d {String(t.hours).padStart(2, "0")}h {String(t.mins).padStart(2, "0")}m{" "}
        {String(t.secs).padStart(2, "0")}s
      </span>
    );
  }

  return (
    <div className="flex gap-2.5" data-testid="countdown-timer">
      {cells.map((c) => (
        <div
          key={c.l}
          className="min-w-14 rounded-xl border border-violet-400/30 bg-violet-500/10 px-2.5 py-2 text-center shadow-[inset_0_0_12px_rgba(139,92,246,0.15)]"
        >
          <p className="font-mono text-xl font-bold tabular-nums text-white">
            {String(c.v).padStart(2, "0")}
          </p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-300/80">{c.l}</p>
        </div>
      ))}
    </div>
  );
}
