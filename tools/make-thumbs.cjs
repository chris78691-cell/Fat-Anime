// Generate small thumbnails of all candidate source images in the project root
// so vision agents can view them cheaply. Outputs to tmp/thumbs/<name>.webp
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const root = ".";
const outDir = "tmp/thumbs";
fs.mkdirSync(outDir, { recursive: true });

const exts = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const files = fs.readdirSync(root).filter((f) => {
  const ext = path.extname(f).toLowerCase();
  if (!exts.has(ext)) return false;
  // only root-level candidate frames: hf_*, photo_*, hash-named jpgs, aljal4
  return /^(hf_|photo_|aljal)/.test(f) || /^[0-9a-f]{16,}\./i.test(f);
});

(async () => {
  const manifest = [];
  for (const f of files.sort()) {
    const out = path.join(outDir, f.replace(/\.[^.]+$/, "") + ".webp");
    try {
      const meta = await sharp(f).metadata();
      await sharp(f).resize({ width: 360, height: 360, fit: "inside" }).webp({ quality: 72 }).toFile(out);
      manifest.push({ src: f, thumb: out, w: meta.width, h: meta.height });
    } catch (e) {
      console.log("FAIL", f, e.message);
    }
  }
  fs.writeFileSync("tmp/thumbs/manifest.json", JSON.stringify(manifest, null, 2));
  console.log("thumbnailed", manifest.length, "images");
  console.log(manifest.map((m) => m.src).join("\n"));
})().catch((e) => { console.error(e.message); process.exit(1); });
