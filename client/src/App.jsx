import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import LoginPage from "./LoginPage.jsx";
import ConfigRequired from "./ConfigRequired.jsx";
import SmartCalendar from "./SmartCalendar.jsx";
import { getSupabase, isSupabaseConfigured } from "./supabaseClient.js";
import {
  STATUSES,
  IMPORTANCE_LEVELS,
  sortApplications,
  rowToApp,
  buildNewRow,
  buildUpdateRow,
  nextStatus,
} from "./applicationModel.js";

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

function importanceBadgeClass(level) {
  switch (level) {
    case "HIGH":
      return "bg-rose-100 text-rose-800 ring-rose-200 dark:bg-rose-950/70 dark:text-rose-200 dark:ring-rose-700/60";
    case "MEDIUM":
      return "bg-amber-100 text-amber-900 ring-amber-200 dark:bg-amber-950/70 dark:text-amber-200 dark:ring-amber-700/60";
    default:
      return "bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-200 dark:ring-emerald-700/60";
  }
}

function suggestedBadgeClass(level) {
  switch (level) {
    case "HIGH":
      return "bg-slate-200 text-slate-800 ring-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:ring-slate-500";
    case "MEDIUM":
      return "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-700/80 dark:text-slate-200 dark:ring-slate-600";
    default:
      return "bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600";
  }
}

function rowAccentClass(importance, needsFollowUp) {
  if (needsFollowUp) {
    return "bg-amber-50/90 ring-1 ring-inset ring-amber-300 dark:bg-amber-950/35 dark:ring-amber-600/40";
  }
  switch (importance) {
    case "HIGH":
      return "bg-rose-50/40 dark:bg-rose-950/25";
    case "MEDIUM":
      return "bg-amber-50/30 dark:bg-amber-950/20";
    default:
      return "bg-emerald-50/25 dark:bg-emerald-950/20";
  }
}

/** If string looks like a web URL, return http(s) href; else null */
function linkifyHref(text) {
  const t = String(text ?? "").trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  if (/^www\./i.test(t)) return `https://${t}`;
  if (!/\s/.test(t) && (/^localhost\b|^127\.0\.0\.1/.test(t) || /\.[a-z]{2,}(\/|$)/i.test(t))) {
    return /^localhost|^127\.0\.0\.1/.test(t) ? `http://${t}` : `https://${t}`;
  }
  return null;
}

function truncate(str, max = 80) {
  if (!str?.trim()) return null;
  const t = str.trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function DocLine({ label, value }) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const href = linkifyHref(raw);
  const show = truncate(raw, 72);
  return (
    <div className="break-words" title={raw}>
      <span className="font-medium text-slate-400 dark:text-slate-500">{label}</span>{" "}
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-violet-600 hover:underline dark:text-violet-400"
        >
          {show}
        </a>
      ) : (
        <span className="text-slate-700 dark:text-slate-300">{show}</span>
      )}
    </div>
  );
}

function AppliedViaCell({ value }) {
  const raw = String(value ?? "").trim();
  if (!raw) return <span className="text-slate-400 dark:text-slate-500">—</span>;
  const href = linkifyHref(raw);
  if (href) {
    let label = raw;
    try {
      label = new URL(href).hostname.replace(/^www\./, "");
    } catch {
      /* keep raw */
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all font-medium text-violet-600 hover:underline dark:text-violet-400"
        title={raw}
      >
        {label}
      </a>
    );
  }
  return (
    <span className="break-words text-slate-700 dark:text-slate-300" title={raw}>
      {raw}
    </span>
  );
}

function DocsCell({ coverLetter, resume }) {
  const cl = String(coverLetter ?? "").trim();
  const rs = String(resume ?? "").trim();
  if (!cl && !rs) return <span className="text-slate-400 dark:text-slate-500">—</span>;
  return (
    <div className="min-w-[12rem] max-w-xs space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
      <DocLine label="CL:" value={cl} />
      <DocLine label="CV:" value={rs} />
    </div>
  );
}

const TABLE_COLS = 12;

