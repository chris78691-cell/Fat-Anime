/* FAT ANIME — generator tab: upload, fatten, share. */

import { shareImage, downloadImage, toast, fetchSlots, getPresets, openDetail } from "/js/app.js";

const $ = (sel) => document.querySelector(sel);

const CAPTIONS = [
  "feeding…",
  "extra portions…",
  "loosening the belt…",
  "unlocking the second stomach…",
  "carbo-loading…",
  "negotiating with the buffet…",
  "reinforcing the chair…",
  "dessert (mandatory)…",
  "one more bite…",
];

/* Append ?mock=1 to the URL to demo the full flow without the API
   (returns your own upload after a fake wait). Dev-only nicety. */
const MOCK = new URLSearchParams(location.search).has("mock");

let mode = "full";
let uploadDataUrl = null;
let resultDataUrl = null;
let soldOut = false;
let resetsAt = null;
let pollTimer = null;
let countdownTimer = null;

/* ---------------- visitor id (for the per-day limit) ---------------- */

function userId() {
  let id = localStorage.getItem("fatanime-uid");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("fatanime-uid", id);
  }
  return id;
}

/* ---------------- mode toggle ---------------- */

const HINTS = {
  full: "fattens the whole picture, as-is",
  pfp: "square-cropped for TikTok / Insta / Discord / X avatars",
};

function initModes() {
  document.querySelectorAll(".mode").forEach((b) => {
    b.addEventListener("click", () => {
      mode = b.dataset.mode;
      document.querySelectorAll(".mode").forEach((x) => {
        x.classList.toggle("active", x === b);
        x.setAttribute("aria-selected", x === b);
      });
      $("#mode-hint").textContent = HINTS[mode];
    });
  });
}

/* ---------------- upload + client-side downscale ---------------- */

function initUpload() {
  const input = $("#file-input");
  $("#dropzone").addEventListener("click", () => input.click());
  $("#btn-clear").addEventListener("click", clearUpload);

  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return toast("jpg, png or webp only!");
    }
    if (file.size > 10 * 1024 * 1024) return toast("too thicc already — 10MB max");

    uploadDataUrl = await downscale(file, 1024);
    $("#upload-preview").src = uploadDataUrl;
    $("#preview-wrap").hidden = false;
    $("#dropzone").hidden = true;
    $("#btn-generate").disabled = false;
  });
}

function clearUpload() {
  uploadDataUrl = null;
  $("#file-input").value = "";
  $("#preview-wrap").hidden = true;
  $("#dropzone").hidden = false;
  $("#btn-generate").disabled = true;
}

/** Resize to maxSide on canvas → jpeg data URL. Keeps requests small and fast. */
function downscale(file, maxSide) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad image")); };
    img.src = url;
  });
}

/* ---------------- the loading experience ---------------- */

let captionTimer = null;

function showLoading() {
  $("#loading").hidden = false;
  document.body.style.overflow = "hidden";
  let i = 0;
  $("#loading-caption").textContent = CAPTIONS[0];
  captionTimer = setInterval(() => {
    i = (i + 1) % CAPTIONS.length;
    $("#loading-caption").textContent = CAPTIONS[i];
  }, 2400);
}

function hideLoading() {
  $("#loading").hidden = true;
  document.body.style.overflow = "";
  clearInterval(captionTimer);
}

/* ---------------- generate ---------------- */

