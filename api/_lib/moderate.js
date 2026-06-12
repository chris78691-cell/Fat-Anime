// Basic profanity/spam filter for request submissions. v1: a normalized
// blocklist beats no filter; anything cleverer can land later without
// touching the endpoint.

// Unambiguous slurs/profanity — matched as substrings after normalization.
const BANNED_SUBSTRINGS = [
  "nigg", "fagg", "kike", "spic", "chink", "wetback", "tranny",
  "retard", "rape", "molest", "pedo", "paedo", "loli", "shota",
  "porn", "hentai", "nsfw", "nude", "naked",
];

// Short/ambiguous words — matched on word boundaries only.
const BANNED_WORDS = [
  "fuck", "shit", "cunt", "bitch", "whore", "slut", "dick", "cock",
  "pussy", "tits", "anal", "sex", "kys",
];

const LEET = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", "@": "a", $: "s", "!": "i" };

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[0134578@$!]/g, (c) => LEET[c] ?? c)
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ");
}

/** Returns null if OK, or a friendly rejection message. */
export function moderate(text) {
  if (/https?:\/\/|www\.|\.(com|net|org|gg|io|xyz)\b/i.test(text)) {
    return "no links — character names only!";
  }
  if (/(.)\1{7,}/.test(text)) {
    return "that's keyboard mashing, not a character 🤨";
  }
  const norm = normalize(text);
  if (BANNED_SUBSTRINGS.some((w) => norm.includes(w))) {
    return "keep it wholesome — this is a family buffet 😇";
  }
  const words = new Set(norm.split(" "));
  if (BANNED_WORDS.some((w) => words.has(w))) {
    return "keep it wholesome — this is a family buffet 😇";
  }
  return null;
}
