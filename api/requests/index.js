// Anime-only requests leaderboard. Dedup by AniList id; display the English title.
import { supabase } from "../_lib/supabase.js";
import { londonDayKey } from "../_lib/time.js";

const PER_USER_PER_DAY = 3;

export default async function handler(req, res) {
  if (req.method === "GET") return list(res);
  if (req.method === "POST") return create(req, res);
  return res.status(405).json({ error: "GET or POST only" });
}

async function list(res) {
  try {
    const { data, error } = await supabase()
      .from("anime_requests")
      .select("anilist_id, votes, created_at, anime ( english, romaji )")
      .order("votes", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw error;

    const requests = (data || []).map((r) => ({
      anilistId: r.anilist_id,
      votes: r.votes,
      english: r.anime?.english || r.anime?.romaji || "Unknown",
    }));
    res.setHeader("Cache-Control", "s-maxage=5, stale-while-revalidate=15");
    return res.status(200).json({ requests });
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

  let anilistId = Number.isInteger(req.body?.anilistId) ? req.body.anilistId : null;
  const query = String(req.body?.query || "").replace(/\s+/g, " ").trim();

  try {
    const db = supabase();

    // Only IDs that exist in OUR catalog can reach the board.
    if (anilistId) {
      const { data: exists } = await db.from("anime").select("anilist_id").eq("anilist_id", anilistId).maybeSingle();
      if (!exists) anilistId = null;
    }
    // No (valid) selection → fuzzy-resolve the typed text to the closest anime.
    if (!anilistId) {
      if (query.length < 2) return res.status(400).json({ error: "pick an anime from the list" });
      const { data: resolved, error: rErr } = await db.rpc("resolve_anime", { q: query });
      if (rErr) throw rErr;
      anilistId = resolved || null;
    }
    if (!anilistId) return res.status(404).json({ error: "couldn't find that anime — try another" });

    const { data, error } = await db.rpc("submit_anime", {
      p_anilist: anilistId, p_voter: userId, p_day: londonDayKey(), p_max: PER_USER_PER_DAY,
    });
    if (error) throw error;
    if (data?.error === "limit") {
      return res.status(429).json({ error: `${PER_USER_PER_DAY} requests a day max — choose wisely 🧘` });
    }

    const { data: a } = await db.from("anime").select("english, romaji").eq("anilist_id", anilistId).maybeSingle();
    return res.status(201).json({
      request: { anilistId, votes: data.votes, english: a?.english || a?.romaji || "Unknown" },
    });
  } catch (err) {
    console.error("requests create:", err);
    return res.status(500).json({ error: "couldn't save that. the site ate too much. try again." });
  }
}
