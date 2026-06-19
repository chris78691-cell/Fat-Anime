// Generate /sitemap.xml.
//
// Fat Anime is a single-page app: the gallery, videos, fatten and requests
// views are client-side tabs rendered within "/", not separate URLs. So the
// only crawlable page is the homepage. The gallery is built dynamically from
// data/presets.json, but those characters live inside "/" (no per-character
// URL), so they do not add sitemap entries.
//
// If real routes are ever added (e.g. /c/<slug> pages that resolve on their
// own), add them to ROUTES below and re-run:  node tools/gen-sitemap.cjs [YYYY-MM-DD]
const fs = require("fs");

const BASE = "https://fatanime.io";
const lastmod = process.argv[2] || new Date().toISOString().slice(0, 10);

const ROUTES = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
];

const body = ROUTES.map((r) => `  <url>
    <loc>${BASE}${r.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`).join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

fs.writeFileSync("sitemap.xml", xml);
console.log(`wrote sitemap.xml with ${ROUTES.length} url(s), lastmod ${lastmod}`);
