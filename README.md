# Trakr

Full-stack internship application tracker: React (Vite + Tailwind) frontend and Node.js + Express API with in-memory storage.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ (includes `npm`)

## Run the backend

```bash
cd server
npm install
npm start
```

API listens on **http://localhost:3001**.

- `GET /applications` — list all applications (sorted by priority, then date)
- `POST /applications` — body: `{ "company", "role", "status", "importance"?, "coverLetter"?, "resume"?, "appliedVia"?, "referrals"? }` (`dateApplied` = today; `importance` defaults from status/timing if omitted; lists sort by **importance** then date)
- `PATCH /applications/:id` — `{ "advance": true }` or `{ "status": "…" }`, and/or updates: `company`, `role`, `dateApplied` (`YYYY-MM-DD`), `importance`, `coverLetter`, `resume`, `appliedVia`, `referrals`
- `DELETE /applications/:id` — remove a row (responds with `{ "ok": true }`)

## Run the frontend

In a **second** terminal:

```bash
cd client
npm install
npm run dev
```

Open **http://localhost:5173**. The dev server proxies `/applications` to the API on port 3001.

### Production build (optional)

```bash
cd client
npm run build
npm run preview
```

For preview or static hosting without the dev proxy, set the API URL when building or previewing:

```bash
set VITE_API_URL=http://localhost:3001
npm run preview
```

(On Unix: `export VITE_API_URL=http://localhost:3001`.)

## Status flow (one-click “Next”)

Applied → OA → Interview → Offer. **Offer** and **Rejected** have no next stage in the pipeline.
