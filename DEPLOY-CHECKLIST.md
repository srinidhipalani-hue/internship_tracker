# Trakr — local dev, Supabase, and Vercel

## Why `npm install` failed at the repo root

This repo has **no single root `package.json` before**; dependencies live in **`client/`** and **`server/`**.

**Now:** run **`npm install` once at the repo root** (the folder that contains `package.json` with `workspaces`). That installs **both** `client` and `server`.

Then:

- **Frontend dev:** `npm run dev` (from repo root) or `cd client && npm run dev`
- **Optional local API:** `npm run dev:server` or `cd server && npm run dev`

---

## Local checklist (Supabase + Vite)

1. **`.env` in `client/`** (copy from `client/.env.example`), with:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`  
   **No quotes** around values; no spaces around `=`.

2. **Restart** `npm run dev` after changing `.env` (Vite reads env at startup).

3. In **Supabase → SQL Editor**, run everything in **`supabase/schema.sql`** (table + RLS policies).

4. **Supabase → Authentication → Providers → Email**  
   For quick testing, disable **“Confirm email”** (or users must confirm before login works).

5. Open the app: you should see **login**, not the “configure Supabase” screen.  
   Create an account, add one application, refresh — data should still be there.

---

## Vercel checklist

1. **Root Directory** must be **`client`**  
   - Vercel project → **Settings → General → Root Directory** → set to `client` → Save.  
   - Redeploy after changing this.

2. **Environment variables** (Settings → Environment Variables), for **Production** (and Preview if you use it):
   - `VITE_SUPABASE_URL` = same as in Supabase → Project Settings → API  
   - `VITE_SUPABASE_ANON_KEY` = **anon public** key (not the service_role key)

3. **Build command:** `npm run build`  
   **Output directory:** `dist`  
   (Defaults are correct if Root Directory is `client`.)

4. **Supabase → Authentication → URL configuration**  
   - **Site URL:** `https://YOUR-APP.vercel.app`  
   - **Redirect URLs:** add the same URL + `http://localhost:5173` for local dev.

5. After deploy, open the Vercel URL and test sign-up and saving an application.

---

## Git / “repo not updated”

Push from your machine so GitHub matches your disk:

```bash
git status
git add -A
git commit -m "Sync Trakr client + Supabase setup"
git push
```

In **Vercel → Deployments**, confirm the latest commit is building. If Root Directory is wrong, the build may use the wrong folder or fail.

---

## If the Vercel build failed

1. Open the failed deployment → **Building** log and scroll to the **red error** (often the last 20 lines).
2. Common fixes:
   - **Root Directory** = `client` (Settings → General).
   - **`vite: not found` / `command not found`:** This repo keeps Vite in **dependencies** so installs always include the build tools. Pull latest `main`, redeploy.
   - **`Cannot find module '@rollup/rollup-linux-x64-gnu'`:** Lockfiles created on Windows can omit Rollup’s Linux binary. This repo lists it under **`optionalDependencies`** so Linux (Vercel) installs it while Windows skips it. Pull latest `main`, redeploy.
   - **Output directory:** must be **`dist`** (Vite default).
3. **Environment variables** missing does **not** fail the build; they are only needed at **build time** for `VITE_*` if you want them baked in (recommended: set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` on Vercel for Production).

---

## If your Supabase keys were committed

If real keys ever appeared in **`.env.example`** or any tracked file, treat them as exposed: **Supabase → Project Settings → API → rotate the anon key** (or create a new project) and update Vercel + local `.env`.
