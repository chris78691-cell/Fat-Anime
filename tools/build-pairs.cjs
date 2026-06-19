// Build tmp/pairs2.json deterministically from the vision identification output.
// Pairs each character's before(fat:false) + after(fat:true), maps to gallery slugs.
const fs = require("fs");

const OUTPUT = process.argv[2];
const ids = JSON.parse(fs.readFileSync(OUTPUT, "utf8")).result.items;

const charToSlug = {
  "eren yeager": "eren", "mikasa ackerman": "mikasa", "power": "power",
  "spike spiegel": "spike", "light yagami": "light", "nezuko kamado": "nezuko",
  "frieza": "frieza", "vegeta": "vegeta", "megumi fushiguro": "megumi",
  "sukuna": "sukuna", "ryomen sukuna": "sukuna", "katsuki bakugo": "bakugo",
  "shoto todoroki": "todoroki", "sasuke uchiha": "sasuke", "monkey d. luffy": "luffy",
  "rem": "rem", "yor forger": "yor", "roronoa zoro": "zoro",
  "kakashi hatake": "kakashi", "hiromi higuruma": "higuruma", "higuruma": "higuruma",
  "yuji itadori": "yuji", "satoru gojo": "gojo",
};

// manual src -> slug overrides (vision tagged 123f3e as "Yuji" but it's Sukuna's before)
const srcOverride = { "123f3e01f73b25cb450d4d2e2b1901b3.jpg": "sukuna" };
// slugs to drop entirely
const skipSlug = new Set(["gojo"]);

const pairs = {};
const warnings = [];
for (const it of ids) {
  let slug = srcOverride[it.src] || charToSlug[(it.character || "").toLowerCase().trim()];
  if (!slug) { warnings.push(`no slug for ${it.src} (${it.character})`); continue; }
  if (skipSlug.has(slug)) continue;
  pairs[slug] = pairs[slug] || { before: null, after: null };
  if (it.fat) pairs[slug].after = it.src;
  else pairs[slug].before = it.src;
}

// keep only complete pairs; report incomplete
const complete = {};
for (const [slug, m] of Object.entries(pairs)) {
  if (m.before && m.after && fs.existsSync(m.before) && fs.existsSync(m.after)) complete[slug] = m;
  else warnings.push(`INCOMPLETE/MISSING ${slug}: ${JSON.stringify(m)}`);
}

fs.writeFileSync("tmp/pairs2.json", JSON.stringify(complete, null, 2));
console.log("complete pairs:", Object.keys(complete).length);
console.log(Object.keys(complete).sort().join(", "));
console.log("\nwarnings:");
console.log(warnings.length ? warnings.join("\n") : "(none)");
