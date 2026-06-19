// Generate the circular fat-Frieren favicon from the gallery image.
// Circular (transparent corners) so Google's round favicon slot shows no
// blank border. Re-run after changing the source: node tools/gen-favicon.cjs
const sharp = require("sharp");

const SRC = "assets/presets/frieren-after.webp"; // fat Frieren (gallery "after")
const CROP = { left: 180, top: 20, width: 420, height: 420 }; // square framed on her face

(async () => {
  const sizes = [32, 192];
  for (const size of sizes) {
    const base = await sharp(SRC).extract(CROP).resize(size, size).ensureAlpha().toBuffer();
    const mask = Buffer.from(
      `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`
    );
    await sharp(base).composite([{ input: mask, blend: "dest-in" }]).png().toFile(`favicon-${size}.png`);
  }
  console.log("wrote favicon-32.png, favicon-192.png");
})().catch((e) => { console.error(e.message); process.exit(1); });
