/**
 * Optional local API (JWT + in-memory apps). The Vite client is wired for Supabase instead;
 * use this only if you want a fully offline Express backend.
 */
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "trakr-dev-secret-change-in-production";
const JWT_EXPIRES = "7d";

const STATUS_ORDER = ["Applied", "OA", "Interview", "Offer", "Rejected"];
const IMPORTANCE_ORDER = ["HIGH", "MEDIUM", "LOW"];

const IMPORTANCE_RANK = { HIGH: 0, MEDIUM: 1, LOW: 2 };

function daysSinceApplied(dateApplied) {
  const applied = new Date(`${dateApplied}T12:00:00`);
  const now = new Date();
  return Math.floor((now - applied) / (1000 * 60 * 60 * 24));
}

function calculateSuggestedPriority({ status, dateApplied }) {
  switch (status) {
    case "Interview":
    case "OA":
    case "Offer":
      return "HIGH";
    case "Rejected":
      return "LOW";
    case "Applied":
      return daysSinceApplied(dateApplied) > 7 ? "MEDIUM" : "LOW";
    default:
      return "LOW";
  }
}

function calculateNextAction(status) {
  switch (status) {
    case "Applied":
      return "Follow up";
    case "OA":
      return "Complete OA";
    case "Interview":
      return "Prepare interview";
    case "Offer":
      return "Respond to offer";
    case "Rejected":
      return "No action";
    default:
      return "Follow up";
  }
}

const STAGE_FLOW = {
  Applied: "OA",
  OA: "Interview",
  Interview: "Offer",
};

function nextStatus(current) {
  return STAGE_FLOW[current] ?? null;
}

function normalizeApplication(raw) {
  const suggestedPriority = calculateSuggestedPriority(raw);
  const importance = IMPORTANCE_ORDER.includes(raw.importance)
    ? raw.importance
    : suggestedPriority;
  const nextAction = calculateNextAction(raw.status);
  return {
    ...raw,
    coverLetter: typeof raw.coverLetter === "string" ? raw.coverLetter : "",
    resume: typeof raw.resume === "string" ? raw.resume : "",
    appliedVia: typeof raw.appliedVia === "string" ? raw.appliedVia.trim() : "",
    referrals: typeof raw.referrals === "string" ? raw.referrals.trim() : "",
    importance,
    suggestedPriority,
    nextAction,
  };
}

function sortApplications(apps) {
  return [...apps].sort((a, b) => {
    const ir = IMPORTANCE_RANK[a.importance] - IMPORTANCE_RANK[b.importance];
    if (ir !== 0) return ir;
    return new Date(b.dateApplied) - new Date(a.dateApplied);
  });
}

/** @type {Map<string, { id: string, email: string, passwordHash: string }>} */
const usersByEmail = new Map();
/** @type {Map<string, Array>} userId -> applications */
const appsByUserId = new Map();
/** @type {Map<string, number>} userId -> next numeric id */
const nextAppIdByUser = new Map();

function getUserApps(userId) {
  if (!appsByUserId.has(userId)) appsByUserId.set(userId, []);
  if (!nextAppIdByUser.has(userId)) nextAppIdByUser.set(userId, 1);
  return appsByUserId.get(userId);
}

function nextIdFor(userId) {
  const n = nextAppIdByUser.get(userId) ?? 1;
  nextAppIdByUser.set(userId, n + 1);
  return String(n);
}

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }
  try {
    const payload = jwt.verify(h.slice(7), JWT_SECRET);
    const userId = payload.sub;
    const email = payload.email;
    if (!userId || !email) return res.status(401).json({ error: "Invalid token" });
    req.userId = userId;
    req.userEmail = email;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function isIsoDate(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "512kb" }));

/** Quick check that the API is up (e.g. curl http://localhost:3001/health) */
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/auth/register", async (req, res) => {
  try {
    const emailRaw = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");

    if (!isValidEmail(emailRaw)) {
      return res.status(400).json({ error: "Valid email is required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    if (usersByEmail.has(emailRaw)) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const id = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    const user = { id, email: emailRaw, passwordHash };
    usersByEmail.set(emailRaw, user);

    const token = signToken(user);
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email },
    });
  } catch (e) {
    console.error("auth/register", e);
    res.status(500).json({ error: "Registration failed. Check the server terminal for details." });
  }
});

app.post("/auth/login", async (req, res) => {
  const emailRaw = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");

  if (!emailRaw || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = usersByEmail.get(emailRaw);
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, email: user.email },
  });
});

