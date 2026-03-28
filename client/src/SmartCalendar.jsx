import { useMemo, useState } from "react";
import {
  buildCalendarEvents,
  eventsGroupedByDate,
  isTodayKey,
  monthDayKeys,
  monthTitle,
} from "./calendarUtils.js";

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const KIND_DOT = {
  applied: "bg-cyan-500 shadow-sm shadow-cyan-600/40",
  interview: "bg-fuchsia-500 shadow-sm shadow-fuchsia-600/40",
  followup: "bg-amber-400 ring-1 ring-amber-600/50 dark:bg-amber-500 dark:ring-amber-400/40",
};

export default function SmartCalendar({ applications }) {
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState(null);

  const events = useMemo(() => buildCalendarEvents(applications ?? []), [applications]);
  const byDate = useMemo(() => eventsGroupedByDate(events), [events]);
  const cells = useMemo(
    () => monthDayKeys(cursor.y, cursor.m),
    [cursor.y, cursor.m]
  );

  function prevMonth() {
    setCursor((c) => {
      const d = new Date(c.y, c.m - 1, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  function nextMonth() {
    setCursor((c) => {
      const d = new Date(c.y, c.m + 1, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  function goToday() {
    const t = new Date();
    setCursor({ y: t.getFullYear(), m: t.getMonth() });
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const d = String(t.getDate()).padStart(2, "0");
    setSelected(`${y}-${m}-${d}`);
  }

  function scrollToApp(appId) {
    const el = document.getElementById(`app-row-${appId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const list = document.getElementById("applications-list");
    list?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const selectedEvents = selected ? byDate.get(selected) ?? [] : [];

  return (
    <div className="glass-card rounded-2xl border border-violet-200/50 p-4 shadow-lg shadow-violet-900/10 dark:border-violet-900/40 dark:shadow-black/30">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-3 dark:border-slate-600/60">
        <p className="font-display text-sm font-bold tracking-tight text-slate-900 dark:text-white">
          Smart calendar
        </p>
        <button
          type="button"
          onClick={goToday}
          className="rounded-lg border border-slate-200/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Today
        </button>
      </div>
      <p className="mt-2 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
        Applied dates, optional interview/OA deadlines, and +7d follow-up hints for open applications.
      </p>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Previous month"
          onClick={prevMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {monthTitle(cursor.y, cursor.m)}
        </span>
        <button
          type="button"
          aria-label="Next month"
          onClick={nextMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          ›
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {WEEK.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((key, i) => {
          if (!key) {
            return <div key={`e-${i}`} className="aspect-square" />;
          }
          const dayEvents = byDate.get(key) ?? [];
          const kinds = [...new Set(dayEvents.map((e) => e.kind))];
          const isSel = selected === key;
          const today = isTodayKey(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(key)}
              className={`relative flex aspect-square flex-col items-center justify-start rounded-lg border pt-0.5 text-xs transition ${
                isSel
                  ? "border-violet-500 bg-violet-50/90 font-semibold text-violet-900 dark:border-violet-400 dark:bg-violet-950/50 dark:text-violet-100"
                  : today
                    ? "border-cyan-300/80 bg-cyan-50/50 text-slate-800 dark:border-cyan-700 dark:bg-cyan-950/30 dark:text-slate-100"
                    : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-white/60 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800/50"
              }`}
            >
              <span className="tabular-nums">{Number(key.slice(8, 10))}</span>
              {dayEvents.length > 0 ? (
                <span className="mt-0.5 flex flex-wrap justify-center gap-0.5 px-0.5">
                  {kinds.slice(0, 3).map((k) => (
                    <span
                      key={k}
                      className={`h-1.5 w-1.5 rounded-full ${KIND_DOT[k] ?? "bg-slate-400"}`}
                      title={k}
                    />
                  ))}
                  {kinds.length > 3 ? (
                    <span className="text-[8px] leading-none text-slate-400">+</span>
                  ) : null}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-200/80 pt-3 text-[10px] dark:border-slate-600/60">
        <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
          <span className="h-2 w-2 rounded-full bg-cyan-500" /> Applied
        </span>
        <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
          <span className="h-2 w-2 rounded-full bg-fuchsia-500" /> Interview / deadline
        </span>
        <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
          <span className="h-2 w-2 rounded-full bg-amber-400 ring-1 ring-amber-600/40" /> +7d follow-up
        </span>
      </div>

      {selected ? (
        <div className="mt-3 rounded-xl border border-slate-200/90 bg-white/50 p-2.5 dark:border-slate-600/60 dark:bg-slate-900/40">
          <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">{selected}</p>
          {selectedEvents.length === 0 ? (
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">Nothing scheduled.</p>
          ) : (
            <ul className="mt-1.5 max-h-36 space-y-1 overflow-y-auto text-left">
              {selectedEvents.map((e, idx) => (
                <li key={`${e.appId}-${e.kind}-${idx}`}>
                  <button
                    type="button"
                    onClick={() => scrollToApp(e.appId)}
                    className="w-full rounded-md px-1 py-0.5 text-left text-[11px] text-slate-700 hover:bg-violet-100/80 dark:text-slate-300 dark:hover:bg-violet-950/50"
                  >
                    {e.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="mt-3 text-center text-[11px] text-slate-500 dark:text-slate-500">
          Tap a day for details.
        </p>
      )}
    </div>
  );
}
