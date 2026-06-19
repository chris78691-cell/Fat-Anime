// Convert matched before/after source frames (tmp/pairs2.json) into gallery webps.
const fs = require("fs");
const sharp = require("sharp");
const pairs = JSON.parse(fs.readFileSync("tmp/pairs2.json", "utf8"));

(async () => {
  const done = [];
  for (const [slug, m] of Object.entries(pairs)) {
    await sharp(m.before).resize({ width: 800, height: 800, fit: "inside" }).webp({ quality: 82 }).toFile(`assets/presets/${slug}-before.webp`);
    await sharp(m.after).resize({ width: 800, height: 800, fit: "inside" }).webp({ quality: 82 }).toFile(`assets/presets/${slug}-after.webp`);
    done.push(slug);
  }
  console.log("wrote", done.length, "pairs:", done.sort().join(", "));
})().catch((e) => { console.error(e.message); process.exit(1); });
