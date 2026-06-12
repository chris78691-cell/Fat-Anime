# FAT ANIME — deploy notes

## One-time setup

1. **Supabase**: open the SQL editor, paste and run [`sql/schema.sql`](../sql/schema.sql).
   Tables get RLS enabled with no policies — only the service key (used by the
   serverless functions) can touch them.

2. **Vercel project** (import the repo, no build step needed):
   - Framework preset: **Other** (static + `/api` functions)
   - Environment variables:
     | Name | Notes |
     |---|---|
     | `GEMINI_API_KEY` | Google AI Studio key |
     | `SUPABASE_URL` | project URL |
     | `SUPABASE_SERVICE_KEY` | service role key — **server-side only** |
   - `SUPABASE_ANON_KEY` is not needed (no client-side Supabase).

3. **Function duration**: `vercel.json` sets `api/generate.js` to 60s. Gemini
   image edits run 15–60s, so enable **Fluid Compute** on the project (Settings
   → Functions) and you can raise `maxDuration` to 120 for slow generations.

4. **Domain / OG tags**: when the final domain exists, search & replace
   `https://fatanime.vercel.app` in `index.html` (OG/twitter meta).

## Tuning

Everything lives in [`api/_config/generation.js`](../api/_config/generation.js):
master prompt (**replace the placeholder!**), daily limit (50), per-user limit
(2), watermark on/off, image size (1K/2K), anime pre-check on/off.

It deliberately sits inside `api/` (underscore-prefixed) so Vercel never serves
it as a static file — the master prompt stays private.

## Watermark

`api/_config/watermark.js` is generated from `assets/watermark.png` (1600×120
bar, Titan One). To restyle it, regenerate both with Pillow:

```python
from PIL import Image, ImageDraw, ImageFont
import base64
W, H = 1600, 120
img = Image.new('RGBA', (W, H), (26, 26, 26, 242))
d = ImageDraw.Draw(img)
font = ImageFont.truetype('assets/raw/fonts/TitanOne-Regular.ttf', 66)
fat, anime, gap = 'FAT', 'ANIME', 18
w_fat = d.textlength(fat, font=font)
x = (W - (w_fat + gap + d.textlength(anime, font=font))) / 2
d.text((x, 19), fat, font=font, fill='#FF3E6C', stroke_width=3, stroke_fill='#FFF6E9')
d.text((x + w_fat + gap, 19), anime, font=font, fill='#FFF6E9')
img.save('assets/watermark.png', 'PNG', optimize=True)
b64 = base64.b64encode(open('assets/watermark.png','rb').read()).decode()
open('api/_config/watermark.js','w').write(
  '// Generated brand bar composited into generated images (see assets/watermark.png).\n'
  '// Regenerate via the snippet in docs/DEPLOY.md if the brand changes.\n'
  'export const WATERMARK_PNG_BASE64 =\n  %r;\n' % b64)
```

## Local demo

`python -m http.server 8123` serves the static site (API routes 404 and the UI
degrades gracefully). Add `?mock=1` to the URL to walk the full generator flow
without keys — it fakes a 6s generation and echoes your upload back.
For real local functions: `npx vercel dev` with a `.env` file.
