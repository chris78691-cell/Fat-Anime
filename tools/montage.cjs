// Build review contact sheets: each row = [slug label] [before | after] from the
// freshly generated gallery webps, so the pairs can be eyeballed before commit.
const fs = require("fs");
const sharp = require("sharp");
const pairs = JSON.parse(fs.readFileSync("tmp/pairs2.json", "utf8"));
const slugs = Object.keys(pairs).sort();

const TH = 220, GAP = 12, LBL = 30, W = TH * 2 + GAP, ROW = LBL + TH;
const bg = { r: 18, g: 17, b: 28 };

async function tile(path) {
  const img = await sharp(path).resize(TH, TH, { fit: "inside" }).toBuffer();
  return sharp({ create: { width: TH, height: TH, channels: 3, background: { r: 8, g: 7, b: 14 } } })
    .composite([{ input: img, gravity: "center" }]).png().toBuffer();
}
function label(text) {
  const svg = `<svg width="${W}" height="${LBL}" xmlns="http://www.w3.org/2000/svg"><rect width="${W}" height="${LBL}" fill="#2a2740"/><text x="8" y="20" fill="#ffd0e0" font-size="15" font-family="sans-serif" font-weight="bold">${text}</text><text x="${TH/2-20}" y="20" fill="#9aa" font-size="12" font-family="sans-serif">BEFORE</text><text x="${TH+GAP+TH/2-18}" y="20" fill="#9aa" font-size="12" font-family="sans-serif">AFTER</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

(async () => {
  const PER = 5;
  let sheet = 0;
  for (let i = 0; i < slugs.length; i += PER) {
    sheet++;
    const chunk = slugs.slice(i, i + PER);
    const H = chunk.length * ROW;
    const comp = [];
    for (let r = 0; r < chunk.length; r++) {
      const slug = chunk[r];
      comp.push({ input: await label(`${slug}`), top: r * ROW, left: 0 });
      comp.push({ input: await tile(`assets/presets/${slug}-before.webp`), top: r * ROW + LBL, left: 0 });
      comp.push({ input: await tile(`assets/presets/${slug}-after.webp`), top: r * ROW + LBL, left: TH + GAP });
    }
    await sharp({ create: { width: W, height: H, channels: 3, background: bg } })
      .composite(comp).png().toFile(`tmp/montage-${sheet}.png`);
  }
  console.log("wrote", sheet, "montage sheets");
})().catch((e) => { console.error(e.message); process.exit(1); });
