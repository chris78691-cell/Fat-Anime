import sharp from "sharp";

import { GENERATION } from "./_config/generation.js";
import { WATERMARK_PNG_BASE64 } from "./_config/watermark.js";
import { geminiImageEdit, isAnimeImage } from "./_lib/gemini.js";
import { supabase } from "./_lib/supabase.js";
import { londonDayKey } from "./_lib/time.js";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const PFP_SIZE = 800;

// Friendly errors, brand voice. shape: { error, code, soldOut? }
const fail = (res, status, error, extra = {}) => res.status(status).json({ error, ...extra });

export default async function handler(req, res) {
  if (req.method !== "POST") return fail(res, 405, "POST only");

  // ---- parse + validate input (uploads are processed in memory only, never stored) ----
  const { image, mode = "full", userId } = req.body || {};
  if (typeof userId !== "string" || userId.length < 8 || userId.length > 64) {
    return fail(res, 400, "missing user id — refresh and try again");
  }
  if (mode !== "full" && mode !== "pfp") return fail(res, 400, "unknown mode");

  const match = typeof image === "string" && image.match(/^data:(image\/[a-z+]+);base64,(.+)$/s);
  if (!match) return fail(res, 400, "that upload didn't survive the trip. try again?");
  const [, mimeType, imageBase64] = match;
  if (!ALLOWED_MIME.has(mimeType)) return fail(res, 415, "jpg, png or webp only!");
  if (Buffer.byteLength(imageBase64, "base64") > MAX_UPLOAD_BYTES) {
    return fail(res, 413, "that image is too thicc already (10MB max)");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fail(res, 500, "kitchen's not wired up yet (no API key)");

  const day = londonDayKey();
  const db = supabase();

  // ---- anime pre-check BEFORE spending any slot ----
  if (GENERATION.PRECHECK) {
    try {
      const ok = await isAnimeImage({ apiKey, model: GENERATION.PRECHECK_MODEL, imageBase64, mimeType });
      if (!ok) return fail(res, 415, "anime images only! real people are off the menu 🙅", { code: "not_anime" });
    } catch (err) {
      console.warn("precheck failed open:", err.message); // don't block users on a flaky pre-check
    }
  }

  // ---- per-user limit (atomic increment, capped) ----
  const { data: userCount, error: userErr } = await db.rpc("take_user_slot", {
    p_day: day, p_user: userId, p_max: GENERATION.PER_USER_LIMIT,
  });
  if (userErr) {
    console.error("take_user_slot:", userErr);
    return fail(res, 500, "counter hiccup. try again in a sec.");
  }
  if (userCount === -1) {
    return fail(res, 429, `you've had your ${GENERATION.PER_USER_LIMIT} fattenings today, glutton 😤 come back tomorrow`, { code: "user_limit" });
  }

  // ---- global daily slot (atomic decrement via RPC — two requests can't share the last slot) ----
  const { data: remaining, error: slotErr } = await db.rpc("take_slot", {
    p_day: day, p_limit: GENERATION.DAILY_LIMIT,
  });
  if (slotErr) {
    console.error("take_slot:", slotErr);
    await refundUser(db, day, userId);
    return fail(res, 500, "counter hiccup. try again in a sec.");
  }
  if (remaining === -1) {
    await refundUser(db, day, userId);
    return fail(res, 410, "all 50 fattenings eaten today 🍔", { soldOut: true });
  }

  // ---- the fattening ----
  try {
    const out = await geminiImageEdit({
      apiKey,
      model: GENERATION.MODEL,
      prompt: GENERATION.MASTER_PROMPT,
      imageBase64,
      mimeType,
      imageSize: GENERATION.IMAGE_SIZE,
    });

    const finalJpeg = await finalize(Buffer.from(out.data, "base64"), mode);
    return res.status(200).json({
      image: `data:image/jpeg;base64,${finalJpeg.toString("base64")}`,
      remaining,
    });
  } catch (err) {
    // refund both counters — a failed fattening costs nobody anything
    console.error("generate:", err);
    await Promise.allSettled([
      db.rpc("refund_slot", { p_day: day, p_limit: GENERATION.DAILY_LIMIT }),
      refundUser(db, day, userId),
    ]);
    return fail(res, 502, "the kitchen choked 🔥 your slot was refunded — try again!", { code: "gen_failed" });
  }
}

async function refundUser(db, day, userId) {
  const { error } = await db.rpc("refund_user_slot", { p_day: day, p_user: userId });
  if (error) console.error("refund_user_slot:", error);
}

/** PFP crop (1:1, avatar-sized) + brand watermark bar, output JPEG. */
async function finalize(buf, mode) {
  let pipeline = sharp(buf);
  if (mode === "pfp") {
    pipeline = pipeline.resize(PFP_SIZE, PFP_SIZE, { fit: "cover", position: "attention" });
  }
  let working = await pipeline.toBuffer();

  if (GENERATION.WATERMARK) {
    const { width, height } = await sharp(working).metadata();
    // bar is 1600x120 → scale to image width, sits flush on the bottom edge
    const barH = Math.max(28, Math.round((width * 120) / 1600));
    const bar = await sharp(Buffer.from(WATERMARK_PNG_BASE64, "base64"))
      .resize(width, barH)
      .png()
      .toBuffer();
    working = await sharp(working)
      .composite([{ input: bar, top: height - barH, left: 0 }])
      .toBuffer();
  }

  return sharp(working).jpeg({ quality: 90 }).toBuffer();
}
