// Europe/London day handling — the slot counter resets at UK midnight.

export function londonDayKey(d = new Date()) {
  // en-CA → YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(d);
}

function londonOffsetMs(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/London",
    timeZoneName: "longOffset",
  }).formatToParts(date);
  const tz = parts.find((p) => p.type === "timeZoneName").value; // "GMT", "GMT+1", "GMT+01:00"
  const m = tz.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);
  if (!m) return 0;
  const sign = m[1].startsWith("-") ? -1 : 1;
  return sign * (Math.abs(parseInt(m[1], 10)) * 60 + (m[2] ? parseInt(m[2], 10) : 0)) * 60000;
}

export function nextLondonMidnight(d = new Date()) {
  const [y, m, day] = londonDayKey(d).split("-").map(Number);
  // Guess next midnight as UTC, then correct by the offset at that instant
  // (re-checked once so a DST flip on the boundary still lands exactly).
  let t = Date.UTC(y, m - 1, day + 1) - londonOffsetMs(d);
  t = Date.UTC(y, m - 1, day + 1) - londonOffsetMs(new Date(t));
  return new Date(t);
}
