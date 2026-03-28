/** @typedef {{ date: string, kind: 'applied' | 'interview' | 'followup', label: string, appId: string }} CalendarEvent */

export function addCalendarDays(iso, n) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Applied date, optional interview/milestone date, and smart +7d follow-up for still-Applied rows.
 * @param {Array<{ id: unknown, company: string, status: string, dateApplied: string, interviewDate?: string }>} apps
 * @returns {CalendarEvent[]}
 */
export function buildCalendarEvents(apps) {
  /** @type {CalendarEvent[]} */
  const ev = [];
  for (const a of apps) {
    const id = String(a.id);
    if (a.dateApplied) {
      ev.push({
        date: a.dateApplied,
        kind: "applied",
        label: `Applied · ${a.company}`,
        appId: id,
      });
    }
    if (a.interviewDate) {
      const prefix =
        a.status === "Interview"
          ? "Interview"
          : a.status === "OA"
            ? "OA / deadline"
            : a.status === "Offer"
              ? "Offer deadline"
              : "Milestone";
      ev.push({
        date: a.interviewDate,
        kind: "interview",
        label: `${prefix} · ${a.company}`,
        appId: id,
      });
    }
    if (a.status === "Applied" && a.dateApplied) {
      const fu = addCalendarDays(a.dateApplied, 7);
      if (fu) {
        ev.push({
          date: fu,
          kind: "followup",
          label: `Suggested follow-up · ${a.company}`,
          appId: id,
        });
      }
    }
  }
  return ev;
}

export function eventsGroupedByDate(events) {
  /** @type {Map<string, CalendarEvent[]>} */
  const m = new Map();
  for (const e of events) {
    if (!m.has(e.date)) m.set(e.date, []);
    m.get(e.date).push(e);
  }
  return m;
}

export function monthDayKeys(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const firstDow = first.getDay();
  const mondayOffset = (firstDow + 6) % 7;
  const dim = new Date(year, monthIndex + 1, 0).getDate();
  /** @type {(string | null)[]} */
  const cells = [];
  for (let i = 0; i < mondayOffset; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) {
    cells.push(
      `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    );
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function monthTitle(year, monthIndex) {
  return new Date(year, monthIndex, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function isTodayKey(key) {
  if (!key) return false;
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return key === `${y}-${m}-${d}`;
}
