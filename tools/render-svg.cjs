// Dev-only: rasterize an SVG to PNG so it can be eyeballed.
// usage: node tools/render-svg.cjs <in.svg> <out.png> [width]
const sharp = require("sharp");
const [, , inp, outp, w] = process.argv;
sharp(inp, { density: 220 })
  .resize(parseInt(w || "620", 10))
  .png()
  .toFile(outp)
  .then((info) => console.log(`ok ${outp} ${info.width}x${info.height}`))
  .catch((e) => { console.error("ERR", e.message); process.exit(1); });
