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
  // MASTER FATTENING PROMPT (owner-tested — edit only here)
  // ──────────────────────────────────────────────────────────
  MASTER_PROMPT:
    "Keep the art style, colours, background and pose identical — only make the character extremely fat with a chubby face.",
};
