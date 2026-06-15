// Dev-only: turn the huge source key-visual into web assets.
const sharp = require("sharp");
const fs = require("fs");
const src = process.argv[2];
const kb = (f) => Math.round(fs.statSync(f).size / 1024);
(async () => {
  const m = await sharp(src).metadata();
  console.log("source", m.width + "x" + m.height, Math.round(fs.statSync(src).size / 1048576) + "MB");
  // crisp version for the intro splash
  await sharp(src).resize({ width: 1100 }).webp({ quality: 82 }).toFile("assets/hero-art.webp");
  // pre-blurred, smaller version for the darkened backdrop (no runtime blur cost)
  await sharp(src).resize({ width: 780 }).blur(18).webp({ quality: 66 }).toFile("assets/hero-art-blur.webp");
  console.log("hero-art.webp", kb("assets/hero-art.webp") + "KB");
  console.log("hero-art-blur.webp", kb("assets/hero-art-blur.webp") + "KB");
})().catch((e) => { console.error(e.message); process.exit(1); });