const STATUS_DASHBOARD_STYLE = {
  Applied:
    "bg-gradient-to-br from-sky-100/90 to-blue-50/80 text-sky-950 ring-sky-200/70 dark:from-sky-950/85 dark:to-blue-950/70 dark:text-sky-100 dark:ring-sky-700/45",
  OA: "bg-gradient-to-br from-violet-100/90 to-purple-50/80 text-violet-950 ring-violet-200/70 dark:from-violet-950/85 dark:to-purple-950/70 dark:text-violet-100 dark:ring-violet-600/45",
  Interview:
    "bg-gradient-to-br from-amber-100/90 to-orange-50/80 text-amber-950 ring-amber-200/70 dark:from-amber-950/85 dark:to-orange-950/70 dark:text-amber-100 dark:ring-amber-700/45",
  Offer:
    "bg-gradient-to-br from-emerald-100/90 to-teal-50/80 text-emerald-950 ring-emerald-200/70 dark:from-emerald-950/85 dark:to-teal-950/70 dark:text-emerald-100 dark:ring-emerald-700/45",
  Rejected:
    "bg-gradient-to-br from-rose-100/90 to-pink-50/80 text-rose-950 ring-rose-200/70 dark:from-rose-950/85 dark:to-pink-950/70 dark:text-rose-100 dark:ring-rose-700/45",
};

