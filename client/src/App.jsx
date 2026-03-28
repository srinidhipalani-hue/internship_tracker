import { useCallback, useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

const STATUSES = ["Applied", "OA", "Interview", "Offer", "Rejected"];

const STAGE_FLOW = {
  Applied: "OA",
  OA: "Interview",
  Interview: "Offer",
};

function daysSinceApplied(dateApplied) {
  const applied = new Date(dateApplied + "T12:00:00");
  const now = new Date();
  return Math.floor((now - applied) / (1000 * 60 * 60 * 24));
}

function canAdvance(status) {
  return STAGE_FLOW[status] != null;
}

function nextStageLabel(status) {
  const n = STAGE_FLOW[status];
  return n ? `→ ${n}` : "";
}

function priorityBadgeClass(priority) {
  switch (priority) {
    case "HIGH":
      return "bg-rose-100 text-rose-800 ring-rose-200";
    case "MEDIUM":
      return "bg-amber-100 text-amber-900 ring-amber-200";
    default:
      return "bg-emerald-100 text-emerald-800 ring-emerald-200";
  }
}

function rowAccentClass(priority, needsFollowUp) {
  if (needsFollowUp) return "bg-amber-50/90 ring-1 ring-inset ring-amber-300";
  switch (priority) {
    case "HIGH":
      return "bg-rose-50/40";
    case "MEDIUM":
      return "bg-amber-50/30";
    default:
      return "bg-emerald-50/25";
  }
}

export default function App() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("Applied");

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/applications`);
      if (!res.ok) throw new Error("Failed to load applications");
      setApplications(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totals = applications.length;
  const byStatus = STATUSES.reduce((acc, s) => {
    acc[s] = applications.filter((a) => a.status === s).length;
    return acc;
  }, {});

  const nextActionsTop = applications.slice(0, 3);

  async function handleAdd(e) {
    e.preventDefault();
    if (!company.trim() || !role.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: company.trim(),
          role: role.trim(),
          status,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Could not add application");
      }
      setCompany("");
      setRole("");
      setStatus("Applied");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function advance(id) {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ advance: true }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Update failed");
      }
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
            Frictionless Internship Tracker
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Add applications fast, sort by priority automatically, advance with one click.
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {error && (
          <div
            className="rounded-lg bg-red-50 text-red-800 text-sm px-4 py-3 ring-1 ring-red-200"
            role="alert"
          >
            {error}
          </div>
        )}

        <section className="grid lg:grid-cols-3 gap-4">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 lg:col-span-1">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Dashboard</p>
            <p className="text-sm text-slate-600 mt-1">Total applications</p>
            <p className="font-display text-3xl font-semibold text-slate-900 mt-2 tabular-nums">
              {totals}
            </p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 lg:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">By status</p>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {STATUSES.map((s) => (
                <div
                  key={s}
                  className="rounded-lg bg-slate-50 px-3 py-2 flex items-center justify-between gap-2"
                >
                  <span className="text-slate-700 text-sm font-medium truncate" title={s}>
                    {s}
                  </span>
                  <span className="font-display text-lg font-semibold text-slate-900 tabular-nums shrink-0">
                    {byStatus[s]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
          <h2 className="font-display text-lg font-semibold text-slate-900 flex items-center gap-2">
            <span aria-hidden>🔥</span> Next Actions
          </h2>
          <p className="text-sm text-slate-600 mt-1">Top 3 by priority, then most recent.</p>
          {loading ? (
            <p className="text-sm text-slate-500 mt-4">Loading…</p>
          ) : nextActionsTop.length === 0 ? (
            <p className="text-sm text-slate-500 mt-4">No applications yet.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {nextActionsTop.map((a, i) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-baseline gap-2 text-sm border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                >
                  <span className="font-semibold text-slate-400 tabular-nums w-5">{i + 1}.</span>
                  <span className="font-semibold text-slate-900">{a.company}</span>
                  <span className="text-slate-500">— {a.nextAction}</span>
                  <span
                    className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ring-1 ${priorityBadgeClass(a.priority)}`}
                  >
                    {a.priority}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
          <h2 className="font-display text-lg font-semibold text-slate-900">Add application</h2>
          <form onSubmit={handleAdd} className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <label className="block sm:col-span-1">
              <span className="text-xs font-medium text-slate-600">Company</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Acme"
                required
              />
            </label>
            <label className="block sm:col-span-1">
              <span className="text-xs font-medium text-slate-600">Role</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Intern title"
                required
              />
            </label>
            <label className="block sm:col-span-1">
              <span className="text-xs font-medium text-slate-600">Status</span>
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              {submitting ? "Adding…" : "Add"}
            </button>
          </form>
          <p className="text-xs text-slate-500 mt-2">
            Date applied is set to today. Priority and next action are calculated automatically.
          </p>
        </section>

        <section className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-display text-lg font-semibold text-slate-900">All applications</h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Sorted: priority (high → low), then newest first. Rows with{" "}
              <span className="font-medium text-amber-800">Applied &gt; 7 days</span> are highlighted for
              follow-up.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 font-semibold">Company</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Priority</th>
                  <th className="px-4 py-3 font-semibold">Next action</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      Loading…
                    </td>
                  </tr>
                ) : applications.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No rows yet — add your first application above.
                    </td>
                  </tr>
                ) : (
                  applications.map((a) => {
                    const stale =
                      a.status === "Applied" && daysSinceApplied(a.dateApplied) > 7;
                    return (
                      <tr
                        key={a.id}
                        className={`border-t border-slate-100 ${rowAccentClass(a.priority, stale)}`}
                      >
                        <td className="px-4 py-3 font-medium text-slate-900">{a.company}</td>
                        <td className="px-4 py-3 text-slate-700">{a.role}</td>
                        <td className="px-4 py-3 text-slate-800">{a.status}</td>
                        <td className="px-4 py-3 text-slate-600 tabular-nums whitespace-nowrap">
                          {a.dateApplied}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ring-1 ${priorityBadgeClass(a.priority)}`}
                          >
                            {a.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{a.nextAction}</td>
                        <td className="px-4 py-3">
                          {canAdvance(a.status) ? (
                            <button
                              type="button"
                              onClick={() => advance(a.id)}
                              className="rounded-md bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 hover:bg-slate-800 transition-colors whitespace-nowrap"
                              title={`Move to ${STAGE_FLOW[a.status]}`}
                            >
                              Next {nextStageLabel(a.status)}
                            </button>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
