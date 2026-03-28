export default function ConfigRequired() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#f4f2ff] px-4 py-12 dark:bg-[#0c0718]">
      <div className="glass-card max-w-lg rounded-2xl border border-violet-200/60 p-8 text-center dark:border-violet-900/40">
        <p className="font-display text-xl font-bold gradient-text">Trakr</p>
        <p className="mt-4 text-sm text-slate-700 dark:text-slate-300">
          Add Supabase environment variables, then restart the dev server.
        </p>
        <p className="mt-3 text-left text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          In <code className="rounded bg-slate-200/80 px-1 dark:bg-slate-700">client/.env</code> (or Vercel
          project settings):
        </p>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-left text-xs text-slate-100">
          {`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...`}
        </pre>
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-500">
          Run the SQL in <code className="rounded bg-slate-200/80 px-1 dark:bg-slate-700">supabase/schema.sql</code> in
          the Supabase SQL Editor, then create a user under Authentication or use the app sign-up form.
        </p>
      </div>
    </div>
  );
}
