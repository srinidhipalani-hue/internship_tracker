export default function ConfigRequired() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#f4f2ff] px-4 py-12 dark:bg-[#0c0718]">
      <div className="glass-card max-w-lg rounded-2xl border border-violet-200/60 p-8 text-center dark:border-violet-900/40">
        <p className="font-display text-xl font-bold gradient-text">Trakr</p>
        <p className="mt-4 text-sm text-slate-700 dark:text-slate-300">
          This build does not have Supabase credentials. Vite only reads{" "}
          <code className="rounded bg-slate-200/80 px-1 dark:bg-slate-700">VITE_*</code> variables when the app is
          built.
        </p>
        <p className="mt-3 text-left text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          <strong className="text-slate-800 dark:text-slate-200">Vercel:</strong> Project → Settings → Environment
          Variables → add both keys for <strong>Production</strong>, then{" "}
          <strong>Deployments → Redeploy</strong> (without cache is fine).
          <br />
          <br />
          <strong className="text-slate-800 dark:text-slate-200">Local:</strong> put them in{" "}
          <code className="rounded bg-slate-200/80 px-1 dark:bg-slate-700">client/.env</code> and restart{" "}
          <code className="rounded bg-slate-200/80 px-1 dark:bg-slate-700">npm run dev</code>.
        </p>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-left text-xs text-slate-100">
          {`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...`}
        </pre>
        <p className="mt-4 text-left text-xs text-slate-500 dark:text-slate-500">
          <strong className="text-slate-700 dark:text-slate-300">Still here after redeploy?</strong> In Vercel open each
          variable — names must be exact, values have <strong>no</strong> quotes, and{" "}
          <strong>Production</strong> must be checked. Redeploy again or use{" "}
          <strong>Redeploy → clear build cache</strong>.
        </p>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-500">
          Run the SQL in <code className="rounded bg-slate-200/80 px-1 dark:bg-slate-700">supabase/schema.sql</code> in
          the Supabase SQL Editor, then create a user under Authentication or use the app sign-up form.
        </p>
      </div>
    </div>
  );
}
