// Apply gallery changes to data/presets.json:
//  - bump ?v=3 on the 18 replaced characters
//  - remove Satoru Gojo, insert Hiromi Higuruma in his slot (keeps JJK cluster + count)
const fs = require("fs");
const presets = JSON.parse(fs.readFileSync("data/presets.json", "utf8"));
const pairs = JSON.parse(fs.readFileSync("tmp/pairs2.json", "utf8"));
const updated = new Set(Object.keys(pairs));
const V = 3;

for (const p of presets) {
  if (updated.has(p.slug) && p.slug !== "higuruma") {
    p.before = `/assets/presets/${p.slug}-before.webp?v=${V}`;
    p.after  = `/assets/presets/${p.slug}-after.webp?v=${V}`;
  }
}

const higuruma = {
  slug: "higuruma",
  character: "Hiromi Higuruma",
  series: "Jujutsu Kaisen",
  punTitle: "",
  before: `/assets/presets/higuruma-before.webp?v=${V}`,
  after:  `/assets/presets/higuruma-after.webp?v=${V}`,
};

const gi = presets.findIndex((p) => p.slug === "gojo");
if (gi >= 0) presets.splice(gi, 1, higuruma); else presets.push(higuruma);

fs.writeFileSync("data/presets.json", JSON.stringify(presets, null, 2) + "\n");
const slugs = presets.map((p) => p.slug);
console.log("total characters:", presets.length);
console.log("gojo present?", slugs.includes("gojo"), "| higuruma present?", slugs.includes("higuruma"), "| yuji present?", slugs.includes("yuji"));
