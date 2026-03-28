import express from "express";
import cors from "cors";

const PORT = process.env.PORT || 3001;

const STATUS_ORDER = ["Applied", "OA", "Interview", "Offer", "Rejected"];

const PRIORITY_RANK = { HIGH: 0, MEDIUM: 1, LOW: 2 };

function daysSinceApplied(dateApplied) {
  const applied = new Date(`${dateApplied}T12:00:00`);
  const now = new Date();
  return Math.floor((now - applied) / (1000 * 60 * 60 * 24));
}

function calculatePriority({ status, dateApplied }) {
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
  const priority = calculatePriority(raw);
  const nextAction = calculateNextAction(raw.status);
  return { ...raw, priority, nextAction };
}

function sortApplications(apps) {
  return [...apps].sort((a, b) => {
    const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (pr !== 0) return pr;
    return new Date(b.dateApplied) - new Date(a.dateApplied);
  });
}

function seedApplications() {
  const today = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);

  const old = new Date(today);
  old.setDate(old.getDate() - 10);

  const recent = new Date(today);
  recent.setDate(recent.getDate() - 2);

  return [
    normalizeApplication({
      id: "1",
      company: "Acme Labs",
      role: "Software Engineer Intern",
      status: "Applied",
      dateApplied: iso(old),
    }),
    normalizeApplication({
      id: "2",
      company: "Northwind AI",
      role: "ML Intern",
      status: "OA",
      dateApplied: iso(recent),
    }),
    normalizeApplication({
      id: "3",
      company: "Globex",
      role: "Full-Stack Intern",
      status: "Interview",
      dateApplied: iso(recent),
    }),
    normalizeApplication({
      id: "4",
      company: "Initech",
      role: "Backend Intern",
      status: "Offer",
      dateApplied: iso(recent),
    }),
    normalizeApplication({
      id: "5",
      company: "Umbrella Corp",
      role: "Security Intern",
      status: "Rejected",
      dateApplied: iso(old),
    }),
  ];
}

let applications = seedApplications();
let nextId = 6;

const app = express();
app.use(cors());
app.use(express.json());

app.get("/applications", (req, res) => {
  res.json(sortApplications(applications));
});

app.post("/applications", (req, res) => {
  const { company, role, status } = req.body;
  if (!company?.trim() || !role?.trim() || !status) {
    return res.status(400).json({ error: "company, role, and status are required" });
  }
  if (!STATUS_ORDER.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const dateApplied = new Date().toISOString().slice(0, 10);
  const row = normalizeApplication({
    id: String(nextId++),
    company: company.trim(),
    role: role.trim(),
    status,
    dateApplied,
  });
  applications.push(row);
  res.status(201).json(row);
});

app.patch("/applications/:id", (req, res) => {
  const { id } = req.params;
  const { status, advance } = req.body;
  const idx = applications.findIndex((a) => a.id === id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });

  let newStatus = applications[idx].status;
  if (advance) {
    const n = nextStatus(applications[idx].status);
    if (!n) return res.status(400).json({ error: "No next stage" });
    newStatus = n;
  } else if (status) {
    if (!STATUS_ORDER.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    newStatus = status;
  } else {
    return res.status(400).json({ error: "Provide status or advance: true" });
  }

  applications[idx] = normalizeApplication({
    ...applications[idx],
    status: newStatus,
  });
  res.json(applications[idx]);
});

app.listen(PORT, () => {
  console.log(`API http://localhost:${PORT}`);
});
