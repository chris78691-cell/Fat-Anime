// Convert matched before/after source frames into the live gallery webps.
const fs = require("fs");
const sharp = require("sharp");

const p = JSON.parse(fs.readFileSync("tmp/pairs.json", "utf8"));
const skip = new Set(["?frieren", "gojo", "jotaro"]); // gojo: no real new pair; jotaro: being removed

const final = {};
for (const [slug, m] of Object.entries(p)) {
  if (skip.has(slug)) continue;
  if (m.before[0] && m.after[0]) final[slug] = { before: m.before[0], after: m.after[0] };
}
// manual corrections (odd filenames / pick the iconic Kaneki set)
final.frieren = { before: "wZQCrGPN_400x400.jpg", after: "photo_2026-06-16_17-14-23.jpg" };
final.kaneki  = { before: "6834784df68fcc682f47b89c793d3b79.jpg", after: "hf_20260616_162612_d9db8b81-c8e4-4525-b6ab-4be9c1eb2448.png" };

(async () => {
  const done = [];
  for (const [slug, m] of Object.entries(final)) {
    if (!fs.existsSync(m.before) || !fs.existsSync(m.after)) { console.log("MISSING SRC", slug, m); continue; }
    await sharp(m.before).resize({ width: 800, height: 800, fit: "inside" }).webp({ quality: 80 }).toFile(`assets/presets/${slug}-before.webp`);
    await sharp(m.after).resize({ width: 800, height: 800, fit: "inside" }).webp({ quality: 80 }).toFile(`assets/presets/${slug}-after.webp`);
    done.push(slug);
  }
  console.log("replaced", done.length, "pairs:");
  console.log(done.sort().join(", "));
})().catch((e) => { console.error(e.message); process.exit(1); });
