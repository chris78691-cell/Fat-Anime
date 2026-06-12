import { moderate } from "../_lib/moderate.js";
import { supabase } from "../_lib/supabase.js";
import { londonDayKey } from "../_lib/time.js";

const MAX_LEN = 80;
const PER_USER_PER_DAY = 3;

export default async function handler(req, res) {
  if (req.method === "GET") return list(res);
  if (req.method === "POST") return create(req, res);
  return res.status(405).json({ error: "GET or POST only" });
}

async function list(res) {
  try {
    const { data, error } = await supabase()
      .from("requests")
      .select("id, text, votes, created_at")
      .order("votes", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) throw error;
    res.setHeader("Cache-Control", "s-maxage=5, stale-while-revalidate=15");
    return res.status(200).json({ requests: data });
  } catch (err) {
    console.error("requests list:", err);
    return res.status(500).json({ error: "the board fell over. try again." });
  }
}

async function create(req, res) {
  const userId = req.body?.userId;
  if (typeof userId !== "string" || userId.length < 8 || userId.length > 64) {
    return res.status(400).json({ error: "missing user id — refresh and try again" });
  }

  const text = String(req.body?.text || "").replace(/\s+/g, " ").trim();
  if (text.length < 2) return res.status(400).json({ error: "who? give us a name!" });
  if (text.length > MAX_LEN) return res.status(400).json({ error: `keep it under ${MAX_LEN} characters` });

  const rejection = moderate(text);
  if (rejection) return res.status(422).json({ error: rejection });

  try {
    const db = supabase();

    const { data: count, error: limitErr } = await db.rpc("take_request_slot", {
      p_day: londonDayKey(), p_user: userId, p_max: PER_USER_PER_DAY,
    });
    if (limitErr) throw limitErr;
    if (count === -1) {
      return res.status(429).json({ error: `${PER_USER_PER_DAY} requests a day max — choose wisely 🧘` });
    }

    const { data, error } = await db
      .from("requests")
      .insert({ text })
      .select("id, text, votes, created_at")
      .single();
    if (error) throw error;

    return res.status(201).json({ request: data });
  } catch (err) {
    console.error("requests create:", err);
    return res.status(500).json({ error: "couldn't save that. the site ate too much. try again." });
  }
}
