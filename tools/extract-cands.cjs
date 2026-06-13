// Dev-only: pull the candidate SVGs out of the workflow output JSON.
const fs = require("fs");
const out = process.argv[2];
const data = JSON.parse(fs.readFileSync(out, "utf8"));
const ranked = data.result.ranked;
fs.mkdirSync("tmp", { recursive: true });
ranked.forEach((r, i) => {
  const f = `tmp/cand-${i + 1}.svg`;
  fs.writeFileSync(f, r.svg);
  console.log(`${f}  score=${r.score}  ${r.style.slice(0, 40)}`);
});
