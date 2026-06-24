// Compress source videos to web-friendly mp4 + generate a poster jpg, matching
// the existing assets/videos/* sizes. Uses the bundled ffmpeg-static binary.
// Edit JOBS and run:  node tools/proc-videos.cjs
const { execFileSync } = require("child_process");
const fs = require("fs");
const ffmpeg = require("ffmpeg-static");

const JOBS = [
  { src: "One Feast.mp4", slug: "one-feast" },
  { src: "America Ghoul.mp4", slug: "america-ghoul" },
  { src: "Jujutsu calories.mp4", slug: "jujutsu-calories" },
  { src: "Naruto.mp4", slug: "naruto" },
];

// cap the longer side at 1280 (keeps portrait TikTok clips at 720x1280), keep aspect
const SCALE = "scale='if(gte(iw,ih),min(1280,iw),-2)':'if(gte(iw,ih),-2,min(1280,ih))'";
const run = (args) => execFileSync(ffmpeg, ["-y", "-loglevel", "error", ...args], { stdio: ["ignore", "ignore", "inherit"] });

for (const j of JOBS) {
  if (!fs.existsSync(j.src)) { console.log("SKIP (missing):", j.src); continue; }
  const mp4 = `assets/videos/${j.slug}.mp4`;
  const jpg = `assets/videos/${j.slug}.jpg`;
  run(["-i", j.src, "-vf", SCALE, "-c:v", "libx264", "-crf", "28", "-preset", "medium",
       "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-c:a", "aac", "-b:a", "96k", mp4]);
  run(["-ss", "0.5", "-i", j.src, "-vframes", "1", "-vf", SCALE, "-q:v", "4", jpg]);
  const mb = (p) => (fs.statSync(p).size / 1048576).toFixed(1);
  console.log(`done ${j.slug}: ${mb(mp4)}MB mp4, ${mb(jpg)}MB poster`);
}
console.log("all videos processed");
