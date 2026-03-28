/** Shared domain + DB row mapping (was Express in-memory logic). */

export const STATUSES = ["Applied", "OA", "Interview", "Offer", "Rejected"];
export const IMPORTANCE_LEVELS = ["HIGH", "MEDIUM", "LOW"];

const IMPORTANCE_RANK = { HIGH: 0, MEDIUM: 1, LOW: 2 };

const STAGE_FLOW = {
  Applied: "OA",
  OA: "Interview",
  Interview: "Offer",
};

export function daysSinceApplied(dateApplied) {
  const applied = new Date(`${dateApplied}T12:00:00`);
  const now = new Date();
  return Math.floor((now - applied) / (1000 * 60 * 60 * 24));
}

export function calculateSuggestedPriority({ status, dateApplied }) {
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

export function calculateNextAction(status) {
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

export function nextStatus(current) {
  return STAGE_FLOW[current] ?? null;
}

export function normalizeApplication(raw) {
  const suggestedPriority = calculateSuggestedPriority(raw);
  const importance = IMPORTANCE_LEVELS.includes(raw.importance)
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

export function sortApplications(apps) {
  return [...apps].sort((a, b) => {
    const ir = IMPORTANCE_RANK[a.importance] - IMPORTANCE_RANK[b.importance];
    if (ir !== 0) return ir;
    return new Date(b.dateApplied) - new Date(a.dateApplied);
  });
}

/** Supabase row (snake_case) → app shape */
export function rowToApp(row) {
  return normalizeApplication({
    id: row.id,
    company: row.company,
    role: row.role,
    status: row.status,
    dateApplied: row.date_applied,
    importance: row.importance,
    coverLetter: row.cover_letter ?? "",
    resume: row.resume ?? "",
    appliedVia: row.applied_via ?? "",
    referrals: row.referrals ?? "",
  });
}

export function buildNewRow(userId, fields) {
  const dateApplied = new Date().toISOString().slice(0, 10);
  const status = fields.status;
  const suggested = calculateSuggestedPriority({ status, dateApplied });
  const importance = IMPORTANCE_LEVELS.includes(fields.importance)
    ? fields.importance
    : suggested;
  return {
    user_id: userId,
    company: fields.company.trim(),
    role: fields.role.trim(),
    status,
    date_applied: dateApplied,
    importance,
    cover_letter: String(fields.coverLetter ?? ""),
    resume: String(fields.resume ?? ""),
    applied_via: String(fields.appliedVia ?? "").trim(),
    referrals: String(fields.referrals ?? "").trim(),
  };
}

export function buildUpdateRow(fields) {
  return {
    company: fields.company.trim(),
    role: fields.role.trim(),
    status: fields.status,
    date_applied: fields.dateApplied.trim(),
    importance: fields.importance,
    cover_letter: String(fields.coverLetter ?? ""),
    resume: String(fields.resume ?? ""),
    applied_via: String(fields.appliedVia ?? "").trim(),
    referrals: String(fields.referrals ?? "").trim(),
  };
}
