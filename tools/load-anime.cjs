// Pre-load ~top 3000 popular anime from AniList into the Supabase `anime` table.
// One-off / refreshable. Run after applying sql/anime-requests.sql:
//
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node tools/load-anime.cjs
//
// Autocomplete queries OUR table (api/anime/search), never AniList live.
const { createClient } = require("@supabase/supabase-js");

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
if (!URL || !KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars first.");
  process.exit(1);
}
const db = createClient(URL, KEY, { auth: { persistSession: false } });

const PAGES = 60; // 60 x 50 = 3000
const PER_PAGE = 50;
const ANILIST = "https://graphql.anilist.co";
const QUERY = `query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage }
    media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
      id
      title { english romaji native }
      synonyms
      popularity
    }
  }
}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(page, attempt = 0) {
  const res = await fetch(ANILIST, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { page, perPage: PER_PAGE } }),
  });
  if (res.status === 429) {
    const wait = (Number(res.headers.get("retry-after")) || 60) + 1;
    if (attempt > 5) throw new Error("AniList rate limit: giving up");
    console.log(`  rate limited, waiting ${wait}s...`);
    await sleep(wait * 1000);
    return fetchPage(page, attempt + 1);
  }
  if (!res.ok) throw new Error(`AniList ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  return json.data.Page;
}

function toRow(m) {
  const english = m.title.english || null;
  const romaji = m.title.romaji || null;
  const native = m.title.native || null;
  const synonyms = (m.synonyms || []).filter(Boolean).slice(0, 12);
  const blob = [english, romaji, native, ...synonyms].filter(Boolean).join(" ").toLowerCase();
  return { anilist_id: m.id, english, romaji, native, synonyms, popularity: m.popularity || 0, search_blob: blob };
}

(async () => {
  const rows = [];
  for (let page = 1; page <= PAGES; page++) {
    const data = await fetchPage(page);
    const media = data.media || [];
    if (!media.length) break;
    rows.push(...media.map(toRow));
    console.log(`fetched page ${page}/${PAGES} (${rows.length} total)`);
    if (!data.pageInfo.hasNextPage) break;
    await sleep(800); // stay well under AniList's rate limit
  }

  // de-dup by id (AniList can repeat across pages as popularity shifts)
  const byId = new Map(rows.map((r) => [r.anilist_id, r]));
  const unique = [...byId.values()];

  for (let i = 0; i < unique.length; i += 500) {
    const batch = unique.slice(i, i + 500);
    const { error } = await db.from("anime").upsert(batch, { onConflict: "anilist_id" });
    if (error) { console.error("upsert error:", error.message); process.exit(1); }
    console.log(`upserted ${Math.min(i + 500, unique.length)}/${unique.length}`);
  }
  console.log(`\nDone. ${unique.length} anime in the catalog.`);
})().catch((e) => { console.error(e.message); process.exit(1); });