app.get("/auth/me", authMiddleware, (req, res) => {
  res.json({ id: req.userId, email: req.userEmail });
});

app.get("/applications", authMiddleware, (req, res) => {
  const apps = getUserApps(req.userId);
  res.json(sortApplications(apps));
});

app.post("/applications", authMiddleware, (req, res) => {
  const {
    company,
    role,
    status,
    coverLetter,
    resume,
    appliedVia,
    importance,
    referrals,
  } = req.body;
  if (!company?.trim() || !role?.trim() || !status) {
    return res.status(400).json({ error: "company, role, and status are required" });
  }
  if (!STATUS_ORDER.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  if (importance != null && !IMPORTANCE_ORDER.includes(importance)) {
    return res.status(400).json({ error: "importance must be HIGH, MEDIUM, or LOW" });
  }

  const dateApplied = new Date().toISOString().slice(0, 10);
  const apps = getUserApps(req.userId);
  const row = normalizeApplication({
    id: nextIdFor(req.userId),
    company: company.trim(),
    role: role.trim(),
    status,
    dateApplied,
    coverLetter: coverLetter ?? "",
    resume: resume ?? "",
    appliedVia: appliedVia ?? "",
    referrals: referrals ?? "",
    importance: importance ?? calculateSuggestedPriority({ status, dateApplied }),
  });
  apps.push(row);
  res.status(201).json(row);
});

app.patch("/applications/:id", authMiddleware, (req, res) => {
  const { id } = req.params;
  const apps = getUserApps(req.userId);
  const {
    status,
    advance,
    company,
    role,
    dateApplied,
    coverLetter,
    resume,
    appliedVia,
    importance,
    referrals,
  } = req.body;
  const idx = apps.findIndex((a) => String(a.id) === String(id));
  if (idx === -1) return res.status(404).json({ error: "Not found" });

  const cur = { ...apps[idx] };
  let newStatus = cur.status;

  if (advance) {
    const n = nextStatus(cur.status);
    if (!n) return res.status(400).json({ error: "No next stage" });
    newStatus = n;
  } else if (status !== undefined && status !== null) {
    if (!STATUS_ORDER.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    newStatus = status;
  }

  if (company !== undefined) {
    const c = String(company).trim();
    if (!c) return res.status(400).json({ error: "company cannot be empty" });
    cur.company = c;
  }
  if (role !== undefined) {
    const r = String(role).trim();
    if (!r) return res.status(400).json({ error: "role cannot be empty" });
    cur.role = r;
  }
  if (dateApplied !== undefined) {
    const d = String(dateApplied).trim();
    if (!isIsoDate(d)) return res.status(400).json({ error: "dateApplied must be YYYY-MM-DD" });
    cur.dateApplied = d;
  }

  if (importance !== undefined && importance !== null) {
    if (!IMPORTANCE_ORDER.includes(importance)) {
      return res.status(400).json({ error: "importance must be HIGH, MEDIUM, or LOW" });
    }
    cur.importance = importance;
  }
  if (coverLetter !== undefined) cur.coverLetter = String(coverLetter);
  if (resume !== undefined) cur.resume = String(resume);
  if (appliedVia !== undefined) cur.appliedVia = String(appliedVia).trim();
  if (referrals !== undefined) cur.referrals = String(referrals).trim();

  const hasMetaPatch =
    company !== undefined ||
    role !== undefined ||
    dateApplied !== undefined ||
    coverLetter !== undefined ||
    resume !== undefined ||
    appliedVia !== undefined ||
    importance !== undefined ||
    referrals !== undefined;

  const hasStatusChange = Boolean(advance) || (status !== undefined && status !== null);

  if (!hasStatusChange && !hasMetaPatch) {
    return res.status(400).json({ error: "Provide advance, status, or fields to update" });
  }

  cur.status = newStatus;
  apps[idx] = normalizeApplication(cur);
  res.json(apps[idx]);
});

app.delete("/applications/:id", authMiddleware, (req, res) => {
  const id = String(req.params.id);
  const apps = getUserApps(req.userId);
  const before = apps.length;
  const filtered = apps.filter((a) => String(a.id) !== id);
  if (filtered.length === before) return res.status(404).json({ error: "Not found" });
  appsByUserId.set(req.userId, filtered);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`API http://localhost:${PORT}`);
  console.log("Auth: POST /auth/register, POST /auth/login — applications require Bearer token.");
  console.log("Leave this process running. Open another terminal for the client (npm run dev in client/). Ctrl+C to stop.");
});
