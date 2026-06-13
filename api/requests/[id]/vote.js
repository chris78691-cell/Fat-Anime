import { supabase } from "../../_lib/supabase.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const id = req.query.id;
  const userId = req.body?.userId;
  if (!UUID_RE.test(String(id))) return res.status(400).json({ error: "unknown request" });
  if (typeof userId !== "string" || userId.length < 8 || userId.length > 64) {
    return res.status(400).json({ error: "missing user id — refresh and try again" });
  }

  try {
    // toggle: first tap votes, tapping again takes it back
    const { data, error } = await supabase().rpc("toggle_vote", {
      p_request: id, p_voter: userId,
    });
    if (error) throw error;

    if (data?.error === "gone") return res.status(404).json({ error: "that request got eaten" });
    return res.status(200).json({ votes: data.votes, voted: data.voted });
  } catch (err) {
    console.error("vote:", err);
    return res.status(500).json({ error: "vote slipped off the plate. try again." });
  }
}
