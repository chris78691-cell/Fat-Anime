// Split the thumbnail manifest into batch files with ABSOLUTE thumb paths,
// so vision agents read exact paths (no hand-typed hashes).
const fs = require("fs");
const path = require("path");
const manifest = JSON.parse(fs.readFileSync("tmp/thumbs/manifest.json", "utf8"));
const root = process.cwd();
const BATCH = 6;
let n = 0;
for (let i = 0; i < manifest.length; i += BATCH) {
  n++;
  const slice = manifest.slice(i, i + BATCH).map((m) => ({
    src: m.src,
    view: path.resolve(root, m.thumb),
  }));
  fs.writeFileSync(`tmp/thumbs/batch-${n}.json`, JSON.stringify(slice, null, 2));
}
console.log("wrote", n, "batch files for", manifest.length, "images");
