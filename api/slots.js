import { GENERATION } from "./_config/generation.js";
import { supabase } from "./_lib/supabase.js";
import { londonDayKey, nextLondonMidnight } from "./_lib/time.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });

  try {
    const { data, error } = await supabase()
      .from("daily_slots")
      .select("remaining")
      .eq("day", londonDayKey())
      .maybeSingle();
    if (error) throw error;

    res.setHeader("Cache-Control", "s-maxage=5, stale-while-revalidate=15");
    return res.status(200).json({
      remaining: data ? data.remaining : GENERATION.DAILY_LIMIT, // day row appears on first generation
      limit: GENERATION.DAILY_LIMIT,
      resetsAt: nextLondonMidnight().toISOString(),
    });
  } catch (err) {
    console.error("slots:", err);
    return res.status(500).json({ error: "counter fell over. it's fine, probably. try again." });
  }
}
