// Generate the circular fat-Frieren favicon. The source (assets/favicon-src.png)
// is already a square framed on her face per the approved reference, so we just
// circular-mask it. Circular (transparent corners) so Google's round favicon
// slot shows no blank border. Re-run after changing the source: node tools/gen-favicon.cjs
const sharp = require("sharp");

const SRC = "assets/favicon-src.png"; // square already centred on her face

(async () => {
  const sizes = [32, 192];
  for (const size of sizes) {
    const base = await sharp(SRC).resize(size, size).ensureAlpha().toBuffer();
    const mask = Buffer.from(
      `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`
    );
    await sharp(base).composite([{ input: mask, blend: "dest-in" }]).png().toFile(`favicon-${size}.png`);
  }
  console.log("wrote favicon-32.png, favicon-192.png");
})().catch((e) => { console.error(e.message); process.exit(1); });
