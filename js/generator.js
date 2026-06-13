/* FAT ANIME — generator tab: upload, fatten, share. */

import { shareImage, downloadImage, toast, fetchSlots, getPresets, openDetail } from "/js/app.js";
import { t, onLangChange } from "/js/i18n.js";

const $ = (sel) => document.querySelector(sel);

// loading caption keys (resolved through i18n at display time)
const CAPTION_KEYS = [
  "cap_feeding", "cap_portions", "cap_belt", "cap_stomach", "cap_carbo",
  "cap_buffet", "cap_chair", "cap_dessert", "cap_onemore",
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

const hintKey = () => (mode === "pfp" ? "hint_pfp" : "hint_full");

function initModes() {
  document.querySelectorAll(".mode").forEach((b) => {
    b.addEventListener("click", () => {
      mode = b.dataset.mode;
      document.querySelectorAll(".mode").forEach((x) => {
        x.classList.toggle("active", x === b);
        x.setAttribute("aria-selected", x === b);
      });
      $("#mode-hint").textContent = t(hintKey());
    });
  });
  // keep the hint correct after a language switch
  onLangChange(() => { $("#mode-hint").textContent = t(hintKey()); });
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
      return toast(t("toast_filetype"));
    }
    if (file.size > 10 * 1024 * 1024) return toast(t("toast_toobig"));

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

/* ---------------- the loading experience ----------------
   A slideshow of random presets inflating + a striped progress
   bar that fills asymptotically (the real clock is Google's). */

let captionTimer = null;
let slideTimer = null;
let barTimer = null;

function showLoading() {
  $("#loading").hidden = false;
  document.body.style.overflow = "hidden";

  // rotating captions
  let i = 0;
  $("#loading-caption").textContent = t(CAPTION_KEYS[0]);
  captionTimer = setInterval(() => {
    i = (i + 1) % CAPTION_KEYS.length;
    $("#loading-caption").textContent = t(CAPTION_KEYS[i]);
  }, 2400);

  // shuffled preset slideshow: before beat → inflate → next
  const pool = [...getPresets()].sort(() => Math.random() - 0.5);
  const stage = $("#load-stage");
  let n = 0;
  const showNext = () => {
    const p = pool[n % pool.length];
    n++;
    stage.classList.remove("fat");
    $("#load-before").src = p.before;
    $("#load-after").src = p.after;
    slideTimer = setTimeout(() => {
      stage.classList.add("fat");
      slideTimer = setTimeout(showNext, 1900);
    }, 1100);
  };
  if (pool.length) showNext();

  // fake-but-honest progress: quick start, then crawls toward ~94%
  const fill = $("#loadbar-fill");
  fill.style.width = "0%";
  const start = Date.now();
  barTimer = setInterval(() => {
    const elapsed = (Date.now() - start) / 1000;
    fill.style.width = `${(94 * (1 - Math.exp(-elapsed / 22))).toFixed(1)}%`;
  }, 300);
}

function hideLoading(success) {
  clearInterval(captionTimer);
  clearTimeout(slideTimer);
  clearInterval(barTimer);
  const close = () => {
    $("#loading").hidden = true;
    document.body.style.overflow = "";
  };
  if (success) {
    // let the bar visibly hit 100 before the result pops in
    $("#loadbar-fill").style.width = "100%";
    setTimeout(close, 350);
  } else {
    close();
  }
}

/* ---------------- generate ---------------- */

function initGenerate() {
  $("#btn-generate").addEventListener("click", async () => {
    if (!uploadDataUrl) return;
    $("#btn-generate").disabled = true;
    showLoading();
    let ok = false;
    try {
      const data = await callGenerate();
      resultDataUrl = data.image;
      $("#result-img").src = resultDataUrl;
      $("#gen-main").hidden = true;
      $("#gen-result").hidden = false;
      if (typeof data.remaining === "number") setRemaining(data.remaining);
      if (navigator.vibrate) navigator.vibrate([20, 40, 60]);
      ok = true;
    } catch (err) {
      if (err.soldOut) {
        toast(err.message);
        await refreshSlots();
      } else {
        toast(err.message || t("toast_generic_fail"));
      }
    } finally {
      hideLoading(ok);
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
    throw new Error(t("net_fail"));
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || t("kitchen_choked"));
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
      toast(t("toast_notify_ok"));
    } catch (err) {
      toast(err.message || t("toast_notify_fail"));
    }
  });
}

/* ---------------- boot ---------------- */

initModes();
initUpload();
initGenerate();
initPolling();
initNotify();
