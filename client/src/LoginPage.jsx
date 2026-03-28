import { useState } from "react";
import { getSupabase } from "./supabaseClient.js";

export default function LoginPage() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "register") {
        const { data, error: signErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signErr) throw signErr;
        if (!data.session) {
          setError(
            "Account created. Check your email to confirm, or disable “Confirm email” under Supabase → Authentication → Providers → Email for instant access."
          );
          return;
        }
      } else {
        const { error: signErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signErr) throw signErr;
      }
    } catch (err) {
      setError(err.message || "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-x-hidden px-4 py-12">
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden dark:opacity-[0.85]"
        aria-hidden
      >
        <div className="absolute -left-20 top-24 h-72 w-72 rounded-full bg-gradient-to-br from-violet-400/35 to-fuchsia-400/25 blur-3xl" />
        <div className="absolute -right-16 top-40 h-80 w-80 rounded-full bg-gradient-to-br from-cyan-400/30 to-teal-300/20 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="font-display text-3xl font-extrabold tracking-tight gradient-text">Trakr</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Sign in to manage your own applications list (stored in Supabase).
          </p>
        </div>

        <div className="glass-card rounded-2xl border border-violet-200/50 p-6 shadow-xl shadow-violet-900/10 dark:border-violet-900/40 dark:shadow-black/40 sm:p-8">
          <div className="flex rounded-xl bg-slate-100/90 p-1 dark:bg-slate-800/80">
            <button
              type="button"
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                mode === "login"
                  ? "bg-white text-violet-800 shadow-sm dark:bg-slate-700 dark:text-violet-200"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
              onClick={() => {
                setMode("login");
                setError("");
              }}
            >
              Log in
            </button>
            <button
              type="button"
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                mode === "register"
                  ? "bg-white text-violet-800 shadow-sm dark:bg-slate-700 dark:text-violet-200"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
              onClick={() => {
                setMode("register");
                setError("");
              }}
            >
              Create account
            </button>
          </div>

          <form className="mt-6 space-y-4" onSubmit={submit}>
            <label className="block">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Email</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-100"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Password</span>
              <input
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={mode === "register" ? 6 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-100"
              />
              {mode === "register" ? (
                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-500">
                  Supabase default: at least 6 characters (stricter rules can be set in the dashboard).
                </span>
              ) : null}
            </label>

            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-fuchsia-500/25 transition hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-60"
            >
              {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-500">
          Deploy the client to Vercel with <code className="rounded bg-slate-200/80 px-1 dark:bg-slate-700">VITE_*</code>{" "}
          env vars. Add your production URL under Supabase → Authentication → URL configuration.
        </p>
      </div>
    </div>
  );
}
