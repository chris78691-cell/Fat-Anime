// Autocomplete for the requests box — queries OUR `anime` table (never AniList live).
import { supabase } from "../_lib/supabase.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });

  const q = String(req.query.q || "").replace(/\s+/g, " ").trim();
  if (q.length < 1) return res.status(200).json({ results: [] });

  try {
    const { data, error } = await supabase().rpc("search_anime", { q, lim: 8 });
    if (error) throw error;
    const results = (data || []).map((r) => ({
      anilistId: r.anilist_id,
      english: r.english || r.romaji,
      romaji: r.romaji,
    }));
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json({ results });
  } catch (err) {
    console.error("anime search:", err);
    return res.status(500).json({ error: "search hiccup. try again." });
  }
}
