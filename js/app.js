/* FAT ANIME — gallery, tabs, reveal. No framework, one API call later. */

const $ = (sel) => document.querySelector(sel);
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

let presets = [];

/* ---------------- data ---------------- */

async function loadPresets() {
  const res = await fetch("/data/presets.json");
  presets = await res.json();
}

/* ---------------- tabs ---------------- */

const views = { gallery: "#view-gallery", generate: "#view-generate", requests: "#view-requests" };

function switchTab(name) {
  for (const [tab, sel] of Object.entries(views)) $(sel).hidden = tab !== name;
  document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  window.scrollTo({ top: 0 });
  document.dispatchEvent(new CustomEvent("tabchange", { detail: name }));
}

function initTabs() {
  document.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => switchTab(b.dataset.tab)));
  document.querySelectorAll("[data-goto]").forEach((b) => b.addEventListener("click", () => switchTab(b.dataset.goto)));
}

/* ---------------- hero: daily preset, auto inflate loop ---------------- */

function initHero() {
  const slug = window.__heroSlug || presets[0].slug;
  const p = presets.find((x) => x.slug === slug) || presets[0];
  $("#hero-before").src = p.before;
  $("#hero-after").src = p.after;
  $("#hero-tag").textContent = p.character;
  const hero = $("#hero");
  hero.addEventListener("click", () => openDetail(p));

  if (reducedMotion) { hero.classList.add("fat"); return; }
  // before: quick beat, after: lingers — self-rescheduling so the holds differ
  let fat = false;
  (function flip(delay) {
    setTimeout(() => {
      fat = !fat;
      hero.classList.toggle("fat", fat);
      flip(fat ? 2800 : 1500);
    }, delay);
  })(1400);
}

/* ---------------- chips + grid ---------------- */

let activeSeries = "All";

function seriesList() {
  const counts = new Map();
  for (const p of presets) counts.set(p.series, (counts.get(p.series) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);
}

function renderChips() {
  const wrap = $("#chips");
  wrap.innerHTML = "";
  for (const s of ["All", ...seriesList()]) {
    const b = document.createElement("button");
    b.className = "chip" + (s === activeSeries ? " active" : "");
    b.textContent = s;
    b.addEventListener("click", () => {
      activeSeries = s;
      renderChips();
      renderGrid();
    });
    wrap.appendChild(b);
  }
}

function renderGrid() {
  const grid = $("#grid");
  grid.innerHTML = "";
  const order = seriesList();
  const list = (activeSeries === "All"
    ? [...presets].sort((a, b) => order.indexOf(a.series) - order.indexOf(b.series))
    : presets.filter((p) => p.series === activeSeries));
  list.forEach((p, i) => {
    const card = document.createElement("button");
    card.className = "card sticker pop";
    card.style.animationDelay = `${Math.min(i * 25, 400)}ms`;
    const eager = i < 4 ? 'fetchpriority="auto"' : 'loading="lazy"';
    card.innerHTML = `
      <img class="thumb" src="${p.after}" alt="fat ${p.character}" ${eager} decoding="async">
      <div class="label">${p.punTitle || p.character}</div>`;
    card.addEventListener("click", () => openDetail(p));
    grid.appendChild(card);
  });
}

/* ---------------- detail modal + the inflate reveal ---------------- */

let current = null;

function openDetail(p) {
  current = p;
  $("#stage-before").src = p.before;
  $("#stage-after").src = p.after;
  $("#detail-name").textContent = p.punTitle || p.character;
  $("#detail-series").textContent = p.series;
  $("#stage").classList.remove("fat");
  $("#tap-hint").hidden = false;
  $("#tap-hint").textContent = "TAP TO FATTEN 👆";
  $("#modal").hidden = false;
  document.body.style.overflow = "hidden";
}

function closeDetail() {
  $("#modal").hidden = true;
  document.body.style.overflow = "";
  const sheet = $("#sheet");
  sheet.style.transform = "";
  sheet.style.opacity = "";
}

function initModal() {
  const stage = $("#stage");
  stage.addEventListener("click", () => {
    const fat = stage.classList.toggle("fat");
    const hint = $("#tap-hint");
    if (fat) {
      hint.hidden = true;
      if (navigator.vibrate) navigator.vibrate(30);
    } else {
      hint.hidden = false;
      hint.textContent = "TAP TO RE-FATTEN 👆";
    }
  });

  $("#modal-close").addEventListener("click", closeDetail);
  $("#modal").addEventListener("click", (e) => { if (e.target === $("#modal")) closeDetail(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDetail(); });

  // swipe down to dismiss
  const sheet = $("#sheet");
  let startY = null;
  sheet.addEventListener("touchstart", (e) => { if (sheet.scrollTop <= 0) startY = e.touches[0].clientY; }, { passive: true });
  sheet.addEventListener("touchmove", (e) => {
    if (startY === null) return;
    const dy = e.touches[0].clientY - startY;
    if (dy > 0) {
      sheet.style.transform = `translateY(${dy * 0.6}px)`;
      sheet.style.opacity = `${1 - dy / 600}`;
    }
  }, { passive: true });
  sheet.addEventListener("touchend", (e) => {
    if (startY === null) return;
    const dy = e.changedTouches[0].clientY - startY;
    startY = null;
    if (dy > 120) closeDetail();
    else { sheet.style.transform = ""; sheet.style.opacity = ""; }
  });

  $("#btn-share").addEventListener("click", () => shareImage(current.after, `${current.character} got FATTENED 💀`));
  $("#btn-download").addEventListener("click", () => downloadImage(current.after, `fat-${current.slug}.webp`));
}

/* ---------------- share / download / toast ---------------- */

export async function shareImage(url, text) {
  try {
    const blob = await (await fetch(url)).blob();
    const file = new File([blob], url.split("/").pop(), { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "FAT ANIME", text: `${text} — fatanime` });
      return;
    }
  } catch (err) {
    if (err.name === "AbortError") return; // user closed the share sheet, all good
  }
  // desktop / unsupported: download instead
  downloadImage(url, url.split("/").pop());
  toast("saved! now go post it 📮");
}

export function downloadImage(url, name) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

let toastTimer = null;

export function toast(msg) {
  document.querySelector(".toast")?.remove();
  clearTimeout(toastTimer);
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  toastTimer = setTimeout(() => t.remove(), 2600);
}

/* ---------------- live slots counter ---------------- */

export async function fetchSlots() {
  try {
    const res = await fetch("/api/slots");
    if (!res.ok) throw new Error(res.status);
    const { remaining, limit, resetsAt } = await res.json();
    document.dispatchEvent(new CustomEvent("slots", { detail: { remaining, limit, resetsAt } }));
    $("#slots-num-home").textContent = remaining;
    return { remaining, limit, resetsAt };
  } catch {
    return null; // API not deployed yet / offline — pill keeps its default copy
  }
}

/* ---------------- boot ---------------- */

(async function boot() {
  initTabs();
  await loadPresets();
  initHero();
  renderChips();
  renderGrid();
  initModal();
  fetchSlots();
  document.addEventListener("visibilitychange", () => { if (!document.hidden) fetchSlots(); });
})();
