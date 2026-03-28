# Frictionless Internship Tracker

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
- `POST /applications` — body: `{ "company", "role", "status" }` (sets `dateApplied` to today; computes `priority` and `nextAction`)
- `PATCH /applications/:id` — body: `{ "advance": true }` to move to the next stage, or `{ "status": "Interview" }` to set status explicitly

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
