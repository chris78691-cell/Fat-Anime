import { supabase } from "./_lib/supabase.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const email = (req.body?.email || "").trim().toLowerCase().slice(0, 254);
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "that email looks made up 🤨" });
  }

  try {
    const { error } = await supabase()
      .from("notify_emails")
      .upsert({ email }, { onConflict: "email", ignoreDuplicates: true });
    if (error) throw error;
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("notify:", err);
    return res.status(500).json({ error: "couldn't save that. the site ate too much. try again." });
  }
}