function initGenerate() {
  $("#btn-generate").addEventListener("click", async () => {
    if (!uploadDataUrl) return;
    $("#btn-generate").disabled = true;
    showLoading();
    try {
      const data = await callGenerate();
      resultDataUrl = data.image;
      $("#result-img").src = resultDataUrl;
      $("#gen-main").hidden = true;
      $("#gen-result").hidden = false;
      if (typeof data.remaining === "number") setRemaining(data.remaining);
      if (navigator.vibrate) navigator.vibrate([20, 40, 60]);
    } catch (err) {
      if (err.soldOut) {
        toast(err.message);
        await refreshSlots();
      } else {
        toast(err.message || "something broke. the site ate too much. try again.");
      }
    } finally {
      hideLoading();
      $("#btn-generate").disabled = !uploadDataUrl;
    }
  });

  $("#result-share").addEventListener("click", () => shareImage(resultDataUrl, "I got FATTENED 💀"));
  $("#result-download").addEventListener("click", () => downloadImage(resultDataUrl, "fatanime-me.jpg"));
  $("#result-again").addEventListener("click", () => {
    $("#gen-result").hidden = true;
    $("#gen-main").hidden = false;
    clearUpload();
  });
}

async function callGenerate() {
  if (MOCK) {
    await new Promise((r) => setTimeout(r, 6000));
    return { image: uploadDataUrl, remaining: 36 };
  }
  let res;
  try {
    res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: uploadDataUrl, mode, userId: userId() }),
    });
  } catch {
    throw new Error("network said no. check your signal and retry!");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "the kitchen choked 🔥 try again!");
    err.soldOut = Boolean(data.soldOut);
    throw err;
  }
  return data;
}

/* ---------------- slots, sold-out state, countdown ---------------- */

function setRemaining(remaining) {
  $("#slots-num-gen").textContent = remaining;
  const home = $("#slots-num-home");
  if (home) home.textContent = remaining;
  const wasSoldOut = soldOut;
  soldOut = remaining <= 0;
  if (soldOut !== wasSoldOut || soldOut) renderSoldOut();
}

function renderSoldOut() {
  $("#gen-soldout").hidden = !soldOut;
  $("#gen-main").hidden = soldOut || !$("#gen-result").hidden;
  if (!soldOut) { clearInterval(countdownTimer); return; }

  $("#gen-result").hidden = true;

  // countdown to UK midnight
  clearInterval(countdownTimer);
  const tick = () => {
    if (!resetsAt) return;
    let ms = new Date(resetsAt) - Date.now();
    if (ms <= 0) { refreshSlots(); return; }
    const h = String(Math.floor(ms / 3600000)).padStart(2, "0");
    const m = String(Math.floor(ms / 60000) % 60).padStart(2, "0");
    const s = String(Math.floor(ms / 1000) % 60).padStart(2, "0");
    $("#countdown").textContent = `${h}:${m}:${s}`;
  };
  tick();
  countdownTimer = setInterval(tick, 1000);

  // a snack row of presets so it's never a dead end
  const grid = $("#soldout-grid");
  if (!grid.childElementCount) {
    getPresets().slice(0, 4).forEach((p) => {
      const card = document.createElement("button");
      card.className = "card sticker pop";
      card.innerHTML = `
        <img class="thumb" src="${p.after}" alt="fat ${p.character}" loading="lazy" decoding="async">
        <div class="label">${p.punTitle || p.character}</div>`;
      card.addEventListener("click", () => openDetail(p));
      grid.appendChild(card);
    });
  }
}

async function refreshSlots() {
  const data = await fetchSlots();
  if (!data) return; // API not reachable — leave defaults, don't block the UI
  resetsAt = data.resetsAt;
  $("#slots-limit-gen").textContent = data.limit;
  setRemaining(data.remaining);
}

function initPolling() {
  // poll cheaply: on tab entry + every 30s while the generator tab is visible
  document.addEventListener("tabchange", (e) => {
    clearInterval(pollTimer);
    if (e.detail === "generate") {
      refreshSlots();
      pollTimer = setInterval(refreshSlots, 30000);
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshSlots();
  });
}

/* ---------------- notify-me capture ---------------- */

function initNotify() {
  $("#notify-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("#notify-email").value;
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      $("#notify-email").value = "";
      toast("locked in. we'll yell when it's feeding time 📣");
    } catch (err) {
      toast(err.message || "couldn't save that — try again");
    }
  });
}

/* ---------------- boot ---------------- */

initModes();
initUpload();
initGenerate();
initPolling();
initNotify();
