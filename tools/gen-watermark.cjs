// Generate the download watermark: "FATANIME" in the site's brush font
// (Sukajan Brush Demo), white + soft shadow, slightly translucent, on a
// TRANSPARENT background (no bar). Outputs assets/watermark.png and example
// composites for review. Re-run: node tools/gen-watermark.cjs
const sharp = require("sharp");
const fs = require("fs");

const FONT_FILE = "assets/fonts/sukajan-brush.otf";
const FONT = "Sukajan Brush Demo 160"; // internal family name + size

function renderText(colorHex) {
  return sharp({
    text: { text: `<span foreground="${colorHex}">FATANIME</span>`, font: FONT, fontfile: FONT_FILE, rgba: true, dpi: 200 },
  }).png().toBuffer();
}

async function setOpacity(buf, factor) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4) data[i] = Math.round(data[i] * factor);
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

// text colour + soft dark shadow on transparent, scaled to ~0.74 opacity
async function buildWatermark(colorHex) {
  const text = await renderText(colorHex);
  const shadowSrc = await renderText("#000000");
  const m = await sharp(text).metadata();
  const pad = 32;
  const W = m.width + pad * 2, H = m.height + pad * 2;
  const shadow = await sharp(shadowSrc).blur(9).toBuffer();
  const wm = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: shadow, left: pad + 3, top: pad + 5 }, { input: text, left: pad, top: pad }])
    .png().toBuffer();
  return setOpacity(wm, 0.55);
}

// mirror finalize(): centred horizontally, raised ~6% off the bottom
async function composite(srcPath, wmBuf, outPath) {
  const img = sharp(srcPath);
  const { width, height } = await img.metadata();
  const targetW = Math.round(width * 0.44);
  const wmScaled = await sharp(wmBuf).resize({ width: targetW }).toBuffer();
  const wmM = await sharp(wmScaled).metadata();
  const left = Math.round((width - targetW) / 2);
  const top = height - wmM.height - Math.round(height * 0.06);
  await img.composite([{ input: wmScaled, left, top }]).jpeg({ quality: 90 }).toFile(outPath);
}

(async () => {
  const white = await buildWatermark("#ffffff");
  // store at 1000px wide — plenty for 1K/2K outputs, keeps the embedded base64 small
  const asset = await sharp(white).resize({ width: 1000 }).png().toBuffer();
  fs.writeFileSync("assets/watermark.png", asset); // the live asset (white)

  await composite("assets/presets/power-after.webp", asset, "watermark-example-1-white-bright.jpg");
  console.log("wrote assets/watermark.png + example in project root");
})().catch((e) => { console.error(e.message); process.exit(1); });
