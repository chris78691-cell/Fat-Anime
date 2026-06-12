// ============================================================
// FAT ANIME — generation config. Tune everything here.
// ============================================================

export const GENERATION = {
  // Gemini
  MODEL: "gemini-3-pro-image-preview",
  IMAGE_SIZE: "1K", // "1K" | "2K" — never 4K

  // Limits
  DAILY_LIMIT: 50, // global fattenings per day (resets midnight Europe/London)
  PER_USER_LIMIT: 2, // per visitor per day

  // Watermark bar composited into the bottom of every generated image.
  // Single flag: flip to false to ship clean outputs.
  WATERMARK: true,

  // Cheap Gemini pre-check that refuses photos of real people.
  PRECHECK: true,
  PRECHECK_MODEL: "gemini-2.5-flash",

  // ──────────────────────────────────────────────────────────
  // MASTER FATTENING PROMPT
  // TODO(owner): replace with the tested prompt — this placeholder
  // keeps the pipeline working until the real one is pasted in.
  // ──────────────────────────────────────────────────────────
  MASTER_PROMPT: [
    "Redraw the character in this exact image as comically, charmingly fat:",
    "a hugely round belly, chubby cheeks, thick arms and soft hands.",
    "Keep EVERYTHING else identical — same art style, same line work and",
    "colors, same pose and composition, same background, same outfit (now",
    "straining and stretched at the seams), same expression, same identity.",
    "The result must read as the same artwork, just inflated. Cute and",
    "funny, never grotesque, never mean.",
  ].join(" "),
};