function getInitialDark() {
  if (typeof window === "undefined") return false;
  try {
    const saved = localStorage.getItem("trakr-theme");
    if (saved === "dark") return true;
    if (saved === "light") return false;
  } catch {
    /* ignore */
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function Reveal({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setShown(true);
      },
      { threshold: 0.08, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`reveal-motion ${shown ? "reveal-on" : "reveal-off"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function App() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("Applied");
  const [coverLetter, setCoverLetter] = useState("");
  const [resume, setResume] = useState("");
  const [appliedVia, setAppliedVia] = useState("");
  const [importance, setImportance] = useState("MEDIUM");
  const [referrals, setReferrals] = useState("");
  const [interviewDate, setInterviewDate] = useState("");

  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  /** Row overflow menu: position + row data (portal so table scroll doesn’t clip) */
  const [actionMenu, setActionMenu] = useState(null);

  /** null = show every row; otherwise filter table by status */
  const [tableStatusFilter, setTableStatusFilter] = useState(null);

  const [darkMode, setDarkMode] = useState(() => getInitialDark());

  const [scrollY, setScrollY] = useState(0);

  const [session, setSession] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setBooting(false);
      return;
    }
    const supabase = getSupabase();

    /** Avoid new object references when nothing changed — stops load() effect from re-firing in a loop. */
    function syncSessionFromSupabase(s) {
      setSession((prev) => {
        const next = s?.user ? { id: s.user.id, email: s.user.email ?? "" } : null;
        if (prev?.id === next?.id && prev?.email === next?.email) return prev;
        return next;
      });
    }

    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        syncSessionFromSupabase(s);
      })
      .finally(() => setBooting(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      syncSessionFromSupabase(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    try {
      localStorage.setItem("trakr-theme", darkMode ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }, [darkMode]);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    setError(null);
    try {
      const { data, error } = await supabase.from("applications").select("*");
      if (error) throw new Error(error.message);
      const apps = (data ?? []).map(rowToApp);
      setApplications(sortApplications(apps));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const sessionUserId = session?.id ?? null;

  useEffect(() => {
    if (!sessionUserId) {
      setApplications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    load();
  }, [sessionUserId, load]);

  useEffect(() => {
    if (!actionMenu) return;
    const onKey = (e) => {
      if (e.key === "Escape") setActionMenu(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [actionMenu]);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const totals = applications.length;
  const byStatus = STATUSES.reduce((acc, s) => {
    acc[s] = applications.filter((a) => a.status === s).length;
    return acc;
  }, {});

  const nextActionsTop = applications.slice(0, 3);

  const filteredForTable = applications.filter(
    (a) => tableStatusFilter == null || a.status === tableStatusFilter
  );

  function filterTabClass(active) {
    return active
      ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-fuchsia-500/25 ring-0"
      : "bg-white/80 text-slate-800 shadow-sm ring-1 ring-slate-200/90 backdrop-blur-sm hover:bg-white dark:bg-slate-800/90 dark:text-slate-100 dark:ring-slate-600 dark:hover:bg-slate-800";
  }

  function resetForm() {
    setCompany("");
    setRole("");
    setStatus("Applied");
    setCoverLetter("");
    setResume("");
    setAppliedVia("");
    setImportance("MEDIUM");
    setReferrals("");
    setInterviewDate("");
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!company.trim() || !role.trim() || !session) return;
    const supabase = getSupabase();
    if (!supabase) return;
    setSubmitting(true);
    setError(null);
    try {
      const row = buildNewRow(session.id, {
        company,
        role,
        status,
        coverLetter,
        resume,
        appliedVia,
        importance,
        referrals,
        interviewDate,
      });
      const { error } = await supabase.from("applications").insert(row);
      if (error) throw new Error(error.message);
      resetForm();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function advance(id) {
    const supabase = getSupabase();
    if (!supabase) return;
    const cur = applications.find((a) => String(a.id) === String(id));
    if (!cur) return;
    const n = nextStatus(cur.status);
    if (!n) {
      setError("No next stage");
      return;
    }
    setError(null);
    try {
      const { error } = await supabase.from("applications").update({ status: n }).eq("id", id);
      if (error) throw new Error(error.message);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  function openEdit(a) {
    setEditForm({
      id: a.id,
      company: a.company ?? "",
      role: a.role ?? "",
      status: a.status ?? "Applied",
      dateApplied: a.dateApplied ?? "",
      importance: a.importance ?? "MEDIUM",
      appliedVia: a.appliedVia ?? "",
      referrals: a.referrals ?? "",
      coverLetter: a.coverLetter ?? "",
      resume: a.resume ?? "",
      interviewDate: a.interviewDate ?? "",
    });
  }

  function closeEdit() {
    setEditForm(null);
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!editForm) return;
    const {
      id,
      company: c,
      role: r,
      status: st,
      dateApplied: d,
      importance: im,
      appliedVia: av,
      referrals: ref,
      coverLetter: cl,
      resume: rs,
      interviewDate: iv,
    } = editForm;
    if (!c.trim() || !r.trim() || !d.trim()) return;
    setEditSaving(true);
    setError(null);
    try {
      const supabase = getSupabase();
      if (!supabase) return;
      const patch = buildUpdateRow({
        company: c,
        role: r,
        status: st,
        dateApplied: d,
        importance: im,
        appliedVia: av,
        referrals: ref,
        coverLetter: cl,
        resume: rs,
        interviewDate: iv,
      });
      const { error } = await supabase.from("applications").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
      closeEdit();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setEditSaving(false);
    }
  }

  async function removeApp(id, label) {
    if (!window.confirm(`Delete application for “${label}”? This cannot be undone.`)) return false;
    setError(null);
    try {
      const supabase = getSupabase();
      if (!supabase) return false;
      const { error } = await supabase.from("applications").delete().eq("id", id);
      if (error) throw new Error(error.message);
      closeEdit();
      setActionMenu(null);
      await load();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }

  function toggleRowMenu(e, row) {
    const r = e.currentTarget.getBoundingClientRect();
    setActionMenu((cur) =>
      cur?.app && String(cur.app.id) === String(row.id)
        ? null
        : {
            app: row,
            top: r.bottom + 6,
            right: window.innerWidth - r.right,
          }
    );
  }

  const rowMenu =
    actionMenu &&
    createPortal(
      <>
        <div
          className="fixed inset-0 z-[90]"
          aria-hidden
          onClick={() => setActionMenu(null)}
        />
        <div
          role="menu"
          aria-label="Row actions"
          className="fixed z-[100] min-w-[11rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black/5 dark:border-slate-600 dark:bg-slate-900 dark:ring-slate-600/50"
          style={{ top: actionMenu.top, right: actionMenu.right }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            className="w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
            onClick={() => {
              openEdit(actionMenu.app);
              setActionMenu(null);
            }}
          >
            Edit
          </button>
          {canAdvance(actionMenu.app.status) ? (
            <button
              type="button"
              role="menuitem"
              className="w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
              onClick={() => {
                const id = actionMenu.app.id;
                setActionMenu(null);
                advance(id);
              }}
            >
              Next {nextStageLabel(actionMenu.app.status)}
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="w-full px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
            onClick={(e) => {
              e.stopPropagation();
              const { id, company } = actionMenu.app;
              void removeApp(id, company);
            }}
          >
            Delete
          </button>
        </div>
      </>,
      document.body
    );

  const parallaxA = scrollY * 0.11;
  const parallaxB = scrollY * -0.07;

  async function logOut() {
    const supabase = getSupabase();
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setApplications([]);
    setEditForm(null);
    setActionMenu(null);
    setError(null);
    resetForm();
  }

  if (!isSupabaseConfigured()) {
    return <ConfigRequired />;
  }

  if (booting) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f4f2ff] text-slate-600 dark:bg-[#0c0718] dark:text-slate-400">
        Loading…
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden text-slate-800 dark:text-slate-200">
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden dark:opacity-[0.85]"
        aria-hidden
      >
        <div
          className="absolute -left-20 top-24 h-72 w-72 rounded-full bg-gradient-to-br from-violet-400/35 to-fuchsia-400/25 blur-3xl"
          style={{ transform: `translateY(${parallaxA}px)` }}
        />
        <div
          className="absolute -right-16 top-40 h-80 w-80 rounded-full bg-gradient-to-br from-cyan-400/30 to-teal-300/20 blur-3xl"
          style={{ transform: `translateY(${parallaxB}px)` }}
        />
        <div
          className="absolute bottom-20 left-1/3 h-64 w-64 rounded-full bg-gradient-to-tr from-amber-300/25 to-rose-300/20 blur-3xl"
          style={{ transform: `translateY(${parallaxA * 0.45}px)` }}
        />
      </div>

      <nav className="sticky top-0 z-30 border-b border-white/50 bg-white/70 shadow-sm shadow-violet-900/[0.04] backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-950/80 dark:shadow-black/30">
        <div className="mx-auto flex max-w-[min(92rem,100%)] flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 py-3.5 sm:gap-x-10">
          <span className="font-display text-lg font-bold tracking-tight gradient-text">Trakr</span>
          <span className="hidden h-4 w-px bg-gradient-to-b from-transparent via-slate-300 to-transparent dark:via-slate-600 sm:block" />
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <a href="#overview" className="rounded-md px-1 transition hover:text-violet-700 dark:hover:text-violet-400">
              Overview
            </a>
            <a
              href="#next-actions"
              className="rounded-md px-1 transition hover:text-fuchsia-700 dark:hover:text-fuchsia-400"
            >
              Next up
            </a>
            <a href="#add-application" className="rounded-md px-1 transition hover:text-cyan-700 dark:hover:text-cyan-400">
              Add new
            </a>
            <a
              href="#applications-list"
              className="rounded-md px-1 transition hover:text-violet-700 dark:hover:text-violet-400"
            >
              Your list
            </a>
            <a
              href="#smart-calendar"
              className="rounded-md px-1 transition hover:text-cyan-700 dark:hover:text-cyan-400"
            >
              Calendar
            </a>
          </div>
          <span
            className="hidden max-w-[10rem] truncate text-xs font-medium text-slate-500 dark:text-slate-400 sm:block"
            title={session.email}
          >
            {session.email}
          </span>
          <button
            type="button"
            onClick={() => void logOut()}
            className="inline-flex items-center rounded-xl border border-slate-200/90 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Log out
          </button>
          <button
            type="button"
            onClick={() => setDarkMode((d) => !d)}
            className="ml-0 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/90 bg-white/90 text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-amber-300 dark:hover:bg-slate-700 sm:ml-2"
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            title={darkMode ? "Light mode" : "Dark mode"}
          >
            {darkMode ? (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      <div className="relative z-10 mx-auto max-w-[min(92rem,100%)] px-4 pb-20 pt-2">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-8">
          <aside
            id="smart-calendar"
            className="w-full shrink-0 lg:sticky lg:top-24 lg:z-20 lg:w-80 xl:w-[22rem]"
          >
            <SmartCalendar applications={applications} />
          </aside>
          <div className="min-w-0 flex-1 space-y-12">
      <header className="relative pb-14 pt-12 text-center sm:pb-16 sm:pt-16">
        <p className="animate-float-soft inline-flex rounded-full border border-violet-200/90 bg-white/70 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-violet-800 shadow-md shadow-violet-500/10 dark:border-violet-500/40 dark:bg-violet-950/50 dark:text-violet-200 dark:shadow-violet-900/40">
          Internship pipeline
        </p>
        <h1 className="font-display mt-7 text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 dark:text-white sm:text-5xl md:text-6xl">
          Your search, <span className="gradient-text">organized</span>
        </h1>
        <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-slate-600 dark:text-slate-300 sm:text-lg">
          Companies, referrals, materials, and priorities—stay on top of every step without the
          spreadsheet chaos.
        </p>
        <div className="mt-12 flex justify-center">
          <a
            href="#overview"
            className="group flex flex-col items-center gap-2 text-xs font-semibold text-violet-700 dark:text-violet-400"
          >
            <span className="group-hover:text-fuchsia-700 dark:group-hover:text-fuchsia-400">Scroll to explore</span>
            <svg
              className="h-5 w-5 animate-chevron-bob text-fuchsia-600 dark:text-fuchsia-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </a>
        </div>
      </header>

      <main className="space-y-12">
        {rowMenu}
        {error && (
          <div
            className="rounded-xl border border-red-200/80 bg-gradient-to-r from-red-50 to-rose-50 px-4 py-3 text-sm font-medium text-red-900 shadow-md shadow-red-900/5 dark:border-red-900/50 dark:from-red-950/80 dark:to-rose-950/60 dark:text-red-100"
            role="alert"
          >
            {error}
          </div>
        )}

        {editForm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-violet-950/50 via-slate-900/45 to-fuchsia-950/50 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-dialog-title"
          >
            <div className="glass-card max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl p-6 shadow-2xl shadow-violet-900/20 dark:shadow-black/50">
              <h2
                id="edit-dialog-title"
                className="font-display text-lg font-semibold text-slate-900 dark:text-white"
              >
                Edit application
              </h2>
              <form onSubmit={saveEdit} className="mt-4 space-y-3">
                <label className="block">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Company</span>
                  <input
                    required
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-100"
                    value={editForm.company}
                    onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Role</span>
                  <input
                    required
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-100"
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Status</span>
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-100"
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Date applied</span>
                    <input
                      required
                      type="date"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-100"
                      value={editForm.dateApplied}
                      onChange={(e) => setEditForm({ ...editForm, dateApplied: e.target.value })}
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Interview / OA / deadline (optional)
                  </span>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-100"
                    value={editForm.interviewDate ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, interviewDate: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Importance</span>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-100"
                    value={editForm.importance}
                    onChange={(e) => setEditForm({ ...editForm, importance: e.target.value })}
                  >
                    {IMPORTANCE_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Applied via</span>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-100"
                    value={editForm.appliedVia}
                    onChange={(e) => setEditForm({ ...editForm, appliedVia: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Referrals</span>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-100"
                    value={editForm.referrals}
                    onChange={(e) => setEditForm({ ...editForm, referrals: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Cover letter</span>
                  <textarea
                    rows={3}
                    className="mt-1 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-100"
                    value={editForm.coverLetter}
                    onChange={(e) => setEditForm({ ...editForm, coverLetter: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Resume</span>
                  <textarea
                    rows={3}
                    className="mt-1 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-100"
                    value={editForm.resume}
                    onChange={(e) => setEditForm({ ...editForm, resume: e.target.value })}
                  />
                </label>
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={editSaving}
                    className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-sm font-semibold text-white shadow-md shadow-violet-500/30 px-4 py-2 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-60"
                  >
                    {editSaving ? "Saving…" : "Save changes"}
                  </button>
                  <button
                    type="button"
                    onClick={closeEdit}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => removeApp(editForm.id, editForm.company)}
                    className="rounded-lg bg-red-600 text-white text-sm font-semibold px-4 py-2 hover:bg-red-700 ml-auto"
                  >
                    Delete
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <Reveal>
          <section id="overview" className="scroll-mt-28 grid gap-4 lg:grid-cols-3">
            <div className="glass-card relative overflow-hidden rounded-2xl p-6 lg:col-span-1">
              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-violet-400/40 to-fuchsia-400/30 blur-2xl" />
              <p className="text-xs font-bold uppercase tracking-widest text-violet-700 dark:text-violet-300">
                Overview
              </p>
              <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">Total applications</p>
              <p className="font-display mt-3 text-4xl font-extrabold tabular-nums gradient-text">{totals}</p>
            </div>
            <div className="glass-card rounded-2xl p-6 lg:col-span-2">
              <p className="text-xs font-bold uppercase tracking-widest text-fuchsia-800 dark:text-fuchsia-300">
                By status
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {STATUSES.map((s) => (
                  <div
                    key={s}
                    className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 ring-1 ${STATUS_DASHBOARD_STYLE[s]}`}
                  >
                    <span className="truncate text-sm font-bold" title={s}>
                      {s}
                    </span>
                    <span className="font-display shrink-0 text-xl font-extrabold tabular-nums">{byStatus[s]}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </Reveal>

        <Reveal delay={80}>
          <section
            id="next-actions"
            className="glass-card scroll-mt-28 rounded-2xl border border-amber-200/50 bg-gradient-to-br from-white/80 to-amber-50/40 p-6 dark:border-amber-900/45 dark:from-slate-900/40 dark:to-amber-950/25"
          >
            <h2 className="font-display flex items-center justify-center gap-2 text-center text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
              <span aria-hidden className="text-2xl">
                🔥
              </span>{" "}
              Next actions
            </h2>
            <p className="mt-2 text-center text-sm font-medium text-slate-600 dark:text-slate-400">
              Top 3 by your importance, then most recent.
            </p>
          {loading ? (
            <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">Loading…</p>
          ) : nextActionsTop.length === 0 ? (
            <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">No applications yet.</p>
          ) : (
            <ol className="mx-auto mt-6 max-w-xl space-y-3">
              {nextActionsTop.map((a, i) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-baseline justify-center gap-2 border-b border-amber-100/80 pb-3 text-center text-sm last:border-0 dark:border-amber-900/40 sm:justify-start sm:text-left"
                >
                  <span className="w-5 font-semibold tabular-nums text-slate-400 dark:text-slate-500">
                    {i + 1}.
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">{a.company}</span>
                  <span className="text-slate-500 dark:text-slate-400">— {a.nextAction}</span>
                  <span
                    className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ring-1 ${importanceBadgeClass(a.importance)}`}
                  >
                    {a.importance}
                  </span>
                </li>
              ))}
            </ol>
          )}
          </section>
        </Reveal>

        <Reveal delay={140}>
          <section id="add-application" className="glass-card scroll-mt-28 rounded-2xl p-6">
            <h2 className="font-display text-center text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
              Add an <span className="gradient-text">application</span>
            </h2>
          <form onSubmit={handleAdd} className="mt-4 space-y-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <label className="block">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Company</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200/90 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/30 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-100"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Acme"
                  required
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Role</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-100"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Intern title"
                  required
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Status</span>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-100"
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
              <label className="block">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Importance</span>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-100"
                  value={importance}
                  onChange={(e) => setImportance(e.target.value)}
                >
                  {IMPORTANCE_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Applied via (website or portal)</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-100"
                value={appliedVia}
                onChange={(e) => setAppliedVia(e.target.value)}
                placeholder="https://… or Handshake, LinkedIn, etc."
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Referrals / connections</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-100"
                value={referrals}
                onChange={(e) => setReferrals(e.target.value)}
                placeholder="Name, email, how they’re helping"
              />
            </label>

            <label className="block max-w-xs">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Interview / OA / deadline (optional)
              </span>
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-100"
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
              />
            </label>

            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Cover letter (link or notes)</span>
                <textarea
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-100 min-h-[88px] resize-y"
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Google Doc link, path, or short notes"
                  rows={3}
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Resume (link or notes)</span>
                <textarea
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-100 min-h-[88px] resize-y"
                  value={resume}
                  onChange={(e) => setResume(e.target.value)}
                  placeholder="PDF link, Drive, or version note"
                  rows={3}
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/30 transition hover:brightness-110 disabled:opacity-60"
              >
                {submitting ? "Adding…" : "Add application"}
              </button>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Date applied defaults to today. Use{" "}
                <strong className="font-bold text-slate-800 dark:text-slate-100">Edit</strong> on a row to change
                dates, links, referrals, or milestones.
              </p>
            </div>
          </form>
          </section>
        </Reveal>

        <Reveal delay={200}>
          <section
            id="applications-list"
            className="glass-card scroll-mt-28 overflow-hidden rounded-2xl border border-cyan-200/40 shadow-xl shadow-cyan-900/5 dark:border-cyan-800/35 dark:shadow-black/25"
          >
          <div className="border-b border-slate-100/80 bg-gradient-to-r from-white/90 via-cyan-50/30 to-violet-50/40 px-5 py-5 dark:border-slate-700/80 dark:from-slate-900/70 dark:via-cyan-950/35 dark:to-violet-950/45">
            <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-cyan-900 dark:text-cyan-200">
              Applications list
            </p>
            <p className="mb-3 mt-2 text-center text-sm font-medium text-slate-600 dark:text-slate-400">
              Choose a status to filter the table, or show everything.
            </p>
            <div
              className="flex flex-wrap justify-center gap-2 sm:justify-start"
              role="group"
              aria-label="Filter table by application status"
            >
              <button
                type="button"
                aria-pressed={tableStatusFilter == null}
                onClick={() => setTableStatusFilter(null)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${filterTabClass(tableStatusFilter == null)}`}
              >
                All applications
                {applications.length > 0 ? (
                  <span
                    className={`ml-1.5 tabular-nums ${tableStatusFilter == null ? "text-white/90" : "text-slate-600 dark:text-slate-300"}`}
                  >
                    ({applications.length})
                  </span>
                ) : null}
              </button>
              {STATUSES.map((s) => {
                const active = tableStatusFilter === s;
                const n = byStatus[s];
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setTableStatusFilter(s)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${filterTabClass(active)}`}
                  >
                    {s}
                    <span
                      className={`ml-1.5 tabular-nums ${active ? "text-white/90" : "text-slate-600 dark:text-slate-300"}`}
                    >
                      ({n})
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-center text-sm text-slate-600 dark:text-slate-400 sm:text-left">
              Sorted by{" "}
              <span className="font-semibold text-violet-800 dark:text-violet-300">importance</span> (high → low),
              then newest.{" "}
              <span className="font-semibold text-amber-800 dark:text-amber-300">Applied &gt; 7 days</span> rows
              pop for follow-up.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-left text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-violet-100/80 via-fuchsia-50/60 to-cyan-100/70 text-xs font-bold uppercase tracking-wide text-slate-700 dark:from-violet-950/90 dark:via-fuchsia-950/70 dark:to-cyan-950/80 dark:text-slate-200">
                  <th className="px-3 py-3 font-semibold w-[10%]">Company</th>
                  <th className="px-3 py-3 font-semibold w-[9%]">Role</th>
                  <th className="px-3 py-3 font-semibold w-[7%]">Status</th>
                  <th className="px-3 py-3 font-semibold w-[7%]">Date</th>
                  <th className="px-3 py-3 font-semibold w-[7%]" title="Interview, OA, or application deadline">
                    Milestone
                  </th>
                  <th className="px-3 py-3 font-semibold w-[7%]">Importance</th>
                  <th className="px-3 py-3 font-semibold w-[6%]" title="From status + timing">
                    Auto
                  </th>
                  <th className="px-3 py-3 font-semibold w-[12%]">Applied via</th>
                  <th className="px-3 py-3 font-semibold w-[11%]">Referrals</th>
                  <th className="px-3 py-3 font-semibold w-[16%]">CL / Resume</th>
                  <th className="px-3 py-3 font-semibold w-[9%]">Next action</th>
                  <th className="px-3 py-3 font-semibold w-[4rem] text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={TABLE_COLS} className="px-4 py-8 text-center text-slate-600 dark:text-slate-300">
                      Loading…
                    </td>
                  </tr>
                ) : applications.length === 0 ? (
                  <tr>
                    <td colSpan={TABLE_COLS} className="px-4 py-8 text-center text-slate-600 dark:text-slate-300">
                      No rows yet — add your first application above.
                    </td>
                  </tr>
                ) : filteredForTable.length === 0 ? (
                  <tr>
                    <td colSpan={TABLE_COLS} className="px-4 py-8 text-center text-slate-600 dark:text-slate-300">
                      No applications with status “{tableStatusFilter}”. Try another filter or{" "}
                      <button
                        type="button"
                        className="font-medium text-violet-600 hover:underline dark:text-violet-400"
                        onClick={() => setTableStatusFilter(null)}
                      >
                        show all
                      </button>
                      .
                    </td>
                  </tr>
                ) : (
                  filteredForTable.map((a) => {
                    const stale =
                      a.status === "Applied" && daysSinceApplied(a.dateApplied) > 7;
                    const refText = String(a.referrals ?? "").trim();
                    return (
                      <tr
                        id={`app-row-${a.id}`}
                        key={a.id}
                        className={`border-t border-slate-100 dark:border-slate-700/80 ${rowAccentClass(a.importance, stale)} align-top`}
                      >
                        <td className="break-words px-3 py-3 font-medium text-slate-900 dark:text-white">
                          {a.company}
                        </td>
                        <td className="break-words px-3 py-3 text-slate-700 dark:text-slate-300">
                          <span title={a.role}>{a.role}</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-800 dark:text-slate-200">
                          {a.status}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 tabular-nums text-slate-600 dark:text-slate-400">
                          {a.dateApplied}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 tabular-nums text-slate-600 dark:text-slate-400">
                          {a.interviewDate ? a.interviewDate : "—"}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ring-1 ${importanceBadgeClass(a.importance)}`}
                          >
                            {a.importance}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ring-1 ${suggestedBadgeClass(a.suggestedPriority)}`}
                          >
                            {a.suggestedPriority}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <AppliedViaCell value={a.appliedVia} />
                        </td>
                        <td className="break-words whitespace-normal px-3 py-3 align-top text-xs leading-snug text-slate-700 dark:text-slate-300">
                          {refText ? (
                            <span title={refText}>{refText}</span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 align-top">
                          <DocsCell coverLetter={a.coverLetter} resume={a.resume} />
                        </td>
                        <td className="break-words px-3 py-3 text-slate-700 dark:text-slate-300">
                          <span title={a.nextAction}>{a.nextAction}</span>
                        </td>
                        <td className="px-3 py-3 text-right align-middle">
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-violet-700 hover:bg-violet-100/90 hover:text-violet-950 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:ring-offset-2 dark:text-violet-400 dark:hover:bg-violet-950/50 dark:hover:text-violet-100 dark:focus:ring-offset-slate-900"
                            aria-label={`Actions for ${a.company}`}
                            aria-haspopup="menu"
                            aria-expanded={
                              actionMenu?.app && String(actionMenu.app.id) === String(a.id)
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRowMenu(e, a);
                            }}
                          >
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
        </Reveal>
      </main>

      <footer className="relative mx-auto max-w-3xl pb-14 pt-6 text-center">
        <div className="rounded-2xl border border-white/70 bg-white/50 px-8 py-6 shadow-lg shadow-violet-900/[0.06] backdrop-blur-md dark:border-slate-600/60 dark:bg-slate-900/55 dark:shadow-black/30">
          <p className="font-display text-base font-bold gradient-text">Trakr</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Focus on opportunities—not scattered tabs and spreadsheets.
          </p>
        </div>
      </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
