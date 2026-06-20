// Toggle a vote on a leaderboard entry. [id] is now an AniList anime id (integer).
import { supabase } from "../../_lib/supabase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const anilistId = Number(req.query.id);
  const userId = req.body?.userId;
  if (!Number.isInteger(anilistId) || anilistId <= 0) return res.status(400).json({ error: "unknown anime" });
  if (typeof userId !== "string" || userId.length < 8 || userId.length > 64) {
    return res.status(400).json({ error: "missing user id — refresh and try again" });
  }

  try {
    // toggle: first tap votes, tapping again takes it back
    const { data, error } = await supabase().rpc("toggle_anime_vote", {
      p_anilist: anilistId, p_voter: userId,
    });
    if (error) throw error;

    if (data?.error === "gone") return res.status(404).json({ error: "that request got eaten" });
    return res.status(200).json({ votes: data.votes, voted: data.voted });
  } catch (err) {
    console.error("vote:", err);
    return res.status(500).json({ error: "vote slipped off the plate. try again." });
  }
}
