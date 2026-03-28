const MAX_BYTES = 10 * 1024 * 1024;
const BUCKET = "application-docs";

function isPdfFile(file) {
  if (!file || !(file instanceof File)) return false;
  if (file.type === "application/pdf" || file.type === "application/x-pdf") return true;
  return /\.pdf$/i.test(file.name);
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} userId
 * @param {File} file
 * @param {"cover-letter" | "resume"} kind
 * @returns {Promise<string>} public URL stored on the application row
 */
export async function uploadApplicationPdf(supabase, userId, file, kind) {
  if (file.size > MAX_BYTES) {
    throw new Error("Each PDF must be 10 MB or smaller.");
  }
  if (!isPdfFile(file)) {
    throw new Error("Please upload a PDF file (.pdf).");
  }
  const path = `${userId}/${crypto.randomUUID()}-${kind}.pdf`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export { isPdfFile, MAX_BYTES };
